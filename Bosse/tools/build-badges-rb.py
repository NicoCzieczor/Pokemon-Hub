"""
Trainerpass-Orden und Trainer-Sprites von Rot / Blau für den Boss-Planer (Bosse/sprites/), aus pret/pokered:

  case-rb.png               der Orden-Teil des Trainerpasses (Zeilen 9–17 des Bildschirms, 160 × 72), wie ihn
                            engine/menus/start_sub_menus.asm (DrawTrainerInfo) zeichnet: „○BADGES○“, Rahmen,
                            Nummern 1–8 – ohne Gesichter und Orden (die legt boss.js einzeln in die Felder)
  badge-<name>.png          die acht Orden (gfx/trainer_card/badges.png), gefärbt wie auf dem Super Game Boy
                            (BlkPacket_TrainerCard: Paletten je 8 × 8-Kachel, der Regenbogenorden hat vier)
  badge-<name>-face.png     das Gesicht des Arenaleiters, das ohne Orden in dem Feld steht (Giovanni: „?“)
  rb/<klasse>.png           Trainer-Sprites (gfx/trainers, 56 × 56) in 80 × 80, Hintergrund durchsichtig, in
                            der Palette, die das Spiel auf dem Super Game Boy für Trainer nimmt (PAL_MEWMON)

Farben: data/sgb/sgb_palettes.asm. Am Ende stehen die Werte für boss.js (BADGES.rb: [x, y, Breite, Höhe] der
Felder und Glitzern [x, y], in Bildpunkten des Game Boy).

Aufruf (Python 3 mit Pillow):  python build-badges-rb.py <pokered-checkout>
"""
import os
import re
import sys

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'sprites')
NAMES = ['boulder', 'cascade', 'thunder', 'rainbow', 'soul', 'marsh', 'volcano', 'earth']
TOP = 9          # erste Bildschirmzeile (in Kacheln) des Ausschnitts
ROWS = 9


def main():
    if len(sys.argv) < 2 or not os.path.exists(os.path.join(sys.argv[1], 'gfx/trainer_card/badges.png')):
        raise SystemExit(__doc__)
    src = sys.argv[1]
    read = lambda p: open(os.path.join(src, p), encoding='utf-8').read()

    # Paletten: 4 Farben je Palette, 5 Bit je Kanal wie auf dem Super Game Boy
    pals = {}
    for m in re.finditer(r'RGB ([\d, ]+);\s*(PAL_\w+)', read('data/sgb/sgb_palettes.asm')):
        v = [int(x) for x in m.group(1).split(',') if x.strip()]
        pals[m.group(2)] = [tuple((c << 3) | (c >> 2) for c in v[i:i + 3]) for i in range(0, 12, 3)]
    pal_set = re.search(r'PalPacket_TrainerCard:\s*PAL_SET ([\w, ]+)', read('data/sgb/sgb_packets.asm')).group(1)
    card_pals = [pals[p.strip()] for p in pal_set.split(',')]
    blocks = []      # (Palette, x1, y1, x2, y2) in Kacheln
    blk = read('data/sgb/sgb_packets.asm').split('BlkPacket_TrainerCard:')[1].split('ds ')[0]
    for m in re.finditer(r'ATTR_BLK_DATA %\d+, (\d+),\d+,\d+, (\d+),(\d+), (\d+),(\d+)', blk):
        blocks.append(tuple(int(x) for x in m.groups()))

    def tiles(path):
        """2bpp-PNG → Liste von 8 × 8-Kacheln (Farbnummer 0–3, 0 = weiß), zeilenweise"""
        im = Image.open(os.path.join(src, path)).convert('L')
        px = im.load()
        out = []
        for ty in range(0, im.height, 8):
            for tx in range(0, im.width, 8):
                out.append([[3 - round(px[tx + x, ty + y] / 85) for x in range(8)] for y in range(8)])
        return out

    info = tiles('gfx/trainer_card/trainer_info.png')        # $77–$7E, dann Hintergrundmuster ($D7)
    numbers = tiles('gfx/trainer_card/badge_numbers.png')    # $D8 + n
    circle = tiles('gfx/trainer_card/circle_tile.png')[0]    # $76
    faces = tiles('gfx/trainer_card/badges.png')             # je Arenaleiter: Gesicht (4 Kacheln), Orden (4)
    font = Image.open(os.path.join(src, 'gfx/font/font.png')).convert('L')
    fpx = font.load()

    def glyph(ch):
        n = ord(ch) - ord('A')
        tx, ty = n % 16 * 8, n // 16 * 8
        return [[3 if fpx[tx + x, ty + y] < 128 else 0 for x in range(8)] for y in range(8)]

    # Kachelkarte des Ausschnitts (Zeilen 9–17): None = leer (weiß)
    grid = [[None] * 20 for _ in range(ROWS)]
    put = lambda x, y, t: grid[y - TOP].__setitem__(x, t)
    put(6, 9, circle)
    for i, ch in enumerate('BADGES'):
        put(7 + i, 9, glyph(ch))
    put(13, 9, circle)
    for y in range(10, 18):
        put(0, y, info[8])
        put(19, y, info[8])
    put(1, 10, info[2]); put(18, 10, info[4]); put(1, 17, info[6]); put(18, 17, info[7])
    for x in range(2, 18):
        put(x, 10, info[3])
        put(x, 17, info[0])
    for y in range(11, 17):
        put(1, y, info[5])
        put(18, y, info[1])
    for k in range(8):
        put(2 + 4 * (k % 4), 11 + 3 * (k // 4), numbers[k])

    def paint(tile, pal, im, ox, oy):
        for y in range(8):
            for x in range(8):
                im.putpixel((ox + x, oy + y), pal[tile[y][x]] + (255,))

    case = Image.new('RGBA', (160, ROWS * 8))
    for y in range(ROWS):
        for x in range(20):
            paint(grid[y][x] or [[0] * 8] * 8, card_pals[0], case, x * 8, y * 8)
    os.makedirs(OUT, exist_ok=True)
    case.save(os.path.join(OUT, 'case-rb.png'), optimize=True)

    # Gesichter und Orden: 2 × 2 Kacheln; Orden in den Paletten der Blöcke über ihren Kacheln (SGB)
    places = []
    for k, name in enumerate(NAMES):
        cx, cy = 3 + 4 * (k % 4), 12 + 3 * (k // 4)
        for kind, base in (('face', 8 * k), ('', 8 * k + 4)):
            im = Image.new('RGBA', (16, 16))
            for i in range(4):
                tx, ty = cx + i % 2, cy + i // 2
                pal = card_pals[0]
                if not kind:
                    for p, x1, y1, x2, y2 in blocks:
                        if x1 <= tx <= x2 and y1 <= ty <= y2:
                            pal = card_pals[p]
                paint(faces[base + i], pal, im, i % 2 * 8, i // 2 * 8)
            im.save(os.path.join(OUT, 'badge-%s%s.png' % (name, '-face' if kind else '')), optimize=True)
        x, y = cx * 8, (cy - TOP) * 8
        places.append(([x, y, 16, 16], [x - 8, y - 8]))

    # Trainer-Sprites: Klasse → Bild (TrainerPicAndMoneyPointers in Klassen-Reihenfolge → gfx/pics.asm)
    classes = re.findall(r'^\s*trainer_const (\w+)', read('constants/trainer_constants.asm'), re.M)
    classes = [c for c in classes if c != 'NOBODY']
    pics = re.findall(r'^\s*pic_money (\w+),', read('data/trainers/pic_pointers_money.asm'), re.M)
    files = dict(re.findall(r'^(\w+)::\s*INCBIN "gfx/trainers/([\w.]+)\.pic"', read('gfx/pics.asm'), re.M))
    mew = pals['PAL_MEWMON']
    os.makedirs(os.path.join(OUT, 'rb'), exist_ok=True)
    count = 0
    for cls, pic in zip(classes, pics):
        f = files.get(pic)
        if not f or not os.path.exists(os.path.join(src, 'gfx/trainers', f + '.png')):
            continue
        g = Image.open(os.path.join(src, 'gfx/trainers', f + '.png')).convert('L')
        w, h = g.size
        idx = [[3 - round(g.getpixel((x, y)) / 85) for x in range(w)] for y in range(h)]
        # Weiß, das mit dem Rand zusammenhängt, ist Hintergrund
        bg, todo = set(), [(x, y) for x in range(w) for y in (0, h - 1)] + [(x, y) for y in range(h) for x in (0, w - 1)]
        while todo:
            x, y = todo.pop()
            if (x, y) in bg or not (0 <= x < w and 0 <= y < h) or idx[y][x]:
                continue
            bg.add((x, y))
            todo += [(x + 1, y), (x - 1, y), (x, y + 1), (x, y - 1)]
        out = Image.new('RGBA', (80, 80))
        ox, oy = (80 - w) // 2, 80 - h
        for y in range(h):
            for x in range(w):
                if (x, y) not in bg:
                    out.putpixel((ox + x, oy + y), mew[idx[y][x]] + (255,))
        out.save(os.path.join(OUT, 'rb', cls.lower() + '.png'), optimize=True)
        count += 1

    print('Trainerpass 160 × %d, 8 Orden und Gesichter, %d Trainer-Sprites in %s' % (ROWS * 8, count, OUT))
    print('Orden [x, y, w, h] / Glitzern [x, y]:', places)


if __name__ == '__main__':
    main()
