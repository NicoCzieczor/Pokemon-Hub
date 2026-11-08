const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/kanto.json');
const tiles = require('../Karte/tiles-kanto/index.json');

test('Kanto-Karte enthält alle Städte und Routen aus Rot/Blau', () => {
  assert.equal(data.locations.length, 36);
  assert.equal(new Set(data.locations.map(l => l.slug)).size, 36);
  assert.equal(data.locations.filter(l => l.type === 'route').length, 25);
  for (const l of data.locations) {
    assert.equal(l.area.length, 4, l.key);
    assert.ok(l.area[0] >= 0 && l.area[1] >= 0 && l.area[2] <= data.width && l.area[3] <= data.height, l.key);
    assert.ok(l.area[0] < l.area[2] && l.area[1] < l.area[3], l.key);
  }
});

test('Rot- und Blau-Begegnungen sind gültig', () => {
  let tables = 0;
  for (const l of data.locations) for (const version of ['red', 'blue']) {
    const wild = l.wild[version];
    for (const method of ['grass', 'surf']) {
      const list = wild[method];
      if (!list.length) continue;
      tables++;
      const total = list.reduce((n, p) => n + p.p, 0);
      assert.ok(Math.abs(total - 100) <= 0.11, `${l.key} ${version} ${method}: ${total}%`);
      for (const p of list) {
        assert.ok(p.id >= 1 && p.id <= 151, `${l.key}: #${p.id}`);
        assert.ok(p.min > 0 && p.max >= p.min, l.key);
      }
    }
  }
  assert.ok(tables > 40);
});

test('Tilemanifest verweist vollständig auf lokale WebP-Blätter', () => {
  assert.equal(tiles.width, data.width);
  assert.equal(tiles.height, data.height);
  assert.deepEqual(tiles.levels.map(l => l.z), [0, 2, 4]);
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    const file = path.join(ROOT, 'Karte', 'tiles-kanto', String(level.z), `${sheet}.webp`);
    assert.ok(fs.statSync(file).size > 0, file);
  }
});
