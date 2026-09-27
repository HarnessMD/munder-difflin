// v0.4.9 phase 3: Michael's screen, six tabs, PRO native (plan Part 4 §4,
// decision D9 = option A). Pins: the six tabs exist and each has a real
// content branch; PRO never mounts the Classic Command Center or the
// AgentDetailPanel for the god; the board is read only and the propose door
// is the Inbox's message door; budget controls commit through the config
// door on blur; the terminal engine is shared, not forked; every string is in
// three locales; no banned word and no dash in the copy; and the pure
// arithmetic behind the tabs.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PRO = 'src/renderer/src/components/pro';
const GOD = `${PRO}/god`;
const godFiles = () => fs.readdirSync(path.join(ROOT, GOD)).filter((f) => /\.tsx?$/.test(f)).map((f) => `${GOD}/${f}`);
const screenFiles = () => [`${PRO}/GodScreen.tsx`, ...godFiles()];

const data = loadTs(`${GOD}/godData.ts`);
const screen = read(`${PRO}/GodScreen.tsx`);
const shell = read(`${PRO}/ProShell.tsx`);

/* ---- the screen ------------------------------------------------------------ */

test('six tabs in the prototype order, each with a content branch and a label in the locale', () => {
  assert.deepEqual([...data.GOD_TABS], ['terminal', 'messages', 'routing', 'budget', 'board', 'config']);
  assert.equal(data.isGodTab('budget'), true);
  assert.equal(data.isGodTab('floor'), false, "the prototype's word for the stream is not a PRO tab");
  assert.equal(data.isGodTab(null), false);
  const files = {
    terminal: 'TerminalTab', messages: 'MessagesTab', routing: 'RoutingTab', budget: 'BudgetTab', board: 'BoardTab', config: 'ConfigTab'
  };
  for (const k of data.GOD_TABS) {
    assert.match(screen, new RegExp(`\\{tab === '${k}' && <${files[k]}\\b`), `tab '${k}' does not mount ${files[k]}`);
    assert.ok(fs.existsSync(path.join(ROOT, GOD, `${files[k]}.tsx`)), `${files[k]}.tsx exists`);
    assert.match(screen, /t\(`pro\.god\.tab\.\$\{k\}`\)/);
  }
  const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));
  assert.deepEqual(Object.keys(en.pro.god.tab), [...data.GOD_TABS], 'the tab labels are keyed by the tab ids');
  assert.equal(en.pro.god.tab.budget, 'Budget & breaker');
});

test('the shell routes the god to his screen and PRO never mounts the Command Center or the detail panel for him', () => {
  assert.match(shell, /if \(a\.isGod\) return <GodScreen agent=\{a\} config=\{config\} \/>;/);
  assert.match(shell, /return <AgentScreen agent=\{a\} config=\{config\} \/>;/, 'every other agent still opens the agent screen');
  for (const f of screenFiles()) {
    const src = strip(read(f));
    assert.ok(!/CommandCenterPanel|AgentDetailPanel|FullscreenTerminal/.test(src), `${f} reaches a Classic god surface`);
    assert.ok(!/from ['"][^'"]*\/(PixelPanel|PixelButton|PixelBadge|Icon)['"]/.test(src), `${f} imports a pixel primitive`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src.replace(/https?:\/\/\S+/g, '')), `${f} carries a literal hex colour`);
  }
  // The Classic branch moved up one level, so the detail panel no longer
  // drags the Command Center (and its eleven tabs) into the PRO import walk.
  const detail = strip(read('src/renderer/src/components/AgentDetailPanel.tsx'));
  assert.ok(!/CommandCenterPanel/.test(detail), 'AgentDetailPanel must not import the Command Center');
  const app = strip(read('src/renderer/src/App.tsx'));
  assert.match(app, /agent\.isGod \? <CommandCenterPanel agent=\{agent\} \/> : <AgentDetailPanel agent=\{agent\} \/>/, 'Classic keeps the Command Center for the god');
  const cc = strip(read('src/renderer/src/components/CommandCenterPanel.tsx'));
  assert.ok(!/PRO_TABS|inPro|useAppSkin|appSkin/.test(cc), 'the Command Center is Classic only and no longer reads the skin');
  for (const k of ['terminal', 'floor', 'tasks', 'human', 'triggers', 'trigger-history', 'memory', 'graph', 'activity', 'skills', 'workers']) {
    assert.match(cc, new RegExp(`\\{ key: '${k}',`), `Classic tab '${k}' survived`);
  }
});

test("the agent screen's frame: portrait, orchestrator chip, status chip, the control cluster, no dense menu bar", () => {
  // 5 Sep 2026: the chip fell to the bare sprite sweep; later the same day
  // the founder called the 2x face too big for this bar, so it is the native
  // 28 art in a 40 box.
  assert.match(screen, /<SpritePortrait character=\{agent\.character\} size=\{40\} \/>/);
  assert.match(screen, /<Chip tone="accent">\{t\('pro\.god\.orchestrator'\)\}<\/Chip>/);
  assert.match(screen, /<StatusChip status=\{agent\.status\} raw=\{agent\.action\} \/>/);
  assert.match(screen, /<VoiceButton godName=\{agent\.name\} \/>/, 'the realtime voice toggle has PRO styling in the header');
  assert.match(screen, /<CostHud compact \/>/, 'the cost readout sits beside it');
  assert.match(screen, /<DeliveryButton agent=\{agent\} \/>/);
  assert.match(screen, /setIdeOpen\(true, agent\.id\)/);
  assert.match(screen, /useRealtimeMichael\(\)/, 'the voice button drives the same session singleton as Classic');
  assert.match(screen, /controlAutoDelivery\(a\.id, next\)/, 'the delivery switch writes every live agent, as the Classic header did');
  assert.match(screen, /<Tabs\b[\s\S]*tabs=\{GOD_TABS\.map/);
  assert.ok(!/<Bar\b/.test(screen), 'the header is the agent frame, not the list screen bar');
  // ⌘. opens Configuration and closes it again, from the chord table.
  assert.match(screen, /proChordFor\(e\) !== 'agentConfig'\) return;/);
  assert.match(screen, /setTab\(tab === 'config' \? before\.current : 'config'\)/);
  const config = strip(read(`${GOD}/ConfigTab.tsx`));
  assert.match(config, /CHORD_HINT\.agentConfig/, 'the hint on screen reads the chord table');
});

/* ---- the tabs ---------------------------------------------------------------- */

test('Terminal: the shared engine with PRO chrome, the same prompt hooks, and the one composer channel', () => {
  const term = strip(read(`${GOD}/TerminalTab.tsx`));
  assert.match(term, /import \{ PtyTerminalView \} from '\.\.\/\.\.\/PtyTerminalView'/, 'the xterm logic is imported, not forked');
  assert.match(term, /chrome="pro"/);
  assert.match(term, /key=\{terminalInstanceKey\(ptyId, agent\.terminalGeneration\)\}/);
  assert.match(term, /onStreamData=\{onPtyStream\}/);
  assert.match(term, /window\.cth\.historyAdd\(\{ agentId: agent\.id, cwd: agent\.cwd, text \}\)/);
  // 0.5.2 (founder, 8 Sep 2026): the tab mounts THE composer the agent room
  // mounts, not a fork of it. The channel pins (store draft, store queue, the
  // one voice control) live on pro/Composer.tsx now and are checked there;
  // the convergence itself is test/pro-052-god-composer.test.cjs.
  assert.match(term, /import \{ Composer \} from '\.\.\/Composer';/, 'the composer is imported, not forked');
  assert.match(term, /<Composer agent=\{agent\} \/>/);
  assert.doesNotMatch(term, /function GodComposer|<textarea/, 'no composer of its own');
  const composer = strip(read('src/renderer/src/components/pro/Composer.tsx'));
  assert.match(composer, /enqueueMessage\(agent\.id, body\(\), \{ fromHuman: true \}\)/, 'the composer enqueues through the store like the Agents prompt bar');
  assert.match(composer, /useStore\(\(s\) => s\.drafts\[agent\.id\]/, 'and the draft is the god draft so voice lands in it');
  assert.match(composer, /<VoiceButton agentId=\{agent\.id\} \/>/);
  assert.doesNotMatch(term, /freeflowRecorder\.toggle\(agent\.id\)/, 'no second mic beside the one control');
  // PtyTerminalView: the pro chrome draws no toolbar (the pixel one, with the
  // raw pty id as a title, is Classic's), and the default is unchanged.
  const pty = read('src/renderer/src/components/PtyTerminalView.tsx');
  assert.match(pty, /chrome\?: 'classic' \| 'pro';/);
  assert.match(pty, /chrome = 'classic'(, provider)? \}: PtyTerminalViewProps/);
  assert.match(pty, /\{chrome === 'classic' && \(/);
  assert.match(term, /technical && \(/, 'the session id is a technical rendering detail');
  assert.match(term, /<CopyBtn value=\{id\}/, 'and sits behind a copy control');
});

test('Messages and Routing read the Inbox reader, never a copy, and the log names a message once', () => {
  assert.match(screen, /import \{ useFloor \} from '\.\/InboxScreen'/);
  assert.match(screen, /const messages = useFloor\(\);/);
  assert.match(screen, /<MessagesTab messages=\{messages\} \/>/);
  assert.match(screen, /<RoutingTab messages=\{messages\} \/>/);
  const inbox = read(`${PRO}/InboxScreen.tsx`);
  assert.match(inbox, /export function useFloor\(\): FloorMessage\[\]/);
  for (const f of godFiles()) assert.ok(!/hiveMessages\(/.test(strip(read(f))), `${f} must not open the messages door itself`);
  const routing = strip(read(`${GOD}/RoutingTab.tsx`));
  assert.match(routing, /routingRows\(messages\)/);
  assert.match(routing, /countToday\(rows\)/);

  const rows = [
    { id: 'm1', from: 'god', to: 'jim', act: 'request', subject: 'Ship /me', created_at: '2026-09-03T10:00:00Z', direction: 'outbox' },
    { id: 'm1', from: 'god', to: 'jim', act: 'request', subject: 'Ship /me', created_at: '2026-09-03T10:00:00Z', direction: 'inbox' },
    { id: 'm2', from: 'jim', to: 'god', act: 'done', subject: 'Shipped', created_at: '2026-09-03T11:00:00Z', direction: 'inbox' },
    { id: 'm0', from: 'human', to: 'god', act: 'request', subject: 'Plan', created_at: '2026-09-02T09:00:00Z', direction: 'inbox' }
  ];
  const log = data.routingRows(rows);
  assert.deepEqual(log.map((r) => r.id), ['m2', 'm1', 'm0'], 'newest first, one row per id');
  assert.equal(log[1].direction, 'inbox', 'the delivered copy wins');
  assert.equal(data.countToday(rows, new Date('2026-09-03T18:00:00Z')), 3);
  assert.equal(data.countToday(rows, new Date('2026-09-04T01:00:00Z')), 0);
});

test('Budget & breaker: the numbers the breaker reads, and every control commits through the config door', () => {
  const budget = strip(read(`${GOD}/BudgetTab.tsx`));
  assert.match(budget, /useFleetTelemetry\(\)/, 'spend and velocity come from the collector');
  assert.match(budget, /<Meter pct=\{pct\} \/>/);
  assert.match(budget, /window\.cth\.updateConfig\(patch\)/);
  assert.match(budget, /window\.cth\.setAgentTokenCap\(id, parseCount\(text\)\)/);
  for (const field of ['costCapUsd', 'costCapTokens', 'maxConcurrentWorkers', 'autoMode']) {
    assert.match(budget, new RegExp(`save\\(\\{ ${field}: `), `${field} is written through updateConfig`);
  }
  for (const field of ['enabled', 'hardStop', 'repeatedToolLimit', 'errorStormLimit', 'tokenVelocityPerMin']) {
    assert.match(budget, new RegExp(`saveBreaker\\(\\{ ${field}: `), `circuitBreaker.${field} is written through updateConfig`);
  }
  assert.match(budget, /circuitBreaker: \{ \.\.\.\(config\?\.circuitBreaker \?\? \{\}\), \.\.\.patch \}/, 'a breaker edit keeps the other thresholds');
  // Committed on blur, never per keystroke: text fields are Drafts, no onChange
  // reaches the config door.
  assert.ok(!/onChange=\{[^}]*updateConfig/.test(budget), 'no per keystroke config write');
  assert.ok((budget.match(/<Draft\b/g) || []).length >= 7, 'the text controls are Drafts');
  assert.ok(!/localStorage/.test(budget));

  // The defaults mirror main's table exactly.
  const main = read('src/main/breaker.ts');
  const block = main.slice(main.indexOf('const DEFAULTS = {'), main.indexOf('};', main.indexOf('const DEFAULTS = {')));
  const num = (k) => Number(block.match(new RegExp(`${k}: ([0-9_]+)`))[1].replace(/_/g, ''));
  const bool = (k) => block.match(new RegExp(`${k}: (true|false)`))[1] === 'true';
  assert.deepEqual(data.BREAKER_DEFAULTS, {
    enabled: bool('enabled'), hardStop: bool('hardStop'),
    repeatedToolLimit: num('repeatedToolLimit'), errorStormLimit: num('errorStormLimit'), tokenVelocityPerMin: num('tokenVelocityPerMin')
  });

  // The pure arithmetic.
  const states = {
    jim: { agentId: 'jim', level: 'steering', reason: 'repeated tool', ts: 10 },
    pam: { agentId: 'pam', level: 'healthy', reason: '', ts: 20 },
    old: { agentId: 'old', level: 'stopped', reason: 'archived long ago', ts: 5 }
  };
  assert.equal(data.worstBreaker(states, ['jim', 'pam']).agentId, 'jim', 'only the live roster counts');
  assert.equal(data.worstBreaker(states, ['pam']).level, 'healthy');
  assert.equal(data.worstBreaker({}, ['pam']), null);
  assert.equal(data.lastBreakerAction(states).agentId, 'jim', 'the most recent non healthy state');
  assert.equal(data.lastBreakerAction({ pam: states.pam }), null);
  assert.equal(data.sumOver({ a: 1.5, b: 2 }, ['a', 'b', 'c']), 3.5);
  assert.equal(data.pctOf(60, 120), 50);
  assert.equal(data.pctOf(500, 120), 100, 'clamped');
  assert.equal(data.pctOf(5, undefined), null, 'no cap, no meter');
  assert.equal(data.pctOf(5, 0), null);
  assert.equal(data.parseCount('800,000'), 800000);
  assert.equal(data.parseCount(' 1_000_000 '), 1000000);
  assert.equal(data.parseCount(''), undefined);
  assert.equal(data.parseCount('lots'), undefined);
  assert.equal(data.parseCount('-5'), undefined);
  assert.equal(data.parseUsd('$120'), 120);
  assert.equal(data.parseUsd('12.50'), 12.5);
  assert.equal(data.parseUsd(''), undefined);
  assert.equal(data.countText(undefined), '');
  assert.equal(data.countText(42), '42');
});

test('Board: read through hive:board, no write, and the proposal goes through the Inbox message door to the god', () => {
  const board = strip(read(`${GOD}/BoardTab.tsx`));
  assert.match(board, /window\.cth\.hiveBoard\(\)/);
  assert.match(board, /onHiveMessage\?\.\(\(\) => load\(\)\)/, 'the board refreshes on a routed message');
  assert.ok(!/writeFile|hiveWriteBoard|saveBoard|hivePatch|fsWrite|contentEditable/.test(board), 'the board is read only');
  assert.match(board, /hiveSend\(\{ to: 'god', act: 'propose', subject: `Board proposal: \$\{first\}`, body \}, 'human'\)/);
  assert.ok(!/hiveSend\(\{ to: (?!'god')/.test(board), 'a proposal goes to the god, never to a worker');
  assert.match(board, /<MarkdownPreview source=\{board\} variant="card" \/>/);
  assert.match(board, /technical && path && \(/, 'the path is a technical rendering detail behind a copy control');
  // The preload door is read only too: hive:board answers with the file text.
  const main = read('src/main/index.ts');
  assert.match(main, /ipcMain\.handle\('hive:board', \(\) => hive\.board\(\)\);/);
  const preload = read('src/preload/index.ts');
  assert.match(preload, /hiveBoard: \(\): Promise<string> => ipcRenderer\.invoke\('hive:board'\)/);
  assert.ok(!/hive:writeBoard|hive:setBoard/.test(preload), 'no board write door exists, and none was added');
});

test("Configuration: the agent screen's doors, and the engine applies next start (said, not faked)", () => {
  const config = strip(read(`${GOD}/ConfigTab.tsx`));
  assert.match(config, /renameAgent\(agent\.id, name\)/);
  assert.match(config, /updateAgent\(agent\.id, \{ description: role \}\)/);
  assert.match(config, /window\.cth\.updateConfig\(\{ godProvider: provider, godModel: model, godCommand: godCommandToStore\(commandDraft, restartCommand\) \}\)/);
  assert.match(config, /window\.cth\.setAgentTokenCap\(agent\.id, parseCount\(v\)\)/);
  assert.match(config, /window\.cth\.updateConfig\(\{ orchestratorMaySpawn: next \}\)/);
  // 0.5.3 feature 17: every engine is LISTED; only the ones with an inbox drain
  // can be PICKED. The rule itself is tested in every-provider-listed.test.cjs.
  assert.match(config, /orchestratorEngineOptions\(t\('onboarding\.orchestrator\.workersOnly'\)\)/, 'the orchestrator can only pick providers with an inbox drain, and sees the rest disabled');
  assert.match(config, /t\('pro\.god\.config\.engineHint', \{ name: agent\.name \}\)/);
  // 5 Sep 2026 (founder: a Restart button in his Configuration, the command
  // shown above it). The restart dance is here now, and it is the WHOLE dance,
  // not half of it: kill, reset the xterm in place, spawn into the same pty
  // id. The step order and the resume rule are pinned in
  // test/pro-0411-god-restart.test.cjs; this line keeps the tab from ever
  // carrying a spawn without the kill and the reset that make it a restart.
  assert.ok(/killPty/.test(config) && /resetTerminal/.test(config) && /spawnPty/.test(config), 'a restart is kill, reset and spawn, all three');
  assert.match(config, /const restartCommand = config \? buildSpawnCommand\(config, model, provider\) : '';/, 'the command that will run is shown, from the same function that builds it');
  assert.match(config, /<PathRow value=\{agent\.cwd\} technical=\{technical\}/, 'the workspace path has its copy control in the technical rendering');
  // The renderer and preload mirrors carry the two config fields the tabs write.
  assert.match(read('src/renderer/src/store/config.ts'), /maxConcurrentWorkers\?: number;/);
  assert.match(read('src/preload/index.ts'), /orchestratorMaySpawn\?: boolean;[\s\S]*maxConcurrentWorkers\?: number;/);
  assert.match(read('src/main/config.ts'), /maxConcurrentWorkers\?: number;/);
});

/* ---- words ------------------------------------------------------------------- */

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const locales = () => Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));

test('every string on the screen exists in all three locales, static keys and each enumerated family', () => {
  const L = locales();
  const missing = [];
  for (const f of screenFiles()) {
    const src = strip(read(f));
    for (const m of src.matchAll(/\bt\(\s*'([^']+)'/g)) for (const l of Object.keys(L)) if (!L[l].has(m[1])) missing.push(`${f}: ${m[1]} (${l})`);
    for (const m of src.matchAll(/\bt\(\s*`([^`]+)`/g)) {
      const prefix = m[1].split('${')[0];
      if (![...L.en.keys()].some((k) => k.startsWith(prefix))) missing.push(`${f}: ${m[1]} (no key under ${prefix})`);
    }
  }
  assert.deepEqual(missing, []);
  const acts = [...read('src/preload/index.ts').match(/act: ((?:'[a-z]+' \| )+'[a-z]+');/)[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  const statuses = [...read('src/renderer/src/realtime/session.ts').match(/export type RealtimeStatus = ((?:'[a-z]+' \| )+'[a-z]+');/)[1].matchAll(/'([a-z]+)'/g)].map((m) => m[1]);
  const families = [
    ['pro.god.tab', [...data.GOD_TABS]],
    ['pro.god.act', acts],
    ['pro.god.breaker.level', [...data.BREAKER_LEVELS]],
    ['pro.god.voice', statuses],
    ['pro.god.voiceTitle', statuses]
  ];
  for (const [prefix, values] of families) {
    assert.ok(values.length >= 4, `${prefix}: the family was found (${values.length})`);
    for (const v of values) for (const l of Object.keys(L)) assert.ok(L[l].has(`${prefix}.${v}`), `${prefix}.${v} in ${l}`);
  }
  // Identical key sets under pro.god.
  const keysOf = (l) => [...L[l].keys()].filter((k) => k.startsWith('pro.god.')).sort();
  assert.ok(keysOf('en').length > 120, `pro.god has ${keysOf('en').length} keys`);
  assert.deepEqual(keysOf('zh-CN'), keysOf('en'));
  assert.deepEqual(keysOf('ar'), keysOf('en'));
});

test('no banned word and no dash in the copy, and no label doubles as an interpolated key', () => {
  const BANNED = /\b(harness config|hive|floor|spawn|spawned|spawns|palace|awaiting|starting up|block tools|semantic memory|pty)\b/i;
  const L = locales();
  for (const [k, v] of L.en) {
    if (!k.startsWith('pro.god.')) continue;
    assert.ok(!BANNED.test(v), `${k} uses a banned word: ${v}`);
    assert.ok(!/—|–|\s-\s|\w-\w/.test(v), `${k} carries a dash: ${v}`);
  }
  for (const l of ['zh-CN', 'ar']) for (const [k, v] of L[l]) if (k.startsWith('pro.god.')) assert.ok(!/—|–/.test(v), `${k} (${l}) carries a dash`);
  // A key that interpolates is always called with its argument.
  const src = screenFiles().map((f) => strip(read(f))).join('\n');
  for (const [k, v] of L.en) {
    if (!k.startsWith('pro.god.') || !/\{\{/.test(v)) continue;
    for (const m of src.matchAll(new RegExp(`t\\('${k.replace(/\./g, '\\.')}'([^)]*)\\)`, 'g'))) {
      assert.match(m[1], /^,\s*\{/, `${k} interpolates but is called without arguments`);
    }
  }
});

test('even borders, sprites, and the depth store (the kit rules hold in the subfolder too)', () => {
  for (const f of screenFiles()) {
    const src = read(f);
    for (const m of src.matchAll(/border(Left|Right|Top|Bottom)\s*:\s*[`'"]([^`'"]+)[`'"]/g)) {
      assert.match(m[2], /^1px /, `${f}: border${m[1]} "${m[2]}" is not a 1px hairline`);
    }
    assert.ok(!/\.audience\b/.test(strip(src)), `${f} reads config.audience; use useDepth()`);
    assert.ok(!/initials/i.test(strip(src)), `${f} must not draw initials for an agent`);
  }
  assert.match(screen, /useTechnical\(\)/);
  assert.match(strip(read(`${GOD}/TerminalTab.tsx`)), /import \{ .*Portrait.*\} from '\.\.\/ui'|<Portrait\b|StatusDot/, 'the terminal tab uses the kit');
  assert.match(strip(read(`${GOD}/BudgetTab.tsx`)), /<Portrait agent=\{a\} size=\{24\} \/>/, 'agents are sprites in the caps list');
});
