'use strict';

/* 0.5.3, batch 2 (founder, 24 Sep 2026): the missing CLI flow, end to end.
 *
 *   (a) the Inbox tab of a CLI-missing agent shows the same card;
 *   (b) the install output stays until it ends (the old automatic restart
 *       cleared it the moment npm finished, and Copilot's silent print mode
 *       then left the pane blank);
 *   (c) while missing, installing or signing in, Send and the queue hold;
 *   (d) a clean install stops at "Sign in needed": the provider's login runs
 *       in the same terminal with the agent's own environment, and "Setup
 *       complete, start agent" discards that terminal and starts fresh;
 *   (e) claude, codex and cursor are asked whether they are signed in, by
 *       their own status command, with the rules Kevin set: the agent's spawn
 *       environment, stdin closed, 10 seconds, killed by pid when over, and
 *       anything unclear is "cannot tell", never "signed out".
 *
 * The (e) states are proven against FAKE binaries on a throwaway HOME, one
 * per provider and state, so the real CLIs and the person's logins are never
 * touched. The wiring is pinned by reading the source, like the rest of I2. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const loadTs = require('./load-ts.cjs');

const { readSignInStatus, checkSignedIn, hasSignInCheck } = loadTs('src/main/cliReadiness.ts');
const { providerLoginArgs, loginCommandLine, composerHoldKey, setupCanStart, setupCanStartAnyway } = loadTs('src/shared/cliSetup.ts');
const { buildLoginScript, buildMissingCliScript } = loadTs('src/main/cliInstall.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

/* ── (e) the status readings, rule by rule ────────────────────────────── */

test('claude: exit 0 is signed in, exit 1 with loggedIn false is signed out, anything else cannot tell', () => {
  assert.equal(readSignInStatus('claude', 0, '{"loggedIn": true}', ''), 'signed-in');
  assert.equal(readSignInStatus('claude', 1, '{\n  "loggedIn": false,\n  "authMethod": "none"\n}\n', ''), 'signed-out');
  assert.equal(readSignInStatus('claude', 1, 'Error: something broke', ''), 'unknown', 'exit 1 without the JSON is not a sign out');
  assert.equal(readSignInStatus('claude', 1, '{"loggedIn": true}', ''), 'unknown');
  assert.equal(readSignInStatus('claude', 2, '{"loggedIn": false}', ''), 'unknown', 'only exit 1 carries the signed out answer');
  assert.equal(readSignInStatus('claude', null, '', ''), 'unknown', 'killed: cannot tell');
});

test('codex: exit 0 signed in, exit 1 with the Not logged in line signed out (the PATH alias warning ahead of it is fine)', () => {
  assert.equal(readSignInStatus('codex', 0, 'Logged in using ChatGPT', ''), 'signed-in');
  assert.equal(readSignInStatus('codex', 1, 'Not logged in\n', ''), 'signed-out');
  assert.equal(readSignInStatus('codex', 1, '', 'WARNING: proceeding, even though we could not create PATH aliases\nNot logged in\n'), 'signed-out');
  assert.equal(readSignInStatus('codex', 1, 'Error: config.toml is invalid', ''), 'unknown');
  assert.equal(readSignInStatus('codex', 1, 'Not logged in yet, maybe', ''), 'unknown', 'the whole line, not a substring');
});

test('cursor: exactly Not logged in is signed out, Logged in as is signed in, anything else cannot tell (matched on 2026.09.23-86fc751)', () => {
  const esc = String.fromCharCode(27);
  assert.equal(readSignInStatus('cursor', 0, `${esc}[31mNot logged in${esc}[39m\n`, ''), 'signed-out', 'the red colour is stripped first');
  assert.equal(readSignInStatus('cursor', 0, '✓ Logged in as person@example.com\n', ''), 'signed-in');
  assert.equal(readSignInStatus('cursor', 0, 'Logged in as user id 42\n', ''), 'signed-in');
  assert.equal(readSignInStatus('cursor', 0, 'Partially authenticated (missing refresh token)\n', ''), 'unknown');
  assert.equal(readSignInStatus('cursor', 0, 'Not logged in\nsomething else\n', ''), 'unknown', 'only the exact single line');
  assert.equal(readSignInStatus('cursor', 1, 'Not logged in\n', ''), 'unknown', 'a failed status run is cannot tell');
  assert.match(read('src/main/cliReadiness.ts'), /cursor-agent 2026\.09\.23-86fc751/, 'the matched version is pinned in the source');
});

test('every other provider has no check and reads as cannot tell', () => {
  for (const p of ['gemini', 'qwen', 'pi', 'opencode', 'kimi', 'grok', 'crush', 'copilot', 'antigravity', 'custom']) {
    assert.equal(hasSignInCheck(p), false, p);
    assert.equal(readSignInStatus(p, 0, 'Logged in as x', ''), 'unknown', p);
  }
  for (const p of ['claude', 'codex', 'cursor']) assert.equal(hasSignInCheck(p), true, p);
});

/* ── (e) the real runs, against fake binaries on a throwaway HOME ─────── */

function fakeHome() {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'cli-setup-'));
  fs.mkdirSync(path.join(home, 'bin'));
  return home;
}
function fake(home, name, body) {
  const p = path.join(home, 'bin', name);
  fs.writeFileSync(p, `#!/bin/sh\n${body}\n`, { mode: 0o755 });
  return p;
}
const envFor = (home, extra = {}) => ({ PATH: `${path.join(home, 'bin')}:/usr/bin:/bin`, HOME: home, ...extra });
const posix = process.platform !== 'win32';

test('each provider and state, run for real through a fake binary', { skip: posix ? false : 'shell scripts stand in for the CLIs' }, async () => {
  const home = fakeHome();
  try {
    const cases = [
      ['claude', 'exit 0', 'signed-in'],
      ['claude', 'echo \'{"loggedIn": false, "authMethod": "none"}\'; exit 1', 'signed-out'],
      ['claude', 'echo boom >&2; exit 1', 'unknown'],
      ['codex', 'echo "Logged in using an API key"; exit 0', 'signed-in'],
      ['codex', 'echo "Not logged in"; exit 1', 'signed-out'],
      ['codex', 'exit 3', 'unknown'],
      ['cursor', 'printf "\\033[31mNot logged in\\033[39m\\n"; exit 0', 'signed-out'],
      ['cursor', 'echo "✓ Logged in as a@b.c"; exit 0', 'signed-in'],
      ['cursor', 'echo "Status check failed"; exit 0', 'unknown']
    ];
    for (const [provider, body, want] of cases) {
      const bin = fake(home, `${provider}-${want}-${Math.random().toString(36).slice(2, 6)}`, body);
      assert.equal(await checkSignedIn(provider, bin, envFor(home), home), want, `${provider}: ${body}`);
    }
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('the check runs with the agent\'s own environment (its per agent CLI home), stdin closed', { skip: posix ? false : 'shell scripts' }, async () => {
  const home = fakeHome();
  try {
    const agentHome = path.join(home, 'agents', 'a1', '.codex');
    fs.mkdirSync(agentHome, { recursive: true });
    // Signed in only when CODEX_HOME is the agent's, and it has auth.json.
    const bin = fake(home, 'codex', '[ -f "$CODEX_HOME/auth.json" ] && { echo "Logged in"; exit 0; }; echo "Not logged in"; exit 1');
    assert.equal(await checkSignedIn('codex', bin, envFor(home, { CODEX_HOME: agentHome }), home), 'signed-out');
    fs.writeFileSync(path.join(agentHome, 'auth.json'), '{}');
    assert.equal(await checkSignedIn('codex', bin, envFor(home, { CODEX_HOME: agentHome }), home), 'signed-in');
    assert.equal(await checkSignedIn('codex', bin, envFor(home, { CODEX_HOME: path.join(home, '.codex') }), home), 'signed-out', 'another home is another answer');
    // stdin is closed: a status command that waits on input gets EOF, not a hang.
    const reader = fake(home, 'claude', 'read line; [ -z "$line" ] && exit 0; exit 1');
    assert.equal(await checkSignedIn('claude', reader, envFor(home), home, 3000), 'signed-in');
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('a check that runs over is killed by pid and reads as cannot tell', { skip: posix ? false : 'shell scripts' }, async () => {
  const home = fakeHome();
  try {
    const pidFile = path.join(home, 'pid');
    const bin = fake(home, 'claude', `echo $$ > "${pidFile}"; exec sleep 30`);
    const t0 = Date.now();
    // 2 s: long enough for the first exec of a brand new script (macOS scans
    // it), far short of the child's 30.
    assert.equal(await checkSignedIn('claude', bin, envFor(home), home, 2000), 'unknown');
    assert.ok(Date.now() - t0 < 8000, 'answered at the limit, not when the child chose to end');
    const pid = Number(fs.readFileSync(pidFile, 'utf8').trim());
    await new Promise((r) => setTimeout(r, 200));
    let alive = true;
    try { process.kill(pid, 0); } catch { alive = false; }
    assert.equal(alive, false, `pid ${pid} was killed`);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('a missing binary, and a provider with no check, are cannot tell', async () => {
  assert.equal(await checkSignedIn('claude', path.join(os.tmpdir(), 'no-such-cli-' + process.pid), { PATH: '/usr/bin' }, os.tmpdir()), 'unknown');
  assert.equal(await checkSignedIn('gemini', '/bin/sh', { PATH: '/usr/bin' }, os.tmpdir()), 'unknown');
});

test('live: cursor-agent in a throwaway HOME still prints exactly what the reader calls signed out', { skip: posix ? false : 'posix only' }, async (t) => {
  const which = spawnSync('/bin/sh', ['-lc', 'command -v cursor-agent'], { encoding: 'utf8' });
  const bin = which.stdout.trim();
  if (!bin) { t.skip('cursor-agent is not installed on this machine'); return; }
  const home = fakeHome();
  try {
    const env = { PATH: process.env.PATH, HOME: home, XDG_CONFIG_HOME: path.join(home, '.config'), NO_OPEN_BROWSER: '1' };
    assert.equal(await checkSignedIn('cursor', bin, env, home, 20000), 'signed-out', 'a fresh HOME is signed out, and the reader sees that exactly');
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

/* ── (d) the login step ───────────────────────────────────────────────── */

test('login commands: the ones each CLI\'s --help confirmed, and none where the CLI asks on first run', () => {
  assert.deepEqual(providerLoginArgs('claude'), ['auth', 'login']);
  assert.deepEqual(providerLoginArgs('codex'), ['login']);
  assert.deepEqual(providerLoginArgs('copilot'), ['login']);
  assert.deepEqual(providerLoginArgs('grok'), ['login']);
  assert.deepEqual(providerLoginArgs('kimi'), ['login']);
  assert.deepEqual(providerLoginArgs('cursor'), ['login']);
  assert.deepEqual(providerLoginArgs('opencode'), ['auth', 'login']);
  for (const p of ['gemini', 'qwen', 'pi', 'crush', 'antigravity', 'custom']) assert.equal(providerLoginArgs(p), null, p);
  assert.equal(loginCommandLine('/opt/homebrew/bin/copilot', 'copilot'), 'copilot login', 'shown by name, not by path');
  assert.equal(loginCommandLine('cursor-agent', 'cursor'), 'cursor-agent login');
  assert.equal(loginCommandLine('gemini', 'gemini'), null);
});

test('the login script runs the resolved binary, quoted, after a banner that says what to do next', () => {
  const s = buildLoginScript("/Users/o'neil/.local/bin/copilot", ['login'], 'Copilot', 'darwin');
  const lines = s.split('\n');
  assert.equal(lines[lines.length - 1], "'/Users/o'\\''neil/.local/bin/copilot' login", 'a quote in the path cannot break out');
  assert.match(s, /Sign in to Copilot/);
  assert.match(s, /Setup complete, start agent/);
  assert.doesNotMatch(s, /"/, 'no double quotes (the same rule as the installer script)');
  const bad = buildLoginScript('/x/claude', ['auth', 'login; rm -rf ~'], 'Claude Code', 'darwin');
  assert.doesNotMatch(bad, /rm -rf|;/, 'args are constants, and anything else is stripped');
  const win = buildLoginScript('C:\\Users\\a\\AppData\\Roaming\\npm\\copilot.cmd', ['login'], 'Copilot', 'win32');
  assert.match(win, /& copilot\.cmd login$/);
  assert.doesNotMatch(win, /"/);
});

test('the installer script hands back npm\'s own exit code (it used to end on an echo, so a failed install read as 0)', () => {
  const s = buildMissingCliScript('pi', 'pi', true, 'darwin');
  const lines = s.split('\n');
  assert.equal(lines[lines.length - 1], 'exit $__clirc');
  assert.doesNotMatch(s, /launching the agent/, 'no promise of an automatic start');
  if (posix) {
    // Run the tail of the script with a failing stand in for npm: the script
    // must now exit non zero.
    const failing = s.replace(/^npm install [^\n]*$/m, 'false');
    const r = spawnSync('/bin/sh', ['-c', failing], { encoding: 'utf8' });
    assert.equal(r.status, 1, 'a failed install exits 1');
    const passing = s.replace(/^npm install [^\n]*$/m, 'true');
    assert.equal(spawnSync('/bin/sh', ['-c', passing], { encoding: 'utf8' }).status, 0);
  }
});

/* ── (c) the hold ─────────────────────────────────────────────────────── */

test('the composer holds while missing, installing and signing in, and says why', () => {
  const signin = { phase: 'signin', provider: 'copilot', label: 'Copilot', loginCommand: 'copilot login' };
  assert.equal(composerHoldKey(null, false), null);
  assert.equal(composerHoldKey(null, true), 'terminal.cliSetup.holdMissing');
  assert.equal(composerHoldKey({ ...signin, phase: 'installing' }, false), 'terminal.cliSetup.holdInstalling');
  assert.equal(composerHoldKey(signin, false), 'terminal.cliSetup.holdSignin');
  const composer = read('src/renderer/src/components/pro/Composer.tsx');
  assert.match(composer, /const canSend = \(!!text\.trim\(\) \|\| files\.length > 0\) && !holdKey;/);
  assert.match(composer, /const hint = holdKey \? t\(holdKey\)/, 'the reason is written where the hint is');
  assert.match(composer, /\{setupPanel\}/, 'the panel the agent screen hands in sits above the input');
  assert.doesNotMatch(composer, /from '\.\.\/terminalPool'/, 'the composer stays free of the terminal pool (it is loaded without one in tests)');
  const screenSrc = read('src/renderer/src/components/pro/AgentScreen.tsx');
  assert.match(screenSrc, /holdKey=\{composerHoldKey\(cliSetup, !!cliMissing\)\}/);
  assert.match(screenSrc, /setupPanel=\{cliSetup && agent\.ptyId \? <CliSetupPanel ptyId=\{agent\.ptyId\} setup=\{cliSetup\}/);
  const pool = read('src/renderer/src/components/terminalPool.ts');
  const gate = pool.slice(pool.indexOf('export function isTerminalAutomationSafe'));
  assert.match(gate.slice(0, 600), /if \(entry\.cliMissing \|\| entry\.cliSetup\) return false;/, 'the queue drain holds too: nothing is typed into an installer or a login');
});

/* ── (a) (b) (d) wiring in main, preload, pool and view ───────────────── */

test('main: only an install someone pressed stops at sign in; a clean exit must also find the binary', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /return spawnAgentCore\(\{ \.\.\.paused\.opts, installNow: true, guidedSetup: true \}, paused\.owner\);/);
  const exitAt = main.indexOf('const pending = pendingInstallRelaunch.get(id);');
  const exitBlock = main.slice(exitAt, exitAt + 4500);
  assert.match(exitBlock, /if \(exitCode === 0 && ptyManager\.isCommandAvailable\(pending\.bin\)\)/);
  assert.match(exitBlock, /if \(!pending\.opts\.guidedSetup\) \{[\s\S]*?pty:relaunch:[\s\S]*?noAutoInstall: true/, 'a god worker or voice hire still starts by itself');
  const guided = exitBlock.slice(exitBlock.indexOf('if (!pending.opts.guidedSetup)'));
  const guidedTail = guided.slice(guided.indexOf('return;') + 7, guided.indexOf('return; // an install PTY'));
  assert.doesNotMatch(guidedTail, /pty:relaunch/, 'a guided install never wipes the install output');
  assert.match(guidedTail, /phase: 'signin'/);
  assert.match(guidedTail, /runLoginStep\(id\);/);
  const step = main.slice(main.indexOf('function runLoginStep('));
  const stepBody = step.slice(0, step.indexOf('\n}\n'));
  assert.match(stepBody, /loginScript: loginArgs \? buildLoginScript\(/);
  assert.match(stepBody, /if \(r\.signedIn\) \{ void startAgentAfterSetup\(id\); return; \}/, '(e) an already signed in CLI starts at once');
  assert.ok(stepBody.indexOf("login: 'running'") < stepBody.indexOf('void spawnAgentCore('), 'marked running before the spawn, so a login that exits at once is still caught');
});

test('main: the login runs after the hive has set the agent\'s own home, is never mapped to the agent, and checks first', () => {
  const main = read('src/main/index.ts');
  const hiveEnv = main.indexOf('opts.env = { ...(opts.env ?? {}), ...inj.env, ...memory.env(), ...knowledge.env() };');
  const login = main.indexOf('if (opts.loginScript !== undefined) {');
  const mapped = main.indexOf('ptyToAgent.set(opts.id, opts.hive.id);');
  assert.ok(hiveEnv > 0 && login > hiveEnv, 'after the per agent env is merged');
  assert.ok(mapped > login, 'returns before the pty is mapped to the agent');
  const block = main.slice(login, login + 1500);
  assert.match(block, /const checkEnv = ptyManager\.childEnv\(opts\.env\);/);
  assert.match(block, /checkSignedIn\(provider, binPath, checkEnv, opts\.cwd\) === 'signed-in'/);
  assert.match(block, /watchSignIn\(opts\.id, provider, binPath, checkEnv, opts\.cwd\)/);
});

test('main: the start button discards the terminal and starts fresh; Stop ends the setup', () => {
  const main = read('src/main/index.ts');
  const start = main.slice(main.indexOf('function startAgentAfterSetup('));
  const body = start.slice(0, start.indexOf('\n}\n'));
  assert.match(body, /ptyManager\.kill\(id\)/);
  assert.match(body, /pty:relaunch:/, 'the renderer wipes the grid');
  assert.match(body, /const \{ installNow: _i, guidedSetup: _g, loginScript: _l, manualSetup: _m, \.\.\.opts \} = setup\.opts;/);
  assert.match(body, /spawnAgentCore\(\{ \.\.\.opts, noAutoInstall: true \}, setup\.owner\)/);
  // Batch 4: refused only while installing; manual mode may start too.
  assert.match(main, /if \(setup\.state\.phase === 'installing'\) return \{ ok: false, error: 'still-installing' \};/);
  const kill = main.slice(main.indexOf("ipcMain.handle('pty:kill'"));
  assert.match(kill.slice(0, 1500), /endCliSetup\(id\);/);
});

test('preload, pool and the agent screen carry it; the Inbox tab shows the card', () => {
  const preload = read('src/preload/index.ts');
  for (const m of ['onPtyCliSetup:', "ipcRenderer.invoke('pty:cliSetupState', id)", "ipcRenderer.invoke('pty:cliSetupStart', id, mode)", "ipcRenderer.invoke('pty:cliSetupLogin', id)"]) assert.ok(preload.includes(m), m);
  const pool = read('src/renderer/src/components/terminalPool.ts');
  assert.ok(pool.indexOf('window.cth.cliSetupState?.(ptyId)') > pool.indexOf('window.cth.onPtyCliSetup(ptyId'), 'listener armed before the pull');
  const screen = read('src/renderer/src/components/pro/AgentScreen.tsx');
  assert.match(screen, /\{tab === 'inbox' && cliMissing && agent\.ptyId && <CliMissingCard ptyId=\{agent\.ptyId\} state=\{cliMissing\} \/>\}/, 'the card over the Inbox tab');
});

test('copy: every new string in en, zh-CN and ar, and no dashes in the English', () => {
  const keys = ['installingTitle', 'installingBody', 'signinTitle', 'signinBody', 'signinBodyFirstRun', 'start', 'starting', 'startFailed', 'showTerminal', 'signedIn', 'holdMissing', 'holdInstalling', 'holdSignin'];
  for (const lang of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`));
    for (const k of keys) assert.equal(typeof j.terminal.cliSetup[k], 'string', `${lang} ${k}`);
  }
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json')).terminal.cliSetup;
  for (const [k, v] of Object.entries(en)) assert.doesNotMatch(v, /[\u2013\u2014]| - /, `en ${k} has no dash`);
});

test('the sign in modal points at the start button while setup is on, instead of promising an automatic start', () => {
  const modal = read('src/renderer/src/components/CliLoginModal.tsx');
  assert.match(modal, /const afterSetup = useCliSetup\(ptyId\)\?\.phase === 'signin';/);
  assert.match(modal, /afterSetup \? 'terminal\.cliLogin\.deviceWhatSetup' : 'terminal\.cliLogin\.deviceWhat'/);
  assert.match(modal, /afterSetup \? 'terminal\.cliLogin\.browserWhatSetup' : 'terminal\.cliLogin\.browserWhat'/);
  for (const lang of ['en', 'zh-CN', 'ar']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`)).terminal;
    for (const k of ['deviceWhatSetup', 'browserWhatSetup']) assert.equal(typeof j.cliLogin[k], 'string', `${lang} ${k}`);
    for (const k of ['npmWhat', 'nodeWhat', 'nativeWhat']) assert.ok(!/by itself|自动启动|من تلقاء نفسه/.test(j.cliMissing[k]), `${lang} ${k} no longer promises an automatic start`);
  }
});

/* ── the founder's second look (24 Sep): Start stays off until the sign in finished ── */

test('Start is allowed only once the sign in finished; a failed login offers Start anyway and Sign in again', () => {
  const base = { phase: 'signin', provider: 'cursor', label: 'Cursor', loginCommand: 'cursor-agent login' };
  assert.equal(setupCanStart({ ...base, login: 'running' }), false, 'the login is still running');
  assert.equal(setupCanStart({ ...base }), false, 'the login has not even started');
  assert.equal(setupCanStart({ ...base, login: 'done' }), true, 'the login exited 0');
  assert.equal(setupCanStart({ ...base, login: 'running', signedIn: true }), true, 'the status command says signed in');
  assert.equal(setupCanStart({ ...base, login: 'failed' }), false);
  assert.equal(setupCanStartAnyway({ ...base, login: 'failed' }), true);
  assert.equal(setupCanStartAnyway({ ...base, login: 'running' }), false);
  assert.equal(setupCanStart({ ...base, loginCommand: null }), true, 'no login command: the CLI asks on first run, nothing to wait for');
  assert.equal(setupCanStart({ ...base, phase: 'installing' }), false);
  assert.equal(setupCanStart(null), false);
});

test('main decides it too: the login process exit sets done or failed, and the start is refused until then', () => {
  const main = read('src/main/index.ts');
  const exitAt = main.indexOf('ptyManager.setExitHandler(');
  const loginBranch = main.indexOf("if (inSetup && inSetup.state.phase === 'signin' && inSetup.state.login === 'running') {", exitAt);
  assert.ok(loginBranch > exitAt && loginBranch < main.indexOf('const pending = pendingInstallRelaunch.get(id);', exitAt), 'caught before the installer and agent branches');
  assert.match(main.slice(loginBranch, loginBranch + 400), /login: exitCode === 0 \? 'done' : 'failed'/);
  const start = main.slice(main.indexOf("ipcMain.handle('pty:cliSetupStart'"));
  assert.match(start.slice(0, 900), /if \(!setupCanStart\(setup\.state\) && !\(anyway && setupCanStartAnyway\(setup\.state\)\)\) return \{ ok: false, error: 'not-signed-in' \};/, 'a renderer that sends start early is refused');
  assert.match(main, /ipcMain\.handle\('pty:cliSetupLogin'/);
  const panel = read('src/renderer/src/components/pro/CliSetupPanel.tsx');
  assert.match(panel, /disabled=\{busy \|\| !canStart\}/);
  assert.match(panel, /'data-cli-setup-start': canStart \? 'ready' : 'waiting'/);
});

test('the sign in modal closes when the login it came from ends (its link is dead then)', () => {
  const main = read('src/main/index.ts');
  const at = main.indexOf("if (inSetup && inSetup.state.phase === 'signin' && inSetup.state.login === 'running') {");
  const block = main.slice(at, at + 1200);
  assert.match(block, /closeLoginModal\(id, inSetup\.owner, exitCode === 0 \? 'success' : 'failure'\);/);
  // Batch 4: one helper sends the watcher's own "done" event.
  const helper = main.slice(main.indexOf('function closeLoginModal('));
  assert.match(helper.slice(0, 400), /const done: LoginEvent = \{ done: \{ outcome, line: '' \} \};/);
  assert.match(helper.slice(0, 400), /wc\?\.send\(`pty:login:\$\{id\}`, done\)/);
});

test('#99 kept: a good spawn forgets the card, and an ordinary start forgets the setup panel too', () => {
  const main = read('src/main/index.ts');
  const at = main.indexOf('if (!bin || opts.noAutoInstall || ptyManager.isCommandAvailable(bin)) pendingCliMissing.delete(opts.id);');
  assert.ok(at > 0, "#99's rule is still there");
  const next = main.slice(at - 900, at);
  assert.match(next, /if \(opts\.loginScript === undefined && !opts\.installNow && pendingCliSetup\.has\(opts\.id\)\) \{\s*const ended = endCliSetup\(opts\.id\);\s*sendCliSetup\(opts\.id, ended\?\.owner \?\? owner, null\);/);
  const pool = read('src/renderer/src/components/terminalPool.ts');
  const reset = pool.slice(pool.indexOf('// The missing CLI card belonged to the line that is being replaced.'));
  assert.match(reset.slice(0, 500), /setCliMissing\(entry, null\);\s*setCliSetup\(entry, null\);/);
});
