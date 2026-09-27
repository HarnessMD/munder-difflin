'use strict';

/* 0.5.3 bug 22, the agent restart half.
 *
 * "Restart & Continue" (CommandCenterPanel.restartWithModel with resume) kills
 * the process and spawns a replacement under the same pty id. On the resume
 * path it also throws the pooled xterm away and creates a fresh one, so that a
 * terminal with corrupt renderer state does not survive the restart.
 *
 * It did that BEFORE spawnPty, which can still fail, and before the throw that
 * follows a refused resume. Every one of those failures then landed on a pane
 * that had already been emptied: scrollback gone for good (node-pty keeps
 * none), the label stuck on "recreating terminal…", nothing to scroll or click.
 * Public PR #575 (TTAWDTT) moves the recreation to after the spawn is accepted.
 *
 * The .tsx is never executed by the suite, so the ORDER is pinned as source
 * text: inside restartWithModel, every disposal of the terminal must come after
 * the spawn call and after the refused resume throw. On de9e70aa the disposal
 * sits ~40 lines before the spawn, and this is red. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const src = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/src/components/CommandCenterPanel.tsx'), 'utf8');

function restartBody() {
  const start = src.indexOf('const restartWithModel = async');
  assert.ok(start >= 0, 'restartWithModel not found');
  // The function ends where the next top level hook or handler of the component begins.
  const end = src.indexOf('\n  };\n', start);
  assert.ok(end > start, 'restartWithModel has no end');
  return src.slice(start, end);
}

test('the resume terminal is recreated only after spawnPty accepted the replacement', () => {
  const body = restartBody();
  const spawnAt = body.indexOf('window.cth.spawnPty(');
  const refusedAt = body.indexOf('Resume was refused');
  assert.ok(spawnAt >= 0 && refusedAt > spawnAt, 'expected the spawn and the refused resume throw, in that order');
  const disposals = [...body.matchAll(/disposeTerminal\(a\.ptyId\)/g)].map((m) => m.index);
  assert.ok(disposals.length >= 1, 'the resume path no longer recreates the terminal at all');
  for (const at of disposals) {
    assert.ok(at > refusedAt, `disposeTerminal runs ${refusedAt - at} chars BEFORE the refused resume throw: a failed restart empties the pane`);
  }
  // And the generation bump that remounts the card comes with it, not earlier.
  const bumpAt = body.indexOf('terminalGeneration: (a.terminalGeneration ?? 0) + 1');
  assert.ok(bumpAt > refusedAt, 'the terminal card is remounted before the spawn is known to have worked');
});

test('a fresh (non resume) restart still resets the terminal in place', () => {
  const body = restartBody();
  assert.match(body, /if \(!resume\) \{\s*resetTerminal\(a\.ptyId\);/);
});
