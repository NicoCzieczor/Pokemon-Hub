// Omega Rubin / Alpha Saphir: Spielstand lesen und ändern (oras-save/-edit/-bag.js), Erkennung (hub-save.js),
// ROM-Bausteine (Bosse/oras-rom.js). Der Spielstand wird hier künstlich gebaut – echte Dateien braucht es nicht.
// Ausführen: node --test "tests/*.test.*"
const test = require('node:test');
const assert = require('node:assert/strict');
global.window = global;
require('../SaveViewer/data-pt.js');
require('../SaveViewer/data-oras.js');
global.PtSave = require('../SaveViewer/pt-save.js');
global.OrasSave = require('../SaveViewer/oras-save.js');
const OrasEdit = require('../SaveViewer/oras-edit.js');
const OrasBag = require('../SaveViewer/oras-bag.js');
global.OrasEdit = OrasEdit; global.OrasBag = OrasBag;
require('../SaveViewer/hub-save.js');
const OrasRom = require('../Bosse/oras-rom.js');
const D = window.ORAS_DATA;

// Blocklängen wie in einem echten Spielstand (Verzeichnis ab 0x75E00)
const LENGTHS = [0x2C8, 0xB90, 0x2C, 0x38, 0x150, 0x4, 0x8, 0x1C0, 0xBE, 0x24, 0x2100, 0x130, 0x440, 0x574, 0x4E28, 0x4E28,
  0x4E28, 0x170, 0x61C, 0x504, 0x11CC, 0x644, 0x104, 0x4, 0x420, 0x64, 0x3F0, 0x70C, 0x180, 0x4, 0xC, 0x48, 0x54, 0x644,
  0x5C8, 0x2F8, 0x1B40, 0x1F4, 0x3E0, 0x216, 0x640, 0x1A90, 0x400, 0x618, 0x25C, 0x834, 0x318, 0x7D0, 0xC48, 0x78, 0x200,
  0xC84, 0x628, 0x400, 0x7AD0, 0x78B0, 0x34AD0, 0xE058];
function emptySave() {
  const b = new Uint8Array(OrasSave.SIZE), T = 0x75E00;
  b.set([0x46, 0x45, 0x45, 0x42], T + 0x10);                  // 'BEEF'
  LENGTHS.forEach((len, i) => { const o = T + 0x14 + i * 8; b[o] = len & 0xFF; b[o + 1] = (len >> 8) & 0xFF; b[o + 2] = len >> 16; b[o + 4] = i; });
  b[0x14000] = 0x39; b[0x14001] = 0x30;                       // ID 12345
  b[0x14004] = 27; b[0x1402D] = 5;                            // Omega Rubin, deutsch
  'Nico'.split('').forEach((c, i) => { b[0x14048 + i * 2] = c.charCodeAt(0); });
  const empty = OrasSave.encryptPK6(new Uint8Array(232));
  for (let i = 0; i < 31 * 30; i++) b.set(empty, 0x33000 + i * 232);
  OrasSave.blocks(b).forEach(k => OrasSave.writeChecksum(b, k));
  return b;
}
const valid = b => OrasSave.blocks(b).every(k => k.valid);
function withMon(b, opts, to = { area: 'party', slot: 0 }) {
  return OrasEdit.addMon(b, to, OrasEdit.createMon(b, Object.assign({ rand: seeded(7) }, opts), D), D).bytes;
}
function seeded(s) { return () => { s = (Math.imul(s, 1103515245) + 12345) >>> 0; return s / 4294967296; }; }

test('leerer Spielstand wird erkannt und gelesen', () => {
  const b = emptySave();
  assert.equal(OrasSave.detect(b), 'oras');
  const r = OrasSave.parse(b, D);
  assert.ok(r.ok);
  assert.equal(r.game, 'or');
  assert.equal(r.trainer.name, 'Nico');
  assert.equal(r.trainer.tid, 12345);
  assert.equal(r.boxes.length, 31);
  assert.equal(r.party.length, 0);
  assert.equal(r.trainer.coins, null);
  assert.deepEqual(r.checksums, { general: true, storage: true, fallback: false });
});

test('neues Pokémon: Werte, Pokédex und Prüfsummen', () => {
  let b = withMon(emptySave(), { species: 384, level: 70, ivs: 'perfect', nature: 3, ability: 0, ball: 1, location: 316, shiny: true });
  assert.ok(valid(b));
  const r = OrasSave.parse(b, D), m = r.party[0];
  assert.equal(m.species, 384);
  assert.equal(m.level, 70);
  assert.equal(m.nature, 3);
  assert.equal(m.shiny, true);
  assert.deepEqual(m.iv, [31, 31, 31, 31, 31, 31]);
  assert.equal(m.metLocation, 316);
  assert.equal(m.otName, 'Nico');
  assert.equal(m.hp, m.stats[0]);
  assert.ok(r.dex.caught.includes(384));
  assert.ok(r.dex.seen.includes(384));
  // KP-Formel: (2·105 + 31) · 70/100 + 70 + 10 = 248
  assert.equal(m.stats[0], 248);
});

test('Verschieben: Team ↔ Box, letztes kampffähiges Pokémon bleibt', () => {
  let b = withMon(emptySave(), { species: 252, level: 5 });
  assert.throws(() => OrasEdit.moveMon(b, { area: 'party', slot: 0 }, { area: 'box', box: 0, slot: 0 }, D), e => e.code === 'last');
  b = withMon(b, { species: 255, level: 5 }, { area: 'party', slot: 1 });
  b = OrasEdit.moveMon(b, { area: 'party', slot: 1 }, { area: 'box', box: 3, slot: 7 }, D).bytes;
  let r = OrasSave.parse(b, D);
  assert.equal(r.party.length, 1);
  assert.equal(r.boxes[3].slots[7].species, 255);
  b = OrasEdit.moveMon(b, { area: 'box', box: 3, slot: 7 }, { area: 'party', slot: 1 }, D).bytes;
  r = OrasSave.parse(b, D);
  assert.equal(r.party[1].species, 255);
  assert.equal(r.party[1].hp, r.party[1].stats[0]);
  assert.ok(valid(b));
  b = OrasEdit.releaseMon(b, { area: 'party', slot: 1 }).bytes;
  assert.equal(OrasSave.parse(b, D).party.length, 1);
});

test('Attacken, Item, Freundschaft, Geld', () => {
  let b = withMon(emptySave(), { species: 25, level: 20 });
  b = OrasEdit.editMon(b, { area: 'party', slot: 0 }, d => { OrasEdit.setMoves(d, [85, 98], D.moveInfo); OrasEdit.setItem(d, 234); OrasEdit.setFriendship(d, 300); });
  b = OrasEdit.setMoney(b, 1e9);
  const r = OrasSave.parse(b, D), m = r.party[0];
  assert.deepEqual(m.moves, [85, 98]);
  assert.deepEqual(m.pp, [D.moveInfo[85][1], D.moveInfo[98][1]]);
  assert.equal(m.item, 234);
  assert.equal(m.friendship, 255);
  assert.equal(r.trainer.money, OrasEdit.MAX_MONEY);
  assert.ok(valid(b));
});

test('Beutel: richtige Tasche, Höchstzahl, Sonderbonbons bei Medizin', () => {
  const b0 = emptySave();
  const bag = OrasBag.read(b0);
  assert.equal(bag.length, 5);
  assert.equal(OrasBag.pocketOf(50), 3);                      // Sonderbonbon: Medizin (Gen 6)
  assert.equal(OrasBag.pocketOf(4), 0);                       // Pokéball: Items
  bag[3].push({ id: 50, count: 5000 });
  bag[0].push({ id: 50, count: 1 });                          // falsche Tasche → fällt weg
  const b = OrasBag.write(b0, bag), back = OrasBag.read(b);
  assert.deepEqual(back[3], [{ id: 50, count: 999 }]);
  assert.deepEqual(back[0], []);
  assert.ok(valid(b));
});

test('HubSave unterscheidet Platin und Omega Rubin', () => {
  const b = emptySave();
  assert.equal(HubSave.of(b).key, 'oras');
  assert.equal(HubSave.parse(b).kind, 'oras');
  assert.equal(HubSave.parse(new Uint8Array(0x80000)).ok, false);
  assert.equal(HubSave.locName(D, 'de', 204), 'Route 101');
  assert.equal(HubSave.locName(window.PT_DATA, 'en', 16), window.PT_DATA.text.en.loc0[16]);
});

test('beschädigter Block wird nicht bearbeitet', () => {
  const b = withMon(emptySave(), { species: 252, level: 5 });
  b[0x14200 + 10] ^= 0xFF;                                    // Team-Block kaputt
  assert.throws(() => OrasEdit.editMon(b, { area: 'party', slot: 0 }, () => {}), /beschädigt/);
});

test('ROM-Bausteine: LZ11, GARC, Wilde-Pokémon-Tabelle', () => {
  // LZ11: 3 Literale „abc“, dann Rückverweis Länge 6, Abstand 3 → „abcabcabc“
  const lz = new Uint8Array([0x11, 9, 0, 0, 0x10, 0x61, 0x62, 0x63, 0x50, 0x02]);
  const g = new Uint8Array(0x1C + 16 + 12 + 12 + 12 + 16);
  const w32 = (o, v) => { g[o] = v & 0xFF; g[o + 1] = (v >> 8) & 0xFF; g[o + 2] = (v >> 16) & 0xFF; g[o + 3] = v >>> 24; };
  g.set([0x43, 0x52, 0x41, 0x47]); w32(4, 0x1C); w32(0x10, 0x1C + 16 + 24 + 12);
  g.set([0x4F, 0x54, 0x41, 0x46], 0x1C); w32(0x20, 16); g[0x24] = 1; w32(0x28, 0);
  g.set([0x42, 0x54, 0x41, 0x46], 0x2C); w32(0x30, 24); w32(0x34, 1); w32(0x38, 1); w32(0x3C, 0); w32(0x40, lz.length); w32(0x44, lz.length);
  const garc = new Uint8Array(g.length + lz.length); garc.set(g); garc.set(lz, 0x1C + 16 + 24 + 12);
  const files = OrasRom._internal.garc(garc, true);
  assert.equal(String.fromCharCode.apply(null, files[0]), 'abcabcabc');
  assert.throws(() => OrasRom._internal.garc(new Uint8Array(40)), /kein GARC/);
  // Zone mit Gras-Platz 1 = Zigzachs (263) Lv. 2–3
  const z = new Uint8Array(0x20 + 0xF6);
  z[0x10] = 0x12; z[0x14] = 0x16; z[0x15] = 0x01;              // Tabelle ab 0x12 + 0x0E = 0x20 bis 0x116
  z[0x20] = 263 & 0xFF; z[0x21] = 263 >> 8; z[0x22] = 2; z[0x23] = 3;
  const wild = OrasRom._internal.wildTable([z, new Uint8Array(0), new Uint8Array(0)]);
  assert.deepEqual(wild[0].grass[0], [263, 0, 2, 3]);
  assert.equal(wild[0].surf, null);
});
