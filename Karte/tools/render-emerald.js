#!/usr/bin/env node
/*
 * Rendert Pokémon Smaragd direkt aus der GBA-ROM (Parser, Tilesets und Metatiles: render-frlg.js mit Smaragd-Profil).
 *
 * Oberwelt: die Städte und Routen (Kartengruppe 0, ohne die Unterwasser-Karten) über ihre Kartenverbindungen zu Hoenn
 * zusammengesetzt. Dazu die beiden anderen Gegenden mit eigenen Außenkarten – Safari-Zone (6 Karten) und Kampfzone
 * (2 Karten) –, jeweils dort, wo sie auf der Regionskarte des Spiels liegen. Zwischen den Karten zeigt das Spiel die
 * Randblöcke („border") der Karte, auf der man steht: Bäume, Felsen oder Wasser. Genauso werden hier die Lücken gefüllt:
 * jede Stelle mit dem Rand der nächsten Karte, eingeschlossene Lücken ganz, nach außen bis FILL_REACH Kacheln.
 * Innenkarten (Höhlen, Gebäude, Etagen, Unterwasser): jede Kartengestalt (Layout) einzeln, nur die aus emerald.json.
 *
 * Die Kartennamen (Gruppe/Nummer → Name, Name → Layout) kommen aus pret/pokeemerald. Die ROM wird nur gelesen.
 *
 * Aufruf:
 *   node render-emerald.js <smaragd.gba> <ausgabe> --decomp=<pokeemerald>
 *   node render-emerald.js <smaragd.gba> <ausgabe> --decomp=<pokeemerald> --interiors-only [--data=../emerald.json]
 * Reihenfolge: Oberwelt rendern → build-emerald.js → Innenkarten rendern → make-tiles.py
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { writePNG } = require('./render-platin.js');
const { PROFILES, makeReader, renderMap, metatiles, connections, makeWorld, u16 } = require('./render-frlg.js');

const opts = {}, args = [];
for (const a of process.argv.slice(2)) {
  const m = /^--([\w-]+)(?:=(.*))?$/.exec(a);
  if (m) opts[m[1]] = m[2] ?? true; else args.push(a);
}
const ROM_PATH = path.resolve(args[0] || 'emerald.gba');
const OUT = path.resolve(args[1] || 'render-emerald');
const CHUNK = 512;
const MARGIN = 28;                       // Rand um die ganze Welt (Kacheln): Meer rundherum
const FILL_REACH = +(opts.reach || 12);  // so weit (Kacheln) reicht der Rand einer Karte nach außen

// Außenkarten der Oberwelt: Städte und Routen ohne Unterwasser, dazu Safari-Zone und Kampfzone. Xeneroville hat keine
// Verbindung (man taucht hinein) und ist größer als sein Krater auf Route 126 – es bleibt eine Innenkarte, der Krater
// auf Route 126 ist sein Ort (build-emerald.js), wie auf der ΩR/αS-Karte.
const isOverworld = m => (m.groupName === 'gMapGroup_TownsAndRoutes' && !m.name.startsWith('Underwater_') && m.name !== 'SootopolisCity') ||
  /^SafariZone_(North|South)(west|east)?$/.test(m.name) || /^BattleFrontier_Outside(West|East)$/.test(m.name);

function openRom() {
  const rom = fs.readFileSync(ROM_PATH);
  const title = rom.subarray(0xa0, 0xac).toString('ascii').replace(/\0.*$/, '');
  const gameCode = rom.subarray(0xac, 0xb0).toString('ascii');
  if (!/^BPE/.test(gameCode)) throw new Error(`Keine Smaragd-ROM (${gameCode || 'ohne Kennung'}).`);
  if (!opts.decomp) throw new Error('--decomp=<pokeemerald> fehlt (Kartennamen).');
  const reader = makeReader(rom, PROFILES.emerald), groups = reader.findGroups();
  const mg = JSON.parse(fs.readFileSync(path.join(opts.decomp, 'data/maps/map_groups.json'), 'utf8'));
  const names = mg.group_order.map(k => mg[k]);
  if (!groups || groups.groups.length !== names.length || groups.groups.some((g, i) => g.headers.length !== names[i].length)) {
    throw new Error(`Die Kartengruppen der ROM passen nicht zu pret/pokeemerald (${groups ? groups.groups.map(g => g.headers.length).join(',') : '–'}).`);
  }
  console.log(`${title} (${gameCode}), Kartengruppen bei 0x${groups.table.toString(16)}: ${groups.count} Karten in ${groups.groups.length} Gruppen`);
  const maps = [];
  groups.groups.forEach((g, gi) => g.headers.forEach((offset, num) => maps.push({
    ...reader.header(offset), group: gi, groupName: mg.group_order[gi], num, name: names[gi][num],
  })));
  return { rom, reader, groups, gameCode, maps };
}

// Zusammenhängende Kartengruppen über die Verbindungen (oben/unten/links/rechts; Tauchen/Auftauchen zählt nicht)
function components(rom, maps) {
  const byId = new Map(maps.map(m => [`${m.group}.${m.num}`, m]));
  const seen = new Set(), list = [], conflicts = [];
  for (const start of maps) {
    if (seen.has(start.name)) continue;
    const local = new Map([[start.name, { x: 0, z: 0 }]]), queue = [start], members = [];
    seen.add(start.name);
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
        if (!old) { local.set(next.name, { x, z }); seen.add(next.name); queue.push(next); }
      }
    }
    const minX = Math.min(...members.map(m => local.get(m.name).x)), minZ = Math.min(...members.map(m => local.get(m.name).z));
    for (const m of members) { const p = local.get(m.name); p.x -= minX; p.z -= minZ; }
    const width = Math.max(...members.map(m => local.get(m.name).x + m.layout.width));
    const height = Math.max(...members.map(m => local.get(m.name).z + m.layout.height));
    list.push({ maps: members, local, width, height });
  }
  return { list, conflicts };
}

// Hoenn in die Welt legen, Safari-Zone und Kampfzone dort, wo sie auf der Regionskarte liegen (Raster des Spiels,
// über die Lage der Hoenn-Karten in Kacheln umgerechnet) – ohne Hoenn zu berühren
function arrange(rom, maps) {
  const { list, conflicts } = components(rom, maps);
  const main = list.find(c => c.maps.some(m => m.name === 'LittlerootTown'));
  const sections = new Map(JSON.parse(fs.readFileSync(path.join(opts.decomp, 'src/data/region_map/region_map_sections.json'), 'utf8')).map_sections.map(s => [s.id, s]));
  const mapsec = name => JSON.parse(fs.readFileSync(path.join(opts.decomp, 'data/maps', name, 'map.json'), 'utf8')).region_map_section;
  // Regionskarten-Raster → Kacheln: lineare Ausgleichsrechnung über die Mitten der Hoenn-Karten je Achse
  const fit = axis => {
    let n = 0, sa = 0, sb = 0, saa = 0, sab = 0;
    for (const m of main.maps) {
      const s = sections.get(mapsec(m.name));
      if (!s || s.width == null) continue;
      const p = main.local.get(m.name);
      const a = axis === 'x' ? s.x + s.width / 2 : s.y + s.height / 2;
      const b = axis === 'x' ? p.x + m.layout.width / 2 : p.z + m.layout.height / 2;
      n++; sa += a; sb += b; saa += a * a; sab += a * b;
    }
    const k = (n * sab - sa * sb) / (n * saa - sa * sa);
    return { k, d: (sb - k * sa) / n };
  };
  const fx = fit('x'), fz = fit('z');
  main.packX = 0; main.packZ = 0;
  const placed = [main];
  // belegt sind die Karten selbst (nicht das umschließende Rechteck einer Gegend – Hoenn hat große Lücken voller Meer)
  const boxes = () => placed.flatMap(c => c.maps.map(m => { const p = c.local.get(m.name); return [c.packX + p.x, c.packZ + p.z, c.packX + p.x + m.layout.width, c.packZ + p.z + m.layout.height]; }));
  const PAD = 6;
  for (const c of list) {
    if (c === main) continue;
    const s = sections.get(mapsec(c.maps[0].name));
    if (!s || s.width == null) { console.log('  ohne Lage auf der Regionskarte:', c.maps.map(m => m.name).join(', ')); continue; }
    // Wunschlage: Mitte der Gegend auf die Mitte ihres Regionskarten-Felds
    const wx = Math.round(fx.k * (s.x + s.width / 2) + fx.d - c.width / 2), wz = Math.round(fz.k * (s.y + s.height / 2) + fz.d - c.height / 2);
    // nächste freie Stelle (Abstand PAD zu allem, was schon liegt) – spiralförmig um die Wunschlage
    const taken = boxes();
    const free = (x, z) => c.maps.every(m => {
      const p = c.local.get(m.name), x0 = x + p.x, z0 = z + p.z, x1 = x0 + m.layout.width, z1 = z0 + m.layout.height;
      return taken.every(b => x1 + PAD <= b[0] || x0 >= b[2] + PAD || z1 + PAD <= b[1] || z0 >= b[3] + PAD);
    });
    let best = null;
    for (let r = 0; r < 400 && !best; r += 2) {
      for (let dz = -r; dz <= r && !best; dz += 2) for (const dx of (Math.abs(dz) === r ? range(-r, r, 2) : [-r, r])) {
        if (free(wx + dx, wz + dz)) { best = [wx + dx, wz + dz]; break; }
      }
    }
    c.packX = best[0]; c.packZ = best[1];
    placed.push(c);
    console.log(`  ${c.maps.map(m => m.name).join(', ')}: Regionskarte ${s.x}/${s.y} → ${wx}/${wz}, gelegt ${best[0]}/${best[1]}`);
  }
  // Welt bei 0/0 beginnen lassen (mit Rand)
  const minX = Math.min(...placed.map(c => c.packX)) - MARGIN, minZ = Math.min(...placed.map(c => c.packZ)) - MARGIN;
  let maxX = 0, maxZ = 0;
  for (const c of placed) for (const m of c.maps) {
    const p = c.local.get(m.name);
    m.worldX = c.packX - minX + p.x; m.worldZ = c.packZ - minZ + p.z;
    maxX = Math.max(maxX, m.worldX + m.layout.width + MARGIN);
    maxZ = Math.max(maxZ, m.worldZ + m.layout.height + MARGIN);
  }
  return { components: placed, conflicts, width: Math.ceil(maxX / 32) * 32, height: Math.ceil(maxZ / 32) * 32, fit: { fx, fz, minX, minZ } };
}
function range(a, b, step) { const out = []; for (let v = a; v <= b; v += step) out.push(v); return out; }

// Lücken mit den Randblöcken der jeweils nächsten Karte füllen (wie das Spiel jenseits des Kartenrands) – so weit, wie
// man im Spiel über den Kartenrand blickt (FILL_REACH, „nächste" nach echtem Abstand zum Kartenrechteck). Weiter innen
// zeigt jede Lücke den Rand, der sie am meisten umgibt (Wald zwischen den Landrouten, Meer in der Bucht östlich von
// Route 110), alles, was zum Weltrand offen ist, offenes Meer (Rand von Route 105) – Hoenn ist von Meer umgeben.
function fillGaps(rom, reader, maps, W, H, world, stats) {
  const owner = new Int16Array(W * H).fill(-1), covered = new Uint8Array(W * H);
  maps.forEach((m, i) => {
    for (let z = m.worldZ; z < m.worldZ + m.layout.height; z++) for (let x = m.worldX; x < m.worldX + m.layout.width; x++) {
      const q = z * W + x;
      owner[q] = i; covered[q] = 1;
    }
  });
  const borderIds = m => Array.from({ length: m.layout.borderWidth * m.layout.borderHeight }, (_, k) => u16(rom, m.layout.border + k * 2) & 0x3ff);
  const borderKey = m => { const ids = borderIds(m); return ids.join(',') + (ids.some(id => id >= reader.profile.primaryMetatiles) ? '@' + m.layout.secondary : ''); };
  // Lücken als zusammenhängende Flächen (4er-Nachbarschaft); die zum Weltrand offene ist das Meer
  const hole = new Int32Array(W * H).fill(-1), holes = [];
  for (let start = 0; start < W * H; start++) {
    if (covered[start] || hole[start] >= 0) continue;
    const id = holes.length, contact = new Map(), stack = [start];
    let open = false;
    hole[start] = id;
    while (stack.length) {
      const q = stack.pop(), x = q % W, z = (q - x) / W;
      if (x === 0 || z === 0 || x === W - 1 || z === H - 1) open = true;
      for (const n of [x > 0 ? q - 1 : -1, x < W - 1 ? q + 1 : -1, z > 0 ? q - W : -1, z < H - 1 ? q + W : -1]) {
        if (n < 0) continue;
        if (covered[n]) { const k = borderKey(maps[owner[n]]); const c = contact.get(k) || { n: 0, map: owner[n] }; c.n++; contact.set(k, c); continue; }
        if (hole[n] < 0) { hole[n] = id; stack.push(n); }
      }
    }
    const best = [...contact.values()].sort((a, b) => b.n - a.n)[0];
    holes.push({ open, map: best ? best.map : -1 });
  }
  const sea = maps.findIndex(m => m.name === 'Route105');
  const borderTile = (m, x, z) => {
    const l = m.layout, lx = x - m.worldX, lz = z - m.worldZ;
    const bx = ((lx % l.borderWidth) + l.borderWidth) % l.borderWidth, bz = ((lz % l.borderHeight) + l.borderHeight) % l.borderHeight;
    return metatiles(rom, reader, l, stats)(u16(rom, l.border + (bz * l.borderWidth + bx) * 2) & 0x3ff);
  };
  let filled = 0, inner = 0;
  for (let z = 0; z < H; z++) for (let x = 0; x < W; x++) {
    const q = z * W + x;
    if (covered[q]) continue;
    // Mitte der Kachel zum nächsten Kartenrechteck
    let best = -1, bestD = Infinity;
    maps.forEach((m, i) => {
      const dx = Math.max(m.worldX - (x + 0.5), 0, x + 0.5 - (m.worldX + m.layout.width));
      const dz = Math.max(m.worldZ - (z + 0.5), 0, z + 0.5 - (m.worldZ + m.layout.height));
      const d = dx * dx + dz * dz;
      if (d < bestD) { bestD = d; best = i; }
    });
    const h = holes[hole[q]], near = Math.sqrt(bestD) <= FILL_REACH;
    const from = near ? best : h.open || h.map < 0 ? sea : h.map;
    owner[q] = from;
    const img = borderTile(maps[from], x, z);
    if (img) { world.putTile(x, z, img); if (near) filled++; else inner++; }
  }
  return { filled, inner, owner, covered, holes: holes.length };
}

function renderOverworld() {
  const { rom, reader, groups, gameCode, maps: all } = openRom();
  const maps = all.filter(isOverworld);
  const arranged = arrange(rom, maps);
  fs.mkdirSync(OUT, { recursive: true });
  const world = makeWorld(), stats = { missingTiles: new Set(), missingMetatiles: new Set() };
  const rendered = arranged.components.flatMap(c => c.maps);
  const gap = fillGaps(rom, reader, rendered, arranged.width, arranged.height, world, stats);
  for (const map of rendered) world.paste(renderMap(rom, reader, map, stats), map.worldX, map.worldZ);
  for (const [key, rgba] of world.chunks) {
    const [row, col] = key.split(':').map(Number);
    writePNG(path.join(OUT, `chunk_${row}_${col}.png`), CHUNK, CHUNK, rgba);
  }
  const info = {
    version: 2, source: 'Emerald GBA ROM', gameCode, groupTable: groups.table,
    rows: arranged.height / 32, cols: arranged.width / 32, size: CHUNK, shear: 0, origin: [0, 0],
    chunks: {},
    maps: rendered.map(m => ({ id: `${m.group}.${m.num}`, name: m.name, x: m.worldX, z: m.worldZ, width: m.layout.width, height: m.layout.height })),
    // Regionskarten-Raster → Weltkacheln (für Orte ohne eigene Außenkarte)
    regionFit: { kx: arranged.fit.fx.k, dx: arranged.fit.fx.d - arranged.fit.minX, kz: arranged.fit.fz.k, dz: arranged.fit.fz.d - arranged.fit.minZ },
    components: arranged.components.map(c => c.maps.map(m => m.name)),
    conflicts: arranged.conflicts,
  };
  fs.writeFileSync(path.join(OUT, 'render.json'), JSON.stringify(info));
  console.log(`Oberwelt: ${rendered.length} Karten, ${world.chunks.size} Blöcke, ${arranged.width}×${arranged.height} Kacheln, ${gap.filled} Randkacheln, ${gap.inner} Kacheln Füllung (Meer bzw. Wald) in ${gap.holes} Lücken ergänzt.`);
  console.log(`Fehlende Tiles: ${stats.missingTiles.size} ${[...stats.missingTiles].slice(0, 8).join(' ')}; fehlende Metatiles: ${stats.missingMetatiles.size}; Verbindungskonflikte: ${arranged.conflicts.join('; ') || 0}`);
}

// Innenkarten: je Layout ein Bild, nur die, die emerald.json (maps[…].matrix) braucht
function renderInteriors() {
  const dataFile = path.resolve(opts.data || path.join(__dirname, '..', 'emerald.json'));
  if (!fs.existsSync(dataFile)) { console.log('Keine emerald.json für die Innenkarten gefunden:', dataFile); return; }
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
    if (opts['interiors-only']) renderInteriors();
    else renderOverworld();
  } catch (error) { console.error(error.stack || error); process.exit(1); }
}
