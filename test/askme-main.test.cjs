'use strict';

// Ask Me, main side: options (up to 8, a recommended one, one pick or several, a note), and an
// answer or a dismissal changes ONE humanQA entry, the one the card showed, on the latest
// tasks.json. A question that changed or closed, or a done card, is 'gone' and nothing is written;
// Dismiss all is one write; an answer is sent once it is saved and a failed notice is only logged.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const Q = loadTs('src/shared/humanQuestion.ts');
const A = loadTs('src/main/askMeAnswers.ts');

const NOW = '2026-10-19T12:00:00.000Z';
const card = (over = {}) => ({ id: 't1', title: 'Pick a host', status: 'blocked', priority: 2, humanQA: [], ...over });
const refOf = (task) => Q.questionRef(task);

// ─── the shared rules ───────────────────────────────────────────────────────

test('options: labels or {label, detail}; an invalid one is skipped without shifting the rest; at most 8', () => {
  const ix = Q.normalizeOptionsIndexed(['A', { label: '' }, { label: ' B ', detail: ' why ' }, 7, { label: 'C', detail: 3 }]);
  assert.deepEqual(ix.options, [{ label: 'A' }, { label: 'B', detail: 'why' }, { label: 'C' }]);
  assert.deepEqual(ix.rawIndex, [0, 2, 4]);
  assert.equal(Q.normalizeOptions([]), undefined);
  assert.equal(Q.normalizeOptions('A'), undefined);
  assert.equal(Q.normalizeOptions(Array.from({ length: 12 }, (_, i) => `o${i}`)).length, Q.MAX_OPTIONS);
  assert.equal(Q.MAX_OPTIONS, 8);
  assert.equal(Q.normalizeOptions(['x'.repeat(500)])[0].label.length, 200);

  const e = Q.normalizeHumanQA({ q: 'Which?', options: ['A', '', 'B', 'C'], recommended: 2, chosen: [3, 1, 3, 9], multi: true, junk: 1 });
  assert.deepEqual(e, { q: 'Which?', options: [{ label: 'A' }, { label: 'B' }, { label: 'C' }], recommended: 1, multi: true, chosen: [2] }, 'stored positions are raw; shown ones index the valid list');
  assert.deepEqual(Q.normalizeHumanQA({ q: 'Free text?', multi: true }), { q: 'Free text?' }, 'multi means nothing without options');
  assert.equal(Q.normalizeHumanQA({ a: 'x' }), null);
});

test('closed by text only: an answer with text or a dismissal; picks alone, "" or true leave it asked', () => {
  for (const e of [{ q: 'x', a: 'yes' }, { q: 'x', dismissedAt: NOW }]) assert.equal(Q.entryClosed(e), true, JSON.stringify(e));
  for (const e of [{ q: 'x' }, { q: 'x', a: '' }, { q: 'x', a: '   ' }, { q: 'x', a: true }, { q: 'x', chosen: [0] }, { q: 'x', dismissedAt: '' }]) {
    assert.equal(Q.entryClosed(e), false, JSON.stringify(e));
  }
  assert.equal(Q.entryClosed({ a: 'no q' }), true, 'not an entry, so nothing asked');

  const t = card({ humanQA: [{ q: 'first' }, { q: 'second', a: 'done' }, 'junk', { q: 'third' }, { q: 'fourth', dismissedAt: NOW }] });
  assert.equal(Q.openQuestionIndex(t), 3, 'the last entry still open');
  assert.equal(Q.openQuestion(t).q, 'third');
  assert.equal(Q.openQuestionIndex({ ...t, status: 'done' }), -1, 'a done card asks nothing');
  assert.equal(Q.openQuestionIndex({ humanQA: 'x' }), -1);
  assert.equal(Q.openQuestionIndex(null), -1);
  assert.deepEqual(refOf(t), { q: 'third', nth: 2, labels: [] }, 'nth counts only entries with a string q');
  assert.deepEqual(refOf(card({ humanQA: [{ q: 'x', askedAt: NOW, options: ['A', '', 'B'] }] })), { q: 'x', askedAt: NOW, nth: 0, labels: ['A', 'B'] });
  assert.equal(refOf(card()), null);
});

test('the ref names one question: by askedAt, else by position; for an answer the labels must match too', () => {
  const t = card({ humanQA: [{ q: 'old', a: 'ok' }, { q: 'Which?', askedAt: NOW, options: ['A', 'B'] }] });
  const ref = refOf(t);
  assert.equal(Q.openQuestionByRef(t, ref, true), 1);
  assert.equal(Q.openQuestionByRef(t, { ...ref, askedAt: '2026-10-19T12:00:01.000Z' }, true), -1, 'asked again: another question');
  assert.equal(Q.openQuestionByRef(t, { ...ref, q: 'Which one?' }, true), -1, 'reworded');
  assert.equal(Q.openQuestionByRef(t, { ...ref, labels: ['A', 'C'] }, true), -1, 'options changed: refused for an answer');
  assert.equal(Q.openQuestionByRef(t, { ...ref, labels: ['A', 'C'] }, false), 1, 'a dismissal does not need the same options');
  assert.equal(Q.openQuestionByRef(t, { q: 'Which?', nth: 1, labels: ['A', 'B'] }, true), -1, 'it has an askedAt now, so a position does not name it');

  const free = card({ humanQA: [{ q: 'same' , a: 'one' }, { q: 'same' }] });
  assert.equal(Q.openQuestionByRef(free, { q: 'same', nth: 1, labels: [] }, true), 1);
  assert.equal(Q.openQuestionByRef(free, { q: 'same', nth: 0, labels: [] }, true), -1, 'same words, another position');
  assert.equal(Q.openQuestionByRef({ ...free, status: 'done' }, { q: 'same', nth: 1, labels: [] }, false), -1);
  const closed = card({ humanQA: [{ q: 'same', a: 'one' }, { q: 'same', a: 'two' }] });
  assert.equal(Q.openQuestionByRef(closed, { q: 'same', nth: 1, labels: [] }, false), -1);
});

test('the answer text: picked labels, then the note; a bare note as before; nothing is no answer', () => {
  const opts = [{ label: 'Fly' }, { label: 'Render' }, { label: 'Droplet' }];
  assert.equal(Q.composeAnswer(opts, [2, 0], ''), 'Fly; Droplet');
  assert.equal(Q.composeAnswer(opts, [1], '  cheapest  '), 'Render\n\nNote: cheapest');
  assert.equal(Q.composeAnswer(undefined, [], ' just text '), 'just text');
  assert.equal(Q.composeAnswer(opts, [], '  '), null);
  assert.equal(Q.composeAnswer(opts, [9], ''), null);

  const mail = Q.answerMail({ id: 't1', title: 'Pick a host' }, { q: 'Where?', options: ['', 'Fly', 'Render'] }, { text: 'Render', chosen: [1] });
  assert.equal(mail.subject, 'HUMAN ANSWER on task "Pick a host"');
  assert.match(mail.body, /^The human answered the open question on task t1 \("Pick a host"\):\nQ: Where\?\nCHOSE: #2 "Render"\nA: Render\n/, 'the god reads the position as it wrote it');
  assert.doesNotMatch(Q.answerMail({ id: 't', title: 't' }, { q: 'x' }, { text: 'y' }).body, /CHOSE/);
});

// ─── a request ──────────────────────────────────────────────────────────────

test('a request must be well formed, else it is invalid', () => {
  const ref = { q: 'x', nth: 0 };
  assert.deepEqual(A.parseAnswerRequest({ taskId: 't1', ref, answer: { text: 'hi', chosen: [1] } }), { taskId: 't1', ref, answer: { text: 'hi', chosen: [1] } });
  assert.deepEqual(A.parseAnswerRequest({ taskId: 't1', ref: { ...ref, askedAt: NOW, labels: ['A'] }, dismiss: true }), { taskId: 't1', ref: { ...ref, askedAt: NOW, labels: ['A'] }, dismiss: true });
  for (const bad of [
    null, 'x', {}, { taskId: '', ref, answer: { text: 'a' } }, { taskId: 'x'.repeat(201), ref, answer: { text: 'a' } },
    { taskId: 't1', answer: { text: 'a' } }, { taskId: 't1', ref: { q: 'x' }, answer: { text: 'a' } }, { taskId: 't1', ref: { q: 'x', nth: -1 }, answer: { text: 'a' } },
    { taskId: 't1', ref: { q: 'x', nth: 1.5 }, answer: { text: 'a' } }, { taskId: 't1', ref: { ...ref, askedAt: 5 }, answer: { text: 'a' } },
    { taskId: 't1', ref: { ...ref, labels: [1] }, answer: { text: 'a' } }, { taskId: 't1', ref, dismiss: true, answer: { text: 'a' } },
    { taskId: 't1', ref, answer: { chosen: [0] } }, { taskId: 't1', ref, answer: { text: 'a', chosen: [-1] } }, { taskId: 't1', ref, answer: { text: 'a', chosen: '0' } },
    { taskId: 't1', ref, answer: 'a' }, { taskId: 't1', ref }
  ]) assert.equal(A.parseAnswerRequest(bad), null, JSON.stringify(bad));
});

// ─── applying it ────────────────────────────────────────────────────────────

test('an answer changes only the entry the card showed; everything else is kept as written', () => {
  const other = card({ id: 't2', title: 'Other', humanQA: [{ q: 'Free?' }], extra: { keep: true } });
  const t = card({ humanQA: [{ q: 'old', a: 'ok', note: 'kept' }, { q: 'Where?', askedAt: NOW, options: ['', 'Fly', 'Render'], recommended: 2, chosen: [1], by: 'god' }] });
  const before = JSON.stringify([t, other]);
  const r = A.applyAnswers([t, other, 'junk'], [{ taskId: 't1', ref: refOf(t), answer: { text: ' cheap ', chosen: [1] } }], NOW);
  assert.equal(JSON.stringify([t, other]), before, 'the input is never changed');
  assert.equal(r.changed, true);
  assert.deepEqual(r.outcomes.map((o) => o.result), ['ok']);
  assert.strictEqual(r.tasks[1], other, 'another card is the same object');
  assert.equal(r.tasks[2], 'junk');
  const qa = r.tasks[0].humanQA;
  assert.strictEqual(qa[0], t.humanQA[0], 'an earlier entry is untouched');
  assert.deepEqual(qa[1], { q: 'Where?', askedAt: NOW, options: ['', 'Fly', 'Render'], recommended: 2, by: 'god', a: 'Render\n\nNote: cheap', answeredAt: NOW, chosen: [2] }, 'raw position stored; unknown fields kept');
  assert.equal(r.tasks[0].extra, undefined);
  assert.equal(r.outcomes[0].notice.subject, 'HUMAN ANSWER on task "Pick a host"');
  assert.match(r.outcomes[0].notice.body, /CHOSE: #2 "Render"/);

  const noPick = A.applyAnswers([t], [{ taskId: 't1', ref: refOf(t), answer: { text: 'neither' } }], NOW).tasks[0].humanQA[1];
  assert.equal(noPick.a, 'neither');
  assert.equal('chosen' in noPick, false, 'an old pick never survives a text answer');
});

test('one pick unless multi; picks out of range, or no text and no pick, are invalid and write nothing', () => {
  const one = card({ humanQA: [{ q: 'Which?', options: ['A', 'B', 'C'] }] });
  const many = card({ humanQA: [{ q: 'Which?', options: ['A', 'B', 'C'], multi: true }] });
  const go = (t, answer) => A.applyAnswers([t], [{ taskId: 't1', ref: refOf(t), answer }], NOW);
  for (const answer of [{ text: '', chosen: [0, 1] }, { text: '', chosen: [3] }, { text: 'with a note', chosen: [3] }, { text: '  ' }, { text: '', chosen: [] }]) {
    const r = go(one, answer);
    assert.deepEqual([r.outcomes[0].result, r.changed], ['invalid', false], JSON.stringify(answer));
  }
  const m = go(many, { text: '', chosen: [2, 0, 2] });
  assert.equal(m.outcomes[0].result, 'ok');
  assert.deepEqual(m.tasks[0].humanQA[0].chosen, [0, 2], 'sorted, once each');
  assert.equal(m.tasks[0].humanQA[0].a, 'A; C');
  assert.deepEqual(A.applyAnswers([one], [null], NOW).outcomes, [{ result: 'invalid' }]);
});

test('gone: the card went or is done, the question was answered, changed or reworded; nothing written', () => {
  const t = card({ humanQA: [{ q: 'Which?', askedAt: NOW, options: ['A', 'B'] }] });
  const ref = refOf(t);
  const answer = { text: '', chosen: [0] };
  const cases = [
    [[], 'the card is gone'],
    [[{ ...t, status: 'done' }], 'a done card'],
    [[card({ humanQA: [{ ...t.humanQA[0], a: 'B' }] })], 'answered elsewhere'],
    [[card({ humanQA: [{ ...t.humanQA[0], options: ['A', 'B', 'C'] }] })], 'options changed'],
    [[card({ humanQA: [t.humanQA[0], { q: 'Newer?' }] })], 'a newer question is the open one'],
  ];
  for (const [tasks, why] of cases) {
    const r = A.applyAnswers(tasks, [{ taskId: 't1', ref, answer }], NOW);
    assert.deepEqual([r.outcomes[0].result, r.changed], ['gone', false], why);
    assert.equal(r.outcomes[0].notice, undefined);
  }
});

test('Dismiss all: each card\'s shown question stamped, in order, one result each; a dismissal sends no notice', () => {
  const a = card({ id: 'a', humanQA: [{ q: 'one?' }] });
  const b = card({ id: 'b', humanQA: [{ q: 'two?', options: ['X'] }] });
  const c = card({ id: 'c', humanQA: [{ q: 'three?' }] });
  const reqs = [a, b, c].map((t) => ({ taskId: t.id, ref: refOf(t), dismiss: true }));
  reqs.splice(1, 0, { taskId: 'a', ref: refOf(a), dismiss: true });
  const r = A.applyAnswers([a, b, { ...c, status: 'done' }], reqs, NOW);
  assert.deepEqual(r.outcomes.map((o) => o.result), ['ok', 'gone', 'ok', 'gone'], 'the second dismissal of the same question finds it closed');
  assert.ok(r.outcomes.every((o) => !o.notice));
  assert.deepEqual(r.tasks[0].humanQA[0], { q: 'one?', dismissedAt: NOW });
  assert.deepEqual(r.tasks[1].humanQA[0], { q: 'two?', options: ['X'], dismissedAt: NOW });
});

test('on the real board: main reads the latest file, keeps what the god added since, and writes once', async (t) => {
  const { HiveManager } = loadTs('src/main/hive.ts');
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'askme-'));
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const hive = new HiveManager(() => home);
  await hive.ensureAgent({ id: 'a1', name: 'A', provider: 'claude', cwd: home });
  const file = path.join(hive.root(), 'tasks.json');
  const base = { status: 'blocked', dependsOn: [], priority: 2, createdAt: NOW };
  const shown = { id: 't1', title: 'Host', ...base, humanQA: [{ q: 'Where?', askedAt: NOW, options: ['Fly', 'Render'] }] };
  fs.writeFileSync(file, JSON.stringify({ tasks: [shown, { id: 't2', title: 'Other', ...base, humanQA: [{ q: 'Later?' }] }] }));
  const ref = refOf(shown);
  // The god writes after the window last read the board: a new question on t2, a field on t1.
  const disk = JSON.parse(fs.readFileSync(file, 'utf8'));
  disk.tasks[1].humanQA.push({ q: 'Added since?', askedAt: NOW });
  disk.tasks[0].owner = 'a1';
  fs.writeFileSync(file, JSON.stringify(disk));
  let writes = 0;
  const write = hive.writeTasks.bind(hive);
  hive.writeTasks = (...args) => { writes += 1; return write(...args); };
  const out = hive.answerQuestions([
    { taskId: 't1', ref, answer: { text: '', chosen: [1] } },
    { taskId: 't2', ref: { q: 'Later?', nth: 0 }, dismiss: true }
  ]);
  assert.deepEqual(out.map((o) => o.result), ['ok', 'gone'], 't2\'s open question is the newer one now');
  assert.equal(writes, 1, 'one write');
  const after = JSON.parse(fs.readFileSync(file, 'utf8')).tasks;
  const t1 = after.find((x) => x.id === 't1'), t2 = after.find((x) => x.id === 't2');
  assert.equal(t1.owner, 'a1', 'the god\'s change kept');
  assert.equal(t1.humanQA[0].a, 'Render');
  assert.deepEqual(t1.humanQA[0].chosen, [1]);
  assert.deepEqual(t2.humanQA.map((e) => e.q), ['Later?', 'Added since?']);
  assert.ok(t2.humanQA.every((e) => !e.dismissedAt));

  writes = 0;
  assert.deepEqual(hive.answerQuestions([{ taskId: 't1', ref, answer: { text: 'again' } }]).map((o) => o.result), ['gone']);
  assert.equal(writes, 0, 'nothing changed, nothing written');
  fs.writeFileSync(file, '{"tasks": [');
  assert.throws(() => hive.answerQuestions([{ taskId: 't2', ref: refOf(t2), dismiss: true }]), /tasks\.json is damaged/);
  assert.equal(fs.readFileSync(file, 'utf8'), '{"tasks": [', 'a damaged board is never written over');
});

// ─── wiring ─────────────────────────────────────────────────────────────────

test('wiring: an answer counts as sent once saved; a notice failure is logged; a write failure is "failed" with why', () => {
  const idx = read('src/main/index.ts');
  const fn = /function answerQuestions\(raw: unknown\[\]\): AnswerOutcome\[\] \{([\s\S]*?)\n\}\n/.exec(idx)[1];
  assert.match(fn, /if \(!hive\.enabled\(\)\) return raw\.map\(\(\): AnswerOutcome => \(\{ result: 'failed', error: /);
  assert.match(fn, /const reqs = raw\.map\(parseAnswerRequest\);/);
  assert.match(fn, /return reqs\.map\(\(r\): AnswerOutcome => \(r \? \{ result: 'failed', error \} : \{ result: 'invalid' \}\)\);/);
  assert.match(fn, /hive\.send\(\{ to: 'god', act: 'inform', subject: notice\.subject, body: notice\.body \}, 'human'\);/);
  assert.match(fn, /\} catch \(e\) \{\s*hive\.appendLog\(\{ kind: 'answer-notice-failed', task: reqs\[i\]\?\.taskId,/);
  assert.match(fn, /return \{ result \};\s*\}\);$/, 'the result is the save\'s, whatever the notice did');
  assert.match(idx, /ipcMain\.handle\('hive:answerQuestion', \(_evt, req: unknown\) => answerQuestions\(\[req\]\)\[0\]\);/);
  assert.match(idx, /ipcMain\.handle\('hive:answerQuestions', \(_evt, reqs: unknown\) =>\s*Array\.isArray\(reqs\) && reqs\.length <= 500 \? answerQuestions\(reqs\) : \[\]\);/);

  const pre = read('src/preload/index.ts');
  assert.match(pre, /hiveAnswerQuestion: \(req: AnswerRequest\): Promise<AnswerOutcome> =>\s*ipcRenderer\.invoke\('hive:answerQuestion', req\)/);
  assert.match(pre, /hiveAnswerQuestions: \(reqs: AnswerRequest\[\]\): Promise<AnswerOutcome\[\]> =>\s*ipcRenderer\.invoke\('hive:answerQuestions', reqs\)/);

  const hive = read('src/main/hive.ts');
  assert.match(hive, /const applied = applyAnswers\(tasks, reqs, new Date\(\)\.toISOString\(\)\);\s*if \(applied\.changed\) this\.writeTasks\(applied\.tasks as HiveTask\[\]\);/);
});

test('the god is told how to ask with options, and to append rather than change a question', () => {
  const hive = read('src/main/hive.ts');
  assert.ok(hive.includes('For a CHOICE add "options":[{"label":"...","detail":"..."}] (at most 8), "recommended":<position of the one you suggest, 0 for the first> and "multi":true only when several may be picked'), 'god prompt');
  assert.ok(hive.includes('Never edit an entry\'s q or options once asked: append a new entry, because an answer to a question that changed is refused.'), 'god prompt');
  assert.ok(hive.includes('For a choice, put the options on the entry and the card shows them as buttons with a note field:'), 'PROTOCOL');
  assert.ok(hive.includes('Never change an entry\'s \\`q\\` or options once asked: append a new entry instead, because an\nanswer to a question that changed is refused. A card marked done asks nothing.'), 'PROTOCOL');
});
