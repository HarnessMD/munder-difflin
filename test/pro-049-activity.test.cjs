// PRO phase 2a of 0.4.9 (decision D4): the activity digest in main. Every
// hook boundary worth a line becomes one ActivityEntry (shared/activity.ts),
// main keeps one ring per agent (main/activityDigest.ts), the HookServer and
// the hive router feed it, the renderer gets each entry live and the whole
// ring back on reload through 'hive:agentActivity'. Tool input is summarised
// to one readable line and never crosses whole.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

// hooks.ts pulls Notification from electron; outside Electron that resolve gives
// a path string, so seed the cache with the surface the server actually touches.
const electron = require.resolve('electron');
require.cache[electron] = {
  id: electron,
  filename: electron,
  loaded: true,
  exports: { Notification: class { show() {} static isSupported() { return false; } } }
};

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const A = loadTs('src/shared/activity.ts');
const { ActivityDigest } = loadTs('src/main/activityDigest.ts');
const { HiveManager } = loadTs('src/main/hive.ts');
const { HookServer } = loadTs('src/main/hooks.ts');
const { ControlRegistry } = loadTs('src/main/control.ts');

const T = 1_700_000_000_000;
const hook = (event, p = {}, ts = T) => A.entryForHookEvent(event, p, ts);

test('a hook becomes the one line it deserves, or nothing', () => {
  // `detail` is the SHORT line a person reads; `path` is the whole path, so
  // the Inbox's file chip can open the file the tool touched (0.4.9 phase 3,
  // founder: "clicking a file should open it"). A shortened path cannot be
  // opened, which is why both are carried instead of one being parsed back
  // out of the other.
  assert.deepEqual(
    hook('PreToolUse', { tool: 'Read', toolInput: { file_path: '/Users/x/repo/src/main/relay.ts' } }),
    { ts: T, kind: 'tool', tool: 'Read', detail: 'main/relay.ts', path: '/Users/x/repo/src/main/relay.ts' }
  );
  assert.deepEqual(
    hook('PreToolUse', { tool: 'Write', toolInput: { file_path: 'test/me.test.mjs', content: 'x'.repeat(5000) } }),
    { ts: T, kind: 'tool', tool: 'Write', detail: 'test/me.test.mjs' },
    'the content never rides along, and a RELATIVE path gets no chip: it would open the wrong file or none'
  );
  assert.deepEqual(
    hook('PreToolUse', { tool: 'Grep', toolInput: { pattern: 'x', path: '/Users/x/repo/src' } }),
    { ts: T, kind: 'tool', tool: 'Grep', detail: 'x' },
    'the DIRECTORY a search runs in is not a file the chip can open'
  );
  assert.equal(hook('PreToolUse', { tool: 'TodoWrite', toolInput: { todos: [] } }), null, 'bookkeeping is not a line');
  assert.equal(hook('PreToolUse', { tool: 'TaskOutput' }), null);
  assert.equal(hook('PreToolUse', {}), null, 'no tool name, no line');
  assert.equal(hook('PostToolUse', { tool: 'Read', toolInput: { file_path: 'a.ts' } }), null, 'one line per call, at PreToolUse');
  assert.equal(hook('Notification', { notificationType: 'idle' }), null, 'a notice without words is dropped');
  assert.deepEqual(hook('Notification', { message: 'Claude needs your permission to run Bash' }), { ts: T, kind: 'notice', text: 'Claude needs your permission to run Bash' });
  assert.deepEqual(hook('Stop'), { ts: T, kind: 'idle' });
  assert.equal(hook('SubagentStop'), null, 'a subagent finishing is not the agent going idle');
  assert.deepEqual(hook('PreCompact'), { ts: T, kind: 'compact', text: 'started' });
  assert.deepEqual(hook('PostCompact'), { ts: T, kind: 'compact', text: 'done' });
  assert.deepEqual(hook('SessionStart', { source: 'resume' }), { ts: T, kind: 'session', text: 'resume' });
  assert.deepEqual(hook('SessionStart'), { ts: T, kind: 'session', text: undefined });
  for (const noise of ['Status', 'CostSample', 'UserPromptSubmit', 'Unknown', '']) assert.equal(hook(noise, { tool: 'Read', message: 'm' }), null, `${noise || 'empty'} is noise`);
});

test('tool input summaries: a short path, the head of a command, the pattern, the url, else the first string', () => {
  const s = A.summariseToolInput;
  assert.equal(s('Read', { file_path: '/Users/alex/repo/src/main/relay.ts' }), 'main/relay.ts');
  assert.equal(s('Read', { file_path: 'relay.ts' }), 'relay.ts');
  assert.equal(s('Read', { file_path: 'C:\\repo\\src\\main\\relay.ts' }), 'main/relay.ts', 'Windows separators too');
  assert.equal(s('NotebookEdit', { notebook_path: '/a/b/c/notes.ipynb', new_source: 'print(1)' }), 'c/notes.ipynb');
  assert.equal(s('Bash', { command: 'npm   run -s\n  typecheck:node', description: 'Typecheck' }), 'npm run -s typecheck:node', 'the command, whitespace collapsed, before its description');
  const long = 'x'.repeat(300);
  const clipped = s('Bash', { command: long });
  assert.equal(clipped.length, 120);
  assert.ok(clipped.endsWith('…'), 'a long command keeps its head and says so');
  assert.equal(s('Grep', { pattern: 'entryForHookEvent', glob: '*.ts' }), 'entryForHookEvent in *.ts');
  assert.equal(s('Grep', { pattern: 'entryForHookEvent', path: '/Users/x/repo/src' }), 'entryForHookEvent', 'the pattern wins over the directory it searches');
  assert.equal(s('Glob', { pattern: '**/*.test.cjs', path: '/Users/x/repo' }), '**/*.test.cjs');
  assert.equal(s('LS', { path: '/Users/x/repo/src/main' }), 'src/main', 'a bare path is still a path');
  assert.equal(s('WebFetch', { url: 'https://example.com/docs', prompt: 'summarise' }), 'https://example.com/docs');
  assert.equal(s('WebSearch', { query: 'electron ipc' }), 'electron ipc');
  assert.equal(s('Task', { description: 'Find the router', prompt: 'long prompt' }), 'Find the router');
  assert.equal(s('Skill', { skill: 'review' }), 'review');
  assert.equal(s('Mystery', { foo: 'bar', n: 3 }), 'bar', 'an unknown shape yields its first string');
  assert.equal(s('Mystery', { n: 3, deep: { a: 'hidden' } }), undefined, 'and nothing when it has none at the top');
  assert.equal(s('Mystery', { file_path: '   ' }), undefined, 'blank strings do not count');
  assert.equal(s('Mystery', {}), undefined);
  assert.equal(s('Mystery', null), undefined);
  assert.equal(s('Mystery', 'a string'), undefined);
  assert.equal(s('Mystery', 42), undefined);
  assert.equal(s('Mystery', ['first', 'second']), 'first');
});

test('nothing ever renders "[object Object]"', () => {
  const shapes = [
    { file_path: { nested: true } },
    { command: ['ls'] },
    { pattern: {}, glob: {} },
    { url: { href: 'x' } },
    { deep: { a: { b: 1 } } },
    { file_path: '/a/b/c.ts', extra: { junk: true } },
    [{ a: 1 }],
    { toString: () => '[object Object]' }
  ];
  for (const input of shapes) {
    const detail = A.summariseToolInput('Any', input);
    assert.ok(!String(detail).includes('[object'), `summary of ${JSON.stringify(input)} was ${detail}`);
    const entry = hook('PreToolUse', { tool: 'Any', toolInput: input });
    assert.ok(!JSON.stringify(entry).includes('[object'), `entry for ${JSON.stringify(input)} was ${JSON.stringify(entry)}`);
  }
  for (const bad of [{ a: 1 }, 42, null]) {
    assert.ok(!JSON.stringify(hook('Notification', { message: bad })).includes('[object'));
    assert.ok(!JSON.stringify(hook('SessionStart', { source: bad })).includes('[object'));
  }
});

test('the outbox line: the subject, clipped, and never a blank one', () => {
  assert.deepEqual(A.entryForMessage('REQUEST: review relay.ts', T), { ts: T, kind: 'message', text: 'REQUEST: review relay.ts' });
  assert.equal(A.entryForMessage('   ', T), null);
  assert.equal(A.entryForMessage(undefined, T), null);
  const long = A.entryForMessage('s'.repeat(400), T);
  assert.equal(long.text.length, 120);
  assert.ok(long.text.endsWith('…'));
});

test('the ring keeps ACTIVITY_RING entries per agent, drops the oldest, lists oldest first and pushes each record live', () => {
  const pushes = [];
  const digest = new ActivityDigest(() => ({ send: (channel, payload) => pushes.push({ channel, payload }) }));
  const N = A.ACTIVITY_RING;
  assert.equal(N, 200);
  for (let i = 0; i < N + 5; i++) digest.record('jim-1', { ts: T + i, kind: 'tool', tool: 'Read', detail: `f${i}.ts` });
  digest.record('pam-1', { ts: T, kind: 'idle' });
  const all = digest.list('jim-1');
  assert.equal(all.length, N, 'capped at the ring');
  assert.equal(all[0].detail, 'f5.ts', 'the five oldest were dropped');
  assert.equal(all[N - 1].detail, `f${N + 4}.ts`);
  assert.equal(all[N - 1].ts, T + N + 4, 'the last entry carries updatedAt');
  assert.deepEqual(digest.list('jim-1', 3).map((e) => e.detail), [`f${N + 2}.ts`, `f${N + 3}.ts`, `f${N + 4}.ts`], 'a limit takes the newest, still oldest first');
  assert.equal(digest.list('jim-1', 0).length, N, 'a nonsense limit means the whole ring');
  assert.equal(digest.list('jim-1', 2.5).length, N);
  assert.deepEqual(digest.list('pam-1'), [{ ts: T, kind: 'idle' }], 'rings are per agent');
  assert.deepEqual(digest.list('nobody'), []);
  assert.equal(pushes.length, N + 6, 'every record went to the renderer');
  assert.ok(pushes.every((p) => p.channel === 'hive:agentActivity'));
  assert.deepEqual(pushes[0].payload, { agentId: 'jim-1', entry: { ts: T, kind: 'tool', tool: 'Read', detail: 'f0.ts' } });
  digest.forget('jim-1');
  assert.deepEqual(digest.list('jim-1'), []);
  assert.equal(digest.list('pam-1').length, 1, 'forgetting one agent leaves the others');
  // No window, or a window that throws, never breaks a record.
  const dark = new ActivityDigest(() => null);
  dark.record('x', { ts: T, kind: 'idle' });
  const broken = new ActivityDigest(() => ({ send: () => { throw new Error('torn down'); } }));
  broken.record('x', { ts: T, kind: 'idle' });
  assert.equal(dark.list('x').length + broken.list('x').length, 2);
  const small = new ActivityDigest(() => null, 3);
  for (let i = 0; i < 5; i++) small.record('a', { ts: T + i, kind: 'idle' });
  assert.deepEqual(small.list('a').map((e) => e.ts), [T + 2, T + 3, T + 4], 'the cap is a constructor choice');
});

async function floor(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-049-activity-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'jim-1', name: 'Jim', provider: 'claude', cwd: home });
  await hive.ensureAgent({ id: 'pam-1', name: 'Pam', provider: 'claude', cwd: home });
  const recorded = [];
  const activity = { record: (agentId, entry) => recorded.push({ agentId, entry }) };
  const control = new ControlRegistry();
  const server = new HookServer(hive, () => null, () => ({ notifications: false }), control, undefined, undefined, undefined, activity);
  const fire = (payload) => server.handle({ agent_id: 'jim-1', session_id: 's1', ...payload });
  return { home, hive, recorded, activity, control, fire };
}

test('the HookServer records each real boundary once, never a status tick, never a gated tool', async (t) => {
  const { recorded, control, fire } = await floor(t);
  fire({ hook_event_name: 'SessionStart', source: 'startup' });
  fire({ hook_event_name: 'Status', context_window: { total_input_tokens: 10, context_window_size: 200000 } });
  fire({ hook_event_name: 'UserPromptSubmit', prompt: 'go' });
  fire({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: '/Users/x/repo/src/main/relay.ts' } });
  fire({ hook_event_name: 'PostToolUse', tool_name: 'Read', tool_input: { file_path: '/Users/x/repo/src/main/relay.ts' } });
  fire({ hook_event_name: 'PreToolUse', tool_name: 'TodoWrite', tool_input: { todos: [] } });
  fire({ hook_event_name: 'Notification', notification_type: 'permission', message: 'Claude needs your permission' });
  fire({ hook_event_name: 'PreCompact' });
  fire({ hook_event_name: 'PostCompact' });
  fire({ hook_event_name: 'Stop' });
  fire({ hook_event_name: 'Stop', agent_id: undefined });
  fire({ hook_event_name: 'CostSample', model: 'qwen', input: 1, output: 1 });
  assert.deepEqual(
    recorded.map((r) => [r.agentId, r.entry.kind, r.entry.tool ?? r.entry.text ?? r.entry.detail]),
    [
      ['jim-1', 'session', 'startup'],
      ['jim-1', 'tool', 'Read'],
      ['jim-1', 'notice', 'Claude needs your permission'],
      ['jim-1', 'compact', 'started'],
      ['jim-1', 'compact', 'done'],
      ['jim-1', 'idle', undefined]
    ]
  );
  assert.equal(recorded[1].entry.detail, 'main/relay.ts', 'the tool line carries the short path, not the payload');
  assert.ok(recorded.every((r) => Number.isFinite(r.entry.ts)));
  // A paused agent's denied tool call is not a tool that ran.
  recorded.length = 0;
  control.pause('jim-1', true);
  const res = fire({ hook_event_name: 'PreToolUse', tool_name: 'Read', tool_input: { file_path: 'a.ts' } });
  assert.equal(res.hookSpecificOutput.permissionDecision, 'deny');
  assert.deepEqual(recorded, []);
  fire({ hook_event_name: 'Stop' });
  assert.equal(recorded.length, 1, 'but the same agent going idle still records');
  control.resume('jim-1');
  // A digest that throws never reaches the hook's own answer.
  const fakeHive = { sockPath: () => null, recordSession() {}, isGod: () => false, rosterContext: () => null };
  const exploding = new HookServer(
    fakeHive, () => null, () => ({ notifications: false }), undefined, undefined, undefined, undefined,
    { record: () => { throw new Error('boom'); } }
  );
  assert.deepEqual(exploding.handle({ agent_id: 'jim-1', hook_event_name: 'Stop' }), {});
});

test('a routed message is the sender\'s outbox line; a person\'s dispatch is nobody\'s', async (t) => {
  const { hive, recorded } = await floor(t);
  hive.setActivitySink((agentId, entry) => recorded.push({ agentId, entry }));
  hive.send({ to: 'pam-1', act: 'REQUEST', subject: 'Review relay.ts', body: 'please' }, 'jim-1');
  hive.send({ to: 'jim-1', act: 'REQUEST', subject: 'Human dispatch', body: 'go' }, 'human');
  hive.send({ to: 'jim-1', act: 'INFORM', subject: 'System mail', body: 'x' }, 'system');
  hive.send({ to: 'jim-1', act: 'INFORM', subject: 'Ghost mail', body: 'x' }, 'nobody-9');
  hive.send({ to: 'broadcast', act: 'INFORM', subject: 'To all', body: 'x' }, 'pam-1');
  assert.deepEqual(recorded.map((r) => [r.agentId, r.entry.kind, r.entry.text]), [
    ['jim-1', 'message', 'Review relay.ts'],
    ['pam-1', 'message', 'To all']
  ]);
  assert.ok(recorded.every((r) => Number.isFinite(r.entry.ts)));
  // A teammate on another machine is still mail that left the agent.
  recorded.length = 0;
  hive.setRemote({ send: () => {} });
  hive.send({ to: 'member:abc', act: 'INFORM', subject: 'Across the wire', body: 'x' }, 'jim-1');
  assert.deepEqual(recorded.map((r) => [r.agentId, r.entry.text]), [['jim-1', 'Across the wire']]);
  hive.setActivitySink(null);
  hive.send({ to: 'pam-1', act: 'INFORM', subject: 'Unheard', body: 'x' }, 'jim-1');
  assert.equal(recorded.length, 1, 'no sink, no record, and routing still works');
});

test('the wiring: hooks.ts records through the contract once, before every gate, and emit is unchanged', () => {
  const src = strip(read('src/main/hooks.ts'));
  assert.match(src, /import \{ entryForHookEvent \} from '\.\.\/shared\/activity';/);
  assert.equal(src.match(/this\.digest\(agentId, event, p\);/g).length, 1, 'exactly one record site');
  const site = src.indexOf('this.digest(agentId, event, p);');
  assert.ok(site > src.indexOf("if (event === 'Status')"), 'after the status tick early return');
  assert.ok(site < src.indexOf('this.control?.shouldHalt(agentId)'), 'before the HALT gate');
  assert.ok(site < src.indexOf("event === 'CostSample'"), 'before the cost sample early return');
  assert.match(src, /entryForHookEvent\(event, \{\s*tool: p\.tool_name,\s*toolInput: p\.tool_input,\s*message: p\.message,\s*notificationType: p\.notification_type,\s*source: p\.source\s*\}, Date\.now\(\)\)/);
  assert.match(src, /if \(entry\) this\.activity\.record\(agentId, entry\);/);
  assert.match(src, /private activity\?: Pick<ActivityDigest, 'record'>/);
  const emit = src.slice(src.indexOf('private emit(agentId'), src.indexOf("send('hive:hookEvent'"));
  assert.ok(!/tool_input|toolInput|activity|digest/.test(emit), 'emit still sends the trimmed HookEvent and no tool input');
  assert.match(emit, /tool: p\.tool_name,\s*notificationType: p\.notification_type,\s*source: p\.source,\s*message: p\.message,\s*blocked/);
});

test('the wiring: the router records for the sender, main registers the handler, the preload names match, teardown forgets', () => {
  const hive = strip(read('src/main/hive.ts'));
  assert.match(hive, /import \{ entryForMessage, type ActivityEntry \} from '\.\.\/shared\/activity';/);
  assert.match(hive, /this\.appendLog\(\{ kind: 'message', from: msg\.from,[^\n]*\n\s*this\.noteOutbox\(msg, reg\);/, 'recorded where the message is logged as routed');
  const note = hive.slice(hive.indexOf('private noteOutbox('), hive.indexOf('private emitMessage('));
  assert.match(note, /msg\.from === 'human' \|\| msg\.from === 'system' \|\| !reg\.agents\[msg\.from\]/);
  assert.match(note, /entryForMessage\(msg\.subject,/);
  assert.match(note, /this\.activitySink\(msg\.from, entry\)/);
  assert.match(hive, /setActivitySink\(cb: \(\(agentId: string, entry: ActivityEntry\) => void\) \| null\): void/);

  const main = strip(read('src/main/index.ts'));
  assert.match(main, /import \{ ActivityDigest \} from '\.\/activityDigest';/);
  assert.match(main, /const activity = new ActivityDigest\(\(\) => liveWebContents\(\)\);/);
  assert.match(main, /hive\.setActivitySink\(\(agentId, entry\) => activity\.record\(agentId, entry\)\);/);
  const ctor = main.slice(main.indexOf('const hookServer = new HookServer('), main.indexOf('const memory = new MemoryManager('));
  assert.match(ctor, /workerWake\.noteHook\(agentId, event, message, undefined, tool\),\s*activity\s*\)/, 'the digest is the HookServer\'s last argument');
  const handler = main.slice(main.indexOf("ipcMain.handle('hive:agentActivity'"));
  assert.match(handler, /^ipcMain\.handle\('hive:agentActivity', \(_evt, agentId: unknown, limit: unknown\) => \{\s*if \(typeof agentId !== 'string' \|\| !agentId\.trim\(\)\) return \[\];/);
  assert.match(handler, /typeof limit === 'number' && Number\.isInteger\(limit\) && limit > 0 \? limit : ACTIVITY_RING/);
  assert.match(handler, /return activity\.list\(agentId, n\);/);
  assert.ok(main.indexOf("ipcMain.handle('hive:agentActivity'") > main.indexOf("ipcMain.handle('hive:messages'"), 'registered beside the other hive readers');
  const teardown = main.slice(main.indexOf("function teardownPty(id: string, reason: TeardownReason): void {"), main.indexOf('syncKeepAwake();', main.indexOf("function teardownPty(id: string, reason: TeardownReason): void {")));
  assert.match(teardown, /telemetry\.forgetAgent\(agentId\);[\s\S]{0,120}?try \{ activity\.forget\(agentId\); \}/, 'the ring goes where the usage counter goes');

  const preload = strip(read('src/preload/index.ts'));
  assert.match(preload, /agentActivity: \(agentId: string, limit\?: number\): Promise<ActivityEntry\[\]> =>\s*ipcRenderer\.invoke\('hive:agentActivity', agentId, limit \?\? 200\)/);
  assert.match(preload, /ipcRenderer\.on\('hive:agentActivity', listener\)/);
  assert.match(strip(read('src/main/activityDigest.ts')), /send\('hive:agentActivity', push\)/, 'the push and the invoke share the one name');
  assert.equal(A.ACTIVITY_RING, 200, 'the preload default and the ring agree');
});
