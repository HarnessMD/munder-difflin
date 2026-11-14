'use strict';

// The History tab: an agent's conversation read from its engine's own record, read only. The
// window keeps at most a set number of items as one stretch of the file, cut only between
// lines; it follows new turns while it reaches the file's end, pages older ones on request, and
// starts over when the file changes. Prompts and replies sit in boxes with their kind in a chip,
// a compacted line is a rule with its words, a tool line stays left to right. Each state that
// shows no record has its own line. Below 520 px the closed tabs show only their icon.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const C = 'src/renderer/src/components';
const H = loadTs('src/shared/history.ts');
const M = loadTs(`${C}/historyModel.ts`);
const LOC = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));
const en = LOC('en');
const get = (o, k) => k.split('.').reduce((v, p) => (v == null ? v : v[p]), o);

// React stood in: each mounted component keeps its own state; an effect runs after a render
// when its deps change (cleanup first). JSX is plain { type, props } to read and press. A ref
// made with null starts on REF_EL when one is set (the element a ref would be attached to).
let current = null;
let REF_EL = null;
const slot = (init) => { const c = current; const i = c.hook++; if (!(i in c.states)) c.states[i] = init(); return c.states[i]; };
const effect = (fn, deps) => {
  const c = current;
  const i = c.hook++;
  const prev = c.deps.get(i);
  if (prev && deps && deps.length === prev.length && deps.every((d, k) => Object.is(d, prev[k]))) return;
  c.deps.set(i, deps);
  c.pending.push(() => { c.cleanups.get(i)?.(); const u = fn(); c.cleanups.set(i, typeof u === 'function' ? u : undefined); });
};
const React = {
  useState: (init) => {
    const c = current;
    const i = c.hook++;
    if (!(i in c.states)) c.states[i] = typeof init === 'function' ? init() : init;
    return [c.states[i], (v) => { c.states[i] = typeof v === 'function' ? v(c.states[i]) : v; }];
  },
  useRef: (v) => slot(() => ({ current: v === null && REF_EL ? REF_EL : v })),
  useCallback: (fn, deps) => { const s = slot(() => ({ fn, deps })); if (!deps || deps.some((d, k) => !Object.is(d, s.deps[k]))) { s.fn = fn; s.deps = deps; } return s.fn; },
  useEffect: effect,
  useLayoutEffect: effect,
};
const jsx = (type, p) => ({ type, props: p ?? {} });
const kids = (n) => [n?.props?.children].flat(Infinity).filter((c) => c != null && c !== false && c !== true);
const text = (n) => (typeof n === 'string' || typeof n === 'number' ? String(n) : kids(n).map(text).join(''));
function findAll(n, pred, out = []) {
  if (n && typeof n === 'object') { if (pred(n)) out.push(n); for (const c of kids(n)) findAll(c, pred, out); }
  return out;
}
function mount(fn, props) {
  const c = { states: [], hook: 0, deps: new Map(), cleanups: new Map(), pending: [] };
  c.render = () => {
    const prev = current; current = c; c.hook = 0;
    let out;
    try { out = fn(typeof props === 'function' ? props() : props); } finally { current = prev; }
    for (const e of c.pending.splice(0)) e();
    return out;
  };
  c.unmount = () => { for (const u of c.cleanups.values()) u?.(); };
  return c;
}
/** Draw a tree all the way down: function components are called with their props. */
function deep(n) {
  if (Array.isArray(n)) return n.map(deep);
  if (!n || typeof n !== 'object') return n;
  if (typeof n.type === 'function') return deep(mount(n.type, n.props).render());
  return { ...n, props: { ...n.props, children: n.props.children === undefined ? undefined : deep(n.props.children) } };
}
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };
const t = (k, o = {}) => { const v = get(en, k); return typeof v === 'string' ? v.replace(/\{\{(\w+)\}\}/g, (_, n) => String(o[n])) : k; };
let RTL = false;
function run(file, mods, globals = {}) {
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const all = {
    react: React, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' }, 'react-i18next': { useTranslation: () => ({ t }) },
    '@/i18n/useDirection': { useRtl: () => RTL }, ...mods,
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), js)((m) => { if (!(m in all)) throw new Error(`unexpected import ${m} in ${file}`); return all[m]; }, mod, mod.exports, ...Object.values(globals));
  return mod.exports;
}

// Items: `line` is the transcript line (its byte offset); one line can give several items.
const item = (id, line, over = {}) => ({ id, kind: 'assistant', at: null, text: `t${id}`, offset: line * 100, ...over });
const page = (items, over = {}) => ({ ok: true, provider: 'claude', fileId: 'f1', fileName: 's.jsonl', items, start: items.length ? items[0].offset : 0, end: 1000, atStart: false, size: 1000, ...over });

// ── the window ───────────────────────────────────────────────────────────────

test('a tail page is the whole window, live at the file\'s end; past the cap the oldest go, cut only between lines', () => {
  const w = M.applyTail(page([item('a', 1), item('b', 2), item('c', 2), item('d', 3)], { end: 400, atStart: true }), 3);
  assert.deepEqual(w.items.map((i) => i.id), ['b', 'c', 'd'], 'one over the cap: the oldest line goes');
  assert.equal(w.start, 200);
  assert.equal(w.atStart, false, 'trimmed: no longer the start of the session');
  assert.equal(w.live, true);
  assert.equal(w.end, 400);
  const keepLine = M.applyTail(page([item('a', 1), item('b', 1), item('c', 2), item('d', 3)]), 3);
  assert.deepEqual(keepLine.items.map((i) => i.id), ['c', 'd'], 'a line is never split: both items of line 1 go');
  assert.equal(keepLine.start, 200);
  const whole = M.applyTail(page([item('a', 1)], { atStart: true }));
  assert.equal(whole.atStart, true);
  assert.equal(H.HISTORY_RETAIN_MAX, 600, 'the default cap');
  for (const reason of ['no-agent', 'unsupported-provider', 'no-transcript', 'unreadable']) {
    assert.deepEqual(M.applyTail({ ok: false, reason }), { ...M.EMPTY_WINDOW, unavailable: reason });
  }
});

test('an older page goes in front only when it ends where the window starts, in the same file; past the cap the newest go and following pauses', () => {
  const w = M.applyTail(page([item('c', 3), item('d', 4)], { end: 500 }));
  const older = page([item('a', 1), item('b', 2)], { start: 100, end: 300, atStart: true });
  const both = M.applyOlder(w, older);
  assert.deepEqual(both.items.map((i) => i.id), ['a', 'b', 'c', 'd']);
  assert.equal(both.start, 100);
  assert.equal(both.atStart, true);
  assert.equal(both.live, true, 'under the cap the window still reaches the end');
  const capped = M.applyOlder(w, older, 3);
  assert.deepEqual(capped.items.map((i) => i.id), ['a', 'b', 'c']);
  assert.equal(capped.end, 400, 'ends where the first dropped line starts');
  assert.equal(capped.live, false, 'no longer at the file\'s end: following pauses');
  const sameLine = M.applyOlder(M.applyTail(page([item('c', 3), item('d', 3)], { end: 500 })), older, 3);
  assert.deepEqual(sameLine.items.map((i) => i.id), ['a', 'b'], 'the two items of line 3 go together');
  assert.equal(sameLine.end, 300);
  assert.equal(M.applyOlder(w, { ...older, fileId: 'f2' }), 'reload', 'another file');
  assert.equal(M.applyOlder(w, { ...older, end: 250 }), 'reload', 'not the page just before');
  assert.equal(M.applyOlder(w, { ok: false, reason: 'unreadable' }), 'reload');
});

test('a newer page is added at the end when it starts where the window ends; a new file, a reset or a gap starts over; nothing new changes nothing', () => {
  const w = M.applyTail(page([item('a', 1), item('b', 2)], { end: 300 }));
  const more = page([item('c', 3), item('d', 4)], { start: 300, end: 500 });
  const next = M.applyNewer(w, more);
  assert.deepEqual(next.items.map((i) => i.id), ['a', 'b', 'c', 'd']);
  assert.equal(next.end, 500);
  assert.deepEqual(M.applyNewer(w, more, 3).items.map((i) => i.id), ['b', 'c', 'd'], 'the oldest go past the cap');
  assert.equal(M.applyNewer(w, page([], { start: 300, end: 300 })), w, 'the same window: no render');
  assert.equal(M.applyNewer(w, { ...more, fileId: 'f2' }), 'reload', 'a new session or a rotated thread');
  assert.equal(M.applyNewer(w, { ...more, reset: true }), 'reload', 'the file was cut back');
  assert.equal(M.applyNewer(w, { ...more, start: 350 }), 'reload', 'a gap');
  assert.equal(M.applyNewer(w, { ok: false, reason: 'unreadable' }), 'reload');
});

test('only the rows in view and an overscan either side are mounted; the spacers keep the full height', () => {
  const hs = Array(100).fill(50);
  const r = M.visibleRange(hs, 1000, 500, 100);
  assert.equal(r.first, 18, 'from 900 px');
  assert.equal(r.last, 32, 'to 1600 px');
  assert.equal(r.padTop, 900);
  assert.equal(r.padTop + (r.last - r.first) * 50 + r.padBottom, 5000);
  assert.equal(r.total, 5000);
  const top = M.visibleRange(hs, 0, 500);
  assert.equal(top.first, 0);
  assert.equal(top.padTop, 0);
  const past = M.visibleRange([40, 60], 5000, 500, 0);
  assert.deepEqual([past.first, past.last, past.padTop, past.padBottom], [2, 2, 100, 0], 'scrolled past the end mounts nothing');
  assert.deepEqual(M.visibleRange([], 0, 500), { first: 0, last: 0, padTop: 0, padBottom: 0, total: 0 });
  const mixed = M.visibleRange([10, 200, 10, 10], 0, 50, 0);
  assert.deepEqual([mixed.first, mixed.last], [0, 2], 'measured heights decide');
});

test('the words: a clock in local time or none; the compacted and checkpoint lines are keyed, a slash command is data; each reason has its line; the engine by its name', () => {
  const at = new Date(2026, 9, 19, 9, 5, 7).getTime();
  assert.equal(M.clockOf(at), '09:05:07');
  assert.equal(M.clockOf(null), '');
  assert.equal(M.clockOf(NaN), '');
  assert.equal(M.systemKey('Conversation compacted'), 'history.compacted');
  assert.equal(M.systemKey('Context compacted'), 'history.compacted', 'Codex says it this way');
  assert.equal(M.systemKey('Context checkpoint'), 'history.checkpoint');
  assert.equal(M.systemKey('/review'), null);
  assert.deepEqual(M.UNAVAILABLE_KEY, { 'no-agent': 'history.empty', 'unsupported-provider': 'history.unsupported', 'no-transcript': 'history.empty', unreadable: 'history.readFailed' });
  assert.deepEqual(M.ENGINE_NAME, { claude: 'Claude Code', codex: 'Codex', antigravity: 'Antigravity' });
});

// ── the rows and the list ────────────────────────────────────────────────────

function viewOf(cth, timers = []) {
  global.window = { cth };
  return run(`${C}/HistoryView.tsx`, { '@shared/history': H, './PixelButton': { PixelButton: 'PixelButton' }, './historyModel': M },
    { setInterval: (fn, ms) => { timers.push([fn, ms]); return timers.length; }, clearInterval: (id) => timers.push(['cleared', id]), ResizeObserver: class { observe() {} disconnect() {} }, CSS: { escape: (s) => s } });
}
const V = viewOf({});
const row = (it) => mount(V.HistoryRow, { item: it }).render();

test('rows: a prompt and a reply in boxes with their chip; record text takes its own direction only in Arabic; a cut text says so; a tool line stays left to right', () => {
  const at = new Date(2026, 9, 19, 9, 5, 7).getTime();
  for (const [kind, chip, bg] of [['user', 'PROMPT', 'var(--cth-sky-light)'], ['assistant', 'REPLY', 'var(--cth-mint-light)']]) {
    RTL = false;
    const r = row(item('x', 1, { kind, at, text: 'مرحبا hello' }));
    assert.equal(r.props['data-kind'], kind);
    assert.equal(r.props.style.boxShadow, 'inset 0 0 0 1px var(--cth-ink-100)', 'an even 1 px border all round');
    const tag = findAll(r, (n) => n.type === 'span' && text(n) === chip)[0];
    assert.ok(tag, chip);
    assert.equal(tag.props.style.background, bg);
    assert.ok(text(r).includes('09:05:07'));
    const body = findAll(r, (n) => n.type === 'div' && n.props.style?.whiteSpace === 'pre-wrap')[0];
    assert.equal(body.props.dir, undefined, 'English window: no direction of its own');
    assert.equal(body.props.style.userSelect, 'text');
    RTL = true;
    assert.equal(findAll(row(item('x', 1, { kind })), (n) => n.props?.style?.whiteSpace === 'pre-wrap')[0].props.dir, 'auto');
    RTL = false;
  }
  assert.ok(text(row(item('x', 1, { truncated: true }))).endsWith(' (cut short)'));
  assert.ok(!text(row(item('x', 1, { at: null }))).match(/\d\d:\d\d:\d\d/), 'no time, no clock');
  RTL = true;
  const tool = row(item('x', 1, { kind: 'tool', text: 'Read src/a.ts', at }));
  assert.equal(tool.props.dir, 'ltr');
  assert.equal(tool.props['data-kind'], 'tool');
  assert.ok(text(tool).startsWith('› Read src/a.ts'));
  RTL = false;
  const compacted = row(item('x', 1, { kind: 'system', text: 'Conversation compacted', at }));
  assert.equal(compacted.props['data-kind'], 'system');
  assert.equal(findAll(compacted, (n) => n.props?.style?.height === 1).length, 2, 'a rule each side of the words');
  assert.ok(text(compacted).startsWith('Conversation compacted'));
  assert.equal(findAll(compacted, (n) => n.type === 'code').length, 0);
  const slash = findAll(row(item('x', 1, { kind: 'system', text: '/review' })), (n) => n.type === 'code');
  assert.equal(slash.length, 1);
  assert.equal(slash[0].props.dir, 'ltr');
  assert.equal(text(slash[0]), '/review');
});

test('the list: each state has its own line; Load older at the top unless it is the start; only the mounted rows; Jump to latest while not following', () => {
  const list = (p) => deep(mount(V.HistoryList, { first: 0, last: 0, padTop: 0, padBottom: 0, loading: false, following: true, ...p }).render());
  for (const [reason, words] of [['unsupported-provider', en.history.unsupported], ['unreadable', en.history.readFailed], ['no-transcript', en.history.empty], ['no-agent', en.history.empty]]) {
    assert.equal(text(list({ win: { ...M.EMPTY_WINDOW, unavailable: reason } })), words, reason);
  }
  assert.equal(list({ win: M.EMPTY_WINDOW, loading: true }), null, 'nothing to say before the first answer');
  assert.equal(text(list({ win: M.EMPTY_WINDOW })), en.history.empty);
  const said = [];
  const w = M.applyTail(page([item('a', 1), item('b', 2), item('c', 3)]));
  let tree = list({ win: w, first: 1, last: 3, padTop: 44, padBottom: 0, following: false, onLoadOlder: () => said.push('older'), onJumpLatest: () => said.push('jump') });
  assert.deepEqual(findAll(tree, (n) => n.props && 'data-hid' in n.props).map((n) => n.props['data-hid']), ['b', 'c'], 'only the rows in range');
  assert.equal(findAll(tree, (n) => n.props && 'data-pad-top' in n.props)[0].props.style.height, 44);
  const btns = findAll(tree, (n) => n.type === 'PixelButton');
  assert.deepEqual(btns.map((b) => text(b)), ['Load older', 'Jump to latest']);
  btns.forEach((b) => b.props.onClick());
  assert.deepEqual(said, ['older', 'jump']);
  assert.equal(btns[0].props.disabled, false);
  assert.equal(findAll(list({ win: w, loading: true }), (n) => n.type === 'PixelButton')[0].props.disabled, true, 'no second page while one loads');
  tree = list({ win: { ...w, atStart: true }, following: true });
  assert.ok(text(tree).startsWith('Start of this session'));
  assert.equal(findAll(tree, (n) => n.type === 'PixelButton').length, 0, 'following: no jump');
  assert.ok(text(list({ win: { ...w, items: [] } })).includes(en.history.empty), 'a session with no turns yet');
});

// ── the tab, with main stood in ──────────────────────────────────────────────

function tabOf(answers) {
  const calls = [];
  const timers = [];
  const cth = { hiveHistory: async (req) => { calls.push(req); const a = answers.shift(); if (a instanceof Error) throw a; return a; } };
  const View = viewOf(cth, timers);
  const tab = mount(View.HistoryView, { agentId: 'ann' });
  const draw = () => deep(tab.render());
  const poll = async () => { await timers[0][0](); await settle(); return draw(); };
  return { tab, calls, timers, draw, poll };
}
const rowsOf = (tree) => findAll(tree, (n) => n.props && 'data-hid' in n.props).map((n) => n.props['data-hid']);

test('the tab reads the tail as it opens, then follows every 2 s from where it ended; the footer names the engine', async () => {
  const v = tabOf([page([item('a', 1), item('b', 2)], { end: 300 }), page([item('c', 3)], { start: 300, end: 400 }), page([], { start: 400, end: 400 })]);
  v.tab.render(); await settle();
  let tree = v.draw();
  assert.deepEqual(v.calls, [{ agentId: 'ann' }]);
  assert.deepEqual(rowsOf(tree), ['a', 'b']);
  assert.equal(text(tree).trim().endsWith("Read only, from Claude Code's own record of this session."), true);
  assert.equal(v.timers[0][1], 2000);
  tree = await v.poll();
  assert.deepEqual(v.calls[1], { agentId: 'ann', after: 300 });
  assert.deepEqual(rowsOf(tree), ['a', 'b', 'c']);
  await v.poll();
  assert.deepEqual(v.calls[2], { agentId: 'ann', after: 400 });
  v.tab.unmount();
  assert.deepEqual(v.timers.at(-1), ['cleared', 1], 'closing the tab stops the poll');
});

test('a new file while following starts over from its tail; a failed poll keeps what is shown; a failed first read says it could not be read and tries again', async () => {
  const v = tabOf([page([item('a', 1)], { end: 200 }), page([item('n', 1)], { fileId: 'f2', start: 200, end: 300 }), page([item('z', 1)], { fileId: 'f2', start: 0, end: 300 }), new Error('busy'), page([item('y', 4)], { fileId: 'f2', start: 300, end: 500 })]);
  v.tab.render(); await settle();
  v.draw();
  let tree = await v.poll();
  await settle();
  tree = v.draw();
  assert.deepEqual(v.calls.slice(1), [{ agentId: 'ann', after: 200 }, { agentId: 'ann' }], 'the new file: the tail again');
  assert.deepEqual(rowsOf(tree), ['z']);
  tree = await v.poll();
  assert.deepEqual(rowsOf(tree), ['z'], 'a failed poll keeps the rows');
  tree = await v.poll();
  assert.deepEqual(rowsOf(tree), ['z', 'y'], 'and the next poll still follows');

  const f = tabOf([new Error('EACCES'), page([item('a', 1)])]);
  f.tab.render(); await settle();
  assert.equal(text(f.draw()), en.history.readFailed);
  await f.poll();
  assert.deepEqual(f.calls, [{ agentId: 'ann' }, { agentId: 'ann' }], 'with no record yet the poll asks for the tail');
  assert.deepEqual(rowsOf(f.draw()), ['a']);

  const u = tabOf([{ ok: false, reason: 'unsupported-provider' }]);
  u.tab.render(); await settle();
  assert.equal(text(u.draw()), en.history.unsupported);
  assert.ok(!text(u.draw()).includes('Read only'), 'no footer without a record');
});

test('Load older asks for the page before the window and puts it in front; a page that does not fit starts over; one request at a time', async () => {
  let release;
  const v = tabOf([page([item('c', 3), item('d', 4)], { start: 300, end: 500 })]);
  v.tab.render(); await settle();
  let tree = v.draw();
  const older = findAll(tree, (n) => n.type === 'PixelButton' && text(n) === 'Load older')[0];
  const cth = global.window.cth;
  const answer = page([item('a', 1), item('b', 2)], { start: 100, end: 300, atStart: true });
  cth.hiveHistory = (req) => { v.calls.push(req); return new Promise((r) => { release = () => r(answer); }); };
  older.props.onClick();
  older.props.onClick();
  await v.timers[0][0]();
  assert.deepEqual(v.calls.slice(1), [{ agentId: 'ann', before: 300 }], 'one request: the second press and the poll wait');
  release(); await settle();
  tree = v.draw();
  assert.deepEqual(rowsOf(tree), ['a', 'b', 'c', 'd']);
  assert.ok(text(tree).startsWith('Start of this session'));

  const w = tabOf([page([item('c', 3)], { start: 300, end: 500 }), page([item('x', 1)], { fileId: 'f9', start: 100, end: 300 }), page([item('y', 1)], { fileId: 'f9', end: 900 })]);
  w.tab.render(); await settle();
  findAll(w.draw(), (n) => n.type === 'PixelButton' && text(n) === 'Load older')[0].props.onClick();
  await settle();
  assert.deepEqual(w.calls, [{ agentId: 'ann' }, { agentId: 'ann', before: 300 }, { agentId: 'ann' }], 'another file: the tail again');
  assert.deepEqual(rowsOf(w.draw()), ['y']);
});

// ── the tabs and the panel ───────────────────────────────────────────────────

test('History is the tab after Terminal; below 520 px the closed tabs keep only their icon, named in a tooltip; the open one keeps its word', () => {
  let observed = null;
  const ST = run(`${C}/SidebarTabs.tsx`, { '@/store/store': {}, '@/design/tokens': {}, './Icon': { Icon: 'Icon' } },
    { ResizeObserver: class { constructor(cb) { observed = cb; } observe() {} disconnect() {} } });
  assert.equal(ST.COMPACT_TABS_PX, 520);
  const el = { clientWidth: 900 };
  REF_EL = el;
  const tabs = mount(ST.SidebarTabs, { current: 'history', accent: 'sky', onChange() {} });
  let tree = tabs.render();
  REF_EL = null;
  const btns = (tr) => findAll(tr, (n) => n.type === 'button');
  assert.deepEqual(btns(tree).map((b) => findAll(b, (n) => n.type === 'Icon')[0].props.name), ['terminal', 'clock', 'code', 'bell', 'web']);
  assert.deepEqual(btns(tree).map((b) => text(b).trim()), ['TERMINAL', 'HISTORY', 'GIT', 'MESSAGES', 'TRACES']);
  observed(); tree = tabs.render();
  assert.equal(btns(tree)[0].props.title, undefined, 'wide: words on every tab');
  el.clientWidth = 400; observed(); tree = tabs.render();
  assert.deepEqual(btns(tree).map((b) => text(b).trim()), ['', 'HISTORY', '', '', '']);
  assert.deepEqual(btns(tree).map((b) => b.props['aria-label']), ['terminal', undefined, 'git', 'messages', 'traces']);
  assert.deepEqual(btns(tree).map((b) => b.props.title), ['terminal', undefined, 'git', 'messages', 'traces']);
  assert.deepEqual(btns(tree).map((b) => b.props.style.flex), ['0 1 auto', 1, '0 1 auto', '0 1 auto', '0 1 auto']);
  el.clientWidth = 0; observed(); tree = tabs.render();
  assert.equal(btns(tree)[0].props.title, undefined, 'a hidden row (no width) keeps the words');
});

test('the panel: History sits in its own error box, a fresh one per agent; the store keeps a History pick across a restart', () => {
  const panel = read(`${C}/AgentDetailPanel.tsx`);
  assert.match(panel, /\{sidebarTab === 'history' && \(\s*(\/\/[^\n]*\n\s*)?<ErrorBoundary key=\{agent\.id\} where=\{t\('where\.history'\)\} recover="remount">\s*<HistoryView agentId=\{agent\.id\} \/>\s*<\/ErrorBoundary>\s*\)\}/);
  const store = read('src/renderer/src/store/store.ts');
  assert.match(store, /export type SidebarTab = 'terminal' \| 'history' \| 'messages' \| 'traces' \| 'git';/);
  assert.match(store, /if \(v === 'terminal' \|\| v === 'history' \|\| v === 'messages' \|\| v === 'traces' \|\| v === 'git'\) return v;/);
  const view = read(`${C}/HistoryView.tsx`);
  assert.doesNotMatch(view, /dir="auto"/, 'no bare auto direction');
  assert.match(view, /dir=\{rtl \? 'auto' : undefined\}/);
  assert.doesNotMatch(view, /hiveWriteTasks|hivePatch|hiveSend|writeFile/, 'read only');
});

test('colours and words: soft chips, no red, every token declared; every History key in three languages, translated, same placeholders', () => {
  const src = read(`${C}/HistoryView.tsx`);
  const used = [...new Set(src.match(/var\(--cth-[a-z0-9-]+\)/g))];
  assert.deepEqual(used.filter((v) => /coral|red|status-blocked/.test(v)), []);
  const tokens = read('src/renderer/src/design/tokens.css');
  for (const v of used) assert.match(tokens, new RegExp(`${v.slice(4, -1)}\\s*:`), `${v} is declared`);
  const keys = ['sidebar.history', 'where.history', ...Object.keys(en.history).map((k) => `history.${k}`)];
  assert.equal(keys.length, 14);
  for (const l of ['ar', 'zh-CN']) {
    const j = LOC(l);
    assert.deepEqual(Object.keys(j.history).sort(), Object.keys(en.history).sort(), `${l} history keys`);
    for (const k of keys) {
      const v = get(j, k);
      assert.equal(typeof v, 'string', `${l} ${k}`);
      assert.notEqual(v, get(en, k), `${l} ${k} is translated`);
      assert.deepEqual((v.match(/\{\{\w+\}\}/g) ?? []).sort(), (get(en, k).match(/\{\{\w+\}\}/g) ?? []).sort(), `${l} ${k} placeholders`);
    }
  }
});
