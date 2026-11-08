import { getPokemon, getGenerationList, getPokemonSpecies, getMoveData, getEvolutionChain, getAbilityData, placeholderPokemon } from "./pokeapi.js";

// ── Type move gradient colors ─────────────────────────────────────────────────
const TYPE_MOVE_COLORS = {
  normal:   'rgba(168,168,120,0.35)',
  fire:     'rgba(255,60,0,0.35)',
  water:    'rgba(30,100,255,0.35)',
  electric: 'rgba(255,210,0,0.38)',
  grass:    'rgba(80,210,30,0.32)',
  ice:      'rgba(0,220,220,0.32)',
  fighting: 'rgba(255,100,0,0.35)',
  poison:   'rgba(200,0,200,0.32)',
  ground:   'rgba(210,160,30,0.38)',
  flying:   'rgba(120,180,255,0.35)',
  psychic:  'rgba(255,0,100,0.35)',
  bug:      'rgba(160,200,0,0.35)',
  rock:     'rgba(140,100,20,0.40)',
  ghost:    'rgba(112,88,152,0.42)',
  dragon:   'rgba(100,50,240,0.38)',
  dark:     'rgba(90,70,55,0.45)',
  steel:    'rgba(160,160,175,0.38)',
  fairy:    'rgba(240,140,170,0.38)',
};

// ── Coverage type RGB values ──────────────────────────────────────────────────
const TYPE_CARD_RGB = {
  normal:'168,168,120', fire:'255,60,0',    water:'30,100,255',  electric:'255,210,0',
  grass:'80,210,30',    ice:'0,220,220',    fighting:'255,100,0', poison:'200,0,200',
  ground:'210,160,30',  flying:'120,180,255',psychic:'255,0,100', bug:'160,200,0',
  rock:'140,100,20',    ghost:'112,88,152', dragon:'100,50,240',  dark:'90,70,55',
  steel:'160,160,175',  fairy:'240,140,170',
};

// ── Typen der gewählten Generation („Typen wie in“, ../pokemon-types.js) ─────────
// Typentabelle und alte Typen (z. B. Togekiss vor Gen 6 Normal/Flug) wie im Schadens-Rechner
let typeGen = window.PokemonTypes.getGen();
const typesOf = p => window.PokemonTypes.typesInGen(p, typeGen);
const genTypes = () => window.PokemonTypes.typeList(typeGen);

// ── Tooltip system ────────────────────────────────────────────────────────────
const DAMAGE_CLASS_KEY = { physical: 'physical', special: 'special-class', status: 'status-class' };
let _tipTimer = null, _tipPinned = false;

function _getTip() {
  let t = document.getElementById('poke-tooltip');
  if (!t) {
    t = document.createElement('div');
    t.id = 'poke-tooltip';
    t.style.display = 'none';
    t.addEventListener('mouseenter', () => clearTimeout(_tipTimer));
    t.addEventListener('mouseleave', () => { if (!_tipPinned) _startHide(); });
    document.body.appendChild(t);
  }
  return t;
}
function _startHide() {
  _tipTimer = setTimeout(() => { if (!_tipPinned) _getTip().style.display = 'none'; }, 150);
}
function showTooltip(anchor, html) {
  clearTimeout(_tipTimer);
  const t = _getTip();
  t.innerHTML = html;
  t.style.display = 'block';
  t.style.visibility = 'hidden';
  requestAnimationFrame(() => {
    const r = anchor.getBoundingClientRect();
    const tw = t.offsetWidth, th = t.offsetHeight;
    let top = r.top - th - 8;
    if (top < 8) top = r.bottom + 8;
    let left = r.left + r.width / 2 - tw / 2;
    left = Math.max(8, Math.min(left, window.innerWidth - tw - 8));
    t.style.top = top + 'px';
    t.style.left = left + 'px';
    t.style.visibility = 'visible';
  });
}
function attachTooltip(el, getHtml) {
  el.style.cursor = 'pointer';
  el.addEventListener('click', e => {
    e.stopPropagation();
    const t = _getTip();
    if (_tipPinned && t._anchor === el) { _tipPinned = false; t.style.display = 'none'; }
    else { _tipPinned = true; t._anchor = el; showTooltip(el, getHtml()); }
  });
}
function buildAbilityTooltip(data) {
  return `<div class="tt-title">${esc(data.name)}</div>${data.description ? `<div class="tt-desc">${esc(data.description)}</div>` : ''}`;
}
function buildMoveTooltip(data) {
  const typeClass = data.type ? `type-bg-${data.type}` : '';
  const typeLabel = data.type ? (window.typeLabel(data.type) || data.type) : '';
  const catLabel  = data.damageClass ? window.t(DAMAGE_CLASS_KEY[data.damageClass] || data.damageClass) : '';
  const power = data.power ?? '–';
  const acc   = data.accuracy != null ? data.accuracy + '%' : '–';
  const pp    = data.pp ?? '–';
  return `<div class="tt-title">${esc(data.name)}</div>
<div class="tt-meta">${typeLabel ? `<span class="tt-type ${typeClass}">${typeLabel}</span>` : ''}${catLabel ? `<span class="tt-cat">${catLabel}</span>` : ''}</div>
<div class="tt-stats"><span>${window.t('power')}: ${power}</span><span>${window.t('accuracy')}: ${acc}</span><span>${window.t('pp')}: ${pp}</span></div>
${data.description ? `<div class="tt-desc">${esc(data.description)}</div>` : ''}`;
}

// ── State ─────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'pokemon-team-builder-state';
let pokemonList = [], allPokemonList = [];
let currentGeneration = 1, infoGeneration = 1;
let selectedSlot = null, selectedSlotType = 'team';
let activePokemonInfo = null, infoPokemon = null;
let teamPokemon = new Array(6).fill(null);
let boxPokemon  = new Array(30).fill(null);
let graveyardPokemon = [];
let soloGame = '';
let routeMarks = {};
let stateHydrating = true;
let pendingHubGameSave = false;
let focusedTarget = { type: 'team', index: 0 };
let infoGenLocked = false;
let renderGeneration = 0;

let dragSource = null; // { type: 'team'|'box', slot: number }
let boxOpen    = false;
let routesOpen = false;
let graveyardOpen = false;
let routeFilter = 'all';

// ── Helpers ───────────────────────────────────────────────────────────────────
// Texte und Adressen, die in HTML landen
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
// Name in den Auswahllisten – aus pokemon-names.js (sofort da, auch offline; vorher eine Anfrage je Pokémon)
function listName(id, name) { return window.pokemonName(id, name) || capitalize(name); }
function formatLabel(t) { return t.split('-').map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' '); }
function getDisplayName(name) { return allPokemonList.find(p => p.name===name)?.displayName || capitalize(name); }
function getTypeEffectiveness(atk, defs) { return window.PokemonTypes.effectiveness(atk, defs, typeGen); }
function pokemonLabel(p) {
  if (!p) return '';
  return window.LANG === 'en'
    ? capitalize(p.baseName || p.speciesName || p.name)
    : (p.germanName || capitalize(p.name));
}
function cleanRoute(value) {
  if (typeof value !== 'string') return '';
  return value.trim().replace(/[\u0000-\u001f\u007f]/g, '').slice(0, 100);
}
function cleanGame(value) {
  return typeof value === 'string' && window.PokeHubGame?.list?.includes(value) ? value : '';
}
function routeLabel(route) { return window.PokeHubLocations?.label(cleanRoute(route), window.LANG) || cleanRoute(route); }
function serializePokemon(p) {
  if (!p?.name) return null;
  const route = cleanRoute(p.route);
  return route ? { name: p.name, route } : p.name;
}
function serializeGrave(p) {
  if (!p?.name) return null;
  return {
    name: p.name,
    id: Number(p.id) || null,
    germanName: p.germanName || '',
    sprite: p.sprite || '',
    route: cleanRoute(p.route) || null,
  };
}
function storedName(value) { return typeof value === 'string' ? value : value && typeof value.name === 'string' ? value.name : ''; }
function storedRoute(value) { return value && typeof value === 'object' ? cleanRoute(value.route) : ''; }

const evolutionItemNames = {
  de: {
    'fire-stone':'Feuerstein','water-stone':'Wasserstein','thunder-stone':'Donnerstein',
    'leaf-stone':'Blattstein','moon-stone':'Mondstein','sun-stone':'Sonnenstein',
    'shiny-stone':'Glanzstein','dusk-stone':'Zwielichtstein','dawn-stone':'Morgenrötestein',
    'ice-stone':'Eisstein','metal-coat':'Metallmantel','dragon-scale':'Drachenschuppe',
    'kings-rock':'Königsstein','upgrade':'Upgrade','dubious-disc':'Dubiose-Disc',
    'protector':'Protektor','electirizer':'Elektrisator','magmarizer':'Magmarisator',
    'razor-fang':'Scharfzahn','razor-claw':'Scharfklaue','oval-stone':'Ovalstein',
    'prism-scale':'Prismaschuppe','reaper-cloth':'Geisterschleier',
    'deep-sea-scale':'Tiefseeschuppe','deep-sea-tooth':'Tiefsee-Zahn',
    'sweet-apple':'Süßer Apfel','tart-apple':'Herber Apfel',
    'cracked-pot':'Gesprungener Topf','chipped-pot':'Abgeplatzter Topf',
    'black-augurite':'Schwarzer Augit','peat-block':'Torfstück','linking-cord':'Verbindungskabel',
  },
  en: {
    'fire-stone':'Fire Stone','water-stone':'Water Stone','thunder-stone':'Thunder Stone',
    'leaf-stone':'Leaf Stone','moon-stone':'Moon Stone','sun-stone':'Sun Stone',
    'shiny-stone':'Shiny Stone','dusk-stone':'Dusk Stone','dawn-stone':'Dawn Stone',
    'ice-stone':'Ice Stone','metal-coat':'Metal Coat','dragon-scale':'Dragon Scale',
    'kings-rock':"King's Rock",'upgrade':'Up-Grade','dubious-disc':'Dubious Disc',
    'protector':'Protector','electirizer':'Electirizer','magmarizer':'Magmarizer',
    'razor-fang':'Razor Fang','razor-claw':'Razor Claw','oval-stone':'Oval Stone',
    'prism-scale':'Prism Scale','reaper-cloth':'Reaper Cloth',
    'deep-sea-scale':'Deep Sea Scale','deep-sea-tooth':'Deep Sea Tooth',
    'sweet-apple':'Sweet Apple','tart-apple':'Tart Apple',
    'cracked-pot':'Cracked Pot','chipped-pot':'Chipped Pot',
    'black-augurite':'Black Augurite','peat-block':'Peat Block','linking-cord':'Linking Cord',
  },
};
function getItemName(key) {
  const map = evolutionItemNames[window.LANG] || evolutionItemNames.de;
  return map[key] || formatLabel(key);
}

const locationNames = {
  de: {
    'eterna-forest':'Ewigwald','sinnoh-route-217':'Route 217','mt-coronet':'Kraterberg',
    'pinwheel-forest':'Ewigenwald','twist-mountain':'Wendelberg','chargestone-cave':'Elektrolithhöhle',
    'kalos-route-20':'Route 20','frost-cavern':'Frosthöhle','kalos-route-13':'Route 13',
    'petalburg-woods':'Blütenburgwald','new-mauville':'Neu Malvenfroh','sea-mauville':'See-Mauvile',
    'vast-poni-canyon':'Canyon von Poni','lush-jungle':'Schattendschungel',
    'blush-mountain':'Glühberg','mount-lanakila':'Mount Lanakila',
    'forest-of-focus':'Fokuswald','challenge-beach':'Arenastrand',
    'lake-of-outrage':'Wutsee','fields-of-honor':'Ehrenfelder',
  },
  en: {
    'eterna-forest':'Eterna Forest','sinnoh-route-217':'Route 217','mt-coronet':'Mt. Coronet',
    'pinwheel-forest':'Pinwheel Forest','twist-mountain':'Twist Mountain','chargestone-cave':'Chargestone Cave',
    'kalos-route-20':'Route 20','frost-cavern':'Frost Cavern','kalos-route-13':'Route 13',
    'petalburg-woods':'Petalburg Woods','new-mauville':'New Mauville','sea-mauville':'Sea Mauville',
    'vast-poni-canyon':'Vast Poni Canyon','lush-jungle':'Lush Jungle',
    'blush-mountain':'Blush Mountain','mount-lanakila':'Mount Lanakila',
    'forest-of-focus':'Forest of Focus','challenge-beach':'Challenge Beach',
    'lake-of-outrage':'Lake of Outrage','fields-of-honor':'Fields of Honor',
  },
};
function getLocationName(key) {
  const map = locationNames[window.LANG] || locationNames.de;
  return map[key] || formatLabel(key);
}

const locationGen = {
  'eterna-forest':4,'sinnoh-route-217':4,'mt-coronet':4,
  'pinwheel-forest':5,'twist-mountain':5,'chargestone-cave':5,
  'kalos-route-20':6,'frost-cavern':6,'kalos-route-13':6,'petalburg-woods':6,'new-mauville':6,'sea-mauville':6,
  'vast-poni-canyon':7,'lush-jungle':7,'blush-mountain':7,'mount-lanakila':7,
  'forest-of-focus':7,'challenge-beach':7,
  'lake-of-outrage':8,'fields-of-honor':8,
};

function formatOneEvolutionCondition(d, moveNames) {
  const trigger = d.trigger?.name, parts = [];
  if (trigger === 'level-up') {
    if (d.min_level)             parts.push(`Lv. ${d.min_level}`);
    if (d.min_happiness)         parts.push(window.t('happiness', d.min_happiness));
    if (d.min_affection)         parts.push(window.t('affection', d.min_affection));
    if (d.time_of_day==='day')   parts.push(window.t('day'));
    if (d.time_of_day==='night') parts.push(window.t('night'));
    if (d.needs_overworld_rain)  parts.push(window.t('in-rain'));
    if (d.known_move_type)       parts.push(window.t('type-suffix', window.typeLabel(d.known_move_type.name)||formatLabel(d.known_move_type.name)));
    if (d.known_move)            parts.push(window.t('knows-move', moveNames[d.known_move.name]||formatLabel(d.known_move.name)));
    if (d.location)              parts.push(getLocationName(d.location.name));
    if (d.turn_upside_down)      parts.push(window.t('upside-down'));
    if (d.relative_physical_stats === 1)  parts.push(window.t('atk-gt-def'));
    if (d.relative_physical_stats === -1) parts.push(window.t('def-gt-atk'));
    if (d.relative_physical_stats === 0)  parts.push(window.t('atk-eq-def'));
    if (!parts.length)           parts.push(window.t('level-up'));
  } else if (trigger === 'use-item') {
    const n = d.item?.name||''; parts.push(getItemName(n));
  } else if (trigger === 'trade') {
    if (d.held_item)          parts.push(window.t('trade-with-item', getItemName(d.held_item.name)));
    else if (d.trade_species) parts.push(window.t('trade-with', getDisplayName(d.trade_species.name)));
    else                      parts.push(window.t('trade'));
  } else if (trigger==='shed')               parts.push(window.t('shed'));
  else if (trigger==='spin')                 parts.push(window.t('spin'));
  else if (trigger==='take-damage')          parts.push(window.t('damage'));
  else if (trigger==='three-critical-hits')  parts.push(window.t('three-crits'));
  else if (trigger==='other')                parts.push(window.t('special-evo'));
  else parts.push(formatLabel(trigger||''));
  return parts.join(', ');
}

function resolveEvolutionDetails(details, gen) {
  if (!details?.length) return [];

  const locationEntries = details.filter(d => d.trigger?.name === 'level-up' && d.location);
  const itemEntries     = details.filter(d => d.trigger?.name === 'use-item');
  const otherEntries    = details.filter(d => {
    const t = d.trigger?.name;
    return t !== 'use-item' && !(t === 'level-up' && d.location);
  });

  let result = [];

  if (locationEntries.length) {
    if (itemEntries.length && gen >= 8) {
      result = [...itemEntries, ...otherEntries];
    } else {
      const withGen = locationEntries.map(d => ({ d, g: locationGen[d.location?.name] ?? 4 }));
      const valid = withGen.filter(x => x.g <= gen);
      const best = valid.length
        ? valid.reduce((a, b) => b.g > a.g ? b : a).d
        : locationEntries[0];
      result = [best, ...otherEntries];
      if (!valid.length && itemEntries.length) result = [...itemEntries, ...otherEntries];
    }
  } else {
    const seen = new Set();
    result = [...itemEntries, ...otherEntries].filter(d => {
      const key = `${d.trigger?.name}|${d.item?.name||''}|${d.held_item?.name||''}|${d.trade_species?.name||''}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  return result;
}

function formatEvolutionCondition(details, moveNames = {}, gen = 1) {
  const resolved = resolveEvolutionDetails(details, gen);
  const seen = new Set();
  return resolved
    .map(d => formatOneEvolutionCondition(d, moveNames))
    .filter(t => { if (!t || seen.has(t)) return false; seen.add(t); return true; })
    .join(' / ');
}

function getEvolutionPaths(node) {
  const m = node.species.url.match(/\/pokemon-species\/(\d+)\//);
  const id = m ? Number(m[1]) : null;
  const cur = { name:node.species.name, id, sprite:id?`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`:null, evolutionDetails:node.evolution_details||[] };
  if (!node.evolves_to?.length) return [[cur]];
  const paths = [];
  for (const nxt of node.evolves_to) for (const sub of getEvolutionPaths(nxt)) paths.push([cur,...sub]);
  return paths;
}

function getGenerationVersionGroups(gen) {
  return ({ 1:['red-blue','yellow'], 2:['gold-silver','crystal'], 3:['ruby-sapphire','emerald','firered-leafgreen'], 4:['diamond-pearl','platinum','heartgold-soulsilver'], 5:['black-white','black-2-white-2'], 6:['x-y','omega-ruby-alpha-sapphire'], 7:['sun-moon','ultra-sun-ultra-moon','lets-go-pikachu-lets-go-eevee'], 8:['sword-shield','isle-of-armor','crown-tundra'], 9:['scarlet-violet'] })[gen] || ['red-blue','yellow'];
}

function hasMovesInGen(pokemon, g) {
  const moves = Array.isArray(pokemon.moves) ? pokemon.moves : [];
  const vg = getGenerationVersionGroups(g);
  return moves.some(m => (m.version_group_details||[]).some(d => vg.includes(d.version_group?.name)));
}
function findFirstGenWithMoves(pokemon) {
  for (let g = 1; g <= 9; g++) if (hasMovesInGen(pokemon, g)) return g;
  return 1;
}

function formatLearnMethod(detail) {
  if (!detail?.move_learn_method) return window.t('unknown');
  const m = detail.move_learn_method.name, lv = detail.level_learned_at;
  if (m==='level-up') return lv>0 ? `Lv. ${lv}` : window.t('level-up');
  if (m==='machine')  return window.t('tm-hm');
  if (m==='egg')      return window.t('egg');
  if (m==='tutor')    return 'Tutor';
  return formatLabel(m||window.t('unknown'));
}

// ── Rendering ─────────────────────────────────────────────────────────────────
// [color, bgAlpha] — tuned per type so all halves look equally vivid on dark bg
const TYPE_SLOT = {
  normal:   ['#bbbbaa', 0.62],
  fire:     ['#ff421c', 0.47],
  water:    ['#2c9be3', 0.54],
  electric: ['#ffdc00', 0.50],
  grass:    ['#62bc5a', 0.54],
  ice:      ['#74cfc0', 0.64],
  fighting: ['#bb5544', 0.64],
  poison:   ['#9553cd', 0.54],
  ground:   ['#a67439', 0.57],
  flying:   ['#96caff', 0.70],
  psychic:  ['#ff6380', 0.47],
  bug:      ['#92c12a', 0.54],
  rock:     ['#bbaa66', 0.62],
  ghost:    ['#6e4370', 0.74],
  dragon:   ['#5670be', 0.60],
  dark:     ['#4e4545', 0.80],
  steel:    ['#aaaabb', 0.67],
  fairy:    ['#ec8fe6', 0.52],
};
function hexToRgba(hex, alpha) {
  const r=parseInt(hex.slice(1,3),16), g=parseInt(hex.slice(3,5),16), b=parseInt(hex.slice(5,7),16);
  return `rgba(${r},${g},${b},${alpha})`;
}
function applySlotTypeStyle(slot, types, borderAlpha) {
  const e1 = TYPE_SLOT[types[0]], e2 = TYPE_SLOT[types[1]];
  if (!e1) {
    slot.style.removeProperty('--type-c1');
    slot.style.removeProperty('--type-c2');
    delete slot.dataset.typed;
    return;
  }
  const [c1] = e1;
  slot.style.background = 'none';
  slot.style.setProperty('--type-c1', hexToRgba(c1, borderAlpha));
  if (e2) {
    const [c2] = e2;
    slot.style.setProperty('--type-c2', hexToRgba(c2, borderAlpha));
    slot.dataset.typed = 'dual';
  } else {
    slot.style.removeProperty('--type-c2');
    slot.dataset.typed = 'single';
  }
}

function renderTeamSlot(index, details) {
  const slot = document.querySelector(`.pokemon-slot[data-slot="${index}"]`);
  if (!slot) return;
  slot.setAttribute('role', 'button');
  slot.setAttribute('tabindex', '0');
  if (details) {
    slot.dataset.filled = 'true';
    const name = esc(pokemonLabel(details));
    const monTypes = typesOf(details);
    const route = cleanRoute(details.route);
    applySlotTypeStyle(slot, monTypes, 1.0);
    slot.setAttribute('aria-label', `${pokemonLabel(details)}, ${window.t('focus-team', index + 1)}`);
    slot.title = route ? window.t('route-caught', routeLabel(route)) : '';
    slot.innerHTML = `
      <span class="slot-number" aria-hidden="true">${String(index + 1).padStart(2, '0')}</span>
      <div class="slot-mon" draggable="false">
        <img src="${esc(details.sprite)}" alt="" draggable="false">
        <strong class="slot-name">${name}</strong>
        <span class="slot-types">${monTypes.map(type => `<span class="slot-type" style="--type-color:${TYPE_SLOT[type]?.[0] || '#888'}">${esc(window.typeLabel(type))}</span>`).join('')}</span>
        ${route ? `<span class="slot-route">${esc(routeLabel(route))}</span>` : ''}
      </div>
      <button type="button" class="slot-menu" data-slot-menu="${index}" aria-label="${esc(window.t('slot-menu', index + 1))}">•••</button>`;
  } else {
    slot.removeAttribute('data-filled');
    slot.style.background = '';
    slot.style.removeProperty('--type-c1');
    slot.style.removeProperty('--type-c2');
    delete slot.dataset.typed;
    slot.removeAttribute('title');
    slot.setAttribute('aria-label', window.t('slot-empty', index + 1));
    slot.innerHTML = '';
  }
  slot.classList.toggle('is-focused', focusedTarget.type === 'team' && focusedTarget.index === index && !!details);
}

function renderInfoSlot(details) {
  const slot = document.querySelector('.info-slot[data-slot="info"]');
  if (!slot) return;
  if (details) {
    slot.dataset.filled = 'true';
    const name = esc(pokemonLabel(details));
    slot.innerHTML = `<div class="info-slot-mon"><img src="${esc(details.sprite)}" alt=""><div><small>${esc(window.t('analysis-kicker'))}</small><strong>${name}</strong></div></div>`;
  } else {
    slot.removeAttribute('data-filled');
    slot.innerHTML = window.t('info-slot-empty');
  }
}

function updateBoxSlots() {
  document.querySelectorAll('.box-slot').forEach((slot, i) => {
    const p = boxPokemon[i];
    if (p) {
      const name = esc(pokemonLabel(p));
      applySlotTypeStyle(slot, typesOf(p), 1.0);
      slot.innerHTML = `<img src="${esc(p.sprite)}" alt=""><div class="box-slot-name">${name}</div><button type="button" class="box-slot-menu slot-menu" data-box-menu="${i}" aria-label="${esc(window.t('slot-menu', i + 1))}">•••</button>`;
      slot.dataset.filled = 'true';
      slot.setAttribute('aria-label', `${pokemonLabel(p)}, ${window.t('focus-box', i + 1)}`);
      slot.title = p.route ? window.t('route-caught', routeLabel(p.route)) : '';
    } else {
      slot.style.background = '';
      slot.style.removeProperty('--type-c1');
      slot.style.removeProperty('--type-c2');
      delete slot.dataset.typed;
      slot.innerHTML = '';
      delete slot.dataset.filled;
      slot.removeAttribute('title');
      slot.setAttribute('aria-label', window.t('slot-empty', i + 1));
    }
    slot.classList.toggle('is-focused', focusedTarget.type === 'box' && focusedTarget.index === i && !!p);
  });
  updateSoloSummary();
}

function getFocusedPokemon() {
  if (focusedTarget.type === 'team') return teamPokemon[focusedTarget.index] || null;
  if (focusedTarget.type === 'box') return boxPokemon[focusedTarget.index] || null;
  if (focusedTarget.type === 'grave') return graveyardPokemon[focusedTarget.index] || null;
  return null;
}

function focusPokemon(type, index, syncInfo = true) {
  const list = type === 'team' ? teamPokemon : type === 'box' ? boxPokemon : graveyardPokemon;
  if (!list?.[index]) return;
  focusedTarget = { type, index };
  const mon = list[index];
  if (syncInfo) {
    infoGenLocked = false;
    infoPokemon = activePokemonInfo = mon;
    renderInfoSlot(mon);
    renderInfoPanel();
  }
  renderFocusPanel();
  teamPokemon.forEach((p, i) => document.querySelector(`.pokemon-slot[data-slot="${i}"]`)?.classList.toggle('is-focused', type === 'team' && index === i && !!p));
  document.querySelectorAll('.box-slot').forEach((slot, i) => slot.classList.toggle('is-focused', type === 'box' && index === i && !!boxPokemon[i]));
  document.querySelectorAll('.grave-slot').forEach((slot, i) => slot.classList.toggle('is-focused', type === 'grave' && index === i));
  renderJourney();
}

function ensureFocus() {
  if (getFocusedPokemon()) return;
  const teamIndex = teamPokemon.findIndex(Boolean);
  if (teamIndex >= 0) focusedTarget = { type: 'team', index: teamIndex };
  else {
    const boxIndex = boxPokemon.findIndex(Boolean);
    focusedTarget = boxIndex >= 0 ? { type: 'box', index: boxIndex } : graveyardPokemon.length ? { type: 'grave', index: 0 } : { type: 'team', index: 0 };
  }
}

function renderFocusPanel() {
  const panel = document.getElementById('team-focus');
  if (!panel) return;
  ensureFocus();
  const p = getFocusedPokemon();
  if (!p) {
    panel.innerHTML = `<div class="focus-empty"><span class="focus-empty-mark">01</span><strong>${esc(window.t('focus-empty-title'))}</strong><span>${esc(window.t('focus-empty-text'))}</span><button type="button" class="focus-action" data-focus-action="add">${esc(window.t('focus-add'))}</button></div>`;
    return;
  }

  const name = pokemonLabel(p);
  const monTypes = typesOf(p);
  const colors = monTypes.map(type => TYPE_SLOT[type]?.[0]).filter(Boolean);
  const bst = p.stats ? Object.values(p.stats).reduce((sum, value) => sum + (Number(value) || 0), 0) : '–';
  const weaknesses = monTypes.length ? genTypes().filter(type => getTypeEffectiveness(type, monTypes) >= 2) : [];
  const location = cleanRoute(p.route);
  const source = focusedTarget.type === 'team' ? window.t('focus-team', focusedTarget.index + 1)
    : focusedTarget.type === 'box' ? window.t('focus-box', focusedTarget.index + 1) : window.t('focus-grave');
  const moveAction = focusedTarget.type === 'team'
    ? `<button type="button" class="focus-action" data-focus-action="move-box">${esc(window.t('focus-to-box'))}</button>`
    : focusedTarget.type === 'box'
      ? `<button type="button" class="focus-action" data-focus-action="move-team">${esc(window.t('focus-to-team'))}</button>`
      : `<button type="button" class="focus-action" data-focus-action="restore">${esc(window.t('focus-restore'))}</button>`;
  const finalAction = focusedTarget.type === 'grave'
    ? `<button type="button" class="focus-action is-danger" data-focus-action="remove-grave">${esc(window.t('focus-remove'))}</button>`
    : `<button type="button" class="focus-action is-danger" data-focus-action="kill">${esc(window.t('focus-kill'))}</button>`;

  panel.style.setProperty('--focus-c1', colors[0] || 'rgb(var(--t-acc2))');
  panel.style.setProperty('--focus-c2', colors[1] || colors[0] || 'rgb(var(--t-acc))');
  panel.innerHTML = `
    <div class="focus-visual"><span class="focus-index">${focusedTarget.type === 'grave' ? '†' : String(focusedTarget.index + 1).padStart(2, '0')}</span><img class="focus-sprite" src="${esc(p.sprite)}" alt=""></div>
    <div class="focus-copy">
      <span class="focus-eyebrow">${esc(source)}</span>
      <h3 class="focus-name">${esc(name)}</h3>
      <div class="focus-types">${monTypes.map(type => `<span class="focus-type" style="--type-color:${TYPE_SLOT[type]?.[0] || '#888'}">${esc(window.typeLabel(type))}</span>`).join('')}</div>
      <div class="focus-meta">
        <span><small>${esc(window.t('focus-bst'))}</small><strong>${bst}</strong></span>
        <span><small>${esc(window.t('focus-weak'))}</small><strong>${weaknesses.length || '–'}</strong></span>
        <span class="focus-route"><small>${esc(window.t('focus-route'))}</small><strong>${esc(location ? routeLabel(location) : window.t('focus-route-none'))}</strong></span>
      </div>
      <div class="focus-actions">
        <button type="button" class="focus-action is-primary" data-focus-action="info">${esc(window.t('focus-info'))}</button>
        ${focusedTarget.type === 'grave' ? '' : `<button type="button" class="focus-action" data-focus-action="replace">${esc(window.t('focus-replace'))}</button>`}
        <button type="button" class="focus-action" data-focus-action="route">${esc(window.t('focus-route'))}</button>
        ${moveAction}${finalAction}
      </div>
    </div>`;
}

// ── Coverage recommendations ──────────────────────────────────────────────────
function renderCoverageSection(allActive) {
  if (!allActive.length) return null;

  const weakCount = {};
  genTypes().forEach(atk => {
    weakCount[atk] = allActive.filter(p => getTypeEffectiveness(atk, typesOf(p)) >= 2).length;
  });

  const recs = genTypes().map(defType => {
    let score = 0;
    const covers = [];
    genTypes().forEach(atk => {
      if (!weakCount[atk]) return;
      const m = getTypeEffectiveness(atk, [defType]);
      if (m < 1) {
        score += weakCount[atk] * (m === 0 ? 2 : 1);
        covers.push({ type: atk, weakCount: weakCount[atk], multiplier: m });
      }
    });
    covers.sort((a, b) => b.weakCount - a.weakCount || a.type.localeCompare(b.type));
    return { type: defType, score, covers };
  }).filter(r => r.score > 0).sort((a, b) => b.score - a.score).slice(0, 5);

  if (!recs.length) return null;

  const section = document.createElement('div');
  section.className = 'coverage-section';

  const header = document.createElement('div');
  header.className = 'coverage-header';
  const titleEl = document.createElement('div');
  titleEl.className = 'coverage-title';
  titleEl.textContent = window.t('recommendations');
  header.appendChild(titleEl);
  header.appendChild(Object.assign(document.createElement('div'), { className:'coverage-subtitle', textContent:window.t('recs-subtitle') }));
  section.appendChild(header);

  const list = document.createElement('div');
  list.className = 'coverage-list';

  recs.forEach((rec, i) => {
    const rgb = TYPE_CARD_RGB[rec.type] || '255,255,255';
    const item = document.createElement('div');
    item.className = 'coverage-item';
    item.style.setProperty('--coverage-rgb', rgb);

    item.appendChild(Object.assign(document.createElement('div'), { className:'coverage-rank', textContent:i+1 }));

    const body = document.createElement('div');
    body.className = 'coverage-body';

    const main = document.createElement('div');
    main.className = 'coverage-main';
    const typePill = Object.assign(document.createElement('div'), {
      className: 'coverage-type-pill',
      textContent: window.typeLabel(rec.type),
    });
    typePill.style.setProperty('--coverage-rgb', rgb);
    main.appendChild(typePill);
    main.appendChild(Object.assign(document.createElement('div'), {
      className: 'coverage-count',
      textContent: window.t('resists', rec.covers.length),
    }));
    body.appendChild(main);

    const meta = document.createElement('div');
    meta.className = 'coverage-meta';
    meta.appendChild(Object.assign(document.createElement('span'), { className:'coverage-chip-label', textContent:window.t('covers-label') }));
    const chips = document.createElement('div');
    chips.className = 'coverage-chips';
    rec.covers.forEach(({ type, weakCount: count }) => {
      const chip = Object.assign(document.createElement('span'), { className: 'coverage-chip' });
      chip.style.setProperty('--chip-rgb', TYPE_CARD_RGB[type] || '255,255,255');
      chip.appendChild(Object.assign(document.createElement('span'), { textContent: window.typeLabel(type) }));
      if (count > 1) chip.appendChild(Object.assign(document.createElement('span'), { className:'coverage-chip-weight', textContent:`x${count}` }));
      chips.appendChild(chip);
    });
    meta.appendChild(chips);
    body.appendChild(meta);
    item.appendChild(body);

    const toggle = Object.assign(document.createElement('button'), {
      className: 'coverage-toggle',
      type: 'button',
      title: window.t('covers-label'),
      innerHTML: '<span class="coverage-toggle-icon">▼</span>',
    });
    toggle.setAttribute('aria-expanded', 'false');
    toggle.addEventListener('click', () => {
      const open = item.classList.toggle('is-open');
      toggle.setAttribute('aria-expanded', String(open));
    });
    item.appendChild(toggle);
    list.appendChild(item);
  });

  section.appendChild(list);
  return section;
}

// ── Type analysis ─────────────────────────────────────────────────────────────
// Run-Cockpit aktuell halten: Fokus-Dossier und kompakte Kennzahlen statt einer rein dekorativen Bühne.
function updateScene() {
  renderFocusPanel();
  updateSoloSummary();
}

function renderTeamWeaknessPanel() {
  updateScene();
  const container = document.getElementById('team-weakness-panel');
  if (!container) return;
  const active = teamPokemon.filter(Boolean);
  if (!active.length) {
    container.innerHTML = `<p class="weakness-empty">${window.t('weakness-empty')}</p>`;
    return;
  }

  container.innerHTML = '';
  const table = document.createElement('div');
  table.className = 'weakness-table';

  const header = document.createElement('div');
  header.className = 'weakness-row weakness-header';
  header.appendChild(Object.assign(document.createElement('div'), { className:'weakness-type-label' }));
  active.forEach(p => {
    const c = document.createElement('div');
    c.className = 'weakness-pokemon-header';
    const name = esc(p.germanName || capitalize(p.name));
    c.innerHTML = `<img src="${esc(p.sprite)}" alt="${name}" width="36" height="36"><div title="${name}">${name}</div>`;
    header.appendChild(c);
  });
  table.appendChild(header);

  genTypes().forEach(atk => {
    const row = document.createElement('div');
    row.className = 'weakness-row';
    const lbl = document.createElement('div');
    lbl.className = `weakness-type-label type-bg-${atk}`;
    lbl.textContent = window.typeLabel(atk);
    row.appendChild(lbl);
    active.forEach(p => {
      const mult = getTypeEffectiveness(atk, typesOf(p));
      const cell = document.createElement('div');
      cell.className = 'weakness-cell';
      if (mult===0)       { cell.textContent='✕';  cell.classList.add('eff-immune'); }
      else if (mult<=0.25){ cell.textContent='¼×'; cell.classList.add('eff-resist2'); }
      else if (mult<1)    { cell.textContent='½×'; cell.classList.add('eff-resist'); }
      else if (mult===1)  { cell.textContent='';   cell.classList.add('eff-neutral'); }
      else if (mult>=4)   { cell.textContent='4×'; cell.classList.add('eff-weak4'); }
      else                { cell.textContent='2×'; cell.classList.add('eff-weak'); }
      row.appendChild(cell);
    });
    table.appendChild(row);
  });

  const summary = document.createElement('div');
  summary.className = 'weakness-summary';
  const weaknesses = [], immunities = [];
  genTypes().forEach(atk => {
    let w = 0, im = 0;
    active.forEach(p => {
      const m = getTypeEffectiveness(atk, typesOf(p));
      if (m >= 2) w++; else if (m === 0) im++;
    });
    if (w)  weaknesses.push({ type:atk, count:w });
    if (im) immunities.push({ type:atk, count:im });
  });
  weaknesses.sort((a,b) => b.count-a.count);
  immunities.sort((a,b) => b.count-a.count);

  summary.appendChild(Object.assign(document.createElement('div'), { className:'weakness-summary-title', textContent:window.t('weaknesses') }));
  if (!weaknesses.length) {
    summary.appendChild(Object.assign(document.createElement('div'), { style:'color:var(--color-muted);font-size:.85rem', textContent:'–' }));
  } else {
    weaknesses.forEach(({ type, count }) => {
      const row = document.createElement('div');
      row.className = 'weakness-summary-row';
      row.appendChild(Object.assign(document.createElement('span'), { className:`weakness-type-label type-bg-${type}`, textContent:window.typeLabel(type) }));
      row.appendChild(Object.assign(document.createElement('span'), { className:'weakness-summary-count', textContent:`${count}×` }));
      summary.appendChild(row);
    });
  }
  if (immunities.length) {
    const imTitle = Object.assign(document.createElement('div'), { className:'weakness-summary-title', textContent:window.t('immunities') });
    imTitle.style.marginTop = '14px';
    summary.appendChild(imTitle);
    immunities.forEach(({ type, count }) => {
      const row = document.createElement('div');
      row.className = 'weakness-summary-row';
      row.appendChild(Object.assign(document.createElement('span'), { className:`weakness-type-label type-bg-${type}`, textContent:window.typeLabel(type) }));
      row.appendChild(Object.assign(document.createElement('span'), { className:'weakness-summary-count weakness-summary-immune', textContent:`${count}×` }));
      summary.appendChild(row);
    });
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'weakness-wrapper';
  const scroll = document.createElement('div');
  scroll.className = 'weakness-table-scroll';
  scroll.appendChild(table);
  wrapper.appendChild(scroll);
  wrapper.appendChild(summary);
  container.appendChild(wrapper);

  const coverageEl = renderCoverageSection(active);
  if (coverageEl) {
    const coverWrapper = document.createElement('div');
    coverWrapper.className = 'coverage-players-wrapper';
    coverWrapper.appendChild(coverageEl);
    container.appendChild(coverWrapper);
  }
}

// ── Info panel ────────────────────────────────────────────────────────────────
async function renderInfoPanel() {
  const myGen = ++renderGeneration;
  const infoContent = document.getElementById('info-content');
  if (!infoContent) return;
  if (!activePokemonInfo) {
    infoContent.innerHTML = '';
    infoContent.appendChild(Object.assign(document.createElement('div'), { id:'info-placeholder', className:'info-row', textContent:window.t('info-placeholder') }));
    return;
  }
  // Ohne eigene Wahl: die Generation aus „Typen wie in“, wenn es dort Attacken hat – sonst die erste mit Attacken
  if (!infoGenLocked) {
    const gen = hasMovesInGen(activePokemonInfo, typeGen) ? typeGen : findFirstGenWithMoves(activePokemonInfo);
    if (gen !== infoGeneration) {
      infoGeneration = gen;
      const sel = document.getElementById('info-generation-select');
      if (sel) sel.value = String(gen);
    }
  }
  const header = document.createElement('div');
  header.className = 'info-row';
  header.innerHTML = `<div style="font-size:1.05rem;font-weight:700">${esc(activePokemonInfo.germanName||formatLabel(activePokemonInfo.name))}</div><div style="opacity:.75">#${esc(activePokemonInfo.id)}</div>`;
  const types = document.createElement('div');
  types.className = 'info-types';
  window.PokemonTypes.typesInGen(activePokemonInfo, infoGeneration).forEach(t => {
    types.appendChild(Object.assign(document.createElement('span'), { className:'info-type', textContent:window.typeLabel(t)||formatLabel(t) }));
  });
  const statsGrid = document.createElement('div');
  statsGrid.className = 'info-stats';
  const statMeta = {
    hp:{label:window.t('stat-hp'),css:'stat-hp'},
    attack:{label:window.t('stat-attack'),css:'stat-attack'},
    defense:{label:window.t('stat-defense'),css:'stat-defense'},
    specialAttack:{label:window.t('stat-sp-atk'),css:'stat-sp-atk'},
    specialDefense:{label:window.t('stat-sp-def'),css:'stat-sp-def'},
    speed:{label:window.t('stat-speed'),css:'stat-speed'},
  };
  Object.entries(window.PokemonTypes.statsInGen(activePokemonInfo, infoGeneration)).forEach(([k,v]) => {
    const m = statMeta[k]||{ label:formatLabel(k), css:'' };
    const s = Object.assign(document.createElement('div'), { className:`info-stat ${m.css}`.trim() });
    s.innerHTML = `<strong>${esc(m.label)}</strong><br>${esc(v)}`;
    statsGrid.appendChild(s);
  });

  // Abilities
  const abilitiesRaw = activePokemonInfo.abilities || [];
  const abilityDataArr = await Promise.all(abilitiesRaw.map(a => getAbilityData(a.name)));
  const abilitiesTitle = Object.assign(document.createElement('div'), { textContent: window.t('abilities') });
  abilitiesTitle.style.cssText = 'font-weight:700;margin-top:6px';
  const abilitiesList = document.createElement('div');
  abilitiesList.style.cssText = 'display:flex;flex-wrap:wrap;gap:6px;margin-top:4px';
  abilitiesRaw.forEach((a, i) => {
    const tag = document.createElement('span');
    tag.style.cssText = `padding:3px 10px;border-radius:20px;font-size:0.82rem;background:rgba(var(--t-ink),0.07);border:1px solid rgba(var(--t-ink),0.15);${a.isHidden?'opacity:0.6;font-style:italic':''}`;
    tag.textContent = abilityDataArr[i]?.name || formatLabel(a.name);
    if (a.isHidden) tag.title = window.t('hidden-ability');
    const aData = abilityDataArr[i];
    if (aData) attachTooltip(tag, () => buildAbilityTooltip(aData));
    abilitiesList.appendChild(tag);
  });


  // Evo chain
  const evoTitle = Object.assign(document.createElement('div'), { textContent:window.t('evolution') });
  evoTitle.style.cssText = 'font-weight:700;margin-top:6px';
  const evoContainer = document.createElement('div');
  evoContainer.className = 'evo-chain';
  if (activePokemonInfo.evolutionChainUrl) {
    try {
      const chain = await getEvolutionChain(activePokemonInfo.evolutionChainUrl);
      const paths = getEvolutionPaths(chain);
      const allStages = [...new Map(paths.flat().map(s => [s.name, s])).values()];
      const stageNames = allStages.map(s => s.name);
      const conditionMoveNames = {};
      const moveNamesNeeded = new Set();
      paths.flat().forEach(stage => {
        (stage.evolutionDetails || []).forEach(d => { if (d.known_move?.name) moveNamesNeeded.add(d.known_move.name); });
      });
      const stageGermanNames = {};
      await Promise.all([
        ...stageNames.map(async n => { try { const s = await getPokemonSpecies(n); stageGermanNames[n] = s.germanName; } catch {} }),
        ...[...moveNamesNeeded].map(async mn => { try { const md = await getMoveData(mn); conditionMoveNames[mn] = md.name; } catch {} }),
      ]);
      allStages.forEach(s => { getPokemon(s.id ?? s.name).catch(() => {}); });
      if (paths.length<=1 && paths[0]?.length<=1) {
        evoContainer.innerHTML = `<div class="evo-none">${window.t('no-evolution')}</div>`;
      } else {
        paths.forEach(path => {
          const row = document.createElement('div');
          row.className = 'evo-path';
          path.forEach((stage, i) => {
            if (i>0) {
              const arr = document.createElement('div');
              arr.className = 'evo-arrow';
              const resolvedDetails = resolveEvolutionDetails(stage.evolutionDetails, infoGeneration);
              const cond = formatEvolutionCondition(stage.evolutionDetails, conditionMoveNames, infoGeneration);
              const itemDetail = resolvedDetails.find(d => d.trigger?.name === 'use-item' && d.item?.name);
              const itemName = itemDetail?.item?.name || null;
              const itemSprite = itemName ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${itemName}.png` : null;
              arr.innerHTML = `<div class="evo-arrow-icon">→</div>${itemSprite ? `<img src="${esc(itemSprite)}" alt="${esc(itemName)}" width="24" height="24" style="image-rendering:pixelated;margin-top:2px">` : ''}${cond?`<div class="evo-condition">${esc(cond)}</div>`:''}`;
              row.appendChild(arr);
            }
            const isActive = stage.name === activePokemonInfo.name || stage.name === activePokemonInfo.baseName;
            const el = document.createElement('div');
            el.className = 'evo-stage' + (isActive ? ' evo-stage-active' : ' evo-stage-clickable');
            const stageName = stageGermanNames[stage.name] || getDisplayName(stage.name);
            el.innerHTML = `<img src="${esc(stage.sprite)}" alt="${esc(stageName)}" width="48" height="48"><div class="evo-name">${esc(stageName)}</div>`;
            if (!isActive) {
              el.addEventListener('click', async () => {
                try {
                  const details = await fetchWithSpecies(stage.id ?? stage.name);
                  infoGenLocked = false;
                  activePokemonInfo = details;
                  renderInfoPanel();
                } catch(e) { console.error(e); }
              });
            }
            row.appendChild(el);
          });
          evoContainer.appendChild(row);
        });
      }
    } catch { evoContainer.innerHTML = `<div class="evo-none">${window.t('no-evo-data')}</div>`; }
  } else { evoContainer.innerHTML = `<div class="evo-none">${window.t('no-evolution')}</div>`; }

  // Alternate forms
  let formsTitle = null, formsList = null;
  const varieties = activePokemonInfo.varieties || [];
  if (varieties.length > 1) {
    formsTitle = document.createElement('div');
    formsTitle.style.cssText = 'font-weight:700;margin-top:6px';
    formsTitle.textContent = window.t('forms');
    formsList = document.createElement('div');
    formsList.className = 'evo-path forms-list';
    varieties.forEach(variety => {
      const formName = variety.pokemon.name;
      const mf = variety.pokemon.url.match(/\/pokemon\/(\d+)\//);
      const formId = mf ? Number(mf[1]) : null;
      const sprite = formId ? `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${formId}.png` : null;
      const isCurrentForm = formName === activePokemonInfo.name;
      const formEl = document.createElement('div');
      formEl.className = 'evo-stage' + (isCurrentForm ? ' evo-stage-active' : ' evo-stage-clickable');
      const basePart = activePokemonInfo.baseName || '';
      const suffix = formName.startsWith(basePart + '-') ? formName.slice(basePart.length + 1) : formName;
      const displayName = suffix.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
      const imgHtml = sprite ? `<img src="${esc(sprite)}" alt="${esc(displayName)}" width="48" height="48">` : '';
      formEl.innerHTML = `${imgHtml}<div class="evo-name">${esc(displayName)}</div>`;
      if (!isCurrentForm) {
        formEl.addEventListener('click', async () => {
          try {
            const details = await fetchWithSpecies(formName);
            infoGenLocked = false;
            activePokemonInfo = details;
            renderInfoPanel();
          } catch(e) { console.error(e); }
        });
      }
      formsList.appendChild(formEl);
    });
  }

  // Moves
  const movesTitle = Object.assign(document.createElement('div'), { textContent:window.t('moves-gen', infoGeneration) });
  movesTitle.style.cssText = 'font-weight:700;margin-top:6px';
  const movesList = document.createElement('div');
  movesList.className = 'info-moves';
  const vg = getGenerationVersionGroups(infoGeneration);
  const moveItems = [];
  const highlight = ['machine','tutor','egg'];
  (Array.isArray(activePokemonInfo.moves)?activePokemonInfo.moves:[]).forEach(move => {
    const match = (move.version_group_details||[]).find(d => vg.includes(d.version_group?.name));
    if (match) moveItems.push({ rawName:move.move?.name||'', name:'', learnInfo:formatLearnMethod(match), sortLevel:match.level_learned_at||999, sortMethod:match.move_learn_method?.name||'', methodClass:highlight.includes(match.move_learn_method?.name)?'learn-method-highlight':'' });
  });
  const moveDataArr = await Promise.all(moveItems.map(m => getMoveData(m.rawName)));
  moveItems.forEach((m,i) => { m.name = moveDataArr[i].name; m.moveType = moveDataArr[i].type; m.data = moveDataArr[i]; });
  const prio = { 'level-up':0, 'egg':1, 'tutor':2, 'machine':3 };
  moveItems.sort((a,b) => { const ap=prio[a.sortMethod]??5, bp=prio[b.sortMethod]??5; if(ap!==bp)return ap-bp; if(ap===0&&a.sortLevel!==b.sortLevel)return a.sortLevel-b.sortLevel; return a.name.localeCompare(b.name); });
  if (!moveItems.length) {
    movesList.appendChild(Object.assign(document.createElement('div'), { className:'info-move', textContent:window.t('no-moves') }));
  } else {
    moveItems.forEach(m => {
      const el = Object.assign(document.createElement('div'), { className:'info-move' });
      const typeColor = m.moveType ? TYPE_MOVE_COLORS[m.moveType] : null;
      if (typeColor) el.style.background = `linear-gradient(to right, ${typeColor} 0%, rgba(var(--t-ink),0.04) 60%)`;
      el.innerHTML = `<strong>${esc(m.name)}</strong> <span class="learn-method-tag ${m.methodClass}" style="font-size:.9rem;opacity:.9">${esc(m.learnInfo)}</span>`;
      if (m.data) attachTooltip(el, () => buildMoveTooltip(m.data));
      movesList.appendChild(el);
    });
  }

  // Stale-render guard
  if (myGen !== renderGeneration) return;

  infoContent.innerHTML = '';
  infoContent.appendChild(header);
  infoContent.appendChild(types);
  infoContent.appendChild(statsGrid);
  infoContent.appendChild(abilitiesTitle);
  infoContent.appendChild(abilitiesList);
  infoContent.appendChild(evoTitle);
  infoContent.appendChild(evoContainer);
  if (formsTitle) infoContent.appendChild(formsTitle);
  if (formsList) infoContent.appendChild(formsList);
  infoContent.appendChild(movesTitle);
  infoContent.appendChild(movesList);
}

// ── Run management: overview, routes and graveyard ──────────────────────────
function routeGame() { return soloGame || cleanGame(window.PokeHubGame?.get?.()) || ''; }
function fixRouteGame() { if (!soloGame) soloGame = cleanGame(routeGame()); }

function allCatches() {
  const catches = [];
  teamPokemon.forEach((mon, index) => { if (mon) catches.push({ where: 'team', index, mon }); });
  boxPokemon.forEach((mon, index) => { if (mon) catches.push({ where: 'box', index, mon }); });
  graveyardPokemon.forEach((mon, index) => { if (mon) catches.push({ where: 'grave', index, mon }); });
  return catches;
}

function routeRows() {
  const game = routeGame();
  const catches = allCatches();
  const locations = window.PokeHubLocations;
  const base = game && locations ? locations.encounterList(game) : [];
  const known = game && locations ? locations.known(game) : null;
  // Fangorte eines anderen Spiels bleiben am Pokémon gespeichert, tauchen im aktiven Run aber nicht auf.
  const used = [...catches.map(c => cleanRoute(c.mon.route)), ...Object.keys(routeMarks)]
    .filter(route => route && (!known || known.has(route)));
  const order = game && locations ? [locations.STARTER_LOCATION, ...(locations.LOCATION_ORDER[game] || []), ...base] : [];
  const position = route => {
    const index = order.indexOf(route);
    return index < 0 ? Number.POSITIVE_INFINITY : index;
  };
  return [...new Set([...base, ...used])]
    .sort((a, b) => position(a) - position(b) || a.localeCompare(b, 'de'))
    .map(route => ({
      route,
      catches: catches.filter(c => cleanRoute(c.mon.route) === route),
      missed: !!routeMarks[route],
    }));
}

function rowDone(row) { return !!(row.catches.length || row.missed); }

// ── Solo journey: the run becomes a small, state-driven travelling scene ────
const JOURNEY_BIOMES = {
  coast: new Set(['rubin-saphir', 'smaragd', 'omega-rot-alpha-saphir', 'sonne-mond', 'ultrasonne-ultramond']),
  mountain: new Set(['diamant-perl', 'platin', 'bdsp']),
  city: new Set(['schwarz-weiss', 'schwarz2-weiss2', 'x-y']),
  moor: new Set(['schwert-schild']),
  sunset: new Set(['karmesin-purpur']),
};

function journeyBiome(game) {
  return Object.entries(JOURNEY_BIOMES).find(([, games]) => games.has(game))?.[0] || 'meadow';
}

function journeyDaytime() {
  const hour = new Date().getHours();
  if (hour < 6 || hour >= 21) return 'night';
  if (hour < 9) return 'dawn';
  if (hour >= 18) return 'dusk';
  return 'day';
}

function journeyGameLabel(game) {
  return game ? (window.PokeHubGame?.label?.(game, window.LANG) || formatLabel(game)) : window.t('journey-game-none');
}

// Pokémon-Center neben der Karte (center.js): das Team als Begleiter, Box und Friedhof am PC
function updateCenter() {
  if (!window.CenterScene) return;
  const dexOf = p => (p.id > 0 && p.id < 10000 ? p.id : window.POKEMON_NAMES?.forms?.[p.name]?.[0] || allPokemonList.find(x => x.name === p.speciesName)?.id || 0);
  window.CenterScene.update({
    team: teamPokemon.map(p => p ? { key: p.name, name: pokemonLabel(p), dex: dexOf(p) } : null),
    focus: focusedTarget.type === 'team' && teamPokemon[focusedTarget.index] ? focusedTarget.index : -1,
    box: boxPokemon.filter(Boolean).length,
    boxMax: boxPokemon.length || 30,
    graves: graveyardPokemon.map(p => p.name),
  });
}

function renderJourney() {
  const root = document.getElementById('solo-journey');
  if (!root) return;

  const game = routeGame();
  const gameLabel = journeyGameLabel(game);
  const rows = routeRows();
  const done = rows.filter(rowDone).length;
  const nextIndex = rows.findIndex(row => !rowDone(row));
  const next = nextIndex >= 0 ? rows[nextIndex] : null;
  const active = teamPokemon.map((mon, index) => ({ mon, index })).filter(entry => entry.mon);
  const progress = rows.length ? Math.round(done / rows.length * 100) : 0;

  root.dataset.biome = journeyBiome(game);
  root.dataset.daytime = journeyDaytime();
  root.classList.toggle('has-team', !!active.length);
  root.style.setProperty('--journey-progress', `${progress}%`);

  const gameEl = document.getElementById('journey-game');
  const heading = document.getElementById('journey-heading');
  const note = document.getElementById('journey-note');
  const progressEl = document.getElementById('journey-progress-value');
  if (gameEl) gameEl.textContent = gameLabel;
  if (progressEl) progressEl.textContent = `${progress}%`;

  if (!game) {
    if (heading) heading.textContent = window.t('journey-heading-none');
    if (note) note.textContent = window.t('journey-note-none');
  } else if (!active.length || !rows.length) {
    if (heading) heading.textContent = window.t('journey-heading-empty');
    if (note) note.textContent = window.t('journey-note-empty', gameLabel);
  } else if (next) {
    if (heading) heading.textContent = window.t('journey-heading-next', routeLabel(next.route));
    if (note) note.textContent = window.t('journey-note-progress', done, rows.length, active.length);
  } else {
    if (heading) heading.textContent = window.t('journey-heading-done');
    if (note) note.textContent = window.t('journey-note-done', rows.length, graveyardPokemon.length);
  }

  const party = document.getElementById('journey-party');
  if (party) {
    party.innerHTML = active.length ? active.map(({ mon, index }, rank) => {
      const name = pokemonLabel(mon);
      const focused = focusedTarget.type === 'team' && focusedTarget.index === index;
      const sprite = mon.sprite ? `<img src="${esc(mon.sprite)}" alt="" draggable="false">` : `<span class="journey-mon-fallback">?</span>`;
      return `<button type="button" class="journey-mon${focused ? ' is-focused' : ''}" data-journey-team="${index}" data-rank="${rank}" aria-label="${esc(window.t('journey-focus', name))}">
        <span class="journey-mon-shadow" aria-hidden="true"></span>${sprite}<span class="journey-mon-name">${esc(name)}</span>
      </button>`;
    }).join('') : `<button type="button" class="journey-empty-party" data-journey-add>
      <span class="journey-pokeball" aria-hidden="true"></span><span>${esc(window.t('journey-add'))}</span>
    </button>`;
  }

  updateCenter();

  const waypoints = document.getElementById('journey-waypoints');
  if (!waypoints) return;
  if (!rows.length) {
    waypoints.innerHTML = `<button type="button" class="journey-no-route" data-journey-open>${esc(window.t('journey-open'))}<span aria-hidden="true">→</span></button>`;
    return;
  }

  const visible = 7;
  const pivot = nextIndex >= 0 ? nextIndex : rows.length - 1;
  const start = Math.max(0, Math.min(pivot - 2, rows.length - visible));
  const shown = rows.slice(start, start + visible);
  const points = [];
  if (start > 0) points.push('<span class="journey-more" aria-hidden="true">•••</span>');
  shown.forEach((row, offset) => {
    const absoluteIndex = start + offset;
    const current = absoluteIndex === nextIndex;
    const state = row.missed ? 'missed' : row.catches.length ? 'done' : current ? 'current' : 'open';
    const label = routeLabel(row.route);
    const aria = window.t(state === 'missed' ? 'journey-route-missed' : state === 'done' ? 'journey-route-done' : 'journey-route-open', label);
    const caught = row.catches[0]?.mon;
    const marker = caught?.sprite
      ? `<img src="${esc(caught.sprite)}" alt="">`
      : state === 'missed' ? '<span aria-hidden="true">×</span>'
        : state === 'done' ? '<span aria-hidden="true">✓</span>'
          : current ? '<span aria-hidden="true">◆</span>' : '<span aria-hidden="true">·</span>';
    points.push(`<button type="button" class="journey-point is-${state}" data-journey-route="${esc(row.route)}" aria-label="${esc(aria)}">
      <span class="journey-point-marker">${marker}</span><span class="journey-point-label">${esc(label)}</span>
    </button>`);
  });
  if (start + shown.length < rows.length) points.push('<span class="journey-more" aria-hidden="true">•••</span>');
  waypoints.innerHTML = points.join('');
}

function openJourneyRoutes(route = '') {
  routeFilter = 'all';
  toggleRoutes(true);
  const section = document.getElementById('routes-section');
  const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
  section?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  requestAnimationFrame(() => {
    if (!routeGame()) {
      document.getElementById('routes-game-select')?.focus({ preventScroll: true });
      return;
    }
    const row = [...document.querySelectorAll('#routes-list .route-row')].find(item => item.dataset.route === route);
    row?.classList.add('is-journey-target');
    row?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'nearest' });
    setTimeout(() => row?.classList.remove('is-journey-target'), 1400);
  });
}

function updateSoloSummary() {
  const teamCount = teamPokemon.filter(Boolean).length;
  const boxCount = boxPokemon.filter(Boolean).length;
  const rows = routeRows();
  const done = rows.filter(rowDone).length;
  const values = {
    'summary-team': `${teamCount} / 6`,
    'summary-box': `${boxCount} / 30`,
    'summary-routes': rows.length ? `${done} / ${rows.length}` : '–',
    'summary-grave': String(graveyardPokemon.length),
    'box-count': `${boxCount} / 30`,
    'routes-count': rows.length ? `${done} / ${rows.length}` : '–',
    'graveyard-count': String(graveyardPokemon.length),
  };
  Object.entries(values).forEach(([id, value]) => {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
  });
  renderJourney();
}
window.updateSoloSummary = updateSoloSummary;

function renderRouteGameSelect() {
  const select = document.getElementById('routes-game-select');
  if (!select) return;
  const current = routeGame();
  const games = (window.PokeHubGame?.list || []).filter(game => window.PokeHubLocations?.LOCATION_PRESETS?.[game]);
  select.innerHTML = `<option value="">${esc(window.t('routes-game-none'))}</option>` + games
    .map(game => `<option value="${esc(game)}">${esc(window.PokeHubGame.label(game, window.LANG))}</option>`).join('');
  select.value = current;
}

function routeMonHtml(catchEntry) {
  const p = catchEntry.mon;
  const dead = catchEntry.where === 'grave';
  return `<span class="route-mon${dead ? ' is-dead' : ''}"><img src="${esc(p.sprite)}" alt=""><span><strong>${esc(pokemonLabel(p))}</strong><small>${esc(window.t(`route-where-${catchEntry.where}`))}</small></span></span>`;
}

let routeRowsShown = [];
function renderRoutes() {
  renderRouteGameSelect();
  const rows = routeRows();
  const unrouted = allCatches().filter(c => !cleanRoute(c.mon.route) && c.where !== 'grave');
  const hint = document.getElementById('routes-hint');
  if (hint) {
    hint.textContent = !routeGame() ? window.t('routes-hint-game') : unrouted.length ? window.t('routes-hint-unrouted', unrouted.length) : '';
    hint.hidden = !hint.textContent;
  }
  document.querySelectorAll('[data-route-filter]').forEach(button => {
    const active = button.dataset.routeFilter === routeFilter;
    button.classList.toggle('is-on', active);
    button.setAttribute('aria-pressed', String(active));
  });

  const list = document.getElementById('routes-list');
  routeRowsShown = rows.filter(row => routeFilter === 'all' || (routeFilter === 'open' ? !rowDone(row) : rowDone(row)));
  if (list && routesOpen) {
    list.innerHTML = routeRowsShown.length ? routeRowsShown.map((row, index) => {
      const status = row.missed
        ? `<span class="route-missed">× ${esc(window.t('route-missed'))}</span>`
        : row.catches.length ? row.catches.map(routeMonHtml).join('') : `<span class="route-empty">${esc(window.t('route-open'))}</span>`;
      const primary = row.catches.length
        ? `<button type="button" class="route-action" data-route-action="change" data-row="${index}">${esc(window.t('route-change'))}</button>`
        : `<button type="button" class="route-action" data-route-action="assign" data-row="${index}">${esc(window.t('route-enter'))}</button>`;
      const missed = row.catches.length ? '' : `<button type="button" class="route-action" data-route-action="missed" data-row="${index}" title="${esc(window.t(row.missed ? 'route-undo-missed' : 'route-mark-missed'))}">${row.missed ? '↶' : '×'}</button>`;
      return `<div class="route-row${rowDone(row) ? ' is-done' : ''}" data-route="${esc(row.route)}">
        <div class="route-name" title="${esc(routeLabel(row.route))}">${esc(routeLabel(row.route))}</div>
        <div class="route-status">${status}</div>
        <div class="route-actions">${primary}${missed}</div>
      </div>`;
    }).join('') : `<p class="routes-empty">${esc(window.t('routes-empty'))}</p>`;
  }
  updateSoloSummary();
}

function toggleRoutes(force) {
  routesOpen = typeof force === 'boolean' ? force : !routesOpen;
  const body = document.getElementById('routes-body');
  const toggle = document.getElementById('routes-toggle');
  if (body) body.hidden = !routesOpen;
  if (toggle) toggle.setAttribute('aria-expanded', String(routesOpen));
  const icon = document.getElementById('routes-toggle-icon');
  if (icon) icon.textContent = routesOpen ? '▲' : '▼';
  if (routesOpen) renderRoutes();
}

function toggleGraveyard(force) {
  graveyardOpen = typeof force === 'boolean' ? force : !graveyardOpen;
  const body = document.getElementById('graveyard-body');
  const toggle = document.getElementById('graveyard-toggle');
  if (body) body.hidden = !graveyardOpen;
  if (toggle) toggle.setAttribute('aria-expanded', String(graveyardOpen));
  const icon = document.getElementById('graveyard-toggle-icon');
  if (icon) icon.textContent = graveyardOpen ? '▲' : '▼';
  if (graveyardOpen) renderGraveyard();
}

function renderGraveyard() {
  const container = document.getElementById('graveyard-slots');
  if (!container) return;
  if (!graveyardPokemon.length) {
    container.innerHTML = `<p class="graveyard-empty">${esc(window.t('graveyard-empty'))}</p>`;
  } else {
    container.innerHTML = `<div class="graveyard-grid">${graveyardPokemon.map((p, index) => {
      const route = cleanRoute(p.route);
      return `<button type="button" class="grave-slot${focusedTarget.type === 'grave' && focusedTarget.index === index ? ' is-focused' : ''}" data-grave-index="${index}" title="${esc(route ? window.t('route-caught', routeLabel(route)) : pokemonLabel(p))}">
        <img src="${esc(p.sprite)}" alt=""><span class="grave-slot-name">${esc(pokemonLabel(p))}</span>${route ? `<span class="grave-route">${esc(routeLabel(route))}</span>` : ''}
      </button>`;
    }).join('')}</div>`;
  }
  updateSoloSummary();
}

function rerenderRun() {
  teamPokemon.forEach((p, i) => renderTeamSlot(i, p));
  updateBoxSlots();
  renderGraveyard();
  renderRoutes();
  renderFocusPanel();
  renderTeamWeaknessPanel();
}

function removePokemonAt(type, index) {
  if (type === 'team') teamPokemon[index] = null;
  else if (type === 'box') boxPokemon[index] = null;
  else if (type === 'grave') graveyardPokemon.splice(index, 1);
  ensureFocus();
  rerenderRun();
  saveState();
}

function killPokemon(type, index) {
  const source = type === 'team' ? teamPokemon : type === 'box' ? boxPokemon : null;
  const p = source?.[index];
  if (!p) return;
  source[index] = null;
  graveyardPokemon.push(p);
  focusedTarget = { type: 'grave', index: graveyardPokemon.length - 1 };
  rerenderRun();
  saveState();
}

function movePokemon(type, index, destination) {
  const source = type === 'team' ? teamPokemon : boxPokemon;
  const target = destination === 'team' ? teamPokemon : boxPokemon;
  const p = source?.[index];
  const free = target.findIndex(item => !item);
  if (!p || free < 0) {
    if (p) alert(window.t('storage-full'));
    return;
  }
  source[index] = null;
  target[free] = p;
  focusedTarget = { type: destination, index: free };
  rerenderRun();
  saveState();
}

function restoreGrave(index) {
  const p = graveyardPokemon[index];
  const boxSlot = boxPokemon.findIndex(item => !item);
  const teamSlot = teamPokemon.findIndex(item => !item);
  if (!p || (boxSlot < 0 && teamSlot < 0)) {
    if (p) alert(window.t('storage-full'));
    return;
  }
  graveyardPokemon.splice(index, 1);
  if (boxSlot >= 0) {
    boxPokemon[boxSlot] = p;
    focusedTarget = { type: 'box', index: boxSlot };
  } else {
    teamPokemon[teamSlot] = p;
    focusedTarget = { type: 'team', index: teamSlot };
  }
  rerenderRun();
  saveState();
}

let routeDialogState = null;
function showRouteDialog() {
  const dialog = document.getElementById('route-dialog');
  if (!dialog) return;
  const search = document.getElementById('route-dialog-search');
  if (search) search.value = '';
  if (typeof dialog.showModal === 'function') dialog.showModal();
  else dialog.setAttribute('open', '');
  renderRouteDialog();
  if (matchMedia('(hover: hover)').matches) setTimeout(() => search?.focus(), 0);
}

function closeRouteDialog() {
  const dialog = document.getElementById('route-dialog');
  if (!dialog) return;
  if (typeof dialog.close === 'function' && dialog.open) dialog.close();
  else dialog.removeAttribute('open');
  routeDialogState = null;
}

function openRoutePicker(mon) {
  if (!mon) return;
  if (!routeGame()) {
    toggleRoutes(true);
    document.getElementById('routes-game-select')?.focus();
    return;
  }
  routeDialogState = { mode: 'route', mon };
  showRouteDialog();
}

function openCatchPicker(route) {
  routeDialogState = { mode: 'catch', route };
  showRouteDialog();
}

function renderRouteDialog() {
  if (!routeDialogState) return;
  const title = document.getElementById('route-dialog-title');
  const list = document.getElementById('route-dialog-list');
  const footer = document.getElementById('route-dialog-footer');
  const search = document.getElementById('route-dialog-search');
  const locale = window.LANG === 'de' ? 'de' : 'en';
  const query = search?.value.trim().toLocaleLowerCase(locale) || '';
  if (!title || !list || !footer) return;

  if (routeDialogState.mode === 'route') {
    const mon = routeDialogState.mon;
    title.textContent = window.t('route-dialog-title', pokemonLabel(mon));
    const rows = routeRows().filter(row => !query || routeLabel(row.route).toLocaleLowerCase(locale).includes(query));
    list.innerHTML = rows.length ? rows.map((row, index) => `<button type="button" class="route-dialog-option${cleanRoute(mon.route) === row.route ? ' is-selected' : ''}" data-dialog-choice="${index}"><span>${esc(routeLabel(row.route))}</span><small>${row.missed ? esc(window.t('route-missed')) : row.catches.length ? esc(window.t('route-done')) : esc(window.t('route-open'))}</small></button>`).join('') : `<p class="routes-empty">${esc(window.t('route-dialog-empty'))}</p>`;
    routeDialogState.choices = rows;
    footer.innerHTML = cleanRoute(mon.route) ? `<button type="button" data-dialog-action="clear">${esc(window.t('route-clear'))}</button>` : '';
  } else {
    const route = routeDialogState.route;
    title.textContent = window.t('route-assign-title', routeLabel(route));
    const catches = allCatches().filter(c => c.where !== 'grave' && !cleanRoute(c.mon.route) && (!query || pokemonLabel(c.mon).toLocaleLowerCase(locale).includes(query)));
    list.innerHTML = catches.length ? catches.map((c, index) => `<button type="button" class="route-dialog-option" data-dialog-choice="${index}"><span class="route-mon"><img src="${esc(c.mon.sprite)}" alt=""><span><strong>${esc(pokemonLabel(c.mon))}</strong><small>${esc(window.t(`route-where-${c.where}`))}</small></span></span></button>`).join('') : `<p class="routes-empty">${esc(window.t('route-pick-mon-empty'))}</p>`;
    routeDialogState.choices = catches;
    footer.innerHTML = `<button type="button" data-dialog-action="missed">${esc(window.t(routeMarks[route] ? 'route-undo-missed' : 'route-mark-missed'))}</button>`;
  }
}

function commitRouteDialogChoice(index) {
  const choice = routeDialogState?.choices?.[index];
  if (!choice) return;
  fixRouteGame();
  if (routeDialogState.mode === 'route') {
    routeDialogState.mon.route = choice.route;
    delete routeMarks[choice.route];
  } else {
    choice.mon.route = routeDialogState.route;
    delete routeMarks[routeDialogState.route];
  }
  closeRouteDialog();
  rerenderRun();
  saveState();
}

// ── Save / Load ───────────────────────────────────────────────────────────────
function saveState() {
  let ok = true;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      generation: currentGeneration,
      team: teamPokemon.map(serializePokemon),
      box: boxPokemon.map(serializePokemon),
      graveyard: graveyardPokemon.map(serializeGrave).filter(Boolean),
      game: soloGame || null,
      routeMarks: Object.fromEntries(Object.entries(routeMarks).filter(([route, missed]) => missed && cleanRoute(route)).map(([route]) => [cleanRoute(route), true])),
      focus: focusedTarget,
    }));
  } catch (e) { ok = false; console.error('Speichern fehlgeschlagen:', e); }
  const s = document.getElementById('save-status');
  if (s) { s.textContent=window.t(ok ? 'saved' : 'save-failed'); setTimeout(()=>s.textContent='', ok ? 2000 : 8000); }
}

async function fetchWithSpecies(name) {
  const raw = await getPokemon(name);
  const details = { ...raw };
  const speciesName = details.speciesName || name;
  details.baseName = speciesName;
  try {
    const species = await getPokemonSpecies(speciesName);
    details.germanName = species.germanName || capitalize(details.name);
    details.evolutionChainUrl = species.evolutionChainUrl ?? null;
    details.varieties = species.varieties || [];
  } catch { details.germanName = capitalize(details.name); details.evolutionChainUrl = null; details.varieties = []; }
  return details;
}

// Gespeichertes Pokémon laden. Klappt das gerade nicht (offline, API-Fehler), bleibt es als Platzhalter
// mit seinem Namen stehen – so geht beim nächsten Speichern nichts verloren. retryPlaceholders() holt es nach.
async function loadSaved(name) {
  if (typeof name !== 'string' || !/^[a-z0-9-]{1,60}$/.test(name)) return null;
  try { return await fetchWithSpecies(name); }
  catch (e) { console.warn('Nicht geladen, Platzhalter:', name, e); return placeholderPokemon(name); }
}

async function retryPlaceholders() {
  let changed = false;
  for (const list of [teamPokemon, boxPokemon, graveyardPokemon]) {
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p?.placeholder) continue;
      let d;
      try { d = await fetchWithSpecies(p.name); } catch { return; }   // noch offline – beim nächsten Mal
      if (list[i] === p) { d.route = cleanRoute(p.route) || undefined; list[i] = d; changed = true; }
    }
  }
  if (!changed) return;
  rerenderRun();
}
window.addEventListener('online', retryPlaceholders);

async function loadSavedState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    soloGame = cleanGame(window.PokeHubGame?.get?.());
    return false;
  }
  let changedByHub = false;
  try {
    const state = JSON.parse(raw);
    const savedGame = cleanGame(state.game);
    const hubGame = cleanGame(window.PokeHubGame?.get?.());
    changedByHub = !!hubGame && hubGame !== savedGame;
    soloGame = hubGame || savedGame;
    if (!hubGame && savedGame) window.PokeHubGame?.set?.(savedGame);
    routeMarks = {};
    if (!changedByHub && state.routeMarks && typeof state.routeMarks === 'object') {
      Object.entries(state.routeMarks).forEach(([route, missed]) => { const clean = cleanRoute(route); if (clean && missed) routeMarks[clean] = true; });
    }
    if (state.focus && ['team', 'box', 'grave'].includes(state.focus.type) && Number.isInteger(Number(state.focus.index))) {
      focusedTarget = { type: state.focus.type, index: Math.max(0, Number(state.focus.index)) };
    }
    if (state.generation) {
      currentGeneration = Number(state.generation)||1;
      infoGeneration = currentGeneration;
      const gs = document.getElementById('generation-select');
      if (gs) gs.value = String(currentGeneration);
      const igs = document.getElementById('info-generation-select');
      if (igs) igs.value = String(currentGeneration);
    }
    if (Array.isArray(state.team)) {
      for (let i=0; i<6; i++) {
        const name = storedName(state.team[i]);
        if (name) { const d=await loadSaved(name); if (d) d.route = storedRoute(state.team[i]) || undefined; teamPokemon[i]=d; renderTeamSlot(i,d); }
      }
    }
    if (Array.isArray(state.box)) {
      for (let i=0; i<30; i++) {
        const name = storedName(state.box[i]);
        if (name) { const d = await loadSaved(name); if (d) d.route = storedRoute(state.box[i]) || undefined; boxPokemon[i] = d; }
      }
    }
    if (Array.isArray(state.graveyard)) {
      const savedGraves = state.graveyard.slice(0, 200);
      for (const entry of savedGraves) {
        const name = storedName(entry);
        if (!name) continue;
        const d = await loadSaved(name);
        if (!d) continue;
        d.route = storedRoute(entry) || undefined;
        if (entry && typeof entry === 'object') {
          if (!d.sprite && typeof entry.sprite === 'string') d.sprite = entry.sprite;
          if (!d.germanName && typeof entry.germanName === 'string') d.germanName = entry.germanName;
        }
        graveyardPokemon.push(d);
      }
    }
  } catch(e) {
    console.error('Fehler beim Laden:', e);
    soloGame = cleanGame(window.PokeHubGame?.get?.());
    routeMarks = {};
  }
  return changedByHub;
}

// ── Pokémon list ──────────────────────────────────────────────────────────────
async function loadAllPokemonBasic() {
  const results = await Promise.allSettled([1,2,3,4,5,6,7,8,9].map(g=>getGenerationList(g)));
  allPokemonList = results.flatMap(r => {
    if (r.status!=='fulfilled') return [];
    return r.value.map(p => {
      const m = p.url.match(/\/pokemon\/(\d+)\//);
      const id = m ? Number(m[1]) : null;
      if (!id) return null;
      return { id, name:p.name, displayName:listName(id, p.name), sprite:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` };
    }).filter(Boolean);
  });
}

async function loadPokemonList(gen=1) {
  currentGeneration = gen;
  const list = await getGenerationList(gen);
  pokemonList = list.map(p => {
    const m = p.url.match(/\/pokemon\/(\d+)\//);
    const id = m?Number(m[1]):null;
    return { id, name:p.name, displayName:listName(id, p.name), sprite:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` };
  }).filter(p=>p.id);
}

function renderPokemonList(filter='') {
  const listEl = document.getElementById('pokemon-list');
  listEl.innerHTML = '';
  const search = filter.trim().toLowerCase();
  const source = search ? allPokemonList : pokemonList;
  if (!source.length) { listEl.innerHTML=`<li style="cursor:default">${window.t('loading-pokemon')}</li>`; return; }
  const filtered = source.filter(p=>p.displayName.toLowerCase().includes(search)||p.name.toLowerCase().includes(search));
  if (!filtered.length) { listEl.innerHTML=`<li style="cursor:default">${window.t('no-pokemon-found')}</li>`; return; }
  filtered.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<img src="${esc(p.sprite)}" alt="${esc(p.displayName)}"/><div>${esc(p.displayName)}</div>`;
    li.addEventListener('click', ()=>selectPokemon(p));
    listEl.appendChild(li);
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(title=null) {
  const t = document.getElementById('modal-title');
  if (t) t.textContent = title ?? window.t('modal-title');
  const s = document.getElementById('pokemon-search');
  if (s) s.value = '';
  const gs = document.getElementById('generation-select');
  if (gs) gs.value = String(currentGeneration);
  renderPokemonList();
  document.getElementById('pokemon-modal').style.display = 'flex';
  pickSeq++;
}

function closeModal() {
  pickSeq++;
  document.getElementById('pokemon-modal').style.display = 'none';
}

// ── Box toggle ────────────────────────────────────────────────────────────────
function toggleBox() {
  boxOpen = !boxOpen;
  const body = document.getElementById('box-body');
  const icon = document.getElementById('box-toggle-icon');
  const toggle = document.getElementById('box-toggle');
  if (body) body.style.display = boxOpen ? 'block' : 'none';
  if (icon) icon.textContent = boxOpen ? '▲' : '▼';
  if (toggle) toggle.setAttribute('aria-expanded', String(boxOpen));
  if (boxOpen) updateBoxSlots();
}

// ── Drag & drop ───────────────────────────────────────────────────────────────
function handleDrop(target) {
  if (!dragSource) return;
  const src = dragSource;
  dragSource = null;
  document.querySelectorAll('.drag-over, .dragging').forEach(el => el.classList.remove('drag-over', 'dragging'));

  if (src.type === target.type && src.slot === target.slot) return;

  const get = (t, s) => t === 'team' ? teamPokemon[s] : boxPokemon[s];
  const set = (t, s, v) => { if (t === 'team') teamPokemon[s] = v; else boxPokemon[s] = v; };

  const srcVal = get(src.type, src.slot);
  if (!srcVal) return;
  const tgtVal = get(target.type, target.slot);

  if (focusedTarget.type === src.type && focusedTarget.index === src.slot) focusedTarget = { type: target.type, index: target.slot };
  else if (focusedTarget.type === target.type && focusedTarget.index === target.slot) focusedTarget = { type: src.type, index: src.slot };

  set(src.type,    src.slot,    tgtVal || null);
  set(target.type, target.slot, srcVal);

  if (src.type    === 'team') renderTeamSlot(src.slot,    tgtVal || null);
  if (target.type === 'team') renderTeamSlot(target.slot, srcVal);

  updateBoxSlots();
  renderTeamWeaknessPanel();
  renderRoutes();
  saveState();
}

// ── Touch drag & drop ─────────────────────────────────────────────────────────
function initTouchDrag() {
  let touchId = null;
  let startX = 0, startY = 0;
  let ghost = null;
  let touchDragging = false;
  const THRESHOLD = 8;

  function cleanup() {
    touchId = null;
    touchDragging = false;
    if (ghost) { ghost.remove(); ghost = null; }
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    document.querySelectorAll('.drag-over-section').forEach(el => el.classList.remove('drag-over-section'));
  }

  function getDropTarget(x, y) {
    const el = document.elementFromPoint(x, y);
    if (!el) return null;
    const teamSlot = el.closest('.pokemon-slot[data-slot]');
    if (teamSlot) return { type:'team', slot:parseInt(teamSlot.dataset.slot), el:teamSlot };
    const boxSlot = el.closest('.box-slot');
    if (boxSlot) return { type:'box', slot:parseInt(boxSlot.dataset.slot), el:boxSlot };
    const infoSlot = el.closest('.info-slot[data-slot="info"]');
    if (infoSlot) return { type:'info', el:infoSlot };
    const sec = el.closest('#box-section');
    if (sec) return { type:'boxsection', el:sec };
    return null;
  }

  function highlightTarget(tgt) {
    document.querySelectorAll('.drag-over').forEach(x => x.classList.remove('drag-over'));
    document.querySelectorAll('.drag-over-section').forEach(x => x.classList.remove('drag-over-section'));
    if (!tgt || !dragSource) return;
    if (tgt.type === 'team') {
      tgt.el.classList.add('drag-over');
    } else if (tgt.type === 'box') {
      tgt.el.classList.add('drag-over');
    } else if (tgt.type === 'info') {
      tgt.el.classList.add('drag-over');
    } else if (tgt.type === 'boxsection') {
      tgt.el.classList.add('drag-over-section');
    }
  }

  document.addEventListener('touchstart', e => {
    if (e.touches.length !== 1) return;
    const t = e.touches[0];
    const el = document.elementFromPoint(t.clientX, t.clientY);
    if (!el) return;
    const teamSlot = el.closest('.pokemon-slot[data-slot]');
    if (teamSlot) {
      if (!teamSlot.dataset.filled) return;
      touchId = t.identifier; startX = t.clientX; startY = t.clientY; touchDragging = false;
      dragSource = { type:'team', slot:parseInt(teamSlot.dataset.slot) };
      return;
    }
    const boxSlot = el.closest('.box-slot');
    if (boxSlot && boxSlot.dataset.filled) {
      touchId = t.identifier; startX = t.clientX; startY = t.clientY; touchDragging = false;
      dragSource = { type:'box', slot:parseInt(boxSlot.dataset.slot) };
    }
  }, { passive: true });

  document.addEventListener('touchmove', e => {
    if (touchId === null || !dragSource) return;
    const t = [...e.touches].find(t => t.identifier === touchId);
    if (!t) return;
    const dx = t.clientX - startX, dy = t.clientY - startY;
    if (!touchDragging) {
      if (Math.hypot(dx, dy) < THRESHOLD) return;
      touchDragging = true;
      const srcEl = dragSource.type === 'team'
        ? document.querySelector(`.pokemon-slot[data-slot="${dragSource.slot}"]`)
        : document.querySelector(`.box-slot[data-slot="${dragSource.slot}"]`);
      if (srcEl) {
        srcEl.classList.add('dragging');
        const r = srcEl.getBoundingClientRect();
        ghost = srcEl.cloneNode(true);
        ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;opacity:0.78;width:${r.width}px;height:${r.height}px;left:${t.clientX - r.width/2}px;top:${t.clientY - r.height/2}px;border-radius:12px;transform:scale(1.1);box-shadow:0 8px 28px rgba(var(--t-shade),0.45);transition:none`;
        document.body.appendChild(ghost);
      }
    }
    if (touchDragging) {
      e.preventDefault();
      if (ghost) {
        ghost.style.left = (t.clientX - parseFloat(ghost.style.width) / 2) + 'px';
        ghost.style.top  = (t.clientY - parseFloat(ghost.style.height) / 2) + 'px';
      }
      if (ghost) ghost.style.display = 'none';
      const tgt = getDropTarget(t.clientX, t.clientY);
      if (ghost) ghost.style.display = '';
      highlightTarget(tgt);
    }
  }, { passive: false });

  document.addEventListener('touchend', e => {
    if (touchId === null) return;
    const touch = [...e.changedTouches].find(t => t.identifier === touchId);
    if (!touch) return;
    if (!touchDragging) { dragSource = null; touchId = null; return; }
    const x = touch.clientX, y = touch.clientY;
    cleanup();
    if (!dragSource) return;
    const tgt = getDropTarget(x, y);
    if (!tgt) { dragSource = null; return; }
    if (tgt.type === 'team') {
      handleDrop({ type:'team', slot:tgt.slot });
    } else if (tgt.type === 'box') {
      handleDrop({ type:'box', slot:tgt.slot });
    } else if (tgt.type === 'info') {
      const ds = dragSource; dragSource = null;
      const pokemon = ds.type === 'team' ? teamPokemon[ds.slot] : boxPokemon[ds.slot];
      if (!pokemon) return;
      infoGenLocked = false; infoPokemon = activePokemonInfo = pokemon;
      renderInfoSlot(pokemon); renderInfoPanel(); saveState();
    } else if (tgt.type === 'boxsection') {
      const freeSlot = boxPokemon.findIndex(p => !p);
      if (freeSlot !== -1) {
        handleDrop({ type:'box', slot:freeSlot });
        if (!boxOpen) toggleBox();
        setTimeout(() => {
          const slotEl = document.querySelector(`.box-slot[data-slot="${freeSlot}"]`);
          if (slotEl) slotEl.scrollIntoView({ behavior:'smooth', block:'nearest' });
        }, 150);
      } else { dragSource = null; }
    } else { dragSource = null; }
  });

  document.addEventListener('touchcancel', () => {
    cleanup();
    dragSource = null;
  });
}

// ── Discoverable slot actions (mouse, touch and keyboard) ───────────────────
let ctxTarget = null;
let ctxAnchor = null;
const ctxMenu = document.getElementById('ctx-menu');

function showCtxMenu(type, index, x, y, anchor = null) {
  const p = type === 'team' ? teamPokemon[index] : boxPokemon[index];
  if (!p || !ctxMenu) return;
  hideCtxMenu();
  ctxTarget = { type, index };
  ctxAnchor = anchor;
  if (ctxAnchor) ctxAnchor.setAttribute('aria-expanded', 'true');
  ctxMenu.style.display = 'block';
  const width = ctxMenu.offsetWidth;
  const height = ctxMenu.offsetHeight;
  ctxMenu.style.left = `${Math.max(6, Math.min(x, window.innerWidth - width - 6))}px`;
  ctxMenu.style.top = `${Math.max(6, Math.min(y, window.innerHeight - height - 6))}px`;
  ctxMenu.querySelector('button')?.focus({ preventScroll: true });
}

function hideCtxMenu() {
  if (ctxAnchor) ctxAnchor.setAttribute('aria-expanded', 'false');
  if (ctxMenu) ctxMenu.style.display = 'none';
  ctxTarget = null;
  ctxAnchor = null;
}

function focusedList() {
  return focusedTarget.type === 'team' ? teamPokemon : focusedTarget.type === 'box' ? boxPokemon : graveyardPokemon;
}

function openFocusedInInfo() {
  const p = getFocusedPokemon();
  if (!p) return;
  infoGenLocked = false;
  infoPokemon = activePokemonInfo = p;
  renderInfoSlot(p);
  renderInfoPanel();
  document.getElementById('info-section')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// ── Slots init ────────────────────────────────────────────────────────────────
function initSlots() {
  document.querySelectorAll('.pokemon-slot').forEach((slot, i) => {
    slot.addEventListener('click', event => {
      const menuButton = event.target.closest('[data-slot-menu]');
      if (menuButton && teamPokemon[i]) {
        event.stopPropagation();
        const rect = menuButton.getBoundingClientRect();
        showCtxMenu('team', i, rect.right, rect.bottom + 4, menuButton);
        return;
      }
      if (teamPokemon[i]) focusPokemon('team', i);
      else {
        selectedSlot = i; selectedSlotType = 'team';
        openModal(window.t('pick-pokemon', i+1));
      }
    });
    slot.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === slot) { event.preventDefault(); slot.click(); }
    });
    slot.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (teamPokemon[i]) showCtxMenu('team', i, e.clientX, e.clientY, slot);
    });

    slot.setAttribute('draggable', 'true');
    slot.addEventListener('dragstart', e => {
      if (!slot.dataset.filled) { e.preventDefault(); return; }
      dragSource = { type:'team', slot:i };
      slot.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'all';
    });
    slot.addEventListener('dragend', () => {
      slot.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      dragSource = null;
    });
    slot.addEventListener('dragover', e => {
      if (!dragSource) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slot.classList.add('drag-over');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', e => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      handleDrop({ type:'team', slot:i });
    });
  });

  const info = document.querySelector('.info-slot[data-slot="info"]');
  if (info) {
    info.addEventListener('click', () => { selectedSlotType='info'; openModal(window.t('info-slot-empty')); });
    info.addEventListener('contextmenu', e => { e.preventDefault(); infoPokemon=null; activePokemonInfo=null; renderInfoSlot(null); renderInfoPanel(); saveState(); });
    info.addEventListener('dragover', e => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'copy';
      if (dragSource) info.classList.add('drag-over');
    });
    info.addEventListener('dragleave', () => info.classList.remove('drag-over'));
    info.addEventListener('drop', e => {
      e.preventDefault();
      info.classList.remove('drag-over');
      if (!dragSource) return;
      const pokemon = dragSource.type === 'team' ? teamPokemon[dragSource.slot] : boxPokemon[dragSource.slot];
      if (!pokemon) return;
      infoGenLocked = false;
      infoPokemon = activePokemonInfo = pokemon;
      renderInfoSlot(pokemon);
      renderInfoPanel();
      saveState();
    });
  }
}

function initBoxSlots() {
  const container = document.getElementById('box-slots');
  container.innerHTML = '';
  for (let i=0; i<30; i++) {
    const slot = document.createElement('div');
    slot.className = 'box-slot';
    slot.dataset.slot = i;
    slot.setAttribute('role', 'button');
    slot.setAttribute('tabindex', '0');
    slot.addEventListener('click', event => {
      const menuButton = event.target.closest('[data-box-menu]');
      if (menuButton && boxPokemon[i]) {
        event.stopPropagation();
        const rect = menuButton.getBoundingClientRect();
        showCtxMenu('box', i, rect.right, rect.bottom + 4, menuButton);
        return;
      }
      if (boxPokemon[i]) focusPokemon('box', i);
      else {
        selectedSlot = i; selectedSlotType = 'box';
        openModal(`Box – Slot ${i+1}`);
      }
    });
    slot.addEventListener('keydown', event => {
      if ((event.key === 'Enter' || event.key === ' ') && event.target === slot) { event.preventDefault(); slot.click(); }
    });
    slot.addEventListener('contextmenu', e => {
      e.preventDefault();
      if (boxPokemon[i]) showCtxMenu('box', i, e.clientX, e.clientY, slot);
    });
    slot.setAttribute('draggable', 'true');
    slot.addEventListener('dragstart', e => {
      if (!slot.dataset.filled) { e.preventDefault(); return; }
      dragSource = { type:'box', slot:i };
      slot.classList.add('dragging');
      e.dataTransfer.effectAllowed = 'all';
    });
    slot.addEventListener('dragend', () => {
      slot.classList.remove('dragging');
      document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
      dragSource = null;
    });
    slot.addEventListener('dragover', e => {
      if (!dragSource) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      slot.classList.add('drag-over');
    });
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slot.addEventListener('drop', e => {
      e.preventDefault();
      slot.classList.remove('drag-over');
      handleDrop({ type:'box', slot:i });
    });
    container.appendChild(slot);
  }
  updateBoxSlots();
}

// ── Select & remove ───────────────────────────────────────────────────────────
// Zählt jede Auswahl sowie jedes Öffnen/Schließen des Fensters. Kommt eine Antwort erst an, wenn schon etwas
// anderes gewählt oder das Fenster neu geöffnet wurde, wird sie verworfen – sonst landet sie im falschen Platz.
let pickSeq = 0;
async function selectPokemon(pokemon) {
  const seq = ++pickSeq;
  const slot = selectedSlot, type = selectedSlotType;
  try {
    const details = await fetchWithSpecies(pokemon.name);
    if (seq !== pickSeq) return;
    if (type === 'team') {
      teamPokemon[slot] = details;
      focusedTarget = { type: 'team', index: slot };
    } else if (type === 'box') {
      boxPokemon[slot] = details;
      focusedTarget = { type: 'box', index: slot };
    } else if (type === 'info') {
      infoGenLocked = false;
      infoPokemon = activePokemonInfo = details;
      renderInfoSlot(details);
      renderInfoPanel();
    }
    if (type === 'team' || type === 'box') {
      infoGenLocked = false;
      infoPokemon = activePokemonInfo = details;
      renderInfoSlot(details);
      rerenderRun();
      renderInfoPanel();
    }
    saveState();
    closeModal();
  } catch(e) { console.error('Fehler:', e); }
}

function removePokemon(index, type='team') {
  removePokemonAt(type, index);
}

// ── Box section: drag team slot onto header to auto-place ─────────────────────
const boxSection = document.getElementById('box-section');
if (boxSection) {
  boxSection.addEventListener('dragover', e => {
    if (!dragSource || dragSource.type !== 'team') return;
    if (e.target.closest('.box-slot')) return;
    const freeSlot = boxPokemon.findIndex(p => !p);
    if (freeSlot === -1) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    boxSection.classList.add('drag-over-section');
  });
  boxSection.addEventListener('dragleave', e => {
    if (!boxSection.contains(e.relatedTarget)) boxSection.classList.remove('drag-over-section');
  });
  boxSection.addEventListener('drop', e => {
    boxSection.classList.remove('drag-over-section');
    if (!dragSource || dragSource.type !== 'team') return;
    if (e.target.closest('.box-slot')) return;
    e.preventDefault();
    const freeSlot = boxPokemon.findIndex(p => !p);
    if (freeSlot === -1) return;
    handleDrop({ type:'box', slot:freeSlot });
    if (!boxOpen) toggleBox();
    setTimeout(() => {
      const slotEl = document.querySelector(`.box-slot[data-slot="${freeSlot}"]`);
      if (slotEl) slotEl.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }, 150);
  });
}

// ── Event listeners ───────────────────────────────────────────────────────────
// Klicks im Pokémon-Center (center.js): Begleiter → fokussieren, PC → Box
document.addEventListener('solosceneaction', event => {
  const action = event.detail?.action;
  if (action === 'slot') {
    const index = Number(event.detail?.slot);
    if (Number.isInteger(index) && teamPokemon[index]) focusPokemon('team', index);
  } else if (action === 'box') {
    if (!boxOpen) toggleBox();
    const reduced = window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches;
    document.getElementById('box-section')?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }
});

document.getElementById('box-toggle').addEventListener('click', toggleBox);
document.getElementById('routes-toggle')?.addEventListener('click', () => toggleRoutes());
document.getElementById('graveyard-toggle')?.addEventListener('click', () => toggleGraveyard());
document.getElementById('journey-open')?.addEventListener('click', () => {
  const next = routeRows().find(row => !rowDone(row));
  openJourneyRoutes(next?.route || '');
});
document.getElementById('journey-party')?.addEventListener('click', event => {
  const teamButton = event.target.closest('[data-journey-team]');
  if (teamButton) {
    focusPokemon('team', Number(teamButton.dataset.journeyTeam));
    return;
  }
  if (event.target.closest('[data-journey-add]')) {
    const index = teamPokemon.findIndex(item => !item);
    if (index < 0) return;
    selectedSlot = index;
    selectedSlotType = 'team';
    openModal(window.t('pick-pokemon', index + 1));
  }
});
document.getElementById('journey-waypoints')?.addEventListener('click', event => {
  const route = event.target.closest('[data-journey-route]')?.dataset.journeyRoute;
  if (route != null) openJourneyRoutes(route);
  else if (event.target.closest('[data-journey-open]')) openJourneyRoutes();
});
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('pokemon-modal').addEventListener('click', e => { if(e.target===e.currentTarget) closeModal(); });

document.getElementById('routes-game-select')?.addEventListener('change', event => {
  soloGame = cleanGame(event.target.value);
  routeMarks = {};
  if (soloGame) window.PokeHubGame?.set?.(soloGame);
  else window.PokeHubGame?.clear?.();
  renderRoutes();
  saveState();
});
document.querySelectorAll('[data-route-filter]').forEach(button => button.addEventListener('click', () => {
  routeFilter = button.dataset.routeFilter;
  renderRoutes();
}));
document.getElementById('routes-list')?.addEventListener('click', event => {
  const button = event.target.closest('[data-route-action]');
  const row = button ? routeRowsShown[Number(button.dataset.row)] : null;
  if (!button || !row) return;
  if (button.dataset.routeAction === 'assign') openCatchPicker(row.route);
  else if (button.dataset.routeAction === 'change') openRoutePicker(row.catches[0]?.mon);
  else if (button.dataset.routeAction === 'missed') {
    fixRouteGame();
    if (routeMarks[row.route]) delete routeMarks[row.route]; else routeMarks[row.route] = true;
    renderRoutes();
    saveState();
  }
});

document.getElementById('graveyard-slots')?.addEventListener('click', event => {
  const slot = event.target.closest('[data-grave-index]');
  if (slot) focusPokemon('grave', Number(slot.dataset.graveIndex));
});

document.getElementById('team-focus')?.addEventListener('click', event => {
  const button = event.target.closest('[data-focus-action]');
  if (!button) return;
  const action = button.dataset.focusAction;
  const p = getFocusedPokemon();
  if (action === 'add') {
    const index = teamPokemon.findIndex(item => !item);
    if (index < 0) { alert(window.t('storage-full')); return; }
    selectedSlot = index; selectedSlotType = 'team'; openModal(window.t('pick-pokemon', index + 1));
  } else if (action === 'info') openFocusedInInfo();
  else if (action === 'replace' && p && focusedTarget.type !== 'grave') {
    selectedSlot = focusedTarget.index; selectedSlotType = focusedTarget.type;
    openModal(focusedTarget.type === 'team' ? window.t('pick-pokemon', focusedTarget.index + 1) : `Box – Slot ${focusedTarget.index + 1}`);
  } else if (action === 'route') openRoutePicker(p);
  else if (action === 'move-box') movePokemon('team', focusedTarget.index, 'box');
  else if (action === 'move-team') movePokemon('box', focusedTarget.index, 'team');
  else if (action === 'kill') killPokemon(focusedTarget.type, focusedTarget.index);
  else if (action === 'restore') restoreGrave(focusedTarget.index);
  else if (action === 'remove-grave' && confirm(window.t('grave-confirm'))) removePokemonAt('grave', focusedTarget.index);
});

document.getElementById('ctx-info')?.addEventListener('click', () => {
  const target = ctxTarget;
  hideCtxMenu();
  if (target) { focusPokemon(target.type, target.index); openFocusedInInfo(); }
});
document.getElementById('ctx-route')?.addEventListener('click', () => {
  const target = ctxTarget;
  const p = target ? (target.type === 'team' ? teamPokemon[target.index] : boxPokemon[target.index]) : null;
  hideCtxMenu();
  openRoutePicker(p);
});
document.getElementById('ctx-kill')?.addEventListener('click', () => {
  const target = ctxTarget;
  hideCtxMenu();
  if (target) killPokemon(target.type, target.index);
});
document.getElementById('ctx-remove')?.addEventListener('click', () => {
  const target = ctxTarget;
  hideCtxMenu();
  if (target) removePokemonAt(target.type, target.index);
});

document.addEventListener('click', event => { if (ctxMenu?.style.display === 'block' && !ctxMenu.contains(event.target)) hideCtxMenu(); });
document.addEventListener('keydown', event => { if (event.key === 'Escape') hideCtxMenu(); });

document.getElementById('route-dialog-close')?.addEventListener('click', closeRouteDialog);
document.getElementById('route-dialog-search')?.addEventListener('input', renderRouteDialog);
document.getElementById('route-dialog-list')?.addEventListener('click', event => {
  const button = event.target.closest('[data-dialog-choice]');
  if (button) commitRouteDialogChoice(Number(button.dataset.dialogChoice));
});
document.getElementById('route-dialog-footer')?.addEventListener('click', event => {
  const action = event.target.closest('[data-dialog-action]')?.dataset.dialogAction;
  if (!action || !routeDialogState) return;
  if (action === 'clear' && routeDialogState.mode === 'route') delete routeDialogState.mon.route;
  else if (action === 'missed' && routeDialogState.mode === 'catch') {
    const route = routeDialogState.route;
    fixRouteGame();
    if (routeMarks[route]) delete routeMarks[route]; else routeMarks[route] = true;
  }
  closeRouteDialog();
  rerenderRun();
  saveState();
});
document.getElementById('route-dialog')?.addEventListener('click', event => { if (event.target === event.currentTarget) closeRouteDialog(); });
document.getElementById('route-dialog')?.addEventListener('close', () => { routeDialogState = null; });
function adoptHubGame(value) {
  const next = cleanGame(value);
  if (next === soloGame) return false;
  soloGame = next;
  routeMarks = {};
  renderRoutes();
  if (stateHydrating) pendingHubGameSave = true;
  else saveState();
  return true;
}

document.addEventListener('hubgamechange', event => {
  adoptHubGame(event.detail?.game ?? window.PokeHubGame?.get?.());
});

const searchInput = document.getElementById('pokemon-search');
if (searchInput) searchInput.addEventListener('input', e => renderPokemonList(e.target.value));

const genSelect = document.getElementById('generation-select');
if (genSelect) genSelect.addEventListener('change', async e => { await loadPokemonList(Number(e.target.value)||1); renderPokemonList(searchInput?.value||''); });

const infoGenSelect = document.getElementById('info-generation-select');
if (infoGenSelect) infoGenSelect.addEventListener('change', e => { infoGenLocked = true; infoGeneration=Number(e.target.value)||1; renderInfoPanel(); });

document.addEventListener('click', () => { _tipPinned = false; _getTip().style.display = 'none'; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { _tipPinned = false; _getTip().style.display = 'none'; } });

// ── Language change ───────────────────────────────────────────────────────────
document.addEventListener('langchange', async () => {
  const active = [
    ...teamPokemon, ...boxPokemon, ...graveyardPokemon,
    ...(activePokemonInfo ? [activePokemonInfo] : []),
  ].filter(Boolean);

  await Promise.allSettled(active.map(async p => {
    try {
      const speciesName = p.baseName || p.speciesName || p.name;
      const species = await getPokemonSpecies(speciesName);
      p.germanName = species.germanName;
    } catch {}
  }));

  [...pokemonList, ...allPokemonList].forEach(p => { p.displayName = listName(p.id, p.name); });

  teamPokemon.forEach((p, i) => renderTeamSlot(i, p));
  updateBoxSlots();

  renderInfoSlot(infoPokemon);
  renderGraveyard();
  renderRoutes();
  renderFocusPanel();
  if (routeDialogState) renderRouteDialog();
  renderTeamWeaknessPanel();
  renderInfoPanel();
  window.PokemonTypes.fillGenSelect(document.getElementById('type-gen-select'));

  const infoSlot = document.querySelector('.info-slot[data-slot="info"]');
  if (infoSlot && !infoSlot.dataset.filled) infoSlot.textContent = window.t('info-slot-empty');
});

// ── Generation der Typen ──────────────────────────────────────────────────────
function refreshTypes(gen) {
  typeGen = gen;
  teamPokemon.forEach((p, i) => renderTeamSlot(i, p));
  if (boxOpen) updateBoxSlots();
  renderTeamWeaknessPanel();
  if (activePokemonInfo) renderInfoPanel();
}

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  window.PokemonTypes.fillGenSelect(document.getElementById('type-gen-select'), refreshTypes);
  window.PokemonTypes.onGenChange(document.getElementById('type-gen-select'), g => { if (g !== typeGen) refreshTypes(g); });
  initSlots();
  initBoxSlots();
  initTouchDrag();
  const gameChangedByHub = await loadSavedState();
  ensureFocus();
  const focused = getFocusedPokemon();
  if (focused) infoPokemon = activePokemonInfo = focused;
  rerenderRun();
  stateHydrating = false;
  if (gameChangedByHub || pendingHubGameSave) {
    pendingHubGameSave = false;
    saveState();
  }
  await loadAllPokemonBasic();
  await loadPokemonList(currentGeneration);
  renderInfoSlot(infoPokemon);
  renderInfoPanel();
  rerenderRun();
  setTimeout(retryPlaceholders, 15000);   // z. B. nach einem kurzen API-Fehler beim Start
}

init();
