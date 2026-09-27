// v0.4.9 phase 1 (plan Part 4 section 1, Part 8 phase 1, census G1, decision
// D2): onboarding rebuilt PRO native. PRO mounts the three step card and
// Classic keeps its chain; the join underneath is the one FirstRunFlow runs;
// the completion writes the same config the Classic wizard writes; the
// audience question is asked; the picker is a Settings surface under PRO; the
// lock takeover is the kit under PRO; every string is in every locale, with
// none of the banned words and no dashes.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
const PRO = 'src/renderer/src/components/pro';
const OB = `${PRO}/onboarding`;
const obFiles = () => fs.readdirSync(path.join(ROOT, OB)).filter((f) => /\.tsx?$/.test(f)).map((f) => `${OB}/${f}`);

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));

/* ---- the skin branch --------------------------------------------------------- */

test('App.tsx: PRO mounts the new flow, Classic keeps its chain exactly, and the lock takes the kit under PRO', () => {
  const app = strip(read('src/renderer/src/App.tsx'));
  assert.match(app, /import \{ ProOnboarding \} from '@\/components\/pro\/onboarding\/ProOnboarding';/);
  assert.match(app, /import \{ ProTakeover \} from '@\/components\/pro\/onboarding\/ProTakeover';/);
  // The first run. REWRITTEN 5 Sep 2026 (third pass): ONE onboarding for
  // every fresh install on any skin — the founder kept this design and put
  // the sign-in inside it, so the skin branch and the Classic wizard chain
  // are gone from the fresh path.
  assert.match(app, /if \(!config\.onboardingComplete\) \{[\s\S]{0,700}?return <ProOnboarding onComplete=\{\(next\) => \{ setConfig\(next\); setHiveOpened\(true\); \}\} \/>;/,
    'the one onboarding completes into the same two setters the wizard did');
  const fresh = app.slice(app.indexOf('if (!config.onboardingComplete) {'), app.indexOf('<HivePicker'));
  assert.ok(!/OnboardingWizard|FirstRunFlow|skin === 'professional'/.test(fresh),
    'no skin branch and no Classic chain in the fresh path');
  // The onboarded machine with no way in: signed in and unpaid meets the
  // paywall, no account meets the same two doors step one offers.
  assert.match(app, /if \(freeAdmits\(free\)\) return <Paywall onFree=/, 'the signed-in wall is the paywall');
  assert.match(app, /return <ProOnboarding entryOnly \/>;/, 'the accountless wall is the two doors');
  const flow = strip(read(`${OB}/ProOnboarding.tsx`));
  assert.match(flow, /if \(entryOnly\) \{[\s\S]*?<EntryStep/, 'and entryOnly draws the entry step, not a message');
  assert.match(flow, /<EntryStep\s+step=\{0\}/, 'which is the same screen step one draws');
  // The lock.
  assert.match(app, /return skin === 'professional' \? <ProTakeover \/> : <TeamsLock \/>;/);
  // The picker: PRO opens the current workspace on launch; Classic keeps the picker.
  assert.match(app, /return appSkin\(\) === 'professional';\s*\}\);/, 'hiveOpened initialises from the skin, once, at mount');
  assert.match(app, /if \(!hiveOpened\) \{\s*return <HivePicker config=\{config\} onOpenCurrent=/, 'Classic still gets the picker');
  assert.match(app, /useHive\(hiveOpened \? config : null\)/, 'the hive still waits on hiveOpened');
});

/* ---- the join ------------------------------------------------------------------ */

test('the join is one flow: the bridge and the state machine live in joinFlow.ts and both surfaces consume it', () => {
  const flow = strip(read('src/renderer/src/components/team/onboarding/joinFlow.ts'));
  for (const door of ['api.teamsSignInBegin()', 'api.teamsSignInPaste(p)', 'api.teamsSignInCancel()', 'api.onTeamsGrant(cb)', 'api.teamsEnrol(i)', 'api.onTeamsEnrolProgress(cb)']) {
    assert.ok(flow.includes(door), `joinFlow.ts drives the real bridge: ${door}`);
  }
  assert.match(flow, /if \(enrolling\.current\) return;\s*enrolling\.current = true;/, 'one enrol per grant');
  assert.match(flow, /\}, 5 \* 60_000\);/, 'the five minute wait for the grant');
  assert.match(flow, /export function useJoinFlow\(start: 'choose' \| 'code' = 'choose'\): JoinFlow/);
  const classic = strip(read('src/renderer/src/components/team/onboarding/FirstRunFlow.tsx'));
  assert.match(classic, /const join = useJoinFlow\('choose'\);/);
  assert.ok(!/teamsEnrol|signInBegin|enrolling\.current/.test(classic), 'FirstRunFlow no longer carries its own copy of the join');
  for (const screen of ['<FirstLaunch', '<EnterInviteCode', '<SignInWait', '<IdentitySetup', '<JoinedSummary']) {
    assert.ok(classic.includes(screen), `Classic still draws ${screen}`);
  }
  const pro = strip(read(`${OB}/JoinStep.tsx`));
  assert.match(pro, /const join = useJoinFlow\('code'\);/, 'PRO starts on the code: the sentence about the console is its D1');
  for (const call of ['join.submitCode(code)', 'join.pasteGrant(pasted.trim())', 'join.openAgain', 'join.backToCode', 'join.retry', 'join.secondMachine']) {
    assert.ok(pro.includes(call), `JoinStep wires ${call}`);
  }
  assert.match(pro, /onDone\(\{ org: \{ name: orgName \}, level: roster\.defaultPermission \}\)/, 'the FirstRunResult contract is kept');
  assert.match(pro, /const ROWS: EnrolProgress\[\] = \['keys', 'registering', 'checking'\];/, 'the three enrol rows main pushes');
});

test('the invite code field accepts the code as it is written and as it is pasted', () => {
  const src = read(`${OB}/JoinStep.tsx`);
  assert.match(src, /if \(clean\.length >= 10 && clean\.startsWith\('MD'\)\) clean = clean\.slice\(2\);/, 'a pasted whole code loses its prefix');
  assert.match(src, /return clean\.slice\(0, 8\);/);
  assert.match(src, /const code = `MD-\$\{body\.slice\(0, 4\)\}-\$\{body\.slice\(4\)\}`;/);
});

/* ---- the completion contract ---------------------------------------------------- */

function completionKeys(src) {
  const at = src.indexOf('const next = await window.cth.updateConfig({');
  assert.ok(at > 0, 'the completion write was not found');
  const body = src.slice(at, src.indexOf('});', at));
  const keys = [];
  for (const line of body.split('\n').slice(1)) {
    const m = line.match(/^\s*([A-Za-z_]\w*)\s*(?::|,|\/\/|$)/);
    if (m) keys.push(m[1]);
  }
  return keys.sort();
}

test('the completion writes exactly the fields the Classic wizard writes, through the same two doors', () => {
  const wizard = read('src/renderer/src/components/OnboardingWizard.tsx');
  const pro = read(`${OB}/ProOnboarding.tsx`);
  const expected = ['audience', 'autoMode', 'godModel', 'godProvider', 'harnessHome', 'onboardingComplete', 'registeredRepos', 'telemetryEnabled'];
  assert.deepEqual(completionKeys(wizard), expected, 'the parser reads the wizard (the guard is armed)');
  assert.deepEqual(completionKeys(pro), completionKeys(wizard));
  for (const src of [wizard, pro]) {
    assert.match(src, /await window\.cth\.ensureHarnessHome\(harnessHome\)/, 'the folder is created before the config says it exists');
    assert.match(src, /if \(engineBlocked\) \{/, 'an engine that cannot boot is refused at completion too');
  }
  assert.match(pro, /onboardingComplete: true,\s*audience: draft\.readAs \?\? 'technical',/, 'the audience answer is the config field');
  assert.match(pro, /registeredRepos: \[\],\s*autoMode: true,/, "the wizard's defaults for the steps PRO does not have");
  assert.match(pro, /telemetryEnabled: true/);
});

/* ---- the workspace step ----------------------------------------------------------- */

test('the audience question asks about the PERSON, and feeds the depth store as soon as it is answered', () => {
  const src = strip(read(`${OB}/WorkspaceStep.tsx`));
  assert.match(src, /\['non-technical', t\('pro\.onboarding\.workspace\.plain'\), t\('pro\.onboarding\.workspace\.plainDesc'\)\]/);
  assert.match(src, /\['technical', t\('pro\.onboarding\.workspace\.technical'\), t\('pro\.onboarding\.workspace\.technicalDesc'\)\]/);
  assert.match(src, /import \{ setAudience \} from '\.\.\/depth';/);
  assert.match(src, /onChange\(\{ \.\.\.draft, readAs: audience \}\);\s*setAudience\(audience\);/);
  assert.match(src, /const ready = !problem && !!draft\.readAs;/, 'Continue waits for the answer');
  // Founder, 3 Sep 2026: the question is about the reader, not the screen.
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
  assert.equal(en.pro.onboarding.workspace.readAs, 'Are you technical or non-technical?');
});

// DEPTH IS A LANGUAGE SETTING, NEVER A FEATURE GATE (founder, 3 Sep 2026).
// The model select used to be drawn only for the technical answer, so the
// non technical side lost a control instead of getting plainer words for it.
test('neither answer loses a field: the model select is drawn for both', () => {
  const orch = strip(read(`${OB}/OrchestratorStep.tsx`));
  assert.ok(!/readAs === 'technical'/.test(orch), 'depth gates a control on the orchestrator step');
  assert.ok(!/useTechnical|technical \?/.test(orch), 'depth reaches the orchestrator step at all');
  assert.match(orch, /preset\.supportsModel && \(\s*<Field label=\{t\('pro\.onboarding\.workspace\.model'\)\}/, 'the model select follows the ENGINE, not the reader');
});

test('the engine choice is real: probed, refused when it cannot boot, and the model follows the engine', () => {
  const step = strip(read(`${OB}/OrchestratorStep.tsx`));
  const flow = strip(read(`${OB}/ProOnboarding.tsx`));
  assert.match(flow, /setEngines\(await window\.cth\.toolsStatus\(\)\)/);
  assert.match(flow, /engineBlocksOnboarding\(classifyEngineAvailability\(engines, draft\.provider\)\)/);
  // EVERY engine, the same list the add agent sheet offers (founder, 3 Sep
  // 2026). Three of them cannot receive a message from another agent; they
  // are still offered, with what that costs said in a sentence, because
  // hiding an engine is not the same as explaining it.
  assert.match(step, /AGENT_PROVIDER_PRESETS\.map\(\(p\) => \(\{ value: p\.id, label: p\.label \}\)\)/, 'the same engines the add agent sheet offers');
  assert.ok(!/canReceiveInbox\(p\.id\)/.test(step), 'engines are filtered out of the list again');
  assert.match(step, /!preset\.canReceiveInbox && \(\s*<Note>\{t\('pro\.onboarding\.orchestrator\.noInbox'/, 'and the cost is said, not hidden');
  assert.match(step, /model: providerPreset\(provider\)\.recommendedOrchestratorModel/);
  assert.match(step, /modelsForProvider\(draft\.provider\)/);
  assert.match(step, /window\.cth\.openExternal\(availability\.docsUrl!\)/, 'install instructions open the real page');
  // A custom engine is the one the app cannot build a command for.
  assert.match(step, /customEngine && \(/);
  assert.match(step, /const commandMissing = customEngine && !\(draft\.command \?\? ''\)\.trim\(\);/, 'a custom engine with no command cannot continue');
  assert.match(flow, /draft\.provider === 'custom' && draft\.command\?\.trim\(\) \? \{ defaultCommand: draft\.command\.trim\(\) \} : \{\}/);
});

// The founder walked into this one: a folder called "My Workspace" is not a
// folder segment. It is refused with the fix offered, never rewritten while
// the person is still typing.
test('a space in the workspace name is refused in validation, not stripped', () => {
  const step = strip(read(`${OB}/WorkspaceStep.tsx`));
  const flow = strip(read(`${OB}/ProOnboarding.tsx`));
  assert.match(step, /export function nameProblem\(raw: string\): 'empty' \| 'space' \| null \{[\s\S]*?if \(\/\\s\/\.test\(raw\)\) return 'space';/);
  assert.match(step, /\{problem === 'space' && \(/, 'the refusal is on the field');
  assert.match(step, /onChange\(\{ \.\.\.draft, name: suggestion \}\)/, 'and the fix is one click');
  assert.match(flow, /const problem = nameProblem\(draft\.name\);/, 'the last write checks it too');
});

test('name and folder are one fact: the name is the folder\'s last segment, Browse sets both, the default is the wizard\'s', () => {
  const step = strip(read(`${OB}/WorkspaceStep.tsx`));
  const flow = strip(read(`${OB}/ProOnboarding.tsx`));
  assert.match(step, /export function draftHome\(d: WorkspaceDraft\): string \{\s*return d\.dir \? `\$\{d\.dir\}\/\$\{d\.name\}` : d\.name;/);
  assert.match(step, /const res = await window\.cth\.chooseFolder\(\);\s*if \(res\.ok\) onChange\(\{ \.\.\.draft, \.\.\.splitPath\(res\.path\) \}\);/);
  assert.match(step, /const cleanName = \(raw: string\) => raw\.replace\(\/\[\/\\\\\]\/g, ''\);/, 'a name is a folder segment');
  assert.match(flow, /dir: '~', name: 'HarnessAgents'/, "the wizard's ~/HarnessAgents default");
});

/* ---- the team step ---------------------------------------------------------------- */

test('the last step shows ONLY the orchestrator: boot spawns one agent, so the screen promises one', () => {
  // Founder, 5 Sep 2026: the step used to show a second "first hire" card that
  // boot never spawned. The screen now shows exactly what opening the
  // workspace starts, which is the orchestrator and nothing else.
  const src = strip(read(`${OB}/TeamStep.tsx`));
  assert.match(src, /<CastPortrait character="michael" size=\{40\} isGod \/>/);
  assert.equal((src.match(/<CastPortrait /g) ?? []).length, 1, 'one card, one sprite');
  assert.ok(!/DEFAULT_CHARACTER|OFFICE_CAST/.test(src), 'no phantom first hire on the screen');
  assert.ok(!/onEditFirstAgent|firstAgentLine/.test(src), 'no Change button for an agent that does not exist');
  assert.match(src, /<Chip tone="accent">\{t\('pro\.onboarding\.team\.orchestrator'\)\}<\/Chip>/);
  assert.ok(!/initials/i.test(src), 'agents are never initials');
  const ui = read(`${PRO}/ui.tsx`);
  assert.match(ui, /export function CastPortrait\(/);
  // Portrait went bare on 5 Sep 2026; the chip stays only on CastPortrait,
  // which is exactly the box these onboarding cards ask for.
  assert.match(ui, /export function Portrait\(\{ agent, size \}[^\n]*\n\s*return <SpritePortrait character=\{agent\.character\} size=\{size\} \/>;/, 'agent rows are the bare sprite');
  // The dead plumbing went with the card: no render site ever passed the prop.
  assert.ok(!/onEditFirstAgent/.test(strip(read(`${OB}/ProOnboarding.tsx`))), 'the prop died with the card');
});

/* ---- the picker, from Settings ---------------------------------------------------- */

test('under PRO the workspace surface is reached from Settings and uses the HivePicker\'s data and doors', () => {
  const picker = strip(read(`${OB}/WorkspacePicker.tsx`));
  assert.match(picker, /const SKIP_KEY = 'cth\.skipHivePickerOnce';/);
  assert.match(picker, /await window\.cth\.changeHome\(path, 'fresh'\)/);
  assert.match(picker, /await window\.cth\.chooseFolder\(\)/);
  assert.match(picker, /config\.recentHives \?\? \[\]/);
  assert.match(picker, /if \(current && path === current\) \{ onClose\(\); return; \}/, 'the current workspace is already open');
  for (const k of ['pro.workspace.current', 'pro.workspace.recent', 'pro.workspace.switch', 'pro.workspace.openAnother', 'pro.workspace.createNew']) {
    assert.ok(picker.includes(`t('${k}')`), `the row set names ${k}`);
  }
  const settings = strip(read(`${PRO}/SettingsScreen.tsx`));
  assert.match(settings, /<Sheet onClose=\{\(\) => setWorkspace\(false\)\} width=\{560\}>\s*<WorkspacePicker config=\{config\} onClose=/);
  assert.match(settings, /<Btn onClick=\{\(\) => setWorkspace\(true\)\}/);
  const hive = strip(read('src/renderer/src/components/HivePicker.tsx'));
  assert.match(hive, /window\.cth\.changeHome\(path, 'fresh'\)/, 'Classic keeps its picker unchanged');
});

/* ---- the takeovers ------------------------------------------------------------------ */

test('the lock takeover under PRO: the kit card, one reason at a time, the shared remedies', () => {
  const src = strip(read(`${OB}/ProTakeover.tsx`));
  assert.match(src, /import \{ useLockInfo, useLockRemedies \} from '\.\.\/\.\.\/team\/teamsMode';/);
  assert.match(src, /if \(!LOCK_APP_ON_REVOKE \|\| !lock\) return null;/, 'same gate as TeamsLock');
  assert.match(src, /<Btn kind="primary" onClick=\{onReconnect\}>\{t\('team\.revoked\.reconnect'\)\}<\/Btn>/);
  assert.match(src, /\{copy === 'removed' && <Btn onClick=\{onEnterNewCode\}>/, 'a new code only when the key cannot re-enrol');
  assert.ok(!/onContinueSolo/.test(src), 'local work is not offered under the lock');
  assert.match(src, /<Card style=/);
  const mode = strip(read('src/renderer/src/components/team/teamsMode.ts'));
  assert.match(mode, /export function useLockRemedies\(\)/);
  const seam = strip(read('src/renderer/src/components/team/teamsSeam.tsx'));
  assert.ok(!/function useLockRemedies/.test(seam), 'the seam no longer keeps its own copy');
  assert.match(seam, /useLockRemedies, useMembership/, 'the seam imports the shared one');
  assert.match(seam, /skin === 'professional' \? \(\s*<ProUpgradeToTeams onSetUpTeam=\{setUp\} \/>/, 'the upgrade card is the kit under PRO');
  const up = strip(read(`${OB}/ProUpgradeToTeams.tsx`));
  assert.ok(!/onJoinExisting/.test(up), 'PRO does not draw the button whose handler does nothing');
});

/* ---- kit only, tokens only ----------------------------------------------------------- */

test('every onboarding file is built from the kit: no Classic pixels, no literal colours, no thick edges', () => {
  for (const f of obFiles()) {
    const src = strip(read(f));
    assert.ok(!/from\s*['"][^'"]*\/(PixelPanel|PixelButton|PixelBadge|Icon)['"]/.test(src), `${f} imports Classic pixels`);
    assert.ok(!/<Pixel(Panel|Button|Badge)\b/.test(src), `${f} draws Classic pixels`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src.replace(/aria-[a-z]+=/g, '')), `${f} carries a literal colour`);
    for (const m of src.matchAll(/border(Left|Right|Top|Bottom)\s*:\s*[`'"]([^`'"]+)[`'"]/g)) {
      assert.match(m[2], /^1px /, `${f}: border${m[1]} is not a 1px hairline`);
    }
  }
});

/* ---- the strings ----------------------------------------------------------------------- */

const BANNED_WORDS = /\b(harness config|hive|floor|spawn|spawned|spawns|palace|awaiting|starting up|block tools|semantic memory|pty)\b/i;

test('every string the phase uses exists in all three locales, static keys and each enumerated family', () => {
  const keys = new Set();
  for (const f of [...obFiles(), `${PRO}/SettingsScreen.tsx`]) {
    const src = strip(read(f));
    for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) keys.add(m[1]);
  }
  assert.ok(keys.size > 60, `parser found only ${keys.size} keys; the guard is disarmed`);
  // Template families, enumerated from the modules that declare them.
  const teams = read('src/shared/teams.ts');
  const codeErrors = [...teams.match(/export type CodeError = ([^;]+);/)[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  const progress = [...teams.match(/export type EnrolProgress = ([^;]+);/)[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  assert.equal(codeErrors.length, 6); assert.equal(progress.length, 3);
  for (const c of codeErrors) keys.add(`pro.onboarding.join.error.${c}`);
  for (const p of progress) keys.add(`pro.onboarding.join.identity.${p}`);
  for (const copy of ['suspended', 'removed', 'entitlement', 'unknown', 'lease']) for (const part of ['pill', 'title', 'body']) keys.add(`team.revoked.${copy}.${part}`);
  const missing = [];
  for (const k of keys) for (const l of Object.keys(locales)) if (typeof locales[l].get(k) !== 'string') missing.push(`${k} (${l})`);
  assert.deepEqual(missing, []);
});

test('the new families: identical key sets, no banned word, no dash of any kind, no English left in the other two', () => {
  const fam = (l) => [...locales[l].keys()].filter((k) => k.startsWith('pro.onboarding.') || k.startsWith('pro.workspace.')).sort();
  const en = fam('en');
  assert.ok(en.length >= 70, `sanity: ${en.length} keys`);
  assert.deepEqual(fam('zh-CN'), en);
  assert.deepEqual(fam('ar'), en);
  const SAME_ON_PURPOSE = new Set(['pro.onboarding.join.codePlaceholder']);
  for (const k of en) {
    const v = locales.en.get(k);
    assert.ok(!BANNED_WORDS.test(v), `${k} uses a banned word: ${v}`);
    assert.ok(!/[—–]| - /.test(v), `${k} carries a dash: ${v}`);
    if (/[A-Za-z]{4}/.test(v) && !SAME_ON_PURPOSE.has(k)) {
      assert.notEqual(locales['zh-CN'].get(k), v, `${k} is untranslated in zh-CN`);
      assert.notEqual(locales.ar.get(k), v, `${k} is untranslated in ar`);
    }
  }
});

test('the fence walks pro/onboarding: the fence, the border rule and the locale rule all see the subdirectory', () => {
  assert.match(read('test/pro-fence.test.cjs'), /const roots = walk\(PRO\);/);
  assert.match(read('test/pro-nav.test.cjs'), /e\.isDirectory\(\) \? files\(/);
  assert.match(read('test/pro-phase6.test.cjs'), /e\.isDirectory\(\) \? proFiles\(/);
});
