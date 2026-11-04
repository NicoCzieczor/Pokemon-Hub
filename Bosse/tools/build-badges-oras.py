"""
Orden von Omega Rubin / Alpha Saphir für den Ordenkoffer im Boss-Planer (Bosse/sprites/badge-<name>.png und -dull.png).

Gezeichnet als Pixelgrafik im Stil der Platin-Orden (38 × 38, 1 px dunkler Rand, Licht oben links, Schatten unten
rechts), keine Grafiken aus dem Spiel: Steinorden, Knöchelorden, Dynamo-Orden, Hitzeorden, Balanceorden, Federorden,
Mentalorden, Schauerorden. „-dull“ = angestaubt (ohne Spielstand bzw. noch nicht verdient), wie bei Platin.
Lage im Koffer: boss.js (BADGES.oras, gleiche Mulden wie die Platin-Orden).

Aufruf (Python 3 mit Pillow):  python build-badges-oras.py
"""
import math
import os
from PIL import Image, ImageChops, ImageDraw, ImageFilter

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'sprites')
S = 38
INK = (34, 30, 44, 255)


def mask(draw_fn):
    m = Image.new('L', (S, S), 0)
    draw_fn(ImageDraw.Draw(m))
    return m.point(lambda v: 255 if v > 127 else 0)


def shifted(m, dx, dy):
    return ImageChops.offset(m, dx, dy).crop((0, 0, S, S))


def shade(img, m, main, light, dark, edge=2):
    """Grundfarbe, Licht oben links, Schatten unten rechts, dunkler Rand außen."""
    fill = Image.new('RGBA', (S, S), main)
    img.paste(fill, (0, 0), m)
    lit = ImageChops.subtract(m, shifted(m, edge, edge))
    img.paste(Image.new('RGBA', (S, S), light), (0, 0), lit)
    sh = ImageChops.subtract(m, shifted(m, -edge, -edge))
    img.paste(Image.new('RGBA', (S, S), dark), (0, 0), sh)
    ring = ImageChops.subtract(m.filter(ImageFilter.MaxFilter(3)), m)
    img.paste(Image.new('RGBA', (S, S), INK), (0, 0), ring)


def poly(cx, cy, r, n, rot=0.0, ry=None):
    ry = ry or r
    return [(cx + r * math.cos(rot + 2 * math.pi * i / n), cy + ry * math.sin(rot + 2 * math.pi * i / n)) for i in range(n)]


def stone(img):          # Steinorden: grauer, facettierter Stein
    m = mask(lambda d: d.polygon(poly(19, 19, 15, 8, math.pi / 8), fill=255))
    shade(img, m, (158, 148, 132, 255), (214, 204, 184, 255), (104, 94, 82, 255))
    d = ImageDraw.Draw(img)
    d.polygon(poly(19, 19, 7, 8, math.pi / 8), outline=(104, 94, 82, 255), fill=(186, 176, 158, 255))


def knuckle(img):        # Knöchelorden: Faust mit drei Knöcheln
    def f(d):
        d.rounded_rectangle((7, 12, 31, 31), 6, fill=255)
        for x in (11, 19, 27):
            d.ellipse((x - 5, 7, x + 5, 17), fill=255)
    m = mask(f)
    shade(img, m, (238, 150, 92, 255), (255, 200, 150, 255), (182, 96, 52, 255))
    d = ImageDraw.Draw(img)
    for x in (15, 23):
        d.line((x, 10, x, 16), fill=(182, 96, 52, 255))
    d.line((9, 24, 21, 24), fill=(182, 96, 52, 255))


def dynamo(img):         # Dynamo-Orden: gelbes Zahnrad mit blauer Mitte und Blitz
    def f(d):
        d.ellipse((6, 6, 32, 32), fill=255)
        for i in range(8):
            a = i * math.pi / 4
            d.polygon(poly(19 + 13 * math.cos(a), 19 + 13 * math.sin(a), 4, 4, a + math.pi / 4), fill=255)
    m = mask(f)
    shade(img, m, (246, 204, 70, 255), (255, 238, 160, 255), (196, 150, 30, 255))
    d = ImageDraw.Draw(img)
    d.ellipse((12, 12, 26, 26), fill=(58, 90, 184, 255), outline=INK)
    d.polygon([(20, 13), (15, 20), (19, 20), (17, 25), (23, 18), (19, 18)], fill=(255, 238, 160, 255))


def heat(img):           # Hitzeorden: Flamme
    def f(d):
        d.ellipse((8, 14, 30, 34), fill=255)
        d.polygon([(8, 24), (12, 12), (16, 16), (19, 4), (23, 14), (27, 10), (30, 24)], fill=255)
    m = mask(f)
    shade(img, m, (255, 92, 60, 255), (255, 176, 112, 255), (184, 48, 30, 255))
    d = ImageDraw.Draw(img)
    d.ellipse((14, 20, 24, 31), fill=(255, 214, 110, 255))
    d.polygon([(14, 25), (17, 17), (19, 21), (21, 16), (24, 25)], fill=(255, 214, 110, 255))


def balance(img):        # Balanceorden: Ring, halb rot, halb weiß
    m = mask(lambda d: d.ellipse((5, 5, 33, 33), fill=255))
    shade(img, m, (232, 90, 122, 255), (255, 160, 180, 255), (166, 46, 78, 255))
    d = ImageDraw.Draw(img)
    d.pieslice((8, 8, 30, 30), -45, 135, fill=(244, 238, 240, 255))
    d.ellipse((14, 14, 24, 24), fill=(232, 90, 122, 255), outline=INK)


def feather(img):        # Federorden: geschwungene Feder
    def f(d):
        d.polygon([(8, 32), (12, 20), (18, 11), (27, 5), (31, 8), (28, 17), (21, 26), (12, 31)], fill=255)
    m = mask(f)
    shade(img, m, (150, 140, 255, 255), (206, 200, 255, 255), (96, 84, 196, 255))
    d = ImageDraw.Draw(img)
    d.line((9, 31, 28, 8), fill=(244, 240, 255, 255))
    for t in (0.3, 0.5, 0.7):
        x, y = 9 + 19 * t, 31 - 23 * t
        d.line((x, y, x + 5, y + 3), fill=(96, 84, 196, 255))


def mind(img):           # Mentalorden: zwei Kreise (Ben & Svenja)
    def f(d):
        d.ellipse((4, 9, 24, 29), fill=255)
        d.ellipse((14, 9, 34, 29), fill=255)
    m = mask(f)
    shade(img, m, (255, 122, 184, 255), (255, 192, 220, 255), (192, 74, 132, 255))
    d = ImageDraw.Draw(img)
    d.ellipse((9, 14, 17, 22), fill=(255, 214, 90, 255), outline=INK)
    d.ellipse((21, 14, 29, 22), fill=(120, 150, 255, 255), outline=INK)


def rain(img):           # Schauerorden: Wassertropfen
    def f(d):
        d.ellipse((8, 14, 30, 34), fill=255)
        d.polygon([(9, 22), (19, 3), (29, 22)], fill=255)
    m = mask(f)
    shade(img, m, (74, 156, 255, 255), (168, 212, 255, 255), (42, 92, 176, 255))
    d = ImageDraw.Draw(img)
    d.ellipse((13, 19, 18, 26), fill=(220, 238, 255, 255))


BADGES = [('stone', stone), ('knuckle', knuckle), ('dynamo', dynamo), ('heat', heat),
          ('balance', balance), ('feather', feather), ('mind', mind), ('rain', rain)]


def dull(img):
    """Angestaubt: entsättigt, dunkler und ins Bräunliche – wie die Platin-Orden ohne Spielstand."""
    out = Image.new('RGBA', img.size)
    px, po = img.load(), out.load()
    for y in range(S):
        for x in range(S):
            r, g, b, a = px[x, y]
            if not a:
                continue
            l = 0.3 * r + 0.59 * g + 0.11 * b
            po[x, y] = (int(l * 0.55 + r * 0.15 + 30), int(l * 0.55 + g * 0.15 + 26), int(l * 0.55 + b * 0.15 + 18), a)
    return out


if __name__ == '__main__':
    os.makedirs(OUT, exist_ok=True)
    for name, fn in BADGES:
        img = Image.new('RGBA', (S, S), (0, 0, 0, 0))
        fn(img)
        img.save(os.path.join(OUT, 'badge-%s.png' % name))
        dull(img).save(os.path.join(OUT, 'badge-%s-dull.png' % name))
        print('badge-%s.png' % name)
