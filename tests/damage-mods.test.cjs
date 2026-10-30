// Schadens-Rechner: Fähigkeiten/Items (Modifikatoren), Initiative, erster Treffer (DamageCalc/mechanics.js).
// Die Schadenswerte selbst wurden gegen den Smogon-Rechner (@smogon/calc 0.12) für Gen 3, 4, 5 und 8 abgeglichen.
// Ausführen: node --test "tests/*.test.*"
const test = require('node:test');
const assert = require('node:assert/strict');
const DMG = require('../DamageCalc/mechanics.js');

test('Modifikatoren: bis Gen 4 nacheinander abgerundet, ab Gen 5 als 4096er-Kette', () => {
  assert.equal(DMG.applyMods(150, [1.5], 4), 225);
  assert.equal(DMG.applyMods(101, [1.5, 1.1], 4), 166);        // 151 → 166
  assert.equal(DMG.chainMods([5324 / 4096]), 5324);            // Leben-Orb ab Gen 5
  assert.equal(DMG.chainMods([0.75, 1.2]), 3686);              // Filter + Expertengurt
  assert.equal(DMG.applyMods(150, [1.5], 5), 225);
  assert.equal(DMG.applyMods(100, [], 5), 100);
});

test('Initiative: Stufe, Wahlschal, Wetter-Fähigkeit, Paralyse je Generation', () => {
  assert.equal(DMG.speedOf(122, {}, 4), 122);
  assert.equal(DMG.speedOf(122, { scarf: true }, 4), 183);
  assert.equal(DMG.speedOf(122, { stage: 1 }, 4), 183);
  assert.equal(DMG.speedOf(122, { double: true }, 4), 244);       // Wassertempo im Regen
  assert.equal(DMG.speedOf(122, { paralyzed: true }, 4), 30);     // ×¼ bis Gen 6
  assert.equal(DMG.speedOf(122, { paralyzed: true }, 7), 61);     // ×½ ab Gen 7
  assert.equal(DMG.speedOf(1, { paralyzed: true }, 4), 1);
});

test('Gen 4: Leben-Orb nach dem Volltreffer, Endfaktoren nach dem Typ', () => {
  const p = { gen: 4, level: 50, power: 100, atk: 150, def: 100, physical: true, stab: false, effs: [2], crit: false, burn: false, screens: false, weather: null, moveType: 'ground' };
  const plain = DMG.damageRolls(p);
  const orb = DMG.damageRolls({ ...p, lifeOrb: true });
  const belt = DMG.damageRolls({ ...p, finalMods: [1.2] });
  assert.ok(orb[15] > plain[15] && orb[15] <= Math.ceil(plain[15] * 1.3) + 2);
  assert.ok(belt.every((x, i) => x === Math.floor(plain[i] * 1.2)));
});

test('KO: erster Treffer mit Resistenz-Beere, weitere ohne', () => {
  const later = new Array(16).fill(60), first = new Array(16).fill(30);
  assert.equal(DMG.koChance(later, 100).hits, 2);
  assert.deepEqual(DMG.koChance(later, 100, 8, first), { hits: 3, chance: 1 });   // 30 + 60 = 90 < 100 → 3 Treffer
  assert.equal(DMG.sureHits(later, 100, first), 3);
  assert.equal(DMG.sureHits(later, 100), 2);
});
