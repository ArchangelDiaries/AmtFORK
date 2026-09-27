// Pure mapping from a Herald's Call bid to a new FORK event (no Firebase here, so it's unit-tested).
const num = v => { const n = parseFloat(v); return isFinite(n) ? n : 0; };
const KIND = { midreign: 'midreign', coronation: 'coronation', endreign: 'endreign', special: 'park' };
const looksEmail = s => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());

/** Everything FORK can carry over from a winning bid. */
export function eventFromBid(b) {
  // A park's call (callPark) makes a park-level event; kingdom calls for Midreign or Coronation are kingdom-level.
  const kingdomLevel = !b.callPark && (b.hostType === 'kingdom' || b.category === 'midreign' || b.category === 'coronation');
  const crats = (b.crats || []).filter(r => r.name).map(r => `${r.role}: ${r.name}`);
  const fee = num(b.cost?.feastFee);
  return {
    form: {
      name: b.eventName || 'New event', kind: KIND[b.category] || 'park', scope: kingdomLevel ? 'kingdom' : 'park',
      kingdom: b.kingdom || 'Westmarch', park: b.hostPark || '', startDate: b.start || '', endDate: b.end || b.start || '',
      feast: b.feast ? !!b.feast.offered : null,
    },
    extra: {
      location: b.site?.name || '', address: b.site?.location || '',
      theme: { title: b.theme || '', tagline: '', story: b.themeDesc || '', accent: '#B07F0C' },
      feastDetails: {
        price: b.feast?.offered ? (fee ? `$${fee}` : 'Included with gate') : '', capacity: b.cost?.feastCount || '',
        menu: [b.feast?.meals, b.feast?.menu].filter(Boolean).join('\n'), notes: b.feast?.potluck ? 'Potluck feast.' : '',
      },
      autoNotes: [
        `From the winning bid in The Herald's Call.`,
        crats.length ? `Crats named in the bid: ${crats.join('; ')}.` : '',
        b.submitter?.persona ? `Bid submitted by ${b.submitter.persona}${b.submitter.park ? ` of ${b.submitter.park}` : ''}.` : '',
        b.program?.schedule ? `Program from the bid:\n${b.program.schedule}` : '',
      ].filter(Boolean).join('\n'),
      fromBid: { id: b.id, callId: b.callId || '' },
    },
    autocratEmail: looksEmail(b.submitter?.contact) ? b.submitter.contact.trim().toLowerCase() : '',
    autocratName: b.submitter?.persona || '',
    accepted: (b.decision?.status || b.status) === 'accepted',
  };
}


/** FORK's new-event form -> a Herald's Call "call for bids" (category, who's calling, window, deadline). */
const CALL_CAT = { midreign: 'midreign', coronation: 'coronation', endreign: 'endreign', park: 'special' };
export function callFromForm(f) {
  return {
    category: CALL_CAT[f.kind] || 'special', title: String(f.name || '').trim(), kingdom: f.kingdom || 'Westmarch',
    park: f.scope === 'kingdom' ? '' : (f.park || ''), term: '', windowStart: f.startDate || '', windowEnd: f.endDate || f.startDate || '',
    deadline: f.deadline || '', minCapacity: f.minCapacity || '', requirements: String(f.requirements || '').trim(),
  };
}
