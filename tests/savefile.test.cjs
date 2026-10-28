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
