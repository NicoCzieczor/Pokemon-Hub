/*
 * oras-rom.js – liest Spieldaten aus Pokémon Omega Rubin / Alpha Saphir (3DS), im Browser und in Node.
 *
 * Gegenstück zu rando.js (Platin): Trainer, wilde Pokémon, Basiswerte, Attacken, Texte und Starter – aus der
 * Original-ROM (für die Build-Skripte) oder aus einer randomisierten (Boss-Planer, Karte, Run-Dashboard, Duo).
 * Gelesen werden nur die nötigen Dateien (ein paar MB), nie die ganze ROM (rund 2 GB).
 *
 * Quellen, die open() versteht:
 *   - entschlüsselte ROM als .3ds/.cci (NCSD) oder .cxi (NCCH) – wie sie Citra und der Randomizer nutzen
 *   - ein LayeredFS-Ordner (Mod-Ordner von Citra / Ausgabe „-d“ des Randomizers): Dateien mit Pfad …/romfs/a/0/3/6
 *
 * Aufbau (nach 3dbrew, pk3DS und dem Universal Pokémon Randomizer ZX, config/gen6_offsets.ini):
 *   NCSD → Partition 0 = NCCH → RomFS (IVFC, Ebene 3: Verzeichnis- und Dateitabellen) → Dateien wie „a/0/3/6“.
 *   Die Dateien sind GARC-Archive (CRAG: FATO, FATB, FIMB). Texte sind mit einem fortlaufenden XOR-Schlüssel
 *   verschlüsselt (Startwert 0x7C89, je Zeile +0x2983, je Zeichen um 3 Bit rotiert).
 *
 * Omega Rubin und Alpha Saphir unterscheiden sich nur bei den wilden Pokémon, dem Pokédex-Lebensraum und einigen
 * Programmteilen (CRO); Trainer, Texte, Attacken und Basiswerte sind gleich.
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OrasRom = api;
})(this, function () {
  'use strict';

  var SELF_URL = typeof document !== 'undefined' && document.currentScript ? document.currentScript.src : null;

  var TITLES = { '000400000011c400': 'or', '000400000011c500': 'as' };
  var FILES = {
    wild: 'a/0/1/3', trdata: 'a/0/3/6', trpoke: 'a/0/3/8', textEn: 'a/0/7/3', textDe: 'a/0/7/6',
    moves: 'a/1/8/9', learnsets: 'a/1/9/1', megas: 'a/1/9/3', personal: 'a/1/9/5', field: 'DllField.cro'
  };
  // Nummern der Textdateien im Text-GARC
  var TEXT = { moves: 14, trainerClasses: 21, trainerNames: 22, abilities: 37, maps: 90, species: 98, items: 114 };
  var GIFT_OFFSET = 0xF906C, GIFT_SIZE = 0x24;   // Geschenk-Pokémon in DllField.cro, die ersten drei = Starter
  var PERSONAL_SIZE = 0x50;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function magic(b, o) { return String.fromCharCode(b[o], b[o + 1], b[o + 2], b[o + 3]); }
  function fail(msg) { return new Error(msg); }

  // Grenzen gegen kaputte oder manipulierte Dateien
  var MAX_FILE = 64 * 1024 * 1024, MAX_ENTRIES = 100000;

  /* ── RomFS ─────────────────────────────────────────────────────── */
  // read(start, end) → Promise<Uint8Array>. Ergebnis: { game: 'or'|'as'|null, titleId, file(path) → Promise }
  function openRom(read) {
    return read(0, 0x200).then(function (h) {
      if (h.length < 0x200) throw fail('notRom');
      if (magic(h, 0x100) === 'NCSD') {
        var at = u32(h, 0x120) * 0x200;
        return read(at, at + 0x200).then(function (n) { return openNcch(read, at, n); });
      }
      return openNcch(read, 0, h);
    });
  }

  function openNcch(read, base, h) {
    if (magic(h, 0x100) !== 'NCCH') throw fail('notRom');
    if (!(h[0x18F] & 4)) throw fail('encrypted');                // NoCrypto-Bit: Citra-/Randomizer-ROMs sind entschlüsselt
    var tid = '';
    for (var i = 7; i >= 0; i--) tid += (h[0x118 + i] < 16 ? '0' : '') + h[0x118 + i].toString(16);
    var romfs = base + u32(h, 0x1B0) * 0x200;
    if (!u32(h, 0x1B4)) throw fail('notRom');
    return read(romfs, romfs + 0x60).then(function (iv) {
      if (magic(iv, 0) !== 'IVFC') throw fail('notRom');
      var bs = Math.pow(2, u32(iv, 0x4C));
      var l3 = romfs + Math.ceil((0x60 + u32(iv, 8)) / bs) * bs;
      return read(l3, l3 + 0x28).then(function (hd) {
        var dOff = u32(hd, 0x0C), dLen = u32(hd, 0x10), fOff = u32(hd, 0x1C), fLen = u32(hd, 0x20), data = l3 + u32(hd, 0x24);
        if (dLen > MAX_FILE || fLen > MAX_FILE) throw fail('notRom');
        return Promise.all([read(l3 + dOff, l3 + dOff + dLen), read(l3 + fOff, l3 + fOff + fLen)]).then(function (m) {
          var files = romfsTree(m[0], m[1]);
          return {
            game: TITLES[tid] || null,
            titleId: tid.toUpperCase(),
            has: function (path) { return !!files[path]; },
            file: function (path) {
              var f = files[path];
              if (!f) return Promise.reject(fail('Datei fehlt: ' + path));
              if (f.size > MAX_FILE) return Promise.reject(fail('zu groß: ' + path));
              return read(data + f.off, data + f.off + f.size);
            }
          };
        });
      });
    });
  }

  // Verzeichnisbaum der RomFS-Ebene 3 → { 'a/0/3/6': { off, size }, … }
  function romfsTree(dmeta, fmeta) {
    var files = {}, budget = MAX_ENTRIES;
    var name = function (b, o, n) { var s = ''; for (var i = 0; i < n; i += 2) s += String.fromCharCode(u16(b, o + i)); return s; };
    (function walk(off, path, depth) {
      if (depth > 32 || off + 24 > dmeta.length) return;
      var nl = u32(dmeta, off + 20);
      var here = off ? path + name(dmeta, off + 24, nl) + '/' : '';
      for (var fo = u32(dmeta, off + 12); fo !== 0xFFFFFFFF && fo + 32 <= fmeta.length; fo = u32(fmeta, fo + 4)) {
        if (--budget < 0) throw fail('notRom');
        // Datenposition und Größe sind u64; ROMs sind < 4 GB, die oberen Hälften also 0
        files[here + name(fmeta, fo + 32, u32(fmeta, fo + 28))] = { off: u32(fmeta, fo + 8) + u32(fmeta, fo + 12) * 4294967296, size: u32(fmeta, fo + 16) };
      }
      for (var c = u32(dmeta, off + 8); c !== 0xFFFFFFFF; c = u32(dmeta, c + 4)) {
        if (--budget < 0) throw fail('notRom');
        walk(c, here, depth + 1);
      }
    })(0, '', 0);
    return files;
  }

  // LayeredFS-Ordner (Dateiliste aus <input webkitdirectory> oder Node): Pfade ab „romfs/“.
  // entries: [{ path: 'xyz/romfs/a/0/3/6', read: () → Promise<Uint8Array> }]
  function openLayered(entries) {
    var files = {}, tid = null;
    entries.forEach(function (e) {
      var p = String(e.path).replace(/\\/g, '/');
      var m = /(?:^|\/)romfs\/(.+)$/.exec(p);
      if (m) files[m[1]] = e;
      var t = /(?:^|\/)(00040000[0-9a-fA-F]{8})(?:\/|$)/.exec(p);
      if (t) tid = t[1].toLowerCase();
    });
    if (!Object.keys(files).length) throw fail('notLayered');
    return {
      game: (tid && TITLES[tid]) || null,
      titleId: tid ? tid.toUpperCase() : null,
      layered: true,
      has: function (path) { return !!files[path]; },
      file: function (path) {
        var f = files[path];
        return f ? f.read() : Promise.reject(fail('Datei fehlt: ' + path));
      }
    };
  }

  /* ── GARC ──────────────────────────────────────────────────────── */
  // LZ11 (Kennung 0x11, Größe u24 bzw. u32): Flag-Byte, je Bit ein Literal oder ein Rückverweis (Länge, Abstand)
  function lz11(b) {
    if (b.length < 4 || b[0] !== 0x11) return null;
    var size = b[1] | (b[2] << 8) | (b[3] << 16), i = 4;
    if (!size) { size = u32(b, 4); i = 8; }
    if (size > MAX_FILE) return null;
    var out = new Uint8Array(size), o = 0;
    while (o < size) {
      if (i >= b.length) return null;
      var flags = b[i++];
      for (var bit = 0; bit < 8 && o < size; bit++, flags <<= 1) {
        if (!(flags & 0x80)) { if (i >= b.length) return null; out[o++] = b[i++]; continue; }
        if (i + 1 >= b.length) return null;
        var b1 = b[i], ind = b1 >> 4, len, disp;
        if (ind === 0) { len = (((b1 & 15) << 4) | (b[i + 1] >> 4)) + 0x11; disp = (((b[i + 1] & 15) << 8) | b[i + 2]) + 1; i += 3; }
        else if (ind === 1) { len = (((b1 & 15) << 12) | (b[i + 1] << 4) | (b[i + 2] >> 4)) + 0x111; disp = (((b[i + 2] & 15) << 8) | b[i + 3]) + 1; i += 4; }
        else { len = ind + 1; disp = (((b1 & 15) << 8) | b[i + 1]) + 1; i += 2; }
        if (disp > o) return null;
        for (var k = 0; k < len && o < size; k++, o++) out[o] = out[o - disp];
      }
    }
    return out;
  }

  // → Liste der Dateien (je die erste Unterdatei; Gen-6-Daten haben nur eine). unpack: LZ11-Dateien entpacken
  function garc(b, unpack) {
    if (b.length < 0x1C || magic(b, 0) !== 'CRAG') throw fail('kein GARC');
    var o = u32(b, 4), data = u32(b, 0x10);
    if (magic(b, o) !== 'OTAF') throw fail('kein GARC');
    var n = u16(b, o + 8), fatb = o + u32(b, o + 4);
    if (fatb + 12 > b.length || magic(b, fatb) !== 'BTAF' || 12 + n * 4 > u32(b, o + 4)) throw fail('kein GARC');
    var out = [];
    for (var i = 0; i < n; i++) {
      var e = fatb + 12 + u32(b, o + 12 + i * 4);
      if (e + 4 > b.length) throw fail('kein GARC');
      var vec = u32(b, e), file = new Uint8Array(0);
      if (vec) {
        var s = u32(b, e + 4), t = u32(b, e + 8);
        if (s > t || data + t > b.length) throw fail('kein GARC');
        file = b.subarray(data + s, data + t);
        if (unpack && file[0] === 0x11) file = lz11(file) || file;
      }
      out.push(file);
    }
    return out;
  }

  /* ── Texte ─────────────────────────────────────────────────────── */
  var SPECIAL = { 0xE08D: '…', 0xE08E: '♂', 0xE08F: '♀', 0xE0A6: 'ᵉʳ', 0xE0A7: 'ʳᵉ', 0xE0A8: 'ʳ' };
  function textFile(b) {
    if (b.length < 0x14) return [];
    var lines = u16(b, 2), sdo = u32(b, 0x0C), key = 0x7C89, out = [];
    for (var i = 0; i < lines; i++) {
      var lo = sdo + 4 + i * 8;
      if (lo + 6 > b.length) break;
      var off = sdo + u32(b, lo), len = u16(b, lo + 4), k = key, s = '';
      for (var j = 0; j < len && off + j * 2 + 1 < b.length; j++) {
        var c = u16(b, off + j * 2) ^ k;
        k = ((k << 3) | (k >>> 13)) & 0xFFFF;
        if (c === 0) break;
        if (c === 0x10) {                                       // Variable: Anzahl, dann so viele Werte – überspringen
          var cnt = (u16(b, off + (j + 1) * 2) ^ k);
          for (var x = 0; x <= cnt && j + 1 < len; x++) { j++; k = ((k << 3) | (k >>> 13)) & 0xFFFF; }
          continue;
        }
        if (c === 0xE000 || c === 0x25BC || c === 0x25BD) { s += '\n'; continue; }
        s += SPECIAL[c] || String.fromCharCode(c);
      }
      out.push(s);
      key = (key + 0x2983) & 0xFFFF;
    }
    return out;
  }

  /* ── Spieldaten ────────────────────────────────────────────────── */
  // Basiswerte (je 0x50 Byte): 0 KP … 5 SpVert (Reihenfolge KP, Ang, Vert, Init, SpAng, SpVert), 6/7 Typen,
  // 8 Fangrate, 0x12 Geschlecht, 0x15 Wachstum, 0x18–0x1A Fähigkeiten, 0x1C Formen-Index (u16), 0x20 Formen,
  // 0x26 Gewicht (u16, 0,1 kg). Das GARC enthält je Eintrag eine Datei und am Ende alle zusammen.
  function personalTable(files) {
    var all = files[files.length - 1];
    if (!all || all.length < PERSONAL_SIZE * 2 || all.length % PERSONAL_SIZE) {
      var parts = files.filter(function (f) { return f.length === PERSONAL_SIZE; });
      all = new Uint8Array(parts.length * PERSONAL_SIZE);
      parts.forEach(function (f, i) { all.set(f, i * PERSONAL_SIZE); });
    }
    var out = [];
    for (var o = 0; o + PERSONAL_SIZE <= all.length; o += PERSONAL_SIZE) {
      var p = all.subarray(o, o + PERSONAL_SIZE);
      out.push({
        base: [p[0], p[1], p[2], p[3], p[4], p[5]], types: [p[6], p[7]], catchRate: p[8], gender: p[0x12],
        growth: p[0x15], abilities: [p[0x18], p[0x19], p[0x1A]], formIndex: u16(p, 0x1C), forms: p[0x20], weight: u16(p, 0x26)
      });
    }
    return out;
  }
  // Index des Eintrags einer Form (Formen ab formIndex hintereinander, Form 1 = formIndex)
  function formEntry(personal, species, form) {
    var p = personal[species];
    if (p && form > 0 && form < p.forms && p.formIndex) return p.formIndex + form - 1;
    return species;
  }

  // Attacken: eine Datei als „WD“-Paket (Mini): Kennung, Anzahl, (Anzahl + 1) Offsets, je Attacke 0x22+ Byte:
  // 0 Typ, 2 Kategorie (0 Status, 1 phys., 2 spez.), 3 Stärke, 4 Genauigkeit (101 = trifft immer), 5 AP,
  // 6 Priorität (signed), 7 Treffer (min | max << 4), 0x0E Volltreffer-Stufe, 0x0F Zurückschrecken, 0x12 Rückstoß, 0x14 Ziel
  function moveTable(files) {
    var b = files[0], list = [];
    if (b && b.length > 4 && b[0] === 0x57 && b[1] === 0x44) {
      var n = u16(b, 2);
      for (var i = 0; i < n; i++) list.push(b.subarray(u32(b, 4 + i * 4), u32(b, 8 + i * 4)));
    } else list = files;
    return list.map(function (m) {
      if (!m || m.length < 0x16) return null;
      var pr = m[6] > 127 ? m[6] - 256 : m[6], rc = m[0x12] > 127 ? m[0x12] - 256 : m[0x12];
      // Flags u32@0x20: Bit 0 Kontakt, Bit 7 Schlag, Bit 8 Laut, Bit 10 taut auf; Zusatzwirkung: Status u16@8 (Chance @0x0A),
      // Werte-Änderung mit Chance @0x1B–0x1D
      return { type: m[0], cat: m[2], power: m[3], acc: m[4], pp: m[5], prio: pr, hits: [m[7] & 15, m[7] >> 4], crit: m[0x0E], flinch: m[0x0F],
        recoil: rc, target: m[0x14], flags: m.length >= 0x24 ? u32(m, 0x20) : 0, secondary: !!(m[0x0A] || m[0x0F] || m[0x1B] || m[0x1C] || m[0x1D]) };
    });
  }

  // Level-Attacken je Basiswert-Eintrag: (Attacke u16, Level u16) …, Ende 0xFFFF
  function learnsetTable(files) {
    return files.map(function (b) {
      var out = [];
      for (var o = 0; o + 4 <= b.length; o += 4) {
        var mv = u16(b, o), lv = u16(b, o + 2);
        if (mv === 0xFFFF) break;
        out.push([lv, mv]);
      }
      return out;
    });
  }

  // Trainer (UPR Gen6RomHandler): trdata = Format u16 (Bit 0 eigene Attacken, Bit 1 Items), Klasse u16, Kampfart @6
  // (0 Einzel, 1 Doppel, 2 Dreier, 3 Rotation, 4 Horde), Anzahl @7, 4 Items u16 @8, KI u32 @0x10.
  // trpoke je Pokémon: DV-Stufe (×31/255), Fähigkeit (obere 4 Bit; 0 = zufällig, 1–3 = Platz) und Geschlecht (untere 4 Bit),
  // Level u16, Art u16, Form u16, dann Item u16 und 4 Attacken u16, wenn das Format sie hat.
  function trainerTable(trdata, trpoke) {
    return trdata.map(function (t, id) {
      var p = trpoke[id];
      if (!t || t.length < 0x14 || !p) return null;
      var fmt = u16(t, 0), cls = u16(t, 2), kind = t[6], n = Math.min(t[7], 6);
      var items = [];
      for (var k = 0; k < 4; k++) { var it = u16(t, 8 + k * 2); if (it) items.push(it); }
      var size = 8 + (fmt & 2 ? 2 : 0) + (fmt & 1 ? 8 : 0), party = [];
      for (var i = 0; i < n && (i + 1) * size <= p.length; i++) {
        var o = i * size, q = 8;
        var mon = { iv: Math.floor(p[o] * 31 / 255), ability: p[o + 1] >> 4, gender: p[o + 1] & 15, level: u16(p, o + 2), species: u16(p, o + 4), form: u16(p, o + 6), item: 0, moves: null };
        if (fmt & 2) { mon.item = u16(p, o + q); q += 2; }
        if (fmt & 1) { mon.moves = [0, 1, 2, 3].map(function (m) { return u16(p, o + q + m * 2); }).filter(Boolean); }
        party.push(mon);
      }
      return { cls: cls, kind: kind, items: items, ai: u32(t, 0x10), party: party };
    });
  }

  // Wilde Pokémon (UPR getEncountersORAS): Zonendatei, Tabelle ab u32@0x10 + 0x0E, 0xF6 Byte, je Platz 4 Byte
  // (Art | Form << 11, min. Level, max. Level): Gras 12, Hohes Gras 12, DexNav 3, Surfen 5, Zertrümmerer 5,
  // Angel/Profiangel/Superangel je 3, Horden 3 × 5. Die letzten beiden Dateien sind keine Zonen.
  var WILD_LAYOUT = [['grass', 0, 12], ['tall', 48, 12], ['dexnav', 96, 3], ['surf', 108, 5], ['smash', 128, 5],
    ['old', 148, 3], ['good', 160, 3], ['super', 172, 3], ['hordeA', 184, 5], ['hordeB', 204, 5], ['hordeC', 224, 5]];
  function wildTable(files) {
    return files.map(function (b, i) {
      if (i >= files.length - 2 || b.length < 0x18) return null;
      var o = u32(b, 0x10) + 0x0E, end = u32(b, 0x14);
      if (end - o < 0xF6 || o + 0xF6 > b.length) return null;
      var z = {}, any = false;
      WILD_LAYOUT.forEach(function (l) {
        var list = [];
        for (var k = 0; k < l[2]; k++) {
          var at = o + l[1] + k * 4, v = u16(b, at), sp = v & 0x7FF;
          list.push(sp ? [sp, v >> 11, b[at + 2], b[at + 3]] : null);
          if (sp) any = true;
        }
        z[l[0]] = list.some(Boolean) ? list : null;
      });
      return any ? z : null;
    });
  }

  // Tabellen einer Zone mit Raten (wie im Spiel, vgl. pk3DS RSWE): Gras/Langes Gras 10 % × 9, 5, 4, 1 %; Surfen und Zertrümmerer
  // 50, 30, 15, 4, 1 %; Angeln 60, 35, 5 %; Horden A/B/C 60/35/5 % (je Gruppe 5 Pokémon); DexNav ohne Rate.
  // → { grass: [{ id, form, p, min, max }], tall, surf, smash, old, good, super, horde: [{ id, p, n, min, max }], dexnav: [{ id }] }
  // swap: { Art: andere Art } (Alpha Saphir: Editions-Pokémon), null = wie in der Zone
  var RATES = {
    grass: [10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 4, 1], tall: [10, 10, 10, 10, 10, 10, 10, 10, 10, 5, 4, 1],
    surf: [50, 30, 15, 4, 1], smash: [50, 30, 15, 4, 1], old: [60, 35, 5], good: [60, 35, 5], super: [60, 35, 5]
  };
  var HORDES = { hordeA: 60, hordeB: 35, hordeC: 5 };
  function wildTables(z, swap) {
    if (!z) return null;
    var sp = function (s) { return swap && swap[s] != null ? swap[s] : s; };
    var out = {};
    Object.keys(RATES).forEach(function (k) {
      if (!z[k]) return;
      var map = {}, list = [];
      z[k].forEach(function (s, i) {
        if (!s) return;
        var id = sp(s[0]), key = id + '-' + s[1], e = map[key];
        if (!e) { e = map[key] = { id: id, form: s[1], p: 0, min: 99, max: 0 }; list.push(e); }
        e.p += RATES[k][i]; e.min = Math.min(e.min, s[2]); e.max = Math.max(e.max, s[3]);
      });
      if (list.length) out[k] = list.sort(function (a, b) { return b.p - a.p; });
    });
    var horde = [];
    Object.keys(HORDES).forEach(function (k) {
      if (!z[k]) return;
      var n = {}, lv = {}, order = [];
      z[k].forEach(function (s) {
        if (!s) return;
        var id = sp(s[0]);
        if (!n[id]) { n[id] = 0; lv[id] = s; order.push(id); }
        n[id]++;
      });
      order.forEach(function (id) { horde.push({ id: id, p: HORDES[k], n: n[id], min: lv[id][2], max: lv[id][3] }); });
    });
    if (horde.length) out.horde = horde;
    if (z.dexnav) out.dexnav = z.dexnav.filter(Boolean).map(function (s) { return { id: sp(s[0]) }; });
    return Object.keys(out).length ? out : null;
  }

  // Mega-Entwicklungen je Art: Einträge à 8 Byte (Form u16, Art der Entwicklung u16 – 1 = Item, Item u16)
  function megaTable(files) {
    var out = {};
    files.forEach(function (b, sp) {
      for (var o = 0; o + 8 <= b.length; o += 8) {
        var form = u16(b, o), how = u16(b, o + 2), item = u16(b, o + 4);
        if (form && how === 1 && item) (out[sp] = out[sp] || []).push([form, item]);
      }
    });
    return out;
  }

  // Starter: Geschenk-Pokémon 0–2 in DllField.cro (Art u16 am Anfang jedes Eintrags)
  function startersFrom(cro) {
    if (!cro || cro.length < GIFT_OFFSET + GIFT_SIZE * 3) return null;
    var s = [0, 1, 2].map(function (i) { return u16(cro, GIFT_OFFSET + i * GIFT_SIZE); });
    return s.every(function (x) { return x >= 1 && x <= 721; }) ? s : null;
  }

  /* ── Teams im Format des Boss-Planers ──────────────────────────── */
  // p-Einträge wie in bosses-oras.json: [Art, Form, Level, Item, Attacken, Wesen (null = unbekannt), Fähigkeit, DVs, Mega-Form?]
  // Attacken ohne eigene: die letzten vier Level-Attacken bis zum Level (wie im Spiel). Fähigkeit: Platz 1–3, 0 = beliebig
  // (→ erste). Mega-Stein der eigenen Art → Mega-Form. personal/learnsets/megas: aus der ROM oder aus base (Original).
  function bossTeam(t, personal, learnsets, megas) {
    var learnOf = function (sp, form) { return learnsets[formEntry(personal, sp, form)] || learnsets[sp] || []; };
    function defaultMoves(sp, form, level) {
      var known = [];
      learnOf(sp, form).forEach(function (e) {
        if (e[0] > level || known.indexOf(e[1]) >= 0) return;
        if (known.length === 4) known.shift();
        known.push(e[1]);
      });
      return known;
    }
    return t.party.map(function (m) {
      var per = personal[formEntry(personal, m.species, m.form)] || personal[m.species] || { abilities: [0, 0, 0] };
      var ab = m.ability === 3 ? per.abilities[2] : m.ability === 2 ? per.abilities[1] : per.abilities[0];
      var entry = [m.species, m.form, m.level, m.item, m.moves && m.moves.length ? m.moves : defaultMoves(m.species, m.form, m.level), null, ab, m.iv];
      var mega = m.item && (megas[m.species] || []).filter(function (x) { return x[1] === m.item; })[0];
      if (mega) entry.push(mega[0]);
      return entry;
    });
  }
  // Level-Attacken aus bosses-oras.json („learn“: flach [Level, Attacke, …]) zurück in Paare
  function unflatLearn(learn) {
    return (learn || []).map(function (f) { var out = []; for (var i = 0; i + 1 < f.length; i += 2) out.push([f[i], f[i + 1]]); return out; });
  }
  // Basiswerte aus data-oras.js (Format wie data-pt.js) in das Format von personalTable
  function personalFromData(list) {
    return (list || []).map(function (p) { return { base: p.slice(0, 6), types: [p[6], p[7]], gender: p[8], growth: p[9], abilities: [p[10], p[11], p[14]], forms: p[12], formIndex: p[13], weight: p[15] }; });
  }
  // Randomizer-Stand für den Hub (rando-state.js): Teams der Trainer ids, geänderte Basiswerte (Format data-oras.js),
  // Starter, wilde Pokémon je Zone. base = bosses-oras.json, basePersonal = ORAS_DATA.personal
  function hubState(g, ids, base, basePersonal) {
    var personal = g.personal || personalFromData(basePersonal);
    var learnsets = g.learnsets || unflatLearn(base.learn);
    var megas = g.megas || base.megas || {};
    var trainers = null;
    if (g.trainers) {
      trainers = {};
      ids.forEach(function (id) {
        var t = g.trainers[id];
        if (t && t.party.length) trainers[id] = { d: t.kind === 1 ? 1 : 0, it: t.items, p: bossTeam(t, personal, learnsets, megas) };
      });
    }
    var changed = {};
    if (g.personal) {
      g.personal.forEach(function (p, i) {
        var b = basePersonal[i];
        if (!b) return;
        var row = p.base.concat([p.types[0], p.types[1], p.gender, p.growth, p.abilities[0], p.abilities[1], p.forms, p.formIndex, p.abilities[2], p.weight]);
        for (var k = 0; k < 15; k++) if (k !== 8 && k !== 9 && row[k] !== b[k]) { changed[i] = row; return; }
      });
    }
    return { game: 'oras', titleId: g.titleId, version: g.game, trainers: trainers, personal: changed, starters: g.starters, wild: g.wild };
  }

  /* ── Alles für Boss-Planer, Karte & Co. aus einer (randomisierten) ROM ── */
  // rom wie von openRom/openLayered. Fehlt eine Datei (LayeredFS enthält nur geänderte), ist der Eintrag null.
  function readGameData(rom) {
    var get = function (path, fn) {
      return rom.has(path) ? rom.file(path).then(fn).catch(function () { return null; }) : Promise.resolve(null);
    };
    return Promise.all([
      get(FILES.trdata, garc), get(FILES.trpoke, garc), get(FILES.personal, function (b) { return personalTable(garc(b)); }),
      get(FILES.learnsets, function (b) { return learnsetTable(garc(b)); }), get(FILES.wild, function (b) { return wildTable(garc(b, true)); }),
      get(FILES.field, startersFrom), get(FILES.moves, function (b) { return moveTable(garc(b)); }),
      get(FILES.megas, function (b) { return megaTable(garc(b)); })
    ]).then(function (r) {
      return {
        game: rom.game, titleId: rom.titleId,
        trainers: r[0] && r[1] ? trainerTable(r[0], r[1]) : null,
        personal: r[2], learnsets: r[3], wild: r[4], starters: r[5], moves: r[6], megas: r[7]
      };
    });
  }

  // Texte (de/en) aus der ROM – für die Build-Skripte
  function readTexts(rom, lang) {
    return rom.file(lang === 'en' ? FILES.textEn : FILES.textDe).then(function (b) {
      var files = garc(b), out = {};
      Object.keys(TEXT).forEach(function (k) { out[k] = textFile(files[TEXT[k]] || new Uint8Array(0)); });
      out.file = function (n) { return textFile(files[n] || new Uint8Array(0)); };
      return out;
    });
  }

  /* ── Datei-Helfer ──────────────────────────────────────────────── */
  function blobReader(blob) {
    return function (s, e) { return blob.slice(s, e).arrayBuffer().then(function (b) { return new Uint8Array(b); }); };
  }
  // Node: openPath('rom.3ds') oder ein LayeredFS-Ordner
  function openPath(p) {
    var fs = require('fs'), path = require('path');
    if (fs.statSync(p).isDirectory()) {
      var list = [];
      (function walk(dir) {
        fs.readdirSync(dir, { withFileTypes: true }).forEach(function (d) {
          var full = path.join(dir, d.name);
          if (d.isDirectory()) walk(full);
          else list.push({ path: full, read: function () { return Promise.resolve(new Uint8Array(fs.readFileSync(full))); } });
        });
      })(p);
      return Promise.resolve(openLayered(list));
    }
    var fd = fs.openSync(p, 'r');
    return openRom(function (s, e) {
      var buf = Buffer.alloc(e - s);
      fs.readSync(fd, buf, 0, e - s, s);
      return Promise.resolve(new Uint8Array(buf.buffer, buf.byteOffset, buf.length));
    });
  }

  // Browser: eine ROM-Datei (Blob) oder die Dateien eines Ordners (FileList mit webkitRelativePath)
  function openFiles(files) {
    var list = Array.prototype.slice.call(files);
    if (list.length === 1 && !(list[0].webkitRelativePath || '').includes('/')) return openRom(blobReader(list[0]));
    return Promise.resolve(openLayered(list.map(function (f) {
      return { path: f.webkitRelativePath || f.name, read: function () { return f.arrayBuffer().then(function (b) { return new Uint8Array(b); }); } };
    })));
  }

  // Wie readGameData, aber im eigenen Worker (eine kaputte Datei blockiert so nicht die Seite; Abbruch nach 60 s)
  var TIMEOUT = 60000;
  function readFiles(files) {
    var worker = null;
    try { if (SELF_URL && typeof Worker === 'function') worker = new Worker(SELF_URL); } catch (e) { worker = null; }
    var direct = function () { return openFiles(files).then(readGameData); };
    if (!worker) return direct();
    return new Promise(function (resolve, reject) {
      var timer = setTimeout(function () { worker.terminate(); reject(new Error('timeout')); }, TIMEOUT);
      function done() { clearTimeout(timer); worker.terminate(); }
      worker.onmessage = function (e) {
        done();
        if (e.data && e.data.error != null) reject(new Error(e.data.error));
        else resolve(e.data.result);
      };
      worker.onerror = function (e) { e.preventDefault(); done(); direct().then(resolve, reject); };
      worker.postMessage({ files: Array.prototype.slice.call(files) });
    });
  }
  if (typeof WorkerGlobalScope !== 'undefined' && typeof self !== 'undefined' && self instanceof WorkerGlobalScope) {
    self.onmessage = function (e) {
      openFiles(e.data.files).then(readGameData).then(
        function (result) { self.postMessage({ result: result }); },
        function (err) { self.postMessage({ error: (err && err.message) || 'error' }); });
    };
  }

  return {
    FILES: FILES, TEXT: TEXT, WILD_LAYOUT: WILD_LAYOUT,
    openRom: openRom, openLayered: openLayered, openPath: openPath, openFiles: openFiles,
    readGameData: readGameData, readTexts: readTexts, readFiles: readFiles,
    formEntry: formEntry, wildTables: wildTables, bossTeam: bossTeam, hubState: hubState, unflatLearn: unflatLearn, personalFromData: personalFromData,
    _internal: { garc: garc, lz11: lz11, textFile: textFile, personalTable: personalTable, moveTable: moveTable, learnsetTable: learnsetTable,
      trainerTable: trainerTable, wildTable: wildTable, megaTable: megaTable, startersFrom: startersFrom, romfsTree: romfsTree }
  };
});
