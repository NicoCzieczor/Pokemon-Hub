#!/usr/bin/env node
/*
 * Baut Karte/hgss.json für HeartGold/SoulSilver aus einem lokalen pret/pokeheartgold-Checkout,
 * dem render.json von render-hgss.js und (für die deutschen Namen) einer deutschen HG/SS-ROM.
 *
 * Orte = Kartenabschnitte (MAPSEC): Städte und Routen mit ihren Feldern der Weltmatrix, Höhlen/Türme/Gebäude
 * mit eigenem Abschnitt als Orte mit Eingängen. Innenräume (Häuser, Arenen, Etagen) gehören zu ihrem Abschnitt
 * und tragen ihren Raumnamen; ihre Tür auf der Oberwelt steht in „door".
 *
 * Wilde Pokémon je Karte mit allen Arten des Spiels (encounter_check.c):
 *   Gras morgens/tags/nachts 20/20/10/10/10/10/5/5/4/4/1/1 %, Surfen 60/30/5/4/1 %,
 *   Angeln (alle Ruten) 40/30/15/10/5 %, Zertrümmerer 80/20 %, Kopfnuss 50/15/15/10/5/5 %,
 *   Schwärme (20 feste Karten, unk_02097F6C.c), Hoenn-/Sinnoh-Klang im Radio (Grasplätze 2–5),
 *   nachts beim Angeln (Profiangel Platz 3, Superangel Platz 1).
 * Dazu Item-Bälle (scr_seq_0141, mit Menge), versteckte Items (hidden_items.h), Geschenke aus den Skripten,
 * Trainer mit Team (trainers.json) und feste Begegnungen (WildBattle) bzw. geschenkte Pokémon.
 *
 * Aufruf: node build-hgss.js <pokeheartgold> <render.json> <deutsche-hgss.nds> [ausgabe.json]
 * Der Checkout braucht include/, src/data/, files/fielddata/, files/poketool/, files/msgdata/, files/arc/headbutt.json,
 * tools/msgenc/charmap.txt sowie die Quellen src/item.c und src/unk_02097F6C.c.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { openRom, textBanks } = require('./nds-text.js');

const ROOT = path.resolve(process.argv[2] || '');
const RENDER_FILE = path.resolve(process.argv[3] || '');
const ROM_FILE = process.argv[4] ? path.resolve(process.argv[4]) : '';
const OUT = path.resolve(process.argv[5] || path.join(__dirname, '..', 'hgss.json'));
if (!fs.existsSync(path.join(ROOT, 'src', 'data', 'map_headers.h')) || !fs.existsSync(RENDER_FILE) || !fs.existsSync(ROM_FILE)) {
  console.error('Aufruf: node build-hgss.js <pokeheartgold> <render.json> <deutsche-hgss.nds> [ausgabe.json]');
  process.exit(1);
}

const read = (...p) => fs.readFileSync(path.join(ROOT, ...p), 'utf8');
const json = (...p) => JSON.parse(read(...p));
const titleCase = s => String(s || '').toLowerCase().split('_').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
const slugify = s => s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function constants(file, prefix) {
  const out = new Map();
  for (const m of read(file).matchAll(new RegExp('^#define\\s+(' + prefix + '\\w+)\\s+(\\d+)', 'gm'))) out.set(m[1], +m[2]);
  return out;
}
const MAPS = constants('include/constants/maps.h', 'MAP_');
const MAPSECS = constants('include/constants/map_sections.h', 'MAPSEC_');
const SPECIES = constants('include/constants/species.h', 'SPECIES_');
const ITEMS = constants('include/constants/items.h', 'ITEM_');
const MOVES = constants('include/constants/moves.h', 'MOVE_');
const TRAINERS = constants('include/constants/trainers.h', 'TRAINER_');
const CLASSES = constants('include/constants/trainer_class.h', 'TRAINERCLASS_');
const STD = constants('include/constants/std_script.h', 'std_');

// ── Texte: Englisch aus pret, Deutsch aus der ROM ────────────────────────────
const enBank = n => {
  const file = fs.readdirSync(path.join(ROOT, 'files/msgdata/msg')).find(f => f.startsWith('msg_' + String(n).padStart(4, '0')));
  return json('files/msgdata/msg', file).messages.map(m => (Array.isArray(m.en_US) ? m.en_US.join('') : m.en_US || '').replace(/\{[^}]*\}/g, ''));
};
const rom = openRom(ROM_FILE);
if (!/^IP[KG]D$/.test(rom.code)) console.warn(`Achtung: ${rom.code} ist keine deutsche HG/SS-ROM (IPKD/IPGD).`);
const deBank = textBanks(rom, 'a/0/2/7', path.join(ROOT, 'tools/msgenc/charmap.txt'));
const TXT = {
  mapsec: { de: deBank(279), en: enBank(279) },
  item: { de: deBank(222), en: enBank(222) },
  cls: { de: deBank(730), en: enBank(730) },
  trainer: { de: deBank(729) },
  move: { de: deBank(750), en: enBank(750) },
};
const tidy = s => String(s || '').replace(/\s+/g, ' ').trim();
// Ortsnamen schreiben Pokémon-Namen im Spiel groß („DIGDAs Höhle", „FLEGMON-Brunnen") – wie im Hub üblich normal schreiben
const unshout = s => s.replace(/([A-ZÄÖÜ])([A-ZÄÖÜ]{2,})/g, (m, a, b) => a + b.toLowerCase());
// Englische Itemnamen der Spiele sind teils großgeschrieben (z. B. „TM01"); PokeAPI-Slugs fürs Symbol
const itemSlug = en => en.toLowerCase().replace(/é/g, 'e').replace(/['’.]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// ── Karten, Matrix, Ereignisse ───────────────────────────────────────────────
const headers = new Map();
for (const m of read('src/data/map_headers.h').matchAll(/\[(MAP_\w+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g)) {
  const f = {};
  for (const x of m[2].matchAll(/\.(\w+)\s*=\s*([^,\n]+),/g)) f[x[1]] = x[2].trim();
  headers.set(m[1], {
    key: m[1], id: MAPS.get(m[1]), mapsec: f.mapsec, type: f.mapType, region: f.regionNo,
    wild: f.wildEncounterBank.replace(/^ENCDATA_/, ''), matrix: f.matrixId, areaData: f.areaDataBank,
    events: f.eventsBank.replace(/^NARC_zone_event_/, '').replace(/_bin$/, ''),
    scripts: f.scriptsBank.replace(/_bin$/, ''),
  });
}
const headerById = new Map([...headers.values()].map(h => [h.id, h]));
const OVERWORLD_MATRIX = 'NARC_map_matrix_map_matrix_0000_EVERYWHERE_bin';

function readMatrix() {
  const buf = fs.readFileSync(path.join(ROOT, 'files/fielddata/mapmatrix/map_matrix/map_matrix_0000_EVERYWHERE.bin'));
  const width = buf[0], height = buf[1], nameLen = buf[4];
  const cells = [];
  for (let z = 0; z < height; z++) for (let x = 0; x < width; x++) cells.push({ x, z, id: buf.readUInt16LE(5 + nameLen + 2 * (z * width + x)) });
  return cells;
}
const render = JSON.parse(fs.readFileSync(RENDER_FILE, 'utf8'));
const ORIGIN = render.origin || [0, 0];
const rel = (x, z) => [x - ORIGIN[0], z - ORIGIN[1]];

const eventCache = new Map();
function events(h) {
  if (eventCache.has(h.key)) return eventCache.get(h.key);
  const file = path.join(ROOT, 'files/fielddata/eventdata/zone_event', h.events + '.json');
  const e = h.events && h.events !== '000_DUMMY' && fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : { objects: [], bgs: [], warps: [], coords: [] };
  eventCache.set(h.key, e);
  return e;
}

// ── Skripte: Blöcke je Sprungmarke, Verweise folgen ─────────────────────────
const scriptCache = new Map();
function scriptFile(bank) {
  if (scriptCache.has(bank)) return scriptCache.get(bank);
  const file = path.join(ROOT, 'files/fielddata/script/scr_seq', bank + '.s');
  const labels = new Map();
  if (fs.existsSync(file)) {
    let cur = null;
    for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
      const lab = /^(\w+):\s*$/.exec(line);
      if (lab) { cur = lab[1]; labels.set(cur, []); continue; }
      if (cur && line.trim()) labels.get(cur).push(line.trim());
    }
  }
  const res = { labels, order: [...labels.keys()] };
  scriptCache.set(bank, res);
  return res;
}
// Alles, was ein Skript ab einer Marke tut (samt angesprungener Marken derselben Datei)
function scriptEffects(file, start) {
  const out = { gifts: [], battles: [], statics: [], mons: [] };
  const seen = new Set();
  const todo = [start];
  while (todo.length) {
    const label = todo.pop();
    if (seen.has(label) || !file.labels.has(label)) continue;
    seen.add(label);
    const lines = file.labels.get(label);
    // Durchfallen in die nächste Marke, wenn der Block nicht mit End/GoTo endet
    const last = lines[lines.length - 1] || '';
    if (!/^(End|GoTo\s|ReleaseAll$)/.test(last)) {
      const i = file.order.indexOf(label);
      if (i >= 0 && file.order[i + 1]) todo.push(file.order[i + 1]);
    }
    let pendingItem = null;
    for (let i = 0; i < lines.length; i++) {
      const l = lines[i];
      for (const ref of l.matchAll(/\b(_[0-9A-F]{4}|scr_seq_\w+)\b/g)) if (file.labels.has(ref[1])) todo.push(ref[1]);
      let m;
      if ((m = /^GiveItemNoCheck\s+(ITEM_\w+),\s*(\d+)/.exec(l)) || (m = /^GiveItem\s+(ITEM_\w+),\s*(\d+)/.exec(l))) out.gifts.push({ item: m[1], qty: +m[2] });
      else if ((m = /^GoToIfNoItemSpace\s+(ITEM_\w+),\s*(\d+)/.exec(l))) pendingItem = { item: m[1], qty: +m[2] };
      else if ((m = /^SetVar\s+VAR_SPECIAL_x8004,\s*(ITEM_\w+)/.exec(l))) {
        const q = /^SetVar\s+VAR_SPECIAL_x8005,\s*(\d+)/.exec(lines[i + 1] || '');
        pendingItem = { item: m[1], qty: q ? +q[1] : 1 };
      } else if (/^CallStd\s+std_(give|obtain)_item/.test(l) && pendingItem) { out.gifts.push(pendingItem); pendingItem = null; }
      else if ((m = /^TrainerBattle\s+(TRAINER_\w+)/.exec(l))) out.battles.push(m[1]);
      else if ((m = /^MultiBattle\s+(TRAINER_\w+),\s*(TRAINER_\w+),\s*(TRAINER_\w+)/.exec(l))) out.battles.push(...[m[1], m[2], m[3]].filter(t => !/PARTNER/.test(t)));
      else if ((m = /^(?:WildBattle|RocketTrapBattle)\s+(SPECIES_\w+),\s*(\d+)/.exec(l))) out.statics.push({ species: m[1], lv: +m[2] });
      else if ((m = /^WildBattle\s+(VAR_\w+|SPECIES_\w+),\s*(VAR_\w+|\d+)/.exec(l))) out.statics.push(...versionStatics(file, m[1], m[2]));
      else if ((m = /^GiveMon\s+(SPECIES_\w+),\s*(\d+)/.exec(l))) out.mons.push({ species: m[1], lv: +m[2] });
      else if ((m = /^GiveEgg\s+(SPECIES_\w+)/.exec(l))) out.mons.push({ species: m[1], lv: 1, egg: true });
    }
  }
  return out;
}

// Ho-Oh, Lugia, Latios/Latias: Art und Level stehen in Variablen, gesetzt in einer Versionsweiche
// (GetGameVersion → Compare …, 7 → GoToIfNe: erst der HeartGold-Zweig, hinter der Marke der SoulSilver-Zweig)
function versionStatics(file, speciesArg, levelArg) {
  const values = arg => {
    if (!/^VAR_/.test(arg)) return [arg];
    const out = [];
    for (const lines of file.labels.values()) for (const l of lines) {
      const m = /^SetVar\s+(VAR_\w+),\s*(SPECIES_\w+|\d+)$/.exec(l);
      if (m && m[1] === arg) out.push(m[2]);
    }
    return out;
  };
  const sp = values(speciesArg), lv = values(levelArg);
  if (!sp.length || !lv.length) return [];
  const pickV = (list, i) => list[Math.min(i, list.length - 1)];
  return ['heartgold', 'soulsilver'].map((ver, i) => {
    const raw = pickV(sp, i);
    return { species: /^\d+$/.test(raw) ? speciesName(+raw) : raw, lv: +pickV(lv, i), ver };
  }).filter(x => x.species);
}
const speciesName = id => [...SPECIES].find(([, v]) => v === id)?.[0];

// Item-Bälle: Skript 7000+n → scr_seq_0141_n (Item, Menge); versteckte Items: 8000+n → sHiddenItemParam[n]
const ballScripts = scriptFile('scr_seq_0141');
function itemBall(n) {
  const lines = ballScripts.labels.get('scr_seq_0141_' + String(n).padStart(3, '0')) || [];
  const item = /SetVar VAR_SPECIAL_x8008,\s*(\d+)/.exec(lines.join('\n')), qty = /SetVar VAR_SPECIAL_x8009,\s*(\d+)/.exec(lines.join('\n'));
  return item ? { id: +item[1], qty: qty ? +qty[1] : 1 } : null;
}
// Das Spiel sucht den Eintrag über sein letztes Feld (index), nicht über die Position in der Tabelle (GetHiddenItemParams)
const hiddenTable = [];
for (const m of read('src/data/fieldmap/hidden_items.h').matchAll(/\{\s*(ITEM_\w+),\s*(\d+),\s*\d+,\s*\d+,\s*(\d+)\s*\}/g)) hiddenTable[+m[3]] = { id: ITEMS.get(m[1]), qty: +m[2] };
const TM_MOVES = [...read('src/item.c').split('sTMHMMoves[]')[1].split('};')[0].matchAll(/(MOVE_\w+)/g)].map(m => MOVES.get(m[1]));
const TYPES = (() => {
  // Attackentyp für die TM-Symbole: aus der Attackentabelle (files/poketool/waza/waza_tbl.json, falls vorhanden)
  const out = new Map();
  const file = path.join(ROOT, 'files/poketool/waza/waza_tbl.json');
  if (fs.existsSync(file)) for (const [i, w] of (JSON.parse(fs.readFileSync(file, 'utf8')).moves || []).entries()) out.set(i, String(w.type || '').replace(/^TYPE_/, '').toLowerCase());
  return out;
})();

function itemInfo(id, kind, qty) {
  const en = tidy(TXT.item.en[id]), de = tidy(TXT.item.de[id]) || en;
  const out = { kind, id: itemSlug(en), de, en, qty: qty || 1 };
  if (id >= ITEMS.get('ITEM_TM01') && id <= ITEMS.get('ITEM_HM08')) {
    const n = id - ITEMS.get('ITEM_TM01'), move = TM_MOVES[n];
    out.tm = true;
    out.move = { de: tidy(TXT.move.de[move]), en: tidy(TXT.move.en[move]) };
    if (TYPES.has(move)) out.move.type = TYPES.get(move);
  }
  return out;
}

// ── Trainer ──────────────────────────────────────────────────────────────────
const trainerRows = json('files/poketool/trainer/trainers.json').trainers;
function trainerInfo(key) {
  const id = TRAINERS.get(key), row = trainerRows[id];
  if (id == null || !row) return null;
  const cls = CLASSES.get(row.class);
  const nameEn = tidy(String(row.name || '').replace(/\{TRNAME\}/, '')), nameDe = tidy(TXT.trainer.de[id]) || nameEn;
  const clsEn = tidy(TXT.cls.en[cls]), clsDe = tidy(TXT.cls.de[cls]) || clsEn;
  return {
    key, cls: String(row.class).replace(/^TRAINERCLASS_/, ''),
    de: (clsDe + ' ' + nameDe).trim(), en: (clsEn + ' ' + nameEn).trim(),
    double: !!row.double,
    party: (row.party || []).map(p => {
      const mon = { id: SPECIES.get(p.species) || 0, lv: p.level };
      const item = p.item && p.item !== 'ITEM_NONE' ? ITEMS.get(p.item) : 0;
      if (item) mon.item = { de: tidy(TXT.item.de[item]), en: tidy(TXT.item.en[item]) };
      const moves = (p.moves || []).filter(x => x && x !== 'MOVE_NONE').map(x => MOVES.get(x));
      if (moves.length) mon.moves = moves.map(mv => ({ de: tidy(TXT.move.de[mv]), en: tidy(TXT.move.en[mv]) }));
      return mon;
    }).filter(m => m.id),
  };
}

// ── Wilde Pokémon ────────────────────────────────────────────────────────────
const encounters = new Map(json('files/fielddata/encountdata/gs_enc_data.json').encounters.map(e => [e.map, e]));
const headbutt = json('files/arc/headbutt.json').tables; // Index = Karten-Nr.
const swarmMaps = [...read('src/unk_02097F6C.c').split('sSwarmMapLUT')[1].split('};')[0].matchAll(/\{\s*(MAP_\w+),\s*(\d)\s*\}/g)].map(m => [m[1], +m[2]]);
const RATE = { land: [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1], surf: [60, 30, 5, 4, 1], fish: [40, 30, 15, 10, 5], rock: [80, 20], headbutt: [50, 15, 15, 10, 5, 5] };
const VERSIONS = { heartgold: ['HEARTGOLD', 'gold'], soulsilver: ['SOULSILVER', 'silver'] };
function pick(v, ver) {
  while (v && typeof v === 'object' && !Array.isArray(v)) {
    const k = VERSIONS[ver].find(x => Object.prototype.hasOwnProperty.call(v, x));
    if (!k) break;
    v = v[k];
  }
  return v;
}
const speciesOf = (v, ver) => { v = pick(v, ver); return typeof v === 'string' ? SPECIES.get(v) || 0 : 0; };
function table(slots, rates, ver, get) {
  const byId = new Map();
  (slots || []).forEach((s, i) => {
    const r = get(s, i);
    if (!r || !r.id) return;
    const o = byId.get(r.id) || { id: r.id, p: 0, min: r.min, max: r.max };
    o.p += rates[i] || 0; o.min = Math.min(o.min, r.min); o.max = Math.max(o.max, r.max);
    byId.set(r.id, o);
  });
  return [...byId.values()].sort((a, b) => b.p - a.p || a.id - b.id);
}
function levelRange(l, ver) {
  l = pick(l, ver);
  if (typeof l === 'number') return [l, l];
  return [+pick(l?.min, ver) || 0, +pick(l?.max, ver) || +pick(l?.min, ver) || 0];
}
function wildFor(h, ver) {
  const e = encounters.get(h.wild), out = {};
  if (e) {
    const land = e.land?.mons || [];
    if (land.length && e.land.rate) {
      for (const [time, key] of [['morning', 'morn'], ['day', 'day'], ['night', 'nite']]) {
        out[time] = table(land, RATE.land, ver, s => {
          let sp = pick(s.species, ver);
          if (sp && typeof sp === 'object') sp = pick(sp[key], ver);
          const [min, max] = levelRange(s.level, ver);
          return { id: typeof sp === 'string' ? SPECIES.get(sp) || 0 : 0, min, max };
        });
      }
      const radio = k => [...new Set((e[k] || []).map(s => speciesOf(s, ver)).filter(Boolean))];
      if (radio('hoenn').length) out.hoenn = radio('hoenn');
      if (radio('sinnoh').length) out.sinnoh = radio('sinnoh');
    }
    const water = (src, rates) => table(src?.mons, rates, ver, s => { const [min, max] = levelRange(s.level, ver); return { id: speciesOf(s.species, ver), min, max }; });
    if (e.surf?.rate) out.surf = water(e.surf, RATE.surf);
    if (e.rock_smash?.rate) out.rock = water(e.rock_smash, RATE.rock);
    for (const [k, src] of [['old', 'old_rod'], ['good', 'good_rod'], ['super', 'super_rod']]) if (e.fishing?.[src]?.rate) out[k] = water(e.fishing[src], RATE.fish);
    const nf = speciesOf(e.nightFish, ver);
    if (nf && (out.good || out.super)) out.nightFish = nf;
    const sw = swarmMaps.find(([m]) => m === h.key);
    if (sw) {
      const id = speciesOf([e.landSwarm, e.surfSwarm, e.fishSwarm][sw[1]], ver);
      if (id) out.swarm = { id, method: ['grass', 'surf', 'fish'][sw[1]] };
    }
  }
  const hb = headbutt[h.id];
  if (hb && hb.CommonMons?.length) {
    const tree = list => table(list, RATE.headbutt, ver, s => ({ id: speciesOf(s.species, ver), min: s.minLevel, max: s.maxLevel }));
    out.headbutt = tree(hb.CommonMons);
    if (hb.RareMons?.length) out.headbuttRare = tree(hb.RareMons);
    if (hb.SecretMons?.length) out.headbuttSecret = tree(hb.SecretMons);
  }
  return Object.keys(out).length ? out : null;
}

// ── Raumnamen (Innenkarten) ──────────────────────────────────────────────────
const WORD_DE = {
  POKECENTER: 'Pokémon-Center', POKEMART: 'Pokémon-Markt', GYM: 'Arena', HOUSE: 'Haus', GATEHOUSE: 'Torhaus', GATE: 'Tor',
  DEPARTMENT: 'Kaufhaus', STORE: '', ROOF: 'Dach', ELEVATOR: 'Aufzug', ROOM: 'Raum', ENTRANCE: 'Eingang', EXTERIOR: 'Außen',
  INTERIOR: 'Innen', NORTH: 'Nord', SOUTH: 'Süd', EAST: 'Ost', WEST: 'West', NORTHEAST: 'Nordost', NORTHWEST: 'Nordwest',
  SOUTHEAST: 'Südost', SOUTHWEST: 'Südwest', CENTRAL: 'Mitte', LAB: 'Labor', PLAYER: 'Spieler', RIVAL: 'Rivale', SIDE: 'Seite',
  GAME: 'Spielhalle', CORNER: '', PRIZE: 'Preisausgabe', MAGNET: 'Magnetbahnhof', TRAIN: '', STATION: '', TOWER: 'Turm',
  RADIO: 'Radio', BIKE: 'Fahrrad', SHOP: 'Laden', FLOWER: 'Blumen', CAFE: 'Café', RESTAURANT: 'Restaurant', HIDDEN: 'Versteckter',
  FIRST: 'Erster', SECOND: 'Zweiter', LOWER: 'Untere', UPPER: 'Obere', MOUNTAINSIDE: 'Berghang', SUMMIT: 'Gipfel', CHAMBER: 'Kammer',
  BACK: 'hinten', UNDERGROUND: 'Untergrund', HALL: 'Halle', PATH: 'Weg', BASEMENT: 'Keller', WAREHOUSE: 'Lager', TUNNEL: 'Tunnel',
  SHRINE: 'Schrein', CAVE: 'Höhle', LUGIA: 'Lugia', DAYCARE: 'Pension', MUSEUM: 'Museum', OF: '', SCIENCE: '', FARM: 'Hof', STABLE: 'Stall',
  OBSERVATION: 'Aussichts', DECK: 'deck', CONDOMINIUMS: 'Wohnanlage', LEFT: 'links', RIGHT: 'rechts', LIGHT: 'Leucht', LIGHTHOUSE: 'Leuchtturm',
  OLIVINE: '', DANCE: 'Tanz', THEATER: 'theater', SCHOOL: 'Schule', POKEMON: 'Pokémon', FAN: 'Fan', CLUB: 'club', TRAINER: 'Trainer',
  SQUARE: 'Platz', SHOP_: '', EVENT: 'Ereignis', CLEFAIRY: 'Piepi', BUG: 'Käfer', CATCHING: 'fang', CONTEST: 'wettbewerb',
};
const PHRASE_DE = [
  ['BIKE_SHOP', 'Fahrradladen'], ['FLOWER_SHOP', 'Blumenladen'], ['GAME_CORNER', 'Spielhalle'], ['DEPARTMENT_STORE', 'Kaufhaus'],
  ['MAGNET_TRAIN_STATION', 'Magnetbahnhof'], ['PRIZE_CORNER', 'Preisausgabe'], ['RADIO_TOWER', 'Radioturm'], ['POKEMON_FAN_CLUB', 'Pokémon-Fanclub'],
  ['DANCE_THEATER', 'Tanztheater'], ['OBSERVATION_DECK', 'Aussichtsdeck'], ['NAME_RATER_HOUSE', 'Haus des Namensbewerters'], ['NAME_RATER', 'Namensbewerter'],
  ['MR_POKEMON_HOUSE', 'Haus von Mr. Pokémon'], ['APRICORN_HOUSE', 'Aprikoko-Haus'], ['ELMS_LAB', 'Elms Labor'], ['OAKS_LAB', 'Eichs Labor'],
  ['PLAYER_HOUSE', 'Haus des Spielers'], ['RIVAL_HOUSE', 'Haus des Rivalen'], ['MUSEUM_OF_SCIENCE', 'Museum'], ['TRAINER_HOUSE', 'Trainerhaus'],
  ['FIGHTING_DOJO', 'Kampf-Dojo'], ['SILPH_CO', 'Silph Co.'], ['CHARCOAL_KILN', 'Köhlerei'], ['KURT_HOUSE', 'Kurts Haus'], ['POKEMON_SCHOOL', 'Pokémon-Schule'],
  ['MOOMOO_FARM', 'Kuhmuh-Farm'], ['SEA_COTTAGE', 'Seehaus'], ['HOUSE_OF_MEMORIES', 'Haus der Erinnerungen'], ['VOLUNTEER_POKEMON_HOUSE', 'Pokémon-Heim'],
  ['BUG_CATCHING_CONTEST', 'Käferturnier'], ['UNDERGROUND_PATH', 'Unterführung'], ['GLOBAL_TERMINAL', 'Global Terminal'], ['SAFARI_ZONE_WARDEN_HOUSE', 'Haus des Wärters'],
  ['HIDDEN_POWER_HOUSE', 'Kraftreserve-Haus'], ['FISHING_GURU_HOUSE', 'Haus des Angelgurus'], ['FISHING_BROTHER_HOUSE', 'Haus des Anglerbruders'], ['FISHING_DUDE_HOUSE', 'Haus des Anglers'],
  ['MOVE_TUTOR_HOUSE', 'Haus des Attacken-Lehrers'], ['BELL_TOWER_BARRIER_STATION', 'Glockenturm-Sperre'], ['DOWSING_MACHINE_HOUSE', 'Haus des Itemradars'],
  ['GYM_LEADER_ROOM', 'Arenaleiter-Raum'], ['GYM_ROOM', 'Arenaraum'], ['GYM_ENTRANCE', 'Arena-Eingang'], ['LUGIA_CAVE', 'Lugias Höhle'], ['ILEX_FOREST_GATEHOUSE', 'Torhaus Steineichenwald'],
];
PHRASE_DE.push(
  ['WILL_ROOM', 'Raum von Willi'], ['KOGA_ROOM', 'Raum von Koga'], ['BRUNO_ROOM', 'Raum von Bruno'], ['KAREN_ROOM', 'Raum von Melanie'],
  ['LANCE_ROOM', 'Raum von Siegfried'], ['HALL_OF_FAME', 'Ruhmeshalle'], ['ENTRANCE_WIFI_ROOM', 'Wi-Fi-Raum'], ['SILPH_CO_HQ', 'Silph Co.'],
  ['MR_PSYCHIC_HOUSE', 'Haus von Mr. Psycho'], ['COPYCAT_HOUSE', 'Haus des Imitators'], ['PHARMACY', 'Apotheke'], ['EXPERT_BELT_CHAMBER', 'Profigurt-Kammer'],
  ['MOLTRES_CHAMBER', 'Lavados-Kammer'], ['UPPER_MOUNTAINSIDE', 'Oberer Berghang'], ['LOWER_MOUNTAINSIDE', 'Unterer Berghang'], ['UNDERGROUND_HALL', 'Unterirdische Halle'],
  ['ENTRANCE_FIRST_ROOM', 'Eingang, Raum 1'], ['ENTRANCE_SECOND_ROOM', 'Eingang, Raum 2'], ['SQUARE_CLEFAIRY_EVENT', 'Platz (Piepi-Tanz)'],
  ['ROOF_ROOM', 'Dachzimmer'], ['LIGHT_ROOM', 'Leuchtraum'], ['ROUTE_31_SIDE', 'Seite Route 31'], ['ROUTE_45_SIDE', 'Seite Route 45'],
  ['SS_AQUA_PORT_EXTERIOR', 'Hafen'], ['SS_AQUA_PORT_INTERIOR', 'Hafengebäude'], ['CAPTAIN_ROOM', 'Kapitänskajüte'], ['RESEARCH_CENTER', 'Forschungszentrum'],
  ['GROUDON_ROOM', 'Groudons Raum'], ['KYOGRE_ROOM', 'Kyogres Raum'], ['RAYQUAZA_ROOM', 'Rayquazas Raum'], ['MYSTRI_STAGE', 'Mysteriöse Bühne'],
);
Object.assign(WORD_DE, { HEADQUARTERS: '', ROOMS: 'Räume', BROKEN: '(defekt)', REPAIRED: '(repariert)', SHRINE: 'Schrein', CABIN: 'Hütte' });
// Städtenamen als Präfix („GOLDENROD_", „CINNABAR_") – irgendwo im Kartennamen, z. B. SS_AQUA_OLIVINE_PORT
const TOWN_WORDS = new Set([...MAPSECS.keys()].filter(k => /_(CITY|TOWN|ISLAND)$/.test(k)).map(k => k.replace(/^MAPSEC_/, '').replace(/_(CITY|TOWN|ISLAND)$/, '')));
function roomNames(h) {
  const sec = h.mapsec.replace(/^MAPSEC_/, '').replace(/^MT_/, 'MOUNT_');
  let rest = h.key.replace(/^MAP_/, '');
  // Der Abschnittsname (auch mitten im Namen: GOLDENROD_RADIO_TOWER_1F) und gemeinsame Anfangswörter
  // (VICTORY_ROAD_1F im Abschnitt VICTORY_ROAD_JK) entfallen, dazu Stadtnamen
  const at = ('_' + rest + '_').indexOf('_' + sec + '_');
  if (at >= 0) rest = rest.slice(at + sec.length).replace(/^_/, '');
  else {
    const a = rest.split('_'), b = sec.split('_');
    let n = 0;
    while (n < a.length && n < b.length && a[n] === b[n]) n++;
    rest = a.slice(n).join('_');
  }
  rest = rest.split('_').filter(w => !TOWN_WORDS.has(w)).join('_');
  if (!rest) return { de: '', en: '' };
  const words = rest.split('_');
  const en = words.map(w => (/^B?\d+F$/.test(w) ? w : w[0] + w.slice(1).toLowerCase())).join(' ');
  // Feste Wendungen zuerst (Leerzeichen darin vorübergehend als geschütztes Leerzeichen), dann Wort für Wort
  let deKey = '_' + rest + '_';
  for (const [k, v] of PHRASE_DE) deKey = deKey.replace('_' + k + '_', '_' + v.replace(/ /g, '\u00a0') + '_');
  const de = deKey.split('_').filter(Boolean)
    .map(w => (/^B?\d+F$/.test(w) || /[a-zäöü\u00a0.]/.test(w) ? w.replace(/\u00a0/g, ' ') : WORD_DE[w] ?? (w[0] + w.slice(1).toLowerCase())))
    .filter(Boolean).join(' ').replace(/\s+/g, ' ');
  return { de: de || en, en };
}

// ── Orte zusammensetzen ──────────────────────────────────────────────────────
const SKIP_SEC = new Set(['MAPSEC_MYSTERY_ZONE', 'MAPSEC_JUBILIFE_CITY', 'MAPSEC_FIGHT_AREA', 'MAPSEC_POKEMON_LEAGUE_UNUSED']);
const cells = readMatrix();
const locs = new Map();
function locFor(mapsec) {
  if (!locs.has(mapsec)) {
    const id = MAPSECS.get(mapsec);
    const en = tidy(TXT.mapsec.en[id]) || titleCase(mapsec.replace(/^MAPSEC_/, ''));
    const de = unshout(tidy(TXT.mapsec.de[id])) || en;
    locs.set(mapsec, { key: mapsec, de, en, cells: [], maps: [], interiors: [], items: [], trainers: [], wild: { heartgold: [], soulsilver: [] }, regions: [], later: [] });
  }
  return locs.get(mapsec);
}
for (const c of cells) {
  const h = headerById.get(c.id);
  if (!h || c.id <= 1 || SKIP_SEC.has(h.mapsec)) continue;
  locFor(h.mapsec).cells.push(c);
}

// Türen: Warps auf der Oberwelt → Zielkarte; Innenkarten erben die Tür über ihre Warps (Breitensuche)
const door = new Map();
{
  let ring = [];
  for (const h of headers.values()) {
    if (h.matrix !== OVERWORLD_MATRIX) continue;
    for (const w of events(h).warps || []) {
      if (!headers.has(w.header) || door.has(w.header) || headers.get(w.header).matrix === OVERWORLD_MATRIX) continue;
      door.set(w.header, rel(w.x, w.z)); ring.push(w.header);
    }
  }
  while (ring.length) {
    const next = [];
    for (const key of ring) for (const w of events(headers.get(key)).warps || []) {
      if (!headers.has(w.header) || door.has(w.header) || headers.get(w.header).matrix === OVERWORLD_MATRIX) continue;
      door.set(w.header, door.get(key)); next.push(w.header);
    }
    ring = next;
  }
}
const onOverworld = h => h.matrix === OVERWORLD_MATRIX && cells.some(c => c.id === h.id);
// Ungenutzte Karten (u. a. die japanische Spielhalle mit Spielautomaten) gibt es in der deutschen Fassung nicht
const unused = h => /UNUSED|_JP$|_EMPTY$/.test(h.key);
// Eingänge eines Abschnitts ohne eigene Felder: alle Türen der Oberwelt in seine Karten (dicht beieinander = eine Tür)
const sectionDoors = new Map();
for (const h of headers.values()) {
  if (!onOverworld(h)) continue;
  for (const w of events(h).warps || []) {
    const t = headers.get(w.header);
    if (!t || t.mapsec === h.mapsec) continue;
    const list = sectionDoors.get(t.mapsec) || [];
    const at = rel(w.x, w.z);
    if (!list.some(e => Math.abs(e[0] - at[0]) <= 2 && Math.abs(e[1] - at[1]) <= 2)) list.push(at);
    sectionDoors.set(t.mapsec, list);
  }
}

// ── Namen der Pokémon (wie überall im Hub) und Attackentypen (für die TM-Symbole) ──
const POKEMON_NAMES = (() => {
  const sandbox = { window: {} };
  require('vm').runInNewContext(fs.readFileSync(path.join(__dirname, '..', '..', 'pokemon-names.js'), 'utf8'), sandbox);
  return sandbox.window.POKEMON_NAMES;
})();
const mon = id => ({ id, de: POKEMON_NAMES.de[id] || '#' + id, en: POKEMON_NAMES.en[id] || POKEMON_NAMES.de[id] || '#' + id });
const TYPE_NAMES = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', '', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];
const moveTypes = require('./nds-text.js').narc(fs.readFileSync(path.join(ROOT, 'files/poketool/waza/waza_tbl.narc'))).map(b => TYPE_NAMES[b[4]] || '');

const mapKey = h => h.key.replace(/^MAP_/, '');
const matrixFiles = fs.readdirSync(path.join(ROOT, 'files/fielddata/mapmatrix/map_matrix')).filter(f => f.endsWith('.bin'));
let scriptLinks = 0;
for (const h of headers.values()) {
  if (h.id <= 1 || SKIP_SEC.has(h.mapsec) || unused(h)) continue;
  const loc = locFor(h.mapsec);
  const outside = onOverworld(h);
  loc.regions.push([h.region === 'MAP_REGION_KANTO' ? 'kanto' : 'johto', outside ? 10 : 1]);
  const room = outside ? { de: '', en: '' } : roomNames(h);
  const where = outside ? { area: '' } : { area: room.de, areaEn: room.en };
  loc.maps.push(h.key);
  const ev = events(h);
  // Stelle: draußen Kachel der Weltkarte (x, z, Höhe y), drinnen Kachel der Innenkarte samt ihrem Schlüssel
  const pos = o => (outside ? { pos: [...rel(o.x, o.z), o.y || 0] } : { pos: [o.x, o.z, o.y || 0], map: mapKey(h) });
  const sFile = scriptFile(h.scripts);
  const usedLabels = new Set();
  if (!outside) loc.interiors.push({ h, area: room.de, areaEn: room.en, ev });

  for (const o of ev.objects || []) {
    const script = String(o.scriptId || '');
    let m;
    if ((m = /^(std_itemball_\w+)$/.exec(script)) && STD.has(m[1])) {
      const b = itemBall(STD.get(m[1]) - 7000);
      if (b) loc.items.push({ ...itemInfo(b.id, 'ball', b.qty), ...where, ...pos(o), _sid: m[1] });
      continue;
    }
    if ((m = /^std_trainer\((TRAINER_\w+)\)$/.exec(script))) {
      const t = trainerInfo(m[1]);
      if (t && !loc.trainers.some(x => x.id === t.key)) loc.trainers.push({ ...trainerOut(t), ...where, ...pos(o) });
      continue;
    }
    if ((m = /^_EV_(scr_seq_\w+)\s*\+\s*1$/.exec(script))) {
      usedLabels.add(m[1]);
      const fx = scriptEffects(sFile, m[1]);
      if (fx.gifts.length || fx.battles.length || fx.statics.length || fx.mons.length) scriptLinks++;
      addEffects(loc, fx, where, pos(o));
    }
  }
  for (const o of ev.bgs || []) {
    const script = String(o.scriptId || '');
    if (/^std_hiddenitem_\w+$/.test(script) && STD.has(script)) {
      const hi = hiddenTable[STD.get(script) - 8000];
      if (hi) loc.items.push({ ...itemInfo(hi.id, 'hidden', hi.qty), ...where, ...pos(o), _sid: script });
    }
  }
  // Skripte ohne Person (Auslöser, Szenen): erst am Ende und nur, was der Ort nicht schon über eine Person kennt
  for (const label of sFile.order) {
    if (!/^scr_seq_/.test(label) || usedLabels.has(label)) continue;
    loc.later.push([scriptEffects(sFile, label), where, { pos: null }]);
  }
  // Wilde Pokémon dieser Karte
  for (const ver of Object.keys(VERSIONS)) {
    const w = wildFor(h, ver);
    if (w) loc.wild[ver].push({ area: where.area, ...(where.areaEn ? { areaEn: where.areaEn } : {}), ...wildOut(w), _map: outside ? null : mapKey(h) });
  }
}
for (const loc of locs.values()) for (const [fx, where, at] of loc.later) addEffects(loc, fx, where, at, true);

function trainerOut(t) {
  return {
    id: t.key, cls: t.cls, de: t.de, en: t.en, double: t.double,
    party: t.party.map(p => ({ ...mon(p.id), lv: p.lv, ...(p.item ? { item: p.item } : {}), ...(p.moves ? { moves: p.moves } : {}) })),
  };
}
// Wilde Pokémon im Format der Platin-Karte: Gras je Tageszeit, Surfen, drei Angeln; dazu HG/SS-eigene Arten
function wildOut(w) {
  const list = l => (l || []).map(s => ({ ...mon(s.id), p: s.p, min: s.min, max: s.max }));
  const out = {};
  for (const [from, to] of [['morning', 'morning'], ['day', 'day'], ['night', 'night'], ['surf', 'surf'], ['old', 'oldRod'], ['good', 'goodRod'],
    ['super', 'superRod'], ['rock', 'rockSmash'], ['headbutt', 'headbutt'], ['headbuttRare', 'headbuttRare'], ['headbuttSecret', 'headbuttSecret']]) {
    if (w[from]?.length) out[to] = list(w[from]);
  }
  if (w.swarm) { out.swarm = [mon(w.swarm.id)]; out.swarmMethod = w.swarm.method; }
  if (w.hoenn?.length) out.hoenn = w.hoenn.map(mon);
  if (w.sinnoh?.length) out.sinnoh = w.sinnoh.map(mon);
  if (w.nightFish) out.nightFish = [mon(w.nightFish)];
  return out;
}
function addEffects(loc, fx, where, at, anyArea = false) {
  for (const g of fx.gifts) {
    const id = ITEMS.get(g.item);
    if (!id || loc.items.some(x => x.kind === 'gift' && x.en === tidy(TXT.item.en[id]) && (anyArea || (x.area || '') === (where.area || '')))) continue;
    loc.items.push({ ...itemInfo(id, 'gift', g.qty), ...where, ...at });
  }
  for (const key of fx.battles) {
    const t = trainerInfo(key);
    if (t && !loc.trainers.some(x => x.id === key)) loc.trainers.push({ ...trainerOut(t), ...where, ...at });
  }
  for (const s of fx.statics) addSpecial(loc, 'static', s, where);
  for (const s of fx.mons) addSpecial(loc, s.egg ? 'egg' : 'gift', s, where);
}
function addSpecial(loc, kind, s, where) {
  const id = SPECIES.get(s.species);
  if (!id) return;
  loc.special = loc.special || [];
  if (!loc.special.some(x => x.id === id && x.kind === kind && x.ver === s.ver)) {
    loc.special.push({ kind, ...mon(id), lv: s.lv, area: where.area || '', ...(s.ver ? { ver: s.ver } : {}) });
  }
}

// Dasselbe Item steht teils in den Ereignisdateien mehrerer Nachbarkarten (z. B. std_hiddenitem_r29_r30_t21_nugget):
// behalten wird es nur bei dem Ort, in dessen Feldern die Stelle liegt
{
  const owner = new Map();
  const inside = (loc, it) => it.pos && !it.map && loc.cells.some(c => it.pos[0] >= c.x * 32 - ORIGIN[0] && it.pos[0] < (c.x + 1) * 32 - ORIGIN[0] && it.pos[1] >= c.z * 32 - ORIGIN[1] && it.pos[1] < (c.z + 1) * 32 - ORIGIN[1]);
  for (const loc of locs.values()) for (const it of loc.items) {
    if (!it._sid) continue;
    const cur = owner.get(it._sid);
    if (!cur || (!inside(cur, it) && inside(loc, it))) owner.set(it._sid, loc);
  }
  let dropped = 0;
  for (const loc of locs.values()) loc.items = loc.items.filter((it, n, all) => {
    if (!it._sid) return true;
    const keep = owner.get(it._sid) === loc && all.findIndex(o => o._sid === it._sid) === n;
    if (!keep) { dropped++; if (process.env.DEBUG_DUP) console.log('    ', loc.de, it.de, it.area, it.map || '', it.pos); }
    return keep;
  }).map(it => { delete it._sid; return it; });
  console.log(`  doppelte Items aus Nachbarkarten entfernt: ${dropped}`);
}

// ── Orte, Blockraster, Marker, Innenkarten ───────────────────────────────────
const ROUTE_RE = /^Route \d+$/;
const kept = [...locs.values()].filter(loc => loc.cells.length || loc.items.length || loc.trainers.length || loc.special?.length ||
  loc.wild.heartgold.length || loc.wild.soulsilver.length || sectionDoors.has(loc.key));
const TYPE_ORDER = { city: 0, town: 0, route: 1, place: 2 };
for (const loc of kept) {
  const anyCity = loc.maps.some(k => headers.get(k).type === 'MAP_TYPE_CITY_TOWN' && onOverworld(headers.get(k)));
  const votes = {};
  for (const [r, w] of loc.regions) votes[r] = (votes[r] || 0) + w;
  loc.region = (votes.kanto || 0) > (votes.johto || 0) ? 'kanto' : 'johto';
  loc.type = ROUTE_RE.test(loc.en) ? 'route' : / City$/.test(loc.en) && anyCity ? 'city' : / Town$|Island$/.test(loc.en) && anyCity ? 'town' : 'place';
}
kept.sort((a, b) => (a.region === 'johto' ? 0 : 1) - (b.region === 'johto' ? 0 : 1) || TYPE_ORDER[a.type] - TYPE_ORDER[b.type] || a.en.localeCompare(b.en, 'en', { numeric: true }));
const index = new Map(kept.map((loc, i) => [loc.key, i]));
const liOf = mapsec => index.get(mapsec) ?? -1;

// Innenkarten: alle Karten eines Ortes außerhalb der Weltmatrix mit Markern oder wilden Pokémon
const maps = {}, areaEn = {};
for (const loc of kept) for (const it of loc.interiors) {
  const key = mapKey(it.h);
  const markers = [];
  loc.items.forEach((x, i) => { if (x.map === key) markers.push({ k: x.tm ? 'tm' : x.kind === 'hidden' ? 'hidden' : x.kind === 'gift' ? 'gift' : 'item', x: x.pos[0], z: x.pos[1], y: x.pos[2], i }); });
  loc.trainers.forEach((x, i) => { if (x.map === key) markers.push({ k: 'trainer', x: x.pos[0], z: x.pos[1], y: x.pos[2], i }); });
  const wild = loc.wild.heartgold.some(w => w._map === key) || loc.wild.soulsilver.some(w => w._map === key);
  if (!markers.length && !wild) continue;
  const mx = matrixFiles.find(f => f.startsWith('map_matrix_' + String(+/_(\d{4})/.exec(it.h.matrix)[1]).padStart(4, '0')));
  maps[key] = { l: liOf(loc.key), area: it.area, matrix: mx.replace(/\.bin$/, ''), areaData: +it.h.areaData || 0, markers, warps: it.ev.warps || [] };
  if (it.area && it.areaEn && it.areaEn !== it.area) areaEn[it.area] = it.areaEn;
}
for (const loc of kept) for (const x of [...loc.wild.heartgold, ...loc.wild.soulsilver]) {
  if (x.area && x.areaEn && x.areaEn !== x.area) areaEn[x.area] = x.areaEn;
  delete x.areaEn;
}
// Ausgänge: zu anderen Innenkarten (to), zurück auf die Oberwelt mit Zielstelle (ow) oder in Bereiche ohne Karte (a)
for (const [key, m] of Object.entries(maps)) {
  const exits = [];
  for (const w of m.warps) {
    const dest = headers.get(w.header);
    if (!dest || unused(dest)) continue;
    const dk = mapKey(dest);
    if (dk === key) continue;
    const e = { x: w.x, z: w.z, l: liOf(dest.mapsec) };
    if (e.l < 0) continue;
    if (maps[dk]) e.to = dk;
    else if (onOverworld(dest)) {
      const dw = (events(dest).warps || [])[w.anchor];
      if (dw) e.ow = rel(dw.x, dw.z);
    } else e.a = roomNames(dest).de;
    const target = x => x.to ?? (x.ow ? `ow${x.l}` : `${x.l}|${x.a}`);
    if (exits.some(x => target(x) === target(e) && Math.abs(x.x - e.x) + Math.abs(x.z - e.z) <= 3)) continue;
    exits.push(e);
  }
  m.exits = exits;
  delete m.warps;
}

// Oberwelt-Marker: Items, Trainer, Eingänge in andere Orte und Türen zu Gebäuden mit Innenkarte
const markers = [];
kept.forEach((loc, li) => {
  loc.items.forEach((x, i) => { if (x.pos && !x.map) markers.push({ k: x.tm ? 'tm' : x.kind === 'hidden' ? 'hidden' : x.kind === 'gift' ? 'gift' : 'item', x: x.pos[0], z: x.pos[1], y: x.pos[2], i, l: li }); });
  loc.trainers.forEach((x, i) => { if (x.pos && !x.map) markers.push({ k: 'trainer', x: x.pos[0], z: x.pos[1], y: x.pos[2], i, l: li }); });
});
const entrances = new Map();
const warpSources = new Map();
for (const h of headers.values()) {
  if (unused(h)) continue;
  const from = liOf(h.mapsec);
  for (const w of events(h).warps || []) {
    const dest = headers.get(w.header);
    if (!dest || unused(dest)) continue;
    const dli = liOf(dest.mapsec);
    if (dli < 0 || from < 0) continue;
    if (dli !== from) { if (!warpSources.has(dli)) warpSources.set(dli, new Set()); warpSources.get(dli).add(from); }
    if (!onOverworld(h) || onOverworld(dest)) continue;
    const [x, z] = rel(w.x, w.z), to = maps[mapKey(dest)] ? mapKey(dest) : undefined;
    if (dli !== from) {
      // Eingang in einen anderen Ort (Höhle, Turm …): dicht beieinanderliegende Türen nur einmal
      const list = entrances.get(dli) || [];
      if (list.some(([ex, ez]) => Math.abs(ex - x) + Math.abs(ez - z) < 4)) continue;
      list.push([x, z]);
      entrances.set(dli, list);
      markers.push({ k: 'entrance', x, z, l: dli, from, ...(to ? { to } : {}) });
    } else if (to && !markers.some(m => m.k === 'entrance' && m.to === to)) {
      markers.push({ k: 'entrance', x, z, l: from, to });   // Tür eines Gebäudes mit Inhalt
    }
  }
}

// Blockraster der gerenderten Weltkarte: welcher Ort liegt in welchem 32×32-Block
const chunkRows = render.rows, chunkCols = render.cols;
const chunks = Array.from({ length: chunkRows }, () => new Array(chunkCols).fill(-1));
const outLocs = kept.map((loc, li) => {
  for (const c of loc.cells) {
    const r = c.z - ORIGIN[1] / 32, col = c.x - ORIGIN[0] / 32;
    if (r >= 0 && col >= 0 && r < chunkRows && col < chunkCols) chunks[r][col] = li;
  }
  const out = { key: loc.key, en: loc.en, de: loc.de, type: loc.type, region: loc.region, chunks: loc.cells.length };
  if (loc.cells.length) {
    const xs = loc.cells.map(c => c.x), zs = loc.cells.map(c => c.z);
    const cx = xs.reduce((a, b) => a + b, 0) / xs.length, cz = zs.reduce((a, b) => a + b, 0) / zs.length;
    const best = loc.cells.slice().sort((a, b) => Math.hypot(a.x - cx, a.z - cz) - Math.hypot(b.x - cx, b.z - cz))[0];
    out.label = rel(best.x * 32 + 16, best.z * 32 + 16);
  }
  const ents = loc.cells.length ? [] : entrances.get(li) || [];
  if (ents.length) out.entrances = ents;
  // Nur ein Raum mit Inhalt (z. B. Digdas Höhle): kein eigener Raumname nötig – außer er hat eine eigene Innenkarte
  const all = [...loc.items, ...loc.trainers, ...(loc.special || []), ...loc.wild.heartgold, ...loc.wild.soulsilver];
  if (!loc.cells.length && new Set(all.map(x => x.area || '')).size === 1 && !Object.values(maps).some(m => m.l === li && m.area)) for (const x of all) x.area = '';
  for (const x of [...loc.items, ...loc.trainers]) { delete x.areaEn; if (!x.pos) x.pos = null; }
  for (const x of [...loc.wild.heartgold, ...loc.wild.soulsilver]) delete x._map;
  out.items = loc.items;
  out.trainers = loc.trainers;
  out.wild = loc.wild;
  out.areas = [...new Set(all.map(x => x.area).filter(Boolean))].sort();
  if (loc.special?.length) out.special = loc.special;
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
// Raumnamen, die nur in Item- und Trainerlisten stehen, ebenfalls übersetzen
for (const loc of kept) for (const it of loc.interiors) if (it.area && it.areaEn && it.areaEn !== it.area) areaEn[it.area] = it.areaEn;
// TM-Symbole nach Attackentyp
for (const l of outLocs) for (const it of l.items) if (it.tm && it.move) {
  const n = TM_MOVES[ITEMS.get(/^HM/.test(it.en) ? 'ITEM_HM' + it.en.slice(2) : 'ITEM_TM' + it.en.slice(2)) - ITEMS.get('ITEM_TM01')];
  if (moveTypes[n]) it.move.type = moveTypes[n];
}

const data = {
  version: 3, game: 'hgss', source: 'pret/pokeheartgold + deutsche ROM (' + rom.code + ')',
  width: render.cols * 32, height: render.rows * 32, chunk: 32, chunks, locations: outLocs, markers, maps, areaEn,
};
fs.writeFileSync(OUT, JSON.stringify(data));
const sum = k => outLocs.reduce((n, l) => n + (l[k] || []).length, 0);
const mapList = Object.values(maps);
const count = k => markers.filter(m => m.k === k).length;
console.log(`${OUT}: ${outLocs.length} Orte (${outLocs.filter(l => l.chunks).length} auf der Oberwelt), ${sum('items')} Items, ${sum('trainers')} Trainer, Skriptverknüpfungen ${scriptLinks}`);
console.log(`  Marker auf der Oberwelt: Items ${count('item')}, TMs ${count('tm')}, versteckt ${count('hidden')}, Geschenke ${count('gift')}, Trainer ${count('trainer')}, Eingänge ${count('entrance')}`);
console.log(`  Innenkarten: ${mapList.length} (${new Set(mapList.map(m => m.matrix + '|' + m.areaData)).size} Bilder), Marker innen: ${mapList.reduce((s, m) => s + m.markers.length, 0)}, Ausgänge: ${mapList.reduce((s, m) => s + m.exits.length, 0)}`);
console.log(`  ohne Stelle: ${outLocs.reduce((n, l) => n + l.items.filter(i => !i.pos).length + l.trainers.filter(t => !t.pos).length, 0)}, über anderen Ort erreichbar: ${outLocs.filter(l => l.via != null).length}, ganz ohne Zugang: ${outLocs.filter(l => !hasPos(l) && l.via == null).map(l => l.de).join(', ')}`);
console.log(`  ${Math.round(JSON.stringify(data).length / 1024)} KB`);
