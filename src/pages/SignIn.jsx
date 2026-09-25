import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signInWithPopup, isSignInWithEmailLink, signInWithEmailLink, sendSignInLinkToEmail } from 'firebase/auth';
import { auth, google, lower } from '../lib/firebase.js';
import { Header, useApp } from '../App.jsx';

const KEY = 'fork.emailForSignIn';

export default function SignIn() {
  const { user, toast } = useApp();
  const nav = useNavigate();
  const [email, setEmail] = useState('');
  const [state, setState] = useState('idle'); // idle | sent | confirm | busy
  const linkMode = isSignInWithEmailLink(auth, location.href);

  useEffect(() => { if (user) nav('/crat', { replace: true }); }, [user, nav]);

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
            <p className="muted">Crats sign in with the email their Autocrat invited. Park members don’t need an account to register for events.</p>
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
