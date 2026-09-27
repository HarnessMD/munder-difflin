'use strict';

/**
 * THE EMBEDDED SWEEP (0.4.9 phase 5).
 *
 * Seventeen surfaces that PRO embedded but Classic drew now draw the kit in
 * BOTH skins. pro-fence.test.cjs already refuses a new pixel reachable from
 * PRO, but the fence only sees what PRO can reach, and it cannot see three
 * things this file exists for:
 *
 *   1. THE SWEEP DID NOT FORK ANYTHING. The point of sweeping rather than
 *      reimplementing was that Settings, the team surfaces and the update
 *      block stay ONE component each. A PRO copy of any of them would pass
 *      the fence and be exactly the drift the sweep was meant to prevent.
 *   2. THE KIT DID NOT LOSE ANYTHING ON THE WAY IN. PixelButton has had rest,
 *      hover and press since the Professional skin landed; the kit's Btn had
 *      one flat fill. Swapping seventy buttons onto a flat control would have
 *      been a downgrade nobody would notice in a diff.
 *   3. THE OLD VOCABULARY IS GONE. `variant`, `secondary` and `destructive`
 *      are PixelButton's words. A leftover means a tag was half-converted and
 *      is silently taking a prop nothing reads.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const C = 'src/renderer/src/components';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

/** Everything phase 5 swept, by the fence line it deleted. */
const SWEPT = [
  'AiEnginesSettings.tsx', 'IntegrationsRegistry.tsx', 'OfficeThemePicker.tsx',
  'PtyTerminalView.tsx', 'SettingsHeroCard.tsx', 'SettingsModal.tsx', 'SetupPanel.tsx',
  'TasksKanban.tsx', 'UpdatesSection.tsx',
  'team/ApprovalQueue.tsx', 'team/CrossNodeThread.tsx', 'team/FingerprintWarning.tsx',
  'team/OrgPanel.tsx', 'team/RevokedTakeover.tsx', 'team/TeamTab.tsx',
  'team/TeammateDetail.tsx', 'team/UpgradeToTeams.tsx'
];

test('every swept surface draws the kit, and none of them draws Classic any more', () => {
  for (const f of SWEPT) {
    const src = strip(read(`${C}/${f}`));
    for (const pixel of ['PixelButton', 'PixelPanel', 'PixelBadge']) {
      assert.ok(!src.includes(pixel), `${f} still draws ${pixel}`);
    }
    assert.ok(!/from '(\.\.\/)*\.?\/?Icon'/.test(src), `${f} still imports the pixel Icon`);
    assert.match(src, /from '(\.\.\/)*(\.\/)?pro\/(ui|icons)'/, `${f} imports nothing from the kit`);
  }
});

test('the sweep converted the vocabulary, it did not leave half a tag behind', () => {
  for (const f of SWEPT) {
    const src = strip(read(`${C}/${f}`));
    // `variant` belongs to PixelButton and PixelPanel. Nothing the kit exports
    // takes one, so a survivor is a prop being quietly dropped on the floor.
    for (const m of src.matchAll(/<(Btn|Panel|Chip)\b[^>]*?\bvariant=/g)) {
      assert.fail(`${f} passes variant= to the kit's ${m[1]}`);
    }
    // PixelButton's rungs, which the kit names differently.
    assert.ok(!/kind=["']secondary["']/.test(src), `${f} says kind="secondary"; the kit's word is default`);
    assert.ok(!/kind=["']destructive["']/.test(src), `${f} says kind="destructive"; the kit's word is danger`);
    // Both arms of a `variant={on ? a : b}` had to be mapped, not just one.
    for (const m of src.matchAll(/kind=\{[^}]*'(\w+)'\s*:\s*'(\w+)'/g)) {
      for (const word of [m[1], m[2]]) {
        assert.ok(['primary', 'default', 'ghost', 'danger'].includes(word),
          `${f} has a kind ternary arm the kit does not know: ${word}`);
      }
    }
  }
});

test('one component per swept surface: the sweep left no PRO fork behind', () => {
  const pro = fs.readdirSync(path.join(ROOT, C, 'pro'));
  for (const twin of ['SettingsModal.tsx', 'IntegrationsRegistry.tsx', 'OfficeThemePicker.tsx', 'AiEnginesSettings.tsx', 'TasksKanban.tsx']) {
    assert.ok(!pro.includes(twin), `pro/${twin} is a fork of the swept ${twin}`);
  }
  // Settings is still reached through the one component, embedded as a page.
  assert.match(strip(read(`${C}/pro/SettingsScreen.tsx`)), /from '\.\.\/SettingsModal'/);
});

test('the kit button kept the three rungs PixelButton had, and gained the sizes the sweep needed', () => {
  const ui = strip(read(`${C}/pro/ui.tsx`));
  const btn = ui.slice(ui.indexOf('export function Btn'), ui.indexOf('export function Bar'));
  assert.match(btn, /onMouseEnter/, 'no hover');
  assert.match(btn, /onMouseDown/, 'no press');
  assert.match(btn, /const step = \(rest: string, over: string, down: string\)/, 'rest/hover/press is not one ladder');
  for (const kind of ['default', 'primary', 'ghost', 'danger']) {
    assert.ok(btn.includes(`${kind}: {`), `Btn has no ${kind} rung`);
  }
  // `lg` and `fullWidth` exist because the swept Classic buttons used them.
  assert.match(btn, /'sm' \| 'md' \| 'lg'/);
  assert.match(btn, /fullWidth/);
  // A disabled control must not also look hovered.
  assert.match(btn, /disabled \? rest :/, 'hover and press apply while disabled');
});

test('the kit panel carries a title without carrying a heavier edge', () => {
  const ui = strip(read(`${C}/pro/ui.tsx`));
  const panel = ui.slice(ui.indexOf('export function Panel'), ui.indexOf('export function Tabs'));
  assert.ok(panel.length > 0, 'the kit has no Panel');
  // The even-border rule (founder, 2 Sep): the title's separator is an inset
  // shadow, exactly as Tabs does it, never a borderBottom.
  assert.ok(!/border(Bottom|Top|Left|Right)/.test(panel), 'Panel uses a one-edge border');
  assert.match(panel, /boxShadow: 'inset 0 -1px 0 var\(--cth-ink-300\)'/);
  assert.match(panel, /border: '1px solid var\(--cth-ink-300\)'/);
  // noPadding means the caller owns the inside; an extra wrapper would sit
  // between its own header/footer and the frame's height.
  assert.match(panel, /noPadding \? children :/);
});

test('updates: one reducer, two drawings', () => {
  // `.ts`, not `.tsx`: the compiler itself then refuses to let a drawing back
  // into the shared half, which is a stronger guarantee than grepping for a
  // tag (generics look like tags, and the first cut of this test said so).
  assert.ok(fs.existsSync(path.join(ROOT, C, 'updates/useUpdatesSection.ts')), 'the shared hook is not a .ts file');
  const hook = strip(read(`${C}/updates/useUpdatesSection.ts`));
  assert.match(hook, /export function useUpdatesSection/);
  for (const kit of ['pro/ui', 'PixelButton', './Icon']) {
    assert.ok(!hook.includes(kit), `the hook imports ${kit}; it must be skin free`);
  }
  for (const surface of [`${C}/UpdatesSection.tsx`, `${C}/pro/UpdatesScreen.tsx`]) {
    const src = strip(read(surface));
    assert.match(src, /useUpdatesSection\(\)/, `${surface} does not read the shared hook`);
    // Neither may re-derive the state: describeUpdateSettings and reduceStatus
    // are the hook's business, and a second caller is a second opinion.
    assert.ok(!src.includes('reduceStatus'), `${surface} runs its own reducer`);
    assert.ok(!src.includes('describeUpdateSettings'), `${surface} re-derives the view`);
  }
  // PRO can label the state precisely because the hook hands back the raw one;
  // 'idle' (nobody asked) must not be drawn as 'not-available' (we asked).
  const screen = strip(read(`${C}/pro/UpdatesScreen.tsx`));
  assert.match(screen, /STATE_CHIP\[state\]/);
  assert.ok(!/idle:/.test(screen.slice(screen.indexOf('STATE_CHIP'), screen.indexOf('export function'))),
    'idle is given a chip, which claims a check nobody ran');
});

test('the glyphs the sweep needed are real paths, not a name that renders nothing', () => {
  const icons = read(`${C}/pro/icons.tsx`);
  const declared = icons.slice(icons.indexOf('export type ProIconName'), icons.indexOf('const PATHS'));
  const paths = icons.slice(icons.indexOf('const PATHS'), icons.indexOf('export function ProIcon'));
  for (const name of ['bell', 'sparkle', 'minimize', 'arrowRight']) {
    assert.ok(declared.includes(`'${name}'`), `ProIconName is missing ${name}`);
    assert.match(paths, new RegExp(`\\b${name}: '[Mm]`), `${name} has no path data`);
  }
});
