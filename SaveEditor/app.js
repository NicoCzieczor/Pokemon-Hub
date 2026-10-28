/*
 * Save-Editor (früher „Sonderbonbons“) – einen Platin-Spielstand ändern, so einfach wie möglich:
 * Sonderbonbons, Attacken / getragenes Item / Freundschaft der Pokémon (Team und Boxen), der ganze Beutel,
 * Geld und Münzen.
 *
 * Gelesen und geschrieben wird mit PtSave (pt-save.js), PtBag (pt-bag.js) und PtEdit (pt-edit.js) aus dem
 * Save-Viewer. Jede Änderung landet zuerst in einer Arbeitskopie (save.work); erst „Spielstand speichern“
 * schreibt sie. Wo der Browser es kann (Chrome/Edge am PC), wird die ausgewählte Datei direkt ersetzt
 * (File System Access API) – sonst gibt es die geänderte Datei als Download mit genau demselben Namen.
 */
(function () {
  'use strict';

  var D = window.PT_DATA;
  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
  var ICON_SPR = SPR + '/pokemon/versions/generation-vii/icons/';
  var PT_SPR = SPR + '/pokemon/versions/generation-iv/platinum/';
  var MEDICINE = 4, KEY_ITEMS = 1, TMS = 2;           // Taschen (PtBag.POCKETS)
  var CANDY_MAX = PtBag.POCKETS[MEDICINE].max;        // 999
  var HELD_POCKETS = [0, 4, 5, 6, 7];                 // was ein Pokémon tragen kann (ohne Basis-Items, TMs, Briefe)
  // Typfarben wie im restlichen Hub, Reihenfolge = PKHeX-Typ-Index
  var TYPE_HEX = ['#bbbbaa', '#bb5544', '#96caff', '#9553cd', '#a67439', '#bbaa66', '#92c12a', '#6e4370', '#aaaabb',
    '#ff421c', '#2c9be3', '#62bc5a', '#ffdc00', '#ff6380', '#74cfc0', '#5670be', '#4e4545', '#ec8fe6'];
  // Entwicklung durch Levelaufstieg mit bestimmter Attacke (Originalspiel): Art → [Attacke, Entwicklung]
  var MOVE_EVOS = { 108: [205, 463], 114: [246, 465], 190: [458, 424], 193: [246, 469], 221: [246, 473], 438: [102, 185], 439: [102, 122] };
  // Handy/Tablet: kein direktes Ersetzen (gibt es dort nicht zuverlässig), Anleitung für Emulator-Apps
  var PHONE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  var ANDROID = /Android/i.test(navigator.userAgent);

  var I18N = {
    de: {
      title1: 'Save-', title2: 'Editor',
      subtitle: 'Ändere deinen Platin-Spielstand: Sonderbonbons, Attacken, Items, Beutel und Geld – ohne extra Programm.',
      s1Title: 'Im Spiel speichern, Emulator schließen',
      s1Text: 'Speichere ganz normal im Spiel (Menü → Bericht). Schließe danach den Emulator komplett – am Handy auch aus der App-Übersicht wegwischen. Sonst überschreibt er deine Datei gleich wieder.',
      s2Title: 'Spielstand auswählen',
      dropTitle: 'Spielstand hier reinziehen oder antippen',
      dropSub: 'Datei endet auf .sav oder .dsv. Sie bleibt auf deinem Gerät und wird nirgendwo hochgeladen.',
      dropOther: 'Anderen Spielstand wählen',
      whereTitle: 'Wo liegt mein Spielstand?',
      whereDesmume: 'Im Ordner <code>Battery</code> neben DeSmuME. Die Datei heißt wie dein Spiel und endet auf <code>.dsv</code>.',
      whereMelon: 'Am PC und am Handy direkt neben der Spiel-Datei (<code>.nds</code>): gleicher Name, endet auf <code>.sav</code>. Außer du hast in melonDS einen eigenen Speicherordner eingestellt.',
      whereDrastic: 'Ordner <code>DraStic/backup</code>, endet auf <code>.dsv</code>.',
      whereDelta: 'Spiel lange drücken → Spielstand exportieren. Danach dort wieder importieren.',
      whereNote: 'Wichtig: Nimm den normalen Spielstand – keinen Savestate („Schnellspeichern“ im Emulator).',
      s3Title: 'Ändern, was du willst',
      s3Wait: 'Erst den Spielstand auswählen.',
      s4Title: 'Spielstand speichern',
      apply: 'Spielstand speichern',
      applyBusy: 'Wird gespeichert…',
      discard: 'Alle Änderungen verwerfen',
      discardConfirm: 'Alle Änderungen verwerfen? Der Spielstand bleibt dann wie er ist.',
      footNote: 'Geändert wird nur der aktuelle Spielstand in der Datei, die Prüfsummen werden neu berechnet – wie bei PKHeX. Die Datei behält Namen und Format.',
      tabs: { candy: 'Sonderbonbons', mons: 'Pokémon', bag: 'Beutel', money: 'Geld' },
      badges: function (n) { return n === 1 ? '1 Orden' : n + ' Orden'; },
      playTime: function (h, m) { return 'Spielzeit ' + h + ':' + String(m).padStart(2, '0'); },
      // Sonderbonbons
      candyHave: function (n) { return 'Im Beutel: <b>' + n + '</b>'; },
      candyAfter: function (n) { return 'Nach dem Speichern: <b>' + n + '</b>'; },
      amountMax: 'Voll (999)',
      candyReset: 'Zurücksetzen',
      candyMaxed: 'Mehr als 999 geht nicht.',
      candyHint: 'Die Bonbons landen in der Medizin-Tasche.',
      // Pokémon
      team: 'Team',
      boxes: 'Boxen',
      boxOption: function (name, n) { return name + ' (' + n + ')'; },
      noTeam: 'Kein Pokémon im Team.',
      emptyBox: 'Diese Box ist leer.',
      pickMon: 'Wähle ein Pokémon aus.',
      inTeam: 'im Team',
      inBox: function (b) { return 'in ' + b; },
      moves: 'Attacken',
      addMove: '+ Attacke hinzufügen',
      forget: 'Vergessen',
      pp: 'AP', power: 'Stärke', acc: 'Gen.',
      cat: { 1: 'Status', 2: 'Phys.', 3: 'Spez.' },
      item: 'Getragenes Item',
      noItem: 'Kein Item',
      takeItem: 'Wegnehmen',
      friendship: 'Freundschaft',
      friendshipMax: 'Maximum',
      friendshipHint: 'Ab 220 entwickeln sich Freundschafts-Pokémon (z. B. Zubat → Golbat → Iksbat, Evoli) beim nächsten Levelaufstieg.',
      resetMon: 'Zurücksetzen',
      egg: 'Eier kann man hier nicht bearbeiten.',
      moveEvo: function (sp, mv, to) { return sp + ' entwickelt sich im Originalspiel erst zu ' + to + ', wenn es <b>' + mv + '</b> kennt und ein Level aufsteigt.'; },
      teach: function (mv) { return mv + ' beibringen'; },
      moveEvoFull: 'Ersetze dafür eine der Attacken.',
      // Beutel
      pockets: ['Items', 'Basis-Items', 'TM & VM', 'Briefe', 'Medizin', 'Beeren', 'Bälle', 'Kampf-Items'],
      bagEmpty: 'Diese Tasche ist leer.',
      bagAdd: '+ Item hinzufügen',
      bagFull: 'Diese Tasche ist voll.',
      keyWarn: 'Basis-Items gehören zur Geschichte. Fehlende oder zu frühe können Ereignisse im Spiel durcheinanderbringen – nur ändern, wenn du weißt, was du tust.',
      amount: 'Anzahl',
      remove: 'Entfernen',
      // Geld
      money: 'Geld',
      coins: 'Münzen (Spielhalle)',
      max: 'Maximum',
      before: function (v) { return 'vorher ' + v; },
      // Auswahl
      pickMove: 'Attacke wählen',
      pickItem: 'Item zum Tragen wählen',
      pickBag: function (p) { return 'Item für „' + p + '“'; },
      search: 'Suchen…',
      known: 'kann es schon',
      nothing: 'Nichts gefunden.',
      close: 'Schließen',
      // Änderungen
      noChanges: 'Noch nichts geändert. Ändere oben etwas – dann kannst du hier speichern.',
      changesTitle: function (n) { return n === 1 ? '1 Änderung:' : n + ' Änderungen:'; },
      chFrom: function (a, b) { return a + ' → ' + b; },
      partMoves: 'Attacken', partItem: 'Item', partFriend: 'Freundschaft',
      // Ergebnis
      okDirect: 'Fertig! Der Spielstand ist gespeichert.',
      okDirectText: function (f) { return 'Die Datei <code>' + f + '</code> wurde direkt ersetzt. Starte den Emulator und lade dein Spiel – deine Änderungen sind da.'; },
      okDownload: 'Fast fertig! Der neue Spielstand ist in deinen Downloads.',
      okSteps: function (f) {
        return [
          'Öffne den Ordner, aus dem du den Spielstand geholt hast.',
          'Zieh die heruntergeladene Datei <code>' + f + '</code> dort hinein und ersetze die alte („Datei ersetzen“ → Ja).',
          'Steht bei der Datei „(1)“ im Namen? Dann das „ (1)“ löschen, damit sie wieder genau <code>' + f + '</code> heißt.',
          'Emulator starten, Spiel laden – deine Änderungen sind da.'
        ];
      },
      okStepsPhone: function (f, android) {
        return android ? [
          'Die neue Datei <code>' + f + '</code> liegt im Ordner „Download“ (App „Dateien“ bzw. „Eigene Dateien“).',
          '<b>melonDS:</b> Verschieb sie in den Ordner mit deinem Spiel – dort liegt die alte <code>' + f + '</code> neben der .nds-Datei – und ersetze die alte.',
          'Der Name muss genau gleich bleiben. Hat Android „ (1)“ angehängt, lösch das wieder.',
          'melonDS öffnen und das Spiel normal starten (nicht über einen Savestate fortsetzen) – deine Änderungen sind da.'
        ] : [
          'Die Datei <code>' + f + '</code> liegt in der App „Dateien“ → Downloads.',
          '<b>Delta:</b> Spiel lange drücken → „Spielstand importieren“ → diese Datei wählen.',
          'Spiel starten – deine Änderungen sind da.'
        ];
      },
      noState: 'Lade danach keinen Savestate („Schnellladen“) – der holt den alten Stand ohne deine Änderungen zurück.',
      writeFailed: 'Die Datei konnte nicht direkt ersetzt werden – ist der Emulator noch offen? Schließ ihn und versuch es nochmal, oder lade die Datei herunter.',
      retry: 'Nochmal versuchen',
      conflict: 'Die Datei wurde inzwischen geändert – vermutlich hat der Emulator gespeichert. Sie wurde deshalb nicht überschrieben.',
      conflictText: 'Lade die Datei neu und mach deine Änderung noch einmal – dann geht kein Spielfortschritt verloren. Oder lade deine Fassung als eigene Datei herunter.',
      reload: 'Datei neu laden',
      download: 'Herunterladen',
      downloadAgain: 'Nochmal herunterladen',
      undo: 'Rückgängig',
      undone: 'Rückgängig gemacht – der Spielstand ist wieder wie vorher.',
      undoneDownload: 'Die ursprüngliche Datei ist in deinen Downloads. Ersetze den Spielstand damit, dann ist alles wie vorher.',
      errSize: function (kb) { return 'Das ist kein DS-Spielstand (' + kb + ' KB, erwartet sind 512 KB). Nimm die Datei, die beim Speichern im Spiel entsteht (.sav/.dsv) – keinen Savestate.'; },
      errGame: function (g) { return 'Das ist ein Spielstand von ' + g + '. Hier geht nur Pokémon Platin.'; },
      errUnknown: 'Kein Platin-Spielstand erkannt. Hast du im Spiel schon einmal gespeichert? Und ist es die richtige Datei (.sav/.dsv)?',
      errBroken: 'Der Spielstand ist beschädigt (Prüfsumme falsch). Lade ihn einmal im Spiel und speichere neu.',
      errRead: 'Die Datei ließ sich nicht lesen: ',
      errEdit: 'Das ließ sich nicht ändern: ',
      errPocket: 'Die Tasche ist voll – entferne erst ein anderes Item.'
    },
    en: {
      title1: 'Save ', title2: 'Editor',
      subtitle: 'Change your Platinum save file: Rare Candies, moves, items, bag and money – no extra program.',
      s1Title: 'Save in the game, close the emulator',
      s1Text: 'Save normally in the game (menu → Save). Then close the emulator completely – on a phone, also swipe it away from the recent apps. Otherwise it will overwrite your file again.',
      s2Title: 'Choose your save file',
      dropTitle: 'Drop your save file here or tap',
      dropSub: 'The file ends with .sav or .dsv. It stays on your device and is never uploaded.',
      dropOther: 'Choose another save file',
      whereTitle: 'Where is my save file?',
      whereDesmume: 'In the <code>Battery</code> folder next to DeSmuME. Named like your game, ends with <code>.dsv</code>.',
      whereMelon: 'On PC and phone right next to the game file (<code>.nds</code>): same name, ends with <code>.sav</code>. Unless you set your own save folder in melonDS.',
      whereDrastic: 'Folder <code>DraStic/backup</code>, ends with <code>.dsv</code>.',
      whereDelta: 'Long-press the game → export save file. Import it there again afterwards.',
      whereNote: 'Important: use the normal save file – not a save state (the emulator\'s quick save).',
      s3Title: 'Change whatever you want',
      s3Wait: 'Choose your save file first.',
      s4Title: 'Save your game',
      apply: 'Save the file',
      applyBusy: 'Saving…',
      discard: 'Discard all changes',
      discardConfirm: 'Discard all changes? The save file stays as it is.',
      footNote: 'Only the current save in the file is changed and the checksums are recalculated – just like PKHeX. The file keeps its name and format.',
      tabs: { candy: 'Rare Candies', mons: 'Pokémon', bag: 'Bag', money: 'Money' },
      badges: function (n) { return n === 1 ? '1 badge' : n + ' badges'; },
      playTime: function (h, m) { return 'Play time ' + h + ':' + String(m).padStart(2, '0'); },
      candyHave: function (n) { return 'In the bag: <b>' + n + '</b>'; },
      candyAfter: function (n) { return 'After saving: <b>' + n + '</b>'; },
      amountMax: 'Full (999)',
      candyReset: 'Reset',
      candyMaxed: 'More than 999 is not possible.',
      candyHint: 'The candies go into the Medicine pocket.',
      team: 'Party',
      boxes: 'Boxes',
      boxOption: function (name, n) { return name + ' (' + n + ')'; },
      noTeam: 'No Pokémon in the party.',
      emptyBox: 'This box is empty.',
      pickMon: 'Choose a Pokémon.',
      inTeam: 'in the party',
      inBox: function (b) { return 'in ' + b; },
      moves: 'Moves',
      addMove: '+ Add a move',
      forget: 'Forget',
      pp: 'PP', power: 'Power', acc: 'Acc.',
      cat: { 1: 'Status', 2: 'Phys.', 3: 'Spec.' },
      item: 'Held item',
      noItem: 'No item',
      takeItem: 'Take away',
      friendship: 'Friendship',
      friendshipMax: 'Maximum',
      friendshipHint: 'From 220 on, friendship Pokémon (e.g. Zubat → Golbat → Crobat, Eevee) evolve at the next level up.',
      resetMon: 'Reset',
      egg: 'Eggs can\'t be edited here.',
      moveEvo: function (sp, mv, to) { return 'In the original game, ' + sp + ' only evolves into ' + to + ' when it knows <b>' + mv + '</b> and levels up.'; },
      teach: function (mv) { return 'Teach ' + mv; },
      moveEvoFull: 'Replace one of the moves for that.',
      pockets: ['Items', 'Key Items', 'TMs & HMs', 'Mail', 'Medicine', 'Berries', 'Poké Balls', 'Battle Items'],
      bagEmpty: 'This pocket is empty.',
      bagAdd: '+ Add an item',
      bagFull: 'This pocket is full.',
      keyWarn: 'Key items belong to the story. Missing or early ones can mess up events in the game – only change them if you know what you are doing.',
      amount: 'Amount',
      remove: 'Remove',
      money: 'Money',
      coins: 'Coins (Game Corner)',
      max: 'Maximum',
      before: function (v) { return 'before ' + v; },
      pickMove: 'Choose a move',
      pickItem: 'Choose an item to hold',
      pickBag: function (p) { return 'Item for "' + p + '"'; },
      search: 'Search…',
      known: 'already known',
      nothing: 'Nothing found.',
      close: 'Close',
      noChanges: 'Nothing changed yet. Change something above – then you can save here.',
      changesTitle: function (n) { return n === 1 ? '1 change:' : n + ' changes:'; },
      chFrom: function (a, b) { return a + ' → ' + b; },
      partMoves: 'moves', partItem: 'item', partFriend: 'friendship',
      okDirect: 'Done! The save file is saved.',
      okDirectText: function (f) { return 'The file <code>' + f + '</code> was replaced directly. Start the emulator and load your game – your changes are there.'; },
      okDownload: 'Almost done! The new save file is in your downloads.',
      okSteps: function (f) {
        return [
          'Open the folder you took the save file from.',
          'Drag the downloaded file <code>' + f + '</code> in there and replace the old one ("Replace the file" → Yes).',
          'Does the file name contain "(1)"? Then delete the " (1)" so it is called exactly <code>' + f + '</code> again.',
          'Start the emulator, load your game – your changes are there.'
        ];
      },
      okStepsPhone: function (f, android) {
        return android ? [
          'The new file <code>' + f + '</code> is in the "Download" folder (Files app).',
          '<b>melonDS:</b> move it into the folder with your game – the old <code>' + f + '</code> is there next to the .nds file – and replace the old one.',
          'The name must stay exactly the same. If Android added " (1)", delete it again.',
          'Open melonDS and start the game normally (don\'t resume from a save state) – your changes are there.'
        ] : [
          'The file <code>' + f + '</code> is in the Files app → Downloads.',
          '<b>Delta:</b> long-press the game → "Import Save File" → choose this file.',
          'Start the game – your changes are there.'
        ];
      },
      noState: 'Don\'t load a save state afterwards – it brings back the old state without your changes.',
      writeFailed: 'The file could not be replaced directly – is the emulator still open? Close it and try again, or download the file.',
      retry: 'Try again',
      conflict: 'The file has changed in the meantime – probably the emulator saved. So it was not overwritten.',
      conflictText: 'Reload the file and make your change again – that way no game progress is lost. Or download your version as a separate file.',
      reload: 'Reload file',
      download: 'Download',
      downloadAgain: 'Download again',
      undo: 'Undo',
      undone: 'Undone – the save file is back to how it was.',
      undoneDownload: 'The original file is in your downloads. Replace your save file with it and everything is back to how it was.',
      errSize: function (kb) { return 'This is not a DS save file (' + kb + ' KB, expected 512 KB). Use the file created when you save in the game (.sav/.dsv) – not a save state.'; },
      errGame: function (g) { return 'This is a save file from ' + g + '. Only Pokémon Platinum works here.'; },
      errUnknown: 'No Platinum save detected. Have you saved in the game at least once? And is it the right file (.sav/.dsv)?',
      errBroken: 'The save file is damaged (wrong checksum). Load it in the game once and save again.',
      errRead: 'The file could not be read: ',
      errEdit: 'This could not be changed: ',
      errPocket: 'The pocket is full – remove another item first.'
    }
  };

  var lang = 'de';
  try { lang = localStorage.getItem('hub-lang') === 'en' ? 'en' : 'de'; } catch (e) {}
  // save: { name, handle, orig (Datei wie gespeichert), work (Arbeitskopie), base/data (gelesen), before (für Rückgängig) }
  var state = { save: null, tab: 'candy', mon: null, box: 0, pocket: 0, picker: null, busy: false, result: null, error: '' };

  var $ = function (id) { return document.getElementById(id); };
  function L() { return I18N[lang]; }
  function T() { return D.text[lang]; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return Number(n).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US'); }
  function sameBytes(a, b) {
    if (a === b) return true;
    if (a.length !== b.length) return false;
    for (var i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
    return true;
  }

  /* ── Namen und Bilder ──────────────────────────────────────────── */
  function itemName(id) { var n = T().items[id]; return n && n !== '???' ? n : '#' + id; }
  function realItem(id) { var n = T().items[id]; return PtBag.pocketOf(id) >= 0 && !!n && n !== '???'; }
  function itemImg(id, cls) {
    var s = D.itemSprites[id];
    return s ? '<img class="' + (cls || '') + '" src="' + SPR + '/items/' + s + '.png" alt="" loading="lazy">' : '<span class="' + (cls || '') + '"></span>';
  }
  function typeBadge(t) { return '<span class="type" style="--c:' + TYPE_HEX[t] + '">' + esc(T().types[t]) + '</span>'; }
  function monName(m) { return m.isEgg ? T().species[0] : (m.isNicknamed && m.nickname ? m.nickname : T().species[m.species]); }
  function icon(m) { return '<img src="' + ICON_SPR + (m.isEgg ? 'egg' : m.species) + '.png" alt="" loading="lazy">'; }
  function maxPP(id, ups) { var b = (D.moveInfo[id] || [])[1] || 0; return b + Math.floor(b * ups / 5); }

  /* ── Pokémon finden ────────────────────────────────────────────── */
  function wKey(w) { return w.area === 'party' ? 'p' + w.slot : 'b' + w.box + '-' + w.slot; }
  function wParse(k) {
    var m = /^p(\d)$/.exec(k);
    if (m) return { area: 'party', slot: +m[1] };
    m = /^b(\d+)-(\d+)$/.exec(k);
    return m ? { area: 'box', box: +m[1], slot: +m[2] } : null;
  }
  function monAt(data, w) {
    if (!w) return null;
    if (w.area === 'party') return data.party.filter(function (m) { return m.where.slot === w.slot; })[0] || null;
    var b = data.boxes[w.box];
    return (b && b.slots[w.slot]) || null;
  }
  // Was ist an einem Pokémon anders? → Liste von Teilen
  function monDiff(a, b) {
    var l = L(), out = [];
    if (!a || !b) return out;
    if (a.moves.join() !== b.moves.join()) out.push(l.partMoves);
    if (a.item !== b.item) out.push(l.partItem);
    if (a.friendship !== b.friendship) out.push(l.partFriend);
    return out;
  }
  function boxName(i) { return (state.save && state.save.data.boxes[i].name) || 'Box ' + (i + 1); }

  /* ── Datei laden ───────────────────────────────────────────────── */
  function load(file, handle) {
    state.error = '';
    state.result = null;
    state.picker = null;
    return file.arrayBuffer().then(function (buf) {
      var bytes = new Uint8Array(buf);
      var data = PtSave.parse(bytes, D);
      if (!data.ok) {
        var l = L();
        state.error = data.error === 'size' ? l.errSize(Math.round(bytes.length / 1024))
          : data.error === 'game' ? l.errGame(data.game) : l.errUnknown;
        state.save = null;
        return;
      }
      var g = PtSave.generalBlock(bytes);
      if (!g || !g.valid) { state.error = L().errBroken; state.save = null; return; }
      state.save = { name: file.name, handle: handle || null, orig: bytes, work: bytes, base: data, data: data, before: null };
      var first = data.party[0];
      state.mon = first ? first.where : null;
      state.box = data.currentBox < data.boxes.length ? data.currentBox : 0;
    }).catch(function (err) {
      state.error = L().errRead + (err && err.message);
      state.save = null;
    }).then(render);
  }

  // Am PC (Chrome/Edge) mit Datei-Zugriff öffnen, damit später direkt gespeichert werden kann
  function pickFile() {
    if (!window.showOpenFilePicker || PHONE) { $('file-input').click(); return; }
    window.showOpenFilePicker({
      id: 'pokehub-save',
      types: [{ description: 'DS-Spielstand', accept: { 'application/octet-stream': ['.sav', '.dsv'] } }],
      multiple: false
    }).then(function (handles) {
      return handles[0].getFile().then(function (file) { return load(file, handles[0]); });
    }).catch(function (err) {
      if (err && err.name === 'AbortError') return;
      $('file-input').click();      // z. B. in einem eingebetteten Fenster nicht erlaubt
    });
  }

  /* ── Ändern (immer in der Arbeitskopie) ────────────────────────── */
  function change(fn) {
    var sv = state.save;
    try {
      var out = fn(sv.work);
      var data = PtSave.parse(out, D);
      if (!data.ok) throw new Error('check');
      sv.work = out;
      sv.data = data;
      state.result = null;
    } catch (err) {
      state.result = { kind: 'error', text: L().errEdit + (err && err.message) };
    }
    render();
  }
  function editMon(w, fn) { change(function (b) { return PtEdit.editMon(b, w, fn); }); }

  function bagOf(bytes) { return PtBag.read(bytes) || PtBag.POCKETS.map(function () { return []; }); }
  function countIn(bytes, pocket, id) {
    var e = bagOf(bytes)[pocket].filter(function (x) { return x.id === id; })[0];
    return e ? e.count : 0;
  }
  function setCount(pocket, id, count) {
    change(function (b) {
      var bag = bagOf(b), list = bag[pocket], P = PtBag.POCKETS[pocket];
      var e = list.filter(function (x) { return x.id === id; })[0];
      if (count <= 0) {
        if (e) list.splice(list.indexOf(e), 1);
      } else {
        if (!e) {
          if (list.length >= P.slots) throw new Error(L().errPocket);
          e = { id: id, count: 0 };
          list.push(e);
        }
        e.count = Math.min(Math.round(count), P.max);
      }
      return PtBag.write(b, bag);
    });
  }

  /* ── Liste der Änderungen ──────────────────────────────────────── */
  function changeList() {
    var sv = state.save, l = L(), out = [];
    var a = sv.base, b = sv.data;
    if (a.trainer.money !== b.trainer.money) out.push('<b>' + esc(l.money) + '</b> ' + l.chFrom(num(a.trainer.money), num(b.trainer.money)));
    if (a.trainer.coins !== b.trainer.coins) out.push('<b>' + esc(l.coins) + '</b> ' + l.chFrom(num(a.trainer.coins), num(b.trainer.coins)));
    var A = bagOf(sv.orig), B = bagOf(sv.work);
    PtBag.POCKETS.forEach(function (p, pi) {
      var before = {}, after = {}, ids = [];
      A[pi].forEach(function (e) { before[e.id] = e.count; ids.push(e.id); });
      B[pi].forEach(function (e) { after[e.id] = e.count; if (!(e.id in before)) ids.push(e.id); });
      ids.forEach(function (id) {
        if (before[id] !== after[id]) out.push('<b>' + esc(itemName(id)) + '</b> ' + l.chFrom(num(before[id] || 0), num(after[id] || 0)));
      });
    });
    function mons(d, fn) {
      d.party.forEach(fn);
      d.boxes.forEach(function (bx) { bx.slots.forEach(function (m) { if (m) fn(m); }); });
    }
    mons(b, function (m) {
      var parts = monDiff(monAt(a, m.where), m);
      if (parts.length) out.push('<b>' + esc(monName(m)) + '</b> ' + esc(parts.join(', ')));
    });
    return out;
  }

  /* ── Speichern ─────────────────────────────────────────────────── */
  // Direkt in die ausgewählte Datei schreiben; true = geklappt, 'conflict' = die Datei ist nicht mehr die,
  // die wir kennen (expected) – z. B. hat der Emulator inzwischen gespeichert. Dann wird nichts überschrieben.
  function writeHandle(handle, bytes, expected) {
    if (!handle || !handle.createWritable) return Promise.resolve(false);
    var opts = { mode: 'readwrite' };
    return Promise.resolve(handle.queryPermission ? handle.queryPermission(opts) : 'prompt').then(function (p) {
      return p === 'granted' ? p : handle.requestPermission(opts);
    }).then(function (p) {
      if (p !== 'granted') return false;
      return handle.getFile().then(function (f) {
        return f.arrayBuffer();
      }).then(function (buf) {
        if (expected && !sameBytes(new Uint8Array(buf), expected)) return 'conflict';
        return writeBytes(handle, bytes);
      });
    }).catch(function () { return false; });
  }
  function writeBytes(handle, bytes) {
    return Promise.resolve().then(function () {
      return handle.createWritable().then(function (w) {
        return w.write(bytes).then(function () { return w.close(); });
      }).then(function () {
        return handle.getFile();
      }).then(function (f) {
        return f.arrayBuffer();
      }).then(function (buf) {
        return sameBytes(new Uint8Array(buf), bytes);
      });
    }).catch(function () { return false; });
  }

  // Arbeitskopie gilt jetzt als gespeichert
  function markSaved() {
    var sv = state.save;
    sv.before = sv.before || sv.orig;
    sv.orig = sv.work;
    sv.base = sv.data;
  }

  function apply() {
    var sv = state.save;
    if (!sv || state.busy || sameBytes(sv.orig, sv.work)) return;
    state.busy = true;
    render();
    var out = sv.work;
    writeHandle(sv.handle, out, sv.orig).then(function (ok) {
      if (ok === 'conflict') state.result = { kind: 'conflict' };
      else if (ok) { markSaved(); state.result = { kind: 'direct' }; }
      else if (sv.handle && sv.handle.createWritable) state.result = { kind: 'writeFailed' };
      else { downloadFile(out, sv.name); markSaved(); state.result = { kind: 'download' }; }
    }).then(function () {
      state.busy = false;
      render();
    });
  }

  function undo() {
    var sv = state.save;
    if (!sv || !sv.before || state.busy) return;
    state.busy = true;
    render();
    var before = sv.before;
    writeHandle(sv.handle, before, sv.orig).then(function (ok) {
      if (ok === 'conflict') {
        // Inzwischen hat jemand anderes gespeichert – den alten Stand nicht darüberschreiben
        state.result = { kind: 'conflict' };
        state.busy = false;
        render();
        return;
      }
      if (!ok) downloadFile(before, sv.name);
      sv.orig = sv.work = before;
      sv.base = sv.data = PtSave.parse(before, D);
      sv.before = null;
      state.result = { kind: ok ? 'undone' : 'undoneDownload' };
      state.busy = false;
      render();
    });
  }

  function downloadFile(bytes, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([bytes], { type: 'application/octet-stream' }));
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  /* ── Anzeige: Reiter ───────────────────────────────────────────── */
  function candyHtml() {
    var sv = state.save, l = L();
    var have = countIn(sv.orig, MEDICINE, PtBag.RARE_CANDY), now = countIn(sv.work, MEDICINE, PtBag.RARE_CANDY);
    var med = bagOf(sv.work)[MEDICINE];
    var blocked = now >= CANDY_MAX || (!now && med.length >= PtBag.POCKETS[MEDICINE].slots);
    return '<div class="give">' +
      '<div class="candy-now">' + itemImg(PtBag.RARE_CANDY, 'candy-img') +
        '<span>' + l.candyHave(num(have)) + (now !== have ? ' <span class="candy-arrow">→</span> ' + l.candyAfter(num(now)) : '') + '</span>' +
        (now !== have ? '<button type="button" class="small-btn" data-act="candy-reset">↶ ' + esc(l.candyReset) + '</button>' : '') +
      '</div>' +
      '<div class="amounts" role="group">' +
        [10, 25, 50, 100].map(function (n) {
          return '<button type="button" class="amount" data-act="candy" data-n="' + n + '"' + (blocked ? ' disabled' : '') + '>+' + n + '</button>';
        }).join('') +
        '<button type="button" class="amount" data-act="candy" data-n="max"' + (blocked ? ' disabled' : '') + '>' + esc(l.amountMax) + '</button>' +
      '</div>' +
      '<p class="give-preview">' + esc(now >= CANDY_MAX ? l.candyMaxed : !now && blocked ? l.errPocket : l.candyHint) + '</p>' +
    '</div>';
  }

  function monCard(m, active, changed) {
    return '<button type="button" class="ed-pk' + (active ? ' is-active' : '') + (changed ? ' is-changed' : '') + '" data-act="mon" data-w="' + wKey(m.where) + '">' +
      icon(m) + '<span><b>' + esc(monName(m)) + '</b><small>' + (m.isEgg ? '' : 'Lv. ' + m.level) + '</small></span></button>';
  }

  function monsHtml() {
    var sv = state.save, l = L(), d = sv.data, cur = wKey(state.mon || { area: 'x' });
    var changedKey = function (m) { return monDiff(monAt(sv.base, m.where), m).length > 0; };
    var team = d.party.length ? '<div class="ed-team">' + d.party.map(function (m) {
      return monCard(m, wKey(m.where) === cur, changedKey(m));
    }).join('') + '</div>' : '<p class="muted">' + esc(l.noTeam) + '</p>';

    var opts = d.boxes.map(function (b, i) {
      var n = b.slots.filter(Boolean).filter(function (m) { return m.species; }).length;
      return '<option value="' + i + '"' + (i === state.box ? ' selected' : '') + '>' + esc(l.boxOption(boxName(i), n)) + '</option>';
    }).join('');
    var box = d.boxes[state.box];
    var slots = box.slots.map(function (m, i) {
      if (!m) return '<span class="ed-slot is-empty"></span>';
      var k = wKey(m.where);
      return '<button type="button" class="ed-slot' + (k === cur ? ' is-active' : '') + (changedKey(m) ? ' is-changed' : '') + '" data-act="mon" data-w="' + k + '" title="' + esc(monName(m) + (m.isEgg ? '' : ' · Lv. ' + m.level)) + '">' + icon(m) + '</button>';
    }).join('');

    return '<div class="ed-mons">' +
      '<div class="ed-list">' +
        '<h3>' + esc(l.team) + '</h3>' + team +
        '<h3>' + esc(l.boxes) + '</h3>' +
        '<select class="ed-select" data-act="box">' + opts + '</select>' +
        '<div class="ed-box">' + slots + '</div>' +
      '</div>' +
      '<div class="ed-detail" id="ed-detail">' + monDetailHtml(monAt(d, state.mon)) + '</div>' +
    '</div>';
  }

  function monDetailHtml(m) {
    var l = L(), t = T(), sv = state.save;
    if (!m) return '<p class="muted">' + esc(l.pickMon) + '</p>';
    var orig = monAt(sv.base, m.where);
    var changed = monDiff(orig, m).length > 0;
    var where = m.where.area === 'party' ? l.inTeam : l.inBox(boxName(m.where.box));
    var head = '<div class="ed-mon-head">' +
      (m.isEgg ? icon(m) : '<img class="ed-mon-img" src="' + PT_SPR + m.species + '.png" alt="" loading="lazy">') +
      '<div class="ed-mon-title"><b>' + esc(monName(m)) + '</b>' +
        '<span>' + (m.isEgg ? '' : 'Lv. ' + m.level + ' · ') + esc(where) + '</span>' +
        (m.isEgg ? '' : '<div class="types">' + m.types.map(typeBadge).join('') + '</div>') +
      '</div>' +
      (changed ? '<button type="button" class="small-btn" data-act="mon-reset">↶ ' + esc(l.resetMon) + '</button>' : '') +
    '</div>';
    if (m.isEgg) return head + '<p class="muted">' + esc(l.egg) + '</p>';

    var moves = '<div class="ed-moves">' + m.moves.map(function (id, i) {
      var info = D.moveInfo[id] || [0, 0, 0, 0, 1];
      var stats = [l.cat[info[4]], info[2] ? l.power + ' ' + info[2] : '', info[3] ? l.acc + ' ' + info[3] : '', l.pp + ' ' + m.pp[i] + '/' + maxPP(id, m.ppUps[i])].filter(Boolean).join(' · ');
      return '<div class="ed-move">' +
        '<button type="button" class="ed-move-btn" data-act="move" data-slot="' + i + '">' + typeBadge(info[0]) +
          '<span><b>' + esc(t.moves[id]) + '</b><small>' + esc(stats) + '</small></span></button>' +
        (m.moves.length > 1 ? '<button type="button" class="ed-x" data-act="move-del" data-slot="' + i + '" title="' + esc(l.forget) + '" aria-label="' + esc(l.forget) + '">×</button>' : '') +
      '</div>';
    }).join('') +
    (m.moves.length < 4 ? '<button type="button" class="ed-add" data-act="move" data-slot="add">' + esc(l.addMove) + '</button>' : '') + '</div>';

    var evo = MOVE_EVOS[m.species], evoHtml = '';
    if (evo && m.moves.indexOf(evo[0]) < 0) {
      evoHtml = '<div class="ed-note"><span>' + l.moveEvo(esc(t.species[m.species]), esc(t.moves[evo[0]]), esc(t.species[evo[1]])) + '</span> ' +
        (m.moves.length < 4 ? '<button type="button" class="small-btn" data-act="teach" data-move="' + evo[0] + '">' + esc(l.teach(t.moves[evo[0]])) + '</button>' : esc(l.moveEvoFull)) + '</div>';
    }

    var item = '<div class="ed-item">' +
      '<button type="button" class="ed-move-btn" data-act="held">' + (m.item ? itemImg(m.item, 'ed-item-img') : '') +
        '<span><b>' + esc(m.item ? itemName(m.item) : l.noItem) + '</b></span></button>' +
      (m.item ? '<button type="button" class="ed-x" data-act="held-del" title="' + esc(l.takeItem) + '" aria-label="' + esc(l.takeItem) + '">×</button>' : '') +
    '</div>';

    var friend = '<div class="ed-friend">' +
      '<input type="range" min="0" max="' + PtEdit.MAX_FRIENDSHIP + '" step="1" value="' + m.friendship + '" data-act="friend" aria-label="' + esc(l.friendship) + '">' +
      '<output>' + m.friendship + '</output>' +
      '<button type="button" class="small-btn" data-act="friend-max"' + (m.friendship >= PtEdit.MAX_FRIENDSHIP ? ' disabled' : '') + '>' + esc(l.friendshipMax) + '</button>' +
    '</div><p class="ed-hint">' + esc(l.friendshipHint) + '</p>';

    return head +
      '<h4>' + esc(l.moves) + '</h4>' + moves + evoHtml +
      '<h4>' + esc(l.item) + '</h4>' + item +
      '<h4>' + esc(l.friendship) + '</h4>' + friend;
  }

  function bagHtml() {
    var sv = state.save, l = L(), P = PtBag.POCKETS;
    var bag = bagOf(sv.work), orig = bagOf(sv.orig);
    var chips = '<div class="ed-pockets" role="tablist">' + P.map(function (p, i) {
      return '<button type="button" role="tab" class="ed-chip' + (i === state.pocket ? ' is-active' : '') + '" data-act="pocket" data-p="' + i + '" aria-selected="' + (i === state.pocket) + '">' +
        esc(l.pockets[i]) + ' <span class="ed-count">' + bag[i].length + '</span></button>';
    }).join('') + '</div>';
    var pi = state.pocket, list = bag[pi], before = {};
    orig[pi].forEach(function (e) { before[e.id] = e.count; });
    var rows = list.length ? list.map(function (e) {
      var changed = before[e.id] !== e.count;
      return '<div class="ed-row' + (changed ? ' is-changed' : '') + '">' + itemImg(e.id, 'ed-row-img') +
        '<span class="ed-row-name">' + esc(itemName(e.id)) + (changed ? '<small>' + esc(l.before(num(before[e.id] || 0))) + '</small>' : '') + '</span>' +
        '<input type="number" class="ed-qty" min="0" max="' + P[pi].max + '" value="' + e.count + '" data-act="qty" data-id="' + e.id + '" aria-label="' + esc(l.amount) + '">' +
        '<button type="button" class="ed-x" data-act="bag-del" data-id="' + e.id + '" title="' + esc(l.remove) + '" aria-label="' + esc(l.remove) + '">×</button>' +
      '</div>';
    }).join('') : '<p class="muted">' + esc(l.bagEmpty) + '</p>';
    var add = list.length >= P[pi].slots ? '<p class="ed-hint">' + esc(l.bagFull) + '</p>'
      : '<button type="button" class="ed-add" data-act="bag-add">' + esc(l.bagAdd) + '</button>';
    return chips + (pi === KEY_ITEMS ? '<p class="msg msg-warn">' + esc(l.keyWarn) + '</p>' : '') +
      '<div class="ed-bag">' + rows + add + '</div>';
  }

  function moneyHtml() {
    var sv = state.save, l = L(), a = sv.base.trainer, b = sv.data.trainer;
    function field(act, label, value, was, max) {
      return '<div class="ed-money-row' + (value !== was ? ' is-changed' : '') + '">' +
        '<label><span>' + esc(label) + '</span><input type="number" class="ed-num" min="0" max="' + max + '" step="1" value="' + value + '" data-act="' + act + '"></label>' +
        '<button type="button" class="small-btn" data-act="' + act + '-max"' + (value >= max ? ' disabled' : '') + '>' + esc(l.max) + ' (' + num(max) + ')</button>' +
        (value !== was ? '<small>' + esc(l.before(num(was))) + '</small>' : '') +
      '</div>';
    }
    return '<div class="ed-money">' +
      field('money', l.money, b.money, a.money, PtEdit.MAX_MONEY) +
      field('coins', l.coins, b.coins, a.coins, PtEdit.MAX_COINS) +
    '</div>';
  }

  function renderEditor() {
    var l = L();
    $('ed-tabs').innerHTML = ['candy', 'mons', 'bag', 'money'].map(function (k) {
      return '<button type="button" role="tab" class="ed-tab' + (k === state.tab ? ' is-active' : '') + '" data-act="tab" data-tab="' + k + '" aria-selected="' + (k === state.tab) + '">' + esc(l.tabs[k]) + '</button>';
    }).join('');
    $('ed-panel').innerHTML = state.tab === 'mons' ? monsHtml() : state.tab === 'bag' ? bagHtml() : state.tab === 'money' ? moneyHtml() : candyHtml();
  }

  /* ── Auswahlliste (Attacken, Items) ────────────────────────────── */
  function pickerOptions(p) {
    var t = T(), l = L(), out = [];
    if (p.kind === 'move') {
      var m = monAt(state.save.data, state.mon), known = m ? m.moves : [];
      for (var id = 1; id < t.moves.length; id++) {
        var info = D.moveInfo[id];
        if (!info || !t.moves[id]) continue;
        var same = p.slot !== 'add' && known[p.slot] === id;
        out.push({
          id: id, name: t.moves[id], off: known.indexOf(id) >= 0 && !same,
          html: typeBadge(info[0]) + '<span><b>' + esc(t.moves[id]) + '</b><small>' +
            esc([l.cat[info[4]], info[2] ? l.power + ' ' + info[2] : '', info[3] ? l.acc + ' ' + info[3] : '', l.pp + ' ' + info[1]].filter(Boolean).join(' · ')) + '</small></span>'
        });
      }
    } else {
      var ids = [];
      if (p.kind === 'held') {
        out.push({ id: 0, name: l.noItem, html: '<span class="ed-row-img"></span><span><b>' + esc(l.noItem) + '</b></span>', top: true });
        HELD_POCKETS.forEach(function (pi) { ids = ids.concat(PtBag.itemsOf(pi)); });
      } else {
        var have = {};
        bagOf(state.save.work)[p.pocket].forEach(function (e) { have[e.id] = true; });
        ids = PtBag.itemsOf(p.pocket).filter(function (x) { return !have[x]; });
      }
      ids.filter(realItem).forEach(function (x) {
        out.push({ id: x, name: itemName(x), html: itemImg(x, 'ed-row-img') + '<span><b>' + esc(itemName(x)) + '</b></span>' });
      });
    }
    if (!(p.kind === 'bag' && p.pocket === TMS)) {
      var cmp = new Intl.Collator(lang).compare;
      out.sort(function (a, b) { return a.top ? -1 : b.top ? 1 : cmp(a.name, b.name); });
    }
    return out;
  }

  // Die Zeilen entstehen einmal beim Öffnen (und nach einem Sprachwechsel). Beim Tippen werden sie nur
  // noch gefiltert und umsortiert – nicht bei jedem Buchstaben neu gebaut, so bleiben auch die Bilder geladen.
  function buildPickerRows(p) {
    var list = $('picker-list'), opts = pickerOptions(p);
    list.innerHTML = opts.map(function (o) {
      return '<button type="button" class="ed-pick' + (o.off ? ' is-off' : '') + '" data-pick="' + o.id + '"' + (o.off ? ' disabled' : '') + '>' + o.html +
        (o.off ? '<em>' + esc(L().known) + '</em>' : '') + '</button>';
    }).join('');
    p.rows = opts.map(function (o, i) { return { el: list.children[i], key: o.name.toLocaleLowerCase(lang) }; });
    p.shown = p.rows;
    p.lang = lang;
  }

  function renderPickerList() {
    var p = state.picker;
    if (!p) return;
    if (p.lang !== lang) buildPickerRows(p);
    var q = $('picker-q').value.trim().toLocaleLowerCase(lang);
    var hits = p.rows.filter(function (r) { return !q || r.key.indexOf(q) >= 0; });
    // Treffer am Wortanfang zuerst
    if (q) {
      hits.sort(function (a, b) { return (a.key.indexOf(q) === 0 ? 0 : 1) - (b.key.indexOf(q) === 0 ? 0 : 1); });
    }
    if (hits.length === p.shown.length && hits.every(function (r, i) { return r === p.shown[i]; })) return;
    p.shown = hits;
    var list = $('picker-list');
    if (!hits.length) { list.innerHTML = '<p class="muted ed-nothing">' + esc(L().nothing) + '</p>'; return; }
    var frag = document.createDocumentFragment();
    hits.forEach(function (r) { frag.appendChild(r.el); });
    list.textContent = '';
    list.appendChild(frag);
    list.scrollTop = 0;
  }

  function renderPicker() {
    var p = state.picker, l = L();
    $('picker').hidden = !p;
    if (!p) return;
    $('picker-title').textContent = p.kind === 'move' ? l.pickMove : p.kind === 'held' ? l.pickItem : l.pickBag(l.pockets[p.pocket]);
    $('picker-q').placeholder = l.search;
    $('picker-close').setAttribute('aria-label', l.close);
    renderPickerList();
  }

  function openPicker(p) {
    state.picker = p;
    $('picker-q').value = '';
    renderPicker();
    $('picker-list').scrollTop = 0;
    // Am Handy nicht sofort die Tastatur aufklappen – die Liste soll sichtbar bleiben
    if (!PHONE) $('picker-q').focus();
  }
  function closePicker() {
    state.picker = null;
    renderPicker();
  }

  function pick(id) {
    var p = state.picker;
    if (!p) return;
    closePicker();
    if (p.kind === 'move') {
      var m = monAt(state.save.data, state.mon);
      if (!m) return;
      var moves = m.moves.slice();
      if (p.slot === 'add') moves.push(id); else moves[p.slot] = id;
      editMon(state.mon, function (d) { PtEdit.setMoves(d, moves, D.moveInfo); });
    } else if (p.kind === 'held') {
      editMon(state.mon, function (d) { PtEdit.setItem(d, id); });
    } else {
      setCount(p.pocket, id, 1);
    }
  }

  /* ── Anzeige: Seite ────────────────────────────────────────────── */
  function applyStatic() {
    var l = L();
    document.documentElement.lang = lang;
    $('lang-toggle').textContent = lang.toUpperCase();
    $('picker-close').setAttribute('aria-label', l.close);
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = l[el.dataset.i18n];
      if (typeof v === 'string') el.innerHTML = v;
    });
    document.title = (lang === 'de' ? 'Save-Editor' : 'Save Editor') + ' – Pokémon Hub';
  }

  function saveCardHtml(sv) {
    var l = L(), t = sv.base.trainer;
    var team = sv.base.party.map(icon).join('');
    return '<div class="save-card-main">' +
        '<span class="save-card-name">' + esc(t.name) + '</span>' +
        '<span class="save-card-meta">' + esc(l.badges(t.badgeCount)) + ' · ' + esc(l.playTime(t.playTime.h, t.playTime.m)) + ' · ' + esc(sv.name) + '</span>' +
      '</div>' +
      (team ? '<div class="save-team">' + team + '</div>' : '');
  }

  function resultHtml(r, sv) {
    var l = L(), name = esc(sv ? sv.name : '');
    var undoBtn = sv && sv.before ? '<button type="button" class="small-btn" data-act="undo">↶ ' + l.undo + '</button>' : '';
    var note = '<p class="muted">' + l.noState + '</p>';
    switch (r.kind) {
      case 'direct':
        return '<div class="result-title">' + l.okDirect + '</div><p>' + l.okDirectText(name) + '</p>' + note +
          '<div class="btn-row">' + undoBtn + '</div>';
      case 'download':
        return '<div class="result-title">' + l.okDownload + '</div><ol>' +
          (PHONE ? l.okStepsPhone(name, ANDROID) : l.okSteps(name)).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' + note +
          '<div class="btn-row"><button type="button" class="small-btn" data-act="download">⭳ ' + l.downloadAgain + '</button>' + undoBtn + '</div>';
      case 'writeFailed':
        return '<div class="result-title">' + l.writeFailed + '</div>' +
          '<div class="btn-row"><button type="button" class="small-btn" data-act="retry">↻ ' + l.retry + '</button>' +
          '<button type="button" class="small-btn" data-act="download">⭳ ' + l.download + '</button></div>';
      case 'conflict':
        return '<div class="result-title">' + l.conflict + '</div><p>' + l.conflictText + '</p>' +
          '<div class="btn-row"><button type="button" class="small-btn" data-act="reload">↻ ' + l.reload + '</button>' +
          '<button type="button" class="small-btn" data-act="download">⭳ ' + l.download + '</button></div>';
      case 'undone':
        return '<div class="result-title">' + l.undone + '</div>';
      case 'undoneDownload':
        return '<div class="result-title">' + l.undoneDownload + '</div>';
      default:
        return '<div class="result-title">' + esc(r.text) + '</div>';
    }
  }

  function render() {
    var l = L(), sv = state.save;
    applyStatic();

    // Schritt 1 und die Hilfe „Wo liegt mein Spielstand?“ werden nach dem Laden nicht mehr gebraucht –
    // eingeklappt rutscht das Bearbeiten nach oben (am Handy sonst eine ganze Bildschirmhöhe weiter unten)
    $('step-prepare').classList.toggle('is-folded', !!sv);
    document.querySelector('#step-file details.where').hidden = !!sv;

    // Schritt 2: Datei
    $('drop').classList.toggle('is-small', !!sv);
    $('drop').querySelector('.drop-title').innerHTML = sv ? l.dropOther : l.dropTitle;
    $('drop').disabled = state.busy;
    $('save-card').hidden = !sv;
    if (sv) $('save-card').innerHTML = saveCardHtml(sv);
    $('file-error').hidden = !state.error;
    $('file-error').textContent = state.error;

    // Schritt 3: ändern
    var dirty = !!sv && !sameBytes(sv.orig, sv.work);
    var saved = !dirty && !!state.result && /^(direct|download)$/.test(state.result.kind);
    $('step-file').classList.toggle('is-current', !sv);
    $('step-file').classList.toggle('is-done', !!sv);
    $('step-edit').classList.toggle('is-locked', !sv);
    $('step-edit').classList.toggle('is-current', !!sv && !dirty && !saved);
    $('step-edit').classList.toggle('is-done', dirty || saved);
    $('edit-hint').hidden = !!sv;
    $('ed').hidden = !sv;
    if (sv) renderEditor();

    // Schritt 4: speichern
    $('step-save').classList.toggle('is-locked', !sv);
    $('step-save').classList.toggle('is-current', dirty || (!!state.result && !saved));
    $('step-save').classList.toggle('is-done', saved);
    var list = sv ? changeList() : [];
    $('changes').innerHTML = !sv ? '' : list.length
      ? '<p class="ed-changes-title">' + esc(l.changesTitle(list.length)) + '</p><ul>' + list.map(function (x) { return '<li>' + x + '</li>'; }).join('') + '</ul>'
      : saved ? '' : '<p class="muted">' + esc(l.noChanges) + '</p>';
    $('save-row').hidden = !dirty;
    $('apply').disabled = state.busy;
    $('apply-label').textContent = state.busy ? l.applyBusy : l.apply;
    $('discard').disabled = state.busy;
    var r = state.result;
    $('result').hidden = !r;
    if (r) {
      $('result').className = 'result' + (/^(error|writeFailed|conflict)$/.test(r.kind) ? ' is-error' : '');
      $('result').innerHTML = resultHtml(r, sv);
    }
    renderPicker();
  }

  /* ── Ereignisse ────────────────────────────────────────────────── */
  // iPhone kennt .sav/.dsv nicht und graut die Dateien sonst in der Auswahl aus
  if (PHONE) $('file-input').removeAttribute('accept');
  $('drop').addEventListener('click', function () { if (!state.busy) pickFile(); });
  $('file-input').addEventListener('change', function (e) {
    var f = e.target.files[0];
    if (f) load(f, null);
    e.target.value = '';
  });
  var drop = $('drop');
  ['dragenter', 'dragover'].forEach(function (t) {
    drop.addEventListener(t, function (e) { e.preventDefault(); drop.classList.add('is-over'); });
  });
  ['dragleave', 'dragend'].forEach(function (t) {
    drop.addEventListener(t, function () { drop.classList.remove('is-over'); });
  });
  drop.addEventListener('drop', function (e) {
    e.preventDefault();
    drop.classList.remove('is-over');
    var item = e.dataTransfer.items && e.dataTransfer.items[0];
    var file = e.dataTransfer.files[0];
    // Datei-Zugriff muss noch im Ereignis angefragt werden
    var hp = item && item.getAsFileSystemHandle ? item.getAsFileSystemHandle() : null;
    if (!hp) { if (file) load(file, null); return; }
    hp.then(function (h) {
      if (h && h.kind === 'file') return h.getFile().then(function (f) { return load(f, h); });
      if (file) return load(file, null);
    }).catch(function () { if (file) load(file, null); });
  });

  // Klicks im Editor
  $('ed').addEventListener('click', function (e) {
    var b = e.target.closest('button[data-act]');
    if (!b || b.disabled || !state.save || state.busy) return;
    var act = b.dataset.act, sv = state.save;
    if (act === 'tab') { state.tab = b.dataset.tab; render(); }
    else if (act === 'candy') {
      var now = countIn(sv.work, MEDICINE, PtBag.RARE_CANDY);
      setCount(MEDICINE, PtBag.RARE_CANDY, b.dataset.n === 'max' ? CANDY_MAX : Math.min(CANDY_MAX, now + (+b.dataset.n)));
    } else if (act === 'candy-reset') setCount(MEDICINE, PtBag.RARE_CANDY, countIn(sv.orig, MEDICINE, PtBag.RARE_CANDY));
    else if (act === 'mon') {
      state.mon = wParse(b.dataset.w);
      render();
      // Schmale Ansicht: Bearbeiten steht unter der Liste – dorthin scrollen
      var det = $('ed-detail');
      if (det && window.matchMedia && matchMedia('(max-width: 860px)').matches) det.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (act === 'mon-reset') {
      var orig = PtEdit.readMon(sv.orig, state.mon);
      if (orig) editMon(state.mon, function (d) { d.set(orig); });
    } else if (act === 'move') openPicker({ kind: 'move', slot: b.dataset.slot === 'add' ? 'add' : +b.dataset.slot });
    else if (act === 'move-del') {
      var m = monAt(sv.data, state.mon), slot = +b.dataset.slot;
      if (m && m.moves.length > 1) editMon(state.mon, function (d) { PtEdit.setMoves(d, m.moves.filter(function (_, i) { return i !== slot; }), D.moveInfo); });
    } else if (act === 'teach') {
      var mt = monAt(sv.data, state.mon);
      if (mt && mt.moves.length < 4) editMon(state.mon, function (d) { PtEdit.setMoves(d, mt.moves.concat(+b.dataset.move), D.moveInfo); });
    } else if (act === 'held') openPicker({ kind: 'held' });
    else if (act === 'held-del') editMon(state.mon, function (d) { PtEdit.setItem(d, 0); });
    else if (act === 'friend-max') editMon(state.mon, function (d) { PtEdit.setFriendship(d, PtEdit.MAX_FRIENDSHIP); });
    else if (act === 'pocket') { state.pocket = +b.dataset.p; render(); }
    else if (act === 'bag-del') setCount(state.pocket, +b.dataset.id, 0);
    else if (act === 'bag-add') openPicker({ kind: 'bag', pocket: state.pocket });
    else if (act === 'money-max') change(function (x) { return PtEdit.setMoney(x, PtEdit.MAX_MONEY); });
    else if (act === 'coins-max') change(function (x) { return PtEdit.setCoins(x, PtEdit.MAX_COINS); });
  });
  // Eingaben im Editor (Zahlen, Box-Auswahl, Freundschaft)
  $('ed').addEventListener('change', function (e) {
    var el = e.target, act = el.dataset.act;
    if (!act || !state.save || state.busy) return;
    if (act === 'box') { state.box = +el.value; render(); }
    else if (act === 'friend') editMon(state.mon, function (d) { PtEdit.setFriendship(d, +el.value); });
    else if (act === 'qty') setCount(state.pocket, +el.dataset.id, Math.max(0, Math.round(+el.value) || 0));
    else if (act === 'money') change(function (x) { return PtEdit.setMoney(x, +el.value || 0); });
    else if (act === 'coins') change(function (x) { return PtEdit.setCoins(x, +el.value || 0); });
  });
  $('ed').addEventListener('input', function (e) {
    var el = e.target;
    if (el.dataset.act === 'friend') el.nextElementSibling.textContent = el.value;
  });

  // Auswahlliste
  $('picker-q').addEventListener('input', renderPickerList);
  $('picker-q').addEventListener('keydown', function (e) {
    if (e.key === 'Enter') {
      var first = $('picker-list').querySelector('[data-pick]:not([disabled])');
      if (first) pick(+first.dataset.pick);
    }
  });
  $('picker-list').addEventListener('click', function (e) {
    var b = e.target.closest('[data-pick]');
    if (b && !b.disabled) pick(+b.dataset.pick);
  });
  $('picker-close').addEventListener('click', closePicker);
  $('picker').addEventListener('click', function (e) { if (e.target === $('picker')) closePicker(); });
  document.addEventListener('keydown', function (e) { if (e.key === 'Escape' && state.picker) closePicker(); });

  // Speichern
  $('apply').addEventListener('click', apply);
  $('discard').addEventListener('click', function () {
    var sv = state.save;
    if (!sv || state.busy || !window.confirm(L().discardConfirm)) return;
    sv.work = sv.orig;
    sv.data = sv.base;
    state.result = null;
    render();
  });
  $('result').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b || !state.save || state.busy) return;
    var act = b.dataset.act, sv = state.save;
    if (act === 'download') {
      if (state.result && /^(writeFailed|conflict)$/.test(state.result.kind)) { markSaved(); state.result = { kind: 'download' }; }
      downloadFile(sv.orig, sv.name);
      render();
    } else if (act === 'reload') {
      // Aktuelle Datei neu einlesen (eigene, ungespeicherte Änderungen fallen dabei weg)
      if (sv.handle) sv.handle.getFile().then(function (f) { return load(f, sv.handle); });
    } else if (act === 'retry') apply();
    else if (act === 'undo') undo();
  });

  $('lang-toggle').addEventListener('click', function () {
    lang = lang === 'de' ? 'en' : 'de';
    try { localStorage.setItem('hub-lang', lang); } catch (e) {}
    render();
  });

  render();
})();
