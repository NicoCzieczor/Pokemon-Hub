// Smaragd-Karte: Daten im Format der Platin-Karte (app.js) wie FR/BG – Orte als Rechtecke, Marker, Innenkarten,
// Kartenblätter. Gebaut mit Karte/tools/render-emerald.js + build-emerald.js aus der deutschen ROM und pret/pokeemerald.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const data = JSON.parse(fs.readFileSync(path.join(root, 'Karte', 'emerald.json'), 'utf8'));
const tiles = JSON.parse(fs.readFileSync(path.join(root, 'Karte', 'tiles-emerald', 'index.json'), 'utf8'));
const interiors = JSON.parse(fs.readFileSync(path.join(root, 'Karte', 'tiles-emerald', 'interiors.json'), 'utf8'));
const L = en => data.locations.find(l => l.en === en);
const inside = (r, o) => r[0] >= o[0] && r[1] >= o[1] && r[2] <= o[2] && r[3] <= o[3];

assert.equal(data.version, 3);
assert.equal(data.game, 'emerald');
assert.match(data.source, /pret\/pokeemerald/);
assert.deepEqual([data.width, data.height], [tiles.width, tiles.height]);
assert.ok(data.locations.length >= 80, `nur ${data.locations.length} Orte`);
// Ereignis-Inseln (nur mit Sonderticket), Geheimbasen und der Möbelwagen vom Spielbeginn sind keine Orte
assert.ok(!data.locations.some(l => /southern island|faraway|birth island|navel rock|secret base|truck/i.test(l.en)));
assert.ok(!data.locations.some(l => l.items.some(i => /Ticket|Old Sea Map/.test(i.en))), 'keine Ereignis-Tickets');

// Städte, Routen, Höhlen und Sonderorte mit deutschen Namen aus der ROM (normal geschrieben)
for (const name of ['Wurzelheim', 'Blütenburg City', 'Malvenfroh City', 'Xeneroville', 'Prachtpolis City', 'Flossbrunn', 'Route 101',
  'Route 134', 'Kampfzone', 'Safari-Zone', 'Granithöhle', 'Meteorfälle', 'Himmelturm', 'Siegesstraße', 'MS Tide', 'Schiffswrack']) {
  assert.ok(data.locations.some(l => l.de === name), `${name} fehlt`);
}
assert.equal(data.locations.filter(l => l.type === 'route').length, 34);
assert.equal(data.locations.filter(l => l.type === 'city' || l.type === 'town').length, 16);
assert.ok(data.locations.every(l => l.region === 'hoenn'));
// Oberwelt: jeder Ort mit Außenkarte hat Rechtecke innerhalb der Welt; Safari-Zone (6 Karten) und Kampfzone (2)
for (const l of data.locations) {
  assert.equal(l.chunks, (l.rects || []).length, l.de);
  for (const [x0, z0, x1, z1] of l.rects || []) assert.ok(x0 >= 0 && z0 >= 0 && x1 <= data.width && z1 <= data.height && x0 < x1 && z0 < z1, l.de);
}
assert.equal(L('Safari Zone').rects.length, 6);
assert.equal(L('Battle Frontier').rects.length, 2);

// Xeneroville: Ort ist der Krater auf Route 126, die Stadt selbst eine Innenkarte, in die der Eingang im Krater führt
const si = data.locations.indexOf(L('Sootopolis City'));
assert.equal(data.locations[si].type, 'city');
assert.ok(inside(data.locations[si].rects[0], L('Route 126').rects[0]), 'Krater liegt auf Route 126');
assert.equal(data.maps.SOOTOPOLIS_CITY.l, si);
assert.ok(data.markers.some(m => m.k === 'entrance' && m.l === si && m.to === 'SOOTOPOLIS_CITY'));
// Höhlen hinter Xeneroville bzw. unter Wasser: über den Ort davor erreichbar
assert.equal(data.locations[L('Cave of Origin').via ?? -1]?.en, 'Sootopolis City');
assert.equal(data.locations[L('Seafloor Cavern').via ?? -1]?.en, 'Route 128');

// Metarost City: Arenaleiterin Felizia (Kleinstein, Kleinstein, Nasgnet) und TM39 Felsgrab in der Arena
const rustboro = L('Rustboro City');
const roxanne = rustboro.trainers.find(t => /Roxanne/.test(t.en));
assert.ok(roxanne && roxanne.de === 'Leiter Felizia' && roxanne.party.map(p => p.id).join() === '74,74,299' && roxanne.map === 'RUSTBORO_CITY_GYM');
assert.ok(rustboro.items.some(i => i.tm && i.en === 'TM39' && i.move.de === 'Felsgrab' && i.move.type === 'rock' && i.area === 'Arena'));
// Route 103: Rivale Brix bzw. Maike mit je drei Teams (je nach Starter)
const rivals = L('Route 103').trainers.filter(t => t.cls === 'RIVAL');
assert.deepEqual(rivals.map(t => t.party[0].id).sort().join(), '252,252,255,255,258,258');
assert.ok(rivals.some(t => t.de === 'Pokémon-Trainer Brix') && rivals.some(t => t.de === 'Pokémon-Trainer Maike'));
// Granithöhle: drei Etagen und Troys Raum als Innenkarten
const gi = data.locations.indexOf(L('Granite Cave'));
assert.deepEqual(Object.entries(data.maps).filter(([, m]) => m.l === gi).map(([k]) => k).sort(),
  ['GRANITE_CAVE_1F', 'GRANITE_CAVE_B1F', 'GRANITE_CAVE_B2F', 'GRANITE_CAVE_STEVENS_ROOM']);

// Wilde Pokémon: eine Liste (eine Edition); Unterwasser gehört zur Route darüber
const r124 = L('Route 124').wild;
assert.ok(Array.isArray(r124));
const under = r124.find(w => w.area === 'Unterwasser');
assert.ok(under && under.surf.some(m => m.id === 366) && under.surf.some(m => m.id === 369), 'Perlu und Relicanth unter Wasser');
assert.equal(data.areaEn.Unterwasser, 'Underwater');
const r119 = L('Route 119').wild[0];
assert.ok(r119.grass && r119.surf && r119.oldRod && r119.goodRod && r119.superRod);
assert.equal(r119.superRod.reduce((s, m) => s + m.p, 0), 100);
// Wandelhöhle: nur die erste der neun Tabellen gilt im Spiel (Zubat)
assert.deepEqual(L('Altering Cave').wild[0].grass.map(m => m.id), [41]);

// Besondere Pokémon: Legendäre, Regis, Kecleon, Geschenke, Ei
const special = (en, id, kind, lv) => assert.ok(L(en).special?.some(s => s.id === id && s.kind === kind && (lv == null || s.lv === lv)), `${en}: #${id} ${kind}`);
special('Sky Pillar', 384, 'static', 70);
special('Marine Cave', 382, 'static', 70);
special('Terra Cave', 383, 'static', 70);
special('Desert Ruins', 377, 'static', 40);
special('Island Cave', 378, 'static', 40);
special('Ancient Tomb', 379, 'static', 40);
special('Route 120', 352, 'static', 30);
special('Mossdeep City', 374, 'gift', 5);
special('Lavaridge Town', 360, 'egg');

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
assert.ok(counts.trainers >= 500, `nur ${counts.trainers} Trainer`);
assert.ok(data.locations.flatMap(l => l.items).every(i => i.de && i.en && !/[゠-ヿ]/.test(i.de)), 'Itemnamen ohne Sonderzeichen');

// Kartenblätter (verlustfrei) und Atlanten der Innenkarten
assert.equal(tiles.nativeZoom, 4);
assert.equal(tiles.shear, 0);
for (const level of tiles.levels) for (const sheet of level.sheets) {
  assert.ok(fs.existsSync(path.join(root, 'Karte', 'tiles-emerald', String(level.z), sheet + '.webp')), `${level.z}/${sheet}.webp fehlt`);
}
interiors.atlases.forEach((_, n) => assert.ok(fs.existsSync(path.join(root, 'Karte', 'tiles-emerald', 'in', n + '.webp')), `Atlas ${n} fehlt`));
for (const m of Object.values(data.maps)) assert.ok(interiors.images[`${m.matrix}__${m.areaData}`], `Bild für ${m.matrix} fehlt`);
assert.ok(fs.existsSync(path.join(root, 'Karte', 'tiles-emerald', 'SOURCE.txt')));

console.log(`Smaragd-Karte: ${data.locations.length} Orte, ${counts.items} Items, ${counts.trainers} Trainer, ${Object.keys(data.maps).length} Innenkarten in ${interiors.atlases.length} Atlanten`);
