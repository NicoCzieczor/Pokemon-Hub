// Setzt VERSION in sw.js aus dem Inhalt aller Dateien der Seite. Ändert sich irgendeine Datei, ändert sich die
// Version – Geräte laden dann beim nächsten Öffnen den kompletten neuen Stand (nicht Datei für Datei gemischt).
//
// Wann nötig: nach jeder Änderung an der Seite, vor dem Veröffentlichen. tests/sw-version.test.cjs prüft,
// dass die Version zum Inhalt passt.
// Nicht mitgezählt: Tests, Werkzeuge, SQL, Texte (.md), sw.js selbst, Kartenblätter (eigene TILE_VERSION)
// und das Randomizer-Jar (wird nicht gespeichert).
// Aufruf (Node 18+):  node tools/build-sw-version.js
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..');
const SKIP = /^(\.git|\.gitignore|tests\/|tools\/|supabase\/|sw\.js$|Karte\/tiles\/(\d+|in)\/)|\.(md|jar)$|node_modules\//;

// Dateien wie beim Veröffentlichen: alles, was git kennt oder neu hinzukommt (ohne .gitignore-Einträge)
function siteFiles() {
  let list;
  try {
    list = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8' })
      .split('\n').filter(Boolean);
  } catch (e) {
    list = [];
    (function walk(dir) {
      for (const name of fs.readdirSync(path.join(ROOT, dir))) {
        const rel = dir ? dir + '/' + name : name;
        if (fs.statSync(path.join(ROOT, rel)).isDirectory()) walk(rel); else list.push(rel);
      }
    })('');
  }
  return list.filter(f => !SKIP.test(f) && fs.existsSync(path.join(ROOT, f))).sort();
}

function contentVersion() {
  const hash = crypto.createHash('sha256');
  for (const f of siteFiles()) {
    hash.update(f + '\0');
    hash.update(fs.readFileSync(path.join(ROOT, f)));
    hash.update('\0');
  }
  return 'v-' + hash.digest('hex').slice(0, 10);
}

const VERSION_RX = /const VERSION = '([^']*)';/;
function currentVersion() {
  return VERSION_RX.exec(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'))[1];
}

module.exports = { contentVersion, currentVersion };

if (require.main === module) {
  const file = path.join(ROOT, 'sw.js');
  const sw = fs.readFileSync(file, 'utf8');
  const version = contentVersion();
  if (VERSION_RX.exec(sw)[1] === version) {
    console.log('sw.js ist aktuell:', version);
  } else {
    fs.writeFileSync(file, sw.replace(VERSION_RX, `const VERSION = '${version}';`));
    console.log('sw.js: VERSION =', version);
  }
}
