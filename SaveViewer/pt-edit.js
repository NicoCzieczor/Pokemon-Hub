/*
 * pt-edit.js – Pokémon, Geld und Münzen in einem Platin-Spielstand ändern (für den Save-Editor).
 *
 * Ein Pokémon wird entschlüsselt (PtSave.decryptPK4), geändert, wieder verschlüsselt (PtSave.encryptPK4)
 * und an dieselbe Stelle geschrieben. Danach wird die Prüfsumme des Blocks neu berechnet – Team und
 * Geld liegen im General-Block, die Boxen im Storage-Block. Geändert wird immer eine Kopie der Datei;
 * sie behält ihr Format (.sav, .dsv mit DeSmuME-Anhang …).
 *
 * Offsets im Pokémon (entschlüsselt) nach PKHeX (PK4): 0x0A Item, 0x14 Freundschaft,
 * 0x28 Attacken (4 × u16), 0x30 AP, 0x34 AP-Plus. Trainer: 0x14 Geld (u32), 0x20 Münzen (u16).
 * Benötigt PtSave (pt-save.js) und für die AP der Attacken PT_DATA.moveInfo.
 */
(function (root, factory) {
  var api = factory(root.PtSave || (typeof require === 'function' ? require('./pt-save.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PtEdit = api;
})(this, function (PtSave) {
  'use strict';

  var MAX_MONEY = 999999;
  var MAX_COINS = 50000;
  var MAX_FRIENDSHIP = 255;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function w16(b, o, v) { b[o] = v & 0xFF; b[o + 1] = (v >>> 8) & 0xFF; }
  function w32(b, o, v) { b[o] = v & 0xFF; b[o + 1] = (v >>> 8) & 0xFF; b[o + 2] = (v >>> 16) & 0xFF; b[o + 3] = (v >>> 24) & 0xFF; }

  // Wo liegt das Pokémon? where wie in PtSave.parse: { area: 'party', slot } oder { area: 'box', box, slot }
  function place(buffer, where) {
    var L = PtSave.LAYOUT;
    if (where.area === 'party') {
      var g = PtSave.generalBlock(buffer);
      return g && { block: g, offset: g.offset + L.party + where.slot * L.sizeParty, size: L.sizeParty };
    }
    if (where.area === 'box') {
      var s = PtSave.storageBlock(buffer);
      return s && { block: s, offset: s.offset + 4 + (where.box * L.boxSlots + where.slot) * L.sizeStored, size: L.sizeStored };
    }
    return null;
  }

  // Entschlüsselte Daten (136 bzw. 236 Byte) oder null
  function readMon(buffer, where) {
    var b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    var p = place(b, where);
    if (!p) return null;
    var r = PtSave.decryptPK4(p.block.bytes, p.offset, p.size);
    return r && r.checksumOk ? r.data : null;
  }

  // Neue Datei, in der fn(daten) das Pokémon geändert hat
  function editMon(buffer, where, fn) {
    var copy = new Uint8Array(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
    var p = place(copy, where);
    if (!p) throw new Error('Kein Platin-Spielstand');
    // Beschädigter Block: nicht ändern – die neue Prüfsumme würde die übrigen kaputten Daten als gültig ausgeben
    if (!p.block.valid) throw new Error('Dieser Teil des Spielstands ist beschädigt');
    var r = PtSave.decryptPK4(p.block.bytes, p.offset, p.size);
    if (!r || !r.checksumOk) throw new Error('Pokémon nicht lesbar');
    fn(r.data);
    p.block.bytes.set(PtSave.encryptPK4(r.data), p.offset);
    PtSave.writeChecksum(p.block.bytes, p.block.offset, p.block.size);
    return copy;
  }

  // Attacken setzen: Liste mit bis zu 4 Nummern, leere werden nach hinten geschoben.
  // Behaltene Attacken behalten AP und AP-Plus, neue bekommen volle AP (moveInfo[id][1]).
  function setMoves(d, moves, moveInfo) {
    var old = [];
    for (var i = 0; i < 4; i++) old.push({ id: u16(d, 0x28 + i * 2), pp: d[0x30 + i], up: d[0x34 + i] });
    var list = moves.filter(function (m) { return m > 0; }).slice(0, 4);
    for (var k = 0; k < 4; k++) {
      var id = list[k] || 0;
      var keep = id ? old.filter(function (o) { return o.id === id; })[0] : null;
      w16(d, 0x28 + k * 2, id);
      d[0x30 + k] = keep ? keep.pp : id ? ((moveInfo[id] && moveInfo[id][1]) || 0) : 0;
      d[0x34 + k] = keep ? keep.up : 0;
    }
  }
  function setItem(d, id) { w16(d, 0x0A, id); }
  function setFriendship(d, v) { d[0x14] = Math.max(0, Math.min(MAX_FRIENDSHIP, Math.round(v))); }

  // Geld bzw. Münzen im Trainer-Bereich des General-Blocks
  function editTrainer(buffer, fn) {
    var copy = new Uint8Array(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
    var g = PtSave.generalBlock(copy);
    if (!g) throw new Error('Kein Platin-Spielstand');
    if (!g.valid) throw new Error('Dieser Teil des Spielstands ist beschädigt');
    fn(g.bytes, g.offset + PtSave.LAYOUT.trainer);
    PtSave.writeChecksum(g.bytes, g.offset, g.size);
    return copy;
  }
  function setMoney(buffer, v) {
    return editTrainer(buffer, function (b, t) { w32(b, t + 0x14, Math.max(0, Math.min(MAX_MONEY, Math.round(v)))); });
  }
  function setCoins(buffer, v) {
    return editTrainer(buffer, function (b, t) { w16(b, t + 0x20, Math.max(0, Math.min(MAX_COINS, Math.round(v)))); });
  }

  /* ── Verschieben: Team ↔ Box, Box ↔ Box, Reihenfolge im Team ─────── */
  // Team-Pokémon haben 100 Byte Kampfdaten mehr (0x88 Status, 0x8C Level, 0x8E KP, 0x90 Werte, danach Brief und
  // Siegel). Beim Ablegen fallen sie weg wie im Spiel; beim Holen ins Team werden sie neu berechnet (volle KP).
  var MAIL_FIRST = 137, MAIL_LAST = 148;   // Briefe (Gen 4) – ihr Text steht in den Team-Daten
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }
  function fail(code, msg) { var e = new Error(msg); e.code = code; return e; }

  function toStored(dec) { return dec.slice(0, PtSave.LAYOUT.sizeStored); }
  function toParty(dec, D) {
    var L = PtSave.LAYOUT, d = new Uint8Array(L.sizeParty);
    d.set(dec.subarray(0, L.sizeStored));
    var species = u16(d, 0x08), iv32 = u32(d, 0x38);
    var p = PtSave.personalEntry(D, species, d[0x40] >>> 3);
    var level = PtSave.levelFromExp(D, p ? p[9] : 0, u32(d, 0x10));
    var iv = [0, 5, 10, 15, 20, 25].map(function (s) { return (iv32 >>> s) & 31; });
    var ev = [d[0x18], d[0x19], d[0x1A], d[0x1B], d[0x1C], d[0x1D]];
    var stats = PtSave.calcStats(p ? p.slice(0, 6) : [0, 0, 0, 0, 0, 0], iv, ev, level, u32(d, 0) % 25, species);
    d[0x8C] = level;
    w16(d, 0x8E, stats[0]);
    for (var i = 0; i < 6; i++) w16(d, 0x90 + i * 2, stats[i]);
    return d;
  }
  // Leerer Platz: so schreibt ihn auch das Spiel – ein verschlüsseltes Pokémon aus lauter Nullen (Art 0).
  // Nur Nullen in der Datei würden beim Entschlüsseln eine falsche Prüfsumme ergeben (im Spiel ein „Bad Egg“).
  function blank(size) { return PtSave.encryptPK4(new Uint8Array(size)); }
  var isEgg = function (d) { return ((u32(d, 0x38) >>> 30) & 1) === 1; };
  var canBattle = function (d) { return !isEgg(d) && u16(d, 0x8E) > 0; };
  var hasMail = function (d) { var it = u16(d, 0x0A); return it >= MAIL_FIRST && it <= MAIL_LAST; };

  // Team und Boxen einer Kopie der Datei zum Ändern öffnen. team = entschlüsselte Team-Pokémon (236 Byte),
  // box.read/write für einzelne Plätze; commit() schreibt Team, Anzahl und Prüfsummen zurück.
  function openSlots(buffer, party, box) {
    var copy = new Uint8Array(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
    var L = PtSave.LAYOUT;
    var g = PtSave.generalBlock(copy), s = PtSave.storageBlock(copy);
    if (!g || !s) throw new Error('Kein Platin-Spielstand');
    if ((party && !g.valid) || (box && !s.valid)) throw fail('broken', 'Dieser Teil des Spielstands ist beschädigt');
    var countAt = g.offset + L.party - 4, team = [];
    for (var i = 0; party && i < Math.min(g.bytes[countAt], 6); i++) {
      var r = PtSave.decryptPK4(g.bytes, g.offset + L.party + i * L.sizeParty, L.sizeParty);
      if (!r || !r.checksumOk || !u16(r.data, 0x08)) throw fail('broken', 'Ein Team-Pokémon ist nicht lesbar');
      team.push(r.data);
    }
    var boxOff = function (w) { return s.offset + 4 + (w.box * L.boxSlots + w.slot) * L.sizeStored; };
    return {
      copy: copy, g: g, team: team,
      read: function (w) {
        var r = PtSave.decryptPK4(s.bytes, boxOff(w), L.sizeStored);
        if (r && !r.checksumOk) throw fail('broken', 'Ein Box-Pokémon ist nicht lesbar');
        return r && u16(r.data, 0x08) ? r.data : null;   // Art 0 = leerer Platz
      },
      write: function (w, dec) { s.bytes.set(dec ? PtSave.encryptPK4(dec) : blank(L.sizeStored), boxOff(w)); },
      commit: function (keepRule) {
        if (party) {
          if (!keepRule && !team.some(canBattle)) throw fail('last', 'Kein kampffähiges Pokémon im Team');
          for (var k = 0; k < 6; k++) {
            g.bytes.set(k < team.length ? PtSave.encryptPK4(team[k]) : blank(L.sizeParty), g.offset + L.party + k * L.sizeParty);
          }
          g.bytes[countAt] = team.length;
          PtSave.writeChecksum(g.bytes, g.offset, g.size);
        }
        if (box) PtSave.writeChecksum(s.bytes, s.offset, s.size);
        return copy;
      }
    };
  }

  // Pokémon von from nach to (where wie in PtSave.parse). Ist to belegt, wird getauscht. Das Team bleibt
  // lückenlos – ein Team-Platz hinter dem letzten heißt „ans Ende“. Regeln wie im Spiel: höchstens 6 im Team,
  // mindestens ein kampffähiges Pokémon (kein Ei, KP > 0) bleibt dort, Pokémon mit Brief kommen nicht in die Box.
  // → { bytes: neue Datei, where: neuer Platz des Pokémon }. Fehler haben einen code: same, empty, full, last,
  // mail, broken.
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

  // Freilassen: der Platz wird leer, das Team rückt auf. Auch hier bleibt ein kampffähiges Pokémon im Team.
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
  // Namen stehen im Spiel in Großbuchstaben, kodiert über die Zeichentabelle (PT_DATA.chars, Index = Code),
  // mit 0xFFFF als Ende und Nullen dahinter (wie in echten Spielständen).
  function encodeName(D, text, bytes) {
    var map = D._charCodes;
    if (!map) {
      map = D._charCodes = {};
      for (var i = 0; i < D.chars.length; i++) { var c = D.chars.charAt(i); if (c !== '￿' && !(c in map)) map[c] = i; }
    }
    var out = new Uint8Array(bytes), o = 0;
    String(text).replace(/’/g, "'").split('').forEach(function (ch) {
      if (o + 4 > bytes || !(ch in map)) return;
      w16(out, o, map[ch]);
      o += 2;
    });
    w16(out, o, 0xFFFF);
    return out;
  }

  // Neues Pokémon (entschlüsselt, 136 Byte); Trainer (OT, ID, Sprache) aus dem Spielstand.
  // opts: species, level, moves [ids], ivs 'random'|'perfect', nature (0–24), gender (0 ♂, 1 ♀), ability (0/1),
  // shiny, ball (Item 1–16), location (Fangort-ID), date [J, M, T], rand (Zufall 0–1, für Tests)
  function createMon(buffer, opts, D) {
    var L = PtSave.LAYOUT, rand = opts.rand || Math.random;
    var g = PtSave.generalBlock(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
    if (!g) throw new Error('Kein Platin-Spielstand');
    var T = g.offset + L.trainer, tid = u16(g.bytes, T + 0x10), sid = u16(g.bytes, T + 0x12);
    var otGender = g.bytes[T + 0x18] & 1, language = g.bytes[T + 0x19] || 5;
    var species = opts.species, level = Math.max(1, Math.min(100, Math.round(opts.level) || 1));
    var p = PtSave.personalEntry(D, species, 0);
    if (!p || species < 1 || species > 493) throw new Error('Unbekannte Art');

    // PID passend zu Wesen, Geschlecht, Fähigkeit und Shiny suchen (Shiny: obere Hälfte daraus berechnen)
    var ratio = p[8], abil = [p[10], p[11]], two = !!p[11] && p[11] !== p[10];
    var mixed = ratio > 0 && ratio < 254;
    var genderOf = function (pid) { return ratio === 255 ? 2 : ratio === 254 ? 1 : ratio === 0 ? 0 : ((pid & 0xFF) < ratio ? 1 : 0); };
    var r16 = function () { return Math.floor(rand() * 0x10000); };
    var pid = 0;
    for (var n = 0; n < 2000000; n++) {
      var lo = r16(), hi = opts.shiny ? ((tid ^ sid ^ lo ^ Math.floor(rand() * 8)) & 0xFFFF) : r16();
      pid = ((hi << 16) | lo) >>> 0;
      var shiny = ((tid ^ sid ^ hi ^ lo) >>> 0) < 8;
      if (!!opts.shiny !== shiny) continue;
      if (opts.nature != null && pid % 25 !== opts.nature) continue;
      if (opts.gender != null && mixed && genderOf(pid) !== opts.gender) continue;
      if (opts.ability != null && two && (pid & 1) !== opts.ability) continue;
      break;
    }

    var d = new Uint8Array(L.sizeStored);
    w32(d, 0, pid);
    w16(d, 0x08, species);
    w16(d, 0x0C, tid);
    w16(d, 0x0E, sid);
    w32(d, 0x10, (D.exp[p[9]] || D.exp[0])[level - 1]);
    d[0x14] = 70;                                            // Freundschaft wie die meisten frisch gefangenen
    d[0x15] = two ? abil[pid & 1] : abil[0];
    d[0x17] = language;
    var moves = (opts.moves && opts.moves.length ? opts.moves : [33]).slice(0, 4);
    setMoves(d, moves, D.moveInfo);
    var iv = [0, 1, 2, 3, 4, 5].map(function () { return opts.ivs === 'perfect' ? 31 : Math.floor(rand() * 32); });
    w32(d, 0x38, iv.reduce(function (v, x, i) { return v | (x << (i * 5)); }, 0) >>> 0);
    d[0x40] = genderOf(pid) << 1;
    var loc = opts.location || 0;
    w16(d, 0x46, loc);                                       // Fangort (Platin) …
    w16(d, 0x80, loc);                                       // … und für Diamant/Perl
    var names = D.text[language === 5 ? 'de' : 'en'].species;
    d.set(encodeName(D, names[species].toUpperCase(), 22), 0x48);
    d[0x5F] = 12;                                            // Herkunft: Platin
    d.set(g.bytes.subarray(T, T + 16), 0x68);                // OT-Name wie im Spielstand
    var date = opts.date || (function (t) { return [t.getFullYear(), t.getMonth() + 1, t.getDate()]; })(new Date());
    d[0x7B] = date[0] - 2000; d[0x7C] = date[1]; d[0x7D] = date[2];
    d[0x83] = opts.ball >= 1 && opts.ball <= 16 ? opts.ball : 4;
    d[0x84] = (level & 0x7F) | (otGender << 7);
    return d;
  }

  // Neues Pokémon auf einen freien Platz legen (Team: ans Ende) und im Pokédex als gesehen + gefangen eintragen.
  // Fehler: taken (Platz belegt), full, broken.
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
    // Pokédex: 4 Byte Kopf, dann je 0x40 Byte Bits für gefangen, gesehen, zuerst gesehenes und zweites Geschlecht
    var X = io.g.offset + PtSave.LAYOUT.dex + 4, idx = u16(dec, 0x08) - 1, at = idx >> 3, bit = 1 << (idx & 7);
    var b = io.g.bytes, newSeen = !(b[X + 0x40 + at] & bit), female = ((dec[0x40] >> 1) & 3) === 1;
    b[X + at] |= bit;
    b[X + 0x40 + at] |= bit;
    if (newSeen) [0x80, 0xC0].forEach(function (r) { if (female) b[X + r + at] |= bit; else b[X + r + at] &= ~bit; });
    return { bytes: io.commit(true), where: where };   // das Team wird höchstens länger – keine Regel nötig
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
    setMoney: setMoney,
    setCoins: setCoins
  };
});
