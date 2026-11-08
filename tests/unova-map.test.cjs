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

assert.match(data.source, /PokeAPI/);
assert.match(data.source, /White ROM/);
assert.match(data.source, /Mewmaps/);
assert.match(data.mapAuthor, /GAME FREAK/);
assert.equal(data.locations.length, 58);
assert.deepEqual([data.width, data.height], [832, 736]);

for (const name of ['Avenitia', 'Stratos City', 'Rayono City', 'Twindrake City', 'Pokémon Liga', 'Route 1', 'Route 18', 'Riesengrotte']) {
  assert.ok(data.locations.some(l => l.de === name), `${name} fehlt`);
}
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
assert.deepEqual([tileIndex.width, tileIndex.height], [832, 736]);
assert.ok(fs.existsSync(path.join(tileRoot, 'SOURCE.txt')));
for (const [version, manifest] of Object.entries(tiles)) {
  assert.equal(manifest.nativeZoom, version === 'white' ? 4 : 2);
  assert.deepEqual([manifest.width, manifest.height], [832, 736]);
  for (const level of manifest.levels) for (const sheet of level.sheets) {
    const file = path.join(tileRoot, version, String(level.z), sheet + '.webp');
    assert.ok(fs.existsSync(file), `${version}/${level.z}/${sheet}.webp fehlt`);
    assert.ok(fs.statSync(file).size > 10_000, `${version}/${level.z}/${sheet}.webp ist verdächtig klein`);
  }
}

const sheets = Object.values(tiles).reduce((total, manifest) => total + manifest.levels.reduce((n, l) => n + l.sheets.length, 0), 0);
assert.equal(tiles.white.levels.find(level => level.z === 4).sheets.length, 35);
const overviewHash = version => crypto.createHash('sha256').update(fs.readFileSync(path.join(tileRoot, version, '0', '0_0.webp'))).digest('hex');
assert.notEqual(overviewHash('black'), overviewHash('white'), 'Schwarz und Weiß verwenden dieselbe Übersicht');
console.log(`Einall-Karte: ${data.locations.length} Orte, ${wildPlaces.length} mit Wilddaten, ${sheets} echte Kartenblätter für beide Editionen`);
