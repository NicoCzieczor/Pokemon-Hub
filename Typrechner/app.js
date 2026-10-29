/*
 * Typen-Rechner.
 * Die Typentabellen je Generation kommen aus ../DamageCalc/mechanics.js (DMG.chartFor),
 * damit Typen- und Schadens-Rechner immer mit denselben Werten rechnen.
 */
window.LANG = localStorage.getItem('hub-lang') || 'de';
document.documentElement.lang = window.LANG;

const TRANSLATIONS = {
  de: {
    title: 'Typen-Rechner',
    subtitle: 'Schwächen, Resistenzen und Matchups für jede Typ-Kombination – passend zur Generation.',
    genLabel: 'Generation',
    roleAtk: 'Angriff',
    roleDef1: 'Verteidiger',
    roleDef2: '2. Typ',
    hintPick: 'Typ wählen',
    hintOptional: 'optional',
    clear: 'Leeren',
    gridHint: 'Typ für <b>{role}</b> antippen',
    gridDrag: ' – oder auf ein Feld ziehen',
    notInGen: 'gibt es erst ab Gen {g}',
    emptyResult: 'Wähle oben einen Angriffstyp, einen Verteidiger – oder beides.',
    vs: 'gegen',
    offenseTitle: '{t}-Attacken',
    offenseSub: 'Gegen einzelne Typen',
    defenseTitle: '{t} verteidigt',
    defenseSub: 'Gegen Attacken jedes Typs',
    neutral: 'Neutral',
    offRows: { 2: 'Sehr effektiv', 0.5: 'Nicht sehr effektiv', 0: 'Keine Wirkung' },
    defRows: { 4: 'Doppelt schwach', 2: 'Schwach', 0.5: 'Resistent', 0.25: 'Doppelt resistent', 0: 'Immun' },
    matchup: { 4: 'Extrem effektiv', 2: 'Sehr effektiv', 1: 'Neutral', 0.5: 'Nicht sehr effektiv', 0.25: 'Kaum wirksam', 0: 'Keine Wirkung' },
    countWeak: ['{n} Schwäche', '{n} Schwächen'],
    countResist: ['{n} Resistenz', '{n} Resistenzen'],
    countImmune: ['{n} Immunität', '{n} Immunitäten'],
    countStrong: '{n} sehr effektiv',
    countBlocked: '{n} resistent',
    countNoEffect: '{n} immun',
    exampleTitle: 'Beispiel',
    exampleShuffle: 'Anderes Beispiel',
    exampleLoading: 'Lädt…',
    exampleNone: 'Kein Pokémon mit {t} bis Gen {g}',
    genInfo: {
      1: 'Gen 1: kein Unlicht, Stahl und Fee · Käfer und Gift gegenseitig 2× · Geist wirkt nicht gegen Psycho · Eis gegen Feuer neutral',
      2: 'Gen 2–5: noch keine Fee · Stahl widersteht Geist und Unlicht',
      6: 'Ab Gen 6: Fee-Typ · Stahl widersteht Geist und Unlicht nicht mehr',
    },
  },
  en: {
    title: 'Type Calculator',
    subtitle: 'Weaknesses, resistances and matchups for any type combination – matching the generation.',
    genLabel: 'Generation',
    roleAtk: 'Attack',
    roleDef1: 'Defender',
    roleDef2: '2nd type',
    hintPick: 'Choose a type',
    hintOptional: 'optional',
    clear: 'Clear',
    gridHint: 'Tap a type for <b>{role}</b>',
    gridDrag: ' – or drag it onto a slot',
    notInGen: 'only from Gen {g}',
    emptyResult: 'Choose an attack type, a defender – or both.',
    vs: 'vs.',
    offenseTitle: '{t} moves',
    offenseSub: 'Against single types',
    defenseTitle: '{t} defending',
    defenseSub: 'Against moves of each type',
    neutral: 'Neutral',
    offRows: { 2: 'Super effective', 0.5: 'Not very effective', 0: 'No effect' },
    defRows: { 4: 'Double weakness', 2: 'Weak', 0.5: 'Resists', 0.25: 'Double resist', 0: 'Immune' },
    matchup: { 4: 'Extremely effective', 2: 'Super effective', 1: 'Neutral', 0.5: 'Not very effective', 0.25: 'Barely effective', 0: 'No effect' },
    countWeak: ['{n} weakness', '{n} weaknesses'],
    countResist: ['{n} resistance', '{n} resistances'],
    countImmune: ['{n} immunity', '{n} immunities'],
    countStrong: '{n} super effective',
    countBlocked: '{n} resist',
    countNoEffect: '{n} immune',
    exampleTitle: 'Example',
    exampleShuffle: 'Another example',
    exampleLoading: 'Loading…',
    exampleNone: 'No Pokémon with {t} up to Gen {g}',
    genInfo: {
      1: 'Gen 1: no Dark, Steel or Fairy · Bug and Poison 2× against each other · Ghost does not affect Psychic · Ice vs. Fire neutral',
      2: 'Gen 2–5: no Fairy yet · Steel resists Ghost and Dark',
      6: 'From Gen 6: Fairy type · Steel no longer resists Ghost and Dark',
    },
  },
};
const tr = () => TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
const t = (key, vars) => {
  let s = tr()[key] ?? TRANSLATIONS.de[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
};
// Einzahl/Mehrzahl: ['{n} Schwäche', '{n} Schwächen']
const tn = (key, n) => {
  const v = tr()[key] ?? TRANSLATIONS.de[key];
  return (Array.isArray(v) ? v[n === 1 ? 0 : 1] : v).split('{n}').join(n);
};
const isEn = () => window.LANG === 'en';
const $ = id => document.getElementById(id);

// ── Typen ─────────────────────────────────────────────────────────────────────
const TYPES = ['Normal','Fire','Water','Electric','Grass','Ice','Fighting','Poison','Ground','Flying','Psychic','Bug','Rock','Ghost','Dragon','Dark','Steel','Fairy'];
const DE = {
  Normal:'Normal', Fire:'Feuer', Water:'Wasser', Electric:'Elektro', Grass:'Pflanze', Ice:'Eis',
  Fighting:'Kampf', Poison:'Gift', Ground:'Boden', Flying:'Flug', Psychic:'Psycho', Bug:'Käfer',
  Rock:'Gestein', Ghost:'Geist', Dragon:'Drache', Dark:'Unlicht', Steel:'Stahl', Fairy:'Fee',
};
const COL = {
  Normal:'#9B9B6B', Fire:'#E07828', Water:'#5878E0', Electric:'#C8A800', Grass:'#58A030', Ice:'#68B8B8',
  Fighting:'#B02020', Poison:'#8030A0', Ground:'#C0982A', Flying:'#8068D8', Psychic:'#D83870', Bug:'#809010',
  Rock:'#988818', Ghost:'#584878', Dragon:'#5018D8', Dark:'#584838', Steel:'#8888A8', Fairy:'#C870A0',
};
const typeName = type => (isEn() ? type : (DE[type] ?? type));

// Ab welcher Generation es einen Typ gibt
const TYPE_FROM_GEN = { Dark: 2, Steel: 2, Fairy: 6 };
const inGen = (type, gen) => gen >= (TYPE_FROM_GEN[type] || 1);
// Höchste Pokédex-Nummer je Generation (für die Beispiele)
const LAST_ID = { 1:151, 2:251, 3:386, 4:493, 5:649, 6:721, 7:809, 8:905, 9:1025 };

// Typ-Symbole aus Types.png (5 × 4 Felder à 216 × 239 px, Symbol ca. 144 px groß)
const TYPE_SPRITE_POS = {
  Grass:[0,0], Fire:[1,0], Water:[2,0], Electric:[3,0], Normal:[4,0],
  Fighting:[0,1], Dark:[1,1], Steel:[2,1], Dragon:[3,1], Fairy:[4,1],
  Bug:[0,2], Flying:[1,2], Ghost:[2,2], Poison:[3,2], Psychic:[4,2],
  Ground:[0,3], Rock:[1,3], Ice:[3,3],
};
// Gemessene Mitte des Symbols im jeweiligen Feld
const ICON_CENTER = {
  Grass:[115,109], Fire:[103.5,111], Water:[115,110.5], Electric:[112,111], Normal:[104.5,110],
  Fighting:[114,108], Dark:[106,107], Steel:[113.5,108], Dragon:[112,108], Fairy:[104,108],
  Bug:[111,102.5], Flying:[105,102], Ghost:[114,101.5], Poison:[113,103], Psychic:[105,105],
  Ground:[108,96.5], Rock:[104,94], Ice:[116,95.5],
};
function typeIcon(type, size) {
  const [col, row] = TYPE_SPRITE_POS[type] ?? [0, 0];
  const [cx, cy] = ICON_CENTER[type] ?? [108, 119];
  const scale = size / 144;
  const bpX = size / 2 - (col * 216 + cx) * scale;
  const bpY = size / 2 - (row * 239 + cy) * scale;
  return `<span class="type-icon" style="width:${size}px;height:${size}px;background-size:${1080 * scale}px ${956 * scale}px;background-position:${bpX}px ${bpY}px"></span>`;
}
// Texte und Adressen aus der PokeAPI, die in HTML landen
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const badge = (type, hl, size = 16) => `<span class="tbadge${hl ? ' is-hl' : ''}" style="--tc:${COL[type]}">${typeIcon(type, size)}${esc(typeName(type))}</span>`;

// ── Wirkung ───────────────────────────────────────────────────────────────────
const eff = (atk, def) => DMG.chartFor(state.gen)[atk.toLowerCase()]?.[def.toLowerCase()] ?? 1;
const multOf = (atk, defs) => defs.reduce((m, d) => m * eff(atk, d), 1);
const mCls = m => ({ 4:'m4', 2:'m2', 1:'m1', 0.5:'mh', 0.25:'mq', 0:'m0' }[m] ?? 'm1');
const mLbl = m => ({ 4:'4×', 2:'2×', 1:'1×', 0.5:'½×', 0.25:'¼×', 0:'0×' }[m] ?? `${m}×`);

// ── Zustand ───────────────────────────────────────────────────────────────────
const ROLES = ['atk', 'def1', 'def2'];
const state = { gen: 9, atk: null, def1: null, def2: null };
let activeRole = 'atk';
// Die Generation teilen sich Typen- und Schadens-Rechner
try {
  const saved = +(localStorage.getItem('hub-gen') || localStorage.getItem('dc-gen'));
  if (saved >= 1 && saved <= 9) state.gen = saved;
} catch (e) { /* ohne Speicher einfach Gen 9 */ }

const defTypes = () => [state.def1, state.def2].filter(Boolean);
const roleLabel = role => t({ atk: 'roleAtk', def1: 'roleDef1', def2: 'roleDef2' }[role]);
const canDrag = () => !matchMedia('(pointer: coarse)').matches;

// ── Auswahl ───────────────────────────────────────────────────────────────────
function renderGen() {
  document.querySelectorAll('.gen-chip').forEach(btn => {
    const on = +btn.dataset.gen === state.gen;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('role', 'radio');
    btn.setAttribute('aria-checked', String(on));
  });
  const info = tr().genInfo;
  $('gen-info').textContent = state.gen === 1 ? info[1] : state.gen <= 5 ? info[2] : info[6];
}

function renderSlot(role) {
  const el = $(`slot-${role}`);
  const type = state[role];
  el.classList.toggle('is-active', activeRole === role);
  el.classList.toggle('is-filled', !!type);
  el.style.setProperty('--tc', type ? COL[type] : 'transparent');
  el.setAttribute('aria-pressed', String(activeRole === role));
  el.innerHTML = type
    ? `<span class="slot-role">${roleLabel(role)}</span>
       <span class="slot-type">${typeIcon(type, 34)}<span class="slot-name">${typeName(type)}</span></span>
       <button type="button" class="slot-clear" data-clear="${role}" aria-label="${t('clear')}" title="${t('clear')}">×</button>`
    : `<span class="slot-role">${roleLabel(role)}</span>
       <span class="slot-empty"><span class="slot-plus" aria-hidden="true">+</span><span class="slot-hint">${role === 'def2' ? t('hintOptional') : t('hintPick')}</span></span>`;
}

function buildGrid() {
  const grid = $('type-grid');
  grid.innerHTML = '';
  TYPES.forEach(type => {
    const chip = document.createElement('button');
    chip.type = 'button';
    chip.className = 'chip';
    chip.dataset.type = type;
    chip.style.setProperty('--tc', COL[type]);
    chip.draggable = true;
    chip.innerHTML = `${typeIcon(type, 22)}<span>${typeName(type)}</span>`;
    chip.addEventListener('click', () => pickType(type));
    chip.addEventListener('dragstart', e => {
      e.dataTransfer.setData('text/plain', type);
      e.dataTransfer.effectAllowed = 'copy';
    });
    grid.appendChild(chip);
  });
}

function renderGrid() {
  const used = new Set([state.atk, state.def1, state.def2].filter(Boolean));
  document.querySelectorAll('.chip').forEach(chip => {
    const type = chip.dataset.type;
    const off = !inGen(type, state.gen);
    chip.classList.toggle('is-used', used.has(type));
    chip.classList.toggle('is-off', off);
    chip.disabled = off;
    chip.title = off ? `${typeName(type)} ${t('notInGen', { g: TYPE_FROM_GEN[type] })}` : '';
    chip.draggable = !off;
  });
  $('grid-hint').innerHTML = t('gridHint', { role: roleLabel(activeRole) }) + (canDrag() ? t('gridDrag') : '');
}

// Nächstes leeres Feld nach dem aktuellen (Angriff → Verteidiger → 2. Typ → wieder Angriff)
function nextEmpty(role) {
  const i = ROLES.indexOf(role);
  for (let k = 1; k < ROLES.length; k++) {
    const r = ROLES[(i + k) % ROLES.length];
    if (!state[r]) return r;
  }
  return null;
}

function setType(role, type) {
  if (type && !inGen(type, state.gen)) return false;
  const other = role === 'def1' ? 'def2' : role === 'def2' ? 'def1' : null;
  if (type && other && state[other] === type) return false; // derselbe Typ zweimal ergibt keinen Doppeltyp
  state[role] = type;
  return true;
}

function pickType(type) {
  const role = activeRole;
  if (state[role] === type) {
    state[role] = null;               // nochmal tippen = wieder leeren
  } else if (setType(role, type)) {
    activeRole = nextEmpty(role) || role;
  }
  renderAll();
}

function clearSlot(role) {
  state[role] = null;
  activeRole = role;
  renderAll();
}

ROLES.forEach(role => {
  const el = $(`slot-${role}`);
  el.addEventListener('click', e => {
    const clear = e.target.closest('[data-clear]');
    if (clear) { e.stopPropagation(); clearSlot(clear.dataset.clear); return; }
    activeRole = role;
    renderAll(false);
  });
  el.addEventListener('keydown', e => {
    if (e.target !== el || (e.key !== 'Enter' && e.key !== ' ')) return;
    e.preventDefault();
    activeRole = role;
    renderAll(false);
  });
  // Rechtsklick leert das Feld
  el.addEventListener('contextmenu', e => {
    if (!state[role]) return;
    e.preventDefault();
    clearSlot(role);
  });
  // Typ auf ein Feld ziehen
  el.addEventListener('dragover', e => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; el.classList.add('is-drop'); });
  el.addEventListener('dragleave', () => el.classList.remove('is-drop'));
  el.addEventListener('drop', e => {
    e.preventDefault();
    el.classList.remove('is-drop');
    const type = e.dataTransfer.getData('text/plain');
    if (!TYPES.includes(type)) return;
    if (setType(role, type)) activeRole = nextEmpty(role) || role;
    renderAll();
  });
});

document.querySelectorAll('.gen-chip').forEach(btn => {
  btn.addEventListener('click', () => {
    state.gen = +btn.dataset.gen;
    try { localStorage.setItem('hub-gen', String(state.gen)); } catch (e) { /* egal */ }
    // Typen, die es in der Generation noch nicht gab, fliegen raus
    ROLES.forEach(r => { if (state[r] && !inGen(state[r], state.gen)) state[r] = null; });
    renderAll();
  });
});

// ── Ergebnis ──────────────────────────────────────────────────────────────────
function groupBy(fn) {
  const groups = {};
  TYPES.filter(x => inGen(x, state.gen)).forEach(x => { (groups[fn(x)] ??= []).push(x); });
  return groups;
}

function rowsHTML(groups, order, labels, highlight) {
  return order.filter(m => groups[m]?.length).map(m => `
    <div class="prow">
      <span class="ptag ${mCls(m)}">${mLbl(m)}</span>
      <div class="prow-body">
        <span class="prow-label">${labels[m]}</span>
        <div class="badges">${groups[m].map(x => badge(x, highlight.includes(x))).join('')}</div>
      </div>
    </div>`).join('');
}
function neutralHTML(list, highlight) {
  if (!list?.length) return '';
  return `<details class="neutral">
      <summary><span class="ptag m1">1×</span> ${t('neutral')} <span class="count">${list.length}</span></summary>
      <div class="badges">${list.map(x => badge(x, highlight.includes(x))).join('')}</div>
    </details>`;
}

function matchupHTML(atk, defs) {
  const m = multOf(atk, defs);
  const parts = defs.length > 1
    ? `<div class="mu-calc">${defs.map(d => `${typeName(d)} ${mLbl(eff(atk, d))}`).join(' · ')}</div>` : '';
  return `<section class="matchup ${mCls(m)}">
      <div class="mu-left">
        <div class="mu-types">
          ${badge(atk, false, 20)}
          <span class="mu-vs">${t('vs')}</span>
          ${defs.map(d => badge(d, false, 20)).join('<span class="mu-slash">/</span>')}
        </div>
        ${parts}
      </div>
      <div class="mu-result">
        <span class="mu-mult">${mLbl(m)}</span>
        <span class="mu-label">${tr().matchup[m] ?? ''}</span>
      </div>
    </section>`;
}

function offenseHTML(atk, defs) {
  const groups = groupBy(d => eff(atk, d));
  const counts = [t('countStrong', { n: (groups[2] || []).length }), t('countBlocked', { n: (groups[0.5] || []).length })];
  if (groups[0]?.length) counts.push(t('countNoEffect', { n: groups[0].length }));
  return `<section class="profile">
      <div class="profile-head">
        <h2>${typeIcon(atk, 26)}<span>${t('offenseTitle', { t: typeName(atk) })}</span></h2>
        <p>${t('offenseSub')} · <span class="profile-count">${counts.join(' · ')}</span></p>
      </div>
      ${rowsHTML(groups, [2, 0.5, 0], tr().offRows, defs)}
      ${neutralHTML(groups[1], defs)}
    </section>`;
}

function defenseHTML(defs, atk) {
  const groups = groupBy(a => multOf(a, defs));
  const weak = (groups[4] || []).length + (groups[2] || []).length;
  const resist = (groups[0.5] || []).length + (groups[0.25] || []).length;
  const immune = (groups[0] || []).length;
  const counts = [tn('countWeak', weak), tn('countResist', resist)];
  if (immune) counts.push(tn('countImmune', immune));
  return `<section class="profile">
      <div class="profile-head">
        <h2>${defs.map(d => typeIcon(d, 26)).join('')}<span>${t('defenseTitle', { t: defs.map(typeName).join(' / ') })}</span></h2>
        <p>${t('defenseSub')} · <span class="profile-count">${counts.join(' · ')}</span></p>
      </div>
      ${rowsHTML(groups, [4, 2, 0.5, 0.25, 0], tr().defRows, atk ? [atk] : [])}
      ${neutralHTML(groups[1], atk ? [atk] : [])}
    </section>`;
}

function exampleShellHTML(atk, defs) {
  const mult = atk && defs.length ? `<span class="ptag big ${mCls(multOf(atk, defs))}">${mLbl(multOf(atk, defs))}</span>` : '';
  return `<section class="example">
      <div class="example-head">
        <h2>${t('exampleTitle')}</h2>
        <button type="button" class="mini-btn" id="ex-shuffle">↻ ${t('exampleShuffle')}</button>
      </div>
      <div class="ex-matchup">
        <div class="ex-side" id="ex-atk">${atk ? exLoading() : exEmpty()}</div>
        <div class="ex-mid">${mult}<span class="ex-arrow" aria-hidden="true"></span></div>
        <div class="ex-side" id="ex-def">${defs.length ? exLoading() : exEmpty()}</div>
      </div>
    </section>`;
}

function renderResults() {
  const atk = state.atk;
  const defs = defTypes();
  const res = $('results');
  if (!atk && !defs.length) {
    res.innerHTML = `<section class="result-empty">${t('emptyResult')}</section>`;
    return;
  }
  let html = '';
  if (atk && defs.length) html += matchupHTML(atk, defs);
  html += `<div class="profiles${atk && defs.length ? ' profiles--two' : ''}">`;
  if (atk) html += offenseHTML(atk, defs);
  if (defs.length) html += defenseHTML(defs, atk);
  html += '</div>';
  html += exampleShellHTML(atk, defs);
  res.innerHTML = html;
  $('ex-shuffle').addEventListener('click', () => loadExamples());
  loadExamples();
}

function renderAll(withResults = true) {
  renderGen();
  ROLES.forEach(renderSlot);
  renderGrid();
  if (withResults) renderResults();
}

// ── Beispiel-Pokémon (PokeAPI) ────────────────────────────────────────────────
const API = 'https://pokeapi.co/api/v2';
const apiCache = new Map();
function apiFetch(url) {
  if (!apiCache.has(url)) {
    const p = fetch(url).then(r => { if (!r.ok) throw new Error(r.status); return r.json(); });
    p.catch(() => apiCache.delete(url));
    apiCache.set(url, p);
  }
  return apiCache.get(url);
}
const idFromUrl = url => +url.split('/').filter(Boolean).pop();

async function typePool(type) {
  const d = await apiFetch(`${API}/type/${type.toLowerCase()}`);
  return d.pokemon.map(e => idFromUrl(e.pokemon.url)).filter(id => id <= 1025);
}

const shuffle = list => {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};

// Ein Pokémon mit genau diesen Typen (bei Verteidigung) bzw. mit diesem Typ (bei Angriff), das es in der Generation schon gab
async function examplePokemon(types, exact) {
  const gen = state.gen;
  const pools = await Promise.all(types.map(typePool));
  let ids = pools[0].filter(id => id <= LAST_ID[gen]);
  if (pools[1]) { const second = new Set(pools[1]); ids = ids.filter(id => second.has(id)); }
  // Typen, die es damals noch nicht gab (z. B. Fee vor Gen 6), würden das Beispiel verfälschen
  const missing = TYPES.filter(x => !inGen(x, gen));
  if (missing.length) {
    const bad = new Set((await Promise.all(missing.map(typePool))).flat());
    ids = ids.filter(id => !bad.has(id));
  }
  for (const id of shuffle(ids).slice(0, 8)) {
    const p = await apiFetch(`${API}/pokemon/${id}`);
    const pTypes = [...p.types].sort((a, b) => a.slot - b.slot).map(x => cap(x.type.name));
    if (exact && pTypes.length !== types.length) continue;
    const sp = await apiFetch(`${API}/pokemon-species/${id}`).catch(() => null);
    const name = (!isEn() && sp?.names?.find(n => n.language.name === 'de')?.name)
      || sp?.names?.find(n => n.language.name === 'en')?.name || cap(p.name);
    return { id, name, types: pTypes, sprite: p.sprites?.front_default || `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png` };
  }
  return null;
}
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

function exLoading() {
  return `<div class="ex-sprite is-loading"><span class="ex-spin">↻</span></div><span class="ex-name muted">${t('exampleLoading')}</span>`;
}
function exEmpty(text) {
  return `<div class="ex-sprite is-empty">?</div><span class="ex-name muted">${text || '—'}</span>`;
}
function exFilled(p) {
  return `<div class="ex-sprite"><img src="${esc(p.sprite)}" alt="" width="80" height="80"></div>
    <span class="ex-name">${esc(p.name)}</span>
    <div class="ex-types">${p.types.filter(x => COL[x]).map(x => badge(x)).join('')}</div>`;
}

let exVer = 0;
async function loadExamples() {
  const ver = ++exVer;
  const atk = state.atk, defs = defTypes();
  const atkEl = $('ex-atk'), defEl = $('ex-def');
  if (atk) atkEl.innerHTML = exLoading();
  if (defs.length) defEl.innerHTML = exLoading();
  const [a, d] = await Promise.all([
    atk ? examplePokemon([atk], false).catch(() => null) : null,
    defs.length ? examplePokemon(defs, true).catch(() => null) : null,
  ]);
  if (ver !== exVer || !$('ex-atk')) return;
  const none = types => exEmpty(t('exampleNone', { t: types.map(typeName).join('/'), g: state.gen }));
  if (atk) $('ex-atk').innerHTML = a ? exFilled(a) : none([atk]);
  if (defs.length) $('ex-def').innerHTML = d ? exFilled(d) : none(defs);
}

// ── Sprache ───────────────────────────────────────────────────────────────────
function applyLang() {
  const dict = tr();
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const v = dict[el.dataset.i18n];
    if (typeof v === 'string') el.textContent = v;
  });
  $('lang-toggle').textContent = window.LANG.toUpperCase();
  buildGrid();
  renderAll();
}

$('lang-toggle').addEventListener('click', () => {
  window.LANG = window.LANG === 'de' ? 'en' : 'de';
  localStorage.setItem('hub-lang', window.LANG);
  document.documentElement.lang = window.LANG;
  applyLang();
});

applyLang();
