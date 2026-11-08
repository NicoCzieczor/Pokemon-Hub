#!/usr/bin/env python3
"""Build version-specific Black/White map sheets from the Mewmaps composites.

Usage:
    python Karte/tools/build-unova-tiles.py black.jpg white.jpg Karte/tiles-unova

The source composites contain four image pixels per map world unit. z0 is a
compact overview, while z2 keeps the original pixels and splits them into
Leaflet-friendly sheets. No artificial detail is generated.
"""
import argparse
import json
import math
from pathlib import Path

from PIL import Image

ap = argparse.ArgumentParser()
ap.add_argument('black_source')
ap.add_argument('white_source')
ap.add_argument('output')
ap.add_argument('--quality', type=int, default=90)
args = ap.parse_args()

out = Path(args.output)
out.mkdir(parents=True, exist_ok=True)
sources = {
    'black': Image.open(args.black_source).convert('RGB'),
    'white': Image.open(args.white_source).convert('RGB'),
}
sizes = {image.size for image in sources.values()}
if len(sizes) != 1:
    raise SystemExit(f'Black/White source sizes differ: {sorted(sizes)}')

source_width, source_height = next(iter(sizes))
scale = 4
world_width = math.ceil(source_width / scale)
world_height = math.ceil(source_height / scale)
padded_size = (world_width * scale, world_height * scale)
sheet_size = 2048


def save(folder, name, image):
    folder.mkdir(parents=True, exist_ok=True)
    image.save(folder / f'{name}.webp', 'WEBP', quality=args.quality, method=6)


summary = {
    'version': 2,
    'width': world_width,
    'height': world_height,
    'nativeZoom': 2,
    'versions': {},
    'source': 'Mewmaps Black / White Maps',
}

for version, source in sources.items():
    version_out = out / version
    padded = Image.new('RGB', padded_size, (0, 0, 0))
    padded.paste(source, (0, 0))

    overview = padded.resize((world_width, world_height), Image.Resampling.BOX)
    save(version_out / '0', '0_0', overview)
    levels = [{'z': 0, 'size': world_width, 'sheets': ['0_0']}]

    sheets = []
    for y in range(math.ceil(padded.height / sheet_size)):
        for x in range(math.ceil(padded.width / sheet_size)):
            tile = padded.crop((
                x * sheet_size,
                y * sheet_size,
                min(padded.width, (x + 1) * sheet_size),
                min(padded.height, (y + 1) * sheet_size),
            ))
            key = f'{x}_{y}'
            save(version_out / '2', key, tile)
            sheets.append(key)
    levels.append({'z': 2, 'size': sheet_size, 'sheets': sheets})

    manifest = {
        'version': 2,
        'width': world_width,
        'height': world_height,
        'nativeZoom': 2,
        'levels': levels,
        'sea': None,
        'shear': 0,
        'origin': [0, 0],
        'ground': {},
        'multi': {},
        'source': f'Mewmaps Pokemon {version.title()} map.jpg',
    }
    (version_out / 'index.json').write_text(json.dumps(manifest, separators=(',', ':')), encoding='utf-8')
    summary['versions'][version] = f'{version}/index.json'

(out / 'index.json').write_text(json.dumps(summary, separators=(',', ':')), encoding='utf-8')
print(
    f'{world_width}x{world_height} Weltkoordinaten aus {source_width}x{source_height} Pixeln; '
    f'{len(sources)} Editionen, je {len(sheets) + 1} Kartenblätter'
)
