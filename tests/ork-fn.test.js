import { test } from 'node:test';
import assert from 'node:assert/strict';
import handler from '../netlify/functions/ork.js';

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
