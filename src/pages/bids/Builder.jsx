import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useApp } from '../../App.jsx';
import {
  useBids, blankBid, normalize, budget, checks, num, money, fDate, fRange, callStatus,
  CATS, AMEN, RESERVE, BID_DIET, ACTS, AS_OPT, FIGHT_OPT, HOST_TYPES, KINGDOM_EVENTS, KINGDOMS, PARKS, BID_ROLES,
} from '../../lib/bids.js';
import { saveBid } from '../../lib/bidsApi.js';
import { catVar, NeedSignIn } from './common.jsx';

const REQUIRED = ['eventName', 'kingdom', 'start', 'end', 'site.name', 'attendance.expected', 'cost.gatePre', 'submitter.persona', 'crats.auto'];
const get = (o, p) => p.split('.').reduce((x, k) => x?.[k], o);

export default function Builder() {
  return <NeedSignIn><BuilderInner /></NeedSignIn>;
}

function BuilderInner() {
  const { id } = useParams(); const [qs] = useSearchParams(); const nav = useNavigate();
  const { user, toast } = useApp();
  const { calls, bids, callById, bidById, st, canEditBid, loading } = useBids();
  const [f, setF] = useState(null);
  const [bad, setBad] = useState(new Set());
  const [busy, setBusy] = useState(false);

  // Load once: an existing bid, a template copy, or a blank bid (optionally for a call).
  useEffect(() => {
    if (f || loading) return;
    if (id) { const b = bidById(id); if (b) setF(normalize(b)); return; }
    const from = qs.get('from') && bidById(qs.get('from'));
    if (from) {
      const n = normalize(from);
      ['id', 'owner', 'createdAt', 'submittedAt', 'updatedAt', 'eventId'].forEach(k => delete n[k]);
      setF({ ...n, status: 'draft', start: '', end: '', eventName: '', callId: '', site: { ...n.site, reserve: 'none' }, extras: { ...n.extras, battlegames: [] } });
      toast('Copied into a new draft. Pick a call, set dates and name your event.');
      return;
    }
    setF(blankBid(callById(qs.get('call'))));
  }, [id, loading, f, bidById, callById, qs, toast]);

  if (!f) return <p className="muted">{loading ? 'Loading…' : 'That bid wasn’t found.'}</p>;
  const existing = id && bidById(id);
  if (existing && !canEditBid(existing)) return <div className="panel empty"><h2>Not your bid</h2><p>Only the person who submitted a bid, or a kingdom officer, can edit it.</p><Link className="btn" to={`/bids/${id}`}>View the bid</Link></div>;
  if (existing && !['draft', 'submitted'].includes(st(existing))) return <div className="panel empty"><h2>This bid is decided</h2><p>Bids can’t be edited after the kingdom accepts or declines them.</p><Link className="btn" to={`/bids/${id}`}>View the bid</Link></div>;

  const set = (path, v) => setF(prev => {
    const n = structuredClone(prev); const ks = path.split('.'); let o = n;
    for (let i = 0; i < ks.length - 1; i++) o = o[ks[i]] ||= {};
    o[ks.at(-1)] = v; return n;
  });
  const toggle = (path, k) => { const a = get(f, path) || []; set(path, a.includes(k) ? a.filter(x => x !== k) : [...a, k]); };
  const call = f.callId && callById(f.callId);
  const openCalls = calls.filter(c => callStatus(c) === 'open');
  const chooseCall = cid => { const c = callById(cid); setF(p => ({ ...p, callId: cid, ...(c ? { category: c.category, kingdom: c.kingdom, eventName: p.eventName || c.title } : {}) })); };
  const x = budget(f); const ck = checks(f, call);
  const eventNames = [...new Set([...KINGDOM_EVENTS, ...bids.filter(b => b.category === 'special' && st(b) !== 'draft').map(b => b.eventName)].filter(Boolean))];

  async function save(submit) {
    const miss = new Set();
    if (submit) REQUIRED.forEach(p => { if (!String(get(f, p) ?? '').trim()) miss.add(p); });
    else if (!f.eventName.trim()) miss.add('eventName');
    setBad(miss);
    if (miss.size) { toast(submit ? 'Fill in the starred fields and name an Autocrat before submitting.' : 'Give the bid a name before saving.'); document.querySelector('.field.bad input')?.focus(); return; }
    if (submit && call && callStatus(call) !== 'open') { toast('Bidding on this call has closed. Save it as a draft or pick another call.'); return; }
    setBusy(true);
    try {
      const data = { ...f }; if (call) data.category = call.category;
      const bid = await saveBid(user, id || null, data, submit && f.status === 'draft');
      toast(submit ? `Bid submitted to ${f.kingdom || 'the kingdom'}.` : 'Saved.');
      nav(`/bids/${bid}`);
    } catch (e) { console.error(e); toast('Couldn’t save the bid. Check your connection and try again.'); }
    setBusy(false);
  }

  const F = (path, label, o = {}) => (
    <div className={`field ${bad.has(path) ? 'bad' : ''}`} style={o.w ? { flexBasis: o.w } : undefined}>
      <label htmlFor={`b-${path}`}>{label}{o.req ? ' *' : ''}</label>
      <div className={o.money ? 'money' : undefined}>
        <input id={`b-${path}`} type={o.type || 'text'} list={o.list} value={get(f, path) ?? ''} placeholder={o.ph || ''}
          {...(o.type === 'number' ? { min: 0, step: 'any', inputMode: 'decimal' } : {})}
          onChange={e => set(path, e.target.value)} />
      </div>
      {o.hint && <span className="hint">{o.hint}</span>}
    </div>);
  const TA = (path, label, ph, rows = 3) => (
    <div className="field"><label htmlFor={`b-${path}`}>{label}</label><textarea id={`b-${path}`} rows={rows} placeholder={ph} value={get(f, path) || ''} onChange={e => set(path, e.target.value)} /></div>);
  const CK = (path, list) => (
    <div className="checks">{list.map(([k, n]) => { const on = (get(f, path) || []).includes(k); return <label key={k} className={on ? 'on' : ''}><input type="checkbox" checked={on} onChange={() => toggle(path, k)} />{n}</label>; })}</div>);
  const RD = (name, list, cur, onPick) => (
    <div className="checks">{list.map(([k, n]) => <label key={k} className={cur === k ? 'on' : ''}><input type="radio" name={name} checked={cur === k} onChange={() => onPick(k)} />{n}</label>)}</div>);
  const bgs = f.extras.battlegames || [];
  const setBg = (i, k, v) => set('extras.battlegames', bgs.map((g, j) => (j === i ? { ...g, [k]: v } : g)));

  return (
    <>
      <div className="bgrid">
        <form className="stack" onSubmit={e => e.preventDefault()} noValidate>
          <datalist id="bid-kingdoms">{KINGDOMS.map(k => <option key={k} value={k} />)}</datalist>
          <datalist id="bid-parks">{PARKS.map(k => <option key={k} value={k} />)}</datalist>
          <datalist id="bid-names">{eventNames.map(k => <option key={k} value={k} />)}</datalist>

          <section className="panel form"><h2><span className="n">1</span>What you’re bidding on</h2>
            <div className="field"><label htmlFor="b-call">Call for bids</label>
              <select id="b-call" value={f.callId} onChange={e => chooseCall(e.target.value)}>
                <option value="">Independent bid (no posted call)</option>
                {openCalls.map(c => <option key={c.id} value={c.id}>{c.title} · {c.kingdom}</option>)}
                {call && callStatus(call) !== 'open' && <option value={call.id}>{call.title} (bidding closed)</option>}
              </select>
              {!call && <span className="hint">Hosting a kingdom-level event your group runs, like Feast of the Gods or Feast of Fools? Keep this on Independent bid and pick Special Event. It still goes to the monarchy for approval.</span>}
            </div>
            {call && <div className="note"><b>{call.title}</b> · {call.kingdom}<br />Window {fRange(call.windowStart, call.windowEnd)} · Bids due {fDate(call.deadline) || '—'}{call.minCapacity ? ` · Min. capacity ${call.minCapacity}` : ''}{call.requirements && <p className="story muted" style={{ margin: '6px 0 0' }}>{call.requirements}</p>}</div>}
            <div className="catpick">{CATS.map(k => (
              <label key={k.k} style={catVar(k.k)} className={f.category === k.k ? 'on' : ''}><input type="radio" name="bCat" disabled={!!call} checked={f.category === k.k} onChange={() => set('category', k.k)} /><span><b>{k.n}</b><small>{k.d}</small></span></label>))}</div>
            <div className="row">{F('eventName', 'Event name', { req: 1, ph: 'Feast of the Gods 2027', list: 'bid-names', w: 260 })}{F('kingdom', 'Kingdom', { req: 1, list: 'bid-kingdoms' })}</div>
            <div className="row">
              <div className="field" style={{ flex: '0 1 170px' }}><label htmlFor="b-ht">Hosted by a</label>
                <select id="b-ht" value={f.hostType || 'park'} onChange={e => set('hostType', e.target.value)}>{HOST_TYPES.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
              {F('hostPark', 'Hosting group', { list: 'bid-parks', ph: 'Siar Geata, House Ravenmoor…' })}
              {F('theme', 'Theme', { ph: 'A Night in the Ember Court' })}
            </div>
            {TA('themeDesc', 'Theme pitch', 'How the theme shows up: decorations, garb encouraged, quest storyline, feast styling')}
          </section>

          <section className="panel form"><h2><span className="n">2</span>Dates and site</h2>
            <div className="row">{F('start', 'Arrive / start', { type: 'date', req: 1 })}{F('end', 'Depart / end', { type: 'date', req: 1 })}</div>
            <div className="row">{F('site.name', 'Site name', { req: 1, ph: 'Pine Hollow Group Camp' })}{F('site.location', 'Location', { ph: 'City, State' })}{F('site.url', 'Site link', { ph: 'https://…' })}</div>
            <div className="row">
              <div className="field"><label htmlFor="b-res">Booking status</label><select id="b-res" value={f.site.reserve} onChange={e => set('site.reserve', e.target.value)}>{Object.entries(RESERVE).map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select></div>
              {F('site.capacity', 'Site capacity', { type: 'number', ph: '200' })}{F('site.acres', 'Acres / field space', { ph: '40 acres, 3 open fields' })}
            </div>
            <div><div className="lbl" style={{ marginBottom: 6 }}>Camping and amenities</div>{CK('site.amen', AMEN)}</div>
            {TA('site.notes', 'Site availability and notes', 'Which dates the site holds, backup weekends, parking, fire restrictions, quiet hours')}
          </section>

          <section className="panel form"><h2><span className="n">3</span>Crats</h2>
            <p className="hint" style={{ margin: 0 }}>Name who’ll fill each role. If the bid wins, these names carry into the event’s Crat Hall, where the Autocrat invites each crat by email.</p>
            <div className="cratgrid">{BID_ROLES.map(r => (
              <div key={r.k} className={`field ${r.k === 'auto' && bad.has('crats.auto') ? 'bad' : ''}`}>
                <label htmlFor={`b-crat-${r.k}`}>{r.n}{r.k === 'auto' ? ' *' : ''}</label>
                <input id={`b-crat-${r.k}`} value={f.crats?.[r.k] || ''} placeholder="Persona name" onChange={e => set(`crats.${r.k}`, e.target.value)} />
              </div>))}</div>
          </section>

          <section className="panel form"><h2><span className="n">4</span>Attendance and cost</h2>
            <div className="row">{F('attendance.expected', 'Expected attendance', { type: 'number', req: 1, ph: '150' })}{F('attendance.lastYear', 'Last time this event ran', { type: 'number', ph: '132', hint: 'Attendance, if known' })}</div>
            <div className="row">{F('cost.gatePre', 'Gate, pre-registered', { type: 'number', money: 1, req: 1, ph: '25' })}{F('cost.gateDoor', 'Gate, at the door', { type: 'number', money: 1, ph: '30' })}{F('cost.youth', 'Youth gate', { type: 'number', money: 1, ph: '10' })}</div>
            <div className="row">{F('cost.siteRental', 'Site rental', { type: 'number', money: 1, ph: '1800' })}{F('cost.insurance', 'Insurance', { type: 'number', money: 1, ph: '150' })}{F('cost.other', 'Other costs', { type: 'number', money: 1, ph: '300', hint: 'Porta-johns, ice, prizes, décor' })}</div>
          </section>

          <section className="panel form"><h2><span className="n">5</span>Event features <span className="muted sub">optional</span></h2>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="opt"><div className="lbl">Arts & Sciences</div>{RD('xas', AS_OPT, f.extras.as || 'none', k => set('extras.as', k))}</div>
              <div className="opt"><div className="lbl">Fighting tournament</div>{RD('xfight', FIGHT_OPT, f.extras.fight || 'none', k => set('extras.fight', k))}</div>
            </div>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <div className="opt"><div className="lbl">Feast</div>{RD('xfeast', [['yes', 'Yes'], ['no', 'No']], f.feast.offered ? 'yes' : 'no', k => set('feast.offered', k === 'yes'))}</div>
              <div className="opt"><div className="lbl">Potluck style</div>{RD('xpot', [['yes', 'Potluck'], ['no', 'Not potluck']], f.feast.potluck ? 'yes' : 'no', k => set('feast.potluck', k === 'yes'))}</div>
            </div>
            <div className="opt"><div className="lbl">Themed battlegames</div>
              <div className="stack" style={{ gap: 8 }}>{bgs.map((g, i) => (
                <div key={i} className="bgrow">
                  <input aria-label="Battlegame theme" value={g.theme || ''} placeholder="Siege of the Ember Keep" onChange={e => setBg(i, 'theme', e.target.value)} />
                  <input aria-label="Day" type="date" value={g.date || ''} min={f.start || undefined} max={f.end || undefined} onChange={e => setBg(i, 'date', e.target.value)} />
                  <input aria-label="Start time" type="time" value={g.start || ''} onChange={e => setBg(i, 'start', e.target.value)} />
                  <input aria-label="End time" type="time" value={g.end || ''} onChange={e => setBg(i, 'end', e.target.value)} />
                  <button type="button" className="xbtn" aria-label="Remove battlegame" onClick={() => set('extras.battlegames', bgs.filter((_, j) => j !== i))}>×</button>
                </div>))}</div>
              <div className="row" style={{ alignItems: 'center' }}><button type="button" className="btn ghost sm" onClick={() => set('extras.battlegames', [...bgs, { theme: '', date: f.start || '', start: '', end: '' }])}>Add a battlegame</button><span className="hint">Theme, day, start and end time. These become Wargames on the event schedule if the bid wins.</span></div>
            </div>
          </section>

          <section className="panel form"><h2><span className="n">6</span>Feast details</h2>
            {!f.feast.offered ? <p className="muted" style={{ margin: 0, fontStyle: 'italic' }}>No feast is set under Event features. Switch Feast to Yes to fill this in.</p> : <>
              <div className="row">{F('feast.meals', 'Meals served', { ph: 'Saturday feast, Sunday breakfast' })}{F('cost.feastCount', 'Expected feast seats', { type: 'number', ph: '90' })}{F('cost.feastFee', 'Feast price', { type: 'number', money: 1, ph: '12' })}{F('cost.feastCostPer', 'Food cost per seat', { type: 'number', money: 1, ph: '8' })}</div>
              {TA('feast.menu', 'Menu', 'Roast chicken, herbed potatoes, honey carrots, bread and butter, apple crumble')}
              <div><div className="lbl" style={{ marginBottom: 6 }}>Dietary accommodations</div>{CK('feast.diet', BID_DIET)}</div>
            </>}
          </section>

          <section className="panel form"><h2><span className="n">7</span>Program</h2>
            <div><div className="lbl" style={{ marginBottom: 6 }}>Planned activities</div>{CK('program.acts', ACTS)}</div>
            {TA('program.schedule', 'Schedule highlights', 'Fri: gate opens 4pm, night quest. Sat: court 10am, tournaments, feast 6pm. Sun: battlegames, site clean-up', 4)}
            {TA('notes', 'Anything else the kingdom should know', 'Volunteers lined up, past events run, contingency plans')}
          </section>

          <section className="panel form"><h2><span className="n">8</span>Submitted by</h2>
            <div className="row">{F('submitter.persona', 'Your persona', { req: 1, ph: 'Dame Isolde of Ashen Grove' })}{F('submitter.park', 'Your park', { list: 'bid-parks' })}{F('submitter.contact', 'Contact', { ph: 'Discord or ORK profile', hint: 'Shown on the bid. Leave out anything you don’t want public.' })}</div>
          </section>
        </form>

        <aside className="side">
          <div className="panel"><h2 style={{ fontSize: '1.15rem' }}>Budget at a glance</h2>
            <div className="ledger">
              <div className="l"><span>Gate ({x.exp || 0} × {money(num(f.cost.gatePre))})</span><span>{money(x.gate)}</span></div>
              <div className="l"><span>Feast seats sold</span><span>{money(x.feastIn)}</span></div>
              <div className="l"><span>Site, insurance, food, other</span><span className="warn">{money(-x.out)}</span></div>
              <div className="l tot"><span>Projected net</span><span className={x.net < 0 ? 'warn' : 'good'}>{money(x.net)}</span></div>
              <p className="hint" style={{ margin: '4px 0 0' }}>{x.be ? <>Breaks even at <b>{x.be}</b> paid attendees.</> : 'Add a gate price to see the break-even point.'} Uses the pre-registration gate for everyone.</p>
            </div></div>
          <div className="panel"><h2 style={{ fontSize: '1.15rem' }}>Checklist</h2>
            <div className="ledger">{ck.map(([l, ok]) => <div key={l} className="l"><span>{l}</span><b className={ok ? 'good' : 'warn'}>{ok ? '✓' : '—'}</b></div>)}</div></div>
        </aside>
      </div>
      <div className="savebar"><div className="in">
        <span className="muted who">{id ? (f.status === 'draft' ? 'Editing a draft' : 'Editing a submitted bid') : 'New bid'}{f.eventName ? <> · <b style={{ color: 'var(--ink)' }}>{f.eventName}</b></> : null}</span>
        <div className="row">
          <button className="btn ghost" onClick={() => nav(id ? `/bids/${id}` : '/bids/mine')}>Discard</button>
          <button className="btn ghost" disabled={busy} onClick={() => save(false)}>{f.status === 'draft' ? 'Save draft' : 'Save'}</button>
          {f.status === 'draft' && <button className="btn accent" disabled={busy} onClick={() => save(true)}>Submit bid</button>}
        </div></div></div>
    </>
  );
}
