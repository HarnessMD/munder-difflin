/**
 * 0.5.3, F16: with a local recogniser on the machine, the composer mic, the
 * hold to talk gesture and the recorder open without a Groq key. Before, all
 * four doors read `hasGroqKey` alone, so local dictation could never be
 * reached from the composer. Source pins, red on the base.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

test('the store carries canDictate and App refreshes it on load and on every config change', () => {
  const store = read('src/renderer/src/store/store.ts');
  assert.match(store, /canDictate: boolean;/);
  assert.match(store, /setCanDictate: \(can\) => set\(\{ canDictate: can \}\)/);
  const app = read('src/renderer/src/App.tsx');
  assert.match(app, /async function refreshCanDictate\(\)/);
  assert.match(app, /st\.chosen\.dictation !== null && st\.chosen\.dictation !== 'groq'/, 'Groq alone still needs the key');
  assert.ok((app.match(/void refreshCanDictate\(\);/g) || []).length >= 2, 'on load and on config change');
});

test('every door opens on a key OR a local engine: recorder, hold gesture, both composers', () => {
  assert.match(read('src/renderer/src/freeflow/recorder.ts'), /!useStore\.getState\(\)\.hasGroqKey && !useStore\.getState\(\)\.canDictate/);
  assert.match(read('src/renderer/src/freeflow/holdOption.ts'), /\(!st\.hasGroqKey && !st\.canDictate\)/);
  assert.match(read('src/renderer/src/components/MessageQueueComposer.tsx'), /hasGroqKey=\{hasGroqKey \|\| canDictate\}/);
  assert.match(read('src/renderer/src/components/pro/Composer.tsx'), /const noKey = !hasGroqKey && !canDictate;/);
  assert.doesNotMatch(read('src/renderer/src/freeflow/recorder.ts'), /error: 'Groq API key not set'/, 'the refusal names the engine');
});
