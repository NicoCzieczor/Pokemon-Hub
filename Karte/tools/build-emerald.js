#!/usr/bin/env node
/*
 * Baut Karte/emerald.json für Pokémon Smaragd aus einem lokalen pret/pokeemerald-Checkout, dem render.json von
 * render-emerald.js und (für die deutschen Namen) der deutschen Smaragd-ROM. Gleiches Format wie frlg.json
 * (Platin-Karte, app.js): die Orte der Oberwelt sind Rechtecke (locations[i].rects), wilde Pokémon eine Liste
 * (Smaragd hat nur eine Edition), Innenkarten für alle Karten mit Items, Trainern oder wilden Pokémon.
 *
 * Orte = Kartenabschnitte (MAPSEC). Besonderheiten von Smaragd:
 *  - Unterwasser-Karten gehören zur Route (bzw. Stadt/Höhle) darüber, als Bereich „Unterwasser".
 *  - Xeneroville liegt im Krater auf Route 126: dort ist sein Ort auf der Oberwelt, die Stadt selbst eine Innenkarte.
 *  - Die Fähre MS Tide (Kartenabschnitt „dynamisch") ist ein eigener Ort, erreichbar über die Häfen.
 *  - Ereignis-Inseln (Südliche Insel, Ferne Insel, Geburtsinsel, Nabelfelsen) gibt es nur mit Sonderticket.
 *
 * Wilde Pokémon (wild_encounters.json): Gras 20/20/10/10/10/10/5/5/4/4/1/1 %, Surfen und Zertrümmerer 60/30/5/4/1 %,
 * Angel 70/30 %, Profiangel 60/20/20 %, Superangel 40/40/15/4/1 %. Dazu Item-Bälle (finditem), versteckte Items,
 * Geschenke (giveitem), Trainer mit Team (trainers.h, trainer_parties.h), feste Begegnungen (setwildbattle),
 * geschenkte Pokémon und Eier.
 *
 * Aufruf: node build-emerald.js <pokeemerald> <render.json> <deutsche-smaragd.gba> [ausgabe.json]
 * Der Checkout braucht include/constants/, src/data/, data/maps/, data/scripts/ und charmap.txt.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadCharmap, makeText } = require('./gba-text.js');

const ROOT = path.resolve(process.argv[2] || '');
const RENDER_FILE = path.resolve(process.argv[3] || '');
const ROM_FILE = process.argv[4] ? path.resolve(process.argv[4]) : '';
const OUT = path.resolve(process.argv[5] || path.join(__dirname, '..', 'emerald.json'));
if (!fs.existsSync(path.join(ROOT, 'data', 'maps', 'map_groups.json')) || !fs.existsSync(RENDER_FILE) || !fs.existsSync(ROM_FILE)) {
  console.error('Aufruf: node build-emerald.js <pokeemerald> <render.json> <deutsche-smaragd.gba> [ausgabe.json]');
  process.exit(1);
}
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const json = (...p) => JSON.parse(read(...p));
function defines(file, prefix) {
  const out = new Map();
  for (const m of read(file).matchAll(new RegExp(String.raw`^#define\s+(` + prefix + String.raw`\w+)\s+(\d+|0x[0-9A-Fa-f]+)\s*$`, 'gm'))) out.set(m[1], Number(m[2]));
  return out;
}
// Aufzählung (enum { A, B, C = 5, … }) → Nummern
function enumValues(file, first) {
  const src = read(file), start = src.indexOf(first), open = src.lastIndexOf('{', start), body = src.slice(open + 1, src.indexOf('};', start));
  const out = new Map();
  let n = 0;
  for (let line of body.split(/\r?\n/)) {
    line = line.replace(/\/\/.*$/, '').trim();
    if (!line || line.startsWith('#')) continue;
    for (const part of line.split(',')) {
      const p = part.trim();
      if (!p) continue;
      const a = /^(\w+)\s*=\s*(.+)$/.exec(p);
      if (a) { n = /^\d+$/.test(a[2].trim()) ? +a[2] : out.get(a[2].trim()); out.set(a[1], n++); } else out.set(p, n++);
    }
  }
  return out;
}
const ITEMS = enumValues('include/constants/items.h', 'ITEM_NONE');
// TMs/VMs heißen in Skripten und Itemliste nach ihrer Attacke (ITEM_TM_FOCUS_PUNCH = TM01)
const TM_LIST = (() => {
  const src = read('include/constants/tms_hms.h');
  const list = macro => [...src.split(`#define ${macro}(F)`)[1].split(/\n\s*\n|#define/)[0].matchAll(/F\((\w+)\)/g)].map(m => m[1]);
  const tm = list('FOREACH_TM'), hm = list('FOREACH_HM');
  tm.forEach((mv, i) => ITEMS.set('ITEM_TM_' + mv, ITEMS.get('ITEM_TM01') + i));
  hm.forEach((mv, i) => ITEMS.set('ITEM_HM_' + mv, ITEMS.get('ITEM_HM01') + i));
  return [...tm, ...hm];
})();
const MOVES = defines('include/constants/moves.h', 'MOVE_');
const TRAINERS = defines('include/constants/opponents.h', 'TRAINER_');
const CLASSES = defines('include/constants/trainers.h', 'TRAINER_CLASS_');
// Arten im Spiel haben eigene Nummern (Hoenn-Pokémon ab 277) – auf die National-Dex-Nummer umrechnen
const DEX = new Map();
{
  let n = 0;
  for (const m of read('include/constants/pokedex.h').matchAll(/^\s*(NATIONAL_DEX_\w+)\s*,/gm)) DEX.set(m[1], n++);
}
const dexOf = sp => (typeof sp === 'number' ? sp : DEX.get(String(sp).replace(/^SPECIES_/, 'NATIONAL_DEX_')) || 0);

// ── Texte: Englisch aus pret (in Großbuchstaben), Deutsch aus der ROM ─────────
const rom = fs.readFileSync(ROM_FILE);
const romCode = rom.toString('ascii', 0xac, 0xb0);
if (romCode !== 'BPED') console.warn(`Achtung: ${romCode} ist keine deutsche Smaragd-ROM (BPED).`);
const T = makeText(rom, loadCharmap(path.join(ROOT, 'charmap.txt')));
// Spieltexte stehen in Großbuchstaben („MEISTERBALL", „METAROST CITY") – wie im Hub üblich normal schreiben
const KEEP_UPPER = new Set(['KP', 'AP', 'TM', 'VM', 'HM', 'EP', 'PP', 'HP', 'HQ', 'UFO', 'TV', 'TNT', 'GB', 'DNS', 'ID', 'TMS', 'MS', 'SS', 'PC']);
function nice(s) {
  s = String(s || '').replace(/PKMN/g, 'POKéMON').replace(/\s+/g, ' ').trim();
  return s.split(/(\s|-|&)/).map((part, i) => {
    if (part === ' ' || part === '-' || part === '&' || !part) return part;
    if (i > 0 && /^(OF|THE|AND)$/.test(part)) return part.toLowerCase();   // „Cave of Origin"
    if (/^[A-Z]+\d+$/.test(part) || /^([A-ZÄÖÜ]\.)+$/.test(part) || KEEP_UPPER.has(part)) return part;
    const low = part.toLowerCase();
    return low.charAt(0).toUpperCase() + low.slice(1);
  }).join('').replace(/strasse/g, 'straße').replace(/Strasse/g, 'Straße');
}
// Tabellen in der ROM über ihren Inhalt finden (keine festen Adressen)
const itemTable = (() => {
  for (let p = 0; p + 44 * 30 < rom.length; p += 4) {
    let ok = true;
    for (let i = 0; i < 30 && ok; i++) if (rom.readUInt16LE(p + i * 44 + 14) !== i || rom[p + i * 44 + 13] > 0xff) ok = false;
    if (ok && rom[p + 44] !== 0xff && T.decode(p + 44, 14)) return p;
  }
  throw new Error('Itemtabelle nicht gefunden');
})();
const moveTable = (() => {
  for (const [a, b] of [['PFUND', 'KARATESCHLAG'], ['POUND', 'KARATE CHOP']]) { const at = T.table(a, b, 13); if (at >= 0) return at - 13; }
  throw new Error('Attackennamen nicht gefunden');
})();
const trainerRows = [];
{
  const src = read('src/data/trainers.h');
  for (const m of src.matchAll(/\[(TRAINER_\w+)\]\s*=\s*\{([\s\S]*?)\n    \},/g)) {
    const f = m[2], cls = /\.trainerClass = (TRAINER_CLASS_\w+)/.exec(f), party = /\.party = (\w+)\((sParty_\w+)\)/.exec(f);
    trainerRows[TRAINERS.get(m[1])] = {
      key: m[1], cls: cls ? cls[1] : 'TRAINER_CLASS_NONE', name: (/\.trainerName = _\("([^"]*)"\)/.exec(f) || [])[1] || '',
      double: /\.doubleBattle = TRUE/.test(f), party: party ? party[2] : null,
    };
  }
}
const trainerTable = (() => {
  for (let base = 0; base + 40 * 60 < rom.length; base += 4) {
    let ok = true;
    for (let i = 1; i < 60 && ok; i++) if (trainerRows[i] && rom[base + i * 40 + 1] !== CLASSES.get(trainerRows[i].cls)) ok = false;
    if (ok) return base;
  }
  throw new Error('Trainertabelle nicht gefunden');
})();
const classTable = (() => {
  const n = Math.max(...CLASSES.values()) + 1, probe = rom[trainerTable + TRAINERS.get('TRAINER_ROXANNE_1') * 40 + 1];
  for (let start = 0; start + 13 * n < rom.length; start++) {
    let ok = true;
    for (let k = 0; k < n && ok; k++) { const at = start + k * 13; if (rom.subarray(at, at + 13).indexOf(0xff) < 1) ok = false; }
    if (ok && T.decode(start + probe * 13, 13) && T.decode(start, 13) === T.decode(start + 13, 13)) return start;
  }
  throw new Error('Trainerklassen nicht gefunden');
})();
const MAPSEC_LIST = json('src/data/region_map/region_map_sections.json').map_sections;
const MAPSEC_INDEX = new Map(MAPSEC_LIST.map((s, i) => [s.id, i]));
// Regionskarte: je Abschnitt 8 Bytes (x, y, Breite, Höhe, Zeiger auf den Namen) – Wurzelheim ist der erste
const mapsecTable = (() => {
  const first = MAPSEC_LIST[0];
  for (const name of ['WURZELHEIM', 'LITTLEROOT TOWN']) for (const at of T.findAll(name)) for (const p of T.pointersTo(at)) {
    if (rom[p - 4] === first.x && rom[p - 3] === first.y && rom[p - 2] === first.width && rom[p - 1] === first.height) return p - 4;
  }
  throw new Error('Ortsnamen nicht gefunden');
})();
const ITEM_EN = [];
for (const m of read('src/data/items.h').matchAll(/\[(ITEM_\w+)\]\s*=\s*\{\s*\.name = _\("([^"]*)"\)/g)) ITEM_EN[ITEMS.get(m[1])] = m[2];
const MOVE_EN = [];
for (const m of read('src/data/text/move_names.h').matchAll(/\[(MOVE_\w+)\]\s*=\s*_\("([^"]*)"\)/g)) MOVE_EN[MOVES.get(m[1])] = m[2];
const CLASS_EN = [];
for (const m of read('src/data/text/trainer_class_names.h').matchAll(/\[(TRAINER_CLASS_\w+)\]\s*=\s*_\("([^"]*)"\)/g)) CLASS_EN[CLASSES.get(m[1])] = m[2].replace('{PKMN}', 'PKMN');
// Pokériegel: im Spiel fünf Sonderzeichen (0x55–0x59, „POKéBLOCK" bzw. „POKéRIEGEL")
const glyphs = (s, word) => s.replace(/オカキクケ/g, word).replace(/\{POKEBLOCK\}\s*/gi, word);
const TXT = {
  item: id => ({ de: nice(glyphs(T.decode(itemTable + id * 44, 14), 'POKéRIEGEL')), en: nice(glyphs(ITEM_EN[id] || '', 'POKéBLOCK ')) }),
  move: id => ({ de: nice(T.decode(moveTable + id * 13, 13)), en: nice(MOVE_EN[id] || '') }),
  cls: id => ({ de: nice(T.decode(classTable + id * 13, 13)), en: nice(CLASS_EN[id] || '') }),
  trainer: id => nice(T.decode(trainerTable + id * 40 + 4, 12)),
  mapsec: key => {
    if (EXTRA_SEC[key]) return EXTRA_SEC[key];
    const i = MAPSEC_INDEX.get(key), en = nice(MAPSEC_LIST[i]?.name || key.replace(/^MAPSEC_/, '').replace(/_/g, ' '));
    const p = i != null ? T.ptr(mapsecTable + i * 8 + 4) : -1;
    return { de: p > 0 ? nice(T.decode(p, 40)) : en, en };
  },
};
// Orte ohne eigenen Kartenabschnitt
const EXTRA_SEC = { SS_TIDAL: { de: 'MS Tide', en: 'S.S. Tidal' } };
const itemSlug = en => en.toLowerCase().replace(/é/g, 'e').replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// TMs/VMs: Attacke und ihr Typ (für das Symbol)
const TM_MOVES = TM_LIST.map(mv => MOVES.get('MOVE_' + mv));
const MOVE_TYPE = [];
for (const m of read('src/data/battle_moves.h').matchAll(/\[(MOVE_\w+)\]\s*=\s*\{[\s\S]*?\.type\s*=\s*TYPE_(\w+)/g)) MOVE_TYPE[MOVES.get(m[1])] = m[2].toLowerCase();
// Tickets für die Ereignis-Inseln bringt nur der Bote (Geheimgeschehen) – im normalen Spiel nicht zu bekommen
const EVENT_ITEMS = new Set(['ITEM_EON_TICKET', 'ITEM_AURORA_TICKET', 'ITEM_MYSTIC_TICKET', 'ITEM_OLD_SEA_MAP'].map(k => ITEMS.get(k)));
function itemInfo(id, kind, qty) {
  const name = TXT.item(id);
  const out = { kind, id: itemSlug(name.en), de: name.de, en: name.en, qty: qty || 1 };
  if (id >= ITEMS.get('ITEM_TM01') && id <= ITEMS.get('ITEM_HM08')) {
    const move = TM_MOVES[id - ITEMS.get('ITEM_TM01')];
    out.tm = true;
    out.move = { ...TXT.move(move), type: MOVE_TYPE[move] || '' };
  }
  return out;
}

// ── Pokémon-Namen (wie überall im Hub) ───────────────────────────────────────
const POKEMON_NAMES = (() => {
  const sandbox = { window: {} };
  require('vm').runInNewContext(fs.readFileSync(path.join(__dirname, '..', '..', 'pokemon-names.js'), 'utf8'), sandbox);
  return sandbox.window.POKEMON_NAMES;
})();
const mon = id => ({ id, de: POKEMON_NAMES.de[id] || '#' + id, en: POKEMON_NAMES.en[id] || POKEMON_NAMES.de[id] || '#' + id });

// ── Trainer ──────────────────────────────────────────────────────────────────
const PARTIES = new Map();
{
  const src = read('src/data/trainer_parties.h');
  for (const m of src.matchAll(/(sParty_\w+)\[\]\s*=\s*\{([\s\S]*?)\n\};/g)) {
    PARTIES.set(m[1], [...m[2].matchAll(/\{([^{}]*(?:\{[^{}]*\}[^{}]*)*)\}/g)].map(x => {
      const f = x[1];
      const p = { species: (/\.species = (SPECIES_\w+)/.exec(f) || [])[1], lv: +(/\.lvl = (\d+)/.exec(f) || [])[1] };
      const item = /\.heldItem = (ITEM_\w+)/.exec(f);
      if (item && item[1] !== 'ITEM_NONE') p.item = item[1];
      const moves = /\.moves = \{([^}]*)\}/.exec(f);
      if (moves) p.moves = moves[1].split(',').map(s => s.trim()).filter(s => s && s !== 'MOVE_NONE');
      return p;
    }).filter(p => p.species));
  }
}
// Rivale (Brendan/Maike, Heiko): Team je nach Starter – die Karte gruppiert die Varianten
const RIVAL_CLASSES = new Set(['TRAINER_CLASS_RIVAL']);
function trainerInfo(key) {
  const id = TRAINERS.get(key), row = trainerRows[id];
  if (id == null || !row || !row.party) return null;
  const rival = RIVAL_CLASSES.has(row.cls), cls = TXT.cls(CLASSES.get(row.cls));
  const nameDe = TXT.trainer(id) || nice(row.name), nameEn = nice(row.name);
  return {
    id: key, cls: rival ? 'RIVAL' : row.cls.replace(/^TRAINER_CLASS_/, ''),
    de: `${cls.de} ${nameDe}`.trim(), en: `${cls.en} ${nameEn}`.trim(), double: row.double,
    party: (PARTIES.get(row.party) || []).map(p => {
      const out = { ...mon(dexOf(p.species)), lv: p.lv };
      if (p.item) out.item = TXT.item(ITEMS.get(p.item));
      if (p.moves?.length) out.moves = p.moves.map(mv => TXT.move(MOVES.get(mv)));
      return out;
    }).filter(p => p.id),
  };
}

// ── Karten ───────────────────────────────────────────────────────────────────
const GROUPS = json('data/maps/map_groups.json');
const MAPS = new Map();          // Name → map.json (+ Gruppe)
for (const g of GROUPS.group_order) for (const name of GROUPS[g]) MAPS.set(name, { ...json('data/maps', name, 'map.json'), group: g });
const byId = new Map([...MAPS.values()].map(m => [m.id, m]));
const render = JSON.parse(fs.readFileSync(RENDER_FILE, 'utf8'));
const WORLD = new Map(render.maps.map(m => [m.name, m]));
const outside = m => WORLD.has(m.name);
const worldPos = (m, x, y) => { const w = WORLD.get(m.name); return [w.x + x, w.z + y]; };
const mapKey = m => m.id.replace(/^MAP_/, '');
// Ereignis-Inseln (nur mit Sonderticket), Geheimbasen, der Möbelwagen vom Spielbeginn, Kabel-/Wettbewerbsräume,
// Kampfpyramiden-Etagen (zufällig)
const SKIP_SEC = new Set(['MAPSEC_SECRET_BASE', 'MAPSEC_INSIDE_OF_TRUCK', 'MAPSEC_SOUTHERN_ISLAND', 'MAPSEC_FARAWAY_ISLAND', 'MAPSEC_BIRTH_ISLAND', 'MAPSEC_NAVEL_ROCK']);
const unused = m => /Unused|Prototype|_Connection$/.test(m.name) || SKIP_SEC.has(m.region_map_section) ||
  (m.region_map_section === 'MAPSEC_DYNAMIC' && !m.name.startsWith('SSTidal'));
// Kartenabschnitt eines Ortes: Unterwasser gehört zur Gegend darüber, die Fähre ist ein eigener Ort
const UNDERWATER = { Underwater_SootopolisCity: 'MAPSEC_SOOTOPOLIS_CITY', Underwater_SeafloorCavern: 'MAPSEC_SEAFLOOR_CAVERN', Underwater_SealedChamber: 'MAPSEC_SEALED_CHAMBER', Underwater_MarineCave: 'MAPSEC_MARINE_CAVE' };
function secOf(m) {
  if (m.name.startsWith('SSTidal')) return 'SS_TIDAL';
  const r = /^Underwater_Route(\d+)$/.exec(m.name);
  if (r) return `MAPSEC_ROUTE_${r[1]}`;
  return UNDERWATER[m.name] || m.region_map_section;
}

// ── Skripte: Blöcke je Sprungmarke ───────────────────────────────────────────
const scriptFiles = [
  ...[...MAPS.keys()].map(n => path.join(ROOT, 'data/maps', n, 'scripts.inc')),
  ...fs.readdirSync(path.join(ROOT, 'data/scripts')).filter(f => f.endsWith('.inc')).map(f => path.join(ROOT, 'data/scripts', f)),
].filter(f => fs.existsSync(f));
function labelIndex() {
  const labels = new Map();
  for (const file of scriptFiles) {
    let cur = null, prev = null;
    for (let line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      line = line.replace(/@.*$/, '').trim();
      let m;
      if (!line || /^\.(if|else|endif)/.test(line)) continue;
      if ((m = /^(\w+)::?$/.exec(line))) {
        cur = { name: m[1], lines: [], next: null, file };
        if (prev) prev.next = cur.name;
        labels.set(cur.name, cur); prev = cur;
        continue;
      }
      if (cur) cur.lines.push(line);
    }
  }
  return labels;
}
const LABELS = labelIndex();
const prefixOf = label => { const i = label.indexOf('_EventScript_'); return i > 0 ? label.slice(0, i + 1) : null; };
// Kampf-Varianten mit „trainerbattle TRAINER_BATTLE_…": Fortsetzung (Arena Bad Lavastadt), Mehrfachkampf (Raumfahrtzentrum)
const BATTLE_KINDS = /^TRAINER_BATTLE_(CONTINUE_SCRIPT\w*|SET_TRAINER_[AB]|SINGLE\w*|DOUBLE\w*)$/;
function scriptEffects(start, seen = new Set()) {
  const prefix = prefixOf(start);
  const out = { found: [], gifts: [], battles: [], statics: [], mons: [] };
  const todo = [start];
  while (todo.length) {
    const name = todo.pop();
    const l = LABELS.get(name);
    if (!l || seen.has(name)) continue;
    // Nur Marken derselben Karte folgen – allgemeine Skripte (Pokémon-Center, Items …) haben eigene Einträge
    if (name !== start && (!prefix || !name.startsWith(prefix))) continue;
    seen.add(name);
    const last = l.lines[l.lines.length - 1] || '';
    if (l.next && !/^(end|return|goto\s|releaseall$|step_end)/.test(last)) todo.push(l.next);
    for (const line of l.lines) {
      for (const ref of line.matchAll(/\b([A-Z]\w*_EventScript_\w+)\b/g)) if (LABELS.has(ref[1])) todo.push(ref[1]);
      let m;
      if ((m = /^finditem\s+(ITEM_\w+)(?:,\s*(\d+))?/.exec(line))) out.found.push({ item: m[1], qty: +(m[2] || 1) });
      else if ((m = /^giveitem\s+(ITEM_\w+)(?:,\s*(\d+))?/.exec(line)) || (m = /^additem\s+(ITEM_\w+)(?:,\s*(\d+))?/.exec(line))) out.gifts.push({ item: m[1], qty: +(m[2] || 1) });
      else if ((m = /^trainerbattle_(?!rematch)\w*\s+(TRAINER_\w+)(?:,\s*(TRAINER_\w+))?/.exec(line))) out.battles.push(...[m[1], m[2]].filter(Boolean));
      else if ((m = /^trainerbattle\s+(TRAINER_BATTLE_\w+),\s*(TRAINER_\w+)/.exec(line)) && BATTLE_KINDS.test(m[1])) out.battles.push(m[2]);
      else if ((m = /^setwildbattle\s+(SPECIES_\w+),\s*(\d+)/.exec(line))) out.statics.push({ species: m[1], lv: +m[2] });
      else if ((m = /^givemon\s+(SPECIES_\w+),\s*(\d+)/.exec(line))) out.mons.push({ species: m[1], lv: +m[2] });
      else if ((m = /^giveegg\s+(SPECIES_\w+)/.exec(line))) out.mons.push({ species: m[1], lv: 1, egg: true });
    }
  }
  return out;
}

// ── Wilde Pokémon ────────────────────────────────────────────────────────────
const WILD = new Map();   // MAP_… → Tabellen
const RATE = { land: [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1], water: [60, 30, 5, 4, 1], rock: [60, 30, 5, 4, 1], fish: [70, 30, 60, 20, 20, 40, 40, 15, 4, 1] };
function table(mons, rates, from = 0, to = mons.length) {
  const byMon = new Map();
  for (let i = from; i < to; i++) {
    const s = mons[i], id = dexOf(s.species);
    if (!id) continue;
    const o = byMon.get(id) || { ...mon(id), p: 0, min: s.min_level, max: s.max_level };
    o.p += rates[i]; o.min = Math.min(o.min, s.min_level); o.max = Math.max(o.max, s.max_level);
    byMon.set(id, o);
  }
  return [...byMon.values()].sort((a, b) => b.p - a.p || a.id - b.id);
}
for (const e of json('src/data/wild_encounters.json').wild_encounter_groups[0].encounters) {
  // Wandelhöhle: neun Tabellen, im Spiel gilt nur die erste (die anderen nur per Geheimgeschehen)
  if (WILD.has(e.map)) continue;
  const w = {};
  if (e.land_mons) w.grass = table(e.land_mons.mons, RATE.land);
  if (e.water_mons) w.surf = table(e.water_mons.mons, RATE.water);
  if (e.rock_smash_mons) w.rockSmash = table(e.rock_smash_mons.mons, RATE.rock);
  if (e.fishing_mons) {
    w.oldRod = table(e.fishing_mons.mons, RATE.fish, 0, 2);
    w.goodRod = table(e.fishing_mons.mons, RATE.fish, 2, 5);
    w.superRod = table(e.fishing_mons.mons, RATE.fish, 5, 10);
  }
  WILD.set(e.map, w);
}

// ── Raumnamen (Innenkarten) ──────────────────────────────────────────────────
const ROOM = {
  BrendansHouse: ['Brix’ Haus', "Brendan's House"], MaysHouse: ['Maikes Haus', "May's House"], ProfessorBirchsLab: ['Birks Labor', "Prof. Birch's Lab"],
  PokemonCenter: ['Pokémon-Center', 'Pokémon Center'], Mart: ['Pokémon-Markt', 'Poké Mart'], Gym: ['Arena', 'Gym'], House: ['Haus', 'House'],
  PokemonSchool: ['Pokémon-Schule', 'Pokémon School'], DevonCorp: ['Devon AG', 'Devon Corp.'], CuttersHouse: ['Haus des Zerschneiders', "Cutter's House"],
  Flat: ['Wohnung', 'Flat'], Apartments: ['Wohnungen', 'Apartments'], PokemonFanClub: ['Pokémon-Fanclub', 'Pokémon Fan Club'], OceanicMuseum: ['Ozeanmuseum', 'Oceanic Museum'],
  SternsShipyard: ['Werft', "Stern's Shipyard"], Harbor: ['Hafen', 'Harbor'], NameRatersHouse: ['Haus des Namensbewerters', "Name Rater's House"],
  BattleTentLobby: ['Kampfzelt', 'Battle Tent'], BattleTentCorridor: ['Kampfzelt Gang', 'Battle Tent Corridor'], BattleTentBattleRoom: ['Kampfzelt Kampfraum', 'Battle Tent Battle Room'],
  ExchangeServiceCorner: ['Tauschecke', 'Exchange Service Corner'], BikeShop: ['Fahrradladen', 'Bike Shop'], GameCorner: ['Spielhalle', 'Game Corner'],
  CoveLilyMotel: ['Motel Seegras', 'Cove Lily Motel'], LilycoveMuseum: ['Museum', 'Lilycove Museum'], ContestLobby: ['Wettbewerbshalle', 'Contest Hall'],
  DepartmentStore: ['Kaufhaus', 'Department Store'], DepartmentStoreElevator: ['Kaufhaus Aufzug', 'Department Store Elevator'], DepartmentStoreRooftop: ['Kaufhaus Dach', 'Department Store Rooftop'],
  PokemonTrainerFanClub: ['Trainer-Fanclub', 'Trainer Fan Club'], MoveDeletersHouse: ['Haus des Attacken-Verlerners', "Move Deleter's House"], Harbor_: ['Hafen', 'Harbor'],
  SpaceCenter: ['Raumfahrtzentrum', 'Space Center'], GameCornerRoom: ['Spielhalle', 'Game Corner'], StevensHouse: ['Troys Haus', "Steven's House"],
  CameraShop: ['Fotoladen', 'Camera Shop'], WailmerGirlsHouse: ['Wailmer-Haus', "Wailmer Girl's House"], MysteryEventsHouse: ['Haus der Geheimgeschehen', 'Mystery Events House'],
  LotadAndSeedotHouse: ['Loturzel-Samurzel-Haus', 'Lotad and Seedot House'], PrettyPetalFlowerShop: ['Blumenladen', 'Pretty Petal Flower Shop'], MrBrineysHouse: ['Kapt. Briggs Haus', "Mr. Briney's House"],
  WinstrateFamilysHouse: ['Haus der Familie Sihgers', "Winstrate Family's House"], FossilManiacsHouse: ['Haus des Fossilfans', "Fossil Maniac's House"],
  FossilManiacsTunnel: ['Tunnel des Fossilfans', "Fossil Maniac's Tunnel"], LanettesHouse: ['Lanettes Haus', "Lanette's House"], GlassWorkshop: ['Glaswerkstatt', 'Glass Workshop'],
  WeatherInstitute: ['Wetterinstitut', 'Weather Institute'], CyclingRoadNorthEntrance: ['Radweg Nordeingang', 'Cycling Road North Entrance'],
  CyclingRoadSouthEntrance: ['Radweg Südeingang', 'Cycling Road South Entrance'], TrickHouseEntrance: ['Trickhaus', 'Trick House'], TrickHouseEnd: ['Trickhaus Ende', 'Trick House End'],
  TrickHouseCorridor: ['Trickhaus Gang', 'Trick House Corridor'], TrickHousePuzzle: ['Trickhaus Rätsel', 'Trick House Puzzle'], SeashoreHouse: ['Strandhaus', 'Seashore House'],
  CableCarStation: ['Seilbahnstation', 'Cable Car Station'], SafariZoneEntrance: ['Eingang zur Safari-Zone', 'Safari Zone Entrance'],
  NewMauvilleEntrance: ['Neu-Malvenfroh Eingang', 'New Mauville Entrance'], TunnelersRestHouse: ['Rasthaus der Tunnelgräber', "Tunnelers' Rest House"],
  PokemonDayCare: ['Pension', 'Pokémon Day Care'], Elevator: ['Aufzug', 'Elevator'], HallOfFame: ['Ruhmeshalle', 'Hall of Fame'], ChampionsRoom: ['Raum des Champs', "Champion's Room"],
  SidneysRoom: ['Ulrichs Raum', "Sidney's Room"], PhoebesRoom: ['Antjes Raum', "Phoebe's Room"], GlaciasRoom: ['Frosinas Raum', "Glacia's Room"], DrakesRoom: ['Dragans Raum', "Drake's Room"],
  Hall: ['Halle', 'Hall'], PokemonLeague: ['Pokémon-Liga', 'Pokémon League'], RoomOfAPokemonFan: ['Zimmer eines Fans', 'Room of a Pokémon Fan'],
  Room: ['Raum', 'Room'], Corridors: ['Gänge', 'Corridors'], Rooms: ['Kajüten', 'Rooms'], Rooms2: ['Kajüten 2', 'Rooms 2'], Deck: ['Deck', 'Deck'], Underwater: ['Unterwasser', 'Underwater'],
  HiddenFloorCorridors: ['Verborgene Gänge', 'Hidden Floor Corridors'], HiddenFloorRooms: ['Verborgene Kajüten', 'Hidden Floor Rooms'], CaptainsOffice: ['Kapitänskajüte', "Captain's Office"],
  Entrance: ['Eingang', 'Entrance'], Inside: ['Innen', 'Inside'], Exterior: ['Außen', 'Exterior'], Summit: ['Gipfel', 'Summit'], Outside: ['Außen', 'Outside'], Top: ['Spitze', 'Top'],
  End: ['Ende', 'End'], OuterRoom: ['Vorraum', 'Outer Room'], InnerRoom: ['Innenraum', 'Inner Room'], StevensRoom: ['Troys Raum', "Steven's Room"], StevensCave: ['Troys Höhle', "Steven's Cave"],
  LowTideEntranceRoom: ['Ebbe Eingang', 'Low Tide Entrance'], LowTideInnerRoom: ['Ebbe Innenraum', 'Low Tide Inner Room'], LowTideStairsRoom: ['Ebbe Treppe', 'Low Tide Stairs'],
  LowTideLowerRoom: ['Ebbe Unterer Raum', 'Low Tide Lower Room'], LowTideIceRoom: ['Eisraum', 'Ice Room'], HighTideEntranceRoom: ['Flut Eingang', 'High Tide Entrance'],
  HighTideInnerRoom: ['Flut Innenraum', 'High Tide Inner Room'], Corridor: ['Gang', 'Corridor'], LowerDeck: ['Unterdeck', 'Lower Deck'], RestHouse: ['Rasthaus', 'Rest House'],
  Lobby: ['Lobby', 'Lobby'], Roof: ['Dach', 'Roof'], BerryMastersHouse: ['Haus des Beerenmeisters', "Berry Master's House"], ContestHall: ['Wettbewerbshalle', 'Contest Hall'],
  CozmosHouse: ['Prof. Kosmos Haus', "Prof. Cozmo's House"], HerbShop: ['Kräuterladen', 'Herb Shop'], ScottsHouse: ['Scotts Haus', "Scott's House"], WallysHouse: ['Heikos Haus', "Wally's House"],
  WandasHouse: ['Wandas Haus', "Wanda's House"], MoveRelearnersHouse: ['Haus des Attacken-Erinnerers', "Move Relearner's House"], FriendshipRatersHouse: ['Haus der Freundschaftsprüferin', "Friendship Rater's House"],
  DivingTreasureHuntersHouse: ['Haus des Schatztauchers', "Diving Treasure Hunter's House"], DecorationShop: ['Dekoladen', 'Decoration Shop'],
  OldLadysRestStop: ['Rastplatz der alten Dame', "Old Lady's Rest Stop"], SeasideCyclingRoadNorthEntrance: ['Küstenradweg Nordeingang', 'Seaside Cycling Road North Entrance'],
  SeasideCyclingRoadSouthEntrance: ['Küstenradweg Südeingang', 'Seaside Cycling Road South Entrance'], Lounge: ['Aufenthaltsraum', 'Lounge'], RankingHall: ['Ruhmeshalle der Kampfzone', 'Ranking Hall'],
  ReceptionGate: ['Empfang', 'Reception Gate'],
};
const camel = s => s.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
const unknownRooms = new Set();
function roomNames(m) {
  if (m.name.startsWith('Underwater_')) return { de: 'Unterwasser', en: 'Underwater' };
  if (m.name.startsWith('SSTidal')) { const r = m.name.replace('SSTidal', ''); return ROOM[r] ? { de: ROOM[r][0], en: ROOM[r][1] } : { de: camel(r), en: camel(r) }; }
  const segs = m.name.split('_');
  const sec = camel(secOf(m).replace(/^MAPSEC_/, '').toLowerCase().replace(/_(\w)/g, (x, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase())).replace(/ /g, '');
  // Besitzer vorn weglassen (Stadt, Route, Höhle) – auch Außenkarten-Namen und den Namen des Abschnitts
  let i = 1;
  while (i < segs.length && (WORLD.has(segs.slice(0, i + 1).join('_')) || segs[i] === sec || segs[i].toLowerCase() === sec.toLowerCase())) i++;
  if (segs[0] !== sec && segs[0].toLowerCase() !== sec.toLowerCase() && !WORLD.has(segs[0]) && !/^(Route\d+|\w+(City|Town))$/.test(segs[0])) i = 0;
  const rest = segs.slice(i);
  if (!rest.length) return { de: '', en: '' };
  const one = (seg, lang) => {
    if (ROOM[seg]) return ROOM[seg][lang];
    const num = /^([A-Za-z]+?)(\d+)$/.exec(seg);
    if (num && ROOM[num[1]]) return `${ROOM[num[1]][lang]} ${num[2]}`;
    if (/^B?\d+F$/.test(seg) || /^\dR$/.test(seg)) return seg;
    unknownRooms.add(seg);
    return camel(seg);
  };
  return { de: rest.map(s => one(s, 0)).join(' '), en: rest.map(s => one(s, 1)).join(' ') };
}

// ── Orte zusammensetzen ──────────────────────────────────────────────────────
const locs = new Map();
function locFor(m) {
  const sec = secOf(m), name = TXT.mapsec(sec);
  // Abschnitte mit gleichem Namen sind ein Ort
  const key = name.en.toLowerCase();
  if (!locs.has(key)) locs.set(key, { key: sec, de: name.de, en: name.en, rects: [], maps: [], interiors: [], items: [], trainers: [], special: [], wild: [], types: new Set() });
  return locs.get(key);
}
let scriptLinks = 0;
for (const m of MAPS.values()) {
  if (unused(m) && !WORLD.has(m.name)) continue;
  const loc = locFor(m), out = outside(m);
  loc.maps.push(m.name);
  if (out) {
    const w = WORLD.get(m.name);
    loc.rects.push([w.x, w.z, w.x + w.width, w.z + w.height]);
    loc.types.add(m.map_type);
  }
  const room = out ? { de: '', en: '' } : roomNames(m);
  const where = out ? { area: '' } : { area: room.de, areaEn: room.en };
  if (!out) loc.interiors.push({ m, area: room.de, areaEn: room.en });
  const pos = o => (out ? { pos: [...worldPos(m, o.x, o.y), 0] } : { pos: [o.x, o.y, 0], map: mapKey(m) });
  const reached = new Set();
  const add = (start, at, ball) => {
    const a = scriptEffects(start, reached);
    if (a.found.length + a.gifts.length + a.battles.length + a.statics.length + a.mons.length) scriptLinks++;
    for (const g of a.found) if (!EVENT_ITEMS.has(ITEMS.get(g.item))) loc.items.push({ ...itemInfo(ITEMS.get(g.item), ball ? 'ball' : 'gift', g.qty), ...where, ...at });
    for (const g of a.gifts) {
      const id = ITEMS.get(g.item);
      if (!id || EVENT_ITEMS.has(id) || loc.items.some(x => x.kind === 'gift' && x.en === TXT.item(id).en && (x.area || '') === (where.area || ''))) continue;
      loc.items.push({ ...itemInfo(id, ball ? 'ball' : 'gift', g.qty), ...where, ...at });
    }
    for (const key of a.battles) {
      const t = trainerInfo(key);
      if (t && !loc.trainers.some(x => x.id === key)) loc.trainers.push({ ...t, ...where, ...at });
    }
    for (const s of a.statics) addSpecial(loc, 'static', s, where);
    for (const s of a.mons) addSpecial(loc, s.egg ? 'egg' : 'gift', s, where);
  };
  for (const o of m.object_events || []) {
    if (o.type === 'clone' || !o.script || o.script === '0x0') continue;
    add(o.script, pos(o), o.graphics_id === 'OBJ_EVENT_GFX_ITEM_BALL');
  }
  for (const c of m.coord_events || []) if (c.script && c.script !== '0x0') add(c.script, pos(c), false);
  // Skripte der Karte, die keine Person und kein Auslöser startet (z. B. Legendäre, Kämpfe beim Betreten): ohne Stelle
  const own = path.join(ROOT, 'data/maps', m.name, 'scripts.inc');
  for (const l of LABELS.values()) if (l.file === own && !reached.has(l.name) && l.name.startsWith(m.name + '_EventScript_')) add(l.name, { pos: null }, false);
  for (const b of m.bg_events || []) {
    if (b.type !== 'hidden_item') continue;
    const id = ITEMS.get(b.item);
    if (id) loc.items.push({ ...itemInfo(id, 'hidden', +b.quantity || 1), ...where, ...pos(b) });
  }
  const w = WILD.get(m.id);
  if (w && Object.keys(w).length) loc.wild.push({ area: where.area, ...(where.areaEn ? { areaEn: where.areaEn } : {}), ...w, _map: out ? null : mapKey(m) });
}
function addSpecial(loc, kind, s, where) {
  const id = dexOf(s.species);
  if (!id || loc.special.some(x => x.id === id && x.kind === kind && x.lv === s.lv)) return;
  loc.special.push({ kind, ...mon(id), lv: s.lv, area: where.area || '' });
}

// Xeneroville: sein Ort auf der Oberwelt ist der Krater auf Route 126 (Kacheln der Route, aus dem Kartenbild)
const SOOTOPOLIS_CRATER = [26, 34, 61, 61];
{
  const r = WORLD.get('Route126'), l = locs.get(TXT.mapsec('MAPSEC_SOOTOPOLIS_CITY').en.toLowerCase());
  if (r && l) {
    l.rects.push([r.x + SOOTOPOLIS_CRATER[0], r.z + SOOTOPOLIS_CRATER[1], r.x + SOOTOPOLIS_CRATER[2], r.z + SOOTOPOLIS_CRATER[3]]);
    l.types.add('MAP_TYPE_CITY');
    l.crater = true;
  }
}

// ── Orte, Marker, Innenkarten ────────────────────────────────────────────────
const kept = [...locs.values()].filter(l => l.rects.length || l.items.length || l.trainers.length || l.special.length || l.wild.length || l.maps.some(n => !outside(MAPS.get(n))));
for (const l of kept) {
  l.region = 'hoenn';
  const town = l.types.has('MAP_TYPE_CITY') || l.types.has('MAP_TYPE_TOWN');
  l.type = /^Route \d+$/.test(l.en) ? 'route' : town && / City$/.test(l.en) ? 'city' : town ? 'town' : 'place';
}
const TYPE_ORDER = { city: 0, town: 0, route: 1, place: 2 };
kept.sort((a, b) => TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.en.localeCompare(b.en, 'en', { numeric: true }));
const index = new Map(kept.map((l, i) => [l, i]));
const liOfMap = m => (m && !unused(m) ? index.get(locs.get(TXT.mapsec(secOf(m)).en.toLowerCase())) ?? -1 : -1);

// Innenkarten: Karten eines Ortes außerhalb der Oberwelt mit Markern oder wilden Pokémon (und Xeneroville selbst)
const maps = {}, areaEn = {};
for (const l of kept) for (const it of l.interiors) {
  const key = mapKey(it.m);
  const markers = [];
  l.items.forEach((x, i) => { if (x.map === key) markers.push({ k: x.tm ? 'tm' : x.kind === 'hidden' ? 'hidden' : x.kind === 'gift' ? 'gift' : 'item', x: x.pos[0], z: x.pos[1], y: 0, i }); });
  l.trainers.forEach((x, i) => { if (x.map === key) markers.push({ k: 'trainer', x: x.pos[0], z: x.pos[1], y: 0, i }); });
  const wild = l.wild.some(w => w._map === key);
  if (!markers.length && !wild && !(l.crater && it.m.name === 'SootopolisCity')) continue;
  maps[key] = { l: index.get(l), area: it.area, matrix: it.m.layout, areaData: 0, markers, warps: it.m.warp_events || [] };
  if (it.area && it.areaEn && it.areaEn !== it.area) areaEn[it.area] = it.areaEn;
}
for (const l of kept) for (const x of l.wild) {
  if (x.area && x.areaEn && x.areaEn !== x.area) areaEn[x.area] = x.areaEn;
  delete x.areaEn;
}
const destOf = w => byId.get(w.dest_map);
// Ausgänge: zu anderen Innenkarten (to), zurück auf die Oberwelt mit Zielstelle (ow) oder in Bereiche ohne Karte (a)
for (const [key, mm] of Object.entries(maps)) {
  const exits = [];
  for (const w of mm.warps) {
    const dest = destOf(w);
    if (!dest || (unused(dest) && !WORLD.has(dest.name))) continue;
    const dk = mapKey(dest);
    if (dk === key) continue;
    const e = { x: w.x, z: w.y, l: liOfMap(dest) };
    if (e.l < 0) continue;
    if (maps[dk]) e.to = dk;
    else if (outside(dest)) {
      const dw = (dest.warp_events || [])[+w.dest_warp_id];
      if (dw) e.ow = worldPos(dest, dw.x, dw.y);
    } else e.a = roomNames(dest).de;
    const target = x => x.to ?? (x.ow ? `ow${x.l}` : `${x.l}|${x.a}`);
    if (exits.some(x => target(x) === target(e) && Math.abs(x.x - e.x) + Math.abs(x.z - e.z) <= 3)) continue;
    exits.push(e);
  }
  mm.exits = exits;
  delete mm.warps;
}

// Oberwelt-Marker: Items, Trainer, Eingänge in andere Orte und Türen zu Gebäuden mit Innenkarte
const markers = [];
kept.forEach((l, li) => {
  l.items.forEach((x, i) => { if (x.pos && !x.map) markers.push({ k: x.tm ? 'tm' : x.kind === 'hidden' ? 'hidden' : x.kind === 'gift' ? 'gift' : 'item', x: x.pos[0], z: x.pos[1], y: 0, i, l: li }); });
  l.trainers.forEach((x, i) => { if (x.pos && !x.map) markers.push({ k: 'trainer', x: x.pos[0], z: x.pos[1], y: 0, i, l: li }); });
});
const entrances = new Map(), warpSources = new Map();
for (const m of MAPS.values()) {
  if (unused(m) && !WORLD.has(m.name)) continue;
  const from = liOfMap(m);
  for (const w of m.warp_events || []) {
    const dest = destOf(w);
    if (!dest || (unused(dest) && !WORLD.has(dest.name))) continue;
    const dli = liOfMap(dest);
    if (dli < 0 || from < 0) continue;
    if (dli !== from) { if (!warpSources.has(dli)) warpSources.set(dli, new Set()); warpSources.get(dli).add(from); }
    if (!outside(m) || outside(dest)) continue;
    const [x, z] = worldPos(m, w.x, w.y), to = maps[mapKey(dest)] ? mapKey(dest) : undefined;
    if (dli !== from) {
      const list = entrances.get(dli) || [];
      if (list.some(([ex, ez]) => Math.abs(ex - x) + Math.abs(ez - z) < 4)) continue;
      list.push([x, z]);
      entrances.set(dli, list);
      markers.push({ k: 'entrance', x, z, l: dli, from, ...(to ? { to } : {}) });
    } else if (to && !markers.some(mk => mk.k === 'entrance' && mk.to === to)) {
      markers.push({ k: 'entrance', x, z, l: from, to });
    }
  }
}
// Xeneroville: Eingang in der Mitte des Kraters (man taucht hinein) – führt in die Stadtkarte
{
  const li = kept.findIndex(l => l.crater), key = Object.keys(maps).find(k => k === 'SOOTOPOLIS_CITY');
  if (li >= 0 && key) {
    const r = kept[li].rects[0];
    markers.push({ k: 'entrance', x: Math.floor((r[0] + r[2]) / 2), z: Math.floor((r[1] + r[3]) / 2), l: li, to: key });
  }
}

// Orte ohne eigene Außenkarte, die man durch ein Gebäude eines anderen Ortes betritt (Safari-Zone-Eingang,
// Seilbahn zum Schlotberg …): die Tür dieses Gebäudes
{
  const directDoors = new Map();
  for (const m of MAPS.values()) {
    if (!outside(m)) continue;
    for (const w of m.warp_events || []) {
      const d = destOf(w);
      if (!d || outside(d)) continue;
      const list = directDoors.get(d.name) || [], p = worldPos(m, w.x, w.y);
      if (!list.some(q => Math.abs(q[0] - p[0]) + Math.abs(q[1] - p[1]) < 4)) list.push(p);
      directDoors.set(d.name, list);
    }
  }
  for (const g of MAPS.values()) {
    if (outside(g) || !directDoors.has(g.name) || (unused(g) && !WORLD.has(g.name))) continue;
    const from = liOfMap(g);
    for (const w of g.warp_events || []) {
      const x = destOf(w), li = liOfMap(x);
      if (!x || li < 0 || li === from || outside(x) || kept[li].rects.length) continue;
      if ((entrances.get(li) || []).length && !entrances.get(li).via) continue;
      const list = entrances.get(li) || Object.assign([], { via: true });
      for (const [ex, ez] of directDoors.get(g.name)) {
        if (list.some(([ax, az]) => Math.abs(ax - ex) + Math.abs(az - ez) < 4)) continue;
        list.push([ex, ez]);
        markers.push({ k: 'entrance', x: ex, z: ez, l: li, from, ...(maps[mapKey(x)] ? { to: mapKey(x) } : {}) });
      }
      entrances.set(li, list);
    }
  }
}

const outLocs = kept.map((l, li) => {
  const out = { key: l.key, en: l.en, de: l.de, type: l.type, region: l.region, chunks: l.rects.length };
  if (l.rects.length) {
    out.rects = l.rects;
    // Name in die Mitte aller Karten des Ortes (Safari-Zone, Kampfzone), sonst in die Mitte der größten
    const big = l.rects.slice().sort((a, b) => (b[2] - b[0]) * (b[3] - b[1]) - (a[2] - a[0]) * (a[3] - a[1]))[0];
    const mid = [Math.round((Math.min(...l.rects.map(r => r[0])) + Math.max(...l.rects.map(r => r[2]))) / 2), Math.round((Math.min(...l.rects.map(r => r[1])) + Math.max(...l.rects.map(r => r[3]))) / 2)];
    out.label = l.rects.some(r => mid[0] >= r[0] && mid[0] < r[2] && mid[1] >= r[1] && mid[1] < r[3]) ? mid : [Math.round((big[0] + big[2]) / 2), Math.round((big[1] + big[3]) / 2)];
  }
  // Liegt der Name auf einem anderen Ort (Route 126 → Krater von Xeneroville), unter bzw. über diesen rücken
  if (out.label) for (const o of kept) if (o !== l) for (const r of o.rects) {
    const [x, z] = out.label, own = p => l.rects.some(q => p[0] >= q[0] && p[0] < q[2] && p[1] >= q[1] && p[1] < q[3]);
    if (x < r[0] || x >= r[2] || z < r[1] || z >= r[3]) continue;
    out.label = [[x, r[3] + 4], [x, r[1] - 4]].find(own) || out.label;
  }
  const ents = l.rects.length ? [] : entrances.get(li) || [];
  if (ents.length) out.entrances = [...ents];
  // Nur ein Raum mit Inhalt: kein eigener Raumname nötig – außer er hat eine eigene Innenkarte
  const all = [...l.items, ...l.trainers, ...l.special, ...l.wild];
  if (!l.rects.length && new Set(all.map(x => x.area || '')).size === 1 && !Object.values(maps).some(mm => mm.l === li && mm.area)) for (const x of all) x.area = '';
  for (const x of [...l.items, ...l.trainers]) { delete x.areaEn; if (!x.pos) x.pos = null; }
  for (const x of l.wild) delete x._map;
  out.items = l.items;
  out.trainers = l.trainers;
  out.wild = l.wild;
  out.areas = [...new Set(all.map(x => x.area).filter(Boolean))].sort();
  if (l.special.length) out.special = l.special;
  return out;
});
// Orte ohne eigenen Kartenzugang: über welchen Ort mit Stelle erreicht man sie? (bis zu 3 Warps)
const hasPos = l => l.chunks > 0 || (l.entrances || []).length > 0;
outLocs.forEach((l, li) => {
  if (hasPos(l)) return;
  let frontier = [li];
  const visited = new Set(frontier);
  for (let depth = 0; depth < 3 && l.via == null; depth++) {
    const next = [];
    for (const cur of frontier) for (const src of warpSources.get(cur) || []) {
      if (visited.has(src)) continue;
      visited.add(src);
      if (hasPos(outLocs[src])) { l.via = src; break; }
      next.push(src);
    }
    frontier = next;
  }
});
// Ohne Warp erreichbar: die Fähre legt in Graphitport und Seegrasulb an
{
  const byKey = k => outLocs.findIndex(l => l.key === k);
  const via = { SS_TIDAL: 'MAPSEC_SLATEPORT_CITY' };
  for (const [k, v] of Object.entries(via)) { const a = byKey(k), b = byKey(v); if (a >= 0 && b >= 0 && outLocs[a].via == null && !hasPos(outLocs[a])) outLocs[a].via = b; }
}

const data = {
  version: 3, game: 'emerald', source: 'pret/pokeemerald + deutsche ROM (' + romCode + ')',
  width: render.cols * 32, height: render.rows * 32, chunk: 32, chunks: [], locations: outLocs, markers, maps, areaEn,
};
fs.writeFileSync(OUT, JSON.stringify(data));
const sum = k => outLocs.reduce((n, l) => n + (l[k] || []).length, 0);
const mapList = Object.values(maps);
const count = k => markers.filter(m => m.k === k).length;
console.log(`${OUT}: ${outLocs.length} Orte (${outLocs.filter(l => l.chunks).length} auf der Oberwelt), ${sum('items')} Items, ${sum('trainers')} Trainer, ${sum('special')} besondere Pokémon, Skriptverknüpfungen ${scriptLinks}`);
console.log(`  Tabellen in der ROM: Items 0x${itemTable.toString(16)}, Attacken 0x${moveTable.toString(16)}, Trainer 0x${trainerTable.toString(16)}, Klassen 0x${classTable.toString(16)}, Orte 0x${mapsecTable.toString(16)}`);
console.log(`  Marker auf der Oberwelt: Items ${count('item')}, TMs ${count('tm')}, versteckt ${count('hidden')}, Geschenke ${count('gift')}, Trainer ${count('trainer')}, Eingänge ${count('entrance')}`);
console.log(`  Innenkarten: ${mapList.length} (${new Set(mapList.map(m => m.matrix)).size} Bilder), Marker innen: ${mapList.reduce((s, m) => s + m.markers.length, 0)}, Ausgänge: ${mapList.reduce((s, m) => s + m.exits.length, 0)}`);
console.log(`  ohne Stelle: ${outLocs.reduce((n, l) => n + l.items.filter(i => !i.pos).length + l.trainers.filter(t => !t.pos).length, 0)}, über anderen Ort erreichbar: ${outLocs.filter(l => l.via != null).length}, ganz ohne Zugang: ${outLocs.filter(l => !hasPos(l) && l.via == null).map(l => l.de).join(', ')}`);
if (unknownRooms.size) console.log(`  Raumnamen ohne Übersetzung: ${[...unknownRooms].sort().join(', ')}`);
console.log(`  ${Math.round(JSON.stringify(data).length / 1024)} KB`);
