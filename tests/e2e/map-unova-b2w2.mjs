// Schwarz 2/Weiß 2 lädt den echten Weiß-2-ROM-Render und getrennte B2/W2-Funddaten.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'schwarz2-weiss2', 'hub-gen': '5', 'hub-lang': 'de', 'karte-b2w2-version': 'black-2' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-unova-b2w2') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  await waitFor(page, () => [...document.images].some(image => /Karte\/tiles-unova-b2w2\/0\/0_0\.webp/.test(image.src)), undefined, 90000);

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    tile: [...document.images].find(image => image.src.includes('/tiles-unova-b2w2/'))?.src || '',
    b2w2: !!window.KARTE_B2W2,
    bw: !!window.KARTE_UNOVA,
    editions: document.querySelectorAll('[data-version]').length,
    labels: document.querySelectorAll('.kanto-label').length,
    credit: document.querySelector('.map-note a')?.href || '',
    seaChildren: document.getElementById('km')?.childElementCount,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('B2/W2: eigene Einall-Karte geladen', initial.b2w2 && !initial.bw && /Einall/.test(initial.heading) && /Schwarz 2 \/ Weiß 2/.test(initial.title), JSON.stringify(initial));
  check('B2/W2: lokale ROM-Kartenblätter geladen', /tiles-unova-b2w2\//.test(initial.tile), initial.tile);
  check('B2/W2: 82 Orte und zwei Editionen auswählbar', initial.places === 82 && initial.editions === 2, JSON.stringify(initial));
  check('B2/W2: neue Städte und Orte beschriftet', initial.labels >= 20, String(initial.labels));
  check('B2/W2: Kartenquelle lokal dokumentiert', /tiles-unova-b2w2\/SOURCE\.txt/.test(initial.credit), initial.credit);
  check('B2/W2: keine Sinnoh-Meerszene und kein Überlauf', initial.seaChildren === 0 && initial.overflow <= 1, JSON.stringify(initial));

  await page.evaluate(() => { location.hash = 'route-4'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 4'));
  const black2Mons = await page.evaluate(() => [...document.querySelectorAll('.wild-table [data-mon]')].map(row => Number(row.dataset.mon)));
  check('B2/W2: Schwarz 2 zeigt Unratütox', black2Mons.includes(568) && !black2Mons.includes(572), JSON.stringify(black2Mons));

  await page.click('[data-version="white-2"]');
  await waitFor(page, () => localStorage.getItem('karte-b2w2-version') === 'white-2');
  const white2Mons = await page.evaluate(() => [...document.querySelectorAll('.wild-table [data-mon]')].map(row => Number(row.dataset.mon)));
  check('B2/W2: Weiß 2 zeigt Picochilla', white2Mons.includes(572) && !white2Mons.includes(568), JSON.stringify(white2Mons));

  await page.evaluate(() => { location.hash = 'aspertia-city'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Eventura City'));
  check('B2/W2: Eventura City ist als neuer Startort vorhanden', await page.evaluate(() => document.querySelector('.side-head h2')?.textContent.includes('Eventura City')));

  const toBw = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('schwarz-weiss'));
  await toBw;
  await waitFor(page, () => !!window.KARTE_UNOVA && document.getElementById('map-loading')?.hidden, undefined, 90000);
  check('B2/W2: Wechsel zu Schwarz/Weiß lädt die separate BW1-Karte', await page.evaluate(() => !!window.KARTE_UNOVA && !window.KARTE_B2W2));

  const back = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('schwarz2-weiss2'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-unova-b2w2') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  check('B2/W2: Menüwechsel zurück lädt wieder die B2/W2-Tiles', await page.evaluate(() => !!window.KARTE_B2W2 && !window.KARTE_UNOVA));
  check('B2/W2: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
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
      data: !!(await cache.match(new URL('unova-b2w2.json', location.href).href)),
      manifest: !!(await cache.match(new URL('tiles-unova-b2w2/index.json', location.href).href)),
      overview: !!(await cache.match(new URL('tiles-unova-b2w2/0/0_0.webp', location.href).href)),
    };
  });
  check('B2/W2: Daten, Manifest und Übersicht offline vorgeladen', cached.data && cached.manifest && cached.overview, JSON.stringify(cached));
  check('B2/W2: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (error) {
  check('Schwarz-2/Weiß-2-Kartentest', false, error.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Schwarz-2/Weiß-2-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
