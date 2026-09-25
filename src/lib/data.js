import { useEffect, useState } from 'react';
import { onAuthStateChanged, sendSignInLinkToEmail } from 'firebase/auth';
import {
  collection, doc, onSnapshot, query, where, writeBatch, updateDoc, setDoc, deleteDoc,
  serverTimestamp, addDoc, getDoc,
} from 'firebase/firestore';
import { auth, db, lower } from './firebase.js';

/* ---------- hooks ---------- */
export function useAuth() {
  const [u, setU] = useState(undefined);
  useEffect(() => onAuthStateChanged(auth, setU), []);
  return u; // undefined = loading, null = signed out
}
export function useDoc(path) {
  const [s, setS] = useState({ loading: true, data: null, error: null });
  useEffect(() => {
    if (!path) { setS({ loading: false, data: null, error: null }); return; }
    setS(x => ({ ...x, loading: true }));
    return onSnapshot(doc(db, path),
      d => setS({ loading: false, data: d.exists() ? { id: d.id, ...d.data() } : null, error: null }),
      e => setS({ loading: false, data: null, error: e }));
  }, [path]);
  return s;
}
export function useQuery(build, deps) {
  const [s, setS] = useState({ loading: true, rows: [], error: null });
  useEffect(() => {
    const q = build(); if (!q) { setS({ loading: false, rows: [], error: null }); return; }
    return onSnapshot(q,
      snap => setS({ loading: false, rows: snap.docs.map(d => ({ id: d.id, ...d.data() })), error: null }),
      e => setS({ loading: false, rows: [], error: e }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return s;
}
export const col = (...p) => collection(db, ...p);

/* ---------- events ---------- */
export const blankEvent = () => ({
  name: '', kind: 'park', park: 'Siar Geata', startDate: '', endDate: '', location: '', address: '',
  theme: { title: '', tagline: '', story: '', accent: '#B07F0C' },
  feast: { enabled: false, price: '', capacity: '', menu: '', notes: '' },
  registrationOpen: true, published: false, fieldMarshalUrl: '', crats: {}, notes: {},
});

export async function createEvent(user, data) {
  const ref = doc(col('events'));
  const email = lower(user.email);
  const b = writeBatch(db);
  b.set(ref, { ...blankEvent(), ...data, ownerUid: user.uid,
    crats: { auto: { name: user.displayName || email } }, createdAt: serverTimestamp() });
  b.set(doc(db, 'access', ref.id), {
    ownerUid: user.uid, roles: { [email]: ['auto'] }, staffEmails: [email],
    contacts: { auto: { name: user.displayName || email, email } },
  });
  await b.commit();
  return ref.id;
}
export const updateEvent = (id, patch) => updateDoc(doc(db, 'events', id), patch);

/** Assign (or clear) a crat. contacts: {role:{name,email}} is private; event.crats holds public names. */
export async function assignCrat(eid, access, role, name, email) {
  email = lower(email);
  const contacts = { ...(access.contacts || {}) };
  if (email) contacts[role] = { name: name || email, email }; else delete contacts[role];
  // roles are rebuilt from contacts; the owner always stays Autocrat-capable.
  const roles = {};
  for (const [r, c] of Object.entries(contacts)) (roles[c.email] ||= []).push(r);
  const ownerEmail = Object.entries(access.roles || {}).find(([, rs]) => rs.includes('auto'))?.[0];
  if (!Object.values(roles).some(rs => rs.includes('auto')) && ownerEmail) (roles[ownerEmail] ||= []).push('auto');
  const b = writeBatch(db);
  b.update(doc(db, 'access', eid), { contacts, roles, staffEmails: Object.keys(roles) });
  b.update(doc(db, 'events', eid), { [`crats.${role}`]: email ? { name: name || email.split('@')[0] } : null });
  await b.commit();
}
export async function sendInvite(email) {
  const url = `${location.origin}/signin?invited=1`;
  await sendSignInLinkToEmail(auth, lower(email), { url, handleCodeInApp: true });
}

/* ---------- schedule ---------- */
export const saveItem = (eid, item) => {
  const { id, ...data } = item;
  return id ? setDoc(doc(db, 'events', eid, 'schedule', id), data) : addDoc(col('events', eid, 'schedule'), data);
};
export const deleteItem = (eid, id) => deleteDoc(doc(db, 'events', eid, 'schedule', id));

/* ---------- registrations ---------- */
/** Public signup. Writes the general record and (if eating) the private feast record under the same id. */
export async function register(eid, reg, feast) {
  const ref = doc(col('events', eid, 'registrations'));
  const b = writeBatch(db);
  b.set(ref, { ...reg, feast: !!feast, checkedIn: false, createdAt: serverTimestamp() });
  if (feast) b.set(doc(db, 'events', eid, 'feastPrefs', ref.id), { persona: reg.persona, ...feast, createdAt: serverTimestamp() });
  await b.commit();
  return ref.id;
}
export const setCheckIn = (eid, rid, v) => updateDoc(doc(db, 'events', eid, 'registrations', rid), { checkedIn: v });
export async function removeRegistration(eid, rid, hadFeast) {
  const b = writeBatch(db);
  b.delete(doc(db, 'events', eid, 'registrations', rid));
  if (hadFeast) b.delete(doc(db, 'events', eid, 'feastPrefs', rid));
  await b.commit();
}

/* ---------- ORK ---------- */
export async function orkLookup(id) {
  const r = await fetch(`/api/ork?id=${encodeURIComponent(id)}`);
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(j.error || 'ORK lookup failed');
  return j;
}

export { where, query, doc, getDoc };
