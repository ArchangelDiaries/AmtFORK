# FORK: Feast, Organization & Registration Keeper

FORK is an event management app for Park events and EndReign events in the Principality of Stone Rivers.

- **Public side** (`/`, `/e/:id`): park members browse events and see the theme, crats, schedule and feast menu. They register without making an account, and can fill in the form from their ORK profile.
- **Crat Hall** (`/crat`): the Autocrat creates an event, sets the theme, assigns and invites crats, and publishes the event. Each crat edits their own part of the schedule. The Gatecrat checks people in at the gate. The Feastcrat gets the dietary and allergy report.

Built with Vite + React, Firebase (Auth + Firestore) and Netlify (hosting + one function for ORK lookups).

## What each crat can do

| Role | Edits on the schedule | Other powers |
|---|---|---|
| Autocrat | Everything | Theme, details, publish, open/close registration, assign crats, remove registrations, feast |
| Warcrat | Wargames, Warmaster Tournament | |
| A&S Crat | Arts & Sciences, Workshops & Classes | |
| Questcrat | Wargames | |
| Feastcrat | Meals & Feast | Feast settings and the full dietary/allergy report |
| Gatecrat | Court & General | Gate check-in |
| Hydrocrat, Securitycrat | View only | Their own role notes |

All crats can see registrations. **Feast preferences and allergies are visible only to the Autocrat and Feastcrat.** The security rules enforce this, not just the screens.

## Feast preferences from the ORK

In 2026 the ORK added **Dietary Preferences** to player profiles: diet, a "won't eat" list, and 17 allergens rated Mild or Severe. FORK uses exactly the same categories.

- The ORK keeps these preferences **private unless the player turns on _Show My Feast Preferences_** in their profile's design settings. When it's on, the preferences appear on the public profile and FORK fills them in.
- When it's off, FORK still fills in persona, park and kingdom, and the player picks their feast options on the form. The form tells them how to turn sharing on for next time.
- FORK never asks for ORK passwords.
- `netlify/functions/ork.js` fetches the public profile page (`Route=Player/profile/{id}`) and reads it with `lib/orkParse.js`. The parser follows the markup in `orkui/template/revised-frontend/Playernew_index.tpl` from github.com/amtgard/ORK3. If the ORK redesigns that page, update the parser and its tests in `tests/orkParse.test.js`.

## Setup (about 20 minutes)

### 1. Firebase
1. Create a project at console.firebase.google.com. The free Spark plan is enough.
2. **Build → Firestore Database → Create database** (production mode).
3. **Build → Authentication → Sign-in method**: turn on **Google**, and turn on **Email/Password** with **Email link (passwordless sign-in)** checked.
4. **Authentication → Settings → Authorized domains**: add your Netlify domain (and any custom domain).
5. **Project settings → Your apps → Web app**: register an app and copy the config values.
6. Deploy the security rules:
   ```
   npm install
   npx firebase-tools login
   npx firebase-tools deploy --only firestore:rules --project YOUR_PROJECT_ID
   ```

### 2. Netlify
1. Push this folder to a GitHub repo and choose **Add new site → Import from Git** in Netlify. `netlify.toml` already sets the build, functions and SPA routing.
2. **Site configuration → Environment variables**: add `VITE_FB_API_KEY`, `VITE_FB_AUTH_DOMAIN`, `VITE_FB_PROJECT_ID`, `VITE_FB_APP_ID` (see `.env.example`).
3. Deploy. Link to the site from the Wix page with a button, the same way as Field Marshal.

### 3. First event
Sign in at `/signin`, open the Crat Hall and click **New event**. You become its Autocrat. On the **Crats** tab, add each crat's persona and email and click **Save & email invite**. Firebase emails them a sign-in link. When they sign in with that address, the event appears in their Crat Hall. If an email doesn't arrive, use **Copy invite message**.

## Warmaster Tournament in Field Marshal

The Warcrat (or Autocrat) can create the event's Warmaster Tournament in Field Marshal from FORK's **Schedule** tab. Players then choose their divisions on the FORK registration form.

- **Creating the tournament:** the Warcrat signs in to Field Marshal with Google, and FORK checks that they're a marshal there (`marshals/{email}`). Then FORK writes a normal Field Marshal tournament `{ name, date, park, level, pitMin, divs, signupsOpen: true, at }` and can add it to the event schedule.
- **Fighter signups:** FORK sends each fighter's divisions to Field Marshal as a `requests/{id}` entry `{ tid, name, park, orkId, divs, at }`. Marshals approve them on Field Marshal's Signups tab, the same as signups made in Field Marshal directly. FORK also keeps the divisions on the event registration and flags anyone whose request didn't go through.
- **Opening and closing:** the Warcrat can open or close tournament signups from FORK. This changes `signupsOpen` in Field Marshal too.

- **Linked both ways:** FORK writes `fork: { eventId, name, url }` onto the Field Marshal tournament, and Field Marshal shows "Part of <event>" with a link back. FORK opens the tournament directly with `?t=<tournament id>&tab=signups` (or `tab=brackets` from the public page).
- **Live check:** the Warmaster panel and the public signup form read the tournament from Field Marshal each time. If it was deleted there, the panel offers to link a different tournament or create a new one. Divisions only appear on the signup form while Field Marshal says signups are open.
- **Link an existing tournament:** paste the tournament's Field Marshal address (it ends in `?t=…`) to link a tournament that was made in Field Marshal first.

### Connecting Field Marshal (one time)
1. From Field Marshal's `config.js` (`window.FIELD_MARSHAL_FIREBASE`), copy the values into these Netlify environment variables on the FORK site: `VITE_FM_API_KEY`, `VITE_FM_AUTH_DOMAIN`, `VITE_FM_PROJECT_ID` (`srfieldmarshal`), `VITE_FM_APP_ID`. Put Field Marshal's site address in `VITE_FM_URL`.
2. In the **srfieldmarshal** Firebase console, go to **Authentication → Settings → Authorized domains** and add FORK's Netlify domain. Without this, the Field Marshal sign-in popup fails inside FORK.
3. Redeploy FORK. `netlify.toml` already tells the secrets scanner that these values are expected.
4. Re-deploy FORK's `firestore.rules`. The update lets the Warcrat edit the event's `warmaster` field and lets registrations store tournament divisions.

No changes to Field Marshal are needed. FORK uses its existing tournament and signup-request formats.

## Sign in with ORK
Players can sign in to FORK and The Herald's Call with their **ORK username and password**, as well as with Google or an email link.

**How it works**
- `netlify/functions/ork-login.js` sends the username and password to the ORK (`Authorization/Authorize`) in a POST body with FORK's ORK key. The ORK session is closed right away with `DestroySession`, and the password is never stored or logged.
- It looks up the player (`Player/GetPlayer`, `Park/GetParkShortInfo`) and today's officers of their park, their kingdom or principality, and its parent kingdom (`Park/GetOfficers`, `Kingdom/GetOfficers`).
- It returns a Firebase custom token for user `ork_<ORK number>`, carrying claims `orkId`, `persona`, `kingdomOfficer`, `parkOfficer` and `officerTitles`. The token is signed with FORK's service account.
- **Kingdom officers need no setup.** Anyone who currently holds a kingdom or principality office in the ORK is treated as a kingdom officer in The Herald's Call, and can manage every call. Office is re-checked at every sign-in, so reign changes take care of themselves. The `herald_officers` list still works for Google accounts.
- **Crats can be added by ORK number.** In the Crats tab, enter an email *or* an ORK number or profile link. ORK crats sign in with **Sign in with ORK**, and "Save & copy invite" gives you a message to send them.
- **Throttling:** the ORK has no lockout and waives rate limits for FORK's key. So FORK allows 5 failed attempts per username and 20 per IP address in any 15 minutes, tracked in Netlify Blobs.

**Setup (one time)**
1. **Firebase console** (project **amtfork**): go to **Project settings → Service accounts → Generate new private key**. A JSON file downloads. Treat it like a password; don't commit it or email it.
2. **Netlify → amtgardfork → Environment variables**, scope **Functions**, marked secret. Add these, copied from the JSON file:
   - `FIREBASE_CLIENT_EMAIL` = the `client_email` value
   - `FIREBASE_PRIVATE_KEY` = the `private_key` value, including the BEGIN/END lines. The `\n` sequences are fine as-is.
   Then delete the downloaded JSON file.
3. Netlify limits the settings a function can see to 4 KB in total. Set the scope of the `VITE_*` settings to **Builds** only; functions don't need them.
4. **Re-publish `firestore.rules`.** They now accept ORK sign-ins (crat key `ork:<number>`) and ORK-verified kingdom officers.
5. Redeploy.

## Bids to events: The Herald's Call
FORK covers the whole event life cycle. **Anyone signed in can create an event**, and the New event form asks **"Open this event to bids?"**:

- **No, run it in FORK now:** the event is created in FORK straight away, with you as its Autocrat.
- **Yes, take bids first:** FORK posts a call for bids in The Herald's Call (`/herald/`) with the event type, level, kingdom or park, event window, bid deadline and requirements. You become the call's **host**. Then:
  1. Autocrats sign in and submit bids covering theme, site, dates, budget, feast, crats and program.
  2. On the **Bid Desk** you compare bids side by side, keep private ratings and notes, record decisions and award the winner. Only you and kingdom officers see the private reviews.
  3. On the winning bid, the winner or you click **Start this event in FORK**. FORK opens a new event filled in from the bid, and can make the winning bidder the Autocrat with an emailed invite.

Kingdom officers (the `herald_officers` list) can manage every call, plus independent bids on kingdom events.

**How it fits together**
- The Herald's Call runs on FORK's own Firebase project and sign-in. `herald/firebase-config.js` is generated at build time from the same `VITE_FB_*` settings, so there's nothing extra to configure. Its data lives in collections that start with `herald_`: calls, bids, decisions, reviews and officers.
- Its security rules are already merged into `firestore.rules`. Re-publish the rules after this update.
- **Officers (optional):** in the Firebase console, create a `herald_officers` collection. Add one document per kingdom officer, using their Google email in lowercase as the document ID. Officers can manage every call. Anyone else manages only the calls they post.
- Bids are public once submitted, so the kingdom can see them. Drafts are hidden in the app, but anyone reading the database directly could see them.

## ORK lookups (API key)
The ORK is behind Cloudflare's bot check. The ORK team gives each application a private key for its web service (`/orkservice/Json`), following their "Amtgard ORK — API Access" document.

- **Set it up:** in Netlify, go to **Site configuration → Environment variables** and add `ORK_API_KEY` (the 64-character key from the ORK team). Mark it **Contains secret values** and give it the **Functions** scope. Optionally add `ORK_CONTACT` with an email address the ORK team can reach you at. Then redeploy.
- **Keep the key server-side:** never name it `VITE_…`. That would put it into every visitor's browser. Only `netlify/functions/ork.js` reads it, and it's sent only as the `X-Ork-Key` header. It never goes in the URL or in `X-ORK-Client`, which is `FORK/1.0`.
- **What fills in:** persona, park and kingdom, from `Player/GetPlayer` and `Park/GetParkShortInfo`. Results are cached for 5 minutes.
- **What doesn't:** feast preferences. The ORK web service doesn't offer them, and the key doesn't work on the ORK's profile pages, so players pick them on the form. If the ORK team adds a web-service call for public feast preferences, `lib/orkParse.js` can be retired and the function extended.
- **If the key leaks,** tell the ORK team right away. They issue a replacement and the old key stops working.

## Local development
```
cp .env.example .env      # fill in your Firebase config
npm install
npm run dev               # the /api/ork lookup needs `npx netlify dev` instead
npm test                  # ORK parser + function tests
MOCK=1 npm run dev        # UI preview with sample data, no Firebase needed
```

## Hardening before a big event
- Anyone with the link can submit registrations while registration is open. For a large event, turn on **Firebase App Check** (reCAPTCHA) so bots can't flood the list.
- Close registration from the Theme & Details tab when the event fills up. Feast seats are shown against the seat count, but FORK doesn't enforce them.
