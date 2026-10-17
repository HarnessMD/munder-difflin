"""Build resources/themes/tng/ (tileset + map.tmj + theme.json) from the
human-provided reference illustration.

    python scripts/theme-packs/tng/gen_pack.py "<path to Pixel Art Starship Bridge Map.png>" [out_dir]

The reference is read only (never copied into the pack). Crew sprites are built
separately by gen_cast.py. Output is deterministic.
"""
import json, os, sys
from collections import deque
from PIL import Image, ImageDraw

sys.path.insert(0, os.path.dirname(__file__))
from vacate import vacate

CROP = (32, 34, 1504, 994)      # inner frame of the reference (1472x960)
TILE_REF = 32                   # one 16px map tile = 32 reference px (2x downscale)
COLORS = 64
NAME = "tng"

# ---- region shapes, reference px (pre-crop coordinates) ------------------------
RECTS_WALL = [
    (0, 0, 1536, 200), (0, 0, 300, 236), (1236, 0, 1536, 236),   # top wall + corners
    (0, 0, 36, 1024), (1498, 0, 1536, 1024),                      # side walls
    (0, 797, 1536, 1024),                                         # lower wall + viewscreen
]
POLY_WALL = [[(36, 690), (70, 690), (175, 797), (36, 797)],
             [(1500, 690), (1466, 690), (1361, 797), (1500, 797)]]
RECTS_FURN = [
    (495, 80, 1040, 232),                          # forward console strip (top)
    (100, 100, 238, 232), (1298, 100, 1430, 232),  # corner viewers
    (36, 305, 176, 545), (1358, 305, 1500, 545),   # side stations
    (80, 615, 165, 722), (110, 700, 292, 762), (240, 625, 292, 762),       # aft-L
    (1370, 620, 1455, 722), (1245, 700, 1455, 762), (1245, 625, 1295, 762),  # aft-R
]
POLY_FURN = [
    [(535, 610), (570, 600), (735, 655), (800, 655), (965, 600), (1000, 610),
     (1000, 650), (940, 722), (840, 742), (690, 742), (595, 722), (535, 650)],
]
RAIL = [(470, 420), (480, 345), (520, 318), (600, 300), (770, 296), (940, 306),
        (1030, 330), (1060, 360), (1075, 420)]
ABOVE_POLY = POLY_FURN[0]   # the conn/ops arc draws over seated crew

# seats: name -> reference px of the chair
SEATS = {
    "desk-ceo": (767, 470),            # captain's chair (orchestrator)
    "desk-first-officer": (620, 470),  # flank L
    "desk-counselor": (913, 470),      # flank R
    "desk-conn": (650, 598),
    "desk-ops": (881, 598),
    "desk-aft-left": (587, 225),
    "desk-aft-right": (942, 225),
    "desk-side-left": (225, 445),
    "desk-side-right": (1300, 445),
    "desk-eng-left": (200, 650),
    "desk-eng-right": (1330, 650),
}
ENTRANCE = (372, 222)   # in front of the forward-port turbolift


def to_tile(x, y):
    return (x - CROP[0]) // TILE_REF, (y - CROP[1]) // TILE_REF


def shape_mask(w, h, rects=(), polys=(), lines=(), line_w=0):
    """Boolean tile mask: tile is set if >=40% of its area is covered."""
    big = Image.new("L", (w * TILE_REF, h * TILE_REF), 0)
    d = ImageDraw.Draw(big)
    sh = lambda p: (p[0] - CROP[0], p[1] - CROP[1])
    for r in rects:
        d.rectangle((*sh(r[:2]), *sh(r[2:])), fill=255)
    for p in polys:
        d.polygon([sh(q) for q in p], fill=255)
    for l in lines:
        d.line([sh(q) for q in l], fill=255, width=line_w)
    small = big.resize((w, h), Image.BOX)
    return [[small.getpixel((x, y)) >= 100 for x in range(w)] for y in range(h)]


def main():
    ref_path = sys.argv[1]
    default_out = os.path.join(os.path.dirname(__file__), "..", "..", "..", "resources", "themes", NAME)
    out = os.path.abspath(sys.argv[2] if len(sys.argv) > 2 else default_out)
    os.makedirs(os.path.join(out, "tilesets"), exist_ok=True)

    img = vacate(Image.open(ref_path)).crop(CROP)
    W, H = img.width // 2, img.height // 2
    img = img.resize((W, H), Image.BOX)
    img = img.quantize(colors=COLORS, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE).convert("RGB")
    mw, mh = W // 16, H // 16

    # ---- slice + dedupe ----------------------------------------------------
    tiles, index, ids = [], {}, []
    for ty in range(mh):
        for tx in range(mw):
            c = img.crop((tx * 16, ty * 16, tx * 16 + 16, ty * 16 + 16))
            key = c.tobytes()
            if key not in index:
                index[key] = len(tiles) + 1   # gid, firstgid=1
                tiles.append(c)
            ids.append(index[key])
    cols = 32
    rows = (len(tiles) + cols - 1) // cols
    atlas = Image.new("RGBA", (cols * 16, rows * 16), (0, 0, 0, 0))
    for i, t in enumerate(tiles):
        atlas.paste(t.convert("RGBA"), ((i % cols) * 16, (i // cols) * 16))
    atlas.save(os.path.join(out, "tilesets", "tng-bridge.png"), optimize=True)

    # ---- layers --------------------------------------------------------------
    wall = shape_mask(mw, mh, RECTS_WALL, POLY_WALL)
    furn = shape_mask(mw, mh, RECTS_FURN, POLY_FURN, [RAIL], 26)
    above = shape_mask(mw, mh, polys=[ABOVE_POLY])
    seat_tiles = {n: to_tile(*p) for n, p in SEATS.items()}
    ent = to_tile(*ENTRANCE)

    def layer(name, pick):
        return {"id": 0, "name": name, "type": "tilelayer", "x": 0, "y": 0, "width": mw, "height": mh,
                "opacity": 1, "visible": True,
                "data": [ids[y * mw + x] if pick(x, y) else 0 for y in range(mh) for x in range(mw)]}

    block = [[wall[y][x] or furn[y][x] for x in range(mw)] for y in range(mh)]
    for t in list(seat_tiles.values()) + [ent]:
        block[t[1]][t[0]] = False
    layers = [
        layer("floor", lambda x, y: True),
        layer("walls", lambda x, y: wall[y][x]),
        layer("furniture-below", lambda x, y: furn[y][x] and not above[y][x]),
        layer("furniture-above", lambda x, y: above[y][x]),
        layer("collision", lambda x, y: block[y][x]),
    ]
    layers[4]["data"] = [1 if v else 0 for v in layers[4]["data"]]  # collision: any non-zero blocks
    spawn = [{"id": 0, "name": n, "type": "", "x": t[0] * 16, "y": t[1] * 16, "width": 0, "height": 0,
              "rotation": 0, "visible": True, "point": True} for n, t in {**seat_tiles, "entrance": ent}.items()]
    layers.append({"id": 0, "name": "spawn-points", "type": "objectgroup", "x": 0, "y": 0, "opacity": 1,
                   "visible": True, "draworder": "topdown", "objects": spawn})
    layers.append({"id": 0, "name": "zones", "type": "objectgroup", "x": 0, "y": 0, "opacity": 1,
                   "visible": True, "draworder": "topdown", "objects": []})
    for i, l in enumerate(layers):
        l["id"] = i + 1
    oid = 1
    for l in layers[5:]:
        for o in l["objects"]:
            o["id"] = oid
            oid += 1
    tmj = {"compressionlevel": -1, "height": mh, "width": mw, "infinite": False, "orientation": "orthogonal",
           "renderorder": "right-down", "tilewidth": 16, "tileheight": 16, "type": "map", "version": "1.10",
           "tiledversion": "1.12.0", "nextlayerid": len(layers) + 1, "nextobjectid": oid, "layers": layers,
           "tilesets": [{"firstgid": 1, "name": "tng-bridge", "image": "tilesets/tng-bridge.png",
                         "imagewidth": cols * 16, "imageheight": rows * 16, "tilewidth": 16, "tileheight": 16,
                         "columns": cols, "tilecount": cols * rows, "margin": 0, "spacing": 0}]}
    with open(os.path.join(out, "map.tmj"), "w", newline="\n") as f:
        json.dump(tmj, f, separators=(",", ":"))

    # ---- connectivity check: every seat reachable from the entrance -------------
    seen = {ent}
    q = deque([ent])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if 0 <= n[0] < mw and 0 <= n[1] < mh and n not in seen and not block[n[1]][n[0]]:
                seen.add(n)
                q.append(n)
    unreachable = [n for n, t in seat_tiles.items() if t not in seen]
    print(f"map {mw}x{mh}, {len(tiles)} unique tiles -> atlas {atlas.width}x{atlas.height}")
    print("unreachable seats:", unreachable or "none")

    # debug overlay (not part of the pack)
    if os.environ.get("TNG_DEBUG_PNG"):
        dbg = img.convert("RGBA")
        d = ImageDraw.Draw(dbg, "RGBA")
        for y in range(mh):
            for x in range(mw):
                if block[y][x]:
                    d.rectangle((x * 16, y * 16, x * 16 + 15, y * 16 + 15), fill=(255, 0, 0, 90))
        for n, t in seat_tiles.items():
            d.rectangle((t[0] * 16, t[1] * 16, t[0] * 16 + 15, t[1] * 16 + 15), outline=(0, 255, 0, 255))
        d.rectangle((ent[0] * 16, ent[1] * 16, ent[0] * 16 + 15, ent[1] * 16 + 15), outline=(255, 255, 0, 255))
        dbg.resize((W * 2, H * 2), Image.NEAREST).save(os.environ["TNG_DEBUG_PNG"])

    # ---- manifest ---------------------------------------------------------------
    sv = lambda n: seat_tiles[n]
    manifest = {
        "schema": 1, "id": NAME, "name": "TNG Bridge", "version": "1.0.0",
        "author": "Munder Difflin contributors", "license": "MIT",
        "blurb": "A starship bridge: captain's chair, conn and ops, turbolifts and a planet on the viewscreen",
        "swatch": "#8a5a68",
        "map": "map.tmj",
        "tilesets": [{"file": "tilesets/tng-bridge.png", "embedded": True}],
        "seats": {"primary": list(SEATS.keys()), "cafe": [], "cafeStands": []},
        "anchors": {"calendar": {"x": sv("desk-aft-left")[0] + 2, "y": 4},
                    "boards": {"x": sv("desk-aft-right")[0] - 2, "y": 4},
                    "clock": {"x": 23, "y": 2}},
        "errandSpots": [],
        "monitor": {"offTopLeftGid": 0, "onGids": []},
        "palette": {"background": "#0b1020",
                    "noteColors": {"todo": "#f2c14e", "doing": "#7fb4e6", "blocked": "#e4786d", "done": "#8fd0a2"}},
        "cast": {"roster": "cast/cast.json", "default": "commander"},
    }
    with open(os.path.join(out, "theme.json"), "w", newline="\n") as f:
        json.dump(manifest, f, indent=2)
        f.write("\n")


if __name__ == "__main__":
    main()
