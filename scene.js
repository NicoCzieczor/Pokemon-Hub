/*
 * Bühne der Startseiten (PC: home.js, Handy: mobile.js): hohes Gras im Pixel-Stil und wilde Pokémon.
 * Farben und Aussehen kommen aus scene.css, Größe und Lage legt jede Seite selbst fest.
 *
 *   HubScene.grass(svg, id, scale, shift)  – füllt <svg class="grass grass--back|front"> mit Gras
 *   HubScene.wildMons(spots)               – setzt zufällige wilde Pokémon an die angegebenen Stellen
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

  // Kachel → je Farbton ein <path> aus waagrechten Pixel-Läufen (Farben setzt scene.css je Ebene)
  function tilePaths(rows) {
    var d = {};
    rows.forEach(function (row, y) {
      for (var x = 0, n; x < row.length; x += n) {
        n = 1;
        while (row.charAt(x + n) === row.charAt(x)) n++;
        var c = row.charAt(x);
        if (GRASS_TONES[c]) d[c] = (d[c] || '') + 'M' + x + ' ' + y + 'h' + n + 'v1h-' + n + 'z';
      }
    });
    return Object.keys(d).map(function (c) {
      return '<path class="' + GRASS_TONES[c] + '" d="' + d[c] + '"/>';
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

  return { grass: grass, wildMons: wildMons };
})();
