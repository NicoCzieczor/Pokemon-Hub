#!/usr/bin/env python3
"""Align the Black Mewmaps fallback with the ROM-rendered Unova world grid.

Only Pokémon White can be rendered from the supplied ROM. The Black composite
is therefore retained as a fallback, but projected into the same 832x736 world
coordinate system so edition changes do not move markers or change bounds.

Usage:
    python Karte/tools/align-unova-fallback.py black.jpg Karte/tiles-unova/black
"""
import argparse
import json
import math
from pathlib import Path

from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('source')
ap.add_argument('output')
ap.add_argument('--quality', type=int, default=90)
args = ap.parse_args()

source = Image.open(args.source).convert('RGB')
out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)

# Two geographic anchors establish the affine link between the old composite
# and matrix 0 cropped to columns 1..26 / rows 2..24:
#   Pokémon League: (735,120) -> (464,16)
#   Nuvema region:  (1080,755) -> (752,688)
SX = 288 / 345
OX = 464 - SX * 735
SZ = 672 / 635
OZ = 16 - SZ * 120
WORLD_WIDTH, WORLD_HEIGHT = 26 * 32, 23 * 32
SCALE = 4
DETAIL_SIZE = (WORLD_WIDTH * SCALE, WORLD_HEIGHT * SCALE)

# PIL's affine coefficients map destination pixels back into source pixels.
detail = source.transform(
    DETAIL_SIZE,
    Image.Transform.AFFINE,
    (1 / SX, 0, -4 * OX / SX, 0, 1 / SZ, -4 * OZ / SZ),
    resample=Image.Resampling.BICUBIC,
    fillcolor=(0, 0, 0),
)


def save(folder, name, image):
    folder.mkdir(parents=True, exist_ok=True)
    image.save(folder / f'{name}.webp', 'WEBP', quality=args.quality, method=6)


overview = detail.resize((WORLD_WIDTH, WORLD_HEIGHT), Image.Resampling.BOX)
save(out / '0', '0_0', overview)
levels = [{'z': 0, 'size': WORLD_WIDTH, 'sheets': ['0_0']}]

sheet_size = 2048
sheets = []
for y in range(math.ceil(detail.height / sheet_size)):
    for x in range(math.ceil(detail.width / sheet_size)):
        key = f'{x}_{y}'
        tile = detail.crop((
            x * sheet_size,
            y * sheet_size,
            min(detail.width, (x + 1) * sheet_size),
            min(detail.height, (y + 1) * sheet_size),
        ))
        save(out / '2', key, tile)
        sheets.append(key)
levels.append({'z': 2, 'size': sheet_size, 'sheets': sheets})

manifest = {
    'version': 3,
    'width': WORLD_WIDTH,
    'height': WORLD_HEIGHT,
    'nativeZoom': 2,
    'levels': levels,
    'sea': None,
    'shear': 0,
    'origin': [32, 64],
    'ground': {},
    'multi': {},
    'source': 'Mewmaps Black fallback, aligned to ROM matrix 0',
}
(out / 'index.json').write_text(json.dumps(manifest, separators=(',', ':')), encoding='utf-8')
print(f'{WORLD_WIDTH}x{WORLD_HEIGHT} Weltkoordinaten, {len(sheets) + 1} Kartenblätter')
