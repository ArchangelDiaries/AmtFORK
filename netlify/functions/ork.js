// GET /api/ork?id=12345  ->  { id, persona, park, parkId, kingdom, kingdomId, showsFeastPrefs, feast: { visible:false } }
//
// Uses the ORK web service (orkservice/Json) with FORK's ORK API key, as described in the ORK team's
// "Amtgard ORK — API Access" document. Settings (Netlify → Site configuration → Environment variables,
// scope: Functions — never a VITE_ variable, which would ship the key to every browser):
//   ORK_API_KEY     the 64-character key issued by the ORK administrators (secret)
//   ORK_CLIENT      optional product token, default "FORK/1.2" (plain text, NOT the key)
//   ORK_CONTACT     optional contact email for the User-Agent, so the ORK team can reach you
//
// Feast preferences: the ORK web service doesn't expose them, and the key only works on /orkservice/*,
// so FORK can fill in persona, park and kingdom, and players enter feast preferences on the form.

const ORK_JSON = 'https://ork.amtgard.com/orkservice/Json/index.php';
const CLIENT = process.env.ORK_CLIENT || 'FORK/1.2';
const SITE = process.env.URL || 'https://amtgardfork.netlify.app';
const UA = `${CLIENT} (+${SITE}${process.env.ORK_CONTACT ? `; ${process.env.ORK_CONTACT}` : ''})`;

export class OrkBlocked extends Error {}

/** One read-only call to the ORK web service (GET is fine: nothing secret goes in the URL). */
export async function orkCall(call, request = {}, { key = process.env.ORK_API_KEY, fetchImpl = fetch } = {}) {
  const u = new URL(ORK_JSON);
  u.searchParams.set('call', call);
  for (const [k, v] of Object.entries(request)) u.searchParams.set(`request[${k}]`, String(v));
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetchImpl(u.toString(), {
      signal: ctl.signal,
      headers: { 'X-Ork-Key': key || '', 'X-ORK-Client': CLIENT, 'User-Agent': UA, Accept: 'application/json' },
    });
    const text = await r.text();
    if (r.status === 403 || /<title>\s*Just a moment/i.test(text)) throw new OrkBlocked('blocked');
    if (!r.ok) throw new Error(`ORK answered ${r.status}`);
    return JSON.parse(text);
  } finally { clearTimeout(t); }
}

export default async (req) => {
  const json = (body, status = 200, extra = {}) => new Response(JSON.stringify(body), {
    status, headers: { 'content-type': 'application/json', ...extra },
  });
  const id = (new URL(req.url).searchParams.get('id') || '').match(/^\d{1,9}$/)?.[0];
  if (!id) return json({ error: 'Give an ORK player ID (the number at the end of the profile link).' }, 400);
  if (!process.env.ORK_API_KEY) return json({ error: 'The ORK lookup isn’t set up on this site yet.', code: 'ork_blocked' }, 503);

  try {
    const pl = await orkCall('Player/GetPlayer', { MundaneId: id });
    const p = pl && pl.Player;
    if (!p || !p.Persona) return json({ error: 'No ORK player found with that number.' }, 404);
    let park = '', kingdom = '';
    if (Number(p.ParkId) > 0) {
      try {
        const pk = await orkCall('Park/GetParkShortInfo', { ParkId: p.ParkId });
        park = pk?.ParkInfo?.ParkName || '';
        kingdom = pk?.KingdomInfo?.KingdomName || '';
      } catch (e) { if (e instanceof OrkBlocked) throw e; /* names are nice-to-have */ }
    }
    return json({
      id, persona: p.Persona, park, parkId: String(p.ParkId || ''), kingdom, kingdomId: String(p.KingdomId || ''),
      showsFeastPrefs: Number(p.ShowFeastPrefs) === 1, feast: { visible: false },
    }, 200, { 'cache-control': 'public, max-age=300' });
  } catch (e) {
    if (e instanceof OrkBlocked) return json({ error: 'The ORK turned the lookup away. Check the ORK_API_KEY setting.', code: 'ork_blocked' }, 503);
    return json({ error: 'Couldn’t reach the ORK right now. Fill the form in by hand.' }, 504);
  }
};
