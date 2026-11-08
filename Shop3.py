"""Simuliert Würfe, bis Pirate Shop Access zum ersten Mal gezogen wurde."""

import bisect
import random
import time
from itertools import accumulate

# Chance 1:N pro Wurf; maximal ein Gewinn pro Wurf.
BELOHNUNGEN = [
    ("Weekly Gold Outfit", 1_562_500),
    ("Pirate Shop Access", 137_500),
    ("Weekly Vehicle & Decal", 7_813),
    ("Weekly Pickaxe or Backbling", 568),
    ("Weekly Jam Track", 391),
    ("Weekly Loading Screen", 272),
    ("Gizmo (any)", 127),
]

GRENZEN = list(accumulate(1 / chance for _, chance in BELOHNUNGEN))
ANZAHL = len(BELOHNUNGEN)
zaehler = [0] * (ANZAHL + 1)  # Letzter Eintrag: keine Belohnung.
wuerfe = 0
noch_fehlend = ANZAHL
PIRATE_INDEX = 1
start = time.monotonic()


def zahl(n):
    return f"{n:,}".replace(",", ".")


def ausgabe():
    print(f"\n=== BELOHNUNGS-SIMULATOR ===")
    print(f"Würfe insgesamt: {zahl(wuerfe)}")
    print(f"Laufzeit: {time.monotonic() - start:.1f} Sekunden")
    print(f"Belohnungen gefunden: {ANZAHL - noch_fehlend}/{ANZAHL}")
    print("-" * 80)
    print(f"{'Belohnung':<34} {'Chance':>13} {'Gezogen':>14}  {'Status':<9}")
    print("-" * 80)
    for i, (name, chance) in enumerate(BELOHNUNGEN):
        status = "Gefunden" if zaehler[i] else "FEHLT"
        print(f"{name:<34} {'1:' + zahl(chance):>13} {zahl(zaehler[i]):>14}  {status}")
    print(f"{'Keine Belohnung':<34} {'Rest':>13} {zahl(zaehler[-1]):>14}")
    print("-" * 80)


print("Simulation läuft: Stopp, sobald Pirate Shop Access gezogen wurde.")

try:
    while zaehler[PIRATE_INDEX] == 0:
        # Ein Wurf: eine der sieben Belohnungen oder gar kein Gewinn.
        index = bisect.bisect_right(GRENZEN, random.random())
        wuerfe += 1

        if index < ANZAHL and zaehler[index] == 0:
            noch_fehlend -= 1
            print(f"[Wurf {zahl(wuerfe)}] Neu gefunden: {BELOHNUNGEN[index][0]} ({ANZAHL - noch_fehlend}/{ANZAHL})")

        zaehler[index] += 1

        # Zwischenergebnis nur alle 1.000.000 Würfe, statt bei jedem Wurf.
        if wuerfe % 1_000_000 == 0 and zaehler[PIRATE_INDEX] == 0:
            print(f"... {zahl(wuerfe)} Würfe, Pirate Shop Access noch nicht gefunden.")

except KeyboardInterrupt:
    print("\nManuell abgebrochen.")
else:
    print(f"\nGESCHAFFT! Pirate Shop Access bei Wurf {zahl(wuerfe)} gefunden!")
finally:
    ausgabe()
