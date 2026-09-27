// Does every `--cth-*` name this app uses actually EXIST?
//
// Not "does it resolve to the right value" — the kit tests already do that, and
// they are blind to this entire class. They check tokens the stylesheet declares.
// This checks names the CODE reaches for, which is a different set, and the gap
// between the two is where 24 sites have been sitting.
//
// THE FAILURE MODE, and it is nastier than a missing token:
//
//     background: 'var(--cth-amber-light, #f6e2b3)'
//
// `--cth-amber-light` is declared nowhere. The fallback therefore ALWAYS wins, so
// the colour is theme-blind and skin-blind, and nothing ever crashes. Worse, it
// defeats both audits anyone actually runs: grep for hardcoded hex finds nothing,
// grep for `var(--cth-` counts it as a token use. It passes as compliant while
// being neither. A fallback here is not a safety net, it is a silencer.
//
// It is live today. UpdateBadge.tsx renders two chips from adjacent lines of one
// ternary: `mint-light` is declared and themes to #1E3227, `amber-light` is not
// and stays #f6e2b3. Text on both is ink-900, which is #DEDBD6 in dark. The ready
// chip measures 9.87:1 and the warn chip 1.08:1 — not low contrast, invisible.
// Same component, same titlebar, side by side.
//
// Found by Pam, after Creed disclosed that his own resolution audit walks
// STYLESHEETS only. This app keeps its colour in inline React styles, so his
// audit could not see any of it. The rule worth keeping: ask what a check cannot
// see, then go look there.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const SRC = path.join(__dirname, '..', 'src/renderer/src');
const walk = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]);
const FILES = walk(SRC);

/**
 * COMMENTS COME OFF BEFORE ANYTHING IS COUNTED, and this file is the reason.
 *
 * A SELF-DOCUMENTING FILE DEFEATS NAIVE PARSING OF ITSELF. Both scans below used
 * to run on raw text, which made prose about a token indistinguishable from the
 * token. The dangerous direction was `declared()`: writing
 *
 *     \/* --cth-mint-700: never existed. Use --cth-mint. *\/
 *
 * into tokens.css while landing the fix would have registered `mint-700` as
 * DECLARED. Seven sites would leave the dead set, the inventory would shrink,
 * and this suite would have told the reader to update the frozen count — so a
 * comment explaining the defect would have disarmed the check for the defect,
 * with the failure message giving the instruction.
 *
 * Nothing in the tree triggered it, which was luck rather than structure: the
 * same pattern is already live on the other side, where PixelButton.tsx carries
 * `var(--cth-control-base, var(--cth-ink-900))` inside a block comment and only
 * fails to bite because both of those names are declared.
 *
 * Line comments are stripped only when they START a line, so a `https://` in
 * code survives.
 */
const stripCss = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '');
const stripTs = (s) => stripCss(s).replace(/^\s*\/\/.*$/gm, '');

/** Pure so the negative tests can feed them text instead of the repository. */
function declaredIn(cssText) {
  return new Set([...cssText.matchAll(/(--cth-[A-Za-z0-9-]+)\s*:/g)].map((m) => m[1]));
}
function referencedIn(tsText) {
  const out = {};
  for (const m of tsText.matchAll(/var\(\s*(--cth-[A-Za-z0-9-]+)\s*[,)]/g)) {
    out[m[1]] = (out[m[1]] ?? 0) + 1;
  }
  return out;
}

/** Every token the design layer DECLARES. */
function declared() {
  const out = new Set();
  for (const f of FILES.filter((f) => f.endsWith('.css'))) {
    for (const n of declaredIn(stripCss(fs.readFileSync(f, 'utf8')))) out.add(n);
  }
  return out;
}

/** Every literal token name the code REFERENCES, by file. */
function referenced() {
  const out = {};
  for (const f of FILES.filter((f) => /\.tsx?$/.test(f))) {
    const counts = referencedIn(stripTs(fs.readFileSync(f, 'utf8')));
    const rel = path.relative(SRC, f);
    for (const [name, n] of Object.entries(counts)) {
      (out[rel] ??= {})[name] = ((out[rel] ?? {})[name] ?? 0) + n;
    }
  }
  return out;
}

/**
 * THE SITES THAT ALREADY EXIST, frozen exactly as found.
 *
 * This is an inventory, not an allowlist. The fix is ruled — replace each dead
 * name with the declared token it was reaching for, rather than declaring eight
 * new ones and growing the contract to match a mistake — but it lands on `main`,
 * outside this branch, so nothing here touches these sites.
 *
 * Keyed by file and token, NEVER by line: a line-pinned inventory breaks on any
 * unrelated edit above it, and a guard that cries wolf gets deleted.
 *
 * Compared with deepEqual in BOTH directions on purpose. A new dead name fails,
 * which is the point. And so does a FIXED one — that failure says "this shrank,
 * write down the new number", which is the only way the count stays honest
 * instead of quietly becoming folklore.
 */
const KNOWN = {
  'components/AddAgentModal.tsx': {
    '--cth-mint-700': 1, '--cth-paprika-700': 2, '--cth-paprika-light': 2, '--cth-sky-700': 1
  },
  'components/IntegrationsRegistry.tsx': { '--cth-danger': 4, '--cth-mint-700': 4 },
  // QuitWarningModal's one `--cth-font-body` site left this list on 5 Sep 2026
  // BECAUSE THE SITE WAS DELETED, not because the name became declared: the
  // dead name lived in the closing-time progress view, and the founder removed
  // closing time from the quit flow entirely. The two-door modal that remains
  // names no undeclared token.
  // SettingsModal's two `var(--cth-mint-700, #1f7a4d)` sites left this list on
  // 4 Sep 2026 BECAUSE THE SITES WERE FIXED, not because the name became
  // declared: `--cth-mint-700` is still undeclared and still fails for every
  // other file below. Both were the "connected" / "listening" line under
  // Connections and now read `var(--cth-status-success)`, which is declared in
  // all four skin blocks, so the green finally follows the theme instead of
  // staying #1f7a4d on the dark skin. Checked the way this file's own failure
  // message asks: the name is absent from `declared()`, the entry is absent
  // from the file.
  'components/UpdateBadge.tsx': { '--cth-amber-light': 1 },
  'components/WorkersTab.tsx': { '--cth-green': 1 },
  'realtime/CostHud.tsx': { '--cth-danger': 2, '--cth-warn': 2 }
};

test('no code names a token that does not exist, beyond the frozen inventory', () => {
  const known = declared();
  const dead = {};
  for (const [file, tokens] of Object.entries(referenced())) {
    for (const [name, count] of Object.entries(tokens)) {
      if (!known.has(name)) (dead[file] ??= {})[name] = count;
    }
  }
  // NAME WHAT MOVED, AND DO NOT INTERPRET IT.
  //
  // This branch used to say "SHRANK: a site was fixed. Good — update KNOWN to
  // the new count." That fires correctly and PRESCRIBES THE WRONG ACTION, which
  // is worse than a check that cannot fire, because it recruits the reader into
  // disarming it.
  //
  // A name leaves the dead set for two reasons and the count cannot tell them
  // apart: the SITES WERE FIXED, or the NAME BECAME DECLARED. Stripping comments
  // closed one route to the second — it did not close the second. A declaration
  // added in error, a typo'd selector, a new stylesheet joining the glob, all
  // reproduce it exactly with comments stripped.
  //
  // So the message reports which names moved and which way, and stops there. A
  // count tells you something changed; the names tell you whether it should have.
  const flat = (o) => Object.entries(o).flatMap(([f, t]) =>
    Object.entries(t).map(([n, c]) => `${f} ${n} x${c}`));
  const before = new Set(flat(KNOWN));
  const after = new Set(flat(dead));
  const grew = [...after].filter((k) => !before.has(k));
  const shrank = [...before].filter((k) => !after.has(k));

  assert.deepEqual(dead, KNOWN,
    'the set of undeclared token names changed.\n\n' +
    (grew.length ? `NOW PRESENT AND NOT IN THE INVENTORY:\n  ${grew.join('\n  ')}\n` +
      'A `var(--cth-something, #hex)` is a hardcoded colour wearing a token\'s ' +
      'clothes — it will not follow the theme or the skin, and no hex grep will ' +
      'ever find it. Name a token that exists.\n\n' : '') +
    (shrank.length ? `IN THE INVENTORY AND NO LONGER PRESENT:\n  ${shrank.join('\n  ')}\n` +
      'DO NOT ASSUME THIS IS PROGRESS AND DO NOT UPDATE KNOWN ON THE STRENGTH OF ' +
      'THIS MESSAGE. A name leaves this set either because the sites were fixed ' +
      'or because the name became declared — check which. If a declaration for ' +
      'one of these appeared, the sites are untouched and editing KNOWN would ' +
      'disarm this test for every one of them.\n' : ''));
});

test('every token name the code BUILDS from a template resolves too', () => {
  // The half neither audit measured. A name assembled at runtime — `--cth-status-
  // ${status}` — cannot be grepped, so both of us reasoned that these looked
  // fine. "Happens to be safe" is not "was checked", so this enumerates the
  // unions from source and expands them.
  const known = declared();
  // Comments come off BEFORE the union is located, not after. StatusKind's
  // members are separated by prose explaining them, and one of those comments
  // contains a semicolon — so a non-greedy match to the first `;` stopped inside
  // the comment and silently dropped the last member. The sanity assertion below
  // is the only reason that was caught rather than shipped as a green test that
  // checked nine tenths of the union.
  //
  // Only line-leading `//` is stripped, so a `https://` in code survives.
  const read = (f) => fs.readFileSync(path.join(SRC, f), 'utf8').replace(/^\s*\/\/.*$/gm, '');
  const members = (src, typeName) => {
    const m = new RegExp(`type ${typeName}\\s*=([\\s\\S]*?);`).exec(src);
    assert.ok(m, `${typeName} moved — this check is now measuring nothing`);
    return [...m[1].matchAll(/'([^']+)'/g)].map((x) => x[1]);
  };

  const statuses = new Set([
    ...members(read('components/PixelBadge.tsx'), 'StatusKind'),
    ...members(read('components/team/primitives.tsx'), 'StatusHue')
  ]);
  const accents = members(read('design/tokens.ts'), 'AccentColorName');

  const expected = [
    // RoleGlyph, OrgChart, team/primitives: `--cth-status-${status}` and its tint.
    ...[...statuses].flatMap((s) => [`--cth-status-${s}`, `--cth-status-${s}-tint`]),
    // AgentCard, CommandCenterPanel and the rest: `--cth-${accent}` and `-light`.
    ...accents.flatMap((a) => [`--cth-${a}`, `--cth-${a}-light`]),
    // ProfessionalRail's project dots: `--cth-project-${(i % 6) + 1}`.
    ...[1, 2, 3, 4, 5, 6].map((n) => `--cth-project-${n}`)
  ];

  assert.ok(statuses.size >= 10 && accents.length === 6,
    `parsed ${statuses.size} statuses and ${accents.length} accents — the unions ` +
    'shrank under the parser, so this test is checking almost nothing');
  const missing = expected.filter((n) => !known.has(n));
  assert.deepEqual(missing, [],
    `a template-built token name expands to something undeclared: ${missing.join(', ')}. ` +
    'These have no fallback at all, so the property silently drops.');
});

test('a token named only in a comment does not register as declared', () => {
  // THE EXACT SENTENCE THAT WOULD HAVE DISARMED THIS SUITE. Someone documents
  // the dead-token fix in tokens.css, `mint-700` reads as declared, seven sites
  // leave the dead set, and the failure message asks the reader to bless it.
  const css = [
    '/* --cth-mint-700: never existed. Use --cth-mint. */',
    ':root { --cth-mint: #6FCF97; }'
  ].join('\n');
  assert.deepEqual([...declaredIn(stripCss(css))], ['--cth-mint'],
    'a token name written in prose was counted as a declaration — the comment ' +
    'strip is not running, and a note explaining a dead token now hides it');

  // And the same shape on the other side: prose about a use is not a use.
  // PixelButton.tsx already carries one of these for real.
  const ts = [
    ' * This CANNOT be a `var(--cth-danger, #c0392b)` fallback, because …',
    "const style = { color: 'var(--cth-ink-900)' };"
  ].join('\n');
  assert.deepEqual(referencedIn(stripTs('/*\n' + ts.split('\n')[0] + '\n*/\n' + ts.split('\n')[1])),
    { '--cth-ink-900': 1 },
    'a token discussed in a comment was counted as a use');
});

test('stripping comments does not eat a URL or a real declaration', () => {
  // The strip has to be narrow or it becomes its own defect. Line comments are
  // removed only when they START a line, so `https://` inside code survives.
  const ts = "const docs = 'https://munderdiffl.in/x'; // see var(--cth-danger, #c0392b)\n" +
             "const s = { color: 'var(--cth-warn, #b8860b)' };";
  assert.deepEqual(referencedIn(stripTs(ts)), { '--cth-danger': 1, '--cth-warn': 1 },
    'a trailing line comment is NOT stripped — narrow by design, because ' +
    'stripping from the first // onwards would eat the URL above it. Trailing ' +
    'comments are a known gap and the inventory covers what they let through.');
  assert.match(stripTs(ts), /munderdiffl\.in/, 'the URL was eaten by the strip');
  assert.deepEqual([...declaredIn(stripCss(':root { --cth-real: #fff; } /* --cth-fake: x */'))],
    ['--cth-real'], 'a real declaration was lost to the strip');
});
