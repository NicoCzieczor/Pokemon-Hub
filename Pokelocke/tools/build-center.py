"""
Pokémon-Center aus Platin für die Szene neben Solo Nuzlocke (Pokelocke/center/), aus pret/pokeplatinum:

  room-l.png / room-r.png    Erdgeschoss eines Pokémon-Centers (Karte map_matrix_116, Gebiet area_data_021 –
                             alle Center teilen sich dieses Modell), gerendert mit Karte/tools/render-platin.js
                             aus Spielkamera und Tageslicht. Links der Teil mit Theke, Heilmaschine und Fernseher,
                             rechts der mit Kasse, PC und Bild; die Mitte liegt hinter der Karte.
  counter.png                Thekenvorderseite über Schwester Joy (derselbe Ausschnitt, liegt über ihrem Sprite)
  esca-l.png / esca-r.png    die beiden Rolltreppen, 4 Bilder nebeneinander (Texturanimation esca_up1/esca_up2)
  pc-on.png                  der PC in den 4 Bildern seines Bildschirms (pc_moni.1–4: aus → an)
  ball.png                   Mini-Pokéball der Heilmaschine, 4 Bilder (pc_mb.1–4: normal, Glanz, Glanz, normal)
  see.png                    „!"-Blase über einer Figur (field_effects/trainer_see.nsbtx)
  nurse.png                  Schwester Joy (field_sprites/npc/pokecenter_nurse.png), 17 Bilder nebeneinander
  lucas.png / lucia.png      Spieler: 16 Laufbilder (oben, unten, links, rechts × 4) + 12 Bilder „Bälle abgeben"
  frame.png                  Fensterrahmen des Spiels (windows/standard_field.png, 3 × 3 Kacheln à 8 px)
  font.png + font.js         Schrift der Textfenster (fonts/font_message.png), nur die Zeichen aus CHARS,
                             nebeneinander; font.js nennt Zeichen und Breiten (window.CenterFont)

Koordinaten in center.js sind Raum-Pixel dieses Renders (1 Kachel = 16 px, x ab der linken Wand, y ab OBEN).

Aufruf (Python 3 mit Pillow, Node 18+):  python build-center.py [cache-ordner]
Dauer: rund eine halbe Minute (fünfmal der Raum).
"""
import json
import os
import re
import shutil
import struct
import subprocess
import sys
import urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
OUT = os.path.join(os.path.dirname(HERE), 'center')
CACHE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), '.platin-center-cache')
REF = 'c6689696d5fb51a644239702cb556eb52012a46a'   # letzter Stand mit dem alten Kartenaufbau (render-platin.js)
RAW = f'https://raw.githubusercontent.com/pret/pokeplatinum/{REF}/'
RENDER = os.path.join(ROOT, 'Karte', 'tools', 'render-platin.js')
KEY = 'map_matrix_116__area_data_021'
TEXSET = os.path.join(CACHE, 'render', 'res_field_props_texture_sets_prop_texture_set_017.nsbtx')

# Ausschnitte im Render (Leinwand-Pixel). Der Raum reicht x 16–256, y 399–593 (darunter die schwarze Wandkante).
X0, Y0, Y1 = 16, 398, 594
LEFT = (16, 160)        # bis über den Fernseher hinaus: das Ende liegt unter der Karte
RIGHT = (152, 260)
ESCA_L = (16, 512, 48, 572)
ESCA_R = (222, 524, 258, 586)
PC = (190, 410, 212, 450)
COUNTER = (100, 455, 152, 484)   # Thekenvorderseite vor Joy

CHARS = (' !"#$%&\'()*+,-./0123456789:;=?ABCDEFGHIJKLMNOPQRSTUVWXYZ_'
         'abcdefghijklmnopqrstuvwxyz…ÄÖÜäöüßéèàâêîôûçÉ♂♀•’“”„«»')

os.makedirs(os.path.join(CACHE, 'render'), exist_ok=True)
os.makedirs(OUT, exist_ok=True)


def fetch(path):
    local = os.path.join(CACHE, path.replace('/', '_'))
    if not os.path.exists(local):
        with urllib.request.urlopen(RAW + path, timeout=60) as r:
            data = r.read()
        with open(local, 'wb') as f:
            f.write(data)
    return local


def save(img, name):
    img.save(os.path.join(OUT, name), optimize=True)
    return os.path.getsize(os.path.join(OUT, name))


# ── NSBTX: Texturen und Paletten finden (wie parseTex0 in render-platin.js) ──
def tex0(buf):
    u16 = lambda o: struct.unpack_from('<H', buf, o)[0]
    u32 = lambda o: struct.unpack_from('<I', buf, o)[0]
    o = next(u32(0x10 + i * 4) for i in range(u16(0x0e)) if buf[u32(0x10 + i * 4):u32(0x10 + i * 4) + 4] == b'TEX0')

    def entries(d, size):
        n, eo = buf[d + 1], d + u16(d + 6)
        unit, names = u16(eo), eo + u16(eo + 2)
        return [(buf[names + i * 16:names + i * 16 + 16].split(b'\0')[0].decode('latin1'), eo + 4 + i * unit) for i in range(n)]

    tex_data, pal_data = o + u32(o + 0x14), o + u32(o + 0x38)
    textures, palettes = {}, {}
    for name, e in entries(o + u16(o + 0x0e), 8):
        p = u32(e)
        fmt, w, h = p >> 26 & 7, 8 << (p >> 20 & 7), 8 << (p >> 23 & 7)
        bits = {1: 8, 2: 2, 3: 4, 4: 8, 6: 8, 7: 16}[fmt]
        # Daten, ihre Länge und die Länge der passenden Palette (4 / 16 / 256 Farben à 2 Byte)
        textures[name] = (tex_data + ((p & 0xffff) << 3), w * h * bits // 8, {2: 8, 3: 32, 4: 512}.get(fmt, 0))
    for name, e in entries(o + u32(o + 0x34), 4):
        palettes[name] = pal_data + (u16(e) << 3)
    return textures, palettes


def patched(frame):
    """Texturset des Centers mit Bild <frame> der Rolltreppen und des PC-Bildschirms an Stelle von Bild 1."""
    buf = bytearray(open(TEXSET + '.orig', 'rb').read())
    tex, pal = tex0(buf)
    for base in ('esca_up1', 'esca_up2', 'pc_moni'):
        (dst, n, pn), (src, _, _) = tex[f'{base}.1'], tex[f'{base}.{frame}']
        buf[dst:dst + n] = buf[src:src + n]
        if f'{base}.1_pl' in pal and f'{base}.{frame}_pl' in pal:
            a, b = pal[f'{base}.1_pl'], pal[f'{base}.{frame}_pl']
            buf[a:a + pn] = buf[b:b + pn]
    open(TEXSET, 'wb').write(buf)


def render(name):
    data = os.path.join(CACHE, 'center.json')
    json.dump({'maps': {'PC1F': {'matrix': 'map_matrix_116', 'areaData': 'area_data_021'}}}, open(data, 'w'))
    out = os.path.join(CACHE, name)
    subprocess.run(['node', RENDER, out, os.path.join(CACHE, 'render'), f'--data={data}', '--interiors-only',
                    '--nocrop', f'--ref={REF}'], check=True, stdout=subprocess.DEVNULL)
    return Image.open(os.path.join(out, f'interior_{KEY}.png')).convert('RGBA')


total = 0
# Raum einmal rendern (lädt dabei alles in den Cache), dann je Bild der Texturanimationen noch einmal
room = render('frame1')
if not os.path.exists(TEXSET + '.orig'):
    shutil.copyfile(TEXSET, TEXSET + '.orig')
frames = [room]
try:
    for k in (2, 3, 4):
        patched(k)
        frames.append(render(f'frame{k}'))
finally:
    shutil.copyfile(TEXSET + '.orig', TEXSET)

total += save(room.crop((LEFT[0], Y0, LEFT[1], Y1)), 'room-l.png')
total += save(room.crop((RIGHT[0], Y0, RIGHT[1], Y1)), 'room-r.png')
total += save(room.crop(COUNTER), 'counter.png')


def strip(images, box):
    w, h = box[2] - box[0], box[3] - box[1]
    s = Image.new('RGBA', (w * len(images), h))
    for i, im in enumerate(images):
        s.paste(im.crop(box), (i * w, 0))
    return s


total += save(strip(frames, ESCA_L), 'esca-l.png')
total += save(strip(frames, ESCA_R), 'esca-r.png')
total += save(strip(frames, PC), 'pc-on.png')

def texture16(buf, tex, pal, name, w=16, h=16):
    """Textur mit 16 Farben (Format 3) samt ihrer Palette <name>_pl als Bild; Farbe 0 = durchsichtig."""
    off = tex[name][0]
    po = pal[name + '_pl']
    rgb = []
    for i in range(16):
        v = struct.unpack_from('<H', buf, po + i * 2)[0] if po + i * 2 + 2 <= len(buf) else 0   # kurze Paletten
        rgb.append(tuple((v >> s & 31) << 3 | (v >> s & 31) >> 2 for s in (0, 5, 10)))
    img = Image.new('RGBA', (w, h))
    for i in range(w * h):
        idx = buf[off + i // 2] >> (i % 2 * 4) & 15
        if idx:
            img.putpixel((i % w, i // w), rgb[idx] + (255,))
    return img


# Mini-Pokéball der Heilmaschine: 16 × 16-Textur, der Ball darin ist 8 × 8 – im Spiel liegt er halb so groß
# auf der Maschine, also jedes zweite Pixel (auf dem Ball zentriert)
buf = open(TEXSET, 'rb').read()
tex, pal = tex0(buf)
balls = Image.new('RGBA', (4 * 5, 5))
for k in range(4):
    full = texture16(buf, tex, pal, f'pc_mb.{k + 1}')
    bb = full.getbbox()
    cx, cy = (bb[0] + bb[2]) // 2, (bb[1] + bb[3]) // 2
    for y in range(5):
        for x in range(5):
            px = full.getpixel((min(15, cx - 4 + x * 2), min(15, cy - 4 + y * 2)))
            if px[3]:
                balls.putpixel((k * 5 + x, y), px)
total += save(balls, 'ball.png')

# „!"-Sprechblase, wenn ein Trainer einen entdeckt (field_effects/trainer_see.nsbtx, Textur sisen_ef)
see = open(fetch('res/graphics/field_effects/trainer_see.nsbtx'), 'rb').read()
tex_s, pal_s = tex0(see)
total += save(texture16(see, tex_s, pal_s, 'sisen_ef'), 'see.png')


# ── Figuren: senkrechte Blätter (32 × 32 je Bild) → waagrecht ──
def row(path, frames=None):
    sheet = Image.open(fetch(path)).convert('RGBA')
    n = sheet.height // 32
    idx = frames if frames is not None else range(n)
    out = Image.new('RGBA', (32 * len(idx), 32))
    for i, f in enumerate(idx):
        out.paste(sheet.crop((0, f * 32, 32, f * 32 + 32)), (i * 32, 0))
    return out


total += save(row('res/graphics/field_sprites/npc/pokecenter_nurse.png'), 'nurse.png')
for who, g in (('lucas', 'm'), ('lucia', 'f')):
    walk = row(f'res/graphics/field_sprites/player/player_{g}.png', range(16))
    heal = row(f'res/graphics/field_sprites/player/player_{g}_pokecenter_heal.png')
    both = Image.new('RGBA', (walk.width + heal.width, 32))
    both.paste(walk, (0, 0))
    both.paste(heal, (walk.width, 0))
    total += save(both, f'{who}.png')

frame = Image.open(fetch('res/graphics/windows/standard_field.png'))
frame.info['transparency'] = 0   # Farbe 0 (Grün) ist im Spiel durchsichtig
total += save(frame.convert('RGBA'), 'frame.png')

# ── Schrift: Zeichen → Code (charmap.txt), Glyph = Code − 1 im 16 × 16-Raster von font_message.png ──
cmap = {}
for line in open(fetch('tools/msgenc/charmap.txt'), encoding='utf-8'):
    m = re.match(r'^\s*([0-9A-F]{4})=(.)$', line.rstrip('\n'))
    if m:
        cmap.setdefault(m.group(2), int(m.group(1), 16))
cmap[' '] = 0x01DE
cmap['\''] = cmap['’']
widths = json.load(open(fetch('res/fonts/font_message.json')))['glyphWidths']
glyphs = Image.open(fetch('res/fonts/font_message.png'))
missing = [c for c in CHARS if c not in cmap]
if missing:
    print('Nicht in der Schrift:', ''.join(missing))
    CHARS = ''.join(c for c in CHARS if c in cmap)
font = Image.new('RGBA', (16 * len(CHARS), 16))
metrics = {}
for i, ch in enumerate(CHARS):
    g = cmap[ch] - 1
    cell = glyphs.crop((g % 16 * 16, g // 16 * 16, g % 16 * 16 + 16, g // 16 * 16 + 16))
    for y in range(16):
        for x in range(16):
            v = cell.getpixel((x, y))
            if v in (1, 2):   # 1 = Schrift, 2 = Schatten
                font.putpixel((i * 16 + x, y), (56, 56, 56, 255) if v == 1 else (216, 216, 216, 255))
    metrics[ch] = widths[g]
total += save(font, 'font.png')

# Breiten der Zeichen für center.js (Glyph i liegt bei x = 16 · i in font.png)
js = ('// Erzeugt von tools/build-center.py: Zeichen von font.png (je 16 px breit) und ihre Breite im Spiel\n'
      'window.CenterFont = { chars: ' + json.dumps(CHARS, ensure_ascii=False) +
      ', widths: [' + ','.join(str(metrics[c]) for c in CHARS) + '] };\n')
open(os.path.join(OUT, 'font.js'), 'w', encoding='utf-8', newline='\n').write(js)
total += len(js.encode('utf-8'))
print(f'{OUT}: {total // 1024} KB')
