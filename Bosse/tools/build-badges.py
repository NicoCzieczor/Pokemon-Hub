"""
Ordenkoffer aus Platin für den Boss-Planer (Bosse/sprites/) aus pret/pokeplatinum, res/graphics/trainer_case/:

  case.png                Koffer-Unterseite (badge_case.NSCR + badge_case_tiles.png, Palette case_platinum.pal),
                          ab Zeile 11 (darüber die Kante des Deckels); grau außerhalb der runden Ecken = durchsichtig
  badge-<name>.png        die acht Orden (badge_case_sprites.png) auf ihre Fläche zugeschnitten, blank: Farben aus
                          <name>_badge.pal, Zeile 0 (die Zeilen 0–3 sind die Stufen von blank bis stark verschmutzt)
  badge-<name>-dull.png   dieselben angestaubt (Zeile 2)
  sparkle2.png            Glitzern „zwei Sterne“ (4 Bilder à 32 × 32 nebeneinander, im Spiel je 8 Ticks)
  sparkle4.png            Glitzern „vier Sterne“ (4 Bilder à 64 × 64, im Spiel je 4 Ticks)

badge_case_sprites.png ist ein Blatt mit den Bildern untereinander, durch eine 1-px-Linie getrennt: 8 Orden à 64 × 64,
4 × Glitzern 32 × 32 (links im 64er-Streifen), 4 × Glitzern 64 × 64, 3 × Ringe (Knopf-Effekt, hier nicht gebraucht).
Lage im Spiel (src/applications/trainer_case/sprites.c): Orden bei sBadgeCoordinates, Glitzern bei sSparkleCoordinates
(das große 8 px weiter links). Am Ende stehen die Werte für boss.js (Koffer-Koordinaten, also y − 11).

Aufruf (Python 3 mit Pillow):  python build-badges.py [cache-ordner]
"""
import os
import struct
import sys
import urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'sprites')
CACHE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), '.platin-trainer-cache')
RAW = 'https://raw.githubusercontent.com/pret/pokeplatinum/main/res/graphics/trainer_case/'
NAMES = ['coal', 'forest', 'cobble', 'fen', 'relic', 'mine', 'icicle', 'beacon']
BADGE_XY = [(24, 40), (80, 40), (136, 40), (192, 40), (24, 72), (80, 72), (136, 72), (192, 72)]
SPARKLE_XY = [(24, 40), (80, 40), (136, 40), (192, 40), (24, 96), (80, 96), (136, 96), (192, 96)]
TOP = 11
DULL = 2

os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)


def fetch(name):
    path = os.path.join(CACHE, name)
    if not os.path.exists(path):
        with urllib.request.urlopen(RAW + name, timeout=30) as r:
            data = r.read()
        with open(path, 'wb') as f:
            f.write(data)
    return path


def jasc(name):
    lines = open(fetch(name), encoding='ascii').read().split('\n')
    if lines[0].strip() != 'JASC-PAL':
        raise SystemExit(f'{name}: keine JASC-Palette')
    return [tuple(map(int, l.split())) for l in lines[3:3 + int(lines[2])]]


def save(img, name):
    img.save(os.path.join(OUT, name), optimize=True)
    return os.path.getsize(os.path.join(OUT, name))


total = 0

# ── Koffer: Kachelkarte zeichnen ──
case_pal = jasc('case_platinum.pal')
scr = open(fetch('badge_case.NSCR'), 'rb').read()
if scr[:4] != b'RCSN' or scr[16:20] != b'NRCS':
    raise SystemExit('badge_case.NSCR: unerwartetes Format')
sw, sh = struct.unpack('<HH', scr[24:28])
size = struct.unpack('<I', scr[32:36])[0]
cells = struct.unpack(f'<{size // 2}H', scr[36:36 + size])
tiles = Image.open(fetch('badge_case_tiles.png'))
tp, cols = tiles.load(), tiles.width // 8
idx = [[0] * sw for _ in range(sh)]
for k, e in enumerate(cells):
    t, hf, vf, p = e & 0x3ff, e >> 10 & 1, e >> 11 & 1, e >> 12
    tx, ty, sx, sy = k % (sw // 8) * 8, k // (sw // 8) * 8, t % cols * 8, t // cols * 8
    for y in range(8):
        for x in range(8):
            idx[ty + y][tx + x] = p * 16 + tp[sx + (7 - x if hf else x), sy + (7 - y if vf else y)] % 16
# Grau (Farbe 1), das mit dem Rand zusammenhängt, liegt außerhalb der runden Ecken
h = sh - TOP
outside, todo = set(), [(x, y) for x in range(sw) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, sw - 1)]
while todo:
    x, y = todo.pop()
    if (x, y) in outside or not (0 <= x < sw and 0 <= y < h) or idx[y + TOP][x] != 1:
        continue
    outside.add((x, y))
    todo += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
case = Image.new('RGBA', (sw, h))
for y in range(h):
    for x in range(sw):
        case.putpixel((x, y), (0, 0, 0, 0) if (x, y) in outside else case_pal[idx[y + TOP][x]] + (255,))
total += save(case, 'case.png')

# ── Orden und Glitzern aus dem Sprite-Blatt ──
sheet = Image.open(fetch('badge_case_sprites.png'))
if sheet.mode != 'P' or sheet.width != 64:
    raise SystemExit(f'badge_case_sprites.png: unerwartetes Format {sheet.mode} {sheet.size}')
px, spal = sheet.load(), sheet.getpalette()


def paletted(w, h, colours):
    img = Image.new('P', (w, h), 0)
    img.putpalette([c for rgb in colours for c in rgb])
    return img


places = []
for k, name in enumerate(NAMES):
    y0 = k * 65
    pts = [(x, y) for y in range(64) for x in range(64) if px[x, y0 + y] % 16]
    if len({px[x, y0 + y] // 16 for x, y in pts}) != 1:
        raise SystemExit(f'{name}: mehr als eine Palette')
    x0, y1 = min(p[0] for p in pts), min(p[1] for p in pts)
    w, h = max(p[0] for p in pts) + 1 - x0, max(p[1] for p in pts) + 1 - y1
    # Farben wie im Spiel: es lädt je Orden <name>_badge.pal, Zeile = Verschmutzung (TrainerCase_DrawBadgeDirt)
    pal = jasc(f'{name}_badge.pal')
    clean, dirt = pal[0:16], pal[DULL * 16:DULL * 16 + 16]
    for colours, suffix in ((clean, ''), (dirt, '-dull')):
        img = paletted(w, h, colours)
        for x, y in pts:
            img.putpixel((x - x0, y - y1), px[x, y0 + y] % 16)
        img.info['transparency'] = 0
        img.save(os.path.join(OUT, f'badge-{name}{suffix}.png'), optimize=True, transparency=0)
        total += os.path.getsize(os.path.join(OUT, f'badge-{name}{suffix}.png'))
    places.append((BADGE_XY[k][0] + x0, BADGE_XY[k][1] + y1 - TOP, w, h))

sparkle = [tuple(spal[(8 * 16 + i) * 3:(8 * 16 + i) * 3 + 3]) for i in range(16)]
for name, n, size, y0, pitch in (('sparkle2', 4, 32, 520, 33), ('sparkle4', 4, 64, 652, 65)):
    img = paletted(size * n, size, sparkle)
    for f in range(n):
        for y in range(size):
            for x in range(size):
                i = px[x, y0 + f * pitch + y]
                if i // 16 == 8 and i % 16:
                    img.putpixel((f * size + x, y), i % 16)
    img.info['transparency'] = 0
    img.save(os.path.join(OUT, name + '.png'), optimize=True, transparency=0)
    total += os.path.getsize(os.path.join(OUT, name + '.png'))

print(f'Koffer {sw} × {sh - TOP}, 8 Orden blank und angestaubt, Glitzern – zusammen {total // 1024} KB in {OUT}')
print('Orden [x, y, w, h]:', [list(p) for p in places])
print('Glitzern [x, y]:', [[x, y - TOP] for x, y in SPARKLE_XY])
