import React, { useMemo, useState } from 'react';
import { TRACKS, TRACK } from '../lib/constants.js';
import { fmtDay, fmtTime, sortItems } from '../lib/util.js';

const HOUR_PX = 64;          // height of one hour in the tower view
const DEFAULT_MIN = 60;      // items with no end time are drawn as one hour
const toMin = t => { if (!t) return null; const [h, m] = t.split(':').map(Number); return h * 60 + (m || 0); };
const hourLabel = m => { const h = Math.floor(m / 60) % 24; return `${((h + 11) % 12) + 1} ${h < 12 ? 'AM' : 'PM'}`; };

function readPref(k, d) { try { return localStorage.getItem(k) || d; } catch (e) { return d; } }
function savePref(k, v) { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } }

/**
 * Event schedule. Two views:
 *  - Towers: one column per schedule (or per location), time running down, so everything
 *    happening at the same time sits side by side.
 *  - List: day-grouped agenda.
 * `actions(item)` renders per-item controls (admin).
 */
export default function Schedule({ items, actions, empty }) {
  const [on, setOn] = useState(() => new Set());
  const [view, setView] = useState(() => readPref('fork.schedView', 'towers'));
  const [by, setBy] = useState(() => readPref('fork.schedBy', 'track'));
  const [sel, setSel] = useState(null);
  const present = TRACKS.filter(t => items.some(i => i.track === t.k));
  const shown = sortItems(items.filter(i => !on.size || on.has(i.track)));
  const days = [...new Set(shown.map(i => i.day || ''))];
  const flip = k => setOn(s => { const n = new Set(s); n.has(k) ? n.delete(k) : n.add(k); return n; });
  const pick = (setter, key) => v => { setter(v); savePref(key, v); };
  const hasLocations = items.some(i => i.location);
  if (!items.length) return <p className="muted">{empty || 'Nothing scheduled yet.'}</p>;
  const selected = sel && items.find(i => i.id === sel);

  return (
    <div>
      <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
        <div className="seg" role="group" aria-label="Schedule view">
          <button className={view === 'towers' ? 'on' : ''} aria-pressed={view === 'towers'} onClick={() => pick(setView, 'fork.schedView')('towers')}>Towers</button>
          <button className={view === 'list' ? 'on' : ''} aria-pressed={view === 'list'} onClick={() => pick(setView, 'fork.schedView')('list')}>List</button>
        </div>
        {view === 'towers' && hasLocations && <div className="row" style={{ gap: 6, alignItems: 'center' }}>
          <span className="hint">Columns by</span>
          <div className="seg" role="group" aria-label="Tower columns">
            <button className={by === 'track' ? 'on' : ''} aria-pressed={by === 'track'} onClick={() => pick(setBy, 'fork.schedBy')('track')}>Schedule</button>
            <button className={by === 'location' ? 'on' : ''} aria-pressed={by === 'location'} onClick={() => pick(setBy, 'fork.schedBy')('location')}>Location</button>
          </div></div>}
      </div>

      {present.length > 1 && <div className="filters" aria-label="Filter by schedule">
        <button className={`fchip ${!on.size ? 'on' : ''}`} onClick={() => setOn(new Set())}>Everything</button>
        {present.map(t => <button key={t.k} className={`fchip ${on.has(t.k) ? 'on' : ''}`} style={{ '--c': t.c }} aria-pressed={on.has(t.k)} onClick={() => flip(t.k)}>
          <span className="dot" style={{ '--c': t.c }} />{t.n}</button>)}
      </div>}

      {days.map(d => (
        <section key={d} className="day">
          <h3>{d ? fmtDay(d) : 'Day to be announced'}</h3>
          {view === 'towers'
            ? <Towers items={shown.filter(i => (i.day || '') === d)} by={hasLocations ? by : 'track'} sel={sel} onSel={id => setSel(s => (s === id ? null : id))} />
            : shown.filter(i => (i.day || '') === d).map(i => <ListItem key={i.id} i={i} actions={actions} />)}
          {view === 'towers' && selected && (selected.day || '') === d && <Detail i={selected} actions={actions} onClose={() => setSel(null)} />}
        </section>))}
    </div>
  );
}

function ListItem({ i, actions }) {
  const t = TRACK[i.track] || TRACKS[0];
  return (
    <div className="item" style={{ '--c': t.c }}>
      <div className="t">{i.start ? fmtTime(i.start) : 'TBA'}{i.end && <small>to {fmtTime(i.end)}</small>}</div>
      <div>
        <b>{i.title}</b>
        <div className="meta">{t.n}{i.location ? ` · ${i.location}` : ''}{i.lead ? ` · led by ${i.lead}` : ''}</div>
        {i.description && <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{i.description}</div>}
      </div>
      <div>{actions && actions(i)}</div>
    </div>);
}

function Detail({ i, actions, onClose }) {
  const t = TRACK[i.track] || TRACKS[0];
  return (
    <div className="item tl-detail" style={{ '--c': t.c }} role="region" aria-label={`Details for ${i.title}`}>
      <div className="t">{i.start ? fmtTime(i.start) : 'TBA'}{i.end && <small>to {fmtTime(i.end)}</small>}</div>
      <div>
        <b>{i.title}</b>
        <div className="meta">{t.n}{i.location ? ` · ${i.location}` : ''}{i.lead ? ` · led by ${i.lead}` : ''}</div>
        {i.description && <div style={{ marginTop: 4, whiteSpace: 'pre-wrap' }}>{i.description}</div>}
      </div>
      <div className="row" style={{ gap: 6 }}>{actions && actions(i)}<button className="btn ghost sm" onClick={onClose}>Close</button></div>
    </div>);
}

/** Side-by-side columns ("towers"); overlapping items inside one column split into lanes. */
function Towers({ items, by, sel, onSel }) {
  const { cols, tba, startMin, endMin } = useMemo(() => {
    const timed = items.filter(i => toMin(i.start) != null);
    const tba = items.filter(i => toMin(i.start) == null);
    const key = i => (by === 'location' ? (i.location || 'Location TBA') : i.track);
    const colKeys = by === 'location'
      ? [...new Set(timed.map(key))].sort((a, b) => (a === 'Location TBA') - (b === 'Location TBA') || a.localeCompare(b))
      : TRACKS.map(t => t.k).filter(k => timed.some(i => i.track === k));
    let lo = Infinity, hi = -Infinity;
    const cols = colKeys.map(k => {
      const list = timed.filter(i => key(i) === k).map(i => {
        const s = toMin(i.start); let e = toMin(i.end); if (e == null || e <= s) e = s + DEFAULT_MIN;
        lo = Math.min(lo, s); hi = Math.max(hi, e);
        return { i, s, e };
      }).sort((a, b) => a.s - b.s || b.e - a.e);
      // greedy lane assignment, then each item learns how many lanes its overlap cluster uses
      const laneEnd = []; let cluster = [], clusterEnd = -1;
      const flush = () => { const n = Math.max(1, ...cluster.map(x => x.lane + 1)); cluster.forEach(x => { x.lanes = n; }); cluster = []; };
      list.forEach(x => {
        if (x.s >= clusterEnd) { flush(); laneEnd.length = 0; }
        let lane = laneEnd.findIndex(end => end <= x.s); if (lane < 0) lane = laneEnd.length;
        laneEnd[lane] = x.e; x.lane = lane; cluster.push(x); clusterEnd = Math.max(clusterEnd, x.e);
      });
      flush();
      const t = TRACK[k];
      return { k, name: by === 'location' ? k : t.n, c: t?.c, list };
    });
    return { cols, tba, startMin: Math.floor(lo / 60) * 60, endMin: Math.ceil(hi / 60) * 60 };
  }, [items, by]);

  const block = (x, colColor) => {
    const t = TRACK[x.i.track] || TRACKS[0];
    const top = ((x.s - startMin) / 60) * HOUR_PX, h = Math.max(26, ((x.e - x.s) / 60) * HOUR_PX - 3);
    const w = 100 / x.lanes;
    return (
      <button key={x.i.id} className={`tl-block ${sel === x.i.id ? 'on' : ''}`} aria-expanded={sel === x.i.id}
        style={{ '--c': t.c || colColor, top, height: h, left: `calc(${w * x.lane}% + 2px)`, width: `calc(${w}% - 4px)` }}
        onClick={() => onSel(x.i.id)}
        title={`${x.i.title} · ${fmtTime(x.i.start)}${x.i.end ? `–${fmtTime(x.i.end)}` : ''}${x.i.location ? ` · ${x.i.location}` : ''}`}>
        <b>{x.i.title}</b>
        <small>{fmtTime(x.i.start)}{x.i.end ? `–${fmtTime(x.i.end)}` : ''}</small>
        {h > 58 && (by === 'location' ? <small>{t.n}</small> : x.i.location && <small>{x.i.location}</small>)}
      </button>);
  };

  const hours = []; for (let m = startMin; m < endMin; m += 60) hours.push(m);
  const H = ((endMin - startMin) / 60) * HOUR_PX;

  return (
    <div>
      {tba.length > 0 && <div className="tl-tba"><span className="lbl">Time TBA</span>
        {tba.map(i => <button key={i.id} className={`fchip ${sel === i.id ? 'on' : ''}`} style={{ '--c': (TRACK[i.track] || TRACKS[0]).c }} onClick={() => onSel(i.id)}>
          <span className="dot" style={{ '--c': (TRACK[i.track] || TRACKS[0]).c }} />{i.title}</button>)}</div>}
      {cols.length > 0 && (
        <div className="tl-scroll">
          <div className="tl" style={{ gridTemplateColumns: `52px repeat(${cols.length}, minmax(150px, 1fr))` }}>
            <div className="tl-head tl-corner" />
            {cols.map(c => <div key={c.k} className="tl-head" style={{ '--c': c.c || 'var(--muted)' }}>
              {c.c && <span className="dot" style={{ '--c': c.c }} />}{c.name}</div>)}
            <div className="tl-gutter" style={{ height: H }}>
              {hours.map(m => <span key={m} style={{ top: ((m - startMin) / 60) * HOUR_PX }}>{hourLabel(m)}</span>)}
            </div>
            {cols.map(c => <div key={c.k} className="tl-col" style={{ height: H, '--hour': `${HOUR_PX}px` }}>{c.list.map(x => block(x, c.c))}</div>)}
          </div>
        </div>)}
    </div>
  );
}
