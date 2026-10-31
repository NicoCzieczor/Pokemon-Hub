/*
 * pwa.js – macht aus dem Pokémon Hub eine App fürs iPhone-Homescreen.
 * Wird in jeder Seite ganz oben im <head> geladen.
 *
 *  1. Service Worker registrieren (Offline-Modus)
 *  2. App-Gefühl: kein Text-Markieren, kein Zoom, kein „Link-Vorschau“-Popup
 *  3. Langes Drücken = Rechtsklick (Team-Slots, Box, Graveyard, Runs … löschen)
 *  4. Speicherstand sichern / laden (Buttons auf der Startseite)
 *  5. Navigationsleiste der Tools: aktiver Tab sichtbar, Sprachknopf in der Leiste statt darüber
 *  6. Design (Theme): Klassik, Papier, Graphit – Farben in theme.css, Knopf neben dem Sprachknopf
 */
(function () {
  'use strict';

  /* ── 6a. Theme sofort setzen (vor dem ersten Zeichnen, sonst blitzt das alte Design auf) ── */
  var THEMES = ['classic', 'paper', 'graphite'];
  var THEME_BG = { classic: '#0d0f2b', paper: '#e4ded3', graphite: '#171716' };
  function storedTheme() {
    var t = 'classic';
    try { t = localStorage.getItem('hub-theme') || 'classic'; } catch (e) {}
    return THEMES.indexOf(t) < 0 ? 'classic' : t;
  }
  function applyTheme(t) {
    document.documentElement.setAttribute('data-theme', t);
    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', THEME_BG[t]);
  }
  applyTheme(storedTheme());

  var scriptUrl = document.currentScript && document.currentScript.src;
  var standalone = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  var touch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    navigator.maxTouchPoints > 0;

  // Handy-Startseite am PC → PC-Startseite (Gegenstück zur Weiterleitung in home.js, gleiche Bedingung).
  // Die App startet auf mobile.html (manifest.json), damit am Handy keine Weiterleitung nötig ist.
  if (scriptUrl && location.href.split(/[?#]/)[0] === scriptUrl.replace(/pwa\.js(\?.*)?$/, '') + 'mobile.html') {
    var phoneHome = navigator.maxTouchPoints > 0 &&
      ((window.matchMedia && window.matchMedia('(pointer: coarse)').matches) || window.innerWidth <= 768);
    if (!phoneHome) { location.replace('index.html'); return; }
  }

  /* ── 1. Service Worker ─────────────────────────────────────────────── */
  // Beim Entwickeln (VS Code Live Server, localhost, Heimnetz) kein Offline-Speicher,
  // sonst sieht man nach dem Speichern erst mal die alte Version.
  var localDev = /^(localhost|127\.\d+\.\d+\.\d+|\[::1\]|0\.0\.0\.0|10\.\d+\.\d+\.\d+|192\.168\.\d+\.\d+|172\.(1[6-9]|2\d|3[01])\.\d+\.\d+)$/.test(location.hostname) ||
    /\.local$/.test(location.hostname);
  if ('serviceWorker' in navigator && localDev) {
    navigator.serviceWorker.getRegistrations().then(function (regs) {
      regs.forEach(function (r) { r.unregister(); });
    }).catch(function () {});
    if (window.caches) {
      caches.keys().then(function (names) {
        names.forEach(function (n) { if (n.indexOf('pokehub-') === 0) caches.delete(n); });
      }).catch(function () {});
    }
  } else if ('serviceWorker' in navigator && scriptUrl && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(new URL('sw.js', scriptUrl).href).catch(function (err) {
        console.warn('[PokéHub] Service Worker nicht registriert:', err);
      });
    });
    watchUpdates();
  }

  // Neue Version: Der neue Service Worker übernimmt sofort. Die offene Seite wird dann neu geladen, damit HTML
  // und Skripte zusammenpassen – gleich, solange noch nichts angetippt wurde (auf der Startseite immer gleich),
  // sonst sobald die App in den Hintergrund geht oder zurückkommt. Seiten mit ungesicherter Arbeit melden das
  // über window.PokeHubBusy(). Solange die App offen ist, wird alle 5 Minuten nach einer neuen Version gesehen.
  function watchUpdates() {
    var CHECK = 5 * 60 * 1000;
    var hadController = !!navigator.serviceWorker.controller, touched = false, pending = false, lastCheck = Date.now();
    ['pointerdown', 'keydown'].forEach(function (t) {
      window.addEventListener(t, function () { touched = true; }, { capture: true, passive: true });
    });
    function reloadIfIdle() {
      if (!pending || (window.PokeHubBusy && window.PokeHubBusy())) return;
      pending = false;
      location.reload();
    }
    function checkForUpdate() {
      lastCheck = Date.now();
      navigator.serviceWorker.getRegistration().then(function (r) { if (r) r.update(); }).catch(function () {});
    }
    navigator.serviceWorker.addEventListener('controllerchange', function () {
      if (!hadController) { hadController = true; return; }   // erste Installation: die Seite ist schon aktuell
      pending = true;
      if (!touched || document.getElementById('app-version')) reloadIfIdle();
    });
    document.addEventListener('visibilitychange', function () {
      reloadIfIdle();
      if (document.visibilityState === 'visible' && Date.now() - lastCheck > CHECK) checkForUpdate();
    });
    setInterval(function () { if (document.visibilityState === 'visible') checkForUpdate(); }, CHECK);
  }

  // Installierte Version unten auf der Startseite (fragt den Service Worker, der die Seite gerade ausliefert)
  function showVersion() {
    var el = document.getElementById('app-version');
    if (!el || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.addEventListener('message', function (e) {
      if (e.data && e.data.version) { el.textContent = 'Version ' + e.data.version; el.hidden = false; }
    });
    function ask() { if (navigator.serviceWorker.controller) navigator.serviceWorker.controller.postMessage('version'); }
    ask();
    navigator.serviceWorker.addEventListener('controllerchange', ask);
  }
  // Bitte den Browser, den Speicher nicht automatisch aufzuräumen.
  try {
    if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(function () {});
  } catch (e) {}

  /* ── 2. App-Gefühl (nur am Handy / als installierte App) ───────────── */
  if (standalone || touch) {
    var css = [
      'html { -webkit-touch-callout: none; -webkit-tap-highlight-color: transparent; -webkit-text-size-adjust: 100%; touch-action: manipulation; }',
      'body { -webkit-user-select: none; user-select: none; }',
      'input, textarea, select, [contenteditable] { -webkit-user-select: text; user-select: text; -webkit-touch-callout: default; }'
    ].join('\n');
    var style = document.createElement('style');
    style.id = 'pokehub-app-style';
    style.textContent = css;
    (document.head || document.documentElement).appendChild(style);

    var viewport = document.querySelector('meta[name="viewport"]');
    if (viewport && !/maximum-scale/.test(viewport.content)) viewport.content += ', maximum-scale=1';
  }

  /* ── 3. Langes Drücken = Rechtsklick ───────────────────────────────── */
  var hapticLabel = null;

  // iPhones haben kein navigator.vibrate. Ab iOS 18 gibt ein umgeschalteter
  // „switch“-Schalter aber ein kurzes Tippen ab – das nutzen wir unsichtbar.
  function haptic() {
    try {
      if (navigator.vibrate) { navigator.vibrate(12); return; }
      if (!document.body) return;
      if (!hapticLabel) {
        hapticLabel = document.createElement('label');
        hapticLabel.setAttribute('aria-hidden', 'true');
        hapticLabel.style.cssText = 'position:fixed;left:-9999px;top:0;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none';
        var input = document.createElement('input');
        input.type = 'checkbox';
        input.setAttribute('switch', '');
        input.tabIndex = -1;
        hapticLabel.appendChild(input);
        document.body.appendChild(hapticLabel);
      }
      hapticLabel.click();
    } catch (e) {}
  }
  // Klicks/Änderungen des unsichtbaren Schalters sollen die Seite nicht erreichen.
  ['click', 'input', 'change'].forEach(function (type) {
    window.addEventListener(type, function (e) {
      if (hapticLabel && hapticLabel.contains(e.target)) e.stopImmediatePropagation();
    }, true);
  });

  var HOLD_MS = 550, MOVE_TOLERANCE = 10;
  var timer = null, startX = 0, startY = 0, target = null;
  var suppressClick = false, lastSynthetic = 0;

  function cancel() { if (timer) { clearTimeout(timer); timer = null; } }
  function isEditable(el) {
    return !!(el && el.closest && el.closest('input, textarea, select, [contenteditable=""], [contenteditable="true"]'));
  }

  document.addEventListener('touchstart', function (e) {
    cancel();
    if (e.touches.length !== 1 || isEditable(e.target)) return;
    var t = e.touches[0];
    startX = t.clientX; startY = t.clientY; target = e.target;
    timer = setTimeout(function () {
      timer = null;
      if (!target || !target.isConnected) return;
      haptic();
      lastSynthetic = Date.now();
      suppressClick = true;
      target.dispatchEvent(new MouseEvent('contextmenu', {
        bubbles: true, cancelable: true, view: window, button: 2, buttons: 2,
        clientX: startX, clientY: startY, screenX: startX, screenY: startY
      }));
    }, HOLD_MS);
  }, { capture: true, passive: true });

  document.addEventListener('touchmove', function (e) {
    if (!timer) return;
    var t = e.touches[0];
    if (!t || Math.abs(t.clientX - startX) > MOVE_TOLERANCE || Math.abs(t.clientY - startY) > MOVE_TOLERANCE) cancel();
  }, { capture: true, passive: true });

  document.addEventListener('touchend', function (e) {
    cancel();
    if (suppressClick) {
      e.preventDefault(); // kein normaler Klick nach dem langen Drücken
      setTimeout(function () { suppressClick = false; }, 350);
    }
  }, { capture: true, passive: false });

  document.addEventListener('touchcancel', cancel, { capture: true, passive: true });

  document.addEventListener('click', function (e) {
    if (!suppressClick) return;
    suppressClick = false;
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
  }, true);

  // Falls iOS selbst ein contextmenu schickt: nicht doppelt auslösen
  document.addEventListener('contextmenu', function (e) {
    if (!e.isTrusted) return;
    if (timer) { cancel(); return; }
    if (Date.now() - lastSynthetic < 1000) { e.preventDefault(); e.stopImmediatePropagation(); }
  }, true);

  /* ── 4a. Hinweis, wenn der Browser nicht mehr speichern kann (Speicher voll) ── */
  // Die Seiten rufen PokeHubStorageWarning(true) nach einem fehlgeschlagenen Speichern auf, (false) nach einem
  // geglückten. Antippen blendet den Hinweis aus.
  var STORAGE_TEXT = {
    de: 'Speichern fehlgeschlagen – der Gerätespeicher ist voll. Diese Änderung gilt nur, bis die Seite geschlossen wird. Sichere deine Daten auf der Startseite.',
    en: 'Saving failed – device storage is full. This change only lasts until the page is closed. Back up your data on the home page.'
  };
  function storageWarning(show) {
    var el = document.getElementById('storage-warning');
    if (!show) { if (el) el.hidden = true; return; }
    if (!el) {
      el = document.createElement('div');
      el.id = 'storage-warning';
      el.className = 'storage-warning';
      el.setAttribute('role', 'alert');
      el.addEventListener('click', function () { el.hidden = true; });
      document.body.appendChild(el);
    }
    var l = 'de';
    try { l = localStorage.getItem('hub-lang') === 'en' ? 'en' : 'de'; } catch (e) {}
    el.textContent = STORAGE_TEXT[l];
    el.hidden = false;
  }
  window.PokeHubStorageWarning = storageWarning;

  /* ── 4. Speicherstand sichern / laden ──────────────────────────────── */
  // Gesichert werden nur die Einträge des Hubs (andere Seiten unter derselben github.io-Adresse teilen sich den
  // Speicher und bleiben unberührt) plus die Spielstände aus dem Save-Viewer. Bewusst nicht dabei: die
  // Duo-Verbindung (sync-session) – eine weitergegebene Sicherung würde sonst den Zugang zur Session mitgeben –
  // und die ROM des Randomizers (zu groß, muss neu ausgewählt werden).
  var BACKUP_APP = 'pokemon-hub';
  var BACKUP_FORMAT = 2;
  var HUB_KEYS = ['hub-lang', 'hub-theme', 'hub-gen', 'dc-gen',
    'pokemon-run-dashboard-state', 'pokemon-run-dashboard-runs', 'nuzlocke-custom-rules',
    'pokemon-team-builder-state', 'pokemon-duo-nuzlocke-state', 'pokemon-trio-nuzlocke-state',
    'rando-settings', 'bosse-rando', 'bosse-starter', 'bosse-save', 'saveviewer-duo-p1', 'hub-lcp-game', 'catchrate-game', 'bosse-manual-team', 'hub-active-game'];
  var HUB_PREFIXES = ['bosse-team:', 'saveviewer-links-', 'saveviewer-fixes-', 'saveviewer-grave-'];
  var MAX_SAVE_BYTES = 4 * 1024 * 1024;
  var TEXT = {
    de: {
      shareTitle: 'Pokémon Hub Backup',
      empty: 'Es gibt noch keine gespeicherten Daten.',
      bad: 'Das ist keine gültige Pokémon-Hub-Sicherung.',
      confirm: function (n, saves, date) {
        return 'Sicherung' + (date ? ' vom ' + date : '') + ' mit ' + n + ' Einträgen' +
          (saves != null ? ' und ' + saves + (saves === 1 ? ' Spielstand' : ' Spielständen') : '') + ' laden?\n\n' +
          'Die aktuellen Hub-Daten auf diesem Gerät werden dabei ersetzt. Nicht in der Sicherung: die ROM für den ' +
          'Randomizer (bei Bedarf neu auswählen) und eine Duo-Verbindung (mit dem Code neu beitreten).';
      },
      done: 'Sicherung geladen.',
      savesFailed: 'Die Einträge sind geladen, die Spielstände für den Save-Viewer aber nicht. Lade sie dort bei Bedarf neu.',
      failed: 'Laden fehlgeschlagen: '
    },
    en: {
      shareTitle: 'Pokémon Hub backup',
      empty: 'There is no saved data yet.',
      bad: 'This is not a valid Pokémon Hub backup.',
      confirm: function (n, saves, date) {
        return 'Load backup' + (date ? ' from ' + date : '') + ' with ' + n + ' entries' +
          (saves != null ? ' and ' + saves + (saves === 1 ? ' save file' : ' save files') : '') + '?\n\n' +
          'The current hub data on this device will be replaced. Not included: the ROM for the Randomizer ' +
          '(select it again if needed) and a Duo connection (join again with the code).';
      },
      done: 'Backup loaded.',
      savesFailed: 'The entries were loaded, but the save files for the Save Viewer were not. Load them there again if needed.',
      failed: 'Loading failed: '
    }
  };
  function tr() {
    var l = 'de';
    try { l = localStorage.getItem('hub-lang') || 'de'; } catch (e) {}
    return TEXT[l] || TEXT.de;
  }

  function isHubKey(k) {
    return HUB_KEYS.indexOf(k) >= 0 || HUB_PREFIXES.some(function (p) { return k.indexOf(p) === 0; });
  }
  // Grobe Prüfung je Eintrag: einfache Werte haben ein festes Format, alles andere muss ein JSON-Objekt sein
  function validValue(k, v) {
    if (typeof v !== 'string' || v.length > 5000000) return false;
    if (k === 'hub-lang') return v === 'de' || v === 'en';
    if (k === 'hub-theme') return THEMES.indexOf(v) >= 0;
    if (k === 'hub-gen' || k === 'dc-gen' || k === 'bosse-save' || k.indexOf('saveviewer-grave-') === 0) return /^-?\d{1,4}$/.test(v);
    if (k === 'bosse-starter' || k === 'saveviewer-duo-p1' || k === 'hub-lcp-game' || k === 'catchrate-game' || k === 'hub-active-game') return v.length <= 64;
    try { var j = JSON.parse(v); return j !== null && typeof j === 'object'; } catch (e) { return false; }
  }

  function collect() {
    var out = {};
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      if (isHubKey(key)) out[key] = localStorage.getItem(key);
    }
    return out;
  }

  /* Spielstände des Save-Viewers (IndexedDB, gleicher Aufbau wie in SaveViewer/main.js) */
  function savesDb() {
    return new Promise(function (res, rej) {
      if (!window.indexedDB) { rej(new Error('no idb')); return; }
      var r = indexedDB.open('pokehub-saveviewer', 1);
      r.onupgradeneeded = function () { r.result.createObjectStore('saves', { keyPath: 'slot' }); };
      r.onsuccess = function () { res(r.result); };
      r.onerror = function () { rej(r.error); };
    });
  }
  function readSaves() {
    return savesDb().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction('saves', 'readonly'), req = t.objectStore('saves').getAll();
        t.oncomplete = function () { db.close(); res(req.result || []); };
        t.onerror = t.onabort = function () { db.close(); rej(t.error); };
      });
    });
  }
  function writeSaves(records) {
    return savesDb().then(function (db) {
      return new Promise(function (res, rej) {
        var t = db.transaction('saves', 'readwrite'), store = t.objectStore('saves');
        store.clear();
        records.forEach(function (rec) { store.put(rec); });
        t.oncomplete = function () { db.close(); res(); };
        t.onerror = t.onabort = function () { db.close(); rej(t.error); };
      });
    });
  }
  function toB64(buf) {
    var bytes = new Uint8Array(buf), s = '';
    for (var i = 0; i < bytes.length; i += 0x8000) s += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
    return btoa(s);
  }
  function fromB64(text) {
    var s = atob(text), bytes = new Uint8Array(s.length);
    for (var i = 0; i < s.length; i++) bytes[i] = s.charCodeAt(i);
    return bytes.buffer;
  }

  // Vorab gelesen: Teilen am Handy klappt nur direkt nach dem Antippen, nicht erst nach dem Lesen der Datenbank
  var savesCache = null;
  function refreshSaves() {
    return readSaves().catch(function () { return []; }).then(function (list) { savesCache = list; return list; });
  }

  function exportData() {
    if (savesCache) { share(savesCache); return; }
    refreshSaves().then(share);
  }

  function share(saves) {
    var t = tr();
    var data = collect();
    if (!Object.keys(data).length && !saves.length) { alert(t.empty); return; }
    var now = new Date();
    var json = JSON.stringify({
      app: BACKUP_APP, format: BACKUP_FORMAT, exportedAt: now.toISOString(), data: data,
      saves: saves.map(function (rec) {
        return { slot: rec.slot, fileName: rec.fileName, loadedAt: rec.loadedAt, bytes: toB64(rec.bytes) };
      })
    }, null, 2);
    var name = 'pokemon-hub-backup-' + now.toISOString().slice(0, 10) + '.json';
    var file = new File([json], name, { type: 'application/json' });

    // Am Handy: Teilen-Menü („In Dateien sichern“, AirDrop, Nachricht …)
    if (touch && navigator.canShare && navigator.share) {
      var canShareFile = false;
      try { canShareFile = navigator.canShare({ files: [file] }); } catch (e) {}
      if (canShareFile) {
        navigator.share({ files: [file], title: t.shareTitle }).catch(function (err) {
          if (err && err.name !== 'AbortError') download(file, name);
        });
        return;
      }
    }
    download(file, name);
  }

  function download(blob, name) {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () { URL.revokeObjectURL(a.href); a.remove(); }, 2000);
  }

  function importData() {
    var input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json,.json';
    input.style.display = 'none';
    document.body.appendChild(input);
    input.addEventListener('change', function () {
      var file = input.files && input.files[0];
      input.remove();
      if (!file) return;
      file.text().then(restore).catch(function (err) { alert(tr().failed + err.message); });
    });
    input.click();
  }

  // Sicherung prüfen; null = unbrauchbar. Fremde Schlüssel (ältere Sicherungen enthielten alles) werden übergangen,
  // ein Hub-Eintrag mit falschem Format macht die ganze Sicherung ungültig.
  function parseBackup(text) {
    var payload;
    try { payload = JSON.parse(text); } catch (e) { return null; }
    if (!payload || payload.app !== BACKUP_APP || (payload.format !== 1 && payload.format !== 2)) return null;
    var data = payload.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
    var keys = Object.keys(data).filter(isHubKey);
    if (!keys.every(function (k) { return validValue(k, data[k]); })) return null;
    var saves = null;
    if (payload.format === 2) {
      if (!Array.isArray(payload.saves) || payload.saves.length > 2) return null;
      try {
        saves = payload.saves.map(function (s) {
          if (!s || (s.slot !== 1 && s.slot !== 2) || typeof s.fileName !== 'string' || typeof s.bytes !== 'string') throw new Error('save');
          var bytes = fromB64(s.bytes);
          if (!bytes.byteLength || bytes.byteLength > MAX_SAVE_BYTES) throw new Error('save');
          return { slot: s.slot, fileName: s.fileName.slice(0, 200), loadedAt: Number(s.loadedAt) || Date.now(), bytes: bytes };
        });
      } catch (e) { return null; }
    }
    if (!keys.length && !(saves && saves.length)) return null;
    return { keys: keys, data: data, saves: saves, exportedAt: payload.exportedAt };
  }

  function restore(text) {
    var t = tr();
    var b = parseBackup(text);
    if (!b) { alert(t.bad); return; }

    var date = '';
    try { date = b.exportedAt ? new Date(b.exportedAt).toLocaleString() : ''; } catch (e) {}
    if (!confirm(t.confirm(b.keys.length, b.saves ? b.saves.length : null, date))) return;

    var before = collect();
    try {
      Object.keys(before).forEach(function (k) { localStorage.removeItem(k); });
      b.keys.forEach(function (k) { localStorage.setItem(k, b.data[k]); });
    } catch (err) {
      // Zurück zum alten Stand, falls etwas schiefgeht (z. B. Speicher voll)
      try {
        Object.keys(collect()).forEach(function (k) { localStorage.removeItem(k); });
        Object.keys(before).forEach(function (k) { localStorage.setItem(k, before[k]); });
      } catch (e) {}
      alert(t.failed + err.message);
      return;
    }
    var saves = b.saves ? writeSaves(b.saves).then(function () { return true; }, function () { return false; }) : Promise.resolve(true);
    saves.then(function (ok) {
      alert(ok ? t.done : t.savesFailed);
      location.reload();
    });
  }

  window.PokeHubBackup = { exportData: exportData, importData: importData };

  document.addEventListener('DOMContentLoaded', function () {
    var exp = document.getElementById('backup-export');
    var imp = document.getElementById('backup-import');
    if (exp) exp.addEventListener('click', exportData);
    if (exp) {
      refreshSaves();
      // Zurück vom Save-Viewer (gleicher oder anderer Tab): Spielstände neu einlesen
      window.addEventListener('pageshow', refreshSaves);
      document.addEventListener('visibilitychange', function () { if (document.visibilityState === 'visible') refreshSaves(); });
    }
    if (imp) imp.addEventListener('click', importData);
    showVersion();
    applyTheme(storedTheme()); // meta theme-color steht erst jetzt sicher im DOM
    setupThemeButton();
    labelToolNav();
    phoneLinks();
    setupToolNav();
    setupGameChip();
    setupHomeMenu();
    // Sprachwechsel: Leiste und Menü neu beschriften (die Seite hat 'hub-lang' dann schon umgestellt)
    var langBtn = document.getElementById('lang-toggle') || document.getElementById('lang-btn');
    if (langBtn) langBtn.addEventListener('click', function () { setTimeout(function () { labelToolNav(); updateGameChips(); updateNavMenu(); }, 0); });
  });

  /* ── 8. Aktives Spiel des Hubs ─────────────────────────────────────── */
  // Ein Spiel für alle Tools (hub-active-game, Schlüssel wie im Run-Dashboard). Standard: keins – dann nutzt
  // jedes Tool seine eigene Einstellung. Daraus folgen die Generation (hub-gen:
  // Schadens- und Typrechner, „Typen wie in“) sowie die Auswahl im Fangrate-Rechner, in der Level-Cap-Leiste und
  // – als Start – im Pokédex. Das Run-Dashboard setzt es beim Wählen oder Anlegen eines Runs; die Wahl eines Spiels
  // auf einer Seite gilt überall, eine bloße Generation nicht (siehe setGen). Seiten hören auf das Ereignis
  // 'hubgamechange' (detail: { game, gen }).
  var HUB_GAME_KEY = 'hub-active-game';
  // [Schlüssel, Gen, kurz de, kurz en, lang de, lang en, Fangrate, Level-Cap-Leiste, Pokédex-Edition]
  var HUB_GAMES = [
    ['rot-blau', 1, 'Rot/Blau', 'Red/Blue', 'Rot / Blau', 'Red / Blue', 'rby', 'rot-blau', 'red-blue'],
    ['gelb', 1, 'Gelb', 'Yellow', 'Gelb', 'Yellow', 'rby', 'gelb', 'yellow'],
    ['gold-silber', 2, 'Gold/Silber', 'Gold/Silver', 'Gold / Silber', 'Gold / Silver', 'gsc', 'gold-silber', 'gold-silver'],
    ['kristall', 2, 'Kristall', 'Crystal', 'Kristall', 'Crystal', 'gsc', 'kristall', 'crystal'],
    ['rubin-saphir', 3, 'Rubin/Saphir', 'Ruby/Sapphire', 'Rubin / Saphir', 'Ruby / Sapphire', 'rse', 'rubin-saphir', 'ruby-sapphire'],
    ['smaragd', 3, 'Smaragd', 'Emerald', 'Smaragd', 'Emerald', 'rse', 'smaragd', 'emerald'],
    ['feuerrot-blattgruen', 3, 'FR/BG', 'FR/LG', 'Feuerrot / Blattgrün', 'FireRed / LeafGreen', 'frlg', 'feuerrot-blattgruen', 'firered-leafgreen'],
    ['diamant-perl', 4, 'Diamant/Perl', 'Diamond/Pearl', 'Diamant / Perl', 'Diamond / Pearl', 'dpp', 'diamant-perl', 'diamond-pearl'],
    ['platin', 4, 'Platin', 'Platinum', 'Platin', 'Platinum', 'dpp', 'platin', 'platinum'],
    ['heartgold-soulsilver', 4, 'HG/SS', 'HG/SS', 'HeartGold / SoulSilver', 'HeartGold / SoulSilver', 'hgss', 'heartgold-soulsilver', 'heartgold-soulsilver'],
    ['schwarz-weiss', 5, 'Schwarz/Weiß', 'Black/White', 'Schwarz / Weiß', 'Black / White', 'bw', 'schwarz-weiss', 'black-white'],
    ['schwarz2-weiss2', 5, 'S2/W2', 'B2/W2', 'Schwarz 2 / Weiß 2', 'Black 2 / White 2', 'bw2', 'schwarz2-weiss2', 'black-2-white-2'],
    ['x-y', 6, 'X/Y', 'X/Y', 'X / Y', 'X / Y', 'xy', 'x-y', 'x-y'],
    ['omega-rot-alpha-saphir', 6, 'ΩR/αS', 'OR/AS', 'Omega Rubin / Alpha Saphir', 'Omega Ruby / Alpha Sapphire', 'oras', 'omega-rubin-alpha-saphir', 'omega-ruby-alpha-sapphire'],
    ['sonne-mond', 7, 'Sonne/Mond', 'Sun/Moon', 'Sonne / Mond', 'Sun / Moon', 'sm', 'sonne-mond', 'sun-moon'],
    ['ultrasonne-ultramond', 7, 'US/UM', 'US/UM', 'Ultrasonne / Ultramond', 'Ultra Sun / Ultra Moon', 'usum', 'ultrasonne-ultramond', 'ultra-sun-ultra-moon'],
    ['letsgo', 7, "Let's Go", "Let's Go", "Let's Go Pikachu / Evoli", "Let's Go Pikachu / Eevee", null, null, 'lets-go-pikachu-lets-go-eevee'],
    ['schwert-schild', 8, 'Schwert/Schild', 'Sword/Shield', 'Schwert / Schild', 'Sword / Shield', 'swsh', 'schwert-schild', 'sword-shield'],
    ['bdsp', 8, 'SD/LP', 'BD/SP', 'Strahlender Diamant / Leuchtende Perle', 'Brilliant Diamond / Shining Pearl', 'bdsp', 'strahl-diamant-leucht-perl', 'brilliant-diamond-shining-pearl'],
    ['karmesin-purpur', 9, 'Karmesin/Purpur', 'Scarlet/Violet', 'Karmesin / Purpur', 'Scarlet / Violet', 'sv', 'karmesin-purpur', 'scarlet-violet']
  ];
  var GAME_TEXT = {
    de: { choose: 'Spiel wählen', short: 'Spiel', title: 'Aktives Spiel', hint: 'Gilt für alle Tools: Generation, Fangrate, Level-Caps, Pokédex.', none: 'Kein Spiel – jedes Tool nutzt seine eigene Einstellung' },
    en: { choose: 'Choose game', short: 'Game', title: 'Active game', hint: 'Applies to all tools: generation, catch rate, level caps, Pokédex.', none: 'No game – every tool uses its own setting' }
  };
  function gameRow(k) {
    for (var i = 0; i < HUB_GAMES.length; i++) if (HUB_GAMES[i][0] === k) return HUB_GAMES[i];
    return null;
  }
  function byColumn(col, v) {
    for (var i = 0; v && i < HUB_GAMES.length; i++) if (HUB_GAMES[i][col] === v) return HUB_GAMES[i][0];
    return null;
  }
  function lsGet(k) { try { return localStorage.getItem(k); } catch (e) { return null; } }
  function lsSet(k, v) { try { localStorage.setItem(k, v); } catch (e) { if (window.PokeHubStorageWarning) window.PokeHubStorageWarning(true); } }
  function currentGame() { var k = lsGet(HUB_GAME_KEY); return gameRow(k) ? k : null; }
  function announceGame() {
    var row = gameRow(currentGame());
    document.dispatchEvent(new CustomEvent('hubgamechange', { detail: { game: row ? row[0] : null, gen: row ? row[1] : (+lsGet('hub-gen') || null) } }));
    updateGameChips();
  }
  function setGame(k) {
    var row = gameRow(k);
    if (!row) return;
    var changed = currentGame() !== k || +lsGet('hub-gen') !== row[1];
    lsSet(HUB_GAME_KEY, k);
    lsSet('hub-gen', String(row[1]));
    if (changed) announceGame();
  }
  function setGen(g) {
    g = +g;
    if (!(g >= 1 && g <= 9)) return;
    // Eine Generation ist kein Spielwechsel. Mit aktivem Spiel gilt sie nur zum Nachschauen auf der Seite und wird
    // nicht gemerkt (beim nächsten Öffnen wieder die des Spiels – sonst rechnet man im Run mit falschen Typen).
    // Ohne Spiel merkt sich der Hub die Generation wie früher.
    if (currentGame()) return;
    if (+lsGet('hub-gen') !== g) { lsSet('hub-gen', String(g)); announceGame(); }
  }
  function clearGame() {
    if (!currentGame()) return;
    try { localStorage.removeItem(HUB_GAME_KEY); } catch (e) { /* egal */ }
    announceGame();
  }
  // Wahl in einem Tool (Fangrate, Level-Cap-Leiste): nur wechseln, wenn das aktive Spiel nicht schon passt
  function fromTool(col, v) {
    var row = gameRow(currentGame());
    if (row && row[col] === v) return;
    var k = byColumn(col, v);
    if (k) setGame(k);
  }
  // Die erste Fassung übernahm das Spiel automatisch (z. B. aus dem aktiven Run) unter 'hub-game' – das war nicht
  // gewählt. Standard ist jetzt kein Spiel, der alte Wert fliegt einmalig raus.
  try { localStorage.removeItem('hub-game'); } catch (e) { /* egal */ }
  // Andere Tabs desselben Hubs
  window.addEventListener('storage', function (e) { if (e.key === HUB_GAME_KEY) announceGame(); });

  function col(i) { return function (k) { var r = gameRow(k || currentGame()); return r ? r[i] : null; }; }
  window.PokeHubGame = {
    list: HUB_GAMES.map(function (r) { return r[0]; }),
    get: currentGame, set: setGame, setGen: setGen, clear: clearGame,
    gen: col(1), catchrate: col(6), levelCaps: col(7), dexVersion: col(8),
    // Name eines Spiels (Schlüssel wie im Run-Dashboard) für Auswahllisten
    label: function (k, lang) { var r = gameRow(k); return r ? r[lang === 'en' ? 5 : 4] : ''; },
    fromCatchrate: function (id) { fromTool(6, id); },
    fromLevelCaps: function (key) { fromTool(7, key); }
  };

  // Chip „Platin ▾“: in der Navigation direkt neben Home (immer sichtbar), auf den Startseiten im Kopf
  var gameChips = [], gamePop = null, gamePopAnchor = null;
  function gameLang() { return lsGet('hub-lang') === 'en' ? 'en' : 'de'; }
  function updateGameChips() {
    var en = gameLang() === 'en', t = GAME_TEXT[gameLang()], row = gameRow(currentGame());
    gameChips.forEach(function (b) {
      // Handy-Startseite (Kopfzeile mit ☰): „Spiel wählen“ passt dort nicht neben den Titel
      b.querySelector('span').textContent = row ? row[en ? 3 : 2] : (b.closest('[data-hub-menu]') ? t.short : t.choose);
      b.title = t.title + (row ? ': ' + row[en ? 5 : 4] : '') + ' – ' + t.hint;
      b.classList.toggle('is-unset', !row);
    });
  }
  function setupGameChip() {
    var nav = document.querySelector('.tool-nav'), slot = document.querySelector('[data-hub-game]');
    if (!nav && !slot) return;
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'hub-game-chip';
    btn.setAttribute('aria-haspopup', 'listbox');
    btn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
      '<rect x="2" y="6" width="20" height="12" rx="4"/><path d="M7 10v4M5 12h4"/><circle cx="15.5" cy="11" r="1"/><circle cx="18" cy="13.5" r="1"/></svg><span></span><i aria-hidden="true">▾</i>';
    if (nav) nav.insertBefore(btn, nav.querySelector('.tool-nav-track') || nav.firstChild);
    else slot.appendChild(btn);
    gameChips.push(btn);
    btn.addEventListener('click', function (e) { e.stopPropagation(); toggleGamePop(btn); });
    updateGameChips();
  }
  function toggleGamePop(anchor) {
    if (gamePop && !gamePop.hidden && gamePopAnchor === anchor) { gamePop.hidden = true; return; }
    if (!gamePop) {
      gamePop = document.createElement('div');
      gamePop.className = 'hub-game-pop';
      gamePop.setAttribute('role', 'listbox');
      document.body.appendChild(gamePop);
      gamePop.addEventListener('click', function (e) {
        e.stopPropagation();
        var b = e.target.closest('[data-game]');
        if (!b) return;
        if (b.getAttribute('data-game')) setGame(b.getAttribute('data-game')); else clearGame();
        gamePop.hidden = true;
      });
      document.addEventListener('click', function () { if (gamePop && !gamePop.hidden) gamePop.hidden = true; });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && gamePop && !gamePop.hidden) { gamePop.hidden = true; if (gamePopAnchor) gamePopAnchor.focus(); }
      });
      // Nur bei anderer Breite (Drehen, Fenster) – am Handy feuert 'resize' schon, wenn die Adressleiste beim Scrollen verschwindet
      var popWidth = window.innerWidth;
      window.addEventListener('resize', function () {
        if (window.innerWidth === popWidth) return;
        popWidth = window.innerWidth;
        if (gamePop) gamePop.hidden = true;
      });
    }
    gamePopAnchor = anchor;
    var lang = gameLang(), en = lang === 'en', t = GAME_TEXT[lang], cur = currentGame();
    var html = '<p class="hub-game-hint"><b>' + t.title + '</b> · ' + t.hint + '</p>';
    for (var g = 1; g <= 9; g++) {
      var opts = HUB_GAMES.filter(function (r) { return r[1] === g; }).map(function (r) {
        return '<button type="button" role="option" aria-selected="' + (r[0] === cur) + '" class="hub-game-opt' + (r[0] === cur ? ' is-on' : '') +
          '" data-game="' + r[0] + '">' + (en ? r[5] : r[4]) + '</button>';
      }).join('');
      html += '<div class="hub-game-gen"><span>Gen ' + g + '</span><div>' + opts + '</div></div>';
    }
    html += '<button type="button" role="option" aria-selected="' + !cur + '" class="hub-game-opt hub-game-none' + (cur ? '' : ' is-on') + '" data-game="">' + t.none + '</button>';
    gamePop.innerHTML = html;
    gamePop.hidden = false;
    var r = anchor.getBoundingClientRect(), w = gamePop.offsetWidth, h = gamePop.offsetHeight;
    gamePop.style.left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8)) + 'px';
    gamePop.style.top = (r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6) + 'px';
    // Gewähltes Spiel in den Blick holen; ohne Spiel (Fokus auf „Kein Spiel“ unten) bleibt die Liste oben
    gamePop.scrollTop = 0;
    var on = gamePop.querySelector('.is-on');
    if (on) { on.focus({ preventScroll: true }); if (cur) on.scrollIntoView({ block: 'nearest' }); }
  }

  /* ── 7. Navigationsleiste beschriften, Handy-Links ─────────────────── */
  // Die Beschriftung der Leiste steht an einer Stelle für alle Seiten (vorher hatte jede Seite
  // eigene, teils fehlende Übersetzungen). [deutsch, englisch], Schlüssel = Ordner, '' = Startseite.
  var NAV_LABELS = {
    '': ['Home', 'Home'], RunDashboard: ['Run', 'Run'], Pokelocke: ['Solo', 'Solo'], Duo: ['Duo', 'Duo'],
    Trio: ['Trio', 'Trio'], Catchrate: ['Fangrate', 'Catch Rate'], DamageCalc: ['Schaden', 'Damage'],
    Typrechner: ['Typen', 'Types'], PokemonInfo: ['Dex', 'Dex'], Karte: ['Karte', 'Map'], Bosse: ['Bosse', 'Bosses'],
    SaveViewer: ['Save', 'Save'], SaveEditor: ['Editor', 'Editor'], Randomizer: ['Randomizer', 'Randomizer'],
    Rules: ['Regeln', 'Rules']
  };
  var hubRoot = scriptUrl ? scriptUrl.replace(/pwa\.js(\?.*)?$/, '') : null;
  // Ordner eines Links im Hub ('' = Startseite) oder null für fremde Adressen
  function hubArea(href) {
    if (!hubRoot) return null;
    var u = new URL(href, location.href).href.split('#')[0].split('?')[0];
    if (u.indexOf(hubRoot) !== 0) return null;
    var rest = u.slice(hubRoot.length), i = rest.indexOf('/');
    return i < 0 ? '' : rest.slice(0, i);
  }
  // Titel im Browser-Tab je Sprache (stand vorher fest in jeder Seite, meist deutsch)
  var PAGE_TITLES = {
    RunDashboard: ['Run-Dashboard', 'Run Dashboard'], Pokelocke: ['Solo Nuzlocke', 'Solo Nuzlocke'],
    Duo: ['Duo Nuzlocke', 'Duo Nuzlocke'], Trio: ['Trio Nuzlocke', 'Trio Nuzlocke'],
    Catchrate: ['Fangrate-Rechner', 'Catch Rate Calculator'], DamageCalc: ['Schadens-Rechner', 'Damage Calculator'],
    Typrechner: ['Typen-Rechner', 'Type Calculator'], PokemonInfo: ['Pokédex', 'Pokédex'],
    Karte: ['Karte Sinnoh (Platin)', 'Sinnoh Map (Platinum)'], Bosse: ['Boss-Planer (Platin)', 'Boss Planner (Platinum)'],
    SaveViewer: ['Save-Viewer', 'Save Viewer'], SaveEditor: ['Save-Editor', 'Save Editor'],
    Randomizer: ['Randomizer', 'Randomizer'], Rules: ['Nuzlocke-Regelwerk', 'Nuzlocke Rules']
  };
  function labelToolNav() {
    var en = 0;
    try { en = localStorage.getItem('hub-lang') === 'en' ? 1 : 0; } catch (e) {}
    var page = PAGE_TITLES[hubArea(location.href)];
    if (page) document.title = page[en] + ' – Pokémon Hub';
    var nav = document.querySelector('.tool-nav');
    if (!nav) return;
    Array.prototype.forEach.call(nav.querySelectorAll('a.tool-nav-link'), function (a) { labelNavLink(a, en); });
  }
  function labelNavLink(a, en) {
    var k = hubArea(a.getAttribute('href'));
    if (k == null || !NAV_LABELS[k]) return;
    a.removeAttribute('data-i18n'); // die Seite beschriftet die Leiste sonst selbst – anders
    if (a.textContent !== NAV_LABELS[k][en]) a.textContent = NAV_LABELS[k][en];
  }
  // Schon beschriften, während der Browser die Seite aufbaut (vor dem ersten Zeichnen) – erst bei
  // DOMContentLoaded blitzte beim Seitenwechsel kurz der Text aus dem HTML auf (z. B. „Team“ statt „Solo“).
  // Der Text eines Links kann nach dem Link selbst ankommen, deshalb zählt jede Änderung in einem Link.
  if (window.MutationObserver) {
    var earlyEn = 0;
    try { earlyEn = localStorage.getItem('hub-lang') === 'en' ? 1 : 0; } catch (e) {}
    var earlyNav = new MutationObserver(function (records) {
      records.forEach(function (r) {
        var t = r.target.nodeType === 1 ? r.target : r.target.parentElement;
        var a = t && t.closest && t.closest('a.tool-nav-link');
        if (a) labelNavLink(a, earlyEn);
        Array.prototype.forEach.call(r.addedNodes, function (n) {
          if (n.nodeType !== 1) return;
          if (n.matches('a.tool-nav-link')) labelNavLink(n, earlyEn);
          else Array.prototype.forEach.call(n.querySelectorAll('a.tool-nav-link'), function (x) { labelNavLink(x, earlyEn); });
        });
      });
    });
    earlyNav.observe(document.documentElement, { childList: true, characterData: true, subtree: true });
    document.addEventListener('DOMContentLoaded', function () { earlyNav.disconnect(); });
  }
  // Am Handy direkt auf die Handy-Seiten verlinken statt über index.html und eine Weiterleitung.
  // Bedingungen wie in home.js (Startseite) und Duo/index.html.
  function phoneLinks() {
    var fingers = navigator.maxTouchPoints > 0;
    var coarse = !!(window.matchMedia && window.matchMedia('(pointer: coarse)').matches);
    var home = fingers && (coarse || window.innerWidth <= 768);
    var duo = fingers && window.innerWidth < 768;
    if ((!home && !duo) || !hubRoot) return;
    Array.prototype.forEach.call(document.querySelectorAll('a[href]'), function (a) {
      var k = hubArea(a.getAttribute('href'));
      if (k == null) return;
      var u = new URL(a.getAttribute('href'), location.href), file = u.pathname.split('/').pop();
      if (home && k === '' && (file === 'index.html' || file === '')) a.href = hubRoot + 'mobile.html';
      else if (duo && k === 'Duo' && file === 'index.html') a.href = hubRoot + 'Duo/mobile.html';
    });
  }

  /* ── 6b. Theme-Knopf ───────────────────────────────────────────────── */
  var THEME_NAMES = {
    de: { classic: 'Klassik', paper: 'Papier', graphite: 'Graphit', label: 'Design' },
    en: { classic: 'Classic', paper: 'Paper', graphite: 'Graphite', label: 'Theme' }
  };
  function themeNames() {
    var l = 'de';
    try { l = localStorage.getItem('hub-lang') || 'de'; } catch (e) {}
    return THEME_NAMES[l] || THEME_NAMES.de;
  }
  var themeBtnLabel = null; // beschriftet den Knopf neu (setupThemeButton)
  // Design direkt wählen (Tool-Menü am Handy) – der Knopf schaltet dagegen reihum weiter
  function setTheme(t) {
    try { localStorage.setItem('hub-theme', t); } catch (e) {}
    applyTheme(t);
    if (themeBtnLabel) themeBtnLabel();
  }
  // Knopf und Sprachknopf kommen in einen gemeinsamen Halter (.hub-controls). Lag der Sprachknopf
  // fest oben rechts, liegt der Halter genau dort; stand er im Seitenkopf, steht der Halter dort.
  function setupThemeButton() {
    if (document.querySelector('.theme-toggle')) return;
    var lang = document.getElementById('lang-toggle') || document.getElementById('lang-btn');
    var box = document.createElement('div');
    box.className = 'hub-controls';
    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'theme-toggle';
    btn.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 3.5a8.5 8.5 0 0 1 0 17z" fill="currentColor"/></svg>';
    box.appendChild(btn);
    if (lang) {
      var cs = getComputedStyle(lang);
      if (cs.position === 'fixed') {
        // Abstände aus dem CSS übernehmen – aus der Lage auf dem Bildschirm berechnet stimmten sie
        // während des Ladens nicht immer (Save-Viewer: 10 px weiter links als auf den anderen Seiten)
        box.classList.add('is-fixed');
        box.style.top = cs.top;
        box.style.right = cs.right;
      }
      lang.parentNode.insertBefore(box, lang);
      box.appendChild(lang);
    } else {
      box.classList.add('is-fixed', 'is-alone');
      document.body.appendChild(box);
    }
    function label() {
      var n = themeNames(), t = storedTheme();
      btn.title = n.label + ': ' + n[t];
      btn.setAttribute('aria-label', n.label + ': ' + n[t]);
    }
    label();
    themeBtnLabel = label;
    btn.addEventListener('click', function () {
      var next = THEMES[(THEMES.indexOf(storedTheme()) + 1) % THEMES.length];
      setTheme(next);
      showThemeToast(themeNames()[next]);
    });
    // Sprachwechsel ändert die Beschriftung
    if (lang) lang.addEventListener('click', function () { setTimeout(label, 0); });
  }
  var toastTimer = null;
  function showThemeToast(text) {
    var el = document.querySelector('.theme-toast');
    if (!el) {
      el = document.createElement('div');
      el.className = 'theme-toast';
      el.setAttribute('role', 'status');
      document.body.appendChild(el);
    }
    el.textContent = text;
    el.classList.add('is-on');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { el.classList.remove('is-on'); }, 1400);
  }

  /* ── 5. Navigationsleiste der Tools ────────────────────────────────── */
  // Am Handy passt die Leiste nicht ganz auf den Bildschirm und scrollt seitlich (ohne sichtbare
  // Scrollleiste, s. base.css). Darum: beim Öffnen zum aktiven Tab springen und an den Rändern
  // ausblenden, wo es weitergeht. Die Tabs kommen dafür in eine eigene Scroll-Spur. Der Sprachknopf
  // liegt sonst fest oben rechts über der Leiste – dann steht er rechts neben der Spur.
  function setupToolNav() {
    var nav = document.querySelector('.tool-nav');
    if (!nav || nav.querySelector('.tool-nav-track')) return;
    var track = document.createElement('div');
    track.className = 'tool-nav-track';
    // Home (erster Link) bleibt fest links neben der Spur stehen – sonst schiebt das Springen zum
    // aktiven Tab es am Handy aus dem Bild
    var homeLink = nav.querySelector('.tool-nav-link');
    while (nav.firstChild) track.appendChild(nav.firstChild);
    if (homeLink) {
      homeLink.classList.add('tool-nav-home');
      nav.appendChild(homeLink);
    }
    nav.appendChild(track);
    nav.classList.add('has-track');
    setupNavMenu(nav, track.nextSibling, 'tool-nav-menu-btn');
    // Halter mit Theme- und Sprachknopf (s. setupThemeButton), sonst der Sprachknopf allein
    var btn = document.querySelector('.hub-controls') || document.getElementById('lang-toggle');
    var home = null; // merkt sich den ursprünglichen Platz des Knopfs

    // Die Spur reicht bis an die Ränder der Leiste und übernimmt deren Innenabstand, damit die
    // Tabs erst am Kartenrand ausblenden – links nur ohne festen Home-Knopf, rechts nur, wenn dort
    // nicht der Sprachknopf steht.
    function fitTrack() {
      var cs = getComputedStyle(nav);
      var pl = homeLink ? 0 : parseFloat(cs.paddingLeft) || 0;
      var pr = btn && btn.parentNode === nav ? 0 : parseFloat(cs.paddingRight) || 0;
      track.style.marginLeft = -pl + 'px';
      track.style.paddingLeft = pl + 'px';
      track.style.marginRight = -pr + 'px';
      track.style.paddingRight = pr + 'px';
    }
    function overlaps(a, b) {
      return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
    }
    // Liegt der (feste) Knopf über den Tabs? Gemessen wie ganz oben auf der Seite.
    // Nur feste Knöpfe – der auf Duo/mobile.html steht schon neben dem Titel.
    function placeToggle() {
      if (!btn) return;
      if (!home) {
        if (nav.contains(btn) || getComputedStyle(btn).position !== 'fixed') return;
        home = document.createComment('lang-toggle');
        btn.parentNode.insertBefore(home, btn);
      }
      var scrolled = track.scrollLeft;
      if (btn.parentNode === nav) home.parentNode.insertBefore(btn, home);
      fitTrack();
      var b = btn.getBoundingClientRect();
      // Gescrollt wird je nach Seite das Fenster oder der body (base.css)
      var dy = (window.scrollY || 0) + (document.body ? document.body.scrollTop : 0);
      // Mit Tool-Menü (Handy) kommt der Knopf immer in die Leiste – base.css blendet ihn dort aus,
      // Design und Sprache stehen dann im Menü
      var hit = navMenuMode() || track.scrollWidth > track.clientWidth + 1;
      for (var i = 0; !hit && i < track.children.length; i++) {
        var r = track.children[i].getBoundingClientRect();
        hit = overlaps(b, { left: r.left, right: r.right, top: r.top + dy, bottom: r.bottom + dy });
      }
      if (hit) { nav.appendChild(btn); fitTrack(); }
      track.scrollLeft = scrolled;
    }
    function updateFade() {
      var max = track.scrollWidth - track.clientWidth;
      track.classList.toggle('nav-fade', max > 1);
      track.style.setProperty('--nav-fade-l', track.scrollLeft > 2 ? '28px' : '0px');
      track.style.setProperty('--nav-fade-r', track.scrollLeft < max - 2 ? '28px' : '0px');
    }
    function showActive() {
      var active = track.querySelector('.is-active');
      if (!active || track.scrollWidth <= track.clientWidth + 1) return;
      var a = active.getBoundingClientRect(), t = track.getBoundingClientRect();
      var left = a.left - t.left + track.scrollLeft;
      track.scrollLeft = Math.max(0, left - (track.clientWidth - a.width) / 2);
    }
    function refresh() { fitTrack(); placeToggle(); updateFade(); }

    refresh();
    showActive();
    updateFade();
    track.addEventListener('scroll', updateFade, { passive: true });
    var resizeTimer = null;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(refresh, 100);
    });
    // Texte der Leiste ändern sich beim Sprachwechsel und wenn Schriften nachladen
    window.addEventListener('load', function () { refresh(); showActive(); updateFade(); });
    if (btn) btn.addEventListener('click', function () { setTimeout(refresh, 0); });
    // Wechsel zwischen Tool-Menü und Spur (Drehen, Fenster breiter/schmaler)
    if (window.matchMedia) {
      var mq = window.matchMedia(NAV_MENU_MEDIA);
      var onMode = function () { closeNavMenu(); refresh(); showActive(); updateFade(); };
      if (mq.addEventListener) mq.addEventListener('change', onMode); else if (mq.addListener) mq.addListener(onMode);
    }
  }

  /* ── 5b. Tool-Menü am Handy ────────────────────────────────────────── */
  // Neben Home, Spiel-Chip, Design- und Sprachknopf blieben am Handy nur ~90 px Spur für 14 Tabs – zu
  // wenig zum Wischen und Treffen. Bis 720 px Breite (gleiche Grenze wie in base.css) steht statt der
  // Spur ein Knopf mit dem Namen der Seite. Er öffnet alle Tools als große Kacheln, darunter Design und Sprache.
  // Die Handy-Startseite (Kopfzeile mit data-hub-menu) hat dasselbe Menü als ☰-Knopf, dort nur mit Design und
  // Sprache – die Tools sind auf der Startseite ja schon Kacheln.
  var NAV_MENU_MEDIA = '(max-width: 720px)';
  // [[Titel de, en], Ordner] – Reihenfolge der Kacheln wie in der Leiste, Unbekanntes landet unter „Mehr“
  var NAV_GROUPS = [
    [['Runs', 'Runs'], ['RunDashboard', 'Pokelocke', 'Duo', 'Trio']],
    [['Rechner', 'Calculators'], ['Catchrate', 'DamageCalc', 'Typrechner']],
    [['Nachschlagen', 'Reference'], ['PokemonInfo', 'Karte', 'Bosse', 'Rules']],
    [['Spielstand & ROM', 'Save & ROM'], ['SaveViewer', 'SaveEditor', 'Randomizer']]
  ];
  var NAV_MENU_TEXT = {
    de: { menu: 'Menü', title: 'Alle Tools', more: 'Mehr', design: 'Design', lang: 'Sprache', settings: 'Einstellungen' },
    en: { menu: 'Menu', title: 'All tools', more: 'More', design: 'Theme', lang: 'Language', settings: 'Settings' }
  };
  var navMenuBtn = null, navSheet = null;
  function navMenuMode() { return !!(window.matchMedia && window.matchMedia(NAV_MENU_MEDIA).matches); }
  function navHasTools() { return !!document.querySelector('.tool-nav-track'); }

  // Handy-Startseite: ☰ vor die Theme- und Sprachknöpfe (setupThemeButton hat sie schon zusammengelegt)
  function setupHomeMenu() {
    var bar = document.querySelector('[data-hub-menu]');
    if (!bar || navMenuBtn) return;
    var box = bar.querySelector('.hub-controls');
    setupNavMenu(bar, box && box.parentNode === bar ? box : null, 'hub-menu-btn');
  }
  // Knopf in container vor before (null = ans Ende)
  function setupNavMenu(container, before, className) {
    navMenuBtn = document.createElement('button');
    navMenuBtn.type = 'button';
    navMenuBtn.className = className;
    navMenuBtn.setAttribute('aria-haspopup', 'dialog');
    navMenuBtn.setAttribute('aria-expanded', 'false');
    navMenuBtn.setAttribute('aria-controls', 'nav-sheet-panel');
    navMenuBtn.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true">' +
      '<path d="M4 7h16M4 12h16M4 17h16"/></svg><span></span>';
    container.insertBefore(navMenuBtn, before);
    navMenuBtn.addEventListener('click', function () {
      if (navSheet && !navSheet.hidden) closeNavMenu(); else openNavMenu();
    });
    // Nur bei anderer Breite schließen – am Handy feuert 'resize' schon beim Scrollen (Adressleiste)
    var w = window.innerWidth;
    window.addEventListener('resize', function () {
      if (window.innerWidth === w) return;
      w = window.innerWidth;
      closeNavMenu();
    });
    updateNavMenu();
  }
  // Name der Seite im Knopf (Startseite: nur das Symbol); ein offenes Menü neu beschriften (Sprachwechsel)
  function updateNavMenu() {
    if (!navMenuBtn) return;
    var t = NAV_MENU_TEXT[gameLang()];
    if (navHasTools()) {
      var active = document.querySelector('.tool-nav-track .tool-nav-link.is-active');
      var name = active ? active.textContent : t.menu;
      navMenuBtn.querySelector('span').textContent = name;
      navMenuBtn.setAttribute('aria-label', t.title + (active ? ' – ' + name : ''));
    } else {
      navMenuBtn.setAttribute('aria-label', t.settings);
      navMenuBtn.title = t.settings;
    }
    if (navSheet && !navSheet.hidden) fillNavSheet();
  }
  function openNavMenu() {
    if (!navSheet) {
      navSheet = document.createElement('div');
      navSheet.className = 'nav-sheet';
      navSheet.hidden = true;
      navSheet.innerHTML = '<div class="nav-sheet-backdrop"></div><div class="nav-sheet-panel" id="nav-sheet-panel" role="dialog" aria-modal="true"></div>';
      document.body.appendChild(navSheet);
      navSheet.querySelector('.nav-sheet-backdrop').addEventListener('click', closeNavMenu);
      // Kachel der offenen Seite: nur schließen statt die Seite neu zu laden
      navSheet.addEventListener('click', function (e) {
        if (e.target.closest('.nav-sheet-tile.is-on')) { e.preventDefault(); closeNavMenu(); }
      });
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && !navSheet.hidden) { closeNavMenu(); navMenuBtn.focus(); }
      });
      // Zurück-Wischen holt die Seite samt offenem Menü aus dem Zwischenspeicher
      window.addEventListener('pageshow', function (e) { if (e.persisted) closeNavMenu(); });
    }
    if (gamePop) gamePop.hidden = true;
    fillNavSheet();
    navSheet.hidden = false;
    navMenuBtn.setAttribute('aria-expanded', 'true');
    // Direkt unter der Leiste; ist die fast aus dem Bild gescrollt, oben am Rand
    var panel = navSheet.querySelector('.nav-sheet-panel');
    var top = Math.max(8, Math.round(navMenuBtn.parentNode.getBoundingClientRect().bottom + 6));
    if (window.innerHeight - top < 280) top = 8;
    panel.style.top = top + 'px';
    panel.style.maxHeight = (window.innerHeight - top - 8) + 'px';
    panel.scrollTop = 0;
    var on = panel.querySelector('.nav-sheet-tile.is-on') || panel.querySelector('.nav-sheet-tile') || panel.querySelector('.nav-sheet-seg .is-on');
    if (on) on.focus({ preventScroll: true });
  }
  function closeNavMenu() {
    if (!navSheet || navSheet.hidden) return;
    navSheet.hidden = true;
    if (navMenuBtn) navMenuBtn.setAttribute('aria-expanded', 'false');
  }
  function fillNavSheet() {
    var lang = gameLang(), en = lang === 'en' ? 1 : 0, t = NAV_MENU_TEXT[lang];
    var panel = navSheet.querySelector('.nav-sheet-panel');
    // Nach dem Neuaufbau (Sprache, Design) denselben Knopf wieder fokussieren
    var f = document.activeElement, focusKey = f && panel.contains(f) ? f.getAttribute('data-key') : null;
    panel.setAttribute('aria-label', navHasTools() ? t.title : t.settings);
    panel.textContent = '';
    // Kacheln aus den Links der Leiste: Ziel und Beschriftung stimmen so schon (Handy-Links, Sprache)
    var items = Array.prototype.map.call(document.querySelectorAll('.tool-nav-track a.tool-nav-link'), function (a) {
      return { a: a, k: hubArea(a.getAttribute('href')) };
    });
    var used = [];
    var groups = NAV_GROUPS.map(function (g) {
      var list = items.filter(function (it) { return g[1].indexOf(it.k) >= 0; });
      used = used.concat(list);
      return [g[0][en], list];
    });
    groups.push([t.more, items.filter(function (it) { return used.indexOf(it) < 0; })]);
    groups.forEach(function (g) {
      if (!g[1].length) return;
      var sec = document.createElement('div');
      sec.className = 'nav-sheet-group';
      var title = document.createElement('p');
      title.className = 'nav-sheet-title';
      title.textContent = g[0];
      var grid = document.createElement('div');
      grid.className = 'nav-sheet-grid';
      g[1].forEach(function (it) {
        var tile = document.createElement('a');
        tile.className = 'nav-sheet-tile';
        tile.href = it.a.href;
        tile.textContent = it.a.textContent;
        tile.setAttribute('data-key', 'tool:' + it.a.href);
        if (it.a.classList.contains('is-active')) {
          tile.classList.add('is-on');
          tile.setAttribute('aria-current', 'page');
        }
        grid.appendChild(tile);
      });
      sec.appendChild(title);
      sec.appendChild(grid);
      panel.appendChild(sec);
    });
    var settings = document.createElement('div');
    settings.className = 'nav-sheet-settings';
    var names = themeNames();
    settings.appendChild(navSegRow(t.design, 'theme:', THEMES.map(function (th) { return [th, names[th]]; }), storedTheme(), function (v) {
      setTheme(v);
      fillNavSheet();
    }));
    // Sprache über den Knopf der Seite – jede Seite übersetzt sich selbst; danach beschriftet
    // labelToolNav die Leiste und (über updateNavMenu) dieses Menü neu
    var langBtn = document.getElementById('lang-toggle') || document.getElementById('lang-btn');
    if (langBtn) {
      settings.appendChild(navSegRow(t.lang, 'lang:', [['de', 'Deutsch'], ['en', 'English']], lang, function (v) {
        if (v !== gameLang()) langBtn.click();
      }));
    }
    panel.appendChild(settings);
    if (focusKey) {
      var again = Array.prototype.filter.call(panel.querySelectorAll('[data-key]'), function (el) { return el.getAttribute('data-key') === focusKey; })[0];
      if (again) again.focus({ preventScroll: true });
    }
  }
  // Zeile „Design: Klassik | Papier | Graphit“ – opts: [[Wert, Text]]
  function navSegRow(label, keyPrefix, opts, cur, onPick) {
    var row = document.createElement('div');
    row.className = 'nav-sheet-row';
    var name = document.createElement('span');
    name.textContent = label;
    var seg = document.createElement('div');
    seg.className = 'nav-sheet-seg';
    seg.setAttribute('role', 'group');
    seg.setAttribute('aria-label', label);
    opts.forEach(function (o) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = o[1];
      b.setAttribute('data-key', keyPrefix + o[0]);
      b.setAttribute('aria-pressed', String(o[0] === cur));
      if (o[0] === cur) b.className = 'is-on';
      b.addEventListener('click', function () { onPick(o[0]); });
      seg.appendChild(b);
    });
    row.appendChild(name);
    row.appendChild(seg);
    return row;
  }
})();
