import React, { useState } from 'react';
import { useApp } from '../../App.jsx';
import { saveItem, deleteItem } from '../../lib/data.js';
import { TRACKS, TRACK, canEditTrack } from '../../lib/constants.js';
import { eventDays, fmtDay } from '../../lib/util.js';
import Schedule from '../../components/Schedule.jsx';

const PRESETS = {
  court: ['Gate opens', 'Opening Court', 'Closing Court'],
  war: ['Ditch battle', 'Bridge battle', 'Capture the flag', 'Quest'],
  warmaster: ['Warmaster: pits', 'Warmaster: finals'],
  as: ['A&S display & judging', 'A&S entry drop-off'],
  classes: ['Workshop', 'Class'],
  meals: ['Breakfast', 'Lunch', 'Feast'],
};

export default function ScheduleAdmin({ id, e, sched, roles, isOwner }) {
  const { toast } = useApp();
  const days = eventDays(e);
  const mine = TRACKS.filter(t => canEditTrack(roles, t.k, isOwner));
  const blank = () => ({ track: mine[0]?.k || 'court', title: '', day: days[0] || '', start: '', end: '', location: '', lead: '', description: '' });
  const [f, setF] = useState(null);
  const [armed, setArmed] = useState(null);
  const set = p => setF(x => ({ ...x, ...p }));

  async function save(ev) {
    ev.preventDefault();
    try { await saveItem(id, f); toast(f.id ? 'Updated.' : 'Added to the schedule.'); setF(null); }
    catch (err) { console.error(err); toast(`Your crat role can’t edit ${TRACK[f.track].n}.`); }
  }
  async function del(i) {
    if (armed !== i.id) { setArmed(i.id); setTimeout(() => setArmed(a => (a === i.id ? null : a)), 4000); return; }
    try { await deleteItem(id, i.id); toast('Removed.'); } catch (err) { toast('You can’t remove that one.'); }
  }

  return (
    <div className="stack">
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ margin: 0 }}>Event schedule</h2>
          {mine.length > 0 && !f && <button className="btn accent" onClick={() => setF(blank())}>Add to schedule</button>}
        </div>
        {mine.length === 0 && <p className="hint">Your crat role can see the schedule but doesn’t edit any part of it.</p>}
        {mine.length > 0 && mine.length < TRACKS.length && <p className="hint">You can edit: {mine.map(t => t.n).join(', ')}.</p>}

        {f && (
          <form className="form note" onSubmit={save} style={{ marginBottom: 16 }}>
            <div className="row">
              <div className="field"><label htmlFor="tr">Schedule</label>
                <select id="tr" value={f.track} onChange={x => set({ track: x.target.value })}>{mine.map(t => <option key={t.k} value={t.k}>{t.n}</option>)}</select></div>
              <div className="field" style={{ flexBasis: 280 }}><label htmlFor="ti">Title</label>
                <input id="ti" required maxLength={140} list={`pre-${f.track}`} value={f.title} onChange={x => set({ title: x.target.value })} />
                <datalist id={`pre-${f.track}`}>{(PRESETS[f.track] || []).map(p => <option key={p} value={p} />)}</datalist></div>
            </div>
            <div className="row">
              <div className="field"><label htmlFor="dy">Day</label>
                {days.length ? <select id="dy" value={f.day} onChange={x => set({ day: x.target.value })}>{days.map(d => <option key={d} value={d}>{fmtDay(d)}</option>)}</select>
                  : <input id="dy" type="date" value={f.day} onChange={x => set({ day: x.target.value })} />}</div>
              <div className="field"><label htmlFor="st">Starts</label><input id="st" type="time" value={f.start} onChange={x => set({ start: x.target.value })} /></div>
              <div className="field"><label htmlFor="en">Ends</label><input id="en" type="time" value={f.end} onChange={x => set({ end: x.target.value })} /></div>
            </div>
            <div className="row">
              <div className="field"><label htmlFor="lo">Where</label><input id="lo" maxLength={120} value={f.location} onChange={x => set({ location: x.target.value })} placeholder="Main field, pavilion…" /></div>
              <div className="field"><label htmlFor="ld">Led by</label><input id="ld" maxLength={120} value={f.lead} onChange={x => set({ lead: x.target.value })} placeholder="Persona of the instructor or reeve" /></div>
            </div>
            <div className="field"><label htmlFor="ds">Details</label><textarea id="ds" rows={3} maxLength={2000} value={f.description} onChange={x => set({ description: x.target.value })}
              placeholder={f.track === 'war' ? 'Scenario, teams, lives, special rules…' : f.track === 'classes' ? 'What students learn, materials to bring, class size…' : f.track === 'warmaster' ? 'Divisions, pit length, check-in…' : ''} /></div>
            <div className="row"><button className="btn">{f.id ? 'Save' : 'Add'}</button><button type="button" className="btn ghost" onClick={() => setF(null)}>Cancel</button></div>
          </form>
        )}

        <Schedule items={sched} empty="Nothing on the schedule yet."
          actions={i => canEditTrack(roles, i.track, isOwner) && (
            <div className="row" style={{ gap: 6 }}>
              <button className="btn ghost sm" onClick={() => setF({ ...blank(), ...i })}>Edit</button>
              <button className={`btn sm ${armed === i.id ? 'danger' : 'ghost'}`} onClick={() => del(i)}>{armed === i.id ? 'Confirm' : 'Remove'}</button>
            </div>)} />
      </div>
    </div>
  );
}
