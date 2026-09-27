import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { query, where, getDoc, doc } from 'firebase/firestore';
import { db, lower } from '../lib/firebase.js';
import { Header, useApp } from '../App.jsx';
import { useQuery, col, createEvent, assignCrat, sendInvite } from '../lib/data.js';
import { getBid, eventFromBid, linkBidToEvent, bidUrl, HERALD_URL, openCallForBids, callUrl } from '../lib/herald.js';
import { fmtRange } from '../lib/util.js';
import { ROLE, eventType, eventHost } from '../lib/constants.js';
import EventTypeFields from '../components/EventTypeFields.jsx';

export default function Dashboard() {
  const { user, toast } = useApp();
  const nav = useNavigate();
  const email = lower(user.email);
  const acc = useQuery(() => query(col('access'), where('staffEmails', 'array-contains', email)), [email]);
  const [events, setEvents] = useState({});
  const [f, setF] = useState(null);
  const [bid, setBid] = useState(null);      // { id, name, carry, accepted, autocratEmail, autocratName, invite }
  const [params, setParams] = useSearchParams();

  // Arriving from The Herald's Call with ?fromBid=<id>: prefill the new event from the winning bid.
  useEffect(() => {
    const id = params.get('fromBid'); if (!id) return;
    getBid(id).then(b => {
      if (!b) { toast('That bid wasn’t found in The Herald’s Call.'); return; }
      if (b.forkEventId || b.decision?.forkEventId) { nav(`/crat/${b.forkEventId || b.decision.forkEventId}`); return; }
      const m = eventFromBid(b);
      setF(m.form);
      setBid({ id, name: b.eventName, carry: m.extra, accepted: m.accepted, autocratEmail: m.autocratEmail, autocratName: m.autocratName,
        invite: !!m.autocratEmail && m.autocratEmail !== email });
    }).catch(err => { console.error(err); toast('Couldn’t load that bid.'); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    acc.rows.forEach(a => { if (!events[a.id]) getDoc(doc(db, 'events', a.id)).then(d => d.exists() && setEvents(x => ({ ...x, [a.id]: { id: d.id, ...d.data() } }))).catch(() => {}); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [acc.rows]);

  async function create(e) {
    e.preventDefault();
    if (f.bids) {
      if (!f.deadline) { toast('Pick the date bids are due.'); return; }
      try { const cid = await openCallForBids(user, f); location.assign(callUrl(cid)); }
      catch (err) { console.error(err); toast('Couldn’t post the call for bids.'); }
      return;
    }
    if (f.feast === null) { toast('Choose whether there will be a feast.'); return; }
    const { feast, bids: _b, deadline: _d, requirements: _r, ...rest } = f;
    try {
      const c = bid?.carry;
      const data = { ...rest, feast: { enabled: feast, price: '', capacity: '', menu: '', notes: '', ...(c ? c.feastDetails : {}) } };
      if (c) Object.assign(data, { location: c.location, address: c.address, theme: c.theme, notes: { auto: c.autoNotes }, fromBid: c.fromBid });
      const id = await createEvent(user, data);
      if (bid) {
        await linkBidToEvent(bid.id, id);
        if (bid.invite && bid.autocratEmail) {
          try {
            const a = await getDoc(doc(db, 'access', id));
            await assignCrat(id, a.data(), 'auto', bid.autocratName, bid.autocratEmail);
            await sendInvite(bid.autocratEmail).catch(() => {});
          } catch (err) { console.error(err); toast('Event created. Invite the bid’s Autocrat from the Crats tab.'); }
        }
        setParams({});
      }
      nav(`/crat/${id}`);
    } catch (err) { console.error(err); toast('Couldn’t create the event.'); }
  }
  const mine = acc.rows.map(a => ({ a, e: events[a.id] })).filter(x => x.e)
    .sort((x, y) => (y.e.startDate || '').localeCompare(x.e.startDate || ''));

  return (
    <div className="wrap">
      <Header />
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 14 }}>
        <div><div className="eyebrow">Crat Hall</div><h2 style={{ fontSize: '1.5rem' }}>Your events</h2></div>
        <div className="row"><a className="btn ghost" href={HERALD_URL}>Calls for bids</a>
        <button className="btn accent" onClick={() => { setBid(null); setF(f ? null : { name: '', kind: 'park', scope: 'park', kingdom: 'Westmarch', park: 'Siar Geata', startDate: '', endDate: '', feast: null, bids: false, deadline: '', requirements: '' }); }}>{f ? 'Cancel' : 'New event'}</button></div>
      </div>
      {f && (
        <form className="panel form" onSubmit={create} style={{ marginBottom: 18 }}>
          <h2>New event</h2>
          {bid && <div className={`note ${bid.accepted ? 'ok' : 'acc'}`}>
            Starting from the bid <b>{bid.name}</b> in <a href={bidUrl(bid.id)}>The Herald’s Call</a>. The theme, site, feast details, and the crats and program named in the bid are copied in.
            {!bid.accepted && <div style={{ marginTop: 4 }}><b>This bid hasn’t been marked accepted yet.</b></div>}
            {bid.autocratEmail && bid.autocratEmail !== email && <div className="checks" style={{ marginTop: 8 }}>
              <label className={bid.invite ? 'on' : ''}><input type="checkbox" checked={bid.invite} onChange={x => setBid({ ...bid, invite: x.target.checked })} />
                Make {bid.autocratName || 'the bidder'} ({bid.autocratEmail}) the Autocrat and email an invite</label></div>}
          </div>}
          <div className="row">
            <div className="field" style={{ flexBasis: 260 }}><label htmlFor="n">Event name</label><input id="n" required value={f.name} onChange={e => setF({ ...f, name: e.target.value })} placeholder="Fall EndReign" /></div>
            
          </div>
          {!bid && <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 6 }}>Open this event to bids?</legend>
            <div className="checks">
              <label className={!f.bids ? 'on' : ''}><input type="radio" name="bids" checked={!f.bids} onChange={() => setF({ ...f, bids: false })} />No, run it in FORK now</label>
              <label className={f.bids ? 'on' : ''}><input type="radio" name="bids" checked={!!f.bids} onChange={() => setF({ ...f, bids: true })} />Yes, take bids first</label>
            </div>
            <span className="hint">{f.bids
              ? 'This posts a call for bids in The Herald’s Call. Autocrats submit bids, you compare them on the Bid Desk, and the winning bid moves into FORK.'
              : 'The event goes straight into FORK with you as its Autocrat.'}</span>
          </fieldset>}
          <EventTypeFields f={f} set={p => setF({ ...f, ...p })} idp="new" />
          <div className="row">
            {f.bids && <div className="field"><label htmlFor="due">Bids due</label><input id="due" type="date" required value={f.deadline} onChange={e => setF({ ...f, deadline: e.target.value })} /></div>}
            <div className="field"><label htmlFor="s">{f.bids ? 'Event window opens' : 'Starts'}</label><input id="s" type="date" required value={f.startDate} onChange={e => setF({ ...f, startDate: e.target.value, endDate: f.endDate || e.target.value })} /></div>
            <div className="field"><label htmlFor="en">{f.bids ? 'Event window closes' : 'Ends'}</label><input id="en" type="date" value={f.endDate} min={f.startDate} onChange={e => setF({ ...f, endDate: e.target.value })} /></div>
          </div>
          {f.bids && <div className="field"><label htmlFor="req">What bids must cover</label>
            <textarea id="req" rows={3} value={f.requirements} onChange={e => setF({ ...f, requirements: e.target.value })} placeholder="Camping for 150+, a hall or pavilion for court, feast required" /></div>}
          {!f.bids && <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 6 }}>Will there be a feast?</legend>
            <div className="checks">
              <label className={f.feast === true ? 'on' : ''}><input type="radio" name="hasFeast" checked={f.feast === true} onChange={() => setF({ ...f, feast: true })} />Yes, there’s a feast</label>
              <label className={f.feast === false ? 'on' : ''}><input type="radio" name="hasFeast" checked={f.feast === false} onChange={() => setF({ ...f, feast: false })} />No feast</label>
            </div>
            <span className="hint">Players only see feast signup and dietary questions when there’s a feast. You can change this later.</span>
          </fieldset>}
          {!f.bids && <p className="hint">You’ll be the Autocrat. Theme, crats, schedule and feast come next.</p>}
          <div><button className="btn">{f.bids ? 'Post call for bids' : 'Create event'}</button></div>
        </form>
      )}
      {acc.loading ? <p className="muted">Loading…</p> : mine.length ? (
        <div className="cards">{mine.map(({ a, e }) => (
          <Link key={e.id} to={`/crat/${e.id}`} className="panel card" style={{ '--ev': e.theme?.accent }}>
            <div className="eyebrow">{eventType(e)} · {eventHost(e)}</div>
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
