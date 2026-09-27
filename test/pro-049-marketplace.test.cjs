// 0.4.9 phase 6a, founder 3 Sep 2026: the capabilities marketplace.
//
// He opened Capabilities, found a screen that assumes he already knows what to
// install, and said the marketplace should be what he lands on. Three asks, and
// the trap under each:
//
//   "marketplace is the default        A default is one line of state, and the
//    view of the Capabilities          cheap way to fake it is a tab that draws
//    screen"                           first without being the initial value.
//                                      The other half is the search box: one
//                                      field over three views filters the wrong
//                                      list the moment a tab is added.
//
//   "a curated catalog of skills,      Two lies are possible here and both are
//    tools, MCP servers and            worse than shipping nothing. An entry
//    plugins, shipped inside the       that names a thing which does not exist,
//    app, installed through the        and an entry whose button claims a door
//    doors that already exist"         nobody wrote. So every id is pinned to a
//                                      real catalog row or a real GitHub folder,
//                                      every window.cth call is pinned to a
//                                      method that is actually in the preload,
//                                      and the two kinds the app CANNOT install
//                                      say so instead of drawing a dead button.
//
//   "a tab for what is already         Installed must be READ, never inferred.
//    installed"                        And the marketplace has to agree with it:
//                                      a card offering Install for something
//                                      already on the machine is the exact
//                                      defect this phase exists to remove. The
//                                      hard half is that the installer names a
//                                      skill's folder from the source path while
//                                      a scan reports the SKILL.md name, so
//                                      matching on one of them alone misses.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const PRO = 'src/renderer/src/components/pro';
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const caps = strip(read(`${PRO}/CapabilitiesScreen.tsx`));
const flat = caps.replace(/\s+/g, ' ');
const preload = read('src/preload/index.ts');

const M = loadTs('src/shared/marketplace.ts');
const MCP = loadTs('src/shared/mcpCatalog.ts');
const TOOLS = loadTs('src/shared/toolCatalog.ts');

const DASH = /[—–]|\s-\s/;
const KIND_DOOR = { skill: 'skills:install', mcp: 'config:mcp', tool: 'tool:command', plugin: 'plugin:command' };

/* ---- 1. the catalog is real ----------------------------------------------- */

test('every entry has the fields its kind needs, and the ids are unique', () => {
  assert.ok(M.MARKETPLACE.length >= 12, `only ${M.MARKETPLACE.length} entries`);
  const ids = M.MARKETPLACE.map((e) => e.id);
  assert.equal(new Set(ids).size, ids.length, 'two entries share an id');
  const kinds = new Set(M.MARKETPLACE.map((e) => e.kind));
  for (const k of ['skill', 'mcp', 'tool', 'plugin']) assert.ok(kinds.has(k), `the founder asked for ${k}s and there are none`);
  for (const e of M.MARKETPLACE) {
    assert.match(e.id, new RegExp(`^${e.kind}:`), `${e.id} is not namespaced by its kind`);
    for (const field of ['name', 'blurb', 'source']) {
      assert.equal(typeof e[field], 'string', `${e.id}.${field}`);
      assert.ok(e[field].trim().length > 0, `${e.id}.${field} is blank`);
    }
    assert.ok(M.MARKET_GROUPS.includes(e.group), `${e.id} sits in group ${e.group}, which has no label`);
    // A blurb is a sentence a person can act on, not a category word.
    assert.ok(e.blurb.length > 20 && e.blurb.endsWith('.'), `${e.id}: "${e.blurb}" is not a sentence`);
  }
  // A group with a locale string and no entries is a heading for nothing.
  for (const g of M.MARKET_GROUPS) {
    assert.ok(M.MARKETPLACE.some((e) => e.group === g), `group ${g} has no entries`);
  }
});

test('no description carries a dash, because the house style has none', () => {
  for (const e of M.MARKETPLACE) {
    assert.ok(!DASH.test(e.blurb), `${e.id}: dash in "${e.blurb}"`);
    assert.ok(!DASH.test(e.name), `${e.id}: dash in the name "${e.name}"`);
    assert.ok(!DASH.test(e.source), `${e.id}: dash in the source "${e.source}"`);
    assert.ok(!/coming soon|placeholder|lorem|TODO/i.test(e.blurb), `${e.id} is a placeholder`);
  }
});

test('no entry claims an install door that does not exist', () => {
  const doors = new Set(['skills:install', 'config:mcp', 'tool:command', 'plugin:command']);
  for (const e of M.MARKETPLACE) {
    assert.ok(doors.has(e.door), `${e.id} invents the door ${e.door}`);
    assert.equal(e.door, KIND_DOOR[e.kind], `${e.id} is a ${e.kind} going through ${e.door}`);
  }
});

test('every MCP entry names a server the app already ships, so turning it on writes a consent the launch path reads', () => {
  const known = new Set(MCP.MCP_CATALOG.map((e) => e.id));
  const mcpEntries = M.MARKETPLACE.filter((e) => e.kind === 'mcp');
  assert.ok(mcpEntries.length > 0);
  for (const e of mcpEntries) {
    assert.ok(known.has(e.ref), `${e.id} points at ${e.ref}, which is not in MCP_CATALOG`);
    assert.equal(MCP.mcpCatalogEntry(e.ref).id, e.ref);
  }
  // The three servers the catalog itself flags as an assumed package are left
  // out on purpose. They stay reachable in the grant sheet on the same screen.
  for (const guessed of ['db', 'email-calendar', 'search-with-key']) {
    assert.ok(!mcpEntries.some((e) => e.ref === guessed), `${guessed} is recommended by name while its package is unverified`);
  }
});

test('every skill entry is a GitHub folder the installer can actually walk', () => {
  const skills = M.MARKETPLACE.filter((e) => e.kind === 'skill');
  assert.ok(skills.length > 0);
  for (const e of skills) {
    assert.match(e.url, /^https:\/\/github\.com\/[^/]+\/[^/]+\/tree\/[^/]+\/.+$/, `${e.id}: ${e.url} is not a folder skills:install can parse`);
    const folder = M.skillFolder(e);
    assert.ok(folder, `${e.id}: no folder name, so the install would be refused`);
    // The same test main/skills.ts applies before it creates a directory.
    assert.match(folder, /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/, `${e.id}: ${folder} is a name the installer refuses`);
  }
  // Two entries landing in one folder would fight over the same install.
  const folders = skills.map((e) => M.skillFolder(e));
  assert.equal(new Set(folders).size, folders.length, 'two skills install into the same folder');
});

test('every engine entry is a tool catalog row with one command that is the same on every platform', () => {
  const catalog = new Map(TOOLS.toolCatalog().map((x) => [x.id, x]));
  const engines = M.MARKETPLACE.filter((e) => e.kind === 'tool');
  assert.ok(engines.length > 0);
  for (const e of engines) {
    const row = catalog.get(e.ref);
    assert.ok(row, `${e.id} points at ${e.ref}, which is not in toolCatalog()`);
    // The founder's 5a decision: this page never shows a prerequisite.
    assert.notEqual(row.kind, 'prerequisite', `${e.id} drags a prerequisite back onto this page`);
    assert.equal(e.name, row.label, `${e.id} prints "${e.name}" while the catalog says "${row.label}"`);
    assert.ok(row.install.posix, `${e.id} offers Copy command with nothing to copy`);
    assert.equal(row.install.posix, row.install.win32, `${e.id} copies a command that is wrong on one platform`);
  }
});

test('every plugin entry builds the command from the one marketplace it comes from', () => {
  const plugins = M.MARKETPLACE.filter((e) => e.kind === 'plugin');
  assert.ok(plugins.length > 0);
  assert.equal(M.PLUGIN_MARKETPLACE, 'claude-plugins-official');
  for (const e of plugins) {
    assert.equal(M.pluginCommand(e), `/plugin install ${e.name}@claude-plugins-official`);
    assert.match(e.url, /^https:\/\/github\.com\/anthropics\/claude-plugins-official\/tree\/main\/plugins\//, `${e.id}: ${e.url}`);
    assert.ok(e.url.endsWith(`/${e.name}`), `${e.id}: the page and the command name different plugins`);
  }
  // A command is built once or it drifts from the note that explains it.
  assert.equal(M.pluginCommand({ kind: 'skill', name: 'x' }), null, 'only a plugin gets a plugin command');
});

/* ---- 2. installed is read, and the marketplace agrees with it -------------- */

test('a skill counts as installed by its folder as well as by its name', () => {
  const docx = M.MARKETPLACE.find((e) => e.id === 'skill:docx');
  // The installer names the folder from the source path; the scan reports the
  // SKILL.md name. Matching on the name alone misses every skill whose
  // frontmatter says something else, and the card then offers Install again.
  const byFolder = { skills: [{ name: 'Word documents', path: '/Users/x/.claude/skills/docx' }], mcp: [] };
  assert.ok(M.entryInstalled(docx, byFolder), 'the folder the installer made is not recognised');
  const byName = { skills: [{ name: 'DOCX', path: '/Users/x/.claude/skills/anthropic-docx' }], mcp: [] };
  assert.ok(M.entryInstalled(docx, byName), 'the frontmatter name is not recognised');
  assert.ok(!M.entryInstalled(docx, { skills: [{ name: 'pdf', path: '/Users/x/.claude/skills/pdf' }], mcp: [] }));
  assert.equal(M.installedSkillFor(docx, byFolder.skills).path, '/Users/x/.claude/skills/docx');
});

test('a kind the app cannot read back is never claimed installed', () => {
  const state = { skills: [], mcp: [] };
  for (const e of M.MARKETPLACE.filter((x) => x.kind === 'tool' || x.kind === 'plugin')) {
    assert.equal(M.entryInstalled(e, state), false, `${e.id} claims a state nothing records`);
  }
  // An MCP entry is installed exactly when its id resolves on, nothing softer.
  const fetch = M.MARKETPLACE.find((e) => e.id === 'mcp:fetch');
  assert.ok(M.entryInstalled(fetch, { skills: [], mcp: ['fetch'] }));
  assert.ok(!M.entryInstalled(fetch, { skills: [], mcp: ['git'] }));
});

test('the servers the Installed tab lists are the ones the launch path would write', () => {
  const ids = M.MARKETPLACE.filter((e) => e.kind === 'mcp').map((e) => e.ref);
  const allOff = Object.fromEntries(MCP.MCP_CATALOG.map((e) => [e.id, { enabled: false }]));
  assert.deepEqual(M.mcpInstalledIds(allOff, undefined, ['jim']), [], 'everything off still lists servers');
  // One agent switching a server on for itself is an install, even though the
  // workspace default stayed off. The launch path writes it, so the tab shows it.
  const own = M.mcpInstalledIds(allOff, { jim: { fetch: { enabled: true } } }, ['jim']);
  assert.deepEqual(own, ['fetch']);
  // And an agent id nobody passed cannot conjure one.
  assert.deepEqual(M.mcpInstalledIds(allOff, { jim: { fetch: { enabled: true } } }, []), []);
  const seeded = M.mcpInstalledIds(MCP.defaultMcpDefaults(), undefined, []);
  for (const e of MCP.MCP_CATALOG) {
    assert.equal(seeded.includes(e.id), e.defaultEnabled, `${e.id} disagrees with the shipped default`);
  }
  assert.ok(ids.every((id) => MCP.mcpCatalogEntry(id)), 'a marketplace server that is not resolvable cannot be listed');
});

test('search and the kind filter cut the catalog without losing the grouping', () => {
  const all = M.filterMarket('', 'all');
  assert.equal(all.length, M.MARKETPLACE.length);
  assert.equal(M.filterMarket('', 'plugin').every((e) => e.kind === 'plugin'), true);
  const hit = M.filterMarket('powerpoint', 'all');
  assert.deepEqual(hit.map((e) => e.id), ['skill:pptx'], 'search reads the blurb, not just the name');
  assert.deepEqual(M.filterMarket('zzzzz', 'all'), []);
  assert.deepEqual(M.groupMarket([]), [], 'a search that matched nothing prints no headings');
  const groups = M.groupMarket(all);
  assert.deepEqual(groups.map((g) => g.group), M.MARKET_GROUPS, 'the groups lost their shipped order');
  assert.equal(groups.reduce((n, g) => n + g.entries.length, 0), all.length, 'an entry fell out of every group');
  const counts = M.marketCounts();
  assert.equal(counts.skill + counts.mcp + counts.tool + counts.plugin, counts.all);
});

/* ---- 3. the screen ------------------------------------------------------- */

test('the marketplace is the DEFAULT view, not merely the first tab drawn', () => {
  assert.match(caps, /const \[view, setView\] = useState<View>\('market'\);/, 'the landing view is a piece of state and it is the marketplace');
  assert.match(flat, /tabs=\{\[ \{ value: 'market', label: t\('pro\.market\.tab\.market'\) \}, \{ value: 'installed', label: t\('pro\.market\.tab\.installed'\) \}, \{ value: 'agents', label: t\('pro\.market\.tab\.agents'\) \} \]\}/);
  assert.match(caps, /<Tabs value=\{view\} ariaLabel=\{t\('pro\.market\.tabsLabel'\)\} onChange=\{setView\}/);
  assert.match(caps, /\{view === 'market' && \(/);
  // The three columns this screen used to be are kept, one tab along. Losing
  // them would trade one missing answer for another.
  assert.match(caps, /\{view === 'agents' && \(/);
  // One search box over three lists filters the wrong one unless the
  // placeholder and the consumer both follow the view.
  assert.match(caps, /placeholder=\{view === 'market' \? t\('pro\.market\.search'\) : t\('pro\.caps\.search'\)\}/);
  assert.match(flat, /<Marketplace q=\{q\} kind=\{kind\}/);
  assert.match(flat, /<Installed q=\{q\}/);
});

test('every door the marketplace reaches for is a method the preload actually exposes', () => {
  const called = [...caps.matchAll(/window\.cth\.([A-Za-z0-9_]+)\(/g)].map((m) => m[1]);
  assert.ok(called.length >= 6, `parser found only ${called.length} calls; the guard is disarmed`);
  for (const name of new Set(called)) {
    assert.ok(new RegExp(`\\n  ${name}:`).test(preload), `window.cth.${name} is not in the preload`);
  }
  // The four doors, named. A fifth would have to be written before it is offered.
  assert.match(caps, /await window\.cth\.skillsInstall\(e\.url, e\.name\)/, 'a skill installs over the IPC the kit already had');
  assert.match(flat, /await window\.cth\.updateConfig\(\{ mcpDefaults: \{ \.\.\.\(config\.mcpDefaults \?\? \{\}\), \[e\.ref\]: \{ enabled: true \} \} \}\)/, 'a server is turned on through the consent the launch path reads');
  assert.match(caps, /void window\.cth\.copyToClipboard\(text\)\.then\(\(\) => proToast\(t\('pro\.market\.copiedToast'\)\)\)/);
  assert.match(caps, /void window\.cth\.skillsReveal\(/);
  // No probe. The machine check stayed under Settings (founder, 5a).
  assert.ok(!/toolsStatus/.test(caps), 'the marketplace probes the machine');
  assert.match(caps, /new CustomEvent\('cth:open-settings', \{ detail: \{ section: 'Prerequisites' \} \}\)/);
});

test('an entry already installed offers what you do next, never a dead Install', () => {
  assert.match(caps, /const have = entryInstalled\(e, state\);/);
  // Skill: the folder it landed in, not Install again.
  assert.match(flat, /e\.kind === 'skill' \? \(have \? <Btn size="sm" onClick=\{\(\) => \{ if \(local\) void window\.cth\.skillsReveal\(local\.path\); \}\}>\{t\('pro\.market\.openFolder'\)\}<\/Btn> : <Btn size="sm" kind="primary" disabled=\{busy === e\.id\} onClick=\{\(\) => \{ void install\(e\); \}\}>/);
  // Server already on: the grant sheet, which is the next real decision.
  assert.match(flat, /e\.kind === 'mcp' \? \(have \? <Btn size="sm" onClick=\{\(\) => \{ const c = e\.ref && mcpCatalogEntry\(e\.ref\); if \(c\) onGrant\(c\); \}\}>\{t\('pro\.market\.chooseAgents'\)\}<\/Btn> : <Btn size="sm" kind="primary"/);
  assert.match(caps, /\{have && <Chip tone="ok">\{entry\.kind === 'mcp' \? t\('pro\.market\.on'\) : t\('pro\.market\.installed'\)\}<\/Chip>\}/, 'the state is a chip, never a coloured edge');
  // The two kinds the app cannot install say what the button does and where the
  // command goes, rather than drawing an Install that installs nothing.
  assert.match(flat, /note=\{e\.kind === 'tool' \? t\('pro\.market\.engineNote'\) : e\.kind === 'plugin' \? t\('pro\.market\.pluginNote'\) : undefined\}/);
  assert.match(caps, /\{command && <code /, 'the command is printed, so nobody has to trust the copy button');
  assert.ok(!/pluginInstall|installPlugin|engineInstall/.test(caps), 'an install door nobody wrote');
});

test('the Installed tab reads real state and its empty is the numbered steps', () => {
  assert.match(caps, /const mcpOn = useMemo\(\(\) => mcpInstalledIds\(config\?\.mcpDefaults, config\?\.agentMcp, agentIds\)/, 'the servers are resolved, not guessed');
  assert.match(caps, /window\.cth\.skillsLocal\(cwd \|\| undefined\)/, 'the skills are scanned, not guessed');
  assert.match(caps, /const \[rows, setRows\] = useState<LoadedSkill\[\] \| null>\(null\);/, 'null until the scan answers');
  // Scanning is not the same state as having nothing, and only one of them
  // deserves instructions.
  assert.match(caps, /if \(skills === null\) return <Empty>\{t\('pro\.market\.scanning'\)\}<\/Empty>;/);
  assert.match(caps, /if \(skills\.length === 0 && servers\.length === 0\) \{/);
  assert.match(flat, /<SetupEmpty icon="capabilities" title=\{t\('pro\.market\.empty\.title'\)\} lead=\{t\('pro\.market\.empty\.lead'\)\} steps=\{\[t\('pro\.market\.empty\.s1'\), t\('pro\.market\.empty\.s2'\), t\('pro\.market\.empty\.s3'\), t\('pro\.market\.empty\.s4'\)\]\}/);
  assert.match(flat, /action=\{\{ label: t\('pro\.market\.empty\.action'\), run: onGoMarket \}\}/, 'the way out lands on the marketplace');
  // A filter matching nothing is NOT having nothing installed.
  assert.match(caps, /\{shownSkills\.length === 0 && shownServers\.length === 0 && <Empty>\{t\('pro\.market\.noMatch'\)\}<\/Empty>\}/);
  assert.match(caps, /const servers = MCP_CATALOG\.filter\(\(e\) => mcpOn\.includes\(e\.id\)\);/);
  assert.match(caps, /who=\{agentsWithMcp\(e, agentIds, config\?\.mcpDefaults, config\?\.agentMcp\)\}/, 'the row of agents on an installed server is the resolved fact');
});

test('the kit only: shipped icons, kit tokens, sprites for agents', () => {
  assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(caps), 'a hex colour instead of a token');
  for (const net of ['<img', 'fetch(', 'http://', 'https://cdn']) {
    assert.ok(!caps.includes(net), `the marketplace reaches for ${net}; the catalog ships in the file`);
  }
  assert.match(caps, /<Portrait agent=\{a\} size=\{20\} \/>/, 'agents are sprites');
  assert.ok(!/initials/i.test(caps));
  assert.match(caps, /border: '1px solid var\(--cth-ink-300\)'/, 'one even border per card');
  assert.ok(!/borderBottom: '2px|borderLeft: '[2-9]|borderInlineStart: '[2-9]/.test(caps), 'a thicker edge on one side');
});

/* ---- 4. strings ---------------------------------------------------------- */

test('every marketplace string exists in the three locales, with no dash and no banned word', () => {
  const flatten = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flatten(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, new Map(flatten(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
  const keys = new Set([...caps.matchAll(/\bt\(\s*'(pro\.market\.[^']+)'/g)].map((m) => m[1]));
  // The interpolated ones the parser cannot see.
  for (const g of M.MARKET_GROUPS) keys.add(`pro.market.group.${g}`);
  for (const k of ['skill', 'mcp', 'tool', 'plugin']) { keys.add(`pro.market.kind.${k}`); keys.add(`pro.market.filter.${k}`); }
  assert.ok(keys.size > 30, `parser found only ${keys.size} keys; the guard is disarmed`);
  // The same fence test/pro-fence.test.cjs holds the locale files to, applied
  // to the key names as well, because a key is read by whoever edits next.
  const banned = /\b(harness config|hive|floor|spawn|spawned|spawns|palace|awaiting|starting up|block tools|semantic memory|pty)\b/i;
  for (const k of keys) {
    assert.ok(!banned.test(k), `${k}: a banned word in the KEY`);
    for (const l of Object.keys(locales)) {
      const v = locales[l].get(k);
      assert.equal(typeof v, 'string', `${k} missing from ${l}`);
      assert.ok(v.trim().length > 0, `${k} is blank in ${l}`);
      assert.ok(!DASH.test(v), `${k} (${l}) carries a dash: "${v}"`);
    }
    // Real Chinese and real Arabic, not English parked in a translated key.
    const en = locales.en.get(k);
    if (/[A-Za-z]{4,}/.test(en) && !/^pro\.market\.filter\.mcp$/.test(k)) {
      assert.notEqual(locales['zh-CN'].get(k), en, `${k} is still English in zh-CN`);
      assert.notEqual(locales.ar.get(k), en, `${k} is still English in ar`);
    }
  }
  for (const l of Object.keys(locales)) {
    for (const [k, v] of locales[l]) {
      if (!k.startsWith('pro.market.')) continue;
      assert.ok(!banned.test(v), `${k} (${l}) carries a banned word: "${v}"`);
    }
  }
});
