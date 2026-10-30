import { getPokemon, getGenerationList, getPokemonSpecies, getMoveData, getEvolutionChain, getAbilityData, placeholderPokemon } from "../Pokelocke/pokeapi.js";
import { cleanSharedState, cleanGrave, mergeSharedState, isPokemonName, cleanRoute, cleanRouteMarks, cleanGame, cleanWild } from "./shared-state.js";

const SUPABASE_URL = 'https://lvyjqtpgeaoxaecduqxq.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx2eWpxdHBnZWFveGFlY2R1cXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk1NzYxMTgsImV4cCI6MjA5NTE1MjExOH0.KAPsEDAFZ2RC5p028wk2XC4Z2CifmoKm08jy_BjmgPM';
const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

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

// ── Typen der gewählten Generation („Typen wie in“, ../pokemon-types.js) ─────────
// Typentabelle und alte Typen (z. B. Togekiss vor Gen 6 Normal/Flug) wie im Schadens-Rechner
let typeGen = window.PokemonTypes.getGen();
const typesOf = p => window.PokemonTypes.typesInGen(p, typeGen);
const genTypes = () => window.PokemonTypes.typeList(typeGen);

// ── Tooltip ──────────────────────────────────────────────────────────────────
const DAMAGE_CLASS_KEY = { physical: 'physical', special: 'special-class', status: 'status-class' };
let _tipTimer = null, _tipPinned = false;

function _getTip() {
  let t = document.getElementById('poke-tooltip');
  if (!t) {
    t = document.createElement('div');
    t.id = 'poke-tooltip';
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

// Ketten-Symbol für verknüpfte Paare (statt Emoji, Farbe aus der Schrift)
const CHAIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';

// ── State ────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'pokemon-duo-nuzlocke-state';
let pokemonList = [], allPokemonList = [];
let currentGeneration = 1, infoGeneration = 1;
let selectedSlot = null, selectedPlayer = 1, selectedSlotType = 'team';
const teams  = [new Array(6).fill(null), new Array(6).fill(null)];
const boxes  = [new Array(30).fill(null), new Array(30).fill(null)];
const graves = [[], []];
let activePokemonInfo = null, infoPokemon = null;
let infoGenLocked = false;
let renderGeneration = 0;

// ── Link state ───────────────────────────────────────────────────────────────
const linkedTeamSlots = new Set(); // slot indices where both players are linked
const linkedBoxSlots  = new Set();
let isLinkingMode   = false;
let linkPendingSlot = null; // { slot, type, triggerPlayer }

// ── Drag state ───────────────────────────────────────────────────────────────
let dragSource = null; // { type:'team'|'box', player:1|2, slot:number }
let boxOpen    = false;

// ── Routen (Fangorte) ────────────────────────────────────────────────────────
// Der Fangort steht am Pokémon (route) und wandert mit ihm durch Team, Box und Friedhof. Verpasste Routen
// stehen extra; das Spiel des Duo-Runs bestimmt die Routenliste. Alles drei wird mit dem Partner geteilt.
let duoGame = '';                 // Schlüssel wie im Run-Dashboard, '' = noch nicht festgelegt
const routeMarks = {};            // { Ort: 1 = Spieler 1 verpasst, 2 = Spieler 2, 3 = beide }
let routesOpen = false, routeFilter = 'all';
// Wilde Pokémon je Spieler aus seinem Randomizer-Spiel (jeder würfelt sein eigenes): { name, r: { Ort: [Arten] } }.
// Das eigene kommt aus dem Randomizer-Stand dieses Geräts (rando-state.js) und geht über die Session zum Partner.
const wildShared = { 1: null, 2: null };
let showWild = (() => { try { return localStorage.getItem('duo-routes-wild') !== '0'; } catch (e) { return true; } })();

// ── Session state ────────────────────────────────────────────────────────────
let sessionMySlot = null;  // 1 or 2 in session, null = local mode (nur Anzeige/Presence)
let syncSessionId  = null;
let syncChannel    = null;
let syncActive     = false;
const MY_CLIENT_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);
// Abgleich mit der Datenbank: syncBase = zuletzt bekannter Stand dort (geprüft), syncDirty = eigene Änderung
// noch nicht geschrieben, syncFresh = false, solange der Stand veraltet sein kann (Hintergrund, Verbindung weg)
// – dann wird erst neu geladen und zusammengeführt, bevor geschrieben wird.
let syncBase = null, syncRev = null, syncDirty = false, syncFresh = false, syncPushing = false, syncChangeNo = 0;
let syncCode = null, syncJoined = false;   // Code der Session; Mitgliedschaft in dieser Sitzung bestätigt

// In Session-Modus dürfen BEIDE Spieler ALLES bearbeiten (geteilter Spielstand)
function sessionCanEdit(_playerIndex) { return true; }

function toDisplayPokemon(p) {
  if (!p) return null;
  const out = {
    id: p.id,
    name: p.name,
    sprite: p.sprite,
    germanName: p.germanName || p.name,
    types: Array.isArray(p.types) ? p.types : []
  };
  if (p.route) out.route = p.route;
  return out;
}

// Geteilter Spielstand: alles in einem Objekt
function getSharedState() {
  return {
    lastWriter: MY_CLIENT_ID,
    team1: teams[0].map(toDisplayPokemon),
    team2: teams[1].map(toDisplayPokemon),
    box1: boxes[0].map(toDisplayPokemon),
    box2: boxes[1].map(toDisplayPokemon),
    linkedTeam: [...linkedTeamSlots],
    linkedBox: [...linkedBoxSlots],
    graves1: graves[0],
    graves2: graves[1],
    game: duoGame,
    routeMarks: { ...routeMarks },
    wild1: wildShared[1],
    wild2: wildShared[2],
  };
}

// Stand aus der Datenbank übernehmen – nur geprüfte Felder (cleanSharedState), danach auch lokal sichern,
// damit nach einem Neustart ohne Netz der zuletzt bekannte gemeinsame Stand da ist
function applySharedState(raw) {
  const state = cleanSharedState(raw);
  if (!state) return;

  // Teams
  if (Array.isArray(state.team1)) {
    for (let i = 0; i < 6; i++) {
      const item = state.team1[i] || null;
      teams[0][i] = item;
      renderTeamSlot(1, i, item);
    }
  }
  if (Array.isArray(state.team2)) {
    for (let i = 0; i < 6; i++) {
      const item = state.team2[i] || null;
      teams[1][i] = item;
      renderTeamSlot(2, i, item);
    }
  }

  // Boxen
  if (Array.isArray(state.box1)) {
    for (let i = 0; i < 30; i++) boxes[0][i] = state.box1[i] || null;
  }
  if (Array.isArray(state.box2)) {
    for (let i = 0; i < 30; i++) boxes[1][i] = state.box2[i] || null;
  }
  updateBoxSlots();

  // Verlinkte Slots
  linkedTeamSlots.clear();
  if (Array.isArray(state.linkedTeam)) state.linkedTeam.forEach(i => linkedTeamSlots.add(i));
  linkedBoxSlots.clear();
  if (Array.isArray(state.linkedBox)) state.linkedBox.forEach(i => linkedBoxSlots.add(i));

  // Friedhof
  if (Array.isArray(state.graves1)) { graves[0].length = 0; state.graves1.forEach(p => graves[0].push(p)); }
  if (Array.isArray(state.graves2)) { graves[1].length = 0; state.graves2.forEach(p => graves[1].push(p)); }
  renderGraveyard();

  // Routen (ältere Stände ohne diese Felder lassen sie, wie sie sind)
  if (typeof state.game === 'string') duoGame = state.game;
  if (state.routeMarks) replaceRouteMarks(state.routeMarks);
  if ('wild1' in state) wildShared[1] = state.wild1;
  if ('wild2' in state) wildShared[2] = state.wild2;
  renderRoutes();

  updateLinkHighlights();
  renderTeamWeaknessPanel();
  saveLocal();
}

// ── Helpers ──────────────────────────────────────────────────────────────────
// Texte und Adressen, die in HTML landen (Namen kommen auch aus der Datenbank und aus Backups)
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
// Name in den Auswahllisten – aus pokemon-names.js (sofort da, auch offline; vorher eine Anfrage je Pokémon)
function listName(id, name) { return window.pokemonName(id, name) || capitalize(name); }
function formatLabel(t) { return t.split('-').map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' '); }
function getDisplayName(name) { return allPokemonList.find(p => p.name===name)?.displayName || capitalize(name); }
function getTypeEffectiveness(atk, defs) { return window.PokemonTypes.effectiveness(atk, defs, typeGen); }

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

// Welche Generation hat den jeweiligen Ort eingeführt
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
  else if (trigger==='spin')                parts.push(window.t('spin'));
  else if (trigger==='take-damage')         parts.push(window.t('damage'));
  else if (trigger==='three-critical-hits') parts.push(window.t('three-crits'));
  else if (trigger==='other')              parts.push(window.t('special-evo'));
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
      // Gen 8+: Stein hat den Ort ersetzt → nur Item zeigen
      result = [...itemEntries, ...otherEntries];
    } else {
      // Gen < 8 (oder kein Item): passendsten Ort für die Gen wählen
      const withGen = locationEntries.map(d => ({
        d,
        g: locationGen[d.location?.name] ?? 4,
      }));
      // Nur Orte, die in dieser Gen schon existieren
      const valid = withGen.filter(x => x.g <= gen);
      // Falls kein passender: alle nehmen; sonst den neuesten nehmen
      const best = valid.length
        ? valid.reduce((a, b) => b.g > a.g ? b : a).d
        : locationEntries[0];
      result = [best, ...otherEntries];
      // Wenn kein Ort aus der Gen existiert aber items da sind → items als Fallback
      if (!valid.length && itemEntries.length) result = [...itemEntries, ...otherEntries];
    }
  } else {
    // Keine ortsbasierten Einträge → einfach deduplizieren
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

// ── Link highlighting ─────────────────────────────────────────────────────────
function updateLinkHighlights() {
  // remove both classes in one pass so hover-highlight can never linger
  document.querySelectorAll('.pokemon-slot').forEach(s => s.classList.remove('slot-linked', 'slot-link-hover'));
  linkedTeamSlots.forEach(i => {
    document.querySelectorAll(`.pokemon-slot[data-slot="${i}"]`).forEach(s => s.classList.add('slot-linked'));
  });
}

document.addEventListener('mouseover', e => {
  const slot = e.target.closest('.pokemon-slot.slot-linked');
  if (!slot) return;
  document.querySelectorAll(`.pokemon-slot[data-slot="${slot.dataset.slot}"]`)
    .forEach(s => s.classList.add('slot-link-hover'));
});
document.addEventListener('mouseout', e => {
  const slot = e.target.closest('.pokemon-slot.slot-linked');
  if (!slot) return;
  document.querySelectorAll('.slot-link-hover').forEach(s => s.classList.remove('slot-link-hover'));
});

// ── Rendering ─────────────────────────────────────────────────────────────────
function renderTeamSlot(player, index, details) {
  const slot = document.querySelector(`#team-builder-${player} .pokemon-slot[data-slot="${index}"]`);
  if (!slot) return;
  if (details) {
    slot.dataset.filled = 'true';
    const route = details.route ? `<div class="slot-route" draggable="false">${esc(routeLabel(details.route))}</div>` : '';
    slot.innerHTML = `<div style="text-align:center;min-width:0;max-width:100%" draggable="false"><img src="${esc(details.sprite)}" alt="" style="width:55px;height:55px" draggable="false"><div style="font-size:12px" draggable="false">${esc(details.germanName||capitalize(details.name))}</div>${route}</div>`;
    slot.title = details.route ? window.t('route-caught', routeLabel(details.route)) : '';
  } else {
    slot.removeAttribute('data-filled');
    slot.innerHTML = '';
    slot.title = '';
  }
}

function renderInfoSlot(details) {
  const slot = document.querySelector('.info-slot[data-slot="info"]');
  if (!slot) return;
  if (details) {
    slot.dataset.filled = 'true';
    slot.innerHTML = `<div style="text-align:center"><img src="${esc(details.sprite)}" alt="" style="width:60px;height:60px"><div style="font-size:13px">${esc(details.germanName||capitalize(details.name))}</div></div>`;
  } else {
    slot.removeAttribute('data-filled');
    slot.innerHTML = window.t('info-slot-empty');
  }
}

function updateBoxSlots() {
  document.querySelectorAll('.box-slot').forEach((slot, i) => {
    const p1 = boxes[0][i], p2 = boxes[1][i];
    const isLinked = !!(p1 && p2);
    const makeHalf = (p, cls) => {
      if (p) {
        const name = esc(p.germanName || capitalize(p.name));
        const title = p.route ? ` title="${esc(window.t('route-caught', routeLabel(p.route)))}"` : '';
        return `<div class="box-slot-half ${cls} filled" draggable="true"${title}><img src="${esc(p.sprite)}" alt="" width="30" height="30"><div class="box-slot-name">${name}</div></div>`;
      }
      return `<div class="box-slot-half ${cls}"><span class="box-slot-empty">+</span></div>`;
    };
    slot.innerHTML = makeHalf(p1, 'p1-half') + makeHalf(p2, 'p2-half')
      + (isLinked ? '<span class="box-chain-icon">' + CHAIN_ICON + '</span>' : '');
  });
}

// ── Type analysis ─────────────────────────────────────────────────────────────
function renderTeamWeaknessPanel() {
  const container = document.getElementById('team-weakness-panel');
  if (!container) return;
  const a1 = teams[0].filter(Boolean), a2 = teams[1].filter(Boolean);
  if (!a1.length && !a2.length) {
    container.innerHTML = `<p class="weakness-empty">${window.t('weakness-empty')}</p>`;
    return;
  }

  const CELL = 64, GAP = 3;
  const gw = n => n > 0 ? n * CELL + (n-1) * GAP : 0;

  container.innerHTML = '';
  const table = document.createElement('div');
  table.className = 'weakness-table';

  // Player label row
  const labelRow = document.createElement('div');
  labelRow.className = 'weakness-row';
  labelRow.appendChild(Object.assign(document.createElement('div'), { className:'weakness-type-label' }));
  if (a1.length) {
    const el = Object.assign(document.createElement('div'), { className:'weakness-player-label p1-label', textContent:window.t('player1') });
    el.style.width = gw(a1.length)+'px';
    labelRow.appendChild(el);
  }
  if (a1.length && a2.length) labelRow.appendChild(Object.assign(document.createElement('div'), { className:'weakness-divider-label' }));
  if (a2.length) {
    const el = Object.assign(document.createElement('div'), { className:'weakness-player-label p2-label', textContent:window.t('player2') });
    el.style.width = gw(a2.length)+'px';
    labelRow.appendChild(el);
  }
  table.appendChild(labelRow);

  // Sprite header row
  const header = document.createElement('div');
  header.className = 'weakness-row weakness-header';
  header.appendChild(Object.assign(document.createElement('div'), { className:'weakness-type-label' }));
  const addPokeHeader = (p, cls) => {
    const c = document.createElement('div');
    c.className = `weakness-pokemon-header ${cls}`;
    const name = esc(p.germanName || capitalize(p.name));
    c.innerHTML = `<img src="${esc(p.sprite)}" alt="${name}" width="36" height="36"><div title="${name}">${name}</div>`;
    header.appendChild(c);
  };
  a1.forEach(p => addPokeHeader(p, 'p1-col'));
  if (a1.length && a2.length) header.appendChild(Object.assign(document.createElement('div'), { className:'weakness-divider' }));
  a2.forEach(p => addPokeHeader(p, 'p2-col'));
  table.appendChild(header);

  // Type rows
  genTypes().forEach(atk => {
    const row = document.createElement('div');
    row.className = 'weakness-row';
    const lbl = document.createElement('div');
    lbl.className = `weakness-type-label type-bg-${atk}`;
    lbl.textContent = window.typeLabel(atk);
    row.appendChild(lbl);
    const addCell = p => {
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
    };
    a1.forEach(addCell);
    if (a1.length && a2.length) row.appendChild(Object.assign(document.createElement('div'), { className:'weakness-divider' }));
    a2.forEach(addCell);
    table.appendChild(row);
  });

  // Per-player summary
  const buildBlock = (active, cls, label) => {
    const block = document.createElement('div');
    block.className = 'weakness-summary-player';
    block.appendChild(Object.assign(document.createElement('div'), { className:`weakness-summary-title ${cls}`, textContent:label }));
    const weaknesses = [], immunities = [];
    genTypes().forEach(atk => {
      let w=0, im=0;
      active.forEach(p => {
        const m = getTypeEffectiveness(atk, typesOf(p));
        if (m>=2) w++; else if (m===0) im++;
      });
      if (w)  weaknesses.push({ type:atk, count:w });
      if (im) immunities.push({ type:atk, count:im });
    });
    weaknesses.sort((a,b)=>b.count-a.count);
    immunities.sort((a,b)=>b.count-a.count);
    const problemTypes = new Set(findTeamProblems(active).map(p => p.type));
    const addRows = (list, countCls) => list.forEach(({ type, count }) => {
      const row = document.createElement('div');
      row.className = 'weakness-summary-row' + (!countCls && problemTypes.has(type) ? ' is-problem' : '');
      row.appendChild(Object.assign(document.createElement('span'), { className:`weakness-type-label type-bg-${type}`, textContent:window.typeLabel(type) }));
      row.appendChild(Object.assign(document.createElement('span'), { className:`weakness-summary-count ${countCls}`, textContent:`${count}×` }));
      block.appendChild(row);
    });
    if (weaknesses.length) {
      block.appendChild(Object.assign(document.createElement('div'), { className:'weakness-summary-subtitle', textContent:window.t('weaknesses') }));
      addRows(weaknesses, '');
    }
    if (immunities.length) {
      block.appendChild(Object.assign(document.createElement('div'), { className:'weakness-summary-subtitle', textContent:window.t('immunities') }));
      addRows(immunities, 'weakness-summary-immune');
    }
    if (!weaknesses.length && !immunities.length)
      block.appendChild(Object.assign(document.createElement('div'), { style:'color:var(--color-muted);font-size:.8rem', textContent:'–' }));
    return block;
  };

  const summary = document.createElement('div');
  summary.className = 'weakness-summary';
  if (a1.length) summary.appendChild(buildBlock(a1, 'p1', window.t('player1')));
  if (a2.length) summary.appendChild(buildBlock(a2, 'p2', window.t('player2')));

  // Warnungen nur bei echten Problemen – oben, damit man sie sieht
  const alerts = renderTeamAlerts(a1, a2);
  if (alerts) container.appendChild(alerts);

  const wrapper = document.createElement('div');
  wrapper.className = 'weakness-wrapper';
  const scroll = document.createElement('div');
  scroll.className = 'weakness-table-scroll';
  scroll.appendChild(table);
  wrapper.appendChild(scroll);
  wrapper.appendChild(summary);
  container.appendChild(wrapper);
}

// ── Team-Warnungen ────────────────────────────────────────────────────────────
// Eine Schwäche ist erst ein Problem, wenn viele im Team sie teilen (ab 3, bei kleinen Teams ab 2)
// und weniger Pokémon dagegenhalten (widerstehen oder immun sind) als schwach sind.
function findTeamProblems(active) {
  const need = active.length <= 3 ? 2 : 3;
  const problems = [];
  genTypes().forEach(atk => {
    let weak = 0, weak4 = 0, safe = 0;
    active.forEach(p => {
      const m = getTypeEffectiveness(atk, typesOf(p));
      if (m >= 2) { weak++; if (m >= 4) weak4++; }
      else if (m < 1) safe++;
    });
    if (weak >= need && weak > safe) problems.push({ type: atk, weak, weak4, total: active.length });
  });
  return problems.sort((a, b) => b.weak - a.weak || b.weak4 - a.weak4);
}

// Bis zu 3 Typen, die das Problem abfangen. Bevorzugt: immun, deckt weitere Probleme ab, ist selbst nicht anfällig dafür.
function helpersFor(problem, problems) {
  const types = genTypes();
  return types.map(def => {
    const m = getTypeEffectiveness(problem.type, [def]);
    if (m >= 1) return null;
    let score = m === 0 ? 3 : 2;
    const covers = [problem.type];
    problems.forEach(other => {
      if (other === problem) return;
      const mo = getTypeEffectiveness(other.type, [def]);
      if (mo < 1) { score += 2; covers.push(other.type); }
      else if (mo >= 2) score -= 2;
    });
    return { type: def, score, covers };
  }).filter(Boolean)
    .sort((a, b) => b.score - a.score || types.indexOf(a.type) - types.indexOf(b.type))
    .slice(0, 3);
}

function renderTeamAlerts(a1, a2) {
  const box = document.createElement('div');
  box.className = 'team-alerts';
  [[a1, 'p1'], [a2, 'p2']].forEach(([active, cls]) => {
    if (!active.length) return;
    const problems = findTeamProblems(active);
    problems.forEach(problem => {
      const row = document.createElement('div');
      row.className = `team-alert ${cls}`;
      const helpers = helpersFor(problem, problems);
      const player = cls === 'p1' ? window.t('player1') : window.t('player2');
      row.innerHTML = `
        <span class="team-alert-icon" aria-hidden="true">!</span>
        <span class="team-alert-player ${cls}">${player}</span>
        <span class="team-alert-text">${window.t('alert-weak', problem.weak, problem.total)}
          <span class="team-alert-type type-bg-${problem.type}">${window.typeLabel(problem.type)}</span>${problem.weak4 ? `<span class="team-alert-x4">${window.t('alert-x4', problem.weak4)}</span>` : ''}</span>
        ${helpers.length ? `<span class="team-alert-help"><span class="team-alert-help-label">${window.t('alert-help')}</span>${helpers.map(h =>
          `<span class="team-alert-helper type-bg-${h.type}" title="${window.t('alert-covers', h.covers.map(window.typeLabel).join(', '))}">${window.typeLabel(h.type)}</span>`).join('')}</span>` : ''}`;
      box.appendChild(row);
    });
  });
  return box.childElementCount ? box : null;
}

// ── Info panel ────────────────────────────────────────────────────────────────
async function renderInfoPanel() {
  const myGen = ++renderGeneration;
  const infoContent = document.getElementById('info-content');
  if (!infoContent) return;
  if (!activePokemonInfo) {
    infoContent.innerHTML = '';
    const ph = Object.assign(document.createElement('div'), { id:'info-placeholder', className:'info-row', textContent:window.t('info-placeholder') });
    infoContent.appendChild(ph);
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
  const statMeta = { hp:{label:window.t('stat-hp'),css:'stat-hp'}, attack:{label:window.t('stat-attack'),css:'stat-attack'}, defense:{label:window.t('stat-defense'),css:'stat-defense'}, specialAttack:{label:window.t('stat-sp-atk'),css:'stat-sp-atk'}, specialDefense:{label:window.t('stat-sp-def'),css:'stat-sp-def'}, speed:{label:window.t('stat-speed'),css:'stat-speed'} };
  Object.entries(window.PokemonTypes.statsInGen(activePokemonInfo, infoGeneration)).forEach(([k,v]) => {
    const m = statMeta[k]||{ label:formatLabel(k), css:'' };
    const s = Object.assign(document.createElement('div'), { className:`info-stat ${m.css}`.trim() });
    s.innerHTML = `<strong>${esc(m.label)}</strong><br>${esc(v)}`;
    statsGrid.appendChild(s);
  });

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
            activePokemonInfo = details;
            renderInfoPanel();
          } catch(e) { console.error(e); }
        });
      }
      formsList.appendChild(formEl);
    });
  }

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

// ── Sync ──────────────────────────────────────────────────────────────────────
// Status als Übersetzungs-Schlüssel merken, damit er beim Sprachwechsel mitwechselt
let syncStatus = { key: 'sync-idle', type: 'idle', args: [] };
function syncUpdateStatus(key, type = 'idle', ...args) {
  syncStatus = { key, type, args };
  renderSyncStatus();
}
function renderSyncStatus() {
  const el = document.getElementById('sync-status');
  if (el) { el.textContent = window.t(syncStatus.key, ...syncStatus.args); el.className = `sync-status sync-status-${syncStatus.type}`; }
}

function syncUpdateCount(connected, total) {
  const el = document.getElementById('sync-player-count');
  const panel = document.getElementById('session-panel');
  if (!el) return;
  const isFull = connected > 0 && connected >= total;
  panel?.classList.toggle('session-panel--full', isFull);
  if (!connected || !total) {
    el.textContent = '';
    el.className = 'sync-player-count sync-player-count-hidden';
  } else {
    el.textContent = `${connected}/${total}`;
    el.className = `sync-player-count sync-player-count-${isFull ? 'full' : 'partial'}`;
  }
}

// Wer gerade online ist, kommt aus Realtime-Presence: jedes offene Fenster meldet seinen Platz an.
// Verlässt ein Spieler die Session oder schließt die Seite/App, sieht der andere das sofort.
// Wer zur Session gehört und welchen Platz hat, regelt die Datenbank (duo_members, siehe supabase/duo-setup.sql).
function syncRenderPresence() {
  if (!syncChannel || !sessionMySlot) return;
  const online = new Set([sessionMySlot]);
  for (const metas of Object.values(syncChannel.presenceState())) {
    for (const m of metas) if (m.slot === 1 || m.slot === 2) online.add(m.slot);
  }
  const other = sessionMySlot === 1 ? 2 : 1;
  if (online.has(other)) syncUpdateStatus('sync-both', 'connected');
  else syncUpdateStatus('sync-waiting', 'waiting', sessionMySlot, other);
  syncUpdateCount(online.size, 2);
}

function syncSubscribe() {
  if (syncChannel) { sb.removeChannel(syncChannel); syncChannel = null; }
  const channel = sb.channel('duo-sync-' + syncSessionId, { config: { presence: { key: MY_CLIENT_ID } } });
  syncChannel = channel
    // Nur Änderungen dieser Session; die Datenbank schickt sie ohnehin nur an Mitglieder
    .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'duo_sessions', filter: 'id=eq.' + syncSessionId }, payload => {
      const row = payload.new;
      if (!syncActive || !row || row.id !== syncSessionId) return;
      if (row.state?.lastWriter === MY_CLIENT_ID) return;      // eigenes Echo ignorieren
      if (syncRev != null && row.rev <= syncRev) return;       // schon bekannt
      receiveSharedState(row.state, row.rev);
    })
    .on('presence', { event: 'sync' }, syncRenderPresence)
    // Wird nach jedem (Wieder-)Verbinden aufgerufen, z. B. wenn das Handy aus dem Hintergrund zurückkommt
    .subscribe(status => {
      if (syncChannel !== channel) return;
      if (status === 'SUBSCRIBED') {
        syncRenderPresence();
        channel.track({ slot: sessionMySlot }).catch(e => console.error('Presence-Fehler:', e));
        syncRefresh();   // Änderungen aus der Zeit ohne Verbindung nachladen
      } else {
        syncFresh = false;   // Verbindung weg: erst neu laden, bevor wieder geschrieben wird
      }
    });
}

function showSessionUI(code) {
  document.getElementById('sync-code-display').textContent = code || '';
  document.getElementById('sync-code-box').style.display   = 'flex';
  document.getElementById('sync-create-btn').style.display = 'none';
  document.getElementById('sync-join-area').style.display  = 'none';
  document.getElementById('sync-leave-btn').style.display  = 'inline-flex';
}
function showIdleUI() {
  document.getElementById('sync-code-box').style.display   = 'none';
  document.getElementById('sync-create-btn').style.display = 'inline-flex';
  document.getElementById('sync-join-area').style.display  = 'flex';
  document.getElementById('sync-leave-btn').style.display  = 'none';
  syncUpdateCount(0, 2);
}

// Verbindung lokal beenden (ohne Datenbank)
function syncStop() {
  syncActive = false;
  sessionMySlot = null;
  syncSessionId = null;
  syncCode = null;
  syncJoined = false;
  syncBase = null; syncRev = null; syncFresh = false;
  setSyncDirty(false);
  clearTimeout(_syncTimer); clearTimeout(_syncRetry);
  if (syncChannel) { sb.removeChannel(syncChannel); syncChannel = null; }
}

// Session ist nicht mehr erreichbar (gelöscht oder Platz vergeben): lokal trennen, Code zum erneuten Beitreten eintragen
function syncLost(key) {
  const code = syncCode;
  syncStop();
  setSyncBase(null, null);
  localStorage.removeItem('sync-session');
  showIdleUI();
  const input = document.getElementById('sync-code-input');
  if (input && code) input.value = code;
  syncUpdateStatus(key, 'error');
}

// Jedes Gerät meldet sich unsichtbar anonym bei Supabase an – nur Mitglieder einer Session dürfen sie lesen
// und ändern. Ohne Netz wird nicht neu angemeldet, sonst entstünde eine zweite Kennung für dasselbe Gerät.
async function ensureAuth() {
  const { data, error } = await sb.auth.getSession();
  if (data?.session) return;
  if (error) throw error;
  const r = await sb.auth.signInAnonymously();
  if (r.error) throw r.error;
}

const rpcError = (error, code) => new RegExp(code).test(error?.message || '');

// Beigetreten: Stand übernehmen, Echtzeit abonnieren, Verbindung merken
function syncEnter(data) {
  const changed = data.id !== syncSessionId;
  syncSessionId = data.id;
  syncCode = data.code;
  sessionMySlot = data.slot;
  syncJoined = true;
  syncActive = true;
  localStorage.setItem('sync-session', JSON.stringify({ id: data.id, slot: data.slot, code: data.code }));
  showSessionUI(data.code);
  receiveSharedState(data.state, data.rev);
  syncFresh = true;
  if (changed || !syncChannel) syncSubscribe();
  syncRenderPresence();
  syncMyWild();
  if (syncDirty) syncPush();
}

async function syncCreate() {
  syncUpdateStatus('sync-creating', 'loading');
  try {
    await ensureAuth();
    // Code und Platz 1 vergibt der Server
    const state = getSharedState();
    const { data, error } = await sb.rpc('duo_create_session', { p_state: state });
    if (error) throw error;
    syncStop();
    syncDirty = false;
    syncEnter({ ...data, state });
  } catch(e) {
    console.error(e);
    syncUpdateStatus('sync-create-error', 'error');
  }
}

async function syncJoin(code) {
  if (!code) return;
  syncUpdateStatus('sync-connecting', 'loading');
  try {
    await ensureAuth();
    // Beide Plätze belegt? Ein Platz, dessen Gerät seit 2 Minuten still ist, darf übernommen werden
    // (z. B. nach Browserwechsel) – das entscheidet der Server.
    const { data, error } = await sb.rpc('duo_join_session', { p_code: code, p_slot: null, p_takeover: true });
    if (error) throw error;
    if (!data) { syncUpdateStatus('sync-not-found', 'error'); return; }
    if (data.full) { syncUpdateStatus('sync-full', 'error'); return; }
    syncStop();
    syncEnter(data);   // eigener Stand wird durch den gemeinsamen ersetzt (wie bisher)
  } catch(e) {
    console.error(e);
    syncUpdateStatus(rpcError(e, 'too_many_attempts') ? 'sync-too-many' : 'sync-connect-error', 'error');
  }
}

async function syncLeave() {
  const mySession = syncSessionId;
  if (syncDirty && syncFresh) await syncPush();   // ausstehende Änderung noch schreiben
  syncStop();
  setSyncBase(null, null);
  if (mySession) {
    // Nur die eigene Mitgliedschaft endet – der Spielstand bleibt, Beitritt mit Code bleibt möglich
    const { error } = await sb.rpc('duo_leave_session', { p_session: mySession });
    if (error) console.error('Verlassen:', error);
  }
  localStorage.removeItem('sync-session');
  showIdleUI();
  syncUpdateStatus('sync-idle', 'idle');
}

async function syncRestore() {
  const raw = localStorage.getItem('sync-session');
  if (!raw) return;
  let saved = null;
  try { saved = JSON.parse(raw); } catch {}
  if (!saved || typeof saved.code !== 'string' || (saved.slot !== 1 && saved.slot !== 2)) { localStorage.removeItem('sync-session'); return; }
  // Erst lokal wieder „verbunden“ – Änderungen ohne Netz werden später zusammengeführt
  syncSessionId = saved.id;
  syncCode = saved.code;
  sessionMySlot = saved.slot;
  ({ state: syncBase, rev: syncRev } = loadSyncBase(saved.id));
  // Beim letzten Mal nicht mehr hochgeladene Änderung? Dann wird beim Verbinden zusammengeführt
  syncDirty = localStorage.getItem(SYNC_DIRTY_KEY) === String(saved.id) && !!syncBase;
  syncFresh = false;
  syncActive = true;
  showSessionUI(saved.code);
  await syncConnect();
}

// Mitgliedschaft bestätigen und Stand laden. Über den Code, damit auch Sessions aus der alten Datenbank
// übernommen werden. Ohne Netz (oder wenn Supabase nicht erreichbar ist) bleibt alles gespeichert und wird
// nachgeholt, sobald es geht – nur wenn Supabase sagt, dass es die Session nicht mehr gibt, wird getrennt.
let syncConnecting = null;
function syncConnect() {
  if (!syncActive) return Promise.resolve();
  if (syncConnecting) return syncConnecting;
  syncConnecting = (async () => {
    try { await ensureAuth(); }
    catch (e) { console.error('Sync:', e); syncUpdateStatus('sync-offline', 'error'); syncRetryLater(); return; }
    const { data, error } = await sb.rpc('duo_join_session', { p_code: syncCode, p_slot: sessionMySlot, p_takeover: false });
    if (!syncActive) return;
    if (error) {
      console.error('Sync:', error);
      if (rpcError(error, 'too_many_attempts')) { syncLost('sync-too-many'); return; }
      syncUpdateStatus('sync-offline', 'error');
      syncRetryLater();
      return;
    }
    if (!data) { syncLost('sync-not-found'); return; }
    if (data.full) { syncLost('sync-lost'); return; }
    syncEnter(data);
  })().finally(() => { syncConnecting = null; });
  return syncConnecting;
}

// Lebenszeichen, solange die App sichtbar ist – ein Gerät, das länger still ist, kann abgelöst werden
let _syncTouch = null;
function syncHeartbeat() {
  clearInterval(_syncTouch);
  _syncTouch = setInterval(async () => {
    if (!syncActive || !syncJoined || document.visibilityState !== 'visible') return;
    const { data, error } = await sb.rpc('duo_touch', { p_session: syncSessionId });
    if (!error && data === false) syncConnect();   // nicht mehr Mitglied → neu beitreten (ohne jemanden abzulösen)
  }, 45000);
}

function initSyncUI() {
  document.getElementById('sync-create-btn')?.addEventListener('click', syncCreate);
  document.getElementById('sync-leave-btn')?.addEventListener('click', syncLeave);
  document.getElementById('sync-join-btn')?.addEventListener('click', () => {
    const code = document.getElementById('sync-code-input')?.value?.trim();
    if (code) syncJoin(code);
  });
  document.getElementById('sync-code-input')?.addEventListener('keydown', e => {
    if (e.key === 'Enter') { const code = e.target.value.trim(); if (code) syncJoin(code); }
  });
  document.getElementById('sync-copy-btn')?.addEventListener('click', () => {
    const code = document.getElementById('sync-code-display')?.textContent;
    if (code) navigator.clipboard.writeText(code).then(() => {
      const btn = document.getElementById('sync-copy-btn');
      btn.textContent = '✓';
      setTimeout(() => btn.textContent = 'Copy', 1500);
    });
  });
  // Aus dem Hintergrund zurück bzw. wieder online: erst den aktuellen Stand holen
  document.addEventListener('visibilitychange', () => {
    if (!syncActive) return;
    if (document.visibilityState === 'hidden') {
      if (syncDirty && syncFresh) syncPush();   // nicht im 400-ms-Timer liegen lassen
      syncFresh = false;
    } else {
      syncRefresh();
    }
  });
  window.addEventListener('online', () => { if (syncActive) syncRefresh(); });
  syncHeartbeat();
}

// ── Abgleich mit der Datenbank ────────────────────────────────────────────────
// Letzter bekannter Stand in der Datenbank samt Versionsnummer – auch lokal gemerkt, damit nach einem Start
// ohne Netz eigene Änderungen mit denen des Partners zusammengeführt werden statt sie zu überschreiben.
const SYNC_BASE_KEY = 'duo-sync-base';
function setSyncBase(state, rev) {
  syncBase = state;
  syncRev = rev ?? null;
  try {
    if (state && syncSessionId != null) localStorage.setItem(SYNC_BASE_KEY, JSON.stringify({ session: syncSessionId, state, rev: syncRev }));
    else localStorage.removeItem(SYNC_BASE_KEY);
  } catch (e) { console.error('Speichern fehlgeschlagen:', e); }
}
function loadSyncBase(sessionId) {
  try {
    const saved = JSON.parse(localStorage.getItem(SYNC_BASE_KEY) || 'null');
    if (saved && saved.session === sessionId) return { state: cleanSharedState(saved.state), rev: Number.isFinite(saved.rev) ? saved.rev : null };
  } catch {}
  return { state: null, rev: null };
}

// Stand aus der Datenbank: übernehmen – oder, wenn hier noch eine eigene Änderung aussteht, zusammenführen
function receiveSharedState(raw, rev) {
  const server = cleanSharedState(raw);
  if (!server) return;
  if (syncDirty) {
    applySharedState(mergeSharedState(syncBase, cleanSharedState(getSharedState()), server));
    syncChangeNo++;   // der zusammengeführte Stand muss noch geschrieben werden
    queuePush();
  } else {
    applySharedState(server);
  }
  setSyncBase(server, rev);
  syncMyWild();   // eigenes Spiel bleibt das von diesem Gerät
}

let syncRefreshing = null, _syncRetry = null;
function syncRetryLater() { clearTimeout(_syncRetry); _syncRetry = setTimeout(syncRefresh, 10000); }

function syncRefresh() {
  if (!syncActive || syncSessionId == null) return Promise.resolve();
  if (!syncJoined) return syncConnect();
  if (syncRefreshing) return syncRefreshing;
  clearTimeout(_syncRetry);
  const sessionId = syncSessionId;
  syncRefreshing = (async () => {
    const { data, error } = await sb.from('duo_sessions').select('state, rev').eq('id', sessionId).maybeSingle();
    if (sessionId !== syncSessionId) return;
    if (error) { console.error('Sync-Fehler:', error); syncRetryLater(); return; }
    // Nichts zu sehen = nicht mehr Mitglied (z. B. Platz von einem anderen Gerät übernommen) → neu beitreten
    if (!data) { syncJoined = false; return syncConnect(); }
    if (syncRev == null || data.rev !== syncRev || !syncBase) receiveSharedState(data.state, data.rev);
    syncFresh = true;
    if (syncDirty) syncPush();
  })().finally(() => { syncRefreshing = null; });
  return syncRefreshing;
}

let _syncTimer = null;
function queuePush(delay = 400) {
  clearTimeout(_syncTimer);
  _syncTimer = setTimeout(syncPush, delay);
}

// Speichern nur, wenn die Versionsnummer noch stimmt. Hat inzwischen jemand anderes gespeichert, kommt dessen
// Stand zurück – dann zusammenführen und erneut speichern.
async function syncPush() {
  clearTimeout(_syncTimer); _syncTimer = null;
  if (!syncActive || syncSessionId == null || !syncDirty || syncPushing) return;
  if (!syncFresh || !syncJoined) { syncRefresh(); return; }   // erst aktuellen Stand holen; danach wird geschrieben
  syncPushing = true;
  const sessionId = syncSessionId, changeNo = syncChangeNo, state = getSharedState();
  const { data, error } = await sb.rpc('duo_save_state', { p_session: sessionId, p_state: state, p_rev: syncRev ?? 0 });
  syncPushing = false;
  if (sessionId !== syncSessionId) return;
  if (error) {
    console.error('Sync-Fehler:', error);
    syncFresh = false;
    if (rpcError(error, 'not_member')) { syncJoined = false; syncConnect(); }
    else syncRetryLater();   // später: neu laden, zusammenführen, schreiben
    return;
  }
  if (data?.ok) {
    setSyncBase(cleanSharedState(state), data.rev);
    if (changeNo === syncChangeNo) setSyncDirty(false);
    else queuePush(0);   // während des Schreibens kam noch etwas dazu
  } else if (data) {
    receiveSharedState(data.state, data.rev);   // Konflikt → zusammenführen, danach erneut speichern
  }
}

function onAfterSave() {
  if (!syncActive || syncSessionId == null) return;
  setSyncDirty(true);
  syncChangeNo++;
  queuePush();
}

// Ausstehende Änderung auch dauerhaft merken: Wird die App beendet oder neu geladen, bevor sie in der Datenbank
// ist, wird sie beim nächsten Start mit dem Stand des Partners zusammengeführt statt überschrieben.
const SYNC_DIRTY_KEY = 'duo-sync-dirty';
function setSyncDirty(on) {
  syncDirty = on;
  try {
    if (on) localStorage.setItem(SYNC_DIRTY_KEY, String(syncSessionId)); else localStorage.removeItem(SYNC_DIRTY_KEY);
  } catch (e) { /* ohne Merker: Änderung gilt dann nur bis zum Neuladen als ausstehend */ }
}
// Ausstehende Änderung oder Schreiben läuft: pwa.js lädt eine neue Version dann noch nicht
window.PokeHubBusy = () => syncDirty || syncPushing;

// ── Save / Load ───────────────────────────────────────────────────────────────
// Nur auf diesem Gerät; true = geklappt (false z. B. bei vollem Speicher)
function saveLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
      generation: currentGeneration,
      team1: teams[0].map(p=>p?.name||null),
      team2: teams[1].map(p=>p?.name||null),
      box1:  boxes[0].map(p=>p?.name||null),
      box2:  boxes[1].map(p=>p?.name||null),
      linkedTeam: [...linkedTeamSlots],
      linkedBox:  [...linkedBoxSlots],
      graves1: graves[0],
      graves2: graves[1],
      // Team und Box stehen oben nur als Namen – ihre Fangorte daneben (gleicher Platz)
      routes: {
        team1: teams[0].map(p => p?.route || null), team2: teams[1].map(p => p?.route || null),
        box1: boxes[0].map(p => p?.route || null), box2: boxes[1].map(p => p?.route || null),
      },
      game: duoGame,
      routeMarks,
      wild: wildShared,
    }));
    return true;
  } catch (e) {
    console.error('Speichern fehlgeschlagen:', e);
    return false;
  }
}

function saveState() {
  const ok = saveLocal();
  onAfterSave();
  renderRoutes();
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
  if (!isPokemonName(name)) return null;
  try { return await fetchWithSpecies(name); }
  catch (e) { console.warn('Nicht geladen, Platzhalter:', name, e); return placeholderPokemon(name); }
}

async function retryPlaceholders() {
  let changed = false;
  for (const list of [teams[0], teams[1], boxes[0], boxes[1]]) {
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      if (!p?.placeholder) continue;
      let d;
      try { d = await fetchWithSpecies(p.name); } catch { return; }   // noch offline – beim nächsten Mal
      if (p.route) d.route = p.route;
      if (list[i] === p) { list[i] = d; changed = true; }
    }
  }
  if (!changed) return;
  for (let pl = 1; pl <= 2; pl++) teams[pl-1].forEach((p, i) => renderTeamSlot(pl, i, p));
  updateBoxSlots();
  renderTeamWeaknessPanel();
}
window.addEventListener('online', retryPlaceholders);

async function loadSavedState() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return;
  try {
    const state = JSON.parse(raw);
    if (state.generation) {
      currentGeneration = Number(state.generation)||1;
      const gs = document.getElementById('generation-select');
      if (gs) gs.value = String(currentGeneration);
      const igs = document.getElementById('info-generation-select');
      if (igs) igs.value = String(currentGeneration);
    }
    const routes = state.routes && typeof state.routes === 'object' ? state.routes : {};
    const withRoute = (d, list, i) => {
      const r = Array.isArray(list) ? cleanRoute(list[i]) : null;
      if (d && r) d.route = r;
      return d;
    };
    for (let pl=1; pl<=2; pl++) {
      const saved = state[`team${pl}`];
      if (Array.isArray(saved)) {
        for (let i=0; i<6; i++) {
          if (saved[i]) { const d=withRoute(await loadSaved(saved[i]), routes[`team${pl}`], i); teams[pl-1][i]=d; renderTeamSlot(pl,i,d); }
        }
      }
      const savedBox = state[`box${pl}`];
      if (Array.isArray(savedBox)) {
        for (let i=0; i<30; i++) {
          if (savedBox[i]) boxes[pl-1][i] = withRoute(await loadSaved(savedBox[i]), routes[`box${pl}`], i);
        }
      }
    }
    duoGame = cleanGame(state.game);
    replaceRouteMarks(state.routeMarks);
    if (state.wild && typeof state.wild === 'object') { wildShared[1] = cleanWild(state.wild[1]); wildShared[2] = cleanWild(state.wild[2]); }
    const inRange = n => i => Number.isInteger(i) && i >= 0 && i < n;
    if (Array.isArray(state.linkedTeam)) state.linkedTeam.filter(inRange(6)).forEach(i => linkedTeamSlots.add(i));
    if (Array.isArray(state.linkedBox))  state.linkedBox.filter(inRange(30)).forEach(i => linkedBoxSlots.add(i));
    if (Array.isArray(state.graves1)) state.graves1.map(cleanGrave).filter(Boolean).forEach(p => graves[0].push(p));
    if (Array.isArray(state.graves2)) state.graves2.map(cleanGrave).filter(Boolean).forEach(p => graves[1].push(p));
    renderGraveyard();
    updateLinkHighlights();
    renderRoutes();
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
function openModal(title=null, isLinking=false) {
  const t = document.getElementById('modal-title');
  if (t) t.textContent = title ?? window.t('modal-title');
  const skip = document.getElementById('modal-skip-link');
  if (skip) skip.style.display = isLinking ? 'inline-flex' : 'none';

  const prog = document.getElementById('link-progress');
  if (prog) {
    if (isLinking && linkPendingSlot?.details) {
      const { details: d, triggerPlayer, slot } = linkPendingSlot;
      const name = esc(d.germanName || capitalize(d.name));
      const other = 3 - triggerPlayer;
      prog.innerHTML = `
        <div class="link-prog-step">
          <img src="${esc(d.sprite)}" alt="${name}" style="width:44px;height:44px;image-rendering:pixelated">
          <div>
            <div class="link-prog-label">${window.t('link-label', triggerPlayer, slot+1)}</div>
            <strong>${name}</strong>
          </div>
          <span class="link-prog-check">✓</span>
        </div>
        <span class="link-prog-arrow">${CHAIN_ICON}</span>
        <div class="link-prog-step link-prog-pending">
          <div class="link-prog-empty">?</div>
          <div>
            <div class="link-prog-label">${window.t('link-label', other, slot+1)}</div>
            <span style="color:var(--color-muted)">${window.t('pending')}</span>
          </div>
        </div>`;
      prog.style.display = 'flex';
    } else {
      prog.style.display = 'none';
    }
  }

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
  const prog = document.getElementById('link-progress');
  if (prog) prog.style.display = 'none';
  if (isLinkingMode) {
    // Cancel: break any pending link slot so stale links don't persist
    if (linkPendingSlot) {
      if (linkPendingSlot.type === 'team') linkedTeamSlots.delete(linkPendingSlot.slot);
      else linkedBoxSlots.delete(linkPendingSlot.slot);
      updateLinkHighlights();
      updateBoxSlots();
    }
    isLinkingMode = false;
    linkPendingSlot = null;
  }
}

function toggleBox() {
  boxOpen = !boxOpen;
  const body = document.getElementById('box-body');
  const icon = document.getElementById('box-toggle-icon');
  if (body) body.style.display = boxOpen ? 'block' : 'none';
  if (icon) icon.textContent = boxOpen ? '▲' : '▼';
  if (boxOpen) updateBoxSlots();
  if (boxOpen && routesOpen && boxRoutesShareRow()) toggleRoutes(false);
  updateBoxRoutesRow();
}

// Desktop: Box und Routen teilen sich eine Zeile – nur eine ist offen, die andere wird schmal daneben.
// Am Handy liegen beide in eigenen Tabs, da bleibt alles unabhängig.
function boxRoutesShareRow() {
  return !!document.getElementById('box-graveyard-row')?.contains(document.getElementById('routes-section'));
}
function updateBoxRoutesRow() {
  if (!boxRoutesShareRow()) return;
  document.getElementById('box-section').classList.toggle('is-shrunk', routesOpen && !boxOpen);
  document.getElementById('routes-section').classList.toggle('is-shrunk', boxOpen && !routesOpen);
}

// ── Drag & drop ───────────────────────────────────────────────────────────────
function isDragLinked() {
  if (!dragSource) return false;
  if (dragSource.type === 'team') return linkedTeamSlots.has(dragSource.slot);
  // Box slots are always auto-paired when both players have a Pokémon in the same slot
  return !!(boxes[0][dragSource.slot] && boxes[1][dragSource.slot]);
}

function handleDrop(target) {
  if (!dragSource) return;
  const src = dragSource;
  dragSource = null;
  document.querySelectorAll('.drag-over, .dragging').forEach(el => el.classList.remove('drag-over', 'dragging'));

  if (src.type === target.type && src.slot === target.slot) return;

  const srcIsLinked = src.type === 'team' ? linkedTeamSlots.has(src.slot) : !!(boxes[0][src.slot] && boxes[1][src.slot]);

  if (srcIsLinked) {
    // ── Pair move: both players travel together ────────────────────────────
    const get = (type, slot, pl) => type === 'team' ? teams[pl-1][slot] : boxes[pl-1][slot];
    const set = (type, slot, pl, val) => { if (type === 'team') teams[pl-1][slot] = val; else boxes[pl-1][slot] = val; };

    const srcP1 = get(src.type, src.slot, 1), srcP2 = get(src.type, src.slot, 2);
    const tgtP1 = get(target.type, target.slot, 1), tgtP2 = get(target.type, target.slot, 2);
    const tgtWasLinked = target.type === 'team' ? linkedTeamSlots.has(target.slot) : !!(boxes[0][target.slot] && boxes[1][target.slot]);

    set(target.type, target.slot, 1, srcP1);
    set(target.type, target.slot, 2, srcP2);
    set(src.type, src.slot, 1, tgtP1 || null);
    set(src.type, src.slot, 2, tgtP2 || null);

    // Source loses its link; if displaced content was also a pair, it re-links at source
    if (src.type === 'team') linkedTeamSlots.delete(src.slot); else linkedBoxSlots.delete(src.slot);
    if (tgtWasLinked && (tgtP1 || tgtP2)) {
      if (src.type === 'team') linkedTeamSlots.add(src.slot); else linkedBoxSlots.add(src.slot);
    }
    // Pair arrives at target and stays linked
    if (target.type === 'team') { linkedTeamSlots.delete(target.slot); linkedTeamSlots.add(target.slot); }
    else { linkedBoxSlots.delete(target.slot); linkedBoxSlots.add(target.slot); }

    for (let pl = 1; pl <= 2; pl++) {
      if (src.type    === 'team') renderTeamSlot(pl, src.slot,    get('team', src.slot,    pl));
      if (target.type === 'team') renderTeamSlot(pl, target.slot, get('team', target.slot, pl));
    }

  } else {
    // ── Single move: same-player only ─────────────────────────────────────
    if (src.player !== target.player) return;
    const pl = src.player;

    const srcPokemon = src.type === 'team' ? teams[pl-1][src.slot] : boxes[pl-1][src.slot];
    if (!srcPokemon) return;
    const tgtPokemon = target.type === 'team' ? teams[pl-1][target.slot] : boxes[pl-1][target.slot];

    if (src.type    === 'team' && linkedTeamSlots.has(src.slot))    linkedTeamSlots.delete(src.slot);
    if (target.type === 'team' && linkedTeamSlots.has(target.slot)) linkedTeamSlots.delete(target.slot);
    if (src.type    === 'box'  && linkedBoxSlots.has(src.slot))     linkedBoxSlots.delete(src.slot);
    if (target.type === 'box'  && linkedBoxSlots.has(target.slot))  linkedBoxSlots.delete(target.slot);

    if (target.type === 'team') { teams[pl-1][target.slot] = srcPokemon; renderTeamSlot(pl, target.slot, srcPokemon); }
    else boxes[pl-1][target.slot] = srcPokemon;
    if (src.type === 'team') { teams[pl-1][src.slot] = tgtPokemon || null; renderTeamSlot(pl, src.slot, tgtPokemon || null); }
    else boxes[pl-1][src.slot] = tgtPokemon || null;
  }

  updateBoxSlots();
  updateLinkHighlights();
  renderTeamWeaknessPanel();
  saveState();
}

// ── Touch drag & drop ────────────────────────────────────────────────────────
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
    if (teamSlot) return { type:'team', player:parseInt(teamSlot.dataset.player), slot:parseInt(teamSlot.dataset.slot), el:teamSlot };
    const boxHalf = el.closest('.box-slot-half');
    if (boxHalf) {
      const boxSlot = boxHalf.closest('.box-slot');
      if (!boxSlot) return null;
      return { type:'box', player:boxHalf.classList.contains('p1-half')?1:2, slot:parseInt(boxSlot.dataset.slot), el:boxHalf };
    }
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
      if (isDragLinked()) {
        document.querySelectorAll(`.pokemon-slot[data-slot="${tgt.slot}"]`).forEach(s => s.classList.add('drag-over'));
      } else if (dragSource.player === tgt.player) {
        tgt.el.classList.add('drag-over');
      }
    } else if (tgt.type === 'box') {
      if (isDragLinked()) {
        tgt.el.closest('.box-slot')?.querySelectorAll('.box-slot-half').forEach(h => h.classList.add('drag-over'));
      } else if (dragSource.player === tgt.player) {
        tgt.el.classList.add('drag-over');
      }
    } else if (tgt.type === 'info') {
      tgt.el.classList.add('drag-over');
    } else if (tgt.type === 'boxsection' && isDragLinked()) {
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
      dragSource = { type:'team', player:parseInt(teamSlot.dataset.player), slot:parseInt(teamSlot.dataset.slot) };
      return;
    }
    const boxHalf = el.closest('.box-slot-half.filled');
    if (boxHalf) {
      const boxSlot = boxHalf.closest('.box-slot');
      if (!boxSlot) return;
      touchId = t.identifier; startX = t.clientX; startY = t.clientY; touchDragging = false;
      dragSource = { type:'box', player:boxHalf.classList.contains('p1-half')?1:2, slot:parseInt(boxSlot.dataset.slot) };
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
      const halfClass = dragSource.player === 1 ? 'p1-half' : 'p2-half';
      const srcEl = dragSource.type === 'team'
        ? document.querySelector(`#team-builder-${dragSource.player} .pokemon-slot[data-slot="${dragSource.slot}"]`)
        : document.querySelector(`.box-slot[data-slot="${dragSource.slot}"] .${halfClass}`);
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
      // Tab-hover switching: dragging over a tab button switches to it
      if (dragSource) {
        const tabBtn = document.elementFromPoint(t.clientX, t.clientY)?.closest('.m-tab-btn');
        if (tabBtn) tabBtn.click();
      }
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
      handleDrop({ type:'team', player:tgt.player, slot:tgt.slot });
    } else if (tgt.type === 'box') {
      handleDrop({ type:'box', player:tgt.player, slot:tgt.slot });
    } else if (tgt.type === 'info') {
      const ds = dragSource; dragSource = null;
      showInfoFor(ds.type === 'team' ? teams[ds.player-1][ds.slot] : boxes[ds.player-1][ds.slot]);
    } else if (tgt.type === 'boxsection' && isDragLinked()) {
      const freeSlot = boxes[0].findIndex((_, idx) => !boxes[0][idx] && !boxes[1][idx]);
      if (freeSlot !== -1) {
        handleDrop({ type:'box', player:1, slot:freeSlot });
        if (!boxOpen) toggleBox();
        setTimeout(() => {
          const slotEl = document.querySelector(`.box-slot[data-slot="${freeSlot}"]`);
          if (slotEl) slotEl.scrollIntoView({ behavior:'smooth', block:'nearest' });
        }, 150);
      } else { dragSource = null; }
    } else { dragSource = null; }
  });

  document.addEventListener('touchcancel', e => {
    if (touchId === null) return;
    cleanup();
    dragSource = null;
  });
}

// ── Slots init ────────────────────────────────────────────────────────────────
function initSlots() {
  for (let pl=1; pl<=2; pl++) {
    document.querySelectorAll(`#team-builder-${pl} .pokemon-slot`).forEach((slot, i) => {
      slot.addEventListener('click', () => {
        if (!sessionCanEdit(pl-1)) return;
        selectedPlayer = pl; selectedSlot = i; selectedSlotType = 'team';
        openModal(window.t('pick-pokemon', pl, i+1));
      });
      slot.addEventListener('contextmenu', e => { e.preventDefault(); if (!teams[pl-1][i]) return; showCtxMenu(e, pl, i, 'team'); });

      slot.setAttribute('draggable', 'true');
      slot.addEventListener('dragstart', e => {
        if (!slot.dataset.filled) { e.preventDefault(); return; }
        dragSource = { type:'team', player:pl, slot:i };
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
        if (!isDragLinked() && dragSource.player !== pl) return;
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        // For pairs highlight both players' same slot; for singles just this slot
        if (isDragLinked()) {
          document.querySelectorAll(`.pokemon-slot[data-slot="${i}"]`).forEach(s => s.classList.add('drag-over'));
        } else {
          slot.classList.add('drag-over');
        }
      });
      slot.addEventListener('dragleave', e => {
        if (!e.relatedTarget || !e.relatedTarget.closest(`.pokemon-slot[data-slot="${i}"]`)) {
          document.querySelectorAll(`.pokemon-slot[data-slot="${i}"]`).forEach(s => s.classList.remove('drag-over'));
        }
      });
      slot.addEventListener('drop', e => {
        e.preventDefault();
        slot.classList.remove('drag-over');
        handleDrop({ type:'team', player:pl, slot:i });
      });
    });
  }
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
    info.addEventListener('drop', async e => {
      e.preventDefault();
      info.classList.remove('drag-over');
      if (!dragSource) return;
      const stub = dragSource.type === 'team' ? teams[dragSource.player-1][dragSource.slot] : boxes[dragSource.player-1][dragSource.slot];
      showInfoFor(stub);
    });
  }
}

// Pokémon ins Info-Feld. Immer frisch über den Namen laden: Slots enthalten im Sync-Modus nur Anzeige-Daten
// aus der Datenbank, und die sollen nie als vollständige Daten (Werte, Attacken, Adressen) übernommen werden.
async function showInfoFor(stub) {
  if (!isPokemonName(stub?.name)) return;
  try {
    const pokemon = await fetchWithSpecies(stub.name);
    infoGenLocked = false;
    infoPokemon = activePokemonInfo = pokemon;
    renderInfoSlot(pokemon);
    renderInfoPanel();
    saveState();
  } catch(err) { console.error('Info-Drop:', err); }
}

function initBoxSlots() {
  const container = document.getElementById('box-slots');
  container.innerHTML = '';
  for (let i=0; i<30; i++) {
    const slot = document.createElement('div');
    slot.className = 'box-slot';
    slot.dataset.slot = i;
    slot.addEventListener('contextmenu', e => {
      e.preventDefault();
      const half = e.target.closest('.box-slot-half');
      if (!half) return;
      const player = half.classList.contains('p1-half') ? 1 : 2;
      if (!boxes[player-1][i]) return;
      showCtxMenu(e, player, i, 'box');
    });
    container.appendChild(slot);
  }

  // Click delegation: click on a half to open Pokémon picker for that player
  container.addEventListener('click', e => {
    const half = e.target.closest('.box-slot-half');
    if (!half) return;
    const boxSlot = half.closest('.box-slot');
    const slotIndex = parseInt(boxSlot.dataset.slot);
    const player = half.classList.contains('p1-half') ? 1 : 2;
    if (!sessionCanEdit(player-1)) return;
    if (linkedBoxSlots.has(slotIndex)) linkedBoxSlots.delete(slotIndex);
    selectedPlayer = player; selectedSlot = slotIndex; selectedSlotType = 'box';
    openModal(window.t('box-pick', slotIndex+1, player));
  });

  // Drag event delegation for box halves
  container.addEventListener('dragstart', e => {
    const half = e.target.closest('.box-slot-half.filled');
    if (!half) { e.preventDefault(); return; }
    const boxSlot = half.closest('.box-slot');
    const slotIndex = parseInt(boxSlot.dataset.slot);
    const player = half.classList.contains('p1-half') ? 1 : 2;
    dragSource = { type:'box', player, slot:slotIndex };
    half.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'all';
  });
  container.addEventListener('dragend', () => {
    document.querySelectorAll('.dragging').forEach(el => el.classList.remove('dragging'));
    document.querySelectorAll('.drag-over').forEach(el => el.classList.remove('drag-over'));
    dragSource = null;
  });
  container.addEventListener('dragover', e => {
    if (!dragSource) return;
    const boxSlotEl = e.target.closest('.box-slot');
    if (!boxSlotEl) return;
    const half = e.target.closest('.box-slot-half');
    if (!half) return;
    if (!isDragLinked()) {
      const player = half.classList.contains('p1-half') ? 1 : 2;
      if (dragSource.player !== player) return;
    }
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    document.querySelectorAll('.box-slot-half.drag-over').forEach(el => el.classList.remove('drag-over'));
    // For pairs highlight both halves in the slot; for singles just the hovered half
    if (isDragLinked()) {
      boxSlotEl.querySelectorAll('.box-slot-half').forEach(h => h.classList.add('drag-over'));
    } else {
      half.classList.add('drag-over');
    }
  });
  container.addEventListener('dragleave', e => {
    const boxSlotEl = e.target.closest('.box-slot');
    if (boxSlotEl && !boxSlotEl.contains(e.relatedTarget)) {
      boxSlotEl.querySelectorAll('.box-slot-half.drag-over').forEach(h => h.classList.remove('drag-over'));
    }
  });
  container.addEventListener('drop', e => {
    e.preventDefault();
    const half = e.target.closest('.box-slot-half');
    if (!half) return;
    half.classList.remove('drag-over');
    const boxSlot = half.closest('.box-slot');
    const slotIndex = parseInt(boxSlot.dataset.slot);
    const player = half.classList.contains('p1-half') ? 1 : 2;
    handleDrop({ type:'box', player, slot:slotIndex });
  });

  updateBoxSlots();
}

// ── Select & remove ───────────────────────────────────────────────────────────
// Zählt jede Auswahl sowie jedes Öffnen/Schließen des Fensters. Kommt eine Antwort erst an, wenn schon etwas
// anderes gewählt oder das Fenster neu geöffnet wurde, wird sie verworfen – sonst landet sie im falschen Platz.
let pickSeq = 0;
async function selectPokemon(pokemon) {
  const seq = ++pickSeq;
  const slot = selectedSlot, player = selectedPlayer, type = selectedSlotType;
  try {
    const details = await fetchWithSpecies(pokemon.name);
    if (seq !== pickSeq) return;

    // Fangort bleibt beim Ersetzen (z. B. Entwicklung); der Partner eines neuen Paares übernimmt ihn
    if (type === 'team' || type === 'box') {
      const old = type === 'team' ? teams[player-1][slot] : boxes[player-1][slot];
      const route = old?.route || (isLinkingMode ? linkPendingSlot?.details?.route : null);
      if (route) details.route = route;
    }

    if (type === 'team') {
      teams[player-1][slot] = details;
      renderTeamSlot(player, slot, details);
      renderTeamWeaknessPanel();
      saveState();

      if (isLinkingMode) {
        linkedTeamSlots.add(slot);
        updateLinkHighlights();
        isLinkingMode = false;
        linkPendingSlot = null;
        closeModal();
        saveState(); // erneut speichern, jetzt mit aktuellem linkedTeamSlots
      } else {
        const other = 3 - player;
        isLinkingMode = true;
        linkPendingSlot = { slot, type:'team', triggerPlayer:player, details };
        selectedPlayer = other;
        openModal(window.t('link-pick', other, slot+1), true);
      }

    } else if (type === 'box') {
      if (!isLinkingMode && linkedBoxSlots.has(slot)) linkedBoxSlots.delete(slot);
      boxes[player-1][slot] = details;
      updateBoxSlots();
      saveState();

      if (isLinkingMode) {
        linkedBoxSlots.add(slot);
        isLinkingMode = false;
        linkPendingSlot = null;
        closeModal();
      } else {
        const other = 3 - player;
        isLinkingMode = true;
        linkPendingSlot = { slot, type:'box', triggerPlayer:player, details };
        selectedPlayer = other;
        openModal(window.t('link-pick-box', other, slot+1), true);
      }

    } else if (type === 'info') {
      infoGenLocked = false;
      infoPokemon = activePokemonInfo = details;
      renderInfoSlot(details);
      renderInfoPanel();
      saveState();
      closeModal();
    }
  } catch(e) { console.error('Fehler:', e); }
}

// Verknüpfter Partner (gleicher Platz beim anderen Spieler) oder null.
// Team: verknüpft laut linkedTeamSlots. Box: beide Hälften belegt = Paar (wie Kettensymbol und Drag & Drop).
function linkedPartner(player, index, type) {
  const other = 3 - player;
  if (type === 'team') return linkedTeamSlots.has(index) ? teams[other-1][index] : null;
  if (type === 'box')  return boxes[other-1][index] || null;
  return null;
}

// Nimmt ein Pokémon samt verknüpftem Partner aus Team bzw. Box und löst die Verknüpfung.
// Gibt den Partner zurück (oder null). Speichert nicht – das macht der Aufrufer.
function clearPokemon(player, index, type) {
  const partner = linkedPartner(player, index, type);
  const other = 3 - player;
  if (type === 'team') {
    teams[player-1][index] = null;
    renderTeamSlot(player, index, null);
    if (partner) {
      teams[other-1][index] = null;
      renderTeamSlot(other, index, null);
    }
    if (linkedTeamSlots.has(index)) {
      linkedTeamSlots.delete(index);
      updateLinkHighlights();
    }
    renderTeamWeaknessPanel();
  } else if (type === 'box') {
    boxes[player-1][index] = null;
    if (partner) boxes[other-1][index] = null;
    if (!boxes[0][index] && !boxes[1][index]) linkedBoxSlots.delete(index);
    updateBoxSlots();
  }
  return partner;
}

// „Entfernen“: Pokémon und verknüpfter Partner verschwinden
function removePokemon(player, index, type) {
  clearPokemon(player, index, type);
  saveState();
}

// „Gestorben“: Pokémon und verknüpfter Partner verschwinden und landen im Friedhof
function killPokemon(player, index, type) {
  const entry = type === 'team' ? teams[player-1][index] : type === 'box' ? boxes[player-1][index] : null;
  if (!entry) return;
  const partner = clearPokemon(player, index, type);
  if (partner) {
    const linkId = Date.now();   // markiert die beiden im Friedhof als Paar
    graves[(3-player)-1].push({ ...toDisplayPokemon(partner), killedBy: 0, linkId });
    graves[player-1].push({ ...toDisplayPokemon(entry), killedBy: 0, linkId });
  } else {
    graves[player-1].push({ ...toDisplayPokemon(entry), killedBy: 0 });
  }
  renderGraveyard();
  saveState();
}

// ── Custom context menu ───────────────────────────────────────────────────────
let ctxTarget = null;
const ctxMenu = document.getElementById('ctx-menu');

function showCtxMenu(e, player, index, type) {
  if (!sessionCanEdit(player-1)) return;
  ctxTarget = { player, index, type };
  ctxMenu.style.display = 'flex';
  const x = Math.min(e.clientX, window.innerWidth  - ctxMenu.offsetWidth  - 8);
  const y = Math.min(e.clientY, window.innerHeight - ctxMenu.offsetHeight - 8);
  ctxMenu.style.left = Math.max(4, x) + 'px';
  ctxMenu.style.top  = Math.max(4, y) + 'px';
}

function hideCtxMenu() { ctxMenu.style.display = 'none'; ctxTarget = null; }
document.addEventListener('click', hideCtxMenu);
document.addEventListener('keydown', e => { if (e.key === 'Escape') hideCtxMenu(); });

document.getElementById('ctx-remove').addEventListener('click', () => {
  if (!ctxTarget) return;
  const { player, index, type } = ctxTarget;
  removePokemon(player, index, type);
  hideCtxMenu();
});

document.getElementById('ctx-kill').addEventListener('click', () => {
  if (!ctxTarget) return;
  killPokemon(ctxTarget.player, ctxTarget.index, ctxTarget.type);
  hideCtxMenu();
});

// ── Graveyard ─────────────────────────────────────────────────────────────────
let graveyardOpen = false;
function toggleGraveyard() {
  graveyardOpen = !graveyardOpen;
  document.getElementById('graveyard-body').style.display = graveyardOpen ? '' : 'none';
  document.getElementById('graveyard-toggle-icon').textContent = graveyardOpen ? '▲' : '▼';
}
document.getElementById('graveyard-toggle').addEventListener('click', toggleGraveyard);

function renderGraveyard() {
  const container = document.getElementById('graveyard-slots');
  if (!container) return;
  const count = graves[0].length + graves[1].length;

  if (count === 0) {
    container.innerHTML = `<div class="graveyard-empty">${window.t('graveyard-empty')}</div>`;
    return;
  }

  let html = '';
  for (let pl = 1; pl <= 2; pl++) {
    const dead = graves[pl-1];
    if (!dead.length) continue;
    const col = pl === 1 ? 'var(--color-accent-strong)' : 'var(--color-accent)';
    html += `<div class="graveyard-player-label" style="color:${col}">${window.t('grave-player', pl)}</div>`;
    html += '<div class="graveyard-grid">';
    dead.forEach((p, i) => {
      const kb = p.killedBy ?? 0;
      const kbClass = kb === 1 ? 'grave-killer-1' : kb === 2 ? 'grave-killer-2' : '';
      const kbLabel = kb ? window.t('grave-blame-short', kb) : '?';
      // Ältere Einträge haben keine Nummer – die steht aber in der Sprite-Adresse
      const id = p.id || Number(String(p.sprite || '').match(/\/(\d+)\.png/)?.[1] || 0);
      const name = esc(window.pokemonName(id, p.name) || p.germanName);
      const title = p.route ? `${name} · ${esc(window.t('route-caught', routeLabel(p.route)))}` : name;
      html += `<div class="grave-slot" data-player="${pl}" data-idx="${i}" title="${title}">
        <img src="${esc(p.sprite)}" alt="${name}">
        <span class="grave-slot-name">${name}</span>
        <span class="grave-killer ${kbClass}">${kbLabel}</span>
      </div>`;
    });
    html += '</div>';
  }
  container.innerHTML = html;

  container.querySelectorAll('.grave-slot').forEach(el => {
    el.addEventListener('click', e => {
      e.stopPropagation();
      const pl  = Number(el.dataset.player);
      const idx = Number(el.dataset.idx);
      const g = graves[pl-1][idx];
      g.killedBy = ((g.killedBy ?? 0) + 1) % 3;
      if (g.linkId != null) {
        const partner = graves[pl === 1 ? 1 : 0].find(x => x.linkId === g.linkId);
        if (partner) partner.killedBy = g.killedBy;
      }
      renderGraveyard();
      saveState();
    });
    el.addEventListener('contextmenu', e => {
      e.preventDefault();
      const pl  = Number(el.dataset.player);
      const idx = Number(el.dataset.idx);
      graves[pl-1].splice(idx, 1);
      renderGraveyard();
      saveState();
    });
  });
}

// ── Routen ────────────────────────────────────────────────────────────────────
function LOC() { return window.PokeHubLocations; }
function routeLabel(r) { return LOC() ? LOC().label(r, window.LANG) : r; }
// Spiel der Liste: das des Duo-Runs; solange keins festgelegt ist, das aktive Spiel des Hubs (nur vorbelegt)
function routeGame() { return duoGame || window.PokeHubGame?.get() || ''; }
// Die erste Eintragung legt das vorbelegte Spiel für beide fest
function fixRouteGame() { if (!duoGame) duoGame = cleanGame(routeGame()); }
function replaceRouteMarks(marks) {
  Object.keys(routeMarks).forEach(k => delete routeMarks[k]);
  Object.assign(routeMarks, cleanRouteMarks(marks));
}

// Alle Pokémon beider Spieler mit Platz; gleiche pair-Kennung = Soul-Link-Paar
function allCatches() {
  const out = [];
  for (let pl = 1; pl <= 2; pl++) {
    const o = 2 - pl;   // Index des anderen Spielers
    teams[pl-1].forEach((mon, i) => { if (mon) out.push({ pl, where: 'team', mon, pair: linkedTeamSlots.has(i) && teams[o][i] ? 'team' + i : null }); });
    boxes[pl-1].forEach((mon, i) => { if (mon) out.push({ pl, where: 'box', mon, pair: boxes[o][i] ? 'box' + i : null }); });
    graves[pl-1].forEach(mon => out.push({ pl, where: 'grave', mon,
      pair: mon.linkId != null && graves[o].some(g => g.linkId === mon.linkId) ? 'grave' + mon.linkId : null }));
  }
  return out;
}

// Zeilen: Orte des Spiels in Spielreihenfolge, dahinter weitere benutzte Orte (aus dem Spielstand, frei getippt)
function routeRows() {
  const game = routeGame(), catches = allCatches();
  const base = game && LOC() ? LOC().encounterList(game) : [];
  const used = [...catches.map(c => c.mon.route), ...Object.keys(routeMarks)].filter(Boolean);
  // Benutzte Städte u. Ä. an ihre Stelle im Spielverlauf, ganz unbekannte Orte ans Ende
  const order = base.length ? [LOC().STARTER_LOCATION, ...(LOC().LOCATION_ORDER[game] || []), ...base] : [];
  const pos = r => { const i = order.indexOf(r); return i < 0 ? Infinity : i; };
  return [...new Set([...base, ...used])].sort((a, b) => pos(a) - pos(b)).map(route => {
    const here = catches.filter(c => c.mon.route === route);
    return { route, p1: here.filter(c => c.pl === 1), p2: here.filter(c => c.pl === 2), miss: routeMarks[route] || 0 };
  });
}
const rowDone = r => !!(r.p1.length || r.p2.length || r.miss);

// Noch ohne Fangort: Paare (mindestens eine Hälfte ohne) und Pokémon ohne Partner
function unrouted() {
  const pairs = new Map(), singles = [];
  allCatches().forEach(c => {
    if (c.pair) { const p = pairs.get(c.pair) || {}; p[c.pl] = c; pairs.set(c.pair, p); }
    else if (!c.mon.route) singles.push(c);
  });
  return { pairs: [...pairs.values()].filter(p => p[1] && p[2] && !(p[1].mon.route && p[2].mon.route)), singles };
}

function catchName(c) {
  const id = c.mon.id || Number(String(c.mon.sprite || '').match(/\/(\d+)\.png/)?.[1] || 0);
  return window.pokemonName(id, c.mon.name) || c.mon.germanName || capitalize(c.mon.name);
}
function routeMonHtml(c) {
  const dead = c.where === 'grave';
  return `<span class="route-mon${dead ? ' is-dead' : ''}"><img src="${esc(c.mon.sprite)}" alt="" loading="lazy">` +
    `<span class="route-mon-text"><span class="route-mon-name">${esc(catchName(c))}</span>` +
    `<small>${dead ? '† ' : ''}${esc(window.t('route-where-' + c.where))}</small></span></span>`;
}
// Wilde Pokémon einer Route für einen Spieler → { ids, rando: ROM-Name | null (Original) } oder null (kein Platin).
// Jede Spalte hat ihr eigenes Spiel (wildShared): das eigene kommt aus dem Randomizer-Stand dieses Geräts, das des
// Mitspielers lädt man bei ihm (ROM laden) oder er teilt es über die Session. Ohne Spiel: die Original-Pokémon.
const STARTERS_PT = [387, 390, 393];
function wildFor(pl, route) {
  if (routeGame() !== 'platin') return null;
  const w = wildShared[pl];
  if (w) return { ids: w.r[route] || null, rando: w.name || '?' };
  const R = window.PokeHubRando;
  return { ids: route === LOC()?.STARTER_LOCATION ? STARTERS_PT : R ? R.originalAt(route) : null, rando: null };
}
// Ein Randomizer-Spiel kurz zusammengefasst (Ort → Arten, nur Gras/Surfen/Angeln) – so wird es geteilt
function wildSummary(rd) {
  const R = window.PokeHubRando;
  if (!R || !rd || !Array.isArray(rd.wild) || !LOC()) return null;
  const r = {};
  LOC().encounterList('platin').forEach(p => {
    const ids = p === LOC().STARTER_LOCATION ? rd.starters : R.speciesAt(rd, p, true);
    if (ids && ids.length) r[p] = ids;
  });
  return cleanWild({ name: rd.name, r });
}
// Platz dieses Geräts: in der Session der eigene, sonst Spieler 1
const mySlot = () => (syncActive && sessionMySlot ? sessionMySlot : 1);
// Randomizer-Stand dieses Geräts in die eigene Spalte. fill = nur, wenn dort noch nichts ist (lokal beim Start)
function syncMyWild(fill) {
  if (routeGame() !== 'platin') return;
  const mine = wildSummary(window.PokeHubRando?.get()), slot = mySlot();
  if (!mine || (fill && wildShared[slot])) return;
  if (JSON.stringify(mine) === JSON.stringify(wildShared[slot] ?? null)) return;
  wildShared[slot] = mine;
  saveState();
}
const WILD_ICON = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/versions/generation-vii/icons/${id}.png`;
function wildIconsHtml(pl, route) {
  if (!showWild) return '';
  const w = wildFor(pl, route);
  if (!w || !w.ids || !w.ids.length) return '';
  const MAX = 6, more = w.ids.length - MAX;
  return `<span class="route-wild${w.rando ? ' is-rando' : ''}">` + w.ids.slice(0, MAX).map(id => {
    const n = esc(window.pokemonName(id, null) || '#' + id);
    return `<img src="${WILD_ICON(id)}" alt="${n}" title="${n}" loading="lazy">`;
  }).join('') + (more > 0 ? `<small title="${esc(w.ids.slice(MAX).map(id => window.pokemonName(id, null) || '#' + id).join(', '))}">+${more}</small>` : '') + '</span>';
}
// Je Spieler: welches Spiel (ROM-Name ×) bzw. Original mit „ROM laden“ und – falls dieses Gerät eins hat – „Mein Randomizer-Stand“
let wildLoading = 0;
function wildSlotsHtml() {
  if (routeGame() !== 'platin') return '';
  const t = window.t, rd = window.PokeHubRando?.get(), mine = rd && Array.isArray(rd.wild);
  return [1, 2].map(pl => {
    const w = wildShared[pl];
    const body = wildLoading === pl ? `<span class="wild-slot-orig">${esc(t('wild-slot-reading'))}</span>`
      : w ? `<span class="hub-rando-chip" title="${esc(w.name)}"><b>${esc(w.name || '?')}</b><button type="button" data-wild-clear="${pl}" aria-label="${esc(t('wild-slot-clear'))}" title="${esc(t('wild-slot-clear'))}">×</button></span>`
      : `<span class="wild-slot-orig">${esc(t('routes-wild-orig'))}</span>` +
        `<button type="button" class="hub-rando-load" data-wild-load="${pl}" title="${esc(t('wild-slot-hint'))}">${esc(t('wild-slot-load'))}</button>` +
        (mine && pl === mySlot() ? `<button type="button" class="hub-rando-load" data-wild-mine="${pl}">${esc(t('wild-slot-mine'))}</button>` : '');
    return `<div class="wild-slot"><span class="wild-slot-pl p${pl}">${esc(t('player' + pl))}</span>${body}</div>`;
  }).join('');
}
// ROM eines Spielers lesen (nur wilde Pokémon und Starter) und in seine Spalte – in der Session sieht es auch der Partner
const wildFile = document.createElement('input');
wildFile.type = 'file';
wildFile.accept = '.nds';
wildFile.addEventListener('change', async () => {
  const file = wildFile.files[0], pl = +wildFile.dataset.pl;
  wildFile.value = '';
  if (!file || !window.PokeHubRando || !(pl === 1 || pl === 2)) return;
  wildLoading = pl;
  renderRoutes();
  try {
    wildShared[pl] = wildSummary(await window.PokeHubRando.read(file));
    saveState();
  } catch (e) {
    alert(window.t('wild-slot-error') + (e && e.message && e.message !== 'notPlatinum' ? ` (${e.message})` : ''));
  }
  wildLoading = 0;
  renderRoutes();
});

function routeSideHtml(list, missed) {
  const miss = missed ? `<span class="route-miss">✗ ${esc(window.t('route-missed'))}</span>` : '';
  if (!list.length && !miss) return '<span class="route-empty">–</span>';
  return miss + list.map(routeMonHtml).join('');
}

let routeRowsShown = [];
function renderRoutes() {
  const rows = routeRows(), game = routeGame(), done = rows.filter(rowDone).length;
  const count = document.getElementById('routes-count');
  if (count) count.textContent = rows.length ? `${done} / ${rows.length}` : '';
  const list = document.getElementById('routes-list');
  if (!list || !routesOpen) return;

  const sel = document.getElementById('routes-game-select');
  if (sel) {
    const games = (window.PokeHubGame?.list || []).filter(k => LOC()?.LOCATION_PRESETS[k]);
    sel.innerHTML = (game ? '' : `<option value="">${esc(window.t('routes-game-none'))}</option>`) +
      games.map(k => `<option value="${esc(k)}">${esc(window.PokeHubGame.label(k, window.LANG))}</option>`).join('');
    sel.value = game;
  }
  const n = unrouted().pairs.length;
  const hintText = !game ? window.t('routes-hint-game') : n ? window.t('routes-hint-unrouted', n) : '';
  const hint = document.getElementById('routes-hint');
  if (hint) { hint.textContent = hintText; hint.hidden = !hintText; }
  const wildBox = document.getElementById('routes-wild');
  if (wildBox) {
    wildBox.hidden = game !== 'platin';
    const tog = document.getElementById('routes-wild-toggle');
    if (tog) tog.checked = showWild;
    const srcEl = document.getElementById('routes-wild-src');
    if (srcEl) srcEl.innerHTML = wildSlotsHtml();
  }
  document.querySelectorAll('[data-route-filter]').forEach(b => {
    b.classList.toggle('is-on', b.dataset.routeFilter === routeFilter);
    b.setAttribute('aria-pressed', String(b.dataset.routeFilter === routeFilter));
  });

  routeRowsShown = rows.filter(r => routeFilter === 'all' || (routeFilter === 'open' ? !rowDone(r) : rowDone(r)));
  list.innerHTML = routeRowsShown.length ? routeRowsShown.map((r, i) => {
    const linked = r.p1.some(a => a.pair && r.p2.some(b => b.pair === a.pair));
    return `<div class="route-row${rowDone(r) ? ' is-done' : ''}">
      <div class="route-name">${esc(routeLabel(r.route))}</div>
      <div class="route-side route-p1">${routeSideHtml(r.p1, r.miss & 1)}${wildIconsHtml(1, r.route)}</div>
      <div class="route-link${linked ? ' is-linked' : ''}" aria-hidden="true">${linked ? CHAIN_ICON : ''}</div>
      <div class="route-side route-p2">${routeSideHtml(r.p2, r.miss & 2)}${wildIconsHtml(2, r.route)}</div>
      <button type="button" class="route-edit" data-row="${i}">${esc(window.t(rowDone(r) ? 'route-change' : 'route-add'))}</button>
    </div>`;
  }).join('') : `<div class="routes-empty">${esc(window.t(rows.length ? 'routes-empty-filter' : 'routes-empty'))}</div>`;
}

function toggleRoutes(force) {
  routesOpen = typeof force === 'boolean' ? force : !routesOpen;
  const body = document.getElementById('routes-body');
  if (body) body.hidden = !routesOpen;
  const icon = document.getElementById('routes-toggle-icon');
  if (icon) icon.textContent = routesOpen ? '▲' : '▼';
  document.getElementById('routes-toggle')?.setAttribute('aria-expanded', String(routesOpen));
  if (routesOpen && boxOpen && boxRoutesShareRow()) toggleBox();
  updateBoxRoutesRow();
  renderRoutes();
}

// Nach einer Änderung an Fangorten: Slots neu (Route steht darunter), speichern (zeichnet auch die Liste)
function afterRouteChange() {
  for (let pl = 1; pl <= 2; pl++) teams[pl-1].forEach((p, i) => renderTeamSlot(pl, i, p));
  updateBoxSlots();
  renderGraveyard();
  saveState();
}

// Kleines Auswahlfenster an einer Stelle (rect); onPick(button) für Knöpfe mit data-act
let routePop = null;
function closeRoutePop() { if (routePop) { routePop.remove(); routePop = null; } }
function openRoutePop(rect, html, onPick) {
  closeRoutePop();
  routePop = document.createElement('div');
  routePop.className = 'route-pop';
  routePop.innerHTML = html;
  document.body.appendChild(routePop);
  const w = routePop.offsetWidth, h = routePop.offsetHeight;
  routePop.style.left = Math.max(8, Math.min(rect.right - w, innerWidth - w - 8)) + 'px';
  const top = rect.bottom + 6 + h > innerHeight ? rect.top - h - 6 : rect.bottom + 6;
  routePop.style.top = Math.max(8, Math.min(top, innerHeight - h - 8)) + 'px';
  routePop.addEventListener('click', e => {
    e.stopPropagation();
    const b = e.target.closest('[data-act]');
    if (b) onPick(b);
  });
}
document.addEventListener('click', e => { if (routePop && !routePop.contains(e.target)) closeRoutePop(); });
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeRoutePop(); });
// Nur bei anderer Breite schließen – am Handy kommt 'resize' schon beim Scrollen (Adressleiste) und mit der Tastatur
let routePopWidth = innerWidth;
window.addEventListener('resize', () => {
  if (innerWidth === routePopWidth) return;
  routePopWidth = innerWidth;
  closeRoutePop();
});

const miniMon = c => `<img src="${esc(c.mon.sprite)}" alt=""><span>${esc(catchName(c))}</span>`;

// Route in der Liste bearbeiten: Paar oder einzelnes Pokémon zuordnen, verpasst markieren, Fangort entfernen
function editRoute(rect, row) {
  const t = window.t, { pairs, singles } = unrouted();
  let html = `<div class="route-pop-title">${esc(routeLabel(row.route))}</div>`;
  if (pairs.length) html += `<div class="route-pop-head">${esc(t('route-pop-pairs'))}</div>` + pairs.map((p, i) =>
    `<button type="button" class="route-pop-opt" data-act="pair" data-i="${i}">${miniMon(p[1])}<i class="route-pop-chain">${CHAIN_ICON}</i>${miniMon(p[2])}<small>${esc(t('route-where-' + p[1].where))}</small></button>`).join('');
  if (singles.length) html += `<div class="route-pop-head">${esc(t('route-pop-singles'))}</div>` + singles.map((c, i) =>
    `<button type="button" class="route-pop-opt" data-act="single" data-i="${i}">${miniMon(c)}<small>${esc(t('grave-player', c.pl))} · ${esc(t('route-where-' + c.where))}</small></button>`).join('');
  if (!pairs.length && !singles.length) html += `<p class="route-pop-note">${esc(t('route-pop-none'))}</p>`;
  html += `<div class="route-pop-head">${esc(t('route-pop-missed'))}</div><div class="route-pop-miss">` + [1, 2].map(pl =>
    `<button type="button" class="route-pop-toggle${row.miss & pl ? ' is-on' : ''}" aria-pressed="${!!(row.miss & pl)}" data-act="miss" data-pl="${pl}">${row.miss & pl ? '✗ ' : ''}${esc(t('player' + pl))}</button>`).join('') + '</div>';
  if (row.p1.length || row.p2.length) html += `<button type="button" class="route-pop-clear" data-act="clear">${esc(t('route-pop-clear'))}</button>`;
  openRoutePop(rect, html, b => {
    fixRouteGame();
    const act = b.dataset.act;
    if (act === 'pair') { const p = pairs[+b.dataset.i]; p[1].mon.route = p[2].mon.route = row.route; }
    else if (act === 'single') singles[+b.dataset.i].mon.route = row.route;
    else if (act === 'miss') {
      const v = (routeMarks[row.route] || 0) ^ Number(b.dataset.pl);
      if (v) routeMarks[row.route] = v; else delete routeMarks[row.route];
    } else if (act === 'clear') [...row.p1, ...row.p2].forEach(c => { delete c.mon.route; });
    closeRoutePop();
    afterRouteChange();
  });
}

// Fangort eines Pokémon (samt Partner) wählen – über das Kontextmenü am Slot. Suche filtert, eigener Ort möglich.
function chooseRoute(rect, mons) {
  const t = window.t, rows = routeRows(), cur = mons[0]?.route || '';
  const opts = rows.map((r, i) => `<button type="button" class="route-pop-opt${r.route === cur ? ' is-on' : ''}" data-act="set" data-i="${i}" data-q="${esc(routeLabel(r.route).toLowerCase())}">` +
    `<span>${esc(routeLabel(r.route))}</span>${rowDone(r) && r.route !== cur ? `<small>${esc(t('route-pop-used'))}</small>` : ''}</button>`).join('');
  const html = `<div class="route-pop-title">${esc(t('route-pop-choose'))}</div>
    ${routeGame() ? '' : `<p class="route-pop-note">${esc(t('routes-hint-game'))}</p>`}
    <input type="search" class="route-pop-search" placeholder="${esc(t('route-pop-search'))}" autocomplete="off" spellcheck="false">
    <div class="route-pop-list">${opts}<button type="button" class="route-pop-opt route-pop-custom" data-act="custom" hidden></button></div>
    ${cur ? `<button type="button" class="route-pop-clear" data-act="none">${esc(t('route-pop-remove'))}</button>` : ''}`;
  openRoutePop(rect, html, b => {
    const act = b.dataset.act;
    const route = act === 'set' ? rows[+b.dataset.i].route : act === 'custom' ? cleanRoute(b.dataset.value) : null;
    if (act === 'custom' && !route) return;
    if (route) fixRouteGame();
    mons.forEach(m => { if (route) m.route = route; else delete m.route; });
    closeRoutePop();
    afterRouteChange();
  });
  const input = routePop.querySelector('.route-pop-search'), custom = routePop.querySelector('.route-pop-custom');
  input.addEventListener('input', () => {
    const raw = input.value.trim(), q = raw.toLowerCase();
    let exact = false;
    routePop.querySelectorAll('[data-q]').forEach(b => {
      b.hidden = !!q && !b.dataset.q.includes(q);
      if (b.dataset.q === q) exact = true;
    });
    custom.hidden = !raw || exact;
    custom.dataset.value = raw;
    custom.textContent = t('route-pop-custom', raw);
  });
  input.addEventListener('keydown', e => {
    if (e.key !== 'Enter') return;
    const first = [...routePop.querySelectorAll('.route-pop-list [data-act]')].find(b => !b.hidden);
    if (first) first.click();
  });
  // Am Handy nicht sofort die Tastatur öffnen
  if (matchMedia('(hover: hover)').matches) input.focus({ preventScroll: true });
  routePop.querySelector('.route-pop-opt.is-on')?.scrollIntoView({ block: 'nearest' });
}

document.getElementById('routes-toggle')?.addEventListener('click', () => toggleRoutes());
document.getElementById('routes-game-select')?.addEventListener('change', e => { duoGame = cleanGame(e.target.value); saveState(); syncMyWild(true); });
document.getElementById('routes-wild-toggle')?.addEventListener('change', e => {
  showWild = e.target.checked;
  try { localStorage.setItem('duo-routes-wild', showWild ? '1' : '0'); } catch (err) { /* nur nicht gemerkt */ }
  renderRoutes();
});
// Randomizer-Stand dieses Geräts geladen: in die eigene Spalte (in der Session auch zum Partner)
document.addEventListener('hubrandochange', () => { syncMyWild(); renderRoutes(); });
document.getElementById('routes-wild-src')?.addEventListener('click', e => {
  const b = e.target.closest('[data-wild-load], [data-wild-clear], [data-wild-mine]');
  if (!b) return;
  if (b.dataset.wildLoad) { wildFile.dataset.pl = b.dataset.wildLoad; wildFile.click(); return; }
  if (b.dataset.wildClear) { wildShared[+b.dataset.wildClear] = null; saveState(); return; }
  syncMyWild();
});
document.querySelectorAll('[data-route-filter]').forEach(b => b.addEventListener('click', () => { routeFilter = b.dataset.routeFilter; renderRoutes(); }));
document.getElementById('routes-list')?.addEventListener('click', e => {
  const b = e.target.closest('.route-edit');
  if (!b || !routeRowsShown[+b.dataset.row]) return;
  e.stopPropagation();
  editRoute(b.getBoundingClientRect(), routeRowsShown[+b.dataset.row]);
});
// Solange der Duo-Run kein eigenes Spiel hat, folgt die Vorbelegung dem aktiven Spiel des Hubs
document.addEventListener('hubgamechange', () => { if (!duoGame) renderRoutes(); });

document.getElementById('ctx-route')?.addEventListener('click', e => {
  if (!ctxTarget) return;
  e.stopPropagation();
  const { player, index, type } = ctxTarget;
  const mon = type === 'team' ? teams[player-1][index] : boxes[player-1][index];
  const rect = ctxMenu.getBoundingClientRect();
  hideCtxMenu();
  if (mon) chooseRoute(rect, [mon, linkedPartner(player, index, type)].filter(Boolean));
});

// ── Box section: drop linked pair onto header to auto-place ──────────────────
const boxSection = document.getElementById('box-section');
boxSection.addEventListener('dragover', e => {
  if (!dragSource || !isDragLinked()) return;
  if (e.target.closest('.box-slot-half')) return; // individual slot handles its own drop
  const freeSlot = boxes[0].findIndex((_, idx) => !boxes[0][idx] && !boxes[1][idx]);
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
  if (!dragSource || !isDragLinked()) return;
  if (e.target.closest('.box-slot-half')) return;
  e.preventDefault();
  const freeSlot = boxes[0].findIndex((_, idx) => !boxes[0][idx] && !boxes[1][idx]);
  if (freeSlot === -1) return;
  handleDrop({ type:'box', player:1, slot:freeSlot });
  if (!boxOpen) toggleBox();
  setTimeout(() => {
    const slotEl = document.querySelector(`.box-slot[data-slot="${freeSlot}"]`);
    if (slotEl) slotEl.scrollIntoView({ behavior:'smooth', block:'nearest' });
  }, 150);
});

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('box-toggle').addEventListener('click', toggleBox);
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('modal-skip-link').addEventListener('click', ()=>{ closeModal(); });
document.getElementById('pokemon-modal').addEventListener('click', e=>{ if(e.target===e.currentTarget) closeModal(); });

const searchInput = document.getElementById('pokemon-search');
if (searchInput) searchInput.addEventListener('input', e=>renderPokemonList(e.target.value));

const genSelect = document.getElementById('generation-select');
if (genSelect) genSelect.addEventListener('change', async e=>{ await loadPokemonList(Number(e.target.value)||1); renderPokemonList(searchInput?.value||''); });

const infoGenSelect = document.getElementById('info-generation-select');
if (infoGenSelect) infoGenSelect.addEventListener('change', e=>{ infoGenLocked = true; infoGeneration=Number(e.target.value)||1; renderInfoPanel(); });

document.addEventListener('click', () => { _tipPinned = false; _getTip().style.display = 'none'; });
document.addEventListener('keydown', e => { if (e.key === 'Escape') { _tipPinned = false; _getTip().style.display = 'none'; } });

// ── Language change ───────────────────────────────────────────────────────────
document.addEventListener('langchange', async () => {
  // Re-fetch species names for all Pokémon currently loaded in teams / box / info
  const active = [
    ...teams[0], ...teams[1], ...boxes[0], ...boxes[1],
    ...(activePokemonInfo ? [activePokemonInfo] : []),
  ].filter(Boolean);

  await Promise.allSettled(active.map(async p => {
    try {
      const speciesName = p.baseName || p.speciesName || p.name;
      const species = await getPokemonSpecies(speciesName);
      p.germanName = species.germanName;
    } catch {}
  }));

  // Also update displayName for the current gen's list (visible in modal)
  [...pokemonList, ...allPokemonList].forEach(p => { p.displayName = listName(p.id, p.name); });

  // Re-render team slots
  for (let pl = 1; pl <= 2; pl++) {
    teams[pl-1].forEach((p, i) => renderTeamSlot(pl, i, p));
  }
  if (boxOpen) updateBoxSlots();

  renderInfoSlot(infoPokemon);
  renderTeamWeaknessPanel();
  renderInfoPanel();
  window.PokemonTypes.fillGenSelect(document.getElementById('type-gen-select'));
  const infoSlot = document.querySelector('.info-slot[data-slot="info"]');
  if (infoSlot && !infoSlot.dataset.filled) infoSlot.textContent = window.t('info-slot-empty');
  renderGraveyard();
  closeRoutePop();
  renderRoutes();
  renderSyncStatus();
});

// ── Übernahme aus dem Save-Viewer ─────────────────────────────────────────────
// Der Save-Viewer legt bei zwei verknüpften Spielständen ein Paket unter 'duo-import' ab
// (PokeAPI-Namen; gleicher Platz = Soul-Link-Paar) und öffnet Duo. Übernommen wird erst nach
// Rückfrage und erst, wenn alle Pokémon geladen sind – sonst bleibt Duo, wie es war.
// Läuft nach syncRestore, damit eine verbundene Session den neuen Stand bekommt (saveState → Sync).
const IMPORT_KEY = 'duo-import';
const IMPORT_MAX_AGE = 15 * 60 * 1000;
const IMPORT_TEXT = {
  de: {
    ask: (d, n) => `Aus dem Save-Viewer übernehmen?\n\nSpieler 1: ${d.names[0]}\nSpieler 2: ${d.names[1]}\n\n` +
      `${n.team} Team-${n.team === 1 ? 'Paar' : 'Paare'} · ${n.box} Box-${n.box === 1 ? 'Paar' : 'Paare'} · ${n.grave} im Friedhof\n\n` +
      'Teams, Box und Friedhof hier in Duo werden dabei ersetzt.' +
      (syncActive ? '\nIhr seid verbunden – dein Mitspieler bekommt es direkt mit.' : ''),
    failed: 'Übernahme abgebrochen: Nicht alle Pokémon konnten geladen werden (keine Internetverbindung?). In Duo hat sich nichts geändert – versuch es im Save-Viewer noch einmal.',
  },
  en: {
    ask: (d, n) => `Import from the Save Viewer?\n\nPlayer 1: ${d.names[0]}\nPlayer 2: ${d.names[1]}\n\n` +
      `${n.team} team ${n.team === 1 ? 'pair' : 'pairs'} · ${n.box} box ${n.box === 1 ? 'pair' : 'pairs'} · ${n.grave} in the graveyard\n\n` +
      'This replaces the teams, box and graveyard here in Duo.' +
      (syncActive ? '\nYou are connected – your partner gets it right away.' : ''),
    failed: 'Import cancelled: not all Pokémon could be loaded (no internet connection?). Nothing changed in Duo – try again from the Save Viewer.',
  },
};

function readImport() {
  let data = null;
  try { data = JSON.parse(localStorage.getItem(IMPORT_KEY) || 'null'); } catch {}
  localStorage.removeItem(IMPORT_KEY);
  if (!data || data.v !== 1 || !(Date.now() - data.at < IMPORT_MAX_AGE)) return null;
  const list = (k, n) => Array.isArray(data[k]) && (!n || data[k].length === n);
  if (!list('team1', 6) || !list('team2', 6) || !list('box1', 30) || !list('box2', 30) || !list('graves1') || !list('graves2')) return null;
  if (data.graves1.length !== data.graves2.length || !Array.isArray(data.names)) return null;
  return data;
}

async function applyPendingImport() {
  const data = readImport();
  if (!data) return;
  const txt = IMPORT_TEXT[window.LANG] || IMPORT_TEXT.de;
  const pairs = (a, b) => a.filter((n, i) => n && b[i]).length;
  const count = { team: pairs(data.team1, data.team2), box: pairs(data.box1, data.box2), grave: data.graves1.length };
  if (!confirm(txt.ask(data, count))) return;

  // Erst alles laden – fehlt auch nur eins, wird nichts ersetzt
  const names = [...new Set([...data.team1, ...data.team2, ...data.box1, ...data.box2, ...data.graves1, ...data.graves2].filter(Boolean))];
  let loaded;
  try {
    const list = await Promise.all(names.map(n => fetchWithSpecies(n)));
    loaded = new Map(names.map((n, i) => [n, list[i]]));
  } catch (e) {
    console.error('Übernahme fehlgeschlagen:', e);
    alert(txt.failed);
    return;
  }
  // Fangorte stehen (falls vorhanden) unter routes am gleichen Platz
  const routes = data.routes && typeof data.routes === 'object' ? data.routes : {};
  const get = (n, list, i) => {
    if (!n) return null;
    const p = { ...loaded.get(n) };
    const r = list && Array.isArray(routes[list]) ? cleanRoute(routes[list][i]) : null;
    if (r) p.route = r; else delete p.route;
    return p;
  };

  for (let pl = 0; pl < 2; pl++) {
    const team = data[`team${pl + 1}`], box = data[`box${pl + 1}`];
    for (let i = 0; i < 6; i++) { teams[pl][i] = get(team[i], `team${pl + 1}`, i); renderTeamSlot(pl + 1, i, teams[pl][i]); }
    for (let i = 0; i < 30; i++) boxes[pl][i] = get(box[i], `box${pl + 1}`, i);
    graves[pl].length = 0;
  }
  if (cleanGame(data.game)) duoGame = cleanGame(data.game);
  linkedTeamSlots.clear();
  data.team1.forEach((n, i) => { if (n && data.team2[i]) linkedTeamSlots.add(i); });
  linkedBoxSlots.clear();
  data.box1.forEach((n, i) => { if (n && data.box2[i]) linkedBoxSlots.add(i); });
  const linkBase = Date.now();   // gleiche linkId = Paar im Friedhof (wie bei „Gestorben“)
  data.graves1.forEach((n, i) => {
    graves[0].push({ ...toDisplayPokemon(get(n, 'graves1', i)), killedBy: 0, linkId: linkBase + i });
    graves[1].push({ ...toDisplayPokemon(get(data.graves2[i], 'graves2', i)), killedBy: 0, linkId: linkBase + i });
  });

  // Spielstände aus Platin → Auswahlliste und Info auf Generation 4
  if (currentGeneration !== 4) {
    await loadPokemonList(4);
    const gs = document.getElementById('generation-select');
    if (gs) gs.value = '4';
  }
  if (!infoGenLocked) {
    infoGeneration = 4;
    const igs = document.getElementById('info-generation-select');
    if (igs) igs.value = '4';
    renderInfoPanel();
  }

  updateBoxSlots();
  renderGraveyard();
  updateLinkHighlights();
  renderTeamWeaknessPanel();
  saveState();
}

// ── Init ──────────────────────────────────────────────────────────────────────
// Generation der Typen (aktives Spiel des Hubs; nur auf diesem Gerät, nicht mit dem Mitspieler geteilt)
function refreshTypes(gen) {
  typeGen = gen;
  renderTeamWeaknessPanel();
  if (activePokemonInfo) renderInfoPanel();
}

async function init() {
  window.PokemonTypes.fillGenSelect(document.getElementById('type-gen-select'), refreshTypes);
  window.PokemonTypes.onGenChange(document.getElementById('type-gen-select'), g => { if (g !== typeGen) refreshTypes(g); });
  initSlots();
  initBoxSlots();
  initTouchDrag();
  initSyncUI();
  await loadSavedState();
  syncMyWild(true);   // eigenes Randomizer-Spiel in die eigene Spalte, falls dort noch keins steht
  await loadAllPokemonBasic();
  await loadPokemonList(currentGeneration);
  renderInfoSlot(infoPokemon);
  renderInfoPanel();
  renderTeamWeaknessPanel();
  await syncRestore();
  await applyPendingImport();
  setTimeout(retryPlaceholders, 15000);   // z. B. nach einem kurzen API-Fehler beim Start
}

init();
