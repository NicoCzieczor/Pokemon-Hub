#!/usr/bin/env node
/*
 * Baut Karte/frlg.json für Feuerrot/Blattgrün aus einem lokalen pret/pokefirered-Checkout, dem render.json von
 * render-frlg.js und (für die deutschen Namen) einer deutschen Feuerrot- oder Blattgrün-ROM.
 * Format wie platin.json/hgss.json (Platin-Karte, app.js) – nur liegen die Orte der Oberwelt als Rechtecke vor
 * (die GBA-Karten sind beliebig große Rechtecke, kein 32er-Raster): locations[i].rects = [[x0, z0, x1, z1], …].
 *
 * Orte = Kartenabschnitte (MAPSEC): Städte und Routen mit ihren Außenkarten, Höhlen/Türme/Gebäude mit eigenem
 * Abschnitt als Orte mit Eingängen. Innenräume (Häuser, Arenen, Etagen) gehören zu ihrem Abschnitt und tragen ihren
 * Raumnamen; Innenkarten gibt es für alle Karten mit Items, Trainern oder wilden Pokémon.
 *
 * Wilde Pokémon je Karte und Edition (wild_encounters.json): Gras 20/20/10/10/10/10/5/5/4/4/1/1 %,
 * Surfen und Zertrümmerer 60/30/5/4/1 %, Angel 70/30 %, Profiangel 60/20/20 %, Superangel 40/40/15/4/1 %.
 * Dazu Item-Bälle (finditem), versteckte Items, Geschenke (giveitem), Trainer mit Team (trainers.h,
 * trainer_parties.h), feste Begegnungen (setwildbattle), geschenkte Pokémon und Eier – je Edition (.ifdef FIRERED).
 *
 * Aufruf: node build-frlg.js <pokefirered> <render.json> <deutsche-frlg.gba> [ausgabe.json]
 * Der Checkout braucht include/constants/, src/data/, data/maps/, data/scripts/, data/layouts/ und charmap.txt.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { loadCharmap, makeText } = require('./gba-text.js');

const ROOT = path.resolve(process.argv[2] || '');
const RENDER_FILE = path.resolve(process.argv[3] || '');
const ROM_FILE = process.argv[4] ? path.resolve(process.argv[4]) : '';
const OUT = path.resolve(process.argv[5] || path.join(__dirname, '..', 'frlg.json'));
if (!fs.existsSync(path.join(ROOT, 'data', 'maps', 'map_groups.json')) || !fs.existsSync(RENDER_FILE) || !fs.existsSync(ROM_FILE)) {
  console.error('Aufruf: node build-frlg.js <pokefirered> <render.json> <deutsche-frlg.gba> [ausgabe.json]');
  process.exit(1);
}
const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const json = (...p) => JSON.parse(read(...p));
function defines(file, prefix) {
  const out = new Map();
  for (const m of read(file).matchAll(new RegExp(String.raw`^#define\s+(` + prefix + String.raw`\w+)\s+(\d+|0x[0-9A-Fa-f]+)\s*$`, 'gm'))) out.set(m[1], Number(m[2]));
  return out;
}
const ITEMS = defines('include/constants/items.h', 'ITEM_');
const MOVES = defines('include/constants/moves.h', 'MOVE_');
const TRAINERS = defines('include/constants/opponents.h', 'TRAINER_');
const CLASSES = defines('include/constants/trainers.h', 'TRAINER_CLASS_');
const SPECIES = defines('include/constants/species.h', 'SPECIES_');
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
if (!/^BP[RG]D$/.test(romCode)) console.warn(`Achtung: ${romCode} ist keine deutsche Feuerrot/Blattgrün-ROM (BPRD/BPGD).`);
const T = makeText(rom, loadCharmap(path.join(ROOT, 'charmap.txt')));
// Spieltexte stehen in Großbuchstaben („MEISTERBALL", „MT. MOND") – wie im Hub üblich normal schreiben
const KEEP_UPPER = new Set(['KP', 'AP', 'TM', 'VM', 'HM', 'EP', 'PP', 'HP', 'HQ', 'UFO', 'TV', 'TNT', 'GB', 'DNS', 'ID', 'TMS']);
function nice(s) {
  s = String(s || '').replace(/PKMN/g, 'POKéMON').replace(/\s+/g, ' ').trim();
  return s.split(/(\s|-)/).map(part => {
    if (part === ' ' || part === '-' || !part) return part;
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
  const n = Math.max(...CLASSES.values()) + 1, probe = rom[trainerTable + TRAINERS.get('TRAINER_LEADER_BROCK') * 40 + 1];
  for (let start = 0; start + 13 * n < rom.length; start++) {
    let ok = true;
    for (let k = 0; k < n && ok; k++) { const at = start + k * 13; if (rom.subarray(at, at + 13).indexOf(0xff) < 1) ok = false; }
    if (ok && T.decode(start + probe * 13, 13) && T.decode(start, 13) === T.decode(start + 13, 13)) return start;
  }
  throw new Error('Trainerklassen nicht gefunden');
})();
const mapsecTable = (() => {
  for (const name of ['ALABASTIA', 'PALLET TOWN']) for (const at of T.findAll(name)) for (const p of T.pointersTo(at)) {
    if (T.ptr(p + 4) > 0 && /CITY|STADT/i.test(T.decode(T.ptr(p + 4), 30))) return p;
  }
  throw new Error('Ortsnamen nicht gefunden');
})();
const MAPSEC_LIST = json('src/data/region_map/region_map_sections.json').map_sections;
const MAPSEC_INDEX = new Map(MAPSEC_LIST.map((s, i) => [s.id, i]));
const KANTO_START = MAPSEC_INDEX.get('MAPSEC_PALLET_TOWN');
const ITEM_JSON = json('src/data/items.json').items;
const MOVE_EN = [];
for (const m of read('src/data/text/move_names.h').matchAll(/\[(MOVE_\w+)\]\s*=\s*_\("([^"]*)"\)/g)) MOVE_EN[MOVES.get(m[1])] = m[2];
const CLASS_EN = [];
for (const m of read('src/data/text/trainer_class_names.h').matchAll(/\[(TRAINER_CLASS_\w+)\]\s*=\s*_\("([^"]*)"\)/g)) CLASS_EN[CLASSES.get(m[1])] = m[2].replace('{PKMN}', 'PKMN');
const TXT = {
  item: id => ({ de: nice(T.decode(itemTable + id * 44, 14)), en: nice(ITEM_JSON[id]?.english || '') }),
  move: id => ({ de: nice(T.decode(moveTable + id * 13, 13)), en: nice(MOVE_EN[id] || '') }),
  cls: id => ({ de: nice(T.decode(classTable + id * 13, 13)), en: nice(CLASS_EN[id] || '') }),
  trainer: id => nice(T.decode(trainerTable + id * 40 + 4, 12)),
  mapsec: key => {
    const i = MAPSEC_INDEX.get(key), en = nice(MAPSEC_LIST[i]?.name || key.replace(/^MAPSEC_/, '').replace(/_/g, ' '));
    const p = i >= KANTO_START ? T.ptr(mapsecTable + (i - KANTO_START) * 4) : -1;
    return { de: p > 0 ? nice(T.decode(p, 40)) : en, en };
  },
};
const itemSlug = en => en.toLowerCase().replace(/é/g, 'e').replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// TMs/VMs: Attacke und ihr Typ (für das Symbol)
const TM_MOVES = [...read('src/data/party_menu.h').split('sTMHMMoves[] =')[1].split('};')[0].matchAll(/(MOVE_\w+)/g)].map(m => MOVES.get(m[1]));
const MOVE_TYPE = [];
for (const m of read('src/data/battle_moves.h').matchAll(/\[(MOVE_\w+)\]\s*=\s*\{[\s\S]*?\.type\s*=\s*TYPE_(\w+)/g)) MOVE_TYPE[MOVES.get(m[1])] = m[2].toLowerCase();
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
const RIVAL_CLASSES = new Set(['TRAINER_CLASS_RIVAL_EARLY', 'TRAINER_CLASS_RIVAL_LATE', 'TRAINER_CLASS_CHAMPION']);
function trainerInfo(key) {
  const id = TRAINERS.get(key), row = trainerRows[id];
  if (id == null || !row || !row.party) return null;
  const rival = RIVAL_CLASSES.has(row.cls), cls = TXT.cls(CLASSES.get(row.cls));
  // Den Namen des Rivalen wählt der Spieler – nur die Klasse zeigen. Zweite Teams (Top Vier, Champ) sind Revanchen
  const nameDe = rival ? '' : TXT.trainer(id) || nice(row.name), nameEn = rival ? '' : nice(row.name);
  const again = /_2$|_REMATCH_/.test(key);
  return {
    id: key, cls: rival ? 'RIVAL' : row.cls.replace(/^TRAINER_CLASS_/, ''),
    de: `${cls.de} ${nameDe}`.trim() + (again ? ' (Revanche)' : ''), en: `${cls.en} ${nameEn}`.trim() + (again ? ' (rematch)' : ''), double: row.double,
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
for (const [name, a] of Object.entries(render.aliases || {})) {
  const base = WORLD.get(a.as);
  WORLD.set(name, { ...base, name, x: base.x + a.dx, z: base.z + a.dz, alias: true });
}
const outside = m => WORLD.has(m.name);
const worldPos = (m, x, y) => { const w = WORLD.get(m.name); return [w.x + x, w.z + y]; };
const mapKey = m => m.id.replace(/^MAP_/, '');
// Ereignis-Karten (Nabelfelsen, Geburtsinsel) und Verbindungsräume gibt es nur mit Sonderticket bzw. Kabel
const SKIP_SEC = new Set(['MAPSEC_SPECIAL_AREA', 'MAPSEC_NAVEL_ROCK', 'MAPSEC_BIRTH_ISLAND']);
const unused = m => /Unused|Prototype|_Connection$/.test(m.name) || SKIP_SEC.has(m.region_map_section) || m.group === 'gMapGroup_Link';

// ── Skripte: Blöcke je Sprungmarke, je Edition (.ifdef FIRERED / LEAFGREEN) ──
const VERSIONS = { firered: 'FIRERED', leafgreen: 'LEAFGREEN' };
const scriptFiles = [
  ...[...MAPS.keys()].map(n => path.join(ROOT, 'data/maps', n, 'scripts.inc')),
  ...fs.readdirSync(path.join(ROOT, 'data/scripts')).filter(f => f.endsWith('.inc')).map(f => path.join(ROOT, 'data/scripts', f)),
].filter(f => fs.existsSync(f));
function labelIndex(define) {
  const labels = new Map();
  for (const file of scriptFiles) {
    let cur = null, prev = null;
    const stack = [];
    const on = () => stack.every(Boolean);
    for (let line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      line = line.replace(/@.*$/, '').trim();
      let m;
      if ((m = /^\.ifdef\s+(\w+)/.exec(line))) { stack.push(m[1] === define); continue; }
      if ((m = /^\.ifndef\s+(\w+)/.exec(line))) { stack.push(m[1] !== define); continue; }
      if (line === '.else') { stack[stack.length - 1] = !stack[stack.length - 1]; continue; }
      if (line === '.endif') { stack.pop(); continue; }
      if (!on() || !line) continue;
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
const LABELS = Object.fromEntries(Object.entries(VERSIONS).map(([v, d]) => [v, labelIndex(d)]));
// „givemon VAR_TEMP_1": Art aus „case SPECIES_X, <Marke>" bzw. „setvar VAR_TEMP_1, SPECIES_X" derselben Karte
const caseTargets = labels => {
  const out = new Map();
  for (const l of labels.values()) for (const line of l.lines) {
    const m = /^case\s+(SPECIES_\w+),\s*(\w+)/.exec(line);
    if (m) out.set(m[2], m[1]);
  }
  return out;
};
const CASES = Object.fromEntries(Object.entries(LABELS).map(([v, l]) => [v, caseTargets(l)]));
const prefixOf = label => { const i = label.indexOf('_EventScript_'); return i > 0 ? label.slice(0, i + 1) : null; };
// Arten, die eine Karte in einer Edition per „setvar VAR_TEMP_1, SPECIES_X" auswählen kann (Spielhalle: je Edition andere Preise)
const settable = (ver, prefix) => {
  const out = new Set();
  for (const l of LABELS[ver].values()) if (prefix && l.name.startsWith(prefix)) for (const x of l.lines) {
    const s = /^setvar\s+VAR_TEMP_1,\s*(SPECIES_\w+)/.exec(x);
    if (s) out.add(s[1]);
  }
  return out;
};
function scriptEffects(ver, start, seen = new Set()) {
  const labels = LABELS[ver], prefix = prefixOf(start);
  const out = { found: [], gifts: [], battles: [], statics: [], mons: [] };
  const todo = [start];
  while (todo.length) {
    const name = todo.pop();
    const l = labels.get(name);
    if (!l || seen.has(name)) continue;
    // Nur Marken derselben Karte folgen – allgemeine Skripte (Pokémon-Center, Items …) haben eigene Einträge
    if (name !== start && (!prefix || !name.startsWith(prefix))) continue;
    seen.add(name);
    const last = l.lines[l.lines.length - 1] || '';
    if (l.next && !/^(end|return|goto\s|releaseall$|step_end)/.test(last)) todo.push(l.next);
    for (const line of l.lines) {
      for (const ref of line.matchAll(/\b([A-Z]\w*_EventScript_\w+)\b/g)) if (labels.has(ref[1])) todo.push(ref[1]);
      let m;
      if ((m = /^finditem\s+(ITEM_\w+)(?:,\s*(\d+))?/.exec(line))) out.found.push({ item: m[1], qty: +(m[2] || 1) });
      else if ((m = /^giveitem\s+(ITEM_\w+)(?:,\s*(\d+))?/.exec(line)) || (m = /^additem\s+(ITEM_\w+)(?:,\s*(\d+))?/.exec(line))) out.gifts.push({ item: m[1], qty: +(m[2] || 1) });
      else if ((m = /^giveitem_msg\s+\w+,\s*(ITEM_\w+)(?:,\s*(\d+))?/.exec(line))) out.gifts.push({ item: m[1], qty: +(m[2] || 1) });
      else if ((m = /^trainerbattle_(?!rematch)\w*\s+(TRAINER_\w+)(?:,\s*(TRAINER_\w+))?/.exec(line))) out.battles.push(...[m[1], m[2]].filter(Boolean));
      else if ((m = /^setwildbattle\s+(SPECIES_\w+),\s*(\d+)/.exec(line))) out.statics.push({ species: m[1], lv: +m[2] });
      else if ((m = /^givemon\s+(SPECIES_\w+),\s*(\d+)/.exec(line))) out.mons.push({ species: m[1], lv: +m[2] });
      else if ((m = /^givemon\s+VAR_TEMP_1,\s*(\d+)/.exec(line))) {
        const sp = CASES[ver].get(name), can = settable(ver, prefix);
        if (sp && (!can.size || can.has(sp))) out.mons.push({ species: sp, lv: +m[1] });
        else if (sp) continue;
        else for (const ll of labels.values()) if (prefix && ll.name.startsWith(prefix)) for (const x of ll.lines) {
          const s = /^setvar\s+VAR_TEMP_1,\s*(SPECIES_\w+)/.exec(x);
          if (s && !out.mons.some(o => o.species === s[1])) out.mons.push({ species: s[1], lv: +m[1] });
        }
      } else if ((m = /^giveegg\s+(SPECIES_\w+)/.exec(line))) out.mons.push({ species: m[1], lv: 1, egg: true });
    }
  }
  return out;
}

// ── Wilde Pokémon ────────────────────────────────────────────────────────────
const WILD = new Map();   // MAP_… → { firered, leafgreen }
const RATE = { land: [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1], water: [60, 30, 5, 4, 1], rock: [60, 30, 5, 4, 1], fish: [70, 30, 60, 20, 20, 40, 40, 15, 4, 1] };
function table(mons, rates, from = 0, to = mons.length) {
  const byId = new Map();
  for (let i = from; i < to; i++) {
    const s = mons[i], id = dexOf(s.species);
    if (!id) continue;
    const o = byId.get(id) || { ...mon(id), p: 0, min: s.min_level, max: s.max_level };
    o.p += rates[i]; o.min = Math.min(o.min, s.min_level); o.max = Math.max(o.max, s.max_level);
    byId.set(id, o);
  }
  return [...byId.values()].sort((a, b) => b.p - a.p || a.id - b.id);
}
for (const e of json('src/data/wild_encounters.json').wild_encounter_groups[0].encounters) {
  const ver = /_FireRed$/.test(e.base_label) ? 'firered' : /_LeafGreen$/.test(e.base_label) ? 'leafgreen' : null;
  if (!ver) continue;
  const w = {};
  if (e.land_mons) w.grass = table(e.land_mons.mons, RATE.land);
  if (e.water_mons) w.surf = table(e.water_mons.mons, RATE.water);
  if (e.rock_smash_mons) w.rockSmash = table(e.rock_smash_mons.mons, RATE.rock);
  if (e.fishing_mons) {
    w.oldRod = table(e.fishing_mons.mons, RATE.fish, 0, 2);
    w.goodRod = table(e.fishing_mons.mons, RATE.fish, 2, 5);
    w.superRod = table(e.fishing_mons.mons, RATE.fish, 5, 10);
  }
  if (!WILD.has(e.map)) WILD.set(e.map, {});
  WILD.get(e.map)[ver] = w;
}

// ── Raumnamen (Innenkarten) ──────────────────────────────────────────────────
const ROOM = {
  PlayersHouse: ['Haus des Spielers', "Player's House"], RivalsHouse: ['Haus des Rivalen', "Rival's House"], ProfessorOaksLab: ['Eichs Labor', "Oak's Lab"],
  PokemonCenter: ['Pokémon-Center', 'Pokémon Center'], Mart: ['Pokémon-Markt', 'Poké Mart'], Gym: ['Arena', 'Gym'], House: ['Haus', 'House'],
  School: ['Schule', 'School'], Museum: ['Museum', 'Museum'], BikeShop: ['Fahrradladen', 'Bike Shop'], VolunteerPokemonHouse: ['Pokémon-Heim', 'Volunteer Pokémon House'],
  PokemonFanClub: ['Pokémon-Fanclub', 'Pokémon Fan Club'], PokemonTrainerFanClub: ['Trainer-Fanclub', 'Trainer Fan Club'], DepartmentStore: ['Kaufhaus', 'Department Store'],
  Elevator: ['Aufzug', 'Elevator'], Roof: ['Dach', 'Roof'], Condominiums: ['Wohnanlage', 'Condominiums'], RoofRoom: ['Dachzimmer', 'Roof Room'],
  GameCorner: ['Spielhalle', 'Game Corner'], JoyfulGameCorner: ['Spielhalle', 'Joyful Game Corner'], PrizeRoom: ['Preisausgabe', 'Prize Room'], Hotel: ['Hotel', 'Hotel'],
  Restaurant: ['Restaurant', 'Restaurant'], SafariZone: ['Safari-Zone', 'Safari Zone'], Office: ['Büro', 'Office'], WardensHouse: ['Haus des Wärters', "Warden's House"],
  PokemonLab: ['Pokémon-Labor', 'Pokémon Lab'], Lounge: ['Aufenthaltsraum', 'Lounge'], ResearchRoom: ['Forschungsraum', 'Research Room'],
  ExperimentRoom: ['Versuchsraum', 'Experiment Room'], CopycatsHouse: ['Haus des Imitators', "Copycat's House"], Dojo: ['Kampf-Dojo', 'Fighting Dojo'],
  MrPsychicsHouse: ['Haus von Mr. Psycho', "Mr. Psychic's House"], ViridianForest: ['Vertania-Wald', 'Viridian Forest'], EastBuilding: ['Ostgebäude', 'East Building'],
  PokemonDayCare: ['Pension', 'Day Care'], SouthEntrance: ['Südeingang', 'South Entrance'], NorthEntrance: ['Nordeingang', 'North Entrance'],
  EastEntrance: ['Osteingang', 'East Entrance'], WestEntrance: ['Westeingang', 'West Entrance'], FishingHouse: ['Haus des Angelgurus', 'Fishing House'],
  SeaCottage: ['Seehaus', 'Sea Cottage'], Harbor: ['Hafen', 'Harbor'], LoreleisHouse: ['Loreleis Haus', "Lorelei's House"], Corridor: ['Gang', 'Corridor'],
  Deck: ['Deck', 'Deck'], Kitchen: ['Küche', 'Kitchen'], CaptainsOffice: ['Kapitänskajüte', "Captain's Office"], Room: ['Raum', 'Room'],
  NorthSouthTunnel: ['Tunnel Nord–Süd', 'North–South Tunnel'], EastWestTunnel: ['Tunnel West–Ost', 'East–West Tunnel'], Center: ['Mitte', 'Center'],
  East: ['Ost', 'East'], North: ['Nord', 'North'], West: ['West', 'West'], RestHouse: ['Rasthaus', 'Rest House'], SecretHouse: ['Geheimes Haus', 'Secret House'],
  LoreleisRoom: ['Raum von Lorelei', "Lorelei's Room"], BrunosRoom: ['Raum von Bruno', "Bruno's Room"], AgathasRoom: ['Raum von Agathe', "Agatha's Room"],
  LancesRoom: ['Raum von Siegfried', "Lance's Room"], ChampionsRoom: ['Raum des Champs', "Champion's Room"], HallOfFame: ['Ruhmeshalle', 'Hall of Fame'],
  RubyPath: ['Rubinpfad', 'Ruby Path'], Exterior: ['Außen', 'Exterior'], SummitPath: ['Gipfelpfad', 'Summit Path'], Summit: ['Gipfel', 'Summit'],
  Stairs: ['Treppe', 'Stairs'], Entrance: ['Eingang', 'Entrance'], Back: ['hinten', 'Back'], SapphireRoom: ['Saphir-Raum', 'Sapphire Room'], Lobby: ['Lobby', 'Lobby'],
  DunsparceTunnel: ['Dummisel-Tunnel', 'Dunsparce Tunnel'], RocketWarehouse: ['Rocket-Lagerhaus', 'Rocket Warehouse'], EmberSpa: ['Glutbad', 'Ember Spa'],
};
const camel = s => s.replace(/([a-z])([A-Z0-9])/g, '$1 $2').replace(/([A-Z])([A-Z][a-z])/g, '$1 $2');
function roomNames(m) {
  const segs = m.name.split('_');
  const sec = camel(m.region_map_section.replace(/^MAPSEC_(KANTO_)?/, '').toLowerCase().replace(/_(\w)/g, (x, c) => c.toUpperCase()).replace(/^\w/, c => c.toUpperCase())).replace(/ /g, '');
  // Besitzer vorn weglassen (Stadt, Route, Höhle) – auch Außenkarten-Namen und den Namen des Abschnitts
  let i = 1;
  while (i < segs.length && (WORLD.has(segs.slice(0, i + 1).join('_')) || segs[i] === sec || segs[i].toLowerCase() === sec.toLowerCase())) i++;
  const rest = segs.slice(i);
  if (!rest.length) return { de: '', en: '' };
  const one = (seg, lang) => {
    if (ROOM[seg]) return ROOM[seg][lang];
    const num = /^([A-Za-z]+?)(\d+)$/.exec(seg);
    if (num && ROOM[num[1]]) return `${ROOM[num[1]][lang]} ${num[2]}`;
    if (/^B?\d+F$/.test(seg)) return seg;
    return camel(seg);
  };
  return { de: rest.map(s => one(s, 0)).join(' '), en: rest.map(s => one(s, 1)).join(' ') };
}

// ── Orte zusammensetzen ──────────────────────────────────────────────────────
const locs = new Map();
function locFor(m) {
  const sec = m.region_map_section, name = TXT.mapsec(sec);
  // Abschnitte mit gleichem Namen (Tunnelpfad 1/2, Trainerturm außen/innen) sind ein Ort
  const key = name.en.toLowerCase();
  if (!locs.has(key)) locs.set(key, { key: sec, de: name.de, en: name.en, rects: [], maps: [], interiors: [], items: [], trainers: [], special: [], wild: { firered: [], leafgreen: [] }, sevii: 0, kanto: 0, types: new Set() });
  return locs.get(key);
}
const VER_KEYS = Object.keys(VERSIONS);
let scriptLinks = 0;
for (const m of MAPS.values()) {
  if (unused(m) && !WORLD.has(m.name)) continue;
  if (SKIP_SEC.has(m.region_map_section)) continue;
  const loc = locFor(m), out = outside(m);
  loc.maps.push(m.name);
  if (/^(One|Two|Three|Four|Five|Six|Seven)Island/.test(m.name) || /Sevii|IndoorSevenIsland|IndoorOneIsland|IndoorTwoIsland|IndoorThreeIsland|IndoorFourIsland|IndoorFiveIsland|IndoorSixIsland/.test(m.group)) loc.sevii++;
  else loc.kanto++;
  if (out && !WORLD.get(m.name).alias) {
    const w = WORLD.get(m.name);
    loc.rects.push([w.x, w.z, w.x + w.width, w.z + w.height]);
    loc.types.add(m.map_type);
  }
  const room = out ? { de: '', en: '' } : roomNames(m);
  const where = out ? { area: '' } : { area: room.de, areaEn: room.en };
  if (!out) loc.interiors.push({ m, area: room.de, areaEn: room.en });
  const pos = o => (out ? { pos: [...worldPos(m, o.x, o.y), 0] } : { pos: [o.x, o.y, 0], map: mapKey(m) });
  const reached = Object.fromEntries(VER_KEYS.map(v => [v, new Set()]));
  const add = (start, at, ball) => {
    const fx = Object.fromEntries(VER_KEYS.map(v => [v, scriptEffects(v, start, reached[v])]));
    const a = fx.firered;
    if (a.found.length + a.gifts.length + a.battles.length + a.statics.length + a.mons.length) scriptLinks++;
    for (const g of a.found) loc.items.push({ ...itemInfo(ITEMS.get(g.item), ball ? 'ball' : 'gift', g.qty), ...where, ...at });
    for (const g of a.gifts) {
      const id = ITEMS.get(g.item);
      if (!id || loc.items.some(x => x.kind === 'gift' && x.en === TXT.item(id).en && (x.area || '') === (where.area || ''))) continue;
      loc.items.push({ ...itemInfo(id, ball ? 'ball' : 'gift', g.qty), ...where, ...at });
    }
    for (const key of a.battles) {
      const t = trainerInfo(key);
      if (t && !loc.trainers.some(x => x.id === key)) loc.trainers.push({ ...t, ...where, ...at });
    }
    // Pokémon: in beiden Editionen gleich → ohne Edition, sonst je Edition
    for (const kind of ['statics', 'mons']) {
      const sig = s => `${s.species}|${s.lv}|${!!s.egg}`;
      const both = fx.firered[kind].filter(s => fx.leafgreen[kind].some(o => sig(o) === sig(s)));
      for (const s of both) addSpecial(loc, kind === 'statics' ? 'static' : s.egg ? 'egg' : 'gift', s, where);
      for (const v of VER_KEYS) for (const s of fx[v][kind]) if (!both.some(o => sig(o) === sig(s))) addSpecial(loc, kind === 'statics' ? 'static' : s.egg ? 'egg' : 'gift', { ...s, ver: v }, where);
    }
  };
  for (const o of m.object_events || []) {
    if (o.type === 'clone' || !o.script || o.script === '0x0') continue;
    add(o.script, pos(o), o.graphics_id === 'OBJ_EVENT_GFX_ITEM_BALL');
  }
  for (const c of m.coord_events || []) if (c.script && c.script !== '0x0') add(c.script, pos(c), false);
  // Skripte der Karte, die keine Person und kein Auslöser startet (z. B. der Champ beim Betreten des Raums): ohne Stelle
  const own = path.join(ROOT, 'data/maps', m.name, 'scripts.inc');
  for (const l of LABELS.firered.values()) if (l.file === own && !reached.firered.has(l.name) && l.name.startsWith(m.name + '_EventScript_')) add(l.name, { pos: null }, false);
  for (const b of m.bg_events || []) {
    if (b.type !== 'hidden_item') continue;
    const id = ITEMS.get(b.item);
    if (id) loc.items.push({ ...itemInfo(id, 'hidden', +b.quantity || 1), ...where, ...pos(b) });
  }
  const w = WILD.get(m.id);
  if (w) for (const v of VER_KEYS) if (w[v] && Object.keys(w[v]).length) loc.wild[v].push({ area: where.area, ...(where.areaEn ? { areaEn: where.areaEn } : {}), ...w[v], _map: out ? null : mapKey(m) });
}
function addSpecial(loc, kind, s, where) {
  const id = dexOf(s.species);
  if (!id || loc.special.some(x => x.id === id && x.kind === kind && x.ver === s.ver && x.lv === s.lv)) return;
  loc.special.push({ kind, ...mon(id), lv: s.lv, area: where.area || '', ...(s.ver ? { ver: s.ver } : {}) });
}

// ── Orte, Marker, Innenkarten ────────────────────────────────────────────────
const kept = [...locs.values()].filter(l => l.rects.length || l.items.length || l.trainers.length || l.special.length || l.wild.firered.length || l.wild.leafgreen.length || l.maps.some(n => !outside(MAPS.get(n))));
for (const l of kept) {
  l.region = l.sevii > l.kanto ? 'sevii' : 'kanto';
  const town = l.types.has('MAP_TYPE_CITY') || l.types.has('MAP_TYPE_TOWN');
  l.type = /^Route \d+$/.test(l.en) ? 'route' : town && / City$/.test(l.en) ? 'city' : town && l.en !== 'Indigo Plateau' ? 'town' : 'place';
}
const TYPE_ORDER = { city: 0, town: 0, route: 1, place: 2 };
kept.sort((a, b) => (a.region === 'kanto' ? 0 : 1) - (b.region === 'kanto' ? 0 : 1) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.en.localeCompare(b.en, 'en', { numeric: true }));
const index = new Map(kept.map((l, i) => [l, i]));
const liOfMap = m => (m && !SKIP_SEC.has(m.region_map_section) ? index.get(locs.get(TXT.mapsec(m.region_map_section).en.toLowerCase())) ?? -1 : -1);

// Innenkarten: Karten eines Ortes außerhalb der Oberwelt mit Markern oder wilden Pokémon
const maps = {}, areaEn = {};
for (const l of kept) for (const it of l.interiors) {
  const key = mapKey(it.m);
  const markers = [];
  l.items.forEach((x, i) => { if (x.map === key) markers.push({ k: x.tm ? 'tm' : x.kind === 'hidden' ? 'hidden' : x.kind === 'gift' ? 'gift' : 'item', x: x.pos[0], z: x.pos[1], y: 0, i }); });
  l.trainers.forEach((x, i) => { if (x.map === key) markers.push({ k: 'trainer', x: x.pos[0], z: x.pos[1], y: 0, i }); });
  const wild = l.wild.firered.some(w => w._map === key) || l.wild.leafgreen.some(w => w._map === key);
  if (!markers.length && !wild) continue;
  maps[key] = { l: index.get(l), area: it.area, matrix: it.m.layout, areaData: 0, markers, warps: it.m.warp_events || [] };
  if (it.area && it.areaEn && it.areaEn !== it.area) areaEn[it.area] = it.areaEn;
}
for (const l of kept) for (const x of [...l.wild.firered, ...l.wild.leafgreen]) {
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

// Orte ohne eigene Außenkarte, die man durch ein Gebäude eines anderen Ortes betritt (Vertania-Wald hinter den
// Torhäusern von Route 2, Safari-Zone, Rocket-Versteck unter der Spielhalle, Pokémon-Liga): die Tür dieses Gebäudes
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
    const big = l.rects.slice().sort((a, b) => (b[2] - b[0]) * (b[3] - b[1]) - (a[2] - a[0]) * (a[3] - a[1]))[0];
    out.label = [Math.round((big[0] + big[2]) / 2), Math.round((big[1] + big[3]) / 2)];
  }
  const ents = l.rects.length ? [] : entrances.get(li) || [];
  if (ents.length) out.entrances = [...ents];
  // Nur ein Raum mit Inhalt: kein eigener Raumname nötig – außer er hat eine eigene Innenkarte
  const all = [...l.items, ...l.trainers, ...l.special, ...l.wild.firered, ...l.wild.leafgreen];
  if (!l.rects.length && new Set(all.map(x => x.area || '')).size === 1 && !Object.values(maps).some(mm => mm.l === li && mm.area)) for (const x of all) x.area = '';
  for (const x of [...l.items, ...l.trainers]) { delete x.areaEn; if (!x.pos) x.pos = null; }
  for (const x of [...l.wild.firered, ...l.wild.leafgreen]) delete x._map;
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

const data = {
  version: 3, game: 'frlg', source: 'pret/pokefirered + deutsche ROM (' + romCode + ')',
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
console.log(`  ${Math.round(JSON.stringify(data).length / 1024)} KB`);
