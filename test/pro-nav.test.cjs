// PRO's sidebar rows and its screens are paired by id, and the pairing is what
// the old rail lost: `tasks` and `askme` were declared, had rows, and had no
// pane branch, so both opened the org chart. These tests make that class of
// defect fail here instead of in front of the founder.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const loadTs = require('./load-ts.cjs');

const nav = loadTs('src/renderer/src/components/pro/proNav.ts');
const shell = read('src/renderer/src/components/pro/ProShell.tsx');
const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
const app = read('src/renderer/src/App.tsx');
const seam = read('src/renderer/src/components/team/teamsSeam.tsx');

test('every fixed screen has a branch in ProShell', () => {
  for (const s of nav.PRO_SCREENS) {
    assert.match(shell, new RegExp(`case '${s}':`), `ProShell has no case for '${s}'`);
  }
});

test('the sidebar only draws rows for screens that exist', () => {
  // ICON_FOR is keyed by the fixed screens; a row the sidebar can draw must be
  // one the shell can open. The seam's rows are strings from Creed's file and
  // are checked by test/teams-seam.test.cjs against teamsPanes.
  const start = sidebar.indexOf('const ICON_FOR');
  const body = sidebar.slice(start, sidebar.indexOf('};', start));
  const iconKeys = [...body.matchAll(/(\w+): '[a-zA-Z]+'/g)].map((m) => m[1]);
  assert.ok(iconKeys.length > 0, 'parser found no ICON_FOR keys; the guard is disarmed');
  assert.deepEqual(new Set(iconKeys), new Set(nav.PRO_SCREENS));
  for (const k of iconKeys) assert.ok(nav.isProScreen(k), `sidebar row '${k}' is not a screen`);
});

test('agent:<id> is a screen, and unknown ids are not', () => {
  assert.equal(nav.isProScreen('agent:jim'), true);
  assert.equal(nav.isProScreen('agents'), true);
  assert.equal(nav.isProScreen('askme'), false, 'the old fall-through id must not be a screen');
  assert.equal(nav.isProScreen('org'), false, 'seam panes are reached through extraPanes, not the union');
});

test('PRO opens on Agents', () => {
  assert.equal(nav.PRO_HOME, 'agents');
});

test('App.tsx mounts ProShell for the professional skin and the old layout is gone', () => {
  assert.match(app, /skin === 'professional' \? \(\s*<ProShell/);
  assert.ok(!app.includes('ProfessionalLayout'), 'ProfessionalLayout still referenced');
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/renderer/src/components/professional/ProfessionalLayout.tsx')));
  assert.ok(!fs.existsSync(path.join(ROOT, 'src/renderer/src/components/professional/OrgChart.tsx')));
});

test('the Teams seam still contributes rows and panes by the same ids', () => {
  assert.match(seam, /import type \{ RailRowSpec \} from '\.\.\/professional\/railState'/);
  assert.match(shell, /companyRows/);
  assert.match(shell, /extraPanes\[screen\]/);
});

test('agents are sprites in PRO, never initials', () => {
  // The grid draws SpritePortrait itself — bare, at an integer sprite scale
  // (0.4.11 pilot item 15; see test/pro-0411-avatars.test.cjs).
  const agents = read('src/renderer/src/components/pro/AgentsScreen.tsx');
  const ui = read('src/renderer/src/components/pro/ui.tsx');
  assert.match(agents, /<SpritePortrait character=\{/);
  // CastPortrait keeps the chip for onboarding's cast cards; Portrait, the
  // wrapper every agent row reaches, is BARE since 5 Sep 2026: the sprite
  // itself, no chip, no background, integer sized through SpritePortrait.
  assert.match(ui, /export function CastPortrait[\s\S]*?<SpritePortrait[\s\S]*?forceSprite \/>/);
  assert.match(ui, /export function Portrait\([\s\S]*?return <SpritePortrait character=\{agent\.character\} size=\{size\} \/>;/);
  assert.ok(!/initials/i.test(agents.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/.*$/gm, '')),
    'AgentsScreen must not draw initials for an agent');
});

/* ---- phase 1 (rewritten in 0.4.9 phase 2: see test/pro-049-agents.test.cjs) ---- */

test('an agent opens the PRO agent screen (Inbox and Terminal, collapsible details)', () => {
  assert.match(shell, /<AgentScreen agent=\{a\} config=\{config\} \/>/);
  const screen = read('src/renderer/src/components/pro/AgentScreen.tsx');
  assert.ok(!screen.includes('AgentDetailPanel'), 'the Classic detail panel must not be mounted in PRO');
  assert.match(screen, /proChordFor\(e\) === 'agentConfig'/, 'the ⌘. collapse shortcut is missing (phase 6: read from the chord table)');
  assert.match(screen, /window\.cth\.setAgentTokenCap\(agent\.id, tokens\)/, 'the token cap must write through the config door');
  assert.match(screen, /openAgentSheet\(\{ mode: 'edit', agentId: agent\.id \}\)/, 'engine edits open the one PRO sheet, not a second form');
});

test("the orchestrator's PRO screen has the six prototype tabs, and the Command Center is Classic only", () => {
  // Phase 3 of 0.4.9 (D9): Michael's screen is PRO native with six tabs;
  // the Classic Command Center keeps all eleven and no longer knows the skin.
  const god = loadTs('src/renderer/src/components/pro/god/godData.ts');
  assert.deepEqual([...god.GOD_TABS], ['terminal', 'messages', 'routing', 'budget', 'board', 'config']);
  const screen = read('src/renderer/src/components/pro/GodScreen.tsx');
  for (const k of god.GOD_TABS) assert.match(screen, new RegExp(`\\{tab === '${k}' && <`), `tab '${k}' has no content branch`);
  assert.match(shell, /if \(a\.isGod\) return <GodScreen agent=\{a\} config=\{config\} \/>;/, 'the shell must route the god to his own screen');
  const cc = read('src/renderer/src/components/CommandCenterPanel.tsx');
  assert.ok(!/PRO_TABS|inPro|useAppSkin|appSkin/.test(cc), 'CommandCenterPanel must not gate on the skin any more');
});

test('the Agents grid draws — for a figure with no source, never 0', () => {
  const agents = read('src/renderer/src/components/pro/AgentsScreen.tsx');
  for (const v of ['doing', 'asks']) {
    assert.match(agents, new RegExp(`${v} === null \\? '—'`), `${v} falls back to a number instead of —`);
  }
  assert.match(agents, /tokens !== null && <Chip/, 'a tokens chip with no sample is drawn as nothing, never as 0');
});

test("the prompt bar is the composer's channel, not a second one", () => {
  const agents = read('src/renderer/src/components/pro/AgentsScreen.tsx');
  assert.match(agents, /useStore\(\(s\) => s\.drafts\[god\.id\]/, 'the bar must be the god draft so voice lands in it');
  assert.match(agents, /enqueueMessage\(god\.id, body\)/);
  // Voice used to be a second mic hand rolled on this screen, pinned here as
  // `freeflowRecorder.toggle(god.id)`. Phase 7 deleted it and mounted the
  // composer's OWN button aimed at the orchestrator, so the claim this test
  // makes is now literal rather than merely enforced. Pin both halves: this
  // screen must not grow a second mic, and the shared one must still be the
  // thing that drives the recorder.
  assert.match(agents, /<VoiceButton agentId=\{god\.id\} \/>/, 'the bar must mount the composer\'s voice button, not a second one');
  assert.match(agents, /import \{ VoiceButton \} from '\.\/Composer';/);
  assert.ok(!/freeflowRecorder/.test(agents), 'a second recorder on this screen is the bug this test was written for');
  const composer = read('src/renderer/src/components/pro/Composer.tsx');
  assert.match(composer, /export function VoiceButton\(\{ agentId \}/);
  assert.match(composer, /freeflowRecorder\.toggle\(agentId\)/, 'the shared button must still drive the recorder');
  assert.match(agents, /trackMessageSent\?\.\('composer'\)/, 'a sent prompt must count like a composer send');
});

/* ---- phase 2 --------------------------------------------------------------- */

test('Tasks and Inbox are the PRO screens, and the sheet is hosted inside the provider', () => {
  assert.match(shell, /case 'tasks': return <TasksScreen \/>;/);
  assert.match(shell, /case 'inbox': return <InboxScreen \/>;/);
  assert.match(shell, /<PaneNavProvider value=\{nav\}>[\s\S]*<TaskSheetHost \/>[\s\S]*<\/PaneNavProvider>/, 'the sheet must be inside the provider so it can navigate');
  assert.match(app, /\{skin !== 'professional' && <TaskDetailOverlay \/>\}/, 'Classic keeps its overlay; PRO must not draw two sheets');
});

test('the task views persist under cth.tasksView and every status has a column', () => {
  const tasks = read('src/renderer/src/components/pro/TasksScreen.tsx');
  assert.match(tasks, /const VIEW_KEY = 'cth\.tasksView'/);
  assert.match(tasks, /const STATUSES: Status\[\] = \['todo', 'doing', 'blocked', 'done'\]/);
  assert.match(tasks, /st\.requestDispatchSeed\('Task: /, 'New task seeds the dispatch box; the ledger is the god\'s to write');
  assert.ok(!/hiveAddTask|hiveWriteTasks/.test(tasks), 'the Tasks screen never writes cards itself');
});

test('the sheet answers, dismisses, moves and deletes through the existing doors', () => {
  const sheet = read('src/renderer/src/components/pro/TaskSheet.tsx');
  assert.match(sheet, /answerOpenQuestion\(task, draft\)/);
  assert.match(sheet, /dismissOpenQuestion\(task\)/);
  assert.match(sheet, /window\.cth\.hivePatchTask\(task\.id, \{ status \}\)/, 'a move writes one field');
  assert.match(sheet, /if \(!armed\) \{ setArmed\(true\); return; \}/, 'delete needs a second click');
  assert.match(sheet, /taskHistory\(task\)/, 'history comes from the card\'s own timestamps');
  const data = read('src/renderer/src/components/pro/taskData.ts');
  assert.ok(!/Assigned to|Moved to/.test(data), 'no history event may be invented');
});

test('the Classic ASK ME tab and PRO speak one answer protocol', () => {
  const askMe = read('src/renderer/src/components/AskMeTab.tsx');
  assert.match(askMe, /answerNotice\(task, open, text\)/);
  assert.match(askMe, /withAnswer\(t\.humanQA, open, text\)/);
  assert.match(askMe, /withDismissal\(t\.humanQA, open\)/);
  assert.ok(!/HUMAN ANSWER on task/.test(askMe), 'the notice text lives in askMeActions only');
});

test('the Inbox reads every section from a real door and sends only to the god', () => {
  const inbox = read('src/renderer/src/components/pro/InboxScreen.tsx');
  assert.match(inbox, /hiveMessages\(\{ limit: 200 \}\)/);
  assert.match(inbox, /onHiveMessage\?\.\(\(\) => load\(\)\)/, 'the floor refreshes on a routed message');
  assert.match(inbox, /hiveSend\(\{ to: 'god', act: 'request'/, 'a person\'s message goes to the god, never a worker\'s inbox');
  assert.ok(!/hiveSend\(\{ to: m\.from/.test(inbox));
  assert.match(inbox, /slackHistory\(\)/);
  assert.match(inbox, /slackReply\(\{ channel: replyTo\.channel, thread_ts: replyTo\.thread_ts/, 'a Slack post needs an explicit thread');
  assert.match(inbox, /decideTriggerHistory\(\{ id, decision \}\)/);
  assert.match(inbox, /<CrossNodeThread mate=\{chat\.mate\} \/>/, 'team DMs are Creed\'s thread, in place');
  assert.match(inbox, /<SpritePortrait character=\{sender\.character\}/, 'agents are sprites in the thread');
  assert.match(inbox, /GlyphAvatar name=\{c\.mate\.name\}/, 'people keep initials');
});

test('the org panel shows entitlement and seats to an admin only, and the caller must say who is looking', () => {
  const panel = read('src/renderer/src/components/team/OrgPanel.tsx');
  assert.match(panel, /standing: OrgStanding;/, 'standing is a required prop');
  assert.match(panel, /\{can\(standing, 'billing\.view'\) && \(\s*<Section title=\{t\('team\.org\.stateTitle'\)\}/);
  assert.match(panel, /can\(standing, 'seats\.view'\) && org\.seatsUsed !== null/);
  assert.match(seam, /standing=\{standingOf\(mode, org\.you\?\.isAdmin === true\)\}/);
  const perms = loadTs('src/shared/permissions.ts');
  assert.equal(perms.can(perms.standingOf('live', false), 'seats.view'), false, 'a member must not see seats');
  assert.equal(perms.can(perms.standingOf('live', true), 'billing.view'), true);
});

test('every pro.* key the phase 2 screens use exists in all three locales', () => {
  const files = ['TasksScreen', 'TaskSheet', 'InboxScreen'].map((f) => read(`src/renderer/src/components/pro/${f}.tsx`)).join('\n');
  const keys = new Set([...files.matchAll(/t\('(pro\.[a-zA-Z.]+)'/g)].map((m) => m[1]));
  // Template keys: t(`pro.tasks.status.${s}`) etc., enumerated by hand here.
  for (const s of ['todo', 'doing', 'blocked', 'done']) keys.add(`pro.tasks.status.${s}`);
  for (const v of ['board', 'list', 'cards']) keys.add(`pro.tasks.view.${v}`);
  for (const e of ['created', 'asked', 'answered', 'dismissed']) keys.add(`pro.sheet.event.${e}`);
  for (const d of ['auto-allowed', 'pending', 'approved', 'rejected']) keys.add(`pro.inbox.decision.${d}`);
  for (const d of ['today', 'yesterday']) keys.add(`pro.inbox.${d}`);
  assert.ok(keys.size > 60, `parser found only ${keys.size} keys; the guard is disarmed`);
  for (const lang of ['en', 'zh-CN', 'ar']) {
    const dict = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`));
    for (const k of keys) {
      const v = k.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), dict);
      assert.equal(typeof v, 'string', `${lang} is missing ${k}`);
    }
  }
});

test('no PRO surface draws a thicker border on one edge (founder, 2 Sep 2026)', () => {
  // Subdirectories included: pro/onboarding (0.4.9 phase 1) is PRO too.
  const files = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
  for (const f of files('src/renderer/src/components/pro')) {
    const src = read(f);
    for (const m of src.matchAll(/border(Left|Right|Top|Bottom)\s*:\s*[`'"]([^`'"]+)[`'"]/g)) {
      assert.match(m[2], /^1px /, `${f}: border${m[1]} "${m[2]}" is not a 1px hairline`);
    }
    assert.ok(!/border(Left|Right|Top|Bottom)\s*:\s*`\$\{?[2-9]/.test(src), `${f}: a template border is wider than 1px`);
  }
});
