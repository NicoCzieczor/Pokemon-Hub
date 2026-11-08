const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/unova-b2w2.json');
const tiles = require('../Karte/tiles-unova-b2w2/index.json');

test('Schwarz 2/Weiß 2 enthält die veränderte Einall-Oberwelt', () => {
  assert.match(data.source, /^fuddlesworth\/pokebw2@[0-9a-f]{12} \+ user-provided German Pokemon White 2 ROM \(IRDD\)$/);
  assert.match(data.mapSource, /White 2 ROM archives/);
  assert.deepEqual([data.width, data.height], [832, 768]);
  assert.equal(data.locations.length, 82);
  assert.equal(new Set(data.locations.map(location => location.slug)).size, 82);
  assert.equal(data.locations.filter(location => location.type === 'route').length, 22);
  assert.ok(!data.locations.some(location => location.slug === 'route-10'), 'die in B2/W2 unzugängliche Route 10 darf nicht auswählbar sein');
  for (const name of ['Eventura City', 'Dausing', 'Vapydro City', 'Abidaya City', 'Route 19', 'Route 23', 'Pokéwood', 'Pokémon World Tournament', 'Kanalisation von Stratos', 'Umkehrberg']) {
    assert.ok(data.locations.some(location => location.de === name), `${name} fehlt`);
  }
});

test('Schwarz 2 und Weiß 2 besitzen getrennte Begegnungstabellen aus dem Spielcode', () => {
  const wildPlaces = data.locations.filter(location => Object.values(location.wild).some(wild => wild.grass.length || wild.surf.length));
  const differing = data.locations.filter(location => JSON.stringify(location.wild['black-2']) !== JSON.stringify(location.wild['white-2']));
  assert.equal(wildPlaces.length, 58);
  assert.equal(differing.length, 22);

  const route4 = data.locations.find(location => location.slug === 'route-4');
  assert.ok(route4.wild['black-2'].grass.some(mon => mon.id === 568)); // Unratütox
  assert.ok(route4.wild['white-2'].grass.some(mon => mon.id === 572)); // Picochilla
  const complex = data.locations.find(location => location.slug === 'virbank-complex');
  assert.ok(complex.wild['black-2'].grass.some(mon => mon.id === 240)); // Magby
  assert.ok(complex.wild['white-2'].grass.some(mon => mon.id === 239)); // Elekid

  for (const location of data.locations) {
    const [x1, y1, x2, y2] = location.area;
    assert.ok(x1 >= 0 && y1 >= 0 && x2 <= data.width && y2 <= data.height, location.de);
    assert.ok(x1 < x2 && y1 < y2, location.de);
    for (const version of ['black-2', 'white-2']) for (const method of ['grass', 'surf']) for (const mon of location.wild[version][method]) {
      assert.ok(mon.id >= 1 && mon.id <= 649, `${location.de}: #${mon.id}`);
      assert.ok(mon.p > 0 && mon.p <= 100, `${location.de}: ${mon.p}%`);
      assert.ok(mon.min > 0 && mon.max >= mon.min, location.de);
    }
  }
});

test('B2/W2-Tilemanifest verweist vollständig auf den echten Weiß-2-ROM-Render', () => {
  assert.equal(tiles.version, 3);
  assert.equal(tiles.nativeZoom, 4);
  assert.deepEqual([tiles.width, tiles.height], [data.width, data.height]);
  assert.deepEqual(tiles.origin, data.origin);
  assert.deepEqual(tiles.levels.map(level => level.z), [4, 2, 0]);
  assert.equal(tiles.levels.find(level => level.z === 4).sheets.length, 40);
  assert.equal(tiles.levels.flatMap(level => level.sheets).length, 45);
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    const file = path.join(ROOT, 'Karte', 'tiles-unova-b2w2', String(level.z), `${sheet}.webp`);
    assert.ok(fs.statSync(file).size > 1_000, file);
  }
  const source = fs.readFileSync(path.join(ROOT, 'Karte', 'tiles-unova-b2w2', 'SOURCE.txt'), 'utf8');
  assert.match(source, /Spielcode IRDD/);
  assert.match(source, /277 belegte/);
  assert.match(source, /black2-\/white2-Tabellen/);
});
