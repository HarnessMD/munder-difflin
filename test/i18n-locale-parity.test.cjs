'use strict';

// Checks locale shape only (keys, {{placeholders}}, <tags>), not translation quality.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const {
  fillZhTw, flattenLeaves, placeholdersOf, tagsOf, convertProtected, convertLeaf, serialize,
} = require('../tools/i18n-fill-zh-tw.cjs');

const dir = path.join(__dirname, '..', 'src', 'renderer', 'src', 'i18n', 'locales');
const load = (f) => JSON.parse(fs.readFileSync(path.join(dir, f), 'utf8'));
const en = flattenLeaves(load('en.json'));
const locales = fs.readdirSync(dir)
  .filter((f) => f.endsWith('.json') && !f.endsWith('.pending.json') && f !== 'en.json')
  .sort();

const shape = (v) => (Array.isArray(v) ? `array(${v.length})` : typeof v);

for (const file of locales) {
  const code = file.replace(/\.json$/, '');
  const loc = flattenLeaves(load(file));

  test(`${code}: same key tree as en`, () => {
    const missing = [...en.keys()].filter((k) => !loc.has(k));
    const extra = [...loc.keys()].filter((k) => !en.has(k));
    const reshaped = [...en.keys()].filter((k) => loc.has(k) && shape(en.get(k)) !== shape(loc.get(k)));
    assert.deepEqual(missing, [], `${file} is missing keys`);
    assert.deepEqual(extra, [], `${file} has keys en.json does not`);
    assert.deepEqual(reshaped, [], `${file} has values of a different shape than en.json`);
  });

  test(`${code}: same {{placeholders}} as en in every string`, () => {
    const bad = [...en.keys()].filter((k) => loc.has(k))
      .filter((k) => placeholdersOf(en.get(k)).join() !== placeholdersOf(loc.get(k)).join())
      .map((k) => `${k}: en ${placeholdersOf(en.get(k))} vs ${placeholdersOf(loc.get(k))}`);
    assert.deepEqual(bad, []);
  });

  test(`${code}: same <tags> as en in every string`, () => {
    const bad = [...en.keys()].filter((k) => loc.has(k))
      .filter((k) => tagsOf(en.get(k)).join() !== tagsOf(loc.get(k)).join())
      .map((k) => `${k}: en ${tagsOf(en.get(k))} vs ${tagsOf(loc.get(k))}`);
    assert.deepEqual(bad, []);
  });
}

const hasZhTw = locales.includes('zh-TW.json');

test('zh-TW: is in step with zh-CN (npm run i18n:fill-zh-tw -- --check)', { skip: !hasZhTw && 'zh-TW.json not present' }, () => {
  const { added, removed } = fillZhTw({
    en: load('en.json'), zhCN: load('zh-CN.json'), zhTW: load('zh-TW.json'), convert: (s) => s,
  });
  assert.deepEqual(added, [], 'zh-TW.json is missing keys zh-CN.json has');
  assert.deepEqual(removed, [], 'zh-TW.json has keys zh-CN.json no longer has');
});

test('zh-TW: every pending key exists in zh-TW.json', { skip: !hasZhTw && 'zh-TW.json not present' }, () => {
  const pendingFile = path.join(dir, 'zh-TW.pending.json');
  if (!fs.existsSync(pendingFile)) return;
  const pending = load('zh-TW.pending.json');
  assert.ok(pending && typeof pending === 'object' && !Array.isArray(pending), 'pending must be {key: source}');
  const tw = flattenLeaves(load('zh-TW.json'));
  assert.deepEqual(Object.keys(pending).filter((k) => !tw.has(k)), []);
});

// ---- the fill script, on in-memory trees -----------------------------------

// A stand-in for OpenCC that marks what it touched, so the tests can see exactly
// which text was handed to the converter.
const fake = (s) => s.replace(/[^\s]+/g, (w) => `T(${w})`);

const EN = {
  a: { one: 'One', two: 'Two {{n}}' },
  b: 'Bee <strong>bold</strong>',
  list: ['x', 'y'],
};

test('fill: missing keys are converted, kept keys untouched, en order kept', () => {
  const zhCN = { list: ['甲', '乙'], b: '蜂 <strong>粗</strong>', a: { two: '二 {{n}}', one: '一' } };
  const zhTW = { a: { one: '壹（人工）' } };
  const r = fillZhTw({ en: EN, zhCN, zhTW, convert: fake });

  assert.deepEqual(r.added, ['list', 'b', 'a.two']);
  assert.deepEqual(r.removed, []);
  assert.equal(r.result.a.one, '壹（人工）');
  assert.equal(r.result.a.two, 'T(二) {{n}}');
  assert.equal(r.result.b, 'T(蜂) <strong>T(粗)</strong>');
  assert.deepEqual(r.result.list, ['T(甲)', 'T(乙)']);
  // Order follows en.json, not zh-CN.json or zh-TW.json.
  assert.equal(serialize(r.result),
    serialize({ a: { one: '壹（人工）', two: 'T(二) {{n}}' }, b: 'T(蜂) <strong>T(粗)</strong>', list: ['T(甲)', 'T(乙)'] }));
  assert.equal(serialize(r.result).slice(-2), '}\n');
});

test('fill: a missing zh-TW (empty object) is filled from scratch', () => {
  const zhCN = { a: { one: '一', two: '二 {{n}}' }, b: '蜂 <strong>粗</strong>', list: ['甲', '乙'] };
  const r = fillZhTw({ en: EN, zhCN, convert: fake });
  assert.deepEqual(r.added, ['a.one', 'a.two', 'b', 'list']);
  assert.deepEqual(Object.keys(r.pending), ['a.one', 'a.two', 'b', 'list']);
});

test('fill: orphan keys are removed, and their pending entries with them', () => {
  const zhCN = { a: { one: '一' } };
  const zhTW = { a: { one: '壹', gone: '舊' }, old: { deep: '舊' }, list: '字串' };
  const pending = { 'a.gone': '旧', 'a.one': '一' };
  const r = fillZhTw({ en: EN, zhCN, zhTW, pending, convert: fake });
  assert.deepEqual(r.added, []);
  assert.deepEqual(r.removed.sort(), ['a.gone', 'list', 'old.deep']);
  assert.deepEqual(r.result, { a: { one: '壹' } });
  assert.deepEqual(r.pending, { 'a.one': '一' });
});

test('fill: pending records the zh-CN source; existing pending entries are not re-added', () => {
  const zhCN = { a: { one: '一', two: '二 {{n}}' } };
  const pending = { 'a.one': '最初的原文' };
  const r = fillZhTw({ en: EN, zhCN, zhTW: { a: { one: '壹' } }, pending, convert: fake });
  assert.deepEqual(r.pending, { 'a.one': '最初的原文', 'a.two': '二 {{n}}' });

  // Running again on its own output adds nothing and keeps pending as-is.
  const again = fillZhTw({ en: EN, zhCN, zhTW: r.result, pending: r.pending, convert: fake });
  assert.deepEqual(again.added, []);
  assert.deepEqual(again.removed, []);
  assert.deepEqual(again.pending, r.pending);
  assert.deepEqual(again.result, r.result);
});

test('fill: a reviewed key (deleted from pending) stays out of pending', () => {
  const zhCN = { a: { one: '一' } };
  const r = fillZhTw({ en: EN, zhCN, zhTW: { a: { one: '壹' } }, pending: {}, convert: fake });
  assert.deepEqual(r.pending, {});
});

test('fill: a value of the wrong shape is replaced and reported both ways', () => {
  const zhCN = { list: ['甲', '乙'] };
  const r = fillZhTw({ en: EN, zhCN, zhTW: { list: 'not an array' }, convert: fake });
  assert.deepEqual(r.added, ['list']);
  assert.deepEqual(r.removed, ['list']);
  assert.deepEqual(r.result.list, ['T(甲)', 'T(乙)']);
});

test('convert: placeholders and tags are never passed to the converter', () => {
  const seen = [];
  const out = convertProtected('前 {{godName}} 中 <b>粗</b> 后', (s) => { seen.push(s); return s; });
  assert.equal(out, '前 {{godName}} 中 <b>粗</b> 后');
  assert.ok(seen.every((s) => !/[{}<>]/.test(s)), `converter saw ${JSON.stringify(seen)}`);
});

test('convert: a converter that breaks a placeholder or tag is an error', () => {
  // Text between tokens that the converter turns into a token: the check catches it.
  assert.throws(() => convertLeaf('k', '名 {{n}}', (s) => s.replace('名', '{{x}}')), /placeholders/);
  assert.throws(() => convertLeaf('k', '名 <b>粗</b>', (s) => s.replace('名', '<i>')), /tags/);
  assert.doesNotThrow(() => convertLeaf('k', '名 {{n}} <b>粗</b>', (s) => s));
});

// ---- the Taiwan glossary applied after OpenCC ------------------------------

const { applyGlossary } = require('../tools/i18n-zh-tw-glossary.cjs');

test('glossary: fixes the known traps of naive phrase rules and s2twp', () => {
  assert.equal(applyGlossary('此欄位為只讀'), '此欄位為唯讀');
  assert.equal(applyGlossary('它只讀取設定'), '它只讀取設定'); // "only reads", not read-only
  assert.equal(applyGlossary('跳轉到最新'), '跳至最新'); // not 跳至到
  assert.equal(applyGlossary('核准透過後執行'), '核准通過後執行'); // passed, not via
  assert.equal(applyGlossary('透過 SSH 連線'), '透過 SSH 連線'); // genuine "via" kept
  assert.equal(applyGlossary('會話執行緒'), '討論串');
  assert.equal(applyGlossary('應用'), '套用');
  assert.equal(applyGlossary('重啟應用'), '重新啟動應用程式');
});

test('glossary: settled terms, measure word, quotes, Han/Latin spacing', () => {
  assert.equal(applyGlossary('令牌用量'), 'Token 用量');
  assert.equal(applyGlossary('已讀{{count}}條訊息'), '已讀 {{count}} 則訊息');
  assert.equal(applyGlossary('點選“儲存”'), '點選「儲存」');
  assert.equal(applyGlossary('在Slack中開啟終端'), '在 Slack 中開啟終端機');
  assert.equal(applyGlossary('<strong>重啟</strong>'), '<strong>重新啟動</strong>');
  assert.equal(applyGlossary('命令中心'), '指令中心');
  assert.equal(applyGlossary('執行命令'), '執行指令');
});

test('glossary: naming decisions — AI 代理人, 工作者 (before agent), 協調者', () => {
  assert.equal(applyGlossary('該智慧體正在執行'), '該 AI 代理人正在執行'); // space before, none after
  assert.equal(applyGlossary('停止，智慧體將退出'), '停止，AI 代理人將退出'); // none beside full-width punctuation
  assert.equal(applyGlossary('AI 智慧體'), 'AI 代理人'); // not AI AI 代理人
  assert.equal(applyGlossary('Cursor Agent CLI'), 'Cursor Agent CLI'); // product name
  assert.equal(applyGlossary('像 ~/HarnessAgents 這樣'), '像 ~/HarnessAgents 這樣'); // path
  assert.equal(applyGlossary('僱傭工作智慧體'), '僱傭工作者');
  assert.equal(applyGlossary('隔離工人'), '隔離工作者');
  assert.equal(applyGlossary('排程者'), '協調者');
});

test('glossary: pixel-font labels get full-width, unspaced ＡＩ代理人', () => {
  assert.equal(applyGlossary('新增智慧體', 'addAgent.title'), '新增ＡＩ代理人');
  assert.equal(applyGlossary('智慧體與模型', 'settings.nav.agentsModels'), 'ＡＩ代理人與模型');
  assert.equal(applyGlossary('新增智慧體', 'some.other.key'), '新增 AI 代理人');
  const { PIXEL_FONT_KEYS } = require('../tools/i18n-zh-tw-glossary.cjs');
  assert.deepEqual([...PIXEL_FONT_KEYS].filter((k) => !en.has(k)), [], 'PIXEL_FONT_KEYS names a key en.json lacks');
});

test('glossary: spacing crosses inline tags, on the Han side', () => {
  assert.equal(applyGlossary('<strong>CLI 引擎</strong>是工具'), '<strong>CLI 引擎</strong>是工具');
  assert.equal(applyGlossary('<strong>CLI Agent</strong>是工具'), '<strong>CLI Agent</strong> 是工具');
  assert.equal(applyGlossary('都是一個<strong>CLI 引擎</strong>'), '都是一個 <strong>CLI 引擎</strong>');
  assert.equal(applyGlossary('<b>v{{version}} 正在下載。</b>'), '<b>v{{version}} 正在下載。</b>');
});

test('glossary: dashes are never touched (zh-TW follows zh-CN key by key)', () => {
  for (const s of ['助手 —— 常見', '保留——絕不', 'Claude Code — Anthropic']) assert.equal(applyGlossary(s), s);
});

test('glossary: applying it twice changes nothing more', () => {
  for (const s of ['令牌用量', '在Slack中開啟終端', '終端機', '應用程式', '重新啟動', '工作者', '唯讀',
    '一個<strong>CLI 智慧體</strong>是', '該 AI 代理人', 'AI 智慧體', '協調者']) {
    assert.equal(applyGlossary(applyGlossary(s)), applyGlossary(s), s);
  }
});

test('glossary: keeps every {{placeholder}} and <tag> of every zh-CN string', () => {
  for (const [k, v] of flattenLeaves(load('zh-CN.json'))) {
    assert.doesNotThrow(() => convertLeaf(k, v, (s) => s, applyGlossary), k);
  }
});

test('fill: the post-conversion pass runs on filled keys only', () => {
  const r = fillZhTw({
    en: EN, zhCN: { a: { one: '一', two: '二' } }, zhTW: { a: { one: '壹' } },
    convert: (s) => s, post: (s) => `${s}!`,
  });
  assert.deepEqual(r.result.a, { one: '壹', two: '二!' });
});

let opencc = null;
try { opencc = require('opencc-js'); } catch { /* not installed: skip the smoke test */ }

test('convert: real OpenCC s2twp gives Taiwan wording and keeps tokens', { skip: !opencc && 'opencc-js not installed' }, () => {
  const convert = opencc.Converter({ from: 'cn', to: 'twp' });
  assert.equal(convertLeaf('k', '软件信息 {{godName}} <strong>默认</strong>', convert),
    '軟體資訊 {{godName}} <strong>預設</strong>');
});
