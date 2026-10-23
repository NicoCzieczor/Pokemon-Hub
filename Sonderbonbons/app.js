/*
 * Sonderbonbons – Sonderbonbons in einen Platin-Spielstand legen, so einfach wie möglich.
 *
 * Gelesen und geschrieben wird mit PtSave (pt-save.js) und PtBag (pt-bag.js) aus dem Save-Viewer.
 * Wo der Browser es kann (Chrome/Edge am PC), wird die ausgewählte Datei direkt ersetzt
 * (File System Access API) – dann muss niemand Dateien herumschieben. Sonst gibt es die geänderte
 * Datei als Download mit genau demselben Namen.
 */
(function () {
  'use strict';

  var D = window.PT_DATA;
  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
  var ICON_SPR = SPR + '/pokemon/versions/generation-vii/icons/';
  var CANDY_IMG = SPR + '/items/rare-candy.png';
  var MEDICINE = 4;                                  // Tasche der Sonderbonbons (PtBag.POCKETS)
  var MAX = PtBag.POCKETS[MEDICINE].max;             // 999
  // Handy/Tablet: kein direktes Ersetzen (gibt es dort nicht zuverlässig), Anleitung für Emulator-Apps
  var PHONE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);

  var I18N = {
    de: {
      title1: 'Sonder', title2: 'bonbons',
      subtitle: 'Gib dir Sonderbonbons in deinen Platin-Spielstand – drei Schritte, ohne extra Programm.',
      s1Title: 'Im Spiel speichern, Emulator schließen',
      s1Text: 'Speichere ganz normal im Spiel (Menü → Bericht). Schließe danach den Emulator komplett – sonst überschreibt er deine Datei gleich wieder.',
      s2Title: 'Spielstand auswählen',
      dropTitle: 'Spielstand hier reinziehen oder antippen',
      dropSub: 'Datei endet auf .sav oder .dsv. Sie bleibt auf deinem Gerät und wird nirgendwo hochgeladen.',
      dropOther: 'Anderen Spielstand wählen',
      whereTitle: 'Wo liegt mein Spielstand?',
      whereDesmume: 'Im Ordner <code>Battery</code> neben DeSmuME. Die Datei heißt wie dein Spiel und endet auf <code>.dsv</code>.',
      whereMelon: 'Direkt neben der Spiel-Datei (<code>.nds</code>), gleicher Name, endet auf <code>.sav</code>.',
      whereDrastic: 'Ordner <code>DraStic/backup</code>, endet auf <code>.dsv</code>.',
      whereDelta: 'Spiel lange drücken → Spielstand exportieren. Danach dort wieder importieren.',
      whereNote: 'Wichtig: Nimm den normalen Spielstand – keinen Savestate („Schnellspeichern“ im Emulator).',
      s3Title: 'Sonderbonbons geben',
      s3Wait: 'Erst den Spielstand auswählen.',
      amountMax: 'Voll (999)',
      apply: 'Sonderbonbons geben',
      applyBusy: 'Wird gespeichert…',
      footNote: 'Geändert wird nur der Beutel im aktuellen Spielstand, die Prüfsumme wird neu berechnet – wie bei PKHeX. Die Datei behält Namen und Format.',
      badges: function (n) { return n === 1 ? '1 Orden' : n + ' Orden'; },
      playTime: function (h, m) { return 'Spielzeit ' + h + ':' + String(m).padStart(2, '0'); },
      inBag: function (n) { return n + ' im Beutel'; },
      preview: function (from, to) { return to > from ? 'Danach hast du <b>' + to + '</b> Sonderbonbons (+' + (to - from) + ').' : ''; },
      full: 'Du hast schon das Maximum von 999 Sonderbonbons.',
      errSize: function (kb) { return 'Das ist kein DS-Spielstand (' + kb + ' KB, erwartet sind 512 KB). Nimm die Datei, die beim Speichern im Spiel entsteht (.sav/.dsv) – keinen Savestate.'; },
      errGame: function (g) { return 'Das ist ein Spielstand von ' + g + '. Hier geht nur Pokémon Platin.'; },
      errUnknown: 'Kein Platin-Spielstand erkannt. Hast du im Spiel schon einmal gespeichert? Und ist es die richtige Datei (.sav/.dsv)?',
      errBroken: 'Der Spielstand ist beschädigt (Prüfsumme falsch). Lade ihn einmal im Spiel und speichere neu.',
      errRead: 'Die Datei ließ sich nicht lesen: ',
      errPocket: 'Die Medizin-Tasche ist voll. Verkauf oder benutz ein Medizin-Item und versuch es nochmal.',
      okDirect: function (n) { return 'Fertig! Jetzt hast du ' + n + ' Sonderbonbons.'; },
      okDirectText: function (f) { return 'Die Datei <code>' + f + '</code> wurde direkt ersetzt. Starte den Emulator und lade dein Spiel – die Bonbons sind in der Medizin-Tasche.'; },
      okDownload: function (n) { return 'Fast fertig! Die neue Datei mit ' + n + ' Sonderbonbons ist in deinen Downloads.'; },
      okSteps: function (f) {
        return [
          'Öffne den Ordner, aus dem du den Spielstand geholt hast.',
          'Zieh die heruntergeladene Datei <code>' + f + '</code> dort hinein und ersetze die alte („Datei ersetzen“ → Ja).',
          'Steht bei der Datei „(1)“ im Namen? Dann das „ (1)“ löschen, damit sie wieder genau <code>' + f + '</code> heißt.',
          'Emulator starten, Spiel laden – die Bonbons sind in der Medizin-Tasche.'
        ];
      },
      okStepsPhone: function (f) {
        return [
          'Die Datei <code>' + f + '</code> liegt in deinen Downloads (iPhone: App „Dateien“ → Downloads).',
          '<b>Delta:</b> Spiel lange drücken → „Spielstand importieren“ → diese Datei wählen.',
          '<b>DraStic:</b> Datei in den Ordner <code>DraStic/backup</code> kopieren und die alte ersetzen (Name muss gleich bleiben).',
          'Spiel starten – die Bonbons sind in der Medizin-Tasche.'
        ];
      },
      noState: 'Lade danach keinen Savestate („Schnellladen“) – der holt den alten Stand ohne Bonbons zurück.',
      writeFailed: 'Die Datei konnte nicht direkt ersetzt werden – ist der Emulator noch offen? Schließ ihn und versuch es nochmal, oder lade die Datei herunter.',
      download: 'Herunterladen',
      downloadAgain: 'Nochmal herunterladen',
      undo: 'Rückgängig',
      undone: 'Rückgängig gemacht – der Spielstand ist wieder wie vorher.',
      undoneDownload: 'Die ursprüngliche Datei ist in deinen Downloads. Ersetze den Spielstand damit, dann ist alles wie vorher.'
    },
    en: {
      title1: 'Rare ', title2: 'Candies',
      subtitle: 'Put Rare Candies into your Platinum save file – three steps, no extra program.',
      s1Title: 'Save in the game, close the emulator',
      s1Text: 'Save normally in the game (menu → Save). Then close the emulator completely – otherwise it will overwrite your file again.',
      s2Title: 'Choose your save file',
      dropTitle: 'Drop your save file here or tap',
      dropSub: 'The file ends with .sav or .dsv. It stays on your device and is never uploaded.',
      dropOther: 'Choose another save file',
      whereTitle: 'Where is my save file?',
      whereDesmume: 'In the <code>Battery</code> folder next to DeSmuME. Named like your game, ends with <code>.dsv</code>.',
      whereMelon: 'Right next to the game file (<code>.nds</code>), same name, ends with <code>.sav</code>.',
      whereDrastic: 'Folder <code>DraStic/backup</code>, ends with <code>.dsv</code>.',
      whereDelta: 'Long-press the game → export save file. Import it there again afterwards.',
      whereNote: 'Important: use the normal save file – not a save state (the emulator\'s quick save).',
      s3Title: 'Give Rare Candies',
      s3Wait: 'Choose your save file first.',
      amountMax: 'Full (999)',
      apply: 'Give Rare Candies',
      applyBusy: 'Saving…',
      footNote: 'Only the bag of the current save is changed and the checksum is recalculated – just like PKHeX. The file keeps its name and format.',
      badges: function (n) { return n === 1 ? '1 badge' : n + ' badges'; },
      playTime: function (h, m) { return 'Play time ' + h + ':' + String(m).padStart(2, '0'); },
      inBag: function (n) { return n + ' in the bag'; },
      preview: function (from, to) { return to > from ? 'Afterwards you\'ll have <b>' + to + '</b> Rare Candies (+' + (to - from) + ').' : ''; },
      full: 'You already have the maximum of 999 Rare Candies.',
      errSize: function (kb) { return 'This is not a DS save file (' + kb + ' KB, expected 512 KB). Use the file created when you save in the game (.sav/.dsv) – not a save state.'; },
      errGame: function (g) { return 'This is a save file from ' + g + '. Only Pokémon Platinum works here.'; },
      errUnknown: 'No Platinum save detected. Have you saved in the game at least once? And is it the right file (.sav/.dsv)?',
      errBroken: 'The save file is damaged (wrong checksum). Load it in the game once and save again.',
      errRead: 'The file could not be read: ',
      errPocket: 'The Medicine pocket is full. Sell or use a medicine item and try again.',
      okDirect: function (n) { return 'Done! You now have ' + n + ' Rare Candies.'; },
      okDirectText: function (f) { return 'The file <code>' + f + '</code> was replaced directly. Start the emulator and load your game – the candies are in the Medicine pocket.'; },
      okDownload: function (n) { return 'Almost done! The new file with ' + n + ' Rare Candies is in your downloads.'; },
      okSteps: function (f) {
        return [
          'Open the folder you took the save file from.',
          'Drag the downloaded file <code>' + f + '</code> in there and replace the old one ("Replace the file" → Yes).',
          'Does the file name contain "(1)"? Then delete the " (1)" so it is called exactly <code>' + f + '</code> again.',
          'Start the emulator, load your game – the candies are in the Medicine pocket.'
        ];
      },
      okStepsPhone: function (f) {
        return [
          'The file <code>' + f + '</code> is in your downloads (iPhone: Files app → Downloads).',
          '<b>Delta:</b> long-press the game → "Import Save File" → choose this file.',
          '<b>DraStic:</b> copy the file into the <code>DraStic/backup</code> folder and replace the old one (the name must stay the same).',
          'Start the game – the candies are in the Medicine pocket.'
        ];
      },
      noState: 'Don\'t load a save state afterwards – it brings back the old state without candies.',
      writeFailed: 'The file could not be replaced directly – is the emulator still open? Close it and try again, or download the file.',
      download: 'Download',
      downloadAgain: 'Download again',
      undo: 'Undo',
      undone: 'Undone – the save file is back to how it was.',
      undoneDownload: 'The original file is in your downloads. Replace your save file with it and everything is back to how it was.'
    }
  };

  var lang = 'de';
  try { lang = localStorage.getItem('hub-lang') === 'en' ? 'en' : 'de'; } catch (e) {}
  // save: { name, bytes, handle, data, candies, before }  result: { kind, … }
  var state = { save: null, add: 'max', busy: false, result: null, error: '' };

  var $ = function (id) { return document.getElementById(id); };
  function L() { return I18N[lang]; }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  function num(n) { return Number(n).toLocaleString(lang === 'de' ? 'de-DE' : 'en-US'); }

  /* ── Datei laden ───────────────────────────────────────────────── */
  function candiesIn(bytes) {
    var bag = PtBag.read(bytes);
    var e = bag && bag[MEDICINE].filter(function (x) { return x.id === PtBag.RARE_CANDY; })[0];
    return e ? e.count : 0;
  }

  function load(file, handle) {
    state.error = '';
    state.result = null;
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
      state.save = { name: file.name, bytes: bytes, handle: handle || null, data: data, candies: candiesIn(bytes), before: null };
      if (state.save.candies >= MAX) state.add = null;
      else if (!state.add) state.add = 'max';
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

  /* ── Bonbons geben ─────────────────────────────────────────────── */
  function target() {
    var have = state.save ? state.save.candies : 0;
    if (!state.add) return have;
    return state.add === 'max' ? MAX : Math.min(MAX, have + state.add);
  }

  function withCandies(bytes, count) {
    var bag = PtBag.read(bytes);
    var med = bag[MEDICINE];
    var e = med.filter(function (x) { return x.id === PtBag.RARE_CANDY; })[0];
    if (!e) {
      if (med.length >= PtBag.POCKETS[MEDICINE].slots) throw new Error('pocket');
      e = { id: PtBag.RARE_CANDY, count: 0 };
      med.push(e);
    }
    e.count = count;
    var out = PtBag.write(bytes, bag);
    // Gegenprobe: neue Datei lesen
    if (!PtSave.parse(out, D).ok || candiesIn(out) !== count) throw new Error('check');
    return out;
  }

  // Direkt in die ausgewählte Datei schreiben; true = geklappt
  function writeHandle(handle, bytes) {
    if (!handle || !handle.createWritable) return Promise.resolve(false);
    var opts = { mode: 'readwrite' };
    return Promise.resolve(handle.queryPermission ? handle.queryPermission(opts) : 'prompt').then(function (p) {
      return p === 'granted' ? p : handle.requestPermission(opts);
    }).then(function (p) {
      if (p !== 'granted') return false;
      return handle.createWritable().then(function (w) {
        return w.write(bytes).then(function () { return w.close(); });
      }).then(function () {
        return handle.getFile();
      }).then(function (f) {
        return f.arrayBuffer();
      }).then(function (buf) {
        var back = new Uint8Array(buf);
        if (back.length !== bytes.length) return false;
        for (var i = 0; i < back.length; i++) if (back[i] !== bytes[i]) return false;
        return true;
      });
    }).catch(function () { return false; });
  }

  function apply() {
    var sv = state.save;
    if (!sv || state.busy) return;
    var to = target();
    if (to <= sv.candies) return;
    var out;
    try {
      out = withCandies(sv.bytes, to);
    } catch (err) {
      state.result = { kind: 'error', text: err.message === 'pocket' ? L().errPocket : L().errRead + err.message };
      render();
      return;
    }
    state.busy = true;
    render();
    writeHandle(sv.handle, out).then(function (ok) {
      sv.before = sv.before || sv.bytes;
      sv.bytes = out;
      sv.candies = to;
      if (ok) state.result = { kind: 'direct', count: to };
      else if (sv.handle && sv.handle.createWritable) state.result = { kind: 'writeFailed', count: to };
      else { downloadFile(out, sv.name); state.result = { kind: 'download', count: to }; }
      if (sv.candies >= MAX) state.add = null;
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
    writeHandle(sv.handle, before).then(function (ok) {
      if (!ok) downloadFile(before, sv.name);
      sv.bytes = before;
      sv.before = null;
      sv.candies = candiesIn(before);
      state.add = sv.candies >= MAX ? null : 'max';
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

  /* ── Anzeige ───────────────────────────────────────────────────── */
  function applyStatic() {
    var l = L();
    document.documentElement.lang = lang;
    $('lang-toggle').textContent = lang.toUpperCase();
    document.querySelectorAll('[data-i18n]').forEach(function (el) {
      var v = l[el.dataset.i18n];
      if (typeof v === 'string') el.innerHTML = v;
    });
    document.title = (lang === 'de' ? 'Sonderbonbons' : 'Rare Candies') + ' – Pokémon Hub';
  }

  function saveCardHtml(sv) {
    var l = L(), t = sv.data.trainer;
    var team = sv.data.party.map(function (m) {
      return '<img src="' + ICON_SPR + (m.isEgg ? 'egg' : m.species) + '.png" alt="" loading="lazy">';
    }).join('');
    return '<div class="save-card-main">' +
        '<span class="save-card-name">' + esc(t.name) + '</span>' +
        '<span class="save-card-meta">' + esc(l.badges(t.badgeCount)) + ' · ' + esc(l.playTime(t.playTime.h, t.playTime.m)) + ' · ' + esc(sv.name) + '</span>' +
      '</div>' +
      (team ? '<div class="save-team">' + team + '</div>' : '') +
      '<span class="candy-count"><img src="' + CANDY_IMG + '" alt="">' + esc(l.inBag(num(sv.candies))) + '</span>';
  }

  function resultHtml(r, sv) {
    var l = L(), name = esc(sv ? sv.name : '');
    var undoBtn = sv && sv.before ? '<button type="button" class="small-btn" data-act="undo">↶ ' + l.undo + '</button>' : '';
    var note = '<p class="muted">' + l.noState + '</p>';
    switch (r.kind) {
      case 'direct':
        return '<div class="result-title">' + l.okDirect(num(r.count)) + '</div><p>' + l.okDirectText(name) + '</p>' + note +
          '<div class="btn-row">' + undoBtn + '</div>';
      case 'download':
        return '<div class="result-title">' + l.okDownload(num(r.count)) + '</div><ol>' +
          (PHONE ? l.okStepsPhone(name) : l.okSteps(name)).map(function (s) { return '<li>' + s + '</li>'; }).join('') + '</ol>' + note +
          '<div class="btn-row"><button type="button" class="small-btn" data-act="download">⭳ ' + l.downloadAgain + '</button>' + undoBtn + '</div>';
      case 'writeFailed':
        return '<div class="result-title">' + l.writeFailed + '</div>' +
          '<div class="btn-row"><button type="button" class="small-btn" data-act="retry">↻ ' + l.apply + '</button>' +
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

    // Schritt 2: Datei
    $('drop').classList.toggle('is-small', !!sv);
    $('drop').querySelector('.drop-title').innerHTML = sv ? l.dropOther : l.dropTitle;
    $('save-card').hidden = !sv;
    if (sv) $('save-card').innerHTML = saveCardHtml(sv);
    $('file-error').hidden = !state.error;
    $('file-error').textContent = state.error;

    // Schritt 3: Bonbons
    var done = state.result && /^(direct|download)$/.test(state.result.kind);
    $('step-file').classList.toggle('is-current', !sv);
    $('step-file').classList.toggle('is-done', !!sv);
    $('step-give').classList.toggle('is-current', !!sv && !done);
    $('step-give').classList.toggle('is-done', !!done);
    $('step-give').classList.toggle('is-locked', !sv);
    $('give-hint').hidden = !!sv;
    $('give').hidden = !sv;
    if (sv) {
      var full = sv.candies >= MAX;
      document.querySelectorAll('#amounts .amount').forEach(function (b) {
        var v = b.dataset.add === 'max' ? 'max' : +b.dataset.add;
        b.classList.toggle('is-active', v === state.add);
        b.disabled = full || state.busy;
      });
      var to = target();
      $('give-preview').innerHTML = full ? esc(l.full) : l.preview(sv.candies, to);
      $('apply').disabled = full || state.busy || to <= sv.candies;
      $('apply-label').textContent = state.busy ? l.applyBusy : l.apply;
    }
    var r = state.result;
    $('result').hidden = !r;
    if (r) {
      $('result').className = 'result' + (r.kind === 'error' || r.kind === 'writeFailed' ? ' is-error' : '');
      $('result').innerHTML = resultHtml(r, sv);
    }
  }

  /* ── Ereignisse ────────────────────────────────────────────────── */
  // iPhone kennt .sav/.dsv nicht und graut die Dateien sonst in der Auswahl aus
  if (PHONE) $('file-input').removeAttribute('accept');
  $('drop').addEventListener('click', pickFile);
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

  $('amounts').addEventListener('click', function (e) {
    var b = e.target.closest('.amount');
    if (!b || b.disabled) return;
    state.add = b.dataset.add === 'max' ? 'max' : +b.dataset.add;
    state.result = null;
    render();
  });
  $('apply').addEventListener('click', apply);
  $('result').addEventListener('click', function (e) {
    var b = e.target.closest('[data-act]');
    if (!b || !state.save) return;
    var act = b.dataset.act;
    if (act === 'download') {
      downloadFile(state.save.bytes, state.save.name);
      if (state.result && state.result.kind === 'writeFailed') { state.result = { kind: 'download', count: state.save.candies }; render(); }
    } else if (act === 'retry') {
      // Datei steht schon im Speicher – nur nochmal schreiben
      var sv = state.save;
      state.busy = true;
      render();
      writeHandle(sv.handle, sv.bytes).then(function (ok) {
        state.busy = false;
        state.result = ok ? { kind: 'direct', count: sv.candies } : { kind: 'writeFailed', count: sv.candies };
        render();
      });
    } else if (act === 'undo') undo();
  });

  $('lang-toggle').addEventListener('click', function () {
    lang = lang === 'de' ? 'en' : 'de';
    try { localStorage.setItem('hub-lang', lang); } catch (e) {}
    render();
  });

  render();
})();
