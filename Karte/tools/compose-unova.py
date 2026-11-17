#!/usr/bin/env python3
"""Setzt die Einall-Karte aus den einzelnen Matrix-Renders zusammen (Lage aus layout-unova.js).

Eingaben: layout.json, ein Render-Ordner je Matrix (render-unova.js --matrix=N → <renders>/m<N>, Matrix 0 je
Edition als m0 bzw. m0w – render-unova.js --layout=layout.json legt alle an). Ausgabe: Blöcke chunk_<zeile>_<spalte>.png à 512 × 512 Pixel (32 Kacheln) und
render.json wie render-unova.js – für make-tiles.py. Reihenfolge: Füllblöcke der Inseln (Wald, Meer am Rand),
darüber die Zusatzkarten (Brücken, Stratos City …), darüber die eigentlichen Orte der Inseln, ganz oben von den
Brücken alles außer Meer. Leere Stellen füllt der zweite Durchgang mit den Füllmodellen des Spiels (map_outtree,
map_outsea – render-unova.js --layout rendert sie als fill_*): jede leere Kachel bekommt das Gelände der nächsten Karte
(Wald oder Meer), alles, was weiter als FILL_REACH Kacheln vom Land weg zum Weltrand offen ist, bleibt frei (dort zeigt
die Seite das Meer als Hintergrundfarbe); die Küste der Füllung wird gerundet und leicht verrauscht. Stratos City
entsteht als runde Stadt um ihren Platz (castelia_city): die Szene aus render-unova.js (Straßenraster in der
Schrägsicht der übrigen Karte) auf einer Scheibe mit der Uferstraße und den Piers der Hafenkarte, davor das Meer; die
Himmelspfeilbrücke ist nur ihr Deck (skyarrow_bridge), schräg über die Bucht zum Ewigenwald.

Aufruf: python compose-unova.py <layout.json> <renders> <ausgabe> [--edition=black|white]
"""
import argparse
import json
import math
import os

import numpy as np
from PIL import Image

BRIDGES = {'drawbridge', 'marvelous', 'tubeline', 'village', 'skyarrow'}

ap = argparse.ArgumentParser()
ap.add_argument('layout')
ap.add_argument('renders')
ap.add_argument('out')
ap.add_argument('--preview', help='nur Stratos City als Bild speichern (zum Prüfen) und beenden')
ap.add_argument('--edition', choices=['black', 'white'], default='black',
                help='Schwarz: Matrix 0 aus m0, Schwarze Stadt; Weiß: m0w (Weiß-Blöcke), Weißer Wald')
args = ap.parse_args()

layout = json.load(open(args.layout, encoding='utf-8'))
CH = layout['chunk']
PX = 16                       # Pixel je Kachel
SIZE = CH * PX                # 512


def load_render(name):
    d = os.path.join(args.renders, name)
    info = json.load(open(os.path.join(d, 'render.json'), encoding='utf-8'))
    return d, info


# Quellen: (Ebene, Welt-x in Pixeln, Welt-y in Pixeln, Bild oder Pfad, Breite, Höhe)
sources = []
m0dir, m0info = load_render('m0w' if args.edition == 'white' else 'm0')
oc, orow = m0info['origin'][0] // CH, m0info['origin'][1] // CH
for isl in layout['islands']:
    dx, dz = isl['shift']
    for r, c, zone in isl['cells']:
        f = os.path.join(m0dir, f'chunk_{r - orow}_{c - oc}.png')
        if not os.path.exists(f):
            continue
        sources.append((0 if zone < 0 else 2, round((c * CH + dx) * PX), round((r * CH + dz) * PX), f, SIZE, SIZE))

def group_image(m):
    d, info = load_render(f'm{m}')
    img = Image.new('RGBA', (info['cols'] * SIZE, info['rows'] * SIZE))
    for fn in os.listdir(d):
        if fn.startswith('chunk_'):
            r, c = map(int, fn[6:-4].split('_'))
            img.alpha_composite(Image.open(os.path.join(d, fn)).convert('RGBA'), (c * SIZE, r * SIZE))
    return img


def fill_patch(name):
    """16 × 16 Kacheln aus der Mitte eines Füllmodells – kachelt nahtlos (Bäume und Wellen im 2-Kachel-Raster)."""
    f = os.path.join(args.renders, f'fill_{name}', 'chunk_0_0.png')
    if not os.path.exists(f):
        return None
    return Image.open(f).convert('RGBA').crop((128, 128, 384, 384))


def sea_texture():
    """Meer: das Füllmodell des Spiels, sonst ein ruhiges Stück Meer aus der Zugbrücken-Karte."""
    patch = fill_patch('outsea')
    if patch is not None:
        return patch
    img = group_image(next(g['matrix'] for g in layout['groups'] if g['key'] == 'drawbridge'))
    best = None
    for y in range(0, img.height - 256, 128):
        for x in range(0, img.width - 256, 128):
            c = np.asarray(img.crop((x, y, x + 256, y + 256))).astype(float)
            sea = (c[..., 2] > c[..., 0] + 35) & (c[..., 2] > c[..., 1] + 8) & (c[..., 3] == 255)
            if sea.mean() < 0.995:     # nur reines Wasser (kein Pfeiler, keine Boje)
                continue
            v = c[..., :3].std()
            if best is None or v < best[0]:
                best = (v, (x, y))
    color = (36, 92, 190)
    if best is not None:
        x, y = best[1]
        color = tuple(int(v) for v in np.asarray(img.crop((x, y, x + 256, y + 256)))[..., :3].reshape(-1, 3).mean(0))
    # nahtlos: einfarbig in der Farbe des Meeres (ein Ausschnitt kachelt mit sichtbaren Kanten)
    a = np.zeros((256, 256, 4), np.uint8)
    a[..., :3] = color
    a[..., 3] = 255
    return Image.fromarray(a, 'RGBA')


# ── Stratos City ────────────────────────────────────────────────────────────────────────────────────────────────
# Im Spiel ein Hufeisen: Platz in der Mitte, Straßen strahlenförmig zur Uferstraße, daran die Piers. Die Hafenkarte
# zeigt genau das – nur winzig (die Straßen sind dort bloß Fluchtpunkt-Kulisse, in Wahrheit eigene, viel größere
# Karten). Hier wird die Stadt deshalb im Maßstab der Straßenkarten aufgebaut: eine Scheibe aus dem Pflaster der Stadt,
# außen die Uferstraße (Asphalt und Kaimauer aus der Hafenkarte) mit den echten Piers, darauf die Szene aus
# render-unova.js – Platz, Hauptstraße, die Straßen als Avenues und Häuserzeilen, alles in der Schrägsicht der übrigen
# Karte. Alle Winkel in Grad ab Süden, nach Osten positiv.
CAST_HUB = (48, 48)                # Mittelpunkt des Hufeisens in der Hafenkarte (Kacheln)
CAST_RING = (-118, 112)            # so weit reicht die Uferstraße
CAST_SEA = 135                     # bis hierhin liegt Meer vor der Stadt, nördlich davon Land
# Piers der Hafenkarte: Ausschnitt in Pixeln relativ zum Mittelpunkt (nach Drehen der Karte um rot Grad), Winkel am
# Ring (at) und Richtung (dir) in der fertigen Stadt
CAST_PIERS = [
    dict(box=(-668, 55, -522, 407), rot=27.7, at=-100, dir=-32),
    dict(box=(-512, 388, -320, 778), rot=0, at=-46, dir=0),
    dict(box=(-96, 496, 96, 942), rot=0, at=0, dir=0),
    dict(box=(352, 322, 544, 718), rot=0, at=53, dir=0),
]


def is_sea(a):
    r, g, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
    return (b > r + 35) & (b > g + 8)


def mirror_tile(patch):
    """Nahtlos kachelbar: der Ausschnitt mit seinen Spiegelbildern."""
    a = np.asarray(patch.convert('RGB'))
    return np.vstack([np.hstack([a, a[:, ::-1]]), np.hstack([a[::-1], a[::-1, ::-1]])])


def place_rotated(canvas, sprite, ang, anchor):
    """Setzt ein nach unten zeigendes Bild so, dass seine obere Mitte auf anchor liegt und es in Richtung ang zeigt."""
    rot = sprite.rotate(ang, resample=Image.BICUBIC, expand=True)
    t = math.radians(ang)
    ox, oy = -sprite.height / 2 * math.sin(t), -sprite.height / 2 * math.cos(t)   # obere Mitte relativ zur Bildmitte
    pos = (int(round(anchor[0] - rot.width / 2 - ox)), int(round(anchor[1] - rot.height / 2 - oy)))
    if canvas is None:
        return rot, pos
    layer = Image.new('RGBA', canvas.size)
    layer.paste(rot, pos)
    return layer


def castelia_city(spec):
    from PIL import ImageDraw
    hubx, hubz, R = spec['hub'][0], spec['hub'][1], spec['r']
    EXT = R + 48                                           # Platz für die Piers
    X0, Z0 = int(math.floor(hubx - EXT)), int(round(spec['top'])) - 16     # oben Platz für Häuser, die über den Rand ragen
    W, H = (int(math.ceil(hubx + EXT)) - X0) * PX, (int(math.ceil(hubz + EXT)) - Z0) * PX
    hx, hz = (hubx - X0) * PX, (hubz - Z0) * PX
    yi, xi = np.mgrid[0:H, 0:W]
    dx, dz = ((xi - hx) / PX).astype(np.float32), ((yi - hz) / PX).astype(np.float32)
    rr = np.hypot(dx, dz)
    th = np.degrees(np.arctan2(dx, dz))
    tiled = lambda tex, u, v: tex[v % tex.shape[0], u % tex.shape[1]]

    # Bausteine aus der Hafenkarte
    harbor, hinfo = group_image(spec['harbor']), load_render(f"m{spec['harbor']}")[1]
    hp = ((CAST_HUB[0] - hinfo['origin'][0]) * PX, (CAST_HUB[1] - hinfo['origin'][1]) * PX)

    def hcrop(box, rot=0):
        src = harbor.rotate(rot, center=hp, resample=Image.BICUBIC) if rot else harbor
        return src.crop((hp[0] + box[0], hp[1] + box[1], hp[0] + box[2], hp[1] + box[3]))
    asphalt = mirror_tile(hcrop((-32, 410, 32, 474)))
    bank = mirror_tile(hcrop((-80, 560, -50, 624)))
    pave = mirror_tile(hcrop((-448, -512, -384, -448)))
    KERB, RAIL = (152, 152, 154), (118, 120, 128)
    R_IN, R_ROAD, R_BANK = R - 10.5, R - 9.8, R - 3       # Bordstein, Fahrbahn, Kaimauer (bis R)

    out = np.zeros((H, W, 4), np.uint8)
    # Meer vor der Stadt (Muster läuft in Weltpixeln – so schließt die Füllung des zweiten Durchgangs nahtlos an)
    sea = np.asarray(sea_texture().convert('RGB'))
    m = (rr >= R - 1) & (np.abs(th) <= CAST_SEA)
    out[m, :3] = tiled(sea, xi + X0 * PX, yi + Z0 * PX)[m]
    out[m, 3] = 255
    # Stadtboden: das Pflaster der Stadt
    city = (rr < R) & (yi >= (spec.get('cut', spec['top']) - Z0) * PX)      # oben endet die Stadt am Block von Route 4
    out[city, :3] = tiled(pave, xi, yi)[city]
    out[city, 3] = 255
    # Straßen, die keine eigene Karte haben: die Allee vom Platz nach Süden zum mittleren Pier und die kurzen Stücke
    # zwischen dem Platz und den Avenues (Szene: Avenues beginnen edge Kacheln neben der Mitte, band Kacheln tief)
    roads = Image.new('L', (W, H), 0)
    rd = ImageDraw.Draw(roads)
    sc = spec['scene']
    rd.line([(hx, hz), (hx, hz + R_ROAD * PX)], fill=128, width=int(9 * PX))
    rd.line([(hx, hz), (hx, hz + R_ROAD * PX)], fill=255, width=int(8 * PX))
    for sx in (-1, 1):
        for sz in (-1, 1):
            end = (hx + sx * (sc['edge'] + 1) * PX, hz + sz * sc['band'] / 2 * PX)
            rd.line([(hx, hz), end], fill=128, width=int(9 * PX))
            rd.line([(hx, hz), end], fill=255, width=int(8 * PX))
    ra = np.asarray(roads)
    m = city & (ra == 128)
    out[m, :3] = KERB
    m = city & (ra == 255)
    out[m, :3] = tiled(asphalt, xi, yi)[m]
    # Uferstraße: Bordstein, Asphalt, Kaimauer, Geländer – Texturen entlang des Bogens abgewickelt
    ring = (th >= CAST_RING[0]) & (th <= CAST_RING[1])
    u, v = (np.radians(th) * (R - 6) * PX).astype(np.int32), ((rr - R_IN) * PX).astype(np.int32)
    for lo, hi, paint in ((R_IN, R_ROAD, KERB), (R_ROAD, R_BANK, asphalt), (R_BANK, R - 0.4, bank), (R_BANK, R_BANK + 0.25, KERB), (R - 0.4, R, RAIL)):
        m = ring & (rr >= lo) & (rr < hi)
        out[m, :3] = tiled(paint, u, v)[m] if isinstance(paint, np.ndarray) else paint
    for end in CAST_RING:                                   # Bordstein quer am Ende der Fahrbahn
        m = (np.abs(th - end) * math.pi / 180 * rr < 0.35) & (rr >= R_IN) & (rr < R) & ~ring
        out[m, :3] = KERB
    out[city & ~ring & (rr >= R - 0.4), :3] = RAIL          # Stadtkante ohne Uferstraße
    # Piers: gerade Stichstraße vom Ring bis vor die Kaimauer, daran der Pier aus der Hafenkarte
    sprites = []
    for pier in CAST_PIERS:
        spr = np.asarray(hcrop(pier['box'], pier['rot'])).copy()
        spr[is_sea(spr), 3] = 0
        spr = Image.fromarray(spr, 'RGBA')
        hw = spr.width / PX / 2
        a, f = math.radians(pier['at']), math.radians(pier['dir'])
        d, q = (math.sin(f), math.cos(f)), (math.cos(f), -math.sin(f))
        A = ((R - 6) * math.sin(a), (R - 6) * math.cos(a))
        s = 0.0
        while min(math.hypot(A[0] + s * d[0] + k * hw * q[0], A[1] + s * d[1] + k * hw * q[1]) for k in (-1, 1)) < R + 0.5:
            s += 0.25
        T = (A[0] + s * d[0], A[1] + s * d[1])
        px = lambda pt, k: (hx + (pt[0] + k * hw * q[0]) * PX, hz + (pt[1] + k * hw * q[1]) * PX)
        mask = Image.new('L', (W, H), 0)
        ImageDraw.Draw(mask).polygon([px(A, -1), px(A, 1), px(T, 1), px(T, -1)], fill=255)
        side = Image.new('L', (W, H), 0)
        for k in (-1, 1):
            ImageDraw.Draw(side).line([px(A, k), px(T, k)], fill=255, width=4)
        stub = (np.asarray(mask) > 0) & (rr >= R_ROAD)
        out[stub, :3] = tiled(asphalt, xi, yi)[stub]
        out[stub, 3] = 255
        m = (np.asarray(side) > 0) & (rr >= R)
        out[m, :3] = KERB
        out[m, 3] = 255
        sprites.append((spr, pier['dir'], (hx + T[0] * PX, hz + T[1] * PX)))
    img = Image.fromarray(out, 'RGBA')
    del out
    for spr, ang, anchor in sprites:
        img.alpha_composite(place_rotated(img, spr, ang, anchor))
    # Die Szene: ihr Mittelpunkt auf den Platz. Was über die Fahrbahn der Uferstraße ragte (Ecken der Straßenkarten),
    # bleibt weg – Häuser dahinter dürfen darüberstehen
    scene = Image.open(os.path.join(args.renders, 'castelia', 'scene.png')).convert('RGBA')
    sh = spec['scene']['hub']
    layer = Image.new('RGBA', (W, H))
    layer.paste(scene, (int(round(hx - sh[0] * PX)), int(round(hz - sh[1] * PX))))
    la = np.asarray(layer).copy()
    la[(rr >= R_IN) & (dz > 0), 3] = 0
    img.alpha_composite(Image.fromarray(la, 'RGBA'))
    return img, X0 * PX, Z0 * PX


def skyarrow_bridge(spec):
    """Deck der Himmelspfeilbrücke (ihre Karte von oben, ohne Kulissen) von bridge.from nach bridge.to."""
    b = spec['bridge']
    img, info = group_image(b['matrix']), load_render(f"m{b['matrix']}")[1]
    ox, oz = -info['origin'][0] * PX, -info['origin'][1] * PX
    length = int(round(math.hypot(b['to'][0] - b['from'][0], b['to'][1] - b['from'][1]) * PX))
    # Ausschnitt in Pixeln der Brückenkarte: Fahrbahn mit Geländer, dazu die beiden Pylonenpaare in voller Breite
    DECK, TOWERS, END = (912, 1200), (872, 1276, 946, 1276), 1920
    a = np.asarray(img.crop((ox + TOWERS[0], oz + END - length, ox + TOWERS[1], oz + END))).copy()
    yy, xx = np.mgrid[0:a.shape[0], 0:a.shape[1]]
    xx, yy = xx + TOWERS[0], yy + END - length
    a[~(((xx >= DECK[0]) & (xx < DECK[1])) | ((yy >= TOWERS[2]) & (yy < TOWERS[3]))), 3] = 0
    ang = math.degrees(math.atan2(b['to'][0] - b['from'][0], b['to'][1] - b['from'][1]))
    rot, pos = place_rotated(None, Image.fromarray(a, 'RGBA'), ang, (b['from'][0] * PX, b['from'][1] * PX))
    return rot, pos[0], pos[1]


city = layout.get('castelia') if isinstance(layout.get('castelia'), dict) else None
if city:
    cimg, cx0, cy0 = castelia_city(city)
    bimg, bx0, by0 = skyarrow_bridge(city)
    if args.preview:
        prev = Image.new('RGBA', (cimg.width + 1600, cimg.height), (255, 0, 255, 255))
        prev.alpha_composite(cimg)
        prev.alpha_composite(bimg, (bx0 - cx0, by0 - cy0))
        prev.resize((prev.width // 3, prev.height // 3), Image.LANCZOS).save(args.preview)
        raise SystemExit(0)
    sources.append((1, cx0, cy0, cimg, cimg.width, cimg.height))
    # Oberhalb des Stadtrands stehen nur Häuser über, die an der Kante stehen: sie verdecken auch Route 4 (Ebene 3)
    over = cimg.crop((0, 0, cimg.width, int(round(city.get('cut', city['top']) * PX)) - cy0))
    sources.append((3, cx0, cy0, over, over.width, over.height))
    sources.append((3, bx0, by0, bimg, bimg.width, bimg.height))      # über allem, auch über dem Ewigenwald

for g in layout['groups']:
    if g.get('fan'):
        continue
    m = g['white'] if args.edition == 'white' and g.get('white') else g['matrix']
    d, info = load_render(f'm{m}')
    w, h = info['cols'] * SIZE, info['rows'] * SIZE
    img = Image.new('RGBA', (w, h))
    for fn in os.listdir(d):
        if fn.startswith('chunk_'):
            r, c = map(int, fn[6:-4].split('_'))
            img.alpha_composite(Image.open(os.path.join(d, fn)).convert('RGBA'), (c * SIZE, r * SIZE))
    ox, oz = info['origin'][0] * PX, info['origin'][1] * PX     # Lage des Ausschnitts in der Matrix
    if g.get('rot') == 90:   # im Uhrzeigersinn: Welt-x = X + (H − z), Welt-z = Z + x
        H = info['rows'] * SIZE + oz
        img = img.transpose(Image.Transpose.ROTATE_270)
        x0, y0 = g['x'] * PX + (H - (oz + h)), g['z'] * PX + ox
    else:
        x0, y0 = g['x'] * PX + ox, g['z'] * PX + oz
    sources.append((1, round(x0), round(y0), img, img.width, img.height))
    # Brücken: alles außer Meer (Fahrbahn, Türme, Pfeilersockel) zusätzlich über die Inseln legen – die Fahrbahn beginnt
    # in der Brückenkarte dort, wo die Insel davor endet; sonst schnitte die Insel den Brückenanfang ab
    if g['key'] in BRIDGES:
        a = np.asarray(img).copy()
        r, gg, b = a[..., 0].astype(int), a[..., 1].astype(int), a[..., 2].astype(int)
        sea = (b > r + 35) & (b > gg + 8)
        a[sea, 3] = 0
        sources.append((3, round(x0), round(y0), Image.fromarray(a, 'RGBA'), img.width, img.height))

# Die Welt beginnt bei 0/0 (layout-unova.js lässt rundherum Rand) – die Kartendaten nutzen dieselben Kacheln
minx = miny = 0
cols, rows = math.ceil(layout['width'] / CH), math.ceil(layout['height'] / CH)
os.makedirs(args.out, exist_ok=True)
for f in os.listdir(args.out):
    if f.startswith('chunk_'):
        os.remove(os.path.join(args.out, f))

cache = {}


def image(src):
    if not isinstance(src, str):
        return src
    if src not in cache:
        if len(cache) > 64:
            cache.clear()
        cache[src] = Image.open(src).convert('RGBA')
    return cache[src]


sources.sort(key=lambda s: s[0])

written = 0
for r in range(rows):
    for c in range(cols):
        x0, y0 = minx + c * SIZE, miny + r * SIZE
        tile = None
        for layer, sx, sy, src, w, h in sources:
            if sx >= x0 + SIZE or sy >= y0 + SIZE or sx + w <= x0 or sy + h <= y0:
                continue
            if tile is None:
                tile = Image.new('RGBA', (SIZE, SIZE))
            im = image(src)
            # Ausschnitt der Quelle, der in diesen Block fällt
            ax, ay = max(x0, sx), max(y0, sy)
            bx, by = min(x0 + SIZE, sx + w), min(y0 + SIZE, sy + h)
            part = im.crop((ax - sx, ay - sy, bx - sx, by - sy))
            tile.alpha_composite(part, (ax - x0, ay - y0))
        if tile is not None and tile.getbbox():
            tile.save(os.path.join(args.out, f'chunk_{r}_{c}.png'))
            written += 1

# ── Zweiter Durchgang: leere Stellen mit Wald bzw. Meer füllen ─────────────────────────────────────────────────
FILL_REACH = 20
land_patch, sea_patch = fill_patch('outtree'), fill_patch('outsea')
if land_patch is not None and sea_patch is not None:
    TW, TH = cols * CH, rows * CH
    state = np.zeros((TH, TW), np.uint8)      # 0 leer, 1 Land, 2 Meer
    full = np.zeros((TH, TW), bool)           # Kachel ganz bedeckt
    for r in range(rows):
        for c in range(cols):
            f = os.path.join(args.out, f'chunk_{r}_{c}.png')
            if not os.path.exists(f):
                continue
            a = np.asarray(Image.open(f).convert('RGBA')).astype(np.int16).reshape(CH, PX, CH, PX, 4)
            opaque = a[..., 3] > 200
            sea = opaque & (a[..., 2] > a[..., 0] + 35) & (a[..., 2] > a[..., 1] + 8)
            cover = opaque.mean(axis=(1, 3))
            seafrac = sea.sum(axis=(1, 3)) / np.maximum(1, opaque.sum(axis=(1, 3)))
            st = np.where(cover > 0.5, np.where(seafrac > 0.5, 2, 1), 0)
            state[r * CH:(r + 1) * CH, c * CH:(c + 1) * CH] = st
            full[r * CH:(r + 1) * CH, c * CH:(c + 1) * CH] = cover > 0.995
    # Gelände der nächsten Karte (Breitensuche von allen bedeckten Kacheln aus)
    from collections import deque
    cls = state.copy()
    dist = np.where(state > 0, 0, -1).astype(np.int32)
    q = deque(zip(*np.nonzero(state)))
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < TH and 0 <= nx < TW and dist[ny, nx] < 0:
                dist[ny, nx] = dist[y, x] + 1
                cls[ny, nx] = cls[y, x]
                q.append((ny, nx))
    def dilate(mask, n):
        """Ausdehnen um n Kacheln, abwechselnd 4er- und 8er-Nachbarschaft (ergibt fast runde Ränder)."""
        m = mask.copy()
        for i in range(n):
            g = m.copy()
            g[1:] |= m[:-1]; g[:-1] |= m[1:]; g[:, 1:] |= m[:, :-1]; g[:, :-1] |= m[:, 1:]
            if i % 2:
                g[1:, 1:] |= m[:-1, :-1]; g[:-1, :-1] |= m[1:, 1:]; g[1:, :-1] |= m[:-1, 1:]; g[:-1, 1:] |= m[1:, :-1]
            m = g
        return m
    # Einall ist eine Landmasse: was die Gebiete umschließen (Hülle mit INNER Kacheln Radius), wird Land bzw. das
    # Gelände der nächsten Karte; außerhalb davon Meer, mit runder Küste COAST Kacheln vor dem Land
    INNER, COAST = 48, 14
    hull = dilate(state > 0, INNER)
    outside = np.zeros((TH, TW), bool)
    q = deque((y, x) for y in range(TH) for x in (0, TW - 1) if not hull[y, x])
    q.extend((y, x) for x in range(TW) for y in (0, TH - 1) if not hull[y, x])
    for y, x in q:
        outside[y, x] = True
    while q:
        y, x = q.popleft()
        for ny, nx in ((y - 1, x), (y + 1, x), (y, x - 1), (y, x + 1)):
            if 0 <= ny < TH and 0 <= nx < TW and not outside[ny, nx] and not hull[ny, nx]:
                outside[ny, nx] = True
                q.append((ny, nx))
    # Hülle zurück auf die Gebiete schrumpfen: alles, was nicht innen liegt, ist Meer – innen das nächste Gelände
    sea_zone = dilate(outside, INNER - COAST)
    draw = (state == 0) | ~full
    cls[(state == 0) & sea_zone] = 2
    # Küste der Füllung: die Grenze zwischen Wald und Meer folgt sonst geraden Linien (Mitte zwischen zwei Karten,
    # Rand eines Kartenblocks) – glätten und leicht verrauschen, nur in den gefüllten Kacheln
    def blur(a, n):
        c = np.cumsum(np.pad(a, ((n, n + 1), (0, 0)), mode='edge'), axis=0)
        a = (c[2 * n + 1:] - c[:-2 * n - 1]) / (2 * n + 1)
        c = np.cumsum(np.pad(a, ((0, 0), (n, n + 1)), mode='edge'), axis=1)
        return (c[:, 2 * n + 1:] - c[:, :-2 * n - 1]) / (2 * n + 1)
    rng = np.random.default_rng(3)
    CELL = 10
    grid = rng.random((TH // CELL + 2, TW // CELL + 2)).astype(np.float32)
    noise = np.asarray(Image.fromarray(grid).resize((grid.shape[1] * CELL, grid.shape[0] * CELL), Image.BICUBIC))[:TH, :TW] - 0.5
    soft = blur(blur((cls == 1).astype(np.float32), 5), 5)
    landish = soft + 0.45 * noise > 0.5
    empty = state == 0
    cls[empty & landish] = 1
    cls[empty & ~landish] = 2
    land = np.tile(np.asarray(land_patch), (SIZE // 256, SIZE // 256, 1))
    seat = np.tile(np.asarray(sea_patch), (SIZE // 256, SIZE // 256, 1))
    filled = 0
    for r in range(rows):
        for c in range(cols):
            d = draw[r * CH:(r + 1) * CH, c * CH:(c + 1) * CH]
            if not d.any():
                continue
            k = cls[r * CH:(r + 1) * CH, c * CH:(c + 1) * CH]
            m_land = np.repeat(np.repeat(d & (k == 1), PX, 0), PX, 1)
            m_sea = np.repeat(np.repeat(d & (k != 1), PX, 0), PX, 1)
            under = np.zeros((SIZE, SIZE, 4), np.uint8)
            under[m_land] = land[m_land]
            under[m_sea] = seat[m_sea]
            img = Image.fromarray(under, 'RGBA')
            f = os.path.join(args.out, f'chunk_{r}_{c}.png')
            if os.path.exists(f):
                img.alpha_composite(Image.open(f).convert('RGBA'))
            img.save(f)
            filled += 1
    print(f'Füllung: {filled} Blöcke mit Wald/Meer ergänzt')

info = {
    'version': 2, 'source': 'Pokemon Black/White ROM (layout-unova.js)', 'rows': rows, 'cols': cols, 'size': SIZE,
    'shear': m0info.get('shear', 0), 'origin': [minx // PX, miny // PX], 'chunks': {},
}
json.dump(info, open(os.path.join(args.out, 'render.json'), 'w', encoding='utf-8'))
print(f'{written} Blöcke, {cols}×{rows}, Ursprung {info["origin"]} Kacheln')
