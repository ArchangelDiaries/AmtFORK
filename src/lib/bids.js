// Event bids: live data hooks. Pure helpers and vocab live in bidsCore.js (re-exported here).
import React, { createContext, useContext, useMemo } from 'react';
import { query, where } from 'firebase/firestore';
import { useDoc, useQuery, col } from '../lib/data.js';
import { lower } from '../lib/firebase.js';
import { bidStatus, commKey, yearOf } from './bidsCore.js';

export * from './bidsCore.js';

/* ---------- live data ---------- */
const Ctx = createContext(null);
export const useBids = () => useContext(Ctx);

export function BidsProvider({ user, children }) {
  const email = user?.email ? lower(user.email) : '';
  const off = useDoc(email ? `kingdomOfficers/${email}` : null);
  const officer = !!off.data;
  const calls = useQuery(() => col('bidCalls'), []);
  const pub = useQuery(() => query(col('bids'), where('status', 'in', ['submitted', 'withdrawn'])), []);
  const mine = useQuery(() => (user ? query(col('bids'), where('owner', '==', user.uid)) : null), [user?.uid]);
  const decs = useQuery(() => col('bidDecisions'), []);
  const revs = useQuery(() => (officer ? col('bidReviews') : null), [officer]);

  const value = useMemo(() => {
    const byId = {}; [...pub.rows, ...mine.rows].forEach(b => { byId[b.id] = b; });
    const bids = Object.values(byId);
    const dec = Object.fromEntries(decs.rows.map(d => [d.id, d]));
    const rev = Object.fromEntries(revs.rows.map(d => [d.id, d]));
    const callById = id => calls.rows.find(c => c.id === id);
    const st = b => bidStatus(b, dec);
    const isComm = b => !b.callId || !callById(b.callId);
    const bidsFor = cid => bids.filter(b => b.callId === cid && st(b) !== 'draft');
    const community = () => {
      const g = {};
      bids.filter(b => isComm(b) && st(b) !== 'draft').forEach(b => {
        const k = commKey(b);
        (g[k] ||= { id: 'ind:' + k, pseudo: true, key: k, title: (b.eventName || 'Untitled').replace(/\s+\d{4}$/, '') + (yearOf(b) ? ' ' + yearOf(b) : ''), category: b.category, kingdom: b.kingdom, bids: [], start: b.start || '' }).bids.push(b);
      });
      return Object.values(g).map(x => ({ ...x, decided: x.bids.some(b => st(b) === 'accepted') }))
        .sort((a, b) => a.decided - b.decided || (b.start || '').localeCompare(a.start || ''));
    };
    const deskBids = c => c.pseudo ? bids.filter(b => isComm(b) && st(b) !== 'draft' && commKey(b) === c.key) : bidsFor(c.id);
    return {
      user, officer, loading: calls.loading || pub.loading, calls: calls.rows, bids, dec, rev,
      callById, bidById: id => byId[id], st, isComm, bidsFor, community, deskBids,
      canEditBid: b => officer || (!!user && b.owner === user.uid),
    };
  }, [user, officer, calls.rows, calls.loading, pub.rows, pub.loading, mine.rows, decs.rows, revs.rows]);
  return React.createElement(Ctx.Provider, { value }, children);
}
