import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Header, useApp } from '../App.jsx';
import { lower } from '../lib/firebase.js';
import { useDoc, useQuery, col } from '../lib/data.js';
import { fmtRange } from '../lib/util.js';
import { ROLE, eventType, eventHost } from '../lib/constants.js';
import Overview from './admin/Overview.jsx';
import Crats from './admin/Crats.jsx';
import ScheduleAdmin from './admin/ScheduleAdmin.jsx';
import Registrations from './admin/Registrations.jsx';
import Feast from './admin/Feast.jsx';

const TABS = [
  { k: 'overview', n: 'Theme & Details' },
  { k: 'crats', n: 'Crats' },
  { k: 'schedule', n: 'Schedule' },
  { k: 'regs', n: 'Registrations' },
  { k: 'feast', n: 'Feast' },
];

export default function EventAdmin() {
  const { id } = useParams();
  const { user } = useApp();
  const ev = useDoc(`events/${id}`);
  const acc = useDoc(`access/${id}`);
  const [tab, setTab] = useState(() => { try { return localStorage.getItem('fork.tab') || 'overview'; } catch (e) { return 'overview'; } });
  useEffect(() => { try { localStorage.setItem('fork.tab', tab); } catch (e) { /* ignore */ } }, [tab]);

  const me = lower(user.email);
  const isOwner = acc.data?.ownerUid === user.uid;
  const roles = acc.data?.roles?.[me] || [];
  const isAuto = isOwner || roles.includes('auto');
  const canFeast = isAuto || roles.includes('feast');
  const sched = useQuery(() => col('events', id, 'schedule'), [id]);
  const regs = useQuery(() => (acc.data ? col('events', id, 'registrations') : null), [id, !!acc.data]);
  const prefs = useQuery(() => (canFeast ? col('events', id, 'feastPrefs') : null), [id, canFeast]);

  if (ev.loading || acc.loading) return <div className="wrap"><Header /><p className="muted">Loading…</p></div>;
  if (!ev.data || !acc.data) return (
    <div className="wrap"><Header /><div className="panel empty"><h2>No access</h2>
      <p>This event doesn’t exist, or <b>{me}</b> isn’t one of its crats. Ask the Autocrat to invite this address.</p>
      <Link className="btn" to="/crat">Back to Crat Hall</Link></div></div>);

  const e = ev.data;
  const ctx = { id, e, access: acc.data, me, roles, isOwner, isAuto, canFeast, sched: sched.rows, regs: regs.rows, prefs: prefs.rows };
  return (
    <div className="wrap" style={e.theme?.accent ? { '--accent': e.theme.accent } : undefined}>
      <Header />
      <div className="row" style={{ justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div className="eyebrow">{eventType(e)} · {eventHost(e)} · {fmtRange(e.startDate, e.endDate)}</div>
          <h2 style={{ fontSize: '1.7rem' }}>{e.name || 'Untitled event'}</h2>
          <div className="checks" style={{ marginTop: 6 }}>
            {(isOwner && !roles.includes('auto') ? ['auto', ...roles] : roles).map(r => <span key={r} className="pill accent">{ROLE[r]?.n}</span>)}
            <span className={`pill ${e.published ? 'good' : ''}`}>{e.published ? 'Published' : 'Draft'}</span>
            {e.registrationOpen ? <span className="pill good">Registration open</span> : <span className="pill">Registration closed</span>}
            <span className="pill">{e.feast?.enabled ? 'Feast' : 'No feast'}</span>
          </div>
        </div>
        <Link className="btn ghost" to={`/e/${id}`} target="_blank">View public page</Link>
      </div>
      <nav className="tabs">{TABS.map(t => (
        <button key={t.k} className={tab === t.k ? 'on' : ''} onClick={() => setTab(t.k)}>
          {t.n}{t.k === 'regs' && regs.rows.length ? ` (${regs.rows.length})` : ''}{t.k === 'feast' && !e.feast?.enabled ? ' · off' : ''}</button>))}
      </nav>
      {tab === 'overview' && <Overview {...ctx} />}
      {tab === 'crats' && <Crats {...ctx} />}
      {tab === 'schedule' && <ScheduleAdmin {...ctx} />}
      {tab === 'regs' && <Registrations {...ctx} />}
      {tab === 'feast' && <Feast {...ctx} />}
    </div>
  );
}
