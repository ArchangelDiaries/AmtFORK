import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, createVerify } from 'node:crypto';
import handler, { officerRoles } from '../netlify/functions/ork-login.js';

const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
const pem = privateKey.export({ type: 'pkcs8', format: 'pem' });
const memStore = () => { const m = new Map(); return { get: async k => (m.has(k) ? JSON.parse(m.get(k)) : null), setJSON: async (k, v) => m.set(k, JSON.stringify(v)), delete: async k => m.delete(k) }; };
const orig = globalThis.fetch; let seen;
const PASS = 'correct horse';

beforeEach(() => {
  process.env.ORK_API_KEY = 'k'.repeat(64);
  process.env.FIREBASE_CLIENT_EMAIL = 'svc@amtfork.iam.gserviceaccount.com';
  process.env.FIREBASE_PRIVATE_KEY = pem.replace(/\n/g, '\\n');   // as pasted into Netlify
  seen = [];
  globalThis.fetch = async (url, init = {}) => {
    const body = init.body ? new URLSearchParams(init.body) : null;
    const call = body ? body.get('call') : new URL(url).searchParams.get('call');
    seen.push({ url: String(url), call, body: init.body || '', headers: init.headers });
    const J = o => Response.json(o);
    if (call === 'Authorization/Authorize') return body.get('request[Password]') === PASS
      ? J({ Status: { Status: true, Code: 0 }, Token: 't'.repeat(32), UserId: 23614 }) : J({ Status: { Status: false, Code: 5 } });
    if (call === 'Authorization/DestroySession') return J({});
    if (call === 'Player/GetPlayer') return J({ Player: { Persona: 'Dragoth', ParkId: 246, KingdomId: 30 } });
    if (call === 'Park/GetParkShortInfo') return J({ ParkInfo: { ParkName: 'Siar Geata' }, KingdomInfo: { KingdomName: 'Stone Rivers', ParentKingdomId: 21 } });
    if (call === 'Park/GetOfficers') return J({ Officers: [{ MundaneId: '99', OfficerRole: 'Monarch', ParkName: 'Siar Geata' }] });
    if (call === 'Kingdom/GetOfficers') {
      const k = new URL(url).searchParams.get('request[KingdomId]');
      return J({ Officers: k === '21' ? [{ MundaneId: '23614', OfficerRole: 'Prime Minister', KingdomName: 'Westmarch' }] : [] });
    }
    return new Response('{}', { status: 404 });
  };
});
afterEach(() => { globalThis.fetch = orig; });
const login = (store, username = 'dragoth', password = PASS) =>
  handler(new Request('https://fork.test/api/ork-login', { method: 'POST', body: JSON.stringify({ username, password }), headers: { 'x-nf-client-connection-ip': '1.2.3.4' } }), { store });

test('valid ORK login returns a verifiable Firebase custom token with officer claims', async () => {
  const r = await login(memStore()); const j = await r.json();
  assert.equal(r.status, 200);
  const [h, p, s] = j.token.split('.');
  assert.ok(createVerify('RSA-SHA256').update(`${h}.${p}`).verify(publicKey, Buffer.from(s, 'base64url')));
  const payload = JSON.parse(Buffer.from(p, 'base64url'));
  assert.equal(payload.uid, 'ork_23614');
  assert.equal(payload.aud, 'https://identitytoolkit.googleapis.com/google.identity.identitytoolkit.v1.IdentityToolkit');
  assert.equal(payload.claims.orkId, '23614');
  assert.equal(payload.claims.kingdomOfficer, true);
  assert.equal(payload.claims.parkOfficer, false);
  assert.match(payload.claims.officerTitles, /Prime Minister of Westmarch/);
  assert.equal(j.persona, 'Dragoth');
});

test('password only travels in a POST body, and the ORK session is closed', async () => {
  await login(memStore());
  for (const s of seen) assert.ok(!s.url.includes('horse'), 'password must not be in a URL');
  const auth = seen.find(s => s.call === 'Authorization/Authorize');
  assert.match(auth.body, /request%5BPassword%5D=correct\+horse/);
  assert.equal(auth.headers['X-Ork-Key'], 'k'.repeat(64));
  assert.ok(seen.some(s => s.call === 'Authorization/DestroySession' && !s.url.includes('t'.repeat(32))));
});

test('wrong password is refused, and repeated failures are throttled', async () => {
  const store = memStore();
  for (let i = 0; i < 5; i++) assert.equal((await login(store, 'dragoth', 'nope')).status, 401);
  const r = await login(store, 'dragoth', PASS);
  assert.equal(r.status, 429);
  assert.equal(seen.filter(s => s.call === 'Authorization/Authorize').length, 5, 'blocked attempts never reach the ORK');
});

test('not configured without the service account', async () => {
  delete process.env.FIREBASE_PRIVATE_KEY;
  assert.equal((await login(memStore())).status, 503);
});

test('other sites cannot call it', async () => {
  const r = await handler(new Request('https://fork.test/api/ork-login', { method: 'POST', body: '{}', headers: { origin: 'https://evil.example' } }), { store: memStore() });
  assert.equal(r.status, 403);
});

test('officerRoles matches by ORK number', async () => {
  const call = async (c, q) => ({ Officers: [{ MundaneId: 7, OfficerRole: 'Champion', ParkName: 'Anduril', KingdomName: 'Westmarch' }] });
  const r = await officerRoles(7, { parkId: 1, kingdomId: 0, parentKingdomId: 0 }, call);
  assert.deepEqual(r, [{ where: 'park', title: 'Champion', name: 'Anduril' }]);
});
