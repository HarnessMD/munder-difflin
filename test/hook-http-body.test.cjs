'use strict';

/**
 * HTTP hook path (core/hookServer.ts onHttp): a PostToolUse POST carries the raw
 * payload, and nothing upstream trims it. A Read of a PNG puts the image in
 * tool_response, which pushed the body past the 256 KB socket frame limit and got
 * the whole event refused with 413. The HTTP body now has its own cap, and
 * tool_response (which the app never reads) is dropped before handle().
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const { EventEmitter } = require('node:events');
const loadTs = require('./load-ts.cjs');

const { HookServer } = loadTs('src/core/hookServer.ts');

function makeServer() {
  const logs = [];
  const hive = { appendLog: (e) => logs.push(e) };
  const server = new HookServer(hive, () => null, () => ({}));
  const handled = [];
  // Record what reaches handle(); the reply is an empty object, as for any hook.
  server.handle = (p) => { handled.push(p); return {}; };
  return { server, logs, handled };
}

function fakeReq(url, token, body) {
  const req = new EventEmitter();
  req.method = 'POST';
  req.url = url;
  req.headers = { authorization: `Bearer ${token}` };
  req.socket = { destroyed: false };
  req.body = body;
  return req;
}

function fakeRes() {
  const res = {
    statusCode: null,
    body: undefined,
    destroyed: false,
    writeHead(code) { this.statusCode = code; return this; },
    end(data, cb) {
      this.body = typeof data === 'function' ? undefined : data;
      const done = typeof data === 'function' ? data : cb;
      if (typeof done === 'function') done();
      return this;
    },
  };
  return res;
}

/** Emit a body in 64 KB chunks, the way a socket delivers it, then end. */
function send(server, req, res) {
  server.onHttp(req, res);
  const buf = Buffer.from(req.body, 'utf8');
  for (let i = 0; i < buf.length; i += 64 * 1024) req.emit('data', buf.subarray(i, i + 64 * 1024));
  req.emit('end');
}

test('an HTTP hook over the 256 KB socket frame limit is accepted, and its tool_response is dropped', () => {
  const { server, handled, logs } = makeServer();
  const token = server.httpToken;
  const image = 'A'.repeat(320 * 1024); // stands in for a base64 PNG in tool_response
  const payload = {
    hook_event_name: 'PostToolUse',
    session_id: 's1',
    tool_name: 'Read',
    tool_input: { file_path: '/tmp/shot.png' },
    tool_response: { type: 'image', data: image },
  };
  const req = fakeReq('/hook/agent-1', token, JSON.stringify(payload));
  const res = fakeRes();
  send(server, req, res);

  assert.equal(res.statusCode, 200, 'the event must not be refused');
  assert.equal(handled.length, 1, 'the event must reach handle()');
  assert.equal(handled[0].hook_event_name, 'PostToolUse');
  assert.deepEqual(handled[0].tool_input, { file_path: '/tmp/shot.png' }, 'tool_input is kept');
  assert.equal('tool_response' in handled[0], false, 'tool_response is dropped before handle()');
  assert.equal(logs.some((l) => l.kind === 'hook-frame-rejected'), false);
});

test('an HTTP hook over the HTTP body cap is still refused with 413 and logged', () => {
  const { server, handled, logs } = makeServer();
  const token = server.httpToken;
  const payload = { hook_event_name: 'PostToolUse', tool_name: 'Write', tool_input: { content: 'B'.repeat(5 * 1024 * 1024) } };
  const req = fakeReq('/hook/agent-1', token, JSON.stringify(payload));
  const res = fakeRes();
  send(server, req, res);

  assert.equal(res.statusCode, 413);
  assert.equal(handled.length, 0, 'an over-cap body never reaches handle()');
  const rejected = logs.find((l) => l.kind === 'hook-frame-rejected');
  assert.ok(rejected, 'the rejection is logged');
  assert.equal(rejected.reason, 'frame-too-large');
});
