'use strict';

// Real official CLI + deterministic loopback OpenAI-compatible fixture, NOT a
// real model-quality benchmark. Usage: OPENCODE_BIN=/path/to/opencode node ...
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const http = require('node:http');
const loadTs = require('./load-ts.cjs');
const { runReflectSession } = loadTs('src/main/reflectSession.ts');
const { parseSummary, MemoryReflector } = loadTs('src/main/reflect.ts');

async function main() {
  assert.ok(process.env.OPENCODE_BIN, 'Set OPENCODE_BIN to an installed official CLI');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'md reflect CLI '));
  const requests = [];
  let quotaBanner = false;
  const framed = '<<<CONDENSED>>>\nDeterministic fixture summary, not real inference.\n<<<HOIST>>>\n<<<END>>>';
  const server = http.createServer(async (req, res) => {
    let raw = ''; for await (const chunk of req) raw += chunk;
    if (!req.url.endsWith('/chat/completions')) { res.writeHead(404); res.end(); return; }
    const body = JSON.parse(raw); requests.push(body);
    res.writeHead(200, { 'Content-Type': 'text/event-stream' });
    const output = quotaBanner ? 'HTTP 429 quota exceeded; retry after 2 hours' : framed;
    for (const delta of [{ role: 'assistant', content: '' }, { content: output }]) {
      res.write('data: ' + JSON.stringify({ id: 'fixture-1', object: 'chat.completion.chunk', created: 1, model: 'small', choices: [{ index: 0, delta, finish_reason: null }] }) + '\n\n');
    }
    res.write('data: ' + JSON.stringify({ id: 'fixture-1', object: 'chat.completion.chunk', created: 1, model: 'small', choices: [{ index: 0, delta: {}, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 } }) + '\n\n');
    res.end('data: [DONE]\n\n');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  try {
    const env = {
      XDG_CONFIG_HOME: path.join(root, 'config'), XDG_DATA_HOME: path.join(root, 'data'),
      XDG_CACHE_HOME: path.join(root, 'cache'), XDG_STATE_HOME: path.join(root, 'state'),
      OPENCODE_CONFIG_CONTENT: JSON.stringify({
        enabled_providers: ['fixture'],
        provider: { fixture: { npm: '@ai-sdk/openai-compatible', name: 'Loopback fixture only', options: { baseURL: `http://127.0.0.1:${server.address().port}/v1`, apiKey: 'local-fixture-not-a-secret' }, models: { small: { name: 'Deterministic fixture', limit: { context: 8192, output: 2048 } } } } }
      })
    };
    const result = await runReflectSession('Summarize only this supplied text. Do not use any tools.', { provider: 'opencode', command: process.env.OPENCODE_BIN, model: 'fixture/small', cwd: root, env, timeoutMs: 60_000 });
    assert.equal(result.ok, true, result.error);
    assert.deepEqual(parseSummary(result.text), { condensed: 'Deterministic fixture summary, not real inference.', hoist: [] });
    assert.equal(requests.length, 1, 'one model request, no hidden Claude fallback');
    assert.equal(requests[0].model, 'small');
    assert.ok(!requests[0].tools?.length, 'tools must be absent from the real request');
    console.log('PASS: official OpenCode CLI, stdin prompt, fixture/small, NDJSON capture, zero advertised tools, one loopback model request');
    // Deterministic quota BANNER output (not a real exhausted account / HTTP
    // quota policy) through the same official CLI and production reflector.
    quotaBanner = true;
    const mem = path.join(root, 'hive', 'agents', 'jim', 'memory.md');
    fs.mkdirSync(path.dirname(mem), { recursive: true });
    const original = '# Memory\n\n## Old\n' + 'Old decision. '.repeat(200) + '\n\n## New\nKeep verbatim.\n';
    fs.writeFileSync(mem, original);
    const events = [];
    const reflector = new MemoryReflector(() => root, () => 'claude', () => env,
      () => ({ enabled: true, intervalMs: 60_000, byteTriggerPct: 0, sectionTrigger: 0, recentKeep: 1, minBytes: 0 }),
      event => events.push(event), () => ({ provider: 'opencode', command: `"${process.env.OPENCODE_BIN}"`, model: 'fixture/small' }));
    const [limited] = await reflector.reflectNow('jim');
    assert.equal(limited.reason, 'rate-limited'); assert.ok(limited.retryAt > Date.now());
    assert.equal(fs.readFileSync(mem, 'utf8'), original);
    const count = requests.length; assert.equal(count, 2, 'one successful summary + one quota-banner attempt');
    await reflector.reflectNow('jim'); assert.equal(requests.length, count, 'cooldown must prevent another real CLI model request');
    assert.equal(events.at(-1).reason, 'rate-limited');
    console.log('PASS: quota-banner fixture through official CLI -> rate-limited; original memory unchanged; second reflect call makes zero requests');
  } finally {
    server.closeAllConnections(); await new Promise(resolve => server.close(resolve));
    fs.rmSync(root, { recursive: true, force: true });
  }
}
main().catch(error => { console.error(error); process.exitCode = 1; });
