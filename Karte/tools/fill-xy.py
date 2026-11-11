"""
Füllt die Lücken der gerenderten Kalos-Karte (render-xy.js) – wie fill-oras.py für Hoenn, dazu die Dächer von Illumina City.

Illumina City ist im Spiel nur von der Straße aus zu sehen: Die Häuser sind Fassaden ohne Dach und ohne Rückseite.
Von oben bleiben die Häuserblöcke zwischen den Avenuen leer – hier bekommen alle leeren Pixel im Stadtkreis
(render.json „lumiose": Mitte und Radius in Weltkacheln) Zinkdächer in Blaugrau, wie die Mansarden der Stadt.

(Ursprüngliche Beschreibung aus fill-oras.py:)
Füllt die Lücken der gerenderten Hoenn-Karte (render-oras.js), bevor make-tiles.py daraus die Kartenblätter baut.

Hoenn besteht im Spiel aus vielen einzelnen Gebieten; dazwischen ist im Bild nichts. Land-Lücken (in mindestens 6
von 8 Richtungen liegt Land) bekommen Wald aus dem Spiel – ebenso grüne oder dunkle Kulisse (Kacheln ohne eigenes
Gebiet, render.json „filler“) und große strukturlose Flächen (ab 150 Kacheln am Stück einfarbig grün oder dunkel – die
Platzhalter, die die Gebiete statt ihrer Nachbarn zeigen, etwa wo der Blütenburgwald liegt): Gras-Textur chip_kusa im Farbton des Füllwaldes und Bäume,
freigestellt aus einem gerenderten Block (trees.png). Waldinseln ohne angrenzendes Land fallen weg. Wasser-Lücken
bleiben frei – dort zeichnet die Karte das Meermuster (sea.png: chip_sea_b, 3 Kacheln je Wiederholung, im mittleren
Ton wie das Kulissenmeer in render-oras.js; make-tiles.py übernimmt es). Gezeichnet wird nur in leere Pixel: echter Inhalt
wird nie übermalt.

Aufruf (Python 3 + Pillow + numpy):  python fill-xy.py <render-ordner> <ausgabe-ordner>
Danach:                              python make-tiles.py <ausgabe-ordner> ../tiles-kalos-xy
"""
import base64, json, os, sys
from collections import deque
import numpy as np
from PIL import Image

src, out = sys.argv[1:3]
TREE_W, TREE_H = (50, 95), (55, 110)    # Größe eines freigestellten Baums in Pixeln (Eichen des Nouvaria-Walds)
trees_png, grass_png, sea_png = (os.path.join(src, f) for f in ('trees.png', 'grass.png', 'sea_tex.png'))
info = json.load(open(os.path.join(src, 'render.json'), encoding='utf-8'))
ROWS, COLS, S = info['rows'], info['cols'], info['size']
PX = S // 32
os.makedirs(out, exist_ok=True)
W, H = COLS * 32, ROWS * 32

# ── Kacheln: bedeckt? Wasser? ──
cover = np.zeros((H, W), bool)
water = np.zeros((H, W), bool)
sea_px = []
blocks = {}
for key in info['chunks']:
    r, c = map(int, key.split(':'))
    a = np.asarray(Image.open(os.path.join(src, f'chunk_{r}_{c}.png')).convert('RGBA')).astype(np.float32)
    blocks[(r, c)] = a
    t = a.reshape(32, PX, 32, PX, 4).mean(axis=(1, 3))
    cov = t[..., 3] > 128
    wat = cov & (t[..., 2] > t[..., 0] + 25) & (t[..., 2] > t[..., 1] + 5)
    cover[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] = cov
    water[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] = wat
    full = (a[..., 3] > 250).reshape(32, PX, 32, PX).all(axis=(1, 3)) & wat
    if full.any():
        sea_px.append(a.reshape(32, PX, 32, PX, 4).transpose(0, 2, 1, 3, 4)[full][..., :3].reshape(-1, 3)[::37])
# ── Illumina City: leere Pixel im Stadtkreis bekommen Zinkdächer (zählen danach als bedeckt) ──
LUM = info.get('lumiose')
if LUM:
    lcx, lcz, lr = LUM[0] - info['origin'][0], LUM[1] - info['origin'][1], LUM[2]
    yy, xx = np.mgrid[0:S, 0:S]
    roof = np.zeros((S, S, 3), np.float32)
    seam = ((xx + yy // 3) % 7 == 0)                    # Falze der Zinkbahnen
    rng0 = np.random.default_rng(3)
    shade = rng0.normal(0, 3, (S, S))
    roof[..., 0] = 84 + shade; roof[..., 1] = 100 + shade; roof[..., 2] = 124 + shade
    roof[seam] *= 0.78
    for (r, c), a in list(blocks.items()) + [((r, c), None) for r in range(ROWS) for c in range(COLS) if (r, c) not in blocks]:
        ty, tx = (r * 32 + yy / PX), (c * 32 + xx / PX)
        inside = np.hypot(tx - lcx, ty - lcz) <= lr
        if not inside.any():
            continue
        if a is None:
            a = np.zeros((S, S, 4), np.float32)
        m = inside & (a[..., 3] < 250)
        if not m.any():
            continue
        # Kantenpixel: ihr Inhalt (vormultipliziert – leere Unterpixel zählen schwarz) liegt über dem Dach
        al = a[m, 3:4] / 255
        a[m, :3] = roof[m] * (1 - al) + a[m, :3]; a[m, 3] = 255
        blocks[(r, c)] = a
        info['chunks'].setdefault(f'{r}:{c}', {'ground': 0})
        t = a.reshape(32, PX, 32, PX, 4).mean(axis=(1, 3))
        cover[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] = t[..., 3] > 128
    print('Dächer von Illumina City im Kreis', [round(v) for v in (lcx, lcz, lr)])
land = cover & ~water

# ── Kulissen-Kacheln (render-oras.js): nur Kulisse, grün oder dunkel → dürfen bewaldet werden ──
filler = np.zeros((H, W), bool)
for key, ch in info['chunks'].items():
    if not ch.get('filler') or tuple(map(int, key.split(':'))) not in blocks:
        continue
    r, c = map(int, key.split(':'))
    bits = np.unpackbits(np.frombuffer(base64.b64decode(ch['filler']), np.uint8), bitorder='little').reshape(32, 32).astype(bool)
    t = blocks[(r, c)].reshape(32, PX, 32, PX, 4).mean(axis=(1, 3))
    green = (t[..., 1] > t[..., 0] + 12) & (t[..., 1] > t[..., 2] + 4)
    darkish = t[..., :3].max(axis=2) < 55
    filler[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] = bits & (t[..., 3] > 200) & (green | darkish) & ~(t[..., 2] > t[..., 1] + 10)
# große strukturlose Flächen (einfarbig grün oder dunkel, zusammen ≥ 150 Kacheln)
flat = np.zeros((H, W), bool)
for (r, c), a in blocks.items():
    t = a.reshape(32, PX, 32, PX, 4)
    m, sd = t.mean(axis=(1, 3)), t[..., :3].std(axis=(1, 3)).mean(axis=-1)
    green = (m[..., 1] > m[..., 0] + 12) & (m[..., 1] > m[..., 2] + 4)
    flat[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] = (m[..., 3] > 250) & (((sd < 7) & green) | (m[..., :3].max(axis=-1) < 55))

# ── 8 Richtungen: erstes bedecktes Feld (Land = 1, Wasser = 2, nichts = 0), auf 4er-Raster ──
G = 4
cl = np.zeros((H // G, W // G), np.int8)
lc = land.reshape(H // G, G, W // G, G).mean(axis=(1, 3)) > 0.5
wc = water.reshape(H // G, G, W // G, G).mean(axis=(1, 3)) > 0.5
cl[wc] = 2
cl[lc] = 1
gap = ~(cover.reshape(H // G, G, W // G, G).any(axis=(1, 3)))
h, w = cl.shape
votes = np.zeros((h, w), np.int8)
for dy, dx in [(0, 1), (0, -1), (1, 0), (-1, 0), (1, 1), (1, -1), (-1, 1), (-1, -1)]:
    seen = np.zeros((h, w), np.int8)
    # seen[y, x] = erstes bedeckte Feld in Richtung (dy, dx)
    for k in range(1, max(h, w)):
        ys, xs = np.arange(h) + dy * k, np.arange(w) + dx * k
        vy, vx = (ys >= 0) & (ys < h), (xs >= 0) & (xs < w)
        if not vy.any() or not vx.any():
            break
        sub = np.zeros((h, w), np.int8)
        sub[np.ix_(vy, vx)] = cl[np.ix_(ys[vy], xs[vx])]
        take = (seen == 0) & (sub != 0)
        seen[take] = sub[take]
        if not (seen == 0).any():
            break
    votes += (seen == 1)
landgap = gap & (votes >= 6)
# Waldinseln ohne angrenzendes Land weglassen, dann 2 Kacheln in leere Pixel hinein erweitern (keine Meer-Fugen am Rand)
def dilate(m, n):
    m = m.copy()
    for _ in range(n):
        d = m.copy()
        d[1:] |= m[:-1]; d[:-1] |= m[1:]; d[:, 1:] |= m[:, :-1]; d[:, :-1] |= m[:, 1:]
        m = d
    return m
def label(m):
    lab = np.zeros(m.shape, np.int32); n = 0
    for y0, x0 in zip(*np.nonzero(m)):
        if lab[y0, x0]:
            continue
        n += 1; lab[y0, x0] = n; q = deque([(y0, x0)])
        while q:
            y, x = q.popleft()
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < m.shape[0] and 0 <= xx < m.shape[1] and m[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; q.append((yy, xx))
    return lab, n
fl_lab, fl_n = label(flat)
if fl_n:
    sizes = np.bincount(fl_lab.ravel())
    big = sizes >= 150; big[0] = False
    filler |= big[fl_lab]
lab_, nlab = label(landgap)
near_land = dilate(lc, 2)
keep = np.zeros(nlab + 1, bool)
keep[np.unique(lab_[near_land & landgap])] = True
keep[0] = False
landgap = keep[lab_]
# schmale Meeresrinnen und -löcher zwischen den Gebietsgruppen schließen (bis 24 Kacheln breit): sonst gerade
# und schräge Kanäle mitten im Wald
solid = landgap | lc | ~gap
closed = ~dilate(~dilate(solid, 3), 3)
landgap = landgap | (closed & gap)
# Küste des Füllwalds: rund und leicht unregelmäßig statt gerader und schräger Kanten (die Abstimmung über 8 Richtungen
# liefert Achtecke). Wald + Land weichzeichnen, Rauschen dazu, Schwelle – nur in Lücken; direkt am Land bleibt der Wald
def soften(a, rad):
    for ax in (0, 1):
        pad = [(rad + 1, rad) if k == ax else (0, 0) for k in (0, 1)]
        cs = np.cumsum(np.pad(a, pad, mode='edge'), axis=ax, dtype=np.float64)
        a = ((cs[2 * rad + 1:] - cs[:-2 * rad - 1]) if ax == 0 else (cs[:, 2 * rad + 1:] - cs[:, :-2 * rad - 1])) / (2 * rad + 1)
    return a.astype(np.float32)
def noise_field(shape, period, amp, seed):
    rs = np.random.default_rng(seed)
    co = rs.uniform(-amp, amp, (shape[0] // period + 2, shape[1] // period + 2)).astype(np.float32)
    return np.asarray(Image.fromarray(co).resize((co.shape[1] * period, co.shape[0] * period), Image.Resampling.BICUBIC))[:shape[0], :shape[1]]
body = (landgap | lc).astype(np.float32)
soft = soften(soften(body, 2), 2) + noise_field(body.shape, 7, 0.2, 21) + noise_field(body.shape, 3, 0.1, 22)
landgap = (gap & (soft > 0.5)) | (landgap & dilate(lc, 1))
lg = np.kron(landgap, np.ones((G, G), bool))
# auch Kulisse 2 Kacheln weit: sonst bleibt zwischen Render-Rand und Füllwald ein schmaler leerer Streifen (gerade Fuge)
lg = (dilate(lg | filler, 2) & ~cover) | lg | filler
print('Lücken', int(gap.sum()) * G * G, 'Kacheln, davon Wald', int(landgap.sum()) * G * G)

# ── Wasserkanten: gerendertes Wasser endet am Zellraster gerade – neben offenem Meer läuft es über FEATHER Kacheln
#    (leicht wellig) aus, darunter scheint das Kartenmeer durch. Sonst stehen helle Wasserkästen im Meer. ──
FEATHER = 4
open_sea = ~cover & ~lg                      # bleibt nach dem Füllen leer
dist = np.full((H, W), FEATHER + 2, np.float32)
dist[open_sea] = 0
ring = open_sea.copy()
for k in range(1, FEATHER + 2):
    d = ring.copy()
    d[1:] |= ring[:-1]; d[:-1] |= ring[1:]; d[:, 1:] |= ring[:, :-1]; d[:, :-1] |= ring[:, 1:]
    if k % 2 == 0:                           # abwechselnd mit Diagonalen: annähernd runde Abstände
        d[1:, 1:] |= ring[:-1, :-1]; d[:-1, :-1] |= ring[1:, 1:]; d[1:, :-1] |= ring[:-1, 1:]; d[:-1, 1:] |= ring[1:, :-1]
    dist[d & ~ring] = k
    ring = d
rng2 = np.random.default_rng(11)
NZ = 6                                       # Rauschen: ein Wert alle 6 Kacheln, ±1,5 Kacheln
coarse = rng2.uniform(-1.5, 1.5, (H // NZ + 2, W // NZ + 2)).astype(np.float32)
noise = np.asarray(Image.fromarray(coarse, mode='F').resize(((W // NZ + 2) * NZ, (H // NZ + 2) * NZ), Image.Resampling.BILINEAR))[:H, :W]
fade = np.clip((dist - 1 + noise) / FEATHER, 0, 1)
fade[dist >= FEATHER + 2] = 1
def fade_px(r, c):
    # Kachelwerte (mit 1 Kachel Rand) bilinear auf Pixel – weiche statt treppiger Übergänge
    pad = np.pad(fade, 1, mode='edge')[r * 32:(r + 1) * 32 + 2, c * 32:(c + 1) * 32 + 2]
    big = np.asarray(Image.fromarray(pad.astype(np.float32), mode='F').resize((34 * PX, 34 * PX), Image.Resampling.BILINEAR))
    return big[PX:PX + S, PX:PX + S]

# ── Meermuster: chip_sea_b im Ton des Kartenmeeres, 3 Kacheln je Wiederholung ──
sea_rgb = np.array([0.19, 0.44, 0.71]) * 255      # = DEEP in render-oras.js (dort ist das Kulissenmeer genauso gefärbt)
tex = np.asarray(Image.open(sea_png).convert('RGB').resize((3 * PX, 3 * PX), Image.Resampling.LANCZOS)).astype(np.float32)
tex = tex * (sea_rgb / tex.reshape(-1, 3).mean(axis=0))
Image.fromarray(np.clip(tex, 0, 255).astype(np.uint8)).save(os.path.join(out, 'sea.png'))
print('Meerfarbe', sea_rgb.round())

# ── Gras: chip_kusa im Farbton des Füllwaldes, 4 Kacheln je Wiederholung ──
grass = np.asarray(Image.open(grass_png).convert('RGB').resize((4 * PX, 4 * PX), Image.Resampling.LANCZOS)).astype(np.float32)
grass *= np.array([0.62, 0.78, 0.6])      # kusa01 etwas dunkler, wie Waldboden

# ── Bäume: Inseln im Baum-Bild (ohne Gebäudeschatten und Blumenbeete) ──
timg = np.asarray(Image.open(trees_png).convert('RGBA'))
solid = timg[..., 3] > 200
lab = np.zeros(solid.shape, np.int32)
sprites = []
n = 0
for y0 in range(solid.shape[0]):
    for x0 in range(solid.shape[1]):
        if not solid[y0, x0] or lab[y0, x0]:
            continue
        n += 1
        q = deque([(y0, x0)]); lab[y0, x0] = n; pts = []
        while q:
            y, x = q.popleft(); pts.append((y, x))
            for yy, xx in ((y + 1, x), (y - 1, x), (y, x + 1), (y, x - 1)):
                if 0 <= yy < solid.shape[0] and 0 <= xx < solid.shape[1] and solid[yy, xx] and not lab[yy, xx]:
                    lab[yy, xx] = n; q.append((yy, xx))
        ys = [p[0] for p in pts]; xs = [p[1] for p in pts]
        bw, bh = max(xs) - min(xs) + 1, max(ys) - min(ys) + 1
        reg = timg[min(ys):max(ys) + 1, min(xs):max(xs) + 1]
        flowers = ((reg[..., 0] > 170) & (reg[..., 1] > 140) & (reg[..., 2] < 140) & (reg[..., 3] > 200)).mean()
        if flowers < 0.01 and TREE_W[0] <= bw <= TREE_W[1] and TREE_H[0] <= bh <= TREE_H[1] and min(xs) > 8 and min(ys) > 8 and max(xs) < solid.shape[1] - 12 and max(ys) < solid.shape[0] - 16:
            # mit Schatten (weiches Alpha) und etwas Rand
            x1, y1, x2, y2 = min(xs) - 6, min(ys) - 4, max(xs) + 10, max(ys) + 12
            sprites.append((timg[y1:y2, x1:x2].copy(), (min(xs) + max(xs)) // 2 - x1, max(ys) - 6 - y1))
print('Baum-Vorlagen', len(sprites))

if not sprites:
    raise SystemExit('Keine Baum-Vorlagen gefunden – TREE_W/TREE_H prüfen')
rng = np.random.default_rng(7)
# Baumplätze: Raster alle 2,4 Kacheln, leicht verschoben (für alle Blöcke gleich → nahtlos)
STEP = 2.4 * PX
spots = []
for gy in range(int(H * PX / STEP) + 2):
    for gx in range(int(W * PX / STEP) + 2):
        x = (gx + (0.5 if gy % 2 else 0) + rng.uniform(-0.22, 0.22)) * STEP
        y = (gy + rng.uniform(-0.22, 0.22)) * STEP
        tx, ty = int(x // PX), int(y // PX)
        if 0 <= tx < W and 0 <= ty < H and lg[ty, tx]:
            spots.append((y, x, int(rng.integers(len(sprites)))))
spots.sort()
print('Bäume', len(spots))

def fill_block(r, c, a):
    a = a.copy() if a is not None else np.zeros((S, S, 4), np.float32)
    # Kantenpixel (Kantenglättung aus render-xy.js): Farbe vormultipliziert, da leere Unterpixel schwarz zählen
    orig, semi = a.copy(), (a[..., 3] >= 8) & (a[..., 3] < 250)
    a, changed = fill_inner(r, c, a, semi)
    # Kanten im Land: ursprünglicher Inhalt über die Füllung; übrige (vor dem Meer): Farbe für gerades Alpha teilen
    under = semi & (a[..., 3] >= 250)
    al = orig[under, 3:4] / 255
    a[under, :3] = a[under, :3] * (1 - al) + orig[under, :3]
    rest = semi & ~under
    a[rest, :3] = np.minimum(255, orig[rest, :3] * 255 / orig[rest, 3:4])
    # Wasser nahe offenem Meer ausblenden
    if (fade[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] < 1).any():
        # Wasser: türkis bis meerblau (Grün deutlich über Rot) – blaue Dächer am Ufer sind es nicht
        wat = (a[..., 3] > 0) & (a[..., 2] > a[..., 0] + 25) & (a[..., 1] > a[..., 0] + 40) & (a[..., 2] > a[..., 1] - 10)
        if wat.any():
            f = fade_px(r, c)
            a[wat, 3] *= f[wat]
            changed = True
    return a, changed

def fill_inner(r, c, a, semi):
    x0, y0 = c * S, r * S
    m = lg[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32]
    if not m.any():
        return a, False
    empty = (a[..., 3] < 8) | semi
    # Kulisse darf überdeckt werden (Bäume darauf), echter Inhalt nie
    fl = np.kron(filler[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32], np.ones((PX, PX), bool))
    mpx = np.kron(m, np.ones((PX, PX), bool)) & empty
    yy, xx = np.mgrid[y0:y0 + S, x0:x0 + S]
    g = grass[yy % grass.shape[0], xx % grass.shape[1]]
    a[mpx, :3] = g[mpx]; a[mpx, 3] = 255
    empty = empty | fl
    # Bäume (von hinten nach vorn); nur in vorher leere Pixel oder Kulisse
    for (sy, sx, k) in spots:
        spr, ax, ay = sprites[k]
        px0, py0 = int(sx - ax) - x0, int(sy - ay) - y0
        if px0 >= S or py0 >= S or px0 + spr.shape[1] <= 0 or py0 + spr.shape[0] <= 0:
            continue
        ys0, xs0 = max(0, -py0), max(0, -px0)
        ys1, xs1 = min(spr.shape[0], S - py0), min(spr.shape[1], S - px0)
        part = spr[ys0:ys1, xs0:xs1].astype(np.float32)
        dst = a[py0 + ys0:py0 + ys1, px0 + xs0:px0 + xs1]
        ok = empty[py0 + ys0:py0 + ys1, px0 + xs0:px0 + xs1]
        al = (part[..., 3:4] / 255) * ok[..., None]
        dst[..., :3] = dst[..., :3] * (1 - al) + part[..., :3] * al
        dst[..., 3:4] = np.maximum(dst[..., 3:4], al * 255)
    return a, True

chunks = dict(info['chunks'])
for r in range(ROWS):
    for c in range(COLS):
        a = blocks.get((r, c))
        res, changed = fill_block(r, c, a)
        if a is None and not changed:
            continue
        Image.fromarray(np.clip(res, 0, 255).astype(np.uint8)).save(os.path.join(out, f'chunk_{r}_{c}.png'))
        chunks.setdefault(f'{r}:{c}', {'ground': 0})
info['chunks'] = chunks
json.dump(info, open(os.path.join(out, 'render.json'), 'w', encoding='utf-8'))
print('fertig')
