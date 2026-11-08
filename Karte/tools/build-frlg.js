#!/usr/bin/env node
/*
 * Combines the FireRed/LeafGreen outdoor-map layout extracted by render-frlg.js
 * with version-specific wild encounters from PokeAPI.
 *
 * Usage:
 *   node build-frlg.js <render.json> [output.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const RENDER = path.resolve(process.argv[2] || path.join(process.env.TEMP || '.', 'pokemonhub-frlg-render', 'render.json'));
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..', 'frlg.json'));
const API = 'https://pokeapi.co/api/v2/';
const WORLD_WIDTH = 768;
const WORLD_HEIGHT = 640;

const render = JSON.parse(fs.readFileSync(RENDER, 'utf8'));
const renderedMaps = new Map(render.maps.map(map => [map.name, map]));

const defs = [];
function add(map, de, en, type, location, showLabel = type === 'city' || type === 'town') {
  defs.push({ maps: Array.isArray(map) ? map : [map], de, en, type, location, showLabel });
}
function route(n) {
  const map = n === 21 ? ['Route21_North', 'Route21_South'] : `Route${n}`;
  const location = n >= 19 && n <= 21 ? `kanto-sea-route-${n}` : `kanto-route-${n}`;
  add(map, `Route ${n}`, `Route ${n}`, 'route', location, false);
}

add('PalletTown', 'Alabastia', 'Pallet Town', 'town', 'pallet-town');
add('ViridianCity', 'Vertania City', 'Viridian City', 'city', 'viridian-city');
add('PewterCity', 'Marmoria City', 'Pewter City', 'city', 'pewter-city');
add('CeruleanCity', 'Azuria City', 'Cerulean City', 'city', 'cerulean-city');
add('LavenderTown', 'Lavandia', 'Lavender Town', 'town', 'lavender-town');
add('VermilionCity', 'Orania City', 'Vermilion City', 'city', 'vermilion-city');
add('CeladonCity', 'Prismania City', 'Celadon City', 'city', 'celadon-city');
add('FuchsiaCity', 'Fuchsania City', 'Fuchsia City', 'city', 'fuchsia-city');
add('CinnabarIsland', 'Zinnoberinsel', 'Cinnabar Island', 'town', 'cinnabar-island');
add('SaffronCity_Connection', 'Saffronia City', 'Saffron City', 'city', 'saffron-city');
add('IndigoPlateau_Exterior', 'Pokémon Liga', 'Indigo Plateau', 'place', 'indigo-plateau', true);
for (let n = 1; n <= 25; n++) route(n);

add('OneIsland', 'Eiland 1', 'One Island', 'town', 'one-island', true);
add('OneIsland_KindleRoad', 'Glühweg', 'Kindle Road', 'place', 'kindle-road');
add('OneIsland_TreasureBeach', 'Schatzgestade', 'Treasure Beach', 'place', 'treasure-beach');
add('TwoIsland', 'Eiland 2', 'Two Island', 'town', 'two-island', true);
add('TwoIsland_CapeBrink', 'Kap Kante', 'Cape Brink', 'place', 'cape-brink');
add('ThreeIsland', 'Eiland 3', 'Three Island', 'town', 'three-island', true);
add('ThreeIsland_Port', 'Tri-Eiland-Hafen', 'Three Isle Port', 'place', 'three-island');
add('ThreeIsland_BondBridge', 'Bondbrücke', 'Bond Bridge', 'place', 'bond-bridge');
add('FourIsland', 'Eiland 4', 'Four Island', 'town', 'four-island', true);
add('FiveIsland', 'Eiland 5', 'Five Island', 'town', 'five-island', true);
add('FiveIsland_ResortGorgeous', 'Ferienparadies', 'Resort Gorgeous', 'place', 'resort-gorgeous');
add('FiveIsland_WaterLabyrinth', 'Wasserirrgarten', 'Water Labyrinth', 'place', 'water-labyrinth');
add('FiveIsland_Meadow', 'Fünf-Eiland-Weide', 'Five Isle Meadow', 'place', 'five-isle-meadow');
add('FiveIsland_MemorialPillar', 'Gedenksäule', 'Memorial Pillar', 'place', 'memorial-pillar');
add('SixIsland', 'Eiland 6', 'Six Island', 'town', 'six-island', true);
add('SixIsland_OutcastIsland', 'Fern-Eiland', 'Outcast Island', 'place', 'outcast-island');
add('SixIsland_GreenPath', 'Grüner Pfad', 'Green Path', 'place', 'green-path');
add('SixIsland_WaterPath', 'Wasserweg', 'Water Path', 'place', 'water-path');
add('SixIsland_RuinValley', 'Ruinental', 'Ruin Valley', 'place', 'ruin-valley');
add('SevenIsland', 'Eiland 7', 'Seven Island', 'town', 'seven-island', true);
add('SevenIsland_TrainerTower', 'Trainerturm', 'Trainer Tower', 'place', 'trainer-tower');
add('SevenIsland_SevaultCanyon_Entrance', 'Schluchteingang', 'Canyon Entrance', 'place', 'sevault-canyon');
add('SevenIsland_SevaultCanyon', '7-Schatzschlucht', 'Sevault Canyon', 'place', 'sevault-canyon');
add('SevenIsland_TanobyRuins', 'Tanibo-Ruinen', 'Tanoby Ruins', 'place', 'tanoby-ruins');

const cache = new Map();
const slugify = value => value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
async function getJson(url) {
  if (!cache.has(url)) cache.set(url, fetch(url).then(async response => {
    if (!response.ok) {
      console.warn(`PokeAPI ${url}: ${response.status}`);
      return null;
    }
    return response.json();
  }).catch(error => {
    console.warn(`PokeAPI ${url}: ${error.message}`);
    return null;
  }));
  return cache.get(url);
}

async function getAreas(locationSlug) {
  if (!locationSlug) return [];
  const location = await getJson(`${API}location/${locationSlug}`);
  if (!location) return [];
  return (await Promise.all((location.areas || []).map(area => getJson(area.url)))).filter(Boolean);
}

function mergeWild(target, additions) {
  const byId = new Map(target.map(mon => [mon.id, mon]));
  for (const mon of additions) {
    const old = byId.get(mon.id);
    if (!old) byId.set(mon.id, { ...mon });
    else {
      old.min = Math.min(old.min, mon.min);
      old.max = Math.max(old.max, mon.max);
      old.p = Math.min(100, old.p + mon.p);
    }
  }
  return [...byId.values()].sort((a, b) => b.p - a.p || a.id - b.id);
}

function wildFromArea(area, version) {
  const result = { grass: [], surf: [] };
  for (const encounter of area.pokemon_encounters || []) {
    const id = +(encounter.pokemon.url.match(/\/(\d+)\/?$/) || [])[1];
    const versionRow = (encounter.version_details || []).find(row => row.version.name === version);
    if (!id || id > 386 || !versionRow) continue;
    for (const [kind, method] of [['grass', 'walk'], ['surf', 'surf']]) {
      const rows = (versionRow.encounter_details || []).filter(row => row.method.name === method);
      if (!rows.length) continue;
      result[kind] = mergeWild(result[kind], [{
        id,
        min: Math.min(...rows.map(row => row.min_level)),
        max: Math.max(...rows.map(row => row.max_level)),
        p: Math.min(100, rows.reduce((sum, row) => sum + row.chance, 0)),
      }]);
    }
  }
  return result;
}

function boundsFor(def) {
  const maps = def.maps.map(name => {
    const map = renderedMaps.get(name);
    if (!map) throw new Error(`Rendered map missing: ${name}`);
    return map;
  });
  return [
    Math.min(...maps.map(map => map.x)),
    Math.min(...maps.map(map => map.z)),
    Math.max(...maps.map(map => map.x + map.width)),
    Math.max(...maps.map(map => map.z + map.height)),
  ];
}

async function buildLocation(def) {
  const area = boundsFor(def);
  const areas = await getAreas(def.location);
  const wild = {};
  for (const version of ['firered', 'leafgreen']) {
    wild[version] = { grass: [], surf: [] };
    for (const source of areas) {
      const part = wildFromArea(source, version);
      wild[version].grass = mergeWild(wild[version].grass, part.grass);
      wild[version].surf = mergeWild(wild[version].surf, part.surf);
    }
  }
  return {
    key: def.en.toUpperCase().replace(/[^A-Z0-9]+/g, '_'),
    slug: slugify(def.en),
    de: def.de,
    en: def.en,
    type: def.type,
    region: /^(One|Two|Three|Four|Five|Six|Seven)Island/.test(def.maps[0]) ? 'sevii' : 'kanto',
    area,
    label: [(area[0] + area[2]) / 2, (area[1] + area[3]) / 2],
    showLabel: def.showLabel,
    items: [],
    trainers: [],
    wild,
  };
}

(async () => {
  const locations = new Array(defs.length);
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < defs.length) {
      const index = next++;
      locations[index] = await buildLocation(defs[index]);
    }
  }));

  const result = {
    version: 1,
    source: 'PokeAPI + user-provided German Pokémon FireRed ROM (BPRD)',
    mapSource: 'GBA MapHeader, MapLayout, Tileset, metatile and palette data',
    mapAuthor: 'GAME FREAK / Nintendo',
    width: WORLD_WIDTH,
    height: WORLD_HEIGHT,
    origin: [0, 0],
    locations,
  };
  fs.writeFileSync(OUT, JSON.stringify(result));
  const wildPlaces = locations.filter(location => location.wild.firered.grass.length || location.wild.firered.surf.length).length;
  const differences = locations.filter(location => JSON.stringify(location.wild.firered) !== JSON.stringify(location.wild.leafgreen)).length;
  console.log(`${OUT}: ${locations.length} Orte, ${wildPlaces} mit Wilddaten, ${differences} editionsverschieden`);
})().catch(error => {
  console.error(error);
  process.exit(1);
});
