'use strict';
/**
 * A guardrail `ask` backstop answers PreToolUse with permissionDecision "ask"
 * (Claude Code's permission prompt). The agy, Gemini and Grok shims used to write
 * nothing for it, which lets the call run. Now each one answers in its engine's words:
 *  - agy: "force_ask", its own prompt that ignores a remembered "Always Allow";
 *  - Grok: "ask", its own prompt;
 *  - Gemini CLI: its hooks have only allow and deny, so deny, saying why.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const net = require('node:net');
const os = require('node:os');
const path = require('node:path');
const { spawn } = require('node:child_process');
const loadTs = require('./load-ts.cjs');

const { AGY_HOOK_SHIM, GEMINI_HOOK_SHIM, GROK_HOOK_SHIM } = loadTs('src/main/hive.ts');

const POSIX = process.platform !== 'win32';

/** A hooks.sock stand-in that answers every payload with `reply`. */
async function sock(t, reply) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-ask-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const file = path.join(dir, 's');
  const got = [];
  const server = net.createServer((conn) => {
    let buf = '';
    conn.on('error', () => {});
    conn.on('data', (d) => {
      buf += d;
      if (!buf.includes('\n')) return;
      got.push(JSON.parse(buf.split('\n')[0]));
      conn.end(JSON.stringify(reply) + '\n');
    });
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(file, resolve); });
  t.after(() => server.close());
  return { dir, file, got };
}

function run(script, args, input, env) {
  return new Promise((resolve) => {
    const child = spawn(process.execPath, [script, ...args], { env: { ...env, PATH: process.env.PATH }, stdio: ['pipe', 'pipe', 'pipe'] });
    let out = '';
    child.stdout.on('data', (d) => { out += d; });
    child.on('close', (code) => resolve({ code, out }));
    child.stdin.end(JSON.stringify(input));
  });
}

const reply = (decision) => ({
  hookSpecificOutput: { hookEventName: 'PreToolUse', permissionDecision: decision, permissionDecisionReason: '[policy:no-push] Pushing needs an OK.' }
});

const ENGINES = [
  ['agy', AGY_HOOK_SHIM, ['PreToolUse'], { toolCall: { name: 'run_command', args: { CommandLine: 'git push' } } }],
  ['gemini', GEMINI_HOOK_SHIM, [], { hook_event_name: 'BeforeTool', tool_name: 'run_shell_command', tool_input: { command: 'git push' } }],
  ['grok', GROK_HOOK_SHIM, [], { hookEventName: 'pre_tool_use', toolName: 'bash', toolInput: { command: 'git push' } }],
];
/** What each engine is told for an ask: its own prompt where it has one. */
const ASKED = { agy: 'force_ask', gemini: 'deny', grok: 'ask' };

for (const [name, shim, args, input] of ENGINES) {
  test(`${name}: a guardrail ask is never a silent allow (${ASKED[name]}), with the reason`, { skip: !POSIX }, async (t) => {
    const s = await sock(t, reply('ask'));
    const script = path.join(s.dir, `${name}-hook.cjs`);
    fs.writeFileSync(script, shim);
    const r = await run(script, args, input, { AGENT_ID: 'jim-1', HIVE_SOCK: s.file });
    assert.equal(r.code, 0);
    assert.equal(s.got.length, 1, 'the payload reached the socket');
    assert.equal(s.got[0].hook_event_name, 'PreToolUse');
    const out = JSON.parse(r.out);
    assert.equal(out.decision, ASKED[name], r.out);
    assert.match(out.reason, /\[policy:no-push\] Pushing needs an OK\./);
    if (name === 'gemini') assert.match(out.reason, /cannot ask, so the call is denied/);
  });

  test(`${name}: a deny is still a deny, and an empty reply still writes nothing`, { skip: !POSIX }, async (t) => {
    const s = await sock(t, reply('deny'));
    const script = path.join(s.dir, `${name}-hook.cjs`);
    fs.writeFileSync(script, shim);
    const denied = await run(script, args, input, { AGENT_ID: 'jim-1', HIVE_SOCK: s.file });
    assert.equal(JSON.parse(denied.out).decision, 'deny');
    assert.equal(JSON.parse(denied.out).reason, '[policy:no-push] Pushing needs an OK.');
    const quiet = await sock(t, {});
    const allowed = await run(script, args, input, { AGENT_ID: 'jim-1', HIVE_SOCK: quiet.file });
    assert.equal(allowed.out, '', 'no output is allow');
  });
}

test('agy: a PostToolUse is marked no_context_reply, since agy drops that reply; PreInvocation is not', { skip: !POSIX }, async (t) => {
  const s = await sock(t, {});
  const script = path.join(s.dir, 'agy-hook.cjs');
  fs.writeFileSync(script, AGY_HOOK_SHIM);
  for (const event of ['PostToolUse', 'PreInvocation', 'SessionStart']) {
    await run(script, [event], { conversationId: 'conv-1' }, { AGENT_ID: 'jim-1', HIVE_SOCK: s.file });
  }
  assert.deepEqual(s.got.map((p) => [p.hook_event_name, p.no_context_reply === true]),
    [['PostToolUse', true], ['PreInvocation', false], ['SessionStart', false]]);
});
