// Randomizer-Einstellungen (Randomizer/options.js, rnqs.js): am Anfang ist nichts gewählt, und je Spiel gibt es nur
// die Optionen, die der Universal Pokémon Randomizer dort anbietet (z. B. „Zerrwelt abkürzen“ nur in Platin,
// Mega-Optionen nur in Omega Rubin / Alpha Saphir).
// Ausführen: node --test "tests/*.test.*"
const test = require('node:test');
const assert = require('node:assert/strict');

global.window = global.window || {};
global.atob = global.atob || (s => Buffer.from(s, 'base64').toString('binary'));
global.btoa = global.btoa || (s => Buffer.from(s, 'binary').toString('base64'));
require('../Randomizer/rnqs.js');
require('../Randomizer/options.js');
const R = window.Rnqs, O = window.RandoOptions;

const PT = { game: 'pt', english: false, code: 'CPUD', romName: 'Pokemon Platinum (G)' };
const ORAS = { game: 'oras', english: false, code: '', romName: 'Pokemon Omega Ruby' };
const FIELD = {};
O.FIELDS.forEach(x => { FIELD[x.k] = x.f; });
const ITEM = {};
O.ITEMS.forEach(it => { ITEM[it.k] = it; });
// Wie der Editor: Feld setzen, danach aufräumen
const set = (d, ctx, k, v) => { R.set(d, FIELD[k], v); O.normalize(d, ctx); };
const chosen = (d, ctx) => Object.keys(O.changes(d, O.blank(ctx), ctx)).sort();
const romName = d => Buffer.from(d.slice(R.LEN + 1, R.LEN + 1 + d[R.LEN])).toString('ascii');

test('am Anfang ist nichts gewählt – in beiden Spielen', () => {
  for (const ctx of [PT, ORAS]) {
    const d = O.blank(ctx), v = O.values(d);
    assert.deepEqual(chosen(d, ctx), []);
    O.ITEMS.forEach(it => {
      if (it.type === 'radio') assert.equal(v[it.k], it.f.values[0], it.k);
      if (it.type === 'check') assert.equal(v[it.k], false, it.k);
      if (it.type === 'count') assert.equal(v[it.k], 0, it.k);
    });
    const again = d.slice();
    O.normalize(again, ctx);
    assert.deepEqual([...again], [...d], 'Aufräumen ändert eine leere Auswahl nicht');
    // als Datei lesbar, mit dem Namen der ROM
    const back = R.parse(R.build(d));
    assert.deepEqual([...back.slice(0, R.LEN)], [...d.slice(0, R.LEN)]);
    assert.equal(romName(back), ctx.romName);
  }
  assert.deepEqual(['customStarters.0', 'customStarters.1', 'customStarters.2'].map(k => O.values(O.blank(PT))[k]), [387, 390, 393]);
  assert.deepEqual(['customStarters.0', 'customStarters.1', 'customStarters.2'].map(k => O.values(O.blank(ORAS))[k]), [252, 255, 258]);
});

test('Optionen je Spiel: Zerrwelt nur in Platin, Mega-Optionen nur in Omega Rubin / Alpha Saphir', () => {
  const ptOnly = ['tweak.fastDistortionWorld', 'tweak.runWithoutRunningShoes', 'tweak.fasterHpAndExpBars', 'tweak.lowerCaseNames',
    'tweak.updateRotomFormeTyping', 'tweak.typeEffectiveness', 'tweak.catchingTutorial'];
  const orasOnly = ['baseStatsFollowMegaEvolutions', 'typesFollowMegaEvolutions', 'abilitiesFollowMegaEvolutions', 'allowStarterAltFormes',
    'allowStaticAltFormes', 'swapStaticMegaEvos', 'swapTrainerMegaEvos', 'allowWildAltFormes', 'tweak.retainAltFormes', 'gen.5', 'gen.6'];
  ptOnly.forEach(k => { assert.ok(O.visible(ITEM[k], PT), k); assert.ok(!O.visible(ITEM[k], ORAS), k); });
  orasOnly.forEach(k => { assert.ok(!O.visible(ITEM[k], PT), k); assert.ok(O.visible(ITEM[k], ORAS), k); });
  // Sprachfassungen von Platin: Schnelltext nur englisch, Musik-Korrektur nur englisch; in OR/AS gibt es Schnelltext immer
  assert.ok(!O.visible(ITEM['tweak.fastestText'], PT));
  assert.ok(O.visible(ITEM['tweak.fastestText'], { game: 'pt', english: true, code: 'CPUE' }));
  assert.ok(O.visible(ITEM['tweak.fastestText'], ORAS));
  assert.ok(!O.visible(ITEM.correctStaticMusic, ORAS));
  // Auswahllisten „wie in neueren Spielen“
  const sub = (k, s) => ITEM[k].subs.find(x => x.k === s);
  assert.deepEqual(O.opts(sub('updateBaseStats', 'updateBaseStatsToGeneration'), PT).map(o => o.v), [6, 7, 8, 9]);
  assert.deepEqual(O.opts(sub('updateBaseStats', 'updateBaseStatsToGeneration'), ORAS).map(o => o.v), [7, 8, 9]);
  assert.deepEqual(O.opts(sub('updateMoves', 'updateMovesToGeneration'), PT).map(o => o.v), [5, 6, 7, 8, 9]);
  assert.deepEqual(O.opts(sub('updateMoves', 'updateMovesToGeneration'), ORAS).map(o => o.v), [7, 8, 9]);
});

test('was es im Spiel nicht gibt, lässt sich nicht wählen', () => {
  const d = O.blank(ORAS);
  set(d, ORAS, 'tweak.fastDistortionWorld', true);
  assert.deepEqual(chosen(d, ORAS), []);
  assert.deepEqual([...d], [...O.blank(ORAS)], 'das Bit steht auch nicht in der Datei');

  const p = O.blank(PT);
  set(p, PT, 'trainersMod', 'RANDOM');
  set(p, PT, 'swapTrainerMegaEvos', true);
  set(p, PT, 'gen.6', true);
  assert.deepEqual(chosen(p, PT), ['trainersMod']);
});

test('Datei aus Platin in Omega Rubin laden: Gemeinsames bleibt, Platin-Eigenes fällt weg', () => {
  const p = O.blank(PT);
  set(p, PT, 'trainersMod', 'TYPE_THEMED');
  set(p, PT, 'wildPokemonMod', 'RANDOM');
  set(p, PT, 'tweak.fastDistortionWorld', true);
  set(p, PT, 'tweak.nationalDex', true);
  set(p, PT, 'updateMoves', true);
  set(p, PT, 'updateMovesToGeneration', 5);
  set(p, PT, 'startersMod', 'CUSTOM');
  set(p, PT, 'customStarters.0', 493);
  set(p, PT, 'customStarters.1', 0);
  const file = R.build(p);

  const o = O.adopt(R.parse(file), ORAS), v = O.values(o);
  assert.deepEqual(chosen(o, ORAS), ['customStarters', 'startersMod', 'trainersMod', 'tweak.nationalDex', 'updateMoves', 'wildPokemonMod']);
  assert.equal(v['tweak.fastDistortionWorld'], false);
  assert.equal(v.updateMovesToGeneration, 7, '„Gen 5“ gibt es in OR/AS nicht → erster Eintrag');
  assert.deepEqual([v['customStarters.0'], v['customStarters.1'], v['customStarters.2']], [493, 0, 393]);

  // zurück nach Platin: dieselbe Datei ergibt wieder genau die Platin-Auswahl
  const back = O.adopt(R.parse(file), PT);
  assert.deepEqual([...back.slice(0, R.LEN)], [...p.slice(0, R.LEN)]);
});

test('Datei aus Omega Rubin in Platin laden: Pokémon und Optionen, die es dort nicht gibt, werden ersetzt', () => {
  const o = O.blank(ORAS);
  set(o, ORAS, 'startersMod', 'CUSTOM');
  set(o, ORAS, 'customStarters.0', 700);        // Feelinara gibt es in Platin nicht
  set(o, ORAS, 'customStarters.2', 25);
  set(o, ORAS, 'staticPokemonMod', 'RANDOM_MATCHING');
  set(o, ORAS, 'swapStaticMegaEvos', true);
  set(o, ORAS, 'limitPokemon', true);
  set(o, ORAS, 'gen.1', true);
  set(o, ORAS, 'gen.6', true);
  R.set(o, FIELD.trainersMod, 'MAINPLAYTHROUGH');   // nur Gen 5 – der Randomizer macht daraus RANDOM
  const p = O.adopt(R.parse(R.build(o)), PT), v = O.values(p);
  assert.deepEqual([v['customStarters.0'], v['customStarters.1'], v['customStarters.2']], [387, 255, 25]);
  assert.equal(v.swapStaticMegaEvos, false);
  assert.equal(v['gen.6'], false);
  assert.equal(v['gen.1'], true);
  assert.equal(v.trainersMod, 'RANDOM');
});

test('gemerkte Auswahl übersteht Speichern und Laden unverändert', () => {
  const d = O.blank(ORAS);
  set(d, ORAS, 'abilitiesMod', 'RANDOMIZE');
  set(d, ORAS, 'abilitiesFollowMegaEvolutions', true);
  set(d, ORAS, 'trainersMod', 'RANDOM');
  set(d, ORAS, 'swapTrainerMegaEvos', true);
  set(d, ORAS, 'additionalBossTrainerPokemon', 3);
  set(d, ORAS, 'tweak.retainAltFormes', true);
  const back = O.adopt(R.parse(R.build(d)), ORAS);
  assert.deepEqual([...back.slice(0, R.LEN)], [...d.slice(0, R.LEN)]);
  // Mega-Tausch bei Trainern: aus, sobald „Typ-Themen“ gewählt ist und nicht mehr jeder Typ eine Mega-Entwicklung hat
  set(d, ORAS, 'limitPokemon', true);
  set(d, ORAS, 'gen.5', true);
  assert.equal(O.values(d).swapTrainerMegaEvos, true);
  set(d, ORAS, 'trainersMod', 'TYPE_THEMED');
  assert.equal(O.values(d).swapTrainerMegaEvos, false);
});
