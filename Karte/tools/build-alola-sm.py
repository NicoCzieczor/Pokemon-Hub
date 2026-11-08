"""Baut einen Sonne/Mond-Alola-Atlas aus echten gerenderten Gen-7-Feldszenen.

Die Einzelbilder werden mit capture-usum.py aus dem lokalen 3DS-Dump erzeugt.
Aufruf:
  python build-alola-sm.py <capture-ordner> <ausgabe-ordner> [--preview atlas.png]
"""

import argparse
import csv
import json
import math
import os
from pathlib import Path

from PIL import Image, ImageDraw, ImageEnhance, ImageFont, ImageOps


PLACES = [
    # Area, Slug, Deutsch, English, Typ, Insel
    (0, 'route-1', 'Route 1', 'Route 1', 'route', 'melemele'),
    (1, 'iki-town', "Lili’i", 'Iki Town', 'town', 'melemele'),
    (2, 'hauoli-city', 'Hauholi City', 'Hau’oli City', 'city', 'melemele'),
    (4, 'route-3', 'Route 3', 'Route 3', 'route', 'melemele'),
    (5, 'route-2', 'Route 2', 'Route 2', 'route', 'melemele'),
    (13, 'mahalo-trail', 'Mahalo-Bergpfad', 'Mahalo Trail', 'place', 'melemele'),
    (16, 'ruins-of-conflict', 'Ruinen des Krieges', 'Ruins of Conflict', 'place', 'melemele'),
    (20, 'ten-carat-hill', 'Tenkarat-Hügel', 'Ten Carat Hill', 'place', 'melemele'),
    (22, 'hauoli-cemetery', 'Hauholi-Friedhof', 'Hau’oli Cemetery', 'place', 'melemele'),
    (23, 'melemele-meadow', 'Mele-Mele-Blumenmeer', 'Melemele Meadow', 'place', 'melemele'),
    (24, 'seaward-cave', 'Meereshöhle', 'Seaward Cave', 'place', 'melemele'),
    (25, 'berry-fields', 'Beerenfelder', 'Berry Fields', 'place', 'melemele'),
    (27, 'verdant-cavern', 'Vegetationshöhle', 'Verdant Cavern', 'place', 'melemele'),

    (65, 'heahea-city', 'Kantai City', 'Heahea City', 'city', 'akala'),
    (66, 'route-4', 'Route 4', 'Route 4', 'route', 'akala'),
    (67, 'paniola-town', 'Ohana', 'Paniola Town', 'town', 'akala'),
    (68, 'route-5', 'Route 5', 'Route 5', 'route', 'akala'),
    (69, 'route-6', 'Route 6', 'Route 6', 'route', 'akala'),
    (70, 'route-7', 'Route 7', 'Route 7', 'route', 'akala'),
    (71, 'route-8', 'Route 8', 'Route 8', 'route', 'akala'),
    (72, 'route-9', 'Route 9', 'Route 9', 'route', 'akala'),
    (73, 'hano-grand-resort', 'Hanohano-Resort', 'Hano Grand Resort', 'place', 'akala'),
    (74, 'konikoni-city', 'Konikoni City', 'Konikoni City', 'city', 'akala'),
    (78, 'ruins-of-life', 'Ruinen des Lebens', 'Ruins of Life', 'place', 'akala'),
    (82, 'digletts-tunnel', 'Digda-Tunnel', 'Diglett’s Tunnel', 'place', 'akala'),
    (83, 'wela-volcano-park', 'Wela-Vulkanpark', 'Wela Volcano Park', 'place', 'akala'),
    (85, 'brooklet-hill', 'Plätscherhügel', 'Brooklet Hill', 'place', 'akala'),
    (87, 'lush-jungle', 'Schattendschungel', 'Lush Jungle', 'place', 'akala'),

    (135, 'malie-city', 'Malihe City', 'Malie City', 'city', 'ulaula'),
    (136, 'route-10', 'Route 10', 'Route 10', 'route', 'ulaula'),
    (142, 'route-11', 'Route 11', 'Route 11', 'route', 'ulaula'),
    (137, 'route-12', 'Route 12', 'Route 12', 'route', 'ulaula'),
    (138, 'route-13', 'Route 13', 'Route 13', 'route', 'ulaula'),
    (139, 'route-14', 'Route 14', 'Route 14', 'route', 'ulaula'),
    (140, 'route-15-16', 'Route 15 & 16', 'Routes 15 & 16', 'route', 'ulaula'),
    (141, 'route-17', 'Route 17', 'Route 17', 'route', 'ulaula'),
    (144, 'po-town', 'Po’u', 'Po Town', 'town', 'ulaula'),
    (145, 'haina-desert', 'Haina-Wüste', 'Haina Desert', 'place', 'ulaula'),
    (147, 'ulaula-meadow', 'Ula-Ula-Blumenmeer', 'Ula’ula Meadow', 'place', 'ulaula'),
    (148, 'malie-garden', 'Malihe-Ziergarten', 'Malie Garden', 'place', 'ulaula'),
    (149, 'mount-hokulani', 'Hokulani-Berg', 'Mount Hokulani', 'place', 'ulaula'),
    (150, 'blush-mountain', 'Glühberg', 'Blush Mountain', 'place', 'ulaula'),
    (151, 'ruins-of-abundance', 'Ruinen des Gedeihens', 'Ruins of Abundance', 'place', 'ulaula'),
    (154, 'lake-of-sunne-moone', 'Sonnenkreis-/Mondscheiben-See', 'Lake of the Sunne/Moone', 'place', 'ulaula'),
    (164, 'mount-lanakila', 'Mount Lanakila', 'Mount Lanakila', 'place', 'ulaula'),
    (182, 'thrifty-megamart', 'Schnäppchenparadies', 'Thrifty Megamart', 'place', 'ulaula'),
    (201, 'hokulani-observatory', 'Hokulani-Sternwarte', 'Hokulani Observatory', 'place', 'ulaula'),
    (210, 'pokemon-league', 'Pokémon-Liga', 'Pokémon League', 'place', 'ulaula'),

    (223, 'seafolk-village', 'Dorf des Seevolkes', 'Seafolk Village', 'town', 'poni'),
    (224, 'poni-wilds', 'Wildnis von Poni', 'Poni Wilds', 'place', 'poni'),
    (225, 'ancient-poni-path', 'Alter Pfad von Poni', 'Ancient Poni Path', 'place', 'poni'),
    (226, 'poni-grove', 'Wald von Poni', 'Poni Grove', 'place', 'poni'),
    (227, 'poni-plains', 'Ebene von Poni', 'Poni Plains', 'place', 'poni'),
    (228, 'poni-coast', 'Küste von Poni', 'Poni Coast', 'place', 'poni'),
    (229, 'poni-gauntlet', 'Poni-Küstenweg', 'Poni Gauntlet', 'place', 'poni'),
    (231, 'poni-meadow', 'Poni-Blumenmeer', 'Poni Meadow', 'place', 'poni'),
    (232, 'vast-poni-canyon', 'Canyon von Poni', 'Vast Poni Canyon', 'place', 'poni'),
    (238, 'altar', 'Sonnenkreis-/Mondscheiben-Podium', 'Altar of the Sunne/Moone', 'place', 'poni'),
    (242, 'ruins-of-hope', 'Ruinen der Hoffnung', 'Ruins of Hope', 'place', 'poni'),
    (245, 'resolution-cave', 'Finalhöhle', 'Resolution Cave', 'place', 'poni'),
    (248, 'exeggutor-island', 'Kokowei-Eiland', 'Exeggutor Island', 'place', 'poni'),
    (256, 'battle-tree', 'Kampfbaum', 'Battle Tree', 'place', 'poni'),
    (263, 'aether-paradise', 'Æther-Paradies', 'Aether Paradise', 'place', 'poni'),
]

ISLANDS = {
    'melemele': ('Mele-Mele', 'MELEMELE ISLAND', (34, 116), (67, 212, 152)),
    'akala': ('Akala', 'AKALA ISLAND', (1040, 116), (246, 173, 83)),
    'ulaula': ('Ula-Ula', 'ULA’ULA ISLAND', (34, 1110), (198, 92, 123)),
    'poni': ('Poni & Æther', 'PONI ISLAND & AETHER', (1040, 1110), (91, 154, 219)),
}

W = H = 2048
PANEL_W, PANEL_H = 974, 904
CARD_W, CARD_H = 292, 154
CARD_GAP_X, CARD_GAP_Y = 13, 12
HEADER_H = 66


def font(size, bold=False):
    candidates = [
        Path('C:/Windows/Fonts') / ('segoeuib.ttf' if bold else 'segoeui.ttf'),
        Path('C:/Windows/Fonts') / ('arialbd.ttf' if bold else 'arial.ttf'),
    ]
    for candidate in candidates:
        if candidate.exists():
            return ImageFont.truetype(str(candidate), size)
    return ImageFont.load_default()


def rounded_gradient(base, box, top, bottom, radius=26):
    x0, y0, x1, y1 = box
    layer = Image.new('RGBA', (x1 - x0, y1 - y0), (0, 0, 0, 0))
    px = layer.load()
    for y in range(layer.height):
        t = y / max(1, layer.height - 1)
        color = tuple(round(top[i] * (1 - t) + bottom[i] * t) for i in range(4))
        for x in range(layer.width):
            px[x, y] = color
    mask = Image.new('L', layer.size, 0)
    ImageDraw.Draw(mask).rounded_rectangle((0, 0, layer.width - 1, layer.height - 1), radius, fill=255)
    base.paste(layer, (x0, y0), mask)


def make_background():
    image = Image.new('RGB', (W, H), '#071d39')
    draw = ImageDraw.Draw(image)
    for y in range(H):
        t = y / H
        color = (7 + round(7 * t), 35 + round(18 * t), 67 + round(25 * t))
        draw.line((0, y, W, y), fill=color)
    for y in range(18, H, 44):
        offset = 22 if (y // 44) % 2 else 0
        for x in range(-40 + offset, W, 88):
            draw.arc((x, y, x + 70, y + 24), 200, 340, fill=(26, 89, 130), width=2)
    # Sanfte Lichtinseln unter den vier Kartenfeldern.
    glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
    gd = ImageDraw.Draw(glow)
    for cx, cy in ((512, 512), (1536, 512), (512, 1536), (1536, 1536)):
        for r in range(500, 80, -12):
            a = max(0, round((500 - r) * .06))
            gd.ellipse((cx-r, cy-r, cx+r, cy+r), fill=(24, 162, 190, a))
    return Image.alpha_composite(image.convert('RGBA'), glow)


def scene_thumb(path, size):
    image = Image.open(path).convert('RGB')
    # Mittig auf das eigentliche Spielfeld zuschneiden; UI-Leisten sind bereits
    # beim Capture entfernt. Leichte Kontrastanhebung bewahrt Details im Atlas.
    image = ImageOps.fit(image, size, method=Image.Resampling.LANCZOS, centering=(.5, .46))
    return ImageEnhance.Contrast(image).enhance(1.05)


def read_csv(path):
    with open(path, newline='', encoding='utf-8') as handle:
        return list(csv.DictReader(handle))


def encounter_tables(csv_dir):
    """Liest Sonne/Mond-Funddaten aus dem offiziellen PokeAPI-Datensatz."""
    csv_dir = Path(csv_dir)
    locations = {int(row['id']): row['identifier'] for row in read_csv(csv_dir / 'locations.csv')}
    area_location = {int(row['id']): int(row['location_id']) for row in read_csv(csv_dir / 'location_areas.csv')}
    slots = {int(row['id']): (int(row['encounter_method_id']), int(row['rarity']))
             for row in read_csv(csv_dir / 'encounter_slots.csv')}
    species = {int(row['id']): int(row['species_id']) for row in read_csv(csv_dir / 'pokemon.csv')}
    rows = read_csv(csv_dir / 'encounters.csv')
    by_version = {'sun': [], 'moon': []}
    for row in rows:
        version = 'sun' if row['version_id'] == '27' else 'moon' if row['version_id'] == '28' else None
        if version:
            by_version[version].append(row)

    aliases = {
        'route-1': ['alola-route-1'],
        'route-2': ['alola-route-2'], 'route-3': ['alola-route-3'],
        'route-5': ['alola-route-5'], 'route-6': ['alola-route-6'],
        'route-7': ['alola-route-7'], 'route-8': ['alola-route-8'],
        'route-9': ['alola-route-9'], 'route-10': ['alola-route-10'], 'route-11': ['alola-route-11'],
        'route-12': ['alola-route-12'], 'route-13': ['alola-route-13'],
        'route-14': ['alola-route-14'], 'route-15-16': ['alola-route-15', 'alola-route-16'],
        'route-17': ['alola-route-17'], 'berry-fields': ['alola-berry-fields'],
        'pokemon-league': ['alola-pokemon-league'],
        'altar': ['altar-of-the-sunne', 'altar-of-the-moone'],
        'lake-of-sunne-moone': ['lake-of-the-sunne', 'lake-of-the-moone'],
        'hauoli-city': ['hauoli-city'], 'malie-city': ['malie-city'],
    }

    result = {}
    for _, slug, *_ in PLACES:
        prefixes = aliases.get(slug, [slug])
        location_ids = {location_id for location_id, name in locations.items()
                        if any(name == prefix or name.startswith(prefix + '--') for prefix in prefixes)}
        area_ids = {area_id for area_id, location_id in area_location.items() if location_id in location_ids}
        result[slug] = {}
        for version, encounters in by_version.items():
            methods = {'grass': {}, 'surf': {}}
            for row in encounters:
                if int(row['location_area_id']) not in area_ids:
                    continue
                method, rarity = slots[int(row['encounter_slot_id'])]
                kind = 'grass' if method in (1, 17) else 'surf' if method == 5 else None
                if not kind:
                    continue
                # PokeAPI führt einige einmalige Ultra-Bestien-Begegnungen als
                # 100-%-Laufslot der gesamten Ortsgruppe. Sie sind keine wilden
                # Sonne/Mond-Grasbegegnungen und würden sonst z. B. im Dschungel
                # als regulärer Fund erscheinen.
                if rarity == 100 and int(row['min_level']) >= 60:
                    continue
                pokemon = species.get(int(row['pokemon_id']), int(row['pokemon_id']))
                current = methods[kind].setdefault(pokemon, {
                    'id': pokemon, 'form': 0, 'p': 0,
                    'min': int(row['min_level']), 'max': int(row['max_level']),
                })
                current['p'] = max(current['p'], rarity)
                current['min'] = min(current['min'], int(row['min_level']))
                current['max'] = max(current['max'], int(row['max_level']))
            result[slug][version] = {
                key: sorted(values.values(), key=lambda mon: (-mon['p'], mon['id']))
                for key, values in methods.items()
            }
    return result


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('captures')
    ap.add_argument('out')
    ap.add_argument('--preview')
    ap.add_argument('--pokeapi-csv', help='PokeAPI-data/v2/csv für die Sonne/Mond-Funddaten')
    args = ap.parse_args()
    captures, out = Path(args.captures), Path(args.out)
    missing = [area for area, *_ in PLACES if not (captures / f'area-{area}.png').exists()]
    if missing:
        raise SystemExit('Fehlende Captures: ' + ', '.join(map(str, missing)))

    atlas = make_background()
    draw = ImageDraw.Draw(atlas)
    title_font, small_font = font(30, True), font(18, True)
    sub_font = font(12, True)
    locations = []
    encounters = encounter_tables(args.pokeapi_csv) if args.pokeapi_csv else {}

    for island, (de_title, en_title, (panel_x, panel_y), accent) in ISLANDS.items():
        rounded_gradient(atlas, (panel_x, panel_y, panel_x + PANEL_W, panel_y + PANEL_H),
                         (15, 34, 55, 247), (7, 19, 35, 247))
        draw = ImageDraw.Draw(atlas)
        draw.rounded_rectangle((panel_x, panel_y, panel_x + PANEL_W, panel_y + PANEL_H), 26,
                               outline=accent + (180,), width=3)
        draw.ellipse((panel_x + 22, panel_y + 18, panel_x + 66, panel_y + 62), fill=accent + (255,))
        draw.text((panel_x + 82, panel_y + 13), de_title, font=title_font, fill='white')
        draw.text((panel_x + 84, panel_y + 46), en_title, font=sub_font, fill=(157, 192, 216))

        island_places = [p for p in PLACES if p[5] == island]
        columns = 4 if len(island_places) > 15 else 3
        card_w = 218 if columns == 4 else CARD_W
        gap_x = 10 if columns == 4 else CARD_GAP_X
        for index, (area, slug, de, en, kind, region) in enumerate(island_places):
            col, row = index % columns, index // columns
            x = panel_x + 32 + col * (card_w + gap_x)
            y = panel_y + HEADER_H + 20 + row * (CARD_H + CARD_GAP_Y)
            draw.rounded_rectangle((x, y, x + card_w, y + CARD_H), 14, fill=(4, 13, 25, 255),
                                   outline=accent + (155,), width=2)
            thumb = scene_thumb(captures / f'area-{area}.png', (card_w - 8, CARD_H - 42))
            mask = Image.new('L', thumb.size, 0)
            ImageDraw.Draw(mask).rounded_rectangle((0, 0, thumb.width - 1, thumb.height - 1), 10, fill=255)
            atlas.paste(thumb, (x + 4, y + 4), mask)
            max_label = 18 if columns == 4 else 25
            label = de if len(de) <= max_label else de[:max_label - 1] + '…'
            draw.text((x + 10, y + CARD_H - 33), label, font=small_font, fill='white')
            logical = [round(x / 4, 2), round(y / 4, 2), round((x + card_w) / 4, 2), round((y + CARD_H) / 4, 2)]
            locations.append({
                'id': area, 'slug': slug, 'de': de, 'en': en, 'type': kind,
                'region': region, 'area': logical,
                'label': [round((x + card_w / 2) / 4, 2), round((y + CARD_H / 2) / 4, 2)],
                'showLabel': False, 'items': [], 'trainers': [],
                'wild': encounters.get(slug, {
                    'sun': {'grass': [], 'surf': []}, 'moon': {'grass': [], 'surf': []},
                }),
                'sourceArea': area,
            })

    out.mkdir(parents=True, exist_ok=True)
    (out / '0').mkdir(exist_ok=True)
    (out / '2').mkdir(exist_ok=True)
    overview = atlas.resize((512, 512), Image.Resampling.LANCZOS).convert('RGB')
    overview.save(out / '0' / '0_0.webp', 'WEBP', quality=88, method=6)
    atlas.convert('RGB').save(out / '2' / '0_0.webp', 'WEBP', quality=88, method=6)
    if args.preview:
        atlas.convert('RGB').save(args.preview, quality=92)

    index = {
        'version': 3, 'width': 512, 'height': 512, 'nativeZoom': 2,
        'levels': [
            {'z': 0, 'size': 512, 'sheets': ['0_0']},
            {'z': 2, 'size': 2048, 'sheets': ['0_0']},
        ],
        'sea': None, 'shear': 0, 'origin': [0, 0], 'ground': {}, 'multi': {},
    }
    (out / 'index.json').write_text(json.dumps(index, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    data = {
        'version': 1,
        'source': 'Sonne/Mond-Alola-Atlas aus gerenderten Gen-7-Feldarchiven der bereitgestellten Ultra-Sonne-ROM',
        'mapSource': 'Lokaler 3DS-RomFS-Dump; Feldarchive a/0/8/2 und Terrain a/0/8/6',
        'mapAuthor': 'GAME FREAK / Nintendo',
        'width': 512, 'height': 512, 'locations': locations,
    }
    data_path = out.parent / 'alola-sm.json'
    data_path.write_text(json.dumps(data, ensure_ascii=False, separators=(',', ':')), encoding='utf-8')

    source = """Pokémon Sonne/Mond – Alola-Kartenatlas

Grafikquelle:
- Echte Feldmodelle, Texturen, NPCs und Beleuchtung aus dem RomFS der vom Nutzer
  bereitgestellten sauberen Pokémon-Ultra-Sonne-ROM.
- Genutzte Archive: a/0/8/2 (Feldszenen) und a/0/8/6 (Terrain).
- Gerendert mit USUMStudio; Aufnahmeautomatisierung: tools/capture-usum.py.
- Atlas und WebP-Kartenblätter: tools/build-alola-sm.py.
- Editionsgetrennte Sonne/Mond-Funddaten: offizieller PokeAPI-Datensatz data/v2/csv.

Die lokale ROM-Sammlung enthielt keine originale Sonne- oder Mond-ROM. Deshalb
werden ausschließlich die mit Sonne/Mond geteilten Alola-Orte verwendet; USUM-
exklusive Gebiete wurden bewusst ausgeschlossen. Der Menüpunkt und die Ortsauswahl
bilden Sonne/Mond ab, die sichtbaren 3D-Assets stammen transparent dokumentiert aus
der technisch kompatiblen Ultra-Sonne-Feldfassung.

Technische Referenzen:
- https://github.com/Aqua-0/USUM-Studio
- https://github.com/Ajarmar/universal-pokemon-randomizer-zx/blob/master/src/com/dabomstew/pkrandom/config/gen7_offsets.ini
- https://github.com/PokeAPI/pokeapi/tree/master/data/v2/csv

Pokémon und zugehörige Namen/Assets © Nintendo / Creatures Inc. / GAME FREAK inc.
"""
    (out / 'SOURCE.txt').write_text(source, encoding='utf-8')
    print(f'{len(locations)} Alola-Orte; Atlas {W}×{H}; Ausgabe: {out}')


if __name__ == '__main__':
    main()
