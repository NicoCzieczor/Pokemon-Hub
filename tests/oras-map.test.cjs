// Hoenn-Karte (Omega Rubin / Alpha Saphir): Kartenblätter, Orte mit Stelle auf der Karte, Editions-Verstecke
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const data = require('../Karte/oras.json');
const tiles = require('../Karte/tiles-oras/index.json');
const places = require('../Karte/tiles-oras/places.json');
const id = de => data.locations.find(l => l.de === de).id;

test('ORAS: alle Kartenblätter des Manifests sind vorhanden', () => {
  assert.deepEqual(tiles.levels.map(level => level.z), [4, 2, 0]);
  for (const level of tiles.levels) for (const sheet of level.sheets) {
    assert.ok(fs.statSync(path.join(ROOT, 'Karte', 'tiles-oras', String(level.z), `${sheet}.webp`)).size > 500, `${level.z}/${sheet}`);
  }
  assert.ok(tiles.sea > 0 && fs.existsSync(path.join(ROOT, 'Karte', 'tiles-oras', 'sea.png')));
});

test('ORAS: feste Orte haben eine Stelle auf der Karte', () => {
  // Städte und Routen als Fläche; Höhlen und Orte hinter Türen, Seilbahn oder Tauchstellen über einen Eingang
  for (const de of ['Xeneroville', 'Schlotberg', 'Safari-Zone', 'Tiefseehöhle', 'Urzeithöhle', 'Küstenhöhle', 'Siegelkammer']) {
    assert.ok((places.entrances[id(de)] || []).length > 0, `${de} ohne Eingang`);
  }
  assert.ok(places.labels[id('Xeneroville')], 'Xeneroville ohne Namen auf der Karte');
  for (const l of data.locations.filter(l => l.type === 'city' || l.type === 'town' || l.type === 'route')) {
    assert.ok(places.areas[l.id] || places.entrances[l.id], `${l.de}: weder Fläche noch Eingang`);
  }
  for (const list of Object.values(places.entrances)) for (const e of list) {
    assert.ok(e[0] >= 0 && e[0] <= places.width && e[1] >= 0 && e[1] <= places.height, JSON.stringify(e));
  }
});

test('ORAS: die Team-Verstecke teilen sich einen Eingang und sind je Edition getrennt', () => {
  const aqua = places.entrances[id('Team Aquas Versteck')], magma = places.entrances[id('Team Magmas Versteck')];
  assert.deepEqual(aqua, magma);
  const source = fs.readFileSync(path.join(ROOT, 'Karte', 'hoenn.js'), 'utf8');
  assert.match(source, new RegExp(`${id('Team Aquas Versteck')}: 'as'`));
  assert.match(source, new RegExp(`${id('Team Magmas Versteck')}: 'or'`));
});
