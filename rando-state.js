/*
 * rando-state.js – der Randomizer-Stand des Hubs: eine randomisierte Platin-ROM, ausgelesen von Bosse/rando.js
 * (Trainer-Teams für den Boss-Planer, wilde Pokémon für Karte, Run-Dashboard und Duo).
 *
 * Ein Stand pro Gerät (localStorage 'bosse-rando'). Der Randomizer setzt ihn nach dem Würfeln; sonst lädt man die
 * ROM einmal über „Randomizer-ROM laden“ – im Boss-Planer, auf der Karte oder im Run-Dashboard, es gilt überall.
 * Änderungen melden sich als Ereignis 'hubrandochange' (auch aus anderen Tabs).
 *
 * Wilde Pokémon: wild[n] = Tabelle n aus pl_enc_data.narc (Format siehe rando.js readWild); welche Tabellen zu
 * welchem Ort gehören, steht in Karte/encounter-areas.js (PT_ENCOUNTER_AREAS, erzeugt von build-platin.js).
 */
(function (root) {
  'use strict';

  var KEY = 'bosse-rando';
  var BASE = (document.currentScript && document.currentScript.src || '').replace(/rando-state\.js(\?.*)?$/, '');
  var TEXT = {
    de: { active: 'Randomizer:', remove: 'Randomizer-Stand entfernen – wieder das Original', load: 'Randomizer-ROM laden',
      reading: 'Lese ROM …', noWild: 'Dieser Stand ist älter und kennt die wilden Pokémon noch nicht – lade die ROM einmal neu.',
      hint: 'Für Randomizer-Runs: Lade deine randomisierte Platin-ROM (.nds) – Karte, Boss-Planer und Run-Dashboard zeigen dann dein gewürfeltes Spiel. Die Datei bleibt auf deinem Gerät.',
      error: 'Das ist keine Pokémon-Platin-ROM (.nds).', full: 'Der Speicher ist voll – der Stand gilt nur, bis die Seite geschlossen wird.' },
    en: { active: 'Randomizer:', remove: 'Remove the randomizer data – back to the original', load: 'Load randomizer ROM',
      reading: 'Reading ROM …', noWild: 'This data is older and does not know the wild Pokémon yet – load the ROM again once.',
      hint: 'For randomizer runs: load your randomized Platinum ROM (.nds) – the map, boss planner and run dashboard then show your randomized game. The file stays on your device.',
      error: 'This is not a Pokémon Platinum ROM (.nds).', full: 'Storage is full – the data only lasts until the page is closed.' }
  };
  var memory = null;   // falls localStorage voll ist: nur für diese Seite
  var lang = function () { try { return localStorage.getItem('hub-lang') === 'en' ? 'en' : 'de'; } catch (e) { return 'de'; } };
  var text = function () { return TEXT[lang()]; };

  function get() {
    if (memory) return memory;
    try {
      var v = JSON.parse(localStorage.getItem(KEY) || 'null');
      return v && typeof v === 'object' && !Array.isArray(v) ? v : null;
    } catch (e) { return null; }
  }
  function notify() { document.dispatchEvent(new CustomEvent('hubrandochange', { detail: get() })); }
  // true = dauerhaft gespeichert, false = nur für diese Seite (Speicher voll)
  function set(state) {
    memory = null;
    try { localStorage.setItem(KEY, JSON.stringify(state)); }
    catch (e) { memory = state; notify(); return false; }
    notify();
    return true;
  }
  function clear() {
    memory = null;
    try { localStorage.removeItem(KEY); } catch (e) { /* egal */ }
    notify();
  }
  root.addEventListener('storage', function (e) { if (e.key === KEY || e.key === null) { memory = null; notify(); } });

  // Bausteine erst beim Laden einer ROM holen (Seiten wie die Karte brauchen sie sonst nicht)
  function script(src, ready) {
    if (ready()) return Promise.resolve();
    return new Promise(function (resolve, reject) {
      var s = document.createElement('script');
      s.src = BASE + src;
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('load ' + src)); };
      document.head.appendChild(s);
    });
  }
  // ROM lesen (Trainer für den Boss-Planer, wilde Pokémon, Starter) und als Stand setzen
  function load(file) {
    return Promise.all([
      script('Bosse/rando.js', function () { return !!root.Rando; }),
      script('SaveViewer/data-pt.js', function () { return !!root.PT_DATA; }),
      fetch(BASE + 'Bosse/bosses.json').then(function (r) { return r.json(); })
    ]).then(function (r) {
      var B = r[2];
      return root.Rando.readRomFile(file, Object.keys(B.trainers).map(Number), B.fem, root.PT_DATA.personal);
    }).then(function (res) {
      var state = Object.assign({ name: file.name, loadedAt: Date.now() }, res);
      return { state: state, saved: set(state) };
    });
  }

  // Nur lesen, ohne den Stand dieses Geräts zu ändern – z. B. die ROM des Mitspielers in Duo (nur wilde Pokémon, Starter)
  function read(file) {
    return script('Bosse/rando.js', function () { return !!root.Rando; }).then(function () {
      return root.Rando.readRomFile(file, [], [], []);
    }).then(function (res) {
      return { name: file.name, loadedAt: Date.now(), wild: res.wild, starters: res.starters, code: res.code };
    });
  }

  /* ── Wilde Pokémon ─────────────────────────────────────────────── */
  var LAND = [20, 20, 10, 10, 10, 10, 5, 5, 4, 4, 1, 1];
  var WATER = [60, 30, 5, 4, 1], RODS = [40, 40, 15, 4, 1];
  // Liste [{ id, p (Prozent), min, max }], häufigste zuerst – wie die Karte (build-platin.js) sie aus pret baut
  function table(slots, rates) {
    var map = {}, out = [];
    slots.forEach(function (s, i) {
      if (!s.id) return;
      var cur = map[s.id];
      if (!cur) { cur = map[s.id] = { id: s.id, p: 0, min: 99, max: 0 }; out.push(cur); }
      cur.p += rates[i];
      cur.min = Math.min(cur.min, s.min);
      cur.max = Math.max(cur.max, s.max);
    });
    return out.sort(function (a, b) { return b.p - a.p; });
  }
  var ids = function (list) {
    var seen = {};
    return (list || []).filter(function (x) { if (!x || seen[x]) return false; seen[x] = true; return true; }).map(function (x) { return { id: x }; });
  };
  // Eine Tabelle (rando.js) im Format der Karte: morning/day/night, surf, oldRod, goodRod, superRod, swarm, radar, dualSlot
  function wildTable(t) {
    if (!t) return null;
    var out = {};
    if (t.r) {
      var land = t.land.map(function (x) { return { id: x[1], min: x[0], max: x[0] }; });
      // Morgens = Grundtabelle; tagsüber/nachts ersetzen die Plätze 3 und 4
      var withTime = function (list) { return land.map(function (s, i) { return (i === 2 || i === 3) && list[i - 2] ? { id: list[i - 2], min: s.min, max: s.max } : s; }); };
      out.morning = table(land, LAND);
      out.day = table(withTime(t.day), LAND);
      out.night = table(withTime(t.night), LAND);
    }
    var water = function (w, rates) { return w && w.r ? table(w.s.map(function (s) { return { id: s[2], min: s[0], max: s[1] }; }), rates) : null; };
    if (water(t.surf, WATER)) out.surf = water(t.surf, WATER);
    if (water(t.old, WATER)) out.oldRod = water(t.old, WATER);
    if (water(t.good, RODS)) out.goodRod = water(t.good, RODS);
    if (water(t.super, RODS)) out.superRod = water(t.super, RODS);
    if (ids(t.swarm).length) out.swarm = ids(t.swarm);
    if (ids(t.radar).length) out.radar = ids(t.radar);
    if (ids(t.dual).length) out.dualSlot = ids(t.dual);
    return Object.keys(out).length ? out : null;
  }
  // Orte, die in den Routenlisten (locations.js) anders heißen als auf der Karte (PokéAPI-Namen)
  var PLACE_ALIAS = { 'Pokémon Liga': 'Pokémon-Liga', 'Ruinengrotte': 'Maniac-Tunnel' };
  function area(place) {
    var areas = root.PT_ENCOUNTER_AREAS;
    return areas ? areas[PLACE_ALIAS[place] || place] || null : null;
  }
  // Original-Arten eines Ortes (Platin: Gras, Surfen, Angeln), null = keine wilden Pokémon bekannt
  function originalAt(place) { var a = area(place); return a ? a.orig.slice() : null; }
  // Alle Arten eines Ortes (Name wie in den Routenlisten oder auf der Karte) im Stand, häufigste Land-Begegnungen zuerst.
  // main: nur Gras, Surfen und Angeln – ohne Schwarm, Pokéradar und GBA-Modul (wie originalAt)
  var MAIN = ['morning', 'day', 'night', 'surf', 'oldRod', 'goodRod', 'superRod'];
  function speciesAt(state, place, main) {
    var a = area(place);
    if (!a || !state || !Array.isArray(state.wild)) return null;
    var seen = {}, out = [];
    a.enc.forEach(function (n) {
      var w = wildTable(state.wild[n]);
      if (!w) return;
      (main ? MAIN : MAIN.concat(['swarm', 'radar', 'dualSlot'])).forEach(function (k) {
        (w[k] || []).forEach(function (e) { if (!seen[e.id]) { seen[e.id] = true; out.push(e.id); } });
      });
    });
    return out;
  }

  /* ── Chip „Randomizer: Name ×“ bzw. Knopf „Randomizer-ROM laden“ ─────── */
  // el: Platz für den Chip; onError(text) für Meldungen (sonst alert). Zeichnet sich bei Änderungen selbst neu.
  function chip(el, onError) {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = '.nds';
    input.hidden = true;
    var report = onError || function (msg) { root.alert(msg); };
    function draw() {
      var t = text(), s = get();
      el.classList.add('hub-rando');
      el.innerHTML = '';
      if (s) {
        el.innerHTML = '<span class="hub-rando-chip" title="' + esc(s.name) + '">' + esc(t.active) + ' <b>' + esc(s.name) + '</b>' +
          '<button type="button" aria-label="' + esc(t.remove) + '" title="' + esc(t.remove) + '">×</button></span>';
        el.querySelector('button').addEventListener('click', clear);
      } else {
        var b = document.createElement('button');
        b.type = 'button';
        b.className = 'hub-rando-load';
        b.textContent = t.load;
        b.title = t.hint;
        b.addEventListener('click', function () { input.click(); });
        el.appendChild(b);
      }
      el.appendChild(input);
    }
    input.addEventListener('change', function () {
      var f = input.files[0];
      input.value = '';
      if (!f) return;
      var b = el.querySelector('.hub-rando-load');
      if (b) { b.disabled = true; b.textContent = text().reading; }
      load(f).then(function (r) { if (!r.saved) report(text().full); }, function (e) {
        report(e && e.message === 'notPlatinum' ? text().error : text().error + ' (' + (e && e.message) + ')');
        draw();
      });
    });
    document.addEventListener('hubrandochange', draw);
    document.addEventListener('langchange', draw);
    draw();
  }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; });
  }

  root.PokeHubRando = {
    KEY: KEY, get: get, set: set, clear: clear, load: load, read: read, chip: chip,
    wildTable: wildTable, speciesAt: speciesAt, originalAt: originalAt, text: text
  };
})(window);
