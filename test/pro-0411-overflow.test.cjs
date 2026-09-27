// 0.4.11, founder: "The tasks ID is longer than expected it is overflowing,
// please check overflows in all table sections and fix them."
//
// What this pins: every cell on the Tasks screen and the task sheet that can
// carry a long monospace id (yc-update-draft-2026-08-19 and friends) or a long
// name clips with an ellipsis inside its own box, and the full value survives
// as the title attribute so hover reveals it. Ids are one line, never wrapped;
// body text (titles, descriptions) wraps, which pro-0410-clamp already pins.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const screen = strip(read(`${PRO}/TasksScreen.tsx`));
const sheet = strip(read(`${PRO}/TaskSheet.tsx`));

/* ---- the card (board and cards views share TaskCard) ----------------------- */

test('the card header id clips with an ellipsis and hover shows the whole id', () => {
  assert.match(
    screen,
    /<span title=\{task\.id\} style=\{\{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' \}\}>\{task\.id\}<\/span>/
  );
});

test('the footer chip for an unresolved assignee id cannot blow out the card', () => {
  assert.match(
    screen,
    /<Chip title=\{task\.assignee\} style=\{\{ maxWidth: '100%', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', display: 'inline-block', lineHeight: '18px' \}\}>\{task\.assignee\}<\/Chip>/
  );
});

/* ---- the list view table --------------------------------------------------- */

test('the list id cell clips with an ellipsis, with the full id on hover', () => {
  assert.match(
    screen,
    /<td title=\{x\.id\} style=\{\{ \.\.\.td, fontFamily: 'var\(--cth-font-mono\)', fontSize: 12, color: 'var\(--cth-ink-500\)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' \}\}>\{x\.id\}<\/td>/
  );
});

test('the assignee and archived cells clip instead of stretching the fixed table', () => {
  assert.match(screen, /<td title=\{x\.assignee \? nameFor\(x\.assignee\) : undefined\} style=\{\{ \.\.\.td, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' \}\}>/);
  assert.match(screen, /<span style=\{\{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis' \}\}>\{nameFor\(x\.assignee\)\}<\/span>/, 'the name inside the inline-flex row clips too');
  const archivedCell = screen.match(/\{archived && \(\s*<td style=\{\{ \.\.\.td,[^}]*\}\}>/);
  assert.ok(archivedCell && /overflow: 'hidden', textOverflow: 'ellipsis'/.test(archivedCell[0]), 'the archived column clips its line');
});

/* ---- the save bar ---------------------------------------------------------- */

test('a staged move chip clips its id, keeps the statuses whole, and hover shows the id', () => {
  assert.match(
    screen,
    /<b title=\{m\.id\} style=\{\{ fontFamily: 'var\(--cth-font-mono\)', fontWeight: 500, color: 'var\(--cth-ink-500\)', minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' \}\}>\{m\.id\}<\/b>/
  );
  assert.match(screen, /\{t\(`pro\.tasks\.status\.\$\{m\.from\}`\)\}<\/span>/);
  assert.match(screen, /color: 'var\(--cth-ink-500\)', flexShrink: 0 \}\}>\{t\(`pro\.tasks\.status\.\$\{m\.from\}`\)\}/, 'the from status never shrinks');
  assert.match(screen, /fontWeight: 600, flexShrink: 0 \}\}>\{t\(`pro\.tasks\.status\.\$\{m\.to\}`\)\}/, 'nor does the to status');
});

test('the unstage X is round with one even 1px border, never a thicker edge', () => {
  const btn = screen.slice(screen.indexOf("aria-label={t('pro.tasks.unstage')}"), screen.indexOf('name="close"'));
  assert.match(btn, /borderRadius: 999/);
  assert.match(btn, /border: '1px solid var\(--cth-ink-300\)'/);
  assert.ok(!/borderLeft|borderTop|borderRight|borderBottom/.test(btn), 'the X grew a thicker edge on one side');
});

/* ---- the sheet ------------------------------------------------------------- */

test('the sheet header id is capped so a long id cannot crowd out the title', () => {
  assert.match(
    sheet,
    /<span title=\{task\.id\} style=\{\{ fontFamily: 'var\(--cth-font-mono\)', fontSize: 12, color: 'var\(--cth-ink-500\)', maxWidth: '40%', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' \}\}>\{task\.id\}<\/span>/
  );
});

test('a dependency row caps its id and clips the unresolved assignee name', () => {
  assert.match(
    sheet,
    /<span title=\{task\.id\} style=\{\{ fontFamily: 'var\(--cth-font-mono\)', fontSize: 11, color: 'var\(--cth-ink-500\)', maxWidth: '45%', flexShrink: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' \}\}>\{task\.id\}<\/span>/
  );
  assert.match(sheet, /<span title=\{nameFor\(task\.assignee\)\} style=\{\{ fontSize: 13, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' \}\}>\{nameFor\(task\.assignee\)\}<\/span>/);
});

/* ---- the label ships in all three locales, no dashes ----------------------- */

test('pro.tasks.unstage exists in en, zh-CN and ar with no dash', () => {
  for (const l of ['en', 'zh-CN', 'ar']) {
    const v = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.tasks.unstage;
    assert.equal(typeof v, 'string', `pro.tasks.unstage missing in ${l}`);
    assert.ok(!/[—–]/.test(v) && !/ - /.test(v), `pro.tasks.unstage (${l}) carries a dash`);
  }
});
