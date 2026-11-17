// Smaragd läuft über die Platin-Karte (app.js) wie FR/BG: Hoenn aus der GBA-ROM mit Innenkarten, Eingängen,
// Unterwasser-Karten und Xeneroville im Krater von Route 126.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'smaragd', 'hub-gen': '3', 'hub-lang': 'de' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-emerald') && document.getElementById('map-loading')?.hidden, null, 30000);
  await waitFor(page, () => [...document.images].some(img => /Karte\/tiles-emerald\/0\/0_0\.webp/.test(img.src)), null, 30000);

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    groups: [...document.querySelectorAll('.dir-group h3')].map(h => h.textContent.trim()),
    tile: [...document.images].find(img => img.src.includes('/tiles-emerald/'))?.src || '',
    retro: !!window.KARTE_RETRO, hoenn: !!window.KARTE_HOENN,
    editions: document.querySelectorAll('[data-version]').length,
    labels: document.querySelectorAll('.loc-label').length,
    seaChildren: document.getElementById('km')?.childElementCount,
    rando: document.getElementById('map-rando')?.childElementCount || 0,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('Smaragd: Platin-Karte lädt Hoenn', !initial.retro && !initial.hoenn && /Hoenn/.test(initial.heading) && /Smaragd/.test(initial.title), JSON.stringify(initial));
  check('Smaragd: lokale Kartenblätter geladen', /tiles-emerald/.test(initial.tile), initial.tile);
  check('Smaragd: Städte, Routen und Höhlen ohne Regionsgruppen', initial.places >= 80 && initial.groups.length === 3, JSON.stringify(initial.groups));
  check('Smaragd: eine Edition (kein Schalter) und Ortsnamen', initial.editions === 0 && initial.labels >= 50, JSON.stringify(initial));
  // Ohne Direktlink beginnt die Karte in Wurzelheim
  const start = await page.evaluate(() => {
    const [x0, z0, x1, z1] = D.locations.find(l => l.en === 'Littleroot Town').rects[0], c = map.getCenter();
    return { zoom: map.getZoom(), inView: map.getBounds().contains(L.latLng(-(z0 + z1) / 2, (x0 + x1) / 2)), dx: Math.round(c.lng - (x0 + x1) / 2), dz: Math.round(-c.lat - (z0 + z1) / 2) };
  });
  check('Smaragd: Karte startet in Wurzelheim', start.inView && start.zoom >= 1 && Math.abs(start.dx) <= 4 && Math.abs(start.dz) <= 4, JSON.stringify(start));
  check('Smaragd: keine Sinnoh-Meerszene, kein Platin-Randomizer, kein Überlauf', initial.seaChildren === 0 && initial.rando === 0 && initial.overflow <= 1, JSON.stringify(initial));

  // Route 124: draußen Surfen und Angeln, darunter die Unterwasser-Karte mit Perlu und Relicanth
  await page.evaluate(() => { location.hash = 'route-124'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 124'));
  await page.click('[data-tab="wild"]');
  const r124 = await page.evaluate(() => ({ text: document.getElementById('tab-body')?.textContent || '', clamperl: !!document.querySelector('.wild-table [data-mon="366"]'), maps: [...document.querySelectorAll('.map-btn')].map(b => b.textContent.trim()) }));
  check('Smaragd: Route 124 mit Unterwasser-Bereich', /Unterwasser/.test(r124.text) && /Surfen/.test(r124.text) && /Superangel/.test(r124.text) && r124.clamperl && r124.maps.includes('Unterwasser'), JSON.stringify({ ...r124, text: r124.text.slice(0, 120) }));

  // Metarost City: Arenaleiterin mit Team, TM39 öffnet die Innenkarte der Arena
  await page.evaluate(() => { location.hash = 'rustboro-city'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Metarost City'));
  await page.click('[data-tab="trainers"]');
  check('Smaragd: Arenaleiterin mit deutschem Namen und Team', await page.evaluate(() => /Leiter Felizia/.test(document.getElementById('tab-body')?.textContent || '') && document.querySelectorAll('#tab-body .party .mon').length >= 3));
  await page.click('[data-kind="trainer"]');
  check('Smaragd: Trainer-Marker erscheinen', await page.evaluate(() => document.querySelectorAll('.leaflet-overlay-pane path').length > 200));
  await page.click('[data-kind="trainer"]');
  await page.click('[data-tab="items"]');
  await page.evaluate(() => [...document.querySelectorAll('#tab-body .row')].find(r => /TM39/.test(r.textContent))?.querySelector('[data-map]')?.click());
  await waitFor(page, () => !document.getElementById('interior-bar').hidden && document.querySelector('.leaflet-pane image')?.getAttribute('href')?.includes('tiles-emerald/in/'), null, 15000);
  check('Smaragd: TM39 öffnet die Innenkarte der Arena', await page.evaluate(() => /~rustboro_city_gym$/.test(decodeURIComponent(location.hash))), await page.evaluate(() => location.hash));
  await new Promise(r => setTimeout(r, 700));
  const centred = await page.evaluate(() => {
    const m = document.getElementById('map').getBoundingClientRect(), b = document.querySelector('.leaflet-interior-pane svg').getBoundingClientRect();
    return Math.abs((b.left + b.width / 2) - (m.left + m.width / 2)) < 4 && Math.abs((b.top + b.height / 2) - (m.top + m.height / 2)) < 4;
  });
  check('Smaragd: Innenkarte liegt mittig', centred);
  await page.click('#interior-back');
  await waitFor(page, () => document.getElementById('interior-bar').hidden);

  // Xeneroville: Ort im Krater auf Route 126, der Eingang dort öffnet die Stadtkarte
  await page.evaluate(() => { location.hash = 'sootopolis-city'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Xeneroville'));
  // Der Flug zum Ort ist animiert – warten, bis die Mitte im Krater liegt
  await waitFor(page, () => {
    const r = D.locations.find(l => l.en === 'Sootopolis City').rects[0], c = map.getCenter();
    return c.lng >= r[0] && c.lng <= r[2] && -c.lat >= r[1] && -c.lat <= r[3];
  }, null, 5000).catch(() => {});
  const soot = await page.evaluate(() => {
    const li = D.locations.findIndex(l => l.en === 'Sootopolis City'), r = D.locations[li].rects[0], c = map.getCenter();
    return { inCrater: c.lng >= r[0] && c.lng <= r[2] && -c.lat >= r[1] && -c.lat <= r[3], maps: [...document.querySelectorAll('.map-btn')].map(b => b.textContent.trim()) };
  });
  check('Smaragd: Xeneroville liegt im Krater mit Stadtkarte', soot.inCrater && soot.maps.length >= 3, JSON.stringify(soot));
  await page.click('[data-kind="entrance"]');
  await page.evaluate(() => {
    const li = D.locations.findIndex(l => l.en === 'Sootopolis City');
    const mk = D.markers.find(m => m.k === 'entrance' && m.l === li && m.to === 'SOOTOPOLIS_CITY');
    let hit = null;
    map.eachLayer(layer => { if (layer instanceof L.CircleMarker) { const p = layer.getLatLng(); if (Math.abs(p.lng - mk.x - 0.5) < 0.01 && Math.abs(-p.lat - mk.z - 0.5) < 0.01) hit = layer; } });
    hit.fire('click');
  });
  await waitFor(page, () => document.getElementById('interior-select')?.value === 'SOOTOPOLIS_CITY', null, 15000);
  check('Smaragd: Eingang im Krater öffnet Xeneroville', true);
  await page.click('#interior-back');
  await waitFor(page, () => document.getElementById('interior-bar').hidden);
  await page.click('[data-kind="entrance"]');

  // Granithöhle: Etagen als Innenkarten, Pixelgrafik ohne Glättung
  await page.evaluate(() => { location.hash = 'granite-cave'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Granithöhle'));
  const cave = await page.evaluate(() => ({ maps: [...document.querySelectorAll('.map-btn')].map(b => b.textContent.trim()), ents: document.querySelectorAll('[data-goto]').length }));
  check('Smaragd: Höhle mit Etagen-Innenkarten und Eingang', cave.maps.length === 4 && cave.maps.includes('B2F') && cave.ents >= 1, JSON.stringify(cave));
  await page.click('.map-btn:nth-of-type(2)');
  await waitFor(page, () => !document.getElementById('interior-bar').hidden);
  const pixel = await page.evaluate(() => {
    const el = document.getElementById('map'), at = z => { map.setZoom(z, { animate: false }); return el.classList.contains('z-pixel'); };
    return { native: at(4), above: at(4.5), below: at(3.5) };
  });
  check('Smaragd: Pixelgrafik ab voller Auflösung ohne Glättung', pixel.native && pixel.above && !pixel.below, JSON.stringify(pixel));
  await page.click('#interior-back');
  await waitFor(page, () => document.getElementById('interior-bar').hidden);

  await page.evaluate(() => { const i = document.getElementById('map-search'); i.value = 'Rayquaza'; i.dispatchEvent(new Event('input')); });
  await waitFor(page, () => document.querySelector('#search-results .sr'));
  await page.click('#search-results .sr');
  await waitFor(page, () => /Rayquaza/.test(document.querySelector('.mon-head')?.textContent || ''));
  check('Smaragd: Rayquaza als feste Begegnung im Himmelturm', await page.evaluate(() => /Himmelturm/.test(document.getElementById('side-content').textContent) && /Feste Begegnung/.test(document.getElementById('side-content').textContent)));

  const toOras = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('omega-rot-alpha-saphir'));
  await toOras;
  await waitFor(page, () => !!window.KARTE_HOENN && document.getElementById('map-loading')?.hidden, null, 90000);
  check('Smaragd: Wechsel zu ΩR/αS lädt die 3D-Hoenn-Karte', await page.evaluate(() => !!window.KARTE_HOENN && !document.body.classList.contains('is-emerald')));

  const back = page.waitForNavigation({ waitUntil: 'domcontentloaded' });
  await page.evaluate(() => window.PokeHubGame.set('smaragd'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-emerald') && document.getElementById('map-loading')?.hidden, null, 30000);
  check('Smaragd: Wechsel zurück lädt wieder die GBA-Karte', await page.evaluate(() => !window.KARTE_HOENN && /Hoenn/.test(document.querySelector('header h1')?.textContent || '')));
  check('Smaragd: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();

  // Der Service Worker lädt Daten, Übersichtsblatt und Innenkarten-Index wirklich vor
  const offline = await browser.newPage();
  const offlineErrors = [];
  offline.on('pageerror', e => offlineErrors.push(String(e)));
  await offline.evaluateOnNewDocument(() => {
    localStorage.setItem('hub-active-game', 'smaragd');
    localStorage.setItem('hub-gen', '3');
    localStorage.setItem('hub-lang', 'de');
  });
  await offline.setRequestInterception(true);
  offline.on('request', req => req.url().startsWith('http://localhost:') ? req.continue() : req.abort());
  await offline.goto(`${BASE}/Karte/index.html`, { waitUntil: 'domcontentloaded' });
  const cached = await offline.evaluate(async () => {
    await new Promise(resolve => setTimeout(resolve, 500));
    await navigator.serviceWorker.register('/sw.js');
    await Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) => setTimeout(() => reject(new Error('Service-Worker-Installation dauerte zu lange')), 30000)),
    ]);
    const cacheName = (await caches.keys()).find(name => name.startsWith('pokehub-static-'));
    const cache = await caches.open(cacheName);
    return {
      data: !!(await cache.match(new URL('emerald.json', location.href).href)),
      manifest: !!(await cache.match(new URL('tiles-emerald/index.json', location.href).href)),
      overview: !!(await cache.match(new URL('tiles-emerald/0/0_0.webp', location.href).href)),
      interiors: !!(await cache.match(new URL('tiles-emerald/interiors.json', location.href).href)),
    };
  });
  check('Smaragd: Daten, Übersicht und Innenkarten-Index sind offline vorgeladen', cached.data && cached.manifest && cached.overview && cached.interiors, JSON.stringify(cached));
  check('Smaragd: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (e) {
  check('Smaragd-Kartentest', false, e.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Smaragd-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
