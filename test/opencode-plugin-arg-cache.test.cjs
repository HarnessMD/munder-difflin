'use strict';

/**
 * OpenCode bridge argCache caps (jim's review item 4 — the stop-ship).
 *
 * The breaker's loop arm keys on (tool name + tool_input). OpenCode's
 * `tool.execute.after` payload may not carry the args at all, so the plugin
 * caches them from `tool.execute.before` by callID and attaches them to the
 * after payload. An unbounded cache would be a known leak pushed onto a public
 * main branch; this test proves the caps actually BITE:
 *   - LRU by count: the oldest entry is evicted (its after-payload has NO
 *     tool_input) while a recent entry still resolves;
 *   - TTL: an entry older than the TTL is not returned;
 *   - session.idle clears the cache (turn boundary).
 *
 * It runs the REAL emitted plugin: installOpenCodePlugin() is the same code
 * path a spawn uses, and the file it writes is imported with a stubbed
 * `node:net` so the posted payloads can be inspected.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const loadTs = require('./load-ts.cjs');

const { HiveManager } = loadTs('src/main/hive.ts');

/** Must mirror the constants in hive.ts's OPENCODE_PLUGIN (kept in the plugin
 *  string because it is written as a standalone ESM file). */
const ARG_CACHE_MAX = 64;
const ARG_CACHE_TTL_MS = 10 * 60 * 1000;

const flush = () => new Promise((resolve) => setImmediate(resolve));

async function loadPlugin(t) {
  const home = fs.mkdtempSync(path.join(os.tmpdir(), 'md-opencode-plugin-'));
  const realNow = Date.now;
  let clock = 1_700_000_000_000;
  Date.now = () => clock;
  const realSock = process.env.HIVE_SOCK;
  process.env.HIVE_SOCK = 'stub-socket';
  t.after(() => {
    Date.now = realNow;
    if (realSock === undefined) delete process.env.HIVE_SOCK; else process.env.HIVE_SOCK = realSock;
    fs.rmSync(home, { recursive: true, force: true });
  });

  const hive = new HiveManager(() => home);
  // The production path: this is what a spawn calls to emit the bridge.
  hive.installOpenCodePlugin(home);
  const emitted = path.join(home, '.opencode', 'plugin', 'hive-bridge.js');
  assert.equal(fs.existsSync(emitted), true, 'installOpenCodePlugin must emit the bridge');

  const source = fs.readFileSync(emitted, 'utf8').replace(
    "import { createConnection } from 'node:net';",
    `const __hivePosts = [];
globalThis.__hivePosts = __hivePosts;
const createConnection = (_sock, onConnect) => {
  const conn = {
    on() {},
    end(data) { try { __hivePosts.push(JSON.parse(String(data).trim())); } catch (e) {} }
  };
  queueMicrotask(() => { try { onConnect(); } catch (e) {} });
  return conn;
};`
  );
  assert.doesNotMatch(source, /^import /m, 'the stub must replace the only import');

  const modPath = path.join(home, 'plugin-under-test.mjs');
  fs.writeFileSync(modPath, source, 'utf8');
  const mod = await import(pathToFileURL(modPath).href);
  const bridge = await mod.HiveBridge();
  const tick = async (ms = 0) => { clock += ms; };
  return { bridge, posts: globalThis.__hivePosts, tick };
}

const postToolUse = (posts) => posts.filter((p) => p.hook_event_name === 'PostToolUse');
const lastPost = (posts) => posts[posts.length - 1];

test('the after-payload carries the args cached from the before-hook', async (t) => {
  const { bridge, posts } = await loadPlugin(t);
  await bridge['tool.execute.before']({ callID: 'c1', tool: 'bash' }, { args: { command: 'ls' } });
  await bridge['tool.execute.after']({ callID: 'c1', tool: 'bash' });
  await flush();
  const after = postToolUse(posts).at(-1);
  assert.deepEqual(after.tool_input, { command: 'ls' });
});

test('the LRU count cap bites: the oldest of 100 entries is evicted, a recent one survives', async (t) => {
  const { bridge, posts } = await loadPlugin(t);
  for (let i = 0; i < ARG_CACHE_MAX + 36; i++) {
    await bridge['tool.execute.before']({ callID: `c${i}`, tool: 'bash' }, { args: { i } });
  }
  await bridge['tool.execute.after']({ callID: 'c0', tool: 'bash' });
  await flush();
  assert.equal(postToolUse(posts).at(-1).tool_input, undefined, 'the oldest entry must be gone');

  const newest = `c${ARG_CACHE_MAX + 35}`;
  await bridge['tool.execute.after']({ callID: newest, tool: 'bash' });
  await flush();
  assert.deepEqual(postToolUse(posts).at(-1).tool_input, { i: ARG_CACHE_MAX + 35 });
});

test('the TTL cap bites: an entry older than the TTL is not returned', async (t) => {
  const { bridge, posts, tick } = await loadPlugin(t);
  await bridge['tool.execute.before']({ callID: 'ttl', tool: 'bash' }, { args: { fresh: true } });
  await tick(ARG_CACHE_TTL_MS + 1);
  await bridge['tool.execute.after']({ callID: 'ttl', tool: 'bash' });
  await flush();
  assert.equal(postToolUse(posts).at(-1).tool_input, undefined, 'a stale entry must not be replayed');
});

test('session.idle clears the cache (a turn boundary leaves nothing outstanding)', async (t) => {
  const { bridge, posts } = await loadPlugin(t);
  await bridge['tool.execute.before']({ callID: 'idle', tool: 'bash' }, { args: { x: 1 } });
  await bridge.event({ event: { type: 'session.idle' } });
  await bridge['tool.execute.after']({ callID: 'idle', tool: 'bash' });
  await flush();
  assert.equal(postToolUse(posts).at(-1).tool_input, undefined);
  assert.equal(posts.some((p) => p.hook_event_name === 'Stop'), true, 'idle must still post Stop');
});
