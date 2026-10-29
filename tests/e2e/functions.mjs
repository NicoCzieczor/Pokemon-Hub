// Funktionen unverändert aus den Projektdateien holen und mit nachgestellter Umgebung ausführen
import fs from 'node:fs';
import vm from 'node:vm';
import { ROOT as BASE, check, failed } from './harness.mjs';

const ROOT = BASE + '/';
const src = f => fs.readFileSync(ROOT + f, 'utf8');
function grab(code, name) {
  const start = code.search(new RegExp(`(async )?function ${name}\\(`));
  if (start < 0) throw new Error('nicht gefunden: ' + name);
  let i = code.indexOf('{', start), depth = 0;
  for (; i < code.length; i++) { if (code[i] === '{') depth++; else if (code[i] === '}' && --depth === 0) break; }
  return code.slice(start, i + 1);
}

// ── F04: Save-Editor schreibt nicht über eine inzwischen geänderte Datei ──────
{
  const code = src('SaveEditor/app.js');
  const ctx = vm.createContext({ Promise, Uint8Array });
  vm.runInContext([grab(code, 'sameBytes'), grab(code, 'writeHandle'), grab(code, 'writeBytes')].join('\n'), ctx);
  const handle = content => {
    const h = { content, writes: 0,
      queryPermission: async () => 'granted', requestPermission: async () => 'granted',
      getFile: async () => ({ arrayBuffer: async () => h.content.buffer.slice(0) }),
      createWritable: async () => ({ write: async b => { h.content = new Uint8Array(b); h.writes++; }, close: async () => {} }) };
    return h;
  };
  const known = new Uint8Array([1, 2, 3]), edited = new Uint8Array([1, 2, 9]);
  const changed = handle(new Uint8Array([7, 7, 7]));   // Emulator hat inzwischen gespeichert
  const r1 = await ctx.writeHandle(changed, edited, known);
  check('F04 geänderte Datei → Konflikt, nichts geschrieben', r1 === 'conflict' && changed.writes === 0 && changed.content[0] === 7, String(r1));
  const same = handle(new Uint8Array(known));
  const r2 = await ctx.writeHandle(same, edited, known);
  check('F04 unveränderte Datei → wird geschrieben', r2 === true && same.content[2] === 9, String(r2));
}

// ── F11/F16: Service Worker ─────────────────────────────────────────────────
{
  const code = src('sw.js');
  const run = async (cache, net) => {
    const ctx = vm.createContext({
      caches: { open: async () => cache }, fetch: async () => new Response(net, { status: 200 }),
      Response, URL, STATIC_CACHE: 's', self: { registration: { scope: 'https://x/' } },
    });
    vm.runInContext([grab(code, 'staticFirst'), grab(code, 'cacheKey'), grab(code, 'unredirect'),
      'const offlinePage = () => "<h1>Offline</h1>";'].join('\n'), ctx);
    const res = await ctx.staticFirst({ request: { url: 'https://x/Duo/main.js', mode: 'no-cors' }, waitUntil() {} });
    return res.text();
  };
  const full = { match: async () => undefined, put: async () => { throw Object.assign(new Error('quota'), { name: 'QuotaExceededError' }); } };
  const body = await run(full, 'netz-inhalt');
  check('F11 volle Quote: Antwort aus dem Netz kommt trotzdem an', body === 'netz-inhalt', body);
  const cached = { match: async () => new Response('gespeichert'), put: async () => {} };
  check('F16 gespeicherte Datei wird nicht einzeln gegen eine neuere getauscht', (await run(cached, 'neuer')) === 'gespeichert');
  check('F16 Vorladen umgeht den CDN-Zwischenspeicher (?v=CONTENT)', /'v=' \+ CONTENT/.test(code) && !/staleWhileRevalidate/.test(code));
}

// ── F13: Zeitball je Generation ──────────────────────────────────────────────
{
  const ctx = vm.createContext({});
  vm.runInContext(grab(src('Catchrate/main.js'), 'timerMult'), ctx);
  const t = (r, g) => Math.round(ctx.timerMult(r, g) * 1000) / 1000;
  check('F13 Platin, Runde 1 → 1×', t(1, 4) === 1);
  check('F13 Platin, Runde 11 → 2× (vorher 4×)', t(11, 4) === 2, t(11, 4));
  check('F13 Platin, Runde 31 → 4×', t(31, 4) === 4);
  check('F13 Smaragd, Runde 21 → 3×', t(21, 3) === 3);
  check('F13 ab Gen 5, Runde 2 → 1,3× (nicht abgerundet)', t(2, 5) === 1.3, t(2, 5));
  check('F13 ab Gen 5, Runde 11 → 4×', t(11, 6) === 4);
}

console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
