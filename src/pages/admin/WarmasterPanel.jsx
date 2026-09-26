import React, { useEffect, useState } from 'react';
import { useApp } from '../../App.jsx';
import { updateEvent, saveItem } from '../../lib/data.js';
import { eventDays, fmtDay } from '../../lib/util.js';
import {
  fmConfigured, DIVS, DIV, LEVELS, PARK_LEVEL, FORMATS,
  fmSignInAsMarshal, fmCreateTournament, fmSetSignupsOpen, fmGetTournament, fmSetFork,
  forkRef, fmTournamentUrl, parseFmTid,
} from '../../lib/fieldMarshal.js';

/** Snapshot of a Field Marshal tournament that FORK keeps on the event (event.warmaster). */
const mirror = (tid, t, by) => ({
  fmTid: tid, name: t.name || 'Warmaster Tournament', date: t.date || '', level: t.level || 'shire',
  format: t.format === 'elim' ? 'elim' : 'pit', pitMin: Number(t.pitMin) || 10, divs: Array.isArray(t.divs) && t.divs.length ? t.divs : DIVS.map(d => d.k),
  signupsOpen: t.signupsOpen !== false && t.status !== 'final', createdBy: by,
});

/** Warcrat / Autocrat: link the event's Warmaster Tournament to Field Marshal and manage signups. */
export default function WarmasterPanel({ id, e, regs, sched }) {
  const { toast } = useApp();
  const days = eventDays(e);
  const wm = e.warmaster;
  const [f, setF] = useState(null);          // create form
  const [linkRaw, setLinkRaw] = useState(null); // link-existing form (string when open)
  const [busy, setBusy] = useState(false);
  const [fm, setFm] = useState(undefined);   // live Field Marshal copy: undefined = checking, null = missing
  const [reload, setReload] = useState(0);
  const set = p => setF(x => ({ ...x, ...p }));

  // Check the linked tournament still exists in Field Marshal, and read its live status.
  useEffect(() => {
    if (!wm?.fmTid || !fmConfigured) { setFm(undefined); return; }
    let live = true; setFm(undefined);
    fmGetTournament(wm.fmTid).then(t => live && setFm(t)).catch(() => live && setFm(undefined));
    return () => { live = false; };
  }, [wm?.fmTid, reload]);

  // Keep FORK's copy in step with Field Marshal (e.g. a marshal closed signups or finalized there).
  useEffect(() => {
    if (!fm || !wm) return;
    const open = fm.signupsOpen !== false && fm.status !== 'final';
    if (open !== wm.signupsOpen || fm.name !== wm.name) updateEvent(id, { 'warmaster.signupsOpen': open, 'warmaster.name': fm.name || wm.name }).catch(() => {});
  }, [fm]); // eslint-disable-line react-hooks/exhaustive-deps

  const start = () => setF({
    name: `${e.name} Warmaster Tournament`, date: days[0] || e.startDate || '', level: e.scope === 'kingdom' ? 'kingdom' : (PARK_LEVEL[e.park] || 'shire'),
    format: 'pit', pitMin: 10, divs: DIVS.map(d => d.k), addToSchedule: !sched.some(i => i.track === 'warmaster'),
  });
  const schedule = async (name, date, divs) => {
    if (sched.some(i => i.track === 'warmaster')) return;
    await saveItem(id, { track: 'warmaster', title: name, day: date, start: '', end: '', location: '', lead: '', description: `Divisions: ${divs.map(k => DIV[k]?.n || k).join(', ')}` });
  };

  async function create(ev) {
    ev.preventDefault();
    if (!f.divs.length) { toast('Pick at least one division.'); return; }
    setBusy(true);
    try {
      const marshal = await fmSignInAsMarshal();
      const data = { name: f.name.trim(), date: f.date, park: e.park || `Kingdom of ${e.kingdom || 'Westmarch'}`, level: f.level, format: f.format, pitMin: f.pitMin, divs: f.divs };
      const tid = await fmCreateTournament({ ...data, fork: forkRef(id, e.name) });
      await updateEvent(id, { warmaster: mirror(tid, { ...data, signupsOpen: true }, marshal) });
      if (f.addToSchedule) await schedule(data.name, data.date, data.divs);
      setF(null); toast('Tournament created in Field Marshal. Players can now sign up from the event page.');
    } catch (err) { console.error(err); toast(err.message || 'Couldn’t create the tournament.'); }
    setBusy(false);
  }

  async function linkExisting(ev) {
    ev.preventDefault();
    const tid = parseFmTid(linkRaw);
    if (!tid) { toast('Paste the tournament’s Field Marshal link (it ends in ?t=…).'); return; }
    setBusy(true);
    try {
      const t = await fmGetTournament(tid);
      if (!t) throw new Error('No tournament with that link in Field Marshal.');
      if (t.fork?.eventId && t.fork.eventId !== id && !window.confirm(`That tournament is already linked to "${t.fork.name}". Link it to this event instead?`)) { setBusy(false); return; }
      const marshal = await fmSignInAsMarshal();
      await fmSetFork(tid, forkRef(id, e.name));
      await updateEvent(id, { warmaster: mirror(tid, t, marshal) });
      await schedule(t.name, t.date, t.divs || []);
      setLinkRaw(null); setReload(n => n + 1); toast(`Linked to ${t.name}.`);
    } catch (err) { console.error(err); toast(err.message || 'Couldn’t link that tournament.'); }
    setBusy(false);
  }

  async function addBackLink() {
    setBusy(true);
    try { await fmSignInAsMarshal(); await fmSetFork(wm.fmTid, forkRef(id, e.name)); setReload(n => n + 1); toast('Field Marshal now links back to this event.'); }
    catch (err) { console.error(err); toast(err.message || 'Couldn’t update Field Marshal.'); }
    setBusy(false);
  }
  async function toggle() {
    const open = fm ? !(fm.signupsOpen !== false) : !wm.signupsOpen;
    setBusy(true);
    try {
      await fmSignInAsMarshal();
      await fmSetSignupsOpen(wm.fmTid, open);
      await updateEvent(id, { 'warmaster.signupsOpen': open });
      setReload(n => n + 1); toast(open ? 'Tournament signups open.' : 'Tournament signups closed.');
    } catch (err) { console.error(err); toast(err.message || 'Couldn’t change signups.'); }
    setBusy(false);
  }
  async function unlink(ask = true) {
    if (ask && !window.confirm('Unlink this tournament from the event? It stays in Field Marshal, and players can no longer sign up for it here.')) return;
    try { await updateEvent(id, { warmaster: null }); toast('Unlinked.'); } catch (err) { toast('Couldn’t unlink.'); }
  }

  const fighters = regs.filter(r => (r.tourneyDivs || []).length);
  const unsent = fighters.filter(r => !r.fmRequestId);
  const final = fm?.status === 'final';
  const open = fm ? fm.signupsOpen !== false && !final : wm?.signupsOpen;
  const fmUrl = wm ? fmTournamentUrl(wm.fmTid, 'signups') : '';

  const linkForm = linkRaw !== null && (
    <form className="form note" onSubmit={linkExisting} style={{ marginTop: 10 }}>
      <div className="field"><label htmlFor="fml">Field Marshal tournament link</label>
        <input id="fml" autoFocus value={linkRaw} onChange={x => setLinkRaw(x.target.value)} placeholder="https://srfieldmarshal.netlify.app/?t=…" /></div>
      <p className="hint" style={{ margin: 0 }}>In Field Marshal, pick the tournament and copy the address from your browser.</p>
      <div className="row"><button className="btn" disabled={busy}>{busy ? 'Working…' : 'Sign in & link'}</button><button type="button" className="btn ghost" onClick={() => setLinkRaw(null)}>Cancel</button></div>
    </form>);

  return (
    <div className="panel" style={{ borderTop: '4px solid var(--t-warmaster)' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Warmaster Tournament</h2>
        {wm && fmUrl && fm !== null && <a className="btn ghost sm" href={fmUrl} target="_blank" rel="noopener">Open in Field Marshal</a>}
      </div>

      {!fmConfigured && <p className="hint">Field Marshal isn’t connected to FORK yet. Add the Field Marshal settings described in the README, then redeploy.</p>}

      {fmConfigured && !wm && !f && linkRaw === null && <>
        <p className="muted">Create this event’s tournament in Field Marshal. Players then pick their divisions when they register for the event, and their signups show up as requests on Field Marshal’s Signups tab.</p>
        <div className="row">
          <button className="btn accent" onClick={start}>Create tournament in Field Marshal</button>
          <button className="btn ghost" onClick={() => setLinkRaw('')}>Link one that already exists</button>
        </div>
        <p className="hint">You’ll sign in to Field Marshal with Google. Your account has to be a marshal there.</p>
      </>}
      {!wm && linkForm}

      {f && (
        <form className="form note" onSubmit={create}>
          <div className="row">
            <div className="field" style={{ flexBasis: 300 }}><label htmlFor="wn">Tournament name</label><input id="wn" required maxLength={120} value={f.name} onChange={x => set({ name: x.target.value })} /></div>
            <div className="field"><label htmlFor="wd">Day</label>
              {days.length ? <select id="wd" value={f.date} onChange={x => set({ date: x.target.value })}>{days.map(d => <option key={d} value={d}>{fmtDay(d)}</option>)}</select>
                : <input id="wd" type="date" required value={f.date} onChange={x => set({ date: x.target.value })} />}</div>
          </div>
          <div className="row">
            <div className="field"><label htmlFor="wl">Tournament level</label><select id="wl" value={f.level} onChange={x => set({ level: x.target.value })}>{LEVELS.map(l => <option key={l.k} value={l.k}>{l.n}</option>)}</select></div>
            <div className="field"><label htmlFor="wf">Format</label><select id="wf" value={f.format} onChange={x => set({ format: x.target.value })}>{FORMATS.map(o => <option key={o.k} value={o.k}>{o.n} ({o.d.toLowerCase()})</option>)}</select></div>
            {f.format === 'pit' && <div className="field" style={{ flex: '0 1 140px' }}><label htmlFor="wp">Pit length (min)</label><input id="wp" type="number" min="1" max="120" value={f.pitMin} onChange={x => set({ pitMin: x.target.value })} /></div>}
          </div>
          <div><div className="lbl" style={{ marginBottom: 6 }}>Divisions</div>
            <div className="checks">{DIVS.map(d => { const on = f.divs.includes(d.k); return (
              <label key={d.k} className={on ? 'on' : ''}><input type="checkbox" checked={on} onChange={() => set({ divs: on ? f.divs.filter(k => k !== d.k) : [...f.divs, d.k] })} />{d.n}</label>); })}</div></div>
          <div className="checks"><label className={f.addToSchedule ? 'on' : ''}><input type="checkbox" checked={f.addToSchedule} onChange={x => set({ addToSchedule: x.target.checked })} />Add it to the event schedule</label></div>
          <div className="row"><button className="btn" disabled={busy}>{busy ? 'Working…' : 'Sign in & create'}</button><button type="button" className="btn ghost" onClick={() => setF(null)}>Cancel</button></div>
        </form>
      )}

      {wm && fm === null && (
        <div className="note bad form" style={{ gap: 8 }}>
          <div><b>{wm.name}</b> is no longer in Field Marshal. It may have been deleted there. Players can’t sign up for it until you relink.</div>
          <div className="row">
            <button className="btn ghost sm" onClick={() => setLinkRaw('')}>Link a different tournament</button>
            <button className="btn ghost sm" onClick={async () => { await unlink(false); start(); }}>Create a new one</button>
          </div>
          {linkForm}
        </div>
      )}

      {wm && fm !== null && <div className="stack" style={{ gap: 12 }}>
        <div className="row" style={{ alignItems: 'center' }}>
          <b>{fm?.name || wm.name}</b>
          <span className="muted">{fmtDay(fm?.date || wm.date)} · {LEVELS.find(l => l.k === (fm?.level || wm.level))?.n.split(' (')[0]} · {(fm?.format || wm.format) === 'elim' ? 'Bracket Tournament' : `${fm?.pitMin || wm.pitMin}-minute pits`}</span>
          {final ? <span className="pill">Final in Field Marshal</span> : <span className={`pill ${open ? 'good' : ''}`}>{open ? 'Signups open' : 'Signups closed'}</span>}
          {fm === undefined && fmConfigured && <span className="hint">Checking Field Marshal…</span>}
        </div>
        {fm && !fm.fork?.eventId && <div className="note row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <span>Field Marshal doesn’t link back to this event yet.</span>
          <button className="btn ghost sm" disabled={busy} onClick={addBackLink}>Add the link in Field Marshal</button></div>}
        <div className="tiles">
          <div className="tile"><div className="l">Fighters</div><div className="v">{fighters.length}</div></div>
          {(fm?.divs || wm.divs).map(k => <div key={k} className="tile"><div className="l">{DIV[k]?.n}</div><div className="v">{fighters.filter(r => r.tourneyDivs.includes(k)).length}</div></div>)}
        </div>
        {unsent.length > 0 && <div className="note bad">{unsent.length} fighter{unsent.length === 1 ? '' : 's'} picked divisions but didn’t reach Field Marshal: {unsent.map(r => r.persona).join(', ')}. Add them on Field Marshal’s Signups tab.</div>}
        {fighters.length > 0 && <div className="scroll"><table><thead><tr><th>Fighter</th><th>Park</th><th>Divisions</th><th>Field Marshal</th></tr></thead>
          <tbody>{[...fighters].sort((a, b) => a.persona.localeCompare(b.persona)).map(r => (
            <tr key={r.id}><td><b>{r.persona}</b></td><td>{r.park}</td><td>{r.tourneyDivs.map(k => DIV[k]?.n || k).join(', ')}</td>
              <td>{r.fmRequestId ? <span className="pill good">Request sent</span> : <span className="pill warn">Not sent</span>}</td></tr>))}</tbody></table></div>}
        <p className="hint">Approve fighters on Field Marshal’s Signups tab. Approved fighters appear on the lists there.</p>
        <div className="row">
          {!final && <button className="btn ghost" disabled={busy} onClick={toggle}>{open ? 'Close tournament signups' : 'Open tournament signups'}</button>}
          <button className="btn ghost sm" onClick={() => unlink()}>Unlink</button>
        </div>
      </div>}
    </div>
  );
}
