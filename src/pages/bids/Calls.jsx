import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../../App.jsx';
import { useBids, CATS, CALL_ST, KINGDOMS, callStatus, daysTo, fDate, fRange } from '../../lib/bids.js';
import { saveCall } from '../../lib/bidsApi.js';
import { CatMark, CallPill, catVar } from './common.jsx';

const ORD = { open: 0, review: 1, awarded: 2, closed: 3 };

export default function Calls() {
  const { calls, officer, bidsFor, bidById, loading } = useBids();
  const [cat, setCat] = useState('all');
  const [edit, setEdit] = useState(undefined); // undefined = closed, null = new, id = editing
  const list = calls.filter(c => cat === 'all' || c.category === cat).sort((a, b) =>
    ORD[callStatus(a)] - ORD[callStatus(b)] || (callStatus(a) === 'open' ? (a.deadline || '').localeCompare(b.deadline || '') : (b.windowStart || '').localeCompare(a.windowStart || '')));
  const count = k => calls.filter(c => k === 'all' || c.category === k).length;

  return (
    <div className="stack">
      <div className="panel host-cta">
        <div><b>Hosting a kingdom-level event?</b> <span className="muted">Parks, households, companies and guilds bid to run events like Feast of the Gods, Feast of Fools and Feast of the Dead. No posted call is needed. Your bid goes to the monarchy for approval, and once it’s awarded it becomes a FORK event you run from the Crat Hall.</span></div>
        <Link className="btn ghost" to="/bids/new">Start an event bid</Link>
      </div>

      {officer && <div className="row" style={{ justifyContent: 'space-between' }}>
        <p className="muted" style={{ margin: 0 }}>Post the events your kingdom needs hosted. Players build bids against each call.</p>
        <button className="btn" onClick={() => setEdit(edit === null ? undefined : null)}>{edit === null ? 'Cancel' : 'Post a call for bids'}</button>
      </div>}
      {officer && edit !== undefined && <CallForm id={edit} onDone={() => setEdit(undefined)} />}

      <div className="filters">
        <button className={`fchip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>All <small>{count('all')}</small></button>
        {CATS.map(c => <button key={c.k} className={`fchip ${cat === c.k ? 'on' : ''}`} style={{ '--c': `var(--c-${c.k})` }} onClick={() => setCat(c.k)}><span className="dot" style={{ '--c': `var(--c-${c.k})` }} />{c.n} <small>{count(c.k)}</small></button>)}
      </div>

      {loading ? <p className="muted">Loading…</p> : list.length ? (
        <div className="cards">{list.map(c => {
          const st = callStatus(c), n = bidsFor(c.id).length, dl = daysTo(c.deadline), aw = c.awardedBid && bidById(c.awardedBid);
          return (
            <article key={c.id} className="panel ccard" style={catVar(c.category)}>
              <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}><CatMark k={c.category} /><CallPill s={st} /></div>
              <h3>{c.title}</h3>
              <dl className="meta">
                <dt>Kingdom</dt><dd>{c.kingdom}{c.term ? ` · ${c.term}` : ''}</dd>
                <dt>Event window</dt><dd>{fRange(c.windowStart, c.windowEnd)}</dd>
                <dt>Bids due</dt><dd>{st === 'open' && c.deadline ? (dl < 0 ? <b className="warn">Deadline passed</b> : <><b className={dl <= 14 ? 'warn' : ''}>{dl === 0 ? 'Due today' : `${dl} day${dl === 1 ? '' : 's'} left`}</b> · {fDate(c.deadline)}</>) : (fDate(c.deadline) || '—')}</dd>
                <dt>Bids in</dt><dd className="num">{n}</dd>
                {aw && <><dt>Awarded</dt><dd>{aw.eventName}</dd></>}
              </dl>
              <div className="row">
                <Link className="btn ghost sm" to={`/bids/call/${c.id}`}>View call{n ? ' and compare bids' : ''}</Link>
                {st === 'open' && <Link className="btn accent sm" to={`/bids/new?call=${c.id}`}>Build a bid</Link>}
              </div>
            </article>);
        })}</div>
      ) : (
        <div className="panel empty"><h2>No calls for bids yet</h2>
          <p>{officer ? 'Post the first one above.' : 'When the kingdom posts an event it needs hosted, it shows up here.'} You can still start a bid for a community-hosted event any time.</p></div>
      )}
    </div>
  );
}

export function CallForm({ id, onDone }) {
  const { callById } = useBids(); const { toast } = useApp();
  const c = id ? callById(id) || {} : {};
  const [f, setF] = useState({ category: c.category || 'midreign', title: c.title || '', kingdom: c.kingdom || 'Westmarch', term: c.term || '', windowStart: c.windowStart || '', windowEnd: c.windowEnd || '', deadline: c.deadline || '', minCapacity: c.minCapacity || '', requirements: c.requirements || '', status: c.status || 'open' });
  const set = p => setF(x => ({ ...x, ...p }));
  async function submit(e) {
    e.preventDefault();
    if (!f.title || !f.kingdom || !f.deadline) { toast('A call needs an event name, kingdom and bid deadline.'); return; }
    const data = { ...f }; if (!id) delete data.status;
    try { await saveCall(id, data); toast(id ? 'Call updated.' : 'Call posted. Players can bid on it now.'); onDone(); }
    catch (err) { console.error(err); toast('Only kingdom officers can post calls for bids.'); }
  }
  return (
    <form className="panel form" onSubmit={submit}>
      <h2>{id ? 'Edit call for bids' : 'New call for bids'}</h2>
      <div className="catpick">{CATS.map(k => (
        <label key={k.k} style={catVar(k.k)} className={f.category === k.k ? 'on' : ''}><input type="radio" name="cCat" checked={f.category === k.k} onChange={() => set({ category: k.k })} /><span><b>{k.n}</b><small>{k.d}</small></span></label>))}</div>
      <div className="row">
        <div className="field" style={{ flexBasis: 280 }}><label htmlFor="cT">Event</label><input id="cT" required value={f.title} onChange={e => set({ title: e.target.value })} placeholder="Spring Coronation 2027" /></div>
        <div className="field"><label htmlFor="cK">Kingdom</label><input id="cK" list="bid-kingdoms" required value={f.kingdom} onChange={e => set({ kingdom: e.target.value })} /></div>
        <div className="field"><label htmlFor="cR">Reign</label><input id="cR" value={f.term} onChange={e => set({ term: e.target.value })} placeholder="Spring 2027 reign" /></div>
      </div>
      <div className="row">
        <div className="field"><label htmlFor="cWs">Event window opens</label><input id="cWs" type="date" value={f.windowStart} onChange={e => set({ windowStart: e.target.value })} /></div>
        <div className="field"><label htmlFor="cWe">Event window closes</label><input id="cWe" type="date" min={f.windowStart} value={f.windowEnd} onChange={e => set({ windowEnd: e.target.value })} /></div>
        <div className="field"><label htmlFor="cD">Bids due</label><input id="cD" type="date" required value={f.deadline} onChange={e => set({ deadline: e.target.value })} /></div>
        <div className="field" style={{ flex: '0 1 140px' }}><label htmlFor="cM">Min. capacity</label><input id="cM" type="number" min="0" value={f.minCapacity} onChange={e => set({ minCapacity: e.target.value })} /></div>
      </div>
      <div className="field"><label htmlFor="cQ">What bids must cover</label><textarea id="cQ" rows={4} value={f.requirements} onChange={e => set({ requirements: e.target.value })} placeholder="Camping for 150+, a hall or pavilion for court, feast required, bids presented at Althing" /></div>
      {id && <div className="field" style={{ flex: '0 1 220px' }}><label htmlFor="cS">Status</label><select id="cS" value={f.status} onChange={e => set({ status: e.target.value })}>{['open', 'review', 'awarded', 'closed'].map(k => <option key={k} value={k}>{CALL_ST[k]}</option>)}</select></div>}
      <datalist id="bid-kingdoms">{KINGDOMS.map(k => <option key={k} value={k} />)}</datalist>
      <div className="row"><button className="btn">{id ? 'Save changes' : 'Post call'}</button><button type="button" className="btn ghost" onClick={onDone}>Cancel</button></div>
    </form>
  );
}
