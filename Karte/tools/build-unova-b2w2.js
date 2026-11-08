#!/usr/bin/env node
/*
 * Builds the Black 2/White 2 map directory from fuddlesworth/pokebw2.
 * The visible map tiles are rendered separately from the supplied White 2 ROM
 * with render-unova.js and make-tiles.py.
 *
 * Usage:
 *   node build-unova-b2w2.js /path/to/pokebw2 [output.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(process.argv[2] || 'pokebw2');
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..', 'unova-b2w2.json'));
const BLOCK = 32;
const MIN_COL = 1;
const MIN_ROW = 1;
const WORLD_WIDTH = 26 * BLOCK;
const WORLD_HEIGHT = 24 * BLOCK;
const GRASS_WEIGHTS = [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1];
const SURF_WEIGHTS = [60, 30, 5, 4, 1];

function sourceFile(relative) {
  const local = path.join(ROOT, ...relative.split('/'));
  if (fs.existsSync(local)) return fs.readFileSync(local, 'utf8');
  return execFileSync('git', ['-C', ROOT, 'show', `HEAD:${relative}`], { encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 });
}

function sourceFiles(folder) {
  const local = path.join(ROOT, ...folder.split('/'));
  if (fs.existsSync(local)) return fs.readdirSync(local).map(name => `${folder}/${name}`);
  return execFileSync('git', ['-C', ROOT, 'ls-tree', '-r', '--name-only', 'HEAD', '--', folder], { encoding: 'utf8' })
    .trim().split(/\r?\n/).filter(Boolean);
}

function json(relative) { return JSON.parse(sourceFile(relative)); }
function slugify(value) {
  return value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

const matrix = json('res/field/matrices/overworld.json');
const species = new Map();
let speciesId = -1;
for (const line of sourceFile('generated/species.txt').split(/\r?\n/)) {
  const match = /^(SPECIES_[A-Z0-9_]+)(?:\s*=\s*(\d+))?$/.exec(line.trim());
  if (!match) continue;
  speciesId = match[2] == null ? speciesId + 1 : Number(match[2]);
  if (speciesId <= 649) species.set(match[1], speciesId);
}
if (species.size !== 650 || species.get('SPECIES_GENESECT') !== 649) throw new Error(`Unexpected species constants: ${species.size}`);

const encounterPaths = sourceFiles('res/field/encounters').filter(file => !file.endsWith('encounters.schema.json'));
const definitions = [];
function add(de, en, type, zone, encounter = null, anchor = null, showLabel = type === 'city' || type === 'town', offset = [0, 0]) {
  definitions.push({ de, en, type, zone, encounter, anchor, showLabel, offset });
}
function route(number) { add(`Route ${number}`, `Route ${number}`, 'route', `ZONE_ROUTE_${number}`, `route_${number}`, null, false); }

for (let number = 1; number <= 9; number++) route(number);
for (let number = 11; number <= 23; number++) route(number);

add('Avenitia', 'Nuvema Town', 'town', 'ZONE_NUVEMA_TOWN');
add('Gavina', 'Accumula Town', 'town', 'ZONE_ACCUMULA_TOWN');
add('Orion City', 'Striaton City', 'city', 'ZONE_STRIATON_CITY', 'striaton_city');
add('Septerna City', 'Nacrene City', 'city', 'ZONE_NACRENE_CITY');
add('Stratos City', 'Castelia City', 'city', 'ZONE_CASTELIA_CITY', 'castelia_city', 'ZONE_ROUTE_4');
add('Rayono City', 'Nimbasa City', 'city', 'ZONE_NIMBASA_CITY');
add('Marea City', 'Driftveil City', 'city', 'ZONE_DRIFTVEIL_CITY');
add('Panaero City', 'Mistralton City', 'city', 'ZONE_MISTRALTON_CITY');
add('Nevaio City', 'Icirrus City', 'city', 'ZONE_ICIRRUS_CITY', 'icirrus_city');
add('Twindrake City', 'Opelucid City', 'city', 'ZONE_OPELUCID_CITY');
add('Tessera', 'Lacunosa Town', 'town', 'ZONE_LACUNOSA_TOWN');
add('Ondula', 'Undella Town', 'town', 'ZONE_UNDELLA_TOWN', 'undella_town');
add('Eventura City', 'Aspertia City', 'city', 'ZONE_ASPERTIA_CITY', 'aspertia_city');
add('Dausing', 'Floccesy Town', 'town', 'ZONE_FLOCCESY_TOWN');
add('Vapydro City', 'Virbank City', 'city', 'ZONE_VIRBANK_CITY', 'virbank_city');
add('Monsentiero', 'Lentimas Town', 'town', 'ZONE_LENTIMAS_TOWN');
add('Abidaya City', 'Humilau City', 'city', 'ZONE_HUMILAU_CITY', 'humilau_city');
add('Pokémon-Liga', 'Pokémon League', 'place', 'ZONE_POKEMON_LEAGUE', null, 'ZONE_ROUTE_23', true, [0, -12]);

add('Traumbrache', 'Dreamyard', 'place', 'ZONE_DREAMYARD', 'dreamyard', 'ZONE_STRIATON_CITY');
add('Grundwassersenke', 'Wellspring Cave', 'place', 'ZONE_WELLSPRING_CAVE', 'wellspring_cave', 'ZONE_ROUTE_3');
add('Ewigenwald', 'Pinwheel Forest', 'place', 'ZONE_PINWHEEL_FOREST', 'pinwheel_forest');
add('Wüstenresort', 'Desert Resort', 'place', 'ZONE_DESERT_RESORT', 'desert_resort');
add('Alter Palast', 'Relic Castle', 'place', 'ZONE_RELIC_CASTLE', 'relic_castle', 'ZONE_DESERT_RESORT');
add('Pokémon World Tournament', 'Pokémon World Tournament', 'place', 'ZONE_PWT', null, null, true);
add('Elektrolithhöhle', 'Chargestone Cave', 'place', 'ZONE_CHARGESTONE_CAVE', 'chargestone_cave');
add('Wendelberg', 'Twist Mountain', 'place', 'ZONE_TWIST_MOUNTAIN', 'twist_mountain');
add('Drachenstiege', 'Dragonspiral Tower', 'place', 'ZONE_DRAGONSPIRAL_TOWER', 'dragonspiral_tower');
add('Siegesstraße', 'Victory Road', 'place', 'ZONE_VICTORY_ROAD', 'victory_road', 'ZONE_ROUTE_23');
add('Schloss von N', "N's Castle", 'place', 'ZONE_NS_CASTLE', null, 'ZONE_ROUTE_23');
add('Panaero-Höhle', 'Mistralton Cave', 'place', 'ZONE_MISTRALTON_CAVE', 'mistralton_cave', 'ZONE_ROUTE_6');
add('Turm des Himmels', 'Celestial Tower', 'place', 'ZONE_CELESTIAL_TOWER', 'celestial_tower', 'ZONE_ROUTE_7');
add('Moor von Nevaio', 'Moor of Icirrus', 'place', 'ZONE_MOOR_OF_ICIRRUS', 'moor_of_icirrus', 'ZONE_ICIRRUS_CITY');
add('Einkaufszentrum 9', 'Shopping Mall Nine', 'place', 'ZONE_SHOPPING_MALL', null, 'ZONE_ROUTE_9');
add('Riesengrotte', 'Giant Chasm', 'place', 'ZONE_GIANT_CHASM', 'giant_chasm');
add('Bucht von Ondula', 'Undella Bay', 'place', 'ZONE_UNDELLA_BAY', 'undella_bay');
add('Labor P2', 'P2 Laboratory', 'place', 'ZONE_P2_LABORATORY', 'p2_laboratory');
add('Freiheitsgarten', 'Liberty Garden', 'place', 'ZONE_LIBERTY_GARDEN', null, null, true);
add('Hain der Täuschung', 'Lostlorn Forest', 'place', 'ZONE_LOSTLORN_FOREST', 'lostlorn_forest', 'ZONE_ROUTE_16');
add('Schrein der Ernte', 'Abundant Shrine', 'place', 'ZONE_ABUNDANT_SHRINE', 'abundant_shrine', 'ZONE_ROUTE_14');
add('Dausing-Hof', 'Floccesy Ranch', 'place', 'ZONE_FLOCCESY_RANCH', 'floccesy_ranch');
add('Vapydro-Werke', 'Virbank Complex', 'place', 'ZONE_VIRBANK_COMPLEX', 'virbank_complex');
add('Pokéwood', 'Pokéstar Studios', 'place', 'ZONE_POKESTAR_STUDIOS', null, 'ZONE_VIRBANK_CITY', true, [0, -18]);
add('Einklangspassage', 'Join Avenue', 'place', 'ZONE_JOIN_AVENUE', null, 'ZONE_ROUTE_4');
add('Kanalisation von Stratos', 'Castelia Sewers', 'place', 'ZONE_CASTELIA_SEWERS', 'castelia_sewers', 'ZONE_ROUTE_4');
add('Umkehrberg', 'Reversal Mountain', 'place', 'ZONE_REVERSAL_MOUNTAIN', 'reversal_mountain');
add('Bizarres Haus', 'Strange House', 'place', 'ZONE_STRANGE_HOUSE', 'strange_house', 'ZONE_REVERSAL_MOUNTAIN');
add('Plasma-Fregatte', 'Plasma Frigate', 'place', 'ZONE_PLASMA_FRIGATE', null, 'ZONE_ROUTE_21');
add('Alter Fluchtweg', 'Relic Passage', 'place', 'ZONE_RELIC_PASSAGE', 'relic_passage', 'ZONE_PWT');
add('Janusberg', 'Clay Tunnel', 'place', 'ZONE_CLAY_TUNNEL', 'clay_tunnel', 'ZONE_DRIFTVEIL_CITY');
add('Schwarzer Turm / Weiße Baumhöhle', 'Black Tower / White Treehollow', 'place', 'ZONE_BLACK_CITY', null, 'ZONE_ROUTE_15', true, [16, 10]);
add('Strandhöhle', 'Seaside Cave', 'place', 'ZONE_SEASIDE_CAVE', 'seaside_cave', 'ZONE_ROUTE_21');
add('Höhle des Seins', 'Cave of Being', 'place', 'ZONE_CAVE_OF_BEING', null, 'ZONE_ROUTE_20');
add('Unterseetunnel', 'Marine Tube', 'place', 'ZONE_MARINE_TUBE', null, 'ZONE_HUMILAU_CITY');
add('Naturschutzgebiet', 'Nature Preserve', 'place', 'ZONE_NATURE_PRESERVE', 'nature_preserve', 'ZONE_HUMILAU_CITY');
add('Untergrundruinen', 'Underground Ruins', 'place', 'ZONE_UNDERGROUND_RUINS', 'underground_ruins', 'ZONE_DRIFTVEIL_CITY');
add('Kammer der Weisung', 'Guidance Chamber', 'place', 'ZONE_GUIDANCE_CHAMBER', 'guidance_chamber', 'ZONE_ROUTE_6');
add('Unterwasserruine', 'Abyssal Ruins', 'place', 'ZONE_ABYSSAL_RUINS', null, 'ZONE_UNDELLA_BAY');
add('Dorfbrücke', 'Village Bridge', 'place', 'ZONE_VILLAGE_BRIDGE', 'village_bridge', 'ZONE_ROUTE_11');
add('Marea-Zugbrücke', 'Driftveil Drawbridge', 'place', 'ZONE_DRIFTVEIL_DRAWBRIDGE', 'driftveil_drawbridge', 'ZONE_ROUTE_5');
add('Wunderbrücke', 'Marvelous Bridge', 'place', 'ZONE_MARVELOUS_BRIDGE', 'marvelous_bridge', 'ZONE_ROUTE_16');

function zoneArea(zone) {
  if (!zone) return null;
  const cells = [];
  for (let row = 0; row < matrix.zones.length; row++) {
    for (let col = 0; col < matrix.zones[row].length; col++) if (matrix.zones[row][col] === zone) cells.push([row, col]);
  }
  if (!cells.length) return null;
  return [
    (Math.min(...cells.map(cell => cell[1])) - MIN_COL) * BLOCK,
    (Math.min(...cells.map(cell => cell[0])) - MIN_ROW) * BLOCK,
    (Math.max(...cells.map(cell => cell[1])) - MIN_COL + 1) * BLOCK,
    (Math.max(...cells.map(cell => cell[0])) - MIN_ROW + 1) * BLOCK,
  ];
}

function insetArea(area, offset) {
  const cx = (area[0] + area[2]) / 2 + offset[0], cy = (area[1] + area[3]) / 2 + offset[1];
  return [Math.max(0, cx - 12), Math.max(0, cy - 12), Math.min(WORLD_WIDTH, cx + 12), Math.min(WORLD_HEIGHT, cy + 12)];
}

function selectVersion(value, version) {
  return value && !Array.isArray(value) && value[version] ? value[version] : value || [];
}

function aggregate(slots, weights) {
  const result = new Map();
  (slots || []).forEach((slot, index) => {
    const id = species.get(slot[0]);
    if (!id) return;
    const chance = weights[index] || 0;
    const old = result.get(id) || { id, p: 0, min: slot[1], max: slot[2] };
    old.p += chance;
    old.min = Math.min(old.min, slot[1]);
    old.max = Math.max(old.max, slot[2]);
    result.set(id, old);
  });
  return [...result.values()].sort((a, b) => b.p - a.p || a.id - b.id);
}

function merge(groups) {
  const result = new Map();
  for (const group of groups) for (const mon of group) {
    const old = result.get(mon.id);
    if (!old) result.set(mon.id, { ...mon });
    else { old.p = Math.max(old.p, mon.p); old.min = Math.min(old.min, mon.min); old.max = Math.max(old.max, mon.max); }
  }
  return [...result.values()].sort((a, b) => b.p - a.p || a.id - b.id);
}

function encounterFiles(base) {
  const pattern = new RegExp(`/${base}(?:_\\d+)?\\.json$`);
  return encounterPaths.filter(file => pattern.test(file));
}

function wildFor(base, version) {
  if (!base) return { grass: [], surf: [] };
  const grass = [], surf = [];
  for (const file of encounterFiles(base)) {
    const table = json(file);
    const season = table.all_year || table.spring;
    if (!season) continue;
    grass.push(aggregate(selectVersion(season.grass, version), GRASS_WEIGHTS));
    surf.push(aggregate(selectVersion(season.surf, version), SURF_WEIGHTS));
  }
  return { grass: merge(grass), surf: merge(surf) };
}

const locations = definitions.map(definition => {
  const own = zoneArea(definition.zone);
  const anchor = own || zoneArea(definition.anchor);
  if (!anchor) throw new Error(`No world position for ${definition.en} (${definition.zone} / ${definition.anchor})`);
  const area = own ? anchor : insetArea(anchor, definition.offset);
  return {
    key: definition.en.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
    slug: slugify(definition.en),
    de: definition.de,
    en: definition.en,
    type: definition.type,
    region: 'unova',
    area,
    label: [Math.round(((area[0] + area[2]) / 2 + definition.offset[0]) * 10) / 10, Math.round(((area[1] + area[3]) / 2 + definition.offset[1]) * 10) / 10],
    showLabel: definition.showLabel,
    items: [],
    trainers: [],
    wild: {
      'black-2': wildFor(definition.encounter, 'black2'),
      'white-2': wildFor(definition.encounter, 'white2'),
    },
  };
});

const commit = execFileSync('git', ['-C', ROOT, 'rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim();
const result = {
  version: 1,
  source: `fuddlesworth/pokebw2@${commit} + user-provided German Pokemon White 2 ROM (IRDD)`,
  mapSource: 'White 2 ROM archives a/0/0/8, a/0/0/9 and a/0/1/4; Black 2/White 2 encounter tables from pokebw2',
  mapAuthor: 'GAME FREAK / Nintendo',
  width: WORLD_WIDTH,
  height: WORLD_HEIGHT,
  origin: [32, 32],
  locations,
};
fs.writeFileSync(OUT, JSON.stringify(result), 'utf8');

const wildPlaces = locations.filter(location => Object.values(location.wild).some(wild => wild.grass.length || wild.surf.length)).length;
const differences = locations.filter(location => JSON.stringify(location.wild['black-2']) !== JSON.stringify(location.wild['white-2'])).length;
console.log(`${OUT}: ${locations.length} Orte, ${wildPlaces} mit Wilddaten, ${differences} editionsverschieden`);
