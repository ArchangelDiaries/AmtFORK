// Event bids: writes, and the hand-off that turns a winning bid into a FORK event.
import { doc, setDoc, updateDoc, addDoc, deleteDoc, collection, writeBatch } from 'firebase/firestore';
import { db } from '../lib/firebase.js';
import { createEvent, saveItem } from '../lib/data.js';
import { eventFromBid, scheduleFromBid } from './bids.js';

const clean = o => JSON.parse(JSON.stringify(o)); // drops undefined, which Firestore rejects

/* ---------- calls ---------- */
export async function saveCall(id, data) {
  if (id) await updateDoc(doc(db, 'bidCalls', id), clean({ ...data, updatedAt: Date.now() }));
  else await addDoc(collection(db, 'bidCalls'), clean({ ...data, status: 'open', createdAt: Date.now(), updatedAt: Date.now() }));
}
export const setCallStatus = (id, status) => updateDoc(doc(db, 'bidCalls', id), { status, updatedAt: Date.now() });
export const deleteCall = id => deleteDoc(doc(db, 'bidCalls', id));

/* ---------- bids ---------- */
/** Saves a bid (new or existing). Returns its id. */
export async function saveBid(user, id, bid, submit) {
  const data = clean({ ...bid, updatedAt: Date.now() });
  delete data.id;
  if (submit) { data.status = 'submitted'; data.submittedAt = Date.now(); }
  if (id) { await setDoc(doc(db, 'bids', id), data); return id; }
  data.owner = user.uid; data.createdAt = Date.now();
  const ref = await addDoc(collection(db, 'bids'), data);
  return ref.id;
}
export const withdrawBid = id => updateDoc(doc(db, 'bids', id), { status: 'withdrawn', updatedAt: Date.now() });
export const deleteBid = id => deleteDoc(doc(db, 'bids', id));

/* ---------- decisions + reviews (officers) ---------- */
export const decide = (bidId, status, note) => setDoc(doc(db, 'bidDecisions', bidId), { status, note: note || '', at: Date.now() });
export const review = (bidId, patch, prev) => setDoc(doc(db, 'bidReviews', bidId), { ...(prev || {}), ...patch, at: Date.now() });

/** Award one bid: accept it, decline its open rivals, and mark the call awarded. */
export async function award(bid, rivals, dec, call) {
  const b = writeBatch(db);
  b.set(doc(db, 'bidDecisions', bid.id), { status: 'accepted', note: dec[bid.id]?.note || 'Awarded the event.', at: Date.now() });
  rivals.filter(o => o.id !== bid.id && (dec[o.id]?.status || o.status) === 'submitted')
    .forEach(o => b.set(doc(db, 'bidDecisions', o.id), { status: 'declined', note: dec[o.id]?.note || '', at: Date.now() }));
  if (call && !call.pseudo) b.update(doc(db, 'bidCalls', call.id), { status: 'awarded', awardedBid: bid.id, updatedAt: Date.now() });
  await b.commit();
}

/* ---------- hand-off: winning bid -> FORK event ---------- */
/** Creates the FORK event (the signed-in person becomes its Autocrat), fills the schedule, and links bid <-> event. */
export async function createEventFromBid(user, bid) {
  const eid = await createEvent(user, eventFromBid(bid));
  for (const it of scheduleFromBid(bid)) { try { await saveItem(eid, it); } catch (e) { console.warn('Schedule item skipped', e); } }
  try { await updateDoc(doc(db, 'bids', bid.id), { eventId: eid, updatedAt: Date.now() }); } catch (e) { console.warn('Could not link the bid to its event', e); }
  return eid;
}
