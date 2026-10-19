/*
 * pwa.js – macht aus dem Pokémon Hub eine App fürs iPhone-Homescreen.
 * Wird in jeder Seite ganz oben im <head> geladen.
 *
 *  1. Service Worker registrieren (Offline-Modus)
 *  2. App-Gefühl: kein Text-Markieren, kein Zoom, kein „Link-Vorschau“-Popup
 *  3. Langes Drücken = Rechtsklick (Team-Slots, Box, Graveyard, Runs … löschen)
 *  4. Speicherstand sichern / laden (Buttons auf der Startseite)
 */
(function () {
  'use strict';

  var scriptUrl = document.currentScript && document.currentScript.src;
  var standalone = window.navigator.standalone === true ||
    (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
  var touch = (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) ||
    navigator.maxTouchPoints > 0;

  /* ── 1. Service Worker ─────────────────────────────────────────────── */
  if ('serviceWorker' in navigator && scriptUrl && location.protocol !== 'file:') {
    window.addEventListener('load', function () {
      navigator.serviceWorker.register(new URL('sw.js', scriptUrl).href).catch(function (err) {
        console.warn('[PokéHub] Service Worker nicht registriert:', err);
      });
    });
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

  /* ── 4. Speicherstand sichern / laden ──────────────────────────────── */
  var BACKUP_APP = 'pokemon-hub';
  var TEXT = {
    de: {
      shareTitle: 'Pokémon Hub Backup',
      empty: 'Es gibt noch keine gespeicherten Daten.',
      bad: 'Das ist keine gültige Pokémon-Hub-Sicherung.',
      confirm: function (n, date) {
        return 'Sicherung' + (date ? ' vom ' + date : '') + ' mit ' + n + ' Einträgen laden?\n\n' +
          'Die aktuellen Daten auf diesem Gerät werden dabei ersetzt.';
      },
      done: 'Sicherung geladen.',
      failed: 'Laden fehlgeschlagen: '
    },
    en: {
      shareTitle: 'Pokémon Hub backup',
      empty: 'There is no saved data yet.',
      bad: 'This is not a valid Pokémon Hub backup.',
      confirm: function (n, date) {
        return 'Load backup' + (date ? ' from ' + date : '') + ' with ' + n + ' entries?\n\n' +
          'The current data on this device will be replaced.';
      },
      done: 'Backup loaded.',
      failed: 'Loading failed: '
    }
  };
  function tr() {
    var l = 'de';
    try { l = localStorage.getItem('hub-lang') || 'de'; } catch (e) {}
    return TEXT[l] || TEXT.de;
  }

  function collect() {
    var out = {};
    for (var i = 0; i < localStorage.length; i++) {
      var key = localStorage.key(i);
      out[key] = localStorage.getItem(key);
    }
    return out;
  }

  function exportData() {
    var t = tr();
    var data = collect();
    if (!Object.keys(data).length) { alert(t.empty); return; }
    var now = new Date();
    var json = JSON.stringify({ app: BACKUP_APP, format: 1, exportedAt: now.toISOString(), data: data }, null, 2);
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

  function restore(text) {
    var t = tr();
    var payload;
    try { payload = JSON.parse(text); } catch (e) { alert(t.bad); return; }
    var data = payload && payload.app === BACKUP_APP ? payload.data : null;
    if (!data || typeof data !== 'object' || Array.isArray(data)) { alert(t.bad); return; }
    var keys = Object.keys(data).filter(function (k) { return typeof data[k] === 'string'; });
    if (!keys.length) { alert(t.bad); return; }

    var date = '';
    try { date = new Date(payload.exportedAt).toLocaleString(); } catch (e) {}
    if (!confirm(t.confirm(keys.length, date))) return;

    var before = collect();
    try {
      localStorage.clear();
      keys.forEach(function (k) { localStorage.setItem(k, data[k]); });
    } catch (err) {
      // Zurück zum alten Stand, falls etwas schiefgeht (z. B. Speicher voll)
      try {
        localStorage.clear();
        Object.keys(before).forEach(function (k) { localStorage.setItem(k, before[k]); });
      } catch (e) {}
      alert(t.failed + err.message);
      return;
    }
    alert(tr().done);
    location.reload();
  }

  window.PokeHubBackup = { exportData: exportData, importData: importData };

  document.addEventListener('DOMContentLoaded', function () {
    var exp = document.getElementById('backup-export');
    var imp = document.getElementById('backup-import');
    if (exp) exp.addEventListener('click', exportData);
    if (imp) imp.addEventListener('click', importData);
  });
})();
