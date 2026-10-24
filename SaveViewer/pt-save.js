/*
 * pt-save.js – liest Spielstände von Pokémon Platin (.sav / .dsv) direkt im Browser.
 *
 * Aufbau einer Gen-4-Speicherdatei (512 KB):
 *   Zwei Partitionen à 0x40000. Jede enthält einen „General“-Block (Trainer, Team, Pokédex …)
 *   und einen „Storage“-Block (PC-Boxen). Das Spiel schreibt abwechselnd in beide Partitionen;
 *   welcher Block aktuell ist, steht in Zählern im Block-Footer.
 *
 *   Pokémon (PK4) sind 136 Byte (Box) bzw. 236 Byte (Team) groß und verschlüsselt:
 *   128 Byte Daten werden mit einem Zufallsgenerator (Startwert = Prüfsumme) per XOR verschlüsselt
 *   und in 4 Blöcken à 32 Byte je nach PID umsortiert. Team-Pokémon haben zusätzlich 100 Byte
 *   Kampfwerte, verschlüsselt mit der PID als Startwert.
 *
 * Offsets und Algorithmen nach PKHeX (github.com/kwsch/PKHeX).
 * Benötigt PT_DATA aus data-pt.js (Namen, Basiswerte, Zeichentabelle).
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PtSave = api;
})(this, function () {
  'use strict';

  var SIZE_RAW = 0x80000;
  var PARTITION = 0x40000;
  var MAGIC_INTL = 0x20060623;
  var MAGIC_KOR = 0x20070903;

  var GAMES = {
    pt:   { name: 'Platin',            general: 0xCF2C, footer: 0x14 },
    dp:   { name: 'Diamant/Perl',      general: 0xC100, footer: 0x14 },
    hgss: { name: 'HeartGold/SoulSilver', general: 0xF628, footer: 0x10 }
  };

  // Platin-Offsets im General-Block
  var PT = {
    generalSize: 0xCF2C,
    storageStart: 0xCF2C,
    storageSize: 0x121E4,
    trainer: 0x68,
    party: 0xA0,
    dex: 0x1328,
    daycare: 0x1654,
    rival: 0x27E8,
    adventure: 0x0
  };

  var SIZE_STORED = 136;
  var SIZE_PARTY = 236;
  var BOX_COUNT = 18;
  var BOX_SLOTS = 30;
  var BOX_NAMES = 4 + BOX_COUNT * BOX_SLOTS * SIZE_STORED; // 0x11EE4
  var BOX_WALLPAPER = BOX_NAMES + BOX_COUNT * 40;         // 0x121B4

  // Position der Blöcke A/B/C/D je nach Shuffle-Wert (PID >> 13) & 31
  var BLOCK_POSITION = [
    0,1,2,3, 0,1,3,2, 0,2,1,3, 0,3,1,2, 0,2,3,1, 0,3,2,1, 1,0,2,3, 1,0,3,2,
    2,0,1,3, 3,0,1,2, 2,0,3,1, 3,0,2,1, 1,2,0,3, 1,3,0,2, 2,1,0,3, 3,1,0,2,
    2,3,0,1, 3,2,0,1, 1,2,3,0, 1,3,2,0, 2,1,3,0, 3,1,2,0, 2,3,1,0, 3,2,1,0,
    0,1,2,3, 0,1,3,2, 0,2,1,3, 0,3,1,2, 0,2,3,1, 0,3,2,1, 1,0,2,3, 1,0,3,2
  ];

  /* ── kleine Helfer ─────────────────────────────────────────────── */
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

  // LCG wie im Spiel: seed = seed * 0x41C64E6D + 0x6073, XOR mit den oberen 16 Bit
  function crypt(b, start, end, seed) {
    seed >>>= 0;
    for (var i = start; i < end; i += 2) {
      seed = (Math.imul(0x41C64E6D, seed) + 0x6073) >>> 0;
      var x = seed >>> 16;
      b[i] ^= x & 0xFF;
      b[i + 1] ^= x >>> 8;
    }
  }

  function decodeString(D, b, o, maxBytes) {
    var chars = D.chars, out = '';
    for (var i = 0; i < maxBytes; i += 2) {
      var v = u16(b, o + i);
      if (v === 0xFFFF || v === 0) break;
      var c = v < chars.length ? chars.charAt(v) : '';
      if (c === '￿') c = '';
      out += c;
    }
    return out;
  }

  /* ── Spiel erkennen ────────────────────────────────────────────── */
  function normalize(buf) {
    var b = buf instanceof Uint8Array ? buf : new Uint8Array(buf);
    var tail = '';
    if (b.length > 16) for (var i = b.length - 16; i < b.length; i++) tail += String.fromCharCode(b[i]);
    if (b.length === SIZE_RAW + 0x7A && tail === '|-DESMUME SAVE-|') return b.subarray(0, SIZE_RAW);
    if (b.length === SIZE_RAW + 0xA4) return b.subarray(0xA4);                // Action Replay DS
    if (b.length >= SIZE_RAW) return b.subarray(0, SIZE_RAW);                   // .sav, 1 MB Dumps u. Ä.
    return null;
  }

  function footerValid(b, base, game) {
    var end = base + game.general;
    var size = u32(b, end - 0xC);
    var magic = u32(b, end - 0x8);
    return size === game.general && (magic === MAGIC_INTL || magic === MAGIC_KOR);
  }

  function detect(b) {
    var keys = ['pt', 'dp', 'hgss'];
    for (var k = 0; k < keys.length; k++) {
      var g = GAMES[keys[k]];
      if (footerValid(b, PARTITION, g) || footerValid(b, 0, g)) return keys[k];
    }
    return null;
  }

  /* ── aktuellen Block wählen ────────────────────────────────────── */
  function compareCounters(c1, c2) {
    if (c1 === 0xFFFFFFFF && c2 !== 0xFFFFFFFE) return 1;
    if (c2 === 0xFFFFFFFF && c1 !== 0xFFFFFFFE) return 0;
    if (c1 > c2) return 0;
    if (c1 < c2) return 1;
    return 2;
  }

  function blockValid(b, start, length, footer) {
    var stored = u16(b, start + length - 2);
    return crc16(b, start, start + length - footer) === stored;
  }

  function pickBlock(b, begin, length) {
    var f1 = begin + length - 0x14, f2 = f1 + PARTITION;
    var r = compareCounters(u32(b, f1), u32(b, f2));
    if (r === 2) r = compareCounters(u32(b, f1 + 4), u32(b, f2 + 4)) === 1 ? 1 : 0;
    var off = (r === 0 ? 0 : PARTITION) + begin;
    var other = (r === 0 ? PARTITION : 0) + begin;
    var ok = blockValid(b, off, length, 0x14);
    // Ist der neuere Block kaputt (z. B. Abbruch beim Speichern), den älteren nehmen.
    if (!ok && blockValid(b, other, length, 0x14)) return { offset: other, valid: true, fallback: true };
    return { offset: off, valid: ok, fallback: false };
  }

  /* ── Pokémon entschlüsseln ─────────────────────────────────────── */
  function decryptPK4(src, offset, size) {
    var raw = src.subarray(offset, offset + size);
    var empty = true;
    for (var i = 0; i < SIZE_STORED; i++) if (raw[i] !== 0) { empty = false; break; }
    if (empty) return null;

    var b = new Uint8Array(raw); // Kopie
    var pid = u32(b, 0);
    var chk = u16(b, 6);
    crypt(b, 8, SIZE_STORED, chk);
    if (size > SIZE_STORED) crypt(b, SIZE_STORED, size, pid);

    var sv = (pid >>> 13) & 31;
    var out = new Uint8Array(b);
    for (var k = 0; k < 4; k++) {
      var from = 8 + BLOCK_POSITION[sv * 4 + k] * 32;
      out.set(b.subarray(from, from + 32), 8 + k * 32);
    }

    var sum = 0;
    for (var j = 8; j < SIZE_STORED; j += 2) sum = (sum + u16(out, j)) & 0xFFFF;
    return { data: out, checksumOk: sum === chk };
  }

  /* ── Werte berechnen ───────────────────────────────────────────── */
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

  // Gen-4-Reihenfolge der Kraftreserve-Typen (Index im PKHeX-Typsystem)
  var HP_TYPES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16];

  function calcStats(base, iv, ev, level, nature, species) {
    // Reihenfolge überall: KP, Ang, Vert, Init, SpAng, SpVert
    var stats = [];
    for (var i = 0; i < 6; i++) {
      var core = Math.floor((2 * base[i] + iv[i] + Math.floor(ev[i] / 4)) * level / 100);
      if (i === 0) { stats.push(species === 292 ? 1 : core + level + 10); continue; }
      var v = core + 5;
      var up = Math.floor(nature / 5), down = nature % 5;    // 0 Ang, 1 Vert, 2 Init, 3 SpAng, 4 SpVert
      if (up !== down) {
        if (up === i - 1) v = Math.floor(v * 110 / 100);
        else if (down === i - 1) v = Math.floor(v * 90 / 100);
      }
      stats.push(v);
    }
    return stats;
  }

  function readPK4(D, src, offset, size, where) {
    var r = decryptPK4(src, offset, size);
    if (!r) return null;
    var d = r.data;
    var pid = u32(d, 0);
    var species = u16(d, 0x08);
    if (!r.checksumOk) return { bad: true, where: where };
    if (species === 0 || species > 493) return null;

    var iv32 = u32(d, 0x38);
    var iv = [iv32 & 31, (iv32 >>> 5) & 31, (iv32 >>> 10) & 31, (iv32 >>> 15) & 31, (iv32 >>> 20) & 31, (iv32 >>> 25) & 31];
    var ev = [d[0x18], d[0x19], d[0x1A], d[0x1B], d[0x1C], d[0x1D]];
    var flags40 = d[0x40];
    var form = flags40 >>> 3;
    var tid = u16(d, 0x0C), sid = u16(d, 0x0E);
    var exp = u32(d, 0x10);
    var p = personalEntry(D, species, form);
    var growth = p ? p[9] : 0;
    var nature = pid % 25;

    var level;
    if (size === SIZE_PARTY && d[0x8C] >= 1 && d[0x8C] <= 100) level = d[0x8C];
    else level = levelFromExp(D, growth, exp);

    var moves = [], pp = [], ppUps = [];
    for (var m = 0; m < 4; m++) {
      var mv = u16(d, 0x28 + m * 2);
      if (!mv) continue;
      moves.push(mv);
      pp.push(d[0x30 + m]);
      ppUps.push(d[0x34 + m]);
    }

    var metExt = u16(d, 0x46), metDP = u16(d, 0x80);
    var eggExt = u16(d, 0x44), eggDP = u16(d, 0x7E);
    var isEgg = ((iv32 >>> 30) & 1) === 1;

    var mon = {
      where: where,
      pid: pid,
      species: species,
      form: form,
      item: u16(d, 0x0A),
      tid: tid,
      sid: sid,
      exp: exp,
      friendship: d[0x14],
      ability: d[0x15],
      language: d[0x17],
      ev: ev,
      iv: iv,
      moves: moves,
      pp: pp,
      ppUps: ppUps,
      isEgg: isEgg,
      isNicknamed: ((iv32 >>> 31) & 1) === 1,
      fateful: (flags40 & 1) === 1,
      gender: (flags40 >>> 1) & 3, // 0 ♂, 1 ♀, 2 geschlechtslos
      nickname: decodeString(D, d, 0x48, 22),
      version: d[0x5F],
      otName: decodeString(D, d, 0x68, 16),
      otGender: d[0x84] >>> 7,
      eggDate: d[0x78] ? [2000 + d[0x78], d[0x79], d[0x7A]] : null,
      metDate: d[0x7B] ? [2000 + d[0x7B], d[0x7C], d[0x7D]] : null,
      eggLocation: eggExt || eggDP,
      metLocation: metExt || metDP,
      metLevel: d[0x84] & 0x7F,
      pokerus: d[0x82],
      ball: Math.max(d[0x83], d[0x86]),
      encounterType: d[0x85],
      nature: nature,
      level: level,
      shiny: ((tid ^ sid ^ (pid >>> 16) ^ (pid & 0xFFFF)) >>> 0) < 8,
      growth: growth,
      types: p ? (p[6] === p[7] ? [p[6]] : [p[6], p[7]]) : [],
      base: p ? p.slice(0, 6) : [0, 0, 0, 0, 0, 0]
    };

    mon.expThis = (D.exp[growth] || D.exp[0])[level - 1];
    mon.expNext = level < 100 ? (D.exp[growth] || D.exp[0])[level] : null;

    if (size === SIZE_PARTY) {
      mon.status = u32(d, 0x88);
      mon.hp = u16(d, 0x8E);
      mon.stats = [u16(d, 0x90), u16(d, 0x92), u16(d, 0x94), u16(d, 0x96), u16(d, 0x98), u16(d, 0x9A)];
      // Ungültige Kampfwerte (sollte nicht vorkommen) → selbst berechnen
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
    // Bit-Reihenfolge der Kraftreserve: KP, Ang, Vert, Init, SpAng, SpVert
    mon.hiddenPower = { type: HP_TYPES[Math.floor(a * 15 / 63)], power: Math.floor(pw * 40 / 63) + 30 };
    return mon;
  }

  /* ── Spielstand lesen ──────────────────────────────────────────── */
  function parse(buffer, D) {
    D = D || (typeof window !== 'undefined' ? window.PT_DATA : null);
    if (!D) throw new Error('PT_DATA fehlt');
    var b = normalize(buffer);
    if (!b) return { ok: false, error: 'size', size: buffer.byteLength || buffer.length };

    var game = detect(b);
    if (game !== 'pt') return { ok: false, error: game ? 'game' : 'unknown', game: game ? GAMES[game].name : null };

    var gen = pickBlock(b, 0, PT.generalSize);
    var sto = pickBlock(b, PT.storageStart, PT.storageSize);
    var G = gen.offset, S = sto.offset;
    var T = G + PT.trainer;

    var badgesByte = b[T + 0x1A];
    var badges = [];
    for (var i = 0; i < 8; i++) badges.push(((badgesByte >> i) & 1) === 1);
    var progress = b[T + 0x1D];

    var trainer = {
      name: decodeString(D, b, T, 16),
      tid: u16(b, T + 0x10),
      sid: u16(b, T + 0x12),
      money: u32(b, T + 0x14),
      gender: b[T + 0x18],
      language: b[T + 0x19],
      badges: badges,
      badgeCount: badges.filter(Boolean).length,
      gameClear: (progress & 1) === 1,
      nationalDex: (progress & 2) === 2,
      coins: u16(b, T + 0x20),
      playTime: { h: u16(b, T + 0x22), m: b[T + 0x24], s: b[T + 0x25] },
      rival: decodeString(D, b, G + PT.rival, 14),
      started: u32(b, G + PT.adventure + 0x34),
      hallOfFame: u32(b, G + PT.adventure + 0x3C)
    };

    // Team
    var partyCount = Math.min(b[G + PT.party - 4], 6);
    var party = [], bad = [];
    for (var p = 0; p < partyCount; p++) {
      var mon = readPK4(D, b, G + PT.party + p * SIZE_PARTY, SIZE_PARTY, { area: 'party', slot: p });
      if (mon && mon.bad) bad.push(mon.where);
      else if (mon) party.push(mon);
    }

    // Boxen
    var boxes = [];
    for (var bx = 0; bx < BOX_COUNT; bx++) {
      var slots = [];
      for (var sl = 0; sl < BOX_SLOTS; sl++) {
        var off = S + 4 + (bx * BOX_SLOTS + sl) * SIZE_STORED;
        var m = readPK4(D, b, off, SIZE_STORED, { area: 'box', box: bx, slot: sl });
        if (m && m.bad) { bad.push(m.where); slots.push(null); }
        else slots.push(m);
      }
      boxes.push({
        name: decodeString(D, b, S + BOX_NAMES + bx * 40, 40),
        wallpaper: b[S + BOX_WALLPAPER + bx],
        slots: slots
      });
    }

    // Pension (2 Plätze à 236 Byte, die letzten 4 Byte = dort gesammelte EP)
    var daycare = [];
    for (var dc = 0; dc < 2; dc++) {
      var dOff = G + PT.daycare + dc * SIZE_PARTY;
      var dm = readPK4(D, b, dOff, SIZE_STORED, { area: 'daycare', slot: dc });
      if (dm && !dm.bad) {
        dm.daycareExp = u32(b, dOff + SIZE_PARTY - 4);
        var lvNow = levelFromExp(D, dm.growth, dm.exp + dm.daycareExp);
        dm.levelNow = lvNow;
        daycare.push(dm);
      }
    }

    // Pokédex
    var X = G + PT.dex;
    function flag(region, species) {
      var idx = species - 1;
      return ((b[X + 4 + region * 0x40 + (idx >> 3)] >> (idx & 7)) & 1) === 1;
    }
    var caught = [], seen = [];
    for (var sp = 1; sp <= 493; sp++) {
      if (flag(0, sp)) caught.push(sp);
      if (flag(1, sp)) seen.push(sp);
    }
    var caughtSet = new Set(caught), seenSet = new Set(seen);
    var sinnoh = D.sinnohDex;
    var dex = {
      caught: caught,
      seen: seen,
      sinnohCaught: sinnoh.filter(function (s) { return caughtSet.has(s); }).length,
      sinnohSeen: sinnoh.filter(function (s) { return seenSet.has(s); }).length,
      sinnohTotal: sinnoh.length
    };

    return {
      ok: true,
      game: 'pt',
      checksums: { general: gen.valid, storage: sto.valid, fallback: gen.fallback || sto.fallback },
      currentBox: b[S],
      trainer: trainer,
      party: party,
      boxes: boxes,
      daycare: daycare,
      dex: dex,
      badSlots: bad
    };
  }

  /* ── Für den Editor (pt-bag.js) ────────────────────────────────── */
  // Aktueller General-Block: bytes ist eine Sicht auf die 512 KB innerhalb der Datei (Änderungen
  // landen also direkt in der Datei, auch bei .dsv mit DeSmuME-Anhang).
  function generalBlock(buffer) {
    var b = normalize(buffer);
    if (!b || detect(b) !== 'pt') return null;
    var g = pickBlock(b, 0, PT.generalSize);
    return { bytes: b, offset: g.offset, size: PT.generalSize, valid: g.valid };
  }
  // Aktueller Storage-Block (PC-Boxen), wie generalBlock
  function storageBlock(buffer) {
    var b = normalize(buffer);
    if (!b || detect(b) !== 'pt') return null;
    var s = pickBlock(b, PT.storageStart, PT.storageSize);
    return { bytes: b, offset: s.offset, size: PT.storageSize, valid: s.valid };
  }
  // Prüfsumme eines Blocks neu berechnen (CRC16 über die Daten ohne Footer, steht in den letzten 2 Byte)
  function writeChecksum(b, start, length) {
    var c = crc16(b, start, start + length - 0x14);
    b[start + length - 2] = c & 0xFF;
    b[start + length - 1] = c >>> 8;
  }
  // Gegenstück zu decryptPK4: Prüfsumme setzen, Blöcke zurücksortieren, verschlüsseln (136 oder 236 Byte)
  function encryptPK4(dec) {
    var d = new Uint8Array(dec);
    var sum = 0;
    for (var j = 8; j < SIZE_STORED; j += 2) sum = (sum + u16(d, j)) & 0xFFFF;
    d[6] = sum & 0xFF;
    d[7] = sum >>> 8;
    var pid = u32(d, 0), sv = (pid >>> 13) & 31;
    var out = new Uint8Array(d);
    for (var k = 0; k < 4; k++) {
      var to = 8 + BLOCK_POSITION[sv * 4 + k] * 32;
      out.set(d.subarray(8 + k * 32, 8 + k * 32 + 32), to);
    }
    crypt(out, 8, SIZE_STORED, sum);
    if (out.length > SIZE_STORED) crypt(out, SIZE_STORED, out.length, pid);
    return out;
  }

  return {
    parse: parse,
    calcStats: calcStats,
    levelFromExp: levelFromExp,
    generalBlock: generalBlock,
    storageBlock: storageBlock,
    writeChecksum: writeChecksum,
    decryptPK4: decryptPK4,
    encryptPK4: encryptPK4,
    LAYOUT: { party: PT.party, trainer: PT.trainer, boxCount: BOX_COUNT, boxSlots: BOX_SLOTS, sizeStored: SIZE_STORED, sizeParty: SIZE_PARTY },
    // für Tests
    _internal: { crypt: crypt, crc16: crc16, decryptPK4: decryptPK4, BLOCK_POSITION: BLOCK_POSITION, normalize: normalize, detect: detect }
  };
});

