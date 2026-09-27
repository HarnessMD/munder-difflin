// PRO phase 3: Automations (one list over four records), Capabilities (per
// agent MCP grants that the launch path honours) and Memory (the canvas graph
// with a deterministic 3D layout). Each rule the screens rely on has a row
// here; a rule in a memory file is a hope.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const loadTs = require('./load-ts.cjs');

const shell = read('src/renderer/src/components/pro/ProShell.tsx');

/* ───────────────────────────── automations ────────────────────────────── */

const autos = loadTs('src/renderer/src/components/pro/autoData.ts');

const ledger = [
  { id: 'h1', source: 'webhook', sourceId: 'wh-a', sourceName: 'GitHub', direction: 'inbound', peer: 'god', body: 'x', kind: 'communication', decision: 'auto-allowed', at: 100 },
  { id: 'h2', source: 'webhook', sourceId: 'wh-a', sourceName: 'GitHub', direction: 'inbound', peer: 'god', body: 'y', kind: 'directive', decision: 'pending', at: 300 },
  { id: 'h3', source: 'webhook', sourceId: 'wh-b', sourceName: 'Linear', direction: 'inbound', peer: 'god', body: 'z', kind: 'directive', decision: 'rejected', at: 200 },
  { id: 'h4', source: 'org', sourceId: 'org', sourceName: 'Org', direction: 'inbound', peer: 'pam', body: 'w', kind: 'communication', decision: 'pending', at: 250 }
];
const sources = {
  missions: [{ id: 'm1', label: 'Stand-up', intervalMs: 86_400_000, to: 'god', body: 'b', enabled: true, lastFiredAt: 50 }],
  context: { compact: { enabled: true, everyMs: 7_200_000, minContextPct: 60, minContextPctLargeWindow: 40, message: '' }, clear: { enabled: false, everyMs: 7_200_000, minContextPct: 90, minContextPctLargeWindow: 80, message: '' } },
  webhooks: [{ id: 'wh-a', name: 'GitHub', secret: 's', enabled: true, mode: 'strict', schema: '{}', createdAt: 1 }, { id: 'wh-b', name: 'Linear', secret: 's', enabled: false, mode: 'allow-all', schema: '{}', createdAt: 2 }],
  org: { apiKey: 'k', enabled: true, mode: 'communication-only' },
  history: ledger
};

// Batch 3 #15: organisation keys do not exist, so an old org config (and an
// old org ledger row, h4) projects no row: three records, not four.
test('the Automations list projects three records into one ordered list, with last and pending from the ledger', () => {
  const rows = autos.projectRows(sources);
  assert.deepEqual(rows.map((r) => r.kind), ['schedule', 'context', 'context', 'webhook', 'webhook']);
  assert.equal(rows[0].last, 50, 'a mission stamps its own lastFiredAt');
  assert.equal(rows[1].id, 'context:compact');
  assert.equal(rows[1].last, undefined, 'a context rule leaves no ledger; the row must not invent a time');
  assert.equal(rows[3].last, 300, 'a webhook fires when a message arrives: newest ledger row for that endpoint');
  assert.equal(rows[3].pending, 1);
  assert.equal(rows[4].last, 200);
  assert.equal(rows[4].pending, 0);
  assert.deepEqual(autos.filterRows(rows, 'webhook').map((r) => r.id), ['wh-a', 'wh-b']);
  assert.equal(autos.filterRows(rows, 'all').length, 5);
});

test('a webhook drawer shows only its own ledger rows, newest first; a mission shows none', () => {
  const rows = autos.projectRows(sources);
  assert.deepEqual(autos.historyFor(ledger, rows[3]).map((h) => h.id), ['h2', 'h1']);
  assert.deepEqual(autos.historyFor(ledger, rows[0]), []);
});

test('a new schedule starts OFF with no body, so nothing fires before the user has written it', () => {
  const m = autos.newMission(1_000_000, 'god');
  assert.equal(m.enabled, false);
  assert.equal(m.body, '');
  assert.equal(m.to, 'god');
  assert.deepEqual(m.weekly, { days: [1, 2, 3, 4, 5], minute: 540 });
});

test('Automations replaces TriggersTab in PRO and writes through the three existing doors', () => {
  assert.match(shell, /case 'automations': return <AutomationsScreen \/>;/);
  assert.ok(!shell.includes('TriggersTab'), 'ProShell must not mount the Classic tab any more');
  const src = read('src/renderer/src/components/pro/AutomationsScreen.tsx');
  for (const door of ['listMissions', 'saveMissions', 'onMissionsUpdated', 'listTriggerHistory', 'onTriggerHistoryUpdated', 'decideTriggerHistory']) {
    assert.ok(src.includes(`window.cth.${door}`), `AutomationsScreen must call window.cth.${door}`);
  }
  for (const fn of ['getContextTrigger', 'setContextTrigger', 'saveWebhooks', 'deleteWebhook', 'generateWebhookSecret', 'webhooksStatus']) {
    assert.ok(src.includes(fn), `AutomationsScreen must use triggers/api ${fn}`);
  }
  // REWRITTEN 5 Sep 2026 (the simplification). Phase 4 moved NetworkPermissions
  // to Team and this line pinned it there. 0.4.11 collapsed it: the per person
  // setting lives on the teammate's own card in the drawer, written through
  // teamsSetPolicy, and Team must not mount a second permissions card beside
  // the status. The guarantee is the same one this pin always held, that the
  // per teammate setting stays reachable in PRO, now at its one surface.
  const teamScreen = read('src/renderer/src/components/pro/TeamScreen.tsx');
  assert.ok(!teamScreen.includes('<NetworkPermissions'), 'TeamScreen mounts a second permissions surface beside the status');
  assert.ok(teamScreen.includes('<TeammateDetail'), 'the per teammate setting must stay reachable in PRO: the drawer is its one surface');
  assert.ok(teamScreen.includes('teamsSetPolicy'), 'and the drawer must still write the per person policy');
  // decideTriggerHistory answers the entry or null; the drawer must treat null as failure
  assert.match(src, /decideTriggerHistory\(\{ id, decision \}\)\.then\(\(res\) => \{ if \(!res\) setFailed\(id\)/);
});

/* ───────────────────────────── capabilities ───────────────────────────── */

const mcp = loadTs('src/shared/agentMcp.ts');
const { MCP_CATALOG } = loadTs('src/shared/mcpCatalog.ts');
const safe = MCP_CATALOG.find((e) => e.tier === 'safe-readonly');
const secret = MCP_CATALOG.find((e) => e.tier === 'secret');

test('an agent gets a server by its own row, else the floor, else the catalog default', () => {
  assert.equal(mcp.mcpEnabledFor(safe, undefined, undefined, 'a'), true, 'safe-readonly defaults on');
  assert.equal(mcp.mcpEnabledFor(secret, undefined, undefined, 'a'), false, 'secret defaults off');
  assert.equal(mcp.mcpEnabledFor(safe, { [safe.id]: { enabled: false } }, undefined, 'a'), false, 'the floor can switch a default off');
  assert.equal(mcp.mcpEnabledFor(secret, { [secret.id]: { enabled: true } }, { a: { [secret.id]: { enabled: false } } }, 'a'), false, 'an own row beats the floor');
  assert.equal(mcp.mcpEnabledFor(secret, undefined, { a: { [secret.id]: { enabled: true } } }, 'a'), true);
  assert.equal(mcp.mcpEnabledFor(secret, undefined, { a: { [secret.id]: { enabled: true } } }, 'b'), false, 'a grant is per agent');
});

test('the launch path gets an explicit boolean for EVERY catalog id (hive.ts refuses a secret tier without a literal true)', () => {
  const eff = mcp.effectiveMcp({ [secret.id]: { enabled: true } }, { a: { [safe.id]: { enabled: false } } }, 'a');
  assert.deepEqual(Object.keys(eff).sort(), MCP_CATALOG.map((e) => e.id).sort());
  for (const v of Object.values(eff)) assert.equal(typeof v.enabled, 'boolean');
  assert.equal(eff[secret.id].enabled, true);
  assert.equal(eff[safe.id].enabled, false);
  const main = read('src/main/index.ts');
  assert.match(main, /mcpDefaults: effectiveMcp\(readConfig\(\)\.mcpDefaults, sanitizeAgentMcp\(readConfig\(\)\.agentMcp\), opts\.hive\.id\)/, 'pty:spawn must resolve MCP per agent');
  assert.match(main, /ipcMain\.handle\('config:setAgentMcp'/);
  assert.match(read('src/preload/index.ts'), /setAgentMcp: \(agentId: string, mcpId: string, enabled: boolean \| null\)/);
  const cfg = read('src/main/config.ts');
  assert.match(cfg, /export function setAgentMcp\(/);
  assert.match(cfg, /MCP_CATALOG\.some\(\(e\) => e\.id === mcpId\)/, 'main must refuse an id that is not in the catalog');
});

test('withAgentMcp sets, clears and drops empty rows; sanitizeAgentMcp keeps only well-formed rows', () => {
  let m = mcp.withAgentMcp(undefined, 'a', secret.id, true);
  assert.deepEqual(m, { a: { [secret.id]: { enabled: true } } });
  m = mcp.withAgentMcp(m, 'a', safe.id, false);
  assert.deepEqual(Object.keys(m.a).sort(), [safe.id, secret.id].sort());
  m = mcp.withAgentMcp(m, 'a', secret.id, null);
  m = mcp.withAgentMcp(m, 'a', safe.id, null);
  assert.deepEqual(m, {}, 'an agent with no rows left disappears from the map');
  assert.deepEqual(mcp.sanitizeAgentMcp({ a: { x: { enabled: 'yes' }, y: { enabled: true } }, b: 'junk', c: {} }), { a: { y: { enabled: true } } });
  assert.equal(mcp.sanitizeAgentMcp(null), undefined);
  assert.equal(mcp.hasOwnMcpRow({ a: { x: { enabled: false } } }, 'a', 'x'), true);
  assert.equal(mcp.hasOwnMcpRow({ a: { x: { enabled: false } } }, 'a', 'y'), false);
});

test('agentsWithMcp is the Capabilities avatar row and the agent screen reads the same resolver', () => {
  const ids = ['a', 'b', 'c'];
  assert.deepEqual(mcp.agentsWithMcp(secret, ids, undefined, { b: { [secret.id]: { enabled: true } } }), ['b']);
  assert.deepEqual(mcp.agentsWithMcp(safe, ids, undefined, { b: { [safe.id]: { enabled: false } } }), ['a', 'c']);
  assert.match(read('src/renderer/src/components/pro/AgentScreen.tsx'), /mcpEnabledFor\(m, config\?\.mcpDefaults, config\?\.agentMcp, agent\.id\)/);
  assert.match(shell, /case 'capabilities': return <CapabilitiesScreen config=\{config\} \/>;/);
  for (const gone of ['McpDefaultsSettings', 'SkillsTab', 'IntegrationsRegistry']) assert.ok(!shell.includes(gone), `ProShell must not stack ${gone} any more`);
});

const cap = loadTs('src/renderer/src/components/pro/capData.ts');
const agents = [{ id: 'j', provider: 'claude', cwd: '/r/a' }, { id: 'k', cwd: '/r/b' }, { id: 'c', provider: 'codex', cwd: '/r/a' }];

test('skills and tools are facts: engine, scope and cwd decide who has them', () => {
  assert.deepEqual(cap.agentsForSkill({ provider: 'claude', scope: 'user', path: '/u/s', foundIn: ['/r/a'] }, agents), ['j', 'k'], 'a user skill reaches every agent on that engine; no provider means claude');
  assert.deepEqual(cap.agentsForSkill({ provider: 'claude', scope: 'project', path: '/r/a/.claude/skills/x', foundIn: ['/r/a'] }, agents), ['j'], 'a project skill reaches agents in that cwd only');
  assert.deepEqual(cap.agentsForSkill({ provider: 'codex', scope: 'bundled', path: '/b', foundIn: [] }, agents), ['c']);
  assert.deepEqual(cap.agentsForTool({ id: 'engine:claude', kind: 'engine', found: true }, agents), ['j', 'k']);
  assert.deepEqual(cap.agentsForTool({ id: 'engine:codex', kind: 'engine', found: false }, agents), [], 'a missing engine runs nobody');
  assert.deepEqual(cap.agentsForTool({ id: 'mempalace', kind: 'memory', found: true }, agents), ['j', 'k', 'c']);
  assert.deepEqual(cap.agentsForTool({ id: 'tmux', kind: 'prerequisite', found: true }, agents), []);
  const folded = cap.foldSkills([{ cwd: '/r/a', skills: [{ path: '/u/s' }, { path: '/r/a/p' }] }, { cwd: '/r/b', skills: [{ path: '/u/s' }] }]);
  assert.deepEqual(folded.map((s) => [s.path, s.foundIn]), [['/u/s', ['/r/a', '/r/b']], ['/r/a/p', ['/r/a']]]);
});

/* ───────────────────────────── memory ─────────────────────────────────── */

const ml = loadTs('src/renderer/src/components/pro/memoryLayout.ts');
const graph = {
  nodes: [
    { kind: 'agent', id: 'god', label: 'Michael', accent: 'peach', status: 'working', isGod: true, degree: 3 },
    { kind: 'agent', id: 'jim', label: 'Jim', accent: 'sky', status: 'idle', isGod: false, degree: 1 },
    { kind: 'agent', id: 'pam', label: 'Pam', accent: 'coral', status: 'idle', isGod: false, degree: 1 },
    { kind: 'pseudo', id: 'human', label: 'human' },
    { kind: 'topic', id: 'topic:relay', label: 'relay', weight: 2 },
    { kind: 'topic', id: 'topic:design', label: 'design', weight: 2 }
  ],
  edges: [
    { id: 'm1', kind: 'message', source: 'god', target: 'jim', weight: 2 },
    { id: 'm2', kind: 'message', source: 'god', target: 'human', weight: 1 },
    { id: 't1', kind: 'topic', source: 'god', target: 'topic:relay', weight: 1 },
    { id: 't2', kind: 'topic', source: 'jim', target: 'topic:relay', weight: 1 },
    { id: 't3', kind: 'topic', source: 'pam', target: 'topic:design', weight: 1 },
    { id: 't4', kind: 'topic', source: 'god', target: 'topic:design', weight: 1 }
  ],
  topicShown: 2, topicTotal: 2
};

test('the 3D layout is deterministic, places every node, and moves only topics', () => {
  const a = ml.layout3d(graph), b = ml.layout3d(graph);
  assert.deepEqual([...a.entries()], [...b.entries()], 'the same graph must land in the same place every poll');
  for (const n of graph.nodes) assert.ok(a.has(n.id), `${n.id} placed`);
  const seed = ml.layout3d(graph, { iterations: 0 });
  for (const n of graph.nodes.filter((x) => x.kind !== 'topic')) assert.deepEqual(a.get(n.id), seed.get(n.id), `${n.id} must not drift during relaxation`);
  const relay = a.get('topic:relay'), god = a.get('god'), jim = a.get('jim');
  const dist = (p, q) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z);
  assert.ok(dist(relay, god) < dist(relay, a.get('pam')), 'a topic sits nearer the agents that share it');
  assert.ok(dist(relay, jim) < dist(relay, a.get('pam')));
});

test('projection is a yaw, a pitch and a perspective divide; nearer is bigger', () => {
  const near = ml.project({ x: 0, y: 0, z: -200 }, 0, 0, 800, 600);
  const far = ml.project({ x: 0, y: 0, z: 200 }, 0, 0, 800, 600);
  assert.ok(near.s > 1 && far.s < 1);
  assert.equal(near.sx, 400); assert.equal(near.sy, 300);
  const turned = ml.project({ x: 100, y: 0, z: 0 }, Math.PI / 2, 0, 800, 600);
  assert.ok(Math.abs(turned.sx - 400) < 1e-6, 'a quarter turn moves x onto the depth axis');
  assert.ok(ml.baseRadius(graph.nodes[0]) > ml.baseRadius(graph.nodes[1]), 'the orchestrator reads as the hub');
  const nodes = [{ id: 'a', p: { sx: 100, sy: 100, s: 1, z: 0 }, r: 10 }, { id: 'b', p: { sx: 200, sy: 100, s: 1, z: 0 }, r: 10 }];
  assert.equal(ml.pick(nodes, 104, 102), 'a');
  assert.equal(ml.pick(nodes, 150, 100), null);
});

test('"whose memory" keeps the agent, its topics, the agents on them and its message peers', () => {
  const keep = ml.keepFor(graph, 'jim');
  assert.deepEqual([...keep].sort(), ['broadcast', 'god', 'human', 'jim', 'topic:relay'].sort());
  assert.equal(ml.keepFor(graph, null), null, 'everyone means no filter');
});

test('the Memory screen draws sprites on the canvas, reads tokens at draw time, and replaces MemoryPanel in PRO', () => {
  const src = read('src/renderer/src/components/pro/MemoryScreen.tsx');
  assert.match(shell, /case 'memory': return <MemoryScreen config=\{config\} \/>;/);
  assert.ok(!shell.includes('MemoryPanel'), 'the floating pill is Classic only now');
  assert.ok(src.includes('paintPortrait(ctx, c, scale)') && src.includes('ctx.drawImage(img'), 'agent nodes are the character sprites, never initials');
  assert.ok(!/initials\(/.test(src));
  assert.ok(src.includes("getPropertyValue(k)"), 'colours come from the kit tokens at draw time');
  assert.ok(src.includes('window.cth.textSearch(') && src.includes('window.cth.searchMemory(query, whose ?? undefined)'), 'both searches, the palace one scoped by wing');
  assert.ok(src.includes("prefers-reduced-motion"), 'the idle spin respects reduced motion');
  // Phase 4 of 0.4.9: the agent and message layer still comes from buildGraph;
  // the topic layer is memoryTopics.ts (real notes, four kinds), see pro-049-memory.
  assert.ok(src.includes('buildGraph(agents, log)'), 'same node/edge model as the spec for agents and messages');
});

/* ───────────────────────────── i18n ───────────────────────────────────── */

test('every pro.* key the phase 3 screens use exists in all three locales', () => {
  const files = ['AutomationsScreen', 'CapabilitiesScreen', 'MemoryScreen'].map((f) => read(`src/renderer/src/components/pro/${f}.tsx`)).join('\n');
  const keys = new Set([...files.matchAll(/t\('((?:pro|contextSection|triggerHistory|webhooksSection|memoryPanel|memoryGraph|common)\.[a-zA-Z.]+)'/g)].map((m) => m[1]));
  // The kinds the screen can draw, from the list itself (the org kind went in batch 3).
  for (const k of ['all', ...autos.AUTO_KINDS]) keys.add(`pro.autos.filter.${k}`);
  for (const k of autos.AUTO_KINDS) keys.add(`pro.autos.kind.${k}`);
  for (const k of ['compact', 'clear']) { keys.add(`pro.autos.rule.${k}`); keys.add(`pro.autos.ruleMessageHint.${k}`); keys.add(`contextSection.${k}Blurb`); }
  for (const k of ['dispatch', 'heartbeat', 'compact']) keys.add(`pro.autos.missionKind.${k}`);
  for (const k of ['strict', 'allow-all', 'communication-only']) { keys.add(`pro.autos.modes.${k}`); keys.add(`pro.autos.modeBlurb.${k}`); }
  for (const k of ['decisionPending', 'decisionApproved', 'decisionRejected', 'decisionAuto']) keys.add(`triggerHistory.${k}`);
  for (const k of ['safe-readonly', 'write', 'secret']) keys.add(`pro.caps.tier.${k}`);
  for (const k of ['write', 'secret']) keys.add(`pro.caps.tierNote.${k}`);
  for (const k of ['user', 'project', 'bundled']) keys.add(`pro.caps.scope.${k}`);
  for (const k of ['prerequisite', 'memory', 'engine']) keys.add(`pro.caps.toolKind.${k}`);
  assert.ok(keys.size > 90, `parser found only ${keys.size} keys; the guard is disarmed`);
  for (const lang of ['en', 'zh-CN', 'ar']) {
    const dict = JSON.parse(read(`src/renderer/src/i18n/locales/${lang}.json`));
    for (const k of keys) {
      const v = k.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), dict);
      assert.equal(typeof v, 'string', `${lang} is missing ${k}`);
    }
  }
});
