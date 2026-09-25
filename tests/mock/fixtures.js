// Fictional sample data for UI previews only.
const E = 'events/ev1';
export const FIX = {
  [E]: { name: 'Fall EndReign', kind: 'endreign', park: 'Siar Geata', startDate: '2026-10-17', endDate: '2026-10-18', location: 'Oak Hollow Park', address: 'Pavilion 3',
    theme: { title: 'The Fall of the Ashen Crown', tagline: 'The old reign ends at dusk. Who will stand when the banners fall?', story: 'The Ashen Crown has worn thin.\nGarb in greys and golds; bring a token for the final court.', accent: '#9A5B2E' },
    feast: { enabled: true, price: '$12, kids free', capacity: '60', menu: 'Roast chicken, root vegetables, bread and honey butter, apple crumble.', notes: 'Bring your own feast gear.' },
    registrationOpen: true, published: true, fieldMarshalUrl: 'https://example.com', ownerUid: 'u1',
    crats: { auto: { name: 'Elaina' }, war: { name: 'Sir Brannoc' }, feast: { name: 'Mistress Wren' }, troll: { name: 'Gorm' } }, notes: { water: '3 coolers at the pavilion' } },
  'access/ev1': { ownerUid: 'u1', roles: { 'elaina@example.com': ['auto'], 'wren@example.com': ['feast'] }, staffEmails: ['elaina@example.com', 'wren@example.com'],
    contacts: { auto: { name: 'Elaina', email: 'elaina@example.com' }, feast: { name: 'Mistress Wren', email: 'wren@example.com' }, war: { name: 'Sir Brannoc', email: 'brannoc@example.com' }, troll: { name: 'Gorm', email: 'gorm@example.com' } } },
  [`${E}/schedule/s1`]: { track: 'court', title: 'Opening Court', day: '2026-10-17', start: '09:30', end: '10:00', location: 'Pavilion' },
  [`${E}/schedule/s2`]: { track: 'war', title: 'Ditch battle', day: '2026-10-17', start: '10:30', end: '12:00', location: 'Main field', lead: 'Sir Brannoc', description: 'Three lives, open weapons.' },
  [`${E}/schedule/s3`]: { track: 'warmaster', title: 'Warmaster: pits', day: '2026-10-17', start: '13:00', end: '15:00', location: 'North field' },
  [`${E}/schedule/s4`]: { track: 'classes', title: 'Couch to Costume: tunic basics', day: '2026-10-17', start: '13:00', end: '14:00', location: 'Pavilion', lead: 'Elaina' },
  [`${E}/schedule/s5`]: { track: 'as', title: 'A&S display & judging', day: '2026-10-18', start: '10:00', end: '12:00' },
  [`${E}/schedule/s6`]: { track: 'meals', title: 'Feast', day: '2026-10-17', start: '18:00', end: '20:00', location: 'Pavilion' },
  [`${E}/registrations/r1`]: { persona: 'Dragoth', park: 'Siar Geata', kingdom: 'Westmarch', orkId: '11111', days: ['2026-10-17', '2026-10-18'], feast: true, checkedIn: true },
  [`${E}/registrations/r2`]: { persona: 'Lady Maren', park: 'Anduril', kingdom: 'Westmarch', days: ['2026-10-17'], feast: true, checkedIn: false, notes: 'Arriving late' },
  [`${E}/registrations/r3`]: { persona: 'Pip', park: 'Siar Geata', days: ['2026-10-17', '2026-10-18'], feast: false, checkedIn: false },
  [`${E}/feastPrefs/r1`]: { persona: 'Dragoth', noRestrictions: false, diets: ['Halal'], restrictions: ['Pork'], allergens: { Peanuts: 2 }, notes: '', source: 'ork' },
  [`${E}/feastPrefs/r2`]: { persona: 'Lady Maren', noRestrictions: false, diets: ['Vegetarian'], restrictions: [], allergens: { Gluten: 1 }, notes: 'Separate serving spoon please', source: 'form' },
};
