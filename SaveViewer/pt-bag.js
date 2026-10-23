/*
 * pt-bag.js – Beutel eines Platin-Spielstands lesen und ändern (z. B. Sonderbonbons hinzufügen).
 *
 * Der Beutel liegt im General-Block: 8 Taschen hintereinander, jeder Platz 4 Byte
 * (u16 Item-Nummer, u16 Anzahl), belegte Plätze lückenlos vorne. Offsets nach PKHeX (MyItem4Pt),
 * geprüft an einem echten, mit PKHeX bearbeiteten Spielstand.
 * Beim Schreiben wird nur der aktuelle General-Block geändert und dessen Prüfsumme neu berechnet;
 * die Datei behält ihr Format (.sav, .dsv mit DeSmuME-Anhang …).
 *
 * Welche Tasche zu welchem Item gehört (POCKET_OF), stammt aus pret/pokeplatinum
 * (res/items/data/*.json, Feld fieldPocket); „-“ = kein echtes Item (z. B. unbenutzte Nummern 113–134).
 * Benötigt PtSave (pt-save.js).
 */
(function (root, factory) {
  var api = factory(root.PtSave || (typeof require === 'function' ? require('./pt-save.js') : null));
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PtBag = api;
})(this, function (PtSave) {
  'use strict';

  // Reihenfolge wie im Spielstand
  var POCKETS = [
    { key: 'items',    offset: 0x630, slots: 165, max: 999 },
    { key: 'key',      offset: 0x8C4, slots: 50,  max: 1 },
    { key: 'tm',       offset: 0x98C, slots: 100, max: 99 },
    { key: 'mail',     offset: 0xB1C, slots: 12,  max: 999 },
    { key: 'medicine', offset: 0xB4C, slots: 40,  max: 999 },
    { key: 'berries',  offset: 0xBEC, slots: 64,  max: 999 },
    { key: 'balls',    offset: 0xCEC, slots: 15,  max: 999 },
    { key: 'battle',   offset: 0xD28, slots: 30,  max: 999 }
  ];

  var POCKET_OF = '-6666666666666666444444444444444444444444444444444444447777777777777000000000000000000000000000000000000000000000----------------------003333333333335555555555555555555555555555555555555555555555555555555555555555000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000022222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222222221111111111111111111111111111111111111111-';
  var RARE_CANDY = 50;

  function pocketOf(id) {
    var c = POCKET_OF.charAt(id);
    return c && c !== '-' ? +c : -1;
  }
  // Alle Items einer Tasche (Nummern), z. B. für die Auswahl „Item hinzufügen“
  function itemsOf(pocket) {
    var out = [];
    for (var i = 1; i < POCKET_OF.length; i++) if (POCKET_OF.charAt(i) === String(pocket)) out.push(i);
    return out;
  }

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function w16(b, o, v) { b[o] = v & 0xFF; b[o + 1] = (v >>> 8) & 0xFF; }

  // Beutel lesen: [[{ id, count }, …] je Tasche]
  function read(buffer) {
    var g = PtSave.generalBlock(buffer);
    if (!g) return null;
    return POCKETS.map(function (p) {
      var list = [];
      for (var i = 0; i < p.slots; i++) {
        var o = g.offset + p.offset + i * 4;
        var id = u16(g.bytes, o), count = u16(g.bytes, o + 2);
        if (id && id !== 0xFFFF && count) list.push({ id: id, count: count });
      }
      return list;
    });
  }

  // Neue Datei (Uint8Array, gleiches Format wie die alte) mit geänderten Taschen.
  // pockets wie von read(); ungültige Einträge werden aussortiert, Anzahlen auf das Maximum begrenzt.
  function write(buffer, pockets) {
    var src = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    var copy = new Uint8Array(src);
    var g = PtSave.generalBlock(copy);
    if (!g) throw new Error('Kein Platin-Spielstand');
    POCKETS.forEach(function (p, pi) {
      var seen = new Set();
      var list = (pockets[pi] || []).filter(function (e) {
        var ok = e && pocketOf(e.id) === pi && e.count > 0 && !seen.has(e.id);
        if (ok) seen.add(e.id);
        return ok;
      });
      if (list.length > p.slots) throw new Error('Tasche ' + p.key + ' ist voll');
      for (var i = 0; i < p.slots; i++) {
        var o = g.offset + p.offset + i * 4;
        var e = list[i];
        w16(g.bytes, o, e ? e.id : 0);
        w16(g.bytes, o + 2, e ? Math.min(Math.round(e.count), p.max) : 0);
      }
    });
    PtSave.writeChecksum(g.bytes, g.offset, g.size);
    return copy;
  }

  return {
    POCKETS: POCKETS,
    RARE_CANDY: RARE_CANDY,
    pocketOf: pocketOf,
    itemsOf: itemsOf,
    read: read,
    write: write
  };
});
