// Typen je Generation für Solo, Duo, Trio und Pokédex (pokemon-types.js).
// Ausführen: node --test "tests/*.test.*"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function load(stored) {
  const store = new Map(stored == null ? [] : [['hub-gen', String(stored)]]);
  const events = [];
  const window = {
    DMG: require('../DamageCalc/mechanics.js'),
    localStorage: { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) },
  };
  const document = { dispatchEvent: e => events.push(e) };
  class CustomEvent { constructor(type, init) { this.type = type; this.detail = init && init.detail; } }
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, '../pokemon-types.js'), 'utf8'),
    { window, document, CustomEvent, localStorage: window.localStorage });
  return { T: window.PokemonTypes, store, events };
}

// Ergebnisse stammen aus einem anderen VM-Kontext – vor dem Vergleich kopiert ([...x])
const togekiss = { id: 468, types: ['fairy', 'flying'] };

test('Togekiss ist bis Gen 5 Normal/Flug, ab Gen 6 Fee/Flug', () => {
  const { T } = load();
  assert.deepEqual([...T.typesInGen(togekiss, 4)], ['normal', 'flying']);
  assert.deepEqual([...T.typesInGen(togekiss, 5)], ['normal', 'flying']);
  assert.deepEqual([...T.typesInGen(togekiss, 6)], ['fairy', 'flying']);
});

test('Magnetilo ist nur in Gen 1 reines Elektro, Rotom-Formen bis Gen 4 Elektro/Geist', () => {
  const { T } = load();
  assert.deepEqual([...T.typesInGen({ id: 81, types: ['electric', 'steel'] }, 1)], ['electric']);
  assert.deepEqual([...T.typesInGen({ id: 81, types: ['electric', 'steel'] }, 2)], ['electric', 'steel']);
  assert.deepEqual([...T.typesInGen({ id: 10008, types: ['electric', 'fire'] }, 4)], ['electric', 'ghost']);
  assert.deepEqual([...T.typesInGen({ id: 10008, types: ['electric', 'fire'] }, 5)], ['electric', 'fire']);
});

test('Unveränderte Pokémon und fehlende Daten', () => {
  const { T } = load();
  assert.deepEqual([...T.typesInGen({ id: 25, types: ['electric'] }, 1)], ['electric']);
  assert.deepEqual([...T.typesInGen({ id: 25 }, 4)], []);
  assert.deepEqual([...T.typesInGen(null, 4)], []);
});

test('Typen der Generation: kein Fee vor Gen 6, kein Unlicht/Stahl in Gen 1', () => {
  const { T } = load();
  assert.equal(T.typeList(9).length, 18);
  assert.ok(!T.typeList(4).includes('fairy'));
  assert.equal(T.typeList(4).length, 17);
  assert.deepEqual(['dark', 'steel', 'fairy'].filter(t => T.typeList(1).includes(t)), []);
});

test('Wirkung je Generation: Stahl widersteht Geist bis Gen 5, Gift trifft Togekiss erst ab Gen 6', () => {
  const { T } = load();
  assert.equal(T.effectiveness('ghost', ['steel'], 4), 0.5);
  assert.equal(T.effectiveness('ghost', ['steel'], 6), 1);
  assert.equal(T.effectiveness('poison', T.typesInGen(togekiss, 4), 4), 1);
  assert.equal(T.effectiveness('poison', T.typesInGen(togekiss, 9), 9), 2);
});

test('Basiswerte je Generation: Smettbo Sp.-Angriff 80 bis Gen 5, in Gen 1 ein Spezial-Wert', () => {
  const { T } = load();
  // So liefert Pokelocke/pokeapi.js die Daten (PokéAPI past_stats)
  const butterfree = {
    stats: { hp: 60, attack: 45, defense: 50, specialAttack: 90, specialDefense: 80, speed: 70 },
    pastStats: [{ gen: 1, stats: { special: 80 } }, { gen: 5, stats: { specialAttack: 80 } }],
  };
  assert.equal(T.statsInGen(butterfree, 9).specialAttack, 90);
  assert.equal(T.statsInGen(butterfree, 4).specialAttack, 80);
  assert.equal(T.statsInGen(butterfree, 4).specialDefense, 80);
  const gen1 = T.statsInGen(butterfree, 1);
  assert.equal(gen1.specialAttack, 80);
  assert.equal(gen1.specialDefense, 80);
  assert.equal(gen1.hp, 60);
  assert.deepEqual({ ...T.statsInGen({ stats: { hp: 1 } }, 4) }, { hp: 1 });   // ohne pastStats unverändert
});

test('Gemerkte Generation: hub-gen, sonst Gen 9; Wahl wird gespeichert und gemeldet', () => {
  assert.equal(load().T.getGen(), 9);
  assert.equal(load(4).T.getGen(), 4);
  assert.equal(load('kaputt').T.getGen(), 9);
  const { T, store, events } = load(9);
  T.setGen(4);
  assert.equal(store.get('hub-gen'), '4');
  assert.equal(events[0].type, 'hubgenchange');
  assert.equal(events[0].detail, 4);
});
