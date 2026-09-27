'use strict';
/**
 * 0.5.3, F25: THE PRO RAIL V2 (Pam's prototype, founder approved 22 Sep 2026;
 * hive/shared/design/sidebar-pro/v3/HANDOFF.md is the spec of record).
 *
 * Three parts. The pure rules behind the row (@shared/railSeen: what counts
 * as finished since the person last looked, the open mark, the age word).
 * The door in main (hive.humanMailSince: per agent unread mail to the person,
 * count and three short texts, never a thread; and the 1:1 push). And the row
 * itself, pinned on its source: the five lines in order, the strips, the
 * badge that clears only on open, the tip clamped to two lines at 11px, the
 * right click menu, the inline note editor, and the strings in three locales.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const { parseRailSeen, finishedSince, markOpened, ageWord, isAssignedTo, doneStampOf, RAIL_SEEN_KEY } = loadTs('src/shared/railSeen.ts');
const { HiveManager } = loadTs('src/main/hive.ts');

/* ---- the rules ------------------------------------------------------------ */

test('the seen marks: anything on disk that is not the shape is dropped, never thrown', () => {
  assert.deepEqual(parseRailSeen(null), { opened: {}, done: {} });
  assert.deepEqual(parseRailSeen('x'), { opened: {}, done: {} });
  assert.deepEqual(parseRailSeen({ opened: { a: '2026-09-23T00:00:00Z', b: 5 }, done: { a: ['T1', 2], c: 'no' } }), { opened: { a: '2026-09-23T00:00:00Z' }, done: { a: ['T1'] } });
  assert.equal(RAIL_SEEN_KEY, 'cth.proRail.seen');
});

test('finished since last looked: a done card of its own stamped after the open, or an unstamped one that was not done at the open; never for an agent never opened', () => {
  const t0 = '2026-09-23T10:00:00.000Z';
  const tasks = [
    { id: 'T1', title: 'Wall', status: 'done', assignee: 'jim', doneAt: '2026-09-23T11:00:00.000Z' },
    { id: 'T2', title: 'Old', status: 'done', assignee: 'jim', completedAt: '2026-09-22T11:00:00.000Z' },
    { id: 'T3', title: 'Unstamped', status: 'done', assignee: 'jim' },
    { id: 'T4', title: 'Known', status: 'done', assignee: 'jim' },
    { id: 'T5', title: 'Pam', status: 'done', assignee: 'pam', doneAt: '2026-09-23T11:00:00.000Z' },
    { id: 'T6', title: 'Doing', status: 'doing', assignee: 'jim', updatedAt: '2026-09-23T11:00:00.000Z' },
    { id: 'T7', title: 'By name', status: 'done', assignee: 'Jim Halpert', updatedAt: '2026-09-23T11:30:00.000Z' }
  ];
  const seen = { opened: { jim: t0 }, done: { jim: ['T4'] } };
  assert.deepEqual(finishedSince(tasks, 'jim', 'Jim Halpert', seen).map((t) => t.id), ['T1', 'T3', 'T7']);
  assert.deepEqual(finishedSince(tasks, 'pam', undefined, seen), [], 'never opened: nothing is news');
  assert.deepEqual(finishedSince(tasks, 'jim', undefined, { opened: { jim: 'garbage' }, done: {} }), [], 'a bad stamp is no stamp');
  assert.equal(doneStampOf({ id: 'x', title: '', status: 'done', doneAt: 'nope', completedAt: '2026-09-22T11:00:00.000Z' }), Date.parse('2026-09-22T11:00:00.000Z'), 'the first stamp that parses');
  assert.equal(isAssignedTo('JIM', 'jim'), true);
  assert.equal(isAssignedTo(undefined, 'jim'), false);
  // Opening now: the stamp, and the done cards as known, so the same ones
  // are not news again.
  const next = markOpened(seen, 'jim', 'Jim Halpert', tasks, new Date('2026-09-23T12:00:00.000Z'));
  assert.equal(next.opened.jim, '2026-09-23T12:00:00.000Z');
  assert.deepEqual(next.done.jim, ['T1', 'T2', 'T3', 'T4', 'T7']);
  assert.deepEqual(finishedSince(tasks, 'jim', 'Jim Halpert', next), []);
  assert.equal(seen.opened.jim, t0, 'the old marks are not mutated');
});

test('the age word: now, seconds, minutes, hours, days', () => {
  const now = Date.parse('2026-09-23T12:00:00.000Z');
  const at = (s) => now - s * 1000;
  assert.equal(ageWord(now, now), 'now');
  assert.equal(ageWord(at(3), now), 'now');
  assert.equal(ageWord(at(12), now), '12s');
  assert.equal(ageWord(at(9 * 60), now), '9m');
  assert.equal(ageWord(at(3 * 3600), now), '3h');
  assert.equal(ageWord(at(72 * 3600), now), '3d');
  assert.equal(ageWord(now + 5000, now), 'now', 'a stamp from the future is now, not negative');
});

/* ---- the door in main ------------------------------------------------------- */

function tmpHome() { return fs.mkdtempSync(path.join(os.tmpdir(), 'md-rail-')); }

test('hive.humanMailSince: per sender, the mail to the person after its stamp; count, newest stamp, three short texts; only the sender\'s own archive is read', async (t) => {
  const home = tmpHome();
  t.after(() => fs.rmSync(home, { recursive: true, force: true }));
  const emitted = [];
  const hive = new HiveManager(() => home, (channel, payload) => { emitted.push({ channel, payload }); });
  await hive.ensureAgent({ id: 'god', name: 'Michael', provider: 'claude', cwd: home, isGod: true });
  await hive.ensureAgent({ id: 'creed', name: 'Creed', provider: 'claude', cwd: home });
  await hive.ensureAgent({ id: 'kevin', name: 'Kevin', provider: 'claude', cwd: home });
  const at = (m) => new Date(Date.parse('2026-09-23T10:00:00.000Z') + m * 60_000).toISOString();
  // Creed writes the person four times; one to Kevin, which is not the person's mail.
  const msgs = [
    { from: 'creed', to: 'human', subject: 'Relay schema blocked on Kevin, can you nudge?', body: 'I need the retry envelope shape.\nTests are red until then.', created_at: at(0) },
    { from: 'creed', to: 'human', subject: 'Two options for the schema in my note', body: 'Flat keeps the Mongo indexes untouched.', created_at: at(5) },
    { from: 'creed', to: 'human', subject: 'Picked up T-119', body: 'Reading the relay code first. Token sk-ant-api03-SECRETSECRETSECRET here.', created_at: at(10) },
    { from: 'creed', to: 'human', subject: 'Fourth', body: 'x', created_at: at(15) },
    { from: 'creed', to: 'kevin', subject: 'Not the person', body: 'x', created_at: at(16) },
    { from: 'kevin', to: 'god', needs_human: true, subject: 'Needs the founder', body: 'Flagged for the person', created_at: at(2) }
  ];
  for (const m of msgs) {
    const dir = path.join(home, 'hive', 'agents', m.from, 'outbox');
    fs.mkdirSync(dir, { recursive: true });
    const full = { id: `m-${m.from}-${m.created_at}`, conversation: 'c', in_reply_to: null, act: 'inform', hops: 0, requires_reply: false, needs_human: false, ...m };
    fs.writeFileSync(path.join(dir, `${full.id}.json`), JSON.stringify(full));
  }
  let all = hive.humanMailSince({});
  assert.deepEqual(Object.keys(all).sort(), ['creed', 'kevin']);
  assert.equal(all.creed.count, 4, 'four to the person; the one to Kevin is not counted');
  assert.equal(all.creed.latest, at(15));
  assert.deepEqual(all.creed.texts.map((x) => x.subject), ['Fourth', 'Picked up T-119', 'Two options for the schema in my note'], 'the first three, newest first');
  assert.doesNotMatch(all.creed.texts[1].body, /SECRETSECRET/, 'redacted in main, like every message body that leaves it');
  assert.equal(all.creed.texts[1].body.includes('\n'), false, 'one line of body');
  assert.equal(all.kevin.count, 1, 'a needs_human flag counts as mail to the person');
  // Routing archives the sender's copy under outbox/.sent: the count holds.
  hive.routeOnce();
  assert.ok(fs.existsSync(path.join(home, 'hive', 'agents', 'creed', 'outbox', '.sent')));
  all = hive.humanMailSince({});
  assert.equal(all.creed.count, 4, 'the archive is the record');
  assert.equal(hive.humanMailSince({ creed: at(5) }).creed.count, 2, 'after the stamp: the two newer ones');
  assert.equal(hive.humanMailSince({ creed: at(15) }).creed, undefined, 'nothing newer: the sender is absent, not a zero');
  assert.equal(hive.humanMailSince({ creed: 'garbage' }).creed.count, 4, 'a bad stamp is no stamp');
  // The 1:1 push: a hold set anywhere reaches every surface.
  emitted.length = 0;
  assert.equal(hive.setAgentHold('creed', true).ok, true);
  assert.deepEqual(emitted.filter((e) => e.channel === 'hive:agentHold').map((e) => e.payload), [{ agentId: 'creed', onHold: true }]);
  assert.equal(hive.setAgentHold('creed', true).ok, true, 'the same hold again');
  assert.equal(emitted.filter((e) => e.channel === 'hive:agentHold').length, 1, 'no push when nothing changed');
});

test('the door is wired: main handles hive:humanMailSince, preload exposes it and the hold push, the rail follows both', () => {
  const main = read('src/main/index.ts');
  assert.match(main, /ipcMain\.handle\('hive:humanMailSince', \(_evt, since: unknown\) => \{[\s\S]*?return hive\.humanMailSince\(map\);/);
  const preload = read('src/preload/index.ts');
  assert.match(preload, /hiveHumanMailSince: \(since: Record<string, string>\): Promise<Record<string, HumanMailSummary>> =>\s*\n\s*ipcRenderer\.invoke\('hive:humanMailSince', since\)/);
  assert.match(preload, /onAgentHold: \(cb: \(e: \{ agentId: string; onHold: boolean \}\) => void\): \(\(\) => void\) => \{[\s\S]*?ipcRenderer\.on\('hive:agentHold', listener\)/);
  const data = read('src/renderer/src/components/pro/railData.ts');
  assert.match(data, /a\.hiveHumanMailSince\(marks\(\)\.opened\)/, 'the renderer hands in its own last-opened stamps');
  assert.match(data, /holdOff = a\.onAgentHold\(\(e\) => \{ useStore\.getState\(\)\.updateAgent\(e\.agentId, \{ onHold: e\.onHold \}\); \}\)/);
  assert.match(data, /if \(!e\.needsHuman && e\.to !== 'human'\) return;/, 'a routed push for the person re-reads; other traffic does not');
  assert.doesNotMatch(data, /hiveMessages\(|agentActivity\([^,]+, 200\)|readTranscript|ptyStream/, 'nothing here reads threads, transcripts or chunks');
});

/* ---- the row ---------------------------------------------------------------- */

const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
const row = sidebar.slice(sidebar.indexOf('function AgentRowBody('), sidebar.indexOf('/** The agent row\'s portrait height'));
const pieces = read('src/renderer/src/components/pro/railPieces.tsx');

test('the row: four lines in order, then the strips, then the note; nothing opens details on click', () => {
  const order = ['data-agent-line1', 'data-agent-meta', 'data-agent-context={ctxPct}', 'data-agent-task={ticket.id}', '<Strip kind="ask"', 'kind="crash"', 'data-agent-note-row'];
  const at = order.map((k) => row.indexOf(k));
  for (let i = 1; i < at.length; i++) assert.ok(at[i - 1] >= 0 && at[i] > at[i - 1], `${order[i - 1]} before ${order[i]} (${at.join(', ')})`);
  // Line 1: name, orchestrator chip, 1:1 chip, then the badge or the clip.
  const l1 = row.slice(row.indexOf('data-agent-line1'), row.indexOf('data-agent-meta'));
  for (const k of ['data-agent-name', "t('pro.agents.orchestrator')", 'data-agent-hold', 'data-agent-badge={agent.id}', "clipBtn(t('pro.rail.noteAdd'), { marginLeft: 'auto' })"]) assert.ok(l1.includes(k), `line 1 has ${k}`);
  assert.match(l1, /fontWeight: unread \? 600 : 400/, 'bold name while something is unread');
  assert.match(row, /const unread = mail\.count > 0 \|\| finished\.length > 0 \|\| !!ask;/);
  // Line 2: engine tile, model, the status word at the right with its dot.
  const l2 = row.slice(row.indexOf('data-agent-meta'), row.indexOf('data-agent-context'));
  assert.match(l2, /<EngineBadge provider=\{agent\.provider\} size=\{14\}/);
  assert.match(l2, /data-agent-no-session/);
  assert.match(l2, /<span data-agent-status=\{agent\.status\} title=\{statusWord\} style=\{\{ marginLeft: 'auto'[\s\S]*?<StatusDot status=\{agent\.status\} size=\{7\} \/>\s*\{statusWord\}/);
  // Line 3: the bar's track is ink-300 so it survives the hover and selected greys; absent with no session.
  assert.match(row, /\{ctxPct !== null && \(\s*<span data-agent-context=\{ctxPct\}[\s\S]*?background: 'var\(--cth-ink-300\)'/);
  assert.match(row, /t\('pro\.rail\.contextPct', \{ pct: ctxPct \}\)/);
  // Line 4 absent with no card. The live action line (the tool call and its
  // age) and its tip are gone (founder, 25 Sep 2026, rc.5: "useless, remove it").
  assert.match(row, /\{ticket && \(\s*<span data-agent-task=\{ticket\.id\}/);
  assert.doesNotMatch(row, /data-agent-live|showLiveTip|liveText|<Ago /);
  // The card a row names: the app writes ids, an orchestrator writes names.
  assert.match(sidebar, /return ticketOf\(tasks, agent\.id\) \?\? ticketOf\(tasks, agent\.name\);/);
  // The whole row is the click target and opens the agent, nothing else.
  assert.match(row, /data-agent-nav=\{agent\.id\}[\s\S]*?role="button" tabIndex=\{0\}[\s\S]*?onClick=\{open\}/);
  assert.match(row, /const open = \(\) => \{ markAgentOpened\(agent\.id, agent\.name\); tip\.close\(\); onSelect\(agent\.id\); \};/);
});

test('the strips: Asked you, Crashed, Finished, in their colours; messages are the badge, not a strip', () => {
  // Since 0.5.3's Ask me modal the strip also opens the modal on its card (pinned in v053-ask-me-modal).
  assert.match(row, /\{ask && <Strip kind="ask" word=\{t\('pro\.rail\.askedYou'\)\} text=\{ask\} color=\{statusColor\('blocked'\)\} tint=\{statusTint\('blocked'\)\} onClick=/);
  assert.match(row, /kind="crash" word=\{agent\.exit\.verdict === 'crashed' \? t\('pro\.rail\.crashed'\) : t\('pro\.agents\.stopped'\)\}/);
  assert.match(row, /color="var\(--cth-status-blocked\)" tint="var\(--cth-status-blocked-tint\)"/, 'a crash is a real failure: the failure colour');
  assert.match(row, /\{finished\.length > 0 && \(\s*<Strip kind="done" word=\{t\('pro\.rail\.finished'\)\}[\s\S]*?color="var\(--cth-status-working\)" tint="var\(--cth-status-working-tint\)"/);
  assert.doesNotMatch(row, /kind="mail"|kind="message"/);
  // Needs you follows MEANING: the store's `blocked` wears the warm token.
  const ui = read('src/renderer/src/components/pro/ui.tsx');
  assert.match(ui, /export function statusColor\(status: StatusKind\): string \{\s*\n\s*return MEANING_PAINT\[status\]\?\.background \?\? `var\(--cth-status-\$\{status\}\)`;/);
  assert.match(ui, /const key = status === 'blocked' \? 'waiting' : status === 'waiting' \? 'idle' : status;/);
  // The ask: the session's own block reason first, else the open question on a card of its own.
  // Since Ask me batch 2 (24 Sep) the card's ask is the NEWEST one, found by
  // the Ask me section's rule (v053-askme-batch2 pins the full expression).
  assert.match(sidebar, /const own = agent\.blockReason\?\.summary\?\.trim\(\);/);
  assert.match(sidebar, /if \(own\) return \{ text: own, card: newest\?\.id \};/);
  // The card's ask reaches the strip as one plain line since the T133 follow up (v053-rail-inbox-fixes).
  assert.match(sidebar, /return \{ text: previewLine\(openQuestion\(newest\)\?\.q \?\? ''\) \|\| undefined, card: newest\.id \};/);
});

test('the badge: hover lists the mail, two lines at 11px with the age, stays while the pointer is on badge or tip; it clears only when the agent is opened', () => {
  assert.match(row, /data-agent-badge=\{agent\.id\}[\s\S]*?onMouseEnter=\{\(e\) => showBadgeTip\(e\.currentTarget\)\} onMouseLeave=\{tip\.leave\}/);
  const badgeTip = row.slice(row.indexOf('const showBadgeTip'), row.indexOf('const clipBtn'));
  assert.match(badgeTip, /<TipHead>\{t\('pro\.rail\.newFrom', \{ count: mail\.count, name: agent\.name \}\)\}<\/TipHead>/);
  assert.match(badgeTip, /mail\.texts\.map\(\(m\) => <TipLine key=\{m\.id\} text=\{m\.subject \|\| m\.body\} age=\{ageWord/);
  assert.doesNotMatch(badgeTip, /markAgentOpened|refreshMail/, 'hover clears nothing');
  assert.match(pieces, /WebkitLineClamp: 2, overflow: 'hidden'/);
  assert.match(pieces, /padding: '8px 0', fontSize: 11, lineHeight: 1\.4/);
  assert.match(pieces, /onMouseEnter=\{stay\}\s*\n\s*onMouseLeave=\{leave\}/, 'the tip keeps itself while hovered');
  assert.match(pieces, /export const RAIL_TIP_GRACE_MS = 150;/);
  assert.match(pieces, /placeTip\(anchor\.getBoundingClientRect\(\), \{ w: window\.innerWidth, h: window\.innerHeight \}, surface\)/, 'opens away from the rail, the founder\'s 23 Sep rule');
  // The only clearing: the open mark drops the mail and stamps the agent.
  const data = read('src/renderer/src/components/pro/railData.ts');
  assert.match(data, /export function markAgentOpened\(agentId: string, agentName\?: string\): void \{[\s\S]*?delete mail\[agentId\];/);
  const screen = read('src/renderer/src/components/pro/AgentScreen.tsx');
  assert.match(screen, /useEffect\(\(\) => \{ markAgentOpened\(agent\.id, agent\.name\); \}, \[agent\.id, agent\.name\]\);/, 'whichever door led to the agent, opening it is the clear');
});

test('the right click menu: Open, Message, Pause or Resume tools, Hold or Release 1:1, Rename, Add or Edit note, Archive', () => {
  const items = row.slice(row.indexOf('const menuItems'), row.indexOf('const showBadgeTip'));
  const ids = [...items.matchAll(/\{ id: '([a-z]+)'/g)].map((m) => m[1]);
  assert.deepEqual(ids, ['open', 'message', 'pause', 'hold', 'rename', 'note', 'archive']);
  assert.match(items, /menu\.paused \? t\('pro\.room\.resumeTools'\) : t\('pro\.room\.pauseTools'\)/);
  assert.match(items, /agent\.onHold \? t\('pro\.rail\.menu\.release'\) : t\('pro\.rail\.menu\.hold'\)/);
  assert.match(items, /agent\.note \? t\('pro\.rail\.noteEdit'\) : t\('pro\.rail\.noteAdd'\)/);
  assert.match(items, /danger: true, run: \(\) => setArchiveAsk\(true\)/, 'archive asks first');
  assert.match(row, /onContextMenu=\{onContextMenu\}/);
  assert.match(row, /window\.cth\.controlSnapshot\?\.\(agent\.id\)/, 'the pause label reads the real state');
  assert.match(row, /requestInboxChat\(agent\.id\); onGo\('inbox'\);/, 'Message lands in Inbox on this agent');
  assert.match(row, /window\.cth\.hiveSetAgentHold\(agent\.id, next\)/);
  assert.match(pieces, /window\.addEventListener\('scroll', onClose, true\)/, 'the menu closes when the rail scrolls');
  assert.match(sidebar, /useEffect\(\(\) => \{ followAgentHold\(\); \}, \[\]\);/, 'the 1:1 chip follows main\'s push');
});

test('the note: the clip in front, three lines, an inline editor with Save and Cancel; a row with no note shows the clip on hover only', () => {
  assert.match(row, /: \(!agent\.note && !editing\) \? clipBtn\(t\('pro\.rail\.noteAdd'\), \{ marginLeft: 'auto' \}\) : null\}/);
  assert.match(row, /<NoteEditor\s+initial=\{agent\.note \?\? ''\}[\s\S]*?onSave=\{saveNote\} onCancel=\{\(\) => setEditing\(false\)\}/);
  assert.match(pieces, /<button type="button" data-note-cancel/);
  assert.match(pieces, /<button type="button" data-note-save/);
  const css = read('src/renderer/src/design/global.css');
  assert.match(css, /\.cth-rail-row \.cth-rail-clip \{ opacity: 0; transition: opacity 120ms; \}/);
  assert.match(css, /\.cth-rail-row:hover \.cth-rail-clip, \.cth-rail-row\[aria-current="page"\] \.cth-rail-clip/);
});

test('the row reads nothing heavy and re-renders for its own agent only', () => {
  assert.doesNotMatch(row, /hiveMessages|useAgentActivity\(|readTranscript|ptyStream|useStore\(\(s\) => s\.agents\)/);
  assert.match(sidebar, /const AgentRow = memo\(function AgentRow\(\{ id, active, onSelect, onGo \}/);
  assert.match(sidebar, /const goTo = useCallback\(\(screen: string\) => onSelectRef\.current\(screen\), \[\]\);/, 'one stable callback for the menu\'s destinations');
  const data = read('src/renderer/src/components/pro/railData.ts');
  assert.match(data, /return useSyncExternalStore\(subscribeMail, \(\) => mail\[agentId\] \?\? NO_MAIL, \(\) => NO_MAIL\);/, 'a per row selector, the same object until it changes');
  assert.match(data, /return useSyncExternalStore\(subscribeTs, \(\) => lastTs\.get\(agentId\) \?\? 0, \(\) => 0\);/);
  assert.match(data, /const TICK_MS = 30_000;/);
  assert.match(pieces, /export function Ago\(\{ ts, style \}[\s\S]*?const now = useAgoNow\(\);/, 'only the age text follows the clock');
});

test('the strings: every rail key exists in en, ar and zh-CN, and the two translations are not the English', () => {
  const locales = Object.fromEntries(['en', 'ar', 'zh-CN'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.rail]));
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (typeof v === 'string' ? [[p + k, v]] : flat(v, `${p}${k}.`)));
  const en = Object.fromEntries(flat(locales.en));
  for (const k of ['askedYou', 'crashed', 'finished', 'newFrom', 'nowHead', 'noSession', 'contextPct', 'noteHint', 'menu.open', 'menu.message', 'menu.hold', 'menu.release', 'menu.rename', 'menu.archive']) assert.ok(en[k], `en has ${k}`);
  for (const l of ['ar', 'zh-CN']) {
    const other = Object.fromEntries(flat(locales[l]));
    for (const k of Object.keys(en)) {
      assert.ok(other[k], `${l} has ${k}`);
      if (!/^\{\{|^1:1$/.test(en[k])) assert.notEqual(other[k], en[k], `${l}.${k} is the English string`);
    }
  }
  // Every key the row asks for is a key that exists.
  for (const m of (row + pieces).matchAll(/t\('pro\.rail\.([a-zA-Z.]+)'/g)) assert.ok(en[m[1]], `pro.rail.${m[1]} exists`);
});
