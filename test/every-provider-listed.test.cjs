'use strict';

/* 0.5.3 feature 17: every supported CLI is listed wherever an agent's engine is
 * chosen. The worker pickers already list all of them (pinned below so they
 * stay that way). The gap was the two orchestrator pickers, which HID the
 * engines that cannot run him instead of listing them as unavailable.
 *
 * NOT changed, on purpose: the hire manifest accepts four engines. That list
 * sits inside a default deny allowlist for manifests that arrive from the
 * internet, reviewed three times for flag smuggling against those CLIs only.
 * Widening it is a security decision, not a picker. */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const { AGENT_PROVIDER_PRESETS } = loadTs('src/shared/agentProvider.ts');
const { orchestratorEngineOptions } = loadTs('src/shared/engineOptions.ts');
const read = (p) => fs.readFileSync(path.join(__dirname, '..', p), 'utf8');

const ENGINES = AGENT_PROVIDER_PRESETS.map((p) => p.id).filter((id) => id !== 'custom');

test('the orchestrator picker lists EVERY engine, and the ones that cannot run him are disabled, not hidden', () => {
  const opts = orchestratorEngineOptions('TEMPS ONLY');
  assert.deepEqual(opts.map((o) => o.value).sort(), [...ENGINES].sort(), 'an engine is missing from the list');
  for (const o of opts) {
    const preset = AGENT_PROVIDER_PRESETS.find((p) => p.id === o.value);
    assert.equal(!!o.disabled, !preset.canReceiveInbox, `${o.value} disabled flag`);
    if (o.disabled) assert.ok(o.label.includes('TEMPS ONLY'), `${o.value} does not say why it is disabled`);
  }
  // Selectable ones first, so the list opens on something a person can pick.
  const firstDisabled = opts.findIndex((o) => o.disabled);
  assert.ok(firstDisabled > 0 && opts.slice(firstDisabled).every((o) => o.disabled));
});

test('HAS IT RUN: both orchestrator pickers use it, and say why a row is disabled', () => {
  const tab = read('src/renderer/src/components/pro/god/ConfigTab.tsx');
  assert.match(tab, /orchestratorEngineOptions\(t\('onboarding\.orchestrator\.workersOnly'\)\)/);
  assert.doesNotMatch(tab, /const providers = modelProvidersForAgent\(true\)\.map/);
  assert.match(tab, /onboarding\.orchestrator\.workersOnlyHint/);
  const classic = read('src/renderer/src/components/CommandCenterPanel.tsx');
  assert.match(classic, /orchestratorEngineOptions\(t\('onboarding\.orchestrator\.workersOnly'\)\)\.map\(/);
  assert.doesNotMatch(classic, /AGENT_PROVIDER_PRESETS\.filter\(\(p\) => canReceiveInbox\(p\.id\)\)\.map/);
  assert.match(read('src/renderer/src/components/pro/ui.tsx'), /<option key=\{o\.value\} value=\{o\.value\} disabled=\{o\.disabled\}>/);
});

test('the worker pickers list every engine, custom included, and stay that way', () => {
  for (const f of ['src/renderer/src/components/pro/AgentSheet.tsx', 'src/renderer/src/components/pro/AgentScreen.tsx']) {
    assert.match(read(f), /const providerOptions = AGENT_PROVIDER_PRESETS\.map\(\(p\) => \(\{ value: p\.id, label: p\.label \}\)\);/, f);
  }
  for (const f of ['src/renderer/src/components/EditAgentModal.tsx', 'src/renderer/src/components/AddAgentModal.tsx']) {
    assert.match(read(f), /\{AGENT_PROVIDER_PRESETS\.map\(\(p\) => \{/, f);
  }
  assert.equal(AGENT_PROVIDER_PRESETS.length, 13, 'an engine was added or removed: check every picker lists it');
});
