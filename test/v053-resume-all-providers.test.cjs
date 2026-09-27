'use strict';
/* 0.5.3 (Creed, 24 Sep 2026): a restart must not lose the session for ANY
 * provider (the founder, verbatim: "the session getting lost after restart
 * ... it should not be lost for any agent"). Claude got three rules in bug 1;
 * this closes the gap for everyone else:
 *  - Kimi, Qwen and OpenCode gain their CLIs' real resume flags,
 *  - the non-Claude restart path walks the recorded ids (resumeCandidates)
 *    instead of trusting one key,
 *  - an id is only attached when the provider's own on-disk store has it
 *    (shared/resumeStore.ts, layouts read off a real machine), and a store
 *    that cannot be checked attaches the newest id rather than dropping it,
 *  - nothing left to resume starts fresh with resumeNotFound said out loud.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFileSync, spawnSync } = require('node:child_process');
const loadTs = require('./load-ts.cjs');

const { providerSessionStore, storeCanCheck, storeHasSession, chooseResumeSession } = loadTs('src/shared/resumeStore.ts');
const { providerPreset } = loadTs('src/shared/agentProvider.ts');

const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

/* ---- the presets carry each CLI's real resume form ----------------------- */

test('the presets: every CLI that can resume by id says how, and only custom cannot', () => {
  assert.equal(providerPreset('kimi').resumeFlag, '--session', 'kimi 2.1.0: -S, --session [id]');
  assert.equal(providerPreset('qwen').resumeFlag, '--resume', 'qwen 0.24.x: -r, --resume <id>');
  assert.equal(providerPreset('opencode').resumeFlag, '--session', 'opencode 1.18: -s, --session <id>, attached unchecked (SQLite store)');
  assert.equal(providerPreset('grok').resumeFlag, '--resume');
  assert.equal(providerPreset('gemini').resumeFlag, '--resume');
  assert.equal(providerPreset('antigravity').resumeFlag, '--conversation');
  assert.equal(providerPreset('crush').resumeFlag, '--session');
  assert.equal(providerPreset('pi').resumeFlag, '--session');
  assert.equal(providerPreset('copilot').resumeFlag, '--resume');
  assert.equal(providerPreset('cursor').resumeFlag, '--resume');
  assert.equal(providerPreset('codex').resumeSubcommand, 'resume');
  assert.equal(providerPreset('custom').resumeFlag, undefined, 'a custom command has no known resume form');
});

/* ---- the store specs, against each layout as it is on disk --------------- */

/** A lister over a plain map of dir -> entries; anything else is missing. */
const listerOf = (dirs) => (d) => (Object.prototype.hasOwnProperty.call(dirs, d) ? dirs[d] : null);
/** A spawn context: env, home, cwd and a text reader over a plain map. */
const ctxOf = (env = {}, texts = {}, cwd = '/work') => ({ env, home: '/h', cwd, readText: (f) => (Object.prototype.hasOwnProperty.call(texts, f) ? texts[f] : null) });

test('kimi, grok, qwen, pi, cursor: the store finds a real id and rejects a ghost at the default roots', () => {
  const cases = [
    { provider: 'kimi', dirs: {
      '/h/.kimi-code/sessions': ['wd_kevin_4b37', 'wd_dwight_1e28', '.index-cache'],
      '/h/.kimi-code/sessions/wd_kevin_4b37': ['session_3a71c769-245e-423b-915a-f107a5b82b40'],
      '/h/.kimi-code/sessions/wd_dwight_1e28': []
    }, sid: '3a71c769-245e-423b-915a-f107a5b82b40' },
    { provider: 'grok', dirs: {
      '/h/.grok/sessions': ['%2FUsers%2Fx%2Fproj', 'session_search.sqlite'],
      '/h/.grok/sessions/%2FUsers%2Fx%2Fproj': ['01a0c378-1d60-7363-b3f8-d6efc7cde5c6', 'prompt_history.jsonl']
    }, sid: '01a0c378-1d60-7363-b3f8-d6efc7cde5c6' },
    { provider: 'qwen', dirs: {
      '/h/.qwen/projects': ['-Users-x-proj'],
      '/h/.qwen/projects/-Users-x-proj': ['chats'],
      '/h/.qwen/projects/-Users-x-proj/chats': ['da527579-7632-43a2-ab3c-0b8e5057c482.runtime.json']
    }, sid: 'da527579-7632-43a2-ab3c-0b8e5057c482' },
    { provider: 'pi', dirs: {
      '/h/.pi/agent/sessions': ['--Users-x-proj--'],
      '/h/.pi/agent/sessions/--Users-x-proj--': ['2026-09-01T10-00-00-aaaabbbb-cccc-dddd-eeee-ffff00001111.jsonl']
    }, sid: 'aaaabbbb-cccc-dddd-eeee-ffff00001111' },
    { provider: 'cursor', dirs: {
      '/h/.cursor/chats': ['f0322cccf4a19fa86eee2ac3638878a2'],
      '/h/.cursor/chats/f0322cccf4a19fa86eee2ac3638878a2': ['d7ae775f-4183-446b-8633-55215ff3a9fb']
    }, sid: 'd7ae775f-4183-446b-8633-55215ff3a9fb' }
  ];
  for (const c of cases) {
    const spec = providerSessionStore(c.provider, ctxOf());
    assert.ok(spec, `${c.provider} has a store spec`);
    const list = listerOf(c.dirs);
    assert.equal(storeCanCheck(spec, list), true, `${c.provider} store is checkable`);
    assert.equal(storeHasSession(spec, c.sid, list), true, `${c.provider} finds its real id`);
    assert.equal(storeHasSession(spec, 'not-a-session', list), false, `${c.provider} rejects a ghost`);
  }
});

test('Kevin #90: a pi id present ONLY under the per agent PI_CODING_AGENT_DIR is resumed, although ~/.pi exists without it', () => {
  const agentDir = '/floor/agents/dwight/.pi-agent';
  const dirs = {
    // The person's own pi store: exists, and does not have the agent's id.
    '/h/.pi/agent/sessions': ['--Users-x-other--'],
    '/h/.pi/agent/sessions/--Users-x-other--': ['2026-09-01-99999999-0000-0000-0000-000000000000.jsonl'],
    // The agent's own store, where the app runs it.
    [`${agentDir}/sessions`]: ['--work--'],
    [`${agentDir}/sessions/--work--`]: ['2026-09-24-12121212-3434-5656-7878-909090909090.jsonl']
  };
  const list = listerOf(dirs);
  const spec = providerSessionStore('pi', ctxOf({ PI_CODING_AGENT_DIR: agentDir }));
  assert.equal(spec.root, agentDir, 'the root is the agent dir the spawn sets');
  assert.deepEqual(chooseResumeSession(['12121212-3434-5656-7878-909090909090'], spec, list), { sid: '12121212-3434-5656-7878-909090909090', checked: true });
  // What #90 at 9927b5c0 did: read ~ and call the good id missing.
  const homeSpec = providerSessionStore('pi', ctxOf({}));
  assert.equal(chooseResumeSession(['12121212-3434-5656-7878-909090909090'], homeSpec, list).sid, undefined, 'the bug this fixes, reproduced against the home root');
  // PI_CODING_AGENT_SESSION_DIR puts the files directly in that directory.
  const direct = providerSessionStore('pi', ctxOf({ PI_CODING_AGENT_DIR: agentDir, PI_CODING_AGENT_SESSION_DIR: '/s' }));
  assert.equal(storeHasSession(direct, 'abcd', listerOf({ '/s': ['2026-abcd.jsonl'] })), true);
  // A sessionDir in the agent dir's settings moves it: cannot tell.
  assert.equal(providerSessionStore('pi', ctxOf({ PI_CODING_AGENT_DIR: agentDir }, { [`${agentDir}/settings.json`]: '{"sessionDir":"/elsewhere"}' })), null);
});

test('each CLI home override is the root the check reads', () => {
  assert.equal(providerSessionStore('kimi', ctxOf({ KIMI_CODE_HOME: '/k' })).root, '/k');
  assert.equal(providerSessionStore('grok', ctxOf({ GROK_HOME: '/g' })).root, '/g');
  assert.equal(providerSessionStore('qwen', ctxOf({ QWEN_HOME: '/q' })).root, '/q');
  assert.equal(providerSessionStore('qwen', ctxOf({ QWEN_HOME: '/q', QWEN_RUNTIME_DIR: '/r' })).root, '/r', 'runtime dir wins, as in qwen');
  // A kimi id only under KIMI_CODE_HOME is found there.
  const spec = providerSessionStore('kimi', ctxOf({ KIMI_CODE_HOME: '/k' }));
  assert.equal(storeHasSession(spec, 'id1', listerOf({ '/k/sessions': ['wd_a'], '/k/sessions/wd_a': ['session_id1'] })), true);
});

test('the safety rule: a root the check cannot pin down is "cannot tell", and the id is attached', () => {
  // qwen with a runtimeOutputDir in the user's or the project's settings.
  assert.equal(providerSessionStore('qwen', ctxOf({}, { '/h/.qwen/settings.json': '{"advanced":{"runtimeOutputDir":"/x"}}' })), null);
  assert.equal(providerSessionStore('qwen', ctxOf({}, { '/work/.qwen/settings.json': '{"advanced":{"runtimeOutputDir":"/x"}}' })), null);
  // cursor with any of its relocations set.
  for (const k of ['CURSOR_CONFIG_DIR', 'CURSOR_DATA_DIR', 'XDG_CONFIG_HOME']) {
    assert.equal(providerSessionStore('cursor', ctxOf({ [k]: '/c' })), null, k);
  }
  // No spec: attach unchecked.
  assert.deepEqual(chooseResumeSession(['maybe'], null, listerOf({})), { sid: 'maybe', checked: false });
});

test('providers whose store could not be pinned down have no spec: OpenCode (SQLite), Gemini, Antigravity, Crush, Copilot', () => {
  for (const p of ['opencode', 'gemini', 'antigravity', 'crush', 'copilot', 'claude', 'codex', 'custom']) {
    assert.equal(providerSessionStore(p, ctxOf()), null, p);
  }
});

/* ---- the one decision the restart makes ---------------------------------- */

test('chooseResumeSession: newest real id wins, a stale key falls back to the older real one, none says fresh', () => {
  const spec = providerSessionStore('kimi', ctxOf());
  const dirs = { '/h/.kimi-code/sessions': ['wd_a'], '/h/.kimi-code/sessions/wd_a': ['session_old-real'] };
  const list = listerOf(dirs);
  assert.deepEqual(chooseResumeSession(['ghost', 'old-real'], spec, list), { sid: 'old-real', checked: true });
  dirs['/h/.kimi-code/sessions/wd_a'] = ['session_new-real', 'session_old-real'];
  assert.deepEqual(chooseResumeSession(['new-real', 'old-real'], spec, list), { sid: 'new-real', checked: true });
  dirs['/h/.kimi-code/sessions/wd_a'] = [];
  assert.deepEqual(chooseResumeSession(['ghost'], spec, list), { sid: undefined, checked: true });
  // The store was never written under this root: attach unchecked.
  assert.deepEqual(chooseResumeSession(['maybe'], spec, listerOf({})), { sid: 'maybe', checked: false });
  assert.equal(chooseResumeSession([], spec, list).sid, undefined);
});

/* ---- the real filesystem, in a throwaway home ----------------------------- */

test('the same rules against a real disk: a kimi store, a qwen store and a per agent pi dir in a throwaway home', () => {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-store-'));
  try {
    fs.mkdirSync(path.join(home, '.kimi-code/sessions/wd_test_ab12/session_11111111-2222-3333-4444-555555555555'), { recursive: true });
    fs.mkdirSync(path.join(home, '.qwen/projects/-tmp-x/chats'), { recursive: true });
    fs.writeFileSync(path.join(home, '.qwen/projects/-tmp-x/chats/66666666-7777-8888-9999-000000000000.runtime.json'), '{}');
    const agentDir = path.join(home, 'floor/dwight/.pi-agent');
    fs.mkdirSync(path.join(home, '.pi/agent/sessions/--other--'), { recursive: true });
    fs.mkdirSync(path.join(agentDir, 'sessions/--work--'), { recursive: true });
    fs.writeFileSync(path.join(agentDir, 'sessions/--work--/2026-09-24-aaaaaaaa-1111-2222-3333-444444444444.jsonl'), '');
    const list = (d) => { try { return fs.readdirSync(d); } catch { return null; } };
    const real = { home, cwd: '/work', readText: (f) => { try { return fs.readFileSync(f, 'utf8'); } catch { return null; } } };
    assert.equal(storeHasSession(providerSessionStore('kimi', { ...real, env: {} }), '11111111-2222-3333-4444-555555555555', list), true);
    assert.equal(storeHasSession(providerSessionStore('qwen', { ...real, env: {} }), '66666666-7777-8888-9999-000000000000', list), true);
    assert.equal(storeHasSession(providerSessionStore('kimi', { ...real, env: {} }), '99999999-0000-0000-0000-000000000000', list), false);
    const pi = chooseResumeSession(['aaaaaaaa-1111-2222-3333-444444444444'], providerSessionStore('pi', { ...real, env: { PI_CODING_AGENT_DIR: agentDir } }), list);
    assert.deepEqual(pi, { sid: 'aaaaaaaa-1111-2222-3333-444444444444', checked: true }, 'the per agent pi id is resumed on a real disk');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

/* ---- the CLIs on this machine say the flags are real ---------------------- */

const which = (bin) => { try { return execFileSync('which', [bin], { encoding: 'utf8' }).trim(); } catch { return null; } };

test('live: each installed CLI names its resume flag in --help', (t) => {
  const wants = [
    ['kimi', '--session'], ['qwen', '--resume'], ['opencode', '--session'],
    ['grok', '--resume'], ['crush', '--session'], ['pi', '--session'],
    ['cursor-agent', '--resume'], ['agy', '--conversation'], ['gemini', '--resume']
  ];
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'resume-help-'));
  try {
    let seen = 0;
    for (const [bin, flag] of wants) {
      if (!which(bin)) continue;
      // Some CLIs print help to stderr (opencode), so read both streams.
      const r = spawnSync(bin, ['--help'], { encoding: 'utf8', timeout: 20000, env: { ...process.env, HOME: home } });
      const out = `${r.stdout ?? ''}${r.stderr ?? ''}`;
      assert.ok(out.includes(flag), `${bin} --help names ${flag}`);
      seen++;
    }
    if (seen === 0) t.skip('no provider CLIs installed here');
  } finally {
    fs.rmSync(home, { recursive: true, force: true });
  }
});

/* ---- the main path uses all of it ----------------------------------------- */

test('main: the non-Claude restart walks the recorded ids, checks the store, and says fresh out loud', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /const walked = typedSid \? \[typedSid\] : \(opts\.resume === true \? hive\.resumeCandidates\(opts\.hive\.id\) : \[\]\);/, 'the walk covers every recorded id, and a typed id stays authoritative');
  assert.match(main, /chooseResumeSession\(walked, providerSessionStore\(provider, storeCtx\), listDir\)/, 'the store check gates the flag');
  assert.match(main, /env: \{ \.\.\.process\.env, \.\.\.\(opts\.env \?\? \{\}\) \}/, 'the store is resolved from the env the CLI is spawned with, not from ~ alone');
  assert.match(main, /no recorded \$\{provider\} session exists in its store - starting a fresh session/, 'fresh is said, never silent');
  assert.match(main, /pickResumableSession\(walked, \(s\) => !!findCodexHomeForSession\(s, agentsRoot\)\)/, 'codex walks the same candidates through its own owner check');
  assert.match(main, /import \{ chooseResumeSession, providerSessionStore, type DirLister, type StoreContext \} from '\.\.\/shared\/resumeStore';/);
});
