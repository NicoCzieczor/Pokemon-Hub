/*
 * oras-edit.js – Pokémon und Geld in einem Spielstand von Omega Rubin / Alpha Saphir ändern (für den Save-Editor).
 *
 * Gegenstück zu pt-edit.js mit derselben Schnittstelle. Ein Pokémon wird entschlüsselt (OrasSave.decryptPK6),
 * geändert, wieder verschlüsselt und an dieselbe Stelle geschrieben; danach bekommt sein Block eine neue
 * Prüfsumme im Block-Verzeichnis. Geändert wird immer eine Kopie der Datei.
 *
 * Offsets im Pokémon (entschlüsselt, PKHeX PK6): 0x0A Item, 0x14 Fähigkeit, 0x15 Fähigkeits-Platz (1/2/4),
 * 0x1C Wesen, 0x1D Geschlecht/Form, 0x5A Attacken (4 × u16), 0x62 AP, 0x66 AP-Plus, 0x74 DVs,
 * 0xA2/0xCA Freundschaft (Halter/Originaltrainer). Geld: u32 bei 0x4208. Münzen gibt es nicht.
 * Benötigt OrasSave (oras-save.js) und für die AP der Attacken ORAS_DATA.moveInfo.
 */
(function (root, factory) {
  var api = factory(root.OrasSave || (typeof require === 'function' ? require('./oras-save.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OrasEdit = api;
})(this, function (OrasSave) {
  'use strict';

  var MAX_MONEY = 9999999;
  var MAX_COINS = 0;
  var MAX_FRIENDSHIP = 255;
  var L = OrasSave.LAYOUT;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function w16(b, o, v) { b[o] = v & 0xFF; b[o + 1] = (v >>> 8) & 0xFF; }
  function w32(b, o, v) { b[o] = v & 0xFF; b[o + 1] = (v >>> 8) & 0xFF; b[o + 2] = (v >>> 16) & 0xFF; b[o + 3] = (v >>> 24) & 0xFF; }
  function fail(code, msg) { var e = new Error(msg); e.code = code; return e; }
  function copyOf(buffer) { return new Uint8Array(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer)); }

  function place(b, where) {
    var off, size;
    if (where.area === 'party') { off = L.party + where.slot * L.sizeParty; size = L.sizeParty; }
    else if (where.area === 'box') { off = L.box + (where.box * L.boxSlots + where.slot) * L.sizeStored; size = L.sizeStored; }
    else return null;
    var block = OrasSave.blockAt(b, off);
    return block && { block: block, offset: off, size: size };
  }

  function readMon(buffer, where) {
    var b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    var p = place(b, where);
    if (!p) return null;
    var r = OrasSave.decryptPK6(b, p.offset, p.size);
    return r && r.checksumOk ? r.data : null;
  }

  function editMon(buffer, where, fn) {
    var copy = copyOf(buffer);
    var p = place(copy, where);
    if (!p) throw new Error('Kein Spielstand von Omega Rubin / Alpha Saphir');
    if (!p.block.valid) throw new Error('Dieser Teil des Spielstands ist beschädigt');
    var r = OrasSave.decryptPK6(copy, p.offset, p.size);
    if (!r || !r.checksumOk) throw new Error('Pokémon nicht lesbar');
    fn(r.data);
    copy.set(OrasSave.encryptPK6(r.data), p.offset);
    OrasSave.writeChecksum(copy, p.block);
    return copy;
  }

  function setMoves(d, moves, moveInfo) {
    var old = [];
    for (var i = 0; i < 4; i++) old.push({ id: u16(d, 0x5A + i * 2), pp: d[0x62 + i], up: d[0x66 + i] });
    var list = moves.filter(function (m) { return m > 0; }).slice(0, 4);
    for (var k = 0; k < 4; k++) {
      var id = list[k] || 0;
      var keep = id ? old.filter(function (o) { return o.id === id; })[0] : null;
      w16(d, 0x5A + k * 2, id);
      d[0x62 + k] = keep ? keep.pp : id ? ((moveInfo[id] && moveInfo[id][1]) || 0) : 0;
      d[0x66 + k] = keep ? keep.up : 0;
    }
  }
  function setItem(d, id) { w16(d, 0x0A, id); }
  function setFriendship(d, v) { d[OrasSave.friendshipAt(d)] = Math.max(0, Math.min(MAX_FRIENDSHIP, Math.round(v))); }
  // Item, Freundschaft und Attacken von od (Originalzustand) zurückholen – „Zurücksetzen“ im Editor
  function restore(d, od) {
    d.set(od.subarray(0x0A, 0x0C), 0x0A);
    d[0xA2] = od[0xA2]; d[0xCA] = od[0xCA];
    d.set(od.subarray(0x5A, 0x6A), 0x5A);
  }

  function setMoney(buffer, v) {
    var copy = copyOf(buffer), at = L.misc + 0x08;
    var block = OrasSave.blockAt(copy, at);
    if (!block) throw new Error('Kein Spielstand von Omega Rubin / Alpha Saphir');
    if (!block.valid) throw new Error('Dieser Teil des Spielstands ist beschädigt');
    w32(copy, at, Math.max(0, Math.min(MAX_MONEY, Math.round(v))));
    OrasSave.writeChecksum(copy, block);
    return copy;
  }
  function setCoins(buffer) { return copyOf(buffer); }

  /* ── Verschieben ───────────────────────────────────────────────── */
  // Team-Pokémon haben 28 Byte Kampfdaten mehr (0xE8 Status, 0xEC Level, 0xF0 KP, 0xF2 Werte). Beim Ablegen fallen sie
  // weg; beim Holen ins Team werden sie neu berechnet (volle KP).
  var MAIL_FIRST = 137, MAIL_LAST = 148;
  function toStored(dec) { return dec.slice(0, L.sizeStored); }
  function toParty(dec, D) {
    var d = new Uint8Array(L.sizeParty);
    d.set(dec.subarray(0, L.sizeStored));
    var species = u16(d, 0x08), iv32 = u32(d, 0x74);
    var p = OrasSave.personalEntry(D, species, d[0x1D] >>> 3);
    var level = OrasSave.levelFromExp(D, p ? p[9] : 0, u32(d, 0x10));
    var iv = [0, 5, 10, 15, 20, 25].map(function (s) { return (iv32 >>> s) & 31; });
    var ev = [d[0x1E], d[0x1F], d[0x20], d[0x21], d[0x22], d[0x23]];
    var stats = OrasSave.calcStats(p ? p.slice(0, 6) : [0, 0, 0, 0, 0, 0], iv, ev, level, d[0x1C] % 25, species);
    d[0xEC] = level;
    w16(d, 0xF0, stats[0]);
    for (var i = 0; i < 6; i++) w16(d, 0xF2 + i * 2, stats[i]);
    return d;
  }
  // Leerer Platz wie im Spiel: ein verschlüsseltes Pokémon aus lauter Nullen
  function blank(size) { return OrasSave.encryptPK6(new Uint8Array(size)); }
  var isEgg = function (d) { return ((u32(d, 0x74) >>> 30) & 1) === 1; };
  var canBattle = function (d) { return !isEgg(d) && u16(d, 0xF0) > 0; };
  var hasMail = function (d) { var it = u16(d, 0x0A); return it >= MAIL_FIRST && it <= MAIL_LAST; };

  function openSlots(buffer, party, box) {
    var copy = copyOf(buffer);
    var g = OrasSave.blockAt(copy, L.party), s = OrasSave.blockAt(copy, L.box);
    if (!g || !s) throw new Error('Kein Spielstand von Omega Rubin / Alpha Saphir');
    if ((party && !g.valid) || (box && !s.valid)) throw fail('broken', 'Dieser Teil des Spielstands ist beschädigt');
    var team = [];
    for (var i = 0; party && i < Math.min(copy[L.partyCount], 6); i++) {
      var r = OrasSave.decryptPK6(copy, L.party + i * L.sizeParty, L.sizeParty);
      if (!r || !r.checksumOk || !u16(r.data, 0x08)) throw fail('broken', 'Ein Team-Pokémon ist nicht lesbar');
      team.push(r.data);
    }
    var boxOff = function (w) { return L.box + (w.box * L.boxSlots + w.slot) * L.sizeStored; };
    return {
      copy: copy, team: team,
      read: function (w) {
        var r = OrasSave.decryptPK6(copy, boxOff(w), L.sizeStored);
        if (r && !r.checksumOk) throw fail('broken', 'Ein Box-Pokémon ist nicht lesbar');
        return r && u16(r.data, 0x08) ? r.data : null;
      },
      write: function (w, dec) { copy.set(dec ? OrasSave.encryptPK6(dec) : blank(L.sizeStored), boxOff(w)); },
      commit: function (keepRule) {
        if (party) {
          if (!keepRule && !team.some(canBattle)) throw fail('last', 'Kein kampffähiges Pokémon im Team');
          for (var k = 0; k < 6; k++) copy.set(k < team.length ? OrasSave.encryptPK6(team[k]) : blank(L.sizeParty), L.party + k * L.sizeParty);
          copy[L.partyCount] = team.length;
          OrasSave.writeChecksum(copy, g);
        }
        if (box) OrasSave.writeChecksum(copy, s);
        return copy;
      }
    };
  }

  // Wie PtEdit.moveMon: Team ↔ Box, Box ↔ Box, Reihenfolge im Team; belegtes Ziel = tauschen. Fehler-Codes gleich.
  function moveMon(buffer, from, to, D) {
    var party = from.area === 'party' || to.area === 'party', box = from.area === 'box' || to.area === 'box';
    var io = openSlots(buffer, party, box), team = io.team;
    if (from.area === to.area && from.slot === to.slot && from.box === to.box) throw fail('same', 'Gleicher Platz');
    var where;
    if (from.area === 'party' && !team[from.slot]) throw fail('empty', 'Kein Pokémon');
    if (from.area === 'party' && to.area === 'party') {
      if (to.slot < team.length) { var t = team[to.slot]; team[to.slot] = team[from.slot]; team[from.slot] = t; where = to; }
      else { team.push(team.splice(from.slot, 1)[0]); where = { area: 'party', slot: team.length - 1 }; }
    } else if (from.area === 'party') {
      var mon = team[from.slot], other = io.read(to);
      if (hasMail(mon)) throw fail('mail', 'Pokémon mit Brief');
      if (other) team[from.slot] = toParty(other, D); else team.splice(from.slot, 1);
      io.write(to, toStored(mon));
      where = to;
    } else if (to.area === 'party') {
      var got = io.read(from);
      if (!got) throw fail('empty', 'Kein Pokémon');
      if (to.slot < team.length) {
        if (hasMail(team[to.slot])) throw fail('mail', 'Pokémon mit Brief');
        io.write(from, toStored(team[to.slot]));
        team[to.slot] = toParty(got, D);
        where = to;
      } else {
        if (team.length >= 6) throw fail('full', 'Team voll');
        io.write(from, null);
        team.push(toParty(got, D));
        where = { area: 'party', slot: team.length - 1 };
      }
    } else {
      var a = io.read(from), b = io.read(to);
      if (!a) throw fail('empty', 'Kein Pokémon');
      io.write(to, a);
      io.write(from, b);
      where = to;
    }
    return { bytes: io.commit(), where: where };
  }

  function releaseMon(buffer, from) {
    var io = openSlots(buffer, from.area === 'party', from.area === 'box');
    if (from.area === 'party') {
      if (!io.team[from.slot]) throw fail('empty', 'Kein Pokémon');
      io.team.splice(from.slot, 1);
    } else {
      if (!io.read(from)) throw fail('empty', 'Kein Pokémon');
      io.write(from, null);
    }
    return { bytes: io.commit() };
  }

  /* ── Neues Pokémon ─────────────────────────────────────────────── */
  // opts wie bei PtEdit.createMon: species, level, moves, ivs 'random'|'perfect', nature, gender (0 ♂, 1 ♀),
  // ability (0/1 = Platz 1/2, 2 = versteckte Fähigkeit), shiny, ball (1–16), location, date [J, M, T], rand
  var LANG_KEY = { 5: 'de' };
  function createMon(buffer, opts, D) {
    var b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (!OrasSave.detect(b)) throw new Error('Kein Spielstand von Omega Rubin / Alpha Saphir');
    var rand = opts.rand || Math.random, T = L.trainer;
    var tid = u16(b, T), sid = u16(b, T + 2), version = b[T + 4] || 27, otGender = b[T + 5] & 1, language = b[T + 0x2D] || 5;
    var species = opts.species, level = Math.max(1, Math.min(100, Math.round(opts.level) || 1));
    var p = OrasSave.personalEntry(D, species, 0);
    if (!p || species < 1 || species > D.speciesCount) throw new Error('Unbekannte Art');

    var r16 = function () { return Math.floor(rand() * 0x10000); };
    var ec = ((r16() << 16) | r16()) >>> 0, pid = 0;
    for (var n = 0; n < 100000; n++) {
      var lo = r16(), hi = opts.shiny ? ((tid ^ sid ^ lo ^ Math.floor(rand() * 16)) & 0xFFFF) : r16();
      pid = ((hi << 16) | lo) >>> 0;
      if (!!opts.shiny === (((tid ^ sid ^ hi ^ lo) >>> 0) < 16)) break;
    }
    var ratio = p[8];
    var gender = ratio === 255 ? 2 : ratio === 254 ? 1 : ratio === 0 ? 0 :
      (opts.gender != null ? opts.gender : (Math.floor(rand() * 252) + 1 < ratio ? 1 : 0));
    var slot = opts.ability === 2 && p[14] ? 2 : opts.ability === 1 && p[11] && p[11] !== p[10] ? 1 : opts.ability != null ? 0 : (p[11] && p[11] !== p[10] && rand() < 0.5 ? 1 : 0);
    var abil = [p[10], p[11], p[14]][slot] || p[10];

    var d = new Uint8Array(L.sizeStored);
    w32(d, 0, ec);
    w16(d, 0x08, species);
    w16(d, 0x0C, tid);
    w16(d, 0x0E, sid);
    w32(d, 0x10, (D.exp[p[9]] || D.exp[0])[level - 1]);
    d[0x14] = abil;
    d[0x15] = 1 << slot;
    w32(d, 0x18, pid);
    d[0x1C] = opts.nature != null ? opts.nature : Math.floor(rand() * 25);
    d[0x1D] = gender << 1;
    var names = D.text[LANG_KEY[language] || 'en'].species;
    d.set(OrasSave.encodeString(names[species], 26, 12), 0x40);
    setMoves(d, (opts.moves && opts.moves.length ? opts.moves : [33]).slice(0, 4), D.moveInfo);
    var iv = [0, 1, 2, 3, 4, 5].map(function () { return opts.ivs === 'perfect' ? 31 : Math.floor(rand() * 32); });
    w32(d, 0x74, iv.reduce(function (v, x, i) { return v | (x << (i * 5)); }, 0) >>> 0);
    d.set(b.subarray(T + 0x48, T + 0x48 + 26), 0xB0);       // Originaltrainer wie im Spielstand
    d[0xCA] = 70;                                            // Freundschaft wie die meisten frisch gefangenen
    var date = opts.date || (function (t) { return [t.getFullYear(), t.getMonth() + 1, t.getDate()]; })(new Date());
    d[0xD4] = date[0] - 2000; d[0xD5] = date[1]; d[0xD6] = date[2];
    w16(d, 0xDA, opts.location || 0);
    d[0xDC] = opts.ball >= 1 && opts.ball <= 16 ? opts.ball : 4;
    d[0xDD] = (level & 0x7F) | (otGender << 7);
    d[0xDF] = version;
    d[0xE0] = b[T + 0x27]; d[0xE1] = b[T + 0x26]; d[0xE2] = b[T + 0x2C]; d[0xE3] = language;
    return d;
  }

  // Wie PtEdit.addMon: auf einen freien Platz legen und im Pokédex als gesehen + gefangen eintragen.
  // Pokédex: gefangen @+8, gesehen @+0x68 und angezeigt @+0x1E8 (je 4 × 0x60: ♂, ♀, schillernd ♂, schillernd ♀),
  // Sprachen ab +0x400 (7 Bit je Art: JPN, ENG, FRA, ITA, GER, SPA, KOR).
  var LANG_BIT = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 7: 5, 8: 6 };
  function addMon(buffer, to, dec, D) {
    var io = openSlots(buffer, true, to.area === 'box'), team = io.team, where = to;
    if (to.area === 'party') {
      if (team.length >= 6) throw fail('full', 'Team voll');
      team.push(toParty(dec, D));
      where = { area: 'party', slot: team.length - 1 };
    } else {
      if (io.read(to)) throw fail('taken', 'Platz belegt');
      io.write(to, dec);
    }
    var b = io.copy, X = L.dex, i = u16(dec, 0x08) - 1, at = i >> 3, bit = 1 << (i & 7);
    var tid = u16(dec, 0x0C), sid = u16(dec, 0x0E), pid = u32(dec, 0x18);
    var shiny = ((tid ^ sid ^ (pid >>> 16) ^ (pid & 0xFFFF)) >>> 0) < 16, female = ((dec[0x1D] >> 1) & 3) === 1;
    var k = (shiny ? 2 : 0) + (female ? 1 : 0);
    var anySeen = [0, 1, 2, 3].some(function (r) { return b[X + 0x68 + r * 0x60 + at] & bit; });
    b[X + 8 + at] |= bit;
    b[X + 0x68 + k * 0x60 + at] |= bit;
    if (!anySeen) b[X + 0x1E8 + k * 0x60 + at] |= bit;
    var lb = LANG_BIT[dec[0xE3]];
    if (lb != null) { var li = i * 7 + lb; b[X + 0x400 + (li >> 3)] |= 1 << (li & 7); }
    var dexBlock = OrasSave.blockAt(b, X);
    var out = io.commit(true);
    OrasSave.writeChecksum(out, dexBlock);
    return { bytes: out, where: where };
  }

  return {
    MAX_MONEY: MAX_MONEY,
    MAX_COINS: MAX_COINS,
    MAX_FRIENDSHIP: MAX_FRIENDSHIP,
    readMon: readMon,
    editMon: editMon,
    moveMon: moveMon,
    releaseMon: releaseMon,
    createMon: createMon,
    addMon: addMon,
    setMoves: setMoves,
    setItem: setItem,
    setFriendship: setFriendship,
    restore: restore,
    setMoney: setMoney,
    setCoins: setCoins
  };
});
