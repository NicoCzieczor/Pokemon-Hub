/*
 * live-mem.js – Team und Boxen im Arbeitsspeicher des laufenden Emulators wiederfinden und mitlesen.
 *
 * Die Spiele halten ihre Pokémon im Speicher genauso verschlüsselt wie im Spielstand. Statt fester Adressen (die je
 * Spiel, Sprache und Emulator anders sind) wird deshalb gesucht: Jedes Pokémon beginnt mit seiner Kennung (Platin: PID,
 * Omega Rubin / Alpha Saphir: Verschlüsselungskonstante). Die Kennungen stehen im Spielstand – die Brücke
 * (bridge/PokeHub-Live.cmd) sucht sie im Speicher des Emulators, und was sich an einer Fundstelle sauber entschlüsseln
 * lässt (Prüfsumme stimmt), ist ein Pokémon.
 *
 *   Aus den Fundstellen werden Reihen: das Team (bis 6 hintereinander, Abstand je Spiel) und die Boxen (alle Plätze
 *   hintereinander). Fast immer gibt es mehrere Kopien: die vom letzten Speichern (im Spiel und im Emulator, der die
 *   Spielstand-Datei im Speicher hält) und bei Platin dazu den vorletzten Stand (die Datei hat zwei Hälften). Es gilt
 *   die Kopie, die sich zuletzt geändert hat. Solange sich nichts ändert: eine, die in keiner Fassung der Datei so
 *   steht (also neuer ist), sonst der Stand der Datei. Kopien des vorletzten Stands zählen nie.
 *
 *   var t = LiveMem.tracker({ kind, data, readMon: LiveMem.reader(HubSave.get(kind)), bridge: { scan(hex[], lo, hi), read(adr[], n) } });
 *   t.poll() → Promise<{ party: [Pokémon]|null, boxes: [[Pokémon|null]]|null, fresh: bool }> oder null (noch nichts Sicheres)
 *   t.setData(data)  – neuer Spielstand aus der Datei (neue Kennungen): sucht beim nächsten poll() neu
 *   LiveMem.fileParties(G, bytes) → weitere Team-Fassungen in der Datei (Platin: ältere Hälfte); als data.staleParties mitgeben
 *   t.info           – { state: 'search'|'live'|'lost', party, boxes, scanMs, scanMb }
 *
 * Ein Stand gilt erst, wenn er zweimal hintereinander gleich gelesen wurde (das Spiel schreibt, während gelesen wird).
 */
(function (root) {
  'use strict';

  // stored/party: Bytes eines Pokémon in Box bzw. Team (Team = Box-Teil + Kampfwerte).
  // layouts: wie ein Team-Eintrag im Speicher liegt – stride = Abstand zum nächsten, stats = wo die Kampfwerte beginnen.
  //   Omega Rubin / Alpha Saphir, am echten Azahar nachgemessen: Im laufenden Spiel ist ein Eintrag 484 Byte lang, die
  //   Kampfwerte stehen erst ab Byte 344 (dazwischen Zeiger des Spiels); daneben liegt die Kopie des Spielstands (260
  //   am Stück), die sich nur beim Speichern ändert.
  var FORMATS = {
    pt: { stored: 136, party: 236, layouts: [{ stride: 236, stats: 136 }], boxes: 18, slots: 30 },
    oras: { stored: 232, party: 260, layouts: [{ stride: 484, stats: 344 }, { stride: 260, stats: 232 }], boxes: 31, slots: 30 }
  };
  var MAX_PATTERNS = 240, MAX_PARTY = 8, MAX_BOX = 3, LOST_AFTER = 6, RESCAN_MS = 10000, LIVE_RESCAN_MS = 45000, NEAR = 32 * 1024 * 1024;

  function keyOf(kind, m) { return (kind === 'oras' ? m.ec : m.pid) >>> 0; }
  // Kennung, wie sie im Speicher steht (niedriges Byte zuerst), dahinter zwei Nullbytes (in beiden Spielen unbenutzt)
  function sigHex(key) {
    var h = '';
    for (var i = 0; i < 4; i++) h += ('0' + ((key >>> (i * 8)) & 0xFF).toString(16)).slice(-2);
    return h + '0000';
  }
  function monSig(kind, m) { return [keyOf(kind, m), m.species, m.level, m.hp, m.stats[0], m.isEgg ? 1 : 0, m.exp, m.nickname].join(':'); }
  function listSig(kind, mons) { return mons.map(function (m) { return monSig(kind, m); }).join('|'); }
  function hash(bytes) {
    var h = 0x811C9DC5;
    for (var i = 0; i < bytes.length; i++) { h ^= bytes[i]; h = Math.imul(h, 0x01000193); }
    return h >>> 0;
  }

  // Leser für ein Spiel (G = Eintrag aus hub-save.js): (bytes, offset, size) → Pokémon oder null.
  // In Box-Größe genügt die Prüfsumme. In Team-Größe müssen auch die Kampfwerte dahinter glaubhaft sein (Level 1–100,
  // KP ≤ max. KP, alle sechs Werte 1–999) – sonst hielte man ein Box-Pokémon mit beliebigen Bytes dahinter für ein
  // Team-Pokémon. Bewusst ohne Basiswerte oder Erfahrungskurven: die kann ein Randomizer geändert haben.
  var PARTY_AT = { pt: { lv: 0x8C, hp: 0x8E, stats: 0x90 }, oras: { lv: 0xEC, hp: 0xF0, stats: 0xF2 } };
  function reader(G) {
    var S = G.Save, D = G.D, kind = G.key, F = FORMATS[kind], at = PARTY_AT[kind];
    var read = kind === 'oras' ? S.readPK6 : S.readPK4, decrypt = kind === 'oras' ? S.decryptPK6 : S.decryptPK4;
    return function (bytes, off, size) {
      var m = read(D, bytes, off, size, { area: size === F.party ? 'party' : 'box', slot: 0 });
      if (!m || m.bad) return null;
      if (size === F.party) {
        var r = decrypt(bytes, off, size), d = r && r.data;
        if (!d || d[at.lv] < 1 || d[at.lv] > 100) return null;
        for (var i = 0; i < 6; i++) { var v = d[at.stats + i * 2] | (d[at.stats + i * 2 + 1] << 8); if (v < 1 || v > 999) return null; }
        if ((d[at.hp] | (d[at.hp + 1] << 8)) > (d[at.stats] | (d[at.stats + 1] << 8))) return null;
      }
      return m;
    };
  }

  // Team-Fassungen, die außer der aktuellen in der Datei stehen. Platin schreibt abwechselnd in zwei Hälften – die
  // ältere bleibt stehen und liegt damit auch im Speicher (im Emulator und im Spiel). Ihr Team ist nie das laufende.
  function fileParties(G, bytes) {
    if (G.key !== 'pt') return [];
    var S = G.Save, g = S.generalBlock(bytes);
    if (!g) return [];
    var b = g.bytes, at = (g.offset === 0 ? 0x40000 : 0) + S.LAYOUT.party, n = Math.min(b[at - 4], 6), mons = [];
    for (var i = 0; i < n; i++) {
      var m = S.readPK4(G.D, b, at + i * S.LAYOUT.sizeParty, S.LAYOUT.sizeParty, { area: 'party', slot: i });
      if (!m || m.bad) break;
      mons.push(m);
    }
    return mons.length ? [mons] : [];
  }

  function tracker(o) {
    var kind = o.kind, F = FORMATS[kind], bridge = o.bridge, readMon = o.readMon;
    var data = o.data, now = o.now || function () { return Date.now(); };
    var EXTRA = F.party - F.stored;
    var ENTRY = Math.max.apply(null, F.layouts.map(function (l) { return l.stats + EXTRA; }));        // längster Eintrag
    var PARTY_LEN = 5 * Math.max.apply(null, F.layouts.map(function (l) { return l.stride; })) + ENTRY;
    var BOX_LEN = F.boxes * F.slots * F.stored;
    var party = [], boxes = [];           // Kandidaten: { base, sig|hash, changed, mons, layout }
    var needScan = true, lastScan = 0, lostFor = 0, tick = 0, near = null, nearFailed = false;
    var lastParty = '', lastBox = -1, outParty = null, outBoxes = null, sentParty = '', sentBox = -1;
    var info = { state: 'search', party: 0, boxes: 0, scanMs: 0, scanMb: 0, searched: false };
    var fileSig, staleSigs;
    function useData(d) {
      data = d;
      fileSig = listSig(kind, d.party);
      staleSigs = {};
      (d.staleParties || []).forEach(function (mons) { var s = listSig(kind, mons); if (s !== fileSig) staleSigs[s] = 1; });
    }
    useData(data);

    function stored(bytes, off) {
      if (off < 0 || off + F.stored > bytes.length) return null;
      return readMon(bytes, off, F.stored);
    }
    // Team-Eintrag an off in der Anordnung lay: Box-Teil und Kampfwerte zusammensetzen und prüfen
    function entry(bytes, off, lay) {
      if (off < 0 || off + lay.stats + EXTRA > bytes.length) return null;
      if (lay.stats === F.stored) return readMon(bytes, off, F.party);
      var b = new Uint8Array(F.party);
      b.set(bytes.subarray(off, off + F.stored), 0);
      b.set(bytes.subarray(off + lay.stats, off + lay.stats + EXTRA), F.stored);
      return readMon(b, 0, F.party);
    }
    // Team aus einem gelesenen Block: beste Anordnung = die meisten gültigen Pokémon hintereinander ab Platz 0
    function decodeParty(bytes) {
      var best = { mons: [], layout: 0 };
      F.layouts.forEach(function (lay, li) {
        var mons = [];
        for (var i = 0; i < 6; i++) {
          var m = entry(bytes, i * lay.stride, lay);
          if (!m) break;
          mons.push(m);
        }
        if (mons.length > best.mons.length) best = { mons: mons, layout: li };
      });
      return best;
    }
    function decodeBoxes(bytes) {
      var out = [];
      for (var b = 0; b < F.boxes; b++) {
        var row = [];
        for (var s = 0; s < F.slots; s++) row.push(stored(bytes, (b * F.slots + s) * F.stored));
        out.push(row);
      }
      return out;
    }

    /* ── Suchen ── */
    function locate() {
      needScan = false;
      // Gesuchte Pokémon: Team (mit Platz) und Boxen (mit laufender Nummer)
      var want = [], seen = {};
      function push(m, boxIndex) {
        var k = keyOf(kind, m);
        if (seen[k] || want.length >= MAX_PATTERNS) return;
        seen[k] = 1;
        want.push({ key: k, box: boxIndex });
      }
      data.party.forEach(function (m) { push(m, -1); });
      data.boxes.forEach(function (bx, b) { bx.slots.forEach(function (m, s) { if (m) push(m, b * F.slots + s); }); });
      function none() { party = []; boxes = []; lastScan = now(); }
      if (!want.length) { none(); return Promise.resolve(); }

      // Schon einmal fündig: zuerst nur in der Nähe suchen (Bruchteil der Zeit); bringt das nichts, beim nächsten Mal überall
      var range = near && !nearFailed ? near : null;
      return bridge.scan(want.map(function (w) { return sigHex(w.key); }), range && range.lo, range && range.hi).then(function (res) {
        info.searched = true;
        if (!res || !res.hits) { none(); if (range) { nearFailed = true; lastScan = 0; } return; }
        info.scanMs = res.ms || 0; info.scanMb = res.mb || 0;
        var hits = res.hits.map(function (h) { return { w: want[h[0]], addr: parseInt(h[1], 16) }; })
          .filter(function (h) { return h.w && h.addr > 0; });
        if (!hits.length) { none(); if (range) { nearFailed = true; lastScan = 0; } return; }
        return bridge.read(hits.map(function (h) { return h.addr; }), F.stored).then(function (bufs) {
          hits = hits.filter(function (h, i) { return bufs[i] && stored(bufs[i], 0); });

          // Boxen: Jede Fundstelle eines Box-Pokémon „stimmt“ für einen Anfang der Reihe
          var votes = {};
          hits.forEach(function (h) { if (h.w.box >= 0) { var b = h.addr - h.w.box * F.stored; votes[b] = (votes[b] || 0) + 1; } });
          var boxBases = Object.keys(votes).map(Number).sort(function (a, b) { return votes[b] - votes[a] || a - b; });
          var top = boxBases.length ? votes[boxBases[0]] : 0;
          boxBases = boxBases.filter(function (b) { return votes[b] === top; }).slice(0, MAX_BOX);
          function inBox(addr) {
            return boxBases.some(function (b) { return addr >= b && addr < b + BOX_LEN && (addr - b) % F.stored === 0; });
          }
          var rest = hits.filter(function (h) { return !inBox(h.addr); });

          // Team: Fundstelle selbst und bis zu fünf Plätze davor lesen – je Anordnung so weit zurückgehen, wie davor
          // gültige Team-Einträge stehen; die Anordnung mit der längsten Reihe gibt den Anfang
          var probes = [];
          rest.forEach(function (h) { F.layouts.forEach(function (lay) { for (var k = 0; k <= 5; k++) probes.push(h.addr - k * lay.stride); }); });
          return (probes.length ? bridge.read(probes, ENTRY) : Promise.resolve([])).then(function (pb) {
            var bases = {}, n = 0;
            rest.forEach(function (h) {
              var bestBase = -1, bestRun = 0;
              F.layouts.forEach(function (lay) {
                var run = 0;
                while (run <= 5 && pb[n + run] && h.addr - run * lay.stride > 0 && entry(pb[n + run], 0, lay)) run++;
                n += 6;
                if (run > bestRun) { bestRun = run; bestBase = h.addr - (run - 1) * lay.stride; }
              });
              if (bestBase > 0) bases[bestBase] = 1;       // an der Fundstelle steht ein gültiger Team-Eintrag
            });
            var old = {};
            party.concat(boxes).forEach(function (c) { old[c.base] = c; });
            party = Object.keys(bases).map(Number).sort(function (a, b) { return a - b; }).slice(0, MAX_PARTY)
              .map(function (b) { return old[b] || { base: b, sig: null, changed: 0, mons: [], layout: 0 }; });
            boxes = boxBases.map(function (b) { return old[b] || { base: b, hash: null, changed: 0, mons: null }; });
            lastScan = now();
            if (party.length) {
              var all = party.concat(boxes).map(function (c) { return c.base; });
              near = { lo: Math.max(0x10000, Math.min.apply(null, all) - NEAR), hi: Math.max.apply(null, all) + BOX_LEN + NEAR };
              nearFailed = false;
            } else if (range) { nearFailed = true; lastScan = 0; }       // in der Nähe nichts: gleich überall suchen
          });
        });
      });
    }

    /* ── Mitlesen ── */
    function pick(list, score) {
      var best = null;
      list.forEach(function (c) { if (score(c) && (!best || c.changed > best.changed || (c.changed === best.changed && score(c) > score(best)))) best = c; });
      return best;
    }
    function readParty() {
      if (!party.length) return Promise.resolve(null);
      return bridge.read(party.map(function (c) { return c.base; }), PARTY_LEN).then(function (bufs) {
        party.forEach(function (c, i) {
          var d = bufs[i] ? decodeParty(bufs[i]) : { mons: [], layout: c.layout };
          var sig = listSig(kind, d.mons);
          if (c.sig !== null && sig !== c.sig) c.changed = tick;
          c.sig = sig; c.mons = d.mons; c.layout = d.layout;
        });
        // gültig = mindestens ein Pokémon und nicht der vorletzte Stand aus der Datei; bei Gleichstand: steht so nicht in
        // der Datei (ist also neuer) > Anordnung des laufenden Spiels > mehr Pokémon
        return pick(party, function (c) {
          if (!c.mons.length || staleSigs[c.sig]) return 0;
          return (c.sig !== fileSig ? 1000 : 0) + (F.layouts.length - c.layout) * 10 + c.mons.length;
        });
      });
    }
    function readBoxes() {
      if (!boxes.length) return Promise.resolve(null);
      return bridge.read(boxes.map(function (c) { return c.base; }), BOX_LEN).then(function (bufs) {
        boxes.forEach(function (c, i) {
          var h = bufs[i] ? hash(bufs[i]) : -1;
          if (c.hash !== null && h !== c.hash) c.changed = tick;
          if (h !== c.hash) c.mons = null;
          c.hash = h; c.bytes = bufs[i] || null;
        });
        return pick(boxes, function (c) { return c.bytes ? 1 : 0; });
      });
    }

    function poll() {
      tick++;
      // Suchen: am Anfang; ohne Fund alle 10 s (bei langsamer Suche seltener); und auch live gelegentlich in der Nähe –
      // lädt man im Spiel neu, liegt das Team danach evtl. woanders, und an der alten Stelle steht noch der alte Stand
      var age = now() - lastScan;
      var due = info.state === 'live' ? age > LIVE_RESCAN_MS : age > Math.max(RESCAN_MS, info.scanMs * 4);
      return (needScan || due ? locate() : Promise.resolve()).then(readParty).then(function (p) {
        return readBoxes().then(function (b) {
          info.party = party.length; info.boxes = boxes.length;
          if (!p) {
            lastParty = '';
            if (++lostFor >= LOST_AFTER || !party.length) {
              if (info.state === 'live') { nearFailed = false; lastScan = 0; }       // gleich neu suchen, zuerst in der Nähe
              info.state = party.length ? 'lost' : 'search'; outParty = null; outBoxes = null; sentParty = ''; sentBox = -1;
            }
            return null;
          }
          lostFor = 0;
          // erst übernehmen, was zweimal gleich gelesen wurde
          var stableP = p.sig === lastParty, stableB = !b || b.hash === lastBox;
          lastParty = p.sig; lastBox = b ? b.hash : -1;
          if (!stableP || !stableB) return null;
          info.state = 'live';
          var fresh = p.sig !== sentParty || (b ? b.hash : -1) !== sentBox;
          if (fresh) {
            outParty = p.mons;
            if (b) { if (!b.mons) b.mons = decodeBoxes(b.bytes); outBoxes = b.mons; } else outBoxes = null;
            sentParty = p.sig; sentBox = b ? b.hash : -1;
          }
          return { party: outParty, boxes: outBoxes, fresh: fresh };
        });
      });
    }

    return {
      poll: poll,
      info: info,
      rescan: function () { needScan = true; nearFailed = true; },            // von Hand: überall suchen
      setData: function (d) { useData(d); needScan = true; },
      _internal: { party: function () { return party; }, boxes: function () { return boxes; } }
    };
  }

  var api = { tracker: tracker, reader: reader, fileParties: fileParties, FORMATS: FORMATS, sigHex: sigHex, keyOf: keyOf };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.LiveMem = api;
})(typeof self !== 'undefined' ? self : this);
