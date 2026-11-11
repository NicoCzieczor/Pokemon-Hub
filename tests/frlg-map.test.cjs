// FR/BG-Karte: Daten im Format der Platin-Karte (app.js) – Orte als Rechtecke, Marker, Innenkarten, Kartenblätter
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'Karte', 'frlg.json'), 'utf8'));
const tiles = JSON.parse(fs.readFileSync(path.join(root, 'Karte', 'tiles-frlg', 'index.json'), 'utf8'));
const interiors = JSON.parse(fs.readFileSync(path.join(root, 'Karte', 'tiles-frlg', 'interiors.json'), 'utf8'));
const L = en => data.locations.find(l => l.en === en);

assert.equal(data.version, 3);
assert.match(data.source, /pret\/pokefirered/);
assert.deepEqual([data.width, data.height], [tiles.width, tiles.height]);
assert.ok(data.locations.length >= 90, `nur ${data.locations.length} Orte`);
// Ereignis-Inseln (Nabelfelsen, Geburtsinsel) und Kabelclub-Räume gibt es ohne Sonderticket nicht
assert.ok(!data.locations.some(l => /navel|birth|colosseum|trade center/i.test(l.en)));

// Städte, Routen, Inseln und Höhlen mit deutschen Namen aus der ROM (normal geschrieben)
for (const name of ['Alabastia', 'Saffronia City', 'Zinnoberinsel', 'Route 1', 'Route 25', 'Mondberg', 'Felstunnel',
  'Seeschauminseln', 'Siegesstraße', 'Digdas Höhle', 'Vertania-Wald', 'Glühweg', 'Tanibo-Ruinen', 'Eiland Eins', 'Rocket HQ']) {
  assert.ok(data.locations.some(l => l.de === name), `${name} fehlt`);
}
assert.equal(data.locations.filter(l => l.type === 'route').length, 25);
assert.equal(L('Celadon City').region, 'kanto');
assert.equal(L('One Island').region, 'sevii');
// Oberwelt: jeder Ort mit Außenkarte hat Rechtecke innerhalb der Welt, Route 21 besteht aus zwei Karten
for (const l of data.locations) {
  assert.equal(l.chunks, (l.rects || []).length, l.de);
  for (const [x0, z0, x1, z1] of l.rects || []) assert.ok(x0 >= 0 && z0 >= 0 && x1 <= data.width && z1 <= data.height && x0 < x1 && z0 < z1, l.de);
}
assert.equal(L('Route 21').rects.length, 2);

// Marmoria City: Arenaleiter Rocko (Kleinstein, Onix) und TM39 Felsgrab in der Arena
const pewter = L('Pewter City');
const brock = pewter.trainers.find(t => /Brock/.test(t.en));
assert.ok(brock && brock.de === 'Leiter Rocko' && brock.party.map(p => p.id).join() === '74,95' && brock.map === 'PEWTER_CITY_GYM');
assert.ok(pewter.items.some(i => i.tm && i.en === 'TM39' && i.move.de === 'Felsgrab' && i.move.type === 'rock' && i.area === 'Arena'));
// Route 4: versteckte Items aus den bg_events
assert.deepEqual(L('Route 4').items.filter(i => i.kind === 'hidden').map(i => i.en).sort(), ['Great Ball', 'Persim Berry', 'Razz Berry']);

// Mondberg: drei Etagen als Innenkarten, zwei Eingänge auf Route 4, Fossilien als Geschenk
const mi = data.locations.indexOf(L('Mt. Moon'));
const moon = data.locations[mi];
assert.equal(moon.entrances.length, 2);
assert.deepEqual(moon.wild.firered.map(w => w.area), ['1F', 'B1F', 'B2F']);
const moonMaps = Object.entries(data.maps).filter(([, m]) => m.l === mi).map(([k]) => k).sort();
assert.deepEqual(moonMaps, ['MT_MOON_1F', 'MT_MOON_B1F', 'MT_MOON_B2F']);
assert.ok(moonMaps.every(k => interiors.images[`${data.maps[k].matrix}__${data.maps[k].areaData}`]), 'jede Etage hat ein Bild im Atlas');
assert.ok(['Dome Fossil', 'Helix Fossil'].every(f => moon.items.some(i => i.en === f)));
// Vertania-Wald liegt hinter den Torhäusern von Route 2: Eingänge an deren Türen, direkt in die Innenkarte
const vf = data.locations.indexOf(L('Viridian Forest'));
assert.equal(data.locations[vf].entrances.length, 2);
assert.ok(data.markers.filter(m => m.k === 'entrance' && m.l === vf).every(m => m.to === 'VIRIDIAN_FOREST'));

// Wilde Pokémon je Edition: Route 24 hat in Feuerrot Myrapla (Oddish), in Blattgrün Knofensa (Bellsprout)
const r24 = L('Route 24');
assert.ok(r24.wild.firered[0].grass.some(m => m.id === 43) && !r24.wild.firered[0].grass.some(m => m.id === 69));
assert.ok(r24.wild.leafgreen[0].grass.some(m => m.id === 69) && !r24.wild.leafgreen[0].grass.some(m => m.id === 43));
const r12 = L('Route 12').wild.firered[0];
assert.ok(r12.grass && r12.surf && r12.oldRod && r12.goodRod && r12.superRod);
assert.equal(r12.oldRod.reduce((s, m) => s + m.p, 0), 100);
assert.ok(L('Rock Tunnel').wild.firered.some(w => w.rockSmash));

// Besondere Pokémon: Relaxo, Mewtu, Lapras, Spielhallen-Preise je Edition
assert.ok(L('Route 12').special.some(s => s.id === 143 && s.lv === 30 && s.kind === 'static'));
assert.ok(L('Cerulean Cave').special.some(s => s.id === 150 && s.lv === 70));
assert.ok(L('Silph Co.').special.some(s => s.id === 131 && s.kind === 'gift' && s.area === '7F'));
const prizes = L('Celadon City').special.filter(s => s.kind === 'gift');
assert.ok(prizes.some(s => s.id === 123 && s.ver === 'firered') && prizes.some(s => s.id === 127 && s.ver === 'leafgreen'), 'Sichlor nur Feuerrot, Pinsir nur Blattgrün');

// Marker verweisen auf vorhandene Einträge
for (const m of data.markers) {
  const l = data.locations[m.l];
  if (m.k === 'trainer') assert.ok(l.trainers[m.i] && !l.trainers[m.i].map);
  else if (m.k !== 'entrance') assert.ok(l.items[m.i] && !l.items[m.i].map);
}
for (const [key, m] of Object.entries(data.maps)) for (const mk of m.markers) {
  const e = mk.k === 'trainer' ? data.locations[m.l].trainers[mk.i] : data.locations[m.l].items[mk.i];
  assert.equal(e.map, key, `${key}: Marker ${mk.k} ${mk.i}`);
}
const counts = data.locations.reduce((a, l) => ({ items: a.items + l.items.length, trainers: a.trainers + l.trainers.length }), { items: 0, trainers: 0 });
assert.ok(counts.items >= 380, `nur ${counts.items} Items`);
assert.ok(counts.trainers >= 450, `nur ${counts.trainers} Trainer`);

// Kartenblätter (volle Auflösung verlustfrei) und Atlanten der Innenkarten
assert.equal(tiles.nativeZoom, 4);
assert.equal(tiles.shear, 0);
for (const level of tiles.levels) for (const sheet of level.sheets) {
  assert.ok(fs.existsSync(path.join(root, 'Karte', 'tiles-frlg', String(level.z), sheet + '.webp')), `${level.z}/${sheet}.webp fehlt`);
}
interiors.atlases.forEach((_, n) => assert.ok(fs.existsSync(path.join(root, 'Karte', 'tiles-frlg', 'in', n + '.webp')), `Atlas ${n} fehlt`));
for (const m of Object.values(data.maps)) assert.ok(interiors.images[`${m.matrix}__${m.areaData}`], `Bild für ${m.matrix} fehlt`);

console.log(`FR/BG-Karte: ${data.locations.length} Orte, ${counts.items} Items, ${counts.trainers} Trainer, ${Object.keys(data.maps).length} Innenkarten in ${interiors.atlases.length} Atlanten`);
