/*
 * Texte aus GBA-ROMs der 3. Generation (Feuerrot/Blattgrün, Rubin/Saphir/Smaragd) lesen.
 * Zeichentabelle: charmap.txt aus pret/pokefirered bzw. pokeemerald. 0xFF beendet einen Text.
 * Die Namenstabellen (Items, Attacken, Trainerklassen, Trainer, Ortsnamen) werden über ihren Inhalt gefunden,
 * nicht über feste Adressen – so klappt es mit jeder Sprachfassung.
 */
'use strict';
const fs = require('fs');

function loadCharmap(file) {
  const dec = new Map(), enc = new Map();
  for (const line of fs.readFileSync(file, 'utf8').split(/\r?\n/)) {
    const m = /^'(.|\\')'\s*=\s*([0-9A-F]{2})\s*(?:@.*)?$/.exec(line);
    if (!m) continue;
    const ch = m[1] === "\\'" ? "'" : m[1], code = parseInt(m[2], 16);
    if (!dec.has(code)) dec.set(code, ch);
    if (!enc.has(ch)) enc.set(ch, code);
  }
  dec.set(0x00, ' ');
  dec.set(0x53, 'PK'); dec.set(0x54, 'MN');   // {PKMN} – zwei Zeichen im Spiel
  return { dec, enc };
}

function makeText(rom, charmap) {
  const decode = (o, max = 64) => {
    let s = '';
    for (let i = 0; i < max && o + i < rom.length; i++) {
      const b = rom[o + i];
      if (b === 0xff) break;
      if (b === 0xfc || b === 0xfd) { i++; continue; }   // Steuerzeichen und Platzhalter
      s += charmap.dec.get(b) ?? '';
    }
    return s;
  };
  const encode = s => Buffer.from([...s].map(ch => {
    const c = charmap.enc.get(ch);
    if (c == null) throw new Error(`Zeichen ${ch} nicht in der Zeichentabelle`);
    return c;
  }));
  // Alle Fundstellen eines Textes (mit Endzeichen)
  const findAll = s => {
    const needle = Buffer.concat([encode(s), Buffer.from([0xff])]), out = [];
    for (let at = rom.indexOf(needle); at >= 0; at = rom.indexOf(needle, at + 1)) out.push(at);
    return out;
  };
  // Tabelle fester Breite: erste Fundstelle von first, hinter der im Abstand stride second steht
  const table = (first, second, stride) => {
    const b = encode(second);
    return findAll(first).find(at => rom.subarray(at + stride, at + stride + b.length).equals(b) && rom[at + stride + b.length] === 0xff) ?? -1;
  };
  // Zeiger auf eine Stelle (GBA-Adresse 0x08……)
  const pointersTo = off => {
    const v = Buffer.alloc(4); v.writeUInt32LE(0x08000000 + off);
    const out = [];
    for (let at = rom.indexOf(v); at >= 0; at = rom.indexOf(v, at + 1)) if (at % 4 === 0) out.push(at);
    return out;
  };
  const ptr = o => { const p = rom.readUInt32LE(o) - 0x08000000; return p >= 0 && p < rom.length ? p : -1; };
  return { decode, encode, findAll, table, pointersTo, ptr };
}

module.exports = { loadCharmap, makeText };
