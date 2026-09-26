import React from 'react';
import { Link } from 'react-router-dom';
import { useBids, fRange } from '../../lib/bids.js';
import { CatMark, BidPill, NeedSignIn } from './common.jsx';

export default function MyBids() {
  return <NeedSignIn what="see your bids"><Mine /></NeedSignIn>;
}

function Mine() {
  const { bids, user, callById, st, canEditBid } = useBids();
  const mine = bids.filter(b => b.owner === user?.uid).sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  return (
    <div className="stack">
      <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="muted" style={{ margin: 0, maxWidth: '62ch' }}>Drafts are private to you until you submit them. Submitted bids appear on their call and in the archive. When one of your bids wins, open it to create the event in FORK.</p>
        <Link className="btn accent" to="/bids/new">Start a new bid</Link>
      </div>
      {mine.length ? (
        <div className="panel"><div className="scroll"><table><thead><tr><th>Bid</th><th>For</th><th>Dates</th><th>Status</th><th /></tr></thead><tbody>
          {mine.map(b => { const c = callById(b.callId), s = st(b); return (
            <tr key={b.id}>
              <td><Link to={`/bids/${b.id}`}><b>{b.eventName || 'Untitled bid'}</b></Link><small><CatMark k={b.category} /></small></td>
              <td>{c ? c.title : <span className="muted">Independent</span>}<small>{b.kingdom}</small></td>
              <td>{fRange(b.start, b.end)}</td>
              <td><BidPill s={s} /></td>
              <td><div className="row">
                {canEditBid(b) && ['draft', 'submitted'].includes(s) && <Link className="btn ghost sm" to={`/bids/${b.id}/edit`}>Edit</Link>}
                {s === 'accepted' && (b.eventId ? <Link className="btn sm" to={`/crat/${b.eventId}`}>Crat Hall</Link> : <Link className="btn accent sm" to={`/bids/${b.id}`}>Create the event</Link>)}
              </div></td>
            </tr>); })}
        </tbody></table></div></div>
      ) : (
        <div className="panel empty"><h2>You haven’t started a bid</h2><p>Pick an open call on Calls for Bids, or start a bid for a community-hosted event like Feast of the Gods.</p><Link className="btn" to="/bids/new">Start a bid</Link></div>
      )}
    </div>
  );
}
