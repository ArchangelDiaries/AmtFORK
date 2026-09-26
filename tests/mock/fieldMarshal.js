export const fmConfigured = true; export const FM_URL = 'https://srfieldmarshal.netlify.app';
export const DIVS = [{ k: 'single', n: 'Single Short Sword' }, { k: 'board', n: 'Sword & Board' }, { k: 'flo', n: 'Florentine' }, { k: 'heavy', n: 'Heavy Weapons' }, { k: 'open', n: 'Open Class' }];
export const DIV = Object.fromEntries(DIVS.map(d => [d.k, d]));
export const LEVELS = [{ k: 'shire', n: 'Shire' }, { k: 'barony', n: 'Barony' }, { k: 'duchy', n: 'Duchy' }, { k: 'kingdom', n: 'Kingdom' }, { k: 'major', n: 'Major kingdom' }];
export const FORMATS = [{ k: 'pit', n: 'Pool and Bracket', d: 'Timed pits, then a top-4 bracket' }, { k: 'elim', n: 'Bracket Tournament', d: 'Single elimination' }];
export const PARK_LEVEL = { 'Siar Geata': 'duchy' };
export const fmAuth = () => ({});
export const fmSignInAsMarshal = async () => 'brannoc@example.com';
export const fmCreateTournament = async () => 'fm1'; export const fmSetSignupsOpen = async () => {}; export const fmSetFork = async () => {};
// Mock: set window.__fmMissing = true to simulate a deleted tournament.
export const fmGetTournament = async tid => (globalThis.__fmMissing ? null : { id: tid, name: 'Fall EndReign Warmaster Tournament', date: '2026-10-17', level: 'kingdom', pitMin: 10, divs: ['single','board','flo','heavy','open'], signupsOpen: true, ...(globalThis.__fmNoFork ? {} : { fork: { eventId: 'ev1', name: 'Fall EndReign' } }) });
export const fmRequestSignup = async () => 'q9';
export const forkRef = (eventId, name) => ({ eventId, name, url: `${location.origin}/e/${eventId}` });
export const fmTournamentUrl = (tid, tab) => `${FM_URL}/?t=${tid}${tab ? `&tab=${tab}` : ''}`;
export const parseFmTid = s => { try { const t = new URL(s).searchParams.get('t'); if (t) return t; } catch (e) {} return /^[A-Za-z0-9_-]{6,40}$/.test(s) ? s : ''; };
