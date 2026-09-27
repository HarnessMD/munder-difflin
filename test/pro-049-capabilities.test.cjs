// v0.4.9 phase 5a (plan W-B): role bundles in, prerequisites out. Every bundle
// item resolves to a real catalog id; the eleven bundles exist in the founder's
// order with his names; the Capabilities page never probes the machine; the
// Settings section probes only after a click under the confirm sentence; a
// grant writes through the same per agent door the launch path reads; PRO no
// longer reaches the Classic SkillsTab.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
const PRO = 'src/renderer/src/components/pro';
const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const LOCALES = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
const en = LOCALES.en;

const RB = loadTs('src/shared/roleBundles.ts');
const { MCP_CATALOG } = loadTs('src/shared/mcpCatalog.ts');
const { toolCatalog } = loadTs('src/shared/toolCatalog.ts');
const bundledSkills = fs.readdirSync(path.join(ROOT, 'resources/skills')).filter((d) => fs.existsSync(path.join(ROOT, 'resources/skills', d, 'SKILL.md')));

const ORDER = ['designer', 'software-engineer', 'product-manager', 'frontend-developer', 'founders-office', 'community-manager', 'growth-hacker', 'demand-generation', 'cold-outreach', 'cfo', 'legal'];
const LABELS = ['Designer', 'Software Engineer', 'Product Manager', 'Frontend Developer', 'Assistant · Founders office', 'Community Manager', 'Growth Hacker', 'Demand Generation', 'Cold Outreach', 'CFO', 'Legal'];
const BANNED = /\b(harness config|hive|floor|spawn|spawned|spawns|palace|awaiting|starting up|block tools|semantic memory|pty)\b/i;
const DASH = /—|–| - /;

test('eleven bundles, in the founder\'s order, with his names, in every locale', () => {
  assert.deepEqual(RB.ROLE_BUNDLES.map((b) => b.id), ORDER);
  assert.deepEqual(RB.ROLE_BUNDLES.map((b) => en.get(b.labelKey)), LABELS);
  for (const b of RB.ROLE_BUNDLES) {
    assert.equal(b.labelKey, `pro.bundles.${b.id}.label`);
    assert.equal(b.blurbKey, `pro.bundles.${b.id}.blurb`);
    for (const l of Object.keys(LOCALES)) {
      assert.equal(typeof LOCALES[l].get(b.labelKey), 'string', `${b.labelKey} in ${l}`);
      assert.equal(typeof LOCALES[l].get(b.blurbKey), 'string', `${b.blurbKey} in ${l}`);
    }
    assert.ok(!DASH.test(en.get(b.blurbKey)), `${b.id}: no dashes in the blurb`);
    assert.ok(!BANNED.test(en.get(b.blurbKey)), `${b.id}: no banned word in the blurb`);
  }
  assert.equal(RB.roleBundle('cfo').id, 'cfo');
  assert.equal(RB.roleBundle('nope'), undefined);
});

test('every bundle item resolves to a real catalog id: MCP, bundled skill, tool', () => {
  const mcpIds = new Set(MCP_CATALOG.map((e) => e.id));
  const toolIds = new Set(toolCatalog().map((x) => x.id));
  assert.ok(bundledSkills.length >= 10, `bundled skills found: ${bundledSkills.length}`);
  for (const b of RB.ROLE_BUNDLES) {
    for (const id of b.mcp) assert.ok(mcpIds.has(id), `${b.id}: MCP "${id}" is not in MCP_CATALOG`);
    for (const id of b.skills) assert.ok(bundledSkills.includes(id), `${b.id}: skill "${id}" is not in resources/skills`);
    for (const id of b.tools) assert.ok(toolIds.has(id), `${b.id}: tool "${id}" is not in toolCatalog()`);
    for (const id of b.tools) assert.notEqual(toolCatalog().find((x) => x.id === id).kind, 'prerequisite', `${b.id}: a bundle names no prerequisite`);
    for (const list of [b.mcp, b.skills, b.tools]) {
      assert.ok(list.length > 0, `${b.id}: every half is non empty`);
      assert.equal(new Set(list).size, list.length, `${b.id}: no duplicate ids`);
    }
  }
});

test('the grant plan: what the agent lacks is granted, what it has is not, another engine gets nothing', () => {
  const se = RB.roleBundle('software-engineer');
  const floor = undefined; // catalog defaults: safe-readonly on, write and secret off
  const p = RB.bundleGrantPlan(se, 'jim', floor, undefined, 'claude');
  assert.equal(p.mcpReaches, true);
  assert.ok(p.already.includes('fetch') && p.already.includes('git'), 'defaults already on');
  assert.deepEqual(p.grant, ['github-token', 'db'], 'the two secret servers are the writes');
  const q = RB.bundleGrantPlan(se, 'jim', floor, { jim: { 'github-token': { enabled: true } } }, 'claude');
  assert.deepEqual(q.grant, ['db']);
  assert.ok(q.already.includes('github-token'));
  const r = RB.bundleGrantPlan(se, 'jim', { fetch: { enabled: false } }, undefined, undefined);
  assert.ok(r.grant.includes('fetch'), 'a workspace default switched off is granted per agent; no provider means claude');
  const c = RB.bundleGrantPlan(se, 'c', floor, undefined, 'codex');
  assert.deepEqual(c.grant, []);
  assert.equal(c.mcpReaches, false);
});

test('the Capabilities page never probes the machine and drops the prerequisite kind', () => {
  const src = strip(read(`${PRO}/CapabilitiesScreen.tsx`));
  assert.ok(!/toolsStatus/.test(src), 'no tools:status call on the Capabilities page');
  assert.ok(!/useTools\(/.test(src));
  assert.match(src, /toolCatalog\(\)\.filter\(\(x\) => x\.kind !== 'prerequisite'\)/, 'engines and memory only, from the pure catalog');
  assert.ok(!/toolKind\.prerequisite|kind === 'prerequisite'/.test(src), 'the prerequisite kind is not rendered');
  assert.match(src, /new CustomEvent\('cth:open-settings', \{ detail: \{ section: 'Prerequisites' \} \}\)/, 'the machine check is one link away, under Settings');
  assert.match(src, /openBundleSheet\(\)/, 'the marketplace hero opens the bundle sheet (v0.4.11 item 12: the header buttons moved into the hero)');
  assert.match(src, /<SkillsSheet /);
  assert.match(src, /<ConnectionsSheet /);
  // Subdirectories included (pro/god, pro/onboarding): they are PRO too.
  const files = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
  for (const f of files(PRO)) {
    const s = strip(read(f));
    assert.ok(!/from '\.\.\/(SkillsTab|IntegrationsRegistry|SetupPanel)'/.test(s), `${f} reaches a Classic file`);
    // Onboarding (phase 1) probes on purpose: it refuses an engine that cannot
    // boot before the workspace is written. Every other PRO surface never does.
    if (f.includes('/onboarding/')) continue;
    assert.ok(!/toolsStatus/.test(s), `${f} probes the machine`);
  }
});

test('Settings → Prerequisites: the lookup runs from the click under the confirm sentence, never on mount', () => {
  const src = strip(read('src/renderer/src/components/PrerequisitesCheck.tsx'));
  assert.ok(!/useEffect/.test(src), 'nothing runs on mount');
  assert.equal((src.match(/toolsStatus/g) || []).length, 1, 'one caller');
  const check = src.slice(src.indexOf('const check = async () =>'), src.indexOf('const found ='));
  assert.match(check, /window\.cth\.toolsStatus\(\)/, 'and it is the click handler');
  assert.match(src, /onClick=\{\(\) => \{ void check\(\); \}\}/);
  assert.match(src, /t\('pro\.prereq\.confirm'\)[\s\S]*onClick=\{\(\) => \{ void check\(\); \}\}/, 'the sentence comes before the button');
  assert.equal(en.get('pro.prereq.confirm'), 'Runs local version and path checks on this machine, nothing leaves it.');
  assert.equal(en.get('pro.prereq.check'), 'Check now');
  for (const hint of ['tool.installCommand', 'tool.note', 'tool.docsUrl', 'tool.path', 'tool.detail']) assert.ok(src.includes(hint), `shows ${hint}, as SetupPanel does`);
  assert.ok(!/PixelButton|PixelPanel|from '\.\/Icon'/.test(src), 'no Classic pixels in a file PRO reaches');
  const modal = strip(read('src/renderer/src/components/SettingsModal.tsx'));
  assert.match(modal, /activeSection === 'Prerequisites' && \(chrome === 'inline' \? <PrerequisitesCheck \/> : <SetupPanel onDone=\{onClose\} \/>\)/, 'PRO gets the section, Classic keeps SetupPanel');
});

test('granting a bundle writes the same per agent MCP rows the launch path reads, and says what it does not write', () => {
  const src = strip(read(`${PRO}/BundleSheet.tsx`));
  assert.match(src, /bundleGrantPlan\(chosen, agent\.id, config\?\.mcpDefaults, config\?\.agentMcp, providerOf\(agent\)\)/);
  assert.match(src, /for \(const id of plan\.grant\) \{\s*await window\.cth\.setAgentMcp\(agent\.id, id, true\);/, 'one merged write per server');
  assert.ok(!/skillsInstall|updateConfig/.test(src), 'skills have no per agent door; the sheet does not pretend');
  assert.match(src, /t\('pro\.bundles\.skillsNote'\)/);
  assert.match(src, /t\('pro\.bundles\.toolsNote'\)/);
  assert.match(src, /<Portrait agent=\{agent\} size=\{24\} \/>/, 'the picker is sprites');
  assert.ok(!/initials/i.test(src));
  assert.match(src, /technical && e && <><Code>\{e\.id\}<\/Code><Chip tone=\{TIER_TONE\[e\.tier\]\}/, 'the technical rendering adds the id and the tier');
  assert.match(src, /proToast\(text, \{ tone: 'ok', ms: 7000, action: \{ label: t\('pro\.bundles\.openAgent'\), run: \(\) => nav\.go\(`agent:\$\{agent\.id\}`\) \} \}\)/, 'the toast opens the agent where the grants show');
  const shell = strip(read(`${PRO}/ProShell.tsx`));
  assert.equal((shell.match(/<BundleSheetHost config=\{config\} \/>/g) || []).length, 1, 'hosted once, inside the pane provider');
  const agent = strip(read(`${PRO}/AgentScreen.tsx`));
  assert.equal((agent.match(/openBundleSheet\(\{ agentId: agent\.id \}\)/g) || []).length, 1, 'one button in the room, agent preselected');
});

test('the skills and connections sheets go through the same IPC the Classic surfaces used, with a confirm before a delete', () => {
  const skills = strip(read(`${PRO}/SkillsSheet.tsx`));
  for (const door of ['skillsLocal', 'skillsCatalog', 'skillsInstall', 'skillsUninstall', 'skillsReveal', 'openExternal']) assert.match(skills, new RegExp(`window\\.cth\\.${door}\\(`), door);
  assert.match(skills, /<ConfirmDialog danger[^\n]*pro\.skills\.removeTitle/);
  assert.match(skills, /technical \? s\.path : undefined/, 'the path is a technical line');
  const conn = strip(read(`${PRO}/ConnectionsSheet.tsx`));
  for (const door of ['listTemplates', 'list', 'save', 'remove', 'test']) assert.match(conn, new RegExp(`integrationsClient\\.${door}\\(`), door);
  assert.match(conn, /<ConfirmDialog danger[^\n]*pro\.conn\.removeTitle/);
  assert.match(conn, /type="password"/, 'the secret is write only');
  for (const f of ['SkillsSheet', 'ConnectionsSheet', 'BundleSheet', 'CapabilitiesScreen']) {
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(strip(read(`${PRO}/${f}.tsx`))), `${f}: kit tokens only`);
  }
});

test('the fence shrank: SkillsTab left the pixel baseline and the four Capabilities strings left the vocabulary baseline', () => {
  const fence = read('test/pro-fence.test.cjs');
  assert.ok(!fence.includes("'src/renderer/src/components/SkillsTab.tsx'"));
  // Phase 4 renamed three of the four keys (floor became workspace in the key
  // as well as the string); noSkills kept its key and lost the word.
  for (const k of ['pro.caps.floorHint', 'pro.caps.followsFloor', 'pro.caps.noSkills', 'pro.caps.useFloor']) {
    assert.ok(!fence.includes(`'${k}'`), `${k} is off the baseline`);
  }
  for (const k of ['pro.caps.workspaceHint', 'pro.caps.followsWorkspace', 'pro.caps.noSkills', 'pro.caps.useWorkspace']) {
    assert.ok(en.get(k), `${k} exists`);
    assert.ok(!BANNED.test(en.get(k)), `${k} no longer says it`);
  }
});

test('every string the phase added exists in the three locales, with no dashes and no banned words', () => {
  const files = ['src/renderer/src/components/PrerequisitesCheck.tsx', ...['BundleSheet', 'SkillsSheet', 'ConnectionsSheet', 'CapabilitiesScreen', 'AgentScreen'].map((f) => `${PRO}/${f}.tsx`)];
  const keys = new Set();
  for (const f of files) for (const m of strip(read(f)).matchAll(/\bt\(\s*'((?:pro|common)\.[^']+)'/g)) keys.add(m[1]);
  for (const k of ['prerequisite', 'memory', 'engine']) keys.add(`pro.prereq.kind.${k}`);
  for (const k of ['none', 'bearer', 'header', 'github']) keys.add(`pro.conn.authKind.${k}`);
  assert.ok(keys.size > 80, `parser found only ${keys.size} keys`);
  for (const k of keys) for (const l of Object.keys(LOCALES)) assert.equal(typeof LOCALES[l].get(k), 'string', `${k} in ${l}`);
  for (const [k, v] of en) {
    if (!/^pro\.(bundles|prereq|skills|conn)\./.test(k)) continue;
    assert.ok(!DASH.test(v), `${k}: no dashes ("${v}")`);
    assert.ok(!BANNED.test(v), `${k}: banned word ("${v}")`);
  }
});
