// Who is signed in, as FORK's crat lists see them.
// Google / email-link accounts are keyed by their lowercase email; ORK sign-ins by "ork:<ORK number>".
// (The Firestore rules compute the same key in me().)
export const isOrkUser = u => !!u && String(u.uid || '').startsWith('ork_');
export const orkIdOf = u => (isOrkUser(u) ? u.uid.slice(4) : '');
export const userKey = u => (!u ? '' : isOrkUser(u) ? `ork:${orkIdOf(u)}` : String(u.email || '').trim().toLowerCase());
export const displayKey = k => (String(k).startsWith('ork:') ? `ORK #${k.slice(4)}` : k);
/** Crat field input: an email, an ORK number, or an ORK profile link -> key. */
export function keyFromInput(s) {
  s = String(s || '').trim();
  if (!s) return '';
  if (s.includes('@')) return s.toLowerCase();
  const m = s.match(/(\d{2,9})(?!.*\d)/);
  return m ? `ork:${m[1]}` : '';
}
