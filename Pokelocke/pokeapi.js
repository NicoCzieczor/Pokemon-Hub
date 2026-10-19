const BASE_URL = "https://pokeapi.co/api/v2";

function getLang() { return (typeof window !== 'undefined' ? window.LANG : null) || 'de'; }

const pokemonCache  = new Map();
const speciesCache  = new Map();

// Einzelnes Pokémon abrufen (per ID oder Name)
export async function getPokemon(idOrName) {
  const key = String(idOrName).toLowerCase();
  if (pokemonCache.has(key)) return pokemonCache.get(key);
  const res = await fetch(`${BASE_URL}/pokemon/${idOrName}`);
  if (!res.ok) throw new Error(`Pokémon "${idOrName}" nicht gefunden`);
  const data = await res.json();

  const result = {
    id: data.id,
    name: data.name,
    speciesName: data.species?.name ?? null,
    sprite: data.sprites.front_default,
    spriteShiny: data.sprites.front_shiny,
    types: data.types.map(t => t.type.name),
    abilities: data.abilities.map(a => ({ name: a.ability.name, isHidden: a.is_hidden })),
    stats: {
      hp:             data.stats[0].base_stat,
      attack:         data.stats[1].base_stat,
      defense:        data.stats[2].base_stat,
      specialAttack:  data.stats[3].base_stat,
      specialDefense: data.stats[4].base_stat,
      speed:          data.stats[5].base_stat,
    },
    height: data.height,
    weight: data.weight,
    moves: data.moves,
  };
  pokemonCache.set(key, result);
  pokemonCache.set(String(data.id), result);
  pokemonCache.set(result.name, result);
  return result;
}

// Liste einer Generation abrufen (nur Namen + URL, noch keine Details)
export async function getGenerationList(gen = 1) {
  const ranges = {
    1: { limit: 151, offset: 0   },
    2: { limit: 100, offset: 151 },
    3: { limit: 135, offset: 251 },
    4: { limit: 107, offset: 386 },
    5: { limit: 156, offset: 493 },
    6: { limit: 72,  offset: 649 },
    7: { limit: 88,  offset: 721 },
    8: { limit: 96,  offset: 809 },
    9: { limit: 120, offset: 905 },
  };

  const { limit, offset } = ranges[gen];
  const res = await fetch(`${BASE_URL}/pokemon?limit=${limit}&offset=${offset}`);
  if (!res.ok) throw new Error(`Generation ${gen} konnte nicht geladen werden`);
  const data = await res.json();

  return data.results; // [{ name: "bulbasaur", url: "https://..." }, ...]
}

// Ganze Generation mit allen Details laden
// onProgress(loaded, total) wird nach jedem Pokémon aufgerufen
export async function getFullGeneration(gen = 1, onProgress = null) {
  const list = await getGenerationList(gen);
  const pokemon = [];

  for (let i = 0; i < list.length; i++) {
    const p = await getPokemon(list[i].name);
    pokemon.push(p);
    if (onProgress) onProgress(i + 1, list.length);
  }

  return pokemon;
}

// Mehrere Pokémon parallel laden (schneller, aber mehr Requests)
export async function getPokemonBatch(idsOrNames = []) {
  const results = await Promise.allSettled(
    idsOrNames.map(id => getPokemon(id))
  );

  return results
    .filter(r => r.status === "fulfilled")
    .map(r => r.value);
}

const abilityCache = new Map();

export async function getAbilityData(abilityName) {
  if (!abilityName) return { name: abilityName, description: '' };
  const lang = getLang();
  const cacheKey = `${abilityName}-${lang}`;
  if (abilityCache.has(cacheKey)) return abilityCache.get(cacheKey);
  try {
    const res = await fetch(`${BASE_URL}/ability/${abilityName}`);
    if (!res.ok) throw new Error();
    const json = await res.json();
    const localName = json.names.find(n => n.language.name === lang)
      || json.names.find(n => n.language.name === 'en');
    const name = localName
      ? localName.name
      : abilityName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const effectLocal = json.effect_entries?.find(e => e.language.name === lang);
    const effectEN   = json.effect_entries?.find(e => e.language.name === 'en');
    const flavorLocal = json.flavor_text_entries?.filter(f => f.language.name === lang).pop();
    const description = (effectLocal?.short_effect || flavorLocal?.flavor_text || effectEN?.short_effect || '').replace(/[\n\f]/g, ' ');
    const result = { name, description };
    abilityCache.set(cacheKey, result);
    return result;
  } catch {
    const name = abilityName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const result = { name, description: '' };
    abilityCache.set(cacheKey, result);
    return result;
  }
}

const moveNameCache = new Map();
const moveDataCache = new Map();

export async function getMoveGermanName(moveName) {
  if (!moveName) return 'Unbekannt';
  const cacheKey = `${moveName}-${getLang()}`;
  if (moveNameCache.has(cacheKey)) return moveNameCache.get(cacheKey);
  const data = await getMoveData(moveName);
  return data.name;
}

export async function getMoveData(moveName) {
  if (!moveName) return { name: 'Unbekannt', type: null, power: null, accuracy: null, pp: null, damageClass: null, description: '' };
  const lang = getLang();
  const cacheKey = `${moveName}-${lang}`;
  if (moveDataCache.has(cacheKey)) return moveDataCache.get(cacheKey);
  try {
    const res = await fetch(`${BASE_URL}/move/${moveName}`);
    if (!res.ok) throw new Error();
    const json = await res.json();
    const localName = json.names.find(n => n.language.name === lang)
      || json.names.find(n => n.language.name === 'en');
    const name = localName
      ? localName.name
      : moveName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const goodFlavorsLocal = (json.flavor_text_entries || [])
      .filter(f => f.language.name === lang && (lang !== 'de' || !/nicht eingesetzt werden/i.test(f.flavor_text)));
    const goodFlavorsEN = (json.flavor_text_entries || [])
      .filter(f => f.language.name === 'en');
    const flavorLocal = goodFlavorsLocal[goodFlavorsLocal.length - 1];
    const flavorEN    = goodFlavorsEN[goodFlavorsEN.length - 1];
    const effectLocal = json.effect_entries?.find(e => e.language.name === lang);
    const effectEN    = json.effect_entries?.find(e => e.language.name === 'en');
    const description = (flavorLocal?.flavor_text || effectLocal?.short_effect || flavorEN?.flavor_text || effectEN?.short_effect || '')
      .replace(/[\n\f]/g, ' ')
      .replace(/\$effect_chance/g, json.effect_chance ?? '?');
    const result = {
      name,
      type: json.type?.name || null,
      power: json.power || null,
      accuracy: json.accuracy || null,
      pp: json.pp || null,
      damageClass: json.damage_class?.name || null,
      description,
    };
    moveDataCache.set(cacheKey, result);
    moveNameCache.set(cacheKey, name);
    return result;
  } catch {
    const name = moveName.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const result = { name, type: null, power: null, accuracy: null, pp: null, damageClass: null, description: '' };
    moveDataCache.set(cacheKey, result);
    moveNameCache.set(cacheKey, name);
    return result;
  }
}

// Artdaten laden, inklusive lokalisierter Namen
export async function getPokemonSpecies(idOrName) {
  const key = String(idOrName).toLowerCase();
  const lang = getLang();
  const cacheKey = `${key}-${lang}`;
  if (speciesCache.has(cacheKey)) return speciesCache.get(cacheKey);
  const res = await fetch(`${BASE_URL}/pokemon-species/${idOrName}`);
  if (!res.ok) throw new Error(`Pokémon-Spezies "${idOrName}" nicht gefunden`);
  const data = await res.json();

  const localName = data.names.find(n => n.language.name === lang)
    || data.names.find(n => n.language.name === 'en');
  const result = {
    id: data.id,
    name: data.name,
    germanName: localName ? localName.name : data.name,
    evolutionChainUrl: data.evolution_chain?.url ?? null,
    varieties: data.varieties ?? [],
  };
  speciesCache.set(cacheKey, result);
  speciesCache.set(`${String(data.id)}-${lang}`, result);
  speciesCache.set(`${data.name}-${lang}`, result);
  return result;
}

const evolutionChainCache = new Map();

export async function getEvolutionChain(url) {
  if (evolutionChainCache.has(url)) return evolutionChainCache.get(url);
  const res = await fetch(url);
  if (!res.ok) throw new Error('Evolution chain nicht gefunden');
  const data = await res.json();
  evolutionChainCache.set(url, data.chain);
  return data.chain;
}