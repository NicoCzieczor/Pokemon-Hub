// Soul Link: Regelverstöße direkt im Save-Viewer lösen (Festlegungen für Duo).
// Ausführen: node --test "tests/*.test.*"
const test = require('node:test');
const assert = require('node:assert/strict');
const SoulLink = require('../SaveViewer/soul-link.js');

let order = 0;
function mon(pid, loc, tid) {
  return { pid, tid, sid: 0, metLocation: loc, eggLocation: 0, metDate: [2026, 1, 1], metLevel: 5 };
}
function entry(m, status) {
  return { m, key: SoulLink.monKey(m), own: true, status, order: order++ };
}
// Ein Paar am selben Ort: a auf Seite A (Trainer 1), b auf Seite B (Trainer 2)
function setup(statusA, statusB) {
  const a = entry(mon(0x11, 40, 1), statusA), b = entry(mon(0x22, 40, 2), statusB);
  return { A: [a], B: [b], a, b };
}

test('Partner nicht im Team: „Beide ins Team“ löst den Verstoß', () => {
  let s = setup('box', 'team');
  let r = SoulLink.compute(s.A, s.B, {});
  assert.equal(r.warnings.length, 1);
  assert.equal(r.warnings[0].type, 'team');
  const fixes = SoulLink.fix({}, r.pairs[0], 'team');

  s = setup('box', 'team');
  r = SoulLink.compute(s.A, s.B, {}, fixes);
  assert.equal(r.warnings.length, 0);
  assert.equal(r.pairs[0].fixed, true);
  assert.equal(s.a.status, 'team');
  assert.equal(s.a.gameStatus, 'box');
  assert.equal(s.b.gameStatus, undefined, 'der Partner im Team bleibt unverändert');
});

test('„Beide in die Box“ ändert nur den, der im Team ist', () => {
  let s = setup('box', 'team');
  const fixes = SoulLink.fix({}, SoulLink.compute(s.A, s.B, {}).pairs[0], 'box');
  s = setup('box', 'team');
  const r = SoulLink.compute(s.A, s.B, {}, fixes);
  assert.equal(r.warnings.length, 0);
  assert.equal(s.a.gameStatus, undefined);
  assert.equal(s.b.status, 'box');
  assert.equal(s.b.gameStatus, 'team');
});

test('Einer tot: „Beide tot“ legt den Partner auf den Friedhof', () => {
  let s = setup('dead', 'team');
  const fixes = SoulLink.fix({}, SoulLink.compute(s.A, s.B, {}).pairs[0], 'dead');
  s = setup('dead', 'team');
  const r = SoulLink.compute(s.A, s.B, {}, fixes);
  assert.equal(r.warnings.length, 0);
  assert.equal(s.b.status, 'dead');
  assert.equal(s.b.gameStatus, 'team');
});

test('Festlegung ist überholt, sobald im Spiel umgeräumt wurde', () => {
  let s = setup('box', 'team');
  const fixes = SoulLink.fix({}, SoulLink.compute(s.A, s.B, {}).pairs[0], 'team');
  // Neuer Spielstand: Partner inzwischen in die Box gelegt
  s = setup('box', 'box');
  const r = SoulLink.compute(s.A, s.B, {}, fixes);
  assert.equal(r.pairs[0].fixed, undefined);
  assert.equal(s.a.status, 'box');
  assert.deepEqual(r.staleFixes, Object.keys(fixes));
  assert.deepEqual(SoulLink.dropFixes(fixes, r.staleFixes), {});
});

test('Festlegung gilt unabhängig davon, welcher Spielstand links geladen ist', () => {
  let s = setup('box', 'team');
  const fixes = SoulLink.fix({}, SoulLink.compute(s.A, s.B, {}).pairs[0], 'team');
  s = setup('box', 'team');
  const r = SoulLink.compute(s.B, s.A, {}, fixes);   // Spielstände getauscht
  assert.equal(r.warnings.length, 0);
  assert.equal(s.a.status, 'team');
});

test('„Wie im Spiel“ hebt die Festlegung auf', () => {
  let s = setup('box', 'team');
  let fixes = SoulLink.fix({}, SoulLink.compute(s.A, s.B, {}).pairs[0], 'team');
  fixes = SoulLink.unfix(fixes, s.b.key, s.a.key);
  assert.deepEqual(fixes, {});
  s = setup('box', 'team');
  assert.equal(SoulLink.compute(s.A, s.B, {}, fixes).warnings.length, 1);
});
