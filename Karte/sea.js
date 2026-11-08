/*
 * „Meer um Sinnoh“ hinter der Karte: Die Seite ist das Meer aus der Vogelperspektive (die Wasserkachel aus dem
 * Spiel, tiles/sea.png), die Karte liegt darin wie eine Insel mit Brandung. Klassik: Nacht mit Mondglitzern,
 * Graphit: Abendrot, Papier: Tag mit Wolkenschatten.
 * Im Wasser schwimmen die Pokémon, die man am gewählten Ort beim Surfen trifft (antippen → wo es überall lebt),
 * über das Meer ziehen die fliegenden Pokémon des Ortes. Links hängt eine Angel ins Wasser: „Angeln!“ zieht mit
 * den echten Chancen der besten Angel des Ortes ein Pokémon heraus. Ohne gewählten Ort zeigt das Meer Route 220.
 * Farben und Aussehen: sea.css. Pixel-Helfer: scene.js (HubScene).
 *
 *   SeaScene.update(data)  – nach jedem Wechsel von Ort, Sprache oder Randomizer-Stand (app.js, updateScene):
 *     { key: Ort + Stand (ohne Sprache), place: Name, picked: Ort gewählt (sonst nur das Meer),
 *       how: ['Surfen', 'Angel', …] (Wege ins Wasser),
 *       surf: [{ id, name, p }], land: [{ id, name, p }] (Gras – nur für die Flieger),
 *       rod: { name, areas: [{ area, list: [{ id, name, p, min, max }] }] } | null,
 *       surfName: 'Surfen', open: id => … (Fundorte des Pokémon zeigen) }
 */
window.SeaScene = (function () {
  'use strict';

  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
  var PLAT = SPR + 'versions/generation-iv/platinum/';
  var root = document.getElementById('km');
  var card = document.getElementById('app');
  var game = window.PokeHubGame && window.PokeHubGame.get();
  if (window.PokeHubLite || game === 'rot-blau' || game === 'gelb' || game === 'gold-silber' || game === 'kristall' || game === 'rubin-saphir' || game === 'smaragd' || game === 'diamant-perl' || game === 'heartgold-soulsilver' || game === 'schwarz-weiss' || game === 'schwarz2-weiss2' || game === 'feuerrot-blattgruen' || game === 'x-y' || game === 'sonne-mond' || !root || !card || !window.HubScene) return { update: function () {} };

  var TR = {
    de: {
      kick: 'Im Wasser', pick: 'Wähle einen Ort auf der Karte.', dry: 'Hier gibt es kein Wasser.',
      fish: 'Angeln!', fishAria: 'Angeln mit der {rod}', swim: '{how} {p} %', where: 'Wo lebt {mon}?',
      lv: 'Lv. {n}', shiny: 'Schillernd!'
    },
    en: {
      kick: 'In the water', pick: 'Pick a place on the map.', dry: 'There is no water here.',
      fish: 'Fish!', fishAria: 'Fish with the {rod}', swim: '{how} {p} %', where: 'Where does {mon} live?',
      lv: 'Lv. {n}', shiny: 'Shiny!'
    }
  };
  var tr = function () { return TR[window.LANG] || TR.de; };
  var fill = function (s, v) { return s.replace(/\{(\w+)\}/g, function (m, k) { return v[k] != null ? v[k] : m; }); };
  var rand = function (a, b) { return a + Math.random() * (b - a); };
  var clamp = function (v, a, b) { return Math.max(a, Math.min(b, v)); };
  var reduce = matchMedia('(prefers-reduced-motion: reduce)');

  // Nach Chance gewichtet ziehen – wie das Spiel bei Surfen und Angeln
  function weighted(list) {
    var sum = list.reduce(function (s, m) { return s + (m.p || 1); }, 0), x = Math.random() * sum;
    for (var i = 0; i < list.length; i++) { x -= list[i].p || 1; if (x < 0) return list[i]; }
    return list[list.length - 1];
  }

  // Fliegende Pokémon (Gen 1–4) ziehen über das Meer, statt zu schwimmen – auch wenn man sie beim Surfen trifft
  // (Wingull, Pelipper, Zubat in Höhlen). Ohne Flieger am Ort kreisen die Seevögel.
  var FLY = [12, 15, 16, 17, 18, 21, 22, 41, 42, 49, 83, 84, 85, 123, 142, 163, 164, 165, 166, 169, 176, 177, 178,
    187, 188, 189, 193, 198, 207, 225, 227, 267, 269, 276, 277, 278, 279, 284, 291, 329, 330, 333, 334, 357, 396, 397,
    398, 414, 415, 416, 425, 426, 430, 441, 468, 469, 472];
  var SEA_BIRDS = [{ id: 278, p: 70 }, { id: 279, p: 30 }];

  var spriteOf = function (id, shiny) {
    if (id > 0 && id <= 493) return PLAT + (shiny ? 'shiny/' : '') + id + '.png';
    return SPR + (shiny ? 'shiny/' : '') + id + '.png';
  };

  // ── Pixel-Kunst ──────────────────────────────────────────────────────────
  // Wasserkachel aus dem Spiel (16 × 16): a = Wellenkamm, b = hell, c = mittel, d = tief
  var WAVES = [
    'abbccddddcccccca', 'aabbcddddddccccc', 'aabbccddddddcccc', 'aaabbcdddddddccc',
    'caaabbbddddddccc', 'caaaabbbbbddddcc', 'ccaaaaabbbbdddcc', 'ccccaaaaabbddddc',
    'dccccccaabbcdddd', 'dddcccccaabbccdd', 'ddddccccaabbccdd', 'dddddcccaaabbccd',
    'dddddccccaaabbbd', 'bbddddcccaaaabbb', 'bbbdddccccaaaaab', 'abbddddcccccaaaa'
  ];
  var WAVE_TONES = { a: 'w-a', b: 'w-b', c: 'w-c', d: 'w-d' };
  var TILE = 6;   // Bildschirmpixel je Kunst-Pixel (Kachel 96 px, Verschiebung in sea.css passt dazu)

  // Schwimmer der Angel: o = Rand, r = rot, h = Glanz, w = weiß, s = Schatten
  var BOBBER = ['..ooo..', '.orhro.', 'orhrrro', 'orrrrro', 'ooooooo', 'owwwwso', 'owwwwso', '.owwso.', '..ooo..'];
  var BOB_TONES = { o: 'b-o', r: 'b-r', h: 'b-h', w: 'b-w', s: 'b-s' };

  // Wolke (für die Schatten im Papier-Design): Kreise [x, y, r] in Kunst-Pixeln
  function cloudRows(w, h, blobs) {
    var rows = [];
    for (var y = 0; y < h; y++) {
      var row = '';
      for (var x = 0; x < w; x++) {
        row += blobs.some(function (b) { var dx = x + 0.5 - b[0], dy = y + 0.5 - b[1]; return dx * dx + dy * dy < b[2] * b[2]; }) ? 'c' : '.';
      }
      rows.push(row);
    }
    return rows;
  }
  var CLOUDS = [
    cloudRows(34, 14, [[8, 8, 6], [16, 6, 6], [24, 8, 6], [13, 10, 5], [21, 10, 5], [29, 10, 4]]),
    cloudRows(26, 12, [[7, 7, 5], [14, 5, 5], [20, 7, 5], [11, 9, 4], [17, 9, 4]]),
    cloudRows(40, 16, [[9, 9, 7], [18, 7, 7], [27, 8, 7], [34, 10, 5], [14, 12, 5], [24, 12, 5]])
  ];

  var svg = function (rows, tones, cls) {
    return '<svg class="' + cls + '" viewBox="0 0 ' + rows[0].length + ' ' + rows.length + '" shape-rendering="crispEdges" aria-hidden="true">' +
      HubScene.pixels(rows, tones) + '</svg>';
  };

  // ── Gerüst ───────────────────────────────────────────────────────────────
  root.innerHTML =
    '<svg class="km-water" aria-hidden="true"><defs><pattern id="km-wave" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="scale(' + TILE + ')">' +
      HubScene.pixels(WAVES, WAVE_TONES) + '</pattern></defs><rect width="100%" height="100%" fill="url(#km-wave)"/></svg>' +
    '<div class="km-clouds" aria-hidden="true">' + CLOUDS.map(function (c, i) {
      return '<div class="km-cloud km-cloud--' + i + '" style="--cw:' + c[0].length + ';--ch:' + c.length + '">' + svg(c, { c: 'c-c' }, '') + '</div>';
    }).join('') + '</div>' +
    '<div class="km-glints" aria-hidden="true"></div>' +
    '<div class="km-glow" aria-hidden="true"></div>' +
    '<div class="km-shore" aria-hidden="true"><svg class="km-surf" shape-rendering="crispEdges">' +
      '<rect class="km-wave"/><rect class="km-wave"/><rect class="km-wave"/><rect class="km-foam"/><rect class="km-foam km-foam--b"/></svg></div>' +
    '<div class="km-pod"></div>' +
    '<div class="km-air" aria-hidden="true"></div>' +
    '<svg class="km-line" aria-hidden="true"><path class="km-string"/><path class="km-rod"/></svg>' +
    '<div class="km-bob" aria-hidden="true"><i class="km-ring"></i><i class="km-ring"></i><span class="km-bob-up">' + svg(BOBBER, BOB_TONES, 'km-bob-px') + '</span><b class="km-bang">!</b></div>' +
    '<button type="button" class="km-cast"><span class="km-cast-t"></span><small class="km-cast-rod"></small></button>' +
    '<div class="km-plate"><span class="km-kick"></span><b class="km-place"></b><small class="km-how"></small></div>' +
    '<div class="km-sky" aria-hidden="true"></div>';
  var el = {
    glints: root.querySelector('.km-glints'),
    shore: root.querySelector('.km-shore'),
    surf: root.querySelector('.km-surf'),
    glow: root.querySelector('.km-glow'),
    pod: root.querySelector('.km-pod'),
    rod: root.querySelector('.km-rod'),
    string: root.querySelector('.km-string'),
    bob: root.querySelector('.km-bob'),
    cast: root.querySelector('.km-cast'),
    castT: root.querySelector('.km-cast-t'),
    castRod: root.querySelector('.km-cast-rod'),
    kick: root.querySelector('.km-kick'),
    place: root.querySelector('.km-place'),
    how: root.querySelector('.km-how'),
    air: root.querySelector('.km-air'),
    sky: root.querySelector('.km-sky')
  };

  // ── Sprites vermessen ───────────────────────────────────────────────────
  // Sichtbarer Teil eines Sprites in Sprite-Pixeln (l, t, r, b) – Wasserlinie, Wellenringe und Namensschild
  // richten sich danach. Ohne CORS geschätzt.
  var boxes = {};
  function measure(img, cors) {
    var w = img.naturalWidth, h = img.naturalHeight;
    var b = { w: w, h: h, l: w * 0.25, t: h * 0.3, r: w * 0.75, b: h * 0.85, cors: cors };
    if (!cors) return b;
    try {
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0);
      var px = cx.getImageData(0, 0, w, h).data, l = w, t = h, r = -1, bo = -1;
      for (var y = 0; y < h; y++) {
        for (var x = 0; x < w; x++) {
          if (px[(y * w + x) * 4 + 3] < 40) continue;
          if (x < l) l = x;
          if (x > r) r = x;
          if (y < t) t = y;
          bo = y;
        }
      }
      if (r >= 0) b = { w: w, h: h, l: l, t: t, r: r + 1, b: bo + 1, cors: true };
    } catch (e) { /* Bild ohne CORS */ }
    return b;
  }
  function load(url, cb) {
    if (boxes[url]) { cb(boxes[url]); return; }
    var img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = function () { cb(boxes[url] = measure(img, true)); };
    img.onerror = function () {
      var raw = new Image();
      raw.onload = function () { cb(boxes[url] = measure(raw, false)); };
      raw.onerror = function () { cb(null); };
      raw.src = url;
    };
    img.src = url;
  }
  function sprite(url, b, cls) {
    var img = document.createElement('img');
    img.alt = '';
    if (cls) img.className = cls;
    if (b.cors) img.crossOrigin = 'anonymous';   // gleiche Anfrage wie beim Vermessen → aus dem Cache
    img.src = url;
    return img;
  }

  // ── Zustand und Maße ────────────────────────────────────────────────────
  var data = null, key = '';
  var swimmers = [], popRun = 0;
  var full = false, tight = false, k = 1, side = null, vw = 0, vh = 0;
  var bob = { x: 0, y: 0 };
  var busy = false;

  // Brandung und Angel hängen an der Karte – beim Scrollen mitziehen
  var SURF = 64, shoreW = 0, shoreH = 0;
  function place() {
    var r = card.getBoundingClientRect();
    var s = el.shore.style;
    s.left = r.left + 'px'; s.top = r.top + 'px'; s.width = r.width + 'px'; s.height = r.height + 'px';
    if (r.width !== shoreW || r.height !== shoreH) surf(shoreW = r.width, shoreH = r.height);
    if (!full) return;
    // Angel ragt links unter der Karte hervor, Schwimmer draußen im Wasser
    // (Schwimmer: 7 × 9 Kunst-Pixel zu je 2k px, die oberen sechs Reihen über Wasser)
    var bp = 2 * k, ay = clamp(vh * 0.42, r.top + 120, r.bottom - 160);
    var tx = r.left - 14 - 15 * k, ty = ay - 10 - 14 * k;
    bob.x = Math.round(r.left - clamp(side.left * 0.48, 96, 220));
    bob.y = Math.round(ay + 58);
    el.rod.setAttribute('d', 'M' + (r.left + 12) + ' ' + (ay + 12) + 'L' + tx + ' ' + ty);
    el.string.setAttribute('d', 'M' + tx + ' ' + ty + 'Q' + ((tx + bob.x) / 2) + ' ' + (Math.max(ty, bob.y) + 30) + ' ' + bob.x + ' ' + (bob.y - 6 * bp + 1));
    el.bob.style.left = bob.x + 'px'; el.bob.style.top = bob.y + 'px';
    el.cast.style.left = bob.x + 'px'; el.cast.style.top = (bob.y + 3 * bp + 18) + 'px';
  }

  // Schaum zieht in Kunst-Pixel-Schritten (6 px) an der Küste entlang, der äußere langsamer und rückwärts – per Takt
  // statt CSS-Animation: stroke-dashoffset kann nur der Hauptthread animieren, als CSS-Animation in jedem Bild
  (function foamTick() {
    var foam = el.surf.querySelectorAll('.km-foam'), t0 = performance.now();
    setInterval(function () {
      if (document.hidden || reduce.matches || document.body.classList.contains('map-busy')) return;
      var t = (performance.now() - t0) / 1000;
      foam[0].style.strokeDashoffset = -(Math.floor(t / 26 * 80) % 80) * 6;
      foam[1].style.strokeDashoffset = -(79 - Math.floor(t / 40 * 80) % 80) * 6;
    }, 250);
  })();

  // Brandung als Rahmen um die Karte (SVG ragt SURF px über die Karte hinaus): Schaum an der Küste, dahinter
  // Wellen, die von außen heranlaufen (sea.css skaliert sie von --fx/--fy auf --nx/--ny)
  function surf(w, h) {
    var small = matchMedia('(max-width: 720px)').matches, rr = small ? 22 : 28;
    el.surf.setAttribute('width', w + 2 * SURF);
    el.surf.setAttribute('height', h + 2 * SURF);
    var ring = function (node, off) {
      node.setAttribute('x', SURF - off); node.setAttribute('y', SURF - off);
      node.setAttribute('width', w + 2 * off); node.setAttribute('height', h + 2 * off);
      node.setAttribute('rx', rr + off);
    };
    el.surf.querySelectorAll('.km-wave').forEach(function (n) { ring(n, 6); });
    var foam = el.surf.querySelectorAll('.km-foam');
    ring(foam[0], 5);
    ring(foam[1], 10);
    var s = el.shore.style;
    s.setProperty('--fx', (1 + 96 / (w + 12)).toFixed(4));
    s.setProperty('--fy', (1 + 96 / (h + 12)).toFixed(4));
  }

  // Glitzern auf dem Wasser, bei Nacht und Abendrot dazu ein Lichtstreifen (Mond bzw. Sonne) rechts
  function glints() {
    var n = Math.round(clamp(vw * vh / 42000, 14, 90)), html = '';
    var add = function (x, y, streak) {
      html += '<i class="km-glint' + (streak ? ' is-streak' : '') + (Math.random() < 0.3 ? ' is-big' : '') +
        '" style="left:' + Math.round(x) + 'px;top:' + Math.round(y) + 'px;animation-delay:' + (-rand(0, 6)).toFixed(2) + 's;animation-duration:' + rand(2.4, 5).toFixed(2) + 's"></i>';
    };
    for (var i = 0; i < n; i++) add(rand(0, vw), rand(0, vh));
    var sx = side.right > 120 ? side.cr : vw * 0.85, sw = clamp(side.right * 0.22, 26, 90);
    el.glow.style.left = Math.round(sx) + 'px';
    el.glow.style.width = Math.round(sw * 3) + 'px';
    for (i = 0; i < Math.round(vh / 18); i++) {
      var y = rand(0, vh), spread = sw * (0.4 + 0.6 * y / vh);   // nach unten breiter, wie ein Lichtweg auf Wellen
      add(sx + rand(-1, 1) * spread, y, true);
    }
    el.glints.innerHTML = html;
  }

  function layout() {
    vw = document.documentElement.clientWidth;
    vh = window.innerHeight;
    side = HubScene.beside(card);
    var strip = side.strip;
    full = strip >= 200;
    tight = !full && strip >= 100;
    k = strip >= 560 ? 3 : full ? 2 : 1;
    root.classList.toggle('is-full', full);
    root.classList.toggle('is-tight', tight);
    root.classList.toggle('is-bare', !full && !tight);
    root.style.setProperty('--k', k);
    root.style.setProperty('--cl', side.cl + 'px');
    root.style.setProperty('--cr', side.cr + 'px');
    root.style.setProperty('--strip', strip + 'px');
    glints();
    place();
    populate(true);
  }

  // ── Schwimmer ───────────────────────────────────────────────────────────
  // Plätze im Wasser: rechts über die ganze Höhe, links unter dem Schild und um die Angel herum
  function spots(n) {
    var r = card.getBoundingClientRect();
    var lane = function (sx, lo, hi) { return { x0: sx === 'l' ? 12 : r.right + 60, x1: sx === 'l' ? r.left - 60 : vw - 12, lo: lo, hi: hi, side: sx }; };
    var lanes = [];
    if (full) {
      lanes.push(lane('r', vh * 0.12, vh * 0.94));
      if (bob.y + 130 < vh - 40) lanes.push(lane('l', bob.y + 130, vh - 30));
      if (bob.y - 150 > 200) lanes.push(lane('l', 190, bob.y - 150));
    } else {
      lanes.push(lane('r', vh * 0.12, vh * 0.94), lane('l', vh * 0.12, vh * 0.94));
    }
    // Plätze reihum auf die Bahnen verteilen (rechts zuerst), jede Bahn nur so voll, wie Platz ist –
    // übereinander gleichmäßig verteilt. Was nirgends Platz hat, schwimmt nicht mit.
    var per = lanes.map(function () { return 0; });
    var cap = lanes.map(function (ln) { return Math.max(0, Math.floor((ln.hi - ln.lo) / (70 * k))); });
    for (var i = 0, li = 0, tries = 0; i < n && tries < n * lanes.length; tries++, li = (li + 1) % lanes.length) {
      if (per[li] < cap[li]) { per[li]++; i++; }
    }
    var out = [];
    lanes.forEach(function (ln, li) {
      for (var j = 0; j < per[li]; j++) {
        var y = ln.lo + (ln.hi - ln.lo) * (j + 0.5) / per[li];
        out.push({ x: (ln.x0 + ln.x1) / 2, w: ln.x1 - ln.x0, y: y + rand(-14, 14), side: ln.side });
      }
    });
    return out;
  }

  function swimmer(m, spot, i) {
    var url = spriteOf(m.id);
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'km-swim is-gone';
    btn.setAttribute('aria-label', fill(tr().where, { mon: m.name }));
    btn.innerHTML = '<span class="km-path"><span class="km-body"><i class="km-ring"></i><i class="km-ring"></i><i class="km-wake"></i>' +
      '<span class="km-up"></span><span class="km-down"></span></span><span class="km-tag"><b></b><small></small></span></span>';
    btn.querySelector('.km-tag b').textContent = m.name;
    btn.querySelector('.km-tag small').textContent = fill(tr().swim, { how: data.surfName, p: m.p });
    btn.addEventListener('click', function () { if (data && data.open) data.open(m.id); });
    var s = { el: btn, id: m.id, dead: false };
    load(url, function (b) {
      if (!b || s.dead) return;   // Ort inzwischen gewechselt
      var W = b.w * k, H = b.h * k, wl = Math.round((b.t + (b.b - b.t) * 0.6) * k), cw = (b.r - b.l) * k;
      var cx = (b.l + b.r) / 2 * k;
      var a = Math.round(clamp(spot.w / 2 - cw / 2 - 10, 0, 150));
      var st = btn.style;
      st.width = W + 'px'; st.height = H + 'px';
      // Start am rechten Ende der Bahn, schwimmt nach links (Blickrichtung der Platin-Sprites) und zurück
      st.left = Math.round(spot.x + a - cx) + 'px';
      st.top = Math.round(spot.y - wl) + 'px';
      st.setProperty('--a', a + 'px');
      st.setProperty('--wl', wl + 'px');
      st.setProperty('--cx', cx + 'px');
      st.setProperty('--cw', cw + 'px');
      st.setProperty('--hd', (b.t * k) + 'px');
      st.setProperty('--rx', (b.r * k) + 'px');
      st.setProperty('--sink', ((b.b - b.t) * k + 8) + 'px');
      st.setProperty('--dur', rand(16, 26).toFixed(1) + 's');
      st.setProperty('--delay', (-rand(0, 20)).toFixed(1) + 's');
      btn.querySelector('.km-up').appendChild(sprite(url, b));
      btn.querySelector('.km-down').appendChild(sprite(url, b));
      el.pod.appendChild(btn);
      // Auftauchen: erst unter Wasser einsetzen, dann hoch
      setTimeout(function () { btn.classList.remove('is-gone'); }, 60 + i * 180);
    });
    return s;
  }

  // Wer schwimmt: Surf-Begegnungen ohne Flieger, höchstens sechs Arten; eine Art allein kommt zu zweit
  function swimList() {
    if (!data) return [];
    var seen = {}, list = [];
    data.surf.forEach(function (m) {
      if (FLY.indexOf(m.id) >= 0) return;
      if (seen[m.id]) { seen[m.id].p = Math.max(seen[m.id].p, m.p); return; }
      seen[m.id] = { id: m.id, name: m.name, p: m.p };
      list.push(seen[m.id]);
    });
    list.sort(function (a, b) { return b.p - a.p; });
    list = list.slice(0, 6);
    if (list.length === 1) list.push(list[0]);
    return list;
  }

  function populate(now) {
    var old = swimmers;
    swimmers = [];
    old.forEach(function (s) {
      s.dead = true;
      if (now) { s.el.remove(); return; }
      s.el.classList.add('is-gone');   // abtauchen
      setTimeout(function () { s.el.remove(); }, 900);
    });
    var run = ++popRun;
    if (!full && !tight) return;
    var list = swimList(), at = spots(list.length);
    setTimeout(function () {
      if (run !== popRun) return;   // schon wieder ein anderer Ort
      list.forEach(function (m, i) { if (at[i]) swimmers.push(swimmer(m, at[i], i)); });
    }, now ? 0 : 500);
  }

  // ── Flieger ─────────────────────────────────────────────────────────────
  var flyTimer = null;
  function flyers() {
    if (!data) return SEA_BIRDS;
    var list = data.surf.concat(data.land).filter(function (m) { return FLY.indexOf(m.id) >= 0; });
    return list.length ? list : SEA_BIRDS;
  }
  function scheduleFly(ms) {
    clearTimeout(flyTimer);
    flyTimer = setTimeout(fly, ms != null ? ms : rand(7000, 14000));
  }
  // Quer über das Meer (hinter der Karte durch), der Schatten fällt nach rechts unten aufs Wasser
  function fly() {
    scheduleFly();
    if (document.hidden || reduce.matches || (!full && !tight)) return;
    var m = weighted(flyers()), url = spriteOf(m.id);
    load(url, function (b) {
      if (!b) return;
      var W = b.w * k, H = b.h * k, dir = Math.random() < 0.5 ? 1 : -1;
      var box = document.createElement('div');
      box.className = 'km-fly' + (dir > 0 ? ' is-right' : '');
      box.style.width = W + 'px'; box.style.height = H + 'px';
      box.appendChild(sprite(url, b, 'km-fly-shadow'));
      box.appendChild(sprite(url, b, 'km-fly-mon'));
      el.air.appendChild(box);
      var y0 = rand(vh * 0.06, vh * 0.7), y1 = y0 + rand(-0.18, 0.18) * vh;
      var x0 = dir > 0 ? -W - 80 * k : vw + 40, x1 = dir > 0 ? vw + 40 : -W - 80 * k;
      var ms = Math.abs(x1 - x0) / rand(110, 170) * 1000;
      var run = box.animate([
        { transform: 'translate(' + x0 + 'px,' + y0 + 'px)' },
        { transform: 'translate(' + x1 + 'px,' + y1 + 'px)' }
      ], { duration: ms, easing: 'linear' });
      run.onfinish = run.oncancel = function () { box.remove(); };
    });
  }

  // ── Angeln ──────────────────────────────────────────────────────────────
  // Spritzer an der Wasserlinie: zwei Ringe und ein paar Tropfen
  function splash(x, y, big) {
    var s = document.createElement('div');
    s.className = 'km-splash' + (big ? ' is-big' : '');
    s.style.left = x + 'px'; s.style.top = y + 'px';
    s.innerHTML = '<i class="km-ring"></i><i class="km-ring"></i><b></b><b></b><b></b><b></b>';
    el.sky.appendChild(s);
    setTimeout(function () { s.remove(); }, 1100);
  }

  // Pokémon springt bei (x, y) aus dem Wasser und taucht wieder ein; info = Schild am höchsten Punkt (beim Angeln)
  function leap(x, y, url, kk, info, done) {
    load(url, function (b) {
      if (!b) { if (done) done(); return; }
      var W = b.w * kk, H = b.h * kk, body = (b.b - b.t) * kk, top = b.t * kk;
      var rise = body + 24 * kk, room = rise + top + 40, pad = 60 * kk;
      // Behälter endet an der Wasserlinie: was darunter liegt, ist noch im Wasser (seitlich Platz für den Bogen)
      var box = document.createElement('div');
      box.className = 'km-leap';
      box.style.left = Math.round(x - (b.l + b.r) / 2 * kk - pad) + 'px';
      box.style.top = Math.round(y - room) + 'px';
      box.style.width = (W + 2 * pad) + 'px'; box.style.height = room + 'px';
      var img = sprite(url, b);
      img.style.width = W + 'px'; img.style.height = H + 'px';
      img.style.left = pad + 'px';
      img.style.top = (room - top) + 'px';
      box.appendChild(img);
      el.sky.appendChild(box);
      var hold = info ? 2200 : 300, up = 520, down = 480, ms = up + hold + down;
      var drift = (info ? -16 : -40) * kk;
      img.animate([
        { transform: 'translate(0,0) rotate(24deg)', easing: 'cubic-bezier(.2,.7,.4,1)' },
        { transform: 'translate(' + drift * 0.4 + 'px,' + (-rise) + 'px) rotate(0deg)', offset: up / ms, easing: 'ease-in-out' },
        { transform: 'translate(' + drift * 0.6 + 'px,' + (-rise + 6 * kk) + 'px) rotate(-4deg)', offset: (up + hold) / ms, easing: 'cubic-bezier(.6,0,.8,.4)' },
        { transform: 'translate(' + drift + 'px,0) rotate(-26deg)' }
      ], { duration: ms, fill: 'forwards' });
      splash(x, y, !!info);
      setTimeout(function () { splash(x + drift, y, false); }, ms - 120);
      if (info) {
        var tag = document.createElement('div');
        tag.className = 'km-catch' + (info.shiny ? ' is-shiny' : '');
        tag.innerHTML = '<b></b><small></small>' + (info.shiny ? '<em></em>' : '');
        tag.querySelector('b').textContent = info.name + ' · ' + fill(tr().lv, { n: info.lv });
        tag.querySelector('small').textContent = info.odds;
        if (info.shiny) tag.querySelector('em').textContent = '✦ ' + tr().shiny;
        tag.style.left = Math.round(x + drift * 0.5) + 'px';
        tag.style.top = Math.max(84, Math.round(y - rise - 10)) + 'px';   // über dem Kopf am höchsten Punkt
        el.sky.appendChild(tag);
        setTimeout(function () { tag.classList.add('is-on'); }, up - 80);
        setTimeout(function () { tag.classList.remove('is-on'); }, up + hold + 900);
        setTimeout(function () { tag.remove(); }, up + hold + 1300);
      }
      setTimeout(function () { box.remove(); if (done) done(); }, ms + 60);
    });
  }

  // „Angeln!“: Biss am Schwimmer, dann ein Pokémon aus der Liste der besten Angel – mit den echten Chancen
  function cast() {
    if (busy || !data || !data.rod || !full) return;
    busy = true;
    el.cast.disabled = true;
    var area = data.rod.areas[Math.floor(Math.random() * data.rod.areas.length)];
    var m = weighted(area.list), shiny = Math.random() < 1 / 8192;
    var lv = m.min + Math.floor(Math.random() * (m.max - m.min + 1));
    var url = spriteOf(m.id, shiny);
    load(url, function () {});   // schon laden, während es beißt
    root.classList.remove('is-nibble');
    root.classList.add('is-bite');
    setTimeout(function () {
      root.classList.remove('is-bite');
      root.classList.add('is-hooked');
      var odds = [data.rod.name, area.area, m.p + ' %'].filter(Boolean).join(' · ');
      leap(bob.x, bob.y, url, k, { name: m.name, lv: lv, odds: odds, shiny: shiny }, function () {
        root.classList.remove('is-hooked');
        busy = false;
        el.cast.disabled = false;
      });
    }, 950);
  }
  el.cast.addEventListener('click', cast);
  el.bob.addEventListener('click', cast);

  // Ruhiges Wasser: ab und zu zupft es am Schwimmer, irgendwo springt ein Pokémon aus der Angel-Liste
  var lifeTimer = null;
  function life() {
    clearTimeout(lifeTimer);
    lifeTimer = setTimeout(life, rand(6000, 11000));
    if (document.hidden || reduce.matches || busy || !data) return;
    if (full && data.rod && Math.random() < 0.55) {
      root.classList.add('is-nibble');
      setTimeout(function () { root.classList.remove('is-nibble'); }, 900);
      return;
    }
    if ((!full && !tight) || !data.rod) return;
    var r = card.getBoundingClientRect(), right = Math.random() < 0.6 || !full;
    var x0 = right ? r.right + 70 : 30, x1 = right ? vw - 30 : r.left - 70;
    if (x1 - x0 < 60) return;
    var area = data.rod.areas[0];
    leap(rand(x0, x1), rand(vh * 0.2, vh * 0.85), spriteOf(weighted(area.list).id), Math.max(1, k - 1), null);
  }

  // ── Schild ──────────────────────────────────────────────────────────────
  function label() {
    var t = tr();
    el.kick.textContent = t.kick;
    el.place.textContent = data.place;
    el.how.textContent = !data.picked ? t.pick : data.how.length ? data.how.join(' · ') : t.dry;
    el.castT.textContent = t.fish;
    el.castRod.textContent = data.rod ? data.rod.name : '';
    el.cast.setAttribute('aria-label', data.rod ? fill(t.fishAria, { rod: data.rod.name }) : t.fish);
    swimmers.forEach(function (s) {
      var m = swimList().filter(function (x) { return x.id === s.id; })[0];
      if (!m) return;
      s.el.setAttribute('aria-label', fill(t.where, { mon: m.name }));
      s.el.querySelector('.km-tag b').textContent = m.name;
      s.el.querySelector('.km-tag small').textContent = fill(t.swim, { how: data.surfName, p: m.p });
    });
  }

  function update(d) {
    data = d;
    root.classList.toggle('has-rod', !!d.rod);
    var next = d.key + '|' + swimList().map(function (m) { return m.id; }).join(',');
    if (next !== key) {
      var first = !key;
      key = next;
      populate(first);
      if (first) { scheduleFly(1800); life(); }
    }
    label();
  }

  var raf = 0;
  window.addEventListener('scroll', function () {
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; place(); });
  }, { passive: true });
  var resizeTimer = null;
  var relayout = function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); };
  window.addEventListener('resize', relayout);
  if (window.ResizeObserver) new ResizeObserver(function () { place(); }).observe(card);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) scheduleFly(1500); });
  layout();

  return { update: update };
})();
