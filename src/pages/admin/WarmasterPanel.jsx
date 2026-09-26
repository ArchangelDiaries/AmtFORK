import React, { useState } from 'react';
import { useApp } from '../../App.jsx';
import { updateEvent, saveItem } from '../../lib/data.js';
import { eventDays, fmtDay } from '../../lib/util.js';
import {
  fmConfigured, FM_URL, DIVS, DIV, LEVELS, PARK_LEVEL,
  fmSignInAsMarshal, fmCreateTournament, fmSetSignupsOpen,
} from '../../lib/fieldMarshal.js';

/** Warcrat / Autocrat: create the event's Warmaster Tournament in Field Marshal and manage signups. */
export default function WarmasterPanel({ id, e, regs, sched }) {
  const { toast } = useApp();
  const days = eventDays(e);
  const wm = e.warmaster;
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = p => setF(x => ({ ...x, ...p }));
  const start = () => setF({
    name: `${e.name} Warmaster Tournament`, date: days[0] || e.startDate || '', level: e.scope === 'kingdom' ? 'kingdom' : (PARK_LEVEL[e.park] || 'shire'),
    pitMin: 10, divs: DIVS.map(d => d.k), addToSchedule: !sched.some(i => i.track === 'warmaster'),
  });

  async function create(ev) {
    ev.preventDefault();
    if (!f.divs.length) { toast('Pick at least one division.'); return; }
    setBusy(true);
    try {
      const marshal = await fmSignInAsMarshal();
      const tid = await fmCreateTournament({ name: f.name.trim(), date: f.date, park: e.park || `Kingdom of ${e.kingdom || 'Westmarch'}`, level: f.level, pitMin: f.pitMin, divs: f.divs });
      await updateEvent(id, { warmaster: { fmTid: tid, name: f.name.trim(), date: f.date, level: f.level, pitMin: Number(f.pitMin) || 10, divs: f.divs, signupsOpen: true, createdBy: marshal } });
      if (f.addToSchedule) await saveItem(id, { track: 'warmaster', title: f.name.trim(), day: f.date, start: '', end: '', location: '', lead: '', description: `Divisions: ${f.divs.map(k => DIV[k].n).join(', ')}` });
      setF(null); toast('Tournament created in Field Marshal. Players can now sign up from the event page.');
    } catch (err) { console.error(err); toast(err.message || 'Couldn’t create the tournament.'); }
    setBusy(false);
  }
  async function toggle() {
    setBusy(true);
    try {
      await fmSignInAsMarshal();
      await fmSetSignupsOpen(wm.fmTid, !wm.signupsOpen);
      await updateEvent(id, { 'warmaster.signupsOpen': !wm.signupsOpen });
      toast(wm.signupsOpen ? 'Tournament signups closed.' : 'Tournament signups open.');
    } catch (err) { console.error(err); toast(err.message || 'Couldn’t change signups.'); }
    setBusy(false);
  }
  async function unlink() {
    if (!window.confirm('Unlink this tournament from the event? It stays in Field Marshal, and players can no longer sign up for it here.')) return;
    try { await updateEvent(id, { warmaster: null }); toast('Unlinked.'); } catch (err) { toast('Couldn’t unlink.'); }
  }

  const fighters = regs.filter(r => (r.tourneyDivs || []).length);
  const unsent = fighters.filter(r => !r.fmRequestId);

  return (
    <div className="panel" style={{ borderTop: '4px solid var(--t-warmaster)' }}>
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}>
        <h2 style={{ margin: 0 }}>Warmaster Tournament</h2>
        {wm && FM_URL && <a className="btn ghost sm" href={FM_URL} target="_blank" rel="noopener">Open Field Marshal</a>}
      </div>

      {!fmConfigured && <p className="hint">Field Marshal isn’t connected to FORK yet. Add the Field Marshal settings described in the README, then redeploy.</p>}

      {fmConfigured && !wm && !f && <>
        <p className="muted">Create this event’s tournament in Field Marshal. Players then pick their divisions when they register for the event, and their signups show up as requests on Field Marshal’s Signups tab.</p>
        <button className="btn accent" onClick={start}>Create tournament in Field Marshal</button>
        <p className="hint">You’ll sign in to Field Marshal with Google. Your account has to be a marshal there.</p>
      </>}

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
            <div className="field" style={{ flex: '0 1 140px' }}><label htmlFor="wp">Pit length (min)</label><input id="wp" type="number" min="1" max="120" value={f.pitMin} onChange={x => set({ pitMin: x.target.value })} /></div>
          </div>
          <div><div className="lbl" style={{ marginBottom: 6 }}>Divisions</div>
            <div className="checks">{DIVS.map(d => { const on = f.divs.includes(d.k); return (
              <label key={d.k} className={on ? 'on' : ''}><input type="checkbox" checked={on} onChange={() => set({ divs: on ? f.divs.filter(k => k !== d.k) : [...f.divs, d.k] })} />{d.n}</label>); })}</div></div>
          <div className="checks"><label className={f.addToSchedule ? 'on' : ''}><input type="checkbox" checked={f.addToSchedule} onChange={x => set({ addToSchedule: x.target.checked })} />Add it to the event schedule</label></div>
          <div className="row"><button className="btn" disabled={busy}>{busy ? 'Working…' : 'Sign in & create'}</button><button type="button" className="btn ghost" onClick={() => setF(null)}>Cancel</button></div>
        </form>
      )}

      {wm && <div className="stack" style={{ gap: 12 }}>
        <div className="row" style={{ alignItems: 'center' }}>
          <b>{wm.name}</b>
          <span className="muted">{fmtDay(wm.date)} · {LEVELS.find(l => l.k === wm.level)?.n.split(' (')[0]} · {wm.pitMin}-minute pits</span>
          <span className={`pill ${wm.signupsOpen ? 'good' : ''}`}>{wm.signupsOpen ? 'Signups open' : 'Signups closed'}</span>
        </div>
        <div className="tiles">
          <div className="tile"><div className="l">Fighters</div><div className="v">{fighters.length}</div></div>
          {wm.divs.map(k => <div key={k} className="tile"><div className="l">{DIV[k]?.n}</div><div className="v">{fighters.filter(r => r.tourneyDivs.includes(k)).length}</div></div>)}
        </div>
        {unsent.length > 0 && <div className="note bad">{unsent.length} fighter{unsent.length === 1 ? '' : 's'} picked divisions but didn’t reach Field Marshal: {unsent.map(r => r.persona).join(', ')}. Add them on Field Marshal’s Signups tab.</div>}
        {fighters.length > 0 && <div className="scroll"><table><thead><tr><th>Fighter</th><th>Park</th><th>Divisions</th><th>Field Marshal</th></tr></thead>
          <tbody>{[...fighters].sort((a, b) => a.persona.localeCompare(b.persona)).map(r => (
            <tr key={r.id}><td><b>{r.persona}</b></td><td>{r.park}</td><td>{r.tourneyDivs.map(k => DIV[k]?.n || k).join(', ')}</td>
              <td>{r.fmRequestId ? <span className="pill good">Request sent</span> : <span className="pill warn">Not sent</span>}</td></tr>))}</tbody></table></div>}
        <p className="hint">Approve fighters on Field Marshal’s Signups tab. Approved fighters appear on the lists there.</p>
        <div className="row">
          <button className="btn ghost" disabled={busy} onClick={toggle}>{wm.signupsOpen ? 'Close tournament signups' : 'Open tournament signups'}</button>
          <button className="btn ghost sm" onClick={unlink}>Unlink</button>
        </div>
      </div>}
    </div>
  );
}
