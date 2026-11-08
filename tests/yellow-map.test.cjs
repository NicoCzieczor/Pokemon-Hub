const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/yellow.json');
const tiles = require('../Karte/tiles-yellow/index.json');

test('Gelb enthält seine vollständige Kanto-Außenwelt und eigenen Inhalte', () => {
  assert.match(data.source, /^pret\/pokeyellow@[0-9a-f]{12}$/);
  assert.match(data.mapSource, /Yellow.*Game Boy Color/i);
  assert.equal(data.locations.length, 36);
  assert.equal(new Set(data.locations.map(location => location.slug)).size, 36);
  assert.equal(data.locations.filter(location => location.type === 'route').length, 25);
  assert.ok(data.locations.reduce((count, location) => count + location.items.length, 0) > 20);
  assert.ok(data.locations.reduce((count, location) => count + location.trainers.length, 0) > 100);
});

test('Gelb-Begegnungen stammen aus gültigen Gen-1-Tabellen', () => {
  const wildPlaces = data.locations.filter(location => location.wild.yellow.grass.length || location.wild.yellow.surf.length);
  assert.equal(wildPlaces.length, 25);
  for (const location of data.locations) {
    const [x1, y1, x2, y2] = location.area;
    assert.ok(x1 >= 0 && y1 >= 0 && x2 <= data.width && y2 <= data.height, location.de);
    assert.ok(x1 < x2 && y1 < y2, location.de);
    for (const method of ['grass', 'surf']) {
      const rows = location.wild.yellow[method];
      if (rows.length) assert.ok(Math.abs(rows.reduce((sum, mon) => sum + mon.p, 0) - 100) <= 0.11, `${location.de}/${method}`);
      for (const mon of rows) {
        assert.ok(mon.id >= 1 && mon.id <= 151, `${location.de}: #${mon.id}`);
        assert.ok(mon.min > 0 && mon.max >= mon.min, location.de);
      }
    }
  }
});

test('Gelbs GBC-Tilemanifest verweist auf lokale WebP-Blätter', () => {
  assert.equal(tiles.version, 3);
  assert.equal(tiles.nativeZoom, 4);
  assert.deepEqual([tiles.width, tiles.height], [data.width, data.height]);
  assert.deepEqual(tiles.levels.map(level => level.z), [4, 2, 0]);
  assert.equal(tiles.levels.flatMap(level => level.sheets).length, 11);
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    const file = path.join(ROOT, 'Karte', 'tiles-yellow', String(level.z), `${sheet}.webp`);
    assert.ok(fs.statSync(file).size > 1_000, file);
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'Karte', 'tiles-yellow', 'SOURCE.txt')));
  assert.notDeepEqual(
    fs.readFileSync(path.join(ROOT, 'Karte', 'tiles-yellow', '0', '0_0.webp')),
    fs.readFileSync(path.join(ROOT, 'Karte', 'tiles-kanto', '0', '0_0.webp')),
    'Gelb darf nicht nur die Rot/Blau-Kartenblätter wiederverwenden',
  );
});
