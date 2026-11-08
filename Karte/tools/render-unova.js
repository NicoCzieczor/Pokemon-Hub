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
 *   node render-unova.js <black-or-white.nds> <ausgabe> [--matrix=0]
 *                         [--only=zeile,spalte;zeile,spalte]
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
const OUT = path.resolve(positional[1] || 'render-unova');
const MATRIX_ID = Number(opts.matrix || 0);
fs.mkdirSync(OUT, { recursive: true });

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

function main() {
  const rom = fs.readFileSync(ROM_PATH);
  const title = rom.toString('latin1', 0, 12).replace(/\0+$/, '');
  const gameCode = rom.toString('latin1', 0x0c, 0x10);
  if (!/^IR[ABCD][A-Z]$/.test(gameCode)) throw new Error(`Erwartet wurde Pokémon Schwarz/Weiß oder Schwarz 2/Weiß 2, gefunden: ${title} (${gameCode}).`);
  console.log(`ROM: ${title} (${gameCode}), ${Math.round(rom.length / 1024 / 1024)} MiB`);
  const files = parseRomFiles(rom);
  const required = name => {
    const file = files.get(name);
    if (!file) throw new Error(`ROM-Datei ${name} fehlt.`);
    return file;
  };
  const mapFiles = narcMembers(required('a/0/0/8'));
  const matrices = narcMembers(required('a/0/0/9'));
  const textureFiles = narcMembers(required('a/0/1/4'));
  if (!matrices[MATRIX_ID]) throw new Error(`Matrix ${MATRIX_ID} fehlt.`);
  const matrix = parseMatrix(matrices[MATRIX_ID], MATRIX_ID);
  console.log(`Matrix ${MATRIX_ID}: ${matrix.width}×${matrix.height}, Modus ${matrix.mode}; Karten ${mapFiles.length}, Texturbanken ${textureFiles.length}`);

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
  console.log(`Texturindex: ${textureIndex.size} Texturen, ${paletteIndex.size} Paletten in ${textureSets.length} Banken`);

  const bindMaterial = mat => {
    if (mat.bound) return;
    mat.bound = true;
    if (!mat.tex) return;
    const candidates = textureIndex.get(mat.tex) || [];
    const tset = candidates.find(set => !mat.pal || set.palettes.has(mat.pal)) || candidates[0];
    if (!tset) { STATS.missingTex.add(mat.tex); return; }
    const pset = !mat.pal ? null : (tset.palettes.has(mat.pal) ? tset : (paletteIndex.get(mat.pal) || [])[0]);
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

  const modelCache = new Map(), geometryCache = new Map();
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

  const EMPTY = 0xffffffff;
  const used = [];
  for (let row = 0; row < matrix.height; row++) for (let col = 0; col < matrix.width; col++) {
    if (matrix.maps[row][col] !== EMPTY) used.push([row, col]);
  }
  const minRow = Math.min(...used.map(x => x[0])), maxRow = Math.max(...used.map(x => x[0]));
  const minCol = Math.min(...used.map(x => x[1])), maxCol = Math.max(...used.map(x => x[1]));
  const rows = maxRow - minRow + 1, cols = maxCol - minCol + 1;

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
    const world = [1, 0, 0, centerX, 0, 1, 0, 0, 0, 0, 1, centerZ];
    const tris = [];
    for (const draw of runSbc(model)) {
      const mat = model.mats[draw.mat];
      if (!mat || !model.shapes[draw.shp] || ((mat.polyAttr >> 4) & 3) === 3) continue;
      bindMaterial(mat);
      emitShape(model.shapes[draw.shp], draw.mtx, draw.stack, mat, null, world, model.posScale, tris);
    }
    const result = { id, name: model.name, tris };
    geometryCache.set(key, result);
    return result;
  };

  let targets = used.slice();
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
    chunks: {},
  };
  const started = Date.now();
  let done = 0;
  for (const [row, col] of targets) {
    const localRow = row - minRow, localCol = col - minCol;
    const cv = new Canvas(SIZE, SIZE, localCol * SIZE, localRow * SIZE);
    const around = [];
    for (let dr = -1; dr <= 2; dr++) for (let dc = -1; dc <= 1; dc++) {
      const geometry = blockGeometry(row + dr, col + dc);
      if (geometry) around.push(geometry);
    }
    for (const translucent of [false, true]) for (const geometry of around) for (const tri of geometry.tris) drawTri(cv, tri, translucent);
    edgeMarking(cv);
    if (cv.rgba.some((value, index) => index % 4 === 3 && value)) writePNG(path.join(OUT, `chunk_${localRow}_${localCol}.png`), SIZE, SIZE, cv.rgba);
    const own = blockGeometry(row, col);
    info.chunks[`${localRow}:${localCol}`] = { map: own?.id ?? matrix.maps[row][col], name: own?.name || '', ground: 0 };
    done++;
    if (done % 10 === 0 || done === targets.length) console.log(`  ${done}/${targets.length} (${Math.round((Date.now() - started) / 1000)} s)`);
    for (const cacheKey of [...geometryCache.keys()]) {
      const oldRow = +cacheKey.split(':')[0];
      if (oldRow < row - 2) geometryCache.delete(cacheKey);
    }
  }
  fs.writeFileSync(path.join(OUT, 'render.json'), JSON.stringify(info));
  console.log(`Fertig. Modelle: ${modelCache.size}; fehlende Texturen: ${STATS.missingTex.size}`);
  if (STATS.missingTex.size) console.log('  Fehlend:', [...STATS.missingTex].slice(0, 80).join(', '));
  if (STATS.unknownGx.size) console.log('  Unbekannte GX-Befehle:', [...STATS.unknownGx].map(x => `0x${x.toString(16)}`).join(', '));
}

try { main(); }
catch (error) { console.error(error); process.exit(1); }
