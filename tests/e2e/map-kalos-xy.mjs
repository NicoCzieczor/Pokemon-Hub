// X/Y lädt den echten Pokémon-X-ROM-Render und getrennte X/Y-Funddaten.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'x-y', 'hub-gen': '6', 'hub-lang': 'de', 'karte-xy-version': 'x' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-xy') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  await waitFor(page, () => [...document.images].some(image => /Karte\/tiles-kalos-xy\/0\/0_0\.webp/.test(image.src)), undefined, 90000);

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    tile: [...document.images].find(image => image.src.includes('/tiles-kalos-xy/'))?.src || '',
    xy: !!window.KARTE_XY,
    oras: !!window.KARTE_ORAS,
    editions: document.querySelectorAll('[data-version]').length,
    labels: document.querySelectorAll('.kanto-label').length,
    credit: document.querySelector('.map-note a')?.href || '',
    seaChildren: document.getElementById('km')?.childElementCount,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('X/Y: eigene Kalos-Karte geladen', initial.xy && !initial.oras && /Kalos/.test(initial.heading) && /X \/ Y/.test(initial.title), JSON.stringify(initial));
  check('X/Y: lokale 3DS-ROM-Kartenblätter geladen', /tiles-kalos-xy\//.test(initial.tile), initial.tile);
  check('X/Y: über 70 Orte und zwei Editionen auswählbar', initial.places >= 70 && initial.editions === 2, JSON.stringify(initial));
  check('X/Y: Städte und Routen tragen ihre Namen auf der Karte', initial.labels >= 40, String(initial.labels));
  check('X/Y: Kartenquelle lokal dokumentiert', /tiles-kalos-xy\/SOURCE\.txt/.test(initial.credit), initial.credit);
  check('X/Y: keine Hoenn-Meerszene und kein Überlauf', initial.seaChildren === 0 && initial.overflow <= 1, JSON.stringify(initial));

  await page.evaluate(() => { location.hash = 'route-2'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 2'));
  const xMons = await page.evaluate(() => [...document.querySelectorAll('.wild-table [data-mon]')].map(row => Number(row.dataset.mon)));
  check('X/Y: X zeigt Hornliu auf Route 2', xMons.includes(13) && !xMons.includes(10), JSON.stringify(xMons));

  await page.click('[data-version="y"]');
  await waitFor(page, () => localStorage.getItem('karte-xy-version') === 'y');
  const yMons = await page.evaluate(() => [...document.querySelectorAll('.wild-table [data-mon]')].map(row => Number(row.dataset.mon)));
  check('X/Y: Y zeigt Raupy auf Route 2', yMons.includes(10) && !yMons.includes(13), JSON.stringify(yMons));

  await page.evaluate(() => { location.hash = 'vaniville-town'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Escissia'));
  check('X/Y: Escissia ist als Startort vorhanden', await page.evaluate(() => document.querySelector('.side-head h2')?.textContent.includes('Escissia')));

  const toB2w2 = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('schwarz2-weiss2'));
  await toB2w2;
  await waitFor(page, () => !!window.KARTE_B2W2 && document.getElementById('map-loading')?.hidden, undefined, 90000);
  check('X/Y: Wechsel zu Schwarz 2/Weiß 2 lädt die separate Einall-Karte', await page.evaluate(() => !!window.KARTE_B2W2 && !window.KARTE_XY));

  const back = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('x-y'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-xy') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  check('X/Y: Menüwechsel zurück lädt wieder die Kalos-Tiles', await page.evaluate(() => !!window.KARTE_XY && !window.KARTE_B2W2));
  check('X/Y: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
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
      data: !!(await cache.match(new URL('kalos-xy.json', location.href).href)),
      manifest: !!(await cache.match(new URL('tiles-kalos-xy/index.json', location.href).href)),
      overview: !!(await cache.match(new URL('tiles-kalos-xy/0/0_0.webp', location.href).href)),
    };
  });
  check('X/Y: Daten, Manifest und Übersicht offline vorgeladen', cached.data && cached.manifest && cached.overview, JSON.stringify(cached));
  check('X/Y: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (error) {
  check('X/Y-Kartentest', false, error.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle X/Y-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
