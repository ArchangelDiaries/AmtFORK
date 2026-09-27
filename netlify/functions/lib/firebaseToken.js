// Mints a Firebase Auth custom token (RS256 JWT) with FORK's service account, without the Admin SDK.
// Netlify settings (Functions scope, secret): FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY.
// Spec: https://firebase.google.com/docs/auth/admin/create-custom-tokens#create_custom_tokens_using_a_third-party_jwt_library
import { createSign } from 'node:crypto';

const AUD = 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit';
const b64url = x => Buffer.from(typeof x === 'string' ? x : JSON.stringify(x)).toString('base64url');

export function serviceAccount() {
  const email = process.env.FIREBASE_CLIENT_EMAIL;
  let key = process.env.FIREBASE_PRIVATE_KEY || '';
  if (key.includes('\\n')) key = key.replace(/\\n/g, '\n');   // pasted with literal \n
  return email && key.includes('PRIVATE KEY') ? { email, key } : null;
}

export function mintCustomToken(uid, claims, sa = serviceAccount(), now = Math.floor(Date.now() / 1000)) {
  if (!sa) throw new Error('Firebase service account is not configured.');
  const header = { alg: 'RS256', typ: 'JWT' };
  const payload = { iss: sa.email, sub: sa.email, aud: AUD, iat: now, exp: now + 3600, uid, claims };
  const unsigned = `${b64url(header)}.${b64url(payload)}`;
  const sig = createSign('RSA-SHA256').update(unsigned).sign(sa.key).toString('base64url');
  return `${unsigned}.${sig}`;
}
