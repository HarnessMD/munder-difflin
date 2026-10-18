'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const loadTs = require('./load-ts.cjs');

const shared = loadTs('src/shared/usageEndpoint.ts');
const { fetchUsage } = loadTs('src/main/usageEndpoint.ts');

const NOW = Date.parse('2026-10-17T14:40:00Z');
const iso = (offsetMs) => new Date(NOW + offsetMs).toISOString();
const HOUR = 3600_000;

const SAMPLE = {
  timestamp: '2026-10-17T14:40:00Z',
  agents: {
    claude: {
      five_hour: { remaining_pct: 90.0, resets_at: iso(3 * HOUR) },
      weekly: { remaining_pct: 69.5, resets_at: iso(72 * HOUR) },
      availability: 'available'
    }
  }
};

test('parses the documented payload', () => {
  const snap = shared.parseUsageResponse(SAMPLE);
  assert.equal(snap.timestamp, '2026-10-17T14:40:00.000Z');
  assert.equal(snap.agents.claude.windows.five_hour.remainingPct, 90);
  assert.equal(snap.agents.claude.windows.weekly.remainingPct, 69.5);
  assert.equal(snap.agents.claude.availability, 'available');
});

test('clamps percentages and drops garbage instead of throwing', () => {
  const snap = shared.parseUsageResponse({
    agents: {
      a: { five_hour: { remaining_pct: 140, resets_at: 'not a date' }, weekly: { remaining_pct: -5 }, junk: 'x', nan: { remaining_pct: 'high' } },
      b: 'nope',
      c: {}
    }
  });
  assert.deepEqual(Object.keys(snap.agents), ['a']);
  assert.equal(snap.agents.a.windows.five_hour.remainingPct, 100);
  assert.equal(snap.agents.a.windows.five_hour.resetsAt, null);
  assert.equal(snap.agents.a.windows.weekly.remainingPct, 0);
  assert.deepEqual(Object.keys(snap.agents.a.windows), ['five_hour', 'weekly']);
});

test('nothing usable parses to null', () => {
  for (const bad of [null, 42, 'x', [], {}, { agents: [] }, { agents: { a: {} } }]) {
    assert.equal(shared.parseUsageResponse(bad), null, JSON.stringify(bad));
  }
});

test('a window with no remaining_pct is ignored but availability alone still counts', () => {
  const snap = shared.parseUsageResponse({ agents: { x: { availability: 'exhausted' } } });
  assert.equal(snap.agents.x.availability, 'exhausted');
  assert.deepEqual(snap.agents.x.windows, {});
});

test('summary: plenty left and far from reset has no hint', () => {
  const out = shared.summarizeForOrchestrator(shared.parseUsageResponse(SAMPLE), NOW);
  assert.match(out, /^- claude: five hour 90% left \(resets in 3h 0m\); weekly 69\.5% left \(resets in 3d 0h\) \[available\]$/);
});

test('summary: nearly out says reroute', () => {
  const snap = shared.parseUsageResponse({ agents: { codex: { five_hour: { remaining_pct: 8, resets_at: iso(HOUR) }, availability: 'available' } } });
  assert.match(shared.summarizeForOrchestrator(snap, NOW), /LOW: avoid new work here, reroute/);
});

test('summary: a non-available state reroutes even with allowance left', () => {
  const snap = shared.parseUsageResponse({ agents: { codex: { five_hour: { remaining_pct: 80 }, availability: 'limited' } } });
  assert.match(shared.summarizeForOrchestrator(snap, NOW), /LOW/);
});

test('summary: soon-to-reset with plenty unused says burn it', () => {
  const snap = shared.parseUsageResponse({ agents: { claude: { five_hour: { remaining_pct: 60, resets_at: iso(HOUR) } } } });
  assert.match(shared.summarizeForOrchestrator(snap, NOW), /use it or lose it: five hour resets in 1h 0m with 60% unused/);
});

test('summary: soon-to-reset but nearly empty is not a burn candidate', () => {
  const snap = shared.parseUsageResponse({ agents: { claude: { five_hour: { remaining_pct: 20, resets_at: iso(HOUR) } } } });
  assert.doesNotMatch(shared.summarizeForOrchestrator(snap, NOW), /use it or lose it/);
});

test('formatDuration', () => {
  assert.equal(shared.formatDuration(0), 'now');
  assert.equal(shared.formatDuration(45 * 60_000), '45m');
  assert.equal(shared.formatDuration(2 * HOUR + 10 * 60_000), '2h 10m');
  assert.equal(shared.formatDuration(76 * HOUR), '3d 4h');
});

test('config normalisation: bad URL disables, timeout is clamped, token trimmed', () => {
  const bad = shared.normalizeUsageEndpoint({ enabled: true, url: 'ftp://x', timeoutMs: 1 });
  assert.equal(bad.enabled, false);
  assert.equal(bad.timeoutMs, 500);
  const ok = shared.normalizeUsageEndpoint({ enabled: true, url: ' http://pi.local:8080/x ', token: '  t  ', timeoutMs: 999999 });
  assert.equal(ok.enabled, true);
  assert.equal(ok.token, 't');
  assert.equal(ok.timeoutMs, 30000);
  assert.equal('token' in shared.normalizeUsageEndpoint({ enabled: true, url: 'http://a/b', token: '  ' }), false);
  assert.deepEqual(shared.normalizeUsageEndpoint(undefined), { enabled: false, url: '', timeoutMs: 5000 });
});

// --- fetch, against a real local server -------------------------------------

function serve(handler) {
  return new Promise((resolve) => {
    const seen = [];
    const server = http.createServer((req, res) => { seen.push(req.headers); handler(req, res); });
    server.listen(0, '127.0.0.1', () => resolve({
      url: `http://127.0.0.1:${server.address().port}/api/agents/remaining`,
      seen,
      close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r); })
    }));
  });
}

test('fetch: returns the snapshot and sends the bearer token', async () => {
  const s = await serve((_req, res) => { res.setHeader('content-type', 'application/json'); res.end(JSON.stringify(SAMPLE)); });
  try {
    const r = await fetchUsage({ url: s.url, token: 'secret', timeoutMs: 2000 });
    assert.equal(r.ok, true);
    assert.equal(r.snapshot.agents.claude.windows.five_hour.remainingPct, 90);
    assert.equal(s.seen[0].authorization, 'Bearer secret');
  } finally { await s.close(); }
});

test('fetch: no token means no Authorization header', async () => {
  const s = await serve((_req, res) => res.end(JSON.stringify(SAMPLE)));
  try {
    await fetchUsage({ url: s.url, timeoutMs: 2000 });
    assert.equal(s.seen[0].authorization, undefined);
  } finally { await s.close(); }
});

test('fetch: failures come back as errors, never throw', async () => {
  const cases = [
    [(_q, res) => { res.statusCode = 500; res.end('x'); }, /HTTP 500/],
    [(_q, res) => res.end('<html>'), /not JSON/],
    [(_q, res) => res.end('{"agents":{}}'), /no usable agents/],
    [(_q, res) => { res.statusCode = 302; res.setHeader('location', 'http://elsewhere.invalid/'); res.end(); }, /redirect \(302\) refused/],
    [(_q, res) => res.end('x'.repeat(300 * 1024)), /too large/]
  ];
  for (const [handler, re] of cases) {
    const s = await serve(handler);
    try {
      const r = await fetchUsage({ url: s.url, timeoutMs: 2000 });
      assert.equal(r.ok, false);
      assert.match(r.error, re);
    } finally { await s.close(); }
  }
});

test('fetch: a hung server times out instead of blocking the standup', async () => {
  const s = await serve(() => { /* never respond */ });
  try {
    const t0 = Date.now();
    const r = await fetchUsage({ url: s.url, timeoutMs: 300 });
    assert.equal(r.ok, false);
    assert.match(r.error, /timed out/);
    assert.ok(Date.now() - t0 < 3000);
  } finally { await s.close(); }
});

test('fetch: refused connection and bad URL are reported', async () => {
  assert.equal((await fetchUsage({ url: 'http://127.0.0.1:1/x', timeoutMs: 1000 })).ok, false);
  assert.deepEqual(await fetchUsage({ url: 'file:///etc/passwd', timeoutMs: 1000 }), { ok: false, error: 'not an http(s) URL' });
});
