import React from 'react';
import { EVENT_KINDS, SCOPES, PARKS, KINGDOM } from '../lib/constants.js';

/** Type (Coronation / Midreign / EndReign / Other), Park vs Kingdom level, and host fields. */
export default function EventTypeFields({ f, set, idp = 'ev' }) {
  const kingdom = f.scope === 'kingdom';
  return (
    <>
      <div className="row">
        <div className="field"><label htmlFor={`${idp}-kind`}>Event type</label>
          <select id={`${idp}-kind`} value={f.kind || 'park'} onChange={x => set({ kind: x.target.value })}>{EVENT_KINDS.map(k => <option key={k.k} value={k.k}>{k.n}</option>)}</select></div>
        <fieldset className="field" style={{ border: 0, padding: 0, margin: 0 }}>
          <legend className="lbl" style={{ marginBottom: 4 }}>Level</legend>
          <div className="checks">{SCOPES.map(s => (
            <label key={s.k} className={(f.scope || 'park') === s.k ? 'on' : ''}>
              <input type="radio" name={`${idp}-scope`} checked={(f.scope || 'park') === s.k} onChange={() => set({ scope: s.k, kingdom: f.kingdom || KINGDOM })} />{s.n}</label>))}
          </div>
        </fieldset>
      </div>
      <div className="row">
        {kingdom && <div className="field"><label htmlFor={`${idp}-kd`}>Kingdom</label><input id={`${idp}-kd`} value={f.kingdom ?? KINGDOM} onChange={x => set({ kingdom: x.target.value })} /></div>}
        <div className="field"><label htmlFor={`${idp}-park`}>{kingdom ? 'Host park (optional)' : 'Hosting park'}</label>
          <input id={`${idp}-park`} list={`${idp}-parks`} required={!kingdom} value={f.park || ''} onChange={x => set({ park: x.target.value })} />
          <datalist id={`${idp}-parks`}>{PARKS.map(p => <option key={p} value={p} />)}</datalist></div>
      </div>
    </>
  );
}
