'use strict';

// 0.4.11, founder 6 Sep 2026: "temporary agents should be able to fetch
// context from any agent's memories." Pinned here:
//   1. hive.ts tells every agent, right after the semantic memory line, that
//      any agent's memory.md may be READ and only its own WRITTEN, and where
//      the index lives.
//   2. hive.ts exposes memoryIndexRows() over the registry, active and
//      archived alike, with the seed only judgement from hasMemory().
//   3. memoryIndex.ts writes <root>/memory-index.md atomically in the read
//      first order (notes before empty, active before archived, newest first)
//      with the absolute path of every memory file.
//   4. The [CONTEXT] block puts its steps in the plan's order: the index, the
//      matching memories, the palace when set, the knowledge graph when on,
//      then the request. Neither text carries a dash.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const DASH = /[–—]|\s-\s/;

const M = loadTs('src/main/memoryIndex.ts');

test('1. the protocol names shared memory right after the semantic memory line: read any, write only your own', () => {
  const hive = strip(read('src/main/hive.ts'));
  assert.match(hive, /const sharedMemoryLine = `Shared memory: every agent that has been on this floor keeps its durable notes at \$\{inRoot\('agents'\)\}\/<id>\/memory\.md, and \$\{inRoot\('memory-index\.md'\)\}/);
  // Reworded on 6 Sep 2026 with the rest of the prompt ("write cleanly, in
  // short"); the rule is unchanged: read any, write only your own.
  assert.match(hive, /Read any of them when a task names another agent or touches their work\. Write only your own memory\.md\.`/);
  const order = hive.indexOf('      memoryLine,\n      sharedMemoryLine,\n      knowledgeLine,');
  assert.ok(order > 0, 'the line sits between the semantic memory line and the knowledge graph line');
  const line = hive.slice(hive.indexOf('const sharedMemoryLine = `') + 'const sharedMemoryLine = `'.length);
  assert.ok(!DASH.test(line.slice(0, line.indexOf('`'))), 'no dash in the agent facing line');
});

test('2. memoryIndexRows() walks the registry, active and archived, and asks hasMemory() whether a file is only the seed', () => {
  const hive = strip(read('src/main/hive.ts'));
  assert.match(hive, /import type \{ MemoryIndexRow \} from '\.\/memoryIndex';/);
  const fn = hive.slice(hive.indexOf('memoryIndexRows(): MemoryIndexRow[] {'), hive.indexOf('inbox(id: string): HiveMessage[] {'));
  assert.ok(fn.length > 0, 'the method exists');
  assert.match(fn, /const reg = this\.registry\(\);/);
  assert.match(fn, /for \(const \[id, agent\] of Object\.entries\(reg\.agents \?\? \{\}\)\)/);
  assert.match(fn, /const path = join\(this\.agentDir\(id\), 'memory\.md'\);/);
  assert.match(fn, /statSync\(path\)/);
  assert.match(fn, /empty: !this\.hasMemory\(id\)/);
  assert.match(fn, /archived: !!agent\?\.archived/);
  assert.ok(!/archived\) continue/.test(fn), 'archived agents are listed, their notes remain');
});

test('3. writeMemoryIndex: atomic, read first order, every absolute path, states named', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-memory-index-'));
  try {
    const rows = [
      { id: 'pam', name: 'Pam', role: 'design', cwd: '/p', path: '/hive/agents/pam/memory.md', bytes: 12_288, updatedAt: '2026-09-01T09:00:00.000Z', empty: false, archived: false },
      { id: 'worker-x', name: 'Worker x', role: 'worker', path: '/hive/agents/worker-x/memory.md', bytes: 90, empty: true, archived: true },
      { id: 'jim', name: 'Jim', role: 'sales', path: '/hive/agents/jim/memory.md', bytes: 2_048, updatedAt: '2026-09-05T09:00:00.000Z', empty: false, archived: true },
      { id: 'kevin', name: 'Kevin', role: 'engineer', path: '/hive/agents/kevin/memory.md', bytes: 40_000, updatedAt: '2026-09-06T09:30:00.000Z', empty: false, archived: false },
      { id: 'god', name: 'Michael', role: 'orchestrator (god)', path: '/hive/agents/god/memory.md', bytes: 0, empty: true, archived: false }
    ];
    const p = M.writeMemoryIndex(root, rows, new Date('2026-09-06T10:00:00Z'));
    assert.equal(p, path.join(root, 'memory-index.md'));
    assert.deepEqual(fs.readdirSync(root), ['memory-index.md'], 'the temp name is gone after the rename');
    const text = fs.readFileSync(p, 'utf8');
    assert.ok(text.startsWith('# Memory index\n'));
    assert.match(text, /Written 2026-09-06T10:00:00\.000Z by the harness/);
    assert.match(text, /5 agents have been on this floor, 3 with notes worth reading/);
    const at = (id) => text.indexOf(`\n${id}  `);
    assert.ok(at('kevin') < at('pam'), 'newest notes first');
    assert.ok(at('pam') < at('jim'), 'active before archived');
    assert.ok(at('jim') < at('god'), 'notes before empty');
    assert.ok(at('god') < at('worker-x'), 'empty active before empty archived');
    assert.match(text, /\nkevin  Kevin \(engineer\)  active  39 KB  updated 2026-09-06 09:30 UTC\n  \/hive\/agents\/kevin\/memory\.md\n/);
    assert.match(text, /\njim  Jim \(sales\)  archived  2 KB  updated 2026-09-05 09:00 UTC\n  \/hive\/agents\/jim\/memory\.md\n/);
    assert.match(text, /\ngod  Michael \(orchestrator \(god\)\)  empty  0 B  never written\n  \/hive\/agents\/god\/memory\.md\n/);
    for (const r of rows) assert.ok(text.includes(`\n  ${r.path}\n`), `path of ${r.id}`);
    assert.ok(!DASH.test(text), 'no dash anywhere in the index');

    const empty = M.writeMemoryIndex(root, [], new Date('2026-09-06T10:00:00Z'));
    assert.match(fs.readFileSync(empty, 'utf8'), /No agent has been registered on this floor yet\./);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('4. memoryContextBlock: index, matching memories, palace when set, knowledge graph when on, then start', () => {
  const both = M.memoryContextBlock('/hive', '/hive/memory-index.md', true, '`"/opt/node" "/opt/kg.cjs" search "<query>"`');
  const lines = both.split('\n');
  assert.equal(lines[0], '[CONTEXT] Before you start, gather what the team already knows.');
  assert.match(lines[1], /^1\. Read \/hive\/memory-index\.md\./);
  assert.match(lines[2], /^2\. Read the memory\.md of every agent the request names and of every agent whose role matches the request\. They live under \/hive\/agents\/<id>\/memory\.md\. Read only: you write to your own memory\.md alone\./);
  assert.match(lines[3], /^3\. Run `mempalace search "<the request in a few words>"`/);
  assert.match(lines[4], /^4\. Run `"\/opt\/node" "\/opt\/kg\.cjs" search "<query>"` for company facts/);
  assert.match(lines[5], /^5\. Then start on the request below\./);
  assert.equal(lines.length, 6);
  assert.ok(!DASH.test(both), 'no dash in the block');

  const neither = M.memoryContextBlock('/hive', '/hive/memory-index.md', false);
  assert.ok(!neither.includes('mempalace'), 'no palace, no palace step');
  assert.ok(!neither.includes('company facts'), 'no knowledge graph, no graph step');
  assert.match(neither, /\n3\. Then start on the request below\./);

  const palaceOnly = M.memoryContextBlock('/hive', '/hive/memory-index.md', true, '   ');
  assert.match(palaceOnly, /\n3\. Run `mempalace search/);
  assert.match(palaceOnly, /\n4\. Then start/);
});
