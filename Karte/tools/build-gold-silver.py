#!/usr/bin/env python3
"""Render the Gold/Silver outdoor world from a pret/pokegold checkout.

The generated files are ``Karte/tiles-gold-silver`` and
``Karte/gold-silver.json``. No ROM is required; all graphics, palettes,
metatiles, map blocks, connections and encounters come from the disassembly.

Usage:
    python Karte/tools/build-gold-silver.py /path/to/pokegold
"""

from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import subprocess
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops


HERE = Path(__file__).resolve().parent
KARTE = HERE.parent
TILE_OUTPUT = KARTE / "tiles-gold-silver"
DATA_OUTPUT = KARTE / "gold-silver.json"
TILE_SIZE = 8
BLOCK_PIXELS = 32
UNITS_PER_BLOCK = 2
NATIVE_ZOOM = 4
SHEET_SIZE = 2048
LEVELS = (4, 2, 0)
MARGIN = 8
COMPONENT_GAP = 32
OCEAN = (8, 28, 36)
GRASS_WEIGHTS = (30, 30, 20, 10, 5, 4, 1)
WATER_WEIGHTS = (60, 30, 10)
PALETTE_IDS = {"GRAY": 0, "RED": 1, "GREEN": 2, "WATER": 3, "YELLOW": 4, "BROWN": 5, "ROOF": 6, "TEXT": 7}

EXCLUDED_OUTDOOR_MAPS = {
    "NATIONAL_PARK_BUG_CONTEST",  # identical layout, temporary contest state
    "OLIVINE_PORT", "VERMILION_PORT",  # ship interiors despite ROUTE environment
    "TIN_TOWER_ROOF",  # isolated roof scene
}


TOWNS = [
    ("NEW_BARK_TOWN", "Neuborkia", "New Bark Town", "town", "johto"),
    ("CHERRYGROVE_CITY", "Rosalia City", "Cherrygrove City", "city", "johto"),
    ("VIOLET_CITY", "Viola City", "Violet City", "city", "johto"),
    ("AZALEA_TOWN", "Azalea City", "Azalea Town", "town", "johto"),
    ("GOLDENROD_CITY", "Dukatia City", "Goldenrod City", "city", "johto"),
    ("ECRUTEAK_CITY", "Teak City", "Ecruteak City", "city", "johto"),
    ("OLIVINE_CITY", "Oliviana City", "Olivine City", "city", "johto"),
    ("CIANWOOD_CITY", "Anemonia City", "Cianwood City", "city", "johto"),
    ("MAHOGANY_TOWN", "Mahagonia", "Mahogany Town", "town", "johto"),
    ("BLACKTHORN_CITY", "Ebenholz City", "Blackthorn City", "city", "johto"),
    ("PALLET_TOWN", "Alabastia", "Pallet Town", "town", "kanto"),
    ("VIRIDIAN_CITY", "Vertania City", "Viridian City", "city", "kanto"),
    ("PEWTER_CITY", "Marmoria City", "Pewter City", "city", "kanto"),
    ("CERULEAN_CITY", "Azuria City", "Cerulean City", "city", "kanto"),
    ("LAVENDER_TOWN", "Lavandia", "Lavender Town", "town", "kanto"),
    ("VERMILION_CITY", "Orania City", "Vermilion City", "city", "kanto"),
    ("CELADON_CITY", "Prismania City", "Celadon City", "city", "kanto"),
    ("SAFFRON_CITY", "Saffronia City", "Saffron City", "city", "kanto"),
    ("FUCHSIA_CITY", "Fuchsania City", "Fuchsia City", "city", "kanto"),
    ("CINNABAR_ISLAND", "Zinnoberinsel", "Cinnabar Island", "town", "kanto"),
]

PLACES = [
    (["LAKE_OF_RAGE"], "See des Zorns", "Lake of Rage", "johto"),
    (["NATIONAL_PARK"], "Nationalpark", "National Park", "johto"),
    (["RUINS_OF_ALPH_OUTSIDE"], "Alph-Ruinen", "Ruins of Alph", "johto"),
    (["SILVER_CAVE_OUTSIDE"], "Silberberg", "Mt. Silver", "johto"),
    (["MOUNT_MOON_SQUARE"], "Mondbergplatz", "Mt. Moon Square", "kanto"),
]


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def slugify(value: str) -> str:
    value = value.lower().replace(".", "")
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value))


def rgb8(values: tuple[int, int, int] | list[int]) -> tuple[int, int, int]:
    return tuple((value * 255 + 15) // 31 for value in values)


def parse_map_constants(root: Path) -> dict[str, dict]:
    maps: dict[str, dict] = {}
    group = 0
    for raw in read(root / "constants/map_constants.asm").splitlines():
        if re.match(r"\s*newgroup\s+", raw):
            group += 1
            continue
        match = re.match(r"\s*map_const\s+([A-Z0-9_]+),\s*(\d+),\s*(\d+)", raw)
        if match:
            key, width, height = match.groups()
            maps[key] = {"key": key, "width": int(width), "height": int(height), "group": group}
    return maps


def parse_outdoor_maps(root: Path, constants: dict[str, dict], expected_count: int = 72) -> dict[str, dict]:
    map_rows: dict[str, tuple[str, str, str]] = {}
    pattern = re.compile(r"^\s*map\s+(\w+),\s*(TILESET_[A-Z0-9_]+),\s*(TOWN|ROUTE),\s*(LANDMARK_[A-Z0-9_]+)", re.M)
    for label, tileset, environment, landmark in pattern.findall(read(root / "data/maps/maps.asm")):
        map_rows[label] = (tileset.removeprefix("TILESET_").lower(), environment.lower(), landmark)

    selected: dict[str, dict] = {}
    current: str | None = None
    for raw in read(root / "data/maps/attributes.asm").splitlines():
        header = re.match(r"\s*map_attributes\s+(\w+),\s*([A-Z0-9_]+)", raw)
        if header:
            label, key = header.groups()
            current = key if label in map_rows and key not in EXCLUDED_OUTDOOR_MAPS else None
            if current:
                if key not in constants:
                    raise RuntimeError(f"Missing map constant for {key}")
                tileset, environment, landmark = map_rows[label]
                selected[key] = {
                    **constants[key], "label": label, "tileset": tileset,
                    "environment": environment, "landmark": landmark, "connections": [],
                }
            continue
        connection = re.match(r"\s*connection\s+(north|south|west|east),\s*\w+,\s*([A-Z0-9_]+),\s*(-?\d+)", raw)
        if connection and current:
            direction, target, offset = connection.groups()
            selected[current]["connections"].append((direction, target, int(offset)))

    if len(selected) != expected_count:
        raise RuntimeError(f"Expected {expected_count} outdoor maps, got {len(selected)}")
    return selected


def build_components(maps: dict[str, dict]) -> tuple[list[dict], list[str]]:
    unseen = set(maps)
    components: list[dict] = []
    conflicts: list[str] = []
    preferred_roots = ["NEW_BARK_TOWN", "PALLET_TOWN", "NATIONAL_PARK", "RUINS_OF_ALPH_OUTSIDE", "MOUNT_MOON_SQUARE", "ROUTE_23", "ROUTE_28", "BATTLE_TOWER_OUTSIDE"]
    while unseen:
        start = next((key for key in preferred_roots if key in unseen), min(unseen))
        positions = {start: (0, 0)}
        queue = deque([start])
        while queue:
            key = queue.popleft()
            current = maps[key]
            x, z = positions[key]
            for direction, target_key, offset in current["connections"]:
                if target_key not in maps:
                    continue
                target = maps[target_key]
                if direction == "north":
                    position = (x + offset, z - target["height"])
                elif direction == "south":
                    position = (x + offset, z + current["height"])
                elif direction == "west":
                    position = (x - target["width"], z + offset)
                else:
                    position = (x + current["width"], z + offset)
                if target_key not in positions:
                    positions[target_key] = position
                    queue.append(target_key)
                elif positions[target_key] != position:
                    conflicts.append(f"{key}->{target_key}: {positions[target_key]} / {position}")
        unseen -= positions.keys()
        min_x = min(positions[key][0] for key in positions)
        min_z = min(positions[key][1] for key in positions)
        normalized = {key: (x - min_x, z - min_z) for key, (x, z) in positions.items()}
        width = max(normalized[key][0] + maps[key]["width"] for key in normalized) * UNITS_PER_BLOCK
        height = max(normalized[key][1] + maps[key]["height"] for key in normalized) * UNITS_PER_BLOCK
        components.append({"maps": set(positions), "positions": normalized, "width": width, "height": height})
    return components, conflicts


def arrange_components(components: list[dict], maps: dict[str, dict], extra_positions: dict[str, int] | None = None) -> tuple[dict[str, tuple[int, int]], int, int]:
    johto = next(component for component in components if "NEW_BARK_TOWN" in component["maps"])
    kanto = next(component for component in components if "PALLET_TOWN" in component["maps"])
    placements = {id(johto): (MARGIN, MARGIN), id(kanto): (MARGIN + johto["width"] + COMPONENT_GAP, MARGIN)}
    bottom_z = MARGIN + max(johto["height"], kanto["height"]) + 24
    # The disconnected outdoor scenes sit beneath their respective region.
    # Spreading them across the full width keeps their HTML labels readable at overview zoom.
    small_positions = {
        "NATIONAL_PARK": 24, "RUINS_OF_ALPH_OUTSIDE": 120,
        "MOUNT_MOON_SQUARE": 540, "ROUTE_23": 620, "ROUTE_28": 700,
    }
    small_positions.update(extra_positions or {})
    for anchor, x in small_positions.items():
        component = next(component for component in components if anchor in component["maps"])
        placements[id(component)] = (x, bottom_z)

    origins: dict[str, tuple[int, int]] = {}
    max_x = max_z = 0
    for component in components:
        base_x, base_z = placements[id(component)]
        for key, (x, z) in component["positions"].items():
            origin = (base_x + x * UNITS_PER_BLOCK, base_z + z * UNITS_PER_BLOCK)
            origins[key] = origin
            max_x = max(max_x, origin[0] + maps[key]["width"] * UNITS_PER_BLOCK)
            max_z = max(max_z, origin[1] + maps[key]["height"] * UNITS_PER_BLOCK)
    width = math.ceil((max_x + MARGIN) / 32) * 32
    height = math.ceil((max_z + MARGIN) / 32) * 32
    return origins, width, height


def parse_palettes(root: Path) -> tuple[list[list[tuple[int, int, int]]], list[list[tuple[int, int, int]]]]:
    bg_rows = [list(map(int, re.findall(r"\d+", line))) for line in read(root / "gfx/tilesets/bg_tiles.pal").splitlines() if line.strip().startswith("RGB")]
    day = [[rgb8(row[index:index + 3]) for index in range(0, 12, 3)] for row in bg_rows[8:16]]
    roof_rows = [list(map(int, re.findall(r"\d+", line))) for line in read(root / "gfx/tilesets/roofs.pal").splitlines() if line.strip().startswith("RGB")]
    roof_colors = [rgb8(row[index:index + 3]) for row in roof_rows for index in range(0, len(row), 3)]
    roofs = [roof_colors[group * 4:group * 4 + 4] for group in range(len(roof_colors) // 4)]
    return day, roofs


def parse_roof_graphics(root: Path) -> list[str | None]:
    values: list[str | None] = []
    active = False
    for raw in read(root / "data/maps/roofs.asm").splitlines():
        if raw.strip() == "MapGroupRoofs:":
            active = True
            continue
        if active and "assert_table_length" in raw:
            break
        if active:
            match = re.match(r"\s*db\s+(-1|ROOF_[A-Z_]+)", raw)
            if match:
                token = match.group(1)
                values.append(None if token == "-1" else token.removeprefix("ROOF_").lower())
    return values


def parse_palette_map(path: Path) -> dict[int, tuple[str, int]]:
    """Return raw tile id -> (palette, source-PNG tile index).

    Gold/Silver only use the first 96 tiles. Crystal additionally loads 96
    tiles into VRAM bank 1, addressed as tile ids $80-$df; the PNG stores that
    second bank directly after the first one.
    """
    palettes: dict[int, tuple[str, int]] = {}
    offsets = {0: 0, 1: 128}
    source_offsets = {0: 0, 1: 96}
    for raw in read(path).splitlines():
        line = raw.split(";", 1)[0].strip()
        if not line.startswith("tilepal "):
            continue
        parts = [part.strip() for part in line.split(",")]
        bank = int(parts[0].split()[1])
        for palette in parts[1:]:
            raw_id = offsets[bank]
            source_id = source_offsets[bank]
            palettes[raw_id] = (palette, source_id)
            offsets[bank] += 1
            source_offsets[bank] += 1
    if len(palettes) < 96:
        raise RuntimeError(f"{path.name}: expected at least 96 tile palettes, got {len(palettes)}")
    return palettes


def colored_tiles(root: Path, spec: dict, day: list[list[tuple[int, int, int]]], roof_pals: list[list[tuple[int, int, int]]], roof_graphics: list[str | None], cache: dict) -> dict[int, Image.Image]:
    cache_key = (spec["tileset"], spec["group"])
    if cache_key in cache:
        return cache[cache_key]
    source = Image.open(root / f"gfx/tilesets/{spec['tileset']}.png").convert("L")
    palettes = parse_palette_map(root / f"gfx/tilesets/{spec['tileset']}_palette_map.asm")
    roof_name = roof_graphics[spec["group"]] if spec["group"] < len(roof_graphics) else None
    if roof_name and spec["tileset"] in {"johto", "johto_modern"}:
        roof = Image.open(root / f"gfx/tilesets/roofs/{roof_name}.png").convert("L")
        source = source.copy()
        for index in range(9):
            tile = roof.crop(((index % 3) * 8, (index // 3) * 8, (index % 3 + 1) * 8, (index // 3 + 1) * 8))
            source.paste(tile, (((10 + index) % 16) * 8, ((10 + index) // 16) * 8))

    tiles: dict[int, Image.Image] = {}
    source_count = source.width // 8 * (source.height // 8)
    for tile_id, (palette_name, source_id) in palettes.items():
        if source_id >= source_count:
            continue
        grayscale = source.crop(((source_id % 16) * 8, (source_id // 16) * 8, (source_id % 16 + 1) * 8, (source_id // 16 + 1) * 8))
        palette = list(day[PALETTE_IDS[palette_name]])
        if palette_name == "ROOF" and spec["group"] < len(roof_pals):
            palette[1], palette[2] = roof_pals[spec["group"]][0], roof_pals[spec["group"]][1]
        image = Image.new("RGB", (8, 8))
        image.putdata([palette[min(3, max(0, round((255 - value) / 85)))] for value in grayscale.tobytes()])
        tiles[tile_id] = image
    cache[cache_key] = tiles
    return tiles


def render_map(root: Path, spec: dict, day, roof_pals, roof_graphics, cache: dict) -> Image.Image:
    tiles = colored_tiles(root, spec, day, roof_pals, roof_graphics, cache)
    metatiles = (root / f"data/tilesets/{spec['tileset']}_metatiles.bin").read_bytes()
    blocks = (root / f"maps/{spec['label']}.blk").read_bytes()
    expected = spec["width"] * spec["height"]
    if len(blocks) != expected:
        raise RuntimeError(f"{spec['label']}.blk: expected {expected}, got {len(blocks)}")
    image = Image.new("RGB", (spec["width"] * BLOCK_PIXELS, spec["height"] * BLOCK_PIXELS), OCEAN)
    for bz in range(spec["height"]):
        for bx in range(spec["width"]):
            block = blocks[bz * spec["width"] + bx]
            start = block * 16
            if start + 16 > len(metatiles):
                raise RuntimeError(f"Metatile {block} outside {spec['tileset']}")
            for tz in range(4):
                for tx in range(4):
                    tile_id = metatiles[start + tz * 4 + tx]
                    if tile_id not in tiles:
                        if tile_id in range(96, 128) or tile_id >= 224:
                            continue  # unused/blank VRAM range in Crystal tilesets
                        raise RuntimeError(f"Tile {tile_id} outside {spec['tileset']}")
                    image.paste(tiles[tile_id], (bx * 32 + tx * 8, bz * 32 + tz * 8))
    return image


def parse_dex(root: Path) -> dict[str, int]:
    result: dict[str, int] = {}
    active = False
    value = 0
    for raw in read(root / "constants/pokemon_constants.asm").splitlines():
        line = raw.split(";", 1)[0].strip()
        if line == "const_def 1" and not active:
            active = True
            value = 1
            continue
        if active and line.startswith("DEF NUM_POKEMON"):
            break
        match = re.match(r"const\s+([A-Z0-9_]+)", line)
        if active and match:
            result[match.group(1)] = value
            value += 1
    if len(result) != 251:
        raise RuntimeError(f"Expected 251 Pokemon constants, got {len(result)}")
    return result


def preprocess_version(text: str, edition: str) -> list[str]:
    output: list[str] = []
    active = True
    stack: list[dict] = []
    for raw in text.splitlines():
        line = raw.split(";", 1)[0].strip()
        match = re.match(r"IF\s+DEF\(_(GOLD|SILVER)\)", line)
        if match:
            condition = match.group(1).lower() == edition
            stack.append({"parent": active, "matched": condition})
            active = active and condition
            continue
        match = re.match(r"ELIF\s+DEF\(_(GOLD|SILVER)\)", line)
        if match and stack:
            frame = stack[-1]
            condition = match.group(1).lower() == edition
            active = frame["parent"] and not frame["matched"] and condition
            frame["matched"] = frame["matched"] or condition
            continue
        if line == "ELSE" and stack:
            frame = stack[-1]
            active = frame["parent"] and not frame["matched"]
            frame["matched"] = True
            continue
        if line == "ENDC" and stack:
            active = stack.pop()["parent"]
            continue
        if active:
            output.append(line)
    return output


def merge_rows(target: list[dict], additions: list[dict]) -> list[dict]:
    merged = {row["id"]: dict(row) for row in target}
    for row in additions:
        if row["id"] not in merged:
            merged[row["id"]] = dict(row)
        else:
            old = merged[row["id"]]
            old["min"] = min(old["min"], row["min"])
            old["max"] = max(old["max"], row["max"])
            old["p"] = max(old["p"], row["p"])
    return sorted(merged.values(), key=lambda row: (-row["p"], row["id"]))


def aggregate_slots(rows: list[tuple[int, str]], weights: tuple[int, ...], dex: dict[str, int]) -> list[dict]:
    result: list[dict] = []
    for offset in range(0, len(rows), len(weights)):
        time_rows = rows[offset:offset + len(weights)]
        current: dict[int, dict] = {}
        for (level, species), chance in zip(time_rows, weights):
            pokemon_id = dex[species]
            if pokemon_id not in current:
                current[pokemon_id] = {"id": pokemon_id, "min": level, "max": level, "p": 0}
            entry = current[pokemon_id]
            entry["min"] = min(entry["min"], level)
            entry["max"] = max(entry["max"], level)
            entry["p"] += chance
        result = merge_rows(result, list(current.values()))
    return result


def parse_wild(root: Path, edition: str, dex: dict[str, int]) -> dict[str, dict[str, list[dict]]]:
    result: dict[str, dict[str, list[dict]]] = {}
    for filename, method, weights in [
        ("johto_grass.asm", "grass", GRASS_WEIGHTS), ("kanto_grass.asm", "grass", GRASS_WEIGHTS),
        ("johto_water.asm", "surf", WATER_WEIGHTS), ("kanto_water.asm", "surf", WATER_WEIGHTS),
    ]:
        lines = preprocess_version(read(root / "data/wild" / filename), edition)
        current: str | None = None
        rows: list[tuple[int, str]] = []
        for line in lines:
            start = re.match(r"def_(?:grass|water)_wildmons\s+([A-Z0-9_]+)", line)
            if start:
                current = start.group(1)
                rows = []
                continue
            if current and re.match(r"end_(?:grass|water)_wildmons", line):
                if len(rows) % len(weights):
                    raise RuntimeError(f"{filename}/{current}: {len(rows)} encounter slots")
                result.setdefault(current, {"grass": [], "surf": []})[method] = aggregate_slots(rows, weights, dex)
                current = None
                continue
            entry = re.match(r"db\s+(\d+),\s*([A-Z0-9_]+)$", line)
            if current and entry:
                rows.append((int(entry.group(1)), entry.group(2)))
    return result


def merge_wild_maps(keys: list[str], source: dict[str, dict[str, list[dict]]]) -> dict[str, list[dict]]:
    result = {"grass": [], "surf": []}
    for key in keys:
        part = source.get(key, {"grass": [], "surf": []})
        result["grass"] = merge_rows(result["grass"], part["grass"])
        result["surf"] = merge_rows(result["surf"], part["surf"])
    return result


def location_defs() -> list[dict]:
    definitions = [
        {"keys": [key], "de": de, "en": en, "type": place_type, "region": region, "showLabel": True}
        for key, de, en, place_type, region in TOWNS
    ]
    for number in range(1, 47):
        keys = ["ROUTE_10_NORTH", "ROUTE_10_SOUTH"] if number == 10 else [f"ROUTE_{number}"]
        definitions.append({
            "keys": keys, "de": f"Route {number}", "en": f"Route {number}", "type": "route",
            "region": "johto" if number >= 26 else "kanto", "showLabel": False,
        })
    definitions.extend({
        "keys": keys, "de": de, "en": en, "type": "place", "region": region, "showLabel": True,
    } for keys, de, en, region in PLACES)
    return definitions


def make_locations(maps, origins, wild_gold, wild_silver) -> list[dict]:
    locations = []
    covered: set[str] = set()
    for definition in location_defs():
        keys = definition["keys"]
        for key in keys:
            if key not in maps:
                raise RuntimeError(f"Location map missing: {key}")
        covered.update(keys)
        x1 = min(origins[key][0] for key in keys)
        z1 = min(origins[key][1] for key in keys)
        x2 = max(origins[key][0] + maps[key]["width"] * UNITS_PER_BLOCK for key in keys)
        z2 = max(origins[key][1] + maps[key]["height"] * UNITS_PER_BLOCK for key in keys)
        locations.append({
            "key": definition["en"].upper().replace(".", "").replace(" ", "_"),
            "slug": slugify(definition["en"]), "de": definition["de"], "en": definition["en"],
            "type": definition["type"], "region": definition["region"], "area": [x1, z1, x2, z2],
            "label": [round((x1 + x2) / 2, 1), round((z1 + z2) / 2, 1)],
            "showLabel": definition["showLabel"], "items": [], "trainers": [],
            "wild": {"gold": merge_wild_maps(keys, wild_gold), "silver": merge_wild_maps(keys, wild_silver)},
        })
    if covered != set(maps):
        raise RuntimeError(f"Unmapped outdoor maps: {sorted(set(maps) - covered)}")
    return locations


def write_pyramid(world: Image.Image, width: int, height: int, output: Path = TILE_OUTPUT) -> dict:
    resolved = output.resolve()
    if resolved.parent != KARTE.resolve() or resolved.name not in {"tiles-gold-silver", "tiles-crystal"}:
        raise RuntimeError(f"Refusing unexpected tile output: {resolved}")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir()
    manifest_levels = []
    for zoom in LEVELS:
        scale = 2 ** zoom
        level_image = world if zoom == NATIVE_ZOOM else world.resize((width * scale, height * scale), Image.Resampling.NEAREST)
        folder = output / str(zoom)
        folder.mkdir()
        sheets = []
        nx = math.ceil(level_image.width / SHEET_SIZE)
        nz = math.ceil(level_image.height / SHEET_SIZE)
        for sz in range(nz):
            for sx in range(nx):
                left, top = sx * SHEET_SIZE, sz * SHEET_SIZE
                crop = level_image.crop((left, top, min(level_image.width, left + SHEET_SIZE), min(level_image.height, top + SHEET_SIZE)))
                if zoom != 0 and ImageChops.difference(crop, Image.new("RGB", crop.size, OCEAN)).getbbox() is None:
                    continue
                key = f"{sx}_{sz}"
                crop.save(folder / f"{key}.webp", "WEBP", lossless=True, method=6)
                sheets.append(key)
        manifest_levels.append({"z": zoom, "size": SHEET_SIZE, "sheets": sheets})
    manifest = {"version": 3, "width": width, "height": height, "nativeZoom": NATIVE_ZOOM, "levels": manifest_levels}
    (output / "index.json").write_text(json.dumps(manifest, separators=(",", ":")), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="pret/pokegold checkout")
    parser.add_argument("--preview", type=Path, help="optional overview PNG outside the tile directory")
    args = parser.parse_args()
    root = args.source.resolve()
    required = [root / "constants/map_constants.asm", root / "gfx/tilesets/johto.png", root / "maps/NewBarkTown.blk"]
    if not all(path.exists() for path in required):
        raise SystemExit(f"Not a pret/pokegold checkout: {root}")

    constants = parse_map_constants(root)
    maps = parse_outdoor_maps(root, constants)
    components, conflicts = build_components(maps)
    origins, width, height = arrange_components(components, maps)
    day, roof_pals = parse_palettes(root)
    roof_graphics = parse_roof_graphics(root)

    world = Image.new("RGB", (width * 2 ** NATIVE_ZOOM, height * 2 ** NATIVE_ZOOM), OCEAN)
    cache: dict = {}
    for index, (key, spec) in enumerate(maps.items(), 1):
        image = render_map(root, spec, day, roof_pals, roof_graphics, cache)
        x, z = origins[key]
        world.paste(image, (x * 2 ** NATIVE_ZOOM, z * 2 ** NATIVE_ZOOM))
        if index % 12 == 0:
            print(f"Rendered {index}/{len(maps)} maps")

    dex = parse_dex(root)
    wild_gold = parse_wild(root, "gold", dex)
    wild_silver = parse_wild(root, "silver", dex)
    locations = make_locations(maps, origins, wild_gold, wild_silver)
    try:
        commit = subprocess.run(["git", "-C", str(root), "rev-parse", "--short=12", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        commit = "unknown"
    data = {
        "version": 1, "source": f"pret/pokegold@{commit}",
        "mapSource": "Game Boy Color tilesets, palettes, metatiles, map blocks and connections",
        "mapAuthor": "GAME FREAK / Nintendo", "width": width, "height": height, "origin": [0, 0],
        "locations": locations,
    }
    DATA_OUTPUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest = write_pyramid(world, width, height)
    (TILE_OUTPUT / "SOURCE.txt").write_text(
        "Pokémon Gold / Silber – Kartenquellen\n"
        "=======================================\n\n"
        "Die Kartenbilder wurden aus der vollständigen pret/pokegold-Disassembly\n"
        "gerendert. Verwendet werden die originalen Game-Boy-Color-Tilesets,\n"
        "Tagespaletten, Dachgrafiken, Metatiles, Map-Blöcke und Kartenverbindungen.\n\n"
        "Die Welt umfasst 72 Außenkarten aus Johto und Kanto. Die Funddaten werden\n"
        "ebenfalls direkt aus den Gold-/Silber-Begegnungstabellen der Disassembly\n"
        "erzeugt; Morgen-, Tages- und Nachtbegegnungen werden für die gemeinsame\n"
        "Kartenansicht zusammengeführt.\n\n"
        "Quelle: https://github.com/pret/pokegold\n"
        f"Stand: {commit}\n\n"
        "Pokémon, die Karten- und Grafikdaten sind Eigentum von GAME FREAK, Nintendo,\n"
        "Creatures Inc. und The Pokémon Company. Die Ausgabe dient nur der privaten,\n"
        "lokalen Darstellung innerhalb des Pokémon Hubs.\n",
        encoding="utf-8",
    )
    if args.preview:
        preview = world.resize((width * 2, height * 2), Image.Resampling.NEAREST)
        preview.save(args.preview)

    wild_places = sum(bool(location["wild"]["gold"]["grass"] or location["wild"]["gold"]["surf"]) for location in locations)
    differences = sum(location["wild"]["gold"] != location["wild"]["silver"] for location in locations)
    sheets = sum(len(level["sheets"]) for level in manifest["levels"])
    print(f"Gold/Silver: {len(maps)} outdoor maps, {len(locations)} locations, {width}x{height} units")
    print(f"Encounters: {wild_places} locations, {differences} version differences")
    print(f"Tiles: {sheets} WebP sheets; {len(components)} components; {len(conflicts)} documented one-block conflicts")


if __name__ == "__main__":
    main()
