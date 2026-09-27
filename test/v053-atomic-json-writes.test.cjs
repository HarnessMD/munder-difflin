/**
 * Public #529 (UsryAce) and #578 (TTAWDTT), ported for 0.5.3: config.json and
 * every hive JSON file are written to a temp file and renamed into place, so
 * a crash mid write never leaves a torn file that reads back as defaults or
 * an empty roster; a failed rename removes the temp file.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('persistConfig writes a temp file, renames it, and removes it on failure', () => {
  const src = read('src/main/config.ts');
  const at = src.indexOf('function persistConfig');
  const body = src.slice(at, src.indexOf('\n}\n', at));
  assert.match(body, /writeFileSync\(tmp, JSON\.stringify\(next, null, 2\), 'utf8'\);\s*renameSync\(tmp, p\);/);
  assert.match(body, /catch \(e\) \{\s*try \{ rmSync\(tmp, \{ force: true \}\); \}/);
  assert.ok(!/writeFileSync\(p, JSON\.stringify\(next/.test(body), 'no write in place');
});

test('hive writeJson goes through atomicWriteJson, which cleans up after a failed rename', () => {
  const src = read('src/main/hive.ts');
  assert.match(src, /private writeJson\(p: string, data: unknown\): void \{\s*this\.atomicWriteJson\(p, data\);\s*\}/);
  const at = src.indexOf('private atomicWriteJson');
  const body = src.slice(at, src.indexOf('\n  }\n', at));
  assert.match(body, /renameSync\(tmp, p\);\s*\} catch \(e\) \{\s*try \{ rmSync\(tmp, \{ force: true \}\); \}/);
});
