/*
 * „Ruhmeshalle“ hinter Solo Nuzlocke – das Ziel jedes Runs: Die Seite ist die Halle der Pokémon-Liga
 * (Lichtstrahlen, goldener Boden, aufsteigende Funken). Links steht das Team nacheinander im Scheinwerfer auf
 * dem Podest, wie in der Ruhmeshallen-Szene im Spiel – mit Name, Platz im Team und Typen. Rechts die Ehrentafel
 * mit sechs Goldrahmen; fährt man über einen Rahmen, kommt dieses Pokémon ins Licht. Wer neu ins Team kommt,
 * wird sofort mit Konfetti vorgestellt. Klassik: Nacht, Graphit: Schwarz und Gold, Papier: heller Marmor.
 * Farben und Aussehen: hall.css. Platz neben der Karte: scene.js (HubScene.beside).
 *
 *   HallScene.update(team)  – nach jeder Änderung am Team (main.js, renderTeamWeaknessPanel):
 *     [{ key, name, sprite, types: [{ key, name }] } | null] × 6
 */
window.HallScene = (function () {
  'use strict';

  var root = document.getElementById('hf');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {} };

  var TR = {
    de: { hall: 'Ruhmeshalle', team: 'Dein Team', empty: 'Stell dein Team zusammen', slot: 'Platz {n}', ready: 'Bereit für die Liga!', count: '{n} / 6' },
    en: { hall: 'Hall of Fame', team: 'Your team', empty: 'Build your team', slot: 'Slot {n}', ready: 'Ready for the League!', count: '{n} / 6' }
  };
  var tr = function () { return TR[window.LANG] || TR.de; };
  // Typfarben wie im Spiel (Schild unter dem Namen)
  var TYPE_HEX = { normal: '#9fa19f', fire: '#e62829', water: '#2980ef', electric: '#e5b800', grass: '#3fa129', ice: '#3dcef3',
    fighting: '#ff8000', poison: '#9141cb', ground: '#915121', flying: '#81b9ef', psychic: '#ef4179', bug: '#91a119',
    rock: '#afa981', ghost: '#704170', dragon: '#5060e1', dark: '#624d4e', steel: '#60a1b8', fairy: '#ef70ef' };
  var esc = function (s) { return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  root.innerHTML =
    '<div class="hf-room" aria-hidden="true"><i class="hf-beams"></i><i class="hf-floor"></i></div>' +
    '<div class="hf-sparks" aria-hidden="true"></div>' +
    '<div class="hf-stage"><i class="hf-cone"></i><div class="hf-star"><img alt=""></div><i class="hf-podium"></i>' +
      '<div class="hf-plate"><small class="hf-no"></small><b class="hf-name"></b><span class="hf-types"></span></div></div>' +
    '<div class="hf-board"><div class="hf-head"><b class="hf-title"></b><small class="hf-sub"></small></div><div class="hf-frames"></div><p class="hf-count"></p></div>' +
    '<div class="hf-confetti" aria-hidden="true"></div>';
  var el = {
    stage: root.querySelector('.hf-stage'), star: root.querySelector('.hf-star'), img: root.querySelector('.hf-star img'),
    no: root.querySelector('.hf-no'), name: root.querySelector('.hf-name'), types: root.querySelector('.hf-types'),
    title: root.querySelector('.hf-title'), sub: root.querySelector('.hf-sub'), frames: root.querySelector('.hf-frames'),
    count: root.querySelector('.hf-count'), confetti: root.querySelector('.hf-confetti'), sparks: root.querySelector('.hf-sparks')
  };

  var team = [null, null, null, null, null, null], known = null, shown = -1, hoverAt = -1, timer = null;

  function layout() {
    var side = HubScene.beside(card);
    var full = side.strip >= 200;
    root.classList.toggle('is-full', full);
    root.classList.toggle('is-bare', !full);
    root.style.setProperty('--cl', side.cl + 'px');
    root.style.setProperty('--cr', side.cr + 'px');
    root.style.setProperty('--strip', side.strip + 'px');
    root.style.setProperty('--k', side.strip >= 560 ? 3 : 2);
    // aufsteigende Funken, über die ganze Breite verteilt
    var html = '';
    for (var i = 0; i < 26; i++) {
      html += '<i style="left:' + (Math.random() * 100).toFixed(1) + '%;--d:' + (6 + Math.random() * 6).toFixed(1) + 's;--dl:' + (-Math.random() * 12).toFixed(1) + 's;--s:' + (0.6 + Math.random() * 0.9).toFixed(2) + '"></i>';
    }
    el.sparks.innerHTML = html;
  }

  var filled = function () { var out = []; team.forEach(function (m, i) { if (m) out.push(i); }); return out; };

  // Ein Pokémon ins Licht: kurz verschwinden, dann mit Funkeln auftauchen
  function spotlight(i) {
    var t = tr(), m = team[i];
    shown = i;
    el.star.classList.remove('is-in');
    void el.star.offsetWidth;
    if (!m) {
      el.img.removeAttribute('src');
      el.star.classList.add('is-none');
      el.no.textContent = t.team;
      el.name.textContent = t.empty;
      el.types.innerHTML = '';
    } else {
      el.star.classList.remove('is-none');
      el.img.src = m.sprite;
      el.no.textContent = t.slot.replace('{n}', i + 1);
      el.name.textContent = m.name;
      el.types.innerHTML = (m.types || []).map(function (ty) { return '<span style="--c:' + (TYPE_HEX[ty.key] || '#888') + '">' + esc(ty.name) + '</span>'; }).join('');
    }
    el.star.classList.add('is-in');
    frames();
  }

  // Parade: alle paar Sekunden das nächste Teammitglied (nicht, solange man über einem Rahmen ist)
  function parade() {
    clearTimeout(timer);
    timer = setTimeout(parade, 4600);
    if (hoverAt >= 0 || document.hidden) return;
    var list = filled();
    if (!list.length) { if (shown !== -2) { spotlight(0); shown = -2; } return; }
    var next = list[(list.indexOf(shown) + 1) % list.length];
    if (list.length === 1 && next === shown) return;
    spotlight(next);
  }

  function frames() {
    var t = tr(), n = filled().length;
    el.title.textContent = t.hall;
    el.sub.textContent = t.team;
    el.frames.innerHTML = team.map(function (m, i) {
      return '<span class="hf-frame' + (m ? '' : ' is-empty') + (i === shown ? ' is-on' : '') + '" data-i="' + i + '">' +
        (m ? '<img alt="" src="' + esc(m.sprite) + '">' : '<i>?</i>') + '<small>' + (i + 1) + '</small></span>';
    }).join('');
    el.count.textContent = n === 6 ? t.ready : t.count.replace('{n}', n);
    el.count.classList.toggle('is-ready', n === 6);
  }

  function confetti() {
    var r = el.stage.getBoundingClientRect(), html = '', colors = ['#ffd23f', '#ff6b9d', '#57d2ff', '#7cdc8a', '#ffffff', '#c59bff'];
    for (var i = 0; i < 34; i++) {
      html += '<i style="left:' + Math.round(r.left + r.width / 2) + 'px;top:' + Math.round(r.top + r.height * 0.35) + 'px;background:' + colors[i % colors.length] +
        ';--dx:' + Math.round((Math.random() - 0.5) * 320) + 'px;--dy:' + Math.round(-120 - Math.random() * 200) + 'px;--r:' + Math.round(Math.random() * 720) + 'deg;--dl:' + (Math.random() * 0.15).toFixed(2) + 's"></i>';
    }
    el.confetti.innerHTML = html;
    setTimeout(function () { el.confetti.innerHTML = ''; }, 2200);
  }

  function update(list) {
    team = (list || []).slice(0, 6);
    while (team.length < 6) team.push(null);
    var keys = team.map(function (m) { return m ? m.key : null; });
    // Neu im Team: sofort ins Licht, mit Konfetti (nicht beim ersten Laden)
    var fresh = known ? keys.findIndex(function (k, i) { return k && k !== known[i] && known.indexOf(k) < 0; }) : -1;
    known = keys;
    if (fresh >= 0) { spotlight(fresh); confetti(); parade(); return; }
    if (shown < 0 || !team[shown]) { shown = -1; var f = filled(); spotlight(f.length ? f[0] : 0); }
    else spotlight(shown);
  }

  el.frames.addEventListener('mouseover', function (e) {
    var f = e.target.closest('.hf-frame');
    if (!f || f.classList.contains('is-empty')) return;
    var i = +f.dataset.i;
    if (i === hoverAt) return;
    hoverAt = i;
    if (i !== shown) spotlight(i);
  });
  el.frames.addEventListener('mouseleave', function () { hoverAt = -1; });

  var resizeTimer = null;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); });
  layout();
  spotlight(0);
  parade();

  return { update: update };
})();
