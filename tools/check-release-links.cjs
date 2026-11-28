#!/usr/bin/env node
'use strict';

/**
 * Release gate: every download link we advertise must actually resolve.
 *
 * WHY THIS EXISTS. RELEASE.md is published verbatim as the GitHub release body,
 * and its download table links to
 * `/releases/latest/download/Munder-Difflin-<version>-<platform>.<ext>`. That URL
 * form requires the EXACT filename present in whichever release is currently
 * "latest", and electron-builder bakes ${version} into every artifact name — so a
 * version string left behind in RELEASE.md turns all four download links into
 * hard 404s the moment the next release ships.
 *
 * That is not hypothetical. The table sat pinned at 0.3.2 from v0.3.4 through
 * v0.3.7, and mac DMG downloads fell from 118 and 76 on v0.3.2/v0.3.3 to single
 * digits on every release after. Nothing failed, nothing warned; the release
 * simply stopped being installable for anyone arriving through GitHub, and the
 * page even claimed the opposite ("stays correct across versions").
 *
 * Two modes:
 *   (default) offline — every advertised version string matches package.json,
 *             except the website fallback, which may be newer (see rule 3).
 *             Run this BEFORE tagging, when the assets do not exist yet.
 *   --live    also HEADs each URL and requires 200. Run this AFTER publishing
 *             the release, which is the only moment the answer is meaningful.
 */

const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const version = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8')).version;
const releaseMd = fs.readFileSync(path.join(root, 'RELEASE.md'), 'utf8');

const problems = [];

// -1, 0 or 1 for plain x.y.z strings, which is all these files ever carry.
function compareVersions(a, b) {
  const [x, y] = [a, b].map((v) => v.split('.').map(Number));
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}

// — 1. every pinned artifact name must carry the current version —
const assetRe = /Munder-Difflin-(\d+\.\d+\.\d+)-([^\s`)]+)/g;
const assets = new Set();
for (const m of releaseMd.matchAll(assetRe)) {
  if (m[1] !== version) {
    problems.push(`RELEASE.md advertises Munder-Difflin-${m[1]}-${m[2]} but package.json says ${version}`);
  }
  assets.add(`Munder-Difflin-${m[1]}-${m[2]}`);
}
// From 0.6.0 releases are source only, so RELEASE.md may name no installer at
// all. Any installer name it still carries must match package.json.

// — 2. source tarball tags too; a stale tag silently ships last release's source —
for (const m of releaseMd.matchAll(/archive\/refs\/tags\/v(\d+\.\d+\.\d+)/g)) {
  if (m[1] !== version) {
    problems.push(`RELEASE.md links source for tag v${m[1]} but package.json says ${version}`);
  }
}

// — 3. the website's direct download version —
//   The site links straight to files on its own release host (BASE in
//   docs/index.html), and that host can ship ahead of main: 0.5.2 went out as
//   binaries while package.json on main stayed at 0.4.6, and this rule turned
//   every PR red for a site that was correct. So a NEWER fallback is allowed and
//   an OLDER one is still stale. --live proves the newer files really exist.
const indexHtml = path.join(root, 'docs/index.html');
const siteAssets = [];
if (fs.existsSync(indexHtml)) {
  const html = fs.readFileSync(indexHtml, 'utf8');
  const m = /var REL = '(\d+\.\d+\.\d+)'/.exec(html);
  if (m && compareVersions(m[1], version) < 0) {
    problems.push(`docs/index.html download fallback is ${m[1]}, older than package.json ${version}`);
  }
  const base = /var BASE = '([^']+)'/.exec(html);
  if (m && base) {
    for (const f of html.matchAll(/'Munder-Difflin-' \+ REL \+ '([^']+)'/g)) {
      siteAssets.push(`${base[1]}Munder-Difflin-${m[1]}${f[1]}`);
    }
  }
}

// — 4. llms.txt, which advertises the current version to crawlers and LLMs —
//   Added in 0.4.3: this file sat at 0.4.1 for two releases while the checker
//   stayed green, because nothing was watching it.
const llms = path.join(root, 'docs/llms.txt');
if (fs.existsSync(llms)) {
  const m = /Current version:\s*(\d+\.\d+\.\d+)/.exec(fs.readFileSync(llms, 'utf8'));
  if (!m) problems.push('docs/llms.txt no longer states "Current version: x.y.z" — did the line move?');
  else if (m[1] !== version) {
    problems.push(`docs/llms.txt says current version ${m[1]}, package.json says ${version}`);
  }
}

async function head(url, label) {
  let status = 0;
  try {
    // GitHub 302s asset downloads to a CDN, so follow it; HEAD is enough.
    status = (await fetch(url, { method: 'HEAD', redirect: 'follow' })).status;
  } catch (e) {
    problems.push(`${label} — request failed: ${e.message}`);
    return;
  }
  if (status !== 200) problems.push(`${label} — HTTP ${status} (advertised but not downloadable)`);
  else console.log(`  ok  ${label}`);
}

async function checkLive() {
  const base = 'https://github.com/HarnessMD/munder-difflin/releases/latest/download/';
  for (const name of assets) await head(base + name, name);
  for (const url of siteAssets) await head(url, url);
}

(async () => {
  if (process.argv.includes('--live')) {
    console.log(`Checking advertised downloads for v${version} against the live latest release…`);
    await checkLive();
  }
  if (problems.length) {
    console.error(`\n✗ release links are wrong (${problems.length}):`);
    for (const p of problems) console.error(`  - ${p}`);
    console.error('\nFix RELEASE.md / docs/index.html / docs/llms.txt to match package.json before releasing.');
    process.exit(1);
  }
  console.log(`✓ release links consistent at v${version}`);
})();
