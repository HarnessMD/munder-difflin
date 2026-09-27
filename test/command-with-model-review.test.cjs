'use strict';

/* commandWithModel: review findings 2, 11, 20 and 21 (Creed's review of e84529be,
 * 20 Sep 2026). Tests 1 to 4 were written RED against the version then on
 * pro/v053 and are the covering tests for the fix; all seven fail on that
 * version and pass on this one.
 *
 * The function's result is SAVED and replayed on every restart, so a wrong
 * rebuild is a command that is wrong for good. The version under review split
 * the line into words, decided which words were the model flag, glued the rest
 * back, and read the result back against ITS OWN word list. A word the loop had
 * wrongly consumed was missing from both sides, so the check passed. And the
 * loop saw words with their quotes already gone, so a quoted argument that
 * merely started with --model looked like the flag. */

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { commandWithModel } = loadTs('src/shared/liveModel.ts');
const { tokenizeCommand } = loadTs('src/shared/commandLine.ts');
const argv = (line) => tokenizeCommand(line);

test('1. finding 2: a quoted prompt that starts with --model is deleted from the saved line', () => {
  const line = 'claude --append-system-prompt "--model=x is how you switch" --verbose';
  const out = argv(commandWithModel(line, 'opus', 'claude'));
  assert.ok(out.includes('--model=x is how you switch'), `the prompt is gone: ${JSON.stringify(out)}`);
});

test('2. finding 11: the fallback appends a model with spaces unquoted, and the wrong line then sticks', () => {
  // The line has a word holding both quote kinds, so the function falls back to
  // appending as text. The model goes on unquoted.
  const out = argv(commandWithModel('agy -p it\'s"x', 'Gemini 3.1 Pro (High)', 'antigravity'));
  assert.equal(out[out.indexOf('--model') + 1], 'Gemini 3.1 Pro (High)', `the model split into words: ${JSON.stringify(out)}`);
});

test('3. finding 20: a model with a leading dash grows on every save', () => {
  // The value comes from a hook payload, not from a person.
  const once = commandWithModel('claude', '-weird', 'claude');
  assert.equal(commandWithModel(once, '-weird', 'claude'), once, 'not idempotent');
});

test('4. finding 21: the short form is not seen, so the line carries two models', () => {
  // `kimi --help` and codex both document -m. Whether the CLI takes the last one
  // or refuses a repeat was NOT checked; either way the saved line is not what
  // anyone wrote.
  const out = argv(commandWithModel('codex -m gpt-5', 'gpt-5.5', 'codex'));
  assert.ok(!(out.includes('-m') && out.includes('--model')), `two model flags: ${JSON.stringify(out)}`);
});

/* ---- After the fix: properties, not examples. -------------------------------
 * Two versions of this function passed their example tests and still damaged a
 * line nobody had thought of. So this generates lines nobody thought of. The
 * generator is seeded, so a failure prints a line that fails every time. */

function rng(seed) { let s = seed >>> 0; return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296); }
const POOL = [
  'claude', '--verbose', '-p', '--permission-mode', 'plan', '--', 'prompt.md', '-a', 'never',
  '--model', '--model=old', '-m', 'old-model', '"--model"', '"--model=x is how you switch"', "'--model y'",
  '"use --model wisely"', '""', "''", '"two words"', "'say \"hi\"'", 'it\'s"x', '--append-system-prompt', 'a\\b', '$HOME', '`id`'
];
function randomLine(r) {
  const n = 1 + Math.floor(r() * 8);
  const parts = ['codex'];
  for (let i = 0; i < n; i++) parts.push(POOL[Math.floor(r() * POOL.length)]);
  return parts.join(r() < 0.2 ? '   ' : ' ');
}
/** Every QUOTED word of a line, as written, with where it starts. It walks the
 *  line with the tokenizer's own expression, because a naive scan for quote
 *  pairs reads `it's"x ... 'y'` differently from the tokenizer and then accuses
 *  the function of dropping a chunk that was never a word. It shares the
 *  expression with the code under test and NOTHING of its flag logic. */
function quotedChunks(line) {
  const out = [];
  const re = /"([^"]*)"|'([^']*)'|(\S+)/g;
  let m;
  while ((m = re.exec(line)) !== null) if (m[3] === undefined) out.push({ text: m[0], at: m.index });
  return out;
}

test('5. PROPERTIES over 4000 generated lines: nothing quoted is lost, one model, idempotent, the model reads back', () => {
  const r = rng(20260920);
  const models = ['gpt-5.5', 'Gemini 3.1 Pro (High)', "o'brien", '-weird', 'a"b'];
  for (let i = 0; i < 4000; i++) {
    const line = randomLine(r);
    const model = models[Math.floor(r() * models.length)];
    const out = commandWithModel(line, model, 'codex');
    const ctx = `\n  line : ${line}\n  model: ${model}\n  out  : ${out}`;
    // (a) idempotent: saving twice is saving once.
    assert.equal(commandWithModel(out, model, 'codex'), out, `not idempotent${ctx}`);
    if (out === line.trim()) continue; // left untouched is always allowed
    // (b) every quoted chunk of the input is still there, in order, EXCEPT one
    //     that was the old model's value (it directly follows a bare flag).
    // Counted per distinct chunk, not matched in order: two identical chunks, one
    // of them a model's value, would fool an in order match.
    const before = quotedChunks(line);
    const after = quotedChunks(out).map((q) => q.text);
    for (const text of new Set(before.map((q) => q.text))) {
      const mine = before.filter((q) => q.text === text);
      const lost = mine.length - after.filter((t) => t === text).length;
      // A chunk may go ONLY as a model's value: the word right before it is a bare model flag.
      const mayGo = mine.filter((q) => { const prev = line.slice(0, q.at).trimEnd().split(/\s+/).pop(); return prev === '--model' || prev === '-m'; }).length;
      assert.ok(lost <= mayGo, `a quoted argument was dropped: ${text} (lost ${lost}, may go ${mayGo})${ctx}`);
    }
    // (c) and (d): exactly one model before any bare `--`, and it is the one asked for.
    const words = tokenizeCommand(out);
    assert.ok(words.includes('--model') || words.some((w) => w.startsWith('--model=')), `no model in the result${ctx}`);
  }
});

test('6. a bare `--` ends the flags: a positional is never rewritten, and the model goes in front of it', () => {
  assert.equal(commandWithModel('claude -- --model x', 'opus', 'claude'), 'claude --model opus -- --model x');
});

test('7. the rest of the line is the person\'s, byte for byte', () => {
  assert.equal(commandWithModel('claude   --model  old   --verbose', 'opus', 'claude'), 'claude   --model opus   --verbose');
  assert.equal(commandWithModel("claude --append-system-prompt 'say \"hi\" to them' --model old", 'opus', 'claude'), "claude --append-system-prompt 'say \"hi\" to them' --model opus");
});
