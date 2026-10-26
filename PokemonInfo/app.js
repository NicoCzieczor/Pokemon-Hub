const POKEAPI = 'https://pokeapi.co/api/v2';
const LANG_KEY = 'hub-lang'; // gleiche Sprache wie alle Seiten des Hubs

// ── I18N ─────────────────────────────────────────────────────────────────────
const I18N = {
  de: {
    title: 'Pokédex', subtitle: 'Vollständige Informationen zu jedem Pokémon',
    searchPlaceholder: 'Pokémon suchen...',
    sectionIdentity: 'Pokémon', sectionStats: 'Basiswerte',
    sectionEffectiveness: 'Typeffektivität', sectionAbilities: 'Fähigkeiten',
    sectionEvolution: 'Entwicklung', sectionForms: 'Formen',
    sectionMoves: 'Attacken', sectionLocations: 'Fundorte', sectionDetails: 'Spezies-Daten',
    modalTitle: 'Pokémon auswählen', modalSearch: 'Suchen...',
    'nav.home':'Home','nav.run':'Run','nav.team':'Team','nav.duo':'Duo',
    'nav.trio':'Trio','nav.catchrate':'Fangrate','nav.damage':'Schaden',
    'nav.types':'Typen','nav.info':'Dex','nav.map':'Karte',
    loading: 'Wird geladen…', noData: 'Keine Daten verfügbar.',
    noMoves: 'Keine Attacken für diese Version gefunden.',
    noLocations: 'Für dieses Pokémon sind in der Datenbank (PokéAPI) keine Fundorte gespeichert. Das bedeutet nicht, dass es keine gibt — die Daten sind schlicht unvollständig.',
    noEvolution: 'Dieses Pokémon entwickelt sich nicht.',
    hiddenAbility: 'Versteckte Fähigkeit',
    shiny: '✦ Shiny',
    bst: 'Gesamt', genLabel: 'Gen',
    height: 'Höhe', weight: 'Gewicht', catchRate: 'Fangrate', friendship: 'Basis-FSW',
    genderMale: '♂\uFE0E männlich', genderFemale: '♀\uFE0E weiblich', genderless: 'Geschlechtslos',
    eggGroups: 'Ei-Gruppen', hatchSteps: 'Schritte (Schlüpfen)', growthRate: 'Wachstum',
    baseExp: 'Basis-EP',
    methodLevelUp: 'Level-Up', methodMachine: 'TM/VM', methodEgg: 'Ei', methodTutor: 'Lehrling',
    colLevel: 'Lv.', colName: 'Name', colType: 'Typ', colCat: 'Kat.',
    colPower: 'Stärke', colAcc: 'Gen.', colPP: 'AP',
    locColName: 'Ort', locColMethod: 'Methode', locColLevel: 'Level', locColChance: 'Chance',
    weakness4: '×4 stark schwach', weakness2: '×2 schwach',
    resist2: '×½ resistent', resist4: '×¼ sehr resistent', immune: '×0 immun',
    catPhysical: 'Phys.', catSpecial: 'Spez.', catStatus: 'Status',
    chooseVersion: 'Version wählen…', chooseGame: 'Spiel wählen…',
    gameLabel: 'Spiel', gameHint: 'gilt für Entwicklung, Attacken und Fundorte',
    evoFor: 'Bedingungen in', evoOr: 'oder', evoFrom: 'erst ab {g}', evoNotInGame: 'in diesem Spiel nicht möglich',
    loadError: 'Dieses Pokémon konnte nicht geladen werden.', retry: 'Nochmal versuchen',
    locLoadError: 'Fundorte konnten nicht geladen werden.',
    close: 'Schließen',
    locNotWild: 'nicht wild', locNoneIn: 'In {game} ist dieses Pokémon nicht in freier Wildbahn zu finden – z. B. nur durch Entwicklung, als Geschenk oder per Tausch. Andere Spiele kannst du oben auswählen.',
    locOnlyIn: 'Nur in', bulbaAll: 'Alle Fundorte auf Bulbapedia →', bulbaIncomplete: 'Daten können unvollständig sein',
  },
  en: {
    title: 'Pokédex', subtitle: 'Complete information about every Pokémon',
    searchPlaceholder: 'Search Pokémon...',
    sectionIdentity: 'Pokémon', sectionStats: 'Base Stats',
    sectionEffectiveness: 'Type Effectiveness', sectionAbilities: 'Abilities',
    sectionEvolution: 'Evolution', sectionForms: 'Forms',
    sectionMoves: 'Moves', sectionLocations: 'Locations', sectionDetails: 'Species Data',
    modalTitle: 'Select Pokémon', modalSearch: 'Search...',
    'nav.home':'Home','nav.run':'Run','nav.team':'Team','nav.duo':'Duo',
    'nav.trio':'Trio','nav.catchrate':'Catch Rate','nav.damage':'Damage',
    'nav.types':'Types','nav.info':'Dex','nav.map':'Map',
    loading: 'Loading…', noData: 'No data available.',
    noMoves: 'No moves found for this version.',
    noLocations: 'No locations are stored in the database (PokéAPI) for this Pokémon. This doesn\'t mean there aren\'t any — the data is simply incomplete.',
    noEvolution: 'This Pokémon does not evolve.',
    hiddenAbility: 'Hidden Ability',
    shiny: '✦ Shiny',
    bst: 'Total', genLabel: 'Gen',
    height: 'Height', weight: 'Weight', catchRate: 'Catch Rate', friendship: 'Base FSW',
    genderMale: '♂\uFE0E Male', genderFemale: '♀\uFE0E Female', genderless: 'Genderless',
    eggGroups: 'Egg Groups', hatchSteps: 'Steps (Hatch)', growthRate: 'Growth Rate',
    baseExp: 'Base EXP',
    methodLevelUp: 'Level-Up', methodMachine: 'TM/HM', methodEgg: 'Egg', methodTutor: 'Tutor',
    colLevel: 'Lv.', colName: 'Name', colType: 'Type', colCat: 'Cat.',
    colPower: 'Power', colAcc: 'Acc.', colPP: 'PP',
    locColName: 'Location', locColMethod: 'Method', locColLevel: 'Level', locColChance: 'Chance',
    weakness4: '×4 very weak', weakness2: '×2 weak',
    resist2: '×½ resistant', resist4: '×¼ very resistant', immune: '×0 immune',
    catPhysical: 'Phys.', catSpecial: 'Spec.', catStatus: 'Status',
    chooseVersion: 'Choose version…', chooseGame: 'Choose game…',
    gameLabel: 'Game', gameHint: 'applies to evolution, moves and locations',
    evoFor: 'Conditions in', evoOr: 'or', evoFrom: 'from {g}', evoNotInGame: 'not possible in this game',
    loadError: 'This Pokémon could not be loaded.', retry: 'Try again',
    locLoadError: 'Locations could not be loaded.',
    close: 'Close',
    locNotWild: 'not wild', locNoneIn: 'In {game} this Pokémon can\'t be found in the wild – e.g. only by evolving, as a gift or by trading. Pick another game above.',
    locOnlyIn: 'Only in', bulbaAll: 'All locations on Bulbapedia →', bulbaIncomplete: 'Data may be incomplete',
  },
};

window.LANG = I18N[localStorage.getItem(LANG_KEY)] ? localStorage.getItem(LANG_KEY) : 'de';
function t(k) { return I18N[window.LANG]?.[k] || I18N.de[k] || k; }

// ── Constants ─────────────────────────────────────────────────────────────────
const ALL_TYPES = ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];

const TYPE_LABELS_DE = { normal:'Normal',fire:'Feuer',water:'Wasser',electric:'Elektro',grass:'Pflanze',ice:'Eis',fighting:'Kampf',poison:'Gift',ground:'Boden',flying:'Flug',psychic:'Psycho',bug:'Käfer',rock:'Gestein',ghost:'Geist',dragon:'Drache',dark:'Unlicht',steel:'Stahl',fairy:'Fee' };
const TYPE_LABELS_EN = { normal:'Normal',fire:'Fire',water:'Water',electric:'Electric',grass:'Grass',ice:'Ice',fighting:'Fighting',poison:'Poison',ground:'Ground',flying:'Flying',psychic:'Psychic',bug:'Bug',rock:'Rock',ghost:'Ghost',dragon:'Dragon',dark:'Dark',steel:'Steel',fairy:'Fairy' };
function typeLabel(t) { return (window.LANG === 'en' ? TYPE_LABELS_EN : TYPE_LABELS_DE)[t] || t; }

const TYPE_COLORS = { normal:'#bbbbaa',fire:'#ff421c',water:'#2c9be3',electric:'#ffdc00',grass:'#62bc5a',ice:'#74cfc0',fighting:'#bb5544',poison:'#9553cd',ground:'#a67439',flying:'#96caff',psychic:'#ff6380',bug:'#92c12a',rock:'#bbaa66',ghost:'#6e4370',dragon:'#5670be',dark:'#4e4545',steel:'#aaaabb',fairy:'#ec8fe6' };

// Gen 6+ type chart: TYPE_CHART[attacking][defending]
const TYPE_CHART = {
  normal:   {rock:0.5,ghost:0,steel:0.5},
  fire:     {fire:0.5,water:0.5,grass:2,ice:2,bug:2,rock:0.5,dragon:0.5,steel:2},
  water:    {fire:2,water:0.5,grass:0.5,ground:2,rock:2,dragon:0.5},
  electric: {water:2,electric:0.5,grass:0.5,ground:0,flying:2,dragon:0.5},
  grass:    {fire:0.5,water:2,grass:0.5,poison:0.5,ground:2,flying:0.5,bug:0.5,rock:2,dragon:0.5,steel:0.5},
  ice:      {fire:0.5,water:0.5,grass:2,ice:0.5,ground:2,flying:2,dragon:2,steel:0.5},
  fighting: {normal:2,ice:2,poison:0.5,flying:0.5,psychic:0.5,bug:0.5,rock:2,ghost:0,dark:2,steel:2,fairy:0.5},
  poison:   {grass:2,poison:0.5,ground:0.5,rock:0.5,ghost:0.5,steel:0,fairy:2},
  ground:   {fire:2,electric:2,grass:0.5,poison:2,flying:0,bug:0.5,rock:2,steel:2},
  flying:   {electric:0.5,grass:2,fighting:2,bug:2,rock:0.5,steel:0.5},
  psychic:  {fighting:2,poison:2,psychic:0.5,dark:0,steel:0.5},
  bug:      {fire:0.5,grass:2,fighting:0.5,poison:0.5,flying:0.5,psychic:2,ghost:0.5,dark:2,steel:0.5,fairy:0.5},
  rock:     {fire:2,ice:2,fighting:0.5,ground:0.5,flying:2,bug:2,steel:0.5},
  ghost:    {normal:0,psychic:2,ghost:2,dark:0.5},
  dragon:   {dragon:2,steel:0.5,fairy:0},
  dark:     {fighting:0.5,psychic:2,ghost:2,dark:0.5,fairy:0.5},
  steel:    {fire:0.5,water:0.5,electric:0.5,ice:2,rock:2,steel:0.5,fairy:2},
  fairy:    {fire:0.5,fighting:2,poison:0.5,dragon:2,dark:2,steel:0.5},
};

// Alle Editionen, neueste zuerst. Die Reihenfolge ist wichtig: Sie entscheidet, welche alten Attackenwerte
// (past_values) und welche Entwicklungs-Methode in einem Spiel gelten. Die Namen müssen exakt den PokeAPI-Namen entsprechen.
const VERSION_GROUP_LABELS = {
  'champions':                            'Pokémon Champions (Gen 9)',
  'mega-dimension':                       'Legenden: Z-A – Mega Dimension (Gen 9)',
  'legends-za':                           'Legenden: Z-A (Gen 9)',
  'the-indigo-disk':                      'Karmesin / Purpur – Die Indigoblaue Scheibe (Gen 9)',
  'the-teal-mask':                        'Karmesin / Purpur – Die Türkisgrüne Maske (Gen 9)',
  'scarlet-violet':                       'Karmesin / Purpur (Gen 9)',
  'legends-arceus':                       'Legenden: Arceus (Gen 8)',
  'brilliant-diamond-shining-pearl':      'Str. Diamant / L. Perle (Gen 8)',
  'the-crown-tundra':                     'Schwert / Schild – Die Schneelande der Krone (Gen 8)',
  'the-isle-of-armor':                    'Schwert / Schild – Die Insel der Rüstung (Gen 8)',
  'sword-shield':                         'Schwert / Schild (Gen 8)',
  'lets-go-pikachu-lets-go-eevee':        "Let's Go (Gen 7)",
  'ultra-sun-ultra-moon':                 'Ultrasonne / Ultramond (Gen 7)',
  'sun-moon':                             'Sonne / Mond (Gen 7)',
  'omega-ruby-alpha-sapphire':            'OmegaRot / AlphaSaphir (Gen 6)',
  'x-y':                                  'X / Y (Gen 6)',
  'black-2-white-2':                      'Schwarz 2 / Weiß 2 (Gen 5)',
  'black-white':                          'Schwarz / Weiß (Gen 5)',
  'heartgold-soulsilver':                 'HeartGold / SoulSilver (Gen 4)',
  'platinum':                             'Platin (Gen 4)',
  'diamond-pearl':                        'Diamant / Perl (Gen 4)',
  'xd':                                   'Pokémon XD (Gen 3)',
  'emerald':                              'Smaragd (Gen 3)',
  'firered-leafgreen':                    'Feuerrot / Blattgrün (Gen 3)',
  'colosseum':                            'Pokémon Colosseum (Gen 3)',
  'ruby-sapphire':                        'Rubin / Saphir (Gen 3)',
  'crystal':                              'Kristall (Gen 2)',
  'gold-silver':                          'Gold / Silber (Gen 2)',
  'yellow':                               'Gelb (Gen 1)',
  'red-blue':                             'Rot / Blau (Gen 1)',
};
const VERSION_GROUP_LABELS_EN = {
  'champions':                            'Pokémon Champions (Gen 9)',
  'mega-dimension':                       'Legends: Z-A – Mega Dimension (Gen 9)',
  'legends-za':                           'Legends: Z-A (Gen 9)',
  'the-indigo-disk':                      'Scarlet / Violet – The Indigo Disk (Gen 9)',
  'the-teal-mask':                        'Scarlet / Violet – The Teal Mask (Gen 9)',
  'scarlet-violet':                       'Scarlet / Violet (Gen 9)',
  'legends-arceus':                       'Legends: Arceus (Gen 8)',
  'brilliant-diamond-shining-pearl':      'B. Diamond / S. Pearl (Gen 8)',
  'the-crown-tundra':                     'Sword / Shield – The Crown Tundra (Gen 8)',
  'the-isle-of-armor':                    'Sword / Shield – The Isle of Armor (Gen 8)',
  'sword-shield':                         'Sword / Shield (Gen 8)',
  'lets-go-pikachu-lets-go-eevee':        "Let's Go (Gen 7)",
  'ultra-sun-ultra-moon':                 'Ultra Sun / Ultra Moon (Gen 7)',
  'sun-moon':                             'Sun / Moon (Gen 7)',
  'omega-ruby-alpha-sapphire':            'Omega Ruby / Alpha Sapphire (Gen 6)',
  'x-y':                                  'X / Y (Gen 6)',
  'black-2-white-2':                      'Black 2 / White 2 (Gen 5)',
  'black-white':                          'Black / White (Gen 5)',
  'heartgold-soulsilver':                 'HeartGold / SoulSilver (Gen 4)',
  'platinum':                             'Platinum (Gen 4)',
  'diamond-pearl':                        'Diamond / Pearl (Gen 4)',
  'xd':                                   'Pokémon XD (Gen 3)',
  'emerald':                              'Emerald (Gen 3)',
  'firered-leafgreen':                    'FireRed / LeafGreen (Gen 3)',
  'colosseum':                            'Pokémon Colosseum (Gen 3)',
  'ruby-sapphire':                        'Ruby / Sapphire (Gen 3)',
  'crystal':                              'Crystal (Gen 2)',
  'gold-silver':                          'Gold / Silver (Gen 2)',
  'yellow':                               'Yellow (Gen 1)',
  'red-blue':                             'Red / Blue (Gen 1)',
};
const VERSION_GROUP_ORDER = Object.keys(VERSION_GROUP_LABELS);
const vgLabel = vg => (window.LANG === 'en' ? VERSION_GROUP_LABELS_EN : VERSION_GROUP_LABELS)[vg] || vg;
const vgShortLabel = vg => vgLabel(vg).replace(/ \(Gen \d\)$/, '');

// Region(en) je Edition – eine Entwicklung „an einem Ort" gilt nur in Spielen dieser Region
const VG_REGIONS = {
  'red-blue':['kanto'], 'yellow':['kanto'], 'gold-silver':['johto','kanto'], 'crystal':['johto','kanto'],
  'ruby-sapphire':['hoenn'], 'colosseum':['orre'], 'firered-leafgreen':['kanto'], 'emerald':['hoenn'], 'xd':['orre'],
  'diamond-pearl':['sinnoh'], 'platinum':['sinnoh'], 'heartgold-soulsilver':['johto','kanto'],
  'black-white':['unova'], 'black-2-white-2':['unova'], 'x-y':['kalos'], 'omega-ruby-alpha-sapphire':['hoenn'],
  'sun-moon':['alola'], 'ultra-sun-ultra-moon':['alola'], 'lets-go-pikachu-lets-go-eevee':['kanto'],
  'sword-shield':['galar'], 'the-isle-of-armor':['galar'], 'the-crown-tundra':['galar'],
  'brilliant-diamond-shining-pearl':['sinnoh'], 'legends-arceus':['hisui'],
  'scarlet-violet':['paldea','kitakami','blueberry'], 'the-teal-mask':['paldea','kitakami','blueberry'],
  'the-indigo-disk':['paldea','kitakami','blueberry'], 'legends-za':['kalos'], 'mega-dimension':['kalos'], 'champions':[],
};

// Spiele (für die Fundorte) je Edition
const VG_VERSIONS = {
  'red-blue':['red','blue'], 'yellow':['yellow'], 'gold-silver':['gold','silver'], 'crystal':['crystal'],
  'ruby-sapphire':['ruby','sapphire'], 'emerald':['emerald'], 'firered-leafgreen':['firered','leafgreen'],
  'diamond-pearl':['diamond','pearl'], 'platinum':['platinum'], 'heartgold-soulsilver':['heartgold','soulsilver'],
  'black-white':['black','white'], 'black-2-white-2':['black-2','white-2'], 'x-y':['x','y'],
  'omega-ruby-alpha-sapphire':['omega-ruby','alpha-sapphire'], 'sun-moon':['sun','moon'],
  'ultra-sun-ultra-moon':['ultra-sun','ultra-moon'], 'lets-go-pikachu-lets-go-eevee':['lets-go-pikachu','lets-go-eevee'],
  'sword-shield':['sword','shield'], 'the-isle-of-armor':['the-isle-of-armor-sword','the-isle-of-armor-shield'],
  'the-crown-tundra':['the-crown-tundra-sword','the-crown-tundra-shield'],
  'brilliant-diamond-shining-pearl':['brilliant-diamond','shining-pearl'], 'legends-arceus':['legends-arceus'],
  'scarlet-violet':['scarlet','violet'],
};

const GAME_VERSION_LABELS = {
  scarlet:'Karmesin',violet:'Purpur',sword:'Schwert',shield:'Schild',
  'brilliant-diamond':'Str. Diamant','shining-pearl':'L. Perle',
  'legends-arceus':'Arceus',
  'the-isle-of-armor-sword':'Schwert (Insel der Rüstung)','the-isle-of-armor-shield':'Schild (Insel der Rüstung)',
  'the-crown-tundra-sword':'Schwert (Schneelande der Krone)','the-crown-tundra-shield':'Schild (Schneelande der Krone)',
  'ultra-sun':'Ultrasonne','ultra-moon':'Ultramond',sun:'Sonne',moon:'Mond',
  'lets-go-pikachu':"Let's Go P.",'lets-go-eevee':"Let's Go E.",
  'omega-ruby':'OmegaRot','alpha-sapphire':'AlphaSaphir',x:'X',y:'Y',
  'black-2':'Schwarz 2','white-2':'Weiß 2',black:'Schwarz',white:'Weiß',
  heartgold:'HeartGold',soulsilver:'SoulSilver',platinum:'Platin',diamond:'Diamant',pearl:'Perl',
  emerald:'Smaragd',firered:'Feuerrot',leafgreen:'Blattgrün',ruby:'Rubin',sapphire:'Saphir',
  crystal:'Kristall',gold:'Gold',silver:'Silber',yellow:'Gelb',red:'Rot',blue:'Blau',
};
const GAME_VERSION_LABELS_EN = {
  scarlet:'Scarlet',violet:'Violet',sword:'Sword',shield:'Shield',
  'brilliant-diamond':'B. Diamond','shining-pearl':'S. Pearl',
  'legends-arceus':'Arceus',
  'the-isle-of-armor-sword':'Sword (Isle of Armor)','the-isle-of-armor-shield':'Shield (Isle of Armor)',
  'the-crown-tundra-sword':'Sword (Crown Tundra)','the-crown-tundra-shield':'Shield (Crown Tundra)',
  'ultra-sun':'Ultra Sun','ultra-moon':'Ultra Moon',sun:'Sun',moon:'Moon',
  'lets-go-pikachu':"Let's Go P.",'lets-go-eevee':"Let's Go E.",
  'omega-ruby':'Omega Ruby','alpha-sapphire':'Alpha Sapphire',x:'X',y:'Y',
  'black-2':'Black 2','white-2':'White 2',black:'Black',white:'White',
  heartgold:'HeartGold',soulsilver:'SoulSilver',platinum:'Platinum',diamond:'Diamond',pearl:'Pearl',
  emerald:'Emerald',firered:'FireRed',leafgreen:'LeafGreen',ruby:'Ruby',sapphire:'Sapphire',
  crystal:'Crystal',gold:'Gold',silver:'Silver',yellow:'Yellow',red:'Red',blue:'Blue',
};
const gameLabel = g => (window.LANG === 'en' ? GAME_VERSION_LABELS_EN : GAME_VERSION_LABELS)[g];

const GAME_CLUSTERS = [
  { label: 'Rot / Blau / Gelb',                games: ['red','blue','yellow'] },
  { label: 'Gold / Silber / Kristall',          games: ['gold','silver','crystal'] },
  { label: 'Rubin / Saphir',                    games: ['ruby','sapphire'] },
  { label: 'Smaragd',                           games: ['emerald'] },
  { label: 'Feuerrot / Blattgrün',              games: ['firered','leafgreen'] },
  { label: 'Diamant / Perl',                    games: ['diamond','pearl'] },
  { label: 'Platin',                            games: ['platinum'] },
  { label: 'HeartGold / SoulSilver',            games: ['heartgold','soulsilver'] },
  { label: 'Schwarz / Weiß',                    games: ['black','white'] },
  { label: 'Schwarz 2 / Weiß 2',               games: ['black-2','white-2'] },
  { label: 'X / Y',                             games: ['x','y'] },
  { label: 'OmegaRot / AlphaSaphir',            games: ['omega-ruby','alpha-sapphire'] },
  { label: 'Sonne / Mond',                      games: ['sun','moon'] },
  { label: 'Ultrasonne / Ultramond',            games: ['ultra-sun','ultra-moon'] },
  { label: "Let's Go Pikachu / Let's Go Evoli", games: ['lets-go-pikachu','lets-go-eevee'] },
  { label: 'Schwert / Schild',                  games: ['sword','shield'] },
  { label: 'Insel der Rüstung',                 games: ['the-isle-of-armor-sword','the-isle-of-armor-shield'] },
  { label: 'Schneelande der Krone',             games: ['the-crown-tundra-sword','the-crown-tundra-shield'] },
  { label: 'Strahlender Diamant / Leuchtende Perle', games: ['brilliant-diamond','shining-pearl'] },
  { label: 'Legenden: Arceus',                  games: ['legends-arceus'] },
  { label: 'Karmesin / Purpur',                 games: ['scarlet','violet'] },
];

const ENCOUNTER_METHOD_LABELS_DE = {
  walk:'Gras', surf:'Surfen', 'old-rod':'Angel', 'good-rod':'Profiangel', 'super-rod':'Superangel', 'rock-smash':'Zertrümmerer',
  headbutt:'Kopfnuss', 'headbutt-low':'Kopfnuss', 'headbutt-normal':'Kopfnuss', 'headbutt-high':'Kopfnuss',
  gift:'Geschenk', 'gift-egg':'Ei (Geschenk)', 'only-one':'Einmalig', 'tall-grass':'Hohes Gras', 'dark-grass':'Dunkles Gras',
  cave:'Höhle', 'rough-terrain':'Gelände', roughterrain:'Gelände', 'grass-spots':'Raschelndes Gras', 'cave-spots':'Staubwolke',
  'bridge-spots':'Schatten (Brücke)', 'super-rod-spots':'Blubbernde Stelle (Superangel)', 'surf-spots':'Blubbernde Stelle (Surfen)',
  'yellow-flowers':'Gelbe Blumen', 'purple-flowers':'Lila Blumen', 'red-flowers':'Rote Blumen', 'seaweed':'Seegras (Taucher)',
  'npc-trade':'Tausch', 'squirt-bottle':'Schiggykanne', 'wailmer-pail':'Wailmerkanne', 'pokeflute':'Pokéflöte',
  'devon-scope':'Devon-Scope', 'island-scan':'Inselscan', 'sos':'SOS-Kampf', 'sos-encounter':'SOS-Kampf',
  'berry-piles':'Beerenhaufen', 'roaming-grass':'Umherstreifend', 'roaming-water':'Umherstreifend (Wasser)',
  overworld:'Oberwelt', 'overworld-water':'Oberwelt (Wasser)', 'overworld-flying':'Oberwelt (fliegend)', wanderer:'Wanderer',
  'max-raid':'Dyna-Raid', 'symbol-encounter':'Oberwelt', 'random-encounter':'Zufallsbegegnung', 'fishing':'Angeln',
  'swarm':'Schwarm', 'pokeradar':'Pokéradar', 'honey-tree':'Honigbaum', 'great-marsh':'Großmoor',
};
const ENCOUNTER_METHOD_LABELS_EN = {
  walk:'Grass', surf:'Surf', 'old-rod':'Old Rod', 'good-rod':'Good Rod', 'super-rod':'Super Rod', 'rock-smash':'Rock Smash',
  headbutt:'Headbutt', 'headbutt-low':'Headbutt', 'headbutt-normal':'Headbutt', 'headbutt-high':'Headbutt',
  gift:'Gift', 'gift-egg':'Gift egg', 'only-one':'One-time', 'tall-grass':'Tall Grass', 'dark-grass':'Dark Grass',
  cave:'Cave', 'rough-terrain':'Rough Terrain', roughterrain:'Rough Terrain', 'grass-spots':'Rustling grass', 'cave-spots':'Dust cloud',
  'bridge-spots':'Shadow (bridge)', 'super-rod-spots':'Rippling water (Super Rod)', 'surf-spots':'Rippling water (Surf)',
  'yellow-flowers':'Yellow flowers', 'purple-flowers':'Purple flowers', 'red-flowers':'Red flowers', 'seaweed':'Seaweed (Dive)',
  'npc-trade':'Trade', 'squirt-bottle':'Squirt Bottle', 'wailmer-pail':'Wailmer Pail', 'pokeflute':'Poké Flute',
  'devon-scope':'Devon Scope', 'island-scan':'Island Scan', 'sos':'SOS battle', 'sos-encounter':'SOS battle',
  'berry-piles':'Berry piles', 'roaming-grass':'Roaming', 'roaming-water':'Roaming (water)',
  overworld:'Overworld', 'overworld-water':'Overworld (water)', 'overworld-flying':'Overworld (flying)', wanderer:'Wanderer',
  'max-raid':'Max Raid', 'symbol-encounter':'Overworld', 'random-encounter':'Random encounter', 'fishing':'Fishing',
  'swarm':'Swarm', 'pokeradar':'Poké Radar', 'honey-tree':'Honey tree', 'great-marsh':'Great Marsh',
};
const prettySlug = s => String(s || '').split('-').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
function encounterMethodLabel(m) { return (window.LANG === 'en' ? ENCOUNTER_METHOD_LABELS_EN : ENCOUNTER_METHOD_LABELS_DE)[m] || prettySlug(m); }

// Hinweis: Die Ei-Gruppe „Feld" heißt in der PokeAPI „ground"
const EGG_GROUP_LABELS_DE = { ground:'Feld', monster:'Ungeheuer',water1:'Wasser 1',water2:'Wasser 2',water3:'Wasser 3',bug:'Käfer',flying:'Flug',field:'Feld',fairy:'Fee',plant:'Pflanze',humanshape:'Humanoid',mineral:'Mineral',indeterminate:'Chaos',ditto:'Ditto',dragon:'Drache','no-eggs':'Kein Ei' };
const EGG_GROUP_LABELS_EN = { ground:'Field', monster:'Monster',water1:'Water 1',water2:'Water 2',water3:'Water 3',bug:'Bug',flying:'Flying',field:'Field',fairy:'Fairy',plant:'Plant',humanshape:'Human-like',mineral:'Mineral',indeterminate:'Amorphous',ditto:'Ditto',dragon:'Dragon','no-eggs':'No Eggs' };
function eggGroupLabel(g) { return (window.LANG === 'en' ? EGG_GROUP_LABELS_EN : EGG_GROUP_LABELS_DE)[g] || g; }

const GROWTH_RATE_LABELS_DE = { slow:'Langsam','medium-slow':'Mittel-Langsam',medium:'Mittel',fast:'Schnell','medium-fast':'Mittel-Schnell','slow-then-very-fast':'Unregelmäßig',fluctuating:'Unbeständig',erratic:'Sprunghaft' };
const GROWTH_RATE_LABELS_EN = { slow:'Slow','medium-slow':'Medium Slow',medium:'Medium',fast:'Fast','medium-fast':'Medium Fast','slow-then-very-fast':'Fluctuating',fluctuating:'Fluctuating',erratic:'Erratic' };
function growthRateLabel(g) { return (window.LANG === 'en' ? GROWTH_RATE_LABELS_EN : GROWTH_RATE_LABELS_DE)[g] || g; }

const STAT_META = [
  { key:'hp',             labelDE:'KP',           labelEN:'HP',         css:'#F87171' },
  { key:'attack',         labelDE:'Angriff',      labelEN:'Attack',     css:'#FB923C' },
  { key:'defense',        labelDE:'Verteidigung', labelEN:'Defense',    css:'#FBBF24' },
  { key:'special-attack', labelDE:'Sp. Angriff',  labelEN:'Sp. Atk',    css:'#60A5FA' },
  { key:'special-defense',labelDE:'Sp. Vert.',    labelEN:'Sp. Def',    css:'#818CF8' },
  { key:'speed',          labelDE:'Initiative',   labelEN:'Speed',      css:'#A78BFA' },
];

// ── Caches ─────────────────────────────────────────────────────────────────────
const cacheP = new Map(), cacheS = new Map(), cacheA = new Map(), cacheM = new Map(), cacheE = new Map(), cacheL = new Map(), cacheLA = new Map();

// ── API ────────────────────────────────────────────────────────────────────────
async function apiPokemon(idOrName) {
  const k = String(idOrName).toLowerCase();
  if (cacheP.has(k)) return cacheP.get(k);
  const r = await fetch(`${POKEAPI}/pokemon/${k}`);
  if (!r.ok) throw new Error('Not found');
  const d = await r.json();
  const out = {
    id: d.id, name: d.name,
    sprite: d.sprites.front_default,
    spriteShiny: d.sprites.front_shiny,
    types: d.types.map(t => t.type.name),
    abilities: d.abilities.map(a => ({ name: a.ability.name, isHidden: a.is_hidden, slot: a.slot })),
    stats: d.stats.map(s => ({ name: s.stat.name, value: s.base_stat })),
    height: d.height, weight: d.weight,
    baseExp: d.base_experience,
    moves: d.moves,
    speciesUrl: d.species?.url ?? null,
  };
  cacheP.set(k, out); cacheP.set(String(d.id), out);
  return out;
}

async function apiSpecies(idOrName) {
  const k = String(idOrName).toLowerCase();
  const lang = window.LANG;
  const ck = `${k}-${lang}`;
  if (cacheS.has(ck)) return cacheS.get(ck);
  const r = await fetch(`${POKEAPI}/pokemon-species/${k}`);
  if (!r.ok) throw new Error('Not found');
  const d = await r.json();
  const localName = d.names.find(n => n.language.name === lang) || d.names.find(n => n.language.name === 'en');
  const genera = d.genera?.find(g => g.language.name === lang) || d.genera?.find(g => g.language.name === 'en');
  const goodFlavors = (d.flavor_text_entries || []).filter(f => f.language.name === lang);
  const flavorFallback = !goodFlavors.length;
  const flavor = (goodFlavors[goodFlavors.length - 1] || d.flavor_text_entries?.find(f => f.language.name === 'en') || null);
  const out = {
    id: d.id, name: d.name,
    displayName: localName?.name ?? d.name,
    genera: genera?.genus ?? '',
    flavorText: flavor?.flavor_text?.replace(/[\n\f]/g, ' ') ?? '',
    flavorFallback,
    evolutionChainUrl: d.evolution_chain?.url ?? null,
    varieties: d.varieties ?? [],
    genderRate: d.gender_rate,
    captureRate: d.capture_rate,
    baseHappiness: d.base_happiness,
    eggGroups: d.egg_groups?.map(g => g.name) ?? [],
    hatchCounter: d.hatch_counter,
    growthRate: d.growth_rate?.name ?? '',
  };
  cacheS.set(ck, out); cacheS.set(`${String(d.id)}-${lang}`, out);
  return out;
}

async function apiAbility(name) {
  const lang = window.LANG;
  const ck = `${name}-${lang}`;
  if (cacheA.has(ck)) return cacheA.get(ck);
  try {
    const r = await fetch(`${POKEAPI}/ability/${name}`);
    if (!r.ok) throw new Error();
    const d = await r.json();
    const localName = d.names.find(n => n.language.name === lang) || d.names.find(n => n.language.name === 'en');
    const n = localName ? localName.name : name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    const effDE = d.effect_entries?.find(e => e.language.name === lang);
    const effEN = d.effect_entries?.find(e => e.language.name === 'en');
    const flavorDE = (d.flavor_text_entries || []).filter(f => f.language.name === lang).pop();
    const flavorEN = (d.flavor_text_entries || []).filter(f => f.language.name === 'en').pop();
    const descText = effDE?.short_effect || flavorDE?.flavor_text || effEN?.short_effect || flavorEN?.flavor_text || '';
    const descFallback = lang === 'de' && !effDE && !flavorDE && !!descText;
    const desc = descText.replace(/[\n\f]/g, ' ');
    const out = { name: n, description: desc, descFallback };
    cacheA.set(ck, out);
    return out;
  } catch { return { name: name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '), description: '' }; }
}

async function apiMove(name) {
  const lang = window.LANG;
  const ck = `${name}-${lang}`;
  if (cacheM.has(ck)) return cacheM.get(ck);
  try {
    const r = await fetch(`${POKEAPI}/move/${name}`);
    if (!r.ok) throw new Error();
    const d = await r.json();
    const localName = d.names.find(n => n.language.name === lang) || d.names.find(n => n.language.name === 'en');
    const n = localName ? localName.name : name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
    const goodF = (d.flavor_text_entries || []).filter(f => f.language.name === lang && (lang !== 'de' || !/nicht eingesetzt werden/i.test(f.flavor_text)));
    const goodFen = (d.flavor_text_entries || []).filter(f => f.language.name === 'en');
    const flav = (goodF[goodF.length - 1] || goodFen[goodFen.length - 1]);
    const eff = d.effect_entries?.find(e => e.language.name === lang) || d.effect_entries?.find(e => e.language.name === 'en');
    const desc = (flav?.flavor_text || eff?.short_effect || '').replace(/[\n\f]/g, ' ').replace(/\$effect_chance/g, d.effect_chance ?? '?');
    const out = { name: n, type: d.type?.name ?? null, power: d.power, accuracy: d.accuracy, pp: d.pp, category: d.damage_class?.name ?? null, description: desc, pastValues: d.past_values || [], flavorEntries: d.flavor_text_entries || [] };
    cacheM.set(ck, out);
    return out;
  } catch { return { name: name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' '), type: null, power: null, accuracy: null, pp: null, category: null, description: '' }; }
}

// Bis Gen 3 entscheidet der Typ, ob eine Attacke physisch oder speziell ist
const PHYSICAL_TYPES_OLD = new Set(['normal','fighting','flying','poison','ground','rock','bug','ghost','steel']);
function vgGeneration(vg) {
  for (const [g, s] of Object.entries(GEN_VG_RANGES)) if (s.has(vg)) return Number(g);
  return 9;
}

function getMoveStatsForVG(move, vg) {
  const base = { power: move.power, accuracy: move.accuracy, pp: move.pp, type: move.type, category: move.category };
  const vgIdx = VERSION_GROUP_ORDER.indexOf(vg);
  if (vgIdx < 0) return base;
  // past_values: Werte, die VOR dieser Edition galten. Je Feld zählt die erste Änderung nach dem gewählten Spiel
  // (Editionen, die wir nicht kennen, gelten als neuer als alle anderen).
  const later = (move.pastValues || [])
    .map(pv => ({ pv, i: VERSION_GROUP_ORDER.indexOf(pv.version_group?.name) }))
    .filter(x => x.i < vgIdx)
    .sort((a, b) => b.i - a.i);
  const pick = (get, current) => {
    for (const { pv } of later) { const v = get(pv); if (v != null) return v; }
    return current;
  };
  const type = pick(pv => pv.type?.name, move.type);
  const out = {
    power: pick(pv => pv.power, move.power),
    accuracy: pick(pv => pv.accuracy, move.accuracy),
    pp: pick(pv => pv.pp, move.pp),
    type,
    category: move.category,
  };
  if (move.category && move.category !== 'status' && vgGeneration(vg) <= 3) {
    out.category = PHYSICAL_TYPES_OLD.has(type) ? 'physical' : 'special';
  }
  return out;
}

function getMoveDescForVG(move, vg, lang) {
  const pool = (move.flavorEntries || []).filter(f => f.language?.name === lang);
  const en   = (move.flavorEntries || []).filter(f => f.language?.name === 'en');
  const src  = pool.length ? pool : en;
  if (!src.length) return move.description;
  const vgIdx = VERSION_GROUP_ORDER.indexOf(vg);
  if (vgIdx < 0) return src[src.length - 1]?.flavor_text?.replace(/[\n\f]/g, ' ') || move.description;
  // Find entries whose VG is same age or older (index >= vgIdx), pick most recent (smallest index)
  const ok = src.filter(f => { const i = VERSION_GROUP_ORDER.indexOf(f.version_group?.name); return i >= 0 && i >= vgIdx; })
               .sort((a, b) => VERSION_GROUP_ORDER.indexOf(a.version_group?.name) - VERSION_GROUP_ORDER.indexOf(b.version_group?.name));
  return (ok[0] || src[src.length - 1])?.flavor_text?.replace(/[\n\f]/g, ' ') || move.description;
}

async function showMoveDetail(rawName, rect) {
  const panel = document.getElementById('move-detail-panel');
  panel.style.display = '';
  document.getElementById('move-detail-name').textContent = '…';
  document.getElementById('move-detail-stats').innerHTML = '';
  document.getElementById('move-detail-desc').textContent = '';
  // Position: try right of row, else left, else center
  const pw = 328, vw = window.innerWidth, vh = window.innerHeight;
  let left = rect.right + 10;
  if (left + pw > vw - 8) left = rect.left - pw - 10;
  if (left < 8) left = Math.max(8, (vw - pw) / 2);
  panel.style.left = left + 'px';
  panel.style.top = Math.min(rect.top, vh - 280) + 'px';

  const move = await apiMove(rawName);
  const vg = currentVersionGroup;
  const lang = window.LANG;
  const stats = getMoveStatsForVG(move, vg);
  const desc  = getMoveDescForVG(move, vg, lang);
  const typeColor = TYPE_COLORS[stats.type] || '#888';
  const cat = stats.category;
  const catClass = cat === 'physical' ? 'move-cat-physical' : cat === 'special' ? 'move-cat-special' : 'move-cat-status';
  const catLabel = cat === 'physical' ? t('catPhysical') : cat === 'special' ? t('catSpecial') : cat === 'status' ? t('catStatus') : '';

  document.getElementById('move-detail-name').textContent = move.name;
  document.getElementById('move-detail-type').innerHTML = stats.type ? `<span class="move-type-badge" style="background:${typeColor}">${escHtml(typeLabel(stats.type))}</span>` : '';
  document.getElementById('move-detail-cat').innerHTML = cat ? `<span class="move-cat ${catClass}">${escHtml(catLabel)}</span>` : '';
  document.getElementById('move-detail-stats').innerHTML = `
    <div class="move-detail-stat"><div class="move-detail-stat-label">${escHtml(t('colPower'))}</div><div class="move-detail-stat-value">${stats.power ?? '—'}</div></div>
    <div class="move-detail-stat"><div class="move-detail-stat-label">${escHtml(t('colAcc'))}</div><div class="move-detail-stat-value">${stats.accuracy != null ? stats.accuracy + '%' : '—'}</div></div>
    <div class="move-detail-stat"><div class="move-detail-stat-label">${escHtml(t('colPP'))}</div><div class="move-detail-stat-value">${stats.pp ?? '—'}</div></div>`;
  document.getElementById('move-detail-desc').textContent = desc || '—';
}

async function apiEvolution(url) {
  if (cacheE.has(url)) return cacheE.get(url);
  const r = await fetch(url);
  if (!r.ok) throw new Error();
  const d = await r.json();
  cacheE.set(url, d.chain);
  return d.chain;
}

async function apiLocations(name) {
  if (cacheL.has(name)) return cacheL.get(name);
  const r = await fetch(`${POKEAPI}/pokemon/${name}/encounters`);
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const d = await r.json();
  cacheL.set(name, d);
  return d;
}

// Name in der aktuellen Sprache aus einer PokeAPI-names-Liste
const pickName = (names, lang = window.LANG) =>
  names?.find(n => n.language.name === lang)?.name || names?.find(n => n.language.name === 'en')?.name || null;

// Orte (für Entwicklungen und Fundorte): Namen in beiden Sprachen + Region, damit kein Neuladen beim Sprachwechsel nötig ist
const cacheLoc = new Map(), cacheItem = new Map();
function apiLocation(slug) {
  if (!cacheLoc.has(slug)) {
    cacheLoc.set(slug, fetch(`${POKEAPI}/location/${slug}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && { names: d.names || [], region: d.region?.name || null })
      .catch(() => null));
  }
  return cacheLoc.get(slug);
}
function apiItem(slug) {
  if (!cacheItem.has(slug)) {
    cacheItem.set(slug, fetch(`${POKEAPI}/item/${slug}`)
      .then(r => (r.ok ? r.json() : null))
      .then(d => d && { names: d.names || [] })
      .catch(() => null));
  }
  return cacheItem.get(slug);
}

// Bereichs-Zusatz aus dem Namen, z. B. „b1f" → „B1F", „outside" → „außen"
const AREA_WORDS_DE = {
  outside: 'außen', inside: 'innen', north: 'Nord', south: 'Süd', east: 'Ost', west: 'West', center: 'Mitte',
  entrance: 'Eingang', exit: 'Ausgang', room: 'Raum', back: 'hinten', front: 'vorne', upper: 'oben', lower: 'unten',
  floor: 'Etage', basement: 'Keller', cave: 'Höhle', summit: 'Gipfel', peak: 'Gipfel', interior: 'innen', exterior: 'außen',
  'water': 'Wasser', 'grass': 'Gras', 'sea': 'Meer', 'shore': 'Ufer', 'island': 'Insel', 'side': 'Seite', 'part': 'Teil',
};
function areaSuffix(rest) {
  return rest.split('-').filter(Boolean).map(w => {
    if (/^b?\d+f$/i.test(w)) return w.toUpperCase();
    if (window.LANG !== 'en' && AREA_WORDS_DE[w.toLowerCase()]) return AREA_WORDS_DE[w.toLowerCase()];
    return w[0].toUpperCase() + w.slice(1);
  }).join(' ');
}

// Fundort-Bereich: viele Bereiche haben keinen deutschen Namen – dann den Namen des Ortes nehmen
// und den Bereich (z. B. „1F", „Nord") anhängen.
async function apiLocationAreaName(slug) {
  const key = `${slug}-${window.LANG}`;
  if (cacheLA.has(key)) return cacheLA.get(key);
  let name = null;
  try {
    const r = await fetch(`${POKEAPI}/location-area/${slug}`);
    if (r.ok) {
      const d = await r.json();
      const own = d.names?.find(n => n.language.name === window.LANG)?.name;
      if (own) name = own;
      else if (d.location?.name) {
        const loc = await apiLocation(d.location.name);
        const locName = loc && pickName(loc.names);
        const rest = slug.startsWith(d.location.name) ? slug.slice(d.location.name.length).replace(/^-/, '').replace(/^area$/, '') : '';
        if (locName) name = rest ? `${locName} (${areaSuffix(rest)})` : locName;
      }
      if (!name) name = pickName(d.names);
    }
  } catch { /* Fallback unten */ }
  cacheLA.set(key, name);
  return name;
}

// ── Gen list ───────────────────────────────────────────────────────────────────
const GEN_RANGES = { 1:{l:151,o:0},2:{l:100,o:151},3:{l:135,o:251},4:{l:107,o:386},5:{l:156,o:493},6:{l:72,o:649},7:{l:88,o:721},8:{l:96,o:809},9:{l:120,o:905} };
const genListCache = new Map();

async function fetchGenList(gen) {
  if (genListCache.has(gen)) return genListCache.get(gen);
  const {l,o} = GEN_RANGES[gen];
  const r = await fetch(`${POKEAPI}/pokemon?limit=${l}&offset=${o}`);
  const d = await r.json();
  const list = d.results.map((p, i) => {
    const m = p.url.match(/\/pokemon\/(\d+)\//);
    const id = m ? Number(m[1]) : o + i + 1;
    return { name: p.name, id, sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` };
  });
  genListCache.set(gen, list);
  return list;
}

// ── State ──────────────────────────────────────────────────────────────────────
let currentPokemon = null, currentSpecies = null;
let currentMoveMethod = 'level-up', currentVersionGroup = '';
let isShiny = false;
let modalGenList = [], modalCurrentGen = 1;
let allPokemonList = null;

const GEN_VG_RANGES = {
  1: new Set(['red-blue','yellow']),
  2: new Set(['gold-silver','crystal']),
  3: new Set(['ruby-sapphire','firered-leafgreen','emerald','colosseum','xd']),
  4: new Set(['diamond-pearl','platinum','heartgold-soulsilver']),
  5: new Set(['black-white','black-2-white-2']),
  6: new Set(['x-y','omega-ruby-alpha-sapphire']),
  7: new Set(['sun-moon','ultra-sun-ultra-moon','lets-go-pikachu-lets-go-eevee']),
  8: new Set(['sword-shield','the-isle-of-armor','the-crown-tundra','legends-arceus','brilliant-diamond-shining-pearl']),
  9: new Set(['scarlet-violet','the-teal-mask','the-indigo-disk','legends-za','mega-dimension','champions']),
};

function defaultVersionGroup(vgs, speciesId) {
  const gen = getGeneration(speciesId);
  const native = GEN_VG_RANGES[gen] || new Set();
  // Hauptspiele bevorzugen (nicht Colosseum/XD/Champions als Standard)
  const SIDE = new Set(['colosseum','xd','champions','mega-dimension']);
  for (const vg of vgs) { if (native.has(vg) && !SIDE.has(vg)) return vg; }
  for (const vg of vgs) { if (native.has(vg)) return vg; }
  return vgs.find(vg => !SIDE.has(vg)) || vgs[0] || '';
}

function closestVersionGroup(currentVG, vgs) {
  let curGen = 0;
  for (const [g, s] of Object.entries(GEN_VG_RANGES)) {
    if (s.has(currentVG)) { curGen = Number(g); break; }
  }
  if (!curGen) return null;
  let best = null, bestDist = Infinity;
  for (const vg of vgs) {
    for (const [g, s] of Object.entries(GEN_VG_RANGES)) {
      if (s.has(vg)) {
        const dist = Math.abs(Number(g) - curGen);
        if (dist < bestDist) { bestDist = dist; best = vg; }
        break;
      }
    }
  }
  return best;
}

const ITEM_NAMES_DE = {
  'fire-stone':'Feuerstein','water-stone':'Wasserstein','thunder-stone':'Donnerstein',
  'leaf-stone':'Blattstein','moon-stone':'Mondstein','sun-stone':'Sonnenstein',
  'shiny-stone':'Blankstein','dusk-stone':'Dunkelstein','dawn-stone':'Funkelstein',
  'ice-stone':'Eisstein','oval-stone':'Ovalstein','kings-rock':'Königsrock',
  'metal-coat':'Metallmantel','dragon-scale':'Drachenschuppe','upgrade':'Upgrade',
  'deep-sea-tooth':'Tiefseezahn','deep-sea-scale':'Tiefseestein',
  'prism-scale':'Prismenschuppe','dubious-disc':'Obskurer Datentr.',
  'protector':'Beschützer','electirizer':'Elektrisierer','magmarizer':'Magmarisierer',
  'reaper-cloth':'Sensentuch','razor-claw':'Schlitzerklaue','razor-fang':'Schlitzerfang',
  'sachet':'Duftsäckchen','whipped-dream':'Sahnetraum','peat-block':'Torfblock',
  'black-augurite':'Schwarzes Augit','linking-cord':'Verbindungskabel',
  'auspicious-armor':'Glücksrüstung','malicious-armor':'Unglücksrüstung',
  'scroll-of-waters':'Wasserrolle','scroll-of-darkness':'Dunkelrolle',
  'galarica-cuff':'Galarica-Armband','galarica-wreath':'Galarica-Kranz',
};
function itemLabel(name) {
  if (window.LANG === 'de' && ITEM_NAMES_DE[name]) return ITEM_NAMES_DE[name];
  return name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ');
}

function formatModalPokemonName(name) {
  return name
    .replace(/-average$/, '')
    .replace(/-shield$/, '')
    .replace(/-incarnate$/, '')
    .replace(/-ordinary$/, '')
    .replace(/-aria$/, '')
    .replace(/-50$/, '')
    .replace(/-red-flower$/, '')
    .replace(/-meadow$/, '')
    .replace(/-male$/, ' ♂\uFE0E')
    .replace(/-female$/, ' ♀\uFE0E')
    .split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('-');
}

async function ensureAllPokemonList() {
  if (allPokemonList) return;
  try {
    const r = await fetch(`${POKEAPI}/pokemon?limit=10000`);
    const d = await r.json();
    allPokemonList = d.results.map(p => {
      const m = p.url.match(/\/pokemon\/(\d+)\//);
      const id = m ? Number(m[1]) : null;
      return { name: p.name, id, sprite: id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` : '' };
    }).filter(p => p.id);
  } catch {}
}


// ── Helpers ───────────────────────────────────────────────────────────────────
function getGeneration(id) {
  if (id <= 151) return 1; if (id <= 251) return 2; if (id <= 386) return 3;
  if (id <= 493) return 4; if (id <= 649) return 5; if (id <= 721) return 6;
  if (id <= 809) return 7; if (id <= 905) return 8; return 9;
}

function statBarColor(v) {
  if (v < 50) return '#F87171'; if (v < 80) return '#FBBF24'; if (v < 100) return '#A3E635'; return '#34D399';
}

function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function typeBadge(type) {
  const color = TYPE_COLORS[type] || '#888';
  return `<span class="type-badge" style="background:${escHtml(color)}">${escHtml(typeLabel(type))}</span>`;
}

function calcEffectiveness(defTypes) {
  const result = {};
  ALL_TYPES.forEach(atk => {
    let m = 1;
    defTypes.forEach(def => { m *= (TYPE_CHART[atk]?.[def] ?? 1); });
    result[atk] = m;
  });
  return result;
}

function formatLocSlug(slug) {
  return slug
    .replace(/-area$/, '')
    .replace(/^(kanto|johto|hoenn|sinnoh|unova|kalos|alola|galar|paldea)-/i, '')
    .split('-')
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

function loadingHTML() { return `<div class="loading-row"><span class="loading-spinner"></span>${escHtml(t('loading'))}</div>`; }

// ── Evolution tree ────────────────────────────────────────────────────────────
function getEvoPaths(chain, path = []) {
  const spriteId = chain.species?.url?.match(/\/pokemon-species\/(\d+)\//)?.[1];
  const node = { name: chain.species?.name ?? '', id: spriteId ? Number(spriteId) : null, sprite: spriteId ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${spriteId}.png` : '', details: chain.evolution_details ?? [] };
  const current = [...path, node];
  if (!chain.evolves_to || chain.evolves_to.length === 0) return [current];
  return chain.evolves_to.flatMap(next => getEvoPaths(next, current));
}

// Editionen von alt nach neu – für „ab welchem Spiel gilt diese Entwicklungs-Methode?"
const VG_CHRONO = [...VERSION_GROUP_ORDER].reverse();
const vgRank = vg => { const i = VG_CHRONO.indexOf(vg); return i < 0 ? VG_CHRONO.length : i; };
const detailRank = d => (d.version_group?.name ? vgRank(d.version_group.name) : -1);

// Steine bzw. Felder, an denen eine Entwicklung „an einem Ort" passiert
const SPECIAL_PLACE = {
  leafeon:   { de: 'Moosfels',   en: 'Moss Rock' },
  glaceon:   { de: 'Eisfels',    en: 'Ice Rock' },
  magnezone: { de: 'Magnetfeld', en: 'magnetic field' },
  probopass: { de: 'Magnetfeld', en: 'magnetic field' },
  vikavolt:  { de: 'Magnetfeld', en: 'magnetic field' },
};

/*
 * Welche Entwicklungs-Methoden gelten im gewählten Spiel?
 * PokeAPI liefert je Methode die Edition, ab der sie gilt. Eine Methode „an einem Ort" gilt nur in Spielen der
 * passenden Region (Kraterberg in Diamant/Perl/Platin/Str. Diamant). Sonst zählt die neueste allgemeine Methode
 * bis zu diesem Spiel (z. B. Donnerstein ab Schwert/Schild).
 */
function evoDetailsForVG(details, vg, locRegion) {
  if (!details?.length) return { list: [], status: 'ok' };
  const placeOf = d => (d.location ? (locRegion(d.location.name) || '?') : (d.region?.name || null));
  const newestOf = list => { const top = Math.max(...list.map(detailRank)); return list.filter(d => detailRank(d) === top); };
  if (!vg) {
    const general = details.filter(d => !placeOf(d));
    return { list: general.length ? newestOf(general) : details, status: 'ok' };
  }
  const rank = vgRank(vg);
  const regions = VG_REGIONS[vg] || [];
  const upTo = details.filter(d => detailRank(d) <= rank);
  const local = upTo.filter(d => { const r = placeOf(d); return r && regions.includes(r); });
  if (local.length) return { list: local, status: 'ok' };
  const general = upTo.filter(d => !placeOf(d));
  if (general.length) return { list: newestOf(general), status: 'ok' };
  const earliest = details.reduce((a, d) => (detailRank(d) < detailRank(a) ? d : a), details[0]);
  return { list: [], status: detailRank(earliest) > rank ? 'later' : 'unavailable', firstVG: earliest.version_group?.name };
}

// Eine Entwicklungs-Methode als kurzer Text, z. B. „Lv. 25 · nachts" oder „Level-Up · Kraterberg (Magnetfeld)"
function formatEvoDetail(d, N, target) {
  const en = window.LANG === 'en';
  const L = (de, english) => (en ? english : de);
  const trig = d.trigger?.name;
  const item = s => N.item.get(s) || itemLabel(s);
  const move = s => N.move.get(s) || prettySlug(s);
  const spec = s => N.species.get(s) || prettySlug(s);
  const parts = [];

  if (d.min_level) parts.push(trig === 'in-battle-level-up' ? L(`Lv. ${d.min_level} im Kampf`, `Lv. ${d.min_level} in battle`) : `Lv. ${d.min_level}`);
  else if (trig === 'level-up') parts.push('Level-Up');
  if (trig === 'use-item' && d.item) parts.push(item(d.item.name));
  if (trig === 'trade') {
    if (d.held_item) parts.push(L(`Tausch mit ${item(d.held_item.name)}`, `Trade holding ${item(d.held_item.name)}`));
    else if (d.trade_species) parts.push(L(`Tausch gegen ${spec(d.trade_species.name)}`, `Trade for ${spec(d.trade_species.name)}`));
    else parts.push(L('Tausch', 'Trade'));
  } else if (d.held_item && trig !== 'spin') {
    parts.push(L(`trägt ${item(d.held_item.name)}`, `holding ${item(d.held_item.name)}`));
  }
  if (d.item && trig !== 'use-item') parts.push(item(d.item.name));
  if (d.min_happiness) parts.push(L(`Freundschaft ${d.min_happiness}+`, `Friendship ${d.min_happiness}+`));
  if (d.min_affection) parts.push(L(`Zuneigung ${d.min_affection}+ ♥\uFE0E`, `Affection ${d.min_affection}+ ♥\uFE0E`));
  if (d.min_beauty) parts.push(L(`Schönheit ${d.min_beauty}+`, `Beauty ${d.min_beauty}+`));
  if (d.known_move) parts.push(L(`kennt ${move(d.known_move.name)}`, `knows ${move(d.known_move.name)}`));
  if (d.known_move_type) parts.push(L(`kennt ${typeLabel(d.known_move_type.name)}-Attacke`, `knows a ${typeLabel(d.known_move_type.name)} move`));
  if (d.used_move) {
    const n = d.min_move_count || 20;
    const style = trig === 'agile-style-move' ? L(' im Tempo-Stil', ' in Agile Style') : trig === 'strong-style-move' ? L(' im Kraft-Stil', ' in Strong Style') : '';
    parts.push(L(`${move(d.used_move.name)} ${n}× einsetzen${style}`, `use ${move(d.used_move.name)} ${n}×${style}`));
  }
  if (d.party_species) parts.push(L(`${spec(d.party_species.name)} im Team`, `${spec(d.party_species.name)} in party`));
  if (d.party_type) parts.push(L(`${typeLabel(d.party_type.name)}-Pokémon im Team`, `${typeLabel(d.party_type.name)} Pokémon in party`));
  if (d.relative_physical_stats != null) {
    parts.push(d.relative_physical_stats > 0 ? L('Angr > Vert', 'Atk > Def') : d.relative_physical_stats < 0 ? L('Angr < Vert', 'Atk < Def') : L('Angr = Vert', 'Atk = Def'));
  }
  if (d.gender === 1) parts.push('♀\uFE0E');
  else if (d.gender === 2) parts.push('♂\uFE0E');
  if (d.time_of_day) parts.push({ day: L('tagsüber', 'daytime'), night: L('nachts', 'night'), dusk: L('abends', 'dusk') }[d.time_of_day] || d.time_of_day);
  if (d.needs_overworld_rain) parts.push(L('bei Regen', 'in rain'));
  if (d.turn_upside_down) parts.push(L('Konsole umdrehen', 'console upside down'));
  if (d.min_steps) parts.push(L(`${d.min_steps} Schritte mit „Los geht's"`, `${d.min_steps} steps with Let's Go`));
  if (d.min_damage_taken) {
    parts.push(trig === 'recoil-damage'
      ? L(`${d.min_damage_taken} Rückstoßschaden`, `${d.min_damage_taken} recoil damage`)
      : L(`${d.min_damage_taken}+ Schaden erlitten`, `took ${d.min_damage_taken}+ damage`));
  }
  if (d.needs_multiplayer) parts.push(L('mit anderem Spieler (Union-Zirkel)', 'with another player (Union Circle)'));
  if (d.allowed_natures) parts.push(L('Form je nach Wesen', 'form depends on nature'));
  if (d.location) {
    const place = SPECIAL_PLACE[target];
    parts.push(`${N.loc.get(d.location.name)?.name || prettySlug(d.location.name)}${place ? ` (${en ? place.en : place.de})` : ''}`);
  }
  const SPECIAL_TRIGGER = {
    shed: L('freier Teamplatz + Pokéball', 'free party slot + Poké Ball'),
    spin: L('Sahne-Item tragen und drehen', 'hold a Sweet and spin'),
    'tower-of-darkness': L('Turm des Unlichts', 'Tower of Darkness'),
    'tower-of-waters': L('Turm des Wassers', 'Tower of Waters'),
    'three-critical-hits': L('3 Volltreffer in einem Kampf', '3 critical hits in one battle'),
    'three-defeated-bisharp': L('3 Anführer-Gladiantri besiegen', 'defeat 3 Leader Bisharp'),
    'gimmighoul-coins': L('999 Gierspenst-Münzen', '999 Gimmighoul Coins'),
    other: L('besondere Bedingung', 'special condition'),
  };
  if (SPECIAL_TRIGGER[trig]) parts.push(SPECIAL_TRIGGER[trig]);
  const pct = d.condition_expression?.percentage_chance;
  if (pct != null && pct !== '' && Number(pct) < 100) parts.push(`${pct} %`);
  if (!parts.length) parts.push(prettySlug(trig || ''));
  return parts.join(' · ');
}

// Alle Methoden über alle Spiele – als Tooltip am Pfeil
function evoAllMethodsTitle(details, N, target) {
  const lines = [];
  [...details].sort((a, b) => detailRank(a) - detailRank(b)).forEach(d => {
    const line = `${d.version_group?.name ? vgShortLabel(d.version_group.name) : '?'}: ${formatEvoDetail(d, N, target)}`;
    if (!lines.includes(line)) lines.push(line);
  });
  return lines.join('\n');
}

// ── Render: Identity ──────────────────────────────────────────────────────────
function renderIdentity(p, s) {
  document.getElementById('identity-sprite').src = isShiny ? (p.spriteShiny || p.sprite) : p.sprite;
  document.getElementById('identity-sprite').className = 'identity-sprite' + (isShiny ? ' is-shiny' : '');
  document.getElementById('identity-name').textContent = s.displayName || p.name;
  document.getElementById('identity-name-en').textContent = s.displayName !== p.name ? `/ ${p.name.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('-')}` : '';
  // Formen haben eigene IDs (> 10000) – Nummer und Generation kommen von der Art
  document.getElementById('identity-id').textContent = `#${String(s.id).padStart(3, '0')}`;
  document.getElementById('identity-gen').textContent = `${t('genLabel')} ${getGeneration(s.id)}`;
  document.getElementById('identity-size').textContent = `${(p.height / 10).toFixed(1)}m · ${(p.weight / 10).toFixed(1)}kg`;
  document.getElementById('identity-genera').textContent = s.genera;
  document.getElementById('identity-types').innerHTML = p.types.map(typeBadge).join('');

  const qs = document.getElementById('identity-quick-stats');
  const genderText = s.genderRate === -1 ? t('genderless') : s.genderRate === 0 ? '100% ♂\uFE0E' : s.genderRate === 8 ? '100% ♀\uFE0E' : `${Math.round((8 - s.genderRate) / 8 * 100)}% ♂ · ${Math.round(s.genderRate / 8 * 100)}% ♀`;
  qs.innerHTML = [
    { label: t('catchRate'), value: s.captureRate },
    { label: t('friendship'), value: s.baseHappiness },
    { label: window.LANG === 'en' ? 'Gender' : 'Geschlecht', value: genderText },
    { label: t('baseExp'), value: p.baseExp ?? '—' },
  ].map(x => `<div class="quick-stat"><div class="quick-stat-label">${escHtml(x.label)}</div><div class="quick-stat-value">${escHtml(String(x.value ?? '—'))}</div></div>`).join('');

  const flavorEl = document.getElementById('identity-flavor');
  if (s.flavorText) {
    flavorEl.innerHTML = escHtml(s.flavorText) + (s.flavorFallback && window.LANG === 'de' ? ' <span style="opacity:0.45;font-size:0.78em;font-style:normal">[Kein deutscher Text verfügbar]</span>' : '');
    flavorEl.style.display = '';
  } else flavorEl.style.display = 'none';
}

// ── Render: Stats ─────────────────────────────────────────────────────────────
function renderStats(p) {
  const statsMap = Object.fromEntries(p.stats.map(s => [s.name, s.value]));
  let total = 0;
  const rows = STAT_META.map(m => {
    const v = statsMap[m.key] ?? 0;
    total += v;
    const pct = Math.min(100, Math.round(v / 255 * 100));
    const color = statBarColor(v);
    return `<div class="stat-row">
      <div class="stat-name">${escHtml(window.LANG === 'en' ? m.labelEN : m.labelDE)}</div>
      <div class="stat-bar-bg"><div class="stat-bar-fill" style="width:${pct}%;background:${color}"></div></div>
      <div class="stat-value">${v}</div>
    </div>`;
  }).join('');
  document.getElementById('stats-content').innerHTML = rows + `
    <div class="stat-total-row">
      <span class="stat-total-label">${escHtml(t('bst'))}</span>
      <span class="stat-total-value">${total}</span>
    </div>`;
}

// ── Render: Type effectiveness ────────────────────────────────────────────────
function renderEffectiveness(types) {
  const eff = calcEffectiveness(types);
  const groups = { 4: [], 2: [], 0.5: [], 0.25: [], 0: [] };
  ALL_TYPES.forEach(atk => {
    const m = eff[atk];
    if (groups[m]) groups[m].push(atk);
  });
  const rows = [
    { key: 4,    cls: 'eff-mult-4',   label: '×4' },
    { key: 2,    cls: 'eff-mult-2',   label: '×2' },
    { key: 0.5,  cls: 'eff-mult-05',  label: '×½' },
    { key: 0.25, cls: 'eff-mult-025', label: '×¼' },
    { key: 0,    cls: 'eff-mult-0',   label: '×0' },
  ].map(r => {
    const ts = groups[r.key] || [];
    return `<div class="eff-group">
      <span class="eff-mult ${r.cls}">${r.label}</span>
      <div class="eff-types">${ts.length ? ts.map(typeBadge).join('') : `<span class="eff-none">—</span>`}</div>
    </div>`;
  }).join('');
  document.getElementById('effectiveness-content').innerHTML = rows;
}

// ── Render: Abilities ─────────────────────────────────────────────────────────
async function renderAbilities(p, seq = loadSeq) {
  document.getElementById('abilities-content').innerHTML = loadingHTML();
  const dataArr = await Promise.all(p.abilities.map(a => apiAbility(a.name)));
  if (seq !== loadSeq) return;
  const html = p.abilities.map((a, i) => {
    const d = dataArr[i];
    return `<div class="ability-item ${a.isHidden ? 'is-hidden' : ''}">
      <div class="ability-header">
        <span class="ability-name">${escHtml(d.name)}</span>
        ${a.isHidden ? `<span class="ability-hidden-tag">${escHtml(t('hiddenAbility'))}</span>` : ''}
      </div>
      ${d.description ? `<div class="ability-desc">${escHtml(d.description)}${d.descFallback ? ' <span style="opacity:0.45;font-size:0.78em">[Kein deutscher Text verfügbar]</span>' : ''}</div>` : ''}
    </div>`;
  }).join('');
  document.getElementById('abilities-content').innerHTML = html || `<div class="evo-none">${escHtml(t('noData'))}</div>`;
}

// ── Render: Evolution ─────────────────────────────────────────────────────────
// Zuletzt geladene Entwicklungskette – wird beim Wechsel des Spiels neu gezeichnet, ohne neu zu laden
let evoState = null;

async function renderEvolution(s, seq = loadSeq) {
  const el = document.getElementById('evolution-content');
  el.innerHTML = loadingHTML();
  evoState = null;
  if (!s.evolutionChainUrl) { el.innerHTML = `<div class="evo-none">${escHtml(t('noEvolution'))}</div>`; return; }
  try {
    const chain = await apiEvolution(s.evolutionChainUrl);
    const paths = getEvoPaths(chain);
    if (paths.length === 1 && paths[0].length === 1) {
      if (seq === loadSeq) el.innerHTML = `<div class="evo-none">${escHtml(t('noEvolution'))}</div>`;
      return;
    }

    // Namen für Orte, Items, Attacken und Pokémon in der aktuellen Sprache vorab holen
    const nodes = paths.flat();
    const details = nodes.flatMap(n => n.details);
    const uniq = list => [...new Set(list.filter(Boolean))];
    const N = { loc: new Map(), item: new Map(), move: new Map(), species: new Map() };
    await Promise.all([
      ...uniq(details.map(d => d.location?.name)).map(async x => {
        const l = await apiLocation(x);
        if (l) N.loc.set(x, { name: pickName(l.names), region: l.region });
      }),
      ...uniq(details.flatMap(d => [d.item?.name, d.held_item?.name])).map(async x => {
        const i = await apiItem(x);
        const n = i && pickName(i.names);
        if (n) N.item.set(x, n);
      }),
      ...uniq(details.flatMap(d => [d.known_move?.name, d.used_move?.name])).map(async x => {
        try { N.move.set(x, (await apiMove(x)).name); } catch { /* Slug bleibt */ }
      }),
      ...uniq([...nodes.map(n => n.name), ...details.flatMap(d => [d.party_species?.name, d.trade_species?.name])]).map(async x => {
        try { N.species.set(x, (await apiSpecies(x)).displayName); } catch { /* Slug bleibt */ }
      }),
    ]);
    if (seq !== loadSeq) return;
    evoState = { paths, N, current: s.name };
    drawEvolution();
  } catch {
    if (seq === loadSeq) el.innerHTML = `<div class="evo-none">${escHtml(t('noData'))}</div>`;
  }
}

function drawEvolution() {
  if (!evoState) return;
  const el = document.getElementById('evolution-content');
  const { paths, N, current } = evoState;
  const vg = currentVersionGroup;
  const locRegion = slug => N.loc.get(slug)?.region || null;

  const rows = paths.map(path => {
    let blocked = false;
    const stages = path.map((node, i) => {
      let arrow = '';
      if (i > 0) {
        const res = evoDetailsForVG(node.details, vg, locRegion);
        const title = evoAllMethodsTitle(node.details, N, node.name);
        if (res.status === 'ok') {
          const labels = [...new Set(res.list.map(d => formatEvoDetail(d, N, node.name)))];
          const shown = labels.slice(0, 3);
          const withItem = res.list.find(d => d.item || d.held_item);
          const itemSlug = withItem?.item?.name || withItem?.held_item?.name;
          const itemImg = itemSlug
            ? `<img class="evo-item-img" src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${escHtml(itemSlug)}.png" alt="" onerror="this.remove()">`
            : '';
          const conds = shown.map(l => `<span class="evo-cond">${escHtml(l)}</span>`).join(`<span class="evo-or">${escHtml(t('evoOr'))}</span>`);
          const more = labels.length > shown.length ? `<span class="evo-more">+${labels.length - shown.length}</span>` : '';
          arrow = `<div class="evo-arrow" title="${escHtml(title)}"><span>→</span>${itemImg}${conds}${more}</div>`;
        } else {
          blocked = true;
          const note = res.status === 'later' ? t('evoFrom').replace('{g}', vgShortLabel(res.firstVG)) : t('evoNotInGame');
          arrow = `<div class="evo-arrow is-off" title="${escHtml(title)}"><span>→</span><span class="evo-cond">${escHtml(note)}</span></div>`;
        }
      }
      const isActive = node.name === current;
      const name = N.species.get(node.name) || prettySlug(node.name);
      const cls = isActive ? 'is-active' : 'is-clickable';
      return `${arrow}<div class="evo-stage ${cls}${blocked ? ' is-off' : ''}" data-evo="${escHtml(node.name)}">
          <img src="${escHtml(node.sprite)}" alt="${escHtml(name)}">
          <div class="evo-stage-name">${escHtml(name)}</div>
        </div>`;
    }).join('');
    return `<div class="evo-path">${stages}</div>`;
  }).join('');

  const caption = vg ? `<div class="evo-caption">${escHtml(t('evoFor'))} <b>${escHtml(vgShortLabel(vg))}</b></div>` : '';
  el.innerHTML = caption + rows;
  el.querySelectorAll('.evo-stage.is-clickable').forEach(stageEl => {
    stageEl.addEventListener('click', () => loadPokemon(stageEl.dataset.evo));
  });
}

// ── Render: Forms ─────────────────────────────────────────────────────────────
function renderForms(s, currentName) {
  const sec = document.getElementById('section-forms');
  const el = document.getElementById('forms-content');
  if (!s.varieties || s.varieties.length <= 1) { sec.style.display = 'none'; return; }
  sec.style.display = '';
  const html = s.varieties.map(v => {
    const m = v.pokemon.url.match(/\/pokemon\/(\d+)\//);
    const id = m ? Number(m[1]) : null;
    const sprite = id ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` : '';
    const isActive = v.pokemon.name === currentName;
    const base = s.name || '';
    const suffix = v.pokemon.name.startsWith(base + '-') ? v.pokemon.name.slice(base.length + 1) : v.pokemon.name;
    const known = window.POKEMON_NAMES.forms[v.pokemon.name] || (v.is_default && s.id);
    const label = (known && window.pokemonName(s.id, v.pokemon.name))
      || suffix.split('-').map(w => w[0].toUpperCase() + w.slice(1)).join(' ') || 'Standard';
    return `<div class="evo-stage ${isActive ? 'is-active' : 'is-clickable'}" data-form="${escHtml(v.pokemon.name)}">
      ${sprite ? `<img src="${escHtml(sprite)}" alt="${escHtml(label)}">` : ''}
      <div class="evo-stage-name">${escHtml(label)}</div>
    </div>`;
  }).join('');
  el.innerHTML = html;
  el.querySelectorAll('.evo-stage.is-clickable').forEach(el => {
    el.addEventListener('click', () => loadPokemon(el.dataset.form));
  });
}

// ── Render: Moves ─────────────────────────────────────────────────────────────
function getAvailableVersionGroups(moves) {
  const found = new Set();
  moves.forEach(m => m.version_group_details?.forEach(d => { if (d.version_group?.name) found.add(d.version_group.name); }));
  return VERSION_GROUP_ORDER.filter(vg => found.has(vg));
}

function getMethodsForVersionGroup(moves, vg) {
  const methods = new Set();
  moves.forEach(m => m.version_group_details?.filter(d => d.version_group?.name === vg).forEach(d => { if (d.move_learn_method?.name) methods.add(d.move_learn_method.name); }));
  const order = ['level-up','machine','egg','tutor'];
  return order.filter(m => methods.has(m));
}

async function renderMoves(p, seq = loadSeq) {
  const vgs = getAvailableVersionGroups(p.moves);
  const verSel = document.getElementById('version-select');
  verSel.innerHTML = vgs.length
    ? [...vgs].reverse().map(vg => `<option value="${escHtml(vg)}">${escHtml(vgLabel(vg))}</option>`).join('')
    : `<option value="">${escHtml(t('noData'))}</option>`;
  if (!currentVersionGroup) {
    currentVersionGroup = defaultVersionGroup(vgs, currentSpecies?.id ?? 0);
  } else if (!vgs.includes(currentVersionGroup)) {
    currentVersionGroup = closestVersionGroup(currentVersionGroup, vgs) || defaultVersionGroup(vgs, currentSpecies?.id ?? 0);
  }
  verSel.value = currentVersionGroup;

  await renderMoveTable(p, seq);
}

async function renderMoveTable(p, seq = loadSeq) {
  const tabs = document.getElementById('method-tabs');
  const content = document.getElementById('moves-content');
  const _mdp = document.getElementById('move-detail-panel');
  if (_mdp) _mdp.style.display = 'none';
  const vg = currentVersionGroup;
  if (!vg) { content.innerHTML = `<div class="no-moves-msg">${escHtml(t('noMoves'))}</div>`; tabs.innerHTML = ''; return; }

  const methods = getMethodsForVersionGroup(p.moves, vg);
  const methodLabels = { 'level-up': t('methodLevelUp'), 'machine': t('methodMachine'), 'egg': t('methodEgg'), 'tutor': t('methodTutor') };
  if (!methods.includes(currentMoveMethod)) currentMoveMethod = methods[0] || 'level-up';
  tabs.innerHTML = methods.map(m => `<button class="method-tab ${m === currentMoveMethod ? 'is-active' : ''}" data-method="${escHtml(m)}" type="button">${escHtml(methodLabels[m] || m)}</button>`).join('');
  tabs.querySelectorAll('.method-tab').forEach(btn => btn.addEventListener('click', () => { currentMoveMethod = btn.dataset.method; renderMoveTable(p); }));

  const method = currentMoveMethod;
  const moveEntries = [];
  p.moves.forEach(m => {
    const match = m.version_group_details?.filter(d => d.version_group?.name === vg && d.move_learn_method?.name === currentMoveMethod);
    if (match?.length) match.forEach(d => moveEntries.push({ rawName: m.move?.name ?? '', level: d.level_learned_at ?? 0 }));
  });
  moveEntries.sort((a,b) => a.level - b.level || a.rawName.localeCompare(b.rawName));

  if (!moveEntries.length) { content.innerHTML = `<div class="no-moves-msg">${escHtml(t('noMoves'))}</div>`; return; }
  content.innerHTML = loadingHTML();
  const moveData = await Promise.all(moveEntries.map(e => apiMove(e.rawName)));
  // Inzwischen anderes Pokémon, Spiel oder anderer Tab gewählt? Dann nicht mehr zeichnen.
  if (seq !== loadSeq || vg !== currentVersionGroup || method !== currentMoveMethod) return;

  const showLevel = currentMoveMethod === 'level-up';
  const rows = moveEntries.map((e, i) => {
    const d = moveData[i];
    const stats = getMoveStatsForVG(d, vg);
    const typeColor = TYPE_COLORS[stats.type] || '#888';
    const cat = stats.category;
    const catClass = cat === 'physical' ? 'move-cat-physical' : cat === 'special' ? 'move-cat-special' : 'move-cat-status';
    const catLabel = cat === 'physical' ? t('catPhysical') : cat === 'special' ? t('catSpecial') : cat === 'status' ? t('catStatus') : '—';
    return `<tr data-move="${escHtml(e.rawName)}">
      ${showLevel ? `<td class="move-level">${e.level > 0 ? e.level : '—'}</td>` : ''}
      <td class="move-name">${escHtml(d.name)}</td>
      <td>${stats.type ? `<span class="move-type-badge" style="background:${typeColor}">${escHtml(typeLabel(stats.type))}</span>` : '<span class="move-dash">—</span>'}</td>
      <td>${cat ? `<span class="move-cat ${catClass}">${escHtml(catLabel)}</span>` : '<span class="move-dash">—</span>'}</td>
      <td class="move-power">${stats.power ?? '<span class="move-dash">—</span>'}</td>
      <td class="move-acc">${stats.accuracy != null ? stats.accuracy + '%' : '<span class="move-dash">—</span>'}</td>
      <td class="move-pp">${stats.pp ?? '<span class="move-dash">—</span>'}</td>
    </tr>`;
  }).join('');

  content.innerHTML = `<div class="moves-table-wrap"><table class="moves-table">
    <thead><tr>
      ${showLevel ? `<th>${escHtml(t('colLevel'))}</th>` : ''}
      <th>${escHtml(t('colName'))}</th>
      <th>${escHtml(t('colType'))}</th>
      <th>${escHtml(t('colCat'))}</th>
      <th>${escHtml(t('colPower'))}</th>
      <th>${escHtml(t('colAcc'))}</th>
      <th>${escHtml(t('colPP'))}</th>
    </tr></thead>
    <tbody>${rows}</tbody>
  </table></div>`;
}

// ── Render: Locations ─────────────────────────────────────────────────────────
// Zuletzt geladene Fundorte – damit beim Wechsel des Spiels oben die passende Edition gewählt werden kann
let locState = null;

// Fundorte gehören zum einzelnen Pokémon (z. B. „lycanroc-midday"), nicht zur Art – daher der Pokémon-Name
async function renderLocations(pokemonName, seq = loadSeq) {
  const el = document.getElementById('locations-content');
  const gameSel = document.getElementById('location-game-select');
  el.innerHTML = loadingHTML();
  gameSel.innerHTML = '';
  gameSel.onchange = null;
  locState = null;

  let data;
  try {
    data = await apiLocations(pokemonName);
  } catch (err) {
    if (seq !== loadSeq) return;
    console.error('[Fundorte] Laden fehlgeschlagen für', pokemonName, err.message);
    gameSel.style.display = 'none';
    el.innerHTML = `<div class="no-locations">${escHtml(t('locLoadError'))} <button type="button" class="link-btn" id="loc-retry">${escHtml(t('retry'))}</button></div>`;
    document.getElementById('loc-retry').addEventListener('click', () => renderLocations(pokemonName, seq));
    return;
  }
  if (seq !== loadSeq) return;

  const bpName = (currentSpecies?.name || pokemonName).split('-').map(w => w[0].toUpperCase() + w.slice(1)).join('_');
  const bpUrl = `https://bulbapedia.bulbagarden.net/wiki/${encodeURIComponent(bpName)}_(Pok%C3%A9mon)#Game_locations`;
  const bpFooter = `<div class="loc-footer">${escHtml(t('bulbaIncomplete'))} · <a href="${bpUrl}" target="_blank" rel="noopener">${escHtml(t('bulbaAll'))}</a></div>`;

  const byGame = {};
  data.forEach(entry => {
    entry.version_details?.forEach(vd => {
      const game = vd.version?.name ?? 'unknown';
      if (!GAME_VERSION_LABELS[game]) return;
      // Nur in Japan verteilte Event-Begegnungen (z. B. Colosseum-Bonus-Disc) weglassen
      const details = (vd.encounter_details ?? []).filter(e => !/-jpn$/.test(e.method?.name || ''));
      if (!details.length) return;
      if (!byGame[game]) byGame[game] = [];
      const lvls = details.flatMap(e => [e.min_level, e.max_level]).filter(v => v != null && v > 0 && isFinite(v));
      byGame[game].push({
        slug: entry.location_area?.name ?? '',
        minLvl: lvls.length ? Math.min(...lvls) : 0,
        maxLvl: lvls.length ? Math.max(...lvls) : 0,
        methods: [...new Set(details.map(e => e.method?.name).filter(Boolean))],
        // max_chance = Summe aller Begegnungen an diesem Ort; nach dem Herausfiltern selbst addieren
        chance: details.length === (vd.encounter_details ?? []).length
          ? (vd.max_chance ?? 0)
          : Math.min(100, details.reduce((sum, e) => sum + (e.chance ?? 0), 0)),
      });
    });
  });

  // Spiele einer Reihe mit identischen Fundorten zusammenfassen (z. B. „Rot / Blau")
  const gameSig = game => [...new Set((byGame[game] || []).map(r => r.slug))].sort().join('|');
  const options = [];
  for (const cluster of GAME_CLUSTERS) {
    const present = cluster.games.filter(g => byGame[g]?.length);
    const seen = new Set();
    for (const game of present) {
      const sig = gameSig(game);
      if (seen.has(sig)) continue;
      seen.add(sig);
      const same = present.filter(g => gameSig(g) === sig);
      options.push({ label: same.map(gameLabel).join(' / '), game: same[0], present: same, all: cluster.games });
    }
  }

  if (!options.length) {
    gameSel.style.display = 'none';
    el.innerHTML = `<div class="no-locations">${escHtml(t('noLocations'))}</div>${bpFooter}`;
    return;
  }

  // Namen der Fundort-Bereiche in der aktuellen Sprache
  const allSlugs = [...new Set(Object.values(byGame).flat().map(r => r.slug).filter(Boolean))];
  const locNameMap = new Map();
  const CHUNK = 8;
  for (let i = 0; i < allSlugs.length; i += CHUNK) {
    await Promise.all(allSlugs.slice(i, i + CHUNK).map(async slug => {
      const name = await apiLocationAreaName(slug);
      if (name) locNameMap.set(slug, name);
    }));
    if (seq !== loadSeq) return;
  }
  const locName = slug => locNameMap.get(slug) || formatLocSlug(slug);

  gameSel.style.display = '';
  let list = options;
  const showOption = idx => {
    const opt = list[idx];
    if (!opt) return;
    if (opt.none) { el.innerHTML = `<div class="no-locations">${escHtml(t('locNoneIn').replace('{game}', opt.game))}</div>${bpFooter}`; return; }
    // Mehrere Bereiche desselben Ortes mit gleichen Daten nur einmal zeigen, Reihenfolge nach Name
    const rows = [...(byGame[opt.game] || [])].sort((a, b) => locName(a.slug).localeCompare(locName(b.slug), window.LANG));
    const exclusive = opt.present.length < opt.all.length && opt.all.length > 1;
    const badge = exclusive
      ? `<div class="loc-only-row"><span class="loc-only-badge">${escHtml(t('locOnlyIn'))} ${opt.present.map(g => escHtml(gameLabel(g))).join(' &amp; ')}</span></div>`
      : '';
    el.innerHTML = `${badge}<div class="location-row location-head">
        <span class="loc-header">${escHtml(t('locColName'))}</span>
        <span class="loc-header">${escHtml(t('locColMethod'))}</span>
        <span class="loc-header">${escHtml(t('locColLevel'))}</span>
        <span class="loc-header">${escHtml(t('locColChance'))}</span>
      </div>
      ${rows.map(row => `<div class="location-row">
        <span class="loc-name">${escHtml(locName(row.slug))}</span>
        <span class="loc-method">${escHtml(row.methods.map(encounterMethodLabel).join(', ') || '—')}</span>
        <span class="loc-levels">${row.minLvl && row.maxLvl ? (row.minLvl === row.maxLvl ? `Lv.${row.minLvl}` : `Lv.${row.minLvl}–${row.maxLvl}`) : '—'}</span>
        <span class="loc-chance">${row.chance > 0 ? row.chance + '%' : '—'}</span>
      </div>`).join('')}${bpFooter}`;
  };

  // Spiele mit Fundorten; hat das oben gewählte Spiel keine, steht es vorne mit Hinweis
  // (vorher sprang die Anzeige ohne Hinweis zu einem anderen Spiel, z. B. Let's Go statt Platin)
  const refresh = () => {
    const versions = VG_VERSIONS[currentVersionGroup] || [];
    const game = versions.map(gameLabel).filter(Boolean).join(' / ');
    const has = !game || options.some(o => o.present.some(g => versions.includes(g)));
    list = has ? options : [{ none: true, game, label: `${game} – ${t('locNotWild')}` }, ...options];
    gameSel.innerHTML = list.map((o, i) => `<option value="${i}">${escHtml(o.label)}</option>`).join('');
  };
  locState = { showOption, refresh, list: () => list };
  refresh();
  gameSel.onchange = () => showOption(Number(gameSel.value));
  const start = locationOptionForVG(currentVersionGroup);
  gameSel.value = String(start);
  showOption(start);
}

// Passende Fundort-Auswahl zum gewählten Spiel (sonst die erste)
function locationOptionForVG(vg) {
  if (!locState) return 0;
  const versions = VG_VERSIONS[vg] || [];
  const idx = locState.list().findIndex(o => !o.none && o.present.some(g => versions.includes(g)));
  return idx >= 0 ? idx : 0;
}

// ── Render: Species details ───────────────────────────────────────────────────
function renderDetails(s, p) {
  const eggNames = (s.eggGroups || []).map(eggGroupLabel).join(', ') || '—';
  const hatchSteps = s.hatchCounter != null ? ((s.hatchCounter + 1) * 255).toLocaleString() : '—';
  const items = [
    { label: t('eggGroups'), value: eggNames },
    { label: t('hatchSteps'), value: hatchSteps },
    { label: t('growthRate'), value: growthRateLabel(s.growthRate) || '—' },
    { label: t('catchRate'), value: s.captureRate != null ? `${s.captureRate} (${(s.captureRate / 255 * 100).toFixed(1)}%)` : '—' },
    { label: t('friendship'), value: s.baseHappiness ?? '—' },
    { label: t('baseExp'), value: p?.baseExp ?? '—' },
  ];
  document.getElementById('details-content').innerHTML = items.map(x => `<div class="detail-item">
    <div class="detail-label">${escHtml(x.label)}</div>
    <div class="detail-value">${escHtml(String(x.value))}</div>
  </div>`).join('');
}

// ── Load Pokémon ──────────────────────────────────────────────────────────────
// Jeder Ladevorgang bekommt eine Nummer. Langsame Antworten eines älteren Vorgangs werden verworfen,
// sonst landen z. B. Fundorte des vorherigen Pokémon beim neuen.
let loadSeq = 0;

// „lycanroc" ist ein Artname – das Pokémon dazu heißt „lycanroc-midday". Dann die Standardform der Art laden.
async function resolvePokemon(nameOrId) {
  try {
    return await apiPokemon(nameOrId);
  } catch (err) {
    const r = await fetch(`${POKEAPI}/pokemon-species/${String(nameOrId).toLowerCase()}`).catch(() => null);
    if (!r?.ok) throw err;
    const sp = await r.json();
    const def = sp.varieties?.find(v => v.is_default)?.pokemon?.name;
    if (!def) throw err;
    return apiPokemon(def);
  }
}

function showLoadError(nameOrId) {
  let box = document.getElementById('load-error');
  if (!box) {
    box = document.createElement('div');
    box.id = 'load-error';
    box.className = 'card load-error';
    document.getElementById('pokemon-content').before(box);
  }
  box.hidden = false;
  box.innerHTML = `${escHtml(t('loadError'))} <button type="button" class="link-btn">${escHtml(t('retry'))}</button>`;
  box.querySelector('button').addEventListener('click', () => loadPokemon(nameOrId));
}

async function loadPokemon(nameOrId) {
  const seq = ++loadSeq;
  const content = document.getElementById('pokemon-content');

  let p, s;
  try {
    p = await resolvePokemon(nameOrId);
    const speciesId = p.speciesUrl ? p.speciesUrl.split('/').filter(Boolean).pop() : nameOrId;
    s = await apiSpecies(speciesId);
  } catch (err) {
    if (seq !== loadSeq) return;
    // Seite nicht leeren – das zuletzt gezeigte Pokémon bleibt stehen
    showLoadError(nameOrId);
    if (!currentPokemon) content.style.display = 'none';
    return;
  }
  if (seq !== loadSeq) return;

  document.getElementById('load-error')?.setAttribute('hidden', '');
  isShiny = false;
  document.getElementById('shiny-btn').classList.remove('is-active');
  content.style.display = '';
  currentPokemon = p; currentSpecies = s;
  history.replaceState(null, '', `#${p.name}`);

  const trigger = document.getElementById('search-trigger');
  trigger.innerHTML = `<img class="search-trigger-sprite" src="${escHtml(p.sprite)}" alt=""><span class="search-trigger-name">${escHtml(s.displayName || p.name)}</span><span class="search-trigger-id">#${String(s.id).padStart(3,'0')}</span>`;

  renderIdentity(p, s);
  renderStats(p);
  renderEffectiveness(p.types);
  renderDetails(s, p);

  renderAbilities(p, seq);
  renderEvolution(s, seq);
  renderForms(s, p.name);
  renderMoves(p, seq);        // setzt das Spiel – Entwicklung und Fundorte richten sich danach
  renderLocations(p.name, seq);

  applyLanguage();
}

// ── Pokémon picker modal ──────────────────────────────────────────────────────
async function openModal() {
  document.getElementById('pokemon-modal').style.display = 'flex';
  document.getElementById('modal-search').value = '';
  document.getElementById('modal-gen').value = String(modalCurrentGen);
  document.getElementById('modal-search').focus();
  await loadModalGen(modalCurrentGen);
  ensureAllPokemonList();
}

function closeModal() { document.getElementById('pokemon-modal').style.display = 'none'; }

async function loadModalGen(gen) {
  modalCurrentGen = gen;
  const grid = document.getElementById('pokemon-grid');
  grid.innerHTML = `<li class="list-msg"><span class="loading-spinner"></span> ${escHtml(t('loading'))}</li>`;
  try {
    const list = await fetchGenList(gen);
    modalGenList = list;
    renderModalGrid('');
  } catch { grid.innerHTML = `<li class="list-msg">${escHtml(t('noData'))}</li>`; }
}

function renderModalGrid(filter) {
  const q = filter.trim().toLowerCase();
  const source = (q && allPokemonList) ? allPokemonList : modalGenList;
  const filtered = q ? source.filter(p => {
    const de = (window.pokemonName(p.id, p.name, 'de') || '').toLowerCase();
    const en = (window.pokemonName(p.id, p.name, 'en') || '').toLowerCase();
    return p.name.includes(q) || String(p.id).includes(q) || de.includes(q) || en.includes(q);
  }) : source;
  const grid = document.getElementById('pokemon-grid');
  if (!filtered.length) {
    grid.innerHTML = `<li class="list-msg">${escHtml(t('noData'))}</li>`;
    return;
  }
  grid.innerHTML = filtered.slice(0, 150).map(p => {
    // Name aus pokemon-names.js (Standardform = Artname, sonst z. B. „Ur-Giratina“)
    const label = window.pokemonName(p.id, p.name) || formatModalPokemonName(p.name);
    return `<li data-name="${escHtml(p.name)}" title="${escHtml(p.name)}">
      <img src="${escHtml(p.sprite)}" alt="${escHtml(p.name)}" loading="lazy">
      <span>${escHtml(label)}</span>
    </li>`;
  }).join('');
}

// ── Language ──────────────────────────────────────────────────────────────────
function applyLanguage() {
  document.querySelectorAll('[data-i18n]').forEach(el => { const v = t(el.dataset.i18n); if (v) el.textContent = v; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const v = t(el.dataset.i18nPlaceholder); if (v) el.placeholder = v; });
  document.querySelectorAll('[data-i18n-title]').forEach(el => { const v = t(el.dataset.i18nTitle); if (v) { el.title = v; if (el.hasAttribute('aria-label')) el.setAttribute('aria-label', v); } });
  document.getElementById('lang-toggle').textContent = window.LANG.toUpperCase();
}

function toggleLanguage() {
  window.LANG = window.LANG === 'de' ? 'en' : 'de';
  localStorage.setItem(LANG_KEY, window.LANG);
  applyLanguage();
  if (currentPokemon && currentSpecies) {
    cacheS.clear(); cacheA.clear(); cacheM.clear();
    loadPokemon(currentPokemon.name);
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('search-trigger').addEventListener('click', openModal);
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('pokemon-modal').addEventListener('click', e => { if (e.target === e.currentTarget) closeModal(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });

document.getElementById('modal-gen').addEventListener('change', e => loadModalGen(Number(e.target.value)));
document.getElementById('modal-search').addEventListener('input', async e => {
  const q = e.target.value;
  if (q.trim() && !allPokemonList) await ensureAllPokemonList();
  renderModalGrid(q);
});

document.getElementById('pokemon-grid').addEventListener('click', e => {
  const li = e.target.closest('li[data-name]');
  if (!li) return;
  closeModal();
  loadPokemon(li.dataset.name);
});

document.getElementById('shiny-btn').addEventListener('click', () => {
  if (!currentPokemon) return;
  isShiny = !isShiny;
  document.getElementById('shiny-btn').classList.toggle('is-active', isShiny);
  document.getElementById('identity-sprite').src = isShiny ? (currentPokemon.spriteShiny || currentPokemon.sprite) : currentPokemon.sprite;
  document.getElementById('identity-sprite').className = 'identity-sprite' + (isShiny ? ' is-shiny' : '');
});

// Das Spiel oben gilt für Attacken, Entwicklungs-Bedingungen und Fundorte
document.getElementById('version-select').addEventListener('change', e => {
  currentVersionGroup = e.target.value;
  if (currentPokemon) renderMoveTable(currentPokemon);
  drawEvolution();
  if (locState) {
    locState.refresh();
    const idx = locationOptionForVG(currentVersionGroup);
    document.getElementById('location-game-select').value = String(idx);
    locState.showOption(idx);
  }
});

document.getElementById('lang-toggle').addEventListener('click', toggleLanguage);

// ── Init ──────────────────────────────────────────────────────────────────────
applyLanguage();
const hashName = window.location.hash.slice(1);
if (hashName) {
  loadPokemon(decodeURIComponent(hashName));
} else {
  loadPokemon('pikachu');
}

document.getElementById('moves-content').addEventListener('click', async e => {
  const row = e.target.closest('tr[data-move]');
  if (row) showMoveDetail(row.dataset.move, row.getBoundingClientRect());
});
document.addEventListener('click', e => {
  const panel = document.getElementById('move-detail-panel');
  if (!panel || panel.style.display === 'none') return;
  if (e.target.closest('#move-detail-close')) { panel.style.display = 'none'; return; }
  if (!panel.contains(e.target) && !e.target.closest('tr[data-move]')) panel.style.display = 'none';
}, true);
