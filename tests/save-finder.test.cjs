// Save-Editor „Spielstand suchen lassen“: find-saves.js findet Spielstände tief im Emulator-Ordner
const test = require('node:test');
const assert = require('node:assert/strict');
const SaveFinder = require('../SaveEditor/find-saves.js');

// Nachgebaute Ordner-Griffe: { name: Uint8Array | { … } }
const file = (bytes, modified) => ({ kind: 'file', getFile: async () => ({ size: bytes.length, lastModified: modified || 0, arrayBuffer: async () => bytes.buffer }) });
function dir(tree, seen) {
  return { kind: 'directory', entries: async function* () {
    if (seen) seen.push(tree);
    for (const [name, v] of Object.entries(tree)) yield [name, v instanceof Uint8Array ? file(v, v.modified) : v.kind ? v : dir(v, seen)];
  } };
}
const save = (tag, modified) => Object.assign(new Uint8Array(483328).fill(tag), { modified });
const check = b => (b[0] === 7 || b[0] === 8 ? { tag: b[0] } : null);

test('findet „main“ zehn Ordner tief im Ordner von Azahar', async () => {
  const azahar = { config: { 'qt-config.ini': new Uint8Array(100) }, shaders: { main: save(7) },
    sdmc: { 'Nintendo 3DS': { '00000000000000000000000000000000': { '00000000000000000000000000000000': { title: { '00040000': {
      '0011c400': { data: { '00000001': { main: save(7, 5) }, '00000001.metadata': new Uint8Array(16) } },
      '00055d00': { data: { '00000001': { main: save(1) } } } } } } } } } };
  const r = await SaveFinder.find(dir(azahar), { check });
  assert.equal(r.list.length, 1);
  assert.equal(r.list[0].path, 'sdmc/Nintendo 3DS/00000000000000000000000000000000/00000000000000000000000000000000/title/00040000/0011c400/data/00000001/main');
  assert.deepEqual(r.list[0].info, { tag: 7 });
  assert.equal(r.stopped, false);
});

test('mehrere Spielstände: der zuletzt geänderte zuerst; nur passende Namen und Größen werden gelesen', async () => {
  let read = 0;
  const games = { Platin: { 'Platin.sav': save(8, 10), 'Platin.nds': save(8), 'klein.sav': new Uint8Array(100).fill(8) },
    'Omega Rubin': { Spielstand: { data: { '00000001': { main: save(7, 20) } } } }, DeSmuME: { Battery: { 'Platin.dsv': save(8, 30) } } };
  const r = await SaveFinder.find(dir(games), { check: b => { read++; return check(b); } });
  assert.deepEqual(r.list.map(x => x.name), ['Platin.dsv', 'main', 'Platin.sav']);
  assert.equal(read, 3);
});

test('riesige Ordner: die Suche hört auf und sagt das', async () => {
  const many = {}; for (let i = 0; i < 50; i++) many['spiel' + i] = { a: {}, b: {} };
  const r = await SaveFinder.find(dir(many), { check, maxDirs: 20 });
  assert.equal(r.stopped, true);
  assert.ok(r.dirs <= 20);
});

test('Ordner ohne Spielstände (Shader, Cache …) werden gar nicht geöffnet, Speicherordner zuerst', async () => {
  const seen = [], shaders = { x: {} }, sdmc = { y: {} }, aaa = {};
  await SaveFinder.find(dir({ aaa, shaders, cache: {}, sdmc }, seen), { check });
  assert.ok(!seen.includes(shaders));
  assert.ok(seen.indexOf(sdmc) < seen.indexOf(aaa));
});
