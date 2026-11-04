/*
 * oras-save.js – liest Spielstände von Pokémon Omega Rubin / Alpha Saphir direkt im Browser.
 *
 * Gegenstück zu pt-save.js mit derselben Ausgabe (parse), damit Save-Viewer und Save-Editor beide Spiele
 * gleich anzeigen. Die Datei kommt von Citra (Rechtsklick aufs Spiel → Speicherdatenordner öffnen → „main“)
 * oder einem Save-Manager wie Checkpoint/JKSM.
 *
 * Aufbau (0x76000 Byte): 58 Blöcke hintereinander (je auf 0x200 ausgerichtet), am Ende ab 0x75E00 ein
 * Verzeichnis mit „BEEF“ und je Block Länge (u32), Nummer (u16) und Prüfsumme (u16, CRC16-CCITT wie in Gen 4).
 * Es gibt nur eine Kopie – keine zwei Hälften wie beim DS.
 *
 * Pokémon (PK6) sind 232 Byte (Box) bzw. 260 Byte (Team): 4 Blöcke à 56 Byte, umsortiert nach
 * (Verschlüsselungskonstante >> 13) & 31, mit demselben Zufallsgenerator wie Gen 4 verschlüsselt – Startwert
 * ist aber die Verschlüsselungskonstante (EC), nicht die Prüfsumme. Wesen, Fähigkeit und Geschlecht stehen eigens
 * im Pokémon. Namen sind UTF-16.
 *
 * Offsets nach PKHeX (SAV6AO, PK6, MyItem6AO, Zukan6AO), geprüft an einem echten Citra-Spielstand.
 * Benötigt ORAS_DATA aus data-oras.js (Namen, Basiswerte).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OrasSave = api;
})(this, function () {
  'use strict';

  var SIZE = 0x76000;
  var TABLE = SIZE - 0x200;        // Block-Verzeichnis
  var BEEF = 0x42454546;
  var L = {
    bag: 0x00400, playTime: 0x01800, misc: 0x04200, boxLayout: 0x04400, trainer: 0x14000, party: 0x14200,
    partyCount: 0x14200 + 6 * 260, dex: 0x15000, hallOfFame: 0x19E00, daycare: 0x1BC00, box: 0x33000,
    boxCount: 31, boxSlots: 30, sizeStored: 232, sizeParty: 260
  };
  var VERSION_OR = 27, VERSION_AS = 26;

  var BLOCK_POSITION = [
    0,1,2,3, 0,1,3,2, 0,2,1,3, 0,3,1,2, 0,2,3,1, 0,3,2,1, 1,0,2,3, 1,0,3,2,
    2,0,1,3, 3,0,1,2, 2,0,3,1, 3,0,2,1, 1,2,0,3, 1,3,0,2, 2,1,0,3, 3,1,0,2,
    2,3,0,1, 3,2,0,1, 1,2,3,0, 1,3,2,0, 2,1,3,0, 3,1,2,0, 2,3,1,0, 3,2,1,0,
    0,1,2,3, 0,1,3,2, 0,2,1,3, 0,3,1,2, 0,2,3,1, 0,3,2,1, 1,0,2,3, 1,0,3,2
  ];
  var BLOCK = 56;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  function crc16(b, start, end) {
    var top = 0xFF, bot = 0xFF;
    for (var i = start; i < end; i++) {
      var x = b[i] ^ top;
      x ^= (x >> 4);
      top = (bot ^ (x >> 3) ^ (x << 4)) & 0xFF;
      bot = (x ^ (x << 5)) & 0xFF;
    }
    return (top << 8) | bot;
  }
  function crypt(b, start, end, seed) {
    seed >>>= 0;
    for (var i = start; i < end; i += 2) {
      seed = (Math.imul(0x41C64E6D, seed) + 0x6073) >>> 0;
      var x = seed >>> 16;
      b[i] ^= x & 0xFF;
      b[i + 1] ^= x >>> 8;
    }
  }

  // Gen-6-Sonderzeichen: ♂/♀ liegen im privaten Bereich
  var FROM_GAME = { 0xE08E: '♂', 0xE08F: '♀' }, TO_GAME = { '♂': 0xE08E, '♀': 0xE08F };
  function decodeString(b, o, maxBytes) {
    var out = '';
    for (var i = 0; i < maxBytes; i += 2) {
      var v = u16(b, o + i);
      if (!v) break;
      out += FROM_GAME[v] || String.fromCharCode(v);
    }
    return out;
  }
  // Text → UTF-16 (höchstens maxChars Zeichen, danach Nullen)
  function encodeString(text, bytes, maxChars) {
    var out = new Uint8Array(bytes), n = 0;
    String(text).split('').forEach(function (ch) {
      if (n >= maxChars) return;
      var c = TO_GAME[ch] || ch.charCodeAt(0);
      out[n * 2] = c & 0xFF; out[n * 2 + 1] = c >>> 8;
      n++;
    });
    return out;
  }

  /* ── Datei und Blöcke ──────────────────────────────────────────── */
  function normalize(buf) {
    var b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    return b.length === SIZE ? b : null;
  }
  function detect(buf) {
    var b = normalize(buf);
    return b && u32(b, TABLE + 0x10) === BEEF ? 'oras' : null;
  }
  // Verzeichnis: [{ id, offset, size, valid }]
  function blocks(b) {
    var list = [], pos = 0;
    for (var i = 0; i < 64; i++) {
      var e = TABLE + 0x14 + i * 8, len = u32(b, e);
      if (!len || pos + len > TABLE) break;
      list.push({ index: i, offset: pos, size: len, entry: e, valid: crc16(b, pos, pos + len) === u16(b, e + 6) });
      pos = Math.ceil((pos + len) / 0x200) * 0x200;
    }
    return list;
  }
  // Block, in dem eine Stelle liegt – mit bytes (Sicht auf die Datei, Änderungen landen direkt darin)
  function blockAt(buffer, offset) {
    var b = normalize(buffer);
    if (!b || !detect(b)) return null;
    var list = blocks(b);
    for (var i = 0; i < list.length; i++) {
      var k = list[i];
      if (offset >= k.offset && offset < k.offset + k.size) { k.bytes = b; return k; }
    }
    return null;
  }
  function writeChecksum(b, block) {
    var c = crc16(b, block.offset, block.offset + block.size);
    b[block.entry + 6] = c & 0xFF;
    b[block.entry + 7] = c >>> 8;
  }

  /* ── Pokémon ───────────────────────────────────────────────────── */
  function decryptPK6(src, offset, size) {
    var raw = src.subarray(offset, offset + size);
    var b = new Uint8Array(raw);
    var ec = u32(b, 0);
    crypt(b, 8, L.sizeStored, ec);
    if (size > L.sizeStored) crypt(b, L.sizeStored, size, ec);
    var sv = (ec >>> 13) & 31;
    var out = new Uint8Array(b);
    for (var k = 0; k < 4; k++) {
      var from = 8 + BLOCK_POSITION[sv * 4 + k] * BLOCK;
      out.set(b.subarray(from, from + BLOCK), 8 + k * BLOCK);
    }
    var sum = 0;
    for (var j = 8; j < L.sizeStored; j += 2) sum = (sum + u16(out, j)) & 0xFFFF;
    return { data: out, checksumOk: sum === u16(out, 6) };
  }
  function encryptPK6(dec) {
    var d = new Uint8Array(dec);
    var sum = 0;
    for (var j = 8; j < L.sizeStored; j += 2) sum = (sum + u16(d, j)) & 0xFFFF;
    d[6] = sum & 0xFF;
    d[7] = sum >>> 8;
    var ec = u32(d, 0), sv = (ec >>> 13) & 31;
    var out = new Uint8Array(d);
    for (var k = 0; k < 4; k++) {
      var to = 8 + BLOCK_POSITION[sv * 4 + k] * BLOCK;
      out.set(d.subarray(8 + k * BLOCK, 8 + k * BLOCK + BLOCK), to);
    }
    crypt(out, 8, L.sizeStored, ec);
    if (out.length > L.sizeStored) crypt(out, L.sizeStored, out.length, ec);
    return out;
  }

  function personalEntry(D, species, form) {
    var p = D.personal[species];
    if (p && form > 0 && form < p[12] && p[13] > 0) return D.personal[p[13] + form - 1] || p;
    return p;
  }
  function levelFromExp(D, growth, exp) {
    var t = D.exp[growth] || D.exp[0];
    if (exp >= t[99]) return 100;
    var lv = 1;
    while (exp >= t[lv]) lv++;
    return lv;
  }
  function calcStats(base, iv, ev, level, nature, species) {
    var stats = [];
    for (var i = 0; i < 6; i++) {
      var core = Math.floor((2 * base[i] + iv[i] + Math.floor(ev[i] / 4)) * level / 100);
      if (i === 0) { stats.push(species === 292 ? 1 : core + level + 10); continue; }
      var v = core + 5;
      var up = Math.floor(nature / 5), down = nature % 5;
      if (up !== down) {
        if (up === i - 1) v = Math.floor(v * 110 / 100);
        else if (down === i - 1) v = Math.floor(v * 90 / 100);
      }
      stats.push(v);
    }
    return stats;
  }

  var HP_TYPES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];
  // Freundschaft des aktuellen Trainers (0x93: 0 = Originaltrainer, 1 = Halter nach Tausch)
  function friendshipAt(d) { return d[0x93] ? 0xA2 : 0xCA; }

  function readPK6(D, src, offset, size, where) {
    var r = decryptPK6(src, offset, size);
    var d = r.data;
    var species = u16(d, 0x08);
    if (!r.checksumOk) {
      for (var z = 0; z < size; z++) if (src[offset + z]) return { bad: true, where: where };
      return null;
    }
    if (species === 0 || species > D.speciesCount) return null;

    var iv32 = u32(d, 0x74);
    var iv = [iv32 & 31, (iv32 >>> 5) & 31, (iv32 >>> 10) & 31, (iv32 >>> 15) & 31, (iv32 >>> 20) & 31, (iv32 >>> 25) & 31];
    var ev = [d[0x1E], d[0x1F], d[0x20], d[0x21], d[0x22], d[0x23]];
    var form = d[0x1D] >>> 3;
    var tid = u16(d, 0x0C), sid = u16(d, 0x0E), pid = u32(d, 0x18);
    var exp = u32(d, 0x10);
    var p = personalEntry(D, species, form);
    var growth = p ? p[9] : 0;
    var nature = d[0x1C] % 25;
    var level;
    if (size === L.sizeParty && d[0xEC] >= 1 && d[0xEC] <= 100) level = d[0xEC];
    else level = levelFromExp(D, growth, exp);

    var moves = [], pp = [], ppUps = [];
    for (var m = 0; m < 4; m++) {
      var mv = u16(d, 0x5A + m * 2);
      if (!mv) continue;
      moves.push(mv);
      pp.push(d[0x62 + m]);
      ppUps.push(d[0x66 + m]);
    }
    var isEgg = ((iv32 >>> 30) & 1) === 1;

    var mon = {
      where: where,
      ec: u32(d, 0),
      pid: pid,
      species: species,
      form: form,
      item: u16(d, 0x0A),
      tid: tid,
      sid: sid,
      exp: exp,
      friendship: isEgg ? d[0xCA] : d[friendshipAt(d)],
      ability: d[0x14],
      abilityNumber: d[0x15],
      language: d[0xE3],
      ev: ev,
      iv: iv,
      moves: moves,
      pp: pp,
      ppUps: ppUps,
      isEgg: isEgg,
      isNicknamed: ((iv32 >>> 31) & 1) === 1,
      fateful: (d[0x1D] & 1) === 1,
      gender: (d[0x1D] >>> 1) & 3,
      nickname: decodeString(d, 0x40, 26),
      version: d[0xDF],
      otName: decodeString(d, 0xB0, 26),
      otGender: d[0xDD] >>> 7,
      eggDate: d[0xD1] ? [2000 + d[0xD1], d[0xD2], d[0xD3]] : null,
      metDate: d[0xD4] ? [2000 + d[0xD4], d[0xD5], d[0xD6]] : null,
      eggLocation: u16(d, 0xD8),
      metLocation: u16(d, 0xDA),
      metLevel: d[0xDD] & 0x7F,
      pokerus: d[0x2B],
      ball: d[0xDC],
      encounterType: d[0xDE],
      nature: nature,
      level: level,
      shiny: ((tid ^ sid ^ (pid >>> 16) ^ (pid & 0xFFFF)) >>> 0) < 16,
      growth: growth,
      types: p ? (p[6] === p[7] ? [p[6]] : [p[6], p[7]]) : [],
      base: p ? p.slice(0, 6) : [0, 0, 0, 0, 0, 0]
    };
    mon.expThis = (D.exp[growth] || D.exp[0])[level - 1];
    mon.expNext = level < 100 ? (D.exp[growth] || D.exp[0])[level] : null;

    if (size === L.sizeParty) {
      mon.status = u32(d, 0xE8);
      mon.hp = u16(d, 0xF0);
      mon.stats = [u16(d, 0xF2), u16(d, 0xF4), u16(d, 0xF6), u16(d, 0xF8), u16(d, 0xFA), u16(d, 0xFC)];
      if (!mon.stats[0]) mon.stats = calcStats(mon.base, iv, ev, level, nature, species);
    } else {
      mon.stats = calcStats(mon.base, iv, ev, level, nature, species);
      mon.hp = mon.stats[0];
      mon.status = 0;
    }
    var a = 0, pw = 0;
    for (var s = 0; s < 6; s++) {
      a += (iv[s] & 1) << s;
      pw += ((iv[s] >> 1) & 1) << s;
    }
    mon.hiddenPower = { type: HP_TYPES[Math.floor(a * 15 / 63)], power: Math.floor(pw * 40 / 63) + 30 };
    return mon;
  }

  /* ── Spielstand lesen ──────────────────────────────────────────── */
  function parse(buffer, D) {
    D = D || (typeof window !== 'undefined' ? window.ORAS_DATA : null);
    if (!D) throw new Error('ORAS_DATA fehlt');
    var b = normalize(buffer);
    if (!b) return { ok: false, error: 'size', size: buffer.byteLength || buffer.length };
    if (!detect(b)) return { ok: false, error: 'unknown' };

    var list = blocks(b);
    var boxBlock = list.filter(function (k) { return k.offset === L.box; })[0];
    var general = list.every(function (k) { return k === boxBlock || k.valid; });

    var T = L.trainer, M = L.misc;
    var version = b[T + 4];
    var badgesByte = b[M + 0x0C], badges = [];
    for (var i = 0; i < 8; i++) badges.push(((badgesByte >> i) & 1) === 1);
    var trainer = {
      name: decodeString(b, T + 0x48, 26),
      tid: u16(b, T),
      sid: u16(b, T + 2),
      money: u32(b, M + 0x08),
      gender: b[T + 5] & 1,
      language: b[T + 0x2D],
      version: version,
      badges: badges,
      badgeCount: badges.filter(Boolean).length,
      gameClear: !!u16(b, L.hallOfFame),          // erster Eintrag der Ruhmeshalle
      nationalDex: true,
      coins: null,                                 // keine Spielhalle in Omega Rubin / Alpha Saphir
      playTime: { h: u16(b, L.playTime), m: b[L.playTime + 2], s: b[L.playTime + 3] },
      rival: '',
      started: 0,
      hallOfFame: 0
    };

    var partyCount = Math.min(b[L.partyCount], 6);
    var party = [], bad = [];
    for (var p = 0; p < partyCount; p++) {
      var mon = readPK6(D, b, L.party + p * L.sizeParty, L.sizeParty, { area: 'party', slot: p });
      if (mon && mon.bad) bad.push(mon.where);
      else if (mon) party.push(mon);
    }

    var boxes = [], BL = L.boxLayout;
    for (var bx = 0; bx < L.boxCount; bx++) {
      var slots = [];
      for (var sl = 0; sl < L.boxSlots; sl++) {
        var m = readPK6(D, b, L.box + (bx * L.boxSlots + sl) * L.sizeStored, L.sizeStored, { area: 'box', box: bx, slot: sl });
        if (m && m.bad) { bad.push(m.where); slots.push(null); }
        else slots.push(m);
      }
      boxes.push({ name: decodeString(b, BL + bx * 0x22, 0x22), wallpaper: b[BL + 0x41E + bx], slots: slots });
    }

    // Pension auf Route 117 und im Kampfresort: je 2 Plätze (u32 belegt, u32 gesammelte EP, PK6), 0x1F0 pro Pension
    var daycare = [];
    for (var dc = 0; dc < 4; dc++) {
      var base = L.daycare + (dc >> 1) * 0x1F0 + (dc & 1) * (L.sizeStored + 8);
      if (!b[base]) continue;
      var dm = readPK6(D, b, base + 8, L.sizeStored, { area: 'daycare', slot: dc });
      if (dm && !dm.bad) {
        dm.daycareExp = u32(b, base + 4);
        dm.levelNow = levelFromExp(D, dm.growth, dm.exp + dm.daycareExp);
        daycare.push(dm);
      }
    }

    // Pokédex: 8 Byte Kopf, gefangen (0x60 Byte Bits), dann gesehen ♂/♀/schillernd ♂/schillernd ♀ (je 0x60)
    var X = L.dex;
    function bit(at, species) { var i = species - 1; return ((b[at + (i >> 3)] >> (i & 7)) & 1) === 1; }
    var caught = [], seen = [];
    for (var sp = 1; sp <= D.speciesCount; sp++) {
      if (bit(X + 8, sp)) caught.push(sp);
      if (bit(X + 0x68, sp) || bit(X + 0xC8, sp) || bit(X + 0x128, sp) || bit(X + 0x188, sp)) seen.push(sp);
    }
    var caughtSet = new Set(caught), seenSet = new Set(seen), regional = D.regionalDex;
    var dex = {
      caught: caught,
      seen: seen,
      regionalCaught: regional.filter(function (s) { return caughtSet.has(s); }).length,
      regionalSeen: regional.filter(function (s) { return seenSet.has(s); }).length,
      regionalTotal: regional.length
    };

    return {
      ok: true,
      game: version === VERSION_AS ? 'as' : 'or',
      checksums: { general: general, storage: !boxBlock || boxBlock.valid, fallback: false },
      currentBox: b[BL + 0x43F],
      trainer: trainer,
      party: party,
      boxes: boxes,
      daycare: daycare,
      dex: dex,
      badSlots: bad
    };
  }

  return {
    SIZE: SIZE,
    LAYOUT: L,
    detect: detect,
    parse: parse,
    blocks: function (buffer) { var b = normalize(buffer); return b ? blocks(b) : []; },
    blockAt: blockAt,
    writeChecksum: writeChecksum,
    decryptPK6: decryptPK6,
    encryptPK6: encryptPK6,
    calcStats: calcStats,
    levelFromExp: levelFromExp,
    personalEntry: personalEntry,
    decodeString: decodeString,
    encodeString: encodeString,
    friendshipAt: friendshipAt,
    _internal: { crc16: crc16, crypt: crypt, BLOCK_POSITION: BLOCK_POSITION, normalize: normalize }
  };
});
