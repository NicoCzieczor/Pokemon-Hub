/*
 * „Im PC“ hinter dem Save-Viewer: Die Seite trägt die Tapete der gerade gezeigten Box (wie im Spiel gewählt –
 * Wald, Stadt, Wüste …). Links neben der Karte steht die Box selbst mit den echten Icons aus dem Spielstand,
 * ◀ ▶ blättert durch die Boxen (wie die Box-Liste im Tab „Boxen“), rechts das Team. Die PC-Hand greift ab und zu
 * ein Pokémon, hebt es hoch und zeigt seinen Namen; fährt man über ein Icon, kommt sie dorthin. Ein Klick öffnet
 * die Pokémon-Karte (gleicher Dialog wie auf der Seite). Ohne Spielstand ist die Box leer.
 * Farben und Aussehen: pc.css. Pixel-Helfer und Platz neben der Karte: scene.js (HubScene).
 *
 *   PcScene.update(data)  – nach jedem Zeichnen (main.js, updateScene):
 *     { empty, trainer, box, grave, boxes: [{ name, wallpaper, slots: [mon | null] × 30 }], team: [mon] }
 *     mon = { ref, icon (HTML), name, lv, shiny }
 */
window.PcScene = (function () {
  'use strict';

  var root = document.getElementById('pc');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {} };

  var TR = {
    de: { team: 'Team', empty: 'Kein Spielstand geladen', emptyBox: 'Diese Box ist leer.', box: 'Box', prev: 'Vorige Box', next: 'Nächste Box', grave: 'Friedhof' },
    en: { team: 'Party', empty: 'No save file loaded', emptyBox: 'This box is empty.', box: 'Box', prev: 'Previous box', next: 'Next box', grave: 'Graveyard' }
  };
  var tr = function () { return TR[document.documentElement.lang] || TR.de; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };

  // Box-Tapeten aus Platin (Nummer im Spielstand) → Muster in pc.css; ab 16 die Sondertapeten
  var WALLS = ['forest', 'city', 'desert', 'savanna', 'crag', 'volcano', 'snow', 'cave', 'beach', 'seafloor', 'river', 'sky',
    'center', 'machine', 'checks', 'simple'];
  var wallOf = function (n) { return WALLS[n] || (n >= 16 ? 'special' : 'forest'); };

  // PC-Hand: offen (zeigt) und zu (hält), o = Rand, w = weiß, s = Schatten
  var HAND_OPEN = [
    '.....oo.........', '....owwo........', '....owwo........', '....owwooo......', '....owwowwoo....', '.oo.owwowwowo...',
    'owwoowwowwowwo..', 'owwwowwwwwwwwo..', '.owwwwwwwwwwwo..', '..owwwwwwwwwwo..', '..owwwwwwwwwso..', '...owwwwwwwso...',
    '....owwwwwso....', '.....oooooo.....'
  ];
  var HAND_GRAB = [
    '................', '................', '................', '....oooooo......', '...owwowwoo.....', '..owwowwowwo....',
    '..owwowwowwoo...', '.oowwwwwwwwwwo..', 'owwowwwwwwwwwo..', 'owwwwwwwwwwwwo..', '.owwwwwwwwwwso..', '..owwwwwwwwso...',
    '...owwwwwwso....', '....oooooo......'
  ];
  var HAND_TONES = { o: 'h-o', w: 'h-w', s: 'h-s' };
  var px = function (rows, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 16 14" shape-rendering="crispEdges">' + HubScene.pixels(rows, HAND_TONES) + '</svg>';
  };

  root.innerHTML =
    '<div class="pc-wall" aria-hidden="true"></div><div class="pc-dim" aria-hidden="true"></div>' +
    '<div class="pc-win pc-box">' +
      '<div class="pc-head"><button type="button" class="pc-arrow" data-act="box" data-i="0" tabindex="-1">◀</button>' +
      '<b class="pc-name"></b><button type="button" class="pc-arrow" data-act="box" data-i="0" tabindex="-1">▶</button></div>' +
      '<div class="pc-grid"></div><p class="pc-note"></p>' +
      '<span class="pc-hand" aria-hidden="true">' + px(HAND_OPEN, 'pc-h-open') + px(HAND_GRAB, 'pc-h-grab') + '</span>' +
      '<span class="pc-tag" aria-hidden="true"><b></b><small></small></span>' +
    '</div>' +
    '<div class="pc-win pc-party"><div class="pc-head"><b class="pc-title"></b><small class="pc-trainer"></small></div><div class="pc-slots"></div></div>';
  var el = {
    wall: root.querySelector('.pc-wall'),
    box: root.querySelector('.pc-box'),
    name: root.querySelector('.pc-name'),
    arrows: root.querySelectorAll('.pc-arrow'),
    grid: root.querySelector('.pc-grid'),
    note: root.querySelector('.pc-note'),
    hand: root.querySelector('.pc-hand'),
    tag: root.querySelector('.pc-tag'),
    title: root.querySelector('.pc-title'),
    trainer: root.querySelector('.pc-trainer'),
    slots: root.querySelector('.pc-slots')
  };

  var data = null, full = false, cell = 40;

  function layout() {
    var side = HubScene.beside(card);
    full = side.strip >= 200;
    root.classList.toggle('is-full', full);
    root.classList.toggle('is-bare', !full);
    cell = Math.max(34, Math.min(92, Math.floor((side.strip - 46) / 6)));
    root.style.setProperty('--cell', cell + 'px');
    root.style.setProperty('--ic', cell >= 82 ? 2 : 1);   // Icons doppelt so groß, wenn die Zellen es hergeben
    root.style.setProperty('--cl', side.cl + 'px');
    root.style.setProperty('--cr', side.cr + 'px');
  }

  function render() {
    var t = tr(), d = data || { empty: true, boxes: [], team: [] };
    var boxes = d.boxes || [], n = boxes.length, bi = Math.min(d.box || 0, Math.max(0, n - 1));
    var box = boxes[bi] || { name: t.box + ' 1', wallpaper: 0, slots: [] };
    root.dataset.wall = wallOf(box.wallpaper);
    root.classList.toggle('is-empty', !!d.empty);
    el.name.textContent = (d.grave === bi && !d.empty ? '† ' : '') + box.name;
    el.arrows[0].dataset.i = n ? (bi + n - 1) % n : 0;
    el.arrows[1].dataset.i = n ? (bi + 1) % n : 0;
    el.arrows[0].title = t.prev;
    el.arrows[1].title = t.next;
    el.arrows.forEach(function (a) { a.disabled = n < 2; });
    var slots = [];
    for (var i = 0; i < 30; i++) slots.push(box.slots[i] || null);
    el.grid.innerHTML = slots.map(function (m, i) {
      if (!m) return '<span class="pc-cell" data-c="' + i + '"></span>';
      return '<button type="button" tabindex="-1" class="pc-cell pc-mon' + (m.shiny ? ' is-shiny' : '') + '" data-c="' + i + '" data-mon="' + esc(m.ref) + '" data-name="' + esc(m.name) + '" data-lv="' + esc(m.lv) + '">' + m.icon + '</button>';
    }).join('');
    var count = slots.filter(Boolean).length;
    el.note.textContent = d.empty ? t.empty : count ? '' : t.emptyBox;
    el.note.hidden = !el.note.textContent;

    el.title.textContent = t.team;
    el.trainer.textContent = d.trainer || '';
    var team = (d.team || []).slice(0, 6);
    var html = '';
    for (i = 0; i < 6; i++) {
      var m = team[i];
      html += m
        ? '<button type="button" tabindex="-1" class="pc-slot pc-mon' + (m.shiny ? ' is-shiny' : '') + '" data-mon="' + esc(m.ref) + '" style="--bd:' + (-i * 0.18).toFixed(2) + 's">' + m.icon +
          '<span class="pc-slot-txt"><b>' + esc(m.name) + '</b><small>' + esc(m.lv) + '</small></span></button>'
        : '<span class="pc-slot is-free"></span>';
    }
    el.slots.innerHTML = html;
    release();
    if (!count) pointAt(29);
  }

  // ── PC-Hand ──────────────────────────────────────────────────────────────
  var held = null, handTimer = null, hoverAt = 0;
  function pointAt(c) {
    var x = (c % 6 + 0.5) * cell, y = (Math.floor(c / 6) + 0.5) * cell;
    el.hand.style.transform = 'translate(' + Math.round(x + cell * 0.1) + 'px,' + Math.round(y - cell * 0.15) + 'px)';
  }
  function release() {
    if (held) held.classList.remove('is-held');
    held = null;
    el.hand.classList.remove('is-grab');
    el.tag.classList.remove('is-on');
  }
  function grab(btn) {
    release();
    held = btn;
    btn.classList.add('is-held');
    el.hand.classList.add('is-grab');
    var c = +btn.dataset.c;
    el.tag.querySelector('b').textContent = btn.dataset.name || '';
    el.tag.querySelector('small').textContent = btn.dataset.lv || '';
    // oberste Reihe: Schild unter dem Pokémon, sonst darüber
    var row = Math.floor(c / 6);
    el.tag.classList.toggle('is-below', row === 0);
    el.tag.style.transform = 'translate(' + Math.round((c % 6 + 0.5) * cell) + 'px,' + Math.round((row + (row === 0 ? 1 : 0)) * cell) + 'px)';
    el.tag.classList.add('is-on');
  }
  // Ab und zu: zu einem Pokémon, zugreifen, hochheben, wieder absetzen; leere Box → nur herumzeigen
  function idle() {
    clearTimeout(handTimer);
    handTimer = setTimeout(idle, rand(3800, 6200));
    if (!full || document.hidden || Date.now() - hoverAt < 5000) return;
    var mons = el.grid.querySelectorAll('.pc-mon');
    if (!mons.length) { pointAt(29); return; }   // leere Box: Hand wartet in der Ecke, der Hinweis bleibt frei
    var btn = mons[Math.floor(Math.random() * mons.length)];
    release();
    pointAt(+btn.dataset.c);
    setTimeout(function () { if (btn.isConnected && Date.now() - hoverAt > 600) grab(btn); }, 700);
    setTimeout(function () { if (held === btn) release(); }, 2600);
  }
  // Maus über einem Icon: die Hand kommt hin und hebt es an
  el.grid.addEventListener('mouseover', function (e) {
    var btn = e.target.closest('.pc-mon');
    if (!btn || btn === held) return;
    hoverAt = Date.now();
    pointAt(+btn.dataset.c);
    grab(btn);
  });
  el.grid.addEventListener('mouseleave', function () { hoverAt = Date.now(); release(); });

  var raf = 0;
  function update(d) {
    data = d;
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; render(); });
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { layout(); render(); }, 120); });
  layout();
  render();
  pointAt(14);
  idle();

  return { update: update };
})();
