/*
 * Interaktive Karte von Sinnoh (Pokémon Platin).
 * Daten: platin.json (tools/build-platin.js) und die Kartenkacheln in tiles/ (tools/render-platin.js +
 * tools/make-tiles.py) – beides aus pret/pokeplatinum, das Kartenbild aus den 3D-Modellen des Spiels.
 * Koordinaten sind Spiel-Kacheln: x nach rechts, z nach unten. Leaflet (CRS.Simple) bekommt [−z, x].
 * Das Bild zeigt die Welt aus dem Blickwinkel der Spielkamera: höher gelegene Stellen erscheinen weiter oben.
 */
window.LANG = localStorage.getItem('hub-lang') || 'de';
document.documentElement.lang = window.LANG;

// Schlichte Symbole statt Emojis (Farbe aus der Schrift)
const ICON_PIN = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 21s-6.5-5.7-6.5-11a6.5 6.5 0 0 1 13 0c0 5.3-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';
const ICON_MAP = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 6.5 9 4l6 2.5L21 4v13.5L15 20l-6-2.5L3 20z"/><path d="M9 4v13.5M15 6.5V20"/></svg>';
const ICON_SWORDS = '<svg class="ico" viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 26 20 12m0 0 3-6 3-1-1 3-6 3M26 26 12 12m0 0-3-6-3-1 1 3 6 3M9 23l-2 2m16-2 2 2"/></svg>';
const ICON_PERSON = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></svg>';

const TRANSLATIONS = {
  de: {
    title: 'Karte von Sinnoh',
    gameBadge: 'Platin',
    subtitle: 'Items, versteckte Items, TMs, Trainer und wilde Pokémon – an ihrer echten Stelle im Spiel.',
    searchPlaceholder: 'Ort, Item, TM oder Trainer suchen…',
    fItem: 'Items', fHidden: 'Versteckt', fTm: 'TMs', fGift: 'Geschenke', fTrainer: 'Trainer', fEntrance: 'Eingänge',
    loading: 'Karte wird geladen…',
    loadError: 'Die Kartendaten konnten nicht geladen werden.',
    note: 'Karte aus den 3D-Modellen und Texturen von Platin gerendert, Positionen und Inhalte aus dem Spielcode (pret/pokeplatinum).',
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
    interiorMaps: 'Innenkarten', showInside: 'In der Innenkarte zeigen', noMap: 'ohne Karte', backToMap: 'Sinnoh-Karte',
    toPlanner: 'Im Boss-Planer: Team, Attacken und wie dein Team dagegen abschneidet',
  },
  en: {
    title: 'Map of Sinnoh',
    gameBadge: 'Platinum',
    subtitle: 'Items, hidden items, TMs, trainers and wild Pokémon – at their real spot in the game.',
    searchPlaceholder: 'Search place, item, TM or trainer…',
    fItem: 'Items', fHidden: 'Hidden', fTm: 'TMs', fGift: 'Gifts', fTrainer: 'Trainers', fEntrance: 'Entrances',
    loading: 'Loading map…',
    loadError: 'The map data could not be loaded.',
    note: 'Map rendered from Platinum\'s own 3D models and textures; positions and contents from the game code (pret/pokeplatinum).',
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
    interiorMaps: 'Inside maps', showInside: 'Show on the inside map', noMap: 'no map', backToMap: 'Sinnoh map',
    toPlanner: 'In the Boss Planner: team, moves and how your team does against it',
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

// ── Trainerklassen und -namen (gemeinsam mit dem Boss-Planer: trainer-classes.js) ──
const className = cls => TrainerClasses.className(cls, isEn());
const trainerName = (name, cls) => TrainerClasses.trainerName(name, isEn(), cls);
const trainerTitle = (cls, name) => [className(cls), trainerName(name, cls)].filter(Boolean).join(' ');
const CLASS_NAMES = TrainerClasses.CLASS_NAMES;

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
let TILES = null;      // Kartenblätter + Bodenhöhen (tiles/index.json)
let ground = null;     // entpackte Bodenhöhen
let NATIVE_ZOOM = 4;   // Zoomstufe der feinsten Blätter (1 Bildpixel = 1 Spielpixel)
let MAX_ZOOM = 6;
let map = null;
const layers = {};     // Marker je Art
// Beim Öffnen sind alle Filter aus – sonst ist die ganze Karte voller Punkte. Ein Tipp auf einen Filter zeigt ihn.
const shown = new Set();
let selected = -1;
let currentTab = 'items';
let selLayer = null, labelLayer = null, focusMarker = null;
let seaLayer = null, sheetPanes = [], landBounds = null;
// Innenkarten (Höhlen, Gebäude …): interiors.json wird erst beim ersten Öffnen geladen
let INT = null;        // Atlanten, Lage jeder Innenkarte, Bodenhöhen
let inMap = null;      // geöffnete Innenkarte (Schlüssel aus D.maps) – null = Oberwelt
let inGround = null, inLayer = null;
const inLayers = {};   // Marker je Art in der Innenkarte
const ll = (x, z) => L.latLng(-z, x);

// ── Schrägsicht ───────────────────────────────────────────────────────────────
// Die Karte ist aus dem Blickwinkel der Spielkamera gerendert: eine Stelle in Höhe h (Kacheln) erscheint um
// shear·h weiter oben. Bodenhöhen je Block: eine Zahl (eben) oder 1024 Bytes (Höhe·4 + 16); bei Brücken
// stehen alle Ebenen einer Kachel in „multi", die Höhe y aus den Spieldaten wählt die richtige.
function decodeGround(idx) {
  const grid = new Map(), median = new Map();
  for (const [key, v] of Object.entries(idx.ground || {})) {
    if (typeof v === 'number') { grid.set(key, v); median.set(key, v); continue; }
    const bin = atob(v), arr = new Float32Array(bin.length);
    for (let i = 0; i < bin.length; i++) arr[i] = (bin.charCodeAt(i) - 16) / 4;
    grid.set(key, arr);
    median.set(key, [...arr].sort((a, b) => a - b)[arr.length >> 1]);
  }
  return { shear: idx.shear || 0, grid, median, multi: idx.multi || {} };
}
function groundAt(g, x, z, y) {
  const CH = D.chunk, tx = Math.floor(x), tz = Math.floor(z);
  const multi = g.multi[`${tx}_${tz}`];
  if (multi && y != null) return multi.reduce((a, b) => (Math.abs(b - y) < Math.abs(a - y) ? b : a));
  const r = Math.floor(tz / CH), c = Math.floor(tx / CH);
  const v = g.grid.get(`${r}:${c}`);
  if (v == null) return 0;
  return typeof v === 'number' ? v : v[(tz - r * CH) * CH + (tx - c * CH)];
}
// Bodenhöhen der gerade gezeigten Karte (Oberwelt oder Innenkarte)
const liftAt = (x, z, y) => { const g = inMap ? inGround : ground; return g ? g.shear * groundAt(g, x, z, y) : 0; };
const chunkLift = (r, c) => (ground ? ground.shear * (ground.median.get(`${r}:${c}`) ?? 0) : 0);
// Spielkachel (x, z, Höhe y) → Punkt auf dem Bild
const llg = (x, z, y) => ll(x, z - liftAt(x, z, y));
// Punkt auf dem Bild → Spielkachel (Verschiebung rückwärts auflösen)
function tileAt(latlng) {
  const x = latlng.lng, sz = -latlng.lat;
  let z = sz;
  for (let i = 0; i < 4; i++) z = sz + liftAt(x, z);
  return { x, z };
}
const parsePos = s => s.split(',').map(v => (v === '' ? undefined : +v));

// Kartenbild: wenige große Blätter je Detailstufe (tiles/<z>/<x>_<y>.webp, 2^z Pixel pro Spielkachel).
// Die Übersicht (kleinste Stufe) liegt immer ganz unten; darüber nur die Blätter, die gerade zu sehen sind –
// die gröbere Stufe bleibt drunter, bis die feinere geladen ist.
function setupSheets() {
  const W = D.width, H = D.height;
  const levels = [...TILES.levels].sort((a, b) => a.z - b.z).map((lv, i) => {
    const pane = map.createPane(`sheets${lv.z}`);
    pane.style.zIndex = 210 + i;
    pane.style.pointerEvents = 'none';
    const span = lv.size / Math.pow(2, lv.z), px = 1 / Math.pow(2, lv.z); // Spielkacheln je Blatt / je Pixel
    const sheets = lv.sheets.map(key => {
      const [sx, sy] = key.split('_').map(Number);
      const x0 = sx * span, z0 = sy * span;
      // 1 Pixel Überlappung nach rechts/unten, damit bei Zwischen-Zoomstufen keine Fuge durchscheint
      const x1 = Math.min(W, x0 + span) + px, z1 = Math.min(H, z0 + span) + px;
      return { url: `tiles/${lv.z}/${key}.webp`, bounds: L.latLngBounds(ll(x0, z1), ll(x1, z0)), layer: null };
    });
    return { z: lv.z, pane: `sheets${lv.z}`, sheets };
  });
  sheetPanes = levels.map(lv => map.getPane(lv.pane));
  const show = (lv, s, on) => {
    if (on && !s.layer) s.layer = L.imageOverlay(s.url, s.bounds, { pane: lv.pane, className: 'game-sheet', interactive: false }).addTo(map);
    else if (!on && s.layer) { map.removeLayer(s.layer); s.layer = null; }
  };
  const update = () => {
    if (inMap) return; // in einer Innenkarte bleibt die Oberwelt, wie sie ist
    const zoom = map.getZoom(), view = map.getBounds().pad(0.3);
    levels.forEach((lv, i) => {
      // Stufe ab etwa 1¼ Zoomstufen unter ihrer vollen Auflösung zeigen; die gröbste immer
      const on = i === 0 || zoom >= lv.z - 1.25;
      for (const s of lv.sheets) show(lv, s, on && (i === 0 || view.intersects(s.bounds)));
    });
  };
  map.on('moveend zoomend', update);
  map.on('overworld', update);
  update();
}
// Offenes Meer: Wassermuster aus dem Spiel (tiles/sea.png), an den Weltkoordinaten ausgerichtet
const SeaLayer = L.GridLayer.extend({
  createTile(coords) {
    const el = document.createElement('div');
    el.className = 'sea-tile';
    const size = this.options.pattern * Math.pow(2, coords.z - this.options.nativeZoom);
    if (size >= 2) el.style.backgroundSize = `${size}px ${size}px`;
    else el.style.backgroundImage = 'none';
    return el;
  },
});

// ── Start ─────────────────────────────────────────────────────────────────────
async function init() {
  applyLang();
  try {
    const [r1, r2] = await Promise.all([fetch('platin.json'), fetch('tiles/index.json')]);
    if (!r1.ok || !r2.ok) throw new Error(r1.ok ? r2.status : r1.status);
    [D, TILES] = await Promise.all([r1.json(), r2.json()]);
    ground = decodeGround(TILES);
    NATIVE_ZOOM = Math.max(...TILES.levels.map(lv => lv.z));
    MAX_ZOOM = NATIVE_ZOOM + 2;
  } catch (e) {
    $('map-loading').textContent = t('loadError');
    return;
  }
  setupMap();
  buildMarkers();
  buildSearchIndex();
  setupInteriorBar();
  $('map-loading').hidden = true;
  const fromHash = locationFromHash();
  if (fromHash.li >= 0) {
    selectLocation(fromHash.li, { fly: !fromHash.map });
    if (fromHash.map) openInterior(fromHash.map);
  } else renderDirectory();
}

function setupMap() {
  const CH = D.chunk;
  map = L.map('map', {
    crs: L.CRS.Simple, minZoom: -1.5, maxZoom: MAX_ZOOM, zoomSnap: 0.25, zoomDelta: 0.5, wheelPxPerZoomLevel: 90,
    // SVG statt Canvas: base.css zwingt jedes <canvas> auf 100 % Breite, das würde Leaflets Zeichenfläche verzerren
    attributionControl: false, preferCanvas: false, zoomControl: true,
  });
  if (TILES.sea) seaLayer = new SeaLayer({ pattern: TILES.sea, nativeZoom: NATIVE_ZOOM, minZoom: -2, maxZoom: MAX_ZOOM }).addTo(map);
  map.createPane('interior').style.zIndex = 230;

  // Ausschnitt: alle Blöcke, die zu einem Ort gehören
  let minR = 99, maxR = 0, minC = 99, maxC = 0;
  D.chunks.forEach((row, r) => row.forEach((li, c) => {
    if (li < 0) return;
    minR = Math.min(minR, r); maxR = Math.max(maxR, r); minC = Math.min(minC, c); maxC = Math.max(maxC, c);
  }));
  const land = L.latLngBounds(ll(minC * CH, (maxR + 1) * CH), ll((maxC + 1) * CH, minR * CH));
  landBounds = land.pad(0.35);
  map.fitBounds(land, { padding: [10, 10] });
  map.setMaxBounds(landBounds);
  setupSheets();

  // Ortsnamen
  labelLayer = L.layerGroup().addTo(map);
  D.locations.forEach((l, li) => {
    if (!l.label || !l.chunks) return;
    const m = L.marker(llg(l.label[0], l.label[1]), {
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
    const { x, z } = tileAt(latlng);
    return D.chunks[Math.floor(z / CH)]?.[Math.floor(x / CH)] ?? -1;
  };
  map.on('mousemove', e => {
    if (inMap || matchMedia('(pointer: coarse)').matches) return;
    const li = chunkAt(e.latlng);
    const box = $('hover-name');
    if (li < 0) { box.hidden = true; map.getContainer().style.cursor = ''; return; }
    box.hidden = false;
    box.textContent = locName(D.locations[li]);
    map.getContainer().style.cursor = 'pointer';
  });
  map.on('mouseout', () => { $('hover-name').hidden = true; });
  map.on('click', e => {
    if (inMap) return;
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
  // Über der Auflösung der Kacheln: Pixel scharf vergrößern statt verschwimmen lassen
  el.classList.toggle('z-pixel', z >= NATIVE_ZOOM + 0.75);
  const scale = z >= 4.5 ? 2.1 : z >= 2.5 ? 1.6 : z >= 1.5 ? 1.3 : z >= 0.5 ? 1 : 0.75;
  for (const kind of KINDS) for (const g of [layers[kind], inLayers[kind]]) g?.eachLayer(m => m.setRadius(STYLE[kind].radius * scale));
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
  if (m.k === 'entrance') return `${t('kEntrance')}: ${D.maps?.[m.to] ? mapTitle(m.to) : locName(loc)}`;
  if (m.k === 'trainer') {
    const lv = entry.party.map(p => p.lv);
    const lvText = lv.length ? ` · ${t('level')} ${Math.min(...lv)}${Math.max(...lv) !== Math.min(...lv) ? '–' + Math.max(...lv) : ''}` : '';
    return `${trainerTitle(entry.cls, entry.name)}${lvText}`;
  }
  const kind = entry.kind === 'hidden' ? t('kHiddenOne') : entry.kind === 'gift' ? t('kGiftOne') : t('kBallOne');
  return `${kind}: ${itemName(entry)}${entry.qty > 1 ? ' ×' + entry.qty : ''}`;
}

function buildMarkers() {
  const renderer = L.svg({ padding: 0.3 });
  for (const kind of KINDS) layers[kind] = L.layerGroup();   // auf die Karte kommen sie über syncKinds (Filter)
  const counts = Object.fromEntries(KINDS.map(k => [k, 0]));
  for (const m of D.markers) {
    const marker = L.circleMarker(llg(m.x + 0.5, m.z + 0.5, m.y), { ...STYLE[m.k], renderer, bubblingMouseEvents: false });
    marker.bindTooltip(() => esc(markerText(m)), { direction: 'top', offset: [0, -6], className: 'map-tip' });
    marker.on('click', () => {
      // Eingänge führen – wenn es dazu eine Innenkarte gibt – gleich hinein
      if (m.k === 'entrance') { selectLocation(m.l, { fly: false }); if (D.maps?.[m.to]) openInterior(m.to); }
      else selectLocation(m.l, { tab: m.k === 'trainer' ? 'trainers' : 'items', focus: `${m.k === 'trainer' ? 't' : 'i'}${m.i}` });
    });
    layers[m.k].addLayer(marker);
    counts[m.k]++;
  }
  // Innen liegen nochmal so viele Marker – die Zahl auf den Chips zählt beide
  for (const im of Object.values(D.maps || {})) for (const m of im.markers) counts[m.k]++;
  document.querySelectorAll('#filter-chips .chip').forEach(chip => {
    const kind = chip.dataset.kind;
    chip.querySelector('b').textContent = counts[kind];
    chip.addEventListener('click', () => {
      const on = !shown.has(kind);
      if (on) shown.add(kind); else shown.delete(kind);
      syncKinds();
      chip.classList.toggle('is-on', on);
      chip.setAttribute('aria-pressed', String(on));
    });
  });
  syncKinds();
  onZoom();
}
// Marker-Ebenen passend zu Filtern und Ansicht (Oberwelt oder Innenkarte) zeigen
function syncKinds() {
  for (const kind of KINDS) {
    const wantOw = !inMap && shown.has(kind), wantIn = !!inMap && shown.has(kind);
    if (layers[kind]) { if (wantOw) layers[kind].addTo(map); else map.removeLayer(layers[kind]); }
    if (inLayers[kind]) { if (wantIn) inLayers[kind].addTo(map); else map.removeLayer(inLayers[kind]); }
  }
}

// Kurz aufleuchtender Ring an einer Stelle
function pulseAt(x, z, y) {
  if (focusMarker) map.removeLayer(focusMarker);
  focusMarker = L.marker(llg(x + 0.5, z + 0.5, y), {
    icon: L.divIcon({ className: 'focus-ring', html: '<span></span>', iconSize: [36, 36] }),
    interactive: false, keyboard: false,
  }).addTo(map);
  const ref = focusMarker;
  setTimeout(() => { if (focusMarker === ref) { map.removeLayer(ref); focusMarker = null; } }, 2600);
}
function flyToTile(x, z, y, minZoom = 2.5) {
  map.flyTo(llg(x + 0.5, z + 0.5, y), Math.max(map.getZoom(), minZoom), { duration: 0.6 });
  pulseAt(x, z, y);
}

// ── Innenkarten ───────────────────────────────────────────────────────────────
// Jede Innenkarte ist ein Ausschnitt aus einem Atlas-Bild (tiles/in/<n>.webp), in eigenen Spielkacheln.
const imageKey = m => `${m.matrix}__${m.areaData}`;
const mapTitle = key => { const m = D.maps[key]; return m.area ? `${locName(D.locations[m.l])} · ${areaName(m.area)}` : locName(D.locations[m.l]); };
const mapsOf = li => Object.keys(D.maps || {}).filter(k => D.maps[k].l === li)
  .sort((a, b) => areaName(D.maps[a].area || '').localeCompare(areaName(D.maps[b].area || ''), window.LANG, { numeric: true }));
const SVGNS = 'http://www.w3.org/2000/svg';

async function openInterior(key, opts = {}) {
  const m = D.maps?.[key];
  if (!m) return;
  try {
    if (!INT) { const r = await fetch('tiles/interiors.json'); if (!r.ok) throw new Error(r.status); INT = await r.json(); }
  } catch (e) { return; }
  const img = INT.images[imageKey(m)];
  if (!img) return;
  if (inLayer) map.removeLayer(inLayer);
  for (const kind of KINDS) if (inLayers[kind]) map.removeLayer(inLayers[kind]);
  if (!inMap) {
    // Oberwelt ausblenden
    sheetPanes.forEach(p => { p.style.display = 'none'; });
    if (seaLayer) map.removeLayer(seaLayer);
    map.removeLayer(labelLayer);
    map.removeLayer(selLayer);
    if (focusMarker) { map.removeLayer(focusMarker); focusMarker = null; }
    $('hover-name').hidden = true;
    map.getContainer().style.cursor = '';
    map.getContainer().classList.add('is-interior');
  }
  inMap = key;
  inGround = decodeGround({ ...INT.ground[imageKey(m)], shear: INT.shear });

  // Bild: Ausschnitt des Atlas per SVG-viewBox, auf die Lage der Karte gespannt
  const [aw, ah] = INT.atlases[img.a];
  const svg = document.createElementNS(SVGNS, 'svg');
  svg.setAttribute('viewBox', `${img.x} ${img.y} ${img.w} ${img.h}`);
  svg.setAttribute('preserveAspectRatio', 'none');
  const image = document.createElementNS(SVGNS, 'image');
  image.setAttribute('href', `tiles/in/${img.a}.webp`);
  image.setAttribute('width', aw);
  image.setAttribute('height', ah);
  svg.appendChild(image);
  const px = INT.px, x0 = img.ox, z0 = img.oz, x1 = x0 + img.w / px, z1 = z0 + img.h / px;
  const bounds = L.latLngBounds(ll(x0, z1), ll(x1, z0));
  inLayer = L.layerGroup([L.svgOverlay(svg, bounds, { pane: 'interior', className: 'game-sheet', interactive: false })]).addTo(map);

  // Marker: Items, Trainer … und die Ausgänge (Treppen, Türen)
  const renderer = L.svg({ padding: 0.3 });
  for (const kind of KINDS) inLayers[kind] = L.layerGroup();
  for (const mk of m.markers) {
    const mm = { ...mk, l: m.l };
    const marker = L.circleMarker(llg(mk.x + 0.5, mk.z + 0.5, mk.y), { ...STYLE[mk.k], renderer, bubblingMouseEvents: false });
    marker.bindTooltip(() => esc(markerText(mm)), { direction: 'top', offset: [0, -6], className: 'map-tip' });
    marker.on('click', () => selectLocation(m.l, { keepInterior: true, tab: mk.k === 'trainer' ? 'trainers' : 'items', focus: `${mk.k === 'trainer' ? 't' : 'i'}${mk.i}` }));
    inLayers[mk.k].addLayer(marker);
  }
  for (const e of m.exits) {
    const marker = L.circleMarker(llg(e.x + 0.5, e.z + 0.5), { ...STYLE.entrance, renderer, bubblingMouseEvents: false, className: e.to || e.ow ? 'exit-mark' : 'exit-mark is-dead' });
    marker.bindTooltip(() => esc(exitText(e)), { direction: 'top', offset: [0, -6], className: 'map-tip' });
    marker.on('click', () => {
      if (e.to) openInterior(e.to);
      else if (e.ow) { closeInterior({ to: e.ow }); selectLocation(e.l, { fly: false }); }
    });
    inLayers.entrance.addLayer(marker);
  }
  syncKinds();
  onZoom();

  map.setMaxBounds(bounds.pad(0.6));
  if (opts.focus) {
    const [x, z, y] = opts.focus;
    map.setView(llg(x + 0.5, z + 0.5, y), Math.max(map.getZoom(), 3), { animate: false });
    pulseAt(x, z, y);
  } else map.fitBounds(bounds, { padding: [24, 24], maxZoom: 3.5, animate: false });
  renderInteriorBar();
  if (selected === m.l) renderLocation(selected, opts.ref);
  history.replaceState(null, '', `#${slug(D.locations[m.l].en)}~${key.toLowerCase()}`);
}

function closeInterior(opts = {}) {
  if (!inMap) return;
  const back = D.maps[inMap];
  if (inLayer) map.removeLayer(inLayer);
  for (const kind of KINDS) if (inLayers[kind]) { map.removeLayer(inLayers[kind]); delete inLayers[kind]; }
  inLayer = null; inMap = null; inGround = null;
  if (focusMarker) { map.removeLayer(focusMarker); focusMarker = null; }
  sheetPanes.forEach(p => { p.style.display = ''; });
  if (seaLayer) seaLayer.addTo(map);
  labelLayer.addTo(map);
  selLayer.addTo(map);
  map.getContainer().classList.remove('is-interior');
  map.setMaxBounds(landBounds);
  syncKinds();
  onZoom();
  renderInteriorBar();
  if (opts.to) {
    map.setView(llg(opts.to[0] + 0.5, opts.to[1] + 0.5), 3, { animate: false });
    pulseAt(opts.to[0], opts.to[1]);
  } else if (opts.fly !== false) {
    const li = selected >= 0 ? selected : back.l, l = D.locations[li];
    const b = locationBounds(l.chunks || l.entrances ? li : l.via);
    if (b) map.fitBounds(b, { padding: [40, 40], maxZoom: 2, animate: false });
  }
  map.fire('overworld');
  if (selected >= 0) {
    renderLocation(selected);
    history.replaceState(null, '', `#${slug(D.locations[selected].en)}`);
  }
}

function exitText(e) {
  if (e.to) return `→ ${mapTitle(e.to)}`;
  if (e.ow) return `→ ${t('outside')}: ${locName(D.locations[e.l])}`;
  return `→ ${locName(D.locations[e.l])}${e.a ? ' · ' + areaName(e.a) : ''} (${t('noMap')})`;
}

// Leiste über der Innenkarte: zurück zur Oberwelt + Wechsel zwischen den Bereichen des Ortes
function setupInteriorBar() {
  $('interior-back').addEventListener('click', () => closeInterior());
  $('interior-select').addEventListener('change', e => openInterior(e.target.value));
}
function renderInteriorBar() {
  const bar = $('interior-bar');
  bar.hidden = !inMap;
  if (!inMap) return;
  const m = D.maps[inMap];
  $('interior-title').textContent = locName(D.locations[m.l]);
  const keys = mapsOf(m.l);
  $('interior-select').innerHTML = keys.map(k => `<option value="${esc(k)}"${k === inMap ? ' selected' : ''}>${esc(areaName(D.maps[k].area) || locName(D.locations[m.l]))}</option>`).join('');
  $('interior-select').hidden = keys.length < 2;
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
    // Block um seine typische Bodenhöhe nach oben versetzt, wie im Bild
    const up = chunkLift(r, c);
    const x0 = c * CH, x1 = (c + 1) * CH, z0 = r * CH - up, z1 = (r + 1) * CH - up;
    selLayer.addLayer(L.rectangle(L.latLngBounds(ll(x0, z1), ll(x1, z0)),
      { stroke: false, fillColor: '#57d2ff', fillOpacity: 0.12, interactive: false }));
    if (!own(r - 1, c)) segments.push([ll(x0, z0), ll(x1, z0)]);
    if (!own(r + 1, c)) segments.push([ll(x0, z1), ll(x1, z1)]);
    if (!own(r, c - 1)) segments.push([ll(x0, z0), ll(x0, z1)]);
    if (!own(r, c + 1)) segments.push([ll(x1, z0), ll(x1, z1)]);
  }));
  if (segments.length) selLayer.addLayer(L.polyline(segments, { color: '#57d2ff', weight: 2, opacity: 0.95, interactive: false }));
  // Höhlen und Gebäude: Eingänge hervorheben
  for (const [x, z] of D.locations[li].entrances || []) {
    selLayer.addLayer(L.circleMarker(llg(x + 0.5, z + 0.5), { radius: 11, color: '#b48cff', weight: 2, fill: false, interactive: false }));
  }
  labelLayer.eachLayer(m => m.getElement()?.classList.toggle('is-selected', m.locIndex === li));
}

function locationBounds(li) {
  const l = D.locations[li], CH = D.chunk;
  const pts = [];
  D.chunks.forEach((row, r) => row.forEach((v, c) => {
    if (v === li) { const up = chunkLift(r, c); pts.push(ll(c * CH, r * CH - up), ll((c + 1) * CH, (r + 1) * CH - up)); }
  }));
  for (const [x, z] of l.entrances || []) pts.push(llg(x + 0.5, z + 0.5));
  return pts.length ? L.latLngBounds(pts) : null;
}

function selectLocation(li, opts = {}) {
  // Ein anderer Ort aus Liste, Suche oder Karte: zurück auf die Oberwelt
  if (inMap && !opts.keepInterior) closeInterior({ fly: false });
  selected = li;
  const l = D.locations[li];
  if (opts.tab) currentTab = opts.tab;
  else if (!opts.keepTab) currentTab = l.items.length ? 'items' : l.trainers.length ? 'trainers' : 'wild';
  drawSelection(l.chunks || l.entrances ? li : (l.via ?? -1));
  renderLocation(li, opts.focus);
  history.replaceState(null, '', `#${slug(l.en)}${inMap ? '~' + inMap.toLowerCase() : ''}`);
  if (opts.fly && !inMap) {
    const b = locationBounds(l.chunks || l.entrances ? li : l.via);
    if (b) map.flyToBounds(b, { padding: [40, 40], maxZoom: 2, duration: 0.6 });
  }
  if (opts.fromMap && matchMedia('(max-width: 900px)').matches) showMobileChip(li);
}
const slug = s => String(s).toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
// #ort oder #ort~innenkarte
function locationFromHash() {
  const [h, inner] = decodeURIComponent(location.hash.slice(1)).split('~');
  if (!h) return { li: -1 };
  const map = inner && Object.keys(D.maps || {}).find(k => k.toLowerCase() === inner);
  return { li: D.locations.findIndex(l => slug(l.en) === h), map };
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
  if (inMap) closeInterior({ fly: false });
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
    ? `<div class="ent-row"><span>${esc(t('entrances'))}:</span>${l.entrances.map(([x, z], n) => `<button type="button" class="mini-btn" data-goto="${x},${z}">${ICON_PIN}${esc(t('entranceN', { n: n + 1 }))}</button>`).join('')}</div>`
    : '';
  // Innenkarten des Ortes (Stockwerke, Räume, Gebäude)
  const mapKeys = mapsOf(li);
  const inside = mapKeys.length
    ? `<div class="ent-row map-row"><span>${esc(t('interiorMaps'))}:</span>${mapKeys.map(k => `<button type="button" class="mini-btn map-btn${k === inMap ? ' is-on' : ''}" data-map="${esc(k)}">${ICON_MAP}${esc(areaName(D.maps[k].area) || locName(l))}</button>`).join('')}</div>`
    : '';
  const tab = (key, label, count, disabled) => `<button type="button" class="tab${currentTab === key ? ' is-active' : ''}" data-tab="${key}"${disabled ? ' disabled' : ''}>${esc(label)}${count != null ? ` <small>${count}</small>` : ''}</button>`;
  const wildCount = l.wild.length;
  $('side-content').innerHTML = `
    <div class="side-head">
      <button type="button" class="back-btn" id="back-btn">← ${esc(t('back'))}</button>
      <h2>${esc(locName(l))}</h2>
      <p class="loc-sub">${esc(sub)}</p>
      ${stats.length ? `<div class="stat-chips">${stats.map(s => `<span>${esc(s)}</span>`).join('')}</div>` : ''}
      ${via}${ents}${inside}
    </div>
    <div class="tabs">
      ${tab('items', t('tabItems'), l.items.length, !l.items.length)}
      ${tab('trainers', t('tabTrainers'), l.trainers.length, !l.trainers.length)}
      ${tab('wild', t('tabWild'), null, !wildCount)}
    </div>
    <div class="tab-body" id="tab-body"></div>`;
  $('back-btn').addEventListener('click', renderDirectory);
  $('side-content').querySelector('.via-link')?.addEventListener('click', e => selectLocation(+e.currentTarget.dataset.loc, { fly: true }));
  $('side-content').querySelectorAll('[data-goto]').forEach(b => b.addEventListener('click', () => {
    const [x, z] = b.dataset.goto.split(',').map(Number);
    if (inMap) closeInterior({ fly: false });
    flyToTile(x, z, undefined, 2);
  }));
  $('side-content').querySelectorAll('.map-btn').forEach(b => b.addEventListener('click', () => openInterior(b.dataset.map)));
  $('side-content').querySelectorAll('.tab').forEach(b => b.addEventListener('click', () => { currentTab = b.dataset.tab; renderLocation(li); }));
  // Leeren Tab vermeiden
  if ((currentTab === 'items' && !l.items.length) || (currentTab === 'trainers' && !l.trainers.length) || (currentTab === 'wild' && !wildCount)) {
    currentTab = l.items.length ? 'items' : l.trainers.length ? 'trainers' : 'wild';
    $('side-content').querySelectorAll('.tab').forEach(b => b.classList.toggle('is-active', b.dataset.tab === currentTab));
  }
  const body = $('tab-body');
  body.innerHTML = currentTab === 'items' ? itemsHTML(l) : currentTab === 'trainers' ? trainersHTML(l) : wildHTML(l);
  // Stecknadel: auf der Oberwelt hinfliegen bzw. die Innenkarte öffnen, in der das Item oder der Trainer steht
  body.querySelectorAll('[data-pos]').forEach(b => b.addEventListener('click', () => {
    const [x, z, y] = parsePos(b.dataset.pos), inside = b.dataset.map;
    if (inside && inside === inMap) flyToTile(x, z, y, 3);
    else if (inside) openInterior(inside, { focus: [x, z, y], ref: b.closest('[data-ref]')?.dataset.ref });
    else { if (inMap) closeInterior({ fly: false }); flyToTile(x, z, y); }
  }));
  if (focus) {
    const row = body.querySelector(`[data-ref="${focus}"]`);
    if (row) {
      row.classList.add('is-flash');
      row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      const pin = row.querySelector('[data-pos]');
      if (pin && (pin.dataset.map ?? null) === inMap) { const [x, z, y] = parsePos(pin.dataset.pos); pulseAt(x, z, y); }
    }
  }
}

const posBtn = e => (e.pos ? `<button type="button" class="pin" data-pos="${e.pos[0]},${e.pos[1]},${e.pos[2] ?? ''}"${e.map ? ` data-map="${esc(e.map)}"` : ''} title="${esc(t(e.map ? 'showInside' : 'showOnMap'))}" aria-label="${esc(t(e.map ? 'showInside' : 'showOnMap'))}">${ICON_PIN}</button>` : '');
// Bereiche wie im Großmoor heißen nur „1"–„6"
// Bereichsnamen stehen in platin.json auf Deutsch, die englischen in D.areaEn
const areaName = area => (/^\d+$/.test(area) ? t('areaN', { n: area }) : (isEn() && D.areaEn?.[area]) || area);
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
            ${areaTag(it.area)}${posBtn(it)}
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
        <span class="row-title">${esc(trainerTitle(tr.cls, tr.name))}</span>
        ${tr.double ? `<span class="badge">${esc(t('double'))}</span>` : ''}
        ${areaTag(tr.area)}${posBtn(tr)}
        <a class="pin" href="../Bosse/index.html#${esc(tr.id)}" title="${esc(t('toPlanner'))}" aria-label="${esc(t('toPlanner'))}">${ICON_SWORDS}</a>
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
    l.trainers.forEach((tr, i) => searchIndex.push({ type: 'trainer', li, i, keys: [TrainerClasses.trainerName(tr.name, true, tr.cls), TrainerClasses.trainerName(tr.name, false, tr.cls), CLASS_NAMES[tr.cls]?.[0], CLASS_NAMES[tr.cls]?.[1]].filter(Boolean).map(norm) }));
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
    if (e.type === 'loc') return `<button type="button" class="sr" data-n="${n}"><span class="sr-ico">${ICON_MAP}</span><span class="sr-main">${esc(locName(l))}</span><small>${esc(typeLabel(l))}</small></button>`;
    if (e.type === 'item') {
      const it = l.items[e.i];
      const kind = it.kind === 'hidden' ? t('kHiddenOne') : it.kind === 'gift' ? t('kGiftOne') : t('kBallOne');
      return `<button type="button" class="sr" data-n="${n}"><img class="sr-ico" src="${itemSprite(it)}" alt="" onerror="this.style.visibility='hidden'"><span class="sr-main">${esc(itemName(it))}</span><small>${esc(kind)} · ${esc(locName(l))}</small></button>`;
    }
    const tr = l.trainers[e.i];
    return `<button type="button" class="sr" data-n="${n}"><span class="sr-ico">${ICON_PERSON}</span><span class="sr-main">${esc(trainerTitle(tr.cls, tr.name))}</span><small>${esc(locName(l))}</small></button>`;
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
  const ref = `${e.type === 'item' ? 'i' : 't'}${e.i}`;
  selectLocation(e.li, { tab: e.type === 'item' ? 'items' : 'trainers', focus: ref, fly: !entry.pos });
  // In einer Höhle oder einem Gebäude: dessen Innenkarte öffnen
  if (entry.map && D.maps?.[entry.map]) openInterior(entry.map, { focus: entry.pos, ref });
  else if (entry.pos) flyToTile(entry.pos[0], entry.pos[1], entry.pos[2]);
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
  $('interior-select').setAttribute('aria-label', isEn() ? 'Area' : 'Bereich');
  $('lang-toggle').textContent = window.LANG.toUpperCase();
  if (!D) return;
  labelLayer?.eachLayer(m => { const el = m.getElement()?.querySelector('span'); if (el) el.textContent = locName(D.locations[m.locIndex]); });
  if (selected >= 0) renderLocation(selected); else renderDirectory();
  renderInteriorBar();
}
// Direktlinks wie …/Karte/#route-206 oder #mt-coronet~mt_coronet_2f auch ohne Neuladen
window.addEventListener('hashchange', () => {
  if (!D) return;
  const { li, map: inner } = locationFromHash();
  if (li < 0) return;
  if (li !== selected) selectLocation(li, { fly: !inner });
  if (inner && inner !== inMap) openInterior(inner);
  else if (!inner && inMap) closeInterior();
});

$('lang-toggle').addEventListener('click', () => {
  window.LANG = window.LANG === 'de' ? 'en' : 'de';
  localStorage.setItem('hub-lang', window.LANG);
  document.documentElement.lang = window.LANG;
  applyLang();
});

init();
