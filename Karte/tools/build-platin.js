/*
 * Baut die Daten für die Platin-Karte (Karte/platin-terrain.png + Karte/platin.json).
 *
 * Quellen:
 *  - pret/pokeplatinum (Quellcode-Nachbau von Pokémon Platin): Kartenkacheln, Item-Bälle, versteckte Items,
 *    Trainer samt Teams, Item-Geschenke, wilde Pokémon – mit echten Koordinaten aus dem Spiel.
 *  - PokeAPI-CSV-Dateien: deutsche Namen für Pokémon, Items, Attacken und Orte.
 *
 * Aufruf (Node 18+):  node build-platin.js <ausgabe-ordner> [cache-ordner]
 * Der Cache-Ordner hält heruntergeladene Dateien, damit ein zweiter Lauf schnell geht.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const OUT = path.resolve(process.argv[2] || '.');
const CACHE = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'platin-karte-cache'));
const RAW = 'https://raw.githubusercontent.com/pret/pokeplatinum/main/';
const CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
fs.mkdirSync(CACHE, { recursive: true });

// ── Laden mit Cache ──────────────────────────────────────────────────────────
async function get(url, { binary = false, optional = false } = {}) {
  const file = path.join(CACHE, url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_'));
  if (fs.existsSync(file)) {
    const buf = fs.readFileSync(file);
    if (buf.length === 0 && optional) return null;
    return binary ? buf : buf.toString('utf8');
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url);
      if (r.status === 404) {
        if (optional) { fs.writeFileSync(file, ''); return null; }
        throw new Error(`404 ${url}`);
      }
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(file, buf);
      return binary ? buf : buf.toString('utf8');
    } catch (e) {
      if (attempt === 4 || String(e.message).startsWith('404')) throw e;
      await new Promise(res => setTimeout(res, 800 * attempt));
    }
  }
}
const getJSON = async (p, opt) => { const t = await get(RAW + p, opt); return t == null ? null : JSON.parse(t); };
async function pool(items, n, fn) {
  const out = new Array(items.length);
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => {
    while (i < items.length) { const k = i++; out[k] = await fn(items[k], k); }
  }));
  return out;
}
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const head = lines.shift().split(',');
  return lines.map(line => {
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { cells.push(cur); cur = ''; } else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(head.map((h, k) => [h, cells[k]]));
  });
}
const norm = s => String(s || '').toLowerCase().replace(/é/g, 'e').replace(/[^a-z0-9]/g, '');

// ── PNG mit Farbpalette schreiben ────────────────────────────────────────────
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function chunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePalettePNG(file, w, h, idx, palette) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 3; ihdr[10] = 0; ihdr[11] = 0; ihdr[12] = 0;
  const plte = Buffer.from(palette.flat());
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; idx.copy ? idx.copy(raw, y * (w + 1) + 1, y * w, y * w + w) : raw.set(idx.subarray(y * w, y * w + w), y * (w + 1) + 1); }
  const png = Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk('IHDR', ihdr), chunk('PLTE', plte), chunk('IDAT', zlib.deflateSync(raw, { level: 9 })), chunk('IEND', Buffer.alloc(0)),
  ]);
  fs.writeFileSync(file, png);
  return png.length;
}

// ── Gelände-Klassen (Index = Farbe in der Palette, gleiche Reihenfolge in app.js) ──
const T = { VOID: 0, SEA: 1, WATER: 2, SHALLOW: 3, WATERFALL: 4, GROUND: 5, GRASS: 6, TREE: 7, BUILDING: 8, SAND: 9,
  SNOW: 10, ICE: 11, ROCKFLOOR: 12, MUD: 13, BRIDGE: 14, DOOR: 15, LEDGE: 16, ROCKCLIMB: 17, ROCK: 18, SNOWROCK: 19, SANDROCK: 20 };
const PALETTE = [
  [17, 31, 64],    // VOID   – offenes Meer außerhalb der Karte
  [38, 84, 158],   // SEA
  [52, 112, 190],  // WATER  – Fluss/See
  [96, 152, 212],  // SHALLOW
  [150, 205, 240], // WATERFALL
  [176, 199, 128], // GROUND
  [93, 156, 74],   // GRASS  – hohes Gras
  [44, 88, 52],    // TREE   – Hindernis (Bäume, Felsen, Zäune)
  [138, 142, 170], // BUILDING
  [228, 208, 150], // SAND
  [238, 243, 248], // SNOW
  [190, 230, 242], // ICE
  [164, 142, 110], // ROCKFLOOR – Berg-/Höhlenboden
  [125, 90, 60],   // MUD
  [185, 134, 78],  // BRIDGE
  [232, 166, 88],  // DOOR
  [150, 170, 104], // LEDGE
  [122, 112, 104], // ROCKCLIMB
  [94, 82, 72],    // ROCK   – Hindernis im Gebirge
  [112, 126, 146], // SNOWROCK
  [150, 118, 76],  // SANDROCK
];

function classify(v) {
  const b = v & 0xff, blocked = (v & 0x8000) !== 0;
  if (b === 0x15) return T.SEA;
  if (b === 0x10) return T.WATER;
  if (b === 0x13) return T.WATERFALL;
  if (b === 0x16 || b === 0x17 || b === 0x1d) return T.SHALLOW;
  if (b >= 0x70 && b <= 0x7d) return T.BRIDGE;
  if ([0x5e, 0x5f, 0x62, 0x63, 0x64, 0x65, 0x67, 0x69, 0x6c, 0x6d, 0x6e, 0x6f].includes(b)) return T.DOOR;
  if (blocked) return T.TREE;
  if (b === 0x02 || b === 0x03 || b === 0xa6 || b === 0xa7) return T.GRASS;
  if (b === 0x21) return T.SAND;
  if ([0xa1, 0xa2, 0xa3, 0xa8, 0xa9].includes(b)) return T.SNOW;
  if (b === 0x20) return T.ICE;
  if (b === 0xa4 || b === 0xa5 || b === 0xa0) return T.MUD;
  if (b === 0x08 || b === 0x0b || b === 0x0c) return T.ROCKFLOOR;
  if ((b >= 0x38 && b <= 0x3b) || (b >= 0x5a && b <= 0x5d)) return T.LEDGE;
  if (b === 0x4b || b === 0x4c) return T.ROCKCLIMB;
  return T.GROUND;
}

// ── Kleine Helfer für Namen ──────────────────────────────────────────────────
const AREA_DE = { house: 'Haus', pokecenter: 'Pokémon-Center', mart: 'Pokémon-Markt', gym: 'Arena', gate: 'Tor', north: 'Nord',
  south: 'Süd', east: 'Ost', west: 'West', northeast: 'Nordost', northwest: 'Nordwest', southeast: 'Südost', southwest: 'Südwest',
  room: 'Raum', outside: 'außen', inside: 'innen', building: 'Gebäude', lobby: 'Lobby', hall: 'Halle', tower: 'Turm',
  elevator: 'Aufzug', entrance: 'Eingang', middle: 'Mitte', back: 'hinten', front: 'vorne', left: 'links', right: 'rechts',
  library: 'Bibliothek', store: 'Kaufhaus', museum: 'Museum', school: 'Schule', cafe: 'Café', restaurant: 'Restaurant',
  lighthouse: 'Leuchtturm', market: 'Markt', shop: 'Laden', cave: 'Höhle', forest: 'Wald', lakefront: 'Seeufer', pillar: 'Säule' };
function prettyArea(rest) {
  return rest.split('_').filter(Boolean).map(w => {
    const l = w.toLowerCase();
    if (/^b?\d+f$/.test(l)) return l.toUpperCase();
    if (/^\d+$/.test(l)) return l;
    return AREA_DE[l] || (l[0].toUpperCase() + l.slice(1));
  }).join(' ');
}

(async () => {
  console.log('Lade Kopfdaten …');
  // Map-Header: welche Karte gehört zu welchem Ort, welche Events, Skripte, wilden Pokémon
  const headersSrc = await get(RAW + 'include/data/map_headers.h');
  const headers = {};
  for (const m of headersSrc.matchAll(/\[(MAP_HEADER_\w+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g)) {
    const fields = {};
    for (const f of m[2].matchAll(/\.(\w+)\s*=\s*([^,\n]+),/g)) fields[f[1]] = f[2].trim();
    headers[m[1]] = fields;
  }
  console.log(`  ${Object.keys(headers).length} Map-Header`);

  const locText = await getJSON('res/text/location_names.json');
  const LOC_EN = Object.fromEntries(locText.messages.map(m => [m.id, Array.isArray(m.en_US) ? m.en_US.join('') : m.en_US]));

  // ── Deutsche Namen aus der PokeAPI ─────────────────────────────────────────
  console.log('Lade PokeAPI-Namen …');
  const [speciesCsv, speciesNamesCsv, itemsCsv, itemNamesCsv, movesCsv, moveNamesCsv, machinesCsv, locationsCsv, locNamesCsv] = await Promise.all(
    ['pokemon_species', 'pokemon_species_names', 'items', 'item_names', 'moves', 'move_names', 'machines', 'locations', 'location_names']
      .map(n => get(`${CSV}${n}.csv`).then(parseCSV)));
  const DE = '6', EN = '9';
  const speciesByNorm = new Map(speciesCsv.map(r => [norm(r.identifier), +r.id]));
  const speciesDe = new Map(speciesNamesCsv.filter(r => r.local_language_id === DE).map(r => [+r.pokemon_species_id, r.name]));
  const speciesEn = new Map(speciesNamesCsv.filter(r => r.local_language_id === EN).map(r => [+r.pokemon_species_id, r.name]));
  const itemByNorm = new Map(itemsCsv.map(r => [norm(r.identifier), r]));
  const itemDe = new Map(itemNamesCsv.filter(r => r.local_language_id === DE).map(r => [r.item_id, r.name]));
  const itemEn = new Map(itemNamesCsv.filter(r => r.local_language_id === EN).map(r => [r.item_id, r.name]));
  const moveDe = new Map(moveNamesCsv.filter(r => r.local_language_id === DE).map(r => [r.move_id, r.name]));
  const moveEn = new Map(moveNamesCsv.filter(r => r.local_language_id === EN).map(r => [r.move_id, r.name]));
  const tmMove = new Map(machinesCsv.filter(r => r.version_group_id === '9').map(r => [r.item_id, r.move_id]));
  const typesCsv = parseCSV(await get(`${CSV}types.csv`));
  const typeName = new Map(typesCsv.map(r => [r.id, r.identifier]));
  const moveType = new Map(movesCsv.map(r => [r.id, typeName.get(r.type_id)]));
  const sinnohLocs = new Set(locationsCsv.filter(r => r.region_id === '4').map(r => r.id));
  const locDeByEn = new Map();
  const locEnRows = locNamesCsv.filter(r => r.local_language_id === EN && sinnohLocs.has(r.location_id));
  const locDeRows = new Map(locNamesCsv.filter(r => r.local_language_id === DE).map(r => [r.location_id, r.name]));
  for (const r of locEnRows) if (locDeRows.has(r.location_id)) locDeByEn.set(norm(r.name), locDeRows.get(r.location_id));

  const ITEM_ALIAS = { parlyzheal: 'paralyzeheal', xspdef: 'xspdef', xspecial: 'xspatk', thunderstone: 'thunderstone' };
  const missingItems = new Set();
  function itemInfo(constName) {
    const raw = norm(constName.replace(/^ITEM_/, ''));
    const row = itemByNorm.get(ITEM_ALIAS[raw] || raw);
    if (!row) { missingItems.add(constName); const en = constName.replace(/^ITEM_/, '').split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' '); return { id: raw, de: en, en }; }
    const out = { id: row.identifier, de: itemDe.get(row.id) || itemEn.get(row.id) || row.identifier, en: itemEn.get(row.id) || row.identifier };
    const mv = tmMove.get(row.id);
    if (mv) out.move = { de: moveDe.get(mv) || moveEn.get(mv), en: moveEn.get(mv), type: moveType.get(mv) };
    if (/^(tm|hm)\d+$/.test(row.identifier)) out.tm = true;
    return out;
  }
  const missingSpecies = new Set();
  function speciesInfo(constName) {
    const raw = norm(constName.replace(/^SPECIES_/, ''));
    const id = speciesByNorm.get(raw);
    if (!id) { missingSpecies.add(constName); const n = constName.replace(/^SPECIES_/, ''); return { id: 0, de: n, en: n }; }
    return { id, de: speciesDe.get(id) || constName, en: speciesEn.get(id) || constName };
  }

  // ── Gelände: Matrix 000 = Oberwelt von Sinnoh (30 × 30 Blöcke à 32 × 32 Kacheln) ──
  console.log('Lade Oberwelt-Kacheln …');
  const matrix = await getJSON('res/field/matrices/map_matrix_000.json');
  const ROWS = matrix.maps.length, COLS = matrix.maps[0].length, CH = 32;
  const W = COLS * CH, H = ROWS * CH;
  const terrain = new Uint8Array(W * H).fill(T.VOID);
  const mapIds = [...new Set(matrix.maps.flat().filter(m => m !== 'MAP_NONE'))];
  const bins = new Map();
  await pool(mapIds, 8, async id => {
    const n = String(parseInt(id.replace('MAP_', ''), 10)).padStart(3, '0');
    bins.set(id, await get(`${RAW}res/field/maps/data/map_data_${n}.bin`, { binary: true }));
  });
  // Blöcke ohne Kartendaten: zum Rand hin offenes Meer, ringsum von Land umschlossen = Gebirge (z. B. Kraterberg)
  const openSea = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const stackSea = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if ((r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1) && matrix.maps[r][c] === 'MAP_NONE') { openSea[r][c] = true; stackSea.push([r, c]); }
  }
  while (stackSea.length) {
    const [r, c] = stackSea.pop();
    for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || openSea[nr][nc] || matrix.maps[nr][nc] !== 'MAP_NONE') continue;
      openSea[nr][nc] = true; stackSea.push([nr, nc]);
    }
  }
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const id = matrix.maps[r][c];
    if (id === 'MAP_NONE') {
      // Umschlossene Lücke: wie ein Hindernis behandeln, die Art kommt unten vom nächsten Boden
      if (!openSea[r][c]) for (let ty = 0; ty < CH; ty++) terrain.fill(T.TREE, (r * CH + ty) * W + c * CH, (r * CH + ty) * W + c * CH + CH);
      continue;
    }
    const b = bins.get(id);
    for (let ty = 0; ty < CH; ty++) for (let tx = 0; tx < CH; tx++) {
      const v = b.readUInt16LE(16 + (ty * CH + tx) * 2);
      terrain[(r * CH + ty) * W + c * CH + tx] = classify(v);
    }
  }
  // Gebäude: Hindernisse direkt über Türen, solange die zusammenhängende Fläche klein bleibt (sonst ist es Wald/Berg)
  const seen = new Uint8Array(W * H);
  for (let i = 0; i < W * H; i++) {
    if (terrain[i] !== T.DOOR) continue;
    const start = i - W;
    if (start < 0 || terrain[start] !== T.TREE || seen[start]) continue;
    const comp = [], stack = [start]; seen[start] = 1;
    while (stack.length && comp.length <= 420) {
      const k = stack.pop(); comp.push(k);
      const x = k % W;
      for (const nb of [k - W, k + W, x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1]) {
        if (nb >= 0 && nb < W * H && !seen[nb] && terrain[nb] === T.TREE) { seen[nb] = 1; stack.push(nb); }
      }
    }
    if (comp.length <= 420) for (const k of comp) terrain[k] = T.BUILDING;
  }
  // Unbegehbare Flächen sind im Spiel nur „blockiert" – ob dort Meer, Wald oder Fels ist, steht nicht in den Daten.
  // Daher bekommt jede blockierte Kachel die Art des nächstgelegenen begehbaren Bodens (Breitensuche von allen
  // Nicht-Hindernissen aus): an der Küste Meer, neben Wegen Wald, im Gebirge Fels, im Schnee verschneiter Fels.
  // Drei Entfernungen je Kachel: zum nächsten Land, zum nächsten Meer-Feld einer Route und zum offenen Meer.
  // Meer zählt 2,5-fach, damit kleine Wasserflächen nicht ganze Wälder fluten.
  const LAND_CLASS = {
    [T.SNOW]: T.SNOWROCK, [T.ICE]: T.SNOWROCK, [T.SAND]: T.SANDROCK, [T.ROCKFLOOR]: T.ROCK, [T.ROCKCLIMB]: T.ROCK, [T.WATERFALL]: T.ROCK,
  };
  function bfs(isSource, carry) {
    const dist = new Int32Array(W * H).fill(-1);
    const cls = carry ? new Int8Array(W * H) : null;
    const queue = new Int32Array(W * H);
    let qh = 0, qt = 0;
    for (let i = 0; i < W * H; i++) if (isSource(terrain[i])) { dist[i] = 0; if (cls) cls[i] = LAND_CLASS[terrain[i]] ?? T.TREE; queue[qt++] = i; }
    while (qh < qt) {
      const k = queue[qh++], x = k % W;
      for (const nb of [k - W, k + W, x > 0 ? k - 1 : -1, x < W - 1 ? k + 1 : -1]) {
        if (nb < 0 || nb >= W * H || dist[nb] !== -1) continue;
        dist[nb] = dist[k] + 1;
        if (cls) cls[nb] = cls[k];
        queue[qt++] = nb;
      }
    }
    return { dist, cls };
  }
  const land = bfs(t => t !== T.TREE && t !== T.VOID && t !== T.SEA, true);
  const sea = bfs(t => t === T.SEA, false);
  const open = bfs(t => t === T.VOID, false);
  const far = d => (d < 0 ? 1e9 : d);
  for (let i = 0; i < W * H; i++) {
    if (terrain[i] !== T.TREE) continue;
    const dl = far(land.dist[i]), ds = far(sea.dist[i]) * 2.5, dv = far(open.dist[i]);
    terrain[i] = dl <= ds && dl <= dv ? land.cls[i] : ds <= dv ? T.SEA : T.VOID;
  }
  fs.mkdirSync(OUT, { recursive: true });
  const pngSize = writePalettePNG(path.join(OUT, 'platin-terrain.png'), W, H, terrain, PALETTE);
  console.log(`  Gelände ${W}×${H} → platin-terrain.png (${Math.round(pngSize / 1024)} KB)`);

  // ── Orte ──────────────────────────────────────────────────────────────────
  const locations = [];
  const locIndex = new Map();
  function locFor(labelId) {
    if (!labelId) return -1;
    if (locIndex.has(labelId)) return locIndex.get(labelId);
    const en = LOC_EN[labelId] || labelId.replace('LocationNames_Text_', '');
    const de = locDeByEn.get(norm(en)) || en;
    const type = /Town$/.test(en) ? 'town' : /City$/.test(en) || /League|Area$/.test(en) ? 'city' : /^Route/.test(en) ? 'route' : 'place';
    const loc = { en, de, type, chunks: 0, label: null, items: [], trainers: [], wild: [], entrances: [], areas: [] };
    locations.push(loc);
    locIndex.set(labelId, locations.length - 1);
    return locations.length - 1;
  }
  const chunkLoc = matrix.headers.map(row => row.map(h => (h && h !== 'MAP_HEADER_EVERYWHERE' && headers[h] ? locFor(headers[h].mapLabelTextID) : -1)));
  // Beschriftung: Mitte aller Blöcke eines Ortes (in Kacheln)
  const sums = new Map();
  chunkLoc.forEach((row, r) => row.forEach((li, c) => {
    if (li < 0) return;
    const s = sums.get(li) || { x: 0, z: 0, n: 0 };
    s.x += c * CH + CH / 2; s.z += r * CH + CH / 2; s.n++;
    sums.set(li, s);
  }));
  for (const [li, s] of sums) { locations[li].chunks = s.n; locations[li].label = [Math.round(s.x / s.n), Math.round(s.z / s.n)]; }

  // ── Item-Tabellen ────────────────────────────────────────────────────────
  console.log('Lade Items und Skripte …');
  const visSrc = await get(RAW + 'res/field/scripts/scripts_visible_items.s');
  const visEntries = [...visSrc.matchAll(/ScriptEntry\s+(\w+)/g)].map(m => m[1]);
  const visBody = {};
  const visParts = visSrc.split(/^(\w+):\s*$/m);
  for (let i = 1; i < visParts.length; i += 2) visBody[visParts[i]] = visParts[i + 1] || '';
  const visibleItems = visEntries.map(label => {
    const body = visBody[label] || '';
    const item = body.match(/VAR_0x8008,\s*(ITEM_\w+)/)?.[1];
    const qty = +(body.match(/VAR_0x8009,\s*(\d+)/)?.[1] || 1);
    return item ? { item, qty } : null;
  });
  const hiddenSrc = await get(RAW + 'include/data/field/hidden_items.h');
  const hiddenItems = [...hiddenSrc.matchAll(/HIDDEN_ITEM_ENTRY\((ITEM_\w+),\s*(\d+),\s*(\d+),/g)].map(m => ({ item: m[1], qty: +m[2] }));
  console.log(`  ${visibleItems.length} Item-Bälle, ${hiddenItems.length} versteckte Items`);

  // ── Map-Skripte: Item-Geschenke und Kämpfe je Skript-Eintrag ──────────────
  const scriptCache = new Map();
  async function parseScripts(archive) {
    if (!archive || scriptCache.has(archive)) return scriptCache.get(archive);
    const src = await get(`${RAW}res/field/scripts/${archive}.s`, { optional: true });
    const result = { entries: [], labels: {} };
    if (src) {
      result.entries = [...src.matchAll(/ScriptEntry\s+(\w+)/g)].map(m => m[1]);
      const parts = src.split(/^(\w+):\s*$/m);
      for (let i = 1; i < parts.length; i += 2) {
        const body = parts[i + 1] || '';
        const gifts = [];
        if (/GiveItem|Common_ObtainItem|AddItem/.test(body)) {
          for (const g of body.matchAll(/SetVar\s+VAR_0x8004,\s*(ITEM_\w+)(?:[\s\S]{0,80}?SetVar\s+VAR_0x8005,\s*(\d+))?/g)) gifts.push({ item: g[1], qty: +(g[2] || 1) });
        }
        const battles = [...body.matchAll(/^\s*\w*Battle\w*\s+([^\n]*)$/gm)].flatMap(l => [...l[1].matchAll(/TRAINER_[A-Z0-9_]+/g)].map(t => t[0]));
        const refs = [...body.matchAll(/^\s*(?:GoTo|Call)\w*\s+([^\n]*)$/gm)].flatMap(l => l[1].split(/\s*,\s*/).map(s => s.trim()));
        result.labels[parts[i]] = { gifts, battles, refs };
      }
    }
    scriptCache.set(archive, result);
    return result;
  }
  // Alles, was ein Skript-Eintrag direkt oder über Sprünge erreicht
  function collect(scripts, label, acc = { gifts: [], battles: [] }, seenL = new Set()) {
    if (!label || seenL.has(label) || !scripts.labels[label]) return acc;
    seenL.add(label);
    const l = scripts.labels[label];
    acc.gifts.push(...l.gifts); acc.battles.push(...l.battles);
    for (const r of l.refs) collect(scripts, r, acc, seenL);
    return acc;
  }

  // ── Trainer ──────────────────────────────────────────────────────────────
  const trainerCache = new Map();
  const missingTrainers = new Set();
  async function trainer(constName) {
    if (trainerCache.has(constName)) return trainerCache.get(constName);
    const file = constName.replace(/^TRAINER_/, '').toLowerCase();
    const d = await getJSON(`res/trainers/data/${file}.json`, { optional: true });
    let out = null;
    if (d) {
      out = {
        id: constName,
        cls: d.class.replace(/^TRAINER_CLASS_/, ''),
        name: d.name,
        double: !!d.double_battle,
        party: d.party.map(p => {
          const s = speciesInfo(p.species);
          const mon = { id: s.id, de: s.de, en: s.en, lv: p.level };
          if (p.item) { const it = itemInfo(p.item); mon.item = { de: it.de, en: it.en }; }
          return mon;
        }),
      };
    } else missingTrainers.add(constName);
    trainerCache.set(constName, out);
    return out;
  }

  // ── Wilde Pokémon ─────────────────────────────────────────────────────────
  const LAND = [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1];
  const WATER = [60, 30, 5, 4, 1];
  const RODS = [40, 40, 15, 4, 1];
  function table(slots, rates, levels) {
    const map = new Map();
    slots.forEach((s, i) => {
      if (!s || !s.species || s.species === 'SPECIES_NONE') return;
      const sp = speciesInfo(s.species);
      const cur = map.get(sp.id) || { id: sp.id, de: sp.de, en: sp.en, p: 0, min: 99, max: 0 };
      cur.p += rates[i];
      const lo = s.level_min ?? s.level ?? 0, hi = s.level_max ?? s.level ?? 0;
      cur.min = Math.min(cur.min, lo); cur.max = Math.max(cur.max, hi);
      map.set(sp.id, cur);
    });
    return [...map.values()].sort((a, b) => b.p - a.p);
  }
  async function wild(archive) {
    if (!archive || /dummy/i.test(archive)) return null;
    const e = await getJSON(`res/field/encounters/${archive}.json`, { optional: true });
    if (!e) return null;
    const out = {};
    const land = e.land_encounters || [];
    if (e.land_rate && land.length) {
      // Morgens = Grundtabelle; tagsüber/nachts ersetzen die Plätze 3 und 4 (je 10 %)
      const withTime = list => land.map((s, i) => (i === 2 || i === 3) && list?.[i - 2] && list[i - 2] !== 'SPECIES_NONE' ? { ...s, species: list[i - 2] } : s);
      out.morning = table(land, LAND);
      out.day = table(withTime(e.day), LAND);
      out.night = table(withTime(e.night), LAND);
    }
    if (e.surf_rate && e.surf_encounters?.length) out.surf = table(e.surf_encounters, WATER);
    if (e.old_rod_rate && e.old_rod_encounters?.length) out.oldRod = table(e.old_rod_encounters, WATER);
    if (e.good_rod_rate && e.good_rod_encounters?.length) out.goodRod = table(e.good_rod_encounters, RODS);
    if (e.super_rod_rate && e.super_rod_encounters?.length) out.superRod = table(e.super_rod_encounters, RODS);
    const names = list => [...new Set((list || []).filter(s => s && s !== 'SPECIES_NONE').map(s => speciesInfo(s)))].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i).map(s => ({ id: s.id, de: s.de, en: s.en }));
    if (e.swarms?.length) out.swarm = names(e.swarms);
    if (e.radar?.length) out.radar = names(e.radar);
    const gba = [...(e.ruby || []), ...(e.sapphire || []), ...(e.emerald || []), ...(e.firered || []), ...(e.leafgreen || [])];
    if (gba.length) out.dualSlot = names(gba);
    return Object.keys(out).length ? out : null;
  }

  // ── Alle Map-Header durchgehen ────────────────────────────────────────────
  console.log('Werte Karten aus …');
  const markers = [];
  const OVERWORLD = 'map_matrix_000';
  const headerNames = Object.keys(headers);
  const eventsCache = new Map();
  const doneEvents = new Set();
  let scriptLinkSamples = 0;
  const warpSources = new Map(); // Ziel-Ort → Orte, von denen ein Warp dorthin führt
  for (const hn of headerNames) {
    const h = headers[hn];
    // Nicht verwendete Karten aus der Entwicklung des Spiels weglassen
    if (/UNUSED|UNK_|UNKNOWN_|EVERYWHERE|NOTHING/.test(hn) || /MysteryZone/.test(h.mapLabelTextID || '')) continue;
    const li = locFor(h.mapLabelTextID);
    if (li < 0) continue;
    const loc = locations[li];
    const overworld = h.mapMatrixID === OVERWORLD;
    // Bereichsname aus dem Header, z. B. MAP_HEADER_MT_CORONET_1F_SOUTH → „1F Süd"
    const locWords = norm(loc.en);
    const rawName = hn.replace(/^MAP_HEADER_/, '');
    let rest = rawName;
    const parts = rawName.split('_');
    for (let k = parts.length; k > 0; k--) { if (norm(parts.slice(0, k).join('')) === locWords) { rest = parts.slice(k).join('_'); break; } }
    if (rest === rawName && !overworld) rest = rawName; // eigener Name
    const area = overworld ? '' : prettyArea(rest === rawName ? rest : rest);

    // Events (jede Datei nur einmal)
    const evKey = h.eventsArchiveID;
    if (!evKey || doneEvents.has(evKey)) continue;
    doneEvents.add(evKey);
    const ev = eventsCache.get(evKey) || await getJSON(`res/field/events/${evKey}.json`, { optional: true });
    if (!ev) continue;
    if (area && !loc.areas.includes(area)) loc.areas.push(area);
    const scripts = await parseScripts(h.scriptsArchiveID);
    const pos = (x, z) => (overworld ? [x, z] : null);
    const linkedLabels = new Set();

    for (const o of ev.object_events || []) {
      // Trainer
      if (typeof o.script === 'string' && o.script.startsWith('TRAINER_')) {
        const t = await trainer(o.script);
        if (t) {
          const idx = loc.trainers.push({ ...t, area, pos: pos(o.x, o.z) }) - 1;
          if (overworld) markers.push({ k: 'trainer', x: o.x, z: o.z, l: li, i: idx });
        }
        continue;
      }
      // Item-Ball
      if (o.graphics_id === 'OBJ_EVENT_GFX_POKEBALL' && +o.script >= 7000 && +o.script < 8000) {
        const v = visibleItems[+o.script - 7000];
        if (v) {
          const info = itemInfo(v.item);
          const idx = loc.items.push({ kind: 'ball', ...info, qty: v.qty, area, pos: pos(o.x, o.z) }) - 1;
          if (overworld) markers.push({ k: info.tm ? 'tm' : 'item', x: o.x, z: o.z, l: li, i: idx });
        }
        continue;
      }
      // NPC mit Skript: Geschenke und Kämpfe (z. B. Arenaleiter)
      const n = +o.script;
      if (Number.isInteger(n) && n >= 1 && n <= scripts.entries.length) {
        const label = scripts.entries[n - 1];
        linkedLabels.add(label);
        const found = collect(scripts, label);
        if (scriptLinkSamples < 3 && found.gifts.length) { console.log(`  Beispiel: ${hn} Objekt ${o.graphics_id} → ${label} → ${found.gifts.map(g => g.item).join(', ')}`); scriptLinkSamples++; }
        for (const g of found.gifts) {
          const info = itemInfo(g.item);
          if (loc.items.some(x => x.kind === 'gift' && x.id === info.id && x.area === area)) continue;
          const idx = loc.items.push({ kind: 'gift', ...info, qty: g.qty, area, pos: pos(o.x, o.z) }) - 1;
          if (overworld) markers.push({ k: info.tm ? 'tm' : 'gift', x: o.x, z: o.z, l: li, i: idx });
        }
        for (const tid of [...new Set(found.battles)]) {
          if (loc.trainers.some(t => t.id === tid)) continue;
          const t = await trainer(tid);
          if (!t) continue;
          const idx = loc.trainers.push({ ...t, area, pos: pos(o.x, o.z) }) - 1;
          if (overworld) markers.push({ k: 'trainer', x: o.x, z: o.z, l: li, i: idx });
        }
      }
    }
    // Versteckte Items
    for (const b of ev.bg_events || []) {
      if (b.type !== 2 || b.script < 8000) continue;
      const hi = hiddenItems[b.script - 8000];
      if (!hi) continue;
      const info = itemInfo(hi.item);
      const idx = loc.items.push({ kind: 'hidden', ...info, qty: hi.qty, area, pos: pos(b.x, b.z) }) - 1;
      if (overworld) markers.push({ k: 'hidden', x: b.x, z: b.z, l: li, i: idx });
    }
    // Geschenke aus Skripten ohne Objekt (z. B. beim Betreten)
    for (const label of scripts.entries) {
      if (linkedLabels.has(label)) continue;
      const found = collect(scripts, label);
      for (const g of found.gifts) {
        const info = itemInfo(g.item);
        if (loc.items.some(x => x.kind === 'gift' && x.id === info.id && x.area === area)) continue;
        loc.items.push({ kind: 'gift', ...info, qty: g.qty, area, pos: null });
      }
      for (const tid of [...new Set(found.battles)]) {
        if (loc.trainers.some(t => t.id === tid)) continue;
        const t = await trainer(tid);
        if (t) loc.trainers.push({ ...t, area, pos: null });
      }
    }
    // Welche Orte sind von hier aus erreichbar? (für Orte ohne eigenen Kartenzugang)
    for (const w of ev.warp_events || []) {
      const dest = headers[w.dest_header_id];
      if (!dest || /UNUSED/.test(w.dest_header_id)) continue;
      const dli = locFor(dest.mapLabelTextID);
      if (dli < 0 || dli === li) continue;
      if (!warpSources.has(dli)) warpSources.set(dli, new Set());
      warpSources.get(dli).add(li);
    }
    // Eingänge in andere Orte (Höhlen, Wälder …)
    if (overworld) {
      for (const w of ev.warp_events || []) {
        const dest = headers[w.dest_header_id];
        if (!dest) continue;
        const dli = locFor(dest.mapLabelTextID);
        if (dli < 0 || dli === li) continue;
        const d = locations[dli];
        if (d.entrances.some(([x, z]) => Math.abs(x - w.x) + Math.abs(z - w.z) < 4)) continue;
        d.entrances.push([w.x, w.z]);
        markers.push({ k: 'entrance', x: w.x, z: w.z, l: dli, from: li });
      }
    }
    // Wilde Pokémon
    const w = await wild(h.wildEncountersArchiveID);
    if (w) loc.wild.push({ area, ...w });
  }

  // Orte ohne Kartenzugang: über welchen Ort mit Position erreicht man sie? (Suche über bis zu 3 Warps)
  const hasPos = l => l.chunks > 0 || l.entrances.length > 0;
  locations.forEach((l, li) => {
    if (hasPos(l)) return;
    let frontier = [li];
    const visited = new Set(frontier);
    for (let depth = 0; depth < 3 && l.via == null; depth++) {
      const next = [];
      for (const cur of frontier) for (const src of warpSources.get(cur) || []) {
        if (visited.has(src)) continue;
        visited.add(src);
        if (hasPos(locations[src])) { l.via = src; break; }
        next.push(src);
      }
      frontier = next;
    }
  });

  // Leere Orte (z. B. Mystery Zone) entfernen und Indizes neu vergeben
  const keep = locations.map((l, i) => (l.chunks || l.items.length || l.trainers.length || l.wild.length || l.entrances.length ? i : -1)).filter(i => i >= 0);
  const remap = new Map(keep.map((old, i) => [old, i]));
  const finalLocs = keep.map(i => locations[i]);
  const finalMarkers = markers.filter(m => remap.has(m.l)).map(m => ({ ...m, l: remap.get(m.l), ...(m.from != null ? { from: remap.get(m.from) ?? -1 } : {}) }));
  const finalChunks = chunkLoc.map(row => row.map(li => (remap.has(li) ? remap.get(li) : -1)));
  for (const l of finalLocs) {
    l.areas.sort();
    if (!l.entrances.length) delete l.entrances;
    if (l.via != null) { if (remap.has(l.via)) l.via = remap.get(l.via); else delete l.via; }
  }

  const data = { version: 1, source: 'pret/pokeplatinum + PokeAPI', width: W, height: H, chunk: CH, chunks: finalChunks, locations: finalLocs, markers: finalMarkers };
  const json = JSON.stringify(data);
  fs.writeFileSync(path.join(OUT, 'platin.json'), json);
  const count = k => finalMarkers.filter(m => m.k === k).length;
  console.log(`Fertig: ${finalLocs.length} Orte, ${finalLocs.reduce((s, l) => s + l.items.length, 0)} Items, ${finalLocs.reduce((s, l) => s + l.trainers.length, 0)} Trainer`);
  console.log(`  Marker auf der Oberwelt: Items ${count('item')}, TMs ${count('tm')}, versteckt ${count('hidden')}, Geschenke ${count('gift')}, Trainer ${count('trainer')}, Eingänge ${count('entrance')}`);
  console.log(`  platin.json ${Math.round(json.length / 1024)} KB`);
  if (missingItems.size) console.log('  Items ohne PokeAPI-Treffer:', [...missingItems].join(', '));
  if (missingSpecies.size) console.log('  Pokémon ohne Treffer:', [...missingSpecies].join(', '));
  if (missingTrainers.size) console.log(`  Trainer ohne Datei (${missingTrainers.size}):`, [...missingTrainers].slice(0, 20).join(', '));
  const classes = [...new Set(finalLocs.flatMap(l => l.trainers.map(t => t.cls)))].sort();
  console.log('  Trainerklassen:', classes.join(', '));
})().catch(e => { console.error(e); process.exit(1); });
