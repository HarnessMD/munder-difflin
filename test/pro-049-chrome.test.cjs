// 0.4.9 phase 6: the PRO chrome (the titlebar, the toasts, the dialogs) and
// W-C, the message pulse. What is pinned:
//
//   1. The PRO titlebar is the kit's: flat, no gradient, no "auto mode" text,
//      and no Simple | Technical (founder, 3 Sep 2026: it left the bar and
//      Settings keeps the one door); the Connected chip reads useTeamsMode and
//      opens the Team screen through the shell's one door; the theme control
//      says where a click goes, a moon while light and a sun while dark.
//   2. The Classic titlebar is untouched, gradient line included.
//   3. FullscreenTerminal and the five Classic transients are Classic only,
//      and nothing under pro/ reaches them.
//   4. The pulse: one subscription, beats that expire, a throttle that keeps
//      the glow and drops the dots, no dot for a person, reduced motion
//      respected, and the data attributes the overlay and the rows key on.
//   5. Every new string in every locale.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const SRC = path.join(ROOT, 'src/renderer/src');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
/** Source without comments or type-only imports (a type is not a pixel). */
const code = (s) => strip(s).replace(/^\s*import\s+type\s[^\n]*$/gm, '');

const app = code(read('src/renderer/src/App.tsx'));
const titlebar = code(read(`${PRO}/ProTitlebar.tsx`));
const transients = code(read(`${PRO}/ProTransients.tsx`));
const shell = code(read(`${PRO}/ProShell.tsx`));
const pulseSrc = code(read(`${PRO}/MessagePulse.tsx`));
const storeSrc = code(read(`${PRO}/pulseStore.ts`));

/* ---- 1. the PRO titlebar ---------------------------------------------------- */

test('the PRO titlebar is flat: no gradient, no auto mode text, kit controls only', () => {
  assert.ok(!/linear-gradient/.test(titlebar), 'the PRO titlebar carries a gradient');
  assert.ok(!/auto mode/i.test(titlebar), 'the auto mode text is not chrome in PRO (Part 3: Budget & breaker)');
  assert.match(titlebar, /background: 'var\(--cth-cream-50\)'/);
  assert.match(titlebar, /className="cth-titlebar-drag"/);
  assert.match(titlebar, /<IconBtn name=\{dark \? 'sun' : 'moon'\}/, 'the theme control draws the destination, not the idea of a theme');
  assert.match(titlebar, /<IconBtn name="settings"[^\n]*window\.dispatchEvent\(new CustomEvent\('cth:open-settings'\)\)/, 'the gear goes through the one Settings door');
  assert.match(titlebar, /<ModeSwitch \/>/);
  assert.ok(!/PixelPanel|PixelButton|PixelBadge|from '\.\.\/Icon'/.test(titlebar));
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(titlebar), 'a literal colour in a PRO file');
});

// The switch used to live here as a second door to config.audience. The
// founder took it off the bar on 3 Sep 2026: the titlebar is not where a
// person changes who they are. The guarantee this test now holds is that the
// second door is GONE and the first one still exists, so the setting did not
// leave with the control.
test('Simple | Technical left the titlebar, and Settings keeps the one door', () => {
  assert.ok(!/useDepth|<Seg<Depth>|pro\.chrome\.depth/.test(titlebar), 'the depth switch is back on the titlebar');
  assert.ok(!/\baudience\b/.test(titlebar), 'the titlebar writes config.audience');
  const settings = read('src/renderer/src/components/SettingsModal.tsx');
  assert.match(settings, /audience: simpleMode \? 'non-technical' : 'technical'|cfgX\.audience === 'non-technical'/, 'Settings no longer carries the audience switch');
});

test('the Connected chip reads the gate, draws nothing solo, and opens the Team screen through the one door', () => {
  const chip = titlebar.slice(titlebar.indexOf('export function ProConnectionChip'), titlebar.indexOf('/* ---- the version'));
  assert.match(chip, /const mode = useTeamsMode\(\)/);
  assert.match(chip, /if \(mode !== 'live' && mode !== 'degraded'\) return null/);
  assert.match(chip, /live \? t\('pro\.chrome\.connected'\) : t\('pro\.chrome\.reconnecting'\)/);
  assert.match(chip, /<StatusDot status=\{live \? 'success' : 'waiting'\} \/>/, 'mint for live, peach for degraded');
  assert.match(chip, /onClick=\{\(\) => proNavigate\(TEAM_PANE\)\}/);
  const nav = read(`${PRO}/proNav.ts`);
  assert.match(nav, /export const PRO_NAVIGATE_EVENT = 'cth:pro-navigate'/);
  assert.match(shell, /window\.addEventListener\(PRO_NAVIGATE_EVENT, onNav\)/);
  assert.match(shell, /if \(s && \(isProScreen\(s\) \|\| s === TEAM_PANE \|\| s in panesRef\.current\)\) go\(s\)/, 'the shell answers with the same go the sidebar uses');
});

test('the version chip is the update control, on the one state machine both skins share', () => {
  assert.match(titlebar, /const u = useUpdateBadge\(\)/);
  const hook = code(read('src/renderer/src/components/updateBadgeState.ts'));
  assert.match(hook, /export function useUpdateBadge\(\)/);
  assert.match(hook, /reduceStatus\(prev, next\)/);
  assert.match(hook, /describeUpdate\(status, __APP_VERSION__\)/);
  assert.ok(!/Pixel/.test(hook), 'the shared hook must carry no pixels');
  assert.match(code(read('src/renderer/src/components/UpdateBadge.tsx')), /useUpdateBadge\(\)/, 'the Classic badge renders from the same hook');
  assert.match(titlebar, /proToast\(t\('pro\.chrome\.latestToast', \{ version: u\.version \}\)/);
  assert.match(titlebar, /<StartedSheet version=\{u\.started\}/);
});

/* ---- 2. the Classic titlebar is untouched ---------------------------------- */

test('the Classic titlebar keeps its gradient, its auto mode text and its Team button', () => {
  assert.match(app, /background: 'linear-gradient\(180deg, var\(--cth-cream-100\) 0%, var\(--cth-cream-200\) 100%\)'/);
  assert.match(app, /\{config\.autoMode \? 'auto mode on' : 'auto mode off'\}/);
  assert.match(app, /<AppChromeSlot><TeamWindowButton \/><\/AppChromeSlot>/);
  assert.match(app, /\{skin === 'professional' \? \(\s*<ProTitlebar/);
  assert.match(app, /chrome=\{<AppChromeSlot><ProConnectionChip \/><\/AppChromeSlot>\}/);
  // Both titlebars are in the tree; the gradient appears exactly once.
  assert.equal((app.match(/linear-gradient/g) || []).length, 1);
});

/* ---- 3. Classic only ----------------------------------------------------- */

test('FullscreenTerminal and the five Classic transients are mounted for Classic only', () => {
  assert.match(app, /\{fullscreenAgentId && skin !== 'professional' && <FullscreenTerminal config=\{config\} \/>\}/);
  assert.match(app, /\{quitWarn && skin !== 'professional' && \(\s*<QuitWarningModal/);
  const overlay = app.slice(app.indexOf("{skin !== 'professional' ? (\n        <AppOverlaySlot"), app.indexOf('<ProTransients'));
  assert.ok(overlay.length > 0, 'the overlay slot is gated on the skin');
  for (const name of ['TeamsModal', 'TeamsToast', 'CompletionToast', 'UpdateToast']) {
    assert.match(overlay, new RegExp(`<${name}\\b`), `${name} is in the Classic overlay slot`);
    assert.equal((app.match(new RegExp(`<${name}\\b`, 'g')) || []).length, 1, `${name} is mounted once, in the Classic branch`);
  }
  assert.match(app, /<ProTransients quit=\{quitWarn \? \{ ptyCount: quitWarn\.ptyCount, \.\.\.quitHandlers \} : null\} \/>/);
  assert.ok(!/TeamsChrome/.test(app), 'the seam chip is not the PRO chip any more');
});

/** Every renderer module reachable from pro/** by value imports, the walk
 *  test/pro-fence.test.cjs runs. */
function reachableFromPro() {
  const dir = path.join(SRC, 'components/pro');
  const resolve = (from, spec) => {
    let base;
    if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2));
    else if (spec.startsWith('@shared/')) base = path.join(ROOT, 'src/shared', spec.slice('@shared/'.length));
    else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec);
    else return null;
    for (const c of [base, `${base}.ts`, `${base}.tsx`, path.join(base, 'index.ts'), path.join(base, 'index.tsx')]) {
      if (fs.existsSync(c) && fs.statSync(c).isFile()) return c;
    }
    return null;
  };
  const seen = new Set();
  const stack = fs.readdirSync(dir).filter((f) => /\.tsx?$/.test(f)).map((f) => path.join(dir, f));
  while (stack.length) {
    const f = stack.pop();
    if (seen.has(f)) continue;
    seen.add(f);
    const src = code(fs.readFileSync(f, 'utf8'));
    for (const m of src.matchAll(/(?:import|export)\s[^'"]*?from\s*['"]([^'"]+)['"]|import\(\s*['"]([^'"]+)['"]\s*\)/g)) {
      const r = resolve(f, m[1] || m[2]);
      if (r && /\.tsx?$/.test(r) && !seen.has(r)) stack.push(r);
    }
  }
  return seen;
}

test('nothing under pro/ reaches the Classic transients or the fullscreen terminal', () => {
  const files = [...reachableFromPro()].map((f) => path.relative(ROOT, f));
  assert.ok(files.length > 100, 'the walk is armed');
  for (const f of ['UpdateToast.tsx', 'CompletionToast.tsx', 'QuitWarningModal.tsx', 'FullscreenTerminal.tsx']) {
    assert.ok(!files.some((x) => x.endsWith(`/${f}`)), `PRO reaches ${f}`);
  }
  // The release drop LEFT this list on 5 Sep 2026 (founder: "make sure that
  // our release drop shows up with the new update"). It is not a Classic
  // surface PRO must not touch but a skin-exempt one both skins mount as is
  // (ReleaseDrop.tsx explains why its sandboxed srcdoc can never follow a
  // skin), so the guarantee is now positive: PRO must reach it.
  assert.ok(files.some((x) => x.endsWith('/ReleaseDrop.tsx')), 'the release drop must be reachable from PRO');
  // TeamsToast and TeamsModal live in the seam, which PRO does reach for its
  // rows and panes; the names themselves must not be used under pro/.
  for (const f of fs.readdirSync(path.join(SRC, 'components/pro'))) {
    if (!/\.tsx?$/.test(f)) continue;
    assert.ok(!/\bTeamsToast\b|\bTeamsModal\b|\bTeamsChrome\b/.test(code(read(`${PRO}/${f}`))), `${f} names a Classic transient`);
  }
});

/* ---- the transients, the same facts through the kit ------------------------ */

test('PRO transients subscribe to the same pushes and hooks the Classic ones do, and render through the kit', () => {
  assert.match(transients, /api\.onUpdateStatus\?\.\(offer\)/);
  assert.match(transients, /api\.updateCurrent\?\.\(\)\.then\(offer\)/);
  // The offer is the kit's update card since 5 Sep 2026 (founder: the popup
  // follows the pro design), not the one line toast, and an authored release
  // body upgrades the whole moment to the centered drop, as under Classic.
  assert.match(transients, /<ProUpdateCard\b/, 'the offer renders the kit card');
  assert.match(transients, /<ReleaseDrop\b/, 'an authored release upgrades the offer to the drop');
  assert.match(transients, /extractDropHtml/, 'the same authored-block condition Classic uses decides');
  const updateCard = code(read(`${PRO}/ProUpdateCard.tsx`));
  assert.match(updateCard, /t\('pro\.notice\.restartToUpdate'\)/, 'the downloaded state offers Restart to update');
  assert.match(updateCard, /t\('pro\.notice\.later'\)/, 'later is always an answer');
  assert.match(updateCard, /summarizeReleaseNotes/, 'the card carries the what\'s new digest');
  assert.match(updateCard, /notes\.length > 0 &&/, 'no notes, no digest block');
  assert.match(updateCard, /maxHeight: 96, overflowY: 'auto'/, 'the digest is clamped, never a card that grows with the notes');
  assert.ok(!/boxShadow: '[^']*\d+px \d+px 0(?![.\d])/.test(updateCard), 'no hard offset shadow; that is the Classic look');
  assert.match(transients, /window\.cth\.updateRestartAndInstall\(\)/);
  assert.match(transients, /shown\.downloadUrl \?\? shown\.url/);
  assert.match(transients, /window\.addEventListener\('cth:show-release-notes', onShow\)/, 'what\'s new is still answered under PRO');
  assert.match(transients, /window\.cth\?\.onRealtimeCompletion/);
  assert.match(transients, /\{ ms: COMPLETION_MS, tone: 'ok' \}/);
  assert.match(transients, /const rows = useRequestRows\(\)/);
  assert.match(transients, /decide\(r\.id, 'allow-once'\)/);
  assert.match(transients, /<RekeyHost render=\{\(p\) => <RekeyDialog \{\.\.\.p\} \/>\} \/>/);
  assert.match(transients, /<Fingerprint value=\{mate\.fingerprint\} compareTo=\{mate\.previousFingerprint\} \/>/);
  assert.match(transients, /zIndex=\{1000\}/, 'the quit sheet outranks everything');
  // The quit sheet has TWO doors (founder, 5 Sep 2026: closing time left the
  // quit flow entirely): keep them running, or kill all and quit, with the
  // kill's consequences spelled out before the person picks it.
  assert.match(transients, /t\('pro\.quit\.keep'\)/);
  assert.match(transients, /t\('pro\.quit\.killAll'\)/);
  assert.match(transients, /t\('pro\.quit\.killBody'\)/, 'the sheet says what the kill does');
  assert.match(transients, /t\('pro\.quit\.killKeeps'\)/, 'and what survives it');
  assert.ok(!/closingTime|ClosingTime|pro\.quit\.ct/.test(transients),
    'closing time must not be reachable from the quit sheet');
  assert.ok(!/PixelPanel|PixelButton|PixelBadge|from '\.\.\/Icon'/.test(transients));
  assert.ok(!/position: '(fixed|absolute)'/.test(transients), 'ProTransients places nothing itself; toasts go through proToast, dialogs through Sheet, and the update card and the drop own their own layer in their own files');
  // The seam grew the exports PRO needs and Classic still renders through them.
  const seam = code(read('src/renderer/src/components/team/teamsSeam.tsx'));
  assert.match(seam, /export function useRequestRows\(\)/);
  assert.match(seam, /export function decide\(/);
  assert.match(seam, /export function RekeyHost\(/);
  assert.match(seam, /export function TeamsModal\(\) \{\s*return <RekeyHost render=\{\(p\) => <FingerprintWarning \{\.\.\.p\} \/>\} \/>;/);
  // The kit grew what this phase needed and nothing else.
  const ui = code(read(`${PRO}/ui.tsx`));
  assert.match(ui, /if \(ms > 0\) window\.setTimeout\(\(\) => dismissToast\(id\), ms\)/, 'ms: 0 is a toast that waits');
  assert.match(ui, /export function toastShowing\(id: number\)/);
  assert.match(ui, /zIndex = 280, children \}: \{ onClose: \(\) => void; width\?: number; zIndex\?: number/);
});

/* ---- 4. W-C, the message pulse ------------------------------------------- */

test('the pulse has one feed, on the router stream, mounted once in the shell', () => {
  assert.match(pulseSrc, /export function usePulseFeed\(\)/);
  assert.match(pulseSrc, /return api\.onHiveMessage\(\(e\) => \{/);
  assert.match(pulseSrc, /const targets = e\.targets\?\.length \? e\.targets : \[e\.to\]/);
  assert.match(pulseSrc, /for \(const to of targets\) pulse\(e\.from, to\)/);
  assert.equal((shell.match(/usePulseFeed\(\)/g) || []).length, 1);
  for (const f of fs.readdirSync(path.join(SRC, 'components/pro'))) {
    if (!/\.tsx?$/.test(f) || f === 'ProShell.tsx' || f === 'MessagePulse.tsx') continue;
    assert.ok(!/onHiveMessage\(\(e\) => \{\s*const targets/.test(code(read(`${PRO}/${f}`))), `${f} has a second pulse feed`);
  }
});

test('beats expire, more than six in a second lose their dots, and a person never gets one', () => {
  const S = loadTs(`${PRO}/pulseStore.ts`);
  S.resetPulse();
  assert.equal(S.BEAT_MS, 1200);
  assert.equal(S.MAX_DOTS_PER_WINDOW, 6);
  const t0 = 1_000_000;
  const b = S.pulse('god', 'jim', t0);
  assert.ok(b && b.dot, 'the first beat travels');
  assert.equal(S.isLive('god'), true);
  assert.equal(S.isLive('jim'), true);
  assert.equal(S.isLive('pam'), false);
  S.expireBeats(t0 + S.BEAT_MS - 1);
  assert.equal(S.isLive('jim'), true, 'a beat lives BEAT_MS');
  S.expireBeats(t0 + S.BEAT_MS);
  assert.equal(S.isLive('jim'), false, 'and then it is gone');
  assert.equal(S.readBeats().length, 0);
  // Throttle: seven beats inside a second, the seventh glows without a dot.
  const dots = [];
  for (let i = 0; i < 7; i++) dots.push(S.pulse('god', `a${i}`, t0 + 2000 + i * 50).dot);
  assert.deepEqual(dots, [true, true, true, true, true, true, false]);
  assert.equal(S.isLive('a6'), true, 'the throttled beat still glows');
  // A second later the window has moved on and dots return.
  assert.equal(S.pulse('god', 'a7', t0 + 4000).dot, true);
  // A message to or from the person glows the agent only.
  assert.equal(S.pulse('human', 'jim', t0 + 6000).dot, false);
  assert.equal(S.pulse('jim', 'human', t0 + 6001).dot, false);
  assert.equal(S.isLive('jim'), true);
  assert.equal(S.pulse('jim', 'jim', t0 + 6002), null, 'a message to oneself is nothing');
  // Subscribers hear every change.
  let n = 0;
  const off = S.subscribeBeats(() => { n++; });
  S.pulse('god', 'pam', t0 + 8000);
  S.expireBeats(t0 + 8000 + S.BEAT_MS);
  off();
  assert.equal(n, 2);
  S.resetPulse();
});

test('the ring is a 2px accent box-shadow, the rows glow soft, and reduced motion drops the dot', () => {
  assert.match(pulseSrc, /export const BEAT_RING = '0 0 0 2px var\(--cth-accent\)'/);
  assert.match(pulseSrc, /window\.matchMedia\('\(prefers-reduced-motion: reduce\)'\)\.matches/);
  assert.match(pulseSrc, /if \(dots\.length === 0 \|\| reducedMotion\(\)\) return null/);
  assert.match(pulseSrc, /<circle r=\{3\.5\} fill="var\(--cth-accent\)"/, 'a 7px accent dot');
  assert.match(pulseSrc, /getBoundingClientRect\(\)/);
  assert.match(pulseSrc, /\[data-agent="\$\{CSS\.escape\(id\)\}"\]/);
  assert.ok(!/requestAnimationFrame/.test(pulseSrc), 'motion is CSS; MemoryScreen stays the one frame loop in PRO');
  assert.match(pulseSrc, /@keyframes pro-pulse-travel/);
  const agents = code(read(`${PRO}/AgentsScreen.tsx`));
  assert.match(agents, /dataAttrs=\{\{ 'data-agent': godId \}\}/);
  assert.match(agents, /const godId = god\?\.id \?\? 'god'/);
  assert.match(agents, /dataAttrs=\{\{ 'data-agent': a\.id \}\}/);
  assert.match(agents, /boxShadow: beat \? BEAT_RING : undefined/);
  assert.match(agents, /boxShadow: godBeat \? BEAT_RING : undefined/);
  assert.match(agents, /<PulseOverlay \/>/);
  assert.ok(!/border(Top|Bottom|Left|Right)?Width: [2-9]/.test(agents), 'never a thicker border for the beat');
  const sidebar = code(read(`${PRO}/ProSidebar.tsx`));
  assert.match(sidebar, /data-agent-nav=\{agent\.id\}/);
  assert.match(sidebar, /const beat = useBeat\(agent\.id\)/);
  // The V2 row (0.5.3, F25) rings for the beat instead of filling, the
  // prototype's rule: an accent hairline with a soft accent inset.
  assert.match(sidebar, /boxShadow: beat \? 'inset 0 0 0 1px var\(--cth-accent\), inset 0 0 0 3px var\(--cth-accent-soft\)' : active/);
  const ui = code(read(`${PRO}/ui.tsx`));
  assert.match(ui, /dataAttrs\?: Record<`data-\$\{string\}`, string \| undefined>/);
});

/* ---- 5. strings ---------------------------------------------------------- */

test('every phase 6 string exists in the three locales, with no banned word and no dash', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
  const used = new Set();
  const updateCard = code(read(`${PRO}/ProUpdateCard.tsx`));
  for (const src of [titlebar, transients, updateCard]) {
    for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) used.add(m[1]);
  }
  for (const k of ['pro.chrome.connected', 'pro.chrome.reconnecting', 'pro.chrome.themeLight', 'pro.chrome.themeDark', 'pro.notice.restartToUpdate', 'pro.notice.request', 'pro.quit.killAll', 'pro.quit.killBody', 'pro.quit.killKeeps']) {
    assert.ok(used.has(k), `${k} is used`);
  }
  for (const key of ['restart', 'update', 'download', 'downloading', 'checking', 'failed', 'latest']) used.add(`pro.chrome.update.${key}`);
  const banned = /\b(harness config|hive|floor|spawn|spawned|spawns|palace|awaiting|starting up|block tools|semantic memory|pty)\b/i;
  for (const k of used) {
    for (const l of Object.keys(locales)) {
      assert.ok(locales[l].has(k), `${k} in ${l}`);
      const v = locales[l].get(k);
      assert.ok(!/[—–]/.test(v) && !/ - /.test(v), `${k} (${l}) carries a dash`);
      if (l === 'en') assert.ok(!banned.test(v), `${k} uses a banned word: ${v}`);
    }
  }
  // Interpolating keys are called with their variables.
  assert.match(transients, /t\('pro\.quit\.runningMany', \{ count: ptyCount \}\)/);
  assert.match(titlebar, /t\('pro\.chrome\.startedOn', \{ os: steps\.os \}\)/);
});
