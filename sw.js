/*
 * Service Worker für den Pokémon Hub.
 *
 * Damit läuft die Seite offline wie eine App:
 *  - Eigene Dateien (HTML, JS, Bilder) werden beim ersten Öffnen komplett gespeichert.
 *    Danach kommen sie sofort aus dem Speicher; im Hintergrund wird nachgeschaut,
 *    ob es eine neuere Version gibt (die ist dann beim nächsten Öffnen da).
 *  - Antworten der PokeAPI und Sprites werden gespeichert, sobald sie einmal geladen wurden.
 *  - Supabase (Duo-Sync) läuft nie über den Speicher, sondern immer live.
 *
 * Nach größeren Änderungen an der Seite: VERSION hochzählen, dann wird alles frisch geladen.
 */
const VERSION = 'v12';
const PREFIX = 'pokehub-';
const STATIC_CACHE = `${PREFIX}static-${VERSION}`;
const API_CACHE = `${PREFIX}api`;
const IMG_CACHE = `${PREFIX}img`;
const API_MAX_ENTRIES = 600;
const IMG_MAX_ENTRIES = 3000;

// Alles, was ohne Internet funktionieren soll. Neue Dateien können hier ergänzt werden –
// sonst werden sie einfach beim ersten Öffnen gespeichert.
const PRECACHE = [
  './',
  './index.html',
  './mobile.html',
  './mobile.css',
  './mobile.js',
  './manifest.json',
  './pwa.js',
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
  './Pokelocke/index.html',
  './Pokelocke/main.js',
  './Pokelocke/pokeapi.js',
  './Pokelocke/base.css',
  './Duo/index.html',
  './Duo/mobile.html',
  './Duo/main.js',
  './Duo/style.css',
  './Duo/i18n.js',
  './Duo/level-caps.js',
  './Trio/index.html',
  './Trio/main.js',
  './Catchrate/index.html',
  './Catchrate/main.js',
  './Catchrate/style.css',
  './DamageCalc/index.html',
  './DamageCalc/style.css',
  './DamageCalc/mechanics.js',
  './DamageCalc/app.js',
  './Typrechner/index.html',
  './Typrechner/style.css',
  './Typrechner/app.js',
  './Typrechner/Types.png',
  './PokemonInfo/index.html',
  './PokemonInfo/style.css',
  './PokemonInfo/app.js',
  './Rules/index.html',
  './Karte/index.html',
  './Karte/style.css',
  './Karte/app.js',
  './Karte/platin.json',
  './Karte/platin-terrain.png',
  './SaveViewer/index.html',
  './SaveViewer/style.css',
  './SaveViewer/data-pt.js',
  './SaveViewer/pt-save.js',
  './SaveViewer/soul-link.js',
  './SaveViewer/main.js',
];

// Kleine Bilder, die die Startseite zufällig anzeigt (Bälle). Werden nebenbei mitgeladen;
// wenn das nicht klappt, ist das egal.
const BALLS = ['poke-ball','great-ball','ultra-ball','master-ball','safari-ball','net-ball','dive-ball','nest-ball','repeat-ball','timer-ball','luxury-ball','premier-ball','dusk-ball','heal-ball','quick-ball','moon-ball','dream-ball','beast-ball','friend-ball','love-ball','lure-ball','level-ball','fast-ball','heavy-ball','sport-ball','cherish-ball'];
const WARM_IMAGES = BALLS.map(b => `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/items/${b}.png`);

const IMAGE_HOSTS = new Set(['raw.githubusercontent.com', 'archives.bulbagarden.net']);

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(STATIC_CACHE);
    await cache.addAll(PRECACHE.map(url => new Request(url, { cache: 'reload' })));
    await self.skipWaiting();
    // Nicht abwarten – darf scheitern
    warmImages();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const keep = new Set([STATIC_CACHE, API_CACHE, IMG_CACHE]);
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

  if (url.origin === self.location.origin) {
    event.respondWith(staleWhileRevalidate(event));
  } else if (url.hostname === 'pokeapi.co') {
    event.respondWith(cacheFirst(event, API_CACHE, API_MAX_ENTRIES, false));
  } else if (IMAGE_HOSTS.has(url.hostname)) {
    event.respondWith(cacheFirst(event, IMG_CACHE, IMG_MAX_ENTRIES, true));
  }
  // Alles andere (z. B. Supabase) geht ganz normal ins Netz.
});

/* ── Eigene Dateien: sofort aus dem Speicher, im Hintergrund aktualisieren ── */
async function staleWhileRevalidate(event) {
  const req = event.request;
  const isPage = req.mode === 'navigate';
  const cache = await caches.open(STATIC_CACHE);
  const key = cacheKey(req.url, isPage);
  const cached = await cache.match(key, { ignoreSearch: isPage, ignoreVary: true });

  const network = fetch(key, { cache: 'no-cache', credentials: 'same-origin' })
    .then(async res => {
      if (res.ok) {
        const clean = res.redirected ? await unredirect(res) : res;
        await cache.put(key, clean.clone());
        return clean;
      }
      return res;
    })
    .catch(() => null);

  if (cached) {
    event.waitUntil(network);
    return cached;
  }
  const fresh = await network;
  if (fresh) return fresh;

  if (isPage) {
    const fallback = await cache.match('./index.html') || await cache.match('./mobile.html');
    if (fallback) return fallback;
    return new Response(offlinePage(), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }
  return Response.error();
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
