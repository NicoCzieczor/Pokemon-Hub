// Randomizer, Omega Rubin / Alpha Saphir: ganzes Spiel (.cxi) aus ROM + Mod (Randomizer/cxi-build.js). Die ROM wird hier
// künstlich gebaut (NCCH mit ExeFS und RomFS, wie 3dbrew sie beschreibt) und das Ergebnis mit Bosse/oras-rom.js gelesen.
// Ausführen: node --test "tests/*.test.*"
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const CxiBuild = require('../Randomizer/cxi-build.js');
const OrasRom = require('../Bosse/oras-rom.js');

const put32 = (b, o, v) => b.writeUInt32LE(v >>> 0, o);
const utf16 = s => { const b = Buffer.alloc(Math.ceil(s.length * 2 / 4) * 4); for (let i = 0; i < s.length; i++) b.writeUInt16LE(s.charCodeAt(i), i * 2); return b; };
const sha = b => crypto.createHash('sha256').update(b).digest();

// Mini-Spiel: .code (komprimiert markiert), icon; RomFS mit top.bin und a/x.bin
function makeNcch() {
  const code = Buffer.from('ALTER-CODE-16BYT'), icon = Buffer.from('ICONDATA'), top = Buffer.from('HALLO'), x = Buffer.from('ALT-XYZ');
  // RomFS Ebene 3: Kopf, Tabellen, Daten
  const dirMeta = Buffer.alloc(0x18 + 0x1C);
  [[0, 0], [4, 0xFFFFFFFF], [8, 0x18], [12, 0], [16, 0xFFFFFFFF], [20, 0]].forEach(([o, v]) => put32(dirMeta, o, v));                     // Wurzel
  [[0x18, 0], [0x1C, 0xFFFFFFFF], [0x20, 0xFFFFFFFF], [0x24, 0x30], [0x28, 0xFFFFFFFF], [0x2C, 2]].forEach(([o, v]) => put32(dirMeta, o, v)); // „a“
  utf16('a').copy(dirMeta, 0x30);
  const fileMeta = Buffer.alloc(0x30 + 0x2C);
  const fileEntry = (at, parent, off, size, name) => {
    [[0, parent], [4, 0xFFFFFFFF], [8, off], [12, 0], [16, size], [20, 0], [24, 0xFFFFFFFF], [28, name.length * 2]].forEach(([o, v]) => put32(fileMeta, at + o, v));
    utf16(name).copy(fileMeta, at + 0x20);
  };
  fileEntry(0, 0, 0, top.length, 'top.bin');
  fileEntry(0x30, 0x18, 0x10, x.length, 'x.bin');
  const tables = [Buffer.alloc(4), dirMeta, Buffer.alloc(4), fileMeta];
  let o = 0x28; const offs = tables.map(t => { const a = o; o += t.length; return a; });
  const dataOff = Math.ceil(o / 16) * 16;
  const l3hdr = Buffer.alloc(0x28);
  [0x28, offs[0], 4, offs[1], dirMeta.length, offs[2], 4, offs[3], fileMeta.length, dataOff].forEach((v, i) => put32(l3hdr, i * 4, v));
  const data = Buffer.alloc(0x10 + x.length); top.copy(data, 0); x.copy(data, 0x10);
  const l3 = Buffer.concat([l3hdr, ...tables, Buffer.alloc(dataOff - o), data]);
  const ivfc = Buffer.alloc(0x1000);
  ivfc.write('IVFC', 0, 'latin1'); put32(ivfc, 4, 0x10000); put32(ivfc, 8, 0x20);
  [[0, 0x20], [0x1000, 0x20], [0x2000, l3.length]].forEach(([off, size], i) => { put32(ivfc, 0x0C + i * 0x18, off); put32(ivfc, 0x14 + i * 0x18, size); put32(ivfc, 0x1C + i * 0x18, 12); });
  put32(ivfc, 0x54, 0x5C);
  const romfs = Buffer.concat([ivfc, l3, Buffer.alloc(0x1000 - l3.length % 0x1000), Buffer.alloc(0x2000)]);
  // ExeFS
  const exHead = Buffer.alloc(0x200);
  exHead.write('.code', 0, 'latin1'); put32(exHead, 8, 0); put32(exHead, 12, code.length);
  exHead.write('icon', 16, 'latin1'); put32(exHead, 24, 0x200); put32(exHead, 28, icon.length);
  const exefs = Buffer.concat([exHead, code, Buffer.alloc(0x200 - code.length), icon, Buffer.alloc(0x200 - icon.length)]);
  // Kopf, Exheader
  const H = Buffer.alloc(0x200), EX = Buffer.alloc(0x800);
  EX[0x0D] = 1;                                               // .code komprimiert
  H.write('NCCH', 0x100, 'latin1');
  H.writeBigUInt64LE(0x000400000011C400n, 0x118);             // Omega Rubin
  put32(H, 0x180, 0x400); H[0x18F] = 4;                       // NoCrypto
  const exefsAt = 0xA00, romfsAt = 0x1000;
  put32(H, 0x1A0, exefsAt / 0x200); put32(H, 0x1A4, exefs.length / 0x200); put32(H, 0x1A8, 1);
  put32(H, 0x1B0, romfsAt / 0x200); put32(H, 0x1B4, romfs.length / 0x200); put32(H, 0x1B8, 1);
  const ncch = Buffer.concat([H, EX, exefs, Buffer.alloc(romfsAt - exefsAt - exefs.length), romfs]);
  put32(ncch, 0x104, ncch.length / 0x200);
  return { ncch, code, icon, top, x };
}
const reader = buf => (s, e) => Promise.resolve(new Uint8Array(buf.subarray(s, e)));
async function assemble(buf, plan) {
  const out = Buffer.concat(plan.parts.map(p => (p instanceof Uint8Array ? Buffer.from(p) : buf.subarray(p.start, p.end))));
  assert.equal(out.length, plan.size);
  return out;
}

test('cxi-build: Mod-Dateien und code.bin landen im Spiel, der Rest bleibt', async () => {
  const g = makeNcch(), newCode = Buffer.from('NEUER-CODE-ENTPACKT-UND-LAENGER!'), newX = Buffer.alloc(5000, 7);
  const out = await assemble(g.ncch, await CxiBuild.build(reader(g.ncch), { code: new Uint8Array(newCode), files: { 'a/x.bin': new Uint8Array(newX) } }));
  // Kopf: Größe, Hashes, Exheader „entpackt“
  assert.equal(out.readUInt32LE(0x104) * 0x200, out.length);
  assert.equal(out[0x200 + 0x0D] & 1, 0);
  assert.deepEqual(out.subarray(0x160, 0x180), sha(out.subarray(0x200, 0x600)));
  const exAt = out.readUInt32LE(0x1A0) * 0x200, eh = out.subarray(exAt, exAt + 0x200);
  assert.deepEqual(out.subarray(0x1C0, 0x1E0), sha(eh));
  assert.equal(eh.toString('latin1', 0, 5), '.code');
  assert.deepEqual(out.subarray(exAt + 0x200, exAt + 0x200 + eh.readUInt32LE(12)), newCode);
  assert.deepEqual(eh.subarray(0xC0 + 9 * 0x20, 0xE0 + 9 * 0x20), sha(newCode));
  assert.deepEqual(out.subarray(exAt + 0x200 + eh.readUInt32LE(24), exAt + 0x200 + eh.readUInt32LE(24) + eh.readUInt32LE(28)), g.icon);
  // RomFS wie der Hub (und Citra: Ebene 3 bei + 0x1000) sie liest
  const romfsAt = out.readUInt32LE(0x1B0) * 0x200;
  assert.equal(out.toString('latin1', romfsAt, romfsAt + 4), 'IVFC');
  assert.equal(out.readUInt32LE(romfsAt + 0x1000), 0x28);
  const rom = await OrasRom.openRom(reader(out));
  assert.equal(rom.game, 'or');
  assert.deepEqual(Buffer.from(await rom.file('top.bin')), g.top);
  assert.deepEqual(Buffer.from(await rom.file('a/x.bin')), newX);
});

test('cxi-build: .3ds (NCSD) – es wird die Spiel-Partition gebaut', async () => {
  const g = makeNcch(), ncsd = Buffer.alloc(0x4000);
  ncsd.write('NCSD', 0x100, 'latin1'); put32(ncsd, 0x120, 0x4000 / 0x200); put32(ncsd, 0x124, g.ncch.length / 0x200);
  const cart = Buffer.concat([ncsd, g.ncch]);
  const out = await assemble(cart, await CxiBuild.build(reader(cart), { files: { 'top.bin': new Uint8Array(Buffer.from('NEU')) } }));
  assert.equal(out.toString('latin1', 0x100, 0x104), 'NCCH');
  assert.equal(out[0x200 + 0x0D] & 1, 1);                    // ohne neues code.bin bleibt .code wie es war
  const rom = await OrasRom.openRom(reader(out));
  assert.equal(Buffer.from(await rom.file('top.bin')).toString(), 'NEU');
  assert.deepEqual(Buffer.from(await rom.file('a/x.bin')), g.x);
});

test('cxi-build: unbekannte Datei im Mod und verschlüsselte ROM werden abgelehnt', async () => {
  const g = makeNcch();
  await assert.rejects(CxiBuild.build(reader(g.ncch), { files: { 'gibts/nicht.bin': new Uint8Array(1) } }), /newFile:gibts\/nicht\.bin/);
  const enc = Buffer.from(g.ncch); enc[0x18F] = 0;
  await assert.rejects(CxiBuild.build(reader(enc), {}), /encrypted/);
});
