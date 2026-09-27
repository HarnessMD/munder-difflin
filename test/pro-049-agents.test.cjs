// v0.4.9 phase 2: the Agents grid, the sidebar agent list, the agent room.
// Founder decisions D4 (real activity on the cards), D8 (Michael is always
// drawn), D10 (Inbox and Terminal, the rest retired). Structural: the doors
// each control uses are pinned by name, so a control that quietly stops
// writing through the app's one door for that fact fails here.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PRO = 'src/renderer/src/components/pro';
const grid = read(`${PRO}/AgentsScreen.tsx`);
const room = read(`${PRO}/AgentScreen.tsx`);
const inbox = read(`${PRO}/AgentInbox.tsx`);
const composer = read(`${PRO}/Composer.tsx`);
const sidebar = read(`${PRO}/ProSidebar.tsx`);
const activity = read(`${PRO}/activityData.ts`);
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');

/* ---- the grid ---------------------------------------------------------------- */

test('D8: the orchestrator card is drawn even before his row exists, from godStatus', () => {
  assert.match(grid, /useStore\(\(s\) => s\.godStatus\)/);
  assert.match(grid, /godStatus === 'failed' \? <Chip tone="bad">/, 'a failed start is said, not hidden');
  // 5 Sep 2026, twice in one afternoon: the 2x face is too big beside 14px
  // text, so the god card wears the native 28 art in a 40 box.
  assert.match(grid, /<SpritePortrait character=\{god\?\.character \?\? 'michael'\} size=\{40\} \/>/, 'the card draws Michael with or without the row');
  // The card is not wrapped in `god && (`: that guard is what hid him in 0.4.8.
  assert.ok(!/\{god && \(\s*<Card/.test(grid), 'the orchestrator card must not be gated on the row existing');
});

test('D4: a card shows the real ticket, the latest update with its time, and no cost', () => {
  assert.match(grid, /export function ticketFor\(agentId: string, tasks: HiveTask\[\] \| null\)/);
  assert.match(grid, /useTaskLedger\(/);
  assert.match(grid, /onTicket\(ticket\.id\)/);
  assert.match(grid, /openTaskDetail/, 'the ticket opens the task sheet');
  assert.match(grid, /recentAssistantText/, "the update line is the agent's own words first");
  assert.match(grid, /useLastActivity\(/, 'then the activity digest');
  assert.match(grid, /fmtWhen\(update\.ts/, 'the update carries its time');
  assert.match(grid, /t\('pro\.agents\.fresh'\)/, 'a fresh agent says so instead of showing an empty meter');
  assert.ok(!/usd\(sample\.usd\)|usd\(fleet\.samples\[a\.id\]/.test(grid), 'the per agent cost chip was dropped (founder round 1)');
  assert.ok(!grid.includes('PixelBadge'), 'no Classic badge; StatusChip only');
  assert.match(grid, /<StatusChip status=\{a\.status\} raw=\{a\.action\} \/>/);
});

test('the four orchestrator stats are doors: Tasks and Waiting on you navigate', () => {
  assert.match(grid, /onClick=\{\(\) => nav\.go\('tasks'\)\}/);
  assert.match(grid, /requestInboxChat\('askme'\); nav\.go\('inbox'\);/);
  assert.match(grid, /t\('pro\.agents\.stat\.budget'\)/);
  assert.match(grid, /t\('pro\.agents\.stat\.breaker'\)/);
});

test('D3: every Add door in the grid opens the one PRO sheet', () => {
  const hits = grid.match(/openAgentSheet\(\{ mode: 'add' \}\)/g) || [];
  assert.ok(hits.length >= 2, `header button and add card (${hits.length})`);
  assert.ok(!/onAddAgent\(\)/.test(strip(grid)), 'the Classic modal door is not called from the grid');
});

test('D1: the card sub line and the context meter read differently in the two renderings', () => {
  assert.match(grid, /useTechnical\(\)/);
  // 5 Sep 2026: the sub line is the ENGINE in both renderings now (the
  // founder asked for the provider's logo and the model name on every card).
  // What still differs by rendering is the role sentence: the simple one
  // keeps it after the model, the technical one drops it. The old line was
  // `technical ? (a.model ?? a.provider ?? '') : firstSentence(a.description)`;
  // the raw id now survives only as the technical tooltip (Engine.tsx).
  assert.match(grid, /const role = technical \? undefined : firstSentence\(a\.description\)/);
  assert.match(grid, /<EngineLine provider=\{a\.provider\} model=\{a\.model\} after=\{role\}/);
  assert.ok(!/a\.model \?\? a\.provider/.test(grid), 'the raw model id is no longer drawn as the sub line');
  // 0.4.9 phase 7.4 moved every FIGURE on this screen off --cth-font-mono and
  // on to --cth-font-figures, which is an alias for it declared in tokens.css.
  // The guarantee this line has always held is unchanged and is still the
  // whole point: the technical rendering shows the percent as a figure, the
  // simple rendering shows the WORD, and the figure is drawn in the terminal's
  // face rather than the UI face. Only the token name moved.
  assert.match(grid, /technical \? <span style=\{\{ fontFamily: 'var\(--cth-font-figures\)' \}\}>\{ctx\}%<\/span> : <span>\{t\('pro\.agents\.context'\)\}<\/span>/);
  assert.ok(!/--cth-font-mono/.test(grid),
    'a figure left behind on the old token: the screen would then draw numbers in two faces');
});

test('a card with its own buttons is a div with the button role, never a button in a button', () => {
  assert.match(grid, /<Card onOpen=\{onOpen\}/);
  const ui = read(`${PRO}/ui.tsx`);
  assert.match(ui, /if \(onOpen\) \{[\s\S]*?<div role="button" tabIndex=\{0\}/);
  // The ticket and Prompt inside it stop the click from opening the room.
  assert.match(grid, /onClick=\{\(e\) => \{ stop\(e\); onTicket\(ticket\.id\); \}\}/);
});

/* ---- the sidebar --------------------------------------------------------------- */

test('the sidebar lists every agent under Agents with a sprite and a status dot; the toggle is not a nested button', () => {
  assert.match(sidebar, /data-agent-list-toggle/);
  assert.match(sidebar, /<span\s+role="button" tabIndex=\{0\} data-agent-list-toggle/, 'the expander is a span with the button role (it sits inside the row button)');
  assert.match(sidebar, /data-agent-nav=\{agent\.id\}/);
  // 0.4.11 pilot item 15: the sprite is BARE (no chip behind it) and drawn at
  // an integer sprite scale through SpritePortrait's `size` box, never the
  // fractional blit that blurred it. The full contract lives in
  // test/pro-0411-avatars.test.cjs.
  assert.match(sidebar, /<SpritePortrait character=\{agent\.character\} size=\{28\} \/>/);
  assert.match(sidebar, /<StatusDot status=\{agent\.status\}/);
  // Since 0.5.3 the row reads its own record (Pam's audit), so the word is
  // looked up from `agent`, in the row, not passed down by the list.
  assert.match(sidebar, /t\(`pro\.status\.\$\{agent\.status\}`\)/, 'the dot carries the plain status word as its tooltip');
  assert.match(sidebar, /localStorage\.getItem\(AGENTS_OPEN_KEY\)/, 'the fold state is remembered');
  assert.match(sidebar, /agentsOpen && !collapsed &&/, 'the list hides when the rail is collapsed');
});

/* ---- the room ------------------------------------------------------------------ */

test('D10: two tabs, Inbox and Terminal; Git, Messages and Traces are gone from the room', () => {
  assert.match(room, /tabs=\{\[\{ value: 'inbox'[^\]]*\{ value: 'terminal'/);
  for (const gone of ['SidebarTabs', 'GitTab', 'ThreadsPanel', 'AgentDetailPanel', 'MessageQueueComposer', 'AgentControlStrip', 'AgentHoldButton']) {
    assert.ok(!room.includes(gone), `${gone} must not be mounted by the PRO room`);
  }
  // Founder round 2 (item 4a): the room opens on the live session for
  // everyone; the rendering no longer picks the tab.
  assert.match(room, /useState<Tab>\('terminal'\)/, 'the default tab is Terminal in both renderings');
  assert.ok(!/useState<Tab>\(technical \?/.test(room), 'the default tab must not follow the rendering any more');
});

test('the terminal stays mounted under the Inbox tab so the parser keeps its stream', () => {
  assert.match(room, /usePtyParser\(agent\.id\)/);
  assert.match(room, /onStreamData=\{onPtyStream\}/);
  assert.match(room, /visibility: show \? 'visible' : 'hidden'/, 'the hidden pane is invisible, not unmounted');
  assert.match(room, /terminalInstanceKey\(agent\.ptyId, agent\.terminalGeneration\)/);
  assert.match(room, /window\.cth\.historyAdd\(\{ agentId: agent\.id, cwd: agent\.cwd, text \}\)/, 'typed prompts still land in the history ledger');
});

test('every control writes through the door the app already has', () => {
  assert.match(room, /window\.cth\.controlPause\(agent\.id, true\)/);
  assert.match(room, /window\.cth\.controlResume\(agent\.id\)/);
  assert.match(room, /window\.cth\.controlHalt\(agent\.id\)/);
  assert.match(room, /window\.cth\.controlUnhalt\(agent\.id\)/, 'the armed stop-after disarms through its own door, not resume (which would also clear a pause)');
  assert.match(room, /window\.cth\.hiveSetAgentHold\(agent\.id, !held\)/);
  assert.match(room, /window\.cth\.killPty\(agent\.ptyId\);\s*disposeTerminal\(agent\.ptyId\);\s*archiveAgent\(agent\.id\);/, 'Stop takes the Classic panel\'s exact three steps');
  assert.match(room, /<ConfirmDialog danger/, 'Stop asks first');
  assert.match(room, /setIdeOpen\(true, agent\.id\)/);
  assert.match(room, /renameAgent\(agent\.id, v\.trim\(\)\)/);
  assert.match(room, /updateAgent\(agent\.id, \{ description: v\.trim\(\) \}\)/);
  assert.match(room, /enqueueMessage\(agent\.id, '\/compact'\)/, 'compaction is the same queued command the auto compact mission uses');
  assert.match(room, /openTerminalAt\(agent\.cwd\)/);
  assert.match(room, /archiveAgent\(agent\.id\); proToast/);
  // Identity commits on blur through Draft, never per keystroke.
  assert.match(room, /<Draft value=\{agent\.name\} onCommit=/);
  assert.ok(!/onChange=\{\(e\) => setName/.test(room), 'no per keystroke identity state');
});

test('founder round 2: stop-after toggles, the panel edits the engine, and a change offers the restart', () => {
  // Item 5: arm and disarm are one control. While armed it stays clickable
  // and draws pressed (Ctl's on state), and the label says what the next
  // click does, instead of the old one-way disabled latch.
  assert.match(room, /armed \? await window\.cth\.controlUnhalt\(agent\.id\) : await window\.cth\.controlHalt\(agent\.id\)/);
  assert.ok(!/disabled=\{!!snap\?\.halted\}/.test(room), 'the armed control must not go dead');
  assert.match(room, /snap\?\.halted \? t\('pro\.room\.stopAfterArmed'\) : t\('pro\.room\.stopAfter'\)/);
  assert.match(room, /snap\?\.halted \? t\('pro\.room\.stopAfterArmedTitle'\) : t\('pro\.room\.stopAfterTitle'\)/);
  // Item 16: provider and model are selects in the panel, writing the agent
  // sheet's exact patch through updateAgent with the command rebuilt from the
  // pick, so the panel and the sheet can never disagree about the engine.
  assert.match(room, /updateAgent\(agent\.id, \{ provider: id, model, command \}\)/);
  assert.match(room, /updateAgent\(agent\.id, \{ model: m, command: buildSpawnCommand\(config, m, provider\) \}\)/);
  // The change applies on the next start, and the panel says so and offers
  // the restart right there rather than leaving the user to hunt for it.
  assert.match(room, /t\('pro\.room\.restartNeeded'\)/);
  assert.match(room, /t\('pro\.room\.restartNow'\)/);
  // The restart is the Command Center's steps against the SAME pty id: kill,
  // reset the xterm in place, respawn the stored command.
  assert.match(room, /resetTerminal\(agent\.ptyId, \{ preserveScrollback: resume \}\)/);
  assert.match(room, /window\.cth\.spawnPty\(\{\s*id: agent\.ptyId/);
  // Item 16: the full form is reached by a real button under the section, not
  // link text buried in the engine note.
  assert.match(room, /openAgentSheet\(\{ mode: 'edit', agentId: agent\.id \}\)\} style=\{\{ alignSelf: 'flex-start' \}\}>\{t\('pro\.room\.editAgentConfig'\)\}<\/Btn>/);
  assert.ok(!room.includes("t('pro.room.fullEditor')"), 'the old hyperlink is gone');
  // The new strings exist in the three locales, with no dash.
  for (const l of ['en', 'zh-CN', 'ar']) {
    const pro = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro;
    for (const k of ['stopAfterArmed', 'stopAfterArmedTitle', 'stopAfterCancelToast', 'restartNeeded', 'restartNow', 'restartedToast', 'restartFailed', 'editAgentConfig']) {
      const v = pro.room[k];
      assert.ok(typeof v === 'string' && v.length > 0, `pro.room.${k} in ${l}`);
      assert.ok(!/[—–]/.test(v) && !/ - /.test(v), `pro.room.${k} (${l}) carries a dash`);
    }
  }
});

test('the agent thread merges every real source, and the person\'s sends carry a status', () => {
  assert.match(inbox, /hiveMessages\(\{ agentId, limit: 200, includeArchived: true \}\)/);
  assert.match(inbox, /onHiveMessage\?\.\(/, 'refreshes on a routed push');
  assert.match(inbox, /historyList\(agentId, 200\)/, 'what the person typed comes from the history ledger');
  assert.match(inbox, /useAgentActivity\(agent\.id\)/, 'system lines come from the digest');
  // 0.4.9 phase 3. The queue used to BE the record of what the person sent, so
  // a delivered message left the queue and left the thread with it: the exact
  // disappearance he reported. The record is now the sent log, which outlives
  // the delivery, and the queue only says which of those are still waiting.
  assert.match(inbox, /s\.sentLog\[agent\.id\]/, 'the person\'s sends come from the log, not the queue');
  assert.match(inbox, /mergeSent\(log, history\)/, 'and a line typed into the terminal is not drawn twice');
  assert.match(inbox, /t\(`pro\.room\.sendStatus\.\$\{sent\.status\}`\)/, 'every state but delivered says which it is');
  assert.match(inbox, /describeEntry\(it\.e, t, technical\)/, 'the technical rendering adds the detail');
  // The two joins he asked for: a file that opens, and the ticket a message
  // names with whatever resolution has been written on it.
  assert.match(inbox, /<FileChip path=\{it\.e\.path\} \/>/, 'a file a tool touched is openable from the digest line');
  assert.match(inbox, /openFileInIde\(path\)/);
  assert.match(inbox, /taskIdsIn\(text, knownIds\)/);
  assert.match(inbox, /task\.result\?\.trim\(\) \? task\.result : t\('pro\.inbox\.noResultYet'\)/, 'no result written says so, never a blank');
});

test('the composer has two doors, Send (queue) and Steer (control), and both are recorded', () => {
  assert.match(composer, /enqueueMessage\(agent\.id, body\(\), \{ fromHuman: true \}\)/);
  assert.match(composer, /window\.cth\.controlSteer\(agent\.id, text\)/);
  // A steer never touches the queue, so without its own record it would be the
  // one kind of message the person sent that the thread never showed.
  assert.match(composer, /noteHumanSend\(agent\.id, \{ id, text, ts: Date\.now\(\), status: 'queued' \}\)/);
  assert.match(composer, /settleHumanSend\(agent\.id, id, snap \? 'sent' : 'failed'\)/);
  assert.match(composer, /settleHumanSend\(agent\.id, m\.id, 'dropped'\); removeQueuedMessage\(agent\.id, m\.id\)/, 'a message the person takes back says so rather than vanishing');
  assert.match(composer, /releaseQueuedMessage\(agent\.id, m\.id, true\)/);
  assert.match(composer, /useStore\(\(s\) => s\.drafts\[agent\.id\]/, 'the draft lives in the store, keyed by agent');
  assert.match(composer, /Attached files:/, 'attachments use the shared convention');
});

test('the digest words never leak a raw state, and every entry kind has a line', () => {
  for (const kind of ['tool', 'notice', 'idle', 'compact', 'session', 'message']) {
    assert.match(activity, new RegExp(`case '${kind}':`), `describeEntry has no line for ${kind}`);
  }
  assert.match(activity, /t\('pro\.room\.sys\.idle'\)/);
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json')).pro.room.sys;
  assert.equal(en.idle, 'Waiting for work');
  assert.ok(!/awaiting|starting up/i.test(JSON.stringify(en)));
});

test('the phase 2 families exist in every locale', () => {
  for (const l of ['en', 'zh-CN', 'ar']) {
    const pro = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro;
    assert.ok(pro.room && pro.room.tabs && pro.room.sys && pro.room.act, `pro.room families in ${l}`);
    assert.ok(pro.sidebar && pro.sidebar.expandAgents, `pro.sidebar in ${l}`);
    for (const k of ['fresh', 'freshHint', 'godStarting', 'godFailed', 'promptBtn', 'tokensTitle']) assert.ok(pro.agents[k], `pro.agents.${k} in ${l}`);
    for (const act of ['request', 'inform', 'propose', 'query', 'agree', 'refuse', 'done']) assert.ok(pro.room.act[act], `pro.room.act.${act} in ${l}`);
  }
});
