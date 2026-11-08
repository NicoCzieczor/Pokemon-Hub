// Sonne/Mond lädt den lokalen Alola-Szenenatlas und getrennte Funddaten.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'sonne-mond', 'hub-gen': '7', 'hub-lang': 'de', 'karte-sm-version': 'sun' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-sm') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  await waitFor(page, () => [...document.images].some(image => /Karte\/tiles-alola-sm\/0\/0_0\.webp/.test(image.src)), undefined, 90000);

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    tile: [...document.images].find(image => image.src.includes('/tiles-alola-sm/'))?.src || '',
    sm: !!window.KARTE_SM,
    oras: !!window.KARTE_ORAS,
    editions: document.querySelectorAll('[data-version]').length,
    labels: document.querySelectorAll('.kanto-label').length,
    credit: document.querySelector('.map-note a')?.href || '',
    seaChildren: document.getElementById('km')?.childElementCount,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('S/M: eigene Alola-Karte geladen', initial.sm && !initial.oras && /Alola/.test(initial.heading) && /Sonne \/ Mond/.test(initial.title), JSON.stringify(initial));
  check('S/M: lokale 3DS-Szenen-Kartenblätter geladen', /tiles-alola-sm\//.test(initial.tile), initial.tile);
  check('S/M: 63 Orte und zwei Editionen auswählbar', initial.places === 63 && initial.editions === 2, JSON.stringify(initial));
  check('S/M: Atlas kommt ohne doppelte HTML-Kartenlabels aus', initial.labels === 0, String(initial.labels));
  check('S/M: Kartenquelle lokal dokumentiert', /tiles-alola-sm\/SOURCE\.txt/.test(initial.credit), initial.credit);
  check('S/M: keine Sinnoh-Meerszene und kein Überlauf', initial.seaChildren === 0 && initial.overflow <= 1, JSON.stringify(initial));

  await page.click('.kanto-area');
  await new Promise(resolve => setTimeout(resolve, 300));
  const clickedCard = await page.evaluate(() => ({
    heading: document.querySelector('.side-head h2')?.textContent.trim() || '',
    hash: location.hash,
  }));
  check('S/M: Klick direkt auf eine Atlas-Karte öffnet den Ort', clickedCard.heading !== 'Alle Orte' && !!clickedCard.hash, JSON.stringify(clickedCard));

  await page.evaluate(() => { location.hash = 'lush-jungle'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Schattendschungel'));
  const sunMons = await page.evaluate(() => [...document.querySelectorAll('.wild-table [data-mon]')].map(row => Number(row.dataset.mon)));
  check('S/M: Sonne zeigt Quartermak im Schattendschungel', sunMons.includes(766) && !sunMons.includes(765), JSON.stringify(sunMons));

  await page.click('[data-version="moon"]');
  await waitFor(page, () => localStorage.getItem('karte-sm-version') === 'moon');
  const moonMons = await page.evaluate(() => [...document.querySelectorAll('.wild-table [data-mon]')].map(row => Number(row.dataset.mon)));
  check('S/M: Mond zeigt Kommandutan im Schattendschungel', moonMons.includes(765) && !moonMons.includes(766), JSON.stringify(moonMons));

  const toXy = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('x-y'));
  await toXy;
  await waitFor(page, () => !!window.KARTE_XY && document.getElementById('map-loading')?.hidden, undefined, 90000);
  check('S/M: Menüwechsel zu X/Y lädt die separate Kalos-Karte', await page.evaluate(() => !!window.KARTE_XY && !window.KARTE_SM));

  const back = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('sonne-mond'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-sm') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  check('S/M: Menüwechsel zurück lädt wieder die Alola-Tiles', await page.evaluate(() => !!window.KARTE_SM && !window.KARTE_XY));
  check('S/M: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
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
      data: !!(await cache.match(new URL('alola-sm.json', location.href).href)),
      manifest: !!(await cache.match(new URL('tiles-alola-sm/index.json', location.href).href)),
      overview: !!(await cache.match(new URL('tiles-alola-sm/0/0_0.webp', location.href).href)),
    };
  });
  check('S/M: Daten, Manifest und Übersicht offline vorgeladen', cached.data && cached.manifest && cached.overview, JSON.stringify(cached));
  check('S/M: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (error) {
  check('Sonne/Mond-Kartentest', false, error.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Sonne/Mond-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
