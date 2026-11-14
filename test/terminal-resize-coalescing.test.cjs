'use strict';

// A burst of terminal grid changes reaches the pty as at most one resize, once the grid has
// been quiet for the settle time, and none at all when it settles back where the burst began.
// Every pty resize the window asks for goes through that coalescer.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const loadTs = require(path.join(ROOT, 'test/load-ts.cjs'));
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { createPtyResizeCoalescer, PTY_RESIZE_SETTLE_MS } = loadTs('src/renderer/src/components/ptyResizeCoalescer.ts');

function clock() {
  let now = 0;
  let next = 1;
  const timers = new Map();
  return {
    host: { set: (fn, ms) => { const id = next++; timers.set(id, { fn, at: now + ms }); return id; }, clear: (id) => { timers.delete(id); } },
    advance(ms) { now += ms; for (const [id, t] of [...timers]) if (t.at <= now) { timers.delete(id); t.fn(); } },
    get armed() { return timers.size; }
  };
}
const g = (cols, rows) => ({ cols, rows });

test('a burst settles into one resize to the last grid, sent only after the grid is quiet', () => {
  assert.equal(PTY_RESIZE_SETTLE_MS, 150);
  const c = clock();
  const sent = [];
  const r = createPtyResizeCoalescer((x) => sent.push(x), c.host);
  r.request(g(80, 24), g(80, 20));
  c.advance(100);
  r.request(g(80, 20), g(80, 14));
  c.advance(100);
  assert.deepEqual(sent, [], 'each change restarts the wait');
  assert.equal(r.pending, true);
  c.advance(50);
  assert.deepEqual(sent, [g(80, 14)]);
  assert.equal(r.pending, false);
  assert.equal(c.armed, 0);
});

test('a forty tick drag costs one resize; a grid that comes back where it began costs none', () => {
  const c = clock();
  const sent = [];
  const r = createPtyResizeCoalescer((x) => sent.push(x), c.host);
  let at = g(80, 24);
  for (let i = 1; i <= 40; i++) { const to = g(80 + i, 24); r.request(at, to); at = to; c.advance(10); }
  c.advance(PTY_RESIZE_SETTLE_MS);
  assert.deepEqual(sent, [g(120, 24)]);

  r.request(g(120, 19), g(120, 14));
  r.request(g(120, 14), g(120, 19));
  c.advance(PTY_RESIZE_SETTLE_MS);
  assert.deepEqual(sent, [g(120, 24)], '19 to 14 to 19 rows: nothing sent');

  r.request(g(120, 24), g(100, 30));
  c.advance(PTY_RESIZE_SETTLE_MS);
  assert.deepEqual(sent.at(-1), g(100, 30), 'the next burst starts from its own grid');
});

test('flush sends a pending change at once; cancel drops it; neither sends when nothing is pending', () => {
  const c = clock();
  const sent = [];
  const r = createPtyResizeCoalescer((x) => sent.push(x), c.host);
  r.flush();
  r.cancel();
  assert.deepEqual(sent, []);
  r.request(g(80, 24), g(90, 24));
  r.flush();
  assert.deepEqual(sent, [g(90, 24)]);
  assert.equal(c.armed, 0, 'its timer is cleared');
  r.request(g(90, 24), g(70, 24));
  r.cancel();
  c.advance(1000);
  assert.deepEqual(sent, [g(90, 24)]);
  assert.equal(r.pending, false);
});

test('wiring: the window resizes a pty only through the coalescer, one per pty, dropped with its terminal', () => {
  const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(d, e.name)] : []);
  const callers = walk(path.join(ROOT, 'src/renderer/src')).filter((f) => /cth\.resizePty\(/.test(fs.readFileSync(f, 'utf8')));
  assert.deepEqual(callers.map((f) => path.relative(ROOT, f)), ['src/renderer/src/components/terminalPool.ts']);
  const pool = read('src/renderer/src/components/terminalPool.ts');
  assert.equal((pool.match(/cth\.resizePty\(/g) ?? []).length, 1);
  assert.match(pool, /c = createPtyResizeCoalescer\(\(g\) => \{ void window\.cth\.resizePty\(ptyId, g\.cols, g\.rows\); \}\);\s*resizeCoalescers\.set\(ptyId, c\);/);
  assert.match(pool, /if \(entry\.term\.cols !== before\.cols \|\| entry\.term\.rows !== before\.rows\) \{\s*requestPtyResize\(ptyId, before, \{ cols: entry\.term\.cols, rows: entry\.term\.rows \}\);/);
  assert.match(pool, /pool\.delete\(ptyId\);\s*resizeCoalescers\.get\(ptyId\)\?\.cancel\(\);[^\n]*\n\s*resizeCoalescers\.delete\(ptyId\);/, 'a pty that goes away gets no late resize');
  const view = read('src/renderer/src/components/PtyTerminalView.tsx');
  assert.match(view, /const before = \{ cols: entry\.term\.cols, rows: entry\.term\.rows \};\s*entry\.fit\.fit\(\);\s*requestPtyResize\(ptyId, before, \{ cols: entry\.term\.cols, rows: entry\.term\.rows \}\);/, 'the font size refit compares before and after');
  assert.match(view, /requestPtyResize\(ptyId, before, \{ cols: entry\.term\.cols, rows: entry\.term\.rows \}\);\s*\}\s*entry\.term\.refresh/);
});
