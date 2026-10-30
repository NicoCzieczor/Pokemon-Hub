// Duo: gemeinsamen Spielstand prüfen (F02) und zusammenführen (F05). Ausführen: node --test "tests/*.test.*"
import test from 'node:test';
import assert from 'node:assert/strict';
import { cleanSharedState, cleanMon, cleanGrave, mergeSharedState } from '../Duo/shared-state.js';

const mon = (name, id = 1) => ({ id, name, sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`, germanName: name, types: ['grass'] });
const empty = () => ({
  team1: Array(6).fill(null), team2: Array(6).fill(null), box1: Array(30).fill(null), box2: Array(30).fill(null),
  linkedTeam: [], linkedBox: [], graves1: [], graves2: [],
});

test('präparierte Namen und Bilder werden verworfen', () => {
  assert.equal(cleanMon({ name: '<img src=x onerror=alert(1)>' }), null);
  const m = cleanMon({ id: 25, name: 'pikachu', sprite: 'javascript:alert(1)', germanName: 'Pikachu', types: ['electric', 'evil'] });
  assert.equal(m.sprite, 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png');
  assert.deepEqual(m.types, ['electric']);
  assert.equal(cleanMon({ id: 25, name: 'pikachu', sprite: 'https://evil.example/x.png' }).sprite.startsWith('https://raw.githubusercontent.com/PokeAPI/'), true);
});

test('nur bekannte Felder kommen durch', () => {
  const s = cleanSharedState({
    team1: [{ ...mon('bulbasaur'), moves: [1], stats: { hp: '<b>' }, evolutionChainUrl: 'https://evil.example' }],
    linkedTeam: [0, 7, -1, 'x', 0], graves1: [{ ...mon('rattata', 19), killedBy: 9, linkId: 5 }], extra: 1,
  });
  assert.deepEqual(Object.keys(s.team1[0]).sort(), ['germanName', 'id', 'name', 'sprite', 'types']);
  assert.equal(s.team1.length, 6);
  assert.deepEqual(s.linkedTeam, [0]);
  assert.equal(s.graves1[0].killedBy, 0);
  assert.equal(s.graves1[0].linkId, 5);
  assert.equal('extra' in s, false);
  assert.equal(cleanSharedState(null), null);
  assert.equal(cleanSharedState([1]), null);
  assert.equal(cleanGrave({ name: 'x y' }), null);
});

test('Änderungen beider Seiten bleiben erhalten (Rückkehr aus dem Hintergrund)', () => {
  const base = empty();
  base.team1[0] = mon('bulbasaur');
  const local = structuredClone(base);   // ich: Box-Platz 3 belegt
  local.box1[3] = mon('pikachu', 25);
  const server = structuredClone(base);  // Partner: Team-Platz 1 geändert, verknüpft
  server.team2[1] = mon('charmander', 4);
  server.linkedTeam = [1];
  const m = mergeSharedState(base, local, server);
  assert.equal(m.box1[3].name, 'pikachu');
  assert.equal(m.team2[1].name, 'charmander');
  assert.equal(m.team1[0].name, 'bulbasaur');
  assert.deepEqual(m.linkedTeam, [1]);
});

test('gleicher Platz auf beiden Seiten geändert: eigene Änderung gewinnt', () => {
  const base = empty();
  const local = structuredClone(base); local.team1[0] = mon('squirtle', 7);
  const server = structuredClone(base); server.team1[0] = mon('eevee', 133);
  assert.equal(mergeSharedState(base, local, server).team1[0].name, 'squirtle');
});

test('Friedhof: neue Einträge beider Seiten, Löschen und Schuld-Änderung', () => {
  const base = empty();
  base.graves1 = [{ ...mon('rattata', 19), killedBy: 0 }, { ...mon('zubat', 41), killedBy: 0 }];
  const local = structuredClone(base);
  local.graves1[0].killedBy = 1;            // Schuld geändert
  local.graves1.splice(1, 1);               // Zubat entfernt
  local.graves1.push({ ...mon('geodude', 74), killedBy: 0 });
  const server = structuredClone(base);
  server.graves1.push({ ...mon('onix', 95), killedBy: 2 });
  const names = mergeSharedState(base, local, server).graves1.map(g => `${g.name}:${g.killedBy}`);
  assert.deepEqual(names, ['rattata:1', 'onix:2', 'geodude:0']);
});

test('Routen: Fangort, Spiel und verpasste Routen werden geprüft', () => {
  const ctrl = String.fromCharCode(7);
  assert.equal(cleanMon({ ...mon('bulbasaur'), route: ' Route' + ctrl + ' 201 ' }).route, 'Route 201');
  assert.equal(cleanMon({ ...mon('bulbasaur'), route: 'x'.repeat(80) }).route.length, 40);
  assert.equal('route' in cleanMon({ ...mon('bulbasaur'), route: 42 }), false);
  assert.equal(cleanGrave({ ...mon('rattata', 19), killedBy: 1, route: 'Route 202' }).route, 'Route 202');
  const s = cleanSharedState({ game: 'platin', routeMarks: { 'Route 203': 1, 'Route 204': 3, 'Route 205': 9, '': 1 } });
  assert.equal(s.game, 'platin');
  assert.deepEqual(s.routeMarks, { 'Route 203': 1, 'Route 204': 3 });
  assert.equal(cleanSharedState({ game: '<script>' }).game, '');
  assert.equal('game' in cleanSharedState({}), false);   // alter Stand ohne Spiel: Feld fehlt, wird nicht geleert
});

test('Routen zusammenführen: Fangort am selben Pokémon, verpasst und Spiel von beiden Seiten', () => {
  const base = empty();
  base.team1[0] = mon('bulbasaur'); base.team2[0] = mon('squirtle', 7);
  base.game = ''; base.routeMarks = { 'Route 202': 1 };
  const local = structuredClone(base);     // ich: Fangort am Paar, Route 202 doch nicht verpasst
  local.team1[0].route = local.team2[0].route = 'Route 201';
  delete local.routeMarks['Route 202'];
  local.game = 'platin';
  const server = structuredClone(base);    // Partner: Route 203 verpasst, Fangort im Friedhof
  server.routeMarks['Route 203'] = 2;
  server.graves1 = [{ ...mon('rattata', 19), killedBy: 0, route: 'Route 204' }];
  const m = mergeSharedState(base, local, server);
  assert.equal(m.team1[0].route, 'Route 201');
  assert.equal(m.team2[0].route, 'Route 201');
  assert.deepEqual(m.routeMarks, { 'Route 203': 2 });
  assert.equal(m.game, 'platin');
  assert.equal(m.graves1[0].route, 'Route 204');

  // Fangort im Friedhof hier geändert, Partner hat nichts daran gemacht → eigener gewinnt
  const b2 = empty(); b2.graves1 = [{ ...mon('rattata', 19), killedBy: 0, linkId: 3, route: 'Route 204' }];
  const l2 = structuredClone(b2); l2.graves1[0].route = 'Route 205';
  assert.equal(mergeSharedState(b2, l2, structuredClone(b2)).graves1[0].route, 'Route 205');
  // Spiel nur beim Partner geändert → seins
  const b3 = { ...empty(), game: 'platin' };
  assert.equal(mergeSharedState(b3, structuredClone(b3), { ...structuredClone(b3), game: 'heartgold-soulsilver' }).game, 'heartgold-soulsilver');
});

test('ohne bekannten Ausgangsstand gilt die Datenbank (Partner-Stand wird nicht überschrieben)', () => {
  const local = empty(); local.team1[2] = mon('pidgey', 16);
  const server = empty(); server.team2[0] = mon('caterpie', 10);
  server.graves1 = [{ ...mon('rattata', 19), killedBy: 2 }];
  const m = mergeSharedState(null, local, server);
  assert.equal(m.team1[2], null);
  assert.equal(m.team2[0].name, 'caterpie');
  assert.deepEqual(m.graves1.map(g => g.name), ['rattata']);
});

test('Duo: wilde Pokémon je Spieler werden geprüft und je Spieler zusammengeführt', async () => {
  const { cleanWild } = await import('../Duo/shared-state.js');
  assert.deepEqual(cleanWild({ name: 'a.nds', r: { 'Route 201': [396, 396, 0, 600, 'x', 25], '': [1] } }), { name: 'a.nds', r: { 'Route 201': [396, 25] } });
  assert.equal(cleanWild({ name: 'a' }), null);
  const base = { ...empty(), wild1: null, wild2: { name: 'p2', r: { 'Route 201': [1] } } };
  const local = { ...structuredClone(base), wild1: { name: 'mein', r: { 'Route 201': [25] } } };   // ich teile mein Spiel
  const server = { ...structuredClone(base), wild2: { name: 'p2-neu', r: { 'Route 201': [4] } } };  // Partner würfelt neu
  const m = mergeSharedState(base, local, server);
  assert.equal(m.wild1.name, 'mein');
  assert.equal(m.wild2.name, 'p2-neu');
  assert.equal('wild1' in cleanSharedState({}), false);   // alter Stand ohne Feld: nichts überschreiben
});
