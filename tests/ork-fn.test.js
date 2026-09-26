import { test, beforeEach, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/ork.js';

const orig = globalThis.fetch;
let seen = [];
beforeEach(() => { process.env.ORK_API_KEY = 'k'.repeat(64); seen = []; });
afterEach(() => { globalThis.fetch = orig; });
const mock = routes => { globalThis.fetch = async (url, opts) => {
  seen.push({ url: String(url), headers: opts.headers });
  const call = new URL(url).searchParams.get('call');
  const r = routes[call]; return r ? r() : new Response('{}', { status: 404 });
}; };

test('rejects bad id', async () => {
  const r = await handler(new Request('https://x/api/ork?id=abc'));
  assert.equal(r.status, 400);
});

test('persona, park and kingdom from the ORK web service, with key headers', async () => {
  mock({
    'Player/GetPlayer': () => Response.json({ Player: { Persona: 'Dragoth', ParkId: 246, KingdomId: 21, ShowFeastPrefs: 1 } }),
    'Park/GetParkShortInfo': () => Response.json({ ParkInfo: { ParkName: 'Siar Geata' }, KingdomInfo: { KingdomName: 'Westmarch' } }),
  });
  const r = await handler(new Request('https://x/api/ork?id=23614'));
  const j = await r.json();
  assert.equal(r.status, 200);
  assert.deepEqual([j.persona, j.park, j.kingdom, j.showsFeastPrefs], ['Dragoth', 'Siar Geata', 'Westmarch', true]);
  const h = seen[0].headers;
  assert.equal(h['X-Ork-Key'], 'k'.repeat(64));
  assert.match(h['X-ORK-Client'], /^FORK\//);
  assert.ok(!h['X-ORK-Client'].includes('k'.repeat(64)), 'key must never go in X-ORK-Client');
  assert.ok(!seen[0].url.includes('k'.repeat(64)), 'key must never go in the URL');
  assert.match(seen[0].url, /orkservice\/Json\/index\.php\?call=Player%2FGetPlayer&request%5BMundaneId%5D=23614/);
});

test('unknown player', async () => {
  mock({ 'Player/GetPlayer': () => Response.json({ Status: { Status: 1 } }) });
  const r = await handler(new Request('https://x/api/ork?id=99999'));
  assert.equal(r.status, 404);
});

test('Cloudflare 403 is reported as ork_blocked', async () => {
  mock({ 'Player/GetPlayer': () => new Response('<html><head><title>Just a moment...</title></head></html>', { status: 403 }) });
  const r = await handler(new Request('https://x/api/ork?id=23614'));
  const j = await r.json();
  assert.equal(r.status, 503); assert.equal(j.code, 'ork_blocked');
});

test('missing key setting is reported, not sent', async () => {
  delete process.env.ORK_API_KEY;
  mock({});
  const r = await handler(new Request('https://x/api/ork?id=23614'));
  assert.equal(r.status, 503); assert.equal(seen.length, 0);
});
