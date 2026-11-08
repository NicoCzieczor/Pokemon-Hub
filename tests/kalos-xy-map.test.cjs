const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/kalos-xy.json');
const tiles = require('../Karte/tiles-kalos-xy/index.json');

test('X/Y enthält die aus der 3DS-ROM gerenderte Kalos-Spielwelt', () => {
  assert.match(data.source, /Pokemon X and Pokemon Y ROMs/);
  assert.match(data.mapSource, /Pokemon X ROM archives a\/0\/4\/1, a\/0\/4\/2 and a\/0\/1\/3/);
  assert.deepEqual([data.width, data.height], [1344, 1536]);
  assert.equal(data.locations.length, 74);
  assert.equal(new Set(data.locations.map(location => location.slug)).size, 74);
  assert.equal(data.locations.filter(location => location.type === 'route').length, 22);
  for (const name of ['Escissia', 'Illumina City', 'Nouvaria City', 'Relievera City', 'Yantara City', 'Romantia City', 'Fluxia City', 'Fractalia City', 'Batika City', 'Pokémon Liga', 'Azurbucht']) {
    assert.ok(data.locations.some(location => location.de === name), `${name} fehlt`);
  }
});

test('X und Y besitzen getrennte Original-Begegnungstabellen', () => {
  const wildPlaces = data.locations.filter(location => location.wild.x.grass.length || location.wild.x.surf.length);
  const differing = data.locations.filter(location => JSON.stringify(location.wild.x) !== JSON.stringify(location.wild.y));
  assert.equal(wildPlaces.length, 35);
  assert.equal(differing.length, 12);

  const route2 = data.locations.find(location => location.slug === 'route-2');
  assert.ok(route2.wild.x.grass.some(mon => mon.id === 13)); // Hornliu
  assert.ok(!route2.wild.x.grass.some(mon => mon.id === 10));
  assert.ok(route2.wild.y.grass.some(mon => mon.id === 10)); // Raupy
  assert.ok(!route2.wild.y.grass.some(mon => mon.id === 13));

  for (const location of data.locations) {
    const [x1, y1, x2, y2] = location.area;
    assert.ok(x1 >= 0 && y1 >= 0 && x2 <= data.width && y2 <= data.height, location.de);
    assert.ok(x1 < x2 && y1 < y2, location.de);
    for (const version of ['x', 'y']) for (const method of ['grass', 'surf']) for (const mon of location.wild[version][method]) {
      assert.ok(mon.id >= 1 && mon.id <= 721, `${location.de}: #${mon.id}`);
      assert.ok(mon.p > 0 && mon.p <= 100, `${location.de}: ${mon.p}%`);
      assert.ok(mon.min > 0 && mon.max >= mon.min, location.de);
    }
  }
});

test('X/Y-Tilemanifest verweist vollständig auf den echten 3DS-ROM-Render', () => {
  assert.equal(tiles.version, 3);
  assert.equal(tiles.nativeZoom, 4);
  assert.deepEqual([tiles.width, tiles.height], [data.width, data.height]);
  assert.deepEqual(tiles.origin, [0, 64]);
  assert.deepEqual(tiles.levels.map(level => level.z), [4, 2, 0]);
  assert.equal(tiles.levels.find(level => level.z === 4).sheets.length, 87);
  assert.equal(tiles.levels.flatMap(level => level.sheets).length, 98);
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    const file = path.join(ROOT, 'Karte', 'tiles-kalos-xy', String(level.z), `${sheet}.webp`);
    assert.ok(fs.statSync(file).size > 1_000, file);
  }
  const source = fs.readFileSync(path.join(ROOT, 'Karte', 'tiles-kalos-xy', 'SOURCE.txt'), 'utf8');
  assert.match(source, /Title ID 0004000000055D00/);
  assert.match(source, /a\/0\/4\/1/);
  assert.match(source, /a\/0\/4\/2/);
  assert.match(source, /a\/0\/1\/3/);
  assert.match(source, /Universal Pokemon Randomizer ZX/);
});
