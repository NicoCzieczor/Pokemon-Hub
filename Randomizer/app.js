/*
 * Randomizer – würfelt aus der Original-ROM von Platin oder Omega Rubin / Alpha Saphir ein neues Spiel, komplett im Browser.
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
 * Nach dem Würfeln liest rando.js Teams und wilde Pokémon aus der neuen ROM – das ist dann der Randomizer-Stand des
 * Hubs (rando-state.js) für Boss-Planer, Karte, Run-Dashboard und Duo.
 *
 * Omega Rubin / Alpha Saphir (3DS, entschlüsselte .3ds/.cxi, rund 2 GB): Die ROM passt nicht in den Speicher. CheerpJ
 * liest sie stattdessen stückweise über /app/…/__rom/… – das beantwortet der Service Worker (sw.js, romResponse) aus der
 * Datei, die ihm die Seite vorher schickt. Gewürfelt wird mit „-d“: Ergebnis ist ein LayeredFS-Ordner (romfs + code.bin,
 * zusammen ein paar MB), den es als ZIP gibt – entpackt in den Mod-Ordner von Citra. Das Spiel selbst bleibt unverändert.
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
  const ORIGINAL_STARTERS = [387, 390, 393], ORAS_STARTERS = [252, 255, 258];
  const ORAS_OUT = '/files/oras-out';
  const OD = window.ORAS_DATA;
  const PHONE = !!(window.matchMedia && matchMedia('(pointer: coarse)').matches);
  const ANDROID = /Android/i.test(navigator.userAgent);

  const I18N = {
    de: {
      title1: 'Rando', title2: 'mizer', gameBadge: 'Platin',
      subtitle: 'Verloren? Würfel dir ein neues zufälliges Platin oder Omega Rubin / Alpha Saphir – direkt hier im Browser. Wie gewürfelt wird, kannst du vorher einstellen.',
      gameOras: { or: 'Omega Rubin', as: 'Alpha Saphir' },
      s1Title: 'Original-Spiel auswählen <small>(nur einmal)</small>',
      dropTitle: 'Original-ROM hier reinziehen oder antippen',
      dropSub: 'Die unveränderte Spiel-Datei: Platin (.nds, ca. 128 MB) oder Omega Rubin / Alpha Saphir (.3ds/.cxi, entschlüsselt, ca. 2 GB). Sie wird nur auf diesem Gerät gespeichert – nichts wird hochgeladen.',
      dropOther: 'Andere ROM wählen',
      romSaved: 'gespeichert – musst du nicht nochmal auswählen',
      romSession: 'nur bis zum Schließen der Seite gemerkt',
      romRemove: 'Entfernen',
      regions: { D: 'deutsch', E: 'englisch (USA)', P: 'englisch (Europa)', F: 'französisch', I: 'italienisch', S: 'spanisch', J: 'japanisch', K: 'koreanisch' },
      romName: function (r) { return 'Pokémon Platin' + (r ? ' (' + r + ')' : ''); },
      romNameOras: function (g) { return g === 'as' ? 'Pokémon Alpha Saphir' : 'Pokémon Omega Rubin'; },
      warnRandomized: 'Diese ROM ist schon randomisiert (andere Starter als Chelast, Panflam und Plinfa). Nimm am besten die unveränderte Original-ROM – sonst wird doppelt gewürfelt.',
      warnRandomizedOras: 'Diese ROM ist schon randomisiert (andere Starter als Geckarbor, Flemmli und Hydropi). Nimm am besten die unveränderte Original-ROM – sonst wird doppelt gewürfelt.',
      warnNotStored: 'Die ROM konnte auf diesem Gerät nicht dauerhaft gespeichert werden (zu wenig Speicher?). Würfeln geht trotzdem – beim nächsten Mal musst du sie aber wieder auswählen.',
      errNotPlatinum: 'Das ist weder Pokémon Platin noch Omega Rubin / Alpha Saphir. Hier gehen nur diese Spiele.',
      errNotRom: 'Das sieht nicht nach einer passenden ROM aus. Nimm die .nds-Datei (Platin) bzw. die .3ds/.cxi-Datei (Omega Rubin / Alpha Saphir).',
      errEncrypted: 'Diese 3DS-ROM ist verschlüsselt. Der Randomizer braucht – wie Citra – eine entschlüsselte .3ds/.cxi.',
      errNoSw: 'Die ROM passt so nicht in den Speicher. Lade die Seite einmal neu – dann reicht ihr Offline-Speicher die ROM stückweise an den Randomizer weiter – und würfel nochmal.',
      runHintOras: 'Beim ersten Mal wird der Randomizer geladen (braucht Internet, ca. 30 Sekunden). Das Würfeln selbst dauert etwa 20 Sekunden – gelesen werden nur ein paar MB der ROM.',
      downloadOras: 'Mod herunterladen (ZIP)',
      playStepsOras: function (f, tid) {
        return [
          'Entpacke <code>' + f + '</code>. Darin liegen der Ordner <code>romfs</code> und die Datei <code>code.bin</code>.',
          'In Citra: Rechtsklick aufs Spiel → <i>Mod-Ordner öffnen</i> (das ist <code>load/mods/' + tid + '</code>). Einen alten Mod darin vorher löschen, dann <code>romfs</code> und <code>code.bin</code> hineinkopieren.',
          '<b>Wichtig:</b> Der Mod nutzt denselben Spielstand wie das Original. Sichere deinen Spielstand (Rechtsklick → <i>Speicherdatenordner öffnen</i>, Datei <code>main</code> kopieren) und lösch ihn dann – sonst geht es mit dem alten Stand weiter.',
          'Spiel starten und ein neues Abenteuer beginnen. Zurück zum Original: den Mod-Ordner leeren.'
        ];
      },
      playPhoneOras: function (f, tid) { return 'Die Datei <code>' + f + '</code> landet unter „Download“. Entpacke sie und kopier <code>romfs</code> und <code>code.bin</code> in den Mod-Ordner des Spiels (<code>load/mods/' + tid + '</code> im Ordner von Citra bzw. Azahar).'; },
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
      bossReady: '✓ Boss-Planer, Karte und Run-Dashboard kennen dieses Spiel schon (Trainer und wilde Pokémon).',
      bossOpen: 'Boss-Planer öffnen',
      log: 'Spoiler-Log',
      setTitle: 'Einstellungen',
      setOpen: 'Anpassen',
      footNote: 'Gewürfelt wird mit dem <a href="https://github.com/Ajarmar/universal-pokemon-randomizer-zx" target="_blank" rel="noopener">Universal Pokémon Randomizer ZX</a> 4.6.1 (GPL-3.0, <a href="https://github.com/Ajarmar/universal-pokemon-randomizer-zx/tree/v4.6.1" target="_blank" rel="noopener">Quellcode</a>), im Browser ausgeführt mit <a href="https://cheerpj.com/" target="_blank" rel="noopener">CheerpJ</a>. Deine ROM verlässt dein Gerät nicht.'
    },
    en: {
      title1: 'Rando', title2: 'mizer', gameBadge: 'Platinum',
      subtitle: 'Lost? Roll yourself a new random Platinum or Omega Ruby / Alpha Sapphire – right here in the browser. You can choose how it gets randomized.',
      gameOras: { or: 'Omega Ruby', as: 'Alpha Sapphire' },
      s1Title: 'Choose the original game <small>(only once)</small>',
      dropTitle: 'Drop the original ROM here or tap',
      dropSub: 'The unmodified game file: Platinum (.nds, about 128 MB) or Omega Ruby / Alpha Sapphire (.3ds/.cxi, decrypted, about 2 GB). It is only stored on this device – nothing is uploaded.',
      dropOther: 'Choose another ROM',
      romSaved: 'saved – no need to choose it again',
      romSession: 'only remembered until you close the page',
      romRemove: 'Remove',
      regions: { D: 'German', E: 'English (US)', P: 'English (Europe)', F: 'French', I: 'Italian', S: 'Spanish', J: 'Japanese', K: 'Korean' },
      romName: function (r) { return 'Pokémon Platinum' + (r ? ' (' + r + ')' : ''); },
      romNameOras: function (g) { return g === 'as' ? 'Pokémon Alpha Sapphire' : 'Pokémon Omega Ruby'; },
      warnRandomized: 'This ROM is already randomized (starters other than Turtwig, Chimchar and Piplup). Better use the unmodified original ROM – otherwise it gets randomized twice.',
      warnRandomizedOras: 'This ROM is already randomized (starters other than Treecko, Torchic and Mudkip). Better use the unmodified original ROM – otherwise it gets randomized twice.',
      warnNotStored: 'The ROM could not be stored on this device (not enough space?). Randomizing still works – but next time you have to choose it again.',
      errNotPlatinum: 'This is neither Pokémon Platinum nor Omega Ruby / Alpha Sapphire. Only these games work here.',
      errNotRom: 'This doesn\'t look like a matching ROM. Use the .nds file (Platinum) or the .3ds/.cxi file (Omega Ruby / Alpha Sapphire).',
      errEncrypted: 'This 3DS ROM is encrypted. Like Citra, the randomizer needs a decrypted .3ds/.cxi.',
      errNoSw: 'The ROM does not fit into memory this way. Reload the page once – then its offline storage hands the ROM to the randomizer piece by piece – and roll again.',
      runHintOras: 'The first time, the randomizer has to load (needs internet, about 30 seconds). Rolling itself takes about 20 seconds – only a few MB of the ROM are read.',
      downloadOras: 'Download mod (ZIP)',
      playStepsOras: function (f, tid) {
        return [
          'Unzip <code>' + f + '</code>. It contains the folder <code>romfs</code> and the file <code>code.bin</code>.',
          'In Citra: right-click the game → <i>Open Mods Location</i> (that is <code>load/mods/' + tid + '</code>). Delete an old mod there first, then copy <code>romfs</code> and <code>code.bin</code> into it.',
          '<b>Important:</b> the mod uses the same save as the original. Back up your save (right-click → <i>Open Save Data Location</i>, copy the file <code>main</code>) and then delete it – otherwise you continue the old save.',
          'Start the game and begin a new adventure. Back to the original: empty the mods folder.'
        ];
      },
      playPhoneOras: function (f, tid) { return 'The file <code>' + f + '</code> ends up in “Download”. Unzip it and copy <code>romfs</code> and <code>code.bin</code> into the game\'s mods folder (<code>load/mods/' + tid + '</code> in the Citra or Azahar folder).'; },
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
      bossReady: '✓ The boss planner, map and run dashboard already know this game (trainers and wild Pokémon).',
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

  // Randomisieren läuft: pwa.js lädt eine neue Version dann noch nicht
  window.PokeHubBusy = () => !!state.phase;

  /* ── Original-ROM ──────────────────────────────────────────────── */
  // 3DS-ROM? (NCSD = .3ds/.cci, NCCH = .cxi)
  async function is3ds(file) {
    const h = new Uint8Array(await file.slice(0x100, 0x104).arrayBuffer());
    const m = String.fromCharCode.apply(null, h);
    return m === 'NCSD' || m === 'NCCH';
  }
  async function handleRom(file) {
    state.romError = '';
    let info;
    if (await is3ds(file).catch(() => false)) { handleRomOras(file); return; }
    try {
      if (file.size < 1048576 || file.size > 512 * 1048576) throw new Error('size');   // DS-ROMs: 1–512 MB
      info = await Rando.readRomFile(file, [], [], []);
    } catch (e) {
      state.romError = e && e.message === 'notPlatinum' ? L().errNotPlatinum : L().errNotRom;
      render();
      return;
    }
    const rom = { name: file.name, size: file.size, code: info.code, starters: info.starters, file: file };
    await keepRom(rom);
  }
  // Omega Rubin / Alpha Saphir: Spiel und Starter aus der ROM (liest nur ein paar KB)
  async function handleRomOras(file) {
    let rom;
    try {
      const r = await OrasRom.openFiles([file]);
      if (!r.game) throw new Error('notPlatinum');
      const starters = await r.file(OrasRom.FILES.field).then(OrasRom._internal.startersFrom).catch(() => null);
      rom = { name: file.name, size: file.size, kind: 'oras', game: r.game, titleId: r.titleId, starters: starters, file: file };
    } catch (e) {
      const m = e && e.message;
      state.romError = m === 'encrypted' ? L().errEncrypted : m === 'notPlatinum' ? L().errNotPlatinum : L().errNotRom;
      render();
      return;
    }
    await keepRom(rom);
  }
  async function keepRom(rom) {
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
    const orig = rom.kind === 'oras' ? ORAS_STARTERS : ORIGINAL_STARTERS;
    return !!rom.starters && rom.starters.some((s, i) => s !== orig[i]);
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
  // Alle Dateien unter einem Ordner (Pfade), Ordner zuerst ausgeklappt
  async function listTree(dir) {
    if (!jlib) jlib = await window.cheerpjRunLibrary('');
    const JFile = await jlib.java.io.File, out = [], dirs = [];
    async function walk(p) {
      const kids = await (await new JFile(p)).listFiles();
      if (!kids) return;
      for (let i = 0; i < kids.length; i++) {
        const path = await kids[i].getPath();
        if (await kids[i].isDirectory()) { dirs.push(path); await walk(path); } else out.push(path);
      }
    }
    await walk(dir);
    return { files: out, dirs: dirs };
  }
  async function deleteTree(dir) {
    try {
      const t = await listTree(dir);
      await deleteFiles(t.files.concat(t.dirs.reverse(), [dir]));
    } catch (e) { /* nicht schlimm */ }
  }
  // ZIP ohne Kompression (die Spieldateien sind schon gepackt): Einträge { name, blob } → Blob
  async function makeZip(entries) {
    const crcTable = new Uint32Array(256);
    for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xEDB88320 ^ (c >>> 1) : c >>> 1; crcTable[n] = c >>> 0; }
    const crc32 = b => { let c = 0xFFFFFFFF; for (let i = 0; i < b.length; i++) c = crcTable[(c ^ b[i]) & 0xFF] ^ (c >>> 8); return (c ^ 0xFFFFFFFF) >>> 0; };
    const d = new Date(), time = (d.getHours() << 11) | (d.getMinutes() << 5) | (d.getSeconds() >> 1);
    const date = ((d.getFullYear() - 1980) << 9) | ((d.getMonth() + 1) << 5) | d.getDate();
    const parts = [], central = [];
    let offset = 0;
    for (const e of entries) {
      const data = new Uint8Array(await e.blob.arrayBuffer()), name = new TextEncoder().encode(e.name), crc = crc32(data);
      const head = new DataView(new ArrayBuffer(30));
      [[0, 0x04034b50, 4], [4, 20, 2], [8, 0, 2], [10, time, 2], [12, date, 2], [14, crc, 4], [18, data.length, 4], [22, data.length, 4], [26, name.length, 2]]
        .forEach(([o, v, n]) => (n === 4 ? head.setUint32(o, v, true) : head.setUint16(o, v, true)));
      parts.push(head.buffer, name, data);
      const c = new DataView(new ArrayBuffer(46));
      [[0, 0x02014b50, 4], [4, 20, 2], [6, 20, 2], [12, time, 2], [14, date, 2], [16, crc, 4], [20, data.length, 4], [24, data.length, 4], [28, name.length, 2], [42, offset, 4]]
        .forEach(([o, v, n]) => (n === 4 ? c.setUint32(o, v, true) : c.setUint16(o, v, true)));
      central.push(c.buffer, name);
      offset += 30 + name.length + data.length;
    }
    const cdSize = central.reduce((n, b) => n + b.byteLength, 0);
    const end = new DataView(new ArrayBuffer(22));
    [[0, 0x06054b50, 4], [8, entries.length, 2], [10, entries.length, 2], [12, cdSize, 4], [16, offset, 4]]
      .forEach(([o, v, n]) => (n === 4 ? end.setUint32(o, v, true) : end.setUint16(o, v, true)));
    return new Blob(parts.concat(central, [end.buffer]), { type: 'application/zip' });
  }
  // Die ROM an den Service Worker geben (der liefert sie CheerpJ stückweise); false = kein Service Worker aktiv
  function handRomToWorker(file) {
    const sw = navigator.serviceWorker && navigator.serviceWorker.controller;
    if (!sw) return Promise.resolve(false);
    return new Promise(resolve => {
      const ch = new MessageChannel();
      const t = setTimeout(() => resolve(false), 5000);
      ch.port1.onmessage = e => { clearTimeout(t); resolve(!!(e.data && e.data.ok)); };
      sw.postMessage({ type: 'rando-rom', file: file }, [ch.port2]);
    });
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

  function outName(rom) {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    const stamp = d.getFullYear() + '-' + p(d.getMonth() + 1) + '-' + p(d.getDate()) + '-' + p(d.getHours()) + p(d.getMinutes());
    if (rom && rom.kind === 'oras') return (rom.game === 'as' ? 'AlphaSaphir' : 'OmegaRubin') + '-Random-' + stamp + '.zip';
    return 'Platin-Random-' + stamp + '.nds';
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
    updateScene();
  }

  // Spielhalle hinter der Karte (slots.js): Automat zeigt ROM, Würfeln und Ergebnis, der Hebel würfelt
  function updateScene() {
    if (!window.SlotScene) return;
    const l = L(), r = state.result;
    window.SlotScene.update({
      rom: !!state.rom,
      busy: !!state.phase,
      phase: state.phase ? l.phase[state.phase] : '',
      secs: state.phase ? $('run-time').textContent : '',
      error: !!state.runError,
      result: r ? { url: r.url, fileName: r.fileName, size: mb(r.size), boss: r.boss, starters: r.starters } : null,
      roll: () => $('run').click(),
      pick: () => $('rom-input').click(),
    });
  }

  function clearResult() {
    const r = state.result;
    if (r) { URL.revokeObjectURL(r.url); if (r.logUrl) URL.revokeObjectURL(r.logUrl); }
    state.result = null;
  }

  async function run() {
    if (!state.rom || state.phase) return;
    if (state.rom.kind === 'oras') { runOras(); return; }
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

      const fileName = outName(state.rom);
      const info = await readTeams(rom, fileName);
      state.result = {
        // Eigener Dateityp, sonst hängt z. B. Samsung Internet „.txt“ an den Namen (slice kopiert nichts)
        url: URL.createObjectURL(rom.slice(0, rom.size, 'application/x-nintendo-ds-rom')),
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

  // Omega Rubin / Alpha Saphir: ROM über den Service Worker, Ausgabe als LayeredFS-Ordner → ZIP
  async function runOras() {
    state.runError = null;
    clearResult();
    const lines = [];
    const restore = captureConsole(lines);
    let inMemory = false;
    setPhase(javaReady ? 'prepare' : 'load');
    try {
      const viaWorker = await handRomToWorker(state.rom.file);
      await java();
      setPhase('prepare');
      let input;
      if (viaWorker) input = '/app' + decodeURIComponent(new URL('__rom/rom-' + state.romVersion + '-' + Date.now() + '.cxi', location.href).pathname);
      else {
        // Ohne Service Worker (z. B. beim Entwickeln auf localhost): die Spiel-Partition ganz in den Speicher (~1,8 GB)
        inMemory = true;
        if (strRomVersion !== state.romVersion) {
          const part = await romPart(state.rom.file);
          strRom = '/str/rom' + state.romVersion + '.cxi';
          window.cheerpOSAddStringFile(strRom, new Uint8Array(await state.rom.file.slice(part.start, part.start + part.size).arrayBuffer()));
          strRomVersion = state.romVersion;
        }
        input = strRom;
      }
      const settings = await editor.file().catch(() => { throw new Error('loader'); });
      const setPath = '/str/settings' + (++strCount) + '.rnqs';
      window.cheerpOSAddStringFile(setPath, settings);
      await deleteTree(ORAS_OUT);
      await deleteFiles([ORAS_OUT + '.log']);

      setPhase('run');
      const code = await window.cheerpjRunMain(MAIN_CLASS, JAR, 'cli', '-s', setPath, '-i', input, '-o', ORAS_OUT, '-d', '-l');

      setPhase('finish');
      const tree = await listTree(ORAS_OUT).catch(() => ({ files: [], dirs: [] }));
      if (code !== 0 || !tree.files.length) throw Object.assign(new Error('run'), { code: code });
      // Pfade unter dem Ordner mit der Title-ID: romfs/…, code.bin – so gehören sie in den Mod-Ordner von Citra
      const entries = [];
      for (const f of tree.files) entries.push({ name: f.slice(ORAS_OUT.length + 1).replace(/^[0-9A-Fa-f]{16}\//, ''), blob: await window.cjFileBlob(f) });
      let log = null;
      try { log = await window.cjFileBlob(ORAS_OUT + '.log'); } catch (e) { /* ohne Log */ }
      await deleteTree(ORAS_OUT);
      await deleteFiles([ORAS_OUT + '.log']);

      const fileName = outName(state.rom);
      const zip = await makeZip(entries);
      const info = await readTeamsOras(entries, fileName);
      state.result = {
        url: URL.createObjectURL(zip), logUrl: log ? URL.createObjectURL(log) : null,
        fileName: fileName, size: zip.size, starters: info.starters, boss: info.boss, oras: true, titleId: state.rom.titleId
      };
    } catch (e) {
      const l = L(), msg = e && e.message;
      let text;
      if (msg === 'loader') text = l.errLoader;
      else if (msg === 'run') text = l.errRun(e.code) + (editor.isCustom() ? l.errRunCustom : '');
      else if (e instanceof RangeError || /memory|allocation/i.test(msg || '')) text = inMemory ? l.errNoSw : l.errMemory;
      else text = l.errOther + msg;
      state.runError = { text: text, details: lines.slice(-12).join('\n') };
    } finally {
      restore();
      setPhase(null);
    }
  }
  // Spiel-Partition einer .3ds (NCSD → Partition 0); eine .cxi ist sie schon
  async function romPart(file) {
    const h = new Uint8Array(await file.slice(0, 0x200).arrayBuffer());
    const u32 = o => (h[o] | (h[o + 1] << 8) | (h[o + 2] << 16) | (h[o + 3] << 24)) >>> 0;
    if (String.fromCharCode(h[0x100], h[0x101], h[0x102], h[0x103]) === 'NCSD') return { start: u32(0x120) * 0x200, size: u32(0x124) * 0x200 };
    return { start: 0, size: file.size };
  }
  // Wie readTeams, aus den Dateien des Mods (fehlende Dateien = unverändert, dann gelten die Originaldaten)
  async function readTeamsOras(entries, fileName) {
    try {
      const B = await (await fetch('../Bosse/bosses-oras.json')).json();
      const tid = state.rom.titleId || '000400000011C400';
      const rom = OrasRom.openLayered(entries.map(e => ({ path: tid + '/' + e.name, read: () => e.blob.arrayBuffer().then(b => new Uint8Array(b)) })));
      if (!rom.game) rom.game = state.rom.game;
      const res = OrasRom.hubState(await OrasRom.readGameData(rom), Object.keys(B.trainers).map(Number), B, OD.personal);
      res.version = state.rom.game;
      let boss = false;
      try {
        localStorage.setItem('bosse-rando', JSON.stringify(Object.assign({ name: fileName, loadedAt: Date.now() }, res)));
        boss = true;
      } catch (e) { window.PokeHubStorageWarning?.(true); }
      return { starters: res.starters || state.rom.starters, boss: boss };
    } catch (e) {
      return { starters: null, boss: false };
    }
  }

  // Starter und Trainerteams aus der neuen ROM lesen; die Teams bekommt der Boss-Planer
  async function readTeams(rom, fileName) {
    let B = null;
    try { B = await (await fetch('../Bosse/bosses.json')).json(); } catch (e) { /* ohne Boss-Planer */ }
    try {
      const res = await Rando.readRomFile(rom, B ? Object.keys(B.trainers).map(Number) : [], B ? B.fem : [], D.personal);
      let boss = false;
      if (B) {
        try {
          localStorage.setItem('bosse-rando', JSON.stringify(Object.assign({ name: fileName, loadedAt: Date.now() }, res)));
          boss = true;
        } catch (e) { window.PokeHubStorageWarning?.(true); }
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
        '<span class="rom-card-name">' + esc(rom.kind === 'oras' ? l.romNameOras(rom.game) : l.romName(region)) + '</span>' +
        '<span class="rom-card-meta">' + esc(rom.name) + ' · ' + mb(rom.size) + ' · ' + esc(rom.stored ? l.romSaved : l.romSession) + '</span>' +
      '</div>' +
      '<button type="button" class="small-btn" id="rom-remove">' + esc(l.romRemove) + '</button>';
  }

  function playHtml(r) {
    const l = L(), T = (r.oras ? OD : D).text[lang];
    // OR/AS: 3D-Renderbilder aus Pokémon HOME (weich skaliert)
    const spr = r.oras ? SPR + '/pokemon/other/home/' : PT_SPR;
    // Starter erst auf Wunsch zeigen – sonst ist die Überraschung im neuen Spiel weg
    const starters = r.starters ? '<details class="starters-spoiler"><summary>' + esc(l.starters) + '</summary><div class="starters">' +
      r.starters.map(s => '<div class="starter"><img' + (r.oras ? ' class="is-3d"' : '') + ' src="' + spr + s + '.png" alt="" loading="lazy"><b>' + esc(T.species[s] || '#' + s) + '</b></div>').join('') +
      '</div></details>' : '';
    return '<div class="play-title">' + esc(l.playTitle) + '</div>' +
      '<a class="big-btn" href="' + r.url + '" download="' + esc(r.fileName) + '">' +
        '<svg class="dice" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3v12M7 10l5 5 5-5"/><path d="M4 17v2a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-2"/></svg>' +
        '<span>' + esc(r.oras ? l.downloadOras : l.download) + '</span></a>' +
      '<p class="play-file">' + esc(r.fileName) + ' · ' + mb(r.size) + '</p>' +
      '<ol>' + (r.oras ? l.playStepsOras(esc(r.fileName), esc(r.titleId || '')).map((s, i) => i === 1 && PHONE ? l.playPhoneOras(esc(r.fileName), esc(r.titleId || '')) : s)
        : l.playSteps(esc(r.fileName)).map((s, i) => i === 0 && PHONE ? l.playPhone(esc(r.fileName), ANDROID) : s)).map(s => '<li>' + s + '</li>').join('') + '</ol>' +
      '<div class="play-boss">' +
        (r.boss ? '<span>' + esc(l.bossReady) + '</span><a class="small-btn" href="../Bosse/index.html">' + esc(l.bossOpen) + '</a>' : '') +
        (r.logUrl ? '<a class="small-btn" href="' + r.logUrl + '" download="' + esc(r.fileName.replace(/\.(nds|zip)$/, '')) + '-Log.txt">' + esc(l.log) + '</a>' : '') +
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
    const warn = rom ? [isRandomized(rom) ? (rom.kind === 'oras' ? l.warnRandomizedOras : l.warnRandomized) : '', rom.stored ? '' : l.warnNotStored].filter(Boolean).join(' ') : '';
    // Spiel im Titel: das der gewählten ROM
    const badge = document.querySelector('.game-badge');
    if (badge && rom) badge.textContent = rom.kind === 'oras' ? l.gameOras[rom.game] || l.gameOras.or : l.gameBadge;
    $('run-hint').textContent = rom && rom.kind === 'oras' ? l.runHintOras : l.runHint;
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
