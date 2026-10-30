// Save-Editor: Pokémon zwischen Team und Box verschieben (PtEdit.moveMon). Ausführen: node --test "tests/*.test.*"
// Team- und Box-Block werden nachgebaut (wie im Test für beschädigte Blöcke), die Pokémon sind echte PK4-Daten.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const vm = require('vm');
const path = require('path');
const PtSave = require('../SaveViewer/pt-save.js');
const PtEdit = require('../SaveViewer/pt-edit.js');

const ctx = { window: {} };
vm.createContext(ctx);
vm.runInContext(fs.readFileSync(path.join(__dirname, '../SaveViewer/data-pt.js'), 'utf8'), ctx);
const D = ctx.window.PT_DATA;
const L = PtSave.LAYOUT;

const w16 = (b, o, v) => { b[o] = v & 0xFF; b[o + 1] = v >>> 8; };
const w32 = (b, o, v) => { w16(b, o, v & 0xFFFF); w16(b, o + 2, v >>> 16); };
const u16 = (b, o) => b[o] | (b[o + 1] << 8);

// Entschlüsseltes Box-Pokémon (136 Byte)
function mon(species, { pid = 0x12345678 + species, exp = 1000, item = 0, egg = false } = {}) {
  const d = new Uint8Array(L.sizeStored);
  w32(d, 0, pid >>> 0);
  w16(d, 0x08, species);
  w16(d, 0x0A, item);
  w32(d, 0x10, exp);
  d.set([8, 4, 0, 12, 0, 0], 0x18);                                   // EVs
  w16(d, 0x28, 33);                                                   // Tackle
  w32(d, 0x38, ((egg ? 1 : 0) << 30) | (31 << 0) | (20 << 5) | (10 << 10) | (31 << 15) | (5 << 20) | (25 << 25));
  return d;
}
// Team-Pokémon: Kampfdaten wie im Spiel (aktuelle KP frei wählbar)
function partyMon(species, opts = {}) {
  const d = new Uint8Array(L.sizeParty);
  d.set(mon(species, opts));
  d[0x8C] = 10;
  w16(d, 0x8E, opts.hp ?? 30);
  w16(d, 0x90, 30);
  return d;
}

// Nachgebaute Blöcke; slots: Box 1, Platz 0, 1, …
function save({ team = [], box = [] }) {
  const g = new Uint8Array(L.dex + 0x200), s = new Uint8Array(4 + 18 * 30 * L.sizeStored + 0x200);
  g.set([0x38, 0x01, 0x4D, 0x01, 0xFF, 0xFF], L.trainer);                // Trainer „NI“
  w16(g, L.trainer + 0x10, 12345); w16(g, L.trainer + 0x12, 54321); g[L.trainer + 0x19] = 5;
  g[L.party - 4] = team.length;
  for (let i = 0; i < 6; i++) g.set(PtSave.encryptPK4(team[i] || new Uint8Array(L.sizeParty)), L.party + i * L.sizeParty);
  for (let i = 0; i < 18 * 30; i++) s.set(PtSave.encryptPK4(box[i] || new Uint8Array(L.sizeStored)), 4 + i * L.sizeStored);
  return { g, s };
}
function withBlocks(blocks, fn) {
  const og = PtSave.generalBlock, os = PtSave.storageBlock;
  PtSave.generalBlock = () => ({ bytes: blocks.g, offset: 0, size: blocks.g.length, valid: true });
  PtSave.storageBlock = () => ({ bytes: blocks.s, offset: 0, size: blocks.s.length, valid: true });
  try { return fn(); } finally { PtSave.generalBlock = og; PtSave.storageBlock = os; }
}
const teamOf = b => Array.from({ length: b.g[L.party - 4] }, (_, i) => PtSave.decryptPK4(b.g, L.party + i * L.sizeParty, L.sizeParty).data);
const boxAt = (b, i) => { const r = PtSave.decryptPK4(b.s, 4 + i * L.sizeStored, L.sizeStored); return r && u16(r.data, 8) ? r.data : null; };
const move = (b, from, to) => withBlocks(b, () => PtEdit.moveMon(new Uint8Array(16), from, to, D));
const P = slot => ({ area: 'party', slot }), B = (slot, box = 0) => ({ area: 'box', box, slot });

test('Team → Box: Team rückt auf, Kampfdaten fallen weg, leerer Platz wie im Spiel', () => {
  const b = save({ team: [partyMon(393), partyMon(396), partyMon(399)] });
  const r = move(b, P(0), B(4));
  assert.deepEqual(r.where, B(4));
  assert.deepEqual(teamOf(b).map(d => u16(d, 8)), [396, 399]);
  assert.equal(boxAt(b, 4).length, L.sizeStored);
  assert.equal(u16(boxAt(b, 4), 8), 393);
  // freier Team-Platz: verschlüsseltes Leer-Pokémon (keine Nullen – das wäre im Spiel ein Bad Egg)
  const raw = b.g.subarray(L.party + 2 * L.sizeParty, L.party + 3 * L.sizeParty);
  assert.deepEqual(Array.from(raw), Array.from(PtSave.encryptPK4(new Uint8Array(L.sizeParty))));
});

test('Box → Team: Level und Werte neu berechnet, volle KP', () => {
  const b = save({ team: [partyMon(393)], box: [mon(396, { exp: 1000 })] });
  const r = move(b, B(0), P(5));
  assert.deepEqual(r.where, P(1));
  const d = teamOf(b)[1], p = PtSave.personalEntry(D, 396, 0);
  const level = PtSave.levelFromExp(D, p[9], 1000);
  const stats = PtSave.calcStats(p.slice(0, 6), [31, 20, 10, 31, 5, 25], [8, 4, 0, 12, 0, 0], level, (0x12345678 + 396) % 25, 396);
  assert.equal(d[0x8C], level);
  assert.equal(u16(d, 0x8E), stats[0]);
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(i => u16(d, 0x90 + i * 2)), stats);
  assert.equal(boxAt(b, 0), null);
});

test('Belegtes Ziel: tauschen (Team ↔ Box, Box ↔ Box, im Team)', () => {
  const b = save({ team: [partyMon(393), partyMon(396)], box: [mon(25), mon(133)] });
  move(b, P(1), B(0));
  assert.deepEqual(teamOf(b).map(d => u16(d, 8)), [393, 25]);
  assert.equal(u16(boxAt(b, 0), 8), 396);
  move(b, B(1), B(7, 3));
  assert.equal(boxAt(b, 1), null);
  assert.equal(u16(boxAt(b, 3 * 30 + 7), 8), 133);
  move(b, P(0), P(1));
  assert.deepEqual(teamOf(b).map(d => u16(d, 8)), [25, 393]);
});

test('Regeln wie im Spiel: Team voll, letztes kampffähiges Pokémon, Brief', () => {
  const full = save({ team: [1, 4, 7, 10, 13, 16].map(s => partyMon(s)), box: [mon(25)] });
  assert.throws(() => move(full, B(0), P(6)), e => e.code === 'full');
  const egg = save({ team: [partyMon(393), partyMon(175, { egg: true })] });
  assert.throws(() => move(egg, P(0), B(0)), e => e.code === 'last');          // nur das Ei bliebe übrig
  const fainted = save({ team: [partyMon(393), partyMon(396, { hp: 0 })] });
  assert.throws(() => move(fainted, P(0), B(0)), e => e.code === 'last');      // nur ein besiegtes bliebe übrig
  const mail = save({ team: [partyMon(393, { item: 137 }), partyMon(396)] });
  assert.throws(() => move(mail, P(0), B(0)), e => e.code === 'mail');
  assert.throws(() => move(mail, P(1), P(1)), e => e.code === 'same');
  assert.throws(() => move(mail, B(3), P(0)), e => e.code === 'empty');
});

const dexBit = (b, region, species) => (b.g[L.dex + 4 + region * 0x40 + ((species - 1) >> 3)] >> ((species - 1) & 7)) & 1;
const pidOf = d => (d[0] | d[1] << 8 | d[2] << 16 | d[3] << 24) >>> 0;
let seed = 7;
const rand = () => ((seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x80000000);

test('Neues Pokémon: Wesen, Geschlecht, Fähigkeit, Shiny wie gewählt, Trainer aus dem Spielstand', () => {
  const b = save({ team: [partyMon(393)] });
  const d = withBlocks(b, () => PtEdit.createMon(new Uint8Array(16), { species: 443, level: 30, nature: 3, gender: 1, ability: 1, shiny: true, ivs: 'perfect', moves: [33], rand }, D));
  const pid = pidOf(d), p = PtSave.personalEntry(D, 443, 0);
  assert.equal(pid % 25, 3);
  assert.ok((pid & 0xFF) < p[8]);                                     // ♀
  assert.equal((d[0x40] >> 1) & 3, 1);
  assert.equal(d[0x15], p[10] !== p[11] && p[11] ? p[11] : p[10]);    // Fähigkeit 2 (falls vorhanden)
  assert.ok(((12345 ^ 54321 ^ (pid >>> 16) ^ (pid & 0xFFFF)) >>> 0) < 8);   // Shiny
  assert.equal(u16(d, 0x0C), 12345);
  assert.deepEqual(Array.from(d.subarray(0x68, 0x6E)), [0x38, 0x01, 0x4D, 0x01, 0xFF, 0xFF]);
  assert.equal(PtSave.levelFromExp(D, p[9], d[0x10] | d[0x11] << 8 | d[0x12] << 16), 30);
  assert.equal((d[0x38] | d[0x39] << 8 | d[0x3A] << 16 | d[0x3B] << 24) & 0x3FFFFFFF, 0x3FFFFFFF);   // DVs 31
});

test('Hinzufügen: freier Platz, Pokédex gefangen + gesehen, Team-Ende, belegt/voll', () => {
  const b = save({ team: [partyMon(393)], box: [mon(25)] });
  const d = withBlocks(b, () => PtEdit.createMon(new Uint8Array(16), { species: 133, level: 5, gender: 1, rand }, D));
  assert.throws(() => withBlocks(b, () => PtEdit.addMon(new Uint8Array(16), B(0), d, D)), e => e.code === 'taken');
  withBlocks(b, () => PtEdit.addMon(new Uint8Array(16), B(2), d, D));
  assert.equal(u16(boxAt(b, 2), 8), 133);
  assert.deepEqual([0, 1, 2, 3].map(r => dexBit(b, r, 133)), [1, 1, 1, 1]);    // gefangen, gesehen, Geschlecht ♀ zuerst
  const r = withBlocks(b, () => PtEdit.addMon(new Uint8Array(16), P(4), d, D));
  assert.deepEqual(r.where, P(1));
  assert.equal(teamOf(b).length, 2);
  const full = save({ team: [1, 4, 7, 10, 13, 16].map(s => partyMon(s)) });
  assert.throws(() => withBlocks(full, () => PtEdit.addMon(new Uint8Array(16), P(6), d, D)), e => e.code === 'full');
});

test('Freilassen: Team rückt auf, Box-Platz leer, letztes kampffähiges bleibt', () => {
  const b = save({ team: [partyMon(393), partyMon(396), partyMon(399)], box: [mon(25)] });
  withBlocks(b, () => PtEdit.releaseMon(new Uint8Array(16), P(0)));
  assert.deepEqual(teamOf(b).map(d => u16(d, 8)), [396, 399]);
  withBlocks(b, () => PtEdit.releaseMon(new Uint8Array(16), B(0)));
  assert.equal(boxAt(b, 0), null);
  const one = save({ team: [partyMon(393)] });
  assert.throws(() => withBlocks(one, () => PtEdit.releaseMon(new Uint8Array(16), P(0))), e => e.code === 'last');
});
