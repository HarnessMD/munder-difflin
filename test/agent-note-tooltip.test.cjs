'use strict';

/**
 * 0.5.2, card v052-agent-note-tooltip (founder, 8 Sep 2026): an agent note
 * longer than one line shows in full on hover, and ONLY when something is
 * hidden. The decision is pure (@shared/noteTooltip); the component draws a
 * real tooltip through a portal, the same in both skins.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { noteNeedsTooltip, noteFirstLine, noteIsMultiLine } = loadTs('src/shared/noteTooltip.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('a short note that fits gets no tooltip: the half of the ask that is easy to miss', () => {
  assert.equal(noteNeedsTooltip('owns billing', { scrollWidth: 80, clientWidth: 120 }), false);
  assert.equal(noteNeedsTooltip('', { scrollWidth: 0, clientWidth: 120 }), false);
  assert.equal(noteNeedsTooltip(null, { scrollWidth: 0, clientWidth: 120 }), false);
  assert.equal(noteNeedsTooltip('   \n  \n', { scrollWidth: 0, clientWidth: 120 }), false, 'blank lines are no note');
  assert.equal(noteNeedsTooltip('owns billing', null), false, 'unmeasured and one line: nothing known to be hidden');
});

test('a line that was cut, or a note with more lines, gets one', () => {
  assert.equal(noteNeedsTooltip('owns billing and the whole of the Razorpay path', { scrollWidth: 260, clientWidth: 120 }), true);
  assert.equal(noteNeedsTooltip('owns billing\nask before touching prod', { scrollWidth: 80, clientWidth: 120 }), true);
  assert.equal(noteNeedsTooltip('owns billing\nask before touching prod', null), true, 'more lines need no measuring');
  assert.equal(noteNeedsTooltip('owns billing\n\n\n', null), false, 'trailing blank lines are not more lines');
});

test('the row shows the first line with words on it', () => {
  assert.equal(noteFirstLine('\n\n  second line is first  \nthird'), '  second line is first  ');
  assert.equal(noteIsMultiLine('one\n\ntwo'), true);
  assert.equal(noteIsMultiLine('one\n\n'), false);
});

test('both skins draw the note through the one component, and neither leans on a title attribute any more', () => {
  const pro = read('src/renderer/src/components/pro/ProSidebar.tsx');
  const card = read('src/renderer/src/components/AgentCard.tsx');
  const roster = read('src/renderer/src/components/FullscreenTerminal.tsx');
  assert.match(pro, /<TruncatedNote\s+note=\{agent\.note\}\s+data-agent-note-text/);
  assert.doesNotMatch(pro, /title=\{agent\.note\}/, 'the native title was the thing the founder could not read');
  // 0.5.3, F25 (Pam's Classic cards): the strip card is one size for every
  // agent and carries no note line; the roster row draws EVERY bullet of the
  // note, one line each, so nothing is hidden behind a hover there.
  assert.doesNotMatch(card, /<TruncatedNote/, 'the 236 x 92 card has no note line');
  assert.doesNotMatch(card, /title=\{note\}/, 'and no native title on a note either');
  assert.match(roster, /const bullets = \(agent\.note \?\? ''\)\.split\('\\n'\)/);
  assert.match(roster, /\{bullets\.map\(\(line, i\) => \(/);
});

test('the tooltip is real: a portal at a fixed position, pre-wrap, gated on the measured box', () => {
  const src = read('src/renderer/src/components/NoteTooltip.tsx');
  assert.match(src, /createPortal\(/);
  assert.match(src, /position: 'fixed'/);
  assert.match(src, /whiteSpace: 'pre-wrap'/, 'a multi-line note keeps its lines');
  assert.match(src, /noteNeedsTooltip\(note, \{ scrollWidth: el\.scrollWidth, clientWidth: el\.clientWidth \}\)/, 'gated on what is actually hidden');
  assert.match(src, /role="tooltip"/);
  // Closes on any scroll, so it cannot be left floating over a moved row.
  assert.match(src, /addEventListener\('scroll', close, true\)/);
  // The pro fence: nothing pixel in a file the PRO sidebar imports.
  assert.doesNotMatch(src, /Pixel(Panel|Button|Badge)|\/Icon'/);
});
