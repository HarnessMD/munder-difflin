'use strict';

/**
 * 0.5.3, founder hand test F1 (24 Sep 2026): "the default model list is older
 * I think it gets merged with we push the model changes. and the model listing
 * inside orchestrator configuration says claude-opus-5-5 wheras rest models
 * are just listed like Opus 5, Fable 5.1".
 *
 * WHAT ACTUALLY HAPPENED. Opus 5.5 became the default in config.ts (godModel
 * and defaultModel). The baked catalog names it. The REMOTE catalog, fetched
 * from docs/model-catalog.json on the public repo's main, lags a release and
 * its claude list still ended at Opus 5. The overlay replaced the claude list
 * PER PROVIDER, so the merge dropped the entry this build ships, the picker
 * lost it, and the orchestrator's Config tab fell back to printing the raw id
 * beside friendly names.
 *
 * TWO RULES HOLD IT SHUT.
 *
 *   1. A remote catalog can never make a picker OLDER than the build. The
 *      merge is per MODEL: the remote leads and wins by id, and a baked model
 *      the remote does not mention is kept. Retiring stays possible through
 *      the maxAppVersion field, which `offeredAtVersion` already honours;
 *      silence is not retirement.
 *   2. Every model id this build can pick by itself has a label, and no
 *      surface prints a raw slug: the fallbacks go through `modelWord`, which
 *      reads the live catalog.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const baked = require('../src/shared/modelCatalog.json');
const { parseModelCatalog, CATALOG_SCHEMA_VERSION } = loadTs('src/shared/modelCatalogPayload.ts');
const { applyRemoteModelCatalog, mergeCatalogModels, modelsForProvider, modelsForProviderAtVersion, modelWord, catalogProviders } =
  loadTs('src/renderer/src/store/config.ts');

test.afterEach(() => applyRemoteModelCatalog(null));

/** Every model id the app can choose on its own, read out of main's config so
 *  the list cannot drift from the defaults it pins. */
function defaultModelIds() {
  const src = read('src/main/config.ts');
  const ids = new Set();
  for (const key of ['godModel', 'defaultModel']) {
    const m = src.match(new RegExp(`^\\s*${key}: '([^']+)',`, 'm'));
    assert.ok(m, `DEFAULTS.${key} is a literal model id`);
    ids.add(m[1]);
  }
  // The role tiers the spawn handler falls back to.
  for (const key of ['MODEL_GOD', 'MODEL_WORKER', 'MODEL_HELPER']) {
    const m = src.match(new RegExp(`^const ${key} = '([^']+)';`, 'm'));
    assert.ok(m, `${key} is a literal model id`);
    ids.add(m[1]);
  }
  return [...ids];
}

test('every model the app defaults to has a catalog label, never a raw id', () => {
  const ids = defaultModelIds();
  assert.ok(ids.includes('claude-opus-5-5'), 'Opus 5.5 is a default on this build');
  for (const id of ids) {
    const entry = (baked.providers.claude ?? []).find((m) => m.id === id);
    assert.ok(entry, `${id} is in the baked claude catalog`);
    assert.notEqual(entry.label, id, `${id} has words, not its own slug`);
    assert.equal(modelWord('claude', id), entry.label, `${id} reads as ${entry.label}`);
  }
});

test('Opus 5.5 reads "Opus 5.5"', () => {
  assert.equal(modelWord('claude', 'claude-opus-5-5'), 'Opus 5.5');
  assert.equal((baked.providers.claude ?? []).find((m) => m.id === 'claude-opus-5-5')?.label, 'Opus 5.5');
});

test('a remote catalog that predates a default cannot drop it, and does not reorder around it', () => {
  // The real payload that was live on main when the founder hit this: the
  // claude list with Opus 5.5 simply absent.
  const stale = (baked.providers.claude ?? []).filter((m) => m.id !== 'claude-opus-5-5');
  assert.ok(applyRemoteModelCatalog(parseModelCatalog({ version: CATALOG_SCHEMA_VERSION, providers: { claude: stale } })));
  const list = modelsForProvider('claude');
  assert.ok(list.some((m) => m.id === 'claude-opus-5-5' && m.label === 'Opus 5.5'), 'the shipped default survives a stale remote');
  for (const id of defaultModelIds()) {
    assert.ok(list.some((m) => m.id === id), `${id} survives`);
    assert.notEqual(modelWord('claude', id), id, `${id} still reads as words`);
  }
  // The remote still leads: it owns the order and the labels of what it names.
  assert.equal(list[0].id, stale[0].id);
});

test('the remote still wins on a model it does name, and can still add one', () => {
  assert.ok(applyRemoteModelCatalog(parseModelCatalog({ version: CATALOG_SCHEMA_VERSION, providers: {
    claude: [{ id: 'claude-opus-5-5', label: 'Opus 5.5 · renamed' }, { id: 'claude-opus-9', label: 'Opus 9' }]
  } })));
  const list = modelsForProvider('claude');
  assert.equal(list.find((m) => m.id === 'claude-opus-5-5')?.label, 'Opus 5.5 · renamed', 'one entry, the remote\'s');
  assert.equal(list.filter((m) => m.id === 'claude-opus-5-5').length, 1, 'not listed twice');
  assert.equal(list[0].id, 'claude-opus-5-5');
  assert.equal(list[1].id, 'claude-opus-9');
  assert.equal(modelWord('claude', 'claude-opus-9'), 'Opus 9', 'a remotely added model is named in the badges too');
});

test('a remote can still retire a model, with maxAppVersion', () => {
  assert.ok(applyRemoteModelCatalog(parseModelCatalog({ version: CATALOG_SCHEMA_VERSION, providers: {
    claude: [{ id: 'claude-opus-4-8', label: 'Opus 4.8', maxAppVersion: '0.0.1' }]
  } })));
  // Read at a version past the bound: the test runner's own app version is
  // below it, which is the point of the field.
  assert.ok(!modelsForProviderAtVersion('claude', '9.9.9').some((m) => m.id === 'claude-opus-4-8'), 'retired by version, not by silence');
  assert.ok(modelsForProviderAtVersion('claude', '0.0.1').some((m) => m.id === 'claude-opus-4-8'), 'and still offered at a version it covers');
});

test('a provider the remote does not mention keeps the built-in list', () => {
  assert.ok(applyRemoteModelCatalog(parseModelCatalog({ version: CATALOG_SCHEMA_VERSION, providers: { claude: [{ id: 'x', label: 'X' }] } })));
  assert.deepEqual(catalogProviders().codex, baked.providers.codex);
});

test('mergeCatalogModels keeps the CLI default row, which has no id, exactly once', () => {
  const merged = mergeCatalogModels([{ label: 'CLI default' }, { id: 'a', label: 'A' }], [{ label: 'CLI default' }, { id: 'b', label: 'B' }]);
  assert.deepEqual(merged, [{ label: 'CLI default' }, { id: 'b', label: 'B' }, { id: 'a', label: 'A' }]);
});

test('no picker or badge prints a raw model id: the fallbacks go through modelWord', () => {
  const surfaces = {
    'src/renderer/src/components/pro/god/ConfigTab.tsx': /label: modelWord\(provider, model\) \?\? model/,
    'src/renderer/src/components/CommandCenterPanel.tsx': /\{modelWord\(agentProvider, a\.model\) \?\? 'current'\}/,
    'src/renderer/src/components/pro/AgentScreen.tsx': /t\('pro\.sheet\.modelCurrent', \{ model: modelWord\(provider, agent\.model\) \?\? agent\.model \}\)/,
    'src/renderer/src/components/pro/AgentSheet.tsx': /const word = modelWord\(provider, model\) \?\? model;/,
    'src/renderer/src/components/pro/Engine.tsx': /const label = modelWord\(p, model\);/,
    'src/renderer/src/components/AgentCard.tsx': /const word = modelWord\(provider, model\)/,
    'src/renderer/src/components/FullscreenTerminal.tsx': /const word = modelWord\(agent\.provider, agent\.model\)/
  };
  for (const [file, rule] of Object.entries(surfaces)) assert.match(read(file), rule, file);
  // The badges must read the LIVE catalog, not the baked import, or a remotely
  // added model is named in the picker and a slug on the card.
  for (const file of ['src/renderer/src/components/pro/Engine.tsx', 'src/renderer/src/components/AgentCard.tsx', 'src/renderer/src/components/FullscreenTerminal.tsx']) {
    assert.doesNotMatch(read(file), /modelLabel/, `${file} goes through the live catalog`);
  }
});
