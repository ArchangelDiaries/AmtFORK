export const query = x => x; export const where = () => null;
export const doc = (_db, ...p) => ({ __path: p.join('/') });
export const getDoc = async d => { const { FIX } = await import('./fixtures.js'); const v = FIX[d.__path]; return { exists: () => !!v, id: d.__path.split('/').pop(), data: () => v }; };
export const updateDoc = async () => {}; export const setDoc = async () => {};
export const collection = (_db, ...p) => ({ __path: p.join('/') }); export const addDoc = async () => ({ id: 'newcall' });
