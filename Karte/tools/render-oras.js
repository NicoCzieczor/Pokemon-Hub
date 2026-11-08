/*
 * Rendert die Oberwelt von Hoenn (Omega Rubin / Alpha Saphir) aus der eigenen ROM – wie render-platin.js für Sinnoh:
 * die 3D-Kartenblöcke (BCH-Modelle in a/0/3/9) mit den Texturen ihres Gebiets (a/0/1/4), aus dem Blickwinkel der
 * Spielkamera (parallel, geschert: der Boden bleibt unverzerrt, 16 Pixel je Kachel, Höheres rutscht nach oben).
 *
 * Hoenn ist im Spiel keine durchgehende Welt, sondern viele Kartenmatrizen (a/0/4/0), die an ihren Rändern über
 * Übergänge (Warps 0x5xx) und durch Wälder, Tunnel, Tore verbunden sind. Ihre Lage hier: gewichtete kleinste Quadrate
 * über alle Warp-Paare (direkt 1, über genau ein Innengebiet ¼) – die kleinen Widersprüche des Spiels verteilen sich so
 * auf alle Kanten. Je Matrix gehören nur die Zellen ihrem Ort, die im Zonenraster eine Zone tragen; der Rest ist
 * Kulisse und zählt weniger, wo sich Matrizen überlagern. Kulissen für die Spielkamera (Fernsicht, Himmel, Rauch,
 * Nebel …) fallen weg, Wasser ist deckend. Sonderfälle: Malvenfroh ist überdacht (Dach + Innenhof obenauf),
 * Xeneroville passt nicht in den Krater (Route 126 zeigt ihn von außen, wie im Spiel), von der Liga nur das Plateau.
 * Große, rein schwarz gefärbte Flächen (Rückseiten, Abdeckungen) fallen weg; Schattenkarten liegen über ihr Alpha.
 *
 * Formate (nach Ohana3DS / SPICA / pk3DS): GARC, LZ11, BCH (Relokation, Modelle, Materialien, Texturen, PICA200-
 * Befehle für Vertex- und Indexpuffer), Texturen in 8×8-Kacheln (Z-Reihenfolge, ETC1/ETC1A4 und die übrigen PICA-
 * Formate), Zonen (a/0/1/3: Kopf 0x38 Byte, Objekte mit Warps), Matrizen (Blocknummern, Zonenraster 4 × 4 je Block).
 *
 * Dazu je Ort die Item-Bälle und TMs (Inhalt: Tabelle in Skript 39 von a/0/2/9, TM → Attacke aus dem Programmcode) und
 * die Trainer – draußen mit ihrer Stelle auf der Karte, drinnen (Höhlen, Gebäude) nur für die Liste.
 *
 * Aufruf (Node 18+):  node render-oras.js <rom.3ds|.cxi (entschlüsselt, Omega Rubin)> <render-ordner> [--places=<datei>]
 *                     [--places-only]   (nur places.json neu, ohne zu rendern)
 * Ausgabe: <render>/chunk_<Zeile>_<Spalte>.png (512 × 512, je 32 × 32 Kacheln) + render.json,
 *          <render>/trees.png, grass.png, sea_tex.png (für fill-oras.py), places.json (Standard: ../tiles-oras/places.json)
 * Danach:  python fill-oras.py <render> <gefüllt>   – Lücken: Land als Wald, Wasser als Meer
 *          python make-tiles.py <gefüllt> ../tiles-oras
 * Dauer: rund 3–4 Minuten.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const OrasRom = require('../../Bosse/oras-rom.js');

const argv = process.argv.slice(2);
const opts = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const [ROM, outArg] = argv.filter(a => !a.startsWith('--'));
if (!ROM || !outArg) { console.error('Aufruf: node render-oras.js <rom.3ds|.cxi> <render-ordner> [--xy] [--places=<datei>]'); process.exit(1); }
const IS_XY = !!opts.xy;
const OUT = path.resolve(outArg);
const PLACES = path.resolve(opts.places || path.join(__dirname, '..', IS_XY ? 'tiles-kalos-xy' : 'tiles-oras', 'places.json'));
fs.mkdirSync(OUT, { recursive: true });

const PX = 16, TILE = 18, BLOCK = 32, REG = 4, SS = 2;      // Pixel je Kachel, Welteinheiten je Kachel, Blockgröße, Regionen, Supersampling
const SHEAR = 0.6, PITCH = Math.atan2(1, SHEAR);            // wie bei Platin
const MARGIN_UP = 40;                                        // so viele Kacheln ragen Hohes von unten in einen Block

const u16 = (b, o) => b[o] | b[o + 1] << 8;
const u32 = (b, o) => (b[o] | b[o + 1] << 8 | b[o + 2] << 16 | b[o + 3] << 24) >>> 0;
const sh16 = h => h > 32767 ? h - 65536 : h;
// Mini-Archiv der Gen-6-Karten (GR, MM, AD, ZO): 2 Zeichen Kennung, u16 Anzahl, Offsets
function pack(b) { const n = u16(b, 2), o = []; for (let i = 0; i <= n; i++) o.push(u32(b, 4 + i * 4)); return o.slice(0, n).map((x, i) => b.subarray(x, o[i + 1])); }
const isBCH = b => b && b.length > 4 && b[0] === 0x42 && b[1] === 0x43 && b[2] === 0x48;

/* ── BCH (H3D): Kopf, Relokation, Modelle, Materialien, Texturen ───────────────────────────── */
const f32buf = new DataView(new ArrayBuffer(4));
function parseBCH(src) {
  const b = Buffer.from(src);                 // Kopie: die Relokation schreibt hinein
  const rd32 = o => b.readUInt32LE(o), f32 = o => b.readFloatLE(o);
  const H = { bc: b[4] };
  let o = 8; const next = () => { const v = rd32(o); o += 4; return v; };
  H.main = next(); H.str = next(); H.gpu = next(); H.data = next(); H.dataExt = H.bc > 0x20 ? next() : 0;
  H.reloc = next(); next(); next(); next(); next(); if (H.bc > 0x20) next(); H.relocLen = next();
  const add = (at, base) => { if (at + 4 <= b.length) b.writeUInt32LE((rd32(at) + base) >>> 0, at); };
  for (let r = H.reloc; r < H.reloc + H.relocLen; r += 4) {
    const v = rd32(r), off = v & 0x1ffffff, fl = v >>> 25, g = off * 4 + H.gpu;
    if (fl === 0) add(off * 4 + H.main, H.main); else if (fl === 1) add(off + H.main, H.str);
    else if (fl === 2) add(off * 4 + H.main, H.gpu); else if (fl === 0xc) add(off * 4 + H.main, H.data);
    if (H.bc < 6) { if (fl === 0x23 || fl === 0x25 || fl === 0x27) add(g, H.data); else if (fl === 0x26) add(g, (H.data | 0x80000000) >>> 0); }
    else if (H.bc < 8) { if (fl === 0x24 || fl === 0x26 || fl === 0x28) add(g, H.data); else if (fl === 0x27) add(g, (H.data | 0x80000000) >>> 0); }
    else if (H.bc < 0x21) { if (fl === 0x25 || fl === 0x27 || fl === 0x29) add(g, H.data); else if (fl === 0x28) add(g, (H.data | 0x80000000) >>> 0); }
    else if (fl === 0x25 || fl === 0x26 || fl === 0x28) add(g, H.data);
    else if (fl === 0x27) add(g, (H.data | 0x80000000) >>> 0);
    else if (fl === 0x2b || fl === 0x2d) add(g, H.dataExt);
    else if (fl === 0x2c) add(g, (H.dataExt | 0x80000000) >>> 0);
  }
  const cstr = at => { let e = at; while (e < b.length && b[e]) e++; return b.toString('latin1', at, e); };
  const str = at => { const p = rd32(at); return p ? cstr(p) : ''; };
  const table = i => ({ ptr: rd32(H.main + i * 12), n: rd32(H.main + i * 12 + 4) });
  const ptrs = t => Array.from({ length: t.n }, (_, i) => rd32(t.ptr + i * 4));
  // PICA200-Befehle → Register (+ Gleitkomma-Uniforms des Vertex-Shaders)
  function pica(at, words) {
    const reg = new Map(), uni = {}, end = at + words * 4;
    let uIdx = 0, uF32 = false, uW = [], p = at;
    while (p + 8 <= end) {
      const param = rd32(p), hd = rd32(p + 4); p += 8;
      let id = hd & 0xffff; const extra = (hd >>> 20) & 0x7ff, cons = hd >>> 31, vals = [param];
      for (let k = 0; k < extra; k++) { vals.push(rd32(p)); p += 4; }
      if (extra & 1) p += 4;
      for (const v of vals) {
        reg.set(id, v);
        if (id === 0x2c0) { uIdx = v & 0xff; uF32 = !!(v >>> 31); uW = []; }
        else if (id >= 0x2c1 && id <= 0x2c8) {
          uW.push(v);
          if (uF32 && uW.length === 4) { const fl = uW.map(w => { f32buf.setUint32(0, w, true); return f32buf.getFloat32(0, true); }); uni[uIdx++] = [fl[3], fl[2], fl[1], fl[0]]; uW = []; }
        }
        if (cons) id++;
      }
    }
    return { reg, uni };
  }
  const textures = ptrs(table(3)).map(at => {
    const { reg } = pica(rd32(at), rd32(at + 4)), size = reg.get(0x82) || 0;
    return { name: str(at + 0x1c) || str(at + 0x18), w: size >>> 16, h: size & 0xffff, addr: reg.get(0x85), fmt: reg.get(0x8e) };
  });
  const models = ptrs(table(0)).map(at => {
    const M = {}; let q = at + 4 + 48;
    M.matTab = rd32(q); M.matN = rd32(q + 4); q += 12;
    M.objTab = rd32(q); M.objN = rd32(q + 4);
    M.materials = [];
    for (let i = 0; i < M.matN; i++) {
      const m = M.matTab + i * (H.bc < 0x21 ? 0x58 : 0x2c);
      const mat = { params: rd32(m), texCmd: rd32(m + 16), texWords: rd32(m + 20) };
      const s = m + 24 + (H.bc < 0x21 ? 0x30 : 4);
      mat.tex = [str(s), str(s + 4), str(s + 8)]; mat.name = str(s + 12);
      mat.texReg = mat.texCmd ? pica(mat.texCmd, mat.texWords).reg : new Map();
      M.materials.push(mat);
    }
    M.objects = [];
    for (let i = 0; i < M.objN; i++) {
      const e = M.objTab + i * 0x38;
      M.objects.push({ mat: b.readUInt16LE(e), prio: b.readUInt16LE(e + 6), vCmd: rd32(e + 8), vWords: rd32(e + 12), faceTab: rd32(e + 16), faceN: rd32(e + 20) });
    }
    return M;
  });
  return { b, textures, models, pica, f32 };
}

/* ── Texturen: PICA-Formate in 8×8-Kacheln (Z-Reihenfolge), ETC1/ETC1A4 ─────────────────────── */
const SWZ = (() => { const t = new Uint8Array(64); for (let i = 0; i < 64; i++) { let x = 0, y = 0; for (let k = 0; k < 3; k++) { x |= ((i >> (2 * k)) & 1) << k; y |= ((i >> (2 * k + 1)) & 1) << k; } t[i] = y * 8 + x; } return t; })();
const ETC_MOD = [[2, 8], [5, 17], [9, 29], [13, 42], [18, 60], [24, 80], [33, 106], [47, 183]];
const c5 = c => (c << 3) | (c >> 2), c4 = c => c * 17, clamp8 = v => v < 0 ? 0 : v > 255 ? 255 : v;
function etc1Block(b, o, alpha, out, w, bx, by) {
  const lo = b.readUInt32LE(o), hi = b.readUInt32LE(o + 4);          // 3DS: 64 Bit little-endian
  const diff = (hi >>> 1) & 1, flip = hi & 1, cw = [(hi >>> 5) & 7, (hi >>> 2) & 7];
  let base;
  if (diff) {
    const s3 = v => v >= 4 ? v - 8 : v, r = hi >>> 27, g = (hi >>> 19) & 31, bl = (hi >>> 11) & 31;
    base = [[c5(r), c5(g), c5(bl)], [c5((r + s3((hi >>> 24) & 7)) & 31), c5((g + s3((hi >>> 16) & 7)) & 31), c5((bl + s3((hi >>> 8) & 7)) & 31)]];
  } else base = [[c4(hi >>> 28), c4((hi >>> 20) & 15), c4((hi >>> 12) & 15)], [c4((hi >>> 24) & 15), c4((hi >>> 16) & 15), c4((hi >>> 8) & 15)]];
  for (let x = 0; x < 4; x++) for (let y = 0; y < 4; y++) {
    const i = x * 4 + y, sub = flip ? (y < 2 ? 0 : 1) : (x < 2 ? 0 : 1), m = ETC_MOD[cw[sub]];
    const d = (lo >>> (i + 16)) & 1 ? ((lo >>> i) & 1 ? -m[1] : -m[0]) : ((lo >>> i) & 1 ? m[1] : m[0]);
    const c = base[sub], p = ((by + y) * w + bx + x) * 4;
    out[p] = clamp8(c[0] + d); out[p + 1] = clamp8(c[1] + d); out[p + 2] = clamp8(c[2] + d); out[p + 3] = alpha ? alpha[i] : 255;
  }
}
// → RGBA mit Zeile 0 oben (die 3DS-Daten liegen von unten nach oben; v zählt dann von oben)
function decodeTexture(b, addr, w, h, fmt) {
  const out = Buffer.alloc(w * h * 4); let o = addr;
  if (fmt === 12 || fmt === 13) {
    const al = new Uint8Array(16);
    for (let ty = 0; ty < h; ty += 8) for (let tx = 0; tx < w; tx += 8) for (let k = 0; k < 4; k++) {
      let alpha = null;
      if (fmt === 13) { const a0 = b.readUInt32LE(o), a1 = b.readUInt32LE(o + 4); o += 8; for (let i = 0; i < 16; i++) al[i] = (i < 8 ? (a0 >>> (i * 4)) & 15 : (a1 >>> ((i - 8) * 4)) & 15) * 17; alpha = al; }
      if (o + 8 > b.length) return null;
      etc1Block(b, o, alpha, out, w, tx + (k & 1) * 4, ty + (k >> 1) * 4); o += 8;
    }
  } else {
    if (fmt > 11) return null;
    for (let ty = 0; ty < h; ty += 8) for (let tx = 0; tx < w; tx += 8) for (let i = 0; i < 64; i++) {
      const s = SWZ[i], p = ((ty + (s >> 3)) * w + tx + (s & 7)) * 4;
      let r = 0, g = 0, bl = 0, a = 255, v;
      switch (fmt) {
        case 0: a = b[o]; bl = b[o + 1]; g = b[o + 2]; r = b[o + 3]; o += 4; break;
        case 1: bl = b[o]; g = b[o + 1]; r = b[o + 2]; o += 3; break;
        case 2: v = b.readUInt16LE(o); o += 2; r = c5(v >> 11); g = c5((v >> 6) & 31); bl = c5((v >> 1) & 31); a = (v & 1) * 255; break;
        case 3: v = b.readUInt16LE(o); o += 2; r = c5(v >> 11); g = ((v >> 5) & 63) << 2 | ((v >> 9) & 3); bl = c5(v & 31); break;
        case 4: v = b.readUInt16LE(o); o += 2; r = c4(v >> 12); g = c4((v >> 8) & 15); bl = c4((v >> 4) & 15); a = c4(v & 15); break;
        case 5: a = b[o]; r = g = bl = b[o + 1]; o += 2; break;
        case 6: r = b[o + 1]; g = b[o]; o += 2; break;
        case 7: r = g = bl = b[o]; o += 1; break;
        case 8: a = b[o]; r = g = bl = 255; o += 1; break;
        case 9: v = b[o]; o += 1; r = g = bl = c4(v >> 4); a = c4(v & 15); break;
        case 10: v = (b[o] >> ((i & 1) * 4)) & 15; if (i & 1) o += 1; r = g = bl = c4(v); break;
        case 11: v = (b[o] >> ((i & 1) * 4)) & 15; if (i & 1) o += 1; r = g = bl = 255; a = c4(v); break;
      }
      out[p] = r; out[p + 1] = g; out[p + 2] = bl; out[p + 3] = a;
    }
  }
  const row = w * 4, tmp = Buffer.alloc(row);
  for (let y = 0; y < h >> 1; y++) { const a = y * row, z = (h - 1 - y) * row; out.copy(tmp, 0, a, a + row); out.copy(out, a, z, z + row); tmp.copy(out, z); }
  return { w, h, px: out };
}
// Mip-Stufen (Kastenfilter); alpha: ob die Textur durchsichtige Stellen hat
function mipTexture(t) {
  const lv = [{ w: t.w, h: t.h, px: Float32Array.from(t.px, v => v / 255) }];
  while (lv[lv.length - 1].w > 1 && lv[lv.length - 1].h > 1) {
    const s = lv[lv.length - 1], w = s.w >> 1, h = s.h >> 1, px = new Float32Array(w * h * 4);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
      const a = ((2 * y) * s.w + 2 * x) * 4 + c, bb = a + s.w * 4;
      px[(y * w + x) * 4 + c] = (s.px[a] + s.px[a + 4] + s.px[bb] + s.px[bb + 4]) / 4;
    }
    lv.push({ w, h, px });
  }
  let alpha = false; const p0 = lv[0].px; for (let i = 3; i < p0.length; i += 4) if (p0[i] < 0.98) { alpha = true; break; }
  return { w: t.w, h: t.h, lv, name: t.name, alpha };
}

/* ── Netze: Vertexpuffer (Formate, Permutation, Skalen aus den Uniforms 6–8) und Dreieckslisten ── */
const SEM = { 0: 'pos', 1: 'nrm', 2: 'tan', 3: 'col', 4: 'uv0', 5: 'uv1', 6: 'uv2', 7: 'bi', 8: 'bw' };
function meshes(B, M) {
  const b = B.b, out = [];
  for (const o of M.objects) {
    const { reg, uni } = B.pica(o.vCmd, o.vWords);
    const fmtLo = reg.get(0x201) >>> 0, fmtHi = reg.get(0x202) >>> 0;
    const inMap = (reg.get(0x2bb) >>> 0) + (reg.get(0x2bc) >>> 0) * 2 ** 32;
    const fmtOf = a => a < 8 ? (fmtLo >>> (a * 4)) & 15 : (fmtHi >>> ((a - 8) * 4)) & 15;
    const semOf = a => SEM[Math.floor(inMap / 2 ** (a * 4)) % 16];
    const u7 = uni[7] || [1, 1, 1, 1], u8 = uni[8] || [1, 1, 1, 1], u6 = uni[6] || [0, 0, 0, 0];
    const scale = { pos: u7[0], nrm: u7[1], tan: u7[2], col: u7[3], uv0: u8[0], uv1: u8[1], uv2: u8[2], bw: u8[3] };
    const base = reg.get(0x203) >>> 0, perm = (reg.get(0x204) >>> 0) + ((reg.get(0x205) & 0xffff) >>> 0) * 2 ** 32;
    const stride = (reg.get(0x205) >>> 16) & 0xff, cnt = reg.get(0x205) >>> 28;
    if (!stride) continue;
    const attrs = []; let off = 0;
    for (let k = 0; k < cnt; k++) {
      const a = Math.floor(perm / 2 ** (k * 4)) % 16;
      if (a >= 12) { off += [4, 8, 12, 16][a - 12]; continue; }
      const f = fmtOf(a), type = f & 3, n = (f >> 2) + 1;
      attrs.push({ sem: semOf(a), type, n, off });
      off += n * [1, 1, 2, 4][type];
      if (type === 2 && off & 1) off++;
      if (type === 3 && off & 3) off += 4 - (off & 3);
    }
    const faces = [];
    for (let f = 0; f < o.faceN; f++) {
      const fh = o.faceTab + f * 0x34, r = B.pica(b.readUInt32LE(fh + 0x2c), b.readUInt32LE(fh + 0x30)).reg;
      const ib = r.get(0x227) >>> 0, n = r.get(0x228) >>> 0, big = ib >>> 31, addr = ib & 0x7fffffff;
      const idx = new Uint32Array(n);
      for (let i = 0; i < n; i++) idx[i] = big ? b.readUInt16LE(addr + i * 2) : b[addr + i];
      faces.push({ idx });
    }
    let maxV = 0; faces.forEach(f => f.idx.forEach(v => { if (v > maxV) maxV = v; }));
    const nv = maxV + 1, pos = new Float32Array(nv * 3), col = new Float32Array(nv * 4).fill(1), uvs = [new Float32Array(nv * 2), null, null];
    const rd = (p, type) => type === 0 ? b.readInt8(p) : type === 1 ? b[p] : type === 2 ? b.readInt16LE(p) : b.readFloatLE(p);
    for (let v = 0; v < nv; v++) {
      const p0 = base + v * stride;
      for (const at of attrs) {
        const sz = [1, 1, 2, 4][at.type], s = scale[at.sem] || 1, val = k => rd(p0 + at.off + k * sz, at.type) * s;
        if (at.sem === 'pos') { pos[v * 3] = val(0) + u6[0]; pos[v * 3 + 1] = val(1) + u6[1]; pos[v * 3 + 2] = val(2) + u6[2]; }
        else if (at.sem === 'uv0' || at.sem === 'uv1' || at.sem === 'uv2') { const k = +at.sem[2], arr = uvs[k] || (uvs[k] = new Float32Array(nv * 2)); arr[v * 2] = val(0); arr[v * 2 + 1] = val(1); }
        else if (at.sem === 'col') for (let k = 0; k < Math.min(4, at.n); k++) col[v * 4 + k] = val(k);
      }
    }
    out.push({ obj: o, mat: M.materials[o.mat], pos, uvs, col, faces });
  }
  return out;
}

/* ── Rasterizer: bis zu drei Texturen (Basis, Maske + zweite, Schattentextur), Vorrang, Z-Puffer ── */
function makeTarget(w, h) { return { w, h, px: new Float32Array(w * h * 4), z: new Float32Array(w * h).fill(-Infinity), pr: new Int8Array(w * h).fill(-1) }; }
const wrapC = (i, n, mode) => mode === 2 ? ((i % n) + n) % n : mode === 3 ? (m => m < n ? m : 2 * n - 1 - m)(((i % (2 * n)) + 2 * n) % (2 * n)) : i < 0 ? 0 : i >= n ? n - 1 : i;
function sample(T, u, v, lod, ws, wt, out) {
  const L = T.lv[Math.max(0, Math.min(T.lv.length - 1, lod | 0))];
  const x = u * L.w - 0.5, y = v * L.h - 0.5, x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
  const xa = wrapC(x0, L.w, ws), xb = wrapC(x0 + 1, L.w, ws), ya = wrapC(y0, L.h, wt), yb = wrapC(y0 + 1, L.h, wt);
  const p = L.px, a = (ya * L.w + xa) * 4, bb = (ya * L.w + xb) * 4, c = (yb * L.w + xa) * 4, d = (yb * L.w + xb) * 4;
  for (let k = 0; k < 4; k++) out[k] = (p[a + k] * (1 - fx) + p[bb + k] * fx) * (1 - fy) + (p[c + k] * (1 - fx) + p[d + k] * fx) * fy;
}
function lodOf(T, UV, area) {
  const du1 = (UV[1][0] - UV[0][0]) * T.w, dv1 = (UV[1][1] - UV[0][1]) * T.h, du2 = (UV[2][0] - UV[0][0]) * T.w, dv2 = (UV[2][1] - UV[0][1]) * T.h;
  return Math.max(0, 0.5 * Math.log2(Math.abs(du1 * dv2 - dv1 * du2) / Math.abs(area) || 1));
}
const S0 = [0, 0, 0, 0], S1 = [0, 0, 0, 0], S2 = [0, 0, 0, 0];
const DEEP = [0.19, 0.44, 0.71];   // Ton des offenen Meeres (fill-oras.py färbt sea.png genauso)
// P: Bildpunkte (x, y, Tiefe), L: Ebenen { tex, uv, ws, wt, op }, C: Farben. opt: { blend, mul, opaque, alphaTest, prio, zBias }
function drawTri(tg, P, L, C, opt) {
  const [ax, ay, az] = P[0], [bx, by, bz] = P[1], [cx, cy, cz] = P[2];
  const area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax);
  if (Math.abs(area) < 1e-9) return;
  const minX = Math.max(0, Math.floor(Math.min(ax, bx, cx))), maxX = Math.min(tg.w - 1, Math.ceil(Math.max(ax, bx, cx)));
  const minY = Math.max(0, Math.floor(Math.min(ay, by, cy))), maxY = Math.min(tg.h - 1, Math.ceil(Math.max(ay, by, cy)));
  if (minX > maxX || minY > maxY) return;
  const inv = 1 / area, { px, z, pr, w } = tg, prio = opt.prio | 0;
  const pick = op => { const l = L.find(q => q.op === op && q.tex); return l ? { l, lod: lodOf(l.tex, l.uv, area) } : null; };
  const base = pick('base'), mask = pick('mask'), over = pick('over'), mul = pick('mul');
  const uvAt = (l, w0, w1, w2) => [w0 * l.uv[0][0] + w1 * l.uv[1][0] + w2 * l.uv[2][0], w0 * l.uv[0][1] + w1 * l.uv[1][1] + w2 * l.uv[2][1]];
  for (let y = minY; y <= maxY; y++) {
    const py = y + 0.5;
    for (let x = minX; x <= maxX; x++) {
      const pxx = x + 0.5;
      const w0 = ((bx - pxx) * (cy - py) - (by - py) * (cx - pxx)) * inv, w1 = ((cx - pxx) * (ay - py) - (cy - py) * (ax - pxx)) * inv, w2 = 1 - w0 - w1;
      if (w0 < -1e-6 || w1 < -1e-6 || w2 < -1e-6) continue;
      const i = y * w + x;
      if (prio < pr[i]) continue;
      const depth = w0 * az + w1 * bz + w2 * cz;
      if (prio === pr[i] && depth < z[i] - opt.zBias) continue;
      let r = w0 * C[0][0] + w1 * C[1][0] + w2 * C[2][0], g = w0 * C[0][1] + w1 * C[1][1] + w2 * C[2][1];
      let bl = w0 * C[0][2] + w1 * C[1][2] + w2 * C[2][2], a = w0 * C[0][3] + w1 * C[1][3] + w2 * C[2][3];
      const va = a;
      if (base) {
        let t = uvAt(base.l, w0, w1, w2); sample(base.l.tex, t[0], t[1], base.lod, base.l.ws, base.l.wt, S0);
        if (mask && over) {   // Übergang: zweite Textur über die Alpha-Maske
          t = uvAt(mask.l, w0, w1, w2); sample(mask.l.tex, t[0], t[1], mask.lod, mask.l.ws, mask.l.wt, S1);
          t = uvAt(over.l, w0, w1, w2); sample(over.l.tex, t[0], t[1], over.lod, over.l.ws, over.l.wt, S2);
          for (let k = 0; k < 3; k++) S0[k] = S0[k] * (1 - S1[3]) + S2[k] * S1[3];
        }
        if (mul) {   // Schattenkarte: mit Alpha-Kanal darübergelegt (Farbe ist dort nur der Schattenton), sonst multipliziert
          t = uvAt(mul.l, w0, w1, w2); sample(mul.l.tex, t[0], t[1], mul.lod, mul.l.ws, mul.l.wt, S1);
          if (mul.l.tex.alpha) for (let k = 0; k < 3; k++) S0[k] = S0[k] * (1 - S1[3]) + S1[k] * S1[3];
          else for (let k = 0; k < 3; k++) S0[k] *= S1[k];
        }
        r *= S0[0]; g *= S0[1]; bl *= S0[2]; a *= S0[3];
      }
      const o = i * 4;
      if (opt.opaque) {
        // Wasser. Kulisse: genau das Meermuster der Karte (sea.png, an der Welt ausgerichtet) – sonst stünden hellere und
        // dunklere Meereskästen nebeneinander. Eigenes Wasser: wo es zum Rand hin ausläuft (Vertex-Alpha), über dem
        // Untergrund gemischt, über nichts über dem Meermuster
        let sr = DEEP[0], sg = DEEP[1], sb = DEEP[2];
        const S = opt.sea;
        if (S) {
          const u = (S.gx + x / S.spp) / 3, v = (S.gz + y / S.spp) / 3;
          sample(S.T, u - Math.floor(u), v - Math.floor(v), S.lod, 2, 2, S2);
          sr = S2[0] * S.k[0]; sg = S2[1] * S.k[1]; sb = S2[2] * S.k[2];
        }
        if (prio === 0 && S) { r = sr; g = sg; bl = sb; }
        else if (va < 0.999) {
          const k = Math.max(0, va), under = pr[i] >= 0;
          r = (under ? px[o] : sr) * (1 - k) + r * k; g = (under ? px[o + 1] : sg) * (1 - k) + g * k; bl = (under ? px[o + 2] : sb) * (1 - k) + bl * k;
        }
        px[o] = r; px[o + 1] = g; px[o + 2] = bl; px[o + 3] = 1; z[i] = depth; pr[i] = prio;
        continue;
      }
      if (opt.alphaTest != null && a < opt.alphaTest) continue;
      if (opt.blend) {
        if (a <= 0.004) continue;
        a = Math.min(1, a);
        if (opt.mul) { px[o] *= 1 - a + a * r; px[o + 1] *= 1 - a + a * g; px[o + 2] *= 1 - a + a * bl; continue; }   // Schatten ohne Alpha
        px[o] = px[o] * (1 - a) + r * a; px[o + 1] = px[o + 1] * (1 - a) + g * a; px[o + 2] = px[o + 2] * (1 - a) + bl * a;
        px[o + 3] = Math.max(px[o + 3], a);
      } else { px[o] = r; px[o + 1] = g; px[o + 2] = bl; px[o + 3] = 1; z[i] = depth; pr[i] = prio; }
    }
  }
}
function toRGBA8(tg, ss) {
  const w = tg.w / ss | 0, h = tg.h / ss | 0, out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) for (let c = 0; c < 4; c++) {
    let s = 0;
    for (let j = 0; j < ss; j++) for (let i = 0; i < ss; i++) s += tg.px[((y * ss + j) * tg.w + x * ss + i) * 4 + c];
    out[(y * w + x) * 4 + c] = Math.round(Math.max(0, Math.min(1, s / (ss * ss))) * 255);
  }
  return { w, h, px: out };
}

/* ── PNG ───────────────────────────────────────────────────────────────────────────────────── */
const CRC = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
function crc32(buf) { let c = 0xffffffff; for (const x of buf) c = CRC[(c ^ x) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
function pngChunk(type, data) { const len = Buffer.alloc(4); len.writeUInt32BE(data.length); const td = Buffer.concat([Buffer.from(type), data]); const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(td)); return Buffer.concat([len, td, crc]); }
function png(w, h, rgba) {
  const raw = Buffer.alloc((w * 4 + 1) * h);
  for (let y = 0; y < h; y++) Buffer.from(rgba.buffer, rgba.byteOffset + y * w * 4, w * 4).copy(raw, y * (w * 4 + 1) + 1);
  const ih = Buffer.alloc(13); ih.writeUInt32BE(w, 0); ih.writeUInt32BE(h, 4); ih[8] = 8; ih[9] = 6;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), pngChunk('IHDR', ih), pngChunk('IDAT', zlib.deflateSync(raw, { level: 6 })), pngChunk('IEND', Buffer.alloc(0))]);
}

/* ── Materialien → Ebenen; Kulissen weglassen, Wasser deckend ──────────────────────────────── */
// Fernsicht, Himmel, Rauch, Nebel, Wind, Lichtschein, Spiegelungen: für die Spielkamera gemacht, von oben störend
// r112_mountain / t104gym_a02: der Schlotberg als Fernsicht von Route 112 (bis 1000 Einheiten hoch) – würde über Route 111 liegen
const SKIP = /enkei|sora|kemuri|fog|fargake|farwood|farhouse|chip_wind|kaze|hikari|lightglow|light_eff|lightef|hi_light|hilight|skyref|r108_white|r112_mountain|t104gym_a02/i;
const MASK = /_al\d*$|_al0|alpha|tunagi|tsunagi/i;           // „tsunagi“ (Übergang): Basis / Maske / zweite Textur
const WATER = /water|river|mizu|pool|chip_sea|enkei_sea|umi_/i;
function matLayers(B, mat, uvs) {
  const unit = (k, set) => {
    const prm = mat.texReg.get([0x83, 0x93, 0x9b][k]) || 0x2220, c = mat.params + 0xc + k * 0x18;
    return { name: mat.tex[k], set: uvs[set] ? set : 0, ws: (prm >> 12) & 7, wt: (prm >> 8) & 7, su: B.f32(c + 4), sv: B.f32(c + 8), tu: B.f32(c + 16), tv: B.f32(c + 20) };
  };
  const ks = [0, 1, 2].filter(k => mat.tex[k] && mat.tex[k] !== 'projection_dummy');
  if (!ks.length) return [];
  if (ks.length === 3 && MASK.test(mat.tex[ks[1]])) return [{ ...unit(ks[0], 0), op: 'base' }, { ...unit(ks[1], 1), op: 'mask' }, { ...unit(ks[2], 0), op: 'over' }];
  if (ks.length >= 2 && /shadow|kage/i.test(mat.tex[ks[1]])) return [{ ...unit(ks[0], 0), op: 'base' }, { ...unit(ks[1], 1), op: 'mul' }];
  return [{ ...unit(ks[0], 0), op: 'base' }];
}
// view: { S, x0, z0 }; o: { ox, oy, oz (Weltlage des Blockmittelpunkts), prioAt(xWelt, zWelt), strict, only }
// Einzelne Ausreißer je Matrix: Metarost (4) – eine Treppen-Ebene des Hafens liegt 1300 Einheiten draußen im Meer;
// Routen 132–134 (12) – die fast weiße Grundfläche unter den Strömungen (die Schlieren liegen dann über dem Meer)
const SKIP_IN = { 4: /^chip_steps01a1$/, 12: /^r_Comb2$/ };
function renderModel(tg, B, model, tex, view, o = {}) {
  const items = [];
  for (const m of meshes(B, model)) {
    if (SKIP.test(m.mat.name) || m.mat.tex.some(n => n && SKIP.test(n))) continue;
    if (o.matrix != null && SKIP_IN[o.matrix] && SKIP_IN[o.matrix].test(m.mat.name)) continue;
    if (o.only && !o.only.test(m.mat.name)) continue;
    const layers = matLayers(B, m.mat, m.uvs).map(l => ({ ...l, tex: tex[l.name] || null }));
    const bt = layers[0] && layers[0].tex;
    const water = WATER.test(m.mat.name) || m.mat.tex.some(n => n && WATER.test(n));
    const blend = !water && (/shadow|kage/i.test(m.mat.name) || !!(bt && bt.alpha && !layers.some(l => l.op === 'mask')));
    // Vertexfarben durchweg fast schwarz (z. B. hohes Gras: dort steckt etwas anderes darin als Farbe) → nur die Textur
    if (!/shadow|kage/i.test(m.mat.name)) {
      let s = 0; for (let i = 0; i < m.col.length; i += 4) s += m.col[i] + m.col[i + 1] + m.col[i + 2];
      if (s / (m.col.length / 4) < 0.15) for (let i = 0; i < m.col.length; i += 4) { m.col[i] = m.col[i + 1] = m.col[i + 2] = 1; }
    }
    items.push({ m, layers, blend, water, mul: blend && !!(bt && !bt.alpha) });
  }
  items.sort((a, b) => (a.blend - b.blend) || (a.m.obj.prio - b.m.obj.prio));
  const ox = o.ox || 0, oy = o.oy || 0, oz = o.oz || 0, sinP = Math.sin(PITCH), cosP = Math.cos(PITCH);
  for (const { m, layers, blend, water, mul } of items) {
    const P = [[], [], []], C = [[], [], []], L = layers.map(l => ({ ...l, uv: [[0, 0], [0, 0], [0, 0]] }));
    const opt = { blend, mul, opaque: water, sea: view.sea, zBias: blend ? 3 : 0, alphaTest: blend || water ? null : (layers[0] && layers[0].tex && layers[0].tex.alpha ? 0.5 : null), prio: 0 };
    for (const f of m.faces) for (let i = 0; i + 2 < f.idx.length; i += 3) {
      let sx = 0, sz = 0, pmin = 99;
      for (let k = 0; k < 3; k++) {
        const v = f.idx[i + k], x = m.pos[v * 3] + ox, y = m.pos[v * 3 + 1] + oy, z = m.pos[v * 3 + 2] + oz;
        sx += x; sz += z;
        if (o.strict && o.prioAt) pmin = Math.min(pmin, o.prioAt(x, z));
        P[k] = [(x - view.x0) * view.S, (z - view.z0 - y * SHEAR) * view.S, y * sinP + z * cosP];
        for (const l of L) { const a = m.uvs[l.set] || m.uvs[0]; l.uv[k] = [a[v * 2] * l.su + l.tu, a[v * 2 + 1] * l.sv + l.tv]; }
        C[k] = [m.col[v * 4], m.col[v * 4 + 1], m.col[v * 4 + 2], m.col[v * 4 + 3]];
      }
      opt.prio = o.prioAt ? o.prioAt(sx / 3, sz / 3) : 0;
      if (o.strict) opt.prio = Math.min(opt.prio, pmin);    // nur Dreiecke, die ganz in der Maske liegen
      if (opt.prio < 0) continue;
      // große, rein schwarz gefärbte Flächen (Rückseiten, Abdeckungen für die Spielkamera) weglassen – kleine wie Türen bleiben
      const blackBack = C.every(c => c[0] + c[1] + c[2] < 0.09);
      const whiteBack = IS_XY && !layers.some(l => l.tex) && C.every(c => c[0] + c[1] + c[2] > 2.91);
      if (!water && (blackBack || whiteBack)) {
        const v0 = f.idx[i] * 3, v1 = f.idx[i + 1] * 3, v2 = f.idx[i + 2] * 3, p = m.pos;
        const ax = p[v1] - p[v0], ay = p[v1 + 1] - p[v0 + 1], az = p[v1 + 2] - p[v0 + 2], bx = p[v2] - p[v0], by = p[v2 + 1] - p[v0 + 1], bz = p[v2 + 2] - p[v0 + 2];
        if (Math.hypot(ay * bz - az * by, az * bx - ax * bz, ax * by - ay * bx) / 2 > 4 * TILE * TILE) continue;
      }
      drawTri(tg, P, L, C, opt);
    }
  }
}

// RomFS einer entschlüsselten .3ds (NCSD) oder .cxi (NCCH) – direkt, ohne die Größengrenze von oras-rom.js (für den
// Browser gedacht; die Kartenblöcke a/0/3/9 sind über 100 MB groß)
function openRomfs(file) {
  const fd = fs.openSync(file, 'r');
  const read = (at, n) => { const b = Buffer.alloc(n); fs.readSync(fd, b, 0, n, at); return b; };
  let base = 0, h = read(0, 0x200);
  if (h.toString('latin1', 0x100, 0x104) === 'NCSD') { base = h.readUInt32LE(0x120) * 0x200; h = read(base, 0x200); }
  if (h.toString('latin1', 0x100, 0x104) !== 'NCCH') throw new Error('keine 3DS-ROM');
  if (!(h[0x18F] & 4)) throw new Error('ROM ist verschlüsselt – bitte eine entschlüsselte .3ds/.cxi nehmen');
  const romfs = base + h.readUInt32LE(0x1B0) * 0x200, iv = read(romfs, 0x60), bs = 2 ** iv.readUInt32LE(0x4C);
  const l3 = romfs + Math.ceil((0x60 + iv.readUInt32LE(8)) / bs) * bs, hd = read(l3, 0x28);
  const files = OrasRom._internal.romfsTree(new Uint8Array(read(l3 + hd.readUInt32LE(0x0C), hd.readUInt32LE(0x10))), new Uint8Array(read(l3 + hd.readUInt32LE(0x1C), hd.readUInt32LE(0x20))));
  const data = l3 + hd.readUInt32LE(0x24);
  const get = p => { const f = files[p]; if (!f) throw new Error('fehlt in der ROM: ' + p); return new Uint8Array(read(data + f.off, f.size)); };
  // Programmcode: ExeFS „.code“, meist rückwärts-LZ (BLZ) gepackt (Exheader 0x0D Bit 0)
  const code = () => {
    const exefs = base + h.readUInt32LE(0x1A0) * 0x200, eh = read(exefs, 0x200), packed = read(base + 0x200, 0x10)[0x0D] & 1;
    for (let i = 0; i < 10; i++) {
      if (eh.toString('latin1', i * 16, i * 16 + 8).replace(/\0+$/, '') !== '.code') continue;
      const c = read(exefs + 0x200 + eh.readUInt32LE(i * 16 + 8), eh.readUInt32LE(i * 16 + 12));
      if (!packed) return c;
      const len = c.length, add = c.readUInt32LE(len - 4), info = c.readUInt32LE(len - 8), limit = len - (info & 0xFFFFFF);
      const out = Buffer.alloc(len + add); c.copy(out, 0);
      let src = len - (info >>> 24), dst = len + add;
      while (src > limit) {
        let flags = c[--src];
        for (let b = 0; b < 8 && src > limit; b++, flags <<= 1) {
          if (!(flags & 0x80)) { out[--dst] = c[--src]; continue; }
          const b1 = c[--src], b2 = c[--src], disp = (((b1 & 0x0F) << 8) | b2) + 3;
          for (let k = (b1 >> 4) + 3; k > 0; k--) { dst--; out[dst] = out[dst + disp]; }
        }
      }
      return out;
    }
    throw new Error('kein .code in der ROM');
  };
  return { file: get, code };
}
// Gen-6-Skript (AMX): Kopf, dann die Befehle komprimiert (7 Bit je Byte, Bit 7 = es geht weiter, erstes Byte mit Vorzeichen)
function amxBytes(raw) {
  const b = Buffer.from(raw), len = b.readUInt32LE(0), start = b.readUInt32LE(0x0C), n = (b.readUInt32LE(0x14) - start) / 4;
  const out = new Int32Array(n);
  for (let i = 0, j = 0, x = 0, f = start; i < n && f < len;) {
    const c = b[f++], v = c & 0x7f;
    x = ++j === 1 ? ((((v >> 6) === 0 ? 1 : 0) - 1) << 6) | v : (x << 7) | v;
    if (c & 0x80) continue;
    out[i++] = x; j = 0;
  }
  return Buffer.from(out.buffer);
}

(async () => {
  const t0 = Date.now();
  const rom = openRomfs(ROM), file = rom.file;
  const G = OrasRom._internal.garc, lz11 = OrasRom._internal.lz11;
  const paths = IS_XY
    ? ['a/0/4/1', 'a/0/4/2', 'a/0/1/3', 'a/0/1/2']
    : ['a/0/3/9', 'a/0/4/0', 'a/0/1/4', 'a/0/1/3'];
  const [GR, MM, ADS, ZO] = [G(file(paths[0]), false), G(file(paths[1]), false), G(file(paths[2]), false), G(file(paths[3]), true)];
  const un = x => x[0] === 0x11 ? lz11(x) : x;
  const grParts = i => pack(un(GR[i]));
  const zt = ZO[ZO.length - (IS_XY ? 1 : 2)], NZ = zt.length / 56;
  const zm = z => u16(zt, z * 56 + 4), za = z => u16(zt, z * 56 + 2), zloc = z => u16(zt, z * 56 + 0x1C) & 0x1FF;
  console.log('ROM gelesen', ((Date.now() - t0) / 1000).toFixed(0), 's –', GR.length, 'Kartenblöcke,', MM.length, 'Matrizen,', NZ, 'Zonen');

  // Matrizen: Blocknummern (u16 je Zelle), dahinter das Zonenraster (4 × 4 je Block, je 10 × 10 Kacheln)
  const matrix = mi => {
    const m = pack(MM[mi])[0], w = u16(m, 4), h = u16(m, 6), cells = [], W = w * 4, H = h * 4, g = [], base = 8 + w * h * 2;
    for (let k = 0; k < w * h; k++) { const v = u16(m, 8 + k * 2); if (v !== 0xffff) cells.push({ x: k % w, y: Math.floor(k / w), gr: v }); }
    for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(u16(m, base + (y * W + x) * 2)); g.push(r); }
    return { cells, W, H, g };
  };
  const zonesOf = {}; for (let z = 0; z < NZ; z++) (zonesOf[zm(z)] = zonesOf[zm(z)] || []).push(z);
  const areaOf = mi => { const c = {}; (zonesOf[mi] || []).forEach(z => { c[za(z)] = (c[za(z)] || 0) + 1; }); return +Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
  // Warps je Zone (Objekte, Teil 1 der Zonendatei: Möbel 0x14, Personen 0x30, Warps 0x18 als u16)
  const warps = z => {
    try {
      const e = pack(ZO[z])[1], nF = e[4], nN = e[5], nW = e[6], out = [];
      let o = 8 + nF * 0x14 + nN * 0x30;
      for (let i = 0; i < nW; i++, o += 0x18) { const r = []; for (let k = 0; k < 0x18; k += 2) r.push(u16(e, o + k)); out.push(r); }
      return out;
    } catch (err) { return []; }
  };
  const W = {}; for (let z = 0; z < NZ; z++) W[z] = warps(z);

  // ── Lage der Außen-Matrizen 1–28 ──
  const XY_OUTDOORS = [0, 1, 2, 3, 4, 5, 6, 7, 8, 27, 29, 30, 31, 32, 33, 59, 61, 74, 77, 78, 79, 80, 81,
    101, 128, 129, 130, 206, 210, 212, 214, 215, 216, 217, 218, 223];
  const OUTM = new Set(IS_XY ? XY_OUTDOORS : Array.from({ length: 28 }, (_, i) => i + 1));
  const pairs = [];
  for (let z = 0; z < NZ; z++) W[z].forEach(w => {
    const d = W[w[2]] && W[w[2]][w[3]];
    if (!d || d[2] !== z) return;
    pairs.push({ a: zm(z), b: zm(w[2]), d: [(w[6] - d[6]) / TILE, (w[8] - d[8]) / TILE, sh16(w[7]) - sh16(d[7])] });
  });
  const eqs = [], direct = new Set();
  for (const p of pairs) if (OUTM.has(p.a) && OUTM.has(p.b) && p.a !== p.b) { eqs.push({ ...p, w: 1 }); direct.add(p.a + '>' + p.b); }
  const nb = {};
  for (const p of pairs) if (OUTM.has(p.a) && !OUTM.has(p.b)) (nb[p.b] = nb[p.b] || new Set()).add(p.a);
  for (const [I, s] of Object.entries(nb)) {
    if (s.size !== 2) continue;
    const [a, b] = [...s];
    if (direct.has(a + '>' + b) || direct.has(b + '>' + a)) continue;
    for (const x of pairs.filter(p => p.a === a && p.b === +I)) for (const y of pairs.filter(p => p.a === +I && p.b === b)) eqs.push({ a, b, d: [0, 1, 2].map(k => x.d[k] + y.d[k]), w: 0.25 });
  }
  const ids = [...new Set(eqs.flatMap(e => [e.a, e.b]))].filter(m => m !== 1).sort((x, y) => x - y), ix = Object.fromEntries(ids.map((m, i) => [m, i]));
  const LAYOUT = { 1: [0, 0, 0] };
  for (let ax = 0; ax < 3; ax++) {
    const n = ids.length, A = Array.from({ length: n }, () => new Float64Array(n)), r = new Float64Array(n);
    for (const e of eqs) {
      const i = ix[e.a], j = ix[e.b], d = e.d[ax];
      if (j !== undefined) { A[j][j] += e.w; r[j] += e.w * d; if (i !== undefined) A[j][i] -= e.w; }
      if (i !== undefined) { A[i][i] += e.w; r[i] -= e.w * d; if (j !== undefined) A[i][j] -= e.w; }
    }
    for (let c = 0; c < n; c++) {
      let p = c; for (let k = c + 1; k < n; k++) if (Math.abs(A[k][c]) > Math.abs(A[p][c])) p = k;
      [A[c], A[p]] = [A[p], A[c]]; [r[c], r[p]] = [r[p], r[c]];
      if (Math.abs(A[c][c]) < 1e-12) continue;
      for (let k = 0; k < n; k++) if (k !== c) { const f = A[k][c] / A[c][c]; if (!f) continue; for (let q = c; q < n; q++) A[k][q] -= f * A[c][q]; r[k] -= f * r[c]; }
    }
    ids.forEach((m, i) => { if (Math.abs(A[i][i]) > 1e-12) (LAYOUT[m] = LAYOUT[m] || [0, 0, 0])[ax] = r[i] / A[i][i]; });
  }
  // Per Hand: Malvenfroh (Innenhof 14 als Mittel der Wege durch die Stadt, Dach 349 darum), Liga 19 über die Siegesstraße
  if (IS_XY) Object.assign(LAYOUT, {
    0: [150, 950, 0], 1: [150, 750, 0], 2: [-190, 250, 0], 3: [-390, 410, 0],
    4: [-420, -30, 0], 5: [160, -290, 0], 6: [460, -90, 0], 7: [570, 130, 0],
    8: [590, 1020, 0], 27: [80, 560, 0], 29: [20, 720, 0], 30: [260, 560, 0],
    31: [560, 360, 0], 32: [900, 500, 0], 33: [40, 460, 0], 59: [240, 300, 0],
    61: [280, 210, 0], 74: [780, 100, 0], 77: [860, 1220, 0], 78: [700, 900, 0],
    79: [760, 850, 0], 80: [820, 800, 0], 81: [250, 690, 0], 101: [720, 720, 0],
    128: [500, 600, 0], 129: [800, 600, 0], 130: [650, 850, 0], 206: [250, 560, 0],
    210: [760, 250, 0], 212: [760, 130, 0], 214: [1050, 450, 0], 215: [1100, 850, 0],
    216: [1100, 1000, 0], 217: [900, 1070, 0], 218: [800, 1010, 0], 223: [1200, 1300, 0]
  });
  else Object.assign(LAYOUT, { 14: [208, -102, 0], 19: [977, -180, -27], 349: [168.5, -150, 250] });
  // Wälder wie der Blütenburgwald sind innen dunkel mit Lichtstrahlen – von oben fremd; ihre Lücke füllt fill-oras.py mit Wald
  // Masken: Dach nur das Gebäude, Liga nur das Plateau (box: Kacheln der Matrix); Innenhof immer obenauf
  const SPECIAL = IS_XY ? {} : { 14: { prio: 2 }, 349: { box: [24, 40, 96, 100] }, 19: { box: [-1, -1, 81, 80] } };
  const MATS = (IS_XY ? XY_OUTDOORS : Object.keys(LAYOUT).map(Number).filter(m => m !== 17))
    .filter(m => LAYOUT[m] && LAYOUT[m].every(Number.isFinite));
  console.log('Lage berechnet:', MATS.length, 'Matrizen');

  // ── Blöcke, eigene Zellen, Weltrahmen ──
  const chunks = [], owned = {}, mats = {};
  for (const m of MATS) { const M = mats[m] = matrix(m), o = LAYOUT[m]; owned[m] = { o, ...M }; for (const c of M.cells) chunks.push({ m, gr: c.gr, x: o[0] + c.x * 40, z: o[1] + c.y * 40, y: o[2] }); }
  const minX = Math.min(...chunks.map(c => c.x)), minZ = Math.min(...chunks.map(c => c.z));
  const maxX = Math.max(...chunks.map(c => c.x + 40)), maxZ = Math.max(...chunks.map(c => c.z + 40));
  const GX0 = Math.floor(minX / BLOCK) * BLOCK, GZ0 = Math.floor((minZ - 24) / BLOCK) * BLOCK;
  const COLS = Math.ceil((maxX - GX0) / BLOCK), ROWS = Math.ceil((maxZ - GZ0) / BLOCK);
  // Eigentümer je Weltkachel: Wo sich eigene Zellen zweier Gebiete überlagern (beide enthalten den Rand am Übergang,
  // leicht versetzt – sonst durchdringen sich Felswände zu Zacken), zeichnet das Gebiet, in dessen eigener Fläche die
  // Kachel am tiefsten liegt (Abstand in Zellen zum Rand der eigenen Fläche); das andere zählt dort als Kulisse.
  const GW = COLS * BLOCK, GH = ROWS * BLOCK, owner = new Int16Array(GW * GH).fill(-1), depthAt = new Float32Array(GW * GH);
  for (const m of MATS) {
    if (SPECIAL[m]) continue;
    const w = owned[m], dist = Array.from({ length: w.H }, () => new Float32Array(w.W).fill(Infinity)), q = [];
    for (let cz = 0; cz < w.H; cz++) for (let cx = 0; cx < w.W; cx++) if (w.g[cz][cx] === 0xffff) { dist[cz][cx] = 0; q.push([cx, cz]); }
    for (let cz = -1; cz <= w.H; cz++) for (let cx = -1; cx <= w.W; cx++) if (cz < 0 || cx < 0 || cz >= w.H || cx >= w.W) q.push([cx, cz]);
    for (let h = 0; h < q.length; h++) {
      const [cx, cz] = q[h], d = cx < 0 || cz < 0 || cx >= w.W || cz >= w.H ? 0 : dist[cz][cx];
      for (const [nx, nz] of [[cx + 1, cz], [cx - 1, cz], [cx, cz + 1], [cx, cz - 1]]) {
        if (nx < 0 || nz < 0 || nx >= w.W || nz >= w.H || dist[nz][nx] <= d + 1) continue;
        dist[nz][nx] = d + 1; q.push([nx, nz]);
      }
    }
    const x0 = Math.max(0, Math.floor(w.o[0] - GX0)), z0 = Math.max(0, Math.floor(w.o[1] - GZ0));
    for (let gz = z0; gz < Math.min(GH, z0 + w.H * 10 + 1); gz++) for (let gx = x0; gx < Math.min(GW, x0 + w.W * 10 + 1); gx++) {
      const lx = gx + 0.5 + GX0 - w.o[0], lz = gz + 0.5 + GZ0 - w.o[1], cx = Math.floor(lx / 10), cz = Math.floor(lz / 10);
      if (cx < 0 || cz < 0 || cx >= w.W || cz >= w.H || w.g[cz][cx] === 0xffff) continue;
      // Tiefe: Zellenabstand + Lage in der Zelle (näher an der Mitte = tiefer)
      const d = dist[cz][cx] - Math.max(Math.abs(lx / 10 - cx - 0.5), Math.abs(lz / 10 - cz - 0.5)), i = gz * GW + gx;
      if (owner[i] < 0 || d > depthAt[i]) { owner[i] = m; depthAt[i] = d; }
    }
  }
  const prioFor = m => {
    const w = owned[m], sp = SPECIAL[m] || {};
    return (xw, zw) => {
      const tx = xw / TILE - w.o[0], tz = zw / TILE - w.o[1];
      if (sp.box) return tx >= sp.box[0] && tz >= sp.box[1] && tx < sp.box[2] && tz < sp.box[3] ? 1 : -1;
      if (sp.prio != null) return sp.prio;
      const cx = Math.floor(tx / 10), cz = Math.floor(tz / 10);
      if (cx < 0 || cz < 0 || cx >= w.W || cz >= w.H || w.g[cz][cx] === 0xffff) return 0;
      const gx = Math.floor(xw / TILE - GX0), gz = Math.floor(zw / TILE - GZ0);
      if (gx < 0 || gz < 0 || gx >= GW || gz >= GH) return 1;
      const ow = owner[gz * GW + gx];
      return ow < 0 || ow === m ? 1 : 0;
    };
  };
  // Texturen je Gebiet (Teil 11: Gelände, Teil 1: Gebäude)
  const texCache = new Map();
  const areaTextures = area => {
    if (texCache.has(area)) return texCache.get(area);
    const p = pack(un(ADS[area])), dict = {};
    for (const k of [11, 1]) {
      if (!isBCH(p[k])) continue;
      const T = parseBCH(p[k]);
      for (const t of T.textures) { if (dict[t.name]) continue; const d = decodeTexture(T.b, t.addr, t.w, t.h, t.fmt); if (d) dict[t.name] = mipTexture({ ...d, name: t.name }); }
    }
    texCache.set(area, dict);
    return dict;
  };
  const cache = new Map();
  const chunkModel = g => {
    if (cache.has(g)) { const v = cache.get(g); cache.delete(g); cache.set(g, v); return v; }
    const B = parseBCH(grParts(g)[1]);
    cache.set(g, B); if (cache.size > 40) cache.delete(cache.keys().next().value);
    return B;
  };

  // Meermuster: chip_sea_b über 3 Kacheln, im Ton DEEP (wie sea.png aus fill-oras.py)
  const SEA = IS_XY ? null : (() => {
    const T = areaTextures(areaOf(1)).chip_sea_b, L = T.lv[0], mean = [0, 0, 0];
    for (let i = 0; i < L.w * L.h; i++) for (let c = 0; c < 3; c++) mean[c] += L.px[i * 4 + c] / (L.w * L.h);
    return { T, k: DEEP.map((d, c) => d / mean[c]), spp: PX * SS, lod: Math.max(0, Math.log2(T.w / (3 * PX * SS))) };
  })();

  // ── Rendern: Regionen à 4 × 4 Blöcke ──
  const info = { shear: SHEAR, size: BLOCK * PX, rows: ROWS, cols: COLS, origin: [GX0, GZ0], tile: TILE, chunks: {}, layout: Object.fromEntries(MATS.map(m => [m, LAYOUT[m]])) };
  console.log('Welt', COLS + ' × ' + ROWS, 'Blöcke,', chunks.length, 'Kartenblöcke des Spiels');
  if (!opts['places-only']) for (let rr = 0; rr < Math.ceil(ROWS / REG); rr++) for (let rc = 0; rc < Math.ceil(COLS / REG); rc++) {
    const tx0 = GX0 + rc * REG * BLOCK, tz0 = GZ0 + rr * REG * BLOCK, tsz = REG * BLOCK;
    const list = chunks.filter(c => c.x < tx0 + tsz + 2 && c.x + 40 > tx0 - 2 && c.z < tz0 + tsz + MARGIN_UP && c.z + 40 > tz0 - 4);
    if (!list.length) continue;
    const view = { S: PX / TILE * SS, x0: tx0 * TILE, z0: tz0 * TILE,
      sea: SEA ? { ...SEA, gx: tx0 - GX0, gz: tz0 - GZ0 } : null };
    const tg = makeTarget(tsz * PX * SS, tsz * PX * SS);
    for (const c of list) {
      const B = chunkModel(c.gr), tex = areaTextures(areaOf(c.m));
      for (const md of B.models) renderModel(tg, B, md, tex, view, { matrix: c.m, ox: c.x * TILE + 360, oy: c.y, oz: c.z * TILE + 360, prioAt: prioFor(c.m), strict: !!(SPECIAL[c.m] && SPECIAL[c.m].box) });
    }
    const img = toRGBA8(tg, SS), bp = BLOCK * PX;
    for (let br = 0; br < REG; br++) for (let bc = 0; bc < REG; bc++) {
      const r = rr * REG + br, cc = rc * REG + bc;
      if (r >= ROWS || cc >= COLS) continue;
      const out = new Uint8Array(bp * bp * 4);
      for (let y = 0; y < bp; y++) { const s = ((br * bp + y) * img.w + bc * bp) * 4; out.set(img.px.subarray(s, s + bp * 4), y * bp * 4); }
      let any = false; for (let i = 3; i < out.length; i += 4) if (out[i]) { any = true; break; }
      if (!any) continue;
      fs.writeFileSync(path.join(OUT, `chunk_${r}_${cc}.png`), png(bp, bp, out));
      // je Kachel: nur Kulisse (keine Pixel eines eigenen Gebiets)? → fill-oras.py darf dort Wald pflanzen
      const bits = Buffer.alloc(128), tp = PX * SS;
      for (let ty = 0; ty < BLOCK; ty++) for (let tx = 0; tx < BLOCK; tx++) {
        let own = 0;
        for (let y = 0; y < tp; y++) for (let x = 0; x < tp; x++) if (tg.pr[((br * BLOCK + ty) * tp + y) * tg.w + (bc * BLOCK + tx) * tp + x] >= 1) own++;
        if (own < tp * tp * 0.02) bits[(ty * BLOCK + tx) >> 3] |= 1 << ((ty * BLOCK + tx) & 7);
      }
      info.chunks[`${r}:${cc}`] = { ground: 0, filler: bits.toString('base64') };
    }
    process.stdout.write(`\rRegion ${rr}:${rc} – ${((Date.now() - t0) / 1000).toFixed(0)} s   `);
  }
  if (!opts['places-only']) {
    fs.writeFileSync(path.join(OUT, 'render.json'), JSON.stringify(info));
    console.log('\nBlöcke geschrieben:', Object.keys(info.chunks).length);
  }

  // ── Vorlagen für fill-oras.py: Bäume von Rosaltstadt (Matrix 1, Block 2:2) freigestellt, Gras, Meer ──
  if (!opts['places-only'] && !IS_XY) {
    const oldale = mats[1].cells.find(c => c.x === 2 && c.y === 2), B = chunkModel(oldale.gr), tex = areaTextures(areaOf(1));
    const view = { S: PX / TILE * SS, x0: -360, z0: -480 }, tg = makeTarget(40 * PX * SS, 47 * PX * SS);
    renderModel(tg, B, B.models[0], tex, view, { only: /^chip_wood_[ab]$|^shadow1$/ });
    const img = toRGBA8(tg, SS);
    fs.writeFileSync(path.join(OUT, 'trees.png'), png(img.w, img.h, img.px));
    for (const [n, f] of [['chip_kusa', 'grass.png'], ['chip_sea_b', 'sea_tex.png']]) {
      const L = tex[n].lv[0];
      fs.writeFileSync(path.join(OUT, f), png(L.w, L.h, Uint8Array.from(L.px, v => Math.round(v * 255))));
    }
  }

  // ── Orte: Flächen (Zellen zu Rechtecken, mit Bodenhöhe), Namensposition, Eingänge zu Höhlen & Orten ──
  const cells = [];
  for (const m of MATS) {
    const { W: CW, H: CH, g } = mats[m], own = zonesOf[m] || [], sp = SPECIAL[m] || {};
    for (let cz = 0; cz < CH; cz++) for (let cx = 0; cx < CW; cx++) {
      let z = g[cz][cx];
      if (z === 0xffff) continue;
      if (sp.box && !(cx * 10 >= sp.box[0] - 5 && cz * 10 >= sp.box[1] - 5 && (cx + 1) * 10 <= sp.box[2] + 5 && (cz + 1) * 10 <= sp.box[3] + 5)) continue;
      if (!own.includes(z)) z = own[0];          // kleine Matrizen: Zone 0 = die Zone, die sie benutzt
      if (z == null) continue;
      cells.push({ m, cx, cz, loc: zloc(z) });
    }
  }
  // Bodenhöhe je Zelle: häufigste Höhe flacher Dreiecke (nach Fläche), ohne Bäume, Dächer, Schatten
  const hist = new Map();
  for (const m of MATS) for (const c of mats[m].cells) {
    const B = chunkModel(c.gr);
    for (const md of B.models) for (const me of meshes(B, md)) {
      if (/wood|tree|kusa_b|shadow|kage|roof|yane/i.test(me.mat.name)) continue;
      for (const f of me.faces) for (let i = 0; i + 2 < f.idx.length; i += 3) {
        const p = [0, 1, 2].map(k => { const v = f.idx[i + k]; return [me.pos[v * 3], me.pos[v * 3 + 1], me.pos[v * 3 + 2]]; });
        const ux = p[1][0] - p[0][0], uy = p[1][1] - p[0][1], uz = p[1][2] - p[0][2], vx = p[2][0] - p[0][0], vy = p[2][1] - p[0][1], vz = p[2][2] - p[0][2];
        const ny = uz * vx - ux * vz, len = Math.hypot(uy * vz - uz * vy, ny, ux * vy - uy * vx);
        if (!len || Math.abs(ny) / len < 0.9) continue;
        const key = m + ':' + Math.floor(((p[0][0] + p[1][0] + p[2][0]) / 3 + c.x * 720 + 360) / 180) + ':' + Math.floor(((p[0][2] + p[1][2] + p[2][2]) / 3 + c.y * 720 + 360) / 180);
        let h = hist.get(key); if (!h) hist.set(key, h = new Map());
        const q = Math.round((p[0][1] + p[1][1] + p[2][1]) / 3 / 4.5); h.set(q, (h.get(q) || 0) + len / 2);
      }
    }
  }
  for (const c of cells) { const h = hist.get(c.m + ':' + c.cx + ':' + c.cz); let best = 0, bw = -1; if (h) for (const [q, w] of h) if (w > bw) { bw = w; best = q; } c.h = best * 4.5 + LAYOUT[c.m][2]; }
  const areas = {}, byLocM = {};
  cells.forEach(c => { const k = c.loc + ':' + c.m; (byLocM[k] = byLocM[k] || []).push(c); });
  for (const [k, list] of Object.entries(byLocM)) {
    const [loc, m] = k.split(':').map(Number), o = LAYOUT[m], at = new Map(list.map(c => [c.cx + ':' + c.cz, c])), runs = [];
    for (const cz of [...new Set(list.map(c => c.cz))].sort((a, b) => a - b)) {
      const xs = list.filter(c => c.cz === cz).map(c => c.cx).sort((a, b) => a - b);
      for (let i = 0; i < xs.length; i++) {
        const x0 = xs[i], h0 = at.get(x0 + ':' + cz).h; let x1 = x0;
        while (i + 1 < xs.length && xs[i + 1] === x1 + 1 && Math.abs(at.get(xs[i + 1] + ':' + cz).h - h0) <= 9) x1 = xs[++i];
        const prev = runs.find(r => r.x0 === x0 && r.x1 === x1 && r.z1 === cz - 1 && Math.abs(r.h - h0) <= 9);
        if (prev) prev.z1 = cz; else runs.push({ x0, x1, z0: cz, z1: cz, h: h0 });
      }
    }
    const out = areas[loc] = areas[loc] || [];
    for (const r of runs) out.push([o[0] + r.x0 * 10 - GX0, o[1] + r.z0 * 10 - GZ0, o[0] + (r.x1 + 1) * 10 - GX0, o[1] + (r.z1 + 1) * 10 - GZ0, +(SHEAR * r.h / TILE).toFixed(2)]);
  }
  const labels = {};
  for (const [loc, rects] of Object.entries(areas)) {
    let sx = 0, sz = 0, n = 0;
    for (const r of rects) { const a = (r[2] - r[0]) * (r[3] - r[1]); sx += (r[0] + r[2]) / 2 * a; sz += (r[1] + r[3]) / 2 * a; n += a; }
    const cx = sx / n, cz = sz / n; let best = null, bd = 1e9;
    for (const r of rects) { const px = Math.max(r[0] + 5, Math.min(r[2] - 5, cx)), pz = Math.max(r[1] + 5, Math.min(r[3] - 5, cz)), d = Math.hypot(px - cx, pz - cz); if (d < bd) { bd = d; best = [+px.toFixed(1), +pz.toFixed(1), r[4]]; } }
    labels[loc] = best;
  }
  const outdoor = new Set(Object.keys(areas).map(Number)), entrances = {};
  for (const m of MATS) for (const z of zonesOf[m] || []) for (const w of W[z]) {
    const dl = w[2] < NZ ? zloc(w[2]) : -1;
    if (dl < 0 || dl === zloc(z) || outdoor.has(dl)) continue;
    const o = LAYOUT[m], x = +(o[0] + w[6] / TILE - GX0).toFixed(1), zz = +(o[1] + w[8] / TILE - GZ0).toFixed(1), lift = +(SHEAR * (sh16(w[7]) + o[2]) / TILE).toFixed(2);
    const list = entrances[dl] = entrances[dl] || [];
    if (!list.some(e => Math.hypot(e[0] - x, e[1] - zz) < 4)) list.push([x, zz, lift]);
  }
  // ── Items und Trainer: Personen der Zonen (Teil 1 der Zonendatei, je 0x30 Byte: Modell u16@6, Skript u16@14,
  // Kachel x/z u16@44/46). Skript 7000 + n = Item-Ball n (Tabelle in Skript 39 von a/0/2/9 ab 0xB64, je 12 Byte:
  // Item u16, Anzahl u32@4), Modell 8193 = TM-Ball; Skript 3000 + n = Trainer n (5000 + n: sein Partner, zählt nicht extra).
  const fieldItems = [];
  if (!IS_XY) { const b = amxBytes(G(file('a/0/2/9'), true)[39]); for (let o = 0xB64; o + 12 <= b.length; o += 12) fieldItems.push([b.readUInt16LE(o), b.readUInt32LE(o + 4)]); }
  // TM/VM → Attacke: Tabelle im Programmcode (TM01–92, VM01–06, TM93–100, VM07), erkannt an den ersten sechs TMs
  const tmMove = {};
  if (!IS_XY) {
    const code = rom.code(), head = [468, 337, 473, 347, 46, 92];   // Klauenwetzer, Drachenklaue, Psychoschock, Gedankengut, Brüller, Toxin
    let at = -1;
    for (let o = 0; o + 12 < code.length && at < 0; o += 2) if (head.every((v, k) => code.readUInt16LE(o + k * 2) === v)) at = o;
    if (at < 0) throw new Error('TM-Tabelle nicht gefunden');
    const names = OrasRom._internal.textFile(G(file('a/0/7/3'), false)[114]);   // englische Item-Namen: TM01 … / HM01 …
    names.forEach((n, id) => {
      const m = /^(TM|HM)(\d+)$/.exec(n || '');
      if (!m) return;
      const k = +m[2], idx = m[1] === 'HM' ? (k <= 6 ? 92 + k - 1 : 106) : (k <= 92 ? k - 1 : 98 + k - 93);
      tmMove[id] = code.readUInt16LE(at + idx * 2);
    });
  }
  const cellH = (m, x, z) => { const h = hist.get(m + ':' + Math.floor(x / 10) + ':' + Math.floor(z / 10)); let best = 0, bw = -1; if (h) for (const [q, w] of h) if (w > bw) { bw = w; best = q; } return best * 4.5 + LAYOUT[m][2]; };
  const items = {}, trainers = {}, seenItem = new Map(), seenTr = new Map();
  const onMap = new Set(MATS);
  for (let z = 0; z < NZ; z++) {
    let e; try { e = pack(ZO[z])[1]; } catch (err) { continue; }
    const m = zm(z), loc = zloc(z), out = onMap.has(m) && !(SPECIAL[m] && SPECIAL[m].box);
    for (let i = 0, o = 8 + e[4] * 0x14; i < e[5]; i++, o += 0x30) {
      const model = u16(e, o + 6), s = u16(e, o + 14), x = u16(e, o + 44), zz = u16(e, o + 46);
      const pos = out ? [+(LAYOUT[m][0] + x + 0.5 - GX0).toFixed(1), +(LAYOUT[m][1] + zz + 0.5 - GZ0).toFixed(1), +(SHEAR * cellH(m, x, zz) / TILE).toFixed(2)] : [null, null, null];
      if (s >= 7000 && s < 7000 + fieldItems.length && (model === 8192 || model === 8193)) {
        const [it, qty] = fieldItems[s - 7000], prev = seenItem.get(s);
        if (prev && (prev[3] != null || pos[0] == null)) continue;            // derselbe Ball in einer anderen Zone (Story-Stand)
        const row = [it, qty, tmMove[it] || 0, ...pos];
        if (prev) { const l = items[prev.loc]; l.splice(l.indexOf(prev.row), 1); }
        (items[loc] = items[loc] || []).push(row); seenItem.set(s, Object.assign(row, { loc, row }));
      } else if (s >= 3000 && s < 4000) {
        const id = s - 3000, key = loc + ':' + id, prev = seenTr.get(key);
        if (prev && (prev[1] != null || pos[0] == null)) continue;
        const row = [id, ...pos];
        if (prev) { const l = trainers[loc]; l.splice(l.indexOf(prev), 1); }
        (trainers[loc] = trainers[loc] || []).push(row); seenTr.set(key, row);
      }
    }
  }
  const strip = o => Object.fromEntries(Object.entries(o).map(([k, l]) => [k, l.map(r => r.slice(0, r.length))]));
  fs.mkdirSync(path.dirname(PLACES), { recursive: true });
  fs.writeFileSync(PLACES, JSON.stringify({ width: COLS * BLOCK, height: ROWS * BLOCK, shear: SHEAR, areas, labels, entrances, items: strip(items), trainers: strip(trainers) }));
  const count = o => Object.values(o).reduce((s, l) => s + l.length, 0), placed = o => Object.values(o).reduce((s, l) => s + l.filter(r => r[r.length - 3] != null).length, 0);
  console.log('Orte:', Object.keys(areas).length, 'mit Fläche,', Object.keys(entrances).length, 'mit Eingang · Items', count(items), '(' + placed(items) + ' draußen) · Trainer', count(trainers), '(' + placed(trainers) + ' draußen) →', PLACES);
  console.log('fertig in', ((Date.now() - t0) / 1000).toFixed(0), 's');
})().catch(e => { console.error(e); process.exit(1); });
