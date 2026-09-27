'use strict';

/* 0.5.3 rc.4, founder 25 Sep 2026: "There should be one more setting which
 * allows the user to not have any Ask me or any tickets listed next to the
 * agent. Just the agent and the notes." Config sidebarAgentsNotesOnly, the
 * toggle in Settings, General, and the rows in pro/ProSidebar.tsx. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const read = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');
const sidebar = read('src/renderer/src/components/pro/ProSidebar.tsx');
const settings = read('src/renderer/src/components/SettingsModal.tsx');
const shell = read('src/renderer/src/components/pro/ProShell.tsx');

test('the setting is one config field, typed in main, the renderer and the bridge, off unless true', () => {
  for (const f of ['src/main/config.ts', 'src/renderer/src/store/config.ts', 'src/preload/index.ts']) {
    assert.match(read(f), /sidebarAgentsNotesOnly\?: boolean;/, f);
  }
  assert.match(shell, /agentsAndNotesOnly=\{config\?\.sidebarAgentsNotesOnly === true\}/);
  assert.match(sidebar, /agentsAndNotesOnly = false\n\}: ProSidebarProps\)/, 'off by default');
});

test('Settings, General: one toggle, staged on the draft, so it takes effect on Save', () => {
  assert.match(settings, /draft\.value<boolean>\('sidebarAgentsNotesOnly', bareRailSaved\)/);
  assert.match(settings, /draft\.stage\(\{ sidebarAgentsNotesOnly: next \}\)/);
  assert.match(settings, /draft\.unstage\(\['sidebarAgentsNotesOnly'\]\)/);
  assert.match(settings, /data-sidebar-agents-notes-only[\s\S]{0,400}t\('settings\.general\.sidebarAgentsNotesOnly'\)/);
});

test('on, a row has no Asked you strip, no task line and no Finished task strip', () => {
  assert.match(sidebar, /const bare = useContext\(AgentsAndNotesOnly\);/);
  // The task line and the live tip's task both come from `ticket`: null draws neither.
  assert.match(sidebar, /const ticket = bare \? null : ticketFor\(tasks, agent\);/);
  assert.match(sidebar, /\{ticket && \(\s*<span data-agent-task=/);
  // The Asked you strip draws only with an ask; bare never has one.
  assert.match(sidebar, /bare \? \(\{\} as ReturnType<typeof askFor>\) : askFor\(agent, tasks\)/);
  assert.match(sidebar, /\{ask && <Strip kind="ask"/);
  assert.match(sidebar, /const finished = bare \? NO_FINISHED : finishedCards;/);
  assert.match(sidebar, /\{finished\.length > 0 && \(/);
});

test('on, the name, the status and the note stay; the crash strip stays too', () => {
  const body = sidebar.slice(sidebar.indexOf('function AgentRowBody'));
  for (const kept of ['data-agent-name', 'data-agent-status=', 'data-agent-note-text', 'kind="crash"']) {
    assert.ok(body.includes(kept), kept);
  }
  for (const k of ['data-agent-name', 'data-agent-status=', 'data-agent-note-text']) {
    const at = body.indexOf(k);
    const before = body.slice(Math.max(0, at - 200), at);
    assert.ok(!/bare/.test(before), `${k} is not gated by the setting`);
  }
});

test('the setting reaches memoised rows through a context, so their props stay four', () => {
  assert.match(sidebar, /const AgentsAndNotesOnly = createContext\(false\);/);
  assert.match(sidebar, /<AgentsAndNotesOnly\.Provider value=\{agentsAndNotesOnly\}>/);
  assert.match(sidebar, /memo\(function AgentRow\(\{ id, active, onSelect, onGo \}/);
});

test('the toggle has words in every language', () => {
  for (const lang of ['en', 'ar', 'zh-CN']) {
    const g = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`)).settings.general;
    assert.ok(g.sidebarAgentsNotesOnly && g.sidebarAgentsNotesOnlyInfo, lang);
  }
});
