#!/usr/bin/env python3
"""Render the Pokemon Yellow Kanto map from a pret/pokeyellow checkout.

This reuses the Red/Blue map geometry and metadata helpers, but reads Yellow's
own map blocks, encounters and official Game Boy Color location palettes.

Usage:
    python Karte/tools/build-yellow.py /path/to/pokeyellow
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import math
import shutil
import subprocess
from pathlib import Path

from PIL import Image, ImageChops


HERE = Path(__file__).resolve().parent
KARTE = HERE.parent
TILE_OUTPUT = KARTE / "tiles-yellow"
DATA_OUTPUT = KARTE / "yellow.json"
LEVELS = (4, 2, 0)

spec = importlib.util.spec_from_file_location("build_kanto", HERE / "build-kanto.py")
if spec is None or spec.loader is None:
    raise RuntimeError("Could not load build-kanto.py")
kanto = importlib.util.module_from_spec(spec)
spec.loader.exec_module(kanto)


MAP_PALETTES = {
    "PALLET_TOWN": "PAL_PALLET", "VIRIDIAN_CITY": "PAL_VIRIDIAN",
    "PEWTER_CITY": "PAL_PEWTER", "CERULEAN_CITY": "PAL_CERULEAN",
    "LAVENDER_TOWN": "PAL_LAVENDER", "VERMILION_CITY": "PAL_VERMILION",
    "CELADON_CITY": "PAL_CELADON", "FUCHSIA_CITY": "PAL_FUCHSIA",
    "CINNABAR_ISLAND": "PAL_CINNABAR", "INDIGO_PLATEAU": "PAL_INDIGO",
    "SAFFRON_CITY": "PAL_SAFFRON",
}


def rgb8(value: int) -> int:
    return (value * 255 + 15) // 31


def parse_cgb_palettes(root: Path) -> dict[str, tuple[tuple[int, int, int], ...]]:
    text = kanto.read(root / "data/sgb/sgb_palettes.asm")
    section = text.split("CGBBasePalettes:", 1)[1]
    palettes = {}
    for raw in section.splitlines():
        if "assert_table_length" in raw:
            break
        if "RGB" not in raw or "; PAL_" not in raw:
            continue
        values = [int(value) for value in raw.split("RGB", 1)[1].split(";", 1)[0].replace(",", " ").split()]
        name = raw.split(";", 1)[1].strip()
        colors = tuple(tuple(rgb8(channel) for channel in values[index:index + 3]) for index in range(0, 12, 3))
        palettes[name] = tuple(reversed(colors))  # grayscale PNG: black -> white
    required = {"PAL_ROUTE", *MAP_PALETTES.values()}
    if not required.issubset(palettes):
        raise RuntimeError(f"Missing CGB palettes: {sorted(required - set(palettes))}")
    return palettes


def colorize(source: Image.Image, palette: tuple[tuple[int, int, int], ...]) -> Image.Image:
    source = source.convert("L")
    channels = []
    for channel in range(3):
        channels.append(source.point([palette[min(3, max(0, round(value / 85)))][channel] for value in range(256)]))
    return Image.merge("RGB", tuple(channels))


def render_map(root: Path, map_spec: dict, palettes: dict, cache: dict) -> Image.Image:
    palette_name = MAP_PALETTES.get(map_spec["key"], "PAL_ROUTE")
    cache_key = (map_spec["tileset"], palette_name)
    if cache_key not in cache:
        sheet = colorize(Image.open(root / f"gfx/tilesets/{map_spec['tileset']}.png"), palettes[palette_name])
        blocks = (root / f"gfx/blocksets/{map_spec['tileset']}.bst").read_bytes()
        cache[cache_key] = (sheet, blocks)
    sheet, blocks = cache[cache_key]
    block_ids = (root / f"maps/{map_spec['label']}.blk").read_bytes()
    expected = map_spec["width"] * map_spec["height"]
    if len(block_ids) != expected:
        raise RuntimeError(f"{map_spec['label']}.blk: expected {expected}, got {len(block_ids)}")
    image = Image.new("RGB", (map_spec["width"] * kanto.BLOCK_PIXELS, map_spec["height"] * kanto.BLOCK_PIXELS))
    for by in range(map_spec["height"]):
        for bx in range(map_spec["width"]):
            start = block_ids[by * map_spec["width"] + bx] * 16
            for ty in range(4):
                for tx in range(4):
                    tile_id = blocks[start + ty * 4 + tx]
                    sx, sy = tile_id % 16 * kanto.TILE_SIZE, tile_id // 16 * kanto.TILE_SIZE
                    image.paste(sheet.crop((sx, sy, sx + 8, sy + 8)), (bx * 32 + tx * 8, by * 32 + ty * 8))
    return image


def yellow_wild(root: Path, map_spec: dict, dex: dict[str, int]) -> dict:
    path = root / f"data/wild/maps/{map_spec['label']}.asm"
    empty = {"grass": [], "surf": []}
    return {"yellow": kanto.parse_wild_file(path, "yellow", dex) if path.exists() else empty}


def write_pyramid(world: Image.Image, width: int, height: int) -> dict:
    resolved = TILE_OUTPUT.resolve()
    if resolved.parent != KARTE.resolve() or resolved.name != "tiles-yellow":
        raise RuntimeError(f"Refusing unexpected tile output: {resolved}")
    if TILE_OUTPUT.exists():
        shutil.rmtree(TILE_OUTPUT)
    TILE_OUTPUT.mkdir()
    manifest_levels = []
    for zoom in LEVELS:
        scale = 2 ** zoom
        level = world if zoom == kanto.NATIVE_ZOOM else world.resize((width * scale, height * scale), Image.Resampling.NEAREST)
        folder = TILE_OUTPUT / str(zoom)
        folder.mkdir()
        sheets = []
        for sy in range(math.ceil(level.height / kanto.SHEET_SIZE)):
            for sx in range(math.ceil(level.width / kanto.SHEET_SIZE)):
                left, top = sx * kanto.SHEET_SIZE, sy * kanto.SHEET_SIZE
                crop = level.crop((left, top, min(level.width, left + kanto.SHEET_SIZE), min(level.height, top + kanto.SHEET_SIZE)))
                if zoom != 0 and ImageChops.difference(crop, Image.new("RGB", crop.size, kanto.OCEAN)).getbbox() is None:
                    continue
                key = f"{sx}_{sy}"
                crop.save(folder / f"{key}.webp", "WEBP", lossless=True, method=6)
                sheets.append(key)
        manifest_levels.append({"z": zoom, "size": kanto.SHEET_SIZE, "sheets": sheets})
    manifest = {"version": 3, "width": width, "height": height, "nativeZoom": kanto.NATIVE_ZOOM, "levels": manifest_levels}
    (TILE_OUTPUT / "index.json").write_text(json.dumps(manifest, separators=(",", ":")), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="pret/pokeyellow checkout")
    parser.add_argument("--preview", type=Path, help="optional overview PNG outside the tile directory")
    args = parser.parse_args()
    root = args.source.resolve()
    required = [root / "constants/map_constants.asm", root / "gfx/tilesets/overworld.png", root / "maps/PalletTown.blk", root / "data/sgb/sgb_palettes.asm"]
    if not all(path.exists() for path in required):
        raise SystemExit(f"Not a pret/pokeyellow checkout: {root}")

    maps = kanto.parse_map_constants(root)
    kanto.parse_headers(root, maps)
    positions = kanto.connected_positions(maps)
    min_x = min(positions[key][0] for key in maps)
    min_y = min(positions[key][1] for key in maps)
    max_x = max(positions[key][0] + maps[key]["width"] for key in maps)
    max_y = max(positions[key][1] + maps[key]["height"] for key in maps)
    width = (max_x - min_x) * kanto.UNITS_PER_BLOCK + kanto.MARGIN * 2
    height = (max_y - min_y) * kanto.UNITS_PER_BLOCK + kanto.MARGIN * 2
    origins = {key: ((x - min_x) * 2 + kanto.MARGIN, (y - min_y) * 2 + kanto.MARGIN) for key, (x, y) in positions.items()}

    world = Image.new("RGB", (width * 16, height * 16), kanto.OCEAN)
    palettes = parse_cgb_palettes(root)
    cache = {}
    for key, map_spec in maps.items():
        image = render_map(root, map_spec, palettes, cache)
        ox, oy = origins[key]
        world.paste(image, (ox * 16, oy * 16))

    dex = kanto.parse_dex_ids(root)
    item_constants, tm_numbers = kanto.parse_item_constants(root)
    translated = kanto.item_lookup()
    hidden = kanto.parse_hidden_items(root, origins, tm_numbers, translated)
    locations = []
    order = list(kanto.PLACE_NAMES)[:11] + [f"ROUTE_{number}" for number in range(1, 26)]
    for key in order:
        map_spec = maps[key]
        de, en, place_type = kanto.PLACE_NAMES[key]
        ox, oy = origins[key]
        x2, y2 = ox + map_spec["width"] * 2, oy + map_spec["height"] * 2
        items, trainers = kanto.parse_object_events(root, map_spec, (ox, oy), item_constants, tm_numbers, translated)
        items.extend(hidden.get(key, []))
        locations.append({
            "key": key, "slug": kanto.slug_for(key), "de": de, "en": en, "type": place_type,
            "area": [ox, oy, x2, y2], "label": [round((ox + x2) / 2, 1), round((oy + y2) / 2, 1)],
            "items": items, "trainers": trainers, "wild": yellow_wild(root, map_spec, dex),
        })

    try:
        commit = subprocess.run(["git", "-C", str(root), "rev-parse", "--short=12", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        commit = "unknown"
    data = {
        "version": 1, "source": f"pret/pokeyellow@{commit}",
        "mapSource": "Pokemon Yellow map blocks and official Game Boy Color location palettes",
        "mapAuthor": "GAME FREAK / Nintendo", "width": width, "height": height, "locations": locations,
    }
    DATA_OUTPUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest = write_pyramid(world, width, height)
    (TILE_OUTPUT / "SOURCE.txt").write_text(
        "Pokémon Gelb – Kartenquellen\n===============================\n\n"
        "Die Kartenbilder wurden aus der vollständigen pret/pokeyellow-Disassembly gerendert.\n"
        "Verwendet werden Gelbs eigene Kartenblöcke, Tilesets und die offiziellen ortsabhängigen\n"
        "Game-Boy-Color-Paletten. Die Funddaten stammen aus Gelbs Begegnungstabellen.\n\n"
        "Quelle: https://github.com/pret/pokeyellow\n"
        f"Stand: {commit}\n\n"
        "Pokémon, die Karten- und Grafikdaten sind Eigentum von GAME FREAK, Nintendo,\n"
        "Creatures Inc. und The Pokémon Company. Die Ausgabe dient nur der privaten,\n"
        "lokalen Darstellung innerhalb des Pokémon Hubs.\n",
        encoding="utf-8",
    )
    if args.preview:
        world.resize((width * 2, height * 2), Image.Resampling.NEAREST).save(args.preview)
    wild_places = sum(bool(location["wild"]["yellow"]["grass"] or location["wild"]["yellow"]["surf"]) for location in locations)
    sheets = sum(len(level["sheets"]) for level in manifest["levels"])
    print(f"Yellow: {len(maps)} outdoor maps, {len(locations)} locations, {width}x{height} units")
    print(f"Encounters: {wild_places} locations; Tiles: {sheets} WebP sheets")


if __name__ == "__main__":
    main()
