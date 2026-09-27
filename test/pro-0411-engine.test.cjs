// 0.4.11, founder 5 Sep 2026: "Make the agents show the provider (logo) and
// the model name in the sidebar (the text should show only the first few
// characters if the space is not enough, the logo of the provider can be a
// small 1:1 badge left of the status dot). Similarly find a design that fits
// for the agent cards in the grid, including the orchestrator."
//
// The contract pinned here:
//   1. ONE helper (src/shared/engine.ts) turns an agent's provider and model
//      into words: the catalog's label when the id is in it, a tidied slug
//      when it is not, the provider's own default entry when there is no
//      model, and null only when the catalog has no such entry. Its two name
//      tables cover every member of the AgentProvider union.
//   2. The badge (Engine.tsx) is square, draws the brand mark where one
//      exists (Copilot's was added for this), a monogram where none does,
//      and the terminal glyph for Custom. The line ellipsises from the end.
//   3. The sidebar row draws the model under the name and the badge between
//      the orchestrator chip and the status dot.
//   4. The grid card and the orchestrator card draw the engine line in both
//      renderings; the role sentence trails it in the simple rendering only,
//      the context figure in the technical one only.
//   5. The one new string exists in all three locales and carries no dash.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const ts = require('typescript');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const PRO = 'src/renderer/src/components/pro';

const engineTs = read('src/shared/engine.ts');
const engineTsx = read(`${PRO}/Engine.tsx`);
const sidebar = read(`${PRO}/ProSidebar.tsx`);
const grid = read(`${PRO}/AgentsScreen.tsx`);
const logo = read('src/renderer/src/components/ProviderLogo.tsx');
const providers = read('src/shared/agentProvider.ts');

/** The shared helper, compiled and required, with the catalog import pointed
 *  at the real JSON so the labels under test are the ones the app ships. */
function loadEngine() {
  const out = fs.mkdtempSync(path.join(os.tmpdir(), 'engine-'));
  const src = engineTs.replace("'./modelCatalog.json'", JSON.stringify(path.join(ROOT, 'src/shared/modelCatalog.json')));
  const js = ts.transpileModule(src, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, esModuleInterop: true }
  }).outputText;
  const file = path.join(out, 'engine.js');
  fs.writeFileSync(file, js, 'utf8');
  return require(file);
}

/** Every member of the closed AgentProvider union, read from the type itself. */
function unionMembers() {
  const at = providers.indexOf('export type AgentProvider =');
  const end = providers.indexOf(';', at);
  return [...providers.slice(at, end).matchAll(/\|\s*'([a-z]+)'/g)].map((m) => m[1]);
}

const DASH = /[–—]|\s-\s/;

test('1. the two name tables cover every provider the union names, and no name carries a dash', () => {
  const { ENGINE_NAME, ENGINE_MONOGRAM } = loadEngine();
  const members = unionMembers();
  assert.ok(members.length >= 13, `the union was read (${members.length} members)`);
  for (const p of members) {
    assert.ok(typeof ENGINE_NAME[p] === 'string' && ENGINE_NAME[p].length > 0, `ENGINE_NAME.${p}`);
    assert.ok(typeof ENGINE_MONOGRAM[p] === 'string' && ENGINE_MONOGRAM[p].length === 2, `ENGINE_MONOGRAM.${p} is two characters`);
    assert.ok(!DASH.test(ENGINE_NAME[p]), `${ENGINE_NAME[p]} has no dash`);
  }
  assert.strictEqual(ENGINE_NAME.claude, 'Claude Code');
  assert.strictEqual(ENGINE_NAME.custom, 'Custom');
});

test('1. modelLabel: the catalog label, else the tidied slug, else the default entry, else null', () => {
  const { modelLabel, tidyModelId } = loadEngine();
  // A catalog id reads as its label, bracketed context and all.
  assert.strictEqual(modelLabel('claude', 'claude-sonnet-4-6[1m]'), 'Sonnet 4.6 · 1M');
  assert.strictEqual(modelLabel('gemini', 'flash'), 'Flash');
  // A slug the catalog does not know keeps its meaning, minus the vendor prefix.
  assert.strictEqual(modelLabel('crush', 'openai/gpt-5.5'), 'gpt-5.5');
  assert.strictEqual(modelLabel('claude', 'claude-opus-9'), 'claude-opus-9');
  assert.strictEqual(tidyModelId('openrouter/anthropic/claude-x'), 'claude-x');
  assert.strictEqual(tidyModelId('plain'), 'plain');
  // No model is the CLI's default: the provider's own id-less entry, said the
  // way the picker says it, and null where the catalog has none (custom, and
  // Claude Code, whose picker has no default line).
  assert.strictEqual(modelLabel('codex', undefined), 'CLI default');
  assert.strictEqual(modelLabel('codex', '   '), 'CLI default');
  assert.strictEqual(modelLabel('custom', undefined), null);
  assert.strictEqual(modelLabel('claude', undefined), null);
  // An unset provider is Claude Code, as the store documents.
  assert.strictEqual(modelLabel(undefined, 'claude-haiku-4-5-20251001'), 'Haiku 4.5');
  // Injectable, so a bounded catalog can be exercised too.
  assert.strictEqual(modelLabel('grok', 'x', { grok: [{ id: 'x', label: 'X' }] }), 'X');
});

test('2. the brand marks: Copilot joined the set, and hasBrandMark is exported for the badge', () => {
  assert.match(logo, /^\s+copilot:\n\s+'M23\.922 16\.997C/m, 'the GitHub Copilot mark, as a single path');
  assert.match(logo, /export function hasBrandMark\(provider: AgentProvider\): boolean \{\n\s+return provider in BRAND_PATHS;/);
});

test('2. the badge is square, draws a mark or a monogram, and the line ellipsises from the end', () => {
  assert.match(engineTsx, /export function EngineBadge\(/);
  assert.match(engineTsx, /export function EngineLine\(/);
  assert.match(engineTsx, /export function useEngineWords\(/);
  // 1:1, by construction: one `size` for both edges.
  assert.match(engineTsx, /width: size, height: size, borderRadius: Math\.round\(size \* 0\.29\)/);
  // The mark where there is one, the terminal glyph for Custom, a monogram for the rest.
  assert.match(engineTsx, /const drawn = hasBrandMark\(p\) \|\| p === 'custom';/);
  assert.match(engineTsx, /drawn\s*\? <ProviderLogo provider=\{p\} size=\{Math\.round\(size \* 0\.64\)\} \/>/);
  assert.match(engineTsx, /\{ENGINE_MONOGRAM\[p\]\}/);
  // The line: model first, whatever follows it after a middle dot, and the
  // whole thing clipped with an ellipsis so nothing overflows a narrow column.
  assert.match(engineTsx, /\{after \? `\$\{w\.model\} · \$\{after\}` : w\.model\}/);
  assert.match(engineTsx, /<span style=\{\{ minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' \}\}>\{after/);
  // The words: the label, or the CLI default said in the app's own words;
  // the raw id reaches the tooltip in the technical rendering only.
  assert.match(engineTsx, /const word = label \?\? t\('pro\.agents\.cliDefault'\);/);
  assert.match(engineTsx, /const title = technical && raw && raw !== word \? `\$\{name\} · \$\{word\} · \$\{raw\}` : `\$\{name\} · \$\{word\}`;/);
  assert.ok(!DASH.test(engineTsx.replace(/\/\*[\s\S]*?\*\//g, '')), 'no dash in the drawn copy');
});

test('3. the sidebar row: the model under the name, the badge between the chip and the dot', () => {
  assert.match(sidebar, /import \{ EngineBadge, useEngineWords \} from '\.\/Engine';/);
  const row = sidebar.slice(sidebar.indexOf('function AgentRow('), sidebar.indexOf('function SectionLabel('));
  assert.match(row, /const engine = useEngineWords\(agent\.provider, agent\.model\);/);
  // Name over model, both clipped with an ellipsis (the founder's "first few
  // characters if the space is not enough"). Since the V2 row (0.5.3, F25)
  // the name is line 1 and the model sits on line 2 beside the engine tile.
  assert.match(row, /<span data-agent-name style=\{\{ fontSize: 13, fontWeight: unread \? 600 : 400, [^}]*textOverflow: 'ellipsis' \}\}>\{agent\.name\}<\/span>/);
  assert.match(row, /<span data-engine-model title=\{engine\.title\} style=\{\{ flex: '0 1 auto', [^}]*textOverflow: 'ellipsis' \}\}>\{engine\.model\}<\/span>/);
  // The badge is a 1:1 square (size only) sat just left of the status dot,
  // after the orchestrator chip.
  const chip = row.indexOf("t('pro.agents.orchestrator')");
  const badge = row.indexOf('<EngineBadge provider={agent.provider} size={14} title={engine.title} />');
  // Since the V2 row (0.5.3, F25) the dot sits in front of the status WORD at
  // the right of line 2, the prototype's presence dot; the ring lives in
  // StatusDot itself (pro/ui.tsx).
  const dot = row.indexOf('<StatusDot status={agent.status} size={7} />');
  assert.ok(chip > 0 && badge > chip && dot > badge, `chip (${chip}) < badge (${badge}) < dot (${dot})`);
});

test('4. the grid card and the orchestrator card draw the engine line in both renderings', () => {
  assert.match(grid, /import \{ EngineLine \} from '\.\/Engine';/);
  // The card: model always, the role sentence after it in the simple rendering only.
  assert.match(grid, /const role = technical \? undefined : firstSentence\(a\.description\);/);
  assert.match(grid, /<EngineLine provider=\{a\.provider\} model=\{a\.model\} after=\{role\} style=\{\{ marginTop: 2 \}\} \/>/);
  // The orchestrator: drawn whenever his row exists, not only in the technical
  // rendering; the context figure still belongs to the technical one.
  assert.match(grid, /\{god && \(\n\s+<EngineLine provider=\{god\.provider\} model=\{god\.model\} after=\{technical \? ctxLine\(god, t\) : undefined\}/);
  assert.ok(!/technical && god && \(/.test(grid), 'the old technical-only guard around the orchestrator sub line is gone');
});

test('5. the CLI default string exists in every locale, without a dash', () => {
  for (const l of ['en', 'zh-CN', 'ar']) {
    const s = JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`)).pro.agents.cliDefault;
    assert.ok(typeof s === 'string' && s.trim().length > 0, `${l} pro.agents.cliDefault`);
    assert.ok(!DASH.test(s), `${l}: no dash`);
  }
  assert.strictEqual(JSON.parse(read('src/renderer/src/i18n/locales/en.json')).pro.agents.cliDefault, 'CLI default');
});
