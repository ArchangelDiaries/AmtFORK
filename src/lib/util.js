export const parseDate = d => { if (!d) return null; const [y, m, dd] = d.split('-').map(Number); return new Date(y, m - 1, dd); };
export const fmtDay = d => parseDate(d)?.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' }) || '';
export const fmtDate = d => parseDate(d)?.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || '';
export function fmtRange(a, b) {
  if (!a) return 'Date to be announced';
  if (!b || a === b) return fmtDate(a);
  return `${fmtDate(a)} – ${fmtDate(b)}`;
}
export function eventDays(ev) {
  const s = parseDate(ev.startDate); if (!s) return [];
  const e = parseDate(ev.endDate) || s; const out = [];
  for (let d = new Date(s); d <= e && out.length < 14; d.setDate(d.getDate() + 1))
    out.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`);
  return out;
}
export function fmtTime(t) {
  if (!t) return ''; const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')} ${h < 12 ? 'AM' : 'PM'}`;
}
export const sortItems = items => [...items].sort((a, b) =>
  (a.day || '').localeCompare(b.day || '') || (a.start || '99').localeCompare(b.start || '99') || (a.title || '').localeCompare(b.title || ''));

export function toCsv(rows, cols) {
  const q = v => { const s = v == null ? '' : String(v); return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s; };
  return [cols.map(c => q(c.h)).join(','), ...rows.map(r => cols.map(c => q(c.v(r))).join(','))].join('\n');
}
export function downloadCsv(name, text) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(new Blob([text], { type: 'text/csv' }));
  a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
}
export const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
