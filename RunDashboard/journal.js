/*
 * „Reisetagebuch“ hinter dem Run-Dashboard: Die Seite ist ein aufgeschlagenes Album (Klassik: schwarzes Fotoalbum
 * mit weißem Stift, Graphit: Packpapier, Papier: liniertes Notizbuch). Links klebt ein Zettel mit dem nächsten
 * Kampf, dem Level Cap und einer Strichliste der geschafften Kämpfe, darunter Polaroids des Teams (gefangene
 * Pokémon). Rechts ein Stempel je Begegnung (Farbe = Status) und unten die Gefallenen mit Trauerflor.
 * Neue Begegnungen werden eingestempelt, neue Fänge eingeklebt; ein Klick springt zum Eintrag in der Liste.
 * Farben und Aussehen: journal.css. Platz neben der Karte: scene.js (HubScene.beside).
 *
 *   JournalScene.update(data)  – nach jeder Änderung des Runs (app.js, updateScene):
 *     { empty, next: { name, cap, type }, done, total,
 *       team: [{ key, name, sprite, place, index }], dead: [{ key, name, sprite, place, cause, index }],
 *       stamps: [{ key, place, status, label, index }], focus: index => … }
 */
window.JournalScene = (function () {
  'use strict';

  var root = document.getElementById('jr');
  var card = document.getElementById('app');
  if (window.PokeHubLite || !root || !card || !window.HubScene) return { update: function () {} };

  var TR = {
    de: {
      next: 'Nächster Kampf', cap: 'Level Cap', team: 'Team', route: 'Begegnungen', grave: 'In Erinnerung',
      more: '+{n} weitere', noTeam: 'Noch niemand gefangen.', noStamps: 'Noch keine Begegnung.',
      noGrave: 'Noch niemand verloren – weiter so!', noRun: 'Noch kein Run', noRun2: 'Starte einen Run – hier klebt bald dein Team.'
    },
    en: {
      next: 'Next battle', cap: 'Level cap', team: 'Team', route: 'Encounters', grave: 'In memory',
      more: '+{n} more', noTeam: 'Nobody caught yet.', noStamps: 'No encounters yet.',
      noGrave: 'Nobody lost yet – keep it up!', noRun: 'No run yet', noRun2: 'Start a run – your team will be pinned here.'
    }
  };
  var esc = function (s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  // Fester Zufall je Eintrag: gleiche Drehung und Lage bei jedem Neuzeichnen
  var hash = function (s) { var h = 2166136261; for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return (h >>> 0) / 4294967295; };
  var tilt = function (key, max) { return ((hash(key) * 2 - 1) * max).toFixed(2); };

  root.innerHTML =
    '<div class="jr-page jr-page--l"><i class="jr-edge"></i></div>' +
    '<div class="jr-page jr-page--r"><i class="jr-edge"></i></div>' +
    '<div class="jr-side jr-side--l"><div class="jr-note"></div><div class="jr-photos"></div></div>' +
    '<div class="jr-side jr-side--r"><div class="jr-stamps"></div><div class="jr-grave"></div></div>' +
    // Bleistift und eine Pokéball-Skizze am Rand
    '<svg class="jr-pencil" viewBox="0 0 200 24" aria-hidden="true"><path class="p-wood" d="M18 4 L0 12 L18 20 Z"/><path class="p-lead" d="M6 9.3 L0 12 L6 14.7 Z"/>' +
      '<rect class="p-body" x="18" y="4" width="150" height="16"/><rect class="p-stripe" x="18" y="9" width="150" height="2"/><rect class="p-band" x="168" y="3" width="10" height="18"/>' +
      '<rect class="p-rubber" x="178" y="4" width="20" height="16" rx="3"/></svg>' +
    '<svg class="jr-doodle" viewBox="0 0 60 60" aria-hidden="true"><path d="M30 6c13 0 24 11 24 24S43 54 30 54 6 43 6 30 17 6 30 6z"/>' +
      '<path d="M6.5 29c8 1 15 1 17 1M36.5 30c6 0 11-.5 17-1.5"/><path d="M30 23a7 7 0 1 1 0 14 7 7 0 0 1 0-14z"/></svg>';
  var el = {
    sideL: root.querySelector('.jr-side--l'),
    sideR: root.querySelector('.jr-side--r'),
    note: root.querySelector('.jr-note'),
    photos: root.querySelector('.jr-photos'),
    stamps: root.querySelector('.jr-stamps'),
    grave: root.querySelector('.jr-grave')
  };

  var data = null, seen = null, full = false, side = null, vh = 0;

  // Strichliste: Fünfergruppen mit Querstrich (SVG), höchstens 30 Striche
  function tally(n) {
    n = Math.min(n, 30);
    var d = '', x = 2;
    for (var i = 0; i < n; i++) {
      var g = i % 5;
      if (g === 4) d += 'M' + (x - 26) + ' 15L' + (x + 1) + ' 3';
      else d += 'M' + x + ' 2l' + ((i * 7) % 3 - 1) * 0.5 + ' 14';
      x += g === 4 ? 12 : 6;
    }
    return n ? '<svg class="jr-tally" viewBox="0 0 ' + (x + 4) + ' 18" style="width:' + (x + 4) + 'px"><path d="' + d + '"/></svg>' : '';
  }

  function polaroid(m, i, dead, size) {
    var key = (dead ? 'd:' : 't:') + m.key;
    var cls = 'jr-photo' + (dead ? ' is-dead' : '') + (seen && !seen[key] ? ' is-new' : '');
    return '<button type="button" tabindex="-1" class="' + cls + '" data-i="' + (m.index == null ? '' : m.index) + '" style="--r:' + tilt(key, 5) + 'deg;--w:' + size + 'px;--d:' + (i * 0.06).toFixed(2) + 's">' +
      '<i class="jr-tape"></i><i class="jr-corner jr-corner--a"></i><i class="jr-corner jr-corner--b"></i>' +
      '<span class="jr-pic">' + (m.sprite ? '<img alt="" src="' + esc(m.sprite) + '">' : '') + (dead ? '<i class="jr-ribbon"></i>' : '') + '</span>' +
      '<span class="jr-cap"><b>' + esc(m.name) + '</b>' + (dead && m.cause ? '<small>† ' + esc(m.cause) + '</small>' : m.place ? '<small>' + esc(m.place) + '</small>' : '') + '</span>' +
      '</button>';
  }

  // Gleich große Kacheln in w × h: von allen Spaltenzahlen, bei denen alles passt, die mit den größten Kacheln
  // (bei gleicher Größe mehr Spalten – das wirkt wie eine Collage); passt nie alles, die mit den meisten Plätzen
  function grid(w, h, n, min, max, ratio, gap) {
    var fit = null, most = { cols: 1, size: min, cap: 0 };
    for (var cols = 1; cols <= Math.max(1, Math.min(6, n)); cols++) {
      var size = Math.floor(Math.min(max, (w - (cols - 1) * gap) / cols));
      if (size < min) break;
      var cap = cols * Math.max(0, Math.floor((h + gap) / (size * ratio + gap)));
      var g = { cols: cols, size: size, cap: cap };
      if (cap >= n && (!fit || size >= fit.size)) fit = g;
      if (cap > most.cap) most = g;
    }
    return fit || most;
  }

  function render() {
    if (!data || !side) return;
    var L = TR[window.LANG] || TR.de;
    var wl = side.left - 48, wr = side.right - 48;
    var top = 26, bottom = vh - 30;
    full = side.strip >= 200;
    root.classList.toggle('is-full', full);
    root.classList.toggle('is-bare', !full);
    if (!full) { seen = null; return; }
    // Beim ersten Zeichnen kommt alles nacheinander herein, danach nur noch Neues
    if (!seen && !root.classList.contains('was-in')) {
      root.classList.add('is-first', 'was-in');
      setTimeout(function () { root.classList.remove('is-first'); }, 1600);
    }

    // ── Links: Zettel mit dem nächsten Kampf, darunter das Team ──
    el.note.style.setProperty('--r', tilt('note' + (data.next ? data.next.name : ''), 2.5) + 'deg');
    el.note.innerHTML = data.empty
      ? '<b>' + esc(L.noRun) + '</b>'
      : '<span class="jr-kick">' + esc(L.next) + '</span><b>' + esc(data.next ? data.next.name : '–') + '</b>' +
        (data.next && data.next.cap ? '<span class="jr-cap-lv">' + esc(L.cap) + ' <strong>Lv. ' + esc(data.next.cap) + '</strong></span>' : '') +
        (data.next && data.next.type ? '<small>' + esc(data.next.type) + '</small>' : '') +
        '<span class="jr-done">' + tally(data.done) + '<small>' + esc(data.done + ' / ' + data.total) + '</small></span>';
    var noteH = el.note.offsetHeight || 150;
    var h = bottom - top - noteH - 70;
    var team = data.team.slice().reverse();   // neueste zuerst
    var g = grid(wl, h, team.length, 96, wl > 420 ? 184 : 156, 1.22, 16);
    var shown = team.slice(0, g.cap), more = team.length - shown.length;
    el.photos.style.setProperty('--cols', g.cols);
    el.photos.innerHTML = '<span class="jr-head">' + esc(L.team) + (data.team.length ? ' · ' + data.team.length : '') + '</span>' +
      (shown.length
        ? '<div class="jr-grid">' + shown.map(function (m, i) { return polaroid(m, i, false, g.size); }).join('') + '</div>' + (more > 0 ? '<span class="jr-more">' + esc(L.more.replace('{n}', more)) + '</span>' : '')
        : '<span class="jr-empty">' + esc(data.empty ? L.noRun2 : L.noTeam) + '</span>');

    // ── Rechts: Stempel je Begegnung, unten die Gefallenen ──
    var dead = data.dead.slice().reverse();
    var graveH = dead.length ? Math.min((bottom - top) * 0.42, 260) : 70;
    var sg = grid(wr, bottom - top - graveH - 60, data.stamps.length, 78, 104, 1, 12);
    var stamps = data.stamps.slice(-sg.cap);   // die letzten, die Platz haben
    el.stamps.style.setProperty('--cols', sg.cols);
    el.stamps.innerHTML = '<span class="jr-head">' + esc(L.route) + (data.stamps.length ? ' · ' + data.stamps.length : '') + '</span>' +
      (stamps.length
        ? '<div class="jr-grid">' + stamps.map(function (s, i) {
            var key = 's:' + s.key;
            return '<button type="button" tabindex="-1" class="jr-stamp is-' + esc(s.status) + (seen && !seen[key] ? ' is-new' : '') + (hash(key) < 0.5 ? ' is-round' : '') +
              '" data-i="' + s.index + '" style="--r:' + tilt(key, 9) + 'deg;--w:' + sg.size + 'px;--d:' + (i * 0.03).toFixed(2) + 's"><span class="jr-ink"><b>' + esc(s.place) + '</b><small>' + esc(s.label) + '</small></span></button>';
          }).join('') + '</div>'
        : '<span class="jr-empty">' + esc(L.noStamps) + '</span>');
    var dg = grid(wr, graveH - 30, dead.length, 70, 112, 1.22, 12);
    var gone = dead.slice(0, dg.cap);
    el.grave.style.setProperty('--cols', dg.cols);
    el.grave.innerHTML = '<span class="jr-head">' + esc(L.grave) + (dead.length ? ' · ' + dead.length : '') + '</span>' +
      (gone.length
        ? '<div class="jr-grid">' + gone.map(function (m, i) { return polaroid(m, i, true, dg.size); }).join('') + '</div>'
        : '<span class="jr-empty">' + esc(L.noGrave) + '</span>');

    // gesehen merken: nur wirklich neue Einträge werden beim nächsten Mal eingestempelt bzw. eingeklebt
    seen = {};
    data.team.forEach(function (m) { seen['t:' + m.key] = 1; });
    data.dead.forEach(function (m) { seen['d:' + m.key] = 1; });
    data.stamps.forEach(function (s) { seen['s:' + s.key] = 1; });
  }

  function layout() {
    vh = window.innerHeight;
    side = HubScene.beside(card);
    root.style.setProperty('--cl', side.cl + 'px');
    root.style.setProperty('--cr', side.cr + 'px');
    root.style.setProperty('--wl', Math.max(0, side.left) + 'px');
    root.style.setProperty('--wr', Math.max(0, side.right) + 'px');
    var keep = seen;
    render();
    if (keep) seen = keep;
  }

  // Klick auf Foto oder Stempel: Eintrag in der Liste zeigen
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-i]');
    if (b && b.dataset.i !== '' && data && data.focus) data.focus(Number(b.dataset.i));
  });

  var raf = 0;
  function update(d) {
    data = d;
    if (raf) return;
    raf = requestAnimationFrame(function () { raf = 0; render(); });
  }

  var resizeTimer = null;
  window.addEventListener('resize', function () { clearTimeout(resizeTimer); resizeTimer = setTimeout(layout, 120); });
  layout();

  return { update: update };
})();
