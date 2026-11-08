"""Unendliche Simulation seltener Belohnungen. Mit Strg+C beenden."""

import bisect
import os
import random
import time
from itertools import accumulate

# Jede Ziehung liefert maximal eine Belohnung.
BELOHNUNGEN = [
    ("Weekly Gold Outfit", 1_562_500),
    ("Pirate Shop Access", 137_500),
    ("Weekly Vehicle & Decal", 7_813),
    ("Weekly Pickaxe or Backbling", 568),
    ("Weekly Jam Track", 391),
    ("Weekly Loading Screen", 272),
    ("Gizmo (any)", 127),
]

# Wahrscheinlichkeiten 1/N. Die verbleibende Wahrscheinlichkeit bedeutet: kein Gewinn.
GRENZEN = list(accumulate(1 / chance for _, chance in BELOHNUNGEN))
ANZAHL_GEWINNE = len(BELOHNUNGEN)
zaehler = [0] * (ANZAHL_GEWINNE + 1)  # Letzter Eintrag: kein Gewinn.
wuerfe = 0
letzte_anzeige = time.monotonic()
start = letzte_anzeige


def format_zahl(zahl):
    return f"{zahl:,}".replace(",", ".")


def anzeigen():
    os.system("cls" if os.name == "nt" else "clear")
    print("=== BELOHNUNGS-SIMULATOR ===")
    print(f"Würfe insgesamt: {format_zahl(wuerfe)}")
    print(f"Laufzeit: {time.monotonic() - start:,.1f} Sekunden")
    print("-" * 82)
    print(f"{'Belohnung':<34} {'Chance':>14} {'Gezogen':>15} {'Anteil':>12}")
    print("-" * 82)
    for i, (name, chance) in enumerate(BELOHNUNGEN):
        anteil = 100 * zaehler[i] / wuerfe if wuerfe else 0
        print(f"{name:<34} {'1:' + format_zahl(chance):>14} {format_zahl(zaehler[i]):>15} {anteil:>11.5f}%")
    anteil = 100 * zaehler[-1] / wuerfe if wuerfe else 0
    print(f"{'Keine Belohnung':<34} {'Rest':>14} {format_zahl(zaehler[-1]):>15} {anteil:>11.5f}%")
    print("-" * 82)
    print("Läuft unbegrenzt weiter ... mit Strg+C stoppen.")


anzeigen()
try:
    while True:
        zufall = random.random()
        index = bisect.bisect_right(GRENZEN, zufall)
        zaehler[index] += 1
        wuerfe += 1

        jetzt = time.monotonic()
        if jetzt - letzte_anzeige >= 1:
            anzeigen()
            letzte_anzeige = jetzt
except KeyboardInterrupt:
    anzeigen()
    print("\nSimulation beendet.")
