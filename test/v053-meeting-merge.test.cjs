'use strict';
/**
 * 0.5.3, F16: the You and Them merge (src/shared/meetingMerge.ts), pure,
 * driven with fixtures: two lists that interleave, a long Them run over
 * short You backchannels, an empty Them list that must read as a one track
 * meeting did before, clock offsets across segments, unsorted input, an
 * engine with no times.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const { mergeTracks, transcriptBlock, clockStamp, wholeClip } = loadTs('src/shared/meetingMerge.ts');

const YOU = [
  { t0: 0.4, t1: 2.1, text: 'Right, the release.' },
  { t0: 9.0, t1: 12.5, text: 'And the web half is frozen at 773.' },
  { t0: 12.6, t1: 14.0, text: 'So the founder runs the review script.' }
];
const THEM = [
  { t0: 2.5, t1: 8.8, text: 'Creed has the desktop half at c08.' },
  { t0: 14.2, t1: 16.0, text: 'Top to bottom?' }
];

test('two tracks interleave by start time and each speaker\'s consecutive lines become one run', () => {
  const runs = mergeTracks(YOU, THEM);
  assert.deepEqual(runs.map((r) => [r.speaker, r.startMs, r.endMs, r.text]), [
    ['you', 400, 2100, 'Right, the release.'],
    ['them', 2500, 8800, 'Creed has the desktop half at c08.'],
    ['you', 9000, 14000, 'And the web half is frozen at 773. So the founder runs the review script.'],
    ['them', 14200, 16000, 'Top to bottom?']
  ]);
});

test('a long Them run over short You backchannels keeps the time order and does not swallow the backchannels', () => {
  const them = [{ t0: 0, t1: 30, text: 'We looked at the numbers for the quarter and the pricing endpoint is the one thing that moved.' }];
  const you = [{ t0: 4, t1: 4.5, text: 'Mm.' }, { t0: 12, t1: 12.6, text: 'Right.' }, { t0: 31, t1: 33, text: 'Agreed.' }];
  const runs = mergeTracks(you, them);
  assert.deepEqual(runs.map((r) => `${r.speaker}:${r.text}`), [
    'them:We looked at the numbers for the quarter and the pricing endpoint is the one thing that moved.',
    'you:Mm. Right. Agreed.'
  ], 'the backchannels start after the run starts, so they follow it as one run of yours');
});

test('a tie on the start goes to the line that ends first, then to you', () => {
  const runs = mergeTracks([{ t0: 1, t1: 3, text: 'yours' }], [{ t0: 1, t1: 2, text: 'theirs' }]);
  assert.deepEqual(runs.map((r) => r.speaker), ['them', 'you']);
  const same = mergeTracks([{ t0: 1, t1: 2, text: 'yours' }], [{ t0: 1, t1: 2, text: 'theirs' }]);
  assert.deepEqual(same.map((r) => r.speaker), ['you', 'them']);
});

test('the offset moves the clip onto the meeting clock; unsorted and blank input is sorted and dropped', () => {
  const runs = mergeTracks([{ t0: 5, t1: 6, text: ' late ' }, { t0: 1, t1: 2, text: 'early' }, { t0: 3, t1: 4, text: '   ' }], [], 600_000);
  assert.deepEqual(runs.map((r) => [r.startMs, r.text]), [[601_000, 'early late']], 'sorted, the blank dropped, one run, on the clock');
  assert.equal(clockStamp(601_000), '[10:01]', 'the rule shared/puck.ts clockOf prints: hours only past an hour');
  assert.equal(clockStamp(3_600_000 + 65_000), '[01:01:05]');
  assert.equal(clockStamp(-5), '[00:00]');
});

test('the transcript block: You and Them prefixes with a second track; exactly the old one track lines without one', () => {
  const two = transcriptBlock(YOU, THEM, 600_000);
  assert.equal(two, [
    '[10:00] You: Right, the release.\n\n',
    '[10:02] Them: Creed has the desktop half at c08.\n\n',
    '[10:09] You: And the web half is frozen at 773. So the founder runs the review script.\n\n',
    '[10:14] Them: Top to bottom?\n\n'
  ].join(''));
  // No second track: one stamped line per engine line, no prefix, the shape
  // src/main/puck.ts appended before two tracks existed.
  const one = transcriptBlock(YOU, null, 600_000);
  assert.equal(one, '[10:00] Right, the release.\n\n[10:09] And the web half is frozen at 773.\n\n[10:12] So the founder runs the review script.\n\n');
  assert.doesNotMatch(one, /You:|Them:/);
  // An empty second track (they said nothing in this clip) still labels, so
  // a meeting that has the track reads the same in every clip.
  assert.match(transcriptBlock(YOU, [], 0), /^\[00:00\] You: /);
  // A one track meeting can ask for the prefix.
  assert.match(transcriptBlock(YOU, null, 0, { label: true }), /^\[00:00\] You: /);
  // Other words for the two speakers (a locale).
  assert.match(transcriptBlock(YOU, THEM, 0, { words: { you: 'Tú', them: 'Ellos' } }), /Tú: Right/);
});

test('an engine with no times gives one line for the whole clip', () => {
  assert.deepEqual(wholeClip('  all of it  ', 4_200), [{ t0: 0, t1: 4.2, text: 'all of it' }]);
  assert.deepEqual(wholeClip('   ', 4_200), []);
  const runs = mergeTracks(wholeClip('you said this', 10_000), wholeClip('they said that', 10_000), 0);
  assert.deepEqual(runs.map((r) => r.speaker), ['you', 'them'], 'both whole, you first on the tie');
});
