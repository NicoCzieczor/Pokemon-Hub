# Tests

Regressionstests für die Korrekturen aus dem Prüfbericht. Keiner davon schickt etwas an echte Server.

**Schnelltests** (nur Node, keine Installation):

```
node --test "tests/*.test.*"
```

**Browser-, Funktions- und Datenbanktests** (brauchen Node und Google Chrome):

```
cd tests/e2e
npm install
npm test
```

| Datei | Prüft |
|---|---|
| `functions.mjs` | Save-Editor-Konflikt, Service Worker, Zeitball |
| `catch.mjs` | Fangformeln Gen 1–4 gegen nachgerechnete Fälle |
| `sql.mjs` | `supabase/*.sql` in einem echten Postgres (PGlite) mit nachgebauten Supabase-Teilen |
| `pages.mjs` | alle Seiten starten fehlerfrei, Laden mit Platzhaltern, Backup, verspätete Antworten |
| `duo.mjs` | Duo gegen nachgebaute Supabase-Funktionen (`fake-supabase.js`) |
| `update.mjs` | Service Worker echt: Versionsanzeige, Update bei offener Startseite, offline (auf einer Kopie des Projekts) |

Chrome liegt woanders? `CHROME_PATH` setzen.
