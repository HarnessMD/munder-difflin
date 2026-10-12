"""Generate the TNG pack's crew: resources/themes/tng/cast/{cast.json,sprites,portraits}.

Generic starship crew in division colours (command red, ops/eng/security gold,
sciences/medical blue). No named-character likenesses. Same 18x32 scene-frame
geometry as scene/office/portraitArt.ts (drawing primitives re-implemented here;
that module is not touched).

    python scripts/theme-packs/tng/gen_cast.py [out_dir]
"""
import json, os, sys
from PIL import Image

W, H = 18, 32
OUT = (38, 34, 46)
SHOE = (30, 28, 36)
PANTS = (44, 46, 66)
BLACK = (28, 28, 36)
BADGE = (236, 206, 90)

SKIN = {
    "light": ((255, 221, 189), (247, 201, 170), (212, 158, 126)),
    "tan": ((232, 182, 136), (214, 162, 116), (176, 126, 86)),
    "brown": ((180, 130, 94), (158, 112, 78), (124, 86, 58)),
    "dark": ((142, 98, 70), (120, 80, 56), (94, 62, 42)),
}
DIV = {"red": (190, 44, 44), "gold": (214, 164, 40), "blue": (52, 112, 196)}


def shade(c, f):
    return tuple(max(0, min(255, round(v * f))) for v in c)


# name, displayName, division, skin, hair colour, hair style, blurb
CREW = [
    ("captain", "Captain", "red", "light", (170, 172, 180), "short", "Commands the ship from the centre seat."),
    ("commander", "Commander", "red", "tan", (92, 58, 36), "short", "First officer. Runs the watch rotation."),
    ("helm", "Helm Officer", "gold", "brown", (30, 24, 24), "short", "Flies the ship. Steady hands, quick reflexes."),
    ("ops", "Ops Officer", "gold", "light", (176, 84, 36), "long", "Routes power and shuttles across the ship."),
    ("engineer", "Chief Engineer", "gold", "dark", (22, 18, 18), "bun", "Keeps the engines humming and the warp core calm."),
    ("security", "Security Chief", "gold", "tan", (22, 20, 28), "ponytail", "Guards the bridge and the corridors."),
    ("science", "Science Officer", "blue", "light", (230, 214, 150), "short", "Reads the sensors, finds the signal in the noise."),
    ("medic", "Medical Officer", "blue", "brown", (54, 36, 28), "long", "Patches up the crew and the build."),
    ("counselor", "Counselor", "blue", "tan", (60, 38, 30), "wave", "Reads the room. Keeps the team on an even keel."),
]


class Img:
    def __init__(self):
        self.p = [[None] * W for _ in range(H)]

    def set(self, x, y, c):
        if 0 <= x < W and 0 <= y < H:
            self.p[y][x] = c

    def rect(self, x0, y0, x1, y1, c):
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.set(x, y, c)

    def outline(self):
        """1px dark outline around opaque pixels (drawn on empty neighbours)."""
        add = []
        for y in range(H):
            for x in range(W):
                if self.p[y][x] is None:
                    for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                        nx, ny = x + dx, y + dy
                        if 0 <= nx < W and 0 <= ny < H and self.p[ny][nx] is not None:
                            add.append((x, y))
                            break
        for x, y in add:
            self.p[y][x] = OUT

    def to_image(self):
        im = Image.new("RGBA", (W, H), (0, 0, 0, 0))
        for y in range(H):
            for x in range(W):
                if self.p[y][x] is not None:
                    im.putpixel((x, y), (*self.p[y][x], 255))
        return im


def draw(member, back, phase):
    _, _, div, skin, hair, style, _ = member
    hi, base, sh = SKIN[skin]
    uni = DIV[div]
    uhi, ush = shade(uni, 1.18), shade(uni, 0.72)
    hh, hb, hs = shade(hair, 1.3), hair, shade(hair, 0.7)
    im = Img()
    # legs (rows 25-30) + feet; one foot lifts per step frame
    for lx0, lx1 in ((5, 7), (10, 12)):
        im.rect(lx0, 25, lx1, 30, PANTS)
        for y in range(25, 31):
            im.set(lx1, y, shade(PANTS, 0.75))
    left_low, right_low = phase != 1, phase != 2
    im.rect(5, 31 if left_low else 30, 7, 31 if left_low else 30, SHOE)
    im.rect(10, 31 if right_low else 30, 12, 31 if right_low else 30, SHOE)
    if not left_low:
        im.rect(5, 31, 7, 31, None)
    if not right_low:
        im.rect(10, 31, 12, 31, None)
    # torso: black shoulder yoke over division colour
    im.rect(4, 18, 13, 24, uni)
    im.rect(3, 19, 14, 24, uni)
    im.rect(4, 18, 13, 19, BLACK)
    im.rect(3, 19, 4, 20, BLACK)
    im.rect(13, 19, 14, 20, BLACK)
    for y in range(20, 25):
        im.set(3, y, ush)
        im.set(14, y, ush)
        im.set(13, y, ush)
    im.rect(4, 24, 13, 24, BLACK)  # belt
    # arms swing opposite to legs on step frames
    sw = {0: (0, 0), 1: (1, -1), 2: (-1, 1)}[phase]
    im.set(3, 25 + sw[0], base)
    im.set(14, 25 + sw[1], base)
    if back:
        for y in range(20, 24):
            im.set(8, y, ush)
    else:
        im.set(10, 21, BADGE)  # comm badge
        im.set(10, 22, shade(BADGE, 0.8))
        im.rect(8, 18, 9, 19, sh)  # collar/neck shadow
    # neck + head
    im.rect(7, 16, 10, 17, sh)
    for y in range(3, 16):
        for x in range(4, 14):
            if (x in (4, 13)) and y in (3, 4, 15):
                continue
            im.set(x, y, base)
    # hair
    if back:
        im.rect(4, 3, 13, 12, hb)
        im.rect(5, 2, 12, 2, hb)
        im.rect(5, 13, 12, 13, hb)
        for y in range(3, 12):
            im.set(8, y, hs)
        im.rect(6, 3, 8, 4, hh)
        if style in ("long", "wave"):
            im.rect(4, 13, 13, 17, hb)
        if style == "ponytail":
            im.rect(8, 13, 9, 19, hb)
        if style == "bun":
            im.rect(7, 1, 10, 2, hb)
    else:
        im.rect(4, 3, 13, 5, hb)
        im.rect(5, 2, 12, 2, hb)
        im.rect(6, 2, 8, 3, hh)
        im.rect(4, 6, 4, 7, hb)
        im.rect(13, 6, 13, 7, hb)
        if style in ("long", "wave"):
            im.rect(4, 6, 4, 17, hb)
            im.rect(13, 6, 13, 17, hb)
            im.rect(3, 9, 3, 15, hs)
            im.rect(14, 9, 14, 15, hs)
        if style == "bun":
            im.rect(7, 1, 10, 1, hb)
        if style == "ponytail":
            im.rect(13, 6, 14, 13, hb)
        # face
        for ex in (6, 11):
            im.set(ex, 9, (250, 248, 244))
            im.set(ex + (1 if ex == 6 else -1), 9, (46, 38, 42))
        im.set(5, 8, hs)
        im.set(6, 8, hs)
        im.set(11, 8, hs)
        im.set(12, 8, hs)
        im.rect(7, 12, 10, 12, shade(base, 0.72))
        for y in range(7, 13):
            im.set(12, y, shade(base, 0.9)) if y not in (8, 9) else None
    im.outline()
    return im.to_image()


def main():
    default_out = os.path.join(os.path.dirname(__file__), "..", "..", "..", "resources", "themes", "tng", "cast")
    out = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else default_out)
    os.makedirs(os.path.join(out, "sprites"), exist_ok=True)
    os.makedirs(os.path.join(out, "portraits"), exist_ok=True)
    roster = []
    for m in CREW:
        name = m[0]
        sheet = Image.new("RGBA", (W * 6, H), (0, 0, 0, 0))
        for i, (back, phase) in enumerate([(False, 0), (False, 1), (False, 2), (True, 0), (True, 1), (True, 2)]):
            sheet.paste(draw(m, back, phase), (i * W, 0))
        sheet.save(os.path.join(out, "sprites", f"{name}.png"))
        sheet.crop((0, 0, W, H)).resize((W * 2, H * 2), Image.NEAREST).save(os.path.join(out, "portraits", f"{name}.png"))
        r, g, b = DIV[m[2]]
        roster.append({"name": name, "displayName": m[1], "shirt": f"#{r:02x}{g:02x}{b:02x}", "blurb": m[6][:60]})
    with open(os.path.join(out, "cast.json"), "w", newline="\n") as f:
        json.dump(roster, f, indent=2)
        f.write("\n")
    print(f"{len(roster)} crew -> {out}")


if __name__ == "__main__":
    main()
