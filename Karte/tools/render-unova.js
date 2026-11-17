/*
 * Rendert die gemeinsame Einall-Oberwelt direkt aus einer Pokémon-Schwarz/Weiß-ROM,
 * einschließlich Schwarz 2 und Weiß 2.
 * Die ROM wird nur gelesen und niemals in den Projektordner kopiert.
 *
 * Gen-5-Datenpfad:
 *   a/0/0/8  Kartencontainer (Wrapper + BMD0-Modell + Laufdaten)
 *   a/0/0/9  Weltmatrizen (u32-Karten-IDs, Matrix 0 = normale Einall-Oberwelt)
 *   a/0/1/4  gemeinsame NSBTX-Texturbanken
 *
 * Aufruf:
 *   node render-unova.js <black-or-white.nds> <ausgabe> [--matrix=0] [--variant=white]
 *                         [--only=zeile,spalte;zeile,spalte]
 *
 * --variant=white: Matrix 0 verweist auf die Schwarz-Fassung der Karten; Weiß tauscht im Spiel einzelne Blöcke gegen
 * „whiteSS_ZZ"-Modelle (Twindrake City u. a.). Mit dem Schalter werden genau diese Blöcke ersetzt – so liefert eine
 * ROM beide Editionen. Himmels-Kulissen (Stratos City: c3_sky2, c3_billboard) werden nicht gezeichnet, Schatten
 * („kage"-Texturen) halbdurchsichtig.
 * Als Modul: Hilfsfunktionen für layout-unova.js (ROM-Dateisystem, NARC, Matrizen, Modellnamen).
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  TILE, CH, SIZE, SHEAR, STATS,
  writePNG, nitroBlocks, parseTex0, decodeTexture, parseBMD, runSbc, emitShape,
  Canvas, drawTri, edgeMarking,
} = require('./render-platin.js');

const argv = process.argv.slice(2);
const positional = argv.filter(arg => !arg.startsWith('--'));
const opts = Object.fromEntries(argv.filter(arg => arg.startsWith('--')).map(arg => {
  const [key, value] = arg.slice(2).split('=');
  return [key, value == null ? '1' : value];
}));
const ROM_PATH = path.resolve(positional[0] || 'pokemon-white.nds');
// Kulissen, die im Spiel hinter der Stadt stehen (flache Himmelsbilder) – von oben gesehen nur störend
const SKIP_TEX = opts.skip ? new RegExp(`sky|billboard|${opts.skip}`, 'i') : /sky|billboard/i;   // --skip=regex zum Eingrenzen
// --max-height=N: Dreiecke, die höher als N Kacheln über dem Boden liegen, weglassen (Hochhäuser in Stratos City: in
// der Schrägsicht verdecken ihre Fassaden sonst halbe Straßenzüge)

function parseRomFiles(rom) {
  if (rom.length < 0x200) throw new Error('Die Datei ist keine Nintendo-DS-ROM.');
  const fntOffset = rom.readUInt32LE(0x40), fntSize = rom.readUInt32LE(0x44);
  const fatOffset = rom.readUInt32LE(0x48), fatSize = rom.readUInt32LE(0x4c);
  if (!fntOffset || !fntSize || !fatOffset || !fatSize) throw new Error('ROM-Dateisystem fehlt.');
  const fnt = rom.subarray(fntOffset, fntOffset + fntSize);
  const directoryCount = fnt.readUInt16LE(6);
  const directories = [];
  for (let i = 0; i < directoryCount; i++) {
    const at = i * 8;
    directories.push({ table: fnt.readUInt32LE(at), firstFile: fnt.readUInt16LE(at + 4) });
  }
  const dirNames = new Map([[0, '']]), dirParents = new Map([[0, 0]]), filesByDir = new Map();
  for (let dir = 0; dir < directories.length; dir++) {
    let at = directories[dir].table, fileId = directories[dir].firstFile;
    const entries = [];
    while (at < fnt.length) {
      const typeLength = fnt[at++];
      if (!typeLength || typeLength === 0x80) break;
      const length = typeLength & 0x7f;
      const name = fnt.toString('latin1', at, at + length);
      at += length;
      if (typeLength < 0x80) entries.push([fileId++, name]);
      else {
        const child = fnt.readUInt16LE(at) & 0x0fff;
        at += 2;
        dirNames.set(child, name);
        dirParents.set(child, dir);
      }
    }
    filesByDir.set(dir, entries);
  }
  const dirPath = dir => {
    const parts = [], seen = new Set();
    while (dir && !seen.has(dir)) {
      seen.add(dir);
      parts.push(dirNames.get(dir) || `dir${dir}`);
      dir = dirParents.get(dir) || 0;
    }
    return parts.reverse().join('/');
  };
  const byPath = new Map();
  for (const [dir, entries] of filesByDir) {
    const prefix = dirPath(dir);
    for (const [id, name] of entries) {
      const fat = fatOffset + id * 8;
      if (fat + 8 > fatOffset + fatSize) continue;
      const start = rom.readUInt32LE(fat), end = rom.readUInt32LE(fat + 4);
      if (!start || end <= start || end > rom.length) continue;
      byPath.set(prefix ? `${prefix}/${name}` : name, rom.subarray(start, end));
    }
  }
  return byPath;
}

function narcMembers(buf) {
  if (buf.length < 28 || buf.toString('latin1', 0, 4) !== 'NARC') throw new Error('Ungültiges NARC-Archiv.');
  let at = 16;
  const fatSize = buf.readUInt32LE(at + 4), count = buf.readUInt16LE(at + 8), ranges = [];
  if (fatSize < 12 || count > (fatSize - 12) / 8) throw new Error('Ungültiges NARC-Verzeichnis.');
  for (let i = 0; i < count; i++) ranges.push([buf.readUInt32LE(at + 12 + i * 8), buf.readUInt32LE(at + 16 + i * 8)]);
  at += fatSize;
  at += buf.readUInt32LE(at + 4); // BTNF
  const data = at + 8;            // GMIF-Kopf
  return ranges.map(([start, end]) => buf.subarray(data + start, data + end));
}

function parseMatrix(raw, id) {
  if (raw.length < 8) throw new Error(`Matrix ${id} ist zu kurz.`);
  const mode = raw.readUInt16LE(0), width = raw.readUInt16LE(4), height = raw.readUInt16LE(6);
  const count = width * height, end = 8 + count * 4;
  if (!width || !height || width > 30 || height > 30 || end > raw.length) throw new Error(`Matrix ${id} hat ungültige Maße.`);
  const maps = Array.from({ length: height }, (_, row) => Array.from({ length: width }, (_, col) => raw.readUInt32LE(8 + (row * width + col) * 4)));
  return { id, mode, width, height, maps };
}

function bmdName(buf, base) {
  try {
    const blocks = nitroBlocks(buf, base), mdl0 = blocks.MDL0;
    if (mdl0 == null) return '';
    const count = buf[mdl0 + 9];
    if (!count) return '';
    const dict = mdl0 + 8, entryTable = dict + buf.readUInt16LE(dict + 6);
    const names = entryTable + buf.readUInt16LE(entryTable + 2);
    let name = '';
    for (let i = 0; i < 16 && buf[names + i]; i++) name += String.fromCharCode(buf[names + i]);
    return name;
  } catch (_) {
    return '';
  }
}

// Name jedes Kartenmodells (für Weiß-Varianten „whiteSS_ZZ" ↔ „mapSS_ZZ")
function mapNames(mapFiles) {
  return mapFiles.map(raw => { const base = raw.indexOf(Buffer.from('BMD0')); return base >= 0 ? bmdName(raw, base) : ''; });
}
// Matrix 0 mit den Weiß-Blöcken: mapSS_ZZ → whiteSS_ZZ, wo es die gibt
function whiteVariant(matrix, mapFiles) {
  const names = mapNames(mapFiles), byName = new Map(names.map((n, i) => [n, i]));
  let swapped = 0;
  const maps = matrix.maps.map(row => row.map(id => {
    const m = /^map(\d\d_\d\d)$/.exec(names[id] || ''), alt = m && byName.get('white' + m[1]);
    if (alt == null) return id;
    swapped++;
    return alt;
  }));
  return { ...matrix, maps, swapped };
}

function main(MATRIX_ID = Number(opts.matrix || 0), OUT = path.resolve(positional[1] || 'render-unova'), variant = opts.variant,
  MAX_HEIGHT = opts['max-height'] != null ? Number(opts['max-height']) : Infinity, model = opts.model != null ? Number(opts.model) : null, pad = opts.pad, rotate = opts.rotate, scene = null) {
  if (!scene) fs.mkdirSync(OUT, { recursive: true });
  const rom = main.rom || (main.rom = fs.readFileSync(ROM_PATH));
  const title = rom.toString('latin1', 0, 12).replace(/\0+$/, '');
  const gameCode = rom.toString('latin1', 0x0c, 0x10);
  if (!/^IR[ABCD][A-Z]$/.test(gameCode)) throw new Error(`Erwartet wurde Pokémon Schwarz/Weiß oder Schwarz 2/Weiß 2, gefunden: ${title} (${gameCode}).`);
  const quiet = !!scene;      // eine Szene ruft main() je Teil auf – dort nur die Zusammenfassung ausgeben
  if (!quiet) console.log(`ROM: ${title} (${gameCode}), ${Math.round(rom.length / 1024 / 1024)} MiB`);
  // ROM-Dateisystem, Archive und Texturindex nur einmal je Lauf lesen
  const shared = main.shared || (main.shared = { files: parseRomFiles(rom), narcs: new Map(), models: new Map() });
  const files = shared.files;
  const required = name => {
    const file = files.get(name);
    if (!file) throw new Error(`ROM-Datei ${name} fehlt.`);
    return file;
  };
  const narc = name => { if (!shared.narcs.has(name)) shared.narcs.set(name, narcMembers(required(name))); return shared.narcs.get(name); };
  const mapFiles = narc('a/0/0/8');
  const matrices = narc('a/0/0/9');
  const textureFiles = narc('a/0/1/4');
  if (!matrices[MATRIX_ID]) throw new Error(`Matrix ${MATRIX_ID} fehlt.`);
  let matrix = parseMatrix(matrices[MATRIX_ID], MATRIX_ID);
  // --model=N: nur ein einzelnes Kartenmodell (Füllmodelle des Spiels: map_outtree, map_outsea …)
  if (model != null) matrix = { id: MATRIX_ID, mode: 0, width: 1, height: 1, maps: [[model]] };
  if (variant === 'white') { matrix = whiteVariant(matrix, mapFiles); console.log(`Weiß-Fassung: ${matrix.swapped} Blöcke ersetzt`); }
  if (!quiet) console.log(`Matrix ${MATRIX_ID}: ${matrix.width}×${matrix.height}, Modus ${matrix.mode}; Karten ${mapFiles.length}, Texturbanken ${textureFiles.length}`);

  if (!shared.tex) {
    const textureSets = [], textureIndex = new Map(), paletteIndex = new Map();
    for (let i = 0; i < textureFiles.length; i++) {
      const file = textureFiles[i];
      try {
        const block = nitroBlocks(file, 0).TEX0;
        if (block == null) continue;
        const set = parseTex0(file, block);
        set.id = i;
        textureSets.push(set);
        for (const name of set.textures.keys()) {
          if (!textureIndex.has(name)) textureIndex.set(name, []);
          textureIndex.get(name).push(set);
        }
        for (const name of set.palettes.keys()) {
          if (!paletteIndex.has(name)) paletteIndex.set(name, []);
          paletteIndex.get(name).push(set);
        }
      } catch (_) {
        // Eine defekte oder andersartige Bank darf den Rest der Welt nicht blockieren.
      }
    }
    shared.tex = { textureSets, textureIndex, paletteIndex };
    console.log(`Texturindex: ${textureIndex.size} Texturen, ${paletteIndex.size} Paletten in ${textureSets.length} Banken`);
  }
  const { textureIndex, paletteIndex } = shared.tex;

  const bindMaterial = (mat, own = []) => {
    if (mat.bound) return;
    mat.bound = true;
    if (!mat.tex) return;
    // zuerst die eigenen Texturen (Gebäude: im Modell bzw. in der Bank ihres Gebäudepakets), dann alle Banken
    const candidates = [...own.filter(set => set && set.textures.has(mat.tex)), ...(textureIndex.get(mat.tex) || [])];
    const tset = candidates.find(set => !mat.pal || set.palettes.has(mat.pal)) || candidates[0];
    if (!tset) { STATS.missingTex.add(mat.tex); return; }
    const pset = !mat.pal ? null : (tset.palettes.has(mat.pal) ? tset : own.find(set => set && set.palettes.has(mat.pal)) || (paletteIndex.get(mat.pal) || [])[0]);
    try {
      const info = tset.textures.get(mat.tex);
      mat.texImg = decodeTexture(tset, mat.tex, pset, mat.pal);
      mat.texFmt = info.fmt;
      mat.texW = info.w;
      mat.texH = info.h;
    } catch (_) {
      STATS.missingTex.add(`${mat.tex}/${mat.pal || '-'}`);
    }
  };

  const modelCache = shared.models, geometryCache = new Map();
  const shadedMats = new Map();
  const shaded = mat => {
    if (!shadedMats.has(mat)) shadedMats.set(mat, { ...mat, polyAttr: (mat.polyAttr & ~(31 << 16) & ~0x800) | (11 << 16) });
    return shadedMats.get(mat);
  };
  // Textur (fast) ganz schwarz? Rück- und Seitenwände der Hochhäuser von Stratos City („black“, „c3_buil0“)
  const dim = mat => {
    if (mat.dim === undefined) {
      const t = mat.texImg;
      let sum = 0, n = 0;
      if (t) for (let i = 0; i < t.px.length; i += 4) if (t.px[i + 3]) { sum += t.px[i] + t.px[i + 1] + t.px[i + 2]; n++; }
      mat.dim = !!t && n > 0 && sum / n < 110 && !/kage/i.test(mat.tex || '');      // Summe aus Rot, Grün, Blau je Pixel
    }
    return mat.dim;
  };
  const darkMats = new Map();
  const dark = mat => {     // ohne Textur: nur die (dunklen) Eckenfarben
    if (!darkMats.has(mat)) darkMats.set(mat, { ...mat, texImg: null, tex: null });
    return darkMats.get(mat);
  };
  const mapModel = id => {
    if (modelCache.has(id)) return modelCache.get(id);
    const raw = mapFiles[id];
    const base = raw ? raw.indexOf(Buffer.from('BMD0')) : -1;
    if (!raw || base < 0) { modelCache.set(id, null); return null; }
    try {
      const model = parseBMD(raw, base);
      model.name = bmdName(raw, base) || `map_${id}`;
      modelCache.set(id, model);
      return model;
    } catch (error) {
      console.warn(`  Karte ${id} konnte nicht gelesen werden: ${error.message}`);
      modelCache.set(id, null);
      return null;
    }
  };

  // ── Gebäude: jede Karte (Container „WB“/„GC“) listet im letzten Abschnitt ihre Gebäude (16 Bytes: x, y, z als fx32
  // relativ zur Blockmitte, Drehung u16 – 0x10000 = 360° –, Gebäude-Nummer big-endian). Die Modelle stehen in
  // Gebäudepaketen („AB“: n Einträge, vorne n/2 Datensätze mit der Nummer, hinten in gleicher Reihenfolge die Modelle),
  // die Texturen in einer Bank je Paket. Welches Paket: das, das alle Nummern der Karte enthält.
  const buildingPacks = (() => {
    const find = () => {
      for (const [packName, texName] of [['a/2/2/9', 'a/1/7/6'], ['a/2/3/0', 'a/1/7/7']]) {
        const pf = files.get(packName), tf = files.get(texName);
        if (!pf || !tf) continue;
        const packs = narcMembers(pf), texs = narcMembers(tf);
        if (packs[0].toString('latin1', 0, 2) === 'AB' && texs.length === packs.length) return { packs, texs };
      }
      return null;
    };
    const found = find();
    if (!found) { console.log('Gebäudepakete nicht gefunden – ohne Gebäude'); return []; }
    return found.packs.map((p, i) => {
      const n = p.readUInt16LE(2), half = n / 2, offs = Array.from({ length: n + 1 }, (_, k) => p.readUInt32LE(4 + k * 4));
      const ids = new Map();
      for (let k = 0; k < half; k++) ids.set(p.readUInt16LE(offs[k]), k);
      return { i, p, half, offs, ids, texRaw: found.texs[i], tex: undefined, models: new Map() };
    });
  })();
  const packTex = pack => {
    if (pack.tex === undefined) {
      try { const b = nitroBlocks(pack.texRaw, 0).TEX0; pack.tex = b == null ? null : parseTex0(pack.texRaw, b); } catch (_) { pack.tex = null; }
    }
    return pack.tex;
  };
  const buildingModel = (pack, k) => {
    if (pack.models.has(k)) return pack.models.get(k);
    let model = null;
    try {
      const a = pack.offs[pack.half + k], e = pack.offs[pack.half + k + 1] > a ? pack.offs[pack.half + k + 1] : pack.p.length;
      const raw = pack.p.subarray(a, e);
      if (raw.toString('latin1', 0, 4) === 'BMD0') model = parseBMD(raw, 0);
    } catch (_) { model = null; }
    pack.models.set(k, model);
    return model;
  };
  const placements = id => {
    const raw = mapFiles[id], kind = raw.toString('latin1', 0, 2);
    if (kind !== 'WB' && kind !== 'GC') return [];
    const n = raw.readUInt16LE(2), off = raw.readUInt32LE(4 + (n - 1) * 4), end = raw.readUInt32LE(4 + n * 4) || raw.length;
    const count = raw.readUInt32LE(off), out = [];
    for (let k = 0; k < count; k++) {
      const o = off + 4 + k * 16;
      if (o + 16 > end) break;
      out.push({ x: raw.readInt32LE(o) / 4096, y: raw.readInt32LE(o + 4) / 4096, z: raw.readInt32LE(o + 8) / 4096, rot: raw.readUInt16LE(o + 12), id: (raw[o + 14] << 8) | raw[o + 15] });
    }
    return out;
  };
  const packOf = list => buildingPacks.find(pk => list.every(b => pk.ids.has(b.id))) || null;
  STATS.buildings = 0; STATS.buildingsMissing = 0;

  const EMPTY = 0xffffffff;
  const used = [];
  for (let row = 0; row < matrix.height; row++) for (let col = 0; col < matrix.width; col++) {
    if (matrix.maps[row][col] !== EMPTY) used.push([row, col]);
  }
  // --pad=N: N Blöcke Rand um die Matrix mitzeichnen (Modelle, die über ihren Block hinausragen – Stratos Citys Ufer)
  const PAD = Number(pad || 0);
  const minRow = Math.min(...used.map(x => x[0])) - PAD, maxRow = Math.max(...used.map(x => x[0])) + PAD;
  const minCol = Math.min(...used.map(x => x[1])) - PAD, maxCol = Math.max(...used.map(x => x[1])) + PAD;
  const rows = maxRow - minRow + 1, cols = maxCol - minCol + 1;
  // --rotate=Grad: die ganze Matrix um ihre Mitte drehen (um die Hochachse, im Raum – nicht das fertige Bild): Straßen
  // von Stratos City liegen so in ihrer Fächerrichtung und stehen trotzdem in derselben Schrägsicht wie der Rest.
  // In einer Szene (renderScene) kommt der Drehpunkt pivot der Matrix an die Stelle at der Szene (beides in Kacheln)
  const ROT = Number((scene ? scene.rotate : rotate) || 0) * Math.PI / 180, rotC = Math.cos(ROT), rotS = Math.sin(ROT);
  const pivotX = scene ? scene.pivot[0] * TILE : ((minCol + maxCol + 1) / 2 - minCol) * SIZE;
  const pivotZ = scene ? scene.pivot[1] * TILE : ((minRow + maxRow + 1) / 2 - minRow) * SIZE;
  const toX = scene ? scene.at[0] * TILE : pivotX, toZ = scene ? scene.at[1] * TILE : pivotZ;
  const turned = m => (ROT || scene ? [
    rotC * m[0] + rotS * m[8], rotC * m[1] + rotS * m[9], rotC * m[2] + rotS * m[10], rotC * (m[3] - pivotX) + rotS * (m[11] - pivotZ) + toX,
    m[4], m[5], m[6], m[7],
    -rotS * m[0] + rotC * m[8], -rotS * m[1] + rotC * m[9], -rotS * m[2] + rotC * m[10], -rotS * (m[3] - pivotX) + rotC * (m[11] - pivotZ) + toZ,
  ] : m);

  // Ein Modell in Weltdreiecke: Kulissen weg, Schatten halbdurchsichtig, ggf. Höhengrenze
  function emitModel(model, world, tris, own) {
    for (const draw of runSbc(model)) {
      const mat = model.mats[draw.mat];
      if (!mat || !model.shapes[draw.shp] || ((mat.polyAttr >> 4) & 3) === 3) continue;
      if (mat.tex && SKIP_TEX.test(mat.tex)) continue;
      // Schatten („kage“: unter Booten, Felsen, Bäumen, Gebäuden) sind deckend schwarze Texturen – im Spiel dunkeln sie
      // den Boden nur ab. Halbdurchsichtig zeichnen, sonst liegen schwarze Flecken und Flächen auf der Karte
      if (scene && mat.tex && /kage/i.test(mat.tex)) continue;      // Szene: Schatten sind für die Spielkamera gebacken
      if (mat.tex && /kage/i.test(mat.tex) && !mat.shade) { mat.shade = true; mat.polyAttr = (mat.polyAttr & ~(31 << 16) & ~0x800) | (11 << 16); }
      bindMaterial(mat, own);
      // Szene: Fassaden mit ausgestanzten Fenstern – dahinter ist im Modell nichts, also dunkles Glas einsetzen
      if (scene && mat.texImg && !mat.glazed && /buil|block|mado/i.test(mat.tex || '')) {
        mat.glazed = true;
        const px = Uint8ClampedArray.from(mat.texImg.px);
        let holes = 0;
        for (let i = 0; i < px.length; i += 4) if (px[i + 3] < 128) { px[i] = 44; px[i + 1] = 50; px[i + 2] = 68; px[i + 3] = 255; holes++; }
        if (holes) mat.texImg = { ...mat.texImg, px };
      }
      const before = tris.length;
      emitShape(model.shapes[draw.shp], draw.mtx, draw.stack, mat, null, world, model.posScale, tris);
      if (MAX_HEIGHT < Infinity) for (let i = tris.length - 1; i >= before; i--) if (tris[i].v.some(v => v[1] > MAX_HEIGHT * TILE)) tris.splice(i, 1);
      // Dreiecke mit ganz schwarzen Eckenfarben sind gebackene Schatten (unter Dächern und Brücken, Felsen unter Wasser,
      // Gruben): von oben gesehen deckend schwarz – als halbdurchsichtige Abdunklung zeichnen
      // (in der Szene gilt schon sehr dunkel als schwarz: die Schatten laufen dort über dunkelgraue Ecken aus)
      const LIMIT = scene ? 36 : 4, isDark = p => p[3] + p[4] + p[5] < LIMIT;
      for (let i = before; i < tris.length; i++) {
        const v = tris[i].v, black = scene && dim(mat);
        // Szene: Flächen ohne Textur, die in Schwarz auslaufen, sind Blenden für die Kamerafahrt (Straßenende am Platz)
        if (scene && !mat.texImg && v.some(isDark)) { tris[i] = null; continue; }
        // … und Flächen, deren Ecken nur teils schwarz sind, laufen in einen eingefärbten Schatten aus: aufhellen
        if (scene && !black && v.some(isDark) && !v.every(isDark)) {
          const lit = v.reduce((a, p) => (p[3] + p[4] + p[5] > a[3] + a[4] + a[5] ? p : a));
          tris[i] = { ...tris[i], v: v.map(p => { const q = p.slice(); q[3] = lit[3]; q[4] = lit[4]; q[5] = lit[5]; return q; }) };
          continue;
        }
        if (!black && !v.every(isDark)) continue;
        const upright = Math.max(v[0][1], v[1][1], v[2][1]) - Math.min(v[0][1], v[1][1], v[2][1]) > TILE / 4;
        // In der Szene (Stratos City schräg, gedreht) sieht man Hauswände, die im Spiel nie im Bild sind: schwarz
        // eingefärbte Rück- und Seitenwände. Dunkel und deckend zeichnen statt als Schatten
        if (scene && (upright || black)) tris[i] = { ...tris[i], mat: black ? dark(mat) : mat, v: v.map(p => { const q = p.slice(); q[3] = 9; q[4] = 9; q[5] = 11; return q; }) };
        else if (scene) tris[i] = null;                                // liegende schwarze Flächen = Schatten
        else tris[i] = { ...tris[i], mat: shaded(tris[i].mat) };
      }
      if (scene) for (let i = tris.length - 1; i >= before; i--) if (!tris[i]) tris.splice(i, 1);
    }
  }

  const blockGeometry = (row, col) => {
    const key = `${row}:${col}`;
    if (geometryCache.has(key)) return geometryCache.get(key);
    if (row < 0 || col < 0 || row >= matrix.height || col >= matrix.width) return null;
    const id = matrix.maps[row][col];
    if (id === EMPTY) return null;
    const model = mapModel(id);
    if (!model) return null;
    const centerX = (col - minCol) * SIZE + SIZE / 2;
    const centerZ = (row - minRow) * SIZE + SIZE / 2;
    const world = turned([1, 0, 0, centerX, 0, 1, 0, 0, 0, 0, 1, centerZ]);
    const tris = [];
    emitModel(model, world, tris, []);
    // Gebäude dieses Blocks (Pokémon-Center, Häuser, Lagerhallen …)
    const list = placements(id);
    const pack = list.length ? packOf(list) : null;
    if (list.length && !pack) STATS.buildingsMissing += list.length;
    if (pack) for (const b of list) {
      const bm = buildingModel(pack, pack.ids.get(b.id));
      if (!bm) { STATS.buildingsMissing++; continue; }
      const a = b.rot / 65536 * 2 * Math.PI, c = Math.cos(a), sn = Math.sin(a);
      emitModel(bm, turned([c, 0, sn, centerX + b.x, 0, 1, 0, b.y, -sn, 0, c, centerZ + b.z]), tris, [bm.tex, packTex(pack)]);
      STATS.buildings++;
    }
    const result = { id, name: model.name, tris };
    geometryCache.set(key, result);
    return result;
  };

  if (scene) {
    // Nur die Dreiecke sammeln: an den senkrechten Ebenen der Szene beschnitten (Keil einer Straße, Rand des Platzes)
    for (const [row, col] of used) {
      const g = blockGeometry(row, col);
      if (g) for (const t of clipPart(g.tris, scene.clip || [])) scene.collect.push(t);
    }
    return;
  }
  let targets = used.slice();
  if (PAD) { targets = []; for (let row = minRow; row <= maxRow; row++) for (let col = minCol; col <= maxCol; col++) targets.push([row, col]); }
  if (opts.only) {
    const wanted = new Set(opts.only.split(';').map(x => x.trim()));
    targets = targets.filter(([row, col]) => wanted.has(`${row},${col}`));
  }
  targets.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  console.log(`Rendere ${targets.length}/${used.length} belegte Blöcke; Ausschnitt ${cols}×${rows} Blöcke (${minCol},${minRow})–(${maxCol},${maxRow})`);
  const info = {
    version: 1,
    source: /^IR[CD]/.test(gameCode) ? 'Pokemon Black 2/White 2 ROM' : 'Pokemon Black/White ROM',
    gameCode,
    matrix: MATRIX_ID,
    rows,
    cols,
    size: SIZE,
    shear: SHEAR,
    origin: [minCol * CH, minRow * CH],
    ...(ROT ? { rotate: Number(rotate), pivot: [pivotX, pivotZ] } : {}),
    chunks: {},
  };
  const started = Date.now();
  let done = 0;
  for (const [row, col] of targets) {
    const localRow = row - minRow, localCol = col - minCol;
    const cv = new Canvas(SIZE, SIZE, localCol * SIZE, localRow * SIZE);
    const around = [];
    for (let dr = -1 - PAD; dr <= 2 + PAD; dr++) for (let dc = -1 - PAD; dc <= 1 + PAD; dc++) {
      const geometry = blockGeometry(row + dr, col + dc);
      if (geometry) around.push(geometry);
    }
    for (const translucent of [false, true]) for (const geometry of around) for (const tri of geometry.tris) drawTri(cv, tri, translucent);
    edgeMarking(cv);
    if (cv.rgba.some((value, index) => index % 4 === 3 && value)) writePNG(path.join(OUT, `chunk_${localRow}_${localCol}.png`), SIZE, SIZE, cv.rgba);
    const own = blockGeometry(row, col);
    info.chunks[`${localRow}:${localCol}`] = { map: own?.id ?? matrix.maps[row]?.[col] ?? -1, name: own?.name || '', ground: 0 };
    done++;
    if (done % 10 === 0 || done === targets.length) console.log(`  ${done}/${targets.length} (${Math.round((Date.now() - started) / 1000)} s)`);
    for (const cacheKey of [...geometryCache.keys()]) {
      const oldRow = +cacheKey.split(':')[0];
      if (oldRow < row - 2) geometryCache.delete(cacheKey);
    }
  }
  fs.writeFileSync(path.join(OUT, 'render.json'), JSON.stringify(info));
  if (!quiet) console.log(`Fertig. Modelle: ${modelCache.size}; Gebäude: ${STATS.buildings} (ohne Modell ${STATS.buildingsMissing}); fehlende Texturen: ${STATS.missingTex.size}`);
  if (STATS.missingTex.size) console.log('  Fehlend:', [...STATS.missingTex].slice(0, 80).join(', '));
  if (STATS.unknownGx.size) console.log('  Unbekannte GX-Befehle:', [...STATS.unknownGx].map(x => `0x${x.toString(16)}`).join(', '));
}

// Dreiecke an senkrechten Ebenen beschneiden: planes = [[nx, nz, d], …] in Kacheln, behalten wird nx·x + nz·z ≤ d
function clipTris(tris, planes) {
  let out = tris;
  for (const [nx, nz, dist] of planes) {
    const next = [], d = dist * TILE;
    for (const t of out) {
      const ds = t.v.map(v => nx * v[0] + nz * v[2] - d);
      if (ds.every(x => x <= 0)) { next.push(t); continue; }
      if (ds.every(x => x > 0)) continue;
      const poly = [];
      for (let i = 0; i < 3; i++) {
        const a = t.v[i], b = t.v[(i + 1) % 3], da = ds[i], db = ds[(i + 1) % 3];
        if (da <= 0) poly.push(a);
        if ((da <= 0) !== (db <= 0)) { const k = da / (da - db); poly.push(a.map((x, j) => x + (b[j] - x) * k)); }
      }
      for (let i = 1; i + 1 < poly.length; i++) next.push({ ...t, v: [poly[0], poly[i], poly[i + 1]] });
    }
    out = next;
  }
  return out;
}

// Ein Teil der Szene beschneiden: der Boden wird an den Ebenen geschnitten, alles, was darauf steht (Häuser, Bäume,
// Laternen – zusammenhängende Dreiecke oberhalb des Bodens), bleibt ganz oder fällt ganz weg. Ein angeschnittenes Haus
// stünde offen da: die Modelle haben weder Innenleben noch Schnittflächen
function clipPart(tris, planes) {
  if (!planes.length) return tris;
  const GROUND = TILE * 0.45, ground = [], solid = [];
  for (const t of tris) (Math.max(t.v[0][1], t.v[1][1], t.v[2][1]) <= GROUND ? ground : solid).push(t);
  const out = clipTris(ground, planes);
  const parent = Int32Array.from(solid, (_, i) => i);
  const find = i => { while (parent[i] !== i) { parent[i] = parent[parent[i]]; i = parent[i]; } return i; };
  const seen = new Map();
  solid.forEach((t, i) => {
    for (const v of t.v) {
      const key = `${Math.round(v[0] * 2)},${Math.round(v[1] * 2)},${Math.round(v[2] * 2)}`;
      if (seen.has(key)) parent[find(i)] = find(seen.get(key)); else seen.set(key, i);
    }
  });
  const EDGE = TILE * 0.75, outside = new Set();
  solid.forEach((t, i) => {
    if (t.v.some(v => planes.some(([nx, nz, d]) => nx * v[0] + nz * v[2] > d * TILE + EDGE))) outside.add(find(i));
  });
  solid.forEach((t, i) => { if (!outside.has(find(i))) out.push(t); });
  return out;
}

// --scene=szene.json: mehrere Matrizen in einem Bild, jede gedreht und verschoben, mit gemeinsamer Tiefenprüfung –
// Stratos City: Platz, Hauptstraße und die vier Straßen in ihren Fächerrichtungen (layout-unova.js schreibt die Szene).
// szene.json: { width, height (Kacheln), parts: [{ matrix, rotate, pivot, at, clip }] } → <ausgabe>/scene.png
function renderScene(sc, out) {
  const PITCH = (0x10000 - 0xd602) / 0x10000 * 2 * Math.PI, VIEW = [0, -Math.sin(PITCH), -Math.cos(PITCH)];   // Kamera wie render-platin.js
  const tris = [];
  for (const part of sc.parts) main(part.matrix, null, null, part.maxHeight ?? Infinity, null, 0, 0, { ...part, collect: tris });
  // fast genau von der Seite gesehene Flächen (Fassadenscheiben quer zur Kamera) ergeben nur Splitter – weglassen
  const seen = tris.filter(t => {
    const [a, b, c] = t.v, u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], w = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const n = [u[1] * w[2] - u[2] * w[1], u[2] * w[0] - u[0] * w[2], u[0] * w[1] - u[1] * w[0]], len = Math.hypot(...n);
    return len > 0 && Math.abs(n[0] * VIEW[0] + n[1] * VIEW[1] + n[2] * VIEW[2]) / len > 0.1;
  });
  const W = sc.width * TILE, H = sc.height * TILE, cv = new Canvas(W, H, 0, 0);
  for (const translucent of [false, true]) for (const tri of seen) drawTri(cv, tri, translucent);
  edgeMarking(cv);
  fs.mkdirSync(out, { recursive: true });
  writePNG(path.join(out, 'scene.png'), W, H, cv.rgba);
  fs.writeFileSync(path.join(out, 'scene.json'), JSON.stringify(sc));
  console.log(`Szene: ${sc.parts.length} Teile, ${seen.length}/${tris.length} Dreiecke, ${W}×${H}`);
}

// --layout=layout.json: alles rendern, was layout-unova.js braucht – Matrix 0 als m0 (Schwarz) und m0w (Weiß),
// jede Zusatzkarte als m<N> (Stratos City, Hafen und Himmelspfeilbrücke senkrecht von oben)
function renderLayout(file) {
  const layout = JSON.parse(fs.readFileSync(file, 'utf8')), base = path.resolve(positional[1] || 'render-unova');
  main(0, path.join(base, 'm0'));
  main(0, path.join(base, 'm0w'), 'white');
  // Füllmodelle für leere Stellen der zusammengesetzten Welt (compose-unova.py): Wald, Meer, Wüste, Gras, Fels
  const mapFiles = narcMembers(parseRomFiles(main.rom).get('a/0/0/8')), names = mapNames(mapFiles);
  for (const name of ['map_outtree', 'map_outsea', 'map_outdesert', 'map_outgrass', 'map_outrock']) {
    const id = names.indexOf(name);
    if (id >= 0) main(0, path.join(base, name.replace('map_', 'fill_')), null, Infinity, id);
  }
  if (layout.castelia && layout.castelia.scene) {
    const dir = path.join(base, 'castelia'), file = path.join(dir, 'scene-in.json');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(file, JSON.stringify(layout.castelia.scene));
    require('child_process').execFileSync(process.execPath, [__filename, ROM_PATH, dir, `--scene=${file}`, '--skip=w_gra|gra_w'], { stdio: 'inherit' });
  }
  for (const r of layout.render) {
    STATS.missingTex.clear();
    // Von oben (Stratos City): die Schrägsicht steckt fest im gemeinsamen Renderer – eigener Aufruf mit --shear=0
    if (r.topDown) {
      const extra = [...(r.pad ? [`--pad=${r.pad}`] : []), ...(r.skip ? [`--skip=${r.skip}`] : [])];
      require('child_process').execFileSync(process.execPath, [__filename, ROM_PATH, path.join(base, `m${r.matrix}`), `--matrix=${r.matrix}`, '--shear=0', ...extra], { stdio: 'inherit' });
      continue;
    }
    main(r.matrix, path.join(base, `m${r.matrix}`), null, r.maxHeight ?? Infinity);
  }
}
if (require.main === module) {
  try {
    if (opts.layout) renderLayout(path.resolve(opts.layout));
    else if (opts.scene) renderScene(JSON.parse(fs.readFileSync(path.resolve(opts.scene), 'utf8')), path.resolve(positional[1] || 'render-unova'));
    else main();
  }
  catch (error) { console.error(error); process.exit(1); }
}
module.exports = { parseRomFiles, narcMembers, parseMatrix, bmdName, mapNames, whiteVariant };
