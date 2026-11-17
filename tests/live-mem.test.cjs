// Live-Test, Live-Verbindung: Team und Boxen im (nachgebauten) Arbeitsspeicher wiederfinden (LiveTest/live-mem.js)
// und über den Stand aus der Datei legen (LiveTest/live-diff.js). Ohne echten Spielstand: Die Pokémon werden hier
// gebaut und mit den Modulen des Save-Viewers verschlüsselt – der „Speicher“ ist ein Byte-Feld mit einer Brücke davor.
const test = require('node:test');
const assert = require('node:assert');
global.window = global;
require('../SaveViewer/data-oras.js');
require('../SaveViewer/data-pt.js');
const OrasSave = require('../SaveViewer/oras-save.js');
const PtSave = require('../SaveViewer/pt-save.js');
const LiveMem = require('../LiveTest/live-mem.js');
const LiveDiff = require('../LiveTest/live-diff.js');

const G = { key: 'oras', Save: OrasSave, D: global.ORAS_DATA };
const read = LiveMem.reader(G);
const TID = 12345, SID = 4711, HOST = 0x1f000000000;
const w16 = (b, o, v) => { b[o] = v & 255; b[o + 1] = v >>> 8; };
const w32 = (b, o, v) => { w16(b, o, v & 0xFFFF); w16(b, o + 2, v >>> 16); };

// Entschlüsseltes Team-Pokémon (260 Byte) bauen
function raw(ec, species, level, hp, max) {
  const d = new Uint8Array(260);
  w32(d, 0, ec); w16(d, 0x08, species); w16(d, 0x0C, TID); w16(d, 0x0E, SID); w32(d, 0x18, ec ^ 0x5555);
  w32(d, 0x10, level * level * level);
  d[0xEC] = level; w16(d, 0xF0, hp); w16(d, 0xF2, max);
  for (let i = 1; i < 6; i++) w16(d, 0xF2 + i * 2, 20 + i);
  return d;
}
const enc = d => OrasSave.encryptPK6(d);
// size 232: als Box-Pokémon gelesen (Level dann aus den Erfahrungspunkten, wie beim Lesen aus Datei und Speicher)
const mon = (d, size) => read(enc(d), 0, size || 260);

// Speicher: laufendes Team (484er-Einträge, Kampfwerte ab 344), Kopie des Spielstands (260 am Stück), Boxen
const LIVE = 0x234568, COPY = 0x45678, BOX = 0x500010;
function world(team, boxed) {
  const ram = new Uint8Array(8 << 20), scans = [];
  const putLive = (i, d) => { const e = enc(d); ram.set(e.subarray(0, 232), LIVE + i * 484); ram.set(e.subarray(232), LIVE + i * 484 + 344); };
  team.forEach((d, i) => { putLive(i, d); ram.set(enc(d), COPY + i * 260); });
  Object.entries(boxed).forEach(([i, d]) => ram.set(enc(d).subarray(0, 232), BOX + i * 232));
  const bridge = {
    scan: async (hexes, lo, hi) => {
      scans.push(lo ? 'near' : 'full');
      const hits = [];
      hexes.forEach((h, pi) => { const pat = Buffer.from(h, 'hex'); let i = -1; while ((i = Buffer.from(ram.buffer).indexOf(pat, i + 1)) >= 0) if (!lo || (HOST + i >= lo && HOST + i < hi)) hits.push([pi, (HOST + i).toString(16)]); });
      return { ms: 1, mb: 8, hits };
    },
    read: async (addrs, n) => addrs.map(a => { const o = a - HOST; return o >= 0 && o + n <= ram.length ? ram.slice(o, o + n) : null; }),
  };
  // „Spielstand aus der Datei“, wie HubSave.parse ihn liefert
  const boxes = Array.from({ length: 31 }, (_, b) => ({ name: 'Box', slots: Array.from({ length: 30 }, (_, s) => boxed[b * 30 + s] ? Object.assign(mon(boxed[b * 30 + s], 232), { where: { area: 'box', box: b, slot: s } }) : null) }));
  const data = { ok: true, kind: 'oras', game: 'or', trainer: { name: 'Nico', tid: TID, sid: SID, badges: new Array(8).fill(false), playTime: { h: 1, m: 0, s: 0 } },
    party: team.map((d, i) => Object.assign(mon(d), { where: { area: 'party', slot: i } })), boxes, daycare: [], dex: { caught: [] } };
  let clock = 0;
  const t = LiveMem.tracker({ kind: 'oras', data, readMon: read, bridge, now: () => clock });
  const polls = async n => { let r = null; for (let i = 0; i < n; i++) { r = await t.poll() || r; clock += 700; } return r; };
  return { ram, putLive, data, t, polls, scans, tick: ms => { clock += ms; } };
}
const A = () => raw(0x11111111, 252, 16, 40, 53), B = () => raw(0x22222222, 263, 13, 47, 47), C = () => raw(0x33333333, 270, 9, 30, 30);
const types = (a, b) => LiveDiff.diff(a, b).map(e => e.type);

test('Leser: Team-Größe verlangt glaubhafte Kampfwerte', () => {
  assert.strictEqual(mon(A()).species, 252);
  const noStats = enc(A()); noStats.fill(0x5A, 232);
  assert.strictEqual(read(noStats, 0, 260), null, 'Box-Pokémon mit beliebigen Bytes dahinter ist kein Team-Pokémon');
  assert.strictEqual(read(noStats, 0, 232).species, 252, 'als Box-Pokémon aber gültig');
});

test('findet laufendes Team (Kampfwerte ab 344), Spielstand-Kopie und Boxen', async () => {
  const w = world([A(), B()], { 0: C() });
  const r = await w.polls(3);
  assert.deepStrictEqual(r.party.map(m => [m.species, m.hp]), [[252, 40], [263, 47]]);
  assert.strictEqual(r.boxes[0][0].species, 270);
  assert.strictEqual(w.t.info.state, 'live');
  assert.strictEqual(w.t._internal.party().length, 2, 'laufendes Team + Kopie');
  assert.deepStrictEqual(types(LiveDiff.snapshot(w.data), LiveDiff.snapshot(w.data, r)), [], 'gleicher Stand wie in der Datei');
});

test('0 KP nur im laufenden Team: gilt sofort, die Kopie vom Speichern zählt nicht', async () => {
  const w = world([A(), B()], { 0: C() });
  const before = LiveDiff.snapshot(w.data, await w.polls(3));
  const d = A(); w16(d, 0xF0, 0); w.putLive(0, d);
  const r = await w.polls(3);
  assert.strictEqual(r.party[0].hp, 0);
  const ev = LiveDiff.diff(before, LiveDiff.snapshot(w.data, r));
  assert.deepStrictEqual(ev.map(e => [e.type, e.mon.species]), [['faint', 252]]);
});

test('Fang ins Team und in die Box, Ablegen in die Box', async () => {
  const w = world([A(), B()], { 0: C() });
  let snap = LiveDiff.snapshot(w.data, await w.polls(3));
  w.putLive(2, raw(0x44444444, 280, 5, 20, 20));
  let next = LiveDiff.snapshot(w.data, await w.polls(3));
  assert.deepStrictEqual(LiveDiff.diff(snap, next).map(e => [e.type, e.mon.species, e.mon.area]), [['catch', 280, 'party']]);
  snap = next;
  w.ram.set(enc(raw(0x55555555, 285, 4, 18, 18)).subarray(0, 232), BOX + 31 * 232);       // Box 2, Platz 2
  next = LiveDiff.snapshot(w.data, await w.polls(3));
  assert.deepStrictEqual(LiveDiff.diff(snap, next).map(e => [e.type, e.mon.species, e.mon.box, e.mon.slot]), [['catch', 285, 1, 1]]);
  snap = next;
  // Team-Platz 1 (B) in die Box: Team rückt auf
  w.ram.set(enc(B()).subarray(0, 232), BOX + 5 * 232);
  w.putLive(1, raw(0x44444444, 280, 5, 20, 20));
  w.ram.fill(0, LIVE + 2 * 484, LIVE + 3 * 484);
  next = LiveDiff.snapshot(w.data, await w.polls(3));
  assert.deepStrictEqual(LiveDiff.diff(snap, next).map(e => [e.type, e.mon.species, e.from, e.mon.area]), [['move', 263, 'party', 'box']]);
});

test('vorletzter Stand aus der Datei wird nie für das laufende Team gehalten', async () => {
  const w = world([A(), B()], {});
  // an der Stelle des „laufenden“ Teams steht ein altes Team mit einem bekannten Pokémon (wie Platins ältere Hälfte)
  const old = [raw(0x99999999, 300, 20, 60, 60), A()];
  w.ram.fill(0, LIVE, LIVE + 3 * 484);
  old.forEach((d, i) => w.putLive(i, d));
  w.data.staleParties = [old.map(d => mon(d))];
  w.t.setData(w.data);
  const r = await w.polls(3);
  assert.deepStrictEqual(r.party.map(m => m.species), [252, 263], 'es gilt die Kopie mit dem Stand der Datei');
});

test('zwischendurch wird nur in der Nähe neu gesucht; findet sich dort nichts, wieder überall', async () => {
  const w = world([A(), B()], { 0: C() });
  await w.polls(3);
  assert.deepStrictEqual(w.scans, ['full']);
  w.tick(60000);
  await w.polls(2);
  assert.deepStrictEqual(w.scans, ['full', 'near']);
  w.ram.fill(0);                                   // Spiel neu gestartet: nichts mehr da
  w.tick(60000);
  await w.polls(12);
  assert.strictEqual(w.t.info.state, 'search');
  assert.ok(w.scans.slice(2).includes('full'), w.scans.join(','));
});

test('nur das Team live (Boxen nicht gefunden): fehlende Team-Pokémon gelten als „nicht mehr im Team“', () => {
  const w = world([A(), B()], { 0: C() });
  const live = { party: [w.data.party[0], w.data.boxes[0].slots[0]], boxes: null };       // B fehlt, C kam aus der Box
  const s = LiveDiff.snapshot(w.data, live);
  const by = Object.values(s.mons).map(m => [m.species, m.area]).sort();
  assert.deepStrictEqual(by, [[252, 'party'], [263, 'out'], [270, 'party']]);
  assert.deepStrictEqual(LiveDiff.counts(s), { party: 2, box: 0, daycare: 0, out: 1, fainted: 0, badges: 0 });
});

test('Platin: ältere Hälfte der Datei wird als weitere Team-Fassung gelesen', () => {
  // Datei mit zwei Hälften bauen: gleiche Blöcke, in der älteren ein anderes Team-Pokémon
  const SIZE = 0x80000, GEN = 0xCF2C, file = new Uint8Array(SIZE);
  const pk = (pid, species) => { const d = new Uint8Array(236); w32(d, 0, pid); w16(d, 0x08, species); w32(d, 0x10, 1000); d[0x8C] = 10; w16(d, 0x8E, 30); for (let i = 0; i < 6; i++) w16(d, 0x90 + i * 2, 30 + i); return PtSave.encryptPK4(d); };
  [[0, 5, 387], [0x40000, 6, 390]].forEach(([at, counter, species]) => {
    file[at + 0xA0 - 4] = 1;
    file.set(pk(1000 + species, species), at + 0xA0);
    w32(file, at + GEN - 0x14, counter); w32(file, at + GEN - 0xC, GEN); w32(file, at + GEN - 0x8, 0x20060623);
    PtSave.writeChecksum(file, at, GEN);
  });
  const stale = LiveMem.fileParties({ key: 'pt', Save: PtSave, D: global.PT_DATA }, file);
  assert.strictEqual(PtSave.generalBlock(file).offset, 0x40000, 'aktuell ist die Hälfte mit dem höheren Zähler');
  assert.deepStrictEqual(stale.map(p => p.map(m => m.species)), [[387]]);
  assert.deepStrictEqual(LiveMem.fileParties(G, new Uint8Array(0x76000)), [], 'Omega Rubin / Alpha Saphir hat nur eine Fassung');
});
