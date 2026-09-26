// Event bids (formerly The Herald's Call): constants, helpers and live data hooks.
// Firestore (same FORK project):
//   bidCalls/{id}        a kingdom's call for bids               public read, officers write
//   bids/{id}            a bid                                    public once submitted; owner edits; officers edit
//   bidDecisions/{bidId} the kingdom's outcome for a bid          public read, officers write
//   bidReviews/{bidId}   monarch's private rating + notes         officers only
//   kingdomOfficers/{email}  who counts as a kingdom officer       each person reads only their own entry
import { ROLES, PARKS, KINGDOM } from './constants.js';

/* ---------- vocab ---------- */
export const CATS = [
  { k: 'midreign', n: 'Kingdom Midreign', d: 'Held mid-reign: tournaments, battlegames, court' },
  { k: 'coronation', n: 'Coronation', d: 'The crown passes to the new monarchy' },
  { k: 'special', n: 'Special Event', d: 'Feast of the Gods, Olympiad, war weekends and more' },
];
export const CAT = Object.fromEntries(CATS.map(c => [c.k, c]));
export const CALL_ST = { open: 'Accepting bids', review: 'Under review', awarded: 'Awarded', closed: 'Closed', community: 'Community-hosted' };
export const BID_ST = { draft: 'Draft', submitted: 'Submitted', accepted: 'Accepted', declined: 'Declined', withdrawn: 'Withdrawn' };
export const AMEN = [['tent', 'Tent camping'], ['cabins', 'Cabins / bunkhouses'], ['rv', 'RV hookups'], ['showers', 'Showers'], ['flush', 'Flush toilets'], ['water', 'Potable water'], ['power', 'Power at site'], ['fires', 'Campfires allowed'], ['pets', 'Pets allowed'], ['ada', 'ADA accessible'], ['kitchen', 'Kitchen for feast'], ['hall', 'Covered hall / pavilion']];
export const RESERVE = { none: 'Not contacted yet', inquired: 'Inquired', hold: 'Dates on hold', confirmed: 'Confirmed, deposit paid' };
export const BID_DIET = [['veg', 'Vegetarian'], ['vegan', 'Vegan'], ['gf', 'Gluten-free'], ['df', 'Dairy-free'], ['nut', 'Nut-free'], ['halal', 'Halal / kosher on request']];
export const ACTS = [['tourney', 'Tournaments'], ['battle', 'Battlegames'], ['quest', 'Quest / module'], ['court', 'Royal court'], ['as', 'Arts & Sciences'], ['bardic', 'Bardic circle'], ['merch', 'Merchants'], ['class', 'Classes / workshops'], ['kids', 'Youth activities']];
export const AS_OPT = [['none', 'None'], ['dragonmaster', 'Dragonmaster'], ['as_tourney', 'A&S tourney']];
export const FIGHT_OPT = [['none', 'None'], ['weaponmaster', 'Weaponmaster'], ['fighter', 'Fighter tournament']];
export const HOST_TYPES = [['park', 'Park'], ['household', 'Household'], ['company', 'Company'], ['guild', 'Guild'], ['individual', 'Individual'], ['kingdom', 'Kingdom']];
export const KINGDOM_EVENTS = ['Feast of the Gods', 'Feast of Fools', 'Feast of the Dead'];
export const KINGDOMS = ['Westmarch', 'Burning Lands', 'Celestial Kingdom', 'Crystal Groves', 'Desert Winds', 'Dragonspine', 'Emerald Hills', 'Golden Plains', 'Goldenvale', 'Iron Mountains', 'Neverwinter', 'Northern Lights', 'Polaris', 'Rising Winds', 'Tal Dagore', 'Wetlands', "Winter's Edge"];
// Bid crats use FORK's crat roles, so they carry straight into the event.
export const BID_ROLES = ROLES;
export { PARKS };

export const optName = (list, k) => (list.find(x => x[0] === k) || [, 'Not set'])[1];
export const num = v => { const n = parseFloat(v); return Number.isFinite(n) ? n : 0; };
export const money = n => (n < 0 ? '−' : '') + '$' + Math.abs(Math.round(n)).toLocaleString('en-US');
export const pDate = d => { if (!d) return null; const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
export const fDate = d => pDate(d)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || '';
export function fRange(a, b) {
  const A = pDate(a), B = pDate(b); if (!A) return 'Dates TBD'; if (!B || a === b) return fDate(a);
  const mo = o => o.toLocaleDateString('en-US', { month: 'short' });
  if (A.getFullYear() === B.getFullYear() && A.getMonth() === B.getMonth()) return `${mo(A)} ${A.getDate()}–${B.getDate()}, ${A.getFullYear()}`;
  if (A.getFullYear() === B.getFullYear()) return `${mo(A)} ${A.getDate()} – ${mo(B)} ${B.getDate()}, ${A.getFullYear()}`;
  return `${fDate(a)} – ${fDate(b)}`;
}
export const daysTo = d => { const x = pDate(d); if (!x) return null; const t = new Date(); t.setHours(0, 0, 0, 0); return Math.round((x - t) / 864e5); };
export const yearOf = b => (b.start || '').slice(0, 4);
export const fTime = t => { if (!t) return ''; const [h, m] = t.split(':').map(Number); return `${(h % 12) || 12}:${String(m).padStart(2, '0')}${h < 12 ? 'am' : 'pm'}`; };
const fDay = d => pDate(d)?.toLocaleDateString('en-US', { weekday: 'short' }) || '';
export const bgWhen = g => [fDay(g.date), g.start ? fTime(g.start) + (g.end ? '–' + fTime(g.end) : '') : ''].filter(Boolean).join(' ') || 'Time TBD';
export const bgSorted = b => (b.extras?.battlegames || []).filter(g => g.theme || g.start).slice()
  .sort((x, y) => ((x.date || '') + (x.start || '')).localeCompare((y.date || '') + (y.start || '')));
export const feastStyle = b => !b.feast?.offered ? 'No feast' : b.feast?.potluck ? 'Potluck' : 'Cooked feast';
export const hostLabel = b => b.hostPark ? `${b.hostPark}${b.hostType && b.hostType !== 'park' ? ` (${optName(HOST_TYPES, b.hostType).toLowerCase()})` : ''}` : '';
export const autocratOf = b => b.crats?.auto || '';

export function blankBid(call) {
  return {
    callId: call?.id || '', category: call?.category || 'special', kingdom: call?.kingdom || KINGDOM, eventName: call?.title || '',
    theme: '', themeDesc: '', hostType: 'park', hostPark: '',
    start: '', end: '',
    site: { name: '', location: '', url: '', reserve: 'none', capacity: '', acres: '', amen: ['tent'], notes: '' },
    crats: {}, attendance: { expected: '', lastYear: '' },
    cost: { gatePre: '', gateDoor: '', youth: '', feastCount: '', feastFee: '', siteRental: '', insurance: '', feastCostPer: '', other: '' },
    feast: { offered: true, potluck: false, meals: 'Saturday feast', menu: '', diet: [] },
    extras: { as: 'none', fight: 'none', battlegames: [] },
    program: { acts: [], schedule: '' }, notes: '',
    submitter: { persona: '', park: '', contact: '' }, status: 'draft',
  };
}
/** Fill any missing sections so older bids open cleanly in the builder. */
export function normalize(b) {
  const d = blankBid(); const n = { ...b };
  for (const k of Object.keys(d)) {
    if (n[k] === undefined) n[k] = d[k];
    else if (d[k] && typeof d[k] === 'object' && !Array.isArray(d[k])) n[k] = { ...d[k], ...n[k] };
  }
  return n;
}

export function budget(b) {
  const c = b.cost || {}, exp = num(b.attendance?.expected), fc = num(c.feastCount);
  const gate = exp * num(c.gatePre), feastIn = fc * num(c.feastFee);
  const out = num(c.siteRental) + num(c.insurance) + fc * num(c.feastCostPer) + num(c.other);
  const per = num(c.gatePre) + (exp ? (fc / exp) * (num(c.feastFee) - num(c.feastCostPer)) : 0);
  const fixed = num(c.siteRental) + num(c.insurance) + num(c.other);
  return { gate, feastIn, out, net: gate + feastIn - out, be: per > 0 ? Math.ceil(fixed / per) : null, exp };
}
const has = v => v !== '' && v !== undefined && v !== null;
export function checks(b, call) {
  const exp = num(b.attendance?.expected);
  return [
    ['Event name and kingdom', !!(b.eventName && b.kingdom)],
    ['Dates set', !!(b.start && b.end && b.end >= b.start)],
    ['Dates inside the call’s window', !call || !call.windowStart || !b.start ? null : (b.start >= call.windowStart && (!call.windowEnd || b.end <= call.windowEnd))],
    ['Site named', !!b.site?.name],
    ['Site booked or on hold', ['hold', 'confirmed'].includes(b.site?.reserve)],
    ['Capacity covers expected attendance', !num(b.site?.capacity) || !exp ? null : num(b.site.capacity) >= exp],
    ['Meets the call’s minimum capacity', !call || !num(call.minCapacity) ? null : num(b.site?.capacity) >= num(call.minCapacity)],
    ['Autocrat named', !!b.crats?.auto],
    ['Feastcrat named', !b.feast?.offered ? null : !!b.crats?.feast],
    ['Gate price set', has(b.cost?.gatePre)],
    ['Budget breaks even', !exp ? null : budget(b).net >= 0],
  ].filter(x => x[1] !== null);
}

/* ---------- hand-off: winning bid -> FORK event ---------- */
export const KIND = { midreign: 'midreign', coronation: 'coronation', special: 'park' };

/** The FORK event fields a bid fills in. */
export function eventFromBid(bid) {
  const c = bid.cost || {};
  const park = bid.hostType === 'park' || !bid.hostType ? (bid.hostPark || '') : (bid.submitter?.park || '');
  const crats = Object.fromEntries(Object.entries(bid.crats || {}).filter(([, n]) => n));
  return {
    name: bid.eventName || 'Untitled event', kind: KIND[bid.category] || 'park', scope: 'kingdom', kingdom: bid.kingdom || 'Westmarch', park,
    startDate: bid.start || '', endDate: bid.end || bid.start || '',
    location: bid.site?.name || '', address: bid.site?.location || '',
    theme: { title: bid.theme || '', tagline: '', story: bid.themeDesc || '', accent: '#B07F0C' },
    feast: {
      enabled: !!bid.feast?.offered, price: num(c.feastFee) ? `$${num(c.feastFee)}` : '', capacity: num(c.feastCount) ? String(num(c.feastCount)) : '',
      menu: bid.feast?.menu || '', notes: bid.feast?.potluck ? 'Potluck feast.' : '',
    },
    registrationOpen: false, published: false,
    fromBid: { id: bid.id, name: bid.eventName || '', crats, host: bid.hostPark || '', hostType: bid.hostType || 'park' },
  };
}
/** Schedule items the bid already promised: themed battlegames, tournaments, A&S, feast. */
export function scheduleFromBid(bid) {
  const note = 'From the winning bid. Set the time and place.';
  const items = bgSorted(bid).map(g => ({ track: 'war', title: (g.theme || 'Battlegame').slice(0, 140), day: g.date || '', start: g.start || '', end: g.end || '', location: '', lead: '', description: 'Themed battlegame from the winning bid.' }));
  const fight = bid.extras?.fight; const as = bid.extras?.as;
  if (fight && fight !== 'none') items.push({ track: 'warmaster', title: optName(FIGHT_OPT, fight) + (fight === 'fighter' ? '' : ' Tournament'), day: '', start: '', end: '', location: '', lead: '', description: note });
  if (as && as !== 'none') items.push({ track: 'as', title: optName(AS_OPT, as), day: '', start: '', end: '', location: '', lead: '', description: note });
  if (bid.feast?.offered) items.push({ track: 'meals', title: bid.feast.potluck ? 'Potluck feast' : 'Feast', day: '', start: '', end: '', location: '', lead: '', description: bid.feast.meals || note });
  return items;
}
/* ---------- status + grouping ---------- */
export const callStatus = c => c?.pseudo ? 'community' : (c?.status || 'open');
export function bidStatus(b, dec) {
  if (b.status === 'withdrawn') return 'withdrawn';
  if (b.status === 'draft') return 'draft';
  return dec?.[b.id]?.status || b.status || 'submitted';
}
export const commKey = b => (b.eventName || '').trim().toLowerCase().replace(/\s+\d{4}$/, '') + '|' + yearOf(b);

