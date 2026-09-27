#!/usr/bin/env node
// Build the local transcription helper (F16) for one target and fetch the
// bundled model. Run on the matching host; there is no cross compile except
// macOS, where one Mac builds both slices and lipo joins them.
//
//   node tools/build-transcribe-helpers.mjs [--target darwin-universal|darwin-arm64|darwin-x64|win32-x64|linux-x64]
//                                           [--jobs N] [--cmake /path/to/cmake] [--skip-model] [--skip-build] [--skip-hotkey]
//
// Output: resources/transcribe/<target>/md-whisper[.exe],
//         resources/transcribe/<target>/md-hotkey[.exe] on win32-x64 and linux-x64
//         (tools/md-hotkey-native, the C half of "dictate into any app" off the
//         Mac; macOS keeps its Swift helper from tools/build-md-hotkey.sh), and
//         resources/transcribe/models/ggml-base.en-q5_1.bin (sha256 checked).
// All are gitignored; electron-builder ships them through extraResources.
//
// whisper.cpp is checked out at WHISPER_COMMIT under .cache/whisper.cpp (or the
// directory in WHISPER_CPP_DIR). The pinned commit is the one the F16 benchmark
// ran on; move it only with a rerun of hive/shared/v053/F16-WHISPER-BENCH.md.
import { execFileSync, spawnSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const WHISPER_REPO = 'https://github.com/ggml-org/whisper.cpp.git';
export const WHISPER_COMMIT = 'a44e07845931421bb6f3447ce0010ed9dc76a118';
export const BUNDLED_MODEL = {
  file: 'ggml-base.en-q5_1.bin',
  url: 'https://huggingface.co/ggerganov/whisper.cpp/resolve/main/ggml-base.en-q5_1.bin',
  sha256: '4baf70dd0d7c4247ba2b81fafd9c01005ac77c2f9ef064e00dcf195d0e2fdd2f',
  bytes: 59721011
};

// fileURLToPath, not URL.pathname: on Windows the pathname is '/C:/…', which is not a path.
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const CACHE = path.join(ROOT, '.cache');
const HELPER_SRC = path.join(ROOT, 'tools', 'transcribe-helper');
const OUT_ROOT = path.join(ROOT, 'resources', 'transcribe');

function hostTarget() {
  if (process.platform === 'darwin') return 'darwin-universal';
  if (process.platform === 'win32') return 'win32-x64';
  return 'linux-x64';
}

function parseArgs(argv) {
  const o = { target: hostTarget(), jobs: Math.max(1, os.cpus().length), cmake: process.env.CMAKE || 'cmake', skipModel: false, skipBuild: false, skipHotkey: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--target') o.target = argv[++i];
    else if (a === '--jobs') o.jobs = Number(argv[++i]);
    else if (a === '--cmake') o.cmake = argv[++i];
    else if (a === '--skip-model') o.skipModel = true;
    else if (a === '--skip-build') o.skipBuild = true;
    else if (a === '--skip-hotkey') o.skipHotkey = true;
    else throw new Error(`unknown argument ${a}`);
  }
  return o;
}

function run(cmd, args, opts = {}) {
  console.log(`$ ${cmd} ${args.join(' ')}`);
  const r = spawnSync(cmd, args, { stdio: 'inherit', ...opts });
  if (r.status !== 0) throw new Error(`${cmd} exited ${r.status ?? r.signal}`);
}

function ensureWhisperCheckout() {
  const dir = process.env.WHISPER_CPP_DIR || path.join(CACHE, 'whisper.cpp');
  if (!fs.existsSync(path.join(dir, '.git'))) {
    fs.mkdirSync(path.dirname(dir), { recursive: true });
    run('git', ['clone', '--quiet', WHISPER_REPO, dir]);
  }
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: dir }).toString().trim();
  if (head !== WHISPER_COMMIT) {
    run('git', ['fetch', '--quiet', 'origin', WHISPER_COMMIT], { cwd: dir });
    run('git', ['checkout', '--quiet', WHISPER_COMMIT], { cwd: dir });
  }
  return dir;
}

// Per slice cmake flags. GGML_NATIVE is OFF everywhere: a helper built with
// -march=native on the release machine dies with an illegal instruction on an
// older CPU. x64 gets the 2013 baseline (AVX2, FMA, F16C). OpenMP off outside
// macOS so the binary does not need libgomp beside it.
function sliceFlags(slice) {
  const common = ['-DCMAKE_BUILD_TYPE=Release', '-DGGML_NATIVE=OFF', '-DBUILD_SHARED_LIBS=OFF'];
  switch (slice) {
    case 'darwin-arm64':
      return [...common, '-DCMAKE_OSX_ARCHITECTURES=arm64', '-DCMAKE_OSX_DEPLOYMENT_TARGET=12.0',
        '-DGGML_METAL=ON', '-DGGML_METAL_EMBED_LIBRARY=ON', '-DGGML_ACCELERATE=ON'];
    case 'darwin-x64':
      return [...common, '-DCMAKE_OSX_ARCHITECTURES=x86_64', '-DCMAKE_OSX_DEPLOYMENT_TARGET=10.15',
        '-DGGML_METAL=OFF', '-DGGML_ACCELERATE=ON', '-DGGML_AVX2=ON', '-DGGML_FMA=ON', '-DGGML_F16C=ON'];
    case 'win32-x64':
      return [...common, '-DGGML_OPENMP=OFF', '-DGGML_AVX2=ON', '-DGGML_FMA=ON', '-DGGML_F16C=ON'];
    case 'linux-x64':
      return [...common, '-DGGML_OPENMP=OFF', '-DGGML_AVX2=ON', '-DGGML_FMA=ON', '-DGGML_F16C=ON',
        '-DCMAKE_EXE_LINKER_FLAGS=-static-libstdc++ -static-libgcc'];
    default:
      throw new Error(`unknown slice ${slice}`);
  }
}

function buildSlice(slice, whisperDir, o) {
  const buildDir = path.join(CACHE, 'transcribe-build', slice);
  fs.mkdirSync(buildDir, { recursive: true });
  const configure = ['-S', HELPER_SRC, '-B', buildDir, `-DWHISPER_CPP_DIR=${whisperDir}`, `-DMD_WHISPER_COMMIT=${WHISPER_COMMIT}`, ...sliceFlags(slice)];
  run(o.cmake, configure);
  run(o.cmake, ['--build', buildDir, '--config', 'Release', '--target', 'md-whisper', '--parallel', String(o.jobs)]);
  const exe = slice === 'win32-x64' ? 'md-whisper.exe' : 'md-whisper';
  for (const candidate of [path.join(buildDir, exe), path.join(buildDir, 'Release', exe)]) {
    if (fs.existsSync(candidate)) return candidate;
  }
  throw new Error(`built ${slice} but no ${exe} under ${buildDir}`);
}

function installBinary(target, from) {
  const exe = target === 'win32-x64' ? 'md-whisper.exe' : 'md-whisper';
  const dir = path.join(OUT_ROOT, target);
  fs.mkdirSync(dir, { recursive: true });
  const to = path.join(dir, exe);
  fs.copyFileSync(from, to);
  if (target !== 'win32-x64') fs.chmodSync(to, 0o755);
  console.log(`installed ${to} (${fs.statSync(to).size} bytes)`);
  return to;
}

const HOTKEY_SRC = path.join(ROOT, 'tools', 'md-hotkey-native');

/** md-hotkey off the Mac (F16): the C helper for the target's platform, from
 *  tools/md-hotkey-native. Windows links static; Linux needs libx11, libxtst
 *  and libpulse-simple headers (release.yml installs them). */
function buildHotkey(target, o) {
  const buildDir = path.join(CACHE, 'hotkey-build', target);
  fs.mkdirSync(buildDir, { recursive: true });
  const flags = ['-DCMAKE_BUILD_TYPE=Release'];
  if (target === 'linux-x64') flags.push('-DCMAKE_EXE_LINKER_FLAGS=-static-libgcc');
  run(o.cmake, ['-S', HOTKEY_SRC, '-B', buildDir, ...flags]);
  run(o.cmake, ['--build', buildDir, '--config', 'Release', '--target', 'md-hotkey', '--parallel', String(o.jobs)]);
  const exe = target === 'win32-x64' ? 'md-hotkey.exe' : 'md-hotkey';
  for (const candidate of [path.join(buildDir, exe), path.join(buildDir, 'Release', exe)]) {
    if (fs.existsSync(candidate)) {
      const dir = path.join(OUT_ROOT, target);
      fs.mkdirSync(dir, { recursive: true });
      const to = path.join(dir, exe);
      fs.copyFileSync(candidate, to);
      if (target !== 'win32-x64') fs.chmodSync(to, 0o755);
      console.log(`installed ${to} (${fs.statSync(to).size} bytes)`);
      return to;
    }
  }
  throw new Error(`built md-hotkey for ${target} but no ${exe} under ${buildDir}`);
}

function sha256(file) {
  const h = createHash('sha256');
  h.update(fs.readFileSync(file));
  return h.digest('hex');
}

async function fetchModel() {
  const dir = path.join(OUT_ROOT, 'models');
  fs.mkdirSync(dir, { recursive: true });
  const dest = path.join(dir, BUNDLED_MODEL.file);
  if (fs.existsSync(dest) && sha256(dest) === BUNDLED_MODEL.sha256) { console.log(`model present and checked: ${dest}`); return dest; }
  console.log(`fetching ${BUNDLED_MODEL.url}`);
  const r = await fetch(BUNDLED_MODEL.url);
  if (!r.ok) throw new Error(`model download failed: ${r.status}`);
  const tmp = dest + '.part';
  fs.writeFileSync(tmp, Buffer.from(await r.arrayBuffer()));
  const got = sha256(tmp);
  if (got !== BUNDLED_MODEL.sha256) { fs.unlinkSync(tmp); throw new Error(`model sha256 mismatch: ${got}`); }
  fs.renameSync(tmp, dest);
  console.log(`model ready: ${dest}`);
  return dest;
}

export async function main(argv = process.argv.slice(2)) {
  const o = parseArgs(argv);
  if (!o.skipBuild) {
    const whisperDir = ensureWhisperCheckout();
    if (o.target === 'darwin-universal') {
      if (process.platform !== 'darwin') throw new Error('darwin-universal builds on macOS only');
      const arm = buildSlice('darwin-arm64', whisperDir, o);
      const x64 = buildSlice('darwin-x64', whisperDir, o);
      const dir = path.join(OUT_ROOT, 'darwin-universal');
      fs.mkdirSync(dir, { recursive: true });
      const to = path.join(dir, 'md-whisper');
      run('lipo', ['-create', arm, x64, '-output', to]);
      fs.chmodSync(to, 0o755);
      run('lipo', ['-info', to]);
      console.log(`installed ${to} (${fs.statSync(to).size} bytes)`);
    } else {
      const expectHost = o.target.startsWith('darwin') ? 'darwin' : o.target.startsWith('win32') ? 'win32' : 'linux';
      if (process.platform !== expectHost) throw new Error(`${o.target} builds on ${expectHost} only (this is ${process.platform})`);
      installBinary(o.target, buildSlice(o.target, whisperDir, o));
    }
    // The any app helper off the Mac rides in the same run (macOS builds its
    // Swift one with tools/build-md-hotkey.sh and checks the binary in).
    if (!o.skipHotkey && (o.target === 'win32-x64' || o.target === 'linux-x64')) buildHotkey(o.target, o);
  }
  if (!o.skipModel) await fetchModel();
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((e) => { console.error(e.message); process.exit(1); });
}
