// GET /api/ork?id=12345  ->  { id, persona, park, kingdom, feast: { visible, noRestrictions, diets, restrictions, allergens } }
// Reads the player's PUBLIC ORK profile only. Feast data appears only if the player chose to show it.
import { parseProfile } from './lib/orkParse.js';

const ORK = 'https://ork.amtgard.com/orkui/index.php?Route=Player/profile/';

// The ORK sits behind Cloudflare, which blocks cloud platforms (Netlify runs on AWS Lambda) unless each
// request identifies the app and carries its private key. Set these in Netlify's environment variables:
//   ORK_KEY         the 64-character key the ORK admins issued to FORK (secret, Functions scope)
//   ORK_CLIENT      public app name + version, e.g. "FORK/1.1" (never the key; can't start with "Amtgard")
//   ORK_USER_AGENT  e.g. "FORK/1.1 (+https://your-site.netlify.app; you@example.com)"
export function orkHeaders(env = process.env) {
  const key = (env.ORK_KEY || '').trim();
  let client = (env.ORK_CLIENT || 'FORK/1.1').trim();
  if (/^amtgard/i.test(client) || (key && client.includes(key.slice(0, 16))) || /^[0-9a-f]{32,}$/i.test(client)) client = 'FORK/1.1';
  const h = { 'x-ork-client': client, 'user-agent': (env.ORK_USER_AGENT || `${client} (event registration, Stone Rivers)`).trim() };
  if (/^[0-9a-f]{64}$/i.test(key)) h['x-ork-key'] = key;
  return h;
}

export default async (req) => {
  const id = (new URL(req.url).searchParams.get('id') || '').match(/^\d{1,9}$/)?.[0];
  const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', ...extra },
  });
  if (!id) return json({ error: 'Give an ORK player ID (the number at the end of the profile link).' }, 400);

  let html;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(ORK + id, { signal: ctl.signal, headers: orkHeaders() });
    clearTimeout(t);
    if (r.status === 403) console.warn('ORK returned 403: check ORK_KEY and ORK_CLIENT in Netlify.');
    if (!r.ok) return json({ error: `The ORK answered ${r.status}.` }, 502);
    html = await r.text();
  } catch (e) {
    return json({ error: 'Couldn’t reach the ORK right now. Fill the form in by hand.' }, 504);
  }
  const p = parseProfile(html);
  if (!p.persona) return json({ error: 'No ORK player found with that ID.' }, 404);
  return json({ id, ...p }, 200, { 'cache-control': 'public, max-age=300' });
};
