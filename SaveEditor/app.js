/*
 * Save-Editor (früher „Sonderbonbons“) – einen Platin-Spielstand ändern, so einfach wie möglich:
 * Sonderbonbons, Attacken / getragenes Item / Freundschaft der Pokémon (Team und Boxen), Pokémon verschieben
 * (Team ↔ Box wie am PC im Spiel), der ganze Beutel,
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
  var KEY_ITEMS = 1, TMS = 2;                         // Taschen (PtBag.POCKETS)
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
      subtitle: 'Ändere deinen Platin-Spielstand: Pokémon (verschieben, Attacken, Items), Beutel samt Sonderbonbons und Geld – ohne extra Programm.',
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
      tabs: { mons: 'Pokémon', bag: 'Beutel', money: 'Geld' },
      badges: function (n) { return n === 1 ? '1 Orden' : n + ' Orden'; },
      playTime: function (h, m) { return 'Spielzeit ' + h + ':' + String(m).padStart(2, '0'); },
      // Pokémon
      team: 'Team',
      boxes: 'Boxen',
      boxOption: function (name, n) { return name + ' (' + n + ')'; },
      noTeam: 'Kein Pokémon im Team.',
      emptyBox: 'Diese Box ist leer.',
      pickMon: 'Wähle ein Pokémon aus.',
      inTeam: 'im Team',
      inBox: function (b) { return 'in ' + b; },
      shift: 'Verschieben',
      shiftWhere: function (n) { return 'Wohin mit <b>' + n + '</b>? Tippe einen Platz im Team oder in der Box an – ist er belegt, wird getauscht.'; },
      shiftCancel: 'Abbrechen',
      shiftFree: 'Freier Platz',
      shiftHint: 'Verschieben: Pokémon antippen → „Verschieben“ → Ziel antippen. Am PC geht auch Ziehen.',
      shiftFull: 'Das Team ist voll. Lege erst ein Pokémon ab – oder tippe ein Team-Pokémon an, dann wird getauscht.',
      shiftLast: 'Im Team muss mindestens ein kampffähiges Pokémon bleiben (kein Ei) – wie im Spiel.',
      shiftMail: 'Ein Pokémon mit Brief kann nicht in die Box – im Spiel auch nicht, der Brieftext ginge verloren. Nimm den Brief erst ab (Getragenes Item → ×).',
      shiftBroken: 'Dieser Teil des Spielstands ist beschädigt – hier wird nichts verschoben.',
      placeTeam: 'Team',
      chSlot: function (box, a, b) { return box + ': Platz ' + a + ' → ' + b; },
      chTeamOrder: 'neue Reihenfolge',
      chNew: function (p) { return 'neu (' + p + ')'; },
      chReleased: 'freigelassen',
      addNew: '+ Pokémon hinzufügen',
      addTitle: 'Neues Pokémon',
      addSpecies: 'Art', addPickSpecies: 'Art wählen …', pickSpecies: 'Pokémon wählen',
      addLevel: 'Level',
      addIvs: 'DVs', addIvsRandom: 'Zufällig (wie gefangen)', addIvsPerfect: 'Perfekt (alle 31)',
      addMore: 'Mehr: Wesen, Geschlecht, Fähigkeit, Shiny, Ball, Fangort',
      addNature: 'Wesen', addGender: 'Geschlecht', addAbility: 'Fähigkeit', addShiny: 'Shiny', addBall: 'Ball', addLoc: 'Fangort',
      addRandom: 'Zufällig', male: '♂ männlich', female: '♀ weiblich', onlyMale: 'nur ♂', onlyFemale: 'nur ♀', genderless: 'geschlechtslos',
      addPlace: 'Platz wählen →', addCancel: 'Abbrechen',
      addNote: function (n, id) { return 'Trainer: ' + n + ' (ID ' + id + '). Attacken wie bei einem wilden Pokémon auf diesem Level – danach wie gewohnt änderbar. Im Pokédex wird es als gefangen eingetragen.'; },
      addWhere: function (n) { return 'Wohin mit dem neuen <b>' + n + '</b>? Tippe einen freien Platz im Team oder in der Box an.'; },
      addTaken: 'Der Platz ist belegt – tippe einen freien Platz an.',
      addLoading: 'Attacken werden geladen …',
      addNoMoves: 'Die Attacken ließen sich nicht laden (offline?) – „Tackle“ ist eingetragen, ändere sie unten.',
      release: 'Freilassen',
      releaseConfirm: function (n) { return n + ' freilassen? Es verschwindet aus dem Spielstand. Bis du speicherst, kannst du alles noch verwerfen.'; },
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
      backups: function (n) { return 'Frühere Fassungen dieser Datei (' + n + ')'; },
      backupsHint: 'Vor jedem Speichern legt der Editor die bisherige Datei hier auf dem Gerät ab (die letzten 5).',
      backupUse: 'Übernehmen',
      backupUseTitle: 'In den Editor laden – mit „Speichern“ wird sie dann zurückgeschrieben',
      backupDownload: 'Herunterladen',
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
      subtitle: 'Change your Platinum save file: Pokémon (move them, moves, items), the bag incl. Rare Candies, and money – no extra program.',
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
      tabs: { mons: 'Pokémon', bag: 'Bag', money: 'Money' },
      badges: function (n) { return n === 1 ? '1 badge' : n + ' badges'; },
      playTime: function (h, m) { return 'Play time ' + h + ':' + String(m).padStart(2, '0'); },
      team: 'Party',
      boxes: 'Boxes',
      boxOption: function (name, n) { return name + ' (' + n + ')'; },
      noTeam: 'No Pokémon in the party.',
      emptyBox: 'This box is empty.',
      pickMon: 'Choose a Pokémon.',
      inTeam: 'in the party',
      inBox: function (b) { return 'in ' + b; },
      shift: 'Move',
      shiftWhere: function (n) { return 'Where to put <b>' + n + '</b>? Tap a party or box slot – if it is taken, they swap.'; },
      shiftCancel: 'Cancel',
      shiftFree: 'Free slot',
      shiftHint: 'Moving: tap a Pokémon → “Move” → tap the target. On a computer you can also drag.',
      shiftFull: 'The party is full. Deposit a Pokémon first – or tap a party Pokémon to swap.',
      shiftLast: 'At least one Pokémon that can battle (not an egg) has to stay in the party – just like in the game.',
      shiftMail: 'A Pokémon holding Mail cannot go into the box – the game doesn’t allow it either, the message would be lost. Take the Mail first (Held item → ×).',
      shiftBroken: 'This part of the save file is damaged – nothing is moved here.',
      placeTeam: 'Party',
      chSlot: function (box, a, b) { return box + ': slot ' + a + ' → ' + b; },
      chTeamOrder: 'new order',
      chNew: function (p) { return 'new (' + p + ')'; },
      chReleased: 'released',
      addNew: '+ Add Pokémon',
      addTitle: 'New Pokémon',
      addSpecies: 'Species', addPickSpecies: 'Choose species …', pickSpecies: 'Choose a Pokémon',
      addLevel: 'Level',
      addIvs: 'IVs', addIvsRandom: 'Random (like a catch)', addIvsPerfect: 'Perfect (all 31)',
      addMore: 'More: nature, gender, ability, shiny, ball, location',
      addNature: 'Nature', addGender: 'Gender', addAbility: 'Ability', addShiny: 'Shiny', addBall: 'Ball', addLoc: 'Met at',
      addRandom: 'Random', male: '♂ male', female: '♀ female', onlyMale: 'male only', onlyFemale: 'female only', genderless: 'genderless',
      addPlace: 'Choose a slot →', addCancel: 'Cancel',
      addNote: function (n, id) { return 'Trainer: ' + n + ' (ID ' + id + '). Moves like a wild Pokémon at this level – you can change them afterwards. It is registered as caught in the Pokédex.'; },
      addWhere: function (n) { return 'Where should the new <b>' + n + '</b> go? Tap a free party or box slot.'; },
      addTaken: 'This slot is taken – tap a free one.',
      addLoading: 'Loading moves …',
      addNoMoves: 'The moves could not be loaded (offline?) – “Tackle” was set, change it below.',
      release: 'Release',
      releaseConfirm: function (n) { return 'Release ' + n + '? It disappears from the save file. Until you save, you can still discard everything.'; },
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
      backups: function (n) { return 'Earlier versions of this file (' + n + ')'; },
      backupsHint: 'Before every save, the editor keeps the previous file here on this device (the last 5).',
      backupUse: 'Use',
      backupUseTitle: 'Load into the editor – “Save” then writes it back',
      backupDownload: 'Download',
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
  // shift = Platz des Pokémon, das gerade verschoben wird (wKey); shiftNote = warum es nicht ging;
  // add = Formular für ein neues Pokémon (placing: jetzt einen freien Platz antippen)
  var state = { save: null, tab: 'mons', mon: null, box: 0, pocket: 0, picker: null, busy: false, result: null, error: '', backups: [], shift: null, shiftNote: '', add: null };

  var $ = function (id) { return document.getElementById(id); };
  function narrow() { return !!(window.matchMedia && matchMedia('(max-width: 860px)').matches); }
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
  // Ein Pokémon erkennt man an PID + Trainer-ID – das bleibt auch beim Verschieben gleich
  function monId(m) { return m.pid + '-' + m.tid + '-' + m.sid; }
  function allMons(d) {
    var out = d.party.slice();
    d.boxes.forEach(function (bx) { bx.slots.forEach(function (m) { if (m) out.push(m); }); });
    return out;
  }
  // Dasselbe Pokémon im zuletzt gespeicherten Stand (egal, wo es dort lag)
  function origOf(m) {
    if (!m || !state.save) return null;
    var id = monId(m);
    return allMons(state.save.base).filter(function (o) { return monId(o) === id; })[0] || null;
  }
  function placeName(w) { return w.area === 'party' ? L().placeTeam : boxName(w.box); }
  function isChanged(m) {
    var o = origOf(m);
    return !o || monDiff(o, m).length > 0 || wKey(o.where) !== wKey(m.where);   // ohne Gegenstück = neu
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

  /* ── Sicherungen: bisherige Fassung vor jedem Speichern (IndexedDB, je Dateiname die letzten 5) ── */
  // „Rückgängig“ gilt nur, solange die Seite offen ist – die Sicherungen bleiben auch nach Schließen oder Absturz.
  var Backups = (function () {
    var KEEP = 5, dbp = null;
    function db() {
      if (!dbp) {
        dbp = new Promise(function (res, rej) {
          if (!window.indexedDB) { rej(new Error('no idb')); return; }
          var r = indexedDB.open('pokehub-saveeditor', 1);
          r.onupgradeneeded = function () { r.result.createObjectStore('backups', { keyPath: 'id', autoIncrement: true }); };
          r.onsuccess = function () { res(r.result); };
          r.onerror = function () { rej(r.error); };
        });
      }
      return dbp;
    }
    function run(mode, fn) {
      return db().then(function (d) {
        return new Promise(function (res, rej) {
          var t = d.transaction('backups', mode), req = fn(t.objectStore('backups'));
          t.oncomplete = function () { res(req && req.result); };
          t.onerror = t.onabort = function () { rej(t.error); };
        });
      });
    }
    // Neueste zuerst
    function list(name) {
      return run('readonly', function (s) { return s.getAll(); }).then(function (all) {
        return (all || []).filter(function (b) { return b.name === name; })
          .sort(function (a, b) { return b.savedAt - a.savedAt; });
      }).catch(function () { return []; });
    }
    function add(name, bytes) {
      return list(name).then(function (have) {
        if (have[0] && sameBytes(new Uint8Array(have[0].bytes), bytes)) return have;   // schon gesichert
        return run('readwrite', function (s) {
          s.put({ name: name, savedAt: Date.now(), bytes: new Uint8Array(bytes).buffer });
          have.slice(KEEP - 1).forEach(function (old) { s.delete(old.id); });
        });
      }).catch(function (e) { console.error('Sicherung fehlgeschlagen:', e); });
    }
    return { list: list, add: add };
  })();

  function refreshBackups() {
    var sv = state.save;
    if (!sv) { state.backups = []; return Promise.resolve(); }
    return Backups.list(sv.name).then(function (list) {
      if (state.save === sv) { state.backups = list; render(); }
    });
  }

  // Ungespeicherte Änderungen oder laufender Schreibvorgang: pwa.js lädt eine neue Version dann noch nicht
  window.PokeHubBusy = function () { var sv = state.save; return state.busy || (!!sv && !sameBytes(sv.orig, sv.work)); };

  /* ── Datei laden ───────────────────────────────────────────────── */
  function load(file, handle) {
    state.error = '';
    state.result = null;
    state.picker = null;
    state.shift = null;
    state.shiftNote = '';
    state.add = null;
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
      state.backups = [];
      refreshBackups();
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

  // Verschieben (PtEdit.moveMon): danach bleibt das Pokémon ausgewählt. Geht es nicht, steht der Grund über der
  // Liste; bei vollem Team bleibt der Verschiebe-Modus an, damit man gleich ein anderes Ziel antippen kann.
  function shiftTo(fromKey, toKey) {
    var sv = state.save, l = L(), from = wParse(fromKey), to = wParse(toKey);
    state.shift = null;
    state.shiftNote = '';
    if (sv && from && to && fromKey !== toKey) {
      try {
        var r = PtEdit.moveMon(sv.work, from, to, D);
        var data = PtSave.parse(r.bytes, D);
        if (!data.ok) throw new Error('check');
        sv.work = r.bytes;
        sv.data = data;
        state.mon = r.where;
        state.result = null;
      } catch (err) {
        var code = err && err.code;
        if (code === 'full') state.shift = fromKey;
        state.shiftNote = code === 'full' ? l.shiftFull : code === 'last' ? l.shiftLast : code === 'mail' ? l.shiftMail
          : code === 'broken' ? l.shiftBroken : l.errEdit + (err && err.message);
      }
    }
    render();
  }

  function bagOf(bytes) { return PtBag.read(bytes) || PtBag.POCKETS.map(function () { return []; }); }

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
      var o = origOf(m), parts = monDiff(o, m);
      if (!o) parts.push(l.chNew(placeName(m.where)));
      else if (o.where.area !== m.where.area || o.where.box !== m.where.box) parts.push(l.chFrom(placeName(o.where), placeName(m.where)));
      else if (o && o.where.area === 'box' && o.where.slot !== m.where.slot) parts.push(l.chSlot(boxName(m.where.box), o.where.slot + 1, m.where.slot + 1));
      if (parts.length) out.push('<b>' + esc(monName(m)) + '</b> ' + esc(parts.join(', ')));
    });
    var now = {};
    mons(b, function (m) { now[monId(m)] = true; });
    mons(a, function (m) { if (!now[monId(m)]) out.push('<b>' + esc(monName(m)) + '</b> ' + esc(l.chReleased)); });
    // Reihenfolge im Team: nur die Pokémon, die vorher und nachher im Team sind (Aufrücken zählt nicht)
    var ids = function (d) { return d.party.map(monId); };
    var before = ids(a), after = ids(b);
    var kept = function (list, other) { return list.filter(function (id) { return other.indexOf(id) >= 0; }).join(); };
    if (kept(before, after) !== kept(after, before)) out.push('<b>' + esc(l.team) + '</b> ' + esc(l.chTeamOrder));
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
    Backups.add(sv.name, sv.orig).then(function () {
      return writeHandle(sv.handle, out, sv.orig);
    }).then(function (ok) {
      if (ok === 'conflict') state.result = { kind: 'conflict' };
      else if (ok) { markSaved(); state.result = { kind: 'direct' }; }
      else if (sv.handle && sv.handle.createWritable) state.result = { kind: 'writeFailed' };
      else { downloadFile(out, sv.name); markSaved(); state.result = { kind: 'download' }; }
    }).then(function () {
      state.busy = false;
      render();
      refreshBackups();
    });
  }

  function undo() {
    var sv = state.save;
    if (!sv || !sv.before || state.busy) return;
    state.busy = true;
    render();
    var before = sv.before;
    Backups.add(sv.name, sv.orig).then(function () {
      return writeHandle(sv.handle, before, sv.orig);
    }).then(function (ok) {
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
      state.shift = null;
      if (state.mon && !monAt(sv.data, state.mon)) state.mon = sv.data.party[0] ? sv.data.party[0].where : null;
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
  function monCard(m, cls) {
    return '<button type="button" class="ed-pk' + cls + '" data-act="mon" data-w="' + wKey(m.where) + '" draggable="true">' +
      icon(m) + '<span><b>' + esc(monName(m)) + '</b><small>' + (m.isEgg ? '' : 'Lv. ' + m.level) + '</small></span></button>';
  }

  // Team und Box. Beim Verschieben (state.shift = Platz des Pokémon) sind auch leere Plätze Ziele;
  // im Team steht dann „+ Freier Platz“ (= ans Ende, das Team bleibt lückenlos).
  function monsHtml() {
    var sv = state.save, l = L(), d = sv.data, cur = wKey(state.mon || { area: 'x' });
    var cls = function (m) {
      var k = wKey(m.where);
      return (k === cur ? ' is-active' : '') + (isChanged(m) ? ' is-changed' : '') + (k === state.shift ? ' is-shifting' : '');
    };
    var free = d.party.length < 6 ? '<button type="button" class="ed-pk ed-pk-free" data-act="mon" data-w="p' + d.party.length + '">' +
      '<i aria-hidden="true">+</i><span><b>' + esc(l.shiftFree) + '</b></span></button>' : '';
    var team = (d.party.length || state.shift) ? '<div class="ed-team">' + d.party.map(function (m) {
      return monCard(m, cls(m));
    }).join('') + free + '</div>' : '<p class="muted">' + esc(l.noTeam) + '</p>';

    var opts = d.boxes.map(function (b, i) {
      var n = b.slots.filter(Boolean).filter(function (m) { return m.species; }).length;
      return '<option value="' + i + '"' + (i === state.box ? ' selected' : '') + '>' + esc(l.boxOption(boxName(i), n)) + '</option>';
    }).join('');
    var box = d.boxes[state.box];
    var slots = box.slots.map(function (m, i) {
      if (!m) return '<button type="button" class="ed-slot is-empty" data-act="mon" data-w="b' + state.box + '-' + i + '" tabindex="-1" aria-label="' + esc(l.shiftFree) + '"></button>';
      var k = wKey(m.where);
      return '<button type="button" class="ed-slot' + cls(m) + '" data-act="mon" data-w="' + k + '" draggable="true" title="' + esc(monName(m) + (m.isEgg ? '' : ' · Lv. ' + m.level)) + '">' + icon(m) + '</button>';
    }).join('');

    var moving = state.shift && monAt(d, wParse(state.shift));
    var placing = state.add && state.add.placing;
    var bar = moving ? '<div class="ed-shiftbar" role="status"><span>' + l.shiftWhere(esc(monName(moving))) + '</span>' +
      '<button type="button" class="small-btn" data-act="shift-cancel">' + esc(l.shiftCancel) + '</button></div>'
      : placing ? '<div class="ed-shiftbar" role="status"><span>' + (state.add.loading ? esc(l.addLoading) : l.addWhere(esc(T().species[state.add.species]))) + '</span>' +
      '<button type="button" class="small-btn" data-act="add-back">' + esc(l.shiftCancel) + '</button></div>' : '';
    var note = state.shiftNote ? '<p class="ed-shiftnote" role="alert">' + esc(state.shiftNote) + '</p>' : '';

    return '<div class="ed-mons' + (moving || placing ? ' is-shifting' : '') + '">' +
      '<div class="ed-list" id="ed-list">' + bar + note +
        '<h3>' + esc(l.team) + '</h3>' + team +
        '<h3>' + esc(l.boxes) + '</h3>' +
        '<select class="ed-select" data-act="box">' + opts + '</select>' +
        '<div class="ed-box">' + slots + '</div>' +
        (state.add ? '' : '<button type="button" class="ed-add" data-act="add-new">' + esc(l.addNew) + '</button>') +
        '<p class="ed-hint">' + esc(l.shiftHint) + '</p>' +
      '</div>' +
      '<div class="ed-detail" id="ed-detail">' + (state.add ? addFormHtml() : monDetailHtml(monAt(d, state.mon))) + '</div>' +
    '</div>';
  }

  /* ── Neues Pokémon ─────────────────────────────────────────────── */
  var BALLS = [4, 3, 2, 1, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 5];   // Pokéball zuerst, Safariball zuletzt
  function newAdd() { return { species: 0, level: 5, ivs: 'random', nature: '', gender: '', ability: '', shiny: false, ball: 4, loc: 0, more: false }; }

  // Formular: Art und Level, DVs zufällig/perfekt, „Mehr“ für Wesen, Geschlecht, Fähigkeit, Shiny, Ball, Fangort
  function addFormHtml() {
    var a = state.add, l = L(), t = T(), sv = state.save, sp = a.species;
    var p = sp ? PtSave.personalEntry(D, sp, 0) : null;
    var opt = function (v, text, cur) { return '<option value="' + v + '"' + (String(v) === String(cur) ? ' selected' : '') + '>' + esc(text) + '</option>'; };
    var field = function (label, html) { return '<label class="ed-field"><span>' + esc(label) + '</span>' + html + '</label>'; };
    var gender = '', ability = '';
    if (p) {
      var ratio = p[8];
      gender = ratio > 0 && ratio < 254
        ? '<select class="ed-select" data-act="add-gender">' + opt('', l.addRandom, a.gender) + opt(0, l.male, a.gender) + opt(1, l.female, a.gender) + '</select>'
        : '<span class="ed-fixed">' + esc(ratio === 255 ? l.genderless : ratio === 254 ? l.onlyFemale : l.onlyMale) + '</span>';
      ability = p[11] && p[11] !== p[10]
        ? '<select class="ed-select" data-act="add-ability">' + opt('', l.addRandom, a.ability) + opt(0, t.abilities[p[10]], a.ability) + opt(1, t.abilities[p[11]], a.ability) + '</select>'
        : '<span class="ed-fixed">' + esc(t.abilities[p[10]]) + '</span>';
    }
    var natures = opt('', l.addRandom, a.nature) + t.natures.map(function (n, i) { return opt(i, n, a.nature); }).join('');
    var balls = BALLS.map(function (id) { return opt(id, itemName(id), a.ball); }).join('');
    // Fangorte in Sinnoh (Spielreihenfolge; ab 126 beginnen Johto und Kanto)
    var locs = opt(0, t.loc0[0], a.loc) + t.loc0.slice(1, 126).map(function (n, i) { return n ? opt(i + 1, n, a.loc) : ''; }).join('');
    var tr = sv.data.trainer;
    return '<div class="ed-mon-head"><div class="ed-mon-title"><b>' + esc(l.addTitle) + '</b></div></div>' +
      '<div class="ed-add-form">' +
        field(l.addSpecies, '<button type="button" class="ed-move-btn" data-act="add-species">' +
          (sp ? icon({ species: sp }) + '<span><b>' + esc(t.species[sp]) + '</b><small>#' + sp + '</small></span>' : '<span><b>' + esc(l.addPickSpecies) + '</b></span>') + '</button>') +
        field(l.addLevel, '<input type="number" class="ed-qty" min="1" max="100" step="1" value="' + a.level + '" data-act="add-level">') +
        field(l.addIvs, '<span class="ed-seg" role="group">' + ['random', 'perfect'].map(function (v) {
          return '<button type="button" class="ed-seg-btn' + (a.ivs === v ? ' is-on' : '') + '" data-act="add-ivs" data-v="' + v + '" aria-pressed="' + (a.ivs === v) + '">' +
            esc(v === 'random' ? l.addIvsRandom : l.addIvsPerfect) + '</button>';
        }).join('') + '</span>') +
        '<details class="ed-more"' + (a.more ? ' open' : '') + '><summary data-act="add-more">' + esc(l.addMore) + '</summary><div class="ed-more-grid">' +
          field(l.addNature, '<select class="ed-select" data-act="add-nature">' + natures + '</select>') +
          (p ? field(l.addGender, gender) + field(l.addAbility, ability) : '') +
          field(l.addShiny, '<input type="checkbox" data-act="add-shiny"' + (a.shiny ? ' checked' : '') + '>') +
          field(l.addBall, '<select class="ed-select" data-act="add-ball">' + balls + '</select>') +
          field(l.addLoc, '<select class="ed-select" data-act="add-loc">' + locs + '</select>') +
        '</div></details>' +
        '<div class="btn-row">' +
          '<button type="button" class="small-btn is-on" data-act="add-place"' + (sp ? '' : ' disabled') + '>' + esc(l.addPlace) + '</button>' +
          '<button type="button" class="small-btn" data-act="add-cancel">' + esc(l.addCancel) + '</button>' +
        '</div>' +
        '<p class="ed-hint">' + esc(l.addNote(tr.name, tr.tid)) + '</p>' +
      '</div>';
  }

  // Level-Attacken in Platin (PokéAPI), wie beim Boss-Planer: der Reihe nach, bei vier fliegt die älteste raus
  var learnCache = {};
  function levelMoves(species, level) {
    var p = learnCache[species];
    if (!p) {
      p = learnCache[species] = fetch('https://pokeapi.co/api/v2/pokemon/' + species).then(function (r) {
        if (!r.ok) throw new Error(r.status);
        return r.json();
      }).then(function (d) {
        var list = [];
        d.moves.forEach(function (m) {
          var id = +((/\/move\/(\d+)\//.exec(m.move.url) || [])[1]);
          if (!id || id > 467) return;
          m.version_group_details.forEach(function (v) {
            if (v.version_group.name === 'platinum' && v.move_learn_method.name === 'level-up') list.push([v.level_learned_at, id]);
          });
        });
        return list.sort(function (x, y) { return x[0] - y[0]; });
      });
      p.catch(function () { delete learnCache[species]; });
    }
    return p.then(function (list) {
      var known = [];
      list.forEach(function (e) {
        if (e[0] > level || known.indexOf(e[1]) >= 0) return;
        if (known.length === 4) known.shift();
        known.push(e[1]);
      });
      return known.length ? known : null;
    });
  }

  // Freien Platz angetippt: Attacken abwarten, Pokémon erzeugen und dort ablegen
  function placeNew(key) {
    var a = state.add, sv = state.save, l = L(), to = wParse(key);
    if (!a || a.loading || !to) return;
    if (monAt(sv.data, to)) { state.shiftNote = l.addTaken; render(); return; }
    a.loading = true;
    state.shiftNote = '';
    render();
    (a.moves || Promise.resolve(null)).then(null, function () { return null; }).then(function (moves) {
      a.loading = false;
      if (state.add !== a || state.save !== sv) return;   // inzwischen abgebrochen oder andere Datei
      try {
        var num = function (v) { return v === '' ? null : +v; };
        var dec = PtEdit.createMon(sv.work, {
          species: a.species, level: a.level, moves: moves || [], ivs: a.ivs, shiny: a.shiny, ball: a.ball, location: a.loc,
          nature: num(a.nature), gender: num(a.gender), ability: num(a.ability)
        }, D);
        var r = PtEdit.addMon(sv.work, to, dec, D);
        var data = PtSave.parse(r.bytes, D);
        if (!data.ok) throw new Error('check');
        sv.work = r.bytes;
        sv.data = data;
        state.mon = r.where;
        state.add = null;
        state.result = null;
        state.shiftNote = moves ? '' : l.addNoMoves;
      } catch (err) {
        var code = err && err.code;
        state.shiftNote = code === 'full' ? l.shiftFull : code === 'taken' ? l.addTaken : code === 'broken' ? l.shiftBroken : l.errEdit + (err && err.message);
      }
      render();
    });
  }

  function monDetailHtml(m) {
    var l = L(), t = T(), sv = state.save;
    if (!m) return '<p class="muted">' + esc(l.pickMon) + '</p>';
    var changed = monDiff(origOf(m), m).length > 0;
    var where = m.where.area === 'party' ? l.inTeam : l.inBox(boxName(m.where.box));
    var shifting = state.shift === wKey(m.where);
    var head = '<div class="ed-mon-head">' +
      (m.isEgg ? icon(m) : '<img class="ed-mon-img" src="' + PT_SPR + m.species + '.png" alt="" loading="lazy">') +
      '<div class="ed-mon-title"><b>' + esc(monName(m)) + '</b>' +
        '<span>' + (m.isEgg ? '' : 'Lv. ' + m.level + ' · ') + esc(where) + '</span>' +
        (m.isEgg ? '' : '<div class="types">' + m.types.map(typeBadge).join('') + '</div>') +
      '</div>' +
      '<div class="ed-mon-actions">' +
        '<button type="button" class="small-btn' + (shifting ? ' is-on' : '') + '" data-act="' + (shifting ? 'shift-cancel' : 'shift') + '" aria-pressed="' + shifting + '">⇄ ' + esc(l.shift) + '</button>' +
        (changed ? '<button type="button" class="small-btn" data-act="mon-reset">↶ ' + esc(l.resetMon) + '</button>' : '') +
        '<button type="button" class="small-btn ed-danger" data-act="release">' + esc(l.release) + '</button>' +
      '</div>' +
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
    $('ed-tabs').innerHTML = ['mons', 'bag', 'money'].map(function (k) {
      return '<button type="button" role="tab" class="ed-tab' + (k === state.tab ? ' is-active' : '') + '" data-act="tab" data-tab="' + k + '" aria-selected="' + (k === state.tab) + '">' + esc(l.tabs[k]) + '</button>';
    }).join('');
    $('ed-panel').innerHTML = state.tab === 'mons' ? monsHtml() : state.tab === 'bag' ? bagHtml() : moneyHtml();
  }

  /* ── Auswahlliste (Attacken, Items) ────────────────────────────── */
  function pickerOptions(p) {
    var t = T(), l = L(), out = [];
    if (p.kind === 'species') {
      for (var sp = 1; sp <= 493; sp++) {
        out.push({ id: sp, name: t.species[sp], html: icon({ species: sp }) + '<span><b>' + esc(t.species[sp]) + '</b><small>#' + sp + '</small></span>' });
      }
      return out;                                   // Pokédex-Reihenfolge
    }
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
    $('picker-title').textContent = p.kind === 'species' ? l.pickSpecies : p.kind === 'move' ? l.pickMove : p.kind === 'held' ? l.pickItem : l.pickBag(l.pockets[p.pocket]);
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
    if (p.kind === 'species') {
      if (!state.add) return;
      state.add.species = id;
      state.add.gender = state.add.ability = '';     // hängen von der Art ab
      render();
      return;
    }
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
      (team ? '<div class="save-team">' + team + '</div>' : '') +
      backupsHtml();
  }

  function backupsHtml() {
    var l = L(), list = state.backups;
    if (!list.length) return '';
    var fmt = function (t) { return new Date(t).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US', { dateStyle: 'short', timeStyle: 'short' }); };
    return '<details class="backups"><summary>' + esc(l.backups(list.length)) + '</summary>' +
      '<p class="muted">' + esc(l.backupsHint) + '</p><ul>' + list.map(function (b) {
        return '<li><span>' + esc(fmt(b.savedAt)) + '</span>' +
          '<button type="button" class="small-btn" data-backup="' + b.id + '" data-act="use" title="' + esc(l.backupUseTitle) + '">' + esc(l.backupUse) + '</button>' +
          '<button type="button" class="small-btn" data-backup="' + b.id + '" data-act="download">⭳ ' + esc(l.backupDownload) + '</button></li>';
      }).join('') + '</ul></details>';
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
    // „Mehr“ beim neuen Pokémon: offen/zu merken (der Browser klappt danach selbst um)
    var more = e.target.closest('summary[data-act="add-more"]');
    if (more && state.add) state.add.more = !more.parentNode.open;
    var b = e.target.closest('button[data-act]');
    if (!b || b.disabled || !state.save || state.busy) return;
    var act = b.dataset.act, sv = state.save;
    if (act === 'tab') { state.tab = b.dataset.tab; render(); }
    else if (act === 'mon') {
      if (state.shift) { shiftTo(state.shift, b.dataset.w); return; }   // Ziel angetippt (Quelle selbst = abbrechen)
      if (state.add && state.add.placing) { placeNew(b.dataset.w); return; }
      state.add = null;                                                   // Formular schließen, Pokémon zeigen
      var w = wParse(b.dataset.w);
      if (!monAt(sv.data, w)) return;                                     // leerer Platz ist nur beim Verschieben ein Ziel
      state.mon = w;
      state.shiftNote = '';
      render();
      // Schmale Ansicht: Bearbeiten steht unter der Liste – dorthin scrollen
      var det = $('ed-detail');
      if (det && narrow()) det.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (act === 'shift') {
      state.shift = state.mon ? wKey(state.mon) : null;
      state.shiftNote = '';
      render();
      // Schmale Ansicht: Team und Box stehen über dem Bearbeiten – dorthin, um das Ziel anzutippen
      var list = $('ed-list');
      if (list && narrow()) list.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (act === 'shift-cancel') { state.shift = null; state.shiftNote = ''; render(); }
    else if (act === 'add-new') {
      state.add = newAdd();
      state.shift = null;
      state.shiftNote = '';
      render();
      if (narrow() && $('ed-detail')) $('ed-detail').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (act === 'add-species') openPicker({ kind: 'species' });
    else if (act === 'add-ivs') { state.add.ivs = b.dataset.v; render(); }
    else if (act === 'add-place' && state.add && state.add.species) {
      state.add.placing = true;
      // lädt schon, während man den Platz sucht; offline → null (dann „Tackle“ und ein Hinweis)
      state.add.moves = levelMoves(state.add.species, state.add.level).then(null, function () { return null; });
      state.shiftNote = '';
      render();
      if (narrow() && $('ed-list')) $('ed-list').scrollIntoView({ behavior: 'smooth', block: 'start' });
    } else if (act === 'add-back') { if (state.add) state.add.placing = false; state.shiftNote = ''; render(); }
    else if (act === 'add-cancel') { state.add = null; state.shiftNote = ''; render(); }
    else if (act === 'release') {
      var rm = monAt(sv.data, state.mon);
      if (!rm || !window.confirm(L().releaseConfirm(monName(rm)))) return;
      try {
        var rr = PtEdit.releaseMon(sv.work, state.mon), rd = PtSave.parse(rr.bytes, D);
        if (!rd.ok) throw new Error('check');
        sv.work = rr.bytes;
        sv.data = rd;
        state.mon = rd.party[0] ? rd.party[0].where : null;
        state.result = null;
        state.shiftNote = '';
      } catch (err) {
        state.shiftNote = err && err.code === 'last' ? L().shiftLast : err && err.code === 'broken' ? L().shiftBroken : L().errEdit + (err && err.message);
      }
      render();
    }
    else if (act === 'mon-reset') {
      // Nur die Änderungen hier (Item, Freundschaft, Attacken) – das Pokémon kann inzwischen woanders liegen
      var om = origOf(monAt(sv.data, state.mon)), od = om && PtEdit.readMon(sv.orig, om.where);
      if (od) editMon(state.mon, function (d) { d.set(od.subarray(0x0A, 0x0C), 0x0A); d[0x14] = od[0x14]; d.set(od.subarray(0x28, 0x38), 0x28); });
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
  // Am PC: Pokémon auf einen Platz ziehen – wie „Verschieben“ und Ziel antippen
  var dragFrom = null;
  function dragTarget(e) { return e.target.closest && e.target.closest('[data-act="mon"][data-w]'); }
  function dragClean() {
    Array.prototype.forEach.call(document.querySelectorAll('.is-drop'), function (x) { x.classList.remove('is-drop'); });
    var m = document.querySelector('.ed-mons.is-dragging');
    if (m) m.classList.remove('is-dragging');
  }
  $('ed').addEventListener('dragstart', function (e) {
    var b = dragTarget(e);
    if (!b || b.getAttribute('draggable') !== 'true' || !state.save || state.busy) return;
    dragFrom = b.dataset.w;
    e.dataTransfer.effectAllowed = 'move';
    try { e.dataTransfer.setData('text/plain', dragFrom); } catch (err) { /* nur für Firefox nötig */ }
    var box = b.closest('.ed-mons');
    if (box) box.classList.add('is-dragging');
  });
  $('ed').addEventListener('dragover', function (e) {
    var t = dragFrom && dragTarget(e);
    if (!t) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (!t.classList.contains('is-drop')) { dragClean(); t.classList.add('is-drop'); t.closest('.ed-mons').classList.add('is-dragging'); }
  });
  $('ed').addEventListener('drop', function (e) {
    var t = dragFrom && dragTarget(e), from = dragFrom;
    dragFrom = null;
    dragClean();
    if (!t) return;
    e.preventDefault();
    shiftTo(from, t.dataset.w);
  });
  $('ed').addEventListener('dragend', function () { dragFrom = null; dragClean(); });
  document.addEventListener('keydown', function (e) {
    if (e.key !== 'Escape' || state.picker) return;
    if (state.shift) { state.shift = null; render(); }
    else if (state.add && state.add.placing) { state.add.placing = false; render(); }
  });

  // Eingaben im Editor (Zahlen, Box-Auswahl, Freundschaft)
  $('ed').addEventListener('change', function (e) {
    var el = e.target, act = el.dataset.act;
    if (!act || !state.save || state.busy) return;
    if (act === 'box') { state.box = +el.value; render(); }
    else if (/^add-/.test(act) && state.add) {
      // Nur merken, nicht neu zeichnen: sonst ginge z. B. der Klick auf „Platz wählen“ direkt nach dem Tippen verloren
      var a = state.add, k = act.slice(4);
      if (k === 'level') el.value = a.level = Math.max(1, Math.min(100, Math.round(+el.value) || 1));
      else if (k === 'shiny') a.shiny = el.checked;
      else if (k === 'ball' || k === 'loc') a[k] = +el.value;
      else a[k] = el.value;                                   // nature, gender, ability ('' = zufällig)
    }
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
    state.shift = null;
    state.shiftNote = '';
    if (state.mon && !monAt(sv.data, state.mon)) state.mon = sv.data.party[0] ? sv.data.party[0].where : null;
    render();
  });
  $('save-card').addEventListener('click', function (e) {
    var b = e.target.closest('[data-backup]');
    if (!b || !state.save || state.busy) return;
    var rec = state.backups.filter(function (x) { return String(x.id) === b.dataset.backup; })[0];
    if (!rec) return;
    if (b.dataset.act === 'download') downloadFile(new Uint8Array(rec.bytes), state.save.name);
    // Als Arbeitskopie übernehmen – geprüft wie jede Änderung; zurückgeschrieben wird erst mit „Speichern“
    else change(function () { return new Uint8Array(rec.bytes); });
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
