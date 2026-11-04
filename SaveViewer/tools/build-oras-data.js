/*
 * Baut die Spieldaten für Omega Rubin / Alpha Saphir (SaveViewer/data-oras.js, window.ORAS_DATA) – im selben
 * Format wie data-pt.js, damit Save-Viewer, Save-Editor und Boss-Planer beide Spiele gleich behandeln.
 *
 * Quellen:
 *  - die eigene (entschlüsselte) ROM, gelesen mit Bosse/oras-rom.js: Namen (de/en) von Pokémon, Attacken,
 *    Fähigkeiten, Items und Orten, Basiswerte samt Formen, Attackenwerte (Gen-6-Stand)
 *  - PKHeX (github.com/kwsch/PKHeX): Sonder-Fangorte ab 30000/40000/60000 (Tausch, Pension, Events …)
 *  - PokeAPI-CSV-Dateien: Item-Bilder, Hoenn-Dex (Omega Rubin / Alpha Saphir), Formen-Namen und -Bilder
 *  - Wachstumskurven, Wesen: aus data-pt.js (in Gen 6 unverändert)
 *
 * Aufruf (Node 18+):  node build-oras-data.js <rom.3ds|.cxi> [cache-ordner]
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const vm = require('vm');
const OrasRom = require('../../Bosse/oras-rom.js');

const ROM = process.argv[2];
const CACHE = path.resolve(process.argv[3] || path.join(os.tmpdir(), 'oras-data-cache'));
const HUB = path.join(__dirname, '..', '..');
const CSV = 'https://raw.githubusercontent.com/PokeAPI/pokeapi/master/data/v2/csv/';
const PKHEX = 'https://raw.githubusercontent.com/kwsch/PKHeX/master/PKHeX.Core/Resources/text/locations/gen6/';
const SPRITES = 'https://api.github.com/repos/PokeAPI/sprites/contents/sprites/pokemon/versions/generation-vi/omega-ruby-alpha-sapphire';
if (!ROM) { console.error('Aufruf: node build-oras-data.js <rom.3ds> [cache]'); process.exit(1); }
fs.mkdirSync(CACHE, { recursive: true });

async function get(url) {
  const file = path.join(CACHE, url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_'));
  if (fs.existsSync(file)) return fs.readFileSync(file, 'utf8');
  for (let attempt = 1; ; attempt++) {
    try {
      const r = await fetch(url, { headers: { 'User-Agent': 'pokehub-build' } });
      if (!r.ok) throw new Error(`${r.status} ${url}`);
      const t = await r.text();
      fs.writeFileSync(file, t);
      return t;
    } catch (e) {
      if (attempt === 4) throw e;
      await new Promise(res => setTimeout(res, 800 * attempt));
    }
  }
}
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
    return Object.fromEntries(head.map((h, i) => [h, cells[i]]));
  });
}
const csv = async name => parseCSV(await get(CSV + name + '.csv'));
const lines = async name => (await get(PKHEX + name)).replace(/^﻿/, '').split(/\r?\n/);

// Formen so, wie das Spiel sie zählt (Form 0, 1, …) → Kennung bei PokeAPI (Pokémon „<art>-<kennung>“).
// '' = Grundform ohne eigene Kennung. Megas/Proto-Formen gibt es nur im Kampf (für den Boss-Planer).
const GAME_FORMS = {
  25: ['', 'rock-star', 'belle', 'pop-star', 'phd', 'libre', 'cosplay'],
  201: 'abcdefghijklmnopqrstuvwxyz'.split('').concat(['exclamation', 'question']),
  351: ['', 'sunny', 'rainy', 'snowy'],
  382: ['', 'primal'], 383: ['', 'primal'],
  386: ['normal', 'attack', 'defense', 'speed'],
  412: ['plant', 'sandy', 'trash'], 413: ['plant', 'sandy', 'trash'],
  421: ['overcast', 'sunshine'],
  422: ['west', 'east'], 423: ['west', 'east'],
  479: ['', 'heat', 'wash', 'frost', 'fan', 'mow'],
  487: ['altered', 'origin'],
  492: ['land', 'sky'],
  493: ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass',
    'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy'],
  550: ['red-striped', 'blue-striped'],
  555: ['standard', 'zen'],
  585: ['spring', 'summer', 'autumn', 'winter'], 586: ['spring', 'summer', 'autumn', 'winter'],
  641: ['incarnate', 'therian'], 642: ['incarnate', 'therian'], 645: ['incarnate', 'therian'],
  646: ['', 'white', 'black'],
  647: ['ordinary', 'resolute'],
  648: ['aria', 'pirouette'],
  649: ['', 'douse', 'shock', 'burn', 'chill'],
  666: ['icy-snow', 'polar', 'tundra', 'continental', 'garden', 'elegant', 'meadow', 'modern', 'marine', 'archipelago',
    'high-plains', 'sandstorm', 'river', 'monsoon', 'savanna', 'sun', 'ocean', 'jungle', 'fancy', 'poke-ball'],
  669: ['red', 'yellow', 'orange', 'blue', 'white'], 670: ['red', 'yellow', 'orange', 'blue', 'white', 'eternal'],
  671: ['red', 'yellow', 'orange', 'blue', 'white'],
  676: ['natural', 'heart', 'star', 'diamond', 'debutante', 'matron', 'dandy', 'la-reine', 'kabuki', 'pharaoh'],
  678: ['male', 'female'],
  681: ['shield', 'blade'],
  710: ['average', 'small', 'large', 'super'], 711: ['average', 'small', 'large', 'super'],
  716: ['neutral', 'active'],
  720: ['confined', 'unbound']
};

(async () => {
  const rom = await OrasRom.openPath(ROM);
  if (!rom.game) throw new Error('Keine Omega-Rubin-/Alpha-Saphir-ROM');
  const [de, en, game] = await Promise.all([OrasRom.readTexts(rom, 'de'), OrasRom.readTexts(rom, 'en'), OrasRom.readGameData(rom)]);

  // Platin-Daten für Wachstumskurven und Wesen
  const ctx = { window: {} };
  vm.runInNewContext(fs.readFileSync(path.join(HUB, 'SaveViewer', 'data-pt.js'), 'utf8'), ctx);
  const PT = ctx.window.PT_DATA;

  // Basiswerte im Format von data-pt.js: [KP, Ang, Vert, Init, SpAng, SpVert, Typ1, Typ2, Geschlecht, Wachstum,
  // Fähigkeit 1, Fähigkeit 2, Formen, Formen-Index] + [14] versteckte Fähigkeit, [15] Gewicht (0,1 kg)
  const personal = game.personal.map(p => p.base.concat([p.types[0], p.types[1], p.gender, p.growth, p.abilities[0],
    p.abilities[1], p.forms, p.formIndex, p.abilities[2], p.weight]));
  // Attacken wie data-pt.js: [Typ, AP, Stärke, Genauigkeit (0 = trifft immer), Kategorie 1 Status / 2 phys. / 3 spez.]
  const moveInfo = game.moves.map(m => m ? [m.type, m.pp, m.power, m.acc > 100 ? 0 : m.acc, m.cat + 1] : [0, 0, 0, 0, 1]);
  // Zusatzwerte für den Boss-Planer: Priorität, Treffer min/max, Volltreffer-Stufe
  const moveExtra = {};
  game.moves.forEach((m, i) => {
    if (!m) return;
    const e = {};
    if (m.prio) e.prio = m.prio;
    if (m.hits[1] > 1) e.hits = [m.hits[0], m.hits[1]];
    if (m.crit) e.crit = m.crit;
    if (Object.keys(e).length) moveExtra[i] = e;
  });

  // Items: PokeAPI-Kennung je Gen-6-Nummer (für die Bilder)
  const items = await csv('items'), idx = await csv('item_game_indices');
  const itemIdent = new Map(items.map(r => [r.id, r.identifier]));
  const itemSprites = de.items.map(() => '');
  idx.filter(r => r.generation_id === '6').forEach(r => { const n = +r.game_index; if (n < itemSprites.length) itemSprites[n] = itemIdent.get(r.item_id) || ''; });

  // Tasche je Item (Itemdaten der ROM, u16@8 Bits 7–10: 0 Items, 1 Medizin, 2 TM/VM, 3 Beeren, 4 Basis-Items) als
  // Zeichen der Taschen-Nummer im Spielstand (0 Items, 1 Basis-Items, 2 TM/VM, 3 Medizin, 4 Beeren), '-' = kein Item
  const itemData = OrasRom._internal.garc(await rom.file('a/1/9/7'));
  const POCKET = { 0: '0', 1: '3', 2: '2', 3: '4', 4: '1' };
  const itemPockets = de.items.map((n, id) => {
    const f = itemData[id];
    if (!id || !n || n === '???' || !f || f.length < 10) return '-';
    return POCKET[((f[8] | (f[9] << 8)) >> 7) & 15] || '-';
  }).join('');

  // Hoenn-Dex (PokeAPI pokedex 15 = updated-hoenn)
  const dexNum = await csv('pokemon_dex_numbers');
  const hoennDex = dexNum.filter(r => r.pokedex_id === '15').sort((a, b) => a.pokedex_number - b.pokedex_number).map(r => +r.species_id);

  // Formen: Namen (de/en) und Bilddatei im ORAS-Sprite-Ordner von PokeAPI
  const species = await csv('pokemon_species'), pokemon = await csv('pokemon'), forms = await csv('pokemon_forms'), formNamesCsv = await csv('pokemon_form_names');
  const ident = new Map(species.map(r => [+r.id, r.identifier]));
  const pokemonId = new Map(pokemon.map(r => [r.identifier, +r.id]));
  const formByIdent = new Map(forms.map(r => [r.identifier, r]));
  const formName = new Map();
  formNamesCsv.forEach(r => { if (r.local_language_id === '6' || r.local_language_id === '9') formName.set(r.pokemon_form_id + '-' + r.local_language_id, r.form_name); });
  const listing = JSON.parse(await get(SPRITES)).map(x => x.name);
  const femaleListing = JSON.parse(await get(SPRITES + '/female')).map(x => x.name);
  const files = new Set(listing);
  const formNames = {}, formSprites = {};
  const addForms = (sp, list) => {
    const base = ident.get(sp);
    list.forEach((suffix, form) => {
      const id = suffix ? base + '-' + suffix : base;
      const f = formByIdent.get(id) || (form === 0 ? formByIdent.get(base) : null);
      if (f) {
        const n = { de: formName.get(f.id + '-6') || '', en: formName.get(f.id + '-9') || '' };
        if (n.de || n.en) {
          formNames[sp] = formNames[sp] || { de: [], en: [] };
          formNames[sp].de[form] = n.de; formNames[sp].en[form] = n.en;
        }
      }
      if (!form && !suffix) return;
      let file = null;
      if (files.has(sp + '-' + suffix + '.png')) file = sp + '-' + suffix;
      else if (pokemonId.has(id) && files.has(pokemonId.get(id) + '.png')) file = String(pokemonId.get(id));
      if (file && file !== String(sp)) formSprites[sp + '-' + form] = file;
    });
  };
  Object.keys(GAME_FORMS).forEach(sp => addForms(+sp, GAME_FORMS[sp]));
  // Megas: Form 1 (bei Glurak/Mewtu X = 1, Y = 2), nur im Kampf
  for (let sp = 1; sp <= 721; sp++) {
    if (GAME_FORMS[sp]) continue;
    const base = ident.get(sp);
    if (pokemonId.has(base + '-mega-x')) addForms(sp, ['', 'mega-x', 'mega-y']);
    else if (pokemonId.has(base + '-mega')) addForms(sp, ['', 'mega']);
  }
  for (const k of Object.keys(formNames)) ['de', 'en'].forEach(l => { const a = formNames[k][l]; for (let i = 0; i < a.length; i++) if (a[i] == null) a[i] = ''; });

  // PokeAPI-Namen (Duo speichert Pokémon so): Standard-Pokémon je Art, dazu je Form, wo es eigene Einträge gibt
  const defaultPokemon = new Map(pokemon.filter(r => r.is_default === '1').map(r => [+r.species_id, r.identifier]));
  const apiSpecies = [];
  for (let sp = 0; sp <= 721; sp++) apiSpecies.push(defaultPokemon.get(sp) || '');
  const apiForms = {};
  Object.keys(GAME_FORMS).forEach(sp => {
    const base = ident.get(+sp), def = defaultPokemon.get(+sp);
    const list = GAME_FORMS[sp].map(suf => suf && pokemonId.has(base + '-' + suf) ? base + '-' + suf : def);
    if (list.some(x => x !== def)) apiForms[sp] = list;
  });

  // Orte: 0–355 aus der ROM (Fangort-Nummer = Zeile), Sonderorte aus PKHeX
  const loc = async (lang, from) => (await lines(`text_xy_${from}_${lang}.txt`));
  const text = {};
  for (const [lang, t] of [['de', de], ['en', en]]) {
    text[lang] = {
      species: t.species.slice(0, 722), moves: t.moves, abilities: t.abilities, natures: PT.text[lang].natures,
      items: t.items, types: t.file(18).slice(0, 18),
      loc0: t.maps, loc30000: await loc(lang, '30000'), loc40000: await loc(lang, '40000'), loc60000: await loc(lang, '60000')
    };
  }

  const data = {
    game: 'oras', speciesCount: 721,
    exp: PT.exp, personal, moveInfo, moveExtra, itemSprites, itemPockets,
    femaleSprites: femaleListing.map(n => +n.replace('.png', '')).filter(Boolean).sort((a, b) => a - b),
    regionalDex: hoennDex, formNames, formSprites, apiSpecies, apiForms, locRanges: [60000, 40000, 30000, 0], text
  };
  const out = '/* Spieldaten für Omega Rubin / Alpha Saphir. Automatisch erzeugt (SaveViewer/tools/build-oras-data.js) – nicht von Hand bearbeiten.\n' +
    ' * Namen, Basiswerte, Attacken: aus der ROM; Sonder-Fangorte: PKHeX (github.com/kwsch/PKHeX);\n' +
    ' * Item-Bilder, Hoenn-Dex, Formen: PokeAPI (github.com/PokeAPI/pokeapi) */\nwindow.ORAS_DATA = ' + JSON.stringify(data) + ';\n';
  fs.writeFileSync(path.join(HUB, 'SaveViewer', 'data-oras.js'), out);
  console.log('data-oras.js', (out.length / 1024).toFixed(0), 'KB ·', personal.length, 'Basiswerte ·', moveInfo.length, 'Attacken ·', hoennDex.length, 'Hoenn-Dex ·',
    Object.keys(formSprites).length, 'Form-Bilder');
})().catch(e => { console.error(e); process.exit(1); });
