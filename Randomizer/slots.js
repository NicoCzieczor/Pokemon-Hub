/*
 * „Spielhalle“ hinter dem Randomizer (wie die Spielhalle in Schleiede): links ein Spielautomat mit drei Walzen –
 * so viele, wie es Starter gibt. Ohne ROM leuchtet der Münzschlitz („ROM einwerfen“), mit ROM zieht man am Hebel
 * (= „Neues Spiel würfeln“). Beim Würfeln drehen sich die Walzen, die Lichter laufen, oben steht der Schritt.
 * Fertig: die Walzen halten auf Pokébällen – erst wenn man die Starter auf der Seite aufklappt, drehen sie auf die
 * echten neuen Starter (sonst wäre die Überraschung weg). Rechts druckt der Automat ein Ticket fürs neue Spiel
 * (Klick = herunterladen), daneben tanzt Piepi, das Maskottchen der Spielhalle.
 * Farben und Aussehen: slots.css. Platz neben der Karte: scene.js (HubScene.beside).
 *
 *   SlotScene.update(data)  – nach jedem Zeichnen (app.js, updateScene):
 *     { rom, busy, phase (Text), secs, error, result: { url, fileName, size (Text), boss, starters: [id] | null } | null,
 *       roll: () => …, pick: () => … }
 */
window.SlotScene = (function () {
  'use strict';

  var PLAT = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/platinum/';
  var BALL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
  // Platin-Sprites gibt es nur bis Nr. 493 – gewürfelte Starter aus Omega Rubin / Alpha Saphir reichen bis 721: dann das
  // normale Pixel-Sprite (Gen 5 im Schwarz/Weiß-Stil, 96 statt 80 px groß → Klasse is-wide gleicht das aus)
  var DEF = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/';
  var monSrc = function (id) { return id <= 493 ? PLAT + id + '.png' : DEF + id + '.png'; };
  var root = document.getElementById('sl');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {} };

  var TR = {
    de: {
      title: 'SPIELHALLE', insert: 'ROM einwerfen', ready: 'Hebel ziehen!', win: 'Neues Spiel!', reveal: 'Starter oben aufklappen',
      error: 'Kein Gewinn …', ticket: 'NEUES SPIEL', boss: 'Boss-Planer: Teams bereit', rolls: 'Gewürfelt: {n}',
      lever: 'Hebel ziehen, um ein neues Spiel zu würfeln', pull: 'ZIEH!', coin: 'Original-Spiel auswählen', get: 'Herunterladen'
    },
    en: {
      title: 'GAME CORNER', insert: 'Insert ROM', ready: 'Pull the lever!', win: 'New game!', reveal: 'Open the starters above',
      error: 'No win …', ticket: 'NEW GAME', boss: 'Boss Planner: teams ready', rolls: 'Rolled: {n}',
      lever: 'Pull the lever to roll a new game', pull: 'PULL!', coin: 'Choose the original game', get: 'Download'
    }
  };
  var tr = function () { return TR[document.documentElement.lang] || TR.de; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var pick = function (a) { return a[Math.floor(Math.random() * a.length)]; };

  // Walzen-Bilder: bekannte Pokémon aus Gen 1–4 und dazwischen der Pokéball
  var POOL = [25, 35, 39, 52, 54, 63, 92, 113, 129, 133, 143, 151, 172, 175, 196, 197, 201, 239, 280, 300, 311, 312, 359, 393, 396, 403, 417, 418, 422, 425, 438, 440, 442, 447, 448, 470, 471, 479];
  var STRIP = 12;   // Bilder je Walze (das erste wiederholt sich am Ende → nahtlose Drehung)

  var reelHtml = function (i) {
    var ids = [];
    for (var j = 0; j < STRIP; j++) ids.push(j % 4 === 2 ? 'ball' : pick(POOL));
    ids.push(ids[0]);
    return '<div class="sl-reel" style="--rd:' + (0.32 + i * 0.05).toFixed(2) + 's"><div class="sl-strip">' +
      ids.map(function (id) { return '<span class="sl-sym">' + (id === 'ball' ? '<img class="is-ball" alt="" src="' + BALL + '">' : '<img alt="" src="' + PLAT + id + '.png">') + '</span>'; }).join('') +
      '</div><div class="sl-stop"><span class="sl-sym"><img alt=""></span></div></div>';
  };

  root.innerHTML =
    '<div class="sl-carpet" aria-hidden="true"></div>' +
    '<div class="sl-machine">' +
      '<div class="sl-marquee" aria-hidden="true"><i class="sl-bulbs"></i><b class="sl-title"></b></div>' +
      '<div class="sl-face">' +
        '<div class="sl-window">' + [0, 1, 2].map(reelHtml).join('') + '<i class="sl-line"></i></div>' +
        '<div class="sl-led"><span class="sl-msg"></span><span class="sl-secs"></span></div>' +
        '<button type="button" class="sl-coin"><i aria-hidden="true"></i></button>' +
      '</div>' +
      '<button type="button" class="sl-lever"><i class="sl-lever-plate" aria-hidden="true"></i><i class="sl-arm" aria-hidden="true"></i><i class="sl-knob" aria-hidden="true"></i><span class="sl-lever-label" aria-hidden="true"></span></button>' +
      '<div class="sl-tray" aria-hidden="true"></div>' +
    '</div>' +
    '<div class="sl-printer">' +
      '<img class="sl-mascot" alt="" src="' + PLAT + '35.png">' +
      '<div class="sl-box"><i class="sl-slot"></i><small class="sl-rolls"></small></div>' +
      '<a class="sl-ticket"><b class="sl-t-head"></b><span class="sl-t-name"></span><small class="sl-t-meta"></small><em class="sl-t-boss"></em></a>' +
    '</div>' +
    '<div class="sl-coins" aria-hidden="true"></div>';
  var el = {
    title: root.querySelector('.sl-title'), reels: root.querySelectorAll('.sl-reel'), msg: root.querySelector('.sl-msg'), secs: root.querySelector('.sl-secs'),
    coin: root.querySelector('.sl-coin'), lever: root.querySelector('.sl-lever'), leverLabel: root.querySelector('.sl-lever-label'), tray: root.querySelector('.sl-tray'),
    rolls: root.querySelector('.sl-rolls'), ticket: root.querySelector('.sl-ticket'), tHead: root.querySelector('.sl-t-head'),
    tName: root.querySelector('.sl-t-name'), tMeta: root.querySelector('.sl-t-meta'), tBoss: root.querySelector('.sl-t-boss'),
    coins: root.querySelector('.sl-coins')
  };

  var data = null, last = null, revealed = false, stopTimer = [], leverTimer = [];
  var PULL_MAX = 80, PULL_TRIGGER = 0.7;
  var drag = null, leverLocked = false, suppressClickUntil = 0;
  var KEY = 'randomizer-rolls';
  var rolls = 0;
  try { rolls = Number(localStorage.getItem(KEY)) || 0; } catch (e) { /* ohne Zähler */ }

  function layout() {
    var side = HubScene.beside(card);
    root.classList.toggle('is-full', side.strip >= 200);
    root.classList.toggle('is-bare', side.strip < 200);
    root.style.setProperty('--cl', side.cl + 'px');
    root.style.setProperty('--cr', side.cr + 'px');
    root.style.setProperty('--strip', side.strip + 'px');
  }

  // Walzen anhalten: nacheinander, auf dem Pokéball (Starter verdeckt) oder den echten Startern
  function stopReels(ids) {
    stopTimer.forEach(clearTimeout);
    stopTimer = [];
    el.reels.forEach(function (reel, i) {
      stopTimer.push(setTimeout(function () {
        var img = reel.querySelector('.sl-stop img'), id = ids && ids[i];
        img.className = id ? (id > 493 ? 'is-wide' : '') : 'is-ball';
        img.src = id ? monSrc(id) : BALL;
        reel.classList.remove('is-spin');
        reel.classList.add('is-stop');
        reel.classList.remove('is-bump');
        void reel.offsetWidth;
        reel.classList.add('is-bump');
      }, 260 + i * 420));
    });
  }
  function spinReels() {
    stopTimer.forEach(clearTimeout);
    el.reels.forEach(function (reel) { reel.classList.remove('is-stop', 'is-bump'); reel.classList.add('is-spin'); });
  }
  function idleReels() {
    stopTimer.forEach(clearTimeout);
    el.reels.forEach(function (reel) { reel.classList.remove('is-spin', 'is-stop', 'is-bump'); });
  }

  /* ── Hebel: ziehen, einrasten, zurückfedern ────────────────────── */
  function clearLeverTimers() {
    leverTimer.forEach(clearTimeout);
    leverTimer = [];
  }
  function setPull(y, x) {
    y = Math.max(0, Math.min(PULL_MAX, y || 0));
    x = Math.max(-4, Math.min(4, x || 0));
    var p = y / PULL_MAX;
    el.lever.style.setProperty('--lever-y', y.toFixed(1) + 'px');
    el.lever.style.setProperty('--lever-x', x.toFixed(1) + 'px');
    el.lever.style.setProperty('--lever-arm-x', (x * 0.18).toFixed(1) + 'px');
    el.lever.style.setProperty('--lever-tilt', (x * 0.55).toFixed(1) + 'deg');
    el.lever.style.setProperty('--lever-scale', (1 - p * 0.72).toFixed(3));
    el.lever.style.setProperty('--lever-progress', p.toFixed(3));
    el.lever.classList.toggle('is-armed', p >= PULL_TRIGGER);
    return p;
  }
  function clearLeverState() {
    el.lever.classList.remove('is-pull', 'is-dragging', 'is-settling', 'is-returning', 'is-armed');
    root.classList.remove('is-lever-hit');
    setPull(0, 0);
  }
  function canPull() {
    return !leverLocked && !el.lever.disabled && data && !data.busy && typeof data.roll === 'function';
  }
  function rollOnce() {
    if (!data || data.busy || typeof data.roll !== 'function') return;
    data.roll();
  }
  function finishLever(ms) {
    leverTimer.push(setTimeout(function () {
      clearLeverState();
      leverLocked = false;
    }, ms));
  }
  // Klick, Enter und Leertaste: derselbe vollständige Zug wie früher, nur mit dem neuen Hebel
  function autoPull() {
    if (!canPull()) return;
    leverLocked = true;
    clearLeverTimers();
    clearLeverState();
    el.lever.classList.add('is-pull');
    leverTimer.push(setTimeout(function () {
      root.classList.add('is-lever-hit');
      rollOnce();
    }, 260));
    finishLever(660);
  }
  function cancelDrag() {
    if (!drag) return;
    var d = drag;
    drag = null;
    if (el.lever.hasPointerCapture && el.lever.hasPointerCapture(d.id)) el.lever.releasePointerCapture(d.id);
    el.lever.classList.remove('is-dragging', 'is-settling', 'is-armed');
    el.lever.classList.add('is-returning');
    setPull(0, 0);
    finishLever(480);
  }
  function commitDrag() {
    leverLocked = true;
    clearLeverTimers();
    el.lever.classList.remove('is-dragging');
    el.lever.classList.add('is-settling', 'is-armed');
    setPull(PULL_MAX, 0);
    leverTimer.push(setTimeout(function () {
      el.lever.classList.remove('is-settling', 'is-armed');
      el.lever.classList.add('is-returning');
      root.classList.add('is-lever-hit');
      setPull(0, 0);
      rollOnce();
    }, 90));
    finishLever(620);
  }
  function endDrag(e, cancelled) {
    if (!drag || (e && e.pointerId !== drag.id)) return;
    var d = drag;
    drag = null;
    if (el.lever.hasPointerCapture && el.lever.hasPointerCapture(d.id)) el.lever.releasePointerCapture(d.id);
    if (d.moved) suppressClickUntil = performance.now() + 600;
    if (!cancelled && d.progress >= PULL_TRIGGER) commitDrag();
    else {
      el.lever.classList.remove('is-dragging', 'is-settling', 'is-armed');
      el.lever.classList.add('is-returning');
      setPull(0, 0);
      finishLever(480);
    }
  }

  // Münzregen aus der Schale, wenn ein neues Spiel fertig ist
  function coins() {
    var r = root.querySelector('.sl-tray').getBoundingClientRect(), html = '';
    for (var i = 0; i < 16; i++) {
      html += '<i style="left:' + Math.round(r.left + r.width / 2) + 'px;top:' + Math.round(r.top + 6) + 'px;--dx:' + Math.round((Math.random() - 0.5) * 220) +
        'px;--dy:' + Math.round(-90 - Math.random() * 140) + 'px;--dl:' + (i * 0.04).toFixed(2) + 's"></i>';
    }
    el.coins.innerHTML = html;
    setTimeout(function () { el.coins.innerHTML = ''; }, 1900);
  }

  function render() {
    var t = tr(), d = data || {}, r = d.result;
    el.title.textContent = t.title;
    var state = !d.rom ? 'off' : d.busy ? 'spin' : d.error ? 'lose' : r ? 'win' : 'ready';
    root.dataset.state = state;
    el.msg.textContent = state === 'off' ? t.insert : state === 'spin' ? d.phase : state === 'lose' ? t.error : state === 'win' ? (revealed ? t.win : t.reveal) : t.ready;
    el.secs.textContent = state === 'spin' && d.secs ? d.secs : '';
    el.lever.title = t.lever;
    el.lever.setAttribute('aria-label', t.lever);
    el.leverLabel.textContent = t.pull;
    el.coin.title = t.coin;
    el.coin.setAttribute('aria-label', t.coin);
    el.lever.disabled = state === 'off' || state === 'spin';
    if (el.lever.disabled && drag) cancelDrag();
    el.rolls.textContent = rolls ? t.rolls.replace('{n}', rolls) : '';
    el.ticket.classList.toggle('is-out', !!r && !d.busy);
    if (r) {
      el.ticket.href = r.url;
      el.ticket.setAttribute('download', r.fileName);
      el.ticket.title = t.get;
      el.ticket.setAttribute('aria-label', t.get + ': ' + r.fileName);
      el.tHead.textContent = t.ticket;
      el.tName.textContent = r.fileName;
      el.tMeta.textContent = r.size;
      el.tBoss.textContent = r.boss ? '✓ ' + t.boss : '';
    }

    // Übergänge: Würfeln beginnt → drehen; fertig → anhalten (+ Münzen); Fehler → auf grauen Bällen anhalten
    var prev = last;
    last = state;
    if (state === 'spin' && prev !== 'spin') spinReels();
    else if (state === 'win' && prev === 'spin') {
      revealed = false;
      rolls++;
      try { localStorage.setItem(KEY, String(rolls)); } catch (e) { /* ohne Zähler */ }
      el.rolls.textContent = t.rolls.replace('{n}', rolls);
      stopReels(null);
      setTimeout(coins, 1400);
    } else if (state === 'win' && prev !== 'win') stopReels(revealed && r.starters ? r.starters : null);
    else if (state === 'lose' && prev !== 'lose') stopReels(null);
    else if ((state === 'ready' || state === 'off') && prev !== state) idleReels();
  }

  // Starter aufgeklappt (auf der Seite) → Walzen drehen auf die echten Starter
  document.addEventListener('toggle', function (e) {
    if (!e.target.classList || !e.target.classList.contains('starters-spoiler')) return;
    revealed = e.target.open;
    var r = data && data.result;
    if (!r || !r.starters) return;
    spinReels();
    setTimeout(function () { stopReels(revealed ? r.starters : null); }, 500);
    render();
  }, true);

  el.lever.addEventListener('pointerdown', function (e) {
    if (!canPull() || (e.button != null && e.button !== 0)) return;
    clearLeverTimers();
    clearLeverState();
    drag = { id: e.pointerId, x: e.clientX, y: e.clientY, moved: false, progress: 0 };
    el.lever.classList.add('is-dragging');
    el.lever.setPointerCapture(e.pointerId);
    el.lever.focus({ preventScroll: true });
    e.preventDefault();
  });
  el.lever.addEventListener('pointermove', function (e) {
    if (!drag || e.pointerId !== drag.id) return;
    var dy = Math.max(0, e.clientY - drag.y);
    var dx = (e.clientX - drag.x) * 0.12;
    drag.moved = drag.moved || dy > 3 || Math.abs(e.clientX - drag.x) > 4;
    drag.progress = setPull(dy, dx);
    e.preventDefault();
  });
  el.lever.addEventListener('pointerup', function (e) { endDrag(e, false); });
  el.lever.addEventListener('pointercancel', function (e) { endDrag(e, true); });
  el.lever.addEventListener('lostpointercapture', function (e) { endDrag(e, true); });
  el.lever.addEventListener('dragstart', function (e) { e.preventDefault(); });
  el.lever.addEventListener('click', function () {
    if (performance.now() < suppressClickUntil) return;
    autoPull();
  });
  el.coin.addEventListener('click', function () { if (data && data.pick && !data.busy) data.pick(); });

  var raf = 0;
  function update(d) {
    data = d;
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; render(); });
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); });
  layout();
  render();

  return { update: update };
})();
