// Omega Rubin / Alpha Saphir: Trainer-Pokémon wie das Spiel sie erzeugt (oras-rom.js trainerTable) – Wesen, Fähigkeit, DVs
const test = require('node:test');
const assert = require('node:assert/strict');
const OrasRom = require('../Bosse/oras-rom.js');
const { tinyMT, trainerRoll, trainerTable } = OrasRom._internal;
const B = require('../Bosse/bosses-oras.json');

test('TinyMT32 liefert die Referenzfolge (Standardparameter, Startwert 1)', () => {
  const next = tinyMT(1);
  assert.deepEqual([next(), next(), next(), next(), next()], [2545341989, 981918433, 3715302833, 2387538352, 3591001365]);
});

test('Wesen: TinyMT aus DV-Byte + Level + Art, um die Trainerklasse weitergedreht', () => {
  const next = tinyMT(120 + 30 + 25);
  for (let i = 0; i < 7; i++) next();
  const v = next();
  assert.deepEqual(trainerRoll(120, 30, 25, 7), { nature: (v >>> 8) % 25, slot: (v >>> 16) & 1 });
});

test('Trainerdaten: DV-Byte & 31, Fähigkeit fest oder vom Spiel bestimmt', () => {
  const trdata = new Uint8Array(0x14);
  trdata[0] = 0; trdata[2] = 7; trdata[7] = 2;           // Format 0, Klasse 7, zwei Pokémon
  const trpoke = new Uint8Array(16);
  trpoke.set([200, 0x30, 30, 0, 25, 0, 0, 0], 0);        // DV-Byte 200, Fähigkeit 3 (versteckt), Level 30, Pikachu
  trpoke.set([120, 0x00, 30, 0, 25, 0, 0, 0], 8);        // DV-Byte 120, Fähigkeit vom Spiel
  const [a, b] = trainerTable([trdata], [trpoke])[0].party;
  assert.equal(a.iv, 8);
  assert.equal(a.slot, 2);
  assert.equal(b.iv, 24);
  assert.deepEqual({ nature: b.nature, slot: b.slot }, trainerRoll(120, 30, 25, 7));
});

test('bosses-oras.json: jedes Trainer-Pokémon hat ein Wesen; gleiche Pokémon desselben Trainers dasselbe', () => {
  for (const [id, t] of Object.entries(B.trainers)) {
    const seen = new Map();
    for (const p of t.p) {
      assert.ok(Number.isInteger(p[5]) && p[5] >= 0 && p[5] < 25, `Trainer ${id}: Wesen ${p[5]}`);
      assert.ok(p[7] >= 0 && p[7] <= 31, `Trainer ${id}: DVs ${p[7]}`);
      const k = [p[0], p[2], p[7]].join(':');
      if (seen.has(k)) assert.equal(seen.get(k), p[5], `Trainer ${id}: ${k}`);
      seen.set(k, p[5]);
    }
  }
});
