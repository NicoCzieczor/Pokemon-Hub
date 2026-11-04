/*
 * hub-save.js – welches Spiel steckt im Spielstand? Verteilt auf Platin (pt-save/-edit/-bag.js) oder
 * Omega Rubin / Alpha Saphir (oras-save/-edit/-bag.js) und liefert dazu, was die Oberflächen je Spiel brauchen
 * (Orden, Taschen, Sprites, Regional-Dex …). Save-Viewer, Save-Editor und Boss-Planer fragen nur hier –
 * so ist es egal, welches der beiden Spiele geladen wird.
 *
 *   HubSave.of(bytes)    → Spiel-Eintrag ({ key, D, Save, Edit, Bag, … }) oder null
 *   HubSave.parse(bytes) → wie PtSave.parse, dazu data.kind ('pt' | 'oras')
 *   HubSave.get(key)     → Spiel-Eintrag nach Schlüssel ('pt', 'oras')
 *
 * Fehlt ein Modul auf einer Seite (z. B. kein Editor im Viewer), bleibt der Eintrag dafür leer.
 */
(function (root) {
  'use strict';

  var SPR = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/';
  var HOME = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/home/';

  var GAMES = {
    pt: {
      key: 'pt',
      hubGame: 'platin',
      gen: 4,
      name: { de: 'Platin', en: 'Platinum' },
      region: { de: 'Sinnoh', en: 'Sinnoh' },
      versionGroup: 'platinum',
      spriteDir: SPR + 'generation-iv/platinum/',
      files: { de: '.sav oder .dsv', en: '.sav or .dsv' },
      // Bit im Spielstand, Stadt (Ort-ID), Farbe – in Platin-Reihenfolge
      badges: [
        { bit: 0, city: 8, color: '#a9a29a' }, { bit: 1, city: 9, color: '#6fcf7b' },
        { bit: 4, city: 10, color: '#c09cf0' }, { bit: 2, city: 12, color: '#ffa6c4' },
        { bit: 3, city: 11, color: '#7cc0ff' }, { bit: 5, city: 7, color: '#d7b27a' },
        { bit: 6, city: 14, color: '#a8ecff' }, { bit: 7, city: 13, color: '#ffe066' }
      ],
      pockets: {
        de: ['Items', 'Basis-Items', 'TM & VM', 'Briefe', 'Medizin', 'Beeren', 'Bälle', 'Kampf-Items'],
        en: ['Items', 'Key Items', 'TMs & HMs', 'Mail', 'Medicine', 'Berries', 'Poké Balls', 'Battle Items']
      },
      heldPockets: [0, 4, 5, 6, 7], keyPocket: 1, tmPocket: 2,
      // Fangorte zum Auswählen (neues Pokémon): Sinnoh, ohne die Sonderorte dahinter
      catchLocs: function (D) { var out = []; for (var i = 1; i < 126; i++) if (D.text.de.loc0[i]) out.push(i); return out; },
      starterMet: { location: 16, level: 5 },
      data: function () { return root.PT_DATA; },
      Save: function () { return root.PtSave; }, Edit: function () { return root.PtEdit; }, Bag: function () { return root.PtBag; },
      detect: function (bytes) {
        var S = root.PtSave;
        if (!S) return false;
        var b = S._internal.normalize(bytes);
        return !!b && S._internal.detect(b) === 'pt';
      }
    },
    oras: {
      key: 'oras',
      hubGame: 'omega-rot-alpha-saphir',
      gen: 6,
      name: { de: 'Omega Rubin / Alpha Saphir', en: 'Omega Ruby / Alpha Sapphire' },
      region: { de: 'Hoenn', en: 'Hoenn' },
      versionGroup: 'omega-ruby-alpha-sapphire',
      // Große Bilder: 3D-Renderbilder aus Pokémon HOME (gleicher Ordneraufbau mit shiny/ und female/), sonst die
      // kleinen ORAS-Sprites – die sehen vergrößert pixelig aus. sprite3d = weich skalieren (img.is-3d, theme.css)
      spriteDir: HOME, spriteFallback: SPR + 'generation-vi/omega-ruby-alpha-sapphire/', sprite3d: true,
      files: { de: '„main“ (Citra) oder .sav/.bin', en: '“main” (Citra) or .sav/.bin' },
      // Steinorden … Schauerorden (Bits 0–7)
      badges: [
        { bit: 0, city: 190, color: '#b5a690' }, { bit: 1, city: 174, color: '#e8915c' },
        { bit: 2, city: 188, color: '#f2c94c' }, { bit: 3, city: 176, color: '#ff6b4a' },
        { bit: 4, city: 184, color: '#f4a6c8' }, { bit: 5, city: 192, color: '#9be3a0' },
        { bit: 6, city: 196, color: '#d28cff' }, { bit: 7, city: 198, color: '#6fb7ff' }
      ],
      pockets: {
        de: ['Items', 'Basis-Items', 'TM & VM', 'Medizin', 'Beeren'],
        en: ['Items', 'Key Items', 'TMs & HMs', 'Medicine', 'Berries']
      },
      heldPockets: [0, 3, 4], keyPocket: 1, tmPocket: 2,
      // Hoenn: Städte, Routen und Orte (gerade Nummern 170–354)
      catchLocs: function (D) { var out = []; for (var i = 170; i <= 354; i += 2) if (D.text.de.loc0[i]) out.push(i); return out; },
      starterMet: { location: 204, level: 5 },
      data: function () { return root.ORAS_DATA; },
      Save: function () { return root.OrasSave; }, Edit: function () { return root.OrasEdit; }, Bag: function () { return root.OrasBag; },
      detect: function (bytes) { return !!root.OrasSave && root.OrasSave.detect(bytes) === 'oras'; }
    }
  };

  function entry(key) {
    var g = GAMES[key];
    if (!g) return null;
    return {
      key: g.key, hubGame: g.hubGame, gen: g.gen, name: g.name, region: g.region, versionGroup: g.versionGroup,
      spriteDir: g.spriteDir, spriteFallback: g.spriteFallback || null, sprite3d: !!g.sprite3d, files: g.files, badges: g.badges, pockets: g.pockets, heldPockets: g.heldPockets,
      keyPocket: g.keyPocket, tmPocket: g.tmPocket, starterMet: g.starterMet,
      catchLocs: function () { return g.catchLocs(g.data()); },
      D: g.data(), Save: g.Save(), Edit: g.Edit(), Bag: g.Bag()
    };
  }

  function of(bytes) {
    var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    if (GAMES.oras.detect(b) && root.ORAS_DATA) return entry('oras');
    if (GAMES.pt.detect(b) && root.PT_DATA) return entry('pt');
    return null;
  }

  // Wie PtSave.parse – nur für beide Spiele. Unbekannt: zuerst Platins Meldung (Größe/anderes DS-Spiel)
  function parse(bytes) {
    var b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    var g = of(b);
    if (g) {
      var data = g.Save.parse(b, g.D);
      if (data.ok) data.kind = g.key;
      return data;
    }
    if (root.PtSave && root.PT_DATA) {
      var r = root.PtSave.parse(b, root.PT_DATA);
      if (r.ok) r.kind = 'pt';
      return r;
    }
    return { ok: false, error: 'unknown' };
  }

  // Ort-Name nach Fangort-Nummer (Sonderorte stehen in eigenen Listen: loc2000/loc3000 bzw. loc30000 …)
  function locName(D, lang, id) {
    if (!id) return '';
    var t = D.text[lang], ranges = D.locRanges || [3000, 2000, 0];
    for (var i = 0; i < ranges.length; i++) {
      if (id >= ranges[i]) return t['loc' + ranges[i]][id - ranges[i]] || '';
    }
    return '';
  }

  root.HubSave = { of: of, parse: parse, get: entry, locName: locName, GAMES: Object.keys(GAMES) };
})(typeof window !== 'undefined' ? window : this);
