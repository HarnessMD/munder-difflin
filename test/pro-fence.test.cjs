// THE PRO FENCE (v0.4.9 plan, phase 0). Everything PRO renders is found by
// walking imports out from components/pro/**, the same walk the audit ran to
// find the 73 Classic files a PRO user could see. Two things are pinned:
//
//   1. Which reachable files still draw Classic (PixelPanel, PixelButton,
//      PixelBadge, the pixel Icon). The list is a BASELINE that only shrinks:
//      a phase that rebuilds a surface deletes its line here, and a new leak
//      fails the same assertion. Type-only imports do not count (a type is
//      not a pixel).
//   2. Which pro.* strings still use the words the plan bans from PRO
//      (Part 3: harness config, hive, floor, spawn, palace, awaiting,
//      starting up, block tools, semantic memory, pty). Same rule, same
//      shrink-only baseline.
//
// Both baselines are deepEqual'd, not `<=`, so a line that was fixed and left
// behind fails too: the list is the truth about the tree, not a ceiling.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src/renderer/src');
const PRO = path.join(SRC, 'components/pro');
const read = (p) => fs.readFileSync(p, 'utf8');
const rel = (p) => path.relative(ROOT, p).split(path.sep).join('/');

/** Every .ts/.tsx under a directory, subdirectories included (phase 1 of
 *  0.4.9 added pro/onboarding, and its files are PRO's as much as the rest). */
function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(path.join(dir, e.name)) : /\.tsx?$/.test(e.name) ? [path.join(dir, e.name)] : []);
}

function resolveImport(from, spec) {
  let base;
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
  else if (spec.startsWith('@shared/')) base = path.join(ROOT, 'src/shared', spec.slice('@shared/'.length));
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
  else return null;
  for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
    if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
  }
  return null;
}

/** Drop comments and every type-only import before looking for pixels. */
function code(src) {
  return src
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^[ \t]*\/\/.*$/gm, '')
    .replace(/^\s*import\s+type\s[^\n]*$/gm, '')
    .replace(/^\s*export\s+type\s+\{[^}]*\}\s+from[^\n]*$/gm, '');
}

const IMPORT_RE = /(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g;

/** Every renderer module reachable from PRO, by value imports. */
function reachable() {
  const roots = walk(PRO);
  const seen = new Set();
  const stack = [...roots];
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    const src = code(read(f));
    for (const m of src.matchAll(IMPORT_RE)) {
      const r = resolveImport(f, m[1] || m[2]);
      if (r && /\.tsx?$/.test(r) && !seen.has(r)) stack.push(r);
    }
  }
  return seen;
}

const PIXEL_RE = /from\s*['"][^'"]*\/(PixelPanel|PixelButton|PixelBadge|Icon)['"]|<Pixel(Panel|Button|Badge)\b/;

// The baseline: reachable files that still draw Classic. It opened at
// eighteen lines on 3 Sep 2026 at de55c913 (v0.4.8) and phase 5 of the plan,
// the embedded sweep, took seventeen of them: Settings and everything it
// pulls in (the hero card, the setup panel, the engines list, the integrations
// registry, the theme picker, the updates block), the eight team surfaces, the
// kanban and the terminal view. Those files now draw the kit — Btn, Panel,
// Chip, ProIcon — in BOTH skins, which is what "embedded sweep" meant: one
// drawing for a surface both skins embed, rather than a PRO fork of a Classic
// form that would drift the first time either was edited.
// Emptied on 5 Sep 2026 (founder item 14, the agent sheet's Avatar section):
// the sheet dropped CharacterPicker for the PRO native AvatarGallery, so Pam's
// sprite editor (PixelPanel, PixelButton) is no longer reachable from pro/**.
// PRO creates custom avatars through the gallery's inline creator instead,
// over the same shared recipe data and the same saveAvatar door.
const KNOWN_PIXEL_LEAKS = [];

test('the walk is armed: PRO reaches well over a hundred renderer modules', () => {
  const files = reachable();
  assert.ok(files.size > 100, `only ${files.size} files reachable; the import walker is broken`);
  assert.ok([...files].some((f) => f.endsWith('/store/store.ts')), 'the walk did not even reach the store');
});

test('Classic pixels reachable from PRO: the baseline, shrinking phase by phase', () => {
  const leaks = [...reachable()].filter((f) => f.endsWith('.tsx') && PIXEL_RE.test(code(read(f)))).map(rel).sort();
  const fixed = KNOWN_PIXEL_LEAKS.filter((f) => !leaks.includes(f));
  const fresh = leaks.filter((f) => !KNOWN_PIXEL_LEAKS.includes(f));
  assert.deepEqual({ fixed, fresh }, { fixed: [], fresh: [] },
    `pixel fence: ${fresh.length} new leak(s) ${JSON.stringify(fresh)}; ${fixed.length} line(s) to delete from the baseline ${JSON.stringify(fixed)}`);
});

// Part 3 of the plan: what PRO must not say. `pty` alone catches the raw
// session ids that were shown as titles.
const BANNED_WORDS = /\b(harness config|hive|floor|spawn|spawned|spawns|palace|awaiting|starting up|block tools|semantic memory|pty)\b/i;

// Emptied by phase 4 of 0.4.9 (the vocabulary sweep). Any hit is a new leak.
const KNOWN_VOCAB = [];

function flat(o, p = '') {
  return Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
}

test('banned words in PRO strings: the baseline, shrinking phase by phase', () => {
  const en = flat(JSON.parse(read(path.join(SRC, 'i18n/locales/en.json'))));
  const hits = en.filter(([k, v]) => k.startsWith('pro.') && typeof v === 'string' && BANNED_WORDS.test(v)).map(([k]) => k).sort();
  const fixed = KNOWN_VOCAB.filter((k) => !hits.includes(k));
  const fresh = hits.filter((k) => !KNOWN_VOCAB.includes(k));
  assert.deepEqual({ fixed, fresh }, { fixed: [], fresh: [] },
    `vocabulary fence: ${fresh.length} new hit(s) ${JSON.stringify(fresh)}; ${fixed.length} line(s) to delete from the baseline ${JSON.stringify(fixed)}`);
});

/* ---- the kit itself --------------------------------------------------------- */

test('the status family: one plain word per raw state, in every locale', () => {
  const badge = read(path.join(SRC, 'components/PixelBadge.tsx'));
  const kinds = [...badge.slice(badge.indexOf('export type StatusKind'), badge.indexOf('export interface')).matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  assert.ok(kinds.length >= 10, `StatusKind parsed ${kinds.length} kinds`);
  for (const l of ['en', 'zh-CN', 'ar']) {
    const keys = new Map(flat(JSON.parse(read(path.join(SRC, `i18n/locales/${l}.json`)))));
    for (const k of kinds) assert.ok(keys.has(`pro.status.${k}`), `pro.status.${k} in ${l}`);
    // The raw parser words never become the label.
    for (const k of kinds) assert.ok(!BANNED_WORDS.test(keys.get(`pro.status.${k}`)), `pro.status.${k} (${l}) uses a banned word`);
  }
  const ui = read(path.join(PRO, 'ui.tsx'));
  assert.match(ui, /export const STATUS_TONE: Record<StatusKind, ChipTone>/);
  for (const k of kinds) assert.ok(new RegExp(`\\b${k}: '`).test(ui.slice(ui.indexOf('STATUS_TONE'))), `STATUS_TONE has no tone for ${k}`);
});

test('D1: the depth follows config.audience and ProShell feeds it, nothing else reads the config for it', () => {
  const depth = read(path.join(PRO, 'depth.ts'));
  assert.match(depth, /audience === 'non-technical' \? 'simple' : 'technical'/);
  const shell = read(path.join(PRO, 'ProShell.tsx'));
  assert.match(shell, /setAudience\(audience\)/);
  for (const f of walk(PRO)) {
    const name = path.basename(f);
    if (name === 'ProShell.tsx' || name === 'depth.ts') continue;
    assert.ok(!/\.audience\b/.test(code(read(f))), `${rel(f)} reads config.audience directly; use useDepth()`);
  }
});

test('the kit has the surfaces the sweep replaces Classic with, and the toast host is mounted once', () => {
  const ui = read(path.join(PRO, 'ui.tsx'));
  for (const name of ['Card', 'Tabs', 'Row', 'IconBtn', 'ConfirmDialog', 'StatusChip', 'ProToastHost', 'Sheet', 'Meter', 'Btn', 'Chip']) {
    assert.match(ui, new RegExp(`export function ${name}\\b`), `ui.tsx exports ${name}`);
  }
  assert.match(ui, /export function proToast\(/);
  const shell = read(path.join(PRO, 'ProShell.tsx'));
  assert.equal((shell.match(/<ProToastHost \/>/g) || []).length, 1);
  // The tab underline is an inset shadow, so the even-border rule in
  // pro-nav.test.cjs holds for tabs as it does for cards.
  const tabs = ui.slice(ui.indexOf('export function Tabs'), ui.indexOf('export function Row'));
  assert.ok(!/border(Bottom|Top|Left|Right)/.test(tabs), 'Tabs must not use a one-edge border');
});
