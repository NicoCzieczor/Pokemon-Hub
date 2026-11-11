// Omega Rubin / Alpha Saphir: Hoenn-Karte aus der ROM, Orte mit Stelle auf der Karte, Editions-Verstecke, Sprache.
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/Karte/index.html`, {
    storage: { 'hub-active-game': 'omega-rot-alpha-saphir', 'hub-gen': '6', 'hub-lang': 'de', 'bosse-oras-version': 'or' },
    timeout: 90000,
    waitUntil: 'domcontentloaded',
  });
  await waitFor(page, () => document.body.classList.contains('is-hoenn') && document.getElementById('map-loading')?.hidden, undefined, 90000);
  await waitFor(page, () => document.querySelectorAll('.loc-label').length > 20, undefined, 30000);

  const dir = () => page.evaluate(() => [...document.querySelectorAll('.dir-item')].map(b => b.textContent.trim()));
  const labels = () => page.evaluate(() => [...document.querySelectorAll('.loc-label span')].map(s => s.textContent));

  const start = await page.evaluate(() => ({
    tile: [...document.images].find(image => image.src.includes('/tiles-oras/'))?.src || '',
    overflow: document.documentElement.scrollWidth - document.documentElement.clientWidth,
  }));
  check('ORAS: Kartenblätter aus der ROM geladen', /tiles-oras\/\d\/\d+_\d+\.webp/.test(start.tile) && start.overflow <= 1, JSON.stringify(start));
  check('ORAS: Xeneroville steht als Stadt auf der Karte', (await labels()).includes('Xeneroville'));

  const or = await dir();
  check('ORAS: Omega Rubin zeigt Team Magmas Versteck, nicht das von Team Aqua',
    or.includes('Team Magmas Versteck') && !or.includes('Team Aquas Versteck'), String(or.length));
  check('ORAS: Orte mit Inhalt stehen im Verzeichnis (Pokémon Liga, MS Tide)', or.includes('Pokémon Liga') && or.includes('MS Tide'));

  await page.click('[data-version="as"]');
  await waitFor(page, () => localStorage.getItem('bosse-oras-version') === 'as');
  const as = await dir();
  check('ORAS: Alpha Saphir zeigt Team Aquas Versteck, nicht das von Team Magma',
    as.includes('Team Aquas Versteck') && !as.includes('Team Magmas Versteck'));

  await page.evaluate(() => { location.hash = 'sootopolis-city'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Xeneroville'));
  check('ORAS: Xeneroville hat eine Stelle auf der Karte', await page.evaluate(() => !document.querySelector('.loc-nospot')));

  await page.evaluate(() => { location.hash = 'battle-resort'; });
  await waitFor(page, () => document.querySelector('.side-head h2')?.textContent.includes('Kampfresort'));
  check('ORAS: Orte ohne feste Stelle sagen das', await page.evaluate(() => !!document.querySelector('.loc-nospot')));

  await page.click('#lang-toggle');
  await waitFor(page, () => document.documentElement.lang === 'en');
  const en = await labels();
  check('ORAS: Ortsnamen auf der Karte wechseln mit der Sprache', en.includes('Sootopolis City') && !en.includes('Xeneroville'), en.slice(0, 4).join(', '));
  check('ORAS: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
} finally {
  await browser.close();
  server.close();
}

if (failed()) { console.log(`\n${failed()} ORAS-Prüfung(en) fehlgeschlagen`); process.exit(1); }
console.log('\nAlle ORAS-Kartenprüfungen bestanden');
