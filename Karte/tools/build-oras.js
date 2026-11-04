/*
 * Baut die Daten der Hoenn-Karte (Omega Rubin / Alpha Saphir): Karte/oras.json und Karte/encounter-areas-oras.js.
 *
 * Quellen:
 *  - die eigene ROM (Omega Rubin), gelesen mit Bosse/oras-rom.js: Ortsnamen (de/en), wilde Pokémon je Zone
 *    (LZ11-gepackte Zonendateien in a/0/1/3) und welche Zone zu welchem Ort gehört (Zonentabelle, Datei 536, u16@0x1C)
 *  - pret/pokeemerald (src/data/region_map/): das Raster der Hoenn-Regionskarte (28 × 15 Felder) und die Lage der
 *    Höhlen & Orte darauf – Omega Rubin / Alpha Saphir haben dieselbe Region
 *  - PKHeX (Resources/legality/wild/Gen6/encounter_or/_as.pkl): wo sich die wilden Pokémon von Alpha Saphir unterscheiden.
 *    Die Tabellen von Alpha Saphir sind die aus der ROM, nur mit den Editions-Pokémon von dort getauscht.
 *
 * Begegnungsraten je Platz (wie im Spiel, vgl. pk3DS RSWE): Gras/Langes Gras 10 % × 9, 5, 4, 1 %; Surfen und Zertrümmerer
 * 50, 30, 15, 4, 1 %; Angeln 60, 35, 5 %; Horden: Gruppe A 60 %, B 35 %, C 5 %; DexNav-Pokémon ohne Rate.
 *
 * Aufruf (Node 18+):  node build-oras.js <rom.3ds|.cxi> [cache-ordner]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const OrasRom = require('../../Bosse/oras-rom.js');

const ROM = process.argv[2];
const CACHE = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'oras-karte-cache'));
const OUT = path.join(__dirname, '..');
const PE = 'https://raw.githubusercontent.com/pret/pokeemerald/master/src/data/region_map/';
const PKHEX = 'https://raw.githubusercontent.com/kwsch/PKHeX/master/PKHeX.Core/Resources/legality/wild/Gen6/';
if (!ROM) { console.error('Aufruf: node build-oras.js <rom.3ds> [cache]'); process.exit(1); }
fs.mkdirSync(CACHE, { recursive: true });

async function get(url, binary) {
  const file = path.join(CACHE, url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_'));
  if (!fs.existsSync(file)) {
    const r = await fetch(url);
    if (!r.ok) throw new Error(`${r.status} ${url}`);
    fs.writeFileSync(file, Buffer.from(await r.arrayBuffer()));
  }
  return binary ? fs.readFileSync(file) : fs.readFileSync(file, 'utf8');
}

const norm = s => String(s).toUpperCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^A-Z0-9]/g, '');
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// ORAS-Namen, die in Smaragd anders heißen (Abschnitt der Regionskarte)
const SECTION_ALIAS = {
  TEAMAQUAHIDEOUT: 'AQUAHIDEOUT', TEAMMAGMAHIDEOUT: 'MAGMAHIDEOUT', SEAMAUVILLE: 'ABANDONEDSHIP', BATTLERESORT: 'BATTLEFRONTIER',
  MTCHIMNEY: 'MTCHIMNEY', MTPYRE: 'MTPYRE'
};

const tables = OrasRom.wildTables;

// PKHeX-Begegnungen (BinLinker „ao“): je Bereich Ort u16, Art u8, dann Plätze à 4 Byte (Art | Form << 11, min, max)
function pkl(buf) {
  const n = buf.readUInt16LE(2), out = [];
  for (let i = 0; i < n; i++) {
    const s = buf.readUInt32LE(4 + i * 4), e = buf.readUInt32LE(8 + i * 4), d = buf.subarray(s, e), slots = [];
    for (let o = 4; o + 4 <= d.length; o += 4) slots.push(d.readUInt16LE(o) & 0x7FF);
    out.push({ loc: d.readUInt16LE(0), slots });
  }
  return out;
}

(async () => {
  const rom = await OrasRom.openPath(ROM);
  if (rom.game !== 'or') throw new Error('Bitte die ROM von Omega Rubin nehmen (die AS-Tabellen entstehen aus den PKHeX-Unterschieden)');
  const [de, en] = await Promise.all([OrasRom.readTexts(rom, 'de'), OrasRom.readTexts(rom, 'en')]);
  const files = OrasRom._internal.garc(await rom.file(OrasRom.FILES.wild), true);
  const wild = OrasRom._internal.wildTable(files);
  const zoneTable = files[files.length - 2];
  const zoneLoc = i => (zoneTable[i * 56 + 0x1C] | (zoneTable[i * 56 + 0x1D] << 8)) & 0x1FF;

  // Unterschiede Alpha Saphir: je Ort Art in OR → Art in AS
  const or = pkl(await get(PKHEX + 'encounter_or.pkl', true)), as = pkl(await get(PKHEX + 'encounter_as.pkl', true));
  const swapAs = {};
  or.forEach((a, i) => {
    const b = as[i];
    if (!b || b.loc !== a.loc) return;
    a.slots.forEach((s, k) => {
      if (s && b.slots[k] && s !== b.slots[k]) (swapAs[a.loc] = swapAs[a.loc] || {})[s] = b.slots[k];
    });
  });

  // Regionskarte (Smaragd): Raster 28 × 15 und Abschnitte mit Lage
  const sections = JSON.parse(await get(PE + 'region_map_sections.json')).map_sections;
  const layoutSrc = await get(PE + 'region_map_layout.h');
  const rows = [...layoutSrc.matchAll(/\{(MAPSEC_[^}]+)\}/g)].map(m => m[1].split(',').map(s => s.trim()).filter(Boolean));
  // Namen gibt es doppelt (Kanto-Kopien ohne Lage) – es zählt der Abschnitt mit Lage
  const secByNorm = new Map();
  sections.forEach(s => { const k = norm(s.name || s.id.replace(/^MAPSEC_/, '')); if (!secByNorm.has(k) || (s.x != null && secByNorm.get(k).x == null)) secByNorm.set(k, s); });
  const secById = new Map(sections.map(s => [s.id, s]));

  // Orte: alle mit Namen (gerade Nummern 170–354), dazu Lage auf der Karte
  const locations = [], index = {};
  for (let id = 170; id <= 354; id += 2) {
    if (!de.maps[id] || de.maps[id] === '???') continue;
    const n = norm(en.maps[id]), sec = secByNorm.get(SECTION_ALIAS[n] || n);
    const type = /Town$/.test(en.maps[id]) ? 'town' : /City$/.test(en.maps[id]) ? 'city' : /^Route /.test(en.maps[id]) ? 'route' : 'place';
    index[id] = locations.length;
    locations.push({ id, de: de.maps[id], en: en.maps[id], slug: slug(en.maps[id]), type, sec: sec ? sec.id : null,
      at: sec && sec.x != null ? [sec.x, sec.y, sec.width || 1, sec.height || 1] : null, wild: [] });
  }
  // Raster: je Feld die Ort-Nummer (Index in locations) oder −1
  const grid = rows.map(r => r.map(secId => {
    const sec = secById.get(secId);
    if (!sec) return -1;
    const li = locations.findIndex(l => l.sec === secId);
    return li;
  }));

  // Wilde Pokémon je Zone, nach Ort gesammelt; Alpha Saphir mit getauschten Editions-Pokémon
  const zones = {};
  wild.forEach((z, zi) => {
    if (!z) return;
    const id = zoneLoc(zi), li = index[id];
    if (li == null) return;
    const t = tables(z, null), ta = swapAs[id] ? tables(z, swapAs[id]) : null;
    if (!t) return;
    const entry = { zone: zi, or: t };
    if (ta && JSON.stringify(ta) !== JSON.stringify(t)) entry.as = ta;
    locations[li].wild.push(entry);
    zones[zi] = li;
  });

  const data = { version: 1, game: 'oras', source: 'ROM (Omega Rubin) · pret/pokeemerald (Regionskarte) · PKHeX (Alpha Saphir)',
    width: 28, height: 15, grid, locations };
  fs.writeFileSync(path.join(OUT, 'oras.json'), JSON.stringify(data));

  // Für Run-Dashboard und Duo (rando-state.js): Ort (deutscher Name) → Zonen und Original-Arten (Gras, Surfen, Angeln)
  const areas = {};
  locations.forEach(l => {
    if (!l.wild.length) return;
    const species = v => {
      const out = [], seen = new Set();
      l.wild.forEach(w => ['grass', 'tall', 'surf', 'old', 'good', 'super'].forEach(k => ((v === 'as' && w.as) || w.or)[k]?.forEach(e => { if (!seen.has(e.id)) { seen.add(e.id); out.push(e.id); } })));
      return out;
    };
    const orig = species('or'), origAs = species('as');
    areas[l.de] = { en: l.en, id: l.id, enc: l.wild.map(w => w.zone), orig };
    if (origAs.join() !== orig.join()) areas[l.de].origAs = origAs;
  });
  fs.writeFileSync(path.join(OUT, 'encounter-areas-oras.js'), '/* Automatisch erzeugt von tools/build-oras.js – Ort → Zonen in a/0/1/3 (Omega Rubin / Alpha Saphir) */\n' +
    'window.ORAS_ENCOUNTER_AREAS = ' + JSON.stringify(areas) + ';\n');
  console.log('oras.json', (fs.statSync(path.join(OUT, 'oras.json')).size / 1024).toFixed(0), 'KB ·', locations.length, 'Orte ·',
    locations.filter(l => l.wild.length).length, 'mit wilden Pokémon ·', locations.filter(l => l.at).length, 'auf der Karte ·',
    Object.keys(swapAs).length, 'Orte mit AS-Unterschieden');
  console.log('ohne Kartenplatz:', locations.filter(l => !l.at).map(l => l.de).join(', '));
})().catch(e => { console.error(e); process.exit(1); });
