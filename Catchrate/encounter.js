/*
 * „Wilde Begegnung“ hinter dem Fangrate-Rechner: die Umgebung folgt den Bedingungen (Wald, bei „Dunkel / Höhle“
 * eine Höhle, bei „Tauchen“ oder „Angeln“ unter Wasser). Rechts neben der Karte steht das gewählte wilde Pokémon
 * mit KP-Kasten wie im Kampf (KP, Level, Status), links der Ball, den man gerade werfen würde – mit „Werfen!“
 * fliegt er über die Karte, und das Pokémon wird mit der berechneten Wahrscheinlichkeit gefangen oder bricht aus.
 * Farben und Aussehen: encounter.css. Pixel-Helfer: scene.js (HubScene).
 *
 *   CatchScene.update(data)  – nach jeder Neuberechnung (main.js, renderBallGrid):
 *     { mon: { id, sprite, name } | null, level, hp (1–100), status, env: 'forest'|'cave'|'sea', formulaGen,
 *       balls: [{ id, name, sprite, prob, label, color }] (beste zuerst), selected: Ball-ID | null }
 *   CatchScene.preview(ballId)  – Ball beim Drüberfahren über eine Ball-Karte in die Hand nehmen (null = zurück)
 */
window.CatchScene = (function () {
  'use strict';

  var ITEMS = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/';
  var root = document.getElementById('enc');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {}, preview: function () {} };

  var TR = {
    de: {
      throw: 'Werfen!', appear: 'Ein wildes {mon} erscheint!', use: 'Du setzt {ball} ein!',
      caught: 'Toll! {mon} wurde gefangen!',
      free: ['Oh nein! {mon} hat sich sofort befreit!', 'Mist! {mon} hat sich befreit!', 'Argh! Das war fast!', 'Nein! So knapp!'],
      tally: 'Würfe: {n} · gefangen: {c}', hp: 'KP',
      status: { sleep: 'SLF', freeze: 'GFR', paralysis: 'PAR', poison: 'GIF', burn: 'BRT' }
    },
    en: {
      throw: 'Throw!', appear: 'A wild {mon} appeared!', use: 'You used {ball}!',
      caught: 'Gotcha! {mon} was caught!',
      free: ['Oh no! {mon} broke free right away!', 'Darn! {mon} broke free!', 'Argh! Almost had it!', 'Gah! So close!'],
      tally: 'Throws: {n} · caught: {c}', hp: 'HP',
      status: { sleep: 'SLP', freeze: 'FRZ', paralysis: 'PAR', poison: 'PSN', burn: 'BRN' }
    }
  };
  var tr = function () { return TR[window.LANG] || TR.de; };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };

  // ── Pixel-Kacheln der Umgebungen ──────────────────────────────────────────

  // Baumstämme (Kachel wiederholt sich auch nach unten): l = Licht links, b = Rinde, o = Schatten und Furchen
  function trunkRows(w, h, trunks) {
    var rows = [];
    for (var y = 0; y < h; y++) {
      var row = '';
      for (var x = 0; x < w; x++) {
        var c = '.';
        trunks.forEach(function (t) {
          var i = x - t[0];
          if (i < 0 || i >= t[1]) return;
          c = i === 0 ? 'l' : i >= t[1] - 2 ? 'o' : (i > 1 && (y + t[0] + i * 3) % 7 === 0) ? 'o' : 'b';
        });
        row += c;
      }
      rows.push(row);
    }
    return rows;
  }

  // Tropfsteine von oben: spitze Zapfen [x, halbe Breite, Länge], links im Licht, rechts im Schatten
  function stalactiteRows(w, h, spikes) {
    var depth = [];
    for (var x = 0; x < w; x++) {
      var d = 3;
      spikes.forEach(function (s) {
        var dx = Math.abs(x + 0.5 - s[0]);
        dx = Math.min(dx, w - dx);
        if (dx < s[1]) d = Math.max(d, Math.round(s[2] * (1 - dx / s[1])));
      });
      depth.push(d);
    }
    var rows = [];
    for (var y = 0; y < h; y++) {
      var row = '';
      for (x = 0; x < w; x++) {
        var inside = function (xx) { return y < depth[(xx + w) % w]; };
        row += !inside(x) ? '.' : !inside(x - 1) ? 'l' : !inside(x + 1) || (y < 4 && (x + y) % 2 === 0) ? 'o' : 'b';
      }
      rows.push(row);
    }
    return rows;
  }

  // Seetang: wellige Halme [x, Versatz, Höhe] vom Boden nach oben, mit ein paar hellen Blättchen
  function kelpRows(w, h, strands) {
    var grid = [];
    for (var y = 0; y < h; y++) grid.push(new Array(w + 1).join('.').split(''));
    strands.forEach(function (s) {
      for (var y = h - s[2]; y < h; y++) {
        var x = s[0] + Math.round(1.6 * Math.sin((y + s[1] * 3) / 3.2));
        grid[y][(x + w) % w] = 'b';
        grid[y][(x + 1 + w) % w] = (y + s[1]) % 3 === 0 ? 'o' : 'b';
        if ((y + s[1]) % 6 === 0) grid[y][(x - 1 + w) % w] = 'l';
      }
    });
    return grid.map(function (r) { return r.join(''); });
  }

  // Kachel als wiederholtes Muster in ein <svg>; repeatY: auch nach unten (Stämme), flip: auf den Kopf (Blätterdach)
  var TONES = { l: 'x-hi', b: 'x-base', o: 'x-dark' };
  function tile(svg, id, rows, scale, opts) {
    if (!svg) return;
    opts = opts || {};
    if (opts.flip) rows = rows.slice().reverse();
    var w = rows[0].length, h = rows.length;
    svg.innerHTML =
      '<defs><pattern id="' + id + '" width="' + w + '" height="' + h + '" patternUnits="userSpaceOnUse" patternTransform="translate(' + ((opts.shift || 0) * scale) + ' 0) scale(' + scale + ')">' +
        HubScene.pixels(rows, TONES) + '</pattern></defs>' +
      '<rect width="100%" height="' + (opts.repeatY ? '100%' : h * scale) + '" fill="url(#' + id + ')"/>';
  }

  function paint() {
    var q = function (s) { return root.querySelector(s); };
    // Wald
    tile(q('.enc-forest .enc-canopy'), 'enc-canopy', HubScene.ridge(64, 16, [[5, 7, 13], [15, 6, 10], [24, 8, 15], [35, 6, 11], [44, 7, 14], [54, 6, 10], [61, 5, 12]], 4), 5, { flip: true });
    tile(q('.enc-forest .enc-trunks--far'), 'enc-trunks-far', trunkRows(96, 14, [[8, 5], [37, 4], [70, 6]]), 3, { repeatY: true });
    tile(q('.enc-forest .enc-trunks--near'), 'enc-trunks-near', trunkRows(96, 14, [[22, 9], [74, 7]]), 5, { repeatY: true, shift: 30 });
    tile(q('.enc-forest .enc-edge'), 'enc-edge-forest', HubScene.ridge(48, 10, [[3, 2, 6], [9, 3, 7], [14, 2, 5], [20, 3, 8], [27, 2, 6], [32, 3, 7], [38, 2, 5], [44, 3, 8]], 3), 4);
    // Höhle
    tile(q('.enc-cave .enc-stalactites'), 'enc-stal', stalactiteRows(64, 22, [[5, 4, 14], [14, 3, 9], [22, 5, 20], [33, 3, 11], [41, 4, 16], [50, 3, 8], [58, 4, 13]]), 5);
    tile(q('.enc-cave .enc-edge'), 'enc-edge-cave', HubScene.ridge(56, 12, [[6, 6, 9], [20, 4, 6], [31, 7, 10], [45, 5, 7]], 3), 5);
    // Unter Wasser
    tile(q('.enc-sea .enc-kelp'), 'enc-kelp', kelpRows(72, 40, [[10, 0, 34], [16, 3, 24], [44, 1, 38], [52, 5, 20], [63, 2, 30]]), 4);
    tile(q('.enc-sea .enc-edge'), 'enc-edge-sea', HubScene.ridge(64, 8, [[8, 10, 5], [30, 12, 6], [52, 9, 5]], 2), 4);
    var bubbles = q('.enc-bubbles');
    for (var i = 0; i < 14; i++) {
      var b = document.createElement('i');
      b.style.left = ((i * 37) % 100) + '%';
      b.style.animationDuration = (9 + (i * 7) % 8) + 's';
      b.style.animationDelay = (-i * 1.3) + 's';
      b.style.setProperty('--size', (4 + (i % 3) * 3) + 'px');
      bubbles.appendChild(b);
    }
  }

  // ── Figuren: wildes Pokémon mit KP-Kasten (rechts), Ball in der Hand (links) ──

  var el = {
    monBox: root.querySelector('.enc-mon'),
    mon: root.querySelector('.enc-mon img'),
    name: root.querySelector('.enc-name'),
    lv: root.querySelector('.enc-lv'),
    status: root.querySelector('.enc-status'),
    hpLabel: root.querySelector('.enc-hp i'),
    hpFill: root.querySelector('.enc-hp-fill'),
    msg: root.querySelector('.enc-msg'),
    hand: root.querySelector('.enc-hand'),
    ball: root.querySelector('.enc-hand img'),
    ballName: root.querySelector('.enc-ball-name'),
    ballProb: root.querySelector('.enc-ball-prob'),
    btn: root.querySelector('.enc-throw'),
    tally: root.querySelector('.enc-tally')
  };

  var state = null, monUrl = '', preview = null, busy = false, scale = 0;
  var throws = 0, catches = 0;

  function say(text) { el.msg.textContent = text; el.msg.hidden = !text; }

  // Ball in der Hand: Vorschau beim Drüberfahren, sonst der gewählte, sonst der beste (außer Meisterball)
  function handBall() {
    if (!state || !state.balls.length) return null;
    var find = function (id) { return state.balls.filter(function (b) { return b.id === id; })[0]; };
    return find(preview) || find(state.selected) || state.balls.filter(function (b) { return b.id !== 'master'; })[0] || state.balls[0];
  }

  function renderHand() {
    var b = handBall();
    root.classList.toggle('has-ball', !!b);
    if (!b) return;
    if (el.ball.dataset.id !== b.id) { el.ball.dataset.id = b.id; el.ball.src = ITEMS + b.sprite + '.png'; }
    el.ballName.textContent = b.name;
    el.ballProb.textContent = b.label;
    el.ballProb.style.color = b.color;
    el.btn.textContent = tr().throw;
    el.btn.disabled = busy || !state.mon;
    el.tally.textContent = throws ? fill(tr().tally, { n: throws, c: catches }) : '';
  }

  function setMon(mon) {
    var url = mon ? HubScene.monSprite(mon.id, mon.sprite) : '';
    if (url === monUrl) return;
    monUrl = url;
    throws = catches = 0;
    root.classList.remove('has-mon', 'is-appearing');
    if (!mon) { say(''); return; }
    var img = el.mon;
    img.crossOrigin = 'anonymous';
    img.onload = function () {
      if (monUrl !== url) return;
      // Box so hoch wie das Pokémon selbst (ohne leeren Rand) – dann sitzt der KP-Kasten direkt über dem Kopf
      var b = HubScene.bounds(img) || { top: 12, bottom: 8 };
      el.monBox.style.setProperty('--nw', img.naturalWidth);
      el.monBox.style.setProperty('--nh', img.naturalHeight - b.top - b.bottom);
      el.monBox.style.setProperty('--feet', b.bottom);
      root.classList.add('has-mon');
      void el.monBox.offsetWidth;
      root.classList.add('is-appearing');
      say(fill(tr().appear, { mon: mon.name }));
    };
    img.onerror = function () {
      if (!img.crossOrigin) return;
      img.removeAttribute('crossorigin');
      img.src = url;
    };
    img.src = url;
  }

  function update(data) {
    state = data;
    setMon(data.mon);
    if (data.mon) {
      el.name.textContent = data.mon.name;
      el.lv.textContent = 'Lv' + data.level;
      var st = tr().status[data.status];
      el.status.textContent = st || '';
      el.status.hidden = !st;
      el.hpLabel.textContent = tr().hp;
      el.hpFill.style.width = Math.max(1, data.hp) + '%';
      el.hpFill.dataset.zone = data.hp > 50 ? 'ok' : data.hp > 20 ? 'mid' : 'low';
    }
    root.dataset.env = data.env;
    root.dataset.status = data.mon ? data.status : 'none';
    renderHand();
  }

  function setPreview(id) {
    if (preview === id) return;
    preview = id;
    if (!busy) renderHand();
  }

  // ── Probewurf ─────────────────────────────────────────────────────────────
  // Wie im Spiel: mehrere Prüfungen hintereinander (Gen 3/4 und 6+: 4, Gen 5: 3), jede mit der gleichen Chance –
  // zusammen genau die berechnete Fangchance. Jede bestandene Prüfung = ein Wackeln (höchstens 3).
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, reduced ? 0 : ms); }); };
  var play = function (node, frames, opts) {
    if (reduced) return Promise.resolve();
    return node.animate(frames, opts).finished.catch(function () {});
  };
  var center = function (r) { return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; };

  function roll(p, gen) {
    var checks = gen === 5 ? 3 : 4;
    var q = p >= 1 ? 1 : Math.pow(Math.max(0, p), 1 / checks);
    var passed = 0;
    while (passed < checks && Math.random() < q) passed++;
    return { caught: passed === checks, wobbles: Math.min(3, passed) };
  }

  async function throwBall() {
    var ball = handBall();
    if (busy || !state || !state.mon || !ball || !scale) return;
    busy = true;
    renderHand();
    var mon = state.mon, result = roll(ball.prob, state.formulaGen);
    say(fill(tr().use, { ball: ball.name }));

    // Flug in hohem Bogen vom linken Rand über die Karte zum Pokémon (Ebene über der Karte)
    var from = center(el.ball.getBoundingClientRect());
    var to = center(el.mon.getBoundingClientRect());
    var floor = el.monBox.getBoundingClientRect().bottom - 4;
    var big = 30 * (scale + 1), small = 30 * Math.max(1, scale - 1);
    var fly = document.createElement('img');
    fly.className = 'enc-fly';
    fly.src = el.ball.src;
    fly.alt = '';
    fly.style.width = fly.style.height = big + 'px';
    document.body.appendChild(fly);
    root.classList.add('is-throwing');
    var lift = Math.max(140, window.innerHeight * 0.28), frames = [];
    for (var i = 0; i <= 24; i++) {
      var t = i / 24;
      var x = from.x + (to.x - from.x) * t, y = from.y + (to.y - from.y) * t - 4 * lift * t * (1 - t);
      var k = 1 + (small / big - 1) * t;
      frames.push({ transform: 'translate(' + (x - big / 2) + 'px,' + (y - big / 2) + 'px) rotate(' + (t * 900) + 'deg) scale(' + k + ')' });
    }
    await play(fly, frames, { duration: 1000, easing: 'linear', fill: 'forwards' });

    // Treffer: das Pokémon wird zu Licht und verschwindet im Ball, der fällt zu Boden
    var at = function (x, y, rot) { return { transform: 'translate(' + (x - big / 2) + 'px,' + (y - big / 2) + 'px) rotate(' + (rot || 0) + 'deg) scale(' + small / big + ')' }; };
    var groundY = floor - small / 2;
    root.classList.add('is-absorbed');
    await play(el.monBox, [{ filter: 'brightness(1) invert(0)', opacity: 1, scale: '1' }, { filter: 'brightness(0) invert(1)', opacity: 1, scale: '1', offset: 0.35 }, { filter: 'brightness(0) invert(1)', opacity: 0, scale: '0.1' }], { duration: 420, easing: 'ease-in' });
    await play(fly, [at(to.x, to.y), at(to.x, groundY), at(to.x, groundY - 14 * scale), at(to.x, groundY)], { duration: 520, easing: 'ease-in', fill: 'forwards' });
    if (reduced) fly.style.transform = at(to.x, groundY).transform;

    // Wackeln
    for (var w = 0; w < result.wobbles; w++) {
      await wait(380);
      await play(fly, [at(to.x, groundY, 0), at(to.x, groundY, -24), at(to.x, groundY, 18), at(to.x, groundY, 0)], { duration: 560, easing: 'ease-in-out', fill: 'forwards' });
    }
    await wait(420);
    throws++;
    if (result.caught) {
      catches++;
      fly.classList.add('is-caught');
      stars(to.x, groundY);
      say(fill(tr().caught, { mon: mon.name }));
      await wait(1900);
      await play(fly, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, fill: 'forwards' });
    } else {
      flash(to.x, groundY);
      say(fill(tr().free[result.wobbles], { mon: mon.name }));
    }
    fly.remove();
    // Zurück auf die Wiese – es ist ja nur ein Probewurf
    root.classList.remove('is-absorbed', 'is-throwing');
    await play(el.monBox, [{ filter: 'brightness(0) invert(1)', scale: '0.2' }, { filter: 'brightness(0) invert(1)', scale: '1.06', offset: 0.6 }, { filter: 'brightness(1) invert(0)', scale: '1' }], { duration: 380, easing: 'ease-out' });
    busy = false;
    renderHand();
  }

  function flash(x, y) {
    var f = document.createElement('i');
    f.className = 'enc-flash';
    f.style.left = x + 'px';
    f.style.top = y + 'px';
    document.body.appendChild(f);
    setTimeout(function () { f.remove(); }, 500);
  }
  function stars(x, y) {
    [-1, 0, 1].forEach(function (d) {
      var s = document.createElement('i');
      s.className = 'enc-star';
      s.style.left = x + 'px';
      s.style.top = y + 'px';
      s.style.setProperty('--dx', (d * 46 * Math.max(1, scale - 1)) + 'px');
      s.style.setProperty('--dy', (-(d ? 34 : 52) * Math.max(1, scale - 1)) + 'px');
      document.body.appendChild(s);
      setTimeout(function () { s.remove(); }, 1200);
    });
  }

  // ── Größe nach dem Platz neben der Karte: Pokémon 3- oder 2-fach, sonst nur die Umgebung ──
  function layout() {
    var b = HubScene.beside(card), strip = b.strip - 24;
    scale = strip >= 400 ? 3 : strip >= 240 ? 2 : 0;
    root.style.setProperty('--s', scale || 2);
    root.style.setProperty('--sw', Math.max(0, strip) + 'px');
    root.style.setProperty('--cl', b.cl + 'px');
    root.style.setProperty('--cr', b.cr + 'px');
    root.classList.toggle('is-tight', !scale);
    if (state) renderHand();
  }

  paint();
  el.btn.addEventListener('click', throwBall);
  // Nach dem Auftauchen die Animation lösen – sonst hält sie das Pokémon sichtbar, wenn es im Ball verschwindet
  el.monBox.addEventListener('animationend', function (e) {
    if (e.animationName === 'enc-appear') root.classList.remove('is-appearing');
  });
  layout();
  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(card);

  return { update: update, preview: setPreview };
})();
