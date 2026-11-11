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
| `map-ruby-sapphire.mjs` | Rubin/Saphir lädt echte GBA-Tiles, 58 Hoenn-Orte, getrennte Editionsdaten und Offline-Dateien |
| `map-unova-b2w2.mjs` | Schwarz 2/Weiß 2 lädt echte Weiß-2-ROM-Tiles, 82 Einall-Orte und getrennte Funddaten |
| `map-kalos-xy.mjs` | X/Y lädt echte 3DS-ROM-Tiles, 74 Kalos-Orte und getrennte Editionsdaten |
| `map-oras.mjs` | Omega Rubin/Alpha Saphir: Hoenn-Karte aus der ROM, Xeneroville auf der Karte, Team-Verstecke je Edition, Orte ohne feste Stelle, Sprache der Kartenlabels |
| `map-alola-sm.mjs` | Sonne/Mond lädt echte gerenderte Gen-7-Szenen, 63 Alola-Orte und getrennte Editionsdaten |
| `functions.mjs` | Save-Editor-Konflikt, Service Worker, Zeitball |
| `catch.mjs` | Fangformeln Gen 1–4 gegen nachgerechnete Fälle |
| `sql.mjs` | `supabase/*.sql` in einem echten Postgres (PGlite) mit nachgebauten Supabase-Teilen |
| `pages.mjs` | alle Seiten starten fehlerfrei, Laden mit Platzhaltern, Backup, verspätete Antworten, Töne des Spielautomaten (nur am Hebel, abschaltbar) |
| `randomizer-settings.mjs` | Randomizer-Einstellungen: am Anfang nichts gewählt (Würfeln gesperrt), Optionen je Spiel (Zerrwelt nur Platin, Mega-Optionen nur Omega Rubin / Alpha Saphir), eigene Auswahl je Spiel, `.rnqs` laden und speichern |
| `map.mjs` | Rot/Blau lädt die lokale Kanto-Karte, Ortsdetails und Wechsel zurück zu Platin |
| `map-gold-silver.mjs` | Gold/Silber lädt 72 echte GBC-Außenkarten, Editionsdaten und Offline-Dateien |
| `map-diamond-pearl.mjs` | Diamant/Perl lädt echte DS-3D-Tiles, 61 Sinnoh-Orte, Editionsdaten und Offline-Dateien |
| `map-frlg.mjs` | Feuerrot/Blattgrün über die Platin-Karte: ROM-Tiles, Kanto + Sieben Inseln, Innenkarten, Eingänge, Editionsdaten und Offline-Dateien |
| `duo.mjs` | Duo gegen nachgebaute Supabase-Funktionen (`fake-supabase.js`) |
| `update.mjs` | Service Worker echt: Versionsanzeige, Update bei offener Startseite, offline (auf einer Kopie des Projekts) |

Zusätzliche Kartenprüfungen: `map-yellow-crystal.mjs` prüft Gelb und Kristall; `map-emerald.mjs` prüft Smaragds eigene GBA-Tiles, Funddaten, Kampffront und Offline-Dateien.

Chrome liegt woanders? `CHROME_PATH` setzen.
