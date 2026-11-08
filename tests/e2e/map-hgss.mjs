// HG/SS läuft über die Platin-Karte (app.js): Johto + Kanto mit Innenkarten, Eingängen, Editionen und allen Begegnungsarten.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();
const isHgss = () => document.body.classList.contains('is-hgss');

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'heartgold-soulsilver', 'hub-gen': '4', 'hub-lang': 'de' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-hgss') && document.getElementById('map-loading')?.hidden, null, 30000);
  await waitFor(page, () => [...document.images].some(img => /Karte\/tiles-hgss\/0\/0_0\.webp/.test(img.src)), null, 30000);

  const initial = await page.evaluate(() => ({
    title: document.title,
    heading: document.querySelector('header h1')?.textContent.trim(),
    places: document.querySelectorAll('.dir-item').length,
    groups: [...document.querySelectorAll('.dir-group h3')].map(h => h.textContent.trim().split(' ').slice(0, 3).join(' ')),
    tile: [...document.images].find(img => img.src.includes('/tiles-hgss/'))?.src || '',
    retro: !!window.KARTE_RETRO,
    seaChildren: document.getElementById('km')?.childElementCount,
    rando: document.getElementById('map-rando')?.childElementCount || 0,
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('HG/SS: Platin-Karte lädt Johto und Kanto', !initial.retro && /Johto/.test(initial.heading) && /HeartGold/.test(initial.title), JSON.stringify(initial));
  check('HG/SS: lokale Kartenblätter geladen', /tiles-hgss/.test(initial.tile), initial.tile);
  check('HG/SS: Städte, Routen, Höhlen und Türme je Region', initial.places >= 100 && initial.groups.some(g => /^Johto/.test(g)) && initial.groups.some(g => /^Kanto/.test(g)), JSON.stringify(initial.groups));
  check('HG/SS: keine Sinnoh-Meerszene, kein Platin-Randomizer', initial.seaChildren === 0 && initial.rando === 0, JSON.stringify(initial));
  check('HG/SS: kein horizontaler Seitenüberlauf', initial.overflow <= 1, String(initial.overflow));

  await page.evaluate(() => { location.hash = 'route-32'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 32'));
  await page.click('[data-tab="wild"]');
  const goldMons = await page.$$eval('.wild-table [data-mon]', rows => rows.map(r => r.dataset.mon).sort().join(','));
  await page.click('[data-version="soulsilver"]');
  await waitFor(page, old => [...document.querySelectorAll('.wild-table [data-mon]')].map(r => r.dataset.mon).sort().join(',') !== old, goldMons);
  const version = await page.evaluate(() => ({
    stored: localStorage.getItem('karte-hgss-version'),
    silverPressed: document.querySelector('[data-version="soulsilver"]')?.getAttribute('aria-pressed'),
    mons: [...document.querySelectorAll('.wild-table [data-mon]')].map(r => r.dataset.mon).sort().join(','),
  }));
  check('HG/SS: Editionsschalter aktualisiert Fundorte', version.stored === 'soulsilver' && version.silverPressed === 'true' && version.mons !== goldMons, JSON.stringify(version));

  await page.evaluate(() => { location.hash = 'route-30'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Route 30'));
  await page.click('[data-tab="trainers"]');
  check('HG/SS: Trainer mit deutschem Namen und Team', await page.evaluate(() => /Teenager Julian/.test(document.getElementById('tab-body')?.textContent || '') && document.querySelectorAll('#tab-body .party .mon').length >= 3));
  check('HG/SS: Auswahl als SVG gezeichnet', await page.evaluate(() => document.querySelectorAll('.leaflet-overlay-pane path').length > 0 && !document.querySelector('.leaflet-container canvas')));
  await page.click('[data-kind="trainer"]');
  check('HG/SS: Trainer-Marker erscheinen', await page.evaluate(() => document.querySelectorAll('.leaflet-overlay-pane path').length > 200));
  await page.click('[data-kind="trainer"]');
  await page.click('[data-tab="wild"]');
  check('HG/SS: Gras nach Tageszeit, Angeln und Kopfnuss', await page.evaluate(() => {
    const t = document.getElementById('tab-body')?.textContent || '';
    return /Morgens/.test(t) && /Nachts/.test(t) && /Profiangel/.test(t) && /Kopfnuss/.test(t);
  }));
  // Gebäude-Innenkarte über die Stecknadel eines Geschenks (Mr. Pokémons Haus)
  await page.click('[data-tab="items"]');
  await page.evaluate(() => [...document.querySelectorAll('#tab-body .row')].find(r => /EP-Teiler/.test(r.textContent))?.querySelector('[data-map]')?.click());
  await waitFor(page, () => !document.getElementById('interior-bar').hidden && document.querySelector('.leaflet-pane image')?.getAttribute('href')?.includes('tiles-hgss/in/'), null, 15000);
  check('HG/SS: Geschenk öffnet die Innenkarte des Hauses', await page.evaluate(() => /~route_30_mr_pokemon_house$/.test(decodeURIComponent(location.hash))), await page.evaluate(() => location.hash));

  await page.evaluate(() => { location.hash = 'union-cave'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Einheitstunnel'));
  const union = await page.evaluate(() => ({ maps: [...document.querySelectorAll('.map-btn')].map(b => b.textContent.trim()), ents: document.querySelectorAll('[data-goto]').length }));
  check('HG/SS: Höhle mit Etagen-Innenkarten und Eingängen', union.maps.join() === '1F,B1F,B2F' && union.ents >= 3, JSON.stringify(union));
  await page.click('.map-btn:nth-of-type(3)');
  await waitFor(page, () => !document.getElementById('interior-bar').hidden && document.getElementById('interior-select').value === 'UNION_CAVE_B2F');
  await page.click('[data-tab="wild"]');
  check('HG/SS: B2F mit Lapras als feste Begegnung', await page.evaluate(() => /Feste Begegnung/.test(document.getElementById('tab-body')?.textContent || '') && !!document.querySelector('#tab-body [data-mon="131"]')));
  await page.click('#interior-back');
  await waitFor(page, () => document.getElementById('interior-bar').hidden);

  const toPlatinum = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('platin'));
  await toPlatinum;
  await waitFor(page, () => !document.body.classList.contains('is-hgss') && document.querySelector('.leaflet-container'));
  check('HG/SS: Wechsel zu Platin lädt Sinnoh', await page.evaluate(() => /Sinnoh|Platin/.test(document.querySelector('header h1')?.textContent || '')));

  const back = page.waitForNavigation({ waitUntil: 'networkidle0' });
  await page.evaluate(() => window.PokeHubGame.set('heartgold-soulsilver'));
  await back;
  await waitFor(page, () => document.body.classList.contains('is-hgss') && document.getElementById('map-loading')?.hidden);
  check('HG/SS: Wechsel zurück lädt wieder HG/SS', await page.evaluate(() => /Johto/.test(document.querySelector('header h1')?.textContent || '')));
  check('HG/SS: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();

  // Der Service Worker muss Daten und Übersichtsblatt wirklich vorladen, nicht nur passende Pfade enthalten.
  const offline = await browser.newPage();
  const offlineErrors = [];
  offline.on('pageerror', e => offlineErrors.push(String(e)));
  await offline.evaluateOnNewDocument(() => {
    localStorage.setItem('hub-active-game', 'heartgold-soulsilver');
    localStorage.setItem('hub-gen', '4');
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
      data: !!(await cache.match(new URL('hgss.json', location.href).href)),
      overview: !!(await cache.match(new URL('tiles-hgss/0/0_0.webp', location.href).href)),
      interiors: !!(await cache.match(new URL('tiles-hgss/interiors.json', location.href).href)),
      sea: !!(await cache.match(new URL('tiles-hgss/sea.png', location.href).href)),
    };
  });
  check('HG/SS: Daten, Übersicht, Meer und Innenkarten-Index sind offline vorgeladen', cached.data && cached.overview && cached.interiors && cached.sea, JSON.stringify(cached));
  check('HG/SS: Precache-Lauf ohne JavaScript-Fehler', offlineErrors.length === 0, offlineErrors.join(' | '));
  await offline.evaluate(async () => {
    for (const registration of await navigator.serviceWorker.getRegistrations()) await registration.unregister();
    for (const name of await caches.keys()) if (name.startsWith('pokehub-')) await caches.delete(name);
  });
  await offline.close();
} catch (e) {
  check('HG/SS-Kartentest', false, e.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle HG/SS-Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
