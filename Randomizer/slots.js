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
  var root = document.getElementById('sl');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {} };

  var TR = {
    de: {
      title: 'SPIELHALLE', insert: 'ROM einwerfen', ready: 'Hebel ziehen!', win: 'Neues Spiel!', reveal: 'Starter oben aufklappen',
      error: 'Kein Gewinn …', ticket: 'NEUES SPIEL', boss: 'Boss-Planer: Teams bereit', rolls: 'Gewürfelt: {n}',
      lever: 'Neues Spiel würfeln', coin: 'Original-Spiel auswählen', get: 'Herunterladen'
    },
    en: {
      title: 'GAME CORNER', insert: 'Insert ROM', ready: 'Pull the lever!', win: 'New game!', reveal: 'Open the starters above',
      error: 'No win …', ticket: 'NEW GAME', boss: 'Boss Planner: teams ready', rolls: 'Rolled: {n}',
      lever: 'Roll a new game', coin: 'Choose the original game', get: 'Download'
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
      '<div class="sl-marquee"><i class="sl-bulbs"></i><b class="sl-title"></b></div>' +
      '<div class="sl-face">' +
        '<div class="sl-window">' + [0, 1, 2].map(reelHtml).join('') + '<i class="sl-line"></i></div>' +
        '<div class="sl-led"><span class="sl-msg"></span><span class="sl-secs"></span></div>' +
        '<button type="button" class="sl-coin" tabindex="-1"><i></i></button>' +
      '</div>' +
      '<button type="button" class="sl-lever" tabindex="-1"><i class="sl-knob"></i><i class="sl-arm"></i></button>' +
      '<div class="sl-tray"></div>' +
    '</div>' +
    '<div class="sl-printer">' +
      '<img class="sl-mascot" alt="" src="' + PLAT + '35.png">' +
      '<div class="sl-box"><i class="sl-slot"></i><small class="sl-rolls"></small></div>' +
      '<a class="sl-ticket" tabindex="-1"><b class="sl-t-head"></b><span class="sl-t-name"></span><small class="sl-t-meta"></small><em class="sl-t-boss"></em></a>' +
    '</div>' +
    '<div class="sl-coins" aria-hidden="true"></div>';
  var el = {
    title: root.querySelector('.sl-title'), reels: root.querySelectorAll('.sl-reel'), msg: root.querySelector('.sl-msg'), secs: root.querySelector('.sl-secs'),
    coin: root.querySelector('.sl-coin'), lever: root.querySelector('.sl-lever'), tray: root.querySelector('.sl-tray'),
    rolls: root.querySelector('.sl-rolls'), ticket: root.querySelector('.sl-ticket'), tHead: root.querySelector('.sl-t-head'),
    tName: root.querySelector('.sl-t-name'), tMeta: root.querySelector('.sl-t-meta'), tBoss: root.querySelector('.sl-t-boss'),
    coins: root.querySelector('.sl-coins')
  };

  var data = null, last = null, revealed = false, stopTimer = [];
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
        img.className = id ? '' : 'is-ball';
        img.src = id ? PLAT + id + '.png' : BALL;
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
    el.coin.title = t.coin;
    el.lever.disabled = state === 'off' || state === 'spin';
    el.rolls.textContent = rolls ? t.rolls.replace('{n}', rolls) : '';
    el.ticket.classList.toggle('is-out', !!r && !d.busy);
    if (r) {
      el.ticket.href = r.url;
      el.ticket.setAttribute('download', r.fileName);
      el.ticket.title = t.get;
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

  el.lever.addEventListener('click', function () {
    if (el.lever.disabled || !data || !data.roll) return;
    el.lever.classList.remove('is-pull');
    void el.lever.offsetWidth;
    el.lever.classList.add('is-pull');
    setTimeout(function () { data.roll(); }, 260);
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
