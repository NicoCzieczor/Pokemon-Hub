// Spielstand und ROM: beschädigte Blöcke nicht bearbeiten (F06), kaputte NARC-Dateien begrenzen (F09).
// Ausführen: node --test "tests/*.test.*"
const test = require('node:test');
const assert = require('node:assert/strict');
const PtSave = require('../SaveViewer/pt-save.js');
const PtEdit = require('../SaveViewer/pt-edit.js');
const Rando = require('../Bosse/rando.js');

test('Pokémon in einem beschädigten Box-Block wird nicht geändert', () => {
  const orig = PtSave.storageBlock;
  try {
    PtSave.storageBlock = () => ({ bytes: new Uint8Array(0x20000), offset: 0, size: 0x20000, valid: false });
    assert.throws(() => PtEdit.editMon(new Uint8Array(16), { area: 'box', box: 0, slot: 0 }, () => {}), /beschädigt/);
  } finally {
    PtSave.storageBlock = orig;
  }
});

test('NARC mit unmöglicher Eintragszahl bricht sofort ab', () => {
  const b = new Uint8Array(28);
  b.set([0x4E, 0x41, 0x52, 0x43]);          // 'NARC'
  b[20] = 28;                                // BTAF-Größe
  b.set([0xFF, 0xFF, 0xFF, 0x7F], 24);       // Eintragszahl ~2 Mrd.
  const start = Date.now();
  assert.throws(() => Rando._internal.narc(b), /kein NARC/);
  assert.ok(Date.now() - start < 1000);
});

test('NARC-Eintrag außerhalb der Datei wird abgelehnt', () => {
  const b = new Uint8Array(60);
  b.set([0x4E, 0x41, 0x52, 0x43]);
  b[20] = 20; b[24] = 1;                     // BTAF: 20 Byte, 1 Eintrag
  b[32] = 200;                               // Eintrag 0–200, die Datei ist kleiner
  b[40] = 16;                                // BTNF-Größe
  assert.throws(() => Rando._internal.narc(b), /kein NARC/);
});

test('Wilde Pokémon aus pl_enc_data.narc: Aufbau wie pret encounter.py', () => {
  const b = new Uint8Array(424);
  const w32 = (o, v) => { b[o] = v & 0xFF; b[o + 1] = (v >> 8) & 0xFF; b[o + 2] = (v >> 16) & 0xFF; b[o + 3] = (v >>> 24) & 0xFF; };
  w32(0, 30);                                              // Land-Rate
  for (let i = 0; i < 12; i++) { w32(4 + i * 8, 2 + i); w32(8 + i * 8, 396 + (i % 2) * 3); }   // Staralili/Bidiza
  w32(0x64, 84); w32(0x6C, 401); w32(0x74, 163); w32(0x7C, 32); w32(0xA4, 58);              // Schwarm, Tag, Nacht, Radar, Rubin
  w32(0xCC, 10); b[0xD0] = 30; b[0xD1] = 20; w32(0xD4, 54);                                  // Surfen: Enton 20–30
  w32(0x124, 25); b[0x128] = 10; b[0x129] = 5; w32(0x12C, 129);                              // Angel: Karpador 5–10
  w32(0x17C, 5); w32(0x180 + 4, 9999);                                                       // Superangel: ungültige Art → 0
  const [t] = Rando._internal.readWild([b]);
  assert.equal(t.r, 30);
  assert.deepEqual(t.land[0], [2, 396]);
  assert.deepEqual(t.land[11], [13, 399]);
  assert.deepEqual([t.swarm[0], t.day[0], t.night[0], t.radar[0], t.dual[0]], [84, 401, 163, 32, 58]);
  assert.deepEqual([t.surf.r, t.surf.s[0]], [10, [20, 30, 54]]);
  assert.deepEqual([t.old.r, t.old.s[0]], [25, [5, 10, 129]]);
  assert.equal(t.super.s[0][2], 0);
  assert.equal(Rando._internal.readWild([new Uint8Array(100)])[0], null);
});
