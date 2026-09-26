import React, { useState } from 'react';
import { useApp } from '../../App.jsx';
import { setCheckIn, removeRegistration } from '../../lib/data.js';
import { eventDays, fmtDay, toCsv, downloadCsv, slug } from '../../lib/util.js';
import { ORK_PLAYER_URL } from '../../lib/constants.js';
import { DIV } from '../../lib/fieldMarshal.js';

export default function Registrations({ id, e, regs, roles, isAuto }) {
  const { toast } = useApp();
  const [q, setQ] = useState('');
  const [armed, setArmed] = useState(null);
  const canGate = isAuto || roles.includes('troll');
  const days = eventDays(e);
  const rows = regs.filter(r => !q || `${r.persona} ${r.park} ${r.kingdom}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => (a.persona || '').localeCompare(b.persona || ''));
  const count = fn => regs.filter(fn).length;
  const parks = Object.entries(regs.reduce((m, r) => { const p = r.park || 'Unknown'; m[p] = (m[p] || 0) + 1; return m; }, {})).sort((a, b) => b[1] - a[1]);

  async function gate(r) { try { await setCheckIn(id, r.id, !r.checkedIn); } catch (err) { toast('Only the Gatecrat or Autocrat can check people in.'); } }
  async function del(r) {
    if (armed !== r.id) { setArmed(r.id); setTimeout(() => setArmed(a => (a === r.id ? null : a)), 4000); return; }
    try { await removeRegistration(id, r.id, r.feast); toast('Registration removed.'); } catch (err) { toast('Only the Autocrat can remove registrations.'); }
  }
  function exportCsv() {
    downloadCsv(`${slug(e.name)}-registrations.csv`, toCsv(rows, [
      { h: 'Persona', v: r => r.persona }, { h: 'Park', v: r => r.park }, { h: 'Kingdom', v: r => r.kingdom },
      { h: 'ORK ID', v: r => r.orkId }, { h: 'Email', v: r => r.email }, { h: 'Days', v: r => (r.days || []).join(' ') },
      { h: 'Feast', v: r => (r.feast ? 'yes' : 'no') }, { h: 'Tournament divisions', v: r => (r.tourneyDivs || []).map(k => DIV[k]?.n || k).join('; ') }, { h: 'Checked in', v: r => (r.checkedIn ? 'yes' : 'no') }, { h: 'Notes', v: r => r.notes },
    ]));
  }

  return (
    <div className="stack">
      <div className="tiles">
        <div className="tile"><div className="l">Registered</div><div className="v">{regs.length}</div></div>
        <div className="tile"><div className="l">Checked in</div><div className="v">{count(r => r.checkedIn)}</div></div>
        <div className="tile"><div className="l">At feast</div><div className="v">{count(r => r.feast)}</div></div>
        {days.length > 1 && days.map(d => <div key={d} className="tile"><div className="l">{fmtDay(d).split(',')[0]}</div><div className="v">{count(r => (r.days || days).includes(d))}</div></div>)}
      </div>
      {parks.length > 0 && <div className="panel"><h2>By park</h2>
        {parks.map(([p, n]) => <div key={p} className="cnt"><span>{p}</span><div className="bar"><i style={{ width: `${(n / parks[0][1]) * 100}%` }} /></div><span className="num" style={{ textAlign: 'right' }}>{n}</span></div>)}
      </div>}
      <div className="panel">
        <div className="row" style={{ justifyContent: 'space-between', marginBottom: 10 }}>
          <div className="field" style={{ flex: '0 1 300px' }}><label htmlFor="rq">Find</label><input id="rq" type="search" value={q} onChange={x => setQ(x.target.value)} placeholder="Persona or park" /></div>
          <button className="btn ghost" onClick={exportCsv} disabled={!rows.length}>Download CSV</button>
        </div>
        {rows.length ? (
          <div className="scroll"><table>
            <thead><tr><th>Persona</th><th>Park</th><th>Days</th><th>Feast</th>{e.warmaster && <th>Tourney</th>}<th>Gate</th>{isAuto && <th></th>}</tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id}>
                <td><b>{r.persona}</b>{r.orkId && <> · <a href={ORK_PLAYER_URL(r.orkId)} target="_blank" rel="noopener" className="hint">ORK #{r.orkId}</a></>}
                  {r.email && <div className="hint">{r.email}</div>}{r.notes && <div className="hint">“{r.notes}”</div>}</td>
                <td>{r.park}{r.kingdom && <div className="hint">{r.kingdom}</div>}</td>
                <td className="hint">{(r.days || []).length === days.length ? 'All' : (r.days || []).map(d => fmtDay(d).split(',')[0]).join(', ')}</td>
                <td>{r.feast ? <span className="pill good">Yes</span> : <span className="muted">No</span>}</td>
                {e.warmaster && <td className="hint">{(r.tourneyDivs || []).map(k => DIV[k]?.n || k).join(', ') || '—'}</td>}
                <td>{canGate ? <button className={`btn sm ${r.checkedIn ? '' : 'ghost'}`} onClick={() => gate(r)}>{r.checkedIn ? 'Checked in' : 'Check in'}</button>
                  : r.checkedIn ? <span className="pill good">In</span> : <span className="muted">—</span>}</td>
                {isAuto && <td><button className={`btn sm ${armed === r.id ? 'danger' : 'ghost'}`} onClick={() => del(r)}>{armed === r.id ? 'Confirm' : 'Remove'}</button></td>}
              </tr>))}</tbody>
          </table></div>
        ) : <p className="muted">{regs.length ? 'No one matches.' : 'No registrations yet. Share the public page link once the event is published.'}</p>}
      </div>
    </div>
  );
}
