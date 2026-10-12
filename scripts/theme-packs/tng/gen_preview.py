"""Generate the TNG pack's preview image: resources/themes/tng/preview.png (320x180).

Composites map.tmj tile layers (floor, walls, furniture-below, furniture-above)
using tilesets/tng-bridge.png, then downscales to 320x180.

    python scripts/theme-packs/tng/gen_preview.py [pack_dir]
"""
import json
import os
import sys
from PIL import Image


def main():
    default_pack = os.path.join(
        os.path.dirname(__file__), "..", "..", "..", "resources", "themes", "tng"
    )
    pack_dir = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else default_pack)

    map_path = os.path.join(pack_dir, "map.tmj")
    with open(map_path, "r", encoding="utf-8") as f:
        tmj = json.load(f)

    mw, mh = tmj["width"], tmj["height"]
    tw, th = tmj["tilewidth"], tmj["tileheight"]

    ts_meta = tmj["tilesets"][0]
    ts_img = Image.open(os.path.join(pack_dir, ts_meta["image"])).convert("RGBA")
    cols = ts_meta["columns"]
    firstgid = ts_meta["firstgid"]

    layer_order = ["floor", "walls", "furniture-below", "furniture-above"]
    layers_by_name = {l["name"]: l for l in tmj["layers"]}

    comp = Image.new("RGBA", (mw * tw, mh * th), (0, 0, 0, 0))

    for lname in layer_order:
        if lname not in layers_by_name:
            continue
        data = layers_by_name[lname]["data"]
        for idx, gid in enumerate(data):
            if gid == 0:
                continue
            local_id = gid - firstgid
            tile_x = (local_id % cols) * tw
            tile_y = (local_id // cols) * th
            tile_img = ts_img.crop((tile_x, tile_y, tile_x + tw, tile_y + th))

            dest_x = (idx % mw) * tw
            dest_y = (idx // mw) * th
            comp.alpha_composite(tile_img, (dest_x, dest_y))

    preview = comp.resize((320, 180), Image.Resampling.LANCZOS)
    out_path = os.path.join(pack_dir, "preview.png")
    preview.save(out_path, optimize=True)
    print(f"Preview saved: {out_path} ({preview.width}x{preview.height})")


if __name__ == "__main__":
    main()
