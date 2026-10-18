#!/usr/bin/env python3
"""Generate the built-in `plain` theme pack: resources/themes/plain/.

Everything here is original: flat geometric tiles drawn with Pillow and a small
hand-laid floor plan. No third-party art, fonts or tilesets are used, so the pack
can ship in the repo under the project's MIT licence.

    python scripts/theme-packs/plain/gen_pack.py

Re-running overwrites resources/themes/plain/{theme.json,map.tmj,tilesets/plain.png}.
Edit the constants below to reshape the floor; run the validator afterwards
(`npm run theme:validate -- resources/themes/plain`).
"""
import json
import os
from PIL import Image, ImageDraw

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..'))
OUT = os.path.join(ROOT, 'resources', 'themes', 'plain')

T = 16                 # tile size
COLS = 8               # tileset columns
W, H = 28, 18          # map size in tiles

# ── tile gids (1-based, in the order they are painted into the atlas) ────────
FLOOR_A, FLOOR_B, WALL, WALL_TOP, DESK, MON_OFF, MON_ON, CHAIR = 1, 2, 3, 4, 5, 6, 7, 8
TABLE, PLANT, MAT, BOARD, SHELF, WINDOW, COUNTER, CLOCK = 9, 10, 11, 12, 13, 14, 15, 16
TILECOUNT = 16


def painter(fn):
    img = Image.new('RGBA', (T, T), (0, 0, 0, 0))
    fn(ImageDraw.Draw(img))
    return img


def rect(d, x0, y0, x1, y1, c):
    d.rectangle([x0, y0, x1, y1], fill=c)


def tiles():
    t = []
    # floors: dark slate, subtle two-tone checker so movement reads
    t.append(painter(lambda d: (rect(d, 0, 0, 15, 15, (40, 42, 54, 255)), rect(d, 0, 0, 0, 15, (46, 48, 62, 255)), rect(d, 0, 0, 15, 0, (46, 48, 62, 255)))))
    t.append(painter(lambda d: (rect(d, 0, 0, 15, 15, (44, 46, 59, 255)), rect(d, 0, 0, 0, 15, (50, 52, 66, 255)), rect(d, 0, 0, 15, 0, (50, 52, 66, 255)))))
    # wall face + wall top
    t.append(painter(lambda d: (rect(d, 0, 0, 15, 15, (86, 90, 112, 255)), rect(d, 0, 0, 15, 1, (110, 115, 140, 255)), rect(d, 0, 14, 15, 15, (62, 65, 84, 255)))))
    t.append(painter(lambda d: (rect(d, 0, 0, 15, 15, (58, 61, 80, 255)), rect(d, 0, 12, 15, 15, (74, 78, 100, 255)))))
    # desk: warm wood slab with a lip
    t.append(painter(lambda d: (rect(d, 0, 2, 15, 15, (150, 112, 74, 255)), rect(d, 0, 2, 15, 3, (178, 138, 96, 255)), rect(d, 0, 13, 15, 15, (112, 82, 54, 255)))))
    # monitor off / on (1x1: bezel + screen)
    def mon(on):
        def f(d):
            rect(d, 2, 2, 13, 11, (24, 24, 30, 255))
            rect(d, 3, 3, 12, 10, (74, 224, 150, 255) if on else (36, 40, 52, 255))
            if on:
                for y in (5, 7, 9):
                    rect(d, 4, y, 9, y, (28, 90, 62, 255))
            rect(d, 6, 12, 9, 13, (24, 24, 30, 255))
            rect(d, 4, 14, 11, 15, (24, 24, 30, 255))
        return painter(f)
    t.append(mon(False))
    t.append(mon(True))
    # chair: seat disc with a back rest
    t.append(painter(lambda d: (rect(d, 3, 2, 12, 5, (70, 110, 190, 255)), rect(d, 2, 6, 13, 13, (92, 136, 220, 255)), rect(d, 2, 12, 13, 13, (60, 94, 160, 255)))))
    # table
    t.append(painter(lambda d: (d.ellipse([1, 2, 14, 14], fill=(206, 190, 156, 255)), d.ellipse([3, 4, 12, 12], fill=(222, 208, 178, 255)))))
    # plant
    t.append(painter(lambda d: (rect(d, 5, 10, 10, 15, (138, 88, 62, 255)), d.ellipse([2, 1, 13, 11], fill=(72, 170, 98, 255)), d.ellipse([5, 3, 10, 8], fill=(104, 204, 128, 255)))))
    # door mat
    t.append(painter(lambda d: (rect(d, 0, 0, 15, 15, (84, 70, 94, 255)), [rect(d, 0, y, 15, y, (104, 88, 116, 255)) for y in (3, 7, 11, 15)])))
    # board (calendar / task board): paper on the wall
    t.append(painter(lambda d: (rect(d, 1, 1, 14, 12, (236, 232, 220, 255)), rect(d, 1, 1, 14, 2, (208, 90, 80, 255)), [rect(d, 3, y, 12, y, (150, 146, 138, 255)) for y in (5, 7, 9)])))
    # shelf
    t.append(painter(lambda d: (rect(d, 0, 0, 15, 15, (96, 70, 52, 255)), rect(d, 1, 1, 14, 6, (60, 44, 34, 255)), rect(d, 1, 9, 14, 14, (60, 44, 34, 255)),
                                [rect(d, x, 2, x + 1, 6, c) for x, c in ((2, (200, 90, 90, 255)), (5, (90, 150, 210, 255)), (8, (230, 190, 90, 255)), (11, (110, 190, 130, 255)))])))
    # window
    t.append(painter(lambda d: (rect(d, 1, 1, 14, 12, (150, 190, 230, 255)), rect(d, 7, 1, 8, 12, (230, 232, 238, 255)), rect(d, 1, 6, 14, 7, (230, 232, 238, 255)), rect(d, 1, 12, 14, 13, (190, 192, 204, 255)))))
    # counter
    t.append(painter(lambda d: (rect(d, 0, 4, 15, 15, (170, 172, 184, 255)), rect(d, 0, 4, 15, 5, (208, 210, 222, 255)), rect(d, 0, 13, 15, 15, (120, 122, 136, 255)))))
    # clock
    t.append(painter(lambda d: (d.ellipse([2, 2, 13, 13], fill=(236, 232, 220, 255)), d.ellipse([2, 2, 13, 13], outline=(60, 60, 70, 255)), rect(d, 7, 4, 8, 8, (40, 40, 50, 255)), rect(d, 8, 7, 11, 8, (40, 40, 50, 255)))))
    assert len(t) == TILECOUNT
    return t


def build_tileset():
    rows = (TILECOUNT + COLS - 1) // COLS
    atlas = Image.new('RGBA', (COLS * T, rows * T), (0, 0, 0, 0))
    for i, tile in enumerate(tiles()):
        atlas.paste(tile, ((i % COLS) * T, (i // COLS) * T))
    return atlas, COLS * T, rows * T


# ── floor plan ───────────────────────────────────────────────────────────────
def layer(name, data):
    return {'name': name, 'type': 'tilelayer', 'width': W, 'height': H, 'x': 0, 'y': 0, 'opacity': 1, 'visible': True, 'data': data}


def build_map(img_w, img_h):
    grid = lambda: [0] * (W * H)
    floor, walls, below, above, coll = grid(), grid(), grid(), grid(), grid()
    at = lambda x, y: y * W + x

    for y in range(H):
        for x in range(W):
            floor[at(x, y)] = FLOOR_A if (x + y) % 2 == 0 else FLOOR_B

    # outer walls (top two rows, sides, bottom) with a door gap at the bottom
    door = (13, 14)
    for x in range(W):
        walls[at(x, 0)] = WALL_TOP; coll[at(x, 0)] = 1
        walls[at(x, 1)] = WALL; coll[at(x, 1)] = 1
        if x not in door:
            walls[at(x, H - 1)] = WALL; coll[at(x, H - 1)] = 1
    for x in door:
        floor[at(x, H - 1)] = MAT
        floor[at(x, H - 2)] = MAT
    for y in range(2, H):
        for x in (0, W - 1):
            walls[at(x, y)] = WALL; coll[at(x, y)] = 1

    # wall dressing (drawn over the wall face). Anchors: calendar, boards, clock.
    anchors = {'calendar': (6, 1), 'boards': (10, 1), 'clock': (14, 1)}
    below[at(*anchors['calendar'])] = BOARD
    below[at(*anchors['boards'])] = BOARD
    below[at(*anchors['clock'])] = CLOCK
    for x in (2, 3):
        below[at(x, 1)] = SHELF
    for x in (18, 22):
        below[at(x, 1)] = WINDOW
    for x in (24, 25, 26):
        below[at(x, 2)] = COUNTER; coll[at(x, 2)] = 1

    # desks: monitor (above), desk (below), chair/seat one tile south of the desk
    seats = []          # (name, x, y)
    def desk(name, x, y):
        above[at(x, y - 2)] = MON_OFF; coll[at(x, y - 2)] = 1
        below[at(x, y - 1)] = DESK; coll[at(x, y - 1)] = 1
        below[at(x, y)] = CHAIR
        seats.append((name, x, y))

    desk('desk-ceo', 3, 6)
    n = 1
    for row_y in (10, 14):
        for i in range(6):
            desk(f'pc-{n}', 4 + 3 * i, row_y)
            n += 1

    # small cafe corner: one table, four seats around it
    table = (24, 5)
    below[at(*table)] = TABLE; coll[at(*table)] = 1
    cafe = [('cafe-seat-1', 23, 5, 'right'), ('cafe-seat-2', 25, 5, 'left'), ('cafe-seat-3', 24, 4, 'down'), ('cafe-seat-4', 24, 6, 'up')]

    for _, cx, cy, _ in cafe:
        below[at(cx, cy)] = CHAIR

    # plants in the corners
    for x, y in ((1, 3), (26, 15), (1, 15), (20, 12)):
        below[at(x, y)] = PLANT; coll[at(x, y)] = 1

    entrance = (13, H - 2)
    objs = []
    oid = 1
    def point(name, x, y):
        nonlocal oid
        objs.append({'id': oid, 'name': name, 'type': '', 'x': x * T, 'y': y * T, 'width': 0, 'height': 0, 'rotation': 0, 'visible': True, 'point': True})
        oid += 1
    for name, x, y in seats:
        point(name, x, y)
    for name, x, y, _ in cafe:
        point(name, x, y)
    point('entrance', *entrance)

    tm = {
        'compressionlevel': -1, 'height': H, 'width': W, 'infinite': False, 'orientation': 'orthogonal',
        'renderorder': 'right-down', 'tilewidth': T, 'tileheight': T, 'type': 'map', 'version': '1.10',
        'tiledversion': '1.10.2', 'nextlayerid': 8, 'nextobjectid': oid,
        'layers': [
            layer('floor', floor), layer('walls', walls), layer('furniture-below', below),
            layer('furniture-above', above), layer('collision', coll),
            {'name': 'spawn-points', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1, 'visible': True, 'x': 0, 'y': 0, 'objects': objs},
            {'name': 'zones', 'type': 'objectgroup', 'draworder': 'topdown', 'opacity': 1, 'visible': True, 'x': 0, 'y': 0, 'objects': []},
        ],
        'tilesets': [{
            'columns': COLS, 'firstgid': 1, 'image': '../tilesets/plain.png', 'imageheight': img_h, 'imagewidth': img_w,
            'margin': 0, 'name': 'plain', 'spacing': 0, 'tilecount': TILECOUNT, 'tilewidth': T, 'tileheight': T,
        }],
    }

    facing = {name: 'up' for name, _, _ in seats}
    facing.update({name: f for name, _, _, f in cafe})
    manifest = {
        'schema': 1, 'id': 'plain', 'name': 'Plain', 'version': '1.0.0',
        'author': 'agent-stage contributors', 'license': 'MIT',
        'blurb': 'A quiet, original default floor', 'swatch': '#2c2e3a',
        'map': 'map.tmj',
        'tilesets': [{'file': 'tilesets/plain.png', 'embedded': True}],
        'seats': {
            'primary': [s[0] for s in seats],
            'cafe': [c[0] for c in cafe],
            'cafeStands': [],
            'facing': facing,
        },
        'anchors': {k: {'x': v[0], 'y': v[1]} for k, v in anchors.items()},
        'errandSpots': [],
        'monitor': {'offTopLeftGid': MON_OFF, 'onGids': [[MON_ON, 0, 0]]},
        'palette': {
            'background': '#14151c',
            'noteColors': {'todo': '#f2df8a', 'doing': '#9ecbf0', 'blocked': '#f0a3a3', 'done': '#a8e0b0'},
        },
    }
    return tm, manifest


def main():
    os.makedirs(os.path.join(OUT, 'tilesets'), exist_ok=True)
    atlas, iw, ih = build_tileset()
    atlas.save(os.path.join(OUT, 'tilesets', 'plain.png'))
    tm, manifest = build_map(iw, ih)
    with open(os.path.join(OUT, 'map.tmj'), 'w', encoding='utf8', newline='\n') as f:
        json.dump(tm, f, separators=(',', ':'))
    with open(os.path.join(OUT, 'theme.json'), 'w', encoding='utf8', newline='\n') as f:
        json.dump(manifest, f, indent=2)
        f.write('\n')
    print('wrote', OUT)


if __name__ == '__main__':
    main()
