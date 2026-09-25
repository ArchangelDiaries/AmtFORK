import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { query, where, getDoc, doc } from 'firebase/firestore';
import { db, lower } from '../lib/firebase.js';
import { Header, useApp } from '../App.jsx';
import { useQuery, col, createEvent } from '../lib/data.js';
import { fmtRange } from '../lib/util.js';
import { ROLE, EVENT_KINDS, PARKS } from '../lib/constants.js';

export default function Dashboard() {
  const { user, toast } = useApp();
  const nav = useNavigate();
  const email = lower(user.email);
  const acc = useQuery(() => query(col('access'), where('staffEmails', 'array-contains', email)), [email]);
  const [events, setEvents] = useState({});
  const [f, setF] = useState(null);

  useEffect(() => {
    acc.rows.forEach(a => { if (!events[a.id]) getDoc(doc(db, 'events', a.id)).then(d => d.exists() && setEvents(x => ({ ...x, [a.id]: { id: d.id, ...d.data() } }))).catch(() => {}); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acc.rows]);

  async function create(e) {
    e.preventDefault();
    if (f.feast === null) { toast('Choose whether there will be a feast.'); return; }
    const { feast, ...rest } = f;
    try { const id = await createEvent(user, { ...rest, feast: { enabled: feast, price: '', capacity: '', menu: '', notes: '' } }); nav(`/crat/${id}`); } catch (err) { console.error(err); toast('Couldn’t create the event.'); }
  }
  const mine = acc.rows.map(a => ({ a, e: events[a.id] })).filter(x => x.e)
    .sort((x, y) => (y.e.startDate || '').localeCompare(x.e.startDate || ''));

  return (
    <div className="wrap">
      <Header />
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <div><div className="eyebrow">Crat Hall</div><h2 style={{ fontSize: '1.5rem' }}>Your events</h2></div>
        <button className="btn accent" onClick={() => setF(f ? null : { name: '', kind: 'park', park: 'Siar Geata', startDate: '', endDate: '', feast: null })}>{f ? 'Cancel' : 'New event'}</button>
      </div>
      {f && (
        <form className="panel form" onSubmit={create} style={{ marginBottom: 18 }}>
          <h2>New event</h2>
          <div className="row">
            <div className="field" style={{ flexBasis: 260 }}><label htmlFor="n">Event name</label><input id="n" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Fall EndReign" /></div>
            <div className="field"><label htmlFor="k">Type</label><select id="k" value={f.kind} onChange={e => setF({ ...f, kind: e.target.value })}>{EVENT_KINDS.map(k => <option key={k.k} value={k.k}>{k.n}</option>)}</select></div>
            <div className="field"><label htmlFor="p">Hosting park</label><input id="p" list="parks" value={f.park} onChange={e => setF({ ...f, park: e.target.value })} /></div>
          </div>
          <div className="row">
            <div className="field"><label htmlFor="s">Starts</label><input id="s" type="date" required value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value, endDate: f.endDate || e.target.value })} /></div>
            <div className="field"><label htmlFor="en">Ends</label><input id="en" type="date" value={f.endDate} min={f.startDate} onChange={e => setF({ ...f, endDate: e.target.value })} /></div>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 6 }}>Will there be a feast?</legend>
            <div className="checks">
              <label className={f.feast === true ? 'on' : ''}><input type="radio" name="hasFeast" checked={f.feast === true} onChange={() => setF({ ...f, feast: true })} />Yes, there’s a feast</label>
              <label className={f.feast === false ? 'on' : ''}><input type="radio" name="hasFeast" checked={f.feast === false} onChange={() => setF({ ...f, feast: false })} />No feast</label>
            </div>
            <span className="hint">Players only see feast signup and dietary questions when there’s a feast. You can change this later.</span>
          </fieldset>
          <p className="hint">You’ll be the Autocrat. Theme, crats, schedule and feast come next.</p>
          <div><button className="btn">Create event</button></div>
          <datalist id="parks">{PARKS.map(p => <option key={p} value={p} />)}</datalist>
        </form>
      )}
      {acc.loading ? <p className="muted">Loading…</p> : mine.length ? (
        <div className="cards">{mine.map(({ a, e }) => (
          <Link key={e.id} to={`/crat/${e.id}`} className="panel card" style={{ '--ev': e.theme?.accent }}>
            <div className="eyebrow">{EVENT_KINDS.find(k => k.k === e.kind)?.n} · {e.park}</div>
            <h3>{e.name}</h3>
            <div className="muted">{fmtRange(e.startDate, e.endDate)}</div>
            <div className="checks">{(a.roles?.[email] || []).map(r => <span key={r} className="pill accent">{ROLE[r]?.n}</span>)}
              <span className={`pill ${e.published ? 'good' : ''}`}>{e.published ? 'Published' : 'Draft'}</span></div>
          </Link>))}
        </div>
      ) : !f && (
        <div className="panel empty"><h2>No events yet</h2>
          <p>Start a new event as its Autocrat, or ask your Autocrat to invite <b>{email}</b> as a crat. Invited events appear here automatically.</p></div>
      )}
    </div>
  );
}
