// TSF-11 — the OpenCode usage reader, end to end.
//
// Before this file the read path had ZERO coverage: the only test touching
// opencode data (opencode-datadir.test.cjs) asserts on the SPAWN's env line and
// never opens a database. So the reader could compile, pass the suite, and still
// read a database the agent never wrote to — which is exactly what happened.
// Two things are locked down here:
//   1. the path helper resolves the hive the spawn writes into, and
//   2. the spawn and the reader provably share that helper,
//   3. the SQL actually aggregates a real session.
'use strict';

const assert = require('node:assert/strict');
const { test } = require('node:test');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { DatabaseSync } = require('node:sqlite');
const loadTs = require('./load-ts.cjs');

const { readOpencodeUsage, opencodeDbPath } = loadTs('src/main/transcript.ts');
const MAIN = fs.readFileSync(path.join(__dirname, '..', 'src', 'main', 'index.ts'), 'utf8');

const HIVE = path.join(os.tmpdir(), 'tsf11-hive');

test('the reader targets the hive the spawn writes into', () => {
  assert.equal(
    opencodeDbPath(HIVE),
    path.join(HIVE, '.opencode-data', 'opencode', 'opencode.db'),
    'must read the per-hive database, not the global one'
  );
  // The global path is what the bug actually used. It must only apply when no
  // hive is configured — otherwise every OpenCode agent reads zero forever.
  assert.equal(
    opencodeDbPath(null),
    path.join(os.homedir(), '.local', 'share', 'opencode', 'opencode.db')
  );
  assert.equal(
    opencodeDbPath('~'),
    path.join(os.homedir(), '.opencode-data', 'opencode', 'opencode.db'),
    'a ~ hive must expand like the spawn does'
  );
});

test('spawn and reader share one function, not two computations', () => {
  // The failure mode was a spawn that set XDG_DATA_HOME from its own expression
  // while the reader opened a hardcoded global path. Assert both call the helper.
  assert.ok(
    /extra\.XDG_DATA_HOME = dirname\(opencodeDbPath\(cfg\.harnessHome\)\)/.test(MAIN),
    'spawn must derive XDG_DATA_HOME from opencodeDbPath'
  );
  assert.ok(
    /resolveOpencodeDb: \(\) => opencodeDbPath\(readConfig\(\)\.harnessHome\)/.test(MAIN),
    'telemetry must read the same path'
  );
  assert.ok(
    !/join\(home, '\.opencode-data'\)/.test(MAIN),
    'the old independent XDG expression must be gone'
  );
});

/** A session_v2 / session_message pair shaped exactly like opencode's own.
 *  `sessionDir` is the agent cwd as opencode stores it (POSIX, lowercased) and
 *  is NOT the file location — the two differ whenever the DB is hive-scoped. */
function seedDb(dir, sessionDir = dir) {
  fs.mkdirSync(dir, { recursive: true });
  // Start from a clean file: leftover state in a temp dir must not decide
  // whether this suite passes.
  fs.rmSync(path.join(dir, 'opencode.db'), { force: true });
  const db = new DatabaseSync(path.join(dir, 'opencode.db'));
  db.exec(`CREATE TABLE session_v2 (id TEXT PRIMARY KEY, directory TEXT, time_updated INTEGER)`);
  db.exec(`CREATE TABLE session_message (id TEXT PRIMARY KEY, session_id TEXT, type TEXT, data TEXT, time_updated INTEGER)`);
  const msg = (session, tokens, model, ts) => db.prepare(
    `INSERT INTO session_message (id, session_id, type, data, time_updated) VALUES (?, ?, 'assistant', ?, ?)`
  ).run(`${session}-${ts}`, session, JSON.stringify({ model: { id: model }, tokens }), ts);
  db.prepare(`INSERT INTO session_v2 (id, directory, time_updated) VALUES (?, ?, ?)`)
    .run('sess-a', sessionDir.replace(/\\/g, '/').replace(/\/+$/, '').toLowerCase(), 1000);
  msg('sess-a', { input: 100, output: 20 }, 'anthropic/claude-opus-5', 2000);
  msg('sess-a', { input: 50, output: 5, cache: { read: 900, write: 7 } }, 'anthropic/claude-opus-5', 3000);
  db.close();
}

test('an agent reads its own session, not the whole directory (D11)', () => {
  const cwd = path.join(os.tmpdir(), 'tsf11-cwd');
  const root = path.join(os.tmpdir(), 'tsf11-root');
  seedDb(path.join(root, '.opencode-data', 'opencode'));
  // A second agent that ran in the SAME cwd — the shared-directory trap.
  const db = new DatabaseSync(path.join(root, '.opencode-data', 'opencode', 'opencode.db'));
  db.prepare(`INSERT INTO session_v2 (id, directory, time_updated) VALUES ('sess-b', ?, 500)`)
    .run(cwd.replace(/\\/g, '/').toLowerCase());
  db.prepare(`INSERT INTO session_message (id, session_id, type, data, time_updated) VALUES ('x','sess-b','assistant',?, 900)`)
    .run(JSON.stringify({ model: { id: 'other' }, tokens: { input: 999999, output: 1 } }));
  db.close();

  const u = readOpencodeUsage(cwd, { dbPath: path.join(root, '.opencode-data', 'opencode', 'opencode.db'), sessionId: 'sess-a' });
  assert.equal(u.inputTokens, 150, 'only the agent\'s own session, never the directory union');
  assert.equal(u.outputTokens, 25);
  assert.equal(u.cacheReadTokens, 900);
  assert.equal(u.cacheWriteTokens, 7);
  assert.equal(u.lastActiveAt, 3000, 'the real last-activity stamp — Date.now() is what hid the stall');
});

test('with no session id it takes the newest session in the directory, never the union', () => {
  const cwd = path.join(os.tmpdir(), 'tsf11-cwd2');
  const dir = path.join(os.tmpdir(), 'tsf11-root2', '.opencode-data', 'opencode');
  seedDb(dir, cwd);
  const u = readOpencodeUsage(cwd, { dbPath: path.join(dir, 'opencode.db') });
  // sess-a is the only session under this cwd, so the newest-session rule finds it.
  assert.equal(u.inputTokens, 150);
  assert.equal(u.model, 'anthropic/claude-opus-5');
});

test('a missing or unreadable database is zero, never a throw', () => {
  assert.deepEqual(readOpencodeUsage('C:/nope', { dbPath: path.join(os.tmpdir(), 'tsf11-absent.db') }).inputTokens, 0);
});