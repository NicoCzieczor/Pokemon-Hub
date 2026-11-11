const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/kalos-xy.json');
const tiles = require('../Karte/tiles-kalos-xy/index.json');
const L = en => data.locations.find(l => l.en === en);

test('X/Y enthält die aus der 3DS-ROM gerenderte Kalos-Spielwelt', () => {
  assert.match(data.source, /Pokemon X and Pokemon Y ROMs/);
  assert.match(data.mapSource, /a\/0\/4\/1/);
  assert.match(data.mapSource, /a\/0\/2\/4/);
  assert.deepEqual([data.width, data.height], [tiles.width, tiles.height]);
  assert.ok(data.locations.length >= 70, `nur ${data.locations.length} Orte`);
  assert.equal(new Set(data.locations.map(location => location.slug)).size, data.locations.length);
  assert.equal(data.locations.filter(location => location.type === 'route').length, 22);
  for (const name of ['Escissia', 'Illumina City', 'Nouvaria City', 'Relievera City', 'Yantara City', 'Romantia City', 'Fluxia City', 'Fractalia City', 'Batika City', 'Pokémon Liga', 'Azurbucht']) {
    assert.ok(data.locations.some(location => location.de === name), `${name} fehlt`);
  }
});

test('Kalos liegt wie auf der Regionskarte um Illumina City', () => {
  const c = l => [(l.area[0] + l.area[2]) / 2, (l.area[1] + l.area[3]) / 2];
  const lum = c(L('Lumiose City'));
  // Escissia im Süden, Relievera im Westen, Romantia im Norden, Fluxia im Osten
  assert.ok(c(L('Vaniville Town'))[1] > lum[1] + 200);
  assert.ok(c(L('Cyllage City'))[0] < lum[0] - 400);
  assert.ok(c(L('Laverre City'))[1] < lum[1] - 200);
  assert.ok(c(L('Anistar City'))[0] > lum[0] + 500);
  // Städte und Routen haben Flächen (Rechtecke), Höhlen und Tore Eingänge; Städte tragen ihren Namen
  for (const l of data.locations) {
    assert.ok((l.rects && l.rects.length) || (l.entrances && l.entrances.length), `${l.de}: weder Fläche noch Eingang`);
    for (const r of l.rects || []) assert.ok(r[0] >= 0 && r[1] >= 0 && r[2] <= data.width && r[3] <= data.height && r[0] < r[2] && r[1] < r[3], l.de);
  }
  assert.ok(data.locations.filter(l => l.type === 'city' || l.type === 'town').every(l => l.showLabel), 'Städte ohne Namen');
  assert.ok(L('Lumiose City').rects.length > 20, 'Illumina City als ganze Stadt');
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
  assert.deepEqual(tiles.levels.map(level => level.z), [4, 2, 0]);
  assert.ok(tiles.sea > 0 && fs.existsSync(path.join(ROOT, 'Karte', 'tiles-kalos-xy', 'sea.png')), 'Meermuster');
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    const file = path.join(ROOT, 'Karte', 'tiles-kalos-xy', String(level.z), `${sheet}.webp`);
    assert.ok(fs.statSync(file).size > 1_000, file);
  }
  const source = fs.readFileSync(path.join(ROOT, 'Karte', 'tiles-kalos-xy', 'SOURCE.txt'), 'utf8');
  assert.match(source, /Title ID 0004000000055D00/);
  for (const garc of ['a/0/4/1', 'a/0/4/2', 'a/0/2/4', 'a/0/1/3']) assert.match(source, new RegExp(garc.replace(/\//g, '\\/')));
  assert.match(source, /Universal Pokemon Randomizer ZX/);
});
