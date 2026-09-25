import React, { useEffect, useState } from 'react';
import { useApp } from '../../App.jsx';
import { updateEvent } from '../../lib/data.js';
import { DIETS, RESTRICTIONS, ALLERGENS, ALLERGEN_LABEL, SEVERITY } from '../../lib/constants.js';
import { toCsv, downloadCsv, slug } from '../../lib/util.js';

export default function Feast({ id, e, prefs, regs, canFeast }) {
  const { toast } = useApp();
  const [f, setF] = useState(e.feast || {});
  const [dirty, setDirty] = useState(false);
  useEffect(() => { if (!dirty) setF(e.feast || {}); }, [e.feast, dirty]);
  const set = p => { setF(x => ({ ...x, ...p })); setDirty(true); };

  async function save(ev) {
    ev.preventDefault();
    try { await updateEvent(id, { feast: { enabled: !!f.enabled, price: f.price || '', capacity: f.capacity || '', menu: f.menu || '', notes: f.notes || '' } }); setDirty(false); toast('Feast saved.'); }
    catch (err) { toast('Only the Feastcrat or Autocrat can edit the feast.'); }
  }

  if (!canFeast) return <div className="panel"><h2>Feast</h2><p className="muted">Dietary details are private to the Autocrat and Feastcrat.</p>
    <p>{regs.filter(r => r.feast).length} people signed up for feast.</p></div>;

  const n = prefs.length;
  const cap = Number(f.capacity) || 0;
  const tally = (list, key) => list.map(k => [k, prefs.filter(p => (p[key] || []).includes(k)).length]).filter(x => x[1]).sort((a, b) => b[1] - a[1]);
  const diets = tally(DIETS, 'diets'), restr = tally(RESTRICTIONS, 'restrictions');
  const allergens = ALLERGENS.map(a => [a, prefs.filter(p => p.allergens?.[a] === 2).length, prefs.filter(p => p.allergens?.[a] === 1).length])
    .filter(x => x[1] || x[2]).sort((a, b) => b[1] - a[1] || b[2] - a[2]);
  const severe = prefs.filter(p => Object.values(p.allergens || {}).includes(2));
  const noR = prefs.filter(p => p.noRestrictions).length;
  const fromOrk = prefs.filter(p => p.source === 'ork').length;
  const max = Math.max(1, ...diets.map(x => x[1]), ...restr.map(x => x[1]));
  const bars = rows => rows.map(([k, v]) => <div key={k} className="cnt"><span>{k}</span><div className="bar"><i style={{ width: `${(v / max) * 100}%` }} /></div><span className="num" style={{ textAlign: 'right' }}>{v}</span></div>);
  const al = a => ALLERGEN_LABEL[a] || a;
  const summary = p => p.noRestrictions ? 'No restrictions' : [
    ...(p.diets || []), ...(p.restrictions || []).map(r => `no ${r.toLowerCase()}`),
    ...Object.entries(p.allergens || {}).map(([a, s]) => `${al(a)} (${SEVERITY[s]})`)].join(', ') || 'Nothing listed';

  function exportCsv() {
    downloadCsv(`${slug(e.name)}-feast.csv`, toCsv([...prefs].sort((a, b) => (a.persona || '').localeCompare(b.persona || '')), [
      { h: 'Persona', v: p => p.persona }, { h: 'No restrictions', v: p => (p.noRestrictions ? 'yes' : '') },
      { h: 'Diet', v: p => (p.diets || []).join('; ') }, { h: "Won't eat", v: p => (p.restrictions || []).join('; ') },
      { h: 'Severe allergies', v: p => Object.entries(p.allergens || {}).filter(x => x[1] === 2).map(x => al(x[0])).join('; ') },
      { h: 'Mild allergies', v: p => Object.entries(p.allergens || {}).filter(x => x[1] === 1).map(x => al(x[0])).join('; ') },
      { h: 'Notes', v: p => p.notes }, { h: 'Source', v: p => (p.source === 'ork' ? 'ORK profile' : 'Form') },
    ]));
  }

  return (
    <div className="stack">
      <div className="tiles">
        <div className="tile"><div className="l">Eating at feast</div><div className="v">{n}{cap ? <span className="muted" style={{ fontSize: '1rem' }}> / {cap}</span> : ''}</div></div>
        <div className="tile"><div className="l">No restrictions</div><div className="v">{noR}</div></div>
        <div className="tile"><div className="l">Severe allergies</div><div className="v" style={{ color: severe.length ? 'var(--warn)' : undefined }}>{severe.length}</div></div>
        <div className="tile"><div className="l">Filled from ORK</div><div className="v">{fromOrk}</div></div>
      </div>

      {severe.length > 0 && <div className="panel" style={{ borderColor: 'var(--warn)' }}>
        <h2>Severe allergies</h2>
        <p className="hint" style={{ marginTop: -6 }}>Label these plates and keep their food separate.</p>
        <table><tbody>{severe.sort((a, b) => a.persona.localeCompare(b.persona)).map(p => (
          <tr key={p.id}><td><b>{p.persona}</b></td><td>{Object.entries(p.allergens).filter(x => x[1] === 2).map(x => <span key={x[0]} className="pill warn" style={{ marginRight: 4 }}>{al(x[0])}</span>)}
            {p.notes && <div className="hint">“{p.notes}”</div>}</td></tr>))}</tbody></table>
      </div>}

      <div className="grid2">
        <div className="panel"><h2>Diets</h2>{diets.length ? bars(diets) : <p className="muted">None listed.</p>}
          <h2 style={{ marginTop: 16 }}>Won’t eat</h2>{restr.length ? bars(restr) : <p className="muted">None listed.</p>}</div>
        <div className="panel"><h2>Allergens</h2>
          {allergens.length ? <table><thead><tr><th>Allergen</th><th className="n">Severe</th><th className="n">Mild</th></tr></thead>
            <tbody>{allergens.map(([a, s, m]) => <tr key={a}><td>{al(a)}</td><td className="n" style={{ color: s ? 'var(--warn)' : undefined, fontWeight: s ? 800 : 400 }}>{s || '—'}</td><td className="n">{m || '—'}</td></tr>)}</tbody></table>
            : <p className="muted">No allergies listed.</p>}</div>
      </div>

      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 8 }}><h2 style={{ margin: 0 }}>Everyone at feast</h2>
          <button className="btn ghost" onClick={exportCsv} disabled={!n}>Download CSV</button></div>
        {n ? <div className="scroll"><table><tbody>{[...prefs].sort((a, b) => (a.persona || '').localeCompare(b.persona || '')).map(p => (
          <tr key={p.id}><td><b>{p.persona}</b>{p.source === 'ork' && <> <span className="pill good">ORK</span></>}</td><td>{summary(p)}{p.notes && <div className="hint">“{p.notes}”</div>}</td></tr>))}
        </tbody></table></div> : <p className="muted">No one has signed up for feast yet.</p>}
      </div>

      <form className="panel form" onSubmit={save}>
        <h2>Feast settings</h2>
        <div className="checks"><label className={f.enabled ? 'on' : ''}><input type="checkbox" checked={!!f.enabled} onChange={x => set({ enabled: x.target.checked })} />This event has a feast</label></div>
        <div className="row">
          <div className="field"><label htmlFor="fp">Price</label><input id="fp" value={f.price || ''} onChange={x => set({ price: x.target.value })} placeholder="$10, kids under 12 free" /></div>
          <div className="field"><label htmlFor="fc">Seats (optional)</label><input id="fc" type="number" min="0" value={f.capacity || ''} onChange={x => set({ capacity: x.target.value })} /></div>
        </div>
        <div className="field"><label htmlFor="fm">Menu</label><textarea id="fm" rows={4} value={f.menu || ''} onChange={x => set({ menu: x.target.value })} placeholder="First remove: …" /></div>
        <div className="field"><label htmlFor="fn">Notes for diners</label><textarea id="fn" rows={2} value={f.notes || ''} onChange={x => set({ notes: x.target.value })} placeholder="Bring your own feast gear…" /></div>
        <p className="hint">Meal and feast times go on the Schedule tab under Meals &amp; Feast.</p>
        <div><button className="btn" disabled={!dirty}>Save feast</button></div>
      </form>
    </div>
  );
}
