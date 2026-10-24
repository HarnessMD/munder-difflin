'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { constants } = require('node:fs');
const loadTs = require('./load-ts.cjs');

const {
  APPEND_FILE_VALIDATE_EVERY_WRITES,
  JsonlAppendFile
} = loadTs('src/main/jsonlAppendFile.ts');

const UNAVAILABLE_FILE_INODE = 0n;

class FakeFs {
  constructor() {
    this.nextFd = 10;
    this.nextIno = 2n ** 60n;
    this.paths = new Map();
    this.handles = new Map();
    this.contents = new Map();
    this.openCalls = [];
    this.closeCalls = [];
    this.statCalls = 0;
    this.fstatCalls = 0;
    this.writeCalls = [];
    this.written = [];
    this.writePlan = [];
    this.failOpen = false;
    this.failStat = false;
    this.failFstat = false;
    this.failClose = false;
  }

  identity() {
    return { dev: 9n, ino: this.nextIno++ };
  }

  openSync(path, flags) {
    this.openCalls.push([path, flags]);
    if (this.failOpen) throw new Error('open failed');
    let identity = this.paths.get(path);
    if (!identity) {
      identity = this.identity();
      this.paths.set(path, identity);
      this.contents.set(identity.ino, Buffer.alloc(0));
    }
    const fd = this.nextFd++;
    this.handles.set(fd, { ...identity });
    return fd;
  }

  writeSync(fd, buffer, offset, length) {
    if (!this.handles.has(fd)) throw new Error('bad fd');
    this.writeCalls.push({ fd, offset, length });
    const action = this.writePlan.shift();
    if (action instanceof Error) throw action;
    const count = typeof action === 'number' ? Math.min(action, length) : length;
    const chunk = buffer.subarray(offset, offset + count);
    this.written.push(chunk.toString('utf8'));
    const identity = this.handles.get(fd);
    this.contents.set(identity.ino, Buffer.concat([this.contents.get(identity.ino) ?? Buffer.alloc(0), chunk]));
    return count;
  }

  closeSync(fd) {
    this.closeCalls.push(fd);
    this.handles.delete(fd);
    if (this.failClose) throw new Error('close failed');
  }

  fstatSync(fd) {
    this.fstatCalls++;
    if (this.failFstat) throw new Error('fstat failed');
    const identity = this.handles.get(fd);
    if (!identity) throw new Error('bad fd');
    return { ...identity };
  }

  statSync(path) {
    this.statCalls++;
    if (this.failStat) throw new Error('stat failed');
    const identity = this.paths.get(path);
    if (!identity) throw Object.assign(new Error('missing'), { code: 'ENOENT' });
    return { ...identity };
  }

  replace(path) {
    const identity = this.identity();
    this.paths.set(path, identity);
    this.contents.set(identity.ino, Buffer.alloc(0));
  }

  readPath(path) {
    const identity = this.paths.get(path);
    return identity ? this.contents.get(identity.ino)?.toString('utf8') : undefined;
  }
}

test('repeated appends reuse one descriptor and retain byte order', () => {
  const fsOps = new FakeFs();
  const file = new JsonlAppendFile({ fsOps });

  assert.equal(file.append('log.jsonl', 'one\n'), true);
  assert.equal(file.append('log.jsonl', 'two\n'), true);

  assert.equal(fsOps.openCalls.length, 1);
  assert.equal(
    fsOps.openCalls[0][1],
    constants.O_WRONLY | constants.O_APPEND | constants.O_CREAT,
    'open must permit write, append, and create without truncating the file'
  );
  assert.equal(fsOps.statCalls, 0, 'the production cadence must not stat every row');
  assert.equal(fsOps.written.join(''), 'one\ntwo\n');
  assert.equal(APPEND_FILE_VALIDATE_EVERY_WRITES, 16);
});

test('the production validation cadence bounds writes to a replaced path', () => {
  const fsOps = new FakeFs();
  const file = new JsonlAppendFile({ fsOps });
  const filePath = 'log.jsonl';
  assert.equal(file.append(filePath, 'before\n'), true);
  fsOps.replace(filePath);

  for (let write = 1; write < APPEND_FILE_VALIDATE_EVERY_WRITES; write++) {
    assert.equal(file.append(filePath, `stale-${write}\n`), true);
  }
  assert.equal(fsOps.readPath(filePath), '', 'old descriptor remains writable until the next validation');
  assert.equal(file.append(filePath, 'recovered\n'), true);
  assert.equal(fsOps.readPath(filePath), 'recovered\n');
  assert.equal(fsOps.statCalls, 1);
  assert.equal(fsOps.openCalls.length, 2);
});

test('partial writes continue from the remaining bytes', () => {
  const fsOps = new FakeFs();
  fsOps.writePlan.push(2, 1);
  const file = new JsonlAppendFile({ fsOps });

  assert.equal(file.append('log.jsonl', 'hello\n'), true);
  assert.equal(fsOps.written.join(''), 'hello\n');
  assert.deepEqual(fsOps.writeCalls.map((call) => call.offset), [0, 2, 3]);
});

test('a failure after a partial write invalidates without replaying the row', () => {
  const fsOps = new FakeFs();
  fsOps.writePlan.push(2, new Error('disk stopped'));
  const file = new JsonlAppendFile({ fsOps });

  assert.equal(file.append('log.jsonl', 'hello\n'), false);
  assert.equal(fsOps.written.join(''), 'he');
  assert.equal(fsOps.closeCalls.length, 1);

  assert.equal(file.append('log.jsonl', 'next\n'), true);
  assert.equal(fsOps.openCalls.length, 2);
  assert.equal(fsOps.written.join(''), 'henext\n', 'the uncertain hello row must not replay');
});

test('a first-write failure invalidates and the next append opens afresh', () => {
  const fsOps = new FakeFs();
  fsOps.writePlan.push(new Error('write denied'));
  const file = new JsonlAppendFile({ fsOps });

  assert.equal(file.append('log.jsonl', 'failed\n'), false);
  assert.equal(fsOps.readPath('log.jsonl'), '');
  assert.equal(fsOps.closeCalls.length, 1);
  assert.equal(file.append('log.jsonl', 'recovered\n'), true);
  assert.equal(fsOps.readPath('log.jsonl'), 'recovered\n');
  assert.equal(fsOps.openCalls.length, 2);
});

test('path changes close the old descriptor and lazily open the new path', () => {
  const fsOps = new FakeFs();
  const file = new JsonlAppendFile({ fsOps });

  file.append('a.jsonl', 'a\n');
  file.append('b.jsonl', 'b\n');

  assert.deepEqual(fsOps.openCalls.map(([path]) => path), ['a.jsonl', 'b.jsonl']);
  assert.equal(fsOps.closeCalls.length, 1);
});

test('close is idempotent and a later append reopens lazily', () => {
  const fsOps = new FakeFs();
  const file = new JsonlAppendFile({ fsOps });
  file.append('a.jsonl', 'a\n');

  file.close();
  file.close();
  assert.equal(fsOps.closeCalls.length, 1);

  assert.equal(file.append('a.jsonl', 'b\n'), true);
  assert.equal(fsOps.openCalls.length, 2);
});

test('open failure is bounded to one attempt and a later append can recover', () => {
  const fsOps = new FakeFs();
  const file = new JsonlAppendFile({ fsOps });
  fsOps.failOpen = true;

  assert.equal(file.append('a.jsonl', 'a\n'), false);
  assert.equal(fsOps.openCalls.length, 1);

  fsOps.failOpen = false;
  assert.equal(file.append('a.jsonl', 'b\n'), true);
  assert.equal(fsOps.openCalls.length, 2);
});

test('validation reopens a pathname that was externally replaced', () => {
  const fsOps = new FakeFs();
  const file = new JsonlAppendFile({ fsOps, validateEveryWrites: 1 });
  file.append('a.jsonl', 'old\n');

  fsOps.replace('a.jsonl');
  assert.equal(file.append('a.jsonl', 'new\n'), true);

  assert.equal(fsOps.statCalls, 1);
  assert.equal(fsOps.openCalls.length, 2);
  assert.equal(fsOps.closeCalls.length, 1);
  assert.equal(fsOps.readPath('a.jsonl'), 'new\n', 'the new row must land in the replacement file');
});

test('missing paths and validation failures invalidate stale handles', () => {
  for (const failure of ['missing', 'stat', 'fstat']) {
    const fsOps = new FakeFs();
    const file = new JsonlAppendFile({ fsOps, validateEveryWrites: 1 });
    file.append('a.jsonl', 'old\n');
    if (failure === 'missing') fsOps.paths.delete('a.jsonl');
    if (failure === 'stat') fsOps.failStat = true;
    if (failure === 'fstat') fsOps.failFstat = true;

    const appended = file.append('a.jsonl', 'new\n');
    assert.ok(fsOps.closeCalls.length >= 1, `${failure} must close the stale fd`);
    assert.ok(fsOps.openCalls.length <= 2, `${failure} must not enter a retry loop`);
    assert.equal(appended, failure !== 'fstat');
    if (failure === 'missing') {
      assert.equal(fsOps.readPath('a.jsonl'), 'new\n', 'a missing path must be recreated, not written through the old fd');
    }
  }
});

test('zero identity conservatively reopens and BigInt identities stay exact', () => {
  const fsOps = new FakeFs();
  fsOps.paths.set('unknown.jsonl', { dev: 9n, ino: UNAVAILABLE_FILE_INODE });
  const unknown = new JsonlAppendFile({ fsOps, validateEveryWrites: 1 });
  unknown.append('unknown.jsonl', 'one\n');
  unknown.append('unknown.jsonl', 'two\n');
  assert.equal(fsOps.openCalls.length, 2, 'an unavailable inode must not be treated as stable identity');

  const exactFs = new FakeFs();
  exactFs.paths.set('exact.jsonl', { dev: 2n ** 61n, ino: 2n ** 62n + 1n });
  const exact = new JsonlAppendFile({ fsOps: exactFs, validateEveryWrites: 1 });
  exact.append('exact.jsonl', 'one\n');
  exact.append('exact.jsonl', 'two\n');
  assert.equal(exactFs.openCalls.length, 1, 'large BigInt identity must compare without Number coercion');
});

test('close and diagnostic failures remain contained', () => {
  const fsOps = new FakeFs();
  const file = new JsonlAppendFile({
    fsOps,
    onDiagnostic: () => { throw new Error('diagnostic failed'); }
  });
  file.append('a.jsonl', 'one\n');
  fsOps.failClose = true;
  assert.doesNotThrow(() => file.close());
  assert.doesNotThrow(() => file.close());

  fsOps.failClose = false;
  assert.equal(file.append('a.jsonl', 'two\n'), true);
  assert.equal(fsOps.openCalls.length, 2, 'close failure must still forget the old fd');
});
