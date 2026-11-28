'use strict';

// The Bash normaliser. Every case here is a disguise that a measurement found the raw-string
// matcher missing, or a MENTION it must keep missing. A rules engine that uses it asserts the
// same cases through its rules.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { effectiveCommands, realAbsolute, STRUCTURAL_UNRESOLVED, scriptWrites } = loadTs('src/main/shell.ts');

/** Every command the call runs, as normalised text. */
const texts = (cmd, cwd) => effectiveCommands(cmd, cwd ?? '/work').map((c) => c.text);
/** Every path the call writes. */
const writes = (cmd, cwd) => effectiveCommands(cmd, cwd ?? '/work').flatMap((c) => c.writes);

// --- 1. the disguises ---------------------------------------------------------

test('1. a wrapper, a prefix or an absolute program path collapses onto the plain command', () => {
  for (const cmd of [
    'mempalace sync',
    'sudo mempalace sync',
    'nohup mempalace sync &',
    'env FOO=1 mempalace sync',
    'time mempalace sync',
    'timeout 30 mempalace sync',
    '/usr/local/bin/mempalace sync',
    'bash -c "mempalace sync"',
    "sh -c 'mempalace sync'",
    'eval "mempalace sync"',
    '(mempalace sync)',
    '{ mempalace sync; }',
    'python3 -m mempalace sync',
    'M=mempalace; $M sync',
    'S=sync; mempalace $S',
    'for c in sync; do mempalace $c; done',
    'xargs -I{} mempalace {} <<< sync',
    'ls\nmempalace sync',
    'echo go && mempalace sync',
    'false || mempalace sync',
    'cd /tmp; mempalace sync',
  ]) {
    assert.ok(texts(cmd).includes('mempalace sync'), cmd);
  }
});

test('1b. a MENTION stays one word and never becomes a command', () => {
  for (const cmd of [
    'echo "never run mempalace sync"',
    "grep -n 'mempalace sync' PROTOCOL.md",
    'echo git push',
    "git commit -m 'prepare push'",
    "cat <<'EOF'\nmempalace sync\ngit push\nEOF",
    'cat <<-END\n\tmempalace sync\n\tEND',
  ]) {
    const t = texts(cmd);
    assert.equal(t.includes('mempalace sync'), false, cmd);
    assert.equal(t.includes('git push'), false, cmd);
  }
});

test('1c. a heredoc body is data, and the command after it still parses', () => {
  const t = texts("cat <<'EOF' > /tmp/x\nmempalace sync\nEOF\ngit push");
  assert.equal(t.includes('mempalace sync'), false, 'the body is not a command');
  assert.ok(t.includes('git push'), 'the line after the delimiter is');
});

test('1d. an unset variable is left as written rather than collapsing to nothing', () => {
  assert.deepEqual(texts('mempalace $UNSET'), ['mempalace $UNSET']);
  assert.deepEqual(writes('rm -rf $UNSET/x'), ['/work/$UNSET/x']);
});

test('1e. a command substitution runs its own commands', () => {
  assert.ok(texts('echo "$(mempalace sync)"').includes('mempalace sync'));
  assert.ok(texts('echo `git push`').includes('git push'));
});

test('1f. git keeps its flags so a rule can still require push in subcommand position', () => {
  assert.deepEqual(texts('git -C ~/dev/x push'), [`git -C ${os.homedir()}/dev/x push`]);
  assert.deepEqual(texts('git log --grep push'), ['git log --grep push']);
  assert.deepEqual(texts('git stash push -m wip'), ['git stash push -m wip']);
});

// --- 2. write targets ---------------------------------------------------------

test('2. a redirection is a write, a read redirection is not', () => {
  assert.deepEqual(writes('cat a > /x/out.md'), ['/x/out.md']);
  assert.deepEqual(writes('cat a >> /x/out.md'), ['/x/out.md']);
  assert.deepEqual(writes('sort < /x/in.md'), []);
  assert.deepEqual(writes('wc -l /x/in.md'), []);
  assert.deepEqual(writes('npm run build 2> /x/err.log'), ['/x/err.log']);
  assert.deepEqual(writes('npm run build &> /x/all.log'), ['/x/all.log']);
});

test('2b. cp/mv/rsync/ln/install write their LAST operand only', () => {
  assert.deepEqual(writes('cp /a/src.md /b/dest.md'), ['/b/dest.md']);
  assert.deepEqual(writes('mv -f /a/one /a/two /b/dir/'), ['/b/dir/']);
  assert.deepEqual(writes('rsync -a /a/ /b/'), ['/b/']);
  assert.deepEqual(writes('ln -s /a/real /b/link'), ['/b/link']);
  assert.deepEqual(writes('install -m 600 /a/f /b/f'), ['/b/f']);
  assert.deepEqual(writes('cp /a/only'), [], 'one operand is not a destination');
});

test('2c. a directory destination keeps its trailing slash, so "inside here" still globs', () => {
  assert.deepEqual(writes('rsync -a ./out/ /b/dir/'), ['/b/dir/']);
  assert.deepEqual(writes('cp x /b/dir'), ['/b/dir'], 'no trailing slash written, none invented');
});

test('2d. verbs that only mutate write every operand; reads write nothing', () => {
  assert.deepEqual(writes('rm -rf /a/x /a/y'), ['/a/x', '/a/y']);
  assert.deepEqual(writes('touch /a/x'), ['/a/x']);
  assert.deepEqual(writes('tee /a/x /a/y'), ['/a/x', '/a/y']);
  assert.deepEqual(writes('chmod 600 /a/x'), ['/a/x'], 'the mode is not a path');
  assert.deepEqual(writes('chown me:staff /a/x'), ['/a/x']);
  assert.deepEqual(writes('dd if=/a/in of=/a/out'), ['/a/out']);
  for (const cmd of ['cat /a/x', 'ls /a', 'grep -n TODO /a/x', 'head -5 /a/x', 'diff /a/x /a/y']) {
    assert.deepEqual(writes(cmd), [], cmd);
  }
});

test('2e. sed writes only in place, and the script is not mistaken for a file', () => {
  assert.deepEqual(writes("sed -i '' s/a/b/ /a/x"), ['/a/x'], 'BSD sed -i takes an empty suffix');
  assert.deepEqual(writes('sed -i s/a/b/ /a/x'), ['/a/x'], 'GNU sed -i does not');
  assert.deepEqual(writes('sed -i -e s/a/b/ /a/x'), ['/a/x'], '-e supplies the script');
  assert.deepEqual(writes("sed -n '1,5p' /a/x"), [], 'sed -n reads');
});

test('2f. an inline script is searched for paths only when it also writes', () => {
  assert.deepEqual(writes(`node -e "require('fs').writeFileSync('/a/x','y')"`), ['/a/x']);
  assert.deepEqual(writes(`python3 -c "open('/a/x','w').write('y')"`), ['/a/x']);
  assert.deepEqual(writes(`node -e "console.log(require('fs').readFileSync('/a/x','utf8'))"`), [],
    'a read is not a write');
  assert.deepEqual(writes(`python3 -c "print('/a/x')"`), []);
});

test('2g. paths are resolved: relative to cwd, through .., ~ and $HOME', () => {
  assert.deepEqual(writes('touch out.md', '/work/sub'), ['/work/sub/out.md']);
  assert.deepEqual(writes('touch ../out.md', '/work/sub'), ['/work/out.md']);
  assert.deepEqual(writes('touch a/../b/out.md', '/work'), ['/work/b/out.md']);
  assert.deepEqual(writes('touch ~/out.md'), [`${os.homedir()}/out.md`]);
  assert.deepEqual(writes('H=/h; touch $H/out.md'), ['/h/out.md']);
  assert.deepEqual(writes('touch $HOME/out.md'), [`${os.homedir()}/out.md`]);
  assert.deepEqual(writes('touch $AGENT_DIR/out.md'), ['/work/$AGENT_DIR/out.md'],
    'an agent-shell variable is not in the app environment, so it is left alone rather than guessed');
});

test('2h. cd moves the cwd for the commands that follow it, but not out of a subshell', () => {
  assert.deepEqual(writes('cd /elsewhere && touch out.md', '/work'), ['/elsewhere/out.md']);
  assert.deepEqual(writes('(cd /elsewhere; touch a.md); touch b.md', '/work'),
    ['/elsewhere/a.md', '/work/b.md']);
});

test('2i. a symlinked parent resolves to the real path, for a file that does not exist yet', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-shell-'));
  const real = fs.realpathSync(root);
  fs.mkdirSync(path.join(real, 'target'));
  fs.symlinkSync(path.join(real, 'target'), path.join(real, 'link'));
  assert.deepEqual(writes(`touch ${real}/link/new.md`), [`${real}/target/new.md`]);
  assert.equal(realAbsolute(`${real}/link/`, '/work'), `${real}/target/`, 'and keeps the trailing slash');
  fs.rmSync(root, { recursive: true, force: true });
});

test('2j. an unpacker writes into its -C directory, but only when extracting', () => {
  assert.deepEqual(writes('tar -xzf a.tgz -C /b/dir'), ['/b/dir/']);
  assert.deepEqual(writes('tar --extract --file a.tgz --directory /b/dir'), ['/b/dir/']);
  assert.deepEqual(writes('unzip a.zip -d /b/dir'), ['/b/dir/']);
  assert.deepEqual(writes('tar -czf a.tgz -C /b/dir .'), [], 'creating an archive writes the archive, not the dir');
});

test('2k. a string an inline script hands to a shell is a command; one it prints is not', () => {
  assert.ok(texts(`python3 -c "import os; os.system('git push')"`).includes('git push'));
  assert.ok(texts(`node -e "require('child_process').execSync('mempalace sync')"`).includes('mempalace sync'));
  assert.deepEqual(
    texts(`node -e "console.log('git push after approval')"`).filter((t) => t.startsWith('git')),
    [], 'a logged sentence must not read as an invocation');
  assert.ok(writes(`python3 -c "os.system('echo x > /a/out.md')"`).includes('/a/out.md'));
});

// --- 4. wrapper values, comments, printing and archives ------------------------

test('a wrapper flag VALUE is not the command it wraps', () => {
  // Skipping flags but not their arguments buried the real command one word deeper,
  // which defeated all three rules at once. `sudo -u` is the ordinary spelling.
  assert.deepEqual(texts('sudo -u alice mempalace sync'), ['mempalace sync']);
  assert.deepEqual(texts('nice -n 5 mempalace repair'), ['mempalace repair']);
  assert.deepEqual(texts('nice -n 10 git push'), ['git push']);
  assert.deepEqual(texts('ionice -c 2 mempalace sync'), ['mempalace sync']);
  assert.deepEqual(texts('script -q /dev/null mempalace sync'), ['mempalace sync']);
  assert.deepEqual(texts('doas -u alice git push'), ['git push']);
  assert.deepEqual(texts('stdbuf -o L npm run dev'), ['npm run dev']);
  assert.deepEqual(texts('sudo --user=alice mempalace sync'), ['mempalace sync'],
    'an attached value carries no extra word');
  assert.deepEqual(texts('sudo -n true'), ['true'], 'a boolean flag takes no value');
});

test('a command buried behind a wrapper flag still contributes its write target', () => {
  assert.deepEqual(writes('sudo -u alice cp ./a.md /o/inbox/x.json'), ['/o/inbox/x.json']);
  assert.deepEqual(writes('nice -n 10 mv ./a.md /o/results/a.md'), ['/o/results/a.md']);
});

test('a # comment is discarded, and the newline after it still separates', () => {
  assert.deepEqual(texts('git push # --dry-run'), ['git push']);
  assert.deepEqual(texts('echo hi # mempalace sync'), ['echo hi']);
  assert.deepEqual(texts('# nothing here\ngit push'), ['git push']);
  assert.deepEqual(texts('ls foo#bar'), ['ls foo#bar'], 'a # inside a word is not a comment');
  assert.deepEqual(texts("echo '# not a comment'"), ["echo '# not a comment'"]);
});

test('printing a file is not writing it, and the file being READ is not a target', () => {
  assert.deepEqual(writes(`node -e "process.stdout.write(require('fs').readFileSync('/o/memory.md','utf8'))"`), []);
  assert.deepEqual(writes(`python3 -c "import sys; sys.stdout.write(open('/o/memory.md').read())"`), []);
  assert.deepEqual(writes(`python3 -c "print(open('/o/memory.md').read())"`), []);
  assert.deepEqual(writes(`node -e "require('fs').writeFileSync('/m/out', require('fs').readFileSync('/o/in'))"`),
    ['/m/out'], 'the write names its target; the read is not one');
  assert.deepEqual(writes(`python3 -c "import shutil; shutil.copy('/m/a','/o/b')"`), ['/o/b'],
    'a copy targets its SECOND argument');
});

test('a regex .exec is not a shell exec', () => {
  assert.deepEqual(texts(`node -e "const r=/a/.exec('mempalace sync')"`),
    [`node -e 'const r=/a/.exec('\\''mempalace sync'\\'')'`]);
  assert.ok(texts(`node -e "require('child_process').execSync('mempalace sync')"`).includes('mempalace sync'),
    'an unmistakable exec API still is one');
  assert.ok(texts(`python3 -c "import os; os.system('git push')"`).includes('git push'));
});

test('-t / --target-directory inverts the coreutils copiers', () => {
  assert.deepEqual(writes('cp -t /o/results /m/a.md'), ['/o/results/']);
  assert.deepEqual(writes('mv -t /o/inbox /m/msg.json'), ['/o/inbox/']);
  assert.deepEqual(writes('cp --target-directory=/o/results /m/a.md'), ['/o/results/']);
  assert.deepEqual(writes('cp -t /m/results /o/a.md /o/b.md'), ['/m/results/'],
    'and a source is not the destination');
  assert.deepEqual(writes('rsync -a -t /m/src/ /o/dst/'), ['/o/dst/'],
    "rsync's -t means preserve times, so it must not be read as a destination");
});

test('install -d creates directories; sed --in-place is still in place', () => {
  assert.deepEqual(writes('install -d /o/newdir'), ['/o/newdir']);
  assert.deepEqual(writes('install -m 600 /a/f /b/f'), ['/b/f'], 'the ordinary form is unchanged');
  assert.deepEqual(writes('sed --in-place s/a/b/ /o/memory.md'), ['/o/memory.md']);
  assert.deepEqual(writes('sed --in-place=.bak s/a/b/ /o/memory.md'), ['/o/memory.md']);
  assert.deepEqual(writes('sed --in-place --expression=s/a/b/ /o/memory.md'), ['/o/memory.md']);
});

test('an archiver reads its sources and writes only the archive', () => {
  assert.deepEqual(writes('zip -r /tmp/backup.zip /o/results'), ['/private/tmp/backup.zip']);
  assert.deepEqual(writes('gzip /o/f'), ['/o/f'], 'gzip does replace its operand');
});

test('$(echo WORD) is the one substitution resolvable without running it', () => {
  assert.deepEqual(texts('$(echo mempalace) sync'), ['mempalace sync']);
  assert.deepEqual(texts('eval $(echo "mempalace sync")'), ['mempalace sync']);
  assert.deepEqual(texts('`echo mempalace` repair'), ['mempalace repair']);
  assert.deepEqual(texts('$(echo git) push'), ['git push']);
  // Anything whose output we cannot see stays unresolved, and still runs as its own
  // command — this is a documented miss, not a guess.
  assert.deepEqual(texts('$(echo -n mempalace) sync').includes('mempalace sync'), false,
    'echo -n changes the output, so it is not resolved');
  assert.ok(texts('$(cat which) sync').includes('cat which'),
    'an unresolvable substitution is still a command in its own right');
});

// --- 5. what a verb does to its operands, links, and git ------------------------

test('a redirection is not the parser understanding the verb', () => {
  // `> /dev/null` used to give a segment a resolved target, which was enough to skip
  // the caller's string heuristic. verbWrites keeps the two apart.
  const one = (cmd) => effectiveCommands(cmd, '/work')[0];
  assert.deepEqual(one('busybox sed -i s/a/b/ /p/f > /dev/null').writes, ['/dev/null']);
  assert.deepEqual(one('busybox sed -i s/a/b/ /p/f > /dev/null').verbWrites, [],
    'busybox is not tabled, so the verb resolved nothing');
  assert.deepEqual(one('sed -i "" s/a/b/ /p/f > /dev/null').verbWrites, ['/p/f'],
    'sed is tabled, so it did');
});

test('a verb that takes its source away reports it as removed', () => {
  const one = (cmd) => effectiveCommands(cmd, '/work')[0];
  assert.deepEqual(one('mv /a/f /tmp/g').removes, ['/a/f']);
  assert.deepEqual(one('mv /a/f /a/g /tmp/dir/').removes, ['/a/f', '/a/g']);
  assert.deepEqual(one('mv -t /tmp/dir /a/f').removes, ['/a/f'], '-t makes every operand a source');
  assert.deepEqual(one('ln /a/f /tmp/h').removes, ['/a/f'], 'a hard link is a second name for it');
  assert.deepEqual(one('rsync -a --remove-source-files /a/ /tmp/').removes, ['/a/']);
  // A copy READS its source: copying a file out to read it is not a write to it.
  assert.deepEqual(one('cp /a/f /tmp/g').removes, []);
  assert.deepEqual(one('rsync -a /a/ /tmp/').removes, []);
  assert.deepEqual(one('zip -r /tmp/z.zip /a').removes, []);
  assert.deepEqual(one('tar -czf /tmp/t.tgz /a').removes, []);
});

test('perl and ruby edit in place, and homebrew basenames are the same verbs', () => {
  assert.deepEqual(writes('perl -i -pe s/a/b/ /p/f'), ['/p/f']);
  assert.deepEqual(writes("perl -i -e 's/a/b/' /p/f"), ['/p/f'], '-i beats the inline-script path');
  assert.deepEqual(writes('perl -pe s/a/b/ /p/f'), [], 'without -i perl reads');
  assert.deepEqual(writes('gsed -i s/a/b/ /p/f'), ['/p/f']);
  assert.deepEqual(writes('gcp /a/f /p/g'), ['/p/g']);
  assert.deepEqual(writes('grm /p/f'), ['/p/f']);
  assert.deepEqual(effectiveCommands('gmv /p/f /tmp/g', '/work')[0].removes, ['/p/f']);
});

test('every wrapper branch consumes a flag VALUE, in any order', () => {
  for (const [cmd, want] of [
    ['sudo --preserve-env=PATH -u root mempalace sync', 'mempalace sync'],
    ['sudo -u root --preserve-env=PATH mempalace sync', 'mempalace sync'],
    ['sudo -- mempalace sync', 'mempalace sync'],
    ['env -u HOME mempalace sync', 'mempalace sync'],
    ['env -S "mempalace sync"', 'mempalace sync'],
    ['env FOO=1 -u BAR mempalace sync', 'mempalace sync'],
    ['env -i -C /tmp mempalace sync', 'mempalace sync'],
    ['timeout -s KILL 5 mempalace sync', 'mempalace sync'],
    ['timeout -k 5 10 mempalace sync', 'mempalace sync'],
    ['timeout --signal=KILL 5 mempalace sync', 'mempalace sync'],
    ['xargs -L 1 mempalace sync', 'mempalace sync'],
    ['xargs -a list.txt mempalace sync', 'mempalace sync'],
    ['xargs --max-args=1 mempalace sync', 'mempalace sync'],
    ['xargs -n 1 -P 4 mempalace sync', 'mempalace sync'],
    ['nice -n 5 ionice -c 2 mempalace sync', 'mempalace sync'],
    ['stdbuf -o L -e L mempalace sync', 'mempalace sync']
  ]) {
    assert.ok(texts(cmd).includes(want), cmd);
  }
});

test('the ledger detail is a program name, never an inline assignment or an argument', () => {
  const only = (cmd) => effectiveCommands(cmd, '/work').flatMap((c) => c.unresolved);
  assert.deepEqual(only('$(AWS_SECRET_ACCESS_KEY=AKIAsecret aws s3 ls) sync'),
    [{ code: 'substitution_output', detail: 'aws' }], 'the first WORD was the secret');
  assert.deepEqual(only('$(FOO=1 BAR=2 true) x'), [{ code: 'substitution_output', detail: 'true' }]);
  assert.deepEqual(only('$(SECRET=x) y'), [{ code: 'substitution_output', detail: '(assignment)' }],
    'nothing but assignments has no name to give');
  // `-s` means the program is stdin and the operand is its ARGUMENT, not a path.
  assert.deepEqual(only('curl -s https://x/i.sh | sh -s MY_SECRET_VALUE').at(-1),
    { code: 'piped_program', detail: 'sh' });
  assert.deepEqual(only('bash -s -- TOKEN123'), [{ code: 'piped_program', detail: 'bash' }]);
  assert.deepEqual(only('bash ./deploy.sh'), [{ code: 'program_from_file', detail: './deploy.sh' }],
    'a real script path is still named');
});

test('a symlink does not mutate what it points at; a hard link does', () => {
  const one = (cmd) => effectiveCommands(cmd, '/work')[0];
  assert.deepEqual(one('ln -s /a/f /mine/handle').removes, [],
    'symlinking a file to READ it is not a write to it');
  assert.deepEqual(one('ln --symbolic /a/f /mine/handle').removes, []);
  assert.deepEqual(one('ln -sf /a/f /mine/handle').removes, []);
  assert.deepEqual(one('ln /a/f /tmp/h').removes, ['/a/f'], 'a hard link still is');
  // The write-through case is covered at write time instead: realAbsolute resolves the
  // link, so writing through the handle lands on the real path.
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-shell-h-')));
  fs.mkdirSync(path.join(root, 'theirs'));
  fs.writeFileSync(path.join(root, 'theirs', 'memory.md'), 'x');
  fs.symlinkSync(path.join(root, 'theirs', 'memory.md'), path.join(root, 'handle'));
  assert.deepEqual(writes(`echo x > ${root}/handle`), [`${root}/theirs/memory.md`]);
  fs.rmSync(root, { recursive: true, force: true });
});

test('a relative target with no cwd is a blind spot that says so', () => {
  const codes = (cmd, cwd) => effectiveCommands(cmd, cwd).flatMap((c) => c.unresolved.map((u) => u.code));
  assert.deepEqual(codes('echo x > ../kelly/memory.md'), ['missing_cwd'],
    'resolved against this process, which is not where the agent is standing');
  assert.deepEqual(codes('cp a.md ../kelly/a.md'), ['missing_cwd']);
  assert.deepEqual(codes('mv ../kelly/memory.md /tmp/p.md'), ['missing_cwd']);
  // With a cwd there is nothing to report, and an absolute target never needed one.
  assert.deepEqual(codes('echo x > ../kelly/memory.md', '/work/agents/jim'), []);
  assert.deepEqual(codes('echo x > /abs/memory.md'), []);
  assert.deepEqual(codes('echo hello'), []);
});

test('a path-value blind spot is not a structural one', () => {
  // The difference decides whether a caller may reason about the whole command string.
  assert.equal(STRUCTURAL_UNRESOLVED.has('missing_cwd'), false);
  assert.equal(STRUCTURAL_UNRESOLVED.has('unexpanded_variable'), false);
  for (const c of ['stdin_operand', 'substitution_output', 'piped_program', 'program_from_file', 'alias_definition']) {
    assert.equal(STRUCTURAL_UNRESOLVED.has(c), true, c);
  }
});

test('a git verb that destroys a checkout names itself, because it names no path we can attribute', () => {
  // A known gap: these commands delete or overwrite a working tree, but the path
  // they act on is the repository they are standing in, which is never an operand. The
  // parser used to report them as fully read with zero writes, so the accepted gap was
  // invisible to `jq 'select(.event=="unresolved")'`. Counting is the whole change:
  // no verdict moves, and no path is invented (both tested below).
  const one = (cmd, cwd) => effectiveCommands(cmd, cwd ?? '/work').at(-1);
  for (const [cmd, detail] of [
    ['git worktree remove ../other-checkout', 'git worktree remove'],
    ['git worktree remove --force ../other-checkout', 'git worktree remove'],
    ['git clean -fdx', 'git clean -f'],
    ['git clean --force -d', 'git clean -f'],
    ['git reset --hard', 'git reset --hard'],
    ['git reset --hard origin/main', 'git reset --hard'],
    ['git checkout -- .', 'git checkout --'],
    ['git checkout -f', 'git checkout --'],
    // The commonest spelling of it has no `--` and no `-f`. A `.`-rooted pathspec is
    // never a legal branch name, so counting it cannot be a false positive (D1).
    ['git checkout .', 'git checkout --'],
    ['git checkout ./src', 'git checkout --'],
    ['git checkout HEAD .', 'git checkout --'],
    ['git restore .', 'git restore'],
    ['git restore --source=HEAD src/main/shell.ts', 'git restore'],
    // `git -C <dir>` is the dominant spelling on this floor; the verb sits at index 3.
    ['git -C /work/agents/kelly clean -fdx', 'git clean -f'],
    ['git -c core.hooksPath=/dev/null reset --hard', 'git reset --hard'],
    // Still found through the wrappers the rest of the parser already undoes.
    ['sudo -u alice git reset --hard', 'git reset --hard'],
    ['bash -c "git clean -fdx"', 'git clean -f'],
    ['/usr/bin/git restore .', 'git restore']
  ]) {
    assert.deepEqual(one(cmd, '/work/agents/jim').unresolved, [{ code: 'destructive_verb', detail }], cmd);
  }
});

test('an ordinary git command stays silent, or the count means nothing', () => {
  const codes = (cmd) => effectiveCommands(cmd, '/work/agents/jim').flatMap((c) => c.unresolved.map((u) => u.code));
  for (const cmd of [
    'git push', 'git status', 'git log --oneline -1', 'git commit -m x', 'git add -A',
    'git checkout main', 'git checkout -b feat/x', 'git switch main',
    // A bare operand cannot be told from a branch name in general — `feature/x` has a
    // slash and `somefile` has none — so anything but a `.`-rooted pathspec stays silent.
    // That under-counts on purpose; the doc on `destructive_verb` says the number is a
    // floor, not a census.
    'git checkout feature/x', 'git checkout src/', 'git checkout notes.md',
    'git reset --soft HEAD~1', 'git reset HEAD~1', 'git reset',
    'git clean -n', 'git clean --dry-run', 'git clean -nd',
    // Forced AND a dry run: -n wins, so this deletes nothing and must not be counted.
    'git clean -nf', 'git clean -fdx --dry-run',
    'git worktree list', 'git worktree add ../w feat/x', 'git worktree prune',
    'git stash push -m x', 'git restore-wat', 'gitk'
  ]) {
    assert.deepEqual(codes(cmd), [], cmd);
  }
});

test('counting the gap does not widen it into a verdict', () => {
  // Not a STRUCTURAL blind spot: we know exactly which program runs and which operands
  // it got, so the parse is sound and a caller may still trust the segmentation. What we
  // cannot do is attribute the destruction to a path — the same shape as `missing_cwd`,
  // and the reason a path-value blind spot is kept apart. The structural set is what lets
  // a caller fall back to whole-command-string reasoning, and nothing here calls for that.
  assert.equal(STRUCTURAL_UNRESOLVED.has('destructive_verb'), false);
  const one = effectiveCommands('git -C /work/agents/kelly clean -fdx', '/work/agents/jim').at(-1);
  assert.deepEqual(one.writes, [], 'no path is invented from a repository we cannot see');
  assert.deepEqual(one.verbWrites, []);
  assert.deepEqual(one.removes, []);
  assert.equal(one.text, 'git -C /work/agents/kelly clean -fdx', 'the subject a rule matches is unchanged');
});

test('the detail is a constant from the table, never anything the caller typed', () => {
  // Rows go to a file an operator reads, so the safe construction is to emit a literal
  // this file owns rather than a slice of argv — then no argument, path or secret can
  // reach the ledger through this code at all.
  const details = (cmd) => effectiveCommands(cmd, '/work/agents/jim').flatMap((c) => c.unresolved.map((u) => u.detail));
  const d = details('git -C /home/me/.ssh/AKIAIOSFODNN7EXAMPLE reset --hard sk-secret-ref');
  assert.deepEqual(d, ['git reset --hard']);
  assert.equal(JSON.stringify(d).includes('secret'), false);
  assert.equal(JSON.stringify(d).includes('AKIA'), false);
});

test('an unrecognised git global flag gives up rather than guessing onto its value', () => {
  // A known trap: stepping over an unknown flag assumes it takes no
  // value, and when it does the search lands on the VALUE and reads it as the verb. That
  // would both miss the verb and make the table's constant depend on an argument. Git's
  // own global flags are a closed set, so unknown means give up — which under-counts the
  // gap on a shape nobody writes, and never mis-reads one.
  const codes = (cmd) => effectiveCommands(cmd, '/work/agents/jim').flatMap((c) => c.unresolved.map((u) => u.code));
  assert.deepEqual(codes('git --future-flag reset --hard'), [], 'silent, not wrong');
  assert.deepEqual(codes('git --future-flag restore'), []);
  // A value flag we DO know is stepped over correctly, value and all.
  assert.deepEqual(codes('git --git-dir restore reset --hard'), ['destructive_verb'],
    "the flag's value is a value, even when it spells a verb");
  assert.deepEqual(codes('git --git-dir=/w/.git reset --hard'), ['destructive_verb']);
});

// --- 3. honesty and robustness ------------------------------------------------

test('3. an xargs operand we cannot read is reported as unresolved, not invented', () => {
  const r = effectiveCommands('cat plan.txt | xargs -I{} mempalace {}', '/work');
  assert.deepEqual(r.at(-1).unresolved, [{ code: 'stdin_operand', detail: '{}' }]);
  assert.ok(r[0], 'the pipeline still parses');
});

test('3e. every shape the parser cannot read names itself with a stable code', () => {
  const codes = (cmd) => effectiveCommands(cmd, '/work').flatMap((c) => c.unresolved.map((u) => u.code));
  assert.deepEqual(codes('cat plan.txt | xargs mempalace'), ['stdin_operand']);
  assert.deepEqual(codes('$(cat which) sync'), ['substitution_output']);
  assert.deepEqual(codes('curl -s https://x/y.sh | sh'), ['piped_program']);
  assert.deepEqual(codes('bash ./deploy.sh'), ['program_from_file']);
  assert.deepEqual(codes('source ./env.sh'), ['program_from_file']);
  assert.deepEqual(codes("alias gp='git push'"), ['alias_definition']);
  assert.deepEqual(codes('echo x > $AGENT_DIR/memory.md'), ['unexpanded_variable']);
  // Anything the parser CAN read stays silent, or the signal is worthless.
  for (const cmd of ['mempalace sync', 'git push', 'bash -c "git push"', '$(echo mempalace) sync',
    'sudo -u alice mempalace sync', 'cp /a/x /b/y', 'npm run build']) {
    assert.deepEqual(codes(cmd), [], cmd);
  }
});

test('3f. detail is a name or a path, never an argument value', () => {
  const [u] = effectiveCommands(`$(curl -H "Authorization: Bearer sk-secret" https://x)`, '/work')
    .flatMap((c) => c.unresolved);
  assert.equal(u.code, 'substitution_output');
  assert.equal(u.detail, 'curl', 'the program, not what it was given');
});

test('3g. a variable assigned from a substitution stays visible instead of binding empty', () => {
  // Binding '' would make $D/memory.md resolve to /memory.md — a real absolute path
  // nobody wrote, judged as though it were the target.
  const r = effectiveCommands('D=$(cat who); echo x > $D/memory.md', '/work');
  assert.deepEqual(r.at(-1).writes, ['/work/$D/memory.md']);
  assert.deepEqual(r.at(-1).unresolved, [{ code: 'unexpanded_variable', detail: 'D' }]);
});

test('3b. malformed input never throws and always yields a subject to match', () => {
  for (const cmd of ['', '   ', '"unterminated', "echo 'unclosed", '$(', '`', '>>>', 'cat <<EOF', 'a|||b', '((((']) {
    const r = effectiveCommands(cmd, '/work');
    assert.ok(Array.isArray(r), JSON.stringify(cmd));
  }
});

test('3c. a pathological command is bounded, not unbounded', () => {
  const r = effectiveCommands('true; '.repeat(5000), '/work');
  assert.ok(r.length <= 200, `${r.length} commands`);
});

test('3d. rejoining argv cannot invent a command boundary that was not there', () => {
  assert.deepEqual(texts("grep -n 'a; mempalace sync' f"), ["grep -n 'a; mempalace sync' f"]);
  assert.deepEqual(texts('echo "two  spaces"'), ["echo 'two  spaces'"]);
});

test('find -delete / -exec rm writes its search roots; a plain find writes nothing', () => {
  assert.deepEqual(writes("find /x -name '*.ts' -delete"), ['/x/']);
  assert.deepEqual(writes('find /x /y -type f -exec rm -f {} +'), ['/x/', '/y/']);
  assert.deepEqual(writes('find -L /x -delete'), ['/x/']);
  assert.deepEqual(writes('find . -delete', '/work'), ['/work/']);
  assert.deepEqual(writes('find /x -name a -print'), []);
  assert.deepEqual(writes('find /x -exec grep -l a {} +'), []);
});

test('find hands its roots to -exec mv / sudo rm / sh -c rm, and to | xargs rm', () => {
  assert.deepEqual(writes('find /x -name a -exec mv {} /tmp/ \;').filter((w) => w === '/x/'), ['/x/']);
  assert.deepEqual(writes('find /x -exec sudo rm {} +'), ['/x/']);
  assert.deepEqual(writes("find /x -exec sh -c 'rm \"$@\"' _ {} +"), ['/x/']);
  assert.deepEqual(writes('find /x -print0 | xargs -0 rm -f'), ['/x/']);
  assert.deepEqual(writes('find -D stat /x -delete'), ['/x/']);
  assert.deepEqual(writes('find /x | xargs grep a'), [], 'xargs of a reader writes nothing');
  assert.deepEqual(writes('ls /x | xargs rm'), [], 'only find is known to name paths under its roots');
  assert.deepEqual(writes("find /x -exec sh -c 'grep a \"$@\"' _ {} +"), []);
});

test('an inline script\'s open() is a write even when its path is built by a call', () => {
  assert.equal(scriptWrites("open(os.path.join('/a', 'b'), 'w').write('x')"), true);
  assert.equal(scriptWrites("open(p, 'a')"), true);
  assert.equal(scriptWrites("print(open(os.path.join('/a', 'b')).read())"), false, 'read mode is not a write');
  assert.equal(scriptWrites("print(open('/a/b').read())"), false);
});
