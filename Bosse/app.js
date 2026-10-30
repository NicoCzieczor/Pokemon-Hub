/*
 * Boss-Planer (Platin): jeder Kampf mit dem kompletten Gegner-Team – und wie das eigene Team dagegen abschneidet.
 *
 * Daten:  bosses.json (tools/build-bosses.js) – Teams so, wie das Spiel sie erzeugt (Attacken, DVs, Wesen, Fähigkeit)
 *         ../SaveViewer/data-pt.js (PT_DATA) – Basiswerte, Typen, Attacken, alle Namen
 *         ../SaveViewer/pt-save.js (PtSave) – liest den Spielstand. Die Spielstände teilt sich der Planer mit dem
 *                                             Save-Viewer (IndexedDB „pokehub-saveviewer“).
 *         ../DamageCalc/mechanics.js (DMG) – Gen-4-Schadensformel, Typentabelle, Statuswerte
 *         ../Karte/trainer-classes.js (TrainerClasses) – Trainerklassen und deutsche Namen
 * Werte-Reihenfolge überall wie im Spiel: KP, Ang, Vert, Init, SpAng, SpVert.
 */
window.LANG = localStorage.getItem('hub-lang') || 'de';
document.documentElement.lang = window.LANG;

const TEXT = {
  de: {
    title: 'Boss-Planer',
    gameBadge: 'Platin',
    subtitle: 'Jeder Kampf mit dem kompletten Gegner-Team – und wie dein Team aus dem Spielstand dagegen abschneidet.',
    loadSave: 'Spielstand laden', starter: 'Dein Starter', weather: 'Wetter',
    loadRom: 'Randomizer-ROM laden', romActive: 'Randomisiert:', romRemove: 'Randomizer-Daten entfernen – wieder die Original-Teams',
    romReading: 'Lese ROM …', romError: 'Das ist keine Pokémon-Platin-ROM (.nds).',
    romHint: 'Für Randomizer-Runs: Lade deine randomisierte ROM (.nds) – dann zeigt der Planer die echten Teams deines Spiels. Gelesen werden nur Trainer und wilde Pokémon (ca. 200 KB) – das gilt dann auch für Karte und Run-Dashboard. Die Datei bleibt auf deinem Gerät.',
    randoTag: 'Randomizer',
    wNone: 'Kein Wetter', wSun: 'Sonne', wRain: 'Regen', wSand: 'Sandsturm',
    tabStory: 'Story', tabPost: 'Nach der Liga', tabAll: 'Alle Trainer',
    searchPlaceholder: 'Trainer, Ort oder Pokémon suchen…',
    footNote: 'Teams, Attacken, DVs, Wesen und Fähigkeiten aus dem Spielcode von Platin (pret/pokeplatinum) oder aus deiner randomisierten ROM, berechnet wie im Spiel. Schaden nach der Gen-4-Formel des Schadens-Rechners – ohne Statusänderungen im Kampf. ROM-Hacks wie Renegade Platinum haben andere Teams.',
    pickTitle: 'Pokémon aus der Box', pickSearch: 'Suchen…',
    loadError: 'Die Kampfdaten konnten nicht geladen werden.',
    saveError: 'Das ist kein Platin-Spielstand (.sav/.dsv aus dem Emulator, im Spiel gespeichert).',
    noSaveTitle: 'Kein Spielstand geladen',
    noSaveText: 'Lade deinen Platin-Spielstand – dann siehst du für jedes Gegner-Pokémon, wer aus deinem Team es am besten schafft. Spielstände aus dem Save-Viewer sind sofort da.',
    badges: n => `${n} Orden`, addBox: '+ Box', resetTeam: '↺ Team', removeMon: 'Aus der Planung nehmen',
    manualTab: 'Eigenes Team', addMon: '+ Pokémon', fromSolo: 'Aus Solo', fromDuo1: 'Aus Duo (Spieler 1)', fromDuo2: 'Aus Duo (Spieler 2)',
    pickSpecies: 'Pokémon wählen', editMon: 'Bearbeiten', replaceTeam: 'Dein eigenes Team hier ersetzen?', allToCap: lv => `Alle auf Lv. ${lv}`,
    manualNote: 'Ohne Spielstand: DVs 15, keine EVs, kein Item angenommen. Antippen zum Bearbeiten.',
    noTeamTitle: 'Noch kein Team', noTeamText: 'Lade deinen Platin-Spielstand – oder stelle dein Team von Hand zusammen bzw. übernimm es aus Solo oder Duo (oben unter „Eigenes Team“).',
    levelLabel: 'Level', natureLabel: 'Wesen', abilityLabel: 'Fähigkeit', movesLabel: 'Attacken', noMove: '—',
    learnable: 'Lernt es in Platin', otherMoves: 'Alle anderen Attacken', suggestMoves: 'Level-Attacken vorschlagen',
    changeMon: 'Anderes Pokémon', done: 'Fertig', removeFromTeam: 'Entfernen',
    movesOffline: 'Die Lernliste konnte nicht geladen werden (offline?) – Attacken bitte selbst wählen.',
    randoMoves: 'Randomizer: Vorgeschlagen sind die Attacken aus dem Original-Platin – bitte anpassen.',
    notInPlatinum: n => `${n} Pokémon gibt es in Platin nicht und ${n === 1 ? 'wurde' : 'wurden'} übersprungen.`,
    importFailed: 'Übernahme fehlgeschlagen – PokéAPI nicht erreichbar (offline?).',
    close: 'Schließen', fightLabel: 'Kampf',
    next: 'Nächster Kampf', fightNo: (i, n) => `Kampf ${i} von ${n}`, levelCap: 'Level-Cap',
    double: 'Doppelkampf', tagWith: p => `zusammen mit ${p}`, heals: 'Heilt im Kampf', onMap: 'Auf der Karte',
    rivalBy: p => `Team passend zu deinem Starter ${p}`,
    ability: 'Fähigkeit', item: 'Item', nature: 'Wesen', ivs: 'DVs', noItem: '—', neutral: 'neutral',
    stat: ['KP', 'Ang', 'Vert', 'Init', 'SpAng', 'SpVert'],
    cat: { 2: 'Phys.', 3: 'Spez.', 1: 'Status' }, prio: p => `Priorität ${p > 0 ? '+' : ''}${p}`,
    vsTeam: 'Gegen dein Team', you: 'Du', foe: 'Gegner',
    faster: 'schneller', slower: 'langsamer', speedTie: 'gleich schnell',
    hko: n => (n === 1 ? 'K.O. mit 1 Treffer' : `K.O. in ${n} Treffern`),
    hkoChance: (p, n) => `${p} %: K.O. ${n === 1 ? 'mit 1 Treffer' : `in ${n} Treffern`}`,
    noKo: 'kein K.O. in 4 Treffern', noDamage: 'kein Schaden', immune: 'wirkungslos', fails: 'wirkt nicht (Level zu niedrig)',
    ohkoMove: p => `K.O. bei Treffer (${p} %)`,
    win: 'gewinnt', trade: 'knapp', lose: 'verliert', best: 'Beste Antwort',
    allMoves: 'Alle Attacken', yourMoves: 'Deine Attacken', theirMoves: 'Seine Attacken',
    crit: p => `Volltreffer: ${p}`, critKo: p => `mit Volltreffer ${p} % K.O.`,
    warnTitle: 'Achtung', overCap: (c, list) => `Über dem Level-Cap ${c}: ${list}`,
    danger: (me, list) => `${me} fällt mit einem Treffer gegen: ${list}`,
    noThreats: 'Kein Gegner-Pokémon kann eins deiner Pokémon mit einem Treffer besiegen (ohne Volltreffer).',
    hits: (a, b) => (a === b ? `${a}×` : `${a}–${b}×`),
    n: {
      intim: 'inkl. Einschüchterung (−1 Angriff)', explosion: 'halbiert die Verteidigung, besiegt den Anwender',
      fixed: 'fester Schaden', flail: 'stärker bei wenig KP (hier volle KP)', eruption: 'schwächer bei wenig KP (hier volle KP)',
      payback: 'doppelt, wenn langsamer', revenge: 'doppelt nach erlittenem Treffer (Priorität −4)',
      magnitude: 'Stärke zufällig (Durchschnitt)', charge: 'braucht eine Runde zum Aufladen', recharge: 'danach eine Runde Pause',
      berry: 'Beere halbiert den ersten Treffer', future: 'trifft nach 2 Runden, ohne Typ', facade: 'doppelt mit Statusproblem',
      brine: 'doppelt, wenn das Ziel unter halben KP ist', rollout: 'wird jede Runde stärker', return: 'nach Freundschaft',
      returnFoe: 'Freundschaft des Gegners angenommen (70)', hiddenPower: 'Kraftreserve', firstTurn: 'nur in der ersten Runde',
      variable: 'Stärke hängt von der Situation ab', reckless: 'Rückstoß',
    },
    starters: { turtwig: 387, chimchar: 390, piplup: 393 },
  },
  en: {
    title: 'Boss Planner',
    gameBadge: 'Platinum',
    subtitle: 'Every battle with the full enemy team – and how your team from your save file does against it.',
    loadSave: 'Load save file', starter: 'Your starter', weather: 'Weather',
    loadRom: 'Load randomizer ROM', romActive: 'Randomized:', romRemove: 'Remove randomizer data – back to the original teams',
    romReading: 'Reading ROM …', romError: 'This is not a Pokémon Platinum ROM (.nds).',
    romHint: 'For randomizer runs: load your randomized ROM (.nds) and the planner shows the real teams of your game. Only trainers and wild Pokémon are read (about 200 KB) – this then also applies to the map and run dashboard. The file stays on your device.',
    randoTag: 'Randomizer',
    wNone: 'No weather', wSun: 'Sun', wRain: 'Rain', wSand: 'Sandstorm',
    tabStory: 'Story', tabPost: 'Post-game', tabAll: 'All trainers',
    searchPlaceholder: 'Search trainer, place or Pokémon…',
    footNote: 'Teams, moves, IVs, natures and abilities from the Platinum game code (pret/pokeplatinum) or from your randomized ROM, generated like in the game. Damage uses the Gen 4 formula of the Damage Calculator – without stat changes during battle. ROM hacks such as Renegade Platinum have different teams.',
    pickTitle: 'Pokémon from your boxes', pickSearch: 'Search…',
    loadError: 'The battle data could not be loaded.',
    saveError: 'This is not a Platinum save file (.sav/.dsv from your emulator, saved in-game).',
    noSaveTitle: 'No save file loaded',
    noSaveText: 'Load your Platinum save file – then you see, for every enemy Pokémon, who on your team handles it best. Saves from the Save Viewer are available right away.',
    badges: n => `${n} badges`, addBox: '+ Box', resetTeam: '↺ Team', removeMon: 'Remove from planning',
    manualTab: 'Own team', addMon: '+ Pokémon', fromSolo: 'From Solo', fromDuo1: 'From Duo (player 1)', fromDuo2: 'From Duo (player 2)',
    pickSpecies: 'Choose Pokémon', editMon: 'Edit', replaceTeam: 'Replace your own team here?', allToCap: lv => `All to Lv. ${lv}`,
    manualNote: 'Without a save: IVs 15, no EVs, no item assumed. Tap to edit.',
    noTeamTitle: 'No team yet', noTeamText: 'Load your Platinum save file – or build your team by hand or take it over from Solo or Duo (above under “Own team”).',
    levelLabel: 'Level', natureLabel: 'Nature', abilityLabel: 'Ability', movesLabel: 'Moves', noMove: '—',
    learnable: 'Learns it in Platinum', otherMoves: 'All other moves', suggestMoves: 'Suggest level-up moves',
    changeMon: 'Other Pokémon', done: 'Done', removeFromTeam: 'Remove',
    movesOffline: 'The learnset could not be loaded (offline?) – please pick the moves yourself.',
    randoMoves: 'Randomizer: the suggested moves are from vanilla Platinum – please adjust.',
    notInPlatinum: n => `${n} Pokémon ${n === 1 ? 'does' : 'do'} not exist in Platinum and ${n === 1 ? 'was' : 'were'} skipped.`,
    importFailed: 'Import failed – PokéAPI not reachable (offline?).',
    close: 'Close', fightLabel: 'Battle',
    next: 'Next battle', fightNo: (i, n) => `Battle ${i} of ${n}`, levelCap: 'Level cap',
    double: 'Double battle', tagWith: p => `together with ${p}`, heals: 'Heals in battle', onMap: 'On the map',
    rivalBy: p => `Team for your starter ${p}`,
    ability: 'Ability', item: 'Item', nature: 'Nature', ivs: 'IVs', noItem: '—', neutral: 'neutral',
    stat: ['HP', 'Atk', 'Def', 'Spe', 'SpA', 'SpD'],
    cat: { 2: 'Phys.', 3: 'Spec.', 1: 'Status' }, prio: p => `Priority ${p > 0 ? '+' : ''}${p}`,
    vsTeam: 'Against your team', you: 'You', foe: 'Foe',
    faster: 'faster', slower: 'slower', speedTie: 'speed tie',
    hko: n => (n === 1 ? 'OHKO' : `${n}HKO`),
    hkoChance: (p, n) => `${p} % to ${n === 1 ? 'OHKO' : `${n}HKO`}`,
    noKo: 'no KO in 4 hits', noDamage: 'no damage', immune: 'no effect', fails: 'fails (level too low)',
    ohkoMove: p => `KO if it hits (${p} %)`,
    win: 'wins', trade: 'close', lose: 'loses', best: 'Best answer',
    allMoves: 'All moves', yourMoves: 'Your moves', theirMoves: 'Their moves',
    crit: p => `Crit: ${p}`, critKo: p => `${p} % KO with a crit`,
    warnTitle: 'Watch out', overCap: (c, list) => `Above the level cap ${c}: ${list}`,
    danger: (me, list) => `${me} goes down in one hit to: ${list}`,
    noThreats: 'No enemy Pokémon can KO one of yours in a single hit (without a crit).',
    hits: (a, b) => (a === b ? `${a}×` : `${a}–${b}×`),
    n: {
      intim: 'incl. Intimidate (−1 Attack)', explosion: 'halves Defense, faints the user',
      fixed: 'fixed damage', flail: 'stronger at low HP (full HP here)', eruption: 'weaker at low HP (full HP here)',
      payback: 'doubled when moving second', revenge: 'doubled after being hit (priority −4)',
      magnitude: 'random power (average)', charge: 'needs a turn to charge', recharge: 'must recharge afterwards',
      berry: 'berry halves the first hit', future: 'hits two turns later, typeless', facade: 'doubled with a status condition',
      brine: 'doubled if the target is below half HP', rollout: 'gets stronger every turn', return: 'based on friendship',
      returnFoe: 'enemy friendship assumed (70)', hiddenPower: 'Hidden Power', firstTurn: 'first turn only',
      variable: 'power depends on the situation', reckless: 'recoil',
    },
    starters: { turtwig: 387, chimchar: 390, piplup: 393 },
  },
};
const tr = () => TEXT[window.LANG] || TEXT.de;
const isEn = () => window.LANG === 'en';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const pct = x => (x >= 10 ? Math.round(x) : Math.round(x * 10) / 10).toLocaleString(isEn() ? 'en-US' : 'de-DE');

// ── Spieldaten ────────────────────────────────────────────────────────────────
const PT = window.PT_DATA;
const T = () => PT.text[isEn() ? 'en' : 'de'];
const TYPES = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass',
  'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy'];
// Typfarben wie im Save-Viewer (Reihenfolge = Typ-Index der Spieldaten)
const TYPE_HEX = ['#bbbbaa', '#bb5544', '#96caff', '#9553cd', '#a67439', '#bbaa66', '#92c12a', '#6e4370', '#aaaabb',
  '#ff421c', '#2c9be3', '#62bc5a', '#ffdc00', '#ff6380', '#74cfc0', '#5670be', '#4e4545', '#ec8fe6'];
const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
const PT_SPR = `${SPR}/pokemon/versions/generation-iv/platinum/`;
const ICON_SPR = `${SPR}/pokemon/versions/generation-vii/icons/`;
const key = s => String(s || '').toLowerCase().replace(/[^a-z]/g, ''); // englischer Name → Schlüssel
const abilityKey = m => key(PT.text.en.abilities[m.ability]);
const itemKey = m => key(PT.text.en.items[m.item]);
const moveKey = id => key(PT.text.en.moves[id]);

// Items und Fähigkeiten, die den Schaden ändern (Gen 4)
const TYPE_ITEMS = {
  silkscarf: 'normal', blackbelt: 'fighting', sharpbeak: 'flying', poisonbarb: 'poison', softsand: 'ground', hardstone: 'rock',
  silverpowder: 'bug', spelltag: 'ghost', metalcoat: 'steel', charcoal: 'fire', mysticwater: 'water', miracleseed: 'grass',
  magnet: 'electric', twistedspoon: 'psychic', nevermeltice: 'ice', dragonfang: 'dragon', blackglasses: 'dark',
  flameplate: 'fire', splashplate: 'water', zapplate: 'electric', meadowplate: 'grass', icicleplate: 'ice', fistplate: 'fighting',
  toxicplate: 'poison', earthplate: 'ground', skyplate: 'flying', mindplate: 'psychic', insectplate: 'bug', stoneplate: 'rock',
  spookyplate: 'ghost', dracoplate: 'dragon', dreadplate: 'dark', ironplate: 'steel',
  oddincense: 'psychic', rockincense: 'rock', roseincense: 'grass', waveincense: 'water',
};
const RESIST_BERRIES = {
  occaberry: 'fire', passhoberry: 'water', wacanberry: 'electric', rindoberry: 'grass', yacheberry: 'ice', chopleberry: 'fighting',
  kebiaberry: 'poison', shucaberry: 'ground', cobaberry: 'flying', payapaberry: 'psychic', tangaberry: 'bug', chartiberry: 'rock',
  kasibberry: 'ghost', habanberry: 'dragon', colburberry: 'dark', babiriberry: 'steel', chilanberry: 'normal',
};
const PUNCH = new Set(['bulletpunch', 'cometpunch', 'dizzypunch', 'drainpunch', 'dynamicpunch', 'firepunch', 'focuspunch', 'hammerarm',
  'icepunch', 'machpunch', 'megapunch', 'meteormash', 'shadowpunch', 'skyuppercut', 'thunderpunch']);
const RECOIL = new Set(['RECOIL_HALF', 'RECOIL_QUARTER', 'RECOIL_THIRD', 'RECOIL_BURN_HIT', 'RECOIL_PARALYZE_HIT', 'CRASH_ON_MISS']);
const HIGH_CRIT = new Set(['HIGH_CRITICAL', 'HIGH_CRITICAL_BURN_HIT', 'HIGH_CRITICAL_POISON_HIT', 'CHARGE_TURN_HIGH_CRIT', 'CHARGE_TURN_HIGH_CRIT_FLINCH']);
// Attacken, deren Schaden sich nicht sinnvoll vorab rechnen lässt
const SKIP = new Set(['COUNTER', 'MIRROR_COAT', 'METAL_BURST', 'BIDE', 'SET_HP_EQUAL_TO_USER', 'BEAT_UP', 'SPIT_UP',
  'RANDOM_POWER_MAYBE_HEAL', 'FLING', 'NATURAL_GIFT']);

// ── Zustand ───────────────────────────────────────────────────────────────────
let B = null;                 // bosses.json
const state = {
  list: 'story', fight: null, search: '', weather: '', starter: localStorage.getItem('bosse-starter') || 'turtwig',
  saves: [], save: 0, team: [], open: new Set(),
  rando: loadRando(),         // Teams aus einer randomisierten ROM (rando.js), sonst null
};

// Randomizer-Daten bleiben auf dem Gerät (localStorage, damit sie auch im Backup landen)
function loadRando() {
  try { return JSON.parse(localStorage.getItem('bosse-rando') || 'null'); } catch (e) { return null; }
}

// ── Kämpfer ───────────────────────────────────────────────────────────────────
// Basiswerte, Typen, Fähigkeiten: aus der randomisierten ROM, falls dort geändert; Formen wie im Spiel
function personalOf(sp, form) {
  const over = (state.rando && state.rando.personal) || {};
  const get = i => over[i] || PT.personal[i];
  const p = get(sp);
  return (p && form > 0 && form < p[12] && p[13] > 0 ? get(p[13] + form - 1) : null) || p || [];
}
const starterSpecies = key => (state.rando && state.rando.starters
  ? state.rando.starters[['turtwig', 'chimchar', 'piplup'].indexOf(key)] : tr().starters[key]);

// Gemeinsame Form für Gegner und eigene Pokémon
function foeMon(p) {
  const [sp, form, level, item, moves, nature, ability, iv] = p;
  const per = personalOf(sp, form);
  const base = per.slice(0, 6);
  const ivs = Array.isArray(iv) ? iv : [iv, iv, iv, iv, iv, iv]; // Liste = vom Spiel gewürfelte DVs
  return {
    side: 'foe', species: sp, form, level, item, moves, nature, ability, ivs, friendship: 70,
    types: per[6] === per[7] ? [per[6]] : [per[6], per[7]],
    stats: PtSave.calcStats(base, ivs, [0, 0, 0, 0, 0, 0], level, nature, sp),
    name: T().species[sp] || `#${sp}`,
  };
}
function ownMon(m) {
  // Hat der Randomizer Typen/Basiswerte geändert, gelten die (Team-Werte stehen schon richtig im Spielstand)
  let types = m.types, stats = m.stats;
  const over = state.rando && state.rando.personal;
  if (over && Object.keys(over).length) {
    const per = personalOf(m.species, m.form);
    if (per.length) {
      types = per[6] === per[7] ? [per[6]] : [per[6], per[7]];
      if (m.where && m.where.area !== 'party') stats = PtSave.calcStats(per.slice(0, 6), m.iv, m.ev, m.level, m.nature, m.species);
    }
  }
  return {
    side: 'me', species: m.species, form: m.form, level: m.level, item: m.item, moves: (m.moves || []).filter(Boolean),
    nature: m.nature, ability: m.ability, ivs: m.iv, friendship: m.friendship, types, stats,
    name: m.isNicknamed && m.nickname ? m.nickname : (T().species[m.species] || `#${m.species}`), key: monKey(m),
  };
}
const monKey = m => `${(m.pid >>> 0).toString(16)}-${m.tid}-${m.sid}`;

// Kraftreserve aus den DVs (Bit-Reihenfolge KP, Ang, Vert, Init, SpAng, SpVert)
function hiddenPower(m) {
  let a = 0, b = 0;
  for (let s = 0; s < 6; s++) { a += (m.ivs[s] & 1) << s; b += ((m.ivs[s] >> 1) & 1) << s; }
  return { type: Math.floor(a * 15 / 63) + 1, power: Math.floor(b * 40 / 63) + 30 };
}

function speedOf(m) {
  let s = m.stats[3];
  const it = itemKey(m), ab = abilityKey(m);
  if (it === 'choicescarf') s = Math.floor(s * 1.5);
  if (it === 'ironball' || it === 'machobrace') s = Math.floor(s / 2);
  if ((ab === 'chlorophyll' && state.weather === 'sun') || (ab === 'swiftswim' && state.weather === 'rain')) s *= 2;
  return s;
}

// ── Schaden ───────────────────────────────────────────────────────────────────
/*
 * Ergebnis je Attacke: { kind: 'dmg' | 'immune' | 'fail' | 'ohko' | null, rolls, critRolls, hits, notes, … }
 * rolls sind die 16 möglichen Schadenswerte eines Treffers; hits = Verteilung der Trefferzahl bei Mehrfachtreffern.
 */
function calcMove(att, def, mid) {
  const mi = PT.moveInfo[mid];
  if (!mi) return null;
  const [baseType, , basePower, acc, cat] = mi;
  if (cat === 1) return null;
  const [prio, eff] = B.moveExtra[mid] || [0, 'HIT'];
  const t = tr();
  const notes = [];
  const out = (o) => ({ mid, prio, acc, cat, notes, ...o });
  if (SKIP.has(eff)) return null;

  const aAb = abilityKey(att), aIt = itemKey(att), dIt = itemKey(def);
  const dAb = aAb === 'moldbreaker' ? '' : abilityKey(def);
  const defTypes = def.types.map(x => TYPES[x]);

  // Typ und Stärke
  let type = baseType, power = basePower, typeless = false;
  if (eff === 'RANDOM_POWER_BASED_ON_IVS') { const hp = hiddenPower(att); type = hp.type; power = hp.power; }
  if (eff === 'CHANGE_TYPE_WITH_WEATHER' && state.weather) { type = { sun: 9, rain: 10, sand: 5 }[state.weather]; power = 100; }
  if (eff === 'HIT_IN_3_TURNS') { typeless = true; notes.push(t.n.future); }
  if (aAb === 'normalize') type = 0;
  const tName = TYPES[type];

  // Typ-Wirkung und Fähigkeiten, die Attacken schlucken
  let effs = typeless ? [1] : DMG.typeEffs(tName, defTypes, 4);
  if (aAb === 'scrappy' && (tName === 'normal' || tName === 'fighting')) effs = effs.map(e => (e === 0 ? 1 : e));
  const mult = DMG.product(effs);
  const swallowed = (dAb === 'levitate' && tName === 'ground') || (dAb === 'flashfire' && tName === 'fire')
    || ((dAb === 'waterabsorb' || dAb === 'dryskin') && tName === 'water') || ((dAb === 'voltabsorb' || dAb === 'motordrive') && tName === 'electric')
    || (dAb === 'wonderguard' && !typeless && mult < 2);
  if (mult === 0 || swallowed) return out({ kind: 'immune', type });

  // Feste Schäden und K.O.-Attacken
  const hp = def.stats[0];
  const fixed = dmg => out({ kind: 'dmg', type, rolls: new Array(16).fill(Math.min(dmg, hp)), critRolls: null, fixed: true, notes: [...notes, t.n.fixed] });
  if (eff === 'LEVEL_DAMAGE_FLAT') return fixed(att.level);
  if (eff === '20_DAMAGE_FLAT') return fixed(20);
  if (eff === '40_DAMAGE_FLAT') return fixed(40);
  if (eff === 'HALVE_HP') return fixed(Math.max(1, Math.floor(hp / 2)));
  if (eff === 'RANDOM_DAMAGE_1_TO_150_LEVEL') { // Psystoß: 0,5- bis 1,5-faches Level
    const rolls = Array.from({ length: 16 }, (_, i) => Math.max(1, Math.floor(att.level * (50 + Math.round(i * 100 / 15)) / 100)));
    return out({ kind: 'dmg', type, rolls, critRolls: null, fixed: true });
  }
  if (eff === 'ONE_HIT_KO') {
    if (def.level > att.level || dAb === 'sturdy') return out({ kind: 'fail', type });
    return out({ kind: 'ohko', type, chance: Math.min(100, acc + att.level - def.level) });
  }

  // Stärke je nach Situation
  if (eff === 'INCREASE_POWER_WITH_WEIGHT') {
    const w = B.weight[def.species] || 0;
    power = w < 100 ? 20 : w < 250 ? 40 : w < 500 ? 60 : w < 1000 ? 80 : w < 2000 ? 100 : 120;
  }
  if (eff === 'POWER_BASED_ON_LOW_SPEED') power = Math.min(150, Math.floor(25 * speedOf(def) / Math.max(1, speedOf(att))) + 1);
  if (eff === 'INCREASE_POWER_WITH_LESS_HP') { power = 20; notes.push(t.n.flail); }
  if (eff === 'DECREASE_POWER_WITH_LESS_USER_HP') { power = 150; notes.push(t.n.eruption); }
  if (eff === 'INCREASE_POWER_WITH_MORE_HP') power = 121;
  if (eff === 'POWER_BASED_ON_FRIENDSHIP') { power = Math.max(1, Math.floor(att.friendship * 10 / 25)); notes.push(att.side === 'foe' ? t.n.returnFoe : t.n.return); }
  if (eff === 'POWER_BASED_ON_LOW_FRIENDSHIP') { power = Math.max(1, Math.floor((255 - att.friendship) * 10 / 25)); notes.push(att.side === 'foe' ? t.n.returnFoe : t.n.return); }
  if (eff === 'HIGHER_POWER_WHEN_LOW_PP') power = 40;
  if (eff === 'INCREASE_POWER_WITH_MORE_STAT_UP') power = 60;
  if (eff === 'DOUBLE_POWER_WHEN_STATUSED') notes.push(t.n.facade);
  if (eff === 'DOUBLE_POWER_WHEN_BELOW_HALF') notes.push(t.n.brine);
  if (eff === 'DOUBLE_POWER_IF_MOVING_SECOND') { if (speedOf(att) < speedOf(def)) power *= 2; notes.push(t.n.payback); }
  if (eff === 'DOUBLE_POWER_IF_HIT') { power *= 2; notes.push(t.n.revenge); }
  if (eff === 'PSYWAVE') { power = 71; notes.push(t.n.magnitude); } // Intensität (heißt in den Daten so)
  if (eff === 'DOUBLE_POWER_EACH_TURN' || eff === 'DOUBLE_POWER_EACH_TURN_LOCK_INTO') notes.push(t.n.rollout);
  if (eff.startsWith('CHARGE_TURN') || eff === 'FLY' || eff === 'DIG' || eff === 'DIVE' || eff === 'BOUNCE' || eff === 'SHADOW_FORCE') notes.push(t.n.charge);
  if (eff === 'RECHARGE_AFTER') notes.push(t.n.recharge);
  if (eff === 'ALWAYS_FLINCH_FIRST_TURN_ONLY') notes.push(t.n.firstTurn);
  if (eff === 'RANDOM_POWER_BASED_ON_IVS') notes.push(`${t.n.hiddenPower} ${T().types[type]} ${power}`);
  if (power <= 1) return null;

  // Trefferzahl
  let hits = null;
  if (eff === 'HIT_TWICE' || eff === 'POISON_MULTI_HIT') hits = { 2: 1 };
  if (eff === 'MULTI_HIT') hits = aAb === 'skilllink' ? { 5: 1 } : { 2: 0.375, 3: 0.375, 4: 0.125, 5: 0.125 };

  // Werte
  const phys = cat === 2;
  let A = phys ? att.stats[1] : att.stats[4];
  let Dv = phys ? def.stats[2] : def.stats[5];
  if (phys && (aAb === 'hugepower' || aAb === 'purepower')) A *= 2;
  if (phys && aAb === 'hustle') A = Math.floor(A * 1.5);
  if (phys && aIt === 'choiceband') A = Math.floor(A * 1.5);
  if (!phys && aIt === 'choicespecs') A = Math.floor(A * 1.5);
  if (aIt === 'lightball' && att.species === 25) A *= 2;
  if (phys && aIt === 'thickclub' && (att.species === 104 || att.species === 105)) A *= 2;
  if (!phys && aIt === 'deepseatooth' && att.species === 366) A *= 2;
  if (!phys && aIt === 'souldew' && (att.species === 380 || att.species === 381)) A = Math.floor(A * 1.5);
  if (!phys && dIt === 'deepseascale' && def.species === 366) Dv *= 2;
  if (phys && dIt === 'metalpowder' && def.species === 132) Dv *= 2;
  if (!phys && dIt === 'souldew' && (def.species === 380 || def.species === 381)) Dv = Math.floor(Dv * 1.5);
  if (!phys && state.weather === 'sand' && def.types.includes(5)) Dv = Math.floor(Dv * 1.5);
  // Einschüchterung: wer gegen ein Pokémon mit Einschüchterung antritt, hat −1 Angriff
  if (phys && dAb === 'intimidate' && aAb !== 'clearbody' && aAb !== 'hypercutter' && aAb !== 'whitesmoke') {
    A = Math.floor(A * 2 / 3);
    notes.push(t.n.intim);
  }
  if (dAb === 'thickfat' && (tName === 'fire' || tName === 'ice')) A = Math.floor(A / 2);

  // Stärke-Faktoren
  let bp = power;
  if (TYPE_ITEMS[aIt] === tName) bp = Math.floor(bp * 1.2);
  if (aIt === 'seaincense' && tName === 'water') bp = Math.floor(bp * 1.05);
  if (phys && aIt === 'muscleband') bp = Math.floor(bp * 1.1);
  if (!phys && aIt === 'wiseglasses') bp = Math.floor(bp * 1.1);
  if (((aIt === 'adamantorb' && att.species === 483) || (aIt === 'lustrousorb' && att.species === 484) || (aIt === 'griseousorb' && att.species === 487))
    && (tName === 'dragon' || att.types.includes(type))) bp = Math.floor(bp * 1.2);
  if (aAb === 'technician' && bp <= 60) bp = Math.floor(bp * 1.5);
  if (aAb === 'ironfist' && PUNCH.has(moveKey(mid))) bp = Math.floor(bp * 1.2);
  if (aAb === 'reckless' && RECOIL.has(eff)) bp = Math.floor(bp * 1.2);
  if (dAb === 'heatproof' && tName === 'fire') bp = Math.floor(bp / 2);
  if (dAb === 'dryskin' && tName === 'fire') bp = Math.floor(bp * 1.25);

  const stab = !typeless && att.types.includes(type);
  const weather = state.weather === 'sun' || state.weather === 'rain' ? state.weather : null;
  const params = { gen: 4, level: att.level, power: bp, atk: Math.max(1, A), def: Math.max(1, Dv), physical: phys, stab, effs,
    burn: false, screens: false, weather, moveType: tName, explosion: eff === 'HALVE_DEFENSE' };
  const finish = rolls => rolls.map(x => {
    if (stab && aAb === 'adaptability') x = Math.floor(x * 4 / 3);
    if (aIt === 'lifeorb') x = Math.floor(x * 1.3);
    if (aIt === 'expertbelt' && mult > 1) x = Math.floor(x * 1.2);
    if (aAb === 'tintedlens' && mult < 1) x *= 2;
    if ((dAb === 'filter' || dAb === 'solidrock') && mult > 1) x = Math.floor(x * 0.75);
    return Math.max(1, x);
  });
  let rolls = finish(DMG.damageRolls({ ...params, crit: false }));
  let critRolls = finish(DMG.damageRolls({ ...params, crit: true }));
  if (aAb === 'sniper') critRolls = critRolls.map(x => Math.floor(x * 1.5));
  // Resistenz-Beeren halbieren den ersten passenden Treffer
  const berry = RESIST_BERRIES[dIt];
  if (berry && berry === tName && (mult > 1 || berry === 'normal')) {
    rolls = rolls.map(x => Math.max(1, Math.floor(x / 2)));
    critRolls = critRolls.map(x => Math.max(1, Math.floor(x / 2)));
    notes.push(t.n.berry);
  }
  // Dreifachkick: 10, 20, 30 Stärke nacheinander
  if (eff === 'HIT_THREE_TIMES') {
    const sum = [1, 2, 3].map(k => finish(DMG.damageRolls({ ...params, power: Math.floor(bp * k), crit: false })));
    return out({ kind: 'dmg', type, rolls: sum[0].map((_, i) => sum[0][i] + sum[1][i] + sum[2][i]), critRolls: null, triple: true, mult });
  }
  if (eff === 'HALVE_DEFENSE') notes.push(t.n.explosion);
  if (RECOIL.has(eff) && aAb === 'reckless') notes.push(t.n.reckless);

  // Volltreffer-Chance: Stufe 0 = 1/16, 1 = 1/8, 2 = 1/4 …
  let stage = HIGH_CRIT.has(eff) ? 1 : 0;
  if (aAb === 'superluck') stage++;
  if (aIt === 'scopelens' || aIt === 'razorclaw') stage++;
  if ((aIt === 'stick' && att.species === 83) || (aIt === 'luckypunch' && att.species === 113)) stage += 2;
  const critChance = dAb === 'battlearmor' || dAb === 'shellarmor' ? 0 : [1 / 16, 1 / 8, 1 / 4, 1 / 3, 1 / 2][Math.min(stage, 4)];
  return out({ kind: 'dmg', type, rolls, critRolls, hits, critChance, mult, power: bp });
}

// ── Wahrscheinlichkeiten ──────────────────────────────────────────────────────
// Verteilungen als Map Schaden → Wahrscheinlichkeit, Summen bei hp gedeckelt
function convolve(a, b, cap) {
  const out = new Map();
  for (const [x, px] of a) for (const [y, py] of b) {
    const s = Math.min(cap, x + y);
    out.set(s, (out.get(s) || 0) + px * py);
  }
  return out;
}
const uniform = rolls => { const m = new Map(); for (const r of rolls) m.set(r, (m.get(r) || 0) + 1 / rolls.length); return m; };
// Schaden einer Anwendung (Mehrfachtreffer eingerechnet); withCrit mischt die Volltreffer-Chance ein
function useDist(res, cap, withCrit = false) {
  let one = uniform(res.rolls);
  if (withCrit && res.critRolls && res.critChance) {
    const c = uniform(res.critRolls), mix = new Map();
    for (const [x, p] of one) mix.set(x, (mix.get(x) || 0) + p * (1 - res.critChance));
    for (const [x, p] of c) mix.set(x, (mix.get(x) || 0) + p * res.critChance);
    one = mix;
  }
  if (!res.hits) return one;
  const out = new Map();
  for (const [n, pn] of Object.entries(res.hits)) {
    let d = new Map([[0, 1]]);
    for (let k = 0; k < +n; k++) d = convolve(d, one, cap);
    for (const [x, p] of d) out.set(x, (out.get(x) || 0) + p * pn);
  }
  return out;
}
// Wahrscheinlichkeit, nach 1, 2, 3, 4 Anwendungen besiegt zu sein
function koCurve(res, hp, withCrit = false) {
  if (!res || res.kind !== 'dmg') return [0, 0, 0, 0];
  const one = useDist(res, hp, withCrit);
  const curve = [];
  let d = new Map([[0, 1]]);
  for (let k = 0; k < 4; k++) { d = convolve(d, one, hp); curve.push(d.get(hp) || 0); }
  return curve;
}
// Spannweite einer Anwendung in Prozent der KP
function range(res, hp) {
  if (!res || res.kind !== 'dmg') return [0, 0];
  const lo = res.rolls[0], hi = res.rolls[res.rolls.length - 1];
  const nMin = res.hits ? Math.min(...Object.keys(res.hits).map(Number)) : 1, nMax = res.hits ? Math.max(...Object.keys(res.hits).map(Number)) : 1;
  return [Math.min(100, lo * nMin / hp * 100), Math.min(100, hi * nMax / hp * 100)];
}
const avgDamage = res => {
  if (!res || res.kind !== 'dmg') return 0;
  const a = res.rolls.reduce((s, x) => s + x, 0) / res.rolls.length;
  return res.hits ? a * Object.entries(res.hits).reduce((s, [n, p]) => s + n * p, 0) : a;
};

// Alle Attacken eines Pokémon gegen ein anderes, sortiert nach Wirkung
function movesAgainst(att, def) {
  const hp = def.stats[0];
  return att.moves.map(mid => {
    const res = calcMove(att, def, mid);
    if (!res) return null;
    const curve = res.kind === 'dmg' ? koCurve(res, hp) : [0, 0, 0, 0];
    const turns = res.kind === 'ohko' ? 1 : (curve.findIndex(c => c >= 0.5) + 1 || 99);
    const score = res.kind === 'ohko' ? res.chance : res.kind === 'dmg' ? Math.min(100, avgDamage(res) / hp * 100) * (res.acc ? Math.min(100, res.acc) / 100 : 1) : -1;
    return { ...res, curve, turns, score, range: range(res, hp) };
  }).filter(Boolean).sort((a, b) => b.score - a.score);
}

// Ein Duell: eigenes Pokémon gegen ein Gegner-Pokémon
function duel(me, foe) {
  const mine = movesAgainst(me, foe), theirs = movesAgainst(foe, me);
  const best = list => list.find(r => r.kind === 'dmg' || r.kind === 'ohko') || null;
  const myBest = best(mine), theirBest = best(theirs);
  const sMe = speedOf(me), sFoe = speedOf(foe);
  // Priorität: die beste schnelle Attacke zählt für die Reihenfolge
  const tMe = myBest ? myBest.turns : 99, tFoe = theirBest ? theirBest.turns : 99;
  const meFirst = sMe > sFoe || (myBest && theirBest && myBest.prio > theirBest.prio);
  const tie = sMe === sFoe;
  let verdict;
  if (tMe >= 99) verdict = tFoe >= 99 ? 'trade' : 'lose';
  else if (meFirst ? tMe <= tFoe : tMe < tFoe) verdict = (theirBest && theirBest.curve[0] >= 0.5) || tie ? 'trade' : 'win';
  else verdict = tMe === tFoe ? 'trade' : 'lose';
  // Gefahr: Gegner besiegt dich mit einem Treffer (ohne bzw. mit Volltreffer)
  const ohko = theirs.reduce((mx, r) => Math.max(mx, r.kind === 'ohko' ? r.chance / 100 : r.curve[0]), 0);
  const ohkoCrit = theirs.reduce((mx, r) => (r.kind === 'dmg' ? Math.max(mx, koCurve(r, me.stats[0], true)[0]) : mx), 0);
  return { me, foe, mine, theirs, myBest, theirBest, sMe, sFoe, tie, verdict, ohko, ohkoCrit };
}

// ── Kämpfe ────────────────────────────────────────────────────────────────────
// Trainer mit Team: aus der randomisierten ROM, falls geladen (Name, Ort, Klasse bleiben aus bosses.json)
const trainerOf = id => {
  const t = B.trainers[id], r = state.rando && state.rando.trainers[id];
  return t && r ? { ...t, d: r.d, it: r.it, p: r.p } : t;
};
// Gruppe → passende Trainer-ID (Rivale je nach Starter)
const groupId = g => g.ids.all ?? g.ids[state.starter] ?? Object.values(g.ids)[0];
function fightTitle(t) {
  const en = isEn();
  // Der Rivale heißt, wie du ihn im Spiel genannt hast (aus dem Spielstand), sonst Barry
  const rivalName = t.c === 'RIVAL' ? (currentSave()?.data.trainer.rival || 'Barry') : null;
  return `${TrainerClasses.className(t.c, en)} ${rivalName || TrainerClasses.trainerName(t.n, en)}`.trim();
}
const capOf = t => Math.max(...t.p.map(p => p[2]));
const locName = t => (t.l != null ? B.locs[t.l][isEn() ? 'en' : 'de'] : '');
function locText(t) {
  const area = t.a ? ` · ${(isEn() && B.areaEn?.[t.a]) || t.a}` : '';
  return `${locName(t)}${area}`;
}
const mapLink = t => (t.l != null ? `../Karte/index.html#${B.locs[t.l].slug}${t.m ? '~' + t.m.toLowerCase() : ''}` : null);

// Nächster Kampf: der erste Story-Kampf nach dem Arenaleiter des zuletzt gewonnenen Ordens
const BADGE_LEADERS = ['LEADER_ROARK', 'LEADER_GARDENIA', 'LEADER_MAYLENE', 'LEADER_WAKE', 'LEADER_FANTINA', 'LEADER_BYRON', 'LEADER_CANDICE', 'LEADER_VOLKNER'];
function nextFightIndex() {
  const sv = currentSave();
  if (!sv) return -1;
  const badges = sv.data.trainer.badges || [];
  let last = -1;
  B.story.forEach((g, i) => { const b = BADGE_LEADERS.indexOf(g.key); if (b >= 0 && badges[b]) last = Math.max(last, i); });
  return Math.min(last + 1, B.story.length - 1);
}

// ── Spielstände (gemeinsam mit dem Save-Viewer) ───────────────────────────────
const Store = (() => {
  let dbp = null;
  const db = () => dbp || (dbp = new Promise((res, rej) => {
    if (!window.indexedDB) { rej(new Error('no idb')); return; }
    const r = indexedDB.open('pokehub-saveviewer', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('saves', { keyPath: 'slot' });
    r.onsuccess = () => res(r.result);
    r.onerror = () => rej(r.error);
  }));
  const run = (mode, fn) => db().then(d => new Promise((res, rej) => {
    const t = d.transaction('saves', mode);
    const req = fn(t.objectStore('saves'));
    t.oncomplete = () => res(req && req.result);
    t.onerror = () => rej(t.error);
  }));
  return {
    all: () => run('readonly', s => s.getAll()).catch(() => []),
    put: rec => run('readwrite', s => s.put(rec)).catch(() => {}),
  };
})();
const currentSave = () => state.saves[state.save] || null;
const parseRec = rec => { const data = PtSave.parse(new Uint8Array(rec.bytes), PT); return data.ok ? { ...rec, data } : null; };

async function loadSaves() {
  const recs = await Store.all();
  state.saves = (recs || []).sort((a, b) => a.slot - b.slot).map(parseRec).filter(Boolean);
  state.save = Math.min(+localStorage.getItem('bosse-save') || 0, Math.max(0, state.saves.length - 1));
  applySave();
}

// Neue Datei: gleicher Trainer → dessen Platz ersetzen, sonst freien Platz nehmen (wie im Save-Viewer, max. 2)
async function loadFile(file) {
  const bytes = await file.arrayBuffer();
  const data = PtSave.parse(new Uint8Array(bytes), PT);
  if (!data.ok) { showSaveError(tr().saveError); return; }
  showSaveError('');
  const same = state.saves.find(s => s.data.trainer.tid === data.trainer.tid && s.data.trainer.sid === data.trainer.sid);
  const used = new Set(state.saves.map(s => s.slot));
  const slot = same ? same.slot : [1, 2].find(s => !used.has(s));
  const rec = { slot: slot ?? 0, fileName: file.name, loadedAt: Date.now(), bytes };
  const sv = { ...rec, data };
  if (slot != null) {
    Store.put(rec);
    state.saves = state.saves.filter(s => s.slot !== slot).concat(sv).sort((a, b) => a.slot - b.slot);
  } else state.saves = state.saves.filter(s => s.slot !== 0).concat(sv); // beide Plätze belegt: nur für diese Sitzung
  state.save = state.saves.indexOf(sv);
  // Neuer Spielstand: zum nächsten Kampf dieses Spielstands springen
  history.replaceState(null, '', location.pathname + location.search);
  state.fight = null;
  applySave();
}
function showSaveError(msg) { $('save-error').hidden = !msg; $('save-error').textContent = msg; }

const teamKey = sv => `bosse-team:${sv.data.trainer.tid}-${sv.data.trainer.sid}`;
// Speichern; klappt das nicht (Speicher voll), gibt es einen sichtbaren Hinweis statt eines stillen Fehlers
function store(key, value) {
  try { localStorage.setItem(key, value); return true; }
  catch (e) { console.error('Speichern fehlgeschlagen:', e); window.PokeHubStorageWarning?.(true); return false; }
}
const allOwn = sv => [...sv.data.party, ...sv.data.boxes.flatMap(b => b.slots)].filter(m => m && !m.isEgg);

// ── Eigenes Team ohne Spielstand ──────────────────────────────────────────────
// Tab „Eigenes Team“ (state.save = -1, ohne Spielstände immer). Einträge { species, level, moves, nature, ability }
// liegen in localStorage (auch im Backup). Angenommen: DVs 15, keine EVs, kein Item.
const MANUAL = -1;
const MANUAL_KEY = 'bosse-manual-team';
const MANUAL_IV = 15;
const isManual = () => state.save === MANUAL || !state.saves.length;
function loadManual() {
  try {
    const v = JSON.parse(localStorage.getItem(MANUAL_KEY) || '[]');
    return Array.isArray(v) ? v.filter(e => e && e.species >= 1 && e.species <= 493).slice(0, 6) : [];
  } catch (e) { return []; }
}
const saveManual = list => store(MANUAL_KEY, JSON.stringify(list.slice(0, 6)));
function manualMon(e, i) {
  const per = personalOf(e.species, 0);
  const ivs = new Array(6).fill(MANUAL_IV);
  return {
    side: 'me', species: e.species, form: 0, level: e.level, item: 0, moves: (e.moves || []).filter(Boolean),
    nature: e.nature || 0, ability: e.ability || per[10] || 0, ivs, friendship: 70,
    types: per[6] === per[7] ? [per[6]] : [per[6], per[7]],
    stats: PtSave.calcStats(per.slice(0, 6), ivs, [0, 0, 0, 0, 0, 0], e.level, e.nature || 0, e.species),
    name: T().species[e.species] || `#${e.species}`, key: `manual-${i}`, manual: true,
  };
}

// Lernliste in Platin von PokéAPI (danach aus dem Speicher): Level-Attacken in Reihenfolge, alle lernbaren
const learnCache = new Map();
function platinumLearnset(nameOrId) {
  const k = String(nameOrId).toLowerCase();
  if (!learnCache.has(k)) {
    const p = fetch(`https://pokeapi.co/api/v2/pokemon/${k}`).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); }).then(d => {
      const species = +(/\/pokemon-species\/(\d+)\//.exec(d.species.url) || [])[1];
      const levelUp = [], all = new Set();
      d.moves.forEach(m => {
        const id = +(/\/move\/(\d+)\//.exec(m.move.url) || [])[1];
        if (!id || id > 467) return;
        m.version_group_details.forEach(v => {
          if (v.version_group.name !== 'platinum') return;
          all.add(id);
          if (v.move_learn_method.name === 'level-up') levelUp.push([v.level_learned_at, id]);
        });
      });
      levelUp.sort((a, b) => a[0] - b[0]);
      return { species, levelUp, all };
    });
    p.catch(() => learnCache.delete(k));
    learnCache.set(k, p);
  }
  return learnCache.get(k);
}
// Wie im Spiel: Level-Attacken der Reihe nach, bei vier bekannten fliegt die älteste raus
function defaultMoves(levelUp, level) {
  const known = [];
  for (const [lv, mv] of levelUp) {
    if (lv > level) break;
    if (known.includes(mv)) continue;
    if (known.length === 4) known.shift();
    known.push(mv);
  }
  return known;
}
const currentCap = () => { const tt = state.fight != null && trainerOf(state.fight); return tt ? capOf(tt) : 5; };

// Neuer Eintrag mit Vorschlag: Level = Level-Cap des gewählten Kampfs, Attacken = Level-Attacken bis dahin
// Ergebnis: { entry } | { notInPlatinum: true } | { offline: true }
async function newManualEntry(nameOrId) {
  const level = Math.max(1, Math.min(100, currentCap()));
  let ls = null;
  try { ls = await platinumLearnset(nameOrId); } catch (e) {
    if (!(+nameOrId >= 1)) return { offline: true };   // Name ohne PokéAPI: Art unbekannt
  }
  const species = ls ? ls.species : +nameOrId;
  if (!(species >= 1 && species <= 493)) return { notInPlatinum: true };
  const per = personalOf(species, 0);
  return { entry: { species, level, moves: ls ? defaultMoves(ls.levelUp, level) : [], nature: 0, ability: per[10] || 0 }, offline: !ls };
}

// Teams aus Solo und Duo (Team-Builder speichern PokéAPI-Namen)
function teamSources() {
  const t = tr();
  const read = k => { try { return JSON.parse(localStorage.getItem(k) || 'null'); } catch (e) { return null; } };
  const names = list => (Array.isArray(list) ? list.map(x => (typeof x === 'string' ? x : x && x.name)).filter(Boolean) : []);
  const solo = read('pokemon-team-builder-state'), duo = read('pokemon-duo-nuzlocke-state');
  return [['solo', t.fromSolo, names(solo && solo.team)], ['duo1', t.fromDuo1, names(duo && duo.team1)], ['duo2', t.fromDuo2, names(duo && duo.team2)]]
    .filter(([, , n]) => n.length);
}
async function importTeam(names) {
  if (loadManual().length && !confirm(tr().replaceTeam)) return;
  const results = await Promise.all(names.slice(0, 6).map(n => newManualEntry(n)));
  const entries = results.filter(r => r.entry).map(r => r.entry);
  const skipped = results.filter(r => r.notInPlatinum).length;
  if (results.some(r => r.offline && !r.entry)) { state.manualHint = tr().importFailed; render(); return; }
  saveManual(entries);
  state.manualHint = [skipped ? tr().notInPlatinum(skipped) : '', results.some(r => r.offline) ? tr().movesOffline : ''].filter(Boolean).join(' ');
  applySave();
}

// ── Eigenes Team: ein Pokémon bearbeiten ──────────────────────────────────────
let editorLearn = null;
async function openEditor(i) {
  state.editing = i;
  $('mon-editor').hidden = false;
  renderEditor();
  const e = loadManual()[i];
  if (!e) return;
  try { editorLearn = await platinumLearnset(e.species); } catch (err) { editorLearn = null; }
  if (state.editing === i && !$('mon-editor').hidden) renderEditor();
}
function closeEditor() { $('mon-editor').hidden = true; state.editing = null; }
function updateManual(i, change) {
  const list = loadManual();
  if (!list[i]) return;
  change(list[i]);
  saveManual(list);
  applySave();
}
function renderEditor() {
  const t = tr(), i = state.editing, e = loadManual()[i];
  if (!e) { closeEditor(); return; }
  const per = personalOf(e.species, 0);
  const abilities = [...new Set([per[10], per[11]].filter(Boolean))];
  const learn = editorLearn && editorLearn.species === e.species ? editorLearn.all : null;
  const moves = T().moves.map((n, id) => [id, n]).filter(([id, n]) => id > 0 && id <= 467 && n)
    .sort((a, b) => a[1].localeCompare(b[1], window.LANG));
  const opt = ([id, n], cur) => `<option value="${id}"${id === cur ? ' selected' : ''}>${esc(n)}</option>`;
  const moveSelect = slot => {
    const cur = (e.moves || [])[slot] || 0;
    const groups = learn
      ? `<optgroup label="${esc(t.learnable)}">${moves.filter(([id]) => learn.has(id)).map(m => opt(m, cur)).join('')}</optgroup>
         <optgroup label="${esc(t.otherMoves)}">${moves.filter(([id]) => !learn.has(id)).map(m => opt(m, cur)).join('')}</optgroup>`
      : moves.map(m => opt(m, cur)).join('');
    return `<select data-move-slot="${slot}" aria-label="${esc(t.movesLabel)} ${slot + 1}"><option value="0">${esc(t.noMove)}</option>${groups}</select>`;
  };
  $('editor-title').textContent = t.editMon;
  $('editor-body').innerHTML = `
    <div class="editor-head"><img src="${spriteUrl(e.species)}" alt=""><b>${esc(T().species[e.species])}</b>
      <button type="button" class="chip-btn" id="editor-change">${esc(t.changeMon)}</button></div>
    <div class="editor-row">
      <label class="editor-field">${esc(t.levelLabel)}<input type="number" id="editor-level" min="1" max="100" inputmode="numeric" value="${e.level}"></label>
      <label class="editor-field">${esc(t.natureLabel)}<select id="editor-nature">${T().natures.map((n, k) => `<option value="${k}"${k === (e.nature || 0) ? ' selected' : ''}>${esc(natureText(k))}</option>`).join('')}</select></label>
      <label class="editor-field">${esc(t.abilityLabel)}<select id="editor-ability">${abilities.map(a => `<option value="${a}"${a === e.ability ? ' selected' : ''}>${esc(T().abilities[a])}</option>`).join('')}</select></label>
    </div>
    <div class="editor-field">${esc(t.movesLabel)}<div class="editor-moves">${[0, 1, 2, 3].map(moveSelect).join('')}</div></div>
    ${state.rando ? `<p class="editor-hint">${esc(t.randoMoves)}</p>` : ''}
    ${!editorLearn ? `<p class="editor-hint">${esc(t.movesOffline)}</p>` : ''}
    <div class="editor-actions">
      <span><button type="button" class="chip-btn" id="editor-suggest"${editorLearn ? '' : ' disabled'}>${esc(t.suggestMoves)}</button>
        <button type="button" class="chip-btn" id="editor-remove">${esc(t.removeFromTeam)}</button></span>
      <button type="button" class="btn-ghost" id="editor-done">${esc(t.done)}</button>
    </div>`;
  $('editor-level').addEventListener('change', ev => {
    const lv = Math.max(1, Math.min(100, Math.floor(+ev.target.value) || 1));
    ev.target.value = lv;
    updateManual(i, x => { x.level = lv; });
  });
  $('editor-nature').addEventListener('change', ev => updateManual(i, x => { x.nature = +ev.target.value; }));
  $('editor-ability').addEventListener('change', ev => updateManual(i, x => { x.ability = +ev.target.value; }));
  $('editor-body').querySelectorAll('[data-move-slot]').forEach(sel => sel.addEventListener('change', () => {
    const picked = [...$('editor-body').querySelectorAll('[data-move-slot]')].map(s => +s.value).filter(Boolean);
    updateManual(i, x => { x.moves = [...new Set(picked)]; });
    renderEditor();
  }));
  $('editor-suggest').addEventListener('click', () => {
    if (!editorLearn) return;
    updateManual(i, x => { x.moves = defaultMoves(editorLearn.levelUp, x.level); });
    renderEditor();
  });
  $('editor-remove').addEventListener('click', () => {
    const list = loadManual();
    list.splice(i, 1);
    saveManual(list);
    closeEditor();
    applySave();
  });
  $('editor-change').addEventListener('click', () => { closeEditor(); openPicker('species', i); });
  $('editor-done').addEventListener('click', closeEditor);
}
function applySave() {
  store('bosse-save', String(state.save));
  const sv = isManual() ? null : currentSave();
  state.team = [];
  if (!sv) state.team = loadManual().map(manualMon);
  if (sv) {
    // Starter aus dem Spielstand: eigenes Pokémon aus einer Starter-Familie, das früheste zählt
    // (randomisiert: eins der drei Starter-Pokémon aus der ROM, solange es sich nicht entwickelt hat)
    const rs = state.rando && state.rando.starters;
    const slotOf = m => (rs ? rs.indexOf(m.species) : m.species >= 387 && m.species <= 395 ? Math.floor((m.species - 387) / 3) : -1);
    const own = allOwn(sv).filter(m => m.tid === sv.data.trainer.tid && m.sid === sv.data.trainer.sid && slotOf(m) >= 0);
    const dateNum = d => (d ? d[0] * 10000 + d[1] * 100 + d[2] : 99999999);
    own.sort((a, b) => dateNum(a.metDate) - dateNum(b.metDate));
    if (own.length) setStarter(['turtwig', 'chimchar', 'piplup'][slotOf(own[0])]);
    // Gemerkte Auswahl, sonst das Team
    const pool = new Map(allOwn(sv).map(m => [monKey(m), m]));
    let keys = null;
    try { keys = JSON.parse(localStorage.getItem(teamKey(sv)) || 'null'); } catch (e) { keys = null; }
    const chosen = keys ? keys.map(k => pool.get(k)).filter(Boolean) : sv.data.party.filter(m => m && !m.isEgg);
    state.team = chosen.slice(0, 6).map(ownMon);
  }
  if (state.fight == null || !trainerOf(state.fight)) pickDefaultFight();
  render();
}
function setStarter(s) {
  state.starter = s;
  store('bosse-starter', s);
  $('starter-select').value = s;
}
function saveTeamChoice() {
  const sv = currentSave();
  if (sv) store(teamKey(sv), JSON.stringify(state.team.map(m => m.key)));
}
function pickDefaultFight() {
  const fromHash = fightFromHash();
  if (fromHash != null) { selectFight(fromHash, false); return; }
  const i = Math.max(0, nextFightIndex());
  state.list = 'story';
  state.fight = groupId(B.story[i]);
}

// ── Darstellung ───────────────────────────────────────────────────────────────
const typeBadge = ty => `<span class="type" style="--c:${TYPE_HEX[ty]}">${esc(T().types[ty])}</span>`;
const spriteUrl = sp => `${PT_SPR}${sp}.png`;
const iconImg = sp => `<img class="mon-icon" src="${ICON_SPR}${sp}.png" alt="" loading="lazy">`;
const itemImg = id => (PT.itemSprites[id] ? `<img class="item-icon" src="${SPR}/items/${PT.itemSprites[id]}.png" alt="" loading="lazy">` : '');
function natureText(n) {
  const up = Math.floor(n / 5), down = n % 5;
  const s = tr().stat;
  const name = T().natures[n];
  return up === down ? `${name} (${tr().neutral})` : `${name} (+${s[up + 1]} −${s[down + 1]})`;
}
function verdictText(r, hp) {
  const t = tr();
  if (!r) return `<span class="muted">${esc(t.noDamage)}</span>`;
  if (r.kind === 'immune') return `<span class="muted">${esc(t.immune)}</span>`;
  if (r.kind === 'fail') return `<span class="muted">${esc(t.fails)}</span>`;
  if (r.kind === 'ohko') return esc(t.ohkoMove(r.chance));
  const n = r.curve.findIndex(c => c > 0) + 1;
  if (!n) return esc(t.noKo);
  const c = r.curve[n - 1];
  return c >= 0.999 ? esc(t.hko(n)) : esc(t.hkoChance(pct(c * 100), n));
}
const rangeText = r => (r && r.kind === 'dmg' ? `${pct(r.range[0])}–${pct(r.range[1])} %` : '');
const moveName = mid => T().moves[mid] || `#${mid}`;

function render() {
  renderTeamBar();
  renderList();
  renderFight();
}

function renderTeamBar() {
  const t = tr();
  $('save-tabs').innerHTML = state.saves.map((sv, i) => {
    const tn = sv.data.trainer;
    return `<button type="button" class="save-tab${i === state.save ? ' is-on' : ''}" data-save="${i}">${esc(tn.name)} <small>${esc(t.badges(tn.badgeCount))}</small></button>`;
  }).join('') + `<button type="button" class="save-tab${isManual() ? ' is-on' : ''}" data-save="${MANUAL}">${esc(t.manualTab)}</button>`;
  document.querySelectorAll('[data-save]').forEach(b => b.addEventListener('click', () => { state.save = +b.dataset.save; applySave(); }));
  const sv = isManual() ? null : currentSave();
  const custom = sv && localStorage.getItem(teamKey(sv));
  $('team-strip').innerHTML = !sv ? manualStrip() : sv
    ? state.team.map((m, i) => `<span class="team-chip">${iconImg(m.species)}<span>${esc(m.name)} <small>Lv. ${m.level}</small></span><button type="button" data-drop="${i}" title="${esc(t.removeMon)}" aria-label="${esc(t.removeMon)}">×</button></span>`).join('')
      + (state.team.length < 6 ? `<button type="button" class="chip-btn" id="add-box">${esc(t.addBox)}</button>` : '')
      + (custom ? `<button type="button" class="chip-btn" id="reset-team">${esc(t.resetTeam)}</button>` : '')
    : '';
  document.querySelectorAll('[data-drop]').forEach(b => b.addEventListener('click', () => { state.team.splice(+b.dataset.drop, 1); saveTeamChoice(); render(); }));
  // Eigenes Team
  document.querySelectorAll('[data-edit]').forEach(b => b.addEventListener('click', () => openEditor(+b.dataset.edit)));
  document.querySelectorAll('[data-drop-manual]').forEach(b => b.addEventListener('click', () => {
    const list = loadManual();
    list.splice(+b.dataset.dropManual, 1);
    saveManual(list);
    applySave();
  }));
  $('add-manual')?.addEventListener('click', () => openPicker('species'));
  $('manual-to-cap')?.addEventListener('click', () => { const cap = currentCap(); saveManual(loadManual().map(e => ({ ...e, level: cap }))); applySave(); });
  document.querySelectorAll('[data-import]').forEach(b => b.addEventListener('click', () => {
    const src = teamSources().find(s => s[0] === b.dataset.import);
    if (src) importTeam(src[2]);
  }));
  $('add-box')?.addEventListener('click', openPicker);
  $('reset-team')?.addEventListener('click', () => { localStorage.removeItem(teamKey(currentSave())); applySave(); });
  [...$('starter-select').options].forEach(o => { o.textContent = T().species[starterSpecies(o.value)]; });
  $('starter-select').value = state.starter;
  // Randomizer-ROM: Name anzeigen, entfernen
  const rd = state.rando;
  $('rando-chip').hidden = !rd;
  $('rando-chip').innerHTML = rd ? `${esc(t.romActive)} <b>${esc(rd.name)}</b><button type="button" id="rando-remove" title="${esc(t.romRemove)}" aria-label="${esc(t.romRemove)}">×</button>` : '';
  $('rando-remove')?.addEventListener('click', removeRando);
}

function manualStrip() {
  const t = tr();
  const chips = state.team.map((m, i) => `<span class="team-chip is-manual">${iconImg(m.species)}<span data-edit="${i}" role="button" tabindex="0" title="${esc(t.editMon)}">${esc(m.name)} <small>Lv. ${m.level}</small></span><button type="button" data-drop-manual="${i}" title="${esc(t.removeMon)}" aria-label="${esc(t.removeMon)}">×</button></span>`).join('');
  const add = state.team.length < 6 ? `<button type="button" class="chip-btn" id="add-manual">${esc(t.addMon)}</button>` : '';
  // Anderer Kampf gewählt: alle mit einem Tipp auf dessen Level-Cap (Attacken bleiben)
  const cap = currentCap();
  const toCap = state.team.some(m => m.level !== cap) ? `<button type="button" class="chip-btn" id="manual-to-cap">${esc(t.allToCap(cap))}</button>` : '';
  const imports = teamSources().map(([k, label]) => `<button type="button" class="chip-btn" data-import="${k}">${esc(label)}</button>`).join('');
  const note = state.manualHint
    ? `<p class="manual-note is-warn">${esc(state.manualHint)}</p>`
    : (state.team.length ? `<p class="manual-note">${esc(t.manualNote)}</p>` : '');
  return chips + add + toCap + imports + note;
}

// ── Randomisierte ROM ─────────────────────────────────────────────────────────
async function loadRom(file) {
  const t = tr();
  showSaveError('');
  $('load-rom').disabled = true;
  $('load-rom').textContent = t.romReading;
  try {
    const res = await Rando.readRomFile(file, Object.keys(B.trainers).map(Number), B.fem, PT.personal);
    state.rando = { name: file.name, loadedAt: Date.now(), ...res };
    store('bosse-rando', JSON.stringify(state.rando));   // voll: gilt nur für diese Sitzung (mit Hinweis)
    applySave();
  } catch (e) {
    showSaveError(e && e.message === 'notPlatinum' ? t.romError : `${t.romError} (${e && e.message})`);
  } finally {
    $('load-rom').disabled = false;
    $('load-rom').textContent = t.loadRom;
  }
}
// Stand in einem anderen Tab geladen oder entfernt (Karte, Run-Dashboard, Randomizer)
window.addEventListener('storage', e => {
  if (e.key !== 'bosse-rando' && e.key !== null) return;
  state.rando = loadRando();
  applySave();
});
function removeRando() {
  state.rando = null;
  localStorage.removeItem('bosse-rando');
  applySave();
}

function listEntries() {
  if (state.list === 'all') {
    const q = state.search.toLowerCase();
    return Object.keys(B.trainers)
      .map(id => ({ id: +id, t: trainerOf(+id) }))
      .filter(({ t }) => !q || `${fightTitle(t)} ${locText(t)} ${t.n} ${t.p.map(p => T().species[p[0]]).join(' ')}`.toLowerCase().includes(q))
      .sort((a, b) => capOf(a.t) - capOf(b.t) || a.id - b.id);
  }
  return B[state.list].map((g, i) => ({ id: groupId(g), t: trainerOf(groupId(g)), i }));
}

function renderList() {
  const t = tr();
  document.querySelectorAll('.list-tab').forEach(b => b.classList.toggle('is-active', b.dataset.list === state.list));
  $('trainer-search').hidden = state.list !== 'all';
  const next = nextFightIndex();
  const entries = listEntries();
  $('fight-list').innerHTML = entries.map(({ id, t: tt, i }) => `
    <button type="button" class="fight-item${id === state.fight ? ' is-on' : ''}" data-fight="${id}">
      <span class="fi-cap">${capOf(tt)}</span>
      <span class="fi-main"><b>${esc(fightTitle(tt))}</b><small>${esc(locText(tt))}</small></span>
      ${state.list === 'story' && i === next ? `<span class="fi-next">${esc(t.next)}</span>` : ''}
    </button>`).join('');
  $('fight-list').querySelectorAll('[data-fight]').forEach(b => b.addEventListener('click', () => selectFight(+b.dataset.fight, true, true)));
  $('fight-select').innerHTML = entries.map(({ id, t: tt, i }) => `<option value="${id}"${id === state.fight ? ' selected' : ''}>Lv. ${capOf(tt)} · ${esc(fightTitle(tt))}${state.list === 'story' && i === next ? ' ★' : ''}</option>`).join('');
}

// fromList: aus der gerade sichtbaren Liste gewählt – dann bleibt diese Liste
function selectFight(id, rerender = true, fromList = false) {
  state.fight = id;
  state.open.clear();
  // sonst die passende Liste: Story, nach der Liga oder alle
  const inGroup = list => B[list].some(g => Object.values(g.ids).includes(id));
  if (!fromList) state.list = inGroup('story') ? 'story' : inGroup('post') ? 'post' : 'all';
  history.replaceState(null, '', `#t=${id}`);
  if (rerender) { renderTeamBar(); renderList(); renderFight(); }   // Teamleiste: „Alle auf Lv. …“ folgt dem Kampf
}
function fightFromHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return null;
  const m = h.match(/^t=(\d+)$/);
  if (m && trainerOf(+m[1])) return +m[1];
  const k = h.replace(/^TRAINER_/, '');
  const hit = Object.entries(B.trainers).find(([, tt]) => tt.k === k);
  return hit ? +hit[0] : null;
}

function renderFight() {
  const t = tr();
  const id = state.fight, tt = trainerOf(id);
  if (!tt) { $('fight').innerHTML = ''; return; }
  const cap = capOf(tt);
  const story = B.story.findIndex(g => Object.values(g.ids).includes(id));
  const foes = tt.p.map(foeMon);
  const me = state.team;
  const duels = foes.map(f => me.map(m => duel(m, f)));
  const link = mapLink(tt);
  const tag = tt.tag != null && trainerOf(tt.tag) ? `<button type="button" class="tag-link" data-fight="${tt.tag}">${esc(t.tagWith(fightTitle(trainerOf(tt.tag))))}</button>` : '';
  const heals = tt.it.length ? `<span class="pill">${esc(t.heals)}: ${countItems(tt.it)}</span>` : '';
  const rival = tt.c === 'RIVAL' && tt.k.match(/_(TURTWIG|CHIMCHAR|PIPLUP)$/) ? `<span class="pill">${esc(t.rivalBy(T().species[starterSpecies(state.starter)]))}</span>` : '';
  // Trainer-Sprite(s) aus dem Spiel (tools/build-sprites.py), bei Doppelkämpfen mit Partner beide
  const sprites = [tt, tt.tag != null ? trainerOf(tt.tag) : null].filter(Boolean)
    .map((x, i) => `<img class="fight-sprite${i ? ' is-partner' : ''}" src="sprites/${x.c.toLowerCase()}.png" alt="" width="80" height="80">`).join('');

  // Hinweise: Level-Cap und Treffer, die eins deiner Pokémon sofort besiegen
  // (alle zu hohen Pokémon in einer Zeile – sonst stand am Handy jedes einzeln untereinander)
  const warnings = [];
  const over = me.filter(m => m.level > cap).map(m => `${m.name} (Lv. ${m.level})`);
  if (over.length) warnings.push(t.overCap(cap, over.join(', ')));
  // Je eigenem Pokémon: welche Gegner es mit einem Treffer besiegen können
  const threats = me.map((m, mi) => {
    const by = duels.map(row => row[mi]).map(d => {
      const r = d.theirs.find(x => (x.kind === 'dmg' && x.curve[0] >= 0.5) || (x.kind === 'ohko' && x.chance >= 30));
      return r ? `${d.foe.name} (${moveName(r.mid)} ${pct((r.kind === 'ohko' ? r.chance / 100 : r.curve[0]) * 100)} %)` : null;
    }).filter(Boolean);
    return by.length ? t.danger(m.name, by.join(', ')) : null;
  }).filter(Boolean);

  $('fight').innerHTML = `
    <div class="fight-sprites" aria-hidden="true">${sprites}</div>
    <div class="fight-head">
      <div>
        <div class="kicker">${story >= 0 ? esc(t.fightNo(story + 1, B.story.length)) : esc(locName(tt))}</div>
        <h2>${esc(fightTitle(tt))}</h2>
        <p class="fight-loc">${esc(locText(tt))}${link ? ` · <a href="${link}">${esc(t.onMap)} →</a>` : ''}</p>
      </div>
      <div class="cap-box"><span>${esc(t.levelCap)}</span><b>${cap}</b></div>
    </div>
    <div class="fight-tags">${state.rando ? `<span class="pill pill-rando" title="${esc(state.rando.name)}">${esc(t.randoTag)}</span>` : ''}${tt.d ? `<span class="pill">${esc(t.double)}</span>` : ''}${tag}${heals}${rival}</div>
    ${me.length ? `<div class="alerts">
        ${warnings.map(w => `<p class="alert is-cap">${esc(w)}</p>`).join('')}
        ${threats.length ? threats.map(w => `<p class="alert is-danger">${esc(w)}</p>`).join('') : `<p class="alert is-ok">✓ ${esc(t.noThreats)}</p>`}
      </div>`
      : `<div class="no-save"><b>${esc(isManual() ? t.noTeamTitle : t.noSaveTitle)}</b><p>${esc(isManual() ? t.noTeamText : t.noSaveText)}</p>
          <button type="button" class="btn-ghost" data-load>${esc(t.loadSave)}</button>
          ${isManual() ? `<button type="button" class="btn-ghost" data-add-manual>${esc(t.addMon)}</button>` : ''}</div>`}
    <div class="foe-grid">${foes.map((f, fi) => foeCard(f, tt.p[fi], duels[fi], fi)).join('')}</div>`;

  $('fight').querySelector('[data-load]')?.addEventListener('click', () => $('file-input').click());
  $('fight').querySelector('[data-add-manual]')?.addEventListener('click', () => openPicker('species'));
  $('fight').querySelectorAll('.tag-link').forEach(b => b.addEventListener('click', () => selectFight(+b.dataset.fight)));
  $('fight').querySelectorAll('[data-duel]').forEach(b => b.addEventListener('click', () => {
    const k = b.dataset.duel;
    if (state.open.has(k)) state.open.delete(k); else state.open.add(k);
    renderFight();
  }));
}
function countItems(ids) {
  const c = new Map();
  ids.forEach(i => c.set(i, (c.get(i) || 0) + 1));
  return [...c].map(([i, n]) => `${n}× ${esc(T().items[i])}`).join(', ');
}

function foeCard(f, raw, row, fi) {
  const t = tr();
  const s = f.stats;
  const order = [0, 1, 2, 4, 5, 3]; // KP, Ang, Vert, SpAng, SpVert, Init
  // Beste Antwort: gewinnt das Duell und steckt am wenigsten ein
  const rank = { win: 0, trade: 1, lose: 2 };
  const best = row.length ? row.reduce((a, b) => (rank[b.verdict] < rank[a.verdict]
    || (rank[b.verdict] === rank[a.verdict] && (b.theirBest?.score ?? 0) < (a.theirBest?.score ?? 0)) ? b : a)) : null;
  return `
    <article class="foe-card">
      <div class="foe-top">
        <img class="foe-sprite" src="${spriteUrl(f.species)}" alt="" loading="lazy">
        <div class="foe-id">
          <h3>${esc(f.name)} <small>Lv. ${f.level}</small></h3>
          <div class="types">${f.types.map(typeBadge).join('')}</div>
        </div>
      </div>
      <dl class="foe-info">
        <dt>${esc(t.ability)}</dt><dd>${esc(T().abilities[f.ability] || '—')}</dd>
        <dt>${esc(t.item)}</dt><dd>${f.item ? `${itemImg(f.item)}${esc(T().items[f.item])}` : esc(t.noItem)}</dd>
        <dt>${esc(t.nature)}</dt><dd>${esc(natureText(f.nature))}</dd>
        <dt>${esc(t.ivs)}</dt><dd>${f.ivs.every(v => v === f.ivs[0]) ? f.ivs[0] : order.map(i => f.ivs[i]).join(' / ')}</dd>
      </dl>
      <div class="stat-grid">${order.map(i => `<span><small>${esc(t.stat[i])}</small><b>${s[i]}</b></span>`).join('')}</div>
      <ul class="move-list">${f.moves.map(mid => moveRow(mid)).join('')}</ul>
      ${row.length ? `<div class="vs">
        <div class="vs-title">${esc(t.vsTeam)}</div>
        ${row.map((d, mi) => duelRow(d, `${fi}:${mi}`, d === best)).join('')}
      </div>` : ''}
    </article>`;
}

function moveRow(mid) {
  const t = tr();
  const [type, , power, acc, cat] = PT.moveInfo[mid] || [];
  const prio = (B.moveExtra[mid] || [0])[0];
  return `<li><span class="type mini" style="--c:${TYPE_HEX[type]}">${esc(T().types[type])}</span>
    <span class="mv-name">${esc(moveName(mid))}</span>
    <span class="mv-meta">${cat === 1 ? esc(t.cat[1]) : `${power > 1 ? power : '—'} · ${esc(t.cat[cat])}`}${acc && acc <= 100 ? ` · ${acc} %` : ''}${prio ? ` · <b>${esc(t.prio(prio))}</b>` : ''}</span></li>`;
}

function duelRow(d, key, isBest) {
  const t = tr();
  const spd = d.tie ? `<span class="spd is-tie" title="${esc(t.speedTie)}">=</span>`
    : d.sMe > d.sFoe ? `<span class="spd is-fast" title="${esc(t.faster)}">▲</span>` : `<span class="spd is-slow" title="${esc(t.slower)}">▼</span>`;
  const mine = d.myBest, theirs = d.theirBest;
  const open = state.open.has(key);
  return `
    <button type="button" class="vs-row is-${d.verdict}${open ? ' is-open' : ''}" data-duel="${key}" aria-expanded="${open}">
      <span class="vs-mon">${iconImg(d.me.species)}<span>${esc(d.me.name)}<small>Lv. ${d.me.level}</small></span>${isBest ? `<em class="best">★ ${esc(t.best)}</em>` : ''}</span>
      ${spd}
      <span class="vs-out"><small>${esc(t.you)}</small>${mine ? `${esc(moveName(mine.mid))} <b>${rangeText(mine)}</b> <i>${verdictText(mine)}</i>` : `<i>${esc(t.noDamage)}</i>`}</span>
      <span class="vs-in"><small>${esc(t.foe)}</small>${theirs ? `${esc(moveName(theirs.mid))} <b>${rangeText(theirs)}</b> <i>${verdictText(theirs)}</i>` : `<i>${esc(t.noDamage)}</i>`}</span>
      <span class="vs-verdict">${esc(t[d.verdict])}</span>
    </button>
    ${open ? duelDetails(d) : ''}`;
}

function duelDetails(d) {
  const t = tr();
  const list = (rows, def) => rows.map(r => `
    <li>
      <span class="type mini" style="--c:${TYPE_HEX[r.type]}">${esc(T().types[r.type])}</span>
      <span class="mv-name">${esc(moveName(r.mid))}${r.hits ? ` <small>${esc(t.hits(Math.min(...Object.keys(r.hits).map(Number)), Math.max(...Object.keys(r.hits).map(Number))))}</small>` : ''}</span>
      <span class="mv-res"><b>${rangeText(r)}</b> ${verdictText(r)}</span>
      ${r.kind === 'dmg' && r.critRolls ? `<span class="mv-crit">${esc(t.crit(`${pct(Math.min(100, r.critRolls[0] / def.stats[0] * 100))}–${pct(Math.min(100, r.critRolls[15] / def.stats[0] * 100))} %`))}${(() => { const c = koCurve(r, def.stats[0], true)[0]; return c > r.curve[0] + 0.005 ? ` · ${esc(t.critKo(pct(c * 100)))}` : ''; })()}</span>` : ''}
      ${r.notes.length ? `<span class="mv-notes">${r.notes.map(esc).join(' · ')}</span>` : ''}
    </li>`).join('');
  return `<div class="duel-details">
    <div><h4>${esc(t.yourMoves)} → ${esc(d.foe.name)}</h4><ul>${list(d.mine, d.foe) || `<li class="muted">${esc(t.noDamage)}</li>`}</ul></div>
    <div><h4>${esc(d.foe.name)} → ${esc(d.me.name)}</h4><ul>${list(d.theirs, d.me) || `<li class="muted">${esc(t.noDamage)}</li>`}</ul></div>
  </div>`;
}

// ── Box-Auswahl ───────────────────────────────────────────────────────────────
// mode 'box' = aus dem Spielstand; 'species' = alle Pokémon aus Platin fürs eigene Team (replace = Index zum Ersetzen)
function openPicker(mode = 'box', replace = null) {
  state.pickMode = mode;
  state.pickReplace = replace;
  $('picker-title').textContent = mode === 'species' ? tr().pickSpecies : tr().pickTitle;
  $('box-picker').hidden = false;
  $('picker-search').value = '';
  renderPicker();
  $('picker-search').focus();
}
function renderSpeciesPicker() {
  const q = $('picker-search').value.trim().toLowerCase();
  const names = sp => [PT.text.de.species[sp], PT.text.en.species[sp]].join(' ').toLowerCase();
  const list = [];
  for (let sp = 1; sp <= 493; sp++) if (!q || names(sp).includes(q) || String(sp) === q) list.push(sp);
  $('picker-list').innerHTML = list.map(sp => `<button type="button" class="pick" data-species="${sp}">${iconImg(sp)}<span>${esc(T().species[sp])}</span><small>#${sp}</small></button>`).join('');
  $('picker-list').querySelectorAll('[data-species]').forEach(b => b.addEventListener('click', async () => {
    $('box-picker').hidden = true;
    const res = await newManualEntry(+b.dataset.species);
    if (!res.entry) return;
    const list = loadManual();
    let i = state.pickReplace;
    if (i != null && list[i]) list[i] = res.entry; else { list.push(res.entry); i = list.length - 1; }
    saveManual(list);
    state.manualHint = res.offline ? tr().movesOffline : '';
    applySave();
    openEditor(i);
  }));
}
function renderPicker() {
  if (state.pickMode === 'species') { renderSpeciesPicker(); return; }
  const sv = currentSave();
  if (!sv) return;
  const q = $('picker-search').value.toLowerCase();
  const taken = new Set(state.team.map(m => m.key));
  const mons = allOwn(sv).filter(m => !taken.has(monKey(m)))
    .map(ownMon).filter(m => !q || m.name.toLowerCase().includes(q) || (T().species[m.species] || '').toLowerCase().includes(q))
    .sort((a, b) => b.level - a.level);
  $('picker-list').innerHTML = mons.map(m => `<button type="button" class="pick" data-pick="${esc(m.key)}">${iconImg(m.species)}<span>${esc(m.name)}</span><small>Lv. ${m.level}</small></button>`).join('');
  $('picker-list').querySelectorAll('[data-pick]').forEach(b => b.addEventListener('click', () => {
    const m = mons.find(x => x.key === b.dataset.pick);
    if (m && state.team.length < 6) { state.team.push(m); saveTeamChoice(); }
    $('box-picker').hidden = true;
    render();
  }));
}

// ── Sprache ───────────────────────────────────────────────────────────────────
function applyLang() {
  const t = tr();
  document.querySelectorAll('[data-i18n]').forEach(el => { const v = t[el.dataset.i18n]; if (typeof v === 'string') el.textContent = v; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const v = t[el.dataset.i18nPlaceholder]; if (typeof v === 'string') el.placeholder = v; });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { const v = t[el.dataset.i18nTitle]; if (typeof v === 'string') el.title = v; });
  document.querySelectorAll('[data-i18n-aria]').forEach(el => { const v = t[el.dataset.i18nAria]; if (typeof v === 'string') el.setAttribute('aria-label', v); });
  $('lang-toggle').textContent = window.LANG.toUpperCase();
  // Team neu benennen (Artnamen hängen an der Sprache)
  const sv = isManual() ? null : currentSave();
  if (sv) {
    const pool = new Map(allOwn(sv).map(m => [monKey(m), m]));
    state.team = state.team.map(m => (pool.get(m.key) ? ownMon(pool.get(m.key)) : m));
  } else state.team = loadManual().map(manualMon);
  if (!$('mon-editor').hidden) renderEditor();
  if (B) render();
}

// ── Start ─────────────────────────────────────────────────────────────────────
async function init() {
  applyLang();
  try {
    const r = await fetch('bosses.json');
    if (!r.ok) throw new Error(r.status);
    B = await r.json();
  } catch (e) {
    $('fight').innerHTML = `<p class="alert is-danger">${esc(tr().loadError)}</p>`;
    return;
  }
  $('starter-select').value = state.starter;
  await loadSaves();
}

$('lang-toggle').addEventListener('click', () => {
  window.LANG = window.LANG === 'de' ? 'en' : 'de';
  localStorage.setItem('hub-lang', window.LANG);
  document.documentElement.lang = window.LANG;
  applyLang();
});
$('load-save').addEventListener('click', () => $('file-input').click());
$('load-rom').addEventListener('click', () => $('rom-input').click());
$('rom-input').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadRom(f); });
$('file-input').addEventListener('change', e => { const f = e.target.files[0]; e.target.value = ''; if (f) loadFile(f).catch(() => showSaveError(tr().saveError)); });
$('starter-select').addEventListener('change', e => {
  setStarter(e.target.value);
  // Rivale: auf die passende Variante wechseln
  const g = [...B.story, ...B.post].find(x => Object.values(x.ids).includes(state.fight));
  if (g && !g.ids.all) state.fight = groupId(g);
  render();
});
$('weather-select').addEventListener('change', e => { state.weather = e.target.value; renderFight(); });
document.querySelectorAll('.list-tab').forEach(b => b.addEventListener('click', () => { state.list = b.dataset.list; renderList(); }));
$('trainer-search').addEventListener('input', e => { state.search = e.target.value; renderList(); });
$('fight-select').addEventListener('change', e => selectFight(+e.target.value, true, true));
$('picker-close').addEventListener('click', () => { $('box-picker').hidden = true; });
$('box-picker').addEventListener('click', e => { if (e.target === $('box-picker')) $('box-picker').hidden = true; });
$('picker-search').addEventListener('input', renderPicker);
$('editor-close').addEventListener('click', closeEditor);
$('mon-editor').addEventListener('click', e => { if (e.target === $('mon-editor')) closeEditor(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape' && !$('mon-editor').hidden) closeEditor(); });
$('team-strip').addEventListener('keydown', e => { const el = e.target.closest('[data-edit]'); if (el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); openEditor(+el.dataset.edit); } });
window.addEventListener('hashchange', () => { if (!B) return; const id = fightFromHash(); if (id != null && id !== state.fight) selectFight(id); });

init();
