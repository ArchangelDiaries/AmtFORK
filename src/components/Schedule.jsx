import React, { useState } from 'react';
import { TRACKS, TRACK } from '../lib/constants.js';
import { fmtDay, fmtTime, sortItems } from '../lib/util.js';

/** Day-grouped schedule with track filter chips. `actions(item)` renders per-item controls (admin). */
export default function Schedule({ items, actions, empty }) {
  const [on, setOn] = useState(() => new Set());
  const present = TRACKS.filter(t => items.some(i => i.track === t.k));
  const shown = sortItems(items.filter(i => !on.size || on.has(i.track)));
  const days = [...new Set(shown.map(i => i.day || ''))];
  const flip = k => setOn(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  if (!items.length) return <p className="muted">{empty || 'Nothing scheduled yet.'}</p>;
  return (
    <div>
      {present.length > 1 && <div className="filters" aria-label="Filter by schedule">
        <button className={`fchip ${!on.size ? 'on' : ''}`} onClick={() => setOn(new Set())}>Everything</button>
        {present.map(t => <button key={t.k} className={`fchip ${on.has(t.k) ? 'on' : ''}`} style={{ '--c': t.c }} aria-pressed={on.has(t.k)} onClick={() => flip(t.k)}>
          <span className="dot" style={{ '--c': t.c }} />{t.n}</button>)}
      </div>}
      {days.map(d => (
        <section key={d} className="day">
          <h3>{d ? fmtDay(d) : 'Day to be announced'}</h3>
          {shown.filter(i => (i.day || '') === d).map(i => {
            const t = TRACK[i.track] || TRACKS[0];
            return (
              <div key={i.id} className="item" style={{ '--c': t.c }}>
                <div className="t">{i.start ? fmtTime(i.start) : 'TBA'}{i.end && <small>to {fmtTime(i.end)}</small>}</div>
                <div>
                  <b>{i.title}</b>
                  <div className="meta">{t.n}{i.location ? ` · ${i.location}` : ''}{i.lead ? ` · led by ${i.lead}` : ''}</div>
                  {i.description && <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{i.description}</div>}
                </div>
                <div>{actions && actions(i)}</div>
              </div>);
          })}
        </section>))}
    </div>
  );
}
