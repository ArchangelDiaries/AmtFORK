import React, { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useApp } from '../../App.jsx';
import {
  useBids, budget, num, money, fRange, feastStyle, hostLabel, optName, bgSorted, bgWhen,
  AMEN, RESERVE, BID_DIET, ACTS, AS_OPT, FIGHT_OPT, BID_ST, BID_ROLES,
} from '../../lib/bids.js';
import { withdrawBid, deleteBid, decide, review, createEventFromBid } from '../../lib/bidsApi.js';
import { CatMark, BidPill, Stars } from './common.jsx';
import { useArm } from './CallPage.jsx';

export default function BidSheet() {
  const { id } = useParams(); const nav = useNavigate(); const { toast } = useApp();
  const { bidById, callById, st, dec, rev, officer, user, canEditBid, loading } = useBids();
  const [armed, arm] = useArm();
  const [busy, setBusy] = useState(false);
  const b = bidById(id);
  if (!b) return loading ? <p className="muted">Loading…</p> : <div className="panel empty"><h2>Bid not found</h2><p>It may be someone else’s draft, or it was deleted.</p><Link className="btn" to="/bids/archive">Bid archive</Link></div>;

  const s = st(b), c = callById(b.callId), x = budget(b), d = dec[b.id], am = b.site?.amen || [];
  const mine = !!user && b.owner === user.uid;
  const editable = canEditBid(b) && ['draft', 'submitted'].includes(s);
  const crats = BID_ROLES.filter(r => b.crats?.[r.k]);
  const bgs = bgSorted(b);

  async function startEvent() {
    setBusy(true);
    try { const eid = await createEventFromBid(user, b); toast('Event created. You’re its Autocrat.'); nav(`/crat/${eid}`); }
    catch (e) { console.error(e); toast('Couldn’t create the event. Sign in with a verified email and try again.'); setBusy(false); }
  }

  return (
    <div className="stack">
      <div className="row">
        {c ? <Link className="btn ghost sm" to={`/bids/call/${c.id}`}>← {c.title}</Link> : <Link className="btn ghost sm" to="/bids/archive">← Bid archive</Link>}
      </div>

      {s === 'accepted' && (
        <div className="note ok handoff">
          {b.eventId ? <>
            <div><b>This bid won.</b> Its event is set up in FORK.</div>
            <div className="row"><Link className="btn" to={`/e/${b.eventId}`}>Event page</Link>{(mine || officer) && <Link className="btn ghost" to={`/crat/${b.eventId}`}>Open in Crat Hall</Link>}</div>
          </> : (mine || officer) ? <>
            <div><b>This bid won.</b> Create the event to start planning. It carries over the dates, site, theme, feast, crat names and battlegame schedule. Whoever creates it becomes the event’s Autocrat and invites the other crats.</div>
            <div className="row"><button className="btn accent" disabled={busy} onClick={startEvent}>{busy ? 'Creating…' : 'Create the event in FORK'}</button></div>
          </> : <div><b>This bid won.</b> The event will appear on FORK once its Autocrat sets it up.</div>}
        </div>)}

      <div className="panel">
        <div className="sheet-head">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}><CatMark k={b.category} /><BidPill s={s} /></div>
          <h2>{b.eventName || 'Untitled bid'}</h2>
          {b.theme && <div className="theme">{b.theme}</div>}
          <div className="muted">{b.kingdom}{b.hostPark ? ` · hosted by ${hostLabel(b)}` : ''}{c ? <> · for <Link to={`/bids/call/${c.id}`}>{c.title}</Link></> : ' · independent bid'}{b.submittedAt ? ` · submitted ${new Date(b.submittedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}` : ''}</div>
          <div className="row">
            {editable && <Link className="btn ghost sm" to={`/bids/${b.id}/edit`}>Edit bid</Link>}
            {editable && s === 'submitted' && mine && <button className={`btn ghost sm ${armed === 'wd' ? 'armed' : ''}`} onClick={() => arm('wd', async () => { try { await withdrawBid(b.id); toast('Bid withdrawn.'); } catch (e) { toast('Couldn’t withdraw the bid.'); } })}>{armed === 'wd' ? 'Tap again to withdraw' : 'Withdraw'}</button>}
            {s === 'draft' && mine && <button className={`btn danger sm ${armed === 'del' ? 'armed' : ''}`} onClick={() => arm('del', async () => { try { await deleteBid(b.id); toast('Draft deleted.'); nav('/bids/mine'); } catch (e) { toast('Couldn’t delete the draft.'); } })}>{armed === 'del' ? 'Tap again to delete' : 'Delete draft'}</button>}
            {user && <Link className="btn ghost sm" to={`/bids/new?from=${b.id}`}>Use as a template</Link>}
          </div>
        </div>
        {b.themeDesc && <p className="story" style={{ marginBottom: 16 }}>{b.themeDesc}</p>}

        <div className="sgrid">
          <section><h3>Dates and site</h3>
            <dl className="meta"><dt>Dates</dt><dd>{fRange(b.start, b.end)}</dd>
              <dt>Site</dt><dd>{b.site?.name || '—'}{b.site?.location && <><br /><span className="muted">{b.site.location}</span></>}{/^https?:\/\//.test(b.site?.url || '') && <><br /><a href={b.site.url} target="_blank" rel="noopener noreferrer">Site website</a></>}</dd>
              <dt>Booking</dt><dd>{RESERVE[b.site?.reserve] || '—'}</dd>
              <dt>Capacity</dt><dd className="num">{b.site?.capacity || '—'}</dd>
              {b.site?.acres && <><dt>Space</dt><dd>{b.site.acres}</dd></>}</dl>
            <div className="amen">{AMEN.map(([k, n]) => <span key={k} className={am.includes(k) ? 'y' : 'n'}>{n}</span>)}</div>
            {b.site?.notes && <p className="story muted" style={{ marginTop: 10 }}>{b.site.notes}</p>}
          </section>
          <section><h3>Crats</h3>
            {crats.length ? <dl className="meta">{crats.map(r => <React.Fragment key={r.k}><dt>{r.n}</dt><dd>{b.crats[r.k]}</dd></React.Fragment>)}</dl> : <p className="muted">None listed.</p>}
            <h3 style={{ marginTop: 16 }}>Submitted by</h3>
            <p style={{ margin: 0 }}>{b.submitter?.persona || '—'}{b.submitter?.park ? ` · ${b.submitter.park}` : ''}{b.submitter?.contact && <><br /><span className="muted" style={{ userSelect: 'all' }}>{b.submitter.contact}</span></>}</p>
          </section>
          <section><h3>Attendance and budget</h3>
            <dl className="meta">
              <dt>Expected</dt><dd className="num">{num(b.attendance?.expected) || '—'}{b.attendance?.lastYear ? <span className="muted"> (last run: {b.attendance.lastYear})</span> : null}</dd>
              <dt>Gate</dt><dd className="num">{b.cost?.gatePre !== '' && b.cost?.gatePre !== undefined ? `${money(num(b.cost.gatePre))} pre-reg` : '—'}{num(b.cost?.gateDoor) ? ` · ${money(num(b.cost.gateDoor))} door` : ''}{num(b.cost?.youth) ? ` · ${money(num(b.cost.youth))} youth` : ''}</dd>
              <dt>Costs</dt><dd className="num">Site {money(num(b.cost?.siteRental))} · Insurance {money(num(b.cost?.insurance))} · Other {money(num(b.cost?.other))}</dd>
              <dt>Net</dt><dd><b className={`num ${x.net < 0 ? 'warn' : 'good'}`}>{money(x.net)}</b>{x.be ? <span className="muted"> · breaks even at {x.be}</span> : null}</dd>
            </dl>
          </section>
          <section><h3>Event features</h3>
            <dl className="meta"><dt>A&S</dt><dd>{optName(AS_OPT, b.extras?.as)}</dd><dt>Tournament</dt><dd>{optName(FIGHT_OPT, b.extras?.fight)}</dd><dt>Feast</dt><dd>{feastStyle(b)}</dd></dl>
            {bgs.length ? <><h3 style={{ marginTop: 14, fontSize: '1rem' }}>Themed battlegames</h3>
              <ul className="bgl">{bgs.map((g, i) => <li key={i}><span className="t">{bgWhen(g)}</span><span>{g.theme || 'Battlegame'}</span></li>)}</ul></>
              : <p className="muted" style={{ marginTop: 8, fontStyle: 'italic' }}>No themed battlegames listed.</p>}
          </section>
          <section><h3>Feast</h3>
            {b.feast?.offered ? <>
              <dl className="meta"><dt>Style</dt><dd>{feastStyle(b)}</dd><dt>Meals</dt><dd>{b.feast.meals || '—'}</dd><dt>Price</dt><dd className="num">{num(b.cost?.feastFee) ? money(num(b.cost.feastFee)) : 'Included with gate'}</dd><dt>Seats</dt><dd className="num">{num(b.cost?.feastCount) || '—'}</dd>
                {(b.feast.diet || []).length > 0 && <><dt>Dietary</dt><dd>{BID_DIET.filter(x2 => b.feast.diet.includes(x2[0])).map(x2 => x2[1]).join(', ')}</dd></>}</dl>
              {b.feast.menu && <p className="story" style={{ marginTop: 8 }}>{b.feast.menu}</p>}
            </> : <p className="muted" style={{ fontStyle: 'italic' }}>No feast in this bid.</p>}
          </section>
          <section><h3>Program</h3>
            {(b.program?.acts || []).length > 0 && <div className="amen">{ACTS.filter(a => b.program.acts.includes(a[0])).map(a => <span key={a[0]} className="y">{a[1]}</span>)}</div>}
            {b.program?.schedule && <p className="story" style={{ marginTop: 10 }}>{b.program.schedule}</p>}
            {!(b.program?.acts || []).length && !b.program?.schedule && <p className="muted" style={{ fontStyle: 'italic' }}>No program listed.</p>}
          </section>
          {b.notes && <section><h3>Notes to the kingdom</h3><p className="story">{b.notes}</p></section>}
        </div>
      </div>

      {(d?.note || officer) && s !== 'draft' && <Decision b={b} s={s} d={d} officer={officer} />}
      {officer && s !== 'draft' && <Review b={b} prev={rev[b.id]} />}
    </div>
  );
}

function Decision({ b, s, d, officer }) {
  const { toast } = useApp();
  const [st, setSt] = useState(['accepted', 'declined'].includes(s) ? s : 'submitted');
  const [note, setNote] = useState(d?.note || '');
  return (
    <div className="panel decision"><h2>Kingdom decision</h2>
      {d?.note && <p className="story">{d.note}</p>}
      {officer && s !== 'withdrawn' && (
        <form className="row" onSubmit={async e => { e.preventDefault(); try { await decide(b.id, st, note.trim()); toast('Decision recorded.'); } catch (err) { toast('Only kingdom officers can record decisions.'); } }}>
          <div className="field" style={{ flex: '0 1 180px' }}><label htmlFor="decSt">Outcome</label>
            <select id="decSt" value={st} onChange={e => setSt(e.target.value)}>{['submitted', 'accepted', 'declined'].map(k => <option key={k} value={k}>{k === 'submitted' ? 'Under review' : BID_ST[k]}</option>)}</select></div>
          <div className="field" style={{ flexBasis: 320 }}><label htmlFor="decNote">Note to the bidder</label><input id="decNote" value={note} onChange={e => setNote(e.target.value)} placeholder="Voted 6–2 at Althing. Strong site, feast budget tight." /></div>
          <button className="btn">Record decision</button>
        </form>)}
    </div>
  );
}

function Review({ b, prev }) {
  const { toast } = useApp();
  const [note, setNote] = useState(prev?.note || '');
  return (
    <div className="panel"><h2>Monarch’s review <span className="muted sub">private to officers</span></h2>
      <div className="row" style={{ alignItems: 'center', marginBottom: 10 }}><span className="lbl">Rating</span><Stars id={b.id} /></div>
      <form className="row" onSubmit={async e => { e.preventDefault(); try { await review(b.id, { note: note.trim() }, prev); toast('Notes saved.'); } catch (err) { toast('Only kingdom officers can save review notes.'); } }}>
        <div className="field" style={{ flexBasis: 360 }}><label htmlFor="revNote">Private notes</label><input id="revNote" value={note} onChange={e => setNote(e.target.value)} placeholder="Ask about a backup site. Love the ember quest." /></div>
        <button className="btn ghost">Save notes</button>
      </form>
    </div>
  );
}
