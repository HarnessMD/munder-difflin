/**
 * The sidebar agent row is one card: the highlight covers the paperclip, and
 * the note sits in the model's column at the model's size.
 *
 * Founder, 7 Sep 2026, with two screenshots: the selected row's fill stopped
 * short of the note control, so a selected agent read as a pill with a stray
 * icon beside it; and the note under a row sat lower and to the right of the
 * model name, in a larger face. The note's indent was a hardcoded 46px that
 * assumed a 28px wide portrait, and the portrait box for size 28 is 18 wide
 * (the sprite frame is 18 by 28), so the note landed 10px right of the model.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');

const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
const { portraitBoxFor, snapPortraitScaleFor } = loadTs('src/shared/portraitBox.ts');

/** The frame the app actually paints, read from the constants it paints with. */
function frame() {
  const roster = read('src/renderer/src/scene/office/castRoster.ts');
  const w = Number(/export const PORTRAIT_W = (\d+);/.exec(roster)[1]);
  const h = Number(/export const PORTRAIT_H = (\d+);/.exec(roster)[1]);
  return { w, h };
}

test('the portrait box for the sidebar size is the frame, not a square', () => {
  const { w, h } = frame();
  assert.equal(h, 28, 'the sidebar asks for 28, one native frame');
  assert.deepEqual(portraitBoxFor(28, w, h), { w, h }, 'one native frame: exactly the frame');
  assert.equal(portraitBoxFor(28, w, h).w < 28, true, 'narrower than the height the caller asked for');
  // Below one frame: the asked height, proportionally narrower.
  assert.deepEqual(portraitBoxFor(14, w, h), { w: Math.round(14 * (w / h)), h: 14 });
  // Above: the snapped whole multiple.
  assert.equal(snapPortraitScaleFor(56, h), 2);
  assert.deepEqual(portraitBoxFor(56, w, h), { w: w * 2, h: h * 2 });
  assert.equal(snapPortraitScaleFor(30, h), 1, 'never below 1');
  assert.deepEqual(portraitBoxFor(40, w, h), { w, h }, '40 rounds to one frame, not a fractional blit');
});

test('SpritePortrait draws the box the shared rule gives, at every size, so the sidebar cannot drift from it', () => {
  const sprite = read('src/renderer/src/components/SpritePortrait.tsx');
  const { w: FRAME_W, h: FRAME_H } = frame();
  assert.match(sprite, /import \{ portraitBoxFor \} from '@shared\/portraitBox';/);
  assert.match(sprite, /export function portraitBox\(size: number\): \{ w: number; h: number \} \{\s*\n\s*return portraitBoxFor\(size, FRAME_W, FRAME_H\);/);

  // The component's OWN lines (the ones test/pro-0411-avatars pins) are lifted
  // out of the source and run for every size; they must give the shared rule's
  // box. The component cannot be loaded whole (React, the '@/' alias), so the
  // snap is compiled the way that test compiles it and the two box lines are
  // read out verbatim.
  const at = sprite.indexOf('export function snapPortraitScale');
  const end = sprite.indexOf('\n}', at);
  const js = ts.transpileModule(sprite.slice(at, end + 2).replace('export ', ''), {
    compilerOptions: { target: ts.ScriptTarget.ES2022 }
  }).outputText;
  const snap = new Function('FRAME_H', `${js}; return snapPortraitScale;`)(FRAME_H);
  const subNativeScale = Number(/export const SUB_NATIVE_SCALE = (\d+);/.exec(sprite)[1]);
  const cssW = /const cssW = (.*);/.exec(sprite)[1];
  const cssH = /const cssH = (.*);/.exec(sprite)[1];
  const draw = new Function('size', 'FRAME_W', 'FRAME_H', 'SUB_NATIVE_SCALE', 'snapPortraitScale', `
    const subNative = size !== undefined && size < FRAME_H;
    const paintScale = subNative ? SUB_NATIVE_SCALE : snapPortraitScale(size);
    const w = Math.round(FRAME_W * paintScale);
    const h = Math.round(FRAME_H * paintScale);
    return { w: ${cssW}, h: ${cssH} };`);
  for (let size = 1; size <= 120; size++) {
    assert.deepEqual(portraitBoxFor(size, FRAME_W, FRAME_H), draw(size, FRAME_W, FRAME_H, subNativeScale, snap), `size ${size}`);
  }
});

test('the card carries the highlight: the whole row is one surface in one colour (V2, 0.5.3 F25)', () => {
  const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
  const row = sidebar.slice(sidebar.indexOf('function AgentRow('), sidebar.indexOf('function SectionLabel('));
  // The row is the card, the click target and the fill, all one element.
  assert.match(row, /<div\s+className="cth-rail-row"\s+data-agent-card=\{agent\.id\}\s+data-agent-nav=\{agent\.id\}/);
  assert.match(row, /background: active \? 'var\(--cth-surface-active\)' : 'transparent'/);
  assert.match(row, /color: active \? 'var\(--cth-ink-900\)' : 'var\(--cth-ink-700\)'/);
  // No nested pill: the name, the meta line and the note inherit the row's ink.
  assert.doesNotMatch(row, /<button[^>]*data-agent-nav/);
  // The note button is inside the row (line 1, or in front of the note), never outside it.
  const clip = row.slice(row.indexOf('className="cth-rail-clip"'), row.indexOf('<ProIcon name="note"'));
  assert.doesNotMatch(clip, /marginRight/);
});

test('the note sits in the body column at the model size, three lines, with the clip in front', () => {
  const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
  const row = sidebar.slice(sidebar.indexOf('function AgentRow('), sidebar.indexOf('function SectionLabel('));
  // The JSX keeps its literal (every avatar site is pinned on it); the named
  // size must be that same number.
  const literal = Number(/<SpritePortrait character=\{agent\.character\} size=\{(\d+)\} \/>/.exec(row)[1]);
  const named = Number(/const PORTRAIT_SIZE = (\d+);/.exec(sidebar)[1]);
  assert.equal(named, literal, 'the named portrait size is the one that is drawn');
  assert.match(row, /gap: ROW_GAP,\s*\n\s*padding: `6px 6px 6px \$\{CARD_PAD_LEFT\}px`/);
  assert.match(sidebar, /const PORTRAIT_SIZE = 28;\s*\nconst ROW_GAP = 8;\s*\nconst CARD_PAD_LEFT = 10;/);
  // Same size as the model line (10.5), same colour; the note is the last
  // child of the body column, the clip in front of it, three lines.
  assert.match(row, /data-agent-meta[^>]*fontSize: 10\.5, color: 'var\(--cth-ink-500\)'/);
  assert.match(row, /<span data-agent-note-row[\s\S]*?\{clipBtn\(t\('pro\.rail\.noteEdit'\)[\s\S]*?<TruncatedNote\s+note=\{agent\.note\}\s+data-agent-note-text\s+lines=\{3\}[\s\S]*?fontSize: 10\.5, fontWeight: 400, lineHeight: 1\.3, color: 'var\(--cth-ink-500\)'/);
  // The editor is multi line: Enter is a new line, Cmd Enter saves, Esc cancels.
  const pieces = read('src/renderer/src/components/pro/railPieces.tsx');
  assert.match(pieces, /<textarea[\s\S]*?if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); e\.stopPropagation\(\); onCancel\(\); \}\s*\n\s*if \(e\.key === 'Enter' && \(e\.metaKey \|\| e\.ctrlKey\)\) \{ e\.preventDefault\(\); save\(\); \}/);
  // The old guesses are gone.
  assert.doesNotMatch(row, /46px|noteIndent/);
});
