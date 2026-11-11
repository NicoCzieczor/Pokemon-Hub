/*
 * Interaktive Kanto-Karte für Pokémon Rot / Blau – und die einfachen Karten der anderen Spiele.
 * (HeartGold/SoulSilver und Feuerrot/Blattgrün laufen über app.js mit allen Funktionen der Platin-Karte.)
 *
 * Die Kartenblätter und kanto.json werden mit tools/build-kanto.py aus pret/pokered erzeugt.
 * Ein Kartenkoordinatenpunkt entspricht einem Schritt im Spiel (16 × 16 Game-Boy-Pixel).
 */
(function () {
  'use strict';

  var GAME = window.PokeHubGame && window.PokeHubGame.get();
  var isRetroGame = function (game) { return game === 'rot-blau' || game === 'gelb' || game === 'gold-silber' || game === 'kristall' || game === 'rubin-saphir' || game === 'smaragd' || game === 'diamant-perl' || game === 'schwarz-weiss' || game === 'schwarz2-weiss2' || game === 'x-y' || game === 'sonne-mond'; };
  var CFGS = {
    'rot-blau': {
      start: 'pallet-town',
      base: 'tiles-kanto/', data: 'kanto.json', storage: 'karte-rb-version', versions: ['red', 'blue'], fallback: 'red',
      sprite: 'generation-i/red-blue', maxDex: 151, body: 'is-kanto'
    },
    'gelb': {
      start: 'pallet-town',
      base: 'tiles-yellow/', data: 'yellow.json', storage: 'karte-yellow-version', versions: ['yellow'], fallback: 'yellow',
      sprite: 'generation-i/yellow', maxDex: 151, body: 'is-yellow', maxZoom: 6,
      attribution: 'tiles-yellow/SOURCE.txt'
    },
    'gold-silber': {
      start: 'new-bark-town',
      base: 'tiles-gold-silver/', data: 'gold-silver.json', storage: 'karte-gs-version', versions: ['gold', 'silver'], fallback: 'gold',
      sprite: 'generation-ii/gold', maxDex: 251, body: 'is-gs', markers: false, maxZoom: 6,
      attribution: 'tiles-gold-silver/SOURCE.txt'
    },
    'kristall': {
      start: 'new-bark-town',
      base: 'tiles-crystal/', data: 'crystal.json', storage: 'karte-crystal-version', versions: ['crystal'], fallback: 'crystal',
      sprite: 'generation-ii/crystal', maxDex: 251, body: 'is-crystal', markers: false, maxZoom: 6,
      attribution: 'tiles-crystal/SOURCE.txt'
    },
    'rubin-saphir': {
      start: 'littleroot-town',
      base: 'tiles-ruby-sapphire/', data: 'ruby-sapphire.json', storage: 'karte-rs-version', versions: ['ruby', 'sapphire'], fallback: 'ruby',
      sprite: 'generation-iii/ruby-sapphire', maxDex: 386, body: 'is-rs', markers: false, maxZoom: 6,
      attribution: 'tiles-ruby-sapphire/SOURCE.txt'
    },
    'smaragd': {
      start: 'littleroot-town',
      base: 'tiles-emerald/', data: 'emerald.json', storage: 'karte-emerald-version', versions: ['emerald'], fallback: 'emerald',
      sprite: 'generation-iii/emerald', maxDex: 386, body: 'is-emerald', markers: false, maxZoom: 6,
      attribution: 'tiles-emerald/SOURCE.txt'
    },
    'diamant-perl': {
      start: 'twinleaf-town',
      base: 'tiles-diamond-pearl/', data: 'diamond-pearl.json', storage: 'karte-dp-version', versions: ['diamond', 'pearl'], fallback: 'diamond',
      sprite: 'generation-iv/diamond-pearl', maxDex: 493, body: 'is-dp', markers: false, maxZoom: 6,
      attribution: 'tiles-diamond-pearl/SOURCE.txt'
    },
    'schwarz-weiss': {
      start: 'nuvema-town',
      base: 'tiles-unova/', data: 'unova.json', storage: 'karte-bw-version', versions: ['black', 'white'], fallback: 'white',
      sprite: 'generation-v/black-white', maxDex: 649, body: 'is-unova', markers: false, maxZoom: 6, versionedTiles: true,
      attribution: 'tiles-unova/SOURCE.txt'
    },
    'schwarz2-weiss2': {
      start: 'aspertia-city',
      base: 'tiles-unova-b2w2/', data: 'unova-b2w2.json', storage: 'karte-b2w2-version', versions: ['black-2', 'white-2'], fallback: 'white-2',
      sprite: 'generation-v/black-white', maxDex: 649, body: 'is-unova-b2w2', markers: false, maxZoom: 6,
      attribution: 'tiles-unova-b2w2/SOURCE.txt'
    },
    'x-y': {
      start: 'vaniville-town',
      base: 'tiles-kalos-xy/', data: 'kalos-xy.json', storage: 'karte-xy-version', versions: ['x', 'y'], fallback: 'x',
      sprite: 'generation-vi/x-y', maxDex: 721, body: 'is-xy', markers: false, labelZoom: true, maxZoom: 6,
      attribution: 'tiles-kalos-xy/SOURCE.txt'
    },
    'sonne-mond': {
      start: 'route-1', startRegion: true,   // Atlas: ganze Insel Mele-Mele statt nur Route 1
      base: 'tiles-alola-sm/', data: 'alola-sm.json', storage: 'karte-sm-version', versions: ['sun', 'moon'], fallback: 'sun',
      sprite: 'generation-vii/icons', maxDex: 802, body: 'is-sm', markers: false, labels: false, svgAreas: true, maxZoom: 6,
      attribution: 'tiles-alola-sm/SOURCE.txt'
    }
  };

  // Der Spielchip lebt auf jeder Seite. Sobald der gewünschte Kartenmodus wechselt, wird die Seite einmal sauber
  // neu aufgebaut; dadurch laufen nie zwei Leaflet-Instanzen oder zwei Seitendarstellungen gleichzeitig.
  document.addEventListener('hubgamechange', function () {
    var next = window.PokeHubGame && window.PokeHubGame.get();
    if (isRetroGame(next) !== !!window.KARTE_RETRO || (window.KARTE_RETRO && next !== GAME)) location.reload();
  });
  if (!isRetroGame(GAME)) return;
  var CFG = CFGS[GAME];
  window.KARTE_RETRO = true;
  window.KARTE_KANTO = GAME === 'rot-blau';
  window.KARTE_YELLOW = GAME === 'gelb';
  window.KARTE_GS = GAME === 'gold-silber';
  window.KARTE_CRYSTAL = GAME === 'kristall';
  window.KARTE_RS = GAME === 'rubin-saphir';
  window.KARTE_EMERALD = GAME === 'smaragd';
  window.KARTE_DP = GAME === 'diamant-perl';
  window.KARTE_UNOVA = GAME === 'schwarz-weiss';
  window.KARTE_B2W2 = GAME === 'schwarz2-weiss2';
  window.KARTE_XY = GAME === 'x-y';
  window.KARTE_SM = GAME === 'sonne-mond';

  // app.js kommt absichtlich erst nach dieser Spezialkarte. Die Sprache deshalb hier selbst früh setzen,
  // damit auch sofort geladene lokale JSON-Dateien bereits in der gewählten Hub-Sprache gerendert werden.
  if (window.LANG !== 'de' && window.LANG !== 'en') {
    try { window.LANG = localStorage.getItem('hub-lang') === 'en' ? 'en' : 'de'; }
    catch (e) { window.LANG = 'de'; }
  }

  var BASE = CFG.base;
  var DATA_URL = CFG.data;
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  };
  var lang = function () { return window.LANG === 'en' ? 'en' : 'de'; };
  var edition = function () {
    try { var value = localStorage.getItem(CFG.storage); return CFG.versions.indexOf(value) >= 0 ? value : CFG.fallback; }
    catch (e) { return CFG.fallback; }
  };
  var tileBase = function () { return BASE + (CFG.versionedTiles ? edition() + '/' : ''); };
  var locName = function (l) { return lang() === 'en' ? l.en : l.de; };
  var monName = function (id) { return (window.pokemonName && window.pokemonName(id, null, lang())) || '#' + id; };
  var monSprite = function (id) {
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/' + CFG.sprite + '/' + id + '.png';
  };
  var itemSprite = function (it) {
    if (it.tm) return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/tm-normal.png';
    return 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/' + it.id + '.png';
  };
  var ll = function (x, z) { return L.latLng(-z, x); };
  var norm = function (s) {
    return String(s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
  };

  var TEXT = {
    de: {
      title: 'Karte von Kanto', badge: 'Rot / Blau',
      subtitle: 'Orte, Items, Trainer und wilde Pokémon – direkt auf der originalen Spielwelt.',
      note: 'Karte aus den originalen Kartenblöcken von Pokémon Rot und Blau gerendert; Orte und Inhalte aus dem Spielcode (pret/pokered).',
      search: 'Ort, Pokémon, Item oder Trainer suchen…', loading: 'Kanto-Karte wird geladen…',
      loadError: 'Die Kanto-Karte konnte nicht geladen werden.', all: 'Alle Orte', hint: 'Tippe auf die Karte oder wähle einen Ort.',
      towns: 'Städte', routes: 'Routen', places: 'Orte', city: 'Stadt', town: 'Ort', route: 'Route', place: 'Ort',
      items: 'Items', hidden: 'Versteckt', tms: 'TMs', trainers: 'Trainer', wild: 'Wilde Pokémon',
      noItems: 'Hier sind keine Items auf der Oberwelt eingetragen.', noTrainers: 'Hier stehen keine Trainer auf der Oberwelt.',
      noWild: 'Hier gibt es keine wilden Pokémon.', grass: 'Gras', surf: 'Surfen', level: 'Lv.', chance: 'Chance',
      red: 'Rot', blue: 'Blau', back: 'Alle Orte', show: 'Auf der Karte zeigen',
      itemBall: 'Item-Ball', hiddenItem: 'Verstecktes Item', tm: 'TM', trainer: 'Trainer',
      countItems: 'Items', countTrainers: 'Trainer', countWild: 'Arten', noResults: 'Nichts gefunden.',
      monPlaces: 'Fundorte', monPlaces1: 'Fundort', monNone: 'Dieses Pokémon ist in dieser Edition nicht wild auf der Karte zu finden.',
      dex: 'Im Pokédex ansehen →', editionLabel: 'Edition',
      morning: 'Morgens', day: 'Tags', night: 'Nachts', oldRod: 'Angel', goodRod: 'Profiangel', superRod: 'Superangel',
      rock: 'Zertrümmerer', headbutt: 'Kopfnuss', headbuttRare: 'Kopfnuss (seltene Bäume)', headbuttSecret: 'Kopfnuss (besondere Bäume)',
      swarm: 'Schwarm', hoenn: 'Hoenn-Klang (Radio)', sinnoh: 'Sinnoh-Klang (Radio)', nightFish: 'Nachts an der Angel',
      static: 'Feste Begegnung', giftMon: 'Geschenk', egg: 'Ei', special: 'Besondere Pokémon', outside: 'Draußen',
      gift: 'Geschenk', gifts: 'Geschenke', entrance: 'Eingänge', double: 'Doppelkampf', inside: 'Im Gebäude – zeigt den Eingang',
      rivalNote: 'Team hängt von deinem Starter ab', johto: 'Johto', kanto: 'Kanto', fish: 'Angeln',
      swarmHint: 'Nur wenn das Radio (Pokémon-Talk) einen Schwarm hier meldet – ersetzt dann 40 % der Begegnungen.',
      radioHint: 'Mit dem Hoenn- bzw. Sinnoh-Klang im Radio statt der Plätze mit 10 %.'
    },
    en: {
      title: 'Map of Kanto', badge: 'Red / Blue',
      subtitle: 'Places, items, trainers and wild Pokémon – directly on the original game world.',
      note: 'Map rendered from Pokémon Red and Blue’s original map blocks; places and contents from the game code (pret/pokered).',
      search: 'Search place, Pokémon, item or trainer…', loading: 'Loading Kanto map…',
      loadError: 'The Kanto map could not be loaded.', all: 'All places', hint: 'Tap the map or choose a place.',
      towns: 'Towns & cities', routes: 'Routes', places: 'Places', city: 'City', town: 'Town', route: 'Route', place: 'Place',
      items: 'Items', hidden: 'Hidden', tms: 'TMs', trainers: 'Trainers', wild: 'Wild Pokémon',
      noItems: 'No overworld items are listed here.', noTrainers: 'No overworld trainers are listed here.',
      noWild: 'There are no wild Pokémon here.', grass: 'Grass', surf: 'Surf', level: 'Lv.', chance: 'Chance',
      red: 'Red', blue: 'Blue', back: 'All places', show: 'Show on map',
      itemBall: 'Item ball', hiddenItem: 'Hidden item', tm: 'TM', trainer: 'Trainer',
      countItems: 'items', countTrainers: 'trainers', countWild: 'species', noResults: 'Nothing found.',
      monPlaces: 'Locations', monPlaces1: 'Location', monNone: 'This Pokémon is not found in the wild on this map in the selected version.',
      dex: 'Open in Pokédex →', editionLabel: 'Version',
      morning: 'Morning', day: 'Day', night: 'Night', oldRod: 'Old Rod', goodRod: 'Good Rod', superRod: 'Super Rod',
      rock: 'Rock Smash', headbutt: 'Headbutt', headbuttRare: 'Headbutt (rare trees)', headbuttSecret: 'Headbutt (special trees)',
      swarm: 'Swarm', hoenn: 'Hoenn Sound (radio)', sinnoh: 'Sinnoh Sound (radio)', nightFish: 'At night on the rod',
      static: 'Static encounter', giftMon: 'Gift', egg: 'Egg', special: 'Special Pokémon', outside: 'Outside',
      gift: 'Gift', gifts: 'Gifts', entrance: 'Entrances', double: 'Double battle', inside: 'Inside – shows the entrance',
      rivalNote: 'Team depends on your starter', johto: 'Johto', kanto: 'Kanto', fish: 'Fishing',
      swarmHint: 'Only while the radio (Pokémon Talk) reports a swarm here – then replaces 40 % of encounters.',
      radioHint: 'With the Hoenn or Sinnoh Sound on the radio instead of the 10 % slots.'
    }
  };
  var YELLOW_TEXT = {
    de: {
      title: 'Karte von Kanto', badge: 'Gelb',
      subtitle: 'Gelbs eigene Kanto-Welt mit den offiziellen ortsabhängigen Game-Boy-Color-Farben.',
      note: 'Karte, Tiles, GBC-Paletten und Funddaten wurden direkt aus der vollständigen Gelb-Disassembly (pret/pokeyellow) gerendert.',
      search: 'Ort, Pokémon, Item oder Trainer suchen…', loading: 'Gelb-Karte wird geladen…',
      loadError: 'Die Gelb-Karte konnte nicht geladen werden.', yellow: 'Gelb'
    },
    en: {
      title: 'Map of Kanto', badge: 'Yellow',
      subtitle: 'Yellow’s own Kanto world with the official location-specific Game Boy Color palettes.',
      note: 'The map, tiles, GBC palettes and encounters are rendered directly from the complete Yellow disassembly (pret/pokeyellow).',
      search: 'Search place, Pokémon, item or trainer…', loading: 'Loading Yellow map…',
      loadError: 'The Yellow map could not be loaded.', yellow: 'Yellow'
    }
  };
  var CRYSTAL_TEXT = {
    de: {
      title: 'Karte von Johto & Kanto', badge: 'Kristall',
      subtitle: 'Kristalls eigene Game-Boy-Color-Welten mit veränderten Karten, Paletten und Fundorten.',
      note: 'Karte, Tiles, Paletten und Funddaten wurden direkt aus der vollständigen Kristall-Disassembly (pret/pokecrystal) gerendert – inklusive Duellturm.',
      search: 'Ort oder Pokémon suchen…', loading: 'Kristall-Karte wird geladen…',
      loadError: 'Die Kristall-Karte konnte nicht geladen werden.', crystal: 'Kristall'
    },
    en: {
      title: 'Map of Johto & Kanto', badge: 'Crystal',
      subtitle: 'Crystal’s own Game Boy Color worlds with changed maps, palettes and encounters.',
      note: 'The map, tiles, palettes and encounters are rendered directly from the complete Crystal disassembly (pret/pokecrystal), including the Battle Tower.',
      search: 'Search place or Pokémon…', loading: 'Loading Crystal map…',
      loadError: 'The Crystal map could not be loaded.', crystal: 'Crystal'
    }
  };
  var EMERALD_TEXT = {
    de: {
      title: 'Karte von Hoenn', badge: 'Smaragd',
      subtitle: 'Smaragds originale GBA-Welt mit Kampffront, Safari-Zone und eigenen Fundorten.',
      note: 'Karte, Tiles, Paletten und Funddaten wurden direkt aus der vollständigen Smaragd-Disassembly (pret/pokeemerald) gerendert.',
      search: 'Ort oder Pokémon suchen…', loading: 'Smaragd-Karte wird geladen…',
      loadError: 'Die Smaragd-Karte konnte nicht geladen werden.', emerald: 'Smaragd'
    },
    en: {
      title: 'Map of Hoenn', badge: 'Emerald',
      subtitle: 'Emerald’s original GBA world with the Battle Frontier, Safari Zone and its own encounters.',
      note: 'The map, tiles, palettes and encounters are rendered directly from the complete Emerald disassembly (pret/pokeemerald).',
      search: 'Search place or Pokémon…', loading: 'Loading Emerald map…',
      loadError: 'The Emerald map could not be loaded.', emerald: 'Emerald'
    }
  };
  var RS_TEXT = {
    de: {
      title: 'Karte von Hoenn', badge: 'Rubin / Saphir',
      subtitle: 'Die originale Rubin/Saphir-GBA-Welt mit editionsspezifischen Fundorten.',
      note: 'Karte, Tiles, Paletten und Funddaten wurden direkt aus der vollständigen Rubin/Saphir-Disassembly (pret/pokeruby) gerendert – inklusive Kampfturm und ursprünglicher Safari-Zone.',
      search: 'Ort oder Pokémon suchen…', loading: 'Rubin/Saphir-Karte wird geladen…',
      loadError: 'Die Rubin/Saphir-Karte konnte nicht geladen werden.', ruby: 'Rubin', sapphire: 'Saphir'
    },
    en: {
      title: 'Map of Hoenn', badge: 'Ruby / Sapphire',
      subtitle: 'The original Ruby/Sapphire GBA world with version-specific encounters.',
      note: 'The map, tiles, palettes and encounters are rendered directly from the complete Ruby/Sapphire disassembly (pret/pokeruby), including the Battle Tower and original Safari Zone.',
      search: 'Search place or Pokémon…', loading: 'Loading Ruby/Sapphire map…',
      loadError: 'The Ruby/Sapphire map could not be loaded.', ruby: 'Ruby', sapphire: 'Sapphire'
    }
  };
  var DP_TEXT = {
    de: {
      title: 'Karte von Sinnoh', badge: 'Diamant / Perl',
      subtitle: 'Die originale Diamant/Perl-Spielwelt mit editionsspezifischen Fundorten.',
      note: 'Die Karte wurde direkt aus den originalen 3D-Modellen, Gebäuden, Texturen und der Weltmatrix von Pokémon Diamant und Perl gerendert; Funddaten stammen editionsspezifisch aus der PokeAPI.',
      search: 'Ort oder Pokémon suchen…', loading: 'Diamant/Perl-Karte wird geladen…',
      loadError: 'Die Diamant/Perl-Karte konnte nicht geladen werden.', diamond: 'Diamant', pearl: 'Perl'
    },
    en: {
      title: 'Map of Sinnoh', badge: 'Diamond / Pearl',
      subtitle: 'The original Diamond/Pearl game world with version-specific encounters.',
      note: 'The map is rendered directly from Pokémon Diamond and Pearl\'s original 3D models, buildings, textures and world matrix; version-specific encounters come from PokeAPI.',
      search: 'Search place or Pokémon…', loading: 'Loading Diamond/Pearl map…',
      loadError: 'The Diamond/Pearl map could not be loaded.', diamond: 'Diamond', pearl: 'Pearl'
    }
  };
  var GS_TEXT = {
    de: {
      title: 'Karte von Johto & Kanto', badge: 'Gold / Silber',
      subtitle: 'Die originalen Game-Boy-Color-Welten mit editionsspezifischen Fundorten.',
      note: 'Karte, Tiles, Paletten und Funddaten wurden direkt aus der vollständigen Gold/Silber-Disassembly (pret/pokegold) gerendert.',
      search: 'Ort oder Pokémon suchen…', loading: 'Gold/Silber-Karte wird geladen…',
      loadError: 'Die Gold/Silber-Karte konnte nicht geladen werden.', gold: 'Gold', silver: 'Silber'
    },
    en: {
      title: 'Map of Johto & Kanto', badge: 'Gold / Silver',
      subtitle: 'The original Game Boy Color worlds with version-specific encounters.',
      note: 'The map, tiles, palettes and encounters are rendered directly from the complete Gold/Silver disassembly (pret/pokegold).',
      search: 'Search place or Pokémon…', loading: 'Loading Gold/Silver map…',
      loadError: 'The Gold/Silver map could not be loaded.', gold: 'Gold', silver: 'Silver'
    }
  };
  var UNOVA_TEXT = {
    de: {
      title: 'Karte von Einall', badge: 'Schwarz / Weiß',
      subtitle: 'Orte und wilde Pokémon aus Schwarz und Weiß – mit editionsspezifischen Fundorten.',
      note: 'Weiß wurde direkt aus den Kartenmodellen und Texturen der bereitgestellten Spiel-ROM gerendert. Schwarz nutzt bis zu einer passenden ROM die ausgerichtete Mewmaps-Karte; Funddaten stammen aus der PokeAPI.',
      search: 'Ort oder Pokémon suchen…', loading: 'Einall-Karte wird geladen…',
      loadError: 'Die Einall-Karte konnte nicht geladen werden.', black: 'Schwarz', white: 'Weiß'
    },
    en: {
      title: 'Map of Unova', badge: 'Black / White',
      subtitle: 'Places and wild Pokémon from Black and White – with version-specific encounters.',
      note: 'White is rendered directly from the supplied game ROM’s map models and textures. Black uses the aligned Mewmaps map until a matching ROM is available; encounter data comes from PokeAPI.',
      search: 'Search place or Pokémon…', loading: 'Loading Unova map…',
      loadError: 'The Unova map could not be loaded.', black: 'Black', white: 'White'
    }
  };
  var B2W2_TEXT = {
    de: {
      title: 'Karte von Einall', badge: 'Schwarz 2 / Weiß 2',
      subtitle: 'Die veränderte Einall-Welt zwei Jahre später – mit neuen Städten, Routen und editionsspezifischen Fundorten.',
      note: 'Die Karte wurde direkt aus den Modellen und Texturen der bereitgestellten deutschen Weiß-2-ROM gerendert. Ortsflächen und getrennte Schwarz-2-/Weiß-2-Funddaten stammen aus fuddlesworth/pokebw2.',
      search: 'Ort oder Pokémon suchen…', loading: 'Schwarz-2/Weiß-2-Karte wird geladen…',
      loadError: 'Die Schwarz-2/Weiß-2-Karte konnte nicht geladen werden.', 'black-2': 'Schwarz 2', 'white-2': 'Weiß 2'
    },
    en: {
      title: 'Map of Unova', badge: 'Black 2 / White 2',
      subtitle: 'Unova two years later, with new cities, routes and version-specific encounters.',
      note: 'The map is rendered directly from the supplied German White 2 ROM’s models and textures. Location bounds and separate Black 2/White 2 encounters come from fuddlesworth/pokebw2.',
      search: 'Search place or Pokémon…', loading: 'Loading Black 2/White 2 map…',
      loadError: 'The Black 2/White 2 map could not be loaded.', 'black-2': 'Black 2', 'white-2': 'White 2'
    }
  };
  var XY_TEXT = {
    de: {
      title: 'Karte von Kalos', badge: 'X / Y',
      subtitle: 'Kalos als echte 3DS-Spielwelt mit editionsspezifischen Fundorten aus X und Y.',
      note: 'Die Karte wurde direkt aus den 3D-Modellen, Texturen, Matrizen und Zonen der bereitgestellten europäischen Pokémon-X-ROM gerendert. Die Funddaten wurden getrennt aus den X- und Y-ROMs gelesen.',
      search: 'Ort oder Pokémon suchen…', loading: 'Kalos-Karte wird geladen…',
      loadError: 'Die Kalos-Karte konnte nicht geladen werden.', x: 'X', y: 'Y'
    },
    en: {
      title: 'Map of Kalos', badge: 'X / Y',
      subtitle: 'Kalos as the real 3DS game world with version-specific encounters from X and Y.',
      note: 'The map is rendered directly from the supplied European Pokémon X ROM’s 3D models, textures, matrices and zones. Encounter data is read separately from the X and Y ROMs.',
      search: 'Search place or Pokémon…', loading: 'Loading Kalos map…',
      loadError: 'The Kalos map could not be loaded.', x: 'X', y: 'Y'
    }
  };
  var SM_TEXT = {
    de: {
      title: 'Karte von Alola', badge: 'Sonne / Mond',
      subtitle: 'Tippe auf eine Ortskarte: Alolas vier Inseln als Atlas aus echten gerenderten Gen-7-Spielwelten.',
      note: 'Die 3D-Szenen wurden aus den mit Sonne/Mond geteilten Alola-Feldarchiven der bereitgestellten Ultra-Sonne-ROM gerendert; Ultra-exklusive Gebiete sind ausgeschlossen.',
      search: 'Ort oder Pokémon suchen…', loading: 'Alola-Karte wird geladen…',
      loadError: 'Die Sonne/Mond-Karte konnte nicht geladen werden.', sun: 'Sonne', moon: 'Mond'
    },
    en: {
      title: 'Map of Alola', badge: 'Sun / Moon',
      subtitle: 'Tap a location card: Alola’s four islands as an atlas of genuinely rendered Gen 7 game worlds.',
      note: 'The 3D scenes are rendered from Alola field archives shared with Sun/Moon in the supplied Ultra Sun ROM; Ultra-exclusive areas are excluded.',
      search: 'Search place or Pokémon…', loading: 'Loading Alola map…',
      loadError: 'The Sun/Moon map could not be loaded.', sun: 'Sun', moon: 'Moon'
    }
  };
  var tx = function () {
    if (GAME === 'gelb') return Object.assign({}, TEXT[lang()], YELLOW_TEXT[lang()]);
    if (GAME === 'gold-silber') return Object.assign({}, TEXT[lang()], GS_TEXT[lang()]);
    if (GAME === 'kristall') return Object.assign({}, TEXT[lang()], CRYSTAL_TEXT[lang()]);
    if (GAME === 'rubin-saphir') return Object.assign({}, TEXT[lang()], RS_TEXT[lang()]);
    if (GAME === 'smaragd') return Object.assign({}, TEXT[lang()], EMERALD_TEXT[lang()]);
    if (GAME === 'diamant-perl') return Object.assign({}, TEXT[lang()], DP_TEXT[lang()]);
    if (GAME === 'schwarz-weiss') return Object.assign({}, TEXT[lang()], UNOVA_TEXT[lang()]);
    if (GAME === 'schwarz2-weiss2') return Object.assign({}, TEXT[lang()], B2W2_TEXT[lang()]);
    if (GAME === 'x-y') return Object.assign({}, TEXT[lang()], XY_TEXT[lang()]);
    if (GAME === 'sonne-mond') return Object.assign({}, TEXT[lang()], SM_TEXT[lang()]);
    return TEXT[lang()];
  };

  var D = null, TILES = null, map = null, sheetState = null, sheetSerial = 0, tileRequestSerial = 0;
  var selected = -1, currentTab = 'wild', monView = null;
  var areaLayer = null, labelLayer = null, selectionLayer = null;
  var markerLayers = {}, markerRefs = {};
  var shown = { item: false, hidden: false, tm: false, gift: false, trainer: false, entrance: false };
  var MONS = new Map(), searchIndex = [];

  var ICON_PIN = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';
  var ICON_MAP = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg>';
  var ICON_PERSON = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';

  function typeLabel(l) { return tx()[l.type] || tx().place; }
  /* Wilde Pokémon: ältere Karten liefern je Edition { grass, surf }, HG/SS eine Liste von Bereichen
     ({ area, morning, day, night, surf, old, good, super, rock, headbutt, … }). Hier wird beides zur Liste. */
  var LIST_KEYS = ['grass', 'morning', 'day', 'night', 'surf', 'old', 'good', 'super', 'rock', 'headbutt', 'headbuttRare', 'headbuttSecret'];
  function wildOf(l) {
    var w = l.wild && l.wild[edition()];
    if (!w) return [];
    return Array.isArray(w) ? w : [{ area: '', grass: w.grass || [], surf: w.surf || [] }];
  }
  function blockIds(w) {
    var ids = {};
    LIST_KEYS.forEach(function (k) { (w[k] || []).forEach(function (m) { ids[m.id] = true; }); });
    ['hoenn', 'sinnoh'].forEach(function (k) { (w[k] || []).forEach(function (id) { ids[id] = true; }); });
    if (w.swarm) ids[w.swarm.id] = true;
    if (w.nightFish) ids[w.nightFish] = true;
    return ids;
  }
  function uniqueWildCount(l) {
    var seen = {};
    wildOf(l).forEach(function (w) { Object.assign(seen, blockIds(w)); });
    specialsOf(l).forEach(function (s) { seen[s.id] = true; });
    return Object.keys(seen).length;
  }
  function itemKind(it) { return it.tm || it.kind === 'tm' ? 'tm' : it.kind === 'hidden' ? 'hidden' : it.kind === 'gift' ? 'gift' : 'item'; }
  // Besondere Pokémon (feste Begegnungen, Geschenke) – manche nur in einer Edition (Ho-Oh/Lugia-Level, Latios/Latias)
  function specialsOf(l) { return (l.special || []).filter(function (s) { return !s.ver || s.ver === edition(); }); }
  function areaLabel(x) { return lang() === 'en' ? (x.areaEn || x.area || '') : (x.area || ''); }
  function itemName(it) { return lang() === 'en' ? (it.en || it.de) : (it.de || it.en); }
  function trainerName(tr) { return lang() === 'en' ? (tr.en || tr.cls) : (tr.de || tr.en || tr.cls); }

  /* Kartenblätter: die Übersicht liegt immer unten; passende feinere Blätter werden erst im sichtbaren Bereich
     dekodiert (img.decode() vor dem Einhängen, sonst wartet der Compositor auf große WebP-Blätter). Wie bei
     Platin bleiben höchstens KEEP Blätter im Speicher – die am längsten nicht gebrauchten werden freigegeben. */
  function clearSheets() {
    if (!sheetState) return;
    map.off('moveend zoomend', sheetState.update);
    map.off('move', sheetState.onMove);
    map.off('zoomstart', sheetState.onZoomStart);
    map.off('zoomend', sheetState.onZoomEnd);
    sheetState.sheets.forEach(function (s) { if (s.layer) map.removeLayer(s.layer); s.img = null; });
    sheetState.panes.forEach(function (name) { map.getPane(name)?.remove(); });
    sheetState = null;
  }

  function setupSheets() {
    clearSheets();
    var base = tileBase();
    var serial = ++sheetSerial;
    var KEEP = window.PokeHubLite ? 6 : 24, used = [];
    var levels = TILES.levels.slice().sort(function (a, b) { return a.z - b.z; });
    var sheets = [], panes = [];
    levels.forEach(function (lv, order) {
      var paneName = 'kanto-sheets-' + serial + '-' + lv.z;
      var pane = map.createPane(paneName);
      panes.push(paneName);
      pane.style.zIndex = String(210 + order);
      pane.style.pointerEvents = 'none';
      var span = lv.size / Math.pow(2, lv.z);
      var pixel = 1 / Math.pow(2, lv.z);
      lv.sheets.forEach(function (key) {
        var xy = key.split('_').map(Number), x0 = xy[0] * span, z0 = xy[1] * span;
        var x1 = Math.min(D.width, x0 + span) + pixel;
        var z1 = Math.min(D.height, z0 + span) + pixel;
        sheets.push({
          z: lv.z, base: order === 0, url: base + lv.z + '/' + key + '.webp', pane: paneName,
          bounds: L.latLngBounds(ll(x0, z1), ll(x1, z0)), img: null, ready: false, failed: false, want: false, layer: null
        });
      });
    });

    var overviewReady = false;
    // Beim Zoomen werden neue Blätter schon geladen und dekodiert, aber erst am Ende eingehängt – ein neues Blatt
    // mitten im Gleiten müsste der Browser sofort malen (das ruckelt); danach ist es ohne Wartezeit scharf
    var zooming = false;
    function attach(s) {
      if (s.layer || !s.ready || !s.want || zooming || serial !== sheetSerial) return;
      s.layer = L.imageOverlay(s.img, s.bounds, { pane: s.pane, className: 'game-sheet kanto-sheet', interactive: false }).addTo(map);
      if (s.base && !overviewReady) {
        overviewReady = true;
        $('map-loading').hidden = true;
      }
    }
    function detach(s) { if (s.layer) { map.removeLayer(s.layer); s.layer = null; } }
    function load(s) {
      var i = used.indexOf(s);
      if (i >= 0) used.splice(i, 1);
      used.push(s);
      if (s.failed) return;
      if (s.img) { attach(s); return; }
      var img = s.img = new Image();
      img.decoding = 'async';
      var settled = false;
      function ok() {
        if (settled || s.img !== img) return;
        settled = true;
        if (!img.naturalWidth) { fail(); return; }
        s.ready = true;
        attach(s);
      }
      function fail() {
        if (s.img !== img || serial !== sheetSerial) return;
        settled = true;
        s.failed = true; s.img = null;
        if (s.base && !overviewReady) {
          $('map-loading').hidden = false;
          $('map-loading').textContent = tx().loadError;
        }
      }
      img.onerror = fail;
      img.src = s.url;
      if (img.decode) img.decode().then(ok, function () { if (img.complete && img.naturalWidth) ok(); else fail(); });
      else img.onload = ok;
      // zu viele im Speicher: die am längsten nicht gebrauchten loslassen (die Übersicht bleibt immer)
      for (var k = 0; used.length > KEEP && k < used.length;) {
        var o = used[k];
        if (o.want || o.base) { k++; continue; }
        detach(o); o.img = null; o.ready = false; used.splice(k, 1);
      }
    }
    function update() {
      var zoom = map.getZoom(), view = map.getBounds().pad(0.6);
      levels.forEach(function (lv, i) {
        // Stufe ab etwa 1¼ Zoomstufen unter ihrer vollen Auflösung zeigen; die gröbste immer
        var on = i === 0 || zoom >= lv.z - 1.25;
        sheets.forEach(function (s) {
          if (s.z !== lv.z) return;
          s.want = on && (i === 0 || view.intersects(s.bounds));
          if (s.want) load(s); else detach(s);
        });
      });
    }
    var onMove = L.Util.throttle(update, 120);
    var onZoomStart = function () { zooming = true; }, onZoomEnd = function () { zooming = false; };
    sheetState = { update: update, onMove: onMove, onZoomStart: onZoomStart, onZoomEnd: onZoomEnd, sheets: sheets, panes: panes };
    map.on('zoomstart', onZoomStart);
    map.on('zoomend', onZoomEnd);
    map.on('moveend zoomend', update);
    map.on('move', onMove);
    update();
  }

  // Offenes Meer: Wassermuster aus dem Spiel (<Kachelordner>/sea.png), an den Weltkoordinaten ausgerichtet
  var SeaLayer = L.GridLayer.extend({
    createTile: function (coords) {
      var el = document.createElement('div');
      el.className = 'sea-tile kanto-sea';
      el.style.backgroundImage = 'url("' + tileBase() + 'sea.png")';
      var size = this.options.pattern * Math.pow(2, coords.z - this.options.nativeZoom), ts = this.getTileSize();
      if (size >= 2) {
        el.style.backgroundSize = size + 'px ' + size + 'px';
        var off = function (v) { return -(((v % size) + size) % size) + 'px'; };
        el.style.backgroundPosition = off(coords.x * ts.x) + ' ' + off(coords.y * ts.y);
      } else el.style.backgroundImage = 'none';
      return el;
    }
  });

  /* Schrägsicht (3D-Karten wie HG/SS): eine Stelle in Höhe h (Kacheln) erscheint um shear·h weiter oben.
     Bodenhöhen je Block: Zahl (eben) oder Base64 mit 1024 Bytes (Höhe·4 + 16); bei Brücken alle Ebenen in „multi". */
  var ground = null;
  function decodeGround(idx) {
    if (!idx || !idx.ground || !idx.shear) return null;
    var grid = new Map();
    Object.keys(idx.ground).forEach(function (key) {
      var v = idx.ground[key];
      if (typeof v === 'number') { grid.set(key, v); return; }
      var bin = atob(v), arr = new Float32Array(bin.length);
      for (var i = 0; i < bin.length; i++) arr[i] = (bin.charCodeAt(i) - 16) / 4;
      grid.set(key, arr);
    });
    return { shear: idx.shear, grid: grid, multi: idx.multi || {} };
  }
  function lift(x, z, y) {
    if (!ground) return 0;
    var tx = Math.floor(x), tz = Math.floor(z), multi = ground.multi[tx + '_' + tz];
    var h;
    if (multi && y != null) h = multi.reduce(function (a, b) { return Math.abs(b - y) < Math.abs(a - y) ? b : a; });
    else {
      var r = Math.floor(tz / 32), c = Math.floor(tx / 32), v = ground.grid.get(r + ':' + c);
      h = v == null ? 0 : typeof v === 'number' ? v : v[(tz - r * 32) * 32 + (tx - c * 32)];
    }
    return ground.shear * h;
  }
  // Spielkachel (Mitte) → Punkt auf dem Bild
  var llg = function (pos, y) { var x = pos[0] + 0.5, z = pos[1] + 0.5; return ll(x, z - lift(x, z, y)); };
  // Klick- und Auswahlflächen: Felder der Weltkarte; Höhlen/Türme ohne eigene Felder nur kleine Flächen an ihren Eingängen
  var rectsOf = function (l) {
    if (l.rects && l.rects.length) return l.rects;
    if (l.entrances && l.entrances.length) return l.entrances.map(function (e) { return [e[0] - 1, e[1] - 1, e[0] + 2, e[1] + 2]; });
    return l.area ? [l.area] : [];
  };
  var rectBounds = function (r) { return L.latLngBounds(ll(r[0], r[3]), ll(r[2], r[1])); };

  function switchTileEdition() {
    var request = ++tileRequestSerial;
    $('map-loading').hidden = false;
    $('map-loading').textContent = tx().loading;
    fetch(tileBase() + 'index.json').then(function (r) {
      if (!r.ok) throw new Error(r.status);
      return r.json();
    }).then(function (tiles) {
      if (request !== tileRequestSerial) return;
      TILES = tiles;
      setupSheets();
    }).catch(function (err) {
      if (request !== tileRequestSerial) return;
      console.error('Unova map:', err);
      $('map-loading').hidden = false;
      $('map-loading').textContent = tx().loadError;
    });
  }

  function setupMap() {
    map = L.map('map', {
      crs: L.CRS.Simple, minZoom: -2, maxZoom: CFG.maxZoom || 6, zoomSnap: 0.25, zoomDelta: 0.5,
      scrollWheelZoom: false, smoothWheelZoom: true,   // stufenlos (smooth-wheel.js)
      // SVG statt Canvas: base.css zwingt jedes <canvas> auf width:100%/height:auto – Leaflets Canvas-Renderer
      // zeichnete Auswahl, Flächen und Marker dadurch verzerrt bzw. gar nicht sichtbar
      attributionControl: false, preferCanvas: false, maxBoundsViscosity: 0.72
    });
    var world = L.latLngBounds(ll(0, D.height), ll(D.width, 0));
    // Breite Welten (Johto + Kanto) passen auf dem Handy erst unter Zoom −2 ganz ins Bild. Beim Start ist der
    // Container teils noch breiter als nach dem fertigen Layout – daher nach dem ersten Bild noch einmal anpassen.
    var fitWorld = function (refit) {
      map.invalidateSize();
      // getBoundsZoom klemmt auf den bisherigen Mindest-Zoom – daher selbst rechnen
      var size = map.getSize(), fit = Math.min(Math.log2((size.x - 24) / D.width), Math.log2((size.y - 24) / D.height));
      if (isFinite(fit)) map.setMinZoom(Math.min(-2, Math.floor(fit * 4) / 4));
      if (refit) startView();
    };
    // Ohne Direktlink beginnt die Karte im Startort des Spiels (mit etwas Umgebung) – nicht in der ganzen Region
    var startView = function () {
      var l = D.locations.find(function (x) { return x.slug === CFG.start; }), b = l && boundsOf(l);
      if (b && CFG.startRegion) D.locations.forEach(function (x) { var xb = x.region === l.region && boundsOf(x); if (xb) b.extend(xb); });
      // Atlas: oben Platz für den Titel der Insel
      if (b) map.fitBounds(CFG.startRegion ? b : b.pad(1.5), { paddingTopLeft: [12, CFG.startRegion ? 64 : 12], paddingBottomRight: [12, 12], maxZoom: 3, animate: false });
      else map.fitBounds(world, { padding: [12, 12] });
    };
    fitWorld(false);
    map.setMaxBounds(world.pad(0.18));
    startView();
    setTimeout(function () { fitWorld(selected < 0 && monView == null); }, 250);
    ground = decodeGround(TILES);
    if (CFG.labelZoom) {
      // Weit weg nur Städte, dann Orte, ab mittlerem Zoom auch die Routen – sonst überdecken sich die Namen
      var onZoom = function () {
        var z = map.getZoom(), el = map.getContainer();
        el.classList.toggle('z-far', z < 0.75);
        el.classList.toggle('z-vfar', z < -0.25);
      };
      map.on('zoomend', onZoom);
      onZoom();
    }
    if (TILES.sea) new SeaLayer({ pattern: TILES.sea, nativeZoom: TILES.nativeZoom || 4, minZoom: -3, maxZoom: (CFG.maxZoom || 6) + 1 }).addTo(map);
    setupSheets();

    // Verbindungen (X/Y): Tore und Höhlen, deren Türen auf der Karte auseinanderliegen – gestrichelt, mit einem Punkt je Tür
    if (D.links && D.links.length) {
      var linkLayer = L.layerGroup().addTo(map);
      D.links.forEach(function (k) {
        var a = ll(k.pts[0][0], k.pts[0][1]), b = ll(k.pts[1][0], k.pts[1][1]);
        L.polyline([a, b], { interactive: false, className: 'kanto-link', color: '#fff3c4', weight: 2, opacity: 0.8, dashArray: '2 7', lineCap: 'round' }).addTo(linkLayer);
        [a, b].forEach(function (p) {
          L.circleMarker(p, { interactive: false, className: 'kanto-link-end', radius: 3, color: '#3b2f12', weight: 1, fillColor: '#fff3c4', fillOpacity: 1 }).addTo(linkLayer);
        });
      });
    }
    areaLayer = L.layerGroup().addTo(map);
    labelLayer = L.layerGroup().addTo(map);
    // Flächen: Städte und Routen zuerst, Orte mit eigenem Eingang (Höhlen, Türme …) liegen obenauf
    var order = D.locations.map(function (l, li) { return li; }).sort(function (a, b) {
      return (D.locations[a].rects ? 0 : 1) - (D.locations[b].rects ? 0 : 1) || a - b;
    });
    order.forEach(function (li) {
      var l = D.locations[li];
      rectsOf(l).forEach(function (r) { addArea(l, li, r); });
    });
    buildMarkers();
  }

  // Hover: eine Fläche und ein Umriss je Ort – nicht jedes seiner Rechtecke einzeln (sonst ein Gitter bei Orten aus
  // vielen Rechtecken wie Illumina City oder Route 22). Die Rechtecke selbst bleiben unsichtbare Klickflächen.
  var hoverLayer = null, hoverLi = -1;
  function showHover(li) {
    if (li === hoverLi) return;
    hoverLi = li;
    if (hoverLayer) { map.removeLayer(hoverLayer); hoverLayer = null; }
    var l = D.locations[li];
    if (!l) return;
    var rects = rectsOf(l);
    hoverLayer = L.layerGroup().addTo(map);
    L.polygon(rects.map(function (r) { return [ll(r[0], r[1]), ll(r[2], r[1]), ll(r[2], r[3]), ll(r[0], r[3])]; }), {
      interactive: false, stroke: false, fillColor: '#8ce8b0', fillOpacity: 0.1
    }).addTo(hoverLayer);
    L.polyline(outline(rects).map(function (s) { return [ll(s[0], s[1]), ll(s[2], s[3])]; }), {
      interactive: false, color: '#8ce8b0', weight: 1, opacity: 0.75
    }).addTo(hoverLayer);
  }

  function addArea(l, li, rect) {
    var area = L.rectangle(rectBounds(rect), {
      className: 'kanto-area kanto-area--' + l.type,
      color: '#8ce8b0', weight: 1, opacity: 0, fillColor: '#8ce8b0', fillOpacity: 0
    }).addTo(areaLayer);
    area.locIndex = li;
    area.on('mouseover', function () {
      showHover(li);
      $('hover-name').textContent = locName(l);
      $('hover-name').hidden = false;
    });
    area.on('mouseout', function () {
      // Die Auswahl hat eine eigene gelbe Ebene; die grüne Hover-Fläche kann daher immer verschwinden.
      showHover(-1);
      $('hover-name').hidden = true;
    });
    if (CFG.svgAreas && area.getElement()) {
      var hit = area.getElement();
      hit.setAttribute('role', 'button');
      hit.setAttribute('tabindex', '0');
      hit.setAttribute('aria-label', locName(l));
      hit.addEventListener('pointerdown', function (event) {
        // Leaflets Karten-Drag darf einen normalen Tap auf die Ortskarte
        // nicht als Schwenken verschlucken.
        event.stopPropagation();
      });
      hit.addEventListener('pointerup', function (event) {
        if (event.button !== 0) return;
        event.stopPropagation();
        selectLocation(li);
      });
      hit.addEventListener('keydown', function (event) {
        if (event.key !== 'Enter' && event.key !== ' ') return;
        event.preventDefault();
        selectLocation(li);
      });
    } else {
      area.on('click', function () { selectLocation(li); });
    }
    // Höhlen und Türme ohne eigene Felder: Name knapp über ihrem ersten Eingang
    var at = l.label ? [l.label[0] - 0.5, l.label[1] - 0.5] : l.entrances && l.entrances.length ? [l.entrances[0][0], l.entrances[0][1] - 1.5] : null;
    if (CFG.labels !== false && l.showLabel !== false && at && !labelLayer.getLayers().some(function (m) { return m.locIndex === li; })) {
      var label = L.marker(llg(at), {
        interactive: false, pane: L.labelPane(map),
        icon: L.divIcon({
          className: 'kanto-label-wrap',
          html: '<span class="kanto-label kanto-label--' + l.type + '">' + esc(locName(l)) + '</span>',
          iconSize: [1, 1], iconAnchor: [0, 0]
        })
      }).addTo(labelLayer);
      label.locIndex = li;
    }
  }

  var MARKER_STYLE = {
    item: { radius: 5, color: '#fff', weight: 1.5, fillColor: '#ff5a5a', fillOpacity: 1 },
    hidden: { radius: 5, color: '#ffd23f', weight: 2, dashArray: '2 2', fillColor: '#ffd23f', fillOpacity: 0.2 },
    tm: { radius: 5.5, color: '#0d0f2b', weight: 1.5, fillColor: '#57d2ff', fillOpacity: 1 },
    gift: { radius: 5, color: '#0d0f2b', weight: 1.5, fillColor: '#3ddc84', fillOpacity: 1 },
    trainer: { radius: 4.5, color: '#0d0f2b', weight: 1.5, fillColor: '#ffaa3c', fillOpacity: 1 },
    entrance: { radius: 6, color: '#ffffff', weight: 2, fillColor: '#b48cff', fillOpacity: 1 }
  };
  var MARKER_KINDS = ['item', 'hidden', 'tm', 'gift', 'trainer', 'entrance'];
  function buildMarkers() {
    MARKER_KINDS.forEach(function (kind) {
      markerLayers[kind] = L.layerGroup();
      markerRefs[kind] = [];
    });
    D.locations.forEach(function (l, li) {
      (l.items || []).forEach(function (it, i) {
        if (!it.pos) return;
        var kind = itemKind(it);
        var m = L.circleMarker(llg(it.pos, it.y), Object.assign({ pane: 'markerPane' }, MARKER_STYLE[kind]));
        m.bindTooltip(function () { return itemName(it) + (it.qty > 1 ? ' ×' + it.qty : ''); }, { direction: 'top' });
        m.on('click', function (e) { L.DomEvent.stopPropagation(e); currentTab = 'items'; selectLocation(li, { fly: false, focus: 'i' + i }); });
        markerLayers[kind].addLayer(m);
        markerRefs[kind].push(m);
      });
      (l.trainers || []).forEach(function (tr, i) {
        if (!tr.pos) return;
        var m = L.circleMarker(llg(tr.pos, tr.y), Object.assign({ pane: 'markerPane' }, MARKER_STYLE.trainer));
        m.bindTooltip(function () { return trainerName(tr); }, { direction: 'top' });
        m.on('click', function (e) { L.DomEvent.stopPropagation(e); currentTab = 'trainers'; selectLocation(li, { fly: false, focus: 't' + i }); });
        markerLayers.trainer.addLayer(m);
        markerRefs.trainer.push(m);
      });
      // Höhlen, Türme und Gebäude mit eigenem Namen: an ihren Türen auf der Oberwelt
      (l.entrances || []).forEach(function (e) {
        var m = L.circleMarker(llg(e), Object.assign({ pane: 'markerPane' }, MARKER_STYLE.entrance));
        m.bindTooltip(function () { return locName(l); }, { direction: 'top' });
        m.on('click', function (ev) { L.DomEvent.stopPropagation(ev); selectLocation(li, { fly: false }); });
        markerLayers.entrance.addLayer(m);
        markerRefs.entrance.push(m);
      });
    });
    syncMarkerLayers();
  }
  function syncMarkerLayers() {
    Object.keys(markerLayers).forEach(function (kind) {
      if (shown[kind]) markerLayers[kind].addTo(map); else map.removeLayer(markerLayers[kind]);
    });
  }

  function clearSelection() {
    if (selectionLayer) { map.removeLayer(selectionLayer); selectionLayer = null; }
    if (!areaLayer) return;
    areaLayer.eachLayer(function (a) { a.setStyle({ opacity: 0, fillOpacity: 0 }); });
  }
  function drawSelection(indices) {
    clearSelection();
    var list = Array.isArray(indices) ? indices : indices >= 0 ? [indices] : [];
    if (!list.length) return;
    selectionLayer = L.layerGroup().addTo(map);
    list.forEach(function (li) {
      var l = D.locations[li];
      if (!l) return;
      var rects = l.rects || (l.entrances ? [] : rectsOf(l));
      // alle Rechtecke als eine Fläche (ein SVG-Pfad – keine hellen Fugen zwischen Nachbarn)
      if (rects.length) L.polygon(rects.map(function (r) { return [ll(r[0], r[1]), ll(r[2], r[1]), ll(r[2], r[3]), ll(r[0], r[3])]; }), {
        interactive: false, stroke: false, fillColor: '#ffda08', fillOpacity: 0.08, className: 'kanto-selection'
      }).addTo(selectionLayer);
      // Umriss der Vereinigung statt jedes Rechteck einzeln (Illumina City besteht aus vielen Rechtecken)
      var segs = outline(rects);
      if (segs.length) L.polyline(segs.map(function (s) { return [ll(s[0], s[1]), ll(s[2], s[3])]; }), {
        interactive: false, color: '#ffda08', weight: 2.5, opacity: 0.95, className: 'kanto-selection'
      }).addTo(selectionLayer);
      // Orte ohne eigene Fläche (Höhlen, Türme): ihre Eingänge hervorheben statt Rechtecken
      if (!l.rects && l.entrances) l.entrances.forEach(function (e) {
        L.circleMarker(llg(e), { interactive: false, radius: 11, color: '#ffda08', weight: 3, fillColor: '#ffda08', fillOpacity: 0.25, className: 'kanto-selection' }).addTo(selectionLayer);
      });
    });
  }
  // Umriss mehrerer Rechtecke [x0, z0, x1, z1]: Kanten zwischen bedeckten und freien Feldern eines Rasters aus allen
  // vorkommenden Koordinaten, gerade Stücke zusammengefasst → [[x0, z0, x1, z1], …]
  function outline(rects) {
    if (rects.length < 2) return rects.map(function (r) { return [[r[0], r[1], r[2], r[1]], [r[2], r[1], r[2], r[3]], [r[2], r[3], r[0], r[3]], [r[0], r[3], r[0], r[1]]]; })[0] || [];
    var uniq = function (a) { return a.filter(function (v, i) { return a.indexOf(v) === i; }).sort(function (p, q) { return p - q; }); };
    var xs = uniq([].concat.apply([], rects.map(function (r) { return [r[0], r[2]]; })));
    var zs = uniq([].concat.apply([], rects.map(function (r) { return [r[1], r[3]]; })));
    var cov = zs.map(function () { return new Uint8Array(xs.length); });
    rects.forEach(function (r) {
      for (var j = zs.indexOf(r[1]); j < zs.indexOf(r[3]); j++) for (var i = xs.indexOf(r[0]); i < xs.indexOf(r[2]); i++) cov[j][i] = 1;
    });
    var at = function (j, i) { return j >= 0 && i >= 0 && j < zs.length - 1 && i < xs.length - 1 && cov[j][i]; };
    var out = [], run = null;
    // waagrechte Kanten (Zeilengrenze j), dann senkrechte (Spaltengrenze i); gleiche Kante fortsetzen
    for (var j = 0; j < zs.length; j++) { run = null; for (var i = 0; i < xs.length - 1; i++) {
      var e = !!at(j - 1, i) !== !!at(j, i);
      if (e && run && run[2] === xs[i]) run[2] = xs[i + 1]; else if (e) out.push(run = [xs[i], zs[j], xs[i + 1], zs[j]]); else run = null;
    } }
    for (var i2 = 0; i2 < xs.length; i2++) { run = null; for (var j2 = 0; j2 < zs.length - 1; j2++) {
      var e2 = !!at(j2, i2 - 1) !== !!at(j2, i2);
      if (e2 && run && run[3] === zs[j2]) run[3] = zs[j2 + 1]; else if (e2) out.push(run = [xs[i2], zs[j2], xs[i2], zs[j2 + 1]]); else run = null;
    } }
    return out;
  }
  // Fläche eines Ortes; bei Höhlen und Türmen die Umgebung ihrer Eingänge
  function boundsOf(l) {
    var rects = rectsOf(l);
    if (!rects.length) return null;
    var b = rectBounds(rects[0]);
    rects.slice(1).forEach(function (r) { b.extend(rectBounds(r)); });
    // Einzelner Eingang: etwas Umgebung zeigen
    if (!l.rects && l.entrances && l.entrances.length === 1) b = b.pad(5);
    return b;
  }
  function flyToLocation(li) {
    var b = boundsOf(D.locations[li]);
    if (b) map.flyToBounds(b, { padding: [55, 55], maxZoom: 4, duration: 0.55 });
  }
  function flyToPos(pos, y) { map.flyTo(llg(pos, y), Math.max(4, map.getZoom()), { duration: 0.45 }); }

  function setHash(value) {
    var base = location.pathname + location.search;
    history.replaceState(null, '', value ? base + '#' + encodeURIComponent(value) : base);
  }
  function renderDirectory() {
    selected = -1;
    monView = null;
    setHash('');
    drawSelection(-1);
    var byType = function (list) {
      return [
        ['towns', list.filter(function (l) { return l.type === 'town' || l.type === 'city'; })],
        ['routes', list.filter(function (l) { return l.type === 'route'; })],
        ['places', list.filter(function (l) { return l.type === 'place'; })]
      ];
    };
    // Mehrere Regionen (HG/SS: Johto und Kanto) bekommen je eigene Gruppen
    var regions = [];
    D.locations.forEach(function (l) { if (l.region && regions.indexOf(l.region) < 0) regions.push(l.region); });
    var groups = regions.length > 1
      ? regions.reduce(function (all, r) {
        return all.concat(byType(D.locations.filter(function (l) { return l.region === r; })).map(function (g) { return [g[0], g[1], r]; }));
      }, [])
      : byType(D.locations);
    groups = groups.filter(function (g) { return g[1].length; });
    $('side-content').innerHTML = '<div class="side-head"><h2>' + esc(tx().all) + '</h2><p>' + esc(tx().hint) + '</p></div>' +
      groups.map(function (g) {
        return '<section class="dir-group"><h3>' + (g[2] ? esc(tx()[g[2]] || g[2]) + ' · ' : '') + esc(tx()[g[0]]) + ' <small>' + g[1].length + '</small></h3><div class="dir-list">' +
          g[1].map(function (l) {
            var li = D.locations.indexOf(l);
            return '<button type="button" class="dir-item" data-loc="' + li + '">' + esc(locName(l)) +
              '<small>' + esc(typeLabel(l)) + '</small></button>';
          }).join('') + '</div></section>';
      }).join('');
    $('side-content').querySelectorAll('[data-loc]').forEach(function (b) {
      b.addEventListener('click', function () { selectLocation(+b.dataset.loc, { fly: true }); });
    });
  }

  function selectLocation(li, opts) {
    opts = opts || {};
    selected = li;
    monView = null;
    setHash(D.locations[li].slug);
    drawSelection(li);
    renderLocation(opts.focus);
    if (opts.fly !== false) flyToLocation(li);
  }
  function renderLocation(focus) {
    var l = D.locations[selected];
    if (!l) return;
    var items = l.items || [], trainers = l.trainers || [], wildN = uniqueWildCount(l);
    var tabs = [
      ['wild', tx().wild, wildN], ['items', tx().items, items.length], ['trainers', tx().trainers, trainers.length]
    ];
    $('side-content').innerHTML = '<div class="side-head"><button type="button" class="back-btn" id="back-btn">← ' + esc(tx().back) + '</button>' +
      '<h2>' + esc(locName(l)) + '</h2><p>' + esc(typeLabel(l)) + (l.region && D.locations.some(function (x) { return x.region && x.region !== l.region; }) ? ' · ' + esc(tx()[l.region] || l.region) : '') + '</p><div class="stat-chips">' +
      '<span>' + items.length + ' ' + esc(tx().countItems) + '</span><span>' + trainers.length + ' ' + esc(tx().countTrainers) +
      '</span><span>' + wildN + ' ' + esc(tx().countWild) + '</span></div></div>' +
      '<div class="tabs">' + tabs.map(function (a) {
        return '<button type="button" class="tab' + (currentTab === a[0] ? ' is-active' : '') + '" data-tab="' + a[0] + '">' +
          esc(a[1]) + ' <small>' + a[2] + '</small></button>';
      }).join('') + '</div><div id="tab-body"></div>';
    $('back-btn').addEventListener('click', renderDirectory);
    $('side-content').querySelectorAll('[data-tab]').forEach(function (b) {
      b.addEventListener('click', function () { currentTab = b.dataset.tab; renderLocation(); });
    });
    if (currentTab === 'items') renderItems(l, focus);
    else if (currentTab === 'trainers') renderTrainers(l, focus);
    else renderWild(l, focus);
  }

  // Stecknadel: genaue Stelle auf der Oberwelt oder – in Gebäuden und Höhlen – deren Eingang
  function pinHTML(x) {
    var at = x.pos || x.door;
    if (!at) return '';
    var title = x.pos ? tx().show : tx().inside;
    return '<button type="button" class="pin" data-pos="' + at.join(',') + '"' + (x.pos && x.y ? ' data-y="' + x.y + '"' : '') +
      ' title="' + esc(title) + '" aria-label="' + esc(title) + '">' + ICON_PIN + '</button>';
  }
  function areaTag(x) { var a = areaLabel(x); return a ? '<span class="area">' + esc(a) + '</span>' : ''; }
  function bindPins(focus) {
    $('tab-body').querySelectorAll('[data-pos]').forEach(function (b) {
      b.addEventListener('click', function () { flyToPos(b.dataset.pos.split(',').map(Number), b.dataset.y != null ? +b.dataset.y : undefined); });
    });
    if (focus) $('tab-body').querySelector('[data-ref="' + focus + '"]')?.scrollIntoView({ block: 'nearest' });
  }

  function renderItems(l, focus) {
    var items = l.items || [];
    if (!items.length) { $('tab-body').innerHTML = '<p class="empty">' + esc(tx().noItems) + '</p>'; return; }
    $('tab-body').innerHTML = '<div class="list-group">' + items.map(function (it, i) {
      var kind = itemKind(it);
      var label = it.kind === 'hidden' ? tx().hiddenItem : it.kind === 'gift' ? tx().gift : kind === 'tm' ? tx().tm : tx().itemBall;
      var move = it.move ? (lang() === 'en' ? it.move.en : it.move.de) : '';
      return '<div class="row' + (kind === 'tm' ? ' is-tm' : '') + (focus === 'i' + i ? ' is-flash' : '') + '" data-ref="i' + i + '">' +
        '<img class="item-ico" src="' + itemSprite(it) + '" alt="" loading="lazy" onerror="this.style.visibility=\'hidden\'">' +
        '<span class="row-main"><span class="row-title">' + esc(itemName(it)) + (move ? ' · ' + esc(move) : '') + (it.qty > 1 ? ' ×' + it.qty : '') + '</span>' +
        '<span class="row-sub">' + esc(label) + '</span></span>' + areaTag(it) + pinHTML(it) + '</div>';
    }).join('') + '</div>';
    bindPins(focus);
  }

  function partyHTML(party) {
    if (!party || !party.length) return '';
    return '<div class="party">' + party.map(function (p) {
      var extra = [];
      if (p.item) extra.push(lang() === 'en' ? p.item.en : p.item.de);
      if (p.moves) extra.push(p.moves.map(function (m) { return lang() === 'en' ? m.en : m.de; }).join(', '));
      return '<span class="mon" title="' + esc(monName(p.id) + (extra.length ? ' · ' + extra.join(' · ') : '')) + '"><img src="' + monSprite(p.id) +
        '" alt="" loading="lazy"><span class="mon-name">' + esc(monName(p.id)) + '</span><small>' + esc(tx().level) + ' ' + p.lv + '</small></span>';
    }).join('') + '</div>';
  }
  function renderTrainers(l, focus) {
    var trainers = l.trainers || [];
    if (!trainers.length) { $('tab-body').innerHTML = '<p class="empty">' + esc(tx().noTrainers) + '</p>'; return; }
    // Rivale: mehrere Teams (je nach Starter) an derselben Stelle zusammenfassen
    var rows = [], groups = {};
    trainers.forEach(function (tr, i) {
      if (tr.cls === 'RIVAL' && tr.party) {
        var key = (tr.area || '') + '|' + (tr.pos || tr.door || '') + '|' + tr.party.length + '|' + tr.party.slice(0, -1).map(function (p) { return p.lv; }).join(',');
        if (!groups[key]) { groups[key] = { tr: tr, i: i, variants: [] }; rows.push(groups[key]); }
        groups[key].variants.push(tr);
      } else rows.push({ tr: tr, i: i });
    });
    $('tab-body').innerHTML = '<div class="list-group">' + rows.map(function (row) {
      var tr = row.tr, i = row.i;
      var head = '<div class="tr-head"><span class="row-title">' + esc(trainerName(tr)) + '</span>' +
        (tr.double ? '<span class="badge">' + esc(tx().double) + '</span>' : tr.party ? '' : '<span class="badge">' + esc(tx().trainer) + '</span>') +
        areaTag(tr) + pinHTML(tr) + '</div>';
      var body = row.variants && row.variants.length > 1
        ? '<p class="hint">' + esc(tx().rivalNote) + '</p>' + row.variants.map(function (v) { return '<div class="variant">' + partyHTML(v.party) + '</div>'; }).join('')
        : partyHTML(tr.party);
      return '<div class="row row--trainer' + (focus === 't' + i ? ' is-flash' : '') + '" data-ref="t' + i + '">' + head + body + '</div>';
    }).join('') + '</div>';
    bindPins(focus);
  }

  function levelText(m) { return m.min === m.max ? String(m.min) : m.min + '–' + m.max; }
  function monCell(id) {
    return '<span class="wild-mon"><img src="' + monSprite(id) + '" alt="" loading="lazy"><span>' + esc(monName(id)) + '</span></span>';
  }
  function wildTable(title, list, focus) {
    if (!list || !list.length) return '';
    return '<div class="wild-block"><h4>' + esc(title) + '</h4><table class="wild-table"><thead><tr><th></th><th>' +
      esc(tx().level) + '</th><th>' + esc(tx().chance) + '</th></tr></thead><tbody>' + list.map(function (m) {
        return '<tr data-mon="' + m.id + '"' + (focus === 'p' + m.id ? ' class="is-flash"' : '') + '><td>' + monCell(m.id) + '</td><td class="lv">' +
          levelText(m) + '</td><td class="pct">' + m.p + ' %</td></tr>';
      }).join('') + '</tbody></table></div>';
  }
  var sameList = function (a, b) { return JSON.stringify(a || []) === JSON.stringify(b || []); };
  // Gras nach Tageszeit: eine Spalte je Zeit; sind alle drei gleich, reicht eine normale Tabelle
  function grassTable(w, focus) {
    if (!w.morning || !w.morning.length) return wildTable(tx().grass, w.grass, focus);
    if (sameList(w.morning, w.day) && sameList(w.day, w.night)) return wildTable(tx().grass, w.day, focus);
    var ids = [];
    ['morning', 'day', 'night'].forEach(function (k) { w[k].forEach(function (m) { if (ids.indexOf(m.id) < 0) ids.push(m.id); }); });
    var get = function (k, id) { return w[k].find(function (m) { return m.id === id; }); };
    var rows = ids.map(function (id) {
      var ms = ['morning', 'day', 'night'].map(function (k) { return get(k, id); });
      var have = ms.filter(Boolean);
      return { id: id, ms: ms, sum: have.reduce(function (n, m) { return n + m.p; }, 0),
        lv: levelText({ min: Math.min.apply(null, have.map(function (m) { return m.min; })), max: Math.max.apply(null, have.map(function (m) { return m.max; })) }) };
    }).sort(function (a, b) { return b.sum - a.sum; });
    return '<div class="wild-block"><h4>' + esc(tx().grass) + '</h4><table class="wild-table"><thead><tr><th></th><th>' + esc(tx().level) + '</th><th>' +
      esc(tx().morning) + '</th><th>' + esc(tx().day) + '</th><th>' + esc(tx().night) + '</th></tr></thead><tbody>' + rows.map(function (r) {
        return '<tr data-mon="' + r.id + '"' + (focus === 'p' + r.id ? ' class="is-flash"' : '') + '><td>' + monCell(r.id) + '</td><td class="lv">' + r.lv + '</td>' +
          r.ms.map(function (m) { return '<td class="pct">' + (m ? m.p + ' %' : '–') + '</td>'; }).join('') + '</tr>';
      }).join('') + '</tbody></table></div>';
  }
  function extraMons(ids, focus) {
    return ids.map(function (id) {
      return '<span class="extra-mon' + (focus === 'p' + id ? ' is-flash' : '') + '" data-mon="' + id + '"><img src="' + monSprite(id) + '" alt="" loading="lazy">' + esc(monName(id)) + '</span>';
    }).join('');
  }
  function extrasHTML(w, focus) {
    var t = tx(), lines = [];
    if (w.swarm) lines.push('<div title="' + esc(t.swarmHint) + '"><span class="extra-label">' + esc(t.swarm) + ' (' + esc(t[w.swarm.method] || t.fish) + '):</span> ' + extraMons([w.swarm.id], focus) + '</div>');
    if (w.hoenn && w.hoenn.length) lines.push('<div title="' + esc(t.radioHint) + '"><span class="extra-label">' + esc(t.hoenn) + ':</span> ' + extraMons(w.hoenn, focus) + '</div>');
    if (w.sinnoh && w.sinnoh.length) lines.push('<div title="' + esc(t.radioHint) + '"><span class="extra-label">' + esc(t.sinnoh) + ':</span> ' + extraMons(w.sinnoh, focus) + '</div>');
    if (w.nightFish) lines.push('<div><span class="extra-label">' + esc(t.nightFish) + ' (' + esc(t.goodRod) + ', ' + esc(t.superRod) + '):</span> ' + extraMons([w.nightFish], focus) + '</div>');
    return lines.length ? '<div class="wild-extras">' + lines.join('') + '</div>' : '';
  }
  function specialHTML(l, focus) {
    var list = specialsOf(l);
    if (!list.length) return '';
    return '<div class="wild-area"><h3>' + esc(tx().special) + '</h3><table class="wild-table"><tbody>' + list.map(function (s) {
      var how = s.kind === 'static' ? tx().static : s.kind === 'egg' ? tx().egg : tx().giftMon;
      return '<tr data-mon="' + s.id + '"' + (focus === 'p' + s.id ? ' class="is-flash"' : '') + '><td>' + monCell(s.id) + '</td><td class="lv">' +
        (s.kind === 'egg' ? '' : esc(tx().level) + ' ' + s.lv) + '</td><td class="pct">' + esc(how) + (areaLabel(s) ? ' · ' + esc(areaLabel(s)) : '') + '</td></tr>';
    }).join('') + '</tbody></table></div>';
  }
  function renderWild(l, focus) {
    var blocks = wildOf(l).filter(function (w) { return Object.keys(blockIds(w)).length; });
    if (!blocks.length && !specialsOf(l).length) {
      $('tab-body').innerHTML = '<p class="empty">' + esc(tx().noWild) + '</p>'; return;
    }
    var t = tx();
    $('tab-body').innerHTML = blocks.map(function (w) {
      var title = blocks.length > 1 || w.area ? '<h3>' + esc(areaLabel(w) || t.outside) + '</h3>' : '';
      return '<div class="wild-area">' + title + grassTable(w, focus) + wildTable(t.surf, w.surf, focus) +
        wildTable(t.oldRod, w.old, focus) + wildTable(t.goodRod, w.good, focus) + wildTable(t.superRod, w.super, focus) +
        wildTable(t.rock, w.rock, focus) + wildTable(t.headbutt, w.headbutt, focus) + wildTable(t.headbuttRare, w.headbuttRare, focus) +
        wildTable(t.headbuttSecret, w.headbuttSecret, focus) + extrasHTML(w, focus) + '</div>';
    }).join('') + specialHTML(l, focus);
    $('tab-body').querySelectorAll('[data-mon]').forEach(function (r) {
      r.addEventListener('click', function () { renderMon(+r.dataset.mon, { fly: true }); });
    });
    if (focus) $('tab-body').querySelector('.is-flash')?.scrollIntoView({ block: 'nearest' });
  }

  // Fundorte je Pokémon: Methode, Bereich, Chance (Gras mit Tageszeiten)
  var METHOD_KEYS = [['grass', 'grass'], ['surf', 'surf'], ['old', 'oldRod'], ['good', 'goodRod'], ['super', 'superRod'], ['rock', 'rock'],
    ['headbutt', 'headbutt'], ['headbuttRare', 'headbuttRare'], ['headbuttSecret', 'headbuttSecret']];
  function buildIndices() {
    MONS = new Map();
    searchIndex = [];
    var add = function (id, e) { if (!MONS.has(id)) MONS.set(id, []); MONS.get(id).push(e); };
    D.locations.forEach(function (l, li) {
      searchIndex.push({ type: 'loc', li: li, keys: [l.de, l.en].map(norm) });
      (l.items || []).forEach(function (it, i) { searchIndex.push({ type: 'item', li: li, i: i, keys: [it.de, it.en, it.move && it.move.de, it.move && it.move.en].filter(Boolean).map(norm) }); });
      (l.trainers || []).forEach(function (tr, i) { searchIndex.push({ type: 'trainer', li: li, i: i, keys: [tr.de, tr.en, tr.cls].filter(Boolean).map(norm) }); });
      wildOf(l).forEach(function (w) {
        var area = areaLabel(w);
        if (w.morning) {
          var ids = {};
          ['morning', 'day', 'night'].forEach(function (k) { (w[k] || []).forEach(function (m) { ids[m.id] = true; }); });
          Object.keys(ids).forEach(function (id) {
            var e = { li: li, method: 'grass', area: area, times: {}, p: 0, min: Infinity, max: 0 };
            ['morning', 'day', 'night'].forEach(function (k) {
              var m = (w[k] || []).find(function (x) { return x.id === +id; });
              e.times[k] = m ? m.p : 0;
              if (m) { e.p = Math.max(e.p, m.p); e.min = Math.min(e.min, m.min); e.max = Math.max(e.max, m.max); }
            });
            add(+id, e);
          });
        }
        METHOD_KEYS.forEach(function (mk) {
          (w[mk[0]] || []).forEach(function (m) { add(m.id, { li: li, method: mk[1], area: area, p: m.p, min: m.min, max: m.max }); });
        });
        if (w.swarm) add(w.swarm.id, { li: li, method: 'swarm', area: area, special: true });
        (w.hoenn || []).forEach(function (id) { add(id, { li: li, method: 'hoenn', area: area, special: true }); });
        (w.sinnoh || []).forEach(function (id) { add(id, { li: li, method: 'sinnoh', area: area, special: true }); });
        if (w.nightFish) add(w.nightFish, { li: li, method: 'nightFish', area: area, special: true });
      });
      specialsOf(l).forEach(function (s) {
        add(s.id, { li: li, method: s.kind === 'static' ? 'static' : s.kind === 'egg' ? 'egg' : 'giftMon', area: areaLabel(s), special: true, min: s.lv, max: s.lv });
      });
    });
    for (var id = 1; id <= CFG.maxDex; id++) {
      searchIndex.push({ type: 'mon', id: id, keys: [window.POKEMON_NAMES?.de?.[id], window.POKEMON_NAMES?.en?.[id]].filter(Boolean).map(norm) });
    }
  }

  function methodText(m) {
    var t = tx(), lv = m.min != null && isFinite(m.min) && m.method !== 'egg' ? ' · ' + t.level + ' ' + levelText(m) : '';
    if (m.times) {
      var ks = ['morning', 'day', 'night'];
      var same = ks.every(function (k) { return m.times[k] === m.times.morning; });
      return t.grass + ' ' + (same ? m.times.morning + ' %' : ks.filter(function (k) { return m.times[k]; }).map(function (k) { return t[k] + ' ' + m.times[k] + ' %'; }).join(' · ')) + lv;
    }
    return (t[m.method] || m.method) + (m.special ? '' : ' ' + m.p + ' %') + lv;
  }
  function renderMon(id, opts) {
    opts = opts || {};
    selected = -1;
    monView = id;
    setHash('pokemon-' + id);
    var places = (MONS.get(id) || []).slice().sort(function (a, b) {
      return (a.special ? 1 : 0) - (b.special ? 1 : 0) || (b.p || 0) - (a.p || 0) || locName(D.locations[a.li]).localeCompare(locName(D.locations[b.li]), lang());
    });
    var unique = [];
    places.forEach(function (p) {
      var same = unique.find(function (x) { return x.li === p.li; });
      if (same) same.methods.push(p); else unique.push({ li: p.li, methods: [p] });
    });
    var head = '<button type="button" class="back-btn" id="back-btn">← ' + esc(tx().back) + '</button><h2 class="mon-head"><img src="' +
      monSprite(id) + '" alt=""><span>' + esc(monName(id)) + '</span></h2><a class="mini-btn" href="../PokemonInfo/index.html#' + id + '">' + esc(tx().dex) + '</a>';
    if (!unique.length) {
      $('side-content').innerHTML = '<div class="side-head">' + head + '<p>' + esc(tx().monNone) + '</p></div>';
      $('back-btn').addEventListener('click', renderDirectory);
      drawSelection(-1);
      return;
    }
    $('side-content').innerHTML = '<div class="side-head">' + head + '<p>' + unique.length + ' ' + esc(unique.length === 1 ? tx().monPlaces1 : tx().monPlaces) + '</p></div><div class="mon-places">' +
      unique.map(function (p) {
        var l = D.locations[p.li];
        return '<button type="button" class="mon-place" data-loc="' + p.li + '"><span class="mp-name">' + esc(locName(l)) + '<small>' +
          esc(typeLabel(l)) + '</small></span><span class="mp-methods">' + p.methods.map(function (m) {
            return '<span class="mp-chip' + (m.special ? ' is-special' : '') + '">' + (m.area ? '<b>' + esc(m.area) + '</b> ' : '') + esc(methodText(m)) + '</span>';
          }).join('') + '</span></button>';
      }).join('') + '</div>';
    $('back-btn').addEventListener('click', renderDirectory);
    $('side-content').querySelectorAll('[data-loc]').forEach(function (b) {
      b.addEventListener('click', function () { currentTab = 'wild'; selectLocation(+b.dataset.loc, { fly: true, focus: 'p' + id }); });
    });
    var indices = unique.map(function (p) { return p.li; });
    drawSelection(indices);
    if (opts.fly) {
      var b = null;
      indices.forEach(function (li) { var lb = boundsOf(D.locations[li]); if (lb) b = b ? b.extend(lb) : L.latLngBounds(lb.getSouthWest(), lb.getNorthEast()); });
      if (b) map.flyToBounds(b, { padding: [45, 45], maxZoom: 2.5, duration: 0.55 });
    }
  }

  function runSearch(query) {
    var key = norm(query), box = $('search-results');
    if (key.length < 2) { box.hidden = true; return; }
    var hits = [];
    searchIndex.forEach(function (e) {
      var score = -1;
      e.keys.forEach(function (k) {
        if (k === key) score = Math.max(score, 3); else if (k.indexOf(key) === 0) score = Math.max(score, 2); else if (k.indexOf(key) >= 0) score = Math.max(score, 1);
      });
      if (score >= 0) hits.push({ e: e, score: score + (e.type === 'loc' ? 0.5 : e.type === 'mon' ? 0.25 : 0) });
    });
    hits.sort(function (a, b) { return b.score - a.score; });
    var top = hits.slice(0, 14);
    if (!top.length) { box.innerHTML = '<div class="sr-empty">' + esc(tx().noResults) + '</div>'; box.hidden = false; return; }
    box.innerHTML = top.map(function (h, n) {
      var e = h.e;
      if (e.type === 'mon') return '<button type="button" class="sr" data-n="' + n + '"><img class="sr-ico" src="' + monSprite(e.id) + '" alt=""><span class="sr-main">' + esc(monName(e.id)) + '</span><small>' + esc(tx().wild) + '</small></button>';
      var l = D.locations[e.li];
      if (e.type === 'loc') return '<button type="button" class="sr" data-n="' + n + '"><span class="sr-ico">' + ICON_MAP + '</span><span class="sr-main">' + esc(locName(l)) + '</span><small>' + esc(typeLabel(l)) + '</small></button>';
      if (e.type === 'item') {
        var it = l.items[e.i];
        return '<button type="button" class="sr" data-n="' + n + '"><img class="sr-ico" src="' + itemSprite(it) + '" alt=""><span class="sr-main">' + esc(itemName(it)) + '</span><small>' + esc(locName(l)) + '</small></button>';
      }
      var tr = l.trainers[e.i];
      return '<button type="button" class="sr" data-n="' + n + '"><span class="sr-ico">' + ICON_PERSON + '</span><span class="sr-main">' + esc(trainerName(tr)) + '</span><small>' + esc(locName(l)) + '</small></button>';
    }).join('');
    box.hidden = false;
    box.querySelectorAll('[data-n]').forEach(function (b) {
      b.addEventListener('click', function () {
        var e = top[+b.dataset.n].e;
        box.hidden = true;
        $('map-search').blur();
        if (e.type === 'loc') selectLocation(e.li, { fly: true });
        else if (e.type === 'mon') renderMon(e.id, { fly: true });
        else { currentTab = e.type === 'item' ? 'items' : 'trainers'; selectLocation(e.li, { fly: true, focus: (e.type === 'item' ? 'i' : 't') + e.i }); }
      });
    });
  }

  function filterCount(kind) {
    var n = 0;
    D.locations.forEach(function (l) {
      if (kind === 'trainer') n += (l.trainers || []).filter(function (x) { return x.pos; }).length;
      else if (kind === 'entrance') n += (l.entrances || []).length;
      else n += (l.items || []).filter(function (x) { return x.pos && itemKind(x) === kind; }).length;
    });
    return n;
  }
  function drawToolbar() {
    var t = tx(), v = edition();
    var labels = { item: t.items, hidden: t.hidden, tm: t.tms, gift: t.gifts, trainer: t.trainers, entrance: t.entrance };
    // Nur Filter zeigen, für die es auf dieser Karte auch Marker gibt
    var kinds = CFG.markers === false ? [] : Object.keys(labels).filter(function (k) { return filterCount(k) > 0 || ['item', 'hidden', 'tm', 'trainer'].indexOf(k) >= 0; });
    var versionButtons = CFG.versions.length > 1 ? '<span class="rb-version" role="group" aria-label="' + esc(t.editionLabel) + '">' +
      CFG.versions.map(function (k) {
        return '<button type="button" class="chip rb-version-btn rb-version-btn--' + k + '" data-version="' + k + '" aria-pressed="' + (v === k) + '">' + esc(t[k]) + '</button>';
      }).join('') + '</span>' : '';
    $('filter-chips').innerHTML = versionButtons + kinds.map(function (kind) {
        return '<button type="button" class="chip' + (shown[kind] ? ' is-on' : '') + '" data-kind="' + kind + '" aria-pressed="' + shown[kind] + '"><i class="dot dot--' + kind + '"></i><span>' + esc(labels[kind]) + '</span> <b>' + filterCount(kind) + '</b></button>';
      }).join('');
    $('filter-chips').querySelectorAll('[data-kind]').forEach(function (b) {
      b.addEventListener('click', function () {
        shown[b.dataset.kind] = !shown[b.dataset.kind];
        b.classList.toggle('is-on', shown[b.dataset.kind]);
        b.setAttribute('aria-pressed', String(shown[b.dataset.kind]));
        syncMarkerLayers();
      });
    });
    $('filter-chips').querySelectorAll('[data-version]').forEach(function (b) {
      b.addEventListener('click', function () {
        var oldEdition = edition();
        try { localStorage.setItem(CFG.storage, b.dataset.version); } catch (e) {}
        if (CFG.versionedTiles && oldEdition !== b.dataset.version) switchTileEdition();
        buildIndices();
        applyLang();
        if (selected >= 0) renderLocation(); else if (monView != null) renderMon(monView); else renderDirectory();
      });
    });
  }

  function applyLang() {
    var t = tx();
    if (CFG.versionedTiles) document.body.dataset.mapEdition = edition();
    document.documentElement.lang = lang();
    $('lang-toggle').textContent = lang().toUpperCase();
    document.querySelector('[data-i18n="title"]').textContent = t.title;
    document.querySelector('.game-badge').textContent = t.badge;
    document.querySelector('header [data-i18n="subtitle"]').textContent = t.subtitle;
    var note = document.querySelector('.map-note');
    note.textContent = t.note;
    if (CFG.attribution) {
      note.appendChild(document.createTextNode(' '));
      var credit = document.createElement('a');
      credit.href = CFG.attribution;
      credit.target = '_blank';
      credit.rel = 'noopener noreferrer';
      credit.textContent = lang() === 'en' ? 'Map source ↗' : 'Kartenquelle ↗';
      note.appendChild(credit);
    }
    $('map-search').placeholder = t.search;
    document.title = t.title + ' (' + t.badge + ') – Pokémon Hub';
    if (D) {
      drawToolbar();
      areaLayer?.eachLayer(function (area) {
        var element = area.getElement?.();
        if (element && area.locIndex >= 0) element.setAttribute('aria-label', locName(D.locations[area.locIndex]));
      });
      labelLayer?.eachLayer(function (m) {
        var el = m.getElement()?.querySelector('.kanto-label');
        if (el) el.textContent = locName(D.locations[m.locIndex]);
      });
    }
  }

  function fromHash() {
    var hash = decodeURIComponent(location.hash.slice(1));
    if (!hash) return false;
    var pm = /^pokemon-(\d+)$/.exec(hash);
    if (pm) { renderMon(+pm[1]); return true; }
    var li = D.locations.findIndex(function (l) { return l.slug === hash; });
    if (li >= 0) { selectLocation(li, { fly: true }); return true; }
    return false;
  }

  function init() {
    document.body.classList.add(CFG.body);
    $('map-rando').hidden = true;
    $('map-loading').textContent = tx().loading;
    applyLang();
    Promise.all([
      fetch(DATA_URL).then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); }),
      fetch(tileBase() + 'index.json').then(function (r) { if (!r.ok) throw new Error(r.status); return r.json(); })
    ]).then(function (r) {
      D = r[0]; TILES = r[1];
      setupMap();
      buildIndices();
      applyLang();
      if (!fromHash()) renderDirectory();
    }).catch(function (err) {
      console.error(GAME === 'gelb' ? 'Yellow map:' : GAME === 'gold-silber' ? 'Gold/Silver map:' : GAME === 'kristall' ? 'Crystal map:' : GAME === 'rubin-saphir' ? 'Ruby/Sapphire map:' : GAME === 'smaragd' ? 'Emerald map:' : GAME === 'diamant-perl' ? 'Diamond/Pearl map:' : GAME === 'schwarz-weiss' ? 'Unova map:' : GAME === 'schwarz2-weiss2' ? 'Black 2/White 2 map:' : GAME === 'x-y' ? 'X/Y map:' : GAME === 'sonne-mond' ? 'Sun/Moon map:' : 'Kanto map:', err);
      $('map-loading').hidden = false;
      $('map-loading').textContent = tx().loadError;
    });
  }

  $('lang-toggle').addEventListener('click', function () {
    window.LANG = window.LANG === 'de' ? 'en' : 'de';
    try { localStorage.setItem('hub-lang', window.LANG); } catch (e) {}
    applyLang();
    if (D) {
      buildIndices();
      if (selected >= 0) renderLocation(); else if (monView != null) renderMon(monView); else renderDirectory();
    }
  });
  var searchTimer = null;
  $('map-search').addEventListener('input', function (e) {
    clearTimeout(searchTimer);
    searchTimer = setTimeout(function () { if (D) runSearch(e.target.value); }, 120);
  });
  $('map-search').addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { $('search-results').hidden = true; e.target.blur(); }
    if (e.key === 'Enter') $('search-results').querySelector('.sr')?.click();
  });
  document.addEventListener('click', function (e) { if (!e.target.closest('.search-wrap')) $('search-results').hidden = true; });
  window.addEventListener('hashchange', function () { if (D) fromHash(); });
  window.addEventListener('storage', function (e) {
    if (e.key === CFG.storage && D) {
      if (CFG.versionedTiles) switchTileEdition();
      buildIndices();
      applyLang();
      if (selected >= 0) renderLocation(); else if (monView != null) renderMon(monView); else renderDirectory();
    }
  });

  init();
})();
