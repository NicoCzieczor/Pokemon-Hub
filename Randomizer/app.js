/*
 * Randomizer – würfelt aus der Original-Platin-ROM ein neues Spiel, komplett im Browser.
 *
 * Dafür läuft der echte Universal Pokémon Randomizer ZX 4.6.1 (PokeRandoZX.jar, Java) über CheerpJ
 * (Java-Laufzeit als WebAssembly, wird beim ersten Würfeln von cjrtnc.leaningtech.com geladen).
 * Aufgerufen wird sein Kommandozeilen-Modus, genau wie am PC:
 *   cli -s settings.rnqs -i rom.nds -o out.nds -l
 * Die Einstellungen kommen aus editor.js: settings.rnqs (mit denen bisher gewürfelt wurde) oder die
 * angepasste Fassung davon.
 *
 * CheerpJ-Dateisystem: /app/… = Dateien vom Webserver (das Jar), /str/… = Daten aus JavaScript
 * (ROM, Einstellungen), /files/… = Browser-Speicher (Ausgabe; wird danach wieder gelöscht).
 * Die Original-ROM bleibt in IndexedDB, damit sie nur einmal ausgewählt werden muss.
 * Nach dem Würfeln liest rando.js die Teams aus der neuen ROM und gibt sie an den Boss-Planer weiter.
 */
(function () {
  'use strict';

  const D = window.PT_DATA;
  const SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites';
  const PT_SPR = SPR + '/pokemon/versions/generation-iv/platinum/';
  const CJ_LOADER = 'https://cjrtnc.leaningtech.com/4.2/loader.js';
  const MAIN_CLASS = 'com.dabomstew.pkrandom.newgui.NewRandomizerGUI';
  const JAR = '/app' + decodeURIComponent(new URL('PokeRandoZX.jar', location.href).pathname);
  const OUT = '/files/randomizer-out.nds';
  const ORIGINAL_STARTERS = [387, 390, 393];
  const PHONE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const ANDROID = /Android/i.test(navigator.userAgent);

  const I18N = {
    de: {
      title1: 'Rando', title2: 'mizer', gameBadge: 'Platin',
      subtitle: 'Verloren? Würfel dir ein neues zufälliges Platin – direkt hier im Browser. Wie gewürfelt wird, kannst du vorher einstellen.',
      s1Title: 'Original-Spiel auswählen <small>(nur einmal)</small>',
      dropTitle: 'Original-ROM hier reinziehen oder antippen',
      dropSub: 'Die unveränderte Pokémon-Platin-Datei (.nds, ca. 128 MB). Sie wird nur auf diesem Gerät gespeichert – nichts wird hochgeladen.',
      dropOther: 'Andere ROM wählen',
      romSaved: 'gespeichert – musst du nicht nochmal auswählen',
      romSession: 'nur bis zum Schließen der Seite gemerkt',
      romRemove: 'Entfernen',
      regions: { D: 'deutsch', E: 'englisch (USA)', P: 'englisch (Europa)', F: 'französisch', I: 'italienisch', S: 'spanisch', J: 'japanisch', K: 'koreanisch' },
      romName: function (r) { return 'Pokémon Platin' + (r ? ' (' + r + ')' : ''); },
      warnRandomized: 'Diese ROM ist schon randomisiert (andere Starter als Chelast, Panflam und Plinfa). Nimm am besten die unveränderte Original-ROM – sonst wird doppelt gewürfelt.',
      warnNotStored: 'Die ROM konnte auf diesem Gerät nicht dauerhaft gespeichert werden (zu wenig Speicher?). Würfeln geht trotzdem – beim nächsten Mal musst du sie aber wieder auswählen.',
      errNotPlatinum: 'Das ist keine Pokémon-Platin-ROM. Hier geht nur Platin.',
      errNotRom: 'Das sieht nicht nach einer DS-ROM aus. Nimm die .nds-Datei des Spiels.',
      s2Title: 'Neues Spiel würfeln',
      run: 'Neues Spiel würfeln',
      runAgain: 'Nochmal würfeln',
      runBusy: 'Wird gewürfelt…',
      runHint: 'Beim ersten Mal wird der Randomizer geladen (braucht Internet, ca. 30 Sekunden). Danach dauert es nur ein paar Sekunden.',
      runMobile: 'Am Handy braucht das viel Arbeitsspeicher. Schließ vorher andere Apps und Tabs. Lädt die Seite mittendrin neu oder stürzt ab, reicht der Speicher nicht – dann am PC würfeln.',
      phase: { load: 'Randomizer wird geladen…', prepare: 'Spiel wird vorbereitet…', run: 'Pokémon, Trainer und Items werden gewürfelt…', finish: 'Fast fertig…' },
      errLoader: 'Der Randomizer konnte nicht geladen werden. Bist du mit dem Internet verbunden? Dann lade die Seite neu und versuch es nochmal.',
      errRun: function (code) { return 'Das Würfeln hat nicht geklappt (Code ' + code + '). Ist es wirklich die Original-ROM?'; },
      errRunCustom: ' Du benutzt angepasste Einstellungen – vielleicht passt eine Kombination nicht. Probier es mit „Standard wiederherstellen“.',
      errMemory: 'Dafür reicht der Speicher nicht. Schließ andere Tabs oder würfel am PC.',
      errOther: 'Das Würfeln hat nicht geklappt: ',
      details: 'Details',
      s3Title: 'Herunterladen und neu starten',
      playWait: 'Hier erscheint dein neues Spiel.',
      playTitle: 'Dein neues Spiel ist fertig!',
      starters: 'Starter anzeigen – Spoiler!',
      download: 'Spiel herunterladen',
      playSteps: function (f) {
        return [
          'Öffne die heruntergeladene Datei <code>' + f + '</code> mit deinem Emulator (zum Beispiel reinziehen).',
          'Starte ein <b>neues Spiel</b>. Weil die Datei neu heißt, legt der Emulator automatisch einen frischen Spielstand an – der alte bleibt beim alten Spiel.',
          'Die alte ROM und ihren Spielstand kannst du löschen, wenn ihr den alten Run nicht mehr braucht.'
        ];
      },
      playPhone: function (f, android) {
        return android
          ? 'Die Datei <code>' + f + '</code> landet im Ordner „Download“. <b>melonDS:</b> Verschieb sie in deinen Spiele-Ordner – oder füg in den Einstellungen von melonDS einmalig den Ordner „Download“ als ROM-Ordner hinzu, dann taucht jedes neue Spiel von selbst auf.'
          : 'Die Datei <code>' + f + '</code> landet in der App „Dateien“ → Downloads. Von dort in deine Emulator-App holen – bei <b>Delta</b>: + → Dateien → die Datei wählen.';
      },
      bossReady: '✓ Der Boss-Planer kennt die Teams aus diesem Spiel schon.',
      bossOpen: 'Boss-Planer öffnen',
      log: 'Spoiler-Log',
      setTitle: 'Einstellungen',
      setOpen: 'Anpassen',
      footNote: 'Gewürfelt wird mit dem <a href="https://github.com/Ajarmar/universal-pokemon-randomizer-zx" target="_blank" rel="noopener">Universal Pokémon Randomizer ZX</a> 4.6.1 (GPL-3.0, <a href="https://github.com/Ajarmar/universal-pokemon-randomizer-zx/tree/v4.6.1" target="_blank" rel="noopener">Quellcode</a>), im Browser ausgeführt mit <a href="https://cheerpj.com/" target="_blank" rel="noopener">CheerpJ</a>. Deine ROM verlässt dein Gerät nicht.'
    },
    en: {
      title1: 'Rando', title2: 'mizer', gameBadge: 'Platinum',
      subtitle: 'Lost? Roll yourself a new random Platinum – right here in the browser. You can choose how it gets randomized.',
      s1Title: 'Choose the original game <small>(only once)</small>',
      dropTitle: 'Drop the original ROM here or tap',
      dropSub: 'The unmodified Pokémon Platinum file (.nds, about 128 MB). It is only stored on this device – nothing is uploaded.',
      dropOther: 'Choose another ROM',
      romSaved: 'saved – no need to choose it again',
      romSession: 'only remembered until you close the page',
      romRemove: 'Remove',
      regions: { D: 'German', E: 'English (US)', P: 'English (Europe)', F: 'French', I: 'Italian', S: 'Spanish', J: 'Japanese', K: 'Korean' },
      romName: function (r) { return 'Pokémon Platinum' + (r ? ' (' + r + ')' : ''); },
      warnRandomized: 'This ROM is already randomized (starters other than Turtwig, Chimchar and Piplup). Better use the unmodified original ROM – otherwise it gets randomized twice.',
      warnNotStored: 'The ROM could not be stored on this device (not enough space?). Randomizing still works – but next time you have to choose it again.',
      errNotPlatinum: 'This is not a Pokémon Platinum ROM. Only Platinum works here.',
      errNotRom: 'This doesn\'t look like a DS ROM. Use the game\'s .nds file.',
      s2Title: 'Roll a new game',
      run: 'Roll a new game',
      runAgain: 'Roll again',
      runBusy: 'Rolling…',
      runHint: 'The first time, the randomizer has to load (needs internet, about 30 seconds). After that it only takes a few seconds.',
      runMobile: 'On a phone this needs a lot of memory. Close other apps and tabs first. If the page reloads or crashes halfway, there isn\'t enough memory – roll on a PC instead.',
      phase: { load: 'Loading the randomizer…', prepare: 'Preparing the game…', run: 'Randomizing Pokémon, trainers and items…', finish: 'Almost done…' },
      errLoader: 'The randomizer could not be loaded. Are you connected to the internet? Reload the page and try again.',
      errRun: function (code) { return 'Randomizing failed (code ' + code + '). Is it really the original ROM?'; },
      errRunCustom: ' You are using customized settings – maybe a combination doesn\'t work. Try "Restore default".',
      errMemory: 'There is not enough memory for this. Close other tabs or roll on a PC.',
      errOther: 'Randomizing failed: ',
      details: 'Details',
      s3Title: 'Download and start over',
      playWait: 'Your new game will show up here.',
      playTitle: 'Your new game is ready!',
      starters: 'Show starters – spoiler!',
      download: 'Download game',
      playSteps: function (f) {
        return [
          'Open the downloaded file <code>' + f + '</code> with your emulator (for example drag it in).',
          'Start a <b>new game</b>. Because the file has a new name, the emulator automatically creates a fresh save – the old one stays with the old game.',
          'You can delete the old ROM and its save once you no longer need the old run.'
        ];
      },
      playPhone: function (f, android) {
        return android
          ? 'The file <code>' + f + '</code> ends up in the "Download" folder. <b>melonDS:</b> move it into your games folder – or add the "Download" folder once as a ROM folder in the melonDS settings, then every new game shows up by itself.'
          : 'The file <code>' + f + '</code> ends up in the Files app → Downloads. Add it to your emulator app from there – in <b>Delta</b>: + → Files → choose the file.';
      },
      bossReady: '✓ The Boss Planner already knows the teams from this game.',
      bossOpen: 'Open Boss Planner',
      log: 'Spoiler log',
      setTitle: 'Settings',
      setOpen: 'Customize',
      footNote: 'Randomized with the <a href="https://github.com/Ajarmar/universal-pokemon-randomizer-zx" target="_blank" rel="noopener">Universal Pokémon Randomizer ZX</a> 4.6.1 (GPL-3.0, <a href="https://github.com/Ajarmar/universal-pokemon-randomizer-zx/tree/v4.6.1" target="_blank" rel="noopener">source code</a>), running in the browser with <a href="https://cheerpj.com/" target="_blank" rel="noopener">CheerpJ</a>. Your ROM never leaves your device.'
    }
  };

  let lang = 'de';
  try { lang = localStorage.getItem('hub-lang') === 'en' ? 'en' : 'de'; } catch (e) {}
  const state = {
    rom: null,          // { name, size, code, starters, file, stored }
    romVersion: 0,
    romError: '',
    phase: null,        // load | prepare | run | finish
    started: 0,
    runError: null,     // { text, details }
    result: null        // { url, logUrl, fileName, size, starters, boss }
  };

  const $ = id => document.getElementById(id);
  const L = () => I18N[lang];
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const mb = n => Math.round(n / 1048576) + ' MB';

  /* ── Speicher auf dem Gerät ────────────────────────────────────── */
  const Store = (() => {
    let dbp = null;
    function db() {
      if (!dbp) {
        dbp = new Promise((res, rej) => {
          if (!window.indexedDB) { rej(new Error('idb')); return; }
          const r = indexedDB.open('pokehub-randomizer', 1);
          r.onupgradeneeded = () => r.result.createObjectStore('kv');
          r.onsuccess = () => res(r.result);
          r.onerror = () => rej(r.error);
        });
      }
      return dbp;
    }
    function run(mode, fn) {
      return db().then(d => new Promise((res, rej) => {
        const t = d.transaction('kv', mode);
        const req = fn(t.objectStore('kv'));
        t.oncomplete = () => res(req && req.result);
        t.onerror = t.onabort = () => rej(t.error);
      }));
    }
    return {
      get: k => run('readonly', s => s.get(k)),
      put: (k, v) => run('readwrite', s => s.put(v, k)),
      del: k => run('readwrite', s => s.delete(k)).catch(() => {})
    };
  })();

  // Einstellungen zum Anklicken (editor.js); manche Extras gibt es nur für die englische ROM
  const editor = RandoEditor.create({
    lang: () => lang,
    ctx: () => ({ english: !!state.rom && /^CPU[EP]$/.test(state.rom.code || '') })
  });

  /* ── Original-ROM ──────────────────────────────────────────────── */
  const reader = blob => (s, e) => blob.slice(s, e).arrayBuffer().then(b => new Uint8Array(b));

  async function handleRom(file) {
    state.romError = '';
    let info;
    try {
      info = await Rando.readRom(reader(file), [], [], []);
    } catch (e) {
      state.romError = e && e.message === 'notPlatinum' ? L().errNotPlatinum : L().errNotRom;
      render();
      return;
    }
    const rom = { name: file.name, size: file.size, code: info.code, starters: info.starters, file: file };
    try {
      await Store.put('rom', rom);
      rom.stored = true;
    } catch (e) {
      rom.stored = false;
    }
    state.rom = rom;
    state.romVersion++;
    render();
    editor.render();
  }

  function isRandomized(rom) {
    return !!rom.starters && rom.starters.some((s, i) => s !== ORIGINAL_STARTERS[i]);
  }

  /* ── CheerpJ ───────────────────────────────────────────────────── */
  let javaReady = null, strRom = null, strRomVersion = -1, strCount = 0, jlib = null;

  function loadScript(src) {
    return new Promise((res, rej) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = res;
      s.onerror = () => rej(new Error('loader'));
      document.head.appendChild(s);
    });
  }
  function java() {
    if (!javaReady) {
      javaReady = (window.cheerpjInit ? Promise.resolve() : loadScript(CJ_LOADER))
        .then(() => window.cheerpjInit({ version: 8, status: 'none' }))
        .catch(e => { javaReady = null; throw e && e.message === 'loader' ? e : new Error('loader'); });
    }
    return javaReady;
  }
  // Dateien im Browser-Speicher von CheerpJ löschen (über java.io.File)
  async function deleteFiles(paths) {
    try {
      if (!jlib) jlib = await window.cheerpjRunLibrary('');
      const JFile = await jlib.java.io.File;
      for (const p of paths) await (await new JFile(p)).delete();
    } catch (e) { /* nicht schlimm */ }
  }
  // Was Java in die Konsole schreibt, für die Fehler-Details mitschneiden
  function captureConsole(lines) {
    const orig = {};
    ['log', 'warn', 'error'].forEach(k => {
      orig[k] = console[k];
      console[k] = function () {
        lines.push(Array.prototype.map.call(arguments, String).join(' '));
        if (lines.length > 60) lines.shift();
        return orig[k].apply(console, arguments);
      };
    });
    return () => Object.keys(orig).forEach(k => { console[k] = orig[k]; });
  }

  function outName() {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return 'Platin-Random-' + d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes()) + '.nds';
  }

  let timer = null;
  function setPhase(p) {
    state.phase = p;
    if (p && !timer) {
      state.started = Date.now();
      timer = setInterval(renderTime, 500);
    } else if (!p && timer) {
      clearInterval(timer);
      timer = null;
    }
    render();
  }
  function renderTime() {
    $('run-time').textContent = state.phase ? Math.floor((Date.now() - state.started) / 1000) + ' s' : '';
  }

  function clearResult() {
    const r = state.result;
    if (r) { URL.revokeObjectURL(r.url); if (r.logUrl) URL.revokeObjectURL(r.logUrl); }
    state.result = null;
  }

  async function run() {
    if (!state.rom || state.phase) return;
    state.runError = null;
    clearResult();
    const lines = [];
    const restore = captureConsole(lines);
    setPhase(javaReady ? 'prepare' : 'load');
    try {
      await java();
      setPhase('prepare');
      if (strRomVersion !== state.romVersion) {
        strRom = '/str/rom' + state.romVersion + '.nds';
        window.cheerpOSAddStringFile(strRom, new Uint8Array(await state.rom.file.arrayBuffer()));
        strRomVersion = state.romVersion;
      }
      const settings = await editor.file().catch(() => { throw new Error('loader'); });
      const setPath = '/str/settings' + (++strCount) + '.rnqs';
      window.cheerpOSAddStringFile(setPath, settings);
      await deleteFiles([OUT, OUT + '.log']);

      setPhase('run');
      const code = await window.cheerpjRunMain(MAIN_CLASS, JAR, 'cli', '-s', setPath, '-i', strRom, '-o', OUT, '-l');

      setPhase('finish');
      let rom = null, log = null;
      try { rom = await window.cjFileBlob(OUT); } catch (e) { /* keine Ausgabe */ }
      if (code !== 0 || !rom || rom.size < 1048576) throw Object.assign(new Error('run'), { code: code });
      try { log = await window.cjFileBlob(OUT + '.log'); } catch (e) { /* ohne Log */ }
      // cjFileBlob liefert die Daten schon als eigene Kopie – die Dateien im Browser-Speicher können weg
      await deleteFiles([OUT, OUT + '.log']);

      const fileName = outName();
      const info = await readTeams(rom, fileName);
      state.result = {
        url: URL.createObjectURL(rom),
        logUrl: log ? URL.createObjectURL(log) : null,
        fileName: fileName,
        size: rom.size,
        starters: info.starters,
        boss: info.boss
      };
    } catch (e) {
      const l = L(), msg = e && e.message;
      let text;
      if (msg === 'loader') text = l.errLoader;
      else if (msg === 'run') text = l.errRun(e.code) + (editor.isCustom() ? l.errRunCustom : '');
      else if (e instanceof RangeError || /memory|allocation/i.test(msg || '')) text = l.errMemory;
      else text = l.errOther + msg;
      state.runError = { text: text, details: lines.slice(-12).join('\n') };
    } finally {
      restore();
      setPhase(null);
    }
  }

  // Starter und Trainerteams aus der neuen ROM lesen; die Teams bekommt der Boss-Planer
  async function readTeams(rom, fileName) {
    let B = null;
    try { B = await (await fetch('../Bosse/bosses.json')).json(); } catch (e) { /* ohne Boss-Planer */ }
    try {
      const res = await Rando.readRom(reader(rom), B ? Object.keys(B.trainers).map(Number) : [], B ? B.fem : [], D.personal);
      let boss = false;
      if (B) {
        try {
          localStorage.setItem('bosse-rando', JSON.stringify(Object.assign({ name: fileName, loadedAt: Date.now() }, res)));
          boss = true;
        } catch (e) { /* Speicher voll */ }
      }
      return { starters: res.starters, boss: boss };
    } catch (e) {
      return { starters: null, boss: false };
    }
  }

  /* ── Anzeige ───────────────────────────────────────────────────── */
  function applyStatic() {
    const l = L();
    document.documentElement.lang = lang;
    $('lang-toggle').textContent = lang.toUpperCase();
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = l[el.dataset.i18n];
      if (typeof v === 'string') el.innerHTML = v;
    });
  }

  function romCardHtml(rom) {
    const l = L();
    const region = rom.code ? l.regions[rom.code.charAt(3)] : '';
    return '<span class="rom-card-icon">✓</span>' +
      '<div class="rom-card-main">' +
        '<span class="rom-card-name">' + esc(l.romName(region)) + '</span>' +
        '<span class="rom-card-meta">' + esc(rom.name) + ' · ' + mb(rom.size) + ' · ' + esc(rom.stored ? l.romSaved : l.romSession) + '</span>' +
      '</div>' +
      '<button type="button" class="small-btn" id="rom-remove">' + esc(l.romRemove) + '</button>';
  }

  function playHtml(r) {
    const l = L(), T = D.text[lang];
    // Starter erst auf Wunsch zeigen – sonst ist die Überraschung im neuen Spiel weg
    const starters = r.starters ? '<details class="starters-spoiler"><summary>' + esc(l.starters) + '</summary><div class="starters">' +
      r.starters.map(s => '<div class="starter"><img src="' + PT_SPR + s + '.png" alt="" loading="lazy"><b>' + esc(T.species[s] || '#' + s) + '</b></div>').join('') +
      '</div></details>' : '';
    return '<div class="play-title">' + esc(l.playTitle) + '</div>' +
      '<a class="big-btn" href="' + r.url + '" download="' + esc(r.fileName) + '">' +
        '<svg class="dice" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>' +
        '<span>' + esc(l.download) + '</span></a>' +
      '<p class="play-file">' + esc(r.fileName) + ' · ' + mb(r.size) + '</p>' +
      '<ol>' + l.playSteps(esc(r.fileName)).map((s, i) => i === 0 && PHONE ? l.playPhone(esc(r.fileName), ANDROID) : s).map(s => '<li>' + s + '</li>').join('') + '</ol>' +
      '<div class="play-boss">' +
        (r.boss ? '<span>' + esc(l.bossReady) + '</span><a class="small-btn" href="../Bosse/index.html">' + esc(l.bossOpen) + '</a>' : '') +
        (r.logUrl ? '<a class="small-btn" href="' + r.logUrl + '" download="' + esc(r.fileName.replace(/\.nds$/, '')) + '-Log.txt">' + esc(l.log) + '</a>' : '') +
      '</div>' + starters;
  }

  function render() {
    const l = L(), rom = state.rom, r = state.result, busy = !!state.phase;
    applyStatic();

    // Schritt 1
    $('drop').classList.toggle('is-small', !!rom);
    $('drop').querySelector('.drop-title').textContent = rom ? l.dropOther : l.dropTitle;
    $('drop').disabled = busy;
    $('rom-card').hidden = !rom;
    if (rom) $('rom-card').innerHTML = romCardHtml(rom);
    const warn = rom ? [isRandomized(rom) ? l.warnRandomized : '', rom.stored ? '' : l.warnNotStored].filter(Boolean).join(' ') : '';
    $('rom-warn').hidden = !warn;
    $('rom-warn').textContent = warn;
    $('rom-error').hidden = !state.romError;
    $('rom-error').textContent = state.romError;

    // Schritt 2
    $('step-rom').classList.toggle('is-current', !rom);
    $('step-rom').classList.toggle('is-done', !!rom);
    $('step-run').classList.toggle('is-locked', !rom);
    $('step-run').classList.toggle('is-current', !!rom && !r);
    $('step-run').classList.toggle('is-done', !!r && !busy);
    $('run').disabled = !rom || busy;
    $('run').classList.toggle('is-busy', busy);
    $('run-label').textContent = busy ? l.runBusy : r ? l.runAgain : l.run;
    $('run-status').hidden = !busy;
    $('run-text').textContent = busy ? l.phase[state.phase] : '';
    renderTime();
    $('run-hint').hidden = busy || !!r;
    $('run-mobile').hidden = !PHONE || busy || !!r;
    const err = state.runError;
    $('run-error').hidden = !err;
    if (err) {
      $('run-error').innerHTML = esc(err.text) + (err.details ? '<details class="run-details"><summary>' + esc(l.details) + '</summary><pre>' + esc(err.details) + '</pre></details>' : '');
    }

    // Schritt 3
    $('step-play').classList.toggle('is-locked', !r);
    $('step-play').classList.toggle('is-current', !!r);
    $('play-hint').hidden = !!r;
    $('play').hidden = !r;
    if (r) $('play').innerHTML = playHtml(r);
  }

  /* ── Ereignisse ────────────────────────────────────────────────── */
  // iPhone kennt .nds/.rnqs nicht und graut die Dateien sonst in der Auswahl aus
  if (PHONE) { $('rom-input').removeAttribute('accept'); $('rs-input').removeAttribute('accept'); }
  $('drop').addEventListener('click', () => $('rom-input').click());
  $('rom-input').addEventListener('change', e => {
    const f = e.target.files[0];
    if (f) handleRom(f);
    e.target.value = '';
  });
  const drop = $('drop');
  ['dragenter', 'dragover'].forEach(t => drop.addEventListener(t, e => { e.preventDefault(); drop.classList.add('is-over'); }));
  ['dragleave', 'dragend'].forEach(t => drop.addEventListener(t, () => drop.classList.remove('is-over')));
  drop.addEventListener('drop', e => {
    e.preventDefault();
    drop.classList.remove('is-over');
    const f = e.dataTransfer.files[0];
    if (f && !state.phase) handleRom(f);
  });
  $('rom-card').addEventListener('click', e => {
    if (!e.target.closest('#rom-remove') || state.phase) return;
    Store.del('rom');
    state.rom = null;
    state.romVersion++;
    render();
    editor.render();
  });
  $('run').addEventListener('click', run);
  $('lang-toggle').addEventListener('click', () => {
    lang = lang === 'de' ? 'en' : 'de';
    try { localStorage.setItem('hub-lang', lang); } catch (e) { /* egal */ }
    render();
    editor.render();
  });
  window.addEventListener('beforeunload', e => {
    if (state.phase) { e.preventDefault(); e.returnValue = ''; }
  });

  render();
  editor.render();
  editor.load().catch(() => { /* Hinweis steht im Einstellungs-Kasten */ });
  // Gespeicherte ROM vom letzten Mal
  Store.get('rom').then(rec => {
    if (rec && rec.file && !state.rom) {
      state.rom = Object.assign(rec, { stored: true });
      state.romVersion++;
      render();
      editor.render();
    }
  }).catch(() => {});
})();
