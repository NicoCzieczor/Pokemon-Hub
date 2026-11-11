// FR/BG läuft über die Platin-Karte (app.js): Kanto + Sieben Inseln mit Innenkarten, Eingängen, Editionen und allen Begegnungsarten.
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
  await waitFor(page, () => document.body.classList.contains('is-frlg') && document.getElementById('map-loading')?.hidden, null, 30000);
  await waitFor(page, () => [...document.images].some(img => /Karte\/tiles-frlg\/0\/0_0\.webp/.test(img.src)), null, 30000);

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    groups: [...document.querySelectorAll('.dir-group h3')].map(h => h.textContent.trim().split(' ').slice(0, 3).join(' ')),
    tile: [...document.images].find(img => img.src.includes('/tiles-frlg/'))?.src || '',
    retro: !!window.KARTE_RETRO,
    editions: document.querySelectorAll('[data-version]').length,
    labels: document.querySelectorAll('.loc-label').length,
    seaChildren: document.getElementById('km')?.childElementCount,
    rando: document.getElementById('map-rando')?.childElementCount || 0,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('FR/BG: Platin-Karte lädt Kanto und die Sieben Inseln', !initial.retro && /Kanto/.test(initial.heading) && /Sieben Inseln/.test(initial.heading) && /Feuerrot/.test(initial.title), JSON.stringify(initial));
  check('FR/BG: lokale Kartenblätter geladen', /tiles-frlg/.test(initial.tile), initial.tile);
  check('FR/BG: Städte, Routen und Höhlen je Region', initial.places >= 90 && initial.groups.some(g => /^Kanto/.test(g)) && initial.groups.some(g => /^Sieben/.test(g)), JSON.stringify(initial.groups));
  check('FR/BG: Editionsschalter und Ortsnamen', initial.editions === 2 && initial.labels >= 50, JSON.stringify(initial));
  // Ohne Direktlink beginnt die Karte in Alabastia (nicht in der ganzen Region)
  const start = await page.evaluate(() => {
    const [x0, z0, x1, z1] = D.locations.find(l => l.en === 'Pallet Town').rects[0], c = map.getCenter();
    return { zoom: map.getZoom(), inView: map.getBounds().contains(L.latLng(-(z0 + z1) / 2, (x0 + x1) / 2)), dx: Math.round(c.lng - (x0 + x1) / 2), dz: Math.round(-c.lat - (z0 + z1) / 2) };
  });
  check('FR/BG: Karte startet in Alabastia', start.inView && start.zoom >= 1 && Math.abs(start.dx) <= 4 && Math.abs(start.dz) <= 4, JSON.stringify(start));
  check('FR/BG: keine Sinnoh-Meerszene, kein Platin-Randomizer, kein Überlauf', initial.seaChildren === 0 && initial.rando === 0 && initial.overflow <= 1, JSON.stringify(initial));

  await page.evaluate(() => { location.hash = 'route-24'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 24'));
  await page.click('[data-tab="wild"]');
  const fireMons = await page.$$eval('.wild-table [data-mon]', rows => rows.map(r => r.dataset.mon).sort().join(','));
  await page.click('[data-version="leafgreen"]');
  await waitFor(page, old => [...document.querySelectorAll('.wild-table [data-mon]')].map(r => r.dataset.mon).sort().join(',') !== old, fireMons);
  const version = await page.evaluate(() => ({
    stored: localStorage.getItem('karte-frlg-version'),
    leafPressed: document.querySelector('[data-version="leafgreen"]')?.getAttribute('aria-pressed'),
    oddish: !!document.querySelector('.wild-table [data-mon="43"]'),
    bellsprout: !!document.querySelector('.wild-table [data-mon="69"]'),
    text: document.getElementById('tab-body')?.textContent || '',
  }));
  check('FR/BG: Blattgrün-Schalter tauscht Myrapla gegen Knofensa', version.stored === 'leafgreen' && version.leafPressed === 'true' && version.bellsprout && !version.oddish && /43/.test(fireMons), JSON.stringify({ ...version, text: undefined, fireMons }));
  check('FR/BG: Gras ohne Tageszeit, Surfen und alle drei Angeln', /Gras/.test(version.text) && !/Morgens/.test(version.text) && /Surfen/.test(version.text) && /Superangel/.test(version.text));
  await page.click('[data-version="firered"]');

  await page.evaluate(() => { location.hash = 'pewter-city'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Marmoria City'));
  await page.click('[data-tab="trainers"]');
  check('FR/BG: Arenaleiter mit deutschem Namen und Team', await page.evaluate(() => /Leiter Rocko/.test(document.getElementById('tab-body')?.textContent || '') && document.querySelectorAll('#tab-body .party .mon').length >= 4));
  check('FR/BG: Auswahl als SVG gezeichnet', await page.evaluate(() => document.querySelectorAll('.leaflet-overlay-pane path').length > 0 && !document.querySelector('.leaflet-container canvas')));
  await page.click('[data-kind="trainer"]');
  check('FR/BG: Trainer-Marker erscheinen', await page.evaluate(() => document.querySelectorAll('.leaflet-overlay-pane path').length > 200));
  await page.click('[data-kind="trainer"]');
  // TM39 aus der Arena: die Stecknadel öffnet die Innenkarte der Arena
  await page.click('[data-tab="items"]');
  await page.evaluate(() => [...document.querySelectorAll('#tab-body .row')].find(r => /TM39/.test(r.textContent))?.querySelector('[data-map]')?.click());
  await waitFor(page, () => !document.getElementById('interior-bar').hidden && document.querySelector('.leaflet-pane image')?.getAttribute('href')?.includes('tiles-frlg/in/'), null, 15000);
  check('FR/BG: Geschenk öffnet die Innenkarte der Arena', await page.evaluate(() => /~pewter_city_gym$/.test(decodeURIComponent(location.hash))), await page.evaluate(() => location.hash));
  // Innenkarte mittig im Bild (die Kartengrenzen dürfen sie nicht nachträglich verschieben)
  await new Promise(r => setTimeout(r, 700));
  const centred = await page.evaluate(() => {
    const m = document.getElementById('map').getBoundingClientRect(), b = document.querySelector('.leaflet-interior-pane svg').getBoundingClientRect();
    return Math.abs((b.left + b.width / 2) - (m.left + m.width / 2)) < 4 && Math.abs((b.top + b.height / 2) - (m.top + m.height / 2)) < 4;
  });
  check('FR/BG: Innenkarte liegt mittig', centred);

  await page.evaluate(() => { location.hash = 'mt-moon'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Mondberg'));
  const moon = await page.evaluate(() => ({ maps: [...document.querySelectorAll('.map-btn')].map(b => b.textContent.trim()), ents: document.querySelectorAll('[data-goto]').length }));
  check('FR/BG: Höhle mit Etagen-Innenkarten und Eingängen', moon.maps.join() === '1F,B1F,B2F' && moon.ents === 2, JSON.stringify(moon));
  await page.click('.map-btn:nth-of-type(3)');
  await waitFor(page, () => !document.getElementById('interior-bar').hidden && document.getElementById('interior-select').value === 'MT_MOON_B2F');
  const pixel = await page.evaluate(() => {
    const el = document.getElementById('map'), at = z => { map.setZoom(z, { animate: false }); return el.classList.contains('z-pixel'); };
    return { native: at(4), above: at(4.5), below: at(3.5) };
  });
  check('FR/BG: Pixelgrafik ab voller Auflösung ohne Glättung', pixel.native && pixel.above && !pixel.below, JSON.stringify(pixel));
  await page.click('#interior-back');
  await waitFor(page, () => document.getElementById('interior-bar').hidden);

  await page.evaluate(() => { const i = document.getElementById('map-search'); i.value = 'Mewtu'; i.dispatchEvent(new Event('input')); });
  await waitFor(page, () => document.querySelector('#search-results .sr'));
  await page.click('#search-results .sr');
  await waitFor(page, () => /Mewtu/.test(document.querySelector('.mon-head')?.textContent || ''));
  check('FR/BG: Mewtu als feste Begegnung in der Azuria-Höhle', await page.evaluate(() => /Azuria-Höhle/.test(document.getElementById('side-content').textContent) && /Feste Begegnung/.test(document.getElementById('side-content').textContent)));

  const toPlatinum = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('platin'));
  await toPlatinum;
  await waitFor(page, () => !document.body.classList.contains('is-frlg') && document.querySelector('.leaflet-container'));
  check('FR/BG: Wechsel zu Platin lädt Sinnoh', await page.evaluate(() => /Sinnoh|Platin/.test(document.querySelector('header h1')?.textContent || '')));

  const back = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('feuerrot-blattgruen'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-frlg') && document.getElementById('map-loading')?.hidden);
  check('FR/BG: Wechsel zurück lädt wieder Feuerrot/Blattgrün', await page.evaluate(() => /Sieben Inseln/.test(document.querySelector('header h1')?.textContent || '')));
  check('FR/BG: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();

  // Der Service Worker muss Daten und Übersichtsblatt wirklich vorladen, nicht nur passende Pfade enthalten.
  const offline = await browser.newPage();
  const offlineErrors = [];
  offline.on('pageerror', e => offlineErrors.push(String(e)));
  await offline.evaluateOnNewDocument(() => {
    localStorage.setItem('hub-active-game', 'feuerrot-blattgruen');
    localStorage.setItem('hub-gen', '3');
    localStorage.setItem('hub-lang', 'de');
  });
  await offline.setRequestInterception(true);
  offline.on('request', req => req.url().startsWith('http://localhost:') ? req.continue() : req.abort());
  await offline.goto(`${BASE}/Karte/index.html`, { waitUntil: 'domcontentloaded' });
  const cached = await offline.evaluate(async () => {
    // pwa.js deaktiviert Worker auf localhost absichtlich. Nach dessen Aufräumrunde registrieren wir den
    // produktiven Worker hier ausdrücklich, um genau seine Installation und sein Precache zu prüfen.
    await new Promise(resolve => setTimeout(resolve, 500));
    await navigator.serviceWorker.register('/sw.js');
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Service-Worker-Installation dauerte zu lange')), 30000)),
    ]);
    const cacheName = (await caches.keys()).find(name => name.startsWith('pokehub-static-'));
    const cache = await caches.open(cacheName);
    return {
      data: !!(await cache.match(new URL('frlg.json', location.href).href)),
      manifest: !!(await cache.match(new URL('tiles-frlg/index.json', location.href).href)),
      overview: !!(await cache.match(new URL('tiles-frlg/0/0_0.webp', location.href).href)),
      interiors: !!(await cache.match(new URL('tiles-frlg/interiors.json', location.href).href)),
    };
  });
  check('FR/BG: Daten, Übersicht und Innenkarten-Index sind offline vorgeladen', cached.data && cached.manifest && cached.overview && cached.interiors, JSON.stringify(cached));
  check('FR/BG: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (e) {
  check('FR/BG-Kartentest', false, e.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle FR/BG-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
