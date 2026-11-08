#!/usr/bin/env python3
"""Render Pokemon Ruby/Sapphire's outdoor Hoenn world from pret/pokeruby.

The renderer reads the original indexed GBA tiles, palettes, metatiles,
layout blocks, map connections and both games' encounter tables. A ROM is
not required.

Usage:
    python Karte/tools/build-ruby-sapphire.py /path/to/pokeruby [--preview out.png]
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
TILE_OUTPUT = KARTE / "tiles-ruby-sapphire"
DATA_OUTPUT = KARTE / "ruby-sapphire.json"
NATIVE_ZOOM = 4
SHEET_SIZE = 2048
LEVELS = (4, 2, 0)
WORLD_WIDTH = 832
WORLD_HEIGHT = 512
OCEAN = (6, 27, 39)

_emerald_spec = importlib.util.spec_from_file_location("build_emerald", HERE / "build-emerald.py")
if _emerald_spec is None or _emerald_spec.loader is None:
    raise RuntimeError("Could not load the shared GBA map renderer")
emerald = importlib.util.module_from_spec(_emerald_spec)
_emerald_spec.loader.exec_module(emerald)

EXTRA_NAMES = [
    "BattleTower_Outside", "JaggedPass", "MtChimney", "MtPyre_Exterior",
    "MtPyre_Summit", "PetalburgWoods", "SafariZone_Northeast",
    "SafariZone_Northwest", "SafariZone_Southeast", "SafariZone_Southwest",
    "SkyPillar_Outside", "SouthernIsland_Exterior",
]

PLACES = [
    (["MAP_BATTLE_TOWER_OUTSIDE"], "Duellturm", "Battle Tower"),
    (["MAP_SAFARI_ZONE_NORTHWEST", "MAP_SAFARI_ZONE_NORTHEAST", "MAP_SAFARI_ZONE_SOUTHWEST", "MAP_SAFARI_ZONE_SOUTHEAST"], "Safari-Zone", "Safari Zone"),
    (["MAP_PETALBURG_WOODS"], "Blütenburgwald", "Petalburg Woods"),
    (["MAP_JAGGED_PASS"], "Steilpass", "Jagged Pass"),
    (["MAP_MT_CHIMNEY"], "Schlotberg", "Mt. Chimney"),
    (["MAP_MT_PYRE_EXTERIOR", "MAP_MT_PYRE_SUMMIT"], "Pyroberg", "Mt. Pyre"),
    (["MAP_SKY_PILLAR_OUTSIDE"], "Himmelturm", "Sky Pillar"),
    (["MAP_SOUTHERN_ISLAND_EXTERIOR"], "Insel im Süden", "Southern Island"),
]


def read_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


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
        maps[data["id"]] = {
            **data,
            "width": layout["width"],
            "height": layout["height"],
            "primary": emerald.snake_tileset(layout["primary_tileset"]),
            "secondary": emerald.snake_tileset(layout["secondary_tileset"]),
            "blockdata": layout["blockdata_filepath"],
        }
        name_to_id[name] = data["id"]
    return maps, [name_to_id[name] for name in main_names], [name_to_id[name] for name in EXTRA_NAMES]


def place_extra_maps(origins: dict[str, tuple[int, int]]) -> None:
    origins.update({
        "MAP_BATTLE_TOWER_OUTSIDE": (8, 416),
        "MAP_SAFARI_ZONE_NORTHWEST": (56, 416),
        "MAP_SAFARI_ZONE_NORTHEAST": (96, 416),
        "MAP_SAFARI_ZONE_SOUTHWEST": (56, 456),
        "MAP_SAFARI_ZONE_SOUTHEAST": (96, 456),
        "MAP_PETALBURG_WOODS": (152, 416),
        "MAP_JAGGED_PASS": (208, 416),
        "MAP_MT_CHIMNEY": (246, 416),
        "MAP_MT_PYRE_EXTERIOR": (294, 416),
        "MAP_MT_PYRE_SUMMIT": (332, 416),
        "MAP_SKY_PILLAR_OUTSIDE": (390, 416),
        "MAP_SOUTHERN_ISLAND_EXTERIOR": (426, 416),
    })


def parse_wild(root: Path, dex: dict[str, int]) -> dict[str, dict[str, dict[str, list[dict]]]]:
    source = read_json(root / "src/data/wild_encounters.json")
    group = next(group for group in source["wild_encounter_groups"] if group.get("for_maps"))
    fields = {field["type"]: field["encounter_rates"] for field in group["fields"]}
    result: dict[str, dict[str, dict[str, list[dict]]]] = {"ruby": {}, "sapphire": {}}
    for encounter in group["encounters"]:
        label = encounter.get("base_label", "")
        if label.endswith("_Ruby"):
            version = "ruby"
        elif label.endswith("_Sapphire"):
            version = "sapphire"
        else:
            raise RuntimeError(f"Encounter without Ruby/Sapphire suffix: {label}")
        wild = {"grass": [], "surf": []}
        if encounter.get("land_mons"):
            wild["grass"] = emerald.aggregate_mons(encounter["land_mons"]["mons"], fields["land_mons"], dex)
        if encounter.get("water_mons"):
            wild["surf"] = emerald.aggregate_mons(encounter["water_mons"]["mons"], fields["water_mons"], dex)
        result[version][encounter["map"]] = wild
    return result


def parse_dex(root: Path) -> dict[str, int]:
    """Read the older pokeruby constant layout (national IDs share species names)."""
    import re

    text = (root / "include/constants/species.h").read_text(encoding="utf-8")
    dex = {
        f"SPECIES_{name}": int(number)
        for name, number in re.findall(r"^#define NATIONAL_DEX_([A-Z0-9_]+)\s+(\d+)\s*$", text, re.MULTILINE)
        if 1 <= int(number) <= 386
    }
    if len(dex) != 386:
        raise RuntimeError(f"Expected 386 National Dex constants, got {len(dex)}")
    return dex


def location(maps: dict, origins: dict, wild: dict, keys: list[str], de: str, en: str, place_type: str, show_label: bool) -> dict:
    x1 = min(origins[key][0] for key in keys)
    y1 = min(origins[key][1] for key in keys)
    x2 = max(origins[key][0] + maps[key]["width"] for key in keys)
    y2 = max(origins[key][1] + maps[key]["height"] for key in keys)
    empty = {"grass": [], "surf": []}
    versions = {}
    for version in ("ruby", "sapphire"):
        versions[version] = {
            "grass": emerald.merge_rows([wild[version].get(key, empty)["grass"] for key in keys]),
            "surf": emerald.merge_rows([wild[version].get(key, empty)["surf"] for key in keys]),
        }
    return {
        "key": en.upper().replace(".", "").replace(" ", "_"),
        "slug": emerald.slugify(en),
        "de": de,
        "en": en,
        "type": place_type,
        "region": "hoenn",
        "area": [x1, y1, x2, y2],
        "label": [round((x1 + x2) / 2, 1), round((y1 + y2) / 2, 1)],
        "showLabel": show_label,
        "items": [],
        "trainers": [],
        "wild": versions,
    }


def make_locations(maps: dict, origins: dict, wild: dict) -> list[dict]:
    locations = [
        location(maps, origins, wild, [f"MAP_ROUTE{number}"], f"Route {number}", f"Route {number}", "route", False)
        for number in range(101, 135)
    ]
    locations.extend(location(maps, origins, wild, [key], de, en, place_type, True) for key, de, en, place_type in emerald.TOWNS)
    locations.extend(location(maps, origins, wild, keys, de, en, "place", True) for keys, de, en in PLACES)
    return locations


def write_pyramid(world: Image.Image) -> dict:
    resolved = TILE_OUTPUT.resolve()
    if resolved.parent != KARTE.resolve() or resolved.name != "tiles-ruby-sapphire":
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
    parser.add_argument("source", type=Path, help="pret/pokeruby checkout")
    parser.add_argument("--preview", type=Path, help="optional overview PNG outside the tile directory")
    args = parser.parse_args()
    root = args.source.resolve()
    required = [root / "data/layouts/layouts.json", root / "data/maps/map_groups.json", root / "src/data/wild_encounters.json"]
    if not all(path.exists() for path in required):
        raise SystemExit(f"Not a pret/pokeruby checkout: {root}")

    maps, main_ids, extra_ids = parse_maps(root)
    origins, conflicts = emerald.connected_main_positions(maps, main_ids)
    place_extra_maps(origins)
    if set(origins) != set(maps):
        raise RuntimeError(f"Maps without world position: {sorted(set(maps) - set(origins))}")

    world = Image.new("RGB", (WORLD_WIDTH * 16, WORLD_HEIGHT * 16), OCEAN)
    renderer = emerald.MapRenderer(root)
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
        "version": 1,
        "source": f"pret/pokeruby@{commit}",
        "mapSource": "Pokemon Ruby/Sapphire GBA tilesets, palettes, metatiles, layouts and map connections",
        "mapAuthor": "GAME FREAK / Nintendo",
        "width": WORLD_WIDTH,
        "height": WORLD_HEIGHT,
        "origin": [0, 0],
        "locations": locations,
    }
    DATA_OUTPUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest = write_pyramid(world)
    (TILE_OUTPUT / "SOURCE.txt").write_text(
        "Pokémon Rubin/Saphir – Kartenquellen\n"
        "=====================================\n\n"
        "Die Hoenn-Karte wurde aus der vollständigen pret/pokeruby-Disassembly\n"
        "gerendert. Verwendet werden die originalen GBA-Tilesets, Paletten,\n"
        "Metatiles, Layout-Blöcke und Kartenverbindungen von Rubin und Saphir.\n"
        "Der Kampfturm, die vierteilige Safari-Zone und weitere Außenbereiche\n"
        "sind als eigene Kartenbereiche enthalten. Die Funddaten stammen für\n"
        "beide Editionen direkt aus ihren getrennten Begegnungstabellen.\n\n"
        "Quelle: https://github.com/pret/pokeruby\n"
        f"Stand: {commit}\n\n"
        "Pokémon, die Karten- und Grafikdaten sind Eigentum von GAME FREAK, Nintendo,\n"
        "Creatures Inc. und The Pokémon Company. Die Ausgabe dient nur der privaten,\n"
        "lokalen Darstellung innerhalb des Pokémon Hubs.\n",
        encoding="utf-8",
    )
    if args.preview:
        world.resize((WORLD_WIDTH * 2, WORLD_HEIGHT * 2), Image.Resampling.NEAREST).save(args.preview)

    wild_places = sum(bool(row["wild"]["ruby"]["grass"] or row["wild"]["ruby"]["surf"] or row["wild"]["sapphire"]["grass"] or row["wild"]["sapphire"]["surf"]) for row in locations)
    differing = sum(row["wild"]["ruby"] != row["wild"]["sapphire"] for row in locations)
    sheets = sum(len(level["sheets"]) for level in manifest["levels"])
    print(f"Ruby/Sapphire: {len(maps)} outdoor maps, {len(locations)} locations, {WORLD_WIDTH}x{WORLD_HEIGHT} units")
    print(f"Encounters: {wild_places} locations, {differing} version-specific; Tiles: {sheets} WebP sheets")
    print(f"Connections: {len(conflicts)} documented two-tile conflicts; missing animated tiles: {len(renderer.missing_tiles)}")


if __name__ == "__main__":
    main()
