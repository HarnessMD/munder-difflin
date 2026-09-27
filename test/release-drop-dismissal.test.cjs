/**
 * The release drop stays closed once it is closed.
 *
 * Founder, 7 Sep 2026: "the release drop keeps appearing again and again even
 * when we are closing it." Main keeps the last update status for the life of
 * the process; both offer surfaces (Classic's UpdateToast, PRO's UpdateOffer)
 * pull it back out on every mount and take every re-push, and closing the drop
 * only cleared their local copy. So any remount of the shell, or any re-push,
 * opened the same page again.
 *
 * The fix is a memory of closed pages (releaseDropSeen.ts), keyed by state and
 * version, shared by both surfaces, mirrored into localStorage. These tests
 * cover the pure pieces directly and pin the two surfaces to using them.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { releaseDropKey } = loadTs('src/shared/updateState.ts');
const { createDropSeen, offerUnlessSeen } = loadTs('src/renderer/src/components/releaseDropSeen.ts');

const DROP = '<!-- drop -->\n<section class="hero"><h1>New</h1></section>\n<!-- /drop -->';

function fakeStorage(initial) {
  const map = new Map(initial ? Object.entries(initial) : []);
  return {
    map,
    getItem: (k) => (map.has(k) ? map.get(k) : null),
    setItem: (k, v) => { map.set(k, String(v)); }
  };
}

test('a page is its state and version; states without a version have no page', () => {
  assert.equal(releaseDropKey({ state: 'just-updated', version: '0.4.11', notes: DROP }), 'just-updated@0.4.11');
  assert.equal(releaseDropKey({ state: 'available-manual', version: '0.5.0', url: 'x' }), 'available-manual@0.5.0');
  assert.notEqual(
    releaseDropKey({ state: 'available', version: '0.5.0' }),
    releaseDropKey({ state: 'downloaded', version: '0.5.0' }),
    'the same release reaching a later state is a new page'
  );
  assert.equal(releaseDropKey({ state: 'idle' }), null);
  assert.equal(releaseDropKey({ state: 'checking' }), null);
  assert.equal(releaseDropKey(null), null);
});

test('closing is remembered in memory, and only for that page', () => {
  const seen = createDropSeen(null);
  assert.equal(seen.isSeen('just-updated@0.4.11'), false);
  seen.markSeen('just-updated@0.4.11');
  assert.equal(seen.isSeen('just-updated@0.4.11'), true);
  assert.equal(seen.isSeen('just-updated@0.5.0'), false, 'a new release is a new page');
  assert.equal(seen.isSeen('downloaded@0.4.11'), false, 'a later state of the same release is a new page');
  assert.equal(seen.isSeen(null), false, 'no page is never seen');
  seen.markSeen(null);
  assert.equal(seen.isSeen(null), false, 'marking no page records nothing');
});

test('closing survives a relaunch through localStorage under the cth. prefix', () => {
  const storage = fakeStorage();
  createDropSeen(storage).markSeen('just-updated@0.4.11');
  const key = [...storage.map.keys()][0];
  assert.equal(key, 'cth.releaseDropSeen', 'the cth. prefix is what Settings reset clears');
  const later = createDropSeen(storage);
  assert.equal(later.isSeen('just-updated@0.4.11'), true, 'a fresh window reads the record back');
  assert.equal(later.isSeen('just-updated@0.5.0'), false);
});

test('the record is bounded and keeps the newest pages', () => {
  const storage = fakeStorage();
  const seen = createDropSeen(storage);
  for (let i = 0; i < 12; i++) seen.markSeen(`just-updated@0.4.${i}`);
  const stored = JSON.parse(storage.getItem('cth.releaseDropSeen'));
  assert.equal(stored.length, 8);
  assert.equal(seen.isSeen('just-updated@0.4.11'), true, 'the newest stays');
  assert.equal(seen.isSeen('just-updated@0.4.0'), false, 'the oldest is forgotten');
  seen.markSeen('just-updated@0.4.11');
  assert.equal(JSON.parse(storage.getItem('cth.releaseDropSeen')).length, 8, 'marking twice does not duplicate');
});

test('a broken localStorage degrades to memory, never to reopening on every remount', () => {
  const throwing = { getItem: () => { throw new Error('denied'); }, setItem: () => { throw new Error('denied'); } };
  const seen = createDropSeen(throwing);
  seen.markSeen('just-updated@0.4.11');
  assert.equal(seen.isSeen('just-updated@0.4.11'), true, 'this window still remembers');
  const garbage = createDropSeen(fakeStorage({ 'cth.releaseDropSeen': '{not json' }));
  assert.equal(garbage.isSeen('just-updated@0.4.11'), false, 'an unreadable record is an empty one');
  const wrongShape = createDropSeen(fakeStorage({ 'cth.releaseDropSeen': JSON.stringify({ a: 1 }) }));
  assert.equal(wrongShape.isSeen('a'), false);
});

test('the offer skips a closed drop, and only a drop', () => {
  const seen = createDropSeen(null);
  const dropped = { state: 'just-updated', version: '0.4.11', notes: DROP };
  // A different page from `later` below on purpose: marking THIS one seen must
  // not be what keeps a later state of the same release closed.
  const plain = { state: 'available-manual', version: '0.4.11', url: 'x', notes: '- one fix\n- another' };

  assert.equal(offerUnlessSeen(dropped, seen), dropped, 'unseen: offered');
  seen.markSeen(releaseDropKey(dropped));
  assert.equal(offerUnlessSeen(dropped, seen), null, 'closed: the remount pull and the re-push both offer nothing');

  seen.markSeen(releaseDropKey(plain));
  assert.equal(offerUnlessSeen(plain, seen), plain, 'a release with no authored block keeps the corner card rule');
  assert.equal(offerUnlessSeen(null, seen), null);

  const later = { state: 'downloaded', version: '0.4.11', notes: DROP };
  assert.equal(offerUnlessSeen(later, seen), later, 'the same release reaching a later state is a new page');
  const next = { state: 'just-updated', version: '0.5.0', notes: DROP };
  assert.equal(offerUnlessSeen(next, seen), next, 'a new release is a new page');
});

test('both surfaces ask the memory before offering and write it on close; the explicit door does not', () => {
  const read = (p) => fs.readFileSync(path.resolve(__dirname, '..', p), 'utf8');
  const pro = read('src/renderer/src/components/pro/ProTransients.tsx');
  const classic = read('src/renderer/src/components/UpdateToast.tsx');

  // PRO: the one offer closure serves the push and the mount pull.
  assert.match(pro, /const offer = \(s: UpdateStatus\) => \{ const next = offerUnlessSeen\(offerable\(s\)\); if \(next\) setStatus\(next\); \};/);
  assert.match(pro, /api\.updateCurrent\?\.\(\)\.then\(offer\)/, 'the mount pull still goes through the same closure');
  assert.match(pro, /onDismiss=\{\(\) => \{ dropSeen\.markSeen\(releaseDropKey\(status\)\); setStatus\(null\); \}\}/);
  // Settings' "what's new" re-opens a closed page on purpose: no seen check there.
  assert.match(pro, /if \(next && extractDropHtml\(next\.notes\)\) \{ setStatus\(next\); return; \}/);

  // Classic: the push, the mount pull, the close.
  assert.match(classic, /const t = offerUnlessSeen\(toastable\(next\)\);/);
  assert.match(classic, /const t = offerUnlessSeen\(toastable\(cur\)\);/);
  assert.match(classic, /onDismiss=\{\(\) => \{ dropSeen\.markSeen\(releaseDropKey\(status\)\); setStatus\(null\); \}\}/);
  // The explicit door in Classic reads the raw status too.
  assert.match(classic, /const t = toastable\(cur\);\s*\n\s*if \(t\) \{ setStatus\(t\); return; \}/);

  // One shared record, not one per surface.
  const seenSrc = read('src/renderer/src/components/releaseDropSeen.ts');
  assert.match(seenSrc, /export const dropSeen: DropSeen = createDropSeen\(windowStorage\(\)\);/);
  assert.match(seenSrc, /const LS_KEY = 'cth\.releaseDropSeen';/);
});
