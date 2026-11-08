#!/usr/bin/env node
/*
 * Rendert die gemeinsame Sinnoh-Oberwelt von Pokemon Diamant/Perl direkt aus
 * einem lokalen pret/pokediamond-Checkout. Verwendet werden die originalen
 * Landmodelle, Gebaeudemodelle, Texturbanken und die Weltmatrix des Spiels.
 *
 * Aufruf:
 *   node render-diamond-pearl.js <pokediamond> <ausgabe> [--only=zeile,spalte;...]
 */
'use strict';

const fs = require('fs');
const path = require('path');
const {
  TILE, CH, SIZE, SHEAR, STATS,
  writePNG, nitroBlocks, parseTex0, decodeTexture, parseBMD, runSbc, emitShape,
  Canvas, drawTri, edgeMarking, parseBdhc,
} = require('./render-platin.js');

const argv = process.argv.slice(2);
const positional = argv.filter(arg => !arg.startsWith('--'));
const opts = Object.fromEntries(argv.filter(arg => arg.startsWith('--')).map(arg => {
  const [key, value] = arg.slice(2).split('=');
  return [key, value == null ? '1' : value];
}));
const SOURCE = path.resolve(positional[0] || '.tmp-pokediamond-source');
const OUT = path.resolve(positional[1] || 'render-diamond-pearl');
fs.mkdirSync(OUT, { recursive: true });

const sourcePath = (...parts) => path.join(SOURCE, ...parts);
const read = (...parts) => fs.readFileSync(sourcePath(...parts));
const readText = (...parts) => fs.readFileSync(sourcePath(...parts), 'utf8');
const memberName = id => `narc_${String(id).padStart(4, '0')}`;

function member(dir, id, optional = false) {
  const prefix = memberName(id);
  const name = fs.readdirSync(sourcePath(...dir)).find(file => file.startsWith(prefix + '.'));
  if (!name) {
    if (optional) return null;
    throw new Error(`NARC-Mitglied fehlt: ${dir.join('/')} / ${prefix}`);
  }
  return read(...dir, name);
}

function parseMatrix(buf) {
  let at = 0;
  const width = buf[at++], height = buf[at++], hasHeaders = buf[at++], hasAltitudes = buf[at++], nameLength = buf[at++];
  const name = buf.toString('ascii', at, at + nameLength); at += nameLength;
  const count = width * height;
  const flatHeaders = new Array(count).fill(0);
  if (hasHeaders) {
    for (let i = 0; i < count; i++) flatHeaders[i] = buf.readUInt16LE(at + i * 2);
    at += count * 2;
  }
  const flatAltitudes = new Array(count).fill(0);
  if (hasAltitudes) {
    for (let i = 0; i < count; i++) flatAltitudes[i] = buf[at + i];
    at += count;
  }
  const flatModels = Array.from({ length: count }, (_, i) => buf.readUInt16LE(at + i * 2));
  const rows = list => Array.from({ length: height }, (_, row) => list.slice(row * width, (row + 1) * width));
  return { width, height, name, headers: rows(flatHeaders), altitudes: rows(flatAltitudes), models: rows(flatModels) };
}

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

function numericSuffix(value) {
  const match = String(value || '').match(/(?:narc_)?(\d+)(?:_bin)?$/i);
  return match ? +match[1] : +value || 0;
}

function parseHeaders() {
  const source = readText('arm9', 'src', 'map_header.c');
  const headers = new Map();
  let id = 0;
  for (const match of source.matchAll(/^\s*\{([^\n]+)\},\s*\/\/\s*(MAP_\w+)/gm)) {
    const fields = splitFields(match[1]);
    headers.set(id, {
      id,
      name: match[2],
      area: numericSuffix(fields[0]),
      matrix: numericSuffix(fields[2]),
      mapsec: fields[10],
      type: +fields[13],
    });
    id++;
  }
  return headers;
}

function textureSet(buf) {
  if (!buf) return null;
  try {
    const tex0 = nitroBlocks(buf, 0).TEX0;
    return tex0 == null ? null : parseTex0(buf, tex0);
  } catch (_) {
    return null;
  }
}

const matrix = parseMatrix(member(['files', 'fielddata', 'mapmatrix', 'map_matrix'], 0));
const headers = parseHeaders();
const areaDataDir = ['files', 'fielddata', 'areadata', 'area_data'];
const mapTextureDir = ['files', 'fielddata', 'areadata', 'area_map_tex', 'map_tex_set'];
const propTextureDir = ['files', 'fielddata', 'areadata', 'area_build_model', 'areabm_texset'];
const landDir = ['files', 'fielddata', 'land_data', 'land_data_release'];
const propDir = ['files', 'fielddata', 'build_model', 'build_model'];

const areaCache = new Map();
function area(id) {
  if (areaCache.has(id)) return areaCache.get(id);
  const config = member(areaDataDir, id);
  const propTextureId = config.readUInt16LE(0), mapTextureId = config.readUInt16LE(2);
  const result = {
    id,
    map: textureSet(member(mapTextureDir, mapTextureId, true)),
    prop: textureSet(member(propTextureDir, propTextureId, true)),
  };
  areaCache.set(id, result);
  return result;
}

function bindMaterial(mat, preferred, fallbacks) {
  if (mat.bound) return;
  mat.bound = true;
  if (!mat.tex) return;
  const sets = [preferred, ...(fallbacks || [])].filter(Boolean);
  const texSet = sets.find(set => set.textures.has(mat.tex));
  if (!texSet) { STATS.missingTex.add(mat.tex); return; }
  const palSet = !mat.pal ? null : (sets.find(set => set.palettes.has(mat.pal)) || null);
  try {
    const info = texSet.textures.get(mat.tex);
    mat.texImg = decodeTexture(texSet, mat.tex, palSet, mat.pal);
    mat.texFmt = info.fmt;
    mat.texW = info.w;
    mat.texH = info.h;
  } catch (_) {
    STATS.missingTex.add(`${mat.tex}/${mat.pal || '-'}`);
  }
}

const landCache = new Map(), propCache = new Map(), geometryCache = new Map();
function land(id) {
  if (!landCache.has(id)) landCache.set(id, member(landDir, id, true));
  return landCache.get(id);
}
function propModel(id) {
  if (propCache.has(id)) return propCache.get(id);
  const buf = member(propDir, id, true);
  let model = null;
  try { if (buf && buf.toString('latin1', 0, 4) === 'BMD0') model = parseBMD(buf); } catch (_) {}
  propCache.set(id, model);
  return model;
}

async function blockGeometry(row, col) {
  const key = `${row}:${col}`;
  if (geometryCache.has(key)) return geometryCache.get(key);
  if (row < 0 || col < 0 || row >= matrix.height || col >= matrix.width) return null;
  const modelId = matrix.models[row][col];
  if (modelId === 0xffff) return null;
  const buf = land(modelId);
  if (!buf || buf.length < 20) return null;
  const attrSize = buf.readUInt32LE(0), propSize = buf.readUInt32LE(4), modelSize = buf.readUInt32LE(8);
  const modelOffset = 16 + attrSize + propSize;
  let model;
  try { model = parseBMD(buf, modelOffset); } catch (_) { return null; }

  const headerId = matrix.headers[row][col];
  const header = headers.get(headerId) || headers.get(0);
  const textures = area(header?.area || 0);
  const filler = headerId <= 1;
  const altitude = filler ? 0 : matrix.altitudes[row][col] * TILE / 2;
  const ox = col * SIZE + SIZE / 2, oz = row * SIZE + SIZE / 2;
  const world = [1, 0, 0, ox, 0, 1, 0, altitude, 0, 0, 1, oz];
  const tris = [];

  for (const draw of runSbc(model)) {
    const mat = model.mats[draw.mat];
    if (!mat || !model.shapes[draw.shp] || ((mat.polyAttr >> 4) & 3) === 3) continue;
    bindMaterial(mat, textures.map, [model.tex, textures.prop]);
    emitShape(model.shapes[draw.shp], draw.mtx, draw.stack, mat, null, world, model.posScale, tris);
  }

  const propStart = 16 + attrSize;
  for (let at = propStart; at + 48 <= propStart + propSize; at += 48) {
    const id = buf.readUInt32LE(at);
    if (!id) continue;
    const prop = propModel(id);
    if (!prop) continue;
    const px = buf.readInt32LE(at + 4) / 4096, py = buf.readInt32LE(at + 8) / 4096, pz = buf.readInt32LE(at + 12) / 4096;
    const sx = buf.readInt32LE(at + 28) / 4096, sy = buf.readInt32LE(at + 32) / 4096, sz = buf.readInt32LE(at + 36) / 4096;
    const placement = [sx, 0, 0, ox + px, 0, sy, 0, altitude + py, 0, 0, sz, oz + pz];
    for (const draw of runSbc(prop)) {
      const mat = prop.mats[draw.mat];
      if (!mat || !prop.shapes[draw.shp] || ((mat.polyAttr >> 4) & 3) === 3) continue;
      bindMaterial(mat, textures.prop, [prop.tex, textures.map]);
      emitShape(prop.shapes[draw.shp], draw.mtx, draw.stack, mat, null, placement, prop.posScale, tris);
    }
  }

  // Der DP-BDHC-Block hat bei einzelnen Karten noch das aeltere, nicht vollstaendig
  // dokumentierte Layout. Die UI setzt fuer diese Karte keine Punktmarker; ein
  // unlesbarer Hoehenblock darf deshalb das echte Kartenbild nicht blockieren.
  let heights = null;
  if (!filler) {
    try { heights = parseBdhc(buf, modelOffset + modelSize); } catch (_) {}
  }
  const result = { tris, heights, headerId, modelId };
  geometryCache.set(key, result);
  return result;
}

async function main() {
  const real = [];
  for (let row = 0; row < matrix.height; row++) for (let col = 0; col < matrix.width; col++) {
    if (matrix.headers[row][col] > 1 && matrix.models[row][col] !== 0xffff) real.push([row, col]);
  }
  const minRow = Math.max(0, Math.min(...real.map(cell => cell[0])) - 1);
  const maxRow = Math.min(matrix.height - 1, Math.max(...real.map(cell => cell[0])) + 1);
  const minCol = Math.max(0, Math.min(...real.map(cell => cell[1])) - 1);
  const maxCol = Math.min(matrix.width - 1, Math.max(...real.map(cell => cell[1])) + 1);
  let targets = real.slice();
  if (opts.only) {
    const wanted = new Set(opts.only.split(';').map(value => value.trim()));
    targets = targets.filter(([row, col]) => wanted.has(`${row},${col}`));
  }

  console.log(`Rendere Diamant/Perl-Oberwelt: ${targets.length} Bloecke (${minCol},${minRow}) bis (${maxCol},${maxRow})`);
  const info = {
    rows: maxRow - minRow + 1,
    cols: maxCol - minCol + 1,
    size: SIZE,
    shear: SHEAR,
    origin: [minCol * CH, minRow * CH],
    chunks: {},
  };
  const started = Date.now();
  let done = 0;
  for (const [row, col] of targets.sort((a, b) => a[0] - b[0] || a[1] - b[1])) {
    const canvas = new Canvas(SIZE, SIZE, col * SIZE, row * SIZE);
    const nearby = [];
    for (let dr = -1; dr <= 2; dr++) for (let dc = -1; dc <= 1; dc++) {
      const geometry = await blockGeometry(row + dr, col + dc);
      if (geometry) nearby.push(geometry);
    }
    for (const transparent of [false, true]) for (const geometry of nearby) {
      for (const triangle of geometry.tris) drawTri(canvas, triangle, transparent);
    }
    edgeMarking(canvas);
    const outRow = row - minRow, outCol = col - minCol;
    if (canvas.rgba.some((value, index) => index % 4 === 3 && value)) {
      writePNG(path.join(OUT, `chunk_${outRow}_${outCol}.png`), SIZE, SIZE, canvas.rgba);
    }
    const own = await blockGeometry(row, col);
    info.chunks[`${outRow}:${outCol}`] = { header: own?.headerId, model: own?.modelId, ground: own?.heights || 0 };
    done++;
    if (done % 20 === 0 || done === targets.length) console.log(`  ${done}/${targets.length} (${Math.round((Date.now() - started) / 1000)} s)`);
    for (const cacheKey of [...geometryCache.keys()]) {
      if (+cacheKey.split(':')[0] < row - 2) geometryCache.delete(cacheKey);
    }
  }
  fs.writeFileSync(path.join(OUT, 'render.json'), JSON.stringify(info));
  console.log(`Fertig. Landmodelle: ${landCache.size}, Gebaeudemodelle: ${propCache.size}, fehlende Texturen: ${STATS.missingTex.size}`);
}

main().catch(error => { console.error(error); process.exit(1); });
