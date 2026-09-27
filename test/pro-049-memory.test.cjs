// Phase 4 of 0.4.9 (decision D5): the Memory screen's full fix and the
// vocabulary sweep. Topics are real notes in four kinds, the stage follows the
// theme, the engine controls and the index folder moved to Settings → Memory,
// and no PRO string says floor, hive, palace or semantic memory any more.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PRO = 'src/renderer/src/components/pro';
const M = loadTs(`${PRO}/memoryTopics.ts`);
const BANNED = /\b(harness config|hive|floor|spawn|spawned|spawns|palace|awaiting|starting up|block tools|semantic memory|pty)\b/i;

const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
const locale = (l) => JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`));

/* ───────────────────────────── the topic model ────────────────────────── */

const JANITORED = [
  '# Memory — Angela (angela)', '', '_Append durable facts, decisions, and context below._', '',
  '## 📌 Durable facts (pinned — never condensed)', '',
  'Role: Community owner. Outputs to hive/shared/community/.',
  '- **Relay auth:** device-signed requests; resolveActor lacks an org filter.',
  '',
  '## 🗜 Condensed history', '',
  '**Role & Outputs:** Community owner. Triage: labels only.', '',
  'Second paragraph without a lead, about the PR queue and its median.', '',
  '## Recent', '',
  '## 2026-09-01 10:29Z — Five linking comments posted', 'Same disclosure line as the 34.', '',
  '## 2026-08-24 (2nd task) — Drafted two replies', 'Both went out.'
].join('\n');

const PLAIN = ['# Memory — Jim (jim)', '', '## 2026-08-21 — Relay auth', 'Device-signed requests. resolveActor lacks an org filter in both copies.'].join('\n');

test('a janitored memory.md yields the three memory kinds, one note per fact, paragraph and dated section', () => {
  const notes = M.parseMemoryNotes('angela', JANITORED);
  const kinds = notes.map((n) => n.kind);
  assert.deepEqual(kinds, ['pinned', 'pinned', 'summaries', 'summaries', 'recent', 'recent']);
  assert.equal(notes[0].label, 'Role: Community owner');
  assert.equal(notes[0].line, 7, 'a pinned fact points at its own line');
  assert.equal(notes[1].label, 'Relay auth', 'a bold lead is the label the writer chose');
  assert.equal(notes[2].label, 'Role & Outputs');
  assert.equal(notes[4].label, 'Five linking comments posted');
  assert.equal(notes[4].date, '2026-09-01');
  assert.equal(notes[5].label, 'Drafted two replies', 'the (2nd task) tag and the dash are not part of the label');
  assert.ok(!notes.some((n) => /durable facts|condensed history/i.test(n.label)), 'a region heading is never a topic');
  assert.ok(notes[4].body.startsWith('## 2026-09-01'), 'the note keeps the verbatim markdown for the sheet');
});

test('a file with no sections still yields one recent note, and the seed alone yields none', () => {
  assert.equal(M.parseMemoryNotes('x', '# Memory — X (x)\n\n_Append durable facts, decisions, and context below._\n').length, 0);
  const one = M.parseMemoryNotes('x', '# Memory — X (x)\n\n- Workspace is on branch main.\n');
  assert.equal(one.length, 1); assert.equal(one[0].kind, 'recent');
});

test('the four kinds map to the four wings, and topics merge across agents by kind and label', () => {
  assert.deepEqual(M.MEMORY_KINDS, ['pinned', 'summaries', 'recent', 'deliverables']);
  assert.deepEqual(Object.keys(M.WING_OF).sort(), [...M.MEMORY_KINDS].sort());
  assert.match(M.WING_OF.pinned, /Durable facts/); assert.match(M.WING_OF.summaries, /Condensed history/);
  assert.equal(M.WING_OF.recent, '## Recent'); assert.match(M.WING_OF.deliverables, /shared/);
  const topics = M.buildTopics({ angela: JANITORED, jim: PLAIN });
  const relay = topics.find((t) => /relay auth/i.test(t.label) && t.kind === 'pinned');
  assert.ok(relay, 'the pinned fact is a topic');
  assert.deepEqual(relay.agentIds, ['angela']);
  const jimRelay = topics.find((t) => /relay auth/i.test(t.label) && t.kind === 'recent');
  assert.ok(jimRelay && jimRelay.agentIds.includes('jim'), 'a dated section is a recent topic');
  const shared = M.buildTopics({ a: '## 2026-09-01 — Relay auth\nx', b: '## 2026-09-02 — relay auth\ny' });
  assert.equal(shared.length, 1); assert.equal(shared[0].weight, 2); assert.equal(shared[0].date, '2026-09-02');
  assert.equal(topics[0].weight >= topics[topics.length - 1].weight, true, 'shared first');
});

test('deliverables come from the shared and research folders and are held by the agents whose notes name the file', () => {
  assert.deepEqual(M.DELIVERABLE_DIRS, ['shared', 'research']);
  const files = M.foldDeliverables([
    { dir: 'shared', entries: [{ name: 'community', isDir: true, size: 0, mtime: 5 }, { name: '.DS_Store', isDir: false, size: 1, mtime: 9 }] },
    { dir: 'shared/community', entries: [{ name: 'DIGEST.md', isDir: false, size: 2048, mtime: 1756800000000 }] }
  ]);
  assert.deepEqual(files.map((f) => f.rel), ['shared/community/DIGEST.md'], 'folders and dotfiles are not deliverables');
  const topics = M.buildTopics({ angela: 'Outputs go to DIGEST.md every run.', jim: 'nothing' }, files);
  const d = topics.find((t) => t.kind === 'deliverables');
  assert.equal(d.label, 'DIGEST.md'); assert.deepEqual(d.agentIds, ['angela']); assert.equal(d.file.rel, 'shared/community/DIGEST.md');
  assert.equal(M.deliverablePathOf('/h/', 'shared/x.md'), '/h/hive/shared/x.md');
  assert.equal(M.memoryPathOf('/h', 'jim'), '/h/hive/agents/jim/memory.md');
});

test('the filter answers kind, whose and the query together', () => {
  const topics = M.buildTopics({ angela: JANITORED, jim: PLAIN });
  assert.ok(M.filterTopics(topics, { kind: 'pinned', whose: null, q: '' }).every((t) => t.kind === 'pinned'));
  assert.ok(M.filterTopics(topics, { kind: 'all', whose: 'jim', q: '' }).every((t) => t.agentIds.includes('jim')));
  assert.equal(M.filterTopics(topics, { kind: 'all', whose: null, q: 'median' }).length, 1, 'the query reaches the text, not only the label');
  assert.equal(M.GRAPH_TOPIC_CAP, 24);
});

/* ───────────────────────────── the screen ─────────────────────────────── */

test('the stage reads tokens at draw time and restarts its loop when the theme flips', () => {
  const src = strip(read(`${PRO}/MemoryScreen.tsx`));
  assert.match(src, /import \{ useAppTheme \} from '@\/design\/theme'/);
  assert.match(src, /const theme = useAppTheme\(\);/);
  // 0.4.10: the stage gained two more drawn kinds, so the glyph sheet joined
  // the deps. Same guarantee as before (a theme flip restarts the loop) plus
  // the new one: the sheet the flip repaints is a dep too, or the first frame
  // after a switch would blit yesterday's palette.
  assert.match(src, /\}, \[accentOf, charOf, glyphs, portraits, t, theme\]\);/, 'the theme and the glyph sheet are deps of the draw effect');
  assert.match(src, /const glyphs = useGlyphs\(theme, \(\) => bump\(\(n\) => n \+ 1\)\);/, 'the ticket and memory marks are rasterised per theme, the way the sprites are');
  assert.ok(src.includes('getPropertyValue(k)'), 'colours come from the kit tokens on each frame');
  assert.ok(src.includes("prefers-reduced-motion"), 'the reduced motion guard survives');
  assert.ok(src.includes('paintPortrait(ctx, c, scale)') && src.includes('ctx.drawImage(img'), 'agents are their sprites');
  assert.ok(src.includes('ctx.drawImage(mark'), 'a ticket and a memory node wear a drawn mark, never a letter');
  assert.ok(!/#[0-9a-fA-F]{3,6}\b/.test(src.replace(/'#[^']*'/g, '')), 'no literal colour');
});

test('topics are the real notes in four kinds; the engine control and the index path are gone from the screen', () => {
  const src = strip(read(`${PRO}/MemoryScreen.tsx`));
  assert.match(src, /buildTopics\(memories, files\)/);
  assert.match(src, /filterTopics\(topics, \{ kind, whose, q \}\)/);
  assert.match(src, /MEMORY_KINDS\.map\(\(k\) =>/, 'the Kind filter is drawn from the four kinds');
  assert.match(src, /t\(`pro\.memory\.kind\.\$\{k\}`\)/);
  assert.match(src, /t\('pro\.memory\.openNote'\)/, 'the panel offers Open the source note');
  assert.match(src, /window\.cth\.revealPath\(abs\)/, 'the note sheet reveals the real file');
  assert.match(src, /window\.cth\.readFile\(hiveRoot, file\.rel\)/, 'a text deliverable is read through the root-confined door');
  assert.match(src, /<MarkdownPreview source=\{n\.body\}/, 'a note is shown in place, the way the Classic memory tab shows the file');
  for (const gone of ['SemanticRow', 'palacePath', 'semanticMemory: v', 'embeddingModel: m', 'pro.memory.semantic', 'pro.memory.palace', 'pro.memory.recentTopics', 'Switch', 'SelectBox']) {
    assert.ok(!src.includes(gone), `MemoryScreen still carries ${gone}`);
  }
  assert.match(src, /new CustomEvent\('cth:open-settings', \{ detail: \{ section: 'Memory & Knowledge' \} \}\)/, 'the Settings button deep links to the memory section');
  assert.match(src, /window\.cth\.textSearch\(/); assert.match(src, /window\.cth\.searchMemory\(query, whose \?\? undefined\)/);
});

test('D1: the technical rendering adds the note path and the raw wing name; the simple one shows kind words only', () => {
  const src = strip(read(`${PRO}/MemoryScreen.tsx`));
  assert.match(src, /const technical = useTechnical\(\);/);
  assert.match(src, /technical \? `\$\{t\(`pro\.memory\.kindHint\.\$\{k\}`\)\} · \$\{WING_OF\[k\]\}` : t\(`pro\.memory\.kindHint\.\$\{k\}`\)/, 'the raw wing rides in the tooltip, technical only');
  assert.match(src, /\{technical && <code[^>]*>\{pathOf\(selTopic\)\}<\/code>\}/, 'the file path under the topic, technical only');
  assert.ok(!/\.audience\b/.test(src));
});

test('Settings → Memory owns the engine: on/off, the model, the state and the index folder, reachable from the PRO page', () => {
  const modal = strip(read('src/renderer/src/components/SettingsModal.tsx'));
  const block = modal.slice(modal.indexOf("activeSection === 'Memory & Knowledge'"), modal.indexOf("activeSection === 'Connections'"));
  assert.match(modal, /stage\(\{ embeddingModel: m \} as Partial<HarnessConfig>\)/);
  assert.match(modal, /window\.cth\.memoryStatus\(\)\.then\(\(s\) => \{ if \(alive\) setMemStatus\(s\); \}\)/);
  assert.match(block, /onChange=\{\(e\) => saveEmbedModel\(/, 'the model select writes the config');
  assert.match(block, /data-testid="memory-state"/, 'the state line');
  assert.match(block, /window\.cth\.revealPath\(memFolder\)/, 'the folder opens in the OS file browser');
  assert.match(block, /t\('settings\.memory\.folder'\)/);
  assert.match(modal, /'Memory & Knowledge'/);
  const page = strip(read(`${PRO}/SettingsScreen.tsx`));
  assert.match(page, /initialSection=\{section\}/, 'the PRO page opens on the section a deep link asked for');
  const shell = strip(read(`${PRO}/ProShell.tsx`));
  assert.match(shell, /setSettingsSection\(\(e as CustomEvent<\{ section\?: SettingsSection \}>\)\.detail\?\.section\)/);
});

/* ───────────────────────────── the vocabulary sweep ───────────────────── */

test('the routed channel names the orchestrator, and names it from the roster', () => {
  const src = strip(read(`${PRO}/InboxScreen.tsx`));
  assert.match(src, /import \{ useResolvedGodName \} from '@\/hooks\/useResolvedGodName'/);
  // 0.4.9 phase 3: the channel that was "Agents" is now "All routed messages",
  // because the list has a row PER AGENT beside it and two things called Agents
  // was half of "I do not know what does what". The guarantee under the rename
  // is unchanged: the row and the thread header both name the orchestrator from
  // the roster, never in the copy.
  assert.equal((src.match(/t\('pro\.inbox\.routedSub', \{ god: godName \}\)/g) || []).length, 2, 'the row and the thread header both name the orchestrator');
  assert.match(src, /t\('pro\.inbox\.routed'\)/); assert.match(src, /t\('pro\.inbox\.agentsEmpty'\)/);
  // The word itself stays out of the keys as well as the copy.
  assert.ok(!/pro\.inbox\.floor/.test(src));
  const caps = strip(read(`${PRO}/CapabilitiesScreen.tsx`));
  for (const k of ['workspaceDefault', 'workspaceHint', 'followsWorkspace', 'useWorkspace']) assert.match(caps, new RegExp(`pro\\.caps\\.${k}`));
  assert.ok(!/pro\.caps\.(floorDefault|floorHint|followsFloor|useFloor)/.test(caps));
});

test('KNOWN_VOCAB is empty and no pro.* string, in any locale, carries a banned word', () => {
  assert.match(read('test/pro-fence.test.cjs'), /const KNOWN_VOCAB = \[\];/);
  for (const l of ['en', 'zh-CN', 'ar']) {
    const hits = flat(locale(l)).filter(([k, v]) => k.startsWith('pro.') && typeof v === 'string' && BANNED.test(v)).map(([k]) => k);
    assert.deepEqual(hits, [], `${l}: banned words in ${hits.join(', ')}`);
  }
  for (const gone of ['pro.inbox.floor', 'pro.inbox.floorSub', 'pro.inbox.floorEmpty', 'pro.caps.floorHint', 'pro.caps.useFloor', 'pro.memory.palace', 'pro.memory.semantic', 'pro.memory.recentTopics']) {
    assert.ok(!new Map(flat(locale('en'))).has(gone), `${gone} still in en`);
  }
});

test('no PRO surface writes a banned word into JSX text, a title or a placeholder outside t()', () => {
  for (const f of fs.readdirSync(path.join(ROOT, PRO)).filter((f) => f.endsWith('.tsx'))) {
    const src = strip(read(`${PRO}/${f}`));
    // JSX text is what sits between a closing `>` of a tag and the next `<`;
    // a segment with code punctuation in it is TypeScript, not copy.
    const jsxText = [...src.matchAll(/[\w"'}\]/]>([^<>{}();=]+)</g)].map((m) => m[1]).filter((s) => BANNED.test(s));
    const attrs = [...src.matchAll(/(?:title|placeholder|aria-label)="([^"]+)"/g)].map((m) => m[1]).filter((s) => BANNED.test(s));
    assert.deepEqual([...jsxText, ...attrs], [], `${f} says a banned word outside t()`);
  }
});

test('every new string exists in all three locales, in one shape, and the English carries no dash', () => {
  const en = new Map(flat(locale('en')));
  const dash = /—|–| - /;
  for (const [k, v] of en) if (/^(pro\.memory|pro\.inbox\.agents|pro\.caps\.(workspace|follows|use)|settings\.memory)/.test(k)) assert.ok(!dash.test(v), `${k} carries a dash: ${v}`);
  for (const l of ['zh-CN', 'ar']) {
    const other = new Map(flat(locale(l)));
    for (const fam of ['pro.memory.', 'pro.inbox.', 'pro.caps.', 'pro.autos.', 'settings.memory.']) {
      const a = [...en.keys()].filter((k) => k.startsWith(fam)).sort();
      const b = [...other.keys()].filter((k) => k.startsWith(fam)).sort();
      assert.deepEqual(b, a, `${l}: ${fam} keys differ from en`);
      // The strings this phase wrote must be translated, not copied. A value
      // that is only placeholders and units ("{{path}} · {{kb}} KB") has
      // nothing to translate; a proper noun elsewhere in the family (Slack)
      // is not this phase's to judge.
      const mine = /^(pro\.memory\.|pro\.inbox\.agents|pro\.caps\.(workspaceDefault|workspaceHint|followsWorkspace|useWorkspace|noSkills)|pro\.autos\.(quietHint|modeBlurb\.strict)|settings\.memory\.)/;
      for (const k of a) if (mine.test(k) && /[A-Za-z]{3,}/.test(en.get(k).replace(/\{\{[^}]+\}\}/g, ''))) assert.notEqual(other.get(k), en.get(k), `${l}: ${k} is untranslated`);
    }
  }
  const src = strip(read(`${PRO}/MemoryScreen.tsx`));
  for (const m of src.matchAll(/\bt\('([^']+)'/g)) for (const l of ['en', 'zh-CN', 'ar']) assert.ok(new Map(flat(locale(l))).has(m[1]), `${m[1]} in ${l}`);
  for (const k of M.MEMORY_KINDS) for (const l of ['en', 'zh-CN', 'ar']) { const d = new Map(flat(locale(l))); assert.ok(d.has(`pro.memory.kind.${k}`) && d.has(`pro.memory.kindHint.${k}`), `${k} kind strings in ${l}`); }
});
