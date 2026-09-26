import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBids, CATS, BID_ST, fRange, num, money, yearOf, hostLabel } from '../../lib/bids.js';
import { CatMark, BidPill } from './common.jsx';

export default function Archive() {
  const nav = useNavigate();
  const { bids, st, callById } = useBids();
  const [A, setA] = useState(() => { try { return JSON.parse(sessionStorage.getItem('bids.arch')) || {}; } catch (e) { return {}; } });
  const f = { q: '', kingdom: 'all', cat: 'all', year: 'all', status: 'all', ...A };
  const set = p => { const n = { ...f, ...p }; setA(n); try { sessionStorage.setItem('bids.arch', JSON.stringify(n)); } catch (e) { /* ignore */ } };

  const all = bids.filter(b => st(b) !== 'draft');
  const kingdoms = [...new Set(all.map(b => b.kingdom).filter(Boolean))].sort();
  const years = [...new Set(all.map(yearOf).filter(Boolean))].sort().reverse();
  const q = f.q.toLowerCase();
  const list = all.filter(b => (f.kingdom === 'all' || b.kingdom === f.kingdom) && (f.cat === 'all' || b.category === f.cat)
    && (f.year === 'all' || yearOf(b) === f.year) && (f.status === 'all' || st(b) === f.status)
    && (!q || [b.eventName, b.theme, b.hostPark, b.site?.name, b.site?.location, b.submitter?.persona, ...Object.values(b.crats || {}), callById(b.callId)?.title].join(' ').toLowerCase().includes(q)))
    .sort((a, b) => (b.start || '').localeCompare(a.start || ''));
  const won = list.filter(b => st(b) === 'accepted');
  const att = list.map(b => num(b.attendance?.expected)).filter(Boolean);
  const gates = list.map(b => num(b.cost?.gatePre)).filter(Boolean).sort((a, b) => a - b);

  return (
    <div className="stack">
      <div className="filters archf">
        <input className="search" type="search" aria-label="Search bids" placeholder="Search events, sites, hosts, crats" value={f.q} onChange={e => set({ q: e.target.value })} />
        <select aria-label="Kingdom" value={f.kingdom} onChange={e => set({ kingdom: e.target.value })}><option value="all">All kingdoms</option>{kingdoms.map(k => <option key={k}>{k}</option>)}</select>
        <select aria-label="Event type" value={f.cat} onChange={e => set({ cat: e.target.value })}><option value="all">All event types</option>{CATS.map(c => <option key={c.k} value={c.k}>{c.n}</option>)}</select>
        <select aria-label="Year" value={f.year} onChange={e => set({ year: e.target.value })}><option value="all">All years</option>{years.map(y => <option key={y}>{y}</option>)}</select>
        <select aria-label="Outcome" value={f.status} onChange={e => set({ status: e.target.value })}><option value="all">Any outcome</option>{Object.entries(BID_ST).filter(([k]) => k !== 'draft').map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
      </div>
      <div className="tiles">
        <div className="tile"><div className="l">Bids on file</div><div className="v">{list.length}</div></div>
        <div className="tile"><div className="l">Won their event</div><div className="v">{won.length}</div></div>
        <div className="tile"><div className="l">Avg. expected</div><div className="v">{att.length ? Math.round(att.reduce((a, b) => a + b, 0) / att.length) : '—'}</div></div>
        <div className="tile"><div className="l">Median gate</div><div className="v">{gates.length ? money(gates[Math.floor(gates.length / 2)]) : '—'}</div></div>
      </div>
      <div className="panel">
        {list.length ? <div className="scroll"><table><thead><tr><th>Event</th><th>Type</th><th>Kingdom</th><th>Dates</th><th>Site</th><th className="n">Expected</th><th className="n">Gate</th><th>Outcome</th></tr></thead><tbody>
          {list.map(b => (
            <tr key={b.id} className="click" tabIndex={0} onClick={() => nav(`/bids/${b.id}`)} onKeyDown={e => e.key === 'Enter' && nav(`/bids/${b.id}`)}>
              <td><b>{b.eventName}</b><small>{b.theme}{b.submitter?.persona ? ` · ${b.submitter.persona}` : ''}</small></td>
              <td><CatMark k={b.category} /></td>
              <td>{b.kingdom}<small>{hostLabel(b)}</small></td>
              <td>{fRange(b.start, b.end)}</td>
              <td>{b.site?.name}<small>{b.site?.location}</small></td>
              <td className="n">{num(b.attendance?.expected) || '—'}</td>
              <td className="n">{b.cost?.gatePre !== '' && b.cost?.gatePre !== undefined ? money(num(b.cost.gatePre)) : '—'}</td>
              <td><BidPill s={st(b)} />{b.eventId && <small>Became a FORK event</small>}</td>
            </tr>))}
        </tbody></table></div> : <p className="muted" style={{ fontStyle: 'italic' }}>No bids match these filters.</p>}
        <p className="hint">Open any bid to read the full sheet, or use it as a template for your own.</p>
      </div>
    </div>
  );
}
