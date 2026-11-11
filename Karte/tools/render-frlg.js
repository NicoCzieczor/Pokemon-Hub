#!/usr/bin/env node
/*
 * Rendert Feuerrot/Blattgrün direkt aus einer GBA-ROM.
 *
 * Oberwelt: die Außenkarten (Gruppe 3) über ihre Kartenverbindungen zusammengesetzt – Kanto am Stück, darunter die
 * Sieben Inseln. Zwischen den Karten zeigt das Spiel die Randblöcke („border") der Karte, auf der man steht:
 * Bäume, Felsen oder Wasser. Genauso werden hier die Lücken gefüllt, je Stelle mit dem Rand der nächsten Karte.
 * Innenkarten (Höhlen, Gebäude, Etagen): jede Kartengestalt (Layout) einzeln, nur die, die frlg.json braucht.
 *
 * Der Parser sucht die Kartengruppentabelle anhand ihrer Struktur und benötigt deshalb keine sprach- oder
 * revisionsabhängigen ROM-Adressen. Ausgelesen werden MapHeader, MapLayout, Verbindungen, LZ77-Tiles, Metatiles und
 * BGR555-Paletten. Die Kartennamen (Gruppe/Nummer → Name, Name → Layout) kommen aus pret/pokefirered.
 * Die ROM wird nur gelesen und niemals in das Projekt kopiert.
 *
 * Aufruf:
 *   node render-frlg.js <feuerrot.gba> <ausgabe> --decomp=<pokefirered> [--no-interiors]
 *   node render-frlg.js <feuerrot.gba> <ausgabe> --decomp=<pokefirered> --interiors-only [--data=../frlg.json]
 * Reihenfolge: Oberwelt rendern → build-frlg.js → Innenkarten rendern → make-tiles.py
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { writePNG } = require('./render-platin.js');

const opts = {}, args = [];
for (const a of process.argv.slice(2)) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(a);
  if (m) opts[m[1]] = m[2] ?? true; else args.push(a);
}
const ROM_PATH = path.resolve(args[0] || 'firered.gba');
const OUT = path.resolve(args[1] || 'render-frlg');
const ROM_BASE = 0x08000000;
const CHUNK = 512;
const METATILE_PX = 16;
const PRIMARY_METATILES = 640;
const TOTAL_METATILES = 1024;
const PRIMARY_TILES = 640;
const TOTAL_TILES = 1024;
const PRIMARY_PALETTES = 7;
const FILL_MARGIN = 3;   // so viele Kacheln Rand bekommt jede Inselgruppe rundherum
const FILL_REACH = +(opts.reach || 8); // so weit (Kacheln) reicht der Rand einer Karte – etwa so weit wie im Spiel auf dem Bildschirm

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

// Metatiles eines Tileset-Paars als fertige 16×16-Bilder (RGBA), zwischengespeichert
const metatileSets = new Map();
function metatiles(rom, reader, l, stats) {
  const key = `${l.primary}:${l.secondary}`;
  if (metatileSets.has(key)) return metatileSets.get(key);
  const primary = reader.tileset(l.primary), secondary = reader.tileset(l.secondary);
  const primaryTiles = reader.tiles(primary, true), secondaryTiles = reader.tiles(secondary, false);
  const palettes = Array.from({ length: 16 }, (_, p) => {
    const owner = p < PRIMARY_PALETTES ? primary : secondary;
    return Array.from({ length: 16 }, (_, c) => color555(u16(rom, owner.palettes + (p * 16 + c) * 2)));
  });
  const counts = new Map([
    [primary.offset, Math.min(PRIMARY_METATILES, Math.max(0, Math.floor((primary.attributes - primary.metatiles) / 16)))],
    [secondary.offset, Math.min(TOTAL_METATILES - PRIMARY_METATILES, Math.max(0, Math.floor((secondary.attributes - secondary.metatiles) / 16)))]
  ]);
  const cache = new Map();
  function draw(id) {
    if (cache.has(id)) return cache.get(id);
    const own = id < PRIMARY_METATILES ? primary : secondary;
    const local = id < PRIMARY_METATILES ? id : id - PRIMARY_METATILES;
    let img = null;
    if (local < (counts.get(own.offset) || 0)) {
      img = new Uint8ClampedArray(16 * 16 * 4);
      const backdrop = palettes[0][0];
      for (let q = 0; q < 256; q++) { img[q * 4] = backdrop[0]; img[q * 4 + 1] = backdrop[1]; img[q * 4 + 2] = backdrop[2]; img[q * 4 + 3] = 255; }
      // Untere, dann obere Ebene (je 2 × 2 Tiles à 8 × 8); Farbe 0 ist durchsichtig
      for (let i = 0; i < 8; i++) {
        const entry = u16(rom, own.metatiles + local * 16 + i * 2);
        const tile = entry & 0x3ff, hflip = !!(entry & 0x400), vflip = !!(entry & 0x800), palette = entry >>> 12;
        const data = tile < PRIMARY_TILES ? primaryTiles : secondaryTiles;
        const start = (tile < PRIMARY_TILES ? tile : tile - PRIMARY_TILES) * 32;
        if (start + 32 > data.length || !palettes[palette]) { stats.missingTiles.add(`${key}:${tile}`); continue; }
        const dx = i % 2 * 8, dy = Math.floor(i % 4 / 2) * 8;
        for (let py = 0; py < 8; py++) for (let px = 0; px < 8; px++) {
          const sx = hflip ? 7 - px : px, sy = vflip ? 7 - py : py;
          const packed = data[start + sy * 4 + (sx >> 1)];
          const colorIndex = sx & 1 ? packed >>> 4 : packed & 15;
          if (!colorIndex) continue;
          const color = palettes[palette][colorIndex], q = ((dy + py) * 16 + dx + px) * 4;
          img[q] = color[0]; img[q + 1] = color[1]; img[q + 2] = color[2];
        }
      }
    }
    cache.set(id, img);
    return img;
  }
  metatileSets.set(key, draw);
  return draw;
}

// Eine Karte als Bild (Breite·16 × Höhe·16)
function renderMap(rom, reader, map, stats) {
  const l = map.layout, width = l.width * METATILE_PX, height = l.height * METATILE_PX;
  const rgba = new Uint8ClampedArray(width * height * 4);
  const draw = metatiles(rom, reader, l, stats);
  for (let my = 0; my < l.height; my++) for (let mx = 0; mx < l.width; mx++) {
    const id = u16(rom, l.blocks + (my * l.width + mx) * 2) & 0x3ff;
    const img = draw(id);
    if (!img) { stats.missingMetatiles.add(`${map.name}:${id}`); continue; }
    for (let py = 0; py < 16; py++) rgba.set(img.subarray(py * 64, py * 64 + 64), ((my * 16 + py) * width + mx * 16) * 4);
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

// Außenkarten über ihre Verbindungen anordnen: Kanto, darunter die Inselgruppen in einer Reihe
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

// Weltbild in Blöcken à 512 × 512 Pixel (32 × 32 Kacheln)
function makeWorld() {
  const chunks = new Map();
  const target = (gx, gy) => {
    const key = `${Math.floor(gy / CHUNK)}:${Math.floor(gx / CHUNK)}`;
    if (!chunks.has(key)) chunks.set(key, new Uint8ClampedArray(CHUNK * CHUNK * 4));
    return chunks.get(key);
  };
  // Eine 16×16-Metatile an Weltkachel (x, z)
  function putTile(x, z, img) {
    const gx = x * METATILE_PX, gy = z * METATILE_PX, t = target(gx, gy), lx = gx % CHUNK, ly = gy % CHUNK;
    for (let py = 0; py < 16; py++) t.set(img.subarray(py * 64, py * 64 + 64), ((ly + py) * CHUNK + lx) * 4);
  }
  function paste(image, worldX, worldZ) {
    const baseX = worldX * METATILE_PX, baseY = worldZ * METATILE_PX;
    for (let sy = 0; sy < image.height; sy++) {
      let sx = 0;
      while (sx < image.width) {
        const gx = baseX + sx, gy = baseY + sy, lx = gx % CHUNK, ly = gy % CHUNK, count = Math.min(image.width - sx, CHUNK - lx);
        const from = (sy * image.width + sx) * 4;
        target(gx, gy).set(image.rgba.subarray(from, from + count * 4), (ly * CHUNK + lx) * 4);
        sx += count;
      }
    }
  }
  return { chunks, putTile, paste };
}

// Lücken einer Komponente mit den Randblöcken der jeweils nächsten Karte füllen (wie das Spiel jenseits des Kartenrands)
function fillGaps(rom, reader, component, world, stats) {
  const maps = component.maps;
  const x0 = Math.min(...maps.map(m => m.worldX)) - FILL_MARGIN, z0 = Math.min(...maps.map(m => m.worldZ)) - FILL_MARGIN;
  const x1 = Math.max(...maps.map(m => m.worldX + m.layout.width)) + FILL_MARGIN;
  const z1 = Math.max(...maps.map(m => m.worldZ + m.layout.height)) + FILL_MARGIN;
  const W = x1 - x0, H = z1 - z0, owner = new Int16Array(W * H).fill(-1), covered = new Uint8Array(W * H);
  let queue = [];
  maps.forEach((m, i) => {
    for (let z = m.worldZ; z < m.worldZ + m.layout.height; z++) for (let x = m.worldX; x < m.worldX + m.layout.width; x++) {
      const q = (z - z0) * W + (x - x0);
      owner[q] = i; covered[q] = 1; queue.push(q);
    }
  });
  // Breitensuche mit 8 Nachbarn: jede freie Stelle gehört zur nächsten Karte
  for (let d = 0; queue.length && d < FILL_REACH; d++) {
    const next = [];
    for (const q of queue) {
      const x = q % W, z = (q - x) / W;
      for (let dz = -1; dz <= 1; dz++) for (let dx = -1; dx <= 1; dx++) {
        const nx = x + dx, nz = z + dz;
        if (nx < 0 || nz < 0 || nx >= W || nz >= H) continue;
        const n = nz * W + nx;
        if (owner[n] >= 0) continue;
        owner[n] = owner[q]; next.push(n);
      }
    }
    queue = next;
  }
  let filled = 0;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const q = z * W + x;
    if (covered[q] || owner[q] < 0) continue;
    const m = maps[owner[q]], l = m.layout;
    const lx = x + x0 - m.worldX, lz = z + z0 - m.worldZ;
    const bx = ((lx % l.borderWidth) + l.borderWidth) % l.borderWidth, bz = ((lz % l.borderHeight) + l.borderHeight) % l.borderHeight;
    const id = u16(rom, l.border + (bz * l.borderWidth + bx) * 2) & 0x3ff;
    const img = metatiles(rom, reader, l, stats)(id);
    if (img) { world.putTile(x + x0, z + z0, img); filled++; }
  }
  return filled;
}

// Gleiche Gegend, andere Karte (Saffronia City): Versatz, bei dem die meisten Blöcke übereinstimmen
function blockOffset(rom, big, small) {
  const a = big.layout, b = small.layout;
  let best = { dx: 0, dz: 0, score: -1 };
  for (let dz = 0; dz <= a.height - b.height; dz++) for (let dx = 0; dx <= a.width - b.width; dx++) {
    let score = 0;
    for (let z = 0; z < b.height; z += 2) for (let x = 0; x < b.width; x += 2) {
      if ((u16(rom, a.blocks + ((z + dz) * a.width + x + dx) * 2) & 0x3ff) === (u16(rom, b.blocks + (z * b.width + x) * 2) & 0x3ff)) score++;
    }
    if (score > best.score) best = { dx, dz, score };
  }
  return best;
}

function openRom() {
  const rom = fs.readFileSync(ROM_PATH);
  const title = rom.subarray(0xa0, 0xac).toString('ascii').replace(/\0.*$/, '');
  const gameCode = rom.subarray(0xac, 0xb0).toString('ascii');
  if (!/^BP[RG]/.test(gameCode)) throw new Error(`Keine Feuerrot/Blattgrün-ROM (${gameCode || 'ohne Kennung'}).`);
  const reader = makeReader(rom), groups = reader.findGroups();
  if (!opts.decomp) throw new Error('--decomp=<pokefirered> fehlt (Kartennamen).');
  const mg = JSON.parse(fs.readFileSync(path.join(opts.decomp, 'data/maps/map_groups.json'), 'utf8'));
  const names = mg.group_order.map(k => mg[k]);
  if (!groups || groups.groups.length !== names.length || groups.groups.some((g, i) => g.headers.length !== names[i].length)) {
    throw new Error('Die Kartengruppen der ROM passen nicht zu pret/pokefirered.');
  }
  console.log(`${title} (${gameCode}), Kartengruppen bei 0x${groups.table.toString(16)}: ${groups.count} Karten in ${groups.groups.length} Gruppen`);
  const maps = [];
  groups.groups.forEach((g, gi) => g.headers.forEach((offset, num) => maps.push({ ...reader.header(offset), group: gi, num, name: names[gi][num] })));
  return { rom, reader, groups, gameCode, maps };
}

function renderOverworld() {
  const { rom, reader, groups, gameCode, maps: all } = openRom();
  const maps = all.filter(m => m.group === 3);
  const arranged = arrange(rom, maps);
  fs.mkdirSync(OUT, { recursive: true });
  const world = makeWorld(), stats = { missingTiles: new Set(), missingMetatiles: new Set() };
  let filled = 0;
  for (const component of arranged.components) filled += fillGaps(rom, reader, component, world, stats);
  const rendered = arranged.components.flatMap(c => c.maps);
  for (const map of rendered) world.paste(renderMap(rom, reader, map, stats), map.worldX, map.worldZ);
  for (const [key, rgba] of world.chunks) {
    const [row, col] = key.split(':').map(Number);
    writePNG(path.join(OUT, `chunk_${row}_${col}.png`), CHUNK, CHUNK, rgba);
  }
  // Saffronia City: Oberwelt zeigt die kompakte Verbindungskarte, Personen und Türen stehen in der großen Karte
  const saffron = all.find(m => m.group === 3 && m.name === 'SaffronCity'), conn = all.find(m => m.group === 3 && m.name === 'SaffronCity_Connection');
  const off = blockOffset(rom, saffron, conn);
  const info = {
    version: 2, source: 'FireRed/LeafGreen GBA ROM', gameCode, groupTable: groups.table,
    rows: arranged.height / 32, cols: arranged.width / 32, size: CHUNK, shear: 0, origin: [0, 0],
    chunks: {},
    maps: rendered.map(m => ({ id: `${m.group}.${m.num}`, name: m.name, x: m.worldX, z: m.worldZ, width: m.layout.width, height: m.layout.height })),
    aliases: { SaffronCity: { as: 'SaffronCity_Connection', dx: -off.dx, dz: -off.dz } },
    components: arranged.components.map(c => c.maps.map(m => m.name)),
    conflicts: arranged.conflicts
  };
  fs.writeFileSync(path.join(OUT, 'render.json'), JSON.stringify(info));
  console.log(`Oberwelt: ${rendered.length} Karten, ${world.chunks.size} Blöcke, ${arranged.width}×${arranged.height} Kacheln, ${filled} Randkacheln ergänzt.`);
  console.log(`Saffronia City liegt in der großen Karte bei ${off.dx}/${off.dz} (${off.score} gleiche Proben).`);
  console.log(`Fehlende Tiles: ${stats.missingTiles.size}; fehlende Metatiles: ${stats.missingMetatiles.size}; Verbindungskonflikte: ${arranged.conflicts.join('; ') || 0}`);
}

// Innenkarten: je Layout ein Bild, nur die, die frlg.json (maps[…].matrix) braucht
function renderInteriors() {
  const dataFile = path.resolve(opts.data || path.join(__dirname, '..', 'frlg.json'));
  if (!fs.existsSync(dataFile)) { console.log('Keine frlg.json für die Innenkarten gefunden:', dataFile); return; }
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const wanted = new Set(Object.values(data.maps || {}).map(m => m.matrix));
  const { rom, reader, maps } = openRom();
  const layoutOf = new Map();
  for (const m of maps) {
    const file = path.join(opts.decomp, 'data/maps', m.name, 'map.json');
    if (!fs.existsSync(file)) continue;
    const layout = JSON.parse(fs.readFileSync(file, 'utf8')).layout;
    if (wanted.has(layout) && !layoutOf.has(layout)) layoutOf.set(layout, m);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const stats = { missingTiles: new Set(), missingMetatiles: new Set() }, images = {};
  for (const layout of wanted) {
    const m = layoutOf.get(layout);
    if (!m) { console.log('  Layout nicht gefunden:', layout); continue; }
    const img = renderMap(rom, reader, m, stats);
    const key = `${layout}__0`, file = `interior_${key}.png`;
    writePNG(path.join(OUT, file), img.width, img.height, img.rgba);
    images[key] = { file, w: img.width, h: img.height, ox: 0, oz: 0, ground: {} };
  }
  fs.writeFileSync(path.join(OUT, 'interiors.json'), JSON.stringify({ shear: 0, images }));
  console.log(`Innenkarten: ${Object.keys(images).length} Bilder; fehlende Tiles ${stats.missingTiles.size}, Metatiles ${stats.missingMetatiles.size}`);
}

if (require.main === module) {
  try {
    if (!opts['interiors-only']) renderOverworld();
    if (opts['interiors-only'] || (!opts['no-interiors'] && fs.existsSync(path.resolve(opts.data || path.join(__dirname, '..', 'frlg.json'))) && opts.data)) renderInteriors();
  } catch (error) { console.error(error.stack || error); process.exit(1); }
}

module.exports = { makeReader, renderMap, arrange, lz77, ptr, u8, u16, u32 };
