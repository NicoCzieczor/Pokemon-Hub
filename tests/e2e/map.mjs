// Die Karten-Seite übernimmt das aktive Hub-Spiel und lädt für Rot/Blau die lokale Kanto-Tilepyramide.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'rot-blau', 'hub-gen': '1', 'hub-lang': 'de' },
  });
  await waitFor(page, () => document.body.classList.contains('is-kanto') && document.getElementById('map-loading')?.hidden);
  await waitFor(page, () => [...document.images].some(img => /Karte\/tiles-kanto\/0\/0_0\.webp/.test(img.src)));

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    badge: document.querySelector('.game-badge')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    tile: [...document.images].find(img => img.src.includes('/tiles-kanto/'))?.src || '',
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('Kanto: Rot/Blau wählt die Kanto-Karte', /Kanto/.test(initial.title) && /Kanto/.test(initial.heading), JSON.stringify(initial));
  check('Kanto: lokale Kartenblätter geladen', /tiles-kanto/.test(initial.tile), initial.tile);
  check('Kanto: alle Outdoor-Orte auswählbar', initial.places === 36, String(initial.places));
  check('Kanto: kein horizontaler Seitenüberlauf', initial.overflow <= 1, String(initial.overflow));

  await page.evaluate(() => {
    const b = [...document.querySelectorAll('.dir-item')].find(x => x.textContent.includes('Route 1'));
    b?.click();
  });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 1'));
  const location = await page.evaluate(() => ({
    hash: location.hash,
    tabs: [...document.querySelectorAll('.tab')].map(b => b.textContent.trim()),
    wildRows: document.querySelectorAll('.wild-table tbody tr').length,
  }));
  check('Kanto: Ort öffnet Details und Wilddaten', /route-1/.test(location.hash) && location.wildRows > 0, JSON.stringify(location));

  await page.evaluate(() => { location.hash = 'route-2'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 2'));
  const redMons = await page.$$eval('.wild-table [data-mon]', rows => rows.map(r => r.dataset.mon).sort().join(','));
  await page.click('[data-version="blue"]');
  await waitFor(page, old => [...document.querySelectorAll('.wild-table [data-mon]')].map(r => r.dataset.mon).sort().join(',') !== old, redMons);
  const version = await page.evaluate(() => ({
    stored: localStorage.getItem('karte-rb-version'),
    bluePressed: document.querySelector('[data-version="blue"]')?.getAttribute('aria-pressed'),
    mons: [...document.querySelectorAll('.wild-table [data-mon]')].map(r => r.dataset.mon).sort().join(','),
  }));
  check('Kanto: Rot/Blau-Schalter aktualisiert editionsspezifische Daten', version.stored === 'blue' && version.bluePressed === 'true' && version.mons !== redMons, JSON.stringify(version));

  const nav = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('platin'));
  await nav;
  await waitFor(page, () => !document.body.classList.contains('is-kanto') && document.querySelector('.leaflet-container'));
  check('Kanto: Spielwechsel lädt wieder die Platin-Karte', await page.evaluate(() => !window.KARTE_KANTO && /Sinnoh|Platin/.test(document.querySelector('header h1')?.textContent || '')));

  const backToKanto = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('rot-blau'));
  await backToKanto;
  await waitFor(page, () => document.body.classList.contains('is-kanto') && document.getElementById('map-loading')?.hidden);
  check('Kanto: Menüwechsel von Platin zu Rot/Blau lädt Kanto', await page.evaluate(() => !!window.KARTE_KANTO && /Kanto/.test(document.querySelector('header h1')?.textContent || '')));
  check('Kanto: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();

  // Kanto startet vor app.js. Auch bei verzögertem app.js und ohne Image.decode muss die gewählte Sprache
  // sofort stimmen und die onload-Alternative das lokale Übersichtsblatt anzeigen.
  const fallback = await browser.newPage();
  const fallbackErrors = [];
  fallback.on('pageerror', e => fallbackErrors.push(String(e)));
  await fallback.setBypassServiceWorker(true);
  await fallback.evaluateOnNewDocument(() => {
    localStorage.clear();
    localStorage.setItem('hub-active-game', 'rot-blau');
    localStorage.setItem('hub-gen', '1');
    localStorage.setItem('hub-lang', 'en');
    Object.defineProperty(HTMLImageElement.prototype, 'decode', { configurable: true, value: undefined });
  });
  await fallback.setRequestInterception(true);
  fallback.on('request', req => {
    if (req.url().endsWith('/Karte/app.js')) return setTimeout(() => req.continue(), 1200);
    req.continue();
  });
  await fallback.goto(`${BASE}/Karte/index.html`, { waitUntil: 'networkidle0' });
  await waitFor(fallback, () => document.body.classList.contains('is-kanto') && document.getElementById('map-loading')?.hidden);
  const resilient = await fallback.evaluate(() => ({
    heading: document.querySelector('header h1')?.textContent.trim(),
    title: document.title,
    sheets: document.querySelectorAll('.kanto-sheet').length,
    seaChildren: document.getElementById('km')?.childElementCount,
  }));
  check('Kanto: Englisch gilt schon vor dem verzögerten app.js', /Map of Kanto Red \/ Blue/.test(resilient.heading) && /Kanto Map|Map of Kanto/.test(resilient.title), JSON.stringify(resilient));
  check('Kanto: Kartenblatt lädt auch ohne Image.decode', resilient.sheets > 0, JSON.stringify(resilient));
  check('Kanto: versteckte Sinnoh-Meerszene wird nicht aufgebaut', resilient.seaChildren === 0, String(resilient.seaChildren));
  check('Kanto: Fallback ohne JavaScript-Fehler', fallbackErrors.length === 0, fallbackErrors.join(' | '));
  await fallback.close();
} catch (e) {
  check('Kanto-Kartentest', false, e.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Kanto-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
