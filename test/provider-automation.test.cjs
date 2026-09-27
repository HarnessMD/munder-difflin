'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const loadTs = require('./load-ts.cjs');

const {
  PTY_SUBMIT_DELAY_MS,
  clearCommandForProvider,
  compactionCommandForProvider,
  contextCommandsForProvider,
  isCompactionCommand,
  remoteControlCommandForProvider,
  terminalReadySettleMs,
  terminalReadyToReceive
} = loadTs('src/shared/providerAutomation.ts');

// — the queue's one-pending-compact invariant depends entirely on this predicate —

test('isCompactionCommand matches every provider that has a compact verb', () => {
  for (const p of ['claude', 'codex', 'grok', 'kimi', 'qwen', 'opencode', 'pi', 'copilot', 'cursor']) {
    const cmd = compactionCommandForProvider(p, '');
    if (!cmd) continue; // provider has no typeable compaction — nothing to dedupe
    assert.equal(isCompactionCommand(cmd), true, `${p}: ${cmd}`);
  }
});

test('a focus suffix still reads as a compaction command', () => {
  // This is the real queued shape — the trigger appends the operator's focus
  // text, so matching the whole string instead of the verb would never dedupe.
  assert.equal(isCompactionCommand('/compact keep the auth decisions'), true);
  assert.equal(isCompactionCommand('  /compact   keep everything  '), true);
});

test('prose that merely mentions compaction is NOT a command', () => {
  // The queue carries human instructions too; dropping one as a duplicate
  // compact would silently lose real work.
  assert.equal(isCompactionCommand('please /compact when you are done'), false);
  assert.equal(isCompactionCommand('compact the context'), false);
  assert.equal(isCompactionCommand('summarise and compact'), false);
  assert.equal(isCompactionCommand(''), false);
});

test('a clear command is not a compaction command', () => {
  assert.equal(isCompactionCommand('/clear'), false);
  assert.equal(isCompactionCommand('/new'), false);
});
const { DEFAULT_COMPACTION_FOCUS } = loadTs('src/shared/triggers.ts');
const { AGENT_PROVIDER_PRESETS } = loadTs('src/shared/agentProvider.ts');

test('each provider receives only its supported compaction syntax', () => {
  // Verbs differ per CLI: qwen dropped gemini-cli's /compact alias for /compress.
  assert.equal(compactionCommandForProvider('claude', ''), '/compact');
  assert.equal(compactionCommandForProvider('codex', ''), '/compact');
  assert.equal(compactionCommandForProvider('grok', ''), '/compact');
  assert.equal(compactionCommandForProvider('kimi', ''), '/compact');
  assert.equal(compactionCommandForProvider('qwen', ''), '/compress');
  assert.equal(compactionCommandForProvider('opencode', ''), '/compact');
  assert.equal(compactionCommandForProvider('pi', ''), '/compact');

  // No command we can trust → no keystrokes at all.
  for (const p of ['antigravity', 'crush', 'copilot', 'cursor', 'custom']) {
    assert.equal(compactionCommandForProvider(p), null, p);
  }
});

test('the focus rides along only where the TUI parses it', () => {
  const focus = 'keep the auth decisions';
  assert.equal(compactionCommandForProvider('claude', focus), `/compact ${focus}`);
  assert.equal(compactionCommandForProvider('grok', focus), `/compact ${focus}`);
  assert.equal(compactionCommandForProvider('kimi', focus), `/compact ${focus}`);
  assert.equal(compactionCommandForProvider('pi', focus), `/compact ${focus}`);
  assert.equal(compactionCommandForProvider('qwen', focus), `/compress ${focus}`);

  // codex/opencode ignore trailing text, so it must be dropped, not typed.
  assert.equal(compactionCommandForProvider('codex', focus), '/compact');
  assert.equal(compactionCommandForProvider('opencode', focus), '/compact');

  // Omitting the message keeps the trigger default, not a bare command.
  assert.equal(
    compactionCommandForProvider('claude'),
    `/compact ${DEFAULT_COMPACTION_FOCUS}`
  );
  // A whitespace-only message counts as empty.
  assert.equal(compactionCommandForProvider('claude', '   '), '/compact');
});

test('clearing uses each CLI own verb, not a hardcoded /clear', () => {
  assert.equal(clearCommandForProvider('claude'), '/clear');
  assert.equal(clearCommandForProvider('codex'), '/clear');
  assert.equal(clearCommandForProvider('kimi'), '/clear');
  assert.equal(clearCommandForProvider('qwen'), '/clear');
  // agy's /clear resets the conversation; Ctrl+L is the screen-only one.
  assert.equal(clearCommandForProvider('antigravity'), '/clear');
  // These three start a fresh session instead — '/clear' is not a command there.
  assert.equal(clearCommandForProvider('grok'), '/new');
  assert.equal(clearCommandForProvider('opencode'), '/new');
  assert.equal(clearCommandForProvider('pi'), '/new');
  // Palette-only TUI, print-mode CLI, Cursor (unverified slash surface), unknown binary.
  for (const p of ['crush', 'copilot', 'cursor', 'custom']) {
    assert.equal(clearCommandForProvider(p), null, p);
  }
});

test('a non-empty clear message overrides the table verbatim', () => {
  assert.equal(clearCommandForProvider('grok', '/clear'), '/clear');
  // The operator escape hatch for providers the table answers null for.
  assert.equal(clearCommandForProvider('crush', '/reset'), '/reset');
});

test('every provider preset has a considered context-command entry', () => {
  // Guards the whole point of the table: a new provider must be looked up, not
  // silently defaulted. A missing key would fall back to the all-null entry.
  for (const preset of AGENT_PROVIDER_PRESETS) {
    const entry = contextCommandsForProvider(preset.id);
    assert.ok(entry, preset.id);
    assert.ok(entry.compact === null || entry.compact.startsWith('/'), preset.id);
    assert.ok(entry.clear === null || entry.clear.startsWith('/'), preset.id);
    assert.equal(typeof entry.compactTakesFocus, 'boolean', preset.id);
  }
});

test('Claude alone receives a remote-control slash command', () => {
  assert.equal(remoteControlCommandForProvider('claude', 'Michael'), '/remote-control Michael');
  assert.equal(remoteControlCommandForProvider('codex', 'Jim'), null);
  assert.equal(remoteControlCommandForProvider('grok', 'Grok'), null);
  assert.equal(remoteControlCommandForProvider('kimi', 'Pam'), null);
});

test('provider readiness policies allow each TUI to settle', () => {
  assert.equal(terminalReadySettleMs('claude'), 400);
  assert.equal(terminalReadySettleMs('codex'), 500);
  assert.equal(terminalReadySettleMs('grok'), 500);
  assert.equal(terminalReadySettleMs('kimi'), 650);
});

test('continuous TUI repainting cannot block terminal readiness', () => {
  assert.equal(terminalReadyToReceive(false, 10_000, 'codex'), false);
  assert.equal(terminalReadyToReceive(true, 499, 'codex'), false);
  assert.equal(terminalReadyToReceive(true, 500, 'codex'), true);
  assert.equal(terminalReadyToReceive(undefined, 500, 'codex'), true);
});

// ── the submit gap: one constant, both writers ──────────────────────────────
//
// The Return that submits a delivered message is written a fixed gap after the
// text. That gap was a literal 140 in two files and named in neither, so raising
// one looked done and was not (0.5.1, the stuck-input diagnosis). Both writers
// import the one constant now; these tests keep it that way.

const fs = require('node:fs');
const path = require('node:path');
const readSource = (rel) => fs.readFileSync(path.join(__dirname, '..', rel), 'utf8');

test('the submit gap is the founder\'s 240ms', () => {
  assert.equal(PTY_SUBMIT_DELAY_MS, 240);
});

test('both submit sites time their Return by the shared constant, never a literal', () => {
  const hive = readSource('src/renderer/src/hooks/useHive.ts');
  // F2: useHive types through typeAndSubmit, which times its Return by the
  // constant (and, since F2, also waits for the text to show first).
  assert.match(hive, /await typeAndSubmit\(/, 'useHive.ts submits through the shared typeAndSubmit');
  const shared = readSource('src/shared/providerAutomation.ts');
  const body = shared.slice(shared.indexOf('export async function typeAndSubmit'));
  assert.match(body, /await io\.sleep\(PTY_SUBMIT_DELAY_MS\);\n\s*let before = box\(\);\n\s*await io\.write\('\\r'\)/, 'the Return follows PTY_SUBMIT_DELAY_MS');

  const hidden = readSource('src/main/hiddenClaude.ts');
  assert.match(
    hidden,
    /import \{[^}]*\bPTY_SUBMIT_DELAY_MS\b[^}]*\} from '\.\.\/shared\/providerAutomation'/,
    'hiddenClaude.ts must import the constant from shared/providerAutomation'
  );
  assert.match(
    hidden,
    /ptyProc\.write\('\\r'\); \}, PTY_SUBMIT_DELAY_MS\)/,
    'hiddenClaude.ts: the Return must follow the text after PTY_SUBMIT_DELAY_MS'
  );

  // And no Return write in either file may be timed by a bare number: that is
  // the shape that drifted. Look at the two lines above every '\r' write.
  for (const [name, src] of [['useHive.ts', hive], ['hiddenClaude.ts', hidden]]) {
    const lines = src.split('\n');
    lines.forEach((line, i) => {
      if (!/write(?:Pty)?\([^)]*'\\r'\)/.test(line)) return;
      const above = lines.slice(Math.max(0, i - 2), i + 1).join('\n');
      assert.doesNotMatch(
        above,
        /setTimeout\([^)]*,\s*\d[\d_]*\s*\)/,
        `${name}:${i + 1} times its Return by a literal instead of PTY_SUBMIT_DELAY_MS`
      );
    });
  }
});
