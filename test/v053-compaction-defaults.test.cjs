/**
 * 0.5.3, founder 23 Sep 2026: auto compaction defaults to every 40 minutes at
 * 30% of the context window, and 30% on a ~1M window too (his word, same day:
 * one bar for both). The maintenance mission and
 * the context trigger carry the same cadence. A persisted rule that still reads
 * exactly like the 0.5.2 seed follows the new default; one that anybody edited
 * keeps its numbers.
 */
'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const loadTs = require('./load-ts.cjs');

const userData = fs.mkdtempSync(path.join(os.tmpdir(), 'md-compact-defaults-'));
const electron = require.resolve('electron');
require.cache[electron] = { id: electron, filename: electron, loaded: true, exports: { app: { getPath: () => userData } } };

const { DEFAULT_CONTEXT_TRIGGER } = loadTs('src/shared/triggers.ts');
const { COMPACT_MAINTENANCE_MISSION, readConfig } = loadTs('src/main/config.ts');
const configPath = path.join(userData, 'config.json');
const MIN_40 = 40 * 60 * 1000;

function persist(cfg) { fs.writeFileSync(configPath, JSON.stringify(cfg), 'utf8'); }

test('the defaults: 40 minutes, 30% on both window sizes, and the mission agrees', () => {
  assert.equal(DEFAULT_CONTEXT_TRIGGER.compact.everyMs, MIN_40);
  assert.equal(DEFAULT_CONTEXT_TRIGGER.compact.minContextPct, 30);
  assert.equal(DEFAULT_CONTEXT_TRIGGER.compact.minContextPctLargeWindow, 30, 'one bar for both window sizes');
  assert.equal(COMPACT_MAINTENANCE_MISSION.intervalMs, DEFAULT_CONTEXT_TRIGGER.compact.everyMs, 'the two cadences must agree');
  assert.equal(COMPACT_MAINTENANCE_MISSION.enabled, false, 'scheduled compaction stays opt in');
});

test('a fresh install reads the new defaults', () => {
  fs.rmSync(configPath, { force: true });
  const cfg = readConfig();
  assert.equal(cfg.contextTrigger.compact.everyMs, MIN_40);
  assert.equal(cfg.contextTrigger.compact.minContextPct, 30);
});

test('a rule still on the 0.5.2 seed (2h, 60, 40) follows the new default', () => {
  persist({ triggersMigratedV1: true, contextTrigger: { compact: { enabled: true, everyMs: 7_200_000, minContextPct: 60, minContextPctLargeWindow: 40, message: 'keep me' } } });
  const c = readConfig().contextTrigger.compact;
  assert.equal(c.everyMs, MIN_40);
  assert.equal(c.minContextPct, 30);
  assert.equal(c.minContextPctLargeWindow, 30);
  assert.equal(c.message, 'keep me', 'only the seeded numbers move');
});

test('a rule on the first 0.5.3 draft seed (40 min, 30, 20) follows the corrected default', () => {
  persist({ triggersMigratedV1: true, contextTrigger: { compact: { enabled: true, everyMs: 2_400_000, minContextPct: 30, minContextPctLargeWindow: 20, message: 'keep me' } } });
  const c = readConfig().contextTrigger.compact;
  assert.equal(c.everyMs, MIN_40);
  assert.equal(c.minContextPct, 30);
  assert.equal(c.minContextPctLargeWindow, 30);
  assert.equal(c.message, 'keep me');
});

test('a rule somebody edited keeps its numbers', () => {
  persist({ triggersMigratedV1: true, contextTrigger: { compact: { enabled: true, everyMs: 5_400_000, minContextPct: 60, minContextPctLargeWindow: 40, message: '' } } });
  const c = readConfig().contextTrigger.compact;
  assert.equal(c.everyMs, 5_400_000);
  assert.equal(c.minContextPct, 60);
});

test('the maintenance mission: a disabled 1h or 2h seed moves to 40 minutes, an enabled one or a custom interval is kept', () => {
  const mission = (intervalMs, enabled) => ({ ...COMPACT_MAINTENANCE_MISSION, intervalMs, enabled });
  persist({ triggersMigratedV1: true, missions: [
    mission(3_600_000, false), mission(7_200_000, false), mission(7_200_000, true), mission(5_400_000, false),
    { id: 'standup', label: 'Standup', intervalMs: 7_200_000, to: 'god', body: 'hi', enabled: false }
  ] });
  const got = readConfig().missions.map((m) => m.intervalMs);
  assert.deepEqual(got, [MIN_40, MIN_40, 7_200_000, 5_400_000, 7_200_000]);
});
