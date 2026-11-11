// Randomizer-Einstellungen im Browser: am Anfang ist nichts gewählt (Würfeln gesperrt), je Spiel andere Optionen
// (Zerrwelt nur in Platin, Mega-Optionen nur in Omega Rubin / Alpha Saphir), eigene Auswahl je Spiel, .rnqs laden/speichern.
// Die ROM wird nicht gebraucht: die Seite bekommt nur den Eintrag „zuletzt gewählte ROM“ (IndexedDB) untergeschoben.
import { startServer, launch, openPage, sleep, waitFor, check, failed } from './harness.mjs';

const BASE = 'http://localhost:8765';
const server = await startServer();
const { browser } = await launch();

// „Zuletzt gewählte ROM“ setzen (null = keine) und Seite neu laden
async function setRom(page, rom) {
  await page.evaluate(rec => new Promise((res, rej) => {
    const r = indexedDB.open('pokehub-randomizer', 1);
    r.onupgradeneeded = () => r.result.createObjectStore('kv');
    r.onerror = () => rej(r.error);
    r.onsuccess = () => {
      const t = r.result.transaction('kv', 'readwrite');
      if (rec) t.objectStore('kv').put(Object.assign(rec, { file: new Blob([new Uint8Array(16)]) }), 'rom');
      else t.objectStore('kv').delete('rom');
      t.oncomplete = () => { r.result.close(); res(); };
      t.onerror = () => rej(t.error);
    };
  }), rom);
  await page.reload({ waitUntil: 'networkidle0' });
  if (rom) await waitFor(page, () => !document.getElementById('rom-card').hidden);
}
const PT_ROM = { name: 'Platin.nds', size: 134217728, code: 'CPUD', starters: [387, 390, 393] };
const OR_ROM = { name: 'OmegaRubin.3ds', size: 2147483648, kind: 'oras', game: 'or', titleId: '000400000011C400', starters: [252, 255, 258] };

const view = page => page.evaluate(() => ({
  status: document.getElementById('rs-status').textContent,
  badge: document.querySelector('.game-badge').textContent,
  runOff: document.getElementById('run').disabled,
  need: !document.getElementById('run-need').hidden,
  open: document.getElementById('rs').open,
  saveOff: document.getElementById('rs-save').disabled,
  resetOff: document.getElementById('rs-reset').disabled,
  msg: document.getElementById('rs-msg').hidden ? '' : document.getElementById('rs-msg').textContent,
  pt: localStorage.getItem('rando-settings'),
  oras: localStorage.getItem('rando-settings-oras'),
}));
// Reiter öffnen und die sichtbaren Optionstexte holen
const tab = (page, id) => page.evaluate(t => {
  document.querySelector('.rs-tab[data-tab="' + t + '"]').click();
  return [...document.querySelectorAll('#rs-panel .rs-text b')].map(b => b.textContent);
}, id);
const click = (page, key, value) => page.evaluate((k, v) => {
  const el = [...document.querySelectorAll('#rs-panel [data-k="' + k + '"]')].find(x => v === undefined || x.value === String(v));
  el.click();
}, key, value);
const stored = (page, key) => page.evaluate(k => {
  const s = JSON.parse(localStorage.getItem(k) || 'null');
  if (!s) return null;
  const d = Rnqs.parse(Uint8Array.from(atob(s.b64), c => c.charCodeAt(0)));
  const v = RandoOptions.values(d);
  return { v, name: String.fromCharCode(...d.slice(Rnqs.LEN + 1, Rnqs.LEN + 1 + d[Rnqs.LEN])) };
}, key);

try {
  const { page, errors } = await openPage(browser, `${BASE}/Randomizer/index.html`, { storage: {} });

  // ── ohne ROM: nichts gewählt ──
  let v = await view(page);
  check('Start: nichts gewählt, nichts gespeichert', /noch nichts gewählt/.test(v.status) && v.pt === null && v.oras === null && v.runOff, JSON.stringify(v));

  // ── Platin ──
  await setRom(page, PT_ROM);
  v = await view(page);
  check('Platin: Würfeln gesperrt, Hinweis sichtbar, Einstellungen aufgeklappt', v.runOff && v.need && v.open && v.saveOff && v.resetOff && /^Platin: noch nichts gewählt/.test(v.status), JSON.stringify(v));
  let extras = await tab(page, 'extras');
  check('Platin: „Zerrwelt abkürzen“ ist da, ORAS-Extras nicht', extras.includes('Zerrwelt abkürzen') && !extras.includes('Formen bleiben nach dem Neustart erhalten') && !extras.some(t => /5\. Generation/.test(t)), extras.join(' | '));
  let traits = await tab(page, 'traits');
  check('Platin: keine Mega-Optionen', !traits.some(t => /Mega/.test(t)), traits.join(' | '));
  const none = await page.evaluate(() => {
    const out = [];
    document.querySelectorAll('.rs-tab').forEach(b => {
      b.click();
      document.querySelectorAll('#rs-panel input[type=checkbox]:checked').forEach(x => out.push(x.dataset.k));
      document.querySelectorAll('#rs-panel input[type=radio]:checked').forEach(x => { if (x.value !== '0') out.push(x.dataset.k); });
    });
    return out;
  });
  check('Platin: in keinem Reiter ist etwas angekreuzt', none.length === 0, none.join(', '));

  await tab(page, 'extras');
  await click(page, 'tweak.fastDistortionWorld');
  v = await view(page);
  let s = await stored(page, 'rando-settings');
  check('Platin: nach der ersten Auswahl lässt sich würfeln', !v.runOff && !v.need && !v.saveOff && /^Platin: 1 Einstellung gewählt/.test(v.status), JSON.stringify({ status: v.status, runOff: v.runOff, need: v.need }));
  check('Platin: Auswahl ist gespeichert (mit ROM-Name)', !!s && s.v['tweak.fastDistortionWorld'] === true && s.name === 'Pokemon Platinum (G)' && v.oras === null, JSON.stringify(s && s.name));
  await tab(page, 'trainers');
  await click(page, 'trainersMod', 1);
  await click(page, 'doubleBattleMode');
  await tab(page, 'tms');
  await click(page, 'tmsMod', 1);
  v = await view(page);
  check('Platin: zählt gewählte Einstellungen', /^Platin: 4 Einstellungen gewählt/.test(v.status), v.status);

  // Datei speichern: abfangen, was heruntergeladen würde
  const saved = await page.evaluate(async () => {
    const orig = URL.createObjectURL;
    let blob = null, name = null;
    URL.createObjectURL = b => { blob = b; return orig.call(URL, b); };
    const click = HTMLAnchorElement.prototype.click;
    HTMLAnchorElement.prototype.click = function () { name = this.download; };
    document.getElementById('rs-save').click();
    URL.createObjectURL = orig;
    HTMLAnchorElement.prototype.click = click;
    return { name, bytes: [...new Uint8Array(await blob.arrayBuffer())] };
  });
  check('Platin: „Als Datei speichern“ liefert eine .rnqs', saved.name === 'Randomizer-Einstellungen-Platin.rnqs' && saved.bytes.length > 100, saved.name);

  // ── Omega Rubin ──
  await setRom(page, OR_ROM);
  v = await view(page);
  check('Omega Rubin: eigene, noch leere Auswahl – Würfeln gesperrt', v.badge === 'Omega Rubin' && /^Omega Rubin: noch nichts gewählt/.test(v.status) && v.runOff && v.need && v.open && v.oras === null && !!v.pt, JSON.stringify({ badge: v.badge, status: v.status, runOff: v.runOff }));
  extras = await tab(page, 'extras');
  check('Omega Rubin: keine Zerrwelt/Turnschuhe/Rotom-Typen, dafür ORAS-Extras und Gen 5–6',
    !extras.includes('Zerrwelt abkürzen') && !extras.includes('Rennen schon vor den Turnschuhen') && !extras.includes('Rotom-Formen mit neuen Typen') &&
    extras.includes('Formen bleiben nach dem Neustart erhalten') && extras.includes('Schnellster Text') && extras.includes('Nationaler Pokédex von Anfang an') &&
    extras.includes('6. Generation (Kalos)'), extras.join(' | '));
  traits = await tab(page, 'traits');
  check('Omega Rubin: Mega-Optionen bei Basiswerten, Typen, Fähigkeiten', traits.filter(t => /^Mega-Entwicklungen/.test(t)).length === 3, traits.join(' | '));
  const starters = await tab(page, 'starters');
  check('Omega Rubin: Starter heißen Geckarbor, Flemmli, Hydropi', starters.some(t => /Geckarbor, Flemmli, Hydropi/.test(t)) && !starters.some(t => /Chelast/.test(t)), starters.join(' | '));
  await click(page, 'startersMod', 1);
  const pick = await page.evaluate(() => {
    const sel = document.querySelector('#rs-panel select[data-k="customStarters.0"]');
    return { n: sel.options.length, cur: sel.options[sel.selectedIndex].textContent, last: sel.options[sel.options.length - 1].textContent };
  });
  check('Omega Rubin: Starter-Liste bis #721, vorbelegt mit Geckarbor', pick.n === 722 && /#252 Geckarbor/.test(pick.cur) && /#721 Volcanion/.test(pick.last), JSON.stringify(pick));

  // Platin-Datei von eben laden: Gemeinsames kommt an, Zerrwelt fällt weg
  await page.evaluate(bytes => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array(bytes)], 'meine-platin.rnqs'));
    const input = document.getElementById('rs-input');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  }, saved.bytes);
  await waitFor(page, () => !document.getElementById('rs-msg').hidden);
  v = await view(page);
  s = await stored(page, 'rando-settings-oras');
  check('Omega Rubin: Datei geladen, Platin-Option weggelassen und gemeldet', /meine-platin\.rnqs/.test(v.msg) && /1 Einstellung passt nicht zu Omega Rubin/.test(v.msg) && /^Omega Rubin: 3 Einstellungen gewählt/.test(v.status) && !v.runOff, v.msg + ' / ' + v.status);
  check('Omega Rubin: gespeichert ohne Zerrwelt, mit eigenem ROM-Namen', !!s && s.v['tweak.fastDistortionWorld'] === false && s.v.trainersMod === 'RANDOM' && s.v.doubleBattleMode === true && s.v.tmsMod === 'RANDOM' && s.name === 'Pokemon Omega Ruby', JSON.stringify(s && s.name));
  const ptStill = await stored(page, 'rando-settings');
  check('Platin-Auswahl bleibt daneben unberührt', !!ptStill && ptStill.v['tweak.fastDistortionWorld'] === true, '');

  // Unsinn laden
  await page.evaluate(() => {
    const dt = new DataTransfer();
    dt.items.add(new File([new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9])], 'falsch.rnqs'));
    const input = document.getElementById('rs-input');
    input.files = dt.files;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  });
  await sleep(100);
  v = await view(page);
  check('falsche Datei: Fehlermeldung, Auswahl bleibt', /keine Einstellungsdatei|anderen Randomizer-Version/.test(v.msg) && /3 Einstellungen gewählt/.test(v.status), v.msg);

  // Alles abwählen (Rückfrage wird vom Testgerüst bestätigt)
  await page.evaluate(() => document.getElementById('rs-reset').click());
  v = await view(page);
  check('„Alles abwählen“: wieder nichts gewählt, Würfeln gesperrt, Eintrag gelöscht', /noch nichts gewählt/.test(v.status) && v.runOff && v.need && v.oras === null, JSON.stringify({ status: v.status, oras: v.oras }));

  // ── zurück zu Platin: die Auswahl von vorhin ist noch da ──
  await setRom(page, PT_ROM);
  v = await view(page);
  extras = await tab(page, 'extras');
  const dw = await page.evaluate(() => document.querySelector('#rs-panel [data-k="tweak.fastDistortionWorld"]').checked);
  check('Platin: Auswahl von vorhin wieder da', /^Platin: 4 Einstellungen gewählt/.test(v.status) && !v.runOff && dw, v.status);

  // ── englisch ──
  await page.evaluate(() => document.getElementById('lang-toggle').click());
  v = await view(page);
  check('englisch: Texte der Einstellungen', /^Platinum: 4 settings chosen/.test(v.status), v.status);

  check('keine JavaScript-Fehler', errors.length === 0, errors.join(' | '));
  await page.close();
} catch (e) {
  check('Randomizer-Einstellungen', false, e.message.split('\n')[0]);
}

await browser.close();
server.close();
console.log(failed() ? `\n${failed()} Prüfung(en) fehlgeschlagen` : '\nAlle Prüfungen bestanden');
process.exit(failed() ? 1 : 0);
