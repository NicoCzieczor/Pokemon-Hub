const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/gold-silver.json');
const tiles = require('../Karte/tiles-gold-silver/index.json');

test('Gold/Silber enthält die vollständige Johto- und Kanto-Außenwelt', () => {
  assert.match(data.source, /^pret\/pokegold@[0-9a-f]{12}$/);
  assert.match(data.mapSource, /Game Boy Color/);
  assert.match(data.mapAuthor, /GAME FREAK/);
  assert.deepEqual([data.width, data.height], [800, 384]);
  assert.equal(data.locations.length, 71);
  assert.equal(new Set(data.locations.map(location => location.slug)).size, 71);
  assert.equal(data.locations.filter(location => location.type === 'route').length, 46);
  assert.equal(data.locations.filter(location => location.type === 'city' || location.type === 'town').length, 20);
  for (const name of ['Neuborkia', 'Dukatia City', 'Ebenholz City', 'Alabastia', 'Saffronia City', 'Route 1', 'Route 46', 'Nationalpark', 'Silberberg']) {
    assert.ok(data.locations.some(location => location.de === name), `${name} fehlt`);
  }
});

test('Gold- und Silber-Begegnungen stammen aus gültigen Gen-2-Tabellen', () => {
  const wildPlaces = data.locations.filter(location => location.wild.gold.grass.length || location.wild.gold.surf.length);
  const differences = data.locations.filter(location => JSON.stringify(location.wild.gold) !== JSON.stringify(location.wild.silver));
  assert.equal(wildPlaces.length, 63);
  assert.equal(differences.length, 24);
  for (const location of data.locations) {
    const [x1, z1, x2, z2] = location.area;
    assert.ok(x1 >= 0 && z1 >= 0 && x2 <= data.width && z2 <= data.height, `${location.de}: außerhalb der Karte`);
    assert.ok(x1 < x2 && z1 < z2, `${location.de}: leere Fläche`);
    for (const version of ['gold', 'silver']) for (const method of ['grass', 'surf']) for (const mon of location.wild[version][method]) {
      assert.ok(mon.id >= 1 && mon.id <= 251, `${location.de}: ungültige Nationaldex-ID ${mon.id}`);
      assert.ok(mon.p > 0 && mon.p <= 100, `${location.de}: ungültige Chance ${mon.p}`);
      assert.ok(mon.min > 0 && mon.max >= mon.min, `${location.de}: ungültige Level`);
    }
  }
});

test('GBC-Tilemanifest verweist vollständig auf die lokalen WebP-Blätter', () => {
  assert.equal(tiles.version, 3);
  assert.equal(tiles.nativeZoom, 4);
  assert.deepEqual([tiles.width, tiles.height], [data.width, data.height]);
  assert.deepEqual(tiles.levels.map(level => level.z), [4, 2, 0]);
  assert.equal(tiles.levels.find(level => level.z === 4).sheets.length, 18);
  let sheets = 0;
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    sheets++;
    const file = path.join(ROOT, 'Karte', 'tiles-gold-silver', String(level.z), `${sheet}.webp`);
    assert.ok(fs.existsSync(file), `${level.z}/${sheet}.webp fehlt`);
    assert.ok(fs.statSync(file).size > 1_000, `${level.z}/${sheet}.webp ist verdächtig klein`);
  }
  assert.equal(sheets, 21);
  assert.ok(fs.existsSync(path.join(ROOT, 'Karte', 'tiles-gold-silver', 'SOURCE.txt')));
});
