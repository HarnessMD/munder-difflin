'use strict';

// Ask Me in the window: a question with options shows them, the recommended one marked, one
// pick or several; a click only picks, the button names the answer and sends it with a note.
// An answer goes through main, naming the question the card showed. When the question changed
// or closed first, nothing is sent: the box empties and what was written stays to copy, and a
// card closed meanwhile stays, read only, until the person drops it. Content text follows the
// language gate. The kanban and the floor count the same open question as main.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const ts = require(path.join(ROOT, 'node_modules/typescript'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const C = 'src/renderer/src/components';
const Q = loadTs('src/shared/humanQuestion.ts');
const IME = loadTs('src/shared/imeGuard.ts');

// React stood in: each mounted component keeps its own state; an effect runs after a render
// when its deps change (cleanup first). JSX is plain { type, props } to read and press.
let current = null;
const React = {
  useState: (init) => {
    const c = current;
    const i = c.hook++;
    if (!(i in c.states)) c.states[i] = typeof init === 'function' ? init() : init;
    return [c.states[i], (v) => { c.states[i] = typeof v === 'function' ? v(c.states[i]) : v; }];
  },
  useRef: (v) => { const c = current; const i = c.hook++; if (!(i in c.states)) c.states[i] = { current: v }; return c.states[i]; },
  useCallback: (fn) => { const c = current; const i = c.hook++; if (!(i in c.states)) c.states[i] = fn; return c.states[i]; },
  useEffect: (fn, deps) => {
    const c = current;
    const i = c.hook++;
    const prev = c.deps.get(i);
    if (prev && deps && deps.length === prev.length && deps.every((d, k) => Object.is(d, prev[k]))) return;
    c.deps.set(i, deps);
    c.pending.push(() => { c.cleanups.get(i)?.(); const u = fn(); c.cleanups.set(i, typeof u === 'function' ? u : undefined); });
  },
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
  return c;
}
const settle = async () => { for (let i = 0; i < 4; i++) await new Promise((r) => setImmediate(r)); };
const t = (k, o) => (o ? `${k}${JSON.stringify(o)}` : k);
let RTL = false;
/** A .tsx module with React stood in; `mods` are its imports (an unknown one throws). */
function loadTsx(file, mods, globals = {}) {
  const js = ts.transpileModule(read(file), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  const all = {
    react: React, 'react/jsx-runtime': { jsx, jsxs: jsx, Fragment: 'Fragment' },
    'react-i18next': { useTranslation: () => ({ t, i18n: { language: 'en' } }) },
    '@/i18n/useDirection': { useRtl: () => RTL }, ...mods,
  };
  const mod = { exports: {} };
  new Function('require', 'module', 'exports', ...Object.keys(globals), js)((m) => { if (!(m in all)) throw new Error(`unexpected import ${m} in ${file}`); return all[m]; }, mod, mod.exports, ...Object.values(globals));
  return mod.exports;
}
const AQ = loadTsx(`${C}/AskMeQuestion.tsx`, {
  './PixelButton': { PixelButton: 'PixelButton' }, '@/markdown/MarkdownPreview': { MarkdownPreview: 'MarkdownPreview' },
  '@shared/imeGuard': IME, '@shared/humanQuestion': Q,
});
// The kanban's own helpers, run as written; its components are never drawn here.
const stub = new Proxy({}, { get: () => 'Stub' });
const TK = loadTsx(`${C}/TasksKanban.tsx`, {
  './PixelPanel': stub, './PixelButton': stub, './PixelBadge': stub, './Icon': stub, '@/store/store': { useStore: () => undefined },
  '@/markdown/MarkdownPreview': stub, '@shared/humanQuestion': Q,
});

const ASKED = '2026-10-19T09:00:00.000Z';
const OPTS = [{ label: 'Fly.io', detail: 'one region' }, { label: 'A droplet' }, 'Render'];
const qa = (over = {}) => ({ q: 'Where do we host the relay?\nIt needs one box.', askedAt: ASKED, options: OPTS, recommended: 1, ...over });
const task = (over = {}) => ({ id: 't1', title: 'Pick a host', status: 'blocked', priority: 2, assignee: 'stanley', humanQA: [qa()], ...over });

// ── the question ─────────────────────────────────────────────────────────────

test('the headline: a short first line, else its first short sentence; a list item or a long line is all body', () => {
  assert.deepEqual(AQ.splitHeadline('Where do we host it?\nOne box.'), { headline: 'Where do we host it?', body: 'One box.' });
  assert.deepEqual(AQ.splitHeadline('## Ship it?'), { headline: 'Ship it?', body: '' });
  assert.deepEqual(AQ.splitHeadline('- a\n- b'), { headline: null, body: '- a\n- b' });
  const long = `This is the first sentence. ${'x'.repeat(200)}`;
  assert.deepEqual(AQ.splitHeadline(long), { headline: 'This is the first sentence.', body: 'x'.repeat(200) });
  assert.equal(AQ.splitHeadline('y'.repeat(200)).headline, null);
  assert.deepEqual(AQ.splitHeadline('\r\n\r\nHi\r\nthere'), { headline: 'Hi', body: 'there' });
});

test('a click only picks: one pick replaces, a second click clears; several toggle, sorted', () => {
  assert.deepEqual(AQ.togglePick(false, [], 2), [2]);
  assert.deepEqual(AQ.togglePick(false, [2], 0), [0]);
  assert.deepEqual(AQ.togglePick(false, [2], 2), []);
  assert.deepEqual(AQ.togglePick(true, [2], 0), [0, 2]);
  assert.deepEqual(AQ.togglePick(true, [0, 2], 2), [0]);
});

const draw = (props) => mount(AQ.AskMeQuestion, { entry: Q.normalizeHumanQA(qa()), draft: '', onDraft() {}, picks: [], onPicks() {}, onSend() {}, sending: false, ...props }).render();
const btn = (tree) => findAll(tree, (n) => n.type === 'PixelButton')[0];
const options = (tree) => findAll(tree, (n) => n.type === 'button' && (n.props.role === 'radio' || n.props.role === 'checkbox'));

test('options: a CHOOSE tag and when it was asked, the bold headline, each option with its detail, the recommended one marked; one pick is a radio group', () => {
  const tree = draw({});
  const all = text(tree);
  assert.ok(all.includes('askMe.kind.choose') && !all.includes('askMe.pickAny'));
  assert.match(all, /askMe\.asked\{"when":"[^"]+"\}/);
  assert.equal(findAll(tree, (n) => n.type === 'MarkdownPreview')[0].props.source, 'Where do we host the relay?');
  assert.equal(findAll(tree, (n) => n.props?.role === 'radiogroup').length, 1);
  const opts = options(tree);
  assert.deepEqual(opts.map((o) => [o.props.role, o.props['aria-checked']]), [['radio', false], ['radio', false], ['radio', false]]);
  assert.deepEqual(opts.map((o) => text(o)), ['Fly.ioone region', 'A droplet' + 'askMe.recommended', 'Render']);
  assert.equal(btn(tree).props.disabled, true, 'nothing picked, nothing written: no answer');
  assert.equal(text(btn(tree)), 'askMe.pickFirst');
  const multi = draw({ entry: Q.normalizeHumanQA(qa({ multi: true })), picks: [0, 2] });
  assert.ok(text(multi).includes('askMe.pickAny'));
  assert.deepEqual(options(multi).map((o) => [o.props.role, o.props['aria-checked']]), [['checkbox', true], ['checkbox', false], ['checkbox', true]]);
  assert.equal(text(btn(multi)), 'askMe.answerWith{"choice":"Fly.io, Render"}', 'the button names the answer');
  assert.equal(btn(multi).props.disabled, false);
  const plain = draw({ entry: { q: 'Free text?' } });
  assert.ok(text(plain).includes('askMe.kind.question'));
  assert.equal(options(plain).length, 0);
  assert.equal(text(btn(plain)), 'askMe.respond');
  assert.equal(findAll(plain, (n) => n.type === 'textarea')[0].props.placeholder, 'askMe.answerPlaceholder');
  assert.equal(findAll(tree, (n) => n.type === 'textarea')[0].props.placeholder, 'askMe.notePlaceholder');
});

test('picking and writing: a click hands the new picks up; the label is cut at 40; Ctrl or Cmd+Enter sends an answer, never mid-composition or with none', () => {
  const said = [];
  const tree = draw({ onPicks: (p) => said.push(['picks', p]), onSend: () => said.push(['send']) });
  options(tree)[1].props.onClick();
  assert.deepEqual(said, [['picks', [1]]]);
  const long = Q.normalizeHumanQA(qa({ options: ['a'.repeat(30), 'b'.repeat(30)], multi: true }));
  assert.equal(text(btn(draw({ entry: long, picks: [0, 1] }))), `askMe.answerWith{"choice":"${`${'a'.repeat(30)}, ${'b'.repeat(30)}`.slice(0, 39)}…"}`);
  const key = (tree2, e) => findAll(tree2, (n) => n.type === 'textarea')[0].props.onKeyDown({ key: 'Enter', ...e });
  said.length = 0;
  const withNote = draw({ draft: 'one box', onSend: () => said.push('send') });
  key(withNote, { ctrlKey: true });
  key(withNote, { metaKey: true });
  key(withNote, {});
  key(withNote, { ctrlKey: true, nativeEvent: { isComposing: true } });
  assert.deepEqual(said, ['send', 'send'], 'with Ctrl or Cmd only, and not while composing');
  said.length = 0;
  key(draw({ onSend: () => said.push('send') }), { ctrlKey: true });
  key(draw({ draft: 'x', sending: true, onSend: () => said.push('send') }), { ctrlKey: true });
  assert.deepEqual(said, [], 'no answer, or one already going');
  const going = draw({ draft: 'x', sending: true });
  assert.equal(text(btn(going)), 'askMe.sending');
  assert.ok(options(going).every((o) => o.props.disabled), 'no picks change while it sends');
});

test('not sent: failed keeps the box; gone shows what was written to copy; closed is read only, no box and no button', () => {
  const failed = draw({ draft: 'one box', notSent: 'failed' });
  assert.ok(text(failed).includes('askMe.notSent') && text(failed).includes('askMe.failed'));
  assert.equal(findAll(failed, (n) => n.type === 'textarea')[0].props.value, 'one box');
  const gone = draw({ notSent: 'gone', kept: 'A droplet\n\nNote: one box' });
  assert.ok(text(gone).includes('askMe.gone') && text(gone).includes('askMe.goneKept') && text(gone).includes('A droplet\n\nNote: one box'));
  assert.equal(findAll(gone, (n) => n.type === 'textarea')[0].props.value, '', 'the box is empty for the new question');
  const closed = draw({ closed: true, notSent: 'gone', kept: 'what I wrote' });
  assert.equal(findAll(closed, (n) => n.type === 'textarea').length, 0);
  assert.equal(btn(closed), undefined);
  assert.ok(options(closed).every((o) => o.props.disabled));
  assert.ok(text(closed).includes('what I wrote'));
  const bare = draw({ entry: { q: '' }, closed: true, notSent: 'gone', kept: 'x' });
  assert.ok(!text(bare).includes('askMe.kind'), 'a closed card kept only for what was written has no question to tag');
});

test('text from the god or the person follows the language gate: no direction of its own in English, auto in Arabic', () => {
  const sites = (tree) => findAll(tree, (n) => 'dir' in n.props);
  const props = { draft: 'x', notSent: 'gone', kept: 'what I wrote' };
  RTL = false;
  const en = draw(props);
  assert.ok(sites(en).length >= 5, 'the headline, the body, each option, the kept text and the box');
  assert.deepEqual([...new Set(sites(en).map((n) => n.props.dir))], [undefined], 'an English window never sniffs content direction');
  RTL = true;
  const ar = draw(props);
  assert.deepEqual([...new Set(sites(ar).map((n) => n.props.dir))], ['auto']);
  RTL = false;
  const src = read(`${C}/AskMeQuestion.tsx`);
  assert.doesNotMatch(src, /dir="auto"/);
  assert.match(src, /const rtl = useRtl\(\);/);
});

test('colours: tags and picks in the theme\'s soft colours, no red', () => {
  const src = read(`${C}/AskMeQuestion.tsx`);
  const used = [...new Set(src.match(/var\(--cth-[a-z0-9-]+\)/g))];
  assert.deepEqual(used.filter((v) => /coral|red|status-blocked/.test(v)), []);
  assert.ok(used.includes('var(--cth-mint-light)') && used.includes('var(--cth-lemon-light)'));
});

// ── the board ────────────────────────────────────────────────────────────────

/** The store's Ask Me part, as store.ts writes it (pinned below). */
function storeOf() {
  const s = {
    agents: [{ id: 'stanley', name: 'Stanley' }], restorableAgents: [], answerDrafts: {}, askMeCards: {}, openTaskDetail() {},
    setAnswerDraft: (id, v) => { s.answerDrafts = { ...s.answerDrafts, [id]: v }; },
    setAskMeCard: (id, st) => { const n = { ...s.askMeCards }; if (st) n[id] = st; else delete n[id]; s.askMeCards = n; },
  };
  const useStore = (sel) => sel(s);
  useStore.getState = () => s;
  return { s, useStore };
}
/** The tab, mounted with main stood in: `board` is tasks.json, `answer` main's reply. */
function boardOf(board) {
  const { s, useStore } = storeOf();
  const main = { board, calls: [], polls: [], answer: async () => ({ result: 'ok' }) };
  global.window = { cth: {
    hiveTasks: async () => ({ tasks: main.board }),
    hiveAnswerQuestion: async (req) => { main.calls.push(req); return main.answer(req); },
  } };
  const order = loadTs('src/renderer/src/components/askMeOrder.ts');
  const M = loadTsx(`${C}/AskMeTab.tsx`, {
    './PixelBadge': { PixelBadge: 'PixelBadge' }, '@/store/store': { useStore }, './TasksKanban': TK, './askMeOrder': order,
    './AskMeQuestion': AQ, '@shared/humanQuestion': Q,
  }, { setInterval: (fn, ms) => { assert.equal(ms, 5000); main.polls.push(fn); return main.polls.length; }, clearInterval: () => {} });
  const tab = mount(M.AskMeTab, {});
  /** The 5 s poll: main's board read again, then the tab drawn with it. */
  const poll = async () => { await main.polls[0](); await settle(); tab.render(); await settle(); return tab.render(); };
  return { s, main, tab, poll };
}
const questions = (tree) => findAll(tree, (n) => n.type === AQ.AskMeQuestion).map((n) => n.props);
const draw2 = async (tab) => { tab.render(); await settle(); return tab.render(); };

test('an answer with picks and a note goes to main naming the question the card showed; ok clears the card', async () => {
  const { s, main, tab } = boardOf([task()]);
  let tree = await draw2(tab);
  let [q] = questions(tree);
  assert.deepEqual(q.entry.options.map((o) => o.label), ['Fly.io', 'A droplet', 'Render']);
  q.onPicks([1]);
  q.onDraft('one box please');
  [q] = questions(tab.render());
  assert.deepEqual(q.picks, [1]);
  assert.equal(q.draft, 'one box please');
  q.onSend();
  await settle();
  assert.deepEqual(main.calls, [{ taskId: 't1', ref: { q: task().humanQA[0].q, askedAt: ASKED, nth: 0, labels: ['Fly.io', 'A droplet', 'Render'] }, answer: { text: 'A droplet\n\nNote: one box please', chosen: [1] } }]);
  assert.equal(s.answerDrafts.t1, '');
  assert.equal(s.askMeCards.t1, undefined);
  // a free-text question: the note alone, no chosen
  const b = boardOf([task({ humanQA: [{ q: 'Anything?' }] })]);
  [q] = questions(await draw2(b.tab));
  q.onDraft('  yes  ');
  questions(b.tab.render())[0].onSend();
  await settle();
  assert.deepEqual(b.main.calls[0].answer, { text: 'yes' });
});

test('a failed send keeps the box and the picks with "not sent"; a second press while one is going sends nothing', async () => {
  const { s, main, tab } = boardOf([task()]);
  let [q] = questions(await draw2(tab));
  q.onPicks([0]);
  let release;
  main.answer = () => new Promise((r) => { release = r; });
  [q] = questions(tab.render());
  q.onSend();
  [q] = questions(tab.render());
  assert.equal(q.sending, true);
  q.onSend();
  await settle();
  assert.equal(main.calls.length, 1);
  release({ result: 'failed', error: 'disk' });
  await settle();
  [q] = questions(tab.render());
  assert.equal(q.notSent, 'failed');
  assert.deepEqual(q.picks, [0]);
  assert.equal(s.askMeCards.t1.notSent, 'failed');
  const b = boardOf([task()]);
  [q] = questions(await draw2(b.tab));
  q.onDraft('note');
  b.main.answer = async () => { throw new Error('bridge gone'); };
  questions(b.tab.render())[0].onSend();
  await settle();
  [q] = questions(b.tab.render());
  assert.equal(q.notSent, 'failed', 'a throw is a failure too');
  assert.equal(q.sending, false);
  assert.equal(q.draft, 'note');
});

test('picks belong to the question they were made for: a reworded question or a changed option list never shows them, not even for one render', async () => {
  for (const changed of [qa({ q: 'Reworded?', askedAt: '2026-10-19T10:00:00.000Z' }), qa({ options: ['Render', 'Fly.io', 'A droplet'] })]) {
    const { s, main, tab } = boardOf([task()]);
    questions(await draw2(tab))[0].onPicks([1]);
    main.board = [task({ humanQA: [changed] })];
    await main.polls[0]();
    await settle();
    const first = questions(tab.render())[0];
    assert.deepEqual(first.picks, [], `${changed.q}: the first render after the change`);
    await settle();
    const [q] = questions(tab.render());
    assert.deepEqual(q.picks, []);
    assert.equal(q.notSent, 'gone');
    assert.equal(q.kept, 'A droplet', 'what was picked, to copy');
    assert.equal(s.askMeCards.t1.ref, undefined);
  }
});

test('the question changed while written for: nothing sent; the box empties, what was written stays to copy, the old picks do not carry', async () => {
  const { s, main, tab } = boardOf([task()]);
  let [q] = questions(await draw2(tab));
  q.onPicks([2]);
  q.onDraft('note');
  // the god rewords it meanwhile; main says gone
  main.board = [task({ humanQA: [qa({ q: 'Where do we host it now?', askedAt: '2026-10-19T10:00:00.000Z' })] })];
  main.answer = async () => ({ result: 'gone' });
  questions(tab.render())[0].onSend();
  await settle();
  tab.render();
  await settle();
  [q] = questions(tab.render());
  assert.equal(q.entry.q, 'Where do we host it now?');
  assert.equal(q.notSent, 'gone');
  assert.equal(q.kept, 'Render\n\nNote: note');
  assert.equal(q.draft, '');
  assert.deepEqual(q.picks, [], 'picks made for the old question');
  assert.equal(s.answerDrafts.t1, '');
});

test('gone but the same question still open (a race main saw differently): "not sent" as a failure, the box kept', async () => {
  const { main, tab } = boardOf([task()]);
  let [q] = questions(await draw2(tab));
  q.onDraft('note');
  main.answer = async () => ({ result: 'gone' });
  questions(tab.render())[0].onSend();
  await settle();
  [q] = questions(tab.render());
  assert.equal(q.notSent, 'failed');
  assert.equal(q.draft, 'note');
});

test('closed elsewhere with something written: the card stays read only with its title and what was written, until dropped; nothing written to main', async () => {
  const { s, main, tab, poll } = boardOf([task(), task({ id: 't2', title: 'Other', humanQA: [{ q: 'Other?' }] })]);
  let [q] = questions(await draw2(tab));
  q.onDraft('half an answer');
  main.board = [task({ status: 'done' }), task({ id: 't2', title: 'Other', humanQA: [{ q: 'Other?' }] })];
  let tree = await poll();
  const shown = questions(tree);
  assert.equal(shown.length, 2, 'the closed card keeps its place beside the open one');
  const closed = shown.find((p) => p.closed);
  assert.equal(closed.kept, 'half an answer');
  assert.equal(closed.entry.q, task().humanQA[0].q);
  assert.ok(text(tree).includes('Pick a host'), 'with its title');
  // dropped with its header's ✕: gone, nothing sent
  const x = findAll(tree, (n) => n.type === 'button' && n.props['aria-label'] === 'askMe.dismissAria');
  x[shown.indexOf(closed)].props.onClick();
  tree = tab.render();
  assert.equal(questions(tree).length, 1);
  assert.equal(s.askMeCards.t1, undefined);
  assert.equal(main.calls.length, 0);
});

test('closed with nothing written: the card just leaves; asked again after a close: the new question with what was written below', async () => {
  const a = boardOf([task()]);
  questions(await draw2(a.tab))[0].onPicks([]);
  a.main.board = [];
  assert.equal(questions(await a.poll()).length, 0);
  assert.equal(a.s.askMeCards.t1, undefined);
  const b = boardOf([task()]);
  questions(await draw2(b.tab))[0].onDraft('kept text');
  b.main.board = [task({ status: 'done' })];
  assert.equal(questions(await b.poll())[0].closed, true);
  b.main.board = [task({ humanQA: [qa(), { q: 'Asked again', askedAt: '2026-10-19T11:00:00.000Z' }] })];
  const shown = questions(await b.poll());
  assert.equal(shown.length, 1);
  assert.equal(shown[0].entry.q, 'Asked again');
  assert.equal(shown[0].notSent, 'gone');
  assert.equal(shown[0].kept, 'kept text');
});

test('dismiss: main stamps the question the card showed, no answer; the card leaves', async () => {
  const { s, main, tab } = boardOf([task()]);
  const tree = await draw2(tab);
  questions(tree)[0].onPicks([1]);
  findAll(tab.render(), (n) => n.type === 'button' && n.props['aria-label'] === 'askMe.dismissAria')[0].props.onClick();
  await settle();
  assert.deepEqual(main.calls, [{ taskId: 't1', ref: Q.questionRef(task()), dismiss: true }]);
  assert.equal(s.askMeCards.t1, undefined);
});

test('the window never writes the board itself: answers and dismissals only through main\'s one-question call', () => {
  const src = read(`${C}/AskMeTab.tsx`);
  assert.doesNotMatch(src, /hivePatchTask|hiveWriteTasks|humanQA:\s*updated/);
  assert.equal(src.match(/window\.cth\.hiveAnswerQuestion\(/g).length, 2);
  const store = read('src/renderer/src/store/store.ts');
  assert.match(store, /setAskMeCard: \(taskId, state\) =>\s*set\(\(s\) => \{\s*const next = \{ \.\.\.s\.askMeCards \};\s*if \(state\) next\[taskId\] = state; else delete next\[taskId\];\s*return \{ askMeCards: next \};\s*\}\),/);
});

// ── one open question everywhere ─────────────────────────────────────────────

test('the kanban, the floor\'s count and main read the same open question; the board keeps options across its re-read', () => {
  const answered = task({ humanQA: [qa({ a: 'Render', answeredAt: ASKED })] });
  const picksOnly = task({ humanQA: [qa({ chosen: [1] })] });
  const dismissed = task({ humanQA: [qa({ dismissedAt: ASKED })] });
  const done = task({ status: 'done' });
  for (const [card, open] of [[task(), true], [answered, false], [picksOnly, true], [dismissed, false], [done, false]]) {
    assert.equal(!!TK.openQuestion(card), open, JSON.stringify(card.humanQA?.[0]));
    assert.equal(TK.waitsOnHuman(card), open);
    assert.equal(Q.openQuestionIndex(card) >= 0, open);
  }
  const [parsed] = TK.parseTasks({ tasks: [task({ humanQA: [qa({ multi: true, chosen: [0, 'x', 2] })] })] });
  assert.deepEqual({ options: parsed.humanQA[0].options, recommended: parsed.humanQA[0].recommended, multi: parsed.humanQA[0].multi, chosen: parsed.humanQA[0].chosen },
    { options: OPTS, recommended: 1, multi: true, chosen: [0, 2] });
  const [plain] = TK.parseTasks({ tasks: [task({ humanQA: [{ q: 'x', multi: 'yes', recommended: '1' }] })] });
  assert.deepEqual(Object.keys(plain.humanQA[0]).filter((k) => plain.humanQA[0][k] !== undefined), ['q'], 'nothing made up');
  assert.match(read(`${C}/TasksKanban.tsx`), /export function openQuestion\(t: HiveTask\): HumanQA \| undefined \{\s*return openQuestionShared\(t\);\s*\}/);
  const floor = read('src/renderer/src/scene/office/OfficeFloor.tsx');
  assert.match(floor, /String\(t\?\.status\) === 'blocked'\s*&& openQuestionIndex\(t\) >= 0/);
});

test('words: every Ask Me key in English, Arabic and Chinese, with the same placeholders', () => {
  const keys = ['notSent', 'gone', 'goneKept', 'failed', 'pickAny', 'asked', 'recommended', 'notePlaceholder', 'answerWith', 'pickFirst', 'kind.choose', 'kind.question', 'sending', 'respond', 'answerPlaceholder'];
  const src = read(`${C}/AskMeQuestion.tsx`);
  for (const k of keys) assert.ok(src.includes(`'askMe.${k}'`) || src.includes(`askMe.${k.split('.')[0]}`), `${k} is used`);
  const get = (o, k) => k.split('.').reduce((x, p) => x?.[p], o);
  const L = Object.fromEntries(['en', 'ar', 'zh-CN'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).askMe]));
  for (const k of keys) {
    const ph = Object.values(L).map((d) => { const v = get(d, k); assert.equal(typeof v, 'string', k); return (v.match(/\{\{\w+\}\}/g) ?? []).sort().join(); });
    assert.equal(new Set(ph).size, 1, `${k}: the same placeholders`);
  }
  assert.equal(L.en.asked, 'asked {{when}}');
  assert.equal(L.en.answerWith, 'answer: {{choice}}');
});
