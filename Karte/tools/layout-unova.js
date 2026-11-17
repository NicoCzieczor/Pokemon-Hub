#!/usr/bin/env node
/*
 * Legt die Einall-Karte aus einer Schwarz/Weiß-ROM zusammen (Gen 5 hat keine durchgehende Welt).
 *
 * Matrix 0 enthält die normale Oberwelt – in Inseln, zwischen denen leere Blöcke liegen. Alles andere sind eigene
 * Matrizen, die das Spiel über Warps und Torhäuser erreicht: die fünf Brücken, Stratos City (Hauptstraße, Platz,
 * Straßen, Hafen), Ewigenwald innen, das Wüstenresort, Schwarze Stadt / Weißer Wald, die Riesengrotte, Ferrula usw.
 * Die Welt ist dabei nicht maßstabsgetreu: die Marea-Zugbrücke ist in ihrer eigenen Karte doppelt so lang wie die
 * Lücke zwischen Marea City und Route 5 in Matrix 0. Deshalb werden die Inseln von Matrix 0 als Ganzes verschoben,
 * so dass die Brücken genau zwischen ihre Torhäuser passen (Versatz aus den Warp-Koordinaten). Wo sich das im Kreis
 * nicht schließt (Route 11/12), bleibt eine Lücke mit Verbindungslinie.
 *
 * Ausgabe layout.json: je Gruppe (Insel bzw. Matrix) Lage, Drehung und Blöcke; je Zone die Rechtecke in Weltkacheln;
 * Verbindungslinien. compose-unova.py setzt daraus die Kartenblätter zusammen, build-unova.js die Orte.
 *
 * Aufruf: node layout-unova.js <weiss.nds> <ausgabe/layout.json>
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { parseRomFiles, narcMembers } = require('./render-unova.js');

const ROM_PATH = path.resolve(process.argv[2] || '');
const OUT = path.resolve(process.argv[3] || 'layout.json');
const CH = 32;
const GATE = 8;   // so weit liegen die beiden Türen eines Torhauses draußen auseinander (Matrix 0: 7–10 Kacheln)

// ── ROM lesen ───────────────────────────────────────────────────────────────
const rom = fs.readFileSync(ROM_PATH);
const gameCode = rom.toString('latin1', 0x0c, 0x10);
const B2W2 = /^IR[CD]/.test(gameCode);
const files = parseRomFiles(rom);
const narc = name => { const f = files.get(name); if (!f) throw new Error(`ROM-Datei ${name} fehlt`); return narcMembers(f); };
const matrices = narc('a/0/0/9');

// Gen-5-Texte: je Eintrag UTF-16, rückwärts mit rollendem Schlüssel verschlüsselt
function decodeText(buf) {
  const entries = buf.readUInt16LE(2), sec = buf.readUInt32LE(12), out = [];
  for (let i = 0; i < entries; i++) {
    const at = sec + 4 + i * 8, off = sec + buf.readUInt32LE(at), len = buf.readUInt16LE(at + 4);
    const enc = Array.from({ length: len }, (_, k) => buf.readUInt16LE(off + k * 2));
    let key = enc[len - 1] ^ 0xffff, s = '';
    const dec = new Array(len);
    for (let k = len - 1; k >= 0; k--) { dec[k] = enc[k] ^ key; key = ((key >> 3) | (key << 13)) & 0xffff; }
    for (let k = 0; k < len; k++) { const c = dec[k]; if (c === 0xffff) break; if (c >= 0xf000) { k += 1 + (dec[k + 2] || 0); continue; } s += String.fromCharCode(c); }
    out.push(s);
  }
  return out;
}
const placeNames = decodeText(narc('a/0/0/2')[B2W2 ? 109 : 89]);
// Zonen (48 Bytes): Matrix @4, Ereignisse @22, Ortsname @26 (untere 8 Bit)
const zoneData = narc('a/0/1/2')[0];
const zones = Array.from({ length: zoneData.length / 48 }, (_, z) => ({
  z, matrix: zoneData.readUInt16LE(z * 48 + 4), events: zoneData.readUInt16LE(z * 48 + 22), name: placeNames[zoneData[z * 48 + 26]] || '',
}));
// Warps je Zone (20 Bytes nach Einrichtung und Personen): Ziel, Zielwarp, …, Art (0 Raster, 1 Schiene), x, y, z
const eventFiles = narc(B2W2 ? 'a/1/2/6' : 'a/1/2/5');
const warps = zones.map(zn => {
  const b = eventFiles[zn.events];
  if (!b || b.length < 8) return [];
  const at = 8 + b[4] * 20 + b[5] * 36;
  return Array.from({ length: b[6] }, (_, i) => {
    const o = at + i * 20;
    if (o + 20 > b.length) return null;
    const rail = b.readUInt16LE(o + 6) !== 0;
    return { to: b.readUInt16LE(o), toWarp: b.readUInt16LE(o + 2), rail, x: rail ? null : b.readUInt16LE(o + 8) / 16, z: rail ? null : b.readUInt16LE(o + 12) / 16 };
  }).filter(Boolean);
});
function matrix(id) {
  const raw = matrices[id], w = raw.readUInt16LE(4), h = raw.readUInt16LE(6), headers = raw.readUInt16LE(0) === 1;
  const cell = (r, c) => raw.readUInt32LE(8 + (r * w + c) * 4);
  const zone = (r, c) => (headers ? raw.readUInt32LE(8 + w * h * 4 + (r * w + c) * 4) : 0xffffffff);
  return { id, w, h, cell, zone };
}
// Tür einer Zone in eine andere (direkt oder über ein Torhaus): erste passende Rasterposition
function door(from, to) {
  for (const w of warps[from]) {
    if (w.to === to && !w.rail) return [w.x, w.z];
    const gate = warps[w.to] || [];
    if (!w.rail && gate.some(g => g.to === to)) return [w.x, w.z];
  }
  return null;
}

// ── Matrix 0: Inseln (zusammenhängende belegte Blöcke) ───────────────────────
const m0 = matrix(0), EMPTY = 0xffffffff;
const islandOf = new Int32Array(m0.w * m0.h).fill(-1), islands = [];
for (let r = 0; r < m0.h; r++) for (let c = 0; c < m0.w; c++) {
  if (m0.cell(r, c) === EMPTY || islandOf[r * m0.w + c] >= 0) continue;
  const id = islands.length, cells = [], stack = [[r, c]];
  islandOf[r * m0.w + c] = id;
  while (stack.length) {
    const [y, x] = stack.pop();
    cells.push([y, x]);
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const yy = y + dy, xx = x + dx;
      if (yy < 0 || xx < 0 || yy >= m0.h || xx >= m0.w || m0.cell(yy, xx) === EMPTY || islandOf[yy * m0.w + xx] >= 0) continue;
      islandOf[yy * m0.w + xx] = id; stack.push([yy, xx]);
    }
  }
  islands.push({ id, cells, names: new Set(cells.map(([y, x]) => zones[m0.zone(y, x)]?.name).filter(Boolean)) });
}
const islandBy = name => { const i = islands.find(is => is.names.has(name)); if (!i) throw new Error(`Insel mit ${name} fehlt`); return i; };
const zoneBy = (name, m = 0) => { const z = zones.find(x => x.name === name && x.matrix === m); if (!z) throw new Error(`Zone ${name} (Matrix ${m}) fehlt`); return z.z; };

// ── Layout ──────────────────────────────────────────────────────────────────
// Inseln: Versatz in Kacheln gegenüber Matrix 0. Westen (Panaero, Marea) bleibt, alles andere rückt so weit, dass die
// Brücken passen: Marea-Zugbrücke (direkte Warps an beiden Enden) → Mitte; Wunderbrücke → Osten; Zylinderbrücke → Norden.
const shift = new Map();          // Insel-ID → [dx, dz]
const groups = [];                // { key, matrix, x, z, rot, cells:[[r,c,wr,wc]] , zoneRects }
const links = [];                 // Verbindungslinien [[x0,z0],[x1,z1]]
const P = (isl, p) => { const s = shift.get(isl.id) || [0, 0]; return [p[0] + s[0], p[1] + s[1]]; };
const W = islandBy('Marea City'), C = islandBy('Rayono City'), N = islandBy('Twindrake City'), E = islandBy('Ondula'), SE = islandBy('Avenitia');
shift.set(W.id, [0, 0]);

// Brücke zwischen zwei Türen: liefert Lage der Brückenmatrix und den nötigen Versatz der zweiten Insel
const bridgeZone = name => zones.find(z => z.name === name && z.matrix !== 0 && matrices[z.matrix].readUInt16LE(4) * matrices[z.matrix].readUInt16LE(6) > 1);
function localDoor(zone, toward) {
  for (const w of warps[zone]) {
    if (w.rail) continue;
    if (w.to === toward || (warps[w.to] || []).some(g => g.to === toward)) return [w.x, w.z];
  }
  return null;
}
function gateGap(from, to) { // Torhaus dazwischen? dann GATE Kacheln Abstand in Laufrichtung
  return warps[from].some(w => w.to === to) ? 0 : GATE;
}

// Marea-Zugbrücke (direkt): Marea City → Brücke → Route 5
const drawbridge = bridgeZone('Marea-Zugbrücke');
{
  const a = P(W, door(zoneBy('Marea City'), drawbridge.z)), la = localDoor(drawbridge.z, zoneBy('Marea City')), lb = localDoor(drawbridge.z, zoneBy('Route 5'));
  const pos = [a[0] - la[0], a[1] - la[1]], b = door(zoneBy('Route 5'), drawbridge.z);
  shift.set(C.id, [pos[0] + lb[0] - b[0], pos[1] + lb[1] - b[1]]);
  groups.push({ key: 'drawbridge', matrix: drawbridge.matrix, x: pos[0], z: pos[1], rot: 0, zone: drawbridge.z });
}
// Wunderbrücke (Torhäuser): Route 16 → Brücke → Route 15
const marvelous = bridgeZone('Wunderbrücke');
{
  const a = P(C, door(zoneBy('Route 16'), marvelous.z)), la = localDoor(marvelous.z, zoneBy('Route 16')), lb = localDoor(marvelous.z, zoneBy('Route 15'));
  const pos = [a[0] + GATE - la[0], a[1] - la[1]], b = door(zoneBy('Route 15'), marvelous.z);
  shift.set(E.id, [pos[0] + lb[0] + GATE - b[0], pos[1] + lb[1] - b[1]]);
  groups.push({ key: 'marvelous', matrix: marvelous.matrix, x: pos[0], z: pos[1], rot: 0, zone: marvelous.z });
}
// Zylinderbrücke (Torhäuser, in ihrer Karte senkrecht – hier um 90° gedreht): Route 8 → Brücke → Route 9
const tubeline = bridgeZone('Zylinderbrücke');
{
  const t = matrix(tubeline.matrix), H = t.h * CH;
  const a = P(W, door(zoneBy('Route 8'), tubeline.z)), la = localDoor(tubeline.z, zoneBy('Route 8')), lb = localDoor(tubeline.z, zoneBy('Route 9'));
  // gedreht im Uhrzeigersinn: Welt-x = X + (H − z), Welt-z = Z + x
  const rx = l => H - l[1], rz = l => l[0];
  const pos = [a[0] + GATE - rx(la), a[1] - rz(la)], b = door(zoneBy('Route 9'), tubeline.z);
  shift.set(N.id, [pos[0] + rx(lb) + GATE - b[0], pos[1] + rz(lb) - b[1]]);
  groups.push({ key: 'tubeline', matrix: tubeline.matrix, x: pos[0], z: pos[1], rot: 90, zone: tubeline.z });
}
// Dorfbrücke (Torhäuser): an Route 11 – Route 12 liegt durch den Wunderbrücken-Versatz weiter östlich (Lücke + Linie)
const village = bridgeZone('Dorfbrücke');
{
  const a = P(N, door(zoneBy('Route 11'), village.z)), la = localDoor(village.z, zoneBy('Route 11')), lb = localDoor(village.z, zoneBy('Route 12'));
  const pos = [a[0] + GATE - la[0], a[1] - la[1]], b = P(E, door(zoneBy('Route 12'), village.z));
  groups.push({ key: 'village', matrix: village.matrix, x: pos[0], z: pos[1], rot: 0, zone: village.z });
  const end = [pos[0] + lb[0], pos[1] + lb[1]];
  if (Math.hypot(b[0] - end[0], b[1] - end[1]) > GATE + 2) links.push([end, b]);
}
// Teilgebiete mit direktem Warp an derselben Stelle (Grenze zwischen den Karten): Moor, Schrein, Hain, Traumbrache, Rayono-Park
function attachDirect(key, zoneName, islandZone, isl, opts = {}) {
  const z = zones.find(x => x.name === zoneName && x.matrix !== 0 && x.matrix !== 175 && (!opts.matrix || x.matrix === opts.matrix));
  const a = P(isl, door(zoneBy(islandZone), z.z)), l = localDoor(z.z, zoneBy(islandZone));
  const off = opts.off || [0, 0];
  const g = { key, matrix: z.matrix, x: a[0] - l[0] + off[0], z: a[1] - l[1] + off[1], rot: 0, zone: z.z };
  groups.push(g);
  if (opts.off) links.push([a, [g.x + l[0], g.z + l[1]]]);
  return g;
}
attachDirect('moor', 'Moor von Nevaio', 'Route 8', W);
attachDirect('shrine', 'Schrein der Ernte', 'Route 14', E);
attachDirect('lostlorn', 'Hain der Täuschung', 'Route 16', C);
attachDirect('nimbasaPark', 'Rayono City', 'Rayono City', C, { matrix: 107 });

// Schwarze Stadt / Weißer Wald: genau in die Lücke zwischen Route 14 (Norden) und Route 15 (Westen), Tor nach Süden.
// Die Tore führen in die Schwarze Stadt; Weiß tauscht die Matrix (compose-unova.py --swap) – gleiche Größe, gleiche Tore
{
  const z = zones.find(x => warps[x.z].some(w => (warps[w.to] || []).some(g => g.to === zoneBy('Route 14'))) && x.matrix !== 0 && x.name !== 'Route 14' && matrices[x.matrix].readUInt16LE(4) === 2);
  const a = P(E, door(zoneBy('Route 14'), z.z)), l = localDoor(z.z, zoneBy('Route 14'));
  groups.push({ key: 'blackWhite', matrix: z.matrix, x: a[0] - l[0], z: a[1] + GATE - l[1], rot: 0, zone: z.z });
}
// Wüstenresort innen: westlich des Eingangs, unterhalb der Zugbrücke (das Torhaus führt im Spiel nach Norden, dort liegt
// aber Route 5)
{
  const z = zones.find(x => x.name === 'Wüstenresort' && x.matrix !== 0 && x.matrix !== 175);
  const a = P(C, door(zoneBy('Wüstenresort'), z.z)), l = localDoor(z.z, zoneBy('Wüstenresort'));
  const t = matrix(z.matrix), g = { key: 'desert', matrix: z.matrix, x: a[0] - GATE - t.w * CH, z: a[1] - 4, rot: 0, zone: z.z };
  groups.push(g);
  links.push([a, [g.x + l[0], g.z + l[1]]]);
}
// Stratos City: im Spiel ein Hufeisen – der runde Platz in der Mitte, von dort die Straßen strahlenförmig zur
// Uferstraße mit ihren Piers (Hafenkarte, Schienenkarten mit eigener Kamera), nach Norden die Hauptstraße zum Tor an
// Route 4. Maßstabsgetreu ist das nicht: die Straßen sind eigene Karten, jede so lang wie das ganze Ufer.
// Die Stadt wird deshalb als Scheibe um den Platz (Radius r) aufgebaut: innen ein Straßenraster in der Schrägsicht der
// übrigen Karte (casteliaScene), außen die Uferstraße mit den Piers der Hafenkarte (compose-unova.py). Hier Lage,
// Fläche und die Szene.
const CASTELIA = { r: 90, plazaZ: 80, bridgeAngle: 100, bridgeDir: 35, bridgeLen: 112 };
const castelia = {};
{
  const main = zones.find(x => x.name === 'Stratos City' && warps[x.z].some(w => (warps[w.to] || []).some(g => g.to === zoneBy('Route 4'))));
  const a = P(C, door(zoneBy('Route 4'), main.z)), l = localDoor(main.z, zoneBy('Route 4'));
  const mx = a[0] - l[0], mz = a[1] + GATE - l[1];
  groups.push({ key: 'casteliaMain', matrix: main.matrix, x: mx, z: mz, rot: 0, zone: main.z, fan: true });
  // der Platz: die Zone, von der Schienen-Warps in mindestens drei Straßen führen
  const plaza = zones.find(x => x.name === 'Stratos City' && warps[x.z].some(w => w.to === main.z) &&
    warps[x.z].filter(w => w.rail && zones[w.to]?.name === 'Stratos City').length >= 3);
  groups.push({ key: 'casteliaPlaza', matrix: plaza.matrix, x: mx, z: mz, rot: 0, zone: plaza.z, fan: true });
  // Straßen: Reihenfolge nach der Schiene am Platz (5, 7 | 1, 3) – von West nach Ost
  const streets = warps[plaza.z].filter(w => w.rail && zones[w.to]?.name === 'Stratos City').map(w => ({ z: w.to, rail: eventRail(plaza.z, w) }));
  const order = [5, 7, 1, 3];
  streets.sort((s, t) => order.indexOf(s.rail) - order.indexOf(t.rail));
  streets.forEach((s, i) => groups.push({ key: 'casteliaStreet' + i, matrix: zones[s.z].matrix, x: mx, z: mz, rot: 0, zone: s.z, fan: true }));
  // Hafenkarte (2 × 2 Blöcke, alle Straßen und Piers hängen als Schienen-Warps daran)
  const harbor = zones.find(x => x.name === 'Stratos City' && x.matrix !== main.matrix && matrices[x.matrix].readUInt16LE(4) === 2 &&
    matrices[x.matrix].readUInt16LE(6) === 2 && warps[x.z].filter(w => w.rail).length >= 6);
  // Route 4 reicht mit ihrem Block ein Stück unter das Tor – erst darunter beginnt die Stadt (cut)
  const cut = (Math.floor(door(zoneBy('Route 4'), main.z)[1] / CH) + 1) * CH + shift.get(C.id)[1];
  Object.assign(castelia, { hub: [mx + CH / 2, mz + CASTELIA.plazaZ], top: mz, cut, zone: main.z, harbor: harbor ? harbor.matrix : null });
}
function eventRail(zone, w) { // Schienennummer eines Schienen-Warps (erster Wert hinter der Art)
  const b = eventFiles[zones[zone].events], at = 8 + b[4] * 20 + b[5] * 36, i = warps[zone].indexOf(w);
  return b.readUInt16LE(at + i * 20 + 8);
}
// Himmelspfeilbrücke: ihre Karte ist eine Kulisse für die Kamerafahrt (Waldhänge, Skyline) – brauchbar ist nur das
// Brückendeck. compose-unova.py legt es schräg von der Uferstraße (Nordosten der Stadt) über die Bucht zum Ewigenwald
const skyarrow = bridgeZone('Himmelspfeilbrücke');
{
  const c = CASTELIA, a = c.bridgeAngle * Math.PI / 180, d = c.bridgeDir * Math.PI / 180;
  const from = [castelia.hub[0] + (c.r - 4) * Math.sin(a), castelia.hub[1] + (c.r - 4) * Math.cos(a)];
  castelia.bridge = { from, to: [from[0] + c.bridgeLen * Math.cos(d), from[1] + c.bridgeLen * Math.sin(d)], matrix: skyarrow.matrix, zone: skyarrow.z };
}
// Führt eine Zone (über höchstens `depth` Türen) zu einer anderen?
function leadsTo(from, target, depth, seen = new Set()) {
  if (from === target) return true;
  if (depth <= 0 || seen.has(from) || !warps[from]) return false;
  seen.add(from);
  return warps[from].some(w => leadsTo(w.to, target, depth - 1, seen));
}
// Ewigenwald innen: sein Tor zur Brücke liegt am Brückenende; dahinter die Südost-Insel (Septerna City … Avenitia)
{
  const inner = zones.find(x => x.name === 'Ewigenwald' && x.matrix !== 0 && x.matrix !== 175 && matrices[x.matrix].readUInt16LE(4) > 1);
  const t = matrix(inner.matrix);
  const gate = warps[inner.z].find(w => !w.rail && w.to !== zoneBy('Ewigenwald') && leadsTo(w.to, skyarrow.z, 3, new Set([inner.z])));
  const bd = gate ? [gate.x, gate.z] : [t.w * CH / 2, 0];
  const ix = Math.round(castelia.bridge.to[0] - bd[0]), iz = Math.round(castelia.bridge.to[1] + 3 - bd[1]);
  groups.push({ key: 'pinwheelInner', matrix: inner.matrix, x: ix, z: iz, rot: 0, zone: inner.z });
  const outerDoor = door(zoneBy('Ewigenwald'), inner.z), l = localDoor(inner.z, zoneBy('Ewigenwald'));
  // Ewigenwald außen (Matrix 0, Spalte der Tür) direkt rechts an den inneren Wald, Tür auf gleicher Höhe
  const outerCol = Math.floor(outerDoor[0] / CH) * CH;
  shift.set(SE.id, [ix + t.w * CH - outerCol, iz + l[1] - outerDoor[1]]);
  links.push([[ix + l[0], iz + l[1]], P(SE, outerDoor)]);
}
attachDirect('dreamyard', 'Traumbrache', 'Orion City', SE);
// Riesengrotte innen (Wald im Krater, durch die Höhle erreichbar): nördlich des Höhleneingangs
{
  const inner = zones.find(x => x.name === 'Riesengrotte' && x.matrix !== 0 && x.matrix !== 175 && matrices[x.matrix].readUInt16LE(4) === 3);
  const cave = warps[zoneBy('Riesengrotte')][0].to, a = P(E, door(zoneBy('Riesengrotte'), cave)), t = matrix(inner.matrix);
  const g = { key: 'chasm', matrix: inner.matrix, x: a[0] - t.w * CH / 2, z: a[1] - GATE - t.h * CH - 20, rot: 0, zone: inner.z };
  groups.push(g);
  links.push([a, [g.x + t.w * CH / 2, g.z + t.h * CH]]);
}
// Ferrula: nur mit dem Zug von Rayono City aus – zwischen Route 4 und dem Ewigenwald
{
  const z = zones.find(x => x.name === 'Ferrula' && matrices[x.matrix].readUInt16LE(4) === 2);
  groups.push({ key: 'anville', matrix: z.matrix, x: castelia.hub[0] + 104, z: castelia.top - 3 * CH, rot: 0, zone: z.z });
}
// Freiheitsgarten und Turm der Einheit (Inseln im Meer südlich von Stratos City): westlich des Hafens
{
  const lib = islandBy('Freiheitsgarten'), unity = islandBy('Turm der Einheit');
  const s = shift.get(C.id);
  shift.set(unity.id, [s[0] - 110, s[1] + 16]);
  shift.set(lib.id, [s[0] - 150, s[1] + 16]);
}

// ── Welt normalisieren: alles beginnt bei MARGIN Kacheln ─────────────────────
const MARGIN = 32;
const gsize = g => { const t = matrix(g.matrix); return g.rot === 90 ? [t.h * CH, t.w * CH] : [t.w * CH, t.h * CH]; };
{
  let minX = Infinity, minZ = Infinity;
  for (const isl of islands) { const s = shift.get(isl.id) || [0, 0]; for (const [r, c] of isl.cells) { minX = Math.min(minX, c * CH + s[0]); minZ = Math.min(minZ, r * CH + s[1]); } }
  for (const g of groups) { minX = Math.min(minX, g.x); minZ = Math.min(minZ, g.z); }
  const dx = Math.round(MARGIN - minX), dz = Math.round(MARGIN - minZ);
  for (const isl of islands) { const s = shift.get(isl.id) || [0, 0]; shift.set(isl.id, [s[0] + dx, s[1] + dz]); }
  for (const g of groups) { g.x += dx; g.z += dz; }
  if (castelia.hub) { castelia.top += dz; castelia.cut += dz; for (const p of [castelia.hub, castelia.bridge.from, castelia.bridge.to]) { p[0] += dx; p[1] += dz; } }
  for (const l of links) for (const p of l) { p[0] += dx; p[1] += dz; }
}
// Lokale Kachel einer Zusatzkarte → Welt
const toWorld = (g, lx, lz) => (g.rot === 90 ? [g.x + matrix(g.matrix).h * CH - lz, g.z + lx] : [g.x + lx, g.z + lz]);

// ── Zonen: Rechtecke in der Welt; Türen nach draußen (für Höhleneingänge) ────
const zoneRects = {}, doors = [];
const addRect = (z, r) => { const n = zones[z].name; (zoneRects[n] = zoneRects[n] || []).push(r); };
const addDoors = (zone, at) => {
  for (const w of warps[zone]) {
    if (w.rail || !zones[w.to]) continue;
    const next = [...new Set((warps[w.to] || []).map(g => zones[g.to]?.name).filter(Boolean))];
    doors.push({ at: at(w.x, w.z).map(v => Math.round(v * 2) / 2), from: zones[zone].name, to: zones[w.to].name, next });
  }
};
for (const isl of islands) {
  const s = shift.get(isl.id) || [0, 0], seen = new Set();
  for (const [r, c] of isl.cells) {
    const z = m0.zone(r, c);
    if (z === EMPTY) continue;
    addRect(z, [c * CH + s[0], r * CH + s[1], (c + 1) * CH + s[0], (r + 1) * CH + s[1]]);
    if (!seen.has(z)) { seen.add(z); addDoors(z, (x, zz) => [x + s[0], zz + s[1]]); }
  }
}
// Fläche einer Zusatzkarte: ihre Blöcke (32 × 32), ohne die, die zur Hälfte auf einem Ort der Hauptkarte liegen
// (die Zugbrücke bringt z. B. ihr eigenes Stück Marea City mit – dort soll Marea City ausgewählt werden)
const islandRects = Object.values(zoneRects).flat();
const overlap = (a, b) => Math.max(0, Math.min(a[2], b[2]) - Math.max(a[0], b[0])) * Math.max(0, Math.min(a[3], b[3]) - Math.max(a[1], b[1]));
for (const g of groups) {
  const [w, h] = gsize(g), t = matrix(g.matrix);
  g.w = w; g.h = h;
  if (g.fan) continue;   // Stratos City: eine Fläche für die ganze Stadt (unten)
  for (let r = 0; r < t.h; r++) for (let c = 0; c < t.w; c++) {
    if (t.cell(r, c) === EMPTY) continue;
    const a = toWorld(g, c * CH, r * CH), b = toWorld(g, (c + 1) * CH, (r + 1) * CH);
    const rect = [Math.min(a[0], b[0]), Math.min(a[1], b[1]), Math.max(a[0], b[0]), Math.max(a[1], b[1])];
    if (islandRects.some(q => overlap(rect, q) > CH * CH / 2)) continue;
    addRect(g.zone, rect);
  }
  addDoors(g.zone, (x, z) => toWorld(g, x, z));
}
if (castelia.hub) {
  // Stratos City: die Scheibe in Streifen (ergibt beim Auswählen einen runden Umriss), oben am Tor abgeschnitten
  const hx = Math.round(castelia.hub[0]), hz = castelia.hub[1], R = CASTELIA.r, STRIP = 4;
  for (let z = castelia.cut; z < hz + R; z += STRIP) {
    const mid = Math.min(z + STRIP / 2, hz + R) - hz, w = Math.round(Math.sqrt(Math.max(0, R * R - mid * mid)));
    if (w >= 6) addRect(castelia.zone, [hx - w, z, hx + w, Math.min(z + STRIP, Math.round(hz + R))]);
  }
  // Himmelspfeilbrücke: Kästchen entlang des Decks
  const { from, to } = castelia.bridge, n = Math.ceil(Math.hypot(to[0] - from[0], to[1] - from[1]) / 4);
  for (let i = 0; i <= n; i++) {
    const x = from[0] + (to[0] - from[0]) * i / n, z = from[1] + (to[1] - from[1]) * i / n;
    addRect(skyarrow.z, [Math.round(x - 7), Math.round(z - 7), Math.round(x + 7), Math.round(z + 7)]);
  }
}
let width = 0, height = 0;
for (const rs of Object.values(zoneRects)) for (const r of rs) { width = Math.max(width, r[2]); height = Math.max(height, r[3]); }
for (const isl of islands) { const s = shift.get(isl.id) || [0, 0]; for (const [r, c] of isl.cells) { width = Math.max(width, (c + 1) * CH + s[0]); height = Math.max(height, (r + 1) * CH + s[1]); } }
width = Math.ceil((width + MARGIN) / CH) * CH; height = Math.ceil((height + MARGIN) / CH) * CH;

// Szene Stratos City (render-unova.js --scene). Die Häuser der Stadt sind Fassaden für die Straßenkamera: sauber
// sehen sie nur aus, wenn ihre Straße quer liegt und die Fassade zur Kamera zeigt – schräg gedreht stehen
// Scheibenkanten und schwarze Rückwände im Bild. Deshalb ein Raster wie in Manhattan: der Platz in der Mitte, die
// Hauptstraße nach Norden zum Tor, die vier Straßen als Avenues nach Westen und Osten (je zwei übereinander), nach
// Süden eine Allee zum mittleren Pier (compose-unova.py). Davor und dahinter Häuserzeilen – die Gebäudereihen
// derselben Straßenkarten, quer gestellt. Angaben in Kacheln der Szene (x nach Osten, z nach Süden)
function casteliaScene() {
  const HX = 104, HZ = 126, EDGE = 15, BAND = 2 * 16, RFILL = CASTELIA.r - 11.5, RSTREET = CASTELIA.r - 10.5;
  const keep = (n, off) => [n[0], n[1], n[0] * HX + n[1] * HZ + off];         // behalten: n·(p − Mitte) ≤ off
  const ring = (n, r) => Array.from({ length: n }, (_, i) => keep([Math.sin(2 * Math.PI * i / n), Math.cos(2 * Math.PI * i / n)], r));
  const fan = groups.filter(g => g.fan), mat = key => fan.find(g => g.key === key).matrix;
  const [s0, s1, s2, s3] = [0, 1, 2, 3].map(i => mat('casteliaStreet' + i)), mainM = mat('casteliaMain');
  const cutZ = HZ - (castelia.hub[1] - castelia.cut), north = [0, -1, -cutZ];
  const parts = [];
  // Eine Straßenkarte quer: west = ihr Platz-Ende zeigt nach Osten (Drehung −90°), sonst nach Westen (+90°).
  // Ausschnitt za…zb der Straße, Tiefe d ab ihrer Nordseite; (x, top) = linke obere Ecke in der Szene
  const across = (m, west, x, top, za, zb, d, clip, whole) => parts.push({
    matrix: m, rotate: west ? -90 : 90, pivot: west ? [0, zb] : [BAND, za], at: [x, top],
    clip: whole ? clip : [[-1, 0, -x], [1, 0, x + zb - za], [0, -1, -top], [0, 1, top + d], ...clip] });
  parts.push({ matrix: mat('casteliaPlaza'), rotate: 0, pivot: [16, 16], at: [HX, HZ], clip: ring(24, 15.6) });
  parts.push({ matrix: mainM, rotate: 0, pivot: [16, 2 * CH], at: [HX, HZ - 15.5], clip: [north] });
  const city = ring(32, RSTREET);
  across(s0, true, HX - EDGE - 64, HZ - BAND, 0, 64, BAND, city, true);
  across(s1, true, HX - EDGE - 64, HZ, 0, 64, BAND, city, true);
  across(s3, false, HX + EDGE, HZ - BAND, 0, 64, BAND, city, true);
  across(s2, false, HX + EDGE, HZ, 0, 64, BAND, city, true);
  // Häuserzeilen: eine Straßenseite (Matrix, Seite, Tiefe der Zeile, bebauter Abschnitt der Straße)
  const rows = [
    { m: s0, west: true, d: 11, za: 7, zb: 61 }, { m: s1, west: false, d: 8, za: 5, zb: 61 }, { m: s3, west: false, d: 12.5, za: 12, zb: 64 },
    { m: mainM, west: true, d: 11, za: 16, zb: 64 }, { m: s1, west: true, d: 8, za: 5, zb: 59 }, { m: s0, west: false, d: 11, za: 11, zb: 61 },
    { m: s2, west: true, d: 8, za: 5, zb: 63 }, { m: s3, west: true, d: 12.5, za: 20, zb: 64 }, { m: mainM, west: false, d: 11, za: 16, zb: 64 },
  ];
  const fill = [...ring(32, RFILL), north];
  let next = 0;
  // Viertel: nördlich der Avenues beiderseits der Hauptstraße, südlich beiderseits der Allee; Zeilen von der Mitte
  // nach außen, alle 12 Kacheln eine
  const quarter = (inner, dir, fronts) => {
    for (const front of fronts) {
      for (let x = inner; Math.abs(x - HX) < RFILL;) {
        const src = rows[next++ % rows.length], len = src.zb - src.za, left = dir < 0 ? x - len : x;
        across(src.m, src.west, left, front - src.d, src.za, src.zb, src.d, fill);
        x += dir * len;
      }
    }
  };
  const northFronts = [], southFronts = [];
  for (let z = HZ - BAND; z - 6 > cutZ; z -= 12) northFronts.push(z);
  for (let z = HZ + BAND + 12; z < HZ + RFILL; z += 12) southFronts.push(z);
  quarter(HX - 17, -1, northFronts); quarter(HX + 17, 1, northFronts);
  quarter(HX - 7, -1, southFronts); quarter(HX + 7, 1, southFronts);
  return { width: 208, height: 224, hub: [HX, HZ], edge: EDGE, band: BAND, parts };
}
// Zu rendernde Matrizen (render-unova.js --layout): jede Zusatzkarte außer Stratos Citys Straßen (die stehen in der
// Szene). Hafenkarte und Brücke senkrecht von oben und mit Rand (ihre Modelle ragen weit über die Blöcke hinaus), ohne
// Kulissen (Lichtstreifen, Waldhänge, Skyline). Beide Editionen von Schwarze Stadt / Weißer Wald
const render = [];
for (const g of groups) if (!g.fan && !render.some(r => r.matrix === g.matrix)) render.push({ matrix: g.matrix });
if (castelia.harbor != null) render.push({ matrix: castelia.harbor, topDown: true, pad: 2, skip: 'w_gra|gra_w' });
render.push({ matrix: skyarrow.matrix, topDown: true, pad: 2, skip: 'mori|grass|ki0|gake|kumo|^c3|sea_|h1_c3|omori|hikari|kage' });
const casteliaBox = castelia.hub ? { hub: castelia.hub, top: castelia.top, cut: castelia.cut, r: CASTELIA.r, harbor: castelia.harbor, bridge: castelia.bridge, scene: casteliaScene() } : null;
const bw = groups.find(g => g.key === 'blackWhite'), white = zones.find(x => x.name === 'Weißer Wald' && x.matrix !== 0 && x.matrix !== 175 && matrices[x.matrix].readUInt16LE(4) === 2);
if (bw && white) { render.push({ matrix: white.matrix }); bw.white = white.matrix; }
const out = { version: 1, game: B2W2 ? 'b2w2' : 'bw', gameCode, chunk: CH, width, height, islands: [], groups, links, zones: zoneRects, doors, render, castelia: casteliaBox };
for (const isl of islands) {
  const s = shift.get(isl.id) || [0, 0];
  out.islands.push({ id: isl.id, shift: s, names: [...isl.names], cells: isl.cells.map(([r, c]) => [r, c, m0.zone(r, c) === EMPTY ? -1 : m0.zone(r, c)]) });
}
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(out, null, 1));
console.log(`${gameCode}: ${islands.length} Inseln, ${groups.length} Zusatzkarten, ${links.length} Linien`);
for (const isl of out.islands) console.log(`  Insel ${isl.id} (${isl.names.slice(0, 4).join(', ')}): Versatz ${isl.shift.map(v => v.toFixed(1)).join('/')}`);
for (const g of groups) console.log(`  ${g.key}: Matrix ${g.matrix} bei ${g.x.toFixed(1)}/${g.z.toFixed(1)}${g.rot ? ' gedreht ' + g.rot : ''}`);
for (const l of links) console.log(`  Linie ${l[0].map(v => v.toFixed(0))} → ${l[1].map(v => v.toFixed(0))}`);
