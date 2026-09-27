'use strict';

/**
 * 0.5.2, card v052-voice-michael-memory-dead-ends (founder, 9 Sep 2026): voice
 * Michael said "I don't know" to questions the team's memory answers. The tool
 * existed; what it handed the model was the CLI's printout cut at 1600
 * characters (a banner and most of one hit, often source code), and its text
 * fallback matched the whole spoken sentence as a substring of one line. The
 * first half drives the pure fix (@shared/voiceMemory) on a printout shaped
 * like the real one; the second pins the wiring.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const M = loadTs('src/shared/voiceMemory.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

// The CLI's shape, as captured on the founder's palace on 9 Sep 2026: a banner,
// "[n] wing / room", Source, Match, the text, a rule between hits.
const SAMPLE = [
  '',
  '============================================================',
  '  Results for: "relay deploy validator"',
  '============================================================',
  '',
  '  [1] pam-mt6kt8lf / general',
  '      Source: useRestoreTeam.ts',
  '      Match:  cosine=0.522  bm25=2.708',
  '',
  "      import { useEffect, useSyncExternalStore } from 'react';",
  "      import { useStore, type Agent } from '@/store/store';",
  '',
  '  ─────────────────────────────────────────',
  '  [2] kevin-mt6kt4po / general',
  '      Source: memory.md',
  '      Match:  cosine=0.495  bm25=2.355',
  '',
  '      members has additionalProperties false; 10e80c2 adds optional `receive`. A console restart',
  '      before it is rebuilt puts the old validator back.',
  '',
  '  ─────────────────────────────────────────',
  '  [3] god / general',
  '      Source: memory.md',
  '      Match:  cosine=0.457  bm25=1.836',
  '',
  '      I took the plain restart because deploy.sh would also restart the console.',
  '      Source: of truth is the board.',
  '',
  '  ─────────────────────────────────────────',
  '  [4] angela-msptc2kj / general',
  '      Source: blog-sunroom.css',
  '      Match:  cosine=0.21  bm25=0.0',
  '',
  '      :root { --ink: #1A1320; }',
  '',
  '  ─────────────────────────────────────────',
  ''
].join('\n');

test('parseMempalaceSearch: the printout as hits, text joined, a second "Source:" inside the text left alone', () => {
  const hits = M.parseMempalaceSearch(SAMPLE);
  assert.equal(hits.length, 4);
  assert.deepEqual(hits.map((h) => h.n), [1, 2, 3, 4]);
  assert.equal(hits[1].wing, 'kevin-mt6kt4po');
  assert.equal(hits[1].room, 'general');
  assert.equal(hits[1].source, 'memory.md');
  assert.equal(hits[1].cosine, 0.495);
  assert.equal(hits[1].bm25, 2.355);
  assert.equal(hits[1].text, 'members has additionalProperties false; 10e80c2 adds optional `receive`. A console restart before it is rebuilt puts the old validator back.');
  assert.equal(hits[2].text, 'I took the plain restart because deploy.sh would also restart the console. Source: of truth is the board.');
  assert.deepEqual(M.parseMempalaceSearch(''), []);
  assert.deepEqual(M.parseMempalaceSearch('Traceback (most recent call last):\n  boom'), []);
  assert.equal(M.looksLikeMempalaceSearch(SAMPLE), true);
  assert.equal(M.looksLikeMempalaceSearch('Traceback'), false);
});

test('rankMemoryHits: notes before code, the weak hit dropped, the count capped', () => {
  const ranked = M.rankMemoryHits(M.parseMempalaceSearch(SAMPLE));
  assert.deepEqual(ranked.map((h) => h.n), [2, 3, 1], 'the two notes lead although the code hit had the top cosine; the 0.21 css hit is gone');
  assert.equal(M.rankMemoryHits(M.parseMempalaceSearch(SAMPLE), 2).length, 2);
  // A palace that answers weakly everywhere still answers.
  const weak = [{ n: 1, wing: 'x', room: 'r', source: 'a.ts', cosine: 0.2, bm25: 0, text: 'something' }];
  assert.equal(M.rankMemoryHits(weak).length, 1);
  assert.deepEqual(M.rankMemoryHits([{ n: 1, wing: 'x', room: 'r', source: 'a.ts', cosine: 0.9, bm25: 0, text: '' }]), [], 'a hit with no text is nothing');
});

test('spokenMemoryHits: who said it, what kind of place it came from, under the budget', () => {
  const ranked = M.rankMemoryHits(M.parseMempalaceSearch(SAMPLE));
  const spoken = M.spokenMemoryHits(ranked);
  assert.match(spoken, /^Kevin's notes: members has additionalProperties false/);
  assert.match(spoken, /the orchestrator's notes: I took the plain restart/);
  assert.match(spoken, /Pam's file useRestoreTeam\.ts: import/);
  assert.ok(spoken.length <= M.MEMORY_RESULT_CHARS);
  assert.equal(M.speakerOf('creed-mqp3l5wn'), 'Creed');
  assert.equal(M.speakerOf('god'), 'the orchestrator');
  assert.equal(M.speakerOf(''), 'someone');
  // The budget drops later hits whole rather than cutting the paragraph mid-word.
  const long = Array.from({ length: 6 }, (_, i) => ({ n: i + 1, wing: `w${i}`, room: 'r', source: 'memory.md', cosine: 0.5, bm25: 0, text: 'y'.repeat(400) }));
  const tight = M.spokenMemoryHits(long, 700);
  assert.ok(tight.length <= 700);
  assert.equal((tight.match(/notes:/g) ?? []).length, 2, 'two whole hits fit; the third is not started');
  assert.ok(/…/.test(tight), 'each hit is cut at MEMORY_HIT_CHARS');
});

test('the text fallback matches the WORDS of a spoken question, and the excerpt is a window around the first one', () => {
  assert.deepEqual(M.keywordsOf('What did we decide about the relay deploy?'), ['relay', 'deploy']);
  assert.deepEqual(M.keywordsOf('the a an of'), []);
  assert.deepEqual(M.keywordsOf('Kevin kevin KEVIN validator trap'), ['kevin', 'validator', 'trap']);
  assert.equal(M.keywordsOf('one two three four five six seven eight nine ten eleven twelve alpha beta gamma delta').length, 8);
  const kw = ['relay', 'deploy', 'validator'];
  assert.equal(M.scoreLine('the relay deploy is a two line command', kw), 2);
  assert.equal(M.scoreLine('nothing here', kw), 0);
  assert.equal(M.keywordThreshold(kw), 2);
  assert.equal(M.keywordThreshold(['one']), 1);
  assert.equal(M.keywordThreshold([]), 1);
  const line = 'x'.repeat(300) + ' the validator trap is real ' + 'y'.repeat(300);
  const ex = M.excerptAround(line, ['validator'], 120);
  assert.ok(ex.length <= 124 && ex.includes('validator trap'), ex);
  assert.equal(M.excerptAround('short line', ['x']), 'short line');
});

test('the wiring: eight results asked for, the printout parsed and ranked in the tool, the budget raised, words matched in main', () => {
  const memory = read('src/main/memory.ts');
  assert.match(memory, /String\(opts\.results \?\? 8\)/);
  const tools = read('src/renderer/src/realtime/tools.ts');
  const start = tools.indexOf("name: 'get_memory'");
  const end = tools.indexOf("name: 'get_activity'");
  const mem = tools.slice(start, end);
  assert.match(mem, /rankMemoryHits\(parseMempalaceSearch\(res\.output\)\)/);
  assert.match(mem, /spokenMemoryHits\(hits, MEMORY_RESULT_CHARS\)/);
  assert.match(mem, /looksLikeMempalaceSearch\(res\.output\) \? '' : clip\(res\.output\.trim\(\), MEMORY_RESULT_CHARS\)/, 'an unknown printout still goes through raw');
  assert.doesNotMatch(mem, /1600/, 'the old budget is gone from the memory tool');
  assert.match(mem, /mem\.slice\(-MEMORY_RESULT_CHARS\)/, 'one agent\'s notes are read from the END, where the newest are');
  assert.equal(M.MEMORY_RESULT_CHARS, 2400);
  const main = read('src/main/index.ts');
  const ts = main.slice(main.indexOf("ipcMain.handle('hive:textSearch'"), main.indexOf('// ─── IPC: GitHub issue ingestion'));
  assert.match(ts, /const keywords = keywordsOf\(q\);/);
  assert.match(ts, /score < threshold/);
  assert.match(ts, /phrase \? keywords\.length \+ 1/, 'the whole phrase still wins outright');
  assert.match(ts, /excerptAround\(line, keywords\.length \? keywords : \[q\]\)/);
  assert.match(ts, /scored\.slice\(0, 14\)/);
});
