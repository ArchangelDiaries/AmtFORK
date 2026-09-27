// POST /api/ork-login  { username, password }  ->  { token, persona, orkId, officer }
// "Sign in with ORK": checks the player's ORK username and password with the ORK, looks up whether they
// are a current park or kingdom officer, and returns a Firebase custom token for FORK.
// The password is only ever sent to the ORK in a POST body. It is never stored or logged, and the ORK
// session is closed straight away. Failures are throttled (see lib/throttle.js).
import { getStore } from '@netlify/blobs';
import { orkCall, orkPost, OrkBlocked } from './lib/orkClient.js';
import { mintCustomToken, serviceAccount } from './lib/firebaseToken.js';
import { throttle } from './lib/throttle.js';

const json = (body, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json', 'cache-control': 'no-store' } });
const ok = r => r && (r.Status === true || r.Status?.Status === true || r.Status?.Status === 0 || r.Status?.Code === 0 || r.Status === 0);

/** Current officer titles this player holds in their park, their kingdom (or principality) and its parent kingdom. */
export async function officerRoles(mundaneId, { parkId, kingdomId, parentKingdomId }, call = orkCall) {
  const mine = (res, where) => (res?.Officers || []).filter(o => String(o.MundaneId) === String(mundaneId))
    .map(o => ({ where, title: o.OfficerRole || o.Role || 'Officer', name: where === 'park' ? o.ParkName : o.KingdomName }));
  const [park, kingdom, parent] = await Promise.all([
    parkId > 0 ? call('Park/GetOfficers', { ParkId: parkId }).catch(() => null) : null,
    kingdomId > 0 ? call('Kingdom/GetOfficers', { KingdomId: kingdomId }).catch(() => null) : null,
    parentKingdomId > 0 ? call('Kingdom/GetOfficers', { KingdomId: parentKingdomId }).catch(() => null) : null,
  ]);
  return [...mine(park, 'park'), ...mine(kingdom, 'kingdom'), ...mine(parent, 'kingdom')];
}

export default async (req, ctx = {}) => {
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405);
  const origin = req.headers.get('origin');
  if (origin && origin !== new URL(req.url).origin) return json({ error: 'Not allowed from this site.' }, 403);
  if (!process.env.ORK_API_KEY || !serviceAccount()) return json({ error: 'ORK sign-in isn’t set up on this site yet.' }, 503);

  let username = '', password = '';
  try { ({ username = '', password = '' } = await req.json()); } catch (e) { /* bad body */ }
  username = String(username).trim().slice(0, 100); password = String(password).slice(0, 200);
  if (!username || !password) return json({ error: 'Enter your ORK username and password.' }, 400);

  const ip = req.headers.get('x-nf-client-connection-ip') || req.headers.get('x-forwarded-for') || 'unknown';
  const limiter = throttle(ctx.store || getStore({ name: 'ork-login', consistency: 'strong' }));
  if (await limiter.blocked(username, ip)) return json({ error: 'Too many sign-in attempts. Wait 15 minutes and try again.' }, 429);

  let auth;
  try { auth = await orkPost('Authorization/Authorize', { UserName: username, Password: password, Client: process.env.ORK_CLIENT || 'FORK/1.0' }); }
  catch (e) {
    if (e instanceof OrkBlocked) return json({ error: 'The ORK turned the request away. Check the ORK_API_KEY setting.' }, 503);
    return json({ error: 'Couldn’t reach the ORK right now. Try again in a minute.' }, 504);
  }
  const mundaneId = Number(auth?.UserId) || 0;
  if (!ok(auth) || !auth?.Token || mundaneId <= 0) {
    await limiter.fail(username, ip);
    return json({ error: 'That ORK username and password didn’t match.' }, 401);
  }
  await limiter.clear(username);
  // We only needed to prove who they are: close the ORK session now rather than leave it open.
  orkPost('Authorization/DestroySession', { Token: auth.Token }).catch(() => {});

  try {
    const p = (await orkCall('Player/GetPlayer', { MundaneId: mundaneId }))?.Player || {};
    const parkId = Number(p.ParkId) || 0, kingdomId = Number(p.KingdomId) || 0;
    let park = '', kingdom = '', parentKingdomId = 0;
    if (parkId) {
      const pk = await orkCall('Park/GetParkShortInfo', { ParkId: parkId }).catch(() => null);
      park = pk?.ParkInfo?.ParkName || ''; kingdom = pk?.KingdomInfo?.KingdomName || '';
      parentKingdomId = Number(pk?.KingdomInfo?.ParentKingdomId) || 0;
    }
    const roles = await officerRoles(mundaneId, { parkId, kingdomId, parentKingdomId });
    const claims = {
      orkId: String(mundaneId), persona: String(p.Persona || '').slice(0, 80),
      parkId: String(parkId), kingdomId: String(kingdomId),
      kingdomOfficer: roles.some(r => r.where === 'kingdom'), parkOfficer: roles.some(r => r.where === 'park'),
      officerTitles: roles.map(r => `${r.title}${r.name ? ` of ${r.name}` : ''}`).slice(0, 6).join('; ').slice(0, 300),
    };
    const token = mintCustomToken(`ork_${mundaneId}`, claims);
    return json({ token, persona: claims.persona, orkId: claims.orkId, park, kingdom, officer: claims.officerTitles });
  } catch (e) {
    if (e instanceof OrkBlocked) return json({ error: 'The ORK turned the request away. Check the ORK_API_KEY setting.' }, 503);
    return json({ error: 'Signed in to the ORK, but couldn’t finish setting up your FORK sign-in. Try again.' }, 500);
  }
};

export const config = { path: '/api/ork-login' };
