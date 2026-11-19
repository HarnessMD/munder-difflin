'use strict';

// Automatic typing into a Codex terminal waits on the screens it can name: Codex starting up
// or resuming, a popup or selection list at the bottom (folder trust, sign in, update, the
// import of another agent's setup), a /side conversation's empty composer, and a footer a
// keystroke owns. Any other screen is typed into as before. The app never answers a popup.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const S = loadTs('src/shared/codexScreen.ts');

/** A screen as rows; the cursor on the row marked by `cursor` (default: the last row). */
const facts = (rows, cursor = rows.length - 1) => S.extractCodexScreen((i) => rows[i], rows.length, cursor);
const hold = (rows, cursor) => S.codexScreenHold(facts(rows, cursor));
const header = (model, version = '0.153.4') => [
  '╭──────────────────────────────────────────╮',
  `│ >_ OpenAI Codex (v${version})              │`,
  '│                                          │',
  `│ model:     ${model}   /model to change    │`,
  '│ directory: ~/proj                        │',
  '╰──────────────────────────────────────────╯',
];
const COMPOSER = ['', '› Implement {feature}', '', '  gpt-5.1 high · ~/proj'];

test('the session header: the newest box at column 0 with a model row; loading while it starts; a resume or fork line right under it', () => {
  assert.equal(facts([...header('loading'), ...COMPOSER]).header, 'LOADING');
  assert.equal(hold([...header('loading'), ...COMPOSER]), 'startup');
  const ready = [...header('gpt-5.1'), ...COMPOSER];
  assert.equal(facts(ready).header, 'MODEL');
  assert.equal(hold(ready, 1 + header('x').length), null, 'the empty composer is typed into');
  assert.equal(hold([...header('gpt-5.1'), '  Resuming session…', ...COMPOSER]), 'session-starting');
  assert.equal(hold([...header('gpt-5.1'), '  Forking session…', ...COMPOSER]), 'session-starting');
  assert.equal(hold([...header('gpt-5.1'), '', '  Resuming session…', ...COMPOSER]), null, 'only the row right under the box');
  // the newest header wins; an old loading one scrolled up does not hold
  assert.equal(facts([...header('loading'), 'x', ...header('gpt-5.1'), ...COMPOSER]).header, 'MODEL');
  // a quoted header (indented) or a /status card (no model row) is not a session header
  assert.equal(facts([...header('loading').map((r) => `    ${r}`), ...COMPOSER]).header, 'NONE');
  const status = header('gpt-5.1').filter((r) => !r.includes('model:'));
  assert.equal(facts([...header('loading'), ...status, ...COMPOSER]).header, 'LOADING', 'a /status card is skipped, the session header under it is read');
});

test('the facts stay small: footer rows below the cursor (six at most, trimmed), the last 24 non-empty rows (indent kept), rows cut at 400', () => {
  const rows = Array.from({ length: 40 }, (_, i) => `  row ${i}   `);
  rows.push('', '', `  ${'y'.repeat(500)}`);
  const f = facts(rows, 30);
  assert.deepEqual(f.footer.slice(0, 2), ['row 31', 'row 32']);
  assert.equal(f.footer.length, S.CODEX_FOOTER_ROWS);
  assert.equal(f.tail.length, S.CODEX_TAIL_ROWS);
  assert.equal(f.tail[0], '  row 17');
  assert.equal(f.tail.at(-1).length, S.CODEX_ROW_MAX);
  assert.deepEqual([S.CODEX_FOOTER_ROWS, S.CODEX_TAIL_ROWS, S.CODEX_ROW_MAX, S.CODEX_POPUP_TEXT_MAX], [6, 24, 400, 160]);
});

const TRUST = [
  '> You are in /Users/x/proj', '',
  '  Do you trust the contents of this directory? Working with untrusted contents comes with higher risk of prompt injection.', '',
  '› 1. Yes, continue',
  '  2. No, quit', '',
  '  Press enter to continue',
];

test('a popup at the bottom holds, named by its header row: folder trust, an approval, a picker, the import screen', () => {
  assert.equal(hold(TRUST, 0), 'popup:Do you trust the contents of this directory? Working with untrusted contents comes with higher risk of prompt injection.');
  const long = 'L'.repeat(200);
  assert.equal(hold([long, '› 1. a', 'Press enter to continue']), `popup:${long.slice(0, 159)}…`, 'a long header is cut');
  assert.equal(hold([...header('gpt-5.1'), 'Select model', '  1. gpt-5.1   fast', '    a wrapped description', '› 2. gpt-5.1-codex', 'enter select · esc back'], 3), 'popup:Select model', 'over wrapped descriptions');
  assert.equal(hold(['Allow command?', '  1. Yes', '› 2. No, tell Codex what to do', 'Press enter to confirm or esc to go back']), 'popup:Allow command?');
  const IMPORT = ['  Import your setup from Claude Code', '  [✓] Rules', '› [x] MCP servers', '  [ ] Hooks', '    runs on events', '↑/↓ to move, enter to select, c to customize'];
  assert.equal(hold(IMPORT), 'popup:Import your setup from Claude Code');
  assert.equal(hold([...IMPORT, 'more text']), null, 'the list hint counts on the last row only');
  assert.equal(hold(['Pick', '› [x] a', 'ctrl + c to quit, enter to select']), 'popup:Pick', 'a key with a modifier');
});

test('what is not a popup: no hint at the bottom, no selected choice, no header row, a transcript bullet, the status line', () => {
  assert.equal(hold([...TRUST.slice(0, -1), '  Press enter to continue', 'later output', 'and more']), null, 'the hint is one of the last two rows');
  assert.equal(hold(['Header', '  1. a', '  2. b', 'Press enter to continue']), null, 'no selected choice');
  assert.equal(hold(['› 1. a', '  2. b', 'Press enter to continue']), null, 'no header row left');
  assert.equal(hold(['• Done.', '› 1. a', 'Press enter to continue']), null, 'an agent\'s bullet');
  assert.equal(hold(['Header', '› 1. a', '  gpt-5.1 high · ~/proj']), null, 'the status line is never a hint');
  assert.equal(hold(['Header', '› 1. a', 'Press enter to continue.']), null);
});

test('a /side conversation\'s empty composer holds; text the person typed there is typed after as before', () => {
  assert.equal(hold([...header('gpt-5.1'), '', `› ${S.CODEX_SIDE_PLACEHOLDER}`, '', '  side · esc to close']), 'side-conversation');
  assert.equal(hold([...header('gpt-5.1'), '', '› what about the tests', '', '  side']), null);
  assert.equal(hold([...header('gpt-5.1'), `› ${S.CODEX_SIDE_PLACEHOLDER}`, 'more', '› Implement {feature}']), null, 'the lowest composer row decides');
  assert.equal(S.CODEX_SIDE_PLACEHOLDER, 'Ask a follow-up question');
});

test('a transient footer a keystroke owns holds; a footer row above the cursor does not', () => {
  for (const f of ['ctrl + c again to quit', 'esc again to edit previous message', 'esc close']) {
    const rows = [...header('gpt-5.1'), '› ', '', `  ${f}`];
    assert.equal(hold(rows, header('x').length), 'transient-footer', f);
    assert.equal(hold([...header('gpt-5.1'), `  ${f}`, '› '], header('x').length + 1), null, `${f} above the cursor`);
  }
});

test('a screen it cannot name is typed into as before: no header at all, an empty buffer', () => {
  assert.equal(hold(['some', 'output', '› ']), null);
  assert.equal(hold([]), null);
});

test('wiring: every Codex write reads the screen fresh and waits (a minute at most, then fails, never types); the queue waits; no screen to read types as before', () => {
  const pool = read('src/renderer/src/components/terminalPool.ts');
  assert.match(pool, /import \{ codexScreenHold, extractCodexScreen \} from '@shared\/codexScreen';/);
  assert.match(pool, /export function isTerminalAutomationSafe\(ptyId: string, now = Date\.now\(\), codex = false\): boolean \{\s*const entry = pool\.get\(ptyId\);\s*if \(!entry\) return true;\s*if \(codex && codexScreenHoldFor\(ptyId\) !== null\) return false;/);
  assert.match(pool, /if \(!entry \|\| !entry\.opened \|\| entry\.exited\) return null;/);
  assert.match(pool, /extractCodexScreen\(\(i\) => buf\.getLine\(i\)\?\.translateToString\(true\), buf\.length, buf\.baseY \+ buf\.cursorY\);\s*return codexScreenHold\(facts\);\s*\} catch \{\s*return null;/);
  const hive = read('src/renderer/src/hooks/useHive.ts');
  assert.match(hive, /const CODEX_SCREEN_WAIT_MS = 60_000;/);
  assert.match(hive, /const hold = codexScreenHoldFor\(ptyId\);\s*if \(hold === null\) return;\s*if \(Date\.now\(\) - started >= CODEX_SCREEN_WAIT_MS\) throw new Error\(`codex screen held \(\$\{hold\}\): \$\{ptyId\}`\);/);
  assert.match(hive, /await waitForTerminalReady\(ptyId, provider\);\s*if \(provider === 'codex'\) await waitForCodexScreen\(ptyId\);/);
  assert.match(hive, /if \(!isTerminalAutomationSafe\(target\.ptyId, now, inferAgentProvider\(target\.command, target\.provider\) === 'codex'\)\) return \{ sent: false \};/);
  assert.doesNotMatch(read('src/shared/codexScreen.ts'), /\\x1b|\\r|write\(/, 'the screen reader types nothing');
});
