'use strict';

/*
 * hive/policy/guardrail.json, as the engine reads it. A rule is a principle with an
 * optional backstop; in this version a backstop can only log: it is evaluated and a
 * match is recorded, never applied.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { GUARDRAIL_FILE, toEngineRules, validateGuardrail, readGuardrail } = loadTs('src/main/guardrail.ts');
const { PolicyEngine } = loadTs('src/main/policy.ts');

function home(t) {
  const h = fs.mkdtempSync(path.join(os.tmpdir(), 'md-guardrail-'));
  t.after(() => fs.rmSync(h, { recursive: true, force: true }));
  fs.mkdirSync(path.join(h, 'hive', 'policy'), { recursive: true });
  return h;
}
const put = (h, v) => fs.writeFileSync(path.join(h, 'hive', 'policy', GUARDRAIL_FILE), typeof v === 'string' ? v : JSON.stringify(v));
const pre = (command, agent_id = 'jim') => ({ hook_event_name: 'PreToolUse', agent_id, tool_name: 'Bash', tool_input: { command }, cwd: '/r' });
function engine(h, rows = []) {
  const e = new PolicyEngine(path.join(h, 'hive'), (r) => rows.push(r));
  e.load();
  return e;
}
const logRule = (id, match, extra = {}) => ({ id, principle: `Principle ${id}.`, agents: 'all', backstop: { on: true, does: 'log', match }, ...extra });

test('a log backstop records a match and lets the call run; the row names the rule', (t) => {
  const h = home(t);
  put(h, { version: 1, rev: 1, rules: [logRule('no-ls', { tool: 'Bash', command_matches: '^ls' })] });
  const rows = [];
  const e = engine(h, rows);
  const v = e.evaluate(pre('ls -la'));
  assert.deepEqual([v.ruleId, v.matchedOn], ['no-ls', 'command_matches']);
  assert.equal(v.reason, 'Principle no-ls.', 'with no message, the principle is the reason');
  const row = rows.find((r) => r.kind === 'policy-match');
  assert.deepEqual([row.rule_id, row.matched_on], ['no-ls', 'command_matches']);
  assert.equal(e.evaluate(pre('pwd')).ruleId, undefined);
});

test('block and ask are not available yet: the file is refused, and says why', (t) => {
  for (const does of ['block', 'ask']) {
    const h = home(t);
    put(h, { version: 1, rev: 1, rules: [{ id: 'x', principle: 'p', agents: 'all', backstop: { on: true, does, match: { tool: 'Bash' } } }] });
    const e = engine(h);
    assert.equal(e.status.rulesLoaded, 0, does);
    assert.match(e.status.error, /x: backstop\.does must be log/);
  }
});

test('a backstop that is off, or for other agents, does not fire; principle-only rules never do', (t) => {
  const h = home(t);
  put(h, { version: 1, rev: 1, rules: [
    { id: 'off', principle: 'x', agents: 'all', backstop: { on: false, does: 'log', match: { tool: 'Bash', command_matches: '^ls' } } },
    { id: 'pam-only', principle: 'y', agents: ['pam'], backstop: { on: true, does: 'log', match: { tool: 'Bash', command_matches: '^cat' } } },
    { id: 'text', principle: 'Be kind.', agents: 'all' },
  ] });
  const e = engine(h);
  assert.equal(e.evaluate(pre('ls')).ruleId, undefined);
  assert.equal(e.evaluate(pre('cat f', 'jim')).ruleId, undefined);
  assert.equal(e.evaluate(pre('cat f', 'pam')).ruleId, 'pam-only');
  assert.deepEqual(e.status.ruleIds, ['pam-only']);
});

test('no backstops on, or no rules at all, loads cleanly as nothing checked', (t) => {
  const h = home(t);
  put(h, { version: 1, rev: 1, rules: [{ id: 'text', principle: 'Be kind.', agents: 'all' }] });
  let e = engine(h);
  assert.deepEqual([e.status.configured, e.status.error, e.status.rulesLoaded], [true, null, 0]);
  put(h, { version: 1, rev: 1, rules: [] });
  e = engine(h);
  assert.deepEqual([e.status.configured, e.status.error, e.status.rulesLoaded], [true, null, 0], 'deleting every rule is not a broken file');
});

test('validation names the rule and the field', () => {
  const bad = (rules, re) => assert.match(validateGuardrail({ version: 1, rev: 1, rules }).join('; '), re);
  bad([{ id: 'a', principle: '', agents: 'all' }], /a: principle/);
  bad([{ id: 'a', principle: 'p', agents: 'all' }, { id: 'a', principle: 'q', agents: 'all' }], /a: duplicate id/);
  bad([{ id: 'a', principle: 'p', agents: 'some' }], /a: agents/);
  bad([{ id: 'a', principle: 'p', agents: 'all', backstop: { on: true, does: 'nuke', match: { tool: 'Bash' } } }], /a: backstop\.does/);
  bad([{ id: 'a', principle: 'p', agents: 'all', backstop: { on: true, does: 'log', match: { nope: 1 } } }], /a: unknown matcher/);
  bad([{ id: 'a', principle: 'p', agents: 'all', backstop: { on: true, does: 'log', match: {} } }], /a: backstop\.match is empty/);
  bad([{ id: 'a', principle: 'p', agents: 'all', backstop: { on: 'yes', does: 'log', match: { tool: 'Bash' } } }], /a: backstop\.on/);
  assert.deepEqual(validateGuardrail({ version: 1, rev: 1, rules: [{ id: 'a', principle: 'p', agents: 'all' }] }), []);
  assert.match(validateGuardrail([]).join(''), /object/);
  assert.match(validateGuardrail({ version: 2, rev: 1, rules: [] }).join(''), /version must be 1/);
});

test('toEngineRules: the backstops that are on, the message as the reason, agents carried over', () => {
  const r = toEngineRules({ version: 1, rev: 1, rules: [
    { id: 'b', principle: 'P', agents: ['pam'], backstop: { on: true, does: 'log', match: { tool: 'Bash' } } },
    { id: 'l', principle: 'P', agents: 'all', backstop: { on: true, does: 'log', match: { tool: 'Bash' }, message: 'M', on_error: 'deny' } },
    { id: 'off', principle: 'P', agents: 'all', backstop: { on: false, does: 'log', match: { tool: 'Bash' } } },
  ] });
  assert.deepEqual(r.map((x) => [x.id, x.reason, x.agents, x.on_error]), [
    ['b', 'P', ['pam'], undefined],
    ['l', 'M', undefined, 'deny'],
  ]);
});

test('readGuardrail never throws: a broken file is an error string', (t) => {
  const h = home(t);
  const f = path.join(h, 'hive', 'policy', GUARDRAIL_FILE);
  put(h, '{ nope');
  assert.equal(readGuardrail(f).ok, false);
  assert.equal(readGuardrail(path.join(h, 'missing.json')).ok, false);
  put(h, { version: 1, rev: 0, rules: [] });
  assert.equal(readGuardrail(f).ok, true);
});

test('a reload resets the defaults, so an old on_error does not stick', (t) => {
  const h = home(t);
  put(h, { version: 1, rev: 1, defaults: { on_error: 'deny' }, rules: [{ id: 'p', principle: 'x', agents: 'all' }] });
  const e = engine(h);
  assert.equal(e.defaults.on_error, 'deny');
  put(h, { version: 1, rev: 2, rules: [{ id: 'p', principle: 'x', agents: 'all' }] });
  e.load();
  assert.equal(e.defaults.on_error, 'allow');
});
