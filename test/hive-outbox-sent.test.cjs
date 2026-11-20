'use strict';

/**
 * Regression for a redelivery flood. `routeOnce` delivered a message and then renamed the outbox file into
 * `outbox/.sent/`. An agent directory whose outbox had no `.sent/` (one created outside `ensureAgent`, like an
 * MCP bridge's) made that rename throw. The catch treated it as a malformed file, the quarantine rename failed the
 * same way, and the file stayed: every router tick delivered it again (190 copies of one message on 2026-11-20).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { HiveManager } = loadTs('src/main/hive.ts');

test('an outbox without .sent is delivered once and archived', async (t) => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-outbox-sent-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'god-1', name: 'Michael', provider: 'claude', cwd: home, isGod: true });

  const outbox = path.join(hive.root(), 'agents', 'bridge', 'outbox');
  fs.mkdirSync(outbox, { recursive: true });
  const file = path.join(outbox, '1-a.json');
  fs.writeFileSync(file, JSON.stringify({ to: 'god-1', act: 'request', subject: 'fix rounds', body: 'go' }));

  hive.routeOnce();
  hive.routeOnce();

  assert.equal(hive.inbox('god-1').filter((m) => m.subject === 'fix rounds').length, 1);
  assert.equal(fs.existsSync(file), false, 'the outbox file must leave the outbox');
  assert.equal(fs.existsSync(path.join(outbox, '.sent', '1-a.json')), true);
});
