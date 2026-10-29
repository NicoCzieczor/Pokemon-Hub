// Duo gegen die neuen Supabase-Funktionen (nachgebaut in fake-supabase.js)
import { startServer, launch, openPage, sleep, waitFor, check, failed, MONS } from './harness.mjs';

const BASE = 'http://localhost:8765/Duo/index.html';
const mon = name => { const [id, de] = MONS[name]; return { id, name, sprite: `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${id}.png`, germanName: de, types: ['grass'] }; };
const empty = () => ({ lastWriter: 'partner', team1: Array(6).fill(null), team2: Array(6).fill(null), box1: Array(30).fill(null), box2: Array(30).fill(null), linkedTeam: [], linkedBox: [], graves1: [], graves2: [] });
const ME = 'user-me';
const now = Date.now();
const session = (state, members, rev = 5) => ({ db: { sessions: [{ id: 'sid-x', code: 'ABC123', state, rev }], members, old: {} }, n: 10 });
const memberRow = (user, slot, ago = 0) => ({ session_id: 'sid-x', user_id: user, slot, last_seen: now - ago });
const asMember = { 'fake-auth-uid': ME, 'sync-session': { id: 'sid-x', slot: 1, code: 'ABC123' } };
const slotText = (page, pl, i) => page.$eval(`#team-builder-${pl} .pokemon-slot[data-slot="${i}"]`, e => e.textContent);
const XSS = '<img src=x onerror="window.__xss=1">';

const server = await startServer();
const { browser } = await launch();
const only = process.argv[2];
const run = async (name, fn) => { if (only && !name.includes(only)) return; try { await fn(); } catch (e) { check(name, false, e.message.split('\n')[0]); } };

await run('create', async () => {
  const { page, errors } = await openPage(browser, BASE, { fake: { db: { sessions: [], members: [], old: {} } },
    storage: { 'pokemon-duo-nuzlocke-state': { generation: 1, team1: ['bulbasaur'], team2: [], box1: [], box2: [], linkedTeam: [], linkedBox: [], graves1: [], graves2: [] } } });
  await waitFor(page, () => document.querySelector('#team-builder-1 .pokemon-slot[data-slot="0"]')?.dataset.filled);
  await page.click('#sync-create-btn');
  await waitFor(page, () => localStorage.getItem('sync-session'));
  const r = await page.evaluate(() => ({ saved: JSON.parse(localStorage.getItem('sync-session')), db: window.__FAKE.db, code: document.getElementById('sync-code-display').textContent }));
  check('Erstellen: anonym angemeldet, Session mit Server-Code, Platz 1', r.saved.slot === 1 && r.code === 'NEW001' && r.db.members[0].slot === 1, JSON.stringify(r.saved));
  check('Erstellen: eigener Stand liegt in der Datenbank', r.db.sessions[0].state.team1[0].name === 'bulbasaur');
  check('Erstellen: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
});

await run('join', async () => {
  const st = empty(); st.team1[0] = mon('bulbasaur');
  const { page, errors } = await openPage(browser, BASE, { fake: session(st, [memberRow('partner', 1)]), storage: {} });
  await page.type('#sync-code-input', 'abc123');
  await page.click('#sync-join-btn');
  await waitFor(page, () => localStorage.getItem('sync-session'));
  await waitFor(page, () => document.querySelector('#team-builder-1 .pokemon-slot[data-slot="0"]')?.textContent.includes('Bisasam'));
  const r = await page.evaluate(() => ({ saved: JSON.parse(localStorage.getItem('sync-session')), binds: window.__FAKE.channels.flatMap(c => c.binds.map(b => b.filter)) }));
  check('Beitreten: Platz 2, gemeinsamer Stand geladen', r.saved.slot === 2 && r.saved.id === 'sid-x', JSON.stringify(r.saved));
  check('Beitreten: Echtzeit nur für diese Session', r.binds.length === 1 && r.binds[0].table === 'duo_sessions' && r.binds[0].filter === 'id=eq.sid-x', JSON.stringify(r.binds));
  check('Beitreten: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();

  const { page: p2 } = await openPage(browser, BASE, { fake: session(st, [memberRow('a', 1), memberRow('b', 2)]), storage: {} });
  await p2.type('#sync-code-input', 'ABC123'); await p2.click('#sync-join-btn'); await sleep(400);
  check('Beitreten: beide aktiv → voll', /voll/.test(await p2.$eval('#sync-status', e => e.textContent)));
  await p2.close();

  const { page: p3 } = await openPage(browser, BASE, { fake: session(st, [memberRow('a', 1), memberRow('b', 2, 5 * 60000)]), storage: {} });
  await p3.type('#sync-code-input', 'ABC123'); await p3.click('#sync-join-btn');
  await waitFor(p3, () => localStorage.getItem('sync-session'));
  const r3 = await p3.evaluate(() => ({ saved: JSON.parse(localStorage.getItem('sync-session')), members: window.__FAKE.db.members.map(m => m.user_id + ':' + m.slot) }));
  check('Beitreten: Gerät seit 5 min still → Platz wird übernommen', r3.saved.slot === 2 && !r3.members.includes('b:2'), JSON.stringify(r3));
  await p3.close();

  const { page: p4 } = await openPage(browser, BASE, { fake: session(st, []), storage: {} });
  await p4.type('#sync-code-input', 'ZZZ999'); await p4.click('#sync-join-btn'); await sleep(400);
  check('Beitreten: unbekannter Code → nicht gefunden', /nicht gefunden/.test(await p4.$eval('#sync-status', e => e.textContent)));
  await p4.close();
});

await run('migrate', async () => {
  const old = empty(); old.team1[0] = mon('bulbasaur');
  const { page, errors } = await openPage(browser, BASE, {
    fake: { db: { sessions: [], members: [], old: { OLD123: old } }, n: 0 },
    storage: { 'sync-session': { id: 7, slot: 2, code: 'OLD123' } },   // Eintrag der bisherigen Version
  });
  await waitFor(page, () => document.querySelector('#team-builder-1 .pokemon-slot[data-slot="0"]')?.textContent.includes('Bisasam'));
  const r = await page.evaluate(() => ({ saved: JSON.parse(localStorage.getItem('sync-session')), members: window.__FAKE.db.members }));
  check('Umstieg: alte Session wird automatisch übernommen (gleicher Platz)', r.saved.id === 'sid-1' && r.saved.slot === 2 && r.members.length === 1, JSON.stringify(r));
  check('Umstieg: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
});

await run('offline', async () => {
  const st = empty(); st.team1[0] = mon('bulbasaur');
  const fake = session(st, [memberRow(ME, 1)]); fake.fail = true;
  const { page, errors } = await openPage(browser, BASE, { fake, storage: asMember });
  await sleep(600);
  const kept = await page.evaluate(() => localStorage.getItem('sync-session'));
  check('Offline-Start: Verbindung bleibt gespeichert', !!kept, await page.$eval('#sync-status', e => e.textContent));
  await page.evaluate(() => { window.__FAKE.fail = false; window.dispatchEvent(new Event('online')); });
  await waitFor(page, () => document.querySelector('#team-builder-1 .pokemon-slot[data-slot="0"]')?.textContent.includes('Bisasam'));
  check('Offline-Start: nach dem Wiederverbinden ist der Stand da', true);
  check('Offline-Start: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
});

await run('xss', async () => {
  const st = empty();
  st.team1[0] = { ...mon('bulbasaur'), germanName: XSS };
  st.team1[1] = { id: 1, name: XSS, sprite: 'x', germanName: 'x' };
  st.graves1 = [{ ...mon('rattata'), germanName: XSS, killedBy: 1 }];
  const { page, errors } = await openPage(browser, BASE, { fake: session(st, [memberRow(ME, 1)]), storage: asMember });
  await waitFor(page, () => document.querySelector('#team-builder-1 .pokemon-slot[data-slot="0"]')?.dataset.filled);
  await page.evaluate(() => document.getElementById('graveyard-toggle')?.click());
  await page.evaluate(xss => {
    const s = window.__FAKE.db.sessions[0];
    s.state = { ...s.state, lastWriter: 'partner', team2: [{ id: 4, name: 'charmander', sprite: 'javascript:window.__xss=2', germanName: xss }, null, null, null, null, null] };
    s.rev++;
    window.__FAKE.emit(s);
  }, XSS);
  await sleep(300);
  const r = await page.evaluate(() => ({ xss: window.__xss || 0, handlers: document.querySelectorAll('[onerror]').length,
    js: [...document.querySelectorAll('img')].filter(i => i.getAttribute('src')?.startsWith('javascript')).length }));
  check('F02: präparierte Daten führen keinen Code aus', r.xss === 0 && r.handlers === 0 && r.js === 0, JSON.stringify(r));
  check('F02: Partner-Änderung per Echtzeit kommt als Text an', (await slotText(page, 2, 0)).includes('<img'));
  check('F02: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
});

await run('merge', async () => {
  const st = empty(); st.team1[0] = mon('bulbasaur'); st.team1[1] = mon('squirtle');
  const { page, errors } = await openPage(browser, BASE, { fake: session(st, [memberRow(ME, 1), memberRow('partner', 2)]), storage: asMember });
  await waitFor(page, () => document.querySelector('#team-builder-1 .pokemon-slot[data-slot="1"]')?.textContent.includes('Schiggy'));
  // Partner speichert, ohne dass wir es hören (Echtzeit verpasst) → Version 6
  await page.evaluate(() => {
    const s = window.__FAKE.db.sessions[0];
    s.state = JSON.parse(JSON.stringify(s.state)); s.state.team2[3] = { id: 25, name: 'pikachu', sprite: 'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/25.png', germanName: 'Pikachu', types: [] };
    s.state.lastWriter = 'partner'; s.rev = 6;
  });
  // Wir ändern auf Basis von Version 5: Schiggy entfernen
  await page.click('#team-builder-1 .pokemon-slot[data-slot="1"]', { button: 'right' });
  await page.click('#ctx-remove');
  await sleep(1200);
  const r = await page.evaluate(() => ({ s: window.__FAKE.db.sessions[0], saves: window.__FAKE.log.filter(l => l.rpc === 'duo_save_state').map(l => l.args.p_rev) }));
  check('F05: Speichern mit alter Version → Konflikt erkannt, mit neuer Version erneut', r.saves.join() === '5,6' && r.s.rev === 7, JSON.stringify(r.saves) + ' rev ' + r.s.rev);
  check('F05: eigene Änderung gespeichert', r.s.state.team1[1] === null);
  check('F05: Änderung des Partners erhalten', r.s.state.team2[3]?.name === 'pikachu');
  check('F05: Partner-Änderung wird angezeigt', (await slotText(page, 2, 3)).includes('Pikachu'));
  check('F05: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
});

await run('lost', async () => {
  const st = empty(); st.team1[0] = mon('bulbasaur');
  const { page, errors } = await openPage(browser, BASE, { fake: session(st, [memberRow(ME, 1), memberRow('partner', 2)]), storage: asMember });
  await waitFor(page, () => document.querySelector('#team-builder-1 .pokemon-slot[data-slot="0"]')?.dataset.filled);
  // Unser Platz wurde von einem anderen Gerät übernommen
  await page.evaluate(() => {
    const m = window.__FAKE.db.members.find(x => x.user_id === 'user-me'); m.user_id = 'neues-geraet';
    window.dispatchEvent(new Event('online'));
  });
  await sleep(500);
  const r = await page.evaluate(() => ({ saved: localStorage.getItem('sync-session'), status: document.getElementById('sync-status').textContent, input: document.getElementById('sync-code-input').value }));
  check('F14: Platz vergeben → sauber getrennt, Code zum Neu-Beitreten eingetragen', !r.saved && /vergeben/.test(r.status) && r.input === 'ABC123', JSON.stringify(r));
  check('F14: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
});

await run('leave', async () => {
  const { page } = await openPage(browser, BASE, { fake: session(empty(), [memberRow(ME, 1), memberRow('partner', 2)]), storage: asMember });
  await waitFor(page, () => window.__FAKE.channels.length > 0);
  await page.click('#sync-leave-btn');
  await sleep(300);
  const r = await page.evaluate(() => ({ saved: localStorage.getItem('sync-session'), members: window.__FAKE.db.members.map(m => m.user_id) }));
  check('Verlassen: nur eigene Mitgliedschaft entfernt', !r.saved && r.members.join() === 'partner', JSON.stringify(r));
  await page.close();
});

await run('restart', async () => {
  const st = empty(); st.team1[0] = mon('bulbasaur'); st.team1[1] = mon('squirtle');
  const { page, errors } = await openPage(browser, BASE, { fake: session(st, [memberRow(ME, 1), memberRow('partner', 2)]), storage: asMember });
  await waitFor(page, () => document.querySelector('#team-builder-1 .pokemon-slot[data-slot="1"]')?.textContent.includes('Schiggy'));
  // Ohne Netz ändern: Schiggy entfernen – kommt nicht mehr in die Datenbank
  await page.evaluate(() => { window.__FAKE.fail = true; });
  await page.click('#team-builder-1 .pokemon-slot[data-slot="1"]', { button: 'right' });
  await page.click('#ctx-remove');
  await sleep(700);
  const flag = await page.evaluate(() => localStorage.getItem('duo-sync-dirty'));
  check('Neustart: ausstehende Änderung wird gemerkt', flag === 'sid-x', String(flag));
  // Inzwischen speichert der Partner; dann wird die App neu gestartet (wieder mit Netz)
  const db = await page.evaluate(() => window.__FAKE.db);
  db.sessions[0].state.team2[3] = mon('pikachu');
  db.sessions[0].rev = 6;
  await page.evaluateOnNewDocument(d => { window.__FAKE = { db: d, n: 10 }; }, db);
  await page.reload({ waitUntil: 'networkidle0' });
  await sleep(1200);
  const r = await page.evaluate(() => ({ s: window.__FAKE.db.sessions[0], flag: localStorage.getItem('duo-sync-dirty') }));
  check('Neustart: eigene Änderung kommt nach dem Neustart in die Datenbank', r.s.state.team1[1] === null && r.s.rev === 7, JSON.stringify(r.s.state.team1.map(p => p && p.name)) + ' rev ' + r.s.rev);
  check('Neustart: Änderung des Partners bleibt erhalten', r.s.state.team2[3]?.name === 'pikachu');
  check('Neustart: Merker danach gelöscht', r.flag === null);
  check('Neustart: keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
});

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
