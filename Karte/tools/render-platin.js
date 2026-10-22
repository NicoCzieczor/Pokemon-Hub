/*
 * Rendert die Oberwelt von Pokémon Platin aus den Original-Spieldaten (pret/pokeplatinum):
 * die 3D-Kartenmodelle (NSBMD in map_data_*.bin) mit den Kartentexturen ihres Gebiets, dazu Gebäude
 * und Requisiten mit ihren Texturen – beleuchtet mit dem Tageslicht des Spiels.
 *
 * Projektion: parallel aus der Blickrichtung der Spielkamera, aber so geschert, dass der Boden
 * unverzerrt bleibt (16 Pixel pro Kachel). Höher liegende Flächen rutschen dadurch etwas nach oben –
 * wie im Spiel; Gebäude zeigen ihre Fassade. Die Bodenhöhe jeder Kachel (aus den BDHC-Daten) steht in
 * render.json, damit die Karte ihre Marker passend verschieben kann.
 *
 * Die Matrix enthält neben den echten Blöcken flache Füll-Kulissen (Wald, Fels, Meer, Schnee). Sie werden
 * ohne ihre Matrix-Höhe gezeichnet und liegen zusätzlich als Hintergrund unter jedem Block, damit die
 * Schrägsicht keine Lücken aufreißt; Löcher im Land füllt die nächstgelegene Kulisse.
 *
 * Dazu kommen die Innenkarten (Höhlen, Gebäude, Wälder …), die platin.json unter „maps" aufführt – also
 * zuerst build-platin.js laufen lassen.
 *
 * Aufruf (Node 18+):  node render-platin.js <ausgabe-ordner> [cache-ordner] [--data=platin.json]
 *                     [--only=TWINLEAF_TOWN,…|Zeile:Spalte,…|map_matrix_009,…] [--interiors-only] [--no-interiors]
 * Ausgabe: <ausgabe>/chunk_<Zeile>_<Spalte>.png (512 × 512 je Kartenblock) + render.json,
 *          <ausgabe>/interior_<Matrix>__<Gebiet>.png + interiors.json
 * Danach baut make-tiles.py daraus die Kartenblätter (Karte/tiles/).
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const zlib = require('zlib');

const argv = process.argv.slice(2);
const opts = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const [outArg, cacheArg] = argv.filter(a => !a.startsWith('--'));
const OUT = path.resolve(outArg || 'render');
const CACHE = path.resolve(cacheArg || path.join(os.tmpdir(), 'platin-karte-cache'));
const RAW = 'https://raw.githubusercontent.com/pret/pokeplatinum/main/';
fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(OUT, { recursive: true });

const TILE = 16;            // Welteinheiten pro Kachel
const CH = 32;              // Kacheln pro Kartenblock
const SIZE = CH * TILE;     // 512 Pixel pro Block (1 Pixel = 1 Welteinheit)
// Spielkamera: um 0xD602 geneigt ≈ 59° unter der Waagerechten
const PITCH = (0x10000 - 0xd602) / 0x10000 * 2 * Math.PI;
const SHEAR = opts.shear != null ? +opts.shear : 1 / Math.tan(PITCH); // Bildversatz nach oben je Höheneinheit
const VIEW = [0, -Math.sin(PITCH), -Math.cos(PITCH)];                  // Blickrichtung in Weltkoordinaten
const DEPTH_EPS = 1e-3;
const FRONT_SIGN = opts.front != null ? +opts.front : -1; // Vorzeichen der Bildfläche einer Vorderseite

// ── Laden mit Cache ──────────────────────────────────────────────────────────
async function get(p, { binary = false, optional = false } = {}) {
  const file = path.join(CACHE, p.replace(/[^\w.-]+/g, '_'));
  if (fs.existsSync(file)) {
    const buf = fs.readFileSync(file);
    if (buf.length === 0 && optional) return null;
    return binary ? buf : buf.toString('utf8');
  }
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(RAW + p);
      if (r.status === 404 && optional) { fs.writeFileSync(file, ''); return null; }
      if (!r.ok) throw new Error(`${r.status} ${p}`);
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(file, buf);
      return binary ? buf : buf.toString('utf8');
    } catch (e) {
      if (attempt >= 4) throw e;
      await new Promise(res => setTimeout(res, 800 * attempt));
    }
  }
}
const getJSON = async p => JSON.parse(await get(p));
async function pool(items, n, fn) {
  let i = 0;
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; await fn(items[k], k); } }));
}

// ── PNG (RGBA) schreiben ─────────────────────────────────────────────────────
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (const b of buf) c = CRC[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function pngChunk(type, data) {
  const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
  const td = Buffer.concat([Buffer.from(type), data]);
  const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td));
  return Buffer.concat([len, td, crc]);
}
function writePNG(file, w, h, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 6;
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  fs.writeFileSync(file, Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    pngChunk('IHDR', ihdr), pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })), pngChunk('IEND', Buffer.alloc(0)),
  ]));
}

// ── Nitro-Dateien (NSBMD / NSBTX) ────────────────────────────────────────────
function readName(buf, o) { let s = ''; for (let i = 0; i < 16 && buf[o + i]; i++) s += String.fromCharCode(buf[o + i]); return s; }
// Wörterbuch mit 16-Zeichen-Namen; fn bekommt den Offset des Eintrags
function parseDict(buf, o, fn) {
  const n = buf[o + 1];
  const eo = o + buf.readUInt16LE(o + 6);
  const unit = buf.readUInt16LE(eo), no = eo + buf.readUInt16LE(eo + 2);
  return Array.from({ length: n }, (_, i) => ({ name: readName(buf, no + i * 16), value: fn(eo + 4 + i * unit) }));
}
function nitroBlocks(buf, base) {
  const out = {};
  const n = buf.readUInt16LE(base + 0x0e);
  for (let i = 0; i < n; i++) { const o = base + buf.readUInt32LE(base + 0x10 + i * 4); out[buf.toString('latin1', o, o + 4)] = o; }
  return out;
}

// Texturen
const c5 = v => (v << 3) | (v >> 2);
function parseTex0(buf, o) {
  const texDict = o + buf.readUInt16LE(o + 0x0e), texData = o + buf.readUInt32LE(o + 0x14);
  const t4Data = o + buf.readUInt32LE(o + 0x24), t4Pal = o + buf.readUInt32LE(o + 0x28);
  const palDict = o + buf.readUInt32LE(o + 0x34), palData = o + buf.readUInt32LE(o + 0x38);
  const textures = new Map(), palettes = new Map();
  for (const { name, value: p } of parseDict(buf, texDict, e => buf.readUInt32LE(e))) {
    const fmt = (p >>> 26) & 7, off = (p & 0xffff) << 3;
    textures.set(name, { fmt, w: 8 << ((p >>> 20) & 7), h: 8 << ((p >>> 23) & 7), color0: !!((p >>> 29) & 1),
      data: (fmt === 5 ? t4Data : texData) + off, palIdx: fmt === 5 ? t4Pal + (off >>> 1) : 0 });
  }
  for (const { name, value } of parseDict(buf, palDict, e => buf.readUInt16LE(e))) palettes.set(name, palData + (value << 3));
  return { buf, textures, palettes, decoded: new Map() };
}
function decodeTexture(set, texName, palSet, palName) {
  const key = `${texName}|${palName}`;
  if (set.decoded.has(key)) return set.decoded.get(key);
  const t = set.textures.get(texName);
  const buf = set.buf, pbuf = palSet ? palSet.buf : null;
  const pal = palSet ? palSet.palettes.get(palName) : -1;
  const { w, h, fmt } = t;
  const px = new Uint8Array(w * h * 4);
  const col = (i, o, a = 255) => {
    const p = pal + i * 2;
    if (!pbuf || p < 0 || p + 1 >= pbuf.length) { px[o] = 255; px[o + 1] = 0; px[o + 2] = 255; px[o + 3] = a; return; }
    const v = pbuf.readUInt16LE(p);
    px[o] = c5(v & 31); px[o + 1] = c5((v >> 5) & 31); px[o + 2] = c5((v >> 10) & 31); px[o + 3] = a;
  };
  const n = w * h;
  if (fmt === 1) { // A3I5
    for (let i = 0; i < n; i++) { const b = buf[t.data + i], a = b >> 5; col(b & 31, i * 4, Math.round(((a << 2) + (a >> 1)) * 255 / 31)); }
  } else if (fmt === 2 || fmt === 3 || fmt === 4) { // 4 / 16 / 256 Farben
    const bits = fmt === 2 ? 2 : fmt === 3 ? 4 : 8, per = 8 / bits, mask = (1 << bits) - 1;
    for (let i = 0; i < n; i++) {
      const idx = (buf[t.data + Math.floor(i / per)] >> ((i % per) * bits)) & mask;
      if (idx === 0 && t.color0) px[i * 4 + 3] = 0; else col(idx, i * 4);
    }
  } else if (fmt === 5) { // 4×4-komprimiert
    const bw = w / 4;
    const c = (base, i) => { const p = base + i * 2; if (!pbuf || p + 1 >= pbuf.length) return [255, 0, 255, 255]; const v = pbuf.readUInt16LE(p); return [c5(v & 31), c5((v >> 5) & 31), c5((v >> 10) & 31), 255]; };
    const mix = (a, b, wa, wb) => [0, 1, 2].map(k => Math.round((a[k] * wa + b[k] * wb) / (wa + wb))).concat(255);
    const clear = [0, 0, 0, 0];
    for (let by = 0; by < h / 4; by++) for (let bx = 0; bx < bw; bx++) {
      const blk = by * bw + bx;
      const texel = buf.readUInt32LE(t.data + blk * 4), pi = buf.readUInt16LE(t.palIdx + blk * 2);
      const base = pal + (pi & 0x3fff) * 4, mode = pi >> 14;
      const c0 = c(base, 0), c1 = c(base, 1);
      const C = mode === 0 ? [c0, c1, c(base, 2), clear] : mode === 1 ? [c0, c1, mix(c0, c1, 1, 1), clear]
        : mode === 2 ? [c0, c1, c(base, 2), c(base, 3)] : [c0, c1, mix(c0, c1, 5, 3), mix(c0, c1, 3, 5)];
      for (let y = 0; y < 4; y++) for (let x = 0; x < 4; x++) px.set(C[(texel >>> ((y * 4 + x) * 2)) & 3], ((by * 4 + y) * w + bx * 4 + x) * 4);
    }
  } else if (fmt === 6) { // A5I3
    for (let i = 0; i < n; i++) { const b = buf[t.data + i]; col(b & 7, i * 4, Math.round((b >> 3) * 255 / 31)); }
  } else if (fmt === 7) { // Direktfarbe
    for (let i = 0; i < n; i++) { const v = buf.readUInt16LE(t.data + i * 2); px[i * 4] = c5(v & 31); px[i * 4 + 1] = c5((v >> 5) & 31); px[i * 4 + 2] = c5((v >> 10) & 31); px[i * 4 + 3] = v & 0x8000 ? 255 : 0; }
  }
  const out = { w, h, px };
  set.decoded.set(key, out);
  return out;
}

// Modelle
const IDENT = [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0]; // 3×4, Spaltenvektoren: x' = m0·x + m1·y + m2·z + m3
function mul(a, b) {
  const o = new Array(12);
  for (let r = 0; r < 3; r++) {
    for (let c = 0; c < 3; c++) o[r * 4 + c] = a[r * 4] * b[c] + a[r * 4 + 1] * b[4 + c] + a[r * 4 + 2] * b[8 + c];
    o[r * 4 + 3] = a[r * 4] * b[3] + a[r * 4 + 1] * b[7] + a[r * 4 + 2] * b[11] + a[r * 4 + 3];
  }
  return o;
}
function parseNode(buf, o) {
  const flag = buf.readUInt16LE(o);
  let p = o + 4;
  let t = [0, 0, 0], r = [1, 0, 0, 0, 1, 0, 0, 0, 1], s = [1, 1, 1];
  if (!(flag & 1)) { t = [0, 4, 8].map(k => buf.readInt32LE(p + k) / 4096); p += 12; }
  if (!(flag & 2)) {
    if (flag & 8) { // komprimierte Rotation um eine Pivot-Achse
      const A = buf.readInt16LE(p) / 4096, B = buf.readInt16LE(p + 2) / 4096; p += 4;
      const pivot = (flag >> 4) & 15;
      r = new Array(9).fill(0);
      r[pivot] = flag & 0x100 ? -1 : 1;
      const rows = [0, 1, 2].filter(x => x !== Math.floor(pivot / 3)), cols = [0, 1, 2].filter(x => x !== pivot % 3);
      r[rows[0] * 3 + cols[0]] = A; r[rows[0] * 3 + cols[1]] = B;
      r[rows[1] * 3 + cols[0]] = flag & 0x200 ? -B : B; r[rows[1] * 3 + cols[1]] = flag & 0x400 ? -A : A;
    } else {
      r = [buf.readInt16LE(o + 2) / 4096];
      for (let i = 0; i < 8; i++) r.push(buf.readInt16LE(p + i * 2) / 4096);
      p += 16;
    }
  }
  if (!(flag & 4)) s = [0, 4, 8].map(k => buf.readInt32LE(p + k) / 4096);
  // Nitro rechnet mit Zeilenvektoren (v · S · R + T)
  const m = new Array(12);
  for (let j = 0; j < 3; j++) { for (let i = 0; i < 3; i++) m[j * 4 + i] = r[i * 3 + j] * s[i]; m[j * 4 + 3] = t[j]; }
  return m;
}
function parseMaterial(buf, o) {
  const flag = buf.readUInt16LE(o + 0x1e);
  const m = { diffAmb: buf.readUInt32LE(o + 4), specEmi: buf.readUInt32LE(o + 8), polyAttr: buf.readUInt32LE(o + 0x0c),
    texParam: buf.readUInt32LE(o + 0x14), flag, tex: null, pal: null, sS: 1, sT: 1, tS: 0, tT: 0 };
  let p = o + 0x2c;
  if (!(flag & 2)) { m.sS = buf.readInt32LE(p) / 4096; m.sT = buf.readInt32LE(p + 4) / 4096; p += 8; }
  if (!(flag & 4)) p += 4;
  if (!(flag & 8)) { m.tS = buf.readInt32LE(p) / 4096; m.tT = buf.readInt32LE(p + 4) / 4096; }
  return m;
}
function parseBMD(buf, base = 0) {
  const b = nitroBlocks(buf, base);
  const tex = b.TEX0 != null ? parseTex0(buf, b.TEX0) : null;
  const mdl0 = b.MDL0;
  const mo = mdl0 + buf.readUInt32LE(parseDict(buf, mdl0 + 8, e => e)[0].value);
  const matSet = mo + buf.readUInt32LE(mo + 0x08), shpSet = mo + buf.readUInt32LE(mo + 0x0c);
  const nodeInfo = mo + 0x40;
  const nodes = parseDict(buf, nodeInfo, e => parseNode(buf, nodeInfo + buf.readUInt32LE(e))).map(d => d.value);
  const mats = parseDict(buf, matSet + 4, e => parseMaterial(buf, matSet + buf.readUInt32LE(e))).map(d => d.value);
  const bind = (dictOff, key) => {
    for (const { name, value: [lo, n] } of parseDict(buf, dictOff, e => [matSet + buf.readUInt16LE(e), buf[e + 2]])) {
      for (let i = 0; i < n; i++) if (mats[buf[lo + i]]) mats[buf[lo + i]][key] = name;
    }
  };
  bind(matSet + buf.readUInt16LE(matSet), 'tex');
  bind(matSet + buf.readUInt16LE(matSet + 2), 'pal');
  const shapes = parseDict(buf, shpSet, e => {
    const so = shpSet + buf.readUInt32LE(e), dl = so + buf.readUInt32LE(so + 8);
    return buf.subarray(dl, dl + buf.readUInt32LE(so + 12));
  }).map(d => d.value);
  return { buf, sbc: mo + buf.readUInt32LE(mo + 0x04), nodes, mats, shapes, posScale: buf.readInt32LE(mo + 0x1c) / 4096, tex };
}

// Bytecode des Modells: welche Shapes mit welchem Material und welcher Matrix
function runSbc(model) {
  const { buf } = model;
  const draws = [], stack = [];
  let cur = IDENT, mat = -1, i = model.sbc, visible = true;
  const nodeVis = [];
  for (let guard = 0; guard < 100000; guard++) {
    const op = buf[i], cmd = op & 0x1f, opt = op & 0xe0;
    if (cmd === 0x01) break;
    switch (cmd) {
      case 0x00: i += 1; break;
      case 0x02: nodeVis[buf[i + 1]] = buf[i + 2] & 1; visible = !!(buf[i + 2] & 1); i += 3; break;
      case 0x03: cur = stack[buf[i + 1]] || IDENT; i += 2; break;
      case 0x04: mat = buf[i + 1]; i += 2; break;
      case 0x05: if (visible) draws.push({ mat, shp: buf[i + 1], mtx: cur, stack: stack.slice() }); i += 2; break;
      case 0x06: {
        const node = buf[i + 1];
        let p = i + 4, dest = -1, src = -1;
        if (opt & 0x20) dest = buf[p++];
        if (opt & 0x40) src = buf[p++];
        if (src >= 0) cur = stack[src] || IDENT;
        cur = mul(cur, model.nodes[node] || IDENT);
        if (dest >= 0) stack[dest] = cur;
        i = p;
        break;
      }
      case 0x07: case 0x08: i += 2 + (opt & 0x20 ? 1 : 0) + (opt & 0x40 ? 1 : 0); break;
      case 0x09: i += 3 + 3 * buf[i + 2]; break;
      case 0x0a: i += 9; break;
      case 0x0b: i += 1; break;
      case 0x0c: case 0x0d: i += 3; break;
      default: throw new Error(`Unbekannter SBC-Befehl 0x${op.toString(16)}`);
    }
  }
  return draws;
}

// ── Beleuchtung ──────────────────────────────────────────────────────────────
// Tageslicht um 13 Uhr (endTime zählt in 2-Sekunden-Schritten)
function pickDaylight(set) {
  const t = 13 * 1800;
  const e = set.find(x => x.endTime >= t) || set[set.length - 1];
  const rgb = c => [c.red, c.green, c.blue];
  return {
    lights: e.lights.map(l => ({ on: l.enabled, c: rgb(l.color), d: [l.direction.x, l.direction.y, l.direction.z] })),
    diff: rgb(e.diffuseColor), amb: rgb(e.ambientColor), spec: rgb(e.specularColor), emi: rgb(e.emissionColor),
  };
}
const rgb5 = v => [v & 31, (v >> 5) & 31, (v >> 10) & 31];
// DS-Lichtformel (GBATEK), Farben 0–31
function lightVertex(n, polyAttr, L) {
  const out = L.emi.slice();
  for (let k = 0; k < 4; k++) {
    const l = L.lights[k];
    if (!(polyAttr & (1 << k)) || !l.on) continue;
    const dl = Math.max(0, -(l.d[0] * n[0] + l.d[1] * n[1] + l.d[2] * n[2]));
    const h = [(l.d[0] + VIEW[0]) / 2, (l.d[1] + VIEW[1]) / 2, (l.d[2] + VIEW[2]) / 2];
    let sl = Math.max(0, -(h[0] * n[0] + h[1] * n[1] + h[2] * n[2]));
    sl = Math.min(1, sl * sl);
    for (let c = 0; c < 3; c++) out[c] += (L.spec[c] * l.c[c] * sl + L.diff[c] * l.c[c] * dl + L.amb[c] * l.c[c]) / 31;
  }
  return out.map(v => Math.min(31, v));
}

// ── Display-Listen → Dreiecke ────────────────────────────────────────────────
const PARAMS = { 0x00: 0, 0x10: 1, 0x11: 0, 0x12: 1, 0x13: 1, 0x14: 1, 0x15: 0, 0x16: 16, 0x17: 12, 0x18: 16, 0x19: 12, 0x1a: 9, 0x1b: 3, 0x1c: 3,
  0x20: 1, 0x21: 1, 0x22: 1, 0x23: 2, 0x24: 1, 0x25: 1, 0x26: 1, 0x27: 1, 0x28: 1, 0x29: 1, 0x2a: 1, 0x2b: 1,
  0x30: 1, 0x31: 1, 0x32: 1, 0x33: 1, 0x34: 32, 0x40: 1, 0x41: 0, 0x50: 1, 0x60: 1, 0x70: 3, 0x71: 2, 0x72: 1 };
const s10 = (v, shift) => ((v << 22) >> 22) / shift; // vorzeichenbehaftete 10 Bit
const STATS = { normals: 0, colors: 0, texmtx: 0, missingTex: new Set(), shadow: 0, unknownGx: new Set() };

// Erzeugt Dreiecke in Weltkoordinaten. world: 3×4-Matrix (Platzierung), mat: Material mit gebundener Textur
function emitShape(dl, mtx, stackMtx, mat, light, world, posScale, out) {
  const vtxMtx = m => mul(world, mul(m, [posScale, 0, 0, 0, 0, posScale, 0, 0, 0, 0, posScale, 0]));
  let M = vtxMtx(mtx);
  const da = mat.diffAmb, se = mat.specEmi;
  // Drinnen gelten die Farben des Materials, nur Lichtrichtung und -farbe kommen aus dem Lichtset
  const L = !light || light.outdoor ? light
    : { ...light, diff: rgb5(da & 0x7fff), amb: rgb5((da >>> 16) & 0x7fff), spec: rgb5(se & 0x7fff), emi: rgb5((se >>> 16) & 0x7fff) };
  let color = [31, 31, 31];
  if (da & 0x8000) color = L ? L.diff.slice() : rgb5(da);
  let x = 0, y = 0, z = 0, s = 0, t = 0;
  let prim = 0, vs = [];
  const polyAttr = mat.polyAttr;
  const tri = (a, b, c) => out.push({ v: [a, b, c], mat });
  const vertex = () => {
    const wx = M[0] * x + M[1] * y + M[2] * z + M[3];
    const wy = M[4] * x + M[5] * y + M[6] * z + M[7];
    const wz = M[8] * x + M[9] * y + M[10] * z + M[11];
    let ts = s, tt = t;
    if (mat.flag & 1) { ts = s * mat.sS + mat.tS * (mat.texW || 0); tt = t * mat.sT + mat.tT * (mat.texH || 0); }
    vs.push([wx, wy, wz, color[0], color[1], color[2], ts, tt]);
    const n = vs.length;
    if (prim === 0 && n % 3 === 0) tri(vs[n - 3], vs[n - 2], vs[n - 1]);
    else if (prim === 1 && n % 4 === 0) { tri(vs[n - 4], vs[n - 3], vs[n - 2]); tri(vs[n - 4], vs[n - 2], vs[n - 1]); }
    else if (prim === 2 && n >= 3) { if (n % 2) tri(vs[n - 3], vs[n - 2], vs[n - 1]); else tri(vs[n - 2], vs[n - 3], vs[n - 1]); }
    else if (prim === 3 && n >= 4 && n % 2 === 0) { tri(vs[n - 4], vs[n - 3], vs[n - 1]); tri(vs[n - 4], vs[n - 1], vs[n - 2]); }
  };
  let i = 0;
  while (i + 4 <= dl.length) {
    const cmds = [dl[i], dl[i + 1], dl[i + 2], dl[i + 3]];
    i += 4;
    for (const c of cmds) {
      const np = PARAMS[c];
      if (np == null) { STATS.unknownGx.add(c); continue; }
      if (i + np * 4 > dl.length) { i = dl.length; break; }
      const P = k => dl.readUInt32LE(i + k * 4);
      switch (c) {
        case 0x14: M = vtxMtx(stackMtx[P(0) & 31] || mtx); break;
        case 0x20: color = rgb5(P(0)); STATS.colors++; break;
        case 0x21: {
          STATS.normals++;
          const v = P(0);
          let n = [s10(v & 1023, 512), s10((v >> 10) & 1023, 512), s10((v >> 20) & 1023, 512)];
          n = [M[0] * n[0] + M[1] * n[1] + M[2] * n[2], M[4] * n[0] + M[5] * n[1] + M[6] * n[2], M[8] * n[0] + M[9] * n[1] + M[10] * n[2]];
          const len = Math.hypot(n[0], n[1], n[2]) || 1;
          n = n.map(q => q / len);
          color = L ? lightVertex(n, polyAttr, L) : color;
          break;
        }
        case 0x22: { const v = P(0); s = ((v << 16) >> 16) / 16; t = (v >> 16) / 16; break; }
        case 0x23: { const a = P(0), b = P(1); x = ((a << 16) >> 16) / 4096; y = (a >> 16) / 4096; z = ((b << 16) >> 16) / 4096; vertex(); break; }
        case 0x24: { const v = P(0); x = s10(v & 1023, 64); y = s10((v >> 10) & 1023, 64); z = s10((v >> 20) & 1023, 64); vertex(); break; }
        case 0x25: { const v = P(0); x = ((v << 16) >> 16) / 4096; y = (v >> 16) / 4096; vertex(); break; }
        case 0x26: { const v = P(0); x = ((v << 16) >> 16) / 4096; z = (v >> 16) / 4096; vertex(); break; }
        case 0x27: { const v = P(0); y = ((v << 16) >> 16) / 4096; z = (v >> 16) / 4096; vertex(); break; }
        case 0x28: { const v = P(0); x += s10(v & 1023, 4096); y += s10((v >> 10) & 1023, 4096); z += s10((v >> 20) & 1023, 4096); vertex(); break; }
        case 0x30: if (P(0) & 0x8000) color = L ? L.diff.slice() : rgb5(P(0)); break;
        case 0x40: prim = P(0) & 3; vs = []; break;
        case 0x41: break;
        default: break;
      }
      i += np * 4;
    }
  }
}

// ── Rasterizer ───────────────────────────────────────────────────────────────
class Canvas {
  constructor(w, h, x0, y0) {
    this.w = w; this.h = h; this.x0 = x0; this.y0 = y0;
    this.rgba = new Uint8ClampedArray(w * h * 4);
    this.depth = new Float32Array(w * h).fill(-Infinity);
    this.pid = new Int16Array(w * h).fill(-1);
  }
}
// Bildkoordinaten: x = Welt-x, y = Welt-z − SHEAR·Welt-y; Tiefe: je größer, desto näher an der Kamera
const proj = v => [v[0], v[2] - SHEAR * v[1], v[1] * Math.cos(PITCH) + v[2] * Math.sin(PITCH)];
function wrapCoord(i, n, rep, flip) {
  if (!rep) return i < 0 ? 0 : i >= n ? n - 1 : i;
  if (flip) { const m = ((i % (2 * n)) + 2 * n) % (2 * n); return m < n ? m : 2 * n - 1 - m; }
  return ((i % n) + n) % n;
}
function drawTri(cv, tri, translucentPass, dx = 0, dz = 0) {
  const mat = tri.mat;
  const pa = mat.polyAttr;
  const polyAlpha = (pa >> 16) & 31;
  if (polyAlpha === 0) return; // Drahtgitter – im Spiel unsichtbar
  const tex = mat.texImg;
  const hasPartialAlpha = polyAlpha < 31 || (tex && (mat.texFmt === 1 || mat.texFmt === 6));
  if (hasPartialAlpha !== translucentPass) return;
  const [a, b, c] = tri.v;
  const pa0 = proj(a), pb = proj(b), pc = proj(c);
  const ox = dx - cv.x0, oy = dz - cv.y0;
  const X0 = pa0[0] + ox, Y0 = pa0[1] + oy, X1 = pb[0] + ox, Y1 = pb[1] + oy, X2 = pc[0] + ox, Y2 = pc[1] + oy;
  const area = (X1 - X0) * (Y2 - Y0) - (X2 - X0) * (Y1 - Y0);
  if (Math.abs(area) < 1e-6) return;
  // Vorder-/Rückseite wie auf dem DS (Bit 6 = Rückseite zeichnen, Bit 7 = Vorderseite zeichnen)
  if (!(pa & (FRONT_SIGN * area > 0 ? 0x80 : 0x40))) return;
  const minX = Math.max(0, Math.floor(Math.min(X0, X1, X2))), maxX = Math.min(cv.w - 1, Math.ceil(Math.max(X0, X1, X2)));
  const minY = Math.max(0, Math.floor(Math.min(Y0, Y1, Y2))), maxY = Math.min(cv.h - 1, Math.ceil(Math.max(Y0, Y1, Y2)));
  if (minX > maxX || minY > maxY) return;
  const inv = 1 / area;
  const mode = (pa >> 4) & 3;
  const depthEqual = !!(pa & 0x4000), depthWrite = !translucentPass || !!(pa & 0x800);
  const pid = (pa >> 24) & 63;
  const tp = mat.texParam;
  const repS = !!(tp & 0x10000), repT = !!(tp & 0x20000), flipS = !!(tp & 0x40000), flipT = !!(tp & 0x80000);
  const pAlpha = polyAlpha / 31;
  for (let py = minY; py <= maxY; py++) {
    const cy = py + 0.5;
    for (let px = minX; px <= maxX; px++) {
      const cx = px + 0.5;
      const w0 = ((X1 - cx) * (Y2 - cy) - (X2 - cx) * (Y1 - cy)) * inv;
      const w1 = ((X2 - cx) * (Y0 - cy) - (X0 - cx) * (Y2 - cy)) * inv;
      const w2 = 1 - w0 - w1;
      if (w0 < -1e-7 || w1 < -1e-7 || w2 < -1e-7) continue;
      const k = py * cv.w + px;
      const d = w0 * pa0[2] + w1 * pb[2] + w2 * pc[2];
      if (depthEqual ? Math.abs(d - cv.depth[k]) > 0.5 : d <= cv.depth[k] + DEPTH_EPS) continue;
      let r = w0 * a[3] + w1 * b[3] + w2 * c[3], g = w0 * a[4] + w1 * b[4] + w2 * c[4], bl = w0 * a[5] + w1 * b[5] + w2 * c[5];
      r = r * 255 / 31; g = g * 255 / 31; bl = bl * 255 / 31;
      let alpha = pAlpha;
      if (tex) {
        const s = w0 * a[6] + w1 * b[6] + w2 * c[6], t = w0 * a[7] + w1 * b[7] + w2 * c[7];
        const tx = wrapCoord(Math.floor(s), tex.w, repS, flipS), ty = wrapCoord(Math.floor(t), tex.h, repT, flipT);
        const o = (ty * tex.w + tx) * 4;
        const ta = tex.px[o + 3];
        if (ta === 0) continue;
        if (mode === 1) { // Decal
          const f = ta / 255;
          r = tex.px[o] * f + r * (1 - f); g = tex.px[o + 1] * f + g * (1 - f); bl = tex.px[o + 2] * f + bl * (1 - f);
        } else {
          r = tex.px[o] * r / 255; g = tex.px[o + 1] * g / 255; bl = tex.px[o + 2] * bl / 255;
          alpha *= ta / 255;
        }
      }
      const q = k * 4;
      if (alpha >= 0.999) {
        cv.rgba[q] = r; cv.rgba[q + 1] = g; cv.rgba[q + 2] = bl; cv.rgba[q + 3] = 255;
      } else {
        const da = cv.rgba[q + 3] / 255, oa = alpha + da * (1 - alpha);
        cv.rgba[q] = (r * alpha + cv.rgba[q] * da * (1 - alpha)) / oa;
        cv.rgba[q + 1] = (g * alpha + cv.rgba[q + 1] * da * (1 - alpha)) / oa;
        cv.rgba[q + 2] = (bl * alpha + cv.rgba[q + 2] * da * (1 - alpha)) / oa;
        cv.rgba[q + 3] = oa * 255;
      }
      if (depthWrite) { cv.depth[k] = d; cv.pid[k] = pid; }
    }
  }
}
// Kantenmarkierung wie auf dem DS: dunkle Linie, wo eine Polygon-ID an eine weiter entfernte grenzt
function edgeMarking(cv) {
  const { w, h, pid, depth, rgba } = cv;
  const mark = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const k = y * w + x;
    if (pid[k] < 0) continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const n = ny * w + nx;
      if (pid[n] !== pid[k] && depth[n] < depth[k] - 2) { mark[k] = 1; break; }
    }
  }
  for (let k = 0; k < w * h; k++) if (mark[k]) { rgba[k * 4] = rgba[k * 4] * 0.45; rgba[k * 4 + 1] = rgba[k * 4 + 1] * 0.45; rgba[k * 4 + 2] = rgba[k * 4 + 2] * 0.45; }
}

// Nicht ganz deckende Pixel schrittweise mit dem Mittel ihrer deckenden Nachbarn auffüllen
function fillHoles(rgba, w, h) {
  let todo = [];
  for (let k = 0; k < w * h; k++) if (rgba[k * 4 + 3] < 255) todo.push(k);
  for (let pass = 0; pass < 256 && todo.length; pass++) {
    const next = [], writes = [];
    for (const k of todo) {
      const x = k % w, y = (k - x) / w;
      let r = 0, g = 0, b = 0, n = 0;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const q = (ny * w + nx) * 4;
        if (rgba[q + 3] === 255) { r += rgba[q]; g += rgba[q + 1]; b += rgba[q + 2]; n++; }
      }
      if (n) writes.push([k, r / n, g / n, b / n]); else next.push(k);
    }
    for (const [k, r, g, b] of writes) {
      const q = k * 4, a = rgba[q + 3] / 255;
      rgba[q] = rgba[q] * a + r * (1 - a); rgba[q + 1] = rgba[q + 1] * a + g * (1 - a); rgba[q + 2] = rgba[q + 2] * a + b * (1 - a);
      rgba[q + 3] = 255;
    }
    if (!writes.length) break;
    todo = next;
  }
}

// ── Höhen (BDHC) ─────────────────────────────────────────────────────────────
// Liefert für jede Kachel des Blocks alle Bodenhöhen in der Kachelmitte (mehrere bei Brücken), aufsteigend
function parseBdhc(buf, o) {
  if (buf.toString('latin1', o, o + 4) !== 'BDHC') return null;
  const nPoints = buf.readUInt16LE(o + 4), nNormals = buf.readUInt16LE(o + 6), nConst = buf.readUInt16LE(o + 8), nPlates = buf.readUInt16LE(o + 10);
  let p = o + 16;
  const pts = []; for (let i = 0; i < nPoints; i++, p += 8) pts.push([buf.readInt32LE(p) / 4096, buf.readInt32LE(p + 4) / 4096]);
  const nrm = []; for (let i = 0; i < nNormals; i++, p += 12) nrm.push([buf.readInt32LE(p) / 4096, buf.readInt32LE(p + 4) / 4096, buf.readInt32LE(p + 8) / 4096]);
  const cst = []; for (let i = 0; i < nConst; i++, p += 4) cst.push(buf.readInt32LE(p) / 4096);
  const plates = []; for (let i = 0; i < nPlates; i++, p += 8) plates.push({ a: pts[buf.readUInt16LE(p)], b: pts[buf.readUInt16LE(p + 2)], n: nrm[buf.readUInt16LE(p + 4)], d: cst[buf.readUInt16LE(p + 6)] });
  const heights = new Array(CH * CH);
  for (let tz = 0; tz < CH; tz++) for (let tx = 0; tx < CH; tx++) {
    const x = (tx + 0.5) * TILE - SIZE / 2, z = (tz + 0.5) * TILE - SIZE / 2;
    const hs = [];
    for (const pl of plates) {
      if (!pl.a || !pl.b || !pl.n || !pl.n[1]) continue;
      if (x < Math.min(pl.a[0], pl.b[0]) || x > Math.max(pl.a[0], pl.b[0]) || z < Math.min(pl.a[1], pl.b[1]) || z > Math.max(pl.a[1], pl.b[1])) continue;
      hs.push(Math.round(-(pl.n[0] * x + pl.n[2] * z + pl.d) / pl.n[1] / TILE * 16) / 16); // in Kacheln
    }
    heights[tz * CH + tx] = [...new Set(hs)].sort((a, b) => a - b);
  }
  return heights;
}

// ── Hauptteil ────────────────────────────────────────────────────────────────
(async () => {
  console.log('Lade Kartendaten …');
  const headersSrc = await get('include/data/map_headers.h');
  const headers = {};
  for (const m of headersSrc.matchAll(/\[(MAP_HEADER_\w+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g)) {
    const f = {};
    for (const x of m[2].matchAll(/\.(\w+)\s*=\s*([^,\n]+),/g)) f[x[1]] = x[2].trim();
    headers[m[1]] = f;
  }
  const matrix = await getJSON('res/field/matrices/map_matrix_000.json');
  const ROWS = matrix.maps.length, COLS = matrix.maps[0].length;
  const propOrder = (await get('res/field/props/models/map_prop_models.order')).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
  const matShp = await get('res/prebuilt/fielddata/build_model/build_model_matshp.dat', { binary: true });
  const matShpFor = id => {
    const nLoc = matShp.readUInt16LE(0);
    if (id >= nLoc) return null;
    const cnt = matShp.readUInt16LE(4 + id * 4), idx = matShp.readUInt16LE(6 + id * 4);
    if (!cnt) return null;
    const base = 4 + nLoc * 4;
    return Array.from({ length: cnt }, (_, k) => ({ mat: matShp.readUInt16LE(base + (idx + k) * 4), shp: matShp.readUInt16LE(base + (idx + k) * 4 + 2) }));
  };

  // Gebietsdaten je Block
  const areaCache = new Map();
  async function area(name) {
    if (areaCache.has(name)) return areaCache.get(name);
    const a = await getJSON(`res/field/area_data/${name}.json`);
    const texIdx = a.mapPropSet.replace('prop_model_set_', '');
    const res = {
      name,
      mapTex: parseTex0(...(b => [b, nitroBlocks(b, 0).TEX0])(await get(`res/field/maps/texture_sets/${a.mapTextureSet}.nsbtx`, { binary: true }))),
      propTex: await (async () => { const b = await get(`res/field/props/texture_sets/prop_texture_set_${texIdx}.nsbtx`, { binary: true, optional: true }); if (!b) return null; const t = nitroBlocks(b, 0).TEX0; return t != null ? parseTex0(b, t) : null; })(),
      // Draußen (Lichtset 0 und 3) ersetzt das Spiel die Materialfarben durch das Tageslicht, drinnen nicht
      light: { ...pickDaylight(await getJSON(`res/field/lighting/${a.lightingSet}.json`)), outdoor: ['lighting_set_000', 'lighting_set_003'].includes(a.lightingSet) },
    };
    areaCache.set(name, res);
    return res;
  }
  const allMapTex = [], allPropTex = [];
  async function loadAllTexSets() {
    if (allMapTex.length) return;
    for (let i = 0; i < 74; i++) {
      const b = await get(`res/field/maps/texture_sets/map_texture_set_${String(i).padStart(3, '0')}.nsbtx`, { binary: true, optional: true });
      if (b) allMapTex.push(parseTex0(b, nitroBlocks(b, 0).TEX0));
      const pb = await get(`res/field/props/texture_sets/prop_texture_set_${String(i).padStart(3, '0')}.nsbtx`, { binary: true, optional: true });
      if (pb && nitroBlocks(pb, 0).TEX0 != null) allPropTex.push(parseTex0(pb, nitroBlocks(pb, 0).TEX0));
    }
  }
  // Textur und Palette eines Materials suchen: erst im Gebiet, dann im Modell selbst, dann überall
  async function bindMaterial(mat, sets, fallback) {
    if (mat.bound) return;
    mat.bound = true;
    if (!mat.tex) return;
    let tset = sets.find(s => s && s.textures.has(mat.tex));
    if (!tset) { await loadAllTexSets(); tset = fallback().find(s => s.textures.has(mat.tex)); }
    if (!tset) { STATS.missingTex.add(mat.tex); return; }
    let pset = mat.pal == null ? null : (tset.palettes.has(mat.pal) ? tset : sets.find(s => s && s.palettes.has(mat.pal)) || fallback().find(s => s.palettes.has(mat.pal)));
    const info = tset.textures.get(mat.tex);
    mat.texImg = decodeTexture(tset, mat.tex, pset, mat.pal);
    mat.texFmt = info.fmt; mat.texW = info.w; mat.texH = info.h;
    if (mat.flag & 1) STATS.texmtx++;
  }

  const propModels = new Map();
  async function propModel(id) {
    if (propModels.has(id)) return propModels.get(id);
    const file = propOrder[id];
    const buf = file ? await get(`res/field/props/models/${file}`, { binary: true, optional: true }) : null;
    const m = buf ? parseBMD(buf) : null;
    propModels.set(id, m);
    return m;
  }

  // Matrix: echte Blöcke, flache Füll-Kulissen (Wald, Fels, Meer, Schnee) und leere Felder
  const hasMap = (r, c) => !!matrix.maps[r]?.[c] && matrix.maps[r][c] !== 'MAP_NONE';
  const isFiller = (r, c) => hasMap(r, c) && matrix.headers[r][c] === 'MAP_HEADER_EVERYWHERE';
  const isReal = (r, c) => hasMap(r, c) && !isFiller(r, c);
  // Die Meeres-Kulisse ist die Kulisse, die am häufigsten an leere Randfelder grenzt. Reines Meer zeichnet die
  // Karte im Browser selbst als Muster (tiles/sea.png) – so gibt es keine Farbkanten zwischen Kacheln und Meer.
  const edgeEmpty = (r, c) => r < 0 || c < 0 || r >= ROWS || c >= COLS || !hasMap(r, c);
  const seaVotes = new Map();
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    if (!isFiller(r, c)) continue;
    const n = [[r - 1, c], [r + 1, c], [r, c - 1], [r, c + 1]].filter(([a, b]) => edgeEmpty(a, b)).length;
    seaVotes.set(matrix.maps[r][c], (seaVotes.get(matrix.maps[r][c]) || 0) + n);
  }
  const SEA_MAP = [...seaVotes].sort((a, b) => b[1] - a[1])[0]?.[0];
  const isSea = (r, c) => isFiller(r, c) && matrix.maps[r][c] === SEA_MAP;
  const hasLand = (r, c) => hasMap(r, c) && !isSea(r, c);
  // Felder ohne Land, die mit dem Rand oder einer Meeres-Kulisse verbunden sind, sind Meer;
  // der Rest sind Löcher im Land (z. B. mitten im Kraterberg)
  const openSea = Array.from({ length: ROWS }, () => new Array(COLS).fill(false));
  const seaStack = [];
  for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
    const border = r === 0 || c === 0 || r === ROWS - 1 || c === COLS - 1;
    if ((border && !hasLand(r, c)) || isSea(r, c)) { openSea[r][c] = true; seaStack.push([r, c]); }
  }
  while (seaStack.length) {
    const [r, c] = seaStack.pop();
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      if (nr < 0 || nc < 0 || nr >= ROWS || nc >= COLS || openSea[nr][nc] || hasLand(nr, nc)) continue;
      openSea[nr][nc] = true; seaStack.push([nr, nc]);
    }
  }
  // Nächstgelegenes Feld (Breitensuche über die Matrix), das pred erfüllt
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
  // Füll-Kulissen zeichnet das Spiel mit den Texturen des Gebiets, in dem man gerade steht – hier also mit denen
  // des nächstgelegenen echten Blocks (Schnee-Kulissen werden so weiß). Fehlen dort Texturen, das eigene Gebiet.
  async function areaFor(r, c, model) {
    const own = await area(headers[matrix.headers[r][c]]?.areaDataArchiveID || 'area_data_000');
    if (!isFiller(r, c)) return own;
    const n = nearest(r, c, isReal);
    const near = n ? await area(headers[matrix.headers[n[0]][n[1]]].areaDataArchiveID) : null;
    return near && model.mats.every(m => !m.tex || near.mapTex.textures.has(m.tex)) ? near : own;
  }

  // Ein Block einer Matrix → Liste von Dreiecken in Weltkoordinaten + Höhen.
  // w: { matrix, cache, isFiller(r, c), areaFor(r, c, model) } – für die Oberwelt und für jede Innenkarte
  async function blockGeometry(w, r, c) {
    const key = `${r}:${c}`;
    if (w.cache.has(key)) return w.cache.get(key);
    const mapId = w.matrix.maps[r]?.[c];
    if (!mapId || mapId === 'MAP_NONE') { w.cache.set(key, null); return null; }
    const n = String(parseInt(mapId.replace('MAP_', ''), 10)).padStart(3, '0');
    const buf = await get(`res/field/maps/data/map_data_${n}.bin`, { binary: true });
    const attrSize = buf.readUInt32LE(0), propSize = buf.readUInt32LE(4), mdlSize = buf.readUInt32LE(8);
    // Kulissen ohne ihre Matrix-Höhe zeichnen (nur ihr eigenes Relief, z. B. Baumkronen): sonst rutschen sie
    // in der Schrägsicht nach oben und reißen Lücken auf. Alle echten Blöcke der Oberwelt liegen ohnehin auf Höhe 0.
    const flat = w.isFiller(r, c);
    const alt = flat ? 0 : (w.matrix.altitudes?.[r]?.[c] ?? 0) * TILE / 2;
    const ox = c * SIZE + SIZE / 2, oz = r * SIZE + SIZE / 2;
    const tris = [];
    // Kartenmodell
    const mdlOff = 16 + attrSize + propSize;
    const model = parseBMD(buf, mdlOff);
    const ar = await w.areaFor(r, c, model);
    const world = [1, 0, 0, ox, 0, 1, 0, alt, 0, 0, 1, oz];
    for (const d of runSbc(model)) {
      const mat = model.mats[d.mat];
      if (!mat || !model.shapes[d.shp]) continue;
      if (((mat.polyAttr >> 4) & 3) === 3) { STATS.shadow++; continue; }
      await bindMaterial(mat, [ar.mapTex, model.tex], () => allMapTex);
      emitShape(model.shapes[d.shp], d.mtx, d.stack, mat, ar.light, world, model.posScale, tris);
    }
    // Gebäude und Requisiten
    for (let p = 16 + attrSize; p + 48 <= 16 + attrSize + propSize; p += 48) {
      const id = buf.readUInt32LE(p);
      if (id === 0) continue;
      const m = await propModel(id);
      if (!m) continue;
      const px = buf.readInt32LE(p + 4) / 4096, py = buf.readInt32LE(p + 8) / 4096, pz = buf.readInt32LE(p + 12) / 4096;
      const sx = buf.readInt32LE(p + 28) / 4096, sy = buf.readInt32LE(p + 32) / 4096, sz = buf.readInt32LE(p + 36) / 4096;
      const pw = [sx, 0, 0, ox + px, 0, sy, 0, py, 0, 0, sz, oz + pz];
      const only = matShpFor(id);
      const draws = only ? only.map(o => ({ mat: o.mat, shp: o.shp, mtx: IDENT, stack: [] })) : runSbc(m);
      for (const d of draws) {
        const mat = m.mats[d.mat];
        if (!mat || !m.shapes[d.shp]) continue;
        if (((mat.polyAttr >> 4) & 3) === 3) { STATS.shadow++; continue; }
        await bindMaterial(mat, [ar.propTex, m.tex], () => allPropTex);
        emitShape(m.shapes[d.shp], d.mtx, d.stack, mat, ar.light, pw, m.posScale, tris);
      }
    }
    const bdhcOff = mdlOff + mdlSize;
    const heights = flat ? null : parseBdhc(buf, bdhcOff);
    const res = { tris, heights, alt, area: ar.name };
    w.cache.set(key, res);
    return res;
  }
  const chunkCache = new Map();
  const OVERWORLD = { matrix, cache: chunkCache, isFiller, areaFor };
  const chunkGeometry = (r, c, includeSea = false) => (isSea(r, c) && !includeSea ? null : blockGeometry(OVERWORLD, r, c));

  // ── Innenkarten (Höhlen, Gebäude …): je Matrix und Gebiet ein Bild, auf den Inhalt zugeschnitten ──
  // Welche es gibt, steht in platin.json (maps); Ausgabe: interior_<Matrix>__<Gebiet>.png + interiors.json
  async function renderInteriors() {
    const dataFile = path.resolve(opts.data || path.join(__dirname, '..', 'platin.json'));
    if (!fs.existsSync(dataFile)) { console.log('Keine platin.json für die Innenkarten gefunden:', dataFile); return; }
    const data = JSON.parse(fs.readFileSync(dataFile, 'utf8'));
    const jobs = new Map();
    for (const m of Object.values(data.maps || {})) jobs.set(`${m.matrix}__${m.areaData}`, m);
    let list = [...jobs];
    if (opts.only) list = list.filter(([key]) => opts.only.split(',').some(w => key.includes(w)));
    console.log(`Rendere ${list.length} Innenkarten …`);
    const TOP = 384, BOTTOM = 96; // Platz für alles, was in der Schrägsicht über bzw. unter die Karte ragt
    const images = {};
    const t0 = Date.now();
    for (const [key, m] of list) {
      const mx = await getJSON(`res/field/matrices/${m.matrix}.json`);
      const R = mx.maps.length, C = mx.maps[0].length;
      const hdr = (r, c) => (mx.headers?.length ? headers[mx.headers[r]?.[c]] : null);
      const w = { matrix: mx, cache: new Map(), isFiller: () => false, areaFor: (r, c) => area(hdr(r, c)?.areaDataArchiveID || m.areaData) };
      const W = C * SIZE, H = R * SIZE + TOP + BOTTOM;
      const cv = new Canvas(W, H, 0, -TOP);
      const geos = [], ground = {};
      for (let r = 0; r < R; r++) for (let c = 0; c < C; c++) {
        const g = await blockGeometry(w, r, c);
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
      // Lage des Bildes in Spielkacheln der Innenkarte
      images[key] = { file, w: cw, h: chh, ox: x0 / TILE, oz: (y0 - TOP) / TILE, ground };
    }
    fs.writeFileSync(path.join(OUT, 'interiors.json'), JSON.stringify({ shear: SHEAR, images }));
    console.log(`  ${Object.keys(images).length} Innenkarten (${Math.round((Date.now() - t0) / 1000)} s)`);
  }

  // ── Oberwelt: ein Bild je Block (chunk_<Zeile>_<Spalte>.png) + render.json ──
  async function renderOverworld() {
    // Welche Blöcke? Alle mit Land, Löcher im Land und Meeresfelder, in die von Süden etwas hineinragt
    let targets = [];
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
      if (hasLand(r, c) || !openSea[r][c]) { targets.push([r, c]); continue; }
      let below = false;
      for (let dr = 1; dr <= 2; dr++) for (let dc = -1; dc <= 1; dc++) if (hasLand(r + dr, c + dc)) below = true;
      if (below) targets.push([r, c]);
    }
    if (opts.only) {
      const want = opts.only.split(',');
      targets = targets.filter(([r, c]) => want.some(w => w === `${r}:${c}` || matrix.headers[r][c] === `MAP_HEADER_${w}`));
    }
    console.log(`Rendere ${targets.length} Blöcke (Scherung ${SHEAR.toFixed(3)}) …`);
    // Musterprobe fürs offene Meer: eine Meeres-Kulisse, nur sie selbst gerendert
    let seaSample = null;
    for (let r = 0; r < ROWS && !seaSample; r++) for (let c = 0; c < COLS && !seaSample; c++) if (isSea(r, c)) seaSample = [r, c];
    if (seaSample) {
      const [r, c] = seaSample;
      const cv = new Canvas(SIZE, SIZE, c * SIZE, r * SIZE);
      for (const pass of [false, true]) for (const tri of (await chunkGeometry(r, c, true)).tris) drawTri(cv, tri, pass);
      writePNG(path.join(OUT, 'sea_sample.png'), SIZE, SIZE, cv.rgba);
    }
    const info = { shear: SHEAR, size: SIZE, rows: ROWS, cols: COLS, chunks: {} };
    const t0 = Date.now();
    let done = 0;
    // Zeilenweise, damit der Cache klein bleibt
    targets.sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    for (const [r, c] of targets) {
      for (const k of [...chunkCache.keys()]) { const [kr] = k.split(':').map(Number); if (kr < r - 1 && !isFiller(kr, +k.split(':')[1])) chunkCache.delete(k); }
      // Hintergrund: flache Kulisse (eigene oder nächstgelegene) – füllt Stellen, die die Schrägsicht freilegt
      const bg = new Canvas(SIZE, SIZE, c * SIZE, r * SIZE);
      if (!openSea[r][c]) {
        const landFiller = (a, b) => isFiller(a, b) && !isSea(a, b);
        const src = landFiller(r, c) ? [r, c] : nearest(r, c, landFiller);
        const g = src && await chunkGeometry(src[0], src[1]);
        if (g) for (const pass of [false, true]) for (const tri of g.tris) drawTri(bg, tri, pass, (c - src[1]) * SIZE, (r - src[0]) * SIZE);
      }
      // Vordergrund: dieser Block und alles, was von den Nachbarn hineinragt
      const cv = new Canvas(SIZE, SIZE, c * SIZE, r * SIZE);
      const list = [];
      for (let dr = -1; dr <= 2; dr++) for (let dc = -1; dc <= 1; dc++) {
        const g = await chunkGeometry(r + dr, c + dc);
        if (g) list.push(g);
      }
      for (const pass of [false, true]) for (const g of list) for (const tri of g.tris) drawTri(cv, tri, pass);
      edgeMarking(cv);
      for (let k = 0; k < SIZE * SIZE; k++) {
        const q = k * 4, a = cv.rgba[q + 3] / 255;
        if (a >= 1 || bg.rgba[q + 3] === 0) continue;
        for (let ch = 0; ch < 3; ch++) cv.rgba[q + ch] = cv.rgba[q + ch] * a + bg.rgba[q + ch] * (1 - a);
        cv.rgba[q + 3] = 255;
      }
      // Land ist lückenlos: kleine Löcher (z. B. an den Ecken der Fels-Kulisse) aus den Nachbarpixeln auffüllen
      if (!openSea[r][c]) fillHoles(cv.rgba, SIZE, SIZE);
      writePNG(path.join(OUT, `chunk_${r}_${c}.png`), SIZE, SIZE, cv.rgba);
      // Bodenhöhen je Kachel (in Kacheln); bei Brücken mehrere, aufsteigend
      const own = hasLand(r, c) ? await chunkGeometry(r, c) : null;
      info.chunks[`${r}:${c}`] = { area: own?.area ?? null, ground: own?.heights ?? 0 };
      done++;
      if (done % 20 === 0 || done === targets.length) console.log(`  ${done}/${targets.length} (${Math.round((Date.now() - t0) / 1000)} s)`);
    }
    fs.writeFileSync(path.join(OUT, 'render.json'), JSON.stringify(info));
  }

  if (!opts['interiors-only']) await renderOverworld();
  if (!opts['no-interiors']) await renderInteriors();
  console.log(`Fertig. Normalen: ${STATS.normals}, Farben: ${STATS.colors}, Texturmatrizen: ${STATS.texmtx}, Schatten übersprungen: ${STATS.shadow}`);
  if (STATS.missingTex.size) console.log('  Fehlende Texturen:', [...STATS.missingTex].join(', '));
  if (STATS.unknownGx.size) console.log('  Unbekannte GX-Befehle:', [...STATS.unknownGx].map(x => '0x' + x.toString(16)).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
