// HG/SS-Karte: Daten im Format der Platin-Karte (app.js) – Orte, Blockraster, Marker, Innenkarten, Kartenblätter
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'Karte', 'hgss.json'), 'utf8'));
const tiles = JSON.parse(fs.readFileSync(path.join(root, 'Karte', 'tiles-hgss', 'index.json'), 'utf8'));
const interiors = JSON.parse(fs.readFileSync(path.join(root, 'Karte', 'tiles-hgss', 'interiors.json'), 'utf8'));
const L = en => data.locations.find(l => l.en === en);

assert.match(data.source, /pret\/pokeheartgold/);
assert.equal(data.chunk, 32);
assert.ok(data.locations.length >= 100, `nur ${data.locations.length} Orte`);
assert.ok(!data.locations.some(l => /mystery/i.test(l.en)));
assert.equal(data.chunks.length * 32, data.height);
assert.equal(data.chunks[0].length * 32, data.width);

// Städte, Routen und Höhlen mit deutschen Namen aus der ROM (Pokémon-Namen nicht großgeschrieben)
for (const name of ['Neuborkia', 'Dukatia City', 'Silberberg', 'Alabastia', 'Saffronia City', 'Route 29', 'Route 1',
  'Einheitstunnel', 'Steineichenwald', 'Glockenturm', 'Flegmon-Brunnen', 'Digdas Höhle', 'Strudelinseln']) {
  assert.ok(data.locations.some(l => l.de === name), `${name} fehlt`);
}
assert.equal(L('Goldenrod City').region, 'johto');
assert.equal(L('Celadon City').region, 'kanto');
// Blockraster: jede Stadt/Route liegt in so vielen Blöcken, wie sie Felder hat
data.locations.forEach((l, li) => assert.equal(data.chunks.flat().filter(v => v === li).length, l.chunks, l.de));

// Route 30: Item-Bälle, verstecktes Item (Index-Feld der Tabelle, nicht die Position), Trainer mit Team
const route30 = L('Route 30');
assert.deepEqual(route30.items.filter(i => i.kind === 'hidden').map(i => i.en), ['Potion']);
const joey = route30.trainers.find(t => /Joey/.test(t.en));
assert.ok(joey && joey.de === 'Teenager Julian' && joey.party[0].id === 19 && joey.pos.length === 3, 'Teenager Julian (Joey) mit Rattfratz und Stelle');
// Gebäude am Ort: Innenkarte mit Markern und Ausgang zurück auf die Oberwelt
const giftHouse = route30.items.find(i => i.kind === 'gift' && i.en === 'Exp. Share');
assert.ok(giftHouse.map && data.maps[giftHouse.map], 'EP-Teiler in der Innenkarte von Mr. Pokémons Haus');
assert.ok(data.maps[giftHouse.map].exits.some(e => e.ow), 'Ausgang auf die Oberwelt');
// Tageszeiten, Angeln, Kopfnuss – je Edition
const w30 = route30.wild.heartgold[0];
assert.ok(w30.morning.length && w30.day.length && w30.night.length && w30.oldRod && w30.headbutt);
assert.ok(w30.night.some(m => m.id === 163) && !w30.day.some(m => m.id === 163), 'Hoothoot nur nachts');
assert.ok(data.locations.some(l => JSON.stringify(l.wild.heartgold) !== JSON.stringify(l.wild.soulsilver)), 'Editionsdaten unterscheiden sich nicht');

// Höhlen: Etagen als Innenkarten, Eingänge auf der Oberwelt, feste Begegnungen
const ui = data.locations.indexOf(L('Union Cave'));
const union = data.locations[ui];
assert.ok(union.entrances.length >= 3 && !union.chunks);
assert.deepEqual(union.wild.soulsilver.map(w => w.area), ['1F', 'B1F', 'B2F']);
assert.ok(union.special.some(s => s.id === 131 && s.lv === 20), 'Lapras auf B2F');
const unionMaps = Object.values(data.maps).filter(m => m.l === ui);
assert.equal(unionMaps.length, 3);
assert.ok(unionMaps.every(m => interiors.images[`${m.matrix}__${m.areaData}`]), 'jede Etage hat ein Bild im Atlas');
assert.ok(data.markers.filter(m => m.k === 'entrance' && m.l === ui).every(m => m.to), 'Eingänge führen in die Innenkarte');
// Ho-Oh: HeartGold Lv. 45, SoulSilver Lv. 70
assert.deepEqual(L('Bell Tower').special.filter(s => s.id === 250).map(s => [s.ver, s.lv]), [['heartgold', 45], ['soulsilver', 70]]);
// Schwärme an den 20 Karten der Spieltabelle
assert.equal(data.locations.reduce((n, l) => n + l.wild.heartgold.filter(w => w.swarm).length, 0), 20);
// TMs mit Attacke und Typ, Arenaleiter mit Team
const goldenrod = L('Goldenrod City');
assert.ok(goldenrod.items.some(i => i.tm && i.en === 'TM45' && i.move.de === 'Anziehung' && i.move.type === 'normal' && i.area === 'Arena'));
assert.ok(goldenrod.trainers.some(t => t.en === 'Leader Whitney' && t.party.map(p => p.id).join() === '35,241'));

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
assert.ok(counts.items >= 550, `nur ${counts.items} Items`);
assert.ok(counts.trainers >= 450, `nur ${counts.trainers} Trainer`);

// Kartenblätter, Meer, Bodenhöhen, Atlanten der Innenkarten
assert.ok(tiles.sea > 0 && fs.existsSync(path.join(root, 'Karte', 'tiles-hgss', 'sea.png')));
assert.ok(Object.keys(tiles.ground).length > 150);
for (const level of tiles.levels) for (const sheet of level.sheets) {
  assert.ok(fs.existsSync(path.join(root, 'Karte', 'tiles-hgss', String(level.z), sheet + '.webp')), `${level.z}/${sheet}.webp fehlt`);
}
interiors.atlases.forEach((_, n) => assert.ok(fs.existsSync(path.join(root, 'Karte', 'tiles-hgss', 'in', n + '.webp')), `Atlas ${n} fehlt`));

console.log(`HG/SS-Karte: ${data.locations.length} Orte, ${counts.items} Items, ${counts.trainers} Trainer, ${Object.keys(data.maps).length} Innenkarten in ${interiors.atlases.length} Atlanten`);
