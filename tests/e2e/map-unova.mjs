// Die Karten-Seite übernimmt Schwarz/Weiß und lädt die lokale Einall-Kachelpyramide.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'schwarz-weiss', 'hub-gen': '5', 'hub-lang': 'de', 'karte-bw-version': 'white' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-unova') && document.getElementById('map-loading')?.hidden);
  await waitFor(page, () => [...document.images].some(img => /Karte\/tiles-unova\/white\/0\/0_0\.webp/.test(img.src)));

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    tile: [...document.images].find(img => img.src.includes('/tiles-unova/'))?.src || '',
    unova: !!window.KARTE_UNOVA,
    editions: document.querySelectorAll('[data-version]').length,
    filters: document.querySelectorAll('[data-kind]').length,
    labels: document.querySelectorAll('.kanto-label').length,
    credit: document.querySelector('.map-note a')?.href || '',
    seaChildren: document.getElementById('km')?.childElementCount,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('Einall: Schwarz/Weiß lädt die eigene Karte', initial.unova && /Einall/.test(initial.heading) && /Schwarz/.test(initial.title), JSON.stringify(initial));
  check('Einall: echte lokale ROM-Kartenblätter für Weiß geladen', /tiles-unova\/white\//.test(initial.tile), initial.tile);
  check('Einall: 58 Orte auswählbar', initial.places === 58, String(initial.places));
  check('Einall: Editionsschalter und Ortsbeschriftungen angezeigt', initial.editions === 2 && initial.filters === 0 && initial.labels > 10, JSON.stringify(initial));
  check('Einall: Kartenquellen sind lokal dokumentiert', /tiles-unova\/SOURCE\.txt/.test(initial.credit), initial.credit);
  check('Einall: keine Sinnoh-Meerszene und kein Überlauf', initial.seaChildren === 0 && initial.overflow <= 1, JSON.stringify(initial));
  if (process.env.UNOVA_SCREENSHOT) await page.screenshot({ path: process.env.UNOVA_SCREENSHOT, fullPage: true });

  await page.evaluate(() => { location.hash = 'route-10'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 10'));
  if (process.env.UNOVA_DETAIL_SCREENSHOT) await page.screenshot({ path: process.env.UNOVA_DETAIL_SCREENSHOT, fullPage: true });
  const whiteMons = await page.$$eval('.wild-table [data-mon]', rows => rows.map(r => r.dataset.mon).sort().join(','));
  await page.click('[data-version="black"]');
  await waitFor(page, old => [...document.querySelectorAll('.wild-table [data-mon]')].map(r => r.dataset.mon).sort().join(',') !== old, whiteMons);
  await waitFor(page, () => [...document.images].some(img => /tiles-unova\/black\/0\/0_0\.webp/.test(img.src)));
  const version = await page.evaluate(() => ({
    stored: localStorage.getItem('karte-bw-version'),
    blackPressed: document.querySelector('[data-version="black"]')?.getAttribute('aria-pressed'),
    mons: [...document.querySelectorAll('.wild-table [data-mon]')].map(r => r.dataset.mon).sort().join(','),
    blackTile: [...document.images].some(img => /tiles-unova\/black\//.test(img.src)),
    labelsHidden: [...document.querySelectorAll('.kanto-label-wrap')].every(el => getComputedStyle(el).display === 'none'),
  }));
  check('Einall: Schwarz/Weiß-Schalter aktualisiert Karte und Funddaten', version.stored === 'black' && version.blackPressed === 'true' && version.mons !== whiteMons && version.blackTile && version.labelsHidden, JSON.stringify(version));

  const toPlatinum = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('platin'));
  await toPlatinum;
  await waitFor(page, () => !window.KARTE_UNOVA && document.querySelector('.leaflet-container'));
  check('Einall: Wechsel zu Platin lädt Sinnoh', await page.evaluate(() => /Sinnoh|Platin/.test(document.querySelector('header h1')?.textContent || '')));

  const back = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('schwarz-weiss'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-unova') && document.getElementById('map-loading')?.hidden);
  check('Einall: Wechsel zurück lädt wieder Schwarz/Weiß', await page.evaluate(() => !!window.KARTE_UNOVA && /Einall/.test(document.querySelector('header h1')?.textContent || '')));
  check('Einall: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();

  const offline = await browser.newPage();
  const offlineErrors = [];
  offline.on('pageerror', e => offlineErrors.push(String(e)));
  await offline.evaluateOnNewDocument(() => {
    localStorage.setItem('hub-active-game', 'schwarz-weiss');
    localStorage.setItem('hub-gen', '5');
    localStorage.setItem('hub-lang', 'de');
    localStorage.setItem('karte-bw-version', 'white');
  });
  await offline.setRequestInterception(true);
  offline.on('request', req => req.url().startsWith('http://localhost:') ? req.continue() : req.abort());
  await offline.goto(`${BASE}/Karte/index.html`, { waitUntil: 'domcontentloaded' });
  const cached = await offline.evaluate(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await navigator.serviceWorker.register('/sw.js');
    await Promise.race([navigator.serviceWorker.ready, new Promise((_, reject) => setTimeout(() => reject(new Error('Service Worker timeout')), 30000))]);
    const cacheName = (await caches.keys()).find(name => name.startsWith('pokehub-static-'));
    const cache = await caches.open(cacheName);
    return {
      data: !!(await cache.match(new URL('unova.json', location.href).href)),
      blackOverview: !!(await cache.match(new URL('tiles-unova/black/0/0_0.webp', location.href).href)),
      whiteOverview: !!(await cache.match(new URL('tiles-unova/white/0/0_0.webp', location.href).href)),
    };
  });
  check('Einall: Daten und beide Übersichten sind offline vorgeladen', cached.data && cached.blackOverview && cached.whiteOverview, JSON.stringify(cached));
  check('Einall: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (e) {
  check('Einall-Kartentest', false, e.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Einall-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
