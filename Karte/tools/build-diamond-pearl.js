#!/usr/bin/env node
/*
 * Baut die klickbaren Orte fuer die Diamant/Perl-Karte aus der echten DP-
 * Weltmatrix. Editionsspezifische Begegnungen kommen aus PokeAPI; Geometrie,
 * Grenzen und Positionen bleiben an die Originalmatrix gebunden.
 *
 * Aufruf:
 *   node build-diamond-pearl.js <pokediamond> <render.json> [ausgabe.json]
 */
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(process.argv[2] || '');
const RENDER_FILE = path.resolve(process.argv[3] || '');
const OUT = path.resolve(process.argv[4] || path.join(__dirname, '..', 'diamond-pearl.json'));
if (!fs.existsSync(path.join(ROOT, 'arm9', 'src', 'map_header.c')) || !fs.existsSync(RENDER_FILE)) {
  console.error('Aufruf: node build-diamond-pearl.js <pokediamond> <render.json> [ausgabe.json]');
  process.exit(1);
}

const readText = (...parts) => fs.readFileSync(path.join(...parts), 'utf8');
const slugify = value => String(value).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const norm = value => slugify(value).replace(/-/g, '').replace('pokemon', 'pokemon');

function splitFields(body) {
  const out = [];
  let start = 0, depth = 0;
  for (let i = 0; i < body.length; i++) {
    if (body[i] === '(') depth++;
    else if (body[i] === ')') depth--;
    else if (body[i] === ',' && depth === 0) { out.push(body.slice(start, i).trim()); start = i + 1; }
  }
  out.push(body.slice(start).trim());
  return out;
}

function title(value) {
  return value.replace(/^MAPSEC_/, '').toLowerCase().split('_').map(word => {
    if (word === 'pokemon') return 'Pokemon';
    return word ? word[0].toUpperCase() + word.slice(1) : word;
  }).join(' ');
}

const headers = new Map();
const headerSource = readText(ROOT, 'arm9', 'src', 'map_header.c');
let nextHeader = 0;
for (const match of headerSource.matchAll(/^\s*\{([^\n]+)\},\s*\/\/\s*(MAP_\w+)/gm)) {
  const fields = splitFields(match[1]);
  headers.set(nextHeader, { id: nextHeader, name: match[2], mapsec: fields[10], type: +fields[13] });
  nextHeader++;
}

const matrixFile = path.join(ROOT, 'files', 'fielddata', 'mapmatrix', 'map_matrix', 'narc_0000.bin');
const matrix = fs.readFileSync(matrixFile);
const width = matrix[0], height = matrix[1], hasHeaders = matrix[2], nameLength = matrix[4];
if (!hasHeaders) throw new Error('Die DP-Weltmatrix enthaelt keine Kartenkoepfe.');
let matrixAt = 5 + nameLength;
const groups = new Map();
for (let z = 0; z < height; z++) for (let x = 0; x < width; x++) {
  const id = matrix.readUInt16LE(matrixAt + (z * width + x) * 2);
  const header = headers.get(id);
  if (!header || id <= 1 || header.mapsec === 'MAPSEC_MYSTERY_ZONE') continue;
  if (!groups.has(header.mapsec)) groups.set(header.mapsec, { mapsec: header.mapsec, headers: new Set(), cells: [] });
  const group = groups.get(header.mapsec);
  group.headers.add(id);
  group.cells.push({ x, z });
}

const render = JSON.parse(fs.readFileSync(RENDER_FILE, 'utf8'));
const origin = render.origin || [0, 0];
const platinum = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'platin.json'), 'utf8'));
const translations = new Map();
for (const location of platinum.locations || []) {
  if (location.label) translations.set(norm(location.en), location);
}

function translated(group) {
  const en = title(group.mapsec);
  const hit = translations.get(norm(en));
  if (hit) return { de: hit.de, en: hit.en, type: hit.type, label: hit.label };
  const route = /Route (\d+)/.exec(en);
  const type = route ? 'route' : / City$/.test(en) ? 'city' : / Town$/.test(en) ? 'town' : 'place';
  return { de: en, en, type, label: null };
}

function pokeApiSlug(name) {
  const route = /^Route (\d+)$/.exec(name);
  if (route) return ['220', '223', '226', '230'].includes(route[1]) ? `sinnoh-sea-route-${route[1]}` : `sinnoh-route-${route[1]}`;
  const special = {
    'Pokemon League': 'pokemon-league-sinnoh',
    'Flower Paradise': 'flower-paradise',
    'Seabreak Path': 'seabreak-path',
    'Fuego Ironworks': 'fuego-ironworks',
  };
  return special[name] || slugify(name);
}

const apiCache = new Map();
async function getJson(url) {
  if (!apiCache.has(url)) apiCache.set(url, fetch(url).then(async response => {
    if (!response.ok) return null;
    return response.json();
  }).catch(() => null));
  return apiCache.get(url);
}

async function encounterAreas(name) {
  const location = await getJson(`https://pokeapi.co/api/v2/location/${pokeApiSlug(name)}`);
  if (!location) return [];
  return (await Promise.all((location.areas || []).map(area => getJson(area.url)))).filter(Boolean);
}

function merge(target, additions) {
  const byId = new Map(target.map(mon => [mon.id, mon]));
  for (const mon of additions) {
    const old = byId.get(mon.id);
    if (!old) byId.set(mon.id, { ...mon });
    else {
      old.min = Math.min(old.min, mon.min);
      old.max = Math.max(old.max, mon.max);
      old.p = Math.max(old.p, mon.p);
    }
  }
  return [...byId.values()].sort((a, b) => b.p - a.p || a.id - b.id);
}

function wildFromArea(area, version) {
  const out = { grass: [], surf: [] };
  for (const encounter of area.pokemon_encounters || []) {
    const id = +(encounter.pokemon.url.match(/\/(\d+)\/?$/) || [])[1];
    const detail = (encounter.version_details || []).find(row => row.version.name === version);
    if (!id || id > 493 || !detail) continue;
    for (const [kind, method] of [['grass', 'walk'], ['surf', 'surf']]) {
      const rows = (detail.encounter_details || []).filter(row => row.method.name === method);
      if (!rows.length) continue;
      out[kind] = merge(out[kind], [{
        id,
        min: Math.min(...rows.map(row => row.min_level)),
        max: Math.max(...rows.map(row => row.max_level)),
        p: Math.min(100, rows.reduce((sum, row) => sum + row.chance, 0)),
      }]);
    }
  }
  return out;
}

async function buildLocation(group) {
  const names = translated(group);
  const minX = Math.min(...group.cells.map(cell => cell.x)) * 32 - origin[0];
  const minZ = Math.min(...group.cells.map(cell => cell.z)) * 32 - origin[1];
  const maxX = (Math.max(...group.cells.map(cell => cell.x)) + 1) * 32 - origin[0];
  const maxZ = (Math.max(...group.cells.map(cell => cell.z)) + 1) * 32 - origin[1];
  const fallbackLabel = [
    group.cells.reduce((sum, cell) => sum + cell.x * 32 + 16 - origin[0], 0) / group.cells.length,
    group.cells.reduce((sum, cell) => sum + cell.z * 32 + 16 - origin[1], 0) / group.cells.length,
  ];
  const oldLabel = names.label && [names.label[0] - origin[0], names.label[1] - origin[1]];
  const label = oldLabel && oldLabel[0] >= minX && oldLabel[0] <= maxX && oldLabel[1] >= minZ && oldLabel[1] <= maxZ ? oldLabel : fallbackLabel;
  const areas = await encounterAreas(names.en);
  const wild = {};
  for (const version of ['diamond', 'pearl']) {
    wild[version] = { grass: [], surf: [] };
    for (const area of areas) {
      const part = wildFromArea(area, version);
      wild[version].grass = merge(wild[version].grass, part.grass);
      wild[version].surf = merge(wild[version].surf, part.surf);
    }
  }
  return {
    key: group.mapsec,
    slug: slugify(names.en),
    de: names.de,
    en: names.en,
    type: names.type,
    region: 'sinnoh',
    area: [minX, minZ, maxX, maxZ],
    label: label.map(value => Math.round(value * 10) / 10),
    showLabel: names.type === 'city' || names.type === 'town',
    items: [],
    trainers: [],
    wild,
  };
}

(async () => {
  const source = [...groups.values()];
  const locations = new Array(source.length);
  let next = 0;
  await Promise.all(Array.from({ length: 6 }, async () => {
    while (next < source.length) {
      const index = next++;
      locations[index] = await buildLocation(source[index]);
    }
  }));
  locations.sort((a, b) => (a.type === 'route' ? 1 : -1) - (b.type === 'route' ? 1 : -1) || a.en.localeCompare(b.en, 'en', { numeric: true }));
  const result = {
    version: 1,
    source: 'pret/pokediamond b623abef1b4d + PokeAPI',
    mapSource: 'Originale DP-Landmodelle, Gebaeudemodelle, Texturbanken und Weltmatrix',
    mapAuthor: 'GAME FREAK / Nintendo',
    width: render.cols * 32,
    height: render.rows * 32,
    origin,
    locations,
  };
  fs.writeFileSync(OUT, JSON.stringify(result));
  const wildPlaces = locations.filter(location => location.wild.diamond.grass.length || location.wild.diamond.surf.length).length;
  const differences = locations.filter(location => JSON.stringify(location.wild.diamond) !== JSON.stringify(location.wild.pearl)).length;
  console.log(`${OUT}: ${locations.length} Orte, ${wildPlaces} mit Wilddaten, ${differences} editionsverschieden`);
})().catch(error => { console.error(error); process.exit(1); });
