/*
 * Pokédex-Gerät um den Pokédex: die Seite ist das Gehäuse, die Karte sein Bildschirm.
 * Links die Linse mit drei Lämpchen, die Größen-Anzeige (Pokémon maßstabsgetreu neben einem Trainer, beim Laden
 * wird es eingescannt) und das Steuerkreuz (◀ ▶ = vorige/nächste Nummer) mit Shiny- und Zufalls-Taste.
 * Der Trainer ist Lucas oder Lucia aus Platin (Klick auf ihn wechselt, wird gemerkt).
 * Rechts die Nummern-Anzeige mit Lautsprecher (spielt den Ruf, die Anzeige zeigt die Welle), die Gewichts-Wippe
 * (Pokémon gegen den Trainer) und das Tastenfeld (Nummer eintippen, OK).
 * Aussehen: device.css. Ohne Platz neben der Karte bleibt nur das Gehäuse (mit Linse, wenn sie hinpasst).
 *
 *   DexScene.busy(on)   – Pokémon wird geladen (rote Lampe blinkt)
 *   DexScene.update(d)  – nach dem Laden und beim Shiny-Knopf (app.js):
 *     { id, pid, name, sprite, spriteShiny, shiny, height (m), weight (kg), cry, max, lang, labels,
 *       nameOf: n → Name zu Nr. n, go: n → lädt Nr. n, toggleShiny }
 */
window.DexScene = (function () {
  'use strict';

  var root = document.getElementById('dx');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { busy: function () {}, update: function () {} };

  var PLAT = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/platinum/';
  // Vergleichs-Trainer für Größe und Gewicht
  var TRAINER_H = 1.5, TRAINER_KG = 40;

  // Spieler-Sprites aus Platin (pret/pokeplatinum res/trainers/classes/player_*/front.png, auf die Figur zugeschnitten):
  // w × h in Bildpunkten, die Füße stehen auf der unteren Kante
  var TRAINERS = { lucas: { w: 36, h: 66 }, lucia: { w: 28, h: 66 } };
  var TKEY = 'hub-dex-trainer';

  // Ziffern der Nummern-Anzeige als Punktmatrix 5 × 7
  var DIGITS = {
    0: ['.xxx.', 'x...x', 'x..xx', 'x.x.x', 'xx..x', 'x...x', '.xxx.'],
    1: ['..x..', '.xx..', '..x..', '..x..', '..x..', '..x..', '.xxx.'],
    2: ['.xxx.', 'x...x', '....x', '...x.', '..x..', '.x...', 'xxxxx'],
    3: ['xxxxx', '...x.', '..x..', '...x.', '....x', 'x...x', '.xxx.'],
    4: ['...x.', '..xx.', '.x.x.', 'x..x.', 'xxxxx', '...x.', '...x.'],
    5: ['xxxxx', 'x....', 'xxxx.', '....x', '....x', 'x...x', '.xxx.'],
    6: ['..xx.', '.x...', 'x....', 'xxxx.', 'x...x', 'x...x', '.xxx.'],
    7: ['xxxxx', '....x', '...x.', '..x..', '.x...', '.x...', '.x...'],
    8: ['.xxx.', 'x...x', 'x...x', '.xxx.', 'x...x', 'x...x', '.xxx.'],
    9: ['.xxx.', 'x...x', 'x...x', '.xxxx', '....x', '...x.', '.xx..']
  };
  var KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'del', '0', 'ok'];

  var $ = function (sel) { return root.querySelector(sel); };
  var el = {
    size: $('.dx-size'), ticks: $('.dx-ticks'), sizeTr: $('.dx-size .dx-tr'),
    sizeSil: $('.dx-layer--sil img'), sizeMon: $('.dx-layer--mon img'),
    valT: $('.dx-size-vt'), valM: $('.dx-size-vm'),
    weight: $('.dx-weight'), saw: $('.dx-saw'), wTr: $('.dx-rider--t .dx-tr'), wMon: $('.dx-rider--m img'),
    wValT: $('.dx-rider--t .dx-val'), wValM: $('.dx-rider--m .dx-val'),
    digits: $('.dx-digits'), name: $('.dx-name'), wave: $('.dx-wave'),
    top: $('.dx-side--l .dx-top'), groove: $('.dx-groove'), keys: $('.dx-keys'),
    prev: $('.dx-pad-btn--l'), next: $('.dx-pad-btn--r'), cry: $('.dx-cry'),
    shiny: $('.dx-pill--shiny'), rnd: $('.dx-pill--rnd')
  };

  var cur = null, want = 0, meta = null, spriteUrl = null, full = false;
  var entry = null, entryT = 0, noteT = 0, scanT = 0;

  // ── Grundgerüst: Trainer, Tasten ──
  var who = 'lucas';
  try { if (TRAINERS[localStorage.getItem(TKEY)]) who = localStorage.getItem(TKEY); } catch (e) { /* ohne Speicher: Lucas */ }
  Object.keys(TRAINERS).forEach(function (k) { new Image().src = 'sprites/' + k + '.png'; });   // beide vorladen, der Wechsel blinkt sonst
  function dressTrainer() {
    [el.sizeTr, el.wTr].forEach(function (n) { n.querySelector('img').src = 'sprites/' + who + '.png'; });
  }
  dressTrainer();
  el.keys.innerHTML = KEYS.map(function (k) {
    return '<button type="button" class="dx-key dx-key--' + k + '" data-key="' + k + '">' + (k === 'del' ? '←' : k === 'ok' ? 'OK' : k) + '</button>';
  }).join('');

  var fmt = function (v, digits) {
    return v.toLocaleString(cur && cur.lang === 'en' ? 'en-US' : 'de-DE', { minimumFractionDigits: digits, maximumFractionDigits: digits });
  };
  var pad4 = function (n) { return ('000' + n).slice(-4); };

  // ── Nummern-Anzeige: Punktmatrix aus vier Stellen; '_' = blinkender Cursor beim Eintippen ──
  function digits(str) {
    var dim = '', on = '', cursor = '';
    for (var c = 0; c < 4; c++) {
      var ch = str.charAt(c), g = DIGITS[ch];
      for (var y = 0; y < 7; y++) {
        for (var x = 0; x < 5; x++) {
          var d = 'M' + (c * 6 + x + 0.1) + ' ' + (y + 0.1) + 'h.8v.8h-.8z';
          if (ch === '_' && y === 6) cursor += d;
          else if (g && g[y].charAt(x) === 'x') on += d;
          else dim += d;
        }
      }
    }
    el.digits.innerHTML = '<path class="dx-dot" d="' + dim + '"/><path class="dx-dot is-on" d="' + on + '"/><path class="dx-dot is-cur" d="' + cursor + '"/>';
  }
  function showNum() {
    if (!cur) return;
    if (entry != null) {
      digits((entry + '_   ').slice(0, 4));
      el.name.textContent = cur.labels.enter;
    } else {
      digits(pad4(cur.id));
      el.name.textContent = cur.name;
    }
  }
  function note(text) {
    el.name.textContent = text;
    clearTimeout(noteT);
    noteT = setTimeout(showNum, 1600);
  }
  function err() {
    root.classList.remove('is-err');
    void root.offsetWidth;
    root.classList.add('is-err');
    setTimeout(function () { root.classList.remove('is-err'); }, 500);
  }

  // ── Steuern: Nummer laden (am Ende geht es von vorn los) ──
  function go(n) {
    if (!cur) return;
    var max = cur.max;
    n = ((n - 1) % max + max) % max + 1;
    want = n;
    root.classList.add('is-busy');
    cur.go(n);
  }
  function key(k) {
    clearTimeout(entryT);
    if (k === 'ok') {
      var n = entry ? +entry : 0;
      entry = null;
      if (n >= 1 && n <= cur.max) { showNum(); if (n !== cur.id) go(n); }
      else { showNum(); err(); }
      return;
    }
    if (k === 'del') entry = entry && entry.length > 1 ? entry.slice(0, -1) : null;
    else entry = entry && entry.length < 4 ? entry + k : k;
    showNum();
    if (entry != null) entryT = setTimeout(function () { entry = null; showNum(); }, 6000);
  }

  // Klick auf den Trainer: kleiner Hüpfer, oben wechselt er (der Rahmen hüpft, nicht das Pixelbild – das ruckelt sonst)
  function swapTrainer() {
    who = who === 'lucas' ? 'lucia' : 'lucas';
    try { localStorage.setItem(TKEY, who); } catch (e) { /* nur für diesen Besuch */ }
    if (matchMedia('(prefers-reduced-motion: reduce)').matches) { dressTrainer(); render(); return; }
    [el.sizeTr, el.wTr].forEach(function (n) {
      n.animate([
        { transform: 'none' },
        { transform: 'translateY(-14%) scaleX(0.2)', offset: 0.45 },
        { transform: 'translateY(-14%) scaleX(0.2)', offset: 0.5 },
        { transform: 'none' }
      ], { duration: 380, easing: 'ease-in-out' });
    });
    setTimeout(function () { dressTrainer(); render(); }, 180);
  }

  root.addEventListener('click', function (e) {
    if (e.target.closest('.dx-tr')) return swapTrainer();
    var b = e.target.closest('button');
    if (!b || !cur) return;
    if (b.dataset.go) go((want || cur.id) + Number(b.dataset.go));
    else if (b.dataset.key) key(b.dataset.key);
    else if (b === el.cry) cry();
    else if (b === el.shiny) cur.toggleShiny();
    else if (b === el.rnd) go(1 + Math.floor(Math.random() * cur.max));
  });

  // ── Sprite: Platin bis Gen 4, sonst das normale; vermessen (leerer Rand) und als Umriss eingefärbt ──
  function spriteOf(d) {
    if (d.pid > 0 && d.pid <= 493) return PLAT + (d.shiny ? 'shiny/' : '') + d.pid + '.png';
    return (d.shiny && d.spriteShiny) || d.sprite || null;
  }
  function measure(img) {
    var w = img.naturalWidth, h = img.naturalHeight;
    var m = { nw: w, nh: h, l: Math.round(w * 0.15), t: Math.round(h * 0.2), cw: Math.round(w * 0.7), ch: Math.round(h * 0.7), sil: null };
    try {
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0);
      var px = cx.getImageData(0, 0, w, h).data, x0 = w, y0 = h, x1 = -1, y1 = -1;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          if (px[(y * w + x) * 4 + 3] > 40) {
            if (x < x0) x0 = x;
            if (x > x1) x1 = x;
            if (y < y0) y0 = y;
            y1 = y;
          }
        }
      }
      if (x1 < 0) return m;
      m.l = x0; m.t = y0; m.cw = x1 - x0 + 1; m.ch = y1 - y0 + 1;
      cx.globalCompositeOperation = 'source-in';
      cx.fillStyle = getComputedStyle(root).getPropertyValue('--lcd-sil').trim() || '#335';
      cx.fillRect(0, 0, w, h);
      m.sil = cv.toDataURL();
    } catch (e) { /* Bild ohne CORS: geschätzter Rand */ }
    return m;
  }
  function loadSprite(url, scan) {
    spriteUrl = url;
    var done = function (img) {
      if (spriteUrl !== url) return;
      meta = img ? measure(img) : null;
      [el.sizeMon, el.wMon].forEach(function (i) {
        i.hidden = !img;
        if (!img) return;
        i.crossOrigin = img.crossOrigin;   // gleiche Anfrage wie beim Vermessen (kommt dann aus dem Zwischenspeicher)
        i.src = url;
      });
      el.sizeSil.hidden = !meta;
      if (meta) {
        el.sizeSil.crossOrigin = meta.sil ? null : img.crossOrigin;
        el.sizeSil.src = meta.sil || url;
        el.sizeSil.classList.toggle('is-raw', !meta.sil);
      }
      root.classList.remove('is-busy');
      render();
      if (scan) scanNow();
    };
    if (!url) return done(null);
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { done(img); };
    img.onerror = function () {
      var raw = new Image();
      raw.onload = function () { done(raw); };
      raw.onerror = function () { done(null); };
      raw.src = url;
    };
    img.src = url;
  }
  function scanNow() {
    root.classList.remove('is-scan');
    void root.offsetWidth;
    root.classList.add('is-scan');
    clearTimeout(scanT);
    scanT = setTimeout(function () { root.classList.remove('is-scan'); }, 1400);
  }

  // ── Größe: Pokémon und Trainer maßstabsgetreu auf einer Linie, dazu Meter-Linien ──
  function renderSize() {
    var W = el.size.clientWidth, H = el.size.clientHeight;
    if (!W || !H) return;
    var floor = Math.round(H * 0.9), U = H * 0.7, h = Math.max(0.1, cur.height);
    var m = meta || { nw: 1, nh: 1, l: 0, t: 0, cw: 1, ch: 1 };
    var ppm = Math.min(U / Math.max(TRAINER_H, h), (W * 0.52) / (h * m.cw / m.ch));
    var t = TRAINERS[who], th = TRAINER_H * ppm, tw = th * t.w / t.h, tx = Math.max(tw / 2 + W * 0.06, W * 0.24);
    var sc = h * ppm / m.ch, mw = m.cw * sc, mh = m.ch * sc;
    var mx = Math.min(W - mw / 2 - W * 0.04, Math.max(W * 0.64, tx + tw / 2 + W * 0.08 + mw / 2));

    setBox(el.sizeTr, tx - tw / 2, floor - th, tw, th);
    [el.sizeSil, el.sizeMon].forEach(function (i) {
      setBox(i, mx - (m.l + m.cw / 2) * sc, floor - (m.t + m.ch) * sc, m.nw * sc, m.nh * sc);
    });
    label(el.valT, tx, floor - th, fmt(TRAINER_H, 1) + ' m');
    label(el.valM, mx, floor - mh, fmt(cur.height, 1) + ' m');

    // Meter-Linien: Abstand so, dass sie nicht zu dicht stehen
    var steps = [0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50, 100], min = Math.max(20, H * 0.11), step = 100;
    for (var i = 0; i < steps.length; i++) { if (steps[i] * ppm >= min) { step = steps[i]; break; } }
    var html = '<i class="is-floor" style="top:' + floor + 'px"></i>';
    for (var k = 1; floor - k * step * ppm > H * 0.06; k++) {
      var v = Math.round(k * step * 10) / 10;
      // Auf Höhe des Trainers steht die Zahl schon über seinem Kopf
      html += '<i style="top:' + Math.round(floor - k * step * ppm) + 'px">' + (v === TRAINER_H ? '' : '<b>' + fmt(v, v % 1 ? 1 : 0) + ' m</b>') + '</i>';
    }
    el.ticks.innerHTML = html;
  }
  function setBox(node, x, y, w, h) {
    node.style.left = x.toFixed(1) + 'px';
    node.style.top = y.toFixed(1) + 'px';
    node.style.width = w.toFixed(1) + 'px';
    node.style.height = h.toFixed(1) + 'px';
  }
  function label(node, x, y, text) {
    node.textContent = text;
    node.style.left = x.toFixed(1) + 'px';
    node.style.top = Math.max(node.offsetHeight + 2, y - 4).toFixed(1) + 'px';
  }

  // ── Gewicht: Wippe, das schwerere Ende sinkt (logarithmisch, höchstens ±14°) ──
  function renderWeight() {
    var W = el.weight.clientWidth, H = el.weight.clientHeight;
    if (!W || !H) return;
    var bw = W * 0.84, th = H * 0.34, m = meta || { nw: 1, nh: 1, l: 0, t: 0, cw: 1, ch: 1 };
    var sc = Math.min(th * 1.05 / m.ch, bw * 0.34 / m.cw, 4);
    var s = el.saw.style;
    s.setProperty('--bw', bw.toFixed(0) + 'px');
    s.setProperty('--bh', Math.max(3, H * 0.028).toFixed(1) + 'px');
    s.setProperty('--fh', (H * 0.15).toFixed(0) + 'px');
    s.top = (H * 0.74).toFixed(0) + 'px';
    el.wTr.style.height = th.toFixed(1) + 'px';
    el.wTr.style.width = (th * TRAINERS[who].w / TRAINERS[who].h).toFixed(1) + 'px';
    var st = el.wMon.style;
    st.width = (m.nw * sc).toFixed(1) + 'px';
    st.height = (m.nh * sc).toFixed(1) + 'px';
    st.margin = (-m.t * sc).toFixed(1) + 'px ' + (-(m.nw - m.l - m.cw) * sc).toFixed(1) + 'px ' + (-(m.nh - m.t - m.ch) * sc).toFixed(1) + 'px ' + (-m.l * sc).toFixed(1) + 'px';
    el.wValT.textContent = fmt(TRAINER_KG, 0) + ' kg';
    el.wValM.textContent = fmt(cur.weight, 1) + ' kg';
    var tilt = 4.5 * Math.log2(Math.max(0.1, cur.weight) / TRAINER_KG);
    root.style.setProperty('--tilt', Math.max(-14, Math.min(14, tilt)).toFixed(1) + 'deg');
  }

  function render() {
    if (!cur || !full) return;
    renderSize();
    renderWeight();
  }

  // ── Ruf: einmal laden und entschlüsseln, beim Abspielen zeigt die Anzeige die Welle ──
  var actx = null, cries = {}, playing = null;
  function cry() {
    if (!cur.cry) return note(cur.labels.noCry);
    try { actx = actx || new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return note(cur.labels.noCry); }
    if (actx.state === 'suspended') actx.resume();
    var url = cur.cry;
    if (!cries[url]) {
      cries[url] = fetch(url)
        .then(function (r) { if (!r.ok) throw new Error(r.status); return r.arrayBuffer(); })
        .then(function (buf) { return new Promise(function (ok, fail) { actx.decodeAudioData(buf, ok, fail); }); });
    }
    cries[url].then(function (buf) {
      if (cur && cur.cry === url) play(buf);
    }, function () {
      delete cries[url];
      if (cur && cur.cry === url) note(cur.labels.noCry);
    });
  }
  function play(buf) {
    stopCry();
    var src = actx.createBufferSource(), gain = actx.createGain(), an = actx.createAnalyser();
    src.buffer = buf;
    gain.gain.value = 0.55;
    an.fftSize = 1024;
    src.connect(gain);
    gain.connect(an);
    an.connect(actx.destination);
    var cv = el.wave, dpr = window.devicePixelRatio || 1;
    cv.width = Math.round(cv.clientWidth * dpr);
    cv.height = Math.round(cv.clientHeight * dpr);
    playing = { src: src, an: an, data: new Uint8Array(an.fftSize), cell: Math.max(2, Math.round(2.5 * dpr)), ink: getComputedStyle(cv).color };
    src.onended = function () { if (playing && playing.src === src) stopCry(); };
    root.classList.add('is-cry');
    src.start();
    requestAnimationFrame(frame);
  }
  function frame() {
    var p = playing;
    if (!p) return;
    var cv = el.wave, cx = cv.getContext('2d');
    p.an.getByteTimeDomainData(p.data);
    var cell = p.cell, cols = Math.floor(cv.width / cell), rows = Math.floor(cv.height / cell), mid = Math.floor(rows / 2);
    var n = p.data.length, chunk = Math.max(1, Math.floor(n / cols)), sum = 0;
    cx.clearRect(0, 0, cv.width, cv.height);
    cx.fillStyle = p.ink;
    for (var i = 0; i < cols; i++) {
      var peak = 0;
      for (var j = i * chunk; j < (i + 1) * chunk && j < n; j++) {
        var v = Math.abs(p.data[j] - 128) / 128;
        if (v > peak) peak = v;
        sum += v * v;
      }
      var hh = Math.min(mid, Math.round(peak * 1.8 * mid));
      for (var y = mid - hh; y <= mid + hh; y++) cx.fillRect(i * cell, y * cell, cell - 1, cell - 1);
    }
    root.style.setProperty('--amp', Math.min(1, Math.sqrt(sum / n) * 5).toFixed(2));
    requestAnimationFrame(frame);
  }
  function stopCry() {
    if (!playing) return;
    try { playing.src.stop(); } catch (e) { /* schon zu Ende */ }
    playing = null;
    root.classList.remove('is-cry');
    root.style.setProperty('--amp', '0');
    el.wave.getContext('2d').clearRect(0, 0, el.wave.width, el.wave.height);
  }

  function update(d) {
    var fresh = !cur || d.pid !== cur.pid;
    if (cur && d.cry !== cur.cry) stopCry();
    cur = d;
    want = d.id;
    root.querySelectorAll('[data-k]').forEach(function (n) { n.textContent = d.labels[n.dataset.k]; });
    var prev = d.id > 1 ? d.id - 1 : d.max, next = d.id < d.max ? d.id + 1 : 1;
    el.prev.title = d.labels.prev + ': #' + pad4(prev) + ' ' + (d.nameOf(prev) || '');
    el.next.title = d.labels.next + ': #' + pad4(next) + ' ' + (d.nameOf(next) || '');
    el.cry.title = d.labels.cry;
    el.rnd.title = d.labels.rnd;
    el.shiny.classList.toggle('is-on', !!d.shiny);
    el.shiny.setAttribute('aria-pressed', d.shiny ? 'true' : 'false');
    [el.prev, el.next, el.cry, el.rnd].forEach(function (b) { b.setAttribute('aria-label', b.title); });
    root.querySelector('.dx-key--del').setAttribute('aria-label', d.labels.del);
    root.querySelector('.dx-key--ok').setAttribute('aria-label', d.labels.ok);
    el.keys.setAttribute('aria-label', d.labels.enter);
    if (entry == null) showNum();
    var url = spriteOf(d);
    if (url !== spriteUrl) loadSprite(url, fresh);
    else { root.classList.remove('is-busy'); render(); }
  }
  function busy(on) {
    root.classList.toggle('is-busy', !!on);
    if (!on && cur) want = cur.id;
  }

  // ── Größe nach dem Platz neben der Karte: ganzes Gerät, nur Linse und Lämpchen oder nur das Gehäuse ──
  function layout() {
    var b = HubScene.beside(card), strip = b.strip, vh = window.innerHeight;
    var gap = Math.round(Math.max(18, Math.min(52, vh * 0.04)));
    var pw = Math.min(400, strip - 56, (vh - 48 - 2 * gap) / 1.79);
    var was = full;
    full = pw >= 210;
    var tight = !full && strip >= 96;
    if (!full) pw = Math.min(150, strip - 36);
    root.style.setProperty('--pw', Math.round(pw) + 'px');
    root.style.setProperty('--gap', gap + 'px');
    root.style.setProperty('--cl', Math.round(b.cl) + 'px');
    root.style.setProperty('--cr', Math.round(b.cr) + 'px');
    root.classList.toggle('is-full', full);
    root.classList.toggle('is-tight', tight);
    root.classList.toggle('is-bare', !full && !tight);
    root.classList.toggle('no-screws', strip < 40);
    groove(b, full || tight);
    if (full || was) render();
  }
  // Die Stufen-Kante unter der Linse, von außen bis unter die Karte
  function groove(b, on) {
    var paths = el.groove.querySelectorAll('path');
    if (!on) { paths.forEach(function (p) { p.setAttribute('d', ''); }); return; }
    var y = Math.round(el.top.getBoundingClientRect().bottom + Math.min(26, b.strip * 0.08));
    var w = b.left + 40, x1 = Math.round(b.left * 0.42), dx = Math.round(Math.min(30, b.left * 0.08)), dy = Math.round(dx * 0.8);
    paths.forEach(function (p, i) {
      var o = i ? 1.5 : 0;
      p.setAttribute('d', 'M0 ' + (y + o) + 'H' + x1 + 'L' + (x1 + dx) + ' ' + (y + dy + o) + 'H' + w);
    });
  }

  layout();
  window.addEventListener('resize', layout);
  if (window.ResizeObserver) new ResizeObserver(layout).observe(card);

  return { busy: busy, update: update };
})();
