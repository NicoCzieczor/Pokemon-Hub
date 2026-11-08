---
document_type: implementation_audit
document_id: oras-map-audit-2026-11-04
title: ORAS-Karte – Befunde und empfohlene Änderungen
scope:
  - Karte/hoenn.js
  - Karte/hoenn.css
  - Karte/style.css
  - Karte/oras.json
  - Karte/tiles-oras/index.json
  - Karte/tiles-oras/places.json
  - Karte/tools/build-oras.js
  - Karte/tools/render-oras.js
  - Bosse/oras-rom.js
  - Bosse/bosses-oras.json
audit_date: 2026-11-04
audit_mode: read_only
implementation_status: not_started
language: de
---

# ORAS-Karten-Audit

## Zweck dieser Datei

Diese Datei beschreibt den geprüften Zustand der Hoenn-Karte für Pokémon Omega Rubin / Alpha Saphir und ist als Arbeitsgrundlage für eine implementierende KI gedacht.

Die Prüfung selbst war rein diagnostisch. Während des Audits wurden keine Projektdateien verändert. Diese Markdown-Datei wurde erst anschließend als Dokumentation hinzugefügt.

## Wichtiger Repository-Kontext

Der geprüfte ORAS-Stand war bereits vor dem Audit nicht eingecheckt. Folgende Änderungen gehörten zum vorhandenen Arbeitsstand und dürfen nicht ungeprüft verworfen oder zurückgesetzt werden:

- Geändert: `Bosse/bosses-oras.json`
- Geändert: `Bosse/tools/build-bosses-oras.js`
- Geändert: `Karte/app.js`
- Geändert: `Karte/hoenn.css`
- Geändert: `Karte/hoenn.js`
- Geändert: `Karte/tools/make-tiles.py`
- Geändert: `locations.js`
- Geändert: `sw.js`
- Neu: `Karte/tiles-oras/`
- Neu: `Karte/tools/fill-oras.py`
- Neu: `Karte/tools/render-oras.js`

Eine implementierende KI soll diese Dateien als Benutzerarbeit behandeln und Änderungen gezielt darauf aufbauen.

## Kurzfazit

Die Karte lädt technisch sauber und die Desktopdarstellung ist grundsätzlich stimmig. Die wichtigsten funktionalen Lücken sind:

1. auswählbare Orte ohne Kartenposition,
2. nicht editionsabhängig gefilterte Team-Verstecke,
3. inhaltsreiche Orte, die im Verzeichnis fehlen,
4. irreführend dargestellte Horden,
5. auf Mobilgeräten nicht sichtbare Detailauswahl.

Empfohlene Implementierungsreihenfolge: `ORAS-MAP-001`, `ORAS-MAP-002`, `ORAS-MAP-003`, `ORAS-MAP-008`, `ORAS-MAP-004`, danach die übrigen Befunde.

## Befundübersicht

| ID | Priorität | Kategorie | Kurzbeschreibung |
|---|---|---|---|
| ORAS-MAP-001 | hoch | Kartengeometrie | 13 gelistete Orte besitzen kein Karten-Ziel |
| ORAS-MAP-002 | hoch | Editionen | Team-Aqua- und Team-Magma-Versteck überlagern sich |
| ORAS-MAP-003 | hoch | Navigation | Inhaltsreiche Orte fehlen im Ortsverzeichnis |
| ORAS-MAP-004 | hoch | Begegnungsdaten | Gemischte Horden werden als unabhängige Chancen dargestellt |
| ORAS-MAP-005 | mittel | Begegnungsdaten | Mehrfachbereiche sind unbenannt oder redundant |
| ORAS-MAP-006 | mittel | Editionen | Alpha-Saphir-Modus verwendet teilweise Omega-Rubin-Daten |
| ORAS-MAP-007 | mittel | Datenzuordnung | Wundereiland erhält irrtümlich eine feste Smaragd-Position |
| ORAS-MAP-008 | hoch | Mobile UX | Ausgewählte Details bleiben unterhalb des Viewports |
| ORAS-MAP-009 | mittel | Mobile Layout | Editions- und Filterchips brechen unsauber um |
| ORAS-MAP-010 | mittel | Lokalisierung | Kartenlabels wechseln nicht auf Englisch |
| ORAS-MAP-011 | mittel | Hit-Testing | Überlappende Flächen können den falschen Ort auswählen |
| ORAS-MAP-012 | mittel | Accessibility | Pokémon-Zeilen und zentrale Bedienelemente sind unzureichend zugänglich |
| ORAS-MAP-013 | niedrig | Verständlichkeit | Permanente Ortsmarker besitzen keine Legende |
| ORAS-MAP-014 | mittel | Qualitätssicherung | ORAS-Kartenpfad besitzt keine gezielten Regressionstests |

## Detaillierte Befunde

### ORAS-MAP-001 – Gelistete Orte ohne Karten-Ziel

- Priorität: hoch
- Sicherheit: bestätigt
- Betroffene Logik: `Karte/hoenn.js:107`, `Karte/hoenn.js:243-250`, `Karte/hoenn.js:321-330`
- Betroffene Daten: `Karte/tiles-oras/places.json`

#### Beobachtung

`flyTo()` und die Auswahlmarkierung funktionieren nur, wenn für einen Ort mindestens eine Fläche unter `areas` oder ein Eintrag unter `entrances` existiert. Für 13 im Ortsverzeichnis sichtbare Einträge fehlt beides.

Feste Orte ohne Ziel:

- ID 198: Xeneroville
- ID 284: Schlotberg
- ID 294: Tiefseehöhle
- ID 296: Urzeithöhle
- ID 300: Küstenhöhle
- ID 310: Siegelkammer
- ID 318: Kampfresort
- ID 320: Insel im Süden
- ID 324: Safari-Zone

Wunder-Ort-Gruppen ohne feste Position:

- ID 326: Wunderwald
- ID 328: Wunderhöhle
- ID 330: Wundereiland
- ID 332: Wunderberg

Bei Auswahl wird die Seitenleiste aktualisiert, aber es gibt keine Kamerafahrt und keine sichtbare Markierung. Xeneroville fehlt dadurch auch als beschriftete Stadt auf der Karte.

#### Empfohlene Änderung

- Für feste Orte manuelle oder aus den Quelldaten abgeleitete Flächen/Eingänge in `places.json` erzeugen.
- Für Wunder-Orte einen expliziten Zustand wie `mapPosition: "dynamic"` oder `hasFixedPosition: false` einführen.
- Bei dynamischen Orten keinen lautlosen Kartenflug versuchen, sondern in der UI verständlich anzeigen, dass keine feste Position existiert.

#### Abnahmekriterien

- Jeder feste Ort aus der obigen Liste kann auf der Karte lokalisiert und hervorgehoben werden.
- Die Auswahl eines Wunder-Ortes zeigt ausdrücklich „keine feste Position“ oder eine gleichwertige Meldung.
- Es gibt keine auswählbare feste Location, bei der `flyTo()` wirkungslos bleibt.

### ORAS-MAP-002 – Überlagerte Team-Verstecke ohne Editionsfilter

- Priorität: hoch
- Sicherheit: bestätigt
- Betroffene Logik: `Karte/hoenn.js:93-98`, `Karte/hoenn.js:241-250`, `Karte/hoenn.js:389-400`
- Betroffene Daten: `Karte/tiles-oras/places.json`

#### Beobachtung

ID 292 „Team Aquas Versteck“ und ID 314 „Team Magmas Versteck“ besitzen im gerenderten Kartenmanifest denselben Eingang: `884.6, 301.6, -0.9`.

Beide Marker werden unabhängig von der gewählten Edition erzeugt. Da Team Magmas Versteck später gerendert wird, liegt sein Marker über Team Aquas Versteck. Ortsverzeichnis, Suche und normale Trainer werden ebenfalls nicht editionsabhängig gefiltert.

#### Empfohlene Änderung

- Ortsdatensätze um eine Editionsangabe wie `version: "or"` beziehungsweise `version: "as"` ergänzen.
- Eine zentrale Funktion `locationAvailable(location, version)` verwenden.
- Diese Funktion auf Verzeichnis, Suche, Kartenmarker, Flächen, Items, Trainer und Direktlinks anwenden.
- Beim Editionswechsel sämtliche davon abhängigen UI-Bereiche neu rendern.

#### Abnahmekriterien

- In Omega Rubin ist ausschließlich das korrekte Team-Versteck sichtbar und auswählbar.
- In Alpha Saphir ist ausschließlich das korrekte Team-Versteck sichtbar und auswählbar.
- Suche, Verzeichnis, Marker, Trainer und Bosse stimmen nach dem Editionswechsel überein.

### ORAS-MAP-003 – Inhaltsreiche Orte fehlen im Verzeichnis

- Priorität: hoch
- Sicherheit: bestätigt
- Betroffene Logik: `Karte/hoenn.js:335-354`

#### Beobachtung

Ein `place` wird derzeit im Wesentlichen nur einsortiert, wenn `l.at` gesetzt ist oder wilde Pokémon vorhanden sind. Vorhandene Flächen, Eingänge, Items, Trainer und Bosse werden für die Verzeichnissichtbarkeit nicht vollständig berücksichtigt.

Dadurch fehlen unter anderem:

- ID 202: Pokémon Liga – 34 Kartenflächen und Bossinhalt
- ID 322: MS Tide – 1 Item und 8 Trainer
- ID 338: Unerforschte Höhle – 9 Kartenflächen
- ID 344: Sichelinsel – 1 Item
- ID 346: Geheiminsel – Karteneingang
- ID 350: Geheime Küste – Karteneingang
- ID 352: Geheime Blumenwiese – Karteneingang

#### Empfohlene Änderung

Die Sichtbarkeit eines Orts aus einer gemeinsamen Inhaltsprüfung ableiten:

```text
hasMapGeometry || hasWildEncounters || hasItems || hasTrainers || hasBosses || explicitlyListed
```

Die Kategorie sollte aus expliziten Metadaten stammen und nicht indirekt aus `at` oder Begegnungen abgeleitet werden.

#### Abnahmekriterien

- Alle oben genannten Orte erscheinen in einer passenden Verzeichnisgruppe.
- Jeder per Karte oder Suche erreichbare inhaltsreiche Ort ist auch über das Verzeichnis erreichbar.
- Inhaltslose technische Datensätze werden nicht versehentlich sichtbar.

### ORAS-MAP-004 – Irreführende Darstellung gemischter Horden

- Priorität: hoch
- Sicherheit: bestätigt
- Betroffene Logik: `Bosse/oras-rom.js:343`, `Karte/hoenn.js:366-386`, `Karte/hoenn.js:487-497`

#### Beobachtung

Die ROM-Auswertung flacht Hordenformationen in einzelne Pokémon-Zeilen ab und verliert die Zugehörigkeit zur gemeinsamen Formation. Die UI behandelt anschließend jede Zeile wie eine unabhängige Begegnungschance.

Beispiele:

- Route 117: Myrapla 4× mit 60 % und Zigzachs 1× mit ebenfalls 60 % gehören zu derselben Horde. Die sichtbare Summe erreicht 160 %.
- Route 110: Eine gemischte 5-%-Horde führt zu einer sichtbaren Summe von 105 %.
- Granithöhle: Eine gemischte 35-%-Horde führt zu einer sichtbaren Summe von 135 %.
- Route 111: Sandan erscheint für mehrere Formationen separat; `monPlaces()` verwendet nur den größten Einzelwert statt der tatsächlichen Gesamtpräsenz.

#### Empfohlene Änderung

- Horden als Formationen modellieren, zum Beispiel `{ probability, members: [{ id, count, level }] }`.
- Eine Formation als gemeinsame Tabellenzeile oder Karte rendern.
- Für die Pokémon-Ortssuche klar definieren, ob „Chance“ die Formationschance, Präsenzchance oder erwartete Anzahl meint.
- Bestehende Randomizer-Daten auf dasselbe Modell abbilden.

#### Abnahmekriterien

- Die Summe der Hordenformationswahrscheinlichkeiten beträgt pro Zone 100 %.
- Mitglieder derselben Horde erscheinen gemeinsam.
- Die Pokémon-Ortssuche zeigt keine irreführend zu niedrige oder doppelt gezählte Chance.

### ORAS-MAP-005 – Unbenannte und redundante Mehrfachbereiche

- Priorität: mittel
- Sicherheit: bestätigt
- Betroffene Logik: `Karte/hoenn.js:383-386`
- Betroffene Datenquelle: `Karte/tools/build-oras.js`

#### Beobachtung

Mehrere Orte enthalten viele Wildzonen, die ausschließlich als „Bereich 1“, „Bereich 2“ usw. angezeigt werden. Beispiele:

- Tiefseehöhle: 11 Bereiche
- Urzeithöhle: 6 Bereiche
- Wunder-Ort-Gruppen: jeweils 8 Bereiche
- Pyroberg und Siegesstraße: mehrere identische oder wiederholte Tabellen

Ohne Stockwerk-, Raum- oder Teilgebietsnamen ist nicht erkennbar, wo eine Begegnung gilt. Byte-identische Tabellen erzeugen zusätzlich unnötig lange Wiederholungen.

#### Empfohlene Änderung

- Zonenmetadaten wie Stockwerk, Raum, Eingang oder Teilgebiet im Builder erhalten.
- Identische Tabellen zusammenfassen, wenn sie fachlich denselben Bereich repräsentieren.
- Wenn mehrere Kartenbereiche dieselbe Tabelle teilen, diese Bereiche gemeinsam benennen statt die Begegnungsliste zu duplizieren.

#### Abnahmekriterien

- Jeder sichtbare Bereich hat einen fachlich verständlichen Namen oder eine nachvollziehbare Zuordnung.
- Byte-identische Listen werden nicht ohne Zusatznutzen mehrfach ausgegeben.

### ORAS-MAP-006 – Alpha-Saphir-Modus ist nur teilweise editionsgetreu

- Priorität: mittel
- Sicherheit: bestätigt
- Betroffene Quellen: `Karte/tools/build-oras.js:63-70`, `Karte/tools/render-oras.js:22`, `Karte/hoenn.js:93-110`

#### Beobachtung

Die gerenderte Karte, Itempositionen und gewöhnlichen Trainer stammen aus einer Omega-Rubin-ROM. Für Alpha Saphir werden vor allem Editions-Pokémon ausgetauscht; bestimmte Bosse werden bereits nach Edition gefiltert. Der UI-Schalter wirkt dagegen wie ein globaler Wechsel zwischen vollständigen Editionen.

#### Empfohlene Änderung

Eine der folgenden Varianten bewusst wählen:

1. Vollständige Alpha-Saphir-Daten erzeugen und alle editionsabhängigen Inhalte umschalten.
2. Den Schalter eindeutig als Auswahl der Wild-Pokémon-Edition kennzeichnen und unveränderte Inhalte erklären.

#### Abnahmekriterien

- Beschriftung und tatsächlicher Funktionsumfang des Schalters stimmen überein.
- Es gibt keine AS-Ansicht, die OR-exklusive Orte oder Trainer ohne Hinweis zeigt.

### ORAS-MAP-007 – Feste Smaragd-Position für Wundereiland

- Priorität: mittel
- Sicherheit: bestätigt
- Betroffene Logik: `Karte/tools/build-oras.js:81-94`

#### Beobachtung

Der Builder gleicht ORAS-Ortsnamen automatisch mit der Smaragd-Regionskarte ab. „Mirage Island“ erhält dadurch `at: [18, 10, 1, 1]`, obwohl die ORAS-Wundereilande mehrere dynamische Wunder-Orte darstellen. Andere Wunder-Ort-Gruppen besitzen korrekterweise keine feste Position.

#### Empfohlene Änderung

- Wunder-Orte explizit kategorisieren.
- Sie von der automatischen Smaragd-Namenszuordnung ausschließen.
- Dynamische Positionen nicht über das alte `at`-Feld vortäuschen.

#### Abnahmekriterien

- Wundereiland erscheint bei „Wunder-Orte & Sonstiges“.
- Es besitzt keine irreführende feste Position.

### ORAS-MAP-008 – Mobile Auswahl zeigt Details außerhalb des Viewports

- Priorität: hoch
- Sicherheit: in Headless Chrome bei 390 × 844 reproduziert
- Betroffene Logik: `Karte/hoenn.js:414-421`, `Karte/hoenn.js:575-584`
- Vergleichbare Sinnoh-Logik: `Karte/app.js:659-666`, `Karte/app.js:1106-1116`

#### Beobachtung

Auf einem 390 × 844 großen Viewport beginnt die Seitenleiste ungefähr bei `y = 862`. Wird beispielsweise Route 101 über die Suche ausgewählt, ändern sich Hash und Seitenleisteninhalt, aber `scrollY` bleibt 0. Der Benutzer sieht nicht, dass unterhalb der Karte neue Details bereitstehen.

#### Empfohlene Änderung

- Die vorhandene Sinnoh-Mobile-Logik wiederverwenden oder in eine gemeinsame Hilfsfunktion extrahieren.
- Auswahl aus Suche/Verzeichnis auf kleinen Viewports zur Seitenleiste scrollen.
- Auswahl direkt auf der Karte optional über einen sichtbaren Detail-Chip bestätigen, damit die Karte nicht bei jedem Tipp verlassen wird.
- `prefers-reduced-motion` bei animiertem Scrollen berücksichtigen.

#### Abnahmekriterien

- Nach Auswahl über Suche oder Verzeichnis ist der neue Detailkopf auf 390 × 844 sichtbar.
- Bei Auswahl auf der Karte gibt es einen eindeutig sichtbaren Weg zu den Details.
- Desktopverhalten bleibt unverändert.

### ORAS-MAP-009 – Unsauberes mobiles Filterlayout

- Priorität: mittel
- Sicherheit: visuell bestätigt
- Betroffene Styles: `Karte/hoenn.css:15-16`, `Karte/style.css:490-495`

#### Beobachtung

Bei etwa 390 Pixel Breite stapeln sich „Omega Rubin“ und „Alpha Saphir“. Gleichzeitig ist die äußere Filterleiste ein nicht umbrechender horizontaler Scroller. Dadurch werden die Item-/TM-/Trainerchips ungewöhnlich hoch; „Trainer“ ist im Ausgangszustand teilweise abgeschnitten.

#### Empfohlene Änderung

- `.hm-version` auf Mobile mit `flex-wrap: nowrap` und `flex-shrink: 0` behandeln.
- Cross-Axis-Stretching der direkten Filterchips verhindern, zum Beispiel über `align-items: flex-start`.
- Aktiven Editionschip visuell mit voller Deckkraft darstellen.

#### Abnahmekriterien

- Editionschips stehen in einer Zeile.
- Markerfilter behalten normale Pillenhöhe.
- Alle Optionen sind durch horizontales Scrollen erreichbar und überdecken sich nicht.

### ORAS-MAP-010 – Kartenlabels bleiben nach Sprachwechsel deutsch

- Priorität: mittel
- Sicherheit: reproduziert
- Labelerzeugung: `Karte/hoenn.js:229-240`
- Sprachwechsel: `Karte/hoenn.js:588-619`
- Vorbild in Sinnoh: `Karte/app.js:1137`

#### Beobachtung

Nach DE → EN wechseln Titel, Seitenleiste und Filter auf Englisch. Bereits erzeugte Leaflet-Ortslabels bleiben jedoch deutsch, da `applyLang()` das `labelLayer` nicht aktualisiert.

#### Empfohlene Änderung

Beim Sprachwechsel über alle Labelmarker iterieren und deren `<span>` mit `locName()` aktualisieren. Alternativ Labels vollständig neu erzeugen.

#### Abnahmekriterien

- Alle sichtbaren Kartenlabels wechseln ohne Neuladen zwischen Deutsch und Englisch.
- Direkt ausgewählter Ort, Suche und Kartenlabel verwenden dieselbe Sprache.

### ORAS-MAP-011 – Falsche Treffer bei überlappenden Flächen

- Priorität: mittel
- Sicherheit: Datenüberschneidung bestätigt; einzelne Stellen visuell nachprüfen
- Betroffene Logik: `Karte/hoenn.js:196-203`

#### Beobachtung

`locAt()` beendet die Suche beim ersten passenden Ort in Datenreihenfolge. Das berücksichtigt weder sichtbare Oberkante noch Renderreihenfolge. Eine Rasterprüfung fand bei 186 von 3.792 getesteten Zellmittelpunkten Mehrfachtreffer.

Auffällige Kandidaten:

- Route 107 und Faustauhaven
- Route 110 und Route 118
- Route 119, Baumhausen City und Route 118
- Route 121 und Seegrasulb City
- Unerforschte Höhle und umliegende Flächen

#### Empfohlene Änderung

- Explizite Hit-Test-Prioritäten speichern oder separate, eindeutige Pick-Flächen erzeugen.
- Falls die sichtbare Höhe relevant ist, Treffer nach projizierter Z-/Höhenreihenfolge sortieren.
- Problemstellen per Browser-E2E mit konkreten Klickkoordinaten absichern.

#### Abnahmekriterien

- Ein Klick auf die sichtbar oberste Fläche öffnet den erwarteten Ort.
- Datenreihenfolge allein entscheidet nicht mehr über überlappende Treffer.

### ORAS-MAP-012 – Accessibility-Lücken

- Priorität: mittel
- Sicherheit: bestätigt
- Betroffene Stellen: `Karte/index.html:55-58`, `Karte/hoenn.js:371-381`, `Karte/hoenn.js:462-471`

#### Beobachtung

- Wilde Pokémon werden als klickbare `<tr data-mon>` beziehungsweise `<span data-mon>` ausgegeben, sind aber nicht fokussierbar und besitzen keine Tastaturbehandlung.
- Das Suchfeld besitzt kein sichtbares `<label>` und kein `aria-label`.
- Die Leaflet-Karte ist fokussierbar, besitzt aber keine aussagekräftige Rollen-/Namensangabe.
- Nach Auswahl eines Suchtreffers wird der fokussierte Ergebnisbutton entfernt; der Fokus fällt auf den Body zurück.
- Die Tabbuttons verwenden kein `tablist`/`tab`/`aria-selected`-Muster.
- Leaflets Zoom-Labels bleiben in deutscher Ansicht englisch.

#### Empfohlene Änderung

- Interaktive Pokémon-Zeilen als echte Buttons oder Links rendern.
- Suchfeld und Karte eindeutig beschriften.
- Fokus nach Navigation auf den neuen Detailkopf oder Zurück-Button setzen.
- Tabs entweder als normale Buttons mit klarer Zustandsangabe belassen oder das vollständige ARIA-Tabmuster umsetzen.
- Zoomkontrollen lokalisieren.

#### Abnahmekriterien

- Alle Pokémon-Details sind vollständig per Tastatur erreichbar.
- Automatischer Accessibility-Test meldet keine unbenannten Formfelder oder zentralen Regionen.
- Fokus bleibt nach Suche und Detailnavigation nachvollziehbar.

### ORAS-MAP-013 – Fehlende Legende für Ortsmarker

- Priorität: niedrig
- Sicherheit: visuell bestätigt
- Betroffene Logik: `Karte/hoenn.js:241-250`, `Karte/hoenn.js:601-605`

#### Beobachtung

Gelbe und beige permanente Kreismarker stehen für Höhlen beziehungsweise Orte mit oder ohne Wildbegegnungen. Die Filterleiste erklärt nur Items, TMs und Trainer. Die Bedeutung der permanenten Marker ist erst nach Hover oder Tipp erkennbar.

#### Empfohlene Änderung

Eine kleine, nicht schaltbare Legende für „Ort/Eingang“ ergänzen oder die Markerform so gestalten, dass ihre Bedeutung aus dem Kontext klarer wird.

#### Abnahmekriterien

- Die Bedeutung jeder dauerhaft sichtbaren Markerfarbe/-form wird auf der Seite erklärt.

### ORAS-MAP-014 – Fehlende ORAS-Karten-Regressionstests

- Priorität: mittel
- Sicherheit: bestätigt
- Bestehender allgemeiner Smoke-Test: `tests/e2e/pages.mjs:140`

#### Beobachtung

Der vorhandene Seiten-Smoke-Test öffnet die Karte ohne aktives ORAS-Spiel und prüft damit primär den Sinnoh-Pfad. Es gibt keine gezielten Tests für `KARTE_HOENN`, `hoenn.js`, `oras.json` oder `tiles-oras`.

#### Empfohlene Tests

1. ORAS als aktives Hub-Spiel setzen und erfolgreichen Kartenstart prüfen.
2. Edition wechseln und Team-Versteck/Begegnungen/Bosse prüfen.
3. Sprache wechseln und Kartenlabels prüfen.
4. Direktlinks zu Ort und Pokémon prüfen.
5. Vollständigkeit des Ortsverzeichnisses gegen vorhandene Inhalte prüfen.
6. Für jeden festen gelisteten Ort mindestens eine Fläche oder einen Eingang verlangen.
7. Mobile Auswahl und Filterlayout bei 390 × 844 prüfen.
8. Kachelmanifest gegen tatsächlich vorhandene Dateien prüfen.
9. Hordenformationen und Wahrscheinlichkeitssummen prüfen.
10. Repräsentative überlappende Klickflächen testen.

#### Abnahmekriterien

- Der ORAS-Pfad läuft separat im E2E-Test.
- Die kritischen Invarianten aus ORAS-MAP-001 bis ORAS-MAP-004 werden automatisiert abgesichert.

## Positiv geprüfte Eigenschaften

- Die Seite lädt in Headless Chrome auf Desktop und Mobile ohne JavaScript-Fehler.
- Alle lokalen Requests des geprüften Ablaufs liefern erfolgreich; es wurden keine lokalen 404-Fehler beobachtet.
- `Karte/hoenn.js` und `Karte/app.js` bestehen `node --check`.
- `Karte/oras.json`, `Karte/tiles-oras/index.json`, `Karte/tiles-oras/places.json` und `Bosse/bosses-oras.json` sind gültiges JSON.
- Alle 53 in `tiles-oras/index.json` referenzierten WebP-Kartenblätter existieren; es wurden keine verwaisten Blätter gefunden.
- Sämtliche geprüften Flächen-, Marker-, Item- und Trainerkoordinaten liegen innerhalb der Kartenabmessungen 1216 × 704.
- 92 Orts-IDs und Slugs sind eindeutig.
- 150 Wildzonen sind ohne doppelte Ortszuordnung.
- `encounter-areas-oras.js` ist zum geprüften Zeitpunkt mit `oras.json` synchron.
- Normale Begegnungsmethoden summieren sich korrekt auf 100 %. Die auffälligen Übersummen betreffen die abgeflachten gemischten Horden.
- Item-, Attacken- und Trainerreferenzen sind gültig.
- Es gibt keinen horizontalen Body-Overflow auf Desktop oder Mobile; das Problem ORAS-MAP-009 liegt innerhalb des horizontalen Filterscrollers.
- `git diff --check` meldete keine Whitespace-Fehler.

## Empfohlener Arbeitsplan

### Phase 1 – Funktionale Korrektheit

1. ORAS-MAP-001: Geometrieabdeckung und dynamische Wunder-Orte
2. ORAS-MAP-002: Editionsfilter für Orte und Team-Verstecke
3. ORAS-MAP-003: Vollständiges Ortsverzeichnis
4. ORAS-MAP-004: Hordenmodell

### Phase 2 – Nutzbarkeit

1. ORAS-MAP-008: Mobile Detailnavigation
2. ORAS-MAP-009: Mobiles Filterlayout
3. ORAS-MAP-005: Bereichsnamen und Deduplizierung
4. ORAS-MAP-010: Sprachwechsel der Labels

### Phase 3 – Robustheit

1. ORAS-MAP-006 und ORAS-MAP-007: Editions- und Datenkonsistenz
2. ORAS-MAP-011: Hit-Testing
3. ORAS-MAP-012 und ORAS-MAP-013: Accessibility und Legende
4. ORAS-MAP-014: Regressionstests

## Definition of Done für die Gesamtüberarbeitung

- Jeder statische Ort mit Inhalt ist über Karte oder Verzeichnis eindeutig erreichbar.
- Kein Editionswechsel zeigt widersprüchliche OR-/AS-Inhalte.
- Begegnungswahrscheinlichkeiten sind fachlich korrekt und verständlich gruppiert.
- Mobile Auswahl führt sichtbar zu den angeforderten Details.
- Sprache, Tastaturbedienung und Fokusführung funktionieren konsistent.
- Die kritischen Daten- und UI-Invarianten werden automatisiert getestet.

