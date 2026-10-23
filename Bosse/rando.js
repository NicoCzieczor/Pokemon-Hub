/*
 * rando.js – liest die Trainerteams aus einer (randomisierten) Platin-ROM, z. B. vom Universal Pokémon Randomizer.
 *
 * Gelesen werden nur wenige Dateien aus dem ROM-Dateisystem (NitroFS) – nicht die ganzen ~100 MB:
 *   poketool/trainer/trdata.narc   Trainer (Klasse, Items, Doppelkampf, Format der Pokémon)
 *   poketool/trainer/trpoke.narc   Pokémon der Trainer (DV-Stufe, Level, Art, Item, Attacken)
 *   poketool/personal/pl_personal.narc   Basiswerte, Typen, Fähigkeiten (falls der Randomizer sie ändert)
 *   poketool/personal/wotbl.narc   Level-Attacken (für Pokémon ohne eigene Attacken)
 *   overlay_0078                   die drei Starter
 *
 * Wesen, Fähigkeit und DVs werden wie im Spiel berechnet (pret/pokeplatinum, src/trainer_data.c und
 * src/pokemon.c): Startwert = DV-Stufe + Level + Art + Trainer-Nummer, so viele LCRNG-Schritte wie die
 * Klassen-Nummer, PID = (Zufall << 8) + 120/136. DV-Stufe × 31 / 255 ergibt die DVs – ist das 32 oder mehr
 * (der Randomizer schreibt teils Werte > 255), würfelt das Spiel sie: erst eine nicht schillernde
 * Trainer-ID, dann zwei Zufallszahlen für die sechs DVs.
 *
 * Ergebnis im Format von bosses.json: p = [[art, form, level, item, attacken[], wesen, fähigkeit, dvs]],
 * dvs als Zahl (alle gleich) oder als Liste [KP, Ang, Vert, Init, SpAng, SpVert].
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Rando = api;
})(this, function () {
  'use strict';

  var FILES = {
    trdata: 'poketool/trainer/trdata.narc',
    trpoke: 'poketool/trainer/trpoke.narc',
    personal: 'poketool/personal/pl_personal.narc',
    learnsets: 'poketool/personal/wotbl.narc'
  };

  // Starter-Arten: overlay_0078, drei u32 ab 0x1BC0 (im Original 387, 390, 393; so ändert sie auch der Randomizer)
  var STARTER_OVERLAY = 78, STARTER_OFFSET = 0x1BC0;

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function u32(b, o) { return (b[o] | (b[o + 1] << 8) | (b[o + 2] << 16) | (b[o + 3] << 24)) >>> 0; }

  // LCRNG des Spiels (gibt die oberen 16 Bit zurück)
  function Lcrng(seed) { this.s = seed >>> 0; }
  Lcrng.prototype.next = function () { this.s = (Math.imul(this.s, 0x41C64E6D) + 0x6073) >>> 0; return this.s >>> 16; };

  // NARC: BTAF (Start/Ende je Datei), BTNF, GMIF (Daten)
  function narc(b) {
    if (String.fromCharCode(b[0], b[1], b[2], b[3]) !== 'NARC') throw new Error('kein NARC');
    var off = 16, btaf = u32(b, off + 4), n = u32(b, off + 8), list = [];
    for (var i = 0; i < n; i++) list.push([u32(b, off + 12 + i * 8), u32(b, off + 16 + i * 8)]);
    off += btaf;
    off += u32(b, off + 4);
    var data = off + 8;
    return list.map(function (e) { return b.subarray(data + e[0], data + e[1]); });
  }

  // Dateien im ROM finden: Header → FNT (Namen) + FAT (Positionen)
  function readFs(read) {
    return read(0, 0x200).then(function (h) {
      var code = String.fromCharCode(h[0xC], h[0xD], h[0xE], h[0xF]);
      if (code.slice(0, 3) !== 'CPU') throw new Error('notPlatinum');
      var fntOff = u32(h, 0x40), fntSize = u32(h, 0x44), fatOff = u32(h, 0x48), fatSize = u32(h, 0x4C);
      return Promise.all([read(fntOff, fntOff + fntSize), read(fatOff, fatOff + fatSize)]).then(function (r) {
        var fnt = r[0], fat = r[1], ids = {};
        (function walk(dir, prefix, depth) {
          if (depth > 16) return;
          var e = (dir & 0xFFF) * 8, o = u32(fnt, e), fid = u16(fnt, e + 4);
          for (;;) {
            var len = fnt[o++];
            if (!len) break;
            var n = len & 0x7F, name = '';
            for (var i = 0; i < n; i++) name += String.fromCharCode(fnt[o + i]);
            o += n;
            if (len & 0x80) { var sub = u16(fnt, o); o += 2; walk(sub, prefix + name + '/', depth + 1); }
            else ids[prefix + name] = fid++;
          }
        })(0xF000, '', 0);
        // Overlays: Tabelle im Header (je 32 Byte: Nummer … Datei-Nummer, Flags)
        function overlay(num) {
          var ovOff = u32(h, 0x50), ovSize = u32(h, 0x54);
          return read(ovOff, ovOff + ovSize).then(function (tab) {
            for (var i = 0; i + 32 <= tab.length; i += 32) {
              if (u32(tab, i) !== num) continue;
              if (tab[i + 31] & 1) return null; // komprimiert – brauchen wir nicht
              var fid = u32(tab, i + 24);
              return read(u32(fat, fid * 8), u32(fat, fid * 8 + 4));
            }
            return null;
          });
        }
        return {
          code: code,
          overlay: overlay,
          file: function (path) {
            var id = ids[path];
            if (id == null) return Promise.reject(new Error('Datei fehlt: ' + path));
            return read(u32(fat, id * 8), u32(fat, id * 8 + 4));
          }
        };
      });
    });
  }

  // Typen: ROM zählt „???“ (9) mit, der Hub nicht
  function hubType(t) { return t >= 10 ? t - 1 : t; }

  // Basiswerte/Typen/Fähigkeiten aus der ROM im Format des Hubs (nur die Felder, die der Planer braucht)
  function personalFrom(entries, base) {
    return entries.map(function (e, i) {
      var b = base[i];
      if (!b || e.length < 24) return b;
      var p = b.slice();
      for (var k = 0; k < 6; k++) p[k] = e[k];
      p[6] = hubType(e[6]); p[7] = hubType(e[7]);
      p[10] = e[22]; p[11] = e[23] || e[22];
      return p;
    });
  }

  function learnsetsFrom(entries) {
    return entries.map(function (e) {
      var out = [];
      for (var o = 0; o + 1 < e.length; o += 2) {
        var v = u16(e, o);
        if (v === 0xFFFF) break;
        out.push([v >>> 9, v & 0x1FF]);
      }
      return out;
    });
  }

  // Wie Pokemon_SetDefaultMoves: Level-Attacken der Reihe nach, bei vier bekannten fliegt die älteste raus
  function defaultMoves(learnset, level) {
    var known = [];
    for (var i = 0; i < learnset.length; i++) {
      var lv = learnset[i][0], mv = learnset[i][1];
      if (lv > level) break;
      if (known.indexOf(mv) >= 0) continue;
      if (known.length === 4) known.shift();
      known.push(mv);
    }
    return known;
  }

  // Index in Basiswerte/Level-Attacken für Formen (wie PtSave: Formen ab p[13])
  function formIndex(personal, sp, form) {
    var p = personal[sp];
    return p && form > 0 && form < p[12] && p[13] > 0 ? p[13] + form - 1 : sp;
  }

  function buildMon(id, header, raw, personal, learnsets, femaleClasses) {
    var ivScale = u16(raw, 0), level = u16(raw, 2), spRaw = u16(raw, 4);
    var sp = spRaw & 0x3FF, form = spRaw >>> 10;
    var hasMoves = header.type & 1, hasItem = header.type & 2;
    var o = 6, item = 0, moves = null;
    if (hasItem) { item = u16(raw, o); o += 2; }
    if (hasMoves) { moves = []; for (var k = 0; k < 4; k++) { var mv = u16(raw, o + k * 2); if (mv) moves.push(mv); } }

    // PID wie TrainerData_BuildParty
    var rng = new Lcrng((ivScale + level + sp + id) >>> 0);
    var rnd = rng.s;
    for (var j = 0; j < header.cls; j++) rnd = rng.next();
    var pid = ((rnd << 8) + (femaleClasses.has(header.cls) ? 120 : 136)) >>> 0;

    // DVs wie Pokemon_InitWith: < 32 fest, sonst gewürfelt (vorher nicht schillernde Trainer-ID ziehen)
    var fixed = Math.floor(ivScale * 31 / 255), ivs = fixed;
    if (fixed >= 32) {
      for (;;) {
        var lo = rng.next(), hi = rng.next();
        if (((hi ^ lo ^ (pid >>> 16) ^ (pid & 0xFFFF)) >>> 0) >= 8) break;
      }
      var a = rng.next(), b = rng.next();
      ivs = [a & 31, (a >>> 5) & 31, (a >>> 10) & 31, b & 31, (b >>> 5) & 31, (b >>> 10) & 31];
    }

    var pi = formIndex(personal, sp, form), per = personal[pi] || personal[sp] || [];
    var ability = (pid & 1) && per[11] ? per[11] : per[10] || 0;
    if (!moves) moves = defaultMoves(learnsets[pi] || learnsets[sp] || [], level);
    return [sp, form, level, item, moves, pid % 25, ability, ivs];
  }

  /*
   * read(start, end) → Promise<Uint8Array> (Bereich der ROM-Datei)
   * ids: Trainer-Nummern, femaleClasses: Klassen-Nummern weiblicher Trainer, basePersonal: PT_DATA.personal
   */
  function readRom(read, ids, femaleClasses, basePersonal) {
    var fem = new Set(femaleClasses);
    return readFs(read).then(function (fs) {
      return Promise.all([fs.file(FILES.trdata), fs.file(FILES.trpoke), fs.file(FILES.personal), fs.file(FILES.learnsets),
        fs.overlay(STARTER_OVERLAY).catch(function () { return null; })])
        .then(function (r) {
          var trdata = narc(r[0]), trpoke = narc(r[1]);
          var personal = personalFrom(narc(r[2]), basePersonal);
          var learnsets = learnsetsFrom(narc(r[3]));
          var trainers = {};
          ids.forEach(function (id) {
            var t = trdata[id], p = trpoke[id];
            if (!t || t.length < 20 || !p) return;
            var header = { type: t[0], cls: t[1], count: t[3] };
            var size = 8 + (header.type & 2 ? 2 : 0) + (header.type & 1 ? 8 : 0);
            var party = [];
            for (var i = 0; i < header.count && (i + 1) * size <= p.length; i++) {
              party.push(buildMon(id, header, p.subarray(i * size, (i + 1) * size), personal, learnsets, fem));
            }
            var items = [];
            for (var k = 0; k < 4; k++) { var it = u16(t, 4 + k * 2); if (it) items.push(it); }
            trainers[id] = { cls: header.cls, d: u32(t, 16) ? 1 : 0, it: items, p: party };
          });
          // Nur geänderte Basiswerte merken
          var changed = {};
          personal.forEach(function (p, i) {
            var b = basePersonal[i];
            if (!p || !b) return;
            for (var k = 0; k < 12; k++) if (k !== 8 && k !== 9 && p[k] !== b[k]) { changed[i] = p; return; }
          });
          // Starter (Wahl 1–3 = Chelast/Panflam/Plinfa im Original), falls lesbar
          var ov = r[4], starters = null;
          if (ov && ov.length >= STARTER_OFFSET + 12) {
            starters = [0, 4, 8].map(function (k) { return u32(ov, STARTER_OFFSET + k); });
            if (!starters.every(function (s) { return s >= 1 && s <= 493; })) starters = null;
          }
          return { code: fs.code, trainers: trainers, personal: changed, starters: starters };
        });
    });
  }

  return { readRom: readRom, _internal: { narc: narc, defaultMoves: defaultMoves, Lcrng: Lcrng } };
});
