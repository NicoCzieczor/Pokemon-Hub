/*
 * Live-Test – Versuchsseite: beobachtet eine Spielstand-Datei und zeigt, was sich beim Speichern im Spiel geändert hat.
 *
 * Ablauf: Datei wählen (mit Datei-Zugriff des Browsers) → alle POLL ms nachsehen, ob Änderungsdatum oder Größe
 * anders sind → neu lesen (HubSave.parse wie Save-Viewer und Save-Editor) → mit dem vorigen Abzug vergleichen
 * (live-diff.js) → Ereignisse ins Protokoll.
 *
 * Die Seite steht für sich: Sie liest nur (die Datei wird nie geschrieben), hat einen eigenen Speicher
 * (localStorage „livetest-v1“: letzter Abzug + Protokoll; IndexedDB „pokehub-livetest“: der Datei-Griff) und gibt
 * nichts an andere Seiten weiter.
 *
 * Dazu „Live“ (nur Windows-PC): Läuft das Hilfsprogramm bridge/PokeHub-Live.cmd, liest die Seite Team und Boxen
 * direkt aus dem Arbeitsspeicher des Emulators (live-mem.js) und legt sie über den Stand aus der Datei – Ereignisse
 * erscheinen dann sofort statt erst beim Speichern.
 *
 * Ohne Datei-Zugriff (Firefox, iPhone) gibt es kein Beobachten: Die Datei wird einmal eingelesen und kann nach dem
 * Speichern von Hand neu gewählt werden – verglichen wird dann mit dem gemerkten Abzug.
 */
(function () {
  'use strict';

  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
  var ICON = SPR + '/pokemon/versions/generation-vii/icons/';
  var STORE = 'livetest-v1', POLL = 2000, LOG_MAX = 300;
  var CAN_FILE = !!window.showOpenFilePicker;
  var CAN_DIR = !!(window.showDirectoryPicker && window.SaveFinder);
  // Adresse des Hilfsprogramms; für Tests über ?bridge=http://localhost:PORT änderbar (nur dieser Rechner)
  var BRIDGE = 'http://127.0.0.1:47815', LIVE_KEY = 'livetest-live', LIVE_POLL = 700;
  try {
    var bq = new URLSearchParams(location.search).get('bridge');
    if (bq && /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(bq)) BRIDGE = bq;
  } catch (e) { /* bleibt beim Standard */ }

  var I18N = {
    de: {
      title1: 'Live-', title2: 'Test', tag: 'Versuch',
      subtitle: 'Die Seite beobachtet deine Spielstand-Datei. Sobald du im Spiel speicherst, steht hier, was seit dem letzten Speichern passiert ist – gefangen, besiegt, Level, Entwicklung, Orden.',
      watchTitle: 'Spielstand beobachten', pick: 'Spielstand wählen', pickOther: 'Anderen Spielstand wählen', findBtn: 'Im Ordner suchen lassen',
      pickHint: 'Platin: .sav oder .dsv. Omega Rubin / Alpha Saphir: „main“ von Citra oder Azahar. Die Datei wird nur gelesen, nie geändert, und bleibt auf deinem Gerät. Du kannst sie auch hier hineinziehen.',
      check: 'Jetzt prüfen', reread: 'Erneut einlesen', pause: 'Anhalten', go: 'Weiter beobachten', allow: 'Zugriff erlauben',
      resume: function (n) { return 'Weiter beobachten: ' + n; },
      teamTitle: 'Team', logTitle: 'Ereignisse', clear: 'Protokoll leeren',
      logEmpty: 'Noch nichts. Wähle oben deinen Spielstand, spiele und speichere im Spiel – dann erscheint hier, was passiert ist.',
      aboutTitle: 'Was dieser Test kann – und was nicht',
      about1: 'Die Seite schaut alle zwei Sekunden nach, ob sich die Datei geändert hat. Der Emulator schreibt sie nur, wenn du <b>im Spiel speicherst</b> – dazwischen kann hier nichts erscheinen.',
      about2: '„Besiegt“ heißt beim Beobachten der Datei: Beim Speichern hatte das Pokémon im Team 0 KP. Wer vor dem Speichern heilt, hinterlässt keine Spur. Mit der Live-Verbindung (nur Windows-PC) erscheint es, sobald das Spiel die KP ins Team schreibt – je nach Spiel sofort oder nach dem Kampf.',
      about3: 'Beobachten geht in Chrome und Edge am PC und in Chrome auf Android (ab Version 132). In Firefox und auf dem iPhone kannst du die Datei nach dem Speichern nur von Hand neu einlesen.',
      about4: 'Am Handy ruht die Seite, solange der Emulator im Vordergrund ist. Sobald du zurückwechselst, prüft sie sofort und trägt alles nach.',
      about5: 'Der letzte Stand und das Protokoll bleiben in diesem Browser gespeichert. Die Seite ist ein Versuch und gibt nichts an Run-Dashboard, Solo, Duo oder Trio weiter.',
      noWatch: 'Dieser Browser kann eine Datei nicht beobachten. Du kannst den Spielstand trotzdem einlesen – nach dem Speichern im Spiel einfach erneut wählen, dann wird verglichen.',
      stWatch: function (n) { return 'Beobachte „' + n + '“'; },
      stPaused: function (n) { return 'Angehalten: „' + n + '“'; },
      stOnce: function (n) { return 'Eingelesen: „' + n + '“'; },
      stPerm: function (n) { return 'Der Browser braucht die Erlaubnis für „' + n + '“ erneut'; },
      stLast: 'Zuletzt gesehen (nicht beobachtet)',
      stEmpty: function (n) { return 'Beobachte „' + n + '“ – noch kein Spielstand darin'; },
      emptyHint: 'In der Datei steht (noch) kein Spielstand von Platin oder Omega Rubin / Alpha Saphir – etwa bei einem neuen Spiel vor dem ersten Speichern. Sobald du im Spiel speicherst, geht es los.',
      errEmpty: 'In der Datei steht noch kein Spielstand – etwa bei einem neuen Spiel, in dem noch nie gespeichert wurde.',
      trainer: 'Trainer', savedAt: function (t, ago) { return 'Datei geändert ' + t + ' (' + ago + ')'; },
      tech: function (t, c, r) { return 'Zuletzt geprüft ' + t + ' · ' + c + ' Prüfungen · ' + r + '-mal neu gelesen'; },
      writing: 'Die Datei wird gerade geschrieben – gleich noch einmal.',
      agoNow: 'gerade eben', agoS: function (n) { return 'vor ' + n + ' s'; }, agoM: function (n) { return 'vor ' + n + ' Min.'; },
      agoH: function (n) { return 'vor ' + n + ' Std.'; }, agoD: function (n) { return 'vor ' + n + (n === 1 ? ' Tag' : ' Tagen'); },
      sum: function (c, dex, time) { return 'Team ' + c.party + ' · Boxen ' + c.box + (c.daycare ? ' · Pension ' + c.daycare : '') + ' · Orden ' + c.badges + ' · Pokédex ' + dex + ' · Spielzeit ' + time; },
      egg: 'Ei', lv: 'Lv. ', hp: 'KP', down: 'Besiegt', teamEmpty: 'Kein Pokémon im Team.',
      team: 'Team', box: function (n) { return 'Box ' + (n + 1); }, daycare: 'Pension',
      late: 'nachgetragen', liveMark: 'live', out: 'nicht mehr im Team',
      liveTitle: 'Sofort – direkt aus dem Emulator', liveTag: 'nur Windows-PC',
      liveHint: 'Mit einem kleinen Hilfsprogramm liest die Seite Team und Boxen aus dem laufenden Emulator mit. Dann erscheinen Fänge, Level und besiegte Pokémon sofort – nicht erst beim Speichern.',
      live1: 'Hilfsprogramm starten: <a href="bridge/PokeHub-Live.cmd" download>PokeHub-Live.cmd</a> herunterladen und doppelklicken (im Projektordner liegt es unter <code>LiveTest\\bridge</code>). Das schwarze Fenster offen lassen. Fragt Windows nach: „Weitere Informationen“ → „Trotzdem ausführen“.',
      live2: 'Emulator starten und im Spiel den Spielstand laden (Azahar, Citra, melonDS, DeSmuME …).',
      live3: 'Oben die Spielstand-Datei wählen – an ihr erkennt die Seite dein Team im Speicher – und dann hier verbinden.',
      liveOn: 'Live verbinden', liveOff: 'Trennen', liveRescan: 'Neu suchen',
      lvOff: 'Nicht verbunden', lvNoHelper: 'Hilfsprogramm nicht erreichbar – läuft PokeHub-Live.cmd?',
      lvOrigin: function (o) { return 'Das Hilfsprogramm lehnt diese Seite ab. Starte es so: PokeHub-Live.cmd -Origin ' + o; },
      lvNoEmu: 'Hilfsprogramm läuft – noch kein Emulator offen',
      lvNoFile: function (e) { return 'Emulator gefunden (' + e + ') – wähle oben noch die Spielstand-Datei'; },
      lvSearch: function (e) { return 'Emulator gefunden (' + e + ') – suche dein Team im Speicher …'; },
      lvNotFound: function (e) { return 'Emulator gefunden (' + e + '), aber dein Team steht nicht im Speicher. Ist im Spiel dieser Spielstand geladen? Ich suche alle 10 Sekunden erneut.'; },
      lvLive: function (n) { return 'Live: Team (' + n + ') und Boxen werden mitgelesen'; },
      lvLiveNoBox: function (n) { return 'Live: Team (' + n + ') wird mitgelesen – Boxen nicht gefunden (Fänge in die Box erst beim Speichern)'; },
      lvLost: 'Team im Speicher verloren – suche neu …',
      lvScan: function (mb, ms) { return 'Zuletzt ' + mb + ' MB in ' + ms + ' ms durchsucht'; },
      tags: { start: 'Start', switch: 'Wechsel', rewind: 'Älterer Stand', badge: 'Orden', catch: 'Gefangen', gift: 'Erhalten', egg: 'Ei',
        hatch: 'Geschlüpft', evolve: 'Entwickelt', faint: 'Besiegt', heal: 'Wieder fit', level: 'Level', move: 'Verschoben', gone: 'Nicht mehr da' },
      evStart: function (g, n, s) { return 'Beobachtung beginnt: ' + g + ', Trainer ' + n + ' – ' + s; },
      evSwitch: function (g, n, s) { return 'Anderer Spielstand: ' + g + ', Trainer ' + n + ' – ' + s; },
      evRewind: function (a, b) { return 'Die Spielzeit ging zurück (' + a + ' → ' + b + '): Ein älterer Stand wurde geladen. Ab hier wird neu verglichen.'; },
      evBadge: function (n, city) { return n + '. Orden erhalten' + (city ? ' (' + city + ')' : ''); },
      evNew: function (m, loc, to) { return m + (loc ? ' – ' + loc : '') + ' → ' + to; },
      evGift: function (m, ot, to) { return m + (ot ? ' von ' + ot : '') + ' → ' + to; },
      evEgg: function (to) { return 'Ein Ei erhalten → ' + to; },
      evEvolve: function (from, m) { return from + ' → ' + m; },
      evFaint: function (m) { return m + ' hat 0 KP'; },
      evLevel: function (m, a, b) { return m + ': Lv. ' + a + ' → ' + b; },
      evMove: function (m, a, b) { return m + ': ' + a + ' → ' + b; },
      evGone: function (m) { return m + ' – freigelassen oder weggetauscht'; },
      errSize: function (kb) { return 'Das ist kein Spielstand von Platin oder Omega Rubin / Alpha Saphir (' + kb + ' KB).'; },
      errGame: function (g) { return 'Das ist ein Spielstand von ' + g + ' – der Test liest bisher nur Platin und Omega Rubin / Alpha Saphir.'; },
      errUnknown: 'Diese Datei ist kein lesbarer Spielstand von Platin oder Omega Rubin / Alpha Saphir.',
      errGone: function (n) { return '„' + n + '“ ist nicht mehr da (verschoben oder gelöscht) – bitte neu wählen.'; },
      errRead: 'Die Datei konnte nicht gelesen werden: ',
      findBusy: function (n) { return 'Suche nach Spielständen … (' + n + ' Ordner)'; },
      findNone: 'In diesem Ordner liegt kein Spielstand von Platin oder Omega Rubin / Alpha Saphir.',
      findStopped: 'Der Ordner ist sehr groß – die Suche hat aufgehört, bevor sie fertig war. Wähle einen Ordner weiter innen.',
      findBlocked: 'Diesen Ordner gibt der Browser nicht frei (Systemordner). Wähle einen Ordner darin oder die Datei direkt.',
      findPick: 'Mehrere Spielstände gefunden – welchen beobachten?',
      badges: function (n) { return n + ' Orden'; }
    },
    en: {
      title1: 'Live ', title2: 'Test', tag: 'Experiment',
      subtitle: 'This page watches your save file. As soon as you save in the game, it shows what happened since the last save – caught, fainted, levels, evolutions, badges.',
      watchTitle: 'Watch a save file', pick: 'Choose save file', pickOther: 'Choose another save file', findBtn: 'Search a folder',
      pickHint: 'Platinum: .sav or .dsv. Omega Ruby / Alpha Sapphire: “main” from Citra or Azahar. The file is only read, never changed, and stays on your device. You can also drop it here.',
      check: 'Check now', reread: 'Read again', pause: 'Pause', go: 'Keep watching', allow: 'Allow access',
      resume: function (n) { return 'Keep watching: ' + n; },
      teamTitle: 'Team', logTitle: 'Events', clear: 'Clear log',
      logEmpty: 'Nothing yet. Choose your save file above, play and save in the game – then this shows what happened.',
      aboutTitle: 'What this test can do – and what it cannot',
      about1: 'The page checks every two seconds whether the file has changed. The emulator only writes it when you <b>save in the game</b> – nothing can show up in between.',
      about2: 'When watching the file, “fainted” means: the Pokémon in your team had 0 HP when you saved. Healing before saving leaves no trace. With the live connection (Windows PC only) it shows up as soon as the game writes the HP to the team – at once or after the battle, depending on the game.',
      about3: 'Watching works in Chrome and Edge on a PC and in Chrome on Android (version 132 or later). In Firefox and on an iPhone you can only read the file again by hand after saving.',
      about4: 'On a phone the page sleeps while the emulator is in front. As soon as you switch back, it checks at once and adds what it missed.',
      about5: 'The last state and the log stay in this browser. The page is an experiment and passes nothing on to Run Dashboard, Solo, Duo or Trio.',
      noWatch: 'This browser cannot watch a file. You can still read the save – after saving in the game, simply choose it again and it gets compared.',
      stWatch: function (n) { return 'Watching “' + n + '”'; },
      stPaused: function (n) { return 'Paused: “' + n + '”'; },
      stOnce: function (n) { return 'Read: “' + n + '”'; },
      stPerm: function (n) { return 'The browser needs permission for “' + n + '” again'; },
      stLast: 'Last seen (not watching)',
      stEmpty: function (n) { return 'Watching “' + n + '” – no save in it yet'; },
      emptyHint: 'The file holds no Platinum or Omega Ruby / Alpha Sapphire save (yet) – for example a new game before its first save. It starts as soon as you save in the game.',
      errEmpty: 'The file holds no save yet – for example a new game that has never been saved.',
      trainer: 'Trainer', savedAt: function (t, ago) { return 'file changed ' + t + ' (' + ago + ')'; },
      tech: function (t, c, r) { return 'Last checked ' + t + ' · ' + c + ' checks · read ' + r + ' times'; },
      writing: 'The file is being written right now – trying again in a moment.',
      agoNow: 'just now', agoS: function (n) { return n + ' s ago'; }, agoM: function (n) { return n + ' min ago'; },
      agoH: function (n) { return n + ' h ago'; }, agoD: function (n) { return n + (n === 1 ? ' day ago' : ' days ago'); },
      sum: function (c, dex, time) { return 'Team ' + c.party + ' · Boxes ' + c.box + (c.daycare ? ' · Day Care ' + c.daycare : '') + ' · Badges ' + c.badges + ' · Pokédex ' + dex + ' · Play time ' + time; },
      egg: 'Egg', lv: 'Lv. ', hp: 'HP', down: 'Fainted', teamEmpty: 'No Pokémon in the team.',
      team: 'Team', box: function (n) { return 'Box ' + (n + 1); }, daycare: 'Day Care',
      late: 'added later', liveMark: 'live', out: 'no longer in the team',
      liveTitle: 'Instant – straight from the emulator', liveTag: 'Windows PC only',
      liveHint: 'With a small helper program the page reads team and boxes from the running emulator. Catches, levels and fainted Pokémon then show up at once – not only when you save.',
      live1: 'Start the helper: download <a href="bridge/PokeHub-Live.cmd" download>PokeHub-Live.cmd</a> and double-click it (in the project folder it is under <code>LiveTest\\bridge</code>). Leave the black window open. If Windows asks: “More info” → “Run anyway”.',
      live2: 'Start the emulator and load your save in the game (Azahar, Citra, melonDS, DeSmuME …).',
      live3: 'Choose the save file above – the page uses it to recognise your team in memory – then connect here.',
      liveOn: 'Connect live', liveOff: 'Disconnect', liveRescan: 'Search again',
      lvOff: 'Not connected', lvNoHelper: 'Helper not reachable – is PokeHub-Live.cmd running?',
      lvOrigin: function (o) { return 'The helper rejects this page. Start it like this: PokeHub-Live.cmd -Origin ' + o; },
      lvNoEmu: 'Helper is running – no emulator open yet',
      lvNoFile: function (e) { return 'Emulator found (' + e + ') – please choose the save file above'; },
      lvSearch: function (e) { return 'Emulator found (' + e + ') – searching for your team in memory …'; },
      lvNotFound: function (e) { return 'Emulator found (' + e + '), but your team is not in its memory. Is this save loaded in the game? Trying again every 10 seconds.'; },
      lvLive: function (n) { return 'Live: reading team (' + n + ') and boxes'; },
      lvLiveNoBox: function (n) { return 'Live: reading team (' + n + ') – boxes not found (catches sent to a box show up when you save)'; },
      lvLost: 'Lost the team in memory – searching again …',
      lvScan: function (mb, ms) { return 'Last search: ' + mb + ' MB in ' + ms + ' ms'; },
      tags: { start: 'Start', switch: 'Switch', rewind: 'Older save', badge: 'Badge', catch: 'Caught', gift: 'Received', egg: 'Egg',
        hatch: 'Hatched', evolve: 'Evolved', faint: 'Fainted', heal: 'Back up', level: 'Level', move: 'Moved', gone: 'Gone' },
      evStart: function (g, n, s) { return 'Watching starts: ' + g + ', Trainer ' + n + ' – ' + s; },
      evSwitch: function (g, n, s) { return 'Different save: ' + g + ', Trainer ' + n + ' – ' + s; },
      evRewind: function (a, b) { return 'Play time went backwards (' + a + ' → ' + b + '): an older save was loaded. Comparing starts over from here.'; },
      evBadge: function (n, city) { return 'Badge ' + n + ' obtained' + (city ? ' (' + city + ')' : ''); },
      evNew: function (m, loc, to) { return m + (loc ? ' – ' + loc : '') + ' → ' + to; },
      evGift: function (m, ot, to) { return m + (ot ? ' from ' + ot : '') + ' → ' + to; },
      evEgg: function (to) { return 'Received an Egg → ' + to; },
      evEvolve: function (from, m) { return from + ' → ' + m; },
      evFaint: function (m) { return m + ' has 0 HP'; },
      evLevel: function (m, a, b) { return m + ': Lv. ' + a + ' → ' + b; },
      evMove: function (m, a, b) { return m + ': ' + a + ' → ' + b; },
      evGone: function (m) { return m + ' – released or traded away'; },
      errSize: function (kb) { return 'This is not a Platinum or Omega Ruby / Alpha Sapphire save (' + kb + ' KB).'; },
      errGame: function (g) { return 'This is a save of ' + g + ' – the test only reads Platinum and Omega Ruby / Alpha Sapphire so far.'; },
      errUnknown: 'This file is not a readable Platinum or Omega Ruby / Alpha Sapphire save.',
      errGone: function (n) { return '“' + n + '” is gone (moved or deleted) – please choose it again.'; },
      errRead: 'The file could not be read: ',
      findBusy: function (n) { return 'Searching for save files … (' + n + ' folders)'; },
      findNone: 'There is no Platinum or Omega Ruby / Alpha Sapphire save in this folder.',
      findStopped: 'The folder is very large – the search stopped before it finished. Choose a folder further inside.',
      findBlocked: 'The browser does not open this folder (system folder). Choose a folder inside it or the file itself.',
      findPick: 'Several save files found – which one to watch?',
      badges: function (n) { return n + (n === 1 ? ' badge' : ' badges'); }
    }
  };

  var lang = 'de';
  try { lang = localStorage.getItem('hub-lang') === 'en' ? 'en' : 'de'; } catch (e) {}
  function L() { return I18N[lang]; }
  function $(id) { return document.getElementById(id); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  /* ── Zustand ───────────────────────────────────────────────────── */
  var state = {
    src: null,            // { handle (oder null), name }
    watching: false, needPerm: false,
    snap: null,           // letzter Abzug (auch aus dem letzten Besuch)
    data: null,           // zuletzt gelesener Spielstand (HubSave.parse) – Grundlage für die Live-Verbindung
    log: [],              // neueste zuerst
    error: '', writing: false,
    empty: false,         // Datei hat die richtige Größe, aber (noch) keinen Spielstand – neues Spiel vor dem ersten Speichern
    lastCheck: 0, fileTime: 0, checks: 0, reads: 0,
    find: null,           // { busy, n } | { list } | { msg }
    stored: null          // Datei-Griff vom letzten Besuch { handle, name }
  };
  var sig = null;         // { m, s } Änderungsdatum und Größe der zuletzt gelesenen Fassung
  var waitSig = null;     // dasselbe für eine Fassung ohne Spielstand (state.empty)
  var fails = 0;          // so oft hintereinander nicht lesbar
  var busy = false, timer = null, recheckAt = 0;
  var fresh = true;       // noch nichts gelesen, seit die Seite offen ist
  var flashT = 0;         // Zeit des letzten Schubs neuer Einträge (leuchten kurz auf)
  var full = false;       // nach der Runde die ganze Seite neu zeichnen (Fehler, Datei weg)

  try {
    var saved = JSON.parse(localStorage.getItem(STORE) || 'null');
    if (saved && saved.snap && saved.snap.mons) { state.snap = saved.snap; state.log = Array.isArray(saved.log) ? saved.log : []; }
  } catch (e) { /* kaputt: von vorn */ }
  function persist() {
    try { localStorage.setItem(STORE, JSON.stringify({ snap: state.snap, log: state.log })); } catch (e) { /* voll: egal */ }
  }

  /* ── Datei-Griff merken (IndexedDB – nur dort lässt er sich ablegen) ── */
  var Db = (function () {
    var dbp = null;
    function db() {
      if (!dbp) {
        dbp = new Promise(function (res, rej) {
          if (!window.indexedDB) { rej(new Error('no idb')); return; }
          var r = indexedDB.open('pokehub-livetest', 1);
          r.onupgradeneeded = function () { r.result.createObjectStore('kv'); };
          r.onsuccess = function () { res(r.result); };
          r.onerror = function () { rej(r.error); };
        });
      }
      return dbp;
    }
    function run(mode, fn) {
      return db().then(function (d) {
        return new Promise(function (res, rej) {
          var t = d.transaction('kv', mode), req = fn(t.objectStore('kv'));
          t.oncomplete = function () { res(req && req.result); };
          t.onerror = t.onabort = function () { rej(t.error); };
        });
      }).catch(function () { return null; });
    }
    return {
      get: function () { return run('readonly', function (s) { return s.get('file'); }); },
      set: function (v) { return run('readwrite', function (s) { s.put(v, 'file'); }); },
      clear: function () { return run('readwrite', function (s) { s.delete('file'); }); }
    };
  })();

  /* ── Namen ─────────────────────────────────────────────────────── */
  function gameOf(kind) { return HubSave.get(kind === 'oras' ? 'oras' : 'pt'); }
  function gameName(kind, game) {
    if (kind !== 'oras') return gameOf(kind).name[lang];
    return game === 'as' ? (lang === 'de' ? 'Alpha Saphir' : 'Alpha Sapphire') : (lang === 'de' ? 'Omega Rubin' : 'Omega Ruby');
  }
  function speciesName(kind, id) { return gameOf(kind).D.text[lang].species[id] || '#' + id; }
  function monName(kind, m) {
    if (m.egg) return L().egg;
    var sp = speciesName(kind, m.species);
    return m.nick && m.nick !== sp ? m.nick + ' (' + sp + ')' : sp;
  }
  function monLv(kind, m) { return monName(kind, m) + (m.egg ? '' : ' (' + L().lv + m.level + ')'); }
  function areaName(area, box) { return area === 'party' ? L().team : area === 'daycare' ? L().daycare : area === 'out' ? L().out : L().box(box); }
  function placeName(m) { return areaName(m.area, m.box); }
  function icon(m) { return '<img src="' + ICON + (m.egg ? 'egg' : m.species) + '.png" alt="" loading="lazy">'; }
  function clock(sec) { var h = Math.floor(sec / 3600), m = Math.floor(sec / 60) % 60; return h + ':' + (m < 10 ? '0' : '') + m; }
  function locale() { return lang === 'de' ? 'de-DE' : 'en-US'; }
  function timeOf(t) { return new Date(t).toLocaleTimeString(locale()); }
  function stamp(t) {
    var d = new Date(t), today = new Date().toDateString() === d.toDateString();
    return today ? d.toLocaleTimeString(locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' })
      : d.toLocaleString(locale(), { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });
  }
  function ago(t) {
    var l = L(), s = Math.max(0, Math.round((Date.now() - t) / 1000));
    if (s < 5) return l.agoNow;
    if (s < 90) return l.agoS(s);
    if (s < 5400) return l.agoM(Math.round(s / 60));
    if (s < 129600) return l.agoH(Math.round(s / 3600));
    return l.agoD(Math.round(s / 86400));
  }
  function summary(snap) { return L().sum(LiveDiff.counts(snap), snap.dex, clock(snap.time)); }

  /* ── Gelesenen Spielstand übernehmen ───────────────────────────── */
  // fromLive: Aufruf aus der Live-Verbindung (gleicher Spielstand, neuer Stand im Arbeitsspeicher). Solange live
  // mitgelesen wird, liegt dieser Stand immer über dem aus der Datei – sonst nähme ein erneutes Lesen der (älteren)
  // Datei gerade Gemeldetes wieder zurück.
  function apply(data, fromLive) {
    if (!fromLive) liveNewData(data);
    state.data = data;
    var snap = LiveDiff.snapshot(data, live.result), prev = state.snap, now = Date.now(), add = [];
    var c = LiveDiff.counts(snap);
    var head = { kind: snap.kind, game: snap.game, name: snap.name, c: c, dex: snap.dex, time: snap.time };
    if (!prev) add.push(Object.assign({ type: 'start' }, head));
    else {
      LiveDiff.diff(prev, snap).forEach(function (e) {
        if (e.type === 'switch') e = Object.assign({ type: 'switch' }, head);
        // beim ersten Lesen nach dem Öffnen: Unterschied zum gemerkten Stand vom letzten Besuch
        if (fromLive) e.live = true;
        else if (fresh && e.type !== 'switch') e.late = true;
        e.kind = snap.kind;
        add.push(e);
      });
    }
    if (!fromLive) fresh = false;
    add.forEach(function (e) { e.t = now; });
    state.snap = snap;
    if (add.length) {
      state.log = add.concat(state.log).slice(0, LOG_MAX);
      flashT = now;
    }
    persist();
    renderTeam();
    if (add.length) renderLog();
  }

  /* ── Beobachten ────────────────────────────────────────────────── */
  function parseError(data, bytes) {
    var l = L();
    return data.error === 'size' ? l.errSize(Math.round(bytes.length / 1024)) : data.error === 'game' ? l.errGame(data.game) : l.errUnknown;
  }

  // Richtige Größe für Omega Rubin / Alpha Saphir oder ein DS-Spiel, aber kein Spielstand darin: Ein neues Spiel legt
  // die Datei an, bevor zum ersten Mal gespeichert wurde. Nicht bei einem erkannten anderen Spiel (data.error 'game').
  function maybeEmpty(data, bytes) {
    if (data.ok || data.error === 'game') return data.ok;      // ok, aber Prüfsumme falsch: kann noch werden
    return (!!window.OrasSave && bytes.length === OrasSave.SIZE) || (bytes.length >= 0x80000 && bytes.length <= 0x80000 + 0xA4);
  }

  // Spielstand lesen; dazu die weiteren Team-Fassungen aus der Datei, die die Live-Verbindung nicht für „live“ halten darf
  function parseSave(bytes) {
    var data = HubSave.parse(bytes);
    if (data.ok) data.staleParties = LiveMem.fileParties(HubSave.get(data.kind), bytes);
    return data;
  }

  // force: auch lesen, wenn Datum und Größe gleich sind („Jetzt prüfen“)
  function tick(force) {
    var src = state.src;
    if (!src || !src.handle || busy) return Promise.resolve();
    busy = true;
    return src.handle.getFile().then(function (f) {
      if (state.src !== src) return;
      state.lastCheck = Date.now();
      state.checks++;
      var ref = state.empty ? waitSig : sig;
      var changed = !ref || f.lastModified !== ref.m || f.size !== ref.s;
      var again = recheckAt && Date.now() >= recheckAt;
      if (!changed && !force && !again) return;
      if (again) recheckAt = 0;
      return f.arrayBuffer().then(function (buf) {
        if (state.src !== src) return;
        var bytes = new Uint8Array(buf), data = parseSave(bytes);
        state.reads++;
        if (!data.ok || !data.checksums.general) {
          // Schon einmal gelesen: Der Emulator schreibt wohl gerade – die nächsten Runden lesen noch einmal
          if (sig && !state.empty && ++fails < 3) { state.writing = true; return; }
          state.writing = false;
          if (maybeEmpty(data, bytes)) { state.empty = true; waitSig = { m: f.lastModified, s: f.size }; state.fileTime = f.lastModified; return; }
          state.error = data.ok ? L().errUnknown : parseError(data, bytes);
          stop(true);
          Db.clear();
          full = true;
          return;
        }
        state.writing = false;
        state.empty = false;
        fails = 0;
        waitSig = null;
        state.error = '';
        sig = { m: f.lastModified, s: f.size };
        state.fileTime = f.lastModified;
        // Kurz nach einer Änderung einmal nachlesen, falls mitten im Schreiben gelesen wurde
        if (changed) recheckAt = Date.now() + 1500;
        apply(data);
      });
    }).catch(function (err) {
      if (state.src !== src) return;
      var n = err && err.name;
      if (n === 'NotFoundError') { state.error = L().errGone(src.name); stop(true); Db.clear(); state.stored = null; full = true; }
      else if (n === 'NotAllowedError' || n === 'SecurityError') { state.watching = false; state.needPerm = true; }
      // sonst (NotReadableError …): Datei gerade gesperrt oder geändert – nächste Runde
    }).then(function () {
      busy = false;
      if (full) { full = false; render(); } else renderStatus();
    });
  }

  function loop() {
    if (timer) return;
    // Auch verdeckt weiterprüfen (der Emulator liegt beim Spielen über dem Browser) – der Browser bremst das dann selbst
    timer = setInterval(function () { if (state.watching) tick(false); else renderStatus(); }, POLL);
  }
  function stop(forget) {
    state.watching = false;
    state.needPerm = false;
    if (forget) { state.src = null; sig = null; waitSig = null; state.empty = false; }
  }

  // Mit Datei-Griff: beobachten
  function start(handle) {
    state.src = { handle: handle, name: handle.name };
    state.watching = true;
    state.needPerm = false;
    state.error = '';
    state.find = null;
    state.stored = null;
    sig = null; waitSig = null; fails = 0; recheckAt = 0; state.checks = 0; state.reads = 0; state.writing = false; state.empty = false;
    Db.set({ handle: handle, name: handle.name });
    loop();
    render();
    return tick(true);
  }
  // Ohne Datei-Griff: einmal einlesen
  function readOnce(file) {
    state.error = '';
    state.find = null;
    return file.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf), data = parseSave(bytes);
      if (!data.ok || !data.checksums.general) { state.error = maybeEmpty(data, bytes) ? L().errEmpty : parseError(data, bytes); return; }
      state.src = { handle: null, name: file.name };
      state.watching = false;
      state.fileTime = file.lastModified || 0;
      state.lastCheck = Date.now();
      state.checks++; state.reads++;
      apply(data);
    }).catch(function (err) { state.error = L().errRead + (err && err.message); }).then(render);
  }

  function permit(handle) {
    var opts = { mode: 'read' };
    return Promise.resolve(handle.queryPermission ? handle.queryPermission(opts) : 'granted').then(function (p) {
      return p === 'granted' || !handle.requestPermission ? p : handle.requestPermission(opts);
    });
  }

  function pick() {
    if (!CAN_FILE) { $('file-input').click(); return; }
    // Ohne Dateityp-Filter: „main“ von Citra/Azahar hat keine Endung
    window.showOpenFilePicker({ id: 'pokehub-live', multiple: false }).then(function (h) { return start(h[0]); }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      $('file-input').click();                       // z. B. in einem eingebetteten Fenster nicht erlaubt
    });
  }

  function findInFolder() {
    if (!CAN_DIR || (state.find && state.find.busy)) return;
    window.showDirectoryPicker({ id: 'pokehub-live-dir', mode: 'read' }).then(function (dir) {
      state.error = '';
      state.find = { busy: true, n: 0 };
      render();
      var shown = 0;
      return SaveFinder.find(dir, {
        check: function (bytes) {
          var d = HubSave.parse(bytes);
          return d.ok && d.checksums.general ? { kind: d.kind, game: d.game, trainer: d.trainer.name, badges: d.trainer.badgeCount } : null;
        },
        onProgress: function (n) {
          var now = Date.now();
          if (now - shown < 150) return;
          shown = now;
          state.find = { busy: true, n: n };
          $('found').textContent = L().findBusy(n);
        }
      }).then(function (res) {
        if (res.list.length === 1) return start(res.list[0].handle);
        state.find = res.list.length ? { list: res.list } : { msg: res.stopped ? 'findStopped' : 'findNone' };
        render();
      });
    }).catch(function (err) {
      if (err && err.name === 'AbortError') { if (state.find && state.find.busy) { state.find = null; render(); } return; }
      state.find = { msg: err && err.name === 'SecurityError' ? 'findBlocked' : 'findNone' };
      render();
    });
  }

  /* ── Live: Arbeitsspeicher des Emulators über das Hilfsprogramm ── */
  var live = {
    on: false,            // vom Nutzer eingeschaltet
    up: false,            // Hilfsprogramm antwortet
    err: '',              // 'origin': Hilfsprogramm lehnt diese Seite ab
    emu: null,            // { name, pid, title }
    tracker: null, result: null,   // LiveMem-Sucher und sein letzter sicherer Stand { party, boxes }
    busy: false, timer: null, n: 0, lastTry: 0
  };
  try { live.on = localStorage.getItem(LIVE_KEY) === '1'; } catch (e) {}

  function bfetch(path, ms) {
    var ctl = new AbortController(), t = setTimeout(function () { ctl.abort(); }, ms);
    return fetch(BRIDGE + path, { signal: ctl.signal, cache: 'no-store' }).then(function (r) {
      clearTimeout(t);
      if (r.status === 403) { var e = new Error('origin'); e.origin = true; throw e; }
      if (!r.ok) throw new Error('http ' + r.status);
      return r;
    }, function (e) { clearTimeout(t); throw e; });
  }
  var bridge = {
    status: function () { return bfetch('/status', 3000).then(function (r) { return r.json(); }); },
    // lo/hi (optional): nur in diesem Adressbereich suchen
    scan: function (hexes, lo, hi) {
      return bfetch('/scan?p=' + hexes.join(',') + (lo && hi ? '&lo=' + lo.toString(16) + '&hi=' + hi.toString(16) : ''), 40000).then(function (r) { return r.json(); });
    },
    // → je Adresse die gelesenen Bytes oder null (nicht lesbar)
    read: function (addrs, n) {
      return bfetch('/read?a=' + addrs.map(function (a) { return a.toString(16); }).join(',') + '&n=' + n, 8000).then(function (r) {
        var ok = r.headers.get('X-Read-Ok') || '';
        return r.arrayBuffer().then(function (buf) {
          var all = new Uint8Array(buf);
          return addrs.map(function (a, i) { return ok.charAt(i) === '1' && (i + 1) * n <= all.length ? all.subarray(i * n, (i + 1) * n) : null; });
        });
      });
    }
  };

  function liveDrop() { live.tracker = null; live.result = null; }
  // Neuer Stand aus der Datei: gleicher Spielstand → der Sucher bekommt die neuen Kennungen, sonst von vorn
  function liveNewData(data) {
    var old = state.data;
    if (!live.tracker) return;
    if (old && old.kind === data.kind && old.trainer.tid === data.trainer.tid && old.trainer.sid === data.trainer.sid && old.trainer.name === data.trainer.name) live.tracker.setData(data);
    else liveDrop();
  }
  function liveTick() {
    if (!live.on || live.busy) return;
    // Hilfsprogramm nicht da: nur alle 3 s anklopfen
    if (!live.up && Date.now() - live.lastTry < 3000) return;
    live.busy = true;
    live.lastTry = Date.now();
    var first = !live.up || !live.emu || ++live.n % 6 === 0
      ? bridge.status().then(function (st) {
        if (!st || st.app !== 'pokehub-live') throw new Error('fremd');
        live.up = true; live.err = '';
        if (!st.emu || (live.emu && live.emu.pid !== st.emu.pid)) liveDrop();
        live.emu = st.emu;
      }) : Promise.resolve();
    first.then(function () {
      var data = state.data;
      if (!live.emu || !data) return;
      if (!live.tracker) live.tracker = LiveMem.tracker({ kind: data.kind, data: data, readMon: LiveMem.reader(HubSave.get(data.kind)), bridge: bridge });
      var tr = live.tracker;
      return tr.poll().then(function (r) {
        if (live.tracker !== tr || state.data !== data) return;          // inzwischen anderer Spielstand
        if (r) {
          var isNew = r.fresh || !live.result;
          live.result = { party: r.party, boxes: r.boxes };
          if (isNew) apply(data, true);
        } else if (tr.info.state !== 'live') live.result = null;
      });
    }).catch(function (err) {
      live.up = false; live.emu = null; live.err = err && err.origin ? 'origin' : '';
      liveDrop();
    }).then(function () { live.busy = false; renderLive(); });
  }
  function liveSet(on) {
    live.on = on;
    try { localStorage.setItem(LIVE_KEY, on ? '1' : '0'); } catch (e) {}
    if (!on) { live.up = false; live.emu = null; live.err = ''; liveDrop(); }
    else { live.lastTry = 0; liveTick(); }
    renderLive();
  }
  function renderLive() {
    var l = L(), info = live.tracker && live.tracker.info, emu = live.emu && live.emu.name, title, meta = '', cls = '';
    if (!live.on) title = l.lvOff;
    else if (live.err === 'origin') { title = l.lvOrigin(location.origin); cls = ' is-warn'; }
    else if (!live.up) { title = l.lvNoHelper; cls = ' is-warn'; }
    else if (!live.emu) { title = l.lvNoEmu; cls = ' is-warn'; }
    else if (!state.data) { title = l.lvNoFile(emu); cls = ' is-warn'; }
    else if (live.result) { title = (live.result.boxes ? l.lvLive : l.lvLiveNoBox)(live.result.party.length); cls = ' is-on'; }
    else if (info && info.state === 'lost') { title = l.lvLost; cls = ' is-warn'; }
    else if (info && info.scanMb && !info.party) { title = l.lvNotFound(emu); cls = ' is-warn'; }
    else { title = l.lvSearch(emu); cls = ' is-warn'; }
    if (live.on && live.emu && info && info.scanMb) meta = l.lvScan(info.scanMb, info.scanMs);
    $('live-dot').className = 'lv-dot' + cls;
    $('live-title').textContent = title;
    $('live-meta').textContent = meta;
    $('live-toggle').textContent = live.on ? l.liveOff : l.liveOn;
    $('live-toggle').classList.toggle('lv-main-btn', !live.on);
    $('live-rescan').hidden = !(live.on && live.tracker);
    $('team-live').hidden = !live.result;
  }

  /* ── Anzeige ───────────────────────────────────────────────────── */
  function renderStatus() {
    var l = L(), src = state.src, snap = state.snap, box = $('status');
    var show = !!src || !!snap;
    box.hidden = !show;
    if (!show) return;
    var live = !!(src && src.handle);
    $('dot').className = 'lv-dot' + (state.needPerm || (state.empty && state.watching) ? ' is-warn' : state.watching ? ' is-on' : '');
    $('status-title').textContent = !src ? l.stLast : state.needPerm ? l.stPerm(src.name) : state.empty ? l.stEmpty(src.name) : state.watching ? l.stWatch(src.name)
      : live ? l.stPaused(src.name) : l.stOnce(src.name);
    var meta = [];
    if (state.empty) meta.push(l.emptyHint);
    else if (snap) meta.push(gameName(snap.kind, snap.game), l.trainer + ' ' + snap.name);
    if (src && state.fileTime) meta.push(l.savedAt(timeOf(state.fileTime), ago(state.fileTime)));
    $('status-meta').textContent = meta.join(' · ');
    $('status-tech').textContent = state.writing ? l.writing : src && state.lastCheck ? l.tech(timeOf(state.lastCheck), state.checks, state.reads) : '';
    $('check').hidden = !src;
    $('check').textContent = live ? l.check : l.reread;
    $('pause').hidden = !live;
    $('pause').textContent = state.needPerm ? l.allow : state.watching ? l.pause : l.go;
  }

  function renderTeam() {
    var l = L(), snap = state.snap, card = $('team-card');
    card.hidden = !snap;
    if (!snap) return;
    $('summary').textContent = summary(snap);
    var team = Object.keys(snap.mons).map(function (id) { return snap.mons[id]; })
      .filter(function (m) { return m.area === 'party'; }).sort(function (a, b) { return a.slot - b.slot; });
    $('team').innerHTML = team.length ? team.map(function (m) {
      var pct = m.maxHp ? Math.max(0, Math.min(100, Math.round(m.hp * 100 / m.maxHp))) : 0;
      var down = !m.egg && m.hp === 0;
      return '<div class="lv-mon' + (down ? ' is-down' : '') + '">' + icon(m) +
        '<div class="lv-mon-main"><b>' + esc(monName(snap.kind, m)) + '</b>' +
        (m.egg ? '' : '<span>' + esc(l.lv + m.level) + ' · ' + (down ? '<i>' + esc(l.down) + '</i>' : esc(l.hp + ' ' + m.hp + '/' + m.maxHp)) + '</span>' +
          '<span class="lv-hp' + (pct <= 20 ? ' is-low' : pct <= 50 ? ' is-mid' : '') + '"><span style="width:' + pct + '%"></span></span>') +
        '</div></div>';
    }).join('') : '<p class="lv-hint">' + esc(l.teamEmpty) + '</p>';
  }

  function eventText(e) {
    var l = L(), k = e.kind || 'pt', m = e.mon;
    switch (e.type) {
      case 'start': case 'switch':
        return (e.type === 'start' ? l.evStart : l.evSwitch)(gameName(e.kind, e.game), e.name, l.sum(e.c, e.dex, clock(e.time)));
      case 'rewind': return l.evRewind(clock(e.from), clock(e.to));
      case 'badge':
        var g = gameOf(k), n = 0, city = 0;
        g.badges.forEach(function (b, i) { if (b.bit === e.bit) { n = i + 1; city = b.city; } });
        return l.evBadge(n || e.bit + 1, city ? HubSave.locName(g.D, lang, city) : '');
      case 'catch': return l.evNew(monLv(k, m), HubSave.locName(gameOf(k).D, lang, m.met), placeName(m));
      case 'gift': return l.evGift(monLv(k, m), m.ot, placeName(m));
      case 'egg': return l.evEgg(placeName(m));
      case 'hatch': return l.evNew(monLv(k, m), '', placeName(m));
      case 'evolve': return l.evEvolve(speciesName(k, e.from), monLv(k, m));
      case 'faint': return l.evFaint(monLv(k, m));
      case 'heal': return monLv(k, m);
      case 'level': return l.evLevel(monName(k, m), e.from, m.level);
      case 'move': return l.evMove(monName(k, m), areaName(e.from, e.fromBox), placeName(m));
      case 'gone': return l.evGone(monLv(k, m));
    }
    return '';
  }

  function renderLog() {
    var l = L(), log = state.log;
    $('log-empty').hidden = log.length > 0;
    $('clear').hidden = !log.length;
    $('log').innerHTML = log.map(function (e) {
      return '<li class="lv-ev lv-ev--' + e.type + (e.t === flashT && Date.now() - flashT < 3000 ? ' is-new' : '') + '">' +
        '<time>' + esc(stamp(e.t)) + '</time>' +
        '<span class="lv-ev-icon">' + (e.mon ? icon(e.mon) : '') + '</span>' +
        '<span class="lv-ev-text"><b class="lv-ev-tag">' + esc(l.tags[e.type] || e.type) + '</b> ' + esc(eventText(e)) +
        (e.late ? ' <small>' + esc(l.late) + '</small>' : e.live ? ' <small class="lv-live">' + esc(l.liveMark) + '</small>' : '') + '</span></li>';
    }).join('');
  }

  function renderFind() {
    var l = L(), f = state.find, el = $('found');
    el.hidden = !f;
    if (!f) return;
    if (f.busy) { el.textContent = l.findBusy(f.n); return; }
    if (f.msg) { el.innerHTML = '<p class="msg msg-warn">' + esc(l[f.msg]) + '</p>'; return; }
    el.innerHTML = '<p class="found-title">' + esc(l.findPick) + '</p>' + f.list.map(function (it, i) {
      return '<button type="button" class="found-item" data-found="' + i + '"><b>' + esc(gameName(it.info.kind, it.info.game)) + ' · ' + esc(it.info.trainer) + '</b>' +
        '<span>' + esc(l.badges(it.info.badges)) + (it.modified ? ' · ' + esc(stamp(it.modified)) : '') + '</span><small>' + esc(it.path) + '</small></button>';
    }).join('');
  }

  function render() {
    var l = L();
    document.documentElement.lang = lang;
    $('lang-toggle').textContent = lang.toUpperCase();
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = l[el.dataset.i18n];
      if (typeof v === 'string') el.innerHTML = v;
    });
    $('pick').textContent = state.src ? l.pickOther : l.pick;
    $('find-dir').hidden = !CAN_DIR;
    $('find-dir').disabled = !!(state.find && state.find.busy);
    $('resume').hidden = !state.stored || !!state.src;
    if (state.stored) $('resume').textContent = l.resume(state.stored.name);
    $('no-watch').hidden = CAN_FILE;
    $('no-watch').textContent = l.noWatch;
    $('error').hidden = !state.error;
    $('error').textContent = state.error;
    renderFind();
    renderStatus();
    renderLive();
    renderTeam();
    renderLog();
  }

  /* ── Bedienung ─────────────────────────────────────────────────── */
  $('pick').addEventListener('click', pick);
  $('find-dir').addEventListener('click', findInFolder);
  $('file-input').addEventListener('change', function () {
    var f = this.files && this.files[0];
    this.value = '';
    if (f) { stop(true); readOnce(f); }
  });
  $('found').addEventListener('click', function (e) {
    var b = e.target.closest && e.target.closest('[data-found]');
    if (b && state.find && state.find.list) start(state.find.list[+b.dataset.found].handle);
  });
  $('resume').addEventListener('click', function () {
    var st = state.stored;
    if (!st) return;
    permit(st.handle).then(function (p) { if (p === 'granted') start(st.handle); }).catch(function () {});
  });
  $('check').addEventListener('click', function () {
    if (state.src && state.src.handle) tick(true); else $('file-input').click();
  });
  $('pause').addEventListener('click', function () {
    var src = state.src;
    if (!src || !src.handle) return;
    if (state.needPerm) {
      permit(src.handle).then(function (p) {
        if (p !== 'granted') return;
        state.needPerm = false; state.watching = true;
        tick(true);
      }).catch(function () {});
      return;
    }
    state.watching = !state.watching;
    if (state.watching) tick(false); else renderStatus();
  });
  $('live-toggle').addEventListener('click', function () { liveSet(!live.on); });
  $('live-rescan').addEventListener('click', function () { if (live.tracker) { live.tracker.rescan(); liveTick(); } });
  $('clear').addEventListener('click', function () {
    state.log = [];
    persist();
    renderLog();
  });
  $('lang-toggle').addEventListener('click', function () {
    lang = lang === 'de' ? 'en' : 'de';
    try { localStorage.setItem('hub-lang', lang); } catch (e) {}
    render();
  });

  // Datei hineinziehen: mit Datei-Griff (Chrome/Edge am PC) wird beobachtet, sonst einmal eingelesen
  var card = $('watch-card');
  card.addEventListener('dragover', function (e) { e.preventDefault(); card.classList.add('is-over'); });
  card.addEventListener('dragleave', function () { card.classList.remove('is-over'); });
  card.addEventListener('drop', function (e) {
    e.preventDefault();
    card.classList.remove('is-over');
    var dt = e.dataTransfer, item = dt && dt.items && dt.items[0], file = dt && dt.files && dt.files[0];
    if (item && item.getAsFileSystemHandle) {
      item.getAsFileSystemHandle().then(function (h) {
        if (h && h.kind === 'file') return start(h);
        if (file) { stop(true); return readOnce(file); }
      }).catch(function () { if (file) { stop(true); readOnce(file); } });
    } else if (file) { stop(true); readOnce(file); }
  });

  // Zurück auf der Seite (am Handy: vom Emulator zurückgewechselt): sofort prüfen
  function wake() { if (!document.hidden && state.watching) tick(false); }
  document.addEventListener('visibilitychange', wake);
  window.addEventListener('focus', wake);

  // Datei vom letzten Besuch: Hat der Browser die Erlaubnis noch, gleich weiter beobachten – sonst per Knopf
  // (die Nachfrage des Browsers muss aus einem Klick kommen)
  if (CAN_FILE) {
    Db.get().then(function (rec) {
      if (!rec || !rec.handle || state.src) return;
      state.stored = rec;
      var q = rec.handle.queryPermission ? rec.handle.queryPermission({ mode: 'read' }) : Promise.resolve('prompt');
      return Promise.resolve(q).then(function (p) {
        if (p === 'granted' && !state.src) return start(rec.handle);
        render();
      });
    }).catch(function () {});
  }

  loop();
  live.timer = setInterval(liveTick, LIVE_POLL);
  render();
  liveTick();
})();
