// 0.4.9 phase 7, founder 3 Sep 2026: the composer, the sidebar and the agent
// cards.
//
// Seven asks, and the trap under each:
//
//   "the queue area is a little      A rework of the box that carries a
//    bigger and the input area is    message is the easiest place in this app
//    reworked"                       to lose a message. The queue is not the
//                                    record of what the person sent, the
//                                    durable sentLog is, and it is kept by two
//                                    calls (noteHumanSend, settleHumanSend)
//                                    that a layout change would silently drop.
//                                    They are pinned here as well as in
//                                    pro-049-agents.
//
//   "voice dictation is disabled     Disabling a button is not the fix, it is
//    when there is no Groq key,      half of it. The old control was ENABLED
//    with a tooltip carrying the     with no key: clicking it opened the
//    steps, the shortcut, and a      microphone, recorded, uploaded, and only
//    button that opens Settings"     then failed, so the person paid a
//                                    permission prompt for an error. And a
//                                    disabled <button> eats its own tooltip in
//                                    Chromium, so the one control that has to
//                                    explain itself is the one that goes
//                                    silent unless the title sits on a wrapper.
//
//   "the token cap says not set      A truthiness read answers three states
//    when it is not set, instead     with two. Not set, capped at N, and a
//    of showing a zero or a blank"   zero the breaker will never enforce are
//                                    different facts, and the same config drew
//                                    as a blank field on one screen and the
//                                    digit 0 on another. The fix has to be in
//                                    the READ, or every surface repeats it.
//
//   "the terminal's font is used     A stack that happens to start with the
//    for the app's figures"          same family is not the same stack. The
//                                    alias has to POINT at the mono token
//                                    rather than repeat it, or the two drift
//                                    the first time one of them moves.
//
//   "the agent card is empty.        The ticket was already wired and already
//    show its most recent ticket"    fed. What made a card look empty is that
//                                    the ticket and the update are BOTH absent
//                                    often, and the slot then held nothing at
//                                    all. So the slot must never be empty,
//                                    which is why 7.5 and 7.6 are one change.
//
//   "when there is no ticket, an     An Add button that opens a form and
//    add button that creates one     writes nothing is a placeholder. It has
//    and messages the agent"         to write a REAL card through the ledger
//                                    door, and it has to tell the agent: a
//                                    card in a file nobody read is not an
//                                    assignment. And if the card fails to
//                                    write, the message must NOT go, or the
//                                    agent hunts for a card that is not there.
//
//   "the last three lines of         The pty stream reaches the renderer
//    terminal output on the card"    through usePtyParser only while
//                                    AgentScreen is mounted, so the obvious
//                                    reading is that a card has no stream. It
//                                    does: App.tsx pre-warms a pooled xterm
//                                    per live agent and terminalPool
//                                    subscribes it for its whole lifetime, so
//                                    the emulated buffer is here already. The
//                                    trap is the tempting substitute: drawing
//                                    the activity digest under a heading that
//                                    says "terminal". That is a caption lying
//                                    about its picture, and the digest is
//                                    already on the card as the update line.
'use strict';
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const composer = strip(read(`${PRO}/Composer.tsx`));
const grid = strip(read(`${PRO}/AgentsScreen.tsx`));
const room = strip(read(`${PRO}/AgentScreen.tsx`));
const sidebar = strip(read(`${PRO}/ProSidebar.tsx`));
const settings = read('src/renderer/src/components/SettingsModal.tsx');
const pool = read('src/renderer/src/components/terminalPool.ts');
const tokensCss = read('src/renderer/src/design/tokens.css');
const preload = strip(read('src/preload/index.ts'));

const A = loadTs(path.join(ROOT, 'src/shared/agentCard.ts'));

/* ---- 7.1 the queue and the input ------------------------------------------ */

test('the queue is a bounded list now, not a strip that grows until it pushes the input off', () => {
  assert.match(composer, /const QUEUE_MAX_H = \d+;/);
  assert.match(composer, /maxHeight: QUEUE_MAX_H, overflowY: 'auto'/,
    'a queue of twenty must cost the same height as a queue of four');
  // One row per message, each readable, rather than a wrapping run of chips.
  assert.ok(!/flexWrap: 'wrap'[^}]*\}\}>\s*\n\s*<span style=\{\{ fontSize: 10\.5[^\n]*queued/.test(composer));
  assert.match(composer, /t\('pro\.room\.queued'\)/);
  assert.match(composer, /t\('pro\.room\.sendNow'\)/);
});

test('the input is three lines and grows with the text, to a ceiling', () => {
  assert.match(composer, /const INPUT_MIN_H = \d+;/);
  assert.match(composer, /const INPUT_MAX_H = \d+;/);
  assert.match(composer, /rows=\{3\}/, 'two lines was the old box');
  // Reset to auto FIRST, or the box can only ever get taller and never
  // shrinks again once a pasted paragraph is deleted.
  assert.match(composer, /el\.style\.height = 'auto';/);
  assert.match(composer, /el\.style\.height = `\$\{Math\.min\(Math\.max\(el\.scrollHeight, INPUT_MIN_H\), INPUT_MAX_H\)\}px`;/);
  // The key rule is on screen, not only in a placeholder that vanishes the
  // moment there is text in the box to need it.
  assert.match(composer, /t\('pro\.room\.keyHint'\)/);
});

test('the rework did not drop the record of what the person sent', () => {
  // These four are the whole reason a delivered message still shows in the
  // thread. A layout change is exactly how they get lost.
  assert.match(composer, /noteHumanSend\(agent\.id, \{ id, text, ts: Date\.now\(\), status: 'queued' \}\)/);
  assert.match(composer, /settleHumanSend\(agent\.id, id, snap \? 'sent' : 'failed'\)/);
  assert.match(composer, /settleHumanSend\(agent\.id, m\.id, 'dropped'\); removeQueuedMessage\(agent\.id, m\.id\)/);
  assert.match(composer, /releaseQueuedMessage\(agent\.id, m\.id, true\)/);
  assert.match(composer, /enqueueMessage\(agent\.id, body\(\), \{ fromHuman: true \}\)/);
});

/* ---- 7.2 voice without a key ---------------------------------------------- */

test('with no transcription engine the mic never opens the microphone: its click opens the key card', () => {
  assert.match(composer, /export function VoiceButton\(\{ agentId \}: \{ agentId: string \}\)/);
  // 0.5.3, F16 (PR #51): a local engine counts as a key. Presence only.
  assert.match(composer, /const noKey = !hasGroqKey && !canDictate;/);
  assert.match(composer, /useStore\(\(s\) => s\.canDictate\)/);
  // 0.4.11 (founder, 6 Sep 2026): the 7.2 rule was "disabled without a key,
  // steps behind a question mark". He clicked the mic and saw nothing, so the
  // mic is the door now: NOT disabled without a key, and its click opens the
  // card that takes the key. The recorder stays behind the noKey return, so
  // the guarantee this test was written for (no getUserMedia, no Groq call
  // without a key) still holds. See test/pro-0411-voice-key-cards.test.cjs.
  assert.match(composer, /disabled=\{!noKey && \(transcribing \|\| busyElsewhere\)\}/);
  assert.match(composer, /onClick=\{\(\) => \{ if \(noKey\) \{ toggleHint\(\); return; \} freeflowRecorder\.toggle\(agentId\); \}\}/);
  // Presence only. The key value never enters the renderer store.
  assert.match(composer, /useStore\(\(s\) => s\.hasGroqKey\)/);
  assert.ok(!composer.includes('groqApiKey'), 'the key itself must never reach a component');
});

test('the tooltip carries the steps, the shortcut and a door to the right Settings tab', () => {
  for (const k of ['setupTitle', 'lead', 's1', 's2', 's3', 'shortcut', 'openSettings']) {
    assert.match(composer, new RegExp(`t\\('pro\\.voice\\.${k}'\\)`), `the panel does not show pro.voice.${k}`);
  }
  assert.match(composer, /const GROQ_KEYS_URL = 'https:\/\/console\.groq\.com\/keys';/);
  assert.match(composer, /window\.cth\.openExternal\(GROQ_KEYS_URL\)/, 'the link opens outside, not in the app frame');
  assert.match(composer, /new CustomEvent\('cth:open-settings', \{ detail: \{ section: 'Voice' \} \}\)/);
  // The section name is only a promise if the union actually has that member.
  assert.match(settings, /export type Section =[^;]*'Voice'/);
  // Chromium suppresses the native tooltip on a disabled button, so the title
  // sits on a wrapper that is never disabled. Since 0.4.11 that wrapper is
  // also the card's anchor (the mic is the door), and a comment may sit
  // between it and the button.
  // (strip() leaves `{}` where a JSX comment stood.)
  assert.match(composer, /<span ref=\{anchorRef\} title=\{title\} style=\{\{ display: 'inline-flex' \}\}>\s*(\{(\/\*[\s\S]*?\*\/)?\}\s*)?<IconBtn/);
});

test('both PRO composers use the one voice control, so neither can drift', () => {
  // Batch 3: Free Flow has no off switch, so the one control is always drawn.
  assert.match(composer, /<VoiceButton agentId=\{agent\.id\} \/>/);
  assert.match(grid, /<VoiceButton agentId=\{god\.id\} \/>/);
  assert.ok(!/freeflowRecorder\.toggle/.test(grid),
    'the orchestrator prompt bar kept its own mic, which is how one of them stays unguarded');
});

/* ---- 7.3 the token cap ---------------------------------------------------- */

test('a cap of zero is not a cap, and neither is a fraction, a negative or a string', () => {
  assert.equal(A.isEnforceableCap(200_000), true);
  for (const junk of [0, -1, 1.5, NaN, Infinity, '200000', null, undefined, {}]) {
    assert.equal(A.isEnforceableCap(junk), false, `${String(junk)} read as an enforceable cap`);
  }
  // The ceiling main accepts, and one past it.
  const max = loadTs(path.join(ROOT, 'src/shared/tokenCaps.ts')).MAX_AGENT_TOKEN_CAP;
  assert.equal(A.isEnforceableCap(max), true);
  assert.equal(A.isEnforceableCap(max + 1), false);
});

test('the read tells apart not set, set to zero, the workspace default and a real cap', () => {
  assert.deepEqual(A.readAgentTokenCap('jim', undefined, undefined), { source: 'none' });
  assert.deepEqual(A.readAgentTokenCap('jim', {}, undefined), { source: 'none' });
  // A zero on disk is the case the truthiness read got wrong: it is NOT the
  // same as no cap for this agent, because the workspace default still applies.
  assert.deepEqual(A.readAgentTokenCap('jim', { jim: 0 }, 500_000), { source: 'workspace', tokens: 500_000 });
  assert.deepEqual(A.readAgentTokenCap('jim', { jim: 0 }, 0), { source: 'none' },
    'a zero workspace default is not a cap either');
  assert.deepEqual(A.readAgentTokenCap('jim', { jim: 100 }, 500_000), { source: 'agent', tokens: 100 });
  assert.deepEqual(A.readAgentTokenCap('jim', { pam: 100 }, 500_000), { source: 'workspace', tokens: 500_000 });
});

test('the field holds this agent\'s own cap and nothing else', () => {
  assert.equal(A.tokenCapFieldText('jim', { jim: 100 }), '100');
  assert.equal(A.tokenCapFieldText('jim', { jim: 0 }), '', 'a zero drawn as "0" is a cap that will never trip');
  assert.equal(A.tokenCapFieldText('jim', undefined), '');
  // Deliberately NOT the workspace number: pre-filled, it would become a per
  // agent override on the next blur.
  assert.equal(A.tokenCapFieldText('jim', {}), '');
});

test('the agent screen reads the cap through that module and says which one applies', () => {
  assert.match(room, /import \{ readAgentTokenCap, tokenCapFieldText \} from '@shared\/agentCard';/);
  assert.match(room, /readAgentTokenCap\(agent\.id, config\?\.agentTokenCaps, config\?\.costCapTokens\)/);
  assert.match(room, /<Draft mono value=\{capField\} onCommit=\{saveCap\} placeholder=\{t\('pro\.agent\.capNotSet'\)\}/,
    'the empty field must SAY it is not set rather than sitting blank');
  assert.ok(!/capNow \? String\(capNow\) : ''/.test(room), 'the truthiness read is the defect');
  assert.ok(!/config\?\.agentTokenCaps\?\.\[agent\.id\]/.test(room), 'a second, unguarded read of the same fact');
  // Which cap is in force is its own row, with all three answers written down.
  assert.match(room, /t\('pro\.agent\.capApplies'\)/);
  for (const k of ['capOwn', 'capWorkspace', 'capNotSet']) {
    assert.match(room, new RegExp(`t\\('pro\\.agent\\.${k}'`), `no line for pro.agent.${k}`);
  }
  // The spend row used the same truthiness test, so a zero read as "no cap".
  assert.match(room, /cap\.source === 'agent' \? t\('pro\.room\.spendOfCap'/);
});

/* ---- 7.4 the figures face ------------------------------------------------- */

/** The families in a CSS font stack, quotes off. */
const families = (stack) => stack.split(',').map((s) => s.trim().replace(/^["']|["']$/g, ''));

test('the figures token POINTS at the mono stack rather than repeating it', () => {
  assert.match(tokensCss, /--cth-font-figures: var\(--cth-font-mono\);/,
    'a second literal stack here is a promise that drifts the first time one of them moves');
});

test('the mono stack and the terminal lead with the same face, so a figure is one face app wide', () => {
  const mono = /--cth-font-mono:\s*(.+);/.exec(tokensCss);
  assert.ok(mono, 'the mono token moved, so this check is measuring nothing');
  const term = /new Terminal\(\{[\s\S]*?fontFamily: '([^']+)'/.exec(pool);
  assert.ok(term, 'the terminal font moved out of the Terminal options, so this check is measuring nothing');
  assert.equal(families(mono[1])[0], families(term[1])[0]);
  assert.equal(families(term[1])[0], 'JetBrains Mono');
});

test('every figure on the three PRO surfaces reads on the figures token', () => {
  for (const [name, src] of [['AgentsScreen', grid], ['Composer', composer]]) {
    assert.ok(!/--cth-font-mono/.test(src), `${name} still draws a figure on the old token`);
  }
  // The agent screen keeps exactly one --cth-font-mono, and it is not a
  // figure: the workspace PATH is code, and code is what the mono token is
  // for. The alias resolves to the same stack, so nothing renders differently;
  // the split is about saying which of the two things a call site means.
  const monoLeft = room.match(/fontFamily: 'var\(--cth-font-mono\)'[^}]*\}\}>\{agent\.cwd/g) || [];
  assert.equal((room.match(/--cth-font-mono/g) || []).length, 1, 'a figure was left behind on the mono token');
  assert.equal(monoLeft.length, 1, 'the one remaining mono call site is no longer the workspace path');
  assert.match(grid, /fontFamily: 'var\(--cth-font-figures\)'/);
  assert.match(composer, /fontFamily: 'var\(--cth-font-figures\)'/, 'the queue position and its time are figures');
  assert.match(room, /fontFamily: 'var\(--cth-font-figures\)'/);
  // The `small` suffix inside a Stat used to be pushed back to the UI face,
  // which put "of $50" in Inter beside "$12.40" in the terminal's face.
  assert.match(grid, /\.pro-stat-value small\{[^}]*font-family:var\(--cth-font-figures\)\}/);
  // The rail's counts already sit on the mono stack, which the check above
  // holds to the terminal's face. The rail's `Live` figure ("3 live") is still
  // on the UI face and is a one line change in a file this phase does not own.
  assert.match(sidebar, /marginLeft: 'auto', fontFamily: 'var\(--cth-font-mono\)'/);
});

/* ---- 7.5 and 7.6 the ticket slot ------------------------------------------ */

test('the ticket slot is never empty: a real ticket, or the way to give it one', () => {
  // Not `{ticket && (`. That guard is what left the middle of the card blank.
  assert.match(grid, /\{ticket \? \(/);
  assert.match(grid, /onClick=\{\(e\) => \{ stop\(e\); onTicket\(ticket\.id\); \}\}/, 'a real ticket opens the sheet');
  assert.match(grid, /onClick=\{\(e\) => \{ stop\(e\); onAddTicket\(\); \}\}/);
  assert.match(grid, /t\('pro\.agents\.addTicket'\)/);
  assert.match(grid, /ticket=\{ticketFor\(a\.id, tasks\)\}/, 'still fed from the task ledger');
  assert.match(grid, /onAddTicket=\{\(\) => setNewTicket\(a\)\}/);
  assert.match(grid, /\{newTicket && \(\s*<NewTicketSheet agent=\{newTicket\}/);
});

test('Add writes a REAL card into the ledger, assigned to that agent', () => {
  assert.match(grid, /window\.cth\.hiveAddTask\(task\)/, 'the one ledger door, the same one the Slack path uses');
  assert.match(grid, /assignee: agent\.id,/);
  assert.match(grid, /status: 'todo',/);
  assert.match(grid, /dependsOn: \[\],/);
  assert.match(grid, /createdAt: new Date\(\)\.toISOString\(\)/);
  // No placeholder anywhere in the sheet: this button does the thing.
  const sheet = grid.slice(grid.indexOf('function NewTicketSheet'), grid.indexOf('/* ---- data'));
  assert.ok(sheet.length > 400, 'the sheet moved, so this check is measuring nothing');
  assert.ok(!/coming soon|lorem|sample data|not implemented/i.test(sheet));
});

test('and it messages the agent, but only once the card exists', () => {
  assert.match(grid, /enqueueMessage\(agent\.id, brief, \{ fromHuman: true \}\)/,
    'a card in a file the agent is not reading is a note to yourself, not an assignment');
  assert.match(grid, /t\('pro\.agents\.ticketBrief'/);
  assert.match(grid, /t\('pro\.agents\.ticketBriefEnd'\)/, 'the brief carries the done and result contract');
  const create = grid.slice(grid.indexOf('const create = async ()'), grid.indexOf('return (', grid.indexOf('const create = async ()')));
  const failed = create.indexOf("proToast(t('pro.agents.ticketFailed')");
  const sent = create.indexOf('enqueueMessage(agent.id, brief');
  assert.ok(failed >= 0 && sent > failed, 'the send must sit after the ledger write is known to have worked');
  assert.match(create, /if \(!res\.ok\) \{ proToast\(t\('pro\.agents\.ticketFailed'\), \{ tone: 'bad' \}\); return; \}/,
    'a failed write must not brief the agent on a card that is not there');
});

/* ---- 7.7 the terminal tail ------------------------------------------------ */

test('the tail skips the furniture a repainting TUI leaves at the bottom of the screen', () => {
  const rows = [
    'Read src/main/index.ts',
    '',
    '  ● Bash npm test  ',
    '╭──────────────────────────────╮',
    '│ >                            │',
    '╰──────────────────────────────╯'
  ];
  assert.deepEqual(A.terminalTail(rows), ['Read src/main/index.ts', '● Bash npm test']);
});

test('the tail is oldest first, deduped, and total on rubbish', () => {
  assert.deepEqual(A.terminalTail(['one', 'two', 'three', 'four']), ['two', 'three', 'four']);
  // A TUI writes its status line again unchanged on every beat, so three rows
  // of buffer are often one line of information.
  assert.deepEqual(A.terminalTail(['a', 'b', 'b', 'b']), ['a', 'b']);
  assert.deepEqual(A.terminalTail([]), []);
  assert.deepEqual(A.terminalTail(['   ', '', '\t']), []);
  assert.deepEqual(A.terminalTail(['────', '│ │', '>']), [], 'box drawing is not output');
  assert.deepEqual(A.terminalTail([null, undefined, 42, 'real']), ['real']);
  assert.deepEqual(A.terminalTail(['x'], 0), []);
});

test('the tail is bounded three ways, because it runs per card on a timer', () => {
  assert.equal(A.TAIL_LINES, 3, 'the founder asked for three');
  // At most TAIL_LINES back.
  assert.equal(A.terminalTail(Array.from({ length: 500 }, (_, i) => `line ${i}`)).length, 3);
  // At most TAIL_SCAN_ROWS read: a real line further back than that is too old
  // to call "what it is doing now", so it is not dredged up.
  const buried = ['the only real line', ...Array.from({ length: A.TAIL_SCAN_ROWS + 5 }, () => '────')];
  assert.deepEqual(A.terminalTail(buried), []);
  // Each line cut to maxLen, with the cut said rather than hidden.
  const long = A.terminalTail(['y'.repeat(400)])[0];
  assert.equal(long.length, A.TAIL_LINE_MAX);
  assert.ok(long.endsWith('…'));
  // Whitespace runs collapse: a translated cursor-forward stands for a run of
  // columns the card has no room for.
  assert.deepEqual(A.terminalTail(['a      b\tc']), ['a b c']);
});

test('sameTail keeps an unchanged screen from re-rendering the grid', () => {
  assert.equal(A.sameTail(['a', 'b'], ['a', 'b']), true);
  assert.equal(A.sameTail(['a'], ['a', 'b']), false);
  assert.equal(A.sameTail(['a', 'b'], ['a', 'c']), false);
  assert.equal(A.sameTail([], []), true);
});

test('the source is the agent\'s OWN terminal buffer, not the digest wearing its name', () => {
  assert.match(grid, /acquireTerminal\(ptyId\)\.term\.buffer\.active/,
    'the pooled xterm is the only place the emulated lines exist');
  assert.match(grid, /buf\.getLine\(y\)\?\.translateToString\(true\)/);
  assert.match(grid, /next = terminalTail\(rows\)/);
  assert.match(grid, /if \(!ptyId\) \{ setLines\(\[\]\); return; \}/,
    'an agent with no live session has no terminal, and the card says nothing rather than guessing');
  assert.match(grid, /\{tail\.length > 0 && \(/, 'no heading over an empty box');
  assert.match(grid, /t\('pro\.agents\.terminalTail'\)/);
  // The digest still appears, as the UPDATE line, which is what it is: a
  // sentence the app wrote about a hook event. It must not also be drawn under
  // a heading that says the terminal.
  assert.match(grid, /describeEntry\(last, t, technical\)/);
  const tailBlock = grid.slice(grid.indexOf("{tail.length > 0 && ("), grid.indexOf('!fresh && ctx !== null'));
  assert.ok(!/describeEntry|last\b/.test(tailBlock), 'the digest is being drawn as terminal output');
});

test('nothing was added to main or preload for the tail, and nothing is kept anywhere', () => {
  // Route (a) from the brief was a per agent tail in main. It is not needed:
  // main sees raw repainting TUI bytes keyed by pty id and has no emulator,
  // while the renderer already runs one for every live agent.
  assert.ok(!/ptyTail|terminalTail|recentOutput/i.test(preload),
    'a new IPC door for something the renderer already holds');
  const shared = read('src/shared/agentCard.ts');
  for (const sink of ['writeFile', 'localStorage', 'sessionStorage', 'require(']) {
    assert.ok(!shared.includes(sink), `the tail module reaches for ${sink}`);
  }
  // React free, so load-ts can load it and these unit tests can exist at all.
  assert.ok(!/from 'react'|useState|useEffect/.test(shared));
});

/* ---- the strings ---------------------------------------------------------- */

test('every new phase 7 string exists in the three locales, with no dash', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) =>
    [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
  const keys = [
    'pro.room.keyHint',
    'pro.voice.noKey', 'pro.voice.title', 'pro.voice.stop', 'pro.voice.transcribing', 'pro.voice.busy',
    'pro.voice.hintLabel', 'pro.voice.setupTitle', 'pro.voice.lead',
    'pro.voice.s1', 'pro.voice.s2', 'pro.voice.s3', 'pro.voice.shortcut', 'pro.voice.openSettings',
    'pro.agents.addTicket', 'pro.agents.addTicketTitle', 'pro.agents.terminalTail',
    'pro.agents.newTicketTitle', 'pro.agents.ticketTitleLabel', 'pro.agents.ticketTitlePlaceholder',
    'pro.agents.ticketDetailLabel', 'pro.agents.ticketDetailHint', 'pro.agents.ticketDetailPlaceholder',
    'pro.agents.ticketWhat', 'pro.agents.ticketCreate', 'pro.agents.ticketMade', 'pro.agents.ticketFailed',
    'pro.agents.ticketBrief', 'pro.agents.ticketBriefEnd',
    'pro.agent.capNotSet', 'pro.agent.capOwn', 'pro.agent.capWorkspace', 'pro.agent.capApplies'
  ];
  for (const k of keys) {
    for (const l of Object.keys(locales)) {
      assert.ok(locales[l].has(k), `${k} in ${l}`);
      const v = locales[l].get(k);
      assert.ok(typeof v === 'string' && v.length > 0, `${k} (${l}) is empty`);
      assert.ok(!/[—–]/.test(v) && !/ - /.test(v), `${k} (${l}) carries a dash`);
    }
  }
  // Written, not transliterated: a zh key holding the English string ships as
  // a missing translation that no test can see.
  for (const k of keys) {
    assert.notEqual(locales['zh-CN'].get(k), locales.en.get(k), `${k} zh-CN is the English string`);
    assert.notEqual(locales.ar.get(k), locales.en.get(k), `${k} ar is the English string`);
  }
});

test('the new strings interpolate the name and carry no banned word', () => {
  const BANNED = /\b(harness config|hive|floor|spawn|spawned|spawns|palace|awaiting|starting up|block tools|semantic memory|pty)\b/i;
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  for (const l of ['en', 'zh-CN', 'ar']) {
    const all = flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)));
    const mine = all.filter(([k]) => k.startsWith('pro.voice.') || /^pro\.agents\.(addTicket|ticket|newTicket|terminalTail)/.test(k) || /^pro\.agent\.cap/.test(k));
    assert.ok(mine.length >= 25, `${l}: the sweep found ${mine.length} keys, so it is checking almost nothing`);
    for (const [k, v] of mine) assert.ok(!BANNED.test(v), `${l}: ${k} says a banned word`);
  }
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json')).pro;
  // The orchestrator and the agents are named through interpolation, never in
  // the copy, so a renamed agent renames everywhere.
  assert.match(en.agents.ticketWhat, /\{\{name\}\}/);
  assert.match(en.agents.newTicketTitle, /\{\{name\}\}/);
  assert.match(en.agents.ticketMade, /\{\{name\}\}/);
  // The three facts that decide whether someone bothers with a key.
  assert.match(en.voice.lead, /free/i);
  assert.match(en.voice.s1, /Create a free key/i);
  assert.match(en.voice.shortcut, /Option/);
});
