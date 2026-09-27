'use strict';

// Card sidebar-no-scroll-profile-unreachable, founder 6 Sep 2026: two agents
// were enough for the sidebar column to grow past the viewport and take the
// profile row with it, because no child owned a scroll region. Verified by
// screenshots in the preview harness (boards "Sidebar with twelve agents", a
// tall and a SHORT frame) before and after; this file guards the structure so
// the class of bug where the code merely looks right cannot come back quietly.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');

test('the sidebar is header, one scroll region, pinned profile row', () => {
  // The middle owns the scroll, and minHeight: 0 is the load bearing half:
  // a flex child without it refuses to shrink below its content and the
  // whole column grows again.
  assert.match(sidebar, /data-sidebar-scroll style=\{\{ flex: 1, minHeight: 0, overflowY: 'auto', overflowX: 'hidden', display: 'flex', flexDirection: 'column' \}\}/);
  // The scroll region opens after the brand block and closes before the
  // profile row, so both stay pinned outside it.
  const open = sidebar.indexOf('data-sidebar-scroll');
  const brand = sidebar.indexOf('{/* Brand */}');
  const profile = sidebar.indexOf('{/* Profile row + drop-up */}');
  assert.ok(brand > 0 && brand < open, 'the brand header sits above the scroll region');
  assert.ok(open < profile, 'the profile row sits below it');
  const between = sidebar.slice(open, profile);
  assert.ok(between.includes('data-agent-list'), 'the agent list lives inside the scroll region');
  assert.ok(between.lastIndexOf('</div>') > between.lastIndexOf('</nav>'), 'the region closes after the last nav, before the profile row');
  // The old growing stack is gone: no bare flex spacer pushing a footer.
  assert.doesNotMatch(sidebar, /<div style=\{\{ flex: 1 \}\} \/>/);
});

test('the preview harness keeps the overflow boards, tall and short', () => {
  const boards = read('tools/preview/boards.tsx');
  assert.match(boards, /Sidebar with twelve agents, tall window/);
  assert.match(boards, /Sidebar with twelve agents, SHORT window/);
  assert.match(boards, /useStore\.setState\(\{ agents: SIDEBAR_AGENTS \}\)/, 'the board seeds the real store the sidebar reads');
});

/* 0.5.2, card v052-sidebar-layout (founder, 8 Sep 2026): the orchestrator's
   name was cut to "Ste…" beside its badge, the account block was too tall,
   and the scrollbar had to go while the scrolling stayed. */
test('the sidebar is wide enough for a name beside the Orchestrator chip, and the width is one constant', () => {
  const m = sidebar.match(/export const PRO_SIDEBAR_WIDTH = (\d+);/);
  assert.ok(m, 'the width is a named constant');
  assert.ok(Number(m[1]) >= 288, `the column is ${m[1]}px; at 244 the name had about 35px beside the chip`);
  // The row itself is not redesigned: the chip, the badge and the dot still sit beside the name.
  assert.match(sidebar, /isGodRow && <Chip tone="accent"/);
  assert.match(sidebar, /<EngineBadge provider=\{agent\.provider\}/);
});

test('the sidebar scrolls with no visible scrollbar, in the one form that also holds on Windows and Linux', () => {
  const css = read('src/renderer/src/design/global.css');
  // The rule: no track for Firefox-style engines, and a ZERO WIDTH track for
  // Chromium. Zero width is the part that matters off macOS, where a classic
  // scrollbar takes layout width and a merely transparent one would leave a
  // gutter and narrow the column.
  assert.match(css, /\.cth-scroll-hidden \{ scrollbar-width: none;/);
  assert.match(css, /\.cth-scroll-hidden::-webkit-scrollbar \{ width: 0; height: 0; display: none; \}/);
  // The scroll region wears it, and still scrolls (overflowY stays auto, never hidden).
  const region = sidebar.match(/<div data-sidebar-scroll style=\{\{[^}]*\}\}[^>]*>/);
  assert.ok(region, 'the scroll region is where it was');
  assert.match(region[0], /overflowY: 'auto'/);
  assert.match(region[0], /className="cth-scroll-hidden"/);
  assert.doesNotMatch(region[0], /overflow: 'hidden'|overflowY: 'hidden'/, 'hiding the scrollbar must not hide the scrolling');
  // The drop-up menu, the other thing in the column that scrolls, is treated the same.
  const menu = sidebar.slice(sidebar.indexOf('role="menu"'), sidebar.indexOf('<MenuRow icon="profile"'));
  assert.match(menu, /className="cth-scroll-hidden"/);
});

test('the account block at the bottom is short: tight padding, a small monogram, two tight lines', () => {
  const profile = sidebar.slice(sidebar.indexOf('{/* Profile row + drop-up'), sidebar.indexOf('{/* THE ONE PLACE A TEAM IS OFFERED'));
  assert.match(profile, /padding: '4px 6px', borderTop/, 'the outer padding is 4px, not 8');
  assert.match(profile, /padding: collapsed \? '4px 0' : '4px 6px'/, 'the row button is 4px tall in padding, not 6');
  assert.match(profile, /data-profile-lines style=\{\{ minWidth: 0, flex: 1, lineHeight: 1\.2 \}\}/, 'the two lines are set tight');
  const initials = sidebar.slice(sidebar.indexOf('function Initials('));
  assert.match(initials, /width: 22, height: 22/, 'the monogram is 22px, not 26');
  // Still two facts (founder, 5 Sep 2026): the name over the email.
  assert.match(profile, /\{personName\}/);
  assert.match(profile, /\{personLine\}/);
});
