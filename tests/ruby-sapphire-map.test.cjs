const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/ruby-sapphire.json');
const tiles = require('../Karte/tiles-ruby-sapphire/index.json');

test('Rubin/Saphir enthält die ursprüngliche Hoenn-Welt', () => {
  assert.match(data.source, /^pret\/pokeruby@[0-9a-f]{12}$/);
  assert.match(data.mapSource, /Ruby\/Sapphire GBA tilesets/);
  assert.deepEqual([data.width, data.height], [832, 512]);
  assert.equal(data.locations.length, 58);
  assert.equal(new Set(data.locations.map(location => location.slug)).size, 58);
  assert.equal(data.locations.filter(location => location.type === 'route').length, 34);
  assert.equal(data.locations.filter(location => location.type === 'city' || location.type === 'town').length, 16);
  for (const name of ['Wurzelheim', 'Blütenburg City', 'Malvenfroh City', 'Xeneroville', 'Prachtpolis City', 'Route 101', 'Route 134', 'Duellturm', 'Safari-Zone']) {
    assert.ok(data.locations.some(location => location.de === name), `${name} fehlt`);
  }
  assert.ok(!data.locations.some(location => location.de === 'Kampffront'), 'Smaragds Kampffront darf nicht in R/S auftauchen');
});

test('Rubin und Saphir besitzen getrennte echte Begegnungstabellen', () => {
  const differing = data.locations.filter(location => JSON.stringify(location.wild.ruby) !== JSON.stringify(location.wild.sapphire));
  assert.equal(differing.length, 9);
  const route114 = data.locations.find(location => location.slug === 'route-114');
  assert.ok(route114.wild.ruby.grass.some(mon => mon.id === 273));
  assert.ok(route114.wild.ruby.grass.some(mon => mon.id === 335));
  assert.ok(route114.wild.sapphire.grass.some(mon => mon.id === 270));
  assert.ok(route114.wild.sapphire.grass.some(mon => mon.id === 336));
  for (const location of data.locations) {
    const [x1, y1, x2, y2] = location.area;
    assert.ok(x1 >= 0 && y1 >= 0 && x2 <= data.width && y2 <= data.height, location.de);
    assert.ok(x1 < x2 && y1 < y2, location.de);
    for (const version of ['ruby', 'sapphire']) for (const method of ['grass', 'surf']) for (const mon of location.wild[version][method]) {
      assert.ok(mon.id >= 1 && mon.id <= 386, `${location.de}: #${mon.id}`);
      assert.ok(mon.p > 0 && mon.p <= 100, `${location.de}: ${mon.p}%`);
      assert.ok(mon.min > 0 && mon.max >= mon.min, location.de);
    }
  }
});

test('Rubin/Saphirs GBA-Tilemanifest verweist auf lokale WebP-Blätter', () => {
  assert.equal(tiles.version, 3);
  assert.equal(tiles.nativeZoom, 4);
  assert.deepEqual([tiles.width, tiles.height], [data.width, data.height]);
  assert.deepEqual(tiles.levels.map(level => level.z), [4, 2, 0]);
  assert.equal(tiles.levels.find(level => level.z === 4).sheets.length, 24);
  assert.equal(tiles.levels.flatMap(level => level.sheets).length, 27);
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    const file = path.join(ROOT, 'Karte', 'tiles-ruby-sapphire', String(level.z), `${sheet}.webp`);
    assert.ok(fs.statSync(file).size > 1_000, file);
  }
  const source = fs.readFileSync(path.join(ROOT, 'Karte', 'tiles-ruby-sapphire', 'SOURCE.txt'), 'utf8');
  assert.match(source, /pret\/pokeruby/);
  assert.match(source, /getrennten Begegnungstabellen/);
});
