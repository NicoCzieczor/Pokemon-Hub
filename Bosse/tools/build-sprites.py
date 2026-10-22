"""
Trainer-Sprites für den Boss-Planer (Bosse/sprites/<klasse>.png) aus pret/pokeplatinum.

Quelle je Trainerklasse: res/trainers/classes/<klasse>/front.png – ein Blatt mit allen Bildern der
Kampf-Animation untereinander (80 × 80, durch eine 1-px-Linie getrennt). Genommen wird das oberste
Bild (normale Pose); Palettenfarbe 0 ist im Spiel durchsichtig und wird es hier auch.
Welche Klassen gebraucht werden, steht in Bosse/bosses.json (Feld „c“ jedes Trainers).

Aufruf (Python 3 mit Pillow):  python build-sprites.py [cache-ordner]
"""
import json
import os
import sys
import urllib.request
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
BOSSE = os.path.dirname(HERE)
OUT = os.path.join(BOSSE, 'sprites')
CACHE = os.path.abspath(sys.argv[1]) if len(sys.argv) > 1 else os.path.join(os.path.expanduser('~'), '.platin-trainer-cache')
RAW = 'https://raw.githubusercontent.com/pret/pokeplatinum/main/res/trainers/classes/{}/front.png'
FRAME = 80

with open(os.path.join(BOSSE, 'bosses.json'), encoding='utf-8') as f:
    classes = sorted({t['c'].lower() for t in json.load(f)['trainers'].values()})
os.makedirs(CACHE, exist_ok=True)
os.makedirs(OUT, exist_ok=True)

total = 0
for cls in classes:
    src = os.path.join(CACHE, cls + '.png')
    if not os.path.exists(src):
        with urllib.request.urlopen(RAW.format(cls), timeout=30) as r:
            data = r.read()
        with open(src, 'wb') as f:
            f.write(data)
    im = Image.open(src)
    if im.mode != 'P' or im.width != FRAME or im.height < FRAME:
        raise SystemExit(f'{cls}: unerwartetes Format {im.mode} {im.size}')
    frame = im.crop((0, 0, FRAME, FRAME))
    frame.info['transparency'] = 0
    dst = os.path.join(OUT, cls + '.png')
    frame.save(dst, optimize=True, transparency=0)
    total += os.path.getsize(dst)

print(f'{len(classes)} Sprites in {OUT}, zusammen {total // 1024} KB')
