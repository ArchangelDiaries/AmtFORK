// Bridge from The Herald's Call (bids, in /herald/) to FORK events. Both live in FORK's Firebase project;
// Herald's collections start with herald_. Bids are public to read.
import { doc, getDoc, updateDoc, setDoc, collection, addDoc } from 'firebase/firestore';
import { db } from '../lib/firebase.js'; // path form lets MOCK=1 previews swap it

export const HERALD_URL = '/herald/';
export const bidUrl = id => `${HERALD_URL}?bid=${encodeURIComponent(id)}`;

export async function getBid(id) {
  const d = await getDoc(doc(db, 'herald_bids', id));
  if (!d.exists()) return null;
  const dec = await getDoc(doc(db, 'herald_decisions', id)).catch(() => null);
  return { id: d.id, ...d.data(), decision: dec && dec.exists() ? dec.data() : null };
}

export { eventFromBid } from './bidMap.js';

/** Let The Herald's Call link to the new event. Bid owners can write their bid; officers their decision. */
export async function linkBidToEvent(bidId, eventId) {
  let ok = false;
  try { await updateDoc(doc(db, 'herald_bids', bidId), { forkEventId: eventId }); ok = true; } catch (e) { /* not the bid owner */ }
  try { await setDoc(doc(db, 'herald_decisions', bidId), { forkEventId: eventId }, { merge: true }); ok = true; } catch (e) { /* not an officer */ }
  return ok;
}

export const callUrl = id => `${HERALD_URL}?call=${encodeURIComponent(id)}`;

/** Open an event to bids: posts a call in The Herald's Call, owned by the signed-in person. */
export async function openCallForBids(user, c) {
  const { callFromForm } = await import('./bidMap.js');
  const ref = await addDoc(collection(db, 'herald_calls'), { ...callFromForm(c), owner: user.uid, status: 'open', createdAt: Date.now(), updatedAt: Date.now() });
  return ref.id;
}
