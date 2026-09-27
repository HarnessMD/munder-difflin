'use strict';
/**
 * The Stapler screen's Actions tab, 0.5.2 (card v052-stapler-actions-groq-key-and-icons):
 *   1. every row and section leads with the button as it is on the ring;
 *   2. the Transcription section takes the Groq key and shows that one is on file;
 *   3. NOT a fifth way to store a key: the save is voice/keyEntry's, the key never
 *      touches this component, and the already-saved display is the engines' shape.
 */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');

const screen = strip(read('src/renderer/src/components/pro/PuckScreen.tsx'));
const glyph = read('src/renderer/src/puck/glyph.tsx');
const app = strip(read('src/renderer/src/puck/PuckApp.tsx'));
const button = read('src/renderer/src/components/pro/puck/RingButton.tsx');
const css = read('src/renderer/src/puck/puck.css');

test('1. one glyph table, drawn by the puck and by the screen', () => {
  assert.match(glyph, /export const PUCK_GLYPH_PATHS: Record<string, string>/);
  assert.match(glyph, /export const PUCK_ACTION_GLYPH: Record<PuckAction, string> = \{\s*screenshot: 'screenshot', message: 'mic', meeting: 'video', invisible: 'eye', computerUse: 'computer'\s*\}/);
  assert.match(glyph, /export function PuckGlyph\(/);
  assert.match(app, /import \{ PUCK_ACTION_GLYPH, PuckGlyph as Glyph \} from '\.\/glyph';/, 'the puck draws the shared glyph');
  assert.doesNotMatch(app, /function Glyph\(/, 'no local copy of the paths on the puck');
  assert.match(app, /return PUCK_ACTION_GLYPH\[a\];/, 'the ring picks its resting glyph from the shared table');
  assert.match(button, /import \{ PUCK_ACTION_GLYPH, PuckGlyph \} from '@\/puck\/glyph';/, 'the screen draws the same glyph');
  assert.match(button, /size=\{Math\.round\(size \* 0\.46\)\}/, 'the glyph sits in the disc at the ring\'s own ratio');
  assert.match(app, /size=\{Math\.round\(btnSize \* 0\.46\)\}/);
});

test('2. the ring button on the screen wears the face puck.css gives .puck-btn, in BOTH themes', () => {
  // Since 0.5.3 the stylesheet speaks in --puck-* variables with a light and a
  // dark value each, so the face is resolved per theme before it is compared.
  const bare = css.replace(/\/\*[\s\S]*?\*\//g, '');
  const blockOf = (sel) => { const at = bare.indexOf(`${sel} {`); return bare.slice(at, bare.indexOf('}', at)); };
  const rule = blockOf('.puck-btn');
  const esc = (v) => v.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  for (const [theme, sel] of [['light', ':root'], ['dark', ":root[data-cth-theme='dark']"]]) {
    const vars = blockOf(sel);
    const resolve = (v) => v.replace(/var\((--puck-[\w-]+)\)/g, (_, n) => new RegExp(`${n}:\\s*([^;]+);`).exec(vars)[1].trim());
    const face = button.slice(button.indexOf(`  ${theme}: {`), button.indexOf('}', button.indexOf(`  ${theme}: {`)));
    assert.ok(face.length > 20, `RingButton has no ${theme} face`);
    const bg = resolve(/background:\s*([^;]+);/.exec(rule)[1]);
    const color = resolve(/\n\s*color:\s*([^;]+);/.exec(rule)[1]);
    const border = resolve(/border:\s*([^;]+);/.exec(rule)[1]);
    assert.match(face, new RegExp(`background: '${esc(bg)}'`), `${theme}: same disc colour as the ring`);
    assert.match(face, new RegExp(`color: '${esc(color)}'`), `${theme}: same glyph colour as the ring`);
    assert.match(face, new RegExp(`border: '${esc(border)}'`), `${theme}: same hairline as the ring`);
  }
  assert.match(button, /RING_BUTTON_FACE\[useAppTheme\(\)\]/, 'and it picks the face by the live theme');
  assert.match(button, /borderRadius: '50%'/);
});

test('3. every ring row, and every group that belongs to a ring button, leads with that button', () => {
  // 24 Sep 2026 redesign: the Actions tab folded into the settings tab. The
  // ring rows sit in General; Dictation, Meetings and Screenshots are groups
  // whose header is the ring button they configure.
  const tab = screen.slice(screen.indexOf('function ActionsTab('), screen.indexOf('function DictationGroup('));
  assert.match(tab, /icon=\{<RingButton action=\{a\} size=\{24\} \/>\}/, 'each action row');
  const settings = screen.slice(screen.indexOf('function SettingsTab('), screen.indexOf('function PuckTab('));
  for (const [group, action] of [['dictation', 'message'], ['meetings', 'meeting'], ['screenshots', 'screenshot']]) {
    assert.match(settings, new RegExp(`<Group id="${group}" icon=\\{<RingButton action="${action}" size=\\{22\\} />\\}`), `${group} leads with the ${action} button`);
  }
  assert.doesNotMatch(screen, /ACTION_ICON/, 'the generic icon table is gone');
  assert.doesNotMatch(tab, /<ProIcon /, 'no generic icon leads a ring row');
});

test('4. the Groq key field is one door, and the key never touches the screen', () => {
  assert.match(screen, /import \{ saveGroqKey \} from '@\/voice\/keyEntry';/, 'saving is keyEntry\'s rule');
  const field = screen.slice(screen.indexOf('function GroqKeyField('));
  // 0.5.3, batch 2 #12: the key waits for the screen's one Save, as a task.
  assert.match(field, /page\.setTask\('groqKey', key \? async \(\) => \{\s*const r = await saveGroqKey\(key\);/);
  assert.match(field, /type="password"/);
  assert.match(field, /autoComplete="off"/);
  assert.doesNotMatch(screen, /groqApiKey|freeflowSetConfig|providerKeySet/, 'no second path to the store and no read of the key');
  assert.match(field, /useEffect\(\(\) => \{ if \(!waiting\) setDraft\(''\); \}, \[waiting\]\);/, 'the typed key is dropped the moment it is saved');
  assert.match(field, /if \(r\.ok === false\) throw|if \(!r\.ok\) throw new Error\(t\('settings\.voice\.couldNotSave'\)\);/, 'a refused key stays in the draft and is named in the footer');
  assert.match(field, /if \(isComposingKey\(e\)\) return; if \(e\.key === 'Enter'\) e\.preventDefault\(\);/, 'Enter never saves on its own, IME safe');
  // Presence only, from the store, the same flag the microphone reads.
  assert.match(screen, /const hasGroqKey = useStore\(\(s\) => s\.hasGroqKey\);/);
  assert.match(screen, /<GroqKeyField hasGroqKey=\{hasGroqKey\} \/>/);
});

test('5. already saved reads the way the engines screen reads it, with strings every locale has', () => {
  const field = screen.slice(screen.indexOf('function GroqKeyField('));
  assert.match(field, /label=\{hasGroqKey \? `\$\{t\('settings\.voice\.groqKey'\)\} \$\{t\('aiEngines\.setCheck'\)\}` : t\('settings\.voice\.groqKey'\)\}/);
  assert.match(field, /placeholder=\{waiting && !draft \? t\('pro\.puck\.keyWaiting'\) : hasGroqKey \? t\('aiEngines\.keyStoredPlaceholder'\) : t\('settings\.voice\.groqPlaceholder'\)\}/);
  assert.match(field, /hint=\{hasGroqKey \? t\('pro\.puck\.keyOk'\) : t\('pro\.puck\.keyMissing'\)\}/);
  const engines = read('src/renderer/src/components/settings/KeysSecretsSection.tsx');
  assert.match(engines, /aiEngines\.setCheck/); assert.match(engines, /aiEngines\.keyStoredPlaceholder/);
  const get = (o, k) => k.split('.').reduce((a, b) => (a && typeof a === 'object' ? a[b] : undefined), o);
  for (const loc of ['en', 'ar', 'zh-CN']) {
    const j = JSON.parse(read(`src/renderer/src/i18n/locales/${loc}.json`));
    for (const k of ['aiEngines.setCheck', 'aiEngines.keyStoredPlaceholder', 'settings.voice.groqKey', 'settings.voice.groqPlaceholder', 'settings.voice.save', 'settings.voice.couldNotSave', 'pro.voice.keySaved', 'pro.puck.keyOk', 'pro.puck.keyMissing']) {
      assert.ok(typeof get(j, k) === 'string' && get(j, k).length > 0, `${loc}: ${k}`);
    }
  }
});

test('6. keyEntry names the fifth surface, and the transcriber in main reads the same slot', () => {
  assert.match(read('src/renderer/src/voice/keyEntry.ts'), /the Stapler screen's Transcription section/);
  assert.match(read('src/renderer/src/voice/keyEntry.ts'), /window\.cth\.freeflowSetConfig\(\{ apiKey: key \}\)/);
  assert.match(read('src/main/puck.ts'), /readConfig\(\)\.groqApiKey/, 'the Stapler transcribes with the key this field saves');
});
