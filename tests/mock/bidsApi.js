// Mock bid writes for MOCK=1 previews: nothing is saved.
const noop = async () => {};
export const saveCall = noop, setCallStatus = noop, deleteCall = noop, withdrawBid = noop, deleteBid = noop, decide = noop, review = noop, award = noop;
export const saveBid = async (u, id) => id || 'bnew';
export const createEventFromBid = async () => 'ev1';
