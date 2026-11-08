// Gold/Silber lädt die aus pret/pokegold gerenderte GBC-Welt mit Johto und Kanto.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'gold-silber', 'hub-gen': '2', 'hub-lang': 'de', 'karte-gs-version': 'gold' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-gs') && document.getElementById('map-loading')?.hidden);
  await waitFor(page, () => [...document.images].some(image => /Karte\/tiles-gold-silver\/0\/0_0\.webp/.test(image.src)));

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    tile: [...document.images].find(image => image.src.includes('/tiles-gold-silver/'))?.src || '',
    gs: !!window.KARTE_GS,
    editions: document.querySelectorAll('[data-version]').length,
    filters: document.querySelectorAll('[data-kind]').length,
    labels: document.querySelectorAll('.kanto-label').length,
    credit: document.querySelector('.map-note a')?.href || '',
    seaChildren: document.getElementById('km')?.childElementCount,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('Gold/Silber: eigene Johto- und Kanto-Karte geladen', initial.gs && /Johto/.test(initial.heading) && /Kanto/.test(initial.heading) && /Gold/.test(initial.title), JSON.stringify(initial));
  check('Gold/Silber: lokale GBC-Kartenblätter geladen', /tiles-gold-silver\//.test(initial.tile), initial.tile);
  check('Gold/Silber: 71 Orte auswählbar', initial.places === 71, String(initial.places));
  check('Gold/Silber: Editionsschalter und Ortsbeschriftungen angezeigt', initial.editions === 2 && initial.filters === 0 && initial.labels === 25, JSON.stringify(initial));
  check('Gold/Silber: Kartenquelle lokal dokumentiert', /tiles-gold-silver\/SOURCE\.txt/.test(initial.credit), initial.credit);
  check('Gold/Silber: keine Sinnoh-Meerszene und kein Überlauf', initial.seaChildren === 0 && initial.overflow <= 1, JSON.stringify(initial));
  if (process.env.GS_SCREENSHOT) await page.screenshot({ path: process.env.GS_SCREENSHOT, fullPage: true });

  await page.evaluate(() => { location.hash = 'route-30'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 30'));
  const goldMons = await page.$$eval('.wild-table [data-mon]', rows => rows.map(row => row.dataset.mon).sort().join(','));
  await page.click('[data-version="silver"]');
  await waitFor(page, old => [...document.querySelectorAll('.wild-table [data-mon]')].map(row => row.dataset.mon).sort().join(',') !== old, goldMons);
  const version = await page.evaluate(() => ({
    stored: localStorage.getItem('karte-gs-version'),
    silverPressed: document.querySelector('[data-version="silver"]')?.getAttribute('aria-pressed'),
    mons: [...document.querySelectorAll('.wild-table [data-mon]')].map(row => row.dataset.mon).sort().join(','),
  }));
  check('Gold/Silber: Silber-Schalter aktualisiert die Funddaten', version.stored === 'silver' && version.silverPressed === 'true' && version.mons !== goldMons, JSON.stringify(version));

  const toPlatinum = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('platin'));
  await toPlatinum;
  await waitFor(page, () => !window.KARTE_GS && document.querySelector('.leaflet-container'));
  check('Gold/Silber: Wechsel zu Platin lädt Sinnoh', await page.evaluate(() => /Sinnoh|Platin/.test(document.querySelector('header h1')?.textContent || '')));

  const back = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('gold-silber'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-gs') && document.getElementById('map-loading')?.hidden);
  check('Gold/Silber: Wechsel zurück lädt Gold/Silber', await page.evaluate(() => !!window.KARTE_GS && /Johto/.test(document.querySelector('header h1')?.textContent || '')));
  check('Gold/Silber: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();

  const offline = await browser.newPage();
  const offlineErrors = [];
  offline.on('pageerror', error => offlineErrors.push(String(error)));
  await offline.evaluateOnNewDocument(() => {
    localStorage.setItem('hub-active-game', 'gold-silber');
    localStorage.setItem('hub-gen', '2');
    localStorage.setItem('hub-lang', 'de');
    localStorage.setItem('karte-gs-version', 'gold');
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
      data: !!(await cache.match(new URL('gold-silver.json', location.href).href)),
      manifest: !!(await cache.match(new URL('tiles-gold-silver/index.json', location.href).href)),
      overview: !!(await cache.match(new URL('tiles-gold-silver/0/0_0.webp', location.href).href)),
    };
  });
  check('Gold/Silber: Daten, Manifest und Übersicht offline vorgeladen', cached.data && cached.manifest && cached.overview, JSON.stringify(cached));
  check('Gold/Silber: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (error) {
  check('Gold/Silber-Kartentest', false, error.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Gold/Silber-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
