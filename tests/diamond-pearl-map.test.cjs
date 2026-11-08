const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/diamond-pearl.json');
const tiles = require('../Karte/tiles-diamond-pearl/index.json');

test('Diamant/Perl enthält die eigene Sinnoh-Oberwelt aus pokediamond', () => {
  assert.match(data.source, /^pret\/pokediamond [0-9a-f]{12} \+ PokeAPI$/);
  assert.match(data.mapSource, /Landmodelle/);
  assert.match(data.mapAuthor, /GAME FREAK/);
  assert.deepEqual([data.width, data.height], [960, 800]);
  assert.deepEqual(data.origin, [0, 160]);
  assert.equal(data.locations.length, 61);
  assert.equal(new Set(data.locations.map(location => location.slug)).size, 61);
  assert.equal(data.locations.filter(location => location.type === 'route').length, 30);
  for (const name of ['Zweiblattdorf', 'Jubelstadt', 'Ewigenau', 'Blizzach', 'Pokémon-Liga', 'Kampfareal', 'Neumondinsel', 'Route 201', 'Route 230']) {
    assert.ok(data.locations.some(location => location.de === name), `${name} fehlt`);
  }
});

test('Diamant und Perl besitzen getrennte, gültige Funddaten', () => {
  const wildPlaces = data.locations.filter(location => location.wild.diamond.grass.length || location.wild.diamond.surf.length);
  const differences = data.locations.filter(location => JSON.stringify(location.wild.diamond) !== JSON.stringify(location.wild.pearl));
  assert.equal(wildPlaces.length, 44);
  assert.equal(differences.length, 18);

  const forest = data.locations.find(location => location.en === 'Eterna Forest');
  assert.ok(forest.wild.diamond.grass.some(mon => mon.id === 198), 'Kramurx fehlt in Diamant');
  assert.ok(forest.wild.pearl.grass.some(mon => mon.id === 200), 'Traunfugil fehlt in Perl');
  assert.ok(!forest.wild.diamond.grass.some(mon => mon.id === 200));

  for (const location of data.locations) {
    const [x1, z1, x2, z2] = location.area;
    assert.ok(x1 >= 0 && z1 >= 0 && x2 <= data.width && z2 <= data.height, `${location.de}: außerhalb der Karte`);
    assert.ok(x1 < x2 && z1 < z2, `${location.de}: leere Fläche`);
    for (const version of ['diamond', 'pearl']) for (const method of ['grass', 'surf']) for (const mon of location.wild[version][method]) {
      assert.ok(mon.id >= 1 && mon.id <= 493, `${location.de}: ungültige Nationaldex-ID ${mon.id}`);
      assert.ok(mon.p > 0 && mon.p <= 100, `${location.de}: ungültige Chance ${mon.p}`);
      assert.ok(mon.min > 0 && mon.max >= mon.min, `${location.de}: ungültige Level`);
    }
  }
});

test('DP-Tilemanifest verweist vollständig auf echte lokale WebP-Blätter', () => {
  assert.equal(tiles.version, 3);
  assert.equal(tiles.nativeZoom, 4);
  assert.deepEqual([tiles.width, tiles.height], [data.width, data.height]);
  assert.deepEqual(tiles.origin, data.origin);
  assert.deepEqual(tiles.levels.map(level => level.z), [4, 2, 0]);
  assert.equal(tiles.levels.find(level => level.z === 4).sheets.length, 36);
  assert.equal(tiles.levels.flatMap(level => level.sheets).length, 41);
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    const file = path.join(ROOT, 'Karte', 'tiles-diamond-pearl', String(level.z), `${sheet}.webp`);
    assert.ok(fs.existsSync(file), `${level.z}/${sheet}.webp fehlt`);
    assert.ok(fs.statSync(file).size > 1_000, `${level.z}/${sheet}.webp ist verdächtig klein`);
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'Karte', 'tiles-diamond-pearl', 'SOURCE.txt')));
});
