/*
 * Baut die Daten für die Platin-Karte (Karte/platin.json). Das Kartenbild selbst rendern
 * render-platin.js und make-tiles.py aus den 3D-Modellen des Spiels.
 *
 * Quellen:
 *  - pret/pokeplatinum (Quellcode-Nachbau von Pokémon Platin): Kartenaufteilung, Item-Bälle, versteckte Items,
 *    Trainer samt Teams, Item-Geschenke, wilde Pokémon – mit echten Koordinaten (x, z und Höhe y) aus dem Spiel.
 *  - PokeAPI-CSV-Dateien: deutsche Namen für Pokémon, Items, Attacken und Orte.
 *
 * Aufruf (Node 18+):  node build-platin.js <ausgabe-ordner> [cache-ordner]
 *
 * Neben platin.json entsteht encounter-areas.js: welche Encounter-Tabellen (Nummer in pl_enc_data.narc, Reihenfolge
 * wie encounters.order bei pret) zu welchem Ort gehören – damit Run-Dashboard und Duo die wilden Pokémon einer
 * randomisierten ROM (Bosse/rando.js) einem Ort zuordnen können. Die Karte selbst nutzt „enc“ an jedem Wild-Eintrag.
 * Der Cache-Ordner hält heruntergeladene Dateien, damit ein zweiter Lauf schnell geht.
 */
const fs = require('fs');
const os = require('os');
const path = require('path');

const OUT = path.resolve(process.argv[2] || '.');
const CACHE = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'platin-karte-cache'));
const RAW = 'https://raw.githubusercontent.com/pret/pokeplatinum/main/';
const CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
fs.mkdirSync(CACHE, { recursive: true });

// ── Laden mit Cache ──────────────────────────────────────────────────────────
async function get(url, { binary = false, optional = false } = {}) {
  const file = path.join(CACHE, url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_'));
  if (fs.existsSync(file)) {
    const buf = fs.readFileSync(file);
    if (buf.length === 0 && optional) return null;
    return binary ? buf : buf.toString('utf8');
  }
  for (let attempt = 1; attempt <= 4; attempt++) {
    try {
      const r = await fetch(url);
      if (r.status === 404) {
        if (optional) { fs.writeFileSync(file, ''); return null; }
        throw new Error(`404 ${url}`);
      }
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      const buf = Buffer.from(await r.arrayBuffer());
      fs.writeFileSync(file, buf);
      return binary ? buf : buf.toString('utf8');
    } catch (e) {
      if (attempt === 4 || String(e.message).startsWith('404')) throw e;
      await new Promise(res => setTimeout(res, 800 * attempt));
    }
  }
}
const getJSON = async (p, opt) => { const t = await get(RAW + p, opt); return t == null ? null : JSON.parse(t); };
function parseCSV(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const head = lines.shift().split(',');
  return lines.map(line => {
    const cells = []; let cur = '', q = false;
    for (let i = 0; i < line.length; i++) {
      const ch = line[i];
      if (q) { if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; } else if (ch === '"') q = false; else cur += ch; }
      else if (ch === '"') q = true; else if (ch === ',') { cells.push(cur); cur = ''; } else cur += ch;
    }
    cells.push(cur);
    return Object.fromEntries(head.map((h, k) => [h, cells[k]]));
  });
}
const norm = s => String(s || '').toLowerCase().replace(/é/g, 'e').replace(/[^a-z0-9]/g, '');

// ── Bereichsnamen aus dem Header-Namen, z. B. MT_CORONET_1F_SOUTH → „1F Süd“ / „1F South“ ──────────────
// Karten aus Diamant/Perl, die in Platin noch in den Daten stehen, aber im Spiel nicht erreichbar sind
const SKIP_HEADER = /UNUSED|UNK_|UNKNOWN_|EVERYWHERE|NOTHING|_DP_/;
// Wörter: [deutsch, englisch, Art]. 'm' = Lage (steht im Deutschen hinter dem Hauptwort: „Haus Nordost“), 'n' = Hauptwort
const AREA_WORDS = {
  north: ['Nord', 'North', 'm'], south: ['Süd', 'South', 'm'], east: ['Ost', 'East', 'm'], west: ['West', 'West', 'm'],
  northeast: ['Nordost', 'Northeast', 'm'], northwest: ['Nordwest', 'Northwest', 'm'], southeast: ['Südost', 'Southeast', 'm'],
  southwest: ['Südwest', 'Southwest', 'm'], middle: ['Mitte', 'Middle', 'm'], back: ['hinten', 'Back', 'm'], front: ['vorne', 'Front', 'm'],
  left: ['links', 'Left', 'm'], right: ['rechts', 'Right', 'm'],
  house: ['Haus', 'House', 'n'], room: ['Raum', 'Room', 'n'], rooms: ['Räume', 'Rooms', 'n'], gate: ['Tor', 'Gate', 'n'],
  pokecenter: ['Pokémon-Center', 'Pokémon Center', 'n'], mart: ['Pokémon-Markt', 'Poké Mart', 'n'], building: ['Gebäude', 'Building', 'n'],
  deadend: ['Sackgasse', 'Dead End', 'n'], elevator: ['Aufzug', 'Elevator', 'n'], lobby: ['Lobby', 'Lobby', 'n'], hall: ['Halle', 'Hall', 'n'],
  entrance: ['Eingang', 'Entrance', 'n'], gym: ['Arena', 'Gym', 'n'], cave: ['Höhle', 'Cave', 'n'], forest: ['Wald', 'Forest', 'n'],
  tower: ['Turm', 'Tower', 'n'], shop: ['Laden', 'Shop', 'n'],
  and: ['und', 'and'], outside: ['Außenbereich', 'Outside'], pillar: ['Säule', 'Pillar'], gallery: ['Galerie', 'Gallery'],
  office: ['Büro', 'Office'], corridor: ['Flur', 'Corridor'], laboratory: ['Labor', 'Laboratory'], distorted: ['Verzerrt', 'Distorted'],
  drained: ['Ausgetrocknet', 'Drained'], dialga: ['Dialga', 'Dialga'], palkia: ['Palkia', 'Palkia'],
};
// Wendungen aus mehreren Wörtern gehen vor
const AREA_PHRASES = {
  TEAM_GALACTIC_ETERNA_BUILDING: ['', ''],
  GYM_LEADER_ROOM: ['Arenaleiter-Raum', 'Gym Leader Room'], GYM_TRAINER_ROOM: ['Arena-Trainerraum', 'Gym Trainer Room'],
  GYM_ENTRANCE_ROOM: ['Arena-Eingang', 'Gym Entrance'], GYM_ROOM: ['Arenaraum', 'Gym Room'],
  NORTH_GATE: ['Nordtor', 'North Gate'], SOUTH_GATE: ['Südtor', 'South Gate'], EAST_GATE: ['Osttor', 'East Gate'], WEST_GATE: ['Westtor', 'West Gate'],
  CYCLING_ROAD: ['Radweg', 'Cycling Road'], DEAD_END: ['Sackgasse', 'Dead End', 'n'],
  HALLWAY_TO_HALL_OF_FAME: ['Gang zur Ruhmeshalle', 'Hallway to the Hall of Fame'], HALL_OF_FAME: ['Ruhmeshalle', 'Hall of Fame'],
  AARON_ROOM: ['Raum von Herbaro', 'Aaron’s Room'], BERTHA_ROOM: ['Raum von Teresa', 'Bertha’s Room'],
  FLINT_ROOM: ['Raum von Ignaz', 'Flint’s Room'], LUCIAN_ROOM: ['Raum von Lucian', 'Lucian’s Room'], CHAMPION_ROOM: ['Raum des Champs', 'Champion’s Room'],
  CONDOMINIUMS: ['Wohnanlage', 'Condominiums'], HARBOR_INN: ['Hafenherberge', 'Harbor Inn'],
  SAILOR_ELDRITCH_HOUSE: ['Haus von Seemann Eldritch', 'Sailor Eldritch’s House'], HERB_SHOP: ['Kräuterladen', 'Herb Shop'],
  UNDERGROUND_MAN_HOUSE: ['Haus des Untergrundmanns', 'Underground Man’s House'],
  STAGE_NO_CONTEST: ['Bühne (ohne Wettbewerb)', 'Stage (no contest)'], STAGE_ONGOING_CONTEST: ['Bühne (Wettbewerb läuft)', 'Stage (contest running)'],
  CONTROL_ROOM: ['Kontrollraum', 'Control Room'], TUNNEL_ROOM: ['Tunnelraum', 'Tunnel Room'], PILLAR_ROOM: ['Säulenraum', 'Pillar Room'],
  GIRATINA_ROOM: ['Giratinas Raum', 'Giratina’s Room'], WIFI_PLAZA_ENTRANCE: ['Eingang zur Wi-Fi-Plaza', 'Wi-Fi Plaza Entrance'],
  GLOBAL_RANKING_ROOM: ['Raum der weltweiten Rangliste', 'Global Ranking Room'], GROUP_RANKING_ROOM: ['Raum der Gruppen-Rangliste', 'Group Ranking Room'],
  LOW_WATER: ['Niedrigwasser', 'Low Water'], DINING_AREA: ['Speisesaal', 'Dining Area'], SIDE_ROOMS: ['Nebenräume', 'Side Rooms'],
  MAIDS_ROOM: ['Raum der Dienstmädchen', 'Maids’ Room'], RIBBON_SYNDICATE: ['Band-Syndikat', 'Ribbon Syndicate'],
  GRANDMA_WILMA_HOUSE: ['Haus von Oma Wilma', 'Grandma Wilma’s House'], COUNTERPART_HOUSE: ['Haus von Lucas/Lucia', 'Lucas/Dawn’s House'],
  PLAYER_HOUSE: ['Dein Haus', 'Your House'], RIVAL_HOUSE: ['Barrys Haus', 'Barry’s House'],
  POKEMON_FAN_CLUB: ['Pokémon-Fanclub', 'Pokémon Fan Club'], POKEMON_NEWS_PRESS: ['Pokémon-Presse', 'Pokémon News Press'],
  POKEMON_RESEARCH_LAB: ['Pokémon-Forschungslabor', 'Pokémon Research Lab'], PRIZE_EXCHANGE: ['Preisausgabe', 'Prize Exchange'],
  GALACTIC_WAREHOUSE: ['Galaktik-Lager', 'Galactic Warehouse'], OBSERVATORY_GATE: ['Aussichtsgebäude', 'Observatory Gate'],
  MANIAC_TUNNEL_ROOM: ['Durchgang zum Maniac-Tunnel', 'Passage to the Maniac Tunnel'],
  LONG: ['Lang (später)', 'Long (later)'], SHORT: ['Kurz (am Anfang)', 'Short (at first)'],
  MULTI_BATTLE_ROOM: ['Multi-Kampfraum', 'Multi Battle Room'], BATTLE_ROOM: ['Kampfraum', 'Battle Room'],
  BATTLE_SALON: ['Kampfsalon', 'Battle Salon'], CORRIDOR_MULTI: ['Flur (Multi)', 'Corridor (Multi)'],
};
const unknownAreaWords = new Set();
// places: norm(englischer Ortsname) → { de, en } (Orte wie in GATE_TO_HEARTHOME_CITY), here: norm(Name des eigenen Ortes)
function areaNames(rest, places, here) {
  const t = rest.split('_').filter(Boolean);
  const segs = [];
  for (let i = 0; i < t.length;) {
    let k = Math.min(6, t.length - i);
    for (; k > 0 && !AREA_PHRASES[t.slice(i, i + k).join('_')]; k--);
    if (k) {
      const [de, en, kind] = AREA_PHRASES[t.slice(i, i + k).join('_')];
      if (de) segs.push({ de, en, kind });
      i += k;
      continue;
    }
    for (k = Math.min(4, t.length - i); k > 1 && !places.has(norm(t.slice(i, i + k).join(''))); k--);
    if (k > 1) {
      const key = norm(t.slice(i, i + k).join(''));
      if (key !== here) segs.push({ ...places.get(key), kind: 'loc' });
      i += k;
      continue;
    }
    const w = t[i++].toLowerCase();
    if (/^b?\d+f$/.test(w)) segs.push({ de: w.toUpperCase(), en: w.toUpperCase(), kind: 'floor' });
    else if (/^\d+$/.test(w)) segs.push({ de: w, en: w, kind: 'num' });
    else if (w === 'to') segs.push({ de: 'nach', en: 'to', kind: 'to' });
    else if (AREA_WORDS[w]) { const [de, en, kind] = AREA_WORDS[w]; segs.push({ de, en, kind }); }
    else { unknownAreaWords.add(w); const cap = w[0].toUpperCase() + w.slice(1); segs.push({ de: cap, en: cap }); }
  }
  // Deutsch: „nach Herzhofen“, „zur Route 226“, „zum Kampfareal“ / „zum Raum von …“; Lage hinter das Hauptwort
  const de = [];
  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    if (s.kind === 'to') {
      const n = segs[i + 1];
      de.push(!n || n.kind !== 'loc' ? 'zum' : /(City|Town)$/.test(n.en) ? 'nach' : /^Route/.test(n.en) ? 'zur' : 'zum');
      continue;
    }
    let j = i;
    while (segs[j]?.kind === 'm') j++;
    if (j > i && segs[j]?.kind === 'n' && segs[j + 1]?.kind !== 'num') {
      de.push(segs[j].de, ...segs.slice(i, j).map(x => x.de));
      i = j;
      continue;
    }
    de.push(s.de);
  }
  const cap = s => (s ? s[0].toUpperCase() + s.slice(1) : s);
  return { de: cap(de.join(' ')), en: cap(segs.map(s => s.en).join(' ')) };
}

(async () => {
  console.log('Lade Kopfdaten …');
  // Map-Header: welche Karte gehört zu welchem Ort, welche Events, Skripte, wilden Pokémon
  const headersSrc = await get(RAW + 'include/data/map_headers.h');
  const headers = {};
  for (const m of headersSrc.matchAll(/\[(MAP_HEADER_\w+)\]\s*=\s*\{([\s\S]*?)\n\s*\},/g)) {
    const fields = {};
    for (const f of m[2].matchAll(/\.(\w+)\s*=\s*([^,\n]+),/g)) fields[f[1]] = f[2].trim();
    headers[m[1]] = fields;
  }
  console.log(`  ${Object.keys(headers).length} Map-Header`);

  const locText = await getJSON('res/text/location_names.json');
  const LOC_EN = Object.fromEntries(locText.messages.map(m => [m.id, Array.isArray(m.en_US) ? m.en_US.join('') : m.en_US]));

  // ── Deutsche Namen aus der PokeAPI ─────────────────────────────────────────
  console.log('Lade PokeAPI-Namen …');
  const [speciesCsv, speciesNamesCsv, itemsCsv, itemNamesCsv, movesCsv, moveNamesCsv, machinesCsv, locationsCsv, locNamesCsv] = await Promise.all(
    ['pokemon_species', 'pokemon_species_names', 'items', 'item_names', 'moves', 'move_names', 'machines', 'locations', 'location_names']
      .map(n => get(`${CSV}${n}.csv`).then(parseCSV)));
  const DE = '6', EN = '9';
  const speciesByNorm = new Map(speciesCsv.map(r => [norm(r.identifier), +r.id]));
  const speciesDe = new Map(speciesNamesCsv.filter(r => r.local_language_id === DE).map(r => [+r.pokemon_species_id, r.name]));
  const speciesEn = new Map(speciesNamesCsv.filter(r => r.local_language_id === EN).map(r => [+r.pokemon_species_id, r.name]));
  const itemByNorm = new Map(itemsCsv.map(r => [norm(r.identifier), r]));
  const itemDe = new Map(itemNamesCsv.filter(r => r.local_language_id === DE).map(r => [r.item_id, r.name]));
  const itemEn = new Map(itemNamesCsv.filter(r => r.local_language_id === EN).map(r => [r.item_id, r.name]));
  const moveDe = new Map(moveNamesCsv.filter(r => r.local_language_id === DE).map(r => [r.move_id, r.name]));
  const moveEn = new Map(moveNamesCsv.filter(r => r.local_language_id === EN).map(r => [r.move_id, r.name]));
  const tmMove = new Map(machinesCsv.filter(r => r.version_group_id === '9').map(r => [r.item_id, r.move_id]));
  const typesCsv = parseCSV(await get(`${CSV}types.csv`));
  const typeName = new Map(typesCsv.map(r => [r.id, r.identifier]));
  const moveType = new Map(movesCsv.map(r => [r.id, typeName.get(r.type_id)]));
  const sinnohLocs = new Set(locationsCsv.filter(r => r.region_id === '4').map(r => r.id));
  const locDeByEn = new Map();
  const locEnRows = locNamesCsv.filter(r => r.local_language_id === EN && sinnohLocs.has(r.location_id));
  const locDeRows = new Map(locNamesCsv.filter(r => r.local_language_id === DE).map(r => [r.location_id, r.name]));
  for (const r of locEnRows) if (locDeRows.has(r.location_id)) locDeByEn.set(norm(r.name), locDeRows.get(r.location_id));
  // Orte, die in Bereichsnamen vorkommen (Tor nach …); „Sea Route 226“ heißt in den Spieldaten ROUTE_226
  const places = new Map();
  for (const r of locEnRows) {
    const p = { de: locDeRows.get(r.location_id) || r.name, en: r.name };
    places.set(norm(r.name), p);
    if (/^Sea /.test(r.name)) places.set(norm(r.name.slice(4)), { de: p.de, en: r.name.slice(4) });
  }
  const areaEn = {};

  const ITEM_ALIAS = { parlyzheal: 'paralyzeheal', xspdef: 'xspdef', xspecial: 'xspatk', thunderstone: 'thunderstone' };
  const missingItems = new Set();
  function itemInfo(constName) {
    const raw = norm(constName.replace(/^ITEM_/, ''));
    const row = itemByNorm.get(ITEM_ALIAS[raw] || raw);
    if (!row) { missingItems.add(constName); const en = constName.replace(/^ITEM_/, '').split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' '); return { id: raw, de: en, en }; }
    const out = { id: row.identifier, de: itemDe.get(row.id) || itemEn.get(row.id) || row.identifier, en: itemEn.get(row.id) || row.identifier };
    const mv = tmMove.get(row.id);
    if (mv) out.move = { de: moveDe.get(mv) || moveEn.get(mv), en: moveEn.get(mv), type: moveType.get(mv) };
    if (/^(tm|hm)\d+$/.test(row.identifier)) out.tm = true;
    return out;
  }
  const missingSpecies = new Set();
  function speciesInfo(constName) {
    const raw = norm(constName.replace(/^SPECIES_/, ''));
    const id = speciesByNorm.get(raw);
    if (!id) { missingSpecies.add(constName); const n = constName.replace(/^SPECIES_/, ''); return { id: 0, de: n, en: n }; }
    return { id, de: speciesDe.get(id) || constName, en: speciesEn.get(id) || constName };
  }

  // ── Matrix 000 = Oberwelt von Sinnoh (30 × 30 Blöcke à 32 × 32 Kacheln) ──
  const matrix = await getJSON('res/field/matrices/map_matrix_000.json');
  const ROWS = matrix.maps.length, COLS = matrix.maps[0].length, CH = 32;
  const W = COLS * CH, H = ROWS * CH;
  fs.mkdirSync(OUT, { recursive: true });

  // ── Orte ──────────────────────────────────────────────────────────────────
  const locations = [];
  const locIndex = new Map();
  function locFor(labelId) {
    if (!labelId) return -1;
    if (locIndex.has(labelId)) return locIndex.get(labelId);
    const en = LOC_EN[labelId] || labelId.replace('LocationNames_Text_', '');
    const de = locDeByEn.get(norm(en)) || en;
    const type = /Town$/.test(en) ? 'town' : /City$/.test(en) || /League|Area$/.test(en) ? 'city' : /^Route/.test(en) ? 'route' : 'place';
    const loc = { en, de, type, chunks: 0, label: null, items: [], trainers: [], wild: [], entrances: [], areas: [] };
    locations.push(loc);
    locIndex.set(labelId, locations.length - 1);
    return locations.length - 1;
  }
  const chunkLoc = matrix.headers.map(row => row.map(h => (h && h !== 'MAP_HEADER_EVERYWHERE' && headers[h] ? locFor(headers[h].mapLabelTextID) : -1)));
  // Beschriftung: Mitte aller Blöcke eines Ortes (in Kacheln)
  const sums = new Map();
  chunkLoc.forEach((row, r) => row.forEach((li, c) => {
    if (li < 0) return;
    const s = sums.get(li) || { x: 0, z: 0, n: 0 };
    s.x += c * CH + CH / 2; s.z += r * CH + CH / 2; s.n++;
    sums.set(li, s);
  }));
  for (const [li, s] of sums) { locations[li].chunks = s.n; locations[li].label = [Math.round(s.x / s.n), Math.round(s.z / s.n)]; }

  // ── Item-Tabellen ────────────────────────────────────────────────────────
  console.log('Lade Items und Skripte …');
  const visSrc = await get(RAW + 'res/field/scripts/scripts_visible_items.s');
  const visEntries = [...visSrc.matchAll(/ScriptEntry\s+(\w+)/g)].map(m => m[1]);
  const visBody = {};
  const visParts = visSrc.split(/^(\w+):\s*$/m);
  for (let i = 1; i < visParts.length; i += 2) visBody[visParts[i]] = visParts[i + 1] || '';
  const visibleItems = visEntries.map(label => {
    const body = visBody[label] || '';
    const item = body.match(/VAR_0x8008,\s*(ITEM_\w+)/)?.[1];
    const qty = +(body.match(/VAR_0x8009,\s*(\d+)/)?.[1] || 1);
    return item ? { item, qty } : null;
  });
  const hiddenSrc = await get(RAW + 'include/data/field/hidden_items.h');
  const hiddenItems = [...hiddenSrc.matchAll(/HIDDEN_ITEM_ENTRY\((ITEM_\w+),\s*(\d+),\s*(\d+),/g)].map(m => ({ item: m[1], qty: +m[2] }));
  console.log(`  ${visibleItems.length} Item-Bälle, ${hiddenItems.length} versteckte Items`);

  // ── Map-Skripte: Item-Geschenke und Kämpfe je Skript-Eintrag ──────────────
  const scriptCache = new Map();
  async function parseScripts(archive) {
    if (!archive || scriptCache.has(archive)) return scriptCache.get(archive);
    const src = await get(`${RAW}res/field/scripts/${archive}.s`, { optional: true });
    const result = { entries: [], labels: {} };
    if (src) {
      result.entries = [...src.matchAll(/ScriptEntry\s+(\w+)/g)].map(m => m[1]);
      const parts = src.split(/^(\w+):\s*$/m);
      for (let i = 1; i < parts.length; i += 2) {
        const body = parts[i + 1] || '';
        const gifts = [];
        if (/GiveItem|Common_ObtainItem|AddItem/.test(body)) {
          for (const g of body.matchAll(/SetVar\s+VAR_0x8004,\s*(ITEM_\w+)(?:[\s\S]{0,80}?SetVar\s+VAR_0x8005,\s*(\d+))?/g)) gifts.push({ item: g[1], qty: +(g[2] || 1) });
        }
        const battles = [...body.matchAll(/^\s*\w*Battle\w*\s+([^\n]*)$/gm)].flatMap(l => [...l[1].matchAll(/TRAINER_[A-Z0-9_]+/g)].map(t => t[0]));
        const refs = [...body.matchAll(/^\s*(?:GoTo|Call)\w*\s+([^\n]*)$/gm)].flatMap(l => l[1].split(/\s*,\s*/).map(s => s.trim()));
        result.labels[parts[i]] = { gifts, battles, refs };
      }
    }
    scriptCache.set(archive, result);
    return result;
  }
  // Alles, was ein Skript-Eintrag direkt oder über Sprünge erreicht
  function collect(scripts, label, acc = { gifts: [], battles: [] }, seenL = new Set()) {
    if (!label || seenL.has(label) || !scripts.labels[label]) return acc;
    seenL.add(label);
    const l = scripts.labels[label];
    acc.gifts.push(...l.gifts); acc.battles.push(...l.battles);
    for (const r of l.refs) collect(scripts, r, acc, seenL);
    return acc;
  }

  // ── Trainer ──────────────────────────────────────────────────────────────
  const trainerCache = new Map();
  const missingTrainers = new Set();
  async function trainer(constName) {
    if (trainerCache.has(constName)) return trainerCache.get(constName);
    const file = constName.replace(/^TRAINER_/, '').toLowerCase();
    const d = await getJSON(`res/trainers/data/${file}.json`, { optional: true });
    let out = null;
    if (d) {
      out = {
        id: constName,
        cls: d.class.replace(/^TRAINER_CLASS_/, ''),
        name: d.name,
        double: !!d.double_battle,
        party: d.party.map(p => {
          const s = speciesInfo(p.species);
          const mon = { id: s.id, de: s.de, en: s.en, lv: p.level };
          if (p.item) { const it = itemInfo(p.item); mon.item = { de: it.de, en: it.en }; }
          return mon;
        }),
      };
    } else missingTrainers.add(constName);
    trainerCache.set(constName, out);
    return out;
  }

  // ── Wilde Pokémon ─────────────────────────────────────────────────────────
  // Reihenfolge der Tabellen in der ROM (pl_enc_data.narc) – so findet man sie in einer randomisierten ROM wieder
  const encOrder = (await get(RAW + 'res/field/encounters/encounters.order')).split(/\r?\n/).map(x => x.trim()).filter(Boolean);
  const LAND = [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1];
  const WATER = [60, 30, 5, 4, 1];
  const RODS = [40, 40, 15, 4, 1];
  function table(slots, rates, levels) {
    const map = new Map();
    slots.forEach((s, i) => {
      if (!s || !s.species || s.species === 'SPECIES_NONE') return;
      const sp = speciesInfo(s.species);
      const cur = map.get(sp.id) || { id: sp.id, de: sp.de, en: sp.en, p: 0, min: 99, max: 0 };
      cur.p += rates[i];
      const lo = s.level_min ?? s.level ?? 0, hi = s.level_max ?? s.level ?? 0;
      cur.min = Math.min(cur.min, lo); cur.max = Math.max(cur.max, hi);
      map.set(sp.id, cur);
    });
    return [...map.values()].sort((a, b) => b.p - a.p);
  }
  async function wild(archive) {
    if (!archive || /dummy/i.test(archive)) return null;
    const e = await getJSON(`res/field/encounters/${archive}.json`, { optional: true });
    if (!e) return null;
    const out = {};
    if (encOrder.indexOf(archive) >= 0) out.enc = encOrder.indexOf(archive);
    const land = e.land_encounters || [];
    if (e.land_rate && land.length) {
      // Morgens = Grundtabelle; tagsüber/nachts ersetzen die Plätze 3 und 4 (je 10 %)
      const withTime = list => land.map((s, i) => (i === 2 || i === 3) && list?.[i - 2] && list[i - 2] !== 'SPECIES_NONE' ? { ...s, species: list[i - 2] } : s);
      out.morning = table(land, LAND);
      out.day = table(withTime(e.day), LAND);
      out.night = table(withTime(e.night), LAND);
    }
    if (e.surf_rate && e.surf_encounters?.length) out.surf = table(e.surf_encounters, WATER);
    if (e.old_rod_rate && e.old_rod_encounters?.length) out.oldRod = table(e.old_rod_encounters, WATER);
    if (e.good_rod_rate && e.good_rod_encounters?.length) out.goodRod = table(e.good_rod_encounters, RODS);
    if (e.super_rod_rate && e.super_rod_encounters?.length) out.superRod = table(e.super_rod_encounters, RODS);
    const names = list => [...new Set((list || []).filter(s => s && s !== 'SPECIES_NONE').map(s => speciesInfo(s)))].filter((v, i, a) => a.findIndex(x => x.id === v.id) === i).map(s => ({ id: s.id, de: s.de, en: s.en }));
    if (e.swarms?.length) out.swarm = names(e.swarms);
    if (e.radar?.length) out.radar = names(e.radar);
    const gba = [...(e.ruby || []), ...(e.sapphire || []), ...(e.emerald || []), ...(e.firered || []), ...(e.leafgreen || [])];
    if (gba.length) out.dualSlot = names(gba);
    return Object.keys(out).some(k => k !== 'enc') ? out : null;
  }

  // ── Alle Map-Header durchgehen ────────────────────────────────────────────
  console.log('Werte Karten aus …');
  const markers = [];
  const OVERWORLD = 'map_matrix_000';
  const headerNames = Object.keys(headers);
  const eventsCache = new Map();
  const events = async key => {
    if (!eventsCache.has(key)) eventsCache.set(key, await getJSON(`res/field/events/${key}.json`, { optional: true }));
    return eventsCache.get(key);
  };
  const doneEvents = new Set();
  // Innenkarten (Höhlen, Gebäude, Wälder …): eigene Marker und Ausgänge, Schlüssel = Header ohne MAP_HEADER_
  const interiors = new Map();
  const mapKey = hn => hn.replace(/^MAP_HEADER_/, '');
  const doors = [];
  let scriptLinkSamples = 0;
  const warpSources = new Map(); // Ziel-Ort → Orte, von denen ein Warp dorthin führt
  for (const hn of headerNames) {
    const h = headers[hn];
    // Nicht verwendete Karten aus der Entwicklung des Spiels weglassen
    if (SKIP_HEADER.test(hn) || /MysteryZone/.test(h.mapLabelTextID || '')) continue;
    const li = locFor(h.mapLabelTextID);
    if (li < 0) continue;
    const loc = locations[li];
    const overworld = h.mapMatrixID === OVERWORLD;
    // Bereichsname aus dem Header, z. B. MAP_HEADER_MT_CORONET_1F_SOUTH → „1F Süd"
    const locWords = norm(loc.en);
    const rawName = hn.replace(/^MAP_HEADER_/, '');
    let rest = rawName;
    const parts = rawName.split('_');
    for (let k = parts.length; k > 0; k--) { if (norm(parts.slice(0, k).join('')) === locWords) { rest = parts.slice(k).join('_'); break; } }
    // Ohne Treffer bleibt der ganze Name (eigener Name des Bereichs); Deutsch ist der Schlüssel, Englisch steht in areaEn
    let area = '';
    if (!overworld) {
      const names = areaNames(rest, places, locWords);
      area = names.de;
      if (area && names.en !== area) {
        if (areaEn[area] && areaEn[area] !== names.en) console.log(`  Bereichsname doppelt: ${area} = ${areaEn[area]} / ${names.en}`);
        areaEn[area] = names.en;
      }
    }

    // Events (jede Datei nur einmal)
    const evKey = h.eventsArchiveID;
    if (!evKey || doneEvents.has(evKey)) continue;
    doneEvents.add(evKey);
    const ev = await events(evKey);
    if (!ev) continue;
    if (area && !loc.areas.includes(area)) loc.areas.push(area);
    const scripts = await parseScripts(h.scriptsArchiveID);
    // Position: Kachel x, z und Höhe y (in Kacheln; wichtig bei Brücken). Innen zusätzlich die Innenkarte.
    const pos = (x, z, y) => [x, z, y ?? 0];
    const inner = overworld ? null : { l: li, area, matrix: h.mapMatrixID, areaData: h.areaDataArchiveID, markers: [], warps: ev.warp_events || [] };
    if (inner) interiors.set(mapKey(hn), inner);
    const onMap = overworld ? {} : { map: mapKey(hn) };
    const addMarker = m => (overworld ? markers.push({ ...m, l: li }) : inner.markers.push(m));
    const linkedLabels = new Set();

    for (const o of ev.object_events || []) {
      // Trainer
      if (typeof o.script === 'string' && o.script.startsWith('TRAINER_')) {
        const t = await trainer(o.script);
        if (t) {
          const idx = loc.trainers.push({ ...t, area, pos: pos(o.x, o.z, o.y), ...onMap }) - 1;
          addMarker({ k: 'trainer', x: o.x, z: o.z, y: o.y ?? 0, i: idx });
        }
        continue;
      }
      // Item-Ball
      if (o.graphics_id === 'OBJ_EVENT_GFX_POKEBALL' && +o.script >= 7000 && +o.script < 8000) {
        const v = visibleItems[+o.script - 7000];
        if (v) {
          const info = itemInfo(v.item);
          const idx = loc.items.push({ kind: 'ball', ...info, qty: v.qty, area, pos: pos(o.x, o.z, o.y), ...onMap }) - 1;
          addMarker({ k: info.tm ? 'tm' : 'item', x: o.x, z: o.z, y: o.y ?? 0, i: idx });
        }
        continue;
      }
      // NPC mit Skript: Geschenke und Kämpfe (z. B. Arenaleiter)
      const n = +o.script;
      if (Number.isInteger(n) && n >= 1 && n <= scripts.entries.length) {
        const label = scripts.entries[n - 1];
        linkedLabels.add(label);
        const found = collect(scripts, label);
        if (scriptLinkSamples < 3 && found.gifts.length) { console.log(`  Beispiel: ${hn} Objekt ${o.graphics_id} → ${label} → ${found.gifts.map(g => g.item).join(', ')}`); scriptLinkSamples++; }
        for (const g of found.gifts) {
          const info = itemInfo(g.item);
          if (loc.items.some(x => x.kind === 'gift' && x.id === info.id && x.area === area)) continue;
          const idx = loc.items.push({ kind: 'gift', ...info, qty: g.qty, area, pos: pos(o.x, o.z, o.y), ...onMap }) - 1;
          addMarker({ k: info.tm ? 'tm' : 'gift', x: o.x, z: o.z, y: o.y ?? 0, i: idx });
        }
        for (const tid of [...new Set(found.battles)]) {
          if (loc.trainers.some(t => t.id === tid)) continue;
          const t = await trainer(tid);
          if (!t) continue;
          const idx = loc.trainers.push({ ...t, area, pos: pos(o.x, o.z, o.y), ...onMap }) - 1;
          addMarker({ k: 'trainer', x: o.x, z: o.z, y: o.y ?? 0, i: idx });
        }
      }
    }
    // Versteckte Items
    for (const b of ev.bg_events || []) {
      if (b.type !== 2 || b.script < 8000) continue;
      const hi = hiddenItems[b.script - 8000];
      if (!hi) continue;
      const info = itemInfo(hi.item);
      const idx = loc.items.push({ kind: 'hidden', ...info, qty: hi.qty, area, pos: pos(b.x, b.z, b.y), ...onMap }) - 1;
      addMarker({ k: 'hidden', x: b.x, z: b.z, y: b.y ?? 0, i: idx });
    }
    // Geschenke aus Skripten ohne Objekt (z. B. beim Betreten)
    for (const label of scripts.entries) {
      if (linkedLabels.has(label)) continue;
      const found = collect(scripts, label);
      for (const g of found.gifts) {
        const info = itemInfo(g.item);
        if (loc.items.some(x => x.kind === 'gift' && x.id === info.id && x.area === area)) continue;
        loc.items.push({ kind: 'gift', ...info, qty: g.qty, area, pos: null });
      }
      for (const tid of [...new Set(found.battles)]) {
        if (loc.trainers.some(t => t.id === tid)) continue;
        const t = await trainer(tid);
        if (t) loc.trainers.push({ ...t, area, pos: null });
      }
    }
    // Welche Orte sind von hier aus erreichbar? (für Orte ohne eigenen Kartenzugang)
    for (const w of ev.warp_events || []) {
      const dest = headers[w.dest_header_id];
      if (!dest || SKIP_HEADER.test(w.dest_header_id)) continue;
      const dli = locFor(dest.mapLabelTextID);
      if (dli < 0 || dli === li) continue;
      if (!warpSources.has(dli)) warpSources.set(dli, new Set());
      warpSources.get(dli).add(li);
    }
    // Eingänge in andere Orte (Höhlen, Wälder …); Türen in Gebäude desselben Ortes merken (nur solche mit Inhalt bleiben)
    if (overworld) {
      for (const w of ev.warp_events || []) {
        const dest = headers[w.dest_header_id];
        if (!dest || SKIP_HEADER.test(w.dest_header_id)) continue;
        const dli = locFor(dest.mapLabelTextID);
        if (dli === li && dest.mapMatrixID !== OVERWORLD) doors.push({ k: 'entrance', x: w.x, z: w.z, l: li, to: mapKey(w.dest_header_id) });
        if (dli < 0 || dli === li) continue;
        const d = locations[dli];
        if (d.entrances.some(([x, z]) => Math.abs(x - w.x) + Math.abs(z - w.z) < 4)) continue;
        d.entrances.push([w.x, w.z]);
        markers.push({ k: 'entrance', x: w.x, z: w.z, l: dli, from: li, to: mapKey(w.dest_header_id) });
      }
    }
    // Wilde Pokémon
    const w = await wild(h.wildEncountersArchiveID);
    if (w) loc.wild.push({ area, ...w });
  }

  // ── Innenkarten: nur solche mit Markern. Ausgänge führen zu anderen Innenkarten, zurück auf die Oberwelt
  // (mit Zielstelle) oder – nicht anklickbar – in Bereiche ohne eigene Karte. ──
  const maps = {};
  for (const [key, m] of interiors) if (m.markers.length) maps[key] = m;
  for (const [key, m] of Object.entries(maps)) {
    const exits = [];
    for (const w of m.warps) {
      const dest = headers[w.dest_header_id];
      if (!dest || SKIP_HEADER.test(w.dest_header_id)) continue;
      const dk = mapKey(w.dest_header_id);
      if (dk === key) continue;
      const e = { x: w.x, z: w.z, l: locFor(dest.mapLabelTextID) };
      if (maps[dk]) e.to = dk;
      else if (dest.mapMatrixID === OVERWORLD) {
        const dw = (await events(dest.eventsArchiveID))?.warp_events?.[w.dest_warp_id];
        if (dw) e.ow = [dw.x, dw.z];
      } else e.a = interiors.get(dk)?.area ?? '';
      // Doppeltüren und breite Treppen nur einmal
      const target = x => x.to ?? (x.ow ? `ow${x.l}` : `${x.l}|${x.a}`);
      if (exits.some(x => target(x) === target(e) && Math.abs(x.x - e.x) + Math.abs(x.z - e.z) <= 3)) continue;
      exits.push(e);
    }
    m.exits = exits;
    delete m.warps;
  }
  // Eingänge auf der Oberwelt führen direkt in ihre Innenkarte; Türen nur zu Gebäuden mit Inhalt, je Gebäude eine
  for (const m of markers) if (m.k === 'entrance' && !maps[m.to]) delete m.to;
  for (const d of doors) {
    if (!maps[d.to] || markers.some(m => m.k === 'entrance' && m.to === d.to)) continue;
    markers.push(d);
  }

  // Orte ohne Kartenzugang: über welchen Ort mit Position erreicht man sie? (Suche über bis zu 3 Warps)
  const hasPos = l => l.chunks > 0 || l.entrances.length > 0;
  locations.forEach((l, li) => {
    if (hasPos(l)) return;
    let frontier = [li];
    const visited = new Set(frontier);
    for (let depth = 0; depth < 3 && l.via == null; depth++) {
      const next = [];
      for (const cur of frontier) for (const src of warpSources.get(cur) || []) {
        if (visited.has(src)) continue;
        visited.add(src);
        if (hasPos(locations[src])) { l.via = src; break; }
        next.push(src);
      }
      frontier = next;
    }
  });

  // Leere Orte (z. B. Mystery Zone) entfernen und Indizes neu vergeben
  const keep = locations.map((l, i) => (l.chunks || l.items.length || l.trainers.length || l.wild.length || l.entrances.length ? i : -1)).filter(i => i >= 0);
  const remap = new Map(keep.map((old, i) => [old, i]));
  const finalLocs = keep.map(i => locations[i]);
  const finalMarkers = markers.filter(m => remap.has(m.l)).map(m => ({ ...m, l: remap.get(m.l), ...(m.from != null ? { from: remap.get(m.from) ?? -1 } : {}) }));
  const finalChunks = chunkLoc.map(row => row.map(li => (remap.has(li) ? remap.get(li) : -1)));
  for (const l of finalLocs) {
    l.areas.sort();
    if (!l.entrances.length) delete l.entrances;
    if (l.via != null) { if (remap.has(l.via)) l.via = remap.get(l.via); else delete l.via; }
  }
  for (const m of Object.values(maps)) {
    m.l = remap.get(m.l);
    m.exits = m.exits.filter(e => remap.has(e.l)).map(e => ({ ...e, l: remap.get(e.l) }));
  }

  const data = { version: 2, source: 'pret/pokeplatinum + PokeAPI', width: W, height: H, chunk: CH, chunks: finalChunks, locations: finalLocs, markers: finalMarkers, maps, areaEn };
  const json = JSON.stringify(data);
  fs.writeFileSync(path.join(OUT, 'platin.json'), json);
  // Ort (deutscher Name wie auf der Karte) → Encounter-Tabellen und Original-Arten (Gras, Surfen, Angeln; häufigste zuerst)
  // Bereiche, die in Nuzlocke-Routenlisten eigene Orte sind (auf der Karte Teil eines anderen Ortes)
  const SUBPLACES = [['Turm der Ruhenden', 'Lost Tower']];   // Stockwerke in Route 209
  const areas = {};
  const WILD_KEYS = ['morning', 'day', 'night', 'surf', 'oldRod', 'goodRod', 'superRod'];
  for (const l of finalLocs) {
    for (const w of l.wild) {
      const sub = SUBPLACES.find(([de]) => (w.area || '').startsWith(de));
      const key = sub ? sub[0] : l.de;
      const a = areas[key] || (areas[key] = { en: sub ? sub[1] : l.en, enc: [], orig: [] });
      if (w.enc >= 0 && !a.enc.includes(w.enc)) a.enc.push(w.enc);
      for (const k of WILD_KEYS) for (const s of w[k] || []) if (s.id && !a.orig.includes(s.id)) a.orig.push(s.id);
    }
  }
  for (const k of Object.keys(areas)) if (!areas[k].enc.length) delete areas[k];
  fs.writeFileSync(path.join(OUT, 'encounter-areas.js'), [
    '/* Automatisch erzeugt von tools/build-platin.js – Ort → Encounter-Tabellen in pl_enc_data.narc (Platin) */',
    'window.PT_ENCOUNTER_AREAS = ' + JSON.stringify(areas) + ';',
    ''
  ].join(String.fromCharCode(10)));
  const count = k => finalMarkers.filter(m => m.k === k).length;
  console.log(`Fertig: ${finalLocs.length} Orte, ${finalLocs.reduce((s, l) => s + l.items.length, 0)} Items, ${finalLocs.reduce((s, l) => s + l.trainers.length, 0)} Trainer`);
  console.log(`  Marker auf der Oberwelt: Items ${count('item')}, TMs ${count('tm')}, versteckt ${count('hidden')}, Geschenke ${count('gift')}, Trainer ${count('trainer')}, Eingänge ${count('entrance')}`);
  const mapList = Object.values(maps);
  console.log(`  Innenkarten: ${mapList.length} (${new Set(mapList.map(m => `${m.matrix}|${m.areaData}`)).size} verschiedene Bilder), Marker innen: ${mapList.reduce((s, m) => s + m.markers.length, 0)}, Ausgänge: ${mapList.reduce((s, m) => s + m.exits.length, 0)}`);
  console.log(`  platin.json ${Math.round(json.length / 1024)} KB`);
  if (missingItems.size) console.log('  Items ohne PokeAPI-Treffer:', [...missingItems].join(', '));
  if (missingSpecies.size) console.log('  Pokémon ohne Treffer:', [...missingSpecies].join(', '));
  if (missingTrainers.size) console.log(`  Trainer ohne Datei (${missingTrainers.size}):`, [...missingTrainers].slice(0, 20).join(', '));
  if (unknownAreaWords.size) console.log('  Bereichswörter ohne Übersetzung:', [...unknownAreaWords].sort().join(', '));
  const classes = [...new Set(finalLocs.flatMap(l => l.trainers.map(t => t.cls)))].sort();
  console.log('  Trainerklassen:', classes.join(', '));
})().catch(e => { console.error(e); process.exit(1); });
