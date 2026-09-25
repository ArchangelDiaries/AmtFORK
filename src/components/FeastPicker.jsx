import React from 'react';
import { DIETS, RESTRICTIONS, ALLERGENS, ALLERGEN_LABEL } from '../lib/constants.js';

export const emptyFeast = () => ({ noRestrictions: false, diets: [], restrictions: [], allergens: {}, notes: '' });

/** Same categories as the ORK's Dietary Preferences so ORK data maps 1:1. */
export default function FeastPicker({ value, onChange }) {
  const v = value;
  const set = patch => onChange({ ...v, ...patch });
  const toggle = (key, item) => {
    const has = v[key].includes(item);
    set({ [key]: has ? v[key].filter(x => x !== item) : [...v[key], item], noRestrictions: false });
  };
  const sev = (a, n) => {
    const allergens = { ...v.allergens };
    if (n) allergens[a] = n; else delete allergens[a];
    set({ allergens, noRestrictions: false });
  };
  return (
    <div className="form">
      <div className="checks">
        <label className={v.noRestrictions ? 'on' : ''}>
          <input type="checkbox" checked={v.noRestrictions}
            onChange={e => set(e.target.checked ? { ...emptyFeast(), notes: v.notes, noRestrictions: true } : { noRestrictions: false })} />
          I have no dietary restrictions
        </label>
      </div>
      <fieldset style={{ border: 0, padding: 0, margin: 0 }} disabled={v.noRestrictions}>
        <div className="form" style={{ opacity: v.noRestrictions ? .45 : 1 }}>
          <div><div className="lbl" style={{ marginBottom: 6 }}>Diet</div>
            <div className="checks">{DIETS.map(d => (
              <label key={d} className={v.diets.includes(d) ? 'on' : ''}><input type="checkbox" checked={v.diets.includes(d)} onChange={() => toggle('diets', d)} />{d}</label>))}
            </div></div>
          <div><div className="lbl" style={{ marginBottom: 6 }}>Won’t eat</div>
            <div className="checks">{RESTRICTIONS.map(d => (
              <label key={d} className={v.restrictions.includes(d) ? 'on' : ''}><input type="checkbox" checked={v.restrictions.includes(d)} onChange={() => toggle('restrictions', d)} />{d}</label>))}
            </div></div>
          <div><div className="lbl" style={{ marginBottom: 6 }}>Allergies</div>
            <div className="agrid">{ALLERGENS.map(a => {
              const n = v.allergens[a] || 0;
              return (
                <div key={a} className="arow">
                  <span>{ALLERGEN_LABEL[a] || a}</span>
                  <span className="seg" role="radiogroup" aria-label={`${ALLERGEN_LABEL[a] || a} allergy`}>
                    <button type="button" role="radio" aria-checked={n === 0} className={n === 0 ? 'on' : ''} onClick={() => sev(a, 0)}>OK</button>
                    <button type="button" role="radio" aria-checked={n === 1} className={n === 1 ? 'on m' : ''} onClick={() => sev(a, 1)}>Mild</button>
                    <button type="button" role="radio" aria-checked={n === 2} className={n === 2 ? 'on s' : ''} onClick={() => sev(a, 2)}>Severe</button>
                  </span>
                </div>);
            })}</div></div>
        </div>
      </fieldset>
      <div className="field"><label htmlFor="fnotes">Anything else the Feastcrat should know</label>
        <textarea id="fnotes" rows={2} maxLength={500} value={v.notes} onChange={e => set({ notes: e.target.value })} placeholder="Cross-contamination concerns, bringing my own plate, etc." /></div>
    </div>
  );
}
