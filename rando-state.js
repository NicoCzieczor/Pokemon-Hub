/*
 * rando-state.js – der Randomizer-Stand des Hubs: eine randomisierte ROM von Platin (ausgelesen von Bosse/rando.js) oder
 * Omega Rubin / Alpha Saphir (Bosse/oras-rom.js, game: 'oras') – Trainer-Teams für den Boss-Planer, wilde Pokémon für
 * Karte, Run-Dashboard und Duo. Seiten prüfen state.game ('oras'; fehlt bei Platin) und nutzen nur den Stand ihres Spiels.
 *
 * Ein Stand pro Gerät (localStorage 'bosse-rando'). Der Randomizer setzt ihn nach dem Würfeln; sonst lädt man die
 * ROM einmal über „Randomizer-ROM laden“ – im Boss-Planer, auf der Karte oder im Run-Dashboard, es gilt überall.
 * Änderungen melden sich als Ereignis 'hubrandochange' (auch aus anderen Tabs).
 *
 * Wilde Pokémon: wild[n] = Tabelle n aus pl_enc_data.narc (Format siehe rando.js readWild); welche Tabellen zu
 * welchem Ort gehören, steht in Karte/encounter-areas.js (PT_ENCOUNTER_AREAS, erzeugt von build-platin.js).
 * Omega Rubin / Alpha Saphir: wild[n] = Zone n (Format oras-rom.js wildTable), Orte in ORAS_ENCOUNTER_AREAS.
 * Die ROM kann eine .3ds/.cxi-Datei sein oder der Mod-Ordner von Citra (LayeredFS, Ausgabe des Randomizers).
 */
(function (root) {
  'use strict';

  var KEY = 'bosse-rando';
  var BASE = (document.currentScript && document.currentScript.src || '').replace(/rando-state\.js(\?.*)?$/, '');
  var TEXT = {
    de: { active: 'Randomizer:', remove: 'Randomizer-Stand entfernen – wieder das Original', load: 'Randomizer-ROM laden',
      reading: 'Lese ROM …', noWild: 'Dieser Stand ist älter und kennt die wilden Pokémon noch nicht – lade die ROM einmal neu.',
      hint: 'Für Randomizer-Runs: Lade deine randomisierte ROM – Platin (.nds) oder Omega Rubin / Alpha Saphir (.3ds/.cxi) – Karte, Boss-Planer und Run-Dashboard zeigen dann dein gewürfeltes Spiel. Die Datei bleibt auf deinem Gerät.',
      folder: 'Mod-Ordner', folderHint: 'Omega Rubin / Alpha Saphir: den Mod-Ordner aus Citra wählen (darin liegt „romfs“) – so kommt der Randomizer ihn heraus.',
      error: 'Das ist keine passende ROM: Platin (.nds) oder Omega Rubin / Alpha Saphir (.3ds/.cxi, entschlüsselt, oder der Mod-Ordner).', full: 'Der Speicher ist voll – der Stand gilt nur, bis die Seite geschlossen wird.' },
    en: { active: 'Randomizer:', remove: 'Remove the randomizer data – back to the original', load: 'Load randomizer ROM',
      reading: 'Reading ROM …', noWild: 'This data is older and does not know the wild Pokémon yet – load the ROM again once.',
      hint: 'For randomizer runs: load your randomized ROM – Platinum (.nds) or Omega Ruby / Alpha Sapphire (.3ds/.cxi) – the map, boss planner and run dashboard then show your randomized game. The file stays on your device.',
      folder: 'Mod folder', folderHint: 'Omega Ruby / Alpha Sapphire: choose the mod folder from Citra (it contains “romfs”) – that is what the randomizer puts out.',
      error: 'This is not a matching ROM: Platinum (.nds) or Omega Ruby / Alpha Sapphire (.3ds/.cxi, decrypted, or the mod folder).', full: 'Storage is full – the data only lasts until the page is closed.' }
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
  // 3DS-ROM (NCSD/NCCH) oder Ordner? Sonst DS (Platin)
  function is3ds(files) {
    if (files.length > 1 || (files[0].webkitRelativePath || '').indexOf('/') >= 0) return Promise.resolve(true);
    return files[0].slice(0x100, 0x104).arrayBuffer().then(function (b) {
      var s = String.fromCharCode.apply(null, new Uint8Array(b));
      return s === 'NCSD' || s === 'NCCH';
    });
  }
  // Omega Rubin / Alpha Saphir: Trainer wie bosses-oras.json, geänderte Basiswerte, Starter, wilde Pokémon je Zone
  function readOras(files, withTrainers) {
    return Promise.all([
      script('Bosse/oras-rom.js', function () { return !!root.OrasRom; }),
      script('SaveViewer/data-oras.js', function () { return !!root.ORAS_DATA; }),
      fetch(BASE + 'Bosse/bosses-oras.json').then(function (r) { return r.json(); })
    ]).then(function (r) {
      var B = r[2];
      return root.OrasRom.readFiles(files).then(function (g) {
        if (!g.game && !g.trainers && !g.wild) throw new Error('notOras');
        return root.OrasRom.hubState(g, withTrainers ? Object.keys(B.trainers).map(Number) : [], B, root.ORAS_DATA.personal);
      });
    });
  }
  // Name eines Ordners: der oberste Teil des Pfads
  function nameOf(files) {
    var p = files[0].webkitRelativePath || '';
    return p.indexOf('/') >= 0 ? p.split('/')[0] : files[0].name;
  }

  // ROM lesen (Trainer für den Boss-Planer, wilde Pokémon, Starter) und als Stand setzen.
  // file: eine Datei oder die Dateien eines Ordners (FileList, nur Omega Rubin / Alpha Saphir)
  function load(file) {
    var files = file && file.length != null && !(file instanceof Blob) ? Array.prototype.slice.call(file) : [file];
    return is3ds(files).then(function (three) {
      if (!three) return loadPt(files[0]);
      return readOras(files, true).then(function (res) {
        var state = Object.assign({ name: nameOf(files), loadedAt: Date.now() }, res);
        return { state: state, saved: set(state) };
      });
    });
  }
  function loadPt(file) {
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
    var files = file && file.length != null && !(file instanceof Blob) ? Array.prototype.slice.call(file) : [file];
    return is3ds(files).then(function (three) {
      if (!three) return readPt(files[0]);
      return readOras(files, false).then(function (res) {
        return { game: 'oras', version: res.version, name: nameOf(files), loadedAt: Date.now(), wild: res.wild, starters: res.starters };
      });
    });
  }
  function readPt(file) {
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
  // Orte, die in den Routenlisten (locations.js) anders heißen als auf der Karte (PokéAPI- bzw. ROM-Namen)
  var PLACE_ALIAS = { 'Pokémon Liga': 'Pokémon-Liga', 'Ruinengrotte': 'Maniac-Tunnel' };
  var PLACE_ALIAS_ORAS = { 'Metarost-Tunnel': 'Metaflurtunnel' };
  function area(place, game) {
    if (game === 'oras') {
      var oa = root.ORAS_ENCOUNTER_AREAS;
      return oa ? oa[PLACE_ALIAS_ORAS[place] || place] || null : null;
    }
    var areas = root.PT_ENCOUNTER_AREAS;
    return areas ? areas[PLACE_ALIAS[place] || place] || null : null;
  }
  // Original-Arten eines Ortes (Gras, Surfen, Angeln), null = keine wilden Pokémon bekannt.
  // game: 'oras' für Omega Rubin / Alpha Saphir (version 'as' = die Editions-Pokémon von Alpha Saphir), sonst Platin
  function originalAt(place, game, version) {
    var a = area(place, game);
    return a ? (version === 'as' && a.origAs ? a.origAs : a.orig).slice() : null;
  }
  // Alle Arten eines Ortes (Name wie in den Routenlisten oder auf der Karte) im Stand, häufigste Land-Begegnungen zuerst.
  // main: nur Gras, Surfen und Angeln – ohne Schwarm, Pokéradar und GBA-Modul (wie originalAt)
  var MAIN = ['morning', 'day', 'night', 'surf', 'oldRod', 'goodRod', 'superRod'];
  // Omega Rubin / Alpha Saphir: Zonen im Format von oras-rom.js (wildTable), je Platz [Art, Form, min, max]
  var MAIN_ORAS = ['grass', 'tall', 'surf', 'old', 'good', 'super'], MORE_ORAS = ['hordeA', 'hordeB', 'hordeC', 'smash', 'dexnav'];
  function speciesAt(state, place, main) {
    if (state && state.game === 'oras') {
      var oa = area(place, 'oras');
      if (!oa || !Array.isArray(state.wild)) return null;
      var seenO = {}, outO = [];
      oa.enc.forEach(function (n) {
        var z = state.wild[n];
        if (!z) return;
        (main ? MAIN_ORAS : MAIN_ORAS.concat(MORE_ORAS)).forEach(function (k) {
          (z[k] || []).forEach(function (s) { if (s && !seenO[s[0]]) { seenO[s[0]] = true; outO.push(s[0]); } });
        });
      });
      return outO;
    }
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
    input.accept = '.nds,.3ds,.cxi,.cci';
    input.hidden = true;
    // Mod-Ordner von Citra (Omega Rubin / Alpha Saphir), wo der Browser Ordner wählen kann
    var dir = document.createElement('input');
    dir.type = 'file';
    dir.hidden = true;
    var canDir = 'webkitdirectory' in dir;
    if (canDir) dir.webkitdirectory = true;
    var orasGame = function () { return !!(root.PokeHubGame && root.PokeHubGame.get() === 'omega-rot-alpha-saphir'); };
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
        if (canDir && orasGame()) {
          var d = document.createElement('button');
          d.type = 'button';
          d.className = 'hub-rando-load hub-rando-dir';
          d.textContent = t.folder;
          d.title = t.folderHint;
          d.addEventListener('click', function () { dir.click(); });
          el.appendChild(d);
        }
      }
      el.appendChild(input);
      el.appendChild(dir);
    }
    function pick(files) {
      if (!files || !files.length) return;
      var b = el.querySelector('.hub-rando-load');
      if (b) { b.disabled = true; b.textContent = text().reading; }
      load(files.length > 1 ? files : files[0]).then(function (r) { if (!r.saved) report(text().full); }, function (e) {
        report(e && /^not(Platinum|Oras|Rom|Layered)$/.test(e.message) ? text().error : text().error + ' (' + (e && e.message) + ')');
        draw();
      });
    }
    input.addEventListener('change', function () { var f = Array.prototype.slice.call(input.files); input.value = ''; pick(f); });
    dir.addEventListener('change', function () { var f = Array.prototype.slice.call(dir.files); dir.value = ''; pick(f); });
    document.addEventListener('hubrandochange', draw);
    document.addEventListener('hubgamechange', draw);
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
