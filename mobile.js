/*
 * Startseite am Handy (mobile.html): Bühne (über scene.js), wechselnde Symbole (Ball, Typ), DE/EN.
 * „Daten sichern/laden“ und der Theme-Knopf kommen aus pwa.js.
 */
(function () {
  'use strict';

  var TR = {
    de: {
      'group-run': 'Dein Run', 'group-team': 'Team & Kämpfe', 'group-calc': 'Rechner', 'group-ref': 'Nachschlagen',
      'rundashboard-name': 'Dashboard', 'saveviewer-name': 'Save-Viewer', 'editor-name': 'Save-Editor', 'rando-name': 'Randomizer',
      'solo-name': 'Solo', 'duo-name': 'Duo', 'trio-name': 'Trio', 'bosses-name': 'Bosse',
      'catchrate-name': 'Fangrate', 'damage-name': 'Schaden', 'typcalc-name': 'Typen',
      'pokedex-name': 'Pokédex', 'map-name': 'Karte', 'rules-name': 'Regelwerk',
      'backup-export': 'Daten sichern', 'backup-import': 'Daten laden',
      'ai-notice': 'Erstellt mit KI-Unterstützung',
      'footer': 'Pokémon und alle zugehörigen Namen sind Marken von Nintendo / Game Freak.'
    },
    en: {
      'group-run': 'Your run', 'group-team': 'Team & battles', 'group-calc': 'Calculators', 'group-ref': 'Reference',
      'rundashboard-name': 'Dashboard', 'saveviewer-name': 'Save Viewer', 'editor-name': 'Save Editor', 'rando-name': 'Randomizer',
      'solo-name': 'Solo', 'duo-name': 'Duo', 'trio-name': 'Trio', 'bosses-name': 'Bosses',
      'catchrate-name': 'Catch Rate', 'damage-name': 'Damage', 'typcalc-name': 'Types',
      'pokedex-name': 'Pokédex', 'map-name': 'Map', 'rules-name': 'Rulebook',
      'backup-export': 'Back up data', 'backup-import': 'Restore data',
      'ai-notice': 'Built with AI assistance',
      'footer': 'Pokémon and all related names are trademarks of Nintendo / Game Freak.'
    }
  };

  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
  var pick = function (list) { return list[Math.floor(Math.random() * list.length)]; };

  // Typ-Rechner: zufälliger Doppeltyp als Typ-Etiketten aus Platin (Nummern wie bei PokeAPI:
  // 1 Normal … 17 Unlicht – Fee gibt es in Platin noch nicht)
  function typeIcon() {
    var el = document.getElementById('hub-type-icon');
    if (!el) return;
    var a = 1 + Math.floor(Math.random() * 17), b;
    do { b = 1 + Math.floor(Math.random() * 17); } while (b === a);
    [a, b].forEach(function (n) {
      var img = document.createElement('img');
      img.className = 'type-tag';
      img.src = SPR + 'types/generation-iv/platinum/' + n + '.png';
      img.alt = '';
      el.appendChild(img);
    });
  }

  // Fangrate: zufälliger Ball (Poké-, Super- und Hyperball stehen schon bei Solo/Duo/Trio)
  function ballIcon() {
    var BALLS = ['master-ball', 'safari-ball', 'net-ball', 'dive-ball', 'nest-ball', 'repeat-ball', 'timer-ball', 'luxury-ball', 'premier-ball', 'dusk-ball', 'heal-ball', 'quick-ball', 'moon-ball', 'friend-ball', 'love-ball', 'lure-ball', 'level-ball', 'fast-ball', 'heavy-ball', 'sport-ball', 'cherish-ball'];
    var el = document.getElementById('icon-catchrate');
    if (!el) return;
    var img = document.createElement('img');
    img.src = SPR + 'items/' + pick(BALLS) + '.png';
    img.alt = '';
    el.appendChild(img);
  }

  // Bühne: zwei wilde Pokémon im hohen Gras – eins vorne links (gespiegelt, schaut zur Mitte),
  // eins hinten rechts vor dem Mond. Die Pixel des Grases wachsen mit der Schrift mit (iPad), hinten feiner als vorne.
  function scene() {
    var k = parseFloat(getComputedStyle(document.documentElement).fontSize) / 16 || 1;
    HubScene.grass(document.querySelector('.grass--back'), 'grass-back', Math.max(2, Math.round(2 * k)), 0);
    HubScene.grass(document.querySelector('.grass--front'), 'grass-front', Math.max(3, Math.round(3 * k)), 18);
    HubScene.wildMons([
      { box: document.getElementById('mons-near'), left: 2, flip: true },
      { box: document.getElementById('mons-far'), left: 58, flip: false }
    ]);
  }

  typeIcon();
  ballIcon();
  scene();

  var lang = 'de';
  try { lang = localStorage.getItem('hub-lang') === 'en' ? 'en' : 'de'; } catch (e) {}
  var btn = document.getElementById('lang-btn');
  function apply(l) {
    lang = l;
    try { localStorage.setItem('hub-lang', l); } catch (e) {}
    document.documentElement.lang = l;
    btn.textContent = l.toUpperCase();
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = TR[l][el.dataset.i18n];
      if (v !== undefined) el.textContent = v;
    });
  }
  btn.addEventListener('click', function () { apply(lang === 'de' ? 'en' : 'de'); });
  apply(lang);
})();
