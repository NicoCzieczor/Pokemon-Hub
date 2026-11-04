/*
 * Kampfbühne der Team-Seiten (zuerst Duo): Himmel aus scene.css, eine Baumreihe am Horizont, das
 * Kampffeld und je Spieler ein Podest wie in den Kämpfen von Diamant/Perl/Platin, auf dem sein Team
 * steht – links und rechts neben der Karte, beide zur Mitte schauend.
 * Farben und Aussehen: stage.css. Pixel-Helfer: scene.js (HubScene.pixels).
 *
 *   HubStage.set(side, slot, mon)  – Pokémon auf ein Podest stellen (side 1|2, slot 0–5, mon { id, sprite } oder null)
 *   HubStage.hop(side, slot)       – kurz hüpfen lassen (beim Drüberfahren über die Team-Karte)
 *
 * Die Bühne ist <div class="stage" id="stage"> mit je einem .stage-side[data-side] und wird beim Laden
 * dieser Datei aufgebaut. Ist neben der Karte (#app) zu wenig Platz, bleiben nur Himmel und Feld.
 */
window.HubStage = (function () {
  'use strict';

  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
  var root = document.getElementById('stage');
  var card = document.getElementById('app');
  var sides = {};
  var scale = 0;                                   // Bildschirmpixel je Sprite-Pixel (0 = Podeste ausgeblendet)

  // ── Baumreihe: runde Kronen, die sich nahtlos wiederholen (l = Licht oben, b = Grund, o = Schatten) ──
  var TREE_W = 56, TREE_H = 14;
  var TREES = [[4, 7, 11], [13, 6, 13], [21, 5, 9], [29, 7, 14], [38, 5, 10], [46, 6, 12], [53, 4, 8]];

  // ── Podest: flache Scheibe von oben (Fläche, Rand, vorne die Seitenwand), dazu ein paar Halme ──
  var PAD_W = 96, PAD_RY = 10, PAD_T = 4, PAD_H = PAD_RY * 2 + PAD_T;
  function padRows() {
    var rows = [], cx = PAD_W / 2, rx = PAD_W / 2, cy = PAD_RY;
    for (var y = 0; y < PAD_H; y++) {
      var row = '';
      for (var x = 0; x < PAD_W; x++) {
        var nx = (x + 0.5 - cx) / rx, ny = (y + 0.5 - cy) / PAD_RY, ns = (y + 0.5 - cy - PAD_T) / PAD_RY;
        var top = nx * nx + ny * ny, side = nx * nx + ns * ns;
        var c = '.';
        if (top <= 1) {
          if (top > 0.8) c = ny < 0 ? 'l' : 'm';                      // Rand: hinten im Licht, vorne dunkler
          else if (top > 0.36 && top < 0.44) c = 'm';                 // innerer Ring wie im Spiel
          else c = ((x * 7 + y * 13) % 29 === 0 || (x * 7 + y * 13 - 13) % 29 === 0) && top < 0.3 ? 'm' : 'b';
        } else if (side <= 1 && ny > 0) {
          c = side > 0.86 || y === PAD_H - 1 ? 'k' : 'o';             // Seitenwand mit dunkler Unterkante
        }
        row += c;
      }
      rows.push(row);
    }
    return rows;
  }

  // Aufstellung je Seite (Spieler 1 links): x und Fußhöhe in % des Podests. Vorne die Plätze 1–3 der
  // Team-Karte, der erste innen (zur Mitte), hinten versetzt die Plätze 4–6. Rechts gespiegelt – so stehen
  // verknüpfte Paare genau gegenüber.
  var SPOTS = [[81, 62, 1], [50, 66, 1], [19, 62, 1], [66, 20, 0], [35, 18, 0], [8, 24, 0]];

  function set(side, slot, mon) {
    var s = sides[side];
    if (!s || slot < 0 || slot > 5) return;
    var url = mon ? HubScene.monSprite(mon.id, mon.sprite) : '';
    var cur = s.mons[slot];
    if (cur && cur.url === url) return;
    if (cur) {
      var old = cur.el;
      old.classList.add('is-out');
      setTimeout(function () { old.remove(); }, 260);
    }
    s.mons[slot] = null;
    if (s.balls[slot]) s.balls[slot].classList.toggle('is-empty', !mon);
    if (!mon) return;

    var spot = SPOTS[slot];
    var el = document.createElement('div');
    el.className = 'stage-mon' + (spot[2] ? ' is-front' : ' is-back');
    el.style.left = (side === 1 ? spot[0] : 100 - spot[0]) + '%';
    el.style.top = spot[1] + '%';
    el.style.setProperty('--delay', (slot * 0.09) + 's');
    var body = document.createElement('div');
    body.className = 'stage-mon-body';
    var img = document.createElement('img');
    img.alt = '';
    img.decoding = 'async';
    img.crossOrigin = 'anonymous';
    img.style.animationDelay = (-slot * 0.55 - side * 0.3) + 's';
    img.onload = function () {
      var f = HubScene.feet(img);                   // ohne Messung bleibt der geschätzte Rand aus stage.css
      el.style.setProperty('--nw', img.naturalWidth);
      if (f !== null) el.style.setProperty('--feet', f);
      el.classList.add('is-ready');
    };
    // Kommt das Bild nur ohne CORS (alter Eintrag im Offline-Speicher), dann eben ohne Fußmessung
    img.onerror = function () {
      if (!img.crossOrigin) return;
      img.removeAttribute('crossorigin');
      img.src = url;
    };
    img.src = url;
    body.appendChild(img);
    el.appendChild(body);
    s.mons[slot] = { url: url, el: el };
    s.box.appendChild(el);
  }

  function hop(side, slot) {
    var m = sides[side] && sides[side].mons[slot];
    if (!m || !scale) return;
    var b = m.el.firstChild;
    b.classList.remove('is-hop');
    void b.offsetWidth;                              // Animation neu starten
    b.classList.add('is-hop');
  }

  // Größe nach dem Platz neben der Karte (ohne Scrollleiste): Sprites 2- oder 1,5-fach, wenn das Podest gut
  // 3½ Sprites breit sein kann, 1-fach schon ab 3 Sprites (Full HD) – sonst Podeste ausblenden.
  // Das Podest wird so breit wie möglich (höchstens 4 Sprites), damit sich das Team nicht drängelt.
  var GUTTER = 24;
  function layout() {
    var b = HubScene.beside(card), strip = b.strip - GUTTER;
    scale = [2, 1.5, 1].filter(function (s) { return 80 * s * (s > 1 ? 3.5 : 3.1) <= strip; })[0] || 0;
    root.style.setProperty('--s', scale || 1);
    root.style.setProperty('--pw', Math.min(strip, 80 * scale * 4) + 'px');
    root.style.setProperty('--cl', b.cl + 'px');
    root.style.setProperty('--cr', b.cr + 'px');
    root.classList.toggle('is-tight', !scale);
  }

  function mount() {
    if (window.PokeHubLite || !root || !card || !window.HubScene) return;   // Handy/Tablet (pwa.js): keine Bühne
    var trees = root.querySelector('.stage-trees');
    if (trees) {
      trees.innerHTML =
        '<defs><pattern id="stage-tree" width="' + TREE_W + '" height="' + TREE_H + '" patternUnits="userSpaceOnUse" patternTransform="scale(4)">' +
          HubScene.pixels(HubScene.ridge(TREE_W, TREE_H, TREES, 3), { l: 't-hi', b: 't-base', o: 't-dark' }) +
        '</pattern></defs>' +
        '<rect width="100%" height="' + (TREE_H * 4) + '" fill="url(#stage-tree)"/>';
    }
    var pad = HubScene.pixels(padRows(), { l: 'p-hi', b: 'p-top', m: 'p-mid', o: 'p-side', k: 'p-dark' });
    root.querySelectorAll('.stage-side').forEach(function (el) {
      var side = Number(el.dataset.side);
      var balls = el.querySelector('.stage-balls');
      var b = [];
      for (var i = 0; i < 6; i++) {
        var ball = document.createElement('img');
        ball.className = 'is-empty';
        ball.alt = '';
        ball.src = SPR + 'items/poke-ball.png';
        balls.appendChild(ball);
        b.push(ball);
      }
      el.querySelector('.stage-pad').innerHTML = '<svg viewBox="0 0 ' + PAD_W + ' ' + PAD_H + '" preserveAspectRatio="none">' + pad + '</svg>';
      sides[side] = { mons: [], balls: b, box: el.querySelector('.stage-mons') };
    });
    layout();
    window.addEventListener('resize', layout);
    if (window.ResizeObserver) new ResizeObserver(layout).observe(card);
  }

  mount();
  return { set: set, hop: hop };
})();
