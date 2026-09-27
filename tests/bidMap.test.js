import { test } from 'node:test';
import assert from 'node:assert/strict';
import { eventFromBid } from '../src/lib/bidMap.js';

const bid = {
  id: 'b1', callId: 'c1', category: 'midreign', kingdom: 'Westmarch', eventName: 'Spring Midreign', theme: 'Ember Road', themeDesc: 'A long story',
  hostType: 'park', hostPark: 'Siar Geata', start: '2027-04-10', end: '2027-04-11',
  site: { name: 'Oak Hollow', location: 'Pavilion 3' }, cost: { feastFee: '12', feastCount: '60' },
  feast: { offered: true, potluck: false, meals: 'Saturday feast', menu: 'Roast chicken' },
  crats: [{ role: 'Autocrat', name: 'Elaina' }, { role: 'Feastocrat', name: '' }],
  submitter: { persona: 'Elaina', park: 'Siar Geata', contact: 'Elaina@Example.com ' }, program: { schedule: 'Sat 10am war' },
  decision: { status: 'accepted' },
};

test('winning bid maps onto a FORK event', () => {
  const m = eventFromBid(bid);
  assert.deepEqual(m.form, { name: 'Spring Midreign', kind: 'midreign', scope: 'kingdom', kingdom: 'Westmarch', park: 'Siar Geata', startDate: '2027-04-10', endDate: '2027-04-11', feast: true });
  assert.equal(m.extra.location, 'Oak Hollow');
  assert.equal(m.extra.theme.title, 'Ember Road');
  assert.equal(m.extra.feastDetails.price, '$12');
  assert.match(m.extra.autoNotes, /Autocrat: Elaina/);
  assert.doesNotMatch(m.extra.autoNotes, /Feastocrat/);
  assert.deepEqual(m.extra.fromBid, { id: 'b1', callId: 'c1' });
  assert.equal(m.autocratEmail, 'elaina@example.com');
  assert.equal(m.accepted, true);
});

test('special event with no feast and a non-email contact', () => {
  const m = eventFromBid({ ...bid, category: 'special', hostType: 'household', feast: { offered: false }, submitter: { persona: 'X', contact: 'Discord: x#1' }, decision: null, status: 'submitted' });
  assert.equal(m.form.kind, 'park'); assert.equal(m.form.scope, 'park'); assert.equal(m.form.feast, false);
  assert.equal(m.autocratEmail, ''); assert.equal(m.accepted, false);
});

test('park call for an EndReign makes a park-level EndReign event', () => {
  const m = eventFromBid({ ...bid, category: 'endreign', callPark: 'Siar Geata' });
  assert.equal(m.form.kind, 'endreign'); assert.equal(m.form.scope, 'park');
});

import { callFromForm } from '../src/lib/bidMap.js';
test('new-event form opens a call for bids', () => {
  const c = callFromForm({ name: ' Winter EndReign ', kind: 'endreign', scope: 'park', kingdom: 'Westmarch', park: 'Siar Geata', startDate: '2027-01-09', endDate: '', deadline: '2026-11-01', requirements: 'Feast required' });
  assert.deepEqual(c, { category: 'endreign', title: 'Winter EndReign', kingdom: 'Westmarch', park: 'Siar Geata', term: '', windowStart: '2027-01-09', windowEnd: '2027-01-09', deadline: '2026-11-01', minCapacity: '', requirements: 'Feast required' });
  assert.equal(callFromForm({ name: 'X', kind: 'park', scope: 'kingdom', park: 'Anduril' }).category, 'special');
  assert.equal(callFromForm({ name: 'X', kind: 'park', scope: 'kingdom', park: 'Anduril' }).park, '');
});
