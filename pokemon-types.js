/*
 * Typen (und Basiswerte) so, wie sie in einer Generation waren – für Typ-Analyse und Info-Panel in Solo,
 * Duo und Trio sowie Typen im Pokédex.
 *
 * Seit Gen 6 gibt es den Fee-Typ: Togekiss, Piepi & Co. hatten davor andere Typen, und Stahl widerstand bis
 * Gen 5 noch Geist und Unlicht. Die Typentabelle je Generation kommt aus ../DamageCalc/mechanics.js
 * (DMG.chartFor, muss vorher geladen sein) – so rechnen alle Tools mit denselben Werten. Hier stehen nur die
 * Pokémon, deren Typen sich geändert haben (PokéAPI pokemon_types_past.csv), und die gemerkte Generation des
 * Hubs (hub-gen, teilen sich auch Schadens- und Typen-Rechner).
 */
(function (root) {
  'use strict';

  var GEN_KEY = 'hub-gen';
  var DEFAULT_GEN = 9;   // ohne Wahl: Typen von heute (wie bisher)

  // PokéAPI-ID → [letzte Generation mit diesen Typen, Typen]
  var PAST = {
    35: [5, ['normal']],               // clefairy
    36: [5, ['normal']],               // clefable
    39: [5, ['normal']],               // jigglypuff
    40: [5, ['normal']],               // wigglytuff
    81: [1, ['electric']],             // magnemite
    82: [1, ['electric']],             // magneton
    122: [5, ['psychic']],             // mr-mime
    173: [5, ['normal']],              // cleffa
    174: [5, ['normal']],              // igglybuff
    175: [5, ['normal']],              // togepi
    176: [5, ['normal', 'flying']],    // togetic
    183: [5, ['water']],               // marill
    184: [5, ['water']],               // azumarill
    209: [5, ['normal']],              // snubbull
    210: [5, ['normal']],              // granbull
    280: [5, ['psychic']],             // ralts
    281: [5, ['psychic']],             // kirlia
    282: [5, ['psychic']],             // gardevoir
    298: [5, ['normal']],              // azurill
    303: [5, ['steel']],               // mawile
    439: [5, ['psychic']],             // mime-jr
    468: [5, ['normal', 'flying']],    // togekiss
    546: [5, ['grass']],               // cottonee
    547: [5, ['grass']],               // whimsicott
    10008: [4, ['electric', 'ghost']], // rotom-heat
    10009: [4, ['electric', 'ghost']], // rotom-wash
    10010: [4, ['electric', 'ghost']], // rotom-frost
    10011: [4, ['electric', 'ghost']], // rotom-fan
    10012: [4, ['electric', 'ghost']]  // rotom-mow
  };

  var GAMES = {
    de: { 1: 'Rot, Blau, Gelb', 2: 'Gold, Silber, Kristall', 3: 'Rubin, Saphir, Smaragd, FR/BG', 4: 'Diamant, Perl, Platin, HG/SS',
      5: 'Schwarz, Weiß', 6: 'X, Y, ΩR/αS', 7: 'Sonne, Mond', 8: 'Schwert, Schild', 9: 'Karmesin, Purpur' },
    en: { 1: 'Red, Blue, Yellow', 2: 'Gold, Silver, Crystal', 3: 'Ruby, Sapphire, Emerald, FR/LG', 4: 'Diamond, Pearl, Platinum, HG/SS',
      5: 'Black, White', 6: 'X, Y, OR/AS', 7: 'Sun, Moon', 8: 'Sword, Shield', 9: 'Scarlet, Violet' }
  };

  function getGen() {
    var g = DEFAULT_GEN;
    try { g = +localStorage.getItem(GEN_KEY) || DEFAULT_GEN; } catch (e) {}
    return g >= 1 && g <= 9 ? g : DEFAULT_GEN;
  }
  // Mit pwa.js: über das aktive Spiel des Hubs (meldet 'hubgamechange'); sonst nur die Generation
  function setGen(g) {
    if (root.PokeHubGame) { root.PokeHubGame.setGen(g); return; }
    try { localStorage.setItem(GEN_KEY, String(g)); } catch (e) {}
    document.dispatchEvent(new CustomEvent('hubgenchange', { detail: g }));
  }
  // Aktives Spiel geändert (Chip oder eine andere Seite): Auswahl nachziehen und onChange(gen) melden
  function onGenChange(sel, onChange) {
    document.addEventListener('hubgamechange', function (e) {
      var g = e.detail && e.detail.gen;
      if (!g) return;
      if (sel) sel.value = String(g);
      onChange(g);
    });
  }

  // Typen eines Pokémon (Objekt mit id und types) in Generation gen
  function typesInGen(p, gen) {
    if (!p) return [];
    var past = PAST[p.id];
    if (past && gen <= past[0]) return past[1];
    return Array.isArray(p.types) ? p.types : [];
  }

  // Basiswerte { hp, attack, defense, specialAttack, specialDefense, speed } in Generation gen
  // (p.pastStats aus Pokelocke/pokeapi.js); Gen 1 hatte einen Spezial-Wert für beide
  function statsInGen(p, gen) {
    var out = {}, past = (p && p.pastStats) || [];
    Object.keys((p && p.stats) || {}).forEach(function (key) {
      var hit = past.filter(function (e) { return e.gen >= gen && e.stats[key] != null; })
        .sort(function (a, b) { return a.gen - b.gen; })[0];
      out[key] = hit ? hit.stats[key] : p.stats[key];
    });
    if (gen === 1 && 'specialAttack' in out) {
      var sp = past.filter(function (e) { return e.stats.special != null; })[0];
      out.specialAttack = out.specialDefense = sp ? sp.stats.special : out.specialAttack;
    }
    return out;
  }

  // Typen, die es in der Generation gibt (Reihenfolge der Typentabelle)
  function typeList(gen) { return Object.keys(root.DMG.chartFor(gen)); }

  function effectiveness(atk, defTypes, gen) {
    var row = root.DMG.chartFor(gen)[atk] || {};
    return defTypes.reduce(function (m, d) { return m * (row[d] != null ? row[d] : 1); }, 1);
  }

  // Auswahl „Typen wie in Gen …“ füllen; onChange(gen) nach jeder Wahl
  function fillGenSelect(sel, onChange) {
    if (!sel) return;
    var names = GAMES[root.LANG === 'en' ? 'en' : 'de'];
    sel.innerHTML = '';
    for (var g = 1; g <= 9; g++) {
      var o = document.createElement('option');
      o.value = String(g);
      o.textContent = 'Gen ' + g + ' · ' + names[g];
      sel.appendChild(o);
    }
    sel.value = String(getGen());
    if (onChange && !sel.dataset.bound) {
      sel.dataset.bound = '1';
      sel.addEventListener('change', function () { setGen(+sel.value); onChange(+sel.value); });
    }
  }

  root.PokemonTypes = {
    getGen: getGen, setGen: setGen, typesInGen: typesInGen, statsInGen: statsInGen, typeList: typeList,
    effectiveness: effectiveness, fillGenSelect: fillGenSelect, onGenChange: onGenChange
  };
})(window);
