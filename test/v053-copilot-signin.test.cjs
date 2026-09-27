/**
 * AN INSTALLED CLI THAT IS NOT SIGNED IN GETS THE SETUP PANEL (0.5.3, batch 2;
 * founder 24 Sep 2026: "Copilot is not working ... even if it's not installed,
 * it should still show the installation section that we just built").
 *
 *   1. An agent run that ends the way a signed out CLI ends (non zero in its
 *      first minute, or a recognised sign in failure line) brings up the same
 *      panel as after an install: Sign in, Set up manually, Setup complete,
 *      start agent. Nothing restarts by itself.
 *   2. Copilot has no status command, so it stays 'cannot tell'.
 *   3. A print mode run (Copilot -p) that exits 0 finished its task.
 *   4. The spawn env keeps everything Copilot signs in with.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { authFailureLine, offerSignInAfterExit, isPrintModeRun, EARLY_EXIT_MS, setupCanGoManual, setupCanStart } = loadTs('src/shared/cliSetup.ts');
const { exitVerdict, agentExitOf } = loadTs('src/shared/agentExit.ts');
const { hasSignInCheck } = loadTs('src/main/cliReadiness.ts');
const { buildPtyEnv } = loadTs('src/main/ptyEnv.ts');

// Copilot CLI 1.0.88, `copilot -p "say hi" -s` with no sign in, in a throwaway
// HOME (24 Sep 2026): exit 1 after about 5 s, this on the terminal.
const COPILOT_SIGNED_OUT = [
  'Error: No authentication information found.',
  '',
  'Copilot can be authenticated with GitHub using an OAuth Token or a Fine-Grained Personal Access Token.',
  '',
  'To authenticate, you can use any of the following methods:',
  "  \u2022 Start 'copilot' and run the '/login' command",
  '  \u2022 Set the COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN environment variable',
  "  \u2022 Run 'gh auth login' to authenticate with the GitHub CLI",
  ''
].join('\r\n');

test('Copilot signed out: the real output is read as a sign in failure', () => {
  const line = authFailureLine(COPILOT_SIGNED_OUT);
  assert.ok(line, 'a line was found');
  assert.match(line, /login|authentication/i);
  const r = offerSignInAfterExit({ provider: 'copilot', exitCode: 1, ranMs: 5000, tail: COPILOT_SIGNED_OUT });
  assert.equal(r.offer, true);
});

test('the failure line is read through colour codes, from the last lines only', () => {
  const esc = String.fromCharCode(27);
  assert.equal(authFailureLine(`${esc}[31mError: Not logged in${esc}[0m\n`), 'Error: Not logged in');
  const buried = 'please log in\n' + Array.from({ length: 30 }, (_, i) => `work line ${i}`).join('\n');
  assert.equal(authFailureLine(buried), null, 'a login mentioned long before the end is not the reason it ended');
  assert.equal(authFailureLine('[managedSettings] server policy fetch skipped: no authenticated GitHub host available'), null,
    'Copilot logs this while signed in; it is not a failure');
  for (const l of ['Please run `codex login`', 'Error: 401 Unauthorized', 'Invalid API key', 'Authentication required', 'You are not signed in']) {
    assert.ok(authFailureLine(l), l);
  }
  for (const l of ['Done. Wrote the login page.', 'exit', 'All tests pass']) assert.equal(authFailureLine(l), null, l);
});

test('when the panel is offered: the rule table', () => {
  const early = EARLY_EXIT_MS - 1;
  const late = EARLY_EXIT_MS + 1;
  const cases = [
    [{ exitCode: 1, ranMs: early, tail: 'boom' }, true, 'non zero in the first minute'],
    [{ exitCode: 1, ranMs: late, tail: 'boom' }, false, 'a late crash is a crash'],
    [{ exitCode: 1, ranMs: late, tail: 'Not logged in' }, true, 'a late non zero exit that says why'],
    [{ exitCode: 0, ranMs: early, tail: 'Please log in' }, true, 'a clean early exit that says why'],
    [{ exitCode: 0, ranMs: early, tail: 'hello' }, false, 'a clean early exit with no reason'],
    [{ exitCode: 0, ranMs: late, tail: 'Not logged in' }, false, 'a long clean run that mentioned a login'],
    [{ exitCode: 0, signal: 9, ranMs: early, tail: 'boom' }, false, 'killed from outside'],
    [{ exitCode: 0, signal: 15, ranMs: early, tail: 'Not authenticated' }, true, 'killed, but it said why, early']
  ];
  for (const [e, want, why] of cases) assert.equal(offerSignInAfterExit({ provider: 'copilot', ...e }).offer, want, why);
  assert.equal(offerSignInAfterExit({ provider: 'custom', exitCode: 1, ranMs: 10, tail: 'Not logged in' }).offer, false, 'a custom command has no known login');
});

test('the panel it raises: Sign in, Set up manually and Start (Start waits for the sign in)', () => {
  const state = { phase: 'signin', provider: 'copilot', label: 'Copilot', loginCommand: 'copilot login', cause: 'exit' };
  assert.equal(setupCanGoManual(state), true);
  assert.equal(setupCanStart(state), false, 'Start unlocks when the login exits 0');
  assert.equal(setupCanStart({ ...state, login: 'done' }), true);
  assert.equal(setupCanStart({ ...state, loginCommand: null }), true, 'a CLI with no login step: nothing to wait for');
});

test('main: each run is recorded, and an exit that looks signed out raises the panel and restarts nothing', () => {
  const src = read('src/main/index.ts');
  assert.match(src, /const agentRuns = new Map</);
  assert.match(src, /const asGiven: AgentSpawnOptions = \{ \.\.\.opts \};/);
  assert.match(src, /agentRuns\.set\(opts\.id, \{[\s\S]{0,300}printMode: isPrintModeRun\(provider, opts\.args \?\? \[\]\)/);
  const h = src.slice(src.indexOf('ptyManager.setExitHandler('), src.indexOf('function syncKeepAwake'));
  assert.match(h, /offerSignInAfterExit\(\{ provider: run\.provider, exitCode: exitCode \?\? 0, signal: info\?\.signal, ranMs: Date\.now\(\) - run\.startedAt, tail: info\?\.tail \?\? '' \}\)/);
  assert.match(h, /!run\.opts\.hive\?\.isGod && !liveWorkers\.has\(id\)/, 'never for the orchestrator or a dispatched worker');
  assert.match(h, /if \(signInOffer\) teardownPty\(id, 'revive'\);\n  else teardownPty\(id, 'exit'\);/, 'the worktree is kept for the start that follows');
  const offer = h.slice(h.indexOf('if (signInOffer && run)'));
  assert.match(offer, /cause: 'exit'/);
  assert.match(offer, /pendingCliSetup\.set\(id, \{ opts: run\.opts, owner: run\.owner, state \}\)/);
  assert.doesNotMatch(offer.slice(0, offer.indexOf('});')), /runLoginStep|spawnAgentCore/, 'nothing runs until a person presses a button');
  assert.match(src, /endCliSetup\(id\);\n  agentRuns\.delete\(id\);/, 'a Stop forgets the run');
});

test('Copilot has no status command, so readiness says cannot tell', () => {
  assert.equal(hasSignInCheck('copilot'), false);
  assert.match(read('src/main/cliReadiness.ts'), /Copilot has none/);
});

test('a print mode run that exits 0 finished its task; non zero still crashed', () => {
  assert.equal(isPrintModeRun('copilot', ['-s', '--allow-all-tools', '-p', 'brief']), true);
  assert.equal(isPrintModeRun('copilot', ['-s', '--allow-all-tools']), false);
  assert.equal(isPrintModeRun('codex', ['exec', 'x']), true);
  assert.equal(isPrintModeRun('gemini', ['--prompt=x']), true);
  assert.equal(exitVerdict(0, undefined, true), 'finished');
  assert.equal(exitVerdict(1, undefined, true), 'crashed');
  assert.equal(exitVerdict(0, undefined), 'stopped');
  assert.equal(agentExitOf(0, undefined, 1, true).verdict, 'finished');
  const src = read('src/main/index.ts');
  assert.match(src, /send\('hive:agentExited', \{ agentId: goneAgent, exitCode, signal: info\?\.signal, \.\.\.\(run\?\.printMode \? \{ printMode: true \} : \{\}\) \}\)/);
  assert.match(read('src/renderer/src/hooks/useHive.ts'), /agentExitOf\(exitCode, signal, Date\.now\(\), printMode === true\)/);
});

test('every place that says stopped also says finished, and the right panel keeps Restart', () => {
  assert.match(read('src/renderer/src/components/AgentCard.tsx'), /exit\.verdict === 'finished' \? t\('agentRow\.finished'\)/);
  assert.match(read('src/renderer/src/components/FullscreenTerminal.tsx'), /agent\.exit\.verdict === 'finished' \? t\('agentRow\.finished'\)/);
  const screen = read('src/renderer/src/components/pro/AgentScreen.tsx');
  assert.match(screen, /down\.verdict === 'finished' \? t\('pro\.agents\.finished'\)/);
  assert.match(screen, /kind=\{down \|\| changed \|\| draftDirty \? 'primary' : 'default'\}/, 'a finished agent is down, so Restart is the primary button');
  const rail = read('src/renderer/src/components/pro/ProSidebar.tsx');
  assert.match(rail, /\{agent\.exit\?\.verdict === 'finished' && \(\s*<Strip kind="done" word=\{t\('pro\.agents\.finished'\)\}[^\n]*color="var\(--cth-status-working\)"/, 'finished is a done strip, not a failure');
  assert.match(rail, /\{agent\.exit && agent\.exit\.verdict !== 'finished' && \(\s*<Strip\s+kind="crash"/);
});

test('renderer: a running login makes the terminal typeable again; the panel has Sign in; Start clears the exit mark', () => {
  assert.match(read('src/renderer/src/components/terminalPool.ts'), /if \(state\?\.login === 'running'\) entry\.exited = false;/);
  const panel = read('src/renderer/src/components/pro/CliSetupPanel.tsx');
  assert.match(panel, /const ended = !installing && !manual && setup\.cause === 'exit' && !setup\.login && !setup\.signedIn;/);
  assert.match(panel, /data-cli-setup-signin[\s\S]{0,80}t\('terminal\.cliSetup\.signin'\)/);
  assert.match(panel, /retrySetupLogin\(ptyId\)\); \}\} dataAttrs=\{\{ 'data-cli-setup-signin'/);
  assert.match(panel, /updateAgent\(a\.id, \{ exit: undefined, archived: false, status: 'idle' \}\)/);
});

test('the spawn env keeps what Copilot signs in with (point 4)', () => {
  const parent = { HOME: '/Users/x', GH_TOKEN: 'a', COPILOT_GITHUB_TOKEN: 'b', GITHUB_TOKEN: 'c', GH_CONFIG_DIR: '/g', COPILOT_HOME: '/c', GH_HOST: 'github.com', CLAUDE_CODE_CHILD_SESSION: '1' };
  const env = buildPtyEnv(parent, '/opt/homebrew/bin:/usr/bin', undefined, 'darwin');
  for (const k of ['HOME', 'GH_TOKEN', 'COPILOT_GITHUB_TOKEN', 'GITHUB_TOKEN', 'GH_CONFIG_DIR', 'COPILOT_HOME', 'GH_HOST']) assert.equal(env[k], parent[k], k);
  assert.equal(env.CLAUDE_CODE_CHILD_SESSION, undefined, 'only the parent session markers go');
  assert.match(env.PATH, /\/opt\/homebrew\/bin/, 'gh, which Copilot runs for its token, is on PATH');
});

test('copy: in every language, no dashes', () => {
  for (const l of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
    const c = j.terminal.cliSetup;
    for (const k of ['exitTitle', 'exitBody', 'exitBodySaid', 'exitBodyNoLogin', 'signin']) {
      assert.ok(c[k], `${l} ${k}`);
      assert.doesNotMatch(c[k], /[\u2013\u2014]| - /, `${l} ${k}`);
    }
    assert.ok(j.pro.agents.finished && j.agentRow.finished, l);
  }
});
