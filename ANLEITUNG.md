# Pokémon Hub als App fürs iPhone (ohne Mac)

Die Seite ist jetzt eine **PWA**: Sie liegt als App mit eigenem Icon auf dem Homescreen, startet im Vollbild und **läuft offline**.
Du brauchst kein Xcode, kein Signieren und es gibt keinen 7-Tage-Ablauf.

Neu dazugekommen:

| Datei | Wofür |
|---|---|
| `sw.js` | Service Worker: speichert die Seite fürs Offline-Nutzen |
| `pwa.js` | wird in jeder Seite geladen: Offline-Modus, „langes Drücken = Rechtsklick“, Daten sichern/laden |
| `manifest.json`, `icons/` | App-Name, Icon, Startbildschirm |
| `vendor/` | Supabase + Leaflet lokal statt vom CDN (damit Duo & Karte offline starten) |

Außerdem sind auf der Startseite zwei neue Buttons: **Daten sichern** und **Daten laden**.

---

## 1. Hochladen

Die Seite muss über **https** erreichbar sein. Am einfachsten ist GitHub Pages (kostenlos):

1. Auf GitHub ein neues **öffentliches** Repo anlegen, z. B. `pokemon-hub`
2. Den **Inhalt** dieses Ordners hochladen, sodass `index.html` direkt im Repo liegt
   (Web-Oberfläche: *Add file → Upload files*, alles reinziehen)
3. *Settings → Pages →* bei *Branch* `main` und `/ (root)` wählen → *Save*
4. Nach 1–2 Minuten läuft die Seite unter `https://nicoczieczor.github.io/pokemon-hub/`

Wenn die Seite schon woanders gehostet ist: dort einfach die Dateien ersetzen.

## 2. Aufs iPhone

1. Die Adresse in **Safari** öffnen (auf der Hub-Startseite bleiben, nicht in einem Tool)
2. Teilen-Symbol → **Zum Home-Bildschirm** → *Als Web-App öffnen* an lassen → **Hinzufügen**
3. Die App **einmal mit Internet** öffnen und jedes Tool kurz antippen.
   Dabei wird alles gespeichert, danach geht es auch im Flugmodus.

**Hast du die Seite schon als Web-App auf dem Homescreen?** Wenn die Adresse gleich bleibt,
kannst du die alte einfach weiterbenutzen: einmal mit Internet öffnen, App wegwischen, nochmal öffnen – fertig.
Nur das Icon bleibt dann das alte. Wenn du das neue Icon willst, leg sie neu an und übertrag die Daten (Schritt 3).

## 3. Speicherstand mitnehmen

Jede Homescreen-App hat **ihren eigenen Speicher**, getrennt von Safari und von anderen Homescreen-Apps.
Runs, Teams und Regeln aus Safari oder der alten App sind in einer neu angelegten App also erst mal nicht da.

1. Dort, wo deine Daten sind (Safari oder alte App): Startseite → **Daten sichern** → *In Dateien sichern*
2. In der neuen App: Startseite → **Daten laden** → die Datei auswählen

Das geht auch vom PC aufs Handy und ist gleichzeitig dein Backup, falls mal was weg ist.

## 4. Was offline geht – und was nicht

| | Offline |
|---|---|
| Alle Tools, Speicherstand, Regeln | Ja |
| Pokémon-Daten & Sprites, die du schon mal angeschaut hast | Ja |
| Pokémon, die du noch nie geöffnet hast | Nein, brauchen einmal Internet |
| Duo-Sync (Supabase) | Nein, läuft immer live |
| Sinnoh-Karte | Ja: Marker, Listen und alle Bereiche und Innenkarten, die du schon einmal angesehen hast (Kartenbild wird beim Ansehen gespeichert) |
| Boss-Planer | Ja (nur die Pokémon-Bilder brauchen einmal Internet) |

## 5. Änderungen an der Seite

Einfach die geänderten Dateien hochladen. Die App lädt sie im Hintergrund nach,
**beim nächsten Start** (App wegwischen und neu öffnen) ist die neue Version da.

Nach größeren Umbauten in `sw.js` oben `const VERSION = 'v1'` auf `'v2'` usw. hochzählen –
dann wird beim nächsten Start alles frisch geladen.

Neue Dateien (z. B. ein neues Tool) am besten auch in die Liste `PRECACHE` in `sw.js` eintragen.
Sonst werden sie erst gespeichert, wenn du sie einmal online geöffnet hast.

## 6. Lokal testen

Wie bisher mit **Live Server** in VS Code (oder `python -m http.server 8000`).
Lokal (localhost, 127.0.0.1, Heimnetz-IP) ist der Offline-Speicher absichtlich **aus** –
so siehst du jede Änderung sofort. Offline testest du auf der GitHub-Pages-Adresse.

iPhone-Ansicht am PC: in Chrome **F12** → Handy-Symbol (Gerätesymbolleiste) → z. B. „iPhone 14 Pro Max“.

---

**Langes Drücken = Rechtsklick:** Team-Slots, Box, Graveyard, Runs usw. löscht du am iPhone mit langem Drücken.
Auf iOS 18 und neuer gibt es dabei vermutlich ein kurzes Vibrieren. Das ist ein inoffizieller Trick, den ich nicht am echten iPhone testen konnte.
