'use strict';

/*
 * Settings > Rules (guardrailEditor.ts). Every change the screen makes is the
 * operator's, so each records the file's fingerprint in the app config, where no agent
 * can write; the engine loads guardrail.json only when the switch is on and the file
 * still matches it. Also the screen's pure helpers (rulesView.ts).
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const electron = require.resolve('electron');
require.cache[electron] = { id: electron, filename: electron, loaded: true,
  exports: { Notification: class { show() {} static isSupported() { return false; } } } };

const { HiveManager } = loadTs('src/main/hive.ts');
const { HookServer } = loadTs('src/core/hookServer.ts');
const { GuardrailEditor, writeGuardrailFile } = loadTs('src/main/guardrailEditor.ts');
const { STARTER } = loadTs('src/main/guardrailStarter.ts');
const { guardrailHash } = loadTs('src/main/guardrail.ts');
const { statusLine, describeBackstop, fromDraft, toDraft, emptyDraft } = loadTs('src/renderer/src/components/rulesView.ts');

/** A hive, a hook server and the editor, with the app config held in memory. */
async function floor(t, cfg = {}) {
  const home = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-guardrail-editor-')));
  t.after(() => fs.rmSync(home, { recursive: true, force: true, maxRetries: 5, retryDelay: 50 }));
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'god', name: 'God', provider: 'claude', cwd: home, isGod: true });
  await hive.ensureAgent({ id: 'jim-1', name: 'Jim', provider: 'claude', cwd: home });
  const config = { harnessHome: home, ...cfg };
  const cfgPaused = { on: false };
  const server = new HookServer(hive, () => null, () => config, undefined, undefined);
  const file = path.join(hive.root(), 'policy', 'guardrail.json');
  const rows = [];
  const editor = new GuardrailEditor({
    policyDir: () => path.join(hive.root(), 'policy'),
    config: () => config,
    // A damaged config.json pauses every save (config.ts persistConfig): `paused` stands in.
    setConfig: (patch) => { if (cfgPaused.on) return false; Object.assign(config, patch); return true; },
    reload: () => server.reloadPolicy(),
    status: () => server.policyStatus(),
    log: (row) => rows.push(row),
  });
  const plant = (rules) => {
    fs.mkdirSync(path.dirname(file), { recursive: true });
    fs.writeFileSync(file, JSON.stringify({ version: 1, rev: 9, rules }));
  };
  const write = (tool, input) => server.handle({ hook_event_name: 'PreToolUse', agent_id: 'jim-1', session_id: 's', tool_name: tool, tool_input: input, cwd: home });
  const denied = async (tool, input) => (await write(tool, input))?.hookSpecificOutput?.permissionDecision === 'deny';
  const godInbox = () => fs.readdirSync(path.join(hive.root(), 'agents', 'god', 'inbox')).filter((f) => f.endsWith('.json'))
    .map((f) => JSON.parse(fs.readFileSync(path.join(hive.root(), 'agents', 'god', 'inbox', f), 'utf8')));
  return { home, hive, server, editor, config, cfgPaused, file, rows, plant, write, denied, godInbox };
}

const PLANTED = [{ id: 'planted', principle: 'Push every branch after each commit.', agents: 'all',
  backstop: { on: true, does: 'block', match: { tool: 'Write' } } }];

test('the starter rules are the example file', () => {
  const example = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'examples/policy/guardrail.example.json'), 'utf8'));
  assert.deepEqual(STARTER, example);
});

test('turn on with no file: the starter rules, approved, loaded and protected', async (t) => {
  const f = await floor(t);
  const out = f.editor.turnOn(null);
  assert.equal(out.ok, true, JSON.stringify(out));
  assert.equal(f.config.guardrail, true);
  assert.equal(f.config.guardrailApproved, guardrailHash(fs.readFileSync(f.file, 'utf8')));
  assert.equal(out.view.file.rev, 1);
  assert.deepEqual(out.view.file.rules.map((r) => r.id), ['cross-agent-write', 'destructive-shared-state', 'remote-push']);
  assert.equal(out.view.approved, true);
  assert.equal(f.server.policyStatus().rulesLoaded, 3);
  assert.equal(await f.denied('Write', { file_path: f.file, content: '{}' }), true, 'the folder is protected at once');
  assert.match(statusLine(out.view).text, /^Guardrail on: 3 rules given to agents, 3 backstops checked \(0 block or ask\)\.$/);
  assert.deepEqual(f.rows.map((r) => r.kind), ['guardrail-saved', 'guardrail-on']);
});

test('turn on with a file already there: only the file the screen showed', async (t) => {
  const f = await floor(t);
  f.plant(PLANTED);
  const shown = f.editor.read();
  assert.equal(shown.on, false);
  assert.equal(shown.approved, false);
  // Changed between the read and the click: refused, nothing turned on.
  fs.writeFileSync(f.file, JSON.stringify({ version: 1, rev: 10, rules: PLANTED }));
  const stale = f.editor.turnOn(shown.stamp);
  assert.equal(stale.ok, false);
  assert.equal(f.config.guardrail, undefined);
  // Read again and turn on: the operator has now seen these rules.
  const out = f.editor.turnOn(f.editor.read().stamp);
  assert.equal(out.ok, true);
  assert.equal(out.view.approved, true);
  assert.equal(f.server.policyStatus().rulesLoaded, 1);
});

test('switched on, a file the operator did not approve is not loaded: one row, god told once', async (t) => {
  const f = await floor(t);
  f.editor.turnOn(null);
  // Changed outside the screen (by hand, or by an agent while it was not protected).
  f.plant(PLANTED);
  const fresh = await floor(t, { guardrail: true, guardrailApproved: f.config.guardrailApproved });
  fresh.plant(PLANTED);
  fresh.server.announceOnce();
  fresh.server.announceOnce();
  const st = fresh.server.policyStatus();
  assert.equal(st.configured, false);
  assert.equal(st.ignoredWhy, 'unapproved');
  const told = fresh.godInbox().filter((m) => /changed outside the Rules screen/.test(m.subject));
  assert.equal(told.length, 1);
  assert.doesNotMatch(told[0].subject + told[0].body, /[\u2013\u2014]/);
  assert.equal(await fresh.denied('Write', { file_path: path.join(fresh.home, 'notes.md'), content: 'x' }), false, 'its block rule is not in force');
  const view = fresh.editor.read();
  assert.equal(view.approved, false);
  assert.match(statusLine(view).text, /changed outside this screen/);
  assert.equal(statusLine(view).bad, true);
  // The operator reads it and accepts it.
  assert.equal(fresh.editor.accept('0'.repeat(64)).ok, false, 'only the file shown');
  const out = fresh.editor.accept(view.stamp);
  assert.equal(out.ok, true);
  assert.equal(fresh.server.policyStatus().rulesLoaded, 1);
  assert.equal(await fresh.denied('Write', { file_path: path.join(fresh.home, 'notes.md'), content: 'x' }), true);
});

test('save: checked, approved, loaded; a stale or broken file is never overwritten', async (t) => {
  const f = await floor(t);
  const on = f.editor.turnOn(null).view;
  const rules = on.file.rules.map((r) => (r.id === 'remote-push' ? { ...r, backstop: { ...r.backstop, does: 'ask' } } : r));
  const saved = f.editor.save({ ...on.file, rules }, on.stamp);
  assert.equal(saved.ok, true, JSON.stringify(saved));
  assert.equal(saved.view.file.rev, 2);
  assert.equal(f.config.guardrailApproved, saved.view.stamp);
  assert.equal((await f.write('Bash', { command: 'git push origin main' }))?.hookSpecificOutput?.permissionDecision, 'ask', 'in force at once');
  // The same stamp again is stale now.
  assert.equal(f.editor.save({ ...on.file, rules }, on.stamp).ok, false);
  // The engine's own check runs on every backstop, including the ones that are off.
  const badRegex = [...rules, { id: 'x', principle: 'X.', agents: 'all', backstop: { on: false, does: 'block', match: { tool: 'Bash', command_matches: '(' } } }];
  const refused = f.editor.save({ ...saved.view.file, rules: badRegex }, saved.view.stamp);
  assert.equal(refused.ok, false);
  assert.ok(refused.errors.length);
  // A shape error is refused too.
  assert.equal(f.editor.save({ ...saved.view.file, rules: [{ id: 'y', agents: 'all' }] }, saved.view.stamp).ok, false);
  // A broken file on disk may hold rules the screen never saw.
  fs.writeFileSync(f.file, '{ not json');
  const broken = f.editor.read();
  assert.ok(broken.error);
  const r = f.editor.save({ version: 1, rev: 0, rules: [] }, broken.stamp);
  assert.equal(r.ok, false);
  assert.match(r.errors[0], /broken/);
  assert.equal(fs.readFileSync(f.file, 'utf8'), '{ not json');
});

test('turn off: nothing loaded, and agents are told their rules were removed', async (t) => {
  const f = await floor(t);
  f.editor.turnOn(null);
  const ctx = async (event, extra = {}) => (await f.server.handle({ hook_event_name: event, agent_id: 'jim-1', session_id: 's1', ...extra }))?.hookSpecificOutput?.additionalContext ?? null;
  assert.match(await ctx('SessionStart'), /<rules rev="1">/);
  const out = f.editor.turnOff();
  assert.equal(out.ok, true);
  assert.equal(f.config.guardrail, false);
  assert.equal(f.server.policyStatus().configured, false);
  assert.match(await ctx('UserPromptSubmit'), /removed your standing rules/);
  assert.equal(await f.denied('Write', { file_path: f.file, content: '{}' }), false, 'not protected while off');
  assert.match(statusLine(out.view).text, /^Guardrail off/);
});

test('rulesView: the status line says why nothing is checked', () => {
  const v = (o) => ({ on: true, exists: true, file: { version: 1, rev: 1, rules: [] }, error: null, stamp: 'a', approved: true,
    engine: { loaded: true, rulesLoaded: 0, error: null }, ...o });
  assert.equal(statusLine(null).bad, false);
  assert.match(statusLine(v({ on: false })).text, /^Guardrail off/);
  assert.equal(statusLine(v({ exists: false })).bad, true);
  assert.equal(statusLine(v({ error: 'bad json' })).bad, true);
  assert.equal(statusLine(v({ approved: false })).bad, true);
  assert.equal(statusLine(v({ engine: { loaded: false, rulesLoaded: 0, error: 'x: missing match' } })).bad, true);
  assert.equal(statusLine(v({})).bad, false);
  for (const o of [{ on: false }, { exists: false }, { error: 'e' }, { approved: false }, {}]) {
    assert.doesNotMatch(statusLine(v(o)).text, /[\u2013\u2014]/);
  }
});

test('rulesView: a draft round-trips and keeps what the form does not show', () => {
  const rule = STARTER.rules[0];
  const back = fromDraft(toDraft(rule), rule);
  assert.deepEqual(back, rule, 'path_not_glob, on_error and the message survive an edit');
  const d = { ...emptyDraft(), principle: 'Never deploy on Fridays.', hasBackstop: true, does: 'block', commandMatches: '^deploy' };
  assert.deepEqual(fromDraft(d), {
    id: 'never-deploy-on-fridays', principle: 'Never deploy on Fridays.', agents: 'all',
    backstop: { on: true, does: 'block', match: { tool: 'Bash', command_matches: '^deploy' } },
  });
  assert.match(describeBackstop(STARTER.rules[1]), /^Backstop: Log only · tool Bash · command \^mempalace/);
  assert.match(describeBackstop(STARTER.rules[1]), /if it cannot be checked: counts as a match/);
  // An exception is named, so a Block that never fires does not read as protection.
  const neutered = { id: 'n', principle: 'N.', agents: 'all', backstop: { on: true, does: 'block',
    match: { tool: 'Bash', command_matches: '^git push', command_not_matches: '.*', path_not_glob: '**' } } };
  assert.match(describeBackstop(neutered), /except command \.\* · except path \*\*/);
  assert.match(describeBackstop(STARTER.rules[0]), /except path \*\*\/hive\/agents\/\$\{AGENT_ID\}\/\*\*/);
  assert.match(describeBackstop({ id: 'p', principle: 'P.', agents: 'all' }), /^Principle only/);
});

test('a reload that finds a file the operator did not approve takes the principles back', (t) => {
  const { PolicyEngine } = loadTs('src/main/policy.ts');
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-guardrail-unapproved-')));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const file = path.join(root, 'policy', 'guardrail.json');
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, JSON.stringify(STARTER));
  let approved = guardrailHash(fs.readFileSync(file, 'utf8'));
  const e = new PolicyEngine(root, () => {}, () => [], () => true, () => approved);
  e.load();
  assert.equal(e.principles('jim-1').texts.length, 3);
  fs.writeFileSync(file, JSON.stringify({ version: 1, rev: 9, rules: PLANTED }));
  e.load();
  assert.deepEqual(e.principles('jim-1'), { rev: 0, texts: [] });
  assert.equal(e.status.ignoredWhy, 'unapproved');
  approved = guardrailHash(fs.readFileSync(file, 'utf8'));
  e.load();
  assert.deepEqual(e.principles('jim-1').texts, ['Push every branch after each commit.']);
});

test('switched on with no file yet: a file an agent creates is never loaded', async (t) => {
  // The folder is not protected while nothing is loaded, so an agent can create the
  // file. With no fingerprint from the operator it is ignored at every start.
  for (const cfg of [{ guardrail: true }, { guardrail: true, guardrailApproved: 'f'.repeat(64) }]) {
    const f = await floor(t, cfg);
    assert.equal(await f.denied('Write', { file_path: f.file, content: '{}' }), false, 'not protected: nothing is loaded');
    f.plant(PLANTED);
    // The next start.
    const restarted = new HookServer(f.hive, () => null, () => f.config, undefined, undefined);
    restarted.announceOnce();
    assert.equal(restarted.policyStatus().ignoredWhy, 'unapproved');
    const reply = await restarted.handle({ hook_event_name: 'PreToolUse', agent_id: 'god', session_id: 's', tool_name: 'Write', tool_input: { file_path: path.join(f.home, 'notes.md'), content: 'x' }, cwd: f.home });
    assert.notEqual(reply?.hookSpecificOutput?.permissionDecision, 'deny', 'its block rule is not in force');
    assert.equal(f.godInbox().filter((m) => /changed outside the Rules screen/.test(m.subject)).length, 1);
  }
});

test('nothing follows a link an agent planted in the policy folder', async (t) => {
  // A planted link at the temp-file name the screen used to write through.
  const f = await floor(t);
  const victim = path.join(f.home, 'operator-file.txt');
  fs.writeFileSync(victim, 'keep me');
  fs.mkdirSync(path.dirname(f.file), { recursive: true });
  fs.symlinkSync(victim, `${f.file}.${process.pid}.tmp`);
  assert.equal(f.editor.turnOn(null).ok, true);
  assert.equal(fs.readFileSync(victim, 'utf8'), 'keep me', 'the link target is untouched');
  assert.equal(fs.lstatSync(f.file).isSymbolicLink(), false);
  assert.deepEqual(fs.readdirSync(path.dirname(f.file)).filter((n) => n.endsWith('.tmp') && !fs.lstatSync(path.join(path.dirname(f.file), n)).isSymbolicLink()), [], 'no temp file left');

  // guardrail.json itself a link: refused by the screen, and never loaded.
  const g = await floor(t);
  const target = path.join(g.home, 'elsewhere.json');
  fs.writeFileSync(target, JSON.stringify(STARTER));
  fs.mkdirSync(path.dirname(g.file), { recursive: true });
  fs.symlinkSync(target, g.file);
  const view = g.editor.read();
  assert.match(view.error, /symbolic link/);
  assert.equal(view.text, null);
  assert.equal(g.editor.turnOn(null).ok, false);
  assert.equal(g.editor.save(STARTER, null).ok, false);
  assert.equal(g.editor.accept(guardrailHash(fs.readFileSync(target, 'utf8'))).ok, false);
  assert.equal(fs.readFileSync(target, 'utf8'), JSON.stringify(STARTER), 'the link target is untouched');
  // Even switched on with the target's own fingerprint, the engine refuses it.
  Object.assign(g.config, { guardrail: true, guardrailApproved: guardrailHash(fs.readFileSync(target, 'utf8')) });
  const st = g.server.reloadPolicy();
  assert.equal(st.rulesLoaded, 0);
  assert.match(st.error, /symbolic link/);
  assert.equal(st.configured, true, 'a failed load keeps the folder protected');

  // The whole policy folder a link.
  const h = await floor(t);
  const outside = fs.mkdtempSync(path.join(os.tmpdir(), 'md-guardrail-outside-'));
  t.after(() => fs.rmSync(outside, { recursive: true, force: true }));
  fs.symlinkSync(outside, path.dirname(h.file));
  assert.match(h.editor.read().error, /policy folder is a symbolic link/);
  assert.equal(h.editor.turnOn(null).ok, false);
  assert.deepEqual(fs.readdirSync(outside), [], 'nothing written through the link');
  // ...and a file in the link's target is not loaded, even with its fingerprint.
  fs.writeFileSync(path.join(outside, 'guardrail.json'), JSON.stringify(STARTER));
  Object.assign(h.config, { guardrail: true, guardrailApproved: guardrailHash(JSON.stringify(STARTER)) });
  assert.match(h.server.reloadPolicy().error, /policy folder is a symbolic link/);
});

test('the file writer: never through a planted link, at the temp name or the folder', (t) => {
  const dir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 'md-guardrail-write-')));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  const victim = path.join(dir, 'victim.txt');
  fs.writeFileSync(victim, 'keep me');
  const policy = path.join(dir, 'policy');
  fs.mkdirSync(policy);
  const file = path.join(policy, 'guardrail.json');
  const planted = path.join(policy, 'planted.tmp');
  fs.symlinkSync(victim, planted);
  assert.throws(() => writeGuardrailFile(file, '{}', planted), /temp file/);
  assert.equal(fs.readFileSync(victim, 'utf8'), 'keep me');
  assert.equal(fs.existsSync(file), false);
  // A link at guardrail.json is replaced by the rename, not written through.
  fs.symlinkSync(victim, file);
  writeGuardrailFile(file, '{"a":1}');
  assert.equal(fs.readFileSync(victim, 'utf8'), 'keep me');
  assert.equal(fs.lstatSync(file).isSymbolicLink(), false);
  assert.equal(fs.readFileSync(file, 'utf8'), '{"a":1}');
  // A linked folder is refused.
  const linked = path.join(dir, 'linked');
  fs.symlinkSync(dir, linked);
  assert.throws(() => writeGuardrailFile(path.join(linked, 'guardrail.json'), '{}'), /symbolic link/);
  assert.equal(fs.existsSync(path.join(dir, 'guardrail.json')), false);
});

test('before Turn on or Accept, the screen has the whole file to show', async (t) => {
  const f = await floor(t);
  const text = JSON.stringify({ version: 1, rev: 3, defaults: { on_error: 'deny' }, rules: [{ id: 'x', principle: 'X.', agents: 'all', why: 'because',
    backstop: { on: true, does: 'block', match: { tool: 'Bash', command_matches: '^git push', command_not_matches: '.*' }, message: 'Planted text.' } }] }, null, 2);
  fs.mkdirSync(path.dirname(f.file), { recursive: true });
  fs.writeFileSync(f.file, text);
  const view = f.editor.read();
  assert.equal(view.text, text, 'exactly the bytes the stamp is for');
  assert.equal(view.stamp, guardrailHash(text));
});

test('a hard link into guardrail.json is refused by the screen and the engine', async (t) => {
  // lstat sees a regular file; the agent keeps another name for it in its own folder.
  const f = await floor(t);
  fs.mkdirSync(path.dirname(f.file), { recursive: true });
  fs.writeFileSync(f.file, JSON.stringify(STARTER));
  const own = path.join(f.hive.root(), 'agents', 'jim-1', 'my-name-for-the-rules.json');
  fs.linkSync(f.file, own);
  const view = f.editor.read();
  assert.match(view.error, /hard links/);
  assert.equal(view.text, null);
  assert.equal(f.editor.turnOn(null).ok, false);
  assert.equal(f.editor.accept(guardrailHash(JSON.stringify(STARTER))).ok, false);
  Object.assign(f.config, { guardrail: true, guardrailApproved: guardrailHash(JSON.stringify(STARTER)) });
  const st = f.server.reloadPolicy();
  assert.equal(st.rulesLoaded, 0);
  assert.match(st.error, /hard links/);
  assert.equal(st.configured, true, 'a failed load keeps the folder protected');
  // Once the other name is gone, the same file is fine.
  fs.rmSync(own);
  assert.equal(f.server.reloadPolicy().rulesLoaded, 3);
});

test('with the app settings paused (a damaged config.json), nothing claims to be on or approved', async (t) => {
  const f = await floor(t);
  f.cfgPaused.on = true;
  const on = f.editor.turnOn(null);
  assert.equal(on.ok, false);
  assert.match(on.errors[0], /config\.json is damaged/);
  assert.notEqual(f.config.guardrail, true, 'still off');
  assert.equal(await f.denied('Write', { file_path: path.join(f.hive.root(), 'agents', 'god', 'x.md'), content: 'x' }), false);
  // Settings back: turn on, then a save while paused is not recorded as approved.
  f.cfgPaused.on = false;
  assert.equal(f.editor.turnOn(f.editor.read().stamp).ok, true);
  const approved = f.config.guardrailApproved;
  f.cfgPaused.on = true;
  const view = f.editor.read();
  const saved = f.editor.save({ ...view.file, rules: view.file.rules.slice(1) }, view.stamp);
  assert.equal(saved.ok, false);
  assert.match(saved.errors[0], /saved but is not approved/);
  assert.equal(f.config.guardrailApproved, approved, 'the old approval stands, so the new file does not load');
  assert.equal(f.editor.read().approved, false);
  const loaded = f.server.policyStatus().rulesLoaded;
  assert.ok(loaded > 0);
  // Turn off with the config still reading as on, and with the damaged file reading as
  // the defaults (off): either way off was not saved, and the rules stay in force.
  for (const reads of [true, false]) {
    f.config.guardrail = reads;
    const off = f.editor.turnOff();
    assert.equal(off.ok, false);
    assert.match(off.errors[0], /was not turned off: config\.json is damaged.*the rules stay in force until it is repaired/);
    assert.equal(f.server.policyStatus().rulesLoaded, loaded, 'no reload: the engine keeps its rules');
  }
  // Repaired: the file reads as on again. The switch and the engine agree, with no restart.
  f.config.guardrail = true;
  assert.equal(f.editor.read().on, true);
  assert.equal(f.server.policyStatus().rulesLoaded, loaded, 'switch on, rules loaded');
  assert.equal(f.editor.accept(f.editor.read().stamp).ok, false);
});

test('a rules file that is not valid UTF-8 is refused, so its fingerprint is of its bytes', async (t) => {
  const f = await floor(t);
  f.plant(PLANTED);
  const good = fs.readFileSync(f.file);
  fs.writeFileSync(f.file, Buffer.concat([good.subarray(0, good.length - 1), Buffer.from([0xff]), good.subarray(good.length - 1)]));
  const view = f.editor.read();
  assert.match(view.error ?? '', /not valid UTF-8/);
  assert.equal(f.editor.turnOn(view.stamp ?? null).ok, false);
});
