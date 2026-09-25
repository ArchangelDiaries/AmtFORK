import React, { createContext, useContext, useState, useCallback, useRef } from 'react';
import { Routes, Route, Link, Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth, configured } from './lib/firebase.js';
import { useAuth } from './lib/data.js';
import Home from './pages/Home.jsx';
import PublicEvent from './pages/PublicEvent.jsx';
import SignIn from './pages/SignIn.jsx';
import Dashboard from './pages/Dashboard.jsx';
import EventAdmin from './pages/EventAdmin.jsx';

const Ctx = createContext(null);
export const useApp = () => useContext(Ctx);

export function Mark() {
  return (
    <svg className="mark" viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="7" fill="var(--ink)" />
      <path d="M10 6v8a6 6 0 0 0 5 5.9V27h2v-7.1A6 6 0 0 0 22 14V6h-2v8h-2V6h-2v8h-2V6z" fill="var(--accent)" />
    </svg>
  );
}

export function Header({ children }) {
  const { user } = useApp();
  return (
    <header className="top">
      <Link to="/" className="brand">
        <Mark />
        <div>
          <div className="eyebrow">Principality of Stone Rivers · Kingdom of Westmarch</div>
          <h1>FORK</h1>
          <div className="tag">Feast, Organization &amp; Registration Keeper</div>
        </div>
      </Link>
      <nav className="nav">
        {children}
        {user ? <>
          <Link className="btn ghost sm" to="/crat">Crat Hall</Link>
          <button className="btn ghost sm" onClick={() => signOut(auth)}>Sign out</button>
        </> : <Link className="btn ghost sm" to="/signin">Crat sign in</Link>}
      </nav>
    </header>
  );
}

function RequireAuth({ children }) {
  const { user } = useApp();
  if (user === undefined) return <div className="wrap"><p className="muted">Loading…</p></div>;
  if (!user) return <Navigate to="/signin" replace />;
  return children;
}

export default function App() {
  const user = useAuth();
  const [msg, setMsg] = useState('');
  const t = useRef();
  const toast = useCallback(m => { setMsg(m); clearTimeout(t.current); t.current = setTimeout(() => setMsg(''), 2800); }, []);
  return (
    <Ctx.Provider value={{ user, toast }}>
      {!configured && <div style={{ background: 'var(--accent-soft)', padding: '6px 16px', fontSize: '.88rem', textAlign: 'center' }}>
        Demo mode: Firebase isn’t configured, so FORK is talking to the local emulators. See README.
      </div>}
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/e/:id" element={<PublicEvent />} />
        <Route path="/signin" element={<SignIn />} />
        <Route path="/crat" element={<RequireAuth><Dashboard /></RequireAuth>} />
        <Route path="/crat/:id" element={<RequireAuth><EventAdmin /></RequireAuth>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {msg && <div id="toast" role="status">{msg}</div>}
    </Ctx.Provider>
  );
}
