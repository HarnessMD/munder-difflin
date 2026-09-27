'use strict';
/**
 * 0.5.2: the orchestrator's composer IS the agents' composer.
 *
 * The founder, on 0.5.1 (8 Sep 2026): "the Queue message area UI for God
 * Orchestrator input area is different than other agents. Other agents have
 * the one that we want on God Orchestrator as well."
 *
 * Classic never diverged: CommandCenterPanel and AgentDetailPanel both mount
 * MessageQueueComposer. PRO did: the god screen's Terminal tab carried its own
 * GodComposer from phase 3 of 0.4.9, and phase 7 (the listed queue with Send
 * now and inline edit, the growing input, Steer, the key rule on screen) landed
 * on pro/Composer only. The fork is deleted; the tab mounts pro/Composer. These
 * pins keep it that way and keep the composer free of a god branch, so it
 * cannot fork again under another name.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const GOD_TAB = 'src/renderer/src/components/pro/god/TerminalTab.tsx';
const COMPOSER = 'src/renderer/src/components/pro/Composer.tsx';
const AGENT_SCREEN = 'src/renderer/src/components/pro/AgentScreen.tsx';
const LOCALES = ['en', 'ar', 'zh-CN'];

test('1. the god terminal tab mounts pro/Composer and draws no input of its own', () => {
  const tab = strip(read(GOD_TAB));
  assert.match(tab, /import \{ Composer \} from '\.\.\/Composer';/);
  assert.match(tab, /<Composer agent=\{agent\} \/>/, 'mounted plain: no autoFocus, the terminal owns the focus here');
  assert.doesNotMatch(tab, /autoFocus/);
  for (const own of [
    /function GodComposer/, /<textarea/, /enqueueMessage/, /removeQueuedMessage/, /<DropZone/,
    /collectDroppedAttachments/, /attachFiles\(/, /name="mic"|freeflowRecorder/, /name="send"/
  ]) {
    assert.doesNotMatch(tab, own, `the tab must not carry a composer piece of its own: ${own}`);
  }
});

test('2. the agent room mounts the same component, and the component has no god branch', () => {
  const screen = strip(read(AGENT_SCREEN));
  assert.match(screen, /import \{ Composer \} from '\.\/Composer';/);
  assert.match(screen, /<Composer\s+agent=\{agent\}\s+autoFocus=\{tab === 'inbox'\}/);
  const composer = strip(read(COMPOSER));
  assert.doesNotMatch(composer, /isGod|isOrchestrator/, 'one composer for every agent, the orchestrator included');
  // What the orchestrator gained by the switch, pinned so a later trim of the
  // shared composer is felt as a loss on both screens.
  assert.match(composer, /releaseQueuedMessage\(agent\.id, m\.id, true\)/, 'Send now on a queued row');
  assert.match(composer, /updateQueuedMessage\(agent\.id, editId, editText\)/, 'inline edit of a queued row');
  assert.match(composer, /window\.cth\.controlSteer\(agent\.id, text\)/, 'the Steer door');
  assert.match(composer, /enqueueMessage\(agent\.id, body\(\), \{ fromHuman: true \}\)/, 'a send is recorded in the sent log, so the Inbox thread shows it');
  assert.match(composer, /t\('pro\.room\.keyHint'\)/, 'the key rule is written on screen');
  assert.match(composer, /el\.style\.height = `\$\{Math\.min\(Math\.max\(el\.scrollHeight, INPUT_MIN_H\), INPUT_MAX_H\)\}px`;/, 'the input grows with the text');
});

test('3. the Inbox lists the orchestrator, so the recorded sends have a thread to land in', () => {
  const inbox = strip(read('src/renderer/src/components/pro/InboxScreen.tsx'));
  assert.match(inbox, /c\.kind === 'agent' && c\.agent\.isGod === true/);
});

test("4. the fork's three strings are gone from every locale and from the code", () => {
  for (const loc of LOCALES) {
    const god = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`)).pro.god;
    for (const k of ['queued', 'prompt', 'sendHint']) {
      assert.equal(god[k], undefined, `${loc}: pro.god.${k} belonged to the fork`);
    }
  }
  for (const f of ['src/renderer/src', 'src/shared', 'src/main'].flatMap((d) => walk(path.join(ROOT, d)))) {
    const rel = path.relative(ROOT, f);
    assert.doesNotMatch(read(rel), /pro\.god\.(queued|prompt|sendHint)'/, `${rel} still names a fork string`);
  }
});

function walk(dir) {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p));
    else if (/\.(ts|tsx)$/.test(e.name)) out.push(p);
  }
  return out;
}
