import React, { useState } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import { useApp } from '../../App.jsx';
import { useBids, callStatus, fDate, fRange, num, money, budget, feastStyle, hostLabel, optName, bgSorted, bgWhen, AMEN, RESERVE, AS_OPT, FIGHT_OPT } from '../../lib/bids.js';
import { setCallStatus, deleteCall, award } from '../../lib/bidsApi.js';
import { CatMark, CallPill, BidPill, catVar } from './common.jsx';
import { CallForm } from './Calls.jsx';

/** Two-tap confirm: the first tap arms a button for 4 seconds, the second runs it. */
export function useArm() {
  const [armed, setArmed] = useState(null);
  const arm = (key, fn) => {
    if (armed === key) { setArmed(null); fn(); return; }
    setArmed(key); setTimeout(() => setArmed(a => (a === key ? null : a)), 4000);
  };
  return [armed, arm];
}

export const COMPARE_ROWS = [
  ['Hosted by', b => hostLabel(b) || '—'],
  ['Theme', b => b.theme || '—'],
  ['Dates', b => fRange(b.start, b.end)],
  ['Site', b => <>{b.site?.name || '—'}<small>{b.site?.location}</small></>],
  ['Site booking', b => RESERVE[b.site?.reserve] || '—'],
  ['Capacity', b => b.site?.capacity || '—'],
  ['Camping', b => AMEN.filter(x => (b.site?.amen || []).includes(x[0])).map(x => x[1]).join(', ') || '—'],
  ['Autocrat', b => b.crats?.auto || '—'],
  ['Expected', b => num(b.attendance?.expected) || '—'],
  ['Gate (pre-reg)', b => b.cost?.gatePre !== '' && b.cost?.gatePre !== undefined ? money(num(b.cost.gatePre)) : '—'],
  ['Feast', b => b.feast?.offered ? <>{feastStyle(b)} · {num(b.cost?.feastFee) ? money(num(b.cost.feastFee)) : 'Included'}<small>{b.feast?.meals}</small></> : 'No feast'],
  ['A&S', b => optName(AS_OPT, b.extras?.as)],
  ['Tournament', b => optName(FIGHT_OPT, b.extras?.fight)],
  ['Battlegames', b => { const g = bgSorted(b); return g.length ? g.map((x, i) => <div key={i}>{x.theme || 'Battlegame'}<small>{bgWhen(x)}</small></div>) : '—'; }],
  ['Projected net', b => { const x = budget(b); return <><b className={x.net < 0 ? 'warn' : 'good'}>{money(x.net)}</b>{x.be ? <small>Breaks even at {x.be}</small> : null}</>; }],
];

export default function CallPage() {
  const { id } = useParams(); const nav = useNavigate(); const { toast } = useApp();
  const { callById, bidsFor, officer, st, dec, loading } = useBids();
  const [editing, setEditing] = useState(false);
  const [armedKey, arm] = useArm();
  const c = callById(id);
  if (!c) return loading ? <p className="muted">Loading…</p> : <div className="panel empty"><h2>Call not found</h2><p>It may have been removed.</p><Link className="btn" to="/bids">All calls</Link></div>;
  const s = callStatus(c);
  const bids = bidsFor(c.id).sort((a, b) => (a.submittedAt || 0) - (b.submittedAt || 0));

  const doAward = b => arm('award' + b.id, async () => {
    try { await award(b, bids, dec, c); toast(`Awarded to ${b.eventName}.`); } catch (e) { console.error(e); toast('Only kingdom officers can award bids.'); }
  });

  return (
    <div className="stack">
      <div><Link className="btn ghost sm" to="/bids">← All calls</Link></div>
      {editing ? <CallForm id={c.id} onDone={() => setEditing(false)} /> : (
        <div className="panel ccard" style={catVar(c.category)}>
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}><CatMark k={c.category} /><CallPill s={s} /></div>
          <h2 style={{ fontSize: '1.8rem' }}>{c.title}</h2>
          <dl className="meta">
            <dt>Kingdom</dt><dd>{c.kingdom}{c.term ? ` · ${c.term}` : ''}</dd>
            <dt>Event window</dt><dd>{fRange(c.windowStart, c.windowEnd)}</dd>
            <dt>Bids due</dt><dd>{fDate(c.deadline) || '—'}</dd>
            {c.minCapacity && <><dt>Min. capacity</dt><dd className="num">{c.minCapacity}</dd></>}
          </dl>
          {c.requirements && <><h3 style={{ fontSize: '1.05rem', marginTop: 8 }}>What bids must cover</h3><p className="story" style={{ margin: 0 }}>{c.requirements}</p></>}
          <div className="row" style={{ marginTop: 6 }}>
            {s === 'open' && <Link className="btn accent" to={`/bids/new?call=${c.id}`}>Build a bid for this event</Link>}
            {officer && <>
              <button className="btn ghost" onClick={() => setEditing(true)}>Edit call</button>
              {s === 'open' && <button className="btn ghost" onClick={async () => { try { await setCallStatus(c.id, 'review'); toast('Bidding closed. The call is under review.'); } catch (e) { toast('Only kingdom officers can do that.'); } }}>Close bidding</button>}
              <button className={`btn danger ${armedKey === 'del' ? 'armed' : ''}`} onClick={() => arm('del', async () => { try { await deleteCall(c.id); toast('Call deleted. Its bids stay in the archive.'); nav('/bids'); } catch (e) { toast('Only kingdom officers can delete calls.'); } })}>{armedKey === 'del' ? 'Tap again to delete' : 'Delete call'}</button>
            </>}
          </div>
        </div>)}

      <div className="panel">
        <h2>Bids side by side <span className="muted sub">{bids.length} submitted</span></h2>
        {bids.length ? (
          <div className="scroll"><table className="cmp"><thead><tr><th />{bids.map(b => <td key={b.id}><Link to={`/bids/${b.id}`}><b>{b.eventName}</b></Link><small>{b.submitter?.persona}</small></td>)}</tr></thead>
            <tbody>
              <tr><th>Status</th>{bids.map(b => <td key={b.id}><BidPill s={st(b)} /></td>)}</tr>
              {COMPARE_ROWS.map(([l, f]) => <tr key={l}><th>{l}</th>{bids.map(b => <td key={b.id}>{f(b)}</td>)}</tr>)}
              {officer && s !== 'closed' && <tr><th>Decision</th>{bids.map(b => { const bs = st(b); return (
                <td key={b.id}>{bs === 'accepted' ? <b className="good">Awarded</b> : bs === 'submitted'
                  ? <button className={`btn accent sm ${armedKey === 'award' + b.id ? 'armed' : ''}`} onClick={() => doAward(b)}>{armedKey === 'award' + b.id ? 'Tap again to award' : 'Award this bid'}</button>
                  : <span className="muted">{bs}</span>}</td>); })}</tr>}
            </tbody></table></div>
        ) : <p className="muted" style={{ fontStyle: 'italic' }}>No bids submitted yet.</p>}
        {officer && bids.length > 0 && <p className="hint">Awarding a bid marks it accepted, declines the other open bids, and moves the call to Awarded. The winner then creates the event in FORK from their bid.</p>}
      </div>
    </div>
  );
}
