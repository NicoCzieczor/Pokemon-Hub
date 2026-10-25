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
    applyTheme(storedTheme()); // meta theme-color steht erst jetzt sicher im DOM
    setupThemeButton();
    setupToolNav();
  });

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
        var r = lang.getBoundingClientRect();
        box.classList.add('is-fixed');
        box.style.top = r.top + 'px';
        box.style.right = Math.max(0, document.documentElement.clientWidth - r.right) + 'px';
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
    btn.addEventListener('click', function () {
      var next = THEMES[(THEMES.indexOf(storedTheme()) + 1) % THEMES.length];
      try { localStorage.setItem('hub-theme', next); } catch (e) {}
      applyTheme(next);
      label();
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
      var hit = track.scrollWidth > track.clientWidth + 1;
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
  }
})();
