#!/usr/bin/env python3
"""Render the Pokemon Crystal outdoor world from a pret/pokecrystal checkout.

Usage:
    python Karte/tools/build-crystal.py /path/to/pokecrystal
"""

from __future__ import annotations

import argparse
import importlib.util
import json
import subprocess
from pathlib import Path

from PIL import Image


HERE = Path(__file__).resolve().parent
KARTE = HERE.parent
TILE_OUTPUT = KARTE / "tiles-crystal"
DATA_OUTPUT = KARTE / "crystal.json"

spec = importlib.util.spec_from_file_location("build_gold_silver", HERE / "build-gold-silver.py")
if spec is None or spec.loader is None:
    raise RuntimeError("Could not load build-gold-silver.py")
gs = importlib.util.module_from_spec(spec)
spec.loader.exec_module(gs)


def make_locations(maps: dict, origins: dict, wild_crystal: dict) -> list[dict]:
    definitions = gs.location_defs() + [{
        "keys": ["BATTLE_TOWER_OUTSIDE"], "de": "Duellturm", "en": "Battle Tower",
        "type": "place", "region": "johto", "showLabel": True,
    }]
    locations = []
    covered = set()
    for definition in definitions:
        keys = definition["keys"]
        for key in keys:
            if key not in maps:
                raise RuntimeError(f"Location map missing: {key}")
        covered.update(keys)
        x1 = min(origins[key][0] for key in keys)
        z1 = min(origins[key][1] for key in keys)
        x2 = max(origins[key][0] + maps[key]["width"] * gs.UNITS_PER_BLOCK for key in keys)
        z2 = max(origins[key][1] + maps[key]["height"] * gs.UNITS_PER_BLOCK for key in keys)
        locations.append({
            "key": definition["en"].upper().replace(".", "").replace(" ", "_"),
            "slug": gs.slugify(definition["en"]), "de": definition["de"], "en": definition["en"],
            "type": definition["type"], "region": definition["region"], "area": [x1, z1, x2, z2],
            "label": [round((x1 + x2) / 2, 1), round((z1 + z2) / 2, 1)],
            "showLabel": definition["showLabel"], "items": [], "trainers": [],
            "wild": {"crystal": gs.merge_wild_maps(keys, wild_crystal)},
        })
    if covered != set(maps):
        raise RuntimeError(f"Unmapped outdoor maps: {sorted(set(maps) - covered)}")
    return locations


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="pret/pokecrystal checkout")
    parser.add_argument("--preview", type=Path, help="optional overview PNG outside the tile directory")
    args = parser.parse_args()
    root = args.source.resolve()
    required = [root / "constants/map_constants.asm", root / "gfx/tilesets/johto.png", root / "maps/NewBarkTown.blk", root / "maps/BattleTowerOutside.blk"]
    if not all(path.exists() for path in required):
        raise SystemExit(f"Not a pret/pokecrystal checkout: {root}")

    constants = gs.parse_map_constants(root)
    maps = gs.parse_outdoor_maps(root, constants, expected_count=73)
    components, conflicts = gs.build_components(maps)
    origins, width, height = gs.arrange_components(components, maps, {"BATTLE_TOWER_OUTSIDE": 300})
    day, roof_pals = gs.parse_palettes(root)
    roof_graphics = gs.parse_roof_graphics(root)

    world = Image.new("RGB", (width * 2 ** gs.NATIVE_ZOOM, height * 2 ** gs.NATIVE_ZOOM), gs.OCEAN)
    cache = {}
    for index, (key, map_spec) in enumerate(maps.items(), 1):
        image = gs.render_map(root, map_spec, day, roof_pals, roof_graphics, cache)
        x, z = origins[key]
        world.paste(image, (x * 2 ** gs.NATIVE_ZOOM, z * 2 ** gs.NATIVE_ZOOM))
        if index % 12 == 0:
            print(f"Rendered {index}/{len(maps)} maps")

    dex = gs.parse_dex(root)
    wild_crystal = gs.parse_wild(root, "crystal", dex)
    locations = make_locations(maps, origins, wild_crystal)
    try:
        commit = subprocess.run(["git", "-C", str(root), "rev-parse", "--short=12", "HEAD"], check=True, capture_output=True, text=True).stdout.strip()
    except (OSError, subprocess.CalledProcessError):
        commit = "unknown"
    data = {
        "version": 1, "source": f"pret/pokecrystal@{commit}",
        "mapSource": "Pokemon Crystal Game Boy Color tilesets, palettes, metatiles, map blocks and connections",
        "mapAuthor": "GAME FREAK / Nintendo", "width": width, "height": height, "origin": [0, 0],
        "locations": locations,
    }
    DATA_OUTPUT.write_text(json.dumps(data, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    manifest = gs.write_pyramid(world, width, height, TILE_OUTPUT)
    (TILE_OUTPUT / "SOURCE.txt").write_text(
        "Pokémon Kristall – Kartenquellen\n==================================\n\n"
        "Die Kartenbilder wurden aus der vollständigen pret/pokecrystal-Disassembly\n"
        "gerendert. Verwendet werden Kristalls eigene Game-Boy-Color-Tilesets,\n"
        "Paletten, Metatiles, Map-Blöcke und Kartenverbindungen – einschließlich\n"
        "der zusätzlichen Duellturm-Außenkarte. Die Funddaten stammen direkt aus\n"
        "Kristalls Morgen-, Tages-, Nacht- und Wasser-Begegnungstabellen.\n\n"
        "Quelle: https://github.com/pret/pokecrystal\n"
        f"Stand: {commit}\n\n"
        "Pokémon, die Karten- und Grafikdaten sind Eigentum von GAME FREAK, Nintendo,\n"
        "Creatures Inc. und The Pokémon Company. Die Ausgabe dient nur der privaten,\n"
        "lokalen Darstellung innerhalb des Pokémon Hubs.\n",
        encoding="utf-8",
    )
    if args.preview:
        world.resize((width * 2, height * 2), Image.Resampling.NEAREST).save(args.preview)
    wild_places = sum(bool(location["wild"]["crystal"]["grass"] or location["wild"]["crystal"]["surf"]) for location in locations)
    sheets = sum(len(level["sheets"]) for level in manifest["levels"])
    print(f"Crystal: {len(maps)} outdoor maps, {len(locations)} locations, {width}x{height} units")
    print(f"Encounters: {wild_places} locations; Tiles: {sheets} WebP sheets; {len(components)} components; {len(conflicts)} connection conflicts")


if __name__ == "__main__":
    main()
