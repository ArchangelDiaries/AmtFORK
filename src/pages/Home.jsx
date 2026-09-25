import React from 'react';
import { Link } from 'react-router-dom';
import { query, where } from 'firebase/firestore';
import { Header } from '../App.jsx';
import { useQuery, col } from '../lib/data.js';
import { fmtRange } from '../lib/util.js';
import { EVENT_KINDS } from '../lib/constants.js';

export default function Home() {
  const { rows, loading } = useQuery(() => query(col('events'), where('published', '==', true)), []);
  const today = new Date().toISOString().slice(0, 10);
  const upcoming = rows.filter(e => (e.endDate || e.startDate || '9999') >= today).sort((a, b) => (a.startDate || '').localeCompare(b.startDate || ''));
  const past = rows.filter(e => !upcoming.includes(e)).sort((a, b) => (b.startDate || '').localeCompare(a.startDate || ''));
  const card = e => (
    <Link key={e.id} to={`/e/${e.id}`} className="panel card" style={{ '--ev': e.theme?.accent }}>
      <div className="eyebrow">{EVENT_KINDS.find(k => k.k === e.kind)?.n} · {e.park}</div>
      <h3>{e.name}</h3>
      {e.theme?.title && <div style={{ fontFamily: 'var(--display)', color: e.theme.accent }}>{e.theme.title}</div>}
      <div className="muted">{fmtRange(e.startDate, e.endDate)}{e.location ? ` · ${e.location}` : ''}</div>
      {e.registrationOpen && <span className="pill good" style={{ justifySelf: 'start' }}>Registration open</span>}
    </Link>
  );
  return (
    <div className="wrap">
      <Header />
      <h2 style={{ fontSize: '1.5rem', marginBottom: 12 }}>Upcoming events</h2>
      {loading ? <p className="muted">Loading…</p> : upcoming.length ? <div className="cards">{upcoming.map(card)}</div>
        : <div className="panel empty"><h2>No events posted yet</h2><p>When your park’s Autocrat publishes an event, it shows up here with its schedule and signup.</p></div>}
      {past.length > 0 && <>
        <h2 style={{ fontSize: '1.3rem', margin: '28px 0 12px' }}>Past events</h2>
        <div className="cards">{past.map(card)}</div>
      </>}
    </div>
  );
}
