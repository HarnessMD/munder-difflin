/**
 * The release drop renders in a `srcdoc` iframe, and a srcdoc document INHERITS
 * the policy of the page that holds it. A child policy can only narrow what the
 * parent allows, never widen it. So what the drop may load is the INTERSECTION
 * of two policies that live in two files: `src/renderer/index.html` and
 * `buildDropSrcDoc` in `src/shared/releaseDrop.ts`.
 *
 * 0.5.2 shipped with broken pictures because every existing test read ONE of
 * those policies. The drop asked for `img-src https:` and was tested for it;
 * the parent said `img-src 'self' data: blob:` and nobody asked it. The fonts
 * had been refused the same way on every release the frame ever shipped in,
 * and a page in a fallback font is a page nobody files a bug about.
 *
 * This suite asks the only question that matters: for each thing a drop really
 * loads, do BOTH policies say yes.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { buildDropSrcDoc } = loadTs('src/shared/releaseDrop.ts');

const META = /http-equiv="Content-Security-Policy"\s+content="([^"]+)"/;

function directives(policy) {
  const out = {};
  for (const part of policy.split(';')) {
    const [name, ...sources] = part.trim().split(/\s+/);
    if (name) out[name] = sources;
  }
  return out;
}

/** Would this one policy let `url` through under `directive`. Deliberately the
 *  small subset of source matching our two policies use, and it fails closed:
 *  a source form it does not know is treated as not matching. The page itself
 *  is `file:` or the dev server, so 'self' never matches an https or data URL. */
function allows(policy, directive, url) {
  const d = directives(policy);
  const sources = d[directive] ?? d['default-src'] ?? [];
  const scheme = url.slice(0, url.indexOf(':') + 1);
  return sources.some((s) => {
    if (s === "'none'" || s === "'self'") return false;
    if (/^[a-z][a-z0-9+.-]*:$/.test(s)) return s === scheme;
    if (/^https:\/\/[^/*]+$/.test(s)) return url === s || url.startsWith(s + '/');
    return false;
  });
}

const parent = () => {
  const html = fs.readFileSync(path.join(__dirname, '..', 'src/renderer/index.html'), 'utf8');
  const m = META.exec(html.replace(/<!--[\s\S]*?-->/g, ''));
  assert.ok(m, 'index.html carries a CSP meta tag');
  return m[1];
};
const child = () => {
  const m = META.exec(buildDropSrcDoc('<h1>hi</h1>'));
  assert.ok(m, 'the drop document carries a CSP meta tag');
  return m[1];
};
const both = (directive, url) => allows(parent(), directive, url) && allows(child(), directive, url);

// What a drop really loads. The image is the one 0.5.2 shipped and lost.
const IMAGE = 'https://app.harnessmd.com/releases/drop-052-meet.webp';
const FONT = 'data:font/woff2;base64,d09GMgABAAAAA';
const VIDEO = 'https://app.harnessmd.com/releases/drop-053-tour.mp4';

test('a picture on the release host loads: the parent AND the drop both allow it', () => {
  assert.equal(allows(child(), 'img-src', IMAGE), true, 'the drop asks for it');
  assert.equal(both('img-src', IMAGE), true, 'and the parent does not take it away');
});

test('the inlined house fonts load: the parent AND the drop both allow data: fonts', () => {
  assert.equal(allows(child(), 'font-src', FONT), true, 'the drop asks for it');
  assert.equal(both('font-src', FONT), true, 'and the parent does not take it away');
});

test('a video on the release host loads, before the first drop that carries one', () => {
  assert.equal(both('media-src', VIDEO), true);
});

test('the parent is widened to the release host and no further', () => {
  const p = parent();
  assert.equal(allows(p, 'img-src', 'https://evil.example/x.png'), false);
  assert.equal(allows(p, 'media-src', 'https://evil.example/x.mp4'), false);
  // Fonts are inlined, never fetched. No host belongs in font-src at all.
  assert.equal(allows(p, 'font-src', 'https://app.harnessmd.com/f.woff2'), false);
  assert.equal(allows(p, 'font-src', 'https://fonts.gstatic.com/f.woff2'), false);
  assert.equal(allows(p, 'script-src', 'https://app.harnessmd.com/x.js'), false);
});

test('the matcher fails closed, so a green run here is not the matcher being generous', () => {
  assert.equal(allows("img-src 'self'", 'img-src', IMAGE), false);
  assert.equal(allows("default-src 'none'", 'img-src', IMAGE), false);
  assert.equal(allows('img-src https://*.harnessmd.com', 'img-src', IMAGE), false, 'unknown form');
  assert.equal(allows('img-src https://app.harnessmd.com', 'img-src', 'https://app.harnessmd.com.evil.example/x'), false);
});
