'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { prepareDevinPromptFile } = loadTs('src/main/devinPrompt.ts');

test('Devin keeps an inline hive prompt when no personal prompt file is set', () => {
  const args = ['--model', 'swe-2', '--', 'Hive briefing'];
  assert.strictEqual(prepareDevinPromptFile(args, '/tmp', '/tmp/agent'), args);
});

test('Devin combines a personal prompt file with the hive briefing', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-devin-'));
  try {
    const agentDir = path.join(root, 'agent');
    fs.mkdirSync(agentDir);
    const personalPath = path.join(root, 'DEVIN.md');
    fs.writeFileSync(personalPath, 'Personal identity\n');
    const args = ['--model', 'swe-2', '--permission-mode', 'dangerous',
      '--prompt-file', 'DEVIN.md', '--', 'Hive briefing'];

    const result = prepareDevinPromptFile(args, root, agentDir);
    assert.deepEqual(result.slice(0, 5), args.slice(0, 5));
    assert.equal(result.includes('--'), false);
    assert.equal(result[5], path.join(agentDir, '.devin', 'initial-prompt.md'));
    assert.equal(fs.readFileSync(result[5], 'utf8'), 'Personal identity\n\nHive briefing\n');
    assert.equal(fs.readFileSync(personalPath, 'utf8'), 'Personal identity\n');
    assert.equal(fs.statSync(result[5]).mode & 0o777, 0o600);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('Devin accepts the equals form of --prompt-file', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-devin-'));
  try {
    const agentDir = path.join(root, 'agent');
    fs.mkdirSync(agentDir);
    fs.writeFileSync(path.join(root, 'instructions.md'), 'Personal');
    const result = prepareDevinPromptFile(
      ['--prompt-file=instructions.md', '--', 'Hive'], root, agentDir
    );
    assert.deepEqual(result, [`--prompt-file=${path.join(agentDir, '.devin', 'initial-prompt.md')}`]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
