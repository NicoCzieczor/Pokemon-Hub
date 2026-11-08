#!/usr/bin/env node
/*
 * Rendert die Feuerrot/Blattgrün-Oberwelt direkt aus einer GBA-ROM.
 *
 * Der Parser sucht die Kartengruppentabelle anhand ihrer Struktur und benötigt
 * deshalb keine sprach- oder revisionsabhängigen ROM-Adressen. Ausgelesen werden
 * MapHeader, MapLayout, Verbindungen, LZ77-Tiles, Metatiles und BGR555-Paletten.
 * Die ROM wird nur gelesen und niemals in das Projekt kopiert.
 *
 * Aufruf:
 *   node Karte/tools/render-frlg.js <firered-or-leafgreen.gba> <ausgabe>
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { writePNG } = require('./render-platin.js');

const ROM_PATH = path.resolve(process.argv[2] || 'firered.gba');
const OUT = path.resolve(process.argv[3] || 'render-frlg');
const ROM_BASE = 0x08000000;
const CHUNK = 512;
const METATILE_PX = 16;
const PRIMARY_METATILES = 640;
const TOTAL_METATILES = 1024;
const PRIMARY_TILES = 640;
const TOTAL_TILES = 1024;
const PRIMARY_PALETTES = 7;

// Gruppe 3 der Originalspiele. Die Namen sind nur Bezeichner; Tabellen,
// Strukturen und sämtliche Bilddaten kommen aus der geöffneten ROM.
const OUTDOOR_NAMES = [
  'PalletTown', 'ViridianCity', 'PewterCity', 'CeruleanCity', 'LavenderTown',
  'VermilionCity', 'CeladonCity', 'FuchsiaCity', 'CinnabarIsland',
  'IndigoPlateau_Exterior', 'SaffronCity', 'SaffronCity_Connection', 'OneIsland',
  'TwoIsland', 'ThreeIsland', 'FourIsland', 'FiveIsland', 'SevenIsland', 'SixIsland',
  'Route1', 'Route2', 'Route3', 'Route4', 'Route5', 'Route6', 'Route7', 'Route8',
  'Route9', 'Route10', 'Route11', 'Route12', 'Route13', 'Route14', 'Route15',
  'Route16', 'Route17', 'Route18', 'Route19', 'Route20', 'Route21_North',
  'Route21_South', 'Route22', 'Route23', 'Route24', 'Route25',
  'OneIsland_KindleRoad', 'OneIsland_TreasureBeach', 'TwoIsland_CapeBrink',
  'ThreeIsland_BondBridge', 'ThreeIsland_Port', 'Prototype_SeviiIsle_6',
  'Prototype_SeviiIsle_7', 'Prototype_SeviiIsle_8', 'Prototype_SeviiIsle_9',
  'FiveIsland_ResortGorgeous', 'FiveIsland_WaterLabyrinth', 'FiveIsland_Meadow',
  'FiveIsland_MemorialPillar', 'SixIsland_OutcastIsland', 'SixIsland_GreenPath',
  'SixIsland_WaterPath', 'SixIsland_RuinValley', 'SevenIsland_TrainerTower',
  'SevenIsland_SevaultCanyon_Entrance', 'SevenIsland_SevaultCanyon',
  'SevenIsland_TanobyRuins'
];

const u8 = (rom, o) => o >= 0 && o < rom.length ? rom[o] : 0;
const u16 = (rom, o) => o >= 0 && o + 2 <= rom.length ? rom.readUInt16LE(o) : 0;
const u32 = (rom, o) => o >= 0 && o + 4 <= rom.length ? rom.readUInt32LE(o) : 0;
const i32 = (rom, o) => o >= 0 && o + 4 <= rom.length ? rom.readInt32LE(o) : 0;
function ptr(rom, o) {
  if (o < 0 || o + 4 > rom.length) return null;
  const p = u32(rom, o) - ROM_BASE;
  return p >= 0 && p < rom.length ? p : null;
}

function lz77(rom, o) {
  if (u8(rom, o) !== 0x10) return null;
  const size = u32(rom, o) >>> 8;
  if (!size || size > 0x200000) return null;
  const out = Buffer.alloc(size);
  let src = o + 4, dst = 0;
  while (dst < size) {
    if (src >= rom.length) return null;
    const flags = rom[src++];
    for (let bit = 7; bit >= 0 && dst < size; bit--) {
      if (flags & (1 << bit)) {
        if (src + 2 > rom.length) return null;
        const a = rom[src++], b = rom[src++];
        const len = (a >>> 4) + 3, back = ((a & 15) << 8 | b) + 1;
        if (back > dst) return null;
        for (let n = 0; n < len && dst < size; n++) out[dst] = out[dst++ - back];
      } else {
        if (src >= rom.length) return null;
        out[dst++] = rom[src++];
      }
    }
  }
  return out;
}

function makeReader(rom) {
  const tileCache = new Map(), tilesetCache = new Map(), layoutCache = new Map(), headerCache = new Map();

  function tileset(o) {
    if (tilesetCache.has(o)) return tilesetCache.get(o);
    let value = null;
    if (o % 4 === 0 && o + 24 <= rom.length) {
      const compressed = u8(rom, o), secondary = u8(rom, o + 1);
      const tiles = ptr(rom, o + 4), palettes = ptr(rom, o + 8);
      const metatiles = ptr(rom, o + 12), callbackRaw = u32(rom, o + 16);
      const attributes = ptr(rom, o + 20);
      const callbackOk = callbackRaw === 0 || ((callbackRaw & 1) && ptr(rom, o + 16) != null);
      if (compressed <= 1 && secondary <= 1 && u16(rom, o + 2) === 0 && callbackOk &&
          tiles != null && palettes != null && metatiles != null && attributes != null) {
        value = { offset: o, compressed: !!compressed, secondary: !!secondary, tiles, palettes, metatiles, attributes };
      }
    }
    tilesetCache.set(o, value);
    return value;
  }

  function layout(o) {
    if (layoutCache.has(o)) return layoutCache.get(o);
    let value = null;
    if (o % 4 === 0 && o + 26 <= rom.length) {
      const width = u32(rom, o), height = u32(rom, o + 4);
      const border = ptr(rom, o + 8), blocks = ptr(rom, o + 12);
      const primary = ptr(rom, o + 16), secondary = ptr(rom, o + 20);
      let borderWidth = u8(rom, o + 24), borderHeight = u8(rom, o + 25);
      if (!(borderWidth >= 1 && borderWidth <= 8 && borderHeight >= 1 && borderHeight <= 8)) {
        borderWidth = 2; borderHeight = 2;
      }
      if (width > 0 && height > 0 && width <= 1024 && height <= 1024 && width * height <= 0x8000 &&
          border != null && blocks != null && primary != null && secondary != null &&
          blocks + width * height * 2 <= rom.length && border + borderWidth * borderHeight * 2 <= rom.length &&
          tileset(primary) && tileset(secondary)) {
        value = { offset: o, width, height, border, blocks, primary, secondary, borderWidth, borderHeight };
      }
    }
    layoutCache.set(o, value);
    return value;
  }

  function optionalPointer(o) {
    return u32(rom, o) === 0 ? 0 : ptr(rom, o);
  }

  function header(o) {
    if (headerCache.has(o)) return headerCache.get(o);
    let value = null;
    if (o % 4 === 0 && o + 28 <= rom.length) {
      const layoutOffset = ptr(rom, o);
      const events = optionalPointer(o + 4), scripts = optionalPointer(o + 8), connections = optionalPointer(o + 12);
      const parsedLayout = layoutOffset == null ? null : layout(layoutOffset);
      if (parsedLayout && events != null && scripts != null && connections != null) {
        value = {
          offset: o, layout: parsedLayout, events: events || null, scripts: scripts || null,
          connections: connections || null, music: u16(rom, o + 16), layoutId: u16(rom, o + 18),
          mapsec: u8(rom, o + 20), cave: u8(rom, o + 21), weather: u8(rom, o + 22), mapType: u8(rom, o + 23)
        };
      }
    }
    headerCache.set(o, value);
    return value;
  }

  function groupAt(o) {
    const array = ptr(rom, o);
    if (array == null || array % 4) return null;
    const first = ptr(rom, array);
    return first != null && first % 4 === 0 && header(first) ? array : null;
  }

  function readGroups(table) {
    const starts = [];
    while (starts.length < 256) {
      const array = groupAt(table + starts.length * 4);
      if (array == null || starts.includes(array)) break;
      starts.push(array);
    }
    const bounds = starts.concat(table).sort((a, b) => a - b);
    const groups = starts.map(start => {
      const end = bounds.find(v => v > start) ?? Infinity;
      const headers = [];
      while (headers.length < 256 && start + headers.length * 4 < end) {
        const h = ptr(rom, start + headers.length * 4);
        if (h == null || !header(h)) break;
        headers.push(h);
      }
      return { start, headers };
    });
    return { table, groups, count: groups.reduce((n, g) => n + g.headers.length, 0) };
  }

  function findGroups() {
    let best = null;
    for (let o = 0; o + 4 <= rom.length;) {
      if (groupAt(o) == null) { o += 4; continue; }
      const found = readGroups(o);
      if (!best || found.count > best.count) best = found;
      o += Math.max(1, found.groups.length) * 4;
    }
    return best;
  }

  function tiles(t, primary) {
    if (tileCache.has(t.offset)) return tileCache.get(t.offset);
    const count = primary ? PRIMARY_TILES : TOTAL_TILES - PRIMARY_TILES;
    const value = t.compressed ? (lz77(rom, t.tiles) || Buffer.alloc(0)) : rom.subarray(t.tiles, Math.min(rom.length, t.tiles + count * 32));
    tileCache.set(t.offset, value);
    return value;
  }

  return { tileset, layout, header, findGroups, tiles };
}

function color555(value) {
  const channel = shift => { const v = value >>> shift & 31; return v << 3 | v >>> 2; };
  return [channel(0), channel(5), channel(10)];
}

function renderMap(rom, reader, map, stats) {
  const l = map.layout, width = l.width * METATILE_PX, height = l.height * METATILE_PX;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const primary = reader.tileset(l.primary), secondary = reader.tileset(l.secondary);
  const primaryTiles = reader.tiles(primary, true), secondaryTiles = reader.tiles(secondary, false);
  const palettes = Array.from({ length: 16 }, (_, p) => {
    const owner = p < PRIMARY_PALETTES ? primary : secondary;
    return Array.from({ length: 16 }, (_, c) => color555(u16(rom, owner.palettes + (p * 16 + c) * 2)));
  });
  const metatileCounts = new Map([
    [primary.offset, Math.min(PRIMARY_METATILES, Math.max(0, Math.floor((primary.attributes - primary.metatiles) / 16)))],
    [secondary.offset, Math.min(TOTAL_METATILES - PRIMARY_METATILES, Math.max(0, Math.floor((secondary.attributes - secondary.metatiles) / 16)))]
  ]);
  const entriesCache = new Map();

  function entries(id) {
    if (entriesCache.has(id)) return entriesCache.get(id);
    const own = id < PRIMARY_METATILES ? primary : secondary;
    const local = id < PRIMARY_METATILES ? id : id - PRIMARY_METATILES;
    if (local >= (metatileCounts.get(own.offset) || 0)) return null;
    const value = Array.from({ length: 8 }, (_, i) => u16(rom, own.metatiles + local * 16 + i * 2));
    entriesCache.set(id, value);
    return value;
  }

  function drawTile(entry, dx, dy) {
    const tile = entry & 0x3ff, hflip = !!(entry & 0x400), vflip = !!(entry & 0x800), palette = entry >>> 12;
    const data = tile < PRIMARY_TILES ? primaryTiles : secondaryTiles;
    const local = tile < PRIMARY_TILES ? tile : tile - PRIMARY_TILES;
    const start = local * 32;
    if (start + 32 > data.length || !palettes[palette]) { stats.missingTiles.add(`${map.name}:${tile}`); return; }
    for (let py = 0; py < 8; py++) for (let px = 0; px < 8; px++) {
      const sx = hflip ? 7 - px : px, sy = vflip ? 7 - py : py;
      const packed = data[start + sy * 4 + (sx >> 1)];
      const colorIndex = sx & 1 ? packed >>> 4 : packed & 15;
      if (!colorIndex) continue;
      const color = palettes[palette][colorIndex], q = ((dy + py) * width + dx + px) * 4;
      rgba[q] = color[0]; rgba[q + 1] = color[1]; rgba[q + 2] = color[2]; rgba[q + 3] = 255;
    }
  }

  for (let my = 0; my < l.height; my++) for (let mx = 0; mx < l.width; mx++) {
    const id = u16(rom, l.blocks + (my * l.width + mx) * 2) & 0x3ff;
    const e = entries(id), ox = mx * 16, oy = my * 16;
    if (!e) { stats.missingMetatiles.add(`${map.name}:${id}`); continue; }
    const backdrop = palettes[0][0];
    for (let py = 0; py < 16; py++) for (let px = 0; px < 16; px++) {
      const q = ((oy + py) * width + ox + px) * 4;
      rgba[q] = backdrop[0]; rgba[q + 1] = backdrop[1]; rgba[q + 2] = backdrop[2]; rgba[q + 3] = 255;
    }
    for (let i = 0; i < 8; i++) drawTile(e[i], ox + i % 2 * 8, oy + Math.floor(i % 4 / 2) * 8);
  }
  return { width, height, rgba };
}

function connections(rom, map) {
  const o = map.connections;
  if (o == null) return [];
  const count = i32(rom, o), list = ptr(rom, o + 4);
  if (count < 0 || count > 32 || list == null || list + count * 12 > rom.length) return [];
  return Array.from({ length: count }, (_, i) => {
    const at = list + i * 12;
    return { direction: u8(rom, at), offset: i32(rom, at + 4), group: u8(rom, at + 8), num: u8(rom, at + 9) };
  });
}

function arrange(rom, maps) {
  const byId = new Map(maps.map(m => [`${m.group}.${m.num}`, m]));
  const positions = new Map(), components = [], conflicts = [];
  for (const start of maps) {
    // Prototypen zeigen einseitig auf echte Inselkarten und würden deren Komponente
    // mehrfach einsammeln. SaffronCity_Connection ist die kompakte, mit allen vier
    // Routen verbundene Oberweltfassung; die größere Laufzeitvariante bleibt separat.
    if (start.name.startsWith('Prototype_') || start.name === 'SaffronCity') continue;
    if (positions.has(start.name)) continue;
    const local = new Map([[start.name, { x: 0, z: 0 }]]), queue = [start], members = [];
    positions.set(start.name, local.get(start.name));
    while (queue.length) {
      const map = queue.shift(), here = local.get(map.name);
      members.push(map);
      for (const edge of connections(rom, map)) {
        const next = byId.get(`${edge.group}.${edge.num}`);
        if (!next) continue;
        let x = here.x, z = here.z;
        if (edge.direction === 1) { x += edge.offset; z += map.layout.height; }
        else if (edge.direction === 2) { x += edge.offset; z -= next.layout.height; }
        else if (edge.direction === 3) { x -= next.layout.width; z += edge.offset; }
        else if (edge.direction === 4) { x += map.layout.width; z += edge.offset; }
        else continue;
        const old = local.get(next.name);
        if (old && (old.x !== x || old.z !== z)) conflicts.push(`${map.name}->${next.name}: ${old.x},${old.z} / ${x},${z}`);
        if (!old) {
          const value = { x, z };
          local.set(next.name, value); positions.set(next.name, value); queue.push(next);
        }
      }
    }
    const kept = members.filter(m => !m.name.startsWith('Prototype_') && m.name !== 'SaffronCity');
    if (!kept.length) continue;
    const minX = Math.min(...kept.map(m => local.get(m.name).x));
    const minZ = Math.min(...kept.map(m => local.get(m.name).z));
    const maxX = Math.max(...kept.map(m => local.get(m.name).x + m.layout.width));
    const maxZ = Math.max(...kept.map(m => local.get(m.name).z + m.layout.height));
    components.push({ maps: kept, local, minX, minZ, width: maxX - minX, height: maxZ - minZ });
  }

  const rank = c => {
    const names = new Set(c.maps.map(m => m.name));
    if (names.has('PalletTown')) return 0;
    for (const [i, name] of ['OneIsland', 'TwoIsland', 'ThreeIsland', 'FourIsland', 'FiveIsland', 'SixIsland', 'SevenIsland'].entries()) {
      if (names.has(name)) return i + 1;
    }
    return 20;
  };
  components.sort((a, b) => rank(a) - rank(b) || b.maps.length - a.maps.length);
  const PADDING = 12, MARGIN = 10;
  const main = components[0];
  main.packX = MARGIN; main.packZ = MARGIN;
  // Die sieben Inselgruppen passen in eine breite Zeile unter Kanto. Das ergibt
  // im Browser eine kompakte, fast quadratische Gesamtkarte statt eines langen
  // Hochformats, ohne ihre internen Spielverbindungen zu verändern.
  const rowWidth = Math.max(main.width, 760);
  let x = MARGIN, z = MARGIN + main.height + PADDING, rowHeight = 0;
  for (const component of components.slice(1)) {
    if (x > MARGIN && x + component.width > MARGIN + rowWidth) { x = MARGIN; z += rowHeight + PADDING; rowHeight = 0; }
    component.packX = x; component.packZ = z;
    x += component.width + PADDING; rowHeight = Math.max(rowHeight, component.height);
  }
  let maxX = 0, maxZ = 0;
  for (const component of components) for (const map of component.maps) {
    const p = component.local.get(map.name);
    map.worldX = component.packX + p.x - component.minX;
    map.worldZ = component.packZ + p.z - component.minZ;
    maxX = Math.max(maxX, map.worldX + map.layout.width + MARGIN);
    maxZ = Math.max(maxZ, map.worldZ + map.layout.height + MARGIN);
  }
  return { components, conflicts, width: Math.ceil(maxX / 32) * 32, height: Math.ceil(maxZ / 32) * 32 };
}

function pasteIntoChunks(chunks, image, worldX, worldZ) {
  const baseX = worldX * METATILE_PX, baseY = worldZ * METATILE_PX;
  for (let sy = 0; sy < image.height; sy++) {
    let sx = 0;
    while (sx < image.width) {
      const gx = baseX + sx, gy = baseY + sy, col = Math.floor(gx / CHUNK), row = Math.floor(gy / CHUNK);
      const lx = gx % CHUNK, ly = gy % CHUNK, count = Math.min(image.width - sx, CHUNK - lx);
      const key = `${row}:${col}`;
      if (!chunks.has(key)) chunks.set(key, new Uint8ClampedArray(CHUNK * CHUNK * 4));
      const target = chunks.get(key), from = (sy * image.width + sx) * 4, to = (ly * CHUNK + lx) * 4;
      target.set(image.rgba.subarray(from, from + count * 4), to);
      sx += count;
    }
  }
}

function main() {
  const rom = fs.readFileSync(ROM_PATH);
  const title = rom.subarray(0xa0, 0xac).toString('ascii').replace(/\0.*$/, '');
  const gameCode = rom.subarray(0xac, 0xb0).toString('ascii');
  if (!/^BP[RG]/.test(gameCode)) throw new Error(`Keine Feuerrot/Blattgrün-ROM (${gameCode || 'ohne Kennung'}).`);
  const reader = makeReader(rom), groups = reader.findGroups();
  if (!groups || groups.count < 300 || !groups.groups[3] || groups.groups[3].headers.length !== OUTDOOR_NAMES.length) {
    throw new Error('Die FR/BG-Kartengruppen konnten nicht zuverlässig gefunden werden.');
  }
  console.log(`${title} (${gameCode}), Kartengruppen bei 0x${groups.table.toString(16)}: ${groups.count} Karten in ${groups.groups.length} Gruppen`);
  const maps = groups.groups[3].headers.map((offset, num) => {
    const h = reader.header(offset);
    return { ...h, group: 3, num, name: OUTDOOR_NAMES[num] };
  });
  const arranged = arrange(rom, maps);
  fs.mkdirSync(OUT, { recursive: true });
  const chunks = new Map(), stats = { missingTiles: new Set(), missingMetatiles: new Set() };
  const rendered = arranged.components.flatMap(c => c.maps);
  for (let i = 0; i < rendered.length; i++) {
    const map = rendered[i], image = renderMap(rom, reader, map, stats);
    pasteIntoChunks(chunks, image, map.worldX, map.worldZ);
    if ((i + 1) % 10 === 0 || i + 1 === rendered.length) console.log(`  ${i + 1}/${rendered.length} ${map.name}`);
  }
  const chunkInfo = {};
  for (const [key, rgba] of chunks) {
    const [row, col] = key.split(':').map(Number);
    writePNG(path.join(OUT, `chunk_${row}_${col}.png`), CHUNK, CHUNK, rgba);
    chunkInfo[key] = { ground: 0 };
  }
  const info = {
    version: 1, source: 'FireRed/LeafGreen GBA ROM', gameCode, groupTable: groups.table,
    rows: arranged.height / 32, cols: arranged.width / 32, size: CHUNK, shear: 0, origin: [0, 0],
    chunks: chunkInfo,
    maps: rendered.map(m => ({ id: `${m.group}.${m.num}`, name: m.name, x: m.worldX, z: m.worldZ, width: m.layout.width, height: m.layout.height })),
    components: arranged.components.map(c => c.maps.map(m => m.name)),
    conflicts: arranged.conflicts
  };
  fs.writeFileSync(path.join(OUT, 'render.json'), JSON.stringify(info));
  console.log(`Fertig: ${rendered.length} Oberweltkarten, ${chunks.size} Blöcke, ${arranged.width}×${arranged.height} Weltkacheln.`);
  console.log(`Fehlende Tiles: ${stats.missingTiles.size}; fehlende Metatiles: ${stats.missingMetatiles.size}; Verbindungskonflikte: ${arranged.conflicts.length}`);
}

if (require.main === module) {
  try { main(); } catch (error) { console.error(error.stack || error); process.exit(1); }
}

module.exports = { makeReader, renderMap, arrange, lz77, OUTDOOR_NAMES };
