const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/alola-sm.json');
const tiles = require('../Karte/tiles-alola-sm/index.json');

test('Sonne/Mond enthält den gerenderten Alola-Atlas aus echten Gen-7-Feldszenen', () => {
  assert.match(data.source, /Alola-Atlas.*Ultra-Sonne-ROM/);
  assert.match(data.mapSource, /a\/0\/8\/2.*a\/0\/8\/6/);
  assert.deepEqual([data.width, data.height], [512, 512]);
  assert.equal(data.locations.length, 63);
  assert.equal(new Set(data.locations.map(location => location.slug)).size, 63);
  for (const name of ['Lili’i', 'Hauholi City', 'Kantai City', 'Malihe City', 'Dorf des Seevolkes', 'Æther-Paradies']) {
    assert.ok(data.locations.some(location => location.de === name), `${name} fehlt`);
  }
  assert.deepEqual([...new Set(data.locations.map(location => location.region))].sort(), ['akala', 'melemele', 'poni', 'ulaula']);
});

test('Sonne und Mond besitzen getrennte Alola-Funddaten', () => {
  const wildPlaces = data.locations.filter(location => location.wild.sun.grass.length || location.wild.sun.surf.length);
  const differing = data.locations.filter(location => JSON.stringify(location.wild.sun) !== JSON.stringify(location.wild.moon));
  assert.ok(wildPlaces.length >= 35);
  assert.ok(differing.length >= 8);

  const jungle = data.locations.find(location => location.slug === 'lush-jungle');
  assert.ok(jungle.wild.sun.grass.some(mon => mon.id === 766)); // Quartermak
  assert.ok(!jungle.wild.sun.grass.some(mon => mon.id === 765));
  assert.ok(jungle.wild.moon.grass.some(mon => mon.id === 765)); // Kommandutan
  assert.ok(!jungle.wild.moon.grass.some(mon => mon.id === 766));

  for (const location of data.locations) {
    const [x1, y1, x2, y2] = location.area;
    assert.ok(x1 >= 0 && y1 >= 0 && x2 <= data.width && y2 <= data.height, location.de);
    assert.ok(x1 < x2 && y1 < y2, location.de);
    for (const version of ['sun', 'moon']) for (const method of ['grass', 'surf']) for (const mon of location.wild[version][method]) {
      assert.ok(mon.id >= 1 && mon.id <= 802, `${location.de}: #${mon.id}`);
      assert.ok(mon.p > 0 && mon.p <= 100, `${location.de}: ${mon.p}%`);
      assert.ok(mon.min > 0 && mon.max >= mon.min, location.de);
    }
  }
});

test('Sonne/Mond-Tilemanifest verweist auf den lokalen 3DS-Szenenatlas', () => {
  assert.equal(tiles.version, 3);
  assert.equal(tiles.nativeZoom, 2);
  assert.deepEqual([tiles.width, tiles.height], [data.width, data.height]);
  assert.deepEqual(tiles.levels.map(level => level.z), [0, 2]);
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    const file = path.join(ROOT, 'Karte', 'tiles-alola-sm', String(level.z), `${sheet}.webp`);
    assert.ok(fs.statSync(file).size > 50_000, file);
  }
  const source = fs.readFileSync(path.join(ROOT, 'Karte', 'tiles-alola-sm', 'SOURCE.txt'), 'utf8');
  assert.match(source, /Ultra-Sonne-ROM/);
  assert.match(source, /USUMStudio/);
  assert.match(source, /a\/0\/8\/2/);
  assert.match(source, /USUM-\s*exklusive Gebiete wurden bewusst ausgeschlossen/);
});
