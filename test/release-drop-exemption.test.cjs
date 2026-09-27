// ReleaseDrop is the ONE renderer surface deliberately exempt from the skin
// system, and this file is what keeps that decision from rotting in either
// direction.
//
// WHY IT IS EXEMPT (the short version; the long one is in ReleaseDrop.tsx):
// the drop's content is an authored document in a `srcdoc` iframe under a
// `default-src 'none'` CSP. A srcdoc iframe is a SEPARATE DOCUMENT, so CSS
// custom properties do not cross into it — the frame can never read `--cth-*`.
// Tokenising the chrome would therefore paint a Professional-dark frame around a
// permanently warm-paper document. Half-following is worse than not following,
// and here it is the ONLY reachable outcome.
//
// Two failure modes, one each way:
//   1. Someone "fixes" the chrome to use tokens, producing that mismatch.
//   2. The chrome palette and the frame palette drift, which the source has
//      always warned about and nothing has ever checked. They are two
//      hand-maintained copies of the same six colours.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const CHROME = path.join(ROOT, 'src/renderer/src/components/ReleaseDrop.tsx');
const FRAME = path.join(ROOT, 'src/shared/releaseDrop.ts');

test('the release drop chrome uses no --cth-* token', () => {
  const src = fs.readFileSync(CHROME, 'utf8');
  // Strip comments — the exemption is EXPLAINED in prose that names the tokens.
  const code = src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
  const hits = [...new Set(code.match(/--cth-[a-z0-9-]+/g) || [])];
  assert.deepEqual(hits, [],
    `ReleaseDrop is a deliberate skin exemption but now reads ${hits.join(', ')}. ` +
    'The framed document is a sandboxed srcdoc and can never follow, so a tokenised ' +
    'chrome would disagree with its own content. Read the block comment above the ' +
    'palette constants before changing this.');
});

test('the chrome palette still matches the framed document', () => {
  const chrome = fs.readFileSync(CHROME, 'utf8');
  const frame = fs.readFileSync(FRAME, 'utf8');
  // chrome:  const PAPER = '#FFFDF7';      frame:  --paper: #FFFDF7;
  const pairs = [
    ['PAPER', 'paper'], ['INK', 'ink'], ['INK_FAINT', 'ink-faint'],
    ['YELLOW', 'yellow'], ['SKY', 'sky'], ['MAROON', 'maroon']
  ];
  const drift = [];
  for (const [constName, cssVar] of pairs) {
    const c = chrome.match(new RegExp(`^const ${constName} = '(#[0-9A-Fa-f]{6})';`, 'm'));
    const f = frame.match(new RegExp(`--${cssVar}:\\s*(#[0-9A-Fa-f]{6});`));
    assert.ok(c, `chrome constant ${constName} not found — was it renamed?`);
    assert.ok(f, `frame variable --${cssVar} not found — was it renamed?`);
    if (c[1].toUpperCase() !== f[1].toUpperCase()) {
      drift.push(`${constName}=${c[1]} but --${cssVar}=${f[1]}`);
    }
  }
  assert.deepEqual(drift, [],
    `the drop's chrome and the document it frames have drifted: ${drift.join('; ')}. ` +
    'These are two hand-maintained copies of one palette and the window would ' +
    'visibly disagree with its contents.');
});
