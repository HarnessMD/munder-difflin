'use strict';
/**
 * Drop-to-attach on the PRO composer, twice founder-driven:
 *
 *   item 6 (3 Sep 2026)  — dragging a screenshot did nothing: no handlers at
 *                          all, so Chromium never allowed the drop.
 *   5 Sep 2026           — still dead for his drag source, and the thin border
 *                          was invisible as feedback. The element-scoped
 *                          handlers were REPLACED by window-level detection:
 *                          the moment an external drag that could carry files
 *                          is anywhere over the window, a full-size drop zone
 *                          overlays the composer (queue panel AND input), and
 *                          dropping on it attaches. The gate widened from
 *                          'Files' to 'Files' OR 'text/uri-list', because some
 *                          sources only promise URLs during dragover.
 *
 * Two halves under test:
 *   1. the pure decisions (src/shared/dropAttachments.ts) — which drags can
 *      attach, which dropped files become new chips, and the uri-list
 *      fallback for drops that carried no File objects;
 *   2. the wiring (pro/Composer.tsx) — window listeners, the overlay, and one
 *      shared addFiles door so a dropped file joins the same pipeline as the
 *      paperclip picker.
 */
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');

const { isFileDrag, isAttachableDrag, collectDroppedAttachments, pathsFromUriList } =
  loadTs('src/shared/dropAttachments.ts');

/* ---- the pure decisions --------------------------------------------------- */

test('isFileDrag accepts only drags that carry OS files', () => {
  assert.equal(isFileDrag(['Files']), true);
  assert.equal(isFileDrag(['text/uri-list', 'Files']), true, 'Finder drags carry both');
  // Internal HTML5 drags (task cards, agent chips) must never light the drop state.
  assert.equal(isFileDrag(['text/plain']), false);
  assert.equal(isFileDrag([]), false);
  assert.equal(isFileDrag(null), false);
  assert.equal(isFileDrag(undefined), false);
  // dataTransfer.types is array-like, not always a real Array, in Chromium.
  const domStringListish = { 0: 'Files', length: 1 };
  assert.equal(isFileDrag(domStringListish), true);
});

test('isAttachableDrag widens to uri-list drags, still refuses internal drags', () => {
  assert.equal(isAttachableDrag(['Files']), true);
  // The 5 Sep 2026 case: a source that only promises URLs during dragover.
  assert.equal(isAttachableDrag(['text/uri-list']), true);
  assert.equal(isAttachableDrag(['text/uri-list', 'text/html']), true);
  // A task card or agent chip being dragged sets neither.
  assert.equal(isAttachableDrag(['text/plain']), false);
  assert.equal(isAttachableDrag([]), false);
  assert.equal(isAttachableDrag(null), false);
  assert.equal(isAttachableDrag(undefined), false);
});

test('collectDroppedAttachments keeps resolvable, unattached paths only', () => {
  const shot = { path: '/tmp/shot.png', name: 'shot.png' };
  const doc = { path: '/tmp/spec.pdf', name: 'spec.pdf' };
  assert.deepEqual(collectDroppedAttachments([shot, doc], []), [shot, doc]);
  // A file whose path could not be resolved is useless to the agent — the
  // message body carries paths the agent Reads.
  assert.deepEqual(collectDroppedAttachments([{ path: '', name: 'ghost.png' }, shot], []), [shot]);
  // Already attached → no second chip; same rule the paperclip picker applies.
  assert.deepEqual(collectDroppedAttachments([shot, doc], [shot.path]), [doc]);
  // The same file twice in one gesture is still one chip.
  assert.deepEqual(collectDroppedAttachments([shot, shot], []), [shot]);
  assert.deepEqual(collectDroppedAttachments([], ['/a']), []);
});

test('pathsFromUriList resolves file:// lines and nothing else', () => {
  assert.deepEqual(
    pathsFromUriList('file:///Users/x/Desktop/Screenshot%202026-09-05.png'),
    [{ path: '/Users/x/Desktop/Screenshot 2026-09-05.png', name: 'Screenshot 2026-09-05.png' }]
  );
  // Comment lines (RFC 2483) and remote URLs are skipped: a remote image is
  // not a path the agent can Read.
  assert.deepEqual(
    pathsFromUriList('# comment\r\nhttps://example.com/cat.png\r\nfile:///tmp/a.png'),
    [{ path: '/tmp/a.png', name: 'a.png' }]
  );
  assert.deepEqual(pathsFromUriList(''), []);
  assert.deepEqual(pathsFromUriList(null), []);
  assert.deepEqual(pathsFromUriList(undefined), []);
  // One malformed line must not eat the rest.
  assert.deepEqual(pathsFromUriList('file://%zz\nfile:///tmp/b.txt'), [{ path: '/tmp/b.txt', name: 'b.txt' }]);
});

/* ---- the wiring ----------------------------------------------------------- */

const zone = read('src/renderer/src/components/pro/dropZone.tsx');

test('the drop lane is ONE module, and every PRO composer mounts it', () => {
  // 5 Sep 2026: the room composer had the lane, the god terminal composer and
  // the Agents grid prompt bar had nothing, so dragging onto Michael's screen
  // did nothing at all. The lane now lives in dropZone.tsx and each composer
  // mounts <DropZone onFiles={addFiles} /> inside a position:relative root.
  for (const f of [
    'src/renderer/src/components/pro/Composer.tsx',
    'src/renderer/src/components/pro/AgentsScreen.tsx'
  ]) {
    const src = read(f);
    assert.match(src, /<DropZone onFiles=\{addFiles\} \/>/, `${f} must mount the shared drop zone`);
    assert.match(src, /collectDroppedAttachments\(incoming, prev\.map\(\(p\) => p\.path\)\)/,
      `${f} must dedupe through the shared pure function`);
    // The paperclip goes through the same door, so both entrances body alike.
    assert.match(src, /if \(res\.ok\) addFiles\(res\.files\);/, `${f}'s paperclip must use the shared door`);
  }
  // 0.5.2: the orchestrator's terminal tab has no composer of its own any
  // more. It mounts pro/Composer, so the lane reaches it through that one.
  const god = read('src/renderer/src/components/pro/god/TerminalTab.tsx');
  assert.match(god, /<Composer agent=\{agent\} \/>/);
  assert.doesNotMatch(god, /<DropZone/, 'no second lane on the god tab');
});

test('file drags are detected at the WINDOW, not by element hit-testing', () => {
  assert.match(zone, /window\.addEventListener\('dragenter', enter\);/);
  assert.match(zone, /window\.addEventListener\('dragover', over\);/);
  assert.match(zone, /window\.addEventListener\('dragleave', leave\);/);
  // Capture phase, so a child that stops propagation (the terminal pane types
  // paths for itself) still clears the overlay.
  assert.match(zone, /window\.addEventListener\('drop', drop, true\);/);
  for (const line of [
    /window\.removeEventListener\('dragenter', enter\);/,
    /window\.removeEventListener\('dragover', over\);/,
    /window\.removeEventListener\('dragleave', leave\);/,
    /window\.removeEventListener\('drop', drop, true\);/
  ]) assert.match(zone, line);
  // Gated on the widened pure check; a refusal of a non-empty type list logs
  // the types, because they are the whole diagnosis.
  assert.match(zone, /if \(!isAttachableDrag\(e\.dataTransfer\?\.types\)\) \{/);
  assert.match(zone, /console\.debug\('\[composer\] drag refused, types:', Array\.from\(e\.dataTransfer\.types\)\);/);
  // window dragover preventDefaults for attachable drags, which is what makes
  // the WHOLE window a legal drop target.
  assert.match(zone, /const over = \(e: globalThis\.DragEvent\) => \{\s*\n\s*if \(!isAttachableDrag\(e\.dataTransfer\?\.types\)\) return;\s*\n\s*e\.preventDefault\(\);/);
  // The capture-phase clear runs in a MICROTASK and never preventDefaults: a
  // synchronous clear could unmount the overlay while the drop event is still
  // dispatching (its own onDrop then never fires), and defaultPrevented is the
  // claim signal the bubble catch-all reads.
  assert.match(zone, /const drop = \(\) => \{\s*\n\s*queueMicrotask\(\(\) => \{ depth = 0; setActive\(false\); \}\);\s*\n\s*\};/);
});

test('a drop released ANYWHERE lands in the lit composer unless someone else claimed it', () => {
  // 5 Sep 2026, why Classic "worked" while PRO seemed dead: the person
  // releases the mouse wherever the cursor is, not where the zone glows.
  // Bubble phase = after every claimant; defaultPrevented = the claim (the
  // terminal's path-typing handler sets it, and so does the overlay).
  assert.match(zone, /const catchAll = \(e: globalThis\.DragEvent\) => \{\s*\n\s*if \(e\.defaultPrevented\) return;\s*\n\s*e\.preventDefault\(\);\s*\n\s*resolveDrop\(e\.dataTransfer, onFilesRef\.current, tRef\.current\);/);
  assert.match(zone, /window\.addEventListener\('drop', catchAll\);/);
  assert.match(zone, /window\.removeEventListener\('drop', catchAll\);/);
  // The terminal's claim is real: its drop handler preventDefaults when it
  // takes files, so a drop on the terminal still types the path there and is
  // never double-attached here.
  const term = read('src/renderer/src/components/PtyTerminalView.tsx');
  assert.match(term, /if \(files\.length === 0\) return;[^\n]*\n\s*e\.preventDefault\(\);/);
});

test('the zone overlays the WHOLE composer and its dragover allows the drop', () => {
  assert.match(zone, /if \(!active\) return null;/);
  assert.match(zone, /onDragOver=\{\(e\) => \{ e\.preventDefault\(\); e\.dataTransfer\.dropEffect = 'copy'; \}\}\s*\n\s*onDrop=\{onDrop\}/);
  assert.match(zone, /position: 'absolute', inset: 6, zIndex: 5/);
  assert.match(zone, /t\('queueComposer\.dropToAttach'\)/, 'the shared drop copy');
});

test('the resolution chain is per-file, with the bytes and uri-list fallbacks', () => {
  // The chain lives in resolveDrop, shared by the overlay and the catch-all.
  assert.match(zone, /function resolveDrop\(/);
  // Try-wrapped: the bridge call can THROW for a promise-backed File, and an
  // uncaught throw killed the whole drop silently.
  assert.match(zone, /try \{ path = window\.cth\.pathForFile\(f\); \} catch \{/);
  assert.match(zone, /if \(path\) \{ atts\.push\(\{ path, name: f\.name \}\); continue; \}/);
  assert.match(zone, /const bytes = new Uint8Array\(await f\.arrayBuffer\(\)\);/);
  // Defensive read (same rule as SoloProBridge): a renderer hot reloaded past
  // an old preload finds a hole and reports it, instead of crashing the drop.
  assert.match(zone, /typeof window\.cth\.saveDroppedFile === 'function'\s*\n\s*\? await window\.cth\.saveDroppedFile\(f\.name, bytes\)\s*\n\s*: \{ ok: false as const, error: 'saveDroppedFile door missing: restart the dev app' \};/);
  assert.match(zone, /if \(saved\.ok\) atts\.push\(saved\.file\);/);
  // Some sources populate items but not files: second door, same event.
  assert.match(zone, /const f = it\.getAsFile\(\);\s*\n\s*if \(f\) fileList\.push\(f\);/);
  // dataTransfer is only readable during the event: uri-list captured before
  // any await.
  assert.match(zone, /const uriFallback = pathsFromUriList\(dt\?\.getData\('text\/uri-list'\)\);/);
  assert.match(zone, /const final = atts\.length \? atts : uriFallback;/);
  // Nothing attachable is SAID, on screen and in the console.
  assert.match(zone, /console\.warn\('\[composer\] drop carried nothing attachable'\);/);
  assert.match(zone, /proToast\(t\('pro\.room\.dropNone'\), \{ tone: 'bad' \}\);/);
  for (const loc of ['en', 'zh-CN', 'ar']) {
    const json = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    const str = json.pro && json.pro.room && json.pro.room.dropNone;
    assert.ok(typeof str === 'string' && str.length > 0, `${loc} is missing pro.room.dropNone`);
    assert.ok(!/[\u2013\u2014]| - /.test(str), `${loc} dropNone copy breaks the dash rule`);
  }
});

test('the screenshot-bubble caveat is written down honestly, as upstream weather', () => {
  // The bubble drags a FILE PROMISE; whether Chromium delivers it is an
  // upstream question we do not control (and the founder reports Classic
  // accepts his drag, so "impossible" was too strong). The header says the
  // chain attaches whatever arrives and the toast covers the rest.
  assert.match(zone, /crbug\.com\/978484/);
  assert.match(zone, /screenshot bubble/i);
  assert.ok(!/CANNOT WORK/.test(zone), 'no unproven impossibility claims in the header');
});

test('the byte-persist door in main refuses junk and owns its copies', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /ipcMain\.handle\('drop:saveFile', async \(_evt, name: unknown, bytes: unknown\) => \{/);
  assert.match(main, /if \(!\(bytes instanceof Uint8Array\) \|\| bytes\.byteLength === 0\)/);
  assert.match(main, /bytes\.byteLength > DROP_SAVE_MAX_BYTES/);
  assert.match(main, /raw\.replace\(\/\[\/\\\\\]\/g, ''\)\.replace\(\/\[\\u0000-\\u001f\]\/g, ''\)\.slice\(-80\)/);
  assert.match(main, /join\(app\.getPath\('temp'\), 'cth-drops'\)/, 'the copy is app-owned, not screencaptureui staging');
  const preload = read('src/preload/index.ts');
  assert.match(preload, /saveDroppedFile: \(name: string, bytes: Uint8Array\)/);
  assert.match(preload, /ipcRenderer\.invoke\('drop:saveFile', name, bytes\)/);
});

test('attachment badges clip the file name, full path on hover, in every composer', () => {
  for (const f of [
    'src/renderer/src/components/pro/Composer.tsx',
    'src/renderer/src/components/pro/AgentsScreen.tsx'
  ]) {
    const src = read(f);
    assert.match(src, /maxWidth: 110, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' \}\}>\{f\.name\}/,
      `${f} must clip the badge name`);
    assert.match(src, /title=\{f\.path\}/, `${f} must show the full path on hover`);
  }
});

test('the drop copy exists in all three locales', () => {
  for (const loc of ['en', 'zh-CN', 'ar']) {
    const json = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    const str = json.queueComposer && json.queueComposer.dropToAttach;
    assert.ok(typeof str === 'string' && str.length > 0, `${loc} is missing queueComposer.dropToAttach`);
    assert.ok(!/[\u2013\u2014]| - /.test(str), `${loc} drop copy breaks the dash rule`);
  }
});
