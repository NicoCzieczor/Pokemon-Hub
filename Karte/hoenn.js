/*
 * Karte von Hoenn (Omega Rubin / Alpha Saphir) – übernimmt die Karten-Seite, wenn das Hub-Spiel OR/AS ist
 * (sonst läuft wie bisher app.js mit Sinnoh).
 *
 * Anders als bei Platin gibt es keine aus dem Spiel gerenderte Oberwelt: Die Regionskarte ist das Raster der
 * Hoenn-Karte (28 × 15 Felder, pret/pokeemerald) – Städte, Routen (Land/Wasser) und Orte zum Antippen.
 * Daneben je Ort die wilden Pokémon mit Raten und Leveln (Gras, Langes Gras, Horden, DexNav, Surfen, Zertrümmerer,
 * Angeln), für Omega Rubin oder Alpha Saphir, aus dem Randomizer-Stand oder dem Original, dazu die Bosse des Ortes
 * (Boss-Planer). Suche nach Orten und Pokémon, Direktlinks #<ort> und #pokemon-<nr>, das Meer hinter der Karte (sea.js).
 *
 * Daten: oras.json (tools/build-oras.js), ../SaveViewer/data-oras.js (Namen), ../Bosse/oras-rom.js (Raten gewürfelter
 * Zonen), ../Bosse/bosses-oras.json (Bosse). Aussehen: hoenn.css.
 */
(function () {
  'use strict';

  var ORAS = 'omega-rot-alpha-saphir';
  var isOras = function () { return !!(window.PokeHubGame && window.PokeHubGame.get() === ORAS); };
  // Spiel gewechselt (Chip „Spiel wählen“): die passende Karte laden
  document.addEventListener('hubgamechange', function () { if (isOras() !== !!window.KARTE_HOENN) location.reload(); });
  if (!isOras()) return;
  window.KARTE_HOENN = true;

  var TEXT = {
    de: {
      title: 'Karte von Hoenn', badge: 'Omega Rubin / Alpha Saphir',
      subtitle: 'Wilde Pokémon jedes Ortes – mit Raten, Horden, DexNav und Angeln – und die Bosse dort. Ort auf der Karte antippen oder suchen.',
      search: 'Ort oder Pokémon suchen…', note: 'Regionskarte nach dem Raster der Hoenn-Karte (pret/pokeemerald). Wilde Pokémon aus der ROM von Omega Rubin; Alpha Saphir mit seinen Editions-Pokémon (Unterschiede aus PKHeX).',
      or: 'Omega Rubin', as: 'Alpha Saphir', all: 'Alle Orte', hint: 'Tippe auf die Karte oder wähle einen Ort.', back: 'Alle Orte',
      towns: 'Städte', routes: 'Routen', places: 'Höhlen, Inseln & Orte', mirage: 'Wunder-Orte & Sonstiges',
      town: 'Stadt', city: 'Stadt', route: 'Route', place: 'Ort', tabWild: 'Wilde Pokémon', tabBoss: 'Bosse',
      area: function (n) { return 'Bereich ' + n; }, level: 'Lv.', noWild: 'Hier gibt es keine wilden Pokémon.', noBoss: 'Hier gibt es keine Bosse.',
      grass: 'Gras', tall: 'Langes Gras', horde: 'Horden', dexnav: 'Nur mit DexNav', surf: 'Surfen', smash: 'Zertrümmerer',
      old: 'Angel', good: 'Profiangel', super: 'Superangel', hordeN: function (n) { return n + '×'; },
      rando: 'Gewürfelt', orig: 'Original', randoNote: function (n) { return 'Aus deinem Randomizer-Stand „' + n + '“.'; },
      versionDiff: 'In Alpha Saphir gibt es hier andere Editions-Pokémon.',
      toBoss: 'Im Boss-Planer', cap: 'Level-Cap', mon: 'Pokémon', monWhere: function (n) { return n === 1 ? 'Kommt an 1 Ort wild vor' : 'Kommt an ' + n + ' Orten wild vor'; },
      monNone: 'Kommt in diesem Spiel nicht wild vor.', places1: '1 Ort', placesN: function (n) { return n + ' Orte'; }, noResults: 'Nichts gefunden.',
      toDex: 'Im Pokédex ansehen →', loadError: 'Die Kartendaten konnten nicht geladen werden.', loading: 'Karte wird geladen…'
    },
    en: {
      title: 'Map of Hoenn', badge: 'Omega Ruby / Alpha Sapphire',
      subtitle: 'The wild Pokémon of every place – with rates, hordes, DexNav and fishing – and the bosses there. Tap a place on the map or search.',
      search: 'Search a place or Pokémon…', note: 'Region map after the grid of the Hoenn town map (pret/pokeemerald). Wild Pokémon from the Omega Ruby ROM; Alpha Sapphire with its version exclusives (differences from PKHeX).',
      or: 'Omega Ruby', as: 'Alpha Sapphire', all: 'All places', hint: 'Tap the map or choose a place.', back: 'All places',
      towns: 'Towns & cities', routes: 'Routes', places: 'Caves, islands & places', mirage: 'Mirage spots & more',
      town: 'Town', city: 'City', route: 'Route', place: 'Place', tabWild: 'Wild Pokémon', tabBoss: 'Bosses',
      area: function (n) { return 'Area ' + n; }, level: 'Lv.', noWild: 'There are no wild Pokémon here.', noBoss: 'There are no bosses here.',
      grass: 'Grass', tall: 'Long grass', horde: 'Hordes', dexnav: 'DexNav only', surf: 'Surfing', smash: 'Rock Smash',
      old: 'Old Rod', good: 'Good Rod', super: 'Super Rod', hordeN: function (n) { return n + '×'; },
      rando: 'Randomized', orig: 'Original', randoNote: function (n) { return 'From your randomizer data “' + n + '”.'; },
      versionDiff: 'Alpha Sapphire has other version exclusives here.',
      toBoss: 'In the Boss Planner', cap: 'Level cap', mon: 'Pokémon', monWhere: function (n) { return n === 1 ? 'Found wild in 1 place' : 'Found wild in ' + n + ' places'; },
      monNone: 'Not found in the wild in this game.', places1: '1 place', placesN: function (n) { return n + ' places'; }, noResults: 'Nothing found.',
      toDex: 'Open in Pokédex →', loadError: 'The map data could not be loaded.', loading: 'Loading map…'
    }
  };
  var METHODS = ['grass', 'tall', 'horde', 'dexnav', 'surf', 'smash', 'old', 'good', 'super'];
  var WATER = ['surf', 'old', 'good', 'super'];
  var WATER_ROUTES = [105, 106, 107, 108, 109, 122, 124, 125, 126, 127, 128, 129, 130, 131, 132, 133, 134];
  var CELL = 32;
  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

  var D = null, N = null, B = null, selected = -1, monView = null, tab = 'wild', mode = 'rando';
  var version = function () { try { return localStorage.getItem('bosse-oras-version') === 'as' ? 'as' : 'or'; } catch (e) { return 'or'; } };
  var $ = function (id) { return document.getElementById(id); };
  var lang = function () { return window.LANG === 'en' ? 'en' : 'de'; };
  var tx = function () { return TEXT[lang()]; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var locName = function (l) { return lang() === 'en' ? l.en : l.de; };
  var monName = function (id) { return (N && N.text[lang()].species[id]) || '#' + id; };
  var sprite = function (id) { return SPR + id + '.png'; };
  var norm = function (s) { return String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, ''); };

  function script(src) {
    return new Promise(function (res, rej) {
      var s = document.createElement('script');
      s.src = src; s.onload = res; s.onerror = function () { rej(new Error(src)); };
      document.head.appendChild(s);
    });
  }

  /* ── Randomizer-Stand ──────────────────────────────────────────── */
  var rando = function () { var s = window.PokeHubRando ? window.PokeHubRando.get() : null; return s && s.game === 'oras' && Array.isArray(s.wild) ? s : null; };
  var usingRando = function () { return mode === 'rando' && !!rando(); };
  // Tabellen eines Ortes im gezeigten Stand: [{ zone, t }]
  function wildOf(l) {
    var r = usingRando() ? rando() : null;
    return l.wild.map(function (w) {
      var t = r ? window.OrasRom.wildTables(r.wild[w.zone]) : (version() === 'as' && w.as) || w.or;
      return { zone: w.zone, t: t };
    }).filter(function (w) { return w.t; });
  }

  /* ── Regionskarte ──────────────────────────────────────────────── */
  function cellKind(l) {
    if (l.type === 'route') return WATER_ROUTES.indexOf(+l.en.replace(/\D/g, '')) >= 0 ? 'water' : 'land';
    return l.type === 'town' || l.type === 'city' ? 'town' : 'spot';
  }
  function mapSvg() {
    var W = D.width * CELL, H = D.height * CELL, parts = [], links = [];
    var at = function (x, y) { return y >= 0 && y < D.height && x >= 0 && x < D.width ? D.grid[y][x] : -1; };
    var PAD = { town: 3, land: 7, water: 7, spot: 8 };
    // Verbindungen zwischen benachbarten Orten (Route ↔ Stadt, Route ↔ Route) als schmale Stege
    D.grid.forEach(function (row, y) {
      row.forEach(function (li, x) {
        if (li < 0) return;
        [[1, 0], [0, 1]].forEach(function (d) {
          var o = at(x + d[0], y + d[1]);
          if (o < 0 || o === li) return;
          var k = [cellKind(D.locations[li]), cellKind(D.locations[o])].indexOf('water') >= 0 && cellKind(D.locations[li]) !== 'land' && cellKind(D.locations[o]) !== 'land' ? 'water' : 'land';
          var cx = x * CELL + CELL / 2, cy = y * CELL + CELL / 2;
          links.push(d[0] ? '<rect class="hm-link hm-link-' + k + '" x="' + cx + '" y="' + (cy - 3) + '" width="' + CELL + '" height="6"></rect>'
            : '<rect class="hm-link hm-link-' + k + '" x="' + (cx - 3) + '" y="' + cy + '" width="6" height="' + CELL + '"></rect>');
        });
      });
    });
    // Felder eines Ortes: zusammenhängende Reihen, gleiche Reihen untereinander zu einem Rechteck vereint
    D.locations.forEach(function (l, li) {
      var runs = [];
      D.grid.forEach(function (row, y) {
        for (var x = 0; x < D.width; x++) {
          if (row[x] !== li) continue;
          var x0 = x;
          while (x + 1 < D.width && row[x + 1] === li) x++;
          var prev = runs.filter(function (r) { return r.x0 === x0 && r.x1 === x && r.y1 === y - 1; })[0];
          if (prev) prev.y1 = y; else runs.push({ x0: x0, x1: x, y0: y, y1: y });
        }
      });
      var k = cellKind(l), pad = PAD[k];
      runs.forEach(function (r) {
        parts.push('<rect class="hm-cell hm-' + k + '" data-li="' + li + '" x="' + (r.x0 * CELL + pad) + '" y="' + (r.y0 * CELL + pad) + '" width="' + ((r.x1 - r.x0 + 1) * CELL - 2 * pad) +
          '" height="' + ((r.y1 - r.y0 + 1) * CELL - 2 * pad) + '" rx="' + (k === 'town' ? 4 : 9) + '"></rect>');
      });
    });
    parts = links.concat(parts);
    // Höhlen & Orte außerhalb des Rasters: Raute auf ihrem Feld (mehrere auf einem Feld nebeneinander)
    var used = {};
    D.locations.forEach(function (l, li) {
      if (!l.at || D.grid[l.at[1]] && D.grid[l.at[1]][l.at[0]] === li) return;
      var inGrid = D.grid.some(function (row) { return row.indexOf(li) >= 0; });
      if (inGrid) return;
      var key = l.at[0] + ':' + l.at[1], n = used[key] = (used[key] || 0) + 1;
      var off = [[0.74, 0.26], [0.26, 0.26], [0.74, 0.74], [0.26, 0.74]][(n - 1) % 4];
      var cx = (l.at[0] + off[0]) * CELL, cy = (l.at[1] + off[1]) * CELL, r = 6;
      parts.push('<path class="hm-spot' + (l.wild.length ? ' has-wild' : '') + '" data-li="' + li + '" d="M' + cx + ' ' + (cy - r) + 'L' + (cx + r) + ' ' + cy + 'L' + cx + ' ' + (cy + r) + 'L' + (cx - r) + ' ' + cy + 'Z"></path>');
    });
    return '<svg class="hm-svg" viewBox="0 0 ' + W + ' ' + H + '" preserveAspectRatio="xMidYMid meet" role="img" aria-label="' + esc(tx().title) + '">' +
      '<defs><pattern id="hm-waves" width="16" height="8" patternUnits="userSpaceOnUse"><path d="M0 6 Q4 2 8 6 T16 6" fill="none" class="hm-wave"/></pattern></defs>' +
      '<rect class="hm-sea" x="0" y="0" width="' + W + '" height="' + H + '"></rect><rect x="0" y="0" width="' + W + '" height="' + H + '" fill="url(#hm-waves)"></rect>' +
      parts.join('') + '</svg>';
  }
  function drawSelection() {
    var sel = selected >= 0 ? [selected] : monView != null ? monPlaces(monView).map(function (p) { return p.li; }) : [];
    document.querySelectorAll('#hoenn-map [data-li]').forEach(function (el) { el.classList.toggle('is-on', sel.indexOf(+el.dataset.li) >= 0); });
  }

  /* ── Seitenleiste ──────────────────────────────────────────────── */
  function typeLabel(l) { return tx()[l.type] || tx().place; }
  function renderDirectory() {
    selected = -1; monView = null;
    history.replaceState(null, '', location.pathname + location.search);
    var t = tx(), g = { towns: [], routes: [], places: [], mirage: [] };
    D.locations.forEach(function (l, li) {
      if (l.type === 'route') g.routes.push(li);
      else if (l.type === 'town' || l.type === 'city') g.towns.push(li);
      else if (l.at) g.places.push(li);
      else if (l.wild.length) g.mirage.push(li);
    });
    var group = function (title, list) {
      if (!list.length) return '';
      return '<div class="dir-group"><h3>' + esc(title) + ' <small>' + list.length + '</small></h3><div class="dir-list">' + list.map(function (li) {
        var l = D.locations[li];
        return '<button type="button" class="dir-item" data-loc="' + li + '">' + esc(locName(l)) + (l.wild.length ? '' : '') + '</button>';
      }).join('') + '</div></div>';
    };
    $('side-content').innerHTML = '<div class="side-head"><h2>' + esc(t.all) + '</h2><p>' + esc(t.hint) + '</p></div>' +
      group(t.towns, g.towns) + group(t.routes, g.routes) + group(t.places, g.places) + group(t.mirage, g.mirage);
    $('side-content').querySelectorAll('[data-loc]').forEach(function (b) { b.addEventListener('click', function () { select(+b.dataset.loc); }); });
    drawSelection();
    updateScene();
  }

  function modeHtml() {
    var r = rando(), t = tx();
    if (!r) return '';
    var btn = function (k, label) { return '<button type="button" class="wild-mode-btn' + (mode === k ? ' is-on' : '') + '" data-mode="' + k + '" aria-pressed="' + (mode === k) + '">' + esc(label) + '</button>'; };
    return '<div class="wild-mode"><span class="wild-mode-seg" role="group">' + btn('rando', t.rando) + btn('orig', t.orig) + '</span>' +
      (mode === 'rando' ? '<small>' + esc(t.randoNote(r.name)) + '</small>' : '') + '</div>';
  }
  function wildHtml(l) {
    var t = tx(), wild = wildOf(l);
    var head = modeHtml() + (!usingRando() && version() === 'as' && l.wild.some(function (w) { return w.as; }) ? '<p class="wild-rando-note">' + esc(t.versionDiff) + '</p>' : '');
    if (!wild.length) return head + '<p class="empty">' + esc(t.noWild) + '</p>';
    var lv = function (s) { return s.min == null ? '' : s.min === s.max ? s.min : s.min + '–' + s.max; };
    var cell = function (s) { return '<span class="wild-mon"><img src="' + sprite(s.id) + '" alt="" loading="lazy">' + esc(monName(s.id)) + '</span>'; };
    var block = function (k, list) {
      if (!list || !list.length) return '';
      if (k === 'dexnav') {
        return '<div class="wild-extras"><div><span class="extra-label">' + esc(t.dexnav) + ':</span> ' + list.map(function (s) {
          return '<span class="extra-mon" data-mon="' + s.id + '"><img src="' + sprite(s.id) + '" alt="" loading="lazy">' + esc(monName(s.id)) + '</span>';
        }).join('') + '</div></div>';
      }
      return '<div class="wild-block"><h4>' + esc(t[k]) + '</h4><table class="wild-table"><tbody>' + list.map(function (s) {
        return '<tr data-mon="' + s.id + '"><td>' + cell(s) + (k === 'horde' && s.n > 1 ? ' <small class="hm-n">' + esc(t.hordeN(s.n)) + '</small>' : '') + '</td><td class="lv">' + t.level + ' ' + lv(s) + '</td><td class="pct">' + s.p + ' %</td></tr>';
      }).join('') + '</tbody></table></div>';
    };
    return head + wild.map(function (w, i) {
      return '<div class="wild-area">' + (wild.length > 1 ? '<h3>' + esc(t.area(i + 1)) + '</h3>' : '') +
        METHODS.map(function (k) { return block(k, w.t[k]); }).join('') + '</div>';
    }).join('');
  }

  // Bosse des Ortes aus dem Boss-Planer (Edition beachten: „v“ an der Story-Gruppe)
  function bossesAt(l) {
    if (!B) return [];
    var out = [], v = version();
    B.story.concat(B.post).forEach(function (g) {
      if (g.v && g.v !== v) return;
      var ids = Object.keys(g.ids).map(function (k) { return g.ids[k]; });
      var t = B.trainers[ids[0]];
      if (!t || t.l == null || B.locs[t.l].id !== l.id) return;
      out.push({ id: ids[0], t: t });
    });
    return out;
  }
  function bossHtml(l) {
    var t = tx(), list = bossesAt(l), en = lang() === 'en';
    if (!list.length) return '<p class="empty">' + esc(t.noBoss) + '</p>';
    return '<div class="hm-bosses">' + list.map(function (b) {
      var cap = Math.max.apply(null, b.t.p.map(function (p) { return p[2]; }));
      return '<a class="hm-boss" href="../Bosse/index.html#t=' + b.id + '"><span class="hm-boss-cap"><small>' + esc(t.cap) + '</small>' + cap + '</span>' +
        '<span class="hm-boss-main"><b>' + esc((en ? b.t.ce : b.t.cd) + ' ' + (en ? b.t.ne : b.t.nd)) + '</b><span class="hm-boss-team">' +
        b.t.p.map(function (p) { return '<img src="' + sprite(p[0]) + '" alt="' + esc(monName(p[0])) + '" title="' + esc(monName(p[0]) + ' Lv. ' + p[2]) + '" loading="lazy">'; }).join('') +
        '</span></span><span class="hm-boss-go">' + esc(t.toBoss) + ' →</span></a>';
    }).join('') + '</div>';
  }

  function select(li) {
    selected = li; monView = null;
    var l = D.locations[li];
    history.replaceState(null, '', '#' + l.slug);
    if (tab === 'boss' && !bossesAt(l).length) tab = 'wild';
    renderLocation();
    drawSelection();
  }
  function renderLocation() {
    var t = tx(), l = D.locations[selected], bosses = bossesAt(l);
    var sub = [l.en !== l.de ? (lang() === 'en' ? l.de : l.en) : null, typeLabel(l)].filter(Boolean).join(' · ');
    var tabBtn = function (k, label, n, off) { return '<button type="button" class="tab' + (tab === k ? ' is-active' : '') + '" data-tab="' + k + '"' + (off ? ' disabled' : '') + '>' + esc(label) + (n != null ? ' <small>' + n + '</small>' : '') + '</button>'; };
    $('side-content').innerHTML = '<div class="side-head"><div class="back-row"><button type="button" class="back-btn" id="hm-back">← ' + esc(t.back) + '</button></div>' +
      '<h2>' + esc(locName(l)) + '</h2><p class="loc-sub">' + esc(sub) + '</p></div>' +
      '<div class="tabs">' + tabBtn('wild', t.tabWild, null, false) + tabBtn('boss', t.tabBoss, bosses.length, !bosses.length) + '</div>' +
      '<div class="tab-body">' + (tab === 'boss' ? bossHtml(l) : wildHtml(l)) + '</div>';
    $('hm-back').addEventListener('click', renderDirectory);
    $('side-content').querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { tab = b.dataset.tab; renderLocation(); }); });
    $('side-content').querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.mode; renderLocation(); }); });
    $('side-content').querySelectorAll('[data-mon]').forEach(function (r) { r.addEventListener('click', function () { renderMon(+r.dataset.mon); }); });
    updateScene();
  }

  // Ein Pokémon: alle Orte mit Methode und bester Chance
  function monPlaces(id) {
    var out = [];
    D.locations.forEach(function (l, li) {
      var hits = [];
      wildOf(l).forEach(function (w) {
        METHODS.forEach(function (k) { (w.t[k] || []).forEach(function (s) { if (s.id === id) hits.push({ k: k, p: s.p, min: s.min, max: s.max }); }); });
      });
      if (hits.length) out.push({ li: li, hits: hits, best: Math.max.apply(null, hits.map(function (h) { return h.p || 0; })) });
    });
    return out.sort(function (a, b) { return b.best - a.best; });
  }
  function renderMon(id) {
    selected = -1; monView = id;
    history.replaceState(null, '', '#pokemon-' + id);
    var t = tx(), places = monPlaces(id);
    var chip = function (h) { return '<span class="mp-chip">' + esc(t[h.k]) + (h.p != null ? ' ' + h.p + ' %' : '') + (h.min != null ? ' · ' + t.level + ' ' + (h.min === h.max ? h.min : h.min + '–' + h.max) : '') + '</span>'; };
    $('side-content').innerHTML = '<div class="side-head"><button type="button" class="back-btn" id="hm-back">← ' + esc(t.back) + '</button>' +
      '<h2 class="mon-head"><img src="' + sprite(id) + '" alt="">' + esc(monName(id)) + '</h2>' +
      '<p>' + esc(places.length ? t.monWhere(places.length) : t.monNone) + '</p><a class="mini-btn" href="../PokemonInfo/index.html#' + id + '">' + esc(t.toDex) + '</a></div>' +
      '<div class="mon-places">' + places.map(function (p) {
        var l = D.locations[p.li];
        return '<button type="button" class="mon-place" data-loc="' + p.li + '"><span class="mp-name">' + esc(locName(l)) + '<small>' + esc(typeLabel(l)) + '</small></span><span class="mp-methods">' + p.hits.map(chip).join('') + '</span></button>';
      }).join('') + '</div>';
    $('hm-back').addEventListener('click', renderDirectory);
    $('side-content').querySelectorAll('[data-loc]').forEach(function (b) { b.addEventListener('click', function () { tab = 'wild'; select(+b.dataset.loc); }); });
    drawSelection();
    updateScene();
  }

  /* ── Meer hinter der Karte (sea.js): Schwimmer, Flieger, beste Angel des Ortes ── */
  var seaLi = -1;
  function updateScene() {
    if (!window.SeaScene || !D) return;
    if (selected >= 0) seaLi = selected; else if (monView == null) seaLi = -1;
    var l = seaLi >= 0 ? D.locations[seaLi] : D.locations.filter(function (x) { return x.en === 'Route 124'; })[0];
    if (!l) return;
    var t = tx(), wild = wildOf(l);
    var entries = function (list) { return (list || []).map(function (s) { return { id: s.id, name: monName(s.id), p: s.p, min: s.min, max: s.max }; }); };
    var all = function (k) { return wild.reduce(function (a, w) { return a.concat(entries(w.t[k])); }, []); };
    var has = function (k) { return wild.some(function (w) { return w.t[k] && w.t[k].length; }); };
    var rod = ['super', 'good', 'old'].filter(has)[0];
    window.SeaScene.update({
      key: l.en + '|' + (usingRando() ? 'rando' : version()),
      place: locName(l), picked: seaLi >= 0,
      how: WATER.filter(has).map(function (k) { return t[k]; }),
      surf: all('surf'), land: all('grass').concat(all('tall')),
      rod: rod ? { name: t[rod], areas: wild.filter(function (w) { return w.t[rod]; }).map(function (w, i) { return { area: wild.length > 1 ? t.area(i + 1) : '', list: entries(w.t[rod]) }; }) } : null,
      surfName: t.surf,
      open: function (id) { renderMon(id); }
    });
  }

  /* ── Suche ─────────────────────────────────────────────────────── */
  function search(q) {
    var key = norm(q), box = $('search-results'), t = tx();
    if (key.length < 2) { box.hidden = true; return; }
    var hits = [];
    D.locations.forEach(function (l, li) {
      var k = [norm(l.de), norm(l.en)];
      if (k.some(function (x) { return x.indexOf(key) >= 0; })) hits.push({ type: 'loc', li: li, s: k.some(function (x) { return x.indexOf(key) === 0; }) ? 2.5 : 1.5 });
    });
    for (var id = 1; id <= 721; id++) {
      var k = [norm(N.text.de.species[id]), norm(N.text.en.species[id])];
      if (!k.some(function (x) { return x.indexOf(key) === 0; })) continue;
      hits.push({ type: 'mon', id: id, s: 2, n: monPlaces(id).length });
    }
    hits.sort(function (a, b) { return b.s - a.s; });
    var top = hits.slice(0, 14);
    if (!top.length) { box.innerHTML = '<div class="sr-empty">' + esc(t.noResults) + '</div>'; box.hidden = false; return; }
    box.innerHTML = top.map(function (h, n) {
      if (h.type === 'loc') { var l = D.locations[h.li]; return '<button type="button" class="sr" data-n="' + n + '"><span class="sr-ico">◆</span><span class="sr-main">' + esc(locName(l)) + '</span><small>' + esc(typeLabel(l)) + '</small></button>'; }
      return '<button type="button" class="sr' + (h.n ? '' : ' sr--off') + '" data-n="' + n + '"><img class="sr-ico" src="' + sprite(h.id) + '" alt=""><span class="sr-main">' + esc(monName(h.id)) + '</span><small>' + esc(t.mon + ' · ' + (h.n === 1 ? t.places1 : t.placesN(h.n))) + '</small></button>';
    }).join('');
    box.hidden = false;
    box.querySelectorAll('.sr').forEach(function (b) {
      b.addEventListener('click', function () {
        var h = top[+b.dataset.n];
        box.hidden = true;
        $('map-search').blur();
        if (h.type === 'loc') select(h.li); else renderMon(h.id);
      });
    });
  }

  /* ── Sprache, Kopf, Start ──────────────────────────────────────── */
  function applyLang() {
    var t = tx();
    document.documentElement.lang = lang();
    $('lang-toggle').textContent = lang().toUpperCase();
    document.querySelector('[data-i18n="title"]').textContent = t.title;
    document.querySelector('.game-badge').textContent = t.badge;
    document.querySelector('header [data-i18n="subtitle"]').textContent = t.subtitle;
    document.querySelector('.map-note').textContent = t.note;
    document.title = t.title + ' (' + t.badge + ') – Pokémon Hub';
    $('map-search').placeholder = t.search;
    var v = version();
    $('filter-chips').innerHTML = '<span class="hm-version" role="group">' + ['or', 'as'].map(function (k) {
      return '<button type="button" class="chip" data-version="' + k + '" aria-pressed="' + (v === k) + '">' + esc(t[k]) + '</button>';
    }).join('') + '</span>';
    $('filter-chips').querySelectorAll('[data-version]').forEach(function (b) {
      b.addEventListener('click', function () {
        try { localStorage.setItem('bosse-oras-version', b.dataset.version); } catch (e) { /* egal */ }
        rerender();
      });
    });
  }
  function rerender() {
    applyLang();
    if (!D) return;
    if (selected >= 0) renderLocation(); else if (monView != null) renderMon(monView); else renderDirectory();
    drawSelection();
  }
  function fromHash() {
    var h = decodeURIComponent(location.hash.slice(1));
    if (!h) return false;
    var m = /^pokemon-(\d+)$/.exec(h);
    if (m) { renderMon(+m[1]); return true; }
    var li = D.locations.findIndex(function (l) { return l.slug === h.split('~')[0]; });
    if (li >= 0) { select(li); return true; }
    return false;
  }

  function init() {
    document.body.classList.add('is-hoenn');
    var wrap = document.querySelector('.map-wrap');
    var host = document.createElement('div');
    host.id = 'hoenn-map';
    host.className = 'hoenn-map';
    wrap.insertBefore(host, wrap.firstChild);
    applyLang();
    $('map-loading').textContent = tx().loading;
    Promise.all([
      fetch('oras.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
      window.ORAS_DATA ? Promise.resolve() : script('../SaveViewer/data-oras.js'),
      window.OrasRom ? Promise.resolve() : script('../Bosse/oras-rom.js'),
      fetch('../Bosse/bosses-oras.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; })
    ]).then(function (r) {
      D = r[0]; N = window.ORAS_DATA; B = r[3];
      $('map-loading').hidden = true;
      host.innerHTML = mapSvg();
      host.addEventListener('click', function (e) { var el = e.target.closest('[data-li]'); if (el) { tab = 'wild'; select(+el.dataset.li); } });
      host.addEventListener('mousemove', function (e) {
        var el = e.target.closest('[data-li]'), hn = $('hover-name');
        if (!el) { hn.hidden = true; return; }
        var box = wrap.getBoundingClientRect();
        hn.textContent = locName(D.locations[+el.dataset.li]);
        hn.style.left = (e.clientX - box.left + 12) + 'px';
        hn.style.top = (e.clientY - box.top + 12) + 'px';
        hn.hidden = false;
      });
      host.addEventListener('mouseleave', function () { $('hover-name').hidden = true; });
      if (!fromHash()) renderDirectory();
    }).catch(function () {
      $('map-loading').textContent = tx().loadError;
    });
  }

  $('lang-toggle').addEventListener('click', function () {
    window.LANG = window.LANG === 'de' ? 'en' : 'de';
    try { localStorage.setItem('hub-lang', window.LANG); } catch (e) { /* egal */ }
    rerender();
  });
  var timer = null;
  $('map-search').addEventListener('input', function (e) { clearTimeout(timer); timer = setTimeout(function () { if (D) search(e.target.value); }, 120); });
  $('map-search').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { $('search-results').hidden = true; e.target.blur(); }
    if (e.key === 'Enter') { var b = $('search-results').querySelector('.sr'); if (b) b.click(); }
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search-wrap')) $('search-results').hidden = true; });
  window.addEventListener('hashchange', function () { if (D) fromHash(); });
  document.addEventListener('hubrandochange', function () { mode = 'rando'; if (D) rerender(); });
  // Edition im Boss-Planer (oder anderem Tab) geändert
  window.addEventListener('storage', function (e) { if (e.key === 'bosse-oras-version' && D) rerender(); });
  init();
})();
