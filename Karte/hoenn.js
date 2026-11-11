/*
 * Karte von Hoenn (Omega Rubin / Alpha Saphir) – übernimmt die Karten-Seite, wenn das Hub-Spiel OR/AS ist
 * (sonst läuft wie bisher app.js mit Sinnoh).
 *
 * Die Karte ist – wie bei Platin – die Oberwelt aus den 3D-Modellen und Texturen des Spiels (tiles-oras/, gebaut mit
 * tools/render-oras.js aus der eigenen ROM): Städte und Routen als Flächen zum Antippen, Höhlen & Orte an ihren
 * Eingängen; Item-Bälle, TMs und Trainer als Punkte (Filter oben). Daneben je Ort die wilden Pokémon mit Raten und Leveln (Gras, Langes Gras, Horden, DexNav, Surfen, Zertrümmerer,
 * Angeln), für Omega Rubin oder Alpha Saphir, aus dem Randomizer-Stand oder dem Original, dazu die Bosse des Ortes
 * (Boss-Planer). Suche nach Orten und Pokémon, Direktlinks #<ort> und #pokemon-<nr>, das Meer hinter der Karte (sea.js).
 *
 * Daten: oras.json (tools/build-oras.js), tiles-oras/index.json + places.json (tools/render-oras.js), ../SaveViewer/data-oras.js (Namen), ../Bosse/oras-rom.js (Raten gewürfelter
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
      search: 'Ort oder Pokémon suchen…', note: 'Karte aus den 3D-Modellen und Texturen von Omega Rubin gerendert. Wilde Pokémon aus der ROM von Omega Rubin; Alpha Saphir mit seinen Editions-Pokémon (Unterschiede aus PKHeX).',
      or: 'Omega Rubin', as: 'Alpha Saphir', all: 'Alle Orte', hint: 'Tippe auf die Karte oder wähle einen Ort.', back: 'Alle Orte',
      noSpot: 'Ohne feste Stelle auf der Karte.',
      towns: 'Städte', routes: 'Routen', places: 'Höhlen, Inseln & Orte', mirage: 'Wunder-Orte & Sonstiges',
      town: 'Stadt', city: 'Stadt', route: 'Route', place: 'Ort', tabWild: 'Wilde Pokémon', tabBoss: 'Bosse',
      area: function (n) { return 'Bereich ' + n; }, level: 'Lv.', noWild: 'Hier gibt es keine wilden Pokémon.', noBoss: 'Hier gibt es keine Bosse.',
      grass: 'Gras', tall: 'Langes Gras', horde: 'Horden', dexnav: 'Nur mit DexNav', surf: 'Surfen', smash: 'Zertrümmerer',
      old: 'Angel', good: 'Profiangel', super: 'Superangel', hordeN: function (n) { return n + '×'; },
      rando: 'Gewürfelt', orig: 'Original', randoNote: function (n) { return 'Aus deinem Randomizer-Stand „' + n + '“.'; },
      versionDiff: 'In Alpha Saphir gibt es hier andere Editions-Pokémon.',
      toBoss: 'Im Boss-Planer', cap: 'Level-Cap', mon: 'Pokémon', monWhere: function (n) { return n === 1 ? 'Kommt an 1 Ort wild vor' : 'Kommt an ' + n + ' Orten wild vor'; },
      monNone: 'Kommt in diesem Spiel nicht wild vor.', places1: '1 Ort', placesN: function (n) { return n + ' Orte'; }, noResults: 'Nichts gefunden.',
      toDex: 'Im Pokédex ansehen →', loadError: 'Die Kartendaten konnten nicht geladen werden.', loading: 'Karte wird geladen…',
      tabItems: 'Items', tabTrainers: 'Trainer', fItem: 'Items', fTm: 'TMs', fTrainer: 'Trainer',
      kBall: 'Item-Bälle', kTm: 'TMs & VMs', noItems: 'Hier liegen keine Items.', noTrainers: 'Hier gibt es keine Trainer.',
      inside: 'drinnen', showOnMap: 'Auf der Karte zeigen', double: 'Doppelkampf', ballOne: 'Item-Ball', trainerOne: 'Trainer',
      itemsNote: 'Nur Item-Bälle – versteckte Items und Geschenke stehen bei Omega Rubin / Alpha Saphir nicht in einer Tabelle.'
    },
    en: {
      title: 'Map of Hoenn', badge: 'Omega Ruby / Alpha Sapphire',
      subtitle: 'The wild Pokémon of every place – with rates, hordes, DexNav and fishing – and the bosses there. Tap a place on the map or search.',
      search: 'Search a place or Pokémon…', note: 'Map rendered from the 3D models and textures of Omega Ruby. Wild Pokémon from the Omega Ruby ROM; Alpha Sapphire with its version exclusives (differences from PKHeX).',
      or: 'Omega Ruby', as: 'Alpha Sapphire', all: 'All places', hint: 'Tap the map or choose a place.', back: 'All places',
      noSpot: 'No fixed spot on the map.',
      towns: 'Towns & cities', routes: 'Routes', places: 'Caves, islands & places', mirage: 'Mirage spots & more',
      town: 'Town', city: 'City', route: 'Route', place: 'Place', tabWild: 'Wild Pokémon', tabBoss: 'Bosses',
      area: function (n) { return 'Area ' + n; }, level: 'Lv.', noWild: 'There are no wild Pokémon here.', noBoss: 'There are no bosses here.',
      grass: 'Grass', tall: 'Long grass', horde: 'Hordes', dexnav: 'DexNav only', surf: 'Surfing', smash: 'Rock Smash',
      old: 'Old Rod', good: 'Good Rod', super: 'Super Rod', hordeN: function (n) { return n + '×'; },
      rando: 'Randomized', orig: 'Original', randoNote: function (n) { return 'From your randomizer data “' + n + '”.'; },
      versionDiff: 'Alpha Sapphire has other version exclusives here.',
      toBoss: 'In the Boss Planner', cap: 'Level cap', mon: 'Pokémon', monWhere: function (n) { return n === 1 ? 'Found wild in 1 place' : 'Found wild in ' + n + ' places'; },
      monNone: 'Not found in the wild in this game.', places1: '1 place', placesN: function (n) { return n + ' places'; }, noResults: 'Nothing found.',
      toDex: 'Open in Pokédex →', loadError: 'The map data could not be loaded.', loading: 'Loading map…',
      tabItems: 'Items', tabTrainers: 'Trainers', fItem: 'Items', fTm: 'TMs', fTrainer: 'Trainers',
      kBall: 'Item balls', kTm: 'TMs & HMs', noItems: 'There are no items here.', noTrainers: 'There are no trainers here.',
      inside: 'inside', showOnMap: 'Show on the map', double: 'Double battle', ballOne: 'Item ball', trainerOne: 'Trainer',
      itemsNote: 'Item balls only – Omega Ruby / Alpha Sapphire keep hidden items and gifts in no table.'
    }
  };
  var METHODS = ['grass', 'tall', 'horde', 'dexnav', 'surf', 'smash', 'old', 'good', 'super'];
  var WATER = ['surf', 'old', 'good', 'super'];
  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';

  var D = null, N = null, B = null, selected = -1, monView = null, tab = 'wild', mode = 'rando';
  var version = function () { try { return localStorage.getItem('bosse-oras-version') === 'as' ? 'as' : 'or'; } catch (e) { return 'or'; } };
  var $ = function (id) { return document.getElementById(id); };
  var lang = function () { return window.LANG === 'en' ? 'en' : 'de'; };
  var tx = function () { return TEXT[lang()]; };
  // Orte, die es nur in einer Edition gibt: Team Aquas Versteck (Alpha Saphir) und Team Magmas Versteck (Omega Rubin)
  // liegen am selben Eingang in Seegrasulb City
  var ONLY = { 292: 'as', 314: 'or' };
  var locOk = function (l) { return !ONLY[l.id] || ONLY[l.id] === version(); };
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

  /* ── Karte ─────────────────────────────────────────────────────── */
  // Spielkacheln wie bei Platin: x nach rechts, z nach unten; Leaflet (CRS.Simple) bekommt [−z, x]. Die Schrägsicht
  // hebt eine Stelle um shear · Höhe nach oben – Flächen und Eingänge tragen diesen Versatz (lift) schon mit.
  var TILES = null, P = null, map = null, selLayer = null, labelLayer = null, NATIVE = 4, spots = [];
  var BASE = 'tiles-oras/';
  var ll = function (x, z) { return L.latLng(-z, x); };
  var areasOf = function (li) { return (P && P.areas[D.locations[li].id]) || []; };
  // Items: [Item, Anzahl, Attacke (TM/VM), x, z, Versatz] – x = null: drinnen. Trainer: [Nummer, x, z, Versatz]
  var itemsOf = function (li) { return (P && P.items && P.items[D.locations[li].id]) || []; };
  var trainersOf = function (li) { return ((P && P.trainers && P.trainers[D.locations[li].id]) || []).filter(function (r) { return B && B.trainers[r[0]]; }); };
  var ITEM_SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';
  var TYPES = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark', 'fairy'];
  var itemBase = function (r) { return (N && N.text[lang()].items[r[0]]) || '#' + r[0]; };
  var itemName = function (r) { return r[2] ? itemBase(r) + ' ' + ((N && N.text[lang()].moves[r[2]]) || '') : itemBase(r); };
  var itemIcon = function (r) {
    if (r[2]) { var mi = N.moveInfo[r[2]], hm = /^HM/.test(N.text.en.items[r[0]] || ''); return ITEM_SPR + (hm ? 'hm-' : 'tm-') + TYPES[mi ? mi[0] : 0] + '.png'; }
    return N.itemSprites[r[0]] ? ITEM_SPR + N.itemSprites[r[0]] + '.png' : '';
  };
  var trainerTitle = function (id) { var t = B.trainers[id], en = lang() === 'en'; return (en ? t.ce : t.cd) + ' ' + (en ? t.ne : t.nd); };
  var levels = function (id) { var lv = B.trainers[id].p.map(function (p) { return p[2]; }), a = Math.min.apply(null, lv), b = Math.max.apply(null, lv); return a === b ? '' + a : a + '–' + b; };
  var STYLE = {
    item: { radius: 5, color: '#ffffff', weight: 1.5, fillColor: '#ff5a5a', fillOpacity: 1 },
    tm: { radius: 5.5, color: '#0d0f2b', weight: 1.5, fillColor: '#57d2ff', fillOpacity: 1 },
    trainer: { radius: 4.5, color: '#0d0f2b', weight: 1.5, fillColor: '#ffaa3c', fillOpacity: 1 }
  };
  var KINDS = ['item', 'tm', 'trainer'], layers = {}, shown = {}, focusRing = null;
  var entrancesOf = function (li) { return (P && P.entrances[D.locations[li].id]) || []; };

  // Blätter je Detailstufe (tiles-oras/<z>/<x>_<y>.webp); die gröbste immer. Ein Blatt (2048 px) zu dekodieren dauert
  // spürbar (40–70 ms) – das passiert vorab im Hintergrund (img.decode), erst danach kommt es auf die Karte; bis dahin
  // bleibt die gröbere Stufe darunter zu sehen. Geladen wird schon beim Schieben, mit Vorlauf um den Ausschnitt;
  // geladene Blätter bleiben (bis KEEP), damit Zurückschieben nichts neu dekodiert.
  function setupSheets() {
    var W = P.width, H = P.height, KEEP = window.PokeHubLite ? 6 : 24, used = [];
    var levels = TILES.levels.slice().sort(function (a, b) { return a.z - b.z; }).map(function (lv, i) {
      var pane = map.createPane('sheets' + lv.z);
      pane.style.zIndex = 210 + i;
      pane.style.pointerEvents = 'none';
      var span = lv.size / Math.pow(2, lv.z), px = 1 / Math.pow(2, lv.z);
      return { z: lv.z, pane: 'sheets' + lv.z, sheets: lv.sheets.map(function (key) {
        var s = key.split('_').map(Number), x0 = s[0] * span, z0 = s[1] * span;
        return { url: BASE + lv.z + '/' + key + '.webp', bounds: L.latLngBounds(ll(x0, Math.min(H, z0 + span) + px), ll(Math.min(W, x0 + span) + px, z0)), pane: 'sheets' + lv.z, img: null, ready: false, layer: null, want: false };
      }) };
    });
    // Beim Zoomen werden neue Blätter schon geladen und dekodiert, aber erst am Ende eingehängt – ein neues Blatt
    // mitten im Gleiten müsste der Browser sofort malen (das ruckelt); danach ist es ohne Wartezeit scharf
    var zooming = false;
    map.on('zoomstart', function () { zooming = true; });
    map.on('zoomend', function () { zooming = false; });
    var attach = function (s) { if (!s.layer && s.ready && s.want && !zooming) s.layer = L.imageOverlay(s.img, s.bounds, { pane: s.pane, className: 'game-sheet', interactive: false }).addTo(map); };
    var detach = function (s) { if (s.layer) { map.removeLayer(s.layer); s.layer = null; } };
    var load = function (s) {
      var i = used.indexOf(s);
      if (i >= 0) used.splice(i, 1);
      used.push(s);
      if (s.img) return attach(s);
      var img = s.img = new Image();
      img.decoding = 'async';
      img.src = s.url;
      (img.decode ? img.decode() : Promise.resolve()).catch(function () { /* zeigt es dann eben ohne */ }).then(function () {
        if (s.img !== img) return;
        s.ready = true;
        attach(s);
      });
      // zu viele im Speicher: die am längsten nicht gebrauchten loslassen
      for (var k = 0; used.length > KEEP && k < used.length; ) {
        var o = used[k];
        if (o.want) { k++; continue; }
        detach(o); o.img = null; o.ready = false; used.splice(k, 1);
      }
    };
    var update = function () {
      var zoom = map.getZoom(), view = map.getBounds().pad(0.6);
      levels.forEach(function (lv, i) {
        var on = i === 0 || zoom >= lv.z - 1.25;
        lv.sheets.forEach(function (s) {
          s.want = on && (i === 0 || view.intersects(s.bounds));
          if (s.want) load(s); else detach(s);
        });
      });
    };
    map.on('zoomend moveend', update);
    map.on('move', L.Util.throttle(update, 120));
    update();
  }
  // Offenes Meer zwischen den Gebieten: Wassermuster aus dem Spiel (tiles-oras/sea.png), an der Welt ausgerichtet
  var SeaLayer = L.GridLayer.extend({
    createTile: function (coords) {
      var el = document.createElement('div');
      el.className = 'sea-tile';
      var size = this.options.pattern * Math.pow(2, coords.z - this.options.nativeZoom), ts = this.getTileSize();
      if (size >= 2) {
        el.style.backgroundSize = size + 'px ' + size + 'px';
        // Muster an der Welt ausrichten (48 px passt nicht glatt in 256er Kacheln)
        var off = function (v) { return -(((v % size) + size) % size) + 'px'; };
        el.style.backgroundPosition = off(coords.x * ts.x) + ' ' + off(coords.y * ts.y);
      } else el.style.backgroundImage = 'none';
      return el;
    }
  });
  // Ort an einer Bildstelle: Flächen (mit ihrem Versatz) oder ein Eingang in der Nähe
  function locAt(latlng) {
    var x = latlng.lng, z = -latlng.lat, best = -1;
    D.locations.forEach(function (l, li) {
      if (best >= 0) return;
      if (areasOf(li).some(function (r) { return x >= r[0] && x < r[2] && z >= r[1] - r[4] && z < r[3] - r[4]; })) best = li;
    });
    return best;
  }
  // Eingänge: nur die der gewählten Edition (Team-Verstecke)
  function syncSpots() {
    if (!map) return;
    spots.forEach(function (m) {
      var on = !m.only || m.only === version();
      if (on && !map.hasLayer(m)) m.addTo(map); else if (!on && map.hasLayer(m)) map.removeLayer(m);
    });
  }
  function onZoom() {
    var z = map.getZoom(), el = map.getContainer();
    el.classList.toggle('z-vfar', z < -1.25);
    el.classList.toggle('z-far', z < 0);
    el.classList.toggle('z-mid', z >= 0 && z < 1.5);
    el.classList.toggle('z-near', z >= 1.5);
    el.classList.toggle('z-pixel', z >= NATIVE + 0.75);
    var r = z < -1.25 ? 3.5 : z < 0.5 ? 5 : z < 2.5 ? 6.5 : 8;
    spots.forEach(function (m) { m.setRadius(r); });
    var f = z >= 4.5 ? 2.1 : z >= 2.5 ? 1.6 : z >= 1.5 ? 1.3 : z >= 0.5 ? 1 : 0.75;
    KINDS.forEach(function (k) { if (layers[k]) layers[k].eachLayer(function (m) { m.setRadius(STYLE[k].radius * f); }); });
  }
  function setupMap() {
    map = L.map('map', {
      crs: L.CRS.Simple, minZoom: -2.5, maxZoom: NATIVE + 2, zoomSnap: 0.25, zoomDelta: 0.5,
      scrollWheelZoom: false, smoothWheelZoom: true,   // stufenlos (smooth-wheel.js)
      attributionControl: false, preferCanvas: false, zoomControl: true
    });
    if (TILES.sea) new SeaLayer({ pattern: TILES.sea, nativeZoom: NATIVE, minZoom: -3, maxZoom: NATIVE + 2 }).addTo(map);
    var pts = [];
    D.locations.forEach(function (l, li) { areasOf(li).forEach(function (r) { pts.push(ll(r[0], r[1] - r[4]), ll(r[2], r[3] - r[4])); }); });
    var land = L.latLngBounds(pts);
    map.fitBounds(land, { padding: [10, 10] });
    // Ohne Direktlink beginnt die Karte in Wurzelheim (mit etwas Umgebung) – nicht in ganz Hoenn
    var start = D.locations.findIndex(function (l) { return l.slug === 'littleroot-town'; }), sp = [];
    if (start >= 0) areasOf(start).forEach(function (r) { sp.push(ll(r[0], r[1] - r[4]), ll(r[2], r[3] - r[4])); });
    if (sp.length) map.fitBounds(L.latLngBounds(sp).pad(1.5), { maxZoom: 3, animate: false });
    map.setMaxBounds(land.pad(0.3));
    setupSheets();
    // Namen der Städte und Routen
    labelLayer = L.layerGroup().addTo(map);
    var labelPane = L.labelPane(map);
    D.locations.forEach(function (l, li) {
      var at = P.labels[l.id];
      if (!at) return;
      var m = L.marker(ll(at[0], at[1] - at[2]), {
        icon: L.divIcon({ className: 'loc-label loc-label--' + l.type, html: '<span>' + esc(locName(l)) + '</span>', iconSize: null }),
        interactive: false, keyboard: false, pane: labelPane
      });
      m.locIndex = li;
      labelLayer.addLayer(m);
    });
    // Höhlen & Orte: an ihren Eingängen
    var renderer = L.svg({ padding: 0.3 });
    D.locations.forEach(function (l, li) {
      if (areasOf(li).length) return;
      entrancesOf(li).forEach(function (e) {
        var only = ONLY[l.id];
        spots.push(L.circleMarker(ll(e[0], e[1] - e[2]), { renderer: renderer, radius: 6, color: '#3b2a00', weight: 1.5, fillColor: l.wild.length ? '#ffd23f' : '#e9e2c8', fillOpacity: 1, bubblingMouseEvents: false })
          .bindTooltip(function () { return esc(locName(l)); }, { direction: 'top', offset: [0, -6], className: 'map-tip' })
          .on('click', function () { tab = 'wild'; select(li, { fromMap: true }); }));
        spots[spots.length - 1].only = only;
      });
    });
    syncSpots();
    // Items, TMs, Trainer: erst sichtbar, wenn ihr Filter an ist
    KINDS.forEach(function (k) { layers[k] = L.layerGroup(); });
    D.locations.forEach(function (l, li) {
      itemsOf(li).forEach(function (r, i) {
        if (r[3] == null) return;
        var k = r[2] ? 'tm' : 'item';
        L.circleMarker(ll(r[3], r[4] - r[5]), Object.assign({ renderer: renderer, bubblingMouseEvents: false }, STYLE[k]))
          .bindTooltip(function () { return esc((r[2] ? '' : tx().ballOne + ': ') + itemName(r) + (r[1] > 1 ? ' ×' + r[1] : '')); }, { direction: 'top', offset: [0, -6], className: 'map-tip' })
          .on('click', function () { tab = 'items'; select(li, { fromMap: true, focus: 'i' + i }); })
          .addTo(layers[k]);
      });
      trainersOf(li).forEach(function (r, i) {
        if (r[1] == null) return;
        L.circleMarker(ll(r[1], r[2] - r[3]), Object.assign({ renderer: renderer, bubblingMouseEvents: false }, STYLE.trainer))
          .bindTooltip(function () { return esc(trainerTitle(r[0]) + ' · ' + tx().level + ' ' + levels(r[0])); }, { direction: 'top', offset: [0, -6], className: 'map-tip' })
          .on('click', function () { tab = 'trainers'; select(li, { fromMap: true, focus: 't' + i }); })
          .addTo(layers.trainer);
      });
    });
    syncKinds();
    selLayer = L.layerGroup().addTo(map);
    map.on('zoomend', onZoom);
    onZoom();
    var hn = $('hover-name');
    map.on('mousemove', function (e) {
      if (matchMedia('(pointer: coarse)').matches) return;
      var li = locAt(e.latlng);
      if (li < 0) { hn.hidden = true; map.getContainer().style.cursor = ''; return; }
      hn.textContent = locName(D.locations[li]);
      hn.hidden = false;
      map.getContainer().style.cursor = 'pointer';
    });
    map.on('mouseout', function () { hn.hidden = true; });
    map.on('click', function (e) { var li = locAt(e.latlng); if (li >= 0) { tab = 'wild'; select(li, { fromMap: true }); } });
  }
  // Umriss eines Ortes: 10 × 10-Zellen seiner Flächen, Kanten ohne Nachbarn des Ortes
  function drawArea(li) {
    var cells = {}, segs = [];
    areasOf(li).forEach(function (r) {
      for (var x = r[0]; x < r[2]; x += 10) for (var z = r[1]; z < r[3]; z += 10) cells[x + ':' + z] = r[4];
      selLayer.addLayer(L.rectangle(L.latLngBounds(ll(r[0], r[3] - r[4]), ll(r[2], r[1] - r[4])), { stroke: false, fillColor: '#57d2ff', fillOpacity: 0.14, interactive: false }));
    });
    Object.keys(cells).forEach(function (k) {
      var c = k.split(':').map(Number), x = c[0], z = c[1], up = cells[k];
      var has = function (dx, dz) { return (x + dx) + ':' + (z + dz) in cells; };
      if (!has(0, -10)) segs.push([ll(x, z - up), ll(x + 10, z - up)]);
      if (!has(0, 10)) segs.push([ll(x, z + 10 - up), ll(x + 10, z + 10 - up)]);
      if (!has(-10, 0)) segs.push([ll(x, z - up), ll(x, z + 10 - up)]);
      if (!has(10, 0)) segs.push([ll(x + 10, z - up), ll(x + 10, z + 10 - up)]);
    });
    if (segs.length) selLayer.addLayer(L.polyline(segs, { color: '#57d2ff', weight: 2, opacity: 0.95, interactive: false }));
    entrancesOf(li).forEach(function (e) {
      selLayer.addLayer(L.circleMarker(ll(e[0], e[1] - e[2]), { radius: 12, color: '#57d2ff', weight: 2.5, fill: false, interactive: false }));
    });
  }
  function drawSelection() {
    if (!selLayer) return;
    selLayer.clearLayers();
    var sel = selected >= 0 ? [selected] : monView != null ? monPlaces(monView).map(function (p) { return p.li; }) : [];
    sel.forEach(drawArea);
    labelLayer.eachLayer(function (m) { var el = m.getElement(); if (el) el.classList.toggle('is-selected', sel.indexOf(m.locIndex) >= 0); });
  }
  function syncKinds() { KINDS.forEach(function (k) { if (!layers[k]) return; if (shown[k]) layers[k].addTo(map); else map.removeLayer(layers[k]); }); }
  function pulseAt(x, z) {
    if (focusRing) map.removeLayer(focusRing);
    var ref = focusRing = L.marker(ll(x, z), { icon: L.divIcon({ className: 'focus-ring', html: '<span></span>', iconSize: [36, 36] }), interactive: false, keyboard: false }).addTo(map);
    setTimeout(function () { if (focusRing === ref) { map.removeLayer(ref); focusRing = null; } }, 2600);
  }
  var hasSpot = function (li) { return areasOf(li).length > 0 || entrancesOf(li).length > 0; };
  function flyToPoint(x, z) { if (!map) return; map.flyTo(ll(x, z), Math.max(map.getZoom(), 3), { duration: 0.6 }); pulseAt(x, z); }
  // Zum Ort fliegen (Fläche bzw. Eingänge)
  function flyTo(li) {
    if (!map) return;
    var pts = [];
    areasOf(li).forEach(function (r) { pts.push(ll(r[0], r[1] - r[4]), ll(r[2], r[3] - r[4])); });
    entrancesOf(li).forEach(function (e) { pts.push(ll(e[0] - 12, e[1] - e[2] - 12), ll(e[0] + 12, e[1] - e[2] + 12)); });
    if (!pts.length) return;
    var b = L.latLngBounds(pts);
    if (map.getBounds().contains(b) && map.getZoom() >= 0.5) return;
    map.flyToBounds(b, { padding: [40, 40], maxZoom: 3, duration: 0.6 });
  }

  /* ── Seitenleiste ──────────────────────────────────────────────── */
  function typeLabel(l) { return tx()[l.type] || tx().place; }
  function renderDirectory() {
    selected = -1; monView = null;
    history.replaceState(null, '', location.pathname + location.search);
    var t = tx(), g = { towns: [], routes: [], places: [], mirage: [] };
    D.locations.forEach(function (l, li) {
      if (!locOk(l)) return;
      if (l.type === 'route') g.routes.push(li);
      else if (l.type === 'town' || l.type === 'city') g.towns.push(li);
      // Orte: alles mit Stelle auf der Karte oder Inhalt (Items, Trainer, Bosse) – nicht nur, was wilde Pokémon hat
      else if (l.at || hasSpot(li) || itemsOf(li).length || trainersOf(li).length || bossesAt(l).length) g.places.push(li);
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

  function select(li, opts) {
    selected = li; monView = null;
    var l = D.locations[li];
    history.replaceState(null, '', '#' + l.slug);
    renderLocation(opts && opts.focus);
    drawSelection();
    if (!(opts && opts.fromMap)) flyTo(li);
    // Handy: Die Details stehen unter der Karte – nach einer Wahl über Suche oder Verzeichnis dorthin rollen
    if (!(opts && (opts.fromMap || opts.quiet)) && matchMedia('(max-width: 900px)').matches) {
      $('side').scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    }
  }
  var posBtn = function (x, z, lift) {
    if (x == null) return '<span class="area">' + esc(tx().inside) + '</span>';
    return '<button type="button" class="pin" data-pos="' + x + ',' + (z - lift) + '" title="' + esc(tx().showOnMap) + '" aria-label="' + esc(tx().showOnMap) + '">' + PIN + '</button>';
  };
  var PIN = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';
  var SWORDS = '<svg class="ico" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 26 20 12m0 0 3-6 3-1-1 3-6 3M26 26 12 12m0 0-3-6-3-1 1 3 6 3M9 23l-2 2m16-2 2 2"/></svg>';
  function itemsHtml(li) {
    var t = tx(), list = itemsOf(li).map(function (r, i) { return { r: r, i: i }; });
    if (!list.length) return '<p class="empty">' + esc(t.noItems) + '</p>';
    var group = function (title, rows) {
      if (!rows.length) return '';
      rows.sort(function (a, b) { return (a.r[3] == null) - (b.r[3] == null) || itemBase(a.r).localeCompare(itemBase(b.r), lang()); });
      return '<div class="list-group"><h3>' + esc(title) + ' <small>' + rows.length + '</small></h3>' + rows.map(function (x) {
        var r = x.r, move = r[2] && N.text[lang()].moves[r[2]];
        return '<div class="row' + (r[2] ? ' is-tm' : '') + '" data-ref="i' + x.i + '"><img class="item-ico" src="' + itemIcon(r) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
          '<div class="row-main"><span class="row-title">' + esc(itemBase(r)) + (r[1] > 1 ? ' <small>×' + r[1] + '</small>' : '') + '</span>' + (move ? '<span class="row-sub">' + esc(move) + '</span>' : '') + '</div>' +
          posBtn(r[3], r[4], r[5]) + '</div>';
      }).join('') + '</div>';
    };
    return group(t.kBall, list.filter(function (x) { return !x.r[2]; })) + group(t.kTm, list.filter(function (x) { return x.r[2]; })) + '<p class="hint">' + esc(t.itemsNote) + '</p>';
  }
  function trainersHtml(li) {
    var t = tx(), en = lang() === 'en', list = trainersOf(li).map(function (r, i) { return { r: r, i: i }; });
    if (!list.length) return '<p class="empty">' + esc(t.noTrainers) + '</p>';
    list.sort(function (a, b) { return (a.r[1] == null) - (b.r[1] == null) || Math.max.apply(null, B.trainers[a.r[0]].p.map(function (p) { return p[2]; })) - Math.max.apply(null, B.trainers[b.r[0]].p.map(function (p) { return p[2]; })); });
    return '<div class="list-group">' + list.map(function (x) {
      var r = x.r, tr = B.trainers[r[0]];
      return '<div class="row row--trainer" data-ref="t' + x.i + '"><div class="tr-head"><span class="row-title">' + esc(trainerTitle(r[0])) + '</span>' +
        (tr.d ? '<span class="badge">' + esc(t.double) + '</span>' : '') + posBtn(r[1], r[2], r[3]) +
        '<a class="pin" href="../Bosse/index.html#t=' + r[0] + '" title="' + esc(t.toBoss) + '" aria-label="' + esc(t.toBoss) + '">' + SWORDS + '</a></div>' +
        '<div class="party">' + tr.p.map(function (p) {
          return '<span class="mon" title="' + esc(monName(p[0])) + '"><img src="' + sprite(p[0]) + '" alt="" loading="lazy"><span class="mon-name">' + esc(monName(p[0])) + '</span><small>' + t.level + ' ' + p[2] + '</small></span>';
        }).join('') + '</div></div>';
    }).join('') + '</div>';
  }
  function renderLocation(focus) {
    var t = tx(), l = D.locations[selected], bosses = bossesAt(l), its = itemsOf(selected), trs = trainersOf(selected);
    var has = { wild: true, items: its.length > 0, trainers: trs.length > 0, boss: bosses.length > 0 };
    if (!has[tab]) tab = 'wild';
    var sub = [l.en !== l.de ? (lang() === 'en' ? l.de : l.en) : null, typeLabel(l)].filter(Boolean).join(' · ');
    var tabBtn = function (k, label, n, off) { return '<button type="button" class="tab' + (tab === k ? ' is-active' : '') + '" data-tab="' + k + '"' + (off ? ' disabled' : '') + '>' + esc(label) + (n != null ? ' <small>' + n + '</small>' : '') + '</button>'; };
    $('side-content').innerHTML = '<div class="side-head"><div class="back-row"><button type="button" class="back-btn" id="hm-back">← ' + esc(t.back) + '</button></div>' +
      '<h2>' + esc(locName(l)) + '</h2><p class="loc-sub">' + esc(sub) + '</p>' +
      (P && !hasSpot(selected) ? '<p class="loc-sub loc-nospot">' + esc(t.noSpot) + '</p>' : '') + '</div>' +
      '<div class="tabs">' + tabBtn('wild', t.tabWild, null, false) + tabBtn('items', t.tabItems, its.length, !its.length) + tabBtn('trainers', t.tabTrainers, trs.length, !trs.length) +
      tabBtn('boss', t.tabBoss, bosses.length, !bosses.length) + '</div>' +
      '<div class="tab-body">' + (tab === 'boss' ? bossHtml(l) : tab === 'items' ? itemsHtml(selected) : tab === 'trainers' ? trainersHtml(selected) : wildHtml(l)) + '</div>';
    $('hm-back').addEventListener('click', renderDirectory);
    $('side-content').querySelectorAll('[data-tab]').forEach(function (b) { b.addEventListener('click', function () { tab = b.dataset.tab; renderLocation(); }); });
    $('side-content').querySelectorAll('[data-mode]').forEach(function (b) { b.addEventListener('click', function () { mode = b.dataset.mode; renderLocation(); }); });
    $('side-content').querySelectorAll('[data-mon]').forEach(function (r) { r.addEventListener('click', function () { renderMon(+r.dataset.mon); }); });
    $('side-content').querySelectorAll('[data-pos]').forEach(function (b) {
      b.addEventListener('click', function () { var p = b.dataset.pos.split(',').map(Number); flyToPoint(p[0], p[1]); });
    });
    if (focus) {
      var row = $('side-content').querySelector('[data-ref="' + focus + '"]');
      if (row) {
        row.classList.add('is-flash');
        row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
        var pin = row.querySelector('[data-pos]');
        if (pin) { var q = pin.dataset.pos.split(',').map(Number); pulseAt(q[0], q[1]); }
      }
    }
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
      if (locOk(l) && k.some(function (x) { return x.indexOf(key) >= 0; })) hits.push({ type: 'loc', li: li, s: k.some(function (x) { return x.indexOf(key) === 0; }) ? 2.5 : 1.5 });
    });
    for (var id = 1; id <= 721; id++) {
      var k = [norm(N.text.de.species[id]), norm(N.text.en.species[id])];
      if (!k.some(function (x) { return x.indexOf(key) === 0; })) continue;
      hits.push({ type: 'mon', id: id, s: 2, n: monPlaces(id).length });
    }
    // Items und TMs (Name, Attacke) sowie Trainer (Klasse + Name) mit ihrem Ort
    D.locations.forEach(function (l, li) {
      itemsOf(li).forEach(function (r, i) {
        var k = [norm(itemBase(r)), r[2] ? norm(N.text[lang()].moves[r[2]]) : ''];
        if (k.some(function (x) { return x && x.indexOf(key) === 0; })) hits.push({ type: 'item', li: li, i: i, r: r, s: 1.2 });
      });
      trainersOf(li).forEach(function (r, i) {
        var tr = B.trainers[r[0]], k = [norm(tr.nd), norm(tr.ne), norm(trainerTitle(r[0]))];
        if (k.some(function (x) { return x.indexOf(key) === 0; })) hits.push({ type: 'trainer', li: li, i: i, r: r, s: 1.1 });
      });
    });
    hits.sort(function (a, b) { return b.s - a.s; });
    var top = hits.slice(0, 14);
    if (!top.length) { box.innerHTML = '<div class="sr-empty">' + esc(t.noResults) + '</div>'; box.hidden = false; return; }
    box.innerHTML = top.map(function (h, n) {
      if (h.type === 'loc') { var l = D.locations[h.li]; return '<button type="button" class="sr" data-n="' + n + '"><span class="sr-ico">◆</span><span class="sr-main">' + esc(locName(l)) + '</span><small>' + esc(typeLabel(l)) + '</small></button>'; }
      if (h.type === 'item') return '<button type="button" class="sr" data-n="' + n + '"><img class="sr-ico" src="' + itemIcon(h.r) + '" alt="" onerror="this.style.visibility=\'hidden\'"><span class="sr-main">' + esc(itemName(h.r)) + '</span><small>' + esc(locName(D.locations[h.li])) + '</small></button>';
      if (h.type === 'trainer') return '<button type="button" class="sr" data-n="' + n + '"><span class="sr-ico">' + SWORDS + '</span><span class="sr-main">' + esc(trainerTitle(h.r[0])) + '</span><small>' + esc(locName(D.locations[h.li])) + '</small></button>';
      return '<button type="button" class="sr' + (h.n ? '' : ' sr--off') + '" data-n="' + n + '"><img class="sr-ico" src="' + sprite(h.id) + '" alt=""><span class="sr-main">' + esc(monName(h.id)) + '</span><small>' + esc(t.mon + ' · ' + (h.n === 1 ? t.places1 : t.placesN(h.n))) + '</small></button>';
    }).join('');
    box.hidden = false;
    box.querySelectorAll('.sr').forEach(function (b) {
      b.addEventListener('click', function () {
        var h = top[+b.dataset.n];
        box.hidden = true;
        $('map-search').blur();
        if (h.type === 'loc') select(h.li);
        else if (h.type === 'item') { tab = 'items'; select(h.li, { focus: 'i' + h.i }); }
        else if (h.type === 'trainer') { tab = 'trainers'; select(h.li, { focus: 't' + h.i }); }
        else renderMon(h.id);
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
    // Ortsnamen auf der Karte in der gewählten Sprache
    if (labelLayer && D) labelLayer.eachLayer(function (m) {
      var el = m.getElement && m.getElement(), span = el && el.querySelector('span');
      if (span && D.locations[m.locIndex]) span.textContent = locName(D.locations[m.locIndex]);
    });
    syncSpots();
    var v = version();
    var count = function (k) { var n = 0; if (P) D.locations.forEach(function (l, li) { if (k === 'trainer') n += trainersOf(li).filter(function (r) { return r[1] != null; }).length; else n += itemsOf(li).filter(function (r) { return r[3] != null && !!r[2] === (k === 'tm'); }).length; }); return n; };
    $('filter-chips').innerHTML = '<span class="hm-version" role="group">' + ['or', 'as'].map(function (k) {
      return '<button type="button" class="chip" data-version="' + k + '" aria-pressed="' + (v === k) + '">' + esc(t[k]) + '</button>';
    }).join('') + '</span>' + (P ? KINDS.map(function (k) {
      return '<button type="button" class="chip' + (shown[k] ? ' is-on' : '') + '" aria-pressed="' + !!shown[k] + '" data-kind="' + k + '"><i class="dot dot--' + k + '"></i><span>' + esc(t[{ item: 'fItem', tm: 'fTm', trainer: 'fTrainer' }[k]]) + '</span> <b>' + count(k) + '</b></button>';
    }).join('') : '');
    $('filter-chips').querySelectorAll('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function () {
        var k = b.dataset.kind; shown[k] = !shown[k];
        b.classList.toggle('is-on', shown[k]); b.setAttribute('aria-pressed', String(shown[k]));
        syncKinds();
      });
    });
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
    if (li >= 0) { select(li, { quiet: true }); return true; }
    return false;
  }

  function init() {
    document.body.classList.add('is-hoenn');
    applyLang();
    $('map-loading').textContent = tx().loading;
    Promise.all([
      fetch('oras.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
      window.ORAS_DATA ? Promise.resolve() : script('../SaveViewer/data-oras.js'),
      window.OrasRom ? Promise.resolve() : script('../Bosse/oras-rom.js'),
      fetch('../Bosse/bosses-oras.json').then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }),
      fetch(BASE + 'index.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(BASE + 'places.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    ]).then(function (r) {
      D = r[0]; N = window.ORAS_DATA; B = r[3]; TILES = r[4]; P = r[5];
      NATIVE = Math.max.apply(null, TILES.levels.map(function (lv) { return lv.z; }));
      $('map-loading').hidden = true;
      setupMap();
      applyLang();   // Filter mit Zahlen, jetzt wo die Orte da sind
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
