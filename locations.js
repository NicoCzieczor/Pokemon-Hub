/*
 * Orte je Spiel (Schlüssel wie im Run-Dashboard bzw. hub-active-game) – für das Run-Dashboard (Encounter-Auswahl)
 * und Duo (Routenliste). Deutsche Namen sind die Schlüssel, englische Anzeige über label().
 *   PRESETS  = Routen und Gebiete mit wilden Pokémon, SPECIALS = besondere Orte (Legendäre, Nachspiel),
 *   EXTRAS   = Städte (Geschenke, Tausch), ORDER = Reihenfolge im Spiel.
 */
(function (root) {
  'use strict';

  const LOCATION_LABELS_EN = {
    'Starter-Pokémon': 'Starter Pokémon',
    'Geschenk / Tausch': 'Gift / Trade',
    'Sendeturm / Geschenk': 'TV Station / Gift',
    'Dyna-Raid': 'Dynamax Raid',
    'Tera-Raid': 'Tera Raid',
    Massenausbruch: 'Mass Outbreak',
    Alabastia: 'Pallet Town',
    'Vertania City': 'Viridian City',
    'Marmoria City': 'Pewter City',
    'Azuria City': 'Cerulean City',
    'Orania City': 'Vermilion City',
    Lavandia: 'Lavender Town',
    'Prismania City': 'Celadon City',
    'Saffronia City': 'Saffron City',
    'Fuchsania City': 'Fuchsia City',
    Zinnoberinsel: 'Cinnabar Island',
    'Vertania-Wald': 'Viridian Forest',
    Mondberg: 'Mt. Moon',
    Felstunnel: 'Rock Tunnel',
    'Digda-Höhle': "Diglett's Cave",
    Seeschauminseln: 'Seafoam Islands',
    'Pokémon-Haus': 'Pokémon Mansion',
    Siegesstraße: 'Victory Road',
    Kraftwerk: 'Power Plant',
    'Unbekannter Dungeon': 'Cerulean Cave',
    'Azuria-Höhle': 'Cerulean Cave',
    'Pokémon-Turm': 'Pokémon Tower',
    'Kanto-Untergrundpfad': 'Kanto Underground Path',
    'MS Anne': 'S.S. Anne',
    Silberberg: 'Mt. Silver',
    'Eiland 1': 'One Island',
    'Eiland 2': 'Two Island',
    'Eiland 3': 'Three Island',
    'Eiland 4': 'Four Island',
    'Eiland 5': 'Five Island',
    'Eiland 6': 'Six Island',
    'Eiland 7': 'Seven Island',
    Schatzgestade: 'Treasure Beach',
    Glutberg: 'Mt. Ember',
    'Kap Kante': 'Cape Brink',
    Beerenforst: 'Berry Forest',
    Eiskaskadenhöhle: 'Icefall Cave',
    Musterbuschwald: 'Pattern Bush',
    Bondbrücke: 'Bond Bridge',
    Wasserirrgarten: 'Water Labyrinth',
    'Fünf-Eiland-Weide': 'Five Isle Meadow',
    Trainerturm: 'Trainer Tower',
    Wandelhöhle: 'Altering Cave',
    Entstehungsinsel: 'Birth Island',
    Glühweg: 'Kindle Road',
    Schluchteingang: 'Canyon Entrance',
    Wasserweg: 'Water Path',
    'Grüner Pfad': 'Green Path',
    'Fern-Eiland': 'Outcast Island',
    'Tri-Eiland Hafen': 'Three Isle Port',
    Ferienparadies: 'Resort Gorgeous',
    Gedenksäule: 'Memorial Pillar',
    'Verlorene Höhle': 'Lost Cave',
    Ruinental: 'Ruin Valley',
    '7-Schatzschlucht': 'Sevault Canyon',
    'Tanibo-Ruinen': 'Tanoby Ruins',
    Nabelfels: 'Navel Rock',
    Neuborkia: 'New Bark Town',
    'Rosalia City': 'Cherrygrove City',
    'Viola City': 'Violet City',
    'Dukatia City': 'Goldenrod City',
    'Teak City': 'Ecruteak City',
    'Oliviana City': 'Olivine City',
    'Anemonia City': 'Cianwood City',
    Mahagonia: 'Mahogany Town',
    'Ebenholz City': 'Blackthorn City',
    Dunkelhöhle: 'Dark Cave',
    'Knofensa-Turm': 'Sprout Tower',
    Einheitstunnel: 'Union Cave',
    'Flegmon-Brunnen': 'Slowpoke Well',
    Steineichenwald: 'Ilex Forest',
    Nationalpark: 'National Park',
    Turmruine: 'Burned Tower',
    Glockenturm: 'Bell Tower',
    Strudelinseln: 'Whirl Islands',
    Kesselberg: 'Mt. Mortar',
    'See des Zorns': 'Lake of Rage',
    Eispfad: 'Ice Path',
    Drachenhöhle: "Dragon's Den",
    'Tohjo-Fälle': 'Tohjo Falls',
    'Alph-Ruinen': 'Ruins of Alph',
    'Johto-Safari-Zone': 'Johto Safari Zone',
    Felsenherzturm: 'Embedded Tower',
    'Sinjoh-Ruinen': 'Sinjoh Ruins',
    'Team Rocket-Hauptquartier': 'Team Rocket HQ',
    'Steineichenwald-Schrein': 'Ilex Forest shrine',
    Wurzelheim: 'Littleroot Town',
    Rosaltstadt: 'Oldale Town',
    'Blütenburg City': 'Petalburg City',
    'Metarost City': 'Rustboro City',
    Faustauhaven: 'Dewford Town',
    'Graphitport City': 'Slateport City',
    'Malvenfroh City': 'Mauville City',
    'Bad Lavastadt': 'Lavaridge Town',
    Laubwechselfeld: 'Fallarbor Town',
    Wiesenflur: 'Verdanturf Town',
    'Baumhausen City': 'Fortree City',
    'Moosbach City': 'Mossdeep City',
    Xeneroville: 'Sootopolis City',
    Floßbrunn: 'Pacifidlog Town',
    Blütenburgwald: 'Petalburg Woods',
    Granithöhle: 'Granite Cave',
    Wüstenruine: 'Desert Ruins',
    'Feuriger Pfad': 'Fiery Path',
    Schlotberg: 'Mt. Chimney',
    Steilpass: 'Jagged Pass',
    Meteorfälle: 'Meteor Falls',
    'Metarost-Tunnel': 'Rusturf Tunnel',
    Pyroberg: 'Mt. Pyre',
    Küstenhöhle: 'Shoal Cave',
    Tiefseehöhle: 'Seafloor Cavern',
    Himmelturm: 'Sky Pillar',
    Wunderturm: 'Mirage Tower',
    Wüstenunterführung: 'Desert Underpass',
    Schiffswrack: 'Abandoned Ship',
    Urzeithöhle: 'Cave of Origin',
    'Neu Malvenfroh': 'New Mauville',
    'Team Aquas Versteck': 'Team Aqua Hideout',
    'Team Magmas Versteck': 'Team Magma Hideout',
    Inselhöhle: 'Island Cave',
    Grabmal: 'Ancient Tomb',
    Terrahöhle: 'Terra Cave',
    Ozeanhöhle: 'Marine Cave',
    Ferneiland: 'Faraway Island',
    'Insel im Süden': 'Southern Island',
    Höhlenatelier: 'Artisan Cave',
    Wunderinsel: 'Mirage Island',
    'Prachtpolis City': 'Ever Grande City',
    'Seegrasulb City': 'Lilycove City',
    'Kampfzone (Hoenn)': 'Hoenn Battle Frontier',
    Zweiblattdorf: 'Twinleaf Town',
    Sandgemme: 'Sandgem Town',
    Jubelstadt: 'Jubilife City',
    Erzelingen: 'Oreburgh City',
    'Erzelingen-Tor': 'Oreburgh Gate',
    Flori: 'Floaroma Town',
    Windkraftwerk: 'Valley Windworks',
    Verwüsteter: 'Ravaged',
    'Verwüsteter Pfad': 'Ravaged Path',
    Ewigwald: 'Eterna Forest',
    Ewigenau: 'Eterna City',
    Herzhofen: 'Hearthome City',
    Trostu: 'Solaceon Town',
    Schleiede: 'Veilstone City',
    Weideburg: 'Pastoria City',
    Blizzach: 'Snowpoint City',
    Fleetburg: 'Canalave City',
    Sonnewik: 'Sunyshore City',
    'Pokémon Liga': 'Pokémon League',
    Eiseninsel: 'Iron Island',
    Kahlberg: 'Stark Mountain',
    'See der Wahrheit': 'Lake Verity',
    'Bizarre Höhle': 'Wayward Cave',
    Kraterberg: 'Mt. Coronet',
    'Turm der Ruhenden': 'Lost Tower',
    Kühnheitsufer: 'Valor Lakefront',
    'See der Kühnheit': 'Lake Valor',
    Großmoor: 'Great Marsh',
    Ruinengrotte: 'Ruin Maniac Cave',
    Stärkeufer: 'Acuity Lakefront',
    'See der Stärke': 'Lake Acuity',
    Speersäule: 'Spear Pillar',
    Zerrwelt: 'Distortion World',
    'Höhle der Umkehr': 'Turnback Cave',
    Scheidequelle: 'Sendoff Spring',
    'Alte Villa': 'Old Chateau',
    'Erzelingen-Mine': 'Oreburgh Mine',
    'Feurio-Hütte': 'Fuego Ironworks',
    'Trostu-Ruinen': 'Solaceon Ruins',
    'Pokémon-Landgut': 'Trophy Garden',
    'Blizzach-Tempel': 'Snowpoint Temple',
    'Auen von Flori': 'Floaroma Meadow',
    Elyses: 'Celestic Town',
    'Maniac-Tunnel': 'Maniac Tunnel',
    Erholungsareal: 'Resort Area',
    Blumenparadies: 'Flower Paradise',
    Neumondinsel: 'Newmoon Island',
    Vollmondinsel: 'Fullmoon Island',
    'Halle des Beginns': 'Hall of Origin',
    'Wandernde Pokémon': 'Roaming Pokémon',
    Avenitia: 'Nuvema Town',
    Gavina: 'Accumula Town',
    'Orion City': 'Striaton City',
    'Septerna City': 'Nacrene City',
    'Stratos City': 'Castelia City',
    'Rayono City': 'Nimbasa City',
    'Marea City': 'Driftveil City',
    'Panaero City': 'Mistralton City',
    'Nevaio City': 'Icirrus City',
    'Twindrake City': 'Opelucid City',
    Traumbrache: 'Dreamyard',
    Grundwassersenke: 'Wellspring Cave',
    Ewigenwald: 'Pinwheel Forest',
    Wüstenresort: 'Desert Resort',
    'Alter Palast': 'Relic Castle',
    'Hain der Täuschung': 'Lostlorn Forest',
    Elektrolithhöhle: 'Chargestone Cave',
    'Turm des Himmels': 'Celestial Tower',
    'Moor von Nevaio': 'Moor of Icirrus',
    Wunderbrücke: 'Marvelous Bridge',
    Riesengrotte: 'Giant Chasm',
    'Weißer Wald / Schwarze Stadt': 'White Forest / Black City',
    'Panaero-Höhle': 'Mistralton Cave',
    Freiheitsgarten: 'Liberty Garden',
    Tiefkühlcontainer: 'Cold Storage',
    Drachenstiege: 'Dragonspiral Tower',
    'Schloss von N': "N's Castle",
    'Schrein der Ernte': 'Abundant Shrine',
    'Höhle der Schulung': "Challenger's Cave",
    Wendelberg: 'Twist Mountain',
    'Marea-Zugbrücke': 'Driftveil Drawbridge',
    'Bucht von Ondula': 'Undella Bay',
    Ondula: 'Undella Town',
    Dorfbrücke: 'Village Bridge',
    'Kammer der Weisung': 'Guidance Chamber',
    'Kammer der Prüfung': 'Trial Chamber',
    Escissia: 'Vaniville Town',
    Aquarellia: 'Aquacorde Town',
    'Nouvaria-Wald': 'Santalune Forest',
    'Nouvaria City': 'Santalune City',
    'Illumina City': 'Lumiose City',
    'Parfum-Palast': 'Parfum Palace',
    'Relievera City': 'Cyllage City',
    Petrophia: 'Ambrette Town',
    'Yantara City': 'Shalour City',
    'Tempera City': 'Coumarine City',
    'Romantia City': 'Laverre City',
    Frescora: 'Dendemille Town',
    'Fluxia City': 'Anistar City',
    'Fractalia City': 'Snowbelle City',
    Glitzerhöhle: 'Glittering Cave',
    Spiegelhöhle: 'Reflection Cave',
    Azurbucht: 'Azure Bay',
    Frosthöhle: 'Frost Cavern',
    Omegahöhle: 'Terminus Cave',
    'Omega-Höhle': 'Terminus Cave',
    'Pokémon-Dorf': 'Pokémon Village',
    Kontaktsafari: 'Friend Safari',
    Geolinkhöhle: 'Connecting Cave',
    Hotelruine: 'Lost Hotel',
    Meerestitanenhöhle: "Sea Spirit's Den",
    'Flare-Geheimbasis': 'Team Flare Secret HQ',
    Geheimdungeon: 'Unknown Dungeon',
    'Turm der Erkenntnis': 'Tower of Mastery',
    Mosaia: 'Couriway Town',
    'Kalos (wandernd)': 'Kalos (Roaming)',
    Furlongham: 'Postwick',
    Brassbury: 'Wedgehurst',
    'Engine City': 'Motostoke',
    Schlummerwald: 'Slumbering Weald',
    Turffield: 'Turffield',
    Keelton: 'Hulbury',
    Passbeck: 'Stow-on-Side',
    Fairballey: 'Ballonlea',
    Circhester: 'Circhester',
    Spikeford: 'Spikemuth',
    'Score City': 'Wyndon',
    Wipfelscheinwald: 'Glimwood Tangle',
    'Naturzone: Waipio-Ebene': 'Wild Area: Rolling Fields',
    'Naturzone: Milza-See': 'Wild Area: Axewell Lake',
    'Naturzone: Wachturmruine': 'Wild Area: Watchtower Ruins',
    'Naturzone: Brückental': 'Wild Area: Bridge Field',
    'Naturzone: Sandsturmkessel': 'Wild Area: Dusty Bowl',
    'Naturzone: Spiegel des Giganten': "Wild Area: Giant's Mirror",
    'Naturzone: Milotic-See': 'Wild Area: Miloch Lake',
    Rüstungsinsel: 'Isle of Armor',
    'Kronen-Schneelande': 'Crown Tundra',
    Energiewerk: 'Energy Plant',
    'Dyna-Riesennest': 'Max Lair',
    Kronentempel: 'Crown Shrine',
    'Hügel des Dyna-Baums': 'Dyna Tree Hill',
    Gipfelruinen: 'Rock Peak Ruins',
    'Eisberg-Ruinen': 'Iceberg Ruins',
    'Eisen-Ruinen': 'Iron Ruins',
    Zwiespaltruinen: 'Split-Decision Ruins',
    'Ballsee-Ufer': 'Ballimere Lake',
    'Cucharico-Pfad': 'Poco Path',
    'Mesalona City': 'Mesagoza',
    'Südliche Zone 1': 'South Province Area One',
    'Südliche Zone 2': 'South Province Area Two',
    'Südliche Zone 3': 'South Province Area Three',
    'Südliche Zone 4': 'South Province Area Four',
    'Südliche Zone 5': 'South Province Area Five',
    'Südliche Zone 6': 'South Province Area Six',
    'Östliche Zone 1': 'East Province Area One',
    'Östliche Zone 2': 'East Province Area Two',
    'Östliche Zone 3': 'East Province Area Three',
    'Westliche Zone 1': 'West Province Area One',
    'Westliche Zone 2': 'West Province Area Two',
    'Westliche Zone 3': 'West Province Area Three',
    'Nördliche Zone 1': 'North Province Area One',
    'Nördliche Zone 2': 'North Province Area Two',
    'Nördliche Zone 3': 'North Province Area Three',
    Brutzelwüste: 'Asado Desert',
    'Caldero-See': 'Casseroya Lake',
    Montanata: 'Glaseado Mountain',
    Schmierhain: 'Tagtree Thicket',
    'Asarilla-Grotte': 'Alfornada Cavern',
    'Zone Null': 'Area Zero',
    'Labor Null': 'Zero Lab',
    'Schrein des modrigen Holzes': 'Grasswither Shrine',
    'Schrein des entzweiten Eises': 'Icerend Shrine',
    'Schrein der unreinen Erde': 'Groundblight Shrine',
    'Schrein der finsteren Flamme': 'Firescourge Shrine',
    Moldrid: 'Artazon',
    'Fermanca City': 'Levincia',
    'Garrafosa City': 'Cascarrafa',
    Asarilla: 'Alfornada',
    Frigomonta: 'Montenevera',
    Bolardin: 'Medali',
    Pinchores: 'Porto Marinada',
  };

  const LOCATION_PRESETS = {
    'rot-blau': [
      'Route 1', 'Route 2', 'Vertania-Wald', 'Route 3', 'Mondberg', 'Route 4', 'Route 5', 'Route 6',
      'Route 24', 'Route 25', 'Route 7', 'Route 8', 'Route 9', 'Route 10', 'Felstunnel', 'Route 11', 'Digda-Höhle',
      'Route 12', 'Route 13', 'Route 14', 'Route 15', 'Route 16', 'Route 17', 'Route 18',
      'Safari-Zone', 'Route 19', 'Seeschauminseln', 'Route 20', 'Pokémon-Haus', 'Route 21',
      'Route 22', 'Route 23', 'Siegesstraße', 'Kraftwerk', 'Unbekannter Dungeon', 'Geschenk / Tausch'
    ],
    'gelb': [
      'Route 1', 'Route 2', 'Vertania-Wald', 'Route 3', 'Mondberg', 'Route 4', 'Route 5', 'Route 6',
      'Route 24', 'Route 25', 'Route 7', 'Route 8', 'Route 9', 'Route 10', 'Felstunnel', 'Route 11', 'Digda-Höhle',
      'Route 12', 'Route 13', 'Route 14', 'Route 15', 'Route 16', 'Route 17', 'Route 18',
      'Safari-Zone', 'Route 19', 'Seeschauminseln', 'Route 20', 'Pokémon-Haus', 'Route 21',
      'Route 22', 'Route 23', 'Siegesstraße', 'Kraftwerk', 'Unbekannter Dungeon', 'Geschenk / Tausch'
    ],
    'feuerrot-blattgruen': [
      'Route 1', 'Route 2', 'Vertania-Wald', 'Route 3', 'Mondberg', 'Route 4', 'Route 5', 'Route 6',
      'Route 24', 'Route 25', 'Route 7', 'Route 8', 'Route 9', 'Route 10', 'Felstunnel', 'Route 11', 'Digda-Höhle',
      'Route 12', 'Route 13', 'Route 14', 'Route 15', 'Route 16', 'Route 17', 'Route 18',
      'Safari-Zone', 'Route 19', 'Seeschauminseln', 'Route 20', 'Pokémon-Haus', 'Route 21',
      'Route 22', 'Route 23', 'Siegesstraße', 'Kraftwerk', 'Eiland 1', 'Schatzgestade', 'Glutberg',
      'Eiland 2', 'Kap Kante', 'Eiland 3', 'Beerenforst', 'Eiland 4', 'Eiskaskadenhöhle',
      'Eiland 5', 'Eiland 6', 'Musterbuschwald', 'Eiland 7', 'Trainerturm', 'Geschenk / Tausch'
    ],
    'letsgo': [
      'Route 1', 'Route 2', 'Vertania-Wald', 'Route 3', 'Mondberg', 'Route 4', 'Route 5', 'Route 6',
      'Route 24', 'Route 25', 'Route 7', 'Route 8', 'Route 9', 'Route 10', 'Felstunnel', 'Route 11', 'Digda-Höhle',
      'Route 12', 'Route 13', 'Route 14', 'Route 15', 'Route 16', 'Route 17', 'Route 18',
      'Route 19', 'Seeschauminseln', 'Route 20', 'Pokémon-Haus', 'Route 21',
      'Route 22', 'Route 23', 'Siegesstraße', 'Kraftwerk', 'Azuria-Höhle', 'Geschenk / Tausch'
    ],
    'gold-silber': [
      'Route 29', 'Route 46', 'Route 30', 'Route 31', 'Dunkelhöhle', 'Knofensa-Turm', 'Route 32',
      'Einheitstunnel', 'Route 33', 'Flegmon-Brunnen', 'Steineichenwald', 'Route 34', 'Route 35',
      'Nationalpark', 'Route 36', 'Route 37', 'Turmruine', 'Route 38', 'Route 39', 'Route 40',
      'Strudelinseln', 'Route 41', 'Route 42', 'Kesselberg', 'Route 43', 'See des Zorns',
      'Eispfad', 'Route 44', 'Route 45', 'Drachenhöhle', 'Tohjo-Fälle', 'Route 26', 'Route 27',
      'Siegesstraße', 'Route 1', 'Route 2', 'Vertania-Wald', 'Route 3', 'Mondberg', 'Route 4',
      'Route 5', 'Route 6', 'Route 7', 'Route 8', 'Route 9', 'Route 10', 'Route 11', 'Digda-Höhle',
      'Route 12', 'Route 13', 'Route 14', 'Route 15', 'Route 16', 'Route 17', 'Route 18',
      'Route 19', 'Route 20', 'Seeschauminseln', 'Route 21', 'Route 22', 'Route 24', 'Route 25',
      'Kraftwerk', 'Azuria-Höhle', 'Silberberg', 'Geschenk / Tausch'
    ],
    'kristall': [
      'Route 29', 'Route 46', 'Route 30', 'Route 31', 'Dunkelhöhle', 'Knofensa-Turm', 'Route 32',
      'Einheitstunnel', 'Route 33', 'Flegmon-Brunnen', 'Steineichenwald', 'Route 34', 'Route 35',
      'Nationalpark', 'Route 36', 'Route 37', 'Turmruine', 'Route 38', 'Route 39', 'Route 40',
      'Strudelinseln', 'Route 41', 'Route 42', 'Kesselberg', 'Route 43', 'See des Zorns',
      'Eispfad', 'Route 44', 'Route 45', 'Drachenhöhle', 'Tohjo-Fälle', 'Route 26', 'Route 27',
      'Siegesstraße', 'Route 1', 'Route 2', 'Vertania-Wald', 'Route 3', 'Mondberg', 'Route 4',
      'Route 5', 'Route 6', 'Route 7', 'Route 8', 'Route 9', 'Route 10', 'Route 11', 'Digda-Höhle',
      'Route 12', 'Route 13', 'Route 14', 'Route 15', 'Route 16', 'Route 17', 'Route 18',
      'Route 19', 'Route 20', 'Seeschauminseln', 'Route 21', 'Route 22', 'Route 24', 'Route 25',
      'Kraftwerk', 'Azuria-Höhle', 'Silberberg', 'Geschenk / Tausch'
    ],
    'heartgold-soulsilver': [
      'Route 29', 'Route 46', 'Route 30', 'Route 31', 'Dunkelhöhle', 'Knofensa-Turm', 'Route 32',
      'Einheitstunnel', 'Route 33', 'Flegmon-Brunnen', 'Steineichenwald', 'Route 34', 'Route 35',
      'Nationalpark', 'Route 36', 'Route 37', 'Turmruine', 'Route 38', 'Route 39', 'Route 40',
      'Strudelinseln', 'Route 41', 'Route 42', 'Kesselberg', 'Route 43', 'See des Zorns',
      'Eispfad', 'Route 44', 'Route 45', 'Drachenhöhle', 'Tohjo-Fälle', 'Route 26', 'Route 27',
      'Siegesstraße', 'Route 1', 'Route 2', 'Vertania-Wald', 'Route 3', 'Mondberg', 'Route 4',
      'Route 5', 'Route 6', 'Route 7', 'Route 8', 'Route 9', 'Route 10', 'Route 11', 'Digda-Höhle',
      'Route 12', 'Route 13', 'Route 14', 'Route 15', 'Route 16', 'Route 17', 'Route 18',
      'Route 19', 'Route 20', 'Seeschauminseln', 'Route 21', 'Route 22', 'Route 24', 'Route 25',
      'Kraftwerk', 'Azuria-Höhle', 'Silberberg', 'Geschenk / Tausch'
    ],
    'rubin-saphir': [
      'Route 101', 'Route 102', 'Route 103', 'Route 104', 'Blütenburgwald', 'Route 105', 'Route 106',
      'Granithöhle', 'Route 107', 'Route 108', 'Route 109', 'Route 110', 'Route 111', 'Wüstenruine',
      'Feuriger Pfad', 'Route 112', 'Schlotberg', 'Steilpass', 'Route 113', 'Route 114', 'Meteorfälle',
      'Route 115', 'Metarost-Tunnel', 'Route 116', 'Route 117', 'Route 118', 'Route 119', 'Route 120',
      'Route 121', 'Safari-Zone', 'Route 122', 'Pyroberg', 'Route 123', 'Route 124', 'Route 125',
      'Küstenhöhle', 'Route 126', 'Route 127', 'Route 128', 'Tiefseehöhle', 'Route 129', 'Route 130',
      'Route 131', 'Himmelturm', 'Route 132', 'Route 133', 'Route 134', 'Siegesstraße',
      'Wunderturm', 'Wüstenunterführung', 'Geschenk / Tausch'
    ],
    'smaragd': [
      'Route 101', 'Route 102', 'Route 103', 'Route 104', 'Blütenburgwald', 'Route 105', 'Route 106',
      'Granithöhle', 'Route 107', 'Route 108', 'Route 109', 'Route 110', 'Route 111', 'Wüstenruine',
      'Feuriger Pfad', 'Route 112', 'Schlotberg', 'Steilpass', 'Route 113', 'Route 114', 'Meteorfälle',
      'Route 115', 'Metarost-Tunnel', 'Route 116', 'Route 117', 'Route 118', 'Route 119', 'Route 120',
      'Route 121', 'Safari-Zone', 'Route 122', 'Pyroberg', 'Route 123', 'Route 124', 'Route 125',
      'Küstenhöhle', 'Route 126', 'Route 127', 'Route 128', 'Tiefseehöhle', 'Route 129', 'Route 130',
      'Route 131', 'Himmelturm', 'Route 132', 'Route 133', 'Route 134', 'Siegesstraße',
      'Wunderturm', 'Wüstenunterführung', 'Geschenk / Tausch'
    ],
    'omega-rot-alpha-saphir': [
      'Route 101', 'Route 102', 'Route 103', 'Route 104', 'Blütenburgwald', 'Route 105', 'Route 106',
      'Granithöhle', 'Route 107', 'Route 108', 'Route 109', 'Route 110', 'Route 111', 'Wüstenruine',
      'Feuriger Pfad', 'Route 112', 'Schlotberg', 'Steilpass', 'Route 113', 'Route 114', 'Meteorfälle',
      'Route 115', 'Metarost-Tunnel', 'Route 116', 'Route 117', 'Route 118', 'Route 119', 'Route 120',
      'Route 121', 'Safari-Zone', 'Route 122', 'Pyroberg', 'Route 123', 'Route 124', 'Route 125',
      'Küstenhöhle', 'Route 126', 'Route 127', 'Route 128', 'Tiefseehöhle', 'Route 129', 'Route 130',
      'Route 131', 'Himmelturm', 'Route 132', 'Route 133', 'Route 134', 'Siegesstraße',
      'Wunderturm', 'Wüstenunterführung', 'Geschenk / Tausch'
    ],
    'diamant-perl': [
      'Route 201', 'See der Wahrheit', 'Route 202', 'Route 203', 'Erzelingen-Tor', 'Route 204',
      'Verwüsteter Pfad', 'Flori', 'Windkraftwerk', 'Route 205', 'Ewigwald', 'Route 206',
      'Bizarre Höhle', 'Route 207', 'Kraterberg', 'Route 208', 'Route 209', 'Turm der Ruhenden',
      'Route 210', 'Route 211', 'Route 212', 'Großmoor', 'Route 213', 'Route 214', 'Ruinengrotte',
      'Route 215', 'Route 216', 'Route 217', 'Stärkeufer', 'See der Stärke', 'Route 218',
      'Route 219', 'Route 220', 'Route 221', 'Route 222', 'Route 223', 'Siegesstraße',
      'Route 224', 'Route 225', 'Route 226', 'Route 227', 'Kahlberg', 'Route 228', 'Route 229',
      'Route 230', 'Sendeturm / Geschenk'
    ],
    'platin': [
      'Route 201', 'See der Wahrheit', 'Route 202', 'Route 203', 'Erzelingen-Tor', 'Route 204',
      'Verwüsteter Pfad', 'Flori', 'Windkraftwerk', 'Route 205', 'Ewigwald', 'Route 206',
      'Bizarre Höhle', 'Route 207', 'Kraterberg', 'Route 208', 'Route 209', 'Turm der Ruhenden',
      'Route 210', 'Route 211', 'Route 212', 'Großmoor', 'Route 213', 'Route 214', 'Ruinengrotte',
      'Route 215', 'Route 216', 'Route 217', 'Stärkeufer', 'See der Stärke', 'Route 218',
      'Route 219', 'Route 220', 'Route 221', 'Route 222', 'Route 223', 'Siegesstraße',
      'Route 224', 'Route 225', 'Route 226', 'Route 227', 'Kahlberg', 'Route 228', 'Route 229',
      'Route 230', 'Sendeturm / Geschenk'
    ],
    'bdsp': [
      'Route 201', 'See der Wahrheit', 'Route 202', 'Route 203', 'Erzelingen-Tor', 'Route 204',
      'Verwüsteter Pfad', 'Flori', 'Windkraftwerk', 'Route 205', 'Ewigwald', 'Route 206',
      'Bizarre Höhle', 'Route 207', 'Kraterberg', 'Route 208', 'Route 209', 'Turm der Ruhenden',
      'Route 210', 'Route 211', 'Route 212', 'Großmoor', 'Route 213', 'Route 214', 'Ruinengrotte',
      'Route 215', 'Route 216', 'Route 217', 'Stärkeufer', 'See der Stärke', 'Route 218',
      'Route 219', 'Route 220', 'Route 221', 'Route 222', 'Route 223', 'Siegesstraße',
      'Route 224', 'Route 225', 'Route 226', 'Route 227', 'Kahlberg', 'Route 228', 'Route 229',
      'Route 230', 'Sendeturm / Geschenk'
    ],
    'schwarz-weiss': [
      'Route 1', 'Route 2', 'Traumbrache', 'Route 3', 'Grundwassersenke', 'Ewigenwald', 'Route 4',
      'Wüstenresort', 'Alter Palast', 'Route 5', 'Route 16', 'Hain der Täuschung', 'Route 6',
      'Elektrolithhöhle', 'Route 7', 'Turm des Himmels', 'Route 17', 'Route 18', 'P2-Labor',
      'Route 8', 'Moor von Nevaio', 'Route 9', 'Route 10', 'Siegesstraße', 'Route 11', 'Wunderbrücke',
      'Route 12', 'Route 13', 'Riesengrotte', 'Route 14', 'Weißer Wald / Schwarze Stadt',
      'Route 15', 'Panaero-Höhle', 'Freiheitsgarten', 'Geschenk / Tausch'
    ],
    'schwarz2-weiss2': [
      'Route 19', 'Route 20', 'Route 1', 'Route 2', 'Traumbrache', 'Route 3', 'Grundwassersenke',
      'Ewigenwald', 'Route 4', 'Wüstenresort', 'Alter Palast', 'Route 5', 'Route 16', 'Hain der Täuschung',
      'Route 6', 'Elektrolithhöhle', 'Route 7', 'Turm des Himmels', 'Route 17', 'Route 18', 'P2-Labor',
      'Route 8', 'Moor von Nevaio', 'Route 9', 'Route 10', 'Siegesstraße', 'Route 11', 'Wunderbrücke',
      'Route 12', 'Route 13', 'Riesengrotte', 'Route 14', 'Weißer Wald / Schwarze Stadt',
      'Route 15', 'Panaero-Höhle', 'Freiheitsgarten', 'Route 21', 'Route 22', 'Route 23',
      'Kehrtwendeberg', 'Relic-Steg', 'PKW-Turnier', 'Geschenk / Tausch'
    ],
    'x-y': [
      'Route 2', 'Nouvaria-Wald', 'Route 3', 'Route 4', 'Route 5', 'Route 6', 'Parfum-Palast',
      'Route 7', 'Route 8', 'Glitzerhöhle', 'Route 9', 'Route 10', 'Route 11', 'Spiegelhöhle',
      'Route 12', 'Azurbucht', 'Route 13', 'Route 14', 'Route 15', 'Route 16', 'Frosthöhle',
      'Route 17', 'Route 18', 'Omega-Höhle', 'Route 19', 'Route 20', 'Pokémon-Dorf', 'Route 21',
      'Route 22', 'Siegesstraße', 'Kontaktsafari', 'Geschenk / Tausch'
    ],
    'sonne-mond': [
      'Route 1', 'Route 2', 'Route 3', 'Pflanzenhöhle', 'Melemele-Wiese', 'Zehnkaratberg',
      'Route 4', 'Route 5', 'Route 6', 'Bachweilerberg', 'Route 7', 'Wela-Vulkanpark',
      'Route 8', 'Üppiger Wald', 'Digda-Tunnel', 'Route 9', 'Route 10', 'Route 11', 'Route 12',
      'Route 13', 'Rosenroter Berg', 'Route 14', 'Haina-Wüste', 'Route 15', "Ula'ula-Wiese",
      'Route 16', 'Route 17', 'Poni-Wildnis', 'Alter Poni-Pfad', 'Poni-Ebene', 'Poni-Wiese',
      'Lösungs-Höhle', 'Berg Lanakila', 'Geschenk / Tausch'
    ],
    'ultrasonne-ultramond': [
      'Route 1', 'Route 2', 'Route 3', 'Pflanzenhöhle', 'Melemele-Wiese', 'Zehnkaratberg',
      'Route 4', 'Route 5', 'Route 6', 'Bachweilerberg', 'Route 7', 'Wela-Vulkanpark',
      'Route 8', 'Üppiger Wald', 'Digda-Tunnel', 'Route 9', 'Route 10', 'Route 11', 'Route 12',
      'Route 13', 'Rosenroter Berg', 'Route 14', 'Haina-Wüste', 'Route 15', "Ula'ula-Wiese",
      'Route 16', 'Route 17', 'Poni-Wildnis', 'Alter Poni-Pfad', 'Poni-Ebene', 'Poni-Wiese',
      'Lösungs-Höhle', 'Berg Lanakila', 'Geschenk / Tausch'
    ],
    'schwert-schild': [
      'Route 1', 'Route 2', 'Schlummerwald', 'Galar-Mine 1', 'Route 3', 'Route 4', 'Galar-Mine 2',
      'Route 5', 'Route 6', 'Route 7', 'Route 8', 'Route 9', 'Route 10', 'Wipfelscheinwald',
      'Dyna-Raid', 'Naturzone: Waipio-Ebene', 'Naturzone: Milza-See', 'Naturzone: Wachturmruine',
      'Naturzone: Brückental', 'Naturzone: Sandsturmkessel', 'Naturzone: Spiegel des Giganten',
      'Naturzone: Milotic-See', 'Rüstungsinsel', 'Kronen-Schneelande', 'Geschenk / Tausch'
    ],
    'karmesin-purpur': [
      'Cucharico-Pfad', 'Südliche Zone 1', 'Südliche Zone 2', 'Südliche Zone 3', 'Südliche Zone 4',
      'Südliche Zone 5', 'Südliche Zone 6', 'Östliche Zone 1', 'Östliche Zone 2', 'Östliche Zone 3',
      'Westliche Zone 1', 'Westliche Zone 2', 'Westliche Zone 3', 'Nördliche Zone 1', 'Nördliche Zone 2',
      'Nördliche Zone 3', 'Brutzelwüste', 'Caldero-See', 'Montanata', 'Schmierhain', 'Asarilla-Grotte',
      'Felstunnel', 'Zone Null', 'Tera-Raid', 'Geschenk / Tausch'
    ],
  };

  const LOCATION_SPECIALS = {
    'rot-blau': [
      'Pokémon-Turm', 'Kanto-Untergrundpfad'
    ],
    'gelb': [
      'Pokémon-Turm', 'Kanto-Untergrundpfad'
    ],
    'feuerrot-blattgruen': [
      'Pokémon-Turm', 'Azuria-Höhle', 'MS Anne', 'Wandelhöhle', 'Glühweg', 'Schluchteingang',
      'Wasserweg', 'Grüner Pfad', 'Fern-Eiland', 'Ferienparadies', 'Gedenksäule',
      'Verlorene Höhle', 'Ruinental', '7-Schatzschlucht', 'Tanibo-Ruinen',
      'Tri-Eiland Hafen', 'Entstehungsinsel', 'Nabelfels', 'Wandernde Pokémon'
    ],
    'letsgo': [
      'Pokémon-Turm', 'Kanto-Untergrundpfad', 'Wandernde Pokémon'
    ],
    'gold-silber': [
      'Alph-Ruinen', 'Glockenturm', 'Johto-Safari-Zone', 'Route 47', 'Route 48',
      'Route 28', 'Felstunnel', 'Felsenherzturm', 'Sinjoh-Ruinen',
      'Team Rocket-Hauptquartier', 'Steineichenwald-Schrein', 'Wandernde Pokémon'
    ],
    'kristall': [
      'Alph-Ruinen', 'Glockenturm', 'Johto-Safari-Zone', 'Route 47', 'Route 48',
      'Route 28', 'Felstunnel', 'Felsenherzturm', 'Sinjoh-Ruinen',
      'Team Rocket-Hauptquartier', 'Steineichenwald-Schrein', 'Wandernde Pokémon'
    ],
    'heartgold-soulsilver': [
      'Alph-Ruinen', 'Glockenturm', 'Johto-Safari-Zone', 'Route 47', 'Route 48',
      'Route 28', 'Felstunnel', 'Felsenherzturm', 'Sinjoh-Ruinen',
      'Team Rocket-Hauptquartier', 'Steineichenwald-Schrein', 'Wandernde Pokémon'
    ],
    'rubin-saphir': [
      'Schiffswrack', 'Urzeithöhle', 'Team Aquas Versteck', 'Team Magmas Versteck',
      'Inselhöhle', 'Grabmal', 'Terrahöhle', 'Ozeanhöhle',
      'Ferneiland', 'Wandelhöhle', 'Entstehungsinsel', 'Nabelfels', 'Wandernde Pokémon'
    ],
    'smaragd': [
      'Schiffswrack', 'Urzeithöhle', 'Neu Malvenfroh', 'Team Aquas Versteck',
      'Team Magmas Versteck', 'Inselhöhle', 'Grabmal', 'Terrahöhle', 'Ozeanhöhle',
      'Ferneiland', 'Insel im Süden', 'Entstehungsinsel', 'Nabelfels', 'Wandelhöhle',
      'Höhlenatelier', 'Wunderinsel', 'Prachtpolis City', 'Seegrasulb City',
      'Kampfzone (Hoenn)', 'Wandernde Pokémon'
    ],
    'omega-rot-alpha-saphir': [
      'Schiffswrack', 'Urzeithöhle', 'Neu Malvenfroh', 'Team Aquas Versteck',
      'Team Magmas Versteck', 'Inselhöhle', 'Grabmal', 'Terrahöhle', 'Ozeanhöhle',
      'Ferneiland', 'Insel im Süden', 'Entstehungsinsel', 'Nabelfels', 'Wandelhöhle',
      'Höhlenatelier', 'Wunderinsel', 'Prachtpolis City', 'Seegrasulb City',
      'Kampfzone (Hoenn)', 'Wandernde Pokémon'
    ],
    'diamant-perl': [
      'Speersäule', 'Zerrwelt', 'Höhle der Umkehr', 'Scheidequelle', 'Alte Villa',
      'Erzelingen-Mine', 'Feurio-Hütte', 'Trostu-Ruinen', 'Pokémon-Landgut',
      'Blizzach-Tempel', 'Auen von Flori', 'Elyses', 'Maniac-Tunnel', 'Erholungsareal',
      'Blumenparadies', 'Neumondinsel', 'Vollmondinsel', 'Halle des Beginns',
      'Sinjoh-Ruinen', 'Wandernde Pokémon'
    ],
    'platin': [
      'Speersäule', 'Zerrwelt', 'Höhle der Umkehr', 'Scheidequelle', 'Alte Villa',
      'Erzelingen-Mine', 'Feurio-Hütte', 'Trostu-Ruinen', 'Pokémon-Landgut',
      'Blizzach-Tempel', 'Auen von Flori', 'Elyses', 'Maniac-Tunnel', 'Erholungsareal',
      'Blumenparadies', 'Neumondinsel', 'Vollmondinsel', 'Halle des Beginns',
      'Sinjoh-Ruinen', 'Wandernde Pokémon'
    ],
    'bdsp': [
      'Speersäule', 'Zerrwelt', 'Höhle der Umkehr', 'Scheidequelle', 'Alte Villa',
      'Erzelingen-Mine', 'Feurio-Hütte', 'Trostu-Ruinen', 'Pokémon-Landgut',
      'Blizzach-Tempel', 'Auen von Flori', 'Elyses', 'Maniac-Tunnel', 'Erholungsareal',
      'Blumenparadies', 'Neumondinsel', 'Vollmondinsel', 'Halle des Beginns',
      'Sinjoh-Ruinen', 'Wandernde Pokémon'
    ],
    'schwarz-weiss': [
      'Tiefkühlcontainer', 'Drachenstiege', 'Schloss von N', 'Schrein der Ernte',
      'Höhle der Schulung', 'Wendelberg', 'Marea-Zugbrücke', 'Bucht von Ondula',
      'Ondula', 'Dorfbrücke', 'Kammer der Weisung', 'Kammer der Prüfung'
    ],
    'schwarz2-weiss2': [
      'Tiefkühlcontainer', 'Drachenstiege', 'Schrein der Ernte', 'Höhle der Schulung',
      'Wendelberg', 'Marea-Zugbrücke', 'Bucht von Ondula', 'Ondula', 'Dorfbrücke',
      'Kammer der Weisung', 'Kammer der Prüfung', 'Riesengraben'
    ],
    'x-y': [
      'Geolinkhöhle', 'Hotelruine', 'Meerestitanenhöhle', 'Flare-Geheimbasis',
      'Geheimdungeon', 'Turm der Erkenntnis', 'Mosaia', 'Kalos (wandernd)'
    ],
    'sonne-mond': [
      'Melemele-See', 'Akala-Außenbereich', 'Po-Stadt', 'Wandernde Pokémon'
    ],
    'ultrasonne-ultramond': [
      'Melemele-See', 'Akala-Außenbereich', 'Po-Stadt', 'Wandernde Pokémon'
    ],
    'schwert-schild': [
      'Energiewerk', 'Dyna-Riesennest', 'Kronentempel', 'Hügel des Dyna-Baums',
      'Gipfelruinen', 'Eisberg-Ruinen', 'Eisen-Ruinen', 'Zwiespaltruinen',
      'Ballsee-Ufer'
    ],
    'karmesin-purpur': [
      'Labor Null', 'Schrein des modrigen Holzes', 'Schrein des entzweiten Eises',
      'Schrein der unreinen Erde', 'Schrein der finsteren Flamme'
    ],
  };

  const LOCATION_EXTRAS = {
    'rot-blau': [
      'Alabastia', 'Vertania City', 'Marmoria City', 'Azuria City', 'Orania City',
      'Lavandia', 'Prismania City', 'Saffronia City', 'Fuchsania City', 'Zinnoberinsel'
    ],
    'feuerrot-blattgruen': [
      'Alabastia', 'Vertania City', 'Marmoria City', 'Azuria City', 'Orania City',
      'Lavandia', 'Prismania City', 'Saffronia City', 'Fuchsania City', 'Zinnoberinsel',
      'Bondbrücke', 'Wasserirrgarten', 'Fünf-Eiland-Weide'
    ],
    'heartgold-soulsilver': [
      'Neuborkia', 'Rosalia City', 'Viola City', 'Azalea City', 'Dukatia City',
      'Teak City', 'Oliviana City', 'Anemonia City', 'Mahagonia', 'Ebenholz City',
      'Alabastia', 'Vertania City', 'Marmoria City', 'Azuria City', 'Orania City',
      'Lavandia', 'Prismania City', 'Saffronia City', 'Fuchsania City', 'Zinnoberinsel'
    ],
    'smaragd': [
      'Wurzelheim', 'Rosaltstadt', 'Blütenburg City', 'Metarost City', 'Faustauhaven',
      'Graphitport City', 'Malvenfroh City', 'Bad Lavastadt', 'Laubwechselfeld',
      'Wiesenflur', 'Baumhausen City', 'Moosbach City', 'Xeneroville', 'Floßbrunn'
    ],
    'platin': [
      'Zweiblattdorf', 'Sandgemme', 'Jubelstadt', 'Erzelingen', 'Flori', 'Ewigenau',
      'Herzhofen', 'Trostu', 'Weideburg', 'Schleiede', 'Blizzach', 'Fleetburg',
      'Sonnewik', 'Pokémon Liga', 'Eiseninsel', 'Kühnheitsufer', 'Stärkeufer'
    ],
    'schwarz-weiss': [
      'Avenitia', 'Gavina', 'Orion City', 'Septerna City', 'Stratos City', 'Rayono City',
      'Marea City', 'Panaero City', 'Nevaio City', 'Twindrake City', 'Pokémon Liga'
    ],
    'x-y': [
      'Escissia', 'Aquarellia', 'Nouvaria City', 'Illumina City', 'Relievera City',
      'Petrophia', 'Yantara City', 'Tempera City', 'Romantia City', 'Frescora',
      'Fluxia City', 'Fractalia City', 'Pokémon Liga'
    ],
    'schwert-schild': [
      'Furlongham', 'Brassbury', 'Engine City', 'Turffield', 'Keelton',
      'Passbeck', 'Fairballey', 'Circhester', 'Spikeford', 'Score City'
    ],
    'karmesin-purpur': [
      'Cabo Poco', 'Mesalona City', 'Moldrid', 'Fermanca City', 'Garrafosa City',
      'Asarilla', 'Frigomonta', 'Bolardin', 'Pinchores', 'Tera-Raid', 'Massenausbruch'
    ],
  };

  const LOCATION_ORDER = {
    'rot-blau': [
      'Alabastia', 'Route 1', 'Vertania City', 'Route 22', 'Route 2', 'Vertania-Wald',
      'Marmoria City', 'Route 3', 'Mondberg', 'Route 4', 'Azuria City', 'Route 24', 'Route 25',
      'Route 5', 'Route 6', 'Orania City', 'Digda-Höhle', 'Route 11', 'Route 9', 'Route 10',
      'Felstunnel', 'Lavandia', 'Route 8', 'Route 7', 'Prismania City', 'Saffronia City',
      'Route 16', 'Route 17', 'Route 18', 'Fuchsania City', 'Safari-Zone', 'Route 12',
      'Route 13', 'Route 14', 'Route 15', 'Route 19', 'Route 20', 'Seeschauminseln',
      'Zinnoberinsel', 'Pokémon-Haus', 'Route 21', 'Kraftwerk', 'Route 23', 'Siegesstraße',
      'Unbekannter Dungeon', 'Geschenk / Tausch'
    ],
    'feuerrot-blattgruen': [
      'Alabastia', 'Route 1', 'Vertania City', 'Route 22', 'Route 2', 'Vertania-Wald',
      'Marmoria City', 'Route 3', 'Mondberg', 'Route 4', 'Azuria City', 'Route 24', 'Route 25',
      'Route 5', 'Route 6', 'Orania City', 'Digda-Höhle', 'Route 11', 'Route 9', 'Route 10',
      'Felstunnel', 'Lavandia', 'Route 8', 'Route 7', 'Prismania City', 'Saffronia City',
      'Route 16', 'Route 17', 'Route 18', 'Fuchsania City', 'Safari-Zone', 'Route 12',
      'Route 13', 'Route 14', 'Route 15', 'Route 19', 'Route 20', 'Seeschauminseln',
      'Zinnoberinsel', 'Pokémon-Haus', 'Route 21', 'Kraftwerk', 'Route 23', 'Siegesstraße',
      'Eiland 1', 'Schatzgestade', 'Glutberg', 'Eiland 2', 'Kap Kante', 'Eiland 3',
      'Bondbrücke', 'Beerenforst', 'Eiland 4', 'Eiskaskadenhöhle', 'Eiland 5',
      'Wasserirrgarten', 'Fünf-Eiland-Weide', 'Eiland 6', 'Musterbuschwald', 'Eiland 7',
      'Trainerturm', 'Geschenk / Tausch'
    ],
    'heartgold-soulsilver': [
      'Neuborkia', 'Route 29', 'Route 46', 'Rosalia City', 'Route 30', 'Route 31',
      'Dunkelhöhle', 'Viola City', 'Knofensa-Turm', 'Route 32', 'Einheitstunnel',
      'Route 33', 'Azalea City', 'Flegmon-Brunnen', 'Steineichenwald', 'Route 34',
      'Dukatia City', 'Route 35', 'Nationalpark', 'Route 36', 'Route 37', 'Teak City',
      'Turmruine', 'Route 38', 'Route 39', 'Oliviana City', 'Route 40', 'Route 41',
      'Strudelinseln', 'Anemonia City', 'Route 42', 'Kesselberg', 'Mahagonia',
      'Route 43', 'See des Zorns', 'Route 44', 'Eispfad', 'Ebenholz City',
      'Route 45', 'Drachenhöhle', 'Tohjo-Fälle', 'Route 27', 'Route 26',
      'Siegesstraße', 'Alabastia', 'Route 1', 'Vertania City', 'Route 2',
      'Vertania-Wald', 'Marmoria City', 'Route 3', 'Mondberg', 'Route 4',
      'Azuria City', 'Route 24', 'Route 25', 'Route 5', 'Route 6', 'Orania City',
      'Route 11', 'Digda-Höhle', 'Route 9', 'Route 10', 'Kraftwerk', 'Route 8',
      'Lavandia', 'Saffronia City', 'Route 7', 'Prismania City', 'Route 16',
      'Route 17', 'Route 18', 'Fuchsania City', 'Route 12', 'Route 13', 'Route 14',
      'Route 15', 'Route 19', 'Route 20', 'Seeschauminseln', 'Zinnoberinsel',
      'Route 21', 'Azuria-Höhle', 'Silberberg', 'Geschenk / Tausch'
    ],
    'smaragd': [
      'Wurzelheim', 'Route 101', 'Rosaltstadt', 'Route 103', 'Route 102',
      'Blütenburg City', 'Route 104', 'Blütenburgwald', 'Metarost City',
      'Route 116', 'Metarost-Tunnel', 'Route 105', 'Route 106', 'Faustauhaven',
      'Granithöhle', 'Route 107', 'Route 108', 'Route 109', 'Graphitport City',
      'Route 110', 'Malvenfroh City', 'Route 117', 'Wiesenflur', 'Route 111',
      'Feuriger Pfad', 'Route 112', 'Schlotberg', 'Steilpass', 'Bad Lavastadt',
      'Route 113', 'Laubwechselfeld', 'Route 114', 'Meteorfälle', 'Route 115',
      'Wüstenruine', 'Route 118', 'Route 119', 'Baumhausen City', 'Route 120',
      'Route 121', 'Safari-Zone', 'Route 122', 'Pyroberg', 'Route 123',
      'Route 124', 'Moosbach City', 'Route 125', 'Küstenhöhle', 'Route 126',
      'Xeneroville', 'Route 127', 'Route 128', 'Tiefseehöhle', 'Route 129',
      'Route 130', 'Route 131', 'Himmelturm', 'Route 132', 'Route 133',
      'Route 134', 'Siegesstraße', 'Wunderturm', 'Wüstenunterführung',
      'Geschenk / Tausch'
    ],
    'platin': [
      'Zweiblattdorf', 'See der Wahrheit', 'Route 201', 'Sandgemme', 'Route 202',
      'Jubelstadt', 'Route 203', 'Erzelingen-Tor', 'Erzelingen', 'Route 204',
      'Verwüsteter Pfad', 'Flori', 'Windkraftwerk', 'Route 205', 'Ewigwald',
      'Ewigenau', 'Route 206', 'Bizarre Höhle', 'Route 207', 'Kraterberg',
      'Route 208', 'Herzhofen', 'Route 209', 'Turm der Ruhenden', 'Trostu',
      'Route 210', 'Route 215', 'Schleiede', 'Route 214', 'Ruinengrotte',
      'Kühnheitsufer', 'See der Kühnheit', 'Route 213', 'Weideburg',
      'Großmoor', 'Route 212', 'Route 211', 'Route 216', 'Route 217',
      'Stärkeufer', 'See der Stärke', 'Blizzach', 'Fleetburg', 'Route 218',
      'Eiseninsel', 'Route 219', 'Route 220', 'Route 221', 'Sonnewik',
      'Route 222', 'Route 223', 'Pokémon Liga', 'Siegesstraße', 'Route 224',
      'Route 225', 'Route 226', 'Route 227', 'Kahlberg', 'Route 228',
      'Route 229', 'Route 230', 'Sendeturm / Geschenk'
    ],
    'schwarz-weiss': [
      'Avenitia', 'Route 1', 'Gavina', 'Route 2', 'Orion City', 'Traumbrache',
      'Route 3', 'Septerna City', 'Grundwassersenke', 'Ewigenwald', 'Stratos City',
      'Route 4', 'Wüstenresort', 'Alter Palast', 'Rayono City', 'Route 5',
      'Route 16', 'Hain der Täuschung', 'Route 6', 'Marea City', 'Elektrolithhöhle',
      'Panaero City', 'Route 7', 'Turm des Himmels', 'Route 8', 'Moor von Nevaio',
      'Nevaio City', 'Route 9', 'Twindrake City', 'Route 10', 'Siegesstraße',
      'Route 11', 'Wunderbrücke', 'Route 12', 'Route 13', 'Riesengrotte',
      'Route 14', 'Weißer Wald / Schwarze Stadt', 'Route 15', 'Panaero-Höhle',
      'Route 17', 'Route 18', 'P2-Labor', 'Freiheitsgarten', 'Geschenk / Tausch'
    ],
    'x-y': [
      'Escissia', 'Route 2', 'Nouvaria-Wald', 'Nouvaria City', 'Route 3',
      'Illumina City', 'Route 4', 'Route 5', 'Route 6', 'Parfum-Palast',
      'Route 7', 'Route 8', 'Relievera City', 'Route 9', 'Glitzerhöhle',
      'Petrophia', 'Route 10', 'Yantara City', 'Route 11', 'Spiegelhöhle',
      'Route 12', 'Tempera City', 'Azurbucht', 'Route 13', 'Route 14',
      'Romantia City', 'Route 15', 'Route 16', 'Frosthöhle', 'Frescora',
      'Route 17', 'Route 18', 'Fluxia City', 'Omega-Höhle', 'Route 19',
      'Fractalia City', 'Route 20', 'Pokémon-Dorf', 'Route 21', 'Route 22',
      'Siegesstraße', 'Kontaktsafari', 'Geschenk / Tausch'
    ],
    'schwert-schild': [
      'Furlongham', 'Route 1', 'Brassbury', 'Route 2', 'Schlummerwald',
      'Engine City', 'Route 3', 'Galar-Mine 1', 'Route 4', 'Turffield',
      'Galar-Mine 2', 'Keelton', 'Route 5', 'Passbeck', 'Fairballey',
      'Route 6', 'Wipfelscheinwald', 'Route 7', 'Route 8', 'Circhester',
      'Route 9', 'Spikeford', 'Route 10', 'Score City', 'Naturzone: Waipio-Ebene',
      'Naturzone: Milza-See', 'Naturzone: Wachturmruine', 'Naturzone: Brückental',
      'Naturzone: Sandsturmkessel', 'Naturzone: Spiegel des Giganten',
      'Naturzone: Milotic-See', 'Dyna-Raid', 'Rüstungsinsel', 'Kronen-Schneelande',
      'Geschenk / Tausch'
    ],
    'karmesin-purpur': [
      'Cabo Poco', 'Cucharico-Pfad', 'Mesalona City', 'Südliche Zone 1',
      'Südliche Zone 2', 'Südliche Zone 4', 'Südliche Zone 3', 'Moldrid',
      'Östliche Zone 1', 'Östliche Zone 2', 'Östliche Zone 3', 'Fermanca City',
      'Westliche Zone 1', 'Brutzelwüste', 'Garrafosa City', 'Westliche Zone 2',
      'Asarilla', 'Asarilla-Grotte', 'Westliche Zone 3', 'Caldero-See',
      'Montanata', 'Schmierhain', 'Nördliche Zone 1', 'Nördliche Zone 2',
      'Nördliche Zone 3', 'Zone Null', 'Felstunnel', 'Tera-Raid', 'Massenausbruch',
      'Geschenk / Tausch'
    ],
  };

  const STARTER_LOCATION = 'Starter-Pokémon';

  // Englische Anzeige eines Ortes (Schlüssel bleibt deutsch)
  function label(location, lang) {
    if (!location || (lang || root.LANG) !== 'en') return location || '';
    return LOCATION_LABELS_EN[location] || location
      .replaceAll('Pokémon Liga', 'Pokémon League')
      .replaceAll('Geschenk', 'Gift')
      .replaceAll('Tausch', 'Trade')
      .replaceAll('Höhle', 'Cave')
      .replaceAll('Wald', 'Forest')
      .replaceAll('See', 'Lake')
      .replaceAll('Stadt', 'City');
  }

  // Alle bekannten Orte eines Spiels
  function known(game) {
    return new Set([STARTER_LOCATION, ...(LOCATION_PRESETS[game] || []), ...(LOCATION_SPECIALS[game] || []),
      ...(LOCATION_EXTRAS[game] || []), ...(LOCATION_ORDER[game] || [])]);
  }

  // Orte mit Begegnungen in Spielreihenfolge: Starter, Routen/Gebiete, dann besondere Orte. Städte (EXTRAS)
  // fehlen – die meisten haben keine wilden Pokémon; sie bleiben über known() wählbar.
  function encounterList(game) {
    const want = new Set([...(LOCATION_PRESETS[game] || []), ...(LOCATION_SPECIALS[game] || [])]);
    const order = LOCATION_ORDER[game] || [];
    const ordered = order.filter(l => want.has(l));
    const rest = [...want].filter(l => !ordered.includes(l));
    return [STARTER_LOCATION, ...ordered, ...rest];
  }

  root.PokeHubLocations = {
    STARTER_LOCATION, LOCATION_LABELS_EN, LOCATION_PRESETS, LOCATION_SPECIALS, LOCATION_EXTRAS, LOCATION_ORDER,
    label, known, encounterList
  };
})(window);
