'use strict';

/**
 * The list of files kept out of an agent's mempalace and git index used to
 * exist TWICE: `src/main/hive.ts` wrote it when an agent spawned,
 * `src/main/memory.ts` on every mine cycle, and only the latter reached agents
 * that were not running. Both carried a "MUST STAY IN SYNC" comment, which is
 * exactly the kind of invariant that drifts with no symptom until a repo
 * bloats again (PR #128: 7.5GB of .git from versioned Codex transcripts).
 *
 * There is one copy now, in `src/shared/hiveRepo.ts`, so the old test has
 * nothing left to compare. What it pins instead is that the second copy does
 * not come back: a `const MINE_IGNORE_LINES = [...]` reappearing in either file
 * is how the drift started, and it would read as perfectly ordinary code.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { AGENT_IGNORE_LINES } = loadTs('src/shared/hiveRepo.ts');
const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('the ignore list has one home, and Codex homes are on it', () => {
  assert.ok(AGENT_IGNORE_LINES.includes('.codex/'), 'Codex homes must stay out of the index');
  for (const rel of ['src/main/hive.ts', 'src/main/memory.ts']) {
    const src = read(rel);
    assert.equal(/const MINE_IGNORE_LINES\s*=/.test(src), false, `${rel} declares its own copy again`);
    assert.match(src, /AGENT_IGNORE_LINES/, `${rel} must use the shared list`);
    assert.match(src, /from '\.\.\/shared\/hiveRepo'/, `${rel} must import it`);
  }
});
