// Schadens-Rechner: Statuswert-Stufen und aktuelle KP (DamageCalc/mechanics.js).
// Ausführen: node --test "tests/*.test.*"
const test = require('node:test');
const assert = require('node:assert/strict');
const DMG = require('../DamageCalc/mechanics.js');

test('Stufen ab Gen 3: (2+n)/2 bzw. 2/(2−n), abgerundet', () => {
  assert.equal(DMG.applyStage(100, 0, 4), 100);
  assert.equal(DMG.applyStage(100, 1, 4), 150);
  assert.equal(DMG.applyStage(100, 2, 4), 200);   // Schwerttanz
  assert.equal(DMG.applyStage(100, 6, 4), 400);
  assert.equal(DMG.applyStage(100, -1, 4), 66);   // Einschüchterung
  assert.equal(DMG.applyStage(100, -5, 4), 28);   // 2/7
  assert.equal(DMG.applyStage(100, -6, 4), 25);
  assert.equal(DMG.applyStage(300, -1, 3), 200);
  assert.equal(DMG.applyStage(101, 1, 9), 151);
});

test('Stufen in Gen 1–2: Tabelle in Hundertsteln, höchstens 999, mindestens 1', () => {
  assert.equal(DMG.applyStage(300, -1, 1), 198);  // 66 %, nicht 2/3
  assert.equal(DMG.applyStage(100, -5, 2), 28);
  assert.equal(DMG.applyStage(300, 6, 1), 999);   // 1200 → 999
  assert.equal(DMG.applyStage(1, -6, 2), 1);
});

test('Ungültige Stufen werden begrenzt', () => {
  assert.equal(DMG.applyStage(100, 9, 4), 400);
  assert.equal(DMG.applyStage(100, -9, 4), 25);
  assert.equal(DMG.applyStage(100, NaN, 4), 100);
});

test('Volltreffer: welche Stufen zählen', () => {
  assert.deepEqual(DMG.critStages(2, -1, 1), { atk: 0, def: 0 });   // Gen 1: keine
  assert.deepEqual(DMG.critStages(2, 0, 2), { atk: 2, def: 0 });    // Gen 2: Angriff höher → beide
  assert.deepEqual(DMG.critStages(1, 1, 2), { atk: 0, def: 0 });    // nicht höher → keine
  assert.deepEqual(DMG.critStages(-1, 2, 4), { atk: 0, def: 0 });   // ab Gen 3: nur die guten
  assert.deepEqual(DMG.critStages(2, -1, 4), { atk: 2, def: -1 });
  assert.deepEqual(DMG.critStages(-2, -2, 9), { atk: 0, def: -2 });
});

test('Höhere Stufe → mehr Schaden; aktuelle KP ändern die KO-Chance', () => {
  const p = { gen: 4, level: 50, power: 100, def: 100, physical: true, stab: false, effs: [1], crit: false, burn: false, screens: false, weather: null, moveType: 'ground' };
  const base = DMG.damageRolls({ ...p, atk: 100 });
  const boosted = DMG.damageRolls({ ...p, atk: DMG.applyStage(100, 2, 4) });
  assert.ok(boosted[0] > base[0] * 1.8 && boosted[15] < base[15] * 2.2);
  assert.deepEqual([base[0], base[15]], [39, 46]);
  assert.equal(DMG.koChance(base, 150).hits, 4);   // volle 150 KP: 4 Treffer
  assert.equal(DMG.koChance(base, 40).hits, 1);    // nur noch 40 KP: schon der erste Treffer kann reichen
  assert.equal(DMG.koChance(base, 39).chance, 1);  // 39 KP: sicher
});
