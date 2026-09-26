import React, { useState } from 'react';
import { useApp } from '../../App.jsx';
import { assignCrat, sendInvite, updateEvent } from '../../lib/data.js';
import { ROLES, TRACK } from '../../lib/constants.js';

export default function Crats({ id, e, access, roles, isAuto }) {
  const { toast } = useApp();
  const [edit, setEdit] = useState(null); // { role, name, email }
  const [notes, setNotes] = useState({});
  const contacts = access.contacts || {};
  const signinUrl = `${location.origin}/signin`;

  async function save(ev, invite) {
    ev?.preventDefault();
    try {
      await assignCrat(id, access, edit.role, edit.name.trim(), edit.email.trim());
      if (invite && edit.email) {
        try { await sendInvite(edit.email); toast(`Invite emailed to ${edit.email}.`); }
        catch (err) { console.error(err); toast('Crat saved. The invite email didn’t send, so copy the invite message instead.'); }
      } else toast(edit.email ? 'Crat saved.' : 'Crat removed.');
      setEdit(null);
    } catch (err) { console.error(err); toast('Only the Autocrat can assign crats.'); }
  }
  async function copyInvite(role) {
    const c = contacts[role];
    const msg = `Greetings ${c.name}! You’ve been named ${ROLE_N(role)} for ${e.name}. Sign in to FORK with ${c.email} to manage your part of the event: ${signinUrl}`;
    try { await navigator.clipboard.writeText(msg); toast('Invite message copied.'); } catch (err) { window.prompt('Copy this invite:', msg); }
  }
  async function saveNote(role) {
    try { await updateEvent(id, { [`notes.${role}`]: notes[role] ?? '' }); toast('Notes saved.'); setNotes(n => { const x = { ...n }; delete x[role]; return x; }); }
    catch (err) { toast('You can only edit notes for your own crat role.'); }
  }

  return (
    <div className="panel">
      <h2>Crats</h2>
      <p className="hint" style={{ marginTop: -6 }}>Crats sign in with the email you give here. Their name shows on the public event page. Their email stays private to the crat team.</p>
      {ROLES.map(r => {
        const c = contacts[r.k]; const mine = roles.includes(r.k) || isAuto;
        const tracks = r.tracks === '*' ? 'Everything' : r.tracks.length ? r.tracks.map(t => TRACK[t].n).join(', ') : 'View only';
        return (
          <div key={r.k} className="crat">
            <div className="head">
              <div><b style={{ fontFamily: 'var(--display)', fontSize: '1.1rem' }}>{r.n}</b> <span className="hint">· {r.d}</span></div>
              <span className="hint">Edits: {tracks}</span>
            </div>
            {edit?.role === r.k ? (
              <form className="row" onSubmit={ev => save(ev, false)}>
                <div className="field"><label htmlFor={`n-${r.k}`}>Persona</label><input id={`n-${r.k}`} value={edit.name} onChange={x => setEdit({ ...edit, name: x.target.value })} /></div>
                <div className="field" style={{ flexBasis: 240 }}><label htmlFor={`e-${r.k}`}>Email</label><input id={`e-${r.k}`} type="email" value={edit.email} onChange={x => setEdit({ ...edit, email: x.target.value })} placeholder="Leave blank to remove" /></div>
                <button className="btn ghost">Save</button>
                <button type="button" className="btn" disabled={!edit.email} onClick={ev => save(ev, true)}>Save &amp; email invite</button>
                <button type="button" className="btn ghost" onClick={() => setEdit(null)}>Cancel</button>
              </form>
            ) : (
              <div className="row" style={{ alignItems: 'center' }}>
                {c ? <span><b>{c.name}</b> <span className="muted">· {c.email}</span></span> : <span className="muted">Not assigned</span>}
                {isAuto && <button className="btn ghost sm" onClick={() => setEdit({ role: r.k, name: c?.name || '', email: c?.email || '' })}>{c ? 'Change' : 'Assign'}</button>}
                {isAuto && c && <button className="btn ghost sm" onClick={() => copyInvite(r.k)}>Copy invite message</button>}
              </div>
            )}
            {(mine || e.notes?.[r.k]) && (
              <div className="field">
                <label htmlFor={`note-${r.k}`}>{r.n} notes {mine ? '' : '(read only)'}</label>
                <textarea id={`note-${r.k}`} rows={2} readOnly={!mine} value={notes[r.k] ?? e.notes?.[r.k] ?? ''}
                  onChange={x => setNotes(n => ({ ...n, [r.k]: x.target.value }))}
                  placeholder={r.k === 'water' ? 'Water stations, refill runs, cooler count…' : r.k === 'safety' ? 'First aid kit, nearest urgent care, heat plan…' : r.k === 'troll' ? 'Gate hours, waiver table, site fee…' : 'Plans, needs, and to-dos for this role'} />
                {mine && notes[r.k] !== undefined && <div><button className="btn sm" onClick={() => saveNote(r.k)}>Save notes</button></div>}
              </div>)}
          </div>);
      })}
    </div>
  );
}
const ROLE_N = k => ROLES.find(r => r.k === k)?.n || k;
