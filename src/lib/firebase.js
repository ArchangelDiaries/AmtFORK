import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore';

const cfg = {
  apiKey: import.meta.env.VITE_FB_API_KEY,
  authDomain: import.meta.env.VITE_FB_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FB_PROJECT_ID,
  appId: import.meta.env.VITE_FB_APP_ID,
};
export const configured = !!(cfg.apiKey && cfg.projectId);
export const app = initializeApp(configured ? cfg : { apiKey: 'demo', projectId: 'demo-fork', authDomain: 'localhost' });
export const auth = getAuth(app);
export const db = getFirestore(app);
export const google = new GoogleAuthProvider();

if (!configured || import.meta.env.VITE_USE_EMULATORS === '1') {
  try {
    connectAuthEmulator(auth, 'http://127.0.0.1:9099', { disableWarnings: true });
    connectFirestoreEmulator(db, '127.0.0.1', 8080);
  } catch (e) { /* already connected */ }
}
export const lower = s => String(s || '').trim().toLowerCase();
