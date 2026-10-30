const STORAGE_KEY = 'pokemon-run-dashboard-state';
const LANG_STORAGE_KEY = 'hub-lang'; // gleiche Sprache wie alle Seiten des Hubs
const POKEAPI_BASE_URL = 'https://pokeapi.co/api/v2';
const I18N = {
  de: {
    title: 'Run-Dashboard',
    subtitle: 'Tracke deinen aktuellen Run, deine Encounters, den nächsten Level Cap und die wichtigsten Notizen an einem Ort.',
    'nav.home': 'Home',
    'nav.run': 'Run',
    'nav.team': 'Team',
    'nav.duo': 'Duo',
    'nav.trio': 'Trio',
    'nav.catchrate': 'Fangrate',
    'nav.damage': 'Schaden',
    'nav.types': 'Typen',
    encounterTracker: 'Encounter Tracker',
    runSetup: 'Run-Setup',
    runName: 'Run-Name',
    runNamePlaceholder: 'z.B. Kanto Hardcore Run',
    game: 'Spiel',
    checkpoint: 'Checkpoint',
    nextFight: 'Nächster Kampf',
    levelCap: 'Level Cap',
    place: 'Ort',
    pokemon: 'Pokémon',
    pokemonChoose: 'Pokémon wählen...',
    status: 'Status',
    method: 'Art',
    add: 'Hinzufügen',
    randomizer: 'Randomizer',
    randoFrom: 'aus deiner Randomizer-ROM „{name}“.',
    randoLoadHint: 'Randomizer-Run: Lade oben deine randomisierte Platin-ROM – dann stehen hier die gewürfelten Pokémon der Route.',
    randoOldHint: 'Der Randomizer-Stand ist älter und kennt die wilden Pokémon noch nicht – lade die ROM oben einmal neu.',
    graveyard: 'Graveyard',
    notesTitle: 'Run-Notizen',
    notesPlaceholder: 'Strategien, Regeln, besondere Encounters...',
    autosave: 'Reset löscht alle Runs unwiderruflich.',
    emptyTitle: 'Noch kein Run',
    emptyText: 'Starte einen Run, um Encounters, Level Caps und deinen Graveyard zu tracken.',
    emptyCta: 'Neuen Run starten',
    reset: 'Reset',
    close: 'Schließen',
    pokemonSearchTitle: 'Pokémon suchen',
    pokemonSearchPlaceholder: 'Nach Pokémon suchen...',
    locationPlaceholder: 'Alle Pokémon aus dem Spiel',
    eliteChampion: 'Top Vier / Champion',
    typePrefix: 'Typ',
    checkpointProgress: 'Checkpoints',
    confirmReset: 'Alle Runs wirklich löschen?',
    confirmResetShort: 'Sicher?',
    confirmYes: 'Ja',
    confirmNo: 'Nein',
    newRun: 'Neuer Run',
    newRunTitle: 'Neuen Run erstellen',
    renameRunTitle: 'Run umbenennen',
    deleteRunTitle: 'Diesen Run löschen',
    deleteRunQuestion: 'Run löschen?',
    genAll: 'Alle',
    create: 'Erstellen',
    cancel: 'Abbrechen',
    runNamePlaceholder: 'Name (optional)',
    cpMark: 'Klick zum Markieren',
    cpUnmark: 'Klick zum Rücksetzen',
    noEncounters: 'Noch keine Encounters eingetragen.',
    emptyGraveyard: 'Noch leer.',
    deleteEncounterTitle: 'Encounter löschen',
    killTitle: 'Gestorben – optional mit Ort / Gegner',
    changeStatusTitle: 'Status wechseln',
    removeGraveyardTitle: 'Entfernen',
    starterBadge: 'Starter',
    loadingPokemon: 'Lade Pokémon...',
    pokemonLoadFailed: 'Pokémon konnten nicht geladen werden.',
    noRoutePokemon: 'Keine Routen-Encounters gefunden.',
    noPokemonOnRoute: 'Kein Pokémon auf dieser Route gefunden.',
    noPokemonFound: 'Kein Pokémon gefunden.',
    graveyardPokemonSearch: 'Graveyard-Pokémon suchen',
    encounterPokemonSearch: 'Encounter-Pokémon suchen',
    starterPokemon: 'Starter-Pokémon',
    noStarters: 'Keine Starter hinterlegt.',
    chooseStarter: 'Wähle deinen Starter für',
    freeSearchHint: 'Für diesen Eintrag wird die normale Pokémon-Suche genutzt.',
    chooseLocationHint: 'Wähle einen Ort, um die Suche auf Routen-Encounters einzugrenzen.',
    noWildEncounters: 'Keine wilden oder Angel-Encounters hinterlegt.',
    encountersLoading: 'Encounters werden geladen ...',
    possibleEncounters: 'mögliche Encounters',
    forGame: 'für',
    noWildInGame: 'Keine wilden oder Angel-Encounters in {game} hinterlegt.',
    'stat.caught': 'Gefangen',
    'stat.open': 'Offen',
    'stat.failed': 'Verpasst',
    'stat.graveyard': 'Graveyard',
    'status.caught': 'Gefangen',
    'status.open': 'Offen',
    'placeUsed': 'eingetragen',
    'status.failed': 'Verpasst',
    'status.dead': 'Gestorben',
    statusMenuLabel: 'Status',
    deathCauseLabel: 'Wo / gegen wen? (optional)',
    deathCausePlaceholder: 'z. B. Volkner, Lv. 49',
    deathCauseSave: 'Speichern',
    dupe: 'Dupe',
    dupeTitle: 'Dupe – aus derselben Entwicklungsreihe hast du schon {p}',
    eeveeToggle: 'Evoli-Ausnahme',
    eeveeToggleTitle: 'Dupes-Klausel: Jede Evoli-Entwicklung zählt als eigene Art',
    undo: 'Rückgängig',
    undoEncounter: 'Encounter gelöscht',
    undoGrave: 'Aus dem Graveyard entfernt',
    undoRevived: 'Wieder auf „Gefangen“ gesetzt',
    'method.wild': 'Wild',
    'method.grass': 'Gras',
    'method.fishing': 'Angeln',
    'method.surf': 'Surfen',
    'method.cave': 'Höhle',
    'method.starter': 'Starter',
    'method.static': 'Static',
    'method.gift': 'Geschenk',
    'method.raid': 'Raid',
    'method.trade': 'Tausch',
    'method.other': 'Sonstiges',
    'summary.walk': 'Gras/Höhle',
    'summary.fishing': 'Angeln',
    'summary.surf': 'Surfen',
    'summary.rockSmash': 'Zertrümmerer',
    'summary.headbutt': 'Kopfnuss',
  },
  en: {
    title: 'Run Dashboard',
    subtitle: 'Track your current run, encounters, next level cap, and key notes in one place.',
    'nav.home': 'Home',
    'nav.run': 'Run',
    'nav.team': 'Team',
    'nav.duo': 'Duo',
    'nav.trio': 'Trio',
    'nav.catchrate': 'Catch Rate',
    'nav.damage': 'Damage',
    'nav.types': 'Types',
    encounterTracker: 'Encounter Tracker',
    runSetup: 'Run Setup',
    runName: 'Run Name',
    runNamePlaceholder: 'e.g. Kanto Hardcore Run',
    game: 'Game',
    checkpoint: 'Checkpoint',
    nextFight: 'Next Fight',
    levelCap: 'Level Cap',
    place: 'Location',
    pokemon: 'Pokémon',
    pokemonChoose: 'Choose Pokémon...',
    status: 'Status',
    method: 'Method',
    add: 'Add',
    randomizer: 'Randomizer',
    randoFrom: 'from your randomizer ROM “{name}”.',
    randoLoadHint: 'Randomizer run: load your randomized Platinum ROM above – then the randomized Pokémon of the route show up here.',
    randoOldHint: 'The randomizer data is older and does not know the wild Pokémon yet – load the ROM again above.',
    graveyard: 'Graveyard',
    notesTitle: 'Run Notes',
    notesPlaceholder: 'Strategies, rules, special encounters...',
    autosave: 'Reset permanently deletes all runs.',
    emptyTitle: 'No run yet',
    emptyText: 'Start a run to track encounters, level caps and your graveyard.',
    emptyCta: 'Start new run',
    reset: 'Reset',
    close: 'Close',
    pokemonSearchTitle: 'Search Pokémon',
    pokemonSearchPlaceholder: 'Search Pokémon...',
    locationPlaceholder: 'All Pokémon from the game',
    eliteChampion: 'Elite Four / Champion',
    typePrefix: 'Type',
    checkpointProgress: 'Checkpoints',
    confirmReset: 'Really delete all runs?',
    confirmResetShort: 'Sure?',
    confirmYes: 'Yes',
    confirmNo: 'No',
    newRun: 'New run',
    newRunTitle: 'Create new run',
    renameRunTitle: 'Rename run',
    deleteRunTitle: 'Delete this run',
    deleteRunQuestion: 'Delete run?',
    genAll: 'All',
    create: 'Create',
    cancel: 'Cancel',
    runNamePlaceholder: 'Name (optional)',
    cpMark: 'click to mark',
    cpUnmark: 'click to reset',
    noEncounters: 'No encounters added yet.',
    emptyGraveyard: 'Still empty.',
    deleteEncounterTitle: 'Delete encounter',
    killTitle: 'Died – optionally with place / opponent',
    changeStatusTitle: 'Change status',
    removeGraveyardTitle: 'Remove',
    starterBadge: 'Starter',
    loadingPokemon: 'Loading Pokémon...',
    pokemonLoadFailed: 'Pokémon could not be loaded.',
    noRoutePokemon: 'No route encounters found.',
    noPokemonOnRoute: 'No Pokémon found on this route.',
    noPokemonFound: 'No Pokémon found.',
    graveyardPokemonSearch: 'Search Graveyard Pokémon',
    encounterPokemonSearch: 'Search Encounter Pokémon',
    starterPokemon: 'Starter Pokémon',
    noStarters: 'No starters configured.',
    chooseStarter: 'Choose your starter for',
    freeSearchHint: 'This entry uses the normal Pokémon search.',
    chooseLocationHint: 'Choose a location to limit the search to route encounters.',
    noWildEncounters: 'No wild or fishing encounters configured.',
    encountersLoading: 'Loading encounters ...',
    possibleEncounters: 'possible encounters',
    forGame: 'for',
    noWildInGame: 'No wild or fishing encounters configured in {game}.',
    'stat.caught': 'Caught',
    'stat.open': 'Open',
    'stat.failed': 'Missed',
    'stat.graveyard': 'Graveyard',
    'status.caught': 'Caught',
    'status.open': 'Open',
    'placeUsed': 'logged',
    'status.failed': 'Missed',
    'status.dead': 'Dead',
    statusMenuLabel: 'Status',
    deathCauseLabel: 'Where / against whom? (optional)',
    deathCausePlaceholder: 'e.g. Volkner, Lv. 49',
    deathCauseSave: 'Save',
    dupe: 'Dupe',
    dupeTitle: 'Dupe – you already have {p} from the same evolution line',
    eeveeToggle: 'Eevee exception',
    eeveeToggleTitle: 'Dupes clause: every Eeveelution counts as its own species',
    undo: 'Undo',
    undoEncounter: 'Encounter deleted',
    undoGrave: 'Removed from the graveyard',
    undoRevived: 'Set back to “Caught”',
    'method.wild': 'Wild',
    'method.grass': 'Grass',
    'method.fishing': 'Fishing',
    'method.surf': 'Surf',
    'method.cave': 'Cave',
    'method.starter': 'Starter',
    'method.static': 'Static',
    'method.gift': 'Gift',
    'method.raid': 'Raid',
    'method.trade': 'Trade',
    'method.other': 'Other',
    'summary.walk': 'Grass/Cave',
    'summary.fishing': 'Fishing',
    'summary.surf': 'Surf',
    'summary.rockSmash': 'Rock Smash',
    'summary.headbutt': 'Headbutt',
  },
};

window.LANG = I18N[localStorage.getItem(LANG_STORAGE_KEY)] ? localStorage.getItem(LANG_STORAGE_KEY) : 'de';

function t(key, replacements = {}) {
  let text = I18N[window.LANG]?.[key] || I18N.de[key] || key;
  Object.entries(replacements).forEach(([name, value]) => {
    text = text.replaceAll(`{${name}}`, value);
  });
  return text;
}

const GAME_LABELS_EN = {
  'rot-blau': 'Red / Blue',
  'gelb': 'Yellow',
  'feuerrot-blattgruen': 'FireRed / LeafGreen',
  'letsgo': "Let's Go",
  'gold-silber': 'Gold / Silver',
  'kristall': 'Crystal',
  'heartgold-soulsilver': 'HeartGold / SoulSilver',
  'rubin-saphir': 'Ruby / Sapphire',
  smaragd: 'Emerald',
  'omega-rot-alpha-saphir': 'OmegaRuby / AlphaSapphire',
  'diamant-perl': 'Diamond / Pearl',
  platin: 'Platinum',
  bdsp: 'BD / SP',
  'schwarz-weiss': 'Black / White',
  'schwarz2-weiss2': 'Black 2 / White 2',
  'x-y': 'X / Y',
  'sonne-mond': 'Sun / Moon',
  'ultrasonne-ultramond': 'Ultra Sun / Ultra Moon',
  'schwert-schild': 'Sword / Shield',
  'karmesin-purpur': 'Scarlet / Violet',
};

const TYPE_LABELS_EN = {
  Gestein: 'Rock',
  Wasser: 'Water',
  Elektro: 'Electric',
  Pflanze: 'Grass',
  Gift: 'Poison',
  Psycho: 'Psychic',
  Feuer: 'Fire',
  Boden: 'Ground',
  Flug: 'Flying',
  Käfer: 'Bug',
  Kampf: 'Fighting',
  Geist: 'Ghost',
  Stahl: 'Steel',
  Eis: 'Ice',
  Drache: 'Dragon',
  Fee: 'Fairy',
  Unlicht: 'Dark',
  Normal: 'Normal',
  'div.': 'various',
};

// Orte je Spiel und ihre englischen Namen: ../locations.js (teilen sich Run-Dashboard und Duo)
const { STARTER_LOCATION, LOCATION_PRESETS, LOCATION_SPECIALS, LOCATION_EXTRAS, LOCATION_ORDER } = window.PokeHubLocations;

const TRAINER_LABELS_EN = {
  Rocko: 'Brock',
  Surge: 'Lt. Surge',
  Pyro: 'Blaine',
  Agathe: 'Agatha',
  Siegfried: 'Lance',
  'Champion Blau': 'Champion Blue',
  'Champion Siegfried': 'Champion Lance',
  'Top Vier': 'Elite Four',
};

const CHECKPOINT_LABELS = {
  'rot-blau': {
    de: ['Rocko', 'Misty', 'Major Bob', 'Erika', 'Koga', 'Sabrina', 'Pyro', 'Giovanni', 'Lorelei', 'Bruno', 'Agathe', 'Siegfried', 'Champion Blau'],
    en: ['Brock', 'Misty', 'Lt. Surge', 'Erika', 'Koga', 'Sabrina', 'Blaine', 'Giovanni', 'Lorelei', 'Bruno', 'Agatha', 'Lance', 'Champion Blue'],
  },
  'feuerrot-blattgruen': {
    de: ['Rocko', 'Misty', 'Major Bob', 'Erika', 'Koga', 'Sabrina', 'Pyro', 'Giovanni', 'Lorelei', 'Bruno', 'Agathe', 'Siegfried', 'Champion Blau'],
    en: ['Brock', 'Misty', 'Lt. Surge', 'Erika', 'Koga', 'Sabrina', 'Blaine', 'Giovanni', 'Lorelei', 'Bruno', 'Agatha', 'Lance', 'Champion Blue'],
  },
  'heartgold-soulsilver': {
    de: ['Falk', 'Kai', 'Bianka', 'Jens', 'Hartwig', 'Jasmin', 'Norbert', 'Sandra', 'Will', 'Koga', 'Bruno', 'Melanie', 'Champion Siegfried', 'Rot'],
    en: ['Falkner', 'Bugsy', 'Whitney', 'Morty', 'Chuck', 'Jasmine', 'Pryce', 'Clair', 'Will', 'Koga', 'Bruno', 'Karen', 'Champion Lance', 'Red'],
  },
  smaragd: {
    de: ['Felizia', 'Kamillo', 'Walter', 'Flavia', 'Norman', 'Wibke', 'Ben & Svenja', 'Juan', 'Ulrich', 'Antonia', 'Frosina', 'Dragan', 'Champion Wassili'],
    en: ['Roxanne', 'Brawly', 'Wattson', 'Flannery', 'Norman', 'Winona', 'Tate & Liza', 'Juan', 'Sidney', 'Phoebe', 'Glacia', 'Drake', 'Champion Wallace'],
  },
  platin: {
    de: ['Veit', 'Silvana', 'Lamina', 'Hilda', 'Marinus', 'Adam', 'Frida', 'Volkner', 'Herbaro', 'Teresa', 'Ignaz', 'Lucian', 'Champion Cynthia'],
    en: ['Roark', 'Gardenia', 'Fantina', 'Maylene', 'Crasher Wake', 'Byron', 'Candice', 'Volkner', 'Aaron', 'Bertha', 'Flint', 'Lucian', 'Champion Cynthia'],
  },
  'schwarz-weiss': {
    de: ['Benny / Maik / Colin', 'Aloe', 'Artie', 'Kamilla', 'Turner', 'Géraldine', 'Sandro', 'Lysander / Lilia', 'Top Vier'],
    en: ['Cilan / Chili / Cress', 'Lenora', 'Burgh', 'Elesa', 'Clay', 'Skyla', 'Brycen', 'Drayden / Iris', 'Elite Four'],
  },
  'x-y': {
    de: ['Viola', 'Lino', 'Connie', 'Amaro', 'Citro', 'Valerie', 'Astrid', 'Galantho', 'Top Vier', 'Champion Diantha'],
    en: ['Viola', 'Grant', 'Korrina', 'Ramos', 'Clemont', 'Valerie', 'Olympia', 'Wulfric', 'Elite Four', 'Champion Diantha'],
  },
  'schwert-schild': {
    de: ['Yarro', 'Kate', 'Kabu', 'Saida / Nio', 'Papella', 'Mac / Mel', 'Nezz', 'Roy', 'Champion Delion'],
    en: ['Milo', 'Nessa', 'Kabu', 'Bea / Allister', 'Opal', 'Gordie / Melony', 'Piers', 'Raihan', 'Champion Leon'],
  },
  'karmesin-purpur': {
    de: ['Ronah', 'Colzo', 'Enigmara', 'Kombu', 'Aoki', 'Etta', 'Tulipa', 'Grusha', 'Top Vier', 'Champion Sagaria'],
    en: ['Katy', 'Brassius', 'Iono', 'Kofu', 'Larry', 'Ryme', 'Tulip', 'Grusha', 'Elite Four', 'Champion Geeta'],
  },
  'gelb': {
    de: ['Rocko', 'Misty', 'Major Bob', 'Erika', 'Koga', 'Sabrina', 'Pyro', 'Giovanni', 'Lorelei', 'Bruno', 'Agathe', 'Siegfried', 'Champion Blau'],
    en: ['Brock', 'Misty', 'Lt. Surge', 'Erika', 'Koga', 'Sabrina', 'Blaine', 'Giovanni', 'Lorelei', 'Bruno', 'Agatha', 'Lance', 'Champion Blue'],
  },
  'letsgo': {
    de: ['Rocko', 'Misty', 'Major Bob', 'Erika', 'Koga', 'Sabrina', 'Pyro', 'Giovanni', 'Lorelei', 'Bruno', 'Agathe', 'Siegfried', 'Champion Blau'],
    en: ['Brock', 'Misty', 'Lt. Surge', 'Erika', 'Koga', 'Sabrina', 'Blaine', 'Giovanni', 'Lorelei', 'Bruno', 'Agatha', 'Lance', 'Champion Blue'],
  },
  'gold-silber': {
    de: ['Falk', 'Kai', 'Bianka', 'Jens', 'Hartwig', 'Jasmin', 'Norbert', 'Sandra', 'Will', 'Koga', 'Bruno', 'Melanie', 'Champion Siegfried'],
    en: ['Falkner', 'Bugsy', 'Whitney', 'Morty', 'Chuck', 'Jasmine', 'Pryce', 'Clair', 'Will', 'Koga', 'Bruno', 'Karen', 'Champion Lance'],
  },
  'kristall': {
    de: ['Falk', 'Kai', 'Bianka', 'Jens', 'Hartwig', 'Jasmin', 'Norbert', 'Sandra', 'Will', 'Koga', 'Bruno', 'Melanie', 'Champion Siegfried'],
    en: ['Falkner', 'Bugsy', 'Whitney', 'Morty', 'Chuck', 'Jasmine', 'Pryce', 'Clair', 'Will', 'Koga', 'Bruno', 'Karen', 'Champion Lance'],
  },
  'rubin-saphir': {
    de: ['Felizia', 'Kamillo', 'Walter', 'Flavia', 'Norman', 'Wibke', 'Ben & Svenja', 'Wassili', 'Ulrich', 'Antonia', 'Frosina', 'Dragan', 'Champion Donar'],
    en: ['Roxanne', 'Brawly', 'Wattson', 'Flannery', 'Norman', 'Winona', 'Tate & Liza', 'Wallace', 'Sidney', 'Phoebe', 'Glacia', 'Drake', 'Champion Steven'],
  },
  'omega-rot-alpha-saphir': {
    de: ['Felizia', 'Kamillo', 'Walter', 'Flavia', 'Norman', 'Wibke', 'Ben & Svenja', 'Wassili', 'Ulrich', 'Antonia', 'Frosina', 'Dragan', 'Champion Donar'],
    en: ['Roxanne', 'Brawly', 'Wattson', 'Flannery', 'Norman', 'Winona', 'Tate & Liza', 'Wallace', 'Sidney', 'Phoebe', 'Glacia', 'Drake', 'Champion Steven'],
  },
  'diamant-perl': {
    de: ['Veit', 'Silvana', 'Hilda', 'Marinus', 'Lamina', 'Adam', 'Frida', 'Volkner', 'Herbaro', 'Teresa', 'Ignaz', 'Lucian', 'Champion Cynthia'],
    en: ['Roark', 'Gardenia', 'Maylene', 'Crasher Wake', 'Fantina', 'Byron', 'Candice', 'Volkner', 'Aaron', 'Bertha', 'Flint', 'Lucian', 'Champion Cynthia'],
  },
  'bdsp': {
    de: ['Veit', 'Silvana', 'Hilda', 'Marinus', 'Lamina', 'Adam', 'Frida', 'Volkner', 'Herbaro', 'Teresa', 'Ignaz', 'Lucian', 'Champion Cynthia'],
    en: ['Roark', 'Gardenia', 'Maylene', 'Crasher Wake', 'Fantina', 'Byron', 'Candice', 'Volkner', 'Aaron', 'Bertha', 'Flint', 'Lucian', 'Champion Cynthia'],
  },
  'schwarz2-weiss2': {
    de: ['Cheren', 'Roxie', 'Artie', 'Kamilla', 'Turner', 'Géraldine', 'Lysander', 'Marlon', 'Top Vier', 'Champion Iris'],
    en: ['Cheren', 'Roxie', 'Burgh', 'Elesa', 'Clay', 'Skyla', 'Drayden', 'Marlon', 'Elite Four', 'Champion Iris'],
  },
  'sonne-mond': {
    de: ['Hala (Kahuna)', 'Olivia (Kahuna)', 'Nanu (Kahuna)', 'Hapu (Kahuna)', 'Hala', 'Olivia', 'Acerola', 'Kahili', 'Champion Kukui'],
    en: ['Hala (Kahuna)', 'Olivia (Kahuna)', 'Nanu (Kahuna)', 'Hapu (Kahuna)', 'Hala', 'Olivia', 'Acerola', 'Kahili', 'Champion Kukui'],
  },
  'ultrasonne-ultramond': {
    de: ['Hala (Kahuna)', 'Olivia (Kahuna)', 'Nanu (Kahuna)', 'Hapu (Kahuna)', 'Hala', 'Olivia', 'Acerola', 'Kahili', 'Champion Kukui'],
    en: ['Hala (Kahuna)', 'Olivia (Kahuna)', 'Nanu (Kahuna)', 'Hapu (Kahuna)', 'Hala', 'Olivia', 'Acerola', 'Kahili', 'Champion Kukui'],
  },
};


function gameLabel(gameKey) {
  return window.LANG === 'en'
    ? (GAME_LABELS_EN[gameKey] || LEVEL_CAPS[gameKey]?.label || gameKey)
    : (LEVEL_CAPS[gameKey]?.label || gameKey);
}

function typeLabel(type) {
  if (!type || window.LANG !== 'en') return type || '';
  return String(type)
    .split('/')
    .map(part => TYPE_LABELS_EN[part.trim()] || part.trim())
    .join('/');
}

function checkpointNameLabel(entry, index, gameKey = state.game) {
  const labels = CHECKPOINT_LABELS[gameKey]?.[window.LANG];
  if (labels?.[index]) return labels[index];
  if (window.LANG === 'en') return TRAINER_LABELS_EN[entry.name] || entry.name;
  return entry.name;
}

function locationLabel(location) {
  return window.PokeHubLocations.label(location, window.LANG);
}

function pokemonNameLabel(pokemon) {
  if (!pokemon) return '';
  if (typeof pokemon === 'string') return pokemon;
  if (window.LANG === 'en') {
    return pokemon.englishName || (pokemon.name ? capitalize(pokemon.name) : '') || pokemon.displayName || pokemon.germanName || '';
  }
  return pokemon.germanName || pokemon.displayName || pokemon.englishName || (pokemon.name ? capitalize(pokemon.name) : '');
}

async function getGenerationList(gen = 1) {
  const ranges = {
    1: { limit: 151, offset: 0 },
    2: { limit: 100, offset: 151 },
    3: { limit: 135, offset: 251 },
    4: { limit: 107, offset: 386 },
    5: { limit: 156, offset: 493 },
    6: { limit: 72, offset: 649 },
    7: { limit: 88, offset: 721 },
    8: { limit: 96, offset: 809 },
    9: { limit: 120, offset: 905 },
  };
  const { limit, offset } = ranges[gen] || ranges[1];
  const response = await fetch(`${POKEAPI_BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
  if (!response.ok) throw new Error(`Generation ${gen} konnte nicht geladen werden`);
  const data = await response.json();
  return data.results;
}


const LEVEL_CAPS = {
  'rot-blau': { label: 'Rot / Blau', entries: [
    { name: 'Rocko', type: 'Gestein', cap: 14 },
    { name: 'Misty', type: 'Wasser', cap: 21 },
    { name: 'Surge', type: 'Elektro', cap: 24 },
    { name: 'Erika', type: 'Pflanze', cap: 29 },
    { name: 'Koga', type: 'Gift', cap: 43 },
    { name: 'Sabrina', type: 'Psycho', cap: 43 },
    { name: 'Pyro', type: 'Feuer', cap: 47 },
    { name: 'Giovanni', type: 'Boden', cap: 50 },
    { name: 'Lorelei', cap: 56 },
    { name: 'Bruno', cap: 58 },
    { name: 'Agathe', cap: 60 },
    { name: 'Siegfried', cap: 62 },
    { name: 'Champion Blau', cap: 65 },
  ]},
  'gelb': { label: 'Gelb', entries: [
    { name: 'Rocko', type: 'Gestein', cap: 12 },
    { name: 'Misty', type: 'Wasser', cap: 21 },
    { name: 'Surge', type: 'Elektro', cap: 28 },
    { name: 'Erika', type: 'Pflanze', cap: 32 },
    { name: 'Koga', type: 'Gift', cap: 43 },
    { name: 'Sabrina', type: 'Psycho', cap: 50 },
    { name: 'Pyro', type: 'Feuer', cap: 54 },
    { name: 'Giovanni', type: 'Boden', cap: 55 },
    { name: 'Lorelei', cap: 56 },
    { name: 'Bruno', cap: 58 },
    { name: 'Agathe', cap: 60 },
    { name: 'Siegfried', cap: 62 },
    { name: 'Champion Blau', cap: 65 },
  ]},
  'feuerrot-blattgruen': { label: 'Feuerrot / Blattgrün', entries: [
    { name: 'Rocko', type: 'Gestein', cap: 14 },
    { name: 'Misty', type: 'Wasser', cap: 21 },
    { name: 'Surge', type: 'Elektro', cap: 24 },
    { name: 'Erika', type: 'Pflanze', cap: 29 },
    { name: 'Koga', type: 'Gift', cap: 43 },
    { name: 'Sabrina', type: 'Psycho', cap: 43 },
    { name: 'Pyro', type: 'Feuer', cap: 47 },
    { name: 'Giovanni', type: 'Boden', cap: 50 },
    { name: 'Lorelei', cap: 54 },
    { name: 'Bruno', cap: 56 },
    { name: 'Agathe', cap: 58 },
    { name: 'Siegfried', cap: 60 },
    { name: 'Champion Blau', cap: 63 },
  ]},
  'letsgo': { label: "Let's Go", entries: [
    { name: 'Rocko', type: 'Gestein', cap: 12 },
    { name: 'Misty', type: 'Wasser', cap: 21 },
    { name: 'Surge', type: 'Elektro', cap: 28 },
    { name: 'Erika', type: 'Pflanze', cap: 31 },
    { name: 'Koga', type: 'Gift', cap: 38 },
    { name: 'Sabrina', type: 'Psycho', cap: 45 },
    { name: 'Pyro', type: 'Feuer', cap: 49 },
    { name: 'Giovanni', type: 'Boden', cap: 53 },
    { name: 'Lorelei', cap: 56 },
    { name: 'Bruno', cap: 58 },
    { name: 'Agathe', cap: 60 },
    { name: 'Siegfried', cap: 62 },
    { name: 'Champion Blau', cap: 65 },
  ]},
  'gold-silber': { label: 'Gold / Silber', entries: [
    { name: 'Falkner', type: 'Flug', cap: 9 },
    { name: 'Bugsy', type: 'Käfer', cap: 16 },
    { name: 'Whitney', type: 'Normal', cap: 20 },
    { name: 'Morty', type: 'Geist', cap: 25 },
    { name: 'Chuck', type: 'Kampf', cap: 30 },
    { name: 'Jasmine', type: 'Stahl', cap: 35 },
    { name: 'Pryce', type: 'Eis', cap: 31 },
    { name: 'Clair', type: 'Drache', cap: 40 },
    { name: 'Will', cap: 42 },
    { name: 'Koga', cap: 44 },
    { name: 'Bruno', cap: 46 },
    { name: 'Karen', cap: 47 },
    { name: 'Champion Siegfried', cap: 50 },
  ]},
  'kristall': { label: 'Kristall', entries: [
    { name: 'Falkner', type: 'Flug', cap: 9 },
    { name: 'Bugsy', type: 'Käfer', cap: 16 },
    { name: 'Whitney', type: 'Normal', cap: 20 },
    { name: 'Morty', type: 'Geist', cap: 25 },
    { name: 'Chuck', type: 'Kampf', cap: 30 },
    { name: 'Jasmine', type: 'Stahl', cap: 35 },
    { name: 'Pryce', type: 'Eis', cap: 31 },
    { name: 'Clair', type: 'Drache', cap: 40 },
    { name: 'Will', cap: 42 },
    { name: 'Koga', cap: 44 },
    { name: 'Bruno', cap: 46 },
    { name: 'Karen', cap: 47 },
    { name: 'Champion Siegfried', cap: 50 },
  ]},
  'heartgold-soulsilver': { label: 'HeartGold / SoulSilver', entries: [
    { name: 'Falkner', type: 'Flug', cap: 13 },
    { name: 'Bugsy', type: 'Käfer', cap: 17 },
    { name: 'Whitney', type: 'Normal', cap: 19 },
    { name: 'Morty', type: 'Geist', cap: 25 },
    { name: 'Chuck', type: 'Kampf', cap: 31 },
    { name: 'Jasmine', type: 'Stahl', cap: 35 },
    { name: 'Pryce', type: 'Eis', cap: 34 },
    { name: 'Clair', type: 'Drache', cap: 41 },
    { name: 'Will', cap: 42 },
    { name: 'Koga', cap: 44 },
    { name: 'Bruno', cap: 46 },
    { name: 'Karen', cap: 47 },
    { name: 'Champion Siegfried', cap: 50 },
    { name: 'Red', cap: 88 },
  ]},
  'rubin-saphir': { label: 'Rubin / Saphir', entries: [
    { name: 'Roxanne', type: 'Gestein', cap: 15 },
    { name: 'Brawly', type: 'Kampf', cap: 18 },
    { name: 'Wattson', type: 'Elektro', cap: 22 },
    { name: 'Flannery', type: 'Feuer', cap: 29 },
    { name: 'Norman', type: 'Normal', cap: 31 },
    { name: 'Winona', type: 'Flug', cap: 33 },
    { name: 'Tate & Liza', type: 'Psycho', cap: 42 },
    { name: 'Wallace', type: 'Wasser', cap: 44 },
    { name: 'Sidney', cap: 49 },
    { name: 'Phoebe', cap: 52 },
    { name: 'Glacia', cap: 52 },
    { name: 'Drake', cap: 55 },
    { name: 'Champion Steven', cap: 58 },
  ]},
  'smaragd': { label: 'Smaragd', entries: [
    { name: 'Roxanne', type: 'Gestein', cap: 15 },
    { name: 'Brawly', type: 'Kampf', cap: 19 },
    { name: 'Wattson', type: 'Elektro', cap: 24 },
    { name: 'Flannery', type: 'Feuer', cap: 29 },
    { name: 'Norman', type: 'Normal', cap: 31 },
    { name: 'Winona', type: 'Flug', cap: 33 },
    { name: 'Tate & Liza', type: 'Psycho', cap: 42 },
    { name: 'Juan', type: 'Wasser', cap: 46 },
    { name: 'Sidney', cap: 49 },
    { name: 'Phoebe', cap: 51 },
    { name: 'Glacia', cap: 53 },
    { name: 'Drake', cap: 55 },
    { name: 'Champion Wallace', cap: 58 },
  ]},
  'omega-rot-alpha-saphir': { label: 'Omega Rot / Alpha Saphir', entries: [
    { name: 'Roxanne', type: 'Gestein', cap: 15 },
    { name: 'Brawly', type: 'Kampf', cap: 19 },
    { name: 'Wattson', type: 'Elektro', cap: 24 },
    { name: 'Flannery', type: 'Feuer', cap: 29 },
    { name: 'Norman', type: 'Normal', cap: 31 },
    { name: 'Winona', type: 'Flug', cap: 33 },
    { name: 'Tate & Liza', type: 'Psycho', cap: 43 },
    { name: 'Wallace', type: 'Wasser', cap: 46 },
    { name: 'Sidney', cap: 50 },
    { name: 'Phoebe', cap: 52 },
    { name: 'Glacia', cap: 53 },
    { name: 'Drake', cap: 55 },
    { name: 'Champion Steven', cap: 58 },
  ]},
  'diamant-perl': { label: 'Diamant / Perl', entries: [
    { name: 'Roark', type: 'Gestein', cap: 14 },
    { name: 'Gardenia', type: 'Pflanze', cap: 22 },
    { name: 'Maylene', type: 'Kampf', cap: 30 },
    { name: 'Crasher Wake', type: 'Wasser', cap: 34 },
    { name: 'Fantina', type: 'Geist', cap: 38 },
    { name: 'Byron', type: 'Stahl', cap: 40 },
    { name: 'Candice', type: 'Eis', cap: 44 },
    { name: 'Volkner', type: 'Elektro', cap: 50 },
    { name: 'Aaron', cap: 54 },
    { name: 'Bertha', cap: 57 },
    { name: 'Flint', cap: 58 },
    { name: 'Lucian', cap: 60 },
    { name: 'Champion Cynthia', cap: 66 },
  ]},
  'platin': { label: 'Platin', entries: [
    { name: 'Roark', type: 'Gestein', cap: 14 },
    { name: 'Gardenia', type: 'Pflanze', cap: 22 },
    { name: 'Fantina', type: 'Geist', cap: 26 },
    { name: 'Maylene', type: 'Kampf', cap: 32 },
    { name: 'Crasher Wake', type: 'Wasser', cap: 37 },
    { name: 'Byron', type: 'Stahl', cap: 41 },
    { name: 'Candice', type: 'Eis', cap: 44 },
    { name: 'Volkner', type: 'Elektro', cap: 50 },
    { name: 'Aaron', cap: 53 },
    { name: 'Bertha', cap: 55 },
    { name: 'Flint', cap: 57 },
    { name: 'Lucian', cap: 59 },
    { name: 'Champion Cynthia', cap: 62 },
  ]},
  'bdsp': { label: 'Str. Diamant / L. Perle', entries: [
    { name: 'Roark', type: 'Gestein', cap: 14 },
    { name: 'Gardenia', type: 'Pflanze', cap: 22 },
    { name: 'Maylene', type: 'Kampf', cap: 28 },
    { name: 'Crasher Wake', type: 'Wasser', cap: 34 },
    { name: 'Fantina', type: 'Geist', cap: 36 },
    { name: 'Byron', type: 'Stahl', cap: 40 },
    { name: 'Candice', type: 'Eis', cap: 44 },
    { name: 'Volkner', type: 'Elektro', cap: 50 },
    { name: 'Aaron', cap: 53 },
    { name: 'Bertha', cap: 57 },
    { name: 'Flint', cap: 58 },
    { name: 'Lucian', cap: 59 },
    { name: 'Champion Cynthia', cap: 66 },
  ]},
  'schwarz-weiss': { label: 'Schwarz / Weiß', entries: [
    { name: 'Cilan / Chili / Cress', type: 'div.', cap: 14 },
    { name: 'Lenora', type: 'Normal', cap: 20 },
    { name: 'Burgh', type: 'Käfer', cap: 23 },
    { name: 'Elesa', type: 'Elektro', cap: 27 },
    { name: 'Clay', type: 'Boden', cap: 31 },
    { name: 'Skyla', type: 'Flug', cap: 35 },
    { name: 'Brycen', type: 'Eis', cap: 39 },
    { name: 'Drayden / Iris', type: 'Drache', cap: 43 },
    { name: 'Top Vier', cap: 50 },
  ]},
  'schwarz2-weiss2': { label: 'Schwarz 2 / Weiß 2', entries: [
    { name: 'Cheren', type: 'Normal', cap: 13 },
    { name: 'Roxie', type: 'Gift', cap: 18 },
    { name: 'Burgh', type: 'Käfer', cap: 24 },
    { name: 'Elesa', type: 'Elektro', cap: 30 },
    { name: 'Clay', type: 'Boden', cap: 33 },
    { name: 'Skyla', type: 'Flug', cap: 37 },
    { name: 'Drayden', type: 'Drache', cap: 48 },
    { name: 'Marlon', type: 'Wasser', cap: 51 },
    { name: 'Top Vier', cap: 57 },
    { name: 'Champion Iris', cap: 59 },
  ]},
  'x-y': { label: 'X / Y', entries: [
    { name: 'Viola', type: 'Käfer', cap: 12 },
    { name: 'Grant', type: 'Gestein', cap: 25 },
    { name: 'Korrina', type: 'Kampf', cap: 32 },
    { name: 'Ramos', type: 'Pflanze', cap: 34 },
    { name: 'Clemont', type: 'Elektro', cap: 37 },
    { name: 'Valerie', type: 'Fee', cap: 42 },
    { name: 'Olympia', type: 'Psycho', cap: 48 },
    { name: 'Wulfric', type: 'Eis', cap: 59 },
    { name: 'Top Vier', cap: 65 },
    { name: 'Champion Diantha', cap: 68 },
  ]},
  'sonne-mond': { label: 'Sonne / Mond', entries: [
    { name: 'Hala (Kahuna)', type: 'Kampf', cap: 16 },
    { name: 'Olivia (Kahuna)', type: 'Gestein', cap: 27 },
    { name: 'Nanu (Kahuna)', type: 'Unlicht', cap: 37 },
    { name: 'Hapu (Kahuna)', type: 'Boden', cap: 41 },
    { name: 'Hala', cap: 54 },
    { name: 'Olivia', cap: 55 },
    { name: 'Acerola', cap: 55 },
    { name: 'Kahili', cap: 55 },
    { name: 'Champion Kukui', cap: 58 },
  ]},
  'ultrasonne-ultramond': { label: 'Ultrasonne / Ultramond', entries: [
    { name: 'Hala (Kahuna)', type: 'Kampf', cap: 16 },
    { name: 'Olivia (Kahuna)', type: 'Gestein', cap: 27 },
    { name: 'Nanu (Kahuna)', type: 'Unlicht', cap: 37 },
    { name: 'Hapu (Kahuna)', type: 'Boden', cap: 41 },
    { name: 'Hala', cap: 54 },
    { name: 'Olivia', cap: 55 },
    { name: 'Acerola', cap: 55 },
    { name: 'Kahili', cap: 56 },
    { name: 'Champion Kukui', cap: 60 },
  ]},
  'schwert-schild': { label: 'Schwert / Schild', entries: [
    { name: 'Milo', type: 'Pflanze', cap: 20 },
    { name: 'Nessa', type: 'Wasser', cap: 24 },
    { name: 'Kabu', type: 'Feuer', cap: 27 },
    { name: 'Bea / Allister', type: 'Kampf/Geist', cap: 36 },
    { name: 'Opal', type: 'Fee', cap: 38 },
    { name: 'Gordie / Melony', type: 'Gestein/Eis', cap: 42 },
    { name: 'Piers', type: 'Unlicht', cap: 46 },
    { name: 'Raihan', type: 'Drache', cap: 48 },
    { name: 'Champion Leon', cap: 65 },
  ]},
  'karmesin-purpur': { label: 'Karmesin / Purpur', entries: [
    { name: 'Katy', type: 'Käfer', cap: 15 },
    { name: 'Brassius', type: 'Pflanze', cap: 17 },
    { name: 'Iono', type: 'Elektro', cap: 24 },
    { name: 'Kofu', type: 'Wasser', cap: 30 },
    { name: 'Larry', type: 'Normal', cap: 36 },
    { name: 'Ryme', type: 'Geist', cap: 42 },
    { name: 'Tulip', type: 'Psycho', cap: 45 },
    { name: 'Grusha', type: 'Eis', cap: 48 },
    { name: 'Top Vier', cap: 61 },
    { name: 'Champion Geeta', cap: 62 },
  ]},
};






// Cover liegen im Hub (Bulbagarden erlaubt kein Einbetten auf fremden Seiten – die Bilder luden dort nie)
function cover(name) { return 'covers/' + name + '.webp'; }
const GAME_COVERS = {
  'rot-blau':               [cover('red'), cover('blue')],
  'gelb':                   [cover('yellow')],
  'gold-silber':            [cover('gold'), cover('silver')],
  'kristall':               [cover('crystal')],
  'rubin-saphir':           [cover('ruby'), cover('sapphire')],
  'feuerrot-blattgruen':    [cover('firered'), cover('leafgreen')],
  'smaragd':                [cover('emerald')],
  'diamant-perl':           [cover('diamond'), cover('pearl')],
  'platin':                 [cover('platinum')],
  'heartgold-soulsilver':   [cover('heartgold'), cover('soulsilver')],
  'schwarz-weiss':          [cover('black'), cover('white')],
  'schwarz2-weiss2':        [cover('black_2'), cover('white_2')],
  'x-y':                    [cover('x'), cover('y')],
  'omega-rot-alpha-saphir': [cover('omega_ruby'), cover('alpha_sapphire')],
  'sonne-mond':             [cover('sun'), cover('moon')],
  'ultrasonne-ultramond':   [cover('ultra_sun'), cover('ultra_moon')],
  'letsgo':                 [cover('lets_go_pikachu'), cover('lets_go_eevee')],
  'schwert-schild':         [cover('sword'), cover('shield')],
  'bdsp':                   [cover('brilliant_diamond'), cover('shining_pearl')],
  'karmesin-purpur':        [cover('scarlet'), cover('violet')],
};

const GAME_GEN_GROUP = {
  'rot-blau': 1, 'gelb': 1,
  'gold-silber': 2, 'kristall': 2,
  'rubin-saphir': 3, 'smaragd': 3, 'feuerrot-blattgruen': 3,
  'diamant-perl': 4, 'platin': 4, 'heartgold-soulsilver': 4,
  'schwarz-weiss': 5, 'schwarz2-weiss2': 5,
  'x-y': 6, 'omega-rot-alpha-saphir': 6,
  'sonne-mond': 7, 'ultrasonne-ultramond': 7, 'letsgo': 7,
  'schwert-schild': 8, 'bdsp': 8,
  'karmesin-purpur': 9,
};

const STARTER_POKEMON = {
  'rot-blau': [
    { id: 1, name: 'bulbasaur' },
    { id: 4, name: 'charmander' },
    { id: 7, name: 'squirtle' },
  ],
  'feuerrot-blattgruen': [
    { id: 1, name: 'bulbasaur' },
    { id: 4, name: 'charmander' },
    { id: 7, name: 'squirtle' },
  ],
  'heartgold-soulsilver': [
    { id: 152, name: 'chikorita' },
    { id: 155, name: 'cyndaquil' },
    { id: 158, name: 'totodile' },
  ],
  'smaragd': [
    { id: 252, name: 'treecko' },
    { id: 255, name: 'torchic' },
    { id: 258, name: 'mudkip' },
  ],
  'platin': [
    { id: 387, name: 'turtwig' },
    { id: 390, name: 'chimchar' },
    { id: 393, name: 'piplup' },
  ],
  'schwarz-weiss': [
    { id: 495, name: 'snivy' },
    { id: 498, name: 'tepig' },
    { id: 501, name: 'oshawott' },
  ],
  'x-y': [
    { id: 650, name: 'chespin' },
    { id: 653, name: 'fennekin' },
    { id: 656, name: 'froakie' },
  ],
  'schwert-schild': [
    { id: 810, name: 'grookey' },
    { id: 813, name: 'scorbunny' },
    { id: 816, name: 'sobble' },
  ],
  'karmesin-purpur': [
    { id: 906, name: 'sprigatito' },
    { id: 909, name: 'fuecoco' },
    { id: 912, name: 'quaxly' },
  ],
  'gelb': [
    { id: 25, name: 'pikachu' },
  ],
  'letsgo': [
    { id: 25, name: 'pikachu' },
    { id: 133, name: 'eevee' },
  ],
  'gold-silber': [
    { id: 152, name: 'chikorita' },
    { id: 155, name: 'cyndaquil' },
    { id: 158, name: 'totodile' },
  ],
  'kristall': [
    { id: 152, name: 'chikorita' },
    { id: 155, name: 'cyndaquil' },
    { id: 158, name: 'totodile' },
  ],
  'rubin-saphir': [
    { id: 252, name: 'treecko' },
    { id: 255, name: 'torchic' },
    { id: 258, name: 'mudkip' },
  ],
  'omega-rot-alpha-saphir': [
    { id: 252, name: 'treecko' },
    { id: 255, name: 'torchic' },
    { id: 258, name: 'mudkip' },
  ],
  'diamant-perl': [
    { id: 387, name: 'turtwig' },
    { id: 390, name: 'chimchar' },
    { id: 393, name: 'piplup' },
  ],
  'bdsp': [
    { id: 387, name: 'turtwig' },
    { id: 390, name: 'chimchar' },
    { id: 393, name: 'piplup' },
  ],
  'schwarz2-weiss2': [
    { id: 495, name: 'snivy' },
    { id: 498, name: 'tepig' },
    { id: 501, name: 'oshawott' },
  ],
  'sonne-mond': [
    { id: 722, name: 'rowlet' },
    { id: 725, name: 'litten' },
    { id: 728, name: 'popplio' },
  ],
  'ultrasonne-ultramond': [
    { id: 722, name: 'rowlet' },
    { id: 725, name: 'litten' },
    { id: 728, name: 'popplio' },
  ],
};

const STATIC_LOCATION_POKEMON = {
  'heartgold-soulsilver': {
    'Steineichenwald-Schrein': [{ id: 251, name: 'celebi' }],
  },
  platin: {
    'Speersäule': [{ id: 483, name: 'dialga' }, { id: 484, name: 'palkia' }],
    'Zerrwelt': [{ id: 487, name: 'giratina' }],
    'Vollmondinsel': [{ id: 488, name: 'cresselia' }],
    'Halle des Beginns': [{ id: 493, name: 'arceus' }],
    'Sinjoh-Ruinen': [{ id: 483, name: 'dialga' }, { id: 484, name: 'palkia' }, { id: 487, name: 'giratina' }],
    'Wandernde Pokémon': [
      { id: 144, name: 'articuno' },
      { id: 145, name: 'zapdos' },
      { id: 146, name: 'moltres' },
      { id: 481, name: 'mesprit' },
      { id: 488, name: 'cresselia' },
    ],
  },
  'schwarz-weiss': {
    'Schloss von N': [{ id: 643, name: 'reshiram' }, { id: 644, name: 'zekrom' }],
  },
  'schwert-schild': {
    'Energiewerk': [{ id: 890, name: 'eternatus' }],
    'Kronentempel': [
      { id: 898, name: 'calyrex' },
      { id: 896, name: 'glastrier' },
      { id: 897, name: 'spectrier' },
    ],
    'Hügel des Dyna-Baums': [
      { id: 10169, name: 'articuno-galar', displayName: 'Galar-Arktos', englishName: 'Galarian Articuno' },
      { id: 10170, name: 'zapdos-galar', displayName: 'Galar-Zapdos', englishName: 'Galarian Zapdos' },
      { id: 10171, name: 'moltres-galar', displayName: 'Galar-Lavados', englishName: 'Galarian Moltres' },
    ],
    'Gipfelruinen': [{ id: 377, name: 'regirock' }],
    'Eisberg-Ruinen': [{ id: 378, name: 'regice' }],
    'Eisen-Ruinen': [{ id: 379, name: 'registeel' }],
    'Zwiespaltruinen': [{ id: 894, name: 'regieleki' }, { id: 895, name: 'regidrago' }],
    'Ballsee-Ufer': [{ id: 647, name: 'keldeo' }],
  },
  'karmesin-purpur': {
    'Cucharico-Pfad': [{ id: 1007, name: 'koraidon' }, { id: 1008, name: 'miraidon' }],
    'Zone Null': [{ id: 1007, name: 'koraidon' }, { id: 1008, name: 'miraidon' }],
    'Labor Null': [{ id: 1007, name: 'koraidon' }, { id: 1008, name: 'miraidon' }],
    'Schrein des modrigen Holzes': [{ id: 1001, name: 'wo-chien' }],
    'Schrein des entzweiten Eises': [{ id: 1002, name: 'chien-pao' }],
    'Schrein der unreinen Erde': [{ id: 1003, name: 'ting-lu' }],
    'Schrein der finsteren Flamme': [{ id: 1004, name: 'chi-yu' }],
  },
};

const GAME_VERSION_KEYS = {
  'rot-blau': ['red', 'blue'],
  'gelb': ['yellow'],
  'feuerrot-blattgruen': ['firered', 'leafgreen'],
  'letsgo': ['lets-go-pikachu', 'lets-go-eevee'],
  'gold-silber': ['gold', 'silver'],
  'kristall': ['crystal'],
  'heartgold-soulsilver': ['heartgold', 'soulsilver'],
  'rubin-saphir': ['ruby', 'sapphire'],
  'smaragd': ['emerald'],
  'omega-rot-alpha-saphir': ['omega-ruby', 'alpha-sapphire'],
  'diamant-perl': ['diamond', 'pearl'],
  'platin': ['platinum'],
  'bdsp': ['brilliant-diamond', 'shining-pearl'],
  'schwarz-weiss': ['black', 'white'],
  'schwarz2-weiss2': ['black-2', 'white-2'],
  'x-y': ['x', 'y'],
  'sonne-mond': ['sun', 'moon'],
  'ultrasonne-ultramond': ['ultra-sun', 'ultra-moon'],
  'schwert-schild': ['sword', 'shield'],
  'karmesin-purpur': ['scarlet', 'violet'],
};

const GAME_DEFAULT_GENERATION = {
  'rot-blau': 1,
  'gelb': 1,
  'feuerrot-blattgruen': 3,
  'letsgo': 7,
  'gold-silber': 2,
  'kristall': 2,
  'heartgold-soulsilver': 4,
  'rubin-saphir': 3,
  'smaragd': 3,
  'omega-rot-alpha-saphir': 6,
  'diamant-perl': 4,
  'platin': 4,
  'bdsp': 8,
  'schwarz-weiss': 5,
  'schwarz2-weiss2': 5,
  'x-y': 6,
  'sonne-mond': 7,
  'ultrasonne-ultramond': 7,
  'schwert-schild': 8,
  'karmesin-purpur': 9,
};

const ROUTE_REGION_BY_GAME = {
  'rot-blau': 'kanto',
  'gelb': 'kanto',
  'feuerrot-blattgruen': 'kanto',
  'letsgo': 'kanto',
  'gold-silber': 'johto',
  'kristall': 'johto',
  'heartgold-soulsilver': 'johto',
  'rubin-saphir': 'hoenn',
  'smaragd': 'hoenn',
  'omega-rot-alpha-saphir': 'hoenn',
  'diamant-perl': 'sinnoh',
  'platin': 'sinnoh',
  'bdsp': 'sinnoh',
  'schwarz-weiss': 'unova',
  'schwarz2-weiss2': 'unova',
  'x-y': 'kalos',
  'sonne-mond': 'alola',
  'ultrasonne-ultramond': 'alola',
  'schwert-schild': 'galar',
};

const LOCATION_AREA_ALIASES = {
  'rot-blau': {
    'Alabastia': ['pallet-town-area'],
    'Vertania City': ['viridian-city-area'],
    'Marmoria City': ['pewter-city-area'],
    'Azuria City': ['cerulean-city-area'],
    'Orania City': ['vermilion-city-area', 'vermilion-city-ss-anne-dock'],
    'Lavandia': ['lavender-town-area'],
    'Prismania City': ['celadon-city-area', 'celadon-city-celadon-mansion', 'celadon-city-prize-corner'],
    'Saffronia City': ['saffron-city-area', 'saffron-city-fighting-dojo', 'saffron-city-silph-co-7f'],
    'Fuchsania City': ['fuchsia-city-area'],
    'Zinnoberinsel': ['cinnabar-island-area', 'cinnabar-island-cinnabar-lab'],
    'Vertania-Wald': ['viridian-forest-area'],
    'Mondberg': ['mt-moon-1f', 'mt-moon-b1f', 'mt-moon-b2f'],
    'Felstunnel': ['rock-tunnel-1f', 'rock-tunnel-b1f', 'rock-tunnel-b2f'],
    'Digda-Höhle': ['digletts-cave-area'],
    'Pokémon-Turm': ['pokemon-tower-3f', 'pokemon-tower-4f', 'pokemon-tower-5f', 'pokemon-tower-6f', 'pokemon-tower-7f'],
    'Kanto-Untergrundpfad': ['kanto-underground-path-area'],
    'Safari-Zone': ['kanto-safari-zone-middle', 'kanto-safari-zone-area-1-east', 'kanto-safari-zone-area-2-north', 'kanto-safari-zone-area-3-west'],
    'Seeschauminseln': ['seafoam-islands-1f', 'seafoam-islands-b1f', 'seafoam-islands-b2f', 'seafoam-islands-b3f', 'seafoam-islands-b4f'],
    'Pokémon-Haus': ['pokemon-mansion-1f', 'pokemon-mansion-2f', 'pokemon-mansion-3f', 'pokemon-mansion-b1f'],
    'Siegesstraße': ['kanto-victory-road-1-1f', 'kanto-victory-road-1-2f', 'kanto-victory-road-1-3f', 'kanto-victory-road-2-1f', 'kanto-victory-road-2-2f', 'kanto-victory-road-2-3f'],
    'Kraftwerk': ['kanto-power-plant-area'],
    'Unbekannter Dungeon': ['cerulean-cave-1f', 'cerulean-cave-2f', 'cerulean-cave-b1f'],
  },
  'gelb': {
    'Alabastia': ['pallet-town-area'],
    'Vertania City': ['viridian-city-area'],
    'Marmoria City': ['pewter-city-area'],
    'Azuria City': ['cerulean-city-area'],
    'Orania City': ['vermilion-city-area', 'vermilion-city-ss-anne-dock'],
    'Lavandia': ['lavender-town-area'],
    'Prismania City': ['celadon-city-area', 'celadon-city-celadon-mansion', 'celadon-city-prize-corner'],
    'Saffronia City': ['saffron-city-area', 'saffron-city-fighting-dojo', 'saffron-city-silph-co-7f'],
    'Fuchsania City': ['fuchsia-city-area'],
    'Zinnoberinsel': ['cinnabar-island-area', 'cinnabar-island-cinnabar-lab'],
    'Vertania-Wald': ['viridian-forest-area'],
    'Mondberg': ['mt-moon-1f', 'mt-moon-b1f', 'mt-moon-b2f'],
    'Felstunnel': ['rock-tunnel-1f', 'rock-tunnel-b1f', 'rock-tunnel-b2f'],
    'Digda-Höhle': ['digletts-cave-area'],
    'Pokémon-Turm': ['pokemon-tower-3f', 'pokemon-tower-4f', 'pokemon-tower-5f', 'pokemon-tower-6f', 'pokemon-tower-7f'],
    'Kanto-Untergrundpfad': ['kanto-underground-path-area'],
    'Safari-Zone': ['kanto-safari-zone-middle', 'kanto-safari-zone-area-1-east', 'kanto-safari-zone-area-2-north', 'kanto-safari-zone-area-3-west'],
    'Seeschauminseln': ['seafoam-islands-1f', 'seafoam-islands-b1f', 'seafoam-islands-b2f', 'seafoam-islands-b3f', 'seafoam-islands-b4f'],
    'Pokémon-Haus': ['pokemon-mansion-1f', 'pokemon-mansion-2f', 'pokemon-mansion-3f', 'pokemon-mansion-b1f'],
    'Siegesstraße': ['kanto-victory-road-1-1f', 'kanto-victory-road-1-2f', 'kanto-victory-road-1-3f', 'kanto-victory-road-2-1f', 'kanto-victory-road-2-2f', 'kanto-victory-road-2-3f'],
    'Kraftwerk': ['kanto-power-plant-area'],
    'Unbekannter Dungeon': ['cerulean-cave-1f', 'cerulean-cave-2f', 'cerulean-cave-b1f'],
  },
  'feuerrot-blattgruen': {
    'Alabastia': ['pallet-town-area'],
    'Vertania City': ['viridian-city-area'],
    'Marmoria City': ['pewter-city-area'],
    'Azuria City': ['cerulean-city-area'],
    'Orania City': ['vermilion-city-area', 'vermilion-city-ss-anne-dock'],
    'Lavandia': ['lavender-town-area'],
    'Prismania City': ['celadon-city-area', 'celadon-city-celadon-mansion', 'celadon-city-prize-corner'],
    'Saffronia City': ['saffron-city-area', 'saffron-city-fighting-dojo', 'saffron-city-silph-co-7f'],
    'Fuchsania City': ['fuchsia-city-area'],
    'Zinnoberinsel': ['cinnabar-island-area', 'cinnabar-island-cinnabar-lab'],
    'Vertania-Wald': ['viridian-forest-area'],
    'Mondberg': ['mt-moon-1f', 'mt-moon-b1f', 'mt-moon-b2f'],
    'Felstunnel': ['rock-tunnel-1f', 'rock-tunnel-b1f', 'rock-tunnel-b2f'],
    'Digda-Höhle': ['digletts-cave-area'],
    'Pokémon-Turm': ['pokemon-tower-3f', 'pokemon-tower-4f', 'pokemon-tower-5f', 'pokemon-tower-6f', 'pokemon-tower-7f'],
    'Kanto-Untergrundpfad': ['kanto-underground-path-area'],
    'Safari-Zone': ['kanto-safari-zone-middle', 'kanto-safari-zone-area-1-east', 'kanto-safari-zone-area-2-north', 'kanto-safari-zone-area-3-west'],
    'Seeschauminseln': ['seafoam-islands-1f', 'seafoam-islands-b1f', 'seafoam-islands-b2f', 'seafoam-islands-b3f', 'seafoam-islands-b4f'],
    'Pokémon-Haus': ['pokemon-mansion-1f', 'pokemon-mansion-2f', 'pokemon-mansion-3f', 'pokemon-mansion-b1f'],
    'Siegesstraße': ['kanto-victory-road-2-1f', 'kanto-victory-road-2-2f', 'kanto-victory-road-2-3f'],
    'Kraftwerk': ['kanto-power-plant-area'],
    'Azuria-Höhle': ['cerulean-cave-1f', 'cerulean-cave-2f', 'cerulean-cave-b1f'],
    'MS Anne': ['ss-anne-area'],
    'Wandelhöhle': ['kanto-altering-cave-a', 'kanto-altering-cave-b', 'kanto-altering-cave-c', 'kanto-altering-cave-d', 'kanto-altering-cave-e', 'kanto-altering-cave-f', 'kanto-altering-cave-g', 'kanto-altering-cave-h', 'kanto-altering-cave-i'],
    'Entstehungsinsel': ['birth-island-area'],
    'Eiland 1': ['one-island-area'],
    'Schatzgestade': ['treasure-beach-area'],
    'Glutberg': ['mt-ember-area', 'mt-ember-cave', 'mt-ember-inside', 'mt-ember-1f-cave-behind-team-rocket', 'mt-ember-b1f', 'mt-ember-b2f', 'mt-ember-b3f', 'mt-ember-summit'],
    'Kap Kante': ['cape-brink-area'],
    'Glühweg': ['kindle-road-area'],
    'Tri-Eiland Hafen': ['three-isle-port-area'],
    'Bondbrücke': ['bond-bridge-area'],
    'Beerenforst': ['berry-forest-area'],
    'Eiland 4': ['four-island-area'],
    'Eiskaskadenhöhle': ['icefall-cave-entrance', 'icefall-cave-1f', 'icefall-cave-b1f', 'icefall-cave-waterfall'],
    'Eiland 5': ['five-island-area'],
    'Wasserirrgarten': ['water-labyrinth-area'],
    'Fünf-Eiland-Weide': ['five-isle-meadow-area'],
    'Ferienparadies': ['resort-gorgeous-area'],
    'Gedenksäule': ['memorial-pillar-area'],
    'Verlorene Höhle': ['lost-cave-room-1', 'lost-cave-room-2', 'lost-cave-room-3', 'lost-cave-room-4', 'lost-cave-room-5', 'lost-cave-room-6', 'lost-cave-room-7', 'lost-cave-room-8', 'lost-cave-room-9', 'lost-cave-room-10', 'lost-cave-item-rooms'],
    'Wasserweg': ['water-path-area'],
    'Grüner Pfad': ['green-path-area'],
    'Fern-Eiland': ['outcast-island-area'],
    'Ruinental': ['ruin-valley-area'],
    'Musterbuschwald': ['pattern-bush-area'],
    'Schluchteingang': ['canyon-entrance-area'],
    '7-Schatzschlucht': ['sevault-canyon-area'],
    'Tanibo-Ruinen': ['tanoby-ruins-area', 'monean-chamber-area', 'liptoo-chamber-area', 'weepth-chamber-area', 'dilford-chamber-area', 'scufib-chamber-area', 'rixy-chamber-area', 'viapos-chamber-area'],
    'Trainerturm': ['trainer-tower-area'],
    'Nabelfels': ['navel-rock-area'],
    'Wandernde Pokémon': ['roaming-kanto-area'],
  },
  'letsgo': {
    'Alabastia': ['pallet-town-area'],
    'Vertania City': ['viridian-city-area'],
    'Marmoria City': ['pewter-city-area'],
    'Azuria City': ['cerulean-city-area'],
    'Orania City': ['vermilion-city-area', 'vermilion-city-ss-anne-dock'],
    'Lavandia': ['lavender-town-area'],
    'Prismania City': ['celadon-city-area', 'celadon-city-celadon-mansion', 'celadon-city-prize-corner'],
    'Saffronia City': ['saffron-city-area', 'saffron-city-fighting-dojo', 'saffron-city-silph-co-7f'],
    'Fuchsania City': ['fuchsia-city-area'],
    'Zinnoberinsel': ['cinnabar-island-area', 'cinnabar-island-cinnabar-lab'],
    'Vertania-Wald': ['viridian-forest-area'],
    'Mondberg': ['mt-moon-1f', 'mt-moon-b1f', 'mt-moon-b2f'],
    'Felstunnel': ['rock-tunnel-1f', 'rock-tunnel-b1f', 'rock-tunnel-b2f'],
    'Digda-Höhle': ['digletts-cave-area'],
    'Pokémon-Turm': ['pokemon-tower-3f', 'pokemon-tower-4f', 'pokemon-tower-5f', 'pokemon-tower-6f', 'pokemon-tower-7f'],
    'Kanto-Untergrundpfad': ['kanto-underground-path-area'],
    'Seeschauminseln': ['seafoam-islands-1f', 'seafoam-islands-b1f', 'seafoam-islands-b2f', 'seafoam-islands-b3f', 'seafoam-islands-b4f'],
    'Pokémon-Haus': ['pokemon-mansion-1f', 'pokemon-mansion-2f', 'pokemon-mansion-3f', 'pokemon-mansion-b1f'],
    'Siegesstraße': ['kanto-victory-road-1-1f', 'kanto-victory-road-1-2f', 'kanto-victory-road-1-3f', 'kanto-victory-road-2-1f', 'kanto-victory-road-2-2f', 'kanto-victory-road-2-3f'],
    'Kraftwerk': ['kanto-power-plant-area'],
    'Azuria-Höhle': ['cerulean-cave-1f', 'cerulean-cave-2f', 'cerulean-cave-b1f'],
  },
  'gold-silber': {
    'Neuborkia': ['new-bark-town-area'],
    'Rosalia City': ['cherrygrove-city-area'],
    'Viola City': ['violet-city-area', 'violet-city-poke-mart', 'violet-city-pokemon-center'],
    'Azalea City': ['azalea-town-area'],
    'Dukatia City': ['goldenrod-city-north-gate', 'goldenrod-city-bills-house', 'goldenrod-city-game-corner'],
    'Teak City': ['ecruteak-city-area'],
    'Oliviana City': ['olivine-city-area'],
    'Anemonia City': ['cianwood-city-area', 'cianwood-city-kirks-house', 'cianwood-city-pokemon-center'],
    'Mahagonia': ['mahogany-town-area'],
    'Ebenholz City': ['blackthorn-city-area'],
    'Alabastia': ['pallet-town-area'],
    'Vertania City': ['viridian-city-area'],
    'Marmoria City': ['pewter-city-area', 'pewter-city-pewter-museum-of-science'],
    'Azuria City': ['cerulean-city-area'],
    'Orania City': ['vermilion-city-area', 'vermilion-city-ss-anne-dock'],
    'Lavandia': ['lavender-town-area'],
    'Prismania City': ['celadon-city-area', 'celadon-city-prize-corner'],
    'Saffronia City': ['saffron-city-area', 'saffron-city-silph-co'],
    'Fuchsania City': ['fuchsia-city-area'],
    'Zinnoberinsel': ['cinnabar-island-area'],
    'Vertania-Wald': ['viridian-forest-area'],
    'Dunkelhöhle': ['dark-cave-violet-city-entrance', 'dark-cave-blackthorn-city-entrance'],
    'Knofensa-Turm': ['sprout-tower-2f', 'sprout-tower-3f'],
    'Einheitstunnel': ['union-cave-1f', 'union-cave-b1f', 'union-cave-b2f'],
    'Flegmon-Brunnen': ['slowpoke-well-1f', 'slowpoke-well-b1f'],
    'Steineichenwald': ['ilex-forest-area'],
    'Turmruine': ['burned-tower-1f', 'burned-tower-b1f'],
    'Glockenturm': ['bell-tower-2f', 'bell-tower-3f', 'bell-tower-4f', 'bell-tower-5f', 'bell-tower-6f', 'bell-tower-7f', 'bell-tower-8f', 'bell-tower-9f', 'bell-tower-10f', 'bell-tower-roof'],
    'Strudelinseln': ['whirl-islands-1f', 'whirl-islands-b1f', 'whirl-islands-b2f', 'whirl-islands-b3f'],
    'Kesselberg': ['mt-mortar-1f', 'mt-mortar-lower-cave', 'mt-mortar-upper-cave', 'mt-mortar-b1f'],
    'Digda-Höhle': ['digletts-cave-area'],
    'Eispfad': ['ice-path-1f', 'ice-path-b1f', 'ice-path-b2f', 'ice-path-b3f'],
    'Drachenhöhle': ['dragons-den-area'],
    'Tohjo-Fälle': ['tohjo-falls-area'],
    'Felstunnel': ['rock-tunnel-1f', 'rock-tunnel-b1f'],
    'Mondberg': ['mt-moon-1f', 'mt-moon-b1f', 'mt-moon-b2f', 'mt-moon-mt-moon-square', 'mt-moon-2f'],
    'Seeschauminseln': ['seafoam-islands-1f', 'seafoam-islands-b1f', 'seafoam-islands-b2f', 'seafoam-islands-b3f', 'seafoam-islands-b4f'],
    'Siegesstraße': ['kanto-victory-road-1-1f', 'kanto-victory-road-1-2f', 'kanto-victory-road-1-3f', 'kanto-victory-road-2-1f', 'kanto-victory-road-2-2f', 'kanto-victory-road-2-3f'],
    'Kraftwerk': ['kanto-power-plant-area'],
    'Azuria-Höhle': ['cerulean-cave-1f', 'cerulean-cave-2f', 'cerulean-cave-b1f'],
    'Silberberg': ['mt-silver-outside', 'mt-silver-1f', 'mt-silver-1f-top', 'mt-silver-2f', 'mt-silver-3f', 'mt-silver-4f', 'mt-silver-mountainside', 'mt-silver-top'],
    'Nationalpark': ['national-park-area'],
    'See des Zorns': ['lake-of-rage-area'],
    'Alph-Ruinen': ['ruins-of-alph-outside', 'ruins-of-alph-interior-a', 'ruins-of-alph-interior-b', 'ruins-of-alph-interior-c', 'ruins-of-alph-interior-d'],
    'Johto-Safari-Zone': ['johto-safari-zone-zone-peak', 'johto-safari-zone-zone-desert', 'johto-safari-zone-zone-plains', 'johto-safari-zone-zone-meadow', 'johto-safari-zone-zone-forest', 'johto-safari-zone-zone-swamp', 'johto-safari-zone-zone-marshland', 'johto-safari-zone-zone-mountain', 'johto-safari-zone-zone-rocky-beach', 'johto-safari-zone-zone-wasteland', 'johto-safari-zone-zone-savannah', 'johto-safari-zone-zone-wetland'],
    'Felsenherzturm': ['embedded-tower-kyogre-room', 'embedded-tower-groundon-room', 'embedded-tower-rayquaza-room'],
    'Sinjoh-Ruinen': ['sinjoh-ruins-area'],
    'Team Rocket-Hauptquartier': ['team-rocket-hq-area'],
    'Wandernde Pokémon': ['roaming-johto-area'],
  },
  'kristall': {
    'Neuborkia': ['new-bark-town-area'],
    'Rosalia City': ['cherrygrove-city-area'],
    'Viola City': ['violet-city-area', 'violet-city-poke-mart', 'violet-city-pokemon-center'],
    'Azalea City': ['azalea-town-area'],
    'Dukatia City': ['goldenrod-city-north-gate', 'goldenrod-city-bills-house', 'goldenrod-city-game-corner'],
    'Teak City': ['ecruteak-city-area'],
    'Oliviana City': ['olivine-city-area'],
    'Anemonia City': ['cianwood-city-area', 'cianwood-city-kirks-house', 'cianwood-city-pokemon-center'],
    'Mahagonia': ['mahogany-town-area'],
    'Ebenholz City': ['blackthorn-city-area'],
    'Alabastia': ['pallet-town-area'],
    'Vertania City': ['viridian-city-area'],
    'Marmoria City': ['pewter-city-area', 'pewter-city-pewter-museum-of-science'],
    'Azuria City': ['cerulean-city-area'],
    'Orania City': ['vermilion-city-area', 'vermilion-city-ss-anne-dock'],
    'Lavandia': ['lavender-town-area'],
    'Prismania City': ['celadon-city-area', 'celadon-city-prize-corner'],
    'Saffronia City': ['saffron-city-area', 'saffron-city-silph-co'],
    'Fuchsania City': ['fuchsia-city-area'],
    'Zinnoberinsel': ['cinnabar-island-area'],
    'Vertania-Wald': ['viridian-forest-area'],
    'Dunkelhöhle': ['dark-cave-violet-city-entrance', 'dark-cave-blackthorn-city-entrance'],
    'Knofensa-Turm': ['sprout-tower-2f', 'sprout-tower-3f'],
    'Einheitstunnel': ['union-cave-1f', 'union-cave-b1f', 'union-cave-b2f'],
    'Flegmon-Brunnen': ['slowpoke-well-1f', 'slowpoke-well-b1f'],
    'Steineichenwald': ['ilex-forest-area'],
    'Turmruine': ['burned-tower-1f', 'burned-tower-b1f'],
    'Glockenturm': ['bell-tower-2f', 'bell-tower-3f', 'bell-tower-4f', 'bell-tower-5f', 'bell-tower-6f', 'bell-tower-7f', 'bell-tower-8f', 'bell-tower-9f', 'bell-tower-10f', 'bell-tower-roof'],
    'Strudelinseln': ['whirl-islands-1f', 'whirl-islands-b1f', 'whirl-islands-b2f', 'whirl-islands-b3f'],
    'Kesselberg': ['mt-mortar-1f', 'mt-mortar-lower-cave', 'mt-mortar-upper-cave', 'mt-mortar-b1f'],
    'Digda-Höhle': ['digletts-cave-area'],
    'Eispfad': ['ice-path-1f', 'ice-path-b1f', 'ice-path-b2f', 'ice-path-b3f'],
    'Drachenhöhle': ['dragons-den-area'],
    'Tohjo-Fälle': ['tohjo-falls-area'],
    'Felstunnel': ['rock-tunnel-1f', 'rock-tunnel-b1f'],
    'Mondberg': ['mt-moon-1f', 'mt-moon-b1f', 'mt-moon-b2f', 'mt-moon-mt-moon-square', 'mt-moon-2f'],
    'Seeschauminseln': ['seafoam-islands-1f', 'seafoam-islands-b1f', 'seafoam-islands-b2f', 'seafoam-islands-b3f', 'seafoam-islands-b4f'],
    'Siegesstraße': ['kanto-victory-road-1-1f', 'kanto-victory-road-1-2f', 'kanto-victory-road-1-3f', 'kanto-victory-road-2-1f', 'kanto-victory-road-2-2f', 'kanto-victory-road-2-3f'],
    'Kraftwerk': ['kanto-power-plant-area'],
    'Azuria-Höhle': ['cerulean-cave-1f', 'cerulean-cave-2f', 'cerulean-cave-b1f'],
    'Silberberg': ['mt-silver-outside', 'mt-silver-1f', 'mt-silver-1f-top', 'mt-silver-2f', 'mt-silver-3f', 'mt-silver-4f', 'mt-silver-mountainside', 'mt-silver-top'],
    'Nationalpark': ['national-park-area'],
    'See des Zorns': ['lake-of-rage-area'],
    'Alph-Ruinen': ['ruins-of-alph-outside', 'ruins-of-alph-interior-a', 'ruins-of-alph-interior-b', 'ruins-of-alph-interior-c', 'ruins-of-alph-interior-d'],
    'Johto-Safari-Zone': ['johto-safari-zone-zone-peak', 'johto-safari-zone-zone-desert', 'johto-safari-zone-zone-plains', 'johto-safari-zone-zone-meadow', 'johto-safari-zone-zone-forest', 'johto-safari-zone-zone-swamp', 'johto-safari-zone-zone-marshland', 'johto-safari-zone-zone-mountain', 'johto-safari-zone-zone-rocky-beach', 'johto-safari-zone-zone-wasteland', 'johto-safari-zone-zone-savannah', 'johto-safari-zone-zone-wetland'],
    'Felsenherzturm': ['embedded-tower-kyogre-room', 'embedded-tower-groundon-room', 'embedded-tower-rayquaza-room'],
    'Sinjoh-Ruinen': ['sinjoh-ruins-area'],
    'Team Rocket-Hauptquartier': ['team-rocket-hq-area'],
    'Wandernde Pokémon': ['roaming-johto-area'],
  },
  'heartgold-soulsilver': {
    'Neuborkia': ['new-bark-town-area'],
    'Rosalia City': ['cherrygrove-city-area'],
    'Viola City': ['violet-city-area', 'violet-city-poke-mart', 'violet-city-pokemon-center'],
    'Azalea City': ['azalea-town-area'],
    'Dukatia City': ['goldenrod-city-north-gate', 'goldenrod-city-bills-house', 'goldenrod-city-game-corner'],
    'Teak City': ['ecruteak-city-area'],
    'Oliviana City': ['olivine-city-area'],
    'Anemonia City': ['cianwood-city-area', 'cianwood-city-kirks-house', 'cianwood-city-pokemon-center'],
    'Mahagonia': ['mahogany-town-area'],
    'Ebenholz City': ['blackthorn-city-area'],
    'Alabastia': ['pallet-town-area'],
    'Vertania City': ['viridian-city-area'],
    'Marmoria City': ['pewter-city-area', 'pewter-city-pewter-museum-of-science'],
    'Azuria City': ['cerulean-city-area'],
    'Orania City': ['vermilion-city-area', 'vermilion-city-ss-anne-dock'],
    'Lavandia': ['lavender-town-area'],
    'Prismania City': ['celadon-city-area', 'celadon-city-prize-corner'],
    'Saffronia City': ['saffron-city-area', 'saffron-city-silph-co'],
    'Fuchsania City': ['fuchsia-city-area'],
    'Zinnoberinsel': ['cinnabar-island-area'],
    'Vertania-Wald': ['viridian-forest-area'],
    'Dunkelhöhle': ['dark-cave-violet-city-entrance', 'dark-cave-blackthorn-city-entrance'],
    'Knofensa-Turm': ['sprout-tower-2f', 'sprout-tower-3f'],
    'Einheitstunnel': ['union-cave-1f', 'union-cave-b1f', 'union-cave-b2f'],
    'Flegmon-Brunnen': ['slowpoke-well-1f', 'slowpoke-well-b1f'],
    'Steineichenwald': ['ilex-forest-area'],
    'Turmruine': ['burned-tower-1f', 'burned-tower-b1f'],
    'Glockenturm': ['bell-tower-2f', 'bell-tower-3f', 'bell-tower-4f', 'bell-tower-5f', 'bell-tower-6f', 'bell-tower-7f', 'bell-tower-8f', 'bell-tower-9f', 'bell-tower-10f', 'bell-tower-roof'],
    'Strudelinseln': ['whirl-islands-1f', 'whirl-islands-b1f', 'whirl-islands-b2f', 'whirl-islands-b3f'],
    'Kesselberg': ['mt-mortar-1f', 'mt-mortar-lower-cave', 'mt-mortar-upper-cave', 'mt-mortar-b1f'],
    'Digda-Höhle': ['digletts-cave-area'],
    'Eispfad': ['ice-path-1f', 'ice-path-b1f', 'ice-path-b2f', 'ice-path-b3f'],
    'Drachenhöhle': ['dragons-den-area'],
    'Tohjo-Fälle': ['tohjo-falls-area'],
    'Felstunnel': ['rock-tunnel-1f', 'rock-tunnel-b1f'],
    'Mondberg': ['mt-moon-1f', 'mt-moon-b1f', 'mt-moon-b2f', 'mt-moon-mt-moon-square', 'mt-moon-2f'],
    'Seeschauminseln': ['seafoam-islands-1f', 'seafoam-islands-b1f', 'seafoam-islands-b2f', 'seafoam-islands-b3f', 'seafoam-islands-b4f'],
    'Siegesstraße': ['kanto-victory-road-1-1f', 'kanto-victory-road-1-2f', 'kanto-victory-road-1-3f', 'kanto-victory-road-2-1f', 'kanto-victory-road-2-2f', 'kanto-victory-road-2-3f'],
    'Kraftwerk': ['kanto-power-plant-area'],
    'Azuria-Höhle': ['cerulean-cave-1f', 'cerulean-cave-2f', 'cerulean-cave-b1f'],
    'Silberberg': ['mt-silver-outside', 'mt-silver-1f', 'mt-silver-1f-top', 'mt-silver-2f', 'mt-silver-3f', 'mt-silver-4f', 'mt-silver-mountainside', 'mt-silver-top'],
    'Nationalpark': ['national-park-area'],
    'See des Zorns': ['lake-of-rage-area'],
    'Alph-Ruinen': ['ruins-of-alph-outside', 'ruins-of-alph-interior-a', 'ruins-of-alph-interior-b', 'ruins-of-alph-interior-c', 'ruins-of-alph-interior-d'],
    'Johto-Safari-Zone': ['johto-safari-zone-zone-peak', 'johto-safari-zone-zone-desert', 'johto-safari-zone-zone-plains', 'johto-safari-zone-zone-meadow', 'johto-safari-zone-zone-forest', 'johto-safari-zone-zone-swamp', 'johto-safari-zone-zone-marshland', 'johto-safari-zone-zone-mountain', 'johto-safari-zone-zone-rocky-beach', 'johto-safari-zone-zone-wasteland', 'johto-safari-zone-zone-savannah', 'johto-safari-zone-zone-wetland'],
    'Felsenherzturm': ['embedded-tower-kyogre-room', 'embedded-tower-groundon-room', 'embedded-tower-rayquaza-room'],
    'Sinjoh-Ruinen': ['sinjoh-ruins-area'],
    'Team Rocket-Hauptquartier': ['team-rocket-hq-area'],
    'Wandernde Pokémon': ['roaming-johto-area'],
  },
  'rubin-saphir': {
    'Wurzelheim': ['littleroot-town-area'],
    'Rosaltstadt': [],
    'Blütenburg City': ['petalburg-city-area'],
    'Metarost City': ['rustboro-city-area'],
    'Faustauhaven': ['dewford-town-area'],
    'Graphitport City': ['slateport-city-area'],
    'Malvenfroh City': [],
    'Bad Lavastadt': ['lavaridge-town-area'],
    'Laubwechselfeld': [],
    'Wiesenflur': [],
    'Baumhausen City': ['fortree-city-area'],
    'Moosbach City': ['mossdeep-city-area', 'mossdeep-city-stevens-house'],
    'Xeneroville': ['sootopolis-city-area'],
    'Floßbrunn': ['pacifidlog-town-area'],
    'Seegrasulb City': ['lilycove-city-area'],
    'Prachtpolis City': ['ever-grande-city-area'],
    'Blütenburgwald': ['petalburg-woods-area'],
    'Schiffswrack': ['abandoned-ship-area'],
    'Granithöhle': ['granite-cave-1f', 'granite-cave-1fsmall-room', 'granite-cave-b1f', 'granite-cave-b2f'],
    'Metarost-Tunnel': ['rusturf-tunnel-area'],
    'Feuriger Pfad': ['fiery-path-area'],
    'Schlotberg': [],
    'Steilpass': ['jagged-pass-area'],
    'Meteorfälle': ['meteor-falls-area', 'meteor-falls-back', 'meteor-falls-b1f', 'meteor-falls-backsmall-room'],
    'Pyroberg': ['mt-pyre-1f', 'mt-pyre-2f', 'mt-pyre-3f', 'mt-pyre-4f', 'mt-pyre-5f', 'mt-pyre-6f', 'mt-pyre-outside', 'mt-pyre-summit'],
    'Safari-Zone': ['hoenn-safari-zone-nwmach-bike-area', 'hoenn-safari-zone-neacro-bike-area', 'hoenn-safari-zone-sw', 'hoenn-safari-zone-se', 'hoenn-safari-zone-expansion-south', 'hoenn-safari-zone-expansion-north'],
    'Küstenhöhle': ['shoal-cave-high-tide', 'shoal-cave-low-tide', 'shoal-cave-b1f', 'shoal-cave-b2f', 'shoal-cave-b3f'],
    'Urzeithöhle': ['cave-of-origin-entrance', 'cave-of-origin-1f', 'cave-of-origin-b1f', 'cave-of-origin-b2f', 'cave-of-origin-b3f'],
    'Tiefseehöhle': ['seafloor-cavern-area'],
    'Himmelturm': ['sky-pillar-1f', 'sky-pillar-3f', 'sky-pillar-5f', 'sky-pillar-apex'],
    'Siegesstraße': ['hoenn-victory-road-1f', 'hoenn-victory-road-b1f', 'hoenn-victory-road-b2f'],
    'Wüstenruine': ['desert-ruins-area'],
    'Wüstenunterführung': ['desert-underpass-area'],
    'Wunderturm': ['mirage-tower-area'],
    'Team Aquas Versteck': ['team-aqua-hideout-area'],
    'Team Magmas Versteck': ['magma-hideout-area', 'team-magma-hideout-area'],
    'Inselhöhle': ['island-cave-area'],
    'Grabmal': ['ancient-tomb-area'],
    'Terrahöhle': ['terra-cave-area'],
    'Ozeanhöhle': ['marine-cave-area'],
    'Ferneiland': ['faraway-island-area'],
    'Entstehungsinsel': ['birth-island-area'],
    'Nabelfels': ['navel-rock-area'],
    'Wandelhöhle': ['hoenn-altering-cave-area'],
    'Wandernde Pokémon': ['roaming-hoenn-area'],
  },
  'smaragd': {
    'Wurzelheim': ['littleroot-town-area'],
    'Rosaltstadt': [],
    'Blütenburg City': ['petalburg-city-area'],
    'Metarost City': ['rustboro-city-area'],
    'Faustauhaven': ['dewford-town-area'],
    'Graphitport City': ['slateport-city-area'],
    'Malvenfroh City': [],
    'Bad Lavastadt': ['lavaridge-town-area'],
    'Laubwechselfeld': [],
    'Wiesenflur': [],
    'Baumhausen City': ['fortree-city-area'],
    'Moosbach City': ['mossdeep-city-area', 'mossdeep-city-stevens-house'],
    'Xeneroville': ['sootopolis-city-area'],
    'Floßbrunn': ['pacifidlog-town-area'],
    'Seegrasulb City': ['lilycove-city-area'],
    'Prachtpolis City': ['ever-grande-city-area'],
    'Blütenburgwald': ['petalburg-woods-area'],
    'Schiffswrack': ['abandoned-ship-area'],
    'Granithöhle': ['granite-cave-1f', 'granite-cave-1fsmall-room', 'granite-cave-b1f', 'granite-cave-b2f'],
    'Metarost-Tunnel': ['rusturf-tunnel-area'],
    'Feuriger Pfad': ['fiery-path-area'],
    'Schlotberg': [],
    'Steilpass': ['jagged-pass-area'],
    'Meteorfälle': ['meteor-falls-area', 'meteor-falls-back', 'meteor-falls-b1f', 'meteor-falls-backsmall-room'],
    'Pyroberg': ['mt-pyre-1f', 'mt-pyre-2f', 'mt-pyre-3f', 'mt-pyre-4f', 'mt-pyre-5f', 'mt-pyre-6f', 'mt-pyre-outside', 'mt-pyre-summit'],
    'Safari-Zone': ['hoenn-safari-zone-nwmach-bike-area', 'hoenn-safari-zone-neacro-bike-area', 'hoenn-safari-zone-sw', 'hoenn-safari-zone-se', 'hoenn-safari-zone-expansion-south', 'hoenn-safari-zone-expansion-north'],
    'Küstenhöhle': ['shoal-cave-high-tide', 'shoal-cave-low-tide', 'shoal-cave-b1f', 'shoal-cave-b2f', 'shoal-cave-b3f'],
    'Urzeithöhle': ['cave-of-origin-entrance', 'cave-of-origin-1f', 'cave-of-origin-b1f', 'cave-of-origin-b2f', 'cave-of-origin-b3f'],
    'Tiefseehöhle': ['seafloor-cavern-area'],
    'Himmelturm': ['sky-pillar-1f', 'sky-pillar-3f', 'sky-pillar-5f', 'sky-pillar-apex'],
    'Siegesstraße': ['hoenn-victory-road-1f', 'hoenn-victory-road-b1f', 'hoenn-victory-road-b2f'],
    'Wüstenruine': ['desert-ruins-area'],
    'Wüstenunterführung': ['desert-underpass-area'],
    'Wunderturm': ['mirage-tower-area'],
    'Neu Malvenfroh': ['new-mauville-entrance', 'new-mauville-area'],
    'Team Aquas Versteck': ['team-aqua-hideout-area'],
    'Team Magmas Versteck': ['magma-hideout-area', 'team-magma-hideout-area'],
    'Inselhöhle': ['island-cave-area'],
    'Grabmal': ['ancient-tomb-area'],
    'Terrahöhle': ['terra-cave-area'],
    'Ozeanhöhle': ['marine-cave-area'],
    'Ferneiland': ['faraway-island-area'],
    'Insel im Süden': ['southern-island-area'],
    'Entstehungsinsel': ['birth-island-area'],
    'Nabelfels': ['navel-rock-area'],
    'Wandelhöhle': ['hoenn-altering-cave-area'],
    'Höhlenatelier': ['artisan-cave-area'],
    'Wunderinsel': ['mirage-island-area'],
    'Kampfzone (Hoenn)': ['hoenn-battle-frontier-area'],
    'Wandernde Pokémon': ['roaming-hoenn-area'],
  },
  'omega-rot-alpha-saphir': {
    'Wurzelheim': ['littleroot-town-area'],
    'Rosaltstadt': [],
    'Blütenburg City': ['petalburg-city-area'],
    'Metarost City': ['rustboro-city-area'],
    'Faustauhaven': ['dewford-town-area'],
    'Graphitport City': ['slateport-city-area'],
    'Malvenfroh City': [],
    'Bad Lavastadt': ['lavaridge-town-area'],
    'Laubwechselfeld': [],
    'Wiesenflur': [],
    'Baumhausen City': ['fortree-city-area'],
    'Moosbach City': ['mossdeep-city-area', 'mossdeep-city-stevens-house'],
    'Xeneroville': ['sootopolis-city-area'],
    'Floßbrunn': ['pacifidlog-town-area'],
    'Seegrasulb City': ['lilycove-city-area'],
    'Prachtpolis City': ['ever-grande-city-area'],
    'Blütenburgwald': ['petalburg-woods-area'],
    'Schiffswrack': ['abandoned-ship-area'],
    'Granithöhle': ['granite-cave-1f', 'granite-cave-1fsmall-room', 'granite-cave-b1f', 'granite-cave-b2f'],
    'Metarost-Tunnel': ['rusturf-tunnel-area'],
    'Feuriger Pfad': ['fiery-path-area'],
    'Schlotberg': [],
    'Steilpass': ['jagged-pass-area'],
    'Meteorfälle': ['meteor-falls-area', 'meteor-falls-back', 'meteor-falls-b1f', 'meteor-falls-backsmall-room'],
    'Pyroberg': ['mt-pyre-1f', 'mt-pyre-2f', 'mt-pyre-3f', 'mt-pyre-4f', 'mt-pyre-5f', 'mt-pyre-6f', 'mt-pyre-outside', 'mt-pyre-summit'],
    'Safari-Zone': ['hoenn-safari-zone-nwmach-bike-area', 'hoenn-safari-zone-neacro-bike-area', 'hoenn-safari-zone-sw', 'hoenn-safari-zone-se', 'hoenn-safari-zone-expansion-south', 'hoenn-safari-zone-expansion-north'],
    'Küstenhöhle': ['shoal-cave-high-tide', 'shoal-cave-low-tide', 'shoal-cave-b1f', 'shoal-cave-b2f', 'shoal-cave-b3f'],
    'Urzeithöhle': ['cave-of-origin-entrance', 'cave-of-origin-1f', 'cave-of-origin-b1f', 'cave-of-origin-b2f', 'cave-of-origin-b3f'],
    'Tiefseehöhle': ['seafloor-cavern-area'],
    'Himmelturm': ['sky-pillar-1f', 'sky-pillar-3f', 'sky-pillar-5f', 'sky-pillar-apex'],
    'Siegesstraße': ['hoenn-victory-road-1f', 'hoenn-victory-road-b1f', 'hoenn-victory-road-b2f'],
    'Wüstenruine': ['desert-ruins-area'],
    'Wüstenunterführung': ['desert-underpass-area'],
    'Wunderturm': ['mirage-tower-area'],
    'Neu Malvenfroh': ['new-mauville-entrance', 'new-mauville-area'],
    'Team Aquas Versteck': ['team-aqua-hideout-area'],
    'Team Magmas Versteck': ['magma-hideout-area', 'team-magma-hideout-area'],
    'Inselhöhle': ['island-cave-area'],
    'Grabmal': ['ancient-tomb-area'],
    'Terrahöhle': ['terra-cave-area'],
    'Ozeanhöhle': ['marine-cave-area'],
    'Ferneiland': ['faraway-island-area'],
    'Insel im Süden': ['southern-island-area'],
    'Entstehungsinsel': ['birth-island-area'],
    'Nabelfels': ['navel-rock-area'],
    'Wandelhöhle': ['hoenn-altering-cave-area'],
    'Höhlenatelier': ['artisan-cave-area'],
    'Wunderinsel': ['mirage-island-area'],
    'Kampfzone (Hoenn)': ['hoenn-battle-frontier-area'],
    'Wandernde Pokémon': ['roaming-hoenn-area'],
  },
  'diamant-perl': {
    'Zweiblattdorf': ['twinleaf-town-area'],
    'Sandgemme': [],
    'Jubelstadt': [],
    'Erzelingen': ['oreburgh-city-oreburgh-mining-museum'],
    'Flori': [],
    'Ewigenau': ['eterna-city-area', 'eterna-city-west-gate'],
    'Herzhofen': ['hearthome-city-area'],
    'Trostu': [],
    'Weideburg': ['pastoria-city-area'],
    'Schleiede': ['veilstone-city-area'],
    'Blizzach': [],
    'Fleetburg': ['canalave-city-area'],
    'Sonnewik': ['sunyshore-city-area'],
    'Pokémon Liga': ['sinnoh-pokemon-league-area'],
    'Kühnheitsufer': ['valor-lakefront-area'],
    'Stärkeufer': ['acuity-lakefront-area'],
    'Elyses': ['celestic-town-area'],
    'See der Wahrheit': ['lake-verity-before-galactic-intervention', 'lake-verity-after-galactic-intervention'],
    'Erzelingen-Tor': ['oreburgh-gate-1f', 'oreburgh-gate-b1f'],
    'Verwüsteter Pfad': ['ravaged-path-area'],
    'Ewigwald': ['eterna-forest-area'],
    'Windkraftwerk': ['valley-windworks-area'],
    'Auen von Flori': ['floaroma-meadow-area'],
    'Feurio-Hütte': ['fuego-ironworks-area'],
    'Bizarre Höhle': ['wayward-cave-1f', 'wayward-cave-b1f'],
    'Kraterberg': ['mt-coronet-1f-route-207', 'mt-coronet-2f', 'mt-coronet-3f', 'mt-coronet-4f', 'mt-coronet-4f-small-room', 'mt-coronet-5f', 'mt-coronet-6f', 'mt-coronet-1f-from-exterior', 'mt-coronet-1f-route-216', 'mt-coronet-1f-route-211', 'mt-coronet-b1f', 'mt-coronet-exterior-snowfall', 'mt-coronet-exterior-blizzard'],
    'Turm der Ruhenden': ['lost-tower-1f', 'lost-tower-2f', 'lost-tower-3f', 'lost-tower-4f', 'lost-tower-5f'],
    'Alte Villa': ['old-chateau-entrance', 'old-chateau-dining-room', 'old-chateau-2f-private-room', 'old-chateau-2f', 'old-chateau-2f-leftmost-room', 'old-chateau-2f-left-room', 'old-chateau-2f-middle-room', 'old-chateau-2f-right-room', 'old-chateau-2f-rightmost-room'],
    'Großmoor': ['great-marsh-area-1', 'great-marsh-area-2', 'great-marsh-area-3', 'great-marsh-area-4', 'great-marsh-area-5', 'great-marsh-area-6'],
    'Ruinengrotte': ['ruin-maniac-cave-0-9-different-unown-caught', 'ruin-maniac-cave-10-25-different-unown-caught'],
    'Maniac-Tunnel': ['maniac-tunnel-26-plus-different-unown-caught'],
    'See der Kühnheit': ['lake-valor-area', 'lake-valor-cavern'],
    'See der Stärke': ['lake-acuity-area', 'lake-acuity-cavern'],
    'Eiseninsel': ['iron-island-area', 'iron-island-1f', 'iron-island-b1f-left', 'iron-island-b1f-right', 'iron-island-b2f-left', 'iron-island-b2f-right', 'iron-island-b3f'],
    'Erzelingen-Mine': ['oreburgh-mine-1f', 'oreburgh-mine-b1f'],
    'Trostu-Ruinen': ['solaceon-ruins-2f', 'solaceon-ruins-1f', 'solaceon-ruins-b1f-a', 'solaceon-ruins-b1f-b', 'solaceon-ruins-b1f-c', 'solaceon-ruins-b2f-a', 'solaceon-ruins-b2f-b', 'solaceon-ruins-b2f-c', 'solaceon-ruins-b3f-a', 'solaceon-ruins-b3f-b', 'solaceon-ruins-b3f-c', 'solaceon-ruins-b3f-d', 'solaceon-ruins-b3f-e', 'solaceon-ruins-b4f-a', 'solaceon-ruins-b4f-b', 'solaceon-ruins-b4f-c', 'solaceon-ruins-b4f-d', 'solaceon-ruins-b5f'],
    'Siegesstraße': ['sinnoh-victory-road-1f', 'sinnoh-victory-road-2f', 'sinnoh-victory-road-b1f', 'sinnoh-victory-road-inside', 'sinnoh-victory-road-inside-b1f', 'sinnoh-victory-road-inside-exit'],
    'Speersäule': ['spear-pillar-area'],
    'Scheidequelle': ['sendoff-spring-area'],
    'Höhle der Umkehr': ['turnback-cave-pillar-1', 'turnback-cave-pillar-2', 'turnback-cave-pillar-3', 'turnback-cave-before-pillar-1', 'turnback-cave-between-pillars-1-and-2', 'turnback-cave-between-pillars-2-and-3', 'turnback-cave-after-pillar-3'],
    'Pokémon-Landgut': ['trophy-garden-area'],
    'Blizzach-Tempel': ['snowpoint-temple-1f', 'snowpoint-temple-b1f', 'snowpoint-temple-b2f', 'snowpoint-temple-b3f', 'snowpoint-temple-b4f', 'snowpoint-temple-b5f'],
    'Kahlberg': ['stark-mountain-area', 'stark-mountain-entrance', 'stark-mountain-inside', 'stark-mountain-heatran-chamber'],
    'Erholungsareal': ['resort-area-area'],
    'Blumenparadies': ['flower-paradise-area'],
    'Neumondinsel': ['newmoon-island-area'],
    'Halle des Beginns': ['sinnoh-hall-of-origin-1-area'],
    'Sinjoh-Ruinen': ['sinjoh-ruins-area'],
    'Wandernde Pokémon': ['roaming-sinnoh-area'],
  },
  'platin': {
    'Zweiblattdorf': ['twinleaf-town-area'],
    'Sandgemme': [],
    'Jubelstadt': [],
    'Erzelingen': ['oreburgh-city-oreburgh-mining-museum'],
    'Flori': [],
    'Ewigenau': ['eterna-city-area', 'eterna-city-west-gate'],
    'Herzhofen': ['hearthome-city-area'],
    'Trostu': [],
    'Weideburg': ['pastoria-city-area'],
    'Schleiede': ['veilstone-city-area'],
    'Blizzach': [],
    'Fleetburg': ['canalave-city-area'],
    'Sonnewik': ['sunyshore-city-area'],
    'Pokémon Liga': ['sinnoh-pokemon-league-area'],
    'Kühnheitsufer': ['valor-lakefront-area'],
    'Stärkeufer': ['acuity-lakefront-area'],
    'Elyses': ['celestic-town-area'],
    'See der Wahrheit': ['lake-verity-before-galactic-intervention', 'lake-verity-after-galactic-intervention'],
    'Erzelingen-Tor': ['oreburgh-gate-1f', 'oreburgh-gate-b1f'],
    'Verwüsteter Pfad': ['ravaged-path-area'],
    'Ewigwald': ['eterna-forest-area'],
    'Windkraftwerk': ['valley-windworks-area'],
    'Auen von Flori': ['floaroma-meadow-area'],
    'Feurio-Hütte': ['fuego-ironworks-area'],
    'Bizarre Höhle': ['wayward-cave-1f', 'wayward-cave-b1f'],
    'Kraterberg': ['mt-coronet-1f-route-207', 'mt-coronet-2f', 'mt-coronet-3f', 'mt-coronet-4f', 'mt-coronet-4f-small-room', 'mt-coronet-5f', 'mt-coronet-6f', 'mt-coronet-1f-from-exterior', 'mt-coronet-1f-route-216', 'mt-coronet-1f-route-211', 'mt-coronet-b1f', 'mt-coronet-exterior-snowfall', 'mt-coronet-exterior-blizzard'],
    'Turm der Ruhenden': ['lost-tower-1f', 'lost-tower-2f', 'lost-tower-3f', 'lost-tower-4f', 'lost-tower-5f'],
    'Alte Villa': ['old-chateau-entrance', 'old-chateau-dining-room', 'old-chateau-2f-private-room', 'old-chateau-2f', 'old-chateau-2f-leftmost-room', 'old-chateau-2f-left-room', 'old-chateau-2f-middle-room', 'old-chateau-2f-right-room', 'old-chateau-2f-rightmost-room'],
    'Großmoor': ['great-marsh-area-1', 'great-marsh-area-2', 'great-marsh-area-3', 'great-marsh-area-4', 'great-marsh-area-5', 'great-marsh-area-6'],
    'Ruinengrotte': ['ruin-maniac-cave-0-9-different-unown-caught', 'ruin-maniac-cave-10-25-different-unown-caught'],
    'Maniac-Tunnel': ['maniac-tunnel-26-plus-different-unown-caught'],
    'See der Kühnheit': ['lake-valor-area', 'lake-valor-cavern'],
    'See der Stärke': ['lake-acuity-area', 'lake-acuity-cavern'],
    'Eiseninsel': ['iron-island-area', 'iron-island-1f', 'iron-island-b1f-left', 'iron-island-b1f-right', 'iron-island-b2f-left', 'iron-island-b2f-right', 'iron-island-b3f'],
    'Erzelingen-Mine': ['oreburgh-mine-1f', 'oreburgh-mine-b1f'],
    'Trostu-Ruinen': ['solaceon-ruins-2f', 'solaceon-ruins-1f', 'solaceon-ruins-b1f-a', 'solaceon-ruins-b1f-b', 'solaceon-ruins-b1f-c', 'solaceon-ruins-b2f-a', 'solaceon-ruins-b2f-b', 'solaceon-ruins-b2f-c', 'solaceon-ruins-b3f-a', 'solaceon-ruins-b3f-b', 'solaceon-ruins-b3f-c', 'solaceon-ruins-b3f-d', 'solaceon-ruins-b3f-e', 'solaceon-ruins-b4f-a', 'solaceon-ruins-b4f-b', 'solaceon-ruins-b4f-c', 'solaceon-ruins-b4f-d', 'solaceon-ruins-b5f'],
    'Siegesstraße': ['sinnoh-victory-road-1f', 'sinnoh-victory-road-2f', 'sinnoh-victory-road-b1f', 'sinnoh-victory-road-inside', 'sinnoh-victory-road-inside-b1f', 'sinnoh-victory-road-inside-exit'],
    'Speersäule': ['spear-pillar-area'],
    'Scheidequelle': ['sendoff-spring-area'],
    'Höhle der Umkehr': ['turnback-cave-pillar-1', 'turnback-cave-pillar-2', 'turnback-cave-pillar-3', 'turnback-cave-before-pillar-1', 'turnback-cave-between-pillars-1-and-2', 'turnback-cave-between-pillars-2-and-3', 'turnback-cave-after-pillar-3'],
    'Pokémon-Landgut': ['trophy-garden-area'],
    'Blizzach-Tempel': ['snowpoint-temple-1f', 'snowpoint-temple-b1f', 'snowpoint-temple-b2f', 'snowpoint-temple-b3f', 'snowpoint-temple-b4f', 'snowpoint-temple-b5f'],
    'Kahlberg': ['stark-mountain-area', 'stark-mountain-entrance', 'stark-mountain-inside', 'stark-mountain-heatran-chamber'],
    'Erholungsareal': ['resort-area-area'],
    'Blumenparadies': ['flower-paradise-area'],
    'Neumondinsel': ['newmoon-island-area'],
    'Halle des Beginns': ['sinnoh-hall-of-origin-1-area'],
    'Sinjoh-Ruinen': ['sinjoh-ruins-area'],
    'Wandernde Pokémon': ['roaming-sinnoh-area'],
  },
  'bdsp': {
    'Zweiblattdorf': ['twinleaf-town-area'],
    'Sandgemme': [],
    'Jubelstadt': [],
    'Erzelingen': ['oreburgh-city-oreburgh-mining-museum'],
    'Flori': [],
    'Ewigenau': ['eterna-city-area', 'eterna-city-west-gate'],
    'Herzhofen': ['hearthome-city-area'],
    'Trostu': [],
    'Weideburg': ['pastoria-city-area'],
    'Schleiede': ['veilstone-city-area'],
    'Blizzach': [],
    'Fleetburg': ['canalave-city-area'],
    'Sonnewik': ['sunyshore-city-area'],
    'Pokémon Liga': ['sinnoh-pokemon-league-area'],
    'Kühnheitsufer': ['valor-lakefront-area'],
    'Stärkeufer': ['acuity-lakefront-area'],
    'Elyses': ['celestic-town-area'],
    'See der Wahrheit': ['lake-verity-before-galactic-intervention', 'lake-verity-after-galactic-intervention'],
    'Erzelingen-Tor': ['oreburgh-gate-1f', 'oreburgh-gate-b1f'],
    'Verwüsteter Pfad': ['ravaged-path-area'],
    'Ewigwald': ['eterna-forest-area'],
    'Windkraftwerk': ['valley-windworks-area'],
    'Auen von Flori': ['floaroma-meadow-area'],
    'Feurio-Hütte': ['fuego-ironworks-area'],
    'Bizarre Höhle': ['wayward-cave-1f', 'wayward-cave-b1f'],
    'Kraterberg': ['mt-coronet-1f-route-207', 'mt-coronet-2f', 'mt-coronet-3f', 'mt-coronet-4f', 'mt-coronet-4f-small-room', 'mt-coronet-5f', 'mt-coronet-6f', 'mt-coronet-1f-from-exterior', 'mt-coronet-1f-route-216', 'mt-coronet-1f-route-211', 'mt-coronet-b1f', 'mt-coronet-exterior-snowfall', 'mt-coronet-exterior-blizzard'],
    'Turm der Ruhenden': ['lost-tower-1f', 'lost-tower-2f', 'lost-tower-3f', 'lost-tower-4f', 'lost-tower-5f'],
    'Alte Villa': ['old-chateau-entrance', 'old-chateau-dining-room', 'old-chateau-2f-private-room', 'old-chateau-2f', 'old-chateau-2f-leftmost-room', 'old-chateau-2f-left-room', 'old-chateau-2f-middle-room', 'old-chateau-2f-right-room', 'old-chateau-2f-rightmost-room'],
    'Großmoor': ['great-marsh-area-1', 'great-marsh-area-2', 'great-marsh-area-3', 'great-marsh-area-4', 'great-marsh-area-5', 'great-marsh-area-6'],
    'Ruinengrotte': ['ruin-maniac-cave-0-9-different-unown-caught', 'ruin-maniac-cave-10-25-different-unown-caught'],
    'Maniac-Tunnel': ['maniac-tunnel-26-plus-different-unown-caught'],
    'See der Kühnheit': ['lake-valor-area', 'lake-valor-cavern'],
    'See der Stärke': ['lake-acuity-area', 'lake-acuity-cavern'],
    'Eiseninsel': ['iron-island-area', 'iron-island-1f', 'iron-island-b1f-left', 'iron-island-b1f-right', 'iron-island-b2f-left', 'iron-island-b2f-right', 'iron-island-b3f'],
    'Erzelingen-Mine': ['oreburgh-mine-1f', 'oreburgh-mine-b1f'],
    'Trostu-Ruinen': ['solaceon-ruins-2f', 'solaceon-ruins-1f', 'solaceon-ruins-b1f-a', 'solaceon-ruins-b1f-b', 'solaceon-ruins-b1f-c', 'solaceon-ruins-b2f-a', 'solaceon-ruins-b2f-b', 'solaceon-ruins-b2f-c', 'solaceon-ruins-b3f-a', 'solaceon-ruins-b3f-b', 'solaceon-ruins-b3f-c', 'solaceon-ruins-b3f-d', 'solaceon-ruins-b3f-e', 'solaceon-ruins-b4f-a', 'solaceon-ruins-b4f-b', 'solaceon-ruins-b4f-c', 'solaceon-ruins-b4f-d', 'solaceon-ruins-b5f'],
    'Siegesstraße': ['sinnoh-victory-road-1f', 'sinnoh-victory-road-2f', 'sinnoh-victory-road-b1f', 'sinnoh-victory-road-inside', 'sinnoh-victory-road-inside-b1f', 'sinnoh-victory-road-inside-exit'],
    'Speersäule': ['spear-pillar-area'],
    'Scheidequelle': ['sendoff-spring-area'],
    'Höhle der Umkehr': ['turnback-cave-pillar-1', 'turnback-cave-pillar-2', 'turnback-cave-pillar-3', 'turnback-cave-before-pillar-1', 'turnback-cave-between-pillars-1-and-2', 'turnback-cave-between-pillars-2-and-3', 'turnback-cave-after-pillar-3'],
    'Pokémon-Landgut': ['trophy-garden-area'],
    'Blizzach-Tempel': ['snowpoint-temple-1f', 'snowpoint-temple-b1f', 'snowpoint-temple-b2f', 'snowpoint-temple-b3f', 'snowpoint-temple-b4f', 'snowpoint-temple-b5f'],
    'Kahlberg': ['stark-mountain-area', 'stark-mountain-entrance', 'stark-mountain-inside', 'stark-mountain-heatran-chamber'],
    'Erholungsareal': ['resort-area-area'],
    'Blumenparadies': ['flower-paradise-area'],
    'Neumondinsel': ['newmoon-island-area'],
    'Halle des Beginns': ['sinnoh-hall-of-origin-1-area'],
    'Sinjoh-Ruinen': ['sinjoh-ruins-area'],
    'Wandernde Pokémon': ['roaming-sinnoh-area'],
  },
  'schwarz-weiss': {
    'Avenitia': ['nuvema-town-area'],
    'Gavina': [],
    'Orion City': ['striaton-city-area'],
    'Septerna City': [],
    'Stratos City': ['castelia-city-area', 'castelia-city-game-freak-hq-1f'],
    'Rayono City': [],
    'Marea City': ['driftveil-city-area'],
    'Panaero City': [],
    'Nevaio City': ['icirrus-city-area'],
    'Twindrake City': [],
    'Pokémon Liga': [],
    'Traumbrache': ['dreamyard-area', 'dreamyard-b1f'],
    'Grundwassersenke': ['wellspring-cave-area'],
    'Ewigenwald': ['pinwheel-forest-outside', 'pinwheel-forest-inside', 'pinwheel-forest-rumination-field'],
    'Wüstenresort': ['desert-resort-area', 'desert-resort-entrance'],
    'Alter Palast': ['relic-castle-a', 'relic-castle-b', 'relic-castle-c', 'relic-castle-d'],
    'Hain der Täuschung': ['lostlorn-forest-area'],
    'Tiefkühlcontainer': ['cold-storage-area'],
    'Elektrolithhöhle': ['chargestone-cave-1f', 'chargestone-cave-b1f', 'chargestone-cave-b2f'],
    'Turm des Himmels': ['celestial-tower-2f', 'celestial-tower-3f', 'celestial-tower-4f', 'celestial-tower-5f'],
    'Drachenstiege': ['dragonspiral-tower-entrance', 'dragonspiral-tower-outside', 'dragonspiral-tower-1f', 'dragonspiral-tower-2f', 'dragonspiral-tower-7f'],
    'Moor von Nevaio': ['moor-of-icirrus-area'],
    'Wendelberg': ['twist-mountain-b1f-3f'],
    'Siegesstraße': ['unova-victory-road-outside', 'unova-victory-road-7f', 'unova-victory-road-unknown-area-53', 'unova-victory-road-unknown-area-54', 'unova-victory-road-unknown-area-55', 'unova-victory-road-4f-middle-room', 'unova-victory-road-unknown-area-57', 'unova-victory-road-1f-unknown-room', 'unova-victory-road-unknown-area-59', 'unova-victory-road-unknown-area-60', 'unova-victory-road-unknown-area-61', 'unova-victory-road-unknown-area-62', 'unova-victory-road-unknown-area-63', 'unova-victory-road-unknown-area-64', 'unova-victory-road-unknown-area-65', 'unova-victory-road-unknown-area-66'],
    'Wunderbrücke': ['marvelous-bridge-area'],
    'Marea-Zugbrücke': ['driftveil-drawbridge-area'],
    'Riesengrotte': ['giant-chasm-outside', 'giant-chasm-area', 'giant-chasm-forest', 'giant-chasm-forest-cave'],
    'Panaero-Höhle': ['mistralton-cave-area'],
    'Kammer der Weisung': ['guidance-chamber-area'],
    'Kammer der Prüfung': ['trial-chamber-area'],
    'Höhle der Schulung': ['challengers-cave-1f', 'challengers-cave-b1f', 'challengers-cave-b2f'],
    'Bucht von Ondula': ['undella-bay-area'],
    'Ondula': ['undella-town-area'],
    'Dorfbrücke': ['village-bridge-area'],
    'P2-Labor': ['p2-laboratory-area'],
    'Freiheitsgarten': ['liberty-garden-lighthouse-basement'],
    'Schloss von N': ['ns-castle-throne-room'],
    'Schrein der Ernte': ['abundant-shrine-area'],
  },
  'schwarz2-weiss2': {
    'Avenitia': ['nuvema-town-area'],
    'Gavina': [],
    'Orion City': ['striaton-city-area'],
    'Septerna City': [],
    'Stratos City': ['castelia-city-area', 'castelia-city-game-freak-hq-1f'],
    'Rayono City': [],
    'Marea City': ['driftveil-city-area'],
    'Panaero City': [],
    'Nevaio City': ['icirrus-city-area'],
    'Twindrake City': [],
    'Pokémon Liga': [],
    'Traumbrache': ['dreamyard-area', 'dreamyard-b1f'],
    'Grundwassersenke': ['wellspring-cave-area'],
    'Ewigenwald': ['pinwheel-forest-outside', 'pinwheel-forest-inside', 'pinwheel-forest-rumination-field'],
    'Wüstenresort': ['desert-resort-area', 'desert-resort-entrance'],
    'Alter Palast': ['relic-castle-a', 'relic-castle-b', 'relic-castle-c', 'relic-castle-d'],
    'Hain der Täuschung': ['lostlorn-forest-area'],
    'Tiefkühlcontainer': ['cold-storage-area'],
    'Elektrolithhöhle': ['chargestone-cave-1f', 'chargestone-cave-b1f', 'chargestone-cave-b2f'],
    'Turm des Himmels': ['celestial-tower-2f', 'celestial-tower-3f', 'celestial-tower-4f', 'celestial-tower-5f'],
    'Drachenstiege': ['dragonspiral-tower-entrance', 'dragonspiral-tower-outside', 'dragonspiral-tower-1f', 'dragonspiral-tower-2f', 'dragonspiral-tower-7f'],
    'Moor von Nevaio': ['moor-of-icirrus-area'],
    'Wendelberg': ['twist-mountain-b1f-3f'],
    'Siegesstraße': ['unova-victory-road-outside', 'unova-victory-road-7f', 'unova-victory-road-unknown-area-53', 'unova-victory-road-unknown-area-54', 'unova-victory-road-unknown-area-55', 'unova-victory-road-4f-middle-room', 'unova-victory-road-unknown-area-57', 'unova-victory-road-1f-unknown-room', 'unova-victory-road-unknown-area-59', 'unova-victory-road-unknown-area-60', 'unova-victory-road-unknown-area-61', 'unova-victory-road-unknown-area-62', 'unova-victory-road-unknown-area-63', 'unova-victory-road-unknown-area-64', 'unova-victory-road-unknown-area-65', 'unova-victory-road-unknown-area-66'],
    'Wunderbrücke': ['marvelous-bridge-area'],
    'Marea-Zugbrücke': ['driftveil-drawbridge-area'],
    'Riesengrotte': ['giant-chasm-outside', 'giant-chasm-area', 'giant-chasm-forest', 'giant-chasm-forest-cave'],
    'Panaero-Höhle': ['mistralton-cave-area'],
    'Kammer der Weisung': ['guidance-chamber-area'],
    'Kammer der Prüfung': ['trial-chamber-area'],
    'Höhle der Schulung': ['challengers-cave-1f', 'challengers-cave-b1f', 'challengers-cave-b2f'],
    'Bucht von Ondula': ['undella-bay-area'],
    'Ondula': ['undella-town-area'],
    'Dorfbrücke': ['village-bridge-area'],
    'P2-Labor': ['p2-laboratory-area'],
    'Freiheitsgarten': ['liberty-garden-lighthouse-basement'],
    'Schrein der Ernte': ['abundant-shrine-area'],
  },
  'x-y': {
    'Aquarellia': ['aquacorde-town-area'],
    'Nouvaria City': [],
    'Illumina City': ['lumiose-city-area'],
    'Relievera City': ['cyllage-city-area'],
    'Petrophia': ['ambrette-town-area'],
    'Yantara City': ['shalour-city-area'],
    'Tempera City': [],
    'Romantia City': ['laverre-city-area'],
    'Frescora': [],
    'Mosaia': ['couriway-town-area'],
    'Fluxia City': [],
    'Fractalia City': [],
    'Pokémon Liga': [],
    'Nouvaria-Wald': ['santalune-forest-area'],
    'Parfum-Palast': ['parfum-palace-area'],
    'Geolinkhöhle': ['connecting-cave-area'],
    'Glitzerhöhle': ['glittering-cave-unknown-area-303', 'glittering-cave-unknown-area-304'],
    'Spiegelhöhle': ['reflection-cave-unknown-area-305', 'reflection-cave-unknown-area-306', 'reflection-cave-unknown-area-307', 'reflection-cave-unknown-area-308'],
    'Azurbucht': ['azure-bay-area'],
    'Frosthöhle': ['frost-cavern-unknown-area-313', 'frost-cavern-unknown-area-314', 'frost-cavern-unknown-area-315', 'frost-cavern-unknown-area-316', 'frost-cavern-unknown-area-317'],
    'Hotelruine': ['lost-hotel-area'],
    'Omega-Höhle': ['terminus-cave-1f', 'terminus-cave-b1f-left', 'terminus-cave-b1f-right', 'terminus-cave-b2f', 'terminus-cave-zygardes-chamber'],
    'Pokémon-Dorf': ['pokemon-village-area'],
    'Meerestitanenhöhle': ['sea-spirits-den-area'],
    'Flare-Geheimbasis': ['team-flare-secret-hq-area'],
    'Geheimdungeon': ['unknown-dungeon-area'],
    'Turm der Erkenntnis': ['tower-of-mastery-area'],
    'Kontaktsafari': ['friend-safari-normal', 'friend-safari-fire', 'friend-safari-fighting', 'friend-safari-water', 'friend-safari-flying', 'friend-safari-grass', 'friend-safari-poison', 'friend-safari-electric', 'friend-safari-ground', 'friend-safari-psychic', 'friend-safari-rock', 'friend-safari-ice', 'friend-safari-bug', 'friend-safari-dragon', 'friend-safari-ghost', 'friend-safari-dark', 'friend-safari-steel', 'friend-safari-fairy'],
    'Kalos (wandernd)': ['roaming-kalos-area'],
    'Siegesstraße': ['kalos-victory-road-unknown-area-322', 'kalos-victory-road-unknown-area-324', 'kalos-victory-road-unknown-area-326', 'kalos-victory-road-outside', 'kalos-victory-road-unknown-area-328'],
  },
  'sonne-mond': {
    'Pflanzenhöhle': ['verdant-cavern-area'],
    'Melemele-Wiese': ['melemele-meadow-area'],
    'Zehnkaratberg': ['ten-carat-hill-area', 'ten-carat-hill-farthest-hollow'],
    'Bachweilerberg': ['brooklet-hill-area'],
    'Wela-Vulkanpark': ['wela-volcano-park-area'],
    'Üppiger Wald': ['lush-jungle-area'],
    'Digda-Tunnel': ['diglett-tunnel-area'],
    'Rosenroter Berg': ['blush-mountain-area'],
    'Haina-Wüste': ['haina-desert-area'],
    "Ula'ula-Wiese": ['ula-ula-meadow-area'],
    'Poni-Wildnis': ['poni-wilds-area'],
    'Alter Poni-Pfad': ['ancient-poni-path-area'],
    'Poni-Ebene': ['poni-plains-area'],
    'Poni-Wiese': ['poni-meadow-area'],
    'Lösungs-Höhle': ['resolution-cave-area'],
    'Berg Lanakila': ['mount-lanakila-area'],
    'Melemele-See': ['melemele-sea-area'],
    'Akala-Außenbereich': ['akala-outskirts-area'],
    'Po-Stadt': ['po-town-area'],
  },
  'ultrasonne-ultramond': {
    'Pflanzenhöhle': ['verdant-cavern-area'],
    'Melemele-Wiese': ['melemele-meadow-area'],
    'Zehnkaratberg': ['ten-carat-hill-area', 'ten-carat-hill-farthest-hollow'],
    'Bachweilerberg': ['brooklet-hill-area'],
    'Wela-Vulkanpark': ['wela-volcano-park-area'],
    'Üppiger Wald': ['lush-jungle-area'],
    'Digda-Tunnel': ['diglett-tunnel-area'],
    'Rosenroter Berg': ['blush-mountain-area'],
    'Haina-Wüste': ['haina-desert-area'],
    "Ula'ula-Wiese": ['ula-ula-meadow-area'],
    'Poni-Wildnis': ['poni-wilds-area'],
    'Alter Poni-Pfad': ['ancient-poni-path-area'],
    'Poni-Ebene': ['poni-plains-area'],
    'Poni-Wiese': ['poni-meadow-area'],
    'Lösungs-Höhle': ['resolution-cave-area'],
    'Berg Lanakila': ['mount-lanakila-area'],
    'Melemele-See': ['melemele-sea-area'],
    'Akala-Außenbereich': ['akala-outskirts-area'],
    'Po-Stadt': ['po-town-area'],
  },
  'schwert-schild': {
    'Brassbury': ['wedgehurst-area'],
    'Engine City': ['motostoke-area'],
    'Turffield': ['turffield-area'],
    'Keelton': ['hulbury-area'],
    'Passbeck': ['hammerlocke-area'],
    'Fairballey': ['ballonlea-area'],
    'Circhester': ['circhester-area'],
    'Score City': ['wyndon-area'],
    'Schlummerwald': ['slumbering-weald-area'],
    'Galar-Mine 1': ['galar-mine-area'],
    'Galar-Mine 2': ['galar-mine-no-2-area'],
    'Wipfelscheinwald': ['glimwood-tangle-area'],
    'Naturzone: Waipio-Ebene': ['rolling-fields-main', 'rolling-fields-2'],
    'Naturzone: Milza-See': ['east-lake-axewell-area', 'west-lake-axewell-area'],
    'Naturzone: Wachturmruine': ['watchtower-ruins-area'],
    'Naturzone: Brückental': ['bridge-field-area'],
    'Naturzone: Sandsturmkessel': ['dusty-bowl-area'],
    'Naturzone: Spiegel des Giganten': ['giants-mirror-area'],
    'Naturzone: Milotic-See': ['south-lake-miloch-main', 'south-lake-miloch-2', 'north-lake-miloch-area'],
    'Dyna-Riesennest': ['max-lair-area'],
    'Kronentempel': ['crown-shrine-area'],
    'Hügel des Dyna-Baums': ['dyna-tree-hill-area'],
    'Gipfelruinen': ['galar-rock-peak-ruins-area'],
    'Eisberg-Ruinen': ['galar-iceberg-ruins-area'],
    'Eisen-Ruinen': ['galar-iron-ruins-area'],
    'Zwiespaltruinen': ['split-decision-ruins-area'],
    'Ballsee-Ufer': ['ballimere-lake-area'],
  },
};

const ROUTE_AREA_ALIASES = {
  'rot-blau': {
    2: ['kanto-route-2-south-towards-viridian-city', 'kanto-route-2-north-towards-pewter-city'],
    3: ['kanto-route-3-pokemon-center'],
    4: ['kanto-route-4-pokemon-center'],
    19: ['kanto-sea-route-19-area'],
    20: ['kanto-sea-route-20-area'],
    21: ['kanto-sea-route-21-area'],
  },
  'gelb': {
    2: ['kanto-route-2-south-towards-viridian-city', 'kanto-route-2-north-towards-pewter-city'],
    3: ['kanto-route-3-pokemon-center'],
    4: ['kanto-route-4-pokemon-center'],
    19: ['kanto-sea-route-19-area'],
    20: ['kanto-sea-route-20-area'],
    21: ['kanto-sea-route-21-area'],
  },
  'feuerrot-blattgruen': {
    2: ['kanto-route-2-south-towards-viridian-city', 'kanto-route-2-north-towards-pewter-city'],
    3: ['kanto-route-3-pokemon-center'],
    4: ['kanto-route-4-pokemon-center'],
    19: ['kanto-sea-route-19-area'],
    20: ['kanto-sea-route-20-area'],
    21: ['kanto-sea-route-21-area'],
  },
  'letsgo': {
    2: ['kanto-route-2-south-towards-viridian-city', 'kanto-route-2-north-towards-pewter-city'],
    3: ['kanto-route-3-pokemon-center'],
    4: ['kanto-route-4-pokemon-center'],
    19: ['kanto-sea-route-19-area'],
    20: ['kanto-sea-route-20-area'],
    21: ['kanto-sea-route-21-area'],
  },
  'gold-silber': {
    2: ['kanto-route-2-south-towards-viridian-city', 'kanto-route-2-north-towards-pewter-city'],
    19: ['kanto-sea-route-19-area'],
    20: ['kanto-sea-route-20-area'],
    21: ['kanto-sea-route-21-area'],
    40: ['johto-sea-route-40-area'],
    41: ['johto-sea-route-41-area'],
    47: ['johto-route-47-cave-gate', 'johto-route-47-inside-cave'],
  },
  'kristall': {
    2: ['kanto-route-2-south-towards-viridian-city', 'kanto-route-2-north-towards-pewter-city'],
    19: ['kanto-sea-route-19-area'],
    20: ['kanto-sea-route-20-area'],
    21: ['kanto-sea-route-21-area'],
    40: ['johto-sea-route-40-area'],
    41: ['johto-sea-route-41-area'],
    47: ['johto-route-47-cave-gate', 'johto-route-47-inside-cave'],
  },
  'heartgold-soulsilver': {
    2: ['kanto-route-2-south-towards-viridian-city', 'kanto-route-2-north-towards-pewter-city'],
    19: ['kanto-sea-route-19-area'],
    20: ['kanto-sea-route-20-area'],
    21: ['kanto-sea-route-21-area'],
    40: ['johto-sea-route-40-area'],
    41: ['johto-sea-route-41-area'],
    47: ['johto-route-47-cave-gate', 'johto-route-47-inside-cave'],
  },
  'rubin-saphir': {
    119: ['hoenn-route-119-weather-institute'],
    124: ['hoenn-route-124-underwater'],
    126: ['hoenn-route-126-underwater'],
  },
  smaragd: {
    119: ['hoenn-route-119-weather-institute'],
    124: ['hoenn-route-124-underwater'],
    126: ['hoenn-route-126-underwater'],
  },
  'omega-rot-alpha-saphir': {
    119: ['hoenn-route-119-weather-institute'],
    124: ['hoenn-route-124-underwater'],
    126: ['hoenn-route-126-underwater'],
  },
  'diamant-perl': {
    204: ['sinnoh-route-204-south-towards-jubilife-city', 'sinnoh-route-204-north-towards-floaroma-town'],
    205: ['sinnoh-route-205-south-towards-floaroma-town', 'sinnoh-route-205-east-towards-eterna-city'],
    210: ['sinnoh-route-210-south-towards-solaceon-town', 'sinnoh-route-210-west-towards-celestic-town'],
    211: ['sinnoh-route-211-west-towards-eterna-city', 'sinnoh-route-211-east-towards-celestic-town'],
    212: ['sinnoh-route-212-north-towards-hearthome-city', 'sinnoh-route-212-east-towards-pastoria-city'],
    220: ['sinnoh-sea-route-220-area'],
    223: ['sinnoh-sea-route-223-area'],
    226: ['sinnoh-sea-route-226-area'],
    230: ['sinnoh-sea-route-230-area'],
  },
  'platin': {
    204: ['sinnoh-route-204-south-towards-jubilife-city', 'sinnoh-route-204-north-towards-floaroma-town'],
    205: ['sinnoh-route-205-south-towards-floaroma-town', 'sinnoh-route-205-east-towards-eterna-city'],
    210: ['sinnoh-route-210-south-towards-solaceon-town', 'sinnoh-route-210-west-towards-celestic-town'],
    211: ['sinnoh-route-211-west-towards-eterna-city', 'sinnoh-route-211-east-towards-celestic-town'],
    212: ['sinnoh-route-212-north-towards-hearthome-city', 'sinnoh-route-212-east-towards-pastoria-city'],
    220: ['sinnoh-sea-route-220-area'],
    223: ['sinnoh-sea-route-223-area'],
    226: ['sinnoh-sea-route-226-area'],
    230: ['sinnoh-sea-route-230-area'],
  },
  'bdsp': {
    204: ['sinnoh-route-204-south-towards-jubilife-city', 'sinnoh-route-204-north-towards-floaroma-town'],
    205: ['sinnoh-route-205-south-towards-floaroma-town', 'sinnoh-route-205-east-towards-eterna-city'],
    210: ['sinnoh-route-210-south-towards-solaceon-town', 'sinnoh-route-210-west-towards-celestic-town'],
    211: ['sinnoh-route-211-west-towards-eterna-city', 'sinnoh-route-211-east-towards-celestic-town'],
    212: ['sinnoh-route-212-north-towards-hearthome-city', 'sinnoh-route-212-east-towards-pastoria-city'],
    220: ['sinnoh-sea-route-220-area'],
    223: ['sinnoh-sea-route-223-area'],
    226: ['sinnoh-sea-route-226-area'],
    230: ['sinnoh-sea-route-230-area'],
  },
  'schwarz-weiss': {
    10: ['unova-route-10-victory-road-gate'],
  },
  'schwarz2-weiss2': {
    10: ['unova-route-10-victory-road-gate'],
  },
  'schwert-schild': {
    3: ['galar-route-3-main', 'galar-route-3-garbage'],
    8: ['galar-route-8-main', 'galar-route-8-steamdrift-way'],
    9: ['galar-route-9-main', 'galar-route-9-circhester-bay', 'galar-route-9-outer-spikemouth'],
    10: ['galar-route-10-main', 'galar-route-10-near-station'],
  },
};

const ROUTE_AREA_UNAVAILABLE = {
  'rot-blau': [19, 20, 21],
  'gelb': [19, 20, 21],
  'feuerrot-blattgruen': [19, 20, 21],
  'letsgo': [19, 20, 21],
  'gold-silber': [19, 20, 21, 40, 41],
  'kristall': [19, 20, 21, 40, 41],
  'heartgold-soulsilver': [19, 20, 21, 40, 41],
  'diamant-perl': [220, 223, 226, 230],
  'platin': [220, 223, 226, 230],
  'bdsp': [220, 223, 226, 230],
};

const state = {
  runName: '',
  game: 'karmesin-purpur',
  checkpoint: 0,
  randomizer: false,
  eeveeException: false,
  encounters: [],
  graveyard: [],
  notes: '',
};

let allRuns = [];
let activeRunIdx = 0;

let pokemonList = [];
let allPokémonList = [];
let currentPokémonGeneration = 1;
let pickerTarget = 'encounter';
let routePokémonList = [];
let routePokémonState = { active: false, loading: false, location: '', message: '' };
let routePokémonRequestId = 0;
let selectedEncounterPokémon = null;
let selectedGraveyardPokémon = null;
const locationAreaCache = new Map();

const els = {
  langToggle: document.getElementById('lang-toggle'),
  checkpointProgressList: document.getElementById('checkpoint-progress-list'),
  checkpointName: document.getElementById('checkpoint-name'),
  checkpointType: document.getElementById('checkpoint-type'),
  checkpointCap: document.getElementById('checkpoint-cap'),
  encounterForm: document.getElementById('encounter-form'),
  encounterPlaceSelect: document.getElementById('encounter-place-select'),
  encounterPokémon: document.getElementById('encounter-pokemon'),
  encounterPreview: document.getElementById('encounter-preview'),
  encounterStatus: document.getElementById('encounter-status'),
  encounterMethod: document.getElementById('encounter-method'),
  randomizerToggle: document.getElementById('randomizer-toggle'),
  randoSlot: document.getElementById('rando-state-slot'),
  eeveeToggle: document.getElementById('eevee-toggle'),
  undoToast: document.getElementById('undo-toast'),
  undoText: document.getElementById('undo-text'),
  undoBtn: document.getElementById('undo-btn'),
  encounterList: document.getElementById('encounter-list'),
  graveyardForm: document.getElementById('graveyard-form'),
  graveyardName: document.getElementById('graveyard-name'),
  graveyardPreview: document.getElementById('graveyard-preview'),
  graveyardList: document.getElementById('graveyard-list'),
  runNotes: document.getElementById('run-notes'),
  resetRun: document.getElementById('reset-run'),
  resetConfirm: document.getElementById('reset-confirm'),
  resetConfirmYes: document.getElementById('reset-confirm-yes'),
  resetConfirmNo: document.getElementById('reset-confirm-no'),
  statCaught: document.getElementById('stat-caught'),
  statOpen: document.getElementById('stat-open'),
  statFailed: document.getElementById('stat-failed'),
  statGraveyard: document.getElementById('stat-graveyard'),
  pokemonModal: document.getElementById('pokemon-modal'),
  pokemonModalTitle: document.getElementById('pokemon-modal-title'),
  closePokémonModal: document.getElementById('close-pokemon-modal'),
  pokemonGeneration: document.getElementById('pokemon-generation'),
  pokemonSearch: document.getElementById('pokemon-search'),
  pokemonRouteHint: document.getElementById('pokemon-route-hint'),
  pokemonList: document.getElementById('pokemon-list'),
};

function applyStaticTranslations() {
  document.documentElement.lang = window.LANG;
  document.querySelectorAll('[data-i18n]').forEach(element => {
    element.textContent = t(element.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    element.placeholder = t(element.dataset.i18nPlaceholder);
  });
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    element.title = t(element.dataset.i18nTitle);
    if (element.hasAttribute('aria-label')) element.setAttribute('aria-label', element.title);
  });
  document.querySelectorAll('[data-i18n-aria]').forEach(element => {
    element.setAttribute('aria-label', t(element.dataset.i18nAria));
  });
  els.langToggle.textContent = window.LANG.toUpperCase();
  els.langToggle.title = window.LANG === 'de' ? 'Sprache wechseln' : 'Switch language';
}

function applyLanguage() {
  applyStaticTranslations();
  if (selectedEncounterPokémon) els.encounterPokémon.value = pokemonDisplayName(selectedEncounterPokémon);
  if (selectedGraveyardPokémon) els.graveyardName.value = pokemonDisplayName(selectedGraveyardPokémon);
  renderRunSelect();
  renderCheckpointOptions();
  renderCheckpointCard();
  renderCheckpointProgress();
  renderLocationOptions();
  renderRandomizerToggle();
  renderEncounters();
  renderGraveyard();
  if (els.pokemonModal.style.display === 'flex') {
    els.pokemonModalTitle.textContent = pickerTarget === 'graveyard'
      ? t('graveyardPokemonSearch')
      : t('encounterPokemonSearch');
    if (pickerTarget === 'encounter') {
      prepareEncounterPokémonScope();
    } else {
      renderPokémonList(els.pokemonSearch.value);
    }
  }
}

function toggleLanguage() {
  window.LANG = window.LANG === 'de' ? 'en' : 'de';
  localStorage.setItem(LANG_STORAGE_KEY, window.LANG);
  applyLanguage();
  document.dispatchEvent(new CustomEvent('langchange'));
}

const RUNS_KEY = 'pokemon-run-dashboard-runs';

function freshRun() {
  return { runName: '', game: 'karmesin-purpur', checkpoint: 0, randomizer: false, eeveeException: false, encounters: [], graveyard: [], notes: '' };
}

function coerceRun(data) {
  const run = Object.assign(freshRun(), data);
  if (!LEVEL_CAPS[run.game]) run.game = 'karmesin-purpur';
  run.randomizer = Boolean(run.randomizer);
  run.eeveeException = Boolean(run.eeveeException);
  run.encounters = Array.isArray(run.encounters) ? run.encounters : [];
  run.graveyard = Array.isArray(run.graveyard) ? run.graveyard : [];
  run.notes = typeof run.notes === 'string' ? run.notes : '';
  return run;
}

function applyRun(run) {
  const r = coerceRun(run);
  state.runName = r.runName;
  state.game = r.game;
  state.checkpoint = r.checkpoint;
  state.randomizer = r.randomizer;
  state.eeveeException = r.eeveeException;
  state.encounters = r.encounters;
  state.graveyard = r.graveyard;
  state.notes = r.notes;
}

function renderRunSelect() {
  const tabsEl = document.getElementById('run-tabs');
  if (!tabsEl) return;
  tabsEl.innerHTML = allRuns.map((r, i) => {
    const covers = GAME_COVERS[r.game] || [];
    const coverHtml = covers.length > 0
      ? `<div class="run-tab-cover">${covers.map(url => `<img src="${url}" alt="" loading="lazy">`).join('')}</div>`
      : '';
    return `<button class="run-tab${i === activeRunIdx ? ' is-active' : ''}" data-run-idx="${i}" type="button">
      ${coverHtml}
      <span class="run-tab-name">${escapeHtml(r.runName || gameLabel(r.game || 'karmesin-purpur'))}</span>
    </button>`;
  }).join('');
  const delBtn = document.getElementById('run-delete-btn');
  if (delBtn) delBtn.disabled = allRuns.length === 0;
  const renameBtn = document.getElementById('run-rename-btn');
  if (renameBtn) renameBtn.disabled = allRuns.length === 0;
  // Ohne Run: Startkarte statt Dashboard zeigen
  document.getElementById('app').classList.toggle('is-empty', allRuns.length === 0);
}

// Gewählter oder neuer Run: sein Spiel wird das aktive Spiel des Hubs (pwa.js)
const announceRunGame = () => window.PokeHubGame?.set(state.game);

function switchToRun(idx) {
  save();
  activeRunIdx = idx;
  applyRun(allRuns[idx]);
  announceRunGame();
  save(); // gewählten Run auch als aktiven merken, sonst öffnet die Seite beim nächsten Mal den vorherigen
  render();
  renderRunSelect();
}

let selectedModalGame = null;
let activeGenFilter = 0;

function renderGameSelectGrid() {
  const grid = document.getElementById('game-select-grid');
  if (!grid) return;
  grid.innerHTML = Object.keys(LEVEL_CAPS).map(k => {
    const covers = GAME_COVERS[k] || [];
    const coverHtml = covers.map(url => `<img src="${url}" alt="" loading="eager" onerror="this.style.opacity='0'">`).join('');
    return `<button class="game-card" data-game-key="${k}" data-gen="${GAME_GEN_GROUP[k] || 0}" type="button">
      <div class="game-card-covers">${coverHtml}</div>
      <span class="game-card-label">${escapeHtml(gameLabel(k))}</span>
    </button>`;
  }).join('');
}

let gameGridCached = false;

function showGameSelectModal() {
  selectedModalGame = null;
  activeGenFilter = 0;
  const nameInput = document.getElementById('run-new-name-input');
  nameInput.value = '';
  nameInput.placeholder = t('runNamePlaceholder');
  const confirmBtn = document.getElementById('game-select-confirm');
  if (confirmBtn) confirmBtn.disabled = true;
  document.querySelectorAll('.gen-tab').forEach(t => t.classList.toggle('is-active', t.dataset.gen === '0'));
  document.querySelectorAll('.game-card').forEach(c => { c.classList.remove('is-selected'); c.style.display = ''; });
  document.querySelectorAll('.game-card img[style*="opacity"]').forEach(img => { img.style.opacity = ''; img.src = img.src; });
  if (!gameGridCached) { renderGameSelectGrid(); gameGridCached = true; }
  document.getElementById('game-select-modal').style.display = 'flex';
}

function hideGameSelectModal() {
  document.getElementById('game-select-modal').style.display = 'none';
}

function createNewRun(game, name) {
  save();
  const run = freshRun();
  run.game = game || 'karmesin-purpur';
  run.runName = name || gameLabel(run.game);
  allRuns.push(run);
  activeRunIdx = allRuns.length - 1;
  applyRun(run);
  announceRunGame();
  save();
  render();
  renderRunSelect();
}

function deleteCurrentRun() {
  deleteRun(activeRunIdx);
}

function deleteRun(idx) {
  if (allRuns.length <= 1) { resetRun(); return; }
  allRuns.splice(idx, 1);
  if (activeRunIdx >= allRuns.length) activeRunIdx = allRuns.length - 1;
  else if (idx < activeRunIdx) activeRunIdx--;
  applyRun(allRuns[activeRunIdx]);
  announceRunGame();
  save();
  render();
  renderRunSelect();
}

let deletePopupTargetIdx = -1;

function showDeletePopup(idx, x, y) {
  deletePopupTargetIdx = idx;
  const popup = document.getElementById('run-delete-popup');
  popup.style.display = '';
  const vw = window.innerWidth, vh = window.innerHeight;
  const pw = 180, ph = 90;
  popup.style.left = Math.min(x, vw - pw - 8) + 'px';
  popup.style.top  = Math.min(y, vh - ph - 8) + 'px';
}

function hideDeletePopup() {
  document.getElementById('run-delete-popup').style.display = 'none';
  deletePopupTargetIdx = -1;
}

// true = dauerhaft gespeichert. Klappt das nicht (Speicher voll), gibt es einen sichtbaren Hinweis –
// sonst ginge der Stand beim Schließen unbemerkt verloren.
function save() {
  if (allRuns.length === 0) return writeRuns({ active: 0, runs: [] });
  allRuns[activeRunIdx] = JSON.parse(JSON.stringify(state));
  return writeRuns({ active: activeRunIdx, runs: allRuns });
}

function writeRuns(data) {
  try {
    localStorage.setItem(RUNS_KEY, JSON.stringify(data));
    window.PokeHubStorageWarning?.(false);
    return true;
  } catch (e) {
    console.error('Speichern fehlgeschlagen:', e);
    window.PokeHubStorageWarning?.(true);
    return false;
  }
}


function load() {
  // Try new multi-run format
  try {
    const raw = localStorage.getItem(RUNS_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      if (Array.isArray(data.runs) && data.runs.length > 0) {
        allRuns = data.runs;
        activeRunIdx = Math.min(Math.max(0, data.active || 0), allRuns.length - 1);
        applyRun(allRuns[activeRunIdx]);
        return;
      }
    }
  } catch {}
  // Migrate old single-run format
  try {
    const oldRaw = localStorage.getItem(STORAGE_KEY);
    if (oldRaw) {
      allRuns = [coerceRun(JSON.parse(oldRaw))];
      activeRunIdx = 0;
      applyRun(allRuns[0]);
      // Altes Format erst entfernen, wenn das neue sicher gespeichert ist
      if (save()) localStorage.removeItem(STORAGE_KEY);
      return;
    }
  } catch {}
  // Default: no runs — the start card offers "Neuen Run starten"
  allRuns = [];
  activeRunIdx = 0;
}


function renderCheckpointOptions() {
  const game = LEVEL_CAPS[state.game];
  const maxIndex = game.entries.length - 1;
  state.checkpoint = Math.min(Number(state.checkpoint) || 0, maxIndex);
}

function renderCheckpointCard() {
  const entry = LEVEL_CAPS[state.game].entries[state.checkpoint];
  els.checkpointName.textContent = checkpointNameLabel(entry, state.checkpoint);
  els.checkpointType.textContent = entry.type ? `${t('typePrefix')}: ${typeLabel(entry.type)}` : t('eliteChampion');
  els.checkpointCap.textContent = entry.cap ? `Lv.${entry.cap}` : '-';
}

function renderCheckpointProgress() {
  const entries = LEVEL_CAPS[state.game].entries;
  els.checkpointProgressList.innerHTML = entries.map((entry, index) => {
    const isDone = index < state.checkpoint;
    const isCurrent = index === state.checkpoint;
    const cls = isDone ? 'is-done' : isCurrent ? 'is-current' : 'is-future';
    // Aktueller Kampf: gezeichnetes Dreieck (das Zeichen ▶ wäre auf dem iPhone ein Emoji)
    const icon = isDone ? escapeHtml('✓') : isCurrent ? '<svg viewBox="0 0 10 10" aria-hidden="true"><path d="M3 1.8 8.4 5 3 8.2z" fill="currentColor"/></svg>' : String(index + 1);
    const name = checkpointNameLabel(entry, index);
    const cap = entry.cap ? `Lv.${entry.cap}` : '';
    return `
      <div class="cp-item ${cls}" data-cp-index="${index}" title="${escapeHtml(name + ' – ' + t(isDone ? 'cpUnmark' : 'cpMark'))}">
        <div class="cp-icon">${icon}</div>
        <div class="cp-name">${escapeHtml(name)}</div>
        <div class="cp-cap">${escapeHtml(cap)}</div>
      </div>
    `;
  }).join('');
}

function renderLocationOptions() {
  const selectedLocation = els.encounterPlaceSelect.value;
  const knownLocations = [...new Set([
    STARTER_LOCATION,
    ...(LOCATION_PRESETS[state.game] || []),
    ...(LOCATION_SPECIALS[state.game] || []),
    ...(LOCATION_EXTRAS[state.game] || []),
  ])];
  const ordered = [STARTER_LOCATION, ...(LOCATION_ORDER[state.game] || []), ...(LOCATION_SPECIALS[state.game] || [])];
  const orderedSet = new Set(ordered);
  const locations = [
    ...ordered.filter(location => knownLocations.includes(location)),
    ...knownLocations.filter(location => !orderedSet.has(location)),
  ];
  // Nuzlocke: pro Ort zählt nur die erste Begegnung – eingetragene Orte sind ausgegraut
  const used = new Set(state.encounters.map(entry => entry.place));
  els.encounterPlaceSelect.innerHTML = locations
    .map(location => used.has(location)
      ? `<option value="${escapeHtml(location)}" disabled>${escapeHtml(locationLabel(location))} · ${escapeHtml(t('placeUsed'))}</option>`
      : `<option value="${escapeHtml(location)}">${escapeHtml(locationLabel(location))}</option>`)
    .join('');
  const free = locations.filter(location => !used.has(location));
  els.encounterPlaceSelect.value = free.includes(selectedLocation) ? selectedLocation : (free[0] || '');
}

function renderRandomizerToggle() {
  els.randomizerToggle.classList.toggle('is-active', state.randomizer);
  els.randomizerToggle.setAttribute('aria-pressed', String(state.randomizer));
  // Randomizer-Run in Platin: Chip „Randomizer: ROM ×“ bzw. „Randomizer-ROM laden“ daneben
  if (els.randoSlot) els.randoSlot.hidden = !(state.randomizer && state.game === 'platin' && window.PokeHubRando);
  els.eeveeToggle.classList.toggle('is-active', state.eeveeException);
  els.eeveeToggle.setAttribute('aria-pressed', String(state.eeveeException));
}

function statusLabel(status) {
  return {
    caught: t('status.caught'),
    open: t('status.open'),
    failed: t('status.failed'),
    dead: t('status.dead'),
  }[status] || t('status.open');
}

function methodLabel(method) {
  return {
    wild: t('method.wild'),
    grass: t('method.grass'),
    fishing: t('method.fishing'),
    surf: t('method.surf'),
    cave: t('method.cave'),
    starter: t('method.starter'),
    static: t('method.static'),
    gift: t('method.gift'),
    raid: t('method.raid'),
    trade: t('method.trade'),
    other: t('method.other'),
  }[method] || t('method.wild');
}

function escapeHtml(value) {
  return String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

function capitalize(value) {
  return String(value).charAt(0).toUpperCase() + String(value).slice(1);
}

function getCurrentEncounterLocation() {
  return (els.encounterPlaceSelect.value || '').trim();
}

function knownLocationsForGame(game) {
  return new Set([
    STARTER_LOCATION,
    ...(LOCATION_PRESETS[game] || []),
    ...(LOCATION_SPECIALS[game] || []),
    ...(LOCATION_EXTRAS[game] || []),
    ...(LOCATION_ORDER[game] || []),
  ]);
}

function isKnownLocation(game, location) {
  return knownLocationsForGame(game).has(location);
}

function usesFreePokémonSearch(location) {
  return !location ||
    location.includes('Geschenk') ||
    location.includes('Tausch') ||
    location.includes('Raid') ||
    location === 'Dyna-Riesennest' ||
    location.includes('Massenausbruch');
}

function getRouteRegion(game, routeNumber) {
  if (game === 'heartgold-soulsilver') {
    return routeNumber >= 29 ? 'johto' : 'kanto';
  }
  return ROUTE_REGION_BY_GAME[game] || null;
}

function getLocationAreaSlugs(game, location) {
  if (!location || location.includes('Geschenk')) return [];

  const aliases = LOCATION_AREA_ALIASES[game]?.[location] || [];
  const routeMatch = location.match(/^Route\s+(\d+)$/i);
  const routeSlugs = [];

  if (routeMatch) {
    const routeNumber = Number(routeMatch[1]);
    const region = getRouteRegion(game, routeNumber);
    routeSlugs.push(...(ROUTE_AREA_ALIASES[game]?.[routeNumber] || []));
    const missingDefaultArea = (ROUTE_AREA_UNAVAILABLE[game] || []).includes(routeNumber);
    if (region && !missingDefaultArea) routeSlugs.push(`${region}-route-${routeNumber}-area`);
  }

  return [...new Set([...routeSlugs, ...aliases])];
}

function pokemonFromApiReference(reference) {
  const idMatch = reference.url.match(/\/pokemon\/(\d+)\//);
  const id = idMatch ? Number(idMatch[1]) : null;
  if (!id) return null;
  return {
    id,
    name: reference.name,
    displayName: capitalize(reference.name),
    englishName: capitalize(reference.name),
    sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
  };
}

function starterPokémonForGame(game) {
  return (STARTER_POKEMON[game] || []).map(pokemon => ({
    ...pokemon,
    displayName: capitalize(pokemon.name),
    englishName: capitalize(pokemon.name),
    sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`,
    isStarter: true,
  }));
}

function staticPokémonForLocation(game, location) {
  return (STATIC_LOCATION_POKEMON[game]?.[location] || []).map(pokemon => ({
    ...pokemon,
    displayName: pokemon.displayName || capitalize(pokemon.name),
    englishName: pokemon.englishName || capitalize(pokemon.name),
    sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${pokemon.id}.png`,
    isStatic: true,
  }));
}

async function getLocationArea(slug) {
  if (locationAreaCache.has(slug)) return locationAreaCache.get(slug);
  try {
    const response = await fetch(`${POKEAPI_BASE_URL}/location-area/${slug}`);
    if (!response.ok) throw new Error(`Location "${slug}" nicht gefunden`);
    const area = await response.json();
    locationAreaCache.set(slug, area);
    return area;
  } catch {
    locationAreaCache.set(slug, null);
    return null;
  }
}

async function getRoutePokémon(game, location) {
  const slugs = getLocationAreaSlugs(game, location);
  if (!slugs.length) return { status: 'unmapped', pokemon: [] };

  const versionKeys = GAME_VERSION_KEYS[game] || [];
  const areas = (await Promise.all(slugs.map(getLocationArea))).filter(Boolean);
  if (!areas.length) return { status: 'unavailable', pokemon: [] };

  const byId = new Map();
  const methodNames = new Set();
  areas.forEach(area => {
    (area.pokemon_encounters || []).forEach(encounter => {
      const versionDetails = (encounter.version_details || []).filter(detail =>
        versionKeys.includes(detail.version?.name)
      );
      if (!versionDetails.length) return;
      versionDetails.forEach(detail => {
        (detail.encounter_details || []).forEach(encounterDetail => {
          if (encounterDetail.method?.name) methodNames.add(encounterDetail.method.name);
        });
      });
      const pokemon = pokemonFromApiReference(encounter.pokemon);
      if (pokemon && !byId.has(pokemon.id)) byId.set(pokemon.id, pokemon);
    });
  });

  return {
    status: 'ok',
    methods: [...methodNames],
    pokemon: [...byId.values()].sort((a, b) => a.id - b.id),
  };
}

function renderPokémonMessage(message) {
  els.pokemonList.innerHTML = `<li class="list-message">${escapeHtml(message)}</li>`;
}

function renderRouteHint(html = '') {
  els.pokemonRouteHint.innerHTML = html;
  els.pokemonRouteHint.classList.toggle('is-visible', Boolean(html));
}

function methodSummary(methods = []) {
  const methodSet = new Set(methods);
  const labels = [];
  if (methodSet.has('walk')) labels.push(t('summary.walk'));
  if (['old-rod', 'good-rod', 'super-rod'].some(method => methodSet.has(method))) labels.push(t('summary.fishing'));
  if (methodSet.has('surf')) labels.push(t('summary.surf'));
  if (methodSet.has('rock-smash')) labels.push(t('summary.rockSmash'));
  if (methodSet.has('headbutt')) labels.push(t('summary.headbutt'));
  return labels.length ? ` (${labels.join(', ')})` : '';
}

// Namen aus pokemon-names.js (sofort da, auch offline) – vorher eine Anfrage je Pokémon
function enrichPokémonNames(list) {
  list.forEach(pokemon => {
    const de = window.pokemonName(pokemon.id, pokemon.name, 'de');
    const en = window.pokemonName(pokemon.id, pokemon.name, 'en');
    if (de) { pokemon.displayName = de; pokemon.germanName = de; }
    if (en) pokemon.englishName = en;
  });
}

// Randomizer-Run in Platin: Pokémon der Route aus dem Randomizer-Stand (rando-state.js, Karte/encounter-areas.js)
// → { ids, name } | { missing } (kein Stand) | { old } (Stand ohne wilde Pokémon) | null (Ort ohne Daten)
function randoRouteSpecies(location) {
  if (state.game !== 'platin' || !window.PokeHubRando) return null;
  const rd = window.PokeHubRando.get();
  if (!rd) return { missing: true };
  if (location === STARTER_LOCATION) return rd.starters ? { ids: rd.starters, name: rd.name } : null;
  if (!Array.isArray(rd.wild)) return { old: true };
  const ids = window.PokeHubRando.speciesAt(rd, location);
  return ids ? { ids, name: rd.name } : null;
}

async function prepareEncounterPokémonScope() {
  routePokémonRequestId += 1;
  const requestId = routePokémonRequestId;
  routePokémonList = [];
  routePokémonState = { active: false, loading: false, location: '', message: '' };
  els.pokemonGeneration.disabled = false;

  if (pickerTarget !== 'encounter') {
    renderRouteHint('');
    renderPokémonList(els.pokemonSearch.value);
    return;
  }

  const location = getCurrentEncounterLocation();
  const knownLocation = isKnownLocation(state.game, location);

  if (state.randomizer) {
    els.pokemonGeneration.disabled = true;
    const rr = randoRouteSpecies(location);
    if (rr && rr.ids && rr.ids.length) {
      const byId = new Map(allPokémonList.map(p => [p.id, p]));
      routePokémonList = rr.ids.map(id => byId.get(id) || {
        id, name: String(id), displayName: window.pokemonName(id, null) || `#${id}`,
        sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`,
      });
      routePokémonState = { active: true, loading: false, location, message: `${locationLabel(location)}: ${rr.ids.length} ${t('possibleEncounters')}` };
      renderRouteHint(`<strong>${escapeHtml(locationLabel(location))}</strong>: ${rr.ids.length} ${escapeHtml(t('possibleEncounters'))} ${escapeHtml(t('randoFrom', { name: rr.name }))}`);
      enrichPokémonNames(routePokémonList);
    } else {
      renderRouteHint(rr && rr.missing ? escapeHtml(t('randoLoadHint')) : rr && rr.old ? escapeHtml(t('randoOldHint')) : '');
    }
    renderPokémonList(els.pokemonSearch.value);
    return;
  }

  if (location === STARTER_LOCATION) {
    routePokémonList = starterPokémonForGame(state.game);
    routePokémonState = {
      active: true,
      loading: false,
      location,
      message: routePokémonList.length ? `${gameLabel(state.game)}: ${t('starterPokemon')}` : t('noStarters'),
    };
    els.pokemonGeneration.disabled = true;
    renderRouteHint(`<strong>${escapeHtml(locationLabel(location))}</strong>: ${escapeHtml(t('chooseStarter'))} ${escapeHtml(gameLabel(state.game))}.`);
    enrichPokémonNames(routePokémonList);
    renderPokémonList(els.pokemonSearch.value);
    return;
  }

  const staticPokémon = staticPokémonForLocation(state.game, location);
  if (staticPokémon.length) {
    routePokémonList = staticPokémon;
    routePokémonState = {
      active: true,
      loading: false,
      location,
      message: `${locationLabel(location)}: ${staticPokémon.length} ${t('possibleEncounters')}`,
    };
    els.pokemonGeneration.disabled = true;
    renderRouteHint(`<strong>${escapeHtml(locationLabel(location))}</strong>: ${staticPokémon.length} ${escapeHtml(t('possibleEncounters'))} ${escapeHtml(t('forGame'))} ${escapeHtml(gameLabel(state.game))}.`);
    enrichPokémonNames(routePokémonList);
    renderPokémonList(els.pokemonSearch.value);
    return;
  }

  const slugs = getLocationAreaSlugs(state.game, location);

  if (!location || usesFreePokémonSearch(location) || (!knownLocation && !slugs.length)) {
    const hint = location
      ? t('freeSearchHint')
      : t('chooseLocationHint');
    renderRouteHint(hint);
    renderPokémonList(els.pokemonSearch.value);
    return;
  }

  if (!slugs.length) {
    routePokémonState = {
      active: true,
      loading: false,
      location,
      message: t('noWildEncounters'),
    };
    els.pokemonGeneration.disabled = true;
    renderRouteHint(`<strong>${escapeHtml(locationLabel(location))}</strong>: ${escapeHtml(t('noWildEncounters'))}`);
    renderPokémonList(els.pokemonSearch.value);
    return;
  }

  routePokémonState = { active: true, loading: true, location, message: '' };
  els.pokemonGeneration.disabled = true;
  renderRouteHint(`<strong>${escapeHtml(locationLabel(location))}</strong>: ${escapeHtml(t('encountersLoading'))}`);
  renderPokémonList(els.pokemonSearch.value);

  const result = await getRoutePokémon(state.game, location);
  if (requestId !== routePokémonRequestId) return;

  if (result.status === 'ok' && result.pokemon.length) {
    routePokémonList = result.pokemon;
    routePokémonState = {
      active: true,
      loading: false,
      location,
      message: `${locationLabel(location)}: ${result.pokemon.length} ${t('possibleEncounters')}${methodSummary(result.methods)}`,
    };
    renderRouteHint(`<strong>${escapeHtml(locationLabel(location))}</strong>: ${result.pokemon.length} ${escapeHtml(t('possibleEncounters'))}${escapeHtml(methodSummary(result.methods))} ${escapeHtml(t('forGame'))} ${escapeHtml(gameLabel(state.game))}.`);
    enrichPokémonNames(routePokémonList);
  } else {
    routePokémonList = [];
    routePokémonState = {
      active: true,
      loading: false,
      location,
      message: t('noWildInGame', { game: gameLabel(state.game) }),
    };
    els.pokemonGeneration.disabled = true;
    renderRouteHint(`<strong>${escapeHtml(location)}</strong>: ${escapeHtml(routePokémonState.message)}`);
  }

  renderPokémonList(els.pokemonSearch.value);
}

function pokemonDisplayName(pokemon) {
  return pokemonNameLabel(pokemon);
}

function pokemonSprite(pokemon) {
  return pokemon && typeof pokemon === 'object' ? pokemon.sprite : '';
}

function normalizePokémonEntry(pokemon) {
  if (!pokemon) return null;
  return {
    id: pokemon.id || null,
    name: pokemon.name || pokemon.displayName || '',
    displayName: pokemon.displayName || pokemon.germanName || pokemon.name || '',
    germanName: pokemon.germanName || pokemon.displayName || '',
    englishName: pokemon.englishName || (pokemon.name ? capitalize(pokemon.name) : ''),
    sprite: pokemon.sprite || '',
    isStarter: Boolean(pokemon.isStarter),
  };
}

function renderSelectedPokémonPreview(target, pokemon) {
  const preview = target === 'graveyard' ? els.graveyardPreview : els.encounterPreview;
  if (target === 'encounter') {
    els.encounterPokémon.closest('.field').classList.toggle('has-pokemon-preview', Boolean(pokemon));
  }
  if (!pokemon) {
    preview.style.display = 'none';
    preview.innerHTML = '';
    return;
  }
  preview.style.display = 'flex';
  preview.innerHTML = `
    ${pokemon.sprite ? `<img src="${escapeHtml(pokemon.sprite)}" alt="">` : ''}
    <span>${escapeHtml(pokemonDisplayName(pokemon))}</span>
  `;
}

function renderStats() {
  els.statCaught.textContent = state.encounters.filter(e => e.status === 'caught').length;
  els.statOpen.textContent = state.encounters.filter(e => e.status === 'open').length;
  els.statFailed.textContent = state.encounters.filter(e => e.status === 'failed').length;
  els.statGraveyard.textContent = graveyardEntries().length;
}

const TRASH_ICON = '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6M14 11v6"/></svg>';

function renderEncounters() {
  if (state.encounters.length === 0) {
    els.encounterList.innerHTML = `<div class="empty">${escapeHtml(t('noEncounters'))}</div>`;
    return;
  }

  els.encounterList.innerHTML = state.encounters.map((entry, index) => `
    <div class="encounter-row${entry.status === 'dead' ? ' is-dead' : ''}" data-encounter-index="${index}">
      <div class="encounter-place" title="${escapeHtml(locationLabel(entry.place))}">${escapeHtml(locationLabel(entry.place))}</div>
      <div class="pokemon-cell encounter-pokemon" title="${escapeHtml(pokemonDisplayName(entry.pokemon) || '-')}">
        ${pokemonSprite(entry.pokemon) ? `<img src="${escapeHtml(pokemonSprite(entry.pokemon))}" alt="">` : ''}
        <span>${escapeHtml(pokemonDisplayName(entry.pokemon) || '-')}</span>
      </div>
      <span class="status-pill method-${escapeHtml(entry.method || 'wild')}">${escapeHtml(methodLabel(entry.method))}</span>
      <span class="status-pill status-${escapeHtml(entry.status)} is-action" role="button" tabindex="0" aria-haspopup="menu" data-status-index="${index}" title="${escapeHtml(entry.status === 'dead' && entry.death ? entry.death : t('changeStatusTitle'))}">${statusLabel(entry.status)}</span>
      ${entry.status === 'caught'
        ? `<button type="button" class="icon-btn kill-btn" data-kill-index="${index}" title="${escapeHtml(t('killTitle'))}" aria-label="${escapeHtml(t('killTitle'))}">†</button>`
        : '<span class="kill-slot" aria-hidden="true"></span>'}
      <button class="icon-btn delete-btn" data-delete-index="${index}" title="${escapeHtml(t('deleteEncounterTitle'))}" aria-label="${escapeHtml(t('deleteEncounterTitle'))}">${TRASH_ICON}</button>
    </div>
  `).join('');
}

// Graveyard = gestorbene Encounters (mit Ort und Ursache) + frühere, von Hand eingetragene Pokémon
function graveyardEntries() {
  const fromEncounters = state.encounters
    .map((entry, index) => ({ entry, index }))
    .filter(x => x.entry.status === 'dead')
    .map(x => ({ pokemon: x.entry.pokemon, place: x.entry.place, cause: x.entry.death || '', ref: `e${x.index}` }));
  return [...fromEncounters, ...state.graveyard.map((pokemon, index) => ({ pokemon, place: '', cause: '', ref: `g${index}` }))];
}

function renderGraveyard() {
  const entries = graveyardEntries();
  if (entries.length === 0) {
    els.graveyardList.innerHTML = `<div class="empty">${escapeHtml(t('emptyGraveyard'))}</div>`;
    return;
  }

  els.graveyardList.innerHTML = entries.map(({ pokemon, place, cause, ref }) => {
    const sub = [place ? locationLabel(place) : '', cause].filter(Boolean).join(' · ');
    return `
    <span class="tag" data-graveyard-ref="${ref}"${sub ? ` title="${escapeHtml(sub)}"` : ''}>
      ${pokemonSprite(pokemon) ? `<img src="${escapeHtml(pokemonSprite(pokemon))}" alt="">` : ''}
      <span class="tag-text">${escapeHtml(pokemonDisplayName(pokemon))}${cause ? `<small>${escapeHtml(cause)}</small>` : ''}</span>
      <button class="tag-remove-btn" data-graveyard-remove="${ref}" title="${escapeHtml(t('removeGraveyardTitle'))}" aria-label="${escapeHtml(t('removeGraveyardTitle'))}">&#215;</button>
    </span>
  `;
  }).join('');
}

// Generation der Pokémon-Auswahl passend zum Spiel des Runs – auch beim Anlegen oder Wechseln
// eines Runs, nicht nur beim Laden der Seite (eine eigene Wahl im Fenster bleibt sonst erhalten)
let generationGame = null;
function syncPokémonGeneration() {
  if (state.game === generationGame) return;
  const first = generationGame === null;
  generationGame = state.game;
  const gen = GAME_DEFAULT_GENERATION[state.game] || currentPokémonGeneration;
  if (!first && gen !== currentPokémonGeneration) loadPokémonList(gen);   // beim Start lädt die Liste unten
  currentPokémonGeneration = gen;
}

function render() {
  syncPokémonGeneration();
  renderCheckpointOptions();
  renderCheckpointCard();
  renderCheckpointProgress();
  renderLocationOptions();
  renderRandomizerToggle();
  renderStats();
  renderEncounters();
  renderGraveyard();
  renderNotes();
  renderRunSelect();
  hideUndo();
}

function showResetConfirm() {
  els.resetRun.style.display = 'none';
  els.resetConfirm.style.display = 'flex';
}

function hideResetConfirm() {
  els.resetRun.style.display = '';
  els.resetConfirm.style.display = 'none';
}

function resetRun() {
  allRuns = [];
  activeRunIdx = 0;
  save();
  renderRunSelect();
  hideResetConfirm();
}

async function loadPokémonList(gen = 1) {
  currentPokémonGeneration = gen;
  renderPokémonMessage(t('loadingPokemon'));

  try {
    const list = await getGenerationList(gen);
    pokemonList = list.map(pokemonFromApiReference).filter(Boolean);
    enrichPokémonNames(pokemonList);

    renderPokémonList(els.pokemonSearch.value);
  } catch {
    renderPokémonMessage(t('pokemonLoadFailed'));
  }
}

async function loadAllPokémonBasic() {
  const generations = [1, 2, 3, 4, 5, 6, 7, 8, 9];
  const results = await Promise.allSettled(generations.map(gen => getGenerationList(gen)));
  allPokémonList = results.flatMap(result => {
    if (result.status !== 'fulfilled') return [];
    return result.value.map(pokemonFromApiReference).filter(Boolean);
  });
  enrichPokémonNames(allPokémonList);
}

function renderPokémonList(filter = '') {
  const search = filter.trim().toLowerCase();
  const routeScoped = pickerTarget === 'encounter' && routePokémonState.active;
  const randomizerScoped = pickerTarget === 'encounter' && state.randomizer;

  if (routeScoped && routePokémonState.loading) {
    renderPokémonMessage(t('encountersLoading'));
    return;
  }

  const source = routeScoped ? routePokémonList : (randomizerScoped ? allPokémonList : (search ? allPokémonList : pokemonList));

  if (!source.length) {
    renderPokémonMessage(routeScoped ? (routePokémonState.message || t('noRoutePokemon')) : t('loadingPokemon'));
    return;
  }

  const filtered = source.filter(pokemon => [
    pokemonDisplayName(pokemon),
    pokemon.displayName,
    pokemon.germanName,
    pokemon.englishName,
    pokemon.name,
    String(pokemon.id),
  ].some(value => String(value || '').toLowerCase().includes(search)));

  if (!filtered.length) {
    renderPokémonMessage(routeScoped ? t('noPokemonOnRoute') : t('noPokemonFound'));
    return;
  }

  const showDupes = pickerTarget === 'encounter';
  els.pokemonList.innerHTML = filtered.slice(0, 120).map(pokemon => {
    const displayName = pokemonDisplayName(pokemon);
    const dupeOf = showDupes ? dupeInfo.get(pokemon.id) : null;
    return `
      <li data-pokemon-id="${pokemon.id}"${dupeOf ? ` class="is-dupe" title="${escapeHtml(t('dupeTitle', { p: pokemonDisplayName(dupeOf) }))}"` : ''}>
        <img src="${escapeHtml(pokemon.sprite)}" alt="${escapeHtml(displayName)}">
        <div class="pokemon-card-name" title="${escapeHtml(displayName)}">${escapeHtml(displayName)}</div>
        ${pokemon.isStarter ? `<div class="pokemon-card-badge">${escapeHtml(t('starterBadge'))}</div>` : ''}
        ${dupeOf ? `<div class="pokemon-card-badge is-dupe">${escapeHtml(t('dupe'))}</div>` : ''}
      </li>
    `;
  }).join('');
}

// ── Dupes-Klausel ─────────────────────────────────────────────────────────────
// Dupe = aus derselben Entwicklungsreihe ist schon ein Pokémon gefangen (auch wenn es inzwischen gestorben ist).
// Mit „Evoli-Ausnahme“ zählt jede Evoli-Entwicklung als eigene Art. Entwicklungsreihen kommen von PokéAPI
// (einmal geladen, danach aus dem Speicher); ohne Netz zählt nur dieselbe Art.
const EEVEE_LINE = new Set([133, 134, 135, 136, 196, 197, 470, 471, 700]);
const evoLineCache = new Map();    // Art-ID → Promise<Set<Art-ID>>
const formSpeciesCache = new Map(); // Formen (ID > 10000) → Art-ID
let dupeInfo = new Map();          // Art-ID → Pokémon, wegen dem es ein Dupe ist
let dupeRequest = 0;
const speciesIdFromUrl = url => { const m = /\/pokemon-species\/(\d+)\//.exec(url || ''); return m ? Number(m[1]) : null; };

function evoLine(speciesId) {
  if (!evoLineCache.has(speciesId)) {
    evoLineCache.set(speciesId, (async () => {
      const species = await (await fetch(`${POKEAPI_BASE_URL}/pokemon-species/${speciesId}`)).json();
      const chain = await (await fetch(species.evolution_chain.url)).json();
      const ids = new Set();
      (function walk(node) {
        const id = speciesIdFromUrl(node.species.url);
        if (id) ids.add(id);
        node.evolves_to.forEach(walk);
      })(chain.chain);
      return ids;
    })().catch(() => { evoLineCache.delete(speciesId); return new Set([speciesId]); }));
  }
  return evoLineCache.get(speciesId);
}

async function speciesIdOf(pokemon) {
  let id = typeof pokemon === 'object' && pokemon ? pokemon.id : null;
  if (!id) {
    // Von Hand eingetippter Name: in der Pokémon-Liste suchen
    const name = String(pokemonDisplayName(pokemon) || '').toLowerCase();
    const hit = name && [...allPokémonList, ...pokemonList].find(p => [p.displayName, p.germanName, p.englishName, p.name].some(n => String(n || '').toLowerCase() === name));
    id = hit ? hit.id : null;
  }
  if (!id || id <= 10000) return id;
  if (!formSpeciesCache.has(id)) {
    formSpeciesCache.set(id, fetch(`${POKEAPI_BASE_URL}/pokemon/${id}`).then(r => r.json()).then(d => speciesIdFromUrl(d.species?.url))
      .catch(() => { formSpeciesCache.delete(id); return null; }));
  }
  return formSpeciesCache.get(id);
}

async function refreshDupes() {
  const request = ++dupeRequest;
  const owned = [...state.encounters.filter(e => e.status === 'caught' || e.status === 'dead').map(e => e.pokemon), ...state.graveyard];
  const eevee = state.eeveeException;
  const lines = await Promise.all(owned.map(async pokemon => {
    const id = await speciesIdOf(pokemon);
    if (!id) return null;
    return { pokemon, ids: eevee && EEVEE_LINE.has(id) ? new Set([id]) : await evoLine(id) };
  }));
  if (request !== dupeRequest) return;
  const info = new Map();
  lines.filter(Boolean).forEach(({ pokemon, ids }) => ids.forEach(id => { if (!info.has(id)) info.set(id, pokemon); }));
  dupeInfo = info;
  if (els.pokemonModal.style.display === 'flex' && pickerTarget === 'encounter') renderPokémonList(els.pokemonSearch.value);
}

els.eeveeToggle.addEventListener('click', () => {
  state.eeveeException = !state.eeveeException;
  save();
  renderRandomizerToggle();
  refreshDupes();
});

function openPokémonModal(target) {
  pickerTarget = target;
  if (target === 'encounter') refreshDupes();
  els.pokemonModalTitle.textContent = target === 'graveyard' ? t('graveyardPokemonSearch') : t('encounterPokemonSearch');
  els.pokemonSearch.value = '';
  els.pokemonGeneration.value = String(currentPokémonGeneration);
  els.pokemonModal.style.display = 'flex';
  prepareEncounterPokémonScope();
  setTimeout(() => els.pokemonSearch.focus(), 0);
}

function closePokémonModal() {
  els.pokemonModal.style.display = 'none';
  renderRouteHint('');
}

function pickPokémon(pokemon) {
  const normalized = normalizePokémonEntry(pokemon);
  if (!normalized) return;

  if (pickerTarget === 'graveyard') {
    selectedGraveyardPokémon = normalized;
    els.graveyardName.value = pokemonDisplayName(normalized);
    renderSelectedPokémonPreview('graveyard', normalized);
    addGraveyardEntry();
  } else {
    selectedEncounterPokémon = normalized;
    els.encounterPokémon.value = pokemonDisplayName(normalized);
    renderSelectedPokémonPreview('encounter', normalized);
  }

  closePokémonModal();
}


els.encounterPlaceSelect.addEventListener('change', () => {
  const location = getCurrentEncounterLocation();
  selectedEncounterPokémon = null;
  els.encounterPokémon.value = '';
  renderSelectedPokémonPreview('encounter', null);
  if (location === STARTER_LOCATION) {
    els.encounterMethod.value = 'starter';
  } else if (els.encounterMethod.value === 'starter') {
    els.encounterMethod.value = 'wild';
  }
});

els.randomizerToggle.addEventListener('click', () => {
  state.randomizer = !state.randomizer;
  save();
  renderRandomizerToggle();
  if (els.pokemonModal.style.display === 'flex' && pickerTarget === 'encounter') {
    prepareEncounterPokémonScope();
  }
});



els.encounterPokémon.addEventListener('input', () => {
  if (selectedEncounterPokémon && els.encounterPokémon.value !== selectedEncounterPokémon.displayName) {
    selectedEncounterPokémon = null;
    renderSelectedPokémonPreview('encounter', null);
  }
});

els.graveyardName.addEventListener('input', () => {
  if (selectedGraveyardPokémon && els.graveyardName.value !== selectedGraveyardPokémon.displayName) {
    selectedGraveyardPokémon = null;
    renderSelectedPokémonPreview('graveyard', null);
  }
});

els.encounterPokémon.addEventListener('focus', () => openPokémonModal('encounter'));
els.graveyardName.addEventListener('focus', () => openPokémonModal('graveyard'));

els.encounterForm.addEventListener('submit', event => {
  event.preventDefault();
  const place = getCurrentEncounterLocation();
  const pokemonName = els.encounterPokémon.value.trim();
  if (!place || state.encounters.some(entry => entry.place === place)) return;
  // Ohne Pokémon kein Encounter (nachträglich eintragen geht nicht) – stattdessen gleich die Auswahl öffnen
  if (!pokemonName) { openPokémonModal('encounter'); return; }
  state.encounters.unshift({
    place,
    pokemon: selectedEncounterPokémon || pokemonName,
    method: place === STARTER_LOCATION ? 'starter' : els.encounterMethod.value,
    status: els.encounterStatus.value,
    createdAt: Date.now(),
  });
  els.encounterPokémon.value = '';
  els.encounterMethod.value = 'wild';
  els.encounterStatus.value = 'open';
  selectedEncounterPokémon = null;
  renderSelectedPokémonPreview('encounter', null);
  save();
  renderStats();
  renderEncounters();
  renderLocationOptions();   // Ort ist jetzt belegt → nächster freier Ort
});

// ── Status, Todesursache, Rückgängig ──────────────────────────────────────────
const STATUS_ORDER = ['caught', 'open', 'failed', 'dead'];

function renderAfterChange() {
  renderStats();
  renderEncounters();
  renderGraveyard();
  renderLocationOptions();   // gelöschter Ort ist wieder frei
}

function samePokemon(a, b) {
  if (a && b && typeof a === 'object' && typeof b === 'object' && a.id && b.id) return a.id === b.id;
  return pokemonDisplayName(a).toLowerCase() === pokemonDisplayName(b).toLowerCase();
}

function setEncounterStatus(index, status, cause = '') {
  const entry = state.encounters[index];
  if (!entry) return;
  entry.status = status;
  if (status === 'dead') {
    entry.death = cause.trim();
    // Vor dem Status „Gestorben“ von Hand in den Graveyard eingetragen? Dann ist es dieser Tod – nicht doppelt zeigen
    const manual = state.graveyard.findIndex(p => samePokemon(p, entry.pokemon));
    if (manual >= 0) state.graveyard.splice(manual, 1);
  } else {
    delete entry.death;
  }
  save();
  renderAfterChange();
  refreshDupes();
}

// Löschen sofort, aber ein paar Sekunden lang mit „Rückgängig“
let undoSnapshot = null, undoTimer = null;
function withUndo(message, change) {
  const snapshot = { run: activeRunIdx, encounters: JSON.parse(JSON.stringify(state.encounters)), graveyard: JSON.parse(JSON.stringify(state.graveyard)) };
  change();
  save();
  renderAfterChange();
  refreshDupes();
  undoSnapshot = snapshot;
  els.undoText.textContent = message;
  els.undoToast.hidden = false;
  clearTimeout(undoTimer);
  undoTimer = setTimeout(hideUndo, 7000);
}
function hideUndo() {
  clearTimeout(undoTimer);
  undoTimer = null;
  undoSnapshot = null;
  if (els.undoToast) els.undoToast.hidden = true;
}
els.undoBtn.addEventListener('click', () => {
  const snap = undoSnapshot;
  hideUndo();
  if (!snap || snap.run !== activeRunIdx) return;
  state.encounters = snap.encounters;
  state.graveyard = snap.graveyard;
  save();
  renderAfterChange();
  refreshDupes();
});

function deleteEncounter(index) {
  if (!state.encounters[index]) return;
  withUndo(t('undoEncounter'), () => state.encounters.splice(index, 1));
}

// Menü am Status: Gefangen / Offen / Verpasst / Gestorben (+ optionale Ursache)
const statusMenu = document.createElement('div');
statusMenu.className = 'status-menu';
statusMenu.setAttribute('role', 'menu');
statusMenu.hidden = true;
document.body.appendChild(statusMenu);
let statusMenuIndex = -1;

function placeStatusMenu(anchor) {
  const r = anchor.getBoundingClientRect();
  statusMenu.hidden = false;
  const w = statusMenu.offsetWidth, h = statusMenu.offsetHeight;
  const left = Math.max(8, Math.min(r.left, window.innerWidth - w - 8));
  const top = r.bottom + 6 + h > window.innerHeight ? Math.max(8, r.top - h - 6) : r.bottom + 6;
  statusMenu.style.left = `${left}px`;
  statusMenu.style.top = `${top}px`;
}

function openStatusMenu(index, anchor, askCause = false) {
  const entry = state.encounters[index];
  if (!entry) return;
  statusMenuIndex = index;
  if (askCause) {
    statusMenu.innerHTML = `<form class="status-menu-cause">
        <label for="death-cause">${escapeHtml(t('deathCauseLabel'))}</label>
        <input id="death-cause" type="text" maxlength="80" autocomplete="off" placeholder="${escapeHtml(t('deathCausePlaceholder'))}" value="${escapeHtml(entry.status === 'dead' ? entry.death || '' : '')}">
        <button class="btn btn-primary" type="submit">${escapeHtml(t('deathCauseSave'))}</button>
      </form>`;
    placeStatusMenu(anchor);
    const input = statusMenu.querySelector('input');
    input.focus();
    input.select();
    return;
  }
  statusMenu.innerHTML = STATUS_ORDER.map(status => `<button type="button" role="menuitemradio" aria-checked="${status === entry.status}" class="status-pill status-${status}${status === entry.status ? ' is-current' : ''}" data-set-status="${status}">${escapeHtml(statusLabel(status))}${status === 'dead' ? ' …' : ''}</button>`).join('');
  placeStatusMenu(anchor);
  statusMenu.querySelector('.is-current')?.focus();
}

function closeStatusMenu() {
  statusMenu.hidden = true;
  statusMenuIndex = -1;
}

statusMenu.addEventListener('click', event => {
  // Der Inhalt wird gleich ersetzt – der Klick darf nicht als „außerhalb“ beim Dokument ankommen
  event.stopPropagation();
  const btn = event.target.closest('[data-set-status]');
  if (!btn) return;
  const index = statusMenuIndex;
  const status = btn.dataset.setStatus;
  if (status === 'dead') {
    openStatusMenu(index, els.encounterList.querySelector(`[data-status-index="${index}"]`) || btn, true);
    return;
  }
  closeStatusMenu();
  setEncounterStatus(index, status);
});
statusMenu.addEventListener('submit', event => {
  event.preventDefault();
  const index = statusMenuIndex;
  const cause = statusMenu.querySelector('input')?.value || '';
  closeStatusMenu();
  setEncounterStatus(index, 'dead', cause);
});
document.addEventListener('click', event => {
  if (statusMenu.hidden || statusMenu.contains(event.target) || event.target.closest('[data-status-index], [data-kill-index]')) return;
  closeStatusMenu();
});
document.addEventListener('keydown', event => { if (event.key === 'Escape' && !statusMenu.hidden) closeStatusMenu(); });
// Beim Eintippen der Ursache (Handy: Tastatur schiebt die Seite) offen lassen
const closeUnlessTyping = () => { if (!statusMenu.querySelector('form')) closeStatusMenu(); };
window.addEventListener('resize', closeUnlessTyping);
document.addEventListener('scroll', event => { if (!statusMenu.contains(event.target)) closeUnlessTyping(); }, true);

els.encounterList.addEventListener('click', event => {
  const deleteBtn = event.target.closest('[data-delete-index]');
  if (deleteBtn) {
    deleteEncounter(Number(deleteBtn.dataset.deleteIndex));
    return;
  }
  // † = gestorben: gleich nach Ort / Gegner fragen
  const killBtn = event.target.closest('[data-kill-index]');
  if (killBtn) {
    openStatusMenu(Number(killBtn.dataset.killIndex), killBtn, true);
    return;
  }
  const statusPill = event.target.closest('[data-status-index]');
  if (!statusPill) return;
  const index = Number(statusPill.dataset.statusIndex);
  if (!statusMenu.hidden && statusMenuIndex === index) { closeStatusMenu(); return; }
  openStatusMenu(index, statusPill);
});

els.encounterList.addEventListener('keydown', event => {
  const statusPill = event.target.closest('[data-status-index]');
  if (!statusPill || (event.key !== 'Enter' && event.key !== ' ')) return;
  event.preventDefault();
  openStatusMenu(Number(statusPill.dataset.statusIndex), statusPill);
});

els.encounterList.addEventListener('contextmenu', event => {
  const row = event.target.closest('[data-encounter-index]');
  if (!row) return;
  event.preventDefault();
  deleteEncounter(Number(row.dataset.encounterIndex));
});

// ── Notizen ───────────────────────────────────────────────────────────────────
// Gespeichert wird kurz nach dem Tippen, beim Verlassen des Feldes und beim Schließen der Seite.
let notesTimer = null;
function renderNotes() {
  if (document.activeElement !== els.runNotes) els.runNotes.value = state.notes;
}
function flushNotes() {
  if (notesTimer === null) return;
  clearTimeout(notesTimer);
  notesTimer = null;
  save();
}
els.runNotes.addEventListener('input', () => {
  state.notes = els.runNotes.value;
  clearTimeout(notesTimer);
  notesTimer = setTimeout(flushNotes, 400);
});
els.runNotes.addEventListener('blur', flushNotes);
window.addEventListener('pagehide', flushNotes);
document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushNotes(); });
// Kein App-Update (Neuladen der Seite) mitten im Tippen
window.PokeHubBusy = () => notesTimer !== null || document.activeElement === els.runNotes;

function addGraveyardEntry() {
  const name = els.graveyardName.value.trim();
  if (!name && !selectedGraveyardPokémon) return;
  const pokemon = selectedGraveyardPokémon || name;
  const caught = state.encounters.findIndex(e => e.status === 'caught' && samePokemon(e.pokemon, pokemon));
  if (caught >= 0) {
    els.graveyardName.value = '';
    selectedGraveyardPokémon = null;
    renderSelectedPokémonPreview('graveyard', null);
    setEncounterStatus(caught, 'dead');
    return;
  }
  state.graveyard.push(pokemon);
  els.graveyardName.value = '';
  selectedGraveyardPokémon = null;
  renderSelectedPokémonPreview('graveyard', null);
  save();
  renderStats();
  renderGraveyard();
}

els.graveyardForm.addEventListener('submit', event => {
  event.preventDefault();
  addGraveyardEntry();
});

// e<n> = gestorbener Encounter (wird wieder „Gefangen“), g<n> = Eintrag von Hand
function removeGraveyardRef(ref) {
  const index = Number(ref.slice(1));
  if (ref[0] === 'e') {
    withUndo(t('undoRevived'), () => {
      const entry = state.encounters[index];
      if (entry) { entry.status = 'caught'; delete entry.death; }
    });
  } else {
    withUndo(t('undoGrave'), () => state.graveyard.splice(index, 1));
  }
}
els.graveyardList.addEventListener('click', event => {
  const removeBtn = event.target.closest('[data-graveyard-remove]');
  if (removeBtn) removeGraveyardRef(removeBtn.dataset.graveyardRemove);
});
els.graveyardList.addEventListener('contextmenu', event => {
  const item = event.target.closest('[data-graveyard-ref]');
  if (!item) return;
  event.preventDefault();
  removeGraveyardRef(item.dataset.graveyardRef);
});

els.resetRun.addEventListener('click', showResetConfirm);
els.resetConfirmYes.addEventListener('click', resetRun);
els.resetConfirmNo.addEventListener('click', hideResetConfirm);

function startRenameTab(idx) {
  const tab = document.getElementById('run-tabs').querySelector(`[data-run-idx="${idx}"]`);
  if (!tab) return;
  const nameSpan = tab.querySelector('.run-tab-name');
  if (!nameSpan) return;
  const input = document.createElement('input');
  input.className = 'run-tab-rename-input';
  input.value = allRuns[idx].runName || '';
  input.placeholder = gameLabel(allRuns[idx].game || 'karmesin-purpur');
  nameSpan.replaceWith(input);
  input.focus();
  input.select();
  let committed = false;
  function commit() {
    if (committed) return;
    committed = true;
    allRuns[idx].runName = input.value.trim();
    if (idx === activeRunIdx) state.runName = allRuns[idx].runName;
    save();
    renderRunSelect();
  }
  input.addEventListener('blur', commit);
  input.addEventListener('keydown', ev => {
    if (ev.key === 'Enter') { ev.preventDefault(); input.blur(); }
    if (ev.key === 'Escape') { committed = true; renderRunSelect(); }
  });
}
document.getElementById('run-tabs').addEventListener('click', e => {
  const tab = e.target.closest('[data-run-idx]');
  if (tab) switchToRun(Number(tab.dataset.runIdx));
});
document.getElementById('run-rename-btn').addEventListener('click', () => { if (allRuns.length > 0) startRenameTab(activeRunIdx); });
document.getElementById('run-tabs').addEventListener('contextmenu', e => {
  const tab = e.target.closest('[data-run-idx]');
  if (!tab) return;
  e.preventDefault();
  showDeletePopup(Number(tab.dataset.runIdx), e.clientX, e.clientY);
});
document.getElementById('run-new-btn').addEventListener('click', showGameSelectModal);
document.getElementById('run-empty-start').addEventListener('click', showGameSelectModal);
document.getElementById('game-select-close').addEventListener('click', hideGameSelectModal);
document.getElementById('game-select-cancel').addEventListener('click', hideGameSelectModal);
document.getElementById('game-select-confirm').addEventListener('click', () => {
  if (!selectedModalGame) return;
  const name = document.getElementById('run-new-name-input').value.trim();
  hideGameSelectModal();
  createNewRun(selectedModalGame, name);
});
document.getElementById('run-new-name-input').addEventListener('keydown', e => {
  if (e.key === 'Enter' && selectedModalGame) { e.preventDefault(); document.getElementById('game-select-confirm').click(); }
  if (e.key === 'Escape') { e.preventDefault(); hideGameSelectModal(); }
});
document.getElementById('game-select-gen-tabs').addEventListener('click', e => {
  const tab = e.target.closest('.gen-tab');
  if (!tab) return;
  activeGenFilter = Number(tab.dataset.gen);
  document.querySelectorAll('.gen-tab').forEach(t => t.classList.toggle('is-active', t === tab));
  document.querySelectorAll('.game-card').forEach(card => {
    card.style.display = (activeGenFilter === 0 || Number(card.dataset.gen) === activeGenFilter) ? '' : 'none';
  });
});
document.getElementById('game-select-grid').addEventListener('click', e => {
  const card = e.target.closest('[data-game-key]');
  if (!card) return;
  selectedModalGame = card.dataset.gameKey;
  document.querySelectorAll('.game-card').forEach(c => c.classList.toggle('is-selected', c === card));
  const confirmBtn = document.getElementById('game-select-confirm');
  if (confirmBtn) confirmBtn.disabled = false;
  document.getElementById('run-new-name-input').placeholder = gameLabel(selectedModalGame);
});
document.getElementById('game-select-modal').addEventListener('click', e => {
  if (e.target.classList.contains('game-select-overlay')) hideGameSelectModal();
});
document.getElementById('run-delete-btn').addEventListener('click', () => showDeletePopup(activeRunIdx, document.getElementById('run-delete-btn').getBoundingClientRect().left, document.getElementById('run-delete-btn').getBoundingClientRect().bottom + 6));
document.getElementById('run-delete-popup-yes').addEventListener('click', () => { const idx = deletePopupTargetIdx; hideDeletePopup(); deleteRun(idx); });
document.getElementById('run-delete-popup-no').addEventListener('click', hideDeletePopup);
document.addEventListener('click', e => {
  const popup = document.getElementById('run-delete-popup');
  if (popup.style.display !== 'none' && !popup.contains(e.target)) hideDeletePopup();
}, true);

els.closePokémonModal.addEventListener('click', closePokémonModal);
els.pokemonModal.addEventListener('click', event => {
  if (event.target === event.currentTarget) closePokémonModal();
});

els.pokemonSearch.addEventListener('input', event => renderPokémonList(event.target.value));

els.pokemonGeneration.addEventListener('change', event => {
  if (els.pokemonGeneration.disabled) return;
  loadPokémonList(Number(event.target.value) || 1);
});

els.langToggle.addEventListener('click', toggleLanguage);

els.checkpointProgressList.addEventListener('click', event => {
  const item = event.target.closest('[data-cp-index]');
  if (!item) return;
  const index = Number(item.dataset.cpIndex);
  const isDone = index < state.checkpoint;
  if (isDone) {
    state.checkpoint = index;
  } else {
    state.checkpoint = index + 1;
  }
  save();
  renderCheckpointCard();
  renderCheckpointProgress();
});

els.pokemonList.addEventListener('click', event => {
  const item = event.target.closest('li[data-pokemon-id]');
  if (!item) return;
  const id = Number(item.dataset.pokemonId);
  const pokemon = [...routePokémonList, ...pokemonList, ...allPokémonList].find(entry => entry.id === id);
  if (pokemon) pickPokémon(pokemon);
});

// Randomizer-Stand (rando-state.js): Chip neben dem Randomizer-Schalter; ändert er sich, Vorschläge neu
if (window.PokeHubRando && els.randoSlot) window.PokeHubRando.chip(els.randoSlot);
document.addEventListener('hubrandochange', () => {
  if (pickerTarget === 'encounter' && els.pokemonModal.style.display === 'flex') prepareEncounterPokémonScope();
});

load();
syncPokémonGeneration();
render();
applyLanguage();
loadAllPokémonBasic().then(() => renderPokémonList());
loadPokémonList(currentPokémonGeneration);
renderGameSelectGrid();
gameGridCached = true;
