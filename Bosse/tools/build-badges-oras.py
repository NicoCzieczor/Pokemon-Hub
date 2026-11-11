"""
Ordenkoffer von Omega Rubin / Alpha Saphir für den Boss-Planer (Bosse/sprites/), aus der eigenen ROM gelesen:

  case-oras.png             der geöffnete Koffer wie auf dem unteren Bildschirm (Layout tranercase_lower.bclyt), ohne
                            Deckel und ohne Orden, mit den acht Mulden; doppelte Auflösung (840 × 460 für 420 × 230)
  badge-<name>.png          die acht Orden (badge_01 … badge_08.bclim): Stein, Knöchel, Dynamo, Hitze, Balance, Feder,
                            Mental, Schauer
  badge-<name>-dull.png     dieselben angestaubt (ohne Spielstand), wie bei den Platin-Orden

Herkunft: RomFS a/1/0/9, Datei 0 (GARC) = Namensliste + darc mit Layouts (BCLYT) und Texturen (BCLIM). Der Koffer
wird wie im Spiel aus dem Layout zusammengesetzt: Bildebenen (pic1) und Fensterebenen (wnd1, ein Rahmenteil, das an
den vier Ecken gespiegelt wird; die Kanten strecken seine Randspalte). Weggelassen werden der Deckel (n, 14, 17, 1a),
der Bildschirmhintergrund (i), eine Markierung (w) und die Orden selbst (die legt boss.js einzeln in die Mulden).
Am Ende stehen die Werte für boss.js (BADGES.oras: Lage der Orden [x, y, Breite, Höhe] in Koffer-Koordinaten).

Aufruf (Python 3 mit Pillow und numpy):  python build-badges-oras.py "<Pfad>/Omega Ruby.3ds"
(entschlüsselte .3ds/.cci oder .cxi wie für Citra; Alpha Saphir geht genauso)
"""
import math
import os
import struct
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'sprites')
NAMES = ['stone', 'knuckle', 'dynamo', 'heat', 'balance', 'feather', 'mind', 'rain']
SKIP = {'n', '14', '17', '1a', 'i', 'w'}
# Koffer = äußeres Fenster q (420 × 230 um 0 / 26, Layout-Koordinaten mit y nach oben)
BOX = (-210, 141, 210, -89)
SCALE = 2      # Auflösung des Koffer-Bilds
SS = 4         # Überabtastung beim Zeichnen


def u16(b, o): return struct.unpack_from('<H', b, o)[0]
def u32(b, o): return struct.unpack_from('<I', b, o)[0]


# ── RomFS: eine Datei der ROM lesen ──
def romfs_file(path, want):
    f = open(path, 'rb')
    def read(at, n):
        f.seek(at)
        return f.read(n)
    h = read(0, 0x200)
    base = 0
    if h[0x100:0x104] == b'NCSD':
        base = u32(h, 0x120) * 0x200
        h = read(base, 0x200)
    if h[0x100:0x104] != b'NCCH':
        raise SystemExit('keine 3DS-ROM (NCSD/NCCH)')
    if not h[0x18F] & 4:
        raise SystemExit('ROM ist verschlüsselt – bitte die entschlüsselte Fassung (wie für Citra) nehmen')
    romfs = base + u32(h, 0x1B0) * 0x200
    iv = read(romfs, 0x60)
    if iv[:4] != b'IVFC':
        raise SystemExit('RomFS nicht gefunden')
    bs = 1 << u32(iv, 0x4C)
    l3 = romfs + -(-(0x60 + u32(iv, 8)) // bs) * bs
    hd = read(l3, 0x28)
    dmeta, fmeta = read(l3 + u32(hd, 0x0C), u32(hd, 0x10)), read(l3 + u32(hd, 0x1C), u32(hd, 0x20))
    data = l3 + u32(hd, 0x24)
    name = lambda b, o, n: b[o:o + n].decode('utf-16-le')
    d = 0
    *dirs, fname = want.split('/')
    for part in dirs:
        c = u32(dmeta, d + 8)
        while c != 0xFFFFFFFF and name(dmeta, c + 24, u32(dmeta, c + 20)) != part:
            c = u32(dmeta, c + 4)
        if c == 0xFFFFFFFF:
            raise SystemExit('Ordner fehlt in der ROM: ' + want)
        d = c
    fo = u32(dmeta, d + 12)
    while fo != 0xFFFFFFFF:
        if name(fmeta, fo + 32, u32(fmeta, fo + 28)) == fname:
            return read(data + struct.unpack_from('<Q', fmeta, fo + 8)[0], struct.unpack_from('<Q', fmeta, fo + 16)[0])
        fo = u32(fmeta, fo + 4)
    raise SystemExit('Datei fehlt in der ROM: ' + want)


def lz11(b):
    size, i = b[1] | b[2] << 8 | b[3] << 16, 4
    if not size:
        size, i = u32(b, 4), 8
    out = bytearray()
    while len(out) < size:
        flags = b[i]; i += 1
        for bit in range(8):
            if len(out) >= size:
                break
            if not flags & (0x80 >> bit):
                out.append(b[i]); i += 1
                continue
            ind = b[i] >> 4
            if ind == 0:
                n, disp, i = ((b[i] & 15) << 4 | b[i + 1] >> 4) + 0x11, ((b[i + 1] & 15) << 8 | b[i + 2]) + 1, i + 3
            elif ind == 1:
                n, disp, i = ((b[i] & 15) << 12 | b[i + 1] << 4 | b[i + 2] >> 4) + 0x111, ((b[i + 2] & 15) << 8 | b[i + 3]) + 1, i + 4
            else:
                n, disp, i = ind + 1, ((b[i] & 15) << 8 | b[i + 1]) + 1, i + 2
            for _ in range(n):
                out.append(out[-disp])
    return bytes(out)


def garc_first(b):
    if b[:4] != b'CRAG':
        raise SystemExit('kein GARC')
    o, data = u32(b, 4), u32(b, 0x10)
    fatb = o + u32(b, o + 4)
    e = fatb + 12 + u32(b, o + 12)
    f = b[data + u32(b, e + 4):data + u32(b, e + 8)]
    return lz11(f) if f[0] == 0x11 else f


def darc(b):
    b = b[b.index(b'darc'):]
    t = u32(b, 0x10)
    n = u32(b, t + 8)
    names = t + n * 12
    files = {}
    for i in range(n):
        e = t + i * 12
        no = u32(b, e)
        if no >> 24 & 1:
            continue
        s = names + (no & 0xFFFFFF)
        end = s
        while u16(b, end):
            end += 2
        files[b[s:end].decode('utf-16-le')] = b[u32(b, e + 4):u32(b, e + 4) + u32(b, e + 8)]
    return files


# ── BCLIM: 3DS-Texturen (RGBA8, ETC1, ETC1A4), 8 × 8-Kacheln in Z-Ordnung, Bild steht auf dem Kopf ──
ETC_MOD = [[2, 8, -2, -8], [5, 17, -5, -17], [9, 29, -9, -29], [13, 42, -13, -42],
           [18, 60, -18, -60], [24, 80, -24, -80], [33, 106, -33, -106], [47, 183, -47, -183]]


def etc1(hi, lo):
    flip = hi & 1
    t1, t2 = hi >> 5 & 7, hi >> 2 & 7
    if hi & 2:
        r1, g1, b1 = hi >> 27 & 31, hi >> 19 & 31, hi >> 11 & 31
        d = [(hi >> s & 7) - (8 if hi >> s & 4 else 0) for s in (24, 16, 8)]
        c1 = [c << 3 | c >> 2 for c in (r1, g1, b1)]
        c2 = [(c & 31) << 3 | (c & 31) >> 2 for c in (r1 + d[0], g1 + d[1], b1 + d[2])]
    else:
        c1 = [(hi >> s & 15) * 17 for s in (28, 20, 12)]
        c2 = [(hi >> s & 15) * 17 for s in (24, 16, 8)]
    out = [None] * 16
    for x in range(4):
        for y in range(4):
            k = x * 4 + y
            base, t = (c2, t2) if (y >= 2 if flip else x >= 2) else (c1, t1)
            m = ETC_MOD[t][(lo >> k & 1) | (lo >> (k + 16) & 1) << 1]
            out[y * 4 + x] = tuple(min(255, max(0, c + m)) for c in base)
    return out


def bclim(b):
    c = len(b) - 0x28
    if b[c:c + 4] != b'CLIM':
        raise SystemExit('kein BCLIM')
    w, h, fmt = struct.unpack_from('<HHI', b, c + 0x1C)
    pw, ph = max(8, 1 << (w - 1).bit_length()), max(8, 1 << (h - 1).bit_length())
    img = Image.new('RGBA', (pw, ph))
    px = img.load()
    p = 0
    for ty in range(0, ph, 8):
        for tx in range(0, pw, 8):
            if fmt == 9:
                for i in range(64):
                    x = (i & 1) | (i >> 1 & 2) | (i >> 2 & 4)
                    y = (i >> 1 & 1) | (i >> 2 & 2) | (i >> 3 & 4)
                    px[tx + x, ty + y] = (b[p + 3], b[p + 2], b[p + 1], b[p])
                    p += 4
            elif fmt in (10, 11):
                for by, bx in ((0, 0), (0, 4), (4, 0), (4, 4)):
                    alpha = None
                    if fmt == 11:
                        alpha = struct.unpack_from('<Q', b, p)[0]; p += 8
                    v = struct.unpack_from('<Q', b, p)[0]; p += 8
                    cols = etc1(v >> 32, v & 0xFFFFFFFF)
                    for yy in range(4):
                        for xx in range(4):
                            a = 255 if alpha is None else (alpha >> ((xx * 4 + yy) * 4) & 15) * 17
                            px[tx + bx + xx, ty + by + yy] = cols[yy * 4 + xx] + (a,)
            else:
                raise SystemExit('BCLIM-Format %d nicht unterstützt' % fmt)
    return img.transpose(Image.FLIP_TOP_BOTTOM).crop((0, 0, w, h))


# ── BCLYT: Texturen, Materialien, Ebenen-Baum ──
def cstr(b):
    return b.split(b'\0', 1)[0].decode('latin1')


def bclyt(b):
    if b[:4] != b'CLYT':
        raise SystemExit('kein BCLYT')
    p, L, stack, last = u16(b, 6), {'tex': [], 'mat': [], 'root': None}, [], None
    for _ in range(u32(b, 0x10)):
        mg, size = b[p:p + 4], u32(b, p + 4)
        s = b[p:p + size]
        if mg == b'txl1':
            n = u32(s, 8)
            L['tex'] = [cstr(s[12 + o:]) for o in struct.unpack_from('<%dI' % n, s, 12)]
        elif mg == b'mat1':
            n = u32(s, 8)
            offs = struct.unpack_from('<%dI' % n, s, 12)
            for o in offs:
                m = s[o:]
                flags = u32(m, 48)
                maps = [struct.unpack_from('<HBB', m, 52 + i * 4) for i in range(flags & 3)]
                q = 52 + len(maps) * 4
                mtx = [struct.unpack_from('<5f', m, q + i * 20) for i in range(flags >> 2 & 3)]
                L['mat'].append({'cols': [tuple(m[20 + i * 4:24 + i * 4]) for i in range(2)], 'maps': maps, 'mtx': mtx})
        elif mg in (b'pan1', b'pic1', b'wnd1', b'txt1', b'bnd1', b'prt1'):
            tx, ty, _, _, _, _, sx, sy, w, h = struct.unpack_from('<10f', s, 36)
            pane = {'kind': mg.decode(), 'name': cstr(s[12:28]), 'vis': s[8] & 1, 'inh': s[8] >> 1 & 1, 'origin': s[9],
                    'alpha': s[10], 't': (tx, ty), 's': (sx, sy), 'size': (w, h), 'kids': []}
            q = 0x4C
            if mg == b'pic1':
                pane['vc'] = [tuple(s[q + i * 4:q + i * 4 + 4]) for i in range(4)]
                pane['mat'] = u16(s, q + 16)
            elif mg == b'wnd1':
                pane['infl'] = struct.unpack_from('<4f', s, q)
                co, fo = struct.unpack_from('<II', s, q + 20)
                pane['vc'] = [tuple(s[co + i * 4:co + i * 4 + 4]) for i in range(4)]
                pane['mat'] = u16(s, co + 16)
                pane['frames'] = [u16(s, u32(s, fo + i * 4)) for i in range(s[q + 16])]
            (stack[-1]['kids'] if stack else []).append(pane)
            if not stack:
                L['root'] = pane
            last = pane
        elif mg == b'pas1':
            stack.append(last)
        elif mg == b'pae1':
            stack.pop()
        p += size
    return L


# ── Zeichnen (numpy, Layout-Koordinaten: Mitte des Bildschirms = 0, y nach oben) ──
def sample(tex, u, v, wrap):
    h, w = tex.shape[:2]
    def fix(c, n, mode):
        if mode == 1:
            c = c % 1.0
        elif mode == 2:
            c = c % 2.0
            c = np.where(c > 1, 2 - c, c)
        return np.clip(c * n - 0.5, 0, n - 1)
    x, y = fix(u, w, wrap[0]), fix(v, h, wrap[1])
    x0, y0 = np.floor(x).astype(int), np.floor(y).astype(int)
    x1, y1 = np.minimum(x0 + 1, w - 1), np.minimum(y0 + 1, h - 1)
    fx, fy = (x - x0)[..., None], (y - y0)[..., None]
    return (tex[y0, x0] * (1 - fx) * (1 - fy) + tex[y0, x1] * fx * (1 - fy) +
            tex[y1, x0] * (1 - fx) * fy + tex[y1, x1] * fx * fy)


class Canvas:
    def __init__(self, box, k):
        self.l, self.t = box[0], box[1]
        self.k = k
        self.w, self.h = int((box[2] - box[0]) * k), int((box[1] - box[3]) * k)
        self.img = np.zeros((self.h, self.w, 4), np.float32)

    def quad(self, x0, y0, x1, y1, shade):
        """Rechteck; shade(s, t) → RGBA, s/t = 0..1 von (x0, y0) nach (x1, y1)"""
        L, R, T, B = min(x0, x1), max(x0, x1), max(y0, y1), min(y0, y1)
        px0, px1 = (L - self.l) * self.k, (R - self.l) * self.k
        py0, py1 = (self.t - T) * self.k, (self.t - B) * self.k
        ix0, ix1 = max(0, math.floor(px0)), min(self.w, math.ceil(px1))
        iy0, iy1 = max(0, math.floor(py0)), min(self.h, math.ceil(py1))
        if ix1 <= ix0 or iy1 <= iy0:
            return
        s, t = np.meshgrid((np.arange(ix0, ix1) + 0.5 - px0) / (px1 - px0), (np.arange(iy0, iy1) + 0.5 - py0) / (py1 - py0))
        inside = ((s >= 0) & (s <= 1) & (t >= 0) & (t <= 1))[..., None]
        if x1 < x0:
            s = 1 - s
        if y1 > y0:
            t = 1 - t
        c = shade(s, t)
        a = c[..., 3:4] * inside
        dst = self.img[iy0:iy1, ix0:ix1]
        out = a + dst[..., 3:4] * (1 - a)
        dst[..., :3] = (c[..., :3] * a + dst[..., :3] * dst[..., 3:4] * (1 - a)) / np.maximum(out, 1e-6)
        dst[..., 3:4] = out


def draw(L, tex, cv, p, at=(0, 0, 1, 1), alpha=1.0):
    if not p['vis'] or p['name'] in SKIP:
        return
    x, y = at[0] + p['t'][0] * at[2], at[1] + p['t'][1] * at[3]
    sx, sy = at[2] * p['s'][0], at[3] * p['s'][1]
    a = alpha * p['alpha'] / 255
    w, h = p['size']
    # Ursprung 0–8: oben links … unten rechts
    l, t = -w / 2 * (p['origin'] % 3), h / 2 * (p['origin'] // 3)
    r, b = l + w, t - h
    X, Y = (lambda v: x + v * sx), (lambda v: y + v * sy)

    def shade(mi, vc, fu, fv):
        M = L['mat'][mi]
        black, white = [np.array(c, np.float32) / 255 for c in M['cols']]
        cs = [np.array(c, np.float32) / 255 for c in vc]
        def f(s, t):
            if M['maps']:
                i, ws, wt = M['maps'][0]
                u, v = fu(s, t), fv(s, t)
                if M['mtx']:
                    tx, ty, _, msx, msy = M['mtx'][0]
                    u, v = (u - 0.5) * msx + 0.5 + tx, (v - 0.5) * msy + 0.5 + ty
                c = sample(tex[L['tex'][i]], u, v, (ws & 3, wt & 3))
                c = black + (white - black) * c
            else:
                c = np.broadcast_to(white, s.shape + (4,)).copy()
            S, T = s[..., None], t[..., None]
            c = c * ((cs[0] * (1 - S) + cs[1] * S) * (1 - T) + (cs[2] * (1 - S) + cs[3] * S) * T)
            c[..., 3] *= a
            return c
        return f

    if p['kind'] == 'pic1':
        cv.quad(X(l), Y(t), X(r), Y(b), shade(p['mat'], p['vc'], lambda s, t: s, lambda s, t: t))
    elif p['kind'] == 'wnd1':
        fm = p['frames'][0]
        th, tw = tex[L['tex'][L['mat'][fm]['maps'][0][0]]].shape[:2]
        il, ir, it, ib = p['infl']
        cv.quad(X(l + tw - il), Y(t - th + it), X(r - tw + ir), Y(b + th - ib), shade(p['mat'], p['vc'], lambda s, t: s, lambda s, t: t))
        # Rahmen: vier Streifen wie ein Windrad; die Rahmentextur wird senkrecht gespiegelt abgetastet
        white = [(255, 255, 255, 255)] * 4
        fu, fv = (w - tw) / tw, (h - th) / th
        cv.quad(X(l), Y(t), X(r - tw), Y(t - th), shade(fm, white, lambda s, t: s * fu, lambda s, t: 1 - t))
        cv.quad(X(r - tw), Y(t), X(r), Y(b + th), shade(fm, white, lambda s, t: 1 - s, lambda s, t: 1 - t * fv))
        cv.quad(X(l + tw), Y(b + th), X(r), Y(b), shade(fm, white, lambda s, t: (1 - s) * fu, lambda s, t: t))
        cv.quad(X(l), Y(t - th), X(l + tw), Y(b), shade(fm, white, lambda s, t: s, lambda s, t: 1 - (1 - t) * fv))
    for k in p['kids']:
        draw(L, tex, cv, k, (x, y, sx, sy), a if p['inh'] else alpha)


def dull(img):
    """Angestaubt: entsättigt, dunkler und ins Bräunliche – wie die Platin-Orden ohne Spielstand."""
    a = np.asarray(img, np.float32)
    l = a[..., 0] * 0.3 + a[..., 1] * 0.59 + a[..., 2] * 0.11
    out = a.copy()
    for i, add in enumerate((30, 26, 18)):
        out[..., i] = l * 0.55 + a[..., i] * 0.15 + add
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), 'RGBA')


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    files = darc(garc_first(romfs_file(sys.argv[1], 'a/1/0/9')))
    if 'tranercase_lower.bclyt' not in files:
        raise SystemExit('a/1/0/9 enthält keinen Ordenkoffer – ist das Omega Rubin / Alpha Saphir?')
    L = bclyt(files['tranercase_lower.bclyt'])
    tex = {n: np.asarray(bclim(files[n]), np.float32) / 255 for n in L['tex']}
    os.makedirs(OUT, exist_ok=True)

    # Koffer ohne Deckel und Orden, überabgetastet und verkleinert
    pics = {}
    def find(p):
        maps = L['mat'][p['mat']]['maps'] if p['kind'] == 'pic1' else []
        name = L['tex'][maps[0][0]] if maps else ''
        if name.startswith('badge_0') and not name.endswith('_base.bclim'):
            pics[name] = p
            SKIP.add(p['name'])
        for k in p['kids']:
            find(k)
    find(L['root'])
    cv = Canvas(BOX, SCALE * SS)
    draw(L, tex, cv, L['root'])
    case = Image.fromarray((np.clip(cv.img, 0, 1) * 255 + 0.5).astype(np.uint8), 'RGBA')
    case = case.resize((cv.w // SS, cv.h // SS), Image.LANCZOS)
    case.save(os.path.join(OUT, 'case-oras.png'), optimize=True)
    total = os.path.getsize(os.path.join(OUT, 'case-oras.png'))

    # Orden: Bild aus der ROM, Lage aus dem Layout (Mitte, Ursprung 4) in Koffer-Koordinaten
    places = []
    for k, name in enumerate(NAMES):
        p = pics['badge_%02d.bclim' % (k + 1)]
        img = bclim(files['badge_%02d.bclim' % (k + 1)])
        for im, suffix in ((img, ''), (dull(img), '-dull')):
            im.save(os.path.join(OUT, 'badge-%s%s.png' % (name, suffix)), optimize=True)
            total += os.path.getsize(os.path.join(OUT, 'badge-%s%s.png' % (name, suffix)))
        w, h = p['size'][0] * p['s'][0], p['size'][1] * p['s'][1]
        places.append([round(p['t'][0] - BOX[0] - w / 2, 1), round(BOX[1] - p['t'][1] - h / 2, 1), round(w, 1), round(h, 1)])

    print('Koffer %d × %d (Bild %d × %d), 8 Orden blank und angestaubt – zusammen %d KB in %s' % (
        BOX[2] - BOX[0], BOX[1] - BOX[3], case.width, case.height, total // 1024, OUT))
    print('Orden [x, y, w, h]:', places)


if __name__ == '__main__':
    main()
