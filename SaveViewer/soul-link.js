/*
 * soul-link.js – verknüpft die Pokémon zweier Spielstände für Soul-Link-Runs.
 *
 * Idee: Wer am selben Ort gefangen wurde, gehört zusammen.
 *   - Fangort = Ort, an dem das Ei erhalten wurde (bei Eiern), sonst der Fangort.
 *   - Gibt es an einem Ort auf jeder Seite genau einen Fang, ist das Paar „sicher“.
 *   - Gibt es mehrere, werden sie nach Fangdatum (dann Fanglevel) sortiert und der Reihe
 *     nach verknüpft – das Paar ist dann „zu prüfen“.
 *   - Getauschte Pokémon (anderer Originaltrainer) werden nie automatisch verknüpft.
 *
 * Manuelle Korrekturen („Pins“) werden pro Pokémon gespeichert. Ein Pokémon erkennt man
 * dauerhaft an PID + Trainer-ID; das bleibt auch nach Entwicklung oder Box-Umzug gleich.
 *   pins[key] = partnerKey → fest verknüpft (muss in beide Richtungen eingetragen sein)
 *   pins[key] = null       → bewusst ohne Partner (wird nicht automatisch verknüpft)
 *   pins[key] = 'x'        → ignoriert (gehört nicht zum Run)
 */
(function (root, factory) {
  var api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SoulLink = api;
})(this, function () {
  'use strict';

  function monKey(m) {
    return (m.pid >>> 0).toString(16) + '-' + m.tid + '-' + m.sid;
  }

  function encounterLocation(m) {
    return m.eggLocation || m.metLocation || 0;
  }

  function dateNum(m) {
    var d = m.eggLocation ? (m.eggDate || m.metDate) : (m.metDate || m.eggDate);
    return d ? d[0] * 10000 + d[1] * 100 + d[2] : 99999999;
  }

  function byEncounterOrder(a, b) {
    return (dateNum(a.m) - dateNum(b.m)) || (a.m.metLevel - b.m.metLevel) || (a.order - b.order);
  }

  function isDead(e) { return e.status === 'dead' || e.status === 'fainted'; }

  /**
   * A, B: Listen von Einträgen { m, key, own, status, order }
   *   own    – vom Spieler selbst gefangen (Trainer-ID passt)
   *   status – 'team' | 'box' | 'daycare' | 'dead' (Friedhof) | 'fainted' (K.O. im Team)
   */
  function compute(A, B, pins) {
    pins = pins || {};
    var mapA = {}, mapB = {};
    A.forEach(function (e) { mapA[e.key] = e; });
    B.forEach(function (e) { mapB[e.key] = e; });

    var pairs = [];
    var pairedA = {}, pairedB = {};

    // 1. Manuelle Verknüpfungen
    A.forEach(function (a) {
      var p = pins[a.key];
      if (typeof p !== 'string' || p === 'x') return;
      var b = mapB[p];
      if (!b || pins[p] !== a.key || pairedB[p]) return;
      pairs.push({ a: a, b: b, source: 'manual', sure: true, loc: encounterLocation(a.m) });
      pairedA[a.key] = true;
      pairedB[b.key] = true;
    });

    var unpairedA = [], unpairedB = [], ignoredA = [], ignoredB = [];

    function sortOut(list, paired, unpaired, ignored, freeOut) {
      list.forEach(function (e) {
        if (paired[e.key]) return;
        var p = pins[e.key];
        if (p === 'x') { ignored.push(e); return; }
        if (p === null) { unpaired.push({ e: e, reason: 'blocked' }); return; }
        if (typeof p === 'string') { unpaired.push({ e: e, reason: 'partnerGone' }); return; }
        if (!e.own) { unpaired.push({ e: e, reason: 'traded' }); return; }
        if (!encounterLocation(e.m)) { unpaired.push({ e: e, reason: 'noLocation' }); return; }
        freeOut.push(e);
      });
    }

    var freeA = [], freeB = [];
    sortOut(A, pairedA, unpairedA, ignoredA, freeA);
    sortOut(B, pairedB, unpairedB, ignoredB, freeB);

    // 2. Automatisch nach Fangort
    function group(list) {
      var g = {};
      list.forEach(function (e) {
        var k = encounterLocation(e.m);
        (g[k] = g[k] || []).push(e);
      });
      Object.keys(g).forEach(function (k) { g[k].sort(byEncounterOrder); });
      return g;
    }
    var gA = group(freeA), gB = group(freeB);
    var locs = {};
    Object.keys(gA).concat(Object.keys(gB)).forEach(function (k) { locs[k] = true; });

    Object.keys(locs).forEach(function (k) {
      var la = gA[k] || [], lb = gB[k] || [];
      var n = Math.min(la.length, lb.length);
      var sure = la.length === 1 && lb.length === 1;
      for (var i = 0; i < n; i++) {
        pairs.push({ a: la[i], b: lb[i], source: 'auto', sure: sure, loc: +k });
      }
      for (var j = n; j < la.length; j++) unpairedA.push({ e: la[j], reason: lb.length ? 'extra' : 'noMatch' });
      for (var x = n; x < lb.length; x++) unpairedB.push({ e: lb[x], reason: la.length ? 'extra' : 'noMatch' });
    });

    // Reihenfolge: grob nach Spielverlauf (frühestes Fangdatum, dann Ort)
    function pairDate(p) { return Math.min(dateNum(p.a.m), dateNum(p.b.m)); }
    pairs.sort(function (p, q) { return (pairDate(p) - pairDate(q)) || (p.loc - q.loc); });
    function sortUnpaired(list) {
      list.sort(function (u, v) { return byEncounterOrder(u.e, v.e) || (encounterLocation(u.e.m) - encounterLocation(v.e.m)); });
    }
    sortUnpaired(unpairedA);
    sortUnpaired(unpairedB);

    // 3. Regelverstöße
    var warnings = [];
    pairs.forEach(function (p) {
      var da = isDead(p.a), db = isDead(p.b);
      if (da !== db) {
        warnings.push({ type: 'death', pair: p, dead: da ? 'a' : 'b' });
      } else if (!da && (p.a.status === 'team') !== (p.b.status === 'team')) {
        warnings.push({ type: 'team', pair: p, inTeam: p.a.status === 'team' ? 'a' : 'b' });
      }
    });
    unpairedA.forEach(function (u) { if (u.e.status === 'team') warnings.push({ type: 'solo', side: 'a', e: u.e }); });
    unpairedB.forEach(function (u) { if (u.e.status === 'team') warnings.push({ type: 'solo', side: 'b', e: u.e }); });
    var rank = { death: 0, team: 1, solo: 2 };
    warnings.sort(function (x, y) { return rank[x.type] - rank[y.type]; });

    return {
      pairs: pairs,
      unpairedA: unpairedA,
      unpairedB: unpairedB,
      ignoredA: ignoredA,
      ignoredB: ignoredB,
      warnings: warnings
    };
  }

  /* ── Pins ändern (gibt immer ein neues Objekt zurück) ─────────────── */
  function copy(p) { var o = {}; for (var k in p) if (Object.prototype.hasOwnProperty.call(p, k)) o[k] = p[k]; return o; }

  // Partner eines Pokémon laut aktuellem Ergebnis
  function partnerOf(result, key) {
    for (var i = 0; i < result.pairs.length; i++) {
      var p = result.pairs[i];
      if (p.a.key === key) return p.b.key;
      if (p.b.key === key) return p.a.key;
    }
    return null;
  }

  // a und b fest verknüpfen; bisherige Partner der beiden werden „ohne Partner“
  function link(pins, result, a, b) {
    var out = copy(pins);
    [a, b].forEach(function (k) {
      var old = partnerOf(result, k);
      if (old && old !== a && old !== b) out[old] = null;
    });
    out[a] = b;
    out[b] = a;
    return out;
  }

  // Verknüpfung lösen – beide bleiben ohne Partner
  function unlink(pins, a, b) {
    var out = copy(pins);
    out[a] = null;
    out[b] = null;
    return out;
  }

  // Paar bestätigen (aus „zu prüfen“ wird „manuell“)
  function confirm(pins, a, b) {
    var out = copy(pins);
    out[a] = b;
    out[b] = a;
    return out;
  }

  function ignore(pins, result, key) {
    var out = copy(pins);
    var old = partnerOf(result, key);
    if (old) out[old] = null;
    out[key] = 'x';
    return out;
  }

  // Zurück auf „automatisch“
  function restore(pins, key) {
    var out = copy(pins);
    delete out[key];
    return out;
  }

  return {
    monKey: monKey,
    encounterLocation: encounterLocation,
    compute: compute,
    partnerOf: partnerOf,
    link: link,
    unlink: unlink,
    confirm: confirm,
    ignore: ignore,
    restore: restore,
    isDead: isDead
  };
});

