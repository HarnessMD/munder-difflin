'use strict';

/* F16: the release workflow builds the transcription helpers on every runner
 * before electron-builder packages, and on macOS rebuilds md-speech and refuses
 * a checked in binary the runner did not reproduce. The workflow cannot run
 * from here (it is the release), so its shape is pinned: one helper target per
 * matrix entry, the build step before the compile and package steps, the
 * md-speech check mac only with a hard exit. Red on 64645603: no helper step. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const yaml = require('js-yaml');

const wf = yaml.load(fs.readFileSync(path.join(__dirname, '..', '.github', 'workflows', 'release.yml'), 'utf8'));
const build = wf.jobs.build;
const steps = build.steps;
const nameOf = (s) => s.name ?? s.uses ?? '';
const indexOf = (re) => steps.findIndex((s) => re.test(nameOf(s)));

test('every runner names the helper target it builds', () => {
  const targets = Object.fromEntries(build.strategy.matrix.include.map((m) => [m.os, m.helper]));
  assert.deepEqual(targets, { 'macos-latest': 'darwin-universal', 'windows-2022': 'win32-x64', 'ubuntu-latest': 'linux-x64' });
});

test('the whisper helper is built after npm ci and before compile and package', () => {
  const install = indexOf(/Install dependencies/);
  const helper = steps.findIndex((s) => /build-transcribe-helpers\.mjs --target \$\{\{ matrix\.helper \}\}/.test(s.run ?? ''));
  const compile = indexOf(/Compile/);
  const pkg = indexOf(/Package installers/);
  assert.ok(helper > install, 'the helper build needs node_modules (the script is plain node, but npm ci also pins the node on PATH)');
  assert.ok(helper < compile && helper < pkg, 'the helper must exist before electron-builder copies extraResources');
  assert.equal(steps[helper].if, undefined, 'the whisper helper is built on every runner, no platform condition');
  assert.match(steps[helper].run, /cmake --version/, 'the toolchain version is printed for the log');
});

test('md-speech and md-hotkey are rebuilt on macOS only and a differing binary fails the job', () => {
  const i = steps.findIndex((s) => /build-md-speech\.sh/.test(s.run ?? ''));
  assert.ok(i >= 0, 'no Swift helper rebuild step');
  const s = steps[i];
  assert.equal(s.if, "matrix.os == 'macos-latest'");
  // Every checked in Mach-O under darwin-universal that has a Swift source and
  // a build script must be rebuilt and compared by this step.
  const helpersDir = path.join(__dirname, '..', 'resources', 'transcribe', 'darwin-universal');
  const swiftHelpers = fs.readdirSync(path.join(__dirname, '..', 'tools')).filter((d) => /^md-/.test(d) && fs.existsSync(path.join(__dirname, '..', 'tools', d, 'main.swift')));
  assert.ok(swiftHelpers.includes('md-speech') && swiftHelpers.includes('md-hotkey'), JSON.stringify(swiftHelpers));
  for (const h of swiftHelpers) {
    assert.ok(fs.existsSync(path.join(helpersDir, h)), `${h} is not checked in`);
    assert.match(s.run, new RegExp(`sh tools/build-${h}\\.sh`), `${h} is not rebuilt`);
  }
  assert.match(s.run, /git diff --exit-code[^\n]*resources\/transcribe\/darwin-universal\/\$helper/, 'each helper is compared to the checked in file');
  assert.match(s.run, /for helper in md-speech md-hotkey md-tap; do/, 'the loop names every Swift helper');
  assert.match(s.run, /exit \$differs/, 'a differing binary must fail the job, not warn');
  assert.ok(i < indexOf(/Package installers/), 'the check runs before packaging');
});

test('the helper build script has no macOS only path handling', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'tools', 'build-transcribe-helpers.mjs'), 'utf8');
  assert.ok(!/new URL\(import\.meta\.url\)\.pathname/.test(src), 'URL.pathname is /C:/… on Windows; use fileURLToPath');
  assert.match(src, /fileURLToPath\(import\.meta\.url\)/);
});
