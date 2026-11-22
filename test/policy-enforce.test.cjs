'use strict';

/*
 * Backstops that act: `block` denies a call, `ask` puts it to the operator, `log` only
 * records it. And the one rule nobody writes: with a guardrail.json present, no agent
 * may write to the policy folder, because an agent that can edit the rules makes every
 * rule advisory.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

/** The operator approved guardrail.json as it is now: what the Rules screen records
 *  after a save (guardrailEditor.ts). The approval check itself is tested in
 *  guardrail-editor.test.cjs. */
const approvedNow = (file) => {
  try { return require('node:crypto').createHash('sha256').update(fs.readFileSync(file, 'utf8')).digest('hex'); } catch { return undefined; }
};
const loadTs = require('./load-ts.cjs');

const electron = require.resolve('electron');
require.cache[electron] = { id: electron, filename: electron, loaded: true,
  exports: { Notification: class { show() {} static isSupported() { return false; } } } };

const { PolicyEngine } = loadTs('src/main/policy.ts');
const { HiveManager } = loadTs('src/main/hive.ts');
const { HookServer } = loadTs('src/core/hookServer.ts');
const { ControlRegistry } = loadTs('src/main/control.ts');

/** An engine on a throwaway hive root with an empty policy/. `rules` in the engine's own
 *  shape (loadRules), or null for no rules file at all. */
function engine(rules, defaults) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md-enforce-'));
  fs.mkdirSync(path.join(root, 'policy'), { recursive: true });
  const rows = [];
  const e = new PolicyEngine(root, (row) => rows.push(row), () => [], () => true);
  if (rules === null) e.load();
  else e.loadRules({ version: 1, ...(defaults ? { defaults } : {}), rules });
  return { e, rows, root };
}

const pre = (tool_name, tool_input, agent_id) => ({
  hook_event_name: 'PreToolUse', agent_id: agent_id ?? 'agent-a', tool_name, tool_input
});

const OWN_FOLDER_RULE = {
  id: 'cross-agent-write',
  decision: 'deny',
  mode: 'live',
  reason: 'Agent folders are owned by their agent. Write to your own outbox/ instead.',
  match: { tool: ['Write', 'Edit', 'NotebookEdit'], path_glob: '**/hive/agents/*/**', path_not_glob: '**/hive/agents/${AGENT_ID}/**' }
};
const PUSH_RULE = {
  id: 'remote-push', decision: 'ask', mode: 'live',
  reason: 'Pushing is the operator\'s decision. Commit to a branch and ask before pushing.',
  match: { tool: 'Bash', command_matches: '(^|[;&|]\\s*)git\\s+(?:-[Cc]\\s+\\S+\\s+|-{1,2}\\S+\\s+)*push\\b' }
};

// --- Decisions and modes ---------------------------------------------------------

test('a live deny rule denies, and the row says so', () => {
  const { e, rows } = engine([OWN_FOLDER_RULE]);
  const v = e.evaluate(pre('Write', { file_path: '/root/hive/agents/agent-b/notes.md' }, 'agent-a'));
  assert.deepEqual([v.decision, v.ruleId, v.mode, v.matchedOn], ['deny', 'cross-agent-write', 'live', 'path_glob']);
  const row = rows.find((r) => r.kind === 'policy-match');
  assert.deepEqual([row.decision, row.mode, row.would_deny], ['deny', 'live', false]);
});

test('a live ask rule asks, never denies', () => {
  const { e } = engine([PUSH_RULE]);
  assert.equal(e.evaluate(pre('Bash', { command: 'cd /repo && git push origin main' })).decision, 'ask');
});

test('dry_run records what live would do, and allows; it is the default when a rule omits mode', () => {
  for (const rule of [{ ...OWN_FOLDER_RULE, mode: 'dry_run' }, { ...OWN_FOLDER_RULE, mode: undefined }]) {
    const { e, rows } = engine([rule]);
    const v = e.evaluate(pre('Write', { file_path: '/root/hive/agents/agent-b/x.md' }, 'agent-a'));
    assert.deepEqual([v.decision, v.wouldDeny], ['allow', true]);
    assert.equal(rows.find((r) => r.kind === 'policy-match').would_deny, true);
  }
});

test('defaults.mode applies to rules that omit mode', () => {
  const { e } = engine([{ ...OWN_FOLDER_RULE, mode: undefined }], { mode: 'live' });
  assert.equal(e.evaluate(pre('Write', { file_path: '/root/hive/agents/agent-b/x.md' }, 'agent-a')).decision, 'deny');
});

test('decision and mode are checked at load', () => {
  assert.match(engine([{ ...OWN_FOLDER_RULE, decision: 'nuke' }]).e.error, /decision must be deny or ask/);
  assert.match(engine([{ ...OWN_FOLDER_RULE, mode: 'loud' }]).e.error, /mode must be dry_run or live/);
});

test('on_error deny on a live rule denies; on a dry_run rule it only records', () => {
  for (const [mode, decision] of [['live', 'deny'], ['dry_run', 'allow']]) {
    const { e } = engine([{ id: 'boom', mode, on_error: 'deny', reason: 'r', match: { tool: 'Bash', command_matches: 'x' } }]);
    e.rules[0].match = { tool: 'Bash', command_matches: '(' }; // load checks regexes, so break it after
    assert.equal(e.evaluate(pre('Bash', { command: 'ls' })).decision, decision, mode);
  }
});

test('record: false applies the verdict but writes no row', () => {
  const { e, rows } = engine([OWN_FOLDER_RULE]);
  const v = e.evaluate(pre('Write', { file_path: '/root/hive/agents/agent-b/notes.md' }, 'agent-a'), { record: false });
  assert.equal(v.decision, 'deny');
  assert.equal(rows.filter((r) => /^policy-(match|unresolved)$/.test(r.kind)).length, 0);
});

// --- Self-protection: an agent may not edit the rules ------------------------------

test('5. writing the policy file is denied even with NO rules loaded', () => {
  const { e, root } = engine([]);
  const v = e.evaluate(pre('Write', { file_path: path.join(root, 'policy', 'guardrail.json') }, 'agent-a'));
  assert.equal(v.decision, 'deny');
  assert.equal(v.ruleId, 'policy-self-protection');
  assert.equal(v.mode, 'live', 'self-protection is never dry-run');
});

test('5b. writing anything else in the policy DIRECTORY is denied too', () => {
  const { e, root } = engine([]);
  const v = e.evaluate(pre('Write', { file_path: path.join(root, 'policy', 'sneaky.json') }, 'agent-a'));
  assert.equal(v.ruleId, 'policy-self-protection');
});

test('5c. a bash redirect into the policy dir is denied; READING it is not', () => {
  const { e, root } = engine([]);
  const dir = path.join(root, 'policy');
  assert.equal(e.evaluate(pre('Bash', { command: `echo '{}' > ${dir}/guardrail.json` })).decision, 'deny');
  assert.equal(e.evaluate(pre('Bash', { command: `rm -rf ${dir}` })).decision, 'deny');
  // An agent should be able to read the rule it just tripped.
  assert.equal(e.evaluate(pre('Bash', { command: `cat ${dir}/guardrail.json` })).decision, 'allow');
  assert.equal(e.evaluate(pre('Bash', { command: `grep -n deny ${dir}/guardrail.json` })).decision, 'allow');
});

test('5d. self-protection is NOT armed when unconfigured', () => {
  const { e } = engine(null);
  assert.equal(e.evaluate(pre('Write', { file_path: '/anything/policy/guardrail.json' })).decision, 'allow');
});

test('12k. self-protection catches a write to the policy file through an inline script', () => {
  const { e, root } = engine([]);
  const target = path.join(root, 'policy', 'guardrail.json');
  const v = e.evaluate(pre('Bash', { command: `node -e "require('fs').writeFileSync('${target}','{}')"` }));
  assert.equal(v.decision, 'deny');
  assert.equal(v.ruleId, 'policy-self-protection');
});

test('12l. self-protection still lets an agent READ the rule it just tripped', () => {
  const { e, root } = engine([]);
  const target = path.join(root, 'policy', 'guardrail.json');
  for (const command of [`cat ${target}`, `grep -n cross-agent ${target}`, `head -5 ${target}`]) {
    assert.equal(e.evaluate(pre('Bash', { command })).decision, 'allow', command);
  }
});

// --- Self-protection is scoped to one command segment -----------------------------

test('15. the policy files cannot be written, by any mechanism in this list', () => {
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  for (const command of [
    `echo '{}' > ${D}/guardrail.json`,
    `echo x >> ${D}/guardrail.json`,
    `rm -rf ${D}`,
    `rm ${D}/guardrail.json`,
    `sed -i '' s/deny/allow/ ${D}/guardrail.json`,
    `sed --in-place s/deny/allow/ ${D}/guardrail.json`,
    `sudo -u alice sed -i '' s/deny/allow/ ${D}/guardrail.json`,
    `nice -n 5 rm ${D}/guardrail.json`,
    `cp evil.json ${D}/guardrail.json`,
    `cp -t ${D} evil.json`,
    `mv evil.json ${D}/guardrail.json`,
    `tee ${D}/guardrail.json < evil.json`,
    `touch ${D}/OFF`,
    `mkdir -p ${D}/sub`,
    `chmod 777 ${D}/guardrail.json`,
    `truncate -s 0 ${D}/guardrail.json`,
    `dd if=/dev/null of=${D}/guardrail.json`,
    `ln -sf evil.json ${D}/guardrail.json`,
    `rsync -a ./evil/ ${D}/`,
    `install -m 644 evil.json ${D}/guardrail.json`,
    `tar -xzf evil.tgz -C ${D}`,
    `cd ${D} && cp evil.json guardrail.json`,
    `bash -c "rm ${D}/guardrail.json"`,
    `node -e "require('fs').writeFileSync('${D}/guardrail.json','{}')"`,
    `python3 -c "open('${D}/guardrail.json','w').write('{}')"`,
    `python3 -c "import os; os.system('rm ${D}/guardrail.json')"`,
    // The per-segment heuristic, earning its keep: a verb the parser does not table,
    // so there is no extracted target and the string is all we have.
    `busybox sed -i s/deny/allow/ ${D}/guardrail.json`,
    // The fallback: verb and path in DIFFERENT segments, and a segment the parser
    // admits it could not read — so the segmentation cannot be trusted.
    `cat plan.txt | xargs rm && wc -l ${D}/guardrail.jsonl`
  ]) {
    const v = e.evaluate(pre('Bash', { command }, 'agent-a'));
    assert.equal(v.decision, 'deny', command);
    assert.equal(v.ruleId, 'policy-self-protection', command);
  }
});

test('15b. policy-adjacent work is not denied because a verb sits elsewhere in the string', () => {
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  for (const command of [
    // The false positive this narrowing is for: two unrelated segments.
    `cp verdicts-after.json verdicts-before.json && wc -l ${D}/guardrail.jsonl`,
    `rm /tmp/scratch.json && grep -c firing ${D}/guardrail.jsonl`,
    `mkdir -p /tmp/out && jq . ${D}/guardrail.jsonl > /tmp/out/x.json`,
    `cp /tmp/a /tmp/b && cat ${D}/guardrail.json`,
    // Copying the rules OUT is a read: the verb's target WAS resolved, and it is
    // somewhere else, so there is nothing left to guess about.
    `cp ${D}/guardrail.json /tmp/mine.json`,
    `tail -5 ${D}/guardrail.jsonl > /tmp/tail.txt`,
    // Reading the rule you just tripped, every ordinary way.
    `cat ${D}/guardrail.json`,
    `grep -n cross-agent ${D}/guardrail.json`,
    `head -5 ${D}/guardrail.json`,
    `jq '.rules[].id' ${D}/guardrail.json`,
    `diff ${D}/guardrail.json /tmp/copy.json`,
    `node -e "console.log(require('fs').readFileSync('${D}/guardrail.json','utf8'))"`,
    `python3 -c "print(open('${D}/guardrail.json').read())"`,
    `echo "do not edit ${D}/guardrail.json"`
  ]) {
    assert.equal(e.evaluate(pre('Bash', { command }, 'agent-a')).decision, 'allow', command);
  }
});

// --- A review set of attacks on the policy files, kept as a regression gate --------
//
// Written to attack the narrowing rather than the rule. The ones a verb table could
// never catch (`ed -s`, `ex -sc`, `vim -es`, `python3 -m json.tool`, an inline script
// whose path is built at run time) are closed by the inverted default for this one
// directory (POLICY_READ_VERBS), not by another table entry.

test('16. every attack on the policy files in the review set stops', () => {
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  for (const [name, command] of [
    // A1/A2 — a redirect must not buy its way past the string heuristic by giving the
    // segment a resolved target the VERB never produced.
    ['A1 untabled verb + harmless redirect', `busybox sed -i s/deny/allow/ ${D}/guardrail.json > /dev/null`],
    ['A2 untabled verb + decoy redirect', `busybox sed -i s/deny/allow/ ${D}/guardrail.json 2> /tmp/err.log`],
    ['A3 perl -i with a decoy redirect', `perl -i -pe s/deny/allow/ ${D}/guardrail.json > /tmp/out`],
    // A5/A6/A8 — taking the rules AWAY disables every rule on the floor.
    ['A5 move the policy file away', `mv ${D}/guardrail.json /tmp/parked.json`],
    ['A6 move the whole policy dir away', `mv ${D} /tmp/parked-policy`],
    ['A7 install out, then remove', `install ${D}/guardrail.json /tmp/p.json && rm ${D}/guardrail.json`],
    ['A8 hardlink then truncate the link', `ln ${D}/guardrail.json /tmp/h && truncate -s 0 /tmp/h`],
    ['A9 perl -i in place', `perl -i -pe s/deny/allow/ ${D}/guardrail.json`],
    ['A13 gsed in place (homebrew basename)', `gsed -i s/deny/allow/ ${D}/guardrail.json`],
    ['A14 busybox sed, no decoy', `busybox sed -i s/deny/allow/ ${D}/guardrail.json`],
    ['A18 plain redirect', `echo '{}' > ${D}/guardrail.json`],
    ['A19 sudo -u sed', `sudo -u alice sed -i '' s/deny/allow/ ${D}/guardrail.json`],
    ['A20 rm the file', `rm ${D}/guardrail.json`],
    ['A21 cp over it', `cp /tmp/evil.json ${D}/guardrail.json`],
    // The seven a verb table could not reach, closed by the inverted default.
    ['A4 ed -s in place', `printf '1d\\nw\\n' | ed -s ${D}/guardrail.json > /tmp/o`],
    ['A10 ex -sc in place', `ex -sc '%d|x' ${D}/guardrail.json`],
    ['A11 vim -es in place', `vim -es -c '%d' -c wq ${D}/guardrail.json`],
    ['A12 python3 -m json.tool over it', `python3 -m json.tool /tmp/evil.json ${D}/guardrail.json`],
    ['A15 inline script, path in a const', `node -e "const P='${D}/guardrail.json'; require('fs').writeFileSync(P,'{}')"`],
    ['A16 inline script, path in a var', `python3 -c "p='${D}/guardrail.json'; open(p,'w').write('{}')"`],
    ['A17 inline script, path.join', `node -e "const j=require('path').join('${D}','guardrail.json'); require('fs').writeFileSync(j,'{}')"`],
    // A22-A25 — the wrapper value-flag bugs, per rule as well as per invariant.
    ['A22 sudo long flag first, then -u', `sudo --preserve-env=PATH -u alice rm ${D}/guardrail.json`],
    ['A23 env -u wrapper', `env -u HOME rm ${D}/guardrail.json`],
    ['A24 timeout -s wrapper', `timeout -s KILL 5 rm ${D}/guardrail.json`],
    ['A25 xargs -L wrapper', `echo ${D}/guardrail.json | xargs -L 1 rm`]
  ]) {
    const v = e.evaluate(pre('Bash', { command }, 'agent-a'));
    assert.equal(v.decision, 'deny', name);
    assert.equal(v.ruleId, 'policy-self-protection', name);
  }
});

test('16b. and the reads it must not stop, it does not', () => {
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  for (const [name, command] of [
    ['R1 read while writing elsewhere', `wc -l ${D}/guardrail.jsonl > /tmp/count.txt`],
    ['R2 unrelated write then read', `cp /tmp/a /tmp/b && wc -l ${D}/guardrail.jsonl`],
    ['R3 copy the rules out', `cp ${D}/guardrail.json /tmp/mine.json`],
    ['R4 archive the dir', `tar -czf /tmp/p.tgz -C ${root} policy`],
    ['R5 mention it', `echo "never edit ${D}/guardrail.json"`],
    ['R6 grep the ledger', `grep -c firing ${D}/guardrail.jsonl`]
  ]) {
    assert.equal(e.evaluate(pre('Bash', { command }, 'agent-a')).decision, 'allow', name);
  }
});

test('16c. a verb that takes its source away mutates where the source WAS', () => {
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  // mv and ln, yes; cp no, because reading a file to copy it IS a read.
  assert.equal(e.evaluate(pre('Bash', { command: `mv ${D}/guardrail.json /tmp/x` })).decision, 'deny');
  assert.equal(e.evaluate(pre('Bash', { command: `mv -t /tmp ${D}/guardrail.json` })).decision, 'deny');
  assert.equal(e.evaluate(pre('Bash', { command: `ln ${D}/guardrail.json /tmp/h` })).decision, 'deny');
  assert.equal(e.evaluate(pre('Bash', { command: `rsync -a --remove-source-files ${D}/ /tmp/p/` })).decision, 'deny');
  assert.equal(e.evaluate(pre('Bash', { command: `cp ${D}/guardrail.json /tmp/x` })).decision, 'allow');
});

// --- The policy directory's inverted default --------------------------------------

test('19. an editor nobody has ever heard of cannot touch the policy files', () => {
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  // The point of the inversion: this is not a verb anyone tabled, and it never will be.
  for (const command of [
    `frobnicate --in-place ${D}/guardrail.json`,
    `my-cool-editor -w ${D}/guardrail.json`,
    `qed ${D}/guardrail.json`,
    `/opt/homebrew/bin/some-future-sed -i s/deny/allow/ ${D}/guardrail.json`,
    `npx some-json-rewriter ${D}/guardrail.json`,
    `emacs --batch ${D}/guardrail.json -f save-buffer`
  ]) {
    const v = e.evaluate(pre('Bash', { command }, 'agent-a'));
    assert.equal(v.decision, 'deny', command);
    assert.equal(v.ruleId, 'policy-self-protection', command);
  }
});

test('19b. every verb on the read allowlist can still read the rules', () => {
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  const f = `${D}/guardrail.json`;
  for (const command of [
    `cat ${f}`, `head -20 ${f}`, `tail -5 ${f}`, `nl ${f}`, `wc -l ${f}`,
    `grep -n cross-agent ${f}`, `egrep 'deny|ask' ${f}`,
    `jq '.rules[].id' ${f}`, `diff ${f} /tmp/copy.json`,
    `cmp ${f} /tmp/copy.json`, `cut -c1-40 ${f}`,
    `ls -la ${D}`, `find ${D} -name '*.json'`, `stat ${f}`, `du -sh ${D}`,
    `shasum ${f}`, `md5 ${f}`, `realpath ${f}`, `basename ${f}`, `dirname ${f}`,
    `cp ${f} /tmp/mine.json`,
    `echo ${f}`, `printf '%s\n' ${f}`, `cd ${D}`,
    // An interpreter is judged by its script: reading is fine.
    `node -e "console.log(require('fs').readFileSync('${f}','utf8'))"`,
    `python3 -c "print(open('${f}').read())"`,
    `python3 -c "import sys; sys.stdout.write(open('${f}').read())"`
  ]) {
    assert.equal(e.evaluate(pre('Bash', { command }, 'agent-a')).decision, 'allow', command);
  }
});

test('19c. an interpreter is judged by its script, not by its name', () => {
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  const f = `${D}/guardrail.json`;
  // Writes, even with the path assembled at run time and no literal target to extract.
  for (const command of [
    `node -e "const P='${f}'; require('fs').writeFileSync(P,'{}')"`,
    `python3 -c "p='${f}'; open(p,'w').write('{}')"`,
    `python3 -c "import shutil; shutil.copy('/tmp/evil.json','${f}')"`,
    `node -e "require('fs').unlinkSync('${f}')"`,
    `sh -c "rm ${f}"`
  ]) {
    assert.equal(e.evaluate(pre('Bash', { command }, 'agent-a')).decision, 'deny', command);
  }
  // Reads, including the one whose `.write(` is a print.
  for (const command of [
    `node -e "console.log(require('fs').readFileSync('${f}'))"`,
    `python3 -c "import sys; sys.stdout.write(open('${f}','r').read())"`,
    `node -e "const r=/deny/.exec(require('fs').readFileSync('${f}','utf8'))"`
  ]) {
    assert.equal(e.evaluate(pre('Bash', { command }, 'agent-a')).decision, 'allow', command);
  }
});

test('19e. a mention of the policy path is not an attempt on it', () => {
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  for (const command of [
    `echo "never edit ${D}/guardrail.json"`,
    `git commit -m "document ${D}/guardrail.json"`,
    `echo 'see ${D}/README.md for the rules' >> /tmp/notes.md`
  ]) {
    assert.equal(e.evaluate(pre('Bash', { command }, 'agent-a')).decision, 'allow', command);
  }
});

test('19f. a segment that names the policy dir and could not be read fails closed', () => {
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  for (const command of [
    `cat plan.txt | xargs cat ${D}/guardrail.json`,
    `$(cat which) ${D}/guardrail.json`
  ]) {
    assert.equal(e.evaluate(pre('Bash', { command }, 'agent-a')).decision, 'deny', command);
  }
});

test('20c. missing_cwd does not re-arm the whole-string policy heuristic', () => {
  // The regression this guards: every ordinary `cp a b` with no cwd looked structurally
  // unreadable, which fell back to the whole string and denied a policy READ beside it.
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  assert.equal(e.evaluate(pre('Bash', { command: `cp a.json b.json && wc -l ${D}/guardrail.jsonl` })).decision,
    'allow');
  assert.equal(e.evaluate(pre('Bash', { command: `rm scratch.json && cat ${D}/guardrail.json` })).decision,
    'allow');
  assert.equal(e.evaluate(pre('Bash', { command: `cp ${D}/guardrail.json mine.json` })).decision,
    'allow', 'copying the rules out with a relative destination is still a read');
});

test('20d. find is a reader until it is given a mutating action', () => {
  const { e, root } = engine([]);
  const D = path.join(root, 'policy');
  for (const command of [`find ${D} -name '*.json'`, `find ${D} -type f`, `find ${D} -newer /tmp/x`]) {
    assert.equal(e.evaluate(pre('Bash', { command }, 'agent-a')).decision, 'allow', command);
  }
  for (const command of [
    `find ${D} -delete`,
    `find ${D} -name '*.json' -delete`,
    `find ${D} -name '*.json' -exec truncate -s 0 {} +`,
    `find ${D} -execdir rm {} ;`,
    `find ${D} -fprint /tmp/out`
  ]) {
    assert.equal(e.evaluate(pre('Bash', { command }, 'agent-a')).decision, 'deny', command);
  }
});

// --- Through the hook server -------------------------------------------------------

async function floor(t, rules) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-enforce-hook-')));
  t.after(() => fs.rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'god', name: 'God', provider: 'claude', cwd: home, isGod: true });
  await hive.ensureAgent({ id: 'jim-1', name: 'Jim', provider: 'claude', cwd: home });
  fs.mkdirSync(path.join(hive.root(), 'policy'), { recursive: true });
  fs.writeFileSync(path.join(hive.root(), 'policy', 'guardrail.json'), JSON.stringify({ version: 1, rev: 1, rules }));
  const server = new HookServer(hive, () => null, () => ({ harnessHome: home, guardrail: true, guardrailApproved: approvedNow(path.join(hive.root(), 'policy', 'guardrail.json')) }), undefined, undefined);
  const logRows = () => fs.readFileSync(path.join(hive.root(), 'log.jsonl'), 'utf8').trim().split('\n').map((l) => JSON.parse(l));
  const send = (command, tool = 'Bash', input = { command }) => server.handle({
    hook_event_name: 'PreToolUse', agent_id: 'jim-1', session_id: 's', tool_name: tool, tool_input: input, cwd: home,
  });
  return { hive, server, send, logRows };
}
const backstop = (id, does, command_matches, message) => ({
  id, principle: `Principle ${id}.`, agents: 'all', backstop: { on: true, does, match: { tool: 'Bash', command_matches }, ...(message ? { message } : {}) },
});

test('hook: block denies with the rule id and its message; ask is refused onto the Approvals card; log changes nothing', async (t) => {
  const f = await floor(t, [backstop('no-sync', 'block', '^mempalace +sync', 'Do not sync.'), backstop('push', 'ask', '^git +push'), backstop('ls', 'log', '^ls')]);
  assert.deepEqual((await f.send('sudo mempalace sync')).hookSpecificOutput,
    { hookEventName: 'PreToolUse', permissionDecision: 'deny', permissionDecisionReason: '[policy:no-sync] Do not sync.' });
  const asked = (await f.send('git push origin main')).hookSpecificOutput;
  assert.equal(asked.permissionDecision, 'deny');
  assert.match(asked.permissionDecisionReason, /^\[policy:push\] Principle push\. Not run: this needs the operator's OK\. Request ap-[0-9a-f]{12} is on the Approvals card in ASK ME\./);
  assert.deepEqual(await f.send('ls -la'), {});
  assert.deepEqual(await f.send('pwd'), {});
  const kinds = f.logRows().filter((r) => r.kind === 'policy-match').map((r) => `${r.rule_id}:${r.decision}`);
  assert.deepEqual(kinds, ['no-sync:deny', 'push:ask', 'ls:allow']);
});

test('hook: an ask is the same refusal for a Codex agent as for a Claude agent', async (t) => {
  const f = await floor(t, [backstop('push', 'ask', '^git +push')]);
  await f.hive.ensureAgent({ id: 'cody-1', name: 'Cody', provider: 'codex', cwd: f.hive.root() });
  const codex = await f.server.handle({
    hook_event_name: 'PreToolUse', agent_id: 'cody-1', session_id: 's', tool_name: 'Bash', tool_input: { command: 'git push origin main' }, cwd: f.hive.root(),
  });
  assert.equal(codex.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(codex.hookSpecificOutput.permissionDecisionReason, /^\[policy:push\] .*on the Approvals card in ASK ME/);
  assert.equal((await f.send('git push origin main')).hookSpecificOutput.permissionDecision, 'deny', 'a Claude agent is refused the same way');
});

test('hook: with a guardrail.json, writing it is denied even with no backstops on', async (t) => {
  const f = await floor(t, []);
  const file = path.join(f.hive.root(), 'policy', 'guardrail.json');
  const reply = await f.send('', 'Write', { file_path: file, content: '{}' });
  assert.equal(reply.hookSpecificOutput.permissionDecision, 'deny');
  assert.match(reply.hookSpecificOutput.permissionDecisionReason, /^\[policy:policy-self-protection\]/);
  assert.deepEqual(await f.send(`cat ${file}`), {}, 'reading the rules is fine');
});

// --- The second review's probe set: one ordinary command each -------------------

/** A hive root that is also a git repo dir, with policy/ inside, as the app makes it. */
function hiveEngine() {
  const base = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-enforce-hive-')));
  const root = path.join(base, 'hive');
  fs.mkdirSync(path.join(root, 'policy'), { recursive: true });
  fs.writeFileSync(path.join(root, 'policy', 'guardrail.json'), '{}');
  const e = new PolicyEngine(root, () => {}, () => [], () => true);
  e.loadRules({ version: 1, rules: [] });
  return { e, base, root, D: path.join(root, 'policy'), G: path.join(root, 'policy', 'guardrail.json') };
}

test('16d. a reader with a write mode, a git rollback, an ancestor removal, a hive-root script: all denied', () => {
  const { e, base, root, G } = hiveEngine();
  const bash = (command, cwd = base) => e.evaluate({ ...pre('Bash', { command }, 'agent-a'), cwd }).decision;
  for (const command of [
    // readers with a write mode
    `sort -o ${G} /tmp/x`, `uniq /tmp/x ${G}`, `yq -i '.rules=[]' ${G}`, `plutil -remove rules ${G}`,
    `xxd -r /tmp/x ${G}`, `gawk -i inplace '{print}' ${G}`, `sed -n 'w ${G}' /tmp/x`,
    `xmllint --output ${G} /tmp/x`, `xmllint --output=${G} /tmp/x`, `zip -m /tmp/z.zip ${G}`, `tar --remove-files -cf /tmp/t.tar ${G}`,
    // rolling the rules back through the hive's own git
    `git -C ${root} checkout HEAD~1 -- policy/guardrail.json`, `cd ${root} && git checkout HEAD~1 -- policy/`,
    `git -C ${root} stash -u`, `git -C ${root} reset --hard HEAD~3`, `git --work-tree=${root} restore policy`,
    `git --git-dir=${root}/.git checkout -- .`, `git -C ${root}/policy clean -fdx`,
    // taking away a folder that contains the policy folder
    `rm -rf ${root}`, `mv ${root} /tmp/h`, `rm -rf ${base}`,
    // a script that writes and names the hive root, with the rest built at run time
    `python3 -c "import os; open(os.path.join('${root}','policy','guardrail.json'),'w').write('{}')"`,
    `node -e "require('fs').writeFileSync('${root}'+'/pol'+'icy/guardrail.json','{}')"`,
  ]) {
    assert.equal(bash(command), 'deny', command);
  }
  // The same rollback typed from inside the hive.
  assert.equal(bash('git checkout HEAD~1 -- policy/guardrail.json', root), 'deny');
  assert.equal(bash('git stash', root), 'deny');
});

/** A real git repository (HEAD, objects, refs), as an agent's clone in its own folder. */
function nestedRepo(own) {
  const repo = path.join(own, 'work', 'project');
  for (const d of ['objects', 'refs/heads']) fs.mkdirSync(path.join(repo, '.git', d), { recursive: true });
  fs.writeFileSync(path.join(repo, '.git', 'HEAD'), 'ref: refs/heads/main\n');
  return repo;
}

test('16f. git run from anywhere inside the hive, or pointed at it, cannot roll the rules back', () => {
  const { e, base, root } = hiveEngine();
  const own = path.join(root, 'agents', 'agent-a');
  fs.mkdirSync(own, { recursive: true });
  const bash = (command, cwd = base) => e.evaluate({ ...pre('Bash', { command }, 'agent-a'), cwd }).decision;
  // Git walks up to the hive's repository from an agent's own folder.
  assert.equal(bash('git reset --hard HEAD~3', own), 'deny');
  assert.equal(bash('git stash -u', own), 'deny');
  for (const command of [
    `git -C ${own} reset --hard HEAD~3`, `cd ${own} && git checkout HEAD~1 -- ${root}`,
    `git -C /tmp checkout HEAD~1 -- ${root}`,
    // the repository named in the environment
    `GIT_DIR=${root}/.git GIT_WORK_TREE=${root} git reset --hard`, `env GIT_DIR=${root}/.git git stash -u`,
    `export GIT_WORK_TREE=${root}; git -C /tmp/r checkout -- .`,
    // pushd moves like cd
    `pushd ${root}; git stash -u`,
    // a setting that turns a later git command into a rewrite
    `git -C ${own} config alias.undo 'reset --hard HEAD~1'`, `git -C /tmp/r config core.worktree ${root}`,
    `git -C ${root} -c alias.x='!rm policy/guardrail.json' x`, `git -C /tmp/r -c core.worktree=${root} reset --hard`,
    `git -C ${root} -c core.hooksPath=/tmp/hooks commit -m x`,
  ]) {
    assert.equal(bash(command), 'deny', command);
  }
  // A repository named by a value that cannot be read counts as the hive's.
  assert.equal(bash('GIT_DIR=$H/.git git reset --hard', '/tmp'), 'deny');
  // A repository nested in the hive is not trusted to stop git on its way up: the same
  // command can remove its `.git` first, and a `.git` can be a file or a link that
  // points at the hive's. So git that changes files is denied anywhere in the hive.
  const clone = nestedRepo(own);
  const fake = path.join(own, 'fake'), linked = path.join(own, 'linked'), symlinked = path.join(own, 'symlinked');
  fs.mkdirSync(path.join(fake, '.git'), { recursive: true });
  fs.mkdirSync(linked, { recursive: true });
  fs.writeFileSync(path.join(linked, '.git'), `gitdir: ${root}/.git\n`);
  fs.mkdirSync(symlinked, { recursive: true });
  fs.symlinkSync(path.join(root, '.git'), path.join(symlinked, '.git'));
  for (const command of [
    `cd ${clone} && rm -rf .git && git reset --hard HEAD~1`,
    `cd ${clone} && mv .git /tmp/away && git checkout HEAD~1 -- .`,
    `rm -rf ${clone}/.git; git -C ${clone} reset --hard HEAD~1`,
    `python3 -c "import shutil; shutil.rmtree('${clone}/.git')" && git -C ${clone} stash -u`,
    `git -C ${clone} reset --hard HEAD~1`, `git -C ${fake} reset --hard HEAD~1`,
    `git -C ${linked} reset --hard HEAD~1`, `git -C ${symlinked} reset --hard HEAD~1`,
    `git -C ${clone} --work-tree=${root} reset --hard`, `git -C ${clone} checkout HEAD~1 -- ${root}`,
  ]) {
    assert.equal(bash(command), 'deny', command);
  }
});

test('16g. a hard link out of the policy folder is a write to it', () => {
  // Another name for the rules file, outside the folder, writes straight through to it.
  const { e, base, root, D, G } = hiveEngine();
  const own = path.join(root, 'agents', 'agent-a');
  const bash = (command, cwd = base) => e.evaluate({ ...pre('Bash', { command }, 'agent-a'), cwd }).decision;
  for (const command of [
    `cp -l ${G} ${own}/x`, `cp --link ${G} ${own}/x`, `cp -Rl ${D} ${own}/p`, `cp -al ${D} ${own}/p`,
    `cpio -pl ${own} <<< ${G}`, `echo ${G} | cpio -pdl ${own}`, `find ${D} -name '*.json' | cpio -pl ${own}`,
    `echo ${G} | pax -rwl ${own}`,
    `ln ${G} ${own}/x`, `link ${G} ${own}/x`, `ln -f ${G} ${own}/x`,
    `python3 -c "import os; os.link('${G}', '${own}/x')"`, `rsync --link-dest=${D} ${G} ${own}/`,
  ]) {
    assert.equal(bash(command), 'deny', command);
  }
  // Copies out and links elsewhere stay allowed.
  for (const command of [`cp ${G} ${own}/copy.json`, `cp -R ${D} ${own}/copy`, `cp -L ${G} ${own}/copy.json`,
    `cp -l /tmp/a ${own}/b`, `echo /tmp/a | cpio -pl ${own}`]) {
    assert.equal(bash(command), 'allow', command);
  }
});

test('16e. and the neighbours of those stay allowed', () => {
  const { e, base, root, G } = hiveEngine();
  const other = path.join(base, 'repo');
  const bash = (command, cwd = base) => e.evaluate({ ...pre('Bash', { command }, 'agent-a'), cwd }).decision;
  for (const command of [
    `git -C ${other} checkout -- .`, `cd ${other} && git stash -u && git reset --hard`, `git -C ${root} log --oneline -5`,
    `git -C ${root} status`, `git -C ${root} diff HEAD~1 -- policy/`, `git -C ${root} show HEAD:policy/guardrail.json`,
    `rm -rf ${base}/other`, `mv ${other} /tmp/r`, `rm -rf ${root}/agents/agent-a/tmp`,
    `python3 -c "import os; print(os.listdir('${root}'))"`, `node -e "console.log(require('fs').readdirSync('${root}'))"`,
    `python3 -c "open('/tmp/out.txt','w').write('x')"`, `sort /tmp/a -o /tmp/b`, `cat ${G}`,
    // git outside the hive, or reading inside it
    `pushd ${other}; git stash -u`, `git -C ${other} config alias.st status`,
    `git -C ${other} config core.worktree ${other}/wt`, `git -C ${root} config --get core.worktree`,
    `cd ${root}/agents/agent-a && git status && git log -3`, `git -C ${root} -c color.ui=never diff`,
  ]) {
    assert.equal(bash(command), 'allow', command);
  }
  assert.equal(bash(`GIT_DIR=${other}/.git git reset --hard`, other), 'allow');
  // Reading in a project an agent cloned into its own folder still works. Changing its
  // files with git does not (stated limit, see 16f).
  const clone = nestedRepo(path.join(root, 'agents', 'agent-a'));
  assert.equal(bash(`git -C ${clone} status && git -C ${clone} log -3`), 'allow');
  assert.equal(bash('git diff', clone), 'allow');
});

// --- A Claude Code subagent answers as the agent that launched it ----------------

test('hook: a subagent is judged as its agent: own folder exempt, scoped rules apply, rows under the agent', async (t) => {
  const own = { id: 'own-folder', principle: 'Only your own folder.', agents: 'all',
    backstop: { on: true, does: 'block', match: { tool: ['Write'], path_glob: '**/hive/agents/*/**', path_not_glob: '**/hive/agents/${AGENT_ID}/**' } } };
  const jimOnly = { id: 'jim-no-sync', principle: 'Jim never syncs.', agents: ['jim-1'],
    backstop: { on: true, does: 'block', match: { tool: 'Bash', command_matches: '^mempalace +sync' } } };
  const f = await floor(t, [own, jimOnly]);
  const events = [];
  f.server.onEvent = (a, ev) => events.push(`${a} ${ev}`);
  const sub = (tool, input, extra = {}) => f.server.handle({
    hook_event_name: 'PreToolUse', agent_id: 'sub-1234', hive_agent: 'jim-1', agent_type: 'general-purpose', session_id: 's', tool_name: tool, tool_input: input, cwd: f.hive.root(), ...extra,
  });
  const mine = path.join(f.hive.root(), 'agents', 'jim-1', 'notes.md');
  assert.deepEqual(await sub('Write', { file_path: mine, content: 'x' }), {}, 'its agent\'s own folder is exempt');
  const theirs = await sub('Write', { file_path: path.join(f.hive.root(), 'agents', 'god', 'notes.md'), content: 'x' });
  assert.equal(theirs.hookSpecificOutput.permissionDecision, 'deny');
  assert.equal((await sub('Bash', { command: 'mempalace sync' })).hookSpecificOutput.permissionDecision, 'deny', 'a rule for jim binds jim\'s subagents');
  const rows = f.logRows().filter((r) => r.kind === 'policy-match');
  assert.deepEqual(rows.map((r) => `${r.agent_id}:${r.rule_id}`), ['jim-1:own-folder', 'jim-1:jim-no-sync']);
  assert.deepEqual(events, [], 'a subagent is not a floor agent: nothing reaches the floor');
});

test('hook: over HTTP the URL names the agent; a hive_agent in the body is ignored', async (t) => {
  const jimOnly = { id: 'jim-no-sync', principle: 'Jim never syncs.', agents: ['jim-1'],
    backstop: { on: true, does: 'block', match: { tool: 'Bash', command_matches: '^mempalace +sync' } } };
  const f = await floor(t, [jimOnly]);
  const ep = await f.server.startHttp();
  t.after(() => f.server.stopHttp());
  const http = require('node:http');
  const post = (agent, body) => new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port: ep.port, path: `/hook/${agent}`, method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${ep.token}` } }, (res) => {
      let out = ''; res.on('data', (d) => { out += d; }); res.on('end', () => resolve(JSON.parse(out || '{}')));
    });
    req.on('error', reject); req.end(JSON.stringify(body));
  });
  const sync = { hook_event_name: 'PreToolUse', agent_id: 'sub-77', agent_type: 'general-purpose', session_id: 's', tool_name: 'Bash', tool_input: { command: 'mempalace sync' }, cwd: f.hive.root() };
  // Jim's sub agent, sent by Jim's CLI to Jim's URL: jim's rule binds it, whatever the body claims.
  assert.equal((await post('jim-1', { ...sync, hive_agent: 'god' })).hookSpecificOutput?.permissionDecision, 'deny');
  // The same call at god's URL is judged as god, whom the rule does not name.
  assert.equal((await post('god', sync)).hookSpecificOutput, undefined);
});

test('hook: a subagent\'s hooks still reach the facts observer (switchClear counts SubagentStop)', async (t) => {
  const f = await floor(t, []);
  const facts = [];
  f.server.onFacts = (h) => facts.push(`${h.agentId} ${h.event}`);
  await f.server.handle({ hook_event_name: 'SubagentStop', agent_id: 'sub-5', hive_agent: 'jim-1', agent_type: 'general-purpose', session_id: 's' });
  assert.deepEqual(facts, ['sub-5 SubagentStop']);
});

test('hook: a steer given to an engine that put its own id in agent_id is still tracked (proof, and return on hang-up)', async (t) => {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-enforce-steer-')));
  t.after(() => fs.rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'jim-1', name: 'Jim', provider: 'claude', cwd: home });
  const control = new ControlRegistry();
  const server = new HookServer(hive, () => null, () => ({ harnessHome: home, guardrail: true }), control, undefined);
  for (const agent_id of ['jim-1', 'codex-thread-1']) {
    control.steer('jim-1', `use the staging db (${agent_id})`);
    const payload = { hook_event_name: 'UserPromptSubmit', agent_id, hive_agent: 'jim-1', session_id: 's', prompt: 'go' };
    const reply = await server.handle(payload);
    assert.match(reply.hookSpecificOutput.additionalContext, /use the staging db/, agent_id);
    // The socket and HTTP handlers look the steer up by the object they passed in.
    assert.equal(server.steersOut.get(payload)?.agentId, 'jim-1', `${agent_id}: tracked on the payload the handler holds`);
  }
});

test('hook: pausing or halting an agent stops its subagents too', async (t) => {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-enforce-ctl-')));
  t.after(() => fs.rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'jim-1', name: 'Jim', provider: 'claude', cwd: home });
  const control = new ControlRegistry();
  const server = new HookServer(hive, () => null, () => ({ harnessHome: home, guardrail: true, guardrailApproved: approvedNow(path.join(hive.root(), 'policy', 'guardrail.json')) }), control, undefined);
  const sub = (event) => server.handle({ hook_event_name: event, agent_id: 'sub-9', hive_agent: 'jim-1', agent_type: 'general-purpose', session_id: 's', tool_name: 'Bash', tool_input: { command: 'ls' } });
  assert.deepEqual(await sub('PreToolUse'), {});
  control.pause('jim-1', true);
  assert.equal((await sub('PreToolUse')).hookSpecificOutput.permissionDecision, 'deny');
  control.halt('jim-1');
  assert.equal((await sub('Stop')).continue, false);
});

// The shared hook token does not say which agent sent a payload. A payload whose
// agent_id is not its sender's is answered as a sub agent of the sender, so nothing
// reaches the floor under the named agent. But a sender that names the other agent
// in both fields is believed: one agent posing as another is not stopped (a per-agent
// token is a later roadmap item). These tests pin both halves.
test('hook: an agent_id that is not the sender\'s reaches nothing on the floor under that id', async (t) => {
  const f = await floor(t, []);
  const events = [];
  f.server.onEvent = (a, ev) => events.push(`${a} ${ev}`);
  // As a subagent of the sender: gates only, nothing on the floor.
  await f.server.handle({ hook_event_name: 'Stop', agent_id: 'jim-1', hive_agent: 'god', agent_type: 'general-purpose', session_id: 's' });
  assert.deepEqual(events, [], 'sent by god, so not jim\'s');
  // Without agent_type it is not a subagent: it is the sender's own event.
  await f.server.handle({ hook_event_name: 'Stop', agent_id: 'jim-1', hive_agent: 'god', session_id: 's' });
  assert.deepEqual(events, ['god Stop'], 'sent by god, so god\'s, never jim\'s');
});

test('hook: an engine that puts its own id in agent_id still reaches the floor as its agent (Codex)', async (t) => {
  const jimOnly = { id: 'jim-no-sync', principle: 'Jim never syncs.', agents: ['jim-1'],
    backstop: { on: true, does: 'block', match: { tool: 'Bash', command_matches: '^mempalace +sync' } } };
  const f = await floor(t, [jimOnly]);
  const events = [];
  f.server.onEvent = (a, ev) => events.push(`${a} ${ev}`);
  const call = (event, extra = {}) => f.server.handle({ hook_event_name: event, agent_id: 'codex-thread-1', hive_agent: 'jim-1', session_id: 's', cwd: f.hive.root(), ...extra });
  const r = await call('PreToolUse', { tool_name: 'Bash', tool_input: { command: 'mempalace sync' } });
  assert.equal(r.hookSpecificOutput.permissionDecision, 'deny', 'jim\'s rule binds it');
  await call('Stop');
  assert.ok(events.includes('jim-1 Stop'), `the floor hears jim: ${events.join(', ')}`);
  assert.ok(!events.some((e) => e.startsWith('codex-thread-1')), 'never under the engine\'s own id');
  const rows = f.logRows().filter((x) => x.kind === 'policy-match');
  assert.deepEqual(rows.map((x) => x.agent_id), ['jim-1']);
});

test('hook: limit, stated: a sender that names another agent in both fields is believed', async (t) => {
  const f = await floor(t, []);
  const events = [];
  f.server.onEvent = (a, ev) => events.push(`${a} ${ev}`);
  await f.server.handle({ hook_event_name: 'Stop', agent_id: 'jim-1', hive_agent: 'jim-1', session_id: 's' });
  assert.deepEqual(events, ['jim-1 Stop'], 'no per-agent token: the hook server cannot tell');
});

test('stats do not count calls evaluated with record: false', () => {
  const { e, rows } = engine([OWN_FOLDER_RULE]);
  for (let i = 0; i < 5; i++) e.evaluate(pre('Write', { file_path: '/root/hive/agents/agent-b/x.md' }, 'agent-a'), { record: false });
  e.evaluate(pre('Write', { file_path: '/root/hive/agents/agent-b/x.md' }, 'agent-a'));
  e.flushStats();
  const stats = rows.find((r) => r.kind === 'policy-stats');
  assert.deepEqual([stats.evaluated, stats.matched, stats.denied], [1, 1, 1]);
});
