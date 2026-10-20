import { getPokemon, getGenerationList, getPokemonSpecies, getMoveData, getEvolutionChain, getAbilityData } from "./pokeapi.js";

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

// ── Type chart ────────────────────────────────────────────────────────────────
const ALL_TYPES = ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const TYPE_CHART = {
  normal:   { rock:0.5, ghost:0, steel:0.5 },
  fire:     { grass:2, ice:2, bug:2, steel:2, fire:0.5, rock:0.5, water:0.5, dragon:0.5 },
  water:    { fire:2, ground:2, rock:2, water:0.5, grass:0.5, dragon:0.5 },
  electric: { water:2, flying:2, electric:0.5, grass:0.5, dragon:0.5, ground:0 },
  grass:    { water:2, ground:2, rock:2, fire:0.5, grass:0.5, poison:0.5, flying:0.5, bug:0.5, dragon:0.5, steel:0.5 },
  ice:      { grass:2, ground:2, flying:2, dragon:2, fire:0.5, water:0.5, ice:0.5, steel:0.5 },
  fighting: { normal:2, ice:2, rock:2, dark:2, steel:2, poison:0.5, flying:0.5, psychic:0.5, bug:0.5, fairy:0.5, ghost:0 },
  poison:   { grass:2, fairy:2, poison:0.5, ground:0.5, rock:0.5, ghost:0.5, steel:0 },
  ground:   { fire:2, electric:2, poison:2, rock:2, steel:2, grass:0.5, bug:0.5, flying:0 },
  flying:   { grass:2, fighting:2, bug:2, electric:0.5, rock:0.5, steel:0.5 },
  psychic:  { fighting:2, poison:2, psychic:0.5, steel:0.5, dark:0 },
  bug:      { grass:2, psychic:2, dark:2, fire:0.5, fighting:0.5, poison:0.5, flying:0.5, ghost:0.5, steel:0.5, fairy:0.5 },
  rock:     { fire:2, ice:2, flying:2, bug:2, fighting:0.5, ground:0.5, steel:0.5 },
  ghost:    { psychic:2, ghost:2, dark:0.5, normal:0 },
  dragon:   { dragon:2, steel:0.5, fairy:0 },
  dark:     { psychic:2, ghost:2, fighting:0.5, dark:0.5, fairy:0.5 },
  steel:    { ice:2, rock:2, fairy:2, fire:0.5, water:0.5, electric:0.5, steel:0.5 },
  fairy:    { fighting:2, dragon:2, dark:2, fire:0.5, poison:0.5, steel:0.5 },
};

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
  return `<div class="tt-title">${data.name}</div>${data.description ? `<div class="tt-desc">${data.description}</div>` : ''}`;
}
function buildMoveTooltip(data) {
  const typeClass = data.type ? `type-bg-${data.type}` : '';
  const typeLabel = data.type ? (window.typeLabel(data.type) || data.type) : '';
  const catLabel  = data.damageClass ? window.t(DAMAGE_CLASS_KEY[data.damageClass] || data.damageClass) : '';
  const power = data.power ?? '–';
  const acc   = data.accuracy != null ? data.accuracy + '%' : '–';
  const pp    = data.pp ?? '–';
  return `<div class="tt-title">${data.name}</div>
<div class="tt-meta">${typeLabel ? `<span class="tt-type ${typeClass}">${typeLabel}</span>` : ''}${catLabel ? `<span class="tt-cat">${catLabel}</span>` : ''}</div>
<div class="tt-stats"><span>${window.t('power')}: ${power}</span><span>${window.t('accuracy')}: ${acc}</span><span>${window.t('pp')}: ${pp}</span></div>
${data.description ? `<div class="tt-desc">${data.description}</div>` : ''}`;
}

// ── State ─────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'pokemon-team-builder-state';
let pokemonList = [], allPokemonList = [];
let currentGeneration = 1, infoGeneration = 1;
let selectedSlot = null, selectedSlotType = 'team';
let activePokemonInfo = null, infoPokemon = null;
let teamPokemon = new Array(6).fill(null);
let boxPokemon  = new Array(30).fill(null);
let infoGenLocked = false;
let renderGeneration = 0;

let dragSource = null; // { type: 'team'|'box', slot: number }
let boxOpen    = false;

// ── Helpers ───────────────────────────────────────────────────────────────────
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
function formatLabel(t) { return t.split('-').map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' '); }
function getDisplayName(name) { return allPokemonList.find(p => p.name===name)?.displayName || capitalize(name); }
function getTypeEffectiveness(atk, defs) {
  const chart = TYPE_CHART[atk] || {};
  let m = 1;
  for (const d of defs) m *= chart[d] !== undefined ? chart[d] : 1;
  return m;
}

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

function findFirstGenWithMoves(pokemon) {
  const moves = Array.isArray(pokemon.moves) ? pokemon.moves : [];
  for (let g = 1; g <= 9; g++) {
    const vg = getGenerationVersionGroups(g);
    if (moves.some(m => (m.version_group_details||[]).some(d => vg.includes(d.version_group?.name)))) return g;
  }
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
  if (details) {
    slot.dataset.filled = 'true';
    const name = details.germanName || capitalize(details.name);
    applySlotTypeStyle(slot, details.types || [], 1.0);
    slot.innerHTML = `<div style="text-align:center" draggable="false"><img src="${details.sprite}" alt="${name}" style="width:60px;height:60px" draggable="false"><div style="font-size:13px" draggable="false">${name}</div></div>`;
  } else {
    slot.removeAttribute('data-filled');
    slot.style.background = '';
    slot.style.removeProperty('--type-c1');
    slot.style.removeProperty('--type-c2');
    delete slot.dataset.typed;
    slot.innerHTML = '';
  }
}

function renderInfoSlot(details) {
  const slot = document.querySelector('.info-slot[data-slot="info"]');
  if (!slot) return;
  if (details) {
    slot.dataset.filled = 'true';
    const name = details.germanName || capitalize(details.name);
    slot.innerHTML = `<div style="text-align:center"><img src="${details.sprite}" alt="${name}" style="width:60px;height:60px"><div style="font-size:13px">${name}</div></div>`;
  } else {
    slot.removeAttribute('data-filled');
    slot.innerHTML = window.t('info-slot-empty');
  }
}

function updateBoxSlots() {
  document.querySelectorAll('.box-slot').forEach((slot, i) => {
    const p = boxPokemon[i];
    if (p) {
      const name = p.germanName || capitalize(p.name);
      applySlotTypeStyle(slot, p.types || [], 1.0);
      slot.innerHTML = `<img src="${p.sprite}" alt="${name}" style="width:40px;height:40px;image-rendering:pixelated"><div style="font-size:0.65rem;text-align:center;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:56px;margin-top:2px">${name}</div>`;
      slot.dataset.filled = 'true';
    } else {
      slot.style.background = '';
      slot.style.removeProperty('--type-c1');
      slot.style.removeProperty('--type-c2');
      delete slot.dataset.typed;
      slot.innerHTML = '';
      delete slot.dataset.filled;
    }
  });
}

// ── Coverage recommendations ──────────────────────────────────────────────────
function renderCoverageSection(allActive) {
  if (!allActive.length) return null;

  const weakCount = {};
  ALL_TYPES.forEach(atk => {
    weakCount[atk] = allActive.filter(p => getTypeEffectiveness(atk, p.types||[]) >= 2).length;
  });

  const recs = ALL_TYPES.map(defType => {
    let score = 0;
    const covers = [];
    ALL_TYPES.forEach(atk => {
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
  titleEl.innerHTML = `🛡️ ${window.t('recommendations')}`;
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
function renderTeamWeaknessPanel() {
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
    const name = p.germanName || capitalize(p.name);
    c.innerHTML = `<img src="${p.sprite}" alt="${name}" width="36" height="36"><div title="${name}">${name}</div>`;
    header.appendChild(c);
  });
  table.appendChild(header);

  ALL_TYPES.forEach(atk => {
    const row = document.createElement('div');
    row.className = 'weakness-row';
    const lbl = document.createElement('div');
    lbl.className = `weakness-type-label type-bg-${atk}`;
    lbl.textContent = window.typeLabel(atk);
    row.appendChild(lbl);
    active.forEach(p => {
      const mult = getTypeEffectiveness(atk, Array.isArray(p.types)?p.types:[]);
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
  ALL_TYPES.forEach(atk => {
    let w = 0, im = 0;
    active.forEach(p => {
      const m = getTypeEffectiveness(atk, Array.isArray(p.types)?p.types:[]);
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
  const header = document.createElement('div');
  header.className = 'info-row';
  header.innerHTML = `<div style="font-size:1.05rem;font-weight:700">${activePokemonInfo.germanName||formatLabel(activePokemonInfo.name)}</div><div style="opacity:.75">#${activePokemonInfo.id}</div>`;
  const types = document.createElement('div');
  types.className = 'info-types';
  (Array.isArray(activePokemonInfo.types)?activePokemonInfo.types:[]).forEach(t => {
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
  Object.entries(activePokemonInfo.stats||{}).forEach(([k,v]) => {
    const m = statMeta[k]||{ label:formatLabel(k), css:'' };
    const s = Object.assign(document.createElement('div'), { className:`info-stat ${m.css}`.trim() });
    s.innerHTML = `<strong>${m.label}</strong><br>${v}`;
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
    tag.style.cssText = `padding:3px 10px;border-radius:20px;font-size:0.82rem;background:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.15);${a.isHidden?'opacity:0.6;font-style:italic':''}`;
    tag.textContent = abilityDataArr[i]?.name || formatLabel(a.name);
    if (a.isHidden) tag.title = window.t('hidden-ability');
    const aData = abilityDataArr[i];
    if (aData) attachTooltip(tag, () => buildAbilityTooltip(aData));
    abilitiesList.appendChild(tag);
  });

  // Auto-select first gen with moves if not locked
  if (!infoGenLocked) {
    const firstGen = findFirstGenWithMoves(activePokemonInfo);
    if (firstGen !== infoGeneration) {
      infoGeneration = firstGen;
      const sel = document.getElementById('info-generation-select');
      if (sel) sel.value = String(firstGen);
    }
  }

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
              arr.innerHTML = `<div class="evo-arrow-icon">→</div>${itemSprite ? `<img src="${itemSprite}" alt="${itemName}" width="24" height="24" style="image-rendering:pixelated;margin-top:2px">` : ''}${cond?`<div class="evo-condition">${cond}</div>`:''}`;
              row.appendChild(arr);
            }
            const isActive = stage.name === activePokemonInfo.name || stage.name === activePokemonInfo.baseName;
            const el = document.createElement('div');
            el.className = 'evo-stage' + (isActive ? ' evo-stage-active' : ' evo-stage-clickable');
            const stageName = stageGermanNames[stage.name] || getDisplayName(stage.name);
            el.innerHTML = `<img src="${stage.sprite}" alt="${stageName}" width="48" height="48"><div class="evo-name">${stageName}</div>`;
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
      const imgHtml = sprite ? `<img src="${sprite}" alt="${displayName}" width="48" height="48">` : '';
      formEl.innerHTML = `${imgHtml}<div class="evo-name">${displayName}</div>`;
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
      if (typeColor) el.style.background = `linear-gradient(to right, ${typeColor} 0%, rgba(255,255,255,0.04) 60%)`;
      el.innerHTML = `<strong>${m.name}</strong> <span class="learn-method-tag ${m.methodClass}" style="font-size:.9rem;opacity:.9">${m.learnInfo}</span>`;
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

// ── Save / Load ───────────────────────────────────────────────────────────────
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    generation: currentGeneration,
    team: teamPokemon.map(p => p?.name||null),
    box:  boxPokemon.map(p => p?.name||null),
  }));
  const s = document.getElementById('save-status');
  if (s) { s.textContent=window.t('saved'); setTimeout(()=>s.textContent='', 2000); }
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

async function loadSavedState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
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
        if (state.team[i]) { const d=await fetchWithSpecies(state.team[i]); teamPokemon[i]=d; renderTeamSlot(i,d); }
      }
    }
    if (Array.isArray(state.box)) {
      for (let i=0; i<30; i++) {
        if (state.box[i]) boxPokemon[i] = await fetchWithSpecies(state.box[i]);
      }
    }
  } catch(e) { console.error('Fehler beim Laden:', e); }
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
      return { id, name:p.name, displayName:capitalize(p.name), sprite:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` };
    }).filter(Boolean);
  });
  allPokemonList.forEach(p => getPokemonSpecies(p.name).then(s=>{ if(s.germanName) p.displayName=s.germanName; }).catch(()=>{}));
}

async function loadPokemonList(gen=1) {
  currentGeneration = gen;
  const list = await getGenerationList(gen);
  pokemonList = list.map(p => {
    const m = p.url.match(/\/pokemon\/(\d+)\//);
    const id = m?Number(m[1]):null;
    return { id, name:p.name, displayName:capitalize(p.name), sprite:`https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` };
  }).filter(p=>p.id);
  await Promise.allSettled(list.map(async p => {
    try {
      const s = await getPokemonSpecies(p.name);
      const loc = pokemonList.find(x=>x.name===p.name);
      if (loc) loc.displayName = s.germanName||loc.displayName;
      const glob = allPokemonList.find(x=>x.name===p.name);
      if (glob) glob.displayName = s.germanName||glob.displayName;
    } catch {}
  }));
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
    li.innerHTML = `<img src="${p.sprite}" alt="${p.displayName}"/><div>${p.displayName}</div>`;
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
}

function closeModal() {
  document.getElementById('pokemon-modal').style.display = 'none';
}

// ── Box toggle ────────────────────────────────────────────────────────────────
function toggleBox() {
  boxOpen = !boxOpen;
  const body = document.getElementById('box-body');
  const icon = document.getElementById('box-toggle-icon');
  if (body) body.style.display = boxOpen ? 'block' : 'none';
  if (icon) icon.textContent = boxOpen ? '▲' : '▼';
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

  set(src.type,    src.slot,    tgtVal || null);
  set(target.type, target.slot, srcVal);

  if (src.type    === 'team') renderTeamSlot(src.slot,    tgtVal || null);
  if (target.type === 'team') renderTeamSlot(target.slot, srcVal);

  updateBoxSlots();
  renderTeamWeaknessPanel();
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
        ghost.style.cssText = `position:fixed;pointer-events:none;z-index:9999;opacity:0.78;width:${r.width}px;height:${r.height}px;left:${t.clientX - r.width/2}px;top:${t.clientY - r.height/2}px;border-radius:12px;transform:scale(1.1);box-shadow:0 8px 28px rgba(0,0,0,0.45);transition:none`;
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

// ── Slots init ────────────────────────────────────────────────────────────────
function initSlots() {
  document.querySelectorAll('.pokemon-slot').forEach((slot, i) => {
    slot.addEventListener('click', () => {
      selectedSlot = i; selectedSlotType = 'team';
      openModal(window.t('pick-pokemon', i+1));
    });
    slot.addEventListener('contextmenu', e => { e.preventDefault(); removePokemon(i, 'team'); });

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
    slot.addEventListener('click', () => {
      selectedSlot = i; selectedSlotType = 'box';
      openModal(`Box – Slot ${i+1}`);
    });
    slot.addEventListener('contextmenu', e => {
      e.preventDefault();
      boxPokemon[i] = null;
      updateBoxSlots();
      saveState();
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
async function selectPokemon(pokemon) {
  try {
    const details = await fetchWithSpecies(pokemon.name);
    if (selectedSlotType === 'team') {
      teamPokemon[selectedSlot] = details;
      renderTeamSlot(selectedSlot, details);
      renderTeamWeaknessPanel();
    } else if (selectedSlotType === 'box') {
      boxPokemon[selectedSlot] = details;
      updateBoxSlots();
    } else if (selectedSlotType === 'info') {
      infoGenLocked = false;
      infoPokemon = activePokemonInfo = details;
      renderInfoSlot(details);
      renderInfoPanel();
    }
    saveState();
    closeModal();
  } catch(e) { console.error('Fehler:', e); }
}

function removePokemon(index, type='team') {
  if (type === 'team') {
    teamPokemon[index] = null;
    renderTeamSlot(index, null);
    renderTeamWeaknessPanel();
  } else {
    boxPokemon[index] = null;
    updateBoxSlots();
  }
  saveState();
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
document.getElementById('box-toggle').addEventListener('click', toggleBox);
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('pokemon-modal').addEventListener('click', e => { if(e.target===e.currentTarget) closeModal(); });

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
    ...teamPokemon, ...boxPokemon,
    ...(activePokemonInfo ? [activePokemonInfo] : []),
  ].filter(Boolean);

  await Promise.allSettled(active.map(async p => {
    try {
      const speciesName = p.baseName || p.speciesName || p.name;
      const species = await getPokemonSpecies(speciesName);
      p.germanName = species.germanName;
    } catch {}
  }));

  await Promise.allSettled(pokemonList.map(async p => {
    try {
      const s = await getPokemonSpecies(p.name);
      p.displayName = s.germanName || p.displayName;
      const glob = allPokemonList.find(x => x.name === p.name);
      if (glob) glob.displayName = p.displayName;
    } catch {}
  }));

  teamPokemon.forEach((p, i) => renderTeamSlot(i, p));
  if (boxOpen) updateBoxSlots();

  renderInfoSlot(infoPokemon);
  renderTeamWeaknessPanel();
  renderInfoPanel();

  const infoSlot = document.querySelector('.info-slot[data-slot="info"]');
  if (infoSlot && !infoSlot.dataset.filled) infoSlot.textContent = window.t('info-slot-empty');
});

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  initSlots();
  initBoxSlots();
  initTouchDrag();
  await loadSavedState();
  await loadAllPokemonBasic();
  await loadPokemonList(currentGeneration);
  renderInfoSlot(infoPokemon);
  renderInfoPanel();
  renderTeamWeaknessPanel();
}

init();
