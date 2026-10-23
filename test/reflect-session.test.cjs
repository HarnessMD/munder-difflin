'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const cp = require('node:child_process');
const { EventEmitter } = require('node:events');
const { PassThrough, Writable } = require('node:stream');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');
const runner = loadTs('src/main/reflectSession.ts');
const hidden = loadTs('src/main/hiddenClaude.ts');
const processKill = loadTs('src/main/procKill.ts');
const { limitResponse, limitRetryAt } = loadTs('src/main/reflectLimit.ts');
const providers = loadTs('src/shared/agentProvider.ts');

function fakeProcess(t, output, { code = 0, stall = false, error } = {}) {
  const calls = [], killed = [];
  t.mock.method(processKill, 'hardKillTree', pid => killed.push(pid));
  t.mock.method(cp, 'spawn', (command, args, opts) => {
    const child = new EventEmitter(); child.pid = 12345;
    child.stdout = new PassThrough(); child.stderr = new PassThrough();
    let prompt = '';
    child.stdin = new Writable({ write(chunk, _encoding, cb) { prompt += chunk.toString(); cb(); }, final(cb) {
      calls.push({ command, args, opts, prompt }); cb();
      setImmediate(() => {
        if (error) child.emit('error', new Error(error));
        else if (!stall) { child.stdout.end(output); child.emit('close', code); }
      });
    } });
    t.after(() => { child.stdout.destroy(); child.stderr.destroy(); child.stdin.destroy(); });
    return child;
  });
  return { calls, killed };
}

test('a quota written only to stderr remains available for classification', async t => {
  t.mock.method(cp, 'spawn', () => {
    const child = new EventEmitter(); child.stdout = new PassThrough(); child.stderr = new PassThrough();
    child.stdin = new Writable({ write(_c, _e, cb) { cb(); }, final(cb) { cb(); setImmediate(() => { child.stderr.end('HTTP 429 quota exceeded'); child.emit('close', 1); }); } });
    return child;
  });
  const result = await runner.runReflectSession('prompt', { provider: 'opencode', command: '/fixture/opencode', cwd: process.cwd() });
  assert.equal(result.ok, false); assert.match(result.error, /429 quota exceeded/);
});

test('a synchronous spawn exception is returned as a failure', async t => {
  t.mock.method(cp, 'spawn', () => { throw new Error('bad executable'); });
  const result = await runner.runReflectSession('prompt', { provider: 'opencode', command: '/fixture/opencode', cwd: process.cwd() });
  assert.equal(result.ok, false); assert.match(result.error, /bad executable/);
});

test('OpenCode gets its own model flag, NDJSON mode and denied tools; prompt is stdin data', async t => {
  const p = fakeProcess(t, JSON.stringify({ type: 'text', part: { text: 'summary' } }) + '\n');
  const hostile = 'quotes " & % PATH\nnext line';
  const result = await runner.runReflectSession(hostile, { provider: 'opencode', command: '/a path/opencode', model: 'local/custom-model', cwd: '/a workspace', env: { OPENCODE_CONFIG_CONTENT: JSON.stringify({ provider: { local: { models: { 'custom-model': {} } } }, permission: 'allow' }) } });
  assert.deepEqual(result, { ok: true, text: 'summary' });
  const call = p.calls[0]; assert.equal(call.command, '/a path/opencode'); assert.equal(call.prompt, hostile);
  assert.deepEqual(call.args, ['run', '--format', 'json', '--pure', '--agent', 'munder-reflect', '--title', 'Memory reflection', '--model', 'local/custom-model']);
  assert.equal(call.opts.cwd, '/a workspace'); assert.equal(call.opts.shell, undefined);
  const cfg = JSON.parse(call.opts.env.OPENCODE_CONFIG_CONTENT);
  assert.equal(cfg.permission, 'deny'); assert.equal(cfg.agent['munder-reflect'].permission, 'deny');
  assert.deepEqual(cfg.agent['munder-reflect'].tools, { '*': false });
  assert.equal(cfg.share, 'disabled'); assert.ok(cfg.provider.local.models['custom-model']);
});

test('OpenCode with a CLI-default model does not receive a Claude model', async t => {
  const p = fakeProcess(t, '{"type":"text","part":{"text":"done"}}');
  await runner.runReflectSession('prompt', { provider: 'opencode', command: 'opencode', cwd: process.cwd() });
  assert.equal(p.calls[0].args.includes('--model'), false);
});

test('OpenCode errors beat earlier text and non-text events do not enter the summary', () => {
  assert.deepEqual(runner.parseOpenCodeOutput([
    JSON.stringify({ type: 'reasoning', part: { text: 'do not include' } }),
    JSON.stringify({ type: 'text', part: { text: 'summary' } }),
    JSON.stringify({ type: 'step_finish' })
  ].join('\n')), { text: 'summary' });
  const failed = runner.parseOpenCodeOutput('{"type":"text","part":{"text":"partial"}}\n{"type":"error","error":{"data":{"message":"HTTP 429 quota exceeded"}}}');
  assert.equal(failed.text, undefined); assert.match(failed.error, /429/);
  assert.ok(runner.parseOpenCodeOutput('help output').error);
});

test('spawn failure, timeout and excessive output settle with explicit errors', async t => {
  for (const scenario of ['spawn', 'timeout', 'overflow']) {
    await t.test(scenario, async t => {
      const p = fakeProcess(t, scenario === 'overflow' ? 'x'.repeat(1_048_577) : '', { stall: scenario === 'timeout', error: scenario === 'spawn' ? 'ENOENT' : undefined });
      const result = await runner.runReflectSession('prompt', { provider: 'opencode', command: '/fixture/opencode', cwd: process.cwd(), timeoutMs: 20 });
      assert.equal(result.ok, false); assert.match(result.error, /ENOENT|timed out|exceeded/);
      assert.equal(p.killed.length, scenario === 'spawn' ? 0 : 1);
    });
  }
});

test('Claude uses only its own runner and denies every tool', async t => {
  const calls = []; t.mock.method(hidden, 'runHiddenClaude', async (_p, opts) => { calls.push(opts); return { ok: true, text: 'done' }; });
  await runner.runReflectSession('prompt', { provider: 'claude', command: '/a path/claude', model: 'chosen-model', cwd: process.cwd() });
  assert.equal(calls[0].command, '"/a path/claude"'); assert.deepEqual(calls[0].disallowedTools, ['*']);
  assert.equal(calls[0].model, 'chosen-model'); assert.equal(calls[0].captureLimits, true);
  await runner.runReflectSession('prompt', { provider: 'claude', command: 'C:\\a path\\claude.exe', cwd: process.cwd() });
  assert.equal(calls[1].command, '"C:\\a path\\claude.exe"', 'quoting must not double Windows separators');
});

test('unsupported providers cannot silently spend a Claude invocation', async t => {
  t.mock.method(hidden, 'runHiddenClaude', () => { throw new Error('must not run Claude'); });
  t.mock.method(cp, 'spawn', () => { throw new Error('must not run an unsupported CLI'); });
  for (const provider of providers.AGENT_PROVIDER_PRESETS.map(p => p.id).filter(p => !['claude', 'opencode'].includes(p))) {
    const result = await runner.runReflectSession('prompt', { provider, command: provider, cwd: process.cwd() });
    assert.equal(result.ok, false); assert.equal(result.reason, 'unsupported-provider');
  }
  for (const inline of ['null', '[]', '{broken']) {
    const result = await runner.runReflectSession('prompt', { provider: 'opencode', command: '/fixture/opencode', cwd: process.cwd(), env: { OPENCODE_CONFIG_CONTENT: inline } });
    assert.equal(result.ok, false); assert.match(result.error, /Invalid OpenCode inline config/);
  }
});

test('Windows npm JavaScript and native-executable shims avoid cmd.exe', t => {
  const read = fs.readFileSync;
  const js = 'C:\\Program Files\\npm\\opencode.cmd';
  const native = 'C:\\Program Files\\npm\\native.cmd';
  t.mock.method(fs, 'readFileSync', (file, ...args) => file === js
    ? '@"%~dp0\\node.exe" "%~dp0\\node_modules\\opencode-ai\\bin\\opencode.js" %*'
    : file === native ? '@"%~dp0\\node_modules\\opencode-ai\\bin\\opencode.exe" %*' : read(file, ...args));
  const result = runner.reflectExecutable(js, 'win32');
  assert.ok(result.command); assert.notEqual(result.command, 'cmd.exe');
  assert.deepEqual(result.args, ['C:\\Program Files\\npm\\node_modules\\opencode-ai\\bin\\opencode.js']);
  assert.deepEqual(runner.reflectExecutable(native, 'win32'), { command: 'C:\\Program Files\\npm\\node_modules\\opencode-ai\\bin\\opencode.exe', args: [] });
});

test('a command override changes provider without inheriting another provider model', () => {
  assert.deepEqual(runner.resolveReflectLaunch({ command: 'opencode', model: 'local/cheap' }, { provider: 'claude', model: 'claude-sonnet' }, 'claude'), { provider: 'opencode', command: 'opencode', model: 'local/cheap' });
  assert.deepEqual(runner.resolveReflectLaunch({}, { provider: 'opencode' }, 'claude'), { provider: 'opencode', command: 'opencode', model: undefined });
  assert.deepEqual(runner.resolveReflectLaunch({ command: '"/a path/opencode"' }, { provider: 'claude' }, 'claude'), { provider: 'opencode', command: '/a path/opencode', model: undefined });
  assert.deepEqual(runner.resolveReflectLaunch({}, { provider: 'opencode', command: 'claude', model: 'local/test' }, 'claude'), { provider: 'opencode', command: 'opencode', model: 'local/test' }, 'stale Claude command must not launch with OpenCode flags');
});

test('limit parsing honors explicit UTC resets or relative delays without guessing timezones', () => {
  const now = Date.UTC(2026, 8, 24);
  assert.equal(limitRetryAt('retry after 3 minutes', now, 60_000), now + 180_000);
  assert.equal(limitRetryAt('resets Sep 25, 6pm (UTC)', now, 60_000), Date.UTC(2026, 8, 25, 18));
  assert.equal(limitRetryAt('resets Sep 25, 6am (PST)', now, 60_000), now + 60_000);
  assert.equal(limitRetryAt('resets Sep 20, 6am (UTC)', now, 60_000), now + 60_000);
  assert.match(limitResponse('\x1b[31mHTTP 429: too many requests\x1b[0m'), /429/);
  assert.equal(limitResponse('ordinary malformed summary'), null);
});

test('main wiring reads each worker from registry/roster and scopes local config and broker keys', () => {
  const source = ts.createSourceFile('index.ts', fs.readFileSync(path.join(__dirname, '../src/main/index.ts'), 'utf8'), ts.ScriptTarget.Latest, true);
  const functions = ['reflectSettings', 'reflectAgent', 'reflectEnv'].map(name => {
    const node = source.statements.find(n => ts.isFunctionDeclaration(n) && n.name?.text === name); assert.ok(node, name); return node.getText(source);
  }).join('\n');
  const output = ts.transpileModule(functions, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const reads = [];
  const deps = {
    readConfig: () => ({ defaultCommand: 'claude', reflectProvider: 'opencode', reflectModel: 'local/cheap', reflectRetryBackoffMs: 120_000, providerBaseUrls: { opencode: 'http://127.0.0.1:1234/v1' } }),
    hive: { registry: () => ({ agents: { jim: { provider: 'opencode' } } }) },
    roster: { read: () => ({ agents: [{ id: 'jim', provider: 'opencode', command: '"/a path/opencode" --model local/model', model: 'local/model' }], archived: [], restorable: [] }) },
    inferAgentProvider: providers.inferAgentProvider, memory: { env: () => ({ MEMPALACE_PALACE_PATH: '/memory' }) },
    BACKEND_KEY_ENV: { openai: 'OPENAI_API_KEY', anthropic: 'ANTHROPIC_API_KEY' },
    integrations: { getSecret: ref => { reads.push(ref); return 'fixture-not-a-secret'; } }, providerKeyRef: b => 'apikey:' + b
  };
  const fns = new Function(...Object.keys(deps), `${output}\nreturn { reflectSettings, reflectAgent, reflectEnv };`)(...Object.values(deps));
  assert.equal(fns.reflectSettings().provider, 'opencode'); assert.equal(fns.reflectSettings().retryBackoffMs, 120_000);
  assert.equal(fns.reflectAgent('jim').model, 'local/model'); assert.equal(fns.reflectAgent('jim').provider, 'opencode');
  const local = fns.reflectEnv({ provider: 'opencode', command: 'opencode', model: 'local/model' });
  assert.equal(JSON.parse(local.OPENCODE_CONFIG_CONTENT).provider.local.options.baseURL, 'http://127.0.0.1:1234/v1'); assert.equal(reads.length, 0);
  const api = fns.reflectEnv({ provider: 'opencode', command: 'opencode', model: 'openai/test' });
  assert.equal(api.OPENAI_API_KEY, 'fixture-not-a-secret'); assert.deepEqual(reads, ['apikey:openai']);
  assert.equal(api.ANTHROPIC_API_KEY, undefined);
});
