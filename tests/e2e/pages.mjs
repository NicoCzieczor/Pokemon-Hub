// Alle Seiten starten fehlerfrei; Laden mit Platzhaltern (F03), Backup (F07/F08/Z4), verspätete Antworten (F15),
// Sicherungen im Save-Editor (F04), Speicherhinweis (F10), ROM im Worker (F09)
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ROOT, startServer, launch, openPage, sleep, waitFor, check, failed, MONS } from './harness.mjs';

const BASE = 'http://localhost:8765';
const mon = name => { const [id, de] = MONS[name]; return { id, name, sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`, germanName: de, types: ['grass'] }; };
const emptyState = () => ({ lastWriter: 'partner', team1: Array(6).fill(null), team2: Array(6).fill(null), box1: Array(30).fill(null), box2: Array(30).fill(null), linkedTeam: [], linkedBox: [], graves1: [], graves2: [] });
const duoFake = (team, extra = {}) => ({ db: { sessions: [{ id: 'sess-1', code: 'ABC123' }], players: [{ session_id: 'sess-1', slot: 1, team }, { session_id: 'sess-1', slot: 2, team: {} }] }, ...extra });
const XSS = '<img src=x onerror="window.__xss=1">';

const server = await startServer();
const { browser } = await launch();
const only = process.argv[2];
const run = async (name, fn) => { if (only && !name.includes(only)) return; try { await fn(); } catch (e) { check(name, false, e.message.split('\n')[0]); } };

// ── F03: Ladefehler leert keine gespeicherten Teams (Solo, Duo, Trio) ────────
await run('F03 load', async () => {
  const { page, errors } = await openPage(browser, `${BASE}/Pokelocke/index.html`, {
    fail: new Set(['charmander']),
    storage: { 'pokemon-team-builder-state': { generation: 1, team: ['bulbasaur', 'charmander', 'squirtle', null, null, null], box: ['pikachu'] } },
  });
  await waitFor(page, () => document.querySelector('.pokemon-slot[data-slot="2"]')?.dataset.filled);
  const shown = await page.$eval('.pokemon-slot[data-slot="1"]', e => e.textContent);
  check('F03 Solo: nicht ladbares Pokémon bleibt als Platzhalter sichtbar', shown.includes('Glumanda'), shown);
  await page.click('.pokemon-slot[data-slot="2"]', { button: 'right' });   // Schiggy entfernen → speichert
  await sleep(200);
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('pokemon-team-builder-state')));
  check('F03 Solo: Speichern behält Team und Box', saved.team[0] === 'bulbasaur' && saved.team[1] === 'charmander' && saved.box[0] === 'pikachu', JSON.stringify(saved));
  check('F03 Solo: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();

  const { page: pt } = await openPage(browser, `${BASE}/Trio/index.html`, {
    fail: new Set(['charmander']),
    storage: { 'pokemon-trio-nuzlocke-state': { generation: 1, team1: ['bulbasaur', 'charmander', null, null, null, null], team2: [], team3: [], box1: ['pikachu'], box2: [], box3: [], linkedTeam: [], linkedBox: [] } },
  });
  await waitFor(pt, () => document.querySelector('#team-builder-1 .pokemon-slot[data-slot="1"]')?.dataset.filled);
  check('F03 Trio: Platzhalter statt Abbruch', (await pt.$eval('#team-builder-1 .pokemon-slot[data-slot="1"]', e => e.textContent)).includes('Glumanda'));
  await pt.close();

  const { page: pd } = await openPage(browser, `${BASE}/Duo/index.html`, {
    fail: new Set(['charmander']),
    storage: { 'pokemon-duo-nuzlocke-state': { generation: 1, team1: ['bulbasaur', 'charmander', 'squirtle', null, null, null], team2: [], box1: ['pikachu'], box2: [], linkedTeam: [], linkedBox: [], graves1: [], graves2: [] } },
  });
  await waitFor(pd, () => document.querySelector('#team-builder-1 .pokemon-slot[data-slot="2"]')?.dataset.filled);
  check('F03 Duo: Platzhalter statt Abbruch', (await pd.$eval('#team-builder-1 .pokemon-slot[data-slot="1"]', e => e.textContent)).includes('Glumanda'));
  await pd.close();
});

// ── F07/F08/Z4: Backup nur mit Hub-Daten, mit Spielständen, ohne Duo-Zugang ──
await run('F08 backup', async () => {
  const { page, errors } = await openPage(browser, `${BASE}/index.html`, {
    storage: { 'hub-lang': 'de', 'pokemon-team-builder-state': { team: ['bulbasaur'] }, 'unrelated-app-token': 'geheim',
      'sync-session': { id: 'sess-1', slot: 1, code: 'ABC123' }, 'duo-sync-base': { session: 'sess-1', state: {} } },
  });
  // Einen Spielstand in die Datenbank des Save-Viewers legen
  await page.evaluate(() => new Promise((res, rej) => {
    const r = indexedDB.open('pokehub-saveviewer', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('saves', { keyPath: 'slot' });
    r.onsuccess = () => {
      const t = r.result.transaction('saves', 'readwrite');
      t.objectStore('saves').put({ slot: 1, fileName: 'platin.sav', loadedAt: 1, bytes: new Uint8Array([1, 2, 3, 250]).buffer });
      t.oncomplete = () => { r.result.close(); res(); };
      t.onerror = () => rej(t.error);
    };
  }));
  await page.evaluate(() => document.dispatchEvent(new Event('visibilitychange')));   // wie Zurückwechseln vom Save-Viewer
  await sleep(200);
  const json = await page.evaluate(() => new Promise(res => {
    const orig = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { fetch(this.href).then(r => r.text()).then(res); HTMLAnchorElement.prototype.click = orig; };
    window.PokeHubBackup.exportData();
  }));
  const b = JSON.parse(json);
  check('F08 nur Hub-Schlüssel gesichert', Object.keys(b.data).sort().join() === 'hub-lang,pokemon-team-builder-state', Object.keys(b.data).join());
  check('F07 Spielstand ist in der Sicherung', b.format === 2 && b.saves.length === 1 && b.saves[0].fileName === 'platin.sav');

  // Einspielen: fremder Schlüssel bleibt, Spielstand kommt zurück
  b.data['pokemon-team-builder-state'] = JSON.stringify({ team: ['pikachu'] });
  b.data['sync-session'] = JSON.stringify({ id: 'fremd', slot: 1, code: 'XXXXXX' });
  const file = path.join(os.tmpdir(), 'pokehub-backup-test.json');
  fs.writeFileSync(file, JSON.stringify(b));
  await page.evaluate(() => new Promise(res => {
    const r = indexedDB.open('pokehub-saveviewer', 1);
    r.onsuccess = () => { const t = r.result.transaction('saves', 'readwrite'); t.objectStore('saves').clear(); t.oncomplete = () => { r.result.close(); res(); }; };
  }));
  const [chooser] = await Promise.all([page.waitForFileChooser(), page.evaluate(() => window.PokeHubBackup.importData())]);
  await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle0' }), chooser.accept([file])]);
  const after = await page.evaluate(() => new Promise(res => {
    const r = indexedDB.open('pokehub-saveviewer', 1);
    r.onsuccess = () => {
      const t = r.result.transaction('saves', 'readonly'), q = t.objectStore('saves').getAll();
      t.oncomplete = () => res({
        saves: q.result.map(s => [s.fileName, Array.from(new Uint8Array(s.bytes))]),
        team: localStorage.getItem('pokemon-team-builder-state'),
        foreign: localStorage.getItem('unrelated-app-token'),
        session: localStorage.getItem('sync-session'),
      });
    };
  }));
  check('F08 fremde Daten bleiben beim Einspielen erhalten', after.foreign === 'geheim');
  check('Z4 eingespielte Sicherung setzt keine fremde Duo-Session', JSON.parse(after.session).id === 'sess-1', after.session);
  check('F08 Hub-Daten ersetzt', after.team.includes('pikachu'));
  check('F07 Spielstand zurückgespielt', after.saves.length === 1 && after.saves[0][1].join() === '1,2,3,250', JSON.stringify(after.saves));

  // Ungültiger Hub-Wert → ganze Sicherung abgelehnt
  const bad = { ...b, data: { ...b.data, 'hub-lang': '<script>' } };
  fs.writeFileSync(file, JSON.stringify(bad));
  let alertText = '';
  const handler = d => { alertText = d.message(); d.accept(); };
  page.removeAllListeners('dialog'); page.on('dialog', handler);
  const [ch2] = await Promise.all([page.waitForFileChooser(), page.evaluate(() => window.PokeHubBackup.importData())]);
  await ch2.accept([file]);
  await sleep(500);
  check('F08 ungültige Sicherung wird abgelehnt', /keine gültige|not a valid/.test(alertText), alertText);
  check('F08 keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
});

// ── F15: verspätete Antwort landet nicht im inzwischen gewählten anderen Platz ─
await run('F15 race', async () => {
  const { page, errors } = await openPage(browser, `${BASE}/Pokelocke/index.html`, { storage: {}, delay: { bulbasaur: 1500 } });
  const pick = async (slot, de) => {
    await page.click(`.pokemon-slot[data-slot="${slot}"]`);
    await waitFor(page, n => [...document.querySelectorAll('#pokemon-list li')].some(li => li.textContent.includes(n)), de);
    await page.evaluate(n => [...document.querySelectorAll('#pokemon-list li')].find(li => li.textContent.includes(n)).click(), de);
  };
  await pick(0, 'Bisasam');                 // langsame Antwort
  await page.click('#close-modal');
  await pick(1, 'Pikachu');                 // schnelle Antwort für einen anderen Platz
  await sleep(2200);
  const r = await page.evaluate(() => [0, 1].map(i => document.querySelector(`.pokemon-slot[data-slot="${i}"]`).textContent.trim()));
  check('F15 Solo: alte Antwort überschreibt keinen anderen Platz', r[0] === '' && r[1].includes('Pikachu'), JSON.stringify(r));
  check('F15 keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
});

// ── Alle Seiten starten ohne Fehler ──────────────────────────────────────────
await run('smoke', async () => {
  const pages = ['index.html', 'mobile.html', 'RunDashboard/index.html', 'Pokelocke/index.html', 'Duo/index.html', 'Duo/mobile.html',
    'Trio/index.html', 'Catchrate/index.html', 'DamageCalc/index.html', 'Typrechner/index.html', 'PokemonInfo/index.html',
    'Rules/index.html', 'Karte/index.html', 'Bosse/index.html', 'SaveViewer/index.html', 'SaveEditor/index.html',
    'Sonderbonbons/index.html', 'Randomizer/index.html'];
  for (const p of pages) {
    const { page, errors } = await openPage(browser, `${BASE}/${p}`, { storage: {} });
    await sleep(400);
    check(`Start ${p}`, errors.length === 0, errors.join(' | '));
    await page.close();
  }
});

// ── F04: Save-Editor legt vor dem Speichern dauerhafte Sicherungen an ───────
await run('F04 backups', async () => {
  const code = fs.readFileSync(ROOT + '/SaveEditor/app.js', 'utf8');
  const part = (start, end) => { const a = code.indexOf(start); return code.slice(a, code.indexOf(end, a) + end.length); };
  const src = part('  function sameBytes(a, b) {', '\n  }\n') + part('  var Backups = (function () {', '\n  })();\n');
  const { page, errors } = await openPage(browser, `${BASE}/SaveEditor/index.html`, { storage: {} });
  const r = await page.evaluate(async src => {
    const api = new Function(src + '\nreturn Backups;')();
    const bytes = n => new Uint8Array([n, 1, 2]);
    await api.add('platin.sav', bytes(1));
    await api.add('platin.sav', bytes(1));            // gleicher Inhalt → keine Doppelung
    for (let i = 2; i <= 7; i++) { await api.add('platin.sav', bytes(i)); await new Promise(r => setTimeout(r, 5)); }
    await api.add('andere.sav', bytes(9));
    const list = await api.list('platin.sav');
    return { n: list.length, newest: new Uint8Array(list[0].bytes)[0], oldest: new Uint8Array(list[list.length - 1].bytes)[0], other: (await api.list('andere.sav')).length };
  }, src);
  check('F04 Sicherungen: je Datei die letzten 5, neueste zuerst, keine Doppelungen', r.n === 5 && r.newest === 7 && r.oldest === 3 && r.other === 1, JSON.stringify(r));
  check('F04 keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
});

// ── F10: voller Speicher → sichtbarer Hinweis (Boss-Planer) ────────────────
await run('F10 warning', async () => {
  const { page, errors } = await openPage(browser, `${BASE}/Bosse/index.html`, { storage: {} });
  await page.evaluate(() => {
    Storage.prototype.setItem = function () { throw new DOMException('voll', 'QuotaExceededError'); };
    const sel = document.getElementById('starter-select');
    sel.value = sel.options[1].value;
    sel.dispatchEvent(new Event('change'));
  });
  const r = await page.evaluate(() => { const el = document.getElementById('storage-warning'); return el && !el.hidden ? el.textContent : null; });
  check('F10 Hinweis erscheint, Seite läuft weiter', !!r && /Speichern fehlgeschlagen/.test(r) && errors.length === 0, r + ' ' + errors.join(' | '));
  await page.close();
});

// ── F09: ROM wird im Worker gelesen, Fehler kommen sauber zurück ────────────
await run('F09 worker', async () => {
  const { page, errors } = await openPage(browser, `${BASE}/Randomizer/index.html`, { storage: {} });
  const r = await page.evaluate(async () => {
    let workers = 0;
    const W = window.Worker;
    window.Worker = function (url) { workers++; return new W(url); };
    const kein = await Rando.readRomFile(new Blob([new Uint8Array(0x400)]), [], [], []).then(() => 'ok', e => e.message);
    window.Worker = W;
    return { kein, workers };
  });
  check('F09 Einlesen läuft im Worker und meldet „keine Platin-ROM“', r.workers === 1 && r.kein === 'notPlatinum', JSON.stringify(r));
  check('F09 keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
});

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
