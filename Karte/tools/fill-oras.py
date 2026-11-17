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
# ── Brücken (render.json „bridges“): Die Runde Route 118 → 119 → Baumhausen → … → 123 schließt sich im Spiel nicht; die
# Karte lässt den Rest zwischen Route 118 und 119 klaffen (render-oras.js). Beide Routen zeigen ihren Weg noch ein Stück
# als Kulisse – dazwischen bliebe Füllwald. In den Spalten des Übergangs wird der Weg fortgesetzt: vier Kachelzeilen von
# knapp über der Lücke, wiederholt bis zur anderen Seite ──
def tiles_get(xa, za, xb, zb):
    res = np.zeros(((zb - za) * PX, (xb - xa) * PX, 4), np.uint8)
    for r in range(za // 32, (zb - 1) // 32 + 1):
        for c in range(xa // 32, (xb - 1) // 32 + 1):
            a = blocks.get((r, c))
            if a is None:
                continue
            y0, y1, x0, x1 = max(za, r * 32), min(zb, (r + 1) * 32), max(xa, c * 32), min(xb, (c + 1) * 32)
            res[(y0 - za) * PX:(y1 - za) * PX, (x0 - xa) * PX:(x1 - xa) * PX] = a[(y0 - r * 32) * PX:(y1 - r * 32) * PX, (x0 - c * 32) * PX:(x1 - c * 32) * PX]
    return res
def tiles_put(xa, za, img):
    zb, xb = za + img.shape[0] // PX, xa + img.shape[1] // PX
    for r in range(za // 32, (zb - 1) // 32 + 1):
        for c in range(xa // 32, (xb - 1) // 32 + 1):
            if not (0 <= r < ROWS and 0 <= c < COLS):
                continue
            a = blocks.get((r, c))
            if a is None:
                a = blocks[(r, c)] = np.zeros((S, S, 4), np.uint8)
            y0, y1, x0, x1 = max(za, r * 32), min(zb, (r + 1) * 32), max(xa, c * 32), min(xb, (c + 1) * 32)
            a[(y0 - r * 32) * PX:(y1 - r * 32) * PX, (x0 - c * 32) * PX:(x1 - c * 32) * PX] = img[(y0 - za) * PX:(y1 - za) * PX, (x0 - xa) * PX:(x1 - xa) * PX]
for bx0, bx1, bz0, bz1 in info.get('bridges', []):
    za, zb = max(0, bz0 - 12), min(H, bz1 + 12)
    reg = tiles_get(bx0, za, bx1, zb)
    solid = (reg[..., 3] > 128).reshape(zb - za, PX, bx1 - bx0, PX).mean(axis=(1, 2, 3))
    gap_rows = [i for i in range(bz0 - za, bz1 - za) if solid[i] < 0.5]
    if not gap_rows or gap_rows[0] < 6:
        continue
    top, bot = gap_rows[0], gap_rows[-1] + 1
    band = reg[(top - 6) * PX:(top - 2) * PX].copy()
    if (band[..., 3] > 128).mean() < 0.98:
        continue                                   # über der Lücke liegt kein geschlossener Weg
    for i in range(top - 1, min(bot + 1, zb - za)):
        row = reg[i * PX:(i + 1) * PX]
        srow = band[((i - top) % 4) * PX:((i - top) % 4 + 1) * PX]
        hole = row[..., 3] < 128
        row[hole] = srow[hole]
    tiles_put(bx0, za, reg)
    cover[za + top - 1:za + bot + 1, bx0:bx1] = True
    print('Brücke', bx0, bx1, 'Zeilen', za + top, 'bis', za + bot)
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
# kleine Waldstücke, die überwiegend ans Meer grenzen (ein Bart aus Kulisse unter der Klippe südlich von Moosbach, ein
# Inselchen neben dem Liga-Gebäude): ebenfalls weg – samt ihrer Kulisse
comp_m = (landgap | fill_g) & ~lc & ~drop
labc, nc = label(comp_m)
if nc:
    land_touch = np.zeros(nc + 1); sea_touch = np.zeros(nc + 1)
    size = np.bincount(labc.ravel(), minlength=nc + 1)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb_l, nb_c = np.roll(lc, (dy, dx), (0, 1)), np.roll(comp_m, (dy, dx), (0, 1))
        np.add.at(land_touch, labc[comp_m & nb_l], 1)
        np.add.at(sea_touch, labc[comp_m & ~nb_l & ~nb_c], 1)
    small = (size * G * G < 1500) & (land_touch < 0.6 * (land_touch + sea_touch))
    small[0] = False
    drop |= small[labc]
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
# nur am Rand des Füllwalds selbst (bis 8 Kacheln): an geraden Küsten des Gerenderten steht der weichgezeichnete Wert genau
# auf der Schwelle – dort ließ das Rauschen sonst Waldflecken ins Meer wachsen (nördlich des Liga-Gebäudes)
landgap = (gap & (soft > 0.5) & dilate(landgap, 2)) | (landgap & dilate(lc, 1))
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
# Angeschnittene Kacheln am Rand des Gerenderten (teils leer oder halb deckend), rundum von Land oder Füllwald umgeben:
# auch dort Waldgras darunter – sonst schimmert an der Kante ein blauer Strich (das Meer hinter der Karte) durch
part = np.zeros((H, W), bool)
for (r, c), a in blocks.items():
    al = (a[..., 3] > 250).reshape(32, PX, 32, PX).mean(axis=(1, 3))
    part[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] = (al > 0) & (al < 0.999)
sol = land | lg
enc = sol.copy()
enc[1:] &= sol[:-1]; enc[:-1] &= sol[1:]; enc[:, 1:] &= sol[:, :-1]; enc[:, :-1] &= sol[:, 1:]
lg |= part & ~water & ~bgsea & enc
print('Lücken', int(gap.sum()) * G * G, 'Kacheln, davon Wald', int(landgap.sum()) * G * G)

# ── Rasen an Gebietsgrenzen angleichen (owner.png aus render-oras.js) ──
# Jedes Gebiet tönt seinen Rasen selbst: hell, wo man laufen kann, dunkel am Rand und in Städten wie Baumhausen. Wo zwei
# Gebiete aneinanderstoßen, stand deshalb eine gerade Kante zwischen hellem und dunklem Grün. Beiderseits der Grenze wird
# die Helligkeit des Rasens über 8 Kacheln aufeinander zu geführt (je zur Hälfte); Bäume, Wege, Häuser bleiben, wie sie sind.
own_png = os.path.join(src, 'owner.png')
if os.path.exists(own_png):
    om = np.array(Image.open(own_png).convert('RGBA'))
    oid = np.where(om[..., 3] > 0, om[..., 0].astype(np.int32) + om[..., 1].astype(np.int32) * 256, -1)[:H, :W]
    def lawn_of(f):
        return (f[..., 3] > 250) & (f[..., 1] > f[..., 0] + 25) & (f[..., 2] < 0.62 * f[..., 1]) & (f[..., 1] > 60)
    ell = np.full((H, W), np.nan, np.float32)             # log der mittleren Helligkeit des Rasens je Kachel
    for (r, c), a in blocks.items():
        f = a.astype(np.float32)
        lw = lawn_of(f)
        cnt = lw.reshape(32, PX, 32, PX).sum(axis=(1, 3))
        sm = (f[..., 1] * lw).reshape(32, PX, 32, PX).sum(axis=(1, 3))
        okt = cnt > 0.5 * PX * PX
        e = np.full((32, 32), np.nan, np.float32)
        e[okt] = np.log(sm[okt] / cnt[okt])
        ell[r * 32:(r + 1) * 32, c * 32:(c + 1) * 32] = e
    fin = np.isfinite(ell) & (oid >= 0)
    ell0 = np.where(fin, ell, 0).astype(np.float32)
    # je Gebiet über 5 × 5 Kacheln gemittelt (einzelne Blumen- und Schattenkacheln sollen die Stufe nicht bestimmen)
    ell_s = np.zeros((H, W), np.float32)
    for o in np.unique(oid[fin]):
        mk = (fin & (oid == o)).astype(np.float32)
        den = box(mk, 2)
        ell_s = np.where(mk > 0, box(ell0 * mk, 2) / np.maximum(den, 1e-6), ell_s)
    # Stufe an der Grenze: Nachbar minus eigene Kachel, nur Rasen gegen Rasen
    dsum = np.zeros((H, W), np.float32); dn = np.zeros((H, W), np.float32)
    for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
        nb_o, nb_f, nb_e = np.roll(oid, (dy, dx), (0, 1)), np.roll(fin, (dy, dx), (0, 1)), np.roll(ell_s, (dy, dx), (0, 1))
        hit = fin & nb_f & (nb_o != oid)
        dsum += np.where(hit, nb_e - ell_s, 0); dn += hit
    DMAX = 8
    delta = np.where(dn > 0, dsum / np.maximum(dn, 1), 0).astype(np.float32)
    dist = np.where(dn > 0, 0, -1).astype(np.int32)
    for d in range(1, DMAX + 1):                          # ins eigene Gebiet hinein weitertragen (Mittel der Nachbarn)
        acc = np.zeros((H, W), np.float32); n = np.zeros((H, W), np.float32)
        for dy, dx in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nb_d, nb_o, nb_v = np.roll(dist, (dy, dx), (0, 1)), np.roll(oid, (dy, dx), (0, 1)), np.roll(delta, (dy, dx), (0, 1))
            take = (dist < 0) & (nb_d == d - 1) & (nb_o == oid) & (oid >= 0)
            acc += np.where(take, nb_v, 0); n += take
        new = n > 0
        delta[new] = acc[new] / n[new]; dist[new] = d
    delta = np.clip(delta, -1.0, 1.0)
    gam = np.where((dist >= 0) & (np.abs(delta) > 0.06), 0.5 * delta * (1 - dist / DMAX), 0).astype(np.float32)   # an der Grenze treffen sich beide Seiten
    act = gam != 0
    changed = 0
    for (r, c), a in blocks.items():
        y0, x0 = r * 32, c * 32
        if not act[y0:y0 + 32, x0:x0 + 32].any():
            continue
        # je Gebiet für sich hochrechnen (über die Grenze hinweg gemittelt höbe sich die Angleichung dort gerade auf)
        ya, yb, xa, xb = max(0, y0 - 1), min(H, y0 + 33), max(0, x0 - 1), min(W, x0 + 33)
        g_t, o_t, a_t = gam[ya:yb, xa:xb], oid[ya:yb, xa:xb], act[ya:yb, xa:xb]
        gpx = np.zeros((S, S), np.float32)
        opx = np.kron(oid[y0:y0 + 32, x0:x0 + 32], np.ones((PX, PX), np.int32))
        for o in np.unique(o_t[a_t]):
            mk = ((o_t == o) & (dist[ya:yb, xa:xb] >= 0)).astype(np.float32)
            size = (mk.shape[1] * PX, mk.shape[0] * PX)
            num = np.asarray(Image.fromarray(g_t * mk).resize(size, Image.Resampling.BILINEAR))
            den = np.asarray(Image.fromarray(mk).resize(size, Image.Resampling.BILINEAR))
            oy, ox = (y0 - ya) * PX, (x0 - xa) * PX
            num, den = num[oy:oy + S, ox:ox + S], den[oy:oy + S, ox:ox + S]
            sel = (opx == o) & (den > 0.05)
            gpx[sel] = num[sel] / den[sel]
        f = a.astype(np.float32)
        # angewandt auch auf die Schatten im Rasen (dunkler als die Rasen-Schwelle), nicht auf das blaugrüne Laub der Bäume
        lw = (f[..., 3] > 250) & (f[..., 1] > f[..., 0] + 15) & (f[..., 2] < 0.72 * f[..., 1]) & (gpx != 0)
        if lw.any():
            f[..., :3] = np.where(lw[..., None], np.clip(f[..., :3] * np.exp(gpx)[..., None], 0, 255), f[..., :3])
            a[...] = (f + 0.5).astype(np.uint8)
            changed += 1
    print('Rasen angeglichen in', changed, 'Blöcken')

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
