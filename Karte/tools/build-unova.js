#!/usr/bin/env node
/*
 * Builds the Black/White Unova location data from a fixed map layout and PokeAPI encounters.
 * Usage: node build-unova.js [output.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const OUT = path.resolve(process.argv[2] || path.join(__dirname, '..', 'unova.json'));
const API = 'https://pokeapi.co/api/v2/location-area/';
const WORLD_WIDTH = 26 * 32;
const WORLD_HEIGHT = 23 * 32;

// Die Ortsdefinitionen stammen noch aus dem beschrifteten Mewmaps-Komposit. Zwei weit
// auseinanderliegende, eindeutig erkennbare Anker bringen sie in Matrix 0 der ROM:
// Pokémon-Liga (735, 120) -> (464, 16), Avenitia (1080, 755) -> (752, 688).
const SCALE_X = 288 / 345;
const OFFSET_X = 464 - SCALE_X * 735;
const SCALE_Z = 672 / 635;
const OFFSET_Z = 16 - SCALE_Z * 120;
const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const romPoint = ([x, z]) => [
  clamp(Math.round((SCALE_X * x + OFFSET_X) * 10) / 10, 0, WORLD_WIDTH),
  clamp(Math.round((SCALE_Z * z + OFFSET_Z) * 10) / 10, 0, WORLD_HEIGHT),
];

const defs = [];
function add(de, en, type, x, z, aliases = [], showLabel = type === 'city' || type === 'town', label = null) {
  defs.push({ de, en, type, pos: [x, z], aliases, showLabel, label });
}
function route(n, x, z) { add(`Route ${n}`, `Route ${n}`, 'route', x, z, [`unova-route-${n}-area`], false); }

// Main story, clockwise from Nuvema Town. Coordinates use the 4:1 Mewmaps overview grid.
add('Avenitia', 'Nuvema Town', 'town', 1080, 755, ['nuvema-town-area'], true, [1090, 775]);
route(1, 1045, 700);
add('Gavina', 'Accumula Town', 'town', 1060, 650, ['accumula-town-area'], true, [1090, 650]);
route(2, 995, 620);
add('Orion City', 'Striaton City', 'city', 1025, 560, ['striaton-city-area'], true, [1035, 535]);
add('Traumbrache', 'Dreamyard', 'place', 1095, 565, ['dreamyard-area', 'dreamyard-b1f']);
route(3, 950, 555);
add('Septerna City', 'Nacrene City', 'city', 895, 570, [], true, [885, 595]);
add('Grundwassersenke', 'Wellspring Cave', 'place', 875, 555, ['wellspring-cave-area']);
add('Ewigenwald', 'Pinwheel Forest', 'place', 865, 635, ['pinwheel-forest-outside', 'pinwheel-forest-inside', 'pinwheel-forest-rumination-field']);
add('Stratos City', 'Castelia City', 'city', 620, 710, ['castelia-city-area', 'castelia-city-game-freak-hq-1f'], true, [630, 680]);
route(4, 595, 600);
add('Wüstenresort', 'Desert Resort', 'place', 465, 545, ['desert-resort-area', 'desert-resort-entrance']);
add('Alter Palast', 'Relic Castle', 'place', 505, 565, ['relic-castle-a', 'relic-castle-b', 'relic-castle-c', 'relic-castle-d']);
add('Rayono City', 'Nimbasa City', 'city', 620, 540, [], true, [620, 520]);
route(5, 480, 510);
add('Marea-Zugbrücke', 'Driftveil Drawbridge', 'place', 420, 490, ['driftveil-drawbridge-area']);
add('Marea City', 'Driftveil City', 'city', 350, 540, ['driftveil-city-area'], true, [350, 520]);
add('Tiefkühlcontainer', 'Cold Storage', 'place', 265, 545, ['cold-storage-area']);
route(6, 190, 465);
add('Panaero-Höhle', 'Mistralton Cave', 'place', 260, 415, ['mistralton-cave-area']);
add('Kammer der Weisung', 'Guidance Chamber', 'place', 275, 425, ['guidance-chamber-area']);
add('Elektrolithhöhle', 'Chargestone Cave', 'place', 220, 385, ['chargestone-cave-1f', 'chargestone-cave-b1f', 'chargestone-cave-b2f']);
add('Panaero City', 'Mistralton City', 'city', 210, 355, [], true, [210, 335]);
route(7, 225, 308);
add('Turm des Himmels', 'Celestial Tower', 'place', 165, 245, ['celestial-tower-2f', 'celestial-tower-3f', 'celestial-tower-4f', 'celestial-tower-5f']);
add('Wendelberg', 'Twist Mountain', 'place', 265, 235, ['twist-mountain-b1f-3f', 'twist-mountain-b4f']);
add('Nevaio City', 'Icirrus City', 'city', 320, 340, ['icirrus-city-area'], true, [320, 320]);
add('Drachenstiege', 'Dragonspiral Tower', 'place', 355, 225, ['dragonspiral-tower-entrance', 'dragonspiral-tower-outside', 'dragonspiral-tower-1f', 'dragonspiral-tower-2f', 'dragonspiral-tower-7f']);
add('Moor von Nevaio', 'Moor of Icirrus', 'place', 410, 220, ['moor-of-icirrus-area']);
route(8, 390, 265);
route(9, 505, 265);
add('Höhle der Schulung', "Challenger's Cave", 'place', 510, 315, ['challengers-cave-1f', 'challengers-cave-b1f', 'challengers-cave-b2f']);
add('Twindrake City', 'Opelucid City', 'city', 550, 270, [], true, [515, 235]);
route(10, 620, 210);
add('Siegesstraße', 'Victory Road', 'place', 735, 155, [
  'unova-victory-road-outside', 'unova-victory-road-7f', 'unova-victory-road-unknown-area-53',
  'unova-victory-road-unknown-area-54', 'unova-victory-road-unknown-area-55', 'unova-victory-road-4f-middle-room'
]);
add('Pokémon Liga', 'Pokémon League', 'place', 735, 120, [], true, [735, 100]);

// Eastern postgame loop.
route(11, 640, 305);
add('Dorfbrücke', 'Village Bridge', 'place', 750, 300, ['village-bridge-area']);
route(12, 835, 300);
add('Tessera', 'Lacunosa Town', 'town', 875, 255, [], true, [875, 230]);
add('Riesengrotte', 'Giant Chasm', 'place', 945, 230, ['giant-chasm-outside', 'giant-chasm-area', 'giant-chasm-forest', 'giant-chasm-forest-cave']);
route(13, 890, 345);
add('Ondula', 'Undella Town', 'town', 1050, 445, ['undella-town-area'], true, [1050, 465]);
add('Bucht von Ondula', 'Undella Bay', 'place', 1080, 400, ['undella-bay-area']);
route(14, 1005, 470);
add('Schrein der Ernte', 'Abundant Shrine', 'place', 845, 400, ['abundant-shrine-area']);
add('Weißer Wald / Schwarze Stadt', 'White Forest / Black City', 'place', 900, 510, [], true, [910, 535]);
route(15, 835, 525);
add('Wunderbrücke', 'Marvelous Bridge', 'place', 750, 505, ['marvelous-bridge-area']);
route(16, 620, 490);
add('Hain der Täuschung', 'Lostlorn Forest', 'place', 670, 460, ['lostlorn-forest-area']);

// Offshore and special areas.
route(17, 955, 760);
route(18, 850, 755);
add('P2-Labor', 'P2 Laboratory', 'place', 820, 735, ['p2-laboratory-area']);
add('Freiheitsgarten', 'Liberty Garden', 'place', 315, 730, ['liberty-garden-lighthouse-basement'], true);
add('Schloss von N', "N's Castle", 'place', 710, 135, ['ns-castle-throne-room'], true);
add('Kammer der Prüfung', 'Trial Chamber', 'place', 275, 410, ['trial-chamber-area']);

const slugify = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const cache = new Map();
async function getArea(slug) {
  if (!cache.has(slug)) cache.set(slug, fetch(API + slug).then(async r => {
    if (!r.ok) { console.warn(`PokeAPI ${slug}: ${r.status}`); return null; }
    return r.json();
  }).catch(err => { console.warn(`PokeAPI ${slug}: ${err.message}`); return null; }));
  return cache.get(slug);
}

function accepted(detail) {
  const conditions = (detail.condition_values || []).map(x => x.name);
  return !conditions.some(x => /^season-/.test(x) && x !== 'season-spring');
}
function mergeWild(target, list) {
  const byId = new Map(target.map(x => [x.id, x]));
  for (const mon of list) {
    const old = byId.get(mon.id);
    if (!old) byId.set(mon.id, { ...mon });
    else { old.min = Math.min(old.min, mon.min); old.max = Math.max(old.max, mon.max); old.p = Math.max(old.p, mon.p); }
  }
  return [...byId.values()].sort((a, b) => b.p - a.p || a.id - b.id);
}
function wildFromArea(area, version) {
  const out = { grass: [], surf: [] };
  if (!area) return out;
  for (const encounter of area.pokemon_encounters || []) {
    let id = +(encounter.pokemon.url.match(/\/(\d+)\/?$/) || [])[1];
    // PokeAPI models the blue-striped Basculin as a separate variety ID; the map UI uses National-Dex IDs.
    if (id === 10016) id = 550;
    const detail = (encounter.version_details || []).find(x => x.version.name === version);
    if (!id || !detail) continue;
    for (const kind of ['grass', 'surf']) {
      const method = kind === 'grass' ? 'walk' : 'surf';
      const rows = (detail.encounter_details || []).filter(x => x.method.name === method && accepted(x));
      if (!rows.length) continue;
      const row = { id, min: Math.min(...rows.map(x => x.min_level)), max: Math.max(...rows.map(x => x.max_level)), p: Math.min(100, rows.reduce((n, x) => n + x.chance, 0)) };
      out[kind] = mergeWild(out[kind], [row]);
    }
  }
  return out;
}

async function buildLocation(def) {
  const areas = (await Promise.all(def.aliases.map(getArea))).filter(Boolean);
  const wild = {};
  for (const version of ['black', 'white']) {
    wild[version] = { grass: [], surf: [] };
    for (const area of areas) {
      const part = wildFromArea(area, version);
      wild[version].grass = mergeWild(wild[version].grass, part.grass);
      wild[version].surf = mergeWild(wild[version].surf, part.surf);
    }
  }
  const [x, z] = romPoint(def.pos);
  const rx = (def.type === 'route' ? 28 : def.type === 'place' ? 22 : 31) * SCALE_X;
  const rz = (def.type === 'route' ? 17 : def.type === 'place' ? 20 : 25) * SCALE_Z;
  return {
    key: def.en.toUpperCase().replace(/[^A-Z0-9]+/g, '_'), slug: slugify(def.en), de: def.de, en: def.en,
    type: def.type,
    region: 'unova',
    area: [clamp(x - rx, 0, WORLD_WIDTH), clamp(z - rz, 0, WORLD_HEIGHT), clamp(x + rx, 0, WORLD_WIDTH), clamp(z + rz, 0, WORLD_HEIGHT)],
    label: romPoint(def.label || def.pos),
    showLabel: def.showLabel,
    items: [], trainers: [], wild
  };
}

(async () => {
  // A small worker pool avoids hammering PokeAPI while keeping generation quick.
  const locations = new Array(defs.length);
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < defs.length) { const i = next++; locations[i] = await buildLocation(defs[i]); }
  }));
  const result = {
    version: 2,
    source: 'PokeAPI + user-provided Pokémon White ROM (IRAD) + Mewmaps Black fallback',
    mapSource: 'ROM archives a/0/0/8, a/0/0/9 and a/0/1/4',
    mapAuthor: 'GAME FREAK / Nintendo; Black fallback by Mewmaps',
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    origin: [32, 64],
    locations
  };
  fs.writeFileSync(OUT, JSON.stringify(result));
  const wildPlaces = locations.filter(l => l.wild.black.grass.length || l.wild.black.surf.length).length;
  const differences = locations.filter(l => JSON.stringify(l.wild.black) !== JSON.stringify(l.wild.white)).length;
  console.log(`${OUT}: ${locations.length} Orte, ${wildPlaces} mit Wilddaten, ${differences} editionsverschieden`);
})().catch(err => { console.error(err); process.exit(1); });
