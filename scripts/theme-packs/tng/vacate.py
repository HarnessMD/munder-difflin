"""Step 1 of the TNG pack build: remove the 7 baked-in crew from the
human-provided reference illustration (NOT shipped; passed in by path).

All coordinates are in reference pixels (1536x1024). Output: a people-free RGB image.
"""
from PIL import Image, ImageDraw


def _px(im, x, y):
    return im.getpixel((x, y))[:3]


def _is_person(c):
    r, g, b = c
    red = r > 150 and g < 100 and b < 100
    gold = r > 180 and g > 130 and b < 80
    blue = b > 150 and r < 100 and g < 150
    skin = r > 190 and 120 < g < 200 and 90 < b < 170 and r > g > b
    hair = 70 < r < 140 and 40 < g < 90 and b < 70 and r > g > b
    return red or gold or blue or skin or hair


def _mask_replace(im, src, box, dx=0, dy=0, fallback=None):
    x0, y0, x1, y1 = box
    for y in range(y0, y1):
        for x in range(x0, x1):
            if _is_person(_px(im, x, y)):
                if fallback is not None:
                    im.putpixel((x, y), fallback)
                else:
                    im.putpixel((x, y), _px(src, x + dx, y + dy))


def vacate(ref: Image.Image) -> Image.Image:
    src = ref.convert("RGB")
    im = src.copy()

    # 1) centre flank seats: stamp the empty captain's chair over the crew
    chair = src.crop((716, 404, 820, 527))
    im.paste(chair, (716 - 148, 404))
    im.paste(chair, (716 + 146, 404))

    # 2) upper (aft) consoles: crew seen from behind. Rebuild the console from the
    #    neighbouring panel strip, leaving the (empty) chair underneath untouched.
    for (x0, x1, dx) in [(553, 624, 72), (910, 982, -74)]:
        im.paste(src.crop((x0 + dx, 134, x1 + dx, 195)), (x0, 134))
        _mask_replace(im, src, (x0, 195, x1, 210), dx=dx, dy=0)

    # 3) lower conn/ops seats: floor + a plain chair back; console edge untouched
    floor = _px(src, 700, 575)
    tan = _px(src, 767, 440)
    tan_dk = _px(src, 745, 500)
    line = (30, 28, 40)
    for (cx, side) in [(650, -1), (881, 1)]:
        d = ImageDraw.Draw(im)
        d.rectangle((cx - 40, 560, cx + 40, 633), fill=floor)
        d.rectangle((cx - 30, 582, cx + 30, 640), fill=tan, outline=line, width=2)
        d.rectangle((cx - 30, 622, cx + 30, 640), fill=tan_dk, outline=line, width=2)
        d.rectangle((cx - 40, 604, cx - 30, 640), fill=tan_dk, outline=line, width=2)
        d.rectangle((cx + 30, 604, cx + 40, 640), fill=tan_dk, outline=line, width=2)
        _mask_replace(im, src, (cx - 46, 633, cx + 46, 655), fallback=(28, 34, 52))

    # 4) side stations: floor under the crew, then redraw the empty chair
    maroon = _px(src, 330, 470)
    base = (52, 62, 84)
    d = ImageDraw.Draw(im)
    for (fx0, fx1, back, seat, hand) in [
        (171, 262, (232, 404, 254, 488), (194, 446, 233, 488), (150, 400, 172, 480)),
        (1268, 1366, (1280, 404, 1303, 490), (1303, 446, 1342, 488), (1360, 400, 1385, 480)),
    ]:
        d.rectangle((fx0, 376, fx1, 505), fill=maroon)
        d.rectangle((hand[0] + 6, 436, hand[0] + 24, 458), fill=(24, 30, 48))
        d.rectangle((min(back[0], seat[0]) + 8, 486, max(back[2], seat[2]) - 8, 500), fill=base)
        d.rectangle(seat, fill=tan_dk, outline=line, width=2)
        d.rectangle(back, fill=tan, outline=line, width=2)
        # light/dark cushion shading
        hi = tuple(min(255, int(c * 1.15)) for c in tan)
        d.rectangle((back[0] + 3, back[1] + 3, back[0] + 7, back[3] - 3), fill=hi)
        d.rectangle((seat[0] + 3, seat[1] + 3, seat[2] - 3, seat[1] + 8), fill=tan)
        d.line((back[0] + 3, back[1] + 30, back[2] - 3, back[1] + 30), fill=tan_dk, width=2)
        d.line((back[0] + 3, back[1] + 58, back[2] - 3, back[1] + 58), fill=tan_dk, width=2)
    return im


if __name__ == "__main__":
    import sys
    vacate(Image.open(sys.argv[1])).save(sys.argv[2])
