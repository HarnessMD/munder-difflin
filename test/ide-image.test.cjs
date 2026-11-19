'use strict';

/**
 * Images in the IDE.
 *
 * Opening a .png used to produce a tab that said "binary file (not displayable)"
 * — the text reader rejects anything containing a null byte, and it was the only
 * reader the renderer had. Images now travel as raw bytes over a separate,
 * root-confined, size-capped read and become a blob URL in the renderer.
 *
 * The three things worth pinning down are the ones that are silent when they
 * break: the extension→mime table (three call sites depend on agreeing about
 * it), the path-traversal guard on the new binary read, and the size cap that
 * keeps a huge file from being pulled into the renderer whole.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const {
  extensionOf, imageMimeForPath, isImagePath, isSvgPath, formatBytes,
  imageMimeForFileName, imageMimeForDiskPath, isImageDiskPath, isSvgDiskPath
} = loadTs('src/shared/imageTypes.ts');
const { readFileBinary } = loadTs('src/main/fs.ts');
const {
  resolveLocalImageRel, resolveLocalImageSource, resolveMdLinkRel, decodeHrefPath, resolveRel
} = loadTs('src/renderer/src/markdown/mdLinks.ts');
const { settleImageRead } = loadTs('src/renderer/src/hooks/useWorkspaceImage.ts');

// ─── extension → mime ───────────────────────────────────────────────────────

test('detects the image formats agents actually produce', () => {
  assert.equal(imageMimeForPath('shot.png'), 'image/png');
  assert.equal(imageMimeForPath('photo.jpg'), 'image/jpeg');
  assert.equal(imageMimeForPath('photo.jpeg'), 'image/jpeg');
  assert.equal(imageMimeForPath('anim.gif'), 'image/gif');
  assert.equal(imageMimeForPath('modern.webp'), 'image/webp');
  assert.equal(imageMimeForPath('icon.svg'), 'image/svg+xml');
  assert.equal(imageMimeForPath('old.bmp'), 'image/bmp');
  assert.equal(imageMimeForPath('fav.ico'), 'image/x-icon');
  assert.equal(imageMimeForPath('new.avif'), 'image/avif');
});

test('extension matching is case-insensitive', () => {
  // macOS screenshots and camera exports both ship upper-case extensions.
  assert.equal(imageMimeForPath('Screenshot.PNG'), 'image/png');
  assert.equal(imageMimeForPath('IMG_0001.JPG'), 'image/jpeg');
  assert.ok(isImagePath('/abs/path/A.WebP'));
});

test('non-images are not images', () => {
  for (const p of ['notes.md', 'index.ts', 'Makefile', 'archive.tar.gz', 'a.png.bak', '']) {
    assert.equal(imageMimeForPath(p), null, `${p} must not be treated as an image`);
    assert.equal(isImagePath(p), false);
  }
});

test('query strings and hashes do not hide the extension', () => {
  // Agent-written markdown carries cache-busters; treating `png?v=2` as the
  // extension would silently drop exactly the screenshots we want to render.
  assert.equal(extensionOf('shot.png?v=2'), 'png');
  assert.equal(extensionOf('shot.png#fig1'), 'png');
  assert.ok(isImagePath('./out/shot.png?v=2'));
});

test('a dotted DIRECTORY name cannot masquerade as an extension', () => {
  assert.equal(extensionOf('v1.2/report'), '');
  assert.equal(isImagePath('release-1.png/report'), false);
});

test('svg is flagged separately — it is the one image that is also source', () => {
  assert.ok(isSvgPath('logo.svg'));
  assert.ok(isSvgPath('a/b/LOGO.SVG'));
  assert.equal(isSvgPath('logo.png'), false);
});

test('Object.prototype keys are not image extensions', () => {
  // MIME_BY_EXT is a plain object literal, so an unguarded lookup of
  // `constructor` hands back Object itself — `x.constructor` became an "image",
  // and the mime the main process then stamped was a function that cannot cross
  // IPC. Lower-casing means these two are the reachable ones.
  for (const name of ['x.constructor', 'x.__proto__', 'x.hasownproperty']) {
    assert.equal(imageMimeForPath(name), null, `${name} via the URL API`);
    assert.equal(imageMimeForFileName(name), null, `${name} via the file-name API`);
    assert.equal(isImagePath(name), false);
    assert.equal(isImageDiskPath(name), false);
  }
});

test('DISK paths keep `#` and `?` as part of the file name', () => {
  // The URL API strips them as fragment/query; on disk they are just
  // characters. A screenshot called `QA#1.png`, or any image under a `notes#1/`
  // directory, must still open as an image in the IDE.
  assert.equal(imageMimeForFileName('QA#1.png'), 'image/png');
  assert.equal(imageMimeForFileName('cover.png?v=1'), null, 'its real extension is `png?v=1`');
  assert.ok(isImageDiskPath('docs/QA#1.png'));
  assert.ok(isImageDiskPath('notes#1/shot.png'));
  assert.ok(isSvgDiskPath('notes#1\\logo.svg'), 'Windows separators count too');
  assert.equal(isSvgDiskPath('notes#1/logo.png'), false);
  // A workspace that lives under a `#` directory: the WHOLE absolute path is
  // what the main process sees.
  assert.equal(imageMimeForDiskPath('C:\\Users\\me\\C#work\\docs\\logo.svg'), 'image/svg+xml');
  assert.equal(imageMimeForDiskPath('/home/me/C#work/docs/shot.PNG'), 'image/png');
  assert.equal(imageMimeForDiskPath('C:\\v1.2\\report'), null, 'a dotted directory is not an extension');
  assert.equal(imageMimeForDiskPath(''), null);
});

test('formatBytes reads like a status line', () => {
  assert.equal(formatBytes(0), '0 B');
  assert.equal(formatBytes(864), '864 B');
  assert.equal(formatBytes(1536), '1.5 KB');
  assert.equal(formatBytes(3 * 1024 * 1024), '3.0 MB');
  assert.equal(formatBytes(-1), '—');
});

// ─── markdown <img src> resolution ──────────────────────────────────────────

test('local markdown images resolve against the document directory', () => {
  assert.equal(resolveLocalImageRel('docs/report.md', './img/shot.png'), 'docs/img/shot.png');
  assert.equal(resolveLocalImageRel('docs/report.md', 'shot.png'), 'docs/shot.png');
  assert.equal(resolveLocalImageRel('docs/deep/report.md', '../shot.png'), 'docs/shot.png');
  assert.equal(resolveLocalImageRel('report.md', 'out/shot.png?v=3'), 'out/shot.png');
});

test('a leading slash means the WORKSPACE root, not the filesystem root', () => {
  assert.equal(resolveLocalImageRel('docs/report.md', '/assets/shot.png'), 'assets/shot.png');
  // Worst case it names a path that simply does not exist inside the workspace.
  assert.equal(resolveLocalImageRel('docs/report.md', '/etc/secret.png'), 'etc/secret.png');
});

test('anything with a URI scheme is refused', () => {
  // Remote URLs are dead under the CSP anyway; proxying them through the main
  // process would turn a rendered report into a beacon for whoever wrote it.
  for (const src of [
    'https://evil.example/track.png',
    'http://evil.example/track.png',
    'data:image/png;base64,AAAA',
    'file:///etc/passwd.png',
    'javascript:alert(1)'
  ]) {
    assert.equal(resolveLocalImageRel('docs/report.md', src), null, `${src} must not resolve`);
  }
});

test('non-image sources are refused even when local', () => {
  assert.equal(resolveLocalImageRel('docs/report.md', './secrets.env'), null);
  assert.equal(resolveLocalImageRel('docs/report.md', '../../.ssh/id_rsa'), null);
  assert.equal(resolveLocalImageRel('docs/report.md', undefined), null);
  assert.equal(resolveLocalImageRel('docs/report.md', '   '), null);
});

test('`..` can never climb above the workspace root textually', () => {
  // Not the security boundary (safeResolve is), but it must not even try.
  assert.equal(resolveRel('a/b/c.md', '../../../../../etc/passwd'), 'etc/passwd');
  assert.equal(resolveLocalImageRel('a/b.md', '../../../../x.png'), 'x.png');
});

// ─── percent-encoded sources ────────────────────────────────────────────────
//
// The resolver never sees what the author typed: react-markdown hands it the
// URL AFTER `normalizeUri`, which percent-encodes spaces, backslashes and every
// non-ASCII character, and turns a `%` that is not followed by two
// alphanumerics into `%25`. So the inputs below come in two kinds — PARSER
// OUTPUT (what the product actually receives) and DIRECT input (only reachable
// by calling the resolver yourself, kept to pin the defensive edges).

/** The `src` react-markdown passes to the `img` component for `markdown`. */
async function srcOfMarkdownImage(markdown) {
  const { default: ReactMarkdown } = await import('react-markdown');
  const React = require('react');
  const { renderToStaticMarkup } = require('react-dom/server');
  let captured;
  renderToStaticMarkup(React.createElement(ReactMarkdown, {
    components: { img: ({ src }) => { captured = src; return null; } }
  }, markdown));
  return captured;
}

test('what the parser actually hands the resolver', async () => {
  assert.equal(await srcOfMarkdownImage('![QA](<QA Shot.png>)'), 'QA%20Shot.png');
  assert.equal(await srcOfMarkdownImage('![QA](QA%20Shot.png)'), 'QA%20Shot.png');
  assert.equal(await srcOfMarkdownImage('![x](bad%2.png)'), 'bad%252.png', 'a lone `%` is re-encoded');
  assert.equal(await srcOfMarkdownImage('![x](100%.png)'), '100%25.png');
  assert.equal(await srcOfMarkdownImage('![x](bad%zz.png)'), 'bad%zz.png', 'kept: it LOOKS like an escape');
  assert.equal(await srcOfMarkdownImage('![x](<img\\shot.png>)'), 'img%5Cshot.png');
  // A colon BEFORE the first `/` reads as a scheme and react-markdown's
  // urlTransform blanks the whole URL; after a `/` it survives untouched.
  assert.equal(await srcOfMarkdownImage('![x](a:b.png)'), '');
  assert.equal(await srcOfMarkdownImage('![x](shots/a:b.png)'), 'shots/a:b.png');
});

test('each URL segment is decoded exactly once', () => {
  const base = 'docs/report.md';
  assert.equal(resolveLocalImageRel(base, 'QA%20Shot.png'), 'docs/QA Shot.png');
  assert.equal(resolveLocalImageRel(base, 'QA%2520Shot.png'), 'docs/QA%20Shot.png', 'never twice');
  assert.equal(resolveLocalImageRel(base, '%E6%B8%AC%E8%A9%A6.png'), 'docs/測試.png');
  assert.equal(resolveLocalImageRel(base, '100%25.png'), 'docs/100%.png');
  assert.equal(resolveLocalImageRel(base, 'bad%252.png'), 'docs/bad%2.png');
  assert.equal(resolveLocalImageRel(base, 'C++.png'), 'docs/C++.png', '`+` is not a form-encoded space');
  assert.equal(resolveLocalImageRel(base, 'QA%20Shot.png?v=2#fig'), 'docs/QA Shot.png');
  assert.equal(resolveLocalImageRel(base, '/docs/QA%20Shot.png'), 'docs/QA Shot.png');
  assert.equal(resolveLocalImageRel(base, 'folder%20one/../QA%20Shot.png'), 'docs/QA Shot.png');
});

test('an encoded `#` is file-name data, judged by the DECODED extension', () => {
  const base = 'docs/report.md';
  assert.equal(resolveLocalImageRel(base, 'QA%231.png'), 'docs/QA#1.png');
  assert.equal(resolveLocalImageRel(base, 'folder%23one/pic.png'), 'docs/folder#one/pic.png');
  assert.deepEqual(resolveLocalImageSource(base, 'cover.png%23notes.txt'), { ok: false, reason: 'not-image' });
  assert.deepEqual(resolveLocalImageSource(base, 'x.constructor'), { ok: false, reason: 'not-image' });
});

test('the document directory is a disk path and is never decoded', () => {
  assert.equal(resolveLocalImageRel('notes%20literal/report.md', 'shot.png'), 'notes%20literal/shot.png');
  assert.equal(resolveLocalImageRel('notes#1/report.md', 'QA%20Shot.png'), 'notes#1/QA Shot.png');
});

test('malformed encodings and shape-changing segments are refused with a reason', () => {
  const base = 'docs/report.md';
  for (const src of ['bad%zz.png', 'bad%FF.png', 'bad%E6%B8.png', 'bad%2.png' /* direct */]) {
    assert.deepEqual(resolveLocalImageSource(base, src), { ok: false, reason: 'malformed-encoding' }, src);
    assert.equal(resolveLocalImageRel(base, src), null);
  }
  for (const src of [
    'x%2Fy.png', 'x%5Cy.png', '%2e%2e/outside.png', 'a/%2E/b.png', 'a%00b.png',
    'img\\shot.png', '\\\\server\\share\\x.png' // direct: the parser encodes `\`
  ]) {
    assert.deepEqual(resolveLocalImageSource(base, src), { ok: false, reason: 'unsafe-segment' }, src);
  }
});

test('a colon names the same file whether or not it was encoded', () => {
  // Legal on macOS/Linux and readable there today; Windows drive and stream
  // forms are confined by safeResolve in the main process, not here.
  assert.equal(resolveLocalImageRel('docs/report.md', 'shots/a:b.png'), 'docs/shots/a:b.png');
  assert.equal(resolveLocalImageRel('docs/report.md', 'shots/a%3Ab.png'), 'docs/shots/a:b.png');
  // …while a leading `name:` is a scheme, encoded or not it never gets that far.
  assert.deepEqual(resolveLocalImageSource('docs/report.md', 'a:b.png'), { ok: false, reason: 'remote' });
});

test('every refusal carries a reason the preview can show', () => {
  const base = 'docs/report.md';
  assert.deepEqual(resolveLocalImageSource(base, undefined), { ok: false, reason: 'empty' });
  assert.deepEqual(resolveLocalImageSource(base, '   '), { ok: false, reason: 'empty' });
  assert.deepEqual(resolveLocalImageSource(base, 'https://evil.example/t.png'), { ok: false, reason: 'remote' });
  assert.deepEqual(resolveLocalImageSource(base, 'data:image/png;base64,AAAA'), { ok: false, reason: 'remote' });
  assert.deepEqual(resolveLocalImageSource(base, './secrets.env'), { ok: false, reason: 'not-image' });
  assert.deepEqual(resolveLocalImageSource(base, 'shot.png'), { ok: true, rel: 'docs/shot.png' });
});

test('decodeHrefPath keeps raw structure apart from decoded names', () => {
  assert.deepEqual(decodeHrefPath('/a%20b/../c.png?x#y'), { ok: true, rooted: true, segments: ['', 'a b', '..', 'c.png'] });
  assert.deepEqual(decodeHrefPath('%zz'), { ok: false, reason: 'malformed-encoding' });
});

test('relative markdown links decode the same way images do', () => {
  const base = 'docs/report.md';
  assert.equal(resolveMdLinkRel(base, 'my%20notes.md'), 'docs/my notes.md');
  assert.equal(resolveMdLinkRel(base, 'my%20notes.md#intro'), 'docs/my notes.md');
  assert.equal(resolveMdLinkRel(base, '../README.md'), 'README.md');
  assert.equal(resolveMdLinkRel(base, '/guide/start.md'), 'guide/start.md', 'leading `/` is the workspace root, as for images');
  assert.equal(resolveMdLinkRel(base, 'bad%zz.md'), null);
  assert.equal(resolveMdLinkRel(base, 'x%2Fy.md'), null);
  assert.equal(resolveMdLinkRel(base, 'https://example.com/a.md'), null);
  assert.equal(resolveMdLinkRel(base, 'shot.png'), null, 'only markdown files open as markdown');
});

// ─── the binary read itself ─────────────────────────────────────────────────

/** A 1×1 PNG — a real file with a null byte in its header, i.e. exactly what the
 *  text reader refuses. */
const ONE_PIXEL_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64'
);

function makeWorkspace() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-img-'));
  const root = path.join(dir, 'workspace');
  fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
  fs.writeFileSync(path.join(root, 'docs', 'shot.png'), ONE_PIXEL_PNG);
  // A sibling of the root, i.e. the thing traversal would be reaching for.
  fs.writeFileSync(path.join(dir, 'outside.png'), ONE_PIXEL_PNG);
  return { dir, root };
}

test('reads an image the text reader refuses, with its mime and size', async () => {
  const { dir, root } = makeWorkspace();
  try {
    const res = await readFileBinary(root, 'docs/shot.png');
    assert.equal(res.ok, true, res.ok ? '' : res.error);
    assert.equal(res.mime, 'image/png');
    assert.equal(res.size, ONE_PIXEL_PNG.length);
    assert.ok(Buffer.from(res.bytes).equals(ONE_PIXEL_PNG), 'bytes must round-trip exactly');
    assert.ok(res.bytes.includes(0), 'the null byte is the whole reason this path exists');
    assert.equal(
      res.bytes.byteLength, res.bytes.buffer.byteLength,
      'bytes must be COPIED into their own buffer — a pooled Buffer would ship unrelated file data across IPC'
    );
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('path traversal out of the root is rejected', async () => {
  const { dir, root } = makeWorkspace();
  try {
    for (const rel of [
      '../outside.png',
      'docs/../../outside.png',
      path.join(dir, 'outside.png'), // absolute, outside the root
      '/etc/hosts'
    ]) {
      const res = await readFileBinary(root, rel);
      assert.equal(res.ok, false, `${rel} must not be readable`);
      assert.equal(res.error, 'path escapes root');
    }
    // …while an absolute path INSIDE the root is still fine (safeResolve's rule).
    const inside = await readFileBinary(root, path.join(root, 'docs', 'shot.png'));
    assert.equal(inside.ok, true);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the size cap is enforced before any bytes are read', async () => {
  const { dir, root } = makeWorkspace();
  try {
    const res = await readFileBinary(root, 'docs/shot.png', 8);
    assert.equal(res.ok, false);
    assert.match(res.error, /too large/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('the default cap clears a retina screenshot (the 2 MB text cap did not)', async () => {
  const { dir, root } = makeWorkspace();
  try {
    // 2.5 MB: over the text reader's MAX_READ_BYTES, comfortably under this one.
    const big = path.join(root, 'docs', 'big.png');
    fs.writeFileSync(big, Buffer.concat([ONE_PIXEL_PNG, Buffer.alloc(2.5 * 1024 * 1024)]));
    const res = await readFileBinary(root, 'docs/big.png');
    assert.equal(res.ok, true, res.ok ? '' : res.error);
    assert.ok(res.size > 2 * 1024 * 1024);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('non-regular files are refused rather than opened', async () => {
  const { dir, root } = makeWorkspace();
  try {
    // A directory read would throw; a FIFO would BLOCK FOREVER with no size to
    // check, hanging the IPC call and the renderer's loading state with it.
    const res = await readFileBinary(root, 'docs');
    assert.equal(res.ok, false);
    assert.equal(res.error, 'not a regular file');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a missing file reports an error instead of throwing', async () => {
  const { dir, root } = makeWorkspace();
  try {
    const res = await readFileBinary(root, 'docs/nope.png');
    assert.equal(res.ok, false);
    assert.match(res.error, /ENOENT/);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('unknown binary types still read, labelled octet-stream', async () => {
  const { dir, root } = makeWorkspace();
  try {
    fs.writeFileSync(path.join(root, 'blob.bin'), Buffer.from([0, 1, 2, 3]));
    const res = await readFileBinary(root, 'blob.bin');
    assert.equal(res.ok, true);
    assert.equal(res.mime, 'application/octet-stream', 'never guess an image mime for an unknown extension');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ─── encoded sources, end to end ────────────────────────────────────────────

/** A second, distinguishable "image": same PNG header, different trailing
 *  bytes, so a test can tell WHICH file a read actually returned. */
const OTHER_PNG = Buffer.concat([ONE_PIXEL_PNG, Buffer.from('other')]);

test('a space-named image and its literal-%20 twin each read their OWN bytes', async () => {
  // The collision is the whole point: before the fix `QA%20Shot.png` read the
  // file literally named `QA%20Shot.png`, which `ok: true` alone cannot catch.
  const { dir, root } = makeWorkspace();
  try {
    fs.writeFileSync(path.join(root, 'docs', 'QA Shot.png'), ONE_PIXEL_PNG);
    fs.writeFileSync(path.join(root, 'docs', 'QA%20Shot.png'), OTHER_PNG);
    for (const [src, expected] of [
      ['QA%20Shot.png', ONE_PIXEL_PNG],
      ['QA%2520Shot.png', OTHER_PNG],
      ['QA%20Shot.png?v=2#fig', ONE_PIXEL_PNG],
      ['/docs/QA%20Shot.png', ONE_PIXEL_PNG]
    ]) {
      const rel = resolveLocalImageRel('docs/report.md', src);
      const res = await readFileBinary(root, rel);
      assert.equal(res.ok, true, `${src}: ${res.ok ? '' : res.error}`);
      assert.ok(Buffer.from(res.bytes).equals(expected), `${src} read the wrong file`);
      assert.equal(res.mime, 'image/png');
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('names with `#`, `%`, `+` and CJK read back with an image mime', async () => {
  const { dir, root } = makeWorkspace();
  try {
    for (const name of ['QA#1.png', '100%.png', 'C++.png', '測試截圖.png']) {
      fs.writeFileSync(path.join(root, 'docs', name), ONE_PIXEL_PNG);
    }
    fs.mkdirSync(path.join(root, 'docs', 'folder#one'));
    fs.writeFileSync(path.join(root, 'docs', 'folder#one', 'pic.png'), ONE_PIXEL_PNG);
    for (const src of [
      'QA%231.png', '100%25.png', 'C++.png',
      '%E6%B8%AC%E8%A9%A6%E6%88%AA%E5%9C%96.png', 'folder%23one/pic.png'
    ]) {
      const res = await readFileBinary(root, resolveLocalImageRel('docs/report.md', src));
      assert.equal(res.ok, true, `${src}: ${res.ok ? '' : res.error}`);
      assert.equal(res.mime, 'image/png', `${src} must not fall back to octet-stream`);
    }
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a workspace under a `#` directory still gets image mimes (svg included)', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'cth-img-'));
  const root = path.join(dir, 'C#work');
  try {
    fs.mkdirSync(path.join(root, 'docs'), { recursive: true });
    fs.writeFileSync(path.join(root, 'docs', 'shot.png'), ONE_PIXEL_PNG);
    fs.writeFileSync(path.join(root, 'docs', 'logo.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>');
    const png = await readFileBinary(root, 'docs/shot.png');
    const svg = await readFileBinary(root, 'docs/logo.svg');
    assert.equal(png.ok && png.mime, 'image/png');
    // SVG is the one format the decoder will NOT sniff — a wrong mime here is a
    // broken image, not a cosmetic label.
    assert.equal(svg.ok && svg.mime, 'image/svg+xml');
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

// ─── the renderer side of the read ──────────────────────────────────────────

test('settleImageRead turns every failure into a result, never a throw', async () => {
  const ok = { ok: true, bytes: new Uint8Array([1]), mime: 'image/png', path: '/x.png', size: 1 };
  assert.deepEqual(await settleImageRead(() => Promise.resolve(ok)), ok);
  assert.deepEqual(
    await settleImageRead(() => Promise.resolve({ ok: false, error: 'ENOENT' })),
    { ok: false, error: 'ENOENT' }
  );
  // Rejected IPC (e.g. a reply that could not be structured-cloned).
  assert.deepEqual(
    await settleImageRead(() => Promise.reject(new Error('could not be cloned'))),
    { ok: false, error: 'could not be cloned' }
  );
  // SYNCHRONOUS throw — a missing bridge or a preload that throws on call. A
  // trailing `.catch()` never sees this; inside an effect it would unmount the
  // whole preview through the error boundary instead of showing a chip.
  const missingBridge = await settleImageRead(() => { throw new TypeError('readBinary is not a function'); });
  assert.deepEqual(missingBridge, { ok: false, error: 'readBinary is not a function' });
  assert.deepEqual(await settleImageRead(() => { throw 'plain string'; }), { ok: false, error: 'plain string' });
});
