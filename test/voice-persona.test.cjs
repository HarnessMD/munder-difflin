'use strict';

/**
 * 0.5.2, card v052-voice-michael-persona-rewrite (founder, 9 Sep 2026): voice
 * Michael was "too robotic, asks a lot of questions, repeats itself, yaps".
 * The persona is his words now, and the confirmation gate in main moved with
 * it: a yes only before something destructive, something that sends words to
 * an agent, or something that spends or widens the floor (god's five
 * corrections). Three files say the same thing and this test holds them to it:
 * the persona text, the VERBS and SETTING_POLICY tables, and the tool
 * descriptions the model reads.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const session = read('src/renderer/src/realtime/session.ts');
const persona = session.slice(session.indexOf('const MICHAEL_PERSONA ='), session.indexOf('let state: RealtimeMichaelState'));

test('the persona is a constant with nothing live in it, and it is short', () => {
  assert.doesNotMatch(persona, /\$\{/, 'no interpolation: the prefix stays byte-stable and cached');
  assert.match(persona, /^const MICHAEL_PERSONA =\n  `/, 'one template literal');
  assert.ok(persona.length < 3600, `${persona.length} chars; under half of the 7300 it replaced, and the founder asked for short`);
  assert.doesNotMatch(persona, /—|–/, 'no dashes');
});

test('the persona says what he asked for, and the old habits are gone', () => {
  for (const line of [
    'Talk like a sharp colleague on a call',
    'One or two sentences is usually the whole answer',
    'Casual, plain words, no formality, no filler',
    'then ask exactly one, once',
    'Never repeat yourself',
    'say "I don\'t know" and stop',
    'First, what you already have',
    'call get_agent_terminal',
    'call get_memory; that is the tool for the past, lean on it',
    'A SLOW TOOL, ONLY',
    'never say it when no tool is needed',
    'WHAT NEEDS A YES FIRST',
    'kill, halt, archive, clear context, delete a task, delete a schedule',
    'ping, dispatch, steer, and a new schedule',
    'hiring, the autonomy switch, and the cost cap, worker count and turn limit',
    'never a bare "yes"',
    'Anything else, or silence, means cancel_action',
    'are refused; say so in one line'
  ]) assert.ok(persona.includes(line), `missing: ${line}`);
  for (const gone of ['INTERACTION', 'briefly confirm what you understood', 'TOOL LATENCY', 'read the action back and wait', 'chief of staff'])
    assert.ok(!persona.includes(gone), `still there: ${gone}`);
});

test('the gate in main matches the persona: destructive, words to an agent, and spend ask; the rest just does', () => {
  const main = read('src/main/realtimeActions.ts');
  const verbs = main.slice(main.indexOf('const VERBS'), main.indexOf('const SETTING_POLICY'));
  const tier = (v) => (new RegExp(`\\n\\s+${v}: \\{ tier: '(soft|confirm)'`).exec(verbs) ?? [])[1];
  for (const v of ['ping', 'dispatch', 'steer', 'create_schedule', 'kill', 'halt', 'archive', 'clear_context', 'delete_task', 'edit_schedule', 'spawn', 'update_setting'])
    assert.equal(tier(v), 'confirm', `${v} asks first`);
  for (const v of ['create_task', 'assign_task', 'update_task', 'pause', 'resume', 'auto_delivery', 'gate_tool', 'unarchive'])
    assert.equal(tier(v), 'soft', `${v} just does`);
  assert.doesNotMatch(main, /'destructive'/, 'the tier is called confirm now: it covers more than destruction');
  const policy = main.slice(main.indexOf('const SETTING_POLICY'), main.indexOf('};', main.indexOf('const SETTING_POLICY')));
  const setting = (k) => (new RegExp(`\\n\\s+${k}: \\{ tier: '(soft|confirm)'`).exec(policy) ?? [])[1];
  for (const k of ['autoMode', 'maxConcurrentWorkers', 'costCapTokens', 'maxTurns']) assert.equal(setting(k), 'confirm', `${k} spends or widens the floor`);
  for (const k of ['defaultModel', 'godProvider', 'godModel', 'slackEnabled', 'webhookEnabled', 'semanticMemory', 'multiWindow', 'notifications', 'officeTheme'])
    assert.equal(setting(k), 'soft', `${k} just does`);
});

test('the message verbs read back the words and the target, delete_task reads back the card, pause just does but never on god or everyone, and a schedule toggle just does', () => {
  const main = read('src/main/realtimeActions.ts');
  const propose = main.slice(main.indexOf('function proposeConfirm('), main.indexOf('function runAction('));
  assert.match(propose, /if \(verb === 'ping' \|\| verb === 'dispatch' \|\| verb === 'steer'\) \{/);
  assert.match(propose, /const exec = verb === 'ping' \? execPing : verb === 'dispatch' \? execDispatch : execSteer;/, 'the same exec runs on confirm');
  assert.match(propose, /Say "confirm" or "\$\{spec\.confirmWord\}" to send it, "cancel" to drop it\./);
  assert.match(propose, /if \(verb === 'delete_task'\) \{/);
  assert.match(propose, /Delete the task "\$\{card\.title\}"\? Say "confirm" or "delete"/);
  assert.match(propose, /if \(action !== 'delete'\) \{\n\s+return \{ ok: true, spoken: editScheduleNow\(deps, m, action\) \};/, 'enable and disable apply now');
  assert.doesNotMatch(propose, /verb === 'pause' \? buildPause/, 'pause is not staged any more');
  const run = main.slice(main.indexOf('function runAction('), main.indexOf('// ─── IPC registration'));
  assert.match(run, /case 'pause': return execPause\(deps, a\);/);
  assert.doesNotMatch(run, /case 'ping'|case 'dispatch'|case 'steer'|case 'delete_task'/, 'the four that ask are not in the soft switch');
  assert.match(run, /return proposeConfirm\(deps, verb, a\);/);
  const pause = main.slice(main.indexOf('function execPause('), main.indexOf('function execUnarchive('));
  assert.match(pause, /isMassTarget\(rawTarget\)/);
  assert.match(pause, /if \(r\.isGod\) return \{ ok: false/);
  assert.match(pause, /deps\.controlPause\(r\.id, true\)/);
});

test('the tool descriptions the model reads say the same tiers', () => {
  const actions = read('src/renderer/src/realtime/actions.ts');
  const desc = (name) => {
    const at = actions.indexOf(`name: '${name}'`);
    return actions.slice(at, actions.indexOf('parameters:', at));
  };
  for (const n of ['ping_agent', 'dispatch_agent', 'steer_agent', 'delete_task', 'create_schedule', 'spawn_agent']) assert.match(desc(n), /ASKS FIRST/, `${n}`);
  assert.match(desc('pause_agent'), /Runs immediately, no confirm/);
  assert.doesNotMatch(desc('pause_agent'), /DESTRUCTIVE/);
  assert.match(desc('edit_schedule'), /Enable and disable run immediately\. Delete is destructive and ASKS FIRST/);
  assert.match(desc('update_setting'), /\(autoMode, maxConcurrentWorkers, costCapTokens, maxTurns\) ASK FIRST/);
  assert.match(desc('update_setting'), /Most keys apply immediately \(notifications, officeTheme, terminalTheme, strongKeepalive, autoUpdate, tvShowOffices, realtimeIdleDisconnectMs, defaultModel, godProvider, godModel, slackEnabled, webhookEnabled, semanticMemory, multiWindow\)/);
  assert.doesNotMatch(actions, /Soft action — runs immediately, no confirm\. Use for "tell Oscar X"/, 'ping no longer says it runs immediately');
});
