// F16: Service Worker echt durchspielen – Installation, Versionsanzeige, Update während die Startseite offen ist,
// danach offline. Arbeitet auf einer Kopie des Projekts; Chrome erreicht nur diese lokale Kopie (alle anderen Hosts gesperrt).
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFileSync } from 'node:child_process';
import puppeteer from 'puppeteer-core';
import { ROOT, check, failed } from './harness.mjs';

const SRC = ROOT;
const COPY = fs.mkdtempSync(path.join(os.tmpdir(), 'pokehub-swtest-'));
fs.cpSync(SRC, COPY, { recursive: true, filter: s => !/[\\/](\.git|node_modules)([\\/]|$)|[\\/]tiles[\\/](\d+|in)([\\/]|$)/.test(s) });

const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp' };
const server = http.createServer((req, res) => {
  let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  if (p.endsWith('/')) p += 'index.html';
  const file = path.join(COPY, p);
  if (!fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream', 'Cache-Control': 'max-age=600' });
  fs.createReadStream(file).pipe(res);
});
await new Promise(r => server.listen(8766, r));

const ORIGIN = 'http://pokehub.test:8766';
const browser = await puppeteer.launch({
  executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe', headless: true,
  userDataDir: fs.mkdtempSync(path.join(os.tmpdir(), 'pokehub-swprofile-')),
  args: ['--host-resolver-rules=MAP pokehub.test 127.0.0.1, MAP * ~NOTFOUND', `--unsafely-treat-insecure-origin-as-secure=${ORIGIN}`, '--no-first-run'],
});
const page = await browser.newPage();
const errors = [];
page.on('pageerror', e => errors.push(String(e)));
const versionText = () => page.evaluate(() => { const el = document.getElementById('app-version'); return el && !el.hidden ? el.textContent : ''; });

await page.goto(`${ORIGIN}/index.html`, { waitUntil: 'load' });
await page.waitForFunction(() => navigator.serviceWorker.controller, { timeout: 30000 });
await page.waitForFunction(() => document.getElementById('app-version')?.textContent, { timeout: 10000 });
const before = /const VERSION = '(\d+)\.(\d+)\.(\d+)'/.exec(fs.readFileSync(path.join(COPY, 'sw.js'), 'utf8'));
const v0 = before.slice(1, 4).join('.'), v1 = `${before[1]}.${before[2]}.${+before[3] + 1}`;
check('Version wird angezeigt', (await versionText()) === 'Version ' + v0, await versionText());

// Etwas antippen (auf anderen Seiten würde das Neuladen dann warten) – und offline geht die Seite weiterhin
await page.mouse.click(5, 5);

// „Veröffentlichen“: Datei ändern, Versions-Werkzeug laufen lassen
fs.appendFileSync(path.join(COPY, 'home.js'), '\n// neue Version\n');
const out = execFileSync('node', [path.join(COPY, 'tools/build-sw-version.js')], { encoding: 'utf8' }).trim();
check('Werkzeug zählt hoch', out.includes(v1), out);

// So prüft die App alle 5 Minuten (hier direkt ausgelöst)
const reloaded = page.waitForNavigation({ timeout: 30000 });
await page.evaluate(() => navigator.serviceWorker.getRegistration().then(r => r.update()));
await reloaded;
await page.waitForFunction(() => document.getElementById('app-version')?.textContent, { timeout: 10000 });
check('Offene Startseite lädt neu und zeigt die neue Version', (await versionText()) === 'Version ' + v1, await versionText());
const homeJs = await page.evaluate(() => fetch('home.js').then(r => r.text()));
check('Neue Dateien kommen als Ganzes (home.js neu)', homeJs.includes('// neue Version'));
const caches = await page.evaluate(() => caches.keys());
check('Alter Speicher entfernt, nur der neue bleibt', caches.filter(c => c.startsWith('pokehub-static-')).join() === 'pokehub-static-' + v1, caches.join());

// Offline: Seite kommt weiter aus dem Speicher
await page.setOfflineMode(true);
await page.reload({ waitUntil: 'load' });
check('Offline startet die Seite weiter', (await page.title()).includes('Pokémon Hub'));
check('Keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));

await browser.close();
server.close();
fs.rmSync(COPY, { recursive: true, force: true });
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
