import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, isSignInWithEmailLink, signInWithEmailLink, sendSignInLinkToEmail, signInWithCustomToken, updateProfile } from 'firebase/auth';
import { auth, google, lower } from '../lib/firebase.js';
import { Header, useApp } from '../App.jsx';

const KEY = 'fork.emailForSignIn';

export default function SignIn() {
  const { user, toast } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | sent | confirm | busy
  const linkMode = isSignInWithEmailLink(auth, location.href);

  // ?next=/herald/ (or another page on this site) sends people back where they came from.
  const next = (() => { const n = new URLSearchParams(location.search).get('next') || ''; return /^\/(?!\/)/.test(n) ? n : '/crat'; })();
  const go = () => (next.startsWith('/herald') ? location.assign(next) : nav(next, { replace: true }));
  useEffect(() => { if (user) go(); }, [user]); // eslint-disable-line react-hooks/exhaustive-deps
  const [ork, setOrk] = useState({ username: '', password: '', busy: false, err: '' });

  async function withOrk(e) {
    e.preventDefault(); setOrk(o => ({ ...o, busy: true, err: '' }));
    try {
      const r = await fetch('/api/ork-login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ username: ork.username, password: ork.password }) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.token) throw new Error(j.error || 'ORK sign-in failed.');
      const cred = await signInWithCustomToken(auth, j.token);
      if (j.persona && cred.user.displayName !== j.persona) await updateProfile(cred.user, { displayName: j.persona }).catch(() => {});
      setOrk({ username: '', password: '', busy: false, err: '' });
      toast(`Welcome, ${j.persona || 'friend'}${j.officer ? ` (${j.officer})` : ''}.`);
    } catch (err) { setOrk(o => ({ ...o, password: '', busy: false, err: err.message })); }
  }

  useEffect(() => {
    if (!linkMode) return;
    let saved = ''; try { saved = localStorage.getItem(KEY) || ''; } catch (e) { /* private mode */ }
    if (saved) finish(saved); else setState('confirm');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function finish(addr) {
    setState('busy');
    try {
      await signInWithEmailLink(auth, lower(addr), location.href);
      try { localStorage.removeItem(KEY); } catch (e) { /* ignore */ }
    } catch (e) { console.error(e); toast('That sign-in link expired or was already used. Send a new one.'); setState('idle'); }
  }
  async function sendLink(e) {
    e.preventDefault(); setState('busy');
    try {
      await sendSignInLinkToEmail(auth, lower(email), { url: `${location.origin}/signin`, handleCodeInApp: true });
      try { localStorage.setItem(KEY, lower(email)); } catch (e2) { /* ignore */ }
      setState('sent');
    } catch (e2) { console.error(e2); toast('Couldn’t send the link. Check the address.'); setState('idle'); }
  }
  async function withGoogle() {
    try { await signInWithPopup(auth, google); } catch (e) { if (e.code !== 'auth/popup-closed-by-user') toast('Google sign-in failed.'); }
  }

  return (
    <div className="wrap">
      <Header />
      <div className="panel" style={{ maxWidth: 520, margin: '0 auto' }}>
        <h2>Crat Hall sign in</h2>
        {state === 'confirm' ? (
          <form className="form" onSubmit={e => { e.preventDefault(); finish(email); }}>
            <p>Confirm the email address your invite was sent to.</p>
            <div className="field"><label htmlFor="em">Email</label><input id="em" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
            <button className="btn">Finish signing in</button>
          </form>
        ) : state === 'sent' ? (
          <div className="note ok">Check <b>{email}</b> for a sign-in link. Open it on this device.</div>
        ) : (
          <div className="form">
            <p className="muted">Crats and event hosts sign in here. Park members don’t need an account to register for events.</p>
            <form className="form note" onSubmit={withOrk}>
              <b>Sign in with your ORK account</b>
              <div className="row">
                <div className="field"><label htmlFor="ou">ORK username</label><input id="ou" autoComplete="username" required value={ork.username} onChange={e => setOrk({ ...ork, username: e.target.value })} /></div>
                <div className="field"><label htmlFor="op">ORK password</label><input id="op" type="password" autoComplete="current-password" required value={ork.password} onChange={e => setOrk({ ...ork, password: e.target.value })} /></div>
              </div>
              {ork.err && <div className="note bad" role="alert">{ork.err}</div>}
              <div><button className="btn" disabled={ork.busy}>{ork.busy ? 'Checking with the ORK…' : 'Sign in with ORK'}</button></div>
              <span className="hint">FORK passes your password straight to the ORK to confirm it’s you, and never stores or logs it. Current park and kingdom officers are recognized automatically.</span>
            </form>
            <div className="hint" style={{ textAlign: 'center' }}>or</div>
            <button className="btn" onClick={withGoogle} disabled={state === 'busy'}>Continue with Google</button>
            <div className="hint" style={{ textAlign: 'center' }}>or get a sign-in link by email</div>
            <form className="row" onSubmit={sendLink}>
              <div className="field"><label htmlFor="em2">Email</label><input id="em2" type="email" required value={email} onChange={e => setEmail(e.target.value)} /></div>
              <button className="btn ghost" disabled={state === 'busy'}>Email me a link</button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
