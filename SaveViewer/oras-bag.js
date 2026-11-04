/*
 * oras-bag.js – Beutel eines Spielstands von Omega Rubin / Alpha Saphir lesen und ändern.
 *
 * Gegenstück zu pt-bag.js mit derselben Schnittstelle. Der Beutel ist Block 1 (ab 0x400): 5 Taschen hintereinander,
 * jeder Platz 4 Byte (u16 Item-Nummer, u16 Anzahl), belegte Plätze lückenlos vorne. Offsets nach PKHeX (MyItem6AO),
 * geprüft an einem echten Citra-Spielstand. Bälle liegen in Gen 6 bei den Items.
 * Welche Tasche zu welchem Item gehört, steht in ORAS_DATA.itemPockets (aus den Itemdaten der ROM).
 * Benötigt OrasSave (oras-save.js).
 */
(function (root, factory) {
  var api = factory(root.OrasSave || (typeof require === 'function' ? require('./oras-save.js') : null), root);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.OrasBag = api;
})(this, function (OrasSave, root) {
  'use strict';

  var BAG = OrasSave.LAYOUT.bag;
  // Reihenfolge wie im Spielstand
  var POCKETS = [
    { key: 'items',    offset: 0x000, slots: 400, max: 999 },
    { key: 'key',      offset: 0x640, slots: 96,  max: 1 },
    { key: 'tm',       offset: 0x7C0, slots: 108, max: 1 },
    { key: 'medicine', offset: 0x970, slots: 64,  max: 999 },
    { key: 'berries',  offset: 0xA70, slots: 72,  max: 999 }
  ];
  var RARE_CANDY = 50;
  // Was ein Pokémon tragen kann (Items, Medizin, Beeren) – Basis-Items und TMs nicht
  var HELD = [0, 3, 4], KEY = 1, TM = 2;

  function data() { return (root && root.ORAS_DATA) || (typeof window !== 'undefined' && window.ORAS_DATA) || null; }
  function pocketOf(id) {
    var D = data(), c = D && D.itemPockets ? D.itemPockets.charAt(id) : '';
    return c && c !== '-' ? +c : -1;
  }
  function itemsOf(pocket) {
    var D = data(), out = [];
    if (!D || !D.itemPockets) return out;
    for (var i = 1; i < D.itemPockets.length; i++) if (D.itemPockets.charAt(i) === String(pocket)) out.push(i);
    return out;
  }

  function u16(b, o) { return b[o] | (b[o + 1] << 8); }
  function w16(b, o, v) { b[o] = v & 0xFF; b[o + 1] = (v >>> 8) & 0xFF; }

  function read(buffer) {
    var b = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
    if (!OrasSave.detect(b)) return null;
    return POCKETS.map(function (p) {
      var list = [];
      for (var i = 0; i < p.slots; i++) {
        var o = BAG + p.offset + i * 4, id = u16(b, o), count = u16(b, o + 2);
        if (id && id !== 0xFFFF && count) list.push({ id: id, count: count });
      }
      return list;
    });
  }

  function write(buffer, pockets) {
    var copy = new Uint8Array(buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer));
    var block = OrasSave.blockAt(copy, BAG);
    if (!block) throw new Error('Kein Spielstand von Omega Rubin / Alpha Saphir');
    if (!block.valid) throw new Error('Dieser Teil des Spielstands ist beschädigt');
    POCKETS.forEach(function (p, pi) {
      var seen = new Set();
      var list = (pockets[pi] || []).filter(function (e) {
        var ok = e && pocketOf(e.id) === pi && e.count > 0 && !seen.has(e.id);
        if (ok) seen.add(e.id);
        return ok;
      });
      if (list.length > p.slots) throw new Error('Tasche ' + p.key + ' ist voll');
      for (var i = 0; i < p.slots; i++) {
        var o = BAG + p.offset + i * 4, e = list[i];
        w16(copy, o, e ? e.id : 0);
        w16(copy, o + 2, e ? Math.min(Math.round(e.count), p.max) : 0);
      }
    });
    OrasSave.writeChecksum(copy, block);
    return copy;
  }

  return {
    POCKETS: POCKETS,
    RARE_CANDY: RARE_CANDY,
    HELD: HELD, KEY: KEY, TM: TM,
    pocketOf: pocketOf,
    itemsOf: itemsOf,
    read: read,
    write: write
  };
});
