// The seam between the Professional rail and the Teams surface.
//
// The rail rows and the panes they open are paired BY STRING ID, deliberately:
// that is what lets a fork add a destination without editing the layout, and it
// is the reason the layout's `PaneId` had to stop being a closed union. The cost
// of that choice is that the compiler no longer checks the pairing, so these
// tests do.
//
// Every guard here is written against a defect that was actually in the tree:
//
//   - D11 was rendered and could not be reached. The only route to it is the
//     teammate drawer's "message their Michael" button, and that button had no
//     onClick at all.
//   - D10's toast and D13's key warning were mounted inside a pane, where each
//     is invisible exactly when it matters — you are told an agent wants network
//     access only if you happened to be looking at the request queue.
//   - The team surface carried its own roster/requests tab bar, which became a
//     second navigation to two destinations the rail already reaches.
//
// They assert the OUTCOME (a row opens something, a pane is reachable, a button
// does something) rather than the shape of the code that produces it.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const glob = (dir) => fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
  e.isDirectory() ? glob(path.join(dir, e.name)) : [path.join(dir, e.name)]);

const ROOT = path.join(__dirname, '..');
const TEAM_DIR = path.join(ROOT, 'src/renderer/src/components/team');
const SEAM = path.join(TEAM_DIR, 'teamsSeam.tsx');
const APP = path.join(ROOT, 'src/renderer/src/App.tsx');
const seam = fs.readFileSync(SEAM, 'utf8');

/** `export const TEAM_PANE = 'team';` → { TEAM_PANE: 'team' } */
function paneConsts(src) {
  const out = {};
  for (const m of src.matchAll(/export const (\w+_PANE) = '([^']+)'/g)) out[m[1]] = m[2];
  return out;
}
const PANES = paneConsts(seam);

/**
 * The ids pushed into the rail row list.
 *
 * Reads BOTH `id: TEAM_PANE` and `id: 'team'`. The first version of this only
 * read the constant, which meant the one edit most likely to break the pairing —
 * inlining a literal that no longer matches — was invisible to the checker. It
 * passed a negative test it should have failed.
 */
function rowIds(src) {
  return [...src.matchAll(/\{\s*id:\s*(?:'([^']+)'|(\w+)),/g)]
    .map((m) => (m[1] !== undefined ? m[1] : PANES[m[2]] ?? m[2]));
}

/** The keys of the object `teamsPanes` returns — same two forms. */
function paneIds(src) {
  const body = src.slice(src.indexOf('export function teamsPanes'));
  return [...body.matchAll(/(?:\[(\w+)\]|'([^']+)'):\s*</g)]
    .map((m) => (m[2] !== undefined ? m[2] : PANES[m[1]] ?? m[1]));
}

test('every rail row opens a pane', () => {
  const rows = rowIds(seam);
  const panes = paneIds(seam);
  // A checker that silently parses nothing passes everything. Both sides are
  // pinned to what the seam actually ships, so a rename that defeats the parser
  // fails here instead of quietly disarming the guard below.
  assert.deepEqual(rows.sort(), [PANES.REQUESTS_PANE, PANES.TEAM_PANE].sort(),
    `parsed rail rows: ${rows.join(', ')} — the parser and the seam disagree`);
  // team, requests, thread, and S1's org panel (reached from the org name).
  assert.equal(panes.length, 4, `parsed panes: ${panes.join(', ')}`);
  const orphans = rows.filter((id) => !panes.includes(id));
  assert.deepEqual(orphans, [],
    `rail rows with no pane behind them: ${orphans.join(', ')}. The row and the ` +
    'pane are paired by id and nothing but this checks it, so the row would ' +
    'render, highlight when clicked, and show the org chart.');
});

test('every pane is reachable — by a row, or by something that navigates to it', () => {
  // A pane with no route is the defect this whole pass exists to remove. A pane
  // may skip the rail (a conversation is not a destination; there is no row
  // called "the thread with Pam") but it may not skip BOTH.
  const rows = rowIds(seam);
  const unreachable = paneIds(seam).filter((id) => {
    if (rows.includes(id)) return false;
    const constName = Object.keys(PANES).find((k) => PANES[k] === id);
    return !new RegExp(`\\.go\\(${constName}\\)`).test(seam);
  });
  assert.deepEqual(unreachable, [],
    `panes nothing can open: ${unreachable.join(', ')}. They render correctly ` +
    'and no user will ever see them.');
});

test('the thread is a pane and NOT a rail row', () => {
  // Ruled explicitly: a conversation is not a destination. If it grows a row,
  // the row is "the thread with whoever was last open", which is not a place.
  assert.ok(paneIds(seam).includes(PANES.THREAD_PANE), 'the thread stopped being a pane');
  assert.ok(!rowIds(seam).includes(PANES.THREAD_PANE),
    'the thread grew a rail row. A rail row is a destination and a conversation ' +
    'is not one — it is reached from the teammate drawer.');
});

test('no button in the Teams surface is dead', () => {
  // D8's "message their Michael" shipped with no onClick, which is what made
  // D11 unreachable: it looked complete, it type-checked, and it did nothing.
  const dead = [];
  for (const file of glob(TEAM_DIR).filter((f) => f.endsWith('.tsx'))) {
    const src = fs.readFileSync(file, 'utf8');
    for (const m of src.matchAll(/<PixelButton\b/g)) {
      let i = m.index + m[0].length, depth = 0;
      while (i < src.length) {
        const c = src[i];
        if (c === '{') depth++;
        else if (c === '}') depth--;
        else if (c === '>' && depth === 0) break;
        i++;
      }
      const tag = src.slice(m.index, i);
      // Only an UNCONDITIONALLY disabled button is exempt — that one is dead on
      // purpose and says so on screen. `disabled={someCondition}` is live
      // whenever the condition is false, and the button this guard exists for
      // was exactly that: disabled while a teammate blocked you, pressable the
      // rest of the time, and wired to nothing either way. Exempting it on the
      // word `disabled` alone let the original defect straight back through.
      const deadOnPurpose = /\bdisabled(?![=\w])/.test(tag) || /\bdisabled=\{true\}/.test(tag);
      if (!/\bonClick\b/.test(tag) && !deadOnPurpose) {
        dead.push(`${path.relative(ROOT, file)}:${src.slice(0, m.index).split('\n').length}`);
      }
    }
  }
  assert.deepEqual(dead, [],
    `buttons that do nothing: ${dead.join(', ')}. A control with no handler and ` +
    'no disabled state is indistinguishable from a working one until someone ' +
    'presses it.');
});

test('the app-level surfaces are mounted app-level, not inside a pane', () => {
  // A toast that renders only while its own pane is selected is invisible
  // exactly when it matters. A key-change dialog that needs you to be on the
  // roster is not a security dialog.
  const APP_LEVEL = ['ApprovalToast', 'FingerprintWarning'];
  const strays = [];
  for (const file of glob(TEAM_DIR).filter((f) => f.endsWith('.tsx') && f !== SEAM)) {
    const src = fs.readFileSync(file, 'utf8');
    for (const name of APP_LEVEL) {
      if (new RegExp(`<${name}\\b`).test(src)) strays.push(`${path.relative(ROOT, file)} renders ${name}`);
    }
  }
  assert.deepEqual(strays, [],
    `app-level surfaces mounted inside a pane: ${strays.join('; ')}. They belong ` +
    'in the overlay slot, which is the one place that outlives pane selection.');

  // And the slots are actually mounted, or the above is true and useless.
  const app = fs.readFileSync(APP, 'utf8');
  assert.match(app, /<AppOverlaySlot\b/,
    'the overlay slot is not mounted in App.tsx, so nothing app-level renders at all');
  assert.match(app, /<AppChromeSlot>/,
    'the chrome slot is not mounted in App.tsx');
});

test('no app-level transient places itself in the corner', () => {
  // Three of them anchored independently to `right: 16, bottom: 16` — the
  // approval toast, the update offer and the completion toast — so whichever
  // had the higher z-index covered the others. They were not competing for
  // attention, they were deleting each other. The corner is owned by
  // AppOverlaySlot now, and a fourth toast that places itself re-opens it.
  //
  // Checked as an OUTCOME (nothing anchors itself) rather than as "they are all
  // in the array", because the defect is the anchoring, and a component that
  // anchors is broken whether or not someone remembered to list it.
  const TRANSIENTS = [
    'src/renderer/src/components/team/ApprovalQueue.tsx',
    'src/renderer/src/components/UpdateToast.tsx',
    'src/renderer/src/realtime/CompletionToast.tsx'
  ];
  const anchored = [];
  for (const rel of TRANSIENTS) {
    const src = fs.readFileSync(path.join(ROOT, rel), 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
    // Each `style={{ ... }}` object, delimited by real brace matching rather
    // than a fixed character window. The first version of this scanned 160
    // characters forward for a closing brace — these style objects are longer
    // than that, so it matched nothing at all and passed its negative test by
    // being blind rather than by being satisfied.
    for (const m of src.matchAll(/style=\{\{/g)) {
      let i = m.index + m[0].length, depth = 2;
      while (i < src.length && depth > 0) {
        if (src[i] === '{') depth++;
        else if (src[i] === '}') depth--;
        i++;
      }
      const block = src.slice(m.index, i);
      // A corner anchor: a fixed/absolute box pinned to bottom AND right.
      // Inner popovers anchor to their own relative parent and are fine.
      if (!/position:\s*'(fixed|absolute)'/.test(block)) continue;
      if (/\bbottom:\s*16\b/.test(block) && /\bright:\s*16\b/.test(block)) {
        anchored.push(`${rel}:${src.slice(0, m.index).split('\n').length}`);
      }
    }
  }
  assert.deepEqual(anchored, [],
    `these place themselves in the shared transient corner: ${anchored.join(', ')}. ` +
    'Two toasts pinned to the same 16/16 do not stack, they cover each other. ' +
    'Hand it to AppOverlaySlot\'s `transients` instead and let the slot place it.');
});

test('there is one navigation to the team destinations, not two', () => {
  // The deleted tab bar was a second route to the two rail rows. Its labels
  // were `team.pane.roster` / `team.pane.requests`; the rows reuse those
  // strings under `rail.*`. If the old keys come back, so has the tab bar.
  for (const loc of ['en', 'zh-CN', 'ar']) {
    const d = JSON.parse(fs.readFileSync(
      path.join(ROOT, `src/renderer/src/i18n/locales/${loc}.json`), 'utf8'));
    assert.ok(!d.team?.pane,
      `${loc} still has team.pane.* — those were the deleted tab bar's labels, ` +
      'and the rail rows are the navigation now.');
    assert.ok(d.rail?.team && d.rail?.requests,
      `${loc} is missing rail.team / rail.requests, so a company row renders blank`);
  }
});

test('0.5.2: the approval toast remembers a dismissal across relaunches', () => {
  // Component state alone meant every launch raised the same toast for the
  // same request again (card v052-teammate-message-notifications).
  const seam = fs.readFileSync(path.join(ROOT, 'src/renderer/src/components/team/teamsSeam.tsx'), 'utf8');
  assert.match(seam, /useState<Set<string>>\(\(\) => readDismissedToasts\(\)\)/, 'the dismissed set is seeded from storage');
  assert.match(seam, /writeDismissedToasts\(next\)/, 'a dismissal is written back');
  assert.match(seam, /const DISMISSED_KEY = 'cth\.teamsToastDismissed'/, 'under the cth. prefix so reset-and-start-over forgets it');
});
