'use strict';

/* 0.5.3, batch 4 (founder, 24 Sep 2026): "Handle the cases where login or
 * setup can not be done either due to installation issue or authentication
 * issue by showing them set up manually button that opens the terminal with
 * the command that starts the terminal with the agent provider that is causing
 * the issues. there should also be a message for them to click on "setup
 * completed spawn agent" button once they have verified manually that the cli
 * agent is working locally on their app."
 *
 *   1. "Set up manually" on a failed install card (and the manual rung), and
 *      on the sign in panel until the sign in is seen to finish.
 *   2. It opens the agent's own terminal, with the agent's own environment:
 *      the install command when the install failed, else the CLI itself.
 *   3. Under it, the message; Start is live in this mode, and it discards the
 *      manual terminal and starts the agent.
 *   4. Start looks for the binary from scratch: a fresh login shell PATH and
 *      the native installers' own folders (~/.kimi-code/bin, ~/.grok/bin).
 *
 * The scripts are run for real with stand ins for the CLI and the shell; the
 * wiring is pinned by reading the source, like the rest of I2. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const loadTs = require('./load-ts.cjs');

const { setupCanStart, setupCanStartAnyway, setupCanGoManual, composerHoldKey } = loadTs('src/shared/cliSetup.ts');
const { buildManualSetupScript } = loadTs('src/main/cliInstall.ts');
const shellEnv = loadTs('src/main/shellEnv.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const posix = process.platform !== 'win32';

const signin = (extra) => ({ phase: 'signin', provider: 'kimi', label: 'Kimi Code', loginCommand: 'kimi login', ...extra });
const manual = (reason) => ({ phase: 'manual', provider: 'kimi', label: 'Kimi Code', loginCommand: null, manual: { reason, command: reason === 'install' ? 'curl -fsSL https://cdn.kimi.com/kimi-code/install.sh | bash' : 'kimi' } });

/* ── the rules ─────────────────────────────────────────────────────────── */

test('Set up manually is offered until the sign in is seen to finish, never while installing or after', () => {
  assert.equal(setupCanGoManual(signin({ login: 'running' })), true, 'a login still waiting');
  assert.equal(setupCanGoManual(signin({ login: 'failed' })), true, 'a login that failed');
  assert.equal(setupCanGoManual({ ...signin(), loginCommand: null }), true, 'a CLI that gives no way to tell');
  assert.equal(setupCanGoManual(signin({ login: 'done' })), false);
  assert.equal(setupCanGoManual(signin({ login: 'running', signedIn: true })), false);
  assert.equal(setupCanGoManual({ phase: 'installing', provider: 'kimi', label: 'Kimi Code', loginCommand: null }), false);
  assert.equal(setupCanGoManual(manual('signin')), false, 'already manual');
  assert.equal(setupCanGoManual(null), false);
});

test('in manual mode Start is live (the person is the check), and the composer still holds', () => {
  for (const reason of ['install', 'signin']) {
    assert.equal(setupCanStart(manual(reason)), true, reason);
    assert.equal(setupCanStartAnyway(manual(reason)), false, 'no second door needed');
    assert.equal(composerHoldKey(manual(reason), false), 'terminal.cliSetup.holdSignin', 'nothing typed into the manual terminal');
  }
  // Batch 2's gate is unchanged outside manual mode.
  assert.equal(setupCanStart(signin({ login: 'running' })), false);
});

/* ── the manual terminal's script, run for real ───────────────────────── */

function runScript(script, env) {
  return spawnSync('/bin/sh', ['-c', script], { encoding: 'utf8', env: { PATH: process.env.PATH, ...env }, timeout: 10000 });
}
function fakeShell(dir) {
  const sh = path.join(dir, 'fake-shell');
  fs.writeFileSync(sh, '#!/bin/sh\necho "SHELL-REACHED $*"\n', { mode: 0o755 });
  return sh;
}

test('sign in: the banner, then the CLI itself (quoted, resolved path), then the person\'s own interactive shell', { skip: posix ? false : 'posix script' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-manual-'));
  try {
    const bin = path.join(dir, "it's bin", 'kimi');
    fs.mkdirSync(path.dirname(bin));
    fs.writeFileSync(bin, '#!/bin/sh\necho "CLI-RAN $HOME"\n', { mode: 0o755 });
    const script = buildManualSetupScript({ reason: 'signin', label: 'Kimi Code', binName: 'kimi', shown: 'kimi', exec: bin }, 'darwin');
    const r = runScript(script, { SHELL: fakeShell(dir), HOME: '/agent-home' });
    assert.equal(r.status, 0, r.stderr);
    const out = r.stdout;
    assert.match(out, /Set up Kimi Code by hand\. This terminal has the agent settings\./);
    assert.match(out, /It runs:  kimi\n/);
    assert.match(out, /Sign in inside it\./);
    assert.match(out, /press Setup complete, start agent/);
    const ran = out.indexOf('CLI-RAN /agent-home');
    const shell = out.indexOf('SHELL-REACHED -il');
    assert.ok(ran > out.indexOf('Sign in inside it.'), 'the CLI runs after the banner, with the agent env');
    assert.ok(shell > ran, 'then the person\'s own login shell, interactive');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('install: the install command runs as given, the banner says to run the CLI after it, then the shell', { skip: posix ? false : 'posix script' }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-manual-'));
  try {
    const script = buildManualSetupScript({ reason: 'install', label: 'Grok · xAI', binName: 'grok', shown: 'echo INSTALL-RAN | cat', exec: 'echo INSTALL-RAN | cat' }, 'darwin');
    const r = runScript(script, { SHELL: fakeShell(dir) });
    assert.equal(r.status, 0, r.stderr);
    assert.match(r.stdout, /Set up Grok · xAI by hand/);
    assert.match(r.stdout, /It runs:  echo INSTALL-RAN \| cat/, 'the pipe is shown as is');
    assert.match(r.stdout, /When the install ends, run grok here and sign in\./);
    assert.ok(r.stdout.indexOf('\nINSTALL-RAN\n') > 0);
    assert.ok(r.stdout.indexOf('SHELL-REACHED') > r.stdout.indexOf('\nINSTALL-RAN\n'), 'a failed install still leaves a shell');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('echo text can never break out of its quotes: quotes, ampersands and redirects are dropped', () => {
  const s = buildManualSetupScript({ reason: 'install', label: "x' ; rm -rf ~ '", binName: 'a&b>c', shown: "q'uote & <x>", exec: 'true' }, 'darwin');
  for (const line of s.split('\n').filter((l) => l.startsWith('echo '))) {
    const inner = line.slice(5);
    assert.ok(/^'[^']*'$/.test(inner) || inner === `''`, `one single quoted string: ${line}`);
  }
  const w = buildManualSetupScript({ reason: 'signin', label: 'Kimi Code', binName: 'kimi', shown: 'kimi & calc', exec: 'kimi' }, 'win32');
  assert.ok(!w.includes('"'), 'no double quote in the cmd.exe line');
  assert.ok(w.includes('echo   It runs:  kimi  calc'), 'the & is dropped from the echo');
  assert.ok(w.endsWith(' & kimi & echo. & cmd'), 'the CLI, then a prompt in the same window');
});

/* ── 4. a fresh lookup ─────────────────────────────────────────────────── */

test('the native installers\' own folders are looked in, after the common ones', () => {
  const dirs = shellEnv.commonBinDirs('/h');
  assert.ok(dirs.includes('/h/.kimi-code/bin'));
  assert.ok(dirs.includes('/h/.grok/bin'));
  assert.ok(dirs.indexOf('/h/.local/bin') < dirs.indexOf('/h/.kimi-code/bin'));
  assert.match(read('src/main/pty.ts'), /const candidates = commonBinDirs\(process\.env\.HOME \?\? ''\)/, 'the spawn and the check use the same list');
});

test('a binary only in ~/.kimi-code/bin resolves (a native install whose PATH line no shell has read yet)', { skip: posix ? false : 'posix paths' }, () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-home-'));
  const saved = { HOME: process.env.HOME, SHELL: process.env.SHELL };
  try {
    fs.mkdirSync(path.join(home, '.kimi-code', 'bin'), { recursive: true });
    const bin = path.join(home, '.kimi-code', 'bin', 'md-fake-kimi-cli');
    fs.writeFileSync(bin, '#!/bin/sh\n', { mode: 0o755 });
    process.env.HOME = home;
    process.env.SHELL = '/bin/sh';
    assert.equal(shellEnv.resolveCommand('md-fake-kimi-cli'), bin);
  } finally {
    process.env.HOME = saved.HOME; process.env.SHELL = saved.SHELL;
    shellEnv.forgetShellLookups();
    fs.rmSync(home, { recursive: true, force: true });
  }
});

test('forgetShellLookups drops the cached captures, so the next lookup sees the shell as it is now', { skip: posix ? false : 'posix shell' }, () => {
  const saved = process.env.SHELL;
  try {
    process.env.SHELL = '/bin/sh';
    process.env.MD_MANUAL_T = 'before';
    assert.equal(shellEnv.captureFromLoginShell('printf %s "$MD_MANUAL_T"'), 'before');
    process.env.MD_MANUAL_T = 'after';
    assert.equal(shellEnv.captureFromLoginShell('printf %s "$MD_MANUAL_T"'), 'before', 'cached, as before batch 4');
    shellEnv.forgetShellLookups();
    assert.equal(shellEnv.captureFromLoginShell('printf %s "$MD_MANUAL_T"'), 'after');
  } finally {
    process.env.SHELL = saved; delete process.env.MD_MANUAL_T;
    shellEnv.forgetShellLookups();
  }
});

/* ── main wiring ───────────────────────────────────────────────────────── */

const main = read('src/main/index.ts');
const fnBody = (name) => {
  const start = main.indexOf(`function ${name}(`);
  assert.ok(start > 0, name);
  return main.slice(start, main.indexOf('\n}\n', start));
};

test('main: Set up manually opens the agent\'s own pty with the install command or the CLI, and Start is live', () => {
  const open = fnBody('openManualSetup');
  assert.match(open, /setupCanGoManual\(setup\.state\)/, 'from the sign in panel, only while the sign in is unseen');
  assert.match(open, /reason: 'signin', label: state\.label, binName, shown: binName, exec: binPath/, 'the CLI itself, resolved');
  assert.match(open, /missing\.state\.command \?\? missing\.state\.manualCommand/, 'from the card, the install command it showed');
  assert.match(open, /missing\.state\.provider !== 'custom'/, 'a custom command has nothing to run');
  assert.match(open, /ptyManager\.kill\(id\)/, 'a login still running is discarded');
  assert.match(open, /pendingInstallRelaunch\.delete\(id\)/);
  assert.match(open, /if \(setup\?\.state\.login === 'running'\) closeLoginModal\(id, owner, 'failure'\);/, 'the killed login\'s modal closes (its code is dead)');
  assert.match(fnBody('startAgentAfterSetup'), /if \(setup\.state\.login === 'running'\) closeLoginModal\(id, setup\.owner, 'failure'\);/, 'Start closes it too');
  assert.ok(open.indexOf('pty:relaunch:') < open.indexOf('sendCliSetup(id, owner, state)'), 'the grid is wiped before the panel is drawn (the reset clears panels)');
  assert.match(open, /spawnAgentCore\(\{ \.\.\.opts, manualSetup: true, noAutoInstall: true, isolate: false, resume: false \}/, 'through spawnAgentCore: the hive sets the agent\'s own CLI home first');
  assert.match(main, /ipcMain\.handle\('pty:cliSetupManual'/);
});

test('main: the manual terminal is not a login: no sign in check first, no link watcher, and its exit leaves the panel', () => {
  assert.match(main, /if \(!opts\.manualSetup && hasSignInCheck\(provider\) && await checkSignedIn/);
  assert.match(main, /if \(res\.ok && opts\.manualSetup\) ptyOwners\.set\(opts\.id, owner\);\n\s*else if \(res\.ok\) \{\n\s*loginWatcher\.track/);
  assert.match(main, /if \(inSetup && inSetup\.state\.phase === 'manual'\) return;/);
});

test('main: Start from manual mode looks again from scratch and lets a still missing CLI bring the card back', () => {
  const start = fnBody('startAgentAfterSetup');
  assert.match(start, /manualSetup: _m/, 'the manual script never reaches the agent spawn');
  const m = start.slice(start.indexOf("phase === 'manual'"));
  assert.ok(m.indexOf('ptyManager.forgetLookups()') < m.indexOf('spawnAgentCore'), 'fresh lookup before the spawn');
  assert.match(m, /spawnAgentCore\(\{ \.\.\.opts, noAutoInstall: false \}/);
  assert.match(main, /if \(setup\.state\.phase === 'installing'\) return \{ ok: false, error: 'still-installing' \};/, 'the IPC allows manual');
  assert.match(main, /if \(exitCode === 0\) ptyManager\.forgetLookups\(\);\n\s*if \(exitCode === 0 && ptyManager\.isCommandAvailable\(pending\.bin\)\)/, 'an install that ended is looked for from scratch too');
  const pty = read('src/main/pty.ts');
  assert.match(pty, /forgetLookups\(\): void \{\n\s*forgetShellLookups\(\);\n\s*this\.resolvedCommands\.clear\(\);/);
});

/* ── renderer ──────────────────────────────────────────────────────────── */

test('the card and the panel carry the button; the panel says what to do next', () => {
  const card = read('src/renderer/src/components/CliMissingCard.tsx');
  assert.match(card, /const canGoManual = !custom && !!shown && \(!!state\.failed \|\| state\.rung === 'manual'\);/);
  assert.match(card, /press\(openManualSetup\)/);
  const panel = read('src/renderer/src/components/pro/CliSetupPanel.tsx');
  assert.match(panel, /const goManual = setupCanGoManual\(setup\);/);
  assert.match(panel, /openManualSetup\(ptyId\)/);
  assert.match(panel, /terminal\.cliSetup\.manualThen/);
  assert.match(panel, /\{!installing && !failed && \(/, 'Start shows in manual mode, enabled by setupCanStart');
  assert.match(read('src/preload/index.ts'), /cliSetupManual: \(id: string\)[^\n]*\n\s*ipcRenderer\.invoke\('pty:cliSetupManual', id\)/);
  assert.match(read('src/renderer/src/components/terminalPool.ts'), /export async function openManualSetup\(ptyId: string\)/);
});

test('copy: the new strings in en, zh-CN and ar, no dashes, and the message names the start button', () => {
  const keys = ['manual', 'manualTitle', 'manualInstallBody', 'manualSigninBody', 'manualThen'];
  for (const loc of ['en', 'zh-CN', 'ar']) {
    const s = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`)).terminal.cliSetup;
    for (const k of keys) {
      assert.equal(typeof s[k], 'string', `${loc} ${k}`);
      assert.ok(!/[-–—]/.test(s[k]), `${loc} ${k} has a dash`);
    }
    assert.ok(s.manualThen.includes(s.start), `${loc}: the message names the button as it reads`);
  }
});
