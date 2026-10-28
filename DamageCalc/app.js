/*
 * Schadens-Rechner – Oberfläche.
 * Die Formeln stehen in mechanics.js (globales Objekt DMG). Hier werden die Daten von der PokeAPI geholt,
 * auf die gewählte Generation umgerechnet (alte Typen, Basiswerte, Attacken-Stärken) und angezeigt.
 */
window.LANG = localStorage.getItem('hub-lang') || 'de';
document.documentElement.lang = window.LANG;

const TRANSLATIONS = {
  de: {
    title: 'Schadens-Rechner',
    subtitle: 'Schaden, KO-Chance und Volltreffer – mit den Formeln und Werten der gewählten Generation.',
    genLabel: 'Generation',
    condLabel: 'Bedingungen',
    togBurn: 'Verbrennung',
    togSun: 'Sonne',
    togRain: 'Regen',
    togScreens: 'Reflektor / Lichtschild',
    attackerTitle: 'Angreifer',
    defenderTitle: 'Verteidiger',
    moveTitle: 'Attacke',
    resultsTitle: 'Ergebnis',
    levelLabel: 'Level',
    natureLabel: 'Wesen',
    statValue: 'Wert',
    atkStat: 'Angriff',
    spaStat: 'Sp. Angriff',
    specialStat: 'Spezial',
    hpStat: 'KP',
    defStat: 'Verteidigung',
    spdStat: 'Sp. Vert.',
    powerOverrideLabel: 'Stärke überschreiben',
    swapBtn: 'Angreifer und Verteidiger tauschen',
    worstCaseBtn: 'Worst Case',
    worstCaseBtnTitle: 'KP und passende Verteidigung auf 252 EV / 31 IV, passendes Wesen',
    closeModal: 'Schließen',
    modalTitleAtk: 'Angreifer wählen',
    modalTitleDef: 'Verteidiger wählen',
    moveModalTitle: 'Attacke wählen',
    pokeSearchPlaceholder: 'Name oder #ID suchen…',
    moveSearchPlaceholder: 'Attacken-Name suchen…',
    loadingPoke: 'Lade Pokémon…',
    loadingMoves: 'Lade Attacken…',
    pickPoke: 'Pokémon wählen',
    pickHint: 'Tippen zum Auswählen',
    pickMove: 'Attacke wählen',
    pickMoveFirst: 'Zuerst einen Angreifer wählen',
    change: 'Ändern',
    power: 'Stärke',
    physical: 'Physisch',
    special: 'Speziell',
    status: 'Status',
    noPokemon: 'Kein Pokémon gefunden.',
    noMove: 'Keine Attacke gefunden.',
    noMovesInGen: '{p} kann in Gen {g} keine Attacken lernen.',
    pickAttackerFirst: 'Wähle zuerst einen Angreifer.',
    natureNeutral: 'neutral',
    natureOff: 'gibt es erst ab Gen 3',
    resultsEmpty: 'Wähle Angreifer, Attacke und Verteidiger – das Ergebnis erscheint sofort.',
    missingAtk: 'Angreifer',
    missingMove: 'Attacke',
    missingDef: 'Verteidiger',
    statusMove: 'Status-Attacken richten keinen direkten Schaden an.',
    noPower: 'Diese Attacke hat keine feste Stärke (z. B. Fixschaden oder abhängig von Gewicht oder KP). Trage bei der Attacke eine Stärke ein.',
    moveTooNew: '{m} gibt es erst ab Gen {g}.',
    damage: 'Schaden',
    ofHp: 'von {hp} KP',
    hpLeft: 'Rest-KP nach dem Treffer',
    hpGone: 'besiegt',
    noEffect: 'Keine Wirkung',
    koHits: '{n}-Treffer-KO',
    koSure: 'garantiert',
    koChance: '{p} % Chance',
    koSureAfter: 'sicher nach {n} Treffern',
    koNone: 'Kein KO in 8 Treffern',
    critTitle: 'Volltreffer',
    fixedDamage: 'Fester Schaden',
    fixedDamageSub: 'immer {n} KP – Werte und Volltreffer egal',
    fixedNoType: 'Typ egal',
    effTitle: 'Typ-Effektivität',
    statsTitle: 'Verwendete Werte',
    eff0: 'Keine Wirkung',
    effLow: 'Nicht sehr effektiv',
    eff1: 'Neutral',
    effHigh: 'Sehr effektiv',
    detailsSummary: 'Alle {n} Schadenswerte und Rechenweg (Gen {g})',
    rollsLabel: 'Schadenswerte ohne Volltreffer',
    mechLabel: 'So rechnet Gen {g}',
    level: 'Level',
    vs: 'gegen',
    statShort: { hp: 'KP', attack: 'Angr', defense: 'Vert', sp_attack: 'SpAng', sp_defense: 'SpVert', speed: 'Init', special: 'Spez' },
    noteIntro: 'Gibt es erst ab Gen {g}.',
    noteTypes: 'Typ in Gen {g}: {old} (heute {now})',
    noteStats: 'Basiswerte in Gen {g}: {list}',
    noteSpecial: 'Gen 1: ein Spezial-Wert ({v}) für Angriff und Verteidigung',
    noteMoveType: 'Typ in Gen {g}: {old} (heute {now})',
    noteMovePower: 'Stärke in Gen {g}: {old} (heute {now})',
    noteMoveClass: 'In Gen {g} {cls} – bis Gen 3 entscheidet der Typ',
    noteNotLearnable: '{p} kann diese Attacke in Gen {g} nicht lernen.',
    noteHighCrit: 'Trifft in Gen 1 fast immer kritisch – der Volltreffer-Wert ist der realistische.',
    noteExplosion: 'Halbiert in Gen 1–4 die Verteidigung des Ziels.',
    noteBreaksScreens: 'Zerstört Reflektor und Lichtschild – die zählen hier nicht.',
    genInfo: {
      1: 'Spezial-Wert für Angriff und Verteidigung · Volltreffer verdoppelt das Level · keine Wesen, kein Wetter · IV 31 = DV 15, EV 252 = volle Statuspunkte',
      2: 'Volltreffer ×2 und ohne Verbrennung/Schild · physisch oder speziell nach Typ · keine Wesen · IV 31 = DV 15, EV 252 = volle Statuspunkte',
      3: 'Volltreffer ×2 · physisch oder speziell nach Typ · Zufall 85–100 % zuletzt',
      4: 'Volltreffer ×2 · physisch oder speziell je Attacke',
      5: 'Volltreffer ×2 · Verbrennung halbiert erst am Ende',
      6: 'Volltreffer ×1,5 · Fee-Typ · Stahl widersteht Geist und Unlicht nicht mehr',
      7: 'Volltreffer ×1,5 · Formel wie Gen 6',
      8: 'Volltreffer ×1,5 · Formel wie Gen 6',
      9: 'Volltreffer ×1,5 · Formel wie Gen 6',
    },
    mech: {
      1: ['Ein Spezial-Wert für Angriff und Verteidigung', 'Volltreffer verdoppelt das Level und ignoriert Verbrennung, Reflektor und Lichtschild',
        'Angriff oder Verteidigung über 255: beide Werte werden geviertelt', 'Schaden max. 997 + 2, dann STAB und Typ (je Typ abgerundet)',
        'Zufallsfaktor 217–255 von 255 (39 Werte)', 'Typen-Tabelle Gen 1: Käfer und Gift gegenseitig 2×, Geist wirkt nicht gegen Psycho, Eis gegen Feuer neutral'],
      2: ['Volltreffer ×2, ignoriert Verbrennung, Reflektor und Lichtschild', 'Physisch oder speziell nach Typ der Attacke',
        'Angriff oder Verteidigung über 255: beide Werte werden geviertelt', 'Schaden max. 997 + 2, dann Wetter, STAB und Typ',
        'Zufallsfaktor 217–255 von 255 (39 Werte)', 'Stahl widersteht Geist und Unlicht'],
      3: ['Physisch oder speziell nach Typ der Attacke', 'Verbrennung, Schild und Wetter vor dem +2', 'Volltreffer ×2, ignoriert Reflektor und Lichtschild',
        'Dann STAB und Typ, der Zufallsfaktor 85–100 % kommt ganz zum Schluss'],
      4: ['Physisch oder speziell je Attacke', 'Verbrennung, Schild und Wetter vor dem +2', 'Volltreffer ×2, ignoriert Reflektor und Lichtschild',
        'Danach Zufallsfaktor 85–100 %, STAB und Typ'],
      5: ['Grundschaden + 2, dann Wetter, Volltreffer ×2, Zufall 85–100 %, STAB, Typ', 'Verbrennung halbiert am Ende, Reflektor/Lichtschild halbieren nur ohne Volltreffer'],
      6: ['Grundschaden + 2, dann Wetter, Volltreffer ×1,5, Zufall 85–100 %, STAB, Typ', 'Verbrennung halbiert am Ende, Reflektor/Lichtschild halbieren nur ohne Volltreffer',
        'Typen-Tabelle mit Fee; Stahl widersteht Geist und Unlicht nicht mehr'],
    },
  },
  en: {
    title: 'Damage Calculator',
    subtitle: 'Damage, KO chance and crits – using the formulas and values of the chosen generation.',
    genLabel: 'Generation',
    condLabel: 'Conditions',
    togBurn: 'Burn',
    togSun: 'Sun',
    togRain: 'Rain',
    togScreens: 'Reflect / Light Screen',
    attackerTitle: 'Attacker',
    defenderTitle: 'Defender',
    moveTitle: 'Move',
    resultsTitle: 'Result',
    levelLabel: 'Level',
    natureLabel: 'Nature',
    statValue: 'Stat',
    atkStat: 'Attack',
    spaStat: 'Sp. Attack',
    specialStat: 'Special',
    hpStat: 'HP',
    defStat: 'Defense',
    spdStat: 'Sp. Def.',
    powerOverrideLabel: 'Override power',
    swapBtn: 'Swap attacker and defender',
    worstCaseBtn: 'Worst case',
    worstCaseBtnTitle: 'HP and the matching defense to 252 EV / 31 IV, matching nature',
    closeModal: 'Close',
    modalTitleAtk: 'Choose attacker',
    modalTitleDef: 'Choose defender',
    moveModalTitle: 'Choose move',
    pokeSearchPlaceholder: 'Search by name or #ID…',
    moveSearchPlaceholder: 'Search move name…',
    loadingPoke: 'Loading Pokémon…',
    loadingMoves: 'Loading moves…',
    pickPoke: 'Choose Pokémon',
    pickHint: 'Tap to choose',
    pickMove: 'Choose move',
    pickMoveFirst: 'Choose an attacker first',
    change: 'Change',
    power: 'Power',
    physical: 'Physical',
    special: 'Special',
    status: 'Status',
    noPokemon: 'No Pokémon found.',
    noMove: 'No move found.',
    noMovesInGen: '{p} cannot learn any moves in Gen {g}.',
    pickAttackerFirst: 'Choose an attacker first.',
    natureNeutral: 'neutral',
    natureOff: 'only from Gen 3',
    resultsEmpty: 'Choose attacker, move and defender – the result shows up right away.',
    missingAtk: 'Attacker',
    missingMove: 'Move',
    missingDef: 'Defender',
    statusMove: 'Status moves do not deal direct damage.',
    noPower: 'This move has no fixed power (e.g. fixed damage or based on weight or HP). Enter a power on the move card.',
    moveTooNew: '{m} only exists from Gen {g}.',
    damage: 'Damage',
    ofHp: 'of {hp} HP',
    hpLeft: 'HP left after the hit',
    hpGone: 'fainted',
    noEffect: 'No effect',
    koHits: '{n}-hit KO',
    koSure: 'guaranteed',
    koChance: '{p}% chance',
    koSureAfter: 'guaranteed after {n} hits',
    koNone: 'No KO within 8 hits',
    critTitle: 'Critical hit',
    fixedDamage: 'Fixed damage',
    fixedDamageSub: 'always {n} HP – stats and crits do not matter',
    fixedNoType: 'Type ignored',
    effTitle: 'Type effectiveness',
    statsTitle: 'Stats used',
    eff0: 'No effect',
    effLow: 'Not very effective',
    eff1: 'Neutral',
    effHigh: 'Super effective',
    detailsSummary: 'All {n} damage rolls and how Gen {g} calculates',
    rollsLabel: 'Damage rolls without a crit',
    mechLabel: 'How Gen {g} calculates',
    level: 'Level',
    vs: 'vs.',
    statShort: { hp: 'HP', attack: 'Atk', defense: 'Def', sp_attack: 'SpA', sp_defense: 'SpD', speed: 'Spe', special: 'Spc' },
    noteIntro: 'Only exists from Gen {g}.',
    noteTypes: 'Type in Gen {g}: {old} (today {now})',
    noteStats: 'Base stats in Gen {g}: {list}',
    noteSpecial: 'Gen 1: one Special stat ({v}) for attack and defense',
    noteMoveType: 'Type in Gen {g}: {old} (today {now})',
    noteMovePower: 'Power in Gen {g}: {old} (today {now})',
    noteMoveClass: '{cls} in Gen {g} – up to Gen 3 the type decides',
    noteNotLearnable: '{p} cannot learn this move in Gen {g}.',
    noteHighCrit: 'Almost always crits in Gen 1 – the crit value is the realistic one.',
    noteExplosion: 'Halves the target\'s Defense in Gen 1–4.',
    noteBreaksScreens: 'Breaks Reflect and Light Screen – they do not count here.',
    genInfo: {
      1: 'Special stat for attack and defense · crits double the level · no natures, no weather · IV 31 = DV 15, EV 252 = full stat experience',
      2: 'Crits ×2, ignoring burn and screens · physical or special by type · no natures · IV 31 = DV 15, EV 252 = full stat experience',
      3: 'Crits ×2 · physical or special by type · random 85–100% applied last',
      4: 'Crits ×2 · physical or special per move',
      5: 'Crits ×2 · burn halves at the very end',
      6: 'Crits ×1.5 · Fairy type · Steel no longer resists Ghost and Dark',
      7: 'Crits ×1.5 · same formula as Gen 6',
      8: 'Crits ×1.5 · same formula as Gen 6',
      9: 'Crits ×1.5 · same formula as Gen 6',
    },
    mech: {
      1: ['One Special stat for attack and defense', 'Crits double the level and ignore burn, Reflect and Light Screen',
        'Attack or Defense above 255: both are divided by 4', 'Damage capped at 997 + 2, then STAB and type (rounded down per type)',
        'Random factor 217–255 out of 255 (39 rolls)', 'Gen 1 type chart: Bug and Poison 2× against each other, Ghost does not affect Psychic, Ice vs. Fire neutral'],
      2: ['Crits ×2, ignoring burn, Reflect and Light Screen', 'Physical or special by the move\'s type',
        'Attack or Defense above 255: both are divided by 4', 'Damage capped at 997 + 2, then weather, STAB and type',
        'Random factor 217–255 out of 255 (39 rolls)', 'Steel resists Ghost and Dark'],
      3: ['Physical or special by the move\'s type', 'Burn, screens and weather before the +2', 'Crits ×2, ignoring Reflect and Light Screen',
        'Then STAB and type, the random factor 85–100% comes last'],
      4: ['Physical or special per move', 'Burn, screens and weather before the +2', 'Crits ×2, ignoring Reflect and Light Screen',
        'Then random factor 85–100%, STAB and type'],
      5: ['Base damage + 2, then weather, crit ×2, random 85–100%, STAB, type', 'Burn halves at the end, screens halve only without a crit'],
      6: ['Base damage + 2, then weather, crit ×1.5, random 85–100%, STAB, type', 'Burn halves at the end, screens halve only without a crit',
        'Type chart with Fairy; Steel no longer resists Ghost and Dark'],
    },
  },
};
const tr = () => TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
const t = (key, vars) => {
  let s = tr()[key] ?? TRANSLATIONS.de[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
};
const isEn = () => window.LANG === 'en';
const $ = id => document.getElementById(id);

// ── Typen ─────────────────────────────────────────────────────────────────────
const TYPE_COLORS = {
  normal:'#bbbbaa', fire:'#ff421c', water:'#2c9be3', electric:'#ffdc00', grass:'#62bc5a', ice:'#74cfc0',
  fighting:'#bb5544', poison:'#9553cd', ground:'#a67439', flying:'#96caff', psychic:'#ff6380', bug:'#92c12a',
  rock:'#bbaa66', ghost:'#6e4370', dragon:'#5670be', dark:'#4e4545', steel:'#aaaabb', fairy:'#ec8fe6',
};
const TYPE_TEXT = { normal:'#404035', electric:'#504000', grass:'#1a3a10', ice:'#1a4040', flying:'#1a3050', bug:'#283010', rock:'#403020', steel:'#30303a', fairy:'#602050' };
const TYPE_DE = {
  normal:'Normal', fire:'Feuer', water:'Wasser', electric:'Elektro', grass:'Pflanze', ice:'Eis', fighting:'Kampf',
  poison:'Gift', ground:'Boden', flying:'Flug', psychic:'Psycho', bug:'Käfer', rock:'Gestein', ghost:'Geist',
  dragon:'Drache', dark:'Unlicht', steel:'Stahl', fairy:'Fee',
};
const cap = s => String(s || '').split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
const typeName = type => (isEn() ? cap(type) : (TYPE_DE[type] || cap(type)));
const typePill = type => `<span class="type-pill" style="background:${TYPE_COLORS[type] || '#888'};color:${TYPE_TEXT[type] || '#fff'}">${typeName(type)}</span>`;
const classTag = cls => cls ? `<span class="class-tag class-tag--${cls}">${t(cls)}</span>` : '';

// ── Wesen ─────────────────────────────────────────────────────────────────────
const NATURES = {
  Hardy:[null,null], Lonely:['attack','defense'], Brave:['attack','speed'], Adamant:['attack','sp_attack'], Naughty:['attack','sp_defense'],
  Bold:['defense','attack'], Docile:[null,null], Relaxed:['defense','speed'], Impish:['defense','sp_attack'], Lax:['defense','sp_defense'],
  Timid:['speed','attack'], Hasty:['speed','defense'], Serious:[null,null], Jolly:['speed','sp_attack'], Naive:['speed','sp_defense'],
  Modest:['sp_attack','attack'], Mild:['sp_attack','defense'], Quiet:['sp_attack','speed'], Bashful:[null,null], Rash:['sp_attack','sp_defense'],
  Calm:['sp_defense','attack'], Gentle:['sp_defense','defense'], Sassy:['sp_defense','speed'], Careful:['sp_defense','sp_attack'], Quirky:[null,null],
};
// Offizielle deutsche Namen
const NATURE_DE = {
  Hardy:'Robust', Lonely:'Solo', Brave:'Mutig', Adamant:'Hart', Naughty:'Frech',
  Bold:'Kühn', Docile:'Sanft', Relaxed:'Locker', Impish:'Pfiffig', Lax:'Lasch',
  Timid:'Scheu', Hasty:'Hastig', Serious:'Ernst', Jolly:'Froh', Naive:'Naiv',
  Modest:'Mäßig', Mild:'Mild', Quiet:'Ruhig', Bashful:'Zaghaft', Rash:'Hitzig',
  Calm:'Still', Gentle:'Zart', Sassy:'Forsch', Careful:'Sacht', Quirky:'Kauzig',
};

// ── Spieleditionen → Generation ──────────────────────────────────────────────
// Reihenfolge = Erscheinungsreihenfolge; wichtig für die alten Attackenwerte (past_values).
const VERSION_GROUPS = [
  ['red-green-japan',1], ['red-blue',1], ['blue-japan',1], ['yellow',1],
  ['gold-silver',2], ['crystal',2],
  ['ruby-sapphire',3], ['colosseum',3], ['firered-leafgreen',3], ['emerald',3], ['xd',3],
  ['diamond-pearl',4], ['platinum',4], ['heartgold-soulsilver',4],
  ['black-white',5], ['black-2-white-2',5],
  ['x-y',6], ['omega-ruby-alpha-sapphire',6],
  ['sun-moon',7], ['ultra-sun-ultra-moon',7], ['lets-go-pikachu-lets-go-eevee',7],
  ['sword-shield',8], ['the-isle-of-armor',8], ['the-crown-tundra',8], ['brilliant-diamond-shining-pearl',8], ['legends-arceus',8],
  ['scarlet-violet',9], ['the-teal-mask',9], ['the-indigo-disk',9], ['legends-za',9], ['mega-dimension',9], ['champions',9],
];
const VG_INDEX = new Map(VERSION_GROUPS.map(([name], i) => [name, i]));
// Diese Edition steht für die Werte einer Generation (jeweils die letzte Hauptedition)
const GEN_REF_VG = { 1:'yellow', 2:'crystal', 3:'xd', 4:'heartgold-soulsilver', 5:'black-2-white-2',
  6:'omega-ruby-alpha-sapphire', 7:'ultra-sun-ultra-moon', 8:'the-crown-tundra', 9:'the-indigo-disk' };
// Spin-offs mit eigenem Kampfsystem zählen nicht zu den erlernbaren Attacken
const LEARNSET_SKIP = new Set(['legends-za', 'mega-dimension', 'champions']);
const ROMAN = { i:1, ii:2, iii:3, iv:4, v:5, vi:6, vii:7, viii:8, ix:9, x:10 };
const genFromName = name => ROMAN[String(name || '').replace('generation-', '')] || 99;

// Attacken mit Sonderregeln
const EXPLOSION_MOVES = new Set(['explosion', 'self-destruct']);
const HIGH_CRIT_GEN1 = new Set(['slash', 'razor-leaf', 'karate-chop', 'crabhammer']);
const SCREEN_BREAKERS = { 'brick-break': 3, 'psychic-fangs': 7, 'raging-bull': 9 };
// Fester Schaden – unabhängig von Werten und Volltreffer
const FIXED_DAMAGE = { 'dragon-rage': () => 40, 'sonic-boom': () => 20, 'seismic-toss': lv => lv, 'night-shade': lv => lv };

// ── PokeAPI ───────────────────────────────────────────────────────────────────
const BASE_URL = 'https://pokeapi.co/api/v2';
const apiCache = new Map();
function apiFetch(url) {
  if (!apiCache.has(url)) {
    const p = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    p.catch(() => apiCache.delete(url));
    apiCache.set(url, p);
  }
  return apiCache.get(url);
}

const GEN_RANGES = {
  1:{limit:151,offset:0}, 2:{limit:100,offset:151}, 3:{limit:135,offset:251},
  4:{limit:107,offset:386}, 5:{limit:156,offset:493}, 6:{limit:72,offset:649},
  7:{limit:88,offset:721}, 8:{limit:96,offset:809}, 9:{limit:120,offset:905},
};
const GEN_LABELS = {
  de: { 1:'Kanto', 2:'Johto', 3:'Hoenn', 4:'Sinnoh', 5:'Einall', 6:'Kalos', 7:'Alola', 8:'Galar', 9:'Paldea' },
  en: { 1:'Kanto', 2:'Johto', 3:'Hoenn', 4:'Sinnoh', 5:'Unova', 6:'Kalos', 7:'Alola', 8:'Galar', 9:'Paldea' },
};
const spriteUrl = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;

const genListCache = new Map();
let allPokemonList = [];

async function loadGenList(gen) {
  if (genListCache.has(gen)) return genListCache.get(gen);
  const { limit, offset } = GEN_RANGES[gen];
  const d = await apiFetch(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
  // Namen aus pokemon-names.js (sofort da, auch offline) – vorher eine Anfrage je Pokémon
  const list = d.results.map((p, i) => {
    const id = offset + i + 1;
    return { name: p.name, id, gen, deName: window.pokemonName(id, p.name, 'de'), enName: window.pokemonName(id, p.name, 'en') || cap(p.name) };
  });
  genListCache.set(gen, list);
  return list;
}
async function loadAllPokemonBasic() {
  if (allPokemonList.length) return allPokemonList;
  const results = await Promise.allSettled(Object.keys(GEN_RANGES).map(g => loadGenList(+g)));
  allPokemonList = results.flatMap(r => (r.status === 'fulfilled' ? r.value : []));
  return allPokemonList;
}
const listName = p => (isEn() ? p.enName : (p.deName || p.enName));

const STAT_KEYS = { hp:'hp', attack:'attack', defense:'defense', 'special-attack':'sp_attack', 'special-defense':'sp_defense', speed:'speed', special:'special' };
const byslot = (a, b) => a.slot - b.slot;

async function fetchPokemon(name) {
  const d = await apiFetch(`${BASE_URL}/pokemon/${String(name).toLowerCase()}`);
  const sp = await apiFetch(`${BASE_URL}/pokemon-species/${d.species.name}`);
  const base = {};
  d.stats.forEach(s => { const k = STAT_KEYS[s.stat.name]; if (k) base[k] = s.base_stat; });
  return {
    id: d.id,
    name: d.name,
    deName: sp.names.find(n => n.language.name === 'de')?.name || null,
    enName: sp.names.find(n => n.language.name === 'en')?.name || cap(d.name),
    sprite: d.sprites?.front_default || spriteUrl(d.id),
    introGen: genFromName(sp.generation?.name),
    types: [...d.types].sort(byslot).map(x => x.type.name),
    // PokeAPI: „generation“ = letzte Generation, in der die alten Werte galten
    pastTypes: (d.past_types || []).map(e => ({ gen: genFromName(e.generation.name), types: [...e.types].sort(byslot).map(x => x.type.name) })),
    base,
    pastStats: (d.past_stats || []).map(e => ({
      gen: genFromName(e.generation.name),
      stats: Object.fromEntries(e.stats.map(s => [STAT_KEYS[s.stat.name], s.base_stat])),
    })),
    moves: d.moves || [],
  };
}
const pokeName = p => (isEn() ? p.enName : (p.deName || p.enName));

// Typen und Basiswerte so, wie sie in der gewählten Generation waren
function pokeForGen(p, gen) {
  const pastType = p.pastTypes.filter(e => e.gen >= gen).sort((a, b) => a.gen - b.gen)[0];
  const types = pastType ? pastType.types : p.types;
  const base = { ...p.base };
  for (const key of Object.keys(base)) {
    const hit = p.pastStats.filter(e => e.gen >= gen && e.stats[key] != null).sort((a, b) => a.gen - b.gen)[0];
    if (hit) base[key] = hit.stats[key];
  }
  if (gen === 1) {
    const special = p.pastStats.find(e => e.stats.special != null)?.stats.special ?? base.sp_attack;
    base.sp_attack = base.sp_defense = special;
  }
  return { types, base };
}

const moveCache = new Map();
async function fetchMove(name) {
  if (moveCache.has(name)) return moveCache.get(name);
  const d = await apiFetch(`${BASE_URL}/move/${name}`);
  const m = {
    name: d.name,
    deName: d.names.find(n => n.language.name === 'de')?.name || null,
    enName: d.names.find(n => n.language.name === 'en')?.name || cap(d.name),
    introGen: genFromName(d.generation?.name),
    type: d.type?.name || null,
    power: d.power || null,
    damageClass: d.damage_class?.name || null,
    // PokeAPI: Werte, die VOR dieser Edition galten
    past: (d.past_values || []).map(v => ({
      order: VG_INDEX.has(v.version_group?.name) ? VG_INDEX.get(v.version_group.name) : 999,
      type: v.type?.name || null,
      power: v.power ?? null,
    })),
  };
  moveCache.set(name, m);
  return m;
}
const moveName = m => (isEn() ? m.enName : (m.deName || m.enName));

// Typ, Stärke und Kategorie einer Attacke in der gewählten Generation
function moveForGen(m, gen) {
  const ref = VG_INDEX.get(GEN_REF_VG[gen]);
  const pick = field => {
    const later = m.past.filter(e => e[field] != null && e.order > ref).sort((a, b) => a.order - b.order)[0];
    return later ? later[field] : m[field];
  };
  const type = pick('type');
  const power = pick('power');
  return { type, power, damageClass: DMG.damageClassFor(gen, type, m.damageClass) };
}

function learnableMoveNames(p, gen) {
  const groups = new Set(VERSION_GROUPS.filter(([n, g]) => g === gen && !LEARNSET_SKIP.has(n)).map(([n]) => n));
  return (p.moves || [])
    .filter(m => m.version_group_details?.some(d => groups.has(d.version_group?.name)))
    .map(m => m.move?.name)
    .filter(Boolean);
}

function searchKey(value) {
  return String(value || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[\s-]+/g, '');
}

// ── Zustand ───────────────────────────────────────────────────────────────────
const state = {
  gen: 6,
  atk: null,
  def: null,
  move: null,
  cond: { burn: false, sun: false, rain: false, screens: false },
};
// Die Generation teilen sich Schadens- und Typen-Rechner
try {
  const saved = +(localStorage.getItem('hub-gen') || localStorage.getItem('dc-gen'));
  if (saved >= 1 && saved <= 9) state.gen = saved;
} catch (e) { /* ohne Speicher einfach Gen 6 */ }

// ── Eingaben lesen ────────────────────────────────────────────────────────────
function readNum(id, fallback, min, max) {
  const raw = String($(id).value).trim();
  if (raw === '') return fallback;
  const v = Math.floor(Number(raw));
  if (!Number.isFinite(v)) return fallback;
  return Math.min(max, Math.max(min, v));
}
const levelOf = role => readNum(`${role}-level`, 50, 1, 100);
const ivOf = id => readNum(id, 31, 0, 31);
const evOf = id => readNum(id, 0, 0, 252);
function natureSign(role, stat) {
  if (state.gen <= 2) return 0;
  const n = NATURES[$(`${role}-nature`).value];
  if (!n) return 0;
  return n[0] === stat ? 1 : n[1] === stat ? -1 : 0;
}

function statsOf(role) {
  const p = state[role];
  if (!p) return null;
  const { base } = pokeForGen(p, state.gen);
  const g = state.gen, L = levelOf(role);
  if (role === 'atk') {
    return {
      atk: DMG.calcStat(g, base.attack, ivOf('atk-atk-iv'), evOf('atk-atk-ev'), L, natureSign('atk', 'attack')),
      spa: DMG.calcStat(g, base.sp_attack, ivOf('atk-spa-iv'), evOf('atk-spa-ev'), L, natureSign('atk', 'sp_attack')),
    };
  }
  return {
    hp: DMG.calcHP(g, base.hp, ivOf('def-hp-iv'), evOf('def-hp-ev'), L),
    def: DMG.calcStat(g, base.defense, ivOf('def-def-iv'), evOf('def-def-ev'), L, natureSign('def', 'defense')),
    spd: DMG.calcStat(g, base.sp_defense, ivOf('def-spd-iv'), evOf('def-spd-ev'), L, natureSign('def', 'sp_defense')),
  };
}

// ── Anzeige: Generation und Bedingungen ───────────────────────────────────────
function renderGenControls() {
  const g = state.gen;
  document.querySelectorAll('.gen-chip').forEach(btn => {
    const on = +btn.dataset.gen === g;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(on));
  });
  $('gen-info').textContent = tr().genInfo[g];
  // Wetter gibt es erst ab Gen 2
  ['tog-sun', 'tog-rain'].forEach(id => {
    $(id).disabled = g < 2;
    $(id).closest('.tog').classList.toggle('is-off', g < 2);
  });
  // Wesen erst ab Gen 3
  ['atk-nature', 'def-nature'].forEach(id => {
    $(id).disabled = g <= 2;
    $(id).title = g <= 2 ? t('natureOff') : '';
  });
  $('atk-spa-label').textContent = g === 1 ? t('specialStat') : t('spaStat');
  $('def-spd-label').textContent = g === 1 ? t('specialStat') : t('spdStat');
}

function buildNatureSelects() {
  const short = tr().statShort;
  ['atk-nature', 'def-nature'].forEach(id => {
    const sel = $(id);
    const keep = sel.value || 'Hardy';
    sel.innerHTML = '';
    for (const [key, [up, down]] of Object.entries(NATURES)) {
      const name = isEn() ? key : NATURE_DE[key];
      const label = up ? `${name} (+${short[up]} −${short[down]})` : `${name} (${t('natureNeutral')})`;
      sel.appendChild(new Option(label, key));
    }
    sel.value = keep;
  });
}

// ── Anzeige: Pokémon und Attacke ──────────────────────────────────────────────
function renderPick(role) {
  const el = $(`${role}-display`);
  const p = state[role];
  if (!p) {
    el.classList.add('is-empty');
    el.innerHTML = `<span class="pick-plus" aria-hidden="true">+</span>
      <span class="pick-body"><span class="pick-name">${t('pickPoke')}</span><span class="pick-sub">${t('pickHint')}</span></span>`;
    return;
  }
  const { types, base } = pokeForGen(p, state.gen);
  const s = tr().statShort;
  const mini = role === 'atk'
    ? (state.gen === 1 ? `${s.attack} ${base.attack} · ${s.special} ${base.sp_attack}` : `${s.attack} ${base.attack} · ${s.sp_attack} ${base.sp_attack}`)
    : (state.gen === 1 ? `${s.hp} ${base.hp} · ${s.defense} ${base.defense} · ${s.special} ${base.sp_defense}`
      : `${s.hp} ${base.hp} · ${s.defense} ${base.defense} · ${s.sp_defense} ${base.sp_defense}`);
  el.classList.remove('is-empty');
  el.innerHTML = `<img class="pick-sprite" src="${p.sprite}" alt="">
    <span class="pick-body">
      <span class="pick-name">${pokeName(p)} <small>#${p.id}</small></span>
      <span class="pick-types">${types.map(typePill).join('')}</span>
      <span class="pick-sub">${mini}</span>
    </span>
    <span class="pick-change">${t('change')}</span>`;
}

function renderMovePick() {
  const el = $('move-display');
  const m = state.move;
  if (!m) {
    el.classList.add('is-empty');
    el.innerHTML = `<span class="pick-plus" aria-hidden="true">+</span>
      <span class="pick-body"><span class="pick-name">${t('pickMove')}</span><span class="pick-sub">${state.atk ? t('pickHint') : t('pickMoveFirst')}</span></span>`;
    return;
  }
  const g = moveForGen(m, state.gen);
  const stab = state.atk && g.type && pokeForGen(state.atk, state.gen).types.includes(g.type);
  el.classList.remove('is-empty');
  el.innerHTML = `<span class="pick-body">
      <span class="pick-name">${moveName(m)}</span>
      <span class="pick-types">${g.type ? typePill(g.type) : ''}${classTag(g.damageClass)}${stab ? '<span class="stab-tag">STAB</span>' : ''}</span>
      <span class="pick-sub">${t('power')} <b>${g.power ?? '–'}</b></span>
    </span>
    <span class="pick-change">${t('change')}</span>`;
}

// Hinweise, wenn die gewählte Generation andere Werte hat als heute
function pokeNotes(role) {
  const p = state[role];
  const notes = [];
  if (!p) return notes;
  const g = state.gen;
  if (p.introGen > g && p.introGen < 99) notes.push({ warn: true, text: t('noteIntro', { g: p.introGen }) });
  const now = { types: p.types, base: p.base };
  const then = pokeForGen(p, g);
  if (then.types.join('/') !== p.types.join('/')) {
    notes.push({ text: t('noteTypes', { g, old: then.types.map(typeName).join('/'), now: p.types.map(typeName).join('/') }) });
  }
  const s = tr().statShort;
  const keys = role === 'atk' ? ['attack', 'sp_attack'] : ['hp', 'defense', 'sp_defense'];
  if (g === 1) {
    notes.push({ text: t('noteSpecial', { v: then.base.sp_attack }) });
    keys.splice(keys.indexOf(role === 'atk' ? 'sp_attack' : 'sp_defense'), 1);
  }
  const diffs = keys.filter(k => then.base[k] !== now.base[k]).map(k => `${s[k]} ${then.base[k]} (${isEn() ? 'today' : 'heute'} ${now.base[k]})`);
  if (diffs.length) notes.push({ text: t('noteStats', { g, list: diffs.join(', ') }) });
  return notes;
}

function moveNotes() {
  const m = state.move;
  const notes = [];
  if (!m) return notes;
  const g = state.gen;
  if (m.introGen > g && m.introGen < 99) {
    notes.push({ warn: true, text: t('moveTooNew', { m: moveName(m), g: m.introGen }) });
    return notes;
  }
  const then = moveForGen(m, g);
  if (then.type !== m.type) notes.push({ text: t('noteMoveType', { g, old: typeName(then.type), now: typeName(m.type) }) });
  if (then.power !== m.power && then.power && m.power) notes.push({ text: t('noteMovePower', { g, old: then.power, now: m.power }) });
  if (g <= 3 && then.damageClass !== m.damageClass && then.damageClass !== 'status') {
    notes.push({ text: t('noteMoveClass', { g, cls: t(then.damageClass) }) });
  }
  if (state.atk && !learnableMoveNames(state.atk, g).includes(m.name)) {
    notes.push({ warn: true, text: t('noteNotLearnable', { p: pokeName(state.atk), g }) });
  }
  if (g === 1 && HIGH_CRIT_GEN1.has(m.name)) notes.push({ text: t('noteHighCrit') });
  if (g <= 4 && EXPLOSION_MOVES.has(m.name)) notes.push({ text: t('noteExplosion') });
  if (breaksScreens(m.name, g) && state.cond.screens) notes.push({ text: t('noteBreaksScreens') });
  return notes;
}
const breaksScreens = (name, gen) => SCREEN_BREAKERS[name] != null && gen >= SCREEN_BREAKERS[name];

function renderNote(id, notes) {
  const el = $(id);
  el.hidden = !notes.length;
  el.innerHTML = notes.map(n => `<span class="note${n.warn ? ' note--warn' : ''}">${n.text}</span>`).join('');
}

// ── Anzeige: Statuswerte ──────────────────────────────────────────────────────
function updateStats() {
  const a = statsOf('atk'), d = statsOf('def');
  $('atk-atk-final').textContent = a ? a.atk : '–';
  $('atk-spa-final').textContent = a ? a.spa : '–';
  $('def-hp-final').textContent = d ? d.hp : '–';
  $('def-def-final').textContent = d ? d.def : '–';
  $('def-spd-final').textContent = d ? d.spd : '–';
  const cls = state.move ? moveForGen(state.move, state.gen).damageClass : null;
  $('atk-atk-row').classList.toggle('is-used', cls === 'physical');
  $('atk-spa-row').classList.toggle('is-used', cls === 'special');
  $('def-def-row').classList.toggle('is-used', cls === 'physical');
  $('def-spd-row').classList.toggle('is-used', cls === 'special');
  $('def-hp-row').classList.toggle('is-used', !!cls && cls !== 'status');
}

function renderAll() {
  renderGenControls();
  renderPick('atk');
  renderPick('def');
  renderMovePick();
  renderNote('atk-note', pokeNotes('atk'));
  renderNote('def-note', pokeNotes('def'));
  renderNote('move-note', moveNotes());
  updateStats();
  calculate();
}

// ── Berechnung ────────────────────────────────────────────────────────────────
function calculate() {
  if (!state.atk || !state.def || !state.move) { renderMissing(); return; }
  const g = state.gen;
  const m = state.move;
  if (m.introGen > g && m.introGen < 99) { renderMessage(t('moveTooNew', { m: moveName(m), g: m.introGen })); return; }
  const mv = moveForGen(m, g);
  if (mv.damageClass === 'status') { renderMessage(t('statusMove')); return; }
  const override = readNum('move-power-override', 0, 0, 999);
  const power = override || mv.power;
  const fixed = !override && FIXED_DAMAGE[m.name];
  if (!power && !fixed) { renderMessage(t('noPower')); return; }

  const A = pokeForGen(state.atk, g), D = pokeForGen(state.def, g);
  const sa = statsOf('atk'), sd = statsOf('def');
  const physical = mv.damageClass === 'physical';
  const atk = physical ? sa.atk : sa.spa;
  const def = physical ? sd.def : sd.spd;
  const effs = DMG.typeEffs(mv.type, D.types, g);
  if (fixed) {
    // Gen 1 ignoriert hier sogar Immunitäten (Geowurf trifft Geist), ab Gen 2 zählen sie
    const immune = g >= 2 && DMG.product(effs) === 0;
    const dmg = immune ? 0 : fixed(levelOf('atk'));
    const rolls = new Array(DMG.rollCount(g)).fill(dmg);
    renderResults({ rolls, crits: rolls, hp: sd.hp, eff: immune ? 0 : null, stab: false, atk, def, power: null, physical, fixed: dmg });
    return;
  }
  const stab = A.types.includes(mv.type);
  const weather = g >= 2 ? (state.cond.sun ? 'sun' : state.cond.rain ? 'rain' : null) : null;
  const params = {
    gen: g, level: levelOf('atk'), power, atk, def, physical, stab, effs,
    burn: state.cond.burn, screens: state.cond.screens && !breaksScreens(m.name, g),
    weather, moveType: mv.type, explosion: g <= 4 && EXPLOSION_MOVES.has(m.name),
  };
  const rolls = DMG.damageRolls({ ...params, crit: false });
  const crits = DMG.damageRolls({ ...params, crit: true });
  renderResults({ rolls, crits, hp: sd.hp, eff: DMG.product(effs), stab, atk, def, power, physical });
}

// ── Ergebnis ──────────────────────────────────────────────────────────────────
const fmt1 = x => x.toLocaleString(isEn() ? 'en-US' : 'de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 });

function koInfo(rolls, hp) {
  if (rolls[rolls.length - 1] <= 0) return { title: t('noEffect'), sub: '', cls: 'ko-none' };
  const ko = DMG.koChance(rolls, hp);
  if (!ko) return { title: t('koNone'), sub: '', cls: 'ko-safe' };
  const cls = ko.hits === 1 ? 'ko-1' : ko.hits === 2 ? 'ko-2' : ko.hits === 3 ? 'ko-3' : 'ko-4';
  const title = t('koHits', { n: ko.hits });
  if (ko.chance >= 1) return { title, sub: t('koSure'), cls };
  const sure = DMG.sureHits(rolls, hp);
  const sub = t('koChance', { p: fmt1(ko.chance * 100) }) + (sure && sure <= 8 ? ` · ${t('koSureAfter', { n: sure })}` : '');
  return { title, sub, cls };
}

function effInfo(eff) {
  const label = eff === 0 ? t('eff0') : eff < 1 ? t('effLow') : eff === 1 ? t('eff1') : t('effHigh');
  const cls = eff === 0 ? 'eff-0' : eff < 0.5 ? 'eff-025' : eff < 1 ? 'eff-05' : eff === 1 ? 'eff-1' : eff < 4 ? 'eff-2' : 'eff-4';
  const num = eff === 0.25 ? '¼' : eff === 0.5 ? '½' : String(eff);
  return { label, cls, num: `${num}×` };
}

function renderMissing() {
  const missing = [];
  if (!state.atk) missing.push(['atk', t('missingAtk')]);
  if (!state.move) missing.push(['move', t('missingMove')]);
  if (!state.def) missing.push(['def', t('missingDef')]);
  $('results-area').innerHTML = `<div class="res-empty">
      <p>${t('resultsEmpty')}</p>
      <div class="res-missing">${missing.map(([k, label]) => `<button type="button" class="missing-chip" data-open="${k}"><span aria-hidden="true">+</span> ${label}</button>`).join('')}</div>
    </div>`;
}
function renderMessage(msg) {
  $('results-area').innerHTML = `<div class="res-empty"><p>${msg}</p></div>`;
}

function renderResults(r) {
  const { rolls, crits, hp } = r;
  const n = rolls.length;
  const min = rolls[0], max = rolls[n - 1];
  const minP = min / hp * 100, maxP = max / hp * 100;
  const ko = koInfo(rolls, hp), koCrit = koInfo(crits, hp);
  // Fester Schaden: Typ zählt nur für Immunitäten
  const eff = r.eff == null ? { label: t('fixedNoType'), cls: 'eff-1', num: '–' } : effInfo(r.eff);
  const s = tr().statShort;
  const g = state.gen;

  // KP-Leiste: grün = bleibt sicher, gelb gestreift = hängt vom Wurf ab, dunkel = sicher weg
  const gone = Math.min(100, minP);
  const maybe = Math.min(100, maxP) - gone;
  const left = Math.max(0, 100 - gone - maybe);
  const restHi = Math.max(0, 100 - minP), restLo = Math.max(0, 100 - maxP);
  const restText = restHi <= 0 ? t('hpGone') : restLo === restHi ? `${fmt1(restLo)} %` : `${fmt1(restLo)} – ${fmt1(restHi)} %`;
  const hpColor = restHi > 50 ? 'var(--hp-green)' : restHi > 20 ? 'var(--hp-yellow)' : 'var(--hp-red)';

  const atkLabel = g === 1 && !r.physical ? s.special : r.physical ? s.attack : s.sp_attack;
  const defLabel = g === 1 && !r.physical ? s.special : r.physical ? s.defense : s.sp_defense;
  const mech = tr().mech[Math.min(6, g)] || [];

  $('results-area').innerHTML = `
    <div class="res-matchup">
      <img src="${state.atk.sprite}" alt=""><b>${pokeName(state.atk)}</b>
      <span class="res-move">${moveName(state.move)}</span>
      <span class="res-vs">${t('vs')}</span>
      <img src="${state.def.sprite}" alt=""><b>${pokeName(state.def)}</b>
    </div>
    <div class="res-main">
      <div class="res-dmg">
        <span class="res-label">${t('damage')}</span>
        <span class="res-num">${min === max ? min : `${min} – ${max}`}</span>
        <span class="res-pct">${min === max ? fmt1(minP) : `${fmt1(minP)} – ${fmt1(maxP)}`} % <small>${t('ofHp', { hp })}</small></span>
      </div>
      <div class="res-ko ${ko.cls}">
        <span class="res-ko-title">${ko.title}</span>
        ${ko.sub ? `<span class="res-ko-sub">${ko.sub}</span>` : ''}
      </div>
    </div>
    <div class="hp-wrap">
      <div class="hp-bar" role="img" aria-label="${t('hpLeft')}: ${restText}">
        <span class="hp-left" style="width:${left}%;background:${hpColor}"></span><span class="hp-maybe" style="width:${maybe}%"></span><span class="hp-gone" style="width:${gone}%"></span>
      </div>
      <div class="hp-caption">${t('hpLeft')}: <b>${restText}</b></div>
    </div>
    <div class="res-tiles">
      <div class="res-tile">
        <span class="rt-label">${t('critTitle')}</span>
        <b>${crits[0] === crits[crits.length - 1] ? crits[0] : `${crits[0]} – ${crits[crits.length - 1]}`}</b>
        <span class="rt-sub ${koCrit.cls}">${koCrit.title}${koCrit.sub ? ` · ${koCrit.sub}` : ''}</span>
      </div>
      <div class="res-tile">
        <span class="rt-label">${t('effTitle')}</span>
        <b>${eff.num}</b>
        <span class="rt-sub"><span class="eff-tag ${eff.cls}">${eff.label}</span>${r.stab ? '<span class="stab-tag">STAB</span>' : ''}</span>
      </div>
      <div class="res-tile">
        <span class="rt-label">${t('statsTitle')}</span>
        ${r.fixed != null
          ? `<b>${t('fixedDamage')}</b><span class="rt-sub">${r.fixed > 0 ? t('fixedDamageSub', { n: r.fixed }) : t('eff0')}</span>`
          : `<b>${atkLabel} ${r.atk} → ${defLabel} ${r.def}</b><span class="rt-sub">${t('power')} ${r.power} · ${t('level')} ${levelOf('atk')}</span>`}
      </div>
    </div>
    <details class="res-details">
      <summary>${t('detailsSummary', { n, g })}</summary>
      <div class="rd-block">
        <span class="rd-label">${t('rollsLabel')}</span>
        <div class="rolls">${rolls.join(' · ')}</div>
      </div>
      <div class="rd-block">
        <span class="rd-label">${t('mechLabel', { g })}</span>
        <ul class="mech-list">${mech.map(x => `<li>${x}</li>`).join('')}</ul>
      </div>
    </details>`;
}

// ── Pokémon-Auswahl ───────────────────────────────────────────────────────────
const pokeModal = $('pokemon-modal');
const pokeList = $('pokemon-list');
const pokeLoading = $('modal-loading');
const genSel = $('generation-select');
const pokeSearch = $('pokemon-search');
let modalTarget = null;
let currentGenList = [];
let searchDebounce = null;
let lastFocus = null;

function openModal(modal, focusEl) {
  lastFocus = document.activeElement;
  modal.hidden = false;
  // Am Handy nicht sofort die Tastatur aufklappen – sie würde die halbe Liste verdecken
  if (!matchMedia('(pointer: coarse)').matches) setTimeout(() => focusEl.focus(), 60);
}
function closeModal(modal) {
  modal.hidden = true;
  if (lastFocus) lastFocus.focus();
}

async function openPokeModal(target) {
  modalTarget = target;
  genSel.value = String(state.gen);
  $('modal-title').textContent = target === 'atk' ? t('modalTitleAtk') : t('modalTitleDef');
  pokeSearch.value = '';
  openModal(pokeModal, pokeSearch);
  await loadAndRenderGen(+genSel.value);
}

async function loadAndRenderGen(gen) {
  pokeLoading.hidden = false;
  pokeList.innerHTML = '';
  try {
    currentGenList = await loadGenList(gen);
  } catch (e) {
    currentGenList = [];
  }
  pokeLoading.hidden = true;
  renderPokeList(currentGenList, false);
}

function renderPokeList(list, showHeaders) {
  pokeList.innerHTML = '';
  if (!list.length) {
    pokeList.innerHTML = `<li class="list-empty">${t('noPokemon')}</li>`;
    return;
  }
  const labels = GEN_LABELS[window.LANG] || GEN_LABELS.de;
  let lastGen = null;
  const frag = document.createDocumentFragment();
  list.forEach(p => {
    if (showHeaders && p.gen !== lastGen) {
      lastGen = p.gen;
      const h = document.createElement('li');
      h.className = 'list-gen-header';
      h.textContent = p.gen ? `Gen ${p.gen} · ${labels[p.gen]}` : '';
      frag.appendChild(h);
    }
    const li = document.createElement('li');
    li.innerHTML = `<button type="button" class="poke-item"><img src="${spriteUrl(p.id)}" alt="" loading="lazy"><span class="pi-name">${listName(p)}</span><span class="pi-id">#${p.id}</span></button>`;
    li.firstChild.addEventListener('click', () => choosePokemon(p.name));
    frag.appendChild(li);
  });
  pokeList.appendChild(frag);
}

// Neueste Auswahl je Seite: eine ältere, langsamere Antwort darf eine neuere nicht überschreiben
const chooseSeq = {};
async function choosePokemon(name) {
  const target = modalTarget;
  const seq = chooseSeq[target] = (chooseSeq[target] || 0) + 1;
  closeModal(pokeModal);
  try {
    const full = await fetchPokemon(name);
    if (seq !== chooseSeq[target]) return;
    state[target] = full;
    renderAll();
  } catch (e) {
    console.error(e);
  }
}

async function renderPokemonSearch() {
  const q = pokeSearch.value.trim().toLowerCase();
  if (!q) { renderPokeList(currentGenList, false); return; }
  const key = searchKey(q);
  pokeLoading.hidden = false;
  const all = await loadAllPokemonBasic();
  pokeLoading.hidden = true;
  const filtered = all
    .filter(p => searchKey(p.deName).includes(key) || searchKey(p.enName).includes(key) || searchKey(p.name).includes(key) || String(p.id) === q.replace('#', ''))
    .sort((a, b) => a.id - b.id);
  renderPokeList(filtered, true);
}

genSel.addEventListener('change', () => loadAndRenderGen(+genSel.value));
pokeSearch.addEventListener('input', () => {
  clearTimeout(searchDebounce);
  searchDebounce = setTimeout(renderPokemonSearch, 180);
});
$('atk-display').addEventListener('click', () => openPokeModal('atk'));
$('def-display').addEventListener('click', () => openPokeModal('def'));
$('close-modal').addEventListener('click', () => closeModal(pokeModal));
pokeModal.addEventListener('click', e => { if (e.target === pokeModal) closeModal(pokeModal); });

// ── Attacken-Auswahl ──────────────────────────────────────────────────────────
const moveModal = $('move-modal');
const moveListEl = $('move-list');
const moveLoading = $('move-loading');
const moveSearch = $('move-search');
let movePool = [];
let moveSearchDebounce = null;

async function openMoveModal() {
  moveSearch.value = '';
  moveListEl.innerHTML = '';
  openModal(moveModal, moveSearch);
  if (!state.atk) { renderMoveList([], t('pickAttackerFirst')); return; }
  const names = learnableMoveNames(state.atk, state.gen);
  if (!names.length) { renderMoveList([], t('noMovesInGen', { p: pokeName(state.atk), g: state.gen })); return; }
  moveLoading.hidden = false;
  const results = await Promise.allSettled(names.map(fetchMove));
  movePool = results.filter(x => x.status === 'fulfilled').map(x => x.value);
  // Schadens-Attacken zuerst, jeweils alphabetisch
  const isStatus = m => moveForGen(m, state.gen).damageClass === 'status';
  movePool.sort((a, b) => (isStatus(a) - isStatus(b)) || moveName(a).localeCompare(moveName(b), window.LANG));
  moveLoading.hidden = true;
  renderMoveList(filterMoves());
}

function filterMoves() {
  const q = searchKey(moveSearch.value);
  if (!q) return movePool;
  return movePool.filter(m => searchKey(m.deName).includes(q) || searchKey(m.enName).includes(q) || searchKey(m.name).includes(q));
}

function renderMoveList(moves, emptyMessage) {
  moveListEl.innerHTML = '';
  if (!moves.length) {
    moveListEl.innerHTML = `<div class="list-empty">${emptyMessage || t('noMove')}</div>`;
    return;
  }
  const frag = document.createDocumentFragment();
  moves.forEach(m => {
    const g = moveForGen(m, state.gen);
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'move-item';
    btn.innerHTML = `<span class="mi-name">${moveName(m)}</span>
      ${g.type ? typePill(g.type) : ''}
      ${classTag(g.damageClass)}
      <span class="mi-power">${g.power || '–'}</span>`;
    btn.addEventListener('click', () => {
      state.move = m;
      $('move-power-override').value = '';
      closeModal(moveModal);
      renderAll();
    });
    frag.appendChild(btn);
  });
  moveListEl.appendChild(frag);
}

moveSearch.addEventListener('input', () => {
  clearTimeout(moveSearchDebounce);
  moveSearchDebounce = setTimeout(() => { if (state.atk) renderMoveList(filterMoves()); }, 150);
});
$('move-display').addEventListener('click', openMoveModal);
$('close-move-modal').addEventListener('click', () => closeModal(moveModal));
moveModal.addEventListener('click', e => { if (e.target === moveModal) closeModal(moveModal); });

document.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (!pokeModal.hidden) closeModal(pokeModal);
  else if (!moveModal.hidden) closeModal(moveModal);
});

// Fehlende Auswahl direkt aus dem Ergebnis öffnen
$('results-area').addEventListener('click', e => {
  const btn = e.target.closest('[data-open]');
  if (!btn) return;
  if (btn.dataset.open === 'move') openMoveModal();
  else openPokeModal(btn.dataset.open);
});

// ── Bedienelemente ────────────────────────────────────────────────────────────
document.querySelectorAll('.gen-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    state.gen = +btn.dataset.gen;
    try { localStorage.setItem('hub-gen', String(state.gen)); } catch (e) { /* egal */ }
    renderAll();
  });
});

const COND_IDS = { 'tog-burn': 'burn', 'tog-sun': 'sun', 'tog-rain': 'rain', 'tog-screens': 'screens' };
Object.entries(COND_IDS).forEach(([id, key]) => {
  $(id).addEventListener('change', () => {
    state.cond[key] = $(id).checked;
    // Sonne und Regen schließen sich aus
    if (key === 'sun' && state.cond.sun) { state.cond.rain = false; $('tog-rain').checked = false; }
    if (key === 'rain' && state.cond.rain) { state.cond.sun = false; $('tog-sun').checked = false; }
    renderNote('move-note', moveNotes());
    calculate();
  });
});

$('swap-btn').addEventListener('click', () => {
  [state.atk, state.def] = [state.def, state.atk];
  const [la, ld] = [$('atk-level').value, $('def-level').value];
  $('atk-level').value = ld;
  $('def-level').value = la;
  const [na, nd] = [$('atk-nature').value, $('def-nature').value];
  $('atk-nature').value = nd;
  $('def-nature').value = na;
  renderAll();
});

$('def-worst-case-btn').addEventListener('click', () => {
  const special = state.move && moveForGen(state.move, state.gen).damageClass === 'special';
  $('def-hp-ev').value = 252;
  $('def-hp-iv').value = 31;
  $('def-def-ev').value = special ? 0 : 252;
  $('def-def-iv').value = 31;
  $('def-spd-ev').value = special ? 252 : 0;
  $('def-spd-iv').value = 31;
  $('def-nature').value = special ? 'Calm' : 'Bold';
  updateStats();
  calculate();
});

['atk-level', 'atk-nature', 'atk-atk-ev', 'atk-atk-iv', 'atk-spa-ev', 'atk-spa-iv',
  'def-level', 'def-nature', 'def-hp-ev', 'def-hp-iv', 'def-def-ev', 'def-def-iv', 'def-spd-ev', 'def-spd-iv',
  'move-power-override'].forEach(id => {
  $(id).addEventListener('input', () => { updateStats(); calculate(); });
});

// ── Sprache ───────────────────────────────────────────────────────────────────
function applyLang() {
  const dict = tr();
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = dict[el.dataset.i18n];
    if (typeof v === 'string') el.textContent = v;
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const v = dict[el.dataset.i18nPlaceholder];
    if (typeof v === 'string') el.placeholder = v;
  });
  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const v = dict[el.dataset.i18nTitle];
    if (typeof v === 'string') el.title = v;
  });
  $('lang-toggle').textContent = window.LANG.toUpperCase();
  buildNatureSelects();
  renderAll();
}

$('lang-toggle').addEventListener('click', () => {
  window.LANG = window.LANG === 'de' ? 'en' : 'de';
  localStorage.setItem('hub-lang', window.LANG);
  document.documentElement.lang = window.LANG;
  applyLang();
});

applyLang();
