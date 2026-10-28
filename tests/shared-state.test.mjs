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

test('ohne bekannten Ausgangsstand gilt die Datenbank (Partner-Stand wird nicht überschrieben)', () => {
  const local = empty(); local.team1[2] = mon('pidgey', 16);
  const server = empty(); server.team2[0] = mon('caterpie', 10);
  server.graves1 = [{ ...mon('rattata', 19), killedBy: 2 }];
  const m = mergeSharedState(null, local, server);
  assert.equal(m.team1[2], null);
  assert.equal(m.team2[0].name, 'caterpie');
  assert.deepEqual(m.graves1.map(g => g.name), ['rattata']);
});
