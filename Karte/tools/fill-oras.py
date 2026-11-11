"""
Füllt die Lücken der gerenderten Hoenn-Karte (render-oras.js), bevor make-tiles.py daraus die Kartenblätter baut.

Hoenn besteht im Spiel aus vielen einzelnen Gebieten; dazwischen ist im Bild nichts. Land-Lücken (in mindestens 6
von 8 Richtungen liegt Land) bekommen Wald aus dem Spiel – ebenso grüne oder dunkle Kulisse (Kacheln ohne eigenes
Gebiet, render.json „filler“) und große strukturlose Flächen (ab 150 Kacheln am Stück einfarbig grün oder dunkel – die
Platzhalter, die die Gebiete statt ihrer Nachbarn zeigen, etwa wo der Blütenburgwald liegt): Gras-Textur chip_kusa im Farbton des Füllwaldes und Bäume,
freigestellt aus einem gerenderten Block (trees.png). Waldinseln ohne angrenzendes Land fallen weg. Wasser-Lücken
bleiben frei – dort zeichnet die Karte das Meermuster (sea.png: chip_sea_b, 3 Kacheln je Wiederholung, im mittleren
Ton wie das Kulissenmeer in render-oras.js; make-tiles.py übernimmt es). Das Waldgras liegt unter dem Gerenderten (halb
deckende Ränder mischen sich mit ihm); die Bäume stehen ganz obenauf oder gar nicht – ihre Kronen dürfen über Grünes und
Leeres hinausragen, nie über Wege, Häuser, Fels oder Wasser.

Offenes Meer (Masken sea_<Zeile>_<Spalte>.png aus render-oras.js): seine Deckkraft wird weichgezeichnet, damit das helle
Routen-Meer ohne Zacken und gerade Kanten ins Kartenmeer ausläuft. Kulissenmeer zählt als Lücke und wird nur in ganz von
Land umschlossenen Buchten zu Wald. Schmale Rinnen im Wald werden geschlossen, schmale Waldzungen im Meer entfernt, und
die Küste des Füllwalds ist leicht unregelmäßig statt gerade.

Aufruf (Python 3 + Pillow + numpy):  python fill-oras.py <render-ordner> <ausgabe-ordner>
Danach:                              python make-tiles.py <ausgabe-ordner> ../tiles-oras
"""
import base64, json, os, sys
from collections import deque
import numpy as np
from PIL import Image

src, out = sys.argv[1:3]
trees_png, grass_png, sea_png = (os.path.join(src, f) for f in ('trees.png', 'grass.png', 'sea_tex.png'))
info = json.load(open(os.path.join(src, 'render.json'), encoding='utf-8'))
ROWS, COLS, S = info['rows'], info['cols'], info['size']
PX = S // 32
os.makedirs(out, exist_ok=True)
W, H = COLS * 32, ROWS * 32

# ── Kacheln: bedeckt? Wasser? ──
cover = np.zeros((H, W), bool)
water = np.zeros((H, W), bool)
bgsea = np.zeros((H, W), bool)          # Kulissenmeer: zählt als Lücke, wird aber nur in engen Buchten zu Wald
blocks, seas, own = {}, {}, {}
for key in info['chunks']:
    r, c = map(int, key.split(':'))
    a = np.array(Image.open(os.path.join(src, f'chunk_{r}_{c}.png')).convert('RGBA'))
    blocks[(r, c)] = a
    # offenes Meer (render-oras.js: sea_<Zeile>_<Spalte>.png) – auch wo es durchsichtig ist (dort zeigt die Karte ihr Meermuster)
    sp = os.path.join(src, f'sea_{r}_{c}.png')
    sea_t = np.zeros((32, 32), np.float32)
    if os.path.exists(sp):
        m2 = np.array(Image.open(sp).convert('RGB'))
        seas[(r, c)] = np.minimum(255, m2[..., 0].astype(np.uint16) + m2[..., 1]).astype(np.uint8)   # jedes Meer (zum Glätten)
        own[(r, c)] = m2[..., 0]                                                                       # eigenes Meer einer Route
        sea_t = own[(r, c)].reshape(32, PX, 32, PX).mean(axis=(1, 3)) / 255
        bgsea[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] = m2[..., 1].reshape(32, PX, 32, PX).mean(axis=(1, 3)) > 127
    t = a.reshape(32, PX, 32, PX, 4).mean(axis=(1, 3))
    cov = t[..., 3] > 128
    wat = (cov & (t[..., 2] > t[..., 0] + 25) & (t[..., 2] > t[..., 1] + 5)) | (sea_t > 0.5)
    cover[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] = cov | (sea_t > 0.5)
    water[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] = wat
land = cover & ~water

# ── Offenes Meer glätten: Das Spiel blendet sein helles Routen-Meer über grobe Dreiecke ins tiefe Meer aus – als
# Deckkraft ergäbe das Zacken. Deckkraft der Meer-Pixel auf 1/4 Kachel mitteln, weichzeichnen (nur über Meer gemittelt,
# Land zählt nicht) und den Unterschied auf die Pixel übertragen (Schaum und Wellen darüber bleiben) ──
Q = 4                                   # Pixel je Rasterfeld
hq, wq = H * PX // Q, W * PX // Q
A4 = np.zeros((hq, wq), np.float32); M4 = np.zeros((hq, wq), np.float32)
E4 = np.ones((hq, wq), np.float32)      # nichts gerendert: zählt beim Glätten als durchsichtiges Meer – das Routen-Meer
n = S // Q                              # läuft dorthin weich aus statt an einer geraden Kante zu enden
for (r, c), a in blocks.items():
    mf = seas[(r, c)].astype(np.float32) / 255 if (r, c) in seas else np.zeros((S, S), np.float32)
    af = a[..., 3].astype(np.float32) / 255
    A4[r * n:(r + 1) * n, c * n:(c + 1) * n] = (af * mf).reshape(n, Q, n, Q).mean(axis=(1, 3))
    M4[r * n:(r + 1) * n, c * n:(c + 1) * n] = mf.reshape(n, Q, n, Q).mean(axis=(1, 3))
    E4[r * n:(r + 1) * n, c * n:(c + 1) * n] = ((af < 0.5) & (mf < 0.5)).reshape(n, Q, n, Q).mean(axis=(1, 3))
def box(a, rad):
    for ax in (0, 1):
        pad = [(rad + 1, rad) if k == ax else (0, 0) for k in (0, 1)]
        cs = np.cumsum(np.pad(a, pad, mode='edge'), axis=ax, dtype=np.float64)
        a = ((cs[2 * rad + 1:] - cs[:-2 * rad - 1]) if ax == 0 else (cs[:, 2 * rad + 1:] - cs[:, :-2 * rad - 1])) / (2 * rad + 1)
    return a.astype(np.float32)
def blur(a, rad):
    return box(box(box(a, rad), rad), rad)
RAD = 9                                 # ≈ 2,4 Kacheln Unschärfe
bm = blur(M4 + E4, RAD)
soft = np.where(bm > 1e-4, blur(A4, RAD) / np.maximum(bm, 1e-4), 0)
hard = np.where(M4 > 1e-4, A4 / np.maximum(M4, 1e-4), 0)
delta = np.pad(np.clip(soft, 0, 1) - np.clip(hard, 0, 1), 1, mode='edge').astype(np.float32)
for (r, c), m in seas.items():
    d = delta[r * n:(r + 1) * n + 2, c * n:(c + 1) * n + 2]
    up = np.asarray(Image.fromarray(d).resize(((n + 2) * Q, (n + 2) * Q), Image.Resampling.BILINEAR))[Q:-Q, Q:-Q]
    a = blocks[(r, c)]
    al = a[..., 3].astype(np.float32) / 255 + (m.astype(np.float32) / 255) * up
    a[..., 3] = np.clip(al * 255 + 0.5, 0, 255).astype(np.uint8)
del A4, M4, E4, bm, soft, hard, delta

# ── Kulissen-Kacheln (render-oras.js): nur Kulisse, grün oder dunkel → dürfen bewaldet werden ──
filler = np.zeros((H, W), bool)
for key, ch in info['chunks'].items():
    if not ch.get('filler') or tuple(map(int, key.split(':'))) not in blocks:
        continue
    r, c = map(int, key.split(':'))
    bits = np.unpackbits(np.frombuffer(base64.b64decode(ch['filler']), np.uint8), bitorder='little').reshape(32, 32).astype(bool)
    t = blocks[(r, c)].reshape(32, PX, 32, PX, 4).mean(axis=(1, 3))
    if (r, c) in own:
        bits &= own[(r, c)].reshape(32, PX, 32, PX).mean(axis=(1, 3)) < 64   # das Meer einer Route ist nie Wald
    green = (t[..., 1] > t[..., 0] + 12) & (t[..., 1] > t[..., 2] + 4)
    darkish = t[..., :3].max(axis=2) < 55
    filler[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] = bits & (t[..., 3] > 200) & (green | darkish) & ~(t[..., 2] > t[..., 1] + 10)
# große strukturlose Flächen (einfarbig grün oder dunkel, zusammen ≥ 150 Kacheln)
flat = np.zeros((H, W), bool)
for (r, c), a in blocks.items():
    t = a.reshape(32, PX, 32, PX, 4).astype(np.float32)
    m, sd = t.mean(axis=(1, 3)), t[..., :3].std(axis=(1, 3)).mean(axis=-1)
    # Platzhalter sind dunkelgrün (um 9/104/43); der Rasen der Routen ist ähnlich glatt, aber hell (Grün ab 150) – auf
    # ihm wuchs sonst kachelweise Wald mit halben Bäumen (Route 123, 118, 120 …)
    green = (m[..., 1] > m[..., 0] + 12) & (m[..., 1] > m[..., 2] + 4) & (m[..., 1] < 138) & (m[..., 0] < 20) & (m[..., 2] < 0.5 * m[..., 1])
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
landgap = gap & (votes >= np.where(bgsea.reshape(H // G, G, W // G, G).mean(axis=(1, 3)) > 0.5, 8, 6))
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
# schmale Rinnen und Löcher zwischen Land schließen (bis 24 Kacheln breit) – sonst gerade Kanäle mitten im Wald
solid = landgap | lc
landgap = landgap | (~dilate(~dilate(solid, 3), 3) & gap)
# schmale Waldzungen ins Meer (Kulissenreste, unter 16 Kacheln breit) wieder wegnehmen – samt ihrer Kulisse
fill_g = filler.reshape(H // G, G, W // G, G).mean(axis=(1, 3)) > 0.5
body = landgap | lc | fill_g
opened = dilate(~dilate(~body, 2), 2)
drop = (landgap | fill_g) & ~opened & ~lc
landgap &= ~drop
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
drop_t = np.kron(drop, np.ones((G, G), bool)) & filler
filler &= ~drop_t
lg = np.kron(landgap, np.ones((G, G), bool))
lg = (dilate(lg, 2) & ~cover) | lg | filler
# Kachelgenau nacharbeiten, wo gar nichts gerendert ist (auch kein Kulissenmeer):
#  · schmale Fugen zwischen Land (bis 4 Kacheln – die Gebiete liegen nie ganz bündig aneinander, dazwischen stand ein
#    blauer Strich im Wald) und
#  · kleine, ganz von Land umschlossene Löcher (bis 300 Kacheln: Aufbauten, die nicht im Kartenmodell stecken, etwa das
#    Alte Grabmal auf Route 120, und offene Stellen der Bergkulisse des Pyrobergs) werden Wald statt Meer
empty = ~cover & ~bgsea & ~lg
solid_t = land | lg
seam = ~dilate(~dilate(solid_t, 2), 2) & empty
lab_e, n_e = label(empty & ~seam)
holes = np.zeros((H, W), bool)
if n_e:
    sizes = np.bincount(lab_e.ravel(), minlength=n_e + 1)
    ys, xs = np.nonzero(lab_e)
    order = np.argsort(lab_e[ys, xs], kind='stable')
    ys, xs = ys[order], xs[order]
    starts = np.concatenate(([0], np.cumsum(sizes[1:])))
    for k in range(1, n_e + 1):
        if sizes[k] > 300:
            continue
        cy, cx = ys[starts[k - 1]:starts[k]], xs[starts[k - 1]:starts[k]]
        y0, y1, x0, x1 = cy.min() - 1, cy.max() + 2, cx.min() - 1, cx.max() + 2
        if y0 < 0 or x0 < 0 or y1 > H or x1 > W:
            continue
        comp = np.zeros((y1 - y0, x1 - x0), bool); comp[cy - y0, cx - x0] = True
        ring = dilate(comp, 1) & ~comp
        if (ring & ~(solid_t | seam)[y0:y1, x0:x1]).sum() == 0:
            holes[cy, cx] = True
print('Fugen', int(seam.sum()), 'Kacheln, Löcher', int(holes.sum()))
lg |= dilate(seam | holes, 1)       # eine Kachel weiter: das Waldgras liegt unter dem Gerenderten und füllt dort nur dessen Lücken
print('Lücken', int(gap.sum()) * G * G, 'Kacheln, davon Wald', int(landgap.sum()) * G * G)

# ── Meermuster: chip_sea_b im Ton des Kartenmeeres, 3 Kacheln je Wiederholung ──
sea_rgb = np.array([0.19, 0.44, 0.71]) * 255      # = DEEP in render-oras.js (dort ist das Kulissenmeer genauso gefärbt)
tex = np.asarray(Image.open(sea_png).convert('RGB').resize((3 * PX, 3 * PX), Image.Resampling.LANCZOS)).astype(np.float32)
tex = tex * (sea_rgb / tex.reshape(-1, 3).mean(axis=0))
Image.fromarray(np.clip(tex, 0, 255).astype(np.uint8)).save(os.path.join(out, 'sea.png'))
print('Meerfarbe', sea_rgb.round())

# ── Gras: chip_kusa im Farbton des Füllwaldes, 4 Kacheln je Wiederholung ──
grass = np.asarray(Image.open(grass_png).convert('RGB').resize((4 * PX, 4 * PX), Image.Resampling.LANCZOS)).astype(np.float32)
grass *= np.array([0.36, 0.61, 0.52]) * 0.92

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
        if flowers < 0.01 and 34 <= bw <= 60 and 44 <= bh <= 80 and min(xs) > 8 and min(ys) > 8 and max(xs) < solid.shape[1] - 12 and max(ys) < solid.shape[0] - 16:
            # mit Schatten (weiches Alpha) und etwas Rand
            x1, y1, x2, y2 = min(xs) - 6, min(ys) - 4, max(xs) + 10, max(ys) + 12
            sprites.append((timg[y1:y2, x1:x2].copy(), (min(xs) + max(xs)) // 2 - x1, max(ys) - 6 - y1))
print('Baum-Vorlagen', len(sprites))

rng = np.random.default_rng(7)
# Baumplätze: Raster alle 2,4 Kacheln, leicht verschoben (für alle Blöcke gleich → nahtlos)
STEP = 2.4 * PX
spots = []
for gy in range(int(H * PX / STEP) + 2):
    for gx in range(int(W * PX / STEP) + 2):
        x = (gx + (0.5 if gy % 2 else 0) + rng.uniform(-0.22, 0.22)) * STEP
        y = (gy + rng.uniform(-0.22, 0.22)) * STEP
        tx, ty = int(x // PX), int(y // PX)
        k = int(rng.integers(len(sprites)))            # immer ziehen: der Wald bleibt gleich, wenn sich anderswo die Maske ändert
        if 0 <= tx < W and 0 <= ty < H and lg[ty, tx]:
            spots.append((y, x, k))
spots.sort()
# Jeder Baum steht ganz da oder gar nicht: Früher endete er an der Kachelgrenze des Füllwalds (halbe Kronen, gerade
# abgeschnitten). Jetzt liegt er vollständig obenauf – über Leerem, Grünem und Kulisse darf seine Krone hinausragen, wie
# die Bäume des Spiels auch; träfe er anderes (Wege, Häuser, Fels, Wasser), entfällt er.
def region(y0, y1, x0, x1):
    res = np.zeros((y1 - y0, x1 - x0, 4), np.uint8)
    for r in range(y0 // S, (y1 - 1) // S + 1):
        for c in range(x0 // S, (x1 - 1) // S + 1):
            a = blocks.get((r, c))
            if a is None:
                continue
            ya, yb, xa, xb = max(y0, r * S), min(y1, (r + 1) * S), max(x0, c * S), min(x1, (c + 1) * S)
            res[ya - y0:yb - y0, xa - x0:xb - x0] = a[ya - r * S:yb - r * S, xa - c * S:xb - c * S]
    return res
kept = []
for (sy, sx, k) in spots:
    spr, ax, ay = sprites[k]
    py0, px0 = int(sy - ay), int(sx - ax)
    ya, yb, xa, xb = max(0, py0), min(H * PX, py0 + spr.shape[0]), max(0, px0), min(W * PX, px0 + spr.shape[1])
    if ya >= yb or xa >= xb:
        continue
    op = spr[ya - py0:yb - py0, xa - px0:xb - px0, 3] > 128
    reg = region(ya, yb, xa, xb).astype(np.int16)
    yy, xx = np.mgrid[ya:yb, xa:xb]
    green = (reg[..., 1] > reg[..., 0] + 8) & (reg[..., 1] > reg[..., 2])
    bad = op & (reg[..., 3] > 128) & ~green & ~filler[yy // PX, xx // PX]
    if bad.sum() <= 0.04 * op.sum():
        kept.append((sy, sx, k))
print('Bäume', len(kept), 'von', len(spots), 'Plätzen')
spots = kept

# Bäume je Blockzeile (ein Baum reicht höchstens einen Block weit nach oben oder unten)
tree_rows = {}
for sp in spots:
    for r in {int((sp[0] - 100) // S), int(sp[0] // S), int((sp[0] + 20) // S)}:
        tree_rows.setdefault(r, []).append(sp)

def grass_under(a, r, c, m, x0, y0):
    # Das Waldgras liegt unter dem Gerenderten: Ränder (halb deckend) mischen sich mit ihm statt mit dem Meer dahinter.
    # Im offenen Meer wächst nichts
    sea = own[(r, c)].astype(np.float32) / 255 if (r, c) in own else np.zeros((S, S), np.float32)
    mpx = np.kron(m, np.ones((PX, PX), np.float32)) * (1 - sea)
    oa = a[..., 3:4] / 255
    # schwarze Platzhalter (Kulisse, fast schwarz): das Waldgras ersetzt sie, statt zwischen den Bäumen durchzuscheinen
    fl = np.kron(filler[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32], np.ones((PX, PX), bool))
    oa = np.where((fl & (a[..., :3].max(axis=2) < 60))[..., None], 0, oa)
    yy, xx = np.mgrid[y0:y0 + S, x0:x0 + S]
    g = grass[yy % grass.shape[0], xx % grass.shape[1]]
    ga = mpx[..., None] * (1 - oa)                     # so viel Gras scheint durch
    out_a = oa + ga
    a[..., :3] = np.where(out_a > 0, (a[..., :3] * oa + g * ga) / np.maximum(out_a, 1e-6), a[..., :3])
    a[..., 3:4] = out_a * 255
    return a

def fill_block(r, c, a):
    a = a.astype(np.float32) if a is not None else np.zeros((S, S, 4), np.float32)
    x0, y0 = c * S, r * S
    m = lg[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32]
    dt = drop_t[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32]
    if dt.any():                                       # Kulisse einer weggenommenen Waldzunge: durchsichtig
        a[np.kron(dt, np.ones((PX, PX), bool)), 3] = 0
    hit = bool(dt.any())
    if m.any():
        hit = True
        a = grass_under(a, r, c, m, x0, y0)
    # Bäume (von hinten nach vorn) – auch in Blöcken ohne Füllwald, in die eine Krone hineinragt
    for (sy, sx, k) in tree_rows.get(r, ()):
        spr, ax, ay = sprites[k]
        px0, py0 = int(sx - ax) - x0, int(sy - ay) - y0
        if px0 >= S or py0 >= S or px0 + spr.shape[1] <= 0 or py0 + spr.shape[0] <= 0:
            continue
        ys0, xs0 = max(0, -py0), max(0, -px0)
        ys1, xs1 = min(spr.shape[0], S - py0), min(spr.shape[1], S - px0)
        part = spr[ys0:ys1, xs0:xs1].astype(np.float32)
        dst = a[py0 + ys0:py0 + ys1, px0 + xs0:px0 + xs1]
        al = part[..., 3:4] / 255
        da = dst[..., 3:4] / 255
        oa2 = al + da * (1 - al)                        # über Leerem: Farbe nicht mit dem leeren Schwarz mischen
        dst[..., :3] = np.where(oa2 > 0, (part[..., :3] * al + dst[..., :3] * da * (1 - al)) / np.maximum(oa2, 1e-6), dst[..., :3])
        dst[..., 3:4] = oa2 * 255
        hit = True
    return a, hit

chunks = dict(info['chunks'])
for f in os.listdir(out):                              # Blätter eines früheren Laufs
    if f.startswith('chunk_') and f.endswith('.png'):
        os.remove(os.path.join(out, f))
for r in range(ROWS):
    for c in range(COLS):
        a = blocks.get((r, c))
        res, changed = fill_block(r, c, a)
        if a is None and not changed:
            continue
        if not (res[..., 3] > 0).any():
            chunks.pop(f'{r}:{c}', None)             # nur durchsichtiges Meer: kein Blatt nötig
            continue
        Image.fromarray(np.clip(res, 0, 255).astype(np.uint8)).save(os.path.join(out, f'chunk_{r}_{c}.png'))
        chunks.setdefault(f'{r}:{c}', {'ground': 0})
info['chunks'] = chunks
json.dump(info, open(os.path.join(out, 'render.json'), 'w', encoding='utf-8'))
print('fertig')
