const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'Karte', 'unova.json'), 'utf8'));
const tileRoot = path.join(root, 'Karte', 'tiles-unova');
const tileIndex = JSON.parse(fs.readFileSync(path.join(tileRoot, 'index.json'), 'utf8'));
const tiles = Object.fromEntries(['black', 'white'].map(version => [
  version,
  JSON.parse(fs.readFileSync(path.join(tileRoot, version, 'index.json'), 'utf8')),
]));

// Beide Editionen aus der Weiß-ROM, zusammengesetzt mit layout-unova.js (kein Mewmaps-Bild mehr)
assert.match(data.source, /PokeAPI/);
assert.match(data.source, /Weiß-ROM/);
assert.doesNotMatch(JSON.stringify([data.source, data.mapSource, data.mapAuthor]), /Mewmaps/);
assert.match(data.mapAuthor, /GAME FREAK/);
assert.ok(data.locations.length >= 60, `nur ${data.locations.length} Orte`);
assert.deepEqual(data.origin, [0, 0]);

for (const name of ['Avenitia', 'Stratos City', 'Rayono City', 'Twindrake City', 'Pokémon Liga', 'Route 1', 'Route 18', 'Riesengrotte',
  'Himmelspfeilbrücke', 'Marea-Zugbrücke', 'Zylinderbrücke', 'Dorfbrücke', 'Wunderbrücke', 'Ferrula']) {
  assert.ok(data.locations.some(l => l.de === name), `${name} fehlt`);
}
const L = de => data.locations.find(l => l.de === de);
// Früher fehlende Gebiete haben jetzt Flächen aus den ROM-Zonen: Stratos City (runde Stadt um ihren Platz – die Fläche
// ist die Scheibe in Streifen), alle Brücken, Wüstenresort und Ewigenwald innen, Schwarze Stadt / Weißer Wald
const castelia = L('Stratos City');
assert.ok(castelia.area[2] - castelia.area[0] >= 160 && castelia.area[3] - castelia.area[1] >= 140, 'Stratos City ist unvollständig');
assert.ok(castelia.rects.length >= 20, 'Stratos City: runder Umriss fehlt');
// Die Himmelspfeilbrücke führt von der Stadt zum Ewigenwald
const near = (a, b, d) => a.some(r => b.some(q => r[0] - d <= q[2] && q[0] - d <= r[2] && r[1] - d <= q[3] && q[1] - d <= r[3]));
assert.ok(near(L('Himmelspfeilbrücke').rects, castelia.rects, 2) && near(L('Himmelspfeilbrücke').rects, L('Ewigenwald').rects, 2), 'Himmelspfeilbrücke schließt nicht an');
for (const name of ['Himmelspfeilbrücke', 'Marea-Zugbrücke', 'Zylinderbrücke', 'Dorfbrücke', 'Wunderbrücke', 'Weißer Wald / Schwarze Stadt', 'Ferrula']) assert.ok(L(name).rects?.length, `${name} ohne Fläche`);
assert.ok(L('Wüstenresort').rects.length >= 2 && L('Ewigenwald').rects.length >= 3, 'Innenteile von Wüste/Ewigenwald fehlen');
// Die Marea-Zugbrücke liegt genau zwischen Marea City und Route 5 (gleiche Höhe, berührt beide)
const touch = (a, b) => a.some(r => b.some(q => r[0] <= q[2] && q[0] <= r[2] && r[1] <= q[3] && q[1] <= r[3]));
assert.ok(touch(L('Marea-Zugbrücke').rects, L('Marea City').rects) && touch(L('Marea-Zugbrücke').rects, L('Route 5').rects), 'Zugbrücke schließt nicht an');
assert.ok(touch(L('Wunderbrücke').rects, L('Route 16').rects) || L('Wunderbrücke').rects[0][0] - Math.max(...L('Route 16').rects.map(r => r[2])) < 12, 'Wunderbrücke schließt nicht an');
// Ortsnamen liegen in ihrer Fläche; Höhlen ohne Außenkarte haben Eingänge
for (const l of data.locations) {
  if (l.rects) assert.ok(l.rects.some(r => l.label[0] >= r[0] && l.label[0] <= r[2] && l.label[1] >= r[1] && l.label[1] <= r[3]), `${l.de}: Name außerhalb`);
  else assert.ok(l.entrances?.length, `${l.de}: weder Fläche noch Eingang`);
}
assert.ok(Array.isArray(data.links) && data.links.every(k => k.pts.length === 2), 'Verbindungslinien fehlen');
const wildPlaces = data.locations.filter(l => l.wild.black.grass.length || l.wild.black.surf.length);
assert.ok(wildPlaces.length >= 40, `nur ${wildPlaces.length} Orte mit Wilddaten`);
assert.ok(data.locations.some(l => JSON.stringify(l.wild.black) !== JSON.stringify(l.wild.white)), 'Schwarz/Weiß-Daten unterscheiden sich nicht');

for (const location of data.locations) {
  assert.ok(location.area[0] >= 0 && location.area[1] >= 0 && location.area[2] <= data.width && location.area[3] <= data.height, `${location.de}: Fläche außerhalb der Karte`);
  for (const version of ['black', 'white']) for (const method of ['grass', 'surf']) for (const mon of location.wild[version][method]) {
    assert.ok(mon.id >= 1 && mon.id <= 649, `${location.de}: ungültige Nationaldex-ID ${mon.id}`);
    assert.ok(mon.p > 0 && mon.p <= 100);
    assert.ok(mon.min > 0 && mon.max >= mon.min);
  }
}

assert.deepEqual(Object.keys(tileIndex.versions).sort(), ['black', 'white']);
assert.equal(tileIndex.version, 3);
assert.deepEqual([tileIndex.width, tileIndex.height], [data.width, data.height]);
assert.ok(fs.existsSync(path.join(tileRoot, 'SOURCE.txt')));
for (const [version, manifest] of Object.entries(tiles)) {
  assert.equal(manifest.nativeZoom, 4, `${version}: volle Auflösung aus der ROM`);
  assert.deepEqual([manifest.width, manifest.height], [data.width, data.height]);
  for (const level of manifest.levels) for (const sheet of level.sheets) {
    const file = path.join(tileRoot, version, String(level.z), sheet + '.webp');
    assert.ok(fs.existsSync(file), `${version}/${level.z}/${sheet}.webp fehlt`);
    assert.ok(fs.statSync(file).size > 200, `${version}/${level.z}/${sheet}.webp ist leer`);   // Randblätter mit wenig Inhalt sind klein
  }
}

const sheets = Object.values(tiles).reduce((total, manifest) => total + manifest.levels.reduce((n, l) => n + l.sheets.length, 0), 0);
assert.equal(tiles.white.levels.find(level => level.z === 4).sheets.length, tiles.black.levels.find(level => level.z === 4).sheets.length);
const overviewHash = version => crypto.createHash('sha256').update(fs.readFileSync(path.join(tileRoot, version, '0', '0_0.webp'))).digest('hex');
assert.notEqual(overviewHash('black'), overviewHash('white'), 'Schwarz und Weiß verwenden dieselbe Übersicht');
console.log(`Einall-Karte: ${data.locations.length} Orte, ${wildPlaces.length} mit Wilddaten, ${sheets} echte Kartenblätter für beide Editionen`);
