'use strict';

// Applied after OpenCC s2twp to machine-filled strings only. Rules run in order.

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
  // worker = 臨時工; must run before the agent rules.
  [/工作(?:智慧體|智能體)/g, '臨時工', 'worker (工作智能体)'],
  ['工人', '臨時工', 'worker (工人)'],
  ['僱員', '臨時工', 'worker (雇员)'],
  // A leading "AI" is absorbed so it is not doubled.
  [/(?:AI\s*)?(?:智慧體|智能體)/g, 'AI 代理人', 'agent (s2twp gives 智慧體)'],
  // Bare 代理 is the agent; 代理人, 代理伺服器 and 代理框架 are left alone.
  [/(?:AI\s*)?代理(?!人|伺服器|框架)/g, 'AI 代理人', 'agent (bare 代理)'],
  ['調度者', '協調者', 'orchestrator'],
  ['編排者', '協調者', 'orchestrator (编排者)'],
  ['排程者', '協調者', 'orchestrator (s2twp output for 调度者)'],

  // ---- Token ----
  ['令牌', 'Token', 'token: keep the English word'],
  ['蜂巢', 'hive', 'hive: keep the English word'],
  ['許可權', '權限', 'permission (s2twp gives 許可權)'],
  // A lone lowercase token in Chinese prose is capitalised. Inside an English
  // phrase (Access token, bot token, token-cap) it is left alone.
  [/(?<![A-Za-z][\s-]?)\btoken\b(?![\s-]?[A-Za-z])/g, 'Token', 'token in Chinese prose'],

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
  ['鉤子', 'hook', 'hook: keep the English word'],
  ['收件箱', '收件匣', 'inbox'],
  ['憑據', '憑證', 'credentials'],
  ['套餐', '方案', 'plan (subscription)'],
  ['閾值', '門檻', 'threshold'],
  ['賬', '帳', 'account / ledger (帳號, 帳本)'],
  ['話題', '討論串', 'Slack thread (话题)'],

  // ---- verbs ----
  ['重啟', '重新啟動', 'restart'],
  ['派發', '分派', 'dispatch'],
  ['轉寫', '轉錄', 'transcribe'],
  // A plain 只讀→唯讀 would also hit 只讀取 ("only reads").
  [/只讀(?!取)/g, '唯讀', 'read-only'],
  // A plain 跳轉→跳至 would turn 跳轉到 into 跳至到, so 跳轉到 goes first.
  ['跳轉到', '跳至', 'jump to'],
  ['跳轉', '跳至', 'jump to'],
  ['歸檔', '封存', 'archive'],
  ['打開', '開啟', 'open'],
  // s2twp splits 不复制 as 不復 + 制.
  ['復制', '複製', 'copy'],

  // ---- measure words ----
  ['條訊息', '則訊息', 'messages are counted with 則'],
  ['單詞', '單字', 'word'],

  // ---- wording the reviewed strings already use ----
  ['更改', '變更', 'change'],
  ['列表', '清單', 'list'],
  ['丟失', '遺失', 'lost'],
  ['標籤頁', '分頁', 'tab'],
  [/本地(?!化)/g, '本機', 'local (本地化 = localisation is left alone)'],
  ['當前', '目前', 'current'],
  ['自定義', '自訂', 'custom'],
  ['高階', '進階', 'advanced'],

  // ---- characters s2twp leaves in mainland form ----
  ['搜索', '搜尋', 'search'],
  ['文本', '文字', 'text'],
  ['私信', '私訊', 'direct message'],
  ['身份', '身分', 'identity'],
  ['下劃線', '底線', 'underscore'],
  ['斜槓', '斜線', 'slash'],
  ['頻道里', '頻道裡', 'in a channel'],
  ['回復', '回覆', 'reply (s2twp gives 回復 for 回复)'],

  // ---- UI terms ----
  ['資源管理器', '檔案總管', 'file explorer'],
  [/提供商|提供方|服務商/g, '供應商', 'provider'],
  // Only a returned value (返回 {{status}}); 返回 alone is often "go back".
  [/返回(?=\s*(?:\{\{|\d))/g, '回傳', 'returns a value'],
  ['獲取', '取得', 'get'],
  ['新建', '新增', 'new (file, folder)'],
  ['側邊欄', '側欄', 'sidebar'],
  ['拖動', '拖曳', 'drag'],

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
// Half-width space between Han and Latin text, outside inline tags.
const SPACING = [
  [new RegExp(`(${HAN})(${LATIN_START})`, 'gu'), '$1 $2'],
  [new RegExp(`(${LATIN_END})(${HAN})`, 'gu'), '$1 $2'],
  [new RegExp(`(${HAN})(${TAGS})(${LATIN_START})`, 'gu'), '$1 $2$3'],
  [new RegExp(`(${LATIN_END})(${TAGS})(${HAN})`, 'gu'), '$1$2 $3'],
];

const escape = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const compiled = RULES.map(([from, to]) => [typeof from === 'string' ? new RegExp(escape(from), 'g') : from, to]);

// Pixel-font labels: write AI full-width (ＡＩ) here.
const PIXEL_FONT_KEYS = new Set([
  'settings.nav.agentsModels',
  'commandCenter.agents',
  'addAgent.title',
  'onboarding.permissions.autoLabelPlain',
  'integrations.hub.tab.providers',
  'integrations.hub.sec.use',
]);

/**
 * Apply the glossary, then Han/Latin spacing, to one Traditional Chinese
 * string. `key` (dotted locale key) enables the per-key pixel-font rule.
 */
function applyGlossary(s, key) {
  let v = s;
  for (const [re, to] of compiled) v = v.replace(re, to);
  for (const [re, to] of SPACING) v = v.replace(re, to);
  if (key && PIXEL_FONT_KEYS.has(key)) v = v.replace(/ ?\bAI\b ?/g, 'ＡＩ');
  return v;
}

module.exports = { RULES, PIXEL_FONT_KEYS, applyGlossary };
