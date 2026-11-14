'use strict';

const assert = require('node:assert/strict');
const { spawn, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');

if (process.argv[2] === '--generate') {
  const base = process.argv[3];
  const home = path.join(base, 'home');
  const harness = path.join(base, 'harness');
  assert.equal(os.homedir(), home, 'generator HOME isolation failed');
  const { HiveManager } = require('./load-ts.cjs')('src/main/hive.ts');
  const hive = new HiveManager(() => harness);
  hive.ensureHive();
  hive.installAgyHooks();
  hive.installGrokHooks();
  const agentDir = path.join(harness, 'hive', 'agents', 'deadline-agent');
  const geminiSettings = hive.installGeminiHooks(agentDir);
  const codexHome = hive.installCodexHooks(agentDir, 'deadline-agent');
  process.stdout.write(JSON.stringify({ home, harness, agentDir, geminiSettings, codexHome }));
} else {
  const test = require('node:test');

  function makeFixture(t) {
    const base = fs.mkdtempSync(path.join(os.tmpdir(), 'md-hook-m4-'));
    t.after(() => fs.rmSync(base, { recursive: true, force: true }));
    const home = path.join(base, 'home');
    fs.mkdirSync(home);
    const generator = spawnSync(process.execPath, [__filename, '--generate', base], {
      env: { ...process.env, HOME: home, USERPROFILE: home },
      encoding: 'utf8',
      timeout: 20_000
    });
    assert.equal(generator.status, 0, generator.stderr);
    const paths = JSON.parse(generator.stdout);
    const bin = path.join(paths.harness, 'hive', 'bin');
    const shims = {
      claude: path.join(bin, 'cth-hook.cjs'),
      codex: path.join(bin, 'cth-hook.cjs'),
      antigravity: path.join(bin, 'agy-hook.cjs'),
      gemini: path.join(paths.agentDir, '.gemini-hive', 'gemini-hook.cjs'),
      grok: path.join(bin, 'grok-hook.cjs')
    };
    return { ...paths, shims };
  }

  function socketPath() {
    const name = `md-m4-${process.pid}-${crypto.randomUUID()}`;
    return process.platform === 'win32'
      ? `\\\\.\\pipe\\${name}`
      : path.join(os.tmpdir(), `${name}.sock`);
  }

  async function withServer(response, action) {
    const socket = socketPath();
    const requests = [];
    const connections = new Set();
    const server = net.createServer((connection) => {
      connections.add(connection);
      connection.on('close', () => connections.delete(connection));
      connection.on('error', () => {});
      let input = '';
      connection.setEncoding('utf8');
      connection.on('data', (chunk) => {
        input += chunk;
        const newline = input.indexOf('\n');
        if (newline < 0) return;
        requests.push(JSON.parse(input.slice(0, newline)));
        if (typeof response === 'function') response(connection);
        else if (response !== null) connection.end(response);
      });
    });
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(socket, resolve);
    });
    try {
      return await action(socket, requests);
    } finally {
      for (const connection of connections) connection.destroy();
      await new Promise((resolve) => server.close(resolve));
      if (process.platform !== 'win32') fs.rmSync(socket, { force: true });
    }
  }

  async function runShim(fixture, provider, options = {}) {
    const {
      args = [], chunks = [], closeStdin = true, socket,
      hardTimeoutMs = 9_000, preload, agentId = 'deadline-agent'
    } = options;
    const child = spawn(process.execPath, [
      ...(preload ? ['--require', preload] : []), fixture.shims[provider], ...args
    ], {
      shell: false,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: {
        ...process.env,
        HOME: fixture.home,
        USERPROFILE: fixture.home,
        AGENT_ID: agentId,
        ...(socket ? { HIVE_SOCK: socket } : { HIVE_SOCK: '' })
      }
    });
    const stdout = [];
    const stderr = [];
    const stdinErrors = [];
    child.stdout.on('data', (chunk) => stdout.push(chunk));
    child.stderr.on('data', (chunk) => stderr.push(chunk));
    child.stdin.on('error', (error) => stdinErrors.push(error));
    let hardTimedOut = false;
    const result = new Promise((resolve, reject) => {
      child.once('error', reject);
      child.once('close', (code, signal) => resolve({ code, signal }));
    });
    const hardTimer = setTimeout(() => {
      hardTimedOut = true;
      child.kill('SIGKILL');
    }, hardTimeoutMs);
    try {
      for (const chunk of chunks) {
        if (chunk.delayMs) await new Promise((resolve) => setTimeout(resolve, chunk.delayMs));
        child.stdin.write(chunk.value);
      }
      if (closeStdin) child.stdin.end();
      const outcome = await result;
      const unexpectedStdinErrors = stdinErrors.filter((error) =>
        !hardTimedOut || !['EPIPE', 'ERR_STREAM_DESTROYED'].includes(error.code));
      assert.deepEqual(unexpectedStdinErrors, []);
      return {
        ...outcome,
        hardTimedOut,
        stdout: Buffer.concat(stdout),
        stderr: Buffer.concat(stderr).toString('utf8')
      };
    } finally {
      clearTimeout(hardTimer);
      if (child.exitCode === null && child.signalCode === null) child.kill('SIGKILL');
    }
  }

  function evidence(t, label, result) {
    t.diagnostic(`${label}: stdout_hex=${result.stdout.toString('hex')} stderr=${JSON.stringify(result.stderr)} exit=${result.code} signal=${result.signal} hard_timeout=${result.hardTimedOut}`);
  }

  test('generated hook shims preserve provider output and have valid syntax', async (t) => {
    const fixture = makeFixture(t);
    const uniqueShims = [...new Set(Object.values(fixture.shims))];
    assert.equal(uniqueShims.length, 4);
    const generatedFiles = [path.join(fixture.harness, 'hive', 'bin'), fixture.agentDir]
      .flatMap(function walk(directory) {
        return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
          const filename = path.join(directory, entry.name);
          return entry.isDirectory() ? walk(filename) : [filename];
        });
      });
    const stdinConsumers = generatedFiles.filter((filename) =>
      filename.endsWith('.cjs') && /process\.stdin/.test(fs.readFileSync(filename, 'utf8')));
    assert.deepEqual(stdinConsumers.sort(), uniqueShims.sort());
    for (const shim of uniqueShims) {
      assert.ok(fs.existsSync(shim), shim);
      const checked = spawnSync(process.execPath, ['--check', shim], { encoding: 'utf8', timeout: 5_000 });
      assert.equal(checked.status, 0, `${shim}: ${checked.stderr}`);
      assert.match(fs.readFileSync(shim, 'utf8'), /process\.stdin/);
    }
    const codexConfig = fs.readFileSync(path.join(fixture.codexHome, 'config.toml'), 'utf8');
    assert.match(codexConfig, /timeout = 30/);
    const codexCommands = [...codexConfig.matchAll(/^command = (".*")$/gm)]
      .map((match) => JSON.parse(match[1]));
    assert.equal(codexCommands.length, 8);
    assert.ok(codexCommands.every((command) => command.includes(fixture.shims.codex)));
    const geminiConfig = JSON.parse(fs.readFileSync(fixture.geminiSettings, 'utf8'));
    assert.ok(geminiConfig.hooks.AfterAgent[0].hooks[0].command.includes(fixture.shims.gemini));
    const agyConfig = JSON.parse(fs.readFileSync(path.join(fixture.home, '.gemini', 'config', 'hooks.json'), 'utf8'));
    assert.ok(agyConfig['munder-hive'].Stop[0].hooks[0].command.includes(fixture.shims.antigravity));
    const grokConfig = JSON.parse(fs.readFileSync(path.join(fixture.home, '.grok', 'hooks', 'munder-hive.json'), 'utf8'));
    assert.ok(grokConfig.hooks.Stop[0].hooks[0].command.includes(fixture.shims.grok));

    const deny = JSON.stringify({ hookSpecificOutput: { permissionDecision: 'deny', permissionDecisionReason: 'blocked' } });
    const block = JSON.stringify({ decision: 'block', reason: 'steer' });
    const continueFalse = JSON.stringify({ continue: false, stopReason: 'continue' });
    const cases = [
      { provider: 'claude', args: [], input: { hook_event_name: 'PreToolUse' }, response: deny, expected: deny },
      { provider: 'claude', args: [], input: { hook_event_name: 'Stop' }, response: block, expected: block },
      { provider: 'codex', args: [], input: { hook_event_name: 'Stop' }, response: deny, expected: deny },
      { provider: 'antigravity', args: ['PreToolUse'], input: { toolCall: { name: 'Read' } }, response: '{}', expected: '' },
      { provider: 'antigravity', args: ['Stop'], input: {}, response: block, expected: JSON.stringify({ decision: 'block', reason: 'steer', stopReason: 'steer', systemMessage: 'steer' }) },
      { provider: 'gemini', args: [], input: { hook_event_name: 'BeforeTool' }, response: deny, expected: JSON.stringify({ decision: 'deny', reason: 'blocked' }) },
      { provider: 'gemini', args: [], input: { hook_event_name: 'AfterAgent' }, response: continueFalse, expected: continueFalse },
      { provider: 'grok', args: [], input: { hookEventName: 'pre_tool_use' }, response: deny, expected: JSON.stringify({ decision: 'deny', reason: 'blocked' }) },
      { provider: 'grok', args: [], input: { hookEventName: 'stop' }, response: block, expected: block }
    ];
    for (const contract of cases) {
      await withServer(contract.response, async (socket, requests) => {
        const result = await runShim(fixture, contract.provider, {
          args: contract.args,
          chunks: [{ value: JSON.stringify(contract.input) }],
          socket
        });
        evidence(t, contract.provider, result);
        assert.equal(result.hardTimedOut, false);
        assert.equal(result.code, 0);
        assert.deepEqual(result.stdout, Buffer.from(contract.expected));
        assert.equal(result.stderr, '');
        assert.equal(requests.length, 1);
      });
    }
  });

  test('stdin without EOF closes before parent hard timeout without forwarding', async (t) => {
    const fixture = makeFixture(t);
    await withServer('{}', async (socket, requests) => {
      const cases = [
        { label: 'empty', provider: 'claude', chunks: [] },
        { label: 'complete-json', provider: 'claude', chunks: [{ value: '{"hook_event_name":"Stop"}' }] },
        { label: 'partial-json', provider: 'claude', chunks: [{ value: '{"hook_event_name":"Stop"' }] },
        { label: 'status', provider: 'claude', args: ['--status'], chunks: [] },
        { label: 'antigravity', provider: 'antigravity', chunks: [] },
        { label: 'gemini', provider: 'gemini', chunks: [] },
        { label: 'grok', provider: 'grok', chunks: [] },
        { label: 'no-agent', provider: 'grok', chunks: [], agentId: '' },
        { label: 'no-socket', provider: 'claude', chunks: [], noSocket: true }
      ];
      const results = await Promise.all(cases.map(async (contract) => ({
        label: contract.label,
        result: await runShim(fixture, contract.provider, {
          args: contract.args,
          chunks: contract.chunks,
          closeStdin: false,
          socket: contract.noSocket ? undefined : socket,
          agentId: contract.agentId,
          hardTimeoutMs: contract.label === 'status' ? 4_000 : 9_000
        })
      })));
      for (const { label, result } of results) evidence(t, label, result);
      for (const { label, result } of results) {
        assert.equal(result.hardTimedOut, false, label);
        assert.equal(result.code, 0, label);
        assert.equal(result.stdout.length, 0, label);
        assert.match(result.stderr, /input_timeout/, label);
      }
      assert.equal(requests.length, 0);
    });
  });

  test('EOF hands off once, keeps UTF-8 intact, and preserves status output', async (t) => {
    const fixture = makeFixture(t);
    await withServer('{}', async (socket, requests) => {
      const payload = { hook_event_name: 'UserPromptSubmit', prompt: '中文 😀' };
      const encoded = Buffer.from(JSON.stringify(payload));
      const emojiStart = encoded.indexOf(Buffer.from('😀'));
      assert.ok(emojiStart > 0);
      const result = await runShim(fixture, 'claude', {
        socket,
        chunks: [
          { value: encoded.subarray(0, emojiStart + 2) },
          { value: encoded.subarray(emojiStart + 2), delayMs: 100 }
        ]
      });
      assert.equal(result.code, 0);
      assert.deepEqual(result.stdout, Buffer.from('{}'));
      assert.equal(result.stderr, '');
      assert.equal(requests.length, 1);
      assert.equal(requests[0].prompt, payload.prompt);
    });
    await withServer((connection) => setTimeout(() => connection.end('{}'), 800), async (socket, requests) => {
      const result = await runShim(fixture, 'claude', {
        socket,
        args: ['--status'],
        chunks: [{ value: JSON.stringify({ context_window: { total_input_tokens: 3000, context_window_size: 200000 } }), delayMs: 1000 }],
        hardTimeoutMs: 4_000
      });
      evidence(t, 'status-after-EOF', result);
      assert.equal(result.hardTimedOut, false);
      assert.equal(result.code, 0);
      assert.deepEqual(result.stdout, Buffer.from('ctx 3k/200k (2%)'));
      assert.equal(result.stderr, '');
      assert.equal(requests.length, 1);
      assert.equal(requests[0].hook_event_name, 'Status');
    });
  });

  test('empty and malformed EOF keep the existing JSON fallback', async (t) => {
    const fixture = makeFixture(t);
    await withServer('{}', async (socket, requests) => {
      for (const input of ['', '{"hook_event_name":']) {
        const result = await runShim(fixture, 'claude', {
          socket,
          chunks: [{ value: input }]
        });
        assert.equal(result.code, 0);
        assert.deepEqual(result.stdout, Buffer.from('{}'));
        assert.equal(result.stderr, '');
      }
      assert.equal(requests.length, 2);
      assert.ok(requests.every((request) =>
        request.agent_id === 'deadline-agent' && request.hook_event_name === undefined));
    });
  });

  test('socket absence, connection failure, and socket timeout retain neutral results', async (t) => {
    const fixture = makeFixture(t);
    const input = [{ value: '{"hook_event_name":"Stop"}' }];
    const absent = await runShim(fixture, 'claude', { chunks: input });
    assert.equal(absent.code, 0);
    assert.equal(absent.stdout.length, 0);
    assert.equal(absent.stderr, '');
    const missing = await runShim(fixture, 'claude', { chunks: input, socket: socketPath() });
    assert.equal(missing.code, 0);
    assert.equal(missing.stdout.length, 0);
    assert.equal(missing.stderr, '');
    await withServer(null, async (socket, requests) => {
      const unresponsive = await runShim(fixture, 'claude', {
        chunks: input,
        socket,
        hardTimeoutMs: 8_000
      });
      evidence(t, 'socket-timeout', unresponsive);
      assert.equal(unresponsive.hardTimedOut, false);
      assert.equal(unresponsive.code, 0);
      assert.equal(unresponsive.stdout.length, 0);
      assert.equal(unresponsive.stderr, '');
      assert.equal(requests.length, 1);
    });
  });

  test('stdin error, early close, and handler failure have bounded outcomes', async (t) => {
    const fixture = makeFixture(t);
    await withServer('{}', async (socket, requests) => {
      for (const [eventName, expectedReason] of [
        ['error', 'stdin_error'],
        ['close', 'stdin_closed']
      ]) {
        const preload = path.join(fixture.home, `${eventName}-preload.cjs`);
        const emitEvent = eventName === 'error'
          ? "process.stdin.emit('error', Object.assign(new Error('secret payload'), { code: 'EIO' }))"
          : "process.stdin.emit('close')";
        fs.writeFileSync(preload, `process.stdin.once('data', () => queueMicrotask(() => ${emitEvent}));\n`);
        const result = await runShim(fixture, 'claude', {
          preload,
          socket,
          chunks: [{ value: '{"hook_event_name":"Stop"}' }],
          closeStdin: false,
          hardTimeoutMs: 3_000
        });
        evidence(t, eventName, result);
        assert.equal(result.hardTimedOut, false);
        assert.equal(result.code, 0);
        assert.equal(result.stdout.length, 0);
        assert.match(result.stderr, new RegExp(expectedReason));
        assert.doesNotMatch(result.stderr, /secret payload|hook_event_name/);
      }
      const handlerFailure = await runShim(fixture, 'claude', {
        socket,
        chunks: [{ value: 'null' }]
      });
      assert.equal(handlerFailure.hardTimedOut, false);
      assert.equal(handlerFailure.code, 1);
      assert.equal(handlerFailure.stdout.length, 0);
      assert.match(handlerFailure.stderr, /handler_error/);
      assert.doesNotMatch(handlerFailure.stderr, /null|TypeError/);
      assert.equal(requests.length, 0);
    });
  });
}
