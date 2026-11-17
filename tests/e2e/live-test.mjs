// Live-Test: Spielstand beobachten. Der Datei-Dialog wird durch eine Datei im privaten Speicher des Browsers (OPFS)
// ersetzt; die Seite muss Änderungen an ihr von selbst bemerken.
// Mit SAVE_FILE=<Pfad zu einer „main“ oder .sav> läuft der ganze Weg mit einem echten Spielstand: einlesen, im
// Hintergrund ein Team-Pokémon auf 0 KP setzen (wie nach einem Speichern im Spiel), Ereignis erscheint, Neuladen.
// (Eigene Spielstände gehören nicht ins Projekt, deshalb liegt keiner bei.) SHOT=<Datei.png> legt ein Bild ab.
import fs from 'node:fs';
import { startServer, launch, openPage, waitFor, check, failed, sleep } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

try {
  const { page, errors } = await openPage(browser, `${BASE}/LiveTest/index.html`, { storage: { 'hub-lang': 'de' }, timeout: 60000, waitUntil: 'domcontentloaded' });
  await waitFor(page, () => document.getElementById('pick')?.textContent.includes('wählen'));

  // Datei im OPFS schreiben und den Datei-Dialog darauf umleiten
  const putFile = (name, b64) => page.evaluate(async (name, b64) => {
    const root = await navigator.storage.getDirectory();
    const h = await root.getFileHandle(name, { create: true });
    const w = await h.createWritable();
    await w.write(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
    await w.close();
    window.showOpenFilePicker = async () => [h];
  }, name, b64);
  const text = id => page.evaluate(id => document.getElementById(id).textContent, id);

  check('Live-Test: Seite startet leer mit Hinweis', await page.evaluate(() => document.getElementById('status').hidden && !document.getElementById('log-empty').hidden && document.getElementById('team-card').hidden));
  check('Live-Test: Ordnersuche wird angeboten', await page.evaluate(() => !document.getElementById('find-dir').hidden));

  await putFile('notizen.sav', Buffer.alloc(5000, 7).toString('base64'));
  await page.click('#pick');
  await waitFor(page, () => !document.getElementById('error').hidden);
  check('Live-Test: eine fremde Datei wird abgelehnt', (await text('error')).includes('kein Spielstand') && await page.evaluate(() => document.getElementById('status').hidden));

  // Richtige Größe, aber leer (neues Spiel vor dem ersten Speichern): weiter beobachten
  await putFile('main', Buffer.alloc(0x76000, 0).toString('base64'));
  await page.click('#pick');
  await waitFor(page, () => document.getElementById('status-title').textContent.includes('noch kein Spielstand'));
  check('Live-Test: Datei ohne Spielstand wird weiter beobachtet', await page.evaluate(() => document.getElementById('error').hidden && document.getElementById('dot').classList.contains('is-warn')));

  if (process.env.SAVE_FILE) {
    const b64 = fs.readFileSync(process.env.SAVE_FILE).toString('base64');
    // dieselbe Datei bekommt jetzt den Spielstand – wie beim ersten Speichern im Spiel
    await putFile('main', b64);
    await waitFor(page, () => document.querySelectorAll('#team .lv-mon').length > 0, undefined, 15000);
    check('Live-Test: der erste Spielstand in der beobachteten Datei wird von selbst erkannt', (await text('status-title')).startsWith('Beobachte') && !(await text('status-title')).includes('noch kein'));
    const first = await page.evaluate(() => ({
      log: [...document.querySelectorAll('#log .lv-ev')].map(e => e.className.match(/lv-ev--(\w+)/)[1]),
      team: document.querySelectorAll('#team .lv-mon').length, down: document.querySelectorAll('#team .lv-mon.is-down').length,
      sum: document.getElementById('summary').textContent, meta: document.getElementById('status-meta').textContent,
    }));
    check('Live-Test: Protokoll beginnt mit dem Start-Eintrag', first.log.length === 1 && first.log[0] === 'start', first.sum + ' | ' + first.meta);

    // Unverändert: keine neuen Einträge, aber es wird weiter geprüft
    const checksBefore = await text('status-tech');
    await sleep(4500);
    check('Live-Test: ohne Änderung kommt nichts dazu, geprüft wird weiter', await page.evaluate(() => document.querySelectorAll('#log .lv-ev').length === 1) && (await text('status-tech')) !== checksBefore, await text('status-tech'));

    // „Im Spiel gespeichert“: erstes Team-Pokémon mit KP > 0 auf 0 KP, Prüfsummen neu – mit den Modulen der Seite
    const changed = await page.evaluate(async () => {
      const root = await navigator.storage.getDirectory();
      const h = await root.getFileHandle('main');
      const bytes = new Uint8Array(await (await h.getFile()).arrayBuffer());
      const data = HubSave.parse(bytes);
      const mon = data.party.find(m => m.hp > 0 && !m.isEgg);
      const slot = mon.where.slot;
      if (data.kind === 'oras') {
        const L = OrasSave.LAYOUT, at = L.party + slot * L.sizeParty;
        const d = OrasSave.decryptPK6(bytes, at, L.sizeParty).data;
        d[0xF0] = 0; d[0xF1] = 0;
        bytes.set(OrasSave.encryptPK6(d), at);
        OrasSave.writeChecksum(bytes, OrasSave.blockAt(bytes, at));
      } else {
        const g = PtSave.generalBlock(bytes), L = PtSave.LAYOUT, at = g.offset + L.party + slot * L.sizeParty;
        const d = PtSave.decryptPK4(g.bytes, at, L.sizeParty).data;
        d[0x8E] = 0; d[0x8F] = 0;
        g.bytes.set(PtSave.encryptPK4(d), at);
        PtSave.writeChecksum(g.bytes, g.offset, g.size);
      }
      const w = await h.createWritable();
      await w.write(bytes);
      await w.close();
      return { species: mon.species, slot };
    });
    await waitFor(page, () => !!document.querySelector('#log .lv-ev--faint'), undefined, 15000);
    const after = await page.evaluate(() => ({
      first: document.querySelector('#log .lv-ev').textContent, n: document.querySelectorAll('#log .lv-ev').length,
      down: document.querySelectorAll('#team .lv-mon.is-down').length,
    }));
    check('Live-Test: 0 KP nach dem Speichern erscheint von selbst als „Besiegt“', after.n === 2 && after.first.includes('Besiegt') && after.down === first.down + 1, after.first.trim());

    if (process.env.SHOT) { await page.setViewport({ width: 1280, height: 1100 }); await page.screenshot({ path: process.env.SHOT, fullPage: true }); }

    // Neu laden: Protokoll und Stand bleiben, die Datei wird wieder beobachtet (OPFS braucht keine Nachfrage), nichts doppelt
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, () => document.getElementById('status-title').textContent.startsWith('Beobachte'), undefined, 15000);
    await sleep(3000);
    check('Live-Test: nach dem Neuladen geht es ohne doppelte Einträge weiter', await page.evaluate(() => document.querySelectorAll('#log .lv-ev').length === 2 && document.querySelectorAll('#team .lv-mon.is-down').length >= 1));

    await page.click('#pause');
    check('Live-Test: Anhalten', (await text('status-title')).startsWith('Angehalten') && (await text('pause')).includes('Weiter'));
    await page.click('#lang-toggle');
    check('Live-Test: englisch', (await text('status-title')).startsWith('Paused') && await page.evaluate(() => document.querySelector('#log .lv-ev').textContent.includes('Fainted')));
    await page.click('#lang-toggle');
    await page.click('#clear');
    check('Live-Test: Protokoll leeren', await page.evaluate(() => document.querySelectorAll('#log .lv-ev').length === 0 && !document.getElementById('log-empty').hidden));
  }

  // Ohne Datei-Zugriff des Browsers (Firefox, iPhone): einmal einlesen über die normale Dateiauswahl
  const { page: plain, errors: plainErrors } = await openPage(browser, `${BASE}/LiveTest/index.html`, { storage: { 'hub-lang': 'de' }, timeout: 60000, waitUntil: 'domcontentloaded' });
  await plain.evaluateOnNewDocument(() => { delete window.showOpenFilePicker; delete window.showDirectoryPicker; });
  await plain.reload({ waitUntil: 'domcontentloaded' });
  await waitFor(plain, () => document.getElementById('pick')?.textContent.includes('wählen'));
  check('Live-Test: ohne Datei-Zugriff steht der Hinweis da, die Ordnersuche fehlt', await plain.evaluate(() => !document.getElementById('no-watch').hidden && document.getElementById('find-dir').hidden));

  check('Live-Test: keine Fehler in der Konsole', errors.length === 0 && plainErrors.length === 0, [...errors, ...plainErrors].join(' | '));
} finally {
  await browser.close();
  server.close();
}
process.exit(failed() ? 1 : 0);
