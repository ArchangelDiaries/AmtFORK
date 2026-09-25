export const fmConfigured = true; export const FM_URL = 'https://example.com';
export const DIVS = [{ k: 'single', n: 'Single Short Sword' }, { k: 'board', n: 'Sword & Board' }, { k: 'flo', n: 'Florentine' }, { k: 'heavy', n: 'Heavy Weapons' }, { k: 'open', n: 'Open Class' }];
export const DIV = Object.fromEntries(DIVS.map(d => [d.k, d]));
export const LEVELS = [{ k: 'shire', n: 'Shire' }, { k: 'barony', n: 'Barony' }, { k: 'duchy', n: 'Duchy' }, { k: 'kingdom', n: 'Kingdom' }, { k: 'major', n: 'Major kingdom' }];
export const PARK_LEVEL = { 'Siar Geata': 'duchy' };
export const fmAuth = () => ({});
export const fmSignInAsMarshal = async () => 'brannoc@example.com';
export const fmCreateTournament = async () => 'fm1'; export const fmSetSignupsOpen = async () => {};
export const fmGetTournament = async () => null; export const fmRequestSignup = async () => 'q9';
