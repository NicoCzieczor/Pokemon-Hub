// Diamant/Perl lädt seine echte DP-Sinnoh-Welt und editionsspezifische Funddaten.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'diamant-perl', 'hub-gen': '4', 'hub-lang': 'de', 'karte-dp-version': 'diamond' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-dp') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  await waitFor(page, () => [...document.images].some(image => /Karte\/tiles-diamond-pearl\/0\/0_0\.webp/.test(image.src)), undefined, 90000);

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    tile: [...document.images].find(image => image.src.includes('/tiles-diamond-pearl/'))?.src || '',
    dp: !!window.KARTE_DP,
    platinum: !window.KARTE_RETRO,
    editions: document.querySelectorAll('[data-version]').length,
    filters: document.querySelectorAll('[data-kind]').length,
    labels: document.querySelectorAll('.kanto-label').length,
    credit: document.querySelector('.map-note a')?.href || '',
    seaChildren: document.getElementById('km')?.childElementCount,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('D/P: eigene Sinnoh-Karte geladen', initial.dp && !initial.platinum && /Sinnoh/.test(initial.heading) && /Diamant/.test(initial.title), JSON.stringify(initial));
  check('D/P: lokale Original-Kartenblätter geladen', /tiles-diamond-pearl\//.test(initial.tile), initial.tile);
  check('D/P: 61 Orte auswählbar', initial.places === 61, String(initial.places));
  check('D/P: zwei Editionen und Ortsbeschriftungen angezeigt', initial.editions === 2 && initial.filters === 0 && initial.labels === 18, JSON.stringify(initial));
  check('D/P: Kartenquelle lokal dokumentiert', /tiles-diamond-pearl\/SOURCE\.txt/.test(initial.credit), initial.credit);
  check('D/P: keine Platin-Meerszene und kein Überlauf', initial.seaChildren === 0 && initial.overflow <= 1, JSON.stringify(initial));

  await page.evaluate(() => { location.hash = 'eterna-forest'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Ewigwald'));
  const diamondMons = await page.$$eval('.wild-table [data-mon]', rows => rows.map(row => row.dataset.mon).sort().join(','));
  check('D/P: Diamant zeigt Kramurx im Ewigwald', diamondMons.split(',').includes('198'), diamondMons);
  await page.click('[data-version="pearl"]');
  await waitFor(page, old => [...document.querySelectorAll('.wild-table [data-mon]')].map(row => row.dataset.mon).sort().join(',') !== old, diamondMons);
  const pearl = await page.evaluate(() => ({
    stored: localStorage.getItem('karte-dp-version'),
    pressed: document.querySelector('[data-version="pearl"]')?.getAttribute('aria-pressed'),
    mons: [...document.querySelectorAll('.wild-table [data-mon]')].map(row => row.dataset.mon).sort().join(','),
  }));
  check('D/P: Perl-Schalter aktualisiert die Funddaten', pearl.stored === 'pearl' && pearl.pressed === 'true' && pearl.mons.split(',').includes('200') && !pearl.mons.split(',').includes('198'), JSON.stringify(pearl));

  const toPlatinum = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('platin'));
  await toPlatinum;
  await waitFor(page, () => !window.KARTE_DP && !window.KARTE_RETRO && document.querySelector('.leaflet-container'));
  check('D/P: Wechsel zu Platin lädt die separate Platin-Karte', await page.evaluate(() => !window.KARTE_DP && /Platin/.test(document.querySelector('header h1')?.textContent || '')));

  const back = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('diamant-perl'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-dp') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  check('D/P: Wechsel zurück lädt wieder die DP-Tiles', await page.evaluate(() => !!window.KARTE_DP && !!window.KARTE_RETRO));
  check('D/P: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();

  const offline = await browser.newPage();
  const offlineErrors = [];
  offline.on('pageerror', error => offlineErrors.push(String(error)));
  await offline.evaluateOnNewDocument(() => {
    localStorage.setItem('hub-active-game', 'diamant-perl');
    localStorage.setItem('hub-gen', '4');
    localStorage.setItem('hub-lang', 'de');
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
      data: !!(await cache.match(new URL('diamond-pearl.json', location.href).href)),
      manifest: !!(await cache.match(new URL('tiles-diamond-pearl/index.json', location.href).href)),
      overview: !!(await cache.match(new URL('tiles-diamond-pearl/0/0_0.webp', location.href).href)),
    };
  });
  check('D/P: Daten, Manifest und Übersicht offline vorgeladen', cached.data && cached.manifest && cached.overview, JSON.stringify(cached));
  check('D/P: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (error) {
  check('Diamant/Perl-Kartentest', false, error.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Diamant/Perl-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
