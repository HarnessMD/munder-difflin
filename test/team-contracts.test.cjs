'use strict';

/**
 * THE THREE CONTRACTS the 0.4.10 team work is built on.
 *
 * `teamPolicy` decides what may cross between two people, `teamMessage` decides
 * what a message is allowed to be, and `lineClamp` decides how much of one a
 * row shows. All three are React free and import free so this file can load
 * them directly and test the rules rather than the screens.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const P = loadTs(path.join(ROOT, 'src/shared/teamPolicy.ts'));
const M = loadTs(path.join(ROOT, 'src/shared/teamMessage.ts'));
const C = loadTs(path.join(ROOT, 'src/shared/lineClamp.ts'));

/* ── teamPolicy ─────────────────────────────────────────────────────────── */

test('the four presets are exactly the four the founder named', () => {
  assert.deepEqual(P.policyOf('off'), { receive: false, send: false, commands: false });
  assert.deepEqual(P.policyOf('listen'), { receive: true, send: false, commands: false });
  assert.deepEqual(P.policyOf('converse'), { receive: true, send: true, commands: false });
  assert.deepEqual(P.policyOf('open'), { receive: true, send: true, commands: true });
});

test('policyOf hands back a copy, so a caller cannot edit the preset table', () => {
  const a = P.policyOf('open');
  a.commands = false;
  assert.equal(P.policyOf('open').commands, true);
});

test('presetOf round trips, and refuses to name a combination it does not cover', () => {
  for (const preset of P.POLICY_PRESETS) assert.equal(P.presetOf(P.policyOf(preset)), preset);
  // Send without receive is reachable by hand and is not one of the four. It
  // must read as custom rather than be mislabelled as the nearest preset.
  assert.equal(P.presetOf({ receive: false, send: true, commands: false }), null);
});

test('commands implies receive, and a stored record that says otherwise is repaired', () => {
  const fixed = P.normalizePolicy({ receive: false, send: false, commands: true });
  assert.equal(fixed.receive, true, 'a command arrives as a message; it cannot bypass the inbound door');
});

test('anything that is not a policy normalises to silence, never to open', () => {
  for (const junk of [null, undefined, 0, '', 'yes', [], { nonsense: true }]) {
    const p = P.normalizePolicy(junk);
    assert.ok(P.isSilent(p), `${JSON.stringify(junk)} opened a door`);
  }
});

test('the three old network levels map onto presets without inventing a fourth meaning', () => {
  assert.equal(P.presetFromLegacy('strict'), 'off');
  assert.equal(P.presetFromLegacy('communication-only'), 'converse');
  assert.equal(P.presetFromLegacy('allow-all'), 'open');
  // An unknown legacy value from a newer relay closes the door rather than
  // opening it. Failing open on an unrecognised permission is the classic bug.
  assert.equal(P.presetFromLegacy('something-new'), 'off');
  assert.ok(P.isSilent(P.normalizePolicy('strict')));
});

test('status and per person policy intersect, so one control silences everybody', () => {
  const open = P.policyOf('open');
  const off = P.policyOf('off');
  assert.ok(P.isSilent(P.effectivePolicy(off, open)), 'the machine status must win');
  assert.ok(P.isSilent(P.effectivePolicy(open, off)), 'the per person override must win');
  assert.deepEqual(P.effectivePolicy(open, null), open, 'no override means the status stands');
  // A person set to listen cannot be made to send by a per person setting.
  assert.equal(P.effectivePolicy(P.policyOf('listen'), open).send, false);
});

test('a message crosses only when both sides allow it, and the block names the closed side', () => {
  const open = P.policyOf('open');
  const listen = P.policyOf('listen');
  const off = P.policyOf('off');

  assert.equal(P.canSendTo(open, open), true);
  assert.equal(P.canSendTo(listen, open), false, 'receive only must not send');
  assert.equal(P.canSendTo(open, off), false, 'they are not accepting anything');
  assert.equal(P.sendBlock(listen, open), 'you-not-sending');
  assert.equal(P.sendBlock(open, off), 'they-not-receiving');
  assert.equal(P.sendBlock(open, open), null);

  assert.equal(P.canReceiveFrom(open, open), true);
  assert.equal(P.canReceiveFrom(off, open), false);
  assert.equal(P.canReceiveFrom(open, listen), false, 'they do not send');
});

test('taking a command needs the inbound door open as well as the command axis', () => {
  const open = P.policyOf('open');
  assert.equal(P.canTakeCommandsFrom(open, open), true);
  assert.equal(P.canTakeCommandsFrom(P.policyOf('converse'), open), false, 'converse never takes work');
  assert.equal(P.canTakeCommandsFrom({ receive: false, send: true, commands: true }, open), false);
});

/* ── the status schedule ────────────────────────────────────────────────── */

const at = (day, hh, mm) => {
  // 4 Jan 2026 is a Sunday, so adding `day` lands on the weekday we want.
  const d = new Date(2026, 0, 4 + day, hh, mm, 0, 0);
  assert.equal(d.getDay(), day);
  return d;
};

test('a disabled schedule never moves the status', () => {
  const s = { enabled: false, windows: [{ days: [1], from: 0, to: 1440, preset: 'off' }], fallback: 'off' };
  assert.equal(P.scheduledPreset(s, at(1, 12, 0)), null);
});

test('a weekday window applies inside it and the fallback applies outside', () => {
  const s = {
    enabled: true,
    fallback: 'listen',
    windows: [{ days: [1, 2, 3, 4, 5], from: 9 * 60, to: 18 * 60, preset: 'open' }]
  };
  assert.equal(P.scheduledPreset(s, at(1, 9, 0)), 'open', 'the start minute is inside');
  assert.equal(P.scheduledPreset(s, at(1, 17, 59)), 'open');
  assert.equal(P.scheduledPreset(s, at(1, 18, 0)), 'listen', 'the end minute is outside');
  assert.equal(P.scheduledPreset(s, at(1, 8, 59)), 'listen');
  assert.equal(P.scheduledPreset(s, at(0, 12, 0)), 'listen', 'Sunday is not in the window');
});

test('a window that wraps midnight owns the small hours of the next day', () => {
  const s = {
    enabled: true,
    fallback: 'converse',
    windows: [{ days: [1], from: 22 * 60, to: 7 * 60, preset: 'off' }]
  };
  assert.equal(P.scheduledPreset(s, at(1, 23, 0)), 'off', 'Monday night');
  assert.equal(P.scheduledPreset(s, at(2, 3, 0)), 'off', 'the small hours belong to Monday night');
  assert.equal(P.scheduledPreset(s, at(2, 8, 0)), 'converse', 'Tuesday morning is not covered');
  assert.equal(P.scheduledPreset(s, at(1, 12, 0)), 'converse', 'Monday midday is not covered');
});

test('the first matching window wins, so a narrow exception sits above a broad rule', () => {
  const s = {
    enabled: true,
    fallback: 'listen',
    windows: [
      { days: [3], from: 12 * 60, to: 13 * 60, preset: 'off' },
      { days: [1, 2, 3, 4, 5], from: 9 * 60, to: 18 * 60, preset: 'open' }
    ]
  };
  assert.equal(P.scheduledPreset(s, at(3, 12, 30)), 'off');
  assert.equal(P.scheduledPreset(s, at(3, 14, 0)), 'open');
});

test('a hand edited schedule cannot smuggle in a window nobody chose', () => {
  const s = P.normalizeSchedule({
    enabled: true,
    fallback: 'nonsense',
    windows: [
      { days: [1], from: 0, to: 60, preset: 'open' },
      { days: [], from: 0, to: 60, preset: 'open' },
      { days: [9], from: 0, to: 60, preset: 'open' },
      { days: [1], from: 5000, to: 60, preset: 'open' },
      { days: [1], from: 0, to: 60, preset: 'wideopen' },
      'not an object'
    ]
  });
  assert.equal(s.windows.length, 1, 'only the one valid window survives');
  assert.equal(s.fallback, 'converse', 'an unknown fallback falls back');
});

/* ── teamMessage ────────────────────────────────────────────────────────── */

const draft = (over) => ({ subject: 'Deploy blocked on the relay', body: 'The relay refuses the new key.', act: 'ask', expectsReply: true, ...over });

test('a well formed message passes', () => {
  assert.deepEqual(M.validateMessage(draft()), []);
});

test('every violation carries an instruction, not just a complaint', () => {
  const all = [
    ...M.validateMessage(draft({ subject: '', body: '' })),
    ...M.validateMessage(draft({ subject: 'x'.repeat(200), act: 'chat' })),
    ...M.checkRate({ sentLastHour: 99, openThreads: 99, threadEntries: 99 })
  ];
  assert.ok(all.length >= 5);
  for (const v of all) {
    assert.ok(typeof v.fix === 'string' && v.fix.length > 10, `${v.code} has no usable fix`);
    assert.ok(/[.!]$/.test(v.fix.trim()), `${v.code} fix is not a sentence`);
    assert.ok(!/—|–| - /.test(v.fix), `${v.code} fix carries a dash`);
  }
});

test('all the problems come back at once, so a rewrite is not a guessing game', () => {
  const codes = M.validateMessage({ subject: '', body: 'x'.repeat(5000), act: 'gossip', expectsReply: false }).map((v) => v.code);
  assert.ok(codes.includes('subject-missing'));
  assert.ok(codes.includes('body-long'));
  assert.ok(codes.includes('act-unknown'));
});

test('the caps are enforced on characters, on lines, and on code blocks', () => {
  const codes = (d) => M.validateMessage(d).map((v) => v.code);
  assert.ok(codes(draft({ body: 'x'.repeat(M.MESSAGE_LIMITS.body + 1) })).includes('body-long'));
  assert.ok(!codes(draft({ body: 'x'.repeat(M.MESSAGE_LIMITS.body) })).includes('body-long'), 'the cap itself is allowed');
  assert.ok(codes(draft({ body: Array(M.MESSAGE_LIMITS.bodyLines + 2).join('a\n') })).includes('body-lines'));
  const fences = Array(M.MESSAGE_LIMITS.codeBlocks + 2).fill('```\ncode\n```').join('\n');
  assert.ok(codes(draft({ body: fences })).includes('body-code-blocks'));
});

test('a spent turn budget tells the agent to stop and ask its human', () => {
  const v = M.checkRate({ sentLastHour: 0, openThreads: 0, threadEntries: M.DEFAULT_TURN_BUDGET });
  assert.equal(v.length, 1);
  assert.equal(v[0].code, 'turn-budget');
  assert.ok(v[0].fix.includes('ask your human'), 'the one action that unblocks the work must be named');
  assert.equal(M.turnsLeft(M.DEFAULT_TURN_BUDGET), 0);
  assert.equal(M.turnsLeft(M.DEFAULT_TURN_BUDGET + 9), 0, 'never negative');
  assert.equal(M.turnsLeft(1), M.DEFAULT_TURN_BUDGET - 1);
});

test('the hourly ceiling and the open thread ceiling are separate refusals', () => {
  const hour = M.checkRate({ sentLastHour: M.MESSAGE_RATE.perHour, openThreads: 0, threadEntries: 0 });
  assert.deepEqual(hour.map((v) => v.code), ['rate-hour']);
  const threads = M.checkRate({ sentLastHour: 0, openThreads: M.MESSAGE_RATE.openThreads, threadEntries: 0 });
  assert.deepEqual(threads.map((v) => v.code), ['open-threads']);
});

test('the brief an agent is given quotes the numbers it is actually held to', () => {
  const brief = M.crossUserBrief();
  assert.ok(brief.includes(String(M.MESSAGE_LIMITS.body)));
  assert.ok(brief.includes(String(M.MESSAGE_LIMITS.subject)));
  assert.ok(brief.includes(String(M.DEFAULT_TURN_BUDGET)));
  assert.ok(brief.includes(String(M.MESSAGE_RATE.perHour)));
  assert.ok(!/—|–| - /.test(brief), 'the brief carries a dash');
  // It is injected into agent context every turn, so nothing in it may move.
  assert.equal(brief, M.crossUserBrief(), 'the brief is not stable across calls');
});

/* ── lineClamp ──────────────────────────────────────────────────────────── */

test('a short body is returned whole and is not marked clipped', () => {
  const r = C.clampLines('one\ntwo');
  assert.equal(r.text, 'one\ntwo');
  assert.equal(r.clipped, false);
  assert.equal(r.hiddenLines, 0);
});

test('a long body keeps the opening and counts what it hid', () => {
  const body = Array.from({ length: 40 }, (_, i) => `line ${i}`).join('\n');
  const r = C.clampLines(body, { maxLines: 5, maxChars: 10000 });
  assert.equal(r.text.split('\n').length, 5);
  assert.equal(r.clipped, true);
  assert.equal(r.hiddenLines, 35);
  assert.ok(r.text.startsWith('line 0'));
});

test('one enormous unbroken paragraph is cut on a word boundary', () => {
  const body = Array(400).fill('word').join(' ');
  const r = C.clampLines(body, { maxLines: 5, maxChars: 100 });
  assert.ok(r.text.length <= 100);
  assert.equal(r.clipped, true);
  assert.ok(!/\s$/.test(r.text), 'no trailing space');
  assert.ok(r.text.endsWith('word'), 'cut mid word');
});

test('a run of blank lines does not spend the budget on nothing', () => {
  const r = C.clampLines('\n\n\na\n\n\n\nb\n\n\n', { maxLines: 5 });
  assert.equal(r.text, 'a\n\nb');
  assert.equal(r.clipped, false);
});

test('a cut inside a code fence drops the fence rather than leaving it open', () => {
  const body = ['intro', '```js', 'const a = 1;', 'const b = 2;', 'const c = 3;', 'const d = 4;'].join('\n');
  const r = C.clampLines(body, { maxLines: 4, maxChars: 10000 });
  const fences = (r.text.match(/```/g) || []).length;
  assert.equal(fences % 2, 0, 'an unterminated fence swallows the rest of the row');
  assert.equal(r.text, 'intro');
  assert.equal(r.clipped, true);
});

test('a complete fence inside the budget survives', () => {
  const body = ['```', 'x', '```', 'after'].join('\n');
  const r = C.clampLines(body, { maxLines: 5, maxChars: 10000 });
  assert.equal(r.text, body);
  assert.equal(r.clipped, false);
});

test('a truncated table does not render as a line of stray pipes', () => {
  const body = ['| a | b |', '| - | - |', '| 1 | 2 |', '| 3 | 4 |', '| 5 | 6 |'].join('\n');
  const r = C.clampLines(body, { maxLines: 3, maxChars: 10000 });
  assert.ok(!r.text.includes('|'), 'a partial table is worse than no table');
  assert.equal(r.clipped, true);
});

test('an empty or absent body is handled without throwing', () => {
  for (const v of ['', '   \n\n  ', null, undefined]) {
    const r = C.clampLines(v);
    assert.equal(r.text, '');
    assert.equal(r.clipped, false);
  }
});

test('previewLine strips markdown syntax instead of showing it raw', () => {
  assert.equal(C.previewLine('## The heading'), 'The heading');
  assert.equal(C.previewLine('- **bold** and `code`'), 'bold and code');
  assert.equal(C.previewLine('see [the docs](https://example.com)'), 'see the docs');
  assert.equal(C.previewLine('> quoted'), 'quoted');
});

test('previewLine skips a leading code fence and finds the first real line', () => {
  assert.equal(C.previewLine('```\ncode here\n```\nprose'), 'code here');
  assert.equal(C.previewLine(''), '');
});
