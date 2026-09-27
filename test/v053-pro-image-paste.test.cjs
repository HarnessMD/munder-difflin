'use strict';

/**
 * 0.5.3, bug 8 (Jinbo, 14 Sep 2026): pasting an image in the professional skin
 * attached nothing. The classic composer had a paste handler and the two
 * professional message boxes had none. One rule and one handler now serve all
 * three, so they cannot drift apart again.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { pasteKind } = loadTs('src/shared/pasteAttachments.ts');
const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const C = 'src/renderer/src/components';

test('a paste is an image, files, or text, and image wins', () => {
  assert.equal(pasteKind([{ kind: 'file', type: 'image/png' }], 1), 'image', 'a screenshot, the shape Chrome really sends');
  assert.equal(pasteKind([{ kind: 'string', type: 'text/html' }, { kind: 'file', type: 'image/jpeg' }], 1), 'image', 'Copy image from a web page brings html along');
  assert.equal(pasteKind([{ kind: 'file', type: 'application/pdf' }], 1), 'files');
  assert.equal(pasteKind([{ kind: 'file', type: '' }], 2), 'files', 'files copied in Finder often have no type');
  assert.equal(pasteKind([{ kind: 'string', type: 'text/plain' }], 0), 'text');
  assert.equal(pasteKind([{ kind: 'string', type: 'image/png' }], 0), 'text', 'a STRING that calls itself an image is not picture data');
  assert.equal(pasteKind([], 0), 'text');
});

test('the handler stops the browser paste before its first await, and only when it takes something', () => {
  const src = read(`${C}/pasteAttachments.ts`);
  const image = src.slice(src.indexOf("if (kind === 'image')"), src.indexOf('const atts ='));
  assert.ok(image.indexOf('e.preventDefault();') < image.indexOf('await window.cth.saveClipboardImage()'), 'after an await the browser has already pasted');
  assert.match(src, /if \(kind === 'text'\) return \[\];/, 'plain text is left to the browser');
  assert.match(src, /if \(atts\.length\) e\.preventDefault\(\);/);
});

test('both professional message boxes and the classic one paste through the one handler', () => {
  const room = read(`${C}/pro/Composer.tsx`);
  const agents = read(`${C}/pro/AgentsScreen.tsx`);
  const classic = read(`${C}/MessageQueueComposer.tsx`);
  const wired = /onPaste=\{\(e\) => \{ void attachmentsFromPaste\(e\)\.then\(\(a\) => \{ if \(a\.length\) addFiles\(a\); \}\); \}\}/;
  assert.match(room, wired, 'the agent screen composer');
  assert.match(agents, wired, 'the Agents screen composer');
  assert.match(classic, /const atts = await attachmentsFromPaste\(e\);\s+if \(atts\.length\) addAttachments\(atts\);/);
  for (const [name, src] of [['Composer', room], ['AgentsScreen', agents], ['MessageQueueComposer', classic]]) {
    assert.doesNotMatch(src, /saveClipboardImage/, `${name} keeps no paste logic of its own`);
  }
});

test('a pasted file goes through the same door as a dropped one, so it is deduped and bodied alike', () => {
  const room = read(`${C}/pro/Composer.tsx`);
  assert.match(room, /const addFiles = \(incoming: \{ path: string; name: string \}\[\]\) =>\s+setFiles\(\(prev\) => \{\s+const fresh = collectDroppedAttachments\(incoming, prev\.map\(\(p\) => p\.path\)\);/);
  assert.match(room, /<DropZone onFiles=\{addFiles\} \/>/);
});
