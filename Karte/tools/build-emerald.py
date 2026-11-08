#!/usr/bin/env python3
"""Render Pokemon Emerald's outdoor Hoenn world from pret/pokeemerald.

The renderer reads the repository's indexed GBA tiles, palettes, metatiles,
layout blocks, map connections and encounter JSON. A ROM is not required.

Usage:
    python Karte/tools/build-emerald.py /path/to/pokeemerald [--preview out.png]
"""

from __future__ import annotations

import argparse
import json
import math
import re
import shutil
import struct
import subprocess
from collections import deque
from pathlib import Path

from PIL import Image, ImageChops


HERE = Path(__file__).resolve().parent
KARTE = HERE.parent
TILE_OUTPUT = KARTE / "tiles-emerald"
DATA_OUTPUT = KARTE / "emerald.json"
TILE_SIZE = 8
METATILE_PIXELS = 16
NATIVE_ZOOM = 4
SHEET_SIZE = 2048
LEVELS = (4, 2, 0)
WORLD_WIDTH = 832
WORLD_HEIGHT = 512
MARGIN = 8
OCEAN = (6, 27, 39)

EXTRA_NAMES = [
    "BattleFrontier_OutsideEast", "BattleFrontier_OutsideWest",
    "JaggedPass", "MtChimney", "MtPyre_Exterior", "MtPyre_Summit",
    "PetalburgWoods", "SafariZone_North", "SafariZone_Northeast",
    "SafariZone_Northwest", "SafariZone_South", "SafariZone_Southeast",
    "SafariZone_Southwest", "SkyPillar_Outside", "SouthernIsland_Exterior",
]

TOWNS = [
    ("MAP_LITTLEROOT_TOWN", "Wurzelheim", "Littleroot Town", "town"),
    ("MAP_OLDALE_TOWN", "Rosaltstadt", "Oldale Town", "town"),
    ("MAP_DEWFORD_TOWN", "Faustauhaven", "Dewford Town", "town"),
    ("MAP_LAVARIDGE_TOWN", "Bad Lavastadt", "Lavaridge Town", "town"),
    ("MAP_FALLARBOR_TOWN", "Laubwechselfeld", "Fallarbor Town", "town"),
    ("MAP_VERDANTURF_TOWN", "Wiesenflur", "Verdanturf Town", "town"),
    ("MAP_PACIFIDLOG_TOWN", "Floßbrunn", "Pacifidlog Town", "town"),
    ("MAP_PETALBURG_CITY", "Blütenburg City", "Petalburg City", "city"),
    ("MAP_SLATEPORT_CITY", "Graphitport City", "Slateport City", "city"),
    ("MAP_MAUVILLE_CITY", "Malvenfroh City", "Mauville City", "city"),
    ("MAP_RUSTBORO_CITY", "Metarost City", "Rustboro City", "city"),
    ("MAP_FORTREE_CITY", "Baumhausen City", "Fortree City", "city"),
    ("MAP_LILYCOVE_CITY", "Seegrasulb City", "Lilycove City", "city"),
    ("MAP_MOSSDEEP_CITY", "Moosbach City", "Mossdeep City", "city"),
    ("MAP_SOOTOPOLIS_CITY", "Xeneroville", "Sootopolis City", "city"),
    ("MAP_EVER_GRANDE_CITY", "Prachtpolis City", "Ever Grande City", "city"),
]

PLACES = [
    (["MAP_BATTLE_FRONTIER_OUTSIDE_WEST", "MAP_BATTLE_FRONTIER_OUTSIDE_EAST"], "Kampffront", "Battle Frontier"),
    (["MAP_SAFARI_ZONE_NORTHWEST", "MAP_SAFARI_ZONE_NORTH", "MAP_SAFARI_ZONE_NORTHEAST", "MAP_SAFARI_ZONE_SOUTHWEST", "MAP_SAFARI_ZONE_SOUTH", "MAP_SAFARI_ZONE_SOUTHEAST"], "Safari-Zone", "Safari Zone"),
    (["MAP_PETALBURG_WOODS"], "Blütenburgwald", "Petalburg Woods"),
    (["MAP_JAGGED_PASS"], "Steilpass", "Jagged Pass"),
    (["MAP_MT_CHIMNEY"], "Schlotberg", "Mt. Chimney"),
    (["MAP_MT_PYRE_EXTERIOR", "MAP_MT_PYRE_SUMMIT"], "Pyroberg", "Mt. Pyre"),
    (["MAP_SKY_PILLAR_OUTSIDE"], "Himmelturm", "Sky Pillar"),
    (["MAP_SOUTHERN_ISLAND_EXTERIOR"], "Insel im Süden", "Southern Island"),
]


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def snake_tileset(symbol: str) -> str:
    value = symbol.removeprefix("gTileset_")
    return re.sub(r"(?<!^)(?=[A-Z])", "_", value).lower()


def slugify(value: str) -> str:
    value = value.lower().replace("ß", "ss").replace("ä", "a").replace("ö", "o").replace("ü", "u").replace(".", "")
    return re.sub(r"(^-|-$)", "", re.sub(r"[^a-z0-9]+", "-", value))


def parse_maps(root: Path) -> tuple[dict[str, dict], list[str], list[str]]:
    layouts = {row["id"]: row for row in read_json(root / "data/layouts/layouts.json")["layouts"]}
    groups = read_json(root / "data/maps/map_groups.json")
    main_names = groups["gMapGroup_TownsAndRoutes"][:50]
    if len(main_names) != 50 or main_names[-1] != "Route134":
        raise RuntimeError("Unexpected towns-and-routes map group")
    maps: dict[str, dict] = {}
    name_to_id: dict[str, str] = {}
    for name in main_names + EXTRA_NAMES:
        data = read_json(root / f"data/maps/{name}/map.json")
        layout = layouts[data["layout"]]
        spec = {
            **data, "width": layout["width"], "height": layout["height"],
            "primary": snake_tileset(layout["primary_tileset"]),
            "secondary": snake_tileset(layout["secondary_tileset"]),
            "blockdata": layout["blockdata_filepath"],
        }
        maps[data["id"]] = spec
        name_to_id[name] = data["id"]
    return maps, [name_to_id[name] for name in main_names], [name_to_id[name] for name in EXTRA_NAMES]


def connected_main_positions(maps: dict[str, dict], main_ids: list[str]) -> tuple[dict[str, tuple[int, int]], list[str]]:
    selected = set(main_ids) - {"MAP_SOOTOPOLIS_CITY"}
    positions = {"MAP_LITTLEROOT_TOWN": (0, 0)}
    queue = deque(positions)
    conflicts: list[str] = []
    while queue:
        key = queue.popleft()
        current = maps[key]
        x, y = positions[key]
        for connection in current.get("connections") or []:
            target_key = connection["map"]
            if target_key not in selected:
                continue
            target = maps[target_key]
            offset = connection["offset"]
            direction = connection["direction"]
            if direction == "up":
                position = (x + offset, y - target["height"])
            elif direction == "down":
                position = (x + offset, y + current["height"])
            elif direction == "left":
                position = (x - target["width"], y + offset)
            else:
                position = (x + current["width"], y + offset)
            if target_key not in positions:
                positions[target_key] = position
                queue.append(target_key)
            elif positions[target_key] != position:
                conflicts.append(f"{key}->{target_key}: {positions[target_key]} / {position}")
    if set(positions) != selected:
        raise RuntimeError(f"Disconnected main Hoenn maps: {sorted(selected - set(positions))}")
    min_x = min(x for x, _y in positions.values())
    min_y = min(y for _x, y in positions.values())
    positions = {key: (x - min_x + MARGIN, y - min_y + MARGIN) for key, (x, y) in positions.items()}

    route126 = positions["MAP_ROUTE126"]
    positions["MAP_SOOTOPOLIS_CITY"] = (route126[0] + 10, route126[1] + 10)
    return positions, conflicts


def place_extra_maps(origins: dict[str, tuple[int, int]]) -> None:
    origins.update({
        "MAP_BATTLE_FRONTIER_OUTSIDE_WEST": (8, 416),
        "MAP_BATTLE_FRONTIER_OUTSIDE_EAST": (64, 416),
        "MAP_SAFARI_ZONE_NORTHWEST": (152, 416),
        "MAP_SAFARI_ZONE_NORTH": (192, 416),
        "MAP_SAFARI_ZONE_NORTHEAST": (232, 416),
        "MAP_SAFARI_ZONE_SOUTHWEST": (152, 456),
        "MAP_SAFARI_ZONE_SOUTH": (192, 456),
        "MAP_SAFARI_ZONE_SOUTHEAST": (232, 456),
        "MAP_PETALBURG_WOODS": (288, 416),
        "MAP_JAGGED_PASS": (344, 416),
        "MAP_MT_CHIMNEY": (382, 416),
        "MAP_MT_PYRE_EXTERIOR": (430, 416),
        "MAP_MT_PYRE_SUMMIT": (468, 416),
        "MAP_SKY_PILLAR_OUTSIDE": (526, 416),
        "MAP_SOUTHERN_ISLAND_EXTERIOR": (562, 416),
    })


def parse_palette(path: Path) -> list[tuple[int, int, int]]:
    lines = path.read_text(encoding="utf-8").splitlines()[3:19]
    colors = [tuple(map(int, line.split())) for line in lines]
    if len(colors) != 16:
        raise RuntimeError(f"{path}: expected 16 colors")
    return colors


class MapRenderer:
    def __init__(self, root: Path) -> None:
        self.root = root
        self.tilesets: dict[tuple[str, str], dict] = {}
        self.pairs: dict[tuple[str, str], dict] = {}
        self.missing_tiles: set[tuple[str, int]] = set()

    def tileset(self, kind: str, name: str) -> dict:
        key = (kind, name)
        if key in self.tilesets:
            return self.tilesets[key]
        folder = self.root / f"data/tilesets/{kind}/{name}"
        image = Image.open(folder / "tiles.png")
        if image.mode != "P":
            raise RuntimeError(f"Indexed tiles expected: {folder / 'tiles.png'}")
        metatiles = (folder / "metatiles.bin").read_bytes()
        if len(metatiles) % 16:
            raise RuntimeError(f"Invalid metatiles: {folder}")
        result = {
            "image": image, "metatiles": metatiles,
            "palettes": [parse_palette(folder / f"palettes/{index:02}.pal") for index in range(16)],
        }
        self.tilesets[key] = result
        return result

    def pair(self, primary_name: str, secondary_name: str) -> dict:
        key = (primary_name, secondary_name)
        if key in self.pairs:
            return self.pairs[key]
        primary = self.tileset("primary", primary_name)
        secondary = self.tileset("secondary", secondary_name)
        result = {
            "primary": primary, "secondary": secondary,
            "palettes": primary["palettes"][:6] + secondary["palettes"][6:13],
            "tiles": {}, "metatiles": {},
        }
        self.pairs[key] = result
        return result

    def tile(self, pair: dict, value: int) -> Image.Image:
        tile_id = value & 0x3FF
        palette_id = (value >> 12) & 0xF
        cache_key = (value,)
        if cache_key in pair["tiles"]:
            return pair["tiles"][cache_key]
        source = pair["primary"] if tile_id < 512 else pair["secondary"]
        source_id = tile_id if tile_id < 512 else tile_id - 512
        image: Image.Image = source["image"]
        columns = image.width // TILE_SIZE
        if source_id >= columns * (image.height // TILE_SIZE) or palette_id >= len(pair["palettes"]):
            self.missing_tiles.add(("primary" if tile_id < 512 else "secondary", source_id))
            tile = Image.new("RGBA", (8, 8))
        else:
            indexed = image.crop(((source_id % columns) * 8, (source_id // columns) * 8, (source_id % columns + 1) * 8, (source_id // columns + 1) * 8))
            palette = pair["palettes"][palette_id]
            tile = Image.new("RGBA", (8, 8))
            tile.putdata([(*palette[index], 0 if index == 0 else 255) for index in indexed.tobytes()])
            if value & 0x400:
                tile = tile.transpose(Image.Transpose.FLIP_LEFT_RIGHT)
            if value & 0x800:
                tile = tile.transpose(Image.Transpose.FLIP_TOP_BOTTOM)
        pair["tiles"][cache_key] = tile
        return tile

    def metatile(self, pair: dict, metatile_id: int) -> Image.Image:
        if metatile_id in pair["metatiles"]:
            return pair["metatiles"][metatile_id]
        source = pair["primary"] if metatile_id < 512 else pair["secondary"]
        local_id = metatile_id if metatile_id < 512 else metatile_id - 512
        start = local_id * 16
        image = Image.new("RGBA", (16, 16))
        if start + 16 <= len(source["metatiles"]):
            values = struct.unpack_from("<8H", source["metatiles"], start)
            for layer in range(2):
                for index in range(4):
                    tile = self.tile(pair, values[layer * 4 + index])
                    image.alpha_composite(tile, ((index % 2) * 8, (index // 2) * 8))
        pair["metatiles"][metatile_id] = image
        return image

    def render(self, spec: dict) -> Image.Image:
        pair = self.pair(spec["primary"], spec["secondary"])
        blocks = (self.root / spec["blockdata"]).read_bytes()
        expected = spec["width"] * spec["height"] * 2
        if len(blocks) != expected:
            raise RuntimeError(f"{spec['name']}: expected {expected} block bytes, got {len(blocks)}")
        image = Image.new("RGBA", (spec["width"] * 16, spec["height"] * 16))
        for y in range(spec["height"]):
            for x in range(spec["width"]):
                value = struct.unpack_from("<H", blocks, (y * spec["width"] + x) * 2)[0]
                image.alpha_composite(self.metatile(pair, value & 0x3FF), (x * 16, y * 16))
        return image


def parse_dex(root: Path) -> dict[str, int]:
    text = (root / "include/constants/pokedex.h").read_text(encoding="utf-8")
    section = text.split("// National Pok", 1)[1].split("NATIONAL_DEX_COUNT", 1)[0]
    names = re.findall(r"NATIONAL_DEX_([A-Z0-9_]+)", section)
    dex = {f"SPECIES_{name}": index for index, name in enumerate(names) if index and index <= 386}
    if len(dex) != 386:
        raise RuntimeError(f"Expected 386 National Dex constants, got {len(dex)}")
    return dex


def aggregate_mons(rows: list[dict], weights: list[int], dex: dict[str, int]) -> list[dict]:
    result: dict[int, dict] = {}
    order: list[int] = []
    for row, chance in zip(rows, weights):
        pokemon_id = dex.get(row["species"])
        if not pokemon_id:
            raise RuntimeError(f"Unknown species: {row['species']}")
        if pokemon_id not in result:
            result[pokemon_id] = {"id": pokemon_id, "p": 0, "min": row["min_level"], "max": row["max_level"]}
            order.append(pokemon_id)
        mon = result[pokemon_id]
        mon["p"] += chance
        mon["min"] = min(mon["min"], row["min_level"])
        mon["max"] = max(mon["max"], row["max_level"])
    return sorted((result[pokemon_id] for pokemon_id in order), key=lambda mon: (-mon["p"], mon["id"]))


def parse_wild(root: Path, dex: dict[str, int]) -> dict[str, dict[str, list[dict]]]:
    source = read_json(root / "src/data/wild_encounters.json")
    group = next(group for group in source["wild_encounter_groups"] if group.get("for_maps"))
    fields = {field["type"]: field["encounter_rates"] for field in group["fields"]}
    result = {}
    for encounter in group["encounters"]:
        wild = {"grass": [], "surf": []}
        if encounter.get("land_mons"):
            wild["grass"] = aggregate_mons(encounter["land_mons"]["mons"], fields["land_mons"], dex)
        if encounter.get("water_mons"):
            wild["surf"] = aggregate_mons(encounter["water_mons"]["mons"], fields["water_mons"], dex)
        result[encounter["map"]] = wild
    return result


def merge_rows(rows: list[list[dict]]) -> list[dict]:
    merged: dict[int, dict] = {}
    for group in rows:
        for mon in group:
            if mon["id"] not in merged:
                merged[mon["id"]] = dict(mon)
            else:
                old = merged[mon["id"]]
                old["p"] = max(old["p"], mon["p"])
                old["min"] = min(old["min"], mon["min"])
                old["max"] = max(old["max"], mon["max"])
    return sorted(merged.values(), key=lambda mon: (-mon["p"], mon["id"]))


def location(maps: dict, origins: dict, wild: dict, keys: list[str], de: str, en: str, place_type: str, show_label: bool) -> dict:
    x1 = min(origins[key][0] for key in keys)
    y1 = min(origins[key][1] for key in keys)
    x2 = max(origins[key][0] + maps[key]["width"] for key in keys)
    y2 = max(origins[key][1] + maps[key]["height"] for key in keys)
    empty = {"grass": [], "surf": []}
    return {
        "key": en.upper().replace(".", "").replace(" ", "_"), "slug": slugify(en),
        "de": de, "en": en, "type": place_type, "region": "hoenn", "area": [x1, y1, x2, y2],
        "label": [round((x1 + x2) / 2, 1), round((y1 + y2) / 2, 1)], "showLabel": show_label,
        "items": [], "trainers": [],
        "wild": {"emerald": {
            "grass": merge_rows([wild.get(key, empty)["grass"] for key in keys]),
            "surf": merge_rows([wild.get(key, empty)["surf"] for key in keys]),
        }},
    }


def make_locations(maps: dict, origins: dict, wild: dict) -> list[dict]:
    locations = [
        location(maps, origins, wild, [f"MAP_ROUTE{number}"], f"Route {number}", f"Route {number}", "route", False)
        for number in range(101, 135)
    ]
    locations.extend(location(maps, origins, wild, [key], de, en, place_type, True) for key, de, en, place_type in TOWNS)
    locations.extend(location(maps, origins, wild, keys, de, en, "place", True) for keys, de, en in PLACES)
    return locations


def write_pyramid(world: Image.Image) -> dict:
    resolved = TILE_OUTPUT.resolve()
    if resolved.parent != KARTE.resolve() or resolved.name != "tiles-emerald":
        raise RuntimeError(f"Refusing unexpected tile output: {resolved}")
    if TILE_OUTPUT.exists():
        shutil.rmtree(TILE_OUTPUT)
    TILE_OUTPUT.mkdir()
    manifest_levels = []
    for zoom in LEVELS:
        scale = 2 ** zoom
        level = world if zoom == NATIVE_ZOOM else world.resize((WORLD_WIDTH * scale, WORLD_HEIGHT * scale), Image.Resampling.NEAREST)
        folder = TILE_OUTPUT / str(zoom)
        folder.mkdir()
        sheets = []
        for sy in range(math.ceil(level.height / SHEET_SIZE)):
            for sx in range(math.ceil(level.width / SHEET_SIZE)):
                left, top = sx * SHEET_SIZE, sy * SHEET_SIZE
                crop = level.crop((left, top, min(level.width, left + SHEET_SIZE), min(level.height, top + SHEET_SIZE)))
                if zoom != 0 and ImageChops.difference(crop, Image.new("RGB", crop.size, OCEAN)).getbbox() is None:
                    continue
                key = f"{sx}_{sy}"
                crop.save(folder / f"{key}.webp", "WEBP", lossless=True, method=6)
                sheets.append(key)
        manifest_levels.append({"z": zoom, "size": SHEET_SIZE, "sheets": sheets})
    manifest = {"version": 3, "width": WORLD_WIDTH, "height": WORLD_HEIGHT, "nativeZoom": NATIVE_ZOOM, "levels": manifest_levels}
    (TILE_OUTPUT / "index.json").write_text(json.dumps(manifest, separators=(",", ":")), encoding="utf-8")
    return manifest


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="pret/pokeemerald checkout")
    parser.add_argument("--preview", type=Path, help="optional overview PNG outside the tile directory")
    args = parser.parse_args()
    root = args.source.resolve()
    required = [root / "data/layouts/layouts.json", root / "data/maps/map_groups.json", root / "src/data/wild_encounters.json"]
    if not all(path.exists() for path in required):
        raise SystemExit(f"Not a pret/pokeemerald checkout: {root}")

    maps, main_ids, extra_ids = parse_maps(root)
    origins, conflicts = connected_main_positions(maps, main_ids)
    place_extra_maps(origins)
    if set(origins) != set(maps):
        raise RuntimeError(f"Maps without world position: {sorted(set(maps) - set(origins))}")

    world = Image.new("RGB", (WORLD_WIDTH * 16, WORLD_HEIGHT * 16), OCEAN)
    renderer = MapRenderer(root)
    render_order = [key for key in main_ids if key != "MAP_SOOTOPOLIS_CITY"] + ["MAP_SOOTOPOLIS_CITY"] + extra_ids
    for index, key in enumerate(render_order, 1):
        image = renderer.render(maps[key])
        x, y = origins[key]
        world.paste(image, (x * 16, y * 16), image)
        if index % 10 == 0:
            print(f"Rendered {index}/{len(render_order)} maps")

    dex = parse_dex(root)
    wild = parse_wild(root, dex)
    locations = make_locations(maps, origins, wild)
    try:
        commit = subprocess.run(["git", "-C", str(root), "rev-parse", "--short=12", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        commit = "unknown"
    data = {
        "version": 1, "source": f"pret/pokeemerald@{commit}",
        "mapSource": "Pokemon Emerald GBA tilesets, palettes, metatiles, layouts and map connections",
        "mapAuthor": "GAME FREAK / Nintendo", "width": WORLD_WIDTH, "height": WORLD_HEIGHT, "origin": [0, 0],
        "locations": locations,
    }
    DATA_OUTPUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest = write_pyramid(world)
    (TILE_OUTPUT / "SOURCE.txt").write_text(
        "Pokémon Smaragd – Kartenquellen\n=================================\n\n"
        "Die Hoenn-Karte wurde aus der vollständigen pret/pokeemerald-Disassembly\n"
        "gerendert. Verwendet werden Smaragds originale GBA-Tilesets, Paletten,\n"
        "Metatiles, Layout-Blöcke und Kartenverbindungen. Kampffront, Safari-Zone\n"
        "und weitere Außenbereiche sind als eigene Kartenbereiche enthalten.\n"
        "Die Funddaten stammen direkt aus Smaragds Begegnungstabellen.\n\n"
        "Quelle: https://github.com/pret/pokeemerald\n"
        f"Stand: {commit}\n\n"
        "Pokémon, die Karten- und Grafikdaten sind Eigentum von GAME FREAK, Nintendo,\n"
        "Creatures Inc. und The Pokémon Company. Die Ausgabe dient nur der privaten,\n"
        "lokalen Darstellung innerhalb des Pokémon Hubs.\n",
        encoding="utf-8",
    )
    if args.preview:
        world.resize((WORLD_WIDTH * 2, WORLD_HEIGHT * 2), Image.Resampling.NEAREST).save(args.preview)

    wild_places = sum(bool(row["wild"]["emerald"]["grass"] or row["wild"]["emerald"]["surf"]) for row in locations)
    sheets = sum(len(level["sheets"]) for level in manifest["levels"])
    print(f"Emerald: {len(maps)} outdoor maps, {len(locations)} locations, {WORLD_WIDTH}x{WORLD_HEIGHT} units")
    print(f"Encounters: {wild_places} locations; Tiles: {sheets} WebP sheets")
    print(f"Connections: {len(conflicts)} documented two-tile conflicts; missing animated tiles: {len(renderer.missing_tiles)}")


if __name__ == "__main__":
    main()
