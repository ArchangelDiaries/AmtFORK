import { test } from 'node:test';
import assert from 'node:assert/strict';
import { userKey, keyFromInput, displayKey } from '../src/lib/identity.js';
test('keys for Google and ORK users', () => {
  assert.equal(userKey({ uid: 'abc', email: 'A@B.com' }), 'a@b.com');
  assert.equal(userKey({ uid: 'ork_23614' }), 'ork:23614');
  assert.equal(keyFromInput(' Wren@Example.com '), 'wren@example.com');
  assert.equal(keyFromInput('https://ork.amtgard.com/orkui/index.php?Route=Player/profile/23614'), 'ork:23614');
  assert.equal(keyFromInput('23614'), 'ork:23614');
  assert.equal(keyFromInput('nobody'), '');
  assert.equal(displayKey('ork:5'), 'ORK #5');
});
