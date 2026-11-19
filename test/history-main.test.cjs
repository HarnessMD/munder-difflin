'use strict';

// HISTORY, main side: hive:history gives one bounded page of an agent's conversation, read from
// its CLI's own transcript (Claude Code, Codex, Antigravity). The window names an agent id, never
// a path; a path is used only where it resolves, links followed, inside that engine's own store; a
// Codex agent with a session id is only ever shown that session's rollout; a miss is looked up
// again after 3 s.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const H = loadTs('src/shared/history.ts');
const N = loadTs('src/main/historyNormalize.ts');
const T = loadTs('src/main/historyTail.ts');
const S = loadTs('src/main/historyService.ts');
const TR = loadTs('src/main/transcript.ts');

const tmp = () => fs.mkdtempSync(path.join(os.tmpdir(), 'hist-'));
const line = (o) => JSON.stringify(o) + '\n';
const claudeUser = (text, extra = {}) => line({ type: 'user', timestamp: '2026-10-01T10:00:00Z', message: { content: text }, ...extra });
const claudeSays = (text) => line({ type: 'assistant', timestamp: '2026-10-01T10:00:01Z', message: { content: [{ type: 'text', text }] } });

// Each test that needs a home sets one; claudeProjectRoots and projectDir read it per call.
function withHome(fn) {
  const home = tmp();
  const was = { HOME: process.env.HOME, CLAUDE_CONFIG_DIR: process.env.CLAUDE_CONFIG_DIR };
  process.env.HOME = home;
  delete process.env.CLAUDE_CONFIG_DIR;
  try { return fn(home); } finally {
    process.env.HOME = was.HOME;
    if (was.CLAUDE_CONFIG_DIR === undefined) delete process.env.CLAUDE_CONFIG_DIR; else process.env.CLAUDE_CONFIG_DIR = was.CLAUDE_CONFIG_DIR;
    fs.rmSync(home, { recursive: true, force: true });
  }
}

function service(agents, { hooks = {}, codexHome = () => null, gemini = '/nonexistent', now } = {}) {
  return new S.HistoryService({
    agent: (id) => agents[id] ?? null,
    transcriptPath: (id) => hooks[id],
    codexHomeFor: codexHome,
    geminiHome: () => gemini
  }, {}, now);
}

function write(file, text) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

// ─── normalising ────────────────────────────────────────────────────────────

test('Claude lines: what was typed and said; injected context, tool output and thinking never shown', () => {
  const one = (o) => N.normalizeLine('claude', JSON.stringify(o), 7);
  const u = one({ type: 'user', timestamp: '2026-10-01T10:00:00Z', message: { content: 'fix it <system-reminder>secret</system-reminder>' } });
  assert.deepEqual(u, [{ id: '7.0', kind: 'user', at: Date.parse('2026-10-01T10:00:00Z'), text: 'fix it', offset: 7 }]);
  assert.deepEqual(one({ type: 'user', message: { content: '<system-reminder>only this</system-reminder>' } }), []);
  assert.deepEqual(one({ type: 'user', message: { content: '<command-name>/compact</command-name><command-args/>' } }).map((i) => [i.kind, i.text]), [['system', '/compact']]);
  assert.deepEqual(one({ type: 'user', message: { content: '<local-command-stdout>done</local-command-stdout>' } }), []);
  assert.deepEqual(one({ type: 'user', message: { content: [{ type: 'tool_result', content: 'file body' }] } }), []);
  for (const flag of ['isSidechain', 'isMeta', 'isCompactSummary']) {
    assert.deepEqual(one({ type: 'user', [flag]: true, message: { content: 'hidden' } }), [], flag);
  }
  const a = one({ type: 'assistant', message: { content: [
    { type: 'thinking', thinking: 'private' },
    { type: 'text', text: 'Reading it.' },
    { type: 'tool_use', name: 'Read', input: { file_path: '/repo/a.ts' } }
  ] } });
  assert.deepEqual(a.map((i) => [i.id, i.kind]), [['7.0', 'assistant'], ['7.1', 'tool']]);
  assert.match(a[1].text, /^Read/);
  assert.ok(!a.some((i) => /private/.test(i.text)));
  assert.deepEqual(one({ type: 'system', subtype: 'compact_boundary' }).map((i) => i.kind), ['system']);
  assert.deepEqual(one({ type: 'summary', summary: 'x' }), []);
  assert.equal(one({ type: 'user', message: { content: 'x' } })[0].at, null, 'no timestamp is null');
});

test('a long message is cut to its cap and marked; a tool call is one line; a malformed line yields nothing', () => {
  const long = N.normalizeLine('claude', JSON.stringify({ type: 'user', message: { content: 'w'.repeat(H.HISTORY_TEXT_MAX + 50) } }), 0)[0];
  assert.equal(long.truncated, true);
  assert.ok(long.text.length <= H.HISTORY_TEXT_MAX + 2);
  const short = N.normalizeLine('claude', JSON.stringify({ type: 'user', message: { content: 'short' } }), 0)[0];
  assert.equal('truncated' in short, false);
  const tool = N.normalizeLine('claude', JSON.stringify({ type: 'assistant', message: { content: [{ type: 'tool_use', name: 'Bash', input: { command: 'a\n\n  b'.repeat(200) } }] } }), 0)[0];
  assert.equal(tool.kind, 'tool');
  assert.ok(!/\n/.test(tool.text));
  assert.ok(tool.text.length <= H.HISTORY_TOOL_MAX);
  for (const bad of ['', '{', 'null', '[1]', '"text"']) assert.deepEqual(N.normalizeLine('claude', bad, 0), [], bad);
});

test('Codex lines: completed items and legacy messages; the duplicate response messages are skipped', () => {
  const one = (o) => N.normalizeLine('codex', JSON.stringify(o), 3).map((i) => [i.kind, i.text]);
  const done = (item) => ({ type: 'event_msg', payload: { type: 'item_completed', item } });
  assert.deepEqual(one(done({ type: 'UserMessage', content: [{ text: 'hi' }, { text: 'there' }] })), [['user', 'hi\nthere']]);
  assert.deepEqual(one(done({ type: 'AgentMessage', content: 'ok' })), [['assistant', 'ok']]);
  assert.deepEqual(one(done({ type: 'CommandExecution', command: ['bash', '-lc', 'npm test'], exit_code: 1 })), [['tool', 'shell: npm test (exit 1)']]);
  assert.deepEqual(one(done({ type: 'CommandExecution', parsed_cmd: [{ cmd: 'ls' }, { cmd: 'pwd' }], exit_code: 0 })), [['tool', 'shell: ls ; pwd']]);
  assert.deepEqual(one(done({ type: 'FileChange', changes: { 'a.ts': {}, 'b.ts': {} } })), [['tool', 'edit: a.ts, b.ts']]);
  assert.deepEqual(one(done({ type: 'Reasoning', content: 'private' })), []);
  assert.deepEqual(one({ type: 'event_msg', payload: { type: 'user_message', message: 'old style' } }), [['user', 'old style']]);
  assert.deepEqual(one({ type: 'response_item', payload: { type: 'message', role: 'developer', content: 'injected' } }), []);
  assert.equal(one({ type: 'response_item', payload: { type: 'function_call', name: 'shell', arguments: '{}' } })[0][0], 'tool');
  assert.deepEqual(one({ type: 'session_meta', payload: { id: 'x' } }), []);
});

test('Antigravity lines: the user request only, the reply, tool calls; tool output not shown', () => {
  const one = (o) => N.normalizeLine('antigravity', JSON.stringify(o), 0).map((i) => [i.kind, i.text]);
  assert.deepEqual(one({ type: 'USER_INPUT', content: '<ADDITIONAL_METADATA>m</ADDITIONAL_METADATA><USER_REQUEST>do X</USER_REQUEST>' }), [['user', 'do X']]);
  assert.deepEqual(one({ type: 'USER_INPUT', content: 'plain <ADDITIONAL_METADATA>m</ADDITIONAL_METADATA>' }), [['user', 'plain']]);
  const r = one({ type: 'PLANNER_RESPONSE', content: 'Sure.', tool_calls: [{ name: 'view_file', args: { path: 'a' } }] });
  assert.deepEqual(r.map((x) => x[0]), ['assistant', 'tool']);
  assert.deepEqual(one({ type: 'GENERIC', content: 'tool output' }), []);
});

// ─── reading a page ─────────────────────────────────────────────────────────

test('reading back: whole lines only, newest last; an unfinished last line is never returned', () => {
  const dir = tmp();
  try {
    const f = write(path.join(dir, 't.jsonl'), 'one\ntwo\nthree\nhalf-writ');
    for (const chunk of [1, 3, 64 * 1024]) {
      const res = T.readLinesBackward(f, null, () => false, { chunk });
      assert.deepEqual(res.lines.map((l) => [l.offset, l.text]), [[0, 'one'], [4, 'two'], [8, 'three']], `chunk ${chunk}`);
      assert.equal(res.start, 0);
      assert.equal(res.end, 14, 'the window ends before the fragment');
    }
    const older = T.readLinesBackward(f, 8, () => false, {});
    assert.deepEqual(older.lines.map((l) => l.text), ['one', 'two'], 'before a line start: only older lines');
    const enough = T.readLinesBackward(f, null, (ls) => ls.length >= 2, {});
    assert.deepEqual(enough.lines.map((l) => l.text), ['two', 'three']);
    assert.equal(enough.start, 4, 'stops at the boundary of the oldest line it kept');
    const fwd = T.readLinesForward(f, 4, {});
    assert.deepEqual(fwd.lines.map((l) => l.text), ['two', 'three'], 'following: the fragment waits for its newline');
    assert.equal(fwd.end, 14);
    const none = T.readLinesForward(f, fs.statSync(f).size, {});
    assert.deepEqual([none.lines.length, none.bytesRead], [0, 0], 'no growth costs no read');
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

test('a line too long to hold is skipped, and paging across it always moves on (both ways)', () => {
  const dir = tmp();
  try {
    const f = write(path.join(dir, 't.jsonl'), 'a\n' + 'X'.repeat(1000) + '\nb\n');
    const size = fs.statSync(f).size;
    const whole = T.readLinesBackward(f, null, () => false, { maxLine: 50, chunk: 16 });
    assert.deepEqual([whole.lines.map((l) => l.text), whole.skipped], [['a', 'b'], 1], 'one long line skipped, counted');
    const wholeFwd = T.readLinesForward(f, 0, { maxLine: 50, chunk: 16 });
    assert.deepEqual([wholeFwd.lines.map((l) => l.text), wholeFwd.skipped], [['a', 'b'], 1]);
    const limits = { budget: 100, maxLine: 50, skipMax: 100, chunk: 16 };
    const back = [];
    let from = null;
    let prev = Infinity;
    for (let i = 0; i < 50; i += 1) {
      const res = T.readLinesBackward(f, from, () => false, limits);
      back.unshift(...res.lines.map((l) => l.text));
      assert.ok(res.start < prev, `older page ${i} moved back (${res.start} < ${prev})`);
      prev = res.start;
      if (res.start === 0) break;
      from = res.start;
    }
    assert.equal(prev, 0, 'reached the start');
    assert.deepEqual(back, ['a', 'b']);

    const fwd = [];
    let after = 0;
    for (let i = 0; i < 50 && after < size; i += 1) {
      const res = T.readLinesForward(f, after, limits);
      fwd.push(...res.lines.map((l) => l.text));
      assert.ok(res.end > after, `follow ${i} moved on`);
      after = res.end;
    }
    assert.equal(after, size);
    assert.deepEqual(fwd, ['a', 'b']);
  } finally { fs.rmSync(dir, { recursive: true, force: true }); }
});

// ─── finding the file ───────────────────────────────────────────────────────

test('a bad request or an unknown agent is a reason, never an error; the engine must be one it reads', () => {
  const asked = [];
  const s = new S.HistoryService({
    agent: (id) => { asked.push(id); return ({ a1: { provider: 'claude' }, w1: { provider: 'gemini-old' } })[id] ?? { provider: 'claude' }; },
    transcriptPath: () => undefined,
    codexHomeFor: () => null,
    geminiHome: () => '/nonexistent'
  });
  for (const req of [null, undefined, 'a1', {}, { agentId: 5 }, { agentId: '../a1' }, { agentId: 'a/1' }, { agentId: '' }, { agentId: 'x'.repeat(129) }]) {
    assert.deepEqual(s.page(req), { ok: false, reason: 'no-agent' }, JSON.stringify(req));
  }
  assert.deepEqual(asked, [], 'a malformed id never reaches the registry');
  assert.deepEqual(service({}).page({ agentId: 'ghost' }), { ok: false, reason: 'no-agent' });
  assert.deepEqual(s.page({ agentId: 'w1' }), { ok: false, reason: 'unsupported-provider' });
  withHome(() => assert.deepEqual(s.page({ agentId: 'a1' }), { ok: false, reason: 'no-transcript' }, 'no provider means Claude'));
});

test('Claude: the hook path or the session file, only inside the projects folder (links followed)', () => withHome((home) => {
  const projects = path.join(home, '.claude', 'projects');
  const good = write(path.join(projects, 'k', 's1.jsonl'), claudeUser('from the hook'));
  const outside = write(path.join(home, 'elsewhere', 's1.jsonl'), claudeUser('not ours'));
  const link = path.join(projects, 'k', 'link.jsonl');
  fs.symlinkSync(outside, link);
  const notJsonl = write(path.join(projects, 'k', 'notes.txt'), claudeUser('x'));

  const page = (hook) => service({ a1: { provider: 'claude' } }, { hooks: { a1: hook } }).page({ agentId: 'a1' });
  const ok = page(good);
  assert.equal(ok.ok, true);
  assert.deepEqual(ok.items.map((i) => i.text), ['from the hook']);
  assert.equal(ok.fileName, 's1.jsonl', 'the name only, never the path');
  assert.ok(!JSON.stringify(ok).includes(home), 'no part of the page carries the path');
  assert.match(ok.fileId, /^[0-9a-f]{12}$/);
  for (const hook of [outside, link, notJsonl, path.join(projects, 'k', '..', '..', '..', 'elsewhere', 's1.jsonl')]) {
    assert.deepEqual(page(hook), { ok: false, reason: 'no-transcript' }, hook);
  }

  const cwd = path.join(home, 'repo');
  const byId = write(path.join(TR.projectDir(cwd), 'sess-2.jsonl'), claudeUser('from the session id'));
  assert.ok(byId.startsWith(projects));
  const s = service({ a2: { provider: 'claude', cwd, sessionId: 'sess-2' } });
  assert.deepEqual(s.page({ agentId: 'a2' }).items.map((i) => i.text), ['from the session id']);
  for (const agent of [{ provider: 'claude', cwd, sessionId: '../sess-2' }, { provider: 'claude', cwd: 'repo', sessionId: 'sess-2' }]) {
    assert.deepEqual(service({ a3: agent }).page({ agentId: 'a3' }), { ok: false, reason: 'no-transcript' }, JSON.stringify(agent));
  }

  const cfg = path.join(home, 'alt-config');
  const inCfg = write(path.join(cfg, 'projects', 'k', 's9.jsonl'), claudeUser('from CLAUDE_CONFIG_DIR'));
  assert.equal(page(inCfg).ok, false, 'not a root until CLAUDE_CONFIG_DIR names it');
  process.env.CLAUDE_CONFIG_DIR = cfg;
  assert.deepEqual(page(inCfg).items.map((i) => i.text), ['from CLAUDE_CONFIG_DIR']);
}));

test('Codex: with a session id only that rollout, never a newer one; the newest only for an agent with none', () => {
  const home = tmp();
  try {
    const sid = '0199aaaa-bbbb-cccc-dddd-eeeeffff0001';
    const other = '0199aaaa-bbbb-cccc-dddd-eeeeffff0002';
    const codexLine = (t) => line({ type: 'event_msg', payload: { type: 'user_message', message: t } });
    const mine = write(path.join(home, 'sessions', '2026', '10', '01', `rollout-2026-10-01T10-00-00-${sid}.jsonl`), codexLine('mine'));
    const newer = write(path.join(home, 'sessions', '2026', '10', '02', `rollout-2026-10-02T10-00-00-${other}.jsonl`), codexLine('newer'));
    const t0 = Date.now() / 1000;
    fs.utimesSync(mine, t0 - 100, t0 - 100);
    fs.utimesSync(newer, t0, t0);
    const s = (agent, hooks = {}) => service({ c1: agent }, { hooks, codexHome: (id) => (id === 'c1' ? home : null) }).page({ agentId: 'c1' });

    assert.deepEqual(s({ provider: 'codex', sessionId: sid }).items.map((i) => i.text), ['mine']);
    const missing = '0199aaaa-bbbb-cccc-dddd-eeeeffff0003';
    assert.deepEqual(s({ provider: 'codex', sessionId: missing }), { ok: false, reason: 'no-transcript' }, 'a missing rollout is a miss, not the newest');
    assert.deepEqual(s({ provider: 'codex' }).items.map((i) => i.text), ['newer'], 'no session id: the newest is the guess');
    assert.deepEqual(s({ provider: 'codex', sessionId: sid }, { c1: newer }).items.map((i) => i.text), ['newer'], 'the hook path wins when it is inside');

    const away = tmp();
    try {
      const stray = write(path.join(away, 'rollout-x.jsonl'), codexLine('stray'));
      assert.deepEqual(s({ provider: 'codex', sessionId: sid }, { c1: stray }).items.map((i) => i.text), ['mine'], 'a hook path outside the home is not used');
      fs.symlinkSync(stray, path.join(home, 'sessions', '2026', '10', '01', `rollout-link-${missing}.jsonl`));
      assert.deepEqual(s({ provider: 'codex', sessionId: missing }), { ok: false, reason: 'no-transcript' }, 'a link out of the home is refused');
    } finally { fs.rmSync(away, { recursive: true, force: true }); }

    assert.deepEqual(service({ c2: { provider: 'codex', sessionId: sid } }, { codexHome: () => null }).page({ agentId: 'c2' }), { ok: false, reason: 'no-transcript' }, 'no CODEX_HOME, nothing read');
    assert.equal(S.findCodexRollout(home, 'short'), null, 'a session id that is not one is never searched for');
    assert.deepEqual(S.codexRoots(home), [home, path.join(home, 'sessions'), path.join(home, 'archived_sessions')]);
  } finally { fs.rmSync(home, { recursive: true, force: true }); }
});

test('Antigravity: the brain transcript by hook or conversation id, only inside the brain folder', () => {
  const gemini = tmp();
  try {
    const brain = path.join(gemini, 'antigravity-cli', 'brain');
    const agyLine = (t) => line({ type: 'USER_INPUT', content: t });
    const f = write(path.join(brain, 'conv1', '.system_generated', 'logs', 'transcript.jsonl'), agyLine('agy'));
    const odd = write(path.join(brain, 'conv1', 'other.jsonl'), agyLine('odd'));
    const s = (agent, hooks = {}) => service({ g1: agent }, { hooks, gemini }).page({ agentId: 'g1' });
    assert.deepEqual(s({ provider: 'antigravity', sessionId: 'conv1' }).items.map((i) => i.text), ['agy']);
    assert.deepEqual(s({ provider: 'antigravity' }, { g1: f }).items.map((i) => i.text), ['agy']);
    assert.deepEqual(s({ provider: 'antigravity' }, { g1: odd }), { ok: false, reason: 'no-transcript' }, 'only a transcript.jsonl hook path');
    assert.deepEqual(s({ provider: 'antigravity', sessionId: 'nope' }), { ok: false, reason: 'no-transcript' });
  } finally { fs.rmSync(gemini, { recursive: true, force: true }); }
});

test('a miss is kept for 3 s then looked up again; a found file is kept until it goes or the session changes', () => withHome((home) => {
  assert.equal(S.HISTORY_MISS_MS, 3000);
  let now = 1000;
  const agents = { a1: { provider: 'claude', cwd: path.join(home, 'repo'), sessionId: 's1' } };
  const s = service(agents, { now: () => now });
  assert.deepEqual(s.page({ agentId: 'a1' }), { ok: false, reason: 'no-transcript' });
  const dir = TR.projectDir(agents.a1.cwd);
  write(path.join(dir, 's1.jsonl'), claudeUser('first'));
  now += 2999;
  assert.deepEqual(s.page({ agentId: 'a1' }), { ok: false, reason: 'no-transcript' }, 'within 3 s the miss stands');
  now += 2;
  assert.deepEqual(s.page({ agentId: 'a1' }).items.map((i) => i.text), ['first'], 'after 3 s it is looked up again');

  write(path.join(dir, 's2.jsonl'), claudeUser('second'));
  agents.a1 = { ...agents.a1, sessionId: 's2' };
  assert.deepEqual(s.page({ agentId: 'a1' }).items.map((i) => i.text), ['second'], 'a new session id is a new lookup at once');
  fs.rmSync(path.join(dir, 's2.jsonl'));
  assert.deepEqual(s.page({ agentId: 'a1' }), { ok: false, reason: 'no-transcript' }, 'a file that went is not served from the cache');
  s.forget('a1');
}));

test('pages: newest first page, older pages by cursor, following new lines, a shrunk file asks for a reload', () => withHome((home) => {
  const f = path.join(home, '.claude', 'projects', 'k', 's.jsonl');
  let text = '';
  for (let i = 0; i < 500; i += 1) text += claudeUser(`m${i}`);
  write(f, text);
  const s = service({ a1: { provider: 'claude' } }, { hooks: { a1: f } });

  const first = s.page({ agentId: 'a1' });
  assert.equal(first.items.length, H.HISTORY_PAGE_DEFAULT);
  assert.equal(first.items.at(-1).text, 'm499', 'newest last');
  assert.equal(first.end, first.size);
  assert.equal(first.atStart, false);
  const older = s.page({ agentId: 'a1', before: first.start, limit: 10 });
  assert.deepEqual(older.items.map((i) => i.text), Array.from({ length: 10 }, (_, k) => `m${340 + k}`));
  assert.equal(older.end, first.start, 'the older page ends where the newer began');
  assert.equal(s.page({ agentId: 'a1', limit: 10000 }).items.length, H.HISTORY_PAGE_MAX, 'the limit is capped');
  assert.equal(s.page({ agentId: 'a1', limit: 0 }).items.length, 1);
  assert.equal(s.page({ agentId: 'a1', limit: -5, before: 'x' }).items.length, 1);
  assert.equal(s.page({ agentId: 'a1', limit: 'all' }).items.length, H.HISTORY_PAGE_DEFAULT, 'not a number: the default');
  const all = s.page({ agentId: 'a1', limit: 400, before: s.page({ agentId: 'a1', limit: 400 }).start });
  assert.equal(all.atStart, true);
  assert.equal(all.items[0].text, 'm0');

  fs.appendFileSync(f, claudeUser('new one') + '{"type":"user","mess');
  const next = s.page({ agentId: 'a1', after: first.end });
  assert.deepEqual(next.items.map((i) => i.text), ['new one'], 'a half written line waits');
  assert.equal(s.page({ agentId: 'a1', after: next.end }).items.length, 0);
  fs.writeFileSync(f, claudeUser('replaced'));
  const reset = s.page({ agentId: 'a1', after: next.end });
  assert.deepEqual([reset.ok, reset.reset, reset.items.length], [true, true, 0]);
}));

test('a file that cannot be opened is "unreadable", not a crash', { skip: process.getuid && process.getuid() === 0 }, () => withHome((home) => {
  const f = write(path.join(home, '.claude', 'projects', 'k', 's.jsonl'), claudeUser('x'));
  fs.chmodSync(f, 0o000);
  try {
    assert.deepEqual(service({ a1: { provider: 'claude' } }, { hooks: { a1: f } }).page({ agentId: 'a1' }), { ok: false, reason: 'unreadable' });
  } finally { fs.chmodSync(f, 0o644); }
}));

// ─── wiring ─────────────────────────────────────────────────────────────────

test('wiring: hive:history takes an agent id, main finds the file; the window never names a path', () => {
  const idx = read('src/main/index.ts');
  assert.match(idx, /ipcMain\.handle\('hive:history', \(_evt, req: unknown\) => historyService\.page\(req\)\)/);
  assert.match(idx, /agent: \(id\) => \{\s*const a = hive\.registry\(\)\.agents\[id\];\s*return a \? \{ provider: a\.provider, cwd: a\.cwd, sessionId: a\.sessionId \} : null;/);
  assert.match(idx, /transcriptPath: \(id\) => hookServer\.transcriptPath\(id\)/);
  assert.match(idx, /codexHomeFor: \(id\) => hive\.codexHomeOf\(id\)/);
  assert.equal((idx.match(/'hive:history'/g) || []).length, 1);

  const pre = read('src/preload/index.ts');
  assert.match(pre, /hiveHistory: \(req: HistoryRequest\): Promise<HistoryPage> => ipcRenderer\.invoke\('hive:history', req\)/);
  const reqType = /export interface HistoryRequest \{([\s\S]*?)\n\}/.exec(read('src/shared/history.ts'))[1];
  const keys = [...reqType.matchAll(/^\s*(\w+)\??:/gm)].map((m) => m[1]);
  assert.deepEqual(keys, ['agentId', 'before', 'after', 'limit'], 'nothing in the request can carry a path');

  const hive = read('src/main/hive.ts');
  const home = /codexHomeOf\(id: string\): string \| null \{([\s\S]*?)\n  \}/.exec(hive)[1];
  assert.match(home, /basename\(id\) !== id/, 'an id with a separator is no agent folder');
  assert.match(home, /id === '\.' \|\| id === '\.\.'/);
  assert.match(home, /existsSync\(home\) \? home : null/);
});
