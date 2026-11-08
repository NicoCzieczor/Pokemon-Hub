// Gelb und Kristall laden ihre eigenen, aus den jeweiligen Disassemblies gerenderten GBC-Karten.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

async function testVariant({ game, gen, body, flag, tileDir, title, places, labels, filters, hash, detail }) {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': game, 'hub-gen': gen, 'hub-lang': 'de' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, expected => document.body.classList.contains(expected) && document.getElementById('map-loading')?.hidden, body, 90000);
  await waitFor(page, dir => [...document.images].some(image => image.src.includes(`/Karte/${dir}/0/0_0.webp`)), tileDir, 90000);
  const initial = await page.evaluate(flagName => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    tile: [...document.images].find(image => image.src.includes('/tiles-'))?.src || '',
    flag: !!window[flagName],
    editions: document.querySelectorAll('[data-version]').length,
    filters: document.querySelectorAll('[data-kind]').length,
    labels: document.querySelectorAll('.kanto-label').length,
    credit: document.querySelector('.map-note a')?.href || '',
    seaChildren: document.getElementById('km')?.childElementCount,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }), flag);
  check(`${title}: eigene Karte und Titel geladen`, initial.flag && initial.title.includes(title) && initial.heading.includes(title), JSON.stringify(initial));
  check(`${title}: lokale Kartenblätter geladen`, initial.tile.includes(`/${tileDir}/`), initial.tile);
  check(`${title}: vollständiges Ortsverzeichnis`, initial.places === places, String(initial.places));
  check(`${title}: Einzelspiel ohne überflüssigen Editionsschalter`, initial.editions === 0 && initial.filters === filters && initial.labels === labels, JSON.stringify(initial));
  check(`${title}: Kartenquelle lokal dokumentiert`, initial.credit.includes(`/${tileDir}/SOURCE.txt`), initial.credit);
  check(`${title}: keine Sinnoh-Meerszene und kein Überlauf`, initial.seaChildren === 0 && initial.overflow <= 1, JSON.stringify(initial));

  await page.evaluate(value => { location.hash = value; }, hash);
  await waitFor(page, name => document.querySelector('.side-head h2')?.textContent.includes(name), detail);
  check(`${title}: Ortsdetail lässt sich öffnen`, await page.evaluate(() => !!document.querySelector('.side-head h2')));
  check(`${title}: keine JavaScript-Fehler`, errors.length === 0, errors.join(' | '));
  await page.close();
}

try {
  await testVariant({ game: 'gelb', gen: '1', body: 'is-yellow', flag: 'KARTE_YELLOW', tileDir: 'tiles-yellow', title: 'Gelb', places: 36, labels: 36, filters: 4, hash: 'route-1', detail: 'Route 1' });
  await testVariant({ game: 'kristall', gen: '2', body: 'is-crystal', flag: 'KARTE_CRYSTAL', tileDir: 'tiles-crystal', title: 'Kristall', places: 72, labels: 26, filters: 0, hash: 'battle-tower', detail: 'Duellturm' });

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
    const has = async file => !!(await cache.match(new URL(file, location.href).href));
    return {
      yellowData: await has('yellow.json'), yellowManifest: await has('tiles-yellow/index.json'), yellowOverview: await has('tiles-yellow/0/0_0.webp'),
      crystalData: await has('crystal.json'), crystalManifest: await has('tiles-crystal/index.json'), crystalOverview: await has('tiles-crystal/0/0_0.webp'),
    };
  });
  check('Gelb/Kristall: Daten, Manifeste und Übersichten offline vorgeladen', Object.values(cached).every(Boolean), JSON.stringify(cached));
  check('Gelb/Kristall: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (error) {
  check('Gelb/Kristall-Kartentest', false, error.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Gelb/Kristall-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
