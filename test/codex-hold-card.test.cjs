'use strict';

// The window's side of a held Codex start: the card lists each folder Codex would load from,
// one row per kind of file with words on what that kind can do, then "allow" or "not now".
// It shows in Add Agent in place of the error line and over a held agent's own terminal;
// Allow records the folder and starts the agent. Settings, Agents & Models lists the starts
// waiting for an OK and the folders allowed. Restore team says a held agent waits in Settings.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const i18next = require(path.join(ROOT, 'node_modules/i18next'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const C = 'src/renderer/src/components';
const LOC = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));

// Components run as written, with React's hooks and JSX swapped for stand-ins: each mounted
// component keeps its own state and runs its effects once, after its first render.
let current = null;
const React = {
  useState: (init) => {
    const c = current;
    const i = c.hook++;
    if (!(i in c.states)) c.states[i] = typeof init === 'function' ? init() : init;
    return [c.states[i], (v) => { c.states[i] = typeof v === 'function' ? v(c.states[i]) : v; }];
  },
  useEffect: (fn) => { const c = current; const i = c.hook++; if (!c.ran.has(i)) { c.ran.add(i); c.pending.push(fn); } },
};
const jsx = (type, p) => ({ type, props: p ?? {} });
function mount(fn, props) {
  const c = { states: [], hook: 0, ran: new Set(), pending: [] };
  c.render = () => {
    const prev = current; current = c; c.hook = 0;
    let out;
    try { out = fn(props); } finally { current = prev; }
    for (const e of c.pending.splice(0)) e();
    return out;
  };
  return c;
}
const settle = () => new Promise((r) => setImmediate(r));
function loadTsx(file, mods) {
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const all = { react: React, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-i18next': { useTranslation: () => ({ t: (k, o) => (o ? `${k}${JSON.stringify(o)}` : k) }) }, ...mods };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', js)((m) => { if (!(m in all)) throw new Error(`unexpected import ${m} in ${file}`); return all[m]; }, mod, mod.exports);
  return mod.exports;
}

const store = { agents: [], updates: [] };
const useStore = (sel) => sel(store);
useStore.getState = () => ({ updateAgent: (id, patch) => store.updates.push([id, patch]) });
const terms = { reset: [], acquired: [] };
const H = loadTsx(`${C}/CodexHoldCard.tsx`, {
  './PixelButton': { PixelButton: 'PixelButton' },
  './terminalPool': {
    resetTerminal: (id) => terms.reset.push(id),
    acquireTerminal: (id) => { terms.acquired.push(id); return { fit: { fit: () => {} }, term: { cols: 120, rows: 40 } }; },
  },
  '@/store/store': { useStore },
  '@/store/config': loadTs('src/renderer/src/store/config.ts'),
  '@shared/agentRole': loadTs('src/shared/agentRole.ts'),
});

const kids = (n) => [n?.props?.children].flat(Infinity).filter((c) => c != null && c !== false && c !== true);
const text = (n) => (typeof n === 'string' || typeof n === 'number' ? String(n) : kids(n).map(text).join(''));
function findAll(n, pred, out = []) {
  if (n && typeof n === 'object') { if (pred(n)) out.push(n); for (const c of kids(n)) findAll(c, pred, out); }
  return out;
}
const buttons = (tree) => findAll(tree, (n) => n.type === 'PixelButton');
const button = (tree, label) => buttons(tree).find((b) => text(b) === label);
/** Mount a child element found in a tree, as React would. */
const render = (el) => mount(el.type, el.props).render();

const P = '/Users/x/proj';
const W = '/Users/x/MD/worktrees/a1';
const item = (file, what, extra = {}) => ({ file, what, ...extra });
const HOLD = {
  agentId: 'a1', at: 100, folderKey: P, folder: P,
  layers: [{
    dotCodex: `${P}/.codex`,
    items: [
      item(`${P}/.codex/hooks.json`, 'hooks', { detail: 'SessionStart, Stop' }),
      item(`${P}/.codex/config.toml`, 'mcp-servers', { detail: 'hand, two' }),
      item(`${P}/.codex/config.toml`, 'confinement', { detail: 'sandbox_mode' }),
      item(`${P}/.codex/config.toml`, 'setting', { detail: 'notify' }),
      item(`${P}/.codex/rules/hand.rules`, 'rules'),
      item(`${P}/.codex/agents/a.toml`, 'agents'),
      item(`${P}/.codex/hooks/h1.sh`, 'hooks'),
      item(`${P}/.codex/hooks`, 'hooks', { more: 5 }),
      item(`${P}/.codex/rules/x.rules`, 'unreadable', { detail: 'EACCES' }),
    ],
  }],
  unknown: [],
};
const WT_HOLD = {
  agentId: 'a2', at: 200, folderKey: P, folder: P,
  layers: [{
    dotCodex: `${W}/.codex`, hooksFrom: `${P}/.codex`,
    items: [item(`${W}/.codex/rules/w.rules`, 'rules'), item(`${P}/.codex/hooks.json`, 'hooks', { detail: 'Stop' }), item(`${W}/.codex/config.toml`, 'does-not-parse', { detail: 'line 1' })],
  }],
  unknown: [],
};

test('the list: each folder Codex loads from, one row per kind in a fixed order, names as main gives them; confinement never shows', () => {
  const [f] = H.codexHoldFolders(HOLD);
  assert.equal(f.folder, `${P}/.codex`);
  assert.deepEqual(f.rows.map((r) => [r.kind, r.names.join(', '), r.more]), [
    ['config', 'hand, two', 0],
    ['hooks', 'SessionStart, Stop', 0],
    ['setting', 'notify', 0],
    ['rules', 'hand.rules', 0],
    ['agents', 'a.toml', 0],
    ['hookFiles', 'h1.sh', 5],
    ['unreadable', 'rules/x.rules', 0],
  ]);
  assert.deepEqual(f.files, ['hooks.json', 'config.toml', 'rules/hand.rules', 'agents/a.toml', 'hooks/h1.sh', 'rules/x.rules']);
  assert.equal(f.more, 5);
  // a worktree: its own .codex first, then the main checkout's for hooks
  const two = H.codexHoldFolders(WT_HOLD);
  assert.deepEqual(two.map((x) => [x.folder, x.rows.map((r) => r.kind)]), [[`${W}/.codex`, ['rules', 'doesNotParse']], [`${P}/.codex`, ['hooks']]]);
  assert.deepEqual(two[0].rows[1].names, ['config.toml']);
  // nothing found but not checked: the project folder, saying so
  const un = H.codexHoldFolders({ ...HOLD, layers: [], unknown: ['the check failed (x)'] });
  assert.deepEqual(un, [{ folder: P, rows: [], files: [], more: 0, unread: true }]);
  // a layer of confinement only lists nothing
  assert.deepEqual(H.codexHoldFolders({ ...HOLD, layers: [{ dotCodex: `${P}/.codex`, items: [item(`${P}/.codex/config.toml`, 'confinement')] }] }), []);
});

test('the card: the "not started" tag, the agent named, each folder, the trust line; one folder "allow this folder", more "allow these folders"; no red', () => {
  const calls = [];
  const props = { hold: HOLD, agent: 'Ann', onAllow: () => calls.push('allow'), onNotNow: () => calls.push('not now') };
  const tree = mount(H.CodexHoldCard, props).render();
  assert.equal(tree.props.role, 'status');
  assert.equal(tree.props['data-codex-hold'], P);
  const all = text(tree);
  for (const k of ['codexLayer.tag', 'codexLayer.title{"agent":"Ann"}', 'codexLayer.body{"agent":"Ann"}', 'codexLayer.trust']) assert.ok(all.includes(k), k);
  const groups = kids(tree).filter((n) => n.type && n.type.name === 'FolderGroup');
  assert.equal(groups.length, 1);
  const g = text(render(groups[0]));
  assert.ok(g.startsWith(`${P}/.codex`));
  for (const k of ['config', 'hooks', 'setting', 'rules', 'agents', 'hookFiles', 'unreadable']) assert.ok(g.includes(`codexLayer.kind.${k}`), k);
  assert.ok(g.includes('codexLayer.more{"count":5}'));
  assert.deepEqual(buttons(tree).map(text), ['codexLayer.allow', 'codexLayer.notNow']);
  button(tree, 'codexLayer.allow').props.onClick();
  button(tree, 'codexLayer.notNow').props.onClick();
  assert.deepEqual(calls, ['allow', 'not now']);
  const colours = [...read(`${C}/CodexHoldCard.tsx`).matchAll(/\b(?:color|background): '([^']+)'/g)].map((m) => m[1]);
  assert.ok(colours.length > 5 && colours.every((c) => /^var\(--cth-(ink|paper|cream|peach)-[\w-]+\)$/.test(c)), `the state is the tag, never red: ${colours}`);
  const wt = mount(H.CodexHoldCard, { ...props, hold: WT_HOLD, busy: true, error: 'not saved' }).render();
  assert.equal(button(wt, 'codexLayer.allowAll').props.disabled, true);
  assert.equal(button(wt, 'codexLayer.notNow').props.disabled, true);
  assert.ok(text(wt).includes('not saved'));
  // an unread folder says so instead of rows
  const un = mount(H.CodexHoldCard, { ...props, hold: { ...HOLD, layers: [], unknown: ['x'] } }).render();
  assert.ok(text(render(kids(un).find((n) => n.type && n.type.name === 'FolderGroup'))).includes('codexLayer.unreadable'));
});

function cth(over = {}) {
  const calls = { allow: [], dismiss: [], spawn: [], withdraw: [] };
  let push = null;
  global.window = {
    cth: {
      codexHolds: async () => [HOLD],
      onCodexHolds: (cb) => { push = cb; return () => { push = null; }; },
      codexHoldAllow: async (k) => { calls.allow.push(k); return { ok: true }; },
      codexHoldDismiss: async (at) => { calls.dismiss.push(at); return { ok: true }; },
      codexAllowedFolders: async () => ['/Users/x/old'],
      codexWithdrawFolder: async (k) => { calls.withdraw.push(k); return { ok: true }; },
      getConfig: async () => ({ defaultCommand: 'claude' }),
      gitIsRepo: async (p) => p === W,
      spawnPty: async (o) => { calls.spawn.push(o); return { ok: true }; },
      ...over,
    },
  };
  return { calls, push: (h) => push(h) };
}

test('a held agent\'s pane: its newest hold over its terminal; Allow records the folder and starts it again in its worktree, resumed; not now puts it off', async () => {
  store.agents = [{ id: 'a1', name: 'Ann', ptyId: 'pty-1', cwd: P, worktreePath: W, command: 'codex --model x', provider: 'codex', description: 'reviewer' }];
  store.updates = [];
  const { calls, push } = cth();
  const pane = mount(H.CodexHoldPane, { ptyId: 'pty-1' });
  assert.equal(pane.render(), null, 'nothing until main answers');
  await settle();
  let tree = pane.render();
  assert.equal(tree.props.style.position, 'absolute', 'over the terminal');
  let card = findAll(tree, (n) => n.type === H.CodexHoldCard)[0];
  assert.equal(card.props.agent, 'Ann');
  assert.equal(card.props.hold.at, 100);
  push([{ ...HOLD, at: 150 }, { ...HOLD, agentId: 'zz', at: 160 }, { ...HOLD, at: 170 }]);
  tree = pane.render();
  card = findAll(tree, (n) => n.type === H.CodexHoldCard)[0];
  assert.equal(card.props.hold.at, 170, 'its own, newest');
  card.props.onAllow();
  await settle(); await settle();
  assert.deepEqual(calls.allow, [P]);
  assert.equal(calls.spawn.length, 1);
  const s = calls.spawn[0];
  assert.deepEqual({ id: s.id, cwd: s.cwd, command: s.command, args: s.args, cols: s.cols, rows: s.rows, isolate: s.isolate, resume: s.resume, provider: s.provider },
    { id: 'pty-1', cwd: W, command: 'codex', args: ['--model', 'x'], cols: 120, rows: 40, isolate: false, resume: true, provider: 'codex' });
  assert.deepEqual(s.hive, { id: 'a1', name: 'Ann', cwd: W, provider: 'codex', role: 'reviewer' });
  assert.deepEqual(terms.reset.at(-1), 'pty-1');
  assert.deepEqual(store.updates, [['a1', { status: 'idle', action: 'starting up' }]]);
  card.props.onNotNow();
  await settle();
  assert.deepEqual(calls.dismiss, [170]);
  // no agent for the pane, or no hold of its own: nothing
  assert.equal(mount(H.CodexHoldPane, { ptyId: 'other' }).render(), null);
});

test('a held agent\'s pane: an Allow not saved says so and starts nothing; the orchestrator starts as the orchestrator', async () => {
  store.agents = [{ id: 'a1', name: 'Ann', ptyId: 'pty-1', cwd: P, provider: 'codex' }, { id: 'g', name: 'Boss', ptyId: 'pty-g', cwd: P, provider: 'codex', isGod: true }];
  let { calls } = cth({ codexHoldAllow: async () => ({ ok: false, error: 'not-saved' }) });
  const pane = mount(H.CodexHoldPane, { ptyId: 'pty-1' });
  pane.render(); await settle();
  findAll(pane.render(), (n) => n.type === H.CodexHoldCard)[0].props.onAllow();
  await settle(); await settle();
  assert.equal(calls.spawn.length, 0);
  const card = findAll(pane.render(), (n) => n.type === H.CodexHoldCard)[0];
  assert.equal(card.props.error, 'settings.agentsModels.saveFailed');
  assert.equal(card.props.busy, false);
  // "that folder is not held" (allowed in Settings meanwhile): start anyway, main checks again
  ({ calls } = cth({ codexHolds: async () => [{ ...HOLD, agentId: 'g' }], codexHoldAllow: async () => ({ ok: false, error: 'that folder is not held' }) }));
  const gp = mount(H.CodexHoldPane, { ptyId: 'pty-g' });
  gp.render(); await settle();
  findAll(gp.render(), (n) => n.type === H.CodexHoldCard)[0].props.onAllow();
  await settle(); await settle();
  assert.equal(calls.spawn.length, 1);
  assert.equal(calls.spawn[0].hive.isGod, true);
  assert.equal(calls.spawn[0].cwd, P, 'no worktree: its own folder');
});

test('Settings: the starts waiting for an OK, one row per folder key with its files; Allow there starts nothing; the folders allowed, each withdrawable', async () => {
  const { calls, push } = cth({ codexHolds: async () => [HOLD, WT_HOLD, { ...HOLD, agentId: 'a3', at: 300, folderKey: '/Users/y', folder: '/Users/y', layers: [], unknown: ['x'] }] });
  const s = mount(H.CodexFoldersSetting, {});
  s.render(); await settle();
  let tree = s.render();
  const all = text(tree);
  assert.ok(all.includes('settings.codexFolders.waitingTitle') && all.includes('settings.codexFolders.waitingDesc'));
  const allows = buttons(tree).filter((b) => text(b) === 'settings.codexFolders.allow');
  assert.equal(allows.length, 2, 'two holds of one folder key are one row');
  assert.ok(all.includes(`${W}/.codex`) && all.includes('rules/w.rules') && all.includes('hooks/h1.sh') && all.includes('codexLayer.more{"count":5}'));
  assert.ok(all.includes('codexLayer.unreadable'), 'the unread one says so');
  assert.ok(all.includes('settings.codexFolders.title') && all.includes('/Users/x/old'));
  allows[0].props.onClick();
  await settle(); await settle();
  assert.deepEqual(calls.allow, [P]);
  assert.equal(calls.spawn.length, 0, 'Settings starts nothing');
  button(s.render(), 'settings.codexFolders.withdraw').props.onClick();
  await settle(); await settle();
  assert.deepEqual(calls.withdraw, ['/Users/x/old']);
  // one start waiting: its row
  const one = mount(H.CodexFoldersSetting, {});
  one.render(); await settle();
  push([HOLD]);
  assert.equal(buttons(one.render()).filter((b) => text(b) === 'settings.codexFolders.allow').length, 1);
  // no holds, nothing allowed: the empty line only
  push([]);
  global.window.cth.codexAllowedFolders = async () => [];
  const e = mount(H.CodexFoldersSetting, {});
  e.render(); await settle();
  push([]);
  tree = e.render();
  assert.ok(!text(tree).includes('waitingTitle'));
  assert.ok(text(tree).includes('settings.codexFolders.empty'));
  // a refused save says so
  const { calls: c2 } = cth({ codexWithdrawFolder: async () => ({ ok: false, error: 'not-saved' }) });
  const f = mount(H.CodexFoldersSetting, {});
  f.render(); await settle();
  button(f.render(), 'settings.codexFolders.withdraw').props.onClick();
  await settle(); await settle();
  assert.ok(text(f.render()).includes('settings.agentsModels.saveFailed'));
  assert.equal(c2.spawn.length, 0);
});

test('Add Agent: a held start shows the card in place of the error line; Allow records and starts again; not now keeps what was typed', async () => {
  const src = read(`${C}/AddAgentModal.tsx`);
  const a = src.indexOf('  const allowCodexFolder = async () => {');
  const b = src.indexOf('  const submit = async () => {', a);
  assert.ok(a > 0 && b > a);
  const js = ts.transpileModule(`${src.slice(a, b)}\nreturn { allowCodexFolder, notNowCodexFolder };`, { compilerOptions: { target: ts.ScriptTarget.ES2022 } }).outputText;
  const run = (hold, over) => {
    const log = [];
    const { calls } = cth(over);
    const f = new Function('codexHold', 'setBusy', 'setCodexHold', 'setCodexHoldError', 'tr', 'submit', js)(
      hold, (v) => log.push(['busy', v]), (v) => log.push(['hold', v]), (v) => log.push(['error', v]), (k) => k, async () => { log.push(['submit']); });
    return { f, log, calls };
  };
  let r = run(HOLD);
  await r.f.allowCodexFolder();
  await settle();
  assert.deepEqual(r.calls.allow, [P]);
  assert.deepEqual(r.log, [['busy', true], ['busy', false], ['submit']], 'records, then starts from the dialog');
  r = run(HOLD, { codexHoldAllow: async () => ({ ok: false, error: 'not-saved' }) });
  await r.f.allowCodexFolder();
  assert.deepEqual(r.log, [['busy', true], ['busy', false], ['error', 'settings.agentsModels.saveFailed']], 'not saved: says so, starts nothing');
  r = run(HOLD, { codexHoldAllow: async () => ({ ok: false, error: 'that folder is not held' }) });
  await r.f.allowCodexFolder();
  assert.equal(r.log.at(-1)[0], 'submit', 'allowed meanwhile: start again, main checks again');
  r = run(HOLD);
  r.f.notNowCodexFolder();
  await settle();
  assert.deepEqual(r.calls.dismiss, [100]);
  assert.deepEqual(r.log, [['hold', null], ['error', null]], 'the dialog stays as it was');
  r = run(null);
  await r.f.allowCodexFolder();
  assert.deepEqual(r.log, []);

  const sub = src.slice(b, src.indexOf('\n  };\n', b));
  assert.match(sub, /setError\(undefined\);\s*setCodexHold\(null\);\s*setCodexHoldError\(null\);/, 'a new press starts fresh');
  assert.match(sub, /if \(!spawnRes\.ok\) \{\s*setBusy\(false\);[^]*?if \(spawnRes\.codexHold\) \{ setCodexHold\(spawnRes\.codexHold\); return; \}\s*setError\(spawnRes\.error \?\? 'spawn failed'\);/, 'the card, not main\'s English reason');
  const card = src.indexOf('<CodexHoldCard');
  assert.ok(card > 0 && card < src.indexOf('{error && (', card) && src.lastIndexOf('{codexHold && (', card) > card - 40, 'drawn where the error line is');
  assert.match(src.slice(card, card + 300), /hold=\{codexHold\}\s*agent=\{name\.trim\(\)\}\s*busy=\{busy\}\s*error=\{codexHoldError\}\s*onAllow=\{\(\) => void allowCodexFolder\(\)\}\s*onNotNow=\{notNowCodexFolder\}/);
});

test('wiring: the pane card over every terminal, the Settings list in Agents & Models, restore team points at Settings', () => {
  const pty = read(`${C}/PtyTerminalView.tsx`);
  assert.match(pty, /import \{ CodexHoldPane \} from '\.\/CodexHoldCard';/);
  assert.match(pty, /<div style=\{\{ flex: 1, minHeight: 0, position: 'relative', display: 'flex', flexDirection: 'column' \}\}>\s*<div ref=\{hostRef\}[^]*?\/>\s*\{\/\*[^]*?\*\/\}\s*<CodexHoldPane ptyId=\{ptyId\} \/>\s*<\/div>/);
  const set = read(`${C}/SettingsModal.tsx`);
  assert.match(set, /import \{ CodexFoldersSetting \} from '\.\/CodexHoldCard';/);
  assert.equal(set.split('<CodexFoldersSetting />').length, 2, 'once');
  const restore = read('src/renderer/src/hooks/useRestoreTeam.ts');
  assert.match(restore, /import i18n from '@\/i18n';/);
  assert.match(restore, /failures\.push\(`\$\{a\.name\}: \$\{res\.codexHold \? i18n\.t\('codexLayer\.heldReason'\) : \(res\.error \?\? 'spawn failed'\)\}`\);/);
  assert.match(restore, /console\.error\('\[restore\] spawn failed for', a\.id, res\.error\);/, 'main\'s reason stays in the log');
});

test('the words: every key the card, the pane and Settings use is in English, Arabic and Chinese, the same keys in each; "1 more file" reads as one', async () => {
  const src = read(`${C}/CodexHoldCard.tsx`) + read(`${C}/AddAgentModal.tsx`) + read('src/renderer/src/hooks/useRestoreTeam.ts');
  const used = new Set([...src.matchAll(/t\('((?:codexLayer|settings\.codexFolders|settings\.agentsModels\.saveFailed)[\w.]*)'/g)].map((m) => m[1]));
  for (const k of ['config', 'hooks', 'setting', 'rules', 'agents', 'hookFiles', 'unreadable', 'doesNotParse']) used.add(`codexLayer.kind.${k}`);
  for (const k of ['codexLayer.allowAll', 'codexLayer.allow']) used.add(k);
  const get = (o, k) => k.split('.').reduce((x, p) => (x == null ? x : x[p]), o);
  const flat = (o, pre = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'object' ? flat(v, `${pre}${k}.`) : [`${pre}${k}`])).sort();
  const en = LOC('en');
  for (const l of ['en', 'ar', 'zh-CN']) {
    const j = LOC(l);
    for (const k of used) assert.equal(typeof get(j, k), 'string', `${l} ${k}`);
    assert.deepEqual(flat(j.codexLayer), flat(en.codexLayer), `${l} codexLayer keys`);
    assert.deepEqual(flat(j.settings.codexFolders), flat(en.settings.codexFolders), `${l} codexFolders keys`);
    for (const k of flat(j.codexLayer)) {
      const v = get(j.codexLayer, k);
      if (/\{\{count\}\}/.test(get(en.codexLayer, k))) assert.match(v, /\{\{count\}\}/, `${l} ${k}`);
      if (l !== 'en') assert.notEqual(v, get(en.codexLayer, k), `${l} ${k} is translated`);
    }
    for (const k of ['title', 'body']) assert.match(j.codexLayer[k], /\{\{agent\}\}/, `${l} ${k}`);
  }
  const i = i18next.createInstance();
  await i.init({ lng: 'en', resources: { en: { translation: en }, ar: { translation: LOC('ar') }, 'zh-CN': { translation: LOC('zh-CN') } }, interpolation: { escapeValue: false } });
  assert.equal(i.t('codexLayer.more', { count: 1 }), 'and 1 more file');
  assert.equal(i.t('codexLayer.more', { count: 3 }), 'and 3 more files');
  assert.equal(i.t('codexLayer.more', { count: 1, lng: 'ar' }), LOC('ar').codexLayer.more_one);
  assert.equal(i.t('codexLayer.more', { count: 1, lng: 'zh-CN' }), LOC('zh-CN').codexLayer.more.replace('{{count}}', '1'), 'Chinese has one form');
  assert.match(en.settings.codexFolders.waitingDesc, /Each needs your OK first/);
});
