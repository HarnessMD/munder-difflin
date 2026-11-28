'use strict';

/*
 * Every hook decision passes through the shims the app installs: <hive>/bin (cth-hook.cjs,
 * the proxy bridge, the agy and Grok shims, hive-node) and each Gemini agent's own
 * gemini-hook.cjs. With a guardrail.json present no agent may change them, for the same
 * reason no agent may change the policy file. Running them, and reading them, stays
 * allowed: agents run <hive>/bin/hive-node all day.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { PolicyEngine } = loadTs('src/main/policy.ts');

function engine() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-shim-'));
  fs.mkdirSync(path.join(root, 'policy'), { recursive: true });
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  const e = new PolicyEngine(root, () => {}, () => [], () => true);
  e.loadRules({ version: 1, rules: [] });
  return { e, root };
}

const pre = (tool_name, tool_input, cwd) => ({
  hook_event_name: 'PreToolUse', agent_id: 'agent-a', tool_name, tool_input, ...(cwd ? { cwd } : {})
});

test('a Write or Edit to a hook shim is denied by policy self-protection', () => {
  const { e, root } = engine();
  const targets = [
    path.join(root, 'bin', 'cth-hook.cjs'),
    path.join(root, 'bin', 'hive-proxy.cjs'),
    path.join(root, 'bin', 'grok-hook.cjs'),
    path.join(root, 'bin', 'hive-node'),
    path.join(root, 'agents', 'gem-1', '.gemini-hive', 'gemini-hook.cjs')
  ];
  for (const file_path of targets) {
    for (const tool of ['Write', 'Edit']) {
      const v = e.evaluate(pre(tool, { file_path, content: 'process.exit(0)', old_string: 'a', new_string: 'b' }));
      assert.equal(v.decision, 'deny', `${tool} ${file_path}`);
      assert.equal(v.ruleId, 'policy-self-protection');
      assert.equal(v.matchedOn, 'hook_shim_path');
    }
  }
});

test('a shell command that writes, moves or removes a hook shim is denied', () => {
  const { e, root } = engine();
  const shim = path.join(root, 'bin', 'cth-hook.cjs');
  const commands = [
    `echo 'process.exit(0)' > '${shim}'`,
    `printf x >> '${shim}'`,
    `cp /tmp/mine.cjs '${shim}'`,
    `mv '${shim}' /tmp/old.cjs`,
    `rm -f '${shim}'`,
    `rm -rf '${path.join(root, 'bin')}'`,
    `tee '${shim}' < /tmp/mine.cjs`,
    `sed -i '' 's/a/b/' '${shim}'`,
    `cd '${path.join(root, 'bin')}' && echo x > cth-hook.cjs`,
    `python3 -c "open('${shim}','w').write('')"`
  ];
  for (const command of commands) {
    const v = e.evaluate(pre('Bash', { command }, root));
    assert.equal(v.decision, 'deny', command);
    assert.equal(v.ruleId, 'policy-self-protection', command);
  }
});

test('running and reading the hook scripts stays allowed', () => {
  const { e, root } = engine();
  const bin = path.join(root, 'bin');
  const commands = [
    `"${path.join(bin, 'hive-node')}" "${path.join(bin, 'md-memory.cjs')}" search "the plan"`,
    `cat '${path.join(bin, 'cth-hook.cjs')}'`,
    `grep -n hook '${path.join(bin, 'cth-hook.cjs')}'`,
    `ls '${bin}'`,
    `echo done > '${path.join(root, 'agents', 'agent-a', 'notes.txt')}'`
  ];
  for (const command of commands) {
    const v = e.evaluate(pre('Bash', { command }, root));
    assert.equal(v.decision, 'allow', command);
  }
  // A file that only shares the Gemini shim's name, outside a Gemini agent's hook folder.
  const v = e.evaluate(pre('Write', { file_path: path.join(root, 'agents', 'agent-a', 'gemini-hook.cjs'), content: '' }));
  assert.equal(v.decision, 'allow');
});

test('with no guardrail loaded nothing is denied, as for the policy folder', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-shim-off-'));
  const e = new PolicyEngine(root, () => {}, () => [], () => false);
  e.load();
  const v = e.evaluate(pre('Write', { file_path: path.join(root, 'bin', 'cth-hook.cjs'), content: '' }));
  assert.equal(v.decision, 'allow');
});
