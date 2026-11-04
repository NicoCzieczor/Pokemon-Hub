/*
 * „Ruinen von Trostu“ hinter dem Regelwerk: Die Seite ist eine Kammer der Ruinen – Steinquader, Fackeln und ein
 * Fries aus eingemeißelten Zeichen. Icognito schweben durch den Raum. Fährt man über eine Regel, eine Klausel oder
 * eine Variante, fliegen sie auf der Seite der Regel zusammen und schreiben ihr Stichwort an die Wand (die Klauseln
 * heißen A–F wie die Icognito-Buchstaben). Eine neue eigene Regel schreiben sie mit ihrem ersten Wort.
 * Klassik: Nacht mit Fackelschein, Graphit: Sandstein im Abendlicht, Papier: heller Kalkstein am Tag.
 * Farben und Aussehen: ruins.css. Pixel-Helfer: scene.js (HubScene).
 *
 *   Regeln im Regelwerk tragen data-word="core-1" … (Schlüssel in WORDS)
 *   RuinsScene.spell(text)  – eigene Regel hinzugefügt (index.html, addRule)
 */
window.RuinsScene = (function () {
  'use strict';

  var PLAT = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/platinum/';
  var root = document.getElementById('ru');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { spell: function () {} };

  // Stichwörter je Regel – höchstens fünf Buchstaben je Zeile (Leerzeichen = neue Zeile)
  var WORDS = {
    de: {
      'core-1': 'FUND', 'core-2': 'TOD', 'core-3': 'NAME',
      'clause-a': 'DUPES', 'clause-b': 'SHINY', 'clause-c': 'GABE', 'clause-d': 'SET', 'clause-e': 'KEINE ITEMS', 'clause-f': 'LEVEL',
      hardcore: 'HARD CORE', soullink: 'SOUL LINK', randomizer: 'RANDO', wedlocke: 'PAARE', monotype: 'EIN TYP', egglocke: 'EIER',
      idle: ['NUZ LOCKE', 'REGEL'], fresh: 'NEU!', custom: 'Eigene Regel'
    },
    en: {
      'core-1': 'FIRST', 'core-2': 'DEATH', 'core-3': 'NAME',
      'clause-a': 'DUPES', 'clause-b': 'SHINY', 'clause-c': 'GIFT', 'clause-d': 'SET', 'clause-e': 'NO ITEMS', 'clause-f': 'LEVEL',
      hardcore: 'HARD CORE', soullink: 'SOUL LINK', randomizer: 'RANDO', wedlocke: 'PAIRS', monotype: 'ONE TYPE', egglocke: 'EGGS',
      idle: ['NUZ LOCKE', 'RULES'], fresh: 'NEW!', custom: 'Custom rule'
    }
  };
  var words = function () { return WORDS[document.documentElement.lang] || WORDS.de; };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');
  var unown = function (ch) {
    return PLAT + '201-' + (ch === '!' ? 'exclamation' : ch === '?' ? 'question' : ch.toLowerCase()) + '.png';
  };

  // ── Pixel-Kunst ──────────────────────────────────────────────────────────
  // Mauer aus Quadern (64 × 32 Kunst-Pixel, 4 Reihen zu je 4 Steinen, versetzt): m = Fuge, l = Licht oben/links,
  // o = Schatten unten/rechts, b/c = zwei Steinfarben, s = Sprenkel
  function wallRows() {
    var rows = [];
    for (var y = 0; y < 32; y++) {
      var band = Math.floor(y / 8), yy = y % 8, off = band % 2 ? 8 : 0, row = '';
      for (var x = 0; x < 64; x++) {
        var xx = (x + off) % 16, brick = Math.floor((x + off) / 16) % 4 + band * 4;
        var c;
        if (yy === 7 || xx === 15) c = 'm';
        else if (yy === 0 || xx === 0) c = 'l';
        else if (yy === 6 || xx === 14) c = 'o';
        else if ((x * 7 + y * 13 + brick * 5) % 29 === 0 || (x * 3 + y * 11) % 41 === 0) c = 's';
        else c = (brick * 7) % 3 === 0 ? 'c' : 'b';
        row += c;
      }
      rows.push(row);
    }
    // ein paar Risse
    var crack = function (x, y, path) {
      path.split('').forEach(function (d) {
        rows[y] = rows[y].slice(0, x) + 'o' + rows[y].slice(x + 1);
        if (d === 'r') x++; else if (d === 'l') x--;
        y++;
      });
    };
    crack(5, 1, 'drdrd');
    crack(41, 17, 'dldrdd');
    crack(27, 25, 'rdrd');
    return rows;
  }
  var WALL_TONES = { m: 'w-m', l: 'w-l', o: 'w-o', b: 'w-b', c: 'w-c', s: 'w-s' };
  var STONE = 4;   // Bildschirmpixel je Kunst-Pixel der Mauer

  // Wandfackel: Halter (d = dunkel, h = hell) und zwei Flammenbilder (w = Kern, y = gelb, o = orange, r = rot)
  var HOLDER = [
    '.dhhhhd.',
    '.dhddhd.',
    '..dhhd..',
    '...hd...',
    '...hd...',
    '...hd...',
    '..dhhd..',
    '.dd..dd.'
  ];
  var FLAMES = [
    ['...y....', '..yy....', '..yoy...', '.yoory..', '.yorwoy.', '.yowwoy.', '..ywwy..', '...yy...'],
    ['....y...', '....yy..', '...yoy..', '..yrooy.', '.yowroy.', '.yowwoy.', '..ywwy..', '...yy...']
  ];
  var TORCH_TONES = { d: 't-d', h: 't-h' };
  var FLAME_TONES = { w: 'f-w', y: 'f-y', o: 'f-o', r: 'f-r' };

  var svg = function (rows, tones, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 ' + rows[0].length + ' ' + rows.length + '" shape-rendering="crispEdges" aria-hidden="true">' +
      HubScene.pixels(rows, tones) + '</svg>';
  };
  var torch = function (side) {
    return '<div class="ru-torch ru-torch--' + side + '"><i class="ru-light"></i>' +
      '<span class="ru-flame">' + svg(FLAMES[0], FLAME_TONES, 'ru-f0') + svg(FLAMES[1], FLAME_TONES, 'ru-f1') + '</span>' +
      svg(HOLDER, TORCH_TONES, 'ru-holder') + '<span class="ru-dust"></span></div>';
  };

  root.innerHTML =
    '<svg class="ru-wall" aria-hidden="true"><defs><pattern id="ru-stone" width="64" height="32" patternUnits="userSpaceOnUse" patternTransform="scale(' + STONE + ')">' +
      HubScene.pixels(wallRows(), WALL_TONES) + '</pattern></defs><rect width="100%" height="100%" fill="url(#ru-stone)"/></svg>' +
    '<div class="ru-shade" aria-hidden="true"></div>' +
    '<div class="ru-beams" aria-hidden="true"><i></i><i></i><i></i></div>' +
    '<div class="ru-frieze ru-frieze--l" aria-hidden="true"></div><div class="ru-frieze ru-frieze--r" aria-hidden="true"></div>' +
    '<div class="ru-floor" aria-hidden="true"></div>' +
    torch('l') + torch('r') +
    '<div class="ru-slab" aria-hidden="true"><i class="ru-stone"></i></div>' +
    '<div class="ru-mons" aria-hidden="true"></div>' +
    '<span class="ru-cap" aria-hidden="true"></span>';
  var el = {
    friezeL: root.querySelector('.ru-frieze--l'),
    friezeR: root.querySelector('.ru-frieze--r'),
    torchL: root.querySelector('.ru-torch--l'),
    torchR: root.querySelector('.ru-torch--r'),
    slab: root.querySelector('.ru-slab'),
    cap: root.querySelector('.ru-cap'),
    mons: root.querySelector('.ru-mons')
  };

  // ── Maße ─────────────────────────────────────────────────────────────────
  var full = false, tight = false, k = 1, vw = 0, vh = 0, zones = {};
  var PITCH = 30, ROW = 40;   // Abstand der Buchstaben und Zeilen in Sprite-Pixeln

  function layout() {
    vw = document.documentElement.clientWidth;
    vh = window.innerHeight;
    var side = HubScene.beside(card), r = card.getBoundingClientRect(), strip = side.strip;
    full = strip >= 200;
    tight = !full && strip >= 110;
    k = strip >= 560 ? 3 : full ? 2 : 1;
    root.classList.toggle('is-full', full);
    root.classList.toggle('is-tight', tight);
    root.classList.toggle('is-bare', !full && !tight);
    root.style.setProperty('--k', k);
    root.style.setProperty('--cl', side.cl + 'px');
    root.style.setProperty('--cr', side.cr + 'px');
    root.style.setProperty('--strip', strip + 'px');
    // Schwebebereich je Seite: neben der Karte, über dem Fries
    zones = {
      l: { x0: 16, x1: Math.max(16, r.left - 24), y0: vh * 0.1, y1: vh * 0.72, cx: side.cl },
      r: { x0: Math.min(vw - 16, r.right + 24), x1: vw - 16, y0: vh * 0.1, y1: vh * 0.72, cx: side.cr }
    };
    frieze(el.friezeL, side.left);
    frieze(el.friezeR, side.right);
    populate();
  }

  // Fries: eingemeißelte Icognito-Zeichen in einer Reihe (Buchstaben von „NUZLOCKE“ immer wieder)
  function frieze(box, w) {
    var step = 30 * k, n = Math.max(0, Math.floor((w - 24) / step)), html = '', letters = 'NUZLOCKE';
    for (var i = 0; i < n; i++) html += '<img alt="" src="' + unown(letters.charAt(i % letters.length)) + '">';
    box.innerHTML = html;
    box.style.width = Math.max(0, w - 24) + 'px';
  }

  // Funken, die aus den Fackeln aufsteigen
  [el.torchL, el.torchR].forEach(function (t) {
    var html = '';
    for (var i = 0; i < 9; i++) {
      html += '<i style="left:' + rand(-10, 10).toFixed(0) + 'px;--d:' + rand(2.6, 4.6).toFixed(2) + 's;--dl:' + (-rand(0, 4.6)).toFixed(2) +
        's;--dx:' + rand(-26, 26).toFixed(0) + 'px"></i>';
    }
    t.querySelector('.ru-dust').innerHTML = html;
  });

  // ── Icognito ─────────────────────────────────────────────────────────────
  var mons = [];   // { el, ch, side, x, y, word, extra }
  var POOL = 'NUZLOCKEREGIAT';
  // Freier Punkt im Schwebebereich – nicht vor der Steintafel, solange dort ein Wort steht
  var inSlab = function (side, x, y) {
    var b = word && word.side === side && word.box;
    return !!b && x > b.x0 && x < b.x1 && y > b.y0 && y < b.y1;
  };
  var target = function (side) {
    var z = zones[side], p;
    for (var i = 0; i < 12; i++) {
      p = { x: rand(z.x0 + 20 * k, z.x1 - 20 * k), y: rand(z.y0, z.y1) };
      if (!inSlab(side, p.x, p.y)) break;
    }
    return p;
  };
  function place(m, x, y, sec, delay) {
    m.x = x; m.y = y;
    var st = m.el.style;
    st.setProperty('--t', sec + 's');
    st.transitionDelay = (delay || 0) + 's';
    st.transform = 'translate(' + Math.round(x - 40 * k) + 'px,' + Math.round(y - 40 * k) + 'px)';
  }
  function make(ch, side, x, y, extra) {
    var box = document.createElement('div');
    box.className = 'ru-mon is-gone';
    box.innerHTML = '<span class="ru-bob"><img alt=""></span>';
    box.querySelector('img').src = unown(ch);
    box.style.setProperty('--bd', (-rand(0, 3)).toFixed(2) + 's');
    var m = { el: box, ch: ch, side: side, x: x, y: y, word: false, extra: !!extra };
    place(m, x, y, 0);
    el.mons.appendChild(box);
    requestAnimationFrame(function () { requestAnimationFrame(function () { box.classList.remove('is-gone'); }); });
    mons.push(m);
    return m;
  }
  function drop(m) {
    mons.splice(mons.indexOf(m), 1);
    m.el.classList.add('is-gone');
    setTimeout(function () { m.el.remove(); }, 700);
  }

  // Grundbestand je Seite neu verteilen (nach Größenänderung)
  function populate() {
    word = null;
    el.slab.classList.remove('is-on');
    el.cap.classList.remove('is-on');
    mons.slice().forEach(function (m) { m.el.remove(); });
    mons = [];
    if (!full && !tight) return;
    var n = full ? clamp(Math.round(vh / 170), 4, 8) : 3;
    ['l', 'r'].forEach(function (side) {
      for (var i = 0; i < n; i++) {
        var p = target(side);
        make(POOL.charAt(Math.floor(Math.random() * POOL.length)), side, p.x, p.y);
      }
    });
  }

  // Schweben: ab und zu zieht ein freies Icognito langsam an eine neue Stelle
  function wander() {
    if (document.hidden || reduce.matches) return;
    var free = mons.filter(function (m) { return !m.word; });
    if (!free.length) return;
    var m = free[Math.floor(Math.random() * free.length)], z = zones[m.side];
    var x = clamp(m.x + rand(-1, 1) * (z.x1 - z.x0) * 0.5, z.x0 + 20 * k, z.x1 - 20 * k);
    var y = clamp(m.y + rand(-1, 1) * vh * 0.22, z.y0, z.y1);
    if (inSlab(m.side, x, y)) { var p = target(m.side); x = p.x; y = p.y; }
    place(m, x, y, rand(5, 9).toFixed(1));
  }
  setInterval(wander, 650);

  // ── Wörter an der Wand ───────────────────────────────────────────────────
  var word = null;   // { side, mons }

  // Buchstaben für die Icognito: Umlaute ausschreiben, nur A–Z, ! und ?
  var letters = function (s) {
    return String(s).toUpperCase().replace(/Ä/g, 'AE').replace(/Ö/g, 'OE').replace(/Ü/g, 'UE').replace(/ß/g, 'SS')
      .normalize('NFD').replace(/[^A-Z!? ]/g, '');
  };

  function release() {
    if (!word) return;
    el.slab.classList.remove('is-on');
    el.cap.classList.remove('is-on');
    word.mons.forEach(function (m) {
      m.word = false;
      m.el.classList.remove('is-word');
      m.el.style.removeProperty('--fs');
      if (m.extra) { drop(m); return; }
      var p = target(m.side);
      place(m, p.x, p.y, rand(2.5, 4).toFixed(1));
    });
    word = null;
  }

  // text: Zeilen durch Leerzeichen getrennt; caption = Regel darunter; side = 'l' | 'r'
  function spellOn(side, text, caption) {
    if (!full && !tight) return;
    release();
    var z = zones[side], rows = letters(text).split(' ').filter(Boolean);
    if (!rows.length) return;
    var longest = Math.max.apply(null, rows.map(function (r) { return r.length; }));
    // Wort so groß wie die schwebenden Icognito – passt es nicht, in Vierteln kleiner (höchstens auf 1×)
    var avail = z.x1 - z.x0 - 24, kk = Math.min(k, Math.floor(avail / (longest * PITCH) * 4) / 4);
    if (kk < 1) return;   // zu schmal für das Wort
    var pitch = PITCH * kk, rowH = ROW * kk, cx = z.cx, cy = clamp(vh * 0.4, z.y0 + rowH, z.y1 - rowH * rows.length / 2);
    var used = [], n = 0;
    rows.forEach(function (row, ri) {
      row.split('').forEach(function (ch, i) {
        var x = cx + (i - (row.length - 1) / 2) * pitch, y = cy + (ri - (rows.length - 1) / 2) * rowH;
        // freies Icognito mit dem Buchstaben – am liebsten auf dieser Seite und nah dran –, sonst taucht eins auf
        var best = null, bd = Infinity;
        mons.forEach(function (m) {
          if (m.word || used.indexOf(m) >= 0 || m.ch !== ch) return;
          var d = Math.hypot(m.x - x, m.y - y) + (m.side === side ? 0 : 4000);
          if (d < bd) { bd = d; best = m; }
        });
        if (!best || best.side !== side) {
          var p = target(side);
          best = make(ch, side, p.x, p.y, true);
        }
        used.push(best);
        best.word = true;
        best.el.classList.add('is-word');
        best.el.style.setProperty('--fs', kk / k);
        best.el.style.setProperty('--bd', (-n * 0.14).toFixed(2) + 's');   // Welle durch das Wort
        place(best, x, y, rand(0.9, 1.3).toFixed(2), n * 0.05);
        n++;
      });
    });
    // Bereich der Tafel samt Schild: freie Icognito auf dieser Seite weichen aus
    var hw = (longest * pitch + 30 * kk) / 2 + 30 * k, hh = (rows.length * rowH + 14 * kk) / 2;
    word = { side: side, mons: used, box: { x0: cx - hw, x1: cx + hw, y0: cy - hh - 34 * k, y1: cy + hh + 60 + 20 * k } };
    mons.forEach(function (m) {
      if (m.word || m.side !== side || !inSlab(side, m.x, m.y)) return;
      var p = target(side);
      place(m, p.x, p.y, rand(1.2, 1.8).toFixed(2));
    });
    // Steintafel hinter dem Wort, darunter die Regel
    var s = el.slab.style;
    s.left = Math.round(cx) + 'px';
    s.top = Math.round(cy) + 'px';
    s.width = Math.round(longest * pitch + 30 * kk) + 'px';
    s.height = Math.round(rows.length * rowH + 14 * kk) + 'px';
    var c = el.cap.style;
    c.left = Math.round(cx) + 'px';
    c.top = Math.round(cy + (rows.length * rowH + 14 * kk) / 2 + 22) + 'px';
    c.maxWidth = Math.round(z.x1 - z.x0 - 16) + 'px';
    el.cap.textContent = caption || '';
    el.slab.classList.add('is-on');
    el.cap.classList.toggle('is-on', !!caption);
  }

  // Seite der Regel: links oder rechts der Kartenmitte
  function sideOf(node) {
    var r = node.getBoundingClientRect(), c = card.getBoundingClientRect();
    return r.left + r.width / 2 < c.left + c.width / 2 ? 'l' : 'r';
  }
  function captionOf(node) {
    var num = node.querySelector('.rule-num'), name = node.querySelector('.rule-name, .variant-name');
    var title = name ? (name.firstChild && name.firstChild.nodeType === 3 ? name.firstChild.textContent : name.textContent).trim() : '';
    return (num ? num.textContent.trim() + ' · ' : '') + title;
  }

  var current = null, hoverTimer = null, releaseTimer = null, lastHover = 0;
  function enter(node) {
    clearTimeout(releaseTimer);
    clearTimeout(hoverTimer);
    lastHover = Date.now();
    if (node === current) return;
    hoverTimer = setTimeout(function () {
      current = node;
      var w = words()[node.dataset.word];
      if (w) spellOn(sideOf(node), w, captionOf(node));
    }, 160);
  }
  function leave() {
    clearTimeout(hoverTimer);
    clearTimeout(releaseTimer);
    releaseTimer = setTimeout(function () { current = null; release(); }, 1800);
  }
  card.addEventListener('mouseover', function (e) {
    var node = e.target.closest('[data-word]');
    if (node) enter(node); else if (current) leave();
  });
  card.addEventListener('mouseleave', function () { if (current) leave(); });

  // Ab und zu schreiben sie von selbst – abwechselnd links und rechts
  var idleSide = 'l', idleN = 0;
  setInterval(function () {
    if (document.hidden || reduce.matches || current || word || Date.now() - lastHover < 8000) return;
    var list = words().idle;
    spellOn(idleSide, list[idleN++ % list.length], '');
    idleSide = idleSide === 'l' ? 'r' : 'l';
    setTimeout(function () { if (!current) release(); }, 5500);
  }, 21000);

  // Neue eigene Regel: „NEU!“ und ihr erstes Wort (wenn es auf eine Zeile passt)
  function spell(text) {
    var w = words(), first = letters(text).split(' ').filter(Boolean)[0] || '';
    clearTimeout(releaseTimer);
    current = null;
    spellOn('r', w.fresh + (first.length <= 5 ? ' ' + first : ''), w.custom + ': ' + (text.length > 48 ? text.slice(0, 46) + '…' : text));
    releaseTimer = setTimeout(release, 6000);
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 150); });
  layout();
  setTimeout(function () { spellOn('l', words().idle[0], ''); setTimeout(function () { if (!current) release(); }, 4500); }, 1400);

  return { spell: spell };
})();
