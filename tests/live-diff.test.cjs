// Live-Test: Vergleich zweier Fassungen eines Spielstands (LiveTest/live-diff.js) – ohne echten Spielstand,
// mit nachgebauten Ergebnissen von HubSave.parse.
const test = require('node:test');
const assert = require('node:assert');
const LiveDiff = require('../LiveTest/live-diff.js');

const TID = 80085, SID = 4711;
function mon(pid, species, over) {
  return Object.assign({
    ec: pid ^ 0x1234, pid, tid: TID, sid: SID, species, form: 0, isNicknamed: false, nickname: '', level: 10,
    hp: 30, stats: [30, 10, 10, 10, 10, 10], isEgg: false, shiny: false, otName: 'Nico', metLocation: 204, metLevel: 5,
  }, over || {});
}
// party: Liste von Pokémon; boxes: { 'box-slot': Pokémon }
function save(party, boxes, over) {
  const b = [];
  for (let i = 0; i < 3; i++) b.push({ name: 'Box ' + (i + 1), slots: new Array(30).fill(null) });
  Object.entries(boxes || {}).forEach(([k, m]) => {
    const [bx, sl] = k.split('-').map(Number);
    b[bx].slots[sl] = Object.assign({}, m, { where: { area: 'box', box: bx, slot: sl } });
  });
  return Object.assign({
    ok: true, kind: 'oras', game: 'or',
    trainer: { name: 'Nico', tid: TID, sid: SID, money: 3000, badges: [true, false, false, false, false, false, false, false], playTime: { h: 2, m: 10, s: 0 } },
    party: party.map((m, i) => Object.assign({}, m, { where: { area: 'party', slot: i } })),
    boxes: b, daycare: [], dex: { caught: [252, 263] },
  }, over || {});
}
const snap = (...a) => LiveDiff.snapshot(save(...a));
const types = ev => ev.map(e => e.type);
const later = { trainer: { name: 'Nico', tid: TID, sid: SID, money: 3000, badges: [true, false, false, false, false, false, false, false], playTime: { h: 2, m: 30, s: 0 } } };

const geckarbor = mon(1, 252), zigzachs = mon(2, 263);

test('Abzug: zählt Team, Boxen, Besiegte und Orden', () => {
  const s = snap([geckarbor, mon(3, 261, { hp: 0 })], { '0-0': zigzachs, '2-29': mon(4, 265) });
  assert.deepStrictEqual(LiveDiff.counts(s), { party: 2, box: 2, daycare: 0, out: 0, fainted: 1, badges: 1 });
  assert.strictEqual(s.time, 2 * 3600 + 600);
  assert.strictEqual(s.dex, 2);
});

test('gleicher Stand: keine Ereignisse', () => {
  assert.deepStrictEqual(LiveDiff.diff(snap([geckarbor]), snap([geckarbor])), []);
});

test('gefangen: neues Pokémon im Team oder in der Box', () => {
  const ev = LiveDiff.diff(snap([geckarbor]), snap([geckarbor, zigzachs], { '1-4': mon(5, 270, { metLocation: 210 }) }, later));
  assert.deepStrictEqual(types(ev), ['catch', 'catch']);
  assert.strictEqual(ev[0].mon.area, 'party');
  assert.strictEqual(ev[1].mon.area, 'box');
  assert.strictEqual(ev[1].mon.box, 1);
  assert.strictEqual(ev[1].mon.met, 210);
});

test('fremder Originaltrainer zählt als erhalten, ein Ei als Ei', () => {
  const ev = LiveDiff.diff(snap([geckarbor]), snap([geckarbor, mon(6, 66, { tid: 1, sid: 2, otName: 'Kai' }), mon(7, 172, { isEgg: true })]));
  assert.deepStrictEqual(types(ev), ['gift', 'egg']);
  assert.strictEqual(ev[0].mon.ot, 'Kai');
});

test('besiegt: KP im Team fallen auf 0 – und wieder fit', () => {
  const a = snap([geckarbor, zigzachs]), b = snap([geckarbor, Object.assign({}, zigzachs, { hp: 0 })]);
  const ev = LiveDiff.diff(a, b);
  assert.deepStrictEqual(types(ev), ['faint']);
  assert.strictEqual(ev[0].mon.species, 263);
  assert.deepStrictEqual(LiveDiff.diff(b, b), [], 'bleibt besiegt: kein zweites Ereignis');
  assert.deepStrictEqual(types(LiveDiff.diff(b, a)), ['heal']);
});

test('besiegt in die Box gelegt: wieder fit und verschoben', () => {
  const a = snap([geckarbor, Object.assign({}, zigzachs, { hp: 0 })]);
  const ev = LiveDiff.diff(a, snap([geckarbor], { '0-3': zigzachs }));
  assert.deepStrictEqual(types(ev), ['heal', 'move']);
  assert.strictEqual(ev[1].from, 'party');
  assert.strictEqual(ev[1].mon.box, 0);
});

test('Level, Entwicklung und Schlüpfen', () => {
  const a = snap([geckarbor, mon(7, 172, { isEgg: true })]);
  const b = snap([Object.assign({}, geckarbor, { species: 253, level: 16 }), mon(7, 172, { level: 1 })], {}, later);
  const ev = LiveDiff.diff(a, b);
  assert.deepStrictEqual(types(ev), ['evolve', 'hatch', 'level']);
  assert.strictEqual(ev[0].from, 252);
  assert.strictEqual(ev[2].from, 10);
  assert.strictEqual(ev[2].mon.level, 16);
});

test('Orden und freigelassen', () => {
  const b = save([geckarbor], {}, later);
  b.trainer = Object.assign({}, b.trainer, { badges: [true, true, false, false, false, false, false, false] });
  const ev = LiveDiff.diff(snap([geckarbor, zigzachs]), LiveDiff.snapshot(b));
  assert.deepStrictEqual(types(ev), ['badge', 'gone']);
  assert.strictEqual(ev[0].bit, 1);
  assert.strictEqual(ev[1].mon.species, 263);
});

test('Spielzeit rückwärts: älterer Stand, sonst kein Vergleich', () => {
  const ev = LiveDiff.diff(snap([geckarbor, zigzachs], {}, later), snap([geckarbor]));
  assert.deepStrictEqual(types(ev), ['rewind']);
});

test('anderer Trainer oder anderes Spiel: Wechsel', () => {
  const other = save([geckarbor]);
  other.trainer = Object.assign({}, other.trainer, { tid: 1 });
  assert.deepStrictEqual(types(LiveDiff.diff(snap([geckarbor]), LiveDiff.snapshot(other))), ['switch']);
  assert.deepStrictEqual(types(LiveDiff.diff(snap([geckarbor]), LiveDiff.snapshot(save([geckarbor], {}, { kind: 'pt', game: 'pt' })))), ['switch']);
});

test('Doppelgänger mit gleicher Kennung gehen nicht verloren', () => {
  const s = snap([geckarbor, geckarbor]);
  assert.strictEqual(Object.keys(s.mons).length, 2);
  assert.deepStrictEqual(LiveDiff.diff(s, snap([geckarbor, geckarbor])), []);
});

test('Platin: Kennung ohne Verschlüsselungskonstante', () => {
  const m = mon(9, 387);
  delete m.ec;
  assert.strictEqual(LiveDiff.monId('pt', m), '9.' + TID + '.' + SID);
  assert.ok(LiveDiff.monId('oras', mon(9, 387)).split('.').length === 4);
});
