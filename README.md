# FORK: Feast, Organization & Registration Keeper

FORK is an event management app for Park events and EndReign events in the Principality of Stone Rivers.

- **Public side** (`/`, `/e/:id`): park members browse events and see the theme, crats, schedule and feast menu. They register without making an account, and can fill in the form from their ORK profile.
- **Crat Hall** (`/crat`): the Autocrat creates an event, sets the theme, assigns and invites crats, and publishes the event. Each crat edits their own part of the schedule. The Gatecrat checks people in at the gate. The Feastcrat gets the dietary and allergy report.

- **Event bids** (`/bids`): the kingdom posts calls for bids (Midreign, Coronation, Special Event), and players, parks, households, companies and guilds bid to host. Kingdom-level events the kingdom doesn't run itself, like Feast of the Gods, need no posted call. Kingdom officers compare bids on the **Monarch's Desk** and award one. The winner then creates the event in FORK from the bid with one click, and it arrives with its dates, site, theme, feast, crat names and battlegame schedule filled in. Every bid stays searchable in the **Bid Archive**.

Built with Vite + React, Firebase (Auth + Firestore) and Netlify (hosting + one function for ORK lookups).

## The event life cycle

| Stage | Where | Who |
|---|---|---|
| Call for bids | `/bids` | Kingdom officers post the events the kingdom needs hosted |
| Bid | `/bids/new` | Any signed-in player or group. Drafts stay private until submitted |
| Review and award | `/bids/desk` (Monarch's Desk) | Kingdom officers: side-by-side comparison, charts, private ratings, Award |
| Hand-off | the winning bid's page | The bid's owner (or an officer) clicks **Create the event in FORK** and becomes its Autocrat |
| Plan and run | `/crat/:id` (Crat Hall) | Crats: theme, schedule, registration, gate, feast, Warmaster Tournament in Field Marshal |
| Archive | `/bids/archive` | Everyone: past bids, outcomes, and which ones became events |

### What the hand-off carries over
- Name, dates, site and address, kingdom-level event type (Midreign, Coronation, or Other event for Special Events).
- Theme title and pitch.
- Feast on or off, price, seat count, menu, and a potluck note.
- Crat names by role. They show on the event's Crats tab as "Named in the winning bid", ready for the Autocrat to add each email and send invites.
- Schedule items: each themed battlegame (Wargames track, with its day and times), the tournament (Warmaster Tournament track), the A&S choice (Arts & Sciences track), and the feast (Meals & Feast track). Items without a time show as to be scheduled.
- The event starts as a draft with registration closed, and links back to its bid.

### Kingdom officers
Officers are whoever has a document in the `kingdomOfficers` collection. In the Firebase console, open **Firestore Database > Data > Start collection**, name it `kingdomOfficers`, and add one document per officer whose **Document ID is their email in lowercase** (add any field, such as `role` = `Monarch`). They sign out and back in to see the Monarch's Desk. Update the list at each reign change.

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

## ORK access key (required from Netlify)
The ORK sits behind Cloudflare, which blocks requests from cloud platforms like Netlify unless each request names the app and carries a private key. Ask the ORK administrators for a key for FORK, then add these in Netlify under **Site configuration > Environment variables**, and redeploy:

| Variable | Example | Notes |
|---|---|---|
| `ORK_KEY` | the 64-character key | Secret. Tick **Contains secret values** and scope it to **Functions** |
| `ORK_CLIENT` | `FORK/1.1` | Public app name and version. Never the key, and it can't start with "Amtgard" |
| `ORK_USER_AGENT` | `FORK/1.1 (+https://your-fork-site.netlify.app; you@example.com)` | Site address and a contact the ORK admins can reach |

`netlify/functions/ork.js` adds them as `X-Ork-Key`, `X-ORK-Client` and `User-Agent`. The key never reaches the browser. If ORK lookups fail, check **Logs > Functions** in Netlify for "ORK returned 403". Raise the version in `ORK_CLIENT` and `ORK_USER_AGENT` when you release. To rotate the key, the admins add the new one alongside the old, you replace `ORK_KEY` and redeploy, then they retire the old one.

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
