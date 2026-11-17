/*
 * live-diff.js – was ist zwischen zwei Fassungen desselben Spielstands passiert?
 *
 * Die Live-Test-Seite liest die Spielstand-Datei immer wieder neu (app.js). Hier wird aus dem gelesenen Spielstand
 * (HubSave.parse) ein kleiner Abzug gemacht und mit dem vorigen verglichen – heraus kommen Ereignisse:
 * gefangen, besiegt, Level, Entwicklung, Team ↔ Box, Orden …
 *
 *   LiveDiff.snapshot(data, live)  → Abzug { kind, game, name, tid, sid, time, badges, dex, mons: { id: Pokémon } };
 *                                 live = Team/Boxen aus dem Arbeitsspeicher (optional, s. dort)
 *   LiveDiff.sameRun(a, b)    → derselbe Spielstand (Spiel und Trainer)?
 *   LiveDiff.diff(a, b)       → Liste von Ereignissen { type, … } (a = vorher, b = jetzt)
 *   LiveDiff.counts(snap)     → { party, box, daycare, out, fainted, badges }
 *
 * Ein Pokémon erkennt man an PID + Trainer-ID (Omega Rubin / Alpha Saphir: dazu die Verschlüsselungskonstante) –
 * das bleibt beim Verschieben, Aufleveln und Entwickeln gleich.
 *
 * Grenze des Wegs „Datei beobachten“: Im Spielstand steht nur der Zustand beim Speichern. „Besiegt“ heißt darum:
 * beim Speichern hatte das Pokémon im Team 0 KP. Wer vor dem Speichern heilt, hinterlässt keine Spur.
 */
(function (root) {
  'use strict';

  function monId(kind, m) {
    return (kind === 'oras' ? (m.ec >>> 0).toString(16) + '.' : '') + (m.pid >>> 0).toString(16) + '.' + m.tid + '.' + m.sid;
  }

  // live (optional): Stand aus dem Arbeitsspeicher des Emulators (live-mem.js) – { party: [Pokémon …] oder null,
  // boxes: [[Pokémon oder null …] …] oder null }. Was live da ist, ersetzt den Teil aus der Datei. Ist nur das Team
  // live, gelten Team-Pokémon der Datei, die dort fehlen, als „nicht mehr im Team“ (area 'out': Box oder freigelassen –
  // das zeigt erst der nächste Blick in die Boxen).
  function snapshot(data, live) {
    var t = data.trainer, kind = data.kind, mons = {};
    live = live || {};
    function add(m, area, box, slot) {
      if (!m) return;
      var id = monId(kind, m), n = 2, key = id;
      while (mons[key]) key = id + '#' + n++;            // Doppelgänger (geklont, Ninjatom): durchzählen
      mons[key] = {
        id: key, species: m.species, form: m.form || 0,
        nick: m.isNicknamed && m.nickname ? m.nickname : '',
        level: area === 'daycare' && m.levelNow ? m.levelNow : m.level,
        hp: m.hp, maxHp: m.stats ? m.stats[0] : 0,
        egg: !!m.isEgg, shiny: !!m.shiny, own: m.tid === t.tid && m.sid === t.sid, ot: m.otName || '',
        met: m.metLocation || 0, metLevel: m.metLevel || 0,
        area: area, box: area === 'box' ? box : -1, slot: slot || 0
      };
    }
    // Was live gelesen wurde, zählt nicht noch einmal aus der Datei
    var have = {}, any = !!(live.party || live.boxes);
    function mark(m) { if (m) { var k = monId(kind, m); have[k] = (have[k] || 0) + 1; } }
    function taken(m) { var k = monId(kind, m); if (have[k]) { have[k]--; return true; } return false; }
    if (live.party) live.party.forEach(mark);
    if (live.boxes) live.boxes.forEach(function (bx) { bx.forEach(mark); });

    if (live.party) {
      live.party.forEach(function (m, i) { add(m, 'party', -1, i); });
      if (!live.boxes) data.party.forEach(function (m) { if (!taken(m)) add(m, 'out', -1, m.where.slot); });
    } else data.party.forEach(function (m) { if (!any || !taken(m)) add(m, 'party', -1, m.where.slot); });
    if (live.boxes) live.boxes.forEach(function (bx, b) { bx.forEach(function (m, i) { add(m, 'box', b, i); }); });
    else data.boxes.forEach(function (bx, b) { bx.slots.forEach(function (m, i) { if (m && (!any || !taken(m))) add(m, 'box', b, i); }); });
    (data.daycare || []).forEach(function (m) { if (!any || !taken(m)) add(m, 'daycare', -1, m.where ? m.where.slot : 0); });

    var pt = t.playTime || { h: 0, m: 0, s: 0 };
    return {
      kind: kind, game: data.game, name: t.name, tid: t.tid, sid: t.sid,
      time: pt.h * 3600 + pt.m * 60 + pt.s,
      badges: t.badges.slice(), dex: data.dex ? data.dex.caught.length : 0, money: t.money,
      mons: mons
    };
  }

  function sameRun(a, b) {
    return !!a && !!b && a.kind === b.kind && a.tid === b.tid && a.sid === b.sid && a.name === b.name;
  }

  function counts(s) {
    var c = { party: 0, box: 0, daycare: 0, out: 0, fainted: 0, badges: 0 };
    Object.keys(s.mons).forEach(function (id) {
      var m = s.mons[id];
      c[m.area]++;
      if (m.area === 'party' && !m.egg && m.hp === 0) c.fainted++;
    });
    s.badges.forEach(function (b) { if (b) c.badges++; });
    return c;
  }

  function down(m) { return m.area === 'party' && !m.egg && m.hp === 0; }

  function diff(a, b) {
    var ev = [];
    if (!a || !b) return ev;
    if (!sameRun(a, b)) return [{ type: 'switch' }];
    // Spielzeit läuft rückwärts: ein älterer Stand wurde geladen (Sicherung, Savestate) – nicht vergleichen,
    // sonst gälten später gefangene Pokémon als „freigelassen“
    if (b.time < a.time) return [{ type: 'rewind', from: a.time, to: b.time }];

    b.badges.forEach(function (on, bit) { if (on && !a.badges[bit]) ev.push({ type: 'badge', bit: bit }); });

    var late = [];
    Object.keys(b.mons).forEach(function (id) {
      var m = b.mons[id], o = a.mons[id];
      if (!o) {
        ev.push({ type: m.egg ? 'egg' : m.own ? 'catch' : 'gift', mon: m });
        if (down(m)) ev.push({ type: 'faint', mon: m });
        return;
      }
      if (o.egg && !m.egg) ev.push({ type: 'hatch', mon: m });
      else if (!m.egg && o.species !== m.species) ev.push({ type: 'evolve', mon: m, from: o.species });
      if (!m.egg && m.level > o.level) late.push({ type: 'level', mon: m, from: o.level });
      if (down(m) && !down(o)) ev.push({ type: 'faint', mon: m });
      else if (down(o) && !down(m)) ev.push({ type: 'heal', mon: m });
      if (o.area !== m.area) late.push({ type: 'move', mon: m, from: o.area, fromBox: o.box });
    });
    Object.keys(a.mons).forEach(function (id) { if (!b.mons[id]) ev.push({ type: 'gone', mon: a.mons[id] }); });
    return ev.concat(late);
  }

  var api = { snapshot: snapshot, sameRun: sameRun, diff: diff, counts: counts, monId: monId };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LiveDiff = api;
})(typeof self !== 'undefined' ? self : this);
