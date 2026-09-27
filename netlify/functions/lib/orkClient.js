// Shared ORK web-service client for FORK's functions. Follows the ORK team's "Amtgard ORK — API Access":
// key only in X-Ork-Key, product name in X-ORK-Client, descriptive User-Agent, secrets only in a POST body.
export const ORK_JSON = 'https://ork.amtgard.com/orkservice/Json/index.php';
export const CLIENT = () => process.env.ORK_CLIENT || 'FORK/1.0';
const SITE = () => process.env.URL || 'https://amtgardfork.netlify.app';
const UA = () => `${CLIENT()} (+${SITE()}${process.env.ORK_CONTACT ? `; ${process.env.ORK_CONTACT}` : ''})`;

export class OrkBlocked extends Error {}

async function send(url, init, fetchImpl) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 8000);
  try {
    const r = await fetchImpl(url, { ...init, signal: ctl.signal });
    const text = await r.text();
    if (r.status === 403 || /<title>\s*Just a moment/i.test(text)) throw new OrkBlocked('blocked');
    if (!r.ok) throw new Error(`ORK answered ${r.status}`);
    return JSON.parse(text);
  } finally { clearTimeout(t); }
}
const headers = key => ({ 'X-Ork-Key': key || '', 'X-ORK-Client': CLIENT(), 'User-Agent': UA(), Accept: 'application/json' });

/** Read-only call (nothing secret, so GET is fine). */
export function orkCall(call, request = {}, { key = process.env.ORK_API_KEY, fetchImpl = fetch } = {}) {
  const u = new URL(ORK_JSON);
  u.searchParams.set('call', call);
  for (const [k, v] of Object.entries(request)) u.searchParams.set(`request[${k}]`, String(v));
  return send(u.toString(), { headers: headers(key) }, fetchImpl);
}

/** Call carrying a secret (password or session Token): POST body only, never the URL. */
export function orkPost(call, request = {}, { key = process.env.ORK_API_KEY, fetchImpl = fetch } = {}) {
  const body = new URLSearchParams({ call });
  for (const [k, v] of Object.entries(request)) body.set(`request[${k}]`, String(v));
  return send(ORK_JSON, { method: 'POST', headers: { ...headers(key), 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() }, fetchImpl);
}
