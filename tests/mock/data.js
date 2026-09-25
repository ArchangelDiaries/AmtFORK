import { FIX } from './fixtures.js';
const noop = async () => {};
export const useAuth = () => ({ uid: 'u1', email: 'elaina@example.com', displayName: 'Elaina' });
export const col = (...p) => ({ __path: p.join('/') });
const get = p => { const v = FIX[p]; return v && { id: p.split('/').pop(), ...v }; };
export const useDoc = p => ({ loading: false, data: p ? get(p) : null, error: null });
export const useQuery = build => { const q = build(); if (!q) return { loading: false, rows: [] };
  const pre = q.__path + '/'; const rows = Object.keys(FIX).filter(k => k.startsWith(pre) && !k.slice(pre.length).includes('/')).map(get);
  return { loading: false, rows: q.__path === 'access' ? rows : rows, error: null }; };
export const createEvent = noop, updateEvent = noop, assignCrat = noop, sendInvite = noop, saveItem = noop, deleteItem = noop,
  register = async () => 'r', setCheckIn = noop, removeRegistration = noop;
export const orkLookup = async () => ({ persona: 'Dragoth Spineclever', park: 'Siar Geata', kingdom: 'Westmarch',
  feast: { visible: true, noRestrictions: false, diets: ['Halal'], restrictions: ['Pork'], allergens: { Peanuts: 2, Soy: 1 } } });
export const blankEvent = () => ({});
