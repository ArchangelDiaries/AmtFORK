import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header, useApp } from '../App.jsx';
import { useDoc, useQuery, col, register, orkLookup } from '../lib/data.js';
import { fmtRange, fmtDay, eventDays } from '../lib/util.js';
import { EVENT_KINDS, ROLES, PARKS, parseOrkId, ORK_PLAYER_URL } from '../lib/constants.js';
import Schedule from '../components/Schedule.jsx';
import FeastPicker, { emptyFeast } from '../components/FeastPicker.jsx';
import { DIV, fmRequestSignup } from '../lib/fieldMarshal.js';

export default function PublicEvent() {
  const { id } = useParams();
  const ev = useDoc(`events/${id}`);
  const sched = useQuery(() => col('events', id, 'schedule'), [id]);
  const e = ev.data;

  if (ev.loading) return <div className="wrap"><Header /><p className="muted">Loading…</p></div>;
  if (!e) return <div className="wrap"><Header /><div className="panel empty"><h2>Event not found</h2><p>It may still be a draft, or the link is wrong.</p><Link className="btn" to="/">All events</Link></div></div>;

  const accent = e.theme?.accent || undefined;
  const crats = ROLES.filter(r => e.crats?.[r.k]?.name);
  return (
    <div style={accent ? { '--accent': accent, '--accent-soft': `color-mix(in srgb, ${accent} 16%, var(--panel))` } : undefined}>
      <div className="wrap">
        <Header />
        {!e.published && <div className="note acc" style={{ marginBottom: 14 }}>Draft preview. Only crats can see this page until the Autocrat publishes it.</div>}
        <section className="hero">
          <div className="eyebrow">{EVENT_KINDS.find(k => k.k === e.kind)?.n} · hosted by {e.park}</div>
          <h1>{e.name}</h1>
          {e.theme?.title && <div className="theme">{e.theme.title}</div>}
          {e.theme?.tagline && <p style={{ margin: '6px 0 0', fontStyle: 'italic' }}>{e.theme.tagline}</p>}
          <div className="facts">
            <span><b>{fmtRange(e.startDate, e.endDate)}</b></span>
            {e.location && <span>{e.location}{e.address ? `, ${e.address}` : ''}</span>}
            {e.feast?.enabled && <span>Feast{e.feast.price ? ` · ${e.feast.price}` : ''}</span>}
          </div>
          <div className="row" style={{ marginTop: 16 }}>
            {e.registrationOpen ? <a className="btn accent" href="#register">Register</a> : <span className="pill">Registration closed</span>}
            <a className="btn ghost" href="#schedule">Schedule</a>
            {e.fieldMarshalUrl && <a className="btn ghost" href={e.fieldMarshalUrl} target="_blank" rel="noopener">Warmaster brackets</a>}
          </div>
        </section>

        <div className="stack">
          {(e.theme?.story || crats.length > 0) && (
            <div className="grid2">
              {e.theme?.story && <div className="panel"><h2>The tale</h2><p className="story">{e.theme.story}</p></div>}
              {crats.length > 0 && <div className="panel"><h2>Your crats</h2>
                <table><tbody>{crats.map(r => <tr key={r.k}><td className="muted">{r.n}</td><td><b>{e.crats[r.k].name}</b></td></tr>)}</tbody></table></div>}
            </div>)}

          <div className="panel" id="schedule"><h2>Schedule</h2>
            <Schedule items={sched.rows} empty="The crats are still building the schedule. Check back soon." /></div>

          {e.feast?.enabled && (e.feast.menu || e.feast.notes) && (
            <div className="panel"><h2>Feast</h2>
              {e.feast.menu && <p className="story">{e.feast.menu}</p>}
              {e.feast.notes && <p className="muted story">{e.feast.notes}</p>}</div>)}

          {e.registrationOpen && <RegisterForm id={id} e={e} />}
        </div>
        <p className="foot">FORK · Feast, Organization &amp; Registration Keeper</p>
      </div>
    </div>
  );
}

function RegisterForm({ id, e }) {
  const { toast } = useApp();
  const days = eventDays(e);
  const [f, setF] = useState({ orkRaw: '', persona: '', email: '', park: '', kingdom: '', days, notes: '', eating: e.feast?.enabled ? 'yes' : 'no' });
  const [feast, setFeast] = useState(emptyFeast());
  const [tDivs, setTDivs] = useState([]);
  const wm = e.warmaster?.fmTid && e.warmaster.signupsOpen ? e.warmaster : null;
  const [ork, setOrk] = useState(null);      // { state, msg, feastFromOrk }
  const [done, setDone] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = p => setF(x => ({ ...x, ...p }));

  async function lookup() {
    const oid = parseOrkId(f.orkRaw);
    if (!oid) { setOrk({ state: 'bad', msg: 'Paste your ORK profile link or player number.' }); return; }
    setOrk({ state: 'busy', msg: 'Checking the ORK…' });
    try {
      const p = await orkLookup(oid);
      set({ persona: p.persona || f.persona, park: p.park || f.park, kingdom: p.kingdom || f.kingdom });
      if (p.feast?.visible) {
        setFeast({ ...emptyFeast(), noRestrictions: !!p.feast.noRestrictions, diets: p.feast.diets || [], restrictions: p.feast.restrictions || [], allergens: p.feast.allergens || {}, notes: feast.notes });
        setOrk({ state: 'ok', oid, feastFromOrk: true, msg: `Found ${p.persona}. Feast preferences filled in from your ORK profile. Check them below.` });
      } else {
        setOrk({ state: 'ok', oid, feastFromOrk: false, msg: `Found ${p.persona}. Your ORK feast preferences are private, so fill them in below.` });
      }
    } catch (err) { setOrk({ state: 'bad', msg: `${err.message} You can still register by hand.` }); }
  }

  async function submit(ev) {
    ev.preventDefault();
    if (!f.persona.trim()) { toast('Add your persona name.'); return; }
    setBusy(true);
    try {
      const eating = e.feast?.enabled && f.eating === 'yes';
      const reg = {
        persona: f.persona.trim().slice(0, 120), email: f.email.trim().slice(0, 200), park: f.park.trim().slice(0, 120),
        kingdom: f.kingdom.trim().slice(0, 120), orkId: ork?.oid || parseOrkId(f.orkRaw) || '', days: f.days, notes: f.notes.slice(0, 1000),
      };
      const fight = wm ? tDivs.filter(k => wm.divs.includes(k)) : [];
      let fmRequestId = '';
      if (fight.length) {
        try { fmRequestId = await fmRequestSignup({ tid: wm.fmTid, name: reg.persona, park: reg.park, orkId: reg.orkId, divs: fight }); }
        catch (err) { console.error('Field Marshal request failed', err); }
      }
      reg.tourneyDivs = fight; reg.fmRequestId = fmRequestId;
      const fp = eating ? { ...feast, notes: feast.notes.slice(0, 500), source: ork?.feastFromOrk ? 'ork' : 'form', orkId: reg.orkId } : null;
      await register(id, reg, fp);
      setDone({ persona: reg.persona, eating, fight: fight.length ? (fmRequestId ? 'sent' : 'failed') : null, wmName: wm?.name });
    } catch (err) { console.error(err); toast('Couldn’t save your registration. Try again.'); }
    setBusy(false);
  }

  if (done) return (
    <div className="panel" id="register"><h2>Huzzah, {done.persona}!</h2>
      <p>You’re registered for <b>{e.name}</b>{done.eating ? ' and on the feast list' : ''}. Show your persona name at the gate.</p>
      {done.fight === 'sent' && <p>Your <b>{done.wmName}</b> signup is in. A marshal will confirm you on the lists.</p>}
      {done.fight === 'failed' && <div className="note bad">You’re registered for the event, but your tournament signup didn’t go through. Let the Warcrat know which divisions you want.</div>}
      <button className="btn ghost" onClick={() => { setDone(null); setOrk(null); setFeast(emptyFeast()); setTDivs([]); set({ orkRaw: '', persona: '', email: '', notes: '' }); }}>Register someone else</button></div>);

  return (
    <form className="panel form" id="register" onSubmit={submit}>
      <h2>Register</h2>
      <div className="row">
        <div className="field" style={{ flexBasis: 320 }}><label htmlFor="ork">ORK profile link or player number</label>
          <input id="ork" inputMode="url" autoComplete="off" value={f.orkRaw} onChange={x => set({ orkRaw: x.target.value })} placeholder="ork.amtgard.com/…/Player/profile/23614" /></div>
        <button type="button" className="btn ghost" onClick={lookup} disabled={ork?.state === 'busy' || !f.orkRaw}>Fill from ORK</button>
      </div>
      {ork && <div className={`note ${ork.state === 'ok' ? 'ok' : ork.state === 'bad' ? 'bad' : ''}`} role="status">{ork.msg}
        {ork.oid && <> <a href={ORK_PLAYER_URL(ork.oid)} target="_blank" rel="noopener">Open ORK profile</a></>}</div>}
      <div className="row">
        <div className="field" style={{ flexBasis: 240 }}><label htmlFor="pn">Persona name</label><input id="pn" required maxLength={120} value={f.persona} onChange={x => set({ persona: x.target.value })} /></div>
        <div className="field"><label htmlFor="pk">Park</label><input id="pk" list="parks" maxLength={120} value={f.park} onChange={x => set({ park: x.target.value })} /></div>
        <div className="field"><label htmlFor="kd">Kingdom</label><input id="kd" maxLength={120} value={f.kingdom} onChange={x => set({ kingdom: x.target.value })} placeholder="Westmarch" /></div>
      </div>
      <div className="field"><label htmlFor="em">Email (optional)</label><input id="em" type="email" maxLength={200} value={f.email} onChange={x => set({ email: x.target.value })} />
        <span className="hint">Only the crats see this, for event updates.</span></div>
      {days.length > 1 && <div><div className="lbl" style={{ marginBottom: 6 }}>Days attending</div>
        <div className="checks">{days.map(d => { const on = f.days.includes(d); return (
          <label key={d} className={on ? 'on' : ''}><input type="checkbox" checked={on} onChange={() => set({ days: on ? f.days.filter(x => x !== d) : [...f.days, d].sort() })} />{fmtDay(d)}</label>); })}
        </div></div>}

      {e.feast?.enabled && <div className="form" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <div><div className="lbl" style={{ marginBottom: 6 }}>Feast{e.feast.price ? ` (${e.feast.price})` : ''}</div>
          <div className="checks">
            <label className={f.eating === 'yes' ? 'on' : ''}><input type="radio" name="eat" checked={f.eating === 'yes'} onChange={() => set({ eating: 'yes' })} />I’ll be at feast</label>
            <label className={f.eating === 'no' ? 'on' : ''}><input type="radio" name="eat" checked={f.eating === 'no'} onChange={() => set({ eating: 'no' })} />No feast for me</label>
          </div></div>
        {f.eating === 'yes' && <>
          {ork?.feastFromOrk && <span className="pill good" style={{ justifySelf: 'start' }}>From your ORK profile</span>}
          <FeastPicker value={feast} onChange={setFeast} />
          <p className="hint">Only the Autocrat and Feastcrat see your feast preferences. Tip: in the ORK, turn on <b>Show My Feast Preferences</b> in your profile settings and FORK will fill this in for you next time.</p>
        </>}
      </div>}

      {wm && <div className="form" style={{ borderTop: '1px solid var(--line)', paddingTop: 14 }}>
        <div><div className="lbl" style={{ marginBottom: 2 }}>{wm.name}</div>
          <p className="hint" style={{ margin: '0 0 8px' }}>Want to fight? Pick your divisions. Leave them all unchecked if you’re not entering.</p>
          <div className="checks">{wm.divs.map(k => { const on = tDivs.includes(k); return (
            <label key={k} className={on ? 'on' : ''}><input type="checkbox" checked={on} onChange={() => setTDivs(on ? tDivs.filter(x => x !== k) : [...tDivs, k])} />{DIV[k]?.n || k}</label>); })}</div></div>
      </div>}

      <div className="field"><label htmlFor="nt">Notes for the crats (optional)</label><textarea id="nt" rows={2} maxLength={1000} value={f.notes} onChange={x => set({ notes: x.target.value })} /></div>
      <div><button className="btn accent" disabled={busy}>{busy ? 'Saving…' : 'Register'}</button></div>
      <datalist id="parks">{PARKS.map(p => <option key={p} value={p} />)}</datalist>
    </form>
  );
}
