const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/frlg.json');
const tiles = require('../Karte/tiles-frlg/index.json');

test('Feuerrot/Blattgrün enthält Kanto und alle sieben Sevii-Eilande', () => {
  assert.match(data.source, /PokeAPI/);
  assert.match(data.source, /FireRed ROM \(BPRD\)/);
  assert.match(data.mapSource, /MapHeader/);
  assert.match(data.mapAuthor, /GAME FREAK/);
  assert.deepEqual([data.width, data.height], [768, 640]);
  assert.equal(data.locations.length, 60);
  assert.equal(new Set(data.locations.map(location => location.slug)).size, 60);
  assert.equal(data.locations.filter(location => location.type === 'route').length, 25);
  assert.equal(data.locations.filter(location => location.region === 'sevii' && /^Eiland /.test(location.de)).length, 7);
  for (const name of ['Alabastia', 'Saffronia City', 'Zinnoberinsel', 'Pokémon Liga', 'Route 1', 'Route 25', 'Glühweg', 'Tanibo-Ruinen']) {
    assert.ok(data.locations.some(location => location.de === name), `${name} fehlt`);
  }
});

test('Flächen und editionsspezifische Funddaten sind gültig', () => {
  const wildPlaces = data.locations.filter(location => location.wild.firered.grass.length || location.wild.firered.surf.length);
  const differences = data.locations.filter(location => JSON.stringify(location.wild.firered) !== JSON.stringify(location.wild.leafgreen));
  assert.ok(wildPlaces.length >= 50, `nur ${wildPlaces.length} Orte mit Wilddaten`);
  assert.ok(differences.length >= 25, `nur ${differences.length} editionsverschiedene Orte`);

  for (const location of data.locations) {
    const [x1, z1, x2, z2] = location.area;
    assert.ok(x1 >= 0 && z1 >= 0 && x2 <= data.width && z2 <= data.height, `${location.de}: außerhalb der Karte`);
    assert.ok(x1 < x2 && z1 < z2, `${location.de}: leere Fläche`);
    for (const version of ['firered', 'leafgreen']) for (const method of ['grass', 'surf']) for (const mon of location.wild[version][method]) {
      assert.ok(mon.id >= 1 && mon.id <= 386, `${location.de}: ungültige Nationaldex-ID ${mon.id}`);
      assert.ok(mon.p > 0 && mon.p <= 100, `${location.de}: ungültige Chance ${mon.p}`);
      assert.ok(mon.min > 0 && mon.max >= mon.min, `${location.de}: ungültige Level`);
    }
  }
});

test('ROM-Tilemanifest verweist vollständig auf lokale WebP-Blätter', () => {
  assert.equal(tiles.version, 3);
  assert.equal(tiles.nativeZoom, 4);
  assert.deepEqual([tiles.width, tiles.height], [data.width, data.height]);
  assert.deepEqual(tiles.levels.map(level => level.z), [4, 2, 0]);
  assert.equal(tiles.levels.find(level => level.z === 4).sheets.length, 22);
  let sheets = 0;
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    sheets++;
    const file = path.join(ROOT, 'Karte', 'tiles-frlg', String(level.z), `${sheet}.webp`);
    assert.ok(fs.existsSync(file), `${level.z}/${sheet}.webp fehlt`);
    assert.ok(fs.statSync(file).size > 20_000, `${level.z}/${sheet}.webp ist verdächtig klein`);
  }
  assert.equal(sheets, 27);
  assert.ok(fs.existsSync(path.join(ROOT, 'Karte', 'tiles-frlg', 'SOURCE.txt')));
});
