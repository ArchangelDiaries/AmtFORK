// Parses a public ORK 3 player profile page (Route=Player/profile/{id}, revised frontend).
// Markup references: orkui/template/revised-frontend/Playernew_index.tpl in github.com/amtgard/ORK3.
// The Feast Preferences card only renders when the player has turned on "Show My Feast Preferences".

const ALLERGENS = ['Milk', 'Eggs', 'Fish', 'Shellfish', 'Treenuts', 'Peanuts', 'Wheat', 'Soy',
  'Sesame', 'Garlic', 'Gluten', 'Onion', 'Mushroom', 'Corn', 'Coconut', 'Cocoa', 'Nightshades'];
const DIETS = ['Vegetarian', 'Vegan', 'Halal', 'Kosher', 'Keto', 'Paleo'];
const RESTRICTIONS = ['Dairy', 'Eggs', 'Fish', 'Honey', 'Poultry', 'Beef', 'Pork', 'Shellfish'];

const decode = s => String(s || '')
  .replace(/&#0*39;|&apos;/g, "'").replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n)).replace(/&amp;/g, '&');
const text = s => decode(String(s || '').replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim();

export function parseProfile(html) {
  const out = { persona: '', park: '', parkId: '', kingdom: '', kingdomId: '', feast: { visible: false } };
  if (!html) return out;

  let m = html.match(/pn-detail-label">\s*Persona\s*<\/span>\s*<span class="pn-detail-value">([\s\S]*?)<\/span>/);
  if (m) out.persona = text(m[1]);
  if (!out.persona && (m = html.match(/<h1[^>]*id="pn-hero-persona"[^>]*>([\s\S]*?)<\/h1>/))) out.persona = text(m[1]);
  if (!out.persona && (m = html.match(/<title>\s*ORK 3:\s*([^<]+)<\/title>/i))) out.persona = text(m[1]);

  const crumb = re => { const x = html.match(re); return x ? { id: x[1], name: text(x[2]) } : null; };
  const k = crumb(/class="pn-crumb"\s+href="[^"]*Kingdom\/profile\/(\d+)"[^>]*>([\s\S]*?)<\/a>/);
  const p = crumb(/class="pn-crumb"\s+href="[^"]*Park\/profile\/(\d+)"[^>]*>([\s\S]*?)<\/a>/);
  if (k) { out.kingdom = k.name; out.kingdomId = k.id; }
  if (p) { out.park = p.name; out.parkId = p.id; }

  out.feast = parseFeastCard(html);
  return out;
}

export function parseFeastCard(html) {
  const start = html.search(/<div class="pn-belt-card-title">\s*<i class="fas fa-utensils"><\/i>[^<]*Feast Preferences/);
  if (start < 0) return { visible: false };
  // Card body runs until the next sidebar card or section.
  const rest = html.slice(start + 40);
  const endRel = rest.search(/<div class="pn-(?:belt-card|cms-card)"|<div class="pn-belt-card-title"|<\/aside>/);
  const card = rest.slice(0, endRel < 0 ? 6000 : endRel);

  const feast = { visible: true, noRestrictions: false, diets: [], restrictions: [], allergens: {} };
  if (/No dietary restrictions\./.test(card)) { feast.noRestrictions = true; return feast; }

  const group = label => {
    const g = card.match(new RegExp(`pn-belt-group">\\s*${label}\\s*<\\/div>\\s*<div class="pn-belt-row"[^>]*>([\\s\\S]*?)<\\/div>`));
    return g ? text(g[1]).split(/\s*,\s*/).filter(Boolean) : [];
  };
  feast.diets = group('Diet').filter(d => DIETS.includes(d));
  feast.restrictions = group("Won(?:'|&#0?39;|&apos;)t eat").filter(r => RESTRICTIONS.includes(r));

  const aStart = card.search(/pn-belt-group">\s*Allergens/);
  if (aStart >= 0) {
    const re = /pn-belt-name"[^>]*>\s*([^<]+?)\s*<\/span>\s*<span class="pn-belt-title"[^>]*>\s*(Severe|Mild)\s*</g;
    let a; const seg = card.slice(aStart);
    while ((a = re.exec(seg))) {
      const name = decode(a[1]).trim();
      if (ALLERGENS.includes(name)) feast.allergens[name] = a[2] === 'Severe' ? 2 : 1;
    }
  }
  return feast;
}
