'use strict';

// Runs after OpenCC s2twp, on machine-filled strings only.
//
// Rules are [from, to, why] and apply in order, so a phrase must come before
// the shorter term it contains. There is deliberately no dash rule: zh-TW keeps
// zh-CN's dash style key by key, and OpenCC leaves dashes untouched.

const RULES = [
  // ---- s2twp wrong-sense fixes ----
  // s2twp turns every 通过 into 透過 ("via"); after these verbs it means "passed".
  [/(核准|批准|審核|審查|測試|檢查|驗證|校驗)透過/g, '$1通過', 'passed, not via'],

  // ---- sessions / threads ----
  ['會話執行緒', '討論串', 'Slack thread'],
  ['會話', '工作階段', 'session'],

  // ---- clone / worker / agent / orchestrator ----
  ['克隆體', '分身', 'clone'],
  ['克隆', '分身', 'clone'],
  // worker before agent: 工作智能体 must not become 工作 Agent.
  [/工作(?:智慧體|智能體)/g, '工作者', 'worker (工作智能体)'],
  ['工人', '工作者', 'worker; 工人 means a manual labourer in TW'],
  ['僱員', '工作者', 'worker (雇员)'],
  // A leading "AI" is absorbed so "AI 智能体" does not become "AI AI 代理人".
  // English "Agent" in zh-CN is only ever a product name or path (Cursor Agent
  // CLI, ~/HarnessAgents), so it is not touched.
  [/(?:AI\s*)?(?:智慧體|智能體)/g, 'AI 代理人', 'agent (s2twp gives 智慧體)'],
  ['調度者', '協調者', 'orchestrator'],
  ['排程者', '協調者', 'orchestrator (s2twp output for 调度者)'],

  // ---- Token ----
  ['令牌', 'Token', 'token: keep the English word'],

  // ---- tools and places ----
  [/終端(?!機)/g, '終端機', 'terminal'],
  ['命令', '指令', 'command (Command Center = 指令中心)'],
  ['倉庫', '儲存庫', 'repository'],
  ['Slack 應用', 'Slack App', 'Slack App'],
  // A button that is just 应用 / 应用中… means "apply", not "app".
  [/^應用(?=$|中)/g, '套用', 'apply (whole label)'],
  [/應用(?!程式|中|更改|變更|設定|到)/g, '應用程式', 'app (apply = 套用: left for review)'],
  ['計劃', '排程', 'schedule'],
  ['定時器', '計時器', 'timer'],
  ['揚聲器', '喇叭', 'speaker'],

  // ---- verbs ----
  ['重啟', '重新啟動', 'restart'],
  ['派發', '分派', 'dispatch'],
  ['轉寫', '轉錄', 'transcribe'],
  // A plain 只讀→唯讀 would also hit 只讀取 ("only reads").
  [/只讀(?!取)/g, '唯讀', 'read-only'],
  // A plain 跳轉→跳至 would turn 跳轉到 into 跳至到, so 跳轉到 goes first.
  ['跳轉到', '跳至', 'jump to'],
  ['跳轉', '跳至', 'jump to'],

  // ---- measure words ----
  ['條訊息', '則訊息', 'messages are counted with 則'],

  // ---- punctuation: 「」 not curly quotes ----
  ['“', '「', 'quotes'],
  ['”', '」', 'quotes'],
  ['‘', '『', 'nested quotes'],
  ['’', '』', 'nested quotes'],
];

const HAN = '\\p{Script=Han}';
const LATIN_START = '(?:[A-Za-z0-9]|\\{\\{)';
const LATIN_END = '(?:[A-Za-z0-9]|\\}\\})';
const TAGS = '(?:</?[A-Za-z][\\w-]*>)+';
// A half-width space between Han and Latin letters, digits, or a {{placeholder}};
// none next to full-width punctuation (it is not Han). Across inline tags the
// space goes on the Han side, outside the tag: 一個 <strong>CLI,
// <strong>CLI Agent</strong> 是.
const SPACING = [
  [new RegExp(`(${HAN})(${LATIN_START})`, 'gu'), '$1 $2'],
  [new RegExp(`(${LATIN_END})(${HAN})`, 'gu'), '$1 $2'],
  [new RegExp(`(${HAN})(${TAGS})(${LATIN_START})`, 'gu'), '$1 $2$3'],
  [new RegExp(`(${LATIN_END})(${TAGS})(${HAN})`, 'gu'), '$1$2 $3'],
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const compiled = RULES.map(([from, to]) => [typeof from === 'string' ? new RegExp(escape(from), 'g') : from, to]);

// Labels rendered in the 8px pixel display font (--cth-font-display). Latin
// letters there fall to Press Start 2P and dwarf the Chinese, so AI is written
// full-width (ＡＩ, rendered by the CJK font) with no spaces. Add a key here when
// a new pixel-font label mentions the agent.
const PIXEL_FONT_KEYS = new Set([
  'settings.nav.agentsModels',
  'commandCenter.agents',
  'addAgent.title',
  'onboarding.permissions.autoLabelPlain',
]);

/**
 * Apply the glossary, then Han/Latin spacing, to one Traditional Chinese
 * string. `key` (dotted locale key) enables the per-key pixel-font rule.
 */
function applyGlossary(s, key) {
  let v = s;
  for (const [re, to] of compiled) v = v.replace(re, to);
  for (const [re, to] of SPACING) v = v.replace(re, to);
  if (key && PIXEL_FONT_KEYS.has(key)) v = v.replace(/ ?AI 代理人 ?/g, 'ＡＩ代理人');
  return v;
}

module.exports = { RULES, PIXEL_FONT_KEYS, applyGlossary };
