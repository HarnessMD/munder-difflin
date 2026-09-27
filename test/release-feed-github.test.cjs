'use strict';
// The public build updates from GitHub Releases on chaitanyagiri/munder-difflin,
// so every 0.4.x install that polls that feed is offered the next release. These
// pins keep the Pro server feed (a generic provider, RELEASES_URL) from coming
// back in with a backfill.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const { REPO, installerUrl } = loadTs('src/shared/updateState.ts');

test('electron-builder publishes to GitHub Releases on the public repo', () => {
  const yml = read('electron-builder.yml');
  const block = /^publish:\n((?:[ \t]+.*\n)+)/m.exec(yml);
  assert.ok(block, 'electron-builder.yml has a publish block');
  assert.match(block[1], /^\s*provider:\s*github\s*$/m);
  assert.match(block[1], /^\s*owner:\s*chaitanyagiri\s*$/m);
  assert.match(block[1], /^\s*repo:\s*munder-difflin\s*$/m);
  assert.doesNotMatch(block[1], /url:|generic/);
  assert.equal(REPO, 'chaitanyagiri/munder-difflin');
});

test('installerUrl names the GitHub release asset for this machine', () => {
  const base = 'https://github.com/chaitanyagiri/munder-difflin/releases/download/v0.5.4';
  assert.equal(installerUrl('0.5.4', 'darwin', 'arm64'), `${base}/Munder-Difflin-0.5.4-mac-universal.dmg`);
  assert.equal(installerUrl('v0.5.4', 'darwin', 'x64'), `${base}/Munder-Difflin-0.5.4-mac-universal.dmg`);
  assert.equal(installerUrl('0.5.4', 'win32', 'x64'), `${base}/Munder-Difflin-0.5.4-win-x64-setup.exe`);
  assert.equal(installerUrl('0.5.4', 'linux', 'x64'), `${base}/Munder-Difflin-0.5.4-linux-x86_64.AppImage`);
  assert.match(read('electron-builder.yml'), /target: dmg\s*\n\s*arch: \[universal\]/,
    'the DMG must stay universal or installerUrl names a file that does not exist');
});

test('no update surface points at the Pro release server', () => {
  for (const p of ['electron-builder.yml', 'src/shared/updateState.ts', 'src/main/updater.ts',
    'src/renderer/src/components/UpdateToast.tsx', '.github/workflows/release.yml']) {
    const src = read(p);
    assert.doesNotMatch(src, /app\.harnessmd\.com\/(releases|download)/, p);
    assert.doesNotMatch(src, /RELEASES_(URL|SSH_KEY|HOST|PATH)/, p);
  }
  assert.ok(!fs.existsSync(path.join(root, '.github/workflows/notes.yml')), 'notes.yml is Pro only');
});
