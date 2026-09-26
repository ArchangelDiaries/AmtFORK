import React, { useEffect, useState } from 'react';
import { useApp } from '../../App.jsx';
import { updateEvent } from '../../lib/data.js';
import EventTypeFields from '../../components/EventTypeFields.jsx';

const SWATCHES = ['#B07F0C', '#B3261E', '#2456B8', '#1C7549', '#6B3FA0', '#9A5B2E', '#0F7C86', '#141C28'];

export default function Overview({ id, e, isAuto }) {
  const { toast } = useApp();
  const [f, setF] = useState(e);
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setF(e); }, [e, dirty]);
  const set = p => { setF(x => ({ ...x, ...p })); setDirty(true); };
  const setTheme = p => set({ theme: { ...f.theme, ...p } });

  async function save(ev) {
    ev.preventDefault();
    try {
      await updateEvent(id, {
        name: f.name, kind: f.kind || 'park', scope: f.scope || 'park', kingdom: f.kingdom || 'Westmarch', park: f.park || '', startDate: f.startDate, endDate: f.endDate || f.startDate,
        location: f.location || '', address: f.address || '', fieldMarshalUrl: f.fieldMarshalUrl || '', theme: f.theme,
        'feast.enabled': !!f.feast?.enabled,
      });
      setDirty(false); toast('Saved.');
    } catch (err) { console.error(err); toast('Couldn’t save. Only the Autocrat can edit details.'); }
  }
  const flag = async (k, v) => { try { await updateEvent(id, { [k]: v }); toast(v ? 'Done.' : 'Updated.'); } catch (err) { toast('Only the Autocrat can change that.'); } };
  const ro = !isAuto;

  return (
    <div className="stack">
      {isAuto && <div className="panel row" style={{ justifyContent: 'space-between' }}>
        <div><b>{e.published ? 'This event is live.' : 'This event is a draft.'}</b>
          <div className="hint">{e.published ? 'Park members can see it on the FORK home page and at its link.' : 'Only crats can see it. Publish when the theme and schedule are ready.'}</div></div>
        <div className="row">
          <button className="btn ghost" onClick={() => flag('registrationOpen', !e.registrationOpen)}>{e.registrationOpen ? 'Close registration' : 'Open registration'}</button>
          <button className={`btn ${e.published ? 'ghost' : 'accent'}`} onClick={() => flag('published', !e.published)}>{e.published ? 'Unpublish' : 'Publish event'}</button>
        </div>
      </div>}

      <form className="panel form" onSubmit={save}>
        <h2>Theme</h2>
        <fieldset disabled={ro} style={{ border: 0, padding: 0, margin: 0 }} className="form">
          <div className="row">
            <div className="field" style={{ flexBasis: 280 }}><label htmlFor="tt">Theme title</label>
              <input id="tt" value={f.theme?.title || ''} onChange={x => setTheme({ title: x.target.value })} placeholder="The Fall of the Ashen Crown" /></div>
            <div className="field" style={{ flexBasis: 280 }}><label htmlFor="tg">Tagline</label>
              <input id="tg" value={f.theme?.tagline || ''} onChange={x => setTheme({ tagline: x.target.value })} placeholder="The old reign ends at dusk. Who will stand when the banners fall?" /></div>
          </div>
          <div className="field"><label htmlFor="st">Story / invitation</label>
            <textarea id="st" rows={5} value={f.theme?.story || ''} onChange={x => setTheme({ story: x.target.value })} placeholder="The in-game story, garb suggestions, what players should expect…" /></div>
          <div><div className="lbl" style={{ marginBottom: 6 }}>Theme color</div>
            <div className="row" style={{ alignItems: 'center' }}>
              {SWATCHES.map(c => <button type="button" key={c} aria-label={`Use ${c}`} onClick={() => setTheme({ accent: c })}
                style={{ width: 30, height: 30, borderRadius: 8, background: c, border: f.theme?.accent === c ? '3px solid var(--ink)' : '1px solid var(--line)' }} />)}
              <input type="color" aria-label="Custom theme color" value={f.theme?.accent || '#B07F0C'} onChange={x => setTheme({ accent: x.target.value })} />
            </div></div>
        </fieldset>

        <h2 style={{ marginTop: 10 }}>Event details</h2>
        <fieldset disabled={ro} style={{ border: 0, padding: 0, margin: 0 }} className="form">
          <div className="row">
            <div className="field" style={{ flexBasis: 260 }}><label htmlFor="nm">Event name</label><input id="nm" required value={f.name} onChange={x => set({ name: x.target.value })} /></div>
            
          </div>
          <EventTypeFields f={f} set={set} idp="ov" />
          <div className="row">
            <div className="field"><label htmlFor="sd">Starts</label><input id="sd" type="date" value={f.startDate} onChange={x => set({ startDate: x.target.value })} /></div>
            <div className="field"><label htmlFor="ed">Ends</label><input id="ed" type="date" min={f.startDate} value={f.endDate} onChange={x => set({ endDate: x.target.value })} /></div>
            <div className="field"><label htmlFor="lc">Site name</label><input id="lc" value={f.location || ''} onChange={x => set({ location: x.target.value })} /></div>
            <div className="field"><label htmlFor="ad">Address</label><input id="ad" value={f.address || ''} onChange={x => set({ address: x.target.value })} /></div>
          </div>
          <fieldset style={{ border: 0, padding: 0, margin: 0 }}>
            <legend className="lbl" style={{ marginBottom: 6 }}>Will there be a feast?</legend>
            <div className="checks">
              <label className={f.feast?.enabled ? 'on' : ''}><input type="radio" name="ovFeast" checked={!!f.feast?.enabled} onChange={() => set({ feast: { ...(f.feast || {}), enabled: true } })} />Yes, there’s a feast</label>
              <label className={!f.feast?.enabled ? 'on' : ''}><input type="radio" name="ovFeast" checked={!f.feast?.enabled} onChange={() => set({ feast: { ...(f.feast || {}), enabled: false } })} />No feast</label>
            </div>
          </fieldset>
          <div className="field"><label htmlFor="fm">Field Marshal link for the Warmaster Tournament (optional)</label>
            <input id="fm" type="url" value={f.fieldMarshalUrl || ''} onChange={x => set({ fieldMarshalUrl: x.target.value })} placeholder="https://…" /></div>
        </fieldset>
        {isAuto ? <div className="row"><button className="btn" disabled={!dirty}>Save changes</button>{dirty && <button type="button" className="btn ghost" onClick={() => { setF(e); setDirty(false); }}>Discard</button>}</div>
          : <p className="hint">Only the Autocrat edits the theme and details.</p>}
      </form>
    </div>
  );
}
