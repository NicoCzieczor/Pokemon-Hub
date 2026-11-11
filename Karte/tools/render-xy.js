/*
 * Rendert die Oberwelt von Kalos (Pokémon X / Y) aus der eigenen ROM – mit den Bausteinen von render-oras.js
 * (BCH-Modelle, 3DS-Texturen, Rasterizer, Schrägsicht 16 px je Kachel).
 *
 * Kalos ist im Spiel keine durchgehende Welt: Städte und Routen liegen in eigenen Kartenmatrizen (a/0/4/2), die an
 * Toren, Höhlen und Kartenrändern verbunden sind – und Tore sind keine maßstäblichen Durchgänge (nach den Warps läge
 * Route 14 nur 121 Kacheln nördlich von Route 4, Illumina City ist aber 267 Kacheln hoch). Ein Ausgleich über alle
 * Warps (wie bei Hoenn) schöbe die Karten übereinander. Deshalb:
 *   1. Starre Gruppen: Matrizen, die direkt aneinander stoßen (Außen↔Außen-Warps im Raster), exakt zueinander.
 *   2. Die Gruppen liegen wie auf der Regionskarte um Illumina City (GROUPS, von Hand, Kacheln).
 *   3. Illumina City besteht aus vier Matrizen (Südring 128, Nordring 129, Avenuen 130, Zentrum 131), deren Warps
 *      auf Schienen liegen (Feld 5 = 1) und keine Rasterlage verraten; ausgerichtet über die Grundrisse
 *      (Ringhälften durch größte Deckung, Avenuen an ihren Stummeln, Zentrum an seinen Strahlenstraßen).
 * Außenzonen: Bit 0x400 im Wort 0x1C des Zonenkopfs. Gebäude: Teil 3 jedes Kartenblocks (a/0/4/1), je 0x2C Byte
 * (Modell u16 → a/0/2/4, Skalierung, Drehung in Grad, Position in Einheiten der Matrix); Texturen aus Teil 1 der
 * Gebietsdaten (a/0/1/3), Gelände aus Teil 11.
 *
 * Aufruf: node render-xy.js <pokemon-x.3ds|.cxi> <render-ordner> [--overview=<png>] [--px=1]
 */
'use strict';
const fs = require('fs');
const path = require('path');
const R = require('./render-oras.js');
const OrasRom = require('../../Bosse/oras-rom.js');

const argv = process.argv.slice(2);
const opts = Object.fromEntries(argv.filter(a => a.startsWith('--')).map(a => { const [k, v] = a.slice(2).split('='); return [k, v ?? '1']; }));
const [ROM, outArg] = argv.filter(a => !a.startsWith('--'));
if (!ROM || !outArg) { console.error('Aufruf: node render-xy.js <pokemon-x.3ds|.cxi> <render-ordner> [--overview=<png>] [--px=1]'); process.exit(1); }
const OUT = path.resolve(outArg);
fs.mkdirSync(OUT, { recursive: true });
R.setXY(true);
const { TILE, BLOCK, SHEAR, u16, u32, pack } = R;

// Matrizen der Oberwelt (ohne Höhlen, Innenräume, Story-Varianten von Cromlexia/Frescora, Säle der Top Vier)
const OVERWORLD = [0, 1, 2, 3, 4, 5, 6, 7, 8, 27, 29, 30, 31, 32, 33, 59, 61, 63, 74, 77, 78, 81, 87, 101, 128, 129, 130, 131,
  201, 206, 210, 212, 214, 215, 216, 217, 218, 223];
// Illumina City: Lage der Teile zum Südring (Kacheln)
const LUMIOSE = { 128: [0, 0], 129: [-7, -62], 130: [-4.5, -22], 131: [75.75, 55] };
const LUMIOSE_C = [135, 98, 150];   // Mitte und Radius der Stadt (Kacheln, Rahmen des Südrings)
// Ausgänge von Illumina City (Kacheln im Rahmen des Südrings) zu den Toren: Route-Zone → Ausgang, Richtung nach außen
const LUMIOSE_GATES = { 261: [133, 232, 0, 1], 262: [-8, 150, -1, 0], 272: [-8, 70, -1, 0], 273: [131, -35, 0, -1], 276: [265, 85, 1, 0] };
const GATE_DEPTH = 15;   // Kacheln von Tür zu Tür in den Illumina-Toren
// Verbindungen ohne Rasterlage auf einer Seite (Schienen, mehrere Höhlen, Zug): Lage von b zu a (Ursprünge, Kacheln)
const MANUAL = [
  { a: 2, b: 27, d: [395, 260] },     // Route 6 nördlich von Route 7 / Vanitéa
  { a: 27, b: 33, d: [0, -215] },     // Magnum-Opus-Palast am Nordende von Route 6
  { a: 218, b: 101, d: [-40, -170] },  // Pokémon-Liga über der Siegesstraße, die an Route 21 beginnt
  { a: 218, b: 78, d: [-40, -60] },   // Siegesstraße (Außenteil) zwischen Route 21 und Liga
  { a: 216, b: 223, d: [80, 220] },   // Batika City: nur per Zug, südöstlich von Fractalia
];
// Korrekturen je Gruppe (Kacheln, Gruppe = ihre erste Matrix), nach der Federsimulation
const ADJUST = {};
// Feste Lage je Gruppe (Ursprung ihrer ersten Matrix, Kacheln) – von Hand nach der Regionskarte; ersetzt die Simulation
const PLACE = {
  128: [0, 0],                                  // Illumina City (Mitte)
  0: [-247.5, 70.5], 2: [-820.5, -310.5],       // an den Illumina-Toren exakt: Süden (Route 4), Westen (Route 5)
  5: [-327.5, -685.5], 6: [-162.5, -483.5],     // Norden (Route 14), Osten (Route 16)
  // Die übrigen Gruppen: so, dass die Türen verbundener Gruppen (Tore, Höhlen) möglichst nah beieinander liegen, ohne
  // dass sich Flächen überlagern (10 Kacheln Abstand) – gerechnet aus --dump (Türen und Flächen), dann gerundet
  27: [-245, 30], 33: [-240, -160],             // Route 6 am Stichweg von Route 7, Magnum-Opus-Palast darüber
  3: [-970, -425], 29: [-390, 300],             // Westküste: Relievera, Petrophia, Cromlexia, Route 11; Route 9
  59: [-540, -235], 4: [-890, -620], 63: [-190, -300],   // Yantara, Tempera (unten/oben)
  31: [-180, -165],                             // Route 13 (Badlands) mit Kraftwerk
  210: [400, -35], 32: [410, 55], 214: [590, 105],       // Frescora, Route 17, Fluxia
  7: [150, -315], 215: [590, 320],              // Mosaia / Route 18, Route 19
  77: [270, 515], 218: [320, 360], 78: [350, 270], 101: [260, 160],   // Fractalia, Route 21, Siegesstraße, Liga
  223: [480, 530],                              // Batika City (nur per Zug)
};
const GAP = 12;          // Mindestabstand zwischen Gruppen (Kacheln)

const rom = R.openRomfs(ROM), file = rom.file;
const G = OrasRom._internal.garc, lz11 = OrasRom._internal.lz11;
const un = x => (x && x[0] === 0x11 ? lz11(x) || x : x);
const GR = G(file('a/0/4/1'), false), MM = G(file('a/0/4/2'), false), AD = G(file('a/0/1/3'), false), ZO = G(file('a/0/1/2'), true);
const BM = G(file('a/0/2/4'), false);
const de = OrasRom._internal.textFile(G(file('a/0/7/7'), false)[72]);
const zt = ZO[ZO.length - 1], NZ = zt.length / 56;
const zm = z => u16(zt, z * 56 + 4), za = z => u16(zt, z * 56 + 2), zloc = z => u16(zt, z * 56 + 0x1C) & 0x1FF, zout = z => (u16(zt, z * 56 + 0x1C) >> 10) & 1;
const zonesOf = {}; for (let z = 0; z < NZ; z++) (zonesOf[zm(z)] = zonesOf[zm(z)] || []).push(z);
const areaOf = m => { const c = {}; (zonesOf[m] || []).forEach(z => { c[za(z)] = (c[za(z)] || 0) + 1; }); return +Object.entries(c).sort((a, b) => b[1] - a[1])[0][0]; };
const nameOf = m => [...new Set((zonesOf[m] || []).map(z => de[zloc(z)]))].join('/');

const matrix = mi => {
  const m = pack(MM[mi])[0], w = u16(m, 4), h = u16(m, 6), cells = [], W = w * 4, H = h * 4, g = [], base = 8 + w * h * 2;
  for (let k = 0; k < w * h; k++) { const v = u16(m, 8 + k * 2); if (v !== 0xffff) cells.push({ x: k % w, y: Math.floor(k / w), gr: v }); }
  for (let y = 0; y < H; y++) { const r = []; for (let x = 0; x < W; x++) r.push(u16(m, base + (y * W + x) * 2)); g.push(r); }
  return { cells, W, H, g, w, h };
};
// Begehbare Fläche: Teil 0 jedes Blocks hat je Kachel ein Attribut, 33/256 = nichts (Kulisse, Fels, Wasser am Rand).
// Zellen à 10 × 10 Kacheln mit begehbaren Kacheln, um WALK_PAD Zellen erweitert – die eigentliche Fläche einer Matrix
// (bei Matrizen mit nur einer Zone trägt sonst jede Zelle die Zone, auch reine Kulisse)
const WALK_PAD = 1;
const walkCache = new Map();
function walkCells(m) {
  if (walkCache.has(m)) return walkCache.get(m);
  const M = matrix(m), raw = new Set(), out = new Set();
  if (LUMIOSE[m]) {   // Schienen statt Raster: die Kacheln tragen keine Attribute – die Stadt ist der Kreis um ihre Mitte
    const res = [];
    for (let cz = 0; cz < M.H; cz++) for (let cx = 0; cx < M.W; cx++) if (Math.hypot(LUMIOSE[m][0] + cx * 10 + 5 - LUMIOSE_C[0], LUMIOSE[m][1] + cz * 10 + 5 - LUMIOSE_C[1]) <= LUMIOSE_C[2] - 10) res.push([cx, cz]);
    walkCache.set(m, res);
    return res;
  }
  for (const c of M.cells) {
    const p0 = pack(un(GR[c.gr]))[0];
    for (let t = 0; t < 1600; t++) {
      const o = 4 + t * 4;
      if (u16(p0, o) === 33 && u16(p0, o + 2) === 256) continue;
      const cx = c.x * 4 + Math.floor((t % 40) / 10), cz = c.y * 4 + Math.floor(Math.floor(t / 40) / 10);
      if (M.g[cz] && M.g[cz][cx] !== 0xffff) raw.add(cx + ':' + cz);
    }
  }
  for (const k of raw) { const [cx, cz] = k.split(':').map(Number); for (let dz = -WALK_PAD; dz <= WALK_PAD; dz++) for (let dx = -WALK_PAD; dx <= WALK_PAD; dx++) if (M.g[cz + dz] && M.g[cz + dz][cx + dx] != null) out.add((cx + dx) + ':' + (cz + dz)); }
  const res = [...out].map(k => k.split(':').map(Number));
  walkCache.set(m, res);
  return res;
}
const warps = z => {
  try {
    const e = pack(ZO[z])[1], nF = e[4], nN = e[5], nW = e[6], out = [];
    let o = 8 + nF * 0x14 + nN * 0x30;
    for (let i = 0; i < nW; i++, o += 0x18) { const w = []; for (let k = 0; k < 0x18; k += 2) w.push(u16(e, o + k)); out.push(w); }
    return out;
  } catch (err) { return []; }
};

// ── Lage: starre Gruppen aus direkten Außen↔Außen-Übergängen (beide Seiten im Raster), dann GROUPS ──
const ON = new Set(OVERWORLD), WP = {}; for (let z = 0; z < NZ; z++) WP[z] = warps(z);
const edges = [];
for (let z = 0; z < NZ; z++) for (const w of WP[z]) {
  const d = WP[w[2]] && WP[w[2]][w[3]], a = zm(z), b = w[2] < NZ ? zm(w[2]) : -1;
  if (!d || d[2] !== z || w[5] || d[5] || a === b || !ON.has(a) || !ON.has(b)) continue;
  edges.push({ a, b, d: [(w[6] - d[6]) / TILE, (w[8] - d[8]) / TILE, R.sh16(w[7]) - R.sh16(d[7])] });
}
const groupOf = {}, groups = [];
for (const m of OVERWORLD) {
  if (groupOf[m] != null) continue;
  const g = [m]; groupOf[m] = groups.length;
  for (let i = 0; i < g.length; i++) for (const e of edges) {
    const o = e.a === g[i] ? e.b : e.b === g[i] ? e.a : null;
    if (o != null && groupOf[o] == null) { groupOf[o] = groups.length; g.push(o); }
  }
  groups.push(g);
}
// Illumina City als eine Gruppe
for (const m of [129, 130, 131]) { groups[groupOf[m]] = groups[groupOf[m]].filter(x => x !== m); groupOf[m] = groupOf[128]; groups[groupOf[128]].push(m); }
const LOCAL = {};
for (const g of groups.filter(g => g.length)) {
  const local = { [g[0]]: [0, 0, 0] };
  if (g[0] === 128) for (const m of g) local[m] = [...LUMIOSE[m], 0];
  else for (let i = 0; i < g.length; i++) for (const e of edges) {   // Breitensuche reicht: die Gruppen sind Bäume oder widerspruchsfrei
    if (local[e.a] && !local[e.b] && g.includes(e.b)) local[e.b] = local[e.a].map((v, k) => v + e.d[k]);
    if (local[e.b] && !local[e.a] && g.includes(e.a)) local[e.a] = local[e.b].map((v, k) => v - e.d[k]);
  }
  Object.assign(LOCAL, local);
}
// Verbindungen zwischen Gruppen: Tür in Gruppe A → Innengebiet (Tor, Höhle) → Tür in Gruppe B.
// Versatz = Lage der Tür in A + (Ausgang − Eingang im Innengebiet) − Lage der Tür in B (alles in Kacheln)
const links = [], passages = [];   // passages: Innengebiete (Tor, Höhle) mit Türen in mehreren Gruppen – für die Verbindungslinien der Karte
const door = (z, w) => [LOCAL[zm(z)][0] + w[6] / TILE, LOCAL[zm(z)][1] + w[8] / TILE];
for (let I = 0; I < NZ; I++) {
  if (ON.has(zm(I))) continue;
  const outs = [];
  WP[I].forEach((w, i) => {
    const z = w[2]; if (z >= NZ || !ON.has(zm(z)) || !LOCAL[zm(z)]) return;
    const d = WP[z] && WP[z][w[3]]; if (!d || d[2] !== I || d[5]) return;
    outs.push({ z, inner: [w[6] / TILE, w[8] / TILE], at: door(z, d) });
  });
  if (new Set(outs.map(o => groupOf[zm(o.z)])).size > 1) passages.push({ loc: zloc(I), doors: outs.map(o => ({ g: groupOf[zm(o.z)], at: o.at })) });
  for (const a of outs) for (const b of outs) {
    const ga = groupOf[zm(a.z)], gb = groupOf[zm(b.z)];
    if (ga === gb || a.z === b.z) continue;
    links.push({ ga, gb, via: I, d: [0, 1].map(k => a.at[k] + (b.inner[k] - a.inner[k]) - b.at[k]) });
  }
}
// Illumina-Tore: Tür auf der Route liegt GATE_DEPTH vor dem Ausgang der Stadt
const GPOS = { [groupOf[128]]: [0, 0] };
for (const [rz, [x, z, dx, dz]] of Object.entries(LUMIOSE_GATES)) {
  const gate = WP[rz].find(w => w[2] < NZ && WP[w[2]].some(v => v[2] < NZ && (zm(v[2]) === 128 || zm(v[2]) === 129)));
  if (!gate) continue;
  const at = door(+rz, gate), g = groupOf[zm(+rz)];
  passages.push({ loc: zloc(gate[2]), doors: [{ g, at }, { g: groupOf[128], at: [x, z] }] });
  if (GPOS[g]) continue;
  GPOS[g] = [x + dx * GATE_DEPTH - at[0], z + dz * GATE_DEPTH - at[1]];
}
if (opts.doors) {
  // Je Gruppe: Rahmen und Türen zu anderen Gruppen, alles relativ zum Ursprung der ersten Matrix
  for (const g of groups) {
    if (!g.length) continue;
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const m of g) { if (!LOCAL[m]) continue; for (const [cx, cz] of walkCells(m)) { const x = LOCAL[m][0] + cx * 10, z = LOCAL[m][1] + cz * 10; a = Math.min(a, x); b = Math.min(b, z); c = Math.max(c, x + 10); d = Math.max(d, z + 10); } }
    console.log(`G${g[0]} ${nameOf(g[0])}: Rahmen ${[a, b, c, d].map(Math.round).join(',')}`);
    for (let I = 0; I < NZ; I++) {
      if (ON.has(zm(I))) continue;
      const outs = [];
      WP[I].forEach(w => { const z = w[2]; if (z >= NZ || !ON.has(zm(z)) || !LOCAL[zm(z)]) return; const dd = WP[z] && WP[z][w[3]]; if (!dd || dd[2] !== I || dd[5]) return; outs.push({ z, at: door(z, dd) }); });
      const mine = outs.filter(o => g.includes(zm(o.z))), other = outs.filter(o => !g.includes(zm(o.z)));
      for (const o of mine) if (other.length) console.log(`   Tür ${o.at.map(v => v.toFixed(0)).join(',')} → über ${de[zloc(I)]} zu ${[...new Set(other.map(x => nameOf(zm(x.z))))].join(' / ')}`);
    }
  }
}
if (opts.dump) {
  // Für das Einrichten der Lage (PLACE): je Gruppe Fläche (Zellen à 10 Kacheln) und Türen zu anderen Gruppen
  const dump = { groups: [], gates: [] };
  for (const g of groups) {
    if (!g.length) continue;
    const cells = [], doors = [];
    for (const m of g) { if (!LOCAL[m]) continue; for (const [cx, cz] of walkCells(m)) cells.push([LOCAL[m][0] + cx * 10, LOCAL[m][1] + cz * 10, m]); }
    for (let I = 0; I < NZ; I++) {
      if (ON.has(zm(I))) continue;
      const outs = [];
      WP[I].forEach(w => { const z = w[2]; if (z >= NZ || !ON.has(zm(z)) || !LOCAL[zm(z)]) return; const dd = WP[z] && WP[z][w[3]]; if (!dd || dd[2] !== I || dd[5]) return; outs.push({ z, at: door(z, dd) }); });
      const mine = outs.filter(o => g.includes(zm(o.z))), other = outs.filter(o => !g.includes(zm(o.z)));
      for (const o of mine) if (other.length) doors.push({ at: o.at, via: de[zloc(I)], viaZone: I, to: [...new Set(other.map(x => groups[groupOf[zm(x.z)]][0]))] });
    }
    dump.groups.push({ id: g[0], mats: g, name: [...new Set(g.map(nameOf))].join(' + '), cells, doors });
  }
  for (const [rz, [x, z, dx, dz]] of Object.entries(LUMIOSE_GATES)) {
    const gate = WP[rz].find(w => w[2] < NZ && WP[w[2]].some(v => v[2] < NZ && (zm(v[2]) === 128 || zm(v[2]) === 129)));
    if (gate) dump.gates.push({ group: groups[groupOf[zm(+rz)]][0], at: door(+rz, gate), lum: [x, z], dir: [dx, dz], depth: GATE_DEPTH });
  }
  dump.lumiose = LUMIOSE_C; dump.place = PLACE; dump.manual = MANUAL;
  // alle Warps der Außenzonen (für Verbindungen ohne Rasterlage: Schienen, Züge)
  dump.warps = [];
  for (let z = 0; z < NZ; z++) { if (!ON.has(zm(z)) || !LOCAL[zm(z)]) continue; WP[z].forEach(w => { if (w[2] < NZ) dump.warps.push({ z, m: zm(z), loc: de[zloc(z)], to: w[2], toM: zm(w[2]), toLoc: de[zloc(w[2])], rail: w[5], at: door(z, w) }); }); }
  fs.writeFileSync(path.resolve(opts.dump), JSON.stringify(dump));
  console.log('Lage-Daten →', opts.dump);
  process.exit(0);
}
for (const l of MANUAL) links.push({ ga: groupOf[l.a], gb: groupOf[l.b], d: [0, 1].map(k => LOCAL[l.a][k] + l.d[k] - LOCAL[l.b][k]), manual: true });
// Breitensuche über die übrigen Verbindungen (je Gruppenpaar der Mittelwert)
for (let changed = true; changed;) {
  changed = false;
  for (let g = 0; g < groups.length; g++) {
    if (GPOS[g] || !groups[g].length) continue;
    const ls = links.filter(l => l.gb === g && GPOS[l.ga]);
    if (!ls.length) continue;
    GPOS[g] = [0, 1].map(k => ls.reduce((s, l) => s + GPOS[l.ga][k] + l.d[k], 0) / ls.length);
    changed = true;
  }
}
// Federsimulation: Verbindungen ziehen an ihre Soll-Lage, Überlappungen (Zellen à 10 Kacheln) stoßen ab
{
  const live = groups.map((g, gi) => (g.length && GPOS[gi] ? gi : -1)).filter(gi => gi >= 0), fixed = groupOf[128];
  const cellsOf = {};
  for (const gi of live) {
    const list = [];
    for (const m of groups[gi]) {
      if (!LOCAL[m]) continue;
      for (const [cx, cz] of walkCells(m)) {
        const x = LOCAL[m][0] + cx * 10 + 5, z = LOCAL[m][1] + cz * 10 + 5;
        if (LUMIOSE[m] && Math.hypot(x - LUMIOSE_C[0], z - LUMIOSE_C[1]) > LUMIOSE_C[2]) continue;   // Illumina: nur die Stadt, nicht die Rechtecke
        list.push([x, z]);
      }
    }
    cellsOf[gi] = list;
  }
  const pair = new Map();   // Soll-Versatz je Gruppenpaar (Mittel der Verbindungen)
  for (const l of links) {
    if (!cellsOf[l.ga] || !cellsOf[l.gb]) continue;
    const k = l.ga + '>' + l.gb, e = pair.get(k) || { ga: l.ga, gb: l.gb, d: [0, 0], n: 0 };
    e.d[0] += l.d[0]; e.d[1] += l.d[1]; e.n++; pair.set(k, e);
  }
  const springs = [...pair.values()].map(e => ({ ...e, d: [e.d[0] / e.n, e.d[1] / e.n] }));
  const P = Object.fromEntries(live.map(gi => [gi, [...GPOS[gi]]]));
  const occ = gi => { const S = new Set(); for (const [x, z] of cellsOf[gi]) S.add(Math.floor((x + P[gi][0]) / 10) + ':' + Math.floor((z + P[gi][1]) / 10)); return S; };
  for (let it = 0; it < 600; it++) {
    for (const sp of springs) {
      const e = [0, 1].map(k => P[sp.gb][k] - P[sp.ga][k] - sp.d[k]);
      const wa = sp.ga === fixed ? 0 : 0.5, wb = sp.gb === fixed ? 0 : 0.5, f = 0.15 / Math.max(1e-9, wa + wb) * (wa + wb);
      for (let k = 0; k < 2; k++) { P[sp.ga][k] += f * wa * e[k]; P[sp.gb][k] -= f * wb * e[k]; }
    }
    // Abstoßung: Zellen (mit Abstand GAP) einer Gruppe in einer anderen
    const occs = Object.fromEntries(live.map(gi => [gi, occ(gi)]));
    for (const a of live) for (const b of live) {
      if (a >= b) continue;
      let n = 0, sx = 0, sz = 0;
      const pad = Math.ceil(GAP / 10);
      for (const [x, z] of cellsOf[b]) {
        const cx = Math.floor((x + P[b][0]) / 10), cz = Math.floor((z + P[b][1]) / 10);
        let hit = false;
        for (let dz = -pad; dz <= pad && !hit; dz++) for (let dx = -pad; dx <= pad && !hit; dx++) if (occs[a].has((cx + dx) + ':' + (cz + dz))) hit = true;
        if (hit) { n++; sx += x + P[b][0]; sz += z + P[b][1]; }
      }
      if (!n) continue;
      const ca = cellsOf[a].reduce((s, [x, z]) => [s[0] + x + P[a][0], s[1] + z + P[a][1]], [0, 0]).map(v => v / cellsOf[a].length);
      let vx = sx / n - ca[0], vz = sz / n - ca[1]; const len = Math.hypot(vx, vz) || 1; vx /= len; vz /= len;
      const step = Math.min(6, 1 + n * 0.05), wa = a === fixed ? 0 : 1, wb = b === fixed ? 0 : 1, tot = wa + wb || 1;
      P[a][0] -= vx * step * wa / tot; P[a][1] -= vz * step * wa / tot; P[b][0] += vx * step * wb / tot; P[b][1] += vz * step * wb / tot;
    }
  }
  for (const gi of live) GPOS[gi] = PLACE[groups[gi][0]] ? [...PLACE[groups[gi][0]]] : P[gi].map(v => Math.round(v));
  const err = springs.map(sp => ({ sp, e: Math.hypot(...[0, 1].map(k => GPOS[sp.gb][k] - GPOS[sp.ga][k] - sp.d[k])) })).filter(x => x.e > 20);
  if (err.length) console.log('Abweichende Verbindungen:', err.map(x => `${nameOf(groups[x.sp.ga][0])}→${nameOf(groups[x.sp.gb][0])} ${x.e.toFixed(0)}`).join(' | '));
}
const LAYOUT = {};
groups.forEach((g, gi) => {
  if (!g.length) return;
  const at = GPOS[gi], adj = ADJUST[g[0]] || [0, 0];
  if (!at) { console.log('  ohne Lage:', g.map(nameOf).join(', ')); return; }
  for (const m of g) if (LOCAL[m]) LAYOUT[m] = [at[0] + adj[0] + LOCAL[m][0], at[1] + adj[1] + LOCAL[m][1], LOCAL[m][2]];
});
const MATS = OVERWORLD.filter(m => LAYOUT[m]);
console.log('Gruppen:', groups.filter(g => g.length).map(g => '[' + g.map(m => m + ':' + nameOf(m)).join(', ') + ']').join(' '));

// ── Übersicht: bespielte Zellen je Matrix als Fläche, mit Namen – zum Einrichten von GROUPS ──
if (opts.overview) {
  const PXO = +(opts.px || 1), mats = {};
  let x0 = Infinity, z0 = Infinity, x1 = -Infinity, z1 = -Infinity;
  for (const m of MATS) {
    const M = mats[m] = matrix(m), o = LAYOUT[m];
    for (let cz = 0; cz < M.H; cz++) for (let cx = 0; cx < M.W; cx++) if (M.g[cz][cx] !== 0xffff) {
      x0 = Math.min(x0, o[0] + cx * 10); z0 = Math.min(z0, o[1] + cz * 10); x1 = Math.max(x1, o[0] + cx * 10 + 10); z1 = Math.max(z1, o[1] + cz * 10 + 10);
    }
  }
  const W = Math.ceil((x1 - x0) * PXO) + 1, H = Math.ceil((z1 - z0) * PXO) + 1, px = new Uint8Array(W * H * 4);
  const hue = m => { const h = (m * 137.5) % 360, f = n => { const k = (n + h / 30) % 12; return 0.55 - 0.35 * Math.max(-1, Math.min(k - 3, 9 - k, 1)); }; return [f(0), f(8), f(4)].map(v => Math.round(v * 255)); };
  const info = [];
  for (const m of MATS) {
    const M = mats[m], o = LAYOUT[m], c = hue(m);
    let sx = 0, sz = 0, n = 0;
    for (const [cx, cz] of walkCells(m)) {
      const X0 = Math.round((o[0] + cx * 10 - x0) * PXO), Z0 = Math.round((o[1] + cz * 10 - z0) * PXO);
      for (let y = Z0; y < Z0 + 10 * PXO; y++) for (let x = X0; x < X0 + 10 * PXO; x++) {
        const i = (y * W + x) * 4; if (i < 0 || i >= px.length) continue;
        if (px[i + 3] && px[i + 3] !== 200 + (groupOf[m] % 50)) { px[i] = 255; px[i + 1] = 0; px[i + 2] = 0; }   // Überlappung zweier Gruppen: rot
        else if (!px[i + 3]) { px[i] = c[0]; px[i + 1] = c[1]; px[i + 2] = c[2]; px[i + 3] = 200 + (groupOf[m] % 50); }
      }
      sx += o[0] + cx * 10 + 5; sz += o[1] + cz * 10 + 5; n++;
    }
    info.push({ m, name: nameOf(m), cx: ((sx / n) - x0) * PXO, cz: ((sz / n) - z0) * PXO });
  }
  for (let i = 3; i < px.length; i += 4) if (px[i]) px[i] = 255;
  for (const g of groups) {
    if (!g.length || !LAYOUT[g[0]]) continue;
    let a = Infinity, b = Infinity, c = -Infinity, d = -Infinity;
    for (const m of g) { const M = mats[m], o = LAYOUT[m]; if (!M) continue; for (let cz = 0; cz < M.H; cz++) for (let cx = 0; cx < M.W; cx++) if (M.g[cz][cx] !== 0xffff) { a = Math.min(a, o[0] + cx * 10); b = Math.min(b, o[1] + cz * 10); c = Math.max(c, o[0] + cx * 10 + 10); d = Math.max(d, o[1] + cz * 10 + 10); } }
    console.log(`  Gruppe ${g[0]} (${nameOf(g[0])}): Ursprung ${LAYOUT[g[0]].slice(0, 2).map(v => Math.round(v)).join(', ')}  Rahmen ${[a, b, c, d].map(Math.round).join(', ')}`);
  }
  fs.writeFileSync(path.resolve(opts.overview), R.png(W, H, px));
  fs.writeFileSync(path.resolve(opts.overview) + '.json', JSON.stringify({ x0, z0, px: PXO, info, layout: LAYOUT }));
  console.log('Übersicht', opts.overview, W + '×' + H, 'Welt', x0, z0, x1, z1);
  process.exit(0);
}

// ── Rendern ───────────────────────────────────────────────────────────────────
const SS = +(opts.ss || 2), REG = 4, PX = R.PX, MARGIN_UP = 40, SCENE = 3;   // SCENE: Kulissen-Rand um die Fläche (Zellen)
const t0 = Date.now();
const mats = {}; for (const m of MATS) mats[m] = matrix(m);
const isLum = m => LUMIOSE[m] != null;
// Weltrahmen: begehbare Flächen + Rand
let wx0 = Infinity, wz0 = Infinity, wx1 = -Infinity, wz1 = -Infinity;
for (const m of MATS) for (const [cx, cz] of walkCells(m)) {
  const x = LAYOUT[m][0] + cx * 10, z = LAYOUT[m][1] + cz * 10;
  wx0 = Math.min(wx0, x); wz0 = Math.min(wz0, z); wx1 = Math.max(wx1, x + 10); wz1 = Math.max(wz1, z + 10);
}
const GX0 = Math.floor((wx0 - 40) / BLOCK) * BLOCK, GZ0 = Math.floor((wz0 - 40) / BLOCK) * BLOCK;
const COLS = Math.ceil((wx1 + 40 - GX0) / BLOCK), ROWS = Math.ceil((wz1 + 40 - GZ0) / BLOCK);
const GW = COLS * BLOCK, GH = ROWS * BLOCK;
// Eigentümer je Weltkachel: die Matrix, in deren Fläche (begehbare Zellen) die Kachel am tiefsten liegt;
// near: Abstand (Zellen) zur Fläche jeder Matrix – Kulisse nur bis SCENE Zellen davon
const owner = new Int16Array(GW * GH).fill(-1), depthAt = new Float32Array(GW * GH).fill(-1e9);
const nearOf = {};
for (const m of MATS) {
  const M = mats[m], o = LAYOUT[m], own = new Set(walkCells(m).map(([x, z]) => x + ':' + z));
  const dist = new Map(), q = [];
  for (const k of own) { const [cx, cz] = k.split(':').map(Number); if ([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([a, b]) => !own.has((cx + a) + ':' + (cz + b)))) { dist.set(k, 1); q.push([cx, cz]); } }
  for (let h = 0; h < q.length; h++) { const [cx, cz] = q[h], d = dist.get(cx + ':' + cz); for (const [a, b] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const k = (cx + a) + ':' + (cz + b); if (own.has(k) && !dist.has(k)) { dist.set(k, d + 1); q.push([cx + a, cz + b]); } } }
  // Abstand außerhalb der Fläche (für den Kulissen-Rand)
  const near = new Map(); let ring = [...own].map(k => k.split(':').map(Number)); own.forEach(k => near.set(k, 0));
  for (let d = 1; d <= SCENE; d++) { const nx = []; for (const [cx, cz] of ring) for (let a = -1; a <= 1; a++) for (let b = -1; b <= 1; b++) { const k = (cx + a) + ':' + (cz + b); if (!near.has(k)) { near.set(k, d); nx.push([cx + a, cz + b]); } } ring = nx; }
  nearOf[m] = near;
  if (isLum(m)) continue;   // Illumina: alle vier Teile gleichrangig (Z-Puffer), siehe prioFor
  for (const k of own) {
    const [cx, cz] = k.split(':').map(Number), d0 = dist.get(k);
    for (let tz = 0; tz < 10; tz++) for (let tx = 0; tx < 10; tx++) {
      const gx = Math.floor(o[0] + cx * 10 + tx - GX0), gz = Math.floor(o[1] + cz * 10 + tz - GZ0);
      if (gx < 0 || gz < 0 || gx >= GW || gz >= GH) continue;
      const d = d0 - Math.max(Math.abs((tx + 0.5) / 10 - 0.5), Math.abs((tz + 0.5) / 10 - 0.5)), i = gz * GW + gx;
      if (d > depthAt[i]) { owner[i] = m; depthAt[i] = d; }
    }
  }
}
const LUM_TILE = (x, z) => Math.hypot(x - LUMIOSE_C[0], z - LUMIOSE_C[1]) <= LUMIOSE_C[2] - 4;
const prioFor = m => {
  const o = LAYOUT[m], near = nearOf[m];
  return (xw, zw) => {
    const tx = xw / TILE, tz = zw / TILE;                      // Weltkacheln
    const lx = tx - o[0], lz = tz - o[1], k = Math.floor(lx / 10) + ':' + Math.floor(lz / 10);
    const nd = near.get(k);
    if (nd == null) return -1;                                 // weit weg von der eigenen Fläche: gar nicht
    if (isLum(m)) return LUM_TILE(tx - LAYOUT[128][0], tz - LAYOUT[128][1]) ? 1 : nd <= 1 ? 0 : -1;
    if (nd > 0) return 0;                                      // Kulissen-Rand
    const gx = Math.floor(tx - GX0), gz = Math.floor(tz - GZ0);
    if (gx < 0 || gz < 0 || gx >= GW || gz >= GH) return 0;
    const ow = owner[gz * GW + gx];
    return ow < 0 || ow === m ? 1 : 0;
  };
};
// Texturen je Gebiet (Teil 11: Gelände, Teil 1: Gebäude) und je Gebäudemodell
const texCache = new Map();
const addTextures = (dict, bch) => { const T = R.parseBCH(bch); for (const t of T.textures) { if (dict[t.name]) continue; const d = R.decodeTexture(T.b, t.addr, t.w, t.h, t.fmt); if (d) dict[t.name] = R.mipTexture({ ...d, name: t.name }); } };
const areaTextures = area => {
  if (texCache.has(area)) return texCache.get(area);
  const p = pack(un(AD[area])), dict = {};
  for (const k of [11, 1]) if (R.isBCH(p[k])) addTextures(dict, p[k]);
  texCache.set(area, dict);
  return dict;
};
const lru = (n, load) => { const c = new Map(); return k => { if (c.has(k)) { const v = c.get(k); c.delete(k); c.set(k, v); return v; } const v = load(k); c.set(k, v); if (c.size > n) c.delete(c.keys().next().value); return v; }; };
const chunkModel = lru(48, g => R.parseBCH(pack(un(GR[g]))[1]));
const bmModel = lru(64, id => {
  if (id >= BM.length) return null;
  const parts = pack(un(BM[id]));
  if (!R.isBCH(parts[0])) return null;
  const B = R.parseBCH(parts[0]), own = {};
  addTextures(own, parts[0]);
  return { B, own };
});
const placements = g => {
  const p3 = pack(un(GR[g]))[3], n = u32(p3, 0), b = Buffer.from(p3.buffer, p3.byteOffset, p3.length), out = [];
  for (let i = 0; i < n; i++) {
    const o = 4 + i * 0x2C;
    out.push({ id: b.readUInt16LE(o), s: [b.readFloatLE(o + 4), b.readFloatLE(o + 8), b.readFloatLE(o + 12)], r: b.readFloatLE(o + 20), p: [b.readFloatLE(o + 28), b.readFloatLE(o + 32), b.readFloatLE(o + 36)] });
  }
  return out;
};
const SKIP_LUM = /LOD|farbuild|far_|_far/i;   // Illumina: vereinfachte Kopien der Nachbarteile und Fernsicht weglassen
// Als Kulisse weglassen: das dunkel auslaufende Fernmeer am Rand der Azurbucht (M4) – ein Trapez vor dem Kartenmeer
const DARK_CUT = { 217: 0.3, 77: 0.3 };   // Route 20 (Irrwald): unter dieser Vertex-Helligkeit nichts zeichnen (schwarzer Waldrand)
const SCENE_SKIP = /^bm_w_beach01_1$|gake_hairenai/;   // … und die Sperr-Klippen jenseits der Fläche (nur Wände, ohne Oberseite: lange braune Streifen)

// Vorlagen für fill-oras.py: Bäume (han_tree) aus einem Block von Route 4, Gras kusa01, Meer bm_w_sea02 (Azurbucht)
if (!opts.only && !opts['places-only']) {
  // Eichen des Nouvaria-Walds (d01_ork04): der Block mit den meisten Bäumen
  const TREE = /^d01_ork/, trees = c => { const B = chunkModel(c.gr); let n = 0; for (const md of B.models) for (const me of R.meshes(B, md)) if (TREE.test(me.mat.name)) n += me.faces.reduce((k, f) => k + f.idx.length, 0); return n; };
  const blk = mats[8].cells.reduce((a, c) => (trees(c) > trees(a) ? c : a));
  const B = chunkModel(blk.gr), tex = areaTextures(areaOf(8));
  const view = { S: PX / TILE * SS, x0: -360, z0: -560 }, tg = R.makeTarget(40 * PX * SS, 52 * PX * SS);
  for (const md of B.models) R.renderModel(tg, B, md, tex, view, { only: TREE });
  const img = R.toRGBA8(tg, SS);
  fs.writeFileSync(path.join(OUT, 'trees.png'), R.png(img.w, img.h, img.px));
  const save = (T, f) => { const L = T.lv[0]; fs.writeFileSync(path.join(OUT, f), R.png(L.w, L.h, Uint8Array.from(L.px, v => Math.round(v * 255)))); };
  save(areaTextures(areaOf(1)).kusa01, 'grass.png');
  save(areaTextures(areaOf(4)).bm_w_sea02, 'sea_tex.png');
  if (opts.templates) { console.log('Vorlagen geschrieben'); process.exit(0); }
}
const chunks = [];
for (const m of MATS) { const M = mats[m], o = LAYOUT[m]; for (const c of M.cells) chunks.push({ m, gr: c.gr, x: o[0] + c.x * 40, z: o[1] + c.y * 40, y: o[2] }); }
const info = { shear: SHEAR, size: BLOCK * PX, rows: ROWS, cols: COLS, origin: [GX0, GZ0], tile: TILE, chunks: {}, layout: LAYOUT,
  lumiose: [LAYOUT[128][0] + LUMIOSE_C[0], LAYOUT[128][1] + LUMIOSE_C[1], LUMIOSE_C[2] - 6] };   // Stadtkreis für die Dächer (fill-xy.py)
console.log('Welt', COLS + ' × ' + ROWS, 'Blöcke,', chunks.length, 'Kartenblöcke des Spiels');
// Zum Testen: --only=Zeile:Spalte,… (Regionen) · --probe=x,y;… (Kartenkoordinaten wie in places.json) nennt die Dreiecke an
// diesen Punkten · --probe-old=x,y;… mit --old-layout=<übersicht.json> --old-origin=x,z: Punkte einer früheren Lage
let PROBES = opts.probe ? opts.probe.split(';').map(s => s.split(',').map(Number)) : null;
if (opts['probe-old']) {
  const old = JSON.parse(fs.readFileSync(path.resolve(opts['old-layout']), 'utf8')).layout, oo = (opts['old-origin'] || '0,0').split(',').map(Number);
  PROBES = PROBES || [];
  for (const q of opts['probe-old'].split(';').map(s => s.split(',').map(Number))) {
    const wx = q[0] + oo[0], wz = q[1] + oo[1];
    let best = null, bd = 1e9;
    for (const m of MATS) {
      if (!old[m]) continue;
      for (const [cx, cz] of walkCells(m)) { const d = Math.hypot(old[m][0] + cx * 10 + 5 - wx, old[m][1] + cz * 10 + 5 - wz); if (d < bd) { bd = d; best = m; } }
    }
    const np = [wx - old[best][0] + LAYOUT[best][0] - GX0, wz - old[best][1] + LAYOUT[best][1] - GZ0];
    console.log(`Punkt alt ${q.join(',')} → Matrix ${best} (${nameOf(best)}) → neu ${np.map(v => v.toFixed(1)).join(',')}`);
    PROBES.push(np);
  }
}
const only = opts['places-only'] ? [] : opts.only ? opts.only.split(',').map(s => s.split(':').map(Number)) : PROBES ? PROBES.map(([x, y]) => [Math.floor(y / (REG * BLOCK)), Math.floor(x / (REG * BLOCK))]) : null;
for (let rr = 0; rr < Math.ceil(ROWS / REG); rr++) for (let rc = 0; rc < Math.ceil(COLS / REG); rc++) {
  if (only && !only.some(([a, b]) => a === rr && b === rc)) continue;
  const tx0 = GX0 + rc * REG * BLOCK, tz0 = GZ0 + rr * REG * BLOCK, tsz = REG * BLOCK;
  const list = chunks.filter(c => c.x < tx0 + tsz + 2 && c.x + 40 > tx0 - 2 && c.z < tz0 + tsz + MARGIN_UP && c.z + 40 > tz0 - 4)
    .filter(c => { const near = nearOf[c.m], o = LAYOUT[c.m]; for (let a = 0; a < 4; a++) for (let b = 0; b < 4; b++) if (near.has((Math.floor((c.x - o[0]) / 10) + a) + ':' + (Math.floor((c.z - o[1]) / 10) + b))) return true; return false; });
  if (!list.length) continue;
  const view = { S: PX / TILE * SS, x0: tx0 * TILE, z0: tz0 * TILE, sea: null };
  const tg = R.makeTarget(tsz * PX * SS, tsz * PX * SS);
  const probe = PROBES ? PROBES.map(([x, y]) => ({ at: [x, y], x: (x - (tx0 - GX0)) * PX * SS, y: (y - (tz0 - GZ0)) * PX * SS, hits: [] })).filter(q => q.x >= 0 && q.y >= 0 && q.x < tsz * PX * SS && q.y < tsz * PX * SS) : null;
  for (const c of list) {
    const area = areaOf(c.m), tex = areaTextures(area), prioAt = prioFor(c.m), o = LAYOUT[c.m];
    const B = chunkModel(c.gr);
    for (const md of B.models) R.renderModel(tg, B, md, tex, view, { matrix: c.m, ox: c.x * TILE + 360, oy: c.y, oz: c.z * TILE + 360, prioAt, strict: true, overNothing: true, sceneSkip: SCENE_SKIP, skip: isLum(c.m) ? SKIP_LUM : null, cull: isLum(c.m), probe, darkCut: DARK_CUT[c.m] || 0 });   // strict: große Kulissen-Dreiecke (Meer, Fernsicht) nur ganz im Randbereich
    // Gebäude dieses Blocks (Lage in Einheiten der Matrix)
    for (const pl of placements(c.gr)) {
      const bm = bmModel(pl.id);
      if (!bm) continue;
      const a = pl.r * Math.PI / 180, ca = Math.cos(a), sa = Math.sin(a);
      const xf = (x, y, z) => { x *= pl.s[0]; y *= pl.s[1]; z *= pl.s[2]; return [x * ca + z * sa + pl.p[0], y + pl.p[1], -x * sa + z * ca + pl.p[2]]; };
      const t = { ...tex, ...bm.own };
      for (const md of bm.B.models) R.renderModel(tg, bm.B, md, t, view, { matrix: c.m, ox: o[0] * TILE, oy: c.y, oz: o[1] * TILE, xf, prioAt, overNothing: true, probe });
    }
  }
  if (probe) for (const q of probe) {
    console.log(`\nPunkt ${q.at.map(v => +v.toFixed(1)).join(',')}:`);
    const seen = new Map();
    for (const h of q.hits) { const k = [h.matrix, h.mat, h.prio, h.water, h.blend].join('|'); if (!seen.has(k)) seen.set(k, h); }
    for (const h of [...seen.values()].sort((a, b) => b.prio - a.prio || b.depth - a.depth)) console.log(`   M${h.matrix} ${h.mat} [${h.tex}] Rang ${h.prio}${h.water ? ' Wasser' : ''}${h.blend ? ' gemischt' : ''} Tiefe ${h.depth} Höhe ${h.y} Farbe ${h.col}`);
  }
  const img = R.toRGBA8(tg, SS), bp = BLOCK * PX;
  for (let br = 0; br < REG; br++) for (let bc = 0; bc < REG; bc++) {
    const r = rr * REG + br, cc = rc * REG + bc;
    if (r >= ROWS || cc >= COLS) continue;
    const out = new Uint8Array(bp * bp * 4);
    for (let y = 0; y < bp; y++) { const s0 = ((br * bp + y) * img.w + bc * bp) * 4; out.set(img.px.subarray(s0, s0 + bp * 4), y * bp * 4); }
    let any = false; for (let i = 3; i < out.length; i += 4) if (out[i]) { any = true; break; }
    if (!any) continue;
    fs.writeFileSync(path.join(OUT, `chunk_${r}_${cc}.png`), R.png(bp, bp, out));
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
if (only && !opts['places-only']) { console.log('\nTeil-Render fertig'); process.exit(0); }
if (!opts['places-only']) fs.writeFileSync(path.join(OUT, 'render.json'), JSON.stringify(info));
console.log('\nBlöcke geschrieben:', Object.keys(info.chunks).length, 'in', ((Date.now() - t0) / 1000).toFixed(0), 's');

// ── Orte für die Karte: Flächen (begehbare Zellen je Ort, zu Rechtecken), Namensposition, Eingänge zu Höhlen/Gebäuden ──
{
  const PLACES = path.resolve(opts.places || path.join(__dirname, '..', 'tiles-kalos-xy', 'places.json'));
  const cellsByLoc = {};
  for (const m of MATS) {
    const M = mats[m], own = zonesOf[m] || [], o = LAYOUT[m], local = new Map();   // Ort → Zellen dieser Matrix (cx:cz)
    for (const [cx, cz] of walkCells(m)) {
      let z = M.g[cz] && M.g[cz][cx];
      if (z == null || z === 0xffff) continue;
      if (!own.includes(z)) z = own[0];
      if (isLum(m)) z = own[0];
      const loc = zloc(z);
      (local.get(loc) || local.set(loc, new Set()).get(loc)).add(cx + ':' + cz);
    }
    // Löcher füllen: Zellen ohne Begehbares, ringsum von der Fläche eingeschlossen (Wäldchen, Teiche mitten auf der
    // Route) – sonst hat der Umriss innen kleine Kästen. Nur Zellen, die keinem anderen Ort dieser Matrix gehören.
    const taken = new Set([].concat(...[...local.values()].map(v => [...v])));
    for (const set of local.values()) {
      const pts = [...set].map(k => k.split(':').map(Number));
      const x0 = Math.min(...pts.map(q => q[0])) - 1, x1 = Math.max(...pts.map(q => q[0])) + 1;
      const z0 = Math.min(...pts.map(q => q[1])) - 1, z1 = Math.max(...pts.map(q => q[1])) + 1;
      const outside = new Set([x0 + ':' + z0]), todo = [[x0, z0]];
      while (todo.length) {
        const [x, z] = todo.pop();
        for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nx = x + dx, nz = z + dz, k = nx + ':' + nz;
          if (nx < x0 || nx > x1 || nz < z0 || nz > z1 || outside.has(k) || set.has(k)) continue;
          outside.add(k); todo.push([nx, nz]);
        }
      }
      for (let z = z0; z <= z1; z++) for (let x = x0; x <= x1; x++) {
        const k = x + ':' + z;
        if (!outside.has(k) && !set.has(k) && !taken.has(k) && M.g[z] && M.g[z][x] != null && M.g[z][x] !== 0xffff) set.add(k);
      }
    }
    for (const [loc, set] of local) for (const k of set) {
      const [cx, cz] = k.split(':').map(Number);
      (cellsByLoc[loc] = cellsByLoc[loc] || new Set()).add(Math.round(o[0] + cx * 10 - GX0) + ':' + Math.round(o[1] + cz * 10 - GZ0));
    }
  }
  // Zellen zu Rechtecken (Zeilenläufe, gleich lange Läufe untereinander zusammengefasst)
  const areas = {}, labels = {};
  for (const [loc, set] of Object.entries(cellsByLoc)) {
    const cells = [...set].map(k => k.split(':').map(Number)), rows = new Map();
    for (const [x, z] of cells) (rows.get(z) || rows.set(z, []).get(z)).push(x);
    const runs = [];
    for (const z of [...rows.keys()].sort((a, b) => a - b)) {
      const xs = [...new Set(rows.get(z))].sort((a, b) => a - b);
      for (let i = 0; i < xs.length; i++) {
        const x0 = xs[i]; let x1 = x0;
        while (i + 1 < xs.length && xs[i + 1] === x1 + 10) x1 = xs[++i];
        const prev = runs.find(r => r.x0 === x0 && r.x1 === x1 && r.z1 === z - 10);
        if (prev) prev.z1 = z; else runs.push({ x0, x1, z0: z, z1: z });
      }
    }
    areas[loc] = runs.map(r => [r.x0, r.z0, r.x1 + 10, r.z1 + 10, 0]);
    // Illumina City: der Kreis selbst in Streifen à 2 Kacheln statt der Treppe aus 10er-Zellen
    if (+loc === zloc(zonesOf[128][0])) {
      const cx = LAYOUT[128][0] + LUMIOSE_C[0] - GX0, cz = LAYOUT[128][1] + LUMIOSE_C[1] - GZ0, R = LUMIOSE_C[2] - 6;
      areas[loc] = [];
      for (let z = Math.floor(cz - R); z < cz + R; z += 2) {
        const dz = z + 1 - cz, hw = Math.sqrt(Math.max(0, R * R - dz * dz));
        if (hw >= 2) areas[loc].push([Math.round(cx - hw), z, Math.round(cx + hw), z + 2, 0]);
      }
    }
    // Name: Zelle nahe am Schwerpunkt
    const cx = cells.reduce((s, c) => s + c[0], 0) / cells.length, cz = cells.reduce((s, c) => s + c[1], 0) / cells.length;
    const best = cells.slice().sort((a, b) => Math.hypot(a[0] - cx, a[1] - cz) - Math.hypot(b[0] - cx, b[1] - cz))[0];
    labels[loc] = [best[0] + 5, best[1] + 5, 0];
  }
  // Eingänge: Warps aus Außenzonen der Karte in Zonen ohne eigene Fläche (Höhlen, Gebäude, Tore)
  const outdoor = new Set(Object.keys(areas).map(Number)), entrances = {};
  for (const m of MATS) {
    if (isLum(m)) continue;   // Illumina: Warps auf Schienen
    for (const z of zonesOf[m] || []) for (const w of WP[z]) {
      if (w[5]) continue;
      const dl = w[2] < NZ ? zloc(w[2]) : -1;
      if (dl < 0 || dl === zloc(z) || outdoor.has(dl)) continue;
      const x = +(LAYOUT[m][0] + w[6] / TILE - GX0).toFixed(1), zz = +(LAYOUT[m][1] + w[8] / TILE - GZ0).toFixed(1);
      const list = entrances[dl] = entrances[dl] || [];
      if (!list.some(e => Math.hypot(e[0] - x, e[1] - zz) < 4)) list.push([x, zz, 0]);
    }
  }
  fs.mkdirSync(path.dirname(PLACES), { recursive: true });
  // Verbindungen: Tore und Höhlen, deren Türen auf der Karte auseinanderliegen (Kalos ist keine durchgehende Welt) –
  // die Karte zeichnet sie als gestrichelte Linie. Je Innengebiet die Türen, zusammengefasst nach Ort.
  const linksOut = [];
  for (const p of passages) {
    const pts = p.doors.filter(d => GPOS[d.g]).map(d => { const adj = ADJUST[groups[d.g][0]] || [0, 0]; return { g: d.g, at: [+(GPOS[d.g][0] + adj[0] + d.at[0] - GX0).toFixed(1), +(GPOS[d.g][1] + adj[1] + d.at[1] - GZ0).toFixed(1)] }; });
    // je Tür die nächste Tür einer anderen Gruppe; jedes Paar einmal, nur wenn es wirklich auseinanderliegt
    for (const a of pts) {
      const b = pts.filter(q => q.g !== a.g).sort((u, v) => Math.hypot(u.at[0] - a.at[0], u.at[1] - a.at[1]) - Math.hypot(v.at[0] - a.at[0], v.at[1] - a.at[1]))[0];
      if (!b || Math.hypot(a.at[0] - b.at[0], a.at[1] - b.at[1]) < 24) continue;
      if (linksOut.some(l => l.loc === p.loc && [[a, b], [b, a]].some(([u, v]) => Math.hypot(l.pts[0][0] - u.at[0], l.pts[0][1] - u.at[1]) < 6 && Math.hypot(l.pts[1][0] - v.at[0], l.pts[1][1] - v.at[1]) < 6))) continue;
      linksOut.push({ loc: p.loc, pts: [a.at, b.at] });
    }
  }
  fs.writeFileSync(PLACES, JSON.stringify({ width: COLS * BLOCK, height: ROWS * BLOCK, shear: SHEAR, areas, labels, entrances, links: linksOut, items: {}, trainers: {} }));
  console.log('Verbindungen:', linksOut.map(l => de[l.loc] + ' ' + Math.round(Math.hypot(l.pts[0][0] - l.pts[1][0], l.pts[0][1] - l.pts[1][1]))).join(', '));
  console.log('Orte:', Object.keys(areas).length, 'mit Fläche,', Object.keys(entrances).length, 'mit Eingang →', PLACES);
}
