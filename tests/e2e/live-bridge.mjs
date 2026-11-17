// Live-Test, Live-Verbindung: Seite ↔ Hilfsprogramm (LiveTest/bridge/PokeHub-Live.cmd) ↔ „Emulator“.
// Der Emulator ist nachgebaut (fake-emu.cjs hält Team und Boxen eines Spielstands im Speicher); das Hilfsprogramm ist
// das echte und liest diesen Prozess von außen. Geprüft wird, dass Änderungen im Speicher ohne Speichern erscheinen.
// Nur Windows, braucht SAVE_FILE=<Pfad zu einer „main“ oder .sav> (eigene Spielstände gehören nicht ins Projekt).
// SHOT=<Datei.png> legt ein Bild ab.
import fs from 'node:fs';
import path from 'node:path';
import { fork, spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { startServer, launch, openPage, waitFor, check, failed, sleep, ROOT } from './harness.mjs';

if (process.platform !== 'win32' || !process.env.SAVE_FILE) {
  console.log('übersprungen: braucht Windows und SAVE_FILE=<Spielstand>');
  process.exit(0);
}
const require = createRequire(import.meta.url);
const PtSave = require('../../SaveViewer/pt-save.js'), OrasSave = require('../../SaveViewer/oras-save.js');

const PORT = 47816, BASE = 'http://localhost:8765';
const file = new Uint8Array(fs.readFileSync(process.env.SAVE_FILE));
const oras = file.length === OrasSave.SIZE;
const F = oras ? { stored: 232, party: 260, stride: 484, stats: 344, hp: 0xF0, dec: OrasSave.decryptPK6, enc: OrasSave.encryptPK6, at: 0x14200 }
  : { stored: 136, party: 236, stride: 236, stats: 136, hp: 0x8E, dec: PtSave.decryptPK4, enc: PtSave.encryptPK4, at: PtSave.generalBlock(file).offset + 0xA0 };
const count = oras ? file[0x14200 + 6 * 260] : file[F.at - 4];

const emu = fork(new URL('./fake-emu.cjs', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'), [process.env.SAVE_FILE]);
const info = await new Promise(r => emu.once('message', r));
const tell = msg => new Promise(r => { emu.once('message', r); emu.send(msg); });
// Team-Pokémon (entschlüsselt, Team-Größe) an einen Platz des laufenden Teams schreiben: Box-Teil und Kampfwerte getrennt
const putTeam = async (slot, dec) => {
  const enc = Buffer.from(F.enc(dec));
  await tell({ write: { where: 'live', off: slot * F.stride, b64: enc.subarray(0, F.stored).toString('base64') } });
  await tell({ write: { where: 'live', off: slot * F.stride + F.stats, b64: enc.subarray(F.stored).toString('base64') } });
};
const helper = spawn('cmd.exe', ['/c', path.win32.normalize(ROOT + '/LiveTest/bridge/PokeHub-Live.cmd'), '-ProcessId', String(info.pid), '-Port', String(PORT)], { stdio: ['ignore', 'pipe', 'pipe'] });
let helperOut = '';
helper.stdout.on('data', d => { helperOut += d; });
helper.stderr.on('data', d => { helperOut += d; });

const server = await startServer();
const { browser } = await launch();
try {
  const { page, errors } = await openPage(browser, `${BASE}/LiveTest/index.html?bridge=http://localhost:${PORT}`, { storage: { 'hub-lang': 'de' }, timeout: 60000, waitUntil: 'domcontentloaded' });
  await waitFor(page, () => document.getElementById('live-title')?.textContent.length > 0);
  const text = id => page.evaluate(id => document.getElementById(id).textContent, id);
  const log = () => page.evaluate(() => [...document.querySelectorAll('#log .lv-ev')].map(e => ({ type: e.className.match(/lv-ev--(\w+)/)[1], live: !!e.querySelector('.lv-live'), text: e.querySelector('.lv-ev-text').textContent.trim() })));
  check('Live: anfangs nicht verbunden, kein Zugriff auf das Hilfsprogramm', (await text('live-title')) === 'Nicht verbunden');

  // Spielstand wählen (OPFS statt Datei-Dialog), dann verbinden
  await page.evaluate(async b64 => {
    const root = await navigator.storage.getDirectory();
    const h = await root.getFileHandle('main', { create: true });
    const w = await h.createWritable();
    await w.write(Uint8Array.from(atob(b64), c => c.charCodeAt(0)));
    await w.close();
    window.showOpenFilePicker = async () => [h];
  }, Buffer.from(file).toString('base64'));
  await page.click('#pick');
  await waitFor(page, () => document.querySelectorAll('#team .lv-mon').length > 0, undefined, 15000);
  await page.click('#live-toggle');
  await waitFor(page, () => document.getElementById('live-title').textContent.startsWith('Live:'), undefined, 60000);
  check('Live: Team und Boxen werden im Speicher gefunden', (await text('live-title')).includes('und Boxen') && await page.evaluate(() => !document.getElementById('team-live').hidden), await text('live-title') + ' · ' + await text('live-meta'));
  check('Live: gleicher Stand wie in der Datei – keine neuen Einträge', (await log()).length === 1);

  // 1) Im „Spiel“ fällt das erste Team-Pokémon auf 0 KP – ohne Speichern
  const mon = F.dec(file, F.at, F.party).data;
  mon[F.hp] = 0; mon[F.hp + 1] = 0;
  await putTeam(0, mon);
  await waitFor(page, () => !!document.querySelector('#log .lv-ev--faint'), undefined, 15000);
  let l = await log();
  check('Live: 0 KP im Speicher erscheint sofort als „Besiegt“ (live)', l.length === 2 && l[0].type === 'faint' && l[0].live && await page.evaluate(() => document.querySelectorAll('#team .lv-mon.is-down').length === 1), l[0].text);

  // 2) Fang: neues Pokémon (Kopie mit anderer Kennung) – ins Team, wenn Platz ist, sonst in den ersten freien Boxplatz
  const fresh = F.dec(file, F.at + (count > 1 ? F.party : 0), F.party).data.slice();
  const dv = new DataView(fresh.buffer);
  dv.setUint32(0, 0x12345678, true);
  if (oras) dv.setUint32(0x18, 0x0BADF00D, true);
  let teamNow = count;
  if (count < 6) { await putTeam(count, fresh); teamNow++; }
  else {
    // freien Boxplatz in der Datei suchen (leer = nur Nullen bzw. keine gültige Prüfsumme) – der letzte Platz ist frei genug
    const lastSlot = (oras ? 31 : 18) * 30 - 1;
    await tell({ write: { where: 'box', off: lastSlot * F.stored, b64: Buffer.from(F.enc(fresh.slice(0, F.stored))).toString('base64') } });
  }
  await waitFor(page, () => !!document.querySelector('#log .lv-ev--catch'), undefined, 15000);
  l = await log();
  check('Live: ein neues Pokémon erscheint sofort als „Gefangen“', l[0].type === 'catch' && l[0].live && (count < 6 ? l[0].text.includes('Team') : l[0].text.includes('Box')), l[0].text);

  if (process.env.SHOT) { await page.setViewport({ width: 1280, height: 1300 }); await page.screenshot({ path: process.env.SHOT, fullPage: true }); }

  // 3) Die Datei wird erneut gelesen (noch der alte Stand): nichts wird zurückgenommen
  const before = (await log()).length;
  await page.click('#check');
  await sleep(2500);
  check('Live: erneutes Lesen der älteren Datei nimmt nichts zurück', (await log()).length === before && await page.evaluate(() => document.querySelectorAll('#team .lv-mon.is-down').length === 1));

  // 4) Hilfsprogramm weg: Seite merkt es, der Stand bleibt stehen
  spawn('taskkill', ['/pid', String(helper.pid), '/T', '/F']);
  await waitFor(page, () => document.getElementById('live-title').textContent.includes('nicht erreichbar'), undefined, 20000);
  check('Live: ohne Hilfsprogramm steht das da, das Protokoll bleibt', (await log()).length === before && await page.evaluate(() => document.getElementById('team-live').hidden));
  await page.click('#live-toggle');
  check('Live: Trennen', (await text('live-title')) === 'Nicht verbunden');

  const real = errors.filter(e => !/Failed to fetch|ERR_CONNECTION/.test(e));
  check('Live: keine Fehler in der Konsole', real.length === 0, real.join(' | '));
} finally {
  await browser.close();
  server.close();
  spawn('taskkill', ['/pid', String(helper.pid), '/T', '/F']);
  emu.kill();
  if (failed()) console.log('--- Hilfsprogramm ---\n' + helperOut);
}
process.exit(failed() ? 1 : 0);
