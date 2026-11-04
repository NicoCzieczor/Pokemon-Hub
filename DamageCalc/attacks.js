/*
 * Attacken-Animationen für den Probetreffer im Schadens-Rechner (versus.js ruft VersusFx.play): Bekannte Attacken
 * haben ihre eigene Animation – Erdbeben lässt alles beben, Surfer rollt als Welle über den Bildschirm, Donner schlägt
 * von oben ein, Feuersturm zeichnet das 大 … Alle anderen bekommen eine passende zu Typ und Kategorie (physisch: Anlauf
 * und Kontakt, speziell: Angriff aus der Ferne).
 *
 * Aussehen: Jedes Teil ist ein kleines Pixelbild im Raster der Sprites (1 Bildpunkt = Maßstab der Szene), hier gemalt
 * wie die Kampfanimationen der DS-Spiele – Farbstufen mit Licht von oben links, dunkler Umriss, Leuchten als Raster.
 * Glatte Formen aus CSS wirkten neben den Pixel-Pokémon falsch. Lage und Ursprung der Teile: attacks.css.
 *
 * Leistung: lauter kleine Teile, bewegt nur über transform/opacity (rechnet die Grafikkarte), jedes Teil verschwindet
 * nach seiner Animation wieder. Große Flächen werden nie bewegt: Szene oder Karte als Ganzes zu schütteln, ließ die
 * Bildrate einbrechen – bei einem Beben wackeln nur die beiden Pokémon samt Kästen, statt eines Lichtblitzes über den
 * ganzen Bildschirm leuchtet es am Treffpunkt. Nur die Welle von Surfer ist groß, und sie zieht nur einmal durch.
 * Eine bildschirmgroße Zeichenfläche, die jedes Bild neu gemalt wird, ruckelte ebenfalls (gemessen).
 *
 *   VersusFx.play({ id, type, physical, s, atk, def, scene }) → Promise, erfüllt im Moment des Treffers
 *     id = PokeAPI-Name der Attacke, atk/def = Kästen der beiden Pokémon (.vs-mon), s = Sprite-Maßstab (2 oder 3)
 */
window.VersusFx = (function () {
  'use strict';

  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  // Farben je Typ: hell, mittel, dunkel
  var PAL = {
    normal: ['#ffffff', '#e6e2cc', '#99947c'], fire: ['#fff3a8', '#ff9a26', '#e3330f'], water: ['#e2f6ff', '#58bfff', '#1d68c9'],
    electric: ['#fffbe0', '#ffe03c', '#e09a00'], grass: ['#eaffcf', '#79d455', '#2c8429'], ice: ['#ffffff', '#b5efff', '#55b2d6'],
    fighting: ['#ffe6d0', '#ff8845', '#b23f25'], poison: ['#f1d9ff', '#b25ce6', '#5a2189'], ground: ['#f2dfb2', '#c4964f', '#76501f'],
    flying: ['#ffffff', '#cbe4ff', '#77a4dd'], psychic: ['#ffe0ec', '#ff6aa0', '#ad2766'], bug: ['#f3ffcc', '#b2d72c', '#5c770e'],
    rock: ['#eee1bb', '#b79e60', '#6b572b'], ghost: ['#e6d5ff', '#8857c2', '#26133c'], dragon: ['#dfe5ff', '#7889ff', '#372ca4'],
    dark: ['#d6cdcd', '#594d53', '#1a1416'], steel: ['#ffffff', '#cbd2df', '#78808f'], fairy: ['#fff0fb', '#ff9be6', '#cd529b']
  };

  // Bekannte Attacken je Animation; „name:typ“ = in den Farben eines anderen Typs (Lehmbrühe braun, Draco Meteor feurig …)
  var GROUPS = {
    quake: 'earthquake magnitude bulldoze fissure dig stomping-tantrum',
    rockfall: 'rock-slide rock-tomb avalanche icicle-crash',
    rocks: 'rock-throw ancient-power rock-blast bonemerang:ground',
    spikes: 'stone-edge precipice-blades rock-wrecker grass-knot frenzy-plant',
    pillar: 'earth-power fire-spin whirlpool sand-tomb magma-storm blast-burn lava-plume',
    meteors: 'draco-meteor:fire eruption',
    flame: 'flamethrower ember heat-wave overheat incinerate mystical-fire fiery-dance flame-burst dragon-breath dragon-rage',
    fireblast: 'fire-blast inferno sacred-fire burn-up',
    jet: 'hydro-pump water-gun scald brine octazooka',
    bubbles: 'bubble-beam bubble',
    surf: 'surf water-spout muddy-water:ground sludge-wave:poison',
    splash: 'waterfall aqua-tail aqua-jet liquidation crabhammer dive',
    bolt: 'thunderbolt thunder-shock discharge volt-switch shock-wave',
    thunder: 'thunder zap-cannon bolt-strike',
    icebeam: 'ice-beam aurora-beam freeze-dry',
    blizzard: 'blizzard icy-wind powder-snow frost-breath glaciate',
    shards: 'ice-shard icicle-spear poison-sting pin-missile',
    leaves: 'razor-leaf magical-leaf leaf-storm leaf-tornado bullet-seed petal-dance:fairy petal-blizzard:fairy',
    solar: 'solar-beam solar-blade',
    hyper: 'hyper-beam flash-cannon signal-beam charge-beam hydro-cannon mirror-shot aeroblast prismatic-laser',
    orb: 'energy-ball aura-sphere focus-blast mist-ball luster-purge electro-ball weather-ball stored-power magnet-bomb power-gem',
    shadow: 'shadow-ball hex',
    moon: 'moonblast',
    tri: 'tri-attack',
    psychic: 'psychic confusion extrasensory psyshock future-sight expanding-force',
    buzz: 'bug-buzz hyper-voice boomburst snarl echoed-voice round uproar disarming-voice chatter psybeam',
    pulse: 'dark-pulse dragon-pulse water-pulse',
    sludge: 'sludge-bomb sludge gunk-shot acid venoshock belch clear-smog mud-bomb mud-shot mud-slap scorching-sands seed-bomb',
    wind: 'air-slash gust air-cutter hurricane twister razor-wind ominous-wind fairy-wind bleakwind-storm',
    swift: 'swift',
    sparkle: 'dazzling-gleam',
    drain: 'giga-drain mega-drain absorb leech-life drain-punch horn-leech draining-kiss dream-eater parabolic-charge',
    boom: 'explosion self-destruct',
    tackle: 'tackle body-slam double-edge take-down giga-impact return frustration quick-attack extreme-speed brave-bird ' +
      'flare-blitz volt-tackle wild-charge spark flame-wheel flame-charge outrage dragon-rush dragon-tail wood-hammer megahorn ' +
      'drill-run high-horsepower fly bounce sky-attack drill-peck peck pursuit feint-attack foul-play thief shadow-sneak ' +
      'phantom-force rapid-spin strength last-resort lunge first-impression ice-ball rollout',
    iron: 'iron-head iron-tail heavy-slam gyro-ball zen-headbutt headbutt head-smash',
    punch: 'fire-punch ice-punch thunder-punch mach-punch bullet-punch dynamic-punch focus-punch sky-uppercut mega-punch ' +
      'comet-punch shadow-punch power-up-punch hammer-arm meteor-mash sucker-punch knock-off payback poison-jab facade ' +
      'mega-kick stomp force-palm bone-club needle-arm nuzzle high-jump-kick jump-kick low-kick rock-smash',
    flurry: 'close-combat superpower arm-thrust double-kick acrobatics fury-attack play-rough',
    slash: 'slash night-slash leaf-blade aerial-ace psycho-cut sacred-sword cut false-swipe razor-shell steel-wing ' +
      'wing-attack u-turn fury-cutter brick-break karate-chop power-whip vine-whip poison-tail throat-chop',
    cross: 'x-scissor cross-chop cross-poison dual-chop dual-wingbeat',
    claw: 'dragon-claw shadow-claw metal-claw crush-claw scratch fury-swipes',
    bite: 'crunch bite fire-fang ice-fang thunder-fang poison-fang super-fang hyper-fang psychic-fangs bug-bite pluck jaw-lock'
  };
  var MOVES = {};
  Object.keys(GROUPS).forEach(function (fx) {
    GROUPS[fx].split(' ').forEach(function (w) { var m = w.split(':'); MOVES[m[0]] = [fx, m[1]]; });
  });
  // Alle anderen nach Typ – speziell / physisch
  var SPECIAL = {
    normal: 'orb', fire: 'flame', water: 'jet', electric: 'bolt', grass: 'leaves', ice: 'icebeam', fighting: 'orb', poison: 'sludge',
    ground: 'pillar', flying: 'wind', psychic: 'psychic', bug: 'buzz', rock: 'rocks', ghost: 'shadow', dragon: 'pulse', dark: 'pulse',
    steel: 'hyper', fairy: 'moon'
  };
  var PHYSICAL = {
    normal: 'tackle', fire: 'punch', water: 'splash', electric: 'punch', grass: 'slash', ice: 'punch', fighting: 'punch',
    poison: 'punch', ground: 'quake', flying: 'tackle', psychic: 'iron', bug: 'slash', rock: 'rockfall', ghost: 'claw',
    dragon: 'claw', dark: 'bite', steel: 'iron', fairy: 'punch'
  };
  // Splitter beim Kontakt je Typ: [Teil, Größe]
  var ELEM = {
    fire: ['flame', 0.7], water: ['drop', 1], grass: ['leaf', 0.9], ice: ['shard', 0.8], rock: ['rock', 0.45], ground: ['rock', 0.4],
    poison: ['bubble', 0.7], fairy: ['twinkle', 1], normal: ['star', 0.7], steel: ['star', 0.7], fighting: ['star', 0.7],
    ghost: ['dark', 0.4], dark: ['dark', 0.35], dragon: ['flame', 0.6]
  };

  // ── Pixel-Werkstatt: jede Form einmal je Typfarbe als kleines Bild gemalt ─────────────────
  var BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
  // Raster für Halbtransparenz wie auf dem DS: a = Anteil gesetzter Punkte (0…1)
  var dith = function (x, y, a) { return a * 16 > BAYER[(y & 3) * 4 + (x & 3)] + 0.5; };
  var rgb = function (hex) { var n = parseInt(hex.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; };
  var mix = function (a, b, t) { return [0, 1, 2].map(function (i) { return Math.round(a[i] + (b[i] - a[i]) * t); }); };
  var alpha = function (col, a) { return [col[0], col[1], col[2], a]; };
  var WHITE = [255, 255, 255];
  // Farbstufen: 0 Glanz, 1 hell, 2 mittel, 3 dunkel, 4 Umriss
  function ramp(pal) {
    var l = rgb(pal[0]), m = rgb(pal[1]), d = rgb(pal[2]);
    return [mix(l, WHITE, 0.6), l, m, d, mix(d, [0, 0, 0], 0.5)];
  }
  function rng(seed) { return function () { seed = seed * 16807 % 2147483647; return (seed - 1) / 2147483646; }; }
  // Licht von oben links auf einer Kugel: groß = hell
  var lit = function (nx, ny) { return -(nx + ny) * 0.35 + (1 - Math.hypot(nx, ny)) * 0.6; };
  function inPoly(x, y, pts) {
    for (var i = 0, j = pts.length - 1, inside = false; i < pts.length; j = i++) {
      var a = pts[i], b = pts[j];
      if ((a[1] > y) !== (b[1] > y) && x < (b[0] - a[0]) * (y - a[1]) / (b[1] - a[1]) + a[0]) inside = !inside;
    }
    return inside;
  }

  // Pixelbild w×h: fn(x, y, nx, ny) → Farbe [r,g,b] oder [r,g,b,a] oder null (nx/ny laufen von -1 bis 1).
  // edge = Umrissfarbe um alle deckenden Punkte; Punkte mit eigener Deckkraft (Leuchten) bekommen keinen Umriss.
  function pixels(w, h, fn, edge) {
    var c = document.createElement('canvas'), on = new Uint8Array(w * h);
    c.width = w; c.height = h;
    var g = c.getContext('2d'), img = g.createImageData(w, h), D = img.data;
    var put = function (i, col) { D[i * 4] = col[0]; D[i * 4 + 1] = col[1]; D[i * 4 + 2] = col[2]; D[i * 4 + 3] = col.length > 3 ? col[3] : 255; };
    for (var y = 0; y < h; y++) for (var x = 0; x < w; x++) {
      var col = fn(x, y, (x + 0.5) / w * 2 - 1, (y + 0.5) / h * 2 - 1);
      if (col) { put(y * w + x, col); on[y * w + x] = col.length > 3 ? 2 : 1; }
    }
    if (edge) for (y = 0; y < h; y++) for (x = 0; x < w; x++) {
      var i = y * w + x;
      if (on[i] !== 1 && ((x > 0 && on[i - 1] === 1) || (x < w - 1 && on[i + 1] === 1) || (y > 0 && on[i - w] === 1) || (y < h - 1 && on[i + w] === 1))) {
        put(i, edge);
        on[i] = 3;
      }
    }
    g.putImageData(img, 0, 0);
    return { url: c.toDataURL(), w: w, h: h };
  }

  // Formen: [Anzahl Varianten, Malen(Farbstufen R, Variante, Maße …)]
  var SHAPES = {
    // Energiekugel: heller Kern, Rand in der Typfarbe, Leuchten als Raster
    orb: [1, function (R) {
      return pixels(22, 22, function (x, y, nx, ny) {
        var r = Math.hypot(nx, ny);
        if (Math.hypot(nx + 0.2, ny + 0.2) < 0.14) return WHITE;
        if (r < 0.5) return R[r < 0.3 ? 0 : 1];
        if (r < 0.68) return R[2];
        return r < 1 && dith(x, y, (1 - r) / 0.32 * 0.75) ? alpha(R[r < 0.84 ? 2 : 1], 255) : null;
      });
    }],
    // Spukball: dunkler Kern, Rand in der Typfarbe, Schleier außen
    dark: [1, function (R) {
      return pixels(22, 22, function (x, y, nx, ny) {
        var r = Math.hypot(nx, ny);
        if (r < 0.5) return Math.hypot(nx + 0.22, ny + 0.22) < 0.12 ? R[2] : R[4];
        if (r < 0.64) return R[3];
        if (r < 0.76) return R[2];
        return r < 1 && dith(x, y, (1 - r) / 0.24 * 0.6) ? alpha(R[1], 255) : null;
      });
    }],
    // Funke: Kreuz, X oder Raute
    spark: [3, function (R, v) {
      return pixels(7, 7, function (x, y) {
        var dx = Math.abs(x - 3), dy = Math.abs(y - 3), t = Math.max(dx, dy);
        var on = v === 0 ? dx === 0 || dy === 0 : v === 1 ? dx === dy : dx + dy <= 2;
        return on ? (t === 0 ? WHITE : R[t === 1 ? 0 : t === 2 ? 1 : 2]) : null;
      });
    }],
    // Flamme: heißer Kern unten, Zunge nach oben, leicht gewellt
    flame: [4, function (R, v) {
      var ph = v * 1.7;
      return pixels(14, 19, function (x, y, nx, ny) {
        var t = (ny + 1) / 2;
        var half = (t > 0.6 ? Math.sqrt(Math.max(0, 1 - Math.pow((t - 0.6) / 0.4, 2))) : Math.pow(t / 0.6, 1.3)) * 0.88;
        var dx = Math.abs(nx - Math.sin(t * 8 + ph) * 0.2 * (1 - t));
        if (dx > half) return null;
        var heat = dx / half * 0.55 + (1 - t) * 0.6;
        return heat < 0.14 ? WHITE : R[heat < 0.3 ? 0 : heat < 0.52 ? 1 : heat < 0.76 ? 2 : 3];
      });
    }],
    drop: [1, function (R) {
      return pixels(9, 13, function (x, y, nx, ny) {
        var r = Math.hypot(nx / 0.8, (ny - 0.3) / 0.55);
        if (r >= 1 && !(ny < 0.3 && Math.abs(nx) < (ny + 0.85) * 0.6)) return null;
        if (Math.hypot(nx + 0.3, ny - 0.15) < 0.2) return WHITE;
        return R[lit(nx, ny - 0.3) > 0.35 ? 1 : 2];
      }, R[3]);
    }],
    bubble: [1, function (R) {
      return pixels(13, 13, function (x, y, nx, ny) {
        var r = Math.hypot(nx, ny);
        if (Math.hypot(nx + 0.32, ny + 0.32) < 0.18) return WHITE;
        if (r > 0.92) return null;
        if (r > 0.76) return R[r > 0.85 ? 2 : 1];
        return alpha(R[1], 70);
      });
    }],
    // Schlammbrocken: drei Kugeln zusammen, Glanzpunkte
    blob: [3, function (R, v) {
      var rand = rng(v * 31 + 5), cs = [[0, 0.12, 0.6], [rand() * 0.5 - 0.25, -0.3, 0.42], [rand() * 0.7 - 0.35, 0.32, 0.38]];
      return pixels(19, 16, function (x, y, nx, ny) {
        if (!cs.some(function (k) { return Math.hypot(nx - k[0], ny - k[1]) < k[2]; })) return null;
        if (Math.hypot(nx + 0.25, ny + 0.15) < 0.12 || Math.hypot(nx - 0.22, ny + 0.36) < 0.08) return R[0];
        var b = lit(nx, ny);
        return R[b > 0.45 ? 1 : b > 0.1 ? 2 : 3];
      }, R[4]);
    }],
    // Blatt mit Mittelrippe
    leaf: [2, function (R, v) {
      return pixels(15, 8, function (x, y, nx, ny) {
        ny -= v ? nx * nx * 0.3 - 0.1 : 0;
        var half = (1 - nx * nx) * 0.8;
        if (Math.abs(nx) > 0.87 || Math.abs(ny) > half) return null;
        if (Math.abs(ny) < 0.13) return R[3];
        return ny < 0 ? R[ny < -half * 0.5 && nx < 0.2 ? 0 : 1] : R[2];
      }, R[4]);
    }],
    // Eiskristall: links helle, rechts dunkle Fläche
    shard: [1, function (R) {
      return pixels(9, 19, function (x, y, nx, ny) {
        if (Math.abs(nx) / 0.78 + Math.abs(ny) / 0.9 > 1) return null;
        if (nx < 0) return R[Math.abs(nx) / 0.78 + Math.abs(ny) / 0.9 > 0.6 ? 1 : 0];
        return R[nx < 0.25 ? 1 : 2];
      }, R[3]);
    }],
    // Felsbrocken: unregelmäßiges Vieleck, Licht von oben links, manchmal ein Riss
    rock: [4, function (R, v) {
      var rand = rng(v * 97 + 13), pts = [];
      for (var i = 0; i < 8; i++) {
        var a = (i + rand() * 0.6) / 8 * Math.PI * 2, r = 0.62 + rand() * 0.24;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      var crack = rand() > 0.4, ca = rand() * 3;
      return pixels(19, 16, function (x, y, nx, ny) {
        if (!inPoly(nx, ny, pts)) return null;
        if (crack && Math.abs(Math.sin(ca) * nx - Math.cos(ca) * ny) < 0.07 && Math.hypot(nx, ny) < 0.45) return R[4];
        var b = lit(nx, ny) + ((x * 7 + y * 13) % 5 === 0 ? -0.15 : 0);
        return R[b > 0.55 ? 0 : b > 0.3 ? 1 : b > 0.02 ? 2 : 3];
      }, R[4]);
    }],
    star: [1, function (R) {
      var pts = [];
      for (var i = 0; i < 10; i++) {
        var a = -Math.PI / 2 + i * Math.PI / 5, r = i % 2 ? 0.38 : 0.86;
        pts.push([Math.cos(a) * r, Math.sin(a) * r]);
      }
      return pixels(15, 15, function (x, y, nx, ny) {
        if (!inPoly(nx, ny, pts)) return null;
        var r = Math.hypot(nx, ny);
        return r < 0.2 ? WHITE : R[r < 0.42 ? 0 : r < 0.6 ? 1 : 2];
      }, R[3]);
    }],
    // Funkeln ✦
    twinkle: [1, function (R) {
      return pixels(11, 11, function (x, y) {
        var dx = Math.abs(x - 5), dy = Math.abs(y - 5), t = dx + dy;
        if (!((dx === 0 && dy <= 5) || (dy === 0 && dx <= 5) || t <= 2)) return null;
        return t <= 1 ? WHITE : R[t <= 3 ? 0 : t <= 4 ? 1 : 2];
      });
    }],
    snow: [2, function (R, v) {
      return pixels(7, 7, function (x, y) {
        var dx = Math.abs(x - 3), dy = Math.abs(y - 3);
        var on = v ? (dx === 0 || dy === 0 || dx === dy) && Math.max(dx, dy) <= (dx === dy ? 2 : 3) : dx + dy <= 1 || (dx === dy && dx === 2);
        return on ? (dx + dy <= 1 ? WHITE : R[1]) : null;
      });
    }],
    // Staubwolke: mehrere Ballen, Rand gerastert
    dust: [3, function (R, v) {
      var rand = rng(v * 53 + 3), cs = [[0, 0.2, 0.5]];
      for (var i = 0; i < 3; i++) cs.push([rand() * 0.9 - 0.45, rand() * 0.5 - 0.3, 0.28 + rand() * 0.18]);
      return pixels(24, 16, function (x, y, nx, ny) {
        var m = 0;
        cs.forEach(function (k) { m = Math.max(m, 1 - Math.hypot(nx - k[0], (ny - k[1]) * 1.1) / k[2]); });
        if (m <= 0 || (m < 0.2 && !dith(x, y, 0.5))) return null;
        return alpha(R[ny < -0.15 ? 1 : ny < 0.35 ? 2 : 3], 240);
      });
    }],
    // Meteor: Kopf vorne rechts mit Umriss, Feuerschweif nach hinten ausgefranst
    meteor: [2, function (R, v) {
      var ph = v * 2.1;
      return pixels(44, 15, function (x, y) {
        var dx = x - 35, dy = y - 7, r = Math.hypot(dx, dy);
        if (r < 5) return Math.hypot(dx + 1.5, dy + 1.5) < 1.8 ? WHITE : R[r < 3.2 ? 0 : 1];
        if (r < 6 && x > 32) return R[3];
        if (x > 33) return null;
        var t = x / 33, half = 5.4 * Math.pow(t, 1.1) + Math.sin(x * 0.9 + ph) * 0.8;
        if (Math.abs(dy) > half || (t < 0.5 && !dith(x, y, t / 0.5))) return null;
        return alpha(R[Math.abs(dy) < half * 0.4 && t > 0.55 ? 1 : t > 0.3 ? 2 : 3], 255);
      });
    }],
    // Druckwelle: heller Ring, außen Typfarbe, innen gerastertes Leuchten
    ring: [1, function (R) {
      return pixels(40, 40, function (x, y) {
        var r = Math.hypot(x - 19.5, y - 19.5);
        if (r >= 17 && r < 18.5) return R[0];
        if (r >= 18.5 && r < 19.8) return R[2];
        return r >= 14.5 && r < 17 && dith(x, y, 0.5) ? alpha(R[1], 255) : null;
      });
    }],
    // Schallbogen / Windsichel
    arc: [1, function (R) {
      return pixels(14, 36, function (x, y, nx, ny) {
        var e1 = nx * nx / 0.81 + ny * ny / 0.86, e2 = (nx + 0.6) * (nx + 0.6) / 0.81 + ny * ny / 0.95;
        if (e1 >= 1 || e2 < 1) return null;
        return R[e1 > 0.72 ? 0 : e2 > 1.35 ? 1 : 2];
      });
    }],
    // Einschlag-Stern mit acht Zacken, abwechselnd lang und kurz
    hit: [1, function (R) {
      return pixels(25, 25, function (x, y, nx, ny) {
        var r = Math.hypot(nx, ny) / 0.88, c = Math.cos(Math.atan2(ny, nx) * 4);
        var L = (0.32 + 0.68 * Math.pow(Math.abs(c), 6)) * (c > 0 ? 1 : 0.62);
        if (r > L) return null;
        return r < 0.2 ? WHITE : R[r < L * 0.6 ? 0 : 1];
      }, R[3]);
    }],
    // Lichtschein (Farbe = pal) und Leuchten am Boden
    glare: [1, function (R) {
      return pixels(120, 120, function (x, y, nx, ny) {
        var r = Math.hypot(nx, ny);
        if (r < 0.18) return R[0];
        if (r < 0.45) return dith(x, y, 0.3 + (0.45 - r) / 0.27 * 0.7) ? R[1] : null;
        return r < 0.95 && dith(x, y, (0.95 - r) / 0.5 * 0.35) ? R[1] : null;
      });
    }],
    glow: [1, function (R) {
      return pixels(60, 12, function (x, y, nx, ny) {
        var r = Math.hypot(nx, ny);
        if (r < 0.35) return R[0];
        if (r < 0.65) return dith(x, y, 0.6) ? R[1] : null;
        return r < 0.95 && dith(x, y, 0.3) ? R[2] : null;
      });
    }],
    speed: [1, function (R) {
      return pixels(40, 2, function (x, y) { return dith(x, y, 0.1 + x / 39 * 0.9) ? R[x > 34 ? 0 : 1] : null; });
    }],
    // Strahl-Muster (wiederholt sich der Länge nach), w = Dicke; Ränder leicht ausgefranst
    beam: [1, function (R, v, w) {
      var jit = [0, 0.1, 0.05, 0.12, 0.02, 0.08];
      return pixels(6, w, function (x, y, nx, ny) {
        var t = Math.abs(ny) + jit[x];
        if (t > 1.02) return null;
        if (t > 0.9) return dith(x, y, 0.5) ? R[3] : null;
        return t < 0.22 ? WHITE : R[t < 0.42 ? 0 : t < 0.62 ? 1 : t < 0.8 ? 2 : 3];
      });
    }],
    // Hieb: zur Mitte dicke, an den Enden spitze Sichel, L = Länge
    slash: [1, function (R, v, L) {
      return pixels(L, 11, function (x, y) {
        var s = Math.sin(Math.PI * (x + 0.5) / L), th = Math.pow(s, 0.8) * 3.4, d = Math.abs(y + 0.5 - (7.5 - 3.5 * s)) / th;
        if (d > 1) return null;
        return d < 0.35 ? WHITE : R[d < 0.7 ? 0 : 1];
      }, R[2]);
    }],
    // Kiefer: Zahnfleisch in der Typfarbe, fünf Zähne; der untere ist der gespiegelte obere
    jaw: [1, function (R, v, W) {
      var gap = W / 5;
      return pixels(W, 12, function (x, y) {
        if (y <= 3) return R[y === 0 ? 4 : y === 3 ? 2 : 3];
        var cx = (Math.floor(x / gap) + 0.5) * gap, half = gap * 0.36 * (1 - (y - 4) / 7);
        if (Math.abs(x + 0.5 - cx) > half) return null;
        return x + 0.5 < cx ? WHITE : [208, 210, 224];
      }, R[4]);
    }],
    // Steinspitze aus dem Boden: links Licht, rechts Schatten
    spike: [3, function (R, v) {
      var rand = rng(v * 41 + 9), j = [];
      for (var i = 0; i < 48; i++) j.push(rand() < 0.3 ? 0.8 : 0);
      return pixels(15, 48, function (x, y) {
        var t = (y + 0.5) / 48, half = 0.6 + 6 * t - j[y], dx = x + 0.5 - 7.5;
        if (Math.abs(dx) > half) return null;
        if (dx < -half + 1.5 && t < 0.6) return R[0];
        return R[dx < 0 ? 1 : dx < half * 0.55 ? 2 : 3];
      }, R[4]);
    }],
    // Säule (Erdkräfte, Feuerwirbel …), H = Höhe
    pillar: [1, function (R, v, H) {
      var rand = rng(5), j = [];
      for (var i = 0; i < H; i++) j.push(Math.sin(i * 0.7) * 1.2 + rand() * 1.2);
      return pixels(28, H, function (x, y) {
        var half = 9 + j[y], dx = Math.abs(x + 0.5 - 14);
        if (y < 10) half *= Math.sqrt((y + 1) / 11);
        if (dx > half) return null;
        var q = dx / half + ((x * 5 + y * 3) % 7 === 0 ? 0.15 : 0);
        return R[q < 0.25 ? 0 : q < 0.5 ? 1 : q < 0.8 ? 2 : 3];
      }, R[4]);
    }],
    // Eisblock um den Verteidiger: heller Rand, durchscheinend, Glanzstreifen
    ice: [1, function (R, v, W, H) {
      return pixels(W, H, function (x, y) {
        var e = Math.min(x, y, W - 1 - x, H - 1 - y);
        if (e === 0) return R[0];
        if (e === 1) return alpha(R[1], 220);
        if (x + y < (W + H) * 0.45 && (x + y) % 13 < 2) return alpha(R[0], 190);
        if ((x * 7 + y * 11) % 97 === 0) return WHITE;
        return alpha(R[1], 95);
      });
    }]
  };
  // Pixelbild aus dem Speicher; ohne v eine zufällige Variante
  var cache = {};
  function sprite(kind, pal, a, b, v) {
    var s = SHAPES[kind];
    if (v == null) v = Math.floor(Math.random() * s[0]);
    var key = kind + pal.join() + v + '/' + (a || 0) + 'x' + (b || 0);
    return cache[key] || (cache[key] = s[1](ramp(pal), v, a, b));
  }

  // ── Werkzeuge ─────────────────────────────────────────────────────────────
  var layer = null, S = 2;
  var rnd = function (a, b) { return a + Math.random() * (b - a); };
  var wait = function (ms) { return new Promise(function (r) { setTimeout(r, ms); }); };
  var later = function (ms, fn) { setTimeout(fn, ms); };
  var tf = function (x, y, rot, sx, sy) {
    return 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) rotate(' + (rot || 0).toFixed(1) + 'deg) scale(' +
      (sx == null ? 1 : sx) + ',' + (sy == null ? (sx == null ? 1 : sx) : sy) + ')';
  };

  // Eigene Ebene über Szene und Karte, aber unter Schadenszahl und Einschlag (die kommen später in den body)
  function host() {
    if (!layer || !layer.isConnected) {
      layer = document.createElement('div');
      layer.className = 'fx-layer';
      layer.setAttribute('aria-hidden', 'true');
      document.body.appendChild(layer);
    }
    return layer;
  }
  // Bild an Bildschirmpunkt p hinlegen (w/h in Bildschirmpixeln)
  function place(cls, p, url, w, h) {
    var n = document.createElement('i');
    n.className = 'fx ' + cls;
    n.style.cssText = 'left:' + p.x + 'px;top:' + p.y + 'px;width:' + w + 'px;height:' + h + 'px;background-image:url(' + url + ')';
    host().appendChild(n);
    return n;
  }
  // Ein Teil der Form kind in den Farben pal an p; k = Größe, a/b = Maße für Formen mit eigener Größe (Sprite-Pixel)
  function part(kind, p, pal, k, a, b) {
    var sp = sprite(kind, pal, a, b);
    return place('fx-' + kind, p, sp.url, sp.w * S * (k || 1), sp.h * S * (k || 1));
  }
  // Freihand-Pixelbild w×h (Sprite-Pixel), linke obere Ecke bei p; draw malt mit dot(x, y, Farbe)
  function drawn(cls, p, w, h, draw) {
    var c = document.createElement('canvas');
    c.width = w; c.height = h;
    var g = c.getContext('2d'), img = g.createImageData(w, h), D = img.data;
    draw(function (x, y, col) {
      if (x < 0 || y < 0 || x >= w || y >= h) return;
      var i = (y * w + x) * 4;
      D[i] = col[0]; D[i + 1] = col[1]; D[i + 2] = col[2]; D[i + 3] = col.length > 3 ? col[3] : 255;
    });
    g.putImageData(img, 0, 0);
    return place(cls, p, c.toDataURL(), w * S, h * S);
  }
  function line(x0, y0, x1, y1, fn) {
    x0 = Math.round(x0); y0 = Math.round(y0); x1 = Math.round(x1); y1 = Math.round(y1);
    var dx = Math.abs(x1 - x0), dy = -Math.abs(y1 - y0), sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1, e = dx + dy;
    for (;;) {
      fn(x0, y0);
      if (x0 === x1 && y0 === y1) return;
      var e2 = 2 * e;
      if (e2 >= dy) { e += dy; x0 += sx; }
      if (e2 <= dx) { e += dx; y0 += sy; }
    }
  }
  // Animation abspielen, danach ist das Teil weg. Mit delay wartet das Teil unsichtbar – so kommen Ströme
  // gleichmäßig, Timer (setTimeout) takten unter Windows zu grob und lieferten Klumpen.
  function run(n, frames, opts) {
    if (opts.delay) n.style.opacity = '0';
    opts.fill = opts.delay ? 'forwards' : 'both';
    return n.animate(frames, opts).finished.catch(function () {}).then(function () { n.remove(); });
  }

  // Flug von p nach q: lift = Bogenhöhe, wave/amp = Schlangenlinie, from/to = Größe, spin = Drehung, rot: 'align' = in Flugrichtung
  function travel(kind, pal, p, q, o) {
    o = o || {};
    var dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1, fr = [];
    var rot = o.rot === 'align' ? Math.atan2(dy, dx) * 180 / Math.PI + (o.turn || 0) : o.rot || 0;
    var s0 = o.from == null ? 1 : o.from, s1 = o.to == null ? 1 : o.to;
    for (var i = 0; i <= 12; i++) {
      var t = i / 12, side = o.wave ? Math.sin(t * Math.PI * o.wave) * (o.amp || 0) * S : 0;
      fr.push({
        transform: tf(dx * t - dy / len * side, dy * t + dx / len * side - 4 * (o.lift || 0) * t * (1 - t), rot + (o.spin || 0) * t, s0 + (s1 - s0) * t),
        opacity: o.fade && t > 0.6 ? (1 - t) / 0.4 : 1
      });
    }
    return run(part(kind, p, pal, o.k), fr, { duration: o.dur || 500, delay: o.delay || 0, easing: o.ease || 'linear' });
  }
  // Viele Teile hintereinander (Flammenwurf, Wasserstrahl …); erfüllt, wenn der Strom ankommt
  function stream(kind, pal, p, q, n, every, o) {
    var j = (o.spread || 0) * S, k = (o.src || 2) * S;
    for (var i = 0; i < n; i++) {
      travel(kind, pal, { x: p.x + rnd(-k, k), y: p.y + rnd(-k, k) }, { x: q.x + rnd(-j, j), y: q.y + rnd(-j, j) },
        Object.assign({}, o, { amp: (o.amp || 0) * rnd(-1, 1), k: (o.k || 1) * rnd(0.8, 1.2), delay: i * every }));
    }
    return wait((o.dur || 500) + every * 2);
  }
  // Teile fliegen von p nach außen; angle/cone = nur in eine Richtung (Grad), drop = fallen danach (Sprite-Pixel)
  function burst(kind, pal, p, n, r, o) {
    o = o || {};
    for (var i = 0; i < n; i++) {
      var a = (o.angle != null ? o.angle + rnd(-1, 1) * (o.cone || 45) : i * 360 / n + rnd(-12, 12)) * Math.PI / 180;
      var dist = r * S * rnd(0.55, 1), x = Math.cos(a) * dist, y = Math.sin(a) * dist, sp = rnd(-180, 180), g = (o.drop || 0) * S;
      run(part(kind, p, pal, (o.k || 1) * rnd(0.7, 1.2)), [
        { transform: tf(0, 0, 0, 0.3), opacity: 1 },
        { transform: tf(x * 0.75, y * 0.75 + g * 0.2, sp * 0.6, 1), opacity: 1, offset: 0.5 },
        { transform: tf(x, y + g, sp, 0.7), opacity: 0 }
      ], { duration: o.dur || 560, easing: 'cubic-bezier(.2,.7,.4,1)' });
    }
  }
  // Splitter passend zum Typ der Attacke
  function sprinkle(c, pal, p, n, r) {
    var e = ELEM[c.el] || ['spark', 1];
    burst(e[0], pal, p, n, r, { k: e[1] });
  }
  // Ringe, die sich an p ausbreiten
  function rings(pal, p, n, o) {
    o = o || {};
    for (var i = 0; i < n; i++) later(i * (o.every || 100), function () {
      run(part('ring', p, pal), [{ transform: tf(0, 0, 0, 0.2), opacity: 1 }, { transform: tf(0, 0, 0, o.size || 2.4), opacity: 0 }],
        { duration: o.dur || 600, easing: 'ease-out' });
    });
  }
  // Kurzer Stern-Einschlag
  function pop(p, pal, k) {
    run(part('hit', p, pal, k), [{ transform: tf(0, 0, 0, 0.3), opacity: 1 }, { transform: tf(0, 0, rnd(15, 40), 1.5), opacity: 0 }],
      { duration: 320, easing: 'ease-out' });
  }
  function dust(p, pal, k) {
    run(part('dust', p, pal, k), [{ transform: tf(0, 0, 0, 0.3), opacity: 1 }, { transform: tf(rnd(-8, 8) * S, -12 * S, 0, 1.4), opacity: 0 }],
      { duration: 800, easing: 'ease-out' });
  }
  // Lichtschein um p (statt den ganzen Bildschirm aufblitzen zu lassen – das kostete spürbar Bildrate)
  function glare(p, color, peak, dur, k) {
    run(part('glare', p, [color, color, color], k), [{ transform: tf(0, 0, 0, 0.6), opacity: 0 },
      { transform: tf(0, 0, 0, 1), opacity: peak, offset: 0.15 }, { transform: tf(0, 0, 0, 1.15), opacity: 0 }], { duration: dur || 400, easing: 'ease-out' });
  }
  // Wackeln eines Pokémon (oder einer Seite samt Kasten), klingt ab
  function shake(el, amp, dur) {
    if (!el) return;
    var fr = [];
    for (var i = 0; i <= 10; i++) {
      var a = amp * (1 - i / 10);
      fr.push({ transform: i && i < 10 ? 'translate(' + rnd(-a, a).toFixed(1) + 'px,' + (rnd(-a, a) * 0.6).toFixed(1) + 'px)' : 'none' });
    }
    el.animate(fr, { duration: dur });
  }
  // Beben: beide Seiten wackeln, der Angreifer etwas weniger
  function rumble(c, amp, dur) {
    c.sides.forEach(function (el, i) { shake(el, amp * (i ? 1 : 0.6), dur); });
  }
  // Anlauf des Angreifers zur Mitte und zurück; erfüllt beim Kontakt
  function lunge(c, far) {
    var dur = far ? 520 : 420;
    c.atkBox.animate([{ translate: '0 0' }, { translate: -10 * S * c.dir + 'px 0', offset: 0.3 }, { translate: (far ? 70 : 40) * S * c.dir + 'px 0', offset: 0.7 },
      { translate: '0 0' }], { duration: dur, easing: 'ease-in-out' });
    return wait(dur * 0.7);
  }
  // Tempo-Linien hinter dem Angreifer
  function speedLines(c, pal) {
    var r = c.dir < 0 ? 180 : 0;
    for (var i = 0; i < 5; i++) {
      run(part('speed', { x: c.a.x - c.dir * 24 * S, y: c.A.top + c.A.height * (0.15 + i * 0.17) + rnd(-3, 3) * S }, pal), [
        { transform: tf(c.dir * 20 * S, 0, r, 0.2, 1), opacity: 0 },
        { transform: tf(0, 0, r, 1, 1), opacity: 1, offset: 0.35 },
        { transform: tf(-c.dir * 60 * S, 0, r, 0.5, 1), opacity: 0 }
      ], { duration: 420, delay: i * 25, easing: 'ease-out' });
    }
  }
  // Strahl von p nach q (w = Dicke in Sprite-Pixeln); erfüllt, sobald er ankommt
  function beam(p, q, pal, w, dur) {
    var dx = q.x - p.x, dy = q.y - p.y, sp = sprite('beam', pal, w), r = 'rotate(' + (Math.atan2(dy, dx) * 180 / Math.PI).toFixed(1) + 'deg) ';
    var n = place('fx-beam', p, sp.url, Math.hypot(dx, dy), w * S);
    n.style.marginTop = -w * S / 2 + 'px';
    n.style.backgroundSize = 6 * S + 'px 100%';
    run(n, [
      { transform: r + 'scale(0, 0.6)', opacity: 1 },
      { transform: r + 'scale(1, 1)', opacity: 1, offset: 0.18 },
      { transform: r + 'scale(1, 0.75)', opacity: 1, offset: 0.4 },
      { transform: r + 'scale(1, 1.1)', opacity: 1, offset: 0.6 },
      { transform: r + 'scale(1, 0)', opacity: 0.6 }
    ], { duration: dur, easing: 'ease-out' });
    return wait(dur * 0.18);
  }
  // Hieb durch p im Winkel ang (Grad), len in Bildschirmpixeln
  function slash(p, ang, len, pal) {
    var r = 'rotate(' + ang + 'deg) ';
    run(part('slash', p, pal, 1, Math.max(12, Math.round(len / S))), [
      { transform: r + 'scale(0, 1)', opacity: 1 },
      { transform: r + 'scale(1, 1)', opacity: 1, offset: 0.35 },
      { transform: r + 'scale(1.05, 0.4)', opacity: 0 }
    ], { duration: 320, easing: 'ease-out' });
  }

  // Zickzack-Linie von p nach q (Blitz, Riss)
  function zigzag(p, q, segs, amp) {
    var pts = [], dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1;
    for (var i = 0; i <= segs; i++) {
      var t = i / segs, o = i && i < segs ? rnd(-amp, amp) : 0;
      pts.push([p.x + dx * t - dy / len * o, p.y + dy * t + dx / len * o]);
    }
    return pts;
  }
  // Linienzug (Punkte in Sprite-Pixeln) als Pixelbild; paint(seg) malt, seg(fn) ruft fn für jeden Punkt der Linie
  function polyline(cls, pts, pad, paint) {
    var xs = pts.map(function (v) { return v[0]; }), ys = pts.map(function (v) { return v[1]; });
    var x0 = Math.floor(Math.min.apply(null, xs)) - pad, y0 = Math.floor(Math.min.apply(null, ys)) - pad;
    var w = Math.ceil(Math.max.apply(null, xs)) + pad - x0, h = Math.ceil(Math.max.apply(null, ys)) + pad - y0;
    return drawn(cls, { x: x0 * S, y: y0 * S }, w, h, function (dot) {
      paint(dot, function (fn) {
        for (var i = 1; i < pts.length; i++) line(xs[i - 1] - x0, ys[i - 1] - y0, xs[i] - x0, ys[i] - y0, fn);
      }, x0, y0);
    });
  }
  // Blitz: weißer Kern, helle Hülle, gerastertes Leuchten in der Typfarbe; flackert
  function bolt(p, q, pal, w, dur) {
    var R = ramp(pal), len = Math.hypot(q.x - p.x, q.y - p.y);
    var pts = zigzag(p, q, Math.max(4, Math.round(len / (24 * S))), 9 * S).map(function (v) { return [v[0] / S, v[1] / S]; });
    var g = Math.ceil(w / 2), t = Math.floor(w / 4);
    var n = polyline('fx-cv', pts, g + 1, function (dot, seg) {
      seg(function (x, y) {
        for (var a = -g; a <= g; a++) for (var b = -g; b <= g; b++) if (a * a + b * b <= g * g && dith(x + a, y + b, 0.4)) dot(x + a, y + b, R[2]);
      });
      seg(function (x, y) { for (var a = -t; a <= t; a++) for (var b = -t; b <= t; b++) dot(x + a, y + b, R[0]); });
      seg(function (x, y) { dot(x, y, WHITE); });
    });
    var on = { opacity: 1, easing: 'steps(1, end)' }, off = { opacity: 0.3, easing: 'steps(1, end)' };
    run(n, [on, off, on, off, on, { opacity: 0 }], { duration: dur || 260 });
  }
  // Riss im Boden unter dem Verteidiger, mit kurzen Abzweigen
  function crack(c, pal) {
    var R = ramp(pal), y = (c.D.bottom + 2 * S) / S, half = c.D.width * 0.9 / S, cx = c.d.x / S;
    var l = zigzag({ x: cx, y: y }, { x: cx - half, y: y + 3 }, 7, 2), r = zigzag({ x: cx, y: y }, { x: cx + half, y: y - 2 }, 7, 2);
    var pts = l.reverse().concat(r.slice(1));
    var n = polyline('fx-cv', pts, 5, function (dot, seg, x0, y0) {
      seg(function (x, y) { dot(x, y + 1, R[3]); });
      seg(function (x, y) { dot(x, y, R[4]); });
      pts.forEach(function (v, i) {
        if (i % 3 !== 1) return;
        var dir = i % 2 ? 1 : -1;
        line(v[0] - x0, v[1] - y0, v[0] - x0 + rnd(-3, 3), v[1] - y0 + dir * 4, function (x, y) { dot(x, y, R[4]); });
      });
    });
    run(n, [{ transform: 'scaleX(0)', opacity: 1 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.25 }, { transform: 'scaleX(1)', opacity: 1, offset: 0.75 },
      { transform: 'scaleX(1)', opacity: 0 }], { duration: 1100, easing: 'ease-out' });
  }
  // Kraft sammeln am Maul des Angreifers (Solarstrahl, Hyperstrahl)
  function charge(c, pal, ms) {
    for (var i = 0; i < 12; i++) later(i * ms / 16, function () {
      var a = rnd(0, Math.PI * 2), r = rnd(36, 56) * S;
      travel('spark', pal, { x: c.mouth.x + Math.cos(a) * r, y: c.mouth.y + Math.sin(a) * r }, c.mouth, { dur: ms * 0.5, from: 1.2, to: 0.5, ease: 'ease-in' });
    });
    run(part('orb', c.mouth, pal), [{ transform: tf(0, 0, 0, 0.1), opacity: 0.4 }, { transform: tf(0, 0, 0, 1.1), opacity: 1, offset: 0.8 },
      { transform: tf(0, 0, 0, 0.8), opacity: 0 }], { duration: ms + 150, easing: 'ease-in' });
    return wait(ms);
  }
  // Funkeln rund um den Verteidiger
  function twinkle(c, pal, n) {
    for (var i = 0; i < n; i++) later(i * 45, function () {
      var q = { x: c.d.x + rnd(-0.6, 0.6) * c.D.width, y: c.d.y + rnd(-0.6, 0.6) * c.D.height };
      run(part('twinkle', q, pal, rnd(0.7, 1.3)), [{ transform: tf(0, 0, 0, 0), opacity: 1 }, { transform: tf(0, 0, 0, 1.2), opacity: 1, offset: 0.5 },
        { transform: tf(0, 0, 45, 0), opacity: 0 }], { duration: 600, easing: 'ease-in-out' });
    });
  }
  // Dinge fallen von oben auf den Verteidiger; slant = schräg (Meteore), land(q) beim Aufschlag
  function fall(c, kind, pal, n, o) {
    for (var i = 0; i < n; i++) later(i * (o.every || 90), function () {
      var q = { x: c.d.x + rnd(-0.6, 0.6) * c.D.width, y: c.D.bottom - rnd(0.05, 0.55) * c.D.height };
      var f = { x: q.x - (o.slant || 0) * (q.y + 60), y: -60 };
      travel(kind, pal, f, q, { dur: o.dur || 430, ease: 'cubic-bezier(.55,0,1,.6)', spin: o.spin == null ? rnd(-220, 220) : o.spin, rot: o.rot,
        k: rnd(0.8, 1.3) * (o.k || 1) }).then(function () { if (o.land) o.land(q); });
    });
    return wait((o.dur || 430) + 20);
  }
  // Dinge wachsen unter dem Verteidiger aus dem Boden (Steinkante, Erdkräfte); erfüllt, wenn sie oben sind
  function rise(c, kind, pal, n, o) {
    var dur = o.dur || 900;
    for (var i = 0; i < n; i++) (function (i) {
      var u = n > 1 ? i / (n - 1) - 0.5 : 0, k = (1 - Math.abs(u) * 0.8 + rnd(-0.1, 0.1)) * (o.k || 1), tilt = u * 30;
      later(Math.abs(i - (n - 1) / 2) * (o.every || 60), function () {
        run(part(kind, { x: c.d.x + u * c.D.width * 1.1 + rnd(-4, 4) * S, y: c.D.bottom + 4 * S }, pal, o.height ? 1 : k, o.height), [
          { transform: tf(0, 0, tilt, 1, 0), opacity: 1 },
          { transform: tf(0, 0, tilt, 1, 1.12), opacity: 1, offset: 0.25 },
          { transform: tf(0, 0, tilt, 1, 1), opacity: 1, offset: 0.4 },
          { transform: tf(0, 0, tilt, 1, 1), opacity: 1, offset: 0.75 },
          { transform: tf(0, 0, tilt, 1, 0.6), opacity: 0 }
        ], { duration: dur, easing: 'ease-out' });
      });
    })(i);
    return wait(dur * 0.25);
  }
  // Zwei Kiefer schnappen um den Verteidiger zu
  function jaws(c, pal) {
    var W = Math.round(c.D.width * 0.95 / S), h = 12 * S, gap = c.D.height * 0.55;
    [1, -1].forEach(function (s) {
      run(part('jaw', { x: c.d.x, y: c.d.y - s * h / 2 }, pal, 1, W), [
        { transform: tf(0, -s * gap, 0, 1, s), opacity: 0 },
        { transform: tf(0, -s * gap, 0, 1, s), opacity: 1, offset: 0.25, easing: 'cubic-bezier(.6,0,1,1)' },
        { transform: tf(0, 0, 0, 1, s), opacity: 1, offset: 0.55 },
        { transform: tf(0, 0, 0, 1.05, s * 0.95), opacity: 1, offset: 0.8 },
        { transform: tf(0, 0, 0, 1, s), opacity: 0 }
      ], { duration: 640 });
    });
    return wait(640 * 0.55);
  }
  // Riesenwelle (Surfer) als Pixelbild: Schaumkrone oben und unter der Lippe, Farbstufen nach der Tiefe, Gischt.
  // Maße in Sprite-Pixeln; gemerkt, weil das Malen rund 30 ms dauert
  function waveSize(c) {
    var W = Math.min(1000, Math.max(560, innerWidth * 0.38)), H = Math.min(innerHeight * 0.75, Math.max(300, c.D.height * 2.8));
    return [Math.round(W / S), Math.round(H / S)];
  }
  function waveSprite(w, h, pal, flip) {
    var key = 'wave' + pal.join() + w + 'x' + h + flip;
    if (cache[key]) return cache[key];
    var R = ramp(pal), cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    var g = cv.getContext('2d');
    g.save();
    g.scale(w / 100, h / 100);
    if (flip) { g.translate(100, 0); g.scale(-1, 1); }
    g.fill(new Path2D('M0 100 L0 62 C20 58 40 48 58 32 C68 22 74 8 86 6 C95 5 100 12 98 20 C96 27 90 28 89 22 C86 30 84 40 88 52 C92 66 96 80 100 100 Z'));
    g.restore();
    var M = g.getImageData(0, 0, w, h).data, out = g.createImageData(w, h), O = out.data;
    var on = function (x, y) { return x >= 0 && y >= 0 && x < w && y < h && M[(y * w + x) * 4 + 3] > 127; };
    var put = function (x, y, col, a) { var i = (y * w + x) * 4; O[i] = col[0]; O[i + 1] = col[1]; O[i + 2] = col[2]; O[i + 3] = a || 240; };
    for (var x = 0; x < w; x++) {
      for (var y = 0, depth = 0; y < h; y++) {
        if (!on(x, y)) { depth = 0; continue; }
        depth++;
        var col = depth <= 2 ? WHITE : depth <= 4 ? (dith(x, y, 0.5) ? WHITE : R[1]) : depth <= 9 ? R[1]
          : depth <= 12 ? (dith(x, y, 0.5) ? R[1] : R[2]) : depth <= 32 ? R[2] : depth <= 36 ? (dith(x, y, 0.5) ? R[2] : R[3]) : R[3];
        // helle Wellenlinien im Wasser
        if (depth > 14 && (y + Math.floor(x / 9)) % 14 === 0 && dith(x, y, 0.75)) col = R[1];
        put(x, y, col);
      }
    }
    // Gischt über der Krone
    var rand = rng(11);
    for (var i = 0; i < 70; i++) {
      var sx = Math.round((flip ? 0.02 + rand() * 0.38 : 0.6 + rand() * 0.38) * w), sy = Math.round(rand() * h * 0.3);
      if (!on(sx, sy) && (on(sx, sy + 2) || on(sx, sy + 4) || on(sx - 2, sy + 3) || on(sx + 2, sy + 3))) put(sx, sy, rand() < 0.6 ? WHITE : R[1], 255);
    }
    g.clearRect(0, 0, w, h);
    g.putImageData(out, 0, 0);
    return (cache[key] = { url: cv.toDataURL(), w: w, h: h });
  }
  // Die Welle rollt von hinter dem Angreifer über den ganzen Bildschirm
  function wave(c, pal) {
    var size = waveSize(c), w = size[0], h = size[1], W = w * S, flip = c.dir < 0;
    var x0 = flip ? c.a.x + 40 : c.a.x - W - 40, x1 = flip ? -W - 40 : innerWidth + 40;
    var n = place('fx-wave', { x: x0, y: c.D.bottom + 30 * S }, waveSprite(w, h, pal, flip).url, W, h * S);
    var dur = 1700, dist = x1 - x0, hit = Math.max(0.1, Math.min(0.9, ((flip ? c.d.x : c.d.x - w * S) - x0) / dist));
    run(n, [
      { transform: 'translateX(0) scaleY(0.55)', opacity: 0.7 },
      { transform: 'translateX(' + dist * 0.25 + 'px) scaleY(1)', opacity: 1, offset: 0.25 },
      { transform: 'translateX(' + dist + 'px) scaleY(0.9)', opacity: 1 }
    ], { duration: dur, easing: 'linear' });
    return wait(dur * hit);
  }
  // Brocken im hohen Bogen (Matschbombe, Steinwurf)
  function lob(c, kind, pal, k) {
    for (var i = 1; i < 3; i++) later(i * 110, function () {
      travel(kind, pal, c.mouth, { x: c.d.x + rnd(-14, 14) * S, y: c.d.y + rnd(-10, 10) * S }, { dur: 520, lift: rnd(50, 80) * S, spin: 260, k: k * 0.8 });
    });
    return travel(kind, pal, c.mouth, c.d, { dur: 520, lift: 70 * S, spin: 260, k: k });
  }

  // ── Die Animationen: (Geometrie, Farben) → Promise im Moment des Treffers ──
  var R = {
    // Kontakt
    tackle: async function (c, p) {
      speedLines(c, p);
      await lunge(c, true);
      rings(p, c.d, 1, { size: 2.2, dur: 420 });
      sprinkle(c, p, c.d, 8, 34);
      rumble(c, 1.5 * S, 300);
    },
    iron: async function (c, p) {
      speedLines(c, p);
      await lunge(c, true);
      glare(c.d, '#ffffff', 0.7, 260, 0.8);
      rings(p, c.d, 1, { size: 2.4, dur: 380 });
      burst('star', p, c.d, 8, 40, { k: 0.7 });
      rumble(c, 2 * S, 300);
    },
    punch: async function (c, p) {
      await lunge(c);
      pop(c.d, p, 1.4);
      rings(p, c.d, 2, { size: 1.8, every: 90, dur: 420 });
      sprinkle(c, p, c.d, 10, 38);
    },
    flurry: async function (c, p) {
      lunge(c);
      for (var i = 0; i < 6; i++) {
        await wait(i ? 85 : 260);
        pop({ x: c.d.x + rnd(-0.4, 0.4) * c.D.width, y: c.d.y + rnd(-0.35, 0.35) * c.D.height }, p, 0.9);
        shake(c.defBox, 2 * S, 120);
      }
    },
    slash: async function (c, p) {
      await lunge(c);
      slash(c.d, -35, c.D.width * 1.4, p);
      sprinkle(c, p, c.d, 6, 30);
    },
    cross: async function (c, p) {
      await lunge(c);
      slash(c.d, -45, c.D.width * 1.3, p);
      await wait(90);
      slash(c.d, 45, c.D.width * 1.3, p);
    },
    claw: async function (c, p) {
      await lunge(c);
      var a = 60 * Math.PI / 180;
      for (var i = -1; i <= 1; i++) {
        slash({ x: c.d.x - Math.sin(a) * i * 12 * S, y: c.d.y + Math.cos(a) * i * 12 * S }, 60, c.D.height * 1.1, p);
        await wait(40);
      }
    },
    bite: async function (c, p) {
      lunge(c);
      await jaws(c, p);
      if (ELEM[c.el] && c.el !== 'dark' && c.el !== 'normal') sprinkle(c, p, c.d, 10, 36);
    },
    splash: async function (c, p) {
      await lunge(c);
      rings(p, c.d, 2, { size: 2, every: 80, dur: 450 });
      burst('drop', p, c.d, 14, 46, { angle: -90, cone: 80, drop: 30 });
    },
    // Boden und Gestein
    quake: async function (c, p) {
      rumble(c, 4 * S, 1000);
      crack(c, p);
      [[c.A, 4], [c.D, 7]].forEach(function (v) {
        for (var i = 0; i < v[1]; i++) dust({ x: v[0].left - 10 * S + (v[0].width + 20 * S) * i / (v[1] - 1), y: v[0].bottom }, p, rnd(0.8, 1.3));
      });
      await wait(200);
      burst('rock', p, { x: c.d.x, y: c.D.bottom }, 7, 46, { angle: -90, cone: 70, drop: 40, dur: 750, k: 0.5 });
      await wait(150);
    },
    rockfall: async function (c, p) {
      await fall(c, 'rock', p, 5, { every: 90, k: 1.6, land: function (q) { dust(q, PAL.ground, 0.8); burst('rock', p, q, 3, 20, { drop: 15, k: 0.35 }); } });
      rumble(c, 2 * S, 400);
    },
    rocks: async function (c, p) {
      await lob(c, 'rock', p, 0.9);
      dust({ x: c.d.x, y: c.d.y }, PAL.ground, 1);
      burst('rock', p, c.d, 6, 34, { drop: 20, k: 0.4 });
    },
    spikes: async function (c, p) {
      await rise(c, 'spike', p, 5, { every: 55, dur: 950 });
      burst(c.el === 'grass' ? 'leaf' : 'rock', p, { x: c.d.x, y: c.D.bottom }, 6, 40, { angle: -90, cone: 60, drop: 30, k: 0.45, dur: 650 });
      rumble(c, 2 * S, 350);
    },
    pillar: async function (c, p) {
      var g = { x: c.d.x, y: c.D.bottom };
      run(part('glow', g, p), [{ transform: tf(0, 0, 0, 0.2, 1), opacity: 0 }, { transform: tf(0, 0, 0, 1.2, 1), opacity: 1, offset: 0.3 },
        { transform: tf(0, 0, 0, 1.4, 1), opacity: 0 }], { duration: 1000, easing: 'ease-out' });
      await wait(220);
      await rise(c, 'pillar', p, 1, { dur: 820, height: Math.round(c.D.height * 1.5 / S) });
      sprinkle(c, p, { x: c.d.x, y: c.D.top }, 10, 50);
    },
    meteors: async function (c, p) {
      glare(c.d, p[1], 0.5, 1000, 1.6);
      await fall(c, 'meteor', p, 6, { every: 110, dur: 380, slant: 0.55, spin: 0, rot: 'align', k: 1.3,
        land: function (q) { pop(q, p, 1.2); dust(q, PAL.ground, 1.2); } });
      rumble(c, 3 * S, 800);
    },
    // Feuer
    flame: async function (c, p) {
      await stream('flame', p, c.mouth, c.d, 40, 11, { dur: 520, from: 0.5, to: 1.7, spread: 12, fade: true, wave: 1, amp: 3, rot: 'align', turn: -90 });
      burst('flame', p, c.d, 8, 36, { drop: -20, k: 0.6 });
    },
    fireblast: async function (c, p) {
      await travel('orb', p, c.mouth, c.d, { dur: 520, lift: 30 * S, from: 0.6, to: 1.6, k: 1.2 });
      glare(c.d, p[1], 0.6, 500, 1.2);
      // Das 大 aus fünf Flammen-Armen: oben, links, rechts, schräg unten links und rechts
      [-90, 180, 0, 125, 55].forEach(function (deg) {
        var a = deg * Math.PI / 180;
        for (var j = 1; j <= 5; j++) (function (j) {
          later(j * 35, function () {
            run(part('flame', { x: c.d.x + Math.cos(a) * j * 11 * S, y: c.d.y + Math.sin(a) * j * 11 * S }, p, 1.2 - j * 0.08), [
              { transform: tf(0, 0, 0, 0.2), opacity: 1 }, { transform: tf(0, -3 * S, 0, 1.2), opacity: 1, offset: 0.4 }, { transform: tf(0, -8 * S, 0, 0.9), opacity: 0 }
            ], { duration: 650, easing: 'ease-out' });
          });
        })(j);
      });
    },
    // Wasser
    jet: async function (c, p) {
      var hit = beam(c.mouth, c.d, p, 9, 700);
      stream('drop', p, c.mouth, c.d, 14, 35, { dur: 300, spread: 8, from: 0.7, to: 1.2, rot: 'align', turn: -90 });
      await hit;
      burst('drop', p, c.d, 14, 44, { drop: 30 });
    },
    bubbles: async function (c, p) {
      await stream('bubble', p, c.mouth, c.d, 14, 50, { dur: 650, wave: 2, amp: 6, from: 0.6, to: 1.4, spread: 14 });
      rings(p, c.d, 2, { size: 1.4, every: 80, dur: 350 });
    },
    surf: async function (c, p) {
      burst('drop', p, { x: c.a.x, y: c.A.bottom }, 8, 30, { angle: -90, cone: 60, drop: 20 });
      await wave(c, p);
      burst('drop', p, c.d, 16, 50, { angle: -90, cone: 80, drop: 30 });
    },
    // Elektro
    bolt: async function (c, p) {
      glare(c.d, p[1], 0.5, 500);
      for (var i = 0; i < 3; i++) {
        bolt(c.mouth, { x: c.d.x + rnd(-10, 10) * S, y: c.d.y + rnd(-10, 10) * S }, p, 5, 240);
        await wait(i ? 90 : 70);
      }
      burst('spark', p, c.d, 12, 46);
    },
    thunder: async function (c, p) {
      var x = c.d.x + rnd(-30, 30) * S;
      bolt({ x: x, y: -20 }, c.d, p, 8, 380);
      glare(c.d, '#ffffff', 0.85, 420, 1.6);
      later(140, function () { bolt({ x: x + rnd(-40, 40) * S, y: -20 }, c.d, p, 5, 260); });
      await wait(70);
      burst('spark', p, c.d, 14, 52);
      rumble(c, 2 * S, 300);
    },
    // Eis
    icebeam: async function (c, p) {
      var hit = beam(c.mouth, c.d, p, 7, 800);
      stream('shard', p, c.mouth, c.d, 12, 40, { dur: 320, spread: 10, spin: 360, from: 0.5, to: 1 });
      await hit;
      await wait(150);
      run(part('ice', c.d, p, 1, Math.round(c.D.width * 1.05 / S), Math.round(c.D.height * 1.1 / S)), [
        { transform: tf(0, 0, 0, 0.3), opacity: 0 }, { transform: tf(0, 0, 0, 1), opacity: 1, offset: 0.3 },
        { transform: tf(0, 0, 0, 1), opacity: 1, offset: 0.75 }, { transform: tf(0, 0, 0, 1.1), opacity: 0 }
      ], { duration: 900, easing: 'ease-out' });
      later(650, function () { burst('shard', p, c.d, 12, 60, { drop: 30 }); });
    },
    blizzard: async function (c, p) {
      glare(c.d, '#ffffff', 0.45, 900, 1.4);
      await stream('snow', p, c.mouth, c.d, 48, 12, { dur: 480, src: 14, spread: c.D.height / S * 0.6, from: 0.7, to: 1.4, wave: 1, amp: 5, spin: 180 });
      burst('shard', p, c.d, 10, 44, { drop: 20 });
    },
    shards: async function (c, p) {
      await stream('shard', p, c.mouth, c.d, 5, 70, { dur: 300, rot: 'align', turn: 90, spread: 8, k: 1.4 });
      burst('shard', p, c.d, 6, 30, { drop: 20, k: 0.6 });
    },
    // Pflanze
    leaves: async function (c, p) {
      await stream('leaf', p, c.mouth, c.d, 14, 40, { dur: 520, spin: 720, wave: 1.5, amp: 10, spread: 14, k: 1.2 });
      burst('leaf', p, c.d, 8, 40, { drop: 20 });
    },
    solar: async function (c, p) {
      await charge(c, p, 450);
      await beam(c.mouth, c.d, p, 20, 750);
      glare(c.d, p[0], 0.7, 500, 1.2);
      burst('spark', p, c.d, 12, 50);
    },
    drain: async function (c, p) {
      if (c.physical) await lunge(c);
      rings(p, c.d, 2, { size: 1.6, every: 100, dur: 500 });
      await wait(120);
      // Die geraubte Kraft schwebt zum Angreifer zurück
      for (var i = 0; i < 8; i++) later(250 + i * 70, function () {
        travel('orb', p, { x: c.d.x + rnd(-20, 20) * S, y: c.d.y + rnd(-20, 20) * S }, c.a, { dur: 700, lift: rnd(-40, 60) * S, k: 0.4, to: 0.6, fade: true, ease: 'ease-in-out' });
      });
    },
    // Fernangriffe allgemein
    hyper: async function (c, p) {
      await charge(c, p, 300);
      await beam(c.mouth, c.d, p, 16, 700);
      glare(c.d, p[0], 0.7, 450, 1.2);
      rumble(c, 2.5 * S, 450);
      burst('spark', p, c.d, 12, 50);
    },
    orb: async function (c, p, dark) {
      var kind = dark ? 'dark' : 'orb', o = { dur: 600, lift: 40 * S, from: 0.6, to: 1.3, k: dark ? 1.5 : 1.1, wave: dark ? 3 : 0, amp: 4 };
      // Schweif aus kleineren Kugeln auf derselben Bahn
      for (var i = 1; i <= 5; i++) (function (i) {
        later(i * 35, function () { travel(kind, p, c.mouth, c.d, Object.assign({}, o, { k: 0.75 - i * 0.1, fade: true })); });
      })(i);
      await travel(kind, p, c.mouth, c.d, o);
      rings(p, c.d, 1, { size: 2, dur: 400 });
      burst(dark ? 'dark' : 'spark', p, c.d, 10, 44, { k: dark ? 0.35 : 1 });
    },
    shadow: function (c, p) { return R.orb(c, p, true); },
    moon: async function (c, p) {
      await R.orb(c, p);
      twinkle(c, p, 8);
    },
    tri: async function (c) {
      [PAL.fire, PAL.ice, PAL.electric].forEach(function (pal, i) {
        later(i * 80, function () { travel('orb', pal, c.mouth, c.d, { dur: 520, lift: (i - 1) * 40 * S, k: 0.9 }); });
      });
      await wait(520);
      burst('flame', PAL.fire, c.d, 5, 30, { k: 0.6 });
      burst('shard', PAL.ice, c.d, 5, 34, { k: 0.7 });
      burst('spark', PAL.electric, c.d, 6, 38);
    },
    psychic: async function (c, p) {
      glare(c.d, p[1], 0.45, 800, 1.3);
      rings(p, c.a, 2, { size: 1.6, every: 120, dur: 500 });
      await wait(200);
      rings(p, c.d, 4, { size: 2.6, every: 110, dur: 650 });
      c.defBox.animate([{ scale: '1 1' }, { scale: '1.12 0.9' }, { scale: '0.9 1.1' }, { scale: '1.08 0.94' }, { scale: '1 1' }], { duration: 600, easing: 'ease-in-out' });
      await wait(150);
    },
    buzz: async function (c, p) {
      for (var i = 0; i < 6; i++) later(i * 70, function () {
        travel('arc', p, c.mouth, c.d, { dur: 420, from: 0.5, to: 1.6, rot: 'align' });
      });
      await wait(420);
      shake(c.defBox, 2 * S, 350);
    },
    pulse: async function (c, p) {
      for (var i = 0; i < 5; i++) later(i * 80, function () {
        travel('ring', p, c.mouth, c.d, { dur: 450, from: 0.3, to: 1.3, fade: true });
      });
      await wait(450);
      rings(p, c.d, 2, { size: 2.2, every: 90, dur: 450 });
    },
    sludge: async function (c, p) {
      await lob(c, 'blob', p, 1.2);
      burst('bubble', p, c.d, 12, 44, { drop: 30, k: 0.7 });
    },
    wind: async function (c, p) {
      for (var i = 0; i < 4; i++) later(i * 80, function () {
        travel('arc', p, { x: c.mouth.x, y: c.mouth.y + rnd(-14, 14) * S }, { x: c.d.x, y: c.d.y + rnd(-16, 16) * S }, { dur: 360, rot: 'align', from: 0.8, to: 1.5, k: 1.2 });
      });
      await wait(360);
      slash(c.d, -30, c.D.width * 1.2, p);
      later(80, function () { slash(c.d, 20, c.D.width, p); });
    },
    swift: async function (c, p) {
      await stream('star', p, c.mouth, c.d, 6, 70, { dur: 480, spin: 540, wave: 1, amp: 14, k: 1.2 });
      burst('star', p, c.d, 8, 40, { k: 0.6 });
    },
    sparkle: async function (c, p) {
      glare(c.d, p[1], 0.6, 600, 1.3);
      rings(p, c.a, 1, { size: 2, dur: 500 });
      await wait(160);
      twinkle(c, p, 12);
    },
    boom: async function (c, p) {
      glare(c.a, '#ffffff', 0.9, 700, 2);
      rings(p, c.a, 3, { size: 4, every: 90, dur: 700 });
      burst('flame', PAL.fire, c.a, 16, 90, { k: 1.2 });
      rumble(c, 6 * S, 900);
      await wait(250);
      burst('spark', p, c.d, 12, 50);
    }
  };

  // Lage der beiden Pokémon, Animation und Farben zur Attacke
  function geo(o) {
    S = o.s || 2;
    var A = o.atk.getBoundingClientRect(), D = o.def.getBoundingClientRect();
    var a = { x: A.left + A.width / 2, y: A.top + A.height / 2 }, d = { x: D.left + D.width / 2, y: D.top + D.height / 2 };
    var dir = d.x >= a.x ? 1 : -1, m = MOVES[o.id];
    return {
      A: A, D: D, a: a, d: d, dir: dir, physical: o.physical,
      name: m ? m[0] : (o.physical ? PHYSICAL : SPECIAL)[o.type] || (o.physical ? 'tackle' : 'orb'), el: (m && m[1]) || o.type,
      mouth: { x: a.x + dir * A.width * 0.3, y: A.top + A.height * 0.4 },
      atkBox: o.atk, defBox: o.def, sides: o.scene ? Array.prototype.slice.call(o.scene.querySelectorAll('.vs-side')) : []
    };
  }

  function play(o) {
    if (reduced || !o || !o.atk || !o.def) return Promise.resolve();
    var c = geo(o);
    return Promise.resolve(R[c.name](c, PAL[c.el] || PAL.normal)).catch(function () {});
  }

  // Vorbereiten, solange der Browser nichts zu tun hat: alle Pixelbilder für die gewählte Attacke malen und entpacken.
  // Sonst begann der erste Angriff mit einem Hänger (Malen bis zu 70 ms). Gleiche Angaben wie play.
  var FIXED = ['orb', 'dark', 'spark', 'flame', 'drop', 'bubble', 'blob', 'leaf', 'shard', 'rock', 'star', 'twinkle', 'snow',
    'dust', 'meteor', 'ring', 'arc', 'hit', 'glow', 'speed', 'spike'];
  var jobs = [], working = false;
  var idle = window.requestIdleCallback || function (fn) { return setTimeout(function () { fn({ timeRemaining: function () { return 8; } }); }, 60); };
  function prepare(o) {
    if (reduced || !o || !o.atk || !o.def) return;
    var c = geo(o), pal = PAL[c.el] || PAL.normal, D = c.D, size = waveSize(c), list = [];
    var add = function (kind, p, a, b) { for (var v = 0; v < SHAPES[kind][0]; v++) list.push([kind, p, a, b, v]); };
    FIXED.forEach(function (kind) { add(kind, pal); });
    add('dust', PAL.ground); add('rock', PAL.ground);
    ['#ffffff', pal[0], pal[1]].forEach(function (col) { add('glare', [col, col, col]); });
    [7, 9, 16, 20].forEach(function (w) { add('beam', pal, w); });
    [D.width * 1.4, D.width * 1.3, D.width * 1.2, D.width, D.height * 1.1].forEach(function (len) { add('slash', pal, Math.max(12, Math.round(len / S))); });
    add('jaw', pal, Math.round(D.width * 0.95 / S));
    add('pillar', pal, Math.round(D.height * 1.5 / S));
    add('ice', pal, Math.round(D.width * 1.05 / S), Math.round(D.height * 1.1 / S));
    if (c.name === 'tri' || c.name === 'boom') [PAL.fire, PAL.ice, PAL.electric].forEach(function (p) { add('orb', p); add('flame', p); add('shard', p); add('spark', p); });
    if (c.name === 'surf') list.push(['wave', pal, size[0], size[1], c.dir < 0]);
    jobs = list;
    if (!working) { working = true; idle(work); }
  }
  function work(deadline) {
    while (jobs.length && deadline.timeRemaining() > 2) {
      var j = jobs.shift(), sp = j[0] === 'wave' ? waveSprite(j[2], j[3], j[1], j[4]) : sprite(j[0], j[1], j[2], j[3], j[4]);
      // Gleich entpacken lassen, damit das Bild beim ersten Zeigen schon bereitliegt
      if (!sp.warm) { sp.warm = true; var im = new Image(); im.src = sp.url; if (im.decode) im.decode().catch(function () {}); }
    }
    if (jobs.length) idle(work); else working = false;
  }

  return { play: play, prepare: prepare, moves: MOVES };
})();
