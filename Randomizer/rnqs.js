/*
 * Einstellungsdateien (.rnqs) des Universal Pokémon Randomizer ZX 4.6.1 lesen und schreiben.
 *
 * Aufbau laut Settings.java: 4 Byte Version (322) + 4 Byte Länge, danach ein Base64-Text.
 * Der Text enthält dekodiert: 51 Byte Einstellungen, 1 Byte Länge + ROM-Name, CRC32 über alles
 * davor und 4 Byte Prüfsumme der Namensliste (bleibt unverändert).
 * Die Einstellungen selbst sind einzelne Bits und kleine Zahlen in festen Bytes – welche wo liegt,
 * beschreibt options.js mit den Feldarten unten.
 */
(function () {
  'use strict';

  const VERSION = 322;
  const LEN = 51;

  let table = null;
  function crc32(bytes, end) {
    if (!table) {
      table = new Uint32Array(256);
      for (let n = 0; n < 256; n++) {
        let c = n;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1;
        table[n] = c >>> 0;
      }
    }
    let c = 0xFFFFFFFF;
    for (let i = 0; i < end; i++) c = table[(c ^ bytes[i]) & 0xFF] ^ (c >>> 8);
    return (c ^ 0xFFFFFFFF) >>> 0;
  }
  const readU32 = (d, o) => ((d[o] << 24) | (d[o + 1] << 16) | (d[o + 2] << 8) | d[o + 3]) >>> 0;
  function writeU32(d, o, v) {
    d[o] = v >>> 24; d[o + 1] = (v >>> 16) & 0xFF; d[o + 2] = (v >>> 8) & 0xFF; d[o + 3] = v & 0xFF;
  }

  // Datei → Einstellungs-Bytes. Fehler: 'version' (andere Randomizer-Version) oder 'format'
  function parse(file) {
    if (!file || file.length < 8) throw new Error('format');
    const version = readU32(file, 0) | 0, len = readU32(file, 4) | 0;
    if (version !== VERSION) throw new Error('version');
    if (len <= 0 || 8 + len > file.length) throw new Error('format');
    let bin;
    try { bin = atob(String.fromCharCode.apply(null, file.subarray(8, 8 + len))); } catch (e) { throw new Error('format'); }
    const data = Uint8Array.from(bin, c => c.charCodeAt(0));
    if (data.length < LEN + 9 || data.length !== LEN + 9 + data[LEN]) throw new Error('format');
    if (crc32(data, data.length - 8) !== readU32(data, data.length - 8)) throw new Error('format');
    return data;
  }

  // Einstellungs-Bytes → Datei (mit neuer Prüfsumme)
  function build(data) {
    const d = data.slice();
    writeU32(d, d.length - 8, crc32(d, d.length - 8));
    let bin = '';
    d.forEach(b => { bin += String.fromCharCode(b); });
    const text = btoa(bin);
    const file = new Uint8Array(8 + text.length);
    writeU32(file, 0, VERSION);
    writeU32(file, 4, text.length);
    for (let i = 0; i < text.length; i++) file[8 + i] = text.charCodeAt(i);
    return file;
  }

  /*
   * Feldarten:
   *   bit  { b, i }               ein Häkchen: Bit i in Byte b
   *   one  { bits, values }       Auswahl wie Radio-Knöpfe: genau eins der Bits [Byte, Bit] ist gesetzt,
   *                               keins gesetzt = erster Wert (so liest es auch der Randomizer)
   *   num  { b, mask, shift, add } kleine Zahl in einem Teil von Byte b
   *   u16  { b }                  Zahl in zwei Bytes (niedriges zuerst)
   */
  const bit = (b, i) => ({ t: 'bit', b: b, i: i });
  const one = (values, bits) => ({ t: 'one', values: values, bits: bits });
  const num = (b, mask, shift, add) => ({ t: 'num', b: b, mask: mask, shift: shift || 0, add: add || 0 });
  const u16 = b => ({ t: 'u16', b: b });

  function get(d, f) {
    switch (f.t) {
      case 'bit': return ((d[f.b] >> f.i) & 1) === 1;
      case 'one': return f.values[Math.max(0, f.bits.findIndex(p => (d[p[0]] >> p[1]) & 1))];
      case 'num': return ((d[f.b] & f.mask) >> f.shift) + f.add;
      case 'u16': return d[f.b] | (d[f.b + 1] << 8);
    }
    return undefined;
  }
  function set(d, f, v) {
    switch (f.t) {
      case 'bit':
        d[f.b] = v ? d[f.b] | (1 << f.i) : d[f.b] & ~(1 << f.i);
        break;
      case 'one': {
        const k = f.values.indexOf(v);
        f.bits.forEach((p, i) => { d[p[0]] = i === k ? d[p[0]] | (1 << p[1]) : d[p[0]] & ~(1 << p[1]); });
        break;
      }
      case 'num':
        d[f.b] = (d[f.b] & ~f.mask) | (((v - f.add) << f.shift) & f.mask);
        break;
      case 'u16':
        d[f.b] = v & 0xFF; d[f.b + 1] = (v >> 8) & 0xFF;
        break;
    }
  }

  window.Rnqs = { VERSION: VERSION, parse: parse, build: build, get: get, set: set, bit: bit, one: one, num: num, u16: u16 };
})();
