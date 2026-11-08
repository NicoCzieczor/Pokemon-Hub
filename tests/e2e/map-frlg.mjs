// Die Karten-Seite übernimmt Feuerrot/Blattgrün und lädt die aus der GBA-ROM gerenderte Kanto-Welt.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'feuerrot-blattgruen', 'hub-gen': '3', 'hub-lang': 'de', 'karte-frlg-version': 'firered' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-frlg') && document.getElementById('map-loading')?.hidden);
  await waitFor(page, () => [...document.images].some(image => /Karte\/tiles-frlg\/0\/0_0\.webp/.test(image.src)));

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    tile: [...document.images].find(image => image.src.includes('/tiles-frlg/'))?.src || '',
    frlg: !!window.KARTE_FRLG,
    editions: document.querySelectorAll('[data-version]').length,
    filters: document.querySelectorAll('[data-kind]').length,
    labels: document.querySelectorAll('.kanto-label').length,
    credit: document.querySelector('.map-note a')?.href || '',
    seaChildren: document.getElementById('km')?.childElementCount,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('FR/LG: eigene Kanto- und Sevii-Karte geladen', initial.frlg && /Kanto/.test(initial.heading) && /Sevii/.test(initial.heading) && /Feuerrot/.test(initial.title), JSON.stringify(initial));
  check('FR/LG: lokale ROM-Kartenblätter geladen', /tiles-frlg\//.test(initial.tile), initial.tile);
  check('FR/LG: 60 Orte auswählbar', initial.places === 60, String(initial.places));
  check('FR/LG: Editionsschalter und Ortsbeschriftungen angezeigt', initial.editions === 2 && initial.filters === 0 && initial.labels >= 18, JSON.stringify(initial));
  check('FR/LG: Kartenquelle lokal dokumentiert', /tiles-frlg\/SOURCE\.txt/.test(initial.credit), initial.credit);
  check('FR/LG: keine Sinnoh-Meerszene und kein Überlauf', initial.seaChildren === 0 && initial.overflow <= 1, JSON.stringify(initial));
  if (process.env.FRLG_SCREENSHOT) await page.screenshot({ path: process.env.FRLG_SCREENSHOT, fullPage: true });

  await page.evaluate(() => { location.hash = 'route-10'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 10'));
  const fireMons = await page.$$eval('.wild-table [data-mon]', rows => rows.map(row => row.dataset.mon).sort().join(','));
  await page.click('[data-version="leafgreen"]');
  await waitFor(page, old => [...document.querySelectorAll('.wild-table [data-mon]')].map(row => row.dataset.mon).sort().join(',') !== old, fireMons);
  const version = await page.evaluate(() => ({
    stored: localStorage.getItem('karte-frlg-version'),
    leafPressed: document.querySelector('[data-version="leafgreen"]')?.getAttribute('aria-pressed'),
    mons: [...document.querySelectorAll('.wild-table [data-mon]')].map(row => row.dataset.mon).sort().join(','),
  }));
  check('FR/LG: Blattgrün-Schalter aktualisiert die Funddaten', version.stored === 'leafgreen' && version.leafPressed === 'true' && version.mons !== fireMons, JSON.stringify(version));

  const toPlatinum = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('platin'));
  await toPlatinum;
  await waitFor(page, () => !window.KARTE_FRLG && document.querySelector('.leaflet-container'));
  check('FR/LG: Wechsel zu Platin lädt Sinnoh', await page.evaluate(() => /Sinnoh|Platin/.test(document.querySelector('header h1')?.textContent || '')));

  const back = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('feuerrot-blattgruen'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-frlg') && document.getElementById('map-loading')?.hidden);
  check('FR/LG: Wechsel zurück lädt Feuerrot/Blattgrün', await page.evaluate(() => !!window.KARTE_FRLG && /Sevii/.test(document.querySelector('header h1')?.textContent || '')));
  check('FR/LG: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();

  const offline = await browser.newPage();
  const offlineErrors = [];
  offline.on('pageerror', error => offlineErrors.push(String(error)));
  await offline.evaluateOnNewDocument(() => {
    localStorage.setItem('hub-active-game', 'feuerrot-blattgruen');
    localStorage.setItem('hub-gen', '3');
    localStorage.setItem('hub-lang', 'de');
    localStorage.setItem('karte-frlg-version', 'firered');
  });
  await offline.setRequestInterception(true);
  offline.on('request', request => request.url().startsWith('http://localhost:') ? request.continue() : request.abort());
  await offline.goto(`${BASE}/Karte/index.html`, { waitUntil: 'domcontentloaded' });
  const cached = await offline.evaluate(async () => {
    await navigator.serviceWorker.register('/sw.js');
    await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Service Worker timeout')), 30000))]);
    const cacheName = (await caches.keys()).find(name => name.startsWith('pokehub-static-'));
    const cache = await caches.open(cacheName);
    return {
      data: !!(await cache.match(new URL('frlg.json', location.href).href)),
      manifest: !!(await cache.match(new URL('tiles-frlg/index.json', location.href).href)),
      overview: !!(await cache.match(new URL('tiles-frlg/0/0_0.webp', location.href).href)),
    };
  });
  check('FR/LG: Daten, Manifest und Übersicht offline vorgeladen', cached.data && cached.manifest && cached.overview, JSON.stringify(cached));
  check('FR/LG: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (error) {
  check('FR/LG-Kartentest', false, error.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle FR/LG-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
