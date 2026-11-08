const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/crystal.json');
const tiles = require('../Karte/tiles-crystal/index.json');

test('Kristall enthält Johto, Kanto und die zusätzliche Duellturm-Außenkarte', () => {
  assert.match(data.source, /^pret\/pokecrystal@[0-9a-f]{12}$/);
  assert.match(data.mapSource, /Crystal Game Boy Color/);
  assert.deepEqual([data.width, data.height], [800, 384]);
  assert.equal(data.locations.length, 72);
  assert.equal(new Set(data.locations.map(location => location.slug)).size, 72);
  assert.equal(data.locations.filter(location => location.type === 'route').length, 46);
  assert.equal(data.locations.filter(location => location.type === 'city' || location.type === 'town').length, 20);
  const tower = data.locations.find(location => location.slug === 'battle-tower');
  assert.ok(tower, 'Duellturm fehlt');
  assert.equal(tower.de, 'Duellturm');
  assert.equal(tower.region, 'johto');
});

test('Kristall-Begegnungen stammen aus gültigen Gen-2-Tabellen', () => {
  const wildPlaces = data.locations.filter(location => location.wild.crystal.grass.length || location.wild.crystal.surf.length);
  assert.equal(wildPlaces.length, 63);
  for (const location of data.locations) {
    const [x1, z1, x2, z2] = location.area;
    assert.ok(x1 >= 0 && z1 >= 0 && x2 <= data.width && z2 <= data.height, location.de);
    assert.ok(x1 < x2 && z1 < z2, location.de);
    for (const method of ['grass', 'surf']) for (const mon of location.wild.crystal[method]) {
      assert.ok(mon.id >= 1 && mon.id <= 251, `${location.de}: #${mon.id}`);
      assert.ok(mon.p > 0 && mon.p <= 100, `${location.de}: ${mon.p}%`);
      assert.ok(mon.min > 0 && mon.max >= mon.min, location.de);
    }
  }
});

test('Kristalls GBC-Tilemanifest verweist auf lokale WebP-Blätter', () => {
  assert.equal(tiles.version, 3);
  assert.equal(tiles.nativeZoom, 4);
  assert.deepEqual([tiles.width, tiles.height], [data.width, data.height]);
  assert.deepEqual(tiles.levels.map(level => level.z), [4, 2, 0]);
  assert.equal(tiles.levels.find(level => level.z === 4).sheets.length, 19);
  assert.equal(tiles.levels.flatMap(level => level.sheets).length, 22);
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    const file = path.join(ROOT, 'Karte', 'tiles-crystal', String(level.z), `${sheet}.webp`);
    assert.ok(fs.statSync(file).size > 1_000, file);
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'Karte', 'tiles-crystal', 'SOURCE.txt')));
  assert.notDeepEqual(
    fs.readFileSync(path.join(ROOT, 'Karte', 'tiles-crystal', '0', '0_0.webp')),
    fs.readFileSync(path.join(ROOT, 'Karte', 'tiles-gold-silver', '0', '0_0.webp')),
    'Kristall darf nicht nur die Gold/Silber-Kartenblätter wiederverwenden',
  );
});
