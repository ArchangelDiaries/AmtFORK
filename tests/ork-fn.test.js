import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler, { orkHeaders } from '../netlify/functions/ork.js';

test('rejects bad id', async () => {
  const r = await handler(new Request('https://x/api/ork?id=abc'));
  assert.equal(r.status, 400);
});
test('returns parsed profile', async () => {
  const orig = globalThis.fetch;
  globalThis.fetch = async url => { assert.match(String(url), /Player\/profile\/23614$/);
    return new Response('<span class="pn-detail-label">Persona</span><span class="pn-detail-value">Dragoth</span>'); };
  try {
    const r = await handler(new Request('https://x/api/ork?id=23614'));
    const j = await r.json();
    assert.equal(r.status, 200); assert.equal(j.persona, 'Dragoth'); assert.equal(j.feast.visible, false);
  } finally { globalThis.fetch = orig; }
});

test('sends the ORK identification headers and never leaks the key', () => {
  const key = 'ab'.repeat(32);
  const h = orkHeaders({ ORK_KEY: key, ORK_CLIENT: 'FORK/1.1', ORK_USER_AGENT: 'FORK/1.1 (+https://fork.example; me@example.com)' });
  assert.equal(h['x-ork-key'], key); assert.equal(h['x-ork-client'], 'FORK/1.1'); assert.match(h['user-agent'], /^FORK\/1\.1 /);
  assert.equal(orkHeaders({ ORK_KEY: key, ORK_CLIENT: key })['x-ork-client'], 'FORK/1.1', 'a key pasted into ORK_CLIENT is replaced');
  assert.equal(orkHeaders({ ORK_CLIENT: 'Amtgard/9' })['x-ork-client'], 'FORK/1.1', 'reserved prefix is replaced');
  assert.equal(orkHeaders({ ORK_KEY: 'short' })['x-ork-key'], undefined, 'malformed keys are not sent');
});
test('passes the headers on the ORK request', async () => {
  const orig = globalThis.fetch; const k = process.env.ORK_KEY; process.env.ORK_KEY = 'cd'.repeat(32);
  let seen; globalThis.fetch = async (url, init) => { seen = init.headers; return new Response('<span class="pn-detail-label">Persona</span><span class="pn-detail-value">Dragoth</span>'); };
  try { await handler(new Request('https://x/api/ork?id=23614')); assert.equal(seen['x-ork-key'], 'cd'.repeat(32)); assert.ok(seen['x-ork-client']); }
  finally { globalThis.fetch = orig; if (k === undefined) delete process.env.ORK_KEY; else process.env.ORK_KEY = k; }
});
