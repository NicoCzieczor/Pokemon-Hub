"""
Begleiter-Pokémon für die Pokémon-Center-Szene (Pokelocke/followers/), alle im Stil von HeartGold/SoulSilver:

  <Nr>.png        die Laufbilder eines Pokémon (Nr. = National-Dex 1–1025), 8 Bilder nebeneinander:
                  unten ×2, oben ×2, links ×2, rechts ×2 – je 32 × 32 (große Pokémon 64 × 64)
  <Nr>-f.png      die weibliche Form, wo HGSS eine eigene hat (Pikachu, Hippoterus, …)
  <Nr>-<k>.png    HGSS-Form k (1, 2, …): Icognito, Deoxys, Burmy, Rotom, Giratina, Arceus …
  <name>.png      andere Formen unter ihrem PokeAPI-Namen (raichu-alola, tauros-paldea-combat-breed, charizard-mega-x …)
  index.js        window.CenterFollowers = { big, female, forms: { Nr.: Anzahl }, max: höchste Nr., named: [name …] }
  CREDITS.md      wer die Bilder ab Nr. 494 gezeichnet hat

Nr. 1–493: die Originale aus HeartGold/SoulSilver (pret/pokeheartgold). Ab Nr. 494 und für Formen, die es in HGSS
nicht gibt, hat Nintendo nie Begleiter gezeichnet – dafür die Fan-Sprites im HGSS-Stil aus Pokémon Essentials
(github.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX, Graphics/Characters/Followers; Künstler in
CREDITS.md). Dort liegen sie doppelt groß als 4 × 4-Blatt (Reihen unten, links, rechts, oben; Bild 0 und 2 sind die
beiden Laufbilder, 1 und 3 dieselben 1 px tiefer) – hier auf Originalgröße und ins selbe Format gebracht.

HGSS-Quelle: files/data/mmodel/mmodel/mmodel_<n>.NSBTX (8 Texturen „tsure_poke.*" in der Reihenfolge oben ×2, unten ×2,
links ×2, rechts ×2; Palette tsure_poke0 = normal, tsure_poke1 = schillernd). Welche Datei zu welcher Art gehört:
src/follow_mon.c (sModelIndexLUT je Art, sFemaleFlagLUT, sFormMaxLUT) – die Begleiter beginnen bei mmodel 297
(include/constants/mmodel.h, MMODEL_FOLLOWER_MON_BULBASAUR).

Aufruf (Python 3 mit Pillow):  python build-followers.py [cache-ordner]
Dauer: rund 4 Minuten beim ersten Mal (566 HGSS-Dateien, rund 750 Essentials-Blätter), danach aus dem Cache.
"""
import json
import os
import re
import struct
import sys
import unicodedata
import urllib.request
from concurrent.futures import ThreadPoolExecutor
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(os.path.dirname(HERE), 'followers')
CACHE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), '.hgss-follower-cache')
REF = 'e1d5a4606640e31c44d36714ad0b5cdd9c8763fd'   # pokeheartgold, Stand 1. 11. 2026
RAW = f'https://raw.githubusercontent.com/pret/pokeheartgold/{REF}/'
ESS_REPO = 'Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX'
ESS_REF = 'ebf87d8d2402457e7413577d6b98ab4595d044d3'   # Stand 17. 2. 2025
ESS_RAW = f'https://raw.githubusercontent.com/{ESS_REPO}/{ESS_REF}/'
NAMES = os.path.join(os.path.dirname(os.path.dirname(HERE)), 'pokemon-names.js')
LAST = 1025
FIRST = 297          # MMODEL_FOLLOWER_MON_BULBASAUR
SPECIES = 493
ORDER = [2, 3, 0, 1, 4, 5, 6, 7]   # Texturen oben ×2, unten ×2, links ×2, rechts ×2 → unten, oben, links, rechts

os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)


def fetch(path, base=RAW):
    local = os.path.join(CACHE, path.replace('/', '_').replace(' ', '_'))
    if not os.path.exists(local):
        for attempt in range(4):
            try:
                with urllib.request.urlopen(base + urllib.request.quote(path), timeout=60) as r:
                    data = r.read()
                break
            except Exception:
                if attempt == 3:
                    raise
        with open(local, 'wb') as f:
            f.write(data)
    return local


def lut(src, name):
    body = re.search(r'static const u16 ' + name + r'\[\] = \{(.*?)\};', src, re.S).group(1)
    return [re.sub(r'//.*', '', l).strip().rstrip(',') for l in body.split('\n') if re.sub(r'//.*', '', l).strip()]


src = open(fetch('src/follow_mon.c'), encoding='utf-8').read()
idx_h = open(fetch('include/constants/follow_mon_idx.h'), encoding='utf-8').read()
index_of = {m.group(1): int(m.group(2)) for m in re.finditer(r'#define (FOLLOWER_MON_\w+)\s+(\d+)', idx_h)}
model = [index_of[n] for n in lut(src, 'sModelIndexLUT')]          # Index = Art (0 = keine)
female = [n == 'TRUE' for n in lut(src, 'sFemaleFlagLUT')]          # Index = Art − 1
forms = [int(n) for n in lut(src, 'sFormMaxLUT')]                   # Index = Art − 1
assert len(model) >= SPECIES + 1 and len(female) >= SPECIES and len(forms) >= SPECIES


def decode(path):
    """NSBTX → Liste der 8 Bilder (RGBA, normale Palette) in Texturreihenfolge."""
    buf = open(path, 'rb').read()
    u16 = lambda o: struct.unpack_from('<H', buf, o)[0]
    u32 = lambda o: struct.unpack_from('<I', buf, o)[0]
    o = next(u32(0x10 + i * 4) for i in range(u16(0x0e)) if buf[u32(0x10 + i * 4):u32(0x10 + i * 4) + 4] == b'TEX0')

    def entries(d):
        n, eo = buf[d + 1], d + u16(d + 6)
        unit, names = u16(eo), eo + u16(eo + 2)
        return [(buf[names + i * 16:names + i * 16 + 16].split(b'\0')[0].decode('latin1'), eo + 4 + i * unit) for i in range(n)]

    tex_data, pal_data = o + u32(o + 0x14), o + u32(o + 0x38)
    pals = {name: pal_data + (u16(e) << 3) for name, e in entries(o + u32(o + 0x34))}
    po = pals.get('tsure_poke0', min(pals.values()))
    colors = []
    for i in range(16):
        v = u16(po + i * 2)
        colors.append(tuple(((v >> s & 31) << 3 | (v >> s & 31) >> 2) for s in (0, 5, 10)) + (255,))
    frames = []
    for name, e in entries(o + u16(o + 0x0e)):
        p = u32(e)
        fmt, w, h = p >> 26 & 7, 8 << (p >> 20 & 7), 8 << (p >> 23 & 7)
        if fmt != 3:
            raise SystemExit(f'{path}: {name} hat Format {fmt}, erwartet 16 Farben')
        off = tex_data + ((p & 0xffff) << 3)
        im = Image.new('RGBA', (w, h))
        px = im.load()
        for i in range(w * h):
            c = buf[off + i // 2] >> (i % 2 * 4) & 15
            if c:
                px[i % w, i // w] = colors[c]
        frames.append(im)
    if len(frames) != 8:
        raise SystemExit(f'{path}: {len(frames)} Texturen, erwartet 8')
    return frames


def sheet(n):
    frames = decode(fetch(f'files/data/mmodel/mmodel/mmodel_{n:08d}.NSBTX'))
    s = frames[0].width
    out = Image.new('RGBA', (s * 8, s))
    for k, f in enumerate(ORDER):
        out.paste(frames[f], (k * s, 0))
    return out, s


def indexed(img):
    """Zurück auf die Spielpalette (≤ 15 Farben, Index 0 durchsichtig) – kleinere Dateien, gleiche Pixel."""
    colors = sorted({c for c in img.getdata() if c[3]})
    pal = [(0, 0, 0)] + [c[:3] for c in colors]
    out = Image.new('P', img.size, 0)
    out.putpalette([v for c in pal for v in c])
    lookup = {c: i + 1 for i, c in enumerate(colors)}
    out.putdata([lookup.get(c, 0) if c[3] else 0 for c in img.getdata()])
    return out


jobs = []   # (Dateiname, mmodel-Nummer)
for sp in range(1, SPECIES + 1):
    base = FIRST + model[sp]
    jobs.append((f'{sp}', base))
    if female[sp - 1]:
        jobs.append((f'{sp}-f', base + 1))
    for k in range(1, forms[sp - 1] + 1):
        jobs.append((f'{sp}-{k}', base + k))

with ThreadPoolExecutor(8) as pool:
    list(pool.map(lambda j: fetch(f'files/data/mmodel/mmodel/mmodel_{j[1]:08d}.NSBTX'), jobs))

def save_png(img, path):
    """Mit Palette, wenn das Bild nur volle Deckkraft und ≤ 255 Farben hat (alle HGSS-Bilder), sonst RGBA."""
    alphas = {c[3] for c in img.getdata()}
    if alphas <= {0, 255} and len({c for c in img.getdata() if c[3]}) <= 255:
        indexed(img).save(path, optimize=True, transparency=0)
    else:
        img.save(path, optimize=True)
    return os.path.getsize(path)


big, total = [], 0
for name, n in jobs:
    img, size = sheet(n)
    if size > 32 and '-' not in name:
        big.append(int(name))
    total += save_png(img, os.path.join(OUT, name + '.png'))

# ── Ab Nr. 494 und Formen, die HGSS nicht hat: Fan-Sprites im HGSS-Stil aus Pokémon Essentials ──
names_js = open(NAMES, encoding='utf-8').read()
EN = json.loads(re.search(r'^\s*en: (\[.*\]),?\s*$', names_js, re.M).group(1))
POKE_FORMS = json.loads(re.search(r'^\s*forms: (\{.*\}),?\s*$', names_js, re.M).group(1))
HGSS_FORMS = {'giratina-origin', 'shaymin-sky', 'deoxys-attack', 'deoxys-defense', 'deoxys-speed', 'wormadam-sandy',
              'wormadam-trash', 'rotom-heat', 'rotom-wash', 'rotom-frost', 'rotom-fan', 'rotom-mow'}   # wie FORMS in center.js


def ess_name(name):
    """Interner Name in Essentials: 'Flabébé' → FLABEBE, 'Type: Null' → TYPENULL, 'Kommo-o' → KOMMOO."""
    s = ''.join(c for c in unicodedata.normalize('NFD', name) if unicodedata.category(c) != 'Mn')
    return re.sub(r'[^A-Za-z0-9]', '', s).upper()


tree_file = os.path.join(CACHE, 'essentials-tree.json')
if not os.path.exists(tree_file):
    url = f'https://api.github.com/repos/{ESS_REPO}/git/trees/{ESS_REF}?recursive=1'
    with urllib.request.urlopen(url, timeout=120) as r:
        open(tree_file, 'wb').write(r.read())
ESS = {p['path'].split('/')[-1][:-4] for p in json.load(open(tree_file))['tree']
       if p['path'].startswith('Graphics/Characters/Followers/') and p['path'].endswith('.png')}
ess_forms = {}   # (NAME, Nr.) → Formname
for m in re.finditer(r'^\[(\w+),(\d+)\]\s*\nFormName = (.+)$', open(fetch('PBS/pokemon_forms.txt', ESS_RAW), encoding='utf-8-sig').read(), re.M):
    ess_forms[(m.group(1), int(m.group(2)))] = m.group(3).strip()


def ess_sheet(name):
    """4 × 4-Blatt (doppelt groß; Reihen unten, links, rechts, oben) → 8 Bilder unten, oben, links, rechts."""
    src = Image.open(fetch(f'Graphics/Characters/Followers/{name}.png', ESS_RAW)).convert('RGBA')
    fw, fh = src.width // 4, src.height // 4
    s = max(fw, fh) // 2
    out = Image.new('RGBA', (s * 8, s))
    for k, (row, col) in enumerate([(0, 0), (0, 2), (3, 0), (3, 2), (1, 0), (1, 2), (2, 0), (2, 2)]):
        f = src.crop((col * fw, row * fh, col * fw + fw, row * fh + fh)).resize((fw // 2, fh // 2), Image.NEAREST)
        out.paste(f, (k * s + (s - fw // 2) // 2, s - fh // 2))   # unten bündig, waagrecht mittig
    return out, s


TYPOS = {'MABOSSTIFF': 'MABOSTIFF', 'POLTCHAGEIST': 'POLTHCAGEIST'}   # so geschrieben im Essentials-Paket
ess_jobs, missing = [], []
for sp in range(SPECIES + 1, LAST + 1):
    n = ess_name(EN[sp]) if sp < len(EN) and EN[sp] else ''
    n = TYPOS.get(n, n)
    if n in ESS:
        ess_jobs.append((str(sp), n))
    else:
        missing.append(sp)
named = []
for slug, (sp, _, _) in POKE_FORMS.items():
    if slug in HGSS_FORMS or not (0 < sp < len(EN)) or not EN[sp]:
        continue
    base = ess_name(EN[sp])
    # Formteil des Namens: was nach dem Artnamen kommt ('mr-mime-galar' → galar, 'tauros-paldea-combat-breed' → …)
    words = slug.split('-')
    cut = next((i for i in range(1, len(words) + 1) if ''.join(words[:i]).upper() == base), 1)
    rest = words[cut:]
    if not rest:
        continue
    best = None
    for (n, k), label in ess_forms.items():
        lw = re.findall(r'[a-z0-9]+', label.lower())
        if n == base and f'{base}_{k}' in ESS and all(any(w.startswith(t) for w in lw) for t in rest):
            if best is None or len(lw) < best[0]:
                best = (len(lw), f'{base}_{k}')
    if best:
        ess_jobs.append((slug, best[1]))
        named.append(slug)

with ThreadPoolExecutor(8) as pool:
    list(pool.map(lambda j: fetch(f'Graphics/Characters/Followers/{j[1]}.png', ESS_RAW), ess_jobs))
for name, n in ess_jobs:
    img, size = ess_sheet(n)
    if size > 32 and name.isdigit():
        big.append(int(name))
    total += save_png(img, os.path.join(OUT, name + '.png'))
if missing:
    print('Ohne Begleiter-Bild:', missing)

CREDITS = '''# Begleiter-Pokémon (Pokelocke/followers/)

Nr. 1–493 und ihre HGSS-Formen: Pokémon HeartGold/SoulSilver (Nintendo, Game Freak), aus pret/pokeheartgold.

Ab Nr. 494 und weitere Formen: Fan-Sprites im HGSS-Stil, zusammengestellt in
https://github.com/Manurocker95/Pokemon-Essentials-21-With-Unofficial-EBDX (Graphics/Characters/Followers).
Laut dessen README:

- Gen 1–5 Pokemon Overworlds: MissingLukey, help-14, Kymoyonian, cSc-A7X, 2and2makes5, Pokegirl4ever, Fernandojl,
  Silver-Skies, TyranitarDark, Getsuei-H, Kid1513, Milomilotic11, Kyt666, kdiamo11, Chocosrawlooid, Syledude,
  Gallanty, Gizamimi-Pichu, Zyon17, LarryTurbo, spritesstealer
- Gen 6 Pokemon Overworlds: princess-pheonix, LunarDusk, Wolfang62, TintjeMadelintje101, piphybuilder88
- Gen 7 Pokemon Overworlds: Larry Turbo, princess-pheonix
- Gen 8 Pokemon Overworlds: SageDeoxys, Wolfang62, LarryTurbo, tammyclaydon
- Gen 9 Followers: Azria, DarkusShadow
- Follower (PLA-Formen u. a.): Boonzeet, DarkusShadow, princess-phoenix, Ezeart, WolfPP
- Zusammenstellung: Golisopod User, UberDunsparce

Hier auf Originalgröße verkleinert (die Vorlage ist doppelt groß) und auf 8 Bilder je Blatt gebracht.
'''
open(os.path.join(OUT, 'CREDITS.md'), 'w', encoding='utf-8', newline='\n').write(CREDITS)

index = {
    'big': sorted(big),
    'female': [sp for sp in range(1, SPECIES + 1) if female[sp - 1]],
    'forms': {str(sp): forms[sp - 1] for sp in range(1, SPECIES + 1) if forms[sp - 1]},
    'max': LAST,
    'missing': missing,
    'named': sorted(named),
}
js = ('// Erzeugt von tools/build-followers.py: welche Begleiter-Bilder es gibt (Nr. = National-Dex)\n'
      'window.CenterFollowers = ' + json.dumps(index, separators=(',', ':')) + ';\n')
open(os.path.join(OUT, 'index.js'), 'w', encoding='utf-8', newline='\n').write(js)
print(f'{len(jobs)} HGSS + {len(ess_jobs)} Essentials ({len(named)} Formen), {total // 1024} KB, groß: {len(big)}')
