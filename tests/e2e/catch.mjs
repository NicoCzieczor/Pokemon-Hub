// Fangformeln Gen 1–4 gegen von Hand nachgerechnete Fälle (Funktionen unverändert aus Catchrate/main.js)
import fs from 'node:fs';
import vm from 'node:vm';
import { ROOT, check, failed } from './harness.mjs';

const src = fs.readFileSync(ROOT + '/Catchrate/main.js', 'utf8');
const from = src.indexOf('// Texts and URLs from PokeAPI');
const to = src.indexOf('function throwsNeeded');
const ctx = vm.createContext({ window: { LANG: 'de' }, Math, Set, Number, isFinite });
vm.runInContext(src.slice(from, to) + '\nthis.setMon = m => { selectedPokemon = m; }; this.BALLS = BALLS; this.computeProb = computeProb; this.levelMult = levelMult; this.nestMult = nestMult; this.heavyBonus = heavyBonus;', ctx);
const ball = id => ctx.BALLS.find(b => b.id === id);
const conds = o => ({ formulaGen: 4, gen: 4, hpPercent: 100, status: 'none', enemyLevel: 5, playerLevel: 50, turns: 1,
  firstTurn: false, dark: false, diving: false, caughtBefore: false, fishing: false, moonStoneEvo: false, sameGender: false,
  types: ['normal'], weightKg: 20, baseSpeed: 50, falseSwipe: false, ...o });
const near = (a, b, eps = 1e-4) => Math.abs(a - b) < eps;
const P = (id, c, mon) => { ctx.setMon({ id: 1, captureRate: 45, baseHp: 45, weightKg: 20, baseSpeed: 50, ...mon }); return ctx.computeProb(ball(id), conds(c)); };

// Platin: Fangrate 45, volle KP, Level 5 (KP 20): a = 15, b = 32767 → (32767/65536)^4
check('Gen 4: Pokéball, volle KP', near(P('poke', {}), Math.pow(32767 / 65536, 4)), P('poke', {}));
// mit Schlaf: a = 30 → 16711680/30 = 557056 → √ 746 → √ 27 → b = 38835
check('Gen 4: Schlaf verdoppelt a', near(P('poke', { status: 'sleep' }), Math.pow(38835 / 65536, 4)), P('poke', { status: 'sleep' }));
// a ≥ 255 → sicher: Fangrate 255, Hyperball
check('Gen 4: a ≥ 255 → 100 % (1 KP, Hyperball, Fangrate 255)', P('ultra', { falseSwipe: true }, { captureRate: 255 }) === 1);
check('Gen 4: volle KP drittelt a → nicht sicher', P('ultra', {}, { captureRate: 255 }) < 1);
check('Gen 4: Nestball Level 20 → 2×', ctx.nestMult(20, 4) === 2 && ctx.nestMult(20, 5) === 2.1);
check('Gen 4: Levelball 10 gegen 5 → 2× (vorher 4×)', ctx.levelMult(10, 5) === 2 && ctx.levelMult(11, 5) === 2 && ctx.levelMult(12, 5) === 4 && ctx.levelMult(20, 5) === 4 && ctx.levelMult(24, 5) === 8);
check('HGSS: Schwerball 150 kg → −20 (Gen 2: ±0)', ctx.heavyBonus(150, 4) === -20 && ctx.heavyBonus(150, 2) === 0 && ctx.heavyBonus(460, 4) === 40);
// HGSS Aprikoko: Tempoball verändert die Fangrate, höchstens 255: Fangrate 100 × 4 → 255; a = 255×20/60 = 85
const fast = P('fast', { baseSpeed: 120 }, { captureRate: 100, baseSpeed: 120 });
const b85 = Math.floor(1048560 / Math.floor(Math.sqrt(Math.floor(Math.sqrt(Math.floor(16711680 / 85))))));
check('HGSS: Aprikoko-Ball begrenzt auf 255', near(fast, Math.pow(b85 / 65536, 4)), fast);
// Gen 3 Smaragd: gleiche Formel, KP-Schätzung wie Gen 4
check('Gen 3: Pokéball wie Gen 4', near(P('poke', { formulaGen: 3, gen: 3 }), Math.pow(32767 / 65536, 4)));

// Gen 2 Kristall: KP_max = (45+8)·2·5/100 + 15 = 20 → a = 45·20/60 = 15 → 16/256
check('Gen 2: Pokéball, volle KP → 16/256', near(P('poke', { formulaGen: 2, gen: 2 }), 16 / 256), P('poke', { formulaGen: 2, gen: 2 }));
check('Gen 2: Schlaf +10 → 26/256', near(P('poke', { formulaGen: 2, gen: 2, status: 'sleep' }), 26 / 256));
check('Gen 2: Paralyse nichts (Bug)', near(P('poke', { formulaGen: 2, gen: 2, status: 'paralysis' }), 16 / 256));
// Hyperball: Fangrate 90 → a = 90·20/60 = 30 → 31/256
check('Gen 2: Hyperball verdoppelt die Fangrate', near(P('ultra', { formulaGen: 2, gen: 2 }), 31 / 256));
// Levelball ignoriert KP: 45 × 8 → 255 → 256/256
check('Gen 2: Levelball ohne KP-Faktor (Bug)', P('level', { formulaGen: 2, gen: 2, playerLevel: 50, enemyLevel: 5 }) === 1);
check('Gen 2: Tempoball nur Magnetilo/Sleima/Tangela (Bug)',
  near(P('fast', { formulaGen: 2, gen: 2 }, { baseSpeed: 120 }), 16 / 256) && P('fast', { formulaGen: 2, gen: 2 }, { id: 81 }) > 16 / 256);

// Gen 1 Rot: F = (20·255/12) ÷ (20/4) = 425 ÷ 5 = 85; Pokéball 0–255: (45+1)·86/256 ÷ 256
check('Gen 1: Pokéball, volle KP', near(P('poke', { formulaGen: 1, gen: 1 }), 46 * 86 / 256 / 256), P('poke', { formulaGen: 1, gen: 1 }));
// Superball 0–200, F = 637 ÷ 5 = 127 → (46·128/256) ÷ 201
check('Gen 1: Superball', near(P('great', { formulaGen: 1, gen: 1 }), 46 * 128 / 256 / 201));
// Schlaf: 25 Werte sofort gefangen, dann 46 Werte mit F-Chance
check('Gen 1: Schlaf', near(P('poke', { formulaGen: 1, gen: 1, status: 'sleep' }), (25 + 46 * 86 / 256) / 256));

// Ab Gen 5 unverändert vereinfacht: a/255
check('Gen 5: unverändert a/255', near(P('poke', { formulaGen: 5, gen: 5 }), 45 / 3 / 255, 1e-6));

console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
