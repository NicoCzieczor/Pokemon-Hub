/*
 * Rendert die Oberwelt von Pokémon HeartGold / SoulSilver (Johto + Kanto) aus einem lokalen
 * pret/pokeheartgold-Checkout. Parser und Rasterizer kommen aus render-platin.js; HG/SS-spezifisch sind
 * die NARC-Archive, das Format der Landdaten und die Gebietsdaten.
 *
 * Gebietsdaten (a/0/4/2, je 8 Byte): u16 Gebäudesatz, u16 Kartentexturen (a/0/4/4), u16 Animation,
 * u8 draußen (1) / drinnen (0), u8 Lichtsatz. Der Gebäudesatz wählt die Gebäudetexturen (a/0/7/0) – ohne sie
 * bleiben fast alle Häuser unsichtbar. Gebäude kommen draußen aus a/0/4/0 (bm_field), drinnen aus a/1/4/8
 * (bm_room); manche zeichnet das Spiel nur mit ausgewählten Material/Shape-Paaren (bm_*_matshp.dat).
 * Licht: data/arealight.narc (Tageslicht um 13 Uhr wie bei Platin).
 *
 * Die Weltmatrix enthält neben den echten Blöcken drei flache Kulissen (Wald, Meer, Fels). Wie bei Platin werden
 * sie ohne Matrix-Höhe gezeichnet und liegen als Hintergrund unter jedem Block; offenes Meer zeichnet die Karte
 * im Browser als Muster (sea.png). Echte Blöcke liegen alle auf Höhe 0 – Marker brauchen nur die Bodenhöhen
 * innerhalb des Blocks (BDHC), die render.json je Kachel mitliefert.
 *
 * Aufruf: node render-hgss.js <pokeheartgold> <ausgabe> [--only=Zeile:Spalte,…] [--interiors-only] [--no-interiors] [--data=hgss.json]
 *        (Innenkarten brauchen die maps aus hgss.json – also erst build-hgss.js, dann die Innenkarten rendern)
 * Danach: python make-tiles.py <ausgabe> ../tiles-hgss
 */
'use strict';
const fs = require('fs');
const path = require('path');
const {
  TILE, CH, SIZE, SHEAR, IDENT, STATS,
  writePNG, nitroBlocks, parseTex0, decodeTexture, parseBMD, runSbc, emitShape,
  Canvas, drawTri, edgeMarking, fillHoles, parseBdhc,
} = require('./render-platin.js');

const argv = process.argv.slice(2);
const positional = argv.filter(a => !a.startsWith('--'));
const opts = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => {
  const [key, value] = a.slice(2).split('=');
  return [key, value == null ? '1' : value];
}));
const SOURCE = path.resolve(positional[0] || '.tmp-pokeheartgold-source');
const OUT = path.resolve(positional[1] || 'render-hgss');
if (require.main === module) fs.mkdirSync(OUT, { recursive: true });

const read = rel => fs.readFileSync(path.join(SOURCE, rel));
const readText = rel => fs.readFileSync(path.join(SOURCE, rel), 'utf8');

function narcMembers(buf) {
  if (buf.length < 28 || buf.toString('latin1', 0, 4) !== 'NARC') throw new Error('Ungültiges NARC');
  let off = 16;
  const fatSize = buf.readUInt32LE(off + 4), count = buf.readUInt16LE(off + 8), ranges = [];
  if (fatSize < 12 || count > (fatSize - 12) / 8) throw new Error('Ungültiges NARC-Verzeichnis');
  for (let i = 0; i < count; i++) ranges.push([buf.readUInt32LE(off + 12 + i * 8), buf.readUInt32LE(off + 16 + i * 8)]);
  off += fatSize;
  off += buf.readUInt32LE(off + 4); // BTNF
  const data = off + 8;             // GMIF-Kopf
  return ranges.map(([start, end]) => buf.subarray(data + start, data + end));
}

function parseMatrix(buf) {
  let p = 0;
  const width = buf[p++], height = buf[p++], hasHeaders = buf[p++], hasAltitudes = buf[p++], nameLength = buf[p++];
  const name = buf.toString('ascii', p, p + nameLength); p += nameLength;
  const count = width * height;
  const flatHeaders = new Array(count).fill(-1);
  if (hasHeaders) { for (let i = 0; i < count; i++) flatHeaders[i] = buf.readUInt16LE(p + i * 2); p += count * 2; }
  const flatAltitudes = new Array(count).fill(0);
  if (hasAltitudes) { for (let i = 0; i < count; i++) flatAltitudes[i] = buf[p + i]; p += count; }
  const flatModels = Array.from({ length: count }, (_, i) => buf.readUInt16LE(p + i * 2));
  const rows = a => Array.from({ length: height }, (_, r) => a.slice(r * width, (r + 1) * width));
  return { width, height, name, hasHeaders: !!hasHeaders, headers: rows(flatHeaders), altitudes: rows(flatAltitudes), models: rows(flatModels) };
}

function parseHeaders() {
  const ids = new Map();
  for (const m of readText('include/constants/maps.h').matchAll(/^#define\s+(MAP_\w+)\s+(\d+)/gm)) ids.set(m[1], +m[2]);
  const byId = new Map();
  for (const m of readText('src/data/map_headers.h').matchAll(/\[(MAP_\w+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g)) {
    const id = ids.get(m[1]);
    if (id == null) continue;
    const fields = {};
    for (const f of m[2].matchAll(/\.(\w+)\s*=\s*([^,\n]+),/g)) fields[f[1]] = f[2].trim();
    byId.set(id, { id, name: m[1], ...fields });
  }
  return byId;
}

// Lichtsatz (Textformat wie die Platin-JSONs: je Zeitblock Endzeit, 4 Lichter, Diffus/Ambient/Spiegel/Emission)
function parseLight(text) {
  const blocks = text.split(/\r?\n\s*\r?\n/).map(b => b.split(/\r?\n/).map(l => l.split(',').filter(x => x.trim() !== '').map(Number)).filter(l => l.length));
  return blocks.filter(b => b.length >= 9).map(b => ({
    endTime: b[0][0],
    lights: b.slice(1, 5).map(l => ({ on: !!l[0], c: l.slice(1, 4), d: l.slice(4, 7).map(v => v / 4096) })),
    diff: b[5], amb: b[6], spec: b[7], emi: b[8],
  }));
}
function daylight(set) {
  const t = 13 * 1800; // 13 Uhr, Zeiten in 2-Sekunden-Schritten
  return set.find(x => x.endTime >= t) || set[set.length - 1];
}

// ── Spieldaten ───────────────────────────────────────────────────────────────
const headers = parseHeaders();
const matrixFiles = fs.readdirSync(path.join(SOURCE, 'files/fielddata/mapmatrix/map_matrix')).filter(f => f.endsWith('.bin')).sort();
const matrixFile = id => matrixFiles.find(f => f.startsWith('map_matrix_' + String(id).padStart(4, '0')));
const land = narcMembers(read('files/a/0/6/5'));
const areaData = narcMembers(read('files/a/0/4/2'));
const mapTextures = narcMembers(read('files/a/0/4/4'));
const buildTextures = narcMembers(read('files/a/0/7/0'));
const buildModels = { field: narcMembers(read('files/a/0/4/0')), room: narcMembers(read('files/a/1/4/8')) };
const matShpData = { field: read('files/fielddata/build_model/bm_field_matshp.dat'), room: read('files/fielddata/build_model/bm_room_matshp.dat') };
const lightSets = narcMembers(read('files/data/arealight.narc')).map(b => parseLight(b.toString('latin1')));
const LIGHT_ARCHIVE = [1, 0, 3]; // Lichtsatz-Byte → Mitglied von arealight.narc (AreaDataManager_GetAreaLightArchiveID)

function matShpFor(kind, id) {
  const b = matShpData[kind], nLoc = b.readUInt16LE(0);
  if (id >= nLoc) return null;
  const cnt = b.readUInt16LE(4 + id * 4), idx = b.readUInt16LE(6 + id * 4);
  if (!cnt) return null;
  const base = 4 + nLoc * 4;
  return Array.from({ length: cnt }, (_, k) => ({ mat: b.readUInt16LE(base + (idx + k) * 4), shp: b.readUInt16LE(base + (idx + k) * 4 + 2) }));
}

const tex0Of = buf => { const o = buf && buf.length > 16 ? nitroBlocks(buf, 0).TEX0 : null; return o == null ? null : parseTex0(buf, o); };
const areaCache = new Map();
function area(areaId) {
  if (areaCache.has(areaId)) return areaCache.get(areaId);
  const a = areaData[areaId] || areaData[0];
  const buildSet = a.readUInt16LE(0), mapTex = a.readUInt16LE(2), outdoor = a[6] === 1, lightByte = a[7];
  const L = daylight(lightSets[LIGHT_ARCHIVE[lightByte] ?? 0]);
  const res = {
    id: areaId, outdoor, kind: outdoor ? 'field' : 'room',
    mapTex: tex0Of(mapTextures[mapTex]),
    propTex: tex0Of(buildTextures[buildSet]),
    // Draußen ersetzt das Spiel die Materialfarben durch das Licht des Gebiets, drinnen nicht (wie Platin)
    light: { lights: L.lights, diff: L.diff, amb: L.amb, spec: L.spec, emi: L.emi, outdoor },
  };
  areaCache.set(areaId, res);
  return res;
}

let allTex = null;
function allTexSets() {
  if (!allTex) allTex = [...mapTextures, ...buildTextures].map(tex0Of).filter(Boolean);
  return allTex;
}
// Textur und Palette eines Materials suchen: erst im Gebiet, dann im Modell selbst, dann in allen Sätzen
function bindMaterial(mat, sets) {
  if (mat.bound) return;
  mat.bound = true;
  if (!mat.tex) return;
  let tset = sets.find(s => s && s.textures.has(mat.tex)) || allTexSets().find(s => s.textures.has(mat.tex));
  if (!tset) { STATS.missingTex.add(mat.tex); return; }
  const hasPal = s => s && s.palettes.has(mat.pal);
  const pset = mat.pal == null ? null : hasPal(tset) ? tset : sets.find(hasPal) || allTexSets().find(hasPal);
  const info = tset.textures.get(mat.tex);
  mat.texImg = decodeTexture(tset, mat.tex, pset, mat.pal);
  mat.texFmt = info.fmt; mat.texW = info.w; mat.texH = info.h;
}

// Modelle werden je Gebiet gebunden (gleiches Modell, andere Texturen), daher der Schlüssel Modell:Gebiet
const landCache = new Map(), propCache = new Map();
function landModel(id, ar, buf, off) {
  const key = `${id}:${ar.id}`;
  if (!landCache.has(key)) landCache.set(key, parseBMD(buf, off));
  return landCache.get(key);
}
function propModel(kind, id, ar) {
  const key = `${kind}:${id}:${ar.id}`;
  if (propCache.has(key)) return propCache.get(key);
  const buf = buildModels[kind][id];
  const model = buf && buf.toString('latin1', 0, 4) === 'BMD0' ? parseBMD(buf, 0) : null;
  propCache.set(key, model);
  return model;
}

// Landdaten: Kopf (0x14) → u32 Kachelattribute, u32 Requisiten, u32 Modell, u32 BDHC, u16 Kennung, u16 Zusatzlänge;
// dahinter Zusatz, Attribute, Requisiten (48 Byte), NSBMD, BDHC
function landParts(buf) {
  const permSize = buf.readUInt32LE(0), propSize = buf.readUInt32LE(4), modelSize = buf.readUInt32LE(8);
  const extra = buf.readUInt16LE(0x12);
  const props = 0x14 + extra + permSize, model = props + propSize, bdhc = model + modelSize;
  if (buf.toString('latin1', model, model + 4) !== 'BMD0') throw new Error('Landdaten ohne NSBMD');
  return { props, propSize, model, bdhc };
}

// Ein Block einer Matrix → Dreiecke in Weltkoordinaten + Bodenhöhen
// w: { matrix, cache, isFiller(r, c), areaFor(r, c) }
function blockGeometry(w, r, c) {
  const key = `${r}:${c}`;
  if (w.cache.has(key)) return w.cache.get(key);
  const mx = w.matrix;
  if (r < 0 || c < 0 || r >= mx.height || c >= mx.width) return null;
  const id = mx.models[r][c], buf = land[id];
  if (id === 0xFFFF || !buf) { w.cache.set(key, null); return null; }
  const parts = landParts(buf);
  const ar = w.areaFor(r, c);
  // Kulissen ohne ihre Matrix-Höhe zeichnen: sonst rutschen sie in der Schrägsicht nach oben und reißen Lücken auf
  const flat = w.isFiller(r, c);
  const alt = flat ? 0 : mx.altitudes[r][c] * TILE / 2;
  const ox = c * SIZE + SIZE / 2, oz = r * SIZE + SIZE / 2;
  const tris = [];
  const model = landModel(id, ar, buf, parts.model);
  const world = [1, 0, 0, ox, 0, 1, 0, alt, 0, 0, 1, oz];
  for (const d of runSbc(model)) {
    const mat = model.mats[d.mat];
    if (!mat || !model.shapes[d.shp]) continue;
    if (((mat.polyAttr >> 4) & 3) === 3) { STATS.shadow++; continue; }
    bindMaterial(mat, [ar.mapTex, model.tex]);
    emitShape(model.shapes[d.shp], d.mtx, d.stack, mat, ar.light, world, model.posScale, tris);
  }
  // Gebäude und Requisiten (MapPropManager: Position + Blockmitte in x/z, Höhe so wie gespeichert, keine Drehung)
  for (let p = parts.props; p + 48 <= parts.props + parts.propSize; p += 48) {
    const propId = buf.readUInt32LE(p);
    const prop = propModel(ar.kind, propId, ar);
    if (!prop) continue;
    const px = buf.readInt32LE(p + 4) / 4096, py = buf.readInt32LE(p + 8) / 4096, pz = buf.readInt32LE(p + 12) / 4096;
    const sx = buf.readInt32LE(p + 28) / 4096, sy = buf.readInt32LE(p + 32) / 4096, sz = buf.readInt32LE(p + 36) / 4096;
    if (![px, py, pz, sx, sy, sz].every(Number.isFinite)) continue;
    const placement = [sx, 0, 0, ox + px, 0, sy, 0, alt + py, 0, 0, sz, oz + pz];
    const only = matShpFor(ar.kind, propId);
    const draws = only ? only.map(o => ({ mat: o.mat, shp: o.shp, mtx: IDENT, stack: [] })) : runSbc(prop);
    for (const d of draws) {
      const mat = prop.mats[d.mat];
      if (!mat || !prop.shapes[d.shp]) continue;
      if (((mat.polyAttr >> 4) & 3) === 3) { STATS.shadow++; continue; }
      bindMaterial(mat, [ar.propTex, prop.tex, ar.mapTex]);
      emitShape(prop.shapes[d.shp], d.mtx, d.stack, mat, ar.light, placement, prop.posScale, tris);
    }
  }
  const heights = flat ? null : parseBdhc(buf, parts.bdhc);
  const res = { tris, heights, alt, area: ar.id };
  w.cache.set(key, res);
  return res;
}

// ── Oberwelt ─────────────────────────────────────────────────────────────────
function renderOverworld() {
  const matrix = parseMatrix(read('files/fielddata/mapmatrix/map_matrix/' + matrixFile(0)));
  const ROWS = matrix.height, COLS = matrix.width;
  const hdr = (r, c) => headers.get(matrix.headers[r][c]);
  const hasMap = (r, c) => r >= 0 && c >= 0 && r < ROWS && c < COLS && matrix.models[r][c] !== 0xFFFF;
  // Kopf 0/1 = Füllfeld (MAP_EVERYWHERE / MAP_NOTHING); der Mystery-Zone-Block zählt nicht zur Welt
  const isFiller = (r, c) => hasMap(r, c) && matrix.headers[r][c] <= 1;
  const isReal = (r, c) => hasMap(r, c) && !isFiller(r, c) && hdr(r, c)?.mapsec !== 'MAPSEC_MYSTERY_ZONE';
  // Drei Kulissen: Wald, Meer, Fels. Das Meer ist die blaueste (gemittelte Texturfarbe ihrer Materialien) –
  // „grenzt am häufigsten an leere Felder" wie bei Platin trifft hier den Fels am Nordrand
  const fillerModels = new Set();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isFiller(r, c)) fillerModels.add(matrix.models[r][c]);
  const blueness = id => {
    const g = blockGeometry({ matrix: { width: 1, height: 1, models: [[id]], headers: [[0]], altitudes: [[0]] }, cache: new Map(), isFiller: () => true, areaFor: () => area(0) }, 0, 0);
    let b = 0, n = 0;
    for (const t of g?.tris || []) {
      const px = t.mat.texImg?.px;
      if (!px) continue;
      for (let i = 0; i < px.length; i += 4) if (px[i + 3]) { b += px[i + 2] - (px[i] + px[i + 1]) / 2; n++; }
    }
    return n ? b / n : -Infinity;
  };
  const SEA_MODEL = [...fillerModels].sort((a, b) => blueness(b) - blueness(a))[0];
  // Leere Felder (die Matrix ist kein Rechteck wie in Sinnoh) bekommen die nächste Wald- oder Meeres-Kulisse:
  // nördlich von Johto Wald, im Süden Meer – statt einer Collage aus Inseln eine zusammenhängende Welt.
  // Fels bleibt nur, wo das Spiel ihn selbst hinsetzt (große Felsflächen sähen wie Wüste aus).
  {
    const counts = new Map();
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isFiller(r, c)) counts.set(matrix.models[r][c], (counts.get(matrix.models[r][c]) || 0) + 1);
    const forest = [...counts].filter(([id]) => id !== SEA_MODEL).sort((a, b) => b[1] - a[1])[0]?.[0];
    const src = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isFiller(r, c) && (matrix.models[r][c] === SEA_MODEL || matrix.models[r][c] === forest)) src.push([r, c]);
    const owner = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
    let ring = src.map(([r, c]) => { owner[r][c] = matrix.models[r][c]; return [r, c]; });
    while (ring.length) {
      const next = [];
      for (const [r, c] of ring) for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || owner[nr][nc] != null || hasMap(nr, nc)) continue;
        owner[nr][nc] = owner[r][c]; next.push([nr, nc]);
      }
      ring = next;
    }
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (hasMap(r, c) || owner[r][c] == null) continue;
      matrix.models[r][c] = owner[r][c]; matrix.headers[r][c] = 0; matrix.altitudes[r][c] = 0;
    }
  }
  const isSea = (r, c) => isFiller(r, c) && matrix.models[r][c] === SEA_MODEL;
  const hasLand = (r, c) => isReal(r, c) || (isFiller(r, c) && !isSea(r, c));
  // Felder ohne Land, die mit dem Rand oder dem Meer verbunden sind, sind offenes Meer
  const openSea = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const stack = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const border = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
    if ((border && !hasLand(r, c)) || isSea(r, c)) { openSea[r][c] = true; stack.push([r, c]); }
  }
  while (stack.length) {
    const [r, c] = stack.pop();
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || openSea[nr][nc] || hasLand(nr, nc)) continue;
      openSea[nr][nc] = true; stack.push([nr, nc]);
    }
  }
  function nearest(r0, c0, pred) {
    const seen = new Set([`${r0}:${c0}`]);
    let ring = [[r0, c0]];
    while (ring.length) {
      const hit = ring.find(([r, c]) => pred(r, c));
      if (hit) return hit;
      const next = [];
      for (const [r, c] of ring) for (const [nr, nc] of [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]]) {
        if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || seen.has(`${nr}:${nc}`)) continue;
        seen.add(`${nr}:${nc}`); next.push([nr, nc]);
      }
      ring = next;
    }
    return null;
  }
  // Kulissen zeichnet das Spiel mit den Texturen des Gebiets, in dem man steht – hier: des nächsten echten Blocks
  const areaOf = (r, c) => {
    if (isReal(r, c)) return area(+(hdr(r, c)?.areaDataBank || 0));
    const n = nearest(r, c, isReal);
    return area(n ? +(hdr(n[0], n[1])?.areaDataBank || 0) : 0);
  };
  const cache = new Map();
  const W = { matrix, cache, isFiller, areaFor: areaOf };
  const geometry = (r, c, includeSea = false) => (isSea(r, c) && !includeSea ? null : blockGeometry(W, r, c));

  // Ausschnitt: alle echten Blöcke + 1 Feld Rand
  const real = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isReal(r, c)) real.push([r, c]);
  const minR = Math.max(0, Math.min(...real.map(x => x[0])) - 1), maxR = Math.min(ROWS - 1, Math.max(...real.map(x => x[0])) + 1);
  const minC = Math.max(0, Math.min(...real.map(x => x[1])) - 1), maxC = Math.min(COLS - 1, Math.max(...real.map(x => x[1])) + 1);
  // Gerendert werden: alles mit Land, Löcher im Land und Meeresfelder, in die von Süden etwas hineinragt
  let targets = [];
  for (let r = minR; r <= maxR; r++) for (let c = minC; c <= maxC; c++) {
    if (hasLand(r, c) || !openSea[r][c]) { targets.push([r, c]); continue; }
    let below = false;
    for (let dr = 1; dr <= 2; dr++) for (let dc = -1; dc <= 1; dc++) if (hasLand(r + dr, c + dc)) below = true;
    if (below) targets.push([r, c]);
  }
  if (opts.only) {
    const want = new Set(opts.only.split(',').map(s => s.trim()));
    targets = targets.filter(([r, c]) => want.has(`${r}:${c}`));
  }
  console.log(`Rendere HG/SS-Oberwelt: ${targets.length} Blöcke, Ausschnitt Zeilen ${minR}–${maxR}, Spalten ${minC}–${maxC}`);

  // Musterprobe fürs offene Meer
  const seaCell = (() => { for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (isSea(r, c)) return [r, c]; return null; })();
  if (seaCell && !opts.only) {
    const [r, c] = seaCell;
    const cv = new Canvas(SIZE, SIZE, c * SIZE, r * SIZE);
    for (const pass of [false, true]) for (const tri of geometry(r, c, true).tris) drawTri(cv, tri, pass);
    writePNG(path.join(OUT, 'sea_sample.png'), SIZE, SIZE, cv.rgba);
  }

  const info = { shear: SHEAR, size: SIZE, rows: maxR - minR + 1, cols: maxC - minC + 1, origin: [minC * CH, minR * CH], chunks: {} };
  const t0 = Date.now();
  let done = 0;
  targets.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  for (const [r, c] of targets) {
    for (const k of [...cache.keys()]) { const [kr, kc] = k.split(':').map(Number); if (kr < r - 1 && !isFiller(kr, kc)) cache.delete(k); }
    // Hintergrund: flache Land-Kulisse (eigene oder nächstgelegene) – füllt, was die Schrägsicht freilegt
    const bg = new Canvas(SIZE, SIZE, c * SIZE, r * SIZE);
    if (!openSea[r][c]) {
      const landFiller = (a, b) => isFiller(a, b) && !isSea(a, b);
      const src = landFiller(r, c) ? [r, c] : nearest(r, c, landFiller);
      const g = src && geometry(src[0], src[1]);
      if (g) for (const pass of [false, true]) for (const tri of g.tris) drawTri(bg, tri, pass, (c - src[1]) * SIZE, (r - src[0]) * SIZE);
    }
    // Vordergrund: dieser Block und alles, was von den Nachbarn hineinragt
    const cv = new Canvas(SIZE, SIZE, c * SIZE, r * SIZE);
    const list = [];
    for (let dr = -1; dr <= 2; dr++) for (let dc = -1; dc <= 1; dc++) { const g = geometry(r + dr, c + dc); if (g) list.push(g); }
    for (const pass of [false, true]) for (const g of list) for (const tri of g.tris) drawTri(cv, tri, pass);
    edgeMarking(cv);
    for (let k = 0; k < SIZE * SIZE; k++) {
      const q = k * 4, a = cv.rgba[q + 3] / 255;
      if (a >= 1 || bg.rgba[q + 3] === 0) continue;
      for (let ch = 0; ch < 3; ch++) cv.rgba[q + ch] = cv.rgba[q + ch] * a + bg.rgba[q + ch] * (1 - a);
      cv.rgba[q + 3] = 255;
    }
    if (!openSea[r][c]) fillHoles(cv.rgba, SIZE, SIZE);
    const rr = r - minR, cc = c - minC;
    if (cv.rgba.some((v, i) => i % 4 === 3 && v)) writePNG(path.join(OUT, `chunk_${rr}_${cc}.png`), SIZE, SIZE, cv.rgba);
    const own = isReal(r, c) ? geometry(r, c) : null;
    info.chunks[`${rr}:${cc}`] = { header: matrix.headers[r][c], ground: own?.heights || 0 };
    done++;
    if (done % 25 === 0 || done === targets.length) console.log(`  ${done}/${targets.length} (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  fs.writeFileSync(path.join(OUT, 'render.json'), JSON.stringify(info));
  console.log(`Fertig. Kartenmodelle: ${landCache.size}, Gebäude: ${propCache.size}, Schatten übersprungen: ${STATS.shadow}`);
  if (STATS.missingTex.size) console.log('  Fehlende Texturen:', [...STATS.missingTex].join(', '));
}

// ── Innenkarten (Höhlen, Türme, Gebäude): je Matrix und Gebiet ein Bild, auf den Inhalt zugeschnitten ──
// Welche es gibt, steht in hgss.json unter „maps" (build-hgss.js zuerst laufen lassen).
// Ausgabe: interior_<Matrix>__<Gebiet>.png + interiors.json – make-tiles.py packt sie in Atlanten.
function renderInteriors() {
  const dataFile = path.resolve(opts.data || path.join(__dirname, '..', 'hgss.json'));
  if (!fs.existsSync(dataFile)) { console.log('Keine hgss.json für die Innenkarten gefunden:', dataFile); return; }
  const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
  const jobs = new Map();
  for (const m of Object.values(data.maps || {})) jobs.set(`${m.matrix}__${m.areaData}`, m);
  let list = [...jobs];
  if (opts.only) list = list.filter(([key]) => opts.only.split(',').some(w => key.includes(w)));
  console.log(`Rendere ${list.length} Innenkarten …`);
  const TOP = 384, BOTTOM = 96; // Platz für alles, was in der Schrägsicht über bzw. unter die Karte ragt
  const images = {};
  const t0 = Date.now();
  let done = 0;
  for (const [key, m] of list) {
    const mx = parseMatrix(read('files/fielddata/mapmatrix/map_matrix/' + m.matrix + '.bin'));
    const ar = area(m.areaData);
    const w = { matrix: mx, cache: new Map(), isFiller: () => false, areaFor: () => ar };
    const W = mx.width * SIZE, H = mx.height * SIZE + TOP + BOTTOM;
    const cv = new Canvas(W, H, 0, -TOP);
    const geos = [], ground = {};
    for (let r = 0; r < mx.height; r++) for (let c = 0; c < mx.width; c++) {
      const g = blockGeometry(w, r, c);
      if (!g) continue;
      geos.push(g);
      // Bodenhöhen in Kacheln, samt Höhe des Blocks
      ground[`${r}:${c}`] = g.heights ? g.heights.map(hs => hs.map(h => h + g.alt / TILE)) : g.alt / TILE;
    }
    for (const pass of [false, true]) for (const g of geos) for (const tri of g.tris) drawTri(cv, tri, pass);
    edgeMarking(cv);
    // Auf den Inhalt zuschneiden (drumherum ist im Spiel nur Schwarz)
    let x0 = W, y0 = H, x1 = -1, y1 = -1;
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!cv.rgba[(y * W + x) * 4 + 3]) continue;
      if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y;
    }
    if (x1 < 0) continue;
    x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(W - 1, x1 + 4); y1 = Math.min(H - 1, y1 + 4);
    const cw = x1 - x0 + 1, chh = y1 - y0 + 1;
    const crop = new Uint8ClampedArray(cw * chh * 4);
    for (let y = 0; y < chh; y++) crop.set(cv.rgba.subarray(((y0 + y) * W + x0) * 4, ((y0 + y) * W + x1 + 1) * 4), y * cw * 4);
    const file = `interior_${key}.png`;
    writePNG(path.join(OUT, file), cw, chh, crop);
    images[key] = { file, w: cw, h: chh, ox: x0 / TILE, oz: (y0 - TOP) / TILE, ground };
    if (++done % 20 === 0) console.log(`  ${done}/${list.length} (${Math.round((Date.now() - t0) / 1000)} s)`);
  }
  fs.writeFileSync(path.join(OUT, 'interiors.json'), JSON.stringify({ shear: SHEAR, images }));
  console.log(`  ${Object.keys(images).length} Innenkarten (${Math.round((Date.now() - t0) / 1000)} s)`);
  if (STATS.missingTex.size) console.log('  Fehlende Texturen:', [...STATS.missingTex].join(', '));
}

module.exports = { narcMembers, parseMatrix, parseHeaders, matrixFiles, matrixFile, blockGeometry, area, landParts };

if (require.main === module) {
  if (!opts['interiors-only']) renderOverworld();
  if (!opts['no-interiors']) renderInteriors();
}
