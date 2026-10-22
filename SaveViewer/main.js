/*
 * Save-Viewer – Oberfläche. Liest Spielstände mit PtSave (pt-save.js) und zeigt
 * Trainer, Team, Boxen, Fangorte und Pokédex an. Bis zu zwei Spielstände gleichzeitig
 * (z. B. für Duo/Soul Link), die letzten Dateien bleiben in IndexedDB auf dem Gerät.
 */
(function () {
  'use strict';

  var D = window.PT_DATA;
  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
  var PT_SPR = SPR + '/pokemon/versions/generation-iv/platinum/';
  var ICON_SPR = SPR + '/pokemon/versions/generation-vii/icons/';
  var MAX_SAVES = 2;

  // Typfarben wie im restlichen Hub, Reihenfolge = PKHeX-Typ-Index
  var TYPE_HEX = ['#bbbbaa', '#bb5544', '#96caff', '#9553cd', '#a67439', '#bbaa66', '#92c12a', '#6e4370', '#aaaabb',
    '#ff421c', '#2c9be3', '#62bc5a', '#ffdc00', '#ff6380', '#74cfc0', '#5670be', '#4e4545', '#ec8fe6'];
  var TYPE_RGB = TYPE_HEX.map(function (h) {
    return [1, 3, 5].map(function (i) { return parseInt(h.substr(i, 2), 16); }).join(',');
  });
  var ARCEUS = ['normal', 'fighting', 'flying', 'poison', 'ground', 'rock', 'bug', 'ghost', 'steel', 'unknown',
    'fire', 'water', 'grass', 'electric', 'psychic', 'ice', 'dragon', 'dark'];
  var ARCEUS_TYPE = [0, 1, 2, 3, 4, 5, 6, 7, 8, -1, 9, 10, 11, 12, 13, 14, 15, 16];
  var FEMALE = new Set(D.femaleSprites);

  // Orden in Platin-Reihenfolge: Bit im Spielstand, Stadt (Ort-ID), Farbe
  var BADGES = [
    { bit: 0, city: 8, color: '#a9a29a' }, { bit: 1, city: 9, color: '#6fcf7b' },
    { bit: 4, city: 10, color: '#c09cf0' }, { bit: 2, city: 12, color: '#ffa6c4' },
    { bit: 3, city: 11, color: '#7cc0ff' }, { bit: 5, city: 7, color: '#d7b27a' },
    { bit: 6, city: 14, color: '#a8ecff' }, { bit: 7, city: 13, color: '#ffe066' }
  ];

  var FORMS = {
    de: {
      386: ['Normalform', 'Angriffsform', 'Verteidigungsform', 'Initiativeform'],
      412: ['Pflanzenumhang', 'Sandumhang', 'Lumpenumhang'], 413: ['Pflanzenumhang', 'Sandumhang', 'Lumpenumhang'],
      422: ['Westliches Meer', 'Östliches Meer'], 423: ['Westliches Meer', 'Östliches Meer'],
      479: ['', 'Hitze', 'Wasch', 'Frost', 'Wirbel', 'Schneid'],
      487: ['Wandelform', 'Urform'], 492: ['Landform', 'Zenitform']
    },
    en: {
      386: ['Normal Forme', 'Attack Forme', 'Defense Forme', 'Speed Forme'],
      412: ['Plant Cloak', 'Sandy Cloak', 'Trash Cloak'], 413: ['Plant Cloak', 'Sandy Cloak', 'Trash Cloak'],
      422: ['West Sea', 'East Sea'], 423: ['West Sea', 'East Sea'],
      479: ['', 'Heat', 'Wash', 'Frost', 'Fan', 'Mow'],
      487: ['Altered Forme', 'Origin Forme'], 492: ['Land Forme', 'Sky Forme']
    }
  };

  var VERSIONS = {
    de: { 1: 'Saphir', 2: 'Rubin', 3: 'Smaragd', 4: 'Feuerrot', 5: 'Blattgrün', 7: 'HeartGold', 8: 'SoulSilver', 10: 'Diamant', 11: 'Perl', 12: 'Platin', 15: 'Colosseum/XD' },
    en: { 1: 'Sapphire', 2: 'Ruby', 3: 'Emerald', 4: 'FireRed', 5: 'LeafGreen', 7: 'HeartGold', 8: 'SoulSilver', 10: 'Diamond', 11: 'Pearl', 12: 'Platinum', 15: 'Colosseum/XD' }
  };
  var LANGS = { 1: 'JPN', 2: 'ENG', 3: 'FRA', 4: 'ITA', 5: 'GER', 7: 'SPA', 8: 'KOR' };

  var I18N = {
    de: {
      'nav.home': 'Home', 'nav.run': 'Run', 'nav.team': 'Team', 'nav.trio': 'Trio', 'nav.catchrate': 'Fangrate',
      'nav.damage': 'Schaden', 'nav.types': 'Typen', 'nav.info': 'Dex', 'nav.map': 'Karte', 'nav.save': 'Save', 'nav.rules': 'Regeln',
      'subtitle': 'Lade deinen Platin-Spielstand und sieh dir Team, Boxen und Fangorte an.',
      'drop.title': 'Spielstand hier reinziehen oder antippen',
      'drop.sub': 'Pokémon Platin · .sav oder .dsv vom Emulator. Die Datei wird nur auf deinem Gerät gelesen und nirgendwo hochgeladen.',
      'drop.offline': '✓ Funktioniert offline',
      'tab.team': 'Team', 'tab.boxes': 'Boxen', 'tab.encounters': 'Fangorte', 'tab.dex': 'Pokédex', 'tab.link': 'Soul Link',
      'help.title': 'Wo finde ich meinen Spielstand?',
      'help.intro': 'Du brauchst den normalen Spielstand, der beim Speichern im Spiel entsteht – nicht einen Savestate des Emulators. Also vorher im Spiel speichern!',
      'help.desmume': 'Ordner <code>Battery</code>, Datei endet auf <code>.dsv</code>',
      'help.melon': 'Liegt als <code>.sav</code> neben der ROM-Datei',
      'help.drastic': 'Ordner <code>DraStic/backup</code>, Datei endet auf <code>.dsv</code>',
      'help.delta': 'Spiel lange drücken → Spielstand exportieren → in Dateien sichern',
      'help.hacks': 'ROM-Hacks auf Platin-Basis (z. B. Renegade Platinum) lassen sich meist auch lesen – Basiswerte und Typen können dort aber vom Original abweichen.',
      'foot.local': 'Alles passiert lokal in deinem Browser. Zuletzt geladene Spielstände bleiben nur auf diesem Gerät gespeichert.',
      'foot.credits': 'Speicherformat nach PKHeX · Sprites von PokéAPI',
      addSave: '+ Zweiter Spielstand', addSaveTitle: 'z. B. für Duo- oder Soul-Link-Runs',
      remove: 'Entfernen', loadedAt: 'geladen',
      errSize: function (kb) { return 'Das sieht nicht nach einem DS-Spielstand aus (' + kb + ' KB, erwartet sind 512 KB). Nimm den Ingame-Spielstand (.sav/.dsv), keinen Savestate.'; },
      errGame: function (g) { return 'Das ist ein Spielstand von ' + g + ' – bisher wird nur Platin unterstützt.'; },
      errUnknown: 'Kein Platin-Spielstand erkannt. Achte darauf, den Ingame-Spielstand (.sav/.dsv) zu nehmen und im Spiel mindestens einmal gespeichert zu haben.',
      errRead: 'Die Datei konnte nicht gelesen werden.',
      warnChecksum: 'Die Prüfsumme des Spielstands stimmt nicht – die Datei ist eventuell beschädigt. Angezeigte Werte können falsch sein.',
      warnFallback: 'Der neueste Speicherblock ist beschädigt (Speichern abgebrochen?). Angezeigt wird der vorherige Spielstand.',
      warnBad: function (n) { return n + (n === 1 ? ' Platz enthält' : ' Plätze enthalten') + ' ein beschädigtes Pokémon („Böses Ei“) und wird ausgeblendet.'; },
      id: 'ID', playTime: 'Spielzeit', money: 'Geld', rival: 'Rivale', coins: 'Münzen', started: 'Abenteuer seit', champion: 'Champ',
      sinnohDex: 'Sinnoh-Dex', nationalDex: 'Nationaldex', caught: 'gefangen', seen: 'gesehen',
      badgeOf: function (c) { return 'Orden aus ' + c; },
      team: 'Team', emptyTeam: 'Kein Pokémon im Team.', daycare: 'Pension', daycareGain: function (n) { return '+' + n + ' EP in der Pension'; },
      box: 'Box', boxEmpty: 'Diese Box ist leer.', graveyard: 'Friedhof-Box', none: 'keine', search: 'In allen Boxen suchen …',
      noResults: 'Nichts gefunden.', inBox: function (b) { return 'Box ' + b; },
      encSummary: function (l, n) { return l + ' Fangorte · ' + n + ' Pokémon'; },
      encDead: function (n) { return n + ' im Friedhof'; },
      location: 'Ort', noLocation: 'Ohne Fangort', eggs: 'Eier (noch nicht geschlüpft)', hatched: 'aus Ei',
      tagTeam: 'Team', tagDaycare: 'Pension', tagDead: '✝', traded: 'getauscht',
      dexMode: { sinnoh: 'Sinnoh', national: 'National' }, legendCaught: 'gefangen', legendSeen: 'gesehen', legendUnseen: 'unbekannt',
      lv: 'Lv.', egg: 'Ei', nature: 'Wesen', ability: 'Fähigkeit', item: 'Item', noItem: '—', hiddenPower: 'Kraftreserve',
      friendship: 'Freundschaft', eggCycles: 'Ei-Zyklen übrig', pokerus: 'Pokérus', pkrsActive: 'infiziert', pkrsCured: 'immun',
      exp: 'EP', toNext: function (n) { return 'noch ' + n.toLocaleString('de-DE') + ' EP bis zum nächsten Level'; }, maxLevel: 'Maximales Level',
      stats: 'Statuswerte', statNames: ['KP', 'Angriff', 'Verteidigung', 'Initiative', 'Sp.-Angr.', 'Sp.-Vert.'], statShort: ['KP', 'Ang', 'Vert', 'Init', 'SpA', 'SpV'],
      colValue: 'Wert', colBase: 'Basis', total: 'Summe',
      moves: 'Attacken', noMoves: 'Keine Attacken.', ppUnit: 'AP', cat: { 1: 'Status', 2: 'Phys.', 3: 'Spez.' }, acc: 'Gen.', power: 'Stärke',
      origin: 'Herkunft', metAt: 'Gefangen in', metLevel: 'Fanglevel', metDate: 'Fangdatum', ball: 'Ball', eggFrom: 'Ei erhalten in', hatchedAt: 'Geschlüpft in',
      ot: 'Originaltrainer', game: 'Spiel', language: 'Sprache', fateful: 'Event-Pokémon',
      openDex: 'Im Pokédex ansehen →', close: 'Schließen',
      status: { slp: 'SLF', psn: 'GIF', brn: 'BRT', frz: 'GFR', par: 'PAR', tox: 'GIF', ko: 'K.O.' },
      link: {
        sameTrainer: 'Beide Spielstände gehören demselben Trainer – für Soul Link brauchst du die Spielstände von zwei Spielern.',
        pairs: function (n) { return n + (n === 1 ? ' Paar' : ' Paare'); },
        check: function (n) { return n + ' zu prüfen'; },
        solo: function (n) { return n + ' ohne Partner'; },
        warns: function (n) { return n + (n === 1 ? ' Regelverstoß' : ' Regelverstöße'); },
        how: 'Verknüpft automatisch nach Fangort. Gibt es an einem Ort mehrere Fänge, entscheidet das Fangdatum – solche Paare sind mit „prüfen“ markiert. Korrekturen werden auf diesem Gerät gespeichert und gelten auch für spätere Spielstände.',
        src: { auto: 'auto', check: 'prüfen', manual: 'manuell' },
        srcTitle: { auto: 'Einziger Fang beider Spieler an diesem Ort', check: 'Mehrere Fänge am Ort – nach Fangdatum zugeordnet', manual: 'Von dir festgelegt' },
        confirm: '✓ Passt', change: 'Ändern', unlink: 'Trennen', link: 'Verknüpfen', ignore: 'Ignorieren', restore: 'Wiederherstellen', auto: 'Automatisch',
        reset: 'Korrekturen zurücksetzen', resetConfirm: 'Alle manuellen Verknüpfungen und Ausnahmen für diesen Run löschen?',
        warnTitle: 'Regelverstöße', pairsTitle: 'Paare', unpairedTitle: 'Ohne Partner', allPaired: 'Alle Pokémon haben einen Partner.',
        ignored: function (n) { return n + ' ignoriert'; }, ignoredHint: 'Gehören nicht zum Run (z. B. VM-Sklaven) und werden nicht verknüpft.',
        reasons: {
          noMatch: function (p) { return p + ' hat hier nichts'; }, extra: 'Weiterer Fang am Ort', traded: 'Getauscht',
          blocked: 'Manuell getrennt', partnerGone: 'Partner nicht mehr da', noLocation: 'Kein Fangort'
        },
        st: { team: 'Team', box: 'Box', daycare: 'Pension', dead: 'Tot', fainted: 'K.O.' },
        wDeath: function (dead, alive, inTeam) { return dead + ' ist tot – Partner ' + alive + (inTeam ? ' ist noch im Team' : ' lebt noch'); },
        wTeam: function (inTeam, other) { return inTeam + ' ist im Team, Partner ' + other + ' nicht'; },
        wSolo: function (n) { return n + ' ist im Team, hat aber keinen Partner'; },
        pickTitle: 'Partner wählen', pickSame: 'Gleicher Fangort', pickFree: 'Ohne Partner', pickTaken: 'Schon verknüpft – wird dabei getrennt', pickNone: 'Keinen Partner',
        partner: 'Soul-Link-Partner', noPartner: 'Kein Partner', isIgnored: 'Ignoriert – gehört nicht zum Run'
      }
    },
    en: {
      'nav.home': 'Home', 'nav.run': 'Run', 'nav.team': 'Team', 'nav.trio': 'Trio', 'nav.catchrate': 'Catch Rate',
      'nav.damage': 'Damage', 'nav.types': 'Types', 'nav.info': 'Dex', 'nav.map': 'Map', 'nav.save': 'Save', 'nav.rules': 'Rules',
      'subtitle': 'Load your Platinum save file and browse your team, boxes and catch locations.',
      'drop.title': 'Drop your save file here or tap',
      'drop.sub': 'Pokémon Platinum · .sav or .dsv from your emulator. The file is only read on your device and never uploaded.',
      'drop.offline': '✓ Works offline',
      'tab.team': 'Team', 'tab.boxes': 'Boxes', 'tab.encounters': 'Encounters', 'tab.dex': 'Pokédex', 'tab.link': 'Soul Link',
      'help.title': 'Where do I find my save file?',
      'help.intro': 'You need the regular save file the game writes when you save in-game – not an emulator save state. So save in the game first!',
      'help.desmume': 'Folder <code>Battery</code>, file ends with <code>.dsv</code>',
      'help.melon': 'Stored as <code>.sav</code> next to the ROM',
      'help.drastic': 'Folder <code>DraStic/backup</code>, file ends with <code>.dsv</code>',
      'help.delta': 'Long-press the game → Export Save File → Save to Files',
      'help.hacks': 'Platinum-based ROM hacks (e.g. Renegade Platinum) usually load too – base stats and types may differ from vanilla, though.',
      'foot.local': 'Everything happens locally in your browser. Recently loaded saves are only kept on this device.',
      'foot.credits': 'Save format per PKHeX · Sprites from PokéAPI',
      addSave: '+ Second save', addSaveTitle: 'e.g. for Duo or Soul Link runs',
      remove: 'Remove', loadedAt: 'loaded',
      errSize: function (kb) { return 'This doesn\'t look like a DS save file (' + kb + ' KB, expected 512 KB). Use the in-game save (.sav/.dsv), not a save state.'; },
      errGame: function (g) { return 'This is a ' + g + ' save – only Platinum is supported so far.'; },
      errUnknown: 'No Platinum save detected. Make sure you use the in-game save (.sav/.dsv) and have saved in the game at least once.',
      errRead: 'The file could not be read.',
      warnChecksum: 'The save checksum doesn\'t match – the file may be corrupted. Values shown could be wrong.',
      warnFallback: 'The newest save block is corrupted (interrupted save?). Showing the previous save instead.',
      warnBad: function (n) { return n + (n === 1 ? ' slot contains' : ' slots contain') + ' a corrupted Pokémon ("Bad Egg") and is hidden.'; },
      id: 'ID', playTime: 'Play time', money: 'Money', rival: 'Rival', coins: 'Coins', started: 'Adventure started', champion: 'Champion',
      sinnohDex: 'Sinnoh Dex', nationalDex: 'National Dex', caught: 'caught', seen: 'seen',
      badgeOf: function (c) { return 'Badge from ' + c; },
      team: 'Team', emptyTeam: 'No Pokémon in the party.', daycare: 'Day Care', daycareGain: function (n) { return '+' + n + ' EXP at the Day Care'; },
      box: 'Box', boxEmpty: 'This box is empty.', graveyard: 'Graveyard box', none: 'none', search: 'Search all boxes …',
      noResults: 'Nothing found.', inBox: function (b) { return 'Box ' + b; },
      encSummary: function (l, n) { return l + ' locations · ' + n + ' Pokémon'; },
      encDead: function (n) { return n + ' in the graveyard'; },
      location: 'Location', noLocation: 'No location', eggs: 'Eggs (not hatched yet)', hatched: 'from egg',
      tagTeam: 'Team', tagDaycare: 'Day Care', tagDead: '✝', traded: 'traded',
      dexMode: { sinnoh: 'Sinnoh', national: 'National' }, legendCaught: 'caught', legendSeen: 'seen', legendUnseen: 'unknown',
      lv: 'Lv.', egg: 'Egg', nature: 'Nature', ability: 'Ability', item: 'Item', noItem: '—', hiddenPower: 'Hidden Power',
      friendship: 'Friendship', eggCycles: 'Egg cycles left', pokerus: 'Pokérus', pkrsActive: 'infected', pkrsCured: 'cured',
      exp: 'EXP', toNext: function (n) { return n.toLocaleString('en-US') + ' EXP to the next level'; }, maxLevel: 'Max level',
      stats: 'Stats', statNames: ['HP', 'Attack', 'Defense', 'Speed', 'Sp. Atk', 'Sp. Def'], statShort: ['HP', 'Atk', 'Def', 'Spe', 'SpA', 'SpD'],
      colValue: 'Stat', colBase: 'Base', total: 'Total',
      moves: 'Moves', noMoves: 'No moves.', ppUnit: 'PP', cat: { 1: 'Status', 2: 'Phys.', 3: 'Spec.' }, acc: 'Acc.', power: 'Power',
      origin: 'Origin', metAt: 'Met at', metLevel: 'Met level', metDate: 'Met on', ball: 'Ball', eggFrom: 'Egg received at', hatchedAt: 'Hatched at',
      ot: 'Original trainer', game: 'Game', language: 'Language', fateful: 'Event Pokémon',
      openDex: 'Open in Pokédex →', close: 'Close',
      status: { slp: 'SLP', psn: 'PSN', brn: 'BRN', frz: 'FRZ', par: 'PAR', tox: 'TOX', ko: 'FNT' },
      link: {
        sameTrainer: 'Both saves belong to the same trainer – Soul Link needs the saves of two players.',
        pairs: function (n) { return n + (n === 1 ? ' pair' : ' pairs'); },
        check: function (n) { return n + ' to check'; },
        solo: function (n) { return n + ' without partner'; },
        warns: function (n) { return n + (n === 1 ? ' rule break' : ' rule breaks'); },
        how: 'Linked automatically by catch location. If there are several catches at one location, the catch date decides – those pairs are marked “check”. Corrections are stored on this device and also apply to later saves.',
        src: { auto: 'auto', check: 'check', manual: 'manual' },
        srcTitle: { auto: 'Only catch of both players at this location', check: 'Several catches here – matched by catch date', manual: 'Set by you' },
        confirm: '✓ Correct', change: 'Change', unlink: 'Unlink', link: 'Link', ignore: 'Ignore', restore: 'Restore', auto: 'Automatic',
        reset: 'Reset corrections', resetConfirm: 'Delete all manual links and exceptions for this run?',
        warnTitle: 'Rule breaks', pairsTitle: 'Pairs', unpairedTitle: 'Without partner', allPaired: 'Every Pokémon has a partner.',
        ignored: function (n) { return n + ' ignored'; }, ignoredHint: 'Not part of the run (e.g. HM slaves) and never linked.',
        reasons: {
          noMatch: function (p) { return p + ' has nothing here'; }, extra: 'Extra catch here', traded: 'Traded',
          blocked: 'Unlinked manually', partnerGone: 'Partner no longer there', noLocation: 'No location'
        },
        st: { team: 'Team', box: 'Box', daycare: 'Day Care', dead: 'Dead', fainted: 'Fainted' },
        wDeath: function (dead, alive, inTeam) { return dead + ' is dead – partner ' + alive + (inTeam ? ' is still in the team' : ' is still alive'); },
        wTeam: function (inTeam, other) { return inTeam + ' is in the team, partner ' + other + ' is not'; },
        wSolo: function (n) { return n + ' is in the team but has no partner'; },
        pickTitle: 'Choose partner', pickSame: 'Same location', pickFree: 'Without partner', pickTaken: 'Already linked – will be unlinked', pickNone: 'No partner',
        partner: 'Soul Link partner', noPartner: 'No partner', isIgnored: 'Ignored – not part of the run'
      }
    }
  };

  /* ── Zustand ───────────────────────────────────────────────────── */
  var lang = 'de';
  try { lang = localStorage.getItem('hub-lang') === 'en' ? 'en' : 'de'; } catch (e) {}
  var state = { saves: [], active: 0, tab: 'team', dexMode: 'sinnoh', search: '', pendingSlot: null, link: null };

  var $ = function (id) { return document.getElementById(id); };
  function L() { return I18N[lang]; }
  function T() { return D.text[lang]; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return Number(n).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US'); }
  function pad(n, w) { return String(n).padStart(w, '0'); }

  /* ── Speicher auf dem Gerät (IndexedDB) ────────────────────────── */
  var Store = (function () {
    var dbp = null;
    function db() {
      if (!dbp) {
        dbp = new Promise(function (res, rej) {
          if (!window.indexedDB) { rej(new Error('no idb')); return; }
          var r = indexedDB.open('pokehub-saveviewer', 1);
          r.onupgradeneeded = function () { r.result.createObjectStore('saves', { keyPath: 'slot' }); };
          r.onsuccess = function () { res(r.result); };
          r.onerror = function () { rej(r.error); };
        });
      }
      return dbp;
    }
    function run(mode, fn) {
      return db().then(function (d) {
        return new Promise(function (res, rej) {
          var t = d.transaction('saves', mode);
          var req = fn(t.objectStore('saves'));
          t.oncomplete = function () { res(req && req.result); };
          t.onerror = function () { rej(t.error); };
        });
      });
    }
    return {
      all: function () { return run('readonly', function (s) { return s.getAll(); }).catch(function () { return []; }); },
      put: function (rec) { return run('readwrite', function (s) { return s.put(rec); }).catch(function () {}); },
      del: function (slot) { return run('readwrite', function (s) { return s.delete(slot); }).catch(function () {}); }
    };
  })();

  /* ── Namen & Bilder ────────────────────────────────────────────── */
  function speciesName(sp) { return T().species[sp] || ('#' + sp); }
  function monName(m) {
    if (m.isEgg) return L().egg;
    return m.isNicknamed && m.nickname ? m.nickname : speciesName(m.species);
  }
  function formName(m) {
    if (m.species === 201) return m.form < 26 ? String.fromCharCode(65 + m.form) : (m.form === 26 ? '!' : '?');
    if (m.species === 493) { var t = ARCEUS_TYPE[m.form]; return t >= 0 && m.form ? T().types[t] : ''; }
    var f = FORMS[lang][m.species];
    if (!f) return '';
    if (!m.form && m.species !== 412 && m.species !== 413 && m.species !== 422 && m.species !== 423) return '';
    return f[m.form] || '';
  }
  function locName(id) {
    var t = T();
    if (!id) return '—';
    if (id >= 3000) return t.loc3000[id - 3000] || ('#' + id);
    if (id >= 2000) return t.loc2000[id - 2000] || ('#' + id);
    return t.loc0[id] || ('#' + id);
  }
  function ballItem(b) { return b >= 1 && b <= 16 ? b : (b >= 17 && b <= 24 ? 492 + (b - 17) : 4); }
  function itemImg(id, cls) {
    var s = D.itemSprites[id];
    return s ? '<img class="' + (cls || '') + '" src="' + SPR + '/items/' + s + '.png" alt="" loading="lazy">' : '';
  }

  function formKey(sp, form) {
    if (!form) {
      if (sp === 412) return '412-plant';
      if (sp === 422 || sp === 423) return sp + '-west';
      return String(sp);
    }
    switch (sp) {
      case 201: return '201-' + (form < 26 ? String.fromCharCode(97 + form) : (form === 26 ? 'exclamation' : 'question'));
      case 386: return String(10000 + form);
      case 412: return '412-' + (['plant', 'sandy', 'trash'][form] || 'plant');
      case 413: return form === 1 ? '10004' : form === 2 ? '10005' : '413';
      case 422: case 423: return sp + '-east';
      case 479: return String(10007 + form);
      case 487: return '10007';
      case 492: return '10006';
      case 493: return '493-' + (ARCEUS[form] || 'normal');
    }
    return String(sp);
  }
  function spriteTag(m, cls) {
    var fb = SPR + '/pokemon/' + m.species + '.png';
    if (m.isEgg) return '<img class="' + cls + '" src="' + SPR + '/pokemon/egg.png" alt="">';
    var dir = PT_SPR + (m.shiny ? 'shiny/' : '');
    if (m.gender === 1 && !m.form && FEMALE.has(m.species)) dir += 'female/';
    return '<img class="' + cls + (m.shiny ? ' is-shiny' : '') + '" src="' + dir + formKey(m.species, m.form) + '.png" data-fb="' + fb + '" alt="" loading="lazy">';
  }
  function iconTag(m, cls) {
    if (m.isEgg) return '<img class="' + (cls || '') + '" src="' + ICON_SPR + 'egg.png" alt="" loading="lazy">';
    return '<img class="' + (cls || '') + '" src="' + ICON_SPR + formKey(m.species, m.form) + '.png" data-fb="' + ICON_SPR + m.species + '.png" alt="" loading="lazy">';
  }
  function iconSpecies(sp) {
    return '<img src="' + ICON_SPR + sp + '.png" alt="" loading="lazy">';
  }
  function typeBadge(t) {
    return '<span class="type" style="--c:' + TYPE_HEX[t] + '">' + esc(T().types[t]) + '</span>';
  }
  function genderTag(m) {
    if (m.isEgg || m.gender === 2) return '';
    return m.gender === 1 ? '<span class="g-f">♀</span>' : '<span class="g-m">♂</span>';
  }
  function statusInfo(m) {
    var s = m.status, k = null;
    if (m.where.area === 'party' && m.hp === 0 && !m.isEgg) k = 'ko';
    else if (s & 7) k = 'slp';
    else if (s & 0x80) k = 'tox';
    else if (s & 8) k = 'psn';
    else if (s & 0x10) k = 'brn';
    else if (s & 0x20) k = 'frz';
    else if (s & 0x40) k = 'par';
    if (!k) return '';
    var col = { ko: '#e0475b', slp: '#8a8aa0', tox: '#8e3fa0', psn: '#a040a0', brn: '#e8742e', frz: '#5fb8c8', par: '#d4a91a' }[k];
    return '<span class="status" style="--sc:' + col + '">' + L().status[k] + '</span>';
  }
  function cardRgb(m) { return m.types && m.types.length ? TYPE_RGB[m.types[0]] : '87,210,255'; }

  // Bilder, die es nicht gibt: auf Standard-Sprite ausweichen
  document.addEventListener('error', function (e) {
    var t = e.target;
    if (!t || t.tagName !== 'IMG') return;
    if (t.dataset.fb && t.src !== t.dataset.fb) { t.src = t.dataset.fb; return; }
    t.style.visibility = 'hidden';
  }, true);

  /* ── Spielstände laden ─────────────────────────────────────────── */
  function cur() { return state.saves[state.active]; }

  function showError(msg) {
    var el = $('error');
    if (!msg) { el.hidden = true; el.textContent = ''; return; }
    el.hidden = false;
    el.innerHTML = '<span>⚠️</span><span>' + esc(msg) + '</span>';
  }

  function errorText(r) {
    var l = L();
    if (r.error === 'size') return l.errSize(Math.round((r.size || 0) / 1024));
    if (r.error === 'game') return l.errGame(r.game);
    return l.errUnknown;
  }

  function graveKey(data) { return 'saveviewer-grave-' + data.trainer.tid + '-' + data.trainer.sid; }
  function autoGrave(data) {
    var rx = /friedhof|grab|tot|rip|grave|dead|☠|✝|†/i;
    for (var i = 0; i < data.boxes.length; i++) if (rx.test(data.boxes[i].name)) return i;
    return -1;
  }
  function loadGrave(data) {
    try {
      var v = localStorage.getItem(graveKey(data));
      if (v !== null) return parseInt(v, 10);
    } catch (e) {}
    return autoGrave(data);
  }

  function makeSave(rec) {
    var data = PtSave.parse(new Uint8Array(rec.bytes), D);
    if (!data.ok) return { error: data };
    return {
      slot: rec.slot, fileName: rec.fileName, loadedAt: rec.loadedAt, bytes: rec.bytes, data: data,
      box: Math.min(Math.max(data.currentBox, 0), 17), grave: loadGrave(data)
    };
  }

  function freeSlot() {
    for (var s = 1; s <= MAX_SAVES; s++) if (!state.saves.some(function (x) { return x.slot === s; })) return s;
    return null;
  }

  function handleFile(file, slot) {
    if (!file) return;
    showError(null);
    file.arrayBuffer().then(function (buf) {
      var target = slot || freeSlot() || (cur() && cur().slot) || 1;
      var rec = { slot: target, fileName: file.name, loadedAt: Date.now(), bytes: buf };
      var sv = makeSave(rec);
      if (sv.error) { showError(errorText(sv.error)); return; }
      var before = state.saves.length;
      state.saves = state.saves.filter(function (x) { return x.slot !== target; });
      state.saves.push(sv);
      state.saves.sort(function (a, b) { return a.slot - b.slot; });
      state.active = state.saves.indexOf(sv);
      if (before === 1 && state.saves.length === 2) state.tab = 'link';
      Store.put(rec);
      render();
    }).catch(function () { showError(L().errRead); });
  }

  function pickFile(slot) {
    state.pendingSlot = slot || null;
    var input = $('file-input');
    input.value = '';
    input.click();
  }

  function removeSave(idx) {
    var sv = state.saves[idx];
    if (!sv) return;
    state.saves.splice(idx, 1);
    Store.del(sv.slot);
    state.active = Math.max(0, Math.min(state.active, state.saves.length - 1));
    render();
  }

  /* ── Rendering ─────────────────────────────────────────────────── */
  function render() {
    applyLang();
    var has = state.saves.length > 0;
    $('drop-section').hidden = has;
    $('loaded').hidden = !has;
    if (!has) { closeModal(); return; }
    renderSaveBar();
    renderNotices();
    renderTrainer();
    renderTabs();
    renderPanel();
  }

  function renderSaveBar() {
    var l = L();
    var html = state.saves.map(function (sv, i) {
      var d = new Date(sv.loadedAt);
      var title = sv.fileName + ' · ' + l.loadedAt + ' ' + d.toLocaleString(lang === 'de' ? 'de-DE' : 'en-US');
      return '<span class="save-chip' + (i === state.active ? ' is-active' : '') + '">' +
        '<button type="button" data-act="activate" data-i="' + i + '" title="' + esc(title) + '" style="all:unset;cursor:pointer">' +
        esc(sv.data.trainer.name || sv.fileName) + ' <span class="muted" style="font-weight:600">· ' + esc(sv.fileName) + '</span></button>' +
        '<button type="button" class="x" data-act="remove" data-i="' + i + '" aria-label="' + l.remove + '" title="' + l.remove + '">×</button></span>';
    }).join('');
    if (state.saves.length < MAX_SAVES) {
      html += '<button type="button" class="ghost-btn" data-act="add" title="' + esc(l.addSaveTitle) + '">' + l.addSave + '</button>';
    }
    $('save-bar').innerHTML = html;
  }

  function renderNotices() {
    var sv = cur(), l = L(), out = [];
    var c = sv.data.checksums;
    if (c.fallback) out.push(l.warnFallback);
    else if (!c.general || !c.storage) out.push(l.warnChecksum);
    if (sv.data.badSlots.length) out.push(l.warnBad(sv.data.badSlots.length));
    $('notices').innerHTML = out.map(function (t) { return '<div class="notice">' + esc(t) + '</div>'; }).join('');
  }

  function gameDate(sec) {
    if (!sec || sec > 0x7FFFFFFF) return '';
    var d = new Date(Date.UTC(2000, 0, 1) + sec * 1000);
    return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
  }

  function renderTrainer() {
    var t = cur().data.trainer, dex = cur().data.dex, l = L();
    var pt = t.playTime;
    var meta = [
      '<span>' + l.id + ' <b>' + pad(t.tid, 5) + '</b></span>',
      '<span>' + l.playTime + ' <b>' + pt.h + ':' + pad(pt.m, 2) + '</b></span>',
      '<span>' + l.money + ' <b>₽' + num(t.money) + '</b></span>'
    ];
    if (t.rival) meta.push('<span>' + l.rival + ' <b>' + esc(t.rival) + '</b></span>');
    if (t.coins) meta.push('<span>' + l.coins + ' <b>' + num(t.coins) + '</b></span>');
    var started = gameDate(t.started);
    if (started) meta.push('<span>' + l.started + ' <b>' + started + '</b></span>');
    if (t.gameClear) meta.push('<span class="pill" style="color:var(--color-accent);border-color:rgba(var(--t-acc),0.35)">🏆 ' + l.champion + '</span>');

    var badges = BADGES.map(function (b, i) {
      var on = t.badges[b.bit];
      return '<span class="badge' + (on ? ' on' : '') + '" style="--bc:' + b.color + '" title="' + esc(l.badgeOf(locName(b.city))) + '"><span>' + (i + 1) + '</span></span>';
    }).join('');

    var sPct = Math.round(dex.sinnohCaught / dex.sinnohTotal * 100);
    var dexHtml = '<div class="dex-box">' +
      '<div class="dex-row"><span>' + l.sinnohDex + '</span><span><b>' + dex.sinnohCaught + '</b> / ' + dex.sinnohTotal + ' ' + l.caught + '</span></div>' +
      '<div class="bar"><span style="width:' + sPct + '%"></span></div>' +
      '<div class="dex-row"><span>' + dex.sinnohSeen + ' ' + l.seen + '</span>' +
      (t.nationalDex ? '<span>' + l.nationalDex + ' <b>' + dex.caught.length + '</b> / 493</span>' : '<span></span>') + '</div></div>';

    $('trainer').innerHTML =
      '<div class="avatar' + (t.gender === 1 ? ' is-f' : '') + '">' + esc((t.name || '?').charAt(0)) + '</div>' +
      '<div style="min-width:0"><div class="trainer-name">' + esc(t.name || '—') + ' ' +
      (t.gender === 1 ? '<span class="g-f">♀</span>' : '<span class="g-m">♂</span>') + '</div>' +
      '<div class="trainer-meta">' + meta.join('') + '</div><div class="badges">' + badges + '</div></div>' + dexHtml;
  }

  function boxCount(data) {
    return data.boxes.reduce(function (n, b) { return n + b.slots.filter(Boolean).length; }, 0);
  }

  function renderTabs() {
    computeLinks();
    var data = cur().data;
    var two = state.saves.length === 2;
    if (!two && state.tab === 'link') state.tab = 'team';
    var counts = {
      team: data.party.length,
      boxes: boxCount(data),
      encounters: encounterGroups(cur()).groups.length,
      dex: (state.dexMode === 'sinnoh' ? data.dex.sinnohCaught : data.dex.caught.length),
      link: state.link && state.link.ok ? state.link.result.pairs.length : '–'
    };
    $('tabs').style.setProperty('--n', two ? 5 : 4);
    Array.prototype.forEach.call(document.querySelectorAll('.tab'), function (b) {
      var k = b.dataset.tab;
      b.hidden = k === 'link' && !two;
      b.classList.toggle('is-active', k === state.tab);
      var warn = k === 'link' && state.link && state.link.ok && state.link.result.warnings.length;
      b.innerHTML = esc(L()['tab.' + k]) + '<span class="count">' + counts[k] + (warn ? ' <span class="tab-warn">!</span>' : '') + '</span>';
    });
  }

  function renderPanel() {
    var p = $('panel');
    if (state.tab === 'team') p.innerHTML = teamHtml();
    else if (state.tab === 'boxes') p.innerHTML = boxesHtml();
    else if (state.tab === 'encounters') p.innerHTML = encountersHtml();
    else if (state.tab === 'link') p.innerHTML = linkHtml();
    else p.innerHTML = dexHtml();
  }

  /* Team */
  function ref(saveIdx, w) {
    return [saveIdx, w.area, w.box == null ? '' : w.box, w.slot].join(':');
  }
  function hpColor(p) { return p > 0.5 ? '#62dc96' : p > 0.2 ? '#ffd23f' : '#ff5f5f'; }

  function monCard(m, saveIdx) {
    var l = L();
    var name = monName(m);
    var sub = m.isEgg ? '' : (m.isNicknamed ? esc(speciesName(m.species)) + ' · ' : '');
    var fn = formName(m);
    if (fn && !m.isEgg) sub += esc(fn) + ' · ';
    var hpPct = m.stats[0] ? Math.max(0, Math.min(1, m.hp / m.stats[0])) : 0;
    var moves = m.isEgg ? '' : '<div class="moves">' + m.moves.map(function (mv, i) {
      var info = D.moveInfo[mv] || [0, 0];
      var maxPP = info[1] + Math.floor(info[1] * m.ppUps[i] / 5);
      return '<span class="move" style="--rgb:' + TYPE_RGB[info[0]] + '"><span class="mn">' + esc(T().moves[mv]) + '</span><span class="pp">' + m.pp[i] + '/' + maxPP + '</span></span>';
    }).join('') + '</div>';
    var facts = m.isEgg ? '<div class="mon-facts"><span>' + l.eggCycles + ' <b>' + m.friendship + '</b></span></div>' :
      '<div class="mon-facts">' +
      (m.item ? '<span>' + itemImg(m.item) + '<b>' + esc(T().items[m.item]) + '</b></span>' : '') +
      '<span>' + l.nature + ' <b>' + esc(T().natures[m.nature]) + '</b></span>' +
      '<span>' + l.ability + ' <b>' + esc(T().abilities[m.ability]) + '</b></span></div>';
    var hp = m.isEgg ? '' : '<div class="hp"><span>' + (lang === 'de' ? 'KP' : 'HP') + '</span><div class="bar" style="--hpc:' + hpColor(hpPct) + '"><span style="width:' + (hpPct * 100).toFixed(1) + '%"></span></div><span>' + m.hp + '/' + m.stats[0] + '</span></div>';
    return '<button type="button" class="mon-card' + (m.where.area === 'party' && m.hp === 0 && !m.isEgg ? ' is-fainted' : '') + '" data-mon="' + ref(saveIdx, m.where) + '" style="--tc:' + cardRgb(m) + '">' +
      '<div class="sprite-wrap">' + spriteTag(m, 'sprite') + '</div>' +
      '<div class="mon-head"><div class="mon-name"><span class="nm">' + esc(name) + '</span>' + genderTag(m) +
      (m.shiny ? '<span class="shiny-star" title="Shiny">✦</span>' : '') + statusInfo(m) + '</div>' +
      '<div class="mon-sub">' + sub + (m.isEgg ? '' : '<span class="lv">' + l.lv + ' ' + m.level + '</span>') + '</div>' +
      (m.isEgg ? '' : '<div class="types">' + m.types.map(typeBadge).join('') + '</div>') + '</div>' +
      '<div style="grid-column:2">' + hp + '</div>' + facts + partnerLine(m, saveIdx) + moves + '</button>';
  }

  function teamHtml() {
    var sv = cur(), l = L(), idx = state.active;
    var html = sv.data.party.length
      ? '<div class="team-grid">' + sv.data.party.map(function (m) { return monCard(m, idx); }).join('') + '</div>'
      : '<div class="empty-team">' + l.emptyTeam + '</div>';
    if (sv.data.daycare.length) {
      html += '<div class="subhead"><h3>' + l.daycare + '</h3></div><div class="daycare">' +
        sv.data.daycare.map(function (m) {
          return '<button type="button" class="mini" data-mon="' + ref(idx, m.where) + '">' + spriteTag(m, '') +
            '<span>' + esc(monName(m)) + ' ' + genderTag(m) + '<small>' + l.lv + ' ' + m.level +
            (m.levelNow > m.level ? ' → ' + m.levelNow : '') + ' · ' + esc(l.daycareGain(num(m.daycareExp))) + '</small></span></button>';
        }).join('') + '</div>';
    }
    return html;
  }

  /* Boxen */
  function boxLabel(data, i) { return data.boxes[i].name || (L().box + ' ' + (i + 1)); }

  function graveSelect(sv, saveIdx) {
    var l = L();
    var opts = '<option value="-1">' + l.none + '</option>' + sv.data.boxes.map(function (b, i) {
      return '<option value="' + i + '"' + (sv.grave === i ? ' selected' : '') + '>' + esc(boxLabel(sv.data, i)) + '</option>';
    }).join('');
    return '<label class="grave-select">✝ ' + l.graveyard + ' <select data-act="grave" data-i="' + saveIdx + '">' + opts + '</select></label>';
  }

  function boxesHtml() {
    var sv = cur(), data = sv.data, l = L(), idx = state.active;
    var list = data.boxes.map(function (b, i) {
      var n = b.slots.filter(Boolean).length;
      return '<button type="button" class="box-btn' + (i === sv.box ? ' is-active' : '') + (n ? '' : ' is-empty') + '" data-act="box" data-i="' + i + '">' +
        '<span>' + (sv.grave === i ? '✝ ' : '') + esc(boxLabel(data, i)) + '</span><span class="n">' + n + '</span></button>';
    }).join('');

    var box = data.boxes[sv.box];
    var slots = box.slots.map(function (m) {
      if (!m) return '<button type="button" class="slot" disabled></button>';
      return '<button type="button" class="slot" data-mon="' + ref(idx, m.where) + '" title="' + esc(monName(m) + (m.isEgg ? '' : ' · ' + l.lv + ' ' + m.level)) + '">' +
        iconTag(m) + (m.isEgg ? '' : '<span class="lvl">' + m.level + '</span>') + (m.shiny ? '<span class="star">✦</span>' : '') +
        (m.item ? '<span class="itm"></span>' : '') + '</button>';
    }).join('');
    var count = box.slots.filter(Boolean).length;

    var search = '<input type="search" id="box-search" placeholder="' + esc(l.search) + '" value="' + esc(state.search) + '" style="max-width:280px;color:var(--color-text);background:rgba(var(--t-ink),0.07);border:1px solid rgba(var(--t-ink),0.14);border-radius:12px;padding:8px 12px;outline:none;width:100%">';
    var results = '';
    if (state.search.trim()) {
      var q = state.search.trim().toLowerCase();
      var hits = [];
      data.boxes.forEach(function (b, bi) {
        b.slots.forEach(function (m) {
          if (!m) return;
          var hay = (monName(m) + ' ' + speciesName(m.species) + ' ' + D.text.en.species[m.species] + ' ' + D.text.de.species[m.species]).toLowerCase();
          if (hay.indexOf(q) >= 0) hits.push({ m: m, b: bi });
        });
      });
      results = '<div class="enc-mons" style="margin:0 0 14px">' + (hits.length ? hits.map(function (h) {
        return '<button type="button" class="enc-mon" data-mon="' + ref(idx, h.m.where) + '">' + iconTag(h.m) + esc(monName(h.m)) +
          ' <small>' + esc(boxLabel(data, h.b)) + '</small></button>';
      }).join('') : '<span class="muted">' + l.noResults + '</span>') + '</div>';
    }

    return '<div class="box-layout"><div class="box-list">' + list + '</div><div>' +
      '<div class="box-title"><h3>' + (sv.grave === sv.box ? '✝ ' : '') + esc(boxLabel(data, sv.box)) + ' <span class="muted" style="font-size:0.85rem;font-weight:700">' + count + '/30</span></h3>' + search + '</div>' +
      results +
      '<div class="box-grid' + (sv.grave === sv.box ? ' is-grave' : '') + '">' + slots + '</div>' +
      (count ? '' : '<p class="muted" style="margin-top:10px;font-size:0.85rem">' + l.boxEmpty + '</p>') +
      '<div style="margin-top:14px">' + graveSelect(sv, idx) + '</div></div></div>';
  }

  /* Fangorte */
  function allMons(sv) {
    var out = [];
    sv.data.party.forEach(function (m) { out.push({ m: m, tag: 'team' }); });
    sv.data.boxes.forEach(function (b, bi) {
      b.slots.forEach(function (m) { if (m) out.push({ m: m, tag: bi === sv.grave ? 'dead' : 'box' }); });
    });
    sv.data.daycare.forEach(function (m) { out.push({ m: m, tag: 'daycare' }); });
    return out;
  }

  function groupKey(m) {
    if (m.isEgg) return 'egg';
    if (m.eggLocation) return 'L' + m.eggLocation;
    if (m.metLocation) return 'L' + m.metLocation;
    return 'none';
  }

  function encounterGroups(sv) {
    var map = {};
    allMons(sv).forEach(function (e) {
      var k = groupKey(e.m);
      (map[k] = map[k] || []).push(e);
    });
    var keys = Object.keys(map).sort(function (a, b) {
      var ra = a === 'egg' ? 1e6 : a === 'none' ? 1e6 + 1 : +a.slice(1);
      var rb = b === 'egg' ? 1e6 : b === 'none' ? 1e6 + 1 : +b.slice(1);
      return ra - rb;
    });
    return { map: map, groups: keys.filter(function (k) { return k !== 'egg' && k !== 'none'; }), keys: keys };
  }

  function groupLabel(k) {
    if (k === 'egg') return L().eggs;
    if (k === 'none') return L().noLocation;
    return locName(+k.slice(1));
  }

  function encMon(e, saveIdx, trainer) {
    var m = e.m, l = L();
    var tags = '';
    if (e.tag === 'team') tags += ' <span class="tag team">' + l.tagTeam + '</span>';
    if (e.tag === 'daycare') tags += ' <span class="tag">' + l.tagDaycare + '</span>';
    if (e.tag === 'dead') tags += ' <span class="tag dead">' + l.tagDead + '</span>';
    if (m.eggLocation && !m.isEgg) tags += ' <span class="tag">' + l.hatched + '</span>';
    if (m.tid !== trainer.tid || m.sid !== trainer.sid) tags += ' <span class="tag">' + l.traded + '</span>';
    return '<button type="button" class="enc-mon' + (e.tag === 'dead' ? ' is-dead' : '') + '" data-mon="' + ref(saveIdx, m.where) + '">' +
      iconTag(m) + esc(monName(m)) + (m.isEgg ? '' : ' <small>' + l.lv + ' ' + m.level + '</small>') + tags + '</button>';
  }

  function encountersHtml() {
    var l = L();
    var saves = state.saves;
    var groups = saves.map(encounterGroups);
    var keys = [];
    groups.forEach(function (g) { g.keys.forEach(function (k) { if (keys.indexOf(k) < 0) keys.push(k); }); });
    keys.sort(function (a, b) {
      var r = function (k) { return k === 'egg' ? 1e6 : k === 'none' ? 1e6 + 1 : +k.slice(1); };
      return r(a) - r(b);
    });

    var summary = saves.map(function (sv, i) {
      var all = allMons(sv);
      var dead = all.filter(function (e) { return e.tag === 'dead'; }).length;
      return '<div class="card" style="padding:12px 16px;display:flex;gap:12px;align-items:center;flex-wrap:wrap;justify-content:space-between">' +
        '<div><b style="color:rgb(var(--t-white))">' + esc(sv.data.trainer.name) + '</b> <span class="muted">· ' + l.encSummary(groups[i].groups.length, all.length) +
        (dead ? ' · ' + l.encDead(dead) : '') + '</span></div>' + graveSelect(sv, i) + '</div>';
    }).join('');

    var multi = saves.length > 1;
    var head = '<thead><tr><th>' + l.location + '</th>' + saves.map(function (sv) {
      return '<th>' + (multi ? esc(sv.data.trainer.name) : '') + '</th>';
    }).join('') + '</tr></thead>';
    var rows = keys.map(function (k) {
      return '<tr><td>' + esc(groupLabel(k)) + '</td>' + saves.map(function (sv, i) {
        var list = groups[i].map[k];
        return '<td data-label="' + esc(multi ? sv.data.trainer.name : '') + '"' + (multi ? '' : ' data-single') + '>' +
          (list ? '<div class="enc-mons">' + list.map(function (e) { return encMon(e, i, sv.data.trainer); }).join('') + '</div>' : '<span class="enc-none">—</span>') + '</td>';
      }).join('') + '</tr>';
    }).join('');

    return '<div style="display:grid;gap:8px;margin-bottom:14px">' + summary + '</div>' +
      '<table class="enc-table' + (multi ? ' is-multi' : '') + '">' + head + '<tbody>' + rows + '</tbody></table>';
  }

  /* Pokédex */
  function dexHtml() {
    var data = cur().data, l = L();
    var caught = new Set(data.dex.caught), seen = new Set(data.dex.seen);
    var list = state.dexMode === 'sinnoh' ? D.sinnohDex : Array.from({ length: 493 }, function (_, i) { return i + 1; });
    var cells = list.map(function (sp, i) {
      var st = caught.has(sp) ? 'caught' : seen.has(sp) ? 'seen' : 'unseen';
      var no = state.dexMode === 'sinnoh' ? i + 1 : sp;
      var title = st === 'unseen' ? '???' : speciesName(sp);
      return '<a class="dex-cell ' + st + '" href="../PokemonInfo/index.html#' + sp + '" title="' + esc('#' + pad(no, 3) + ' ' + title) + '">' + iconSpecies(sp) + '<span>' + pad(no, 3) + '</span></a>';
    }).join('');
    var c = state.dexMode === 'sinnoh' ? data.dex.sinnohCaught : data.dex.caught.length;
    var s = state.dexMode === 'sinnoh' ? data.dex.sinnohSeen : data.dex.seen.length;
    return '<div class="dex-tools"><div class="seg">' +
      ['sinnoh', 'national'].map(function (k) {
        return '<button type="button" data-act="dexmode" data-k="' + k + '" class="' + (state.dexMode === k ? 'is-active' : '') + '">' + l.dexMode[k] + '</button>';
      }).join('') + '</div>' +
      '<div class="legend"><span><i style="background:#62dc96"></i>' + c + ' ' + l.legendCaught + '</span><span><i style="background:#8a8aa0"></i>' + (s - c) + ' ' + l.legendSeen + '</span><span><i style="background:rgba(var(--t-ink),0.12)"></i>' + (list.length - s) + ' ' + l.legendUnseen + '</span></div></div>' +
      '<div class="dex-grid">' + cells + '</div>';
  }


  /* ── Soul Link ─────────────────────────────────────────────────── */
  var CHAIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';
  var BROKEN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18.8 13.4l1.7-1.7a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M5.2 10.6l-1.7 1.7a5 5 0 0 0 7 7l1.7-1.7"/><path d="M8 2v3M2 8h3M16 22v-3M22 16h-3"/></svg>';

  function trainerKey(sv) { return sv.data.trainer.tid + '-' + sv.data.trainer.sid; }
  function runKey() {
    return 'saveviewer-links-' + [trainerKey(state.saves[0]), trainerKey(state.saves[1])].sort().join('_');
  }
  function getPins() {
    try { return JSON.parse(localStorage.getItem(runKey()) || '{}') || {}; } catch (e) { return {}; }
  }
  function setPins(p) {
    try {
      if (Object.keys(p).length) localStorage.setItem(runKey(), JSON.stringify(p));
      else localStorage.removeItem(runKey());
    } catch (e) {}
    renderTabs();
    renderPanel();
  }

  function linkEntries(sv) {
    var t = sv.data.trainer, out = [], order = 0;
    function add(m, status) {
      out.push({ m: m, key: SoulLink.monKey(m), own: m.tid === t.tid && m.sid === t.sid, status: status, order: order++ });
    }
    sv.data.party.forEach(function (m) { add(m, m.hp === 0 && !m.isEgg ? 'fainted' : 'team'); });
    sv.data.boxes.forEach(function (b, bi) { b.slots.forEach(function (m) { if (m) add(m, bi === sv.grave ? 'dead' : 'box'); }); });
    sv.data.daycare.forEach(function (m) { add(m, 'daycare'); });
    return out;
  }

  function computeLinks() {
    if (state.saves.length !== 2) { state.link = null; return; }
    if (trainerKey(state.saves[0]) === trainerKey(state.saves[1])) { state.link = { ok: false }; return; }
    var A = linkEntries(state.saves[0]), B = linkEntries(state.saves[1]);
    var r = SoulLink.compute(A, B, getPins());
    var by = [{}, {}];
    r.pairs.forEach(function (p) {
      by[0][p.a.key] = { pair: p, self: p.a, partner: p.b, other: 1 };
      by[1][p.b.key] = { pair: p, self: p.b, partner: p.a, other: 0 };
    });
    r.unpairedA.forEach(function (u) { by[0][u.e.key] = { unpaired: u, self: u.e }; });
    r.unpairedB.forEach(function (u) { by[1][u.e.key] = { unpaired: u, self: u.e }; });
    r.ignoredA.forEach(function (e) { by[0][e.key] = { ignored: true, self: e }; });
    r.ignoredB.forEach(function (e) { by[1][e.key] = { ignored: true, self: e }; });
    state.link = { ok: true, result: r, by: by, A: A, B: B };
  }

  function linkInfo(saveIdx, m) {
    if (!state.link || !state.link.ok) return null;
    return state.link.by[saveIdx][SoulLink.monKey(m)] || null;
  }

  function pairState(p) {
    var da = SoulLink.isDead(p.a), db = SoulLink.isDead(p.b);
    if (da && db) return 'dead';
    if (da !== db) return 'death';
    if ((p.a.status === 'team') !== (p.b.status === 'team')) return 'team';
    return 'ok';
  }
  function srcKey(p) { return p.source === 'manual' ? 'manual' : (p.sure ? 'auto' : 'check'); }
  function srcBadge(p) {
    var k = srcKey(p), l = L().link;
    return '<span class="src src--' + k + '" title="' + esc(l.srcTitle[k]) + '">' + l.src[k] + '</span>';
  }
  function trName(i) { return state.saves[i].data.trainer.name || ('#' + (i + 1)); }
  function whoName(e, i) { return monName(e.m) + ' (' + trName(i) + ')'; }

  function lchip(e, saveIdx, extraCls) {
    var m = e.m, l = L();
    return '<button type="button" class="lchip st-' + e.status + (extraCls ? ' ' + extraCls : '') + '" data-mon="' + ref(saveIdx, m.where) + '">' + iconTag(m) +
      '<span class="lc-txt"><span class="lc-name">' + esc(monName(m)) + '</span>' +
      '<span class="lc-sub">' + (m.isEgg ? '' : l.lv + ' ' + m.level + ' · ') + '<span class="lc-st">' + l.link.st[e.status] + '</span></span></span></button>';
  }

  function partnerLine(m, saveIdx) {
    var info = linkInfo(saveIdx, m);
    if (!info || !info.pair) return '';
    var st = pairState(info.pair);
    return '<div class="mon-link is-' + st + '">' + CHAIN + iconTag(info.partner.m) + '<b>' + esc(monName(info.partner.m)) + '</b><span class="muted">· ' + esc(trName(info.other)) + ' · ' + L().link.st[info.partner.status] + '</span></div>';
  }

  function partnerSection(m, saveIdx) {
    if (!state.link || !state.link.ok || saveIdx == null) return '';
    var info = linkInfo(saveIdx, m), l = L().link;
    if (!info) return '';
    var key = SoulLink.monKey(m), body;
    if (info.pair) {
      body = '<div class="sl-row"><span class="pair-link is-' + pairState(info.pair) + '">' + CHAIN + '</span>' + lchip(info.partner, info.other) +
        '<span class="muted" style="font-size:0.8rem">' + esc(trName(info.other)) + '</span>' + srcBadge(info.pair) +
        '<span class="sl-btns"><button type="button" class="mini-btn" data-act="lpick" data-side="' + saveIdx + '" data-k="' + key + '">' + l.change + '</button>' +
        '<button type="button" class="mini-btn" data-act="lunlink" data-a="' + info.pair.a.key + '" data-b="' + info.pair.b.key + '">' + l.unlink + '</button></span></div>';
    } else if (info.ignored) {
      body = '<div class="sl-row"><span class="muted">' + l.isIgnored + '</span><span class="sl-btns"><button type="button" class="mini-btn" data-act="lrestore" data-k="' + key + '">' + l.restore + '</button></span></div>';
    } else {
      body = '<div class="sl-row"><span class="pair-link is-none">' + BROKEN + '</span><span class="muted">' + l.noPartner + ' · ' + esc(reasonText(info.unpaired, saveIdx)) + '</span>' +
        '<span class="sl-btns"><button type="button" class="mini-btn mini-btn--primary" data-act="lpick" data-side="' + saveIdx + '" data-k="' + key + '">' + l.link + '</button></span></div>';
    }
    return '<div class="d-section sl-section"><h4>' + l.partner + '</h4>' + body + '</div>';
  }

  function reasonText(u, side) {
    var r = L().link.reasons[u.reason];
    return typeof r === 'function' ? r(trName(1 - side)) : r;
  }

  function linkHtml() {
    var l = L().link, ll = state.link;
    if (!ll) return '';
    if (!ll.ok) return '<div class="notice">' + esc(l.sameTrainer) + '</div>';
    var r = ll.result;
    var nCheck = r.pairs.filter(function (p) { return srcKey(p) === 'check'; }).length;
    var nSolo = r.unpairedA.length + r.unpairedB.length;

    var head = '<div class="card sl-head">' +
      '<div class="sl-players"><span>' + esc(trName(0)) + '</span><span class="pair-link is-ok">' + CHAIN + '</span><span>' + esc(trName(1)) + '</span></div>' +
      '<div class="sl-stats"><span class="pill pill--ok">' + l.pairs(r.pairs.length) + '</span>' +
      (nCheck ? '<span class="pill pill--check">' + l.check(nCheck) + '</span>' : '') +
      (nSolo ? '<span class="pill">' + l.solo(nSolo) + '</span>' : '') +
      (r.warnings.length ? '<span class="pill pill--bad">' + l.warns(r.warnings.length) + '</span>' : '') + '</div>' +
      '<p class="sl-how">' + esc(l.how) + '</p>' +
      '<div class="sl-tools">' + [0, 1].map(function (i) {
        return '<div class="sl-grave"><b>' + esc(trName(i)) + '</b>' + graveSelect(state.saves[i], i) + '</div>';
      }).join('') +
      (Object.keys(getPins()).length ? '<button type="button" class="mini-btn" data-act="lreset">' + l.reset + '</button>' : '') + '</div></div>';

    var warns = '';
    if (r.warnings.length) {
      warns = '<div class="subhead"><h3>' + l.warnTitle + '</h3></div><div class="slw-list">' + r.warnings.map(function (w) {
        var text, target, side;
        if (w.type === 'death') {
          var dead = w.dead === 'a' ? w.pair.a : w.pair.b, alive = w.dead === 'a' ? w.pair.b : w.pair.a;
          var ds = w.dead === 'a' ? 0 : 1;
          text = l.wDeath(whoName(dead, ds), whoName(alive, 1 - ds), alive.status === 'team');
          target = alive; side = 1 - ds;
        } else if (w.type === 'team') {
          var inT = w.inTeam === 'a' ? w.pair.a : w.pair.b, oth = w.inTeam === 'a' ? w.pair.b : w.pair.a;
          var ts = w.inTeam === 'a' ? 0 : 1;
          text = l.wTeam(whoName(inT, ts), whoName(oth, 1 - ts));
          target = inT; side = ts;
        } else {
          side = w.side === 'a' ? 0 : 1;
          text = l.wSolo(whoName(w.e, side));
          target = w.e;
        }
        var icon = w.type === 'death' ? '✝' : w.type === 'team' ? '⇅' : '⚠';
        return '<button type="button" class="slw slw--' + w.type + '" data-mon="' + ref(side, target.m.where) + '"><span class="slw-i">' + icon + '</span>' + iconTag(target.m) + '<span>' + esc(text) + '</span></button>';
      }).join('') + '</div>';
    }

    var pairs = '<div class="subhead"><h3>' + l.pairsTitle + '</h3></div>' +
      '<div class="pair-head"><span>' + esc(L().location) + '</span><span>' + esc(trName(0)) + '</span><span></span><span>' + esc(trName(1)) + '</span><span></span></div>' +
      '<div class="pair-list">' + r.pairs.map(function (p) {
        var st = pairState(p), k = srcKey(p);
        return '<div class="pair is-' + st + '">' +
          '<div class="pair-loc"><b>' + esc(locName(p.loc)) + '</b>' + srcBadge(p) + '</div>' +
          '<div class="pair-a">' + lchip(p.a, 0) + '</div>' +
          '<div class="pair-link is-' + st + '">' + CHAIN + '</div>' +
          '<div class="pair-b">' + lchip(p.b, 1) + '</div>' +
          '<div class="pair-act">' +
          (k === 'check' ? '<button type="button" class="mini-btn mini-btn--primary" data-act="lconfirm" data-a="' + p.a.key + '" data-b="' + p.b.key + '">' + l.confirm + '</button>' : '') +
          '<button type="button" class="mini-btn" data-act="lpick" data-side="0" data-k="' + p.a.key + '">' + l.change + '</button>' +
          '<button type="button" class="mini-btn" data-act="lunlink" data-a="' + p.a.key + '" data-b="' + p.b.key + '">' + l.unlink + '</button>' +
          '</div></div>';
      }).join('') + '</div>';

    function unpCol(list, side) {
      return '<div class="unp-col"><h4>' + esc(trName(side)) + '</h4>' + (list.length ? list.map(function (u) {
        var key = u.e.key;
        var manual = u.reason === 'blocked' || u.reason === 'partnerGone';
        return '<div class="unp">' + lchip(u.e, side) +
          '<span class="unp-why">' + esc(locName(SoulLink.encounterLocation(u.e.m))) + ' · ' + esc(reasonText(u, side)) + '</span>' +
          '<span class="unp-act"><button type="button" class="mini-btn mini-btn--primary" data-act="lpick" data-side="' + side + '" data-k="' + key + '">' + l.link + '</button>' +
          (manual ? '<button type="button" class="mini-btn" data-act="lrestore" data-k="' + key + '">' + l.auto + '</button>' : '') +
          '<button type="button" class="mini-btn" data-act="lignore" data-k="' + key + '">' + l.ignore + '</button></span></div>';
      }).join('') : '<p class="muted" style="font-size:0.85rem">—</p>') + '</div>';
    }
    var unpaired = '<div class="subhead"><h3>' + l.unpairedTitle + '</h3></div>' +
      (nSolo ? '<div class="unp-grid">' + unpCol(r.unpairedA, 0) + unpCol(r.unpairedB, 1) + '</div>' : '<p class="muted">' + l.allPaired + '</p>');

    var nIgn = r.ignoredA.length + r.ignoredB.length;
    var ignored = nIgn ? '<details class="help" style="margin-top:14px"><summary>' + l.ignored(nIgn) + '</summary><div class="help-body"><p>' + esc(l.ignoredHint) + '</p><div class="enc-mons">' +
      [[r.ignoredA, 0], [r.ignoredB, 1]].map(function (x) {
        return x[0].map(function (e) {
          return '<span class="ign">' + lchip(e, x[1]) + '<button type="button" class="mini-btn" data-act="lrestore" data-k="' + e.key + '">' + l.restore + '</button></span>';
        }).join('');
      }).join('') + '</div></div></details>' : '';

    return head + warns + pairs + unpaired + ignored;
  }

  /* Partner auswählen */
  function openPicker(side, key) {
    var ll = state.link;
    if (!ll || !ll.ok) return;
    var l = L().link, own = side === 0 ? ll.A : ll.B, other = side === 0 ? ll.B : ll.A;
    var self = own.filter(function (e) { return e.key === key; })[0];
    if (!self) return;
    var loc = SoulLink.encounterLocation(self.m);
    var cur = SoulLink.partnerOf(ll.result, key);
    var same = [], free = [], taken = [];
    other.forEach(function (e) {
      if (e.key === cur) return;
      var info = ll.by[1 - side][e.key];
      if (info && info.ignored) return;
      if (SoulLink.encounterLocation(e.m) === loc) same.push(e);
      else if (info && info.pair) taken.push(e);
      else free.push(e);
    });
    function btn(e) {
      var info = ll.by[1 - side][e.key];
      var sub = esc(locName(SoulLink.encounterLocation(e.m)));
      if (info && info.pair) sub += ' · ⇄ ' + esc(monName(info.partner.m));
      return '<button type="button" class="pick" data-act="lpickset" data-k="' + key + '" data-p="' + e.key + '">' + iconTag(e.m) +
        '<span class="lc-txt"><span class="lc-name">' + esc(monName(e.m)) + (e.m.isEgg ? '' : ' <small>' + L().lv + ' ' + e.m.level + '</small>') + '</span><span class="lc-sub">' + sub + '</span></span>' +
        '<span class="lc-st st-' + e.status + '">' + l.st[e.status] + '</span></button>';
    }
    function section(title, list) {
      return list.length ? '<h4 class="pick-h">' + esc(title) + '</h4><div class="pick-list">' + list.map(btn).join('') + '</div>' : '';
    }
    $('modal-card').innerHTML = '<button type="button" class="modal-close" data-act="close" aria-label="' + L().close + '">×</button>' +
      '<div class="pick-head">' + iconTag(self.m) + '<div><div class="d-name" style="font-size:1.25rem">' + l.pickTitle + '</div>' +
      '<div class="d-sub">' + esc(monName(self.m)) + ' (' + esc(trName(side)) + ') · ' + esc(locName(loc)) + '</div></div></div>' +
      section(l.pickSame, same) + section(l.pickFree, free) + section(l.pickTaken, taken) +
      '<div style="margin-top:14px"><button type="button" class="mini-btn" data-act="lpicknone" data-k="' + key + '">' + l.pickNone + '</button></div>';
    $('modal').hidden = false;
    document.body.style.overflow = 'hidden';
    $('modal-card').scrollTop = 0;
  }

  function linkAction(act, d) {
    var ll = state.link;
    if (!ll || !ll.ok) return false;
    var pins = getPins(), r = ll.result;
    switch (act) {
      case 'lconfirm': setPins(SoulLink.confirm(pins, d.a, d.b)); return true;
      case 'lunlink': setPins(SoulLink.unlink(pins, d.a, d.b)); refreshModal(); return true;
      case 'lpick': openPicker(+d.side, d.k); return true;
      case 'lpickset': setPins(SoulLink.link(pins, r, d.k, d.p)); closeModal(); return true;
      case 'lpicknone': {
        var partner = SoulLink.partnerOf(r, d.k);
        if (partner) pins = SoulLink.unlink(pins, d.k, partner);
        else { pins = SoulLink.restore(pins, d.k); pins[d.k] = null; }
        setPins(pins); closeModal(); return true;
      }
      case 'lignore': setPins(SoulLink.ignore(pins, r, d.k)); return true;
      case 'lrestore': setPins(SoulLink.restore(pins, d.k)); refreshModal(); return true;
      case 'lreset':
        if (confirm(L().link.resetConfirm)) setPins({});
        return true;
    }
    return false;
  }

  var lastModalRef = null;
  function refreshModal() {
    if (!$('modal').hidden && lastModalRef) openModal(lastModalRef);
  }

  /* ── Detailansicht ─────────────────────────────────────────────── */
  function findMon(refStr) {
    var p = refStr.split(':');
    var sv = state.saves[+p[0]];
    if (!sv) return null;
    var area = p[1], box = p[2] === '' ? null : +p[2], slot = +p[3];
    var m = null;
    if (area === 'party') m = sv.data.party.filter(function (x) { return x.where.slot === slot; })[0];
    else if (area === 'box') m = sv.data.boxes[box].slots[slot];
    else if (area === 'daycare') m = sv.data.daycare.filter(function (x) { return x.where.slot === slot; })[0];
    return m ? { m: m, sv: sv } : null;
  }

  function fmtDate(arr) {
    if (!arr) return '—';
    var d = new Date(Date.UTC(arr[0], arr[1] - 1, arr[2]));
    return d.toLocaleDateString(lang === 'de' ? 'de-DE' : 'en-US', { timeZone: 'UTC', year: 'numeric', month: 'short', day: 'numeric' });
  }

  function detailHtml(m, sv, saveIdx) {
    var l = L(), t = T();
    var trainer = sv.data.trainer;
    var up = Math.floor(m.nature / 5), down = m.nature % 5;
    var neutral = up === down;
    var fn = formName(m);

    var head = '<div class="d-head" style="--tc:' + cardRgb(m) + '"><div class="d-sprite-wrap">' + spriteTag(m, '') + '</div><div>' +
      '<div class="d-name">' + esc(monName(m)) + ' ' + genderTag(m) + (m.shiny ? '<span class="shiny-star">✦</span>' : '') + statusInfo(m) + '</div>' +
      '<div class="d-sub">' + (m.isEgg ? '' : '#' + pad(m.species, 3) + ' ' + esc(speciesName(m.species)) + (fn ? ' (' + esc(fn) + ')' : '') + ' · <span class="lv">' + l.lv + ' ' + m.level + '</span>') + '</div>' +
      (m.isEgg ? '' : '<div class="types" style="margin-top:8px">' + m.types.map(typeBadge).join('') + '</div>') +
      '<div class="d-sub" style="margin-top:8px;font-size:0.85rem"><a href="../PokemonInfo/index.html#' + m.species + '">' + l.openDex + '</a></div>' +
      '</div></div>' + partnerSection(m, saveIdx);

    if (m.isEgg) {
      return head + '<div class="d-grid"><div class="d-section"><h4>' + l.origin + '</h4><dl class="kv">' +
        '<dt>' + l.eggFrom + '</dt><dd>' + esc(locName(m.eggLocation)) + '</dd>' +
        '<dt>' + l.metDate + '</dt><dd>' + fmtDate(m.eggDate) + '</dd>' +
        '<dt>' + l.eggCycles + '</dt><dd>' + m.friendship + '</dd></dl></div></div>';
    }

    // Allgemeines
    var hpType = m.hiddenPower.type;
    var expLine = m.expNext != null
      ? '<div class="bar" style="margin-top:6px"><span style="width:' + (Math.max(0, Math.min(1, (m.exp - m.expThis) / (m.expNext - m.expThis))) * 100).toFixed(1) + '%"></span></div><div class="exp-note">' + l.toNext(m.expNext - m.exp) + '</div>'
      : '<div class="exp-note">' + l.maxLevel + '</div>';
    var pkrs = '';
    if (m.pokerus >> 4) pkrs = (m.pokerus & 15) ? l.pkrsActive : l.pkrsCured;
    var general = '<div class="d-section"><h4>' + esc(speciesName(m.species)) + '</h4><dl class="kv">' +
      '<dt>' + l.nature + '</dt><dd>' + esc(t.natures[m.nature]) + (neutral ? '' : ' <span class="up">↑' + l.statShort[up + 1] + '</span> <span class="down">↓' + l.statShort[down + 1] + '</span>') + '</dd>' +
      '<dt>' + l.ability + '</dt><dd>' + esc(t.abilities[m.ability]) + '</dd>' +
      '<dt>' + l.item + '</dt><dd>' + (m.item ? itemImg(m.item) + esc(t.items[m.item]) : l.noItem) + '</dd>' +
      '<dt>' + l.hiddenPower + '</dt><dd>' + typeBadge(hpType) + ' ' + m.hiddenPower.power + '</dd>' +
      '<dt>' + l.friendship + '</dt><dd>' + m.friendship + ' / 255</dd>' +
      (pkrs ? '<dt>' + l.pokerus + '</dt><dd>' + pkrs + '</dd>' : '') +
      '<dt>' + l.exp + '</dt><dd>' + num(m.exp) + '</dd></dl>' + expLine + '</div>';

    // Werte
    var rows = m.stats.map(function (v, i) {
      var cls = (!neutral && i === up + 1) ? 'up' : (!neutral && i === down + 1) ? 'down' : '';
      var b = m.base[i];
      var col = b >= 120 ? '#62dc96' : b >= 90 ? '#a4e36b' : b >= 60 ? '#ffd23f' : '#ff9a5f';
      return '<tr><td>' + l.statNames[i] + '</td><td class="' + cls + '">' + v + '</td>' +
        '<td class="barcell"><div class="bar"><span style="width:' + Math.min(100, b / 180 * 100).toFixed(1) + '%;background:' + col + '"></span></div></td>' +
        '<td class="dim">' + b + '</td><td class="' + (m.iv[i] === 31 ? 'iv-max' : '') + '">' + m.iv[i] + '</td><td class="dim">' + m.ev[i] + '</td></tr>';
    }).join('');
    var sum = function (a) { return a.reduce(function (x, y) { return x + y; }, 0); };
    var stats = '<div class="d-section"><h4>' + l.stats + '</h4><table class="stat-table"><thead><tr><th></th><th>' + l.colValue + '</th><th></th><th>' + l.colBase + '</th><th>IV</th><th>EV</th></tr></thead><tbody>' + rows +
      '<tr class="total"><td>' + l.total + '</td><td></td><td></td><td class="dim">' + sum(m.base) + '</td><td>' + sum(m.iv) + '</td><td class="dim">' + sum(m.ev) + '</td></tr></tbody></table></div>';

    // Attacken
    var moves = m.moves.length ? m.moves.map(function (mv, i) {
      var info = D.moveInfo[mv] || [0, 0, 0, 0, 1];
      var maxPP = info[1] + Math.floor(info[1] * m.ppUps[i] / 5);
      var extra = [];
      if (info[2] > 1) extra.push(l.power + ' ' + info[2]);
      if (info[3]) extra.push(l.acc + ' ' + info[3] + '%');
      return '<tr><td style="width:1%">' + typeBadge(info[0]) + '</td><td><span class="mname">' + esc(t.moves[mv]) + '</span> <span class="cat cat-' + info[4] + '">' + l.cat[info[4]] + '</span>' +
        (extra.length ? '<div class="muted" style="font-size:0.74rem;margin-top:2px">' + extra.join(' · ') + '</div>' : '') + '</td>' +
        '<td>' + m.pp[i] + '/' + maxPP + ' ' + l.ppUnit + '</td></tr>';
    }).join('') : '';
    var movesHtml = '<div class="d-section" style="grid-column:1/-1"><h4>' + l.moves + '</h4>' +
      (moves ? '<table class="move-table"><tbody>' + moves + '</tbody></table>' : '<p class="muted">' + l.noMoves + '</p>') + '</div>';

    // Herkunft
    var traded = m.tid !== trainer.tid || m.sid !== trainer.sid;
    var originRows = '';
    if (m.eggLocation) {
      originRows += '<dt>' + l.eggFrom + '</dt><dd>' + esc(locName(m.eggLocation)) + '</dd>' +
        '<dt>' + l.hatchedAt + '</dt><dd>' + esc(locName(m.metLocation)) + '</dd>' +
        '<dt>' + l.metDate + '</dt><dd>' + fmtDate(m.metDate) + '</dd>';
    } else {
      originRows += '<dt>' + l.metAt + '</dt><dd>' + esc(locName(m.metLocation)) + '</dd>' +
        '<dt>' + l.metLevel + '</dt><dd>' + (m.metLevel || '—') + '</dd>' +
        '<dt>' + l.metDate + '</dt><dd>' + fmtDate(m.metDate) + '</dd>';
    }
    var bi = ballItem(m.ball);
    originRows += '<dt>' + l.ball + '</dt><dd>' + itemImg(bi) + esc(t.items[bi]) + '</dd>' +
      '<dt>' + l.ot + '</dt><dd>' + esc(m.otName) + ' <span class="' + (m.otGender ? 'g-f' : 'g-m') + '">' + (m.otGender ? '♀' : '♂') + '</span> · ' + pad(m.tid, 5) + (traded ? ' <span class="tag">' + l.traded + '</span>' : '') + '</dd>' +
      '<dt>' + l.game + '</dt><dd>' + esc(VERSIONS[lang][m.version] || ('#' + m.version)) + '</dd>' +
      '<dt>' + l.language + '</dt><dd>' + (LANGS[m.language] || '—') + '</dd>' +
      (m.fateful ? '<dt>' + l.fateful + '</dt><dd>✓</dd>' : '');
    var origin = '<div class="d-section"><h4>' + l.origin + '</h4><dl class="kv">' + originRows + '</dl></div>';

    return head + '<div class="d-grid">' + general + stats + movesHtml + origin + '</div>';
  }

  function openModal(refStr) {
    var r = findMon(refStr);
    if (!r) return;
    lastModalRef = refStr;
    $('modal-card').innerHTML = '<button type="button" class="modal-close" data-act="close" aria-label="' + L().close + '">×</button>' + detailHtml(r.m, r.sv, +refStr.split(':')[0]);
    $('modal').hidden = false;
    document.body.style.overflow = 'hidden';
    $('modal-card').scrollTop = 0;
  }
  function closeModal() {
    lastModalRef = null;
    $('modal').hidden = true;
    document.body.style.overflow = '';
  }

  /* ── Sprache ───────────────────────────────────────────────────── */
  function applyLang() {
    document.documentElement.lang = lang;
    $('lang-toggle').textContent = lang.toUpperCase();
    var l = L();
    Array.prototype.forEach.call(document.querySelectorAll('[data-i18n]'), function (el) {
      var v = l[el.dataset.i18n];
      if (typeof v === 'string') el.innerHTML = v;
    });
  }

  /* ── Ereignisse ────────────────────────────────────────────────── */
  $('file-input').addEventListener('change', function (e) {
    var f = e.target.files && e.target.files[0];
    var slot = state.pendingSlot;
    state.pendingSlot = null;
    handleFile(f, slot);
  });
  $('drop').addEventListener('click', function () { pickFile(null); });

  ['dragenter', 'dragover'].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (!e.dataTransfer || Array.prototype.indexOf.call(e.dataTransfer.types || [], 'Files') < 0) return;
      e.preventDefault();
      $('drop').classList.add('is-over');
    });
  });
  ['dragleave', 'drop'].forEach(function (ev) {
    window.addEventListener(ev, function (e) {
      if (ev === 'dragleave' && e.relatedTarget) return;
      $('drop').classList.remove('is-over');
    });
  });
  window.addEventListener('drop', function (e) {
    if (!e.dataTransfer || !e.dataTransfer.files || !e.dataTransfer.files.length) return;
    e.preventDefault();
    var slot = state.saves.length >= MAX_SAVES && cur() ? cur().slot : null;
    handleFile(e.dataTransfer.files[0], slot);
  });

  $('lang-toggle').addEventListener('click', function () {
    lang = lang === 'de' ? 'en' : 'de';
    try { localStorage.setItem('hub-lang', lang); } catch (e) {}
    render();
    if (!$('modal').hidden) closeModal();
  });

  document.addEventListener('click', function (e) {
    var a = e.target.closest('[data-act]');
    if (a) {
      var act = a.dataset.act;
      if (act === 'activate') { state.active = +a.dataset.i; state.search = ''; render(); return; }
      if (act === 'remove') { removeSave(+a.dataset.i); return; }
      if (act === 'add') { pickFile(freeSlot()); return; }
      if (act === 'box') { cur().box = +a.dataset.i; renderPanel(); return; }
      if (act === 'dexmode') { state.dexMode = a.dataset.k; renderTabs(); renderPanel(); return; }
      if (act === 'close') { closeModal(); return; }
      if (act.charAt(0) === 'l' && linkAction(act, a.dataset)) return;
      return;
    }
    var t = e.target.closest('.tab');
    if (t) { state.tab = t.dataset.tab; renderTabs(); renderPanel(); return; }
    var mon = e.target.closest('[data-mon]');
    if (mon) { openModal(mon.dataset.mon); return; }
    if (e.target === $('modal')) closeModal();
  });

  document.addEventListener('change', function (e) {
    var s = e.target.closest('select[data-act="grave"]');
    if (!s) return;
    var sv = state.saves[+s.dataset.i];
    sv.grave = +s.value;
    try { localStorage.setItem(graveKey(sv.data), String(sv.grave)); } catch (err) {}
    renderTabs();
    renderPanel();
  });

  document.addEventListener('input', function (e) {
    if (e.target.id !== 'box-search') return;
    state.search = e.target.value;
    var pos = e.target.selectionStart;
    renderPanel();
    var inp = $('box-search');
    if (inp) { inp.focus(); try { inp.setSelectionRange(pos, pos); } catch (err) {} }
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && !$('modal').hidden) closeModal();
  });

  /* ── Start ─────────────────────────────────────────────────────── */
  applyLang();
  Store.all().then(function (recs) {
    (recs || []).sort(function (a, b) { return a.slot - b.slot; }).forEach(function (rec) {
      var sv = makeSave(rec);
      if (!sv.error) state.saves.push(sv);
    });
    render();
  });

  // Für Tests im Browser
  window.SaveViewer = { state: state, openModal: openModal };
})();

