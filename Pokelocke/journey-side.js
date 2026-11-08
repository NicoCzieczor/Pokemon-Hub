/*
 * Solo's desktop identity: the page is the screen of a one-player Trainer Console.
 * The physical controls mirror the real Solo state and operate the existing tools.
 */
window.SoloTrailScene = (function () {
  'use strict';

  var root = document.getElementById('solo-trail');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {} };

  var TEXT = {
    de: {
      root: 'Solo-Steuerung', player: 'SPIELER 1', system: 'NUZLOCKE SYSTEM', power: 'POWER',
      game: 'SPIELMODUL', noGame: 'KEIN SPIEL', active: 'AKTIVER SLOT', emptyTeam: 'TEAM LEER',
      party: 'PARTY-LINK', fallen: 'GEFALLEN', details: 'DETAILS', route: 'FANGORT',
      start: 'ROUTE', select: 'BOX', previous: 'Vorheriges Team-Pokémon', next: 'Nächstes Team-Pokémon',
      openDetails: 'Details des fokussierten Pokémon öffnen', openRoute: 'Fangort des fokussierten Pokémon festlegen',
      openJourney: 'Routenplaner öffnen', openBox: 'Pokémon-Box öffnen',
      slot: 'Team-Slot {n}: {name}', emptySlot: 'Team-Slot {n}: leer'
    },
    en: {
      root: 'Solo controls', player: 'PLAYER 1', system: 'NUZLOCKE SYSTEM', power: 'POWER',
      game: 'GAME CARD', noGame: 'NO GAME', active: 'ACTIVE SLOT', emptyTeam: 'TEAM EMPTY',
      party: 'PARTY LINK', fallen: 'FALLEN', details: 'DETAILS', route: 'CATCH',
      start: 'ROUTE', select: 'BOX', previous: 'Previous team Pokémon', next: 'Next team Pokémon',
      openDetails: 'Open details for the focused Pokémon', openRoute: 'Set the catch location for the focused Pokémon',
      openJourney: 'Open the route planner', openBox: 'Open the Pokémon box',
      slot: 'Team slot {n}: {name}', emptySlot: 'Team slot {n}: empty'
    }
  };

  root.classList.add('solo-console');
  root.innerHTML =
    '<div class="console-shell" aria-hidden="true">' +
      '<i class="console-screen-rim"></i><i class="console-grip console-grip--l"></i><i class="console-grip console-grip--r"></i>' +
      '<i class="console-screw console-screw--tl"></i><i class="console-screw console-screw--bl"></i>' +
      '<i class="console-screw console-screw--tr"></i><i class="console-screw console-screw--br"></i>' +
    '</div>' +
    '<section class="console-side console-side--left">' +
      '<div class="console-identity">' +
        '<span class="console-power"><i></i><small></small></span>' +
        '<span class="console-player"></span><strong>SOLO–01</strong><small class="console-system"></small>' +
      '</div>' +
      '<div class="console-dpad" role="group">' +
        '<button type="button" class="console-dkey console-dkey--up" data-console-action="previous"><i></i></button>' +
        '<button type="button" class="console-dkey console-dkey--left" data-console-action="previous"><i></i></button>' +
        '<span class="console-dcenter" aria-hidden="true"><i></i></span>' +
        '<button type="button" class="console-dkey console-dkey--right" data-console-action="next"><i></i></button>' +
        '<button type="button" class="console-dkey console-dkey--down" data-console-action="next"><i></i></button>' +
      '</div>' +
      '<div class="console-focus"><small class="console-focus-label"></small><strong class="console-focus-name">—</strong><i></i></div>' +
    '</section>' +
    '<section class="console-side console-side--right">' +
      '<div class="console-game-card"><small class="console-game-label"></small><strong class="console-game-name"></strong><span aria-hidden="true"><i></i><i></i><i></i><i></i><i></i><i></i></span></div>' +
      '<div class="console-actions">' +
        '<div class="console-action console-action--b"><button type="button" data-console-action="route">B</button><small></small></div>' +
        '<div class="console-action console-action--a"><button type="button" data-console-action="details">A</button><small></small></div>' +
      '</div>' +
      '<div class="console-party">' +
        '<div class="console-party-head"><span class="console-party-label"></span><strong class="console-party-count">0 / 6</strong></div>' +
        '<div class="console-party-lights">' +
          '<button type="button" data-console-action="slot" data-slot="0"></button><button type="button" data-console-action="slot" data-slot="1"></button>' +
          '<button type="button" data-console-action="slot" data-slot="2"></button><button type="button" data-console-action="slot" data-slot="3"></button>' +
          '<button type="button" data-console-action="slot" data-slot="4"></button><button type="button" data-console-action="slot" data-slot="5"></button>' +
        '</div>' +
        '<div class="console-fallen"><span class="console-fallen-label"></span><strong class="console-fallen-count">0</strong></div>' +
      '</div>' +
      '<div class="console-system-keys">' +
        '<div><button type="button" data-console-action="box"><i></i></button><small class="console-select-label"></small></div>' +
        '<div><button type="button" data-console-action="journey"><i></i></button><small class="console-start-label"></small></div>' +
      '</div>' +
      '<div class="console-speaker" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></div>' +
    '</section>';

  var el = {
    player: root.querySelector('.console-player'), system: root.querySelector('.console-system'),
    power: root.querySelector('.console-power small'), gameCard: root.querySelector('.console-game-card'),
    gameLabel: root.querySelector('.console-game-label'), gameName: root.querySelector('.console-game-name'),
    focusLabel: root.querySelector('.console-focus-label'), focusName: root.querySelector('.console-focus-name'),
    partyLabel: root.querySelector('.console-party-label'), partyCount: root.querySelector('.console-party-count'),
    partyButtons: Array.from(root.querySelectorAll('.console-party-lights button')),
    fallenLabel: root.querySelector('.console-fallen-label'), fallenCount: root.querySelector('.console-fallen-count'),
    detailsLabel: root.querySelector('.console-action--a small'), routeLabel: root.querySelector('.console-action--b small'),
    selectLabel: root.querySelector('.console-select-label'), startLabel: root.querySelector('.console-start-label'),
    detailsButton: root.querySelector('[data-console-action="details"]'), routeButton: root.querySelector('[data-console-action="route"]'),
    directionButtons: Array.from(root.querySelectorAll('.console-dkey'))
  };

  var lastGame = '';

  function tr() { return TEXT[window.LANG] || TEXT.de; }

  function labelled(template, values) {
    return Object.keys(values).reduce(function (result, key) {
      return result.replace('{' + key + '}', values[key]);
    }, template);
  }

  function setButtonText(text) {
    root.setAttribute('aria-label', text.root);
    root.querySelector('.console-dpad').setAttribute('aria-label', text.party);
    root.querySelector('.console-dkey--up').setAttribute('aria-label', text.previous);
    root.querySelector('.console-dkey--left').setAttribute('aria-label', text.previous);
    root.querySelector('.console-dkey--right').setAttribute('aria-label', text.next);
    root.querySelector('.console-dkey--down').setAttribute('aria-label', text.next);
    el.detailsButton.setAttribute('aria-label', text.openDetails);
    el.routeButton.setAttribute('aria-label', text.openRoute);
    root.querySelector('[data-console-action="journey"]').setAttribute('aria-label', text.openJourney);
    root.querySelector('[data-console-action="box"]').setAttribute('aria-label', text.openBox);
    el.player.textContent = text.player;
    el.system.textContent = text.system;
    el.power.textContent = text.power;
    el.gameLabel.textContent = text.game;
    el.focusLabel.textContent = text.active;
    el.partyLabel.textContent = text.party;
    el.fallenLabel.textContent = text.fallen;
    el.detailsLabel.textContent = text.details;
    el.routeLabel.textContent = text.route;
    el.selectLabel.textContent = text.select;
    el.startLabel.textContent = text.start;
  }

  function layout() {
    var side = window.HubScene.beside(card);
    var vw = document.documentElement.clientWidth;
    var bare = side.strip < 145 || vw <= 1100;
    root.classList.toggle('is-bare', bare);
    root.classList.toggle('is-compact', !bare && side.strip < 220);
    root.classList.toggle('is-full', !bare && side.strip >= 220);
    root.style.setProperty('--strip', Math.round(side.strip) + 'px');
    root.style.setProperty('--cl', Math.round(side.cl) + 'px');
    root.style.setProperty('--cr', Math.round(side.cr) + 'px');
    root.style.setProperty('--app-left', Math.round(side.left) + 'px');
    root.style.setProperty('--app-right', Math.round(vw - side.right) + 'px');
  }

  function update(data) {
    var state = data || {};
    var text = tr();
    var slots = Array.isArray(state.slots) ? state.slots.slice(0, 6) : [];
    while (slots.length < 6) slots.push({ index: slots.length, filled: false });
    var count = slots.filter(function (slot) { return slot && slot.filled; }).length;
    var game = state.game || text.noGame;

    setButtonText(text);
    root.dataset.game = state.gameKey || '';
    root.classList.add('is-ready');
    el.gameName.textContent = game;
    el.focusName.textContent = state.focusedName || text.emptyTeam;
    el.partyCount.textContent = count + ' / 6';
    el.fallenCount.textContent = String(Math.max(0, Number(state.fallen) || 0));
    el.detailsButton.disabled = !state.hasFocus;
    el.routeButton.disabled = !state.hasFocus;
    el.directionButtons.forEach(function (button) { button.disabled = !count; });

    slots.forEach(function (slot, index) {
      var button = el.partyButtons[index];
      var filled = !!slot.filled;
      var focused = !!slot.focused;
      button.disabled = !filled;
      button.classList.toggle('is-filled', filled);
      button.classList.toggle('is-focused', focused);
      button.setAttribute('aria-pressed', String(focused));
      button.setAttribute('aria-label', labelled(filled ? text.slot : text.emptySlot, {
        n: index + 1,
        name: slot.name || ''
      }));
    });

    if (lastGame && lastGame !== game) {
      el.gameCard.classList.remove('is-swapping');
      void el.gameCard.offsetWidth;
      el.gameCard.classList.add('is-swapping');
      setTimeout(function () { el.gameCard.classList.remove('is-swapping'); }, 520);
    }
    lastGame = game;
    layout();
  }

  root.addEventListener('click', function (event) {
    var button = event.target.closest('[data-console-action]');
    if (!button || button.disabled) return;
    button.classList.remove('is-fired');
    void button.offsetWidth;
    button.classList.add('is-fired');
    setTimeout(function () { button.classList.remove('is-fired'); }, 220);
    document.dispatchEvent(new CustomEvent('soloconsoleaction', {
      detail: { action: button.dataset.consoleAction, slot: Number(button.dataset.slot) }
    }));
  });

  var resizeTimer = null;
  window.addEventListener('resize', function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(layout, 100);
  });
  if (window.ResizeObserver) new ResizeObserver(layout).observe(card);
  layout();

  return { update: update, layout: layout };
})();
