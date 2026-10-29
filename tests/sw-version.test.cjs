// F16: Die Version des Offline-Speichers muss zum Inhalt passen – sonst bekommen Geräte Änderungen nicht oder
// nur teilweise. Bei Fehlschlag: node tools/build-sw-version.js ausführen. Ausführen: node --test "tests/*.test.*"
const test = require('node:test');
const assert = require('node:assert/strict');
const { contentVersion, currentVersion } = require('../tools/build-sw-version.js');

test('VERSION in sw.js passt zum Inhalt der Seite', () => {
  assert.equal(currentVersion(), contentVersion(), 'node tools/build-sw-version.js ausführen');
});
