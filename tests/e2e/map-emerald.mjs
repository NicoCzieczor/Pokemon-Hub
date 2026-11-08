// Smaragd lädt die direkt aus pret/pokeemerald gerenderte GBA-Welt von Hoenn.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'smaragd', 'hub-gen': '3', 'hub-lang': 'de' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-emerald') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  await waitFor(page, () => [...document.images].some(image => /Karte\/tiles-emerald\/0\/0_0\.webp/.test(image.src)), undefined, 90000);

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    tile: [...document.images].find(image => image.src.includes('/tiles-emerald/'))?.src || '',
    emerald: !!window.KARTE_EMERALD,
    oras: !!window.KARTE_HOENN,
    editions: document.querySelectorAll('[data-version]').length,
    filters: document.querySelectorAll('[data-kind]').length,
    labels: document.querySelectorAll('.kanto-label').length,
    credit: document.querySelector('.map-note a')?.href || '',
    seaChildren: document.getElementById('km')?.childElementCount,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('Smaragd: eigene Hoenn-Karte geladen', initial.emerald && !initial.oras && /Hoenn/.test(initial.heading) && /Smaragd/.test(initial.title), JSON.stringify(initial));
  check('Smaragd: lokale GBA-Kartenblätter geladen', /tiles-emerald\//.test(initial.tile), initial.tile);
  check('Smaragd: 58 Orte auswählbar', initial.places === 58, String(initial.places));
  check('Smaragd: Einzelspiel-UI und Ortsbeschriftungen', initial.editions === 0 && initial.filters === 0 && initial.labels === 24, JSON.stringify(initial));
  check('Smaragd: Kartenquelle lokal dokumentiert', /tiles-emerald\/SOURCE\.txt/.test(initial.credit), initial.credit);
  check('Smaragd: keine Sinnoh-Meerszene und kein Überlauf', initial.seaChildren === 0 && initial.overflow <= 1, JSON.stringify(initial));

  await page.evaluate(() => { location.hash = 'route-101'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 101'));
  const route = await page.evaluate(() => ({
    title: document.querySelector('.side-head h2')?.textContent,
    wild: document.querySelectorAll('.wild-table [data-mon]').length,
  }));
  check('Smaragd: Route 101 zeigt echte Funddaten', route.wild >= 3, JSON.stringify(route));

  await page.evaluate(() => { location.hash = 'battle-frontier'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Kampffront'));
  check('Smaragd: Kampffront ist als eigener Kartenbereich vorhanden', await page.evaluate(() => document.querySelector('.side-head h2')?.textContent.includes('Kampffront')));

  const toOras = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('omega-rot-alpha-saphir'));
  await toOras;
  await waitFor(page, () => !!window.KARTE_HOENN && document.getElementById('map-loading')?.hidden, undefined, 90000);
  check('Smaragd: Wechsel zu OR/AS lädt die separate 3D-Hoenn-Karte', await page.evaluate(() => !!window.KARTE_HOENN && !window.KARTE_EMERALD));

  const back = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('smaragd'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-emerald') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  check('Smaragd: Menüwechsel zurück lädt wieder die GBA-Karte', await page.evaluate(() => !!window.KARTE_EMERALD && !window.KARTE_HOENN));
  check('Smaragd: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
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
      data: !!(await cache.match(new URL('emerald.json', location.href).href)),
      manifest: !!(await cache.match(new URL('tiles-emerald/index.json', location.href).href)),
      overview: !!(await cache.match(new URL('tiles-emerald/0/0_0.webp', location.href).href)),
    };
  });
  check('Smaragd: Daten, Manifest und Übersicht offline vorgeladen', cached.data && cached.manifest && cached.overview, JSON.stringify(cached));
  check('Smaragd: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (error) {
  check('Smaragd-Kartentest', false, error.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Smaragd-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
