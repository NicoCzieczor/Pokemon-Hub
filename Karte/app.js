/*
 * Interaktive Karte von Sinnoh (Pokémon Platin).
 * Daten: platin.json + platin-terrain.png – erzeugt von tools/build-platin.js aus pret/pokeplatinum.
 * Koordinaten sind Spiel-Kacheln: x nach rechts, z nach unten. Leaflet (CRS.Simple) bekommt [−z, x].
 */
window.LANG = localStorage.getItem('hub-lang') || 'de';
document.documentElement.lang = window.LANG;

const TRANSLATIONS = {
  de: {
    title: 'Karte von Sinnoh',
    subtitle: 'Items, versteckte Items, TMs, Trainer und wilde Pokémon – an ihrer echten Stelle im Spiel.',
    searchPlaceholder: 'Ort, Item, TM oder Trainer suchen…',
    fItem: 'Items', fHidden: 'Versteckt', fTm: 'TMs', fGift: 'Geschenke', fTrainer: 'Trainer', fEntrance: 'Eingänge',
    loading: 'Karte wird geladen…',
    loadError: 'Die Kartendaten konnten nicht geladen werden.',
    note: 'Positionen und Inhalte aus dem Spielcode von Platin (pret/pokeplatinum). Unbegehbare Flächen sind vereinfacht dargestellt.',
    allPlaces: 'Alle Orte', dirHint: 'Tippe auf die Karte oder wähle einen Ort.',
    groupTowns: 'Städte', groupRoutes: 'Routen', groupPlaces: 'Höhlen, Gebäude & Orte',
    back: 'Alle Orte',
    typeTown: 'Stadt', typeCity: 'Stadt', typeRoute: 'Route', typePlace: 'Ort',
    tabItems: 'Items', tabTrainers: 'Trainer', tabWild: 'Wilde Pokémon',
    kBall: 'Item-Bälle', kHidden: 'Versteckte Items', kGift: 'Geschenke',
    kBallOne: 'Item-Ball', kHiddenOne: 'Versteckt', kGiftOne: 'Geschenk', kEntrance: 'Eingang',
    hiddenHint: 'Mit dem Itemradar (Pokétch) oder durch Absuchen der Stelle zu finden.',
    showOnMap: 'Auf der Karte zeigen',
    inside: 'im Gebäude / innen',
    noItems: 'Hier gibt es keine Items.', noTrainers: 'Hier gibt es keine Trainer.', noWild: 'Hier gibt es keine wilden Pokémon.',
    double: 'Doppelkampf',
    rivalNote: 'Team hängt von deinem Starter ab',
    withStarter: 'mit {p}',
    via: 'Erreichbar über {p}', entrances: 'Eingänge', entranceN: 'Eingang {n}',
    grass: 'Gras', surf: 'Surfen', oldRod: 'Angel', goodRod: 'Profiangel', superRod: 'Superangel',
    morning: 'Morgens', day: 'Tags', night: 'Nachts', level: 'Lv.',
    swarm: 'Schwarm', radar: 'Pokéradar', dualSlot: 'GBA-Modul',
    outside: 'Draußen',
    details: 'Details',
    noResults: 'Nichts gefunden.',
    countItems: '{n} Items', countHidden: '{n} versteckt', countTm: '{n} TMs', countTrainers: '{n} Trainer',
    areaN: 'Bereich {n}',
  },
  en: {
    title: 'Map of Sinnoh',
    subtitle: 'Items, hidden items, TMs, trainers and wild Pokémon – at their real spot in the game.',
    searchPlaceholder: 'Search place, item, TM or trainer…',
    fItem: 'Items', fHidden: 'Hidden', fTm: 'TMs', fGift: 'Gifts', fTrainer: 'Trainers', fEntrance: 'Entrances',
    loading: 'Loading map…',
    loadError: 'The map data could not be loaded.',
    note: 'Positions and contents from the Platinum game code (pret/pokeplatinum). Impassable areas are simplified.',
    allPlaces: 'All places', dirHint: 'Tap the map or choose a place.',
    groupTowns: 'Towns & cities', groupRoutes: 'Routes', groupPlaces: 'Caves, buildings & places',
    back: 'All places',
    typeTown: 'Town', typeCity: 'City', typeRoute: 'Route', typePlace: 'Place',
    tabItems: 'Items', tabTrainers: 'Trainers', tabWild: 'Wild Pokémon',
    kBall: 'Item balls', kHidden: 'Hidden items', kGift: 'Gifts',
    kBallOne: 'Item ball', kHiddenOne: 'Hidden', kGiftOne: 'Gift', kEntrance: 'Entrance',
    hiddenHint: 'Find them with the Dowsing MCHN (Pokétch) or by checking the spot.',
    showOnMap: 'Show on map',
    inside: 'inside',
    noItems: 'No items here.', noTrainers: 'No trainers here.', noWild: 'No wild Pokémon here.',
    double: 'Double battle',
    rivalNote: 'Team depends on your starter',
    withStarter: 'with {p}',
    via: 'Reached via {p}', entrances: 'Entrances', entranceN: 'Entrance {n}',
    grass: 'Grass', surf: 'Surf', oldRod: 'Old Rod', goodRod: 'Good Rod', superRod: 'Super Rod',
    morning: 'Morning', day: 'Day', night: 'Night', level: 'Lv.',
    swarm: 'Swarm', radar: 'Poké Radar', dualSlot: 'GBA slot',
    outside: 'Outside',
    details: 'Details',
    noResults: 'Nothing found.',
    countItems: '{n} items', countHidden: '{n} hidden', countTm: '{n} TMs', countTrainers: '{n} trainers',
    areaN: 'Area {n}',
  },
};
const tr = () => TRANSLATIONS[window.LANG] || TRANSLATIONS.de;
const t = (key, vars) => {
  let s = tr()[key] ?? TRANSLATIONS.de[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.split(`{${k}}`).join(v);
  return s;
};
const isEn = () => window.LANG === 'en';
const $ = id => document.getElementById(id);
const esc = s => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const nm = o => (o ? (isEn() ? o.en || o.de : o.de || o.en) : '');

// ── Trainerklassen (Spiel-Konstanten → deutsch/englisch) ──────────────────────
// Unsichere deutsche Namen bleiben bewusst englisch.
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
function className(cls) {
  const L = isEn() ? 1 : 0;
  if (CLASS_NAMES[cls]) return CLASS_NAMES[cls][L];
  if (cls.startsWith('LEADER_')) return isEn() ? 'Gym Leader' : (FEMALE_LEADERS.has(cls.slice(7)) ? 'Arenaleiterin' : 'Arenaleiter');
  if (cls.startsWith('ELITE_FOUR_')) return isEn() ? 'Elite Four' : 'Top Vier';
  if (cls.startsWith('COMMANDER_')) return 'Commander';
  if (cls.startsWith('CHAMPION_')) return isEn() ? 'Champion' : 'Champ';
  return cls.split('_').map(w => w[0] + w.slice(1).toLowerCase()).join(' ');
}

// ── Darstellung der Marker ────────────────────────────────────────────────────
const KINDS = ['item', 'hidden', 'tm', 'gift', 'trainer', 'entrance'];
const STYLE = {
  item:     { radius: 5, color: '#ffffff', weight: 1.5, fillColor: '#ff5a5a', fillOpacity: 1 },
  tm:       { radius: 5.5, color: '#0d0f2b', weight: 1.5, fillColor: '#57d2ff', fillOpacity: 1 },
  hidden:   { radius: 5, color: '#ffd23f', weight: 2, dashArray: '2 2', fillColor: '#ffd23f', fillOpacity: 0.18 },
  gift:     { radius: 5, color: '#0d0f2b', weight: 1.5, fillColor: '#3ddc84', fillOpacity: 1 },
  trainer:  { radius: 4.5, color: '#0d0f2b', weight: 1.5, fillColor: '#ffaa3c', fillOpacity: 1 },
  entrance: { radius: 6, color: '#ffffff', weight: 2, fillColor: '#b48cff', fillOpacity: 1 },
};
const STARTER_IDS = new Set([387, 388, 389, 390, 391, 392, 393, 394, 395]);
const itemSprite = it => {
  if (it.tm && it.move?.type) return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${/^hm/.test(it.id) ? 'hm' : 'tm'}-${it.move.type}.png`;
  return `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${it.id}.png`;
};
const monSprite = id => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`;
const itemName = it => {
  const base = nm(it);
  return it.tm && it.move ? `${base} ${isEn() ? it.move.en : it.move.de}` : base;
};
const locName = l => nm(l);
const typeLabel = l => t({ town: 'typeTown', city: 'typeCity', route: 'typeRoute' }[l.type] || 'typePlace');

// ── Zustand ───────────────────────────────────────────────────────────────────
let D = null;          // Kartendaten
let map = null;
const layers = {};     // Marker je Art
const shown = new Set(KINDS);
let selected = -1;
let currentTab = 'items';
let selLayer = null, labelLayer = null, focusMarker = null;
const ll = (x, z) => L.latLng(-z, x);

// ── Start ─────────────────────────────────────────────────────────────────────
async function init() {
  applyLang();
  try {
    const r = await fetch('platin.json');
    if (!r.ok) throw new Error(r.status);
    D = await r.json();
  } catch (e) {
    $('map-loading').textContent = t('loadError');
    return;
  }
  setupMap();
  buildMarkers();
  buildSearchIndex();
  $('map-loading').hidden = true;
  const fromHash = locationFromHash();
  if (fromHash >= 0) selectLocation(fromHash, { fly: true });
  else renderDirectory();
}

function setupMap() {
  const W = D.width, H = D.height, CH = D.chunk;
  map = L.map('map', {
    crs: L.CRS.Simple, minZoom: -1.5, maxZoom: 4, zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 90,
    // SVG statt Canvas: base.css zwingt jedes <canvas> auf 100 % Breite, das würde Leaflets Zeichenfläche verzerren
    attributionControl: false, preferCanvas: false, zoomControl: true,
  });
  L.imageOverlay('platin-terrain.png', L.latLngBounds(ll(0, H), ll(W, 0)), { className: 'terrain-img', interactive: false }).addTo(map);

  // Ausschnitt: alle Blöcke, die zu einem Ort gehören
  let minR = 99, maxR = 0, minC = 99, maxC = 0;
  D.chunks.forEach((row, r) => row.forEach((li, c) => {
    if (li < 0) return;
    minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }));
  const land = L.latLngBounds(ll(minC * CH, (maxR + 1) * CH), ll((maxC + 1) * CH, minR * CH));
  map.fitBounds(land, { padding: [10, 10] });
  map.setMaxBounds(land.pad(0.35));

  // Ortsnamen
  labelLayer = L.layerGroup().addTo(map);
  D.locations.forEach((l, li) => {
    if (!l.label || !l.chunks) return;
    const m = L.marker(ll(l.label[0], l.label[1]), {
      icon: L.divIcon({ className: `loc-label loc-label--${l.type}`, html: `<span>${esc(locName(l))}</span>`, iconSize: null }),
      interactive: false, keyboard: false,
    });
    m.locIndex = li;
    labelLayer.addLayer(m);
  });

  selLayer = L.layerGroup().addTo(map);
  map.on('zoomend', onZoom);
  onZoom();

  // Ort unter dem Mauszeiger bzw. Finger
  const chunkAt = latlng => {
    const x = Math.floor(latlng.lng / CH), z = Math.floor(-latlng.lat / CH);
    return D.chunks[z]?.[x] ?? -1;
  };
  map.on('mousemove', e => {
    if (matchMedia('(pointer: coarse)').matches) return;
    const li = chunkAt(e.latlng);
    const box = $('hover-name');
    if (li < 0) { box.hidden = true; map.getContainer().style.cursor = ''; return; }
    box.hidden = false;
    box.textContent = locName(D.locations[li]);
    map.getContainer().style.cursor = 'pointer';
  });
  map.on('mouseout', () => { $('hover-name').hidden = true; });
  map.on('click', e => {
    const li = chunkAt(e.latlng);
    if (li >= 0) selectLocation(li, { fromMap: true });
  });
}

function onZoom() {
  const z = map.getZoom();
  const el = map.getContainer();
  el.classList.toggle('z-far', z < 0);
  el.classList.toggle('z-mid', z >= 0 && z < 1.5);
  el.classList.toggle('z-near', z >= 1.5);
  const scale = z >= 2.5 ? 1.6 : z >= 1.5 ? 1.3 : z >= 0.5 ? 1 : 0.75;
  for (const kind of KINDS) layers[kind]?.eachLayer(m => m.setRadius(STYLE[kind].radius * scale));
}

// ── Marker ────────────────────────────────────────────────────────────────────
function entryOf(m) {
  const loc = D.locations[m.l];
  if (m.k === 'entrance') return { loc };
  if (m.k === 'trainer') return { loc, entry: loc.trainers[m.i] };
  return { loc, entry: loc.items[m.i] };
}
function markerText(m) {
  const { loc, entry } = entryOf(m);
  if (m.k === 'entrance') return `${t('kEntrance')}: ${locName(loc)}`;
  if (m.k === 'trainer') {
    const lv = entry.party.map(p => p.lv);
    const lvText = lv.length ? ` · ${t('level')} ${Math.min(...lv)}${Math.max(...lv) !== Math.min(...lv) ? '–' + Math.max(...lv) : ''}` : '';
    return `${className(entry.cls)} ${entry.name}${lvText}`;
  }
  const kind = entry.kind === 'hidden' ? t('kHiddenOne') : entry.kind === 'gift' ? t('kGiftOne') : t('kBallOne');
  return `${kind}: ${itemName(entry)}${entry.qty > 1 ? ' ×' + entry.qty : ''}`;
}

function buildMarkers() {
  const renderer = L.svg({ padding: 0.3 });
  for (const kind of KINDS) layers[kind] = L.layerGroup().addTo(map);
  const counts = Object.fromEntries(KINDS.map(k => [k, 0]));
  for (const m of D.markers) {
    const marker = L.circleMarker(ll(m.x + 0.5, m.z + 0.5), { ...STYLE[m.k], renderer, bubblingMouseEvents: false });
    marker.bindTooltip(() => esc(markerText(m)), { direction: 'top', offset: [0, -6], className: 'map-tip' });
    marker.on('click', () => {
      if (m.k === 'entrance') selectLocation(m.l, { fly: false });
      else selectLocation(m.l, { tab: m.k === 'trainer' ? 'trainers' : 'items', focus: `${m.k === 'trainer' ? 't' : 'i'}${m.i}` });
    });
    layers[m.k].addLayer(marker);
    counts[m.k]++;
  }
  document.querySelectorAll('#filter-chips .chip').forEach(chip => {
    const kind = chip.dataset.kind;
    chip.querySelector('b').textContent = counts[kind];
    chip.addEventListener('click', () => {
      const on = !shown.has(kind);
      if (on) { shown.add(kind); layers[kind].addTo(map); } else { shown.delete(kind); map.removeLayer(layers[kind]); }
      chip.classList.toggle('is-on', on);
      chip.setAttribute('aria-pressed', String(on));
    });
  });
  onZoom();
}

// Kurz aufleuchtender Ring an einer Stelle
function pulseAt(x, z) {
  if (focusMarker) map.removeLayer(focusMarker);
  focusMarker = L.marker(ll(x + 0.5, z + 0.5), {
    icon: L.divIcon({ className: 'focus-ring', html: '<span></span>', iconSize: [36, 36] }),
    interactive: false, keyboard: false,
  }).addTo(map);
  const ref = focusMarker;
  setTimeout(() => { if (focusMarker === ref) { map.removeLayer(ref); focusMarker = null; } }, 2600);
}
function flyToTile(x, z, minZoom = 2.5) {
  map.flyTo(ll(x + 0.5, z + 0.5), Math.max(map.getZoom(), minZoom), { duration: 0.6 });
  pulseAt(x, z);
}

// ── Ort auswählen ─────────────────────────────────────────────────────────────
function drawSelection(li) {
  selLayer.clearLayers();
  if (li < 0) return;
  const CH = D.chunk;
  const own = (r, c) => D.chunks[r]?.[c] === li;
  const segments = [];
  D.chunks.forEach((row, r) => row.forEach((v, c) => {
    if (v !== li) return;
    selLayer.addLayer(L.rectangle(L.latLngBounds(ll(c * CH, (r + 1) * CH), ll((c + 1) * CH, r * CH)),
      { stroke: false, fillColor: '#57d2ff', fillOpacity: 0.12, interactive: false }));
    const x0 = c * CH, x1 = (c + 1) * CH, z0 = r * CH, z1 = (r + 1) * CH;
    if (!own(r - 1, c)) segments.push([ll(x0, z0), ll(x1, z0)]);
    if (!own(r + 1, c)) segments.push([ll(x0, z1), ll(x1, z1)]);
    if (!own(r, c - 1)) segments.push([ll(x0, z0), ll(x0, z1)]);
    if (!own(r, c + 1)) segments.push([ll(x1, z0), ll(x1, z1)]);
  }));
  if (segments.length) selLayer.addLayer(L.polyline(segments, { color: '#57d2ff', weight: 2, opacity: 0.95, interactive: false }));
  // Höhlen und Gebäude: Eingänge hervorheben
  for (const [x, z] of D.locations[li].entrances || []) {
    selLayer.addLayer(L.circleMarker(ll(x + 0.5, z + 0.5), { radius: 11, color: '#b48cff', weight: 2, fill: false, interactive: false }));
  }
  labelLayer.eachLayer(m => m.getElement()?.classList.toggle('is-selected', m.locIndex === li));
}

function locationBounds(li) {
  const l = D.locations[li], CH = D.chunk;
  const pts = [];
  D.chunks.forEach((row, r) => row.forEach((v, c) => { if (v === li) { pts.push(ll(c * CH, r * CH), ll((c + 1) * CH, (r + 1) * CH)); } }));
  for (const [x, z] of l.entrances || []) pts.push(ll(x, z));
  return pts.length ? L.latLngBounds(pts) : null;
}

function selectLocation(li, opts = {}) {
  selected = li;
  const l = D.locations[li];
  if (opts.tab) currentTab = opts.tab;
  else if (!opts.keepTab) currentTab = l.items.length ? 'items' : l.trainers.length ? 'trainers' : 'wild';
  drawSelection(l.chunks || l.entrances ? li : (l.via ?? -1));
  renderLocation(li, opts.focus);
  history.replaceState(null, '', `#${slug(l.en)}`);
  if (opts.fly) {
    const b = locationBounds(l.chunks || l.entrances ? li : l.via);
    if (b) map.flyToBounds(b, { padding: [40, 40], maxZoom: 2, duration: 0.6 });
  }
  if (opts.fromMap && matchMedia('(max-width: 900px)').matches) showMobileChip(li);
}
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
function locationFromHash() {
  const h = decodeURIComponent(location.hash.slice(1));
  if (!h) return -1;
  return D.locations.findIndex(l => slug(l.en) === h);
}

// Am Handy: kleine Leiste über der Karte mit Sprung zum Panel
function showMobileChip(li) {
  const l = D.locations[li];
  const box = $('hover-name');
  box.hidden = false;
  box.innerHTML = `<b>${esc(locName(l))}</b> <button type="button" class="chip-details">${esc(t('details'))} ↓</button>`;
  box.querySelector('button').addEventListener('click', () => $('side').scrollIntoView({ behavior: 'smooth', block: 'start' }));
}

// ── Seitenleiste ──────────────────────────────────────────────────────────────
function renderDirectory() {
  selected = -1;
  drawSelection(-1);
  history.replaceState(null, '', location.pathname);
  const byType = { towns: [], routes: [], places: [] };
  D.locations.forEach((l, li) => {
    (l.type === 'route' ? byType.routes : l.type === 'town' || l.type === 'city' ? byType.towns : byType.places).push(li);
  });
  const sortFn = (a, b) => {
    const A = D.locations[a], B = D.locations[b];
    const na = A.en.match(/\d+/)?.[0], nb = B.en.match(/\d+/)?.[0];
    if (A.type === 'route' && B.type === 'route' && na && nb) return +na - +nb;
    return locName(A).localeCompare(locName(B), window.LANG);
  };
  const group = (title, list) => `<div class="dir-group">
      <h3>${esc(title)} <small>${list.length}</small></h3>
      <div class="dir-list">${list.sort(sortFn).map(li => {
        const l = D.locations[li];
        const n = l.items.length + l.trainers.length;
        return `<button type="button" class="dir-item" data-loc="${li}">${esc(locName(l))}${n ? `<small>${n}</small>` : ''}</button>`;
      }).join('')}</div>
    </div>`;
  $('side-content').innerHTML = `<div class="side-head"><h2>${esc(t('allPlaces'))}</h2><p>${esc(t('dirHint'))}</p></div>
    ${group(t('groupTowns'), byType.towns)}${group(t('groupRoutes'), byType.routes)}${group(t('groupPlaces'), byType.places)}`;
  $('side-content').querySelectorAll('[data-loc]').forEach(b => b.addEventListener('click', () => selectLocation(+b.dataset.loc, { fly: true })));
}

function renderLocation(li, focus) {
  const l = D.locations[li];
  const tms = l.items.filter(i => i.tm).length;
  const hidden = l.items.filter(i => i.kind === 'hidden').length;
  const sub = [l.en !== l.de ? (isEn() ? l.de : l.en) : null, typeLabel(l)].filter(Boolean).join(' · ');
  const stats = [
    l.items.length ? t('countItems', { n: l.items.length }) : null,
    hidden ? t('countHidden', { n: hidden }) : null,
    tms ? t('countTm', { n: tms }) : null,
    l.trainers.length ? t('countTrainers', { n: l.trainers.length }) : null,
  ].filter(Boolean);
  const via = l.via != null ? `<button type="button" class="via-link" data-loc="${l.via}">${esc(t('via', { p: locName(D.locations[l.via]) }))} →</button>` : '';
  const ents = (l.entrances || []).length
    ? `<div class="ent-row"><span>${esc(t('entrances'))}:</span>${l.entrances.map(([x, z], n) => `<button type="button" class="mini-btn" data-goto="${x},${z}">📍 ${esc(t('entranceN', { n: n + 1 }))}</button>`).join('')}</div>`
    : '';
  const tab = (key, label, count, disabled) => `<button type="button" class="tab${currentTab === key ? ' is-active' : ''}" data-tab="${key}"${disabled ? ' disabled' : ''}>${esc(label)}${count != null ? ` <small>${count}</small>` : ''}</button>`;
  const wildCount = l.wild.length;
  $('side-content').innerHTML = `
    <div class="side-head">
      <button type="button" class="back-btn" id="back-btn">← ${esc(t('back'))}</button>
      <h2>${esc(locName(l))}</h2>
      <p class="loc-sub">${esc(sub)}</p>
      ${stats.length ? `<div class="stat-chips">${stats.map(s => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
      ${via}${ents}
    </div>
    <div class="tabs">
      ${tab('items', t('tabItems'), l.items.length, !l.items.length)}
      ${tab('trainers', t('tabTrainers'), l.trainers.length, !l.trainers.length)}
      ${tab('wild', t('tabWild'), null, !wildCount)}
    </div>
    <div class="tab-body" id="tab-body"></div>`;
  $('back-btn').addEventListener('click', renderDirectory);
  $('side-content').querySelector('.via-link')?.addEventListener('click', e => selectLocation(+e.currentTarget.dataset.loc, { fly: true }));
  $('side-content').querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => { const [x, z] = b.dataset.goto.split(',').map(Number); flyToTile(x, z, 2); }));
  $('side-content').querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { currentTab = b.dataset.tab; renderLocation(li); }));
  // Leeren Tab vermeiden
  if ((currentTab === 'items' && !l.items.length) || (currentTab === 'trainers' && !l.trainers.length) || (currentTab === 'wild' && !wildCount)) {
    currentTab = l.items.length ? 'items' : l.trainers.length ? 'trainers' : 'wild';
    $('side-content').querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === currentTab));
  }
  const body = $('tab-body');
  body.innerHTML = currentTab === 'items' ? itemsHTML(l) : currentTab === 'trainers' ? trainersHTML(l) : wildHTML(l);
  body.querySelectorAll('[data-pos]').forEach(b => b.addEventListener('click', () => { const [x, z] = b.dataset.pos.split(',').map(Number); flyToTile(x, z); }));
  if (focus) {
    const row = body.querySelector(`[data-ref="${focus}"]`);
    if (row) {
      row.classList.add('is-flash');
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const pos = row.querySelector('[data-pos]')?.dataset.pos;
      if (pos) { const [x, z] = pos.split(',').map(Number); pulseAt(x, z); }
    }
  }
}

const posBtn = pos => (pos ? `<button type="button" class="pin" data-pos="${pos[0]},${pos[1]}" title="${esc(t('showOnMap'))}" aria-label="${esc(t('showOnMap'))}">📍</button>` : '');
// Bereiche wie im Großmoor heißen nur „1"–„6"
const areaName = area => (/^\d+$/.test(area) ? t('areaN', { n: area }) : area);
const areaTag = area => (area ? `<span class="area">${esc(areaName(area))}</span>` : '');

function itemsHTML(l) {
  if (!l.items.length) return `<p class="empty">${esc(t('noItems'))}</p>`;
  const groups = [['ball', t('kBall')], ['hidden', t('kHidden')], ['gift', t('kGift')]];
  return groups.map(([kind, title]) => {
    const list = l.items.map((it, i) => ({ it, i })).filter(x => x.it.kind === kind)
      .sort((a, b) => (b.it.tm - a.it.tm) || (a.it.area || '').localeCompare(b.it.area || '') || itemName(a.it).localeCompare(itemName(b.it), window.LANG));
    if (!list.length) return '';
    return `<div class="list-group">
        <h3>${esc(title)} <small>${list.length}</small></h3>
        ${kind === 'hidden' ? `<p class="hint">${esc(t('hiddenHint'))}</p>` : ''}
        ${list.map(({ it, i }) => `<div class="row${it.tm ? ' is-tm' : ''}" data-ref="i${i}">
            <img class="item-ico" src="${itemSprite(it)}" alt="" loading="lazy" onerror="this.style.visibility='hidden'">
            <div class="row-main">
              <span class="row-title">${esc(nm(it))}${it.qty > 1 ? ` <small>×${it.qty}</small>` : ''}</span>
              ${it.tm && it.move ? `<span class="row-sub">${esc(isEn() ? it.move.en : it.move.de)}</span>` : ''}
            </div>
            ${areaTag(it.area)}${posBtn(it.pos)}
          </div>`).join('')}
      </div>`;
  }).join('');
}

function partyHTML(party) {
  return `<div class="party">${party.map(p => `<span class="mon" title="${esc(nm(p))}${p.item ? ' · ' + esc(nm(p.item)) : ''}">
      <img src="${monSprite(p.id)}" alt="" loading="lazy">
      <span class="mon-name">${esc(nm(p))}</span><small>${t('level')} ${p.lv}</small>
    </span>`).join('')}</div>`;
}

function trainersHTML(l) {
  if (!l.trainers.length) return `<p class="empty">${esc(t('noTrainers'))}</p>`;
  // Rivale: mehrere Teams je nach Starter an derselben Stelle zusammenfassen
  const rows = [];
  const rivalGroups = new Map();
  l.trainers.forEach((tr, i) => {
    if (tr.cls === 'RIVAL') {
      const key = `${tr.name}|${tr.area}|${tr.pos || ''}`;
      if (!rivalGroups.has(key)) { rivalGroups.set(key, { tr, i, variants: [] }); rows.push(rivalGroups.get(key)); }
      rivalGroups.get(key).variants.push({ tr, i });
    } else rows.push({ tr, i });
  });
  return `<div class="list-group">${rows.map(({ tr, i, variants }) => {
    const head = `<div class="tr-head">
        <span class="row-title">${esc(className(tr.cls))} ${esc(tr.name)}</span>
        ${tr.double ? `<span class="badge">${esc(t('double'))}</span>` : ''}
        ${areaTag(tr.area)}${posBtn(tr.pos)}
      </div>`;
    if (variants && variants.length > 1) {
      return `<div class="row row--trainer" data-ref="t${i}">${head}
          <p class="hint">${esc(t('rivalNote'))}</p>
          ${variants.map(v => {
            const starter = v.tr.party.find(p => STARTER_IDS.has(p.id));
            return `<div class="variant"><span class="variant-label">${esc(starter ? t('withStarter', { p: nm(starter) }) : '')}</span>${partyHTML(v.tr.party)}</div>`;
          }).join('')}
        </div>`;
    }
    return `<div class="row row--trainer" data-ref="t${i}">${head}${partyHTML(tr.party)}</div>`;
  }).join('')}</div>`;
}

function wildHTML(l) {
  if (!l.wild.length) return `<p class="empty">${esc(t('noWild'))}</p>`;
  const lv = s => (s.min === s.max ? `${s.min}` : `${s.min}–${s.max}`);
  const monCell = s => `<span class="wild-mon"><img src="${monSprite(s.id)}" alt="" loading="lazy">${esc(nm(s))}</span>`;
  const simple = (title, list) => (list?.length ? `<div class="wild-block">
      <h4>${esc(title)}</h4>
      <table class="wild-table"><tbody>${list.map(s => `<tr><td>${monCell(s)}</td><td class="lv">${t('level')} ${lv(s)}</td><td class="pct">${s.p} %</td></tr>`).join('')}</tbody></table>
    </div>` : '');
  const grass = w => {
    if (!w.morning?.length) return '';
    const ids = [...new Set([...w.morning, ...w.day, ...w.night].map(s => s.id))];
    const get = (list, id) => list.find(s => s.id === id);
    const rows = ids.map(id => {
      const m = get(w.morning, id), d = get(w.day, id), n = get(w.night, id);
      const any = m || d || n;
      const pm = m?.p || 0, pd = d?.p || 0, pn = n?.p || 0;
      return { any, pm, pd, pn, lvl: lv({ min: Math.min(...[m, d, n].filter(Boolean).map(x => x.min)), max: Math.max(...[m, d, n].filter(Boolean).map(x => x.max)) }) };
    }).sort((a, b) => (b.pm + b.pd + b.pn) - (a.pm + a.pd + a.pn));
    const pct = p => (p ? `${p} %` : '–');
    return `<div class="wild-block">
        <h4>${esc(t('grass'))}</h4>
        <table class="wild-table"><thead><tr><th></th><th>${t('level')}</th><th>${esc(t('morning'))}</th><th>${esc(t('day'))}</th><th>${esc(t('night'))}</th></tr></thead>
        <tbody>${rows.map(r => `<tr><td>${monCell(r.any)}</td><td class="lv">${r.lvl}</td><td class="pct">${pct(r.pm)}</td><td class="pct">${pct(r.pd)}</td><td class="pct">${pct(r.pn)}</td></tr>`).join('')}</tbody></table>
      </div>`;
  };
  const extras = w => {
    const chips = [['swarm', w.swarm], ['radar', w.radar], ['dualSlot', w.dualSlot]].filter(([, list]) => list?.length);
    if (!chips.length) return '';
    return `<div class="wild-extras">${chips.map(([key, list]) => `<div><span class="extra-label">${esc(t(key))}:</span> ${list.map(s => `<span class="extra-mon"><img src="${monSprite(s.id)}" alt="" loading="lazy">${esc(nm(s))}</span>`).join('')}</div>`).join('')}</div>`;
  };
  return l.wild.map(w => `<div class="wild-area">
      ${l.wild.length > 1 || w.area ? `<h3>${esc(w.area ? areaName(w.area) : t('outside'))}</h3>` : ''}
      ${grass(w)}${simple(t('surf'), w.surf)}${simple(t('oldRod'), w.oldRod)}${simple(t('goodRod'), w.goodRod)}${simple(t('superRod'), w.superRod)}${extras(w)}
    </div>`).join('');
}

// ── Suche ─────────────────────────────────────────────────────────────────────
let searchIndex = [];
const norm = s => String(s || '').toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/ß/g, 'ss').replace(/[^a-z0-9]/g, '');
function buildSearchIndex() {
  searchIndex = [];
  D.locations.forEach((l, li) => {
    searchIndex.push({ type: 'loc', li, keys: [l.de, l.en].map(norm) });
    l.items.forEach((it, i) => searchIndex.push({ type: 'item', li, i, keys: [it.de, it.en, it.move?.de, it.move?.en].filter(Boolean).map(norm) }));
    l.trainers.forEach((tr, i) => searchIndex.push({ type: 'trainer', li, i, keys: [tr.name, CLASS_NAMES[tr.cls]?.[0], CLASS_NAMES[tr.cls]?.[1]].filter(Boolean).map(norm) }));
  });
}
function runSearch(q) {
  const key = norm(q);
  const box = $('search-results');
  if (key.length < 2) { box.hidden = true; return; }
  const scored = [];
  for (const e of searchIndex) {
    let best = -1;
    for (const k of e.keys) { if (k === key) best = Math.max(best, 3); else if (k.startsWith(key)) best = Math.max(best, 2); else if (k.includes(key)) best = Math.max(best, 1); }
    if (best >= 0) scored.push({ e, s: best + (e.type === 'loc' ? 0.5 : 0) });
  }
  scored.sort((a, b) => b.s - a.s);
  const top = scored.slice(0, 14);
  if (!top.length) { box.innerHTML = `<div class="sr-empty">${esc(t('noResults'))}</div>`; box.hidden = false; return; }
  box.innerHTML = top.map(({ e }, n) => {
    const l = D.locations[e.li];
    if (e.type === 'loc') return `<button type="button" class="sr" data-n="${n}"><span class="sr-ico">🗺️</span><span class="sr-main">${esc(locName(l))}</span><small>${esc(typeLabel(l))}</small></button>`;
    if (e.type === 'item') {
      const it = l.items[e.i];
      const kind = it.kind === 'hidden' ? t('kHiddenOne') : it.kind === 'gift' ? t('kGiftOne') : t('kBallOne');
      return `<button type="button" class="sr" data-n="${n}"><img class="sr-ico" src="${itemSprite(it)}" alt="" onerror="this.style.visibility='hidden'"><span class="sr-main">${esc(itemName(it))}</span><small>${esc(kind)} · ${esc(locName(l))}</small></button>`;
    }
    const tr = l.trainers[e.i];
    return `<button type="button" class="sr" data-n="${n}"><span class="sr-ico">👤</span><span class="sr-main">${esc(className(tr.cls))} ${esc(tr.name)}</span><small>${esc(locName(l))}</small></button>`;
  }).join('');
  box.hidden = false;
  box.querySelectorAll('.sr').forEach(b => b.addEventListener('click', () => pickResult(top[+b.dataset.n].e)));
}
function pickResult(e) {
  $('search-results').hidden = true;
  $('map-search').blur();
  if (e.type === 'loc') { selectLocation(e.li, { fly: true }); return; }
  const l = D.locations[e.li];
  const entry = e.type === 'item' ? l.items[e.i] : l.trainers[e.i];
  selectLocation(e.li, { tab: e.type === 'item' ? 'items' : 'trainers', focus: `${e.type === 'item' ? 'i' : 't'}${e.i}`, fly: !entry.pos });
  if (entry.pos) flyToTile(entry.pos[0], entry.pos[1]);
  if (matchMedia('(max-width: 900px)').matches) $('side').scrollIntoView({ behavior: 'smooth', block: 'start' });
}
let searchTimer = null;
$('map-search').addEventListener('input', e => { clearTimeout(searchTimer); searchTimer = setTimeout(() => runSearch(e.target.value), 120); });
$('map-search').addEventListener('keydown', e => {
  if (e.key === 'Escape') { $('search-results').hidden = true; e.target.blur(); }
  if (e.key === 'Enter') $('search-results').querySelector('.sr')?.click();
});
document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) $('search-results').hidden = true; });

// ── Sprache ───────────────────────────────────────────────────────────────────
function applyLang() {
  const dict = tr();
  document.querySelectorAll('[data-i18n]').forEach(el => { const v = dict[el.dataset.i18n]; if (typeof v === 'string') el.textContent = v; });
  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => { const v = dict[el.dataset.i18nPlaceholder]; if (typeof v === 'string') el.placeholder = v; });
  $('lang-toggle').textContent = window.LANG.toUpperCase();
  if (!D) return;
  labelLayer?.eachLayer(m => { const el = m.getElement()?.querySelector('span'); if (el) el.textContent = locName(D.locations[m.locIndex]); });
  if (selected >= 0) renderLocation(selected); else renderDirectory();
}
// Direktlinks wie …/Karte/#route-206 auch ohne Neuladen
window.addEventListener('hashchange', () => {
  if (!D) return;
  const li = locationFromHash();
  if (li >= 0 && li !== selected) selectLocation(li, { fly: true });
});

$('lang-toggle').addEventListener('click', () => {
  window.LANG = window.LANG === 'de' ? 'en' : 'de';
  localStorage.setItem('hub-lang', window.LANG);
  document.documentElement.lang = window.LANG;
  applyLang();
});

init();
