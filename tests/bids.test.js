import test from 'node:test';
import assert from 'node:assert/strict';
import { eventFromBid, scheduleFromBid, budget, checks, bidStatus, commKey, normalize, blankBid } from '../src/lib/bidsCore.js';

const bid = {
  id: 'b1', eventName: 'Feast of the Gods 2027', category: 'special', kingdom: 'Westmarch', hostType: 'household', hostPark: 'House Ravenmoor',
  theme: 'Olympus Descends', themeDesc: 'Come as a god.', start: '2027-05-14', end: '2027-05-16',
  site: { name: 'Oak Meadow', location: 'Temecula, CA', reserve: 'hold', capacity: '180', amen: [] },
  crats: { auto: 'Lady Seraphine', feast: 'Mistress Wren', war: '' },
  attendance: { expected: '120' },
  cost: { gatePre: '20', feastCount: '100', feastFee: '15', feastCostPer: '9', siteRental: '1600', insurance: '175', other: '400' },
  feast: { offered: true, potluck: false, meals: 'Saturday feast', menu: 'Lamb' },
  extras: { as: 'as_tourney', fight: 'weaponmaster', battlegames: [{ theme: 'Titanomachy', date: '2027-05-15', start: '10:00', end: '12:00' }, { theme: '', start: '' }] },
  submitter: { persona: 'Lady Seraphine', park: 'Siar Geata' },
};

test('winning bid maps onto a FORK event', () => {
  const e = eventFromBid(bid);
  assert.equal(e.name, 'Feast of the Gods 2027');
  assert.equal(e.kind, 'park');
  assert.equal(e.scope, 'kingdom');
  assert.equal(e.park, 'Siar Geata', 'a household host falls back to the submitter park');
  assert.equal(e.startDate, '2027-05-14'); assert.equal(e.endDate, '2027-05-16');
  assert.equal(e.location, 'Oak Meadow'); assert.equal(e.address, 'Temecula, CA');
  assert.equal(e.theme.title, 'Olympus Descends');
  assert.deepEqual(e.feast, { enabled: true, price: '$15', capacity: '100', menu: 'Lamb', notes: '' });
  assert.equal(e.published, false); assert.equal(e.registrationOpen, false);
  assert.deepEqual(e.fromBid.crats, { auto: 'Lady Seraphine', feast: 'Mistress Wren' }, 'blank crat names are dropped');
  assert.equal(e.fromBid.id, 'b1');
  assert.equal(eventFromBid({ ...bid, category: 'coronation', hostType: 'park', hostPark: 'Anduril' }).kind, 'coronation');
  assert.equal(eventFromBid({ ...bid, category: 'coronation', hostType: 'park', hostPark: 'Anduril' }).park, 'Anduril');
});

test('bid promises become schedule items on valid tracks', () => {
  const items = scheduleFromBid(bid);
  assert.deepEqual(items.map(i => [i.track, i.title]), [
    ['war', 'Titanomachy'], ['warmaster', 'Weaponmaster Tournament'], ['as', 'A&S tourney'], ['meals', 'Feast'],
  ]);
  assert.equal(items[0].day, '2027-05-15'); assert.equal(items[0].start, '10:00');
  items.forEach(i => { assert.ok(['court', 'war', 'warmaster', 'as', 'classes', 'meals'].includes(i.track)); assert.ok(i.title.length > 0 && i.title.length <= 140); });
  assert.deepEqual(scheduleFromBid({ ...bid, feast: { offered: false }, extras: { as: 'none', fight: 'none', battlegames: [] } }), []);
  assert.equal(scheduleFromBid({ ...bid, feast: { offered: true, potluck: true } }).at(-1).title, 'Potluck feast');
});

test('budget, checklist, status and grouping', () => {
  const x = budget(bid);
  assert.equal(x.net, 120 * 20 + 100 * 15 - (1600 + 175 + 100 * 9 + 400));
  const ck = Object.fromEntries(checks(bid, null));
  assert.equal(ck['Autocrat named'], true); assert.equal(ck['Feastcrat named'], true); assert.equal(ck['Site booked or on hold'], true);
  assert.equal(bidStatus({ id: 'b1', status: 'submitted' }, { b1: { status: 'accepted' } }), 'accepted');
  assert.equal(bidStatus({ id: 'b1', status: 'withdrawn' }, { b1: { status: 'accepted' } }), 'withdrawn');
  assert.equal(commKey(bid), commKey({ eventName: 'feast of the gods', start: '2027-06-01' }));
  const n = normalize({ eventName: 'Old bid', feast: { offered: true } });
  assert.equal(n.feast.potluck, false); assert.deepEqual(n.extras, blankBid().extras);
});
