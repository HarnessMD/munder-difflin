// 0.4.11, founder 6 Sep 2026, after the prompt audit: "we should say temps
// everywhere not workers. whatever you mentioned in gaps needs fixing fix them
// in system prompts, write cleanly, in short to keep the context managed and
// in ways that LLMs understand it completely."
//
// The contract pinned here:
//   1. One vocabulary. The injected prompt defines "agent" and "temp" once and
//      never says worker except as the id prefix worker-<id>. PROTOCOL.md, the
//      temp dispatch, the capability catalog and every UI string follow.
//   2. The orchestrator always learns how to start a temp and what the switch
//      does; the line is no longer left out when the switch is off at spawn.
//   3. Every agent learns where its capability catalog is, and that the
//      integrations broker is a temp's.
//   4. The orchestrator learns the two Slack triage modes.
//   5. The Slack protocol has one text per reader and no hardcoded name.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const DASH = /[–—]|\s-\s/;
const WORKER = /\bworkers?\b/i;
/** The word is allowed once, as the id prefix. */
// 0.5.3 (founder, 23 Sep 2026): "If a user says temps or workers Michael should
// use the existing temporary agent creation mechanism." The human's own word is
// allowed in the one line that teaches the orchestrator to recognise it.
const HUMANS_WORD = /WHEN THE HUMAN ASKS FOR TEMPS OR WORKERS \([^)]*\)/g;
const withoutId = (s) => s.replace(HUMANS_WORD, '').replace(/worker-<id>/g, '').replace(/worker-\$\{/g, '').replace(/worker-x/g, '');

const hive = read('src/main/hive.ts');
const prompt = strip(hive.slice(hive.indexOf('  private injectedPrompt('), hive.indexOf('  // — messaging —')));
const protocol = hive.slice(hive.indexOf('const PROTOCOL_MD'), hive.indexOf('// ─── cth-hook shim'));
const main = read('src/main/index.ts');

test('1. the injected prompt defines the words once and never says worker', () => {
  assert.match(prompt, /const wordsLine = 'WORDS: an "agent" is a member of this office with a lasting session\. A "temp" is a short lived agent the orchestrator starts for one job/);
  assert.match(prompt, /wordsLine,\s*'HIVE PROTOCOL, follow it every task:'/, 'the words come before the protocol steps');
  assert.doesNotMatch(withoutId(prompt), WORKER, 'the prompt says temp, never worker');
  assert.match(prompt, /meta\.role === 'temp'\s*\?\s*'YOU ARE A TEMP: one job, then done\./, 'a temp is told what it is');
  assert.match(prompt, /const sharedMemoryLine = `Shared memory: every agent that has been on this floor keeps its durable notes at \$\{inRoot\('agents'\)\}\/<id>\/memory\.md/, 'the shared memory line stays');
  assert.match(prompt, /YOU ARE THE ORCHESTRATOR \(address "god"\)\. You run the office; you do not do the work yourself\./);
  for (const rule of ['1. KNOW THE FLOOR', '2. DELEGATE', '3. OWN ONLY THE IMPORTANT', '4. NO APPROVAL QUEUE', '5. DISPATCH AS A CONTRACT', '6. MONITOR', '7. TASKS.JSON', '8. ASKING THE HUMAN', '9. STEWARD THE TOKEN BUDGET']) {
    assert.ok(prompt.includes(rule), `the orchestrator brief keeps rule "${rule}"`);
  }
});

test('2. the orchestrator always learns how to start a temp and what the switch does', () => {
  assert.match(prompt, /const spawnLines = meta\.isGod \? \[/, 'god only');
  assert.doesNotMatch(prompt, /orchestratorMaySpawn/, 'no longer left out when the switch is off at spawn time');
  assert.match(prompt, /STARTING A TEMP: write ONE JSON file into \$\{inRoot\('spawn-requests'\)\}\/<id>\.json/);
  assert.match(prompt, /THE SWITCH: the human allows temps under Settings, Autonomy & Budgets \(on by default; they can turn it off\) and caps how many run at once\./);
  assert.match(prompt, /WHEN THE HUMAN ASKS FOR TEMPS OR WORKERS .*start them with STARTING A TEMP above/);
  assert.match(prompt, /A request that has not moved means the switch is off; raise it with the human instead of retrying\./);
  assert.match(prompt, /LIVE ROSTER: you receive the live roster on every turn\./, 'the ctx line is god\'s, since only god gets the roster');
});

test('3. every agent learns where its capability catalog is, and that the broker is a temp\'s', () => {
  assert.match(prompt, /const capabilitiesLine = `CAPABILITIES: your skills are in \$\{inDir\('\.claude', 'skills'\)\}\. Read \$\{inDir\('\.claude', 'skills', 'capabilities', 'SKILL\.md'\)\} once/);
  assert.match(prompt, /available only when MD_BROKER_URL is set in your environment \(a temp's\); without it, ask god\./);
  const ret = prompt.slice(prompt.lastIndexOf('return ['));
  assert.ok(ret.indexOf('capabilitiesLine,') > 0 && ret.indexOf('capabilitiesLine,') < ret.indexOf('...godLines,'), 'in the common part, before the orchestrator brief');
  // Only a temp is granted the broker, so the promise must not widen.
  assert.match(main, /integrationBroker\.grant\(workerId, integrations\.enabledIds\(\)\)/);
  // The catalog itself says the same.
  const skill = read('resources/skills/capabilities/SKILL.md');
  assert.match(skill, /^# Capability catalog$/m);
  assert.match(skill, /\*\*Only a temp receives the broker\.\*\*/);
  assert.match(skill, /MD_BROKER_URL/);
  assert.doesNotMatch(skill, WORKER, 'the catalog says agent or temp');
});

test('4. the orchestrator learns the two Slack triage modes', () => {
  assert.match(prompt, /SLACK: requests can arrive from Slack\. Settings, Connections sets the triage\. Default: each request comes to you first/);
  assert.match(prompt, /Alternative: a temp takes each request at once \(the harness starts it, switch or not\) and you receive one inform per request; do not redo that work/);
  assert.match(main, /'temps'\);/, 'the harness signs those informs as "temps"');
  assert.doesNotMatch(main, /'ephemeral-worker'\)/);
});

test('5. the Slack protocol has one text per reader and no hardcoded name, and the temp dispatch says temp', () => {
  const fn = main.slice(main.indexOf('function buildAutonomousRequestProtocol('), main.indexOf('// ─── Slack done-notifier'));
  assert.match(fn, /reader: 'god' \| 'temp' = 'god'\): string \{/);
  assert.match(fn, /\[SLACK JOB\] You are a temp\./);
  assert.match(fn, /\[SLACK REQUEST\] This arrived from Slack/);
  assert.doesNotMatch(fn, /Michael/, 'the orchestrator is not named in the text');
  assert.doesNotMatch(withoutId(fn), WORKER);
  assert.match(main, /buildAutonomousRequestProtocol\(slack\.channel, slack\.thread_ts, slackReplyScriptPath\(\), 'temp'\)/, 'the temp reads its own text');
  assert.match(main, /'\[TEMP JOB\] You are a temp: one job, and no human is watching in the app\./);
  assert.match(main, /role: 'temp',/);
  assert.match(main, /`Temp \$\{reqId\.slice\(0, 12\)\}`/);
  const suffix = main.slice(main.indexOf('const suffix = `\\n\\n[CAPABILITIES]'), main.indexOf('hive.send({ to: workerId'));
  assert.match(suffix, /\[DONE\] When finished, send god ONE outbox message with "act":"done"/);
  assert.doesNotMatch(suffix, /\$AGENT_DIR/, 'the catalog path is joined, not a POSIX variable');
  assert.match(main, /const skillFile = join\(hive\.root\(\) \?\? '', 'agents', workerId, '\.claude', 'skills', 'capabilities', 'SKILL\.md'\);/);
});

test('6. PROTOCOL.md follows: words, starting a temp, capabilities', () => {
  assert.match(protocol, /\*\*Words\.\*\* An \*agent\* is a member of this office with a lasting session\. A \*temp\* is a short lived agent/);
  assert.match(protocol, /^## Starting a temp \(orchestrator\)$/m);
  assert.match(protocol, /^## Capabilities$/m);
  assert.doesNotMatch(protocol, /## Spawning a worker/);
  assert.match(protocol, /When\nSlack triage is set to temps, the harness starts those temps itself, switch or not\./);
  assert.doesNotMatch(withoutId(protocol), WORKER, 'the protocol says temp, never worker');
});

test('7. every UI string says temp, in three locales, without a dash', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) =>
    [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
  for (const [k, v] of locales.en) assert.ok(!WORKER.test(v), `en ${k} still says worker: ${v}`);
  const keys = [
    'commandCenter.tabs.workers', 'onboarding.welcome.descPlain',
    'workersTab.liveWorkers', 'workersTab.liveIntro', 'workersTab.noneRunning', 'workersTab.workerIdTitle', 'workersTab.preservedIntro',
    'integrations.availableToAll', 'integrations.notAvailableYet', 'integrations.disabledNoUse', 'integrations.v1Note', 'integrations.count',
    'pro.temps.col.worker', 'pro.god.budget.maxTempsHint'
  ];
  for (const k of keys) {
    for (const l of Object.keys(locales)) {
      const v = locales[l].get(k);
      assert.ok(typeof v === 'string' && v.length > 0, `${k} in ${l}`);
      assert.ok(!DASH.test(v), `${k} (${l}) carries a dash`);
    }
    assert.notEqual(locales['zh-CN'].get(k), locales.en.get(k), `${k} zh-CN is the English string`);
    assert.notEqual(locales.ar.get(k), locales.en.get(k), `${k} ar is the English string`);
  }
  assert.equal(locales.en.get('commandCenter.tabs.workers'), 'temps');
  assert.equal(locales.en.get('pro.temps.col.worker'), 'Temp');
  assert.match(locales.en.get('workersTab.liveIntro'), /\{\{godName\}\}/);
});
