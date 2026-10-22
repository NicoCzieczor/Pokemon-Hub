"""
Baut aus den gerenderten Kartenblöcken (render-platin.js) die Kartenblätter für die Karte.

Statt Tausender kleiner Kacheln gibt es wenige große Blätter (unter 100 Dateien – so passt alles in einen
Upload über die GitHub-Weboberfläche). Drei Detailstufen, z = Zoomstufe von Leaflet (2^z Pixel pro Spielkachel):
  z = 0: ein Blatt für die ganze Region (960 × 960), liegt immer ganz unten
  z = 2: 2 × 2 Blätter à 1920 × 1920 (je 15 × 15 Blöcke)
  z = 4: volle Auflösung (16 Pixel pro Spielkachel), Blätter à 2048 × 2048 (je 4 × 4 Blöcke)

Die Innenkarten (Höhlen, Gebäude …) landen gepackt in wenigen Atlas-Bildern (tiles/in/<n>.webp, 2048 px).

Aufruf (Python 3 + Pillow):
  python make-tiles.py <render-ordner> <ausgabe-ordner> [--interiors <ordner>] [--quality 82] [--preview vorschau.png]

Ausgabe: <ausgabe>/<z>/<x>_<y>.webp, <ausgabe>/sea.png (Wassermuster fürs offene Meer, zeichnet die Karte
         selbst), <ausgabe>/index.json (Blätter + Bodenhöhen, um Marker an die Schrägsicht anzupassen),
         <ausgabe>/in/<n>.webp + <ausgabe>/interiors.json (Atlanten, Lage jeder Innenkarte, Bodenhöhen).
"""
import argparse
import base64
import json
import os
from collections import Counter

from PIL import Image, ImageChops

ap = argparse.ArgumentParser()
ap.add_argument('src')
ap.add_argument('out')
ap.add_argument('--interiors', help='Ordner mit interiors.json (Standard: der Render-Ordner)')
ap.add_argument('--quality', type=int, default=82)
ap.add_argument('--preview')
args = ap.parse_args()

info = json.load(open(os.path.join(args.src, 'render.json'), encoding='utf-8'))
ROWS, COLS, S = info['rows'], info['cols'], info['size']   # S = 512 Pixel je Block auf Stufe 4
LEVELS = {4: 4, 2: 15, 0: 30}                                # Blöcke je Blattkante
levels = []


def chunk(r, c):
    p = os.path.join(args.src, f'chunk_{r}_{c}.png')
    return Image.open(p).convert('RGBA') if os.path.exists(p) else None


def save(z, x, y, img):
    folder = os.path.join(args.out, str(z))
    os.makedirs(folder, exist_ok=True)
    img.save(os.path.join(folder, f'{x}_{y}.webp'), 'WEBP', quality=args.quality, method=6)


# Stufe 4: Blätter aus 4 × 4 Blöcken in voller Auflösung; nebenbei die ganze Karte auf Stufe 2 (1/4) sammeln
n4 = LEVELS[4]
full2 = Image.new('RGBA', (COLS * S // 4, ROWS * S // 4), (0, 0, 0, 0))
sheets4 = []
for sy in range((ROWS + n4 - 1) // n4):
    for sx in range((COLS + n4 - 1) // n4):
        rows = range(sy * n4, min(ROWS, sy * n4 + n4))
        cols = range(sx * n4, min(COLS, sx * n4 + n4))
        sheet = Image.new('RGBA', (len(cols) * S, len(rows) * S), (0, 0, 0, 0))
        any_chunk = False
        for r in rows:
            for c in cols:
                im = chunk(r, c)
                if im is None:
                    continue
                any_chunk = True
                sheet.paste(im, ((c - cols.start) * S, (r - rows.start) * S))
                full2.paste(im.resize((S // 4, S // 4), Image.Resampling.BOX), (c * S // 4, r * S // 4))
        if any_chunk and sheet.getbbox() is not None:
            save(4, sx, sy, sheet)
            sheets4.append(f'{sx}_{sy}')
levels.append({'z': 4, 'size': n4 * S, 'sheets': sheets4})

# Stufe 2: 2 × 2 Blätter aus der verkleinerten Gesamtkarte
n2 = LEVELS[2] * S // 4
sheets2 = []
for sy in range((full2.height + n2 - 1) // n2):
    for sx in range((full2.width + n2 - 1) // n2):
        sheet = full2.crop((sx * n2, sy * n2, min(full2.width, sx * n2 + n2), min(full2.height, sy * n2 + n2)))
        if sheet.getbbox() is not None:
            save(2, sx, sy, sheet)
            sheets2.append(f'{sx}_{sy}')
levels.append({'z': 2, 'size': n2, 'sheets': sheets2})

# Stufe 0: die ganze Region in einem Blatt
full0 = full2.resize((full2.width // 4, full2.height // 4), Image.Resampling.BOX)
save(0, 0, 0, full0)
levels.append({'z': 0, 'size': full0.width, 'sheets': ['0_0']})

if args.preview:
    prev = Image.new('RGBA', full2.size, (13, 15, 43, 255))
    prev.alpha_composite(full2)
    prev.convert('RGB').save(args.preview)


# ── Wassermuster aus der Meeres-Kulisse (Periode suchen, dann ein Stück an Weltkoordinaten ausgerichtet) ──
def sea_pattern():
    p = os.path.join(args.src, 'sea_sample.png')
    if not os.path.exists(p):
        return None
    im = Image.open(p).convert('RGB')
    for p in (16, 32, 64, 128):
        a = im.crop((128, 128, 128 + 2 * p, 128 + 2 * p))
        if all(ImageChops.difference(a.crop((0, 0, p, p)), a.crop((dx, dy, dx + p, dy + p))).getbbox() is None
               for dx, dy in ((p, 0), (0, p))):
            # Blockursprung liegt auf einem Vielfachen von 512 → Ausschnitt ab 128 ist weltbündig
            im.crop((128, 128, 128 + p, 128 + p)).save(os.path.join(args.out, 'sea.png'))
            return p
    return None


sea = sea_pattern()

# ── Bodenhöhen (in Kacheln) für die Marker: je Block eine Zahl (eben) oder 1024 Bytes (Höhe·4 + 16) ──
def encode_ground(chunks):
    """chunks: {"Zeile:Spalte": Zahl | [[Höhen je Kachel], …]} → (ground, multi)"""
    ground, multi = {}, {}
    for key, g in chunks.items():
        if not isinstance(g, list):
            ground[key] = g
            continue
        r, c = map(int, key.split(':'))
        common = Counter(hs[0] for hs in g if hs).most_common(1)
        fallback = common[0][0] if common else 0
        low = [hs[0] if hs else fallback for hs in g]
        for i, hs in enumerate(g):
            if len(hs) > 1:  # Brücken: alle Ebenen, die Marker wählen die passende
                multi[f'{c * 32 + i % 32}_{r * 32 + i // 32}'] = hs
        if len(set(low)) == 1:
            ground[key] = low[0]
        else:
            raw = bytes(max(0, min(255, round(h * 4) + 16)) for h in low)
            ground[key] = base64.b64encode(raw).decode('ascii')
    return ground, multi


ground, multi = encode_ground({key: ch['ground'] for key, ch in info['chunks'].items()})

with open(os.path.join(args.out, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump({'levels': levels, 'sea': sea, 'shear': round(info['shear'], 4), 'ground': ground, 'multi': multi},
              f, separators=(',', ':'))


# ── Innenkarten: in Atlas-Bilder packen (Regale, nach Höhe sortiert; 2 px Abstand gegen Ausbluten) ──
ATLAS, PAD = 2048, 2
int_dir = args.interiors or args.src
int_file = os.path.join(int_dir, 'interiors.json')
if os.path.exists(int_file):
    idata = json.load(open(int_file, encoding='utf-8'))
    imgs = idata['images']
    atlases = []  # {'w', 'h', 'shelves': [[y, höhe, x_frei]], 'next_y', 'items': [(key, x, y)]}
    for key in sorted(imgs, key=lambda k: (-imgs[k]['h'], -imgs[k]['w'])):
        w, h = imgs[key]['w'], imgs[key]['h']
        if w > ATLAS or h > ATLAS:  # zu groß: eigenes Bild
            atlases.append({'w': w, 'h': h, 'shelves': [], 'next_y': ATLAS + 1, 'items': [(key, 0, 0)]})
            continue
        placed = False
        for a in atlases:
            for sh in a['shelves']:
                if h <= sh[1] and sh[2] + w <= ATLAS:
                    a['items'].append((key, sh[2], sh[0]))
                    sh[2] += w + PAD
                    placed = True
                    break
            if not placed and a['next_y'] + h <= ATLAS:
                a['shelves'].append([a['next_y'], h, w + PAD])
                a['items'].append((key, 0, a['next_y']))
                a['next_y'] += h + PAD
                placed = True
            if placed:
                break
        if not placed:
            atlases.append({'w': ATLAS, 'h': ATLAS, 'shelves': [[0, h, w + PAD]], 'next_y': h + PAD, 'items': [(key, 0, 0)]})
    out_images, sizes = {}, []
    folder = os.path.join(args.out, 'in')
    os.makedirs(folder, exist_ok=True)
    for n, a in enumerate(atlases):
        aw = max(x + imgs[k]['w'] for k, x, _ in a['items'])
        ah = max(y + imgs[k]['h'] for k, _, y in a['items'])
        sheet = Image.new('RGBA', (aw, ah), (0, 0, 0, 0))
        for k, x, y in a['items']:
            sheet.paste(Image.open(os.path.join(int_dir, imgs[k]['file'])).convert('RGBA'), (x, y))
            out_images[k] = {'a': n, 'x': x, 'y': y, 'w': imgs[k]['w'], 'h': imgs[k]['h'], 'ox': imgs[k]['ox'], 'oz': imgs[k]['oz']}
        sheet.save(os.path.join(folder, f'{n}.webp'), 'WEBP', quality=args.quality, method=6)
        sizes.append([aw, ah])
    int_ground = {}
    for k, v in imgs.items():
        g, m = encode_ground(v['ground'])
        int_ground[k] = {'ground': g, 'multi': m}
    with open(os.path.join(args.out, 'interiors.json'), 'w', encoding='utf-8') as f:
        json.dump({'shear': round(idata['shear'], 4), 'px': 16, 'atlases': sizes, 'images': out_images, 'ground': int_ground},
                  f, separators=(',', ':'))
    print(f'Innenkarten: {len(imgs)} in {len(atlases)} Atlanten')

files, total = 0, 0
for root, _, names in os.walk(args.out):
    files += len(names)
    total += sum(os.path.getsize(os.path.join(root, n)) for n in names)
print(f'{files} Dateien, {total / 1024 / 1024:.1f} MB – Blätter: ' + ', '.join(f"z{lv['z']}: {len(lv['sheets'])}" for lv in levels))
