// Setzt CONTENT in sw.js auf einen Abdruck aller Dateien der Seite und zählt dabei VERSION hoch (0.1.0 → 0.1.1).
// Ändert sich irgendeine Datei, gibt es so eine neue Version – Geräte laden dann den kompletten neuen Stand
// (nicht Datei für Datei gemischt). Die vorderen Stellen von VERSION dürfen von Hand angehoben werden.
//
// Wann nötig: nach jeder Änderung an der Seite, vor dem Veröffentlichen. tests/sw-version.test.cjs prüft,
// dass CONTENT zum Inhalt passt.
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
    list = execFileSync('git', ['ls-files', '--cached', '--others', '--exclude-standard'], { cwd: ROOT, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
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

function contentHash() {
  const hash = crypto.createHash('sha256');
  for (const f of siteFiles()) {
    hash.update(f + '\0');
    hash.update(fs.readFileSync(path.join(ROOT, f)));
    hash.update('\0');
  }
  return hash.digest('hex').slice(0, 10);
}

const VERSION_RX = /const VERSION = '(\d+)\.(\d+)\.(\d+)';/;
const CONTENT_RX = /const CONTENT = '([^']*)';/;
function storedHash() {
  return CONTENT_RX.exec(fs.readFileSync(path.join(ROOT, 'sw.js'), 'utf8'))[1];
}

module.exports = { contentHash, storedHash };

if (require.main === module) {
  const file = path.join(ROOT, 'sw.js');
  let sw = fs.readFileSync(file, 'utf8');
  const hash = contentHash();
  const [, major, minor, patch] = VERSION_RX.exec(sw);
  if (CONTENT_RX.exec(sw)[1] === hash) {
    console.log(`sw.js ist aktuell: ${major}.${minor}.${patch}`);
  } else {
    const version = `${major}.${minor}.${+patch + 1}`;
    sw = sw.replace(CONTENT_RX, `const CONTENT = '${hash}';`).replace(VERSION_RX, `const VERSION = '${version}';`);
    fs.writeFileSync(file, sw);
    console.log('sw.js: VERSION =', version);
  }
}
