#!/usr/bin/env python3
"""Build the Pokemon Red/Blue Kanto map from a pret/pokered checkout.

Usage:
    python Karte/tools/build-kanto.py /path/to/pokered

The script renders the connected outdoor maps into the local sheet pyramid in
``Karte/tiles-kanto`` and writes the clickable map data to ``Karte/kanto.json``.
Only source assets from pret/pokered are read; a ROM is not required.
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

from PIL import Image


HERE = Path(__file__).resolve().parent
KARTE = HERE.parent
TILE_SIZE = 8
BLOCK_TILES = 4
BLOCK_PIXELS = TILE_SIZE * BLOCK_TILES
UNITS_PER_BLOCK = 2
NATIVE_ZOOM = 4
SHEET_SIZE = 2048
LEVELS = (0, 2, 4)
MARGIN = 4
SLOT_WEIGHTS = (51, 51, 39, 25, 25, 25, 13, 13, 11, 3)

# Four deliberately restrained Game Boy tones.  The source PNGs use the four
# luminance values 0, 85, 170 and 255, so nearest-neighbour scaling stays crisp.
PALETTE = (
    (16, 41, 45),
    (50, 84, 70),
    (125, 154, 99),
    (220, 231, 174),
)
OCEAN = (8, 27, 35)


PLACE_NAMES = {
    "PALLET_TOWN": ("Alabastia", "Pallet Town", "town"),
    "VIRIDIAN_CITY": ("Vertania City", "Viridian City", "city"),
    "PEWTER_CITY": ("Marmoria City", "Pewter City", "city"),
    "CERULEAN_CITY": ("Azuria City", "Cerulean City", "city"),
    "LAVENDER_TOWN": ("Lavandia", "Lavender Town", "town"),
    "VERMILION_CITY": ("Orania City", "Vermilion City", "city"),
    "CELADON_CITY": ("Prismania City", "Celadon City", "city"),
    "FUCHSIA_CITY": ("Fuchsania City", "Fuchsia City", "city"),
    "CINNABAR_ISLAND": ("Zinnoberinsel", "Cinnabar Island", "town"),
    "INDIGO_PLATEAU": ("Indigo Plateau", "Indigo Plateau", "place"),
    "SAFFRON_CITY": ("Saffronia City", "Saffron City", "city"),
}
for _route in range(1, 26):
    PLACE_NAMES[f"ROUTE_{_route}"] = (f"Route {_route}", f"Route {_route}", "route")


TRAINER_DE = {
    "YOUNGSTER": "Teenager", "BUG_CATCHER": "Käfersammler", "LASS": "Göre",
    "SAILOR": "Matrose", "JR_TRAINER_M": "Pfadfinder", "JR_TRAINER_F": "Pfadfinderin",
    "POKEMANIAC": "Pokémaniac", "SUPER_NERD": "Supernerd", "HIKER": "Wanderer",
    "BIKER": "Biker", "BURGLAR": "Dieb", "ENGINEER": "Ingenieur", "FISHER": "Angler",
    "SWIMMER": "Schwimmer", "CUE_BALL": "Rowdy", "GAMBLER": "Spieler",
    "BEAUTY": "Schönheit", "PSYCHIC_TR": "Medium", "ROCKER": "Rocker",
    "JUGGLER": "Jongleur", "TAMER": "Dompteur", "BIRD_KEEPER": "Vogelfänger",
    "BLACKBELT": "Karateka", "RIVAL1": "Rivale", "RIVAL2": "Rivale",
    "RIVAL3": "Rivale", "SCIENTIST": "Forscher", "GIOVANNI": "Giovanni",
    "ROCKET": "Rocket", "COOLTRAINER_M": "Ass-Trainer", "COOLTRAINER_F": "Ass-Trainerin",
    "BROCK": "Rocko", "MISTY": "Misty", "LT_SURGE": "Major Bob", "ERIKA": "Erika",
    "KOGA": "Koga", "BLAINE": "Pyro", "SABRINA": "Sabrina", "GENTLEMAN": "Gentleman",
    "BRUNO": "Bruno", "LORELEI": "Lorelei", "CHANNELER": "Exorzistin",
    "AGATHA": "Agatha", "LANCE": "Siegfried",
}
TRAINER_EN = {
    "JR_TRAINER_M": "Jr. Trainer M", "JR_TRAINER_F": "Jr. Trainer F",
    "POKEMANIAC": "Pokémaniac", "SUPER_NERD": "Super Nerd", "CUE_BALL": "Cue Ball",
    "PSYCHIC_TR": "Psychic", "BIRD_KEEPER": "Bird Keeper", "BLACKBELT": "Blackbelt",
    "RIVAL1": "Rival", "RIVAL2": "Rival", "RIVAL3": "Rival",
    "COOLTRAINER_M": "Cooltrainer M", "COOLTRAINER_F": "Cooltrainer F",
    "LT_SURGE": "Lt. Surge",
}


def read(path: Path) -> str:
    return path.read_text(encoding="utf-8")


def parse_map_constants(root: Path) -> dict[str, dict]:
    out: dict[str, dict] = {}
    pattern = re.compile(r"^\s*map_const\s+([A-Z0-9_]+),\s*(\d+),\s*(\d+)", re.M)
    for key, width, height in pattern.findall(read(root / "constants/map_constants.asm")):
        if key in PLACE_NAMES:
            out[key] = {"key": key, "width": int(width), "height": int(height)}
    if set(out) != set(PLACE_NAMES):
        missing = sorted(set(PLACE_NAMES) - set(out))
        raise RuntimeError(f"Outdoor map constants missing: {missing}")
    return out


def parse_headers(root: Path, maps: dict[str, dict]) -> None:
    header_re = re.compile(r"^\s*map_header\s+([A-Za-z0-9_]+),\s*([A-Z0-9_]+),\s*([A-Z0-9_]+)", re.M)
    conn_re = re.compile(r"^\s*connection\s+(north|south|west|east),\s*([A-Za-z0-9_]+),\s*([A-Z0-9_]+),\s*(-?\d+)", re.M)
    for path in sorted((root / "data/maps/headers").glob("*.asm")):
        text = read(path)
        match = header_re.search(text)
        if not match:
            continue
        label, key, tileset = match.groups()
        if key not in maps:
            continue
        maps[key].update({
            "label": label,
            "tileset": tileset.lower(),
            "connections": [
                {"dir": direction, "label": target_label, "key": target, "offset": int(offset)}
                for direction, target_label, target, offset in conn_re.findall(text)
                if target in maps
            ],
        })
    bad = [key for key, value in maps.items() if "label" not in value]
    if bad:
        raise RuntimeError(f"No map header found for: {bad}")


def connected_positions(maps: dict[str, dict]) -> dict[str, tuple[int, int]]:
    positions: dict[str, tuple[int, int]] = {"PALLET_TOWN": (0, 0)}
    queue = deque(["PALLET_TOWN"])
    conflicts: list[str] = []
    while queue:
        key = queue.popleft()
        current = maps[key]
        x, y = positions[key]
        for connection in current["connections"]:
            target_key = connection["key"]
            target = maps[target_key]
            offset = connection["offset"]
            direction = connection["dir"]
            if direction == "north":
                position = (x + offset, y - target["height"])
            elif direction == "south":
                position = (x + offset, y + current["height"])
            elif direction == "west":
                position = (x - target["width"], y + offset)
            else:
                position = (x + current["width"], y + offset)
            if target_key not in positions:
                positions[target_key] = position
                queue.append(target_key)
            elif positions[target_key] != position:
                conflicts.append(f"{key} -> {target_key}: {position} != {positions[target_key]}")
    if len(positions) != len(maps):
        missing = sorted(set(maps) - set(positions))
        raise RuntimeError(f"Outdoor connection graph is incomplete: {missing}")
    # Route 22 <-> Route 23 is marked unnecessary in the disassembly.  It is
    # nevertheless geometrically consistent in the current source; any future
    # inconsistency should be made visible instead of silently moving a map.
    if conflicts:
        raise RuntimeError("Inconsistent map connections:\n" + "\n".join(conflicts))
    return positions


def colorize(source: Image.Image) -> Image.Image:
    source = source.convert("L")
    channels = []
    for channel in range(3):
        lookup = []
        for value in range(256):
            index = min(3, max(0, int(round(value / 85))))
            lookup.append(PALETTE[index][channel])
        channels.append(source.point(lookup))
    return Image.merge("RGB", tuple(channels))


def render_map(root: Path, spec: dict, tileset_cache: dict[str, tuple[Image.Image, bytes]]) -> Image.Image:
    tileset_name = spec["tileset"]
    if tileset_name not in tileset_cache:
        sheet = colorize(Image.open(root / f"gfx/tilesets/{tileset_name}.png"))
        blocks = (root / f"gfx/blocksets/{tileset_name}.bst").read_bytes()
        if len(blocks) % 16:
            raise RuntimeError(f"Invalid blockset size: {tileset_name}")
        tileset_cache[tileset_name] = (sheet, blocks)
    sheet, blocks = tileset_cache[tileset_name]
    block_ids = (root / f"maps/{spec['label']}.blk").read_bytes()
    expected = spec["width"] * spec["height"]
    if len(block_ids) != expected:
        raise RuntimeError(f"{spec['label']}.blk: expected {expected} blocks, got {len(block_ids)}")
    image = Image.new("RGB", (spec["width"] * BLOCK_PIXELS, spec["height"] * BLOCK_PIXELS))
    for by in range(spec["height"]):
        for bx in range(spec["width"]):
            block_id = block_ids[by * spec["width"] + bx]
            start = block_id * 16
            if start + 16 > len(blocks):
                raise RuntimeError(f"Block {block_id} outside {tileset_name}.bst")
            for ty in range(4):
                for tx in range(4):
                    tile_id = blocks[start + ty * 4 + tx]
                    sx, sy = tile_id % 16 * TILE_SIZE, tile_id // 16 * TILE_SIZE
                    tile = sheet.crop((sx, sy, sx + TILE_SIZE, sy + TILE_SIZE))
                    image.paste(tile, (bx * BLOCK_PIXELS + tx * TILE_SIZE, by * BLOCK_PIXELS + ty * TILE_SIZE))
    return image


def parse_dex_ids(root: Path) -> dict[str, int]:
    out: dict[str, int] = {}
    next_id = 0
    for raw in read(root / "constants/pokedex_constants.asm").splitlines():
        line = raw.split(";", 1)[0].strip()
        if line == "const_def":
            next_id = 0
        match = re.match(r"const\s+DEX_([A-Z0-9_]+)", line)
        if match:
            next_id += 1
            out[match.group(1)] = next_id
    if len(out) != 151:
        raise RuntimeError(f"Expected 151 Pokedex constants, got {len(out)}")
    return out


def parse_wild_file(path: Path, edition: str, dex: dict[str, int]) -> dict[str, list[dict]]:
    result = {"grass": [], "surf": []}
    slots: dict[str, list[tuple[int, str]]] = {"grass": [], "surf": []}
    mode: str | None = None
    active = True
    conditions: list[tuple[bool, bool]] = []
    for raw in read(path).splitlines():
        line = raw.split(";", 1)[0].strip()
        match = re.match(r"IF\s+DEF\(_(RED|BLUE)\)", line)
        if match:
            parent = active
            condition = match.group(1).lower() == edition
            conditions.append((parent, condition))
            active = parent and condition
            continue
        if line == "ELSE" and conditions:
            parent, condition = conditions[-1]
            conditions[-1] = (parent, not condition)
            active = parent and not condition
            continue
        if line == "ENDC" and conditions:
            parent, _condition = conditions.pop()
            active = parent
            continue
        start = re.match(r"def_(grass|water)_wildmons\s+(\d+)", line)
        if start:
            mode = "grass" if start.group(1) == "grass" else "surf"
            continue
        if line.startswith("end_grass_wildmons") or line.startswith("end_water_wildmons"):
            mode = None
            continue
        entry = re.match(r"db\s+(\d+),\s*([A-Z0-9_]+)", line)
        if active and mode and entry:
            slots[mode].append((int(entry.group(1)), entry.group(2)))
    for method, rows in slots.items():
        if not rows:
            continue
        if len(rows) != 10:
            raise RuntimeError(f"{path.name} ({edition}/{method}): expected 10 slots, got {len(rows)}")
        aggregate: dict[int, dict] = {}
        order: list[int] = []
        for index, (level, species) in enumerate(rows):
            pokemon_id = dex.get(species)
            if not pokemon_id:
                raise RuntimeError(f"Unknown Pokemon constant {species} in {path}")
            if pokemon_id not in aggregate:
                aggregate[pokemon_id] = {"id": pokemon_id, "weight": 0, "min": level, "max": level}
                order.append(pokemon_id)
            entry = aggregate[pokemon_id]
            entry["weight"] += SLOT_WEIGHTS[index]
            entry["min"] = min(entry["min"], level)
            entry["max"] = max(entry["max"], level)
        values = []
        for pokemon_id in order:
            entry = aggregate[pokemon_id]
            percentage = round(entry.pop("weight") * 100 / 256, 1)
            entry["p"] = int(percentage) if percentage.is_integer() else percentage
            values.append(entry)
        result[method] = sorted(values, key=lambda entry: (-entry["p"], entry["id"]))
    return result


def wild_for_map(root: Path, spec: dict, dex: dict[str, int]) -> dict[str, dict]:
    label = spec["label"]
    if spec["key"] in ("ROUTE_19", "ROUTE_20"):
        label = "SeaRoutes"
    path = root / f"data/wild/maps/{label}.asm"
    if not path.exists():
        empty = {"grass": [], "surf": []}
        return {"red": dict(empty), "blue": dict(empty)}
    return {
        "red": parse_wild_file(path, "red", dex),
        "blue": parse_wild_file(path, "blue", dex),
    }


def parse_item_constants(root: Path) -> tuple[set[str], dict[str, int]]:
    text = read(root / "constants/item_constants.asm")
    constants: set[str] = set()
    for match in re.finditer(r"^\s*const\s+([A-Z][A-Z0-9_]+)", text, re.M):
        name = match.group(1)
        if not name.startswith("FLOOR_"):
            constants.add(name)
    tm_numbers: dict[str, int] = {}
    for index, move in enumerate(re.findall(r"^\s*add_tm\s+([A-Z0-9_]+)", text, re.M), 1):
        constants.add("TM_" + move)
        tm_numbers["TM_" + move] = index
    for index, move in enumerate(re.findall(r"^\s*add_hm\s+([A-Z0-9_]+)", text, re.M), 1):
        constants.add("HM_" + move)
        tm_numbers["HM_" + move] = index
    return constants, tm_numbers


def item_lookup() -> dict[str, dict]:
    path = KARTE / "platin.json"
    if not path.exists():
        return {}
    data = json.loads(read(path))
    out: dict[str, dict] = {}
    for location in data.get("locations", []):
        for item in location.get("items", []):
            if item.get("id") and item["id"] not in out:
                out[item["id"]] = {"de": item.get("de"), "en": item.get("en")}
    return out


def item_details(name: str, tm_numbers: dict[str, int], translated: dict[str, dict]) -> dict:
    if name.startswith("TM_"):
        number = tm_numbers[name]
        label = f"TM{number:02d}"
        return {"kind": "tm", "id": label.lower(), "de": label, "en": label}
    if name.startswith("HM_"):
        number = tm_numbers[name]
        de, en = f"VM{number:02d}", f"HM{number:02d}"
        return {"kind": "tm", "id": f"hm{number:02d}", "de": de, "en": en}
    aliases = {
        "PARLYZ_HEAL": "paralyze-heal", "GUARD_SPEC": "guard-spec",
        "S_S_TICKET": "ss-ticket", "EXP_ALL": "exp-share", "ELIXER": "elixir",
        "MAX_ELIXER": "max-elixir", "ITEMFINDER": "dowsing-machine",
        "OAKS_PARCEL": "parcel",
    }
    slug = aliases.get(name, name.lower().replace("_", "-"))
    english_special = {
        "POKE_BALL": "Poké Ball", "PARLYZ_HEAL": "Parlyz Heal", "S_S_TICKET": "S.S. Ticket",
        "EXP_ALL": "Exp. All", "GUARD_SPEC": "Guard Spec.", "OAKS_PARCEL": "Oak's Parcel",
    }
    english = english_special.get(name, name.replace("_", " ").title())
    known = translated.get(slug, {})
    return {"kind": "ball", "id": slug, "de": known.get("de") or english, "en": known.get("en") or english}


def split_args(line: str) -> list[str]:
    line = line.split(";", 1)[0]
    return [part.strip() for part in line.split(None, 1)[1].split(",")]


def trainer_names(cls: str) -> tuple[str, str]:
    english = TRAINER_EN.get(cls, cls.replace("_", " ").title())
    return TRAINER_DE.get(cls, english), english


def parse_object_events(
    root: Path,
    spec: dict,
    origin_units: tuple[int, int],
    item_constants: set[str],
    tm_numbers: dict[str, int],
    translated: dict[str, dict],
) -> tuple[list[dict], list[dict]]:
    items: list[dict] = []
    trainers: list[dict] = []
    path = root / f"data/maps/objects/{spec['label']}.asm"
    if not path.exists():
        return items, trainers
    ox, oy = origin_units
    for raw in read(path).splitlines():
        line = raw.strip()
        if not line.startswith("object_event "):
            continue
        parts = split_args(line)
        if len(parts) < 6 or not parts[0].lstrip("-").isdigit() or not parts[1].lstrip("-").isdigit():
            continue
        x, y, sprite = int(parts[0]), int(parts[1]), parts[2]
        pos = [ox + x, oy + y]
        opponent = next((value[4:] for value in parts[6:] if value.startswith("OPP_")), None)
        if opponent:
            de, en = trainer_names(opponent)
            trainers.append({"cls": opponent, "de": de, "en": en, "pos": pos})
            continue
        if sprite != "SPRITE_POKE_BALL":
            continue
        item_name = next((value for value in reversed(parts[6:]) if value in item_constants), None)
        if item_name:
            item = item_details(item_name, tm_numbers, translated)
            item["pos"] = pos
            items.append(item)
    return items, trainers


def parse_hidden_items(
    root: Path,
    origins: dict[str, tuple[int, int]],
    tm_numbers: dict[str, int],
    translated: dict[str, dict],
) -> dict[str, list[dict]]:
    out: dict[str, list[dict]] = {key: [] for key in origins}
    current_map: str | None = None
    for raw in read(root / "data/events/hidden_events.asm").splitlines():
        line = raw.split(";", 1)[0].strip()
        header = re.match(r"hidden_events_for\s+([A-Z0-9_]+)", line)
        if header:
            current_map = header.group(1)
            continue
        event = re.match(r"hidden_event\s+(\d+),\s*(\d+),\s*HiddenItems,\s*([A-Z0-9_]+)", line)
        if not event or current_map not in origins:
            continue
        x, y, item_name = int(event.group(1)), int(event.group(2)), event.group(3)
        ox, oy = origins[current_map]
        item = item_details(item_name, tm_numbers, translated)
        item["kind"] = "hidden"
        item["pos"] = [ox + x, oy + y]
        out[current_map].append(item)
    return out


def slug_for(key: str) -> str:
    return key.lower().replace("_", "-")


def write_sheet_pyramid(world: Image.Image, width: int, height: int, output: Path) -> dict:
    resolved = output.resolve()
    if resolved.parent != KARTE.resolve() or resolved.name != "tiles-kanto":
        raise RuntimeError(f"Refusing to replace unexpected output directory: {resolved}")
    if output.exists():
        shutil.rmtree(output)
    output.mkdir(parents=True)
    manifest_levels = []
    for zoom in LEVELS:
        scale = 2 ** zoom
        size = (width * scale, height * scale)
        level_image = world if zoom == NATIVE_ZOOM else world.resize(size, Image.Resampling.NEAREST)
        folder = output / str(zoom)
        folder.mkdir()
        sheets = []
        nx, ny = math.ceil(size[0] / SHEET_SIZE), math.ceil(size[1] / SHEET_SIZE)
        for sy in range(ny):
            for sx in range(nx):
                x0, y0 = sx * SHEET_SIZE, sy * SHEET_SIZE
                crop = level_image.crop((x0, y0, min(size[0], x0 + SHEET_SIZE), min(size[1], y0 + SHEET_SIZE)))
                key = f"{sx}_{sy}"
                crop.save(folder / f"{key}.webp", "WEBP", lossless=True, method=6)
                sheets.append(key)
        manifest_levels.append({"z": zoom, "size": SHEET_SIZE, "sheets": sheets})
    manifest = {"version": 1, "width": width, "height": height, "nativeZoom": NATIVE_ZOOM, "levels": manifest_levels}
    (output / "index.json").write_text(json.dumps(manifest, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="pret/pokered checkout")
    args = parser.parse_args()
    root = args.source.resolve()
    required = (root / "constants/map_constants.asm", root / "gfx/tilesets/overworld.png", root / "maps/PalletTown.blk")
    if not all(path.exists() for path in required):
        raise SystemExit(f"Not a pret/pokered checkout: {root}")

    maps = parse_map_constants(root)
    parse_headers(root, maps)
    positions = connected_positions(maps)
    min_x = min(positions[key][0] for key in maps)
    min_y = min(positions[key][1] for key in maps)
    max_x = max(positions[key][0] + maps[key]["width"] for key in maps)
    max_y = max(positions[key][1] + maps[key]["height"] for key in maps)
    width = (max_x - min_x) * UNITS_PER_BLOCK + MARGIN * 2
    height = (max_y - min_y) * UNITS_PER_BLOCK + MARGIN * 2
    origins = {
        key: ((x - min_x) * UNITS_PER_BLOCK + MARGIN, (y - min_y) * UNITS_PER_BLOCK + MARGIN)
        for key, (x, y) in positions.items()
    }

    world = Image.new("RGB", (width * 2 ** NATIVE_ZOOM, height * 2 ** NATIVE_ZOOM), OCEAN)
    tileset_cache: dict[str, tuple[Image.Image, bytes]] = {}
    for key, spec in maps.items():
        image = render_map(root, spec, tileset_cache)
        ox, oy = origins[key]
        world.paste(image, (ox * 2 ** NATIVE_ZOOM, oy * 2 ** NATIVE_ZOOM))

    dex = parse_dex_ids(root)
    item_constants, tm_numbers = parse_item_constants(root)
    translated = item_lookup()
    hidden = parse_hidden_items(root, origins, tm_numbers, translated)
    locations = []
    city_order = list(PLACE_NAMES)[:11]
    route_order = [f"ROUTE_{number}" for number in range(1, 26)]
    for key in city_order + route_order:
        spec = maps[key]
        de, en, place_type = PLACE_NAMES[key]
        ox, oy = origins[key]
        x1 = ox + spec["width"] * UNITS_PER_BLOCK
        y1 = oy + spec["height"] * UNITS_PER_BLOCK
        items, trainers = parse_object_events(root, spec, (ox, oy), item_constants, tm_numbers, translated)
        items.extend(hidden.get(key, []))
        locations.append({
            "key": key,
            "slug": slug_for(key),
            "de": de,
            "en": en,
            "type": place_type,
            "area": [ox, oy, x1, y1],
            "label": [round((ox + x1) / 2, 1), round((oy + y1) / 2, 1)],
            "items": items,
            "trainers": trainers,
            "wild": wild_for_map(root, spec, dex),
        })

    try:
        commit = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "--short=12", "HEAD"],
            check=True, capture_output=True, text=True,
        ).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        commit = "unknown"
    data = {
        "version": 1,
        "source": f"pret/pokered@{commit}",
        "width": width,
        "height": height,
        "locations": locations,
    }
    (KARTE / "kanto.json").write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest = write_sheet_pyramid(world, width, height, KARTE / "tiles-kanto")

    item_count = sum(len(location["items"]) for location in locations)
    trainer_count = sum(len(location["trainers"]) for location in locations)
    wild_count = sum(bool(location["wild"]["red"]["grass"] or location["wild"]["red"]["surf"]) for location in locations)
    sheet_count = sum(len(level["sheets"]) for level in manifest["levels"])
    print(f"Kanto: {width} x {height} game units, {len(locations)} outdoor maps")
    print(f"Data: {item_count} outdoor items, {trainer_count} outdoor trainers, {wild_count} maps with wild Pokemon")
    print(f"Tiles: {sheet_count} WebP sheets at zoom levels {', '.join(map(str, LEVELS))}")


if __name__ == "__main__":
    main()
