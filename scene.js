/*
 * Bühne der Startseiten (PC: home.js, Handy: mobile.js): hohes Gras im Pixel-Stil und wilde Pokémon.
 * Farben und Aussehen kommen aus scene.css, Größe und Lage legt jede Seite selbst fest.
 *
 *   HubScene.grass(svg, id, scale, shift)  – füllt <svg class="grass grass--back|front"> mit Gras
 *   HubScene.wildMons(spots)               – setzt zufällige wilde Pokémon an die angegebenen Stellen
 *   HubScene.pixels(rows, tones)           – Pixel-Kachel als <path>-Elemente (auch für die Bühnen der Unterseiten)
 *   HubScene.ridge(w, h, bumps, base)      – Kamm aus runden Kuppen als Pixel-Kachel (Baumkronen, Boden, Felsen)
 *   HubScene.monSprite(id, fallback)       – Platin-Sprite (Gen 1–4) oder das normale Sprite
 *   HubScene.bounds(img) / feet(img)       – leerer Rand über dem Kopf und unter den Füßen eines geladenen Sprites
 *   HubScene.beside(card)                  – Platz links und rechts neben der Karte einer Unterseite
 */
window.HubScene = (function () {
  'use strict';

  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
  var pick = function (list) { return list[Math.floor(Math.random() * list.length)]; };

  // Hohes Gras als Pixel-Kacheln: b = Grund, m = mittel, l = hell, o = dunkel, . = durchsichtig.
  // Oben die Kante mit den Halmspitzen (Licht von links, wie vom Mond), darunter die ruhige Fläche.
  var GRASS_EDGE = [
    '................l...........l...................',
    '................l...........l............l......',
    '...m...........ml....m..l...l............l......',
    '..lm..l...m.l.mml...lm..l...l...l........l...l..',
    '..lm..l..m..l.m.l...lml..l..l...l....lm..l...l..',
    '..lm..l..ml..lm.lm.lml...l..lm.l......l..l..l...',
    'lm.lol.mlm.l.lm.lmolml...lmolm.l....mml.mlm.l.ml',
    'ml.lmlmlmo..lmlmlmlmlo.m..lmlmlm...l.ml..lmlmml.',
    'ml.lmlmlmm..lmlmlmlmlm.m..lmlmlm..molmolmlmlml.m',
    'mollmllmmomobllmlmllmobmoblmlmlmoomoolmlmlmllmmo',
    'mollmllmmomobllmlmllmobmoblmlmlmobmobmllmlmllmmo',
    'bbllmllmbbbbbllmlmllmbbobolmlmlmobbbbollmlmllmbb'
  ];
  var GRASS_FILL = [
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbmbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbmbbbbbbbmbmbbbbbbbbbmbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbmbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbb',
    'bbbbbbmbbbbbbmbmbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbb',
    'bbbbbbmbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbmbbbbbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbmbmbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb',
    'bbbbbbbbbbbbbbbbbbbbbbbbbbbmbmbbbbbbbbbbbbbbbbbb'
  ];
  var GRASS_TONES = { b: 'g-base', m: 'g-mid', l: 'g-light', o: 'g-dark' };

  // Kachel → je Farbton ein <path> aus waagrechten Pixel-Läufen (Farben setzt scene.css je Ebene).
  // tones: Zeichen → CSS-Klasse (ohne Angabe die des Grases); auch für die Kampfbühne (stage.js)
  function tilePaths(rows, tones) {
    tones = tones || GRASS_TONES;
    var d = {};
    rows.forEach(function (row, y) {
      for (var x = 0, n; x < row.length; x += n) {
        n = 1;
        while (row.charAt(x + n) === row.charAt(x)) n++;
        var c = row.charAt(x);
        if (tones[c]) d[c] = (d[c] || '') + 'M' + x + ' ' + y + 'h' + n + 'v1h-' + n + 'z';
      }
    });
    return Object.keys(d).map(function (c) {
      return '<path class="' + tones[c] + '" d="' + d[c] + '"/>';
    }).join('');
  }
  var edgePaths = null, fillPaths = null;

  // Gras in ein <svg>: oben die Kante, darunter die Fläche, beide als sich wiederholendes Muster.
  // scale = Bildschirmpixel je Kunst-Pixel (hinten kleiner als vorne → Tiefe),
  // shift = seitlicher Versatz in Kunst-Pixeln, damit die Kanten zweier Reihen nicht übereinander liegen.
  function grass(svg, id, scale, shift) {
    if (!svg) return;
    if (!edgePaths) { edgePaths = tilePaths(GRASS_EDGE); fillPaths = tilePaths(GRASS_FILL); }
    var w = GRASS_EDGE[0].length, eh = GRASS_EDGE.length, fh = GRASS_FILL.length;
    var s = scale, top = eh * s, dx = (shift || 0) * s;
    svg.innerHTML =
      '<defs>' +
        '<pattern id="' + id + '-edge" width="' + w + '" height="' + eh + '" patternUnits="userSpaceOnUse" patternTransform="translate(' + dx + ' 0) scale(' + s + ')">' + edgePaths + '</pattern>' +
        '<pattern id="' + id + '-fill" width="' + w + '" height="' + fh + '" patternUnits="userSpaceOnUse" patternTransform="translate(' + dx + ' ' + top + ') scale(' + s + ')">' + fillPaths + '</pattern>' +
      '</defs>' +
      '<rect width="100%" height="' + top + '" fill="url(#' + id + '-edge)"/>' +
      '<rect y="' + top + '" width="100%" height="100%" fill="url(#' + id + '-fill)"/>';
  }

  // Wilde Pokémon aus Sinnoh, jedes nur einmal. spots: [{ box: Element, left: %, flip: true|false }]
  // Platin-Sprites schauen nach links; flip spiegelt sie (für die linke Seite, damit alle zur Mitte schauen).
  var POOL = [387, 390, 393, 396, 399, 401, 403, 406, 417, 418, 420, 422, 425, 427, 431, 433, 436, 439, 440, 443, 447, 449, 451, 453, 459];
  function wildMons(spots) {
    var used = {};
    spots.forEach(function (s, i) {
      var id;
      do { id = pick(POOL); } while (used[id]);
      used[id] = true;
      if (!s.box) return;
      var mon = document.createElement('div');
      mon.className = 'mon' + (s.flip ? ' is-flipped' : '');
      mon.style.left = s.left + '%';
      mon.style.animationDelay = (-i * 0.7) + 's';
      var img = document.createElement('img');
      img.src = SPR + 'pokemon/versions/generation-iv/platinum/' + id + '.png';
      img.alt = '';
      mon.appendChild(img);
      s.box.appendChild(mon);
    });
  }

  // Kamm aus runden Kuppen, nahtlos wiederholbar: bumps [x, Radius, Höhe] in Kunst-Pixeln, base = Mindesthöhe.
  // l = oberste Reihe (Licht), b = Fläche, o = Schatten weiter unten (gerastert, dann voll)
  function ridge(w, h, bumps, base) {
    var top = [];
    for (var x = 0; x < w; x++) {
      var hh = base || 0;
      bumps.forEach(function (t) {
        var dx = Math.abs(x + 0.5 - t[0]);
        dx = Math.min(dx, w - dx);
        if (dx < t[1]) hh = Math.max(hh, t[2] - t[1] + Math.sqrt(t[1] * t[1] - dx * dx));
      });
      top.push(h - Math.round(hh));
    }
    var rows = [];
    for (var y = 0; y < h; y++) {
      var row = '';
      for (x = 0; x < w; x++) {
        var d = y - top[x];
        row += d < 0 ? '.' : d === 0 ? 'l' : (d > 4 && (x + y) % 2 === 0) || d > 7 ? 'o' : 'b';
      }
      rows.push(row);
    }
    return rows;
  }

  function monSprite(id, fallback) {
    id = Number(id) || 0;
    return id > 0 && id <= 493 ? SPR + 'pokemon/versions/generation-iv/platinum/' + id + '.png' : fallback;
  }

  // Sprites haben unterschiedlich viel leeren Rand über dem Kopf und unter den Füßen – gemessen stehen alle
  // auf dem Boden. bounds → { top, bottom } in Sprite-Pixeln, null ohne CORS oder bei leerem Bild
  function bounds(img) {
    try {
      var w = img.naturalWidth, h = img.naturalHeight;
      var cv = document.createElement('canvas');
      cv.width = w; cv.height = h;
      var cx = cv.getContext('2d');
      cx.drawImage(img, 0, 0);
      var px = cx.getImageData(0, 0, w, h).data;
      var solid = function (y) {
        for (var x = 0; x < w; x++) if (px[(y * w + x) * 4 + 3] > 40) return true;
        return false;
      };
      var top = 0, bottom = h - 1;
      while (top < h && !solid(top)) top++;
      if (top === h) return null;
      while (!solid(bottom)) bottom--;
      return { top: top, bottom: h - 1 - bottom };
    } catch (e) { /* Bild ohne CORS */ }
    return null;
  }
  function feet(img) {
    var b = bounds(img);
    return b && b.bottom;
  }

  // Freier Platz neben der Karte (ohne Scrollleiste): left/right = Breite links/rechts, strip = die schmalere,
  // cl/cr = Mitte des Platzes links/rechts
  function beside(card) {
    var r = card.getBoundingClientRect();
    var right = Math.min(document.documentElement.clientWidth, document.body.clientWidth || Infinity);
    var wl = Math.max(0, r.left), wr = Math.max(0, right - r.right);
    return { strip: Math.min(wl, wr), left: wl, right: wr, cl: r.left / 2, cr: (r.right + right) / 2 };
  }

  return { grass: grass, wildMons: wildMons, pixels: tilePaths, ridge: ridge, monSprite: monSprite, bounds: bounds, feet: feet, beside: beside };
})();
