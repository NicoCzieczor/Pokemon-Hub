/*
 * shared-state.js – gemeinsamer Duo-Spielstand: prüfen und zusammenführen.
 *
 * Der Spielstand kommt aus der Datenbank und damit von außen. cleanSharedState() lässt nur bekannte
 * Felder mit gültigen Werten durch: Namen im PokeAPI-Format, Bilder nur von den PokeAPI-Sprites,
 * Typen aus der festen Liste, Plätze und Verknüpfungen im gültigen Bereich.
 *
 * mergeSharedState() führt zwei Stände zusammen, die beide vom selben Ausgangsstand abweichen –
 * z. B. wenn man nach der Rückkehr aus dem Hintergrund etwas ändert, bevor der neue Stand da ist.
 * Pro Platz gewinnt, wer ihn geändert hat; haben beide denselben Platz geändert, gewinnt die eigene,
 * neuere Änderung.
 */
export const TEAM_SIZE = 6;
export const BOX_SIZE = 30;
const MAX_GRAVES = 300;

const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
const TYPES = new Set(['normal', 'fire', 'water', 'electric', 'grass', 'ice', 'fighting', 'poison', 'ground',
  'flying', 'psychic', 'bug', 'rock', 'ghost', 'dragon', 'dark', 'steel', 'fairy']);
const NAME_RX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const SPRITE_RX = /^https:\/\/raw\.githubusercontent\.com\/PokeAPI\/sprites\/master\/sprites\/[a-z0-9_/-]+\.png$/;

export const isPokemonName = name => typeof name === 'string' && name.length <= 60 && NAME_RX.test(name);
export const spriteFor = id => `${SPRITES}pokemon/${id || 0}.png`;

// Anzeige-Daten eines Pokémon (wie toDisplayPokemon in main.js) oder null
export function cleanMon(p) {
  if (!p || typeof p !== 'object' || !isPokemonName(p.name)) return null;
  const id = Number.isInteger(p.id) && p.id > 0 && p.id < 100000 ? p.id : null;
  const sprite = typeof p.sprite === 'string' && SPRITE_RX.test(p.sprite) ? p.sprite : spriteFor(id);
  const germanName = typeof p.germanName === 'string' && p.germanName.trim() ? p.germanName.slice(0, 40) : p.name;
  const types = Array.isArray(p.types) ? p.types.filter(t => TYPES.has(t)).slice(0, 2) : [];
  return { id, name: p.name, sprite, germanName, types };
}

// Friedhof-Eintrag: Pokémon + Schuld (0 = ?, 1/2 = Spieler) + optionale Paar-Kennung
export function cleanGrave(g) {
  const mon = cleanMon(g);
  if (!mon) return null;
  mon.killedBy = g.killedBy === 1 || g.killedBy === 2 ? g.killedBy : 0;
  if (Number.isFinite(g.linkId)) mon.linkId = g.linkId;
  return mon;
}

const cleanSlots = (list, size) => Array.from({ length: size }, (_, i) => cleanMon(list[i]));
const cleanIndexes = (list, size) =>
  [...new Set(list.filter(i => Number.isInteger(i) && i >= 0 && i < size))].sort((a, b) => a - b);
const cleanGraves = list => list.slice(0, MAX_GRAVES).map(cleanGrave).filter(Boolean);

// Geprüfte Kopie; Felder, die fehlen oder keine Liste sind, fehlen auch in der Kopie. null = unbrauchbar
export function cleanSharedState(state) {
  if (!state || typeof state !== 'object' || Array.isArray(state)) return null;
  const out = {};
  if (typeof state.lastWriter === 'string' && state.lastWriter.length <= 64) out.lastWriter = state.lastWriter;
  for (const k of ['team1', 'team2']) if (Array.isArray(state[k])) out[k] = cleanSlots(state[k], TEAM_SIZE);
  for (const k of ['box1', 'box2']) if (Array.isArray(state[k])) out[k] = cleanSlots(state[k], BOX_SIZE);
  if (Array.isArray(state.linkedTeam)) out.linkedTeam = cleanIndexes(state.linkedTeam, TEAM_SIZE);
  if (Array.isArray(state.linkedBox)) out.linkedBox = cleanIndexes(state.linkedBox, BOX_SIZE);
  for (const k of ['graves1', 'graves2']) if (Array.isArray(state[k])) out[k] = cleanGraves(state[k]);
  return out;
}

/* ── Zusammenführen ────────────────────────────────────────────────── */
const nameOf = p => (p ? p.name : null);

function mergeSlots(base = [], local = [], server = [], size) {
  return Array.from({ length: size }, (_, i) => {
    const b = nameOf(base[i]), l = nameOf(local[i]), s = nameOf(server[i]);
    if (l === b) return server[i] || null;   // hier nichts geändert → Stand aus der Datenbank
    if (s === b) return local[i] || null;    // nur hier geändert
    return local[i] || null;                 // beide geändert → eigene, neuere Änderung
  });
}

function mergeIndexes(base = [], local = [], server = []) {
  const B = new Set(base), L = new Set(local), out = new Set(server);
  local.forEach(i => { if (!B.has(i)) out.add(i); });     // hier verknüpft
  base.forEach(i => { if (!L.has(i)) out.delete(i); });   // hier gelöst
  return [...out].sort((a, b) => a - b);
}

// Schlüssel je Eintrag: Name + Paar-Kennung + laufende Nummer (dasselbe Pokémon kann mehrfach sterben)
function graveKeys(list) {
  const seen = new Map();
  return list.map(g => {
    const k = g.name + '|' + (g.linkId ?? '');
    const n = (seen.get(k) || 0) + 1;
    seen.set(k, n);
    return k + '#' + n;
  });
}

function mergeGraves(base = [], local = [], server = []) {
  const kb = graveKeys(base), kl = graveKeys(local), ks = graveKeys(server);
  const B = new Map(kb.map((k, i) => [k, base[i]]));
  const L = new Map(kl.map((k, i) => [k, local[i]]));
  const S = new Set(ks);
  const out = [];
  server.forEach((g, i) => {
    const k = ks[i];
    if (B.has(k) && !L.has(k)) return;                                   // hier entfernt
    const mine = L.get(k);
    const changedHere = mine && B.has(k) && mine.killedBy !== B.get(k).killedBy;
    out.push(changedHere ? mine : g);
  });
  local.forEach((g, i) => { if (!B.has(kl[i]) && !S.has(kl[i])) out.push(g); });   // hier neu
  return out;
}

// base = letzter gemeinsamer Stand, local = eigener Stand, server = Stand aus der Datenbank (alle geprüft).
// Ohne bekannten Ausgangsstand lässt sich nicht sagen, was hier geändert wurde – dann gilt die Datenbank
// (lieber eine eigene Änderung verlieren als den ganzen Stand des Partners überschreiben).
export function mergeSharedState(base, local, server) {
  const b = base || local;
  return {
    team1: mergeSlots(b.team1, local.team1, server.team1, TEAM_SIZE),
    team2: mergeSlots(b.team2, local.team2, server.team2, TEAM_SIZE),
    box1: mergeSlots(b.box1, local.box1, server.box1, BOX_SIZE),
    box2: mergeSlots(b.box2, local.box2, server.box2, BOX_SIZE),
    linkedTeam: mergeIndexes(b.linkedTeam, local.linkedTeam, server.linkedTeam),
    linkedBox: mergeIndexes(b.linkedBox, local.linkedBox, server.linkedBox),
    graves1: mergeGraves(b.graves1, local.graves1, server.graves1),
    graves2: mergeGraves(b.graves2, local.graves2, server.graves2),
  };
}
