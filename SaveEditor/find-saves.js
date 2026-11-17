/*
 * find-saves.js – sucht in einem gewählten Ordner selbst nach Spielständen, damit niemand durch die Ordner des Emulators
 * klettern muss. Der Spielstand von Omega Rubin / Alpha Saphir liegt bei Citra/Azahar zehn Ordner tief
 * (…/sdmc/Nintendo 3DS/0…0/0…0/title/00040000/0011c400/data/00000001/main); hier wählt man einmal den Ordner des
 * Emulators (oder den mit den Spielen), und die Seite findet die Datei.
 *
 * Braucht den Ordner-Zugriff des Browsers (showDirectoryPicker: Chrome/Edge am PC, Chrome auf Android ab 132). Der Griff
 * auf die gefundene Datei erlaubt später auch das direkte Speichern und „Zuletzt geöffnet → Neu laden“ (app.js).
 *
 * SaveFinder.find(ordner, { check(bytes, datei) → Info oder null, onProgress(ordnerZahl), maxDirs, maxDepth, maxMs })
 *   → Promise<{ list: [{ handle, name, path, size, modified, info }], dirs, stopped }>, neueste zuerst.
 * Als Spielstand kommt in Frage: eine Datei „main“ (3DS) oder *.sav / *.dsv (DS), 64 KB bis 2 MB – ob sie wirklich
 * einer ist, entscheidet check() (in app.js: HubSave.parse).
 */
(function (root) {
  'use strict';

  var NAME = /^main$|\.(sav|dsv)$/i;
  // Ordner, in denen Spielstände liegen: zuerst ansehen (sonst sucht man erst durch alles andere)
  var FIRST = /^(sdmc|nintendo 3ds|title|data|0{32}|[0-9a-f]{8}|battery|backup|saves?|roms?|spielstand)$/i;
  // Ordner ohne Spielstände, oft mit tausenden Dateien (auf Android ist jedes Auflisten langsam)
  var SKIP = /^(shaders?|cache|logs?|screenshots?|textures?|dump|cheats|sysdata|nand|states?|load|config|content|extdata|android|dcim|pictures|movies|music|alarms|notifications|ringtones|podcasts|node_modules|\..*)$/i;
  var MIN = 64 * 1024, MAX = 2 * 1024 * 1024;

  async function find(dir, opts) {
    opts = opts || {};
    var maxDirs = opts.maxDirs || 3000, maxDepth = opts.maxDepth || 14, until = Date.now() + (opts.maxMs || 25000);
    var list = [], dirs = 0, stopped = false;

    async function walk(handle, path, depth) {
      if (stopped) return;
      if (dirs >= maxDirs || Date.now() > until) { stopped = true; return; }
      dirs++;
      if (opts.onProgress) opts.onProgress(dirs);
      var sub = [];
      try {
        for await (var e of handle.entries()) {
          var name = e[0], h = e[1];
          if (h.kind === 'directory') { if (!SKIP.test(name)) sub.push([name, h]); continue; }
          if (!NAME.test(name)) continue;
          try {
            var file = await h.getFile();
            if (file.size < MIN || file.size > MAX) continue;
            var info = opts.check ? opts.check(new Uint8Array(await file.arrayBuffer()), file) : {};
            if (info) list.push({ handle: h, name: name, path: path.concat(name).join('/'), size: file.size, modified: file.lastModified || 0, info: info });
          } catch (err) { /* nicht lesbar: weiter */ }
        }
      } catch (err) { return; }                     // Ordner nicht lesbar
      if (depth >= maxDepth) return;
      sub.sort(function (a, b) { return (FIRST.test(b[0]) ? 1 : 0) - (FIRST.test(a[0]) ? 1 : 0) || (a[0] < b[0] ? -1 : 1); });
      for (var i = 0; i < sub.length; i++) await walk(sub[i][1], path.concat(sub[i][0]), depth + 1);
    }

    await walk(dir, [], 0);
    list.sort(function (a, b) { return b.modified - a.modified; });
    return { list: list, dirs: dirs, stopped: stopped };
  }

  var api = { find: find, _internal: { NAME: NAME, FIRST: FIRST, SKIP: SKIP } };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.SaveFinder = api;
})(typeof self !== 'undefined' ? self : this);
