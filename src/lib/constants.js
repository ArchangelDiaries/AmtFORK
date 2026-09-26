// Crat roles. `tracks` = schedule tracks the role may edit (Autocrat edits everything).
export const ROLES = [
  { k: 'auto',   n: 'Autocrat',    d: 'Runs the event. Full access, invites the other crats.', tracks: '*' },
  { k: 'war',    n: 'Warcrat',     d: 'Wargame schedule and the Warmaster Tournament.', tracks: ['war', 'warmaster'] },
  { k: 'as',     n: 'A&S Crat',    d: 'Arts & Sciences schedule, workshops and classes.', tracks: ['as', 'classes'] },
  { k: 'quest',  n: 'Questcrat',   d: 'Quests and battlegames on the wargame schedule.', tracks: ['war'] },
  { k: 'water',  n: 'Hydrocrat',   d: 'Water and hydration stations.', tracks: [] },
  { k: 'feast',  n: 'Feastcrat',   d: 'Meals and Feast schedule, menu, dietary report.', tracks: ['meals'] },
  { k: 'troll',  n: 'Gatecrat',    d: 'Gate, check-in, waivers, court and general schedule.', tracks: ['court'] },
  { k: 'safety', n: 'Securitycrat', d: 'Site security, first aid, emergency plan.', tracks: [] },
];
export const ROLE = Object.fromEntries(ROLES.map(r => [r.k, r]));

// Schedule tracks
export const TRACKS = [
  { k: 'court',     n: 'Court & General',        c: 'var(--t-court)' },
  { k: 'war',       n: 'Wargames',               c: 'var(--t-war)' },
  { k: 'warmaster', n: 'Warmaster Tournament',   c: 'var(--t-warmaster)' },
  { k: 'as',        n: 'Arts & Sciences',        c: 'var(--t-as)' },
  { k: 'classes',   n: 'Workshops & Classes',    c: 'var(--t-classes)' },
  { k: 'meals',     n: 'Meals & Feast',          c: 'var(--t-meals)' },
];
export const TRACK = Object.fromEntries(TRACKS.map(t => [t.k, t]));

export function canEditTrack(myRoles, track, isOwner) {
  if (isOwner || myRoles.includes('auto')) return true;
  return myRoles.some(r => { const t = ROLE[r]?.tracks; return t === '*' || (Array.isArray(t) && t.includes(track)); });
}

// Feast options: identical categories to the ORK's Dietary Preferences (ork_mundane_dietary).
export const DIETS = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Keto', 'Paleo'];
export const RESTRICTIONS = ['Dairy', 'Eggs', 'Fish', 'Honey', 'Poultry', 'Beef', 'Pork', 'Shellfish'];
export const ALLERGENS = ['Milk', 'Eggs', 'Fish', 'Shellfish', 'Treenuts', 'Peanuts', 'Wheat', 'Soy',
  'Sesame', 'Garlic', 'Gluten', 'Onion', 'Mushroom', 'Corn', 'Coconut', 'Cocoa', 'Nightshades'];
export const ALLERGEN_LABEL = { Treenuts: 'Tree nuts' };
export const SEVERITY = { 1: 'Mild', 2: 'Severe' };

export const PARKS = ['Siar Geata', 'Anduril', 'Ashen Grove', 'Ethereal Hollow', 'Quixotic Valley', 'Emerald Dunes'];
// Role keys (water, troll, safety) stay as-is in the database; only the display names changed.

export const EVENT_KINDS = [
  { k: 'coronation', n: 'Coronation' }, { k: 'midreign', n: 'Midreign' },
  { k: 'endreign', n: 'EndReign' }, { k: 'park', n: 'Other event' },
];
export const SCOPES = [{ k: 'park', n: 'Park level' }, { k: 'kingdom', n: 'Kingdom level' }];
export const KINGDOM = 'Westmarch';

/** "Kingdom Coronation", "Park EndReign", "Park Event" … */
export function eventType(e) {
  const scope = e.scope === 'kingdom' ? 'Kingdom' : 'Park';
  const kind = e.kind === 'park' || !e.kind ? 'Event' : (EVENT_KINDS.find(k => k.k === e.kind)?.n || 'Event');
  return `${scope} ${kind}`;
}
/** Who's hosting: the park, or the kingdom (plus host park if given). */
export function eventHost(e) {
  if (e.scope === 'kingdom') return `Kingdom of ${e.kingdom || KINGDOM}${e.park ? ` · hosted by ${e.park}` : ''}`;
  return e.park || '';
}

export const ORK_PLAYER_URL = id => `https://ork.amtgard.com/orkui/index.php?Route=Player/profile/${encodeURIComponent(id)}`;
export const parseOrkId = s => { const m = String(s || '').match(/(\d{2,9})(?!.*\d)/); return m ? m[1] : ''; };
