/*
 * Liest Texte aus einer Gen-4-DS-ROM (Diamant/Perl/Platin/HeartGold/SoulSilver): Dateisystem (FNT/FAT),
 * NARC-Archive und die verschlüsselten Textbanken – inklusive der komprimierten Trainernamen (9 Bit je Zeichen).
 * Die Zeichentabelle kommt aus dem pret-Checkout (tools/msgenc/charmap.txt).
 *
 *   const rom = openRom('<spiel>.nds');
 *   const texts = textBanks(rom, 'a/0/2/7', '<pokeheartgold>/tools/msgenc/charmap.txt');
 *   texts(279)  // → ['Mysteriöser Ort', 'Zweiblattdorf', …]
 */
'use strict';
const fs = require('fs');

function openRom(file) {
  const rom = fs.readFileSync(file);
  const u16 = o => rom.readUInt16LE(o), u32 = o => rom.readUInt32LE(o);
  const fntOff = u32(0x40), fatOff = u32(0x48);
  const ids = new Map();
  (function walk(dir, prefix, depth) {
    if (depth > 16) return;
    const e = fntOff + (dir & 0xFFF) * 8;
    let o = fntOff + u32(e), fid = u16(e + 4);
    for (;;) {
      const len = rom[o++];
      if (!len) break;
      const name = rom.toString('latin1', o, o + (len & 0x7F)); o += len & 0x7F;
      if (len & 0x80) { const sub = u16(o); o += 2; walk(sub, prefix + name + '/', depth + 1); }
      else ids.set(prefix + name, fid++);
    }
  })(0xF000, '', 0);
  return {
    code: rom.toString('latin1', 0xC, 0x10),
    file(p) {
      const id = ids.get(p);
      if (id == null) throw new Error('Datei fehlt in der ROM: ' + p);
      return rom.subarray(u32(fatOff + id * 8), u32(fatOff + id * 8 + 4));
    },
  };
}

function narc(b) {
  if (b.toString('latin1', 0, 4) !== 'NARC') throw new Error('kein NARC');
  let off = 16;
  const btaf = b.readUInt32LE(off + 4), n = b.readUInt16LE(off + 8), list = [];
  for (let i = 0; i < n; i++) list.push([b.readUInt32LE(off + 12 + i * 8), b.readUInt32LE(off + 16 + i * 8)]);
  off += btaf; off += b.readUInt32LE(off + 4);
  const data = off + 8;
  return list.map(([s, e]) => b.subarray(data + s, data + e));
}

function loadCharmap(file) {
  const chars = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^\s*([0-9A-F]{4})=(.*)$/.exec(line.replace(/\s*\/\/.*$/, ''));
    if (m && !m[2].startsWith('{')) chars.set(parseInt(m[1], 16), m[2]);
  }
  return chars;
}

// Eine Textbank entschlüsseln (Schlüssel aus dem Dateikopf, je Eintrag fortlaufend)
function decodeBank(b, chars) {
  const n = b.readUInt16LE(0), seed = b.readUInt16LE(2), out = [];
  for (let i = 0; i < n; i++) {
    const k = Math.imul(Math.imul(seed, 0x2FD) & 0xFFFF, i + 1) & 0xFFFF, key = (k | (k << 16)) >>> 0;
    const off = (b.readUInt32LE(4 + i * 8) ^ key) >>> 0, len = (b.readUInt32LE(8 + i * 8) ^ key) >>> 0;
    let ck = Math.imul(0x91BD3, i + 1) & 0xFFFF;
    const codes = [];
    for (let j = 0; j < len && off + j * 2 + 1 < b.length; j++) { codes.push(b.readUInt16LE(off + j * 2) ^ ck); ck = (ck + 0x493D) & 0xFFFF; }
    let s = '';
    for (let j = 0; j < codes.length; j++) {
      const c = codes[j];
      if (c === 0xFFFF) break;
      if (c === 0xE000) { s += '\n'; continue; }
      if (c === 0xFFFE) { j += 1 + (codes[j + 2] || 0) + 1; continue; } // Befehl mit Argumenten überspringen
      if (c === 0xF100) { // Trainernamen: 15 nutzbare Bit je Wort, 9 Bit je Zeichen
        let cont = 0, bit = 0;
        outer: for (let q = j + 1; q < codes.length; q++) {
          cont |= (codes[q] & 0x7FFF) << bit; bit += 15;
          while (bit >= 9) { const v = cont & 0x1FF; cont >>>= 9; bit -= 9; if (v === 0x1FF) break outer; s += chars.get(v) ?? ''; }
        }
        break;
      }
      s += chars.get(c) ?? '';
    }
    out.push(s);
  }
  return out;
}

function textBanks(rom, path, charmapFile) {
  const banks = narc(rom.file(path)), chars = loadCharmap(charmapFile), cache = new Map();
  return bank => {
    if (!cache.has(bank)) cache.set(bank, decodeBank(banks[bank], chars));
    return cache.get(bank);
  };
}

module.exports = { openRom, narc, loadCharmap, decodeBank, textBanks };
