// 0.4.11, founder 6 Sep 2026: "change the drop down idea in there to just show
// the groq api key input box", and, from the same thread, "for the talk feature
// the button is disabled but when clicked on it should open a dropdown modal
// asking user to add their openai api keys (stored locally)". He had also seen
// hold to talk record with no key and lead nowhere.
//
// The contract pinned here:
//   1. voice/keyEntry.ts is the one saver: the Groq key goes to main config
//      through freeflow:setConfig, the OpenAI key to the broker slot the
//      engines share, and only PRESENCE reaches the store. Nothing logs a key.
//   2. No path opens the microphone without a Groq key: the hold gesture and
//      the recorder itself both check presence before getUserMedia.
//   3. The Classic and PRO microphone cards carry the key box and save through
//      the one helper; the mic itself stays disabled until presence flips, and
//      the key text never appears in a component.
//   4. The Classic and PRO Talk buttons are no longer dead without a key: a
//      click opens the card, the card carries the key box, and connect() is
//      unreachable until the key is saved.
//   5. The strings exist in all three locales, without a dash, and the zh and
//      ar strings are written, not copied.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
// JSX comments first, so `{/* … */}` leaves nothing behind rather than `{}`.
const strip = (s) => s.replace(/\{\/\*[\s\S]*?\*\/\}/g, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const DASH = /[–—]|\s-\s/;

const keyEntry = strip(read('src/renderer/src/voice/keyEntry.ts'));
const classicMic = strip(read('src/renderer/src/components/MessageQueueComposer.tsx'));
const proMic = strip(read('src/renderer/src/components/pro/Composer.tsx'));
const classicTalk = strip(read('src/renderer/src/components/RealtimeMichaelToggle.tsx'));
const proTalk = strip(read('src/renderer/src/components/pro/GodScreen.tsx'));

test('1. keyEntry saves each key to its real home, mirrors presence only, and never logs', () => {
  assert.match(keyEntry, /export async function saveGroqKey\(raw: string\): Promise<KeySaveResult>/);
  assert.match(keyEntry, /window\.cth\.freeflowSetConfig\(\{ apiKey: key \}\)/, 'the Groq key goes where Settings, Voice puts it');
  assert.match(keyEntry, /useStore\.getState\(\)\.setHasGroqKey\(true\)/, 'presence flips at once, so the mic lights up without a restart');
  assert.match(keyEntry, /export async function saveOpenAiKey\(raw: string\): Promise<KeySaveResult>/);
  assert.match(keyEntry, /window\.cth\.providerKeySet\(\{ backend: 'openai', key \}\)/, 'the OpenAI key goes to the broker slot the engines share');
  assert.match(keyEntry, /useStore\.getState\(\)\.setHasOpenAiKey\(true\)/);
  assert.match(keyEntry, /const key = raw\.trim\(\);\s*if \(!key\) return \{ ok: false, error: 'empty' \};/g);
  // (The Groq URL is console.groq.com, so the check names the logging calls.)
  assert.doesNotMatch(keyEntry, /console\.(log|warn|error|info|debug)\(|\blog\(/, 'a key is never logged');
  assert.match(keyEntry, /export const GROQ_KEYS_URL = 'https:\/\/console\.groq\.com\/keys';/);
  assert.match(keyEntry, /export const OPENAI_KEYS_URL = 'https:\/\/platform\.openai\.com\/api-keys';/);
});

test('2. no path opens the microphone without a transcription engine (a Groq key or a local engine since 0.5.3)', () => {
  // 0.5.3, F16 (PR #51): a local engine (Apple or whisper) counts as much as a
  // Groq key. canDictate is presence only, refreshed from transcribe:status.
  const hold = strip(read('src/renderer/src/freeflow/holdOption.ts'));
  assert.match(hold, /const st = useStore\.getState\(\);\s*if \(!st\.hasGroqKey && !st\.canDictate\) return;/, 'the hold gesture checks presence of a key or a local engine');
  const rec = strip(read('src/renderer/src/freeflow/recorder.ts'));
  const start = rec.slice(rec.indexOf('async function start('), rec.indexOf('function stop('));
  const gate = start.indexOf("if (!useStore.getState().hasGroqKey && !useStore.getState().canDictate) { setState({ error: 'no transcription engine' }); return; }");
  const mic = start.indexOf('navigator.mediaDevices.getUserMedia(');
  assert.ok(gate > 0 && mic > gate, `the recorder refuses (${gate}) before it reaches getUserMedia (${mic})`);
});

test('3. both microphone cards carry the key box, save through the helper, and keep the mic gated', () => {
  for (const [name, src, saveBtn] of [['classic', classicMic, 'PixelButton'], ['pro', proMic, 'Btn']]) {
    assert.match(src, /import \{ (GROQ_KEYS_URL, )?saveGroqKey \} from '@\/voice\/keyEntry';/, `${name}: the one helper`);
    assert.match(src, /const r = await saveGroqKey\(keyDraft\);/, `${name}: the draft goes to the helper`);
    assert.match(src, /data-groq-key-entry/, `${name}: the key box is in the card`);
    const box = src.slice(src.indexOf('data-groq-key-entry'), src.indexOf('data-groq-key-entry') + 1400);
    assert.match(box, /type="password"/, `${name}: the key is masked`);
    assert.match(box, /aria-label=\{t\('settings\.voice\.groqKey'\)\}/, `${name}: named like the Settings field`);
    assert.match(box, /if \(isComposingKey\(e\)\) return; if \(e\.key === 'Enter'\) void saveKey\(\);/, `${name}: Enter saves, IME safe`);
    assert.match(box, new RegExp(`<${saveBtn}[^>]*onClick=\\{\\(\\) => \\{ void saveKey\\(\\); \\}\\} disabled=\\{!keyDraft\\.trim\\(\\) \\|\\| saving\\}`), `${name}: a Save button`);
    // Founder, later the same day: "God Orchestrator still has the microphone
    // button and I cannot see the drop down". The mic itself is the door now:
    // not disabled without a key, and its click opens the card, never the
    // microphone. The info mark beside it is gone.
    assert.match(src, /disabled=\{!noKey && \(transcribing \|\| busyElsewhere\)\}/, `${name}: without a key the mic is not disabled, so the click can open the card`);
    assert.match(src, /onClick=\{\(\) => \{ if \(noKey\) \{ toggleHint\(\); return; \} freeflowRecorder\.toggle\(agentId\); \}\}/, `${name}: a click without a key opens the card and never the recorder`);
    assert.ok(!src.includes('groqApiKey'), `${name}: the key itself never reaches a component`);
  }
  assert.match(classicMic, /href=\{GROQ_KEYS_URL\}/, 'classic: the link is the shared constant');
  assert.match(classicMic, /<span ref=\{iconRef\} title=\{title\} style=\{\{ display: 'inline-flex' \}\}>\s*(\{\/\*[\s\S]*?\*\/\}\s*)?<PixelButton/, 'classic: the card is anchored on the mic');
  assert.doesNotMatch(classicMic, /<Icon name="info" \/>\s*<\/button>/, 'classic: no info mark beside the mic');
  assert.match(proMic, /proToast\(t\('pro\.voice\.keySaved'\)\)/, 'pro: a toast confirms, since the card closes');
  assert.match(proMic, /<span ref=\{anchorRef\} title=\{title\} style=\{\{ display: 'inline-flex' \}\}>/, 'pro: the card is anchored on the mic');
  assert.doesNotMatch(proMic, /<ProIcon name="ask" size=\{13\} \/>/, 'pro: no question mark beside the mic');
  // The orchestrator's terminal tab had a third, bare mic that no card ever
  // reached. Since 0.5.2 the tab mounts the whole agent composer, and the one
  // voice control comes with it.
  const terminalTab = strip(read('src/renderer/src/components/pro/god/TerminalTab.tsx'));
  assert.match(terminalTab, /import \{ Composer \} from '\.\.\/Composer';/, 'the orchestrator terminal tab mounts the one composer, voice control included');
  assert.match(terminalTab, /<Composer agent=\{agent\} \/>/);
  assert.doesNotMatch(terminalTab, /freeflowRecorder\.toggle|name="mic"/, 'it kept its own bare mic, the one the founder found dead');
});

test('4. both Talk buttons open the key card on click and cannot connect without a key', () => {
  // Classic: the PixelButton is no longer `disabled`, the click opens the card,
  // and connect() sits behind the noKey return.
  assert.doesNotMatch(classicTalk, /disabled=\{noKey\}/, 'classic: a disabled button swallows the click that should open the card');
  assert.match(classicTalk, /const onClick = \(\): void => \{\s*if \(noKey\) \{ toggleHintNow\(\); return; \}\s*if \(status === 'off'\) void connect\(\);/);
  assert.match(classicTalk, /import \{ OPENAI_KEYS_URL, saveOpenAiKey \} from '@\/voice\/keyEntry';/);
  assert.match(classicTalk, /const r = await saveOpenAiKey\(keyDraft\);/);
  assert.match(classicTalk, /data-openai-key-entry/);
  assert.match(classicTalk, /href=\{OPENAI_KEYS_URL\}/);
  assert.match(classicTalk, /t\('realtimeToggle\.createKeyAt'\)/);
  // PRO: same rule on the god screen's button.
  assert.doesNotMatch(proTalk, /disabled=\{!hasKey\}/, 'pro: the Talk button is not disabled without a key');
  assert.match(proTalk, /onClick=\{\(\) => \{ if \(!hasKey\) \{ toggleCard\(\); return; \} if \(status === 'off'\) void connect\(\); else disconnect\(\); \}\}/);
  assert.match(proTalk, /import \{ OPENAI_KEYS_URL, saveOpenAiKey \} from '@\/voice\/keyEntry';/);
  assert.match(proTalk, /\{!hasKey && at && createPortal\(/, 'pro: the card is a portal, drawn only without a key');
  assert.match(proTalk, /data-openai-key-entry/);
  assert.match(proTalk, /proToast\(t\('pro\.god\.voice\.keySaved'\)\)/);
  for (const [name, src] of [['classic', classicTalk], ['pro', proTalk]]) {
    const box = src.slice(src.indexOf('data-openai-key-entry'), src.indexOf('data-openai-key-entry') + 1400);
    assert.match(box, /type="password"/, `${name}: the key is masked`);
    assert.match(box, /aria-label=\{t\('settings\.voice\.openaiKey'\)\}/, `${name}: named like the Settings field`);
    assert.match(box, /if \(isComposingKey\(e\)\) return; if \(e\.key === 'Enter'\) void saveKey\(\);/, `${name}: Enter saves, IME safe`);
  }
  // Settings, Orchestrator's voice (batch 3): only the OpenAI key, into the
  // same broker slot, staged for the footer Save; the cards are the short way in.
  const settings = read('src/renderer/src/components/SettingsModal.tsx');
  assert.match(settings, /set: \(backend, key\) => window\.cth\.providerKeySet\(\{ backend, key \}\)/);
  assert.match(settings, /draft\.setTask\(keyTaskId\('openai'\), edit \? keyTask\('openai', edit, openAiBroker,/);
});

test('5. the strings exist in all three locales without a dash, and zh and ar are written', () => {
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const locales = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) =>
    [l, new Map(flat(JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))))]));
  const keys = [
    'queueComposer.ffPasteKey', 'pro.voice.s2', 'pro.voice.s3', 'pro.voice.keySaved', 'pro.voice.keyFailed',
    'realtimeToggle.popoverBody', 'realtimeToggle.createKeyAt',
    'pro.god.voice.noKey', 'pro.god.voice.keyTitle', 'pro.god.voice.keyLead', 'pro.god.voice.keyCreate', 'pro.god.voice.keySaved',
    'settings.voice.groqKey', 'settings.voice.openaiKey', 'settings.voice.save', 'settings.voice.couldNotSave'
  ];
  for (const k of keys) {
    for (const l of Object.keys(locales)) {
      const v = locales[l].get(k);
      assert.ok(typeof v === 'string' && v.length > 0, `${k} in ${l}`);
      assert.ok(!DASH.test(v), `${k} (${l}) carries a dash`);
    }
    assert.notEqual(locales['zh-CN'].get(k), locales.en.get(k), `${k} zh-CN is the English string`);
    assert.notEqual(locales.ar.get(k), locales.en.get(k), `${k} ar is the English string`);
  }
  assert.equal(locales.en.get('pro.voice.s2'), 'Paste it below and save', 'the step points at the box, not at Settings');
  assert.match(locales.en.get('pro.god.voice.keyLead'), /\{\{name\}\}/, 'the orchestrator is named through interpolation');
  assert.match(locales.en.get('realtimeToggle.popoverBody'), /per minute/, 'the cost is said, since Talk is not free like dictation');
});
