import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../App.jsx';
import { useBids, callStatus, CALL_ST, daysTo, fDate, fRange, num, money, budget, checks, feastStyle, hostLabel, optName, bgSorted, bgWhen, RESERVE, AS_OPT, FIGHT_OPT } from '../../lib/bids.js';
import { award, setCallStatus } from '../../lib/bidsApi.js';
import { CatMark, CallPill, BidPill, Stars, catVar } from './common.jsx';
import { useArm } from './CallPage.jsx';

const ORD = { open: 0, review: 1, awarded: 2, closed: 3 };

export default function Desk() {
  const { officer, loading } = useBids();
  if (loading) return <p className="muted">Loading…</p>;
  if (!officer) return <div className="panel empty"><h2>Kingdom officers only</h2><p>The Monarch’s Desk is for the monarchy and kingdom officers. Ask the site owner to add your email to the officer list.</p></div>;
  return <DeskInner />;
}

function DeskInner() {
  const { toast } = useApp();
  const { calls, community, deskBids, st, dec, rev, callById } = useBids();
  const [sel, setSel] = useState(() => { try { return sessionStorage.getItem('bids.desk') || ''; } catch (e) { return ''; } });
  const [armed, arm] = useArm();
  const real = calls.slice().sort((a, b) => ORD[callStatus(a)] - ORD[callStatus(b)] || (a.deadline || '').localeCompare(b.deadline || ''));
  const comm = community();
  const all = [...real, ...comm];
  if (!all.length) return <div className="panel empty"><h2>No events yet</h2><p>Post a call for bids, or wait for a group to bid on a kingdom-level event. Every bid lines up here.</p></div>;
  const live = x => (x.pseudo ? !x.decided : ['open', 'review'].includes(callStatus(x))) && deskBids(x).length;
  const c = all.find(x => x.id === sel) || all.find(live) || all[0];
  const pick = id => { setSel(id); try { sessionStorage.setItem('bids.desk', id); } catch (e) { /* ignore */ } };
  const s = callStatus(c);
  const everyBid = deskBids(c);
  const bids = everyBid.filter(b => st(b) !== 'withdrawn').sort((a, b) => (rev[b.id]?.rating || 0) - (rev[a.id]?.rating || 0) || (a.submittedAt || 0) - (b.submittedAt || 0));
  const nm = {}; bids.forEach(b => { nm[b.eventName] = (nm[b.eventName] || 0) + 1; });
  const lab = b => (nm[b.eventName] > 1 ? [b.hostPark || b.submitter?.persona, b.theme].filter(Boolean).join(': ') || b.eventName : b.eventName);
  const dl = daysTo(c.deadline);
  const exps = bids.map(b => num(b.attendance?.expected));
  const gates = bids.map(b => (b.cost?.gatePre === '' || b.cost?.gatePre === undefined ? null : num(b.cost.gatePre))).filter(v => v !== null);
  const topE = exps.length ? Math.max(...exps) : null, topB = bids[exps.indexOf(topE)];
  const maxA = Math.max(1, ...bids.map(b => Math.max(num(b.attendance?.expected), num(b.site?.capacity))));
  const nets = bids.map(b => budget(b).net), maxN = Math.max(1, ...nets.map(Math.abs));
  const chip = x => <button key={x.id} className={`fchip ${x.id === c.id ? 'on' : ''}`} style={{ '--c': `var(--c-${x.category || 'special'})` }} onClick={() => pick(x.id)}><span className="dot" style={{ '--c': `var(--c-${x.category || 'special'})` }} />{x.title} <small>{deskBids(x).filter(b => st(b) !== 'withdrawn').length}</small></button>;
  const doAward = b => arm('award' + b.id, async () => {
    try { await award(b, everyBid, dec, c.pseudo ? null : c); toast(`Awarded to ${lab(b)}.`); } catch (e) { console.error(e); toast('Only kingdom officers can award bids.'); }
  });

  return (
    <div className="stack">
      <div>
        {real.length > 0 && <><div className="lbl" style={{ marginBottom: 6 }}>Calls for bids</div><div className="filters">{real.map(chip)}</div></>}
        {comm.length > 0 && <><div className="lbl" style={{ marginBottom: 6 }}>Community-hosted kingdom events</div><div className="filters">{comm.map(chip)}</div></>}
      </div>

      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-end' }}>
        <div><div className="row" style={{ gap: 8, alignItems: 'center' }}><CatMark k={c.category} /><CallPill s={s} /></div>
          <h2 style={{ fontSize: 'clamp(1.4rem,4vw,1.9rem)', marginTop: 6 }}>{c.title}</h2>
          <div className="muted">{c.kingdom}{c.pseudo ? ' · bids from parks, households, companies and guilds, no posted call' : `${c.term ? ` · ${c.term}` : ''} · window ${fRange(c.windowStart, c.windowEnd)}`}</div></div>
        <div className="row">{!c.pseudo && <Link className="btn ghost sm" to={`/bids/call/${c.id}`}>Open call page</Link>}
          {s === 'open' && <button className="btn ghost sm" onClick={async () => { try { await setCallStatus(c.id, 'review'); toast('Bidding closed.'); } catch (e) { toast('Only kingdom officers can do that.'); } }}>Close bidding</button>}</div>
      </div>

      <div className="tiles">
        <div className="tile"><div className="l">Bids received</div><div className="v">{bids.length}</div>{everyBid.length > bids.length && <small className="muted">{everyBid.length - bids.length} withdrawn</small>}</div>
        <div className="tile"><div className="l">{s === 'open' ? 'Bids due' : 'Bidding'}</div><div className="v">{s === 'open' && dl !== null ? (dl < 0 ? 'Closed' : `${dl} days`) : (c.pseudo ? (c.decided ? 'Decided' : 'No deadline') : CALL_ST[s])}</div><small className="muted">{fDate(c.deadline)}</small></div>
        <div className="tile"><div className="l">Largest draw</div><div className="v">{topE || '—'}</div><small className="muted">{topB ? lab(topB) : ''}</small></div>
        <div className="tile"><div className="l">Lowest gate</div><div className="v">{gates.length ? money(Math.min(...gates)) : '—'}</div><small className="muted">pre-registered</small></div>
      </div>

      {!bids.length ? <div className="panel empty"><h2>No bids yet</h2><p>Bids submitted for this event show up here as they arrive.</p></div> : <>
        <div className="grid2">
          <div className="panel"><h2 style={{ fontSize: '1.1rem', marginBottom: 6 }}>Expected attendance vs. site capacity</h2>
            <div className="legend"><span><i style={{ background: 'var(--c-midreign)' }} />Expected</span><span><i style={{ background: 'color-mix(in srgb,var(--c-midreign) 16%,transparent)' }} />Site capacity</span></div>
            <div className="hbars">{bids.map(b => { const e = num(b.attendance?.expected), cp = num(b.site?.capacity), base = cp || e; return (
              <div key={b.id} className="hbar" title={`${lab(b)}\nExpected: ${e || 'not given'}\nSite capacity: ${cp || 'not given'}${num(c.minCapacity) ? `\nCall minimum: ${c.minCapacity}` : ''}`}>
                <span className="nm">{lab(b)}</span>
                <span className="track" style={{ width: `${(base / maxA) * 100}%` }}><span className="fill" style={{ width: `${base ? Math.min(100, (e / base) * 100) : 0}%` }} /></span>
                <span className="val"><b>{e || '—'}</b> / {cp || '?'}{cp && e > cp ? <b className="warn"> over capacity</b> : null}</span>
              </div>); })}</div></div>
          <div className="panel"><h2 style={{ fontSize: '1.1rem', marginBottom: 6 }}>Projected net</h2>
            <div className="legend"><span><i style={{ background: 'var(--good)' }} />Surplus (+)</span><span><i style={{ background: 'var(--warn)' }} />Shortfall (−)</span></div>
            <div className="hbars">{bids.map((b, i) => { const n = nets[i], x = budget(b); return (
              <div key={b.id} className="hbar" title={`${lab(b)}\nProjected net: ${money(n)}${x.be ? `\nBreaks even at ${x.be} paid` : ''}`}>
                <span className="nm">{lab(b)}</span>
                <span className="dv"><span className={`fill ${n < 0 ? 'neg' : 'pos'}`} style={{ width: `${(Math.abs(n) / maxN) * 50}%` }} /></span>
                <span className="val"><b>{n < 0 ? '' : '+'}{money(n)}</b></span>
              </div>); })}</div></div>
        </div>

        <div className="panel"><h2 style={{ fontSize: '1.1rem' }}>Every bid at a glance</h2>
          <div className="scroll"><table className="mx"><thead><tr><th>Bid</th><th>Dates</th><th>Site</th><th>A&S</th><th>Tournament</th><th>Feast</th><th className="n">Battlegames</th><th className="n">Checklist</th><th>Your rating</th><th>Outcome</th><th /></tr></thead><tbody>
            {bids.map(b => { const ck = checks(b, c.pseudo ? null : c), ok = ck.filter(x => x[1]).length, bs = st(b); return (
              <tr key={b.id}>
                <td><Link to={`/bids/${b.id}`}><b>{lab(b)}</b></Link><small>{hostLabel(b)}{b.submitter?.persona ? ` · ${b.submitter.persona}` : ''}</small></td>
                <td>{fRange(b.start, b.end)}</td>
                <td>{b.site?.name || '—'}<small>{RESERVE[b.site?.reserve] || ''}</small></td>
                <td>{optName(AS_OPT, b.extras?.as)}</td><td>{optName(FIGHT_OPT, b.extras?.fight)}</td><td>{feastStyle(b)}</td>
                <td className="n">{bgSorted(b).length || '—'}</td>
                <td className="n" title={ck.map(x => `${x[1] ? '✓' : '—'} ${x[0]}`).join('\n')}>{ok}/{ck.length}</td>
                <td><Stars id={b.id} /></td>
                <td><BidPill s={bs} />{b.eventId && <small><Link to={`/crat/${b.eventId}`}>In planning</Link></small>}</td>
                <td>{s !== 'closed' && bs === 'submitted' && <button className={`btn accent sm ${armed === 'award' + b.id ? 'armed' : ''}`} onClick={() => doAward(b)}>{armed === 'award' + b.id ? 'Tap again' : 'Award'}</button>}</td>
              </tr>); })}
          </tbody></table></div>
          <p className="hint">Sorted by your rating. Ratings and private notes are visible only to kingdom officers. Hover a checklist score to see what’s missing.</p>
        </div>

        <div className="panel"><h2 style={{ fontSize: '1.1rem' }}>Battlegame line-ups</h2>
          <div className="bgcards">{bids.map(b => { const g = bgSorted(b); return (
            <div key={b.id} className="bgcard"><h3>{lab(b)}</h3>
              {g.length ? <ul className="bgl">{g.map((x, i) => <li key={i}><span className="t">{bgWhen(x)}</span><span>{x.theme || 'Battlegame'}</span></li>)}</ul> : <p className="muted" style={{ margin: 0, fontStyle: 'italic' }}>None listed.</p>}
            </div>); })}</div></div>
      </>}
    </div>
  );
}
