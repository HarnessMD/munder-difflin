'use strict';

/* 0.5.3, I2 (Creed, 23 Sep 2026): a missing engine CLI is a calm card, not a
 * dead prompt. Main spawns nothing, sends the card's state, and the install
 * runs only when the person presses Install; a clean install restarts the one
 * terminal through the relaunch seam that already existed; a failed install
 * brings the card back with the installer's own last lines and Try again.
 *
 * The pure half (describeMissingCli, installerTail, cliMissingAction) is run;
 * the wiring in main, preload, the pool and the view is pinned by reading the
 * source, the way the meeting hotkey and floor lock suites pin theirs. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { describeMissingCli } = loadTs('src/main/cliInstall.ts');
const { installerTail, cliMissingAction } = loadTs('src/shared/cliMissing.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const nodeInstaller = { version: 'v24.19.0', file: 'node-v24.19.0.pkg', url: 'https://nodejs.org/x', sha256: 'a'.repeat(64), kind: 'pkg' };

test('the card says the rung and the exact command before anything runs', () => {
  const npm = describeMissingCli('claude', 'claude', true, 'darwin');
  assert.equal(npm.rung, 'npm');
  assert.equal(npm.command, 'npm install -g @anthropic-ai/claude-code');
  assert.equal(npm.label, 'Claude Code');
  assert.equal(npm.bin, 'claude');
  assert.equal(npm.nodeMissing, false);
  assert.equal(npm.manualCommand, null);
  assert.match(npm.docsUrl, /^https:\/\//);

  const node = describeMissingCli('codex', 'codex', false, 'darwin', nodeInstaller);
  assert.equal(node.rung, 'node-then-npm');
  assert.equal(node.nodeVersion, 'v24.19.0', 'the card names the Node it will put on first');
  assert.equal(node.nodeMissing, true);
  assert.equal(node.command, 'npm install -g @openai/codex');

  const native = describeMissingCli('claude', 'claude', false, 'win32', null);
  assert.equal(native.rung, 'native', 'no npm and no Node installer: the vendor installer');
  assert.match(native.command, /install\.ps1/);
  assert.equal(native.nodeVersion, undefined);

  const manual = describeMissingCli('gemini', 'gemini', false, 'linux', null);
  assert.equal(manual.rung, 'manual');
  assert.equal(manual.command, null, 'nothing to run: the button is Check again');
  assert.equal(manual.manualCommand, 'npm install -g @google/gemini-cli', 'the line to paste once Node is there');
  assert.equal(manual.nodeMissing, true);

  // I2 part 3: the four providers that had no installer at all. Grok, Kimi
  // and Antigravity ship a standalone binary through the vendor's script (no
  // npm package exists), so with or without npm the rung is the native one;
  // Qwen is an npm package. Each command was run into a throwaway HOME on
  // this Mac on 23 Sep 2026 (see the PR); the URLs answered 200 that day.
  for (const [provider, posix, win32] of [
    ['grok', 'curl -fsSL https://x.ai/cli/install.sh | bash', 'powershell -c irm https://x.ai/cli/install.ps1 ^| iex'],
    ['kimi', 'curl -fsSL https://cdn.kimi.com/kimi-code/install.sh | bash', 'powershell -c irm https://cdn.kimi.com/kimi-code/install.ps1 ^| iex'],
    ['antigravity', 'curl -fsSL https://antigravity.google/cli/install.sh | bash', 'powershell -c irm https://antigravity.google/cli/install.ps1 ^| iex']
  ]) {
    const mac = describeMissingCli(provider, provider, true, 'darwin');
    assert.equal(mac.rung, 'native', `${provider}: the vendor script, even with npm around`);
    assert.equal(mac.command, posix, provider);
    assert.ok(!mac.command.includes('"'), `${provider}: no double quotes, the win32 line is wrapped in cmd /c "…"`);
    const win = describeMissingCli(provider, provider, false, 'win32', null);
    assert.equal(win.rung, 'native'); assert.equal(win.command, win32, provider);
    assert.match(mac.docsUrl, /^https:\/\//, provider);
  }
  const qwen = describeMissingCli('qwen', 'qwen', true, 'darwin');
  assert.equal(qwen.rung, 'npm'); assert.equal(qwen.command, 'npm install -g @qwen-code/qwen-code@latest');
  assert.equal(describeMissingCli('qwen', 'qwen', false, 'darwin', nodeInstaller).rung, 'node-then-npm', 'no npm: Node first, then the package');
  const custom = describeMissingCli('custom', 'my tool; rm -rf /', true, 'darwin');
  assert.equal(custom.rung, 'manual');
  assert.equal(custom.bin, 'mytoolrm-rf', 'the binary name is sanitized before it is drawn');
  assert.equal(custom.manualCommand, null);
});

test('the button follows the state: Install, then Try again after a failure, Check again when nothing can run', () => {
  const s = describeMissingCli('claude', 'claude', true, 'darwin');
  assert.equal(cliMissingAction(s), 'install');
  assert.equal(cliMissingAction({ ...s, failed: { exitCode: 1, tail: 'npm ERR! 403' } }), 'retry');
  assert.equal(cliMissingAction(describeMissingCli('custom', 'x', true, 'darwin')), 'check');
  assert.equal(cliMissingAction({ ...describeMissingCli('gemini', 'gemini', false, 'linux', null), failed: { exitCode: 1, tail: '' } }), 'check', 'a manual rung never offers to run again');
});

test('the installer tail is plain text, the last eight non blank lines', () => {
  const esc = String.fromCharCode(27);
  const raw = Array.from({ length: 12 }, (_, i) => `${esc}[31mline ${i + 1}${esc}[0m`).join('\r\n') + '\n\n   \n';
  const tail = installerTail(raw);
  assert.equal(tail.split('\n').length, 8);
  assert.equal(tail.split('\n')[0], 'line 5');
  assert.equal(tail.split('\n')[7], 'line 12');
  assert.ok(!tail.includes(esc), 'no colour codes');
  assert.equal(installerTail(undefined), '');
  assert.equal(installerTail('a\nb\nc', 2), 'b\nc');
});

test('main: a missing binary draws the card and spawns nothing until Install; a failed install brings the card back', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /if \(!opts\.installNow\) \{\s*const state = describeMissingCli\(provider, bin, npmAvailable, process\.platform, nodeInstaller\);\s*pendingCliMissing\.set\(opts\.id, \{ opts, owner, state \}\);\s*sendCliMissing\(opts\.id, owner, state\);[\s\S]*?return \{ ok: true, cwd: opts\.cwd, cliMissing: state \};/, 'the card, then return before ptyManager.spawn');
  assert.match(main, /ipcMain\.handle\('pty:installCli'/);
  assert.match(main, /return spawnAgentCore\(\{ \.\.\.paused\.opts, installNow: true, guidedSetup: true \}, paused\.owner\);/, 'Install re-enters the same spawn (batch 2: as a guided setup)');
  assert.match(main, /if \(ptyManager\.isCommandAvailable\(bin\)\) \{[\s\S]*?wc\?\.send\(`pty:relaunch:\$\{id\}`\);[\s\S]*?return spawnAgentCore\(\{ \.\.\.paused\.opts, noAutoInstall: true \}, paused\.owner\);/, 'a CLI installed by hand starts into the same pty');
  assert.match(main, /paused\.state = \{ \.\.\.paused\.state, failed: \{ exitCode: exitCode \|\| 1, tail: installerTail\(info\?\.tail\) \} \};\s*sendCliMissing\(id, pending\.owner, paused\.state\);/, 'a failed install sends the card again with the tail');
  // Batch 2: an install nobody pressed for still relaunches at once; a guided
  // one stops at sign in (pinned in v053-cli-setup-flow.test.cjs).
  assert.match(main, /pendingCliMissing\.delete\(id\);[^\n]*\n\s*if \(!pending\.opts\.guidedSetup\) \{[\s\S]*?void spawnAgentCore\(\{ \.\.\.pending\.opts, noAutoInstall: true \}, pending\.owner\);/, 'a clean unguided install drops the pause and relaunches');
  // Main initiated spawns have nobody at the card: they install as before.
  assert.match(main, /const res = await spawnAgentCore\(\{ \.\.\.o, installNow: true \}, null\);/);
  assert.match(main, /installNow: true \/\/ a god dispatched worker/);
});

test('preload, pool and view: the state reaches the terminal and the button goes back through main', () => {
  const preload = read('src/preload/index.ts');
  assert.match(preload, /installCli: \(id: string\)[\s\S]*?ipcRenderer\.invoke\('pty:installCli', id\)/);
  assert.match(preload, /onPtyCliMissing: \(id: string, cb: \(state: CliMissingState\) => void\)[\s\S]*?`pty:cli-missing:\$\{id\}`/);
  const pool = read('src/renderer/src/components/terminalPool.ts');
  assert.match(pool, /window\.cth\.onPtyCliMissing\(ptyId, \(state\) => \{\s*entry\.exited = false;\s*setCliMissing\(entry, state\);/, 'the card never latches exited');
  assert.match(pool, /onPtyRelaunch\(ptyId, \(\) => \{\s*entry\.exited = false;\s*setCliMissing\(entry, null\);/, 'the relaunch clears the card');
  assert.match(pool, /export function useCliMissing\(ptyId: string \| undefined\)/);
  assert.match(pool, /export async function installMissingCli\(ptyId: string\)/);
  const view = read('src/renderer/src/components/PtyTerminalView.tsx');
  assert.match(view, /\{cliMissing && <CliMissingCard ptyId=\{ptyId\} state=\{cliMissing\} \/>\}/);
  const card = read('src/renderer/src/components/CliMissingCard.tsx');
  assert.match(card, /dataAttrs=\{\{ 'data-cli-missing-action': action \}\}/);
  assert.ok(!/status-blocked|cth-coral|#[0-9a-f]{3,6}\b|\bred\b/i.test(card), 'the card is calm: no red, no error colour, only the ink and paper tokens');
  // Founder, 23 Sep 2026: the buttons are the kit's own (hand pointer, the
  // three fill ladder, both skins and themes), the surface and mono block are
  // the kit's, and the overlay re-enables pointer events out loud so a pass
  // through ancestor cannot leave the buttons drawn but dead.
  assert.match(card, /import \{ Btn, CodeBox \} from '\.\/pro\/ui';/, 'the card is built from the kit');
  assert.match(card, /pointerEvents: 'auto', cursor: 'default'/, 'the overlay takes the pointer back');
  assert.ok(!/const btn: CSSProperties|cursor: 'pointer'/.test(card), 'no hand styled button of its own: the kit Btn carries the pointer cursor');
  for (const loc of ['en', 'zh-CN', 'ar']) {
    const block = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`)).terminal?.cliMissing;
    assert.ok(block, `${loc} has terminal.cliMissing`);
    for (const k of ['title', 'customTitle', 'npmWhat', 'nodeWhat', 'nativeWhat', 'manualNodeWhat', 'manualWhat', 'customWhat', 'failed', 'refused', 'install', 'retry', 'check', 'working', 'docs']) {
      assert.equal(typeof block[k], 'string', `${loc} ${k}`);
      assert.ok(!/[—–]|\s-\s/.test(block[k]), `${loc} ${k}: no dashes in copy`);
    }
  }
});
