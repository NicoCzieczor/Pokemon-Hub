/*
 * Baut Karte/kalos-xy.json direkt aus den eigenen Pokemon-X/Y-ROMs und places.json von render-oras.js --xy.
 *
 * Aufruf:
 *   node build-xy.js <pokemon-x.cxi> <pokemon-y.cxi> <places.json>
 *
 * ROM-Quellen: a/0/1/2 (Zonen + Begegnungen), a/0/7/4 (englische Texte), a/0/7/7 (deutsche Texte).
 * Die X/Y-Begegnungsstruktur folgt Gen6RomHandler#getEncountersXY des Universal Pokemon Randomizer ZX.
 */
'use strict';

const fs = require('fs');
const path = require('path');
const OrasRom = require('../../Bosse/oras-rom.js');

const [xPath, yPath, placesPath] = process.argv.slice(2);
if (!xPath || !yPath || !placesPath) {
  console.error('Aufruf: node build-xy.js <pokemon-x.cxi> <pokemon-y.cxi> <places.json>');
  process.exit(1);
}

const OUT = path.join(__dirname, '..', 'kalos-xy.json');
const u16 = (b, o) => b[o] | b[o + 1] << 8;
const u32 = (b, o) => (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0;
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

const LAND_RATES = [10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 4, 1];
const SURF_RATES = [50, 30, 15, 4, 1];
const LAND_OFFSETS = [0, 48, 96, 144, 192];
const CLEAN_WILD_CRC = {
  x: new Set(['F0617248', '52071B78']),
  y: new Set(['C4BF77F6', '82D947B5'])
};
// The station is linked from a separate interior matrix which is not part of
// the outdoor atlas. Anchor its selector on the rendered Lumiose scene.
const POSITION_OVERRIDES = { 162: [790, 580] };

const CRC_TABLE = new Uint32Array(256);
for (let n = 0; n < 256; n++) {
  let c = n;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ c >>> 1 : c >>> 1;
  CRC_TABLE[n] = c >>> 0;
}
function crc32(data) {
  let c = 0xFFFFFFFF;
  for (const byte of data) c = CRC_TABLE[(c ^ byte) & 0xFF] ^ c >>> 8;
  return ((c ^ 0xFFFFFFFF) >>> 0).toString(16).padStart(8, '0').toUpperCase();
}

function slots(data, offset, count, rates) {
  const byKey = new Map();
  for (let i = 0; i < count; i++) {
    const at = offset + i * 4, raw = u16(data, at), id = raw & 0x7ff;
    if (!id) continue;
    const form = raw >> 11, key = id + ':' + form;
    let e = byKey.get(key);
    if (!e) { e = { id, form, p: 0, min: 99, max: 0 }; byKey.set(key, e); }
    e.p += rates[i];
    e.min = Math.min(e.min, data[at + 2]);
    e.max = Math.max(e.max, data[at + 3]);
  }
  return [...byKey.values()].sort((a, b) => b.p - a.p || a.id - b.id);
}

function mergeTables(tables) {
  const out = new Map();
  tables.flat().forEach(e => {
    const key = e.id + ':' + e.form, old = out.get(key);
    if (!old) out.set(key, { ...e });
    else {
      old.p = Math.max(old.p, e.p);
      old.min = Math.min(old.min, e.min);
      old.max = Math.max(old.max, e.max);
    }
  });
  return [...out.values()].sort((a, b) => b.p - a.p || a.id - b.id);
}

function encounterTable(file) {
  if (file.length < 0x18) return null;
  const start = u32(file, 0x10) + 0x10;
  if (file.length - start < 0x178) return null;
  const data = file.subarray(start, start + 0x178);
  const grass = mergeTables(LAND_OFFSETS.map(o => slots(data, o, 12, LAND_RATES)));
  const surf = slots(data, 240, 5, SURF_RATES);
  return grass.length || surf.length ? { grass, surf } : null;
}

async function readVersion(romPath, version) {
  const rom = await OrasRom.openPath(romPath);
  const wildFile = await rom.file('a/0/1/2');
  const wildCrc = crc32(wildFile);
  if (!CLEAN_WILD_CRC[version].has(wildCrc)) {
    throw new Error(`Die ${version.toUpperCase()}-ROM enthält veränderte Begegnungsdaten (${wildCrc}); bitte die unveränderte ROM verwenden`);
  }
  // UPR-ZX opens this GARC with skipDecompression=false: its entries are
  // LZ11-compressed and must be unpacked before the encounter offsets apply.
  const wildGarc = OrasRom._internal.garc(wildFile, true);
  const zoneTable = wildGarc[wildGarc.length - 1];
  if (!zoneTable || zoneTable.length % 56) throw new Error('X/Y-Zonentabelle fehlt oder hat ein unbekanntes Format');
  const wildByLocation = {};
  for (let zone = 0; zone < wildGarc.length - 1; zone++) {
    const table = encounterTable(wildGarc[zone]);
    if (!table) continue;
    const loc = u16(zoneTable, zone * 56 + 0x1c) & 0x1ff;
    (wildByLocation[loc] ||= []).push(table);
  }
  return { rom, wildByLocation };
}

function mergeLocationTables(list) {
  if (!list || !list.length) return { grass: [], surf: [] };
  return {
    grass: mergeTables(list.map(t => t.grass)),
    surf: mergeTables(list.map(t => t.surf))
  };
}

function locationType(en) {
  if (/^Route \d+$/.test(en)) return 'route';
  if (/ City$/.test(en)) return 'city';
  if (/ Town$/.test(en)) return 'town';
  return 'place';
}

function bounds(rects, entrances) {
  if (rects && rects.length) {
    return [Math.min(...rects.map(r => r[0])), Math.min(...rects.map(r => r[1])),
      Math.max(...rects.map(r => r[2])), Math.max(...rects.map(r => r[3]))].map(v => +v.toFixed(1));
  }
  const p = entrances && entrances[0];
  return p ? [p[0] - 8, p[1] - 8, p[0] + 8, p[1] + 8] : null;
}

(async () => {
  const places = JSON.parse(fs.readFileSync(placesPath, 'utf8'));
  const [x, y] = await Promise.all([readVersion(xPath, 'x'), readVersion(yPath, 'y')]);
  if (x.rom.titleId !== '0004000000055D00') throw new Error('Die erste ROM ist nicht Pokemon X');
  if (y.rom.titleId !== '0004000000055E00') throw new Error('Die zweite ROM ist nicht Pokemon Y');

  const [deGarc, enGarc] = await Promise.all([
    x.rom.file('a/0/7/7').then(b => OrasRom._internal.garc(b, false)),
    x.rom.file('a/0/7/4').then(b => OrasRom._internal.garc(b, false))
  ]);
  const de = OrasRom._internal.textFile(deGarc[72]);
  const en = OrasRom._internal.textFile(enGarc[72]);
  const ids = new Set([
    ...Object.keys(places.areas || {}), ...Object.keys(places.entrances || {}),
    ...Object.keys(x.wildByLocation), ...Object.keys(y.wildByLocation)
  ].map(Number));

  const locations = [...ids].sort((a, b) => a - b).map(id => {
    const nameEn = en[id], nameDe = de[id];
    if (!nameEn || !nameDe || nameEn === '----------' || nameEn === '???') return null;
    const anchor = POSITION_OVERRIDES[id];
    const area = anchor ? [anchor[0] - 8, anchor[1] - 8, anchor[0] + 8, anchor[1] + 8] : bounds(places.areas[id], places.entrances[id]);
    if (!area) return null;
    const label = anchor || places.labels[id] || (places.entrances[id] && places.entrances[id][0]) ||
      [(area[0] + area[2]) / 2, (area[1] + area[3]) / 2];
    return {
      id, slug: slug(nameEn), de: nameDe, en: nameEn, type: locationType(nameEn), region: 'kalos',
      area, label: [label[0], label[1]], showLabel: false, items: [], trainers: [],
      wild: { x: mergeLocationTables(x.wildByLocation[id]), y: mergeLocationTables(y.wildByLocation[id]) }
    };
  }).filter(Boolean);

  const versionDiffs = locations.filter(l => JSON.stringify(l.wild.x) !== JSON.stringify(l.wild.y)).length;
  const data = {
    version: 1,
    source: 'User-provided Pokemon X and Pokemon Y ROMs (Europe); encounter layout documented by Universal Pokemon Randomizer ZX',
    mapSource: 'Pokemon X ROM archives a/0/4/1, a/0/4/2 and a/0/1/3',
    mapAuthor: 'GAME FREAK / Nintendo',
    width: places.width, height: places.height, locations
  };
  fs.writeFileSync(OUT, JSON.stringify(data));
  console.log(path.basename(OUT), Math.round(fs.statSync(OUT).size / 1024) + ' KB', '·', locations.length,
    'Orte ·', locations.filter(l => l.wild.x.grass.length || l.wild.x.surf.length).length,
    'mit wilden Pokemon ·', versionDiffs, 'X/Y-Unterschiede');
})().catch(err => { console.error(err); process.exit(1); });

