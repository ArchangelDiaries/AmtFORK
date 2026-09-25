// Connection to Field Marshal's Firebase project (a second Firebase app inside FORK).
// FORK writes only the shapes Field Marshal already uses:
//   tournaments/{id}: { name, date, park, level, pitMin, divs[], signupsOpen, at }
//   requests/{id}:    { tid, name, park, orkId, divs[], at }   (marshals approve these on the Signups tab)
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from 'firebase/auth';
import { getFirestore, doc, getDoc, collection, addDoc, updateDoc } from 'firebase/firestore';

const cfg = {
  apiKey: import.meta.env.VITE_FM_API_KEY,
  authDomain: import.meta.env.VITE_FM_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FM_PROJECT_ID,
  appId: import.meta.env.VITE_FM_APP_ID,
};
export const fmConfigured = !!(cfg.apiKey && cfg.projectId);
export const FM_URL = import.meta.env.VITE_FM_URL || '';

let _app;
const app = () => (_app ||= initializeApp(cfg, 'field-marshal'));
export const fmAuth = () => getAuth(app());
const fmDb = () => getFirestore(app());

export const DIVS = [
  { k: 'single', n: 'Single Short Sword' },
  { k: 'board', n: 'Sword & Board' },
  { k: 'flo', n: 'Florentine' },
  { k: 'heavy', n: 'Heavy Weapons' },
  { k: 'open', n: 'Open Class' },
];
export const DIV = Object.fromEntries(DIVS.map(d => [d.k, d]));
export const LEVELS = [
  { k: 'shire', n: 'Shire' }, { k: 'barony', n: 'Barony' }, { k: 'duchy', n: 'Duchy' },
  { k: 'kingdom', n: 'Kingdom' }, { k: 'major', n: 'Major kingdom (Weaponmaster, Warmaster, Olympiad)' },
];
// Same host-park defaults Field Marshal uses.
export const PARK_LEVEL = { 'Siar Geata': 'duchy', 'Ethereal Hollow': 'barony' };

/** Google sign-in to Field Marshal, then confirm this account is a marshal there. */
export async function fmSignInAsMarshal() {
  if (!fmConfigured) throw new Error('Field Marshal isn’t connected yet. Add the VITE_FM_* settings (see README).');
  const auth = fmAuth();
  let user = auth.currentUser;
  if (!user) user = (await signInWithPopup(auth, new GoogleAuthProvider())).user;
  const email = String(user.email || '').toLowerCase();
  const m = await getDoc(doc(fmDb(), 'marshals', email)).catch(() => null);
  if (!m || !m.exists()) {
    await signOut(auth);
    throw new Error(`${email} isn’t a marshal in Field Marshal. Ask a marshal to add you, then try again.`);
  }
  return email;
}

export async function fmCreateTournament({ name, date, park, level, pitMin, divs }) {
  const data = { name, date, park, level, pitMin: Math.max(1, Number(pitMin) || 10), divs, signupsOpen: true, at: Date.now() };
  const ref = await addDoc(collection(fmDb(), 'tournaments'), data);
  return ref.id;
}
export const fmSetSignupsOpen = (tid, open) => updateDoc(doc(fmDb(), 'tournaments', tid), { signupsOpen: !!open });

/** Public: read the tournament (to confirm it still exists and signups are open). */
export async function fmGetTournament(tid) {
  const d = await getDoc(doc(fmDb(), 'tournaments', tid));
  return d.exists() ? { id: d.id, ...d.data() } : null;
}

/** Public: a player's signup request, approved later by a marshal in Field Marshal. */
export async function fmRequestSignup({ tid, name, park, orkId, divs }) {
  const ref = await addDoc(collection(fmDb(), 'requests'), {
    tid, name: String(name).slice(0, 120), park: String(park || '').slice(0, 120), orkId: String(orkId || ''), divs, at: Date.now(),
  });
  return ref.id;
}
