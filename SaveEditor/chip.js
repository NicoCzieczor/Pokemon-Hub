/*
 * „Platine“ hinter dem Save-Editor: Die Seite ist das Innere eines Spielmoduls – Leiterbahnen, unten die
 * Kontakte. Links und rechts sitzt je ein Speicherchip, in dem der geladene Spielstand als Karte zu sehen ist:
 * links die Spielstand-Daten (je Feld 64 Byte, Farbe = Bereich: Trainer & Geld, Team, Beutel, Pokédex …),
 * rechts die 18 PC-Boxen (je Feld ein Platz, voll oder leer). Geänderte Stellen leuchten, Porygon zeigt auf die
 * Stelle, die gerade bearbeitet wird; beim Speichern flitzt Porygon-Z über beide Chips und die Prüfsumme stimmt.
 * Farben und Aussehen: chip.css. Platz neben der Karte: scene.js (HubScene.beside).
 *
 *   ChipScene.update(data)  – nach jedem Zeichnen (app.js, updateScene):
 *     { name, orig, work, before (Uint8Array: zuletzt gespeichert, gerade bearbeitet, beim Laden), saved, busy,
 *       focus: { area: 'party'|'box'|'bag'|'money', slot, box } } | null
 */
window.ChipScene = (function () {
  'use strict';

  var PLAT = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/platinum/';
  var root = document.getElementById('ch');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene || !window.PtSave) return { update: function () {} };

  var TR = {
    de: {
      general: 'Spielstand-Daten', storage: 'PC-Boxen', none: 'Kein Spielstand', changed: '{n} Stellen geändert', changed1: '1 Stelle geändert', clean: 'Unverändert',
      saved: '✓ Gespeichert · Prüfsumme neu', busy: 'Schreibe …',
      regions: { tr: 'Trainer & Geld', team: 'Team', bag: 'Beutel', dex: 'Pokédex', care: 'Pension', rest: 'Welt & Flaggen' }, box: 'Box'
    },
    en: {
      general: 'Save data', storage: 'PC boxes', none: 'No save file', changed: '{n} spots changed', changed1: '1 spot changed', clean: 'Unchanged',
      saved: '✓ Saved · checksum updated', busy: 'Writing …',
      regions: { tr: 'Trainer & money', team: 'Party', bag: 'Bag', dex: 'Pokédex', care: 'Day Care', rest: 'World & flags' }, box: 'Box'
    }
  };
  var tr = function () { return TR[document.documentElement.lang] || TR.de; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  // Aufbau des Platin-Spielstands (wie SaveViewer/pt-save.js, pt-bag.js)
  var GEN = 0xCF2C, STO = 0x121E4, CHUNK = 64, COLS = 24, ROWS = Math.ceil(GEN / CHUNK / COLS);
  var SLOT = 136, BOXES = 18, SLOTS = 30;
  var REGIONS = [   // Bereiche im General-Block: [Anfang, Ende, Name]
    [0x68, 0xA0, 'tr'], [0xA0, 0xA0 + 6 * 236, 'team'], [0x630, 0xDA0, 'bag'], [0x1328, 0x1654, 'dex'], [0x1654, 0x1654 + 2 * 236, 'care']
  ];
  var regionOf = function (off) {
    for (var i = 0; i < REGIONS.length; i++) if (off + CHUNK > REGIONS[i][0] && off < REGIONS[i][1]) return REGIONS[i][2];
    return 'rest';
  };
  var CHUNK_REGION = [];
  for (var c = 0; c < ROWS * COLS; c++) CHUNK_REGION.push(c * CHUNK < GEN ? regionOf(c * CHUNK) : null);

  // Leiterbahnen als Kachel (160 × 160): Bahnen mit 45°-Knicken, Durchkontaktierungen
  var TRACES = 'M0 24h46l16 16h58l16-16h24M0 72h22l14 14v40l14 14h110M40 0v14l12 12h40l10-10V0M120 160v-22l-12-12V96l12-12h40' +
    'M70 160v-30l14-14h20M0 116h10l10 10v34M150 0v40l-14 14h-26';
  var VIAS = [[46, 24], [120, 40], [36, 86], [50, 140], [92, 26], [108, 126], [84, 116], [20, 126], [136, 54], [110, 54]];

  root.innerHTML =
    '<svg class="ch-pcb" aria-hidden="true"><defs><pattern id="ch-trace" width="160" height="160" patternUnits="userSpaceOnUse">' +
      '<path class="ch-tr" d="' + TRACES + '"/>' + VIAS.map(function (v) { return '<circle class="ch-via" cx="' + v[0] + '" cy="' + v[1] + '" r="4.5"/>'; }).join('') +
    '</pattern></defs><rect width="100%" height="100%" fill="url(#ch-trace)"/></svg>' +
    '<div class="ch-fingers" aria-hidden="true"></div>' +
    ['g', 's'].map(function (k) {
      return '<div class="ch-chip ch-chip--' + k + '"><div class="ch-label"><b></b><small></small></div><div class="ch-die"><canvas></canvas><i class="ch-scan"></i></div>' +
        '<div class="ch-status"></div>' + (k === 'g' ? '<div class="ch-legend"></div>' : '') + '</div>';
    }).join('') +
    '<i class="ch-beam"></i><i class="ch-aim"></i>' +
    '<img class="ch-pory" alt="" src="' + PLAT + '137.png"><img class="ch-dash" alt="" src="' + PLAT + '474.png">';
  var chips = ['g', 's'].map(function (k) {
    var box = root.querySelector('.ch-chip--' + k);
    return { box: box, cv: box.querySelector('canvas'), name: box.querySelector('.ch-label b'), sub: box.querySelector('.ch-label small'), status: box.querySelector('.ch-status') };
  });
  var legend = root.querySelector('.ch-legend'), pory = root.querySelector('.ch-pory'), dash = root.querySelector('.ch-dash');
  var beam = root.querySelector('.ch-beam'), ring = root.querySelector('.ch-aim');

  var data = null, full = false, cs = [8, 10], gap = 6, wasDirty = false, flashUntil = 0;

  function layout() {
    var side = HubScene.beside(card);
    full = side.strip >= 200;
    root.classList.toggle('is-full', full);
    root.classList.toggle('is-bare', !full);
    root.style.setProperty('--cl', side.cl + 'px');
    root.style.setProperty('--cr', side.cr + 'px');
    cs = [Math.max(5, Math.min(18, Math.floor((side.strip - 110) / COLS))), 0];
    gap = cs[0] >= 12 ? 10 : 6;
    cs[1] = Math.max(5, Math.min(22, Math.floor((side.strip - 96 - 2 * gap) / BOXES)));
    var dpr = window.devicePixelRatio || 1;
    var sizes = [[COLS * cs[0], ROWS * cs[0]], [3 * 6 * cs[1] + 2 * gap, 6 * 5 * cs[1] + 5 * gap]];
    chips.forEach(function (ch, i) {
      ch.cv.width = Math.round(sizes[i][0] * dpr);
      ch.cv.height = Math.round(sizes[i][1] * dpr);
      ch.cv.style.setProperty('width', sizes[i][0] + 'px', 'important');
      ch.cv.style.setProperty('height', sizes[i][1] + 'px', 'important');
      ch.dpr = dpr;
      ch.box.style.width = (sizes[i][0] + 12 + 32) + 'px';   // feste Breite: Statuszeile bricht um, statt den Chip zu verschieben
    });
  }

  // Farben aus chip.css (je Design)
  var colors = {};
  function readColors() {
    var st = getComputedStyle(root);
    ['tr', 'team', 'bag', 'dex', 'care', 'rest', 'box', 'empty', 'edit', 'ok', 'cell-hi'].forEach(function (k) { colors[k] = st.getPropertyValue('--c-' + k).trim(); });
  }

  // Helligkeit eines Bereichs aus den echten Bytes (0–3) und ob er sich gegenüber der letzten gespeicherten Fassung
  // geändert hat
  function scan(work, orig, start, len) {
    var sum = 0, diff = false;
    for (var i = start; i < start + len; i++) {
      var v = work ? work[i] || 0 : 0;
      sum += v;
      if (orig && !diff && orig[i] !== v) diff = true;
    }
    return { level: sum === 0 ? 0 : Math.min(3, 1 + Math.floor(sum / len / 48)), diff: diff };
  }
  function cell(cx, x, y, s, base, level, diff, ok) {
    cx.globalAlpha = level === 0 ? 0.28 : 0.55 + level * 0.15;
    cx.fillStyle = base;
    cx.fillRect(x + 1, y + 1, s - 2, s - 2);
    cx.globalAlpha = 1;
    if (diff) {
      cx.fillStyle = ok ? colors.ok : colors.edit;
      cx.fillRect(x, y, s, s);
      cx.fillStyle = colors['cell-hi'];
      cx.fillRect(x + 2, y + 2, Math.max(1, s - 4), Math.max(1, Math.floor((s - 4) / 3)));
    }
  }

  var changed = [0, 0];
  function draw() {
    if (!full) return;
    readColors();
    var sv = data, ok = Date.now() < flashUntil;
    // Vergleich: mit der zuletzt gespeicherten Fassung; direkt nach dem Speichern mit dem Stand beim Laden (kurz grün)
    var ref = sv && (ok && sv.before ? sv.before : sv.orig);
    var block = function (fn, bytes, size) { var x = bytes && fn(bytes); return x ? x.bytes.subarray(x.offset, x.offset + size) : null; };
    var gw = sv && block(PtSave.generalBlock, sv.work, GEN), gr = sv && block(PtSave.generalBlock, ref, GEN);
    var sw = sv && block(PtSave.storageBlock, sv.work, STO), sr = sv && block(PtSave.storageBlock, ref, STO);
    changed = [0, 0];

    var cv = chips[0].cv, cx = cv.getContext('2d'), k = cs[0];
    cx.setTransform(chips[0].dpr, 0, 0, chips[0].dpr, 0, 0);
    cx.clearRect(0, 0, cv.width, cv.height);
    for (var i = 0; i < CHUNK_REGION.length; i++) {
      var reg = CHUNK_REGION[i];
      if (!reg) continue;
      var off = i * CHUNK;
      var r = gw ? scan(gw, gr, off, Math.min(CHUNK, GEN - off)) : { level: 0, diff: false };
      if (r.diff) changed[0]++;
      cell(cx, (i % COLS) * k, Math.floor(i / COLS) * k, k, colors[reg], r.level, r.diff, ok);
    }

    cv = chips[1].cv; cx = cv.getContext('2d'); k = cs[1];
    cx.setTransform(chips[1].dpr, 0, 0, chips[1].dpr, 0, 0);
    cx.clearRect(0, 0, cv.width, cv.height);
    for (var b = 0; b < BOXES; b++) {
      var bx = (b % 3) * (6 * k + gap), by = Math.floor(b / 3) * (5 * k + gap);
      for (var sl = 0; sl < SLOTS; sl++) {
        var rr = sw ? scan(sw, sr, 4 + (b * SLOTS + sl) * SLOT, SLOT) : { level: 0, diff: false };
        if (rr.diff) changed[1]++;
        cell(cx, bx + (sl % 6) * k, by + Math.floor(sl / 6) * k, k, rr.level ? colors.box : colors.empty, rr.level ? Math.max(2, rr.level) : 0, rr.diff, ok);
      }
    }
    labels();
  }

  function labels() {
    var t = tr(), sv = data;
    var dirty = !!sv && (changed[0] + changed[1] > 0) && !(Date.now() < flashUntil);
    chips[0].name.textContent = t.general;
    chips[0].sub.textContent = sv ? sv.name : t.none;
    chips[1].name.textContent = t.storage;
    chips[1].sub.textContent = BOXES + ' × ' + SLOTS;
    chips.forEach(function (ch, i) {
      var n = changed[i];
      ch.status.textContent = !sv ? '' : sv.busy ? t.busy : Date.now() < flashUntil ? t.saved : n === 1 ? t.changed1 : n ? t.changed.replace('{n}', n) : t.clean;
      ch.status.className = 'ch-status' + (Date.now() < flashUntil ? ' is-ok' : n && sv ? ' is-edit' : '');
    });
    root.classList.toggle('is-dirty', dirty);
    legend.innerHTML = ['tr', 'team', 'bag', 'dex', 'care', 'rest'].map(function (k) {
      return '<span><i style="background:' + colors[k] + '"></i>' + esc(t.regions[k]) + '</span>';
    }).join('');
  }

  // Porygon schwebt über dem Chip und zeigt mit einem Strahl auf die Stelle, die gerade bearbeitet wird
  // (ohne Auswahl ruht es neben dem linken Chip)
  function aim() {
    if (!full) return;
    var f = data && data.focus, target = null, chip = null, size = cs[0];
    if (f) {
      var k = cs[0], cv = chips[0].cv.getBoundingClientRect();
      var at = function (off) { var i = Math.floor(off / CHUNK); return { x: cv.left + (i % COLS + 0.5) * k, y: cv.top + (Math.floor(i / COLS) + 0.5) * k }; };
      chip = chips[0].box;
      if (f.area === 'party') target = at(0xA0 + f.slot * 236 + 118);
      else if (f.area === 'bag') target = at(0x9E0);
      else if (f.area === 'money') target = at(0x68 + 0x14);
      else if (f.area === 'box') {
        var k2 = cs[1], cv2 = chips[1].cv.getBoundingClientRect();
        var bx = (f.box % 3) * (6 * k2 + gap), by = Math.floor(f.box / 3) * (5 * k2 + gap);
        target = { x: cv2.left + bx + (f.slot % 6 + 0.5) * k2, y: cv2.top + by + (Math.floor(f.slot / 6) + 0.5) * k2 };
        chip = chips[1].box;
        size = k2;
      }
    }
    root.classList.toggle('is-aiming', !!target);
    if (!target) {
      var r = chips[0].box.getBoundingClientRect();
      pory.style.transform = 'translate(' + Math.round(r.right - 50) + 'px,' + Math.round(r.top - 70) + 'px)';
      return;
    }
    var top = chip.getBoundingClientRect().top - 96;
    pory.style.transform = 'translate(' + Math.round(target.x - 40) + 'px,' + Math.round(top) + 'px)' + (chip === chips[0].box ? ' scaleX(-1)' : '');
    beam.style.transform = 'translate(' + Math.round(target.x - 1) + 'px,' + Math.round(top + 66) + 'px)';
    beam.style.height = Math.max(0, Math.round(target.y - top - 66 - size / 2 - 3)) + 'px';
    ring.style.transform = 'translate(' + Math.round(target.x - size / 2 - 4) + 'px,' + Math.round(target.y - size / 2 - 4) + 'px)';
    ring.style.width = ring.style.height = Math.round(size + 8) + 'px';
  }

  // Speichern: Porygon-Z flitzt vom linken zum rechten Chip, geänderte Stellen leuchten kurz grün
  function celebrate() {
    flashUntil = Date.now() + 1800;
    var a = chips[0].box.getBoundingClientRect(), b = chips[1].box.getBoundingClientRect();
    dash.classList.add('is-on');
    var run = dash.animate([
      { transform: 'translate(' + (a.left - 80) + 'px,' + (a.top + a.height / 2 - 40) + 'px) scaleX(-1)' },
      { transform: 'translate(' + (b.right) + 'px,' + (b.top + b.height / 2 - 60) + 'px) scaleX(-1)' }
    ], { duration: 1300, easing: 'cubic-bezier(.5,0,.5,1)' });
    run.onfinish = function () { dash.classList.remove('is-on'); };
    draw();
    setTimeout(function () { draw(); aim(); }, 1850);
  }

  var raf = 0;
  function update(d) {
    var dirty = !!d && !!d.orig && d.orig !== d.work;
    var justSaved = !!d && d.saved && wasDirty && !dirty;
    wasDirty = dirty;
    data = d;
    if (justSaved) { celebrate(); return; }
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; draw(); aim(); });
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(function () { layout(); draw(); aim(); }, 120); });
  // Design gewechselt: Farben neu einlesen
  new MutationObserver(function () { draw(); }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme', 'lang'] });
  layout();
  draw();
  aim();

  return { update: update };
})();
