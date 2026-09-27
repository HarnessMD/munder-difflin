'use strict';

/* 0.5.3 bug 7 (Jinbo, 14 Sep): a worker the orchestrator handed a task to sat in
 * the left agent list with the subtitle "CLI default" and nothing else.
 *
 * A worker started by MAIN (hired by the orchestrator, hired by voice, or brought
 * back from the archive) is carded in the renderer from a descriptor main
 * broadcasts. Main had already resolved the worker's real engine and model by
 * then and sent neither: the engine went out as the request's raw field or
 * 'claude', the model never went out at all, and the unarchive path sent the id
 * alone, so the row was named after the raw id. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { spawnedCard, modelFromArgs } = loadTs('src/shared/spawnedCard.ts');

test('a codex worker hired with a command and no provider field is carded as codex', () => {
  const card = spawnedCard({ id: 'worker-1', name: 'Concept', cwd: '/repo', command: 'codex -a never -s workspace-write' });
  assert.equal(card.provider, 'codex');
});

test('an explicit provider still wins over the binary', () => {
  assert.equal(spawnedCard({ id: 'w', cwd: '/r', command: 'my-wrapper', provider: 'grok' }).provider, 'grok');
});

test('the model on the command line reaches the card', () => {
  assert.equal(spawnedCard({ id: 'w', cwd: '/r', command: 'codex --model gpt-5.5 -a never' }).model, 'gpt-5.5');
  assert.equal(spawnedCard({ id: 'w', cwd: '/r', command: 'claude --model=claude-opus-5' }).model, 'claude-opus-5');
  assert.equal(spawnedCard({ id: 'w', cwd: '/r', command: 'agy --model "Gemini 3.1 Pro (High)"' }).model, 'Gemini 3.1 Pro (High)');
});

test('the model main appended as argv reaches the card when the command line has none', () => {
  // buildWorkerLaunch keeps a request's separate `model` out of `command` and
  // puts it in args only; spawnAgentCore injects the default the same way.
  const card = spawnedCard({ id: 'w', cwd: '/r', command: 'claude', args: ['--permission-mode', 'bypassPermissions', '--model', 'claude-fable-5'] });
  assert.equal(card.model, 'claude-fable-5');
});

test('no model anywhere stays undefined, never an empty string or a flag', () => {
  assert.equal(spawnedCard({ id: 'w', cwd: '/r', command: 'codex' }).model, undefined);
  assert.equal(modelFromArgs(['--model']), undefined);
  assert.equal(modelFromArgs(['--model', '--verbose']), undefined);
});

test('a card is never named after nothing: the id is the last resort', () => {
  assert.equal(spawnedCard({ id: 'worker-9', cwd: '/r' }).name, 'worker-9');
  assert.equal(spawnedCard({ id: 'worker-9', name: '  ', cwd: '/r' }).name, 'worker-9');
  assert.equal(spawnedCard({ id: 'worker-9', name: 'Concept', cwd: '/r' }).name, 'Concept');
});

test('HAS IT RUN: every hive:agentSpawned broadcast goes through spawnedCard, and the renderer keeps the model', () => {
  const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');
  const index = read('src/main/index.ts');
  const sends = index.match(/send\((?:archived \? 'hive:agentArchived' : )?'hive:agentSpawned',[^\n]*/g) ?? [];
  assert.equal(sends.length, 3, 'expected the three known broadcasts');
  for (const line of sends) assert.match(line, /spawnedCard\(/, `a broadcast builds its own descriptor: ${line}`);
  assert.doesNotMatch(index, /'hive:agentSpawned', \{ id \}/, 'the unarchive broadcast still sends the id alone');
  const useHive = read('src/renderer/src/hooks/useHive.ts');
  assert.match(useHive, /model: rec\.model/, 'the renderer drops the model the descriptor carries');
  assert.match(read('src/preload/index.ts'), /command\?: string; model\?: string;/);
});
