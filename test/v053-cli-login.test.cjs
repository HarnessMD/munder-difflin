'use strict';

/* 0.5.3, I2 part 2 (Creed, 23 Sep 2026): a CLI's sign in, read from its own
 * output and shown as a modal. The recipes are run against transcripts
 * captured on this Mac with a throwaway HOME (test/fixtures/cli-login: kimi,
 * grok, codex, cursor; no sign in completed), against the documented lines
 * of Claude Code and Copilot, and against the generic reading for a CLI
 * whose transcript is not captured. The watcher is driven with chunks the
 * way node-pty hands them over. Main, preload, the pool and the view are
 * pinned by reading the source. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { detectLoginPrompt, detectLoginOutcome, stripAnsi, sameLoginPrompt, loginHostAllowed, LOGIN_HOSTS } = loadTs('src/shared/cliLogin.ts');
const { CliLoginWatcher, WATCH_MS } = loadTs('src/main/cliLoginWatcher.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
const fixture = (name) => read(`test/fixtures/cli-login/${name}-login.txt`);

test('the four captured transcripts: the link and the code are read exactly as the CLI printed them', () => {
  const kimi = detectLoginPrompt('kimi', fixture('kimi'));
  assert.equal(kimi.kind, 'device-code');
  assert.equal(kimi.url, 'https://www.kimi.ai/code/authorize_device?user_code=VAM5-PYA2');
  assert.equal(kimi.code, 'VAM5-PYA2');
  assert.equal(kimi.recipe, 'provider');

  const grok = detectLoginPrompt('grok', fixture('grok'));
  assert.equal(grok.kind, 'device-code');
  assert.equal(grok.url, 'https://accounts.x.ai/oauth2/device?user_code=Q5GE-H92B');
  assert.equal(grok.code, 'Q5GE-H92B');

  const codex = detectLoginPrompt('codex', fixture('codex'));
  assert.equal(codex.kind, 'device-code');
  assert.equal(codex.url, 'https://auth.openai.com/codex/device');
  assert.equal(codex.code, 'TIFP-HBDCJ', 'five after the dash');

  const cursor = detectLoginPrompt('cursor', fixture('cursor'));
  assert.equal(cursor.kind, 'browser', 'a link that comes back by itself, no code');
  assert.match(cursor.url, /^https:\/\/cursor\.com\/loginDeepControl\?challenge=/);
  assert.equal(cursor.code, undefined);
  for (const p of [kimi, grok, codex, cursor]) assert.equal(p.trusted, true, `${p.provider}: the vendor's own sign in host, so the app may open it`);
});

test('the app vouches for no link it did not recognise: an attacker\'s sign in line in an agent\'s output gets no Open button', () => {
  // Model or tool output in the terminal (a fetched page, a file) that looks
  // like a sign in. The words match, the host is nobody's.
  const attack = 'Sign in: open https://evil.example/login and enter code ABCD-1234\n';
  for (const provider of ['claude', 'codex', 'grok', 'kimi', 'cursor', 'copilot', 'opencode', 'qwen', 'custom']) {
    const p = detectLoginPrompt(provider, attack);
    if (p) assert.equal(p.trusted, false, `${provider}: shown as text, never opened`);
  }
  // A recipe that matched on its words but with a link elsewhere is not trusted either.
  const forged = detectLoginPrompt('claude', 'Paste code here if prompted. https://evil.example/claude\n');
  assert.equal(forged.kind, 'paste-code'); assert.equal(forged.recipe, 'provider'); assert.equal(forged.trusted, false);
  // The allowlist itself.
  assert.equal(loginHostAllowed('codex', 'https://auth.openai.com/codex/device'), true);
  assert.equal(loginHostAllowed('kimi', 'https://www.kimi.ai/code/authorize_device?user_code=X'), true, 'a subdomain of an allowed host');
  assert.equal(loginHostAllowed('codex', 'https://auth.openai.com.evil.example/x'), false, 'a host that only starts with an allowed one');
  assert.equal(loginHostAllowed('codex', 'http://auth.openai.com/x'), false, 'https only');
  assert.equal(loginHostAllowed('codex', 'http://localhost:1455/auth/callback'), true, 'the CLI\'s own callback');
  assert.equal(loginHostAllowed('codex', 'https://accounts.x.ai/x'), false, 'another provider\'s host is not this one\'s');
  assert.equal(loginHostAllowed('custom', 'https://github.com/login/device'), false, 'custom vouches for nothing');
  assert.equal(loginHostAllowed('codex', undefined), false);
  assert.equal(loginHostAllowed('codex', 'not a url'), false);
  for (const [provider, hosts] of Object.entries(LOGIN_HOSTS)) for (const h of hosts) assert.match(h, /^[a-z0-9.-]+$/, `${provider} ${h}: a bare host, no scheme, no path`);
});

test('documented lines: Claude Code pastes a code back, Copilot is a GitHub device code', () => {
  const claude = detectLoginPrompt('claude', 'Browser didn\'t open? Use the url below to sign in:\nhttps://claude.ai/oauth/authorize?code=true&client_id=x\n\nPaste code here if prompted > ');
  assert.equal(claude.kind, 'paste-code');
  assert.match(claude.url, /^https:\/\/claude\.ai\/oauth/);
  const copilot = detectLoginPrompt('copilot', 'Please visit https://github.com/login/device and enter code ABCD-1234 to authenticate.\n');
  assert.equal(copilot.kind, 'device-code');
  assert.equal(copilot.code, 'ABCD-1234');
  assert.equal(copilot.url, 'https://github.com/login/device');
});

test('the generic reading: only inside a sign in context, and a bare link in ordinary work is nothing', () => {
  assert.equal(detectLoginPrompt('opencode', 'See https://example.com/docs for the API.\nDone.\n'), null, 'no context word: not a sign in');
  assert.equal(detectLoginPrompt('pi', 'Build: 42 tests, code XYZW-1234 in the log\n'), null);
  const dev = detectLoginPrompt('qwen', 'Login required.\nVisit https://chat.qwen.ai/authorize?user_code=QWER-5678 and enter the code QWER-5678\n');
  assert.equal(dev.kind, 'device-code'); assert.equal(dev.code, 'QWER-5678'); assert.equal(dev.recipe, 'generic');
  const br = detectLoginPrompt('opencode', 'Sign in: open https://opencode.ai/auth/abc in your browser\n');
  assert.equal(br.kind, 'browser'); assert.equal(br.url, 'https://opencode.ai/auth/abc');
  const pc = detectLoginPrompt('gemini', 'Login with Google\nhttps://accounts.google.com/o/oauth2/auth?x=y\nEnter the code here: ');
  assert.equal(pc.kind, 'paste-code');
  const key = detectLoginPrompt('crush', 'Enter your Anthropic API key: ');
  assert.equal(key.kind, 'api-key');
  // Colour and a carriage return do not hide any of it.
  const esc = String.fromCharCode(27);
  assert.equal(stripAnsi(`${esc}[32mok${esc}[0m\r`), 'ok\n');
  assert.equal(detectLoginPrompt('grok', `${esc}[1mTo sign in, open this URL in your browser:${esc}[0m\r\n  https://accounts.x.ai/oauth2/device?user_code=AAAA-BBBB\r\n`).code, 'AAAA-BBBB');
});

test('the outcome is judged on lines: success and failure words, nothing else', () => {
  assert.deepEqual(detectLoginOutcome('Waiting for authorization...\nLogged in as jane@example.com\n'), { outcome: 'success', line: 'Logged in as jane@example.com' });
  assert.equal(detectLoginOutcome('Waiting for authorization...\n'), null);
  assert.equal(detectLoginOutcome('Authorization failed: code expired\n').outcome, 'failure');
  assert.equal(detectLoginOutcome('Successfully logged in!\n').outcome, 'success');
  assert.ok(sameLoginPrompt({ kind: 'device-code', url: 'u', code: 'c' }, { kind: 'device-code', url: 'u', code: 'c' }));
  assert.ok(!sameLoginPrompt({ kind: 'device-code', url: 'u', code: 'c' }, { kind: 'device-code', url: 'u', code: 'd' }));
});

test('the watcher: one prompt per ask however the chunks fall, the outcome from what came after, quiet on a pty it was not told about', () => {
  const events = [];
  let now = 1_000_000;
  const w = new CliLoginWatcher((id, e) => events.push({ id, ...e }), () => now);
  w.observe('p1', 'https://accounts.x.ai/oauth2/device?user_code=Q5GE-H92B\nConfirm this code in your browser: Q5GE-H92B\n');
  assert.equal(events.length, 0, 'not tracked: not read');
  w.track('p1', 'grok');
  const t = fixture('grok');
  // Fed a few bytes at a time, like node-pty; the link cut mid chunk is not a link yet.
  for (let i = 0; i < t.length; i += 7) w.observe('p1', t.slice(i, i + 7));
  assert.equal(events.length, 1, 'one prompt, not one per chunk');
  assert.equal(events[0].prompt.code, 'Q5GE-H92B');
  assert.equal(w.current('p1').kind, 'device-code');
  // A repaint of the same prompt is not a second ask.
  w.observe('p1', 'Waiting for authorization...\n');
  assert.equal(events.length, 1);
  w.observe('p1', 'Logged in as jane\n');
  assert.equal(events.length, 2);
  assert.equal(events[1].done.outcome, 'success');
  assert.equal(w.current('p1'), null);
  w.observe('p1', 'https://accounts.x.ai/oauth2/device?user_code=NEWW-CODE\nConfirm this code in your browser: NEWW-CODE\n');
  assert.equal(events.length, 2, 'after a success the watcher is done with this pty');
  // A dismissed ask stays dismissed; a forgotten pty is silent; an old pty is let be.
  w.track('p2', 'kimi'); w.observe('p2', fixture('kimi')); assert.equal(events.length, 3);
  w.dismiss('p2'); w.observe('p2', fixture('kimi')); assert.equal(events.length, 3);
  w.track('p3', 'codex'); w.forget('p3'); w.observe('p3', fixture('codex')); assert.equal(events.length, 3);
  w.track('p4', 'codex'); now += WATCH_MS + 1000; w.observe('p4', fixture('codex')); assert.equal(events.length, 3, 'past the outer bound, a link with a code is the agent\'s work');
  assert.ok(WATCH_MS <= 5 * 60 * 1000, 'the outer bound is five minutes at most');
  // The person is past the sign in: a line submitted to the pty, or a hook
  // event from the agent, ends the reading before the bound.
  w.track('p5', 'grok'); assert.equal(w.watching('p5'), true);
  w.pastLogin('p5'); assert.equal(w.watching('p5'), false);
  w.observe('p5', fixture('grok')); assert.equal(events.length, 3, 'a sign in shaped line after the first prompt is nothing');
  // But not while a prompt is up: the person may be typing the code in the terminal.
  w.track('p6', 'grok'); w.observe('p6', fixture('grok')); assert.equal(events.length, 4);
  w.pastLogin('p6'); assert.equal(w.watching('p6'), true, 'the ask is still open');
  w.observe('p6', 'Logged in as jane\n'); assert.equal(events[4].done.outcome, 'success');
});

test('main, preload, pool and view: the prompt reaches the terminal, the link opened is main\'s, the code goes into the pty', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /ptyManager\.setDataHook\(\(id, data\) => loginWatcher\.observe\(id, data\)\);/);
  assert.match(main, /if \(res\.ok\) \{ loginWatcher\.track\(opts\.id, provider\); ptyOwners\.set\(opts\.id, owner\); \}/, 'told at the real spawn, after the missing CLI card');
  assert.match(main, /function teardownPty\(id: string, reason: TeardownReason\): void \{\s*loginWatcher\.forget\(id\);/);
  assert.match(main, /ipcMain\.handle\('pty:loginAct'[\s\S]*?const prompt = loginWatcher\.current\(p\.id\);[\s\S]*?if \(!prompt\.trusted \|\| prompt\.recipe !== 'provider' \|\| !loginHostAllowed\(prompt\.provider, prompt\.url\)\) return \{ ok: false, error: 'link-not-vouched' \};\s*await shell\.openExternal\(prompt\.url as string\);/, 'main opens only a link the provider\'s recipe read on its own host, checked here, not only in the renderer');
  assert.match(main, /ipcMain\.handle\('pty:write'[\s\S]{0,400}loginWatcher\.pastLogin\(id\)/, 'a line submitted to the pty ends the reading');
  assert.match(main, /loginWatcher\.pastLogin\(pty\)/, 'a hook event from the agent ends the reading');
  assert.match(read('src/renderer/src/components/CliLoginModal.tsx'), /\{prompt\.url && \([\s\S]*?\{prompt\.trusted && \(prompt\.kind === 'device-code'/, 'Open link only for a vouched link');
  assert.match(read('src/renderer/src/components/CliLoginModal.tsx'), /\{!prompt\.trusted && <span[^>]*data-cli-login-unvouched>/, 'an unvouched link is text with the sentence that it came from the terminal');
  assert.match(main, /const code = p\.text\.replace\(\/\[\\u0000-\\u001f\\u007f\]\/g, ''\)\.trim\(\);\s*return ptyManager\.write\(p\.id, code \+ '\\r'\);/, 'one line, no control characters, then Enter');
  const pty = read('src/main/pty.ts');
  assert.match(pty, /if \(this\.dataHook\) \{ try \{ this\.dataHook\(opts\.id, data\); \} catch/);
  const preload = read('src/preload/index.ts');
  assert.match(preload, /onPtyLogin: \(id: string, cb: \(e: LoginEvent\) => void\)/);
  assert.match(preload, /loginAct: \(id: string, action: 'open-link' \| 'paste' \| 'dismiss', text\?: string\)/);
  const pool = read('src/renderer/src/components/terminalPool.ts');
  assert.match(pool, /window\.cth\.onPtyLogin\(ptyId, \(e\) => \{\s*if \('prompt' in e\) \{ setLogin\(entry, e\.prompt\); return; \}\s*setLogin\(entry, null\);/);
  assert.match(pool, /export function useCliLogin\(ptyId: string \| undefined\)/);
  const view = read('src/renderer/src/components/PtyTerminalView.tsx');
  assert.match(view, /\{!cliMissing && login && <CliLoginModal ptyId=\{ptyId\} prompt=\{login\} \/>\}/, 'the card wins while the CLI is not installed');
  const modal = read('src/renderer/src/components/CliLoginModal.tsx');
  assert.match(modal, /type="password"/, 'a key is never drawn');
  assert.ok(!/openExternal/.test(modal), 'the renderer never opens a link itself');
  assert.match(modal, /window\.cth\.providerKeySet\(\{ backend, key: text\.trim\(\) \}\)/, 'a key goes to the write only store BYOK uses');
  // Founder, 23 Sep 2026 (with CliMissingCard): kit controls, kit surface,
  // and the scrim re-enables pointer events so the modal is clickable under
  // any host, with the kit Btn's hand pointer over every action.
  assert.match(modal, /import \{ Btn, inputStyle, monoInputStyle, proToast \} from '\.\/pro\/ui';/, 'the modal is built from the kit');
  assert.match(modal, /pointerEvents: 'auto', cursor: 'default'/, 'the scrim takes the pointer back');
  assert.ok(!/#[0-9a-f]{3,6}\b/i.test(modal), 'no raw hex, tokens only');
  assert.ok(!/const btn: CSSProperties|cursor: 'pointer'/.test(modal), 'no hand styled button of its own');
  for (const loc of ['en', 'zh-CN', 'ar']) {
    const block = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`)).terminal?.cliLogin;
    assert.ok(block, `${loc} has terminal.cliLogin`);
    for (const k of ['title', 'titleKey', 'deviceWhat', 'browserWhat', 'pasteWhat', 'keyWhat', 'openLink', 'copy', 'copied', 'paste', 'pastePlaceholder', 'keyPlaceholder', 'saveKey', 'keySaved', 'useTerminal', 'refused', 'signedIn', 'copyLink', 'linkCopied', 'linkFromTerminal']) {
      assert.equal(typeof block[k], 'string', `${loc} ${k}`);
      assert.ok(!/[\u2014\u2013]|\s-\s/.test(block[k]), `${loc} ${k}: no dashes in copy`);
    }
  }
});
