// Gemeinsames Testgerüst: statischer Server für das Projekt, Chrome mit nachgestellter PokeAPI und Supabase.
// Chrome-Pfad über CHROME_PATH änderbar. Es wird nichts an echte Server geschickt (alles außer localhost wird abgefangen).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import puppeteer from 'puppeteer-core';

export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')), '../..');
const FAKE_SB = fs.readFileSync(new URL('./fake-supabase.js', import.meta.url), 'utf8');
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css',
  '.json': 'application/json', '.png': 'image/png', '.webp': 'image/webp', '.jar': 'application/java-archive' };
const PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

export function startServer(port = 8765) {
  const server = http.createServer((req, res) => {
    let p = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    if (p.endsWith('/')) p += 'index.html';
    const file = path.join(ROOT, p);
    if (!file.startsWith(path.normalize(ROOT)) || !fs.existsSync(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': TYPES[path.extname(file)] || 'application/octet-stream' });
    fs.createReadStream(file).pipe(res);
  });
  return new Promise(r => server.listen(port, () => r(server)));
}

export const MONS = { bulbasaur: [1, 'Bisasam'], charmander: [4, 'Glumanda'], squirtle: [7, 'Schiggy'], pikachu: [25, 'Pikachu'],
  eevee: [133, 'Evoli'], rattata: [19, 'Rattfratz'], pidgey: [16, 'Taubsi'] };

function pokeapi(url, fail) {
  const u = new URL(url);
  const m = /^\/api\/v2\/(pokemon|pokemon-species)\/([^/]+)\/?$/.exec(u.pathname);
  if (u.pathname.replace(/\/$/, '') === '/api/v2/pokemon') {
    return { status: 200, body: { results: Object.entries(MONS).map(([n, [id]]) => ({ name: n, url: `https://pokeapi.co/api/v2/pokemon/${id}/` })) } };
  }
  if (!m) return { status: 404, body: {} };
  const key = m[2];
  const entry = Object.entries(MONS).find(([n, [id]]) => n === key || String(id) === key);
  if (!entry || fail.has(entry[0])) return { status: fail.has(key) ? 500 : 404, body: {} };
  const [name, [id, de]] = entry;
  if (m[1] === 'pokemon') {
    return { status: 200, body: { id, name, species: { name }, height: 7, weight: 69, moves: [], abilities: [],
      sprites: { front_default: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`, front_shiny: null },
      types: [{ type: { name: 'grass' } }], stats: Array.from({ length: 6 }, () => ({ base_stat: 50 })) } };
  }
  return { status: 200, body: { id, name, names: [{ language: { name: 'de' }, name: de }, { language: { name: 'en' }, name }],
    evolution_chain: null, varieties: [] } };
}

export async function launch() {
  const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'pokehub-e2e-'));
  const browser = await puppeteer.launch({
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true, userDataDir: profile, args: ['--no-first-run', '--no-default-browser-check'],
  });
  return { browser, profile };
}

// Neue Seite mit Mocks. opts: { fail: Set von Pokémon-Namen, die fehlschlagen; fake: Startzustand für Supabase; storage: localStorage-Inhalt }
export async function openPage(browser, url, opts = {}) {
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(String(e)));
  page.on('dialog', d => (opts.onDialog ? opts.onDialog(d) : d.accept()));
  await page.setBypassServiceWorker(true);
  await page.setRequestInterception(true);
  const fail = opts.fail || new Set();
  page.on('request', req => {
    const u = req.url();
    if (u.startsWith('https://pokeapi.co/')) {
      const r = pokeapi(u, fail);
      const delay = Object.entries(opts.delay || {}).find(([n]) => u.endsWith('/pokemon/' + n))?.[1] || 0;
      if (delay) return setTimeout(() => req.respond({ status: r.status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(r.body) }), delay);
      return req.respond({ status: r.status, contentType: 'application/json', headers: { 'Access-Control-Allow-Origin': '*' }, body: JSON.stringify(r.body) });
    }
    if (u.startsWith('https://raw.githubusercontent.com/')) return req.respond({ status: 200, contentType: 'image/png', headers: { 'Access-Control-Allow-Origin': '*' }, body: PNG });
    if (u.includes('/vendor/supabase-2.117.2.js')) return req.respond({ status: 200, contentType: 'text/javascript', body: FAKE_SB });
    if (u.startsWith('http://localhost:')) return req.continue();
    return req.abort();
  });
  await page.evaluateOnNewDocument((fake, storage) => {
    if (fake) window.__FAKE = fake;
    if (storage && !sessionStorage.getItem('__seeded')) {
      sessionStorage.setItem('__seeded', '1');
      localStorage.clear();
      for (const [k, v] of Object.entries(storage)) localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    }
  }, opts.fake || null, opts.storage || null);
  await page.goto(url, { waitUntil: 'networkidle0' });
  return { page, errors };
}

export const sleep = ms => new Promise(r => setTimeout(r, ms));
export async function waitFor(page, fn, arg, timeout = 8000) {
  await page.waitForFunction(fn, { timeout, polling: 50 }, arg);
}

let failures = 0;
export function check(name, ok, detail = '') {
  console.log(`${ok ? 'OK  ' : 'FAIL'} ${name}${detail ? ' – ' + detail : ''}`);
  if (!ok) failures++;
}
export const failed = () => failures;
