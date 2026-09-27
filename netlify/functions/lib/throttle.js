// Sign-in throttling. The ORK waives rate limits for FORK's key and has no lockout of its own, so without
// this, /api/ork-login could be used to guess ORK passwords. Counts failures in Netlify Blobs (shared
// across function instances): 5 per ORK username and 20 per IP address in any 15 minutes.
import { createHash } from 'node:crypto';

export const WINDOW_MS = 15 * 60 * 1000;
export const LIMITS = { user: 5, ip: 20 };
const h = s => createHash('sha256').update(String(s).trim().toLowerCase()).digest('hex').slice(0, 32);

export function throttle(store, now = () => Date.now()) {
  const read = async k => { const v = await store.get(k, { type: 'json' }).catch(() => null); return v && now() - v.first < WINDOW_MS ? v : null; };
  return {
    async blocked(user, ip) {
      const [u, i] = await Promise.all([read('u:' + h(user)), read('i:' + h(ip))]);
      return (u && u.n >= LIMITS.user) || (i && i.n >= LIMITS.ip);
    },
    async fail(user, ip) {
      for (const k of ['u:' + h(user), 'i:' + h(ip)]) {
        const v = await read(k);
        await store.setJSON(k, v ? { first: v.first, n: v.n + 1 } : { first: now(), n: 1 });
      }
    },
    async clear(user) { await store.delete('u:' + h(user)).catch(() => {}); },
  };
}
