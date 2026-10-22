import { getGenerationList, getPokemonSpecies } from "../Pokelocke/pokeapi.js";

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
    falseSwipeBtn: '⚔ Trugschlag (1 KP)',
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
    modalSearchPlaceholder: 'Nach Pokémon suchen…',
    genFilterAll: 'Alle',
    pokeEmptyHint: 'Noch kein Pokémon ausgewählt.',
    pokePickBtn: 'Pokémon wählen',
    pokeChangeBtn: 'Ändern',
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
    falseSwipeBtn: '⚔ False Swipe (1 HP)',
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
    modalSearchPlaceholder: 'Search Pokémon…',
    genFilterAll: 'All',
    pokeEmptyHint: 'No Pokémon selected yet.',
    pokePickBtn: 'Choose Pokémon',
    pokeChangeBtn: 'Change',
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

function updateSliderStyle(v) {
  const pct  = (v - 1) / 99 * 100;
  const fill = v > 50 ? '#50e880' : v > 20 ? '#e8b820' : '#f05050';
  const empty = 'rgba(var(--t-ink), 0.07)';
  document.getElementById('hp-slider').style.background =
    `linear-gradient(to right, ${fill} ${pct}%, ${empty} ${pct}%)`;
}
function nestMult(level) { return Math.max(1, (41 - Math.max(1, level)) / 10); }
function timerMult(turns) { return Math.min(4, 1 + Math.floor(turns * 1229 / 4096)); }
function levelMult(pl, el) {
  if (el <= 0) return 1;
  const r = pl / el;
  return r >= 4 ? 8 : r >= 2 ? 4 : r > 1 ? 2 : 1;
}
function heavyBonus(kg) {
  return kg >= 409.6 ? 40 : kg >= 307.2 ? 30 : kg >= 204.8 ? 20 : kg >= 102.4 ? 0 : -20;
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
  { id:'nest',    name:'Nestball',    sprite:'nest-ball',    mult:ctx=>nestMult(ctx.enemyLevel),
    desc:'Bis zu 3,9× – je niedriger das Level des Pokémon, desto stärker.' },
  { id:'repeat',  name:'Wiederball',  sprite:'repeat-ball',  mult:ctx=>ctx.caughtBefore?(ctx.gen>=7?3.5:3):1,
    desc:'3,5× auf bereits gefangene Pokémon (Gen 7+; Gen 6: 3×), sonst 1×.' },
  { id:'timer',   name:'Zeitball',    sprite:'timer-ball',   mult:ctx=>timerMult(ctx.turns),
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
let selectedPokemon   = null; // { id, name, germanName, sprite, types, captureRate, weightKg, baseSpeed }
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
  };
}

// ── Gen 3+ catch-rate formula ────────────────────────────────────────────
// P = min(1, a/255)  where  a = hpFactor × captureRate × ballMult × statusMult
function computeProb(ball, conds) {
  if (!selectedPokemon) return null;
  if (ball.id === 'master') return 1;

  const hpFactor = (3 - 2 * conds.hpPercent / 100) / 3;
  // Gen I/II: sleep ×2.5; Gen III–IV: sleep ×2.0; Gen V+: sleep ×2.5
  const sleepMult = (conds.formulaGen <= 2 || conds.formulaGen >= 5) ? 2.5 : 2.0;
  // Gen II bug: paralysis/burn/poison give no status bonus
  const otherMult = conds.formulaGen === 2 ? 1.0 : 1.5;
  const statusMult = (conds.status === 'sleep' || conds.status === 'freeze') ? sleepMult
    : (conds.status === 'paralysis' || conds.status === 'poison' || conds.status === 'burn') ? otherMult
    : 1.0;

  let a;
  if (ball.additive) {
    const bonus = heavyBonus(selectedPokemon.weightKg);
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
  if (p < 0.001) return '<0,1%';
  return (p * 100).toFixed(1).replace('.', ',') + '%';
}

function multLabel(ball, conds) {
  if (ball.additive) {
    const b = heavyBonus(selectedPokemon?.weightKg || 0);
    return (b >= 0 ? '+' : '') + b + ' add.';
  }
  const m = ball.mult(conds);
  if (!isFinite(m)) return '∞';
  return (Math.round(m * 10) / 10).toFixed(1).replace('.', ',') + '×';
}

// ── Formula tooltip content ───────────────────────────────────────────────
const FORMULA_TOOLTIPS = {
  1: `<div class="tt-title">Gen-1-Formel (vereinfacht)</div>
      <div class="tt-formula">P = a ÷ 255<br>a = KP-Faktor × Fangrate × Ball × Status</div>
      <ul class="tt-rules">
        <li>KP-Faktor: (3 − 2 × KP%) ÷ 3</li>
        <li>Schlaf / Eis: <b>2,5×</b> Statusbonus</li>
        <li>Paralyse / Gift / Brand: 1,5×</li>
        <li>Hinweis: Echte Gen-1-Formel nutzt zwei separate RNG-Prüfungen</li>
      </ul>`,
  2: `<div class="tt-title">Gen-2-Formel</div>
      <div class="tt-formula">P = a ÷ 255<br>a = KP-Faktor × Fangrate × Ball × Status</div>
      <ul class="tt-rules">
        <li>KP-Faktor: (3 − 2 × KP%) ÷ 3</li>
        <li>Schlaf / Eis: <b>2,5×</b> Statusbonus</li>
        <li>Paralyse / Gift / Brand: <b>kein Bonus (Gen-II-Bug!)</b></li>
        <li>Neue Bälle: Mondball, Schwerball u.a.</li>
      </ul>`,
  3: `<div class="tt-title">Gen-3-Formel</div>
      <div class="tt-formula">P = a ÷ 255<br>a = KP-Faktor × Fangrate × Ball × Status</div>
      <ul class="tt-rules">
        <li>KP-Faktor: (3 − 2 × KP%) ÷ 3</li>
        <li>Schlaf / Eis: <b>2,0×</b> Statusbonus (↓ von 2,5× in Gen 1–2)</li>
        <li>Paralyse / Gift / Brand: 1,5×</li>
      </ul>`,
  4: `<div class="tt-title">Gen-4-Formel</div>
      <div class="tt-formula">P = a ÷ 255<br>a = KP-Faktor × Fangrate × Ball × Status</div>
      <ul class="tt-rules">
        <li>KP-Faktor: (3 − 2 × KP%) ÷ 3</li>
        <li>Schlaf / Eis: 2,0× Statusbonus</li>
        <li>Paralyse / Gift / Brand: 1,5×</li>
        <li>Schnellball: <b>4×</b> im ersten Zug</li>
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
    ? `⚠ ${selectedPokemon.germanName} was introduced in Generation ${range?.gen ?? '?'} and is not available in ${currentGame().label}.`
    : `⚠ ${selectedPokemon.germanName} wurde erst in Generation ${range?.gen ?? '?'} eingeführt und ist in ${currentGame().label} nicht verfügbar.`;
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
  const label = f <= 1 ? 'Gen-1-Formel'
    : f <= 2 ? 'Gen-2-Formel'
    : f <= 4 ? 'Gen-3–4-Formel'
    : f <= 5 ? 'Gen-5-Formel'
    : 'Gen-6+-Formel';
  document.getElementById('formula-badge').textContent = label;
}

// ── Render pokémon card ───────────────────────────────────────────────────
function renderPokemonCard() {
  const card = document.getElementById('poke-card');
  const tr = TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
  if (!selectedPokemon) {
    card.innerHTML = `
      <p class="poke-empty-hint" style="margin:0 0 10px">${tr.pokeEmptyHint}</p>
      <button id="btn-pick-pokemon" class="status-btn" style="font-size:0.88rem;padding:7px 18px">${tr.pokePickBtn}</button>`;
    document.getElementById('btn-pick-pokemon').addEventListener('click', openModal);
    return;
  }
  const p = selectedPokemon;
  const typeHtml = (p.types || []).map(t => `<span class="poke-type">${capitalize(t)}</span>`).join('');
  card.innerHTML = `
    <div class="poke-info">
      <img class="poke-info-sprite" src="${p.sprite}" alt="${p.germanName}">
      <div class="poke-info-body">
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:4px">
          <span class="poke-info-name">${p.germanName}</span>
          <span class="poke-info-id">#${p.id}</span>
          <button id="btn-pick-pokemon" class="status-btn" style="font-size:0.75rem;padding:3px 12px">${tr.pokeChangeBtn}</button>
        </div>
        <div class="poke-info-types">${typeHtml}</div>
        <div class="poke-info-stats">
          <span>${tr.catchRateLabel} <b><span class="catch-rate-badge">${p.captureRate}/255</span></b></span>
          <span>${tr.weightLabel} <b>${p.weightKg.toFixed(1).replace('.', ',')} kg</b></span>
          <span>${tr.speedLabel} <b>${p.baseSpeed}</b></span>
        </div>
      </div>
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
    div.title = ball.desc ?? '';
    div.innerHTML = `
      <img src="${ITEMS_SPRITE_URL}${ball.sprite}.png" alt="${ball.name}" onerror="this.style.opacity='0.3'">
      <div class="ball-name">${ball.name}</div>
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
      <img src="${ITEMS_SPRITE_URL}${ball.sprite}.png" alt="${ball.name}" onerror="this.style.opacity='0.3'">
      <div class="detail-header-text">
        <div class="detail-ball-name">${ball.name}</div>
        <div class="detail-ball-desc">${ball.desc ?? ''}</div>
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
      header.textContent = range?.label ?? '';
      list.appendChild(header);
    }
    const li = document.createElement('li');
    li.className = 'pokemon-card';
    li.innerHTML = `<img src="${p.sprite}" alt="${p.displayName}"><div>${p.displayName}</div>`;
    li.addEventListener('click', () => pickPokemon(p));
    list.appendChild(li);
  });
}

async function pickPokemon(p) {
  closeModal();
  const tr = TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
  document.getElementById('poke-card').innerHTML = `<p class="poke-empty-hint">${tr.pokeLoadingHint}</p>`;

  try {
    const [pokeRes, speciesRes] = await Promise.all([
      fetch(`${API}/pokemon/${p.name}`),
      fetch(`${API}/pokemon-species/${p.name}`),
    ]);
    const [poke, species] = await Promise.all([pokeRes.json(), speciesRes.json()]);
    const germanName = species.names?.find(n => n.language.name === 'de')?.name || capitalize(p.name);

    selectedPokemon = {
      id:          poke.id,
      name:        poke.name,
      germanName,
      sprite:      poke.sprites.front_default,
      types:       poke.types.map(t => t.type.name),
      captureRate: species.capture_rate,
      weightKg:    poke.weight / 10,
      baseSpeed:   poke.stats[5].base_stat,
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
        tooltip.innerHTML = FORMULA_TOOLTIPS[currentGame().formula] ?? '';
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
      return { id, name: p.name, displayName: capitalize(p.name), sprite: `${POKE_SPRITE_URL}${id}.png` };
    }).filter(Boolean);
  });

  // Background: progressively load German names
  allPokemonList.forEach(p => {
    getPokemonSpecies(p.name)
      .then(s => { if (s.germanName) p.displayName = s.germanName; })
      .catch(() => {});
  });

  // Auto-load default Pokémon
  pickPokemon({ name: 'bulbasaur' }).catch(() => {});
}

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
  // Re-render pokemon card and ball grid (contains translated strings)
  renderPokemonCard();
  renderBallGrid();
  renderGenFilterBar();
}

document.getElementById('lang-toggle').addEventListener('click', () => {
  window.LANG = window.LANG === 'de' ? 'en' : 'de';
  localStorage.setItem('hub-lang', window.LANG);
  document.documentElement.lang = window.LANG;
  applyLang();
});
applyLang();

init().catch(console.error);
