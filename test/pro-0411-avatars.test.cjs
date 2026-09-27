// 0.4.11 pilot item 15: "the avatars are muffled and do not look clear".
//
// Root cause: every PRO render site asked ui.tsx's Portrait for a chip sized
// box, and CastPortrait blitted the 18x28 sprite at a FRACTIONAL scale (0.7)
// with smoothing off. A nearest neighbour blit below 1x drops whole sprite
// rows unevenly, so the face came out both small and mangled, then a cream
// chip sat behind what was left.
//
// The contract pinned here:
//   1. SpritePortrait takes an opt in `size` box and snaps it to a WHOLE
//      multiple of the native frame (snapPortraitScale, never below 1), the
//      canvas backing store equals the CSS box, and it draws pixelated.
//      Below one native frame no whole multiple fits, so the sprite paints at
//      SUB_NATIVE_SCALE and the browser downsamples it smoothly instead of
//      dropping rows.
//   2. The PRO render sites draw the sprite BARE: no chip, no background,
//      one step bigger than before. The agent screen header takes one step
//      more than a list row.
//   3. Classic sees nothing: without `size`, the `scale` prop keeps its exact
//      old meaning and its default of 2, and the painter still receives it.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PRO = 'src/renderer/src/components/pro';

const sprite = read('src/renderer/src/components/SpritePortrait.tsx');

/** Compile one exported helper out of the component source and hand it back
 *  as a callable, with the native frame height bound the way the module binds
 *  it. The component itself pulls React and the '@/' alias, which the test
 *  loader cannot resolve, so the helper is lifted instead of the module. */
function helper(name) {
  const at = sprite.indexOf(`export function ${name}`);
  assert.ok(at >= 0, `SpritePortrait exports ${name}`);
  const end = sprite.indexOf('\n}', at);
  const js = ts.transpileModule(sprite.slice(at, end + 2).replace('export ', ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText;
  return new Function('FRAME_H', `${js}; return ${name};`)(28);
}

/* ---- 1. the snap ----------------------------------------------------------- */

test('snapPortraitScale: whole multiples of the native frame, never below one', () => {
  const snap = helper('snapPortraitScale');
  assert.equal(snap(28), 1, 'one native frame is scale 1');
  assert.equal(snap(56), 2, 'two frames is scale 2');
  assert.equal(snap(84), 3);
  assert.equal(snap(41), 1, '41px is nearer one frame than two');
  assert.equal(snap(42), 2, '42px rounds up to two frames');
  assert.equal(snap(16), 1, 'a box below one frame never goes fractional');
  assert.equal(snap(1), 1);
  for (let box = 1; box <= 200; box++) {
    const s = snap(box);
    assert.ok(Number.isInteger(s) && s >= 1, `snap(${box}) = ${s} must be a whole scale`);
  }
});

test('the size box: integer backing store, pixelated at or above one frame, smooth below it', () => {
  assert.match(sprite, /export const SUB_NATIVE_SCALE = 2/);
  assert.match(sprite, /const subNative = size !== undefined && size < FRAME_H;/);
  assert.match(sprite, /const paintScale = size === undefined \? scale : subNative \? SUB_NATIVE_SCALE : snapPortraitScale\(size\);/);
  // The painter is fed the snapped scale, and the canvas attributes are the
  // SAME numbers as the CSS box on the snapped path. A store and box that
  // disagree is exactly what blurs pixel art.
  assert.match(sprite, /paintPortrait\(ctx, character, paintScale\)/);
  assert.match(sprite, /const w = Math\.round\(FRAME_W \* paintScale\);/);
  assert.match(sprite, /const h = Math\.round\(FRAME_H \* paintScale\);/);
  assert.match(sprite, /width=\{w\}\s+height=\{h\}/);
  assert.match(sprite, /width: cssW,\s*height: cssH,/);
  assert.match(sprite, /const cssW = subNative \? Math\.round\(size \* \(FRAME_W \/ FRAME_H\)\) : w;/);
  assert.match(sprite, /const cssH = subNative \? size : h;/);
  assert.match(sprite, /imageRendering: subNative \? 'auto' : 'pixelated'/);
});

/* ---- 3. Classic unchanged --------------------------------------------------- */

test('without size, the old scale contract is untouched: default 2, scale drives the paint', () => {
  // The prop keeps its default...
  assert.match(sprite, /scale = 2,/);
  // ...and `size === undefined ? scale` (pinned above) means every existing
  // caller resolves paintScale to its own scale prop, bit for bit. The two
  // opt in style effects are gated on `size` so a Classic caller's style
  // cannot change either.
  assert.match(sprite, /flexShrink: size !== undefined \? 0 : undefined/);
  // The Classic and gallery callers still pass scale, not size.
  const gallery = read(`${PRO}/AvatarGallery.tsx`);
  assert.match(gallery, /<SpritePortrait character=\{character\} scale=\{TILE_SCALE\} forceSprite \/>/);
});

/* ---- 2. bare render sites --------------------------------------------------- */

const SITES = {
  'ProSidebar.tsx': [/<SpritePortrait character=\{agent\.character\} size=\{28\} \/>/],
  'InboxScreen.tsx': [
    /icon = <SpritePortrait character=\{c\.agent\.character\} size=\{28\} \/>;/,
    /icon=\{<SpritePortrait character=\{agent\.character\} size=\{28\} \/>\}/,
    /sender \? <SpritePortrait character=\{sender\.character\} size=\{28\} \/>/
  ],
  // The Ask me card moved out of InboxScreen in 0.5.3; the thread and the
  // Ask me modal both draw it.
  'AskMeCard.tsx': [/\{a \? <SpritePortrait character=\{a\.character\} size=\{28\} \/> : null\}/],
  'AgentScreen.tsx': [/<SpritePortrait character=\{agent\.character\} size=\{40\} \/>/],
  'AgentInbox.tsx': [
    /who \? <SpritePortrait character=\{who\.character\} size=\{28\} \/>/,
    /\{owner && <SpritePortrait character=\{owner\.character\} size=\{28\} \/>\}/
  ],
  'AgentsScreen.tsx': [
    /<SpritePortrait character=\{god\?\.character \?\? 'michael'\} size=\{40\} \/>/,
    /<SpritePortrait character=\{a\.character\} size=\{56\} \/>/,
    /<SpritePortrait character=\{agent\.character\} size=\{28\} \/>/
  ],
  'MemoryScreen.tsx': [
    /\{owner && <SpritePortrait character=\{owner\.character\} size=\{28\} \/>\}/,
    /\{agent && <SpritePortrait character=\{agent\.character\} size=\{28\} \/>\}/,
    /\{a && <SpritePortrait character=\{a\.character\} size=\{28\} \/>\}/,
    /<SpritePortrait character=\{a\.character\} size=\{18\} \/>/,
    /<SpritePortrait character=\{a\.character\} size=\{16\} \/>/
  ]
};

test('every PRO avatar site draws SpritePortrait bare: no chip wrapper, no background prop', () => {
  for (const [file, pins] of Object.entries(SITES)) {
    const src = read(`${PRO}/${file}`);
    for (const pin of pins) assert.match(src, pin, `${file} site`);
    // The chip backed Portrait/CastPortrait wrapper is gone from these files
    // (`<Portrait ` cannot match `<SpritePortrait`).
    assert.ok(!/<Portrait |<CastPortrait /.test(src), `${file} still wraps an avatar in the chip Portrait`);
    // Bare means bare: no site paints a background behind the sprite.
    assert.ok(!/<SpritePortrait[^>]*background/.test(src), `${file} passes a background to the sprite`);
  }
});

test('the agent screen header and the orchestrator screen header are the same bar with the same sprite', () => {
  // The 2x face (56 in a 64 bar) was called too big for this bar on the god
  // screen on 5 Sep 2026 and on the agent screen on 7 Sep 2026 (founder: "it
  // should be the same as the orchestrator"). Both draw the bare sprite at
  // native 28 art in a 40 box, in the standard 52 bar with the same padding.
  const room = read(`${PRO}/AgentScreen.tsx`);
  const god = read(`${PRO}/GodScreen.tsx`);
  for (const [name, src] of [['agent', room], ['god', god]]) {
    assert.match(src, /<SpritePortrait character=\{agent\.character\} size=\{40\} \/>/, `the ${name} header is the bare sprite at native art size`);
    assert.match(src, /height: 52, padding: '0 18px'/, `the ${name} header is the standard bar`);
    assert.ok(!/<Portrait |<CastPortrait /.test(src), `no chip avatar survives on the ${name} screen`);
  }
  assert.doesNotMatch(room, /size=\{56\}/, 'no 2x face is left on the agent screen');
  assert.doesNotMatch(room, /height: 64/, 'the taller bar the 2x face needed is gone with it');
});

test('the orchestrator wears Michael\'s face again, and team rows stay people', () => {
  // 5 Sep 2026: the founder reversed round 2 item 2 for the orchestrator. The
  // brand mark stays on the app (icons, docs, the sidebar brand row) but the
  // god's FACE is the Michael sprite once more, at every surface, with
  // 'michael' as the fallback when no god row exists yet. GodMark and the old
  // GodPlaceholder are both gone.
  const fs = require('fs');
  const path = require('path');
  assert.ok(!fs.existsSync(path.join(__dirname, '..', 'src/renderer/src/components/pro/GodMark.tsx')), 'GodMark is deleted');
  const agents = read(`${PRO}/AgentsScreen.tsx`);
  assert.ok(!/GodPlaceholder/.test(agents), 'the placeholder stays dead');
  assert.match(agents, /character=\{god\?\.character \?\? 'michael'\}/, 'no god row still means Michael, never a blank');
  for (const f of ['ProSidebar.tsx', 'InboxScreen.tsx', 'AgentScreen.tsx', 'AgentInbox.tsx', 'AgentsScreen.tsx', 'MemoryScreen.tsx']) {
    assert.ok(!/GodMark/.test(read(`${PRO}/${f}`)), `${f} draws the sprite, not the brand mark`);
  }
  // TeamScreen renders PEOPLE (initials by ruling), so it carries GlyphAvatar
  // and no sprite chip either.
  const team = read(`${PRO}/TeamScreen.tsx`);
  assert.match(team, /<GlyphAvatar name=\{/);
  assert.ok(!/<Portrait |<SpritePortrait /.test(team), 'a person is never a sprite');
});

test('the brand asset feeds the app icon too: one logo, byte for byte', () => {
  const fs = require('fs');
  const path = require('path');
  const root = path.join(__dirname, '..');
  const docs = fs.readFileSync(path.join(root, 'docs/logo.png'));
  const icon = fs.readFileSync(path.join(root, 'build/icon.png'));
  assert.ok(docs.equals(icon), 'docs/logo.png and build/icon.png must be the same image');
  // The light variant is the same self grounded art, and every icon container
  // is present and non trivial for the three installers.
  assert.ok(fs.readFileSync(path.join(root, 'docs/logo-light.png')).equals(docs));
  for (const f of ['build/icon.icns', 'build/icon.ico', 'docs/favicon-32.png', 'docs/apple-touch-icon.png']) {
    assert.ok(fs.statSync(path.join(root, f)).size > 500, `${f} exists and is not a stub`);
  }
});

/* ---- the graph nodes: crisp, not resized ------------------------------------ */

test('memory graph nodes downsample the integer scaled offscreen sprite smoothly', () => {
  const screen = read(`${PRO}/MemoryScreen.tsx`);
  // The offscreen portrait is still painted at a whole multiple with
  // smoothing off (an integer upscale wants nearest neighbour)...
  const offscreen = screen.slice(screen.indexOf('function usePortraits('), screen.indexOf('function graphWith('));
  assert.match(offscreen, /const scale = 3;/);
  assert.match(offscreen, /ctx\.imageSmoothingEnabled = false;/);
  // ...but the per frame blit DOWN to node size resamples smoothly, scoped by
  // the save/clip around it: nearest neighbour below 1x is the row dropping
  // that mangled the faces.
  const blitAt = screen.indexOf('const img = portraits.current.get(');
  assert.ok(blitAt >= 0, 'the node blit exists');
  const blit = screen.slice(blitAt, screen.indexOf('ctx.restore();', blitAt));
  assert.match(blit, /ctx\.imageSmoothingEnabled = true;/);
  assert.match(blit, /ctx\.imageSmoothingQuality = 'high';/);
});
