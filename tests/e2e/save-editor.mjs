// Save-Editor: „Spielstand suchen lassen“ – Ordner wählen, die Seite findet den Spielstand selbst.
// Der Ordner-Dialog wird durch einen Ordner im privaten Speicher des Browsers (OPFS) ersetzt.
// Mit SAVE_FILE=<Pfad zu einer „main“ oder .sav> läuft zusätzlich der ganze Weg mit einem echten Spielstand
// (eigene Spielstände gehören nicht ins Projekt, deshalb liegt keiner bei).
import fs from 'node:fs';
import { startServer, launch, openPage, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();
const DEEP = ['sdmc', 'Nintendo 3DS', '0'.repeat(32), '0'.repeat(32), 'title', '00040000', '0011c400', 'data', '00000001'];

try {
  const { page, errors } = await openPage(browser, `${BASE}/SaveEditor/index.html`, { storage: { 'hub-lang': 'de' }, timeout: 60000, waitUntil: 'domcontentloaded' });
  await waitFor(page, () => !!document.querySelector('#drop .drop-title')?.textContent);

  // Ordner im OPFS anlegen: { name, files: [{ path: [...], b64 }] } und den Ordner-Dialog darauf umleiten
  const fakeFolder = (name, files) => page.evaluate(async (name, files) => {
    const root = await navigator.storage.getDirectory();
    try { await root.removeEntry(name, { recursive: true }); } catch (e) { /* gab es nicht */ }
    const top = await root.getDirectoryHandle(name, { create: true });
    for (const f of files) {
      let d = top;
      for (const part of f.path.slice(0, -1)) d = await d.getDirectoryHandle(part, { create: true });
      const w = await (await d.getFileHandle(f.path[f.path.length - 1], { create: true })).createWritable();
      await w.write(Uint8Array.from(atob(f.b64), c => c.charCodeAt(0)));
      await w.close();
    }
    window.showDirectoryPicker = async () => top;
  }, name, files);

  check('Save-Editor: „Spielstand suchen lassen“ wird angeboten', await page.evaluate(() => !document.getElementById('find').hidden && document.getElementById('find-dir').textContent.includes('suchen')));

  await fakeFolder('leer', [{ path: ['shaders', 'main'], b64: Buffer.alloc(100000, 1).toString('base64') }]);
  await page.click('#find-dir');
  await waitFor(page, () => !!document.querySelector('#found .msg-warn'));
  check('Save-Editor: Ordner ohne Spielstand sagt das', await page.evaluate(() => document.querySelector('#found .msg-warn').textContent.includes('kein Spielstand')));

  await page.evaluate(() => { window.showDirectoryPicker = async () => { throw new DOMException('abgebrochen', 'AbortError'); }; });
  await page.click('#find-dir');
  await new Promise(r => setTimeout(r, 300));
  check('Save-Editor: abgebrochene Ordnerwahl ändert nichts', await page.evaluate(() => !document.getElementById('find-dir').disabled && !document.getElementById('file-error').textContent));

  if (process.env.SAVE_FILE) {
    const b64 = fs.readFileSync(process.env.SAVE_FILE).toString('base64');
    const name = /\.(sav|dsv)$/i.test(process.env.SAVE_FILE) ? 'Spiel.sav' : 'main';
    const deep = name === 'main' ? [...DEEP, name] : ['roms', name];
    await fakeFolder('emulator', [{ path: deep, b64 }, { path: ['shaders', 'main'], b64 }, { path: ['config', 'qt-config.ini'], b64: 'QQ==' }]);
    await page.click('#find-dir');
    await waitFor(page, () => !document.getElementById('save-card').hidden, undefined, 30000);
    const card = await page.evaluate(() => document.querySelector('.save-card-name')?.textContent || '');
    check('Save-Editor: ein Spielstand tief im Emulator-Ordner wird gefunden und gleich geöffnet', card.length > 0, card);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, () => !document.getElementById('recent').hidden, undefined, 30000);
    check('Save-Editor: der gefundene Spielstand steht danach unter „Zuletzt geöffnet“', await page.evaluate(n => document.getElementById('recent').textContent.includes(n), name));
    await page.click('#recent-open');
    await waitFor(page, () => !document.getElementById('save-card').hidden, undefined, 30000);
    check('Save-Editor: „Neu laden“ öffnet ihn wieder', (await page.evaluate(() => document.querySelector('.save-card-name')?.textContent || '')) === card);

    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitFor(page, () => !!document.querySelector('#drop .drop-title')?.textContent);
    await fakeFolder('zwei', [{ path: deep, b64 }, { path: ['Sicherung', name], b64 }]);
    await page.click('#find-dir');
    await waitFor(page, () => document.querySelectorAll('#found .found-item').length === 2, undefined, 30000);
    check('Save-Editor: mehrere Spielstände stehen zur Auswahl', await page.evaluate(() => document.querySelector('#found .found-item small').textContent.length > 0));
    await page.click('#found .found-item');
    await waitFor(page, () => !document.getElementById('save-card').hidden, undefined, 30000);
    check('Save-Editor: der gewählte Spielstand wird geöffnet', await page.evaluate(() => document.getElementById('found').hidden));
  }
  check('Save-Editor: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Save-Editor-Prüfungen bestanden');
} finally {
  await browser.close();
  server.close();
}
process.exit(failed() ? 1 : 0);
