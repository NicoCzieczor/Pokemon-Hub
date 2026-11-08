/*
 * Service Worker für den Pokémon Hub.
 *
 * Damit läuft die Seite offline wie eine App:
 *  - Eigene Dateien (HTML, JS, Bilder) werden beim ersten Öffnen komplett gespeichert und kommen danach
 *    sofort aus dem Speicher – immer alle aus derselben Version. Eine neue Version kommt als Ganzes mit einem
 *    neuen Service Worker (VERSION ändert sich), nicht Datei für Datei; offene Seiten lädt pwa.js dann neu.
 *  - Antworten der PokeAPI und Sprites werden gespeichert, sobald sie einmal geladen wurden.
 *  - Kartenblätter der Sinnoh-, Hoenn-, Kanto-, Gold/Silber-, HG/SS-, Einall- und FR/LG-Karte
 *    (Karte/tiles/, Karte/tiles-oras/, Karte/tiles-kanto/, Karte/tiles-gold-silver/,
 *    Karte/tiles-hgss/, Karte/tiles-unova/, Karte/tiles-frlg/)
 *    ebenso – sie ändern sich nur, wenn die Karte neu gerendert wird.
 *  - Supabase (Duo-Sync) läuft nie über den Speicher, sondern immer live.
 *  - Randomizer, Omega Rubin / Alpha Saphir: Die ROM (rund 2 GB) liest CheerpJ stückweise über …/Randomizer/__rom/…
 *    – geliefert wird sie von hier aus der Datei, die die Seite schickt bzw. in IndexedDB abgelegt hat (romResponse).
 *
 * Nach jeder Änderung an der Seite: node tools/build-sw-version.js – aktualisiert CONTENT (Abdruck aller Dateien)
 * und zählt dabei VERSION hoch (tests/sw-version.test.cjs prüft das). Die vorderen Stellen von VERSION dürfen
 * von Hand angehoben werden. Nach neu gerenderten Kartenblättern: TILE_VERSION hochzählen.
 */
const VERSION = '0.1.64';            // steht unten auf der Startseite
const CONTENT = 'dc6d61e912';       // ändert sich mit jeder Datei → neue Version für alle Geräte
const TILE_VERSION = 't17';
const PREFIX = 'pokehub-';
const STATIC_CACHE = `${PREFIX}static-${VERSION}`;
const API_CACHE = `${PREFIX}api`;
const IMG_CACHE = `${PREFIX}img`;
const TILE_CACHE = `${PREFIX}tiles-${TILE_VERSION}`;
const API_MAX_ENTRIES = 3000;
const IMG_MAX_ENTRIES = 3000;
const TILE_MAX_ENTRIES = 200;

// Alles, was ohne Internet funktionieren soll. Neue Dateien können hier ergänzt werden –
// sonst werden sie einfach beim ersten Öffnen gespeichert.
const PRECACHE = [
  './',
  './index.html',
  './home.css',
  './home.js',
  './mobile.html',
  './mobile.css',
  './mobile.js',
  './scene.css',
  './scene.js',
  './stage.css',
  './stage.js',
  './manifest.json',
  './pwa.js',
  './theme.css',
  './pokemon-names.js',
  './pokemon-types.js',
  './locations.js',
  './rando-state.js',
  './icons/icon-180.png',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/favicon-32.png',
  './img/dp-pokedex.png',
  './vendor/supabase-2.117.2.js',
  './vendor/leaflet/leaflet.js',
  './vendor/leaflet/leaflet.css',
  './vendor/leaflet/images/layers.png',
  './vendor/leaflet/images/layers-2x.png',
  './vendor/leaflet/images/marker-icon.png',
  './vendor/leaflet/images/marker-icon-2x.png',
  './vendor/leaflet/images/marker-shadow.png',
  './RunDashboard/index.html',
  './RunDashboard/style.css',
  './RunDashboard/app.js',
  './RunDashboard/journal.css',
  './RunDashboard/journal.js',
  './Pokelocke/index.html',
  './Pokelocke/main.js',
  './Pokelocke/solo-refresh.css',
  './Pokelocke/center.css',
  './Pokelocke/center.js',
  './Pokelocke/center/font.js',
  './Pokelocke/center/font.png',
  './Pokelocke/center/frame.png',
  './Pokelocke/center/room-l.png',
  './Pokelocke/center/room-r.png',
  './Pokelocke/center/counter.png',
  './Pokelocke/center/esca-l.png',
  './Pokelocke/center/esca-r.png',
  './Pokelocke/center/pc-on.png',
  './Pokelocke/center/ball.png',
  './Pokelocke/center/see.png',
  './Pokelocke/center/nurse.png',
  './Pokelocke/center/lucas.png',
  './Pokelocke/center/lucia.png',
  './Pokelocke/followers/index.js',
  './Pokelocke/pokeapi.js',
  './Pokelocke/base.css',
  './Duo/index.html',
  './Duo/mobile.html',
  './Duo/main.js',
  './Duo/shared-state.js',
  './Duo/style.css',
  './Duo/routes.css',
  './Duo/i18n.js',
  './Duo/level-caps.js',
  './Duo/mobile-tabs.js',
  './Trio/index.html',
  './Trio/main.js',
  './Trio/lakes.css',
  './Trio/lakes.js',
  './Catchrate/index.html',
  './Catchrate/main.js',
  './Catchrate/style.css',
  './Catchrate/encounter.css',
  './Catchrate/encounter.js',
  './DamageCalc/index.html',
  './DamageCalc/style.css',
  './DamageCalc/mechanics.js',
  './DamageCalc/app.js',
  './DamageCalc/versus.css',
  './DamageCalc/versus.js',
  './DamageCalc/attacks.css',
  './DamageCalc/attacks.js',
  './Typrechner/index.html',
  './Typrechner/style.css',
  './Typrechner/app.js',
  './Typrechner/elements.css',
  './Typrechner/elements.js',
  './Typrechner/Types.png',
  './PokemonInfo/index.html',
  './PokemonInfo/style.css',
  './PokemonInfo/app.js',
  './PokemonInfo/device.css',
  './PokemonInfo/device.js',
  './PokemonInfo/sprites/lucas.png',
  './PokemonInfo/sprites/lucia.png',
  './Rules/index.html',
  './Rules/ruins.css',
  './Rules/ruins.js',
  './Karte/index.html',
  './Karte/style.css',
  './Karte/app.js',
  './Karte/sea.css',
  './Karte/sea.js',
  './Karte/platin.json',
  './Karte/encounter-areas.js',
  './Karte/trainer-classes.js',
  './Karte/hoenn.css',
  './Karte/hoenn.js',
  './Karte/oras.json',
  './Karte/encounter-areas-oras.js',
  './Karte/kanto.css',
  './Karte/kanto.js',
  './Karte/smooth-wheel.js',
  './Karte/kanto.json',
  './Karte/yellow.json',
  './Karte/gold-silver.json',
  './Karte/crystal.json',
  './Karte/ruby-sapphire.json',
  './Karte/emerald.json',
  './Karte/diamond-pearl.json',
  './Karte/hgss.json',
  './Karte/unova.json',
  './Karte/unova-b2w2.json',
  './Karte/frlg.json',
  './Karte/kalos-xy.json',
  './Karte/alola-sm.json',
  './Bosse/index.html',
  './Bosse/style.css',
  './Bosse/app.js',
  './Bosse/boss.css',
  './Bosse/boss.js',
  './Bosse/rando.js',
  './Bosse/bosses.json',
  './Bosse/oras-rom.js',
  './Randomizer/cxi-build.js',
  './Bosse/bosses-oras.json',
  './Karte/tiles/index.json',
  './Karte/tiles/interiors.json',
  './Karte/tiles/sea.png',
  './Karte/tiles/0/0_0.webp',
  './Karte/tiles-oras/index.json',
  './Karte/tiles-oras/places.json',
  './Karte/tiles-oras/sea.png',
  './Karte/tiles-oras/0/0_0.webp',
  './Karte/tiles-kanto/index.json',
  './Karte/tiles-kanto/0/0_0.webp',
  './Karte/tiles-yellow/index.json',
  './Karte/tiles-yellow/0/0_0.webp',
  './Karte/tiles-gold-silver/index.json',
  './Karte/tiles-gold-silver/0/0_0.webp',
  './Karte/tiles-crystal/index.json',
  './Karte/tiles-crystal/0/0_0.webp',
  './Karte/tiles-ruby-sapphire/index.json',
  './Karte/tiles-ruby-sapphire/0/0_0.webp',
  './Karte/tiles-emerald/index.json',
  './Karte/tiles-emerald/0/0_0.webp',
  './Karte/tiles-diamond-pearl/index.json',
  './Karte/tiles-diamond-pearl/0/0_0.webp',
  './Karte/tiles-hgss/index.json',
  './Karte/tiles-hgss/interiors.json',
  './Karte/tiles-hgss/sea.png',
  './Karte/tiles-hgss/0/0_0.webp',
  './Karte/tiles-unova/index.json',
  './Karte/tiles-unova/black/index.json',
  './Karte/tiles-unova/black/0/0_0.webp',
  './Karte/tiles-unova/white/index.json',
  './Karte/tiles-unova/white/0/0_0.webp',
  './Karte/tiles-unova-b2w2/index.json',
  './Karte/tiles-unova-b2w2/0/0_0.webp',
  './Karte/tiles-frlg/index.json',
  './Karte/tiles-frlg/0/0_0.webp',
  './Karte/tiles-kalos-xy/index.json',
  './Karte/tiles-kalos-xy/0/0_0.webp',
  './Karte/tiles-alola-sm/index.json',
  './Karte/tiles-alola-sm/0/0_0.webp',
  './SaveViewer/index.html',
  './SaveViewer/style.css',
  './SaveViewer/data-pt.js',
  './SaveViewer/pt-save.js',
  './SaveViewer/pt-bag.js',
  './SaveViewer/pt-edit.js',
  './SaveViewer/data-oras.js',
  './SaveViewer/oras-save.js',
  './SaveViewer/oras-bag.js',
  './SaveViewer/oras-edit.js',
  './SaveViewer/hub-save.js',
  './SaveViewer/soul-link.js',
  './SaveViewer/main.js',
  './SaveViewer/pc.css',
  './SaveViewer/pc.js',
  './SaveEditor/index.html',
  './SaveEditor/style.css',
  './SaveEditor/app.js',
  './SaveEditor/chip.css',
  './SaveEditor/chip.js',
  './Sonderbonbons/index.html',
  './Randomizer/index.html',
  './Randomizer/style.css',
  './Randomizer/app.js',
  './Randomizer/slots.css',
  './Randomizer/slots.js',
  './Randomizer/rnqs.js',
  './Randomizer/options.js',
  './Randomizer/editor.js',
  './Randomizer/settings.rnqs',
];

// Kleine Bilder der Startseiten (PC und Handy): Item-Sprites der Knöpfe, zufällige Bälle und Typ-Etiketten,
// wilde Pokémon der Bühne (Liste wie in scene.js). Werden nebenbei mitgeladen, damit die Startseite auch
// offline vollständig ist; wenn das nicht klappt, ist das egal.
const SPRITES = 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/';
const BALLS = ['poke-ball','great-ball','ultra-ball','master-ball','safari-ball','net-ball','dive-ball','nest-ball','repeat-ball','timer-ball','luxury-ball','premier-ball','dusk-ball','heal-ball','quick-ball','moon-ball','dream-ball','beast-ball','friend-ball','love-ball','lure-ball','level-ball','fast-ball','heavy-ball','sport-ball','cherish-ball'];
const HOME_ITEMS = ['journal','vs-recorder','rare-candy','vs-seeker','life-orb','town-map','pal-pad'];
const WILD_MONS = [132, 387, 390, 393, 396, 399, 401, 403, 406, 417, 418, 420, 422, 425, 427, 431, 433, 436, 439, 440, 443, 447, 449, 451, 453, 459];
const WARM_IMAGES = [
  ...BALLS.concat(HOME_ITEMS).map(b => `${SPRITES}items/${b}.png`),
  ...WILD_MONS.map(n => `${SPRITES}pokemon/versions/generation-iv/platinum/${n}.png`),
  ...Array.from({ length: 17 }, (_, i) => `${SPRITES}types/generation-iv/platinum/${i + 1}.png`),
];

const IMAGE_HOSTS = new Set(['raw.githubusercontent.com']);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    // Alle Dateien frisch und als zusammengehöriger Stand holen. ?v= umgeht auch den Zwischenspeicher von
    // GitHub Pages, der nach einem Release noch einige Minuten alte Dateien liefern kann.
    await Promise.all(PRECACHE.map(async url => {
      const res = await fetch(new Request(url + (url.includes('?') ? '&' : '?') + 'v=' + CONTENT, { cache: 'reload' }));
      if (!res.ok) throw new Error('Vorladen fehlgeschlagen: ' + url + ' (' + res.status + ')');
      await cache.put(url, res.redirected ? await unredirect(res) : res);
    }));
    await self.skipWaiting();
    // Nicht abwarten – darf scheitern
    warmImages();
  })());
});

// Startseite fragt nach der installierten Version; der Randomizer schickt die ROM fürs Würfeln
let randoRom = null;
self.addEventListener('message', event => {
  if (event.data === 'version' && event.source) event.source.postMessage({ version: VERSION });
  if (event.data && event.data.type === 'rando-rom') {
    randoRom = event.data.file || null;
    if (event.ports && event.ports[0]) event.ports[0].postMessage({ ok: !!randoRom });
  }
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, API_CACHE, IMG_CACHE, TILE_CACHE]);
    for (const name of await caches.keys()) {
      if (name.startsWith(PREFIX) && !keep.has(name)) await caches.delete(name);
    }
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return;

  // ROM für den Randomizer (Omega Rubin / Alpha Saphir): stückweise aus der Datei
  if (url.origin === self.location.origin && /\/Randomizer\/__rom\/[^/]+$/.test(url.pathname)) {
    event.respondWith(romResponse(req));
    return;
  }
  // Teil-Anfragen (Range) und das Randomizer-Jar holt CheerpJ selbst stückweise vom Server – nicht anfassen
  if (url.origin === self.location.origin && (req.headers.has('range') || /\.jar$/.test(url.pathname))) return;

  const own = url.href.startsWith(self.registration.scope);   // nur Dateien des Hubs, nicht anderer Seiten auf github.io
  if (own && /\/Karte\/tiles(?:-(?:oras|kanto|yellow|gold-silver|crystal|ruby-sapphire|emerald|diamond-pearl|hgss|unova|unova-b2w2|frlg|kalos-xy|alola-sm))?\/(\d+|in)\//.test(url.pathname)) {
    event.respondWith(cacheFirst(event, TILE_CACHE, TILE_MAX_ENTRIES, false));
  } else if (own) {
    event.respondWith(staticFirst(event));
  } else if (url.hostname === 'pokeapi.co') {
    event.respondWith(cacheFirst(event, API_CACHE, API_MAX_ENTRIES, false));
  } else if (IMAGE_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(event, IMG_CACHE, IMG_MAX_ENTRIES, true));
  }
  // Alles andere (z. B. Supabase) geht ganz normal ins Netz.
});

/* ── Eigene Dateien: aus dem Speicher der aktuellen Version ──
   Nicht vorab Gespeichertes (z. B. Bilder) wird einmal geholt und für diese Version gemerkt. */
async function staticFirst(event) {
  const req = event.request;
  const isPage = req.mode === 'navigate';
  const cache = await caches.open(STATIC_CACHE);
  const key = cacheKey(req.url, isPage);
  const cached = await cache.match(key, { ignoreSearch: isPage, ignoreVary: true });
  if (cached) return cached;

  const fresh = await fetch(key, { credentials: 'same-origin' })
    .then(async res => {
      if (res.ok) {
        const clean = res.redirected ? await unredirect(res) : res;
        // Speichern darf scheitern (z. B. Speicher voll) – die Antwort aus dem Netz gilt trotzdem
        try { await cache.put(key, clean.clone()); } catch (e) { /* beim nächsten Mal erneut */ }
        return clean;
      }
      return res;
    })
    .catch(() => null);
  if (fresh) return fresh;

  if (isPage) {
    const fallback = await cache.match('./index.html') || await cache.match('./mobile.html');
    if (fallback) return fallback;
    return new Response(offlinePage(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  return Response.error();
}

/* ── Randomizer-ROM (Omega Rubin / Alpha Saphir) ──
   CheerpJ liest Dateien unter /app/ per Range-Anfrage vom Server – hier kommen die Stücke aus der ROM-Datei.
   Geliefert wird nur die Spiel-Partition (NCCH) als .cxi: die ganze .3ds ist genau 2 GB groß, und damit kommt CheerpJ
   nicht zurecht (Zahlenüberlauf). Die Datei schickt die Seite vor dem Würfeln (message 'rando-rom'); sonst die in
   IndexedDB gespeicherte (pokehub-randomizer → kv → rom, Randomizer/app.js). */
function randoRomFromDb() {
  return new Promise(resolve => {
    const r = indexedDB.open('pokehub-randomizer', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onerror = () => resolve(null);
    r.onsuccess = () => {
      try {
        const get = r.result.transaction('kv', 'readonly').objectStore('kv').get('rom');
        get.onsuccess = () => resolve(get.result && get.result.file || null);
        get.onerror = () => resolve(null);
      } catch (e) { resolve(null); }
    };
  });
}
async function romPart(blob) {
  const h = new Uint8Array(await blob.slice(0, 0x200).arrayBuffer());
  const u32 = o => (h[o] | (h[o + 1] << 8) | (h[o + 2] << 16) | (h[o + 3] << 24)) >>> 0;
  if (String.fromCharCode(h[0x100], h[0x101], h[0x102], h[0x103]) === 'NCSD') {
    const start = u32(0x120) * 0x200, size = u32(0x124) * 0x200;
    if (size && start + size <= blob.size) return { start, size };
  }
  return { start: 0, size: blob.size };
}
async function romResponse(req) {
  const blob = randoRom || await randoRomFromDb();
  if (!blob) return new Response('', { status: 404 });
  const part = await romPart(blob), total = part.size;
  const head = { 'Accept-Ranges': 'bytes', 'Content-Type': 'application/octet-stream', 'Cache-Control': 'no-store' };
  const m = /bytes=(\d+)-(\d*)/.exec(req.headers.get('range') || '');
  if (!m) return new Response(blob.slice(part.start, part.start + total), { status: 200, headers: { ...head, 'Content-Length': String(total) } });
  const s = +m[1], e = m[2] ? Math.min(+m[2], total - 1) : total - 1;
  if (s >= total || e < s) return new Response('', { status: 416, headers: { 'Content-Range': `bytes */${total}` } });
  return new Response(blob.slice(part.start + s, part.start + e + 1), {
    status: 206, headers: { ...head, 'Content-Range': `bytes ${s}-${e}/${total}`, 'Content-Length': String(e - s + 1) }
  });
}

/* ── PokeAPI & Sprites: einmal geladen = für immer da ── */
let putsSinceTrim = 0;

async function cacheFirst(event, cacheName, maxEntries, preferCors) {
  const req = event.request;
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req.url, { ignoreVary: true });
  if (hit) return hit;

  let res;
  try {
    res = await fetchForCache(req, preferCors);
  } catch (e) {
    return Response.error();
  }
  if (res.ok || res.type === 'opaque') {
    const copy = res.clone();
    event.waitUntil(cache.put(req.url, copy).then(() => maybeTrim(cacheName, maxEntries)).catch(() => {}));
  }
  return res;
}

// Bilder werden – wenn der Server es erlaubt – per CORS geholt. Dann weiß der Browser,
// wie groß sie wirklich sind, und der Speicher läuft nicht unnötig voll.
async function fetchForCache(req, preferCors) {
  if (preferCors && req.mode === 'no-cors') {
    try {
      return await fetch(req.url, { mode: 'cors', credentials: 'omit' });
    } catch (e) {
      return fetch(req);
    }
  }
  return fetch(req);
}

async function maybeTrim(cacheName, maxEntries) {
  if (++putsSinceTrim < 40) return;
  putsSinceTrim = 0;
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (let i = 0; i < keys.length - maxEntries; i++) await cache.delete(keys[i]);
}

function warmImages() {
  return caches.open(IMG_CACHE).then(cache =>
    Promise.allSettled(WARM_IMAGES.map(async url => {
      if (await cache.match(url, { ignoreVary: true })) return;
      const res = await fetch(url, { mode: 'cors', credentials: 'omit' });
      if (res.ok) await cache.put(url, res);
    }))
  ).catch(() => {});
}

// Seiten werden ohne ?… gespeichert, damit z. B. index.html?mon=25 dieselbe Datei nutzt.
function cacheKey(href, isPage) {
  const u = new URL(href);
  u.hash = '';
  if (isPage) u.search = '';
  return u.href;
}

// Weitergeleitete Antworten dürfen nicht direkt als Seite ausgeliefert werden.
async function unredirect(res) {
  const body = await res.blob();
  return new Response(body, { status: res.status, statusText: res.statusText, headers: res.headers });
}

const offlinePage = () => `<!DOCTYPE html><html lang="de"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>Offline</title>
<style>body{margin:0;min-height:100vh;display:grid;place-items:center;background:#0d0f2b;color:#e0e8f9;font-family:-apple-system,'Segoe UI',sans-serif;text-align:center;padding:24px}
a{color:#57d2ff}</style></head><body><div><h1>Offline</h1>
<p>Diese Seite wurde noch nicht gespeichert. Einmal mit Internet öffnen, dann geht sie auch offline.</p>
<p><a href="${self.registration.scope}index.html">Zum Hub</a></p></div></body></html>`;
