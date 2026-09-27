// PRO 0.4.9 phase 2b: the agent sheet, one door for add and edit (decision D3).
// The host is mounted once in ProShell, the header button and the grid's Add
// card open it, add writes spawnPty then addAgent in the modal's order, edit
// writes through renameAgent / updateAgent, the token cap goes through the
// config door, the preview is a live binding on the sprite (never initials),
// no banned word reaches a PRO string, and every string exists in three locales.
const { test } = require('node:test');
const assert = require('node:assert');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(ROOT, p), 'utf8');
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '');
const PRO = 'src/renderer/src/components/pro';
const sheet = strip(read(`${PRO}/AgentSheet.tsx`));
const gallery = strip(read(`${PRO}/AvatarGallery.tsx`));
const shell = strip(read(`${PRO}/ProShell.tsx`));
const grid = strip(read(`${PRO}/AgentsScreen.tsx`));
const app = strip(read('src/renderer/src/App.tsx'));

test('the host is mounted once in ProShell, inside the pane provider, beside the task sheet', () => {
  assert.equal((shell.match(/<AgentSheetHost config=\{config\} \/>/g) || []).length, 1);
  assert.match(shell, /<PaneNavProvider value=\{nav\}>[\s\S]*<TaskSheetHost \/>[\s\S]*<AgentSheetHost config=\{config\} \/>[\s\S]*<\/PaneNavProvider>/);
  assert.ok(!/onAddAgent/.test(shell), 'ProShell no longer takes an onAddAgent prop');
  assert.ok(!/onAddAgent/.test(app), 'App no longer passes onAddAgent to ProShell');
});

test('adding has one door in PRO: the header button and the Add card open the sheet', () => {
  assert.equal((grid.match(/openAgentSheet\(\{ mode: 'add' \}\)/g) || []).length, 2, 'the header button and the Add card');
  assert.ok(!/onAddAgent/.test(grid), 'AgentsScreen no longer takes onAddAgent');
  assert.match(grid, /import \{ openAgentSheet \} from '\.\/agentSheetStore'/);
  assert.match(sheet, /export function AgentSheetHost\(/);
  assert.match(sheet, /useAgentSheet\(\)/);
  assert.match(sheet, /<Sheet onClose=\{close\} width=\{SHEET_WIDTH\}>/, 'the kit Sheet: Esc and the backdrop close it');
});

test('PRO never reaches the Classic modals, and a hire deep link opens the sheet in PRO', () => {
  // Subdirectories included (pro/god, pro/onboarding): they are PRO too.
  const files = (dir) => fs.readdirSync(path.join(ROOT, dir), { withFileTypes: true })
    .flatMap((e) => (e.isDirectory() ? files(`${dir}/${e.name}`) : [`${dir}/${e.name}`]));
  for (const f of files(PRO)) {
    const src = strip(read(f));
    assert.ok(!/from '(\.\.\/)+AddAgentModal'/.test(src), `${f} imports AddAgentModal`);
  }
  assert.ok(!/AddAgentModal|EditAgentModal/.test(sheet));
  assert.match(app, /if \(skin === 'professional'\) openAgentSheet\(\{ mode: 'add' \}\);\s*else setAddAgentOpen\(true\);/);
  assert.match(app, /\{addAgentOpen && skin !== 'professional' && \(\s*<AddAgentModal/, 'the Classic modal is never drawn over PRO');
});

test('add writes spawnPty then addAgent, in the modal\'s order, with the same record', () => {
  const submit = sheet.slice(sheet.indexOf('const submit = async'), sheet.indexOf('const save = async'));
  const spawnAt = submit.indexOf('window.cth.spawnPty(');
  const addAt = submit.indexOf('addAgent(record)');
  const reposAt = submit.indexOf("updateConfig({ registeredRepos");
  const capAt = submit.indexOf('window.cth.setAgentTokenCap(id, cap)');
  assert.ok(spawnAt > 0 && addAt > spawnAt && reposAt > addAt && capAt > reposAt, 'spawnPty, addAgent, registeredRepos, token cap, in that order');
  for (const field of ['id: ptyId', 'cwd,', 'command: exe', 'provider,', 'args,', 'isolate: wantIsolate', 'resumeSessionId: resuming', 'hive: {', 'role: description.trim() || undefined', 'capabilities: hireMeta?.capabilities']) {
    assert.ok(submit.includes(field), `spawnPty carries ${field}`);
  }
  assert.match(submit, /tokenizeCommand\(command\.trim\(\)\)/, 'the command is split quote aware, as the modal does');
  assert.match(submit, /worktreePath: spawnRes\.worktreePath/);
  assert.match(submit, /seedPrompt: spawnRes\.seedPrompt/);
  assert.match(submit, /proToast\(t\('pro\.sheet\.toastAdded'\)/);
  assert.match(submit, /if \(pendingHire\) advanceHireReview\(\);/, 'a batch of files advances instead of closing');
});

test('edit writes through renameAgent and updateAgent, with the engine patch EditAgentModal sent', () => {
  const save = sheet.slice(sheet.indexOf('const save = async'), sheet.indexOf('/* ---- options'));
  assert.match(save, /await renameAgent\(agent\.id, trimmedName\)/);
  assert.match(save, /updateAgent\(agent\.id, patch\)/);
  assert.match(save, /patch\.provider = provider; patch\.model = model; patch\.command = nextCommand;/);
  assert.match(save, /buildSpawnCommand\(config, model, provider\)/, 'the command is rebuilt from provider and model');
  assert.match(save, /window\.cth\.setAgentTokenCap\(agent\.id, cap\)/, 'the token cap goes through the config door');
  assert.match(save, /toastSavedEngine/);
  assert.match(sheet, /t\('pro\.sheet\.engineNextStart'\)/, 'the sheet says engine changes apply on the next start');
});

test('the sheet uses the PRO avatar gallery and the sprite, never initials', () => {
  // Founder item 14c: the Avatar section is the PRO native gallery, not
  // Classic's CharacterPicker (which mounts the pixel kit SpriteEditor).
  assert.match(sheet, /import \{ AvatarGallery \} from '\.\/AvatarGallery'/);
  assert.match(sheet, /<AvatarGallery\s+value=\{character\}/);
  assert.ok(!/CharacterPicker/.test(sheet), 'the sheet no longer mounts CharacterPicker');
  assert.match(sheet, /<SpritePortrait character=\{character\}[^>]*forceSprite/);
  assert.ok(!/initials/i.test(sheet) && !/initials/i.test(gallery), 'no initials anywhere');
  // The gallery is PRO native: it draws its one glyph inline and never reaches
  // Classic's icon set, its picker, or the pixel kit editor.
  assert.ok(!/from '[^']*\/Icon'/.test(gallery), 'AvatarGallery must not import components/Icon');
  assert.ok(!/CharacterPicker|SpriteEditor/.test(gallery), 'AvatarGallery must not reach the Classic picker or editor');
  assert.match(gallery, /const PLUS_PATH = '/);
});

test('founder item 14c: one gallery lists every face, large and crisp, create first', () => {
  // All three sources, in one place: the fifteen cast members, this install's
  // custom avatars, and the generated presets.
  assert.match(gallery, /OFFICE_CAST\.map\(/);
  assert.match(gallery, /useStore\(\(s\) => s\.avatars\)/);
  assert.match(gallery, /Array\.from\(\{ length: PRESET_COUNT - 1 \}/);
  // ONE grid, no headings anywhere (founder, 5 Sep 2026): create leads, the
  // custom avatars follow, the cast flows on from the same row, Darrell (the
  // promoted first preset) sits with the office, and the numbered presets
  // start exactly where the office people end. Four rows show until See more.
  const createAt = gallery.indexOf('<CreateTile');
  const castAt = gallery.indexOf('OFFICE_CAST.map(');
  const darrellAt = gallery.indexOf('label="Darrell"');
  const presetsAt = gallery.indexOf('length: PRESET_COUNT - 1');
  assert.ok(createAt > 0 && castAt > createAt && darrellAt > castAt && presetsAt > darrellAt,
    'create, then the cast, then Darrell, then the numbered presets, one list');
  assert.equal((gallery.match(/<GallerySection/g) || []).length, 1, 'exactly one grid, no sections');
  assert.ok(!/pro\.sheet\.gallery\.(yours|cast|presets)'/.test(gallery), 'no sub headings at all; preset appears only in a tile name');
  assert.match(gallery, /const DARRELL = presetAvatarId\(0\);/);
  assert.match(gallery, /onPick\(DARRELL, 'Darrell'\)/, 'picking him suggests the name like any office member');
  // Four rows, then the rest behind one button.
  assert.match(gallery, /const VISIBLE_TILES = 20;/);
  assert.match(gallery, /expanded \? tiles : tiles\.slice\(0, VISIBLE_TILES\)/);
  assert.match(gallery, /pro\.sheet\.gallery\.seeMore/);
  // Large and crisp: an integer multiple of the source frame; SpritePortrait
  // renders with image-rendering pixelated so nothing blurs.
  assert.match(gallery, /const TILE_SCALE = 3/);
  assert.match(gallery, /<SpritePortrait character=\{character\} scale=\{TILE_SCALE\} forceSprite \/>/);
  // Selected state: a 1px accent border plus a check chip; a name under every face.
  assert.match(gallery, /border: `1px solid \$\{on \? `var\(--cth-\$\{accent\}\)` : 'var\(--cth-ink-300\)'\}`/);
  assert.match(gallery, /pro\.sheet\.gallery\.selected/);
  assert.match(gallery, /\{label\}/);
  // Hover lift, the AgentsScreen card pattern.
  assert.match(gallery, /\.pro-avatar-tile:hover\{transform:translateY\(-2px\)/);
  // The creator persists through the one config door and never draws Classic.
  assert.match(gallery, /api\.saveAvatar\(\{ name, recipe \}\)/);
  assert.match(gallery, /randomRecipe\(/);
  assert.match(gallery, /import\('@\/scene\/office\/portraitArt'\)/);
});

test('founder item 14b: the sections read Name, Avatar, Providers, Workspace, Isolation, then the rest', () => {
  const order = ['name', 'avatar', 'providers', 'workspace', 'isolation', 'briefing']
    .map((k) => sheet.indexOf(`<Group title={t('pro.sheet.${k}')}>`));
  for (const [i, at] of order.entries()) {
    assert.ok(at > 0, `group ${i} is missing`);
    if (i > 0) assert.ok(at > order[i - 1], `group ${i} is out of order`);
  }
  assert.ok(!/pro\.sheet\.identity|pro\.sheet\.engine'\)\}>/.test(sheet), 'the old Identity and Engine group titles are gone');
});

test('the preview card is a live binding on the name field, not a Draft commit', () => {
  assert.match(sheet, /value=\{name\}[\s\S]{0,400}onChange=\{\(e\) => \{\s*const next = e\.target\.value;\s*setName\(next\);/);
  assert.match(sheet, /\{name\.trim\(\) \|\| t\('pro\.sheet\.newAgent'\)\}/, 'the preview reads the same state');
  assert.match(sheet, /\{firstSentence\(description\) \|\| t\('pro\.sheet\.rolePreview'\)\}/);
  assert.ok(!/<Draft\b/.test(sheet), 'no Draft in the sheet: nothing is written until the button');
  // The six swatches map to the six store accents.
  assert.match(sheet, /const ACCENTS: AccentColorName\[\] = \['coral', 'mint', 'sky', 'lemon', 'lilac', 'peach'\]/);
  assert.match(sheet, /background: `var\(--cth-\$\{a\}\)`/);
});

test('the spawn command is visible and editable in both renderings, under the provider', () => {
  // Amended 5 Sep 2026 (founder): D1's command-is-technical-only rule fell.
  // One always-editable input, resolved from the provider and model picks,
  // with the ghost restore appearing only while a hand edit differs.
  assert.match(sheet, /const technical = useTechnical\(\)/);
  assert.match(sheet, /customEngine \? \([\s\S]*?\) : \([\s\S]*?hint=\{t\('pro\.sheet\.spawnHint'\)\}/, 'the command field renders unconditionally');
  // 0.5.3: the input and its diff gated restore button moved into the one shared
  // control, pro/CommandField.tsx, which the orchestrator tab uses too.
  assert.match(sheet, /<CommandField ariaLabel=\{t\('pro\.sheet\.command'\)\} value=\{command\} resolved=\{buildSpawnCommand\(config, model, provider\)\} onChange=\{setCommand\}/);
  assert.match(read('src/renderer/src/components/pro/CommandField.tsx'), /\{resolved && value\.trim\(\) !== resolved\.trim\(\) && \(/, 'the restore button is diff gated');
  assert.ok(!/commandEditing/.test(sheet), 'the view-or-edit toggle is gone; the input is the surface');
  assert.ok(!/\.audience\b/.test(sheet), 'the sheet never reads config.audience');
});

test('the token cap is a segmented control with the three prototype steps plus another number', () => {
  assert.match(sheet, /\{ choice: '200k', tokens: 200_000 \},\s*\{ choice: '800k', tokens: 800_000 \},\s*\{ choice: '2M', tokens: 2_000_000 \}/);
  assert.match(sheet, /<Seg<CapChoice>/);
  assert.match(sheet, /capChoice === 'other' && \(\s*<input/);
});

test('founder item 14a: Start faster is gone from the sheet, and its code went with it', () => {
  // The import JSON door, the AI prompt and the templates left the sheet.
  assert.ok(!/startFaster|addFromFile|copyPrompt|templateSelect/.test(sheet), 'no Start faster strings remain');
  assert.ok(!/importHireFiles|HIRE_PROMPT|enqueuePendingHires|BRIEFING_TEMPLATES|hireTemplates/.test(sheet), 'the dead code is deleted, not stranded');
  // Classic keeps its own import door, so the capability still exists in the app.
  const modal = strip(read('src/renderer/src/components/AddAgentModal.tsx'));
  assert.match(modal, /window\.cth\.importHireFiles\(\)/);
});

test('the hire deep link review survives: flags, skills, tool consent, skip', () => {
  // Deep links and file batches still enqueue through App and are reviewed
  // here, one Add or Skip per manifest; only the in-sheet import door is gone.
  assert.match(app, /enqueuePendingHires\(/);
  assert.match(sheet, /finishPendingHire\(\)/);
  assert.match(sheet, /tier === 'safe-readonly'/);
  assert.match(sheet, /m\.commandFlags/);
  assert.match(sheet, /m\.skills/);
  assert.match(sheet, /window\.cth\.resolveSessionCwd\(sid\)/);
  assert.match(sheet, /window\.cth\.chooseFolder\(\)/);
});

test('no borrowed pixels, no literal colours, no thick edges, no dashes in the strings', () => {
  for (const [name, src] of [['AgentSheet', sheet], ['AvatarGallery', gallery]]) {
    assert.ok(!/from ['"][^'"]*\/(PixelPanel|PixelButton|PixelBadge|Icon)['"]/.test(src), `${name} borrows pixels`);
    assert.ok(!/#[0-9a-fA-F]{3,8}\b/.test(src.replace(/\/\/.*$/gm, '')), `no literal hex in ${name}`);
    for (const m of src.matchAll(/border(Left|Right|Top|Bottom)\s*:\s*[`'"]([^`'"]+)[`'"]/g)) assert.match(m[2], /^1px /);
  }
});

const BANNED = /\b(harness config|hive|floor|spawn|spawned|spawns|palace|awaiting|starting up|block tools|semantic memory|pty)\b/i;

test('every pro.sheet key the sheet and the gallery use exists in all three locales, and en carries no banned word or dash', () => {
  const keys = new Set([...sheet.matchAll(/t\('(pro\.[a-zA-Z.]+)'/g), ...gallery.matchAll(/t\('(pro\.[a-zA-Z.]+)'/g)].map((m) => m[1]));
  for (const a of ['coral', 'mint', 'sky', 'lemon', 'lilac', 'peach']) keys.add(`pro.sheet.swatch.${a}`);
  assert.ok(keys.size > 70, `parser found only ${keys.size} keys; the guard is disarmed`);
  const dicts = Object.fromEntries(['en', 'zh-CN', 'ar'].map((l) => [l, JSON.parse(read(`src/renderer/src/i18n/locales/${l}.json`))]));
  const get = (d, k) => k.split('.').reduce((o, p) => (o && typeof o === 'object' ? o[p] : undefined), d);
  for (const lang of Object.keys(dicts)) for (const k of keys) assert.equal(typeof get(dicts[lang], k), 'string', `${lang} is missing ${k}`);
  const flat = (o, p = '') => Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' ? flat(v, `${p}${k}.`) : [[`${p}${k}`, v]]));
  const en = flat(dicts.en.pro.sheet);
  for (const [k, v] of en) {
    assert.ok(!BANNED.test(v), `pro.sheet.${k} uses a banned word: ${v}`);
    assert.ok(!/—|–| - /.test(v), `pro.sheet.${k} carries a dash: ${v}`);
  }
  // The prototype's words, verbatim.
  assert.equal(get(dicts.en, 'pro.sheet.subAdd'), 'Nothing starts until you add it.');
  assert.equal(get(dicts.en, 'pro.sheet.subEdit'), 'Changes save on Done. Engine changes apply on the next start.');
  assert.equal(get(dicts.en, 'pro.sheet.toastAdded'), 'Agent added. It appears on the grid, idle, ready for a first task.');
  assert.equal(get(dicts.en, 'pro.sheet.toastSavedEngine'), 'Saved. Engine changes apply on the next start.');
  assert.equal(get(dicts.en, 'pro.sheet.add'), 'Add agent');
  assert.equal(get(dicts.en, 'pro.sheet.done'), 'Done');
});
