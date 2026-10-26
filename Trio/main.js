import { getPokemon, getGenerationList, getPokemonSpecies, getMoveGermanName, getEvolutionChain } from "../Pokelocke/pokeapi.js";

// Ketten-Symbol für verknüpfte Pokémon (statt Emoji, Farbe aus der Schrift)
const CHAIN_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10 13a5 5 0 0 0 7.5.5l3-3a5 5 0 0 0-7-7l-1.7 1.7"/><path d="M14 11a5 5 0 0 0-7.5-.5l-3 3a5 5 0 0 0 7 7l1.7-1.7"/></svg>';

// ── Type chart ───────────────────────────────────────────────────────────────
const ALL_TYPES = ['normal','fire','water','electric','grass','ice','fighting','poison','ground','flying','psychic','bug','rock','ghost','dragon','dark','steel','fairy'];
const TYPE_GERMAN = {
  normal:'Normal', fire:'Feuer', water:'Wasser', electric:'Elektro',
  grass:'Pflanze', ice:'Eis', fighting:'Kampf', poison:'Gift',
  ground:'Boden', flying:'Flug', psychic:'Psycho', bug:'Käfer',
  rock:'Gestein', ghost:'Geist', dragon:'Drache', dark:'Unlicht',
  steel:'Stahl', fairy:'Fee',
};
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

// ── State ────────────────────────────────────────────────────────────────────
const STORAGE_KEY = 'pokemon-trio-nuzlocke-state';
let pokemonList = [], allPokemonList = [];
let currentGeneration = 1, infoGeneration = 1;
let selectedSlot = null, selectedPlayer = 1, selectedSlotType = 'team';
const teams = [new Array(6).fill(null), new Array(6).fill(null), new Array(6).fill(null)];
const boxes  = [new Array(30).fill(null), new Array(30).fill(null), new Array(30).fill(null)];
let activePokemonInfo = null, infoPokemon = null;

// ── Link state ───────────────────────────────────────────────────────────────
const linkedTeamSlots = new Set();
const linkedBoxSlots  = new Set();
let isLinkingMode   = false;
let linkPendingSlot = null; // { slot, type, triggerPlayer, step, picked, details }

// ── Helpers ──────────────────────────────────────────────────────────────────
function capitalize(s) { return s.charAt(0).toUpperCase() + s.slice(1); }
// Name in den Auswahllisten – aus pokemon-names.js (sofort da, auch offline; vorher eine Anfrage je Pokémon)
function listName(id, name) { return window.pokemonName(id, name) || capitalize(name); }
function formatLabel(t) { return t.split('-').map(w => w.charAt(0).toUpperCase()+w.slice(1)).join(' '); }
function getDisplayName(name) { return allPokemonList.find(p => p.name===name)?.displayName || capitalize(name); }
function nextPlayer(cur, steps = 1) { return ((cur - 1 + steps) % 3) + 1; }
function getTypeEffectiveness(atk, defs) {
  const chart = TYPE_CHART[atk] || {};
  let m = 1;
  for (const d of defs) m *= chart[d] !== undefined ? chart[d] : 1;
  return m;
}

const evolutionItemNames = {
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
};

function formatEvolutionCondition(details) {
  if (!details?.length) return '';
  const d = details[0], trigger = d.trigger?.name, parts = [];
  if (trigger === 'level-up') {
    if (d.min_level)        parts.push(`Lv. ${d.min_level}`);
    if (d.min_happiness)    parts.push(`Glück ≥${d.min_happiness}`);
    if (d.min_affection)    parts.push(`Zuneigung ≥${d.min_affection}`);
    if (d.time_of_day==='day')   parts.push('Tags');
    if (d.time_of_day==='night') parts.push('Nachts');
    if (d.needs_overworld_rain)  parts.push('Im Regen');
    if (d.known_move_type) parts.push(`${formatLabel(d.known_move_type.name)}-Typ`);
    if (d.known_move)      parts.push(`Kennt ${formatLabel(d.known_move.name)}`);
    if (!parts.length)     parts.push('Level-up');
  } else if (trigger === 'use-item') {
    const n = d.item?.name||''; parts.push(evolutionItemNames[n]||formatLabel(n));
  } else if (trigger === 'trade') {
    if (d.held_item)          parts.push(`Tausch + ${evolutionItemNames[d.held_item.name]||formatLabel(d.held_item.name)}`);
    else if (d.trade_species) parts.push(`Tausch mit ${getDisplayName(d.trade_species.name)}`);
    else                      parts.push('Tausch');
  } else if (trigger==='shed')              parts.push('Mausern');
  else if (trigger==='spin')               parts.push('Drehen');
  else if (trigger==='take-damage')        parts.push('Schaden');
  else if (trigger==='three-critical-hits')parts.push('3× krit. Treffer');
  else if (trigger==='other')              parts.push('Besonders');
  else parts.push(formatLabel(trigger||''));
  return parts.join(', ');
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

function formatLearnMethod(detail) {
  if (!detail?.move_learn_method) return 'Unbekannt';
  const m = detail.move_learn_method.name, lv = detail.level_learned_at;
  if (m==='level-up') return lv>0 ? `Lv. ${lv}` : 'Level-up';
  if (m==='machine')  return 'TM / HM';
  if (m==='egg')      return 'Ei';
  if (m==='tutor')    return 'Tutor';
  return formatLabel(m||'Unbekannt');
}

// ── Link highlighting ─────────────────────────────────────────────────────────
function updateLinkHighlights() {
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
    slot.innerHTML = `<div style="text-align:center"><img src="${details.sprite}" alt="" style="width:55px;height:55px"><div style="font-size:12px">${details.germanName||capitalize(details.name)}</div></div>`;
  } else {
    slot.removeAttribute('data-filled');
    slot.innerHTML = '';
  }
}

function renderInfoSlot(details) {
  const slot = document.querySelector('.info-slot[data-slot="info"]');
  if (!slot) return;
  if (details) {
    slot.dataset.filled = 'true';
    slot.innerHTML = `<div style="text-align:center"><img src="${details.sprite}" alt="" style="width:60px;height:60px"><div style="font-size:13px">${details.germanName||capitalize(details.name)}</div></div>`;
  } else {
    slot.removeAttribute('data-filled');
    slot.innerHTML = 'Info-Pokémon wählen';
  }
}

function updateBoxSlots() {
  document.querySelectorAll('.box-slot').forEach((slot, i) => {
    const p1 = boxes[0][i], p2 = boxes[1][i], p3 = boxes[2][i];
    const isLinked = linkedBoxSlots.has(i);
    const makeThird = (p, cls) => {
      if (p) {
        const name = p.germanName || capitalize(p.name);
        return `<div class="box-slot-third ${cls} filled"><img src="${p.sprite}" alt="" width="24" height="24"><div class="box-slot-name">${name}</div></div>`;
      }
      return `<div class="box-slot-third ${cls}"><span class="box-slot-empty">+</span></div>`;
    };
    slot.innerHTML = makeThird(p1, 'p1-third') + makeThird(p2, 'p2-third') + makeThird(p3, 'p3-third')
      + (isLinked ? '<span class="box-chain-icon">' + CHAIN_ICON + '</span>' : '');
  });
}

// ── Type analysis ─────────────────────────────────────────────────────────────
function renderTeamWeaknessPanel() {
  const container = document.getElementById('team-weakness-panel');
  if (!container) return;
  const a1 = teams[0].filter(Boolean), a2 = teams[1].filter(Boolean), a3 = teams[2].filter(Boolean);
  if (!a1.length && !a2.length && !a3.length) {
    container.innerHTML = '<p class="weakness-empty">Füge Pokémon zu einem Team hinzu, um die Typ-Analyse zu sehen.</p>';
    return;
  }

  const CELL = 64, GAP = 3;
  const gw = n => n > 0 ? n * CELL + (n-1) * GAP : 0;

  const groups = [
    { active:a1, cls:'p1-col', labelCls:'p1-label', sumCls:'p1', label:'Spieler 1' },
    { active:a2, cls:'p2-col', labelCls:'p2-label', sumCls:'p2', label:'Spieler 2' },
    { active:a3, cls:'p3-col', labelCls:'p3-label', sumCls:'p3', label:'Spieler 3' },
  ].filter(g => g.active.length > 0);

  container.innerHTML = '';
  const table = document.createElement('div');
  table.className = 'weakness-table';

  // Player label row
  const labelRow = document.createElement('div');
  labelRow.className = 'weakness-row';
  labelRow.appendChild(Object.assign(document.createElement('div'), { className:'weakness-type-label' }));
  groups.forEach((g, gi) => {
    if (gi > 0) labelRow.appendChild(Object.assign(document.createElement('div'), { className:'weakness-divider-label' }));
    const el = Object.assign(document.createElement('div'), { className:`weakness-player-label ${g.labelCls}`, textContent:g.label });
    el.style.width = gw(g.active.length)+'px';
    labelRow.appendChild(el);
  });
  table.appendChild(labelRow);

  // Sprite header row
  const header = document.createElement('div');
  header.className = 'weakness-row weakness-header';
  header.appendChild(Object.assign(document.createElement('div'), { className:'weakness-type-label' }));
  groups.forEach((g, gi) => {
    if (gi > 0) header.appendChild(Object.assign(document.createElement('div'), { className:'weakness-divider' }));
    g.active.forEach(p => {
      const c = document.createElement('div');
      c.className = `weakness-pokemon-header ${g.cls}`;
      const name = p.germanName || capitalize(p.name);
      c.innerHTML = `<img src="${p.sprite}" alt="${name}" width="36" height="36"><div title="${name}">${name}</div>`;
      header.appendChild(c);
    });
  });
  table.appendChild(header);

  // Type rows
  ALL_TYPES.forEach(atk => {
    const row = document.createElement('div');
    row.className = 'weakness-row';
    const lbl = document.createElement('div');
    lbl.className = `weakness-type-label type-bg-${atk}`;
    lbl.textContent = TYPE_GERMAN[atk];
    row.appendChild(lbl);
    groups.forEach((g, gi) => {
      if (gi > 0) row.appendChild(Object.assign(document.createElement('div'), { className:'weakness-divider' }));
      g.active.forEach(p => {
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
    });
    table.appendChild(row);
  });

  // Per-player summary
  const buildBlock = (active, cls, label) => {
    const block = document.createElement('div');
    block.className = 'weakness-summary-player';
    block.appendChild(Object.assign(document.createElement('div'), { className:`weakness-summary-title ${cls}`, textContent:label }));
    const weaknesses = [], immunities = [];
    ALL_TYPES.forEach(atk => {
      let w=0, im=0;
      active.forEach(p => {
        const m = getTypeEffectiveness(atk, Array.isArray(p.types)?p.types:[]);
        if (m>=2) w++; else if (m===0) im++;
      });
      if (w)  weaknesses.push({ type:atk, count:w });
      if (im) immunities.push({ type:atk, count:im });
    });
    weaknesses.sort((a,b)=>b.count-a.count);
    immunities.sort((a,b)=>b.count-a.count);
    const addRows = (list, countCls) => list.forEach(({ type, count }) => {
      const row = document.createElement('div');
      row.className = 'weakness-summary-row';
      row.appendChild(Object.assign(document.createElement('span'), { className:`weakness-type-label type-bg-${type}`, textContent:TYPE_GERMAN[type] }));
      row.appendChild(Object.assign(document.createElement('span'), { className:`weakness-summary-count ${countCls}`, textContent:`${count}×` }));
      block.appendChild(row);
    });
    if (weaknesses.length) {
      block.appendChild(Object.assign(document.createElement('div'), { className:'weakness-summary-subtitle', textContent:'Schwächen' }));
      addRows(weaknesses, '');
    }
    if (immunities.length) {
      block.appendChild(Object.assign(document.createElement('div'), { className:'weakness-summary-subtitle', textContent:'Immunitäten' }));
      addRows(immunities, 'weakness-summary-immune');
    }
    if (!weaknesses.length && !immunities.length)
      block.appendChild(Object.assign(document.createElement('div'), { style:'color:var(--color-muted);font-size:.8rem', textContent:'–' }));
    return block;
  };

  const summary = document.createElement('div');
  summary.className = 'weakness-summary';
  groups.forEach(g => summary.appendChild(buildBlock(g.active, g.sumCls, g.label)));

  const wrapper = document.createElement('div');
  wrapper.className = 'weakness-wrapper';
  const scroll = document.createElement('div');
  scroll.className = 'weakness-table-scroll';
  scroll.appendChild(table);
  wrapper.appendChild(scroll);
  wrapper.appendChild(summary);
  container.appendChild(wrapper);
}

// ── Info panel ────────────────────────────────────────────────────────────────
async function renderInfoPanel() {
  const infoContent = document.getElementById('info-content');
  if (!infoContent) return;
  infoContent.innerHTML = '';
  if (!activePokemonInfo) {
    const ph = Object.assign(document.createElement('div'), { id:'info-placeholder', className:'info-row', textContent:'Wähle ein Pokémon aus einem Team oder dem Info-Slot.' });
    infoContent.appendChild(ph);
    return;
  }
  const header = document.createElement('div');
  header.className = 'info-row';
  header.innerHTML = `<div style="font-size:1.05rem;font-weight:700">${activePokemonInfo.germanName||formatLabel(activePokemonInfo.name)}</div><div style="opacity:.75">#${activePokemonInfo.id}</div>`;
  const types = document.createElement('div');
  types.className = 'info-types';
  (Array.isArray(activePokemonInfo.types)?activePokemonInfo.types:[]).forEach(t => {
    types.appendChild(Object.assign(document.createElement('span'), { className:'info-type', textContent:formatLabel(t) }));
  });
  const statsGrid = document.createElement('div');
  statsGrid.className = 'info-stats';
  const statMeta = { hp:{label:'KP',css:'stat-hp'}, attack:{label:'Angriff',css:'stat-attack'}, defense:{label:'Verteidigung',css:'stat-defense'}, specialAttack:{label:'Spezial-Angriff',css:'stat-sp-atk'}, specialDefense:{label:'Spezial-Verteidigung',css:'stat-sp-def'}, speed:{label:'Initiative',css:'stat-speed'} };
  Object.entries(activePokemonInfo.stats||{}).forEach(([k,v]) => {
    const m = statMeta[k]||{ label:formatLabel(k), css:'' };
    const s = Object.assign(document.createElement('div'), { className:`info-stat ${m.css}`.trim() });
    s.innerHTML = `<strong>${m.label}</strong><br>${v}`;
    statsGrid.appendChild(s);
  });
  const evoTitle = Object.assign(document.createElement('div'), { textContent:'Entwicklung' });
  evoTitle.style.cssText = 'font-weight:700;margin-top:6px';
  const evoContainer = document.createElement('div');
  evoContainer.className = 'evo-chain';
  if (activePokemonInfo.evolutionChainUrl) {
    try {
      const chain = await getEvolutionChain(activePokemonInfo.evolutionChainUrl);
      const paths = getEvolutionPaths(chain);
      if (paths.length<=1 && paths[0]?.length<=1) {
        evoContainer.innerHTML = '<div class="evo-none">Entwickelt sich nicht.</div>';
      } else {
        paths.forEach(path => {
          const row = document.createElement('div');
          row.className = 'evo-path';
          path.forEach((stage, i) => {
            if (i>0) {
              const arr = document.createElement('div');
              arr.className = 'evo-arrow';
              const cond = formatEvolutionCondition(stage.evolutionDetails);
              arr.innerHTML = `<div class="evo-arrow-icon">→</div>${cond?`<div class="evo-condition">${cond}</div>`:''}`;
              row.appendChild(arr);
            }
            const el = document.createElement('div');
            el.className = 'evo-stage'+(stage.name===activePokemonInfo.name?' evo-stage-active':'');
            el.innerHTML = `<img src="${stage.sprite}" alt="${getDisplayName(stage.name)}" width="48" height="48"><div class="evo-name">${getDisplayName(stage.name)}</div>`;
            row.appendChild(el);
          });
          evoContainer.appendChild(row);
        });
      }
    } catch { evoContainer.innerHTML = '<div class="evo-none">Entwicklungsdaten nicht verfügbar.</div>'; }
  } else { evoContainer.innerHTML = '<div class="evo-none">Entwickelt sich nicht.</div>'; }

  const movesTitle = Object.assign(document.createElement('div'), { textContent:'Attacken in Generation '+infoGeneration });
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
  const names = await Promise.all(moveItems.map(m => getMoveGermanName(m.rawName)));
  moveItems.forEach((m,i) => { m.name = names[i]; });
  const prio = { 'level-up':0, 'egg':1, 'tutor':2, 'machine':3 };
  moveItems.sort((a,b) => { const ap=prio[a.sortMethod]??5, bp=prio[b.sortMethod]??5; if(ap!==bp)return ap-bp; if(ap===0&&a.sortLevel!==b.sortLevel)return a.sortLevel-b.sortLevel; return a.name.localeCompare(b.name); });
  if (!moveItems.length) {
    movesList.appendChild(Object.assign(document.createElement('div'), { className:'info-move', textContent:'Keine Attacken für diese Generation gefunden.' }));
  } else {
    moveItems.forEach(m => {
      const el = Object.assign(document.createElement('div'), { className:'info-move' });
      el.innerHTML = `<strong>${m.name}</strong> <span class="learn-method-tag ${m.methodClass}" style="font-size:.9rem;opacity:.9">${m.learnInfo}</span>`;
      movesList.appendChild(el);
    });
  }
  infoContent.appendChild(header);
  infoContent.appendChild(types);
  infoContent.appendChild(statsGrid);
  infoContent.appendChild(evoTitle);
  infoContent.appendChild(evoContainer);
  infoContent.appendChild(movesTitle);
  infoContent.appendChild(movesList);
}

// ── Save / Load ───────────────────────────────────────────────────────────────
function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({
    generation: currentGeneration,
    team1: teams[0].map(p=>p?.name||null),
    team2: teams[1].map(p=>p?.name||null),
    team3: teams[2].map(p=>p?.name||null),
    box1:  boxes[0].map(p=>p?.name||null),
    box2:  boxes[1].map(p=>p?.name||null),
    box3:  boxes[2].map(p=>p?.name||null),
    linkedTeam: [...linkedTeamSlots],
    linkedBox:  [...linkedBoxSlots],
  }));
  const s = document.getElementById('save-status');
  if (s) { s.textContent='Gespeichert!'; setTimeout(()=>s.textContent='',2000); }
}

async function fetchWithSpecies(name) {
  const details = await getPokemon(name);
  try {
    // Art über das Pokémon: Formen wie „giratina-altered“ haben keinen eigenen Art-Eintrag
    const species = await getPokemonSpecies(details.speciesName || name);
    details.germanName = species.germanName || capitalize(details.name);
    details.evolutionChainUrl = species.evolutionChainUrl ?? null;
  } catch { details.germanName = capitalize(details.name); details.evolutionChainUrl = null; }
  return details;
}

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
    for (let pl=1; pl<=3; pl++) {
      const saved = state[`team${pl}`];
      if (Array.isArray(saved)) {
        for (let i=0; i<6; i++) {
          if (saved[i]) { const d=await fetchWithSpecies(saved[i]); teams[pl-1][i]=d; renderTeamSlot(pl,i,d); }
        }
      }
      const savedBox = state[`box${pl}`];
      if (Array.isArray(savedBox)) {
        for (let i=0; i<30; i++) {
          if (savedBox[i]) boxes[pl-1][i] = await fetchWithSpecies(savedBox[i]);
        }
      }
    }
    if (Array.isArray(state.linkedTeam)) state.linkedTeam.forEach(i => linkedTeamSlots.add(i));
    if (Array.isArray(state.linkedBox))  state.linkedBox.forEach(i => linkedBoxSlots.add(i));
    updateLinkHighlights();
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
  if (!source.length) { listEl.innerHTML='<li style="cursor:default">Lade Pokémon...</li>'; return; }
  const filtered = source.filter(p=>p.displayName.toLowerCase().includes(search)||p.name.toLowerCase().includes(search));
  if (!filtered.length) { listEl.innerHTML='<li style="cursor:default">Kein Pokémon gefunden.</li>'; return; }
  filtered.forEach(p => {
    const li = document.createElement('li');
    li.innerHTML = `<img src="${p.sprite}" alt="${p.displayName}"/><div>${p.displayName}</div>`;
    li.addEventListener('click', ()=>selectPokemon(p));
    listEl.appendChild(li);
  });
}

// ── Modal ─────────────────────────────────────────────────────────────────────
function openModal(title='Wähle ein Pokémon', isLinking=false) {
  const t = document.getElementById('modal-title');
  if (t) t.textContent = title;
  const skip = document.getElementById('modal-skip-link');
  if (skip) skip.style.display = isLinking ? 'inline-flex' : 'none';

  const prog = document.getElementById('link-progress');
  if (prog) {
    if (isLinking && linkPendingSlot) {
      const { slot, triggerPlayer, step, picked } = linkPendingSlot;
      const p2Player = nextPlayer(triggerPlayer, 1);
      const p3Player = nextPlayer(triggerPlayer, 2);

      const makeStepDone = (details, playerNum) => {
        const name = details.germanName || capitalize(details.name);
        return `<div class="link-prog-step">
          <img src="${details.sprite}" alt="${name}" style="width:44px;height:44px;image-rendering:pixelated">
          <div>
            <div class="link-prog-label">Spieler ${playerNum} – Slot ${slot+1}</div>
            <strong>${name}</strong>
          </div>
          <span class="link-prog-check">✓</span>
        </div>`;
      };
      const makeStepPending = (playerNum) =>
        `<div class="link-prog-step link-prog-pending">
          <div class="link-prog-empty">?</div>
          <div>
            <div class="link-prog-label">Spieler ${playerNum} – Slot ${slot+1}</div>
            <span style="color:var(--color-muted)">Ausstehend…</span>
          </div>
        </div>`;

      prog.innerHTML =
        makeStepDone(picked[0], triggerPlayer) +
        `<span class="link-prog-arrow">${CHAIN_ICON}</span>` +
        (step >= 2 ? makeStepDone(picked[1], p2Player) : makeStepPending(p2Player)) +
        `<span class="link-prog-arrow">${CHAIN_ICON}</span>` +
        makeStepPending(p3Player);

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
}

function closeModal() {
  document.getElementById('pokemon-modal').style.display = 'none';
  const prog = document.getElementById('link-progress');
  if (prog) prog.style.display = 'none';
  if (isLinkingMode) {
    isLinkingMode = false;
    linkPendingSlot = null;
  }
}

function openBoxModal() {
  updateBoxSlots();
  document.getElementById('box-modal').style.display = 'flex';
}

function closeBoxModal() { document.getElementById('box-modal').style.display='none'; }

// ── Slots init ────────────────────────────────────────────────────────────────
function initSlots() {
  for (let pl=1; pl<=3; pl++) {
    document.querySelectorAll(`#team-builder-${pl} .pokemon-slot`).forEach((slot, i) => {
      slot.addEventListener('click', () => {
        if (!isLinkingMode && linkedTeamSlots.has(i)) {
          linkedTeamSlots.delete(i);
          updateLinkHighlights();
        }
        selectedPlayer = pl; selectedSlot = i; selectedSlotType = 'team';
        openModal(`Spieler ${pl} – Pokémon wählen (Slot ${i+1})`);
      });
      slot.addEventListener('contextmenu', e => { e.preventDefault(); removePokemon(pl, i, 'team'); });
    });
  }
  const info = document.querySelector('.info-slot[data-slot="info"]');
  if (info) {
    info.addEventListener('click', () => { selectedSlotType='info'; openModal('Info-Pokémon wählen'); });
    info.addEventListener('contextmenu', e => { e.preventDefault(); infoPokemon=null; activePokemonInfo=null; renderInfoSlot(null); renderInfoPanel(); saveState(); });
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
      if (linkedBoxSlots.has(i)) linkedBoxSlots.delete(i);
      selectedPlayer = 1; selectedSlot = i; selectedSlotType = 'box';
      document.getElementById('box-modal').style.display = 'none';
      openModal(`Gemeinsame Box – Slot ${i+1}`);
    });
    slot.addEventListener('contextmenu', e => {
      e.preventDefault();
      boxes[0][i] = null; boxes[1][i] = null; boxes[2][i] = null;
      linkedBoxSlots.delete(i);
      updateBoxSlots();
      saveState();
    });
    container.appendChild(slot);
  }
  updateBoxSlots();
}

// ── Select & remove ───────────────────────────────────────────────────────────
async function selectPokemon(pokemon) {
  try {
    const details = await fetchWithSpecies(pokemon.name);
    const slot = selectedSlot, player = selectedPlayer, type = selectedSlotType;

    if (type === 'team') {
      teams[player-1][slot] = details;
      renderTeamSlot(player, slot, details);
      renderTeamWeaknessPanel();
      saveState();

      if (isLinkingMode) {
        if (linkPendingSlot.step === 2) {
          linkedTeamSlots.add(slot);
          updateLinkHighlights();
          isLinkingMode = false;
          linkPendingSlot = null;
          closeModal();
        } else {
          linkPendingSlot.picked.push(details);
          linkPendingSlot.step = 2;
          const p3 = nextPlayer(linkPendingSlot.triggerPlayer, 2);
          selectedPlayer = p3;
          openModal(`Verknüpftes Pokémon für Spieler ${p3} – Slot ${slot+1}`, true);
        }
      } else {
        isLinkingMode = true;
        const p2 = nextPlayer(player, 1);
        linkPendingSlot = { slot, type:'team', triggerPlayer:player, step:1, picked:[details], details };
        selectedPlayer = p2;
        openModal(`Verknüpftes Pokémon für Spieler ${p2} – Slot ${slot+1}`, true);
      }

    } else if (type === 'box') {
      if (!isLinkingMode && linkedBoxSlots.has(slot)) linkedBoxSlots.delete(slot);
      boxes[player-1][slot] = details;
      updateBoxSlots();
      saveState();

      if (isLinkingMode) {
        if (linkPendingSlot.step === 2) {
          linkedBoxSlots.add(slot);
          isLinkingMode = false;
          linkPendingSlot = null;
          closeModal();
          openBoxModal();
        } else {
          linkPendingSlot.picked.push(details);
          linkPendingSlot.step = 2;
          const p3 = nextPlayer(linkPendingSlot.triggerPlayer, 2);
          selectedPlayer = p3;
          openModal(`Verknüpftes Box-Pokémon für Spieler ${p3} – Slot ${slot+1}`, true);
        }
      } else {
        isLinkingMode = true;
        const p2 = nextPlayer(player, 1);
        linkPendingSlot = { slot, type:'box', triggerPlayer:player, step:1, picked:[details], details };
        selectedPlayer = p2;
        openModal(`Verknüpftes Box-Pokémon für Spieler ${p2} – Slot ${slot+1}`, true);
      }

    } else if (type === 'info') {
      infoPokemon = activePokemonInfo = details;
      renderInfoSlot(details);
      renderInfoPanel();
      saveState();
      closeModal();
    }
  } catch(e) { console.error('Fehler:', e); }
}

function removePokemon(player, index, type) {
  if (type === 'team') {
    const wasLinked = linkedTeamSlots.has(index);
    teams[player-1][index] = null;
    renderTeamSlot(player, index, null);
    if (wasLinked) {
      for (let pl=1; pl<=3; pl++) {
        if (pl !== player) { teams[pl-1][index] = null; renderTeamSlot(pl, index, null); }
      }
      linkedTeamSlots.delete(index);
      updateLinkHighlights();
    }
    renderTeamWeaknessPanel();
    saveState();
  }
}

// ── Event listeners ───────────────────────────────────────────────────────────
document.getElementById('open-box').addEventListener('click', ()=>openBoxModal());
document.getElementById('close-box').addEventListener('click', closeBoxModal);
document.getElementById('close-modal').addEventListener('click', closeModal);
document.getElementById('modal-skip-link').addEventListener('click', ()=>{ isLinkingMode=false; linkPendingSlot=null; closeModal(); });
document.getElementById('pokemon-modal').addEventListener('click', e=>{ if(e.target===e.currentTarget) closeModal(); });
document.getElementById('box-modal').addEventListener('click', e=>{ if(e.target===e.currentTarget) closeBoxModal(); });

const searchInput = document.getElementById('pokemon-search');
if (searchInput) searchInput.addEventListener('input', e=>renderPokemonList(e.target.value));

const genSelect = document.getElementById('generation-select');
if (genSelect) genSelect.addEventListener('change', async e=>{ await loadPokemonList(Number(e.target.value)||1); renderPokemonList(searchInput?.value||''); });

const infoGenSelect = document.getElementById('info-generation-select');
if (infoGenSelect) infoGenSelect.addEventListener('change', e=>{ infoGeneration=Number(e.target.value)||1; renderInfoPanel(); });

// ── Init ──────────────────────────────────────────────────────────────────────
async function init() {
  initSlots();
  initBoxSlots();
  await loadSavedState();
  await loadAllPokemonBasic();
  await loadPokemonList(currentGeneration);
  renderInfoSlot(infoPokemon);
  renderInfoPanel();
  renderTeamWeaknessPanel();
}

init();
