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

  return {
    MAX_MONEY: MAX_MONEY,
    MAX_COINS: MAX_COINS,
    MAX_FRIENDSHIP: MAX_FRIENDSHIP,
    readMon: readMon,
    editMon: editMon,
    setMoves: setMoves,
    setItem: setItem,
    setFriendship: setFriendship,
    setMoney: setMoney,
    setCoins: setCoins
  };
});
