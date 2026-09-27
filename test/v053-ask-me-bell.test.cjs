'use strict';

/**
 * 0.5.3, feature 5 (Teminite, 12 Sep 2026): an Ask Me question is hidden in the
 * Inbox while the person watches an agent's screen. The screen's bar now shows
 * a badge while any question waits. The badge counts what the Inbox lists, so
 * the number and the place it opens cannot disagree.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { askMeBadge } = loadTs('src/shared/askMeBadge.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PRO = 'src/renderer/src/components/pro';

test('the badge splits what waits into mine and everybody else', () => {
  const waiting = [{ assignee: 'pam-1' }, { assignee: 'Jim' }, { assignee: 'pam-1' }, {}];
  assert.deepEqual(askMeBadge(waiting, 'pam-1', 'Pam'), { total: 4, mine: 2 });
  assert.deepEqual(askMeBadge(waiting, 'jim-9', 'jim'), { total: 4, mine: 1 }, 'a hand written card names the agent, not its id');
  assert.deepEqual(askMeBadge(waiting, 'oscar-3', 'Oscar'), { total: 4, mine: 0 });
  assert.deepEqual(askMeBadge([], 'pam-1', 'Pam'), { total: 0, mine: 0 });
  assert.deepEqual(askMeBadge([{}], 'pam-1', undefined), { total: 1, mine: 0 }, 'a card with no assignee is nobody in particular');
});

test('the bell counts by the rule the Inbox lists by, and is absent when nothing waits', () => {
  const bell = read(`${PRO}/AskMeBell.tsx`);
  assert.match(bell, /askMeBadge\(\(tasks \?\? \[\]\)\.filter\(waitsOnHuman\), agent\.id, agent\.name, agent\.isGod === true\)/);
  assert.match(read(`${PRO}/InboxScreen.tsx`), /\(tasks \?\? \[\]\)\.filter\(waitsOnHuman\)/, 'the same filter the Ask Me chat is built from');
  assert.match(bell, /if \(badge\.total === 0\) return null;/, 'absent, not disabled');
  assert.match(bell, /onClick=\{\(\) => openAskMe\(\)\}/, 'it opens the Ask me modal on the whole list (0.5.3, Pro rail V2), not the Inbox');
  assert.match(bell, /const \{ tasks \} = useTaskLedger\(10_000\);/, 'it polls, so a question shows up while the person sits on the screen');
});

test('both agent screens carry it: a worker and the orchestrator', () => {
  assert.match(read(`${PRO}/AgentScreen.tsx`), /<AskMeBell agent=\{agent\} \/>\n\s+\{!agent\.isGod && <Controls agent=\{agent\} \/>\}/);
  assert.match(read(`${PRO}/GodScreen.tsx`), /<AskMeBell agent=\{agent\} \/>/);
});

test('the Agents screen stat counts what its click opens', () => {
  const screen = read(`${PRO}/AgentsScreen.tsx`);
  assert.match(screen, /const asks = tasks \? tasks\.filter\(waitsOnHuman\)\.length : null;/);
  assert.doesNotMatch(screen, /const asks = tasks \? tasks\.filter\(\(x\) => !!openQuestion\(x\)\)/);
});

test('four sentences in every language, and no plural keys, which Arabic would leave holes in', () => {
  for (const lng of ['en', 'zh-CN', 'ar']) {
    const agent = JSON.parse(read(`src/renderer/src/i18n/locales/${lng}.json`)).pro.agent;
    for (const k of ['askWaitingOne', 'askWaitingMany', 'askWaitingMineOne', 'askWaitingMineMany']) assert.ok(agent[k] && agent[k].trim(), `${lng} ${k}`);
    assert.match(agent.askWaitingMany, /\{\{count\}\}/);
    assert.match(agent.askWaitingMineOne, /\{\{name\}\}/);
    assert.equal(Object.keys(agent).filter((k) => /_(one|other|few|many|two|zero)$/.test(k)).length, 0, lng);
    assert.doesNotMatch(Object.values(agent).filter((v) => typeof v === 'string').join(' '), /[–—]/, 'house style: no dashes');
  }
});
