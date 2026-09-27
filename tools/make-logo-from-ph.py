#!/usr/bin/env python3
"""
0.5.3 brand mark (founder, 23 Sep 2026): "Use this logo (it's a gif but a
static version of this) everywhere in the app logo in the top left section as
well as the actual app logo that's shown in the dock and installation time."

Source: docs/media/logo-source-240.png, frame 1 of the Product Hunt thumbnail
docs/media/ph-thumbnail-240.gif (Michael facing forward, eyes open). The art
sits on an exact 10 px grid, so every size of 240 px and up is an integer
nearest-neighbour scale (no blur); the portrait stays anchored to the bottom
edge, as in the thumbnail, and the extra canvas is the thumbnail's own yellow.
Smaller sizes are box-filtered down from the 1024 master.

Writes: docs/logo.png, docs/logo-light.png, docs/favicon-32.png,
docs/apple-touch-icon.png, docs/logo.svg, build/icon.png, build/icon.svg,
build/icon.ico, build/icon.icns (macOS: iconutil).

    python3 tools/make-logo-from-ph.py

tools/make-logo.cjs draws the older framing (rounded tile, ink border);
running it would put that back.
"""
import base64, io, os, shutil, subprocess, tempfile
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = Image.open(os.path.join(ROOT, 'docs/media/logo-source-240.png')).convert('RGBA')
assert SRC.size == (240, 240)
GROUND = SRC.getpixel((0, 0))


def at_scale(k):
    """The art at k times, on a canvas of 256*k, bottom anchored, centred."""
    size = 256 * k
    canvas = Image.new('RGBA', (size, size), GROUND)
    art = SRC.resize((240 * k, 240 * k), Image.NEAREST)
    canvas.paste(art, ((size - 240 * k) // 2, size - 240 * k))
    return canvas


MASTER = at_scale(4)  # 1024


def render(size):
    if size % 256 == 0:
        return at_scale(size // 256)
    return MASTER.resize((size, size), Image.BOX)


def png(size):
    buf = io.BytesIO()
    render(size).convert('RGB').save(buf, 'PNG', optimize=True)
    return buf.getvalue()


def write(rel, data):
    with open(os.path.join(ROOT, rel), 'wb') as f:
        f.write(data)
    print(f'{rel:30} {len(data) / 1024:.1f} KB')


def svg(size):
    b64 = base64.b64encode(png(size)).decode()
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {size} {size}" width="{size}" height="{size}">'
            f'<image href="data:image/png;base64,{b64}" width="{size}" height="{size}" style="image-rendering:pixelated"/></svg>').encode()


write('docs/logo.png', png(512))
write('docs/logo-light.png', png(512))
write('docs/favicon-32.png', png(32))
write('docs/apple-touch-icon.png', png(180))
write('docs/logo.svg', svg(1024))
# Same bytes as docs/logo.png: test/pro-0411-avatars pins one logo, byte for byte.
write('build/icon.png', png(512))
write('build/icon.svg', svg(1024))

ico = io.BytesIO()
render(256).convert('RGBA').save(ico, 'ICO', sizes=[(s, s) for s in (16, 24, 32, 48, 64, 128, 256)])
write('build/icon.ico', ico.getvalue())

tmp = tempfile.mkdtemp()
iconset = os.path.join(tmp, 'icon.iconset')
os.mkdir(iconset)
for base in (16, 32, 128, 256, 512):
    for mult, suffix in ((1, ''), (2, '@2x')):
        render(base * mult).convert('RGBA').save(os.path.join(iconset, f'icon_{base}x{base}{suffix}.png'))
out = os.path.join(tmp, 'icon.icns')
subprocess.run(['iconutil', '-c', 'icns', iconset, '-o', out], check=True)
with open(out, 'rb') as f:
    write('build/icon.icns', f.read())
shutil.rmtree(tmp)
