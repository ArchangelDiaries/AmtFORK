import React from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import { Header, useApp } from '../../App.jsx';
import { BidsProvider, useBids, CAT, CALL_ST, BID_ST } from '../../lib/bids.js';
import { review } from '../../lib/bidsApi.js';
import '../../bids.css';

export const catVar = k => ({ '--cc': `var(--c-${CAT[k] ? k : 'special'})` });
export const CatMark = ({ k }) => <span className="cat" style={catVar(k)}>{CAT[k]?.n || 'Uncategorized'}</span>;
export const CallPill = ({ s }) => <span className={`st ${s}`}>{CALL_ST[s] || s}</span>;
export const BidPill = ({ s }) => <span className={`st ${s}`}>{BID_ST[s] || s}</span>;

export function Stars({ id }) {
  const { rev } = useBids(); const { toast } = useApp();
  const r = rev[id]?.rating || 0;
  const set = async n => { try { await review(id, { rating: n }, rev[id]); } catch (e) { console.error(e); toast('Only kingdom officers can rate bids.'); } };
  return (
    <span className="stars" role="group" aria-label="Your rating">
      {[1, 2, 3, 4, 5].map(n => <button type="button" key={n} className={n <= r ? 'on' : ''} aria-label={`${n} of 5`} onClick={() => set(n)}>★</button>)}
    </span>
  );
}

function BidNav() {
  const { officer, bids, user } = useBids();
  const drafts = user ? bids.filter(b => b.owner === user.uid && b.status === 'draft').length : 0;
  const cls = ({ isActive }) => (isActive ? 'on' : '');
  return (
    <nav className="tabs linktabs">
      <NavLink to="/bids" end className={cls}>Calls for Bids</NavLink>
      <NavLink to="/bids/new" className={cls}>Build a Bid</NavLink>
      <NavLink to="/bids/mine" className={cls}>My Bids{drafts ? <span className="badge">{drafts}</span> : null}</NavLink>
      <NavLink to="/bids/archive" className={cls}>Bid Archive</NavLink>
      {officer && <NavLink to="/bids/desk" className={cls}>Monarch’s Desk</NavLink>}
    </nav>
  );
}

export function BidsLayout() {
  const { user } = useApp();
  return (
    <BidsProvider user={user || null}>
      <div className="wrap bids">
        <Header />
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 6 }}>
          <div><div className="eyebrow">Event bids</div><h2 style={{ fontSize: '1.5rem' }}>Bid to host a kingdom event</h2></div>
          <RoleChip />
        </div>
        <BidNav />
        <Outlet />
      </div>
    </BidsProvider>
  );
}
function RoleChip() {
  const { officer, user } = useBids();
  if (!user) return <Link className="btn ghost sm" to="/signin?next=/bids">Sign in to bid</Link>;
  return <span className={`pill ${officer ? 'accent' : ''}`}>{officer ? 'Kingdom officer' : 'Player'}</span>;
}

/** Wraps pages that need a signed-in player. */
export function NeedSignIn({ children, what = 'build a bid' }) {
  const { user } = useApp();
  if (user === undefined) return <p className="muted">Loading…</p>;
  if (!user) return (
    <div className="panel empty"><h2>Sign in to {what}</h2>
      <p>Bids are saved to your account so you can come back to a draft and see the kingdom’s decision. Use Google or an email link.</p>
      <Link className="btn" to={`/signin?next=${encodeURIComponent(location.pathname + location.search)}`}>Sign in</Link></div>
  );
  return children;
}
