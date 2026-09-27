'use strict';
/**
 * Editing a message that is already queued (founder, 5 Sep 2026: "User should
 * be able to edit the message that's already queued").
 *
 * The dangerous half is not the edit, it is the RACE: the drain delivers the
 * queue head the moment the agent goes idle, and agents go idle all the time.
 * A person mid-rewrite must not have the old text typed out from under their
 * cursor. So an open editor sets a transient `editing` hold on the message,
 * the drain defers an editing head, and the hold is released on save, cancel
 * and composer unmount — and STRIPPED from persistence, so a renderer that
 * dies mid-edit can never leave a permanent hold starving the queue.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const store = read('src/renderer/src/store/store.ts');
const hive = read('src/renderer/src/hooks/useHive.ts');
const composer = read('src/renderer/src/components/pro/Composer.tsx');

test('the store rewrites a queued message in place, dropping stale delivery baggage', () => {
  assert.match(store, /updateQueuedMessage: \(agentId: string, messageId: string, text: string\) => void;/);
  // Rebuilt, not spread: the edited text is THE message, so the original's
  // instruction/precondition/compactUsed (and the editing hold) must not ride
  // along — what the person sees is exactly what is typed into the PTY.
  const impl = store.slice(store.indexOf('updateQueuedMessage: (agentId, messageId, text) =>'));
  const body = impl.slice(0, impl.indexOf('setQueuedMessageEditing:'));
  assert.match(body, /const edited: QueuedMessage = \{\s*\n\s*id: target\.id,\s*\n\s*text,\s*\n\s*ts: target\.ts,/);
  // Property syntax, not the bare word: the implementation's own comment names
  // these fields while explaining why they are dropped, and a bare-word guard
  // is disarmed by exactly that comment (same class as d2401355).
  assert.ok(!/\binstruction\s*:/.test(body), 'a stale instruction must not survive the edit');
  assert.ok(!/\bprecondition\s*:/.test(body), 'a stale precondition must not survive the edit');
  assert.ok(!/\bcompactUsed\s*:/.test(body), 'a stale compact latch value must not survive the edit');
  assert.match(body, /persistQueues\(messageQueues\);/, 'the edit is durable');
});

test('the editing hold exists, is transient, and never reaches disk', () => {
  assert.match(store, /editing\?: boolean;/, 'QueuedMessage carries the hold');
  assert.match(store, /setQueuedMessageEditing: \(agentId: string, messageId: string, editing: boolean\) => void;/);
  // persistQueues strips it: persisted, it would outlive the renderer that
  // held it and block the queue head forever on the next launch.
  assert.match(store, /slim\[id\] = q\.map\(\(\{ editing: _editing, \.\.\.m \}\) => m\);/);
});

test('the drain defers a head that is open in the editor', () => {
  assert.match(hive, /if \(next\.editing\) return \{ sent: false \};/,
    'the queue head must not be typed while a person is rewriting it');
});

test('the composer opens one editor at a time and always releases the hold', () => {
  // Opening a row sets the hold; opening another releases the first.
  assert.match(composer, /if \(editId && editId !== m\.id\) setQueuedMessageEditing\(agent\.id, editId, false\);/);
  assert.match(composer, /setQueuedMessageEditing\(agent\.id, m\.id, true\);/);
  // Save goes through updateQueuedMessage (which releases the hold itself);
  // cancel and an empty save release it explicitly.
  assert.match(composer, /if \(save && editText\.trim\(\)\) updateQueuedMessage\(agent\.id, editId, editText\);\s*\n\s*else setQueuedMessageEditing\(agent\.id, editId, false\);/);
  // Unmount mid-edit (agent switch) must not leave the hold behind.
  assert.match(composer, /useEffect\(\(\) => \(\) => \{\s*\n\s*const held = editRef\.current;\s*\n\s*if \(held\) useStore\.getState\(\)\.setQueuedMessageEditing\(held\.agentId, held\.id, false\);\s*\n\s*\}, \[\]\);/);
  // A row removed underneath the editor drops the editor instead of orphaning it.
  assert.match(composer, /if \(editId && !queue\.some\(\(m\) => m\.id === editId\)\) setEditId\(null\);/);
});

test('the editor is a real editor: Enter saves, Escape cancels, empty cannot save', () => {
  assert.match(composer, /if \(e\.key === 'Enter' && !e\.shiftKey && !e\.nativeEvent\.isComposing\) \{ e\.preventDefault\(\); endEdit\(true\); \}/);
  assert.match(composer, /if \(e\.key === 'Escape'\) \{ e\.preventDefault\(\); endEdit\(false\); \}/);
  assert.match(composer, /disabled=\{!editText\.trim\(\)\}/, 'saving an emptied message would vanish it silently');
});

test('the edit copy exists in all three locales and keeps the dash rule', () => {
  for (const loc of ['en', 'zh-CN', 'ar']) {
    const json = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    for (const key of ['edit', 'editSave', 'editCancel', 'editAria']) {
      const s = json.pro && json.pro.room && json.pro.room[key];
      assert.ok(typeof s === 'string' && s.length > 0, `${loc} is missing pro.room.${key}`);
      assert.ok(!/[–—]| - /.test(s), `${loc} pro.room.${key} breaks the dash rule`);
    }
  }
});
