'use strict';

/**
 * THE CROSS USER MESSAGE, 0.4.10.
 *
 * Founder, verbatim: "the inter user messaging does not have any guardrails or
 * standard format of communication. it should be strict, the messages displayed
 * should be markdowns, communication should always be short to the point.
 * communication should be one off not a lot of too and fros, agents should use
 * messaging very sparingly, prefer one off messages. If needed agents should ask
 * the human to change the response mode."
 *
 * The rules themselves live in `src/shared/teamMessage.ts` and are tested by
 * `test/team-contracts.test.cjs`. This file pins the SCREEN: that the thread
 * renders Markdown at both ends, that it clamps a long message exactly the way
 * the agent thread does, that the composer refuses a draft the contract refuses
 * and always says why, that the turn budget is visible before it bites, that
 * the brief the agents were given can be read, and that a file crosses as a
 * link and never as a local path.
 *
 * Where a value can be checked as behaviour rather than as text it is: the two
 * pure helpers in DraftComposer are transpiled out of the .tsx and run. They
 * live in the component because this task owns no module under `src/shared`;
 * if they ever move there, this extraction should be replaced by loadTs.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const ts = require('typescript');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const TEAM = 'src/renderer/src/components/team';
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
/** Comments are prose, not guarantees: every assertion below reads code. */
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const thread = strip(read(`${TEAM}/CrossNodeThread.tsx`));
const composerRaw = read(`${TEAM}/DraftComposer.tsx`);
const composer = strip(composerRaw);
const agentInbox = strip(read(`${PRO}/AgentInbox.tsx`));
const shareButton = read(`${TEAM}/ShareFileButton.tsx`);

const M = loadTs('src/shared/teamMessage.ts');

/* ---- the two pure helpers, run for real ---------------------------------- */

/** Transpile a slice of the .tsx that contains no JSX and no imports, so the
 *  link builders can be exercised rather than pattern matched. */
function pureSlice(src, from, to) {
  const a = src.indexOf(from);
  const b = src.indexOf(to);
  assert.ok(a > 0, `anchor not found: ${from}`);
  assert.ok(b > a, `anchor not found after ${from}: ${to}`);
  const out = ts.transpileModule(src.slice(a, b), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }
  });
  const mod = { exports: {} };
  new Function('module', 'exports', out.outputText)(mod, mod.exports);
  return mod.exports;
}

const links = pureSlice(composerRaw, 'export function shareLinkMarkdown', 'export function DraftComposer');

test('a shared file crosses as a Markdown link named after the file, never as a path', () => {
  assert.equal(
    links.shareLinkMarkdown({ name: 'relay.log', url: 'https://tunnel.example/s/' + 'a'.repeat(64) }),
    `[relay.log](https://tunnel.example/s/${'a'.repeat(64)})`
  );
  // A bracket in the name would break out of the link and render as literal
  // punctuation with the URL beside it.
  assert.equal(links.shareLinkMarkdown({ name: 'a[1].txt', url: 'u' }), '[a 1 .txt](u)');
  assert.equal(links.shareLinkMarkdown({ name: '', url: 'u' }), '[file](u)');
  assert.equal(links.shareLinkMarkdown({ name: undefined, url: 'u' }), '[file](u)');
});

test('links are appended to what is already written, on their own line, and never replace it', () => {
  const one = { name: 'a.png', url: 'https://t/s/1' };
  const two = { name: 'b.png', url: 'https://t/s/2' };
  assert.equal(links.withShareLinks('', [one]), '[a.png](https://t/s/1)');
  assert.equal(links.withShareLinks('Take a look.\n\n', [one]), 'Take a look.\n[a.png](https://t/s/1)');
  assert.equal(
    links.withShareLinks('Two of them.', [one, two]),
    'Two of them.\n[a.png](https://t/s/1)\n[b.png](https://t/s/2)'
  );
  // The whole point: what lands in the body is a URL. A local path is exactly
  // what the other machine cannot open.
  const body = links.withShareLinks('here', [{ name: 'notes.md', url: 'https://t/s/9' }]);
  assert.ok(!body.includes('/Users/'), 'a local path reached the message body');
  assert.ok(body.includes('https://'), 'the link is a URL');
});

/* ---- 1. the defect: Markdown at both ends -------------------------------- */

test('the thread renders a message body as Markdown, through the agent thread\'s own component', () => {
  // Imported, not copied. Two threads that expand a long message differently
  // is the drift this import exists to make impossible.
  assert.match(thread, /import \{ ClampedMarkdown \} from '\.\.\/pro\/AgentInbox';/);
  assert.match(thread, /<ClampedMarkdown source=\{message\.body\} expanded=\{expanded\} onToggle=\{onToggle\} \/>/);
  // The plain text render this replaces is gone.
  assert.ok(!/\{message\.body\}\s*<\/p>/.test(thread), 'the raw plain text body render is still here');
  // And the component it imports still renders Markdown in the card variant,
  // so this import cannot quietly become a plain text render upstream.
  assert.match(agentInbox, /export function ClampedMarkdown\(/);
  assert.match(agentInbox, /<MarkdownPreview source=\{expanded \? source : clamp\.text\} variant="card" \/>/);
});

test('the clamp is the shared one: no second implementation, and expansion is keyed by message id', () => {
  for (const [name, src] of [['CrossNodeThread', thread], ['DraftComposer', composer]]) {
    assert.ok(!/clampLines\(/.test(src), `${name} clamps by hand instead of using the shared control`);
    assert.ok(!/lineClamp/.test(src), `${name} builds a third clamp shape`);
  }
  // The same state shape AgentInbox uses, so a poll appending rows cannot
  // collapse a message somebody expanded, and the control reverses.
  assert.match(thread, /const \[expanded, setExpanded\] = useState<Set<string>>\(\(\) => new Set\(\)\);/);
  assert.match(thread, /const toggleExpanded = \(id: string\) => setExpanded\(\(prev\) => \{/);
  assert.match(thread, /if \(next\.has\(id\)\) next\.delete\(id\); else next\.add\(id\);/);
  assert.match(thread, /expanded=\{expanded\.has\(m\.id\)\} onToggle=\{\(\) => toggleExpanded\(m\.id\)\}/);
});

test('a subject is drawn as a subject, not folded onto the first line of the body', () => {
  assert.match(thread, /subject: e\.subject \|\| undefined/);
  assert.match(thread, /\{message\.subject\}<\/div>/);
  // The old fold, which made one string carry two.
  assert.ok(!/\$\{e\.subject\}\\n\$\{e\.body\}/.test(thread), 'the subject is still folded into the body');
  assert.ok(!/firstLine/.test(thread), 'the first line heuristic is still here');
});

/* ---- 2. the composer: a shape, and a reason that is always visible -------- */

/* REWRITTEN 5 Sep 2026 (the simplification). The kind picker was a segmented
   control that opened on `ask`; it is now plain chips that open on `inform`,
   because the common message states something and wants nothing back. The
   pins move with the guarantee: the kinds still come from the contract and
   nowhere else, the reply toggle still starts off, and turning it on while
   the kind is the default `inform` makes the draft the `ask` it really is,
   so the honest kind never depends on knowing the taxonomy. */
test('the composer draws the contract: subject, Markdown body, kind chips opening on inform, and a reply toggle that starts off', () => {
  assert.match(composer, /const EMPTY_DRAFT: DraftMessage = \{ subject: '', body: '', act: 'inform', expectsReply: false \};/);
  assert.match(composer, /aria-label=\{t\('team\.thread\.subject'\)\}/);
  assert.match(composer, /aria-label=\{t\('team\.thread\.body'\)\}/);
  assert.match(composer, /<textarea/, 'the body is multi line, because it is Markdown');
  // The four kinds come from the contract, so a fifth can never be typed here.
  assert.match(composer, /\{MESSAGE_ACTS\.map\(\(a\) => \(\s*<FilterChip key=\{a\} on=\{draft\.act === a\} onClick=\{\(\) => setDraft\(\{ \.\.\.draft, act: a \}\)\}>/);
  assert.ok(!/<Seg</.test(composer), 'the kind picker is plain chips, not a segmented control');
  assert.match(composer, /<Switch\s+on=\{draft\.expectsReply\}/);
  // Wanting a reply IS asking: the toggle promotes the default inform to ask,
  // and leaves an explicitly chosen kind alone.
  assert.match(composer, /act: expectsReply && d\.act === 'inform' \? 'ask' : d\.act/);
});

test('the counters are the contract\'s caps, not numbers typed into the screen', () => {
  assert.match(composer, /max=\{MESSAGE_LIMITS\.subject\}/);
  assert.match(composer, /max=\{MESSAGE_LIMITS\.body\}/);
  assert.ok(!new RegExp(`\\b${M.MESSAGE_LIMITS.body}\\b`).test(composer), 'the body cap is hardcoded beside the constant');
  assert.ok(!/max=\{80\}|max=\{1200\}/.test(composer), 'a cap was typed rather than imported');
});

test('Send is disabled exactly while the contract refuses the draft, and the same array is the reason', () => {
  assert.match(composer, /const violations = useMemo\(\(\) => validateMessage\(draft\), \[draft\]\);/);
  assert.match(composer, /: explainViolations\(violations\);/);
  assert.match(composer, /const blocked = spent \|\| !canSend \|\| violations\.length > 0;/);
  assert.match(composer, /<Btn kind="primary" disabled=\{blocked \|\| !!sending\}/);
  // A disabled button with no reason is the thing this replaces, so the reason
  // is rendered from the same state that disables the button.
  assert.match(composer, /\{reason && \(/);
  assert.match(composer, /role="status"/, 'the reason is announced, not only painted');
  assert.match(composer, /\{reason\}/);
});

test('the composer never invents a refusal of its own: every violation comes from the contract', () => {
  assert.match(composer, /from '@shared\/teamMessage'/);
  for (const symbol of ['CHANGE_IT_YOURSELF', 'MESSAGE_ACTS', 'MESSAGE_LIMITS', 'explainViolations', 'turnsLeft', 'validateMessage']) {
    assert.ok(composer.includes(symbol), `the composer does not use ${symbol}`);
  }
  /* 0.4.11: the composer is the PERSON'S seat, so the agents' sentence has no
     business here. It told the person at the keyboard to go and ask
     themselves, and the status presets it named were never an input to this
     composer's disabled state. */
  assert.ok(!composer.includes('ASK_THE_HUMAN'), 'the composer shows the person the agents\' sentence');
  assert.ok(!/subject\.length >|body\.length >/.test(composer), 'the composer re-implements a cap check');
});

/* ---- 3. the turn budget, visible before it bites ------------------------- */

/* 0.4.11: the count moved from `messages.length` to `turnsUsed(messages)`.
   The old pin froze the defect: a send of your own that ended `failed` never
   reached anyone, and counting it let a string of failures spend the thread.
   The guarantee now is one rule in the contract, applied by the chip, the
   composer and main's own gate alike. */
test('turns left are on the thread from the first message, counted over both sides through the one rule', () => {
  assert.match(thread, /const used = turnsUsed\(messages\);/);
  assert.match(thread, /const left = turnsLeft\(used\);/);
  assert.match(thread, /t\('team\.thread\.turnsLeft', \{ count: left \}\)/);
  assert.match(thread, /tone=\{left === 0 \? 'bad' : 'muted'\}/, 'the chip changes when the budget is gone');
  assert.match(thread, /threadEntries=\{used\}/, 'the composer counts the same entries the chip does');
  assert.ok(!/turnsLeft\(messages\.length\)/.test(thread), 'the raw length count came back');
  assert.ok(!/threadEntries=\{messages\.length\}/.test(thread), 'the composer is fed the raw length again');
  // The arithmetic itself is the contract's, and it is the whole thread.
  assert.equal(M.turnsLeft(0), M.DEFAULT_TURN_BUDGET);
  assert.equal(M.turnsLeft(M.DEFAULT_TURN_BUDGET), 0);
  // The rule, run for real: your own failed send buys no turn; everything
  // else, both sides, in flight included, still does.
  const you = (delivery) => ({ from: 'you', delivery });
  const them = (delivery) => ({ from: 'mem_pam', delivery });
  assert.equal(M.turnsUsed([you('failed'), you('failed'), you('failed'), you('failed')]), 0,
    'a string of failures spent the thread');
  assert.equal(M.turnsUsed([you('delivered'), them('delivered'), you('sending'), you('queued')]), 4);
  assert.equal(M.turnsUsed([them('failed')]), 1, 'only YOUR failed sends are free; a fixture oddity from them still counts');
  assert.equal(M.countsTowardBudget({ from: 'you' }), true, 'no delivery state counts, so fixtures keep their budget');
});

/* 0.4.11: the spent state stopped being a dead end. The sentence is the
   person's own (CHANGE_IT_YOURSELF, verbatim and untranslated like every rule
   string), and beside it is the door it names: a kit button that asks main to
   rotate the pair's thread file. ASK_THE_HUMAN sent the person to the status
   presets, which were never an input to this composer's disabled state. */
test('at zero turns the composer closes, says the person\'s sentence, and offers the door out', () => {
  assert.match(composer, /const left = turnsLeft\(threadEntries\);/);
  assert.match(composer, /const spent = left === 0;/);
  assert.match(composer, /const reason = spent\s*\n?\s*\? CHANGE_IT_YOURSELF/);
  // Closed means closed: the fields go dead too, not just the button.
  assert.equal((composer.match(/disabled=\{spent \|\| !canSend\}/g) || []).length, 3,
    'subject, body and the attach control all close when the budget is spent');
  assert.ok(M.CHANGE_IT_YOURSELF.includes('Start a new one'), 'the sentence still names the action it sits beside');

  // The door itself: drawn exactly in the spent state, when a bridge exists
  // to answer it, as a kit button with an i18n'd label.
  assert.match(composer, /\{spent && onStartNewThread && \(/);
  assert.match(composer, /<Btn size="sm" onClick=\{startNew\} disabled=\{rotating\}>/);
  assert.match(composer, /\{t\('team\.thread\.startNew'\)\}/);
  assert.match(composer, /onStartNewThread\?: \(\) => Promise<boolean>;/);
  // The rotation keeps what the person typed: only a SENT draft is cleared,
  // and the subject is focused once the fields reopen.
  assert.match(composer, /const startNew = \(\): void => \{/);
  assert.ok(!/startNew[\s\S]{0,200}setDraft\(EMPTY_DRAFT\)/.test(composer), 'the rotation throws the draft away');
  assert.match(composer, /subjectRef\.current\?\.focus\(\);/);
  assert.match(composer, /ref=\{subjectRef\}/, 'the focus lands on the subject field');
});

/* ---- 4. the brief a person can read -------------------------------------- */

test('the brief the agents were given is readable from the thread, verbatim', () => {
  assert.match(thread, /import \{[\s\S]*?crossUserBrief[\s\S]*?\} from '@shared\/teamMessage';/);
  assert.match(thread, /<CodeBox>\{crossUserBrief\(\)\}<\/CodeBox>/, 'a paraphrase would let the two say different things');
  assert.match(thread, /\{rules \? t\('team\.thread\.rulesHide'\) : t\('team\.thread\.rules'\)\}/);
});

/* ---- 5. the share control finally has a call site ------------------------ */

test('the composer mounts the share button, once, and publishes nothing itself', () => {
  assert.match(composer, /import \{ ShareFileButton \} from '\.\/ShareFileButton';/);
  assert.equal((composer.match(/<ShareFileButton/g) || []).length, 1);
  // The confirm and the single publish call belong to that button. Nothing
  // here may reach past it to the door it guards.
  assert.ok(!/fileShareCreate/.test(composer), 'the composer publishes a file without the confirm');
  assert.ok(!/pathForFile/.test(composer), 'the composer touches a local path');
  assert.equal((shareButton.match(/fileShareCreate\(/g) || []).length, 1,
    'mounting the button must not have added a second publish path');
});

test('the composer is handed the share it just made, and never guesses which one it was', () => {
  // This began as a one second poll of `fileShareList` with a baseline set,
  // because the button had no way to report what it had published. That was
  // racy: two shares made in the same second, or one made in another window,
  // are indistinguishable in a list. The button now takes `onShared` and hands
  // back the exact record, so the guarantee is stronger and is pinned here.
  assert.match(shareButton, /onShared\?: \(share: FileShareView\) => void;/,
    'the button must be able to report the share it created');
  assert.match(shareButton, /onShared\?\.\(res\.share\);/,
    'it reports the share it created, not a re-read of the store');
  assert.match(composer, /<ShareFileButton onShared=\{addShare\} \/>/);
  assert.match(composer, /if \(!share\.url\) return;/,
    'a share the tunnel could not publish must never become an empty link');
  assert.match(composer, /body: withShareLinks\(d\.body, \[share\]\)/);
  // No watcher, no interval, no second read door. The callback is the path.
  assert.ok(!/fileShareList/.test(composer), 'the composer polls a store it does not own');
  assert.ok(!/setInterval/.test(composer), 'a poll came back');
});

/* ---- 6. the IPC seam ----------------------------------------------------- */

test('the whole draft crosses the bridge: it is never flattened back into one string', () => {
  assert.match(thread, /await api\.teamsSend\(mate\.id, draft\);/);
  assert.match(thread, /const send = async \(draft: DraftMessage\): Promise<boolean> => \{/);
  assert.ok(!/teamsSend\([^)]*\$\{/.test(thread), 'the draft is being squeezed into a template string');
  assert.ok(!/JSON\.stringify\(draft\)/.test(thread), 'the draft is being stringified to fit the old door');
  assert.ok(!/as any|as unknown/.test(thread), 'the seam is being cast around instead of widened');
  assert.ok(!/as any|as unknown as/.test(composer), 'the composer casts around a type');
  // The draft is cleared only once the send resolved, so a failure keeps what
  // the person wrote.
  assert.match(composer, /void onSend\(draft\)\.then\(\(sent\) => \{ if \(sent\) \{ setDraft\(EMPTY_DRAFT\); setAttaching\(false\); \} \}\);/);
});

test('the call sites other screens pin are untouched: one prop shape, still injectable', () => {
  assert.match(thread, /export function CrossNodeThread\(\{ mate, thread \}: CrossNodeThreadProps\)/);
  assert.match(thread, /thread\?: ThreadMessage\[\];/, 'the boards still pass a fixture thread');
  // The two guarantees test/pro-049-teamwindow.test.cjs reads out of this file.
  assert.match(thread, /useThread\(mate\.id\)/);
  assert.match(thread, /el\.scrollTop = el\.scrollHeight/);
  const inbox = strip(read(`${PRO}/InboxScreen.tsx`));
  assert.match(inbox, /<CrossNodeThread mate=\{chat\.mate\} \/>/);
});

test('the bare text input the composer replaces is gone from the thread', () => {
  assert.ok(!/<input\b/.test(thread), 'the one line send box is still in the thread');
  assert.match(thread, /<DraftComposer/);
});

/* ---- 7. house rules ------------------------------------------------------ */

test('tokens, even borders, and no dashes in anything a person reads', () => {
  for (const [name, src] of [['CrossNodeThread', thread], ['DraftComposer', composer]]) {
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src), `${name} has a literal colour; both skins must work`);
    assert.ok(!/border(Top|Right|Bottom|Left):/.test(src), `${name} has a one edge border`);
    for (const lit of src.match(/'[^'\n]*'|`[^`\n]*`/g) ?? []) {
      assert.ok(!/[—–]/.test(lit), `${name} literal carries a dash: ${lit}`);
    }
  }
});

test('every string the two files draw exists in all three locales, translated, with no dashes', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (
    v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]
  ));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [
    l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))
  ]));

  const used = new Set();
  for (const src of [thread, composer]) {
    for (const m of src.matchAll(/\bt\(\s*'(team\.[^']+)'/g)) used.add(m[1]);
  }
  // The act labels are built from the contract, so they are named here rather
  // than scraped, and the loop below proves each one ships.
  for (const act of M.MESSAGE_ACTS) used.add(`team.thread.acts.${act}`);
  assert.ok(used.size >= 15, `only ${used.size} strings found; the scan is not armed`);

  for (const key of used) {
    for (const l of ['en', 'zh-CN', 'ar']) {
      const v = locales[l].get(key);
      assert.equal(typeof v, 'string', `${key} missing in ${l}`);
      assert.ok(!/—|–| - /.test(v), `${key} in ${l} carries a dash: ${v}`);
      assert.equal(/michael/i.test(v), false, `${key} in ${l} names the orchestrator`);
    }
    for (const l of ['zh-CN', 'ar']) {
      assert.notEqual(locales[l].get(key), locales.en.get(key), `${key} is untranslated in ${l}`);
    }
  }

  // The two keys that carry a variable must carry it in every locale, or the
  // count and the name render as literal braces.
  for (const l of ['en', 'zh-CN', 'ar']) {
    assert.ok(locales[l].get('team.thread.turnsLeft').includes('{{count}}'), `turnsLeft in ${l} lost its count`);
    assert.ok(locales[l].get('team.thread.noRelay').includes('{{name}}'), `noRelay in ${l} lost its name`);
  }
});
