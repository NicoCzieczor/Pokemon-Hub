const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/emerald.json');
const tiles = require('../Karte/tiles-emerald/index.json');

test('Smaragd enthält Hoenn und seine zusätzlichen Außenbereiche', () => {
  assert.match(data.source, /^pret\/pokeemerald@[0-9a-f]{12}$/);
  assert.match(data.mapSource, /Emerald GBA tilesets/);
  assert.deepEqual([data.width, data.height], [832, 512]);
  assert.equal(data.locations.length, 58);
  assert.equal(new Set(data.locations.map(location => location.slug)).size, 58);
  assert.equal(data.locations.filter(location => location.type === 'route').length, 34);
  assert.equal(data.locations.filter(location => location.type === 'city' || location.type === 'town').length, 16);
  for (const name of ['Wurzelheim', 'Blütenburg City', 'Malvenfroh City', 'Xeneroville', 'Prachtpolis City', 'Route 101', 'Route 134', 'Kampffront', 'Safari-Zone']) {
    assert.ok(data.locations.some(location => location.de === name), `${name} fehlt`);
  }
});

test('Smaragd-Begegnungen und Kartenflächen sind gültig', () => {
  const wildPlaces = data.locations.filter(location => location.wild.emerald.grass.length || location.wild.emerald.surf.length);
  assert.equal(wildPlaces.length, 46);
  for (const location of data.locations) {
    const [x1, y1, x2, y2] = location.area;
    assert.ok(x1 >= 0 && y1 >= 0 && x2 <= data.width && y2 <= data.height, location.de);
    assert.ok(x1 < x2 && y1 < y2, location.de);
    for (const method of ['grass', 'surf']) for (const mon of location.wild.emerald[method]) {
      assert.ok(mon.id >= 1 && mon.id <= 386, `${location.de}: #${mon.id}`);
      assert.ok(mon.p > 0 && mon.p <= 100, `${location.de}: ${mon.p}%`);
      assert.ok(mon.min > 0 && mon.max >= mon.min, location.de);
    }
  }
});

test('Smaragds GBA-Tilemanifest verweist auf lokale WebP-Blätter', () => {
  assert.equal(tiles.version, 3);
  assert.equal(tiles.nativeZoom, 4);
  assert.deepEqual([tiles.width, tiles.height], [data.width, data.height]);
  assert.deepEqual(tiles.levels.map(level => level.z), [4, 2, 0]);
  assert.equal(tiles.levels.find(level => level.z === 4).sheets.length, 25);
  assert.equal(tiles.levels.flatMap(level => level.sheets).length, 28);
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    const file = path.join(ROOT, 'Karte', 'tiles-emerald', String(level.z), `${sheet}.webp`);
    assert.ok(fs.statSync(file).size > 1_000, file);
  }
  assert.ok(fs.existsSync(path.join(ROOT, 'Karte', 'tiles-emerald', 'SOURCE.txt')));
});
