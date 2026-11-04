/*
 * „Elemente“ hinter dem Typen-Rechner: links die Atmosphäre des Angriffstyps, rechts die der Verteidigungstypen
 * (bei zwei Typen gemischt) – Glut, Blasen, Blätter, Schnee, Funken, Ringe … je Typ. In der Mitte jeder Seite
 * schwebt das Typ-Symbol; die Wirkung sieht man: sehr effektiv erschüttert den Verteidiger im Takt, nicht sehr
 * effektiv prallt an einem Schild ab, keine Wirkung an einer Barriere.
 * Farben, Formen und Bewegungen: elements.css. Die Partikel bewegt nur CSS (Verschieben auf der Grafikkarte).
 *
 *   TypeScene.update(data) – nach jeder Auswahl (app.js, renderResults):
 *     { atk: { type, name, color } | null, defs: [{ type, name, color }], mult: Zahl | null, multLabel, multText,
 *       multCls, labels: { atk, def }, icon: (type, size) → HTML des Typ-Symbols }
 */
window.TypeScene = (function () {
  'use strict';

  var root = document.getElementById('ty');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {} };

  // Je Typ: Form und Bewegung der Partikel (Klassen in elements.css), Farben, Anzahl
  var FX = {
    Normal:   { shape: 'dot',    motion: 'drift',   colors: ['#e4e2cc', '#bdbba0'], n: 18 },
    Fire:     { shape: 'ember',  motion: 'rise',    colors: ['#ffe066', '#ff9a2e', '#ff4f1f'], n: 34 },
    Water:    { shape: 'ring',   motion: 'rise',    colors: ['#cdeaff', '#86c4ff'], n: 22, slow: 1.6 },
    Electric: { shape: 'spark',  motion: 'zap',     colors: ['#fff6a0', '#ffd800'], n: 18 },
    Grass:    { shape: 'leaf',   motion: 'fall',    colors: ['#a4e47a', '#63c149', '#3f9a33'], n: 22, slow: 1.3 },
    Ice:      { shape: 'flake',  motion: 'fall',    colors: ['#ffffff', '#cdf2fa'], n: 28, slow: 1.8 },
    Fighting: { shape: 'burst',  motion: 'pulse',   colors: ['#ffc0a0', '#ff6a4a'], n: 10 },
    Poison:   { shape: 'bubble', motion: 'rise',    colors: ['#da9cf4', '#a650d6'], n: 20, slow: 1.4 },
    Ground:   { shape: 'px',     motion: 'dust',    colors: ['#e6c47a', '#b8954f', '#8a6c36'], n: 30 },
    Flying:   { shape: 'streak', motion: 'wind',    colors: ['#eef5ff', '#bcd6ff'], n: 16 },
    Psychic:  { shape: 'ring',   motion: 'pulse',   colors: ['#ffa6c8', '#ff5a94'], n: 10 },
    Bug:      { shape: 'glow',   motion: 'wander',  colors: ['#e6f480', '#b6d636'], n: 18 },
    Rock:     { shape: 'chunk',  motion: 'fall',    colors: ['#d4bf82', '#a68f55', '#7c6c3c'], n: 14, slow: 1.5 },
    Ghost:    { shape: 'wisp',   motion: 'float',   colors: ['#c8b2f4', '#9274d0'], n: 14 },
    Dragon:   { shape: 'scale',  motion: 'swirl',   colors: ['#a896ff', '#6c52f2', '#ffd27a'], n: 22 },
    Dark:     { shape: 'wisp',   motion: 'drift',   colors: ['#6e5c88', '#3a2f4c'], n: 18 },
    Steel:    { shape: 'star',   motion: 'twinkle', colors: ['#ffffff', '#cfd3e6'], n: 16 },
    Fairy:    { shape: 'star',   motion: 'float',   colors: ['#ffd6f0', '#ff92d4', '#ffffff'], n: 22 }
  };
  // Grundgröße (px) und Dauer (s) je Form bzw. Bewegung
  var SIZE = { dot: 5, px: 5, ember: 5, ring: 12, spark: 16, leaf: 12, flake: 12, burst: 34, bubble: 12, streak: 10, glow: 5, chunk: 12, wisp: 26, scale: 10, star: 14 };
  var TIME = { rise: 7, fall: 9, float: 12, swirl: 9, wind: 3.2, dust: 6, drift: 7, zap: 3, pulse: 3.4, twinkle: 3, wander: 8 };
  var EDGE = { rise: 'bottom', float: 'bottom', swirl: 'bottom', fall: 'top', wind: 'left', dust: 'left' };

  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var sides = { l: { key: null, el: root.querySelector('.ty-side--l') }, r: { key: null, el: root.querySelector('.ty-side--r') } };
  var fields = { l: root.querySelector('.ty-field--l'), r: root.querySelector('.ty-field--r') };
  var size = 0, data = null;
  // Sichtbarer Anteil je Feld (Rest liegt hinter der Karte) – nur dort entstehen Partikel
  var vis = { l: 1, r: 1 }, painted = { l: 1, r: 1 }, lists = { l: [], r: [] };

  // Wind und Staub wehen auf beiden Seiten zur Mitte: links von links, rechts von rechts
  function particle(fx, side) {
    var p = document.createElement('i');
    var z = SIZE[fx.shape] * rnd(0.6, 1.4);
    var d = TIME[fx.motion] * (fx.slow || 1) * rnd(0.75, 1.3);
    p.className = 'tp tp--' + fx.shape + ' tm--' + fx.motion;
    var edge = EDGE[fx.motion], v = vis[side] * 100;
    p.style.left = (edge === 'left' ? (side === 'r' ? rnd(105, 115) : rnd(-15, -5)) : side === 'r' ? rnd(100 - v, 100) : rnd(0, v)) + '%';
    p.style.top = (edge === 'bottom' ? rnd(100, 108) : edge === 'top' ? rnd(-12, -4) : fx.motion === 'dust' ? rnd(45, 100) : rnd(4, 96)) + '%';
    p.style.setProperty('--c', fx.colors[Math.floor(Math.random() * fx.colors.length)]);
    p.style.setProperty('--z', z.toFixed(1) + 'px');
    p.style.setProperty('--dx', rnd(-60, 60).toFixed(0) + 'px');
    p.style.setProperty('--dy', rnd(-50, 50).toFixed(0) + 'px');
    p.style.setProperty('--r', rnd(-360, 360).toFixed(0) + 'deg');
    p.style.animationDuration = d.toFixed(2) + 's';
    p.style.animationDelay = (-Math.random() * d).toFixed(2) + 's';
    return p;
  }

  // Atmosphäre einer Seite: Hintergrund aus den Typfarben, Partikel je Typ (bei zwei Typen je die Hälfte)
  function paintField(side, list) {
    var f = fields[side];
    lists[side] = list;
    painted[side] = vis[side];
    f.textContent = '';
    f.style.setProperty('--c1', list[0] ? list[0].color : '#6a6a70');
    f.style.setProperty('--c2', list[1] ? list[1].color : list[0] ? list[0].color : '#6a6a70');
    f.classList.toggle('is-empty', !list.length);
    var frag = document.createDocumentFragment();
    (list.length ? list : [{ type: 'Normal' }]).forEach(function (t) {
      var fx = FX[t.type] || FX.Normal;
      var n = Math.round(fx.n * (list.length > 1 ? 0.6 : 1) * (list.length ? 1 : 0.5));
      for (var i = 0; i < n; i++) frag.appendChild(particle(fx, side));
    });
    f.appendChild(frag);
  }

  // Kurze Partikel-Explosion aus dem Symbol, wenn ein Typ neu gewählt wird
  function burst(side, list) {
    var badge = sides[side].el.querySelector('.ty-badge');
    if (!badge || !size || !list.length) return;
    var r = badge.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2;
    list.forEach(function (t) {
      var fx = FX[t.type] || FX.Normal;
      for (var i = 0; i < 14; i++) {
        var p = document.createElement('i');
        var a = Math.random() * Math.PI * 2, dist = rnd(0.6, 1.3) * size;
        p.className = 'tp tp--' + fx.shape + ' tp-burst';
        p.style.left = cx + 'px';
        p.style.top = cy + 'px';
        p.style.setProperty('--c', fx.colors[i % fx.colors.length]);
        p.style.setProperty('--z', (SIZE[fx.shape] * rnd(0.7, 1.2)).toFixed(1) + 'px');
        p.style.setProperty('--bx', (Math.cos(a) * dist).toFixed(0) + 'px');
        p.style.setProperty('--by', (Math.sin(a) * dist).toFixed(0) + 'px');
        document.body.appendChild(p);
        setTimeout(function (n) { return function () { n.remove(); }; }(p), 800);
      }
    });
  }

  function renderSide(side, list, label, extra) {
    var s = sides[side];
    var key = list.map(function (t) { return t.type; }).join('/');
    var changed = key !== s.key;
    if (changed) paintField(side, list);
    s.el.classList.toggle('is-empty', !list.length);
    s.el.querySelector('.ty-badges').innerHTML = list.map(function (t) {
      return '<span class="ty-badge" style="--tc:' + t.color + '">' + data.icon(t.type, list.length > 1 ? Math.round(size * 0.72) : size) + '</span>';
    }).join('');
    s.el.querySelector('.ty-role').textContent = label;
    s.el.querySelector('.ty-names').textContent = list.map(function (t) { return t.name; }).join(' / ');
    if (extra) extra(s.el);
    if (changed && s.key !== null) burst(side, list);
    s.key = key;
  }

  function update(d) {
    data = d;
    renderSide('l', d.atk ? [d.atk] : [], d.labels.atk);
    renderSide('r', d.defs, d.labels.def, function (el) {
      var m = el.querySelector('.ty-mult');
      m.className = 'ty-mult ' + (d.mult == null ? '' : d.multCls);
      m.innerHTML = d.mult == null ? '' : '<b>' + d.multLabel + '</b><span>' + d.multText + '</span>';
    });
    // Wirkung als Takt zwischen beiden Seiten: stark, abgeblockt, Barriere oder nichts
    root.dataset.hit = d.mult == null ? '' : d.mult > 1 ? 'strong' : d.mult === 0 ? 'immune' : d.mult < 1 ? 'weak' : 'neutral';
  }

  // ── Größe nach dem Platz neben der Karte: Symbol groß, mittel oder nur die Atmosphäre ──
  function layout() {
    var b = HubScene.beside(card), strip = b.strip - 24;
    var next = strip >= 400 ? 190 : strip >= 240 ? 130 : 0;
    root.style.setProperty('--cl', b.cl + 'px');
    root.style.setProperty('--cr', b.cr + 'px');
    root.style.setProperty('--sw', Math.max(0, strip) + 'px');
    root.style.setProperty('--es', (next || 130) + 'px');
    // Jedes Feld ist eine Bildschirmhälfte; Licht und Partikel sitzen im sichtbaren Teil neben der Karte
    var half = Math.max(1, window.innerWidth / 2);
    vis.l = Math.min(1, Math.max(0.05, (b.left + 40) / half));
    vis.r = Math.min(1, Math.max(0.05, (b.right + 40) / half));
    root.style.setProperty('--gxl', vis.l * 50 + '%');
    root.style.setProperty('--gxr', 100 - vis.r * 50 + '%');
    root.classList.toggle('is-tight', !next);
    ['l', 'r'].forEach(function (s) { if (Math.abs(vis[s] - painted[s]) > 0.1) paintField(s, lists[s]); });
    if (next !== size) { size = next; if (data) update(data); }
  }

  layout();
  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(card);

  return { update: update };
})();
