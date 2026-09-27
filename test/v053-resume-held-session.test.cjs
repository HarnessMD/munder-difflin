'use strict';
// 0.5.3 user report: Restart & Continue answered that the Claude session was
// already active, attach or stop it. Claude Code refuses --resume while its
// registry (sessions/<pid>.json, jobs/<short>/state.json) holds the id.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawn, execFileSync } = require('node:child_process');
const loadTs = require('./load-ts.cjs');
const { findSessionHolders, releaseClaudeSession } = loadTs('src/main/claudeSessionRelease.ts');

const SID = '11111111-2222-3333-4444-555555555555';
function claudeDir() {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), 'md-cdir-'));
  fs.mkdirSync(path.join(d, 'sessions'));
  fs.mkdirSync(path.join(d, 'jobs'));
  return d;
}
function job(d, short, body) {
  fs.mkdirSync(path.join(d, 'jobs', short));
  fs.writeFileSync(path.join(d, 'jobs', short, 'state.json'), JSON.stringify(body));
}

test('holders: interactive by pid, background by job, others ignored', () => {
  const d = claudeDir();
  fs.writeFileSync(path.join(d, 'sessions', '4242.json'), JSON.stringify({ pid: 4242, sessionId: SID, procStart: 'x' }));
  fs.writeFileSync(path.join(d, 'sessions', '4343.json'), JSON.stringify({ pid: 4343, sessionId: 'other' }));
  fs.writeFileSync(path.join(d, 'sessions', 'junk.json'), '{not json');
  job(d, 'aaaa1111', { sessionId: SID, daemonShort: 'aaaa1111', state: 'done' });
  job(d, 'bbbb2222', { sessionId: SID, state: 'stopped' });
  job(d, 'cccc3333', { resumeSessionId: SID, state: 'blocked' });
  job(d, 'dddd4444', { sessionId: 'other', state: 'running' });
  const h = findSessionHolders(SID, d, 1);
  assert.deepEqual(h.filter((x) => x.kind === 'interactive').map((x) => x.pid), [4242]);
  // 'done' still holds the session (idle, listed as active); 'stopped' does not.
  assert.deepEqual(h.filter((x) => x.kind === 'background').map((x) => x.shortId).sort(), ['aaaa1111', 'cccc3333']);
  assert.deepEqual(findSessionHolders(SID, path.join(d, 'missing')), []);
  assert.deepEqual(findSessionHolders('', d), []);
});

test('release: background sessions get `claude stop <short>`', { skip: process.platform === 'win32' }, async () => {
  const d = claudeDir();
  job(d, 'aaaa1111', { sessionId: SID, daemonShort: 'aaaa1111', state: 'idle' });
  const log = path.join(d, 'argv.log');
  const fake = path.join(d, 'claude');
  fs.writeFileSync(fake, `#!/bin/sh\necho "$@" >> "${log}"\n`, { mode: 0o755 });
  const done = await releaseClaudeSession(SID, d, fake);
  assert.deepEqual(done, ['stop aaaa1111 ok']);
  assert.equal(fs.readFileSync(log, 'utf8').trim(), 'stop aaaa1111');
});

test('release: a live holder with a matching start time is ended', { skip: process.platform === 'win32' }, async () => {
  const d = claudeDir();
  const child = spawn('sleep', ['60'], { stdio: 'ignore' });
  await new Promise((r) => child.once('spawn', r));
  const procStart = execFileSync('ps', ['-o', 'lstart=', '-p', String(child.pid)], { encoding: 'utf8' }).trim();
  fs.writeFileSync(path.join(d, 'sessions', `${child.pid}.json`), JSON.stringify({ pid: child.pid, sessionId: SID, procStart }));
  const exited = new Promise((r) => child.once('exit', r));
  const done = await releaseClaudeSession(SID, d, '/bin/false');
  assert.deepEqual(done, [`term ${child.pid} ok`]);
  await exited;
});

test('release: a reused pid (start time differs) is never signalled', { skip: process.platform === 'win32' }, async () => {
  const d = claudeDir();
  const child = spawn('sleep', ['60'], { stdio: 'ignore' });
  await new Promise((r) => child.once('spawn', r));
  fs.writeFileSync(path.join(d, 'sessions', `${child.pid}.json`), JSON.stringify({ pid: child.pid, sessionId: SID, procStart: 'Mon Jan  1 00:00:00 2001' }));
  const done = await releaseClaudeSession(SID, d, '/bin/false');
  assert.deepEqual(done, [`skip ${child.pid} (not verifiable)`]);
  assert.equal(child.exitCode, null);
  child.kill();
});

test('main frees the session right after choosing --resume', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'src/main/index.ts'), 'utf8');
  const at = src.indexOf("args.push('--resume', sid);");
  assert.ok(at > 0);
  assert.ok(src.slice(at, at + 900).includes('await releaseClaudeSession(sid'), 'release must follow the --resume choice');
});
