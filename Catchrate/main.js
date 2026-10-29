import { getGenerationList } from "../Pokelocke/pokeapi.js";

window.LANG = localStorage.getItem('hub-lang') || 'de';
document.documentElement.lang = window.LANG;

const TRANSLATIONS = {
  de: {
    title: 'Fangrate-Rechner',
    subtitle: 'Berechne die Fangwahrscheinlichkeit für jeden Ball in der aktuellen Kampfsituation.',
    sectionPoke: 'Pokémon auswählen',
    sectionGame: 'Spiel auswählen',
    sectionBattle: 'Kampfbedingungen',
    sectionBalls: 'Fangwahrscheinlichkeit nach Ball',
    noPoke: 'Wähle zuerst ein Pokémon aus, um die Fangwahrscheinlichkeiten zu sehen.',
    hpLabel: 'KP des Gegners',
    statusLabel: 'Statusproblem',
    statusNone: 'Keins',
    statusSleep: 'Schlaf',
    statusFreeze: 'Eis',
    statusParalysis: 'Paralyse',
    statusPoison: 'Gift',
    statusBurn: 'Brand',
    falseSwipeBtn: 'Trugschlag (1 KP)',
    falseSwipeHint: 'Trugschlag aktiv – KP werden als 1 gerechnet',
    specialCondLabel: 'Sonderbedingungen',
    togFirstTurn: '1. Zug',
    togDark: 'Dunkel / Höhle',
    togDiving: 'Tauchen',
    togCaught: 'Schon gefangen',
    togFishing: 'Angeln',
    togMoon: 'Mondstein-Evo',
    togGender: 'Gleiche Gattung',
    togUB: 'Ultra-Bestie',
    enemyLevelLabel: 'Gegner Level',
    playerLevelLabel: 'Eigenes Level',
    turnsLabel: 'Runden (Zeitball)',
    modalTitle: 'Pokémon auswählen',
    close: 'Schließen',
    modalSearchPlaceholder: 'Nach Pokémon suchen…',
    genFilterAll: 'Alle',
    pokeEmptyHint: 'Noch kein Pokémon ausgewählt.',
    pokePickBtn: 'Pokémon wählen',
    pokeChangeBtn: 'Pokémon wechseln',
    pokeLoadingHint: 'Lade…',
    pokeLoadError: 'Fehler beim Laden – bitte erneut versuchen.',
    pokeListLoading: 'Lade Pokémon…',
    pokeListEmpty: 'Kein Pokémon gefunden.',
    catchRateLabel: 'Fangrate:',
    weightLabel: 'Gewicht:',
    speedLabel: 'Initiative:',
    throwsLabel: 'Würfe',
    throws50: '50 % Erfolg',
    throws90: '90 % Erfolg',
    throws99: '99 % Erfolg',
    throws50note: 'Jeder 2. Kampf endet bis dahin mit Fang',
    throws90note: '9 von 10 Spielern haben es bis dahin gefangen',
    throws99note: 'Nur noch 1 von 100 braucht danach weitere Würfe',
    // Game options
    gen1group: 'Generation 1 – Kanto',
    gen2group: 'Generation 2 – Johto',
    gen3group: 'Generation 3 – Hoenn / Kanto',
    gen4group: 'Generation 4 – Sinnoh / Johto',
    gen5group: 'Generation 5 – Einall',
    gen6group: 'Generation 6 – Kalos / Hoenn',
    gen7group: 'Generation 7 – Alola',
    gen8group: 'Generation 8 – Galar / Sinnoh',
    gen9group: 'Generation 9 – Paldea',
    gameRby: 'Rot / Blau / Gelb',
    gameGsc: 'Gold / Silber / Kristall',
    gameRse: 'Rubin / Saphir / Smaragd',
    gameFrlg: 'Feuerrot / Blattgrün',
    gameDpp: 'Diamant / Perle / Platin',
    gameHgss: 'HeartGold / SoulSilver',
    gameBw: 'Schwarz / Weiß',
    gameBw2: 'Schwarz 2 / Weiß 2',
    gameXy: 'X / Y',
    gameOras: 'Omega Rubin / Alpha Saphir',
    gameSm: 'Sonne / Mond',
    gameUsum: 'Ultra-Sonne / Ultra-Mond',
    gameSwsh: 'Schwert / Schild',
    gameBdsp: 'Brillanter Diamant / Leuchtende Perle',
    gameSv: 'Karmesin / Purpur',
  },
  en: {
    title: 'Catch Rate Calculator',
    subtitle: 'Calculate the catch probability for each ball in the current battle situation.',
    sectionPoke: 'Select Pokémon',
    sectionGame: 'Select Game',
    sectionBattle: 'Battle Conditions',
    sectionBalls: 'Catch Probability by Ball',
    noPoke: 'Choose a Pokémon first to see catch probabilities.',
    hpLabel: 'Enemy HP',
    statusLabel: 'Status Condition',
    statusNone: 'None',
    statusSleep: 'Sleep',
    statusFreeze: 'Freeze',
    statusParalysis: 'Paralysis',
    statusPoison: 'Poison',
    statusBurn: 'Burn',
    falseSwipeBtn: 'False Swipe (1 HP)',
    falseSwipeHint: 'False Swipe active – HP counted as 1',
    specialCondLabel: 'Special Conditions',
    togFirstTurn: 'First turn',
    togDark: 'Dark / Cave',
    togDiving: 'Diving',
    togCaught: 'Already caught',
    togFishing: 'Fishing',
    togMoon: 'Moon Stone Evo',
    togGender: 'Same gender',
    togUB: 'Ultra Beast',
    enemyLevelLabel: 'Enemy Level',
    playerLevelLabel: 'Player Level',
    turnsLabel: 'Turns (Timer Ball)',
    modalTitle: 'Choose Pokémon',
    close: 'Close',
    modalSearchPlaceholder: 'Search Pokémon…',
    genFilterAll: 'All',
    pokeEmptyHint: 'No Pokémon selected yet.',
    pokePickBtn: 'Choose Pokémon',
    pokeChangeBtn: 'Change Pokémon',
    pokeLoadingHint: 'Loading…',
    pokeLoadError: 'Error loading – please try again.',
    pokeListLoading: 'Loading Pokémon…',
    pokeListEmpty: 'No Pokémon found.',
    catchRateLabel: 'Catch rate:',
    weightLabel: 'Weight:',
    speedLabel: 'Speed:',
    throwsLabel: 'throws',
    throws50: '50% success',
    throws90: '90% success',
    throws99: '99% success',
    throws50note: '1 in 2 battles end in a catch by then',
    throws90note: '9 out of 10 trainers have caught it by then',
    throws99note: 'Only 1 in 100 still needs more throws after that',
    // Game options
    gen1group: 'Generation 1 – Kanto',
    gen2group: 'Generation 2 – Johto',
    gen3group: 'Generation 3 – Hoenn / Kanto',
    gen4group: 'Generation 4 – Sinnoh / Johto',
    gen5group: 'Generation 5 – Unova',
    gen6group: 'Generation 6 – Kalos / Hoenn',
    gen7group: 'Generation 7 – Alola',
    gen8group: 'Generation 8 – Galar / Sinnoh',
    gen9group: 'Generation 9 – Paldea',
    gameRby: 'Red / Blue / Yellow',
    gameGsc: 'Gold / Silver / Crystal',
    gameRse: 'Ruby / Sapphire / Emerald',
    gameFrlg: 'FireRed / LeafGreen',
    gameDpp: 'Diamond / Pearl / Platinum',
    gameHgss: 'HeartGold / SoulSilver',
    gameBw: 'Black / White',
    gameBw2: 'Black 2 / White 2',
    gameXy: 'X / Y',
    gameOras: 'Omega Ruby / Alpha Sapphire',
    gameSm: 'Sun / Moon',
    gameUsum: 'Ultra Sun / Ultra Moon',
    gameSwsh: 'Sword / Shield',
    gameBdsp: 'Brilliant Diamond / Shining Pearl',
    gameSv: 'Scarlet / Violet',
  }
};

const API              = 'https://pokeapi.co/api/v2';
const ITEMS_SPRITE_URL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';
const POKE_SPRITE_URL  = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

// ── Helper functions ──────────────────────────────────────────────────────
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

// Typfarben und -namen wie im restlichen Hub (Save-Viewer, Team, Duo): [Farbe, Deutsch, Englisch]
const TYPES = {
  normal: ['#bbbbaa', 'Normal', 'Normal'],   fire: ['#ff421c', 'Feuer', 'Fire'],         water: ['#2c9be3', 'Wasser', 'Water'],
  electric: ['#ffdc00', 'Elektro', 'Electric'], grass: ['#62bc5a', 'Pflanze', 'Grass'],   ice: ['#74cfc0', 'Eis', 'Ice'],
  fighting: ['#bb5544', 'Kampf', 'Fighting'], poison: ['#9553cd', 'Gift', 'Poison'],      ground: ['#a67439', 'Boden', 'Ground'],
  flying: ['#96caff', 'Flug', 'Flying'],      psychic: ['#ff6380', 'Psycho', 'Psychic'],  bug: ['#92c12a', 'Käfer', 'Bug'],
  rock: ['#bbaa66', 'Gestein', 'Rock'],       ghost: ['#6e4370', 'Geist', 'Ghost'],       dragon: ['#5670be', 'Drache', 'Dragon'],
  dark: ['#4e4545', 'Unlicht', 'Dark'],       steel: ['#aaaabb', 'Stahl', 'Steel'],       fairy: ['#ec8fe6', 'Fee', 'Fairy'],
};
function typeBadge(t) {
  const d = TYPES[t];
  if (!d) return `<span class="poke-type">${capitalize(t)}</span>`;
  return `<span class="poke-type" style="--c:${d[0]}">${window.LANG === 'en' ? d[2] : d[1]}</span>`;
}
const SWAP_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 4 3 8l4 4"/><path d="M3 8h13a4 4 0 0 1 4 4"/><path d="m17 20 4-4-4-4"/><path d="M21 16H8a4 4 0 0 1-4-4"/></svg>';

function updateSliderStyle(v) {
  const pct  = (v - 1) / 99 * 100;
  const fill = v > 50 ? '#50e880' : v > 20 ? '#e8b820' : '#f05050';
  const empty = 'rgba(var(--t-ink), 0.07)';
  document.getElementById('hp-slider').style.background =
    `linear-gradient(to right, ${fill} ${pct}%, ${empty} ${pct}%)`;
}
// Texts and URLs from PokeAPI that end up in HTML
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// Nest Ball: Gen 3–4 (40 − level) ÷ 10 (pokeemerald, pokeplatinum), Gen 5+ (41 − level) ÷ 10; at least 1×
function nestMult(level, gen) { return Math.max(1, ((gen <= 4 ? 40 : 41) - Math.max(1, level)) / 10); }
// Timer Ball. turns = current round (1 = first round, none passed yet). Gen 3–4: (rounds passed + 10) ÷ 10
// (pokeemerald: battleTurnCounter starts at 0); Gen 5+: 1 + rounds passed × 1229/4096. Capped at 4×.
function timerMult(turns, formulaGen) {
  const passed = Math.max(0, turns - 1);
  return Math.min(4, formulaGen >= 5 ? 1 + passed * 1229 / 4096 : (passed + 10) / 10);
}
// Level Ball as in the games (pokecrystal, pokeheartgold), integer halving:
// own level > enemy ×2, own/2 > enemy ×4, own/4 > enemy ×8
function levelMult(pl, el) {
  if (pl <= el) return 1;
  if (Math.floor(pl / 2) <= el) return 2;
  return Math.floor(pl / 4) <= el ? 4 : 8;
}
// Heavy Ball, added to the catch rate. Gen 2 (pokecrystal): < 102.4 kg −20, < 204.8 ±0, then +20/+30/+40.
// HGSS (pokeheartgold): everything below 204.8 kg gets −20 (a bug checks the catch rate instead of the weight).
function heavyBonus(kg, gen) {
  if (kg >= 409.6) return 40;
  if (kg >= 307.2) return 30;
  if (kg >= 204.8) return 20;
  return gen === 4 || kg < 102.4 ? -20 : 0;
}

// ── Game definitions ──────────────────────────────────────────────────────
// formula: 1=Gen1, 2=Gen2, 3=Gen3-RSE/FRLG, 4=Gen4-5, 6=Gen6+
const GAMES = [
  { id:'rby',  gen:1, label:'Rot / Blau / Gelb',                     formula:1, maxDex:151,
    balls:['poke','great','ultra','master','safari'] },
  { id:'gsc',  gen:2, label:'Gold / Silber / Kristall',              formula:2, maxDex:251,
    balls:['poke','great','ultra','master','safari','fast','heavy','level','love','lure','moon','friend','sport'] },
  { id:'rse',  gen:3, label:'Rubin / Saphir / Smaragd',              formula:3, maxDex:386,
    balls:['poke','great','ultra','master','safari','net','dive','nest','repeat','timer','luxury','premier'] },
  { id:'frlg', gen:3, label:'Feuerrot / Blattgrün',                  formula:3, maxDex:386,
    balls:['poke','great','ultra','master','safari','net','dive','nest','repeat','timer','luxury','premier'] },
  { id:'dpp',  gen:4, label:'Diamant / Perle / Platin',              formula:4, maxDex:493,
    balls:['poke','great','ultra','master','safari','net','dive','nest','repeat','timer','luxury','premier','dusk','heal','quick'] },
  { id:'hgss', gen:4, label:'HeartGold / SoulSilver',                formula:4, maxDex:493,
    balls:['poke','great','ultra','master','safari','net','dive','nest','repeat','timer','luxury','premier','dusk','heal','quick','fast','heavy','level','love','lure','moon','friend','sport'] },
  { id:'bw',   gen:5, label:'Schwarz / Weiß',                        formula:5, maxDex:649,
    balls:['poke','great','ultra','master','net','dive','nest','repeat','timer','luxury','premier','dusk','heal','quick','dream'] },
  { id:'bw2',  gen:5, label:'Schwarz 2 / Weiß 2',                    formula:5, maxDex:649,
    balls:['poke','great','ultra','master','safari','net','dive','nest','repeat','timer','luxury','premier','dusk','heal','quick','sport','dream'] },
  { id:'xy',   gen:6, label:'X / Y',                                 formula:6, maxDex:721,
    balls:['poke','great','ultra','master','safari','net','dive','nest','repeat','timer','luxury','premier','dusk','heal','quick','cherish','friend','dream'] },
  { id:'oras', gen:6, label:'Omega Rubin / Alpha Saphir',            formula:6, maxDex:721,
    balls:['poke','great','ultra','master','safari','net','dive','nest','repeat','timer','luxury','premier','dusk','heal','quick','cherish','friend','dream'] },
  { id:'sm',   gen:7, label:'Sonne / Mond',                          formula:6, maxDex:809,
    balls:['poke','great','ultra','master','safari','net','dive','nest','repeat','timer','luxury','premier','dusk','heal','quick','cherish','friend','dream','beast'] },
  { id:'usum', gen:7, label:'Ultra-Sonne / Ultra-Mond',              formula:6, maxDex:809,
    balls:['poke','great','ultra','master','safari','net','dive','nest','repeat','timer','luxury','premier','dusk','heal','quick','cherish','friend','dream','beast'] },
  { id:'swsh', gen:8, label:'Schwert / Schild',                      formula:6, maxDex:905,
    balls:['poke','great','ultra','master','safari','net','dive','nest','repeat','timer','luxury','premier','dusk','heal','quick','cherish','sport','fast','heavy','level','love','lure','moon','dream','beast'] },
  { id:'bdsp', gen:8, label:'Brillanter Diamant / Leuchtende Perle', formula:4, maxDex:493,
    balls:['poke','great','ultra','master','safari','net','dive','nest','repeat','timer','luxury','premier','dusk','heal','quick','sport'] },
  { id:'sv',   gen:9, label:'Karmesin / Purpur',                     formula:6, maxDex:1025,
    balls:['poke','great','ultra','master','net','dive','nest','repeat','timer','luxury','premier','dusk','heal','quick','cherish','moon','love','lure','fast','level','heavy','dream','beast','sport'] },
];

let selectedGameId = 'sv';
function currentGame() { return GAMES.find(g => g.id === selectedGameId) || GAMES.at(-1); }
function gameLabel(game) {
  const t = TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
  return t['game' + game.id[0].toUpperCase() + game.id.slice(1)] || game.label;
}

// ── Ball definitions ──────────────────────────────────────────────────────
// mult(ctx) returns the ball multiplier; additive:true means it's added to
// capture_rate before the formula instead of multiplied.
const BALLS = [
  { id:'poke',    name:'Pokéball',    sprite:'poke-ball',    mult:()=>1,
    desc:'Standardball ohne Spezialeffekt.' },
  { id:'great',   name:'Superball',   sprite:'great-ball',   mult:()=>1.5,
    desc:'1,5× Fangrate – etwas besser als der Pokéball.' },
  { id:'ultra',   name:'Hyperball',   sprite:'ultra-ball',   mult:()=>2,
    desc:'2× Fangrate – stärkster regulärer Ball.' },
  { id:'master',  name:'Meisterball', sprite:'master-ball',  mult:()=>Infinity,
    desc:'Fängt jedes Pokémon garantiert ohne Fehlschlag.' },
  { id:'safari',  name:'Safariball',  sprite:'safari-ball',  mult:()=>1.5,
    desc:'1,5× Fangrate; exklusiv für Safari-Zonen.' },
  { id:'net',     name:'Netzball',    sprite:'net-ball',     mult:ctx=>ctx.types?.some(t=>['water','bug'].includes(t))?(ctx.gen>=7?3.5:3):1,
    desc:'3,5× auf Wasser- und Käfer-Pokémon (Gen 7+; Gen 6: 3×), sonst 1×.' },
  { id:'dive',    name:'Tauchball',   sprite:'dive-ball',    mult:ctx=>ctx.diving?3.5:1,
    desc:'3,5× wenn das Pokémon taucht oder auf dem Wasser angetroffen wird.' },
  { id:'nest',    name:'Nestball',    sprite:'nest-ball',    mult:ctx=>nestMult(ctx.enemyLevel, ctx.gen),
    desc:'Bis zu 3,9× – je niedriger das Level des Pokémon, desto stärker.' },
  { id:'repeat',  name:'Wiederball',  sprite:'repeat-ball',  mult:ctx=>ctx.caughtBefore?(ctx.gen>=7?3.5:3):1,
    desc:'3,5× auf bereits gefangene Pokémon (Gen 7+; Gen 6: 3×), sonst 1×.' },
  { id:'timer',   name:'Zeitball',    sprite:'timer-ball',   mult:ctx=>timerMult(ctx.turns, ctx.formulaGen),
    desc:'Wird mit jeder Runde stärker – maximal 4× ab Runde 30.' },
  { id:'luxury',  name:'Luxusball',   sprite:'luxury-ball',  mult:()=>1,
    desc:'Kein Fangbonus; gefangene Pokémon gewinnen Freundschaft doppelt so schnell.' },
  { id:'premier', name:'Premierball', sprite:'premier-ball', mult:()=>1,
    desc:'Kein Fangbonus; erhält man als Bonus beim Kauf von 10 Pokébällen.' },
  { id:'dusk',    name:'Dunkelball',  sprite:'dusk-ball',    mult:ctx=>ctx.dark?(ctx.gen<=6?3.5:3):1,
    desc:'3,5× in Höhlen oder nachts (Gen 6: 3,5×; Gen 7+: 3×), sonst 1×.' },
  { id:'heal',    name:'Heilball',    sprite:'heal-ball',    mult:()=>1,
    desc:'Kein Fangbonus; stellt nach dem Fang alle KP und Statusprobleme wieder her.' },
  { id:'quick',   name:'Schnellball', sprite:'quick-ball',   mult:ctx=>ctx.firstTurn?(ctx.formulaGen>=5?5:4):1,
    desc:'5× (Gen 4: 4×) wenn im allerersten Zug des Kampfes geworfen.' },
  { id:'cherish', name:'Gedenkball',  sprite:'cherish-ball', mult:()=>1,
    desc:'Nur in offiziellen Events erhältlich; kein Fangbonus im normalen Kampf.' },
  { id:'sport',   name:'Sportball',   sprite:'sport-ball',   mult:()=>1.5,
    desc:'1,5× Fangrate; exklusiv für Bug-Catching-Contests.' },
  { id:'friend',  name:'Freundball',  sprite:'friend-ball',  mult:()=>1,
    desc:'Kein Fangbonus; das gefangene Pokémon startet mit hoher Freundschaft.' },
  { id:'fast',    name:'Tempball',    sprite:'fast-ball',    mult:ctx=>ctx.baseSpeed>=100?4:1,
    desc:'4× auf Pokémon mit einem Basis-Initiativewert von 100 oder höher.' },
  { id:'heavy',   name:'Schwerball',  sprite:'heavy-ball',   mult:null, additive:true,
    desc:'Addiert ±20 bis +40 direkt zur Fangrate, abhängig vom Gewicht des Pokémon.' },
  { id:'level',   name:'Levelball',   sprite:'level-ball',   mult:ctx=>levelMult(ctx.playerLevel,ctx.enemyLevel),
    desc:'Bis zu 8× je größer der Level-Vorsprung des Spielers gegenüber dem Gegner.' },
  { id:'love',    name:'Liebesball',  sprite:'love-ball',    mult:ctx=>ctx.sameGender?8:1,
    desc:'8× wenn die Liebesball-Bedingung erfüllt ist (Geschlecht / gleiche Art).' },
  { id:'lure',    name:'Köderball',   sprite:'lure-ball',    mult:ctx=>ctx.fishing?(ctx.gen>=8?4:ctx.gen>=6?5:3):1,
    desc:'5× beim Angeln (Gen 6–7); 4× (Gen 8+); 3× (Gen 2–5); sonst 1×.' },
  { id:'moon',    name:'Mondball',    sprite:'moon-ball',    mult:ctx=>ctx.moonStoneEvo?4:1,
    desc:'4× auf Pokémon, die sich mit einem Mondstein weiterentwickeln.' },
  { id:'beast',   name:'Bestienball', sprite:'beast-ball',   mult:ctx=>ctx.ultraBeast?5:0.1,
    desc:'5× auf Ultra-Bestien; nur 0,1× auf alle anderen Pokémon.' },
  { id:'dream',   name:'Traumball',   sprite:'dream-ball',   mult:ctx=>(ctx.gen>=8&&(ctx.status==='sleep'||ctx.status==='freeze'))?4:1,
    desc:'4× auf schlafende/eingefrorene Pokémon (Gen 8+); sonst kein Fangbonus.' },
];

// Englische Namen und Beschreibungen (Ball-ID → [Name, Beschreibung])
const BALLS_EN = {
  poke:    ['Poké Ball',    'Standard ball without a special effect.'],
  great:   ['Great Ball',   '1.5× catch rate – a bit better than the Poké Ball.'],
  ultra:   ['Ultra Ball',   '2× catch rate – the strongest regular ball.'],
  master:  ['Master Ball',  'Catches any Pokémon without fail.'],
  safari:  ['Safari Ball',  '1.5× catch rate; only in Safari Zones.'],
  net:     ['Net Ball',     '3.5× on Water and Bug Pokémon (Gen 7+; Gen 6: 3×), otherwise 1×.'],
  dive:    ['Dive Ball',    '3.5× when the Pokémon is underwater or encountered on the water.'],
  nest:    ['Nest Ball',    'Up to 3.9× – the lower the Pokémon\'s level, the stronger.'],
  repeat:  ['Repeat Ball',  '3.5× on Pokémon you have caught before (Gen 7+; Gen 6: 3×), otherwise 1×.'],
  timer:   ['Timer Ball',   'Gets stronger every turn – up to 4× from turn 30.'],
  luxury:  ['Luxury Ball',  'No catch bonus; the caught Pokémon gains friendship twice as fast.'],
  premier: ['Premier Ball', 'No catch bonus; a bonus for buying 10 Poké Balls.'],
  dusk:    ['Dusk Ball',    '3.5× in caves or at night (Gen 6: 3.5×; Gen 7+: 3×), otherwise 1×.'],
  heal:    ['Heal Ball',    'No catch bonus; fully restores HP and status after the catch.'],
  quick:   ['Quick Ball',   '5× (Gen 4: 4×) when thrown on the very first turn of the battle.'],
  cherish: ['Cherish Ball', 'Only available from official events; no catch bonus in normal battles.'],
  sport:   ['Sport Ball',   '1.5× catch rate; only in Bug-Catching Contests.'],
  friend:  ['Friend Ball',  'No catch bonus; the caught Pokémon starts with high friendship.'],
  fast:    ['Fast Ball',    '4× on Pokémon with a base Speed of 100 or higher.'],
  heavy:   ['Heavy Ball',   'Adds −20 to +40 directly to the catch rate, depending on the Pokémon\'s weight.'],
  level:   ['Level Ball',   'Up to 8× the further your level is above the opponent\'s.'],
  love:    ['Love Ball',    '8× when the Love Ball condition is met (gender / same species).'],
  lure:    ['Lure Ball',    '5× when fishing (Gen 6–7); 4× (Gen 8+); 3× (Gen 2–5); otherwise 1×.'],
  moon:    ['Moon Ball',    '4× on Pokémon that evolve with a Moon Stone.'],
  beast:   ['Beast Ball',   '5× on Ultra Beasts; only 0.1× on all other Pokémon.'],
  dream:   ['Dream Ball',   '4× on sleeping/frozen Pokémon (Gen 8+); otherwise no catch bonus.'],
};
const ballName = ball => (window.LANG === 'en' && BALLS_EN[ball.id]?.[0]) || ball.name;
const ballDesc = ball => (window.LANG === 'en' && BALLS_EN[ball.id]?.[1]) || ball.desc || '';

// ── Generation ranges ─────────────────────────────────────────────────────
const GEN_RANGES = [
  { gen:1, from:1,   to:151,  label:'Generation 1 – Kanto'  },
  { gen:2, from:152, to:251,  label:'Generation 2 – Johto'  },
  { gen:3, from:252, to:386,  label:'Generation 3 – Hoenn'  },
  { gen:4, from:387, to:493,  label:'Generation 4 – Sinnoh' },
  { gen:5, from:494, to:649,  label:'Generation 5 – Einall' },
  { gen:6, from:650, to:721,  label:'Generation 6 – Kalos'  },
  { gen:7, from:722, to:809,  label:'Generation 7 – Alola'  },
  { gen:8, from:810, to:905,  label:'Generation 8 – Galar'  },
  { gen:9, from:906, to:1025, label:'Generation 9 – Paldea' },
];
function genOf(id) { return GEN_RANGES.find(r => id >= r.from && id <= r.to); }

// ── State ─────────────────────────────────────────────────────────────────
let selectedPokemon   = null; // { id, name, sprite, types, captureRate, weightKg, baseSpeed }
let allPokemonList    = [];
let selectedBallId    = null;
let selectedGenFilter = null; // null = all, 1-9 = specific generation
let falseSwipeActive  = false; // when true, hp% is treated as 1 regardless of slider

// ── Read current UI conditions ─────────────────────────────────────────────
function getConds() {
  return {
    formulaGen:   currentGame().formula,
    gen:          currentGame().gen,
    hpPercent:    falseSwipeActive ? 1 : Number(document.getElementById('hp-slider').value),
    status:       document.querySelector('.status-btn.active')?.dataset.status || 'none',
    firstTurn:    document.getElementById('tog-first-turn').checked,
    dark:         document.getElementById('tog-dark').checked,
    diving:       document.getElementById('tog-diving').checked,
    caughtBefore: document.getElementById('tog-caught').checked,
    fishing:      document.getElementById('tog-fishing').checked,
    moonStoneEvo: document.getElementById('tog-moon').checked,
    sameGender:   document.getElementById('tog-gender').checked,
    ultraBeast:   document.getElementById('tog-ub').checked,
    enemyLevel:   Math.max(1, Number(document.getElementById('inp-enemy-level').value) || 1),
    playerLevel:  Math.max(1, Number(document.getElementById('inp-player-level').value) || 1),
    turns:        Math.max(1, Number(document.getElementById('inp-turns').value) || 1),
    types:        selectedPokemon?.types    || [],
    weightKg:     selectedPokemon?.weightKg || 0,
    baseSpeed:    selectedPokemon?.baseSpeed || 0,
    falseSwipe:   falseSwipeActive,
  };
}

// ── Exact formulas for Gen 1–4 (from the pret disassemblies) ────────────────
// The games work with real HP values; we only have a percentage, so max HP is estimated from base HP and the
// enemy's level (average DVs/IVs, no EVs). Rounding then matches the game closely.
function estimateHp(conds) {
  const L = conds.enemyLevel, base = selectedPokemon.baseHp || 50;
  const max = conds.gen <= 2
    ? Math.floor((base + 8) * 2 * L / 100) + L + 10
    : Math.floor((2 * base + 15) * L / 100) + L + 10;
  const cur = conds.falseSwipe ? 1 : Math.max(1, Math.round(max * conds.hpPercent / 100));
  return { max, cur: Math.min(cur, max) };
}
const isSleepOrFreeze = s => s === 'sleep' || s === 'freeze';
const APRICORN = new Set(['fast', 'level', 'lure', 'heavy', 'love', 'moon']);

// Gen 1 (pokered ItemUseBall): R1 in 0..N (Poké 255, Great 200, others 150); sleep/freeze subtract 25, other
// status 12 – below 0 means caught. Otherwise R1 − status must be ≤ catch rate, and R2 (0..255) ≤ F with
// F = (max HP × 255 ÷ (Great 8, others 12)) ÷ max(1, HP ÷ 4), capped at 255.
function probGen1(ball, conds) {
  const rate = selectedPokemon.captureRate, hp = estimateHp(conds);
  const N = ball.id === 'poke' ? 255 : ball.id === 'great' ? 200 : 150;
  const S = conds.status === 'none' ? 0 : isSleepOrFreeze(conds.status) ? 25 : 12;
  const F = Math.min(255, Math.floor(Math.floor(hp.max * 255 / (ball.id === 'great' ? 8 : 12)) / Math.max(1, Math.floor(hp.cur / 4))));
  const pass = S > N ? 0 : Math.min(N, S + rate) - S + 1;
  return (Math.min(S, N + 1) + pass * Math.min(1, (F + 1) / 256)) / (N + 1);
}

// Gen 2 (pokecrystal PokeBallEffect): every ball changes the catch rate itself (capped at 255). Level Ball
// skips HP and status entirely (bug). a = rate × (3·maxHP − 2·HP) ÷ (3·maxHP), at least 1; sleep/freeze +10
// (paralysis/poison/burn give nothing – bug); caught if random 0..255 ≤ a → (a + 1) ÷ 256.
const GEN2_FAST_BALL = new Set([81, 88, 114]);   // bug: only Magnemite, Grimer, Tangela
function probGen2(ball, conds) {
  const cap = v => Math.max(1, Math.min(255, v));
  let r = selectedPokemon.captureRate;
  switch (ball.id) {
    case 'ultra': r = cap(r * 2); break;
    case 'great': case 'safari': case 'sport': r = cap(r + Math.floor(r / 2)); break;
    case 'heavy': r = cap(r + heavyBonus(selectedPokemon.weightKg, 2)); break;
    case 'level': return (cap(r * levelMult(conds.playerLevel, conds.enemyLevel)) + 1) / 256;
    case 'lure': if (conds.fishing) r = cap(r * 3); break;
    case 'fast': if (GEN2_FAST_BALL.has(selectedPokemon.id)) r = cap(r * 4); break;
    case 'love': if (conds.sameGender) r = cap(r * 8); break;
    // Moon Ball: never boosts (bug); Friend Ball: no bonus
  }
  const hp = estimateHp(conds);
  let m3 = hp.max * 3, h2 = hp.cur * 2;
  if (m3 > 255) { m3 = Math.floor(m3 / 4); h2 = Math.max(1, Math.floor(h2 / 4)); }
  let a = Math.max(1, Math.floor(r * ((m3 - h2) & 0xFF) / (m3 & 0xFF)));
  if (isSleepOrFreeze(conds.status)) a = Math.min(255, a + 10);
  return (a + 1) / 256;
}

// Gen 3–4 (pokeemerald Cmd_handleballthrow, pokeplatinum/pokeheartgold CalcCatchShakes): ball modifier in tenths;
// HGSS Apricorn Balls change the catch rate instead (1..255). a = (rate × ball ÷ 10) × (3·maxHP − 2·HP) ÷ (3·maxHP),
// sleep/freeze ×2, other status ×1.5. a ≥ 255 → caught; otherwise four shake checks with
// b = 1048560 ÷ √√(16711680 ÷ a) against random 0..65535 → P = (b ÷ 65536)⁴.
function probGen34(ball, conds) {
  let r = selectedPokemon.captureRate, mod = 10;
  if (APRICORN.has(ball.id)) {
    if (ball.id === 'heavy') r += heavyBonus(selectedPokemon.weightKg, 4);
    else r *= ball.mult(conds);
    r = Math.max(1, Math.min(255, Math.floor(r)));
  } else {
    mod = Math.round(ball.mult(conds) * 10);
  }
  const hp = estimateHp(conds);
  let a = Math.floor(Math.floor(r * mod / 10) * (hp.max * 3 - hp.cur * 2) / (hp.max * 3));
  if (isSleepOrFreeze(conds.status)) a *= 2;
  else if (conds.status !== 'none') a = Math.floor(a * 15 / 10);
  if (a >= 255) return 1;
  if (a <= 0) return 0;
  const b = Math.floor(1048560 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680 / a))))));
  return Math.pow(Math.min(b, 65536) / 65536, 4);
}

// ── Gen 5+ (and the Gen 8 remakes): simplified ──────────────────────────────
// P = min(1, a/255)  where  a = hpFactor × captureRate × ballMult × statusMult
function computeProb(ball, conds) {
  if (!selectedPokemon) return null;
  if (ball.id === 'master') return 1;
  if (conds.gen <= 4) {
    if (conds.formulaGen === 1) return probGen1(ball, conds);
    if (conds.formulaGen === 2) return probGen2(ball, conds);
    return probGen34(ball, conds);
  }

  const hpFactor = (3 - 2 * conds.hpPercent / 100) / 3;
  // Gen III–IV formula (BDSP): sleep ×2.0; Gen V+: sleep ×2.5
  const sleepMult = conds.formulaGen >= 5 ? 2.5 : 2.0;
  const statusMult = (conds.status === 'sleep' || conds.status === 'freeze') ? sleepMult
    : (conds.status === 'paralysis' || conds.status === 'poison' || conds.status === 'burn') ? 1.5
    : 1.0;

  let a;
  if (ball.additive) {
    const bonus = heavyBonus(selectedPokemon.weightKg, conds.gen);
    a = hpFactor * Math.max(0, selectedPokemon.captureRate + bonus) * statusMult;
  } else {
    const m = ball.mult(conds);
    if (!isFinite(m)) return 1;
    if (m <= 0) return 0;
    a = hpFactor * selectedPokemon.captureRate * m * statusMult;
  }
  const ratio = Math.min(1, Math.max(0, a / 255));
  // Gen VI+ shake check uses exponent 3/16 per check (vs. 1/4 in Gen III–V) → P = ratio^(3/4)
  return conds.formulaGen >= 6 ? Math.pow(ratio, 0.75) : ratio;
}

function throwsNeeded(p, target) {
  if (p >= 1) return 1;
  if (p <= 0) return Infinity;
  return Math.ceil(Math.log(1 - target) / Math.log(1 - p));
}

function probColor(p) {
  if (p === null) return 'var(--color-muted)';
  if (p >= 1)   return 'rgb(var(--t-c-50e880))';
  if (p >= 0.5) return 'rgb(var(--t-c-80e060))';
  if (p >= 0.2) return 'rgb(var(--t-c-ffda08))';
  if (p >= 0.05)return 'rgb(var(--t-c-f09040))';
  return 'rgb(var(--t-c-f05050))';
}

function formatProb(p) {
  if (p === null) return '–';
  if (p >= 1) return '100%';
  if (p < 0.001) return decimal('<0.1%');
  return decimal((p * 100).toFixed(1)) + '%';
}
function decimal(str) { return window.LANG === 'en' ? str : str.replace('.', ','); }

function multLabel(ball, conds) {
  if (ball.additive) {
    const b = heavyBonus(selectedPokemon?.weightKg || 0, conds.gen);
    return (b >= 0 ? '+' : '') + b + (window.LANG === 'en' ? ' flat' : ' add.');
  }
  const m = ball.mult(conds);
  if (!isFinite(m)) return '∞';
  return decimal((Math.round(m * 10) / 10).toFixed(1)) + '×';
}

// ── Formula tooltip content ───────────────────────────────────────────────
const FORMULA_TOOLTIPS = {
  1: `<div class="tt-title">Gen-1-Formel (wie im Spiel)</div>
      <div class="tt-formula">Zufall 1 (0–255, Superball 0–200, sonst 0–150) − Status ≤ Fangrate<br>und Zufall 2 ≤ F = KP<sub>max</sub> × 255 ÷ (Superball 8, sonst 12) ÷ (KP ÷ 4)</div>
      <ul class="tt-rules">
        <li>Schlaf / Eis: −25 auf Zufall 1 (darunter: sofort gefangen)</li>
        <li>Paralyse / Gift / Brand: −12</li>
        <li>KP aus Basis-KP und Gegner-Level geschätzt</li>
      </ul>`,
  2: `<div class="tt-title">Gen-2-Formel (wie im Spiel)</div>
      <div class="tt-formula">P = (a + 1) ÷ 256<br>a = Fangrate<sub>Ball</sub> × (3·KP<sub>max</sub> − 2·KP) ÷ (3·KP<sub>max</sub>) + Status</div>
      <ul class="tt-rules">
        <li>Bälle verändern die Fangrate selbst (höchstens 255)</li>
        <li>Schlaf / Eis: <b>+10</b>; Paralyse / Gift / Brand: <b>nichts (Bug)</b></li>
        <li>Levelball ignoriert KP und Status, Mondball wirkt nie, Tempoball nur bei Magnetilo, Sleima, Tangela (Bugs)</li>
        <li>KP aus Basis-KP und Gegner-Level geschätzt</li>
      </ul>`,
  3: `<div class="tt-title">Gen-3-Formel (wie im Spiel)</div>
      <div class="tt-formula">a = Fangrate × Ball × (3·KP<sub>max</sub> − 2·KP) ÷ (3·KP<sub>max</sub>) × Status<br>P = (b ÷ 65536)<sup>4</sup>, b = 1048560 ÷ ⁴√(16711680 ÷ a)</div>
      <ul class="tt-rules">
        <li>Schlaf / Eis: <b>2×</b>; Paralyse / Gift / Brand: 1,5×</li>
        <li>Ganzzahlig gerechnet, vier Schüttelprüfungen</li>
        <li>KP aus Basis-KP und Gegner-Level geschätzt</li>
      </ul>`,
  4: `<div class="tt-title">Gen-4-Formel (wie im Spiel)</div>
      <div class="tt-formula">a = Fangrate × Ball × (3·KP<sub>max</sub> − 2·KP) ÷ (3·KP<sub>max</sub>) × Status<br>P = (b ÷ 65536)<sup>4</sup>, b = 1048560 ÷ ⁴√(16711680 ÷ a)</div>
      <ul class="tt-rules">
        <li>Schlaf / Eis: <b>2×</b>; Paralyse / Gift / Brand: 1,5×</li>
        <li>Schnellball <b>4×</b> im ersten Zug, Dunkelball 3,5×, Nestball (40 − Level) ÷ 10</li>
        <li>HGSS: Aprikoko-Bälle verändern die Fangrate selbst (höchstens 255)</li>
        <li>KP aus Basis-KP und Gegner-Level geschätzt</li>
      </ul>`,
  5: `<div class="tt-title">Gen-5-Formel</div>
      <div class="tt-formula">P = a ÷ 255<br>a = KP-Faktor × Fangrate × Ball × Status</div>
      <ul class="tt-rules">
        <li>KP-Faktor: (3 − 2 × KP%) ÷ 3</li>
        <li>Schlaf / Eis: <b>2,5×</b> Statusbonus (↑ von 2,0× in Gen 3–4)</li>
        <li>Paralyse / Gift / Brand: 1,5×</li>
        <li>Schnellball: <b>5×</b> im ersten Zug (↑ von 4× in Gen 4)</li>
      </ul>`,
  6: `<div class="tt-title">Gen-6+-Formel</div>
      <div class="tt-formula">P = (a ÷ 255)<sup>3/4</sup><br>a = KP-Faktor × Fangrate × Ball × Status</div>
      <ul class="tt-rules">
        <li>KP-Faktor: (3 − 2 × KP%) ÷ 3</li>
        <li>Schlaf / Eis: 2,5× Statusbonus</li>
        <li>Paralyse / Gift / Brand: 1,5×</li>
        <li>Schnellball: <b>5×</b> im ersten Zug</li>
        <li>Schüttelprüfung: Exponent 3/16 statt 1/4 → P = (a/255)<sup>3/4</sup></li>
      </ul>`,
};
const FORMULA_TOOLTIPS_EN = {
  1: `<div class="tt-title">Gen 1 formula (as in the game)</div>
      <div class="tt-formula">random 1 (0–255, Great Ball 0–200, others 0–150) − status ≤ catch rate<br>and random 2 ≤ F = HP<sub>max</sub> × 255 ÷ (Great Ball 8, others 12) ÷ (HP ÷ 4)</div>
      <ul class="tt-rules">
        <li>Sleep / Freeze: −25 on random 1 (below 0: caught right away)</li>
        <li>Paralysis / Poison / Burn: −12</li>
        <li>HP estimated from base HP and enemy level</li>
      </ul>`,
  2: `<div class="tt-title">Gen 2 formula (as in the game)</div>
      <div class="tt-formula">P = (a + 1) ÷ 256<br>a = catch rate<sub>ball</sub> × (3·HP<sub>max</sub> − 2·HP) ÷ (3·HP<sub>max</sub>) + status</div>
      <ul class="tt-rules">
        <li>Balls change the catch rate itself (at most 255)</li>
        <li>Sleep / Freeze: <b>+10</b>; Paralysis / Poison / Burn: <b>nothing (bug)</b></li>
        <li>Level Ball ignores HP and status, Moon Ball never works, Fast Ball only for Magnemite, Grimer, Tangela (bugs)</li>
        <li>HP estimated from base HP and enemy level</li>
      </ul>`,
  3: `<div class="tt-title">Gen 3 formula (as in the game)</div>
      <div class="tt-formula">a = catch rate × ball × (3·HP<sub>max</sub> − 2·HP) ÷ (3·HP<sub>max</sub>) × status<br>P = (b ÷ 65536)<sup>4</sup>, b = 1048560 ÷ ⁴√(16711680 ÷ a)</div>
      <ul class="tt-rules">
        <li>Sleep / Freeze: <b>2×</b>; Paralysis / Poison / Burn: 1.5×</li>
        <li>Integer math, four shake checks</li>
        <li>HP estimated from base HP and enemy level</li>
      </ul>`,
  4: `<div class="tt-title">Gen 4 formula (as in the game)</div>
      <div class="tt-formula">a = catch rate × ball × (3·HP<sub>max</sub> − 2·HP) ÷ (3·HP<sub>max</sub>) × status<br>P = (b ÷ 65536)<sup>4</sup>, b = 1048560 ÷ ⁴√(16711680 ÷ a)</div>
      <ul class="tt-rules">
        <li>Sleep / Freeze: <b>2×</b>; Paralysis / Poison / Burn: 1.5×</li>
        <li>Quick Ball <b>4×</b> on the first turn, Dusk Ball 3.5×, Nest Ball (40 − level) ÷ 10</li>
        <li>HGSS: Apricorn Balls change the catch rate itself (at most 255)</li>
        <li>HP estimated from base HP and enemy level</li>
      </ul>`,
  5: `<div class="tt-title">Gen 5 formula</div>
      <div class="tt-formula">P = a ÷ 255<br>a = HP factor × catch rate × ball × status</div>
      <ul class="tt-rules">
        <li>HP factor: (3 − 2 × HP%) ÷ 3</li>
        <li>Sleep / Freeze: <b>2.5×</b> status bonus (↑ from 2.0× in Gen 3–4)</li>
        <li>Paralysis / Poison / Burn: 1.5×</li>
        <li>Quick Ball: <b>5×</b> on the first turn (↑ from 4× in Gen 4)</li>
      </ul>`,
  6: `<div class="tt-title">Gen 6+ formula</div>
      <div class="tt-formula">P = (a ÷ 255)<sup>3/4</sup><br>a = HP factor × catch rate × ball × status</div>
      <ul class="tt-rules">
        <li>HP factor: (3 − 2 × HP%) ÷ 3</li>
        <li>Sleep / Freeze: 2.5× status bonus</li>
        <li>Paralysis / Poison / Burn: 1.5×</li>
        <li>Quick Ball: <b>5×</b> on the first turn</li>
        <li>Shake check: exponent 3/16 instead of 1/4 → P = (a/255)<sup>3/4</sup></li>
      </ul>`,
};

// ── Modal gen filter + game warning ──────────────────────────────────────
function renderGenFilterBar() {
  const bar = document.getElementById('gen-filter-bar');
  if (!bar) return;
  const maxDex   = currentGame().maxDex;
  const availGens = GEN_RANGES.filter(r => r.from <= maxDex);

  bar.innerHTML = '';
  const makeBtn = (label, value) => {
    const btn = document.createElement('button');
    btn.className = 'gen-filter-btn' + (selectedGenFilter === value ? ' active' : '');
    btn.textContent = label;
    btn.addEventListener('click', () => {
      selectedGenFilter = value;
      renderGenFilterBar();
      renderPokemonList(document.getElementById('pokemon-search').value);
    });
    bar.appendChild(btn);
  };
  const t = TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
  makeBtn(t.genFilterAll, null);
  availGens.forEach(r => makeBtn(`Gen ${r.gen}`, r.gen));
}

function updateGameWarning() {
  const el = document.getElementById('game-warning');
  if (!el) return;
  if (!selectedPokemon || selectedPokemon.id <= currentGame().maxDex) {
    el.style.display = 'none';
    return;
  }
  const range = genOf(selectedPokemon.id);
  const t = TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
  el.textContent = window.LANG === 'en'
    ? `${listName(selectedPokemon.id, selectedPokemon.name)} was introduced in Generation ${range?.gen ?? '?'} and is not available in ${gameLabel(currentGame())}.`
    : `${listName(selectedPokemon.id, selectedPokemon.name)} wurde erst in Generation ${range?.gen ?? '?'} eingeführt und ist in ${gameLabel(currentGame())} nicht verfügbar.`;
  el.style.display = '';
}

function updateGameSelectOptions() {
  const sel = document.getElementById('game-select');
  Array.from(sel.options).forEach(opt => {
    if (!opt.value) return;
    const game = GAMES.find(g => g.id === opt.value);
    opt.disabled = !!(selectedPokemon && game && selectedPokemon.id > game.maxDex);
  });
}

// ── Game UI helpers ───────────────────────────────────────────────────────
const TOGGLE_BALL_MAP = {
  'tog-first-turn': 'quick',
  'tog-dark':       'dusk',
  'tog-diving':     'dive',
  'tog-caught':     'repeat',
  'tog-fishing':    'lure',
  'tog-moon':       'moon',
  'tog-gender':     'love',
  'tog-ub':         'beast',
};

function updateConditionVisibility() {
  const ballIds = new Set(currentGame().balls);
  Object.entries(TOGGLE_BALL_MAP).forEach(([togId, ballId]) => {
    const el = document.getElementById(togId)?.closest('label');
    if (el) el.style.display = ballIds.has(ballId) ? '' : 'none';
  });
  const timerGroup = document.getElementById('inp-turns')?.closest('.num-input-group');
  if (timerGroup) timerGroup.style.display = ballIds.has('timer') ? '' : 'none';
  const levelGroup = document.getElementById('inp-player-level')?.closest('.num-input-group');
  if (levelGroup) levelGroup.style.display = ballIds.has('level') ? '' : 'none';
}

function updateFormulaBadge() {
  const f = currentGame().formula;
  const gen = f <= 1 ? '1' : f <= 2 ? '2' : f <= 4 ? '3–4' : f <= 5 ? '5' : '6+';
  const label = window.LANG === 'en' ? `Gen ${gen} formula` : `Gen-${gen}-Formel`;
  document.getElementById('formula-badge').textContent = label;
}

// ── Render pokémon card ───────────────────────────────────────────────────
function renderPokemonCard() {
  const card = document.getElementById('poke-card');
  const tr = TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
  if (!selectedPokemon) {
    card.innerHTML = `
      <p class="poke-empty-hint">${tr.pokeEmptyHint}</p>
      <button type="button" id="btn-pick-pokemon" class="poke-pick-btn">${tr.pokePickBtn}</button>`;
    document.getElementById('btn-pick-pokemon').addEventListener('click', openModal);
    return;
  }
  const p = selectedPokemon;
  const typeHtml = (p.types || []).map(typeBadge).join('');
  card.innerHTML = `
    <div class="poke-info">
      <img class="poke-info-sprite" src="${esc(p.sprite)}" alt="${esc(listName(p.id, p.name))}">
      <div class="poke-info-body">
        <div class="poke-info-head">
          <span class="poke-info-name">${esc(listName(p.id, p.name))}</span>
          <span class="poke-info-id">#${esc(p.id)}</span>
        </div>
        <div class="poke-info-types">${typeHtml}</div>
        <div class="poke-info-stats">
          <span>${tr.catchRateLabel} <b><span class="catch-rate-badge">${esc(p.captureRate)}/255</span></b></span>
          <span>${tr.weightLabel} <b>${decimal(p.weightKg.toFixed(1))} kg</b></span>
          <span>${tr.speedLabel} <b>${esc(p.baseSpeed)}</b></span>
        </div>
      </div>
      <button type="button" id="btn-pick-pokemon" class="poke-change-btn">${SWAP_ICON}${tr.pokeChangeBtn}</button>
    </div>`;
  document.getElementById('btn-pick-pokemon').addEventListener('click', openModal);
}

// ── Render ball grid ──────────────────────────────────────────────────────
function renderBallGrid() {
  const grid  = document.getElementById('ball-grid');
  const hint  = document.getElementById('no-poke-hint');
  const detail= document.getElementById('selected-ball-detail');

  if (!selectedPokemon) {
    hint.style.display = '';
    grid.innerHTML     = '';
    detail.style.display = 'none';
    return;
  }
  hint.style.display = 'none';

  const conds    = getConds();
  const gameBalls = new Set(currentGame().balls);
  const entries = BALLS
    .filter(ball => gameBalls.has(ball.id))
    .map(ball => ({ ball, prob: computeProb(ball, conds) }))
    .sort((a, b) => (b.prob || 0) - (a.prob || 0));

  grid.innerHTML = '';
  entries.forEach(({ ball, prob }) => {
    const color = probColor(prob);
    const barW  = prob !== null ? Math.round(prob * 100) : 0;
    const div   = document.createElement('div');
    div.className = 'ball-card' + (ball.id === selectedBallId ? ' selected' : '');
    div.title = ballDesc(ball);
    div.innerHTML = `
      <img src="${ITEMS_SPRITE_URL}${ball.sprite}.png" alt="${ballName(ball)}" onerror="this.style.opacity='0.3'">
      <div class="ball-name">${ballName(ball)}</div>
      <div class="ball-mult" style="color:${color}">${multLabel(ball, conds)}</div>
      <div class="ball-prob" style="color:${color}">${formatProb(prob)}</div>
      <div class="ball-bar-bg"><div class="ball-bar-fill" style="width:${barW}%;background:${color}"></div></div>`;
    div.addEventListener('click', () => { selectedBallId = ball.id; renderBallGrid(); });
    grid.appendChild(div);
  });

  renderSelectedDetail(conds);
}

function renderSelectedDetail(conds) {
  const detail = document.getElementById('selected-ball-detail');
  if (!selectedBallId || !selectedPokemon) { detail.style.display = 'none'; return; }
  const ball = BALLS.find(b => b.id === selectedBallId);
  if (!ball) { detail.style.display = 'none'; return; }

  const prob  = computeProb(ball, conds || getConds());
  const color = probColor(prob);
  const t50   = throwsNeeded(prob, 0.50);
  const t90   = throwsNeeded(prob, 0.90);
  const t99   = throwsNeeded(prob, 0.99);
  const fmt   = n => isFinite(n) ? String(n) : '∞';

  const tr = TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
  detail.style.display = 'block';
  detail.innerHTML = `
    <div class="detail-header">
      <img src="${ITEMS_SPRITE_URL}${ball.sprite}.png" alt="${ballName(ball)}" onerror="this.style.opacity='0.3'">
      <div class="detail-header-text">
        <div class="detail-ball-name">${ballName(ball)}</div>
        <div class="detail-ball-desc">${ballDesc(ball)}</div>
        <div class="detail-prob" style="color:${color}">${formatProb(prob)}</div>
      </div>
    </div>
    <div class="detail-throws-grid">
      <div class="throw-card">
        <div class="throw-card-target">${tr.throws50}</div>
        <div class="throw-card-count">${fmt(t50)}</div>
        <div class="throw-card-label">${tr.throwsLabel}</div>
        <div class="throw-card-note">${tr.throws50note}</div>
      </div>
      <div class="throw-card">
        <div class="throw-card-target">${tr.throws90}</div>
        <div class="throw-card-count">${fmt(t90)}</div>
        <div class="throw-card-label">${tr.throwsLabel}</div>
        <div class="throw-card-note">${tr.throws90note}</div>
      </div>
      <div class="throw-card">
        <div class="throw-card-target">${tr.throws99}</div>
        <div class="throw-card-count">${fmt(t99)}</div>
        <div class="throw-card-label">${tr.throwsLabel}</div>
        <div class="throw-card-note">${tr.throws99note}</div>
      </div>
    </div>`;
}

// ── Pokémon selection modal ───────────────────────────────────────────────
function openModal() {
  document.getElementById('pokemon-modal').style.display = 'flex';
  selectedGenFilter = null;
  renderGenFilterBar();
  const inp = document.getElementById('pokemon-search');
  inp.value = '';
  renderPokemonList('');
}

function closeModal() {
  document.getElementById('pokemon-modal').style.display = 'none';
}

function renderPokemonList(filter) {
  const list = document.getElementById('pokemon-list');
  const tr = TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
  list.innerHTML = '';
  if (!allPokemonList.length) {
    const li = document.createElement('li');
    li.textContent = tr.pokeListLoading;
    li.style.cursor = 'default';
    list.appendChild(li);
    return;
  }
  const q      = filter.trim().toLowerCase();
  const maxDex = currentGame().maxDex;
  const pool   = allPokemonList.filter(p =>
    p.id <= maxDex && (selectedGenFilter === null || genOf(p.id)?.gen === selectedGenFilter)
  );
  const source = q.length >= 1
    ? pool.filter(p => p.displayName.toLowerCase().includes(q) || p.name.toLowerCase().includes(q))
    : pool;

  if (!source.length) {
    const li = document.createElement('li');
    li.textContent = tr.pokeListEmpty;
    li.style.cursor = 'default';
    list.appendChild(li);
    return;
  }
  let currentGen = null;
  source.forEach(p => {
    const range = genOf(p.id);
    if (range?.gen !== currentGen) {
      currentGen = range?.gen ?? null;
      const header = document.createElement('li');
      header.className = 'pokemon-gen-header';
      header.textContent = range ? (window.LANG === 'en' ? range.label.replace('Einall', 'Unova') : range.label) : '';
      list.appendChild(header);
    }
    const li = document.createElement('li');
    li.className = 'pokemon-card';
    li.innerHTML = `<img src="${esc(p.sprite)}" alt="${esc(p.displayName)}"><div>${esc(p.displayName)}</div>`;
    li.addEventListener('click', () => pickPokemon(p));
    list.appendChild(li);
  });
}

async function pickPokemon(p) {
  closeModal();
  const tr = TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
  document.getElementById('poke-card').innerHTML = `<p class="poke-empty-hint">${tr.pokeLoadingHint}</p>`;

  try {
    const poke = await (await fetch(`${API}/pokemon/${p.name}`)).json();
    // Die Art über das Pokémon holen: Formen wie „giratina-altered“ haben keinen eigenen Art-Eintrag
    const species = await (await fetch(poke.species.url)).json();

    selectedPokemon = {
      id:          poke.id,
      name:        poke.name,
      sprite:      poke.sprites.front_default,
      types:       poke.types.map(t => t.type.name),
      captureRate: species.capture_rate,
      weightKg:    poke.weight / 10,
      baseSpeed:   poke.stats[5].base_stat,
      baseHp:      poke.stats[0].base_stat,
    };
    renderPokemonCard();
    renderBallGrid();
    updateGameWarning();
    updateGameSelectOptions();
  } catch (e) {
    console.error(e);
    const trErr = TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
    document.getElementById('poke-card').innerHTML =
      `<p class="poke-empty-hint" style="color:rgb(var(--t-c-f05050))">${trErr.pokeLoadError}</p>`;
  }
}

// ── Init ───────────────────────────────────────────────────────────────────
async function init() {
  renderPokemonCard();

  // Right-click on Pokémon card to deselect
  document.getElementById('poke-card').addEventListener('contextmenu', e => {
    if (!selectedPokemon) return;
    e.preventDefault();
    selectedPokemon = null;
    renderPokemonCard();
    renderBallGrid();
    updateGameWarning();
    updateGameSelectOptions();
  });

  // HP slider
  updateSliderStyle(100);
  document.getElementById('hp-slider').addEventListener('input', e => {
    const v = Number(e.target.value);
    const col = v > 50 ? '#50e880' : v > 20 ? '#e8b820' : '#f05050';
    document.getElementById('hp-display').textContent = v + '%';
    document.getElementById('hp-display').style.color = col;
    updateSliderStyle(v);
    renderBallGrid();
  });

  // Status buttons – clicking the active non-"none" button deactivates it
  document.querySelectorAll('.status-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const wasActive = btn.classList.contains('active');
      document.querySelectorAll('.status-btn').forEach(b => b.classList.remove('active'));
      if (wasActive && btn.dataset.status !== 'none') {
        document.querySelector('.status-btn[data-status="none"]').classList.add('active');
      } else {
        btn.classList.add('active');
      }
      renderBallGrid();
    });
  });

  // 1-KP button (False Swipe) — visually moves slider to 1%, restores on deactivate
  let savedHpValue = 100;
  document.getElementById('btn-1hp').addEventListener('click', () => {
    falseSwipeActive = !falseSwipeActive;
    const slider  = document.getElementById('hp-slider');
    const display = document.getElementById('hp-display');
    if (falseSwipeActive) {
      savedHpValue = Number(slider.value);
      slider.value = 1;
      slider.disabled = true;
    } else {
      slider.value = savedHpValue;
      slider.disabled = false;
    }
    const v = Number(slider.value);
    const col = v > 50 ? '#50e880' : v > 20 ? '#e8b820' : '#f05050';
    display.textContent = v + '%';
    display.style.color = col;
    updateSliderStyle(v);
    document.getElementById('btn-1hp').classList.toggle('active', falseSwipeActive);
    document.getElementById('false-swipe-hint').style.display = falseSwipeActive ? '' : 'none';
    renderBallGrid();
  });

  // Toggles
  ['tog-first-turn','tog-dark','tog-diving','tog-caught','tog-fishing','tog-moon','tog-gender','tog-ub']
    .forEach(id => document.getElementById(id).addEventListener('change', renderBallGrid));

  // Number inputs
  ['inp-enemy-level','inp-player-level','inp-turns']
    .forEach(id => document.getElementById(id).addEventListener('input', renderBallGrid));

  // Formula badge tooltip (0.3 s delay)
  {
    let tooltipTimer = null;
    const badge   = document.getElementById('formula-badge');
    const tooltip = document.getElementById('formula-tooltip');
    badge.addEventListener('mouseenter', () => {
      tooltipTimer = setTimeout(() => {
        tooltip.innerHTML = (window.LANG === 'en' ? FORMULA_TOOLTIPS_EN : FORMULA_TOOLTIPS)[currentGame().formula] ?? '';
        const r = badge.getBoundingClientRect();
        tooltip.style.left      = (r.left + r.width / 2) + 'px';
        tooltip.style.top       = (r.top - 10) + 'px';
        tooltip.style.transform = 'translate(-50%, calc(-100% - 4px))';
        tooltip.classList.add('visible');
      }, 300);
    });
    badge.addEventListener('mouseleave', () => {
      clearTimeout(tooltipTimer);
      tooltip.classList.remove('visible');
    });
  }

  // Game selector
  document.getElementById('game-select').value = selectedGameId;
  updateFormulaBadge();
  updateConditionVisibility();
  document.getElementById('game-select').addEventListener('change', e => {
    selectedGameId = e.target.value;
    if (selectedBallId && !new Set(currentGame().balls).has(selectedBallId)) selectedBallId = null;
    if (selectedGenFilter !== null && !GEN_RANGES.some(r => r.gen === selectedGenFilter && r.from <= currentGame().maxDex))
      selectedGenFilter = null;
    updateFormulaBadge();
    updateConditionVisibility();
    updateGameWarning();
    renderBallGrid();
    renderGenFilterBar();
    const searchVal = document.getElementById('pokemon-search').value;
    if (document.getElementById('pokemon-modal').style.display === 'flex') renderPokemonList(searchVal);
  });

  // Modal
  document.getElementById('pokemon-search').addEventListener('input', e => renderPokemonList(e.target.value));
  document.getElementById('close-pokemon-modal').addEventListener('click', closeModal);
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && document.getElementById('pokemon-modal').style.display === 'flex') closeModal();
  });
  document.getElementById('pokemon-modal').addEventListener('click', e => {
    if (e.target === e.currentTarget) closeModal();
  });

  // Load all Pokémon names (all 9 gens)
  const results = await Promise.allSettled([1,2,3,4,5,6,7,8,9].map(g => getGenerationList(g)));
  allPokemonList = results.flatMap(r => {
    if (r.status !== 'fulfilled') return [];
    return r.value.map(p => {
      const m = p.url.match(/\/pokemon\/(\d+)\//);
      const id = m ? Number(m[1]) : null;
      if (!id) return null;
      return { id, name: p.name, displayName: listName(id, p.name), sprite: `${POKE_SPRITE_URL}${id}.png` };
    }).filter(Boolean);
  });


  // Auto-load default Pokémon
  pickPokemon({ name: 'bulbasaur' }).catch(() => {});
}

// Name in der Auswahlliste – aus pokemon-names.js (sofort da, auch offline; vorher eine Anfrage je Pokémon)
function listName(id, name) { return window.pokemonName(id, name) || capitalize(name); }

// ── i18n ─────────────────────────────────────────────────────────────────────
function applyLang() {
  const t = TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.dataset.i18n;
    if (t[key] !== undefined) el.textContent = t[key];
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.dataset.i18nPlaceholder;
    if (t[key] !== undefined) el.placeholder = t[key];
  });
  document.querySelectorAll('[data-i18n-label]').forEach(el => {
    const key = el.dataset.i18nLabel;
    if (t[key] !== undefined) el.label = t[key];
  });
  document.getElementById('lang-toggle').textContent = window.LANG.toUpperCase();
  const x = document.getElementById('close-pokemon-modal');
  x.title = t.close; x.setAttribute('aria-label', t.close);
  // Re-render pokemon card and ball grid (contains translated strings)
  renderPokemonCard();
  renderBallGrid();
  renderGenFilterBar();
  updateFormulaBadge();
}

document.getElementById('lang-toggle').addEventListener('click', () => {
  window.LANG = window.LANG === 'de' ? 'en' : 'de';
  localStorage.setItem('hub-lang', window.LANG);
  document.documentElement.lang = window.LANG;
  allPokemonList.forEach(p => { p.displayName = listName(p.id, p.name); });
  applyLang();
  if (selectedPokemon) updateGameWarning();
});
applyLang();

init().catch(console.error);
