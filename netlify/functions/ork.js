// GET /api/ork?id=12345  ->  { id, persona, park, kingdom, feast: { visible, noRestrictions, diets, restrictions, allergens } }
// Reads the player's PUBLIC ORK profile only. Feast data appears only if the player chose to show it.
import { parseProfile } from './lib/orkParse.js';

const ORK = 'https://ork.amtgard.com/orkui/index.php?Route=Player/profile/';

export default async (req) => {
  const id = (new URL(req.url).searchParams.get('id') || '').match(/^\d{1,9}$/)?.[0];
  const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', ...extra },
  });
  if (!id) return json({ error: 'Give an ORK player ID (the number at the end of the profile link).' }, 400);

  let html;
  try {
    const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
    const r = await fetch(ORK + id, { signal: ctl.signal, headers: { 'user-agent': 'FORK event registration (Stone Rivers)' } });
    clearTimeout(t);
    if (!r.ok) return json({ error: `The ORK answered ${r.status}.` }, 502);
    html = await r.text();
  } catch (e) {
    return json({ error: 'Couldn’t reach the ORK right now. Fill the form in by hand.' }, 504);
  }
  const p = parseProfile(html);
  if (!p.persona) return json({ error: 'No ORK player found with that ID.' }, 404);
  return json({ id, ...p }, 200, { 'cache-control': 'public, max-age=300' });
};
