'use strict';
/**
 * 0.5.3, the status words ruling (Pam and Kevin, 23 Sep 2026, after the F25
 * review of PR #36).
 *
 * THE STORE IS THE SOURCE OF TRUTH FOR WHAT THE KEYS MEAN, and the words
 * follow the meaning, never the key name:
 *   src/renderer/src/hooks/usePtyParser.ts: the ORCHESTRATOR at a prompt for
 *   the human gets status 'blocked' ("waiting on you"); a SUB-AGENT at a
 *   prompt gets 'waiting' ("waiting on god", parked on the orchestrator).
 *   src/renderer/src/hooks/useHive.ts does the same for hook questions.
 * So 'blocked' says Needs you and wears the warm tone; 'waiting' says Waiting
 * and is calm like idle. Pro had these two inverted; Classic (badge.*) never
 * did. This pins all three locales and Pro's tone map so nobody flips it back.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

test('the store: the orchestrator asking the human is blocked, a worker parked on the orchestrator is waiting', () => {
  const parser = read('src/renderer/src/hooks/usePtyParser.ts');
  const god = parser.indexOf("status: 'blocked'");
  const sub = parser.indexOf("status: 'waiting'");
  assert.ok(god > 0 && sub > god, 'the parser sets blocked (orchestrator) before waiting (sub-agent)');
  assert.match(parser.slice(god - 400, god), /if \(isGod\)/, "'blocked' is the orchestrator's branch");
  assert.match(parser.slice(sub - 200, sub), /\} else \{/, "'waiting' is everyone else's");
  const hive = read('src/renderer/src/hooks/useHive.ts');
  assert.ok(hive.includes("status: self.isGod ? 'blocked' : 'waiting'"), 'hook questions split the same way');
});

test('Pro says Needs you for blocked and Waiting for waiting, in every language', () => {
  const expect = { en: ['Needs you', 'Waiting'], 'zh-CN': ['需要你', '等待中'], ar: ['بحاجة إليك', 'ينتظر'] };
  for (const [loc, [needsYou, waiting]] of Object.entries(expect)) {
    const s = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`)).pro.status;
    assert.equal(s.blocked, needsYou, `${loc}: blocked is the orchestrator waiting on you`);
    assert.equal(s.waiting, waiting, `${loc}: waiting is a worker parked on the orchestrator`);
    assert.notEqual(s.waiting, needsYou, `${loc}: waiting never says Needs you`);
    // Classic's chip already followed the store; the two skins agree now.
    const badge = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`)).badge;
    assert.equal(badge.blocked.toLowerCase(), needsYou.toLowerCase(), `${loc}: Classic says the same for blocked`);
  }
});

test("Pro's chip and dot colours follow the meaning: blocked is warm, waiting is calm, pink is for failure", () => {
  const ui = read('src/renderer/src/components/pro/ui.tsx');
  const tone = ui.slice(ui.indexOf('export const STATUS_TONE'), ui.indexOf('};', ui.indexOf('export const STATUS_TONE')));
  assert.match(tone, /\bblocked: 'warn'/, 'Needs you wears the warm tone');
  assert.match(tone, /\bwaiting: 'muted'/, 'a parked worker is calm');
  assert.doesNotMatch(tone, /\b(blocked|waiting): 'bad'/, 'neither is painted as a failure');
  assert.match(ui, /blocked: \{ background: 'var\(--cth-status-waiting\)' \}/, 'the Needs you dot is the warm token');
  assert.match(ui, /waiting: \{ background: 'var\(--cth-status-idle\)' \}/, 'the parked dot is the idle grey');
  assert.match(ui, /\.\.\.statusDotPaint\(status, size\), \.\.\.MEANING_PAINT\[status\]/, 'the meaning paint is applied after the shared rule');
});
