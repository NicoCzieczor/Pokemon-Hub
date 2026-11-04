/*
 * „Ordenkoffer & Herausforderer“ hinter dem Boss-Planer: Die Seite ist die Arena des gewählten Kampfes – Licht und
 * Boden in der Farbe des stärksten Pokémon des Gegners. Links liegt der Ordenkoffer aus Platin, wie im Spiel: die
 * acht Orden in ihren Mulden (verdiente blank und ab und zu glitzernd, fehlende leer; ohne Spielstand angestaubt),
 * über einen Orden fahren = polieren, ein Klick wählt den Kampf; darunter der Arenaleiter dazu. Rechts tritt der
 * gewählte Gegner auf: „!“ wie im Spiel, wenn ein Trainer dich entdeckt, dahinter ragt sein stärkstes Pokémon auf,
 * darunter seine Bälle und das Level-Cap.
 * Farben und Aussehen: boss.css; Koffer, Orden und Glitzern: sprites/ (tools/build-badges.py). Platz neben der
 * Karte: scene.js (HubScene.beside).
 *
 *   BossScene.update(data)  – nach jedem Zeichnen des Kampfes (app.js, updateScene):
 *     { fight, title, place, cap, sprite, party, ace: { species, name, type } | null,
 *       leaders: [{ id, name, sprite, earned: true|false|null }] × 8, next, pick: id => … }
 */
window.BossScene = (function () {
  'use strict';

  var PLAT = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/platinum/';
  var BALL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
  var root = document.getElementById('bs');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {} };

  var TR = {
    de: { earned: '{n} / 8 Orden', noSave: 'Mit Spielstand glänzen deine Orden', cap: 'Level-Cap', next: 'Als Nächstes', pick: 'Kampf gegen {n} zeigen' },
    en: { earned: '{n} / 8 badges', noSave: 'Load a save to make your badges shine', cap: 'Level cap', next: 'Up next', pick: 'Show the battle against {n}' }
  };
  var tr = function () { return TR[document.documentElement.lang] || TR.de; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // Typfarben in der Reihenfolge der Typ-Nummern aus dem Spiel (wie im Save-Editor)
  var TYPE_HEX = ['#bbbbaa', '#bb5544', '#96caff', '#9553cd', '#a67439', '#bbaa66', '#92c12a', '#6e4370', '#aaaabb',
    '#ff421c', '#2c9be3', '#62bc5a', '#ffdc00', '#ff6380', '#74cfc0', '#5670be', '#4e4545', '#ec8fe6'];

  // Ordenkoffer (sprites/case.png, 256 × 181 Bildpunkte des DS): Lage der Orden [x, y, Breite, Höhe] und ihres
  // Glitzerns [x, y] wie im Spiel (Werte aus tools/build-badges.py) – Kohle, Wald, Pflaster, Sumpf, Relikt, Mine, Firn, Leuchtfeuer.
  // Omega Rubin / Alpha Saphir (tools/build-badges-oras.py, 38 × 38): dieselben Mulden – Stein, Knöchel, Dynamo, Hitze,
  // Balance, Feder, Mental, Schauer.
  var CASE_W = 256, CASE_H = 181;
  var SETS = {
    pt: [
      { id: 'coal', at: [25, 30, 38, 38], sp: [24, 29] }, { id: 'forest', at: [80, 31, 40, 37], sp: [80, 29] },
      { id: 'cobble', at: [136, 29, 40, 40], sp: [136, 29] }, { id: 'fen', at: [193, 30, 38, 38], sp: [192, 29] },
      { id: 'relic', at: [24, 88, 40, 36], sp: [24, 85] }, { id: 'mine', at: [81, 86, 38, 38], sp: [80, 85] },
      { id: 'icicle', at: [137, 87, 38, 37], sp: [136, 85] }, { id: 'beacon', at: [194, 86, 36, 38], sp: [192, 85] }
    ],
    oras: [
      { id: 'stone', at: [25, 30, 38, 38], sp: [24, 29] }, { id: 'knuckle', at: [81, 30, 38, 38], sp: [80, 29] },
      { id: 'dynamo', at: [137, 30, 38, 38], sp: [136, 29] }, { id: 'heat', at: [193, 30, 38, 38], sp: [192, 29] },
      { id: 'balance', at: [25, 87, 38, 38], sp: [24, 85] }, { id: 'feather', at: [81, 86, 38, 38], sp: [80, 85] },
      { id: 'mind', at: [137, 86, 38, 38], sp: [136, 85] }, { id: 'rain', at: [193, 86, 38, 38], sp: [192, 85] }
    ]
  };
  var set = 'pt', BADGES = SETS.pt;
  // Glitzern: kleines (zwei Sterne, 32 px, 4 Bilder à 8 Ticks) taucht ab und zu auf einem blanken Orden auf, großes
  // (vier Sterne, 64 px, 4 Bilder à 4 Ticks, 8 px weiter links) beim Polieren und auf dem gewählten Kampf
  var badgeHtml = function (b, i) {
    var a = b.at, dx = b.sp[0] - a[0], dy = b.sp[1] - a[1];
    return '<button type="button" tabindex="-1" class="bs-badge" data-i="' + i + '" style="--x:' + a[0] + ';--y:' + a[1] + ';--w:' + a[2] + ';--h:' + a[3] + '">' +
      '<img class="bs-gem" alt="">' +
      '<i class="bs-spark bs-spark--2" style="--dx:' + dx + ';--dy:' + dy + '"><img alt="" src="sprites/sparkle2.png"></i>' +
      '<i class="bs-spark bs-spark--4" style="--dx:' + (dx - 8) + ';--dy:' + dy + '"><img alt="" src="sprites/sparkle4.png"></i></button>';
  };

  root.innerHTML =
    '<div class="bs-arena" aria-hidden="true"><i class="bs-light"></i><i class="bs-floor"></i><i class="bs-ring"></i></div>' +
    '<div class="bs-case"><div class="bs-ds">' + BADGES.map(badgeHtml).join('') + '</div>' +
      '<div class="bs-info"><img class="bs-leader" alt=""><span><b class="bs-lname"></b><small class="bs-case-sub"></small></span></div></div>' +
    '<div class="bs-foe"><img class="bs-ace" alt=""><span class="bs-bang">!</span><img class="bs-trainer" alt="">' +
      '<div class="bs-plate"><b class="bs-title"></b><small class="bs-place"></small><span class="bs-balls"></span><span class="bs-cap"></span></div></div>';
  var el = {
    kase: root.querySelector('.bs-case'), badges: root.querySelectorAll('.bs-badge'),
    leader: root.querySelector('.bs-leader'), lname: root.querySelector('.bs-lname'), sub: root.querySelector('.bs-case-sub'),
    foe: root.querySelector('.bs-foe'), ace: root.querySelector('.bs-ace'), trainer: root.querySelector('.bs-trainer'),
    fTitle: root.querySelector('.bs-title'), place: root.querySelector('.bs-place'), balls: root.querySelector('.bs-balls'), cap: root.querySelector('.bs-cap')
  };

  var data = null, lastFight = undefined, hover = -1, polished = {};
  el.ace.addEventListener('error', function () { if (el.ace.dataset.fb && el.ace.src !== el.ace.dataset.fb) el.ace.src = el.ace.dataset.fb; });
  var still = window.matchMedia('(prefers-reduced-motion: reduce)');

  // Koffer in ganzzahliger Vergrößerung (Pixel bleiben gleich groß) und auf ganzen Pixeln, sonst wird er unscharf
  function layout() {
    var side = HubScene.beside(card);
    var s = side.strip >= CASE_W * 2 + 40 && window.innerHeight >= CASE_H * 2 + 220 ? 2 : 1;
    root.classList.toggle('is-full', side.strip >= 200);
    root.classList.toggle('is-bare', side.strip < 200);
    root.style.setProperty('--cl', side.cl + 'px');
    root.style.setProperty('--cr', side.cr + 'px');
    root.style.setProperty('--strip', side.strip + 'px');
    root.style.setProperty('--k', side.strip >= 560 ? 3 : 2);
    root.style.setProperty('--s', s);
    el.kase.style.left = Math.round(side.cl - CASE_W * s / 2) + 'px';
    el.kase.style.top = Math.round((window.innerHeight - el.kase.offsetHeight) / 2) + 'px';
  }

  function render() {
    var t = tr(), d = data;
    if (!d) return;
    // Anderes Spiel: Orden dieses Spiels in die Mulden legen
    var want = SETS[d.game] ? d.game : 'pt';
    if (want !== set) {
      set = want;
      BADGES = SETS[set];
      polished = {};
      root.querySelector('.bs-ds').innerHTML = BADGES.map(badgeHtml).join('');
      el.badges = root.querySelectorAll('.bs-badge');
    }
    // Ordenkoffer: mit Spielstand blank oder leer, ohne angestaubt (polierte bleiben blank)
    var withSave = d.leaders.some(function (l) { return l.earned !== null; });
    var n = d.leaders.filter(function (l) { return l.earned; }).length;
    el.badges.forEach(function (b, i) {
      var l = d.leaders[i] || {}, clean = withSave ? !!l.earned : !!polished[i];
      var src = 'sprites/badge-' + BADGES[i].id + (clean ? '' : '-dull') + '.png', img = b.querySelector('.bs-gem');
      if (img.getAttribute('src') !== src) img.src = src;
      b.classList.toggle('is-empty', withSave && !l.earned);
      b.classList.toggle('is-clean', clean);
      b.classList.toggle('is-on', l.id != null && l.id === d.fight);
      b.dataset.id = l.id == null ? '' : l.id;
      b.title = l.name ? t.pick.replace('{n}', l.name) : '';
    });
    info();

    // Gegner: Arena in der Farbe seines stärksten Pokémon
    root.style.setProperty('--tc', d.ace ? TYPE_HEX[d.ace.type] || '#8a8aa8' : '#8a8aa8');
    el.fTitle.textContent = d.title || '';
    el.place.textContent = d.place || '';
    el.balls.innerHTML = Array.from({ length: 6 }, function (_, i) { return '<img alt="" src="' + BALL + '"' + (i < d.party ? '' : ' class="is-empty"') + '>'; }).join('');
    el.cap.innerHTML = d.cap ? esc(t.cap) + ' <b>Lv. ' + esc(d.cap) + '</b>' : '';
    if (d.sprite && el.trainer.getAttribute('src') !== d.sprite) el.trainer.src = d.sprite;
    el.trainer.hidden = !d.sprite;
    var aceKey = d.ace && d.ace.form && d.formSprites && d.formSprites[d.ace.species + '-' + d.ace.form];
    var aceSrc = d.ace ? (d.spriteDir || PLAT) + (aceKey || d.ace.species) + '.png' : '';
    // OR/AS: 3D-Renderbild (weich skaliert); fehlt es, das ORAS-Sprite
    el.ace.classList.toggle('is-3d', !!d.spriteFallback);
    el.ace.dataset.fb = d.ace && d.spriteFallback ? d.spriteFallback + (aceKey || d.ace.species) + '.png' : '';
    if (aceSrc && el.ace.getAttribute('src') !== aceSrc) el.ace.src = aceSrc;
    el.ace.hidden = !aceSrc;

    // Neuer Kampf: Gegner tritt auf, „!“ springt
    if (d.fight !== lastFight) {
      lastFight = d.fight;
      el.foe.classList.remove('is-in');
      void el.foe.offsetWidth;
      el.foe.classList.add('is-in');
    }
  }

  // Unter dem Koffer: Arenaleiter des Ordens unter der Maus, sonst des gewählten oder des nächsten Kampfes
  function info() {
    var t = tr(), d = data, ls = d.leaders;
    var at = function (id) { for (var i = 0; i < ls.length; i++) if (ls[i].id != null && ls[i].id === id) return i; return -1; };
    var i = hover >= 0 ? hover : at(d.fight) >= 0 ? at(d.fight) : at(d.next);
    var l = ls[i] || null, withSave = ls.some(function (x) { return x.earned !== null; });
    var count = withSave ? t.earned.replace('{n}', ls.filter(function (x) { return x.earned; }).length) : t.noSave;
    el.lname.textContent = l ? l.name : '';
    el.sub.textContent = l && d.next != null && l.id === d.next ? t.next + ' · ' + count : count;
    if (l && l.sprite && el.leader.getAttribute('src') !== l.sprite) el.leader.src = l.sprite;
    el.leader.hidden = !(l && l.sprite);
  }

  // Polieren: über einem Orden glitzert er (ohne Spielstand wird er dabei blank); Klick wählt den Kampf
  root.addEventListener('mouseover', function (e) {
    var b = e.target.closest('.bs-badge');
    if (!b) return;
    var i = +b.dataset.i;
    if (i !== hover) { hover = i; if (data) info(); }
    if (!b.classList.contains('is-empty')) b.classList.add('is-polish');
    if (data && !polished[i] && !b.classList.contains('is-clean') && !b.classList.contains('is-empty')) { polished[i] = true; render(); }
  });
  root.addEventListener('mouseout', function (e) {
    var b = e.target.closest('.bs-badge');
    if (!b || b.contains(e.relatedTarget)) return;
    b.classList.remove('is-polish');
    hover = -1;
    if (data) info();
  });
  root.addEventListener('click', function (e) {
    var b = e.target.closest('.bs-badge');
    if (b && b.dataset.id !== '' && data && data.pick) data.pick(+b.dataset.id);
  });

  // Ab und zu glitzert einer der blanken Orden kurz auf (wie im Spiel)
  function twinkle() {
    setTimeout(twinkle, 900 + Math.random() * 1500);
    if (document.hidden || still.matches || root.classList.contains('is-bare')) return;
    var shiny = [].filter.call(el.badges, function (b) { return b.classList.contains('is-clean') && !b.classList.contains('is-empty'); });
    var b = shiny[Math.floor(Math.random() * shiny.length)];
    if (!b || b.classList.contains('is-twinkle')) return;
    b.classList.add('is-twinkle');
    setTimeout(function () { b.classList.remove('is-twinkle'); }, 560);
  }
  setTimeout(twinkle, 1200);

  var raf = 0;
  function update(d) {
    data = d;
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; render(); layout(); });
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); });
  layout();

  return { update: update };
})();
