'use strict';

/* The hive repo must stop versioning what it should never have taken.
 *
 * Three shapes have made a hive's .git enormous in the wild: an append only
 * log, a Codex worker's private sqlite, and a node_modules tree an agent
 * installed under shared work. Users have reported .git folders of 200GB and
 * up. Two earlier passes added ignore lines and tried to drop the paths from
 * the index, because git goes on recording a file it already tracks whatever
 * .gitignore says.
 *
 * ONE OF THOSE PASSES NEVER WORKED, and the first test here is why. It probed
 * with the pathspec `agents/<star>/.codex`. A git pathspec containing a wildcard
 * does not do the leading directory match a literal pathspec does, so it
 * matched nothing under the directory, the probe read the empty result as "this
 * repo is clean" and returned. Checked against the live hive that produced this
 * module: the shipped pathspec found 0 files while a literal one found 81, and
 * the sqlite files were still tracked with the fix running. `log.jsonl` was
 * worse: ignored since 0.4.10 and never untracked at all, 190MB of packed
 * history and still growing on every commit.
 *
 * So these tests run real git against real repos. A fake git would only have
 * proved the fake: the defect was in what git does with a pathspec, which is
 * exactly the part a stub invents. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const loadTs = require('./load-ts.cjs');

const {
  HIVE_IGNORE_LINES, AGENT_IGNORE_LINES, OVERSIZE_CAP_BYTES,
  mergeIgnoreLines, ignoreLineFor, untrackIgnored, ignoreOversized, boundGcMemory, packedBytes
} = loadTs('src/shared/hiveRepo.ts');
const { HIVE_COMPACT_SCRIPT } = loadTs('src/shared/hiveCompact.ts');

/** The same runner shape hive.ts gives the module, over real git. */
function runnerFor(root) {
  return (args, opts) => {
    const res = spawnSync('git', ['-c', 'user.name=Hive', '-c', 'user.email=hive@local', ...args], {
      cwd: root, encoding: 'utf8', timeout: opts?.timeoutMs ?? 30000, input: opts?.input,
      maxBuffer: 64 * 1024 * 1024
    });
    return { ok: res.status === 0, out: res.stdout ?? '', err: res.stderr ?? '' };
  };
}

const realFs = {
  read: (p) => { try { return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : ''; } catch { return null; } },
  write: (p, body) => fs.writeFileSync(p, body, 'utf8'),
  sizeOf: (p) => { try { const st = fs.statSync(p); return st.isFile() ? st.size : null; } catch { return null; } }
};

function tempRepo(name) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), `hive-repo-${name}-`));
  const run = runnerFor(root);
  assert.ok(run(['init', '-q']).ok, 'git init');
  return { root, run };
}

function write(root, rel, body) {
  const full = path.join(root, rel);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, body);
  return full;
}

function tracked(run) {
  const out = run(['ls-files', '-z']).out;
  return out.split('\0').filter(Boolean);
}

test('the pathspec that shipped is blind to the files it was written to find', () => {
  const { root, run } = tempRepo('pathspec');
  write(root, 'agents/andy/.codex/logs_2.sqlite', 'x'.repeat(4096));
  write(root, 'agents/andy/memory.md', 'notes');
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'before the ignore line existed']);

  // The ignore line arrives later, as it did in the product.
  write(root, 'agents/andy/.gitignore', AGENT_IGNORE_LINES.join('\n') + '\n');
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'ignore the codex home']);

  // THE DEFECT. Both of these ask "is a Codex home still tracked here".
  const shipped = run(['ls-files', '--', 'agents/*/.codex']).out.trim();
  const literal = run(['ls-files', '--', 'agents/andy/.codex']).out.trim();
  assert.equal(shipped, '', 'the wildcard pathspec matches nothing under the directory');
  assert.ok(literal.includes('logs_2.sqlite'), 'the file is tracked all along');

  // What the module asks instead cannot go stale, and finds it.
  const { paths, ok } = untrackIgnored(run);
  assert.ok(ok);
  assert.deepEqual(paths, ['agents/andy/.codex/logs_2.sqlite']);
  assert.deepEqual(tracked(run), ['agents/andy/.gitignore', 'agents/andy/memory.md']);
  assert.ok(fs.existsSync(path.join(root, 'agents/andy/.codex/logs_2.sqlite')), 'still on disk for codex --resume');
});

test('a file ignored years ago and never untracked stops being committed', () => {
  const { root, run } = tempRepo('log');
  write(root, 'log.jsonl', '{"a":1}\n');
  write(root, 'registry.json', '{}');
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'log.jsonl tracked before 0.4.10']);
  write(root, '.gitignore', HIVE_IGNORE_LINES.join('\n') + '\n');
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'ignore it']);
  assert.ok(tracked(run).includes('log.jsonl'), 'the ignore line alone changes nothing');

  const { paths } = untrackIgnored(run);
  assert.deepEqual(paths, ['log.jsonl']);
  run(['commit', '-q', '-m', 'untracked']);

  // And a later append is not committed again.
  fs.appendFileSync(path.join(root, 'log.jsonl'), '{"a":2}\n');
  run(['add', '-A']);
  const after = run(['status', '--porcelain']).out.trim();
  assert.equal(after, '', 'nothing staged: the log is out of the repo for good');
  assert.ok(fs.existsSync(path.join(root, 'log.jsonl')), 'still on disk for the app to read');
});

test('a node_modules tree under shared work is ignored at any depth', () => {
  const { root, run } = tempRepo('nm');
  write(root, '.gitignore', HIVE_IGNORE_LINES.join('\n') + '\n');
  write(root, 'shared/site/node_modules/react/index.js', 'module.exports={}');
  write(root, 'shared/site/src/app.js', 'ok');
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'first']);
  assert.deepEqual(tracked(run), ['.gitignore', 'shared/site/src/app.js']);
});

test('a global gitignore cannot make the pass untrack the hive memory', () => {
  const { root, run } = tempRepo('global');
  const globalIgnore = path.join(root, 'global-ignore');
  fs.writeFileSync(globalIgnore, '*.md\n');
  run(['config', 'core.excludesFile', globalIgnore]);
  write(root, '.gitignore', HIVE_IGNORE_LINES.join('\n') + '\n');
  write(root, 'agents/pam/memory.md', 'everything pam knows');
  // Force added: the hive tracked this long before the person wrote that global
  // rule, which is the whole shape of the risk. A plain add would skip it and
  // the test would prove nothing.
  run(['add', '-f', 'agents/pam/memory.md']);
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'memory']);

  // Proof the global rule is live in this repo, so the next assertion means
  // something. check-ignore is the control and not ls-files, because ls-files
  // is the thing under test: asked plainly it reports nothing here, since git
  // does not list a TRACKED file as ignored when only the global excludes file
  // covers it. That is git behaviour rather than a promise to us, which is why
  // the module empties core.excludesFile for the query instead of relying on it.
  // --no-index or check-ignore says nothing at all: it skips tracked files by
  // default, so without it the control reads as 'no rule covers this' for the
  // one reason that cannot be true here.
  const why = run(['check-ignore', '-v', '--no-index', 'agents/pam/memory.md']);
  assert.ok(why.ok && why.out.includes('global-ignore'), 'the global rule does cover the file');

  const { paths } = untrackIgnored(run);
  assert.deepEqual(paths, [], 'only the hive own rules decide what leaves the index');
  assert.ok(tracked(run).includes('agents/pam/memory.md'));
});

test('an untracked file over the cap is ignored instead of committed', () => {
  const { root, run } = tempRepo('big');
  write(root, '.gitignore', HIVE_IGNORE_LINES.join('\n') + '\n');
  const big = write(root, 'shared/design/launch.mp4', Buffer.alloc(OVERSIZE_CAP_BYTES + 1, 7));
  write(root, 'shared/design/notes.md', 'small');

  const over = ignoreOversized(run, realFs, root, path.join);
  assert.deepEqual(over, ['shared/design/launch.mp4']);
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'after the guard']);
  assert.deepEqual(tracked(run), ['.gitignore', 'shared/design/notes.md']);
  assert.ok(fs.existsSync(big), 'the render stays on disk');

  // Idempotent: a second pass adds nothing and writes no duplicate line.
  assert.deepEqual(ignoreOversized(run, realFs, root, path.join), []);
  const lines = fs.readFileSync(path.join(root, '.gitignore'), 'utf8').split('\n');
  assert.equal(lines.filter((l) => l.includes('launch.mp4')).length, 1);
});

test('the size rule never drops a file that is already in the repo', () => {
  const { root, run } = tempRepo('grown');
  write(root, '.gitignore', HIVE_IGNORE_LINES.join('\n') + '\n');
  write(root, 'agents/god/memory.md', 'short');
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'memory starts small']);
  fs.writeFileSync(path.join(root, 'agents/god/memory.md'), 'x'.repeat(OVERSIZE_CAP_BYTES + 1));

  assert.deepEqual(ignoreOversized(run, realFs, root, path.join), [], 'tracked files are out of scope');
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'memory grew']);
  assert.ok(tracked(run).includes('agents/god/memory.md'));
});

test('an ignore line written for one path matches that path and nothing else', () => {
  assert.equal(ignoreLineFor('shared/a.mp4'), '/shared/a.mp4');
  assert.equal(ignoreLineFor('#notes.bin'), '\\/#notes.bin'.replace('\\/', '/\\'));
  assert.equal(ignoreLineFor('!bang.bin'), '/\\!bang.bin');
  assert.equal(ignoreLineFor('a*b?c[d].bin'), '/a\\*b\\?c\\[d\\].bin');
  assert.equal(ignoreLineFor('trailing .bin '), '/trailing .bin\\ ');

  // And it really is exact, to git.
  const { root, run } = tempRepo('exact');
  write(root, '.gitignore', ignoreLineFor('shared/a*b.bin') + '\n');
  write(root, 'shared/a*b.bin', 'literal star');
  write(root, 'shared/azzb.bin', 'must survive');
  write(root, 'deep/shared/a*b.bin', 'must survive: the line is anchored');
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'exact']);
  const t = tracked(run);
  assert.ok(!t.includes('shared/a*b.bin'));
  assert.ok(t.includes('shared/azzb.bin'));
  assert.ok(t.includes('deep/shared/a*b.bin'));
});

test('merging ignore lines is append only and skips a no-op write', () => {
  assert.equal(mergeIgnoreLines('fleet.json\nhooks.sock\n', ['fleet.json']), null);
  assert.equal(mergeIgnoreLines('mine.txt', ['fleet.json']), 'mine.txt\nfleet.json\n');
  assert.equal(mergeIgnoreLines('', ['a', 'b']), 'a\nb\n');
  assert.equal(mergeIgnoreLines('  fleet.json  \n', ['fleet.json']), null, 'trimmed comparison');
  const kept = mergeIgnoreLines('# mine\nsecret/\n', ['fleet.json']);
  assert.ok(kept.startsWith('# mine\nsecret/\n'), 'hand written entries survive');
});

test('running the pass twice changes nothing the second time', () => {
  const { root, run } = tempRepo('idem');
  write(root, 'log.jsonl', 'a\n');
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'tracked']);
  write(root, '.gitignore', HIVE_IGNORE_LINES.join('\n') + '\n');
  assert.equal(untrackIgnored(run).paths.length, 1);
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'after']);
  assert.deepEqual(untrackIgnored(run).paths, []);
});

test('the gc bound is written into the repo config', () => {
  const { root, run } = tempRepo('gc');
  boundGcMemory(run);
  assert.equal(run(['config', '--get', 'pack.windowMemory']).out.trim(), '128m');
  assert.equal(run(['config', '--get', 'pack.threads']).out.trim(), '1');
  boundGcMemory(run);
  assert.equal(run(['config', '--get-all', 'pack.threads']).out.trim().split('\n').length, 1, 'no duplicate');
});

test('the repo size read is a number, or null when git cannot answer', () => {
  const { root, run } = tempRepo('size');
  write(root, 'a.txt', 'x'.repeat(5000));
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'one']);
  const bytes = packedBytes(run);
  assert.equal(typeof bytes, 'number');
  assert.ok(bytes > 0);
  // A repo git refuses to read must not read as a small one.
  const broken = () => ({ ok: false, out: '', err: 'not a git repository' });
  assert.equal(packedBytes(broken), null);
  const silent = () => ({ ok: true, out: 'count: 3\n', err: '' });
  assert.equal(packedBytes(silent), null, 'no size line at all is not zero bytes');
});

test('the compaction script the app ships reports before it rewrites', () => {
  const { root, run } = tempRepo('compact');
  fs.mkdirSync(path.join(root, 'bin'), { recursive: true });
  const script = path.join(root, 'bin', 'hive-compact.cjs');
  fs.writeFileSync(script, HIVE_COMPACT_SCRIPT, 'utf8');
  write(root, 'registry.json', '{}');
  for (let i = 0; i < 3; i++) {
    write(root, 'agents/andy/.codex/logs.sqlite', Buffer.alloc(120_000, i + 1));
    write(root, 'registry.json', JSON.stringify({ beat: i }));
    run(['add', '-A']);
    run(['commit', '-q', '-m', 'beat ' + i]);
  }
  write(root, 'agents/andy/.gitignore', '.codex/\n');
  run(['add', '-A']);
  run(['commit', '-q', '-m', 'ignore']);
  untrackIgnored(run);
  run(['commit', '-q', '-m', 'untrack']);
  const head = run(['rev-parse', 'HEAD']).out.trim();

  const res = spawnSync(process.execPath, [script], { cwd: root, encoding: 'utf8', timeout: 60000 });
  assert.equal(res.status, 0, res.stderr);
  assert.match(res.stdout, /agents\/andy\/\.codex\/logs\.sqlite/);
  assert.match(res.stdout, /Run again with --yes/);
  assert.equal(run(['rev-parse', 'HEAD']).out.trim(), head, 'a report rewrote nothing');
});
