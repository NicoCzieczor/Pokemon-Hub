/*
 * Baut die Daten für den Boss-Planer in Rot / Blau (Bosse/bosses-rb.json) aus einem Checkout von pret/pokered.
 *
 * Für jeden Trainer, der im Spiel auf einer Karte steht oder per Skript kämpft, das Team so, wie das Spiel es
 * erzeugt (engine/battle/read_trainer_party.asm, engine/pokemon/add_mon.asm):
 *  - Level und Arten aus data/trainers/parties.asm
 *  - Attacken wie bei jedem Trainer-Pokémon: die Level-1-Attacken, dann alle Level-Attacken bis zum Level, bei
 *    vier bekannten fällt die älteste raus. Dazu die Sonderattacken: Arenaleiter (LoneMoves, Nummer der Arena),
 *    Top Vier (TeamMoves, 5. Pokémon) und Champ (Himmelsfeger + je nach Starter Feuersturm/Blizzard/Megasauger)
 *  - DVs fest: Angriff 9, Verteidigung/Initiative/Spezial 8, KP 8 (ATKDEFDV_TRAINER / SPDSPCDV_TRAINER)
 *  - Heilitems der Trainer-KI (data/trainers/ai_pointers.asm, engine/battle/trainer_ai.asm): je Pokémon so oft
 *    wie dort angegeben
 * Dazu die Gen-1-Werte aller Pokémon (Basiswerte mit einem Spezial-Wert, Typen) und Attacken (Stärke, Typ,
 * Genauigkeit, Effekt) – die Namen kommen zur Laufzeit aus SaveViewer/data-pt.js, die Orte aus Karte/kanto.json.
 *
 * Aufruf (Node 18+):  node build-bosses-rb.js <pokered-checkout> [ausgabe-ordner]
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');
const { execFileSync } = require('child_process');

const SRC = path.resolve(process.argv[2] || '');
const OUT = path.resolve(process.argv[3] || path.join(__dirname, '..'));
const HUB = path.join(__dirname, '..', '..');
if (!fs.existsSync(path.join(SRC, 'data/trainers/parties.asm'))) {
  console.error('Aufruf: node build-bosses-rb.js <pokered-checkout> [ausgabe-ordner]');
  process.exit(1);
}
const read = p => fs.readFileSync(path.join(SRC, p), 'utf8');
const code = line => line.split(';')[0].trim();
const consts = (p, re) => {
  const out = [];
  for (const line of read(p).split(/\r?\n/)) { const m = re.exec(code(line)); if (m) out.push(m[1] ?? m[2]); }
  return out;
};

// ── Konstanten ──
// Interne Nummern: const_skip = Lücke (MissingNo.) zählt mit
const internal = consts('constants/pokemon_constants.asm', /^(?:const (\w+)|(const_skip))/).map(n => (n === 'const_skip' ? null : n));   // [0] = NO_MON
const dexOrder = consts('constants/pokedex_constants.asm', /^const DEX_(\w+)/);         // [0] = Bisasam
const dexOf = name => dexOrder.indexOf(name) + 1;
const moveIds = ['NO_MOVE', ...consts('constants/move_constants.asm', /^const (\w+)/).filter(n => n !== 'NO_MOVE')];
const moveId = name => { const i = moveIds.indexOf(name); if (i < 0) throw new Error('Attacke? ' + name); return i; };
const classes = [null, ...consts('constants/trainer_constants.asm', /^trainer_const (\w+)/).filter(n => n !== 'NOBODY')];

// Typen des Spiels → Reihenfolge des Hubs (TYPES in Bosse/app.js)
const TYPE = { NORMAL: 0, FIGHTING: 1, FLYING: 2, POISON: 3, GROUND: 4, ROCK: 5, BUG: 6, GHOST: 7, FIRE: 9, WATER: 10,
  GRASS: 11, ELECTRIC: 12, PSYCHIC_TYPE: 13, ICE: 14, DRAGON: 15 };
const PHYSICAL = new Set([0, 1, 2, 3, 4, 5, 6, 7]);
const GROWTH = { GROWTH_MEDIUM_FAST: 0, GROWTH_SLIGHTLY_FAST: 1, GROWTH_SLIGHTLY_SLOW: 2, GROWTH_MEDIUM_SLOW: 3, GROWTH_FAST: 4, GROWTH_SLOW: 5 };

// ── Pokémon: Basiswerte, Typen, Level-1-Attacken ──
const personal = [[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 1, 0]];
const firstMoves = {};
for (const file of fs.readdirSync(path.join(SRC, 'data/pokemon/base_stats'))) {
  const dbs = read(`data/pokemon/base_stats/${file}`).split(/\r?\n/).map(code).filter(l => l.startsWith('db ')).map(l => l.slice(3).split(',').map(s => s.trim()));
  const dex = dexOf(dbs[0][0].replace(/^DEX_/, ''));
  const [hp, atk, def, spd, spc] = dbs[1].map(Number);
  const types = dbs[2].map(t => TYPE[t]);
  const growth = dbs.find(d => /^GROWTH_/.test(d[0]));
  const moves = dbs.find(d => d.length === 4 && d.every(m => moveIds.includes(m)));
  if (!dex || types.some(t => t == null) || !moves) throw new Error('Basiswerte? ' + file);
  // Reihenfolge wie im Hub: KP, Ang, Vert, Init, SpAng, SpVert – Gen 1 hat einen Spezial-Wert für beides
  personal[dex] = [hp, atk, def, spd, spc, spc, types[0], types[1], 0, GROWTH[growth[0]] || 0, 0, 0, 1, 0];
  firstMoves[dex] = moves.filter(m => m !== 'NO_MOVE').map(moveId);
}

// ── Level-Attacken (Zeiger-Tabelle in der internen Reihenfolge) ──
const evos = read('data/pokemon/evos_moves.asm').split(/\r?\n/);
const labels = [];
let inTable = false;
for (const line of evos) {
  if (/^EvosMovesPointerTable:/.test(line)) { inTable = true; continue; }
  if (inTable) {
    const m = /^\s*dw (\w+)/.exec(line);
    if (m) labels.push(m[1]); else if (/^\w+:/.test(line)) break;
  }
}
const learnsets = {};
labels.forEach((label, i) => {
  const name = internal[i + 1];
  const dex = dexOf(name);
  if (!dex || learnsets[dex]) return;   // MissingNo. und doppelte Einträge
  const start = evos.findIndex(l => l.startsWith(label + ':'));
  const list = [];
  let zeros = 0;
  for (let k = start + 1; k < evos.length && zeros < 2; k++) {
    const c = code(evos[k]);
    if (!c.startsWith('db ')) continue;
    const parts = c.slice(3).split(',').map(s => s.trim());
    if (parts[0] === '0') { zeros++; continue; }
    if (zeros === 1) list.push([+parts[0], moveId(parts[1])]);
  }
  learnsets[dex] = list;
});

// ── Attacken ──
const moveInfo = [[0, 0, 0, 0, 0]];
const moveExtra = {};
const HIGH_CRIT = new Set(['KARATE_CHOP', 'RAZOR_LEAF', 'CRABHAMMER', 'SLASH']);
const FIXED = { SEISMIC_TOSS: 'LEVEL_DAMAGE_FLAT', NIGHT_SHADE: 'LEVEL_DAMAGE_FLAT', SONICBOOM: '20_DAMAGE_FLAT',
  DRAGON_RAGE: '40_DAMAGE_FLAT', PSYWAVE: 'RANDOM_DAMAGE_1_TO_150_LEVEL' };
const EFFECT = { TWO_TO_FIVE_ATTACKS_EFFECT: 'MULTI_HIT', ATTACK_TWICE_EFFECT: 'HIT_TWICE', TWINEEDLE_EFFECT: 'HIT_TWICE',
  OHKO_EFFECT: 'ONE_HIT_KO', SUPER_FANG_EFFECT: 'HALVE_HP', EXPLODE_EFFECT: 'HALVE_DEFENSE', HYPER_BEAM_EFFECT: 'RECHARGE_AFTER',
  CHARGE_EFFECT: 'CHARGE_TURN', FLY_EFFECT: 'FLY', BIDE_EFFECT: 'BIDE', RECOIL_EFFECT: 'RECOIL_QUARTER' };
for (const line of read('data/moves/moves.asm').split(/\r?\n/)) {
  const m = /^move (\w+),\s*(\w+),\s*(\d+),\s*(\w+),\s*(\d+),\s*(\d+)/.exec(code(line));
  if (!m) continue;
  const [, name, effect, power, type, acc, pp] = m;
  const id = moveId(name), t = TYPE[type];
  moveInfo[id] = [t, +pp, +power, +acc, +power === 0 ? 1 : PHYSICAL.has(t) ? 2 : 3];
  let eff = FIXED[name] || EFFECT[effect] || (HIGH_CRIT.has(name) ? 'HIGH_CRITICAL' : 'HIT');
  if (name === 'COUNTER') eff = 'COUNTER';
  moveExtra[id] = [name === 'QUICK_ATTACK' ? 1 : name === 'COUNTER' ? -1 : 0, eff];
}

// ── Trainer-Teams ──
const partyLines = read('data/trainers/parties.asm').split(/\r?\n/);
const pointerLabels = [];
inTable = false;
for (const line of partyLines) {
  if (/^TrainerDataPointers:/.test(line)) { inTable = true; continue; }
  if (inTable) { const m = /^\s*dw (\w+)/.exec(line); if (m) pointerLabels.push(m[1]); else if (/^\w+:/.test(line)) inTable = false; }
}
const parties = {};      // Label → [[level, Art-Name], …] je Team
let current = [], lastDb = true;
for (const line of partyLines) {
  const lab = /^(\w+Data):/.exec(line);
  if (lab) { if (lastDb) current = []; current.push(lab[1]); parties[lab[1]] = parties[lab[1]] || []; lastDb = false; continue; }
  const c = code(line);
  if (!c.startsWith('db ') || !current.length) continue;
  lastDb = true;
  const v = c.slice(3).split(',').map(s => s.trim());
  const team = [];
  if (v[0] === '$FF') for (let k = 1; v[k] !== '0'; k += 2) team.push([+v[k], v[k + 1]]);
  else for (let k = 1; v[k] !== '0'; k++) team.push([+v[0], v[k]]);
  current.forEach(l => parties[l].push(team));
}
const partiesOf = cls => parties[pointerLabels[classes.indexOf(cls) - 1]] || [];

// Arenaleiter-Sonderattacke (LoneMoves): Nummer der Arena → [Pokémon-Nr. (0 = erstes), Attacke]
const special = read('data/trainers/special_moves.asm');
const lone = [...special.split('TeamMoves:')[0].matchAll(/db (\d+), (\w+)/g)].map(m => [+m[1], moveId(m[2])]);
const teamMoves = Object.fromEntries([...special.split('TeamMoves:')[1].matchAll(/db (\w+),\s*(\w+)/g)].map(m => [m[1], moveId(m[2])]));
const GYM_NO = { BROCK: 1, MISTY: 2, LT_SURGE: 3, ERIKA: 4, KOGA: 5, SABRINA: 6, BLAINE: 7 };   // Giovanni: nur in der Arena (8)

function movesFor(dex, level) {
  const known = [...firstMoves[dex]];
  for (const [lv, mv] of learnsets[dex] || []) {
    if (lv > level) break;
    if (known.includes(mv)) continue;
    if (known.length === 4) known.shift();
    known.push(mv);
  }
  return known;
}
const DVS = [8, 9, 8, 8, 8, 8];   // KP-DV aus den Bits der anderen: 9→1, 8→0 … = 8
function buildTeam(cls, no, rivalStarter) {
  const team = partiesOf(cls)[no - 1];
  if (!team) throw new Error(`Team fehlt: ${cls} ${no}`);
  const p = team.map(([level, name]) => [dexOf(name), 0, level, 0, movesFor(dexOf(name), level), null, 0, DVS]);
  const setMove = (i, mv) => { const m = p[i] && p[i][4]; if (!m) return; while (m.length < 3) m.push(0); m[2] = mv; p[i][4] = m.filter(Boolean); };
  const gym = cls === 'GIOVANNI' ? (no === 3 ? 8 : 0) : GYM_NO[cls] || 0;
  if (gym) setMove(lone[gym - 1][0], lone[gym - 1][1]);
  if (teamMoves[cls] != null) setMove(4, teamMoves[cls]);
  if (cls === 'RIVAL3') {
    setMove(0, moveId('SKY_ATTACK'));
    setMove(5, moveId({ CHARMANDER: 'FIRE_BLAST', SQUIRTLE: 'BLIZZARD', BULBASAUR: 'MEGA_DRAIN' }[rivalStarter]));
  }
  return p;
}

// Heilitems der Trainer-KI: wie oft je Pokémon
const PT = (() => { const ctx = { window: {} }; vm.runInNewContext(fs.readFileSync(path.join(HUB, 'SaveViewer/data-pt.js'), 'utf8'), ctx); return ctx.window.PT_DATA; })();
const itemId = en => { const i = PT.text.en.items.indexOf(en); if (i < 0) throw new Error('Item? ' + en); return i; };
const AI_ITEM = { AIUsePotion: 'Potion', AIUseSuperPotion: 'Super Potion', AIUseHyperPotion: 'Hyper Potion', AIUseFullRestore: 'Full Restore', AIUseFullHeal: 'Full Heal' };
const aiCode = read('engine/battle/trainer_ai.asm');
const heals = {};
for (const m of read('data/trainers/ai_pointers.asm').matchAll(/dbw (\d+), (\w+) ; (\w+)/g)) {
  const body = (new RegExp(`^${m[2]}:([\\s\\S]*?)^\\w+:`, 'm').exec(aiCode) || [])[1] || '';
  const use = Object.keys(AI_ITEM).find(k => body.includes(`jp ${k}`) || body.includes(`jp c, ${k}`));
  if (use) heals[m[3]] = new Array(+m[1]).fill(itemId(AI_ITEM[use]));
}

// ── Orte: Karte (Außenkarten) und die Gebäude/Höhlen darin ──
const kanto = JSON.parse(fs.readFileSync(path.join(HUB, 'Karte/kanto.json'), 'utf8'));
const locs = kanto.locations.map(l => ({ de: l.de, en: l.en, slug: l.slug }));
const locIndex = key => kanto.locations.findIndex(l => l.key === key);
const PLACES = [
  [/^OaksLab$/, 'PALLET_TOWN', 'Labor von Prof. Eich', "Oak's Lab"], [/^ViridianForest/, 'ROUTE_2', 'Vertania-Wald', 'Viridian Forest'],
  [/^MtMoon/, 'ROUTE_4', 'Mondberg', 'Mt. Moon'], [/^SSAnne/, 'VERMILION_CITY', 'M.S. Anne', 'S.S. Anne'],
  [/^RockTunnel/, 'ROUTE_10', 'Felstunnel', 'Rock Tunnel'], [/^PokemonTower/, 'LAVENDER_TOWN', 'Pokémon-Turm', 'Pokémon Tower'],
  [/^GameCorner/, 'CELADON_CITY', 'Spielhalle', 'Game Corner'], [/^RocketHideout/, 'CELADON_CITY', 'Rocket-Versteck', 'Rocket Hideout'],
  [/^FightingDojo/, 'SAFFRON_CITY', 'Kampf-Dojo', 'Fighting Dojo'], [/^SilphCo/, 'SAFFRON_CITY', 'Silph Co.', 'Silph Co.'],
  [/^PokemonMansion/, 'CINNABAR_ISLAND', 'Pokémon-Haus', 'Pokémon Mansion'], [/^VictoryRoad/, 'ROUTE_23', 'Siegesstraße', 'Victory Road'],
  [/^(Loreleis|Brunos|Agathas|Lances|Champions)Room$/, 'INDIGO_PLATEAU', 'Pokémon-Liga', 'Pokémon League'],
  [/^(\w+)Gym$/, null, 'Arena', 'Gym'],
];
const snake = s => s.replace(/([a-z])([A-Z0-9])/g, '$1_$2').replace(/([0-9])([A-Z])/g, '$1_$2').toUpperCase();
const areaEn = {};
function place(label) {
  for (const [re, key, de, en] of PLACES) {
    const m = re.exec(label);
    if (!m) continue;
    // Arenen: Stadt, deren Name so anfängt (PewterGym → PEWTER_CITY, CinnabarGym → CINNABAR_ISLAND)
    const parent = key || kanto.locations.find(l => l.key.startsWith(snake(m[1]) + '_')).key;
    // Stockwerk bzw. Teil: 1F, B2F, 10F; M.S. Anne: Kabinen, Bug
    const rest = label.replace(/^(SSAnne|SilphCo|RocketHideout|PokemonTower|PokemonMansion|VictoryRoad|MtMoon|RockTunnel)/, '');
    const floor = /^(B?\d+F)/.exec(rest);
    const part = /Rooms$/.test(rest) ? [' · Kabinen', ' · Cabins'] : /Bow$/.test(rest) ? [' · Bug', ' · Bow'] : ['', ''];
    const a = floor && rest !== label ? [`${de} ${floor[1]}${part[0]}`, `${en} ${floor[1]}${part[1]}`] : [de + part[0], en + part[1]];
    if (a[0] !== a[1]) areaEn[a[0]] = a[1];
    return { l: locIndex(parent), a: a[0] };
  }
  return { l: locIndex(snake(label)), a: '' };
}

// Trainer auf den Karten: Klasse + Team-Nummer → erste Karte
const where = {};
const objDir = path.join(SRC, 'data/maps/objects');
for (const file of fs.readdirSync(objDir).sort()) {
  for (const line of fs.readFileSync(path.join(objDir, file), 'utf8').split(/\r?\n/)) {
    const m = /object_event .*\bOPP_(\w+), (\d+)/.exec(code(line));
    if (m && !where[`${m[1]}:${m[2]}`]) where[`${m[1]}:${m[2]}`] = place(path.basename(file, '.asm'));
  }
}

// ── Namen ──
const KANTO_PY = fs.readFileSync(path.join(HUB, 'Karte/tools/build-kanto.py'), 'utf8');
const pyDict = name => Object.fromEntries([...(new RegExp(`${name} = \\{([\\s\\S]*?)\\n\\}`).exec(KANTO_PY) || [])[1].matchAll(/"(\w+)": "([^"]+)"/g)].map(m => [m[1], m[2]]));
const CLASS_DE = pyDict('TRAINER_DE'), CLASS_EN = pyDict('TRAINER_EN');
const classEn = c => CLASS_EN[c] || c.replace(/_TR$/, '').split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
// Arenaleiter, Top Vier, Boss und Rivale: Titel + Name
const PEOPLE = {
  BROCK: ['Arenaleiter', 'Leader', 'Rocko', 'Brock'], MISTY: ['Arenaleiterin', 'Leader', 'Misty', 'Misty'],
  LT_SURGE: ['Arenaleiter', 'Leader', 'Major Bob', 'Lt. Surge'], ERIKA: ['Arenaleiterin', 'Leader', 'Erika', 'Erika'],
  KOGA: ['Arenaleiter', 'Leader', 'Koga', 'Koga'], SABRINA: ['Arenaleiterin', 'Leader', 'Sabrina', 'Sabrina'],
  BLAINE: ['Arenaleiter', 'Leader', 'Pyro', 'Blaine'], LORELEI: ['Top Vier', 'Elite Four', 'Lorelei', 'Lorelei'],
  BRUNO: ['Top Vier', 'Elite Four', 'Bruno', 'Bruno'], AGATHA: ['Top Vier', 'Elite Four', 'Agathe', 'Agatha'],
  LANCE: ['Top Vier', 'Elite Four', 'Siegfried', 'Lance'], RIVAL1: ['Rivale', 'Rival', 'Blau', 'Blue'],
  RIVAL2: ['Rivale', 'Rival', 'Blau', 'Blue'], RIVAL3: ['Champ', 'Champion', 'Blau', 'Blue'],
};
function names(cls, no) {
  if (cls === 'GIOVANNI') return no === 3 ? ['Arenaleiter', 'Leader', 'Giovanni', 'Giovanni'] : ['Rocket-Boss', 'Boss', 'Giovanni', 'Giovanni'];
  return PEOPLE[cls] || [CLASS_DE[cls] || classEn(cls), classEn(cls), '', ''];
}

// ── Story: Kämpfe in der üblichen Reihenfolge; Rivale je nach deinem Starter (er nimmt den, der gegen deinen gewinnt) ──
// Teams des Rivalen kommen in Dreiergruppen: deins Glumanda, Schiggy, Bisasam (OaksLab.asm & Co.: STARTER2/3/1)
const RIVAL_OF = { charmander: ['SQUIRTLE', 0], squirtle: ['BULBASAUR', 1], bulbasaur: ['CHARMANDER', 2] };
const STORY = [
  ['RIVAL_OAKS_LAB', 'RIVAL1', 1, 'OaksLab'], ['RIVAL_ROUTE_22', 'RIVAL1', 4, 'Route22'], ['BROCK', 'BROCK', 1],
  ['RIVAL_CERULEAN', 'RIVAL1', 7, 'CeruleanCity'], ['MISTY', 'MISTY', 1], ['RIVAL_SS_ANNE', 'RIVAL2', 1, 'SSAnne2F'],
  ['LT_SURGE', 'LT_SURGE', 1], ['RIVAL_POKEMON_TOWER', 'RIVAL2', 4, 'PokemonTower2F'], ['ERIKA', 'ERIKA', 1],
  ['GIOVANNI_HIDEOUT', 'GIOVANNI', 1], ['KOGA', 'KOGA', 1], ['RIVAL_SILPH', 'RIVAL2', 7, 'SilphCo7F'],
  ['GIOVANNI_SILPH', 'GIOVANNI', 2], ['SABRINA', 'SABRINA', 1], ['BLAINE', 'BLAINE', 1], ['GIOVANNI', 'GIOVANNI', 3],
  ['RIVAL_ROUTE_22_2', 'RIVAL2', 10, 'Route22'], ['LORELEI', 'LORELEI', 1], ['BRUNO', 'BRUNO', 1], ['AGATHA', 'AGATHA', 1],
  ['LANCE', 'LANCE', 1], ['CHAMPION', 'RIVAL3', 1, 'ChampionsRoom'],
];
const BADGE_LEADERS = ['BROCK', 'MISTY', 'LT_SURGE', 'ERIKA', 'KOGA', 'SABRINA', 'BLAINE', 'GIOVANNI'];

const trainers = {};
const idOf = (cls, no) => classes.indexOf(cls) * 100 + no;
function addTrainer(cls, no, at, rivalStarter) {
  const id = idOf(cls, no);
  const [cd, ce, nd, ne] = names(cls, no);
  trainers[id] = { k: `${cls}_${no}`, cd, ce, nd, ne, c: cls, d: 0, it: heals[cls] || [], l: at.l >= 0 ? at.l : null, a: at.a, m: '',
    p: buildTeam(cls, no, rivalStarter) };
  if (/^RIVAL/.test(cls)) trainers[id].r = 1;
  return id;
}
const story = STORY.map(([key, cls, no, map]) => {
  if (/^RIVAL/.test(cls)) {
    const at = place(map);
    const ids = {};
    for (const [starter, [rival, k]] of Object.entries(RIVAL_OF)) ids[starter] = addTrainer(cls, no + k, at, rival);
    return { key, ids };
  }
  const at = where[`${cls}:${no}`];
  if (!at) throw new Error('Ort fehlt: ' + key);
  return { key, ids: { all: addTrainer(cls, no, at) } };
});
// Alle anderen Trainer mit festem Platz auf einer Karte
for (const [k, at] of Object.entries(where)) {
  const [cls, no] = k.split(':');
  if (/^RIVAL/.test(cls) || trainers[idOf(cls, +no)]) continue;
  if (!partiesOf(cls)[+no - 1]) continue;
  addTrainer(cls, +no, at);
}

let commit = 'unknown';
try { commit = execFileSync('git', ['-C', SRC, 'rev-parse', '--short=12', 'HEAD'], { encoding: 'utf8' }).trim(); } catch (e) { /* kein Git */ }
const out = {
  version: 1, source: `pret/pokered@${commit}`, gen: 1,
  locs, story, post: [], badgeLeaders: BADGE_LEADERS, trainers, moveExtra, weight: [], areaEn, fem: [],
  personal, moveInfo,
};
fs.writeFileSync(path.join(OUT, 'bosses-rb.json'), JSON.stringify(out));
const n = Object.keys(trainers).length;
console.log(`bosses-rb.json: ${n} Trainer, ${story.length} Story-Kämpfe, ${personal.length - 1} Pokémon, ${moveInfo.length - 1} Attacken (${commit})`);
