/*
 * „Das Seen-Trio“ hinter Trio Nuzlocke: Jeder Spieler hat einen der drei Seegeister aus Sinnoh – Spieler 1 Tobutz,
 * Spieler 2 Selfe, Spieler 3 Vesprit –, um den sein Team kreist. Die Rote Kette (die das Trio im Spiel erschafft)
 * verbindet die drei; verknüpfte Plätze leuchten bei allen drei Spielern im gleichen Takt rot. Rechts unten
 * stehen die verknüpften Dreiergruppen nebeneinander. Hintergrund: Nebel in den Farben der drei Geister.
 * Das alles nur, wenn oben ein Sinnoh-Spiel gewählt ist – Diamant/Perl, Platin, SD/LP (pwa.js, PokeHubGame) –, sonst eine neutrale
 * Fassung: Pokéball statt Geist, Kette und Nebel in den Farben der Seite und der Spieler, „Verknüpfte Plätze“.
 * Farben und Aussehen: lakes.css. Platz neben der Karte: scene.js (HubScene.beside).
 *
 *   TrioScene.update(data)  – nach jeder Änderung an Teams oder Verknüpfungen (main.js, updateScene):
 *     { teams: [[{ key, name, icon } | null] × 6] × 3, linked: [Platz-Nummern] }
 */
window.TrioScene = (function () {
  'use strict';

  var PLAT = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-iv/platinum/';
  var BALL = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/poke-ball.png';
  var root = document.getElementById('tl');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {} };

  var TR = {
    de: { player: 'Spieler {n}', guard: ['Tobutz', 'Selfe', 'Vesprit'], chain: 'Rote Kette', plain: 'Verknüpfte Plätze', links: '{n} Verknüpfungen', link1: '1 Verknüpfung', none: 'Noch nichts verknüpft – das Kettensymbol verbindet drei Plätze.' },
    en: { player: 'Player {n}', guard: ['Azelf', 'Uxie', 'Mesprit'], chain: 'Red Chain', plain: 'Linked slots', links: '{n} links', link1: '1 link', none: 'Nothing linked yet – the chain icon links three slots.' }
  };
  var tr = function () { return TR[window.LANG] || TR.de; };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var GUARD = [482, 480, 481];   // Tobutz, Selfe, Vesprit

  root.innerHTML =
    '<div class="tl-sky" aria-hidden="true"><i class="tl-mist tl-mist--a"></i><i class="tl-mist tl-mist--b"></i><i class="tl-mist tl-mist--c"></i><i class="tl-stars"></i></div>' +
    '<svg class="tl-chain" aria-hidden="true"><path class="tl-chain-glow"/><path class="tl-chain-link"/></svg>' +
    [0, 1, 2].map(function (p) {
      return '<div class="tl-guard tl-guard--' + (p + 1) + '"><div class="tl-orbit"></div><i class="tl-aura"></i><img class="tl-spirit" alt="">' +
        '<img class="tl-ball" alt="" src="' + BALL + '">' +
        '<span class="tl-name"><b></b><small></small></span></div>';
    }).join('') +
    '<div class="tl-board"><b class="tl-board-title"></b><small class="tl-board-count"></small><div class="tl-trios"></div></div>';
  var guards = root.querySelectorAll('.tl-guard');
  var el = { chain: root.querySelectorAll('.tl-chain path'), title: root.querySelector('.tl-board-title'), count: root.querySelector('.tl-board-count'), trios: root.querySelector('.tl-trios') };

  var data = { teams: [[], [], []], linked: [] }, full = false, k = 2, R = 110, sinnoh = false;

  // Seen-Trio und Rote Kette gehören nach Sinnoh: nur mit einem Sinnoh-Spiel (Schlüssel wie in pwa.js)
  var SINNOH = ['diamant-perl', 'platin', 'bdsp'];
  function era() {
    var hub = window.PokeHubGame, game = hub && hub.get();
    sinnoh = SINNOH.indexOf(game) >= 0;
    root.classList.toggle('is-sinnoh', sinnoh);
    // Geister erst laden, wenn sie gebraucht werden
    if (sinnoh) guards.forEach(function (g, p) { var img = g.querySelector('.tl-spirit'); if (!img.getAttribute('src')) img.src = PLAT + GUARD[p] + '.png'; });
  }

  function layout() {
    var side = HubScene.beside(card), vh = window.innerHeight;
    full = side.strip >= 200;
    root.classList.toggle('is-full', full);
    root.classList.toggle('is-bare', !full);
    k = side.strip >= 560 ? 3 : 2;
    R = Math.round(Math.max(80, Math.min(side.strip * 0.34, 190)));
    root.style.setProperty('--k', k);
    root.style.setProperty('--R', R + 'px');
    root.style.setProperty('--strip', side.strip + 'px');
    // Spieler 1 links oben, Spieler 2 links unten, Spieler 3 rechts oben (darunter die Tafel)
    var pos = [[side.cl, vh * 0.28], [side.cl, vh * 0.72], [side.cr, vh * 0.3]];
    pos.forEach(function (p, i) {
      guards[i].style.left = Math.round(p[0]) + 'px';
      guards[i].style.top = Math.round(p[1]) + 'px';
    });
    root.style.setProperty('--cr', side.cr + 'px');
    // Rote Kette: Dreieck durch die drei Geister (läuft hinter der Karte durch)
    var d = 'M' + pos[0].join(' ') + 'L' + pos[2].join(' ') + 'L' + pos[1].join(' ') + 'Z';
    el.chain.forEach(function (path) { path.setAttribute('d', d); });
  }

  function iconHtml(m, slot, linked) {
    var a = slot * 60;
    return '<span class="tl-mon' + (m ? '' : ' is-free') + (linked ? ' is-linked' : '') + '" style="--a:' + a + 'deg">' +
      (m ? '<img alt="" src="' + esc(m.icon) + '" title="' + esc(m.name) + '">' : '<i></i>') + '</span>';
  }

  function render() {
    var t = tr(), linked = data.linked || [];
    guards.forEach(function (g, p) {
      var team = (data.teams[p] || []).slice(0, 6);
      var html = '';
      for (var i = 0; i < 6; i++) html += iconHtml(team[i] || null, i, linked.indexOf(i) >= 0 && !!team[i]);
      g.querySelector('.tl-orbit').innerHTML = html;
      g.querySelector('.tl-name b').textContent = t.player.replace('{n}', p + 1);
      g.querySelector('.tl-name small').textContent = sinnoh ? t.guard[p] : '';
    });
    root.classList.toggle('has-links', linked.length > 0);
    el.title.textContent = sinnoh ? t.chain : t.plain;
    el.count.textContent = linked.length === 1 ? t.link1 : t.links.replace('{n}', linked.length);
    el.trios.innerHTML = linked.length
      ? linked.slice().sort(function (a, b) { return a - b; }).map(function (i) {
          return '<div class="tl-trio"><small>' + (i + 1) + '</small>' + [0, 1, 2].map(function (p) {
            var m = (data.teams[p] || [])[i];
            return '<span class="tl-tri tl-tri--' + (p + 1) + '">' + (m ? '<img alt="" src="' + esc(m.icon) + '" title="' + esc(m.name) + '">' : '–') + '</span>';
          }).join('<i class="tl-link"></i>') + '</div>';
        }).join('')
      : '<p class="tl-none">' + esc(t.none) + '</p>';
  }

  var raf = 0;
  function update(d) {
    data = d || data;
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; render(); });
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); });
  document.addEventListener('hubgamechange', function () { era(); render(); });
  era();
  layout();
  render();

  return { update: update };
})();
