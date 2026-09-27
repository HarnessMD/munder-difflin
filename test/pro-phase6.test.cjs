// PRO phase 6: polish. The chords the UI promised are wired from one table,
// Esc closes every sheet and drawer without eating a half-typed field,
// Settings has one door in PRO, reduced motion has one owner, every PRO
// string exists in every locale, and the release notes say what shipped.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PRO = 'src/renderer/src/components/pro';
/** Every PRO module, relative to PRO, subdirectories included (pro/onboarding since 0.4.9 phase 1). */
const proFiles = (sub = '') => fs.readdirSync(path.join(ROOT, PRO, sub), { withFileTypes: true })
  .flatMap((e) => (e.isDirectory() ? proFiles(`${sub}${e.name}/`) : /\.tsx?$/.test(e.name) ? [`${sub}${e.name}`] : []));
const K = loadTs(`${PRO}/proKeys.ts`);

const key = (k, mods = {}) => ({ key: k, metaKey: false, ctrlKey: false, altKey: false, shiftKey: false, ...mods });

// The platform is passed since the 0.5.3 review: Command on macOS, Control
// elsewhere, never the other one (test/ide-shortcut.test.cjs test 1 says why).
test('the chord table: Meta on macOS and Ctrl elsewhere, never with Shift or Alt, three keys', () => {
  const MAC = true, PC = false;
  assert.equal(K.proChordFor(key('\\', { metaKey: true }), MAC), 'sidebar');
  assert.equal(K.proChordFor(key(',', { metaKey: true }), MAC), 'settings');
  assert.equal(K.proChordFor(key('.', { metaKey: true }), MAC), 'agentConfig');
  assert.equal(K.proChordFor(key(',', { ctrlKey: true }), PC), 'settings', 'Ctrl on Windows and Linux');
  assert.equal(K.proChordFor(key(','), MAC), null, 'a bare comma is typing');
  assert.equal(K.proChordFor(key(',', { metaKey: true, shiftKey: true }), MAC), null);
  assert.equal(K.proChordFor(key('\\', { metaKey: true, altKey: true }), MAC), null);
  assert.equal(K.proChordFor(key('k', { metaKey: true }), MAC), null);
  // Four since 0.5.3: ⌘I opens the IDE (test/ide-shortcut.test.cjs).
  for (const chord of ['sidebar', 'settings', 'agentConfig', 'ide']) assert.ok(K.CHORD_HINT[chord], `${chord} has a hint`);
});

test('every on-screen hint reads the table; no chord is spelled by hand in JSX or in a listener', () => {
  const sidebar = strip(read(`${PRO}/ProSidebar.tsx`));
  const agent = strip(read(`${PRO}/AgentScreen.tsx`));
  const shell = strip(read(`${PRO}/ProShell.tsx`));
  assert.match(sidebar, /CHORD_HINT\.sidebar/);
  assert.match(sidebar, /hint=\{CHORD_HINT\.settings\}/);
  assert.match(agent, /CHORD_HINT\.agentConfig/);
  assert.match(agent, /proChordFor\(e\) === 'agentConfig'/);
  assert.match(shell, /chord === 'sidebar'[^\n]*toggleRailCollapsed\(\)/);
  assert.match(shell, /chord === 'settings'[^\n]*go\('settings'\)/);
  for (const f of proFiles()) {
    if (f === 'proKeys.ts') continue;
    const src = strip(read(`${PRO}/${f}`));
    assert.ok(!/["'`][^"'`\n]*⌘[\\,.]/.test(src), `${f} spells a chord instead of reading CHORD_HINT`);
    assert.ok(!/e\.key === '[\\,.]'/.test(src), `${f} checks a chord key inline instead of asking proChordFor`);
  }
});

test('Esc closes the sheet and every drawer, and a field inside gets the key first', () => {
  const ui = strip(read(`${PRO}/ui.tsx`));
  assert.match(ui, /export function useEscapeToClose\(onClose: \(\) => void, within: RefObject<HTMLElement \| null>, capture = false\)/);
  assert.match(ui, /isEditable\(active\) && within\.current\?\.contains\(active\)/, 'only a field inside the surface holds it open');
  assert.match(ui, /\(active as HTMLElement\)\.blur\(\)/);
  const sheet = ui.slice(ui.indexOf('export function Sheet('));
  assert.match(sheet, /useEscapeToClose\(onClose, ref, true\)/, 'the modal sheet takes the key in the capture phase');
  assert.match(sheet, /<div ref=\{ref\} role="dialog"/);
  const temps = strip(read(`${PRO}/TempsScreen.tsx`));
  assert.match(temps.slice(temps.indexOf('function HistoryDrawer(')), /useEscapeToClose\(onClose, ref\)/);
  assert.match(temps, /<aside ref=\{ref\}/);
  const team = strip(read(`${PRO}/TeamScreen.tsx`));
  assert.match(team, /<EscapeCloses onClose=\{closeDetail\}>\s*<TeammateDetail/);
  assert.match(team, /useEscapeToClose\(onClose, ref\)/);
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/renderer/src/components/team/TeammateDetail.tsx')) || !/useEscapeToClose/.test(read('src/renderer/src/components/team/TeammateDetail.tsx')), "Creed's drawer is wrapped, not edited");
  // The rule itself, on plain objects: a field is editable, a div is not.
  assert.equal(K.isEditable(null), false);
  assert.equal(K.isEditable({ tagName: 'INPUT' }), true);
  assert.equal(K.isEditable({ tagName: 'TEXTAREA' }), true);
  assert.equal(K.isEditable({ tagName: 'DIV', isContentEditable: true }), true);
  assert.equal(K.isEditable({ tagName: 'DIV' }), false);
  assert.equal(K.isEditable({ tagName: 'BUTTON' }), false);
});

test('Settings has one door in PRO: the page, reached by the gear, ⌘, and every deep link', () => {
  const app = strip(read('src/renderer/src/App.tsx'));
  const listener = app.slice(app.indexOf("window.addEventListener('cth:open-settings'") - 400, app.indexOf("window.addEventListener('cth:open-settings'"));
  assert.match(listener, /if \(skin === 'professional'\) return;/, 'App stands down in PRO');
  assert.match(app, /\}, \[skin\]\);\s*\n/, 'and re-arms when the skin changes back');
  assert.match(app, /onClick=\{\(\) => window\.dispatchEvent\(new CustomEvent\('cth:open-settings'\)\)\}\s*data-tip="Settings"/, 'the gear goes through the one event');
  assert.match(app, /\{settingsOpen && skin !== 'professional' && \(\s*<SettingsModal/, 'the Classic modal is never drawn over PRO');
  assert.ok(!/setSettingsOpen\(true\)[^\n]*\n[^\n]*data-tip="Settings"/.test(app));
  const shell = strip(read(`${PRO}/ProShell.tsx`));
  assert.match(shell, /window\.addEventListener\('cth:open-settings', onOpen\)/);
  assert.match(shell, /setSettingsSection\(\(e as CustomEvent<\{ section\?: SettingsSection \}>\)\.detail\?\.section\);\s*setScreen\('settings'\);/);
  assert.match(shell, /if \(next !== 'settings'\) setSettingsSection\(undefined\);/, 'a plain visit opens on General again');
  assert.match(shell, /<SettingsScreen config=\{config\} section=\{settingsSection\} \/>/);
  const page = strip(read(`${PRO}/SettingsScreen.tsx`));
  assert.match(page, /<SettingsModal key=\{section \?\? ''\} config=\{config\} initialSection=\{section\}/, 'a new section remounts the form on that tab');
});

test('reduced motion: one CSS rule for every transition, and the one JS animation asks', () => {
  const css = read('src/renderer/src/design/global.css');
  assert.match(css, /@media \(prefers-reduced-motion: reduce\) \{\s*\* \{ animation-duration: 0s !important; transition-duration: 0s !important; \}/);
  const owners = proFiles().filter((f) => /requestAnimationFrame/.test(strip(read(`${PRO}/${f}`))));
  assert.deepEqual(owners, ['MemoryScreen.tsx'], 'JS-driven motion in PRO has exactly one owner');
  assert.match(strip(read(`${PRO}/MemoryScreen.tsx`)), /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
});

test('every PRO string exists in every locale, static keys and each enumerated family', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
  const en = locales.en;
  const missing = [];
  for (const f of proFiles()) {
    const src = strip(read(`${PRO}/${f}`));
    for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) for (const l of Object.keys(locales)) if (!locales[l].has(m[1])) missing.push(`${f}: ${m[1]} (${l})`);
    for (const m of src.matchAll(/\bt\(\s*`([^`]+)`/g)) {
      const prefix = m[1].split('${')[0];
      if (![...en.keys()].some((k) => k.startsWith(prefix))) missing.push(`${f}: ${m[1]} (no key under ${prefix})`);
    }
  }
  assert.deepEqual(missing, []);
  // Families: the union the code can produce, taken from the module that
  // declares it, so a value added to the code without a string fails here.
  const union = (src, name) => [...(src.match(new RegExp(`${name} = ((?:'[^']+' \\| ?)+'[^']+')`)) || [, ''])[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
  const billing = read('src/shared/billing.ts');
  const teams = read('src/shared/teams.ts');
  const families = [
    ['pro.temps.result', loadTs('src/shared/workerHistory.ts').WORKER_RESULTS],
    ['pro.temps.resultBlurb', loadTs('src/shared/workerHistory.ts').WORKER_RESULTS],
    ['pro.temps.worktree', ['removed', 'preserved', 'none']],
    ['pro.billing.state', union(teams, 'export type BillingState')],
    ['pro.billing.stateBlurb', union(teams, 'export type BillingState')],
    ['pro.billing.invoiceStatus', ['paid', 'failed', 'refunded']],
    ['pro.billing.fail', ['refused', 'unavailable', 'offline', 'error']],
    ['pro.profile.standing', ['solo', 'member', 'admin']],
    ['pro.tasks.status', ['todo', 'doing', 'blocked', 'done']],
    ['pro.caps.tier', ['safe-readonly', 'write', 'secret']]
  ];
  for (const [prefix, values] of families) {
    assert.ok(values.length >= 3, `${prefix}: the family was found (${values.length})`);
    for (const v of values) for (const l of Object.keys(locales)) assert.ok(locales[l].has(`${prefix}.${v}`), `${prefix}.${v} in ${l}`);
  }
  // Static-key case-in-point: the two families whose union is not exported
  // are pinned above by value; billing's invoice statuses are read from source.
  assert.match(billing, /const INVOICE_STATUS = \['paid', 'failed', 'refunded'\] as const;/);
});

test('the release notes say what PRO shipped, under Unreleased until the release runner lifts them', () => {
  const log = read('CHANGELOG.md');
  const unreleased = log.slice(log.indexOf('## [Unreleased]'), log.indexOf('## [0.4.6]'));
  for (const claim of ['PRO mode, on by default', 'Classic | PRO', 'Agents are their sprites', 'Temps keeps a history', 'Subscription & billing', '⌘\\ folds the sidebar', 'Esc', 'Settings has one door', 'kit v2', 'Chinese and Arabic']) {
    assert.ok(unreleased.includes(claim), `changelog names: ${claim}`);
  }
  assert.ok(!/—|–/.test(unreleased), 'the new notes carry no dashes');
});
