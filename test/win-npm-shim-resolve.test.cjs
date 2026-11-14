'use strict';

/**
 * resolveWindowsNpmShim — the filesystem half of the Windows shim path.
 *
 * `where <cmd>` on Windows lists the EXTENSIONLESS npm shim (a POSIX sh script)
 * before its `.cmd` sibling, e.g. `C:\nvm4w\nodejs\opencode` then `opencode.cmd`.
 * Spawning the extensionless file directly fails with ENOENT, so any launcher
 * that takes the first `where` hit has to map it back to a real program. This is
 * the helper both the PTY path and non-PTY launches share for that.
 *
 * Every case runs against real files in a temp dir, never a global install.
 * Shim targets are expanded as win32 paths, so the cases whose answer depends
 * on the target existing on disk only run on a Windows host.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { resolveWindowsNpmShim } = loadTs('src/main/pty.ts');

const winOnly = process.platform !== 'win32' && 'shim targets are win32 paths; needs a Windows host';
const NODE_EXE = 'C:\\Program Files\\nodejs\\node.exe';

/** What `npm i -g opencode-ai` writes (cmd-shim >= 4). */
const MODERN_SHIM = [
  '@ECHO off',
  'GOTO start',
  ':find_dp0',
  'SET dp0=%~dp0',
  'EXIT /b',
  ':start',
  'SETLOCAL',
  'CALL :find_dp0',
  '',
  'IF EXIST "%dp0%\\node.exe" (',
  '  SET "_prog=%dp0%\\node.exe"',
  ') ELSE (',
  '  SET "_prog=node"',
  '  SET PATHEXT=%PATHEXT:;.JS;=;%',
  ')',
  '',
  'endLocal & goto #_undefined_# 2>NUL || title %COMSPEC% & "%_prog%"  "%dp0%\\node_modules\\opencode-ai\\bin\\opencode.js" %*'
].join('\r\n');

/** What npm writes for a package whose bin is a native binary. */
const DIRECT_EXE_SHIM = [
  '@ECHO off',
  'GOTO start',
  ':find_dp0',
  'SET dp0=%~dp0',
  'EXIT /b',
  ':start',
  'SETLOCAL',
  'CALL :find_dp0',
  '"%dp0%\\node_modules\\opencode-ai\\bin\\opencode.exe"   %*'
].join('\r\n');

/** The extensionless sibling: sh syntax, which is why it cannot be spawned. */
const SH_SHIM = '#!/bin/sh\nexec node "$basedir/node_modules/opencode-ai/bin/opencode.js" "$@"\n';

/** A fresh npm-like global dir with a shim and, optionally, the script it names. */
function npmDir(t, { shim = MODERN_SHIM, ext = '.cmd', script = 'opencode.js' } = {}) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-npm-shim-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'opencode'), SH_SHIM);
  fs.writeFileSync(path.join(dir, `opencode${ext}`), shim);
  if (script) {
    const bin = path.join(dir, 'node_modules', 'opencode-ai', 'bin');
    fs.mkdirSync(bin, { recursive: true });
    fs.writeFileSync(path.join(bin, script), '');
  }
  return dir;
}

const scriptIn = (dir, name = 'opencode.js') =>
  path.join(dir, 'node_modules', 'opencode-ai', 'bin', name);
const onlyNode = (exe) => (cmd) => (cmd === 'node' ? exe : null);

test('extensionless shim (first `where` hit) resolves via its .cmd sibling', { skip: winOnly }, (t) => {
  const dir = npmDir(t);
  assert.deepEqual(
    resolveWindowsNpmShim(path.join(dir, 'opencode'), onlyNode(NODE_EXE)),
    { file: NODE_EXE, prefixArgs: [scriptIn(dir)] }
  );
});

test('the .cmd itself resolves to the same interpreter + script', { skip: winOnly }, (t) => {
  const dir = npmDir(t);
  assert.deepEqual(
    resolveWindowsNpmShim(path.join(dir, 'opencode.cmd'), onlyNode(NODE_EXE)),
    { file: NODE_EXE, prefixArgs: [scriptIn(dir)] }
  );
});

test('a .bat shim is read the same way', { skip: winOnly }, (t) => {
  const dir = npmDir(t, { ext: '.bat' });
  assert.deepEqual(
    resolveWindowsNpmShim(path.join(dir, 'opencode.bat'), onlyNode(NODE_EXE)),
    { file: NODE_EXE, prefixArgs: [scriptIn(dir)] }
  );
});

test('a native-exe shim resolves to the binary with no prefix args', { skip: winOnly }, (t) => {
  const dir = npmDir(t, { shim: DIRECT_EXE_SHIM, script: 'opencode.exe' });
  const lookups = [];
  const result = resolveWindowsNpmShim(path.join(dir, 'opencode'), (cmd) => {
    lookups.push(cmd);
    return NODE_EXE;
  });
  assert.deepEqual(result, { file: scriptIn(dir, 'opencode.exe'), prefixArgs: [] });
  assert.deepEqual(lookups, [], 'no interpreter is looked up for a native binary');
});

test('a shim whose script is missing on disk returns null', (t) => {
  const dir = npmDir(t, { script: null });
  assert.equal(resolveWindowsNpmShim(path.join(dir, 'opencode'), onlyNode(NODE_EXE)), null);
  assert.equal(resolveWindowsNpmShim(path.join(dir, 'opencode.cmd'), onlyNode(NODE_EXE)), null);
});

test('an interpreter that only resolves to a .cmd returns null', { skip: winOnly }, (t) => {
  const dir = npmDir(t);
  const file = path.join(dir, 'opencode');
  assert.equal(resolveWindowsNpmShim(file, onlyNode('C:\\tools\\node.cmd')), null);
  assert.equal(resolveWindowsNpmShim(file, () => null), null, 'interpreter not installed');
});

test('an oversized "shim" is somebody\'s real batch file and returns null', (t) => {
  const dir = npmDir(t, { shim: `${MODERN_SHIM}\r\nREM ${'x'.repeat(9000)}` });
  assert.equal(resolveWindowsNpmShim(path.join(dir, 'opencode'), onlyNode(NODE_EXE)), null);
});

test('an extensionless file with no .cmd sibling returns null', (t) => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'md-npm-shim-'));
  t.after(() => fs.rmSync(dir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dir, 'opencode'), SH_SHIM);
  assert.equal(resolveWindowsNpmShim(path.join(dir, 'opencode'), onlyNode(NODE_EXE)), null);
  assert.equal(resolveWindowsNpmShim(path.join(dir, 'missing'), onlyNode(NODE_EXE)), null);
});
