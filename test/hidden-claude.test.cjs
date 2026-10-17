'use strict';

/**
 * The hidden condensation call (src/main/hiddenClaude.ts).
 *
 * WHAT WENT WRONG IN v1.1.46. Every agent's hidden condensation ran in the same
 * harness-home cwd, so every one of them wrote into the same Claude project directory.
 * The runner spawned an interactive PTY with no session id, waited 3.5 s of TUI silence,
 * then read back whichever `.jsonl` in that directory had the newest mtime (admitting
 * anything touched within 5 s BEFORE its own spawn). Two independent hazards: silence is
 * not turn completion, and the newest file is not necessarily this session's. The log
 * shows the result - 820 `condense-abort` records and zero successes - and the dangerous
 * half is not the aborts, it is that a plausible summary belonging to ANOTHER AGENT could
 * be captured and written into this one's memory.
 *
 * The primary regression below reproduces BOTH races on a fake clock, with a decoy
 * transcript on disk that is newer than the (initially absent) real one. It is red on the
 * v1.1.46 protocol and green only once directory scanning and silence-completion are gone.
 */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { EventEmitter } = require('node:events');
const loadTs = require('./load-ts.cjs');

const { runHiddenClaude, readEnvelope, API_KEY_ENV } = loadTs('src/main/hiddenClaude.ts');

const UUID = '11111111-1111-4111-8111-111111111111';
/** The v1.1.46 silence boundary. Nothing may complete on it any more. */
const OLD_IDLE_MS = 3500;

/** A fake child process: EventEmitter streams, a recorded stdin, no real process. */
function fakeChild({ pid = 4242 } = {}) {
  const child = new EventEmitter();
  child.pid = pid;
  child.stdout = new EventEmitter();
  child.stderr = new EventEmitter();
  child.stdout.setEncoding = () => {};
  child.stderr.setEncoding = () => {};
  child.stdin = { written: '', ended: false, end(data) { if (data) this.written += data; this.ended = true; } };
  child.killed = false;
  child.kill = () => { child.killed = true; };
  return child;
}

/** A controllable clock: timers fire only when the test advances it. */
function fakeClock() {
  let now = 0;
  let seq = 0;
  const timers = new Map();
  return {
    get now() { return now; },
    setTimeout(fn, ms) { const id = ++seq; timers.set(id, { at: now + ms, fn }); return id; },
    clearTimeout(id) { timers.delete(id); },
    advance(ms) {
      const target = now + ms;
      for (;;) {
        const due = [...timers.entries()].filter(([, t]) => t.at <= target).sort((a, b) => a[1].at - b[1].at)[0];
        if (!due) break;
        timers.delete(due[0]);
        now = due[1].at;
        due[1].fn();
      }
      now = target;
    },
    get pending() { return timers.size; }
  };
}

/** Harness: a real cwd, a fake child, a fake clock, and a recording of the spawn call. */
function harness({ cwd, uuid = UUID } = {}) {
  const clock = fakeClock();
  const child = fakeChild();
  const calls = [];
  const killed = [];
  const deps = {
    spawn: (file, args, options) => { calls.push({ file, args, options }); return child; },
    randomUUID: () => uuid,
    setTimeout: (fn, ms) => clock.setTimeout(fn, ms),
    clearTimeout: (t) => clock.clearTimeout(t),
    ensureKilled: (pid) => killed.push(pid)
  };
  return { clock, child, calls, killed, deps, cwd: cwd || os.tmpdir() };
}

function envelope(overrides = {}) {
  return JSON.stringify({
    type: 'result',
    session_id: UUID,
    is_error: false,
    result: '{"condensed":"the real summary","hoist":[]}',
    structured_output: { condensed: 'the real summary', hoist: [] },
    ...overrides
  });
}

/** A temp dir with a DECOY transcript newer than anything this session writes. */
function decoyProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'hidden-claude-'));
  const decoy = path.join(root, 'other-session.jsonl');
  fs.writeFileSync(decoy, `${JSON.stringify({
    type: 'assistant',
    message: { content: [{ type: 'text', text: '{"condensed":"ANOTHER AGENT\'S SUMMARY","hoist":[]}' }] }
  })}\n`);
  // Newer than now, so an mtime sort would always prefer it.
  const future = new Date(Date.now() + 60_000);
  fs.utimesSync(decoy, future, future);
  return { root, decoy };
}

test('THE REGRESSION: a newer decoy transcript plus output delivered after the old silence window', async () => {
  const { root, decoy } = decoyProject();
  const h = harness({ cwd: root });
  const decoyBefore = fs.statSync(decoy).atimeMs;

  const p = runHiddenClaude('condense this memory', { model: 'claude-haiku-4-5', cwd: root }, h.deps);

  let settled = false;
  p.then(() => { settled = true; });

  // Output arrives in chunks, with the tail deliberately after the 3.5 s boundary that
  // v1.1.46 treated as "the turn is over".
  const body = envelope();
  h.child.stdout.emit('data', body.slice(0, 20));
  h.clock.advance(OLD_IDLE_MS + 1000);
  await Promise.resolve();
  assert.equal(settled, false, 'v1.1.46 captured here; completion must now wait for the stream to close');

  h.child.stdout.emit('data', body.slice(20));
  h.child.emit('exit', 0, null);
  await Promise.resolve();
  assert.equal(settled, false, "'exit' is not 'close' - the last bytes can still be in flight");

  h.child.emit('close', 0, null);
  const r = await p;

  assert.equal(r.ok, true, r.error);
  assert.deepEqual(r.structuredOutput, { condensed: 'the real summary', hoist: [] });
  assert.equal(r.sessionId, UUID);
  // The decoy must never have been opened: correctness here is ownership, not recency.
  assert.equal(fs.statSync(decoy).atimeMs, decoyBefore, "the other session's transcript was read");
  fs.rmSync(root, { recursive: true, force: true });
});

test('THE REGRESSION, second half: argv owns one session and the prompt goes on stdin', () => {
  const h = harness();
  runHiddenClaude('the whole prompt, including memory text', { model: 'claude-haiku-4-5', cwd: h.cwd, jsonSchema: { type: 'object' } }, h.deps);
  const { args } = h.calls[0];
  const flat = args.join(' ');

  assert.equal(args.filter((a) => a === '--session-id').length, 1, 'exactly one session id');
  assert.equal(args[args.indexOf('--session-id') + 1], UUID);
  assert.ok(args.includes('--print'), 'print mode');
  assert.equal(args[args.indexOf('--output-format') + 1], 'json');
  assert.equal(args[args.indexOf('--json-schema') + 1], '{"type":"object"}');
  // The prompt must never be visible in argv (Windows length limit; argv is world-readable).
  assert.ok(!flat.includes('the whole prompt'), 'the prompt must not reach argv');
  assert.equal(h.child.stdin.written, 'the whole prompt, including memory text');
  assert.equal(h.child.stdin.ended, true, 'stdin must be closed or the child waits forever');
});

test('close drains stdout: bytes emitted after exit are still parsed', async () => {
  const h = harness();
  const p = runHiddenClaude('x', { model: 'm', cwd: h.cwd }, h.deps);
  const body = envelope();
  h.child.stdout.emit('data', body.slice(0, body.length - 5));
  h.child.emit('exit', 0, null);
  h.child.stdout.emit('data', body.slice(body.length - 5));   // the tail, after exit
  h.child.emit('close', 0, null);
  const r = await p;
  assert.equal(r.ok, true, r.error);
  assert.equal(r.structuredOutput.condensed, 'the real summary');
});

test('a timeout kills the tree once and ignores the close that follows', async () => {
  const h = harness();
  const p = runHiddenClaude('x', { model: 'm', cwd: h.cwd, timeoutMs: 1000 }, h.deps);
  h.clock.advance(1001);
  const r = await p;
  assert.equal(r.ok, false);
  assert.match(r.error, /timed out/);
  assert.equal(h.child.killed, true);
  assert.deepEqual(h.killed, [4242], 'the descendant sweep runs exactly once');

  // A late close must not resolve a second time or overwrite the verdict.
  h.child.stdout.emit('data', envelope());
  h.child.emit('close', 0, null);
  assert.equal((await p).error, r.error);
});

test('oversized stdout is killed and refused rather than truncated into a summary', async () => {
  const h = harness();
  const p = runHiddenClaude('x', { model: 'm', cwd: h.cwd }, h.deps);
  h.child.stdout.emit('data', 'x'.repeat(1024 * 1024 + 1));
  const r = await p;
  assert.equal(r.ok, false);
  assert.match(r.error, /stdout exceeded/);
  assert.equal(h.child.killed, true);
});

test('a nonzero exit reports the code and a BOUNDED stderr tail, never the payload', async () => {
  const h = harness();
  const p = runHiddenClaude('secret memory text', { model: 'm', cwd: h.cwd }, h.deps);
  h.child.stderr.emit('data', `${'noise\n'.repeat(4000)}the real reason\n`);
  h.child.emit('close', 3, null);
  const r = await p;
  assert.equal(r.ok, false);
  assert.match(r.error, /claude exited 3/);
  assert.ok(r.error.length < 700, `the error must stay bounded, got ${r.error.length}`);
  assert.ok(!r.error.includes('secret memory text'), 'the prompt must never reach an error string');
});

test('a spawn error is a stable failure, not a throw into the reflect loop', async () => {
  const h = harness();
  const p = runHiddenClaude('x', { model: 'm', cwd: h.cwd }, h.deps);
  h.child.emit('error', new Error('spawn claude ENOENT'));
  const r = await p;
  assert.equal(r.ok, false);
  assert.match(r.error, /ENOENT/);
});

test('an empty prompt and a missing cwd are refused before anything is spawned', async () => {
  const h = harness();
  assert.equal((await runHiddenClaude('   ', { model: 'm', cwd: h.cwd }, h.deps)).error, 'empty prompt');
  const gone = path.join(os.tmpdir(), 'definitely-not-here-9d2f1');
  assert.match((await runHiddenClaude('x', { model: 'm', cwd: gone }, h.deps)).error, /cwd does not exist/);
  assert.equal(h.calls.length, 0);
});

// ─── the envelope, which is the only thing allowed to become a summary ───

test('readEnvelope rejects a session id that is not the one we generated', () => {
  const r = readEnvelope(envelope({ session_id: '99999999-9999-4999-8999-999999999999' }), UUID);
  assert.equal(r.ok, false);
  assert.equal(r.error, 'session id mismatch');
});

test('readEnvelope tolerates an ABSENT session id - the fixed argv still owns the session', () => {
  const body = JSON.parse(envelope());
  delete body.session_id;
  assert.equal(readEnvelope(JSON.stringify(body), UUID).ok, true);
});

test('readEnvelope refuses everything that is not exactly one JSON object', () => {
  for (const [stdout, why] of [
    ['', 'empty'],
    ['   \n ', 'whitespace'],
    ['not json at all', 'prose'],
    ['[{"result":"{}"}]', 'an array'],
    ['"a string"', 'a bare string'],
    [`prose before ${envelope()}`, 'a valid envelope with a prefix'],
    [`${envelope()} trailing prose`, 'a valid envelope with a suffix'],
    ['```json\n' + envelope() + '\n```', 'a fenced envelope']
  ]) {
    assert.equal(readEnvelope(stdout, UUID).ok, false, `must refuse ${why}`);
  }
});

test('readEnvelope refuses an envelope that reports its own error', () => {
  const r = readEnvelope(envelope({ is_error: true, subtype: 'error_during_execution' }), UUID);
  assert.equal(r.ok, false);
  assert.match(r.error, /error_during_execution/);
});

// ─── the billing guard (Dwight's caveat) ───

test('credential env that would silently move billing to pay-as-you-go is STRIPPED', () => {
  const h = harness();
  const before = {};
  for (const k of API_KEY_ENV) { before[k] = process.env[k]; process.env[k] = 'sk-inherited'; }
  try {
    runHiddenClaude('x', {
      model: 'm', cwd: h.cwd,
      // Stripping must happen AFTER the merge, or opts.env quietly puts it back.
      env: { ANTHROPIC_API_KEY: 'sk-from-opts', MEMPALACE_PALACE_PATH: 'C:/palace' }
    }, h.deps);
  } finally {
    for (const k of API_KEY_ENV) { if (before[k] === undefined) delete process.env[k]; else process.env[k] = before[k]; }
  }
  const { env } = h.calls[0].options;
  for (const k of API_KEY_ENV) assert.ok(!(k in env), `${k} must not reach the child`);
  assert.equal(env.MEMPALACE_PALACE_PATH, 'C:/palace', 'the rest of opts.env still merges');
  assert.ok(env.PATH, 'and the resolved shell PATH is preserved');
});

test('API_KEY_ENV names the credential-bearing vars, not provider routing', () => {
  // Routing flags (Bedrock/Vertex) are a deliberate deployment choice; stripping them
  // would break a user who means to run there. Only credentials that OVERRIDE a
  // logged-in subscription are removed.
  assert.deepEqual([...API_KEY_ENV].sort(), ['ANTHROPIC_API_KEY', 'ANTHROPIC_API_KEY_HELPER', 'ANTHROPIC_AUTH_TOKEN']);
});

// ─── the REAL launch boundary (the design warns against proving this with `node` alone) ───

/** A real npm-style `.cmd` shim that echoes back the argv and stdin it actually received. */
function cmdShim() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-shim-'));
  fs.writeFileSync(path.join(dir, 'shim.js'), [
    "const chunks = [];",
    "process.stdin.on('data', (c) => chunks.push(c));",
    "process.stdin.on('end', () => {",
    "  const argv = process.argv.slice(2);",
    "  const at = (f) => { const i = argv.indexOf(f); return i < 0 ? null : argv[i + 1]; };",
    "  process.stdout.write(JSON.stringify({",
    "    type: 'result', is_error: false, session_id: at('--session-id'),",
    "    structured_output: { condensed: 'from the shim', hoist: [] },",
    "    result: JSON.stringify({ argv, stdin: Buffer.concat(chunks).toString('utf8') })",
    "  }));",
    "});"
  ].join('\n'));
  const cmd = path.join(dir, 'claude.cmd');
  // Exactly the npm shim shape: a .cmd that CreateProcess cannot exec directly.
  fs.writeFileSync(cmd, ['@echo off', 'node "%~dp0shim.js" %*', ''].join('\r\n'));
  return { dir, cmd };
}

test('the REAL Windows .cmd shim path: schema and prompt survive the cmd.exe wrapper', { skip: process.platform === 'win32' ? false : 'the .cmd shim wrapper is a win32 path' }, async () => {
  // The design is explicit that proving this by spawning `node` would prove nothing:
  // on Windows the configured command is usually an npm `.cmd` shim, which Node refuses
  // to exec directly, so the call goes through cmd.exe - and cmd.exe RE-PARSES every
  // argument. The JSON schema is the argument most likely to be mangled by that, so it
  // is the one worth sending through a real shim.
  const { dir, cmd } = cmdShim();
  try {
    const schema = { type: 'object', additionalProperties: false, required: ['condensed', 'hoist'] };
    const prompt = 'line one\nline two with "quotes" & an ampersand';
    const r = await runHiddenClaude(prompt, {
      model: 'claude-haiku-4-5', cwd: dir, command: cmd, jsonSchema: schema, timeoutMs: 60_000
    });
    assert.equal(r.ok, true, r.error);
    assert.deepEqual(r.structuredOutput, { condensed: 'from the shim', hoist: [] });
    const echoed = JSON.parse(r.result);
    const at = (f) => echoed.argv[echoed.argv.indexOf(f) + 1];
    assert.deepEqual(JSON.parse(at('--json-schema')), schema, 'the schema arrived through cmd.exe byte-intact');
    assert.equal(at('--session-id'), r.sessionId, 'and the child was told the session we generated');
    assert.ok(echoed.argv.includes('--print'));
    assert.equal(echoed.stdin, prompt, 'the whole prompt arrived on stdin, newlines and all');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ─── source-level pins: the deleted protocol must stay deleted ───

test('PIN: the newest-mtime transcript scan is gone from the condensation path', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '..', 'src/main/hiddenClaude.ts'), 'utf8');
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  for (const gone of ['extractLastAssistantText', 'projectDir', 'readdirSync', 'node-pty', 'idleMs', 'mtime']) {
    assert.ok(!code.includes(gone), `${gone} must not come back - a dormant fallback is a regression waiting to happen`);
  }
  assert.ok(code.includes("'close'"), 'completion is the close event');
});
