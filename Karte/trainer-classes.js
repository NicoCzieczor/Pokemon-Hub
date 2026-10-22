/*
 * Trainerklassen und Trainernamen auf Deutsch/Englisch – gemeinsam genutzt von der Karte und dem Boss-Planer.
 * Klassen sind die Spiel-Konstanten aus pret/pokeplatinum ohne „TRAINER_CLASS_“.
 * Unsichere deutsche Klassennamen bleiben bewusst englisch.
 */
(function () {
  'use strict';

  const CLASS_NAMES = {
    YOUNGSTER: ['Knirps', 'Youngster'], LASS: ['Göre', 'Lass'], BUG_CATCHER: ['Käfersammler', 'Bug Catcher'],
    CAMPER: ['Camper', 'Camper'], PICNICKER: ['Picknicker', 'Picnicker'], HIKER: ['Wanderer', 'Hiker'],
    FISHERMAN: ['Angler', 'Fisherman'], SAILOR: ['Matrose', 'Sailor'], BLACK_BELT: ['Schwarzgurt', 'Black Belt'],
    BATTLE_GIRL: ['Kämpferin', 'Battle Girl'], ACE_TRAINER_MALE: ['Ass-Trainer', 'Ace Trainer'], ACE_TRAINER_FEMALE: ['Ass-Trainerin', 'Ace Trainer'],
    ACE_TRAINER_SNOW_MALE: ['Ass-Trainer', 'Ace Trainer'], ACE_TRAINER_SNOW_FEMALE: ['Ass-Trainerin', 'Ace Trainer'],
    AROMA_LADY: ['Aroma-Lady', 'Aroma Lady'], ARTIST: ['Künstler', 'Artist'], BEAUTY: ['Schönheit', 'Beauty'],
    BREEDER_MALE: ['Pokémon-Züchter', 'Pokémon Breeder'], BREEDER_FEMALE: ['Pokémon-Züchterin', 'Pokémon Breeder'],
    CAMERAMAN: ['Kameramann', 'Cameraman'], COLLECTOR: ['Sammler', 'Collector'], COWGIRL: ['Cowgirl', 'Cowgirl'],
    CYCLIST_MALE: ['Radler', 'Cyclist'], CYCLIST_FEMALE: ['Radlerin', 'Cyclist'], GENTLEMAN: ['Gentleman', 'Gentleman'],
    GUITARIST: ['Gitarrist', 'Guitarist'], JOGGER: ['Jogger', 'Jogger'], LADY: ['Lady', 'Lady'], NINJA_BOY: ['Ninjajunge', 'Ninja Boy'],
    PARASOL_LADY: ['Schirmdame', 'Parasol Lady'], POLICEMAN: ['Polizist', 'Policeman'], POKEFAN_MALE: ['Pokéfan', 'Poké Fan'],
    POKEFAN_FEMALE: ['Pokéfan', 'Poké Fan'], RANGER_MALE: ['Pokémon-Ranger', 'Pokémon Ranger'], RANGER_FEMALE: ['Pokémon-Ranger', 'Pokémon Ranger'],
    REPORTER: ['Reporterin', 'Reporter'], RUIN_MANIAC: ['Ruinenmaniac', 'Ruin Maniac'], SCHOOL_KID_MALE: ['Schüler', 'School Kid'],
    SCHOOL_KID_FEMALE: ['Schülerin', 'School Kid'], SCIENTIST: ['Wissenschaftler', 'Scientist'], SKIER_MALE: ['Skifahrer', 'Skier'],
    SKIER_FEMALE: ['Skifahrerin', 'Skier'], SWIMMER_MALE: ['Schwimmer', 'Swimmer'], SWIMMER_FEMALE: ['Schwimmerin', 'Swimmer'],
    TWINS: ['Zwillinge', 'Twins'], VETERAN: ['Veteran', 'Veteran'], WAITRESS: ['Kellnerin', 'Waitress'], WORKER: ['Arbeiter', 'Worker'],
    GALACTIC_GRUNT_MALE: ['Galaktik-Rüpel', 'Galactic Grunt'], GALACTIC_GRUNT_FEMALE: ['Galaktik-Rüpel', 'Galactic Grunt'],
    GALACTIC_BOSS: ['Galaktik-Boss', 'Galactic Boss'], RIVAL: ['Rivale', 'Rival'],
    BIRD_KEEPER: ['Bird Keeper', 'Bird Keeper'], DRAGON_TAMER: ['Dragon Tamer', 'Dragon Tamer'], PI: ['P.I.', 'P.I.'],
    POKE_KID: ['Poké Kid', 'Poké Kid'], PSYCHIC_MALE: ['Psychic', 'Psychic'], PSYCHIC_FEMALE: ['Psychic', 'Psychic'],
    RANCHER: ['Rancher', 'Rancher'], RICH_BOY: ['Rich Boy', 'Rich Boy'], SOCIALITE: ['Socialite', 'Socialite'],
    TUBER_MALE: ['Tuber', 'Tuber'], TUBER_FEMALE: ['Tuber', 'Tuber'], ROUGHNECK: ['Roughneck', 'Roughneck'], MAID: ['Maid', 'Maid'],
    DOUBLE_TEAM: ['Double Team', 'Double Team'], YOUNG_COUPLE: ['Young Couple', 'Young Couple'], BELLE_AND_PA: ['Belle & Pa', 'Belle & Pa'],
  };
  const FEMALE_LEADERS = new Set(['GARDENIA', 'FANTINA', 'MAYLENE', 'CANDICE']);

  // Die Spieldaten kennen nur die englischen Namen – die wichtigsten Trainer heißen auf Deutsch anders
  const NAMES_DE = {
    Roark: 'Veit', Gardenia: 'Silvana', Fantina: 'Lamina', Maylene: 'Hilda', Wake: 'Marinus', Byron: 'Adam',
    Candice: 'Frida', Aaron: 'Herbaro', Bertha: 'Teresa', Flint: 'Ignaz', Cyrus: 'Zyrus',
  };

  function className(cls, en) {
    const L = en ? 1 : 0;
    if (CLASS_NAMES[cls]) return CLASS_NAMES[cls][L];
    if (cls.startsWith('LEADER_')) return en ? 'Gym Leader' : (FEMALE_LEADERS.has(cls.slice(7)) ? 'Arenaleiterin' : 'Arenaleiter');
    if (cls.startsWith('ELITE_FOUR_')) return en ? 'Elite Four' : 'Top Vier';
    if (cls.startsWith('COMMANDER_')) return 'Commander';
    if (cls.startsWith('CHAMPION_')) return en ? 'Champion' : 'Champ';
    return cls.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
  }
  // Der Rivale heißt in den Spieldaten „Cedric“ (Platzhalter – im Spiel steht der Name aus dem Spielstand)
  const trainerName = (name, en, cls) => (cls === 'RIVAL' ? 'Barry' : en ? name : NAMES_DE[name] || name);

  window.TrainerClasses = { CLASS_NAMES, className, trainerName };
})();
