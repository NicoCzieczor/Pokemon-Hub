/*
 * Startseite am PC (index.html): Weiterleitung aufs Handy-Layout, hohes Gras und wilde Pokémon in der Bühne,
 * wechselnde Symbole (Ball, Typ), DE/EN.
 * Wird im <head> geladen, damit die Weiterleitung passiert, bevor etwas gezeichnet wird.
 * „Daten sichern/laden“ und der Theme-Knopf kommen aus pwa.js.
 */
(function () {
  'use strict';

  // Handys & Tablets (Hauptbedienung per Finger) → mobile Startseite.
  // Laptops mit Touchscreen haben Maus/Touchpad als Hauptbedienung und bleiben hier.
  var touch = navigator.maxTouchPoints > 0;
  var finger = window.matchMedia && window.matchMedia('(pointer: coarse)').matches;
  if (touch && (finger || window.innerWidth <= 768)) {
    window.location.replace('mobile.html');
    return;
  }

  var TR = {
    de: {
      'hero-desc': 'Dein zentraler Anlaufpunkt für Pokémon-Tools &amp; Hilfsmittel.',
      'ai-notice': 'Erstellt mit KI-Unterstützung',
      'footer': 'Pokémon und alle zugehörigen Namen sind Marken von Nintendo / Game Freak.',
      'backup-export': 'Daten sichern',
      'backup-import': 'Daten laden',
      'group-run': 'Dein Run',
      'group-team': 'Team &amp; Kämpfe',
      'group-calc': 'Rechner',
      'group-ref': 'Nachschlagen',
      'rundashboard-name': 'Run-Dashboard',
      'rundashboard-desc': 'Level-Caps, Begegnungen, Friedhof und Notizen deines Runs.',
      'saveviewer-name': 'Save-Viewer',
      'saveviewer-desc': 'Team, Boxen, Fangorte und Pokédex aus deinem Spielstand.',
      'editor-name': 'Save-Editor',
      'editor-desc': 'Sonderbonbons, Attacken, Items und Geld im Spielstand ändern.',
      'rando-name': 'Randomizer',
      'rando-desc': 'Ein neues zufälliges Platin würfeln – direkt im Browser.',
      'teambuilder-name': 'Team Builder',
      'teambuilder-desc': 'Team zusammenstellen, Typ-Abdeckung und Schwächen prüfen.',
      'duo-name': 'Duo Nuzlocke',
      'duo-desc': 'Zwei Spieler – die Teams gleichen sich in Echtzeit ab.',
      'trio-name': 'Trio Nuzlocke',
      'trio-desc': 'Drei Spieler mit gemeinsamer Box und Typ-Analyse.',
      'bosses-name': 'Boss-Planer',
      'bosses-desc': 'Jeder Bosskampf mit Gegner-Team – und wie dein Team abschneidet.',
      'catchrate-name': 'Fangrate',
      'catchrate-desc': 'Fangchance für jeden Ball je nach Pokémon und Lage.',
      'damage-name': 'Schaden',
      'damage-desc': 'Schaden, KO-Chancen und Volltreffer berechnen.',
      'typcalc-name': 'Typen',
      'typcalc-desc': 'Typ-Effektivität für jede Kombination.',
      'pokedex-name': 'Pokédex',
      'pokedex-desc': 'Werte, Attacken, Fundorte und Entwicklungen.',
      'map-name': 'Karte',
      'map-desc': 'Sinnoh mit Items, Trainern und wilden Pokémon.',
      'rules-name': 'Regelwerk',
      'rules-desc': 'Nuzlocke-Regeln, Klauseln und eigene Varianten.'
    },
    en: {
      'hero-desc': 'Your central hub for Pokémon tools &amp; utilities.',
      'ai-notice': 'Built with AI assistance',
      'footer': 'Pokémon and all related names are trademarks of Nintendo / Game Freak.',
      'backup-export': 'Back up data',
      'backup-import': 'Restore data',
      'group-run': 'Your run',
      'group-team': 'Team &amp; battles',
      'group-calc': 'Calculators',
      'group-ref': 'Reference',
      'rundashboard-name': 'Run Dashboard',
      'rundashboard-desc': 'Level caps, encounters, graveyard and notes for your run.',
      'saveviewer-name': 'Save Viewer',
      'saveviewer-desc': 'Team, boxes, catch spots and Pokédex from your save file.',
      'editor-name': 'Save Editor',
      'editor-desc': 'Change Rare Candies, moves, items and money in your save.',
      'rando-name': 'Randomizer',
      'rando-desc': 'Roll a new random Platinum – right in the browser.',
      'teambuilder-name': 'Team Builder',
      'teambuilder-desc': 'Build your team, check type coverage and weaknesses.',
      'duo-name': 'Duo Nuzlocke',
      'duo-desc': 'Two players – the teams sync in real time.',
      'trio-name': 'Trio Nuzlocke',
      'trio-desc': 'Three players with a shared box and type analysis.',
      'bosses-name': 'Boss Planner',
      'bosses-desc': 'Every boss fight with the enemy team – and how yours does.',
      'catchrate-name': 'Catch Rate',
      'catchrate-desc': 'Catch chance for every ball by Pokémon and situation.',
      'damage-name': 'Damage',
      'damage-desc': 'Calculate damage, KO chances and critical hits.',
      'typcalc-name': 'Types',
      'typcalc-desc': 'Type effectiveness for any combination.',
      'pokedex-name': 'Pokédex',
      'pokedex-desc': 'Stats, moves, locations and evolutions.',
      'map-name': 'Map',
      'map-desc': 'Sinnoh with items, trainers and wild Pokémon.',
      'rules-name': 'Rulebook',
      'rules-desc': 'Nuzlocke rules, clauses and your own variants.'
    }
  };

  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
  var pick = function (list) { return list[Math.floor(Math.random() * list.length)]; };

  // Typ-Rechner: zufälliger Doppeltyp als Typ-Etiketten aus Platin (Nummern wie bei PokeAPI:
  // 1 Normal … 17 Unlicht – Fee gibt es in Platin noch nicht)
  function typeIcon() {
    var el = document.getElementById('hub-type-icon');
    if (!el) return;
    var a = 1 + Math.floor(Math.random() * 17), b;
    do { b = 1 + Math.floor(Math.random() * 17); } while (b === a);
    [a, b].forEach(function (n) {
      var img = document.createElement('img');
      img.className = 'type-tag';
      img.src = SPR + 'types/generation-iv/platinum/' + n + '.png';
      img.alt = '';
      el.appendChild(img);
    });
  }

  // Fangrate: zufälliger Ball (Poké-, Super- und Hyperball stehen schon bei Solo/Duo/Trio)
  function ballIcon() {
    var BALLS = ['master-ball', 'safari-ball', 'net-ball', 'dive-ball', 'nest-ball', 'repeat-ball', 'timer-ball', 'luxury-ball', 'premier-ball', 'dusk-ball', 'heal-ball', 'quick-ball', 'moon-ball', 'friend-ball', 'love-ball', 'lure-ball', 'level-ball', 'fast-ball', 'heavy-ball', 'sport-ball', 'cherish-ball'];
    var el = document.getElementById('icon-catchrate');
    if (!el) return;
    var img = document.createElement('img');
    img.src = SPR + 'items/' + pick(BALLS) + '.png';
    img.alt = '';
    el.appendChild(img);
  }

  // Bühne: vier wilde Pokémon aus Sinnoh im hohen Gras – zwei hinten, zwei vorne, an den Seiten.
  // Platin-Sprites schauen nach links; die auf der linken Seite werden gespiegelt, damit alle zur Mitte schauen.
  function wildMons() {
    var POOL = [387, 390, 393, 396, 399, 401, 403, 406, 417, 418, 420, 422, 425, 427, 431, 433, 436, 439, 440, 443, 447, 449, 451, 453, 459];
    var spots = [
      { row: 'far', left: 15, flip: true },
      { row: 'far', left: 79, flip: false },
      { row: 'near', left: 3, flip: true },
      { row: 'near', left: 86, flip: false }
    ];
    var used = {};
    spots.forEach(function (s, i) {
      var id;
      do { id = pick(POOL); } while (used[id]);
      used[id] = true;
      var box = document.getElementById('mons-' + s.row);
      if (!box) return;
      var mon = document.createElement('div');
      mon.className = 'mon' + (s.flip ? ' is-flipped' : '');
      mon.style.left = s.left + '%';
      mon.style.animationDelay = (-i * 0.7) + 's';
      var img = document.createElement('img');
      img.src = SPR + 'pokemon/versions/generation-iv/platinum/' + id + '.png';
      img.alt = '';
      mon.appendChild(img);
      box.appendChild(mon);
    });
  }

  // Hohes Gras als Pixel-Kacheln: b = Grund, m = mittel, l = hell, o = dunkel, . = durchsichtig.
  // Oben die Kante mit den Halmspitzen (Licht von links, wie vom Mond), darunter die ruhige Fläche.
  var GRASS_EDGE = [
    '................l...........l...................',
    '................l...........l............l......',
    '...m...........ml....m..l...l............l......',
    '..lm..l...m.l.mml...lm..l...l...l........l...l..',
    '..lm..l..m..l.m.l...lml..l..l...l....lm..l...l..',
    '..lm..l..ml..lm.lm.lml...l..lm.l......l..l..l...',
    'lm.lol.mlm.l.lm.lmolml...lmolm.l....mml.mlm.l.ml',
    'ml.lmlmlmo..lmlmlmlmlo.m..lmlmlm...l.ml..lmlmml.',
    'ml.lmlmlmm..lmlmlmlmlm.m..lmlmlm..molmolmlmlml.m',
    'mollmllmmomobllmlmllmobmoblmlmlmoomoolmlmlmllmmo',
    'mollmllmmomobllmlmllmobmoblmlmlmobmobmllmlmllmmo',
    'bbllmllmbbbbbllmlmllmbbobolmlmlmobbbbollmlmllmbb'
  ];
  var GRASS_FILL = [
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbmbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbmbbbbbbbmbmbbbbbbbbbmbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbmbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbb',
    'bbbbbbmbbbbbbmbmbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbb',
    'bbbbbbmbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbmbbbbbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbb'
  ];
  var GRASS_TONES = { b: 'g-base', m: 'g-mid', l: 'g-light', o: 'g-dark' };

  // Kachel → je Farbton ein <path> aus waagrechten Pixel-Läufen (Farben setzt home.css je Ebene)
  function tilePaths(rows) {
    var d = {};
    rows.forEach(function (row, y) {
      for (var x = 0, n; x < row.length; x += n) {
        n = 1;
        while (row.charAt(x + n) === row.charAt(x)) n++;
        var c = row.charAt(x);
        if (GRASS_TONES[c]) d[c] = (d[c] || '') + 'M' + x + ' ' + y + 'h' + n + 'v1h-' + n + 'z';
      }
    });
    return Object.keys(d).map(function (c) {
      return '<path class="' + GRASS_TONES[c] + '" d="' + d[c] + '"/>';
    }).join('');
  }

  // Hinten kleinere Pixel als vorne (Tiefe); vorne seitlich versetzt, damit die Kanten nicht übereinander liegen
  function grass() {
    var edge = tilePaths(GRASS_EDGE), fill = tilePaths(GRASS_FILL);
    var w = GRASS_EDGE[0].length, eh = GRASS_EDGE.length, fh = GRASS_FILL.length;
    [{ sel: '.grass--back', id: 'grass-back', scale: 3, shift: 0 },
     { sel: '.grass--front', id: 'grass-front', scale: 4, shift: 18 }].forEach(function (g) {
      var svg = document.querySelector(g.sel);
      if (!svg) return;
      var s = g.scale, top = eh * s, dx = g.shift * s;
      svg.innerHTML =
        '<defs>' +
          '<pattern id="' + g.id + '-edge" width="' + w + '" height="' + eh + '" patternUnits="userSpaceOnUse" patternTransform="translate(' + dx + ' 0) scale(' + s + ')">' + edge + '</pattern>' +
          '<pattern id="' + g.id + '-fill" width="' + w + '" height="' + fh + '" patternUnits="userSpaceOnUse" patternTransform="translate(' + dx + ' ' + top + ') scale(' + s + ')">' + fill + '</pattern>' +
        '</defs>' +
        '<rect width="100%" height="' + top + '" fill="url(#' + g.id + '-edge)"/>' +
        '<rect y="' + top + '" width="100%" height="100%" fill="url(#' + g.id + '-fill)"/>';
    });
  }

  // Das Menüfenster soll auf jedem Bildschirm gleich aussehen: immer zwei Spalten in 1180 px Breite,
  // gleichmäßig vergrößert oder verkleinert (zoom), sodass es etwa 72 % der Bildschirmhöhe einnimmt –
  // aber nie breiter als der Bildschirm. Unter MIN_ZOOM wäre die Schrift zu klein; dann scrollt die Seite.
  var WIN_WIDTH = 1180, PAGE_PAD = 48;             // Seitenrand links + rechts (body in home.css)
  var HEIGHT_SHARE = 0.72, MIN_ZOOM = 0.6;
  function fitWindow() {
    var win = document.querySelector('.win');
    if (!win) return;
    // Höhe der Ansicht in Originalgröße messen (feste Breite, damit nichts umbricht)
    win.style.zoom = '';
    win.style.width = WIN_WIDTH + 'px';
    var h = win.getBoundingClientRect().height;
    win.style.width = '';
    var z = Math.min(window.innerHeight * HEIGHT_SHARE / h, (window.innerWidth - PAGE_PAD) / WIN_WIDTH);
    z = Math.max(MIN_ZOOM, z);
    win.style.zoom = Math.abs(z - 1) > 0.005 ? z.toFixed(3) : '';
  }

  function init() {
    typeIcon();
    ballIcon();
    grass();
    wildMons();
    fitWindow();
    var fitFrame = 0;
    window.addEventListener('resize', function () {
      cancelAnimationFrame(fitFrame);
      fitFrame = requestAnimationFrame(fitWindow);
    });
    var lang = 'de';
    try { lang = localStorage.getItem('hub-lang') === 'en' ? 'en' : 'de'; } catch (e) {}
    var btn = document.getElementById('lang-btn');
    function apply(l) {
      lang = l;
      try { localStorage.setItem('hub-lang', l); } catch (e) {}
      document.documentElement.lang = l;
      btn.textContent = l.toUpperCase();
      document.querySelectorAll('[data-i18n]').forEach(function (el) {
        var v = TR[l][el.dataset.i18n];
        if (v !== undefined) el.innerHTML = v;
      });
      // Kleine Kacheln: Beschreibung als Hinweis beim Drüberfahren
      document.querySelectorAll('[data-i18n-title]').forEach(function (el) {
        var v = TR[l][el.dataset.i18nTitle];
        if (v !== undefined) el.title = v;
      });
    }
    btn.addEventListener('click', function () { apply(lang === 'de' ? 'en' : 'de'); });
    apply(lang);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
