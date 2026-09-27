// The Professional token block in src/renderer/src/design/tokens.css is a COPY
// of Pam's shared kit, and that file is live — it moved under this fork once
// already, five minutes after it was taken, and the mismatch was only caught by
// noticing that her CONSUMING.md named a token the paste did not declare.
//
// These tests turn "remember to re-copy the kit" into a check:
//   1. the stamp in tokens.css matches design/kitVersion.ts
//   2. if the shared kit is reachable, it has not moved ahead of the paste
//   3. every Professional declaration in the kit is present here with the SAME
//      value — a version stamp that agrees while values drift is worse than none
//
// (2) and (3) skip when the kit is not on disk (CI, a clone without the hive),
// because a check that cannot run must not fail; (1) always runs.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const TOKENS = path.join(ROOT, 'src/renderer/src/design/tokens.css');
const KIT_VERSION_TS = path.join(ROOT, 'src/renderer/src/design/kitVersion.ts');
// The shared kit's tokens.css, from the hive (shared/design/professional-kit),
// when this machine has one: MD_PROFESSIONAL_KIT=<path>. Unset, (2) and (3) skip.
const KIT = process.env.MD_PROFESSIONAL_KIT || '';

const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');

/** Professional declarations, keyed `light:`/`dark:` + token name. */
function professionalDecls(file) {
  const css = strip(fs.readFileSync(file, 'utf8'));
  const out = {};
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].trim();
    if (!sel.startsWith(':root') || !/professional/.test(sel)) continue;
    // Strip :not(...) BEFORE asking whether this is the dark block — this repo's
    // light block is scoped :not([data-cth-theme='dark']) and a naive test on the
    // raw selector reads it as dark.
    const dark = /theme='dark'/.test(sel.replace(/:not\([^)]*\)/g, ''));
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const k = d.slice(0, i).trim();
      if (!k.startsWith('--cth-')) continue;
      out[(dark ? 'dark:' : 'light:') + k] = d.slice(i + 1).trim();
    }
  }
  return out;
}

function stampIn(file) {
  const m = strip(fs.readFileSync(file, 'utf8')).match(/--cth-kit-version:\s*"([^"]+)"/);
  return m && m[1];
}

test('the kit stamp in tokens.css matches design/kitVersion.ts', () => {
  const stamp = stampIn(TOKENS);
  assert.ok(stamp, 'tokens.css declares no --cth-kit-version');
  const expected = fs.readFileSync(KIT_VERSION_TS, 'utf8')
    .match(/EXPECTED_KIT_VERSION\s*=\s*'([^']+)'/);
  assert.ok(expected, 'kitVersion.ts declares no EXPECTED_KIT_VERSION');
  assert.equal(stamp, expected[1],
    'tokens.css was re-pasted without bumping EXPECTED_KIT_VERSION (or vice versa)');
});

test('the pasted kit has not fallen behind the shared kit', { skip: !fs.existsSync(KIT) }, () => {
  assert.equal(stampIn(TOKENS), stampIn(KIT),
    'the shared Professional kit has moved — re-take it and bump EXPECTED_KIT_VERSION');
});

test('every Professional value matches the shared kit exactly', { skip: !fs.existsSync(KIT) }, () => {
  const kit = professionalDecls(KIT);
  const mine = professionalDecls(TOKENS);
  const missing = Object.keys(kit).filter((k) => !(k in mine));
  const drifted = Object.keys(kit).filter((k) => k in mine && kit[k] !== mine[k]);
  assert.deepEqual(missing, [], `declarations in the kit but not in tokens.css: ${missing.join(', ')}`);
  assert.deepEqual(drifted, [],
    `values that drifted from the kit: ${drifted.map((k) => `${k} (${mine[k]} should be ${kit[k]})`).join('; ')}`);
});

/**
 * Resolve every --cth-* for one skin/theme the way a browser would: match, then
 * order by specificity, then by source order.
 *
 * This asserts the OUTCOME rather than the block structure. An earlier version
 * checked which block each token lived in, and it did fire when the base block
 * was wrongly :not()-guarded — but with "a required block is missing or was
 * renamed", which points at the wrong thing. What actually matters is whether
 * --cth-radius-md has a value in professional+dark, so that is what is checked.
 */
function resolve(file, skin, theme) {
  const css = strip(fs.readFileSync(file, 'utf8'));
  const rules = [];
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m, order = 0;
  while ((m = re.exec(css))) {
    const sel = m[1].trim();
    if (!sel.startsWith(':root')) continue;
    const decls = {};
    for (const d of m[2].split(';')) {
      const i = d.indexOf(':');
      if (i < 0) continue;
      const k = d.slice(0, i).trim();
      if (k.startsWith('--cth-')) decls[k] = d.slice(i + 1).trim();
    }
    // :not(X) contributes X's specificity, so counting [attr] across the whole
    // selector is correct for these.
    rules.push({ sel, decls, spec: 1 + (sel.match(/\[[^\]]*\]/g) || []).length, order: order++ });
  }
  const matches = (sel) => {
    if (/:not\(\[data-cth-theme='dark'\]\)/.test(sel) && theme === 'dark') return false;
    const s = sel.match(/\[data-cth-skin='(\w+)'\]/);
    if (s && s[1] !== skin) return false;
    const t = sel.replace(/:not\([^)]*\)/g, '').match(/\[data-cth-theme='(\w+)'\]/);
    if (t && t[1] !== theme) return false;
    return true;
  };
  const won = {};
  for (const r of rules) {
    if (!matches(r.sel)) continue;
    for (const [k, v] of Object.entries(r.decls)) {
      const cur = won[k];
      if (!cur || r.spec > cur.spec || (r.spec === cur.spec && r.order > cur.order)) {
        won[k] = { v, spec: r.spec, order: r.order, sel: r.sel };
      }
    }
  }
  return won;
}

test('every Professional token resolves in BOTH professional modes', () => {
  const light = resolve(TOKENS, 'professional', 'light');
  const dark = resolve(TOKENS, 'professional', 'dark');
  const declared = new Set();
  const css = strip(fs.readFileSync(TOKENS, 'utf8'));
  const re = /([^{}]+)\{([^}]*)\}/g;
  let m;
  while ((m = re.exec(css))) {
    if (!/professional/.test(m[1])) continue;
    for (const k of m[2].match(/--cth-[a-z0-9-]+\s*:/g) || []) declared.add(k.replace(/\s*:$/, ''));
  }
  const undefLight = [...declared].filter((k) => !light[k]);
  const undefDark = [...declared].filter((k) => !dark[k]);
  assert.deepEqual(undefLight, [], `undefined in professional/light: ${undefLight.join(', ')}`);
  // The radius scale is the canary: :not()-guarding the mode-independent base
  // block leaves these undefined here, every call site falls back to its inline
  // 2px, and Professional dark quietly wears Office's square corners.
  assert.deepEqual(undefDark, [], `undefined in professional/dark: ${undefDark.join(', ')}`);
});

test('no Office value survives into professional/dark', () => {
  const css = strip(fs.readFileSync(TOKENS, 'utf8'));
  const m = css.match(/:root\[data-cth-theme='dark'\]\s*\{([^}]*)\}/);
  assert.ok(m, "the office dark block is missing or was renamed");
  const officeDarkNames = (m[1].match(/--cth-[a-z0-9-]+\s*:/g) || []).map((s) => s.replace(/\s*:$/, ''));
  const dark = resolve(TOKENS, 'professional', 'dark');
  const leaked = officeDarkNames.filter((k) => dark[k] && dark[k].sel === ":root[data-cth-theme='dark']");
  assert.deepEqual(leaked, [],
    `professional/dark is rendering OFFICE values for: ${leaked.join(', ')} — professional-dark was trimmed`);
});

test('no :root selector is declared twice', () => {
  // THE CHECK THAT WAS MISSING. A re-sync rebuilt tokens.css on `git show HEAD~4:`
  // and landed one commit too shallow, leaving the superseded PROVISIONAL block in
  // the file underneath the real one. Every resolved value stayed correct, because
  // the kit blocks come later and win on source order — so the value diff above
  // passed, the cascade resolution above passed, and the whole suite stayed green
  // while the file carried a stale duplicate.
  //
  // It was not harmless: the dead block was the FIRST one a reader or a grep hit,
  // and it reported the kit as a mid-version missing --cth-control-*,
  // --cth-surface-active and the teal --cth-project-6. Someone measured it in good
  // faith and filed three findings that were true of the file and false of the app.
  //
  // Correct values are not enough. A file that answers a grep wrongly costs an
  // investigation even when it costs the app nothing.
  const css = strip(fs.readFileSync(TOKENS, 'utf8'));
  const seen = new Map();
  const re = /([^{}]+)\{[^}]*\}/g;
  let m;
  while ((m = re.exec(css))) {
    const sel = m[1].trim().replace(/\s+/g, ' ');
    if (!sel.startsWith(':root')) continue;
    seen.set(sel, (seen.get(sel) ?? 0) + 1);
  }
  const dupes = [...seen.entries()].filter(([, n]) => n > 1).map(([sel, n]) => `${sel} x${n}`);
  assert.deepEqual(dupes, [],
    `duplicate :root blocks — a superseded paste was left in the file: ${dupes.join(', ')}`);
});
