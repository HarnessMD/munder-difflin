/**
 * Founder, final list section D (25 Sep 2026), Copilot install and sign in:
 *   1. the sign in modal showed the oauth link twice, one copy running off the
 *      modal, and no Open link button;
 *   2. after sign in the agent's terminal stayed white: the preset ran Copilot
 *      in print mode (`-p -s`), which prints nothing until its final answer.
 * Also: the sidebar said "default (Claude S..." for a Copilot agent, and a
 * dev build's terminals repeated nvm's npm_config_prefix warning.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { detectLoginPrompt } = loadTs('src/shared/cliLogin.ts');
const ap = loadTs('src/shared/agentProvider.ts');
const { buildPtyEnv } = loadTs('src/main/ptyEnv.ts');

// The founder's terminal, copilot 1.0.88 (screenshot founder-0444.png).
const URL = 'https://github.com/login/oauth/authorize?client_id=Ov23ctDVkRmgkPke0Mmm&redirect_uri=http%3A%2F%2F127.0.0.1%3A64309%2Fcallback&scope=read%3Auser+read%3Aorg+repo+gist+codespace+write%3Aplugin_gateway_connections&state=Jcohbcv2L9HxXTElBSsbg&code_challenge=v6NvwI7y6MzSmS1qBmsjThJ4FX7QzXkmbnthDVcEbfI&code_challenge_method=S256';
const TRANSCRIPT = `Sign in to Copilot. When it says you are signed in,\npress Setup complete, start agent above the terminal.\n\nOpening your browser to authenticate...\nIf it doesn't open automatically, visit:\n${URL}\nWaiting for authorization...\n`;

test('1. copilot 1.0.88 browser sign in is read by its own recipe: trusted, the whole link, and a line that is not the link', () => {
  const p = detectLoginPrompt('copilot', TRANSCRIPT);
  assert.equal(p.kind, 'browser');
  assert.equal(p.recipe, 'provider');
  assert.equal(p.trusted, true, 'github.com is Copilot\'s sign in host, so Open link shows');
  assert.equal(p.url, URL);
  assert.ok(!p.line.includes('https://'), `the context line repeats the link: ${p.line}`);
  // A link somewhere else is never vouched for.
  const other = detectLoginPrompt('copilot', 'Please authorize here:\nhttps://evil.example/login/oauth/authorize?x=1\n');
  assert.equal(other?.trusted ?? false, false);
  // The device flow still works.
  assert.equal(detectLoginPrompt('copilot', 'Please visit https://github.com/login/device and enter code ABCD-1234').kind, 'device-code');
});

test('1. the modal shows the link once, clipped to two lines, with Open link and Copy link, and nothing can overflow', () => {
  const src = read('src/renderer/src/components/CliLoginModal.tsx');
  assert.equal((src.match(/>\{prompt\.url\}</g) || []).length, 1, 'the link is drawn once');
  assert.match(src, /WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden'/);
  assert.match(src, /<span style=\{linkText\} title=\{prompt\.url\} data-cli-login-url>/);
  assert.match(src, /maxWidth: 520, width: '100%', minWidth: 0, boxSizing: 'border-box', overflow: 'hidden'/);
  const at = src.indexOf('data-cli-login-url');
  const block = src.slice(at, src.indexOf('data-cli-login-unvouched', at));
  assert.ok(block.indexOf('data-cli-login-open') > 0 && block.indexOf('data-cli-login-copy') > block.indexOf('data-cli-login-open'), 'Open link then Copy link, under the link');
  assert.match(src, /\{prompt\.line && !\(prompt\.url && prompt\.line\.includes\(prompt\.url\)\) && !\/https\?:\\\/\\\/\/\.test\(prompt\.line\) && \(/, 'the CLI line never carries a link');
  assert.match(src, /whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'/);
});

test('2. copilot starts interactive, so its screen is in the terminal after sign in', () => {
  const p = ap.providerPreset('copilot');
  assert.equal(p.initialPromptFlag, '-i');
  assert.ok(!/(^|\s)-s(\s|$)/.test(p.autoFlag) && !/(^|\s)-s(\s|$)/.test(p.autoModeFlag), 'no print-mode -s');
  assert.equal(p.autoFlag, '--allow-all-tools --no-ask-user');
});

test('the sidebar names a Copilot agent\'s default model as Copilot\'s, not Claude\'s', () => {
  for (const f of ['src/shared/modelCatalog.json', 'docs/model-catalog.json']) {
    const c = JSON.parse(read(f));
    const list = c.providers?.copilot ?? c.models?.copilot ?? c.copilot ?? Object.values(c).find((v) => v && v.copilot)?.copilot;
    assert.ok(Array.isArray(list), f);
    assert.equal(list[0].label, 'Copilot default', f);
    assert.equal(list[0].id, undefined, 'still no --model flag for the default');
  }
});

test('a dev build (started by npm run) does not hand npm\'s own npm_* variables to agent terminals', () => {
  const parent = { HOME: '/h', npm_lifecycle_event: 'dev', npm_config_prefix: '/opt/homebrew', npm_package_name: 'x', INIT_CWD: '/r', NPM_CONFIG_PREFIX: '/mine' };
  const env = buildPtyEnv(parent, '/usr/bin', undefined, 'darwin');
  assert.equal(env.npm_config_prefix, undefined, 'nvm complains about this one in every terminal');
  assert.equal(env.npm_package_name, undefined);
  assert.equal(env.INIT_CWD, undefined);
  assert.equal(env.NPM_CONFIG_PREFIX, '/mine', 'what the person exported stays');
  assert.equal(env.HOME, '/h');
  // Not started by npm run (a packaged app, or a person's own export): kept.
  assert.equal(buildPtyEnv({ npm_config_prefix: '/p' }, '/usr/bin', undefined, 'darwin').npm_config_prefix, '/p');
  // A per agent setting still wins over the strip.
  assert.equal(buildPtyEnv(parent, '/usr/bin', { npm_config_prefix: '/agent' }, 'darwin').npm_config_prefix, '/agent');
});
