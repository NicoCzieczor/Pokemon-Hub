// Rubin/Saphir lädt die direkt aus pret/pokeruby gerenderte GBA-Welt von Hoenn.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'rubin-saphir', 'hub-gen': '3', 'hub-lang': 'de', 'karte-rs-version': 'ruby' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-rs') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  await waitFor(page, () => [...document.images].some(image => /Karte\/tiles-ruby-sapphire\/0\/0_0\.webp/.test(image.src)), undefined, 90000);

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    tile: [...document.images].find(image => image.src.includes('/tiles-ruby-sapphire/'))?.src || '',
    rs: !!window.KARTE_RS,
    emerald: !!window.KARTE_EMERALD,
    editions: document.querySelectorAll('[data-version]').length,
    credit: document.querySelector('.map-note a')?.href || '',
    seaChildren: document.getElementById('km')?.childElementCount,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('R/S: eigene Hoenn-Karte geladen', initial.rs && !initial.emerald && /Hoenn/.test(initial.heading) && /Rubin \/ Saphir/.test(initial.title), JSON.stringify(initial));
  check('R/S: lokale originale GBA-Kartenblätter geladen', /tiles-ruby-sapphire\//.test(initial.tile), initial.tile);
  check('R/S: 58 Orte und zwei Editionen auswählbar', initial.places === 58 && initial.editions === 2, JSON.stringify(initial));
  check('R/S: Kartenquelle lokal dokumentiert', /tiles-ruby-sapphire\/SOURCE\.txt/.test(initial.credit), initial.credit);
  check('R/S: keine Sinnoh-Meerszene und kein Überlauf', initial.seaChildren === 0 && initial.overflow <= 1, JSON.stringify(initial));

  await page.evaluate(() => { location.hash = 'route-114'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 114'));
  const rubyMons = await page.evaluate(() => [...document.querySelectorAll('.wild-table [data-mon]')].map(row => Number(row.dataset.mon)));
  check('R/S: Rubin zeigt Samurzel und Sengo', rubyMons.includes(273) && rubyMons.includes(335), JSON.stringify(rubyMons));

  await page.click('[data-version="sapphire"]');
  await waitFor(page, () => localStorage.getItem('karte-rs-version') === 'sapphire');
  const sapphireMons = await page.evaluate(() => [...document.querySelectorAll('.wild-table [data-mon]')].map(row => Number(row.dataset.mon)));
  check('R/S: Saphir zeigt Loturzel und Vipitis', sapphireMons.includes(270) && sapphireMons.includes(336) && !sapphireMons.includes(335), JSON.stringify(sapphireMons));

  await page.evaluate(() => { location.hash = 'battle-tower'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Duellturm'));
  check('R/S: Duellturm ersetzt Smaragds Kampffront', await page.evaluate(() => document.querySelector('.side-head h2')?.textContent.includes('Duellturm')));

  const toEmerald = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('smaragd'));
  await toEmerald;
  await waitFor(page, () => !!window.KARTE_EMERALD && document.getElementById('map-loading')?.hidden, undefined, 90000);
  check('R/S: Wechsel zu Smaragd lädt die separate Smaragd-Karte', await page.evaluate(() => !!window.KARTE_EMERALD && !window.KARTE_RS));

  const back = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('rubin-saphir'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-rs') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  check('R/S: Menüwechsel zurück lädt wieder die R/S-Tiles', await page.evaluate(() => !!window.KARTE_RS && !window.KARTE_EMERALD));
  check('R/S: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();

  const offline = await browser.newPage();
  const offlineErrors = [];
  offline.on('pageerror', error => offlineErrors.push(String(error)));
  await offline.setRequestInterception(true);
  offline.on('request', request => request.url().startsWith('http://localhost:') ? request.continue() : request.abort());
  await offline.goto(`${BASE}/Karte/index.html`, { waitUntil: 'domcontentloaded' });
  const cached = await offline.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Service Worker timeout')), 30000))]);
    const cacheName = (await caches.keys()).find(name => name.startsWith('pokehub-static-'));
    const cache = await caches.open(cacheName);
    return {
      data: !!(await cache.match(new URL('ruby-sapphire.json', location.href).href)),
      manifest: !!(await cache.match(new URL('tiles-ruby-sapphire/index.json', location.href).href)),
      overview: !!(await cache.match(new URL('tiles-ruby-sapphire/0/0_0.webp', location.href).href)),
    };
  });
  check('R/S: Daten, Manifest und Übersicht offline vorgeladen', cached.data && cached.manifest && cached.overview, JSON.stringify(cached));
  check('R/S: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (error) {
  check('Rubin/Saphir-Kartentest', false, error.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Rubin/Saphir-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
