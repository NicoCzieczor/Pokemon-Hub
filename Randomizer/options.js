/*
 * Alle Randomizer-Einstellungen, die es für Platin und für Omega Rubin / Alpha Saphir gibt – aufgeteilt in
 * dieselben Reiter wie im Universal Pokémon Randomizer ZX 4.6.1, aber mit einfachen Texten.
 *
 * Jede Option kennt ihren Platz in der .rnqs-Datei (Feldarten aus rnqs.js; Bytes/Bits laut
 * Settings.java). Die Schlüssel heißen wie die Felder in Settings.java.
 * „on“ sagt, wann eine Option bedienbar ist – nachgebaut aus NewRandomizerGUI.enableOrDisableSubControls.
 * Wird sie unbedienbar, wird sie wie dort abgewählt (außer bei „keep“).
 *
 * Was es je Spiel gibt (NewRandomizerGUI.romLoaded, miscTweaksAvailable der Gen-4- bzw. Gen-6-ROM):
 *   games: ['pt'] / ['oras']   Option (oder Radio-Auswahl) nur in diesem Spiel – im anderen wird sie abgewählt
 *   show(ctx)                  nur ausblenden, z. B. Kniffe nur für bestimmte Sprachfassungen (der Randomizer
 *                              lässt sie dort ohnehin weg)
 *   l / h / opts               dürfen Funktionen von ctx sein (Texte und Auswahllisten je Spiel)
 * ctx = { game: 'pt' | 'oras', english, code, romName } – kommt aus der geladenen ROM (app.js).
 *
 * Ausgangspunkt ist immer blank(): nichts gewählt, alles „Unverändert“.
 */
(function () {
  'use strict';

  const R = window.Rnqs, bit = R.bit, one = R.one, num = R.num, u16 = R.u16;
  const T = (de, en) => ({ de: de, en: en });

  // Zusatz-Kniffe (MiscTweak) und Generationen: je eine 32-Bit-Zahl, höchstes Byte zuerst
  const tweak = k => bit(35 - (k >> 3), k & 7);
  const gen = k => bit(31 - (k >> 3), k & 7);
  const level = (b) => num(b, 0x7F, 0, -50);
  const pct = v => (v > 0 ? '+' : '') + v + ' %';

  const evl = s => s.evolutionsMod === 'RANDOM_EVERY_LEVEL';
  const metro = s => s.movesetsMod === 'METRONOME_ONLY';
  const movesRandom = s => s.movesetsMod === 'RANDOM_PREFER_SAME_TYPE' || s.movesetsMod === 'COMPLETELY_RANDOM';
  const trainers = s => s.trainersMod !== 'UNCHANGED';
  const english = ctx => ctx.english;   // manche Kniffe gibt es bei Platin nur für die englische ROM
  const PT = ['pt'], ORAS = ['oras'];
  const oras = ctx => ctx.game === 'oras';
  // Texte je Spiel
  const G = (pt, or) => ctx => (oras(ctx) ? or : pt);

  // Je Spiel: Pokémon in der Starter-Liste, Original-Starter, erste Generation der „neuere Spiele“-Listen,
  // Name der ROM im Randomizer (steht in der .rnqs-Datei)
  const GAMES = {
    pt: { species: 493, starters: [387, 390, 393], statsGen: 6, movesGen: 5, romName: 'Pokemon Platinum (G)' },
    oras: { species: 721, starters: [252, 255, 258], statsGen: 7, movesGen: 7, romName: 'Pokemon Omega Ruby' }
  };
  const game = ctx => GAMES[ctx && ctx.game] || GAMES.pt;

  const UNCHANGED = T('Unverändert', 'Unchanged');
  const RANDOM = T('Zufällig', 'Random');
  const COMPLETELY = T('Komplett zufällig', 'Completely random');
  const BAN_BAD = T('Keine nutzlosen Items', 'Ban bad items');
  const GOOD_DAMAGING = T('Mehr starke Angriffe', 'Force good damaging moves');
  const GOOD_DAMAGING_H = T('Anteil, der garantiert gute Schadens-Attacken sind.', 'Share that is guaranteed to be good damaging moves.');
  const NO_BREAKING = T('Keine spielbrechenden Attacken', 'No game-breaking moves');
  const NO_BREAKING_H = T('Ultraschall und Drachenwut', 'SonicBoom and Dragon Rage');
  const CHANGE_LEVELS = T('Level ändern', 'Change levels');
  const levelSub = (k, f) => ({ k: k, f: f, type: 'range', min: -50, max: 50, step: 5, reset: 0, fmt: pct });
  const percentSub = (k, f) => ({ k: k, f: f, type: 'range', min: 0, max: 100, step: 5, reset: 0, fmt: v => v + ' %' });
  const genOpts = (from, to) => Array.from({ length: to - from + 1 }, (_, i) => ({ v: from + i, l: T('Gen ' + (from + i), 'Gen ' + (from + i)) }));
  const ALT_FORMES = T('Auch besondere Formen (z. B. Wasch-Rotom, Deoxys-Formen)', 'Allow alternate formes (e.g. Wash Rotom, Deoxys formes)');
  const ALT_FORMES_H = T('Ihre Werte werden getrennt von der Grundform gewürfelt.', 'Their traits are randomized separately from their base forme.');

  // „Mega-Tausch“ bei Trainern geht nur, wenn noch Mega-Entwicklungen im Spiel sind (GenRestrictions.java, OR/AS)
  const MEGA_TYPES = {
    1: ['GRASS', 'POISON', 'FIRE', 'FLYING', 'WATER', 'PSYCHIC', 'GHOST', 'NORMAL', 'BUG', 'ROCK'],
    2: ['ELECTRIC', 'BUG', 'STEEL', 'FIGHTING', 'DARK', 'FIRE', 'ROCK', 'GROUND'],
    3: ['FIRE', 'FIGHTING', 'PSYCHIC', 'FAIRY', 'STEEL', 'ROCK', 'ELECTRIC', 'GHOST', 'DARK', 'DRAGON', 'GRASS', 'WATER', 'GROUND', 'FLYING', 'ICE'],
    4: ['DRAGON', 'GROUND', 'FIGHTING', 'STEEL', 'GRASS', 'ICE', 'NORMAL', 'PSYCHIC'],
    5: ['NORMAL'],
    6: ['ROCK', 'FAIRY']
  };
  function megasInPool(s) {
    const gens = [1, 2, 3, 4, 5, 6].filter(g => s['gen.' + g]);
    if (!s.limitPokemon || !gens.length) return true;          // keine Beschränkung
    if (s.trainersMod !== 'TYPE_THEMED') return true;          // irgendeine Generation mit Megas ist dabei
    const types = new Set();
    gens.forEach(g => MEGA_TYPES[g].forEach(t => types.add(t)));
    return types.size === 18;
  }

  const TABS = [
    {
      id: 'traits', t: T('Pokémon', 'Pokémon'),
      groups: [
        {
          t: T('Basiswerte', 'Base stats'), h: T('KP, Angriff, Verteidigung, Initiative usw.', 'HP, Attack, Defense, Speed etc.'),
          items: [
            { k: 'baseStatisticsMod', type: 'radio', f: one(['UNCHANGED', 'SHUFFLE', 'RANDOM'], [[1, 3], [1, 2], [1, 1]]), opts: [
              { v: 'UNCHANGED', l: UNCHANGED },
              { v: 'SHUFFLE', l: T('Gemischt', 'Shuffle'), h: T('Die Werte eines Pokémon werden untereinander getauscht – es wird weder stärker noch schwächer.', 'Each Pokémon\'s stats are swapped around – it gets neither stronger nor weaker.') },
              { v: 'RANDOM', l: RANDOM, h: T('Neue Werte, die Summe bleibt gleich.', 'New stats, the total stays the same.') }
            ] },
            { k: 'baseStatsFollowEvolutions', type: 'check', f: bit(1, 0), on: s => s.baseStatisticsMod !== 'UNCHANGED' && !evl(s),
              l: T('Entwicklungen erben die Verteilung', 'Follow evolutions'),
              h: T('Ein entwickeltes Pokémon verteilt seine Werte wie seine Vorstufe.', 'Evolutions keep the stat spread of their pre-evolution.') },
            { k: 'baseStatsFollowMegaEvolutions', type: 'check', f: bit(1, 6), games: ORAS, on: s => s.baseStatisticsMod !== 'UNCHANGED',
              l: T('Mega-Entwicklungen erben die Verteilung', 'Follow Mega Evolutions'),
              h: T('Eine Mega-Entwicklung verteilt ihre Werte wie ihre Grundform.', 'Mega Evolutions keep the stat spread of their base forme.') },
            { k: 'assignEvoStatsRandomly', type: 'check', f: bit(1, 7), on: s => s.baseStatisticsMod === 'RANDOM' && (s.baseStatsFollowEvolutions || s.baseStatsFollowMegaEvolutions),
              l: T('Zuwachs bei Entwicklung zufällig verteilen', 'Randomize added stats on evolution') },
            { k: 'updateBaseStats', type: 'check', f: bit(1, 5),
              l: T('Werte wie in neueren Spielen', 'Update base stats to a newer generation'),
              subs: [{ k: 'updateBaseStatsToGeneration', f: num(44, 0xFF), type: 'select', opts: ctx => genOpts(game(ctx).statsGen, 9) }] },
            { k: 'standardizeEXPCurves', type: 'check', f: bit(1, 4),
              l: T('Alle Pokémon gleich schnell leveln', 'Standardize EXP curves'),
              h: T('Jedes Pokémon braucht gleich viele EP pro Level.', 'Every Pokémon needs the same EXP per level.'),
              subs: [
                { k: 'selectedEXPCurve', f: num(46, 0xFF), type: 'select', l: T('EP-Kurve', 'EXP curve'), opts: [
                  { v: 0, l: T('Mittelschnell', 'Medium Fast') }, { v: 3, l: T('Mittellangsam', 'Medium Slow') },
                  { v: 4, l: T('Schnell', 'Fast') }, { v: 5, l: T('Langsam', 'Slow') },
                  { v: 1, l: T('Unregelmäßig', 'Erratic') }, { v: 2, l: T('Schwankend', 'Fluctuating') }
                ] },
                { k: 'expCurveMod', f: one(['LEGENDARIES', 'STRONG_LEGENDARIES', 'ALL'], [[39, 0], [39, 1], [39, 2]]), type: 'select', reset: 'LEGENDARIES', l: T('Ausnahme', 'Exception'), opts: [
                  { v: 'LEGENDARIES', l: T('Legendäre: langsam', 'Legendaries: Slow') },
                  { v: 'STRONG_LEGENDARIES', l: T('Starke Legendäre: langsam', 'Strong legendaries: Slow') },
                  { v: 'ALL', l: T('Alle Pokémon gleich', 'All Pokémon') }
                ] }
              ] }
          ]
        },
        {
          t: T('Typen', 'Types'),
          items: [
            { k: 'typesMod', type: 'radio', f: one(['UNCHANGED', 'RANDOM_FOLLOW_EVOLUTIONS', 'COMPLETELY_RANDOM'], [[2, 2], [2, 0], [2, 1]]), opts: [
              { v: 'UNCHANGED', l: UNCHANGED },
              { v: 'RANDOM_FOLLOW_EVOLUTIONS', l: T('Zufällig – Entwicklungen behalten den Typ', 'Random (follow evolutions)'), on: s => !evl(s), alt: 'COMPLETELY_RANDOM' },
              { v: 'COMPLETELY_RANDOM', l: COMPLETELY }
            ] },
            { k: 'typesFollowMegaEvolutions', type: 'check', f: bit(2, 6), games: ORAS, on: s => s.typesMod !== 'UNCHANGED',
              l: T('Mega-Entwicklungen übernehmen die Typen', 'Follow Mega Evolutions'),
              h: T('Eine Mega-Entwicklung bekommt die neuen Typen ihrer Grundform (manchmal einen dazu).', 'A Mega Evolution gets the new types of its base forme (sometimes one more).') },
            { k: 'dualTypeOnly', type: 'check', f: bit(2, 7), on: s => s.typesMod !== 'UNCHANGED', l: T('Immer zwei Typen', 'Force dual types') }
          ]
        },
        {
          t: T('Fähigkeiten', 'Abilities'),
          items: [
            { k: 'abilitiesMod', type: 'radio', f: one(['UNCHANGED', 'RANDOMIZE'], [[3, 0], [3, 1]]), opts: [
              { v: 'UNCHANGED', l: UNCHANGED }, { v: 'RANDOMIZE', l: RANDOM }
            ] },
            { k: 'allowWonderGuard', type: 'check', f: bit(3, 2), on: s => s.abilitiesMod === 'RANDOMIZE',
              l: T('Wunderwache erlauben', 'Allow Wonder Guard'), h: T('Kann Pokémon fast unbesiegbar machen.', 'Can make Pokémon nearly unbeatable.') },
            { k: 'abilitiesFollowEvolutions', type: 'check', f: bit(3, 3), on: s => s.abilitiesMod === 'RANDOMIZE' && !evl(s),
              l: T('Entwicklungen behalten die Fähigkeit', 'Follow evolutions') },
            { k: 'abilitiesFollowMegaEvolutions', type: 'check', f: bit(3, 7), games: ORAS, on: s => s.abilitiesMod === 'RANDOMIZE',
              l: T('Mega-Entwicklungen behalten die Fähigkeit', 'Follow Mega Evolutions'),
              h: T('Gilt für Pokémon mit nur einer Mega-Entwicklung.', 'Applies to Pokémon with a single Mega Evolution.') },
            { k: 'banTrappingAbilities', type: 'check', f: bit(3, 4), on: s => s.abilitiesMod === 'RANDOMIZE',
              l: T('Keine Fang-Fähigkeiten', 'Ban trapping abilities'), h: T('Ausweglos, Wegsperre, Magnetfalle', 'Arena Trap, Shadow Tag, Magnet Pull') },
            { k: 'banNegativeAbilities', type: 'check', f: bit(3, 5), on: s => s.abilitiesMod === 'RANDOMIZE',
              l: T('Keine schädlichen Fähigkeiten', 'Ban negative abilities'), h: T('z. B. Schnarchnase, Saumselig, Tollpatsch', 'e.g. Truant, Slow Start, Klutz') },
            { k: 'banBadAbilities', type: 'check', f: bit(3, 6), on: s => s.abilitiesMod === 'RANDOMIZE',
              l: T('Keine nutzlosen Fähigkeiten', 'Ban bad abilities'), h: T('z. B. Plus, Minus, Honigmaul', 'e.g. Plus, Minus, Honey Gather') },
            { k: 'weighDuplicateAbilitiesTogether', type: 'check', f: bit(40, 7), on: s => s.abilitiesMod === 'RANDOMIZE',
              l: T('Gleich wirkende Fähigkeiten zusammen zählen', 'Combine duplicate abilities'),
              h: T('z. B. kommen Insomnia und Munterkeit nicht doppelt so oft vor.', 'e.g. Insomnia and Vital Spirit don\'t show up twice as often.') },
            { k: 'ensureTwoAbilities', type: 'check', f: bit(48, 6), on: s => s.abilitiesMod === 'RANDOMIZE',
              l: T('Immer zwei Fähigkeiten', 'Ensure two abilities') }
          ]
        },
        {
          t: T('Entwicklungen', 'Evolutions'),
          items: [
            { k: 'evolutionsMod', type: 'radio', f: one(['UNCHANGED', 'RANDOM', 'RANDOM_EVERY_LEVEL'], [[26, 0], [26, 1], [26, 7]]), opts: [
              { v: 'UNCHANGED', l: UNCHANGED },
              { v: 'RANDOM', l: RANDOM, h: T('Jedes Pokémon entwickelt sich in ein anderes, zufälliges Pokémon.', 'Every Pokémon evolves into a different, random Pokémon.') },
              { v: 'RANDOM_EVERY_LEVEL', l: T('Bei jedem Level', 'Random every level'), h: T('Das Pokémon entwickelt sich bei jedem Levelaufstieg in ein neues.', 'The Pokémon evolves into a new one on every level up.') }
            ] },
            { k: 'evosSimilarStrength', type: 'check', f: bit(26, 2), on: s => s.evolutionsMod === 'RANDOM', l: T('Ähnlich starke Entwicklung', 'Similar strength') },
            { k: 'evosSameTyping', type: 'check', f: bit(26, 3), on: s => s.evolutionsMod !== 'UNCHANGED', l: T('Mindestens ein gleicher Typ', 'Same typing') },
            { k: 'evosMaxThreeStages', type: 'check', f: bit(26, 4), on: s => s.evolutionsMod === 'RANDOM', l: T('Höchstens drei Stufen', 'Limit evolutions to three stages') },
            { k: 'evosForceChange', type: 'check', f: bit(26, 5), on: s => s.evolutionsMod !== 'UNCHANGED', l: T('Immer anders als im Original', 'Force change') }
          ]
        },
        {
          t: T('Entwicklungen erleichtern', 'Easier evolutions'),
          items: [
            { k: 'changeImpossibleEvolutions', type: 'check', f: bit(0, 0), on: s => !evl(s),
              l: T('Tausch-Entwicklungen ersetzen', 'Change impossible evolutions'),
              h: T('Pokémon, die sich nur per Tausch entwickeln, entwickeln sich stattdessen per Level oder Item.', 'Pokémon that only evolve by trading evolve by level or item instead.') },
            { k: 'makeEvolutionsEasier', type: 'check', f: bit(0, 5), on: s => !evl(s),
              l: T('Früher entwickeln', 'Make evolutions easier'),
              h: T('Spätestens mit Level 40 voll entwickelt, die mittlere Stufe spätestens mit Level 30.', 'Fully evolved by level 40 at the latest, middle stage by level 30.') },
            { k: 'removeTimeBasedEvolutions', type: 'check', f: bit(0, 6), on: s => !evl(s),
              l: T('Tageszeit-Entwicklungen entfernen', 'Remove time-based evolutions'),
              h: T('z. B. Evoli → Psiana/Nachtara geht dann mit Steinen.', 'e.g. Eevee → Espeon/Umbreon then works with stones.') }
          ]
        }
      ]
    },
    {
      id: 'starters', t: T('Starter & Geschenke', 'Starters & gifts'),
      groups: [
        {
          t: T('Starter', 'Starters'),
          items: [
            { k: 'startersMod', type: 'radio', f: one(['UNCHANGED', 'CUSTOM', 'COMPLETELY_RANDOM', 'RANDOM_WITH_TWO_EVOLUTIONS'], [[4, 2], [4, 0], [4, 1], [4, 3]]), opts: [
              { v: 'UNCHANGED', l: G(T('Unverändert (Chelast, Panflam, Plinfa)', 'Unchanged (Turtwig, Chimchar, Piplup)'), T('Unverändert (Geckarbor, Flemmli, Hydropi)', 'Unchanged (Treecko, Torchic, Mudkip)')) },
              { v: 'CUSTOM', l: T('Selbst aussuchen', 'Custom') },
              { v: 'COMPLETELY_RANDOM', l: COMPLETELY },
              { v: 'RANDOM_WITH_TWO_EVOLUTIONS', l: T('Zufällig mit zwei Entwicklungen', 'Random (with two evolutions)'), h: T('Wie echte Starter: drei Stufen.', 'Like real starters: three stages.'), on: s => !evl(s), alt: 'COMPLETELY_RANDOM' }
            ] },
            { k: 'customStarters', type: 'starters', fs: [u16(5), u16(7), u16(9)], on: s => s.startersMod === 'CUSTOM' },
            { k: 'allowStarterAltFormes', type: 'check', f: bit(4, 6), games: ORAS, on: s => s.startersMod !== 'UNCHANGED', l: ALT_FORMES, h: ALT_FORMES_H },
            { k: 'randomizeStartersHeldItems', type: 'check', f: bit(4, 4), l: T('Starter tragen ein zufälliges Item', 'Randomize starter held items') },
            { k: 'banBadRandomStarterHeldItems', type: 'check', f: bit(4, 5), on: s => s.randomizeStartersHeldItems, l: BAN_BAD }
          ]
        },
        {
          t: T('Legendäre & Geschenk-Pokémon', 'Static Pokémon'),
          h: G(T('Feste Begegnungen wie Giratina oder Geschenke wie Evoli.', 'Fixed encounters like Giratina or gifts like Eevee.'),
            T('Feste Begegnungen wie Groudon, Kyogre und Rayquaza oder Geschenke wie Formeo.', 'Fixed encounters like Groudon, Kyogre and Rayquaza or gifts like Castform.')),
          items: [
            { k: 'staticPokemonMod', type: 'radio', f: one(['UNCHANGED', 'RANDOM_MATCHING', 'COMPLETELY_RANDOM', 'SIMILAR_STRENGTH'], [[17, 0], [17, 1], [17, 2], [17, 3]]), opts: [
              { v: 'UNCHANGED', l: UNCHANGED },
              { v: 'RANDOM_MATCHING', l: T('Zufällig – Legendäre bleiben legendär', 'Swap legendaries & standards') },
              { v: 'COMPLETELY_RANDOM', l: COMPLETELY },
              { v: 'SIMILAR_STRENGTH', l: T('Zufällig mit ähnlicher Stärke', 'Random (similar strength)') }
            ] },
            { k: 'limitMainGameLegendaries', type: 'check', f: bit(17, 4), on: s => s.staticPokemonMod === 'SIMILAR_STRENGTH',
              l: T('Legendäre der Geschichte nicht zu stark', 'Limit main game legendaries') },
            { k: 'limit600', type: 'check', f: bit(17, 5), on: s => s.staticPokemonMod !== 'UNCHANGED',
              l: T('Pokémon mit 600+ Basiswerten komplett zufällig', 'Random 600+ BST') },
            { k: 'allowStaticAltFormes', type: 'check', f: bit(17, 6), games: ORAS, on: s => s.staticPokemonMod !== 'UNCHANGED', l: ALT_FORMES, h: ALT_FORMES_H },
            { k: 'swapStaticMegaEvos', type: 'check', f: bit(17, 7), games: ORAS, on: s => s.staticPokemonMod !== 'UNCHANGED',
              l: T('Mega-fähige gegen Mega-fähige tauschen', 'Swap Mega Evolvables'),
              h: T('Latios/Latias werden durch ein anderes Pokémon mit Mega-Entwicklung ersetzt.', 'Latios/Latias are replaced by another Pokémon that can Mega Evolve.') },
            { k: 'correctStaticMusic', type: 'check', f: bit(25, 5), games: PT, on: s => s.staticPokemonMod !== 'UNCHANGED', show: english,
              l: T('Passende Kampfmusik', 'Fix music') },
            { k: 'staticLevelModified', type: 'check', f: bit(47, 7), l: CHANGE_LEVELS, subs: [levelSub('staticLevelModifier', level(47))] }
          ]
        },
        {
          t: T('Tausch im Spiel', 'In-game trades'),
          items: [
            { k: 'inGameTradesMod', type: 'radio', f: one(['UNCHANGED', 'RANDOMIZE_GIVEN', 'RANDOMIZE_GIVEN_AND_REQUESTED'], [[23, 6], [23, 1], [23, 0]]), opts: [
              { v: 'UNCHANGED', l: UNCHANGED },
              { v: 'RANDOMIZE_GIVEN', l: T('Nur das Pokémon, das man bekommt', 'Randomize given Pokémon only') },
              { v: 'RANDOMIZE_GIVEN_AND_REQUESTED', l: T('Beide Pokémon zufällig', 'Randomize both requested & given') }
            ] },
            { k: 'randomizeInGameTradesNicknames', type: 'check', f: bit(23, 4), on: s => s.inGameTradesMod !== 'UNCHANGED', l: T('Zufälliger Spitzname', 'Randomize nicknames') },
            { k: 'randomizeInGameTradesOTs', type: 'check', f: bit(23, 5), on: s => s.inGameTradesMod !== 'UNCHANGED', l: T('Zufälliger Originaltrainer', 'Randomize OTs') },
            { k: 'randomizeInGameTradesIVs', type: 'check', f: bit(23, 3), on: s => s.inGameTradesMod !== 'UNCHANGED', l: T('Zufällige DVs', 'Randomize IVs') },
            { k: 'randomizeInGameTradesItems', type: 'check', f: bit(23, 2), on: s => s.inGameTradesMod !== 'UNCHANGED', l: T('Zufälliges Item', 'Randomize items') }
          ]
        }
      ]
    },
    {
      id: 'moves', t: T('Attacken', 'Moves'),
      groups: [
        {
          t: T('Attacken der Pokémon', 'Movesets'), h: T('Was Pokémon per Level lernen.', 'What Pokémon learn by level up.'),
          items: [
            { k: 'movesetsMod', type: 'radio', f: one(['UNCHANGED', 'RANDOM_PREFER_SAME_TYPE', 'COMPLETELY_RANDOM', 'METRONOME_ONLY'], [[11, 2], [11, 1], [11, 0], [11, 3]]), opts: [
              { v: 'UNCHANGED', l: UNCHANGED },
              { v: 'RANDOM_PREFER_SAME_TYPE', l: T('Zufällig – bevorzugt eigener Typ', 'Random (prefer same type)') },
              { v: 'COMPLETELY_RANDOM', l: COMPLETELY },
              { v: 'METRONOME_ONLY', l: T('Nur Metronom', 'Metronome only'), h: T('Jedes Pokémon kann nur Metronom.', 'Every Pokémon only knows Metronome.') }
            ] },
            { k: 'startWithGuaranteedMoves', type: 'check', f: bit(11, 4), on: movesRandom,
              l: T('Mit mehreren Attacken starten', 'Guaranteed level 1 moves'),
              h: T('So viele Attacken kann jedes Pokémon schon ab Level 1.', 'Every Pokémon knows this many moves from level 1.'),
              subs: [{ k: 'guaranteedMoveCount', f: num(11, 0xC0, 6, 2), type: 'select', reset: 2, opts: [2, 3, 4].map(v => ({ v: v, l: T(v + ' Attacken', v + ' moves') })) }] },
            { k: 'reorderDamagingMoves', type: 'check', f: bit(11, 5), on: movesRandom,
              l: T('Schwache Angriffe zuerst', 'Reorder damaging moves'), h: T('Starke Angriffe lernt das Pokémon erst später.', 'Strong attacks are learned later.') },
            { k: 'movesetsForceGoodDamaging', type: 'check', f: bit(12, 7), on: movesRandom, l: GOOD_DAMAGING, h: GOOD_DAMAGING_H,
              subs: [percentSub('movesetsGoodDamagingPercent', num(12, 0x7F))] },
            { k: 'blockBrokenMovesetMoves', type: 'check', f: bit(39, 3), on: movesRandom, l: NO_BREAKING, h: NO_BREAKING_H }
          ]
        },
        {
          t: T('Attacken selbst', 'Move data'),
          items: [
            { k: 'randomizeMovePowers', type: 'check', f: bit(25, 0), l: T('Stärke zufällig', 'Randomize power') },
            { k: 'randomizeMoveAccuracies', type: 'check', f: bit(25, 1), l: T('Genauigkeit zufällig', 'Randomize accuracy') },
            { k: 'randomizeMovePPs', type: 'check', f: bit(25, 2), l: T('AP zufällig', 'Randomize PP') },
            { k: 'randomizeMoveTypes', type: 'check', f: bit(25, 3), l: T('Typ zufällig', 'Randomize types') },
            { k: 'randomizeMoveCategory', type: 'check', f: bit(25, 4), l: T('Physisch/Speziell zufällig', 'Randomize category') },
            { k: 'updateMoves', type: 'check', f: bit(0, 1),
              l: T('Werte wie in neueren Spielen', 'Update moves to a newer generation'),
              h: T('Stärke, Genauigkeit usw. aus der gewählten Generation.', 'Power, accuracy etc. from the chosen generation.'),
              subs: [{ k: 'updateMovesToGeneration', f: num(45, 0xFF), type: 'select', opts: ctx => genOpts(game(ctx).movesGen, 9) }] }
          ]
        }
      ]
    },
    {
      id: 'trainers', t: T('Trainer', 'Trainers'),
      groups: [
        {
          t: T('Pokémon der Trainer', 'Trainer Pokémon'),
          items: [
            // MAINPLAYTHROUGH gibt es nur in Gen 5 – der Randomizer macht daraus RANDOM
            { k: 'trainersMod', type: 'radio', f: one(['UNCHANGED', 'RANDOM', 'DISTRIBUTED', 'MAINPLAYTHROUGH', 'TYPE_THEMED', 'TYPE_THEMED_ELITE4_GYMS'], [[13, 0], [13, 1], [13, 2], [13, 3], [13, 4], [13, 5]]), other: 'RANDOM', opts: [
              { v: 'UNCHANGED', l: UNCHANGED },
              { v: 'RANDOM', l: RANDOM },
              { v: 'DISTRIBUTED', l: T('Zufällig, gleichmäßig verteilt', 'Random (even distribution)'), h: T('Damit nicht dieselben Pokémon ständig vorkommen.', 'So the same Pokémon don\'t show up all the time.') },
              { v: 'TYPE_THEMED', l: T('Typ-Themen', 'Type themed'), h: T('Jeder Trainer bekommt einen Typ, jede Arena einen gemeinsamen.', 'Every trainer gets one type, every gym a shared one.') },
              { v: 'TYPE_THEMED_ELITE4_GYMS', l: T('Typ-Themen nur für Arenen & Top Vier', 'Type themed (Elite Four & gyms only)') }
            ] },
            { k: 'rivalCarriesStarterThroughout', type: 'check', f: bit(27, 1), on: s => !evl(s) && (s.startersMod !== 'UNCHANGED' || trainers(s)),
              l: T('Rivale behält seinen Starter', 'Rival carries starter through game') },
            { k: 'trainersUsePokemonOfSimilarStrength', type: 'check', f: bit(27, 0), on: trainers, l: T('Ähnlich stark wie im Original', 'Similar strength') },
            { k: 'trainersMatchTypingDistribution', type: 'check', f: bit(27, 2), on: s => s.trainersMod === 'TYPE_THEMED',
              l: T('Typen nach Häufigkeit verteilen', 'Weight types by number of Pokémon') },
            { k: 'trainersBlockLegendaries', type: 'check', f: bit(27, 3), on: trainers, l: T('Keine legendären Pokémon', 'Don\'t use legendaries') },
            { k: 'trainersBlockEarlyWonderGuard', type: 'check', f: bit(27, 4), on: trainers, l: T('Keine Wunderwache vor Level 20', 'No early Wonder Guard') },
            { k: 'allowTrainerAlternateFormes', type: 'check', f: bit(39, 6), on: trainers, l: T('Formen erlauben (z. B. Wasch-Rotom)', 'Allow alternate formes (e.g. Wash Rotom)') },
            { k: 'swapTrainerMegaEvos', type: 'check', f: bit(27, 5), games: ORAS, on: s => trainers(s) && megasInPool(s),
              l: T('Mega-fähige gegen Mega-fähige tauschen', 'Swap Mega Evolvables'),
              h: T('Trainer-Pokémon mit Mega-Stein werden durch ein anderes Pokémon mit Mega-Entwicklung ersetzt.', 'Trainer Pokémon holding a Mega Stone are replaced by another Pokémon that can Mega Evolve.') },
            { k: 'doubleBattleMode', type: 'check', f: bit(40, 0), on: trainers, l: T('Alle Kämpfe als Doppelkampf', 'Double battle mode') },
            { k: 'eliteFourUniquePokemonNumber', type: 'count', f: num(50, 0x07), max: 2, on: trainers,
              l: T('Top Vier mit eigenen Pokémon', 'Elite Four have unique Pokémon'),
              h: T('So viele Pokémon der Top Vier kommen sonst bei keinem Trainer vor.', 'This many Elite Four Pokémon appear on no other trainer.') }
          ]
        },
        {
          t: T('Stärke', 'Strength'),
          items: [
            { k: 'trainersForceFullyEvolved', type: 'check', f: bit(14, 7), on: s => !evl(s), l: T('Voll entwickelt ab Level', 'Force fully evolved at level'),
              subs: [{ k: 'trainersForceFullyEvolvedLevel', f: num(14, 0x7F), type: 'range', min: 30, max: 65, step: 1, reset: 30, fmt: v => 'Lv. ' + v }] },
            { k: 'trainersLevelModified', type: 'check', f: bit(36, 7), l: CHANGE_LEVELS, subs: [levelSub('trainersLevelModifier', level(36))] },
            { k: 'betterTrainerMovesets', type: 'check', f: bit(27, 7),
              l: T('Bessere Attacken', 'Better movesets'), h: T('Trainer-Pokémon bekommen passendere, stärkere Attacken.', 'Trainer Pokémon get better fitting, stronger moves.') }
          ]
        },
        {
          t: T('Mehr Pokémon', 'Additional Pokémon'), h: T('Höchstens 6 pro Trainer.', '6 per trainer at most.'),
          items: [
            { k: 'additionalBossTrainerPokemon', type: 'count', f: num(40, 0x0E, 1), max: 5, on: trainers,
              l: T('Bosse', 'Boss trainers'), h: T('Arenaleiter, Top Vier, Champ, Team-Anführer', 'Gym leaders, Elite Four, Champion, team leaders') },
            { k: 'additionalImportantTrainerPokemon', type: 'count', f: num(40, 0x70, 4), max: 5, on: trainers,
              l: T('Wichtige Trainer', 'Important trainers'), h: T('Rivale, Team-Commander', 'Rival, team admins') },
            { k: 'additionalRegularTrainerPokemon', type: 'count', f: num(41, 0x07), max: 5, on: trainers, l: T('Normale Trainer', 'Regular trainers') }
          ]
        },
        {
          t: T('Items der Trainer-Pokémon', 'Held items'),
          items: [
            { k: 'randomizeHeldItemsForBossTrainerPokemon', type: 'check', f: bit(48, 0), on: trainers, l: T('Bosse', 'Boss trainers') },
            { k: 'randomizeHeldItemsForImportantTrainerPokemon', type: 'check', f: bit(48, 1), on: trainers, l: T('Wichtige Trainer', 'Important trainers') },
            { k: 'randomizeHeldItemsForRegularTrainerPokemon', type: 'check', f: bit(48, 2), on: trainers, l: T('Normale Trainer', 'Regular trainers') },
            { k: 'consumableItemsOnlyForTrainerPokemon', type: 'check', f: bit(48, 3), on: heldItems, l: T('Nur Items zum Verbrauchen (z. B. Beeren)', 'Consumable only (e.g. berries)') },
            { k: 'sensibleItemsOnlyForTrainerPokemon', type: 'check', f: bit(48, 4), on: heldItems, l: T('Nur sinnvolle Items', 'Sensible items only') },
            { k: 'highestLevelOnlyGetsItemsForTrainerPokemon', type: 'check', f: bit(48, 5), on: heldItems, l: T('Nur das stärkste Pokémon bekommt ein Item', 'Highest level Pokémon only') }
          ]
        },
        {
          t: T('Namen', 'Names'),
          items: [
            { k: 'randomizeTrainerNames', type: 'check', f: bit(0, 3), l: T('Trainer-Namen zufällig', 'Randomize trainer names') },
            { k: 'randomizeTrainerClassNames', type: 'check', f: bit(0, 4), l: T('Trainerklassen zufällig', 'Randomize trainer class names') }
          ]
        }
      ]
    },
    {
      id: 'wild', t: T('Wilde Pokémon', 'Wild Pokémon'),
      groups: [
        {
          t: T('Wilde Pokémon', 'Wild Pokémon'),
          items: [
            { k: 'wildPokemonMod', type: 'radio', f: one(['UNCHANGED', 'RANDOM', 'AREA_MAPPING', 'GLOBAL_MAPPING'], [[15, 6], [15, 5], [15, 1], [15, 4]]), opts: [
              { v: 'UNCHANGED', l: UNCHANGED },
              { v: 'RANDOM', l: COMPLETELY, h: T('Viele verschiedene Pokémon pro Gebiet.', 'Many different Pokémon per area.') },
              { v: 'AREA_MAPPING', l: T('Pro Gebiet ausgetauscht', 'Area 1-to-1'), h: T('Jedes Pokémon eines Gebiets wird dort durch genau ein anderes ersetzt.', 'Each Pokémon in an area is replaced by exactly one other there.') },
              { v: 'GLOBAL_MAPPING', l: T('Überall gleich ausgetauscht', 'Global 1-to-1'), h: T('Ein Pokémon wird im ganzen Spiel durch dasselbe andere ersetzt.', 'A Pokémon is replaced by the same other one everywhere.') }
            ] }
          ]
        },
        {
          t: T('Zusätzliche Regel', 'Additional rule'),
          items: [
            { k: 'wildPokemonRestrictionMod', type: 'radio', f: one(['NONE', 'SIMILAR_STRENGTH', 'CATCH_EM_ALL', 'TYPE_THEME_AREAS'], [[15, 2], [16, 2], [15, 0], [15, 3]]),
              on: s => s.wildPokemonMod !== 'UNCHANGED', off: 'NONE', opts: [
                { v: 'NONE', l: T('Keine', 'None') },
                { v: 'SIMILAR_STRENGTH', l: T('Ähnlich stark wie im Original', 'Similar strength') },
                { v: 'CATCH_EM_ALL', l: T('Alle fangbar', 'Catch \'em all'), h: T('Jedes Pokémon kommt irgendwo vor.', 'Every Pokémon shows up somewhere.'), on: s => s.wildPokemonMod !== 'GLOBAL_MAPPING', alt: 'NONE' },
                { v: 'TYPE_THEME_AREAS', l: T('Ein Typ pro Gebiet', 'Type themed areas'), on: s => s.wildPokemonMod !== 'GLOBAL_MAPPING', alt: 'NONE' }
              ] }
          ]
        },
        {
          t: T('Mehr', 'More'),
          items: [
            { k: 'blockWildLegendaries', type: 'check', f: bit(16, 1), on: s => s.wildPokemonMod !== 'UNCHANGED', l: T('Keine legendären Pokémon', 'Don\'t use legendaries') },
            { k: 'allowWildAltFormes', type: 'check', f: bit(39, 7), games: ORAS, on: s => s.wildPokemonMod !== 'UNCHANGED', l: ALT_FORMES, h: ALT_FORMES_H },
            { k: 'useMinimumCatchRate', type: 'check', f: bit(16, 0), l: T('Leichter fangen', 'Minimum catch rate'),
              h: T('Stufe 4: etwa jeder dritte Ball trifft. Stufe 5: jedes Pokémon wird sicher gefangen.', 'Level 4: about every third ball works. Level 5: every Pokémon is caught for sure.'),
              subs: [{ k: 'minimumCatchRateLevel', f: num(50, 0x38, 3, 1), type: 'select', reset: 1, opts: [1, 2, 3, 4, 5].map(v => ({ v: v, l: T('Stufe ' + v, 'Level ' + v) })) }] },
            { k: 'randomizeWildPokemonHeldItems', type: 'check', f: bit(16, 3), l: T('Getragene Items zufällig', 'Randomize held items') },
            { k: 'banBadRandomWildPokemonHeldItems', type: 'check', f: bit(16, 4), on: s => s.randomizeWildPokemonHeldItems, l: BAN_BAD },
            { k: 'wildLevelsModified', type: 'check', f: bit(38, 7), l: CHANGE_LEVELS, subs: [levelSub('wildLevelModifier', level(38))] }
          ]
        }
      ]
    },
    {
      id: 'tms', t: T('TMs & Lehrer', 'TMs & tutors'),
      groups: moveTeacher({
        movesT: T('TM-Attacken', 'TM moves'), compatT: T('Wer kann welche TM lernen?', 'TM & HM compatibility'),
        mod: 'tmsMod', modF: one(['UNCHANGED', 'RANDOM'], [[18, 4], [18, 3]]),
        compat: 'tmsHmsCompatibilityMod', compatF: one(['UNCHANGED', 'RANDOM_PREFER_TYPE', 'COMPLETELY_RANDOM', 'FULL'], [[18, 2], [18, 1], [18, 0], [18, 7]]),
        keep: 'keepFieldMoveTMs', keepF: bit(18, 6), keepL: T('Feld-Attacken behalten (z. B. Schaufler)', 'Keep field move TMs (e.g. Dig)'),
        good: 'tmsForceGoodDamaging', goodF: bit(20, 7), pct: 'tmsGoodDamagingPercent', pctF: num(20, 0x7F),
        broken: 'blockBrokenTMMoves', brokenF: bit(39, 4),
        sanity: 'tmLevelUpMoveSanity', sanityF: bit(18, 5), sanityL: T('Was ein Pokémon per Level lernt, geht auch per TM', 'TM/level-up move sanity'),
        follow: 'tmsFollowEvolutions', followF: bit(19, 1), followL: T('Entwicklungen können dieselben TMs', 'Follow evolutions'),
        extra: { k: 'fullHMCompat', type: 'check', f: bit(19, 0), on: s => s.tmsHmsCompatibilityMod !== 'FULL', keep: true, l: T('Alle können alle VMs', 'Full HM compatibility') }
      }).concat(moveTeacher({
        movesT: T('Attacken-Lehrer', 'Move tutor moves'), compatT: T('Wer kann was beim Lehrer lernen?', 'Move tutor compatibility'),
        mod: 'moveTutorMovesMod', modF: one(['UNCHANGED', 'RANDOM'], [[21, 4], [21, 3]]),
        compat: 'moveTutorsCompatibilityMod', compatF: one(['UNCHANGED', 'RANDOM_PREFER_TYPE', 'COMPLETELY_RANDOM', 'FULL'], [[21, 2], [21, 1], [21, 0], [21, 7]]),
        keep: 'keepFieldMoveTutors', keepF: bit(21, 6), keepL: T('Feld-Attacken behalten', 'Keep field move tutors'),
        good: 'tutorsForceGoodDamaging', goodF: bit(22, 7), pct: 'tutorsGoodDamagingPercent', pctF: num(22, 0x7F),
        broken: 'blockBrokenTutorMoves', brokenF: bit(39, 5),
        sanity: 'tutorLevelUpMoveSanity', sanityF: bit(21, 5), sanityL: T('Was ein Pokémon per Level lernt, geht auch beim Lehrer', 'Tutor/level-up move sanity'),
        follow: 'tutorFollowEvolutions', followF: bit(19, 2), followL: T('Entwicklungen können dasselbe lernen', 'Follow evolutions')
      }))
    },
    {
      id: 'items', t: T('Items', 'Items'),
      groups: [
        {
          t: T('Items auf dem Boden', 'Field items'), h: T('Pokébälle auf der Karte und versteckte Items.', 'Item balls and hidden items.'),
          items: [
            { k: 'fieldItemsMod', type: 'radio', f: one(['UNCHANGED', 'SHUFFLE', 'RANDOM', 'RANDOM_EVEN'], [[24, 2], [24, 1], [24, 0], [24, 4]]), opts: [
              { v: 'UNCHANGED', l: UNCHANGED },
              { v: 'SHUFFLE', l: T('Gemischt', 'Shuffle'), h: T('Dieselben Items, aber an anderen Stellen.', 'The same items, but in other places.') },
              { v: 'RANDOM', l: RANDOM, h: T('Kann auch früh starke Items geben, z. B. einen Meisterball.', 'Can give strong items early, e.g. a Master Ball.') },
              { v: 'RANDOM_EVEN', l: T('Zufällig, gleichmäßig verteilt', 'Random (even distribution)') }
            ] },
            { k: 'banBadRandomFieldItems', type: 'check', f: bit(24, 3), on: s => s.fieldItemsMod === 'RANDOM' || s.fieldItemsMod === 'RANDOM_EVEN', l: BAN_BAD }
          ]
        },
        {
          t: T('Läden', 'Shops'),
          items: [
            { k: 'shopItemsMod', type: 'radio', f: one(['UNCHANGED', 'SHUFFLE', 'RANDOM'], [[37, 2], [37, 1], [37, 0]]), opts: [
              { v: 'UNCHANGED', l: UNCHANGED }, { v: 'SHUFFLE', l: T('Gemischt', 'Shuffle') }, { v: 'RANDOM', l: RANDOM }
            ] },
            { k: 'banBadRandomShopItems', type: 'check', f: bit(37, 3), on: shopRandom, l: BAN_BAD },
            { k: 'banRegularShopItems', type: 'check', f: bit(37, 4), on: shopRandom, l: T('Keine gewöhnlichen Laden-Items', 'Ban regular shop items') },
            { k: 'banOPShopItems', type: 'check', f: bit(37, 5), on: shopRandom, l: T('Keine zu starken Items (z. B. Glücks-Ei)', 'Ban overpowered items (e.g. Lucky Egg)') },
            { k: 'balanceShopPrices', type: 'check', f: bit(37, 6), on: shopRandom, l: T('Preise ausgleichen', 'Balance prices') },
            { k: 'guaranteeEvolutionItems', type: 'check', f: bit(37, 7), on: shopRandom, l: T('Alle Entwicklungs-Items kaufbar', 'Guarantee evolution items') },
            { k: 'guaranteeXItems', type: 'check', f: bit(41, 7), on: shopRandom, l: T('X-Items immer kaufbar', 'Guarantee X items') }
          ]
        },
        {
          t: T('Mitnahme', 'Pickup'), h: T('Items, die Pokémon mit der Fähigkeit Mitnahme finden.', 'Items found by Pokémon with the Pickup ability.'),
          items: [
            { k: 'pickupItemsMod', type: 'radio', f: one(['UNCHANGED', 'RANDOM'], [[49, 1], [49, 0]]), opts: [
              { v: 'UNCHANGED', l: UNCHANGED }, { v: 'RANDOM', l: RANDOM }
            ] },
            { k: 'banBadRandomPickupItems', type: 'check', f: bit(49, 2), on: s => s.pickupItemsMod === 'RANDOM', l: BAN_BAD }
          ]
        }
      ]
    },
    {
      id: 'extras', t: T('Extras', 'Extras'),
      groups: [
        {
          t: T('Komfort', 'Quality of life'),
          items: [
            // Platin: nur die englische ROM hat den Schnelltext-Patch, die japanische keinen für den Nationaldex
            { k: 'tweak.fastestText', type: 'check', f: tweak(3), show: ctx => oras(ctx) || ctx.english, l: T('Schnellster Text', 'Fastest text') },
            { k: 'tweak.runWithoutRunningShoes', type: 'check', f: tweak(18), games: PT, l: T('Rennen schon vor den Turnschuhen', 'Run without running shoes') },
            { k: 'tweak.fasterHpAndExpBars', type: 'check', f: tweak(19), games: PT, l: T('Schnellere KP- und EP-Balken', 'Faster HP and EXP bars') },
            { k: 'tweak.fastDistortionWorld', type: 'check', f: tweak(20), games: PT, l: T('Zerrwelt abkürzen', 'Fast Distortion World'), h: T('Bringt dich direkt zum Kampf gegen Zyrus.', 'Takes you straight to the fight against Cyrus.') },
            { k: 'tweak.nationalDex', type: 'check', f: tweak(7), show: ctx => oras(ctx) || ctx.code !== 'CPUJ', l: T('Nationaler Pokédex von Anfang an', 'National Dex at start') },
            { k: 'tweak.lowerCaseNames', type: 'check', f: tweak(10), games: PT, l: T('Pokémon-Namen nicht in GROSSBUCHSTABEN', 'Lower case Pokémon names') },
            { k: 'tweak.retainAltFormes', type: 'check', f: tweak(17), games: ORAS, l: T('Formen bleiben nach dem Neustart erhalten', 'Don\'t revert temporary alt formes'),
              h: T('Sonst fallen z. B. Mega-Entwicklungen und Protomorphosen im Team beim Neustart des Spiels auf die Grundform zurück.', 'Otherwise e.g. Mega Evolutions and Primal Reversions in your party revert to their base forme when the game is reset.') }
          ]
        },
        {
          t: T('Spiel-Änderungen', 'Game changes'),
          items: [
            { k: 'tweak.updateRotomFormeTyping', type: 'check', f: tweak(21), games: PT, l: T('Rotom-Formen mit neuen Typen', 'Update Rotom appliance typings'), h: T('z. B. wird Wasch-Rotom Elektro/Wasser.', 'e.g. Wash Rotom becomes Electric/Water.') },
            { k: 'tweak.typeEffectiveness', type: 'check', f: tweak(8), games: PT, l: T('Typen-Tabelle wie in neueren Spielen', 'Update type effectiveness'), h: T('z. B. ist Stahl nicht mehr resistent gegen Geist und Unlicht.', 'e.g. Steel no longer resists Ghost and Dark.') },
            { k: 'tweak.catchingTutorial', type: 'check', f: tweak(11), games: PT, l: T('Fang-Vorführung mit zufälligem Pokémon', 'Randomize catching tutorial') },
            { k: 'tweak.luckyEgg', type: 'check', f: tweak(12), l: T('Kein Glücks-Ei als zufälliges Item', 'Ban Lucky Egg') }
          ]
        },
        {
          t: T('Nur bestimmte Pokémon', 'Limit Pokémon'),
          items: [
            { k: 'limitPokemon', type: 'check', f: bit(2, 5), l: T('Nur Pokémon aus bestimmten Generationen', 'Only Pokémon from certain generations'),
              warn: s => s.limitPokemon && ![1, 2, 3, 4, 5, 6].some(g => s['gen.' + g]),
              warnL: T('Wähle mindestens eine Generation – sonst sind alle erlaubt.', 'Pick at least one generation – otherwise all are allowed.') },
            { k: 'gen.1', type: 'check', f: gen(0), on: s => s.limitPokemon, keep: true, l: T('1. Generation (Kanto)', 'Generation 1 (Kanto)') },
            { k: 'gen.2', type: 'check', f: gen(1), on: s => s.limitPokemon, keep: true, l: T('2. Generation (Johto)', 'Generation 2 (Johto)') },
            { k: 'gen.3', type: 'check', f: gen(2), on: s => s.limitPokemon, keep: true, l: T('3. Generation (Hoenn)', 'Generation 3 (Hoenn)') },
            { k: 'gen.4', type: 'check', f: gen(3), on: s => s.limitPokemon, keep: true, l: T('4. Generation (Sinnoh)', 'Generation 4 (Sinnoh)') },
            { k: 'gen.5', type: 'check', f: gen(4), games: ORAS, on: s => s.limitPokemon, keep: true, l: T('5. Generation (Einall)', 'Generation 5 (Unova)') },
            { k: 'gen.6', type: 'check', f: gen(5), games: ORAS, on: s => s.limitPokemon, keep: true, l: T('6. Generation (Kalos)', 'Generation 6 (Kalos)') },
            { k: 'gen.relatives', type: 'check', f: gen(7), on: s => s.limitPokemon, keep: true,
              l: T('Auch Vor- und Weiterentwicklungen aus anderen Generationen', 'Allow evolutionary relatives') },
            { k: 'banIrregularAltFormes', type: 'check', f: bit(49, 3), l: T('Keine Formen, die es nur im Kampf gibt', 'No irregular alternate formes') }
          ]
        }
      ]
    }
  ];

  function heldItems(s) {
    return s.randomizeHeldItemsForBossTrainerPokemon || s.randomizeHeldItemsForImportantTrainerPokemon || s.randomizeHeldItemsForRegularTrainerPokemon;
  }
  function shopRandom(s) { return s.shopItemsMod === 'RANDOM'; }

  // TMs und Attacken-Lehrer funktionieren gleich: je eine Gruppe „Attacken“ und „Wer kann was lernen“
  function moveTeacher(o) {
    const randomMoves = s => !metro(s) && s[o.mod] === 'RANDOM';
    return [
      {
        t: o.movesT,
        items: [
          { k: o.mod, type: 'radio', f: o.modF, on: s => !metro(s), off: 'UNCHANGED', opts: [{ v: 'UNCHANGED', l: UNCHANGED }, { v: 'RANDOM', l: RANDOM }] },
          { k: o.keep, type: 'check', f: o.keepF, on: randomMoves, l: o.keepL },
          { k: o.good, type: 'check', f: o.goodF, on: randomMoves, l: GOOD_DAMAGING, h: GOOD_DAMAGING_H, subs: [percentSub(o.pct, o.pctF)] },
          { k: o.broken, type: 'check', f: o.brokenF, on: randomMoves, l: NO_BREAKING, h: NO_BREAKING_H }
        ]
      },
      {
        t: o.compatT,
        items: [
          { k: o.compat, type: 'radio', f: o.compatF, opts: [
            { v: 'UNCHANGED', l: UNCHANGED },
            { v: 'RANDOM_PREFER_TYPE', l: T('Zufällig – bevorzugt eigener Typ', 'Random (prefer same type)') },
            { v: 'COMPLETELY_RANDOM', l: COMPLETELY },
            { v: 'FULL', l: T('Alle können alles', 'Full compatibility') }
          ] },
          { k: o.sanity, type: 'check', f: o.sanityF, l: o.sanityL,
            on: s => !metro(s) && (s.movesetsMod !== 'UNCHANGED' || s[o.mod] !== 'UNCHANGED' || s[o.compat] !== 'UNCHANGED') },
          { k: o.follow, type: 'check', f: o.followF, l: o.followL,
            on: s => !metro(s) && !evl(s) && (s[o.compat] !== 'UNCHANGED' || s[o.sanity]) }
        ].concat(o.extra ? [o.extra] : [])
      }
    ];
  }

  // Alle Optionen (auch die Unter-Regler) in einer Liste
  const ITEMS = [];
  TABS.forEach(tab => tab.groups.forEach(g => g.items.forEach(it => {
    it.tab = tab.id;
    ITEMS.push(it);
    (it.subs || []).forEach(sub => { sub.tab = tab.id; sub.parent = it; });
  })));
  const FIELDS = [], BY_KEY = {};
  ITEMS.forEach(it => {
    BY_KEY[it.k] = it;
    if (it.type === 'starters') it.fs.forEach((f, i) => FIELDS.push({ k: it.k + '.' + i, f: f, tab: it.tab, it: it }));
    else FIELDS.push({ k: it.k, f: it.f, tab: it.tab, it: it });
    (it.subs || []).forEach(sub => FIELDS.push({ k: sub.k, f: sub.f, tab: sub.tab, it: it }));
  });

  function values(d) {
    const s = {};
    FIELDS.forEach(x => { s[x.k] = R.get(d, x.f); });
    return s;
  }
  const inGame = (it, ctx) => !it.games || it.games.indexOf(ctx.game) >= 0;
  const visible = (it, ctx) => inGame(it, ctx) && (!it.show || it.show(ctx));
  const enabled = (it, s) => !it.on || !!it.on(s);
  // Auswahlliste einer Option für dieses Spiel
  const opts = (it, ctx) => (typeof it.opts === 'function' ? it.opts(ctx) : it.opts).filter(o => inGame(o, ctx));

  // Nichts gewählt: alles „Unverändert“, Zahlen so, wie sie das Original-Programm für eine frisch geladene ROM schreibt
  function blank(ctx) {
    const g = game(ctx), name = (ctx && ctx.romName) || g.romName;
    const d = new Uint8Array(R.LEN + 1 + name.length + 8);
    FIELDS.forEach(x => { if (x.f.t === 'one') R.set(d, x.f, x.f.values[0]); });
    g.starters.forEach((sp, i) => R.set(d, BY_KEY.customStarters.fs[i], sp));
    d[14] = 30;                                  // „voll entwickelt ab Level“: kleinster Wert
    d[36] = d[38] = d[43] = d[47] = 50;          // Level-Regler: ±0 %
    d[41] = 0x08; d[42] = 0x09;                  // Gen-7-Felder (Aura, Herrscher): unverändert
    d[44] = g.statsGen; d[45] = g.movesGen;      // „wie in neueren Spielen“: erste Generation der Liste
    d[R.LEN] = name.length;
    for (let i = 0; i < name.length; i++) d[R.LEN + 1 + i] = name.charCodeAt(i) & 0x7F;
    d.set(R.NAMES_SUM, d.length - 4);
    return d;
  }

  // Einstellungen (z. B. aus einer Datei, auch von einem anderen Spiel) für dieses Spiel übernehmen: nur was es hier
  // gibt, der Rest bleibt wie bei blank(). So steht in der Datei genau das, was angezeigt wird.
  function adopt(d, ctx) {
    const out = blank(ctx);
    FIELDS.forEach(x => { if (inGame(x.it, ctx)) R.set(out, x.f, R.get(d, x.f)); });
    normalize(out, ctx);
    return out;
  }

  // Nach einer Änderung: was nicht mehr bedienbar ist, abwählen (wie im Original-Programm)
  function normalize(d, ctx) {
    const g = game(ctx);
    for (let pass = 0; pass < 4; pass++) {
      let changed = false;
      const put = (f, v) => { if (R.get(d, f) !== v) { R.set(d, f, v); changed = true; } };
      const s = values(d);
      ITEMS.forEach(it => {
        if (!inGame(it, ctx)) {                  // gibt es in diesem Spiel nicht
          if (it.type === 'radio') put(it.f, it.f.values[0]);
          else if (it.type === 'check') { put(it.f, false); (it.subs || []).forEach(sub => { if (sub.reset !== undefined) put(sub.f, sub.reset); }); }
          else if (it.type === 'count') put(it.f, 0);
          return;
        }
        if (it.type === 'starters') {
          // Nicht „Selbst aussuchen“ oder ein Pokémon, das es im Spiel nicht gibt → Original-Starter (wie im Original-Programm)
          it.fs.forEach((f, i) => { if (!enabled(it, s) || R.get(d, f) > g.species) put(f, g.starters[i]); });
          return;
        }
        if (!visible(it, ctx)) return;
        const on = enabled(it, s);
        if (it.type === 'radio') {
          if (!on) { if (it.off !== undefined) put(it.f, it.off); return; }
          const list = opts(it, ctx), o = list.find(x => x.v === s[it.k]);
          if (!o) put(it.f, it.other !== undefined ? it.other : list[0].v);
          else if (o.on && !o.on(s)) put(it.f, o.alt);
        } else if (it.type === 'check') {
          if (!on && !it.keep) put(it.f, false);
          const checked = R.get(d, it.f);
          (it.subs || []).forEach(sub => {
            if (sub.reset !== undefined) { if (!checked) put(sub.f, sub.reset); return; }
            // Auswahl, die es in diesem Spiel nicht gibt (z. B. „Gen 5“ bei OR/AS) → erster Eintrag
            if (sub.type === 'select') {
              const list = opts(sub, ctx);
              if (!list.some(x => x.v === R.get(d, sub.f))) put(sub.f, list[0].v);
            }
          });
        } else if (it.type === 'count') {
          if (!on) put(it.f, 0);
          else if (R.get(d, it.f) > it.max) put(it.f, it.max);
        }
      });
      if (!changed) break;
    }
  }

  // Was ist gewählt? Optionen, die von blank() abweichen (nur was in diesem Spiel zu sehen ist) → Reiter
  function changes(d, base, ctx) {
    const a = values(d), b = values(base), out = {};
    FIELDS.forEach(x => { if (a[x.k] !== b[x.k] && visible(x.it, ctx)) out[x.it.k] = x.tab; });
    return out;
  }

  window.RandoOptions = { TABS: TABS, ITEMS: ITEMS, FIELDS: FIELDS, GAMES: GAMES, values: values, visible: visible, enabled: enabled, opts: opts,
    blank: blank, adopt: adopt, normalize: normalize, changes: changes };
})();
