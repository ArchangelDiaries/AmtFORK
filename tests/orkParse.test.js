import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseProfile } from '../netlify/functions/lib/orkParse.js';

// Fixture mirrors the markup emitted by ORK3 revised-frontend/Playernew_index.tpl
const page = (feastCard = '') => `<html><head><title>ORK 3: Sir Brannoc &amp; Co</title></head><body>
<h1 class="pn-persona" id="pn-hero-persona">
  Sir Brannoc &amp; Co <span class="pn-hero-belts"></span></h1>
<div class="pn-breadcrumb">
  <a class="pn-crumb" href="/orkui/index.php?Route=Kingdom/profile/16"><i class="fas fa-crown"></i> Westmarch</a>
  <a class="pn-crumb" href="/orkui/index.php?Route=Park/profile/921"><i class="fas fa-map-marker-alt"></i> Siar Geata</a>
</div>
<div class="pn-detail-row">
  <span class="pn-detail-label">Persona</span>
  <span class="pn-detail-value">Sir Brannoc &amp; Co</span>
</div>
${feastCard}
<div class="pn-cms-card" id="pn-cms-card"><div class="pn-belt-name">Milk</div></div>
</body></html>`;

const card = body => `<div class="pn-belt-card">
  <div class="pn-belt-card-title"><i class="fas fa-utensils"></i> Sir Brannoc &amp; Co's Feast Preferences</div>
  ${body}
</div>`;

test('identity without feast card', () => {
  const p = parseProfile(page());
  assert.equal(p.persona, 'Sir Brannoc & Co');
  assert.equal(p.park, 'Siar Geata'); assert.equal(p.parkId, '921');
  assert.equal(p.kingdom, 'Westmarch');
  assert.equal(p.feast.visible, false);
});

test('no restrictions', () => {
  const p = parseProfile(page(card(`<div class="pn-belt-row" style="justify-content:flex-start;color:var(--ork-text-secondary,#4a5568);font-style:italic">No dietary restrictions.</div>`)));
  assert.deepEqual(p.feast, { visible: true, noRestrictions: true, diets: [], restrictions: [], allergens: {} });
});

test('diets, restrictions, allergens', () => {
  const p = parseProfile(page(card(`
    <div class="pn-belt-group">Diet</div>
    <div class="pn-belt-row" style="justify-content:flex-start;flex-wrap:wrap;gap:6px;color:var(--ork-text-secondary,#4a5568)">
      Vegetarian, Halal
    </div>
    <div class="pn-belt-group">Won't eat</div>
    <div class="pn-belt-row" style="justify-content:flex-start;flex-wrap:wrap;gap:6px;color:var(--ork-text-secondary,#4a5568)">
      Pork, Shellfish
    </div>
    <div class="pn-belt-group">Allergens</div>
    <div class="pn-belt-row" style="justify-content:flex-start">
      <span class="pn-belt-name" style="font-weight:500">Peanuts</span>
      <span class="pn-belt-title" style="color:#e53e3e;font-weight:600">Severe</span>
    </div>
    <div class="pn-belt-row" style="justify-content:flex-start">
      <span class="pn-belt-name" style="font-weight:500">Treenuts</span>
      <span class="pn-belt-title" style="color:#dd6b20;font-weight:600">Mild</span>
    </div>`)));
  assert.equal(p.feast.visible, true);
  assert.deepEqual(p.feast.diets, ['Vegetarian', 'Halal']);
  assert.deepEqual(p.feast.restrictions, ['Pork', 'Shellfish']);
  assert.deepEqual(p.feast.allergens, { Peanuts: 2, Treenuts: 1 });
});

test('allergen names outside the card are ignored', () => {
  const p = parseProfile(page(card(`<div class="pn-belt-group">Diet</div><div class="pn-belt-row">Vegan</div>`)));
  assert.deepEqual(p.feast.allergens, {});
  assert.deepEqual(p.feast.diets, ['Vegan']);
});
