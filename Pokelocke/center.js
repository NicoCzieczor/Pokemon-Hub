/*
 * „Rast im Pokémon-Center" neben Solo Nuzlocke: Die Seite ist das Erdgeschoss eines Pokémon-Centers aus Platin,
 * aus den Spieldaten gerendert (tools/build-center.py) – links Theke, Heilmaschine und Schwester Joy, rechts Kasse,
 * PC und Rolltreppe. Die Karte steht mitten im Raum. Das Team läuft als Begleiter-Pokémon herum – Nr. 1–493 die aus
 * HeartGold/SoulSilver, danach Fan-Sprites im selben Stil (tools/build-followers.py, followers/CREDITS.md) –, Kachel
 * für Kachel wie im Spiel; unten Textfenster in Schrift und Rahmen des Spiels.
 *
 *   Pokémon anklicken   → im Team fokussieren („!"-Blase, Name)
 *   Joy / Heilmaschine  → heilen: Bälle auf die Maschine, Blinken, Joy verbeugt sich, alle kommen wieder heraus
 *   PC                  → Box öffnen (der Bildschirm geht an)
 *   Spieler             → Lucas ↔ Lucia (dieselbe Wahl wie im Dex)
 *   Neu im Team: kommt aus dem Ball, in die Box: zurück in den Ball, besiegt (Nuzlocke): verblasst, Joy trauert.
 *
 * Alles ist in Raum-Pixeln des Renders angegeben (1 Kachel = 16 px) und wird ganzzahlig vergrößert (--s), damit die
 * Pixel scharf bleiben. Farben und Aussehen: center.css. Platz neben der Karte: scene.js (HubScene.beside).
 *
 *   CenterScene.update({ team: [{ key, name, dex } | null] × 6, focus: Index | -1, box, boxMax, graves: [key] })
 *   Klicks gehen als Ereignis „solosceneaction" ({ action: 'slot' | 'box', slot }) an main.js.
 */
window.CenterScene = (function () {
  'use strict';

  var root = document.getElementById('pcs');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {} };

  var BASE = 'center/';
  var REDUCED = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;

  var TR = {
    de: {
      hello: 'Willkommen im Pokémon-Center! Wir pflegen deine erschöpften Pokémon wieder gesund.',
      ask: 'Soll ich deine Pokémon behandeln?',
      none: 'Willkommen im Pokémon-Center! Oh … du hast ja noch gar keine Pokémon dabei.',
      take: 'Okay, ich nehme deine Pokémon für einen Moment.',
      done: 'Danke fürs Warten! Deine Pokémon sind wieder topfit.',
      bye: 'Wir hoffen, dich bald wiederzusehen!',
      lost: 'Oh nein … für {n} kommt jede Hilfe zu spät.',
      lost2: '{n} wird in deinem Herzen weiterleben.',
      pc: 'Jemandes PC', box: 'Box {b}/{m}', graves: 'Friedhof {g}',
      pcOn: 'Zugriff auf Jemandes PC. Das Pokémon-Lager wurde geöffnet.',
      out: '{n} wurde ins Team geholt.', in: '{n} wurde in die Box gebracht.'
    },
    en: {
      hello: 'Welcome to the Pokémon Center! We restore your tired Pokémon to full health.',
      ask: 'Would you like me to heal your Pokémon?',
      none: 'Welcome to the Pokémon Center! Oh … you don’t have any Pokémon with you yet.',
      take: 'OK, I’ll take your Pokémon for a few seconds.',
      done: 'Thank you for waiting! Your Pokémon are fighting fit.',
      bye: 'We hope to see you again!',
      lost: 'Oh no … there is nothing more we can do for {n}.',
      lost2: '{n} will live on in your heart.',
      pc: 'Someone’s PC', box: 'Box {b}/{m}', graves: 'Graves {g}',
      pcOn: 'Accessed Someone’s PC. Pokémon Storage System opened.',
      out: '{n} joined the team.', in: '{n} was sent to the box.'
    }
  };
  var tr = function () { return TR[window.LANG] || TR.de; };
  var fill = function (s, v) { return s.replace(/\{(\w)\}/g, function (_, k) { return v[k]; }); };

  // ── Raum: Ausschnitte des Renders (room-l.png ab Leinwand x 16, room-r.png ab x 152; beide ab y 398) ──
  var ROOM = { l: { w: 144, ox: 16 }, r: { w: 108, ox: 152 } };
  var ROOM_H = 196, OY = 398;
  var HIDE = 8;          // so viele Raum-Pixel liegen an der Innenseite unter der Karte
  var MSG_H = 48;        // Textfenster: Rahmen 8 + zwei Zeilen à 16 + Rahmen 8
  var DY = 1;            // Füße der Figuren: Unterkante der Kachel + DY
  var tileLeft = function (side, tx) { return tx * 16 - ROOM[side].ox; };
  var tileTop = function (tz) { return tz * 16 + 384 - OY; };

  // Begehbare Kacheln je Seite (Spalte tx, Reihe tz) – ohne Theke, Hocker, Rolltreppen, PC und den Platz des Spielers
  var FLOOR = { l: {}, r: {} };
  (function () {
    var add = function (side, x0, x1, z0, z1) { for (var x = x0; x <= x1; x++) for (var z = z0; z <= z1; z++) FLOOR[side][x + ':' + z] = true; };
    var cut = function (side, x0, x1, z0, z1) { for (var x = x0; x <= x1; x++) for (var z = z0; z <= z1; z++) delete FLOOR[side][x + ':' + z]; };
    add('l', 1, 8, 4, 12); cut('l', 4, 8, 4, 5); cut('l', 1, 1, 5, 6); cut('l', 1, 2, 8, 11); cut('l', 3, 4, 12, 12); cut('l', 8, 8, 6, 7);   // (8, 6) Spieler, (8, 7) würde ihn verdecken
    add('r', 11, 14, 4, 12); cut('r', 11, 11, 4, 5);   // Spalte 10 läge halb unter der Karte cut('r', 12, 12, 4, 5); cut('r', 14, 14, 9, 12); cut('r', 12, 13, 12, 12);
  })();
  var PLAYER = { x: 8, z: 6 }, NURSE = { x: 8, z: 4 };
  // Mulden der Heilmaschine (linke obere Ecke des 5 × 5-Balls), in der Reihenfolge, in der das Spiel sie füllt
  var SLOTS = [[91, 28], [99, 28], [91, 32], [99, 32], [91, 36], [99, 36]];
  // Formen mit eigenem Begleiter-Bild (PokeAPI-Name → Nr.-Form)
  var FORMS = { 'giratina-origin': '487-1', 'shaymin-sky': '492-1', 'deoxys-attack': '386-1', 'deoxys-defense': '386-2',
    'deoxys-speed': '386-3', 'wormadam-sandy': '413-1', 'wormadam-trash': '413-2', 'rotom-heat': '479-1', 'rotom-wash': '479-2',
    'rotom-frost': '479-3', 'rotom-fan': '479-4', 'rotom-mow': '479-5' };
  var DIRS = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
  var DIR_NAMES = ['down', 'up', 'left', 'right'];

  var side = function (name) {
    return '<div class="pcs-side pcs-side--' + name + '">' +
      '<div class="pcs-room"></div>' +
      '<i class="pcs-esca"></i>' +
      (name === 'l'
        ? '<i class="pcs-fig pcs-nurse"></i><i class="pcs-counter"></i><div class="pcs-balls"></div>' +
          '<button type="button" class="pcs-hit pcs-hit--heal" tabindex="-1"></button>' +
          '<button type="button" class="pcs-fig pcs-player" tabindex="-1"></button>'
        : '<button type="button" class="pcs-pc" tabindex="-1"></button>') +
      '<div class="pcs-floor"></div>' +
      '<canvas class="pcs-msg"></canvas>' +
    '</div>';
  };
  root.innerHTML = side('l') + side('r') + '<canvas class="pcs-label"></canvas>';
  var el = {
    l: root.querySelector('.pcs-side--l'), r: root.querySelector('.pcs-side--r'),
    nurse: root.querySelector('.pcs-nurse'), player: root.querySelector('.pcs-player'),
    balls: root.querySelector('.pcs-balls'), pc: root.querySelector('.pcs-pc'),
    heal: root.querySelector('.pcs-hit--heal'), label: root.querySelector('.pcs-label'),
    floor: { l: root.querySelector('.pcs-side--l .pcs-floor'), r: root.querySelector('.pcs-side--r .pcs-floor') },
    msg: { l: root.querySelector('.pcs-side--l .pcs-msg'), r: root.querySelector('.pcs-side--r .pcs-msg') }
  };
  SLOTS.forEach(function (p) {
    var b = document.createElement('i');
    b.style.setProperty('--x', p[0]);
    b.style.setProperty('--y', p[1]);
    el.balls.appendChild(b);
  });

  var S = 0;            // Vergrößerung (Bildschirm-Pixel je Raum-Pixel), 0 = kein Platz
  var mons = {};        // key → Begleiter
  // quiet: noch beim Laden – das gespeicherte Team steht einfach da (ohne Bälle, ohne PC-Meldung)
  // busy: Joy ist beschäftigt (Heilen), healing: die Bälle liegen auf der Maschine
  var team = [], focus = -1, graves = [], box = 0, boxMax = 30, first = true, quiet = true, busy = false, healing = false;

  // ── Schrift und Fenster des Spiels (center/font.png, frame.png) auf <canvas> in Raum-Pixeln ──
  var FONT = window.CenterFont || { chars: '', widths: [] };
  var fontImg = new Image(), frameImg = new Image();
  fontImg.src = BASE + 'font.png';
  frameImg.src = BASE + 'frame.png';
  var glyph = function (ch) {
    var i = FONT.chars.indexOf(ch);
    if (i < 0) i = FONT.chars.indexOf(ch.normalize('NFD').charAt(0));
    return i < 0 ? FONT.chars.indexOf('?') : i;
  };
  var textWidth = function (s) { var w = 0; for (var i = 0; i < s.length; i++) w += FONT.widths[glyph(s[i])] || 6; return w; };
  function wrap(text, width) {
    var lines = [], line = '';
    text.split(' ').forEach(function (word) {
      var next = line ? line + ' ' + word : word;
      if (textWidth(next) > width && line) { lines.push(line); line = word; } else line = next;
    });
    if (line) lines.push(line);
    return lines;
  }
  function drawWindow(cv, w, h, lines, upto) {
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; }
    cv.style.setProperty('--cw', w);
    var cx = cv.getContext('2d');
    cx.imageSmoothingEnabled = false;
    cx.clearRect(0, 0, w, h);
    if (frameImg.complete && frameImg.naturalWidth) {
      var f = frameImg, k = 8;
      cx.drawImage(f, k, k, k, k, k, k, w - 2 * k, h - 2 * k);
      cx.drawImage(f, k, 0, k, k, k, 0, w - 2 * k, k);
      cx.drawImage(f, k, 2 * k, k, k, k, h - k, w - 2 * k, k);
      cx.drawImage(f, 0, k, k, k, 0, k, k, h - 2 * k);
      cx.drawImage(f, 2 * k, k, k, k, w - k, k, k, h - 2 * k);
      cx.drawImage(f, 0, 0, k, k, 0, 0, k, k);
      cx.drawImage(f, 2 * k, 0, k, k, w - k, 0, k, k);
      cx.drawImage(f, 0, 2 * k, k, k, 0, h - k, k, k);
      cx.drawImage(f, 2 * k, 2 * k, k, k, w - k, h - k, k, k);
    }
    if (!fontImg.complete || !fontImg.naturalWidth) return;
    var n = upto == null ? Infinity : upto;
    lines.forEach(function (line, row) {
      var x = 10;
      for (var i = 0; i < line.length && n > 0; i++, n--) {
        var g = glyph(line[i]);
        cx.drawImage(fontImg, g * 16, 0, 16, 16, x, 7 + row * 16, 16, 16);
        x += FONT.widths[g] || 6;
      }
    });
  }

  // Textfenster je Seite: Seiten à zwei Zeilen, Buchstabe für Buchstabe, dann die nächste Seite
  var talk = { l: { pages: [], timer: 0 }, r: { pages: [], timer: 0 } };
  function msgWidth(s) {
    var room = s === 'l' ? ROOM.l.w - HIDE : ROOM.r.w - HIDE;
    var strip = S ? Math.floor(HubScene.beside(card).strip / S) : room;
    return Math.max(96, Math.min(strip - 8, 184));
  }
  function say(s, texts, then) {
    var t = talk[s];
    clearTimeout(t.timer);
    var w = msgWidth(s);
    t.pages = [];
    texts.forEach(function (text) {
      var lines = wrap(text, w - 20);
      for (var i = 0; i < lines.length; i += 2) t.pages.push(lines.slice(i, i + 2));
    });
    t.w = w;
    t.then = then;
    page(s, 0);
  }
  function page(s, i) {
    var t = talk[s], lines = t.pages[i];
    if (!lines) { if (t.then) { var f = t.then; t.then = null; f(); } return; }
    t.at = i;
    var total = lines.join('').length, n = REDUCED ? total : 0;
    var step = function () {
      drawWindow(el.msg[s], t.w, MSG_H, lines, n);
      if (n < total) { n++; t.timer = setTimeout(step, 30); return; }
      if (i + 1 < t.pages.length || t.then) t.timer = setTimeout(function () { page(s, i + 1); }, 2000);
    };
    step();
  }
  function idleText() {
    var t = tr(), any = team.some(Boolean);
    if (!busy) say('l', any ? [t.hello, t.ask] : [t.none]);
    pcText();
  }
  function pcText(extra) {
    var t = tr();
    var lines = [t.pc, fill(t.box, { b: box, m: boxMax }) + '   ' + fill(t.graves, { g: graves.length })];
    if (extra) say('r', [extra], function () { say('r', [lines.join(' ')]); });
    else drawStatic('r', lines);
  }
  function drawStatic(s, lines) {
    clearTimeout(talk[s].timer);
    talk[s].w = msgWidth(s);
    talk[s].pages = [lines];
    drawWindow(el.msg[s], talk[s].w, MSG_H, lines);
  }

  // ── Figuren (32 × 32-Blätter nebeneinander) ──
  var who = 'lucas';
  try { if (localStorage.getItem('hub-dex-trainer') === 'lucia') who = 'lucia'; } catch (e) { /* ohne Speicher: Lucas */ }
  var frame = function (node, k) { node.style.setProperty('--f', k); };
  function setPlayer() {
    el.player.className = 'pcs-fig pcs-player is-' + who;
    frame(el.player, 0);
  }
  setPlayer();
  frame(el.nurse, 4);

  // Spieler schaut sich ab und zu um, dann wieder zur Theke
  var lookTimer = 0;
  function lookAround() {
    clearTimeout(lookTimer);
    lookTimer = setTimeout(function () {
      if (!busy && !document.hidden) {
        frame(el.player, [4, 8, 12][Math.floor(Math.random() * 3)]);
        setTimeout(function () { if (!busy) frame(el.player, 0); }, 1400 + Math.random() * 900);
      }
      lookAround();
    }, 6000 + Math.random() * 7000);
  }

  // ── Begleiter ──
  // Bild eines Begleiters: HGSS-Form, eigene Form (raichu-alola …) oder die Art – sonst keins (dann bleibt es im Ball)
  var FOLLOW = window.CenterFollowers || { named: [], missing: [], max: 493 };
  function spriteFor(m) {
    if (FORMS[m.key]) return 'followers/' + FORMS[m.key] + '.png';
    if (FOLLOW.named.indexOf(m.key) >= 0) return 'followers/' + m.key + '.png';
    if (m.dex >= 1 && m.dex <= FOLLOW.max && FOLLOW.missing.indexOf(m.dex) < 0) return 'followers/' + m.dex + '.png';
    return '';
  }
  var occupied = function (s, x, z, self) {
    if (s === 'l' && x === PLAYER.x && z === PLAYER.z) return true;
    return Object.keys(mons).some(function (k) { var o = mons[k]; return o !== self && o.side === s && ((o.x === x && o.z === z) || (o.tx === x && o.tz === z)); });
  };
  function freeTile(s, near) {
    var tiles = Object.keys(FLOOR[s]).map(function (k) { var p = k.split(':'); return { x: +p[0], z: +p[1] }; })
      .filter(function (p) { return !occupied(s, p.x, p.z); });
    if (near) tiles.sort(function (a, b) { return Math.abs(a.x - near.x) + Math.abs(a.z - near.z) - Math.abs(b.x - near.x) - Math.abs(b.z - near.z); });
    else tiles.sort(function () { return Math.random() - 0.5; });
    return tiles[0] || null;
  }
  function place(o) {
    if (!S || !o.size) return;
    var left = tileLeft(o.side, o.x) + 8 - o.size / 2, top = tileTop(o.z) + 16 + DY - o.size;
    o.node.style.transform = 'translate(' + left * S + 'px,' + top * S + 'px)';
    o.node.style.zIndex = 10 + o.z * 2;
  }
  function face(o, dir) {
    o.dir = dir;
    o.spr.dataset.dir = dir;
  }
  function makeMon(m, s, tile, effect) {
    var o = { key: m.key, name: m.name, side: s, x: tile.x, z: tile.z, dir: 'down', size: 0, lead: false };
    var node = document.createElement('button');
    node.type = 'button';
    node.tabIndex = -1;
    node.className = 'pcs-mon';
    node.dataset.key = m.key;
    node.innerHTML = '<i class="pcs-mon-fx"><i class="pcs-mon-spr"></i></i>';
    o.node = node;
    o.fx = node.firstChild;
    o.spr = o.fx.firstChild;
    face(o, 'down');
    if (healing) { o.fx.classList.add('is-away'); effect = null; }   // kommt am Ende des Heilens mit den anderen heraus
    var src = spriteFor(m);
    var img = new Image();
    img.onload = function () {
      o.size = img.naturalHeight;
      o.spr.style.backgroundImage = 'url("' + src + '")';
      node.style.setProperty('--fs', o.size);
      place(o);
      node.classList.add('is-ready');
      if (effect) pop(o, effect);
    };
    img.src = src;
    node.addEventListener('click', function () {
      var i = team.findIndex(function (t) { return t && t.key === o.key; });
      if (i >= 0) document.dispatchEvent(new CustomEvent('solosceneaction', { detail: { action: 'slot', slot: i } }));
      bubble(o);
    });
    node.addEventListener('mouseenter', function () { showLabel(o); });
    node.addEventListener('mouseleave', hideLabel);
    el.floor[s].appendChild(node);
    mons[m.key] = o;
    wander(o);
    return o;
  }
  // Ein Schritt: 16 Bilder lang je 1 Raum-Pixel (wie im Spiel), danach steht die Figur wieder auf einer Kachel
  function step(o, dir) {
    var d = DIRS[dir], nx = o.x + d[0], nz = o.z + d[1];
    face(o, dir);
    if (!FLOOR[o.side][nx + ':' + nz] || occupied(o.side, nx, nz, o)) return;
    if (o.lead && Math.abs(nx - PLAYER.x) + Math.abs(nz - PLAYER.z) > 2) return;
    o.tx = nx; o.tz = nz;
    var from = o.node.style.transform;
    var oz = o.z;
    o.x = nx; o.z = nz;
    place(o);
    o.node.style.zIndex = 10 + Math.max(oz, nz) * 2;
    o.spr.classList.add('is-walking');
    var to = o.node.style.transform;
    var done = function () { o.spr.classList.remove('is-walking'); o.tx = o.tz = null; o.node.style.zIndex = 10 + o.z * 2; };
    if (o.node.animate && from) {
      var a = o.node.animate([{ transform: from }, { transform: to }], { duration: 267, easing: 'steps(16, end)' });
      a.onfinish = done;
    } else done();
  }
  function wander(o) {
    clearTimeout(o.timer);
    if (REDUCED) return;
    o.timer = setTimeout(function () {
      if (mons[o.key] !== o) return;
      if (!document.hidden && !busy && o.size) {
        var r = Math.random();
        if (r < 0.5) step(o, DIR_NAMES[Math.floor(Math.random() * 4)]);
        else if (r < 0.85) face(o, DIR_NAMES[Math.floor(Math.random() * 4)]);
        else if (o.side === 'l') face(o, Math.abs(o.x - PLAYER.x) > Math.abs(o.z - PLAYER.z) ? (o.x < PLAYER.x ? 'right' : 'left') : (o.z < PLAYER.z ? 'down' : 'up'));
        else face(o, 'down');
      }
      wander(o);
    }, 1300 + Math.random() * 2900);
  }
  // Heraus aus dem Ball (weißer Blitz) / zurück hinein (rot, schrumpft) / besiegt (verblasst)
  function pop(o, kind, then) {
    var cls = 'is-' + kind;
    o.fx.classList.remove('is-out', 'is-in', 'is-lost', 'is-away');
    void o.fx.offsetWidth;
    o.fx.classList.add(cls);
    var ms = kind === 'lost' ? 1600 : 420;
    setTimeout(function () {
      o.fx.classList.remove(cls);
      if (kind !== 'out') o.fx.classList.add('is-away');   // im Ball bzw. fort: unsichtbar, bis es wieder herauskommt
      if (then) then();
    }, ms);
  }
  function removeMon(o, kind) {
    clearTimeout(o.timer);
    delete mons[o.key];
    if (o.fx.classList.contains('is-away')) o.node.remove();   // steckt gerade im Ball (Heilen)
    else pop(o, kind, function () { o.node.remove(); });
  }
  // „!"-Blase und Namensfenster über einem Begleiter
  function bubble(o) {
    if (!o.size) return;
    var b = document.createElement('i');
    b.className = 'pcs-see';
    b.style.setProperty('--fs', o.size);
    o.node.appendChild(b);
    face(o, 'down');
    setTimeout(function () { b.remove(); }, 1100);
    showLabel(o, 2200);
  }
  var labelTimer = 0;
  function showLabel(o, ms) {
    if (!S || !o.size) return;
    clearTimeout(labelTimer);
    var w = textWidth(o.name) + 20;
    drawWindow(el.label, w, 32, [o.name]);
    var host = el[o.side].getBoundingClientRect();
    var left = tileLeft(o.side, o.x) + 8 - w / 2, top = tileTop(o.z) + 16 + DY - o.size - 30;
    el.label.style.transform = 'translate(' + Math.round(host.left + left * S) + 'px,' + Math.round(host.top + top * S) + 'px)';
    el.label.classList.add('is-on');
    if (ms) labelTimer = setTimeout(hideLabel, ms);
  }
  function hideLabel() { el.label.classList.remove('is-on'); }

  // ── Team abgleichen: wer ist neu, wer ging in die Box, wer wurde besiegt ──
  function sync(next) {
    var keys = next.filter(Boolean).map(function (m) { return m.key; });
    var gone = Object.keys(mons).filter(function (k) { return keys.indexOf(k) < 0; });
    var t = tr(), news = [];
    gone.forEach(function (k) {
      var o = mons[k], died = graves.indexOf(k) >= 0 && !quiet;
      if (died) {
        removeMon(o, 'lost');
        if (!busy) say('l', [fill(t.lost, { n: o.name }), fill(t.lost2, { n: o.name })], function () { setTimeout(idleText, 2500); });
      } else {
        removeMon(o, 'in');
        pcBlink(fill(t.in, { n: o.name }));
      }
    });
    var count = { l: 0, r: 0 };
    Object.keys(mons).forEach(function (k) { count[mons[k].side]++; });
    next.forEach(function (m) {
      if (!m) return;
      var o = mons[m.key];
      if (o) { o.name = m.name; return; }
      if (!spriteFor(m)) return;
      var s = count.l <= count.r ? 'l' : 'r';
      var tile = freeTile(s, s === 'l' && !count.l ? { x: PLAYER.x - 1, z: PLAYER.z + 1 } : s === 'r' && !quiet ? { x: 12, z: 5 } : null);
      if (!tile) return;
      count[s]++;
      makeMon(m, s, tile, quiet ? null : 'out');
      if (!quiet) news.push(m.name);
    });
    if (news.length) pcBlink(fill(t.out, { n: news.join(', ') }));
    // Das erste Pokémon im Team bleibt in der Nähe des Spielers
    var lead = next.find(Boolean);
    Object.keys(mons).forEach(function (k) { mons[k].lead = !!lead && k === lead.key && mons[k].side === 'l'; });
  }

  // PC: Bildschirm an (pc_moni 1 → 4), Text, nach ein paar Sekunden wieder aus
  var pcTimer = 0;
  function pcBlink(text) {
    clearTimeout(pcTimer);
    el.pc.classList.remove('is-off');
    el.pc.classList.add('is-on');
    pcText(text);
    pcTimer = setTimeout(function () {
      el.pc.classList.remove('is-on');
      el.pc.classList.add('is-off');
    }, 4200);
  }

  // ── Heilen: wie im Spiel, nur ohne Jingle ──
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, REDUCED ? Math.min(ms, 60) : ms); }); };
  function sayP(s, texts) { return new Promise(function (r) { say(s, texts, r); }); }
  function heal() {
    if (busy || !S) return;
    var list = Object.keys(mons).map(function (k) { return mons[k]; }).filter(function (o) { return o.size; });
    if (!list.length) { say('l', [tr().none]); return; }
    busy = healing = true;
    var t = tr();
    frame(el.player, 0);
    frame(el.nurse, 4);
    var talked = sayP('l', [t.take]);
    wait(500).then(function () {
      list.forEach(function (o, i) { setTimeout(function () { clearTimeout(o.timer); pop(o, 'in'); }, i * 120); });
      return wait(600 + list.length * 120);
    }).then(function () {
      // Spieler gibt die Bälle ab (12 Bilder des Heil-Blatts)
      var k = 0;
      var tick = setInterval(function () { frame(el.player, 16 + k); if (++k > 11) { clearInterval(tick); frame(el.player, 0); } }, 70);
      return wait(900);
    }).then(function () {
      frame(el.nurse, 8);
      el.balls.classList.add('is-on');
      var balls = el.balls.children;
      for (var i = 0; i < 6; i++) balls[i].className = '';
      var n = Math.min(6, list.length);
      return [0, 1, 2, 3, 4, 5].slice(0, n).reduce(function (p, i) {
        return p.then(function () { balls[i].className = 'is-in'; return wait(330); });
      }, Promise.resolve()).then(function () { return wait(250); });
    }).then(function () {
      el.balls.classList.add('is-glow');
      return wait(2300);
    }).then(function () {
      el.balls.classList.remove('is-glow', 'is-on');
      frame(el.nurse, 4);
      return talked;
    }).then(function () {
      var shown = sayP('l', [t.done]);
      return wait(900).then(function () {
        frame(el.nurse, 16);
        return wait(700);
      }).then(function () {
        frame(el.nurse, 4);
        // alle, die im Ball stecken – auch wer während des Heilens ins Team kam
        healing = false;
        Object.keys(mons).map(function (k) { return mons[k]; }).filter(function (o) { return o.fx.classList.contains('is-away'); })
          .forEach(function (o, i) { setTimeout(function () { if (mons[o.key] === o) { pop(o, 'out'); wander(o); } }, i * 120); });
        return shown;
      });
    }).then(function () {
      busy = false;
      return sayP('l', [t.bye]);
    }).then(function () {
      setTimeout(function () { if (!busy) idleText(); }, 3200);
    });
  }
  el.heal.addEventListener('click', heal);
  el.player.addEventListener('click', function () {
    who = who === 'lucas' ? 'lucia' : 'lucas';
    try { localStorage.setItem('hub-dex-trainer', who); } catch (e) { /* nur für diesen Besuch */ }
    setPlayer();
    el.player.classList.add('is-hop');
    setTimeout(function () { el.player.classList.remove('is-hop'); }, 320);
  });
  el.pc.addEventListener('click', function () {
    pcBlink(tr().pcOn);
    document.dispatchEvent(new CustomEvent('solosceneaction', { detail: { action: 'box' } }));
  });
  el.msg.l.addEventListener('click', function () { var t = talk.l; if (t.pages[t.at + 1]) { clearTimeout(t.timer); page('l', t.at + 1); } });

  // ── Lage neben der Karte ──
  function layout() {
    var b = HubScene.beside(card);
    var vw = document.documentElement.clientWidth, vh = document.documentElement.clientHeight;
    var cardLeft = b.left, cardRight = vw - b.right;
    var s = Math.min(4, Math.floor((b.strip + 40) / (ROOM.l.w - HIDE)));
    var tall = ROOM_H + 6 + MSG_H;
    while (s >= 2 && tall * s > vh - 24) s--;
    S = s >= 2 ? s : 0;
    root.classList.toggle('is-bare', !S);
    if (!S) return;
    root.style.setProperty('--s', S);
    var top = Math.max(12, Math.round((vh - tall * S) * 0.42));
    el.l.style.transform = 'translate(' + Math.round(cardLeft - (ROOM.l.w - HIDE) * S) + 'px,' + top + 'px)';
    el.r.style.transform = 'translate(' + Math.round(cardRight - HIDE * S) + 'px,' + top + 'px)';
    // Textfenster: an der Innenkante, so breit wie Platz ist
    el.msg.l.style.left = ((ROOM.l.w - HIDE) - msgWidth('l') - 4) * S + 'px';
    el.msg.r.style.left = (HIDE + 4) * S + 'px';
    Object.keys(mons).forEach(function (k) { place(mons[k]); });
    ['l', 'r'].forEach(function (s2) {
      var t = talk[s2];
      t.w = msgWidth(s2);
      if (t.pages.length) drawWindow(el.msg[s2], t.w, MSG_H, t.pages[t.at || 0] || t.pages[0]);
    });
  }

  function update(data) {
    data = data || {};
    var next = (data.team || []).slice(0, 6).map(function (m) { return m && m.key ? m : null; });
    graves = data.graves || [];
    box = data.box || 0;
    boxMax = data.boxMax || 30;
    var changed = next.map(function (m) { return m ? m.key : ''; }).join() !== team.map(function (m) { return m ? m.key : ''; }).join();
    var had = team.some(Boolean), has = next.some(Boolean);
    if (first) {
      first = false;
      layout();
      lookAround();
      setTimeout(function () { quiet = false; }, 3000);
    }
    if (changed) sync(next);
    next.forEach(function (m) { if (m && mons[m.key]) mons[m.key].name = m.name; });   // Sprache gewechselt
    team = next;
    if (data.focus !== focus) {
      focus = data.focus;
      var f = team[focus] && mons[team[focus].key];
      if (f && !quiet) bubble(f);
    }
    if (has) quiet = false;   // ab dem ersten geladenen Team zählt jede Änderung
    if (had !== has || !talk.l.pages.length) idleText();
    else if (!busy) pcText();
  }

  var resizeTimer = 0;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 80); });
  if (window.ResizeObserver) new ResizeObserver(function () { layout(); }).observe(card);
  document.addEventListener('langchange', function () { if (!busy) idleText(); });
  fontImg.onload = frameImg.onload = function () { layout(); };
  layout();

  return { update: update, heal: heal };
})();
