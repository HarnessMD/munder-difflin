'use strict';

// The office floor's speech bubbles pick their i18n keys at run time: from
// constant arrays (ERRAND_THOUGHTS, SUCK_UP_KEYS, GOSSIP_KEYS, CHEER_KEYS),
// picked at random, and from floorActionWord's map, joined onto
// `office.activity.`. No literal t('...') call names those keys, so the 0.6.0
// language trim (#878) dropped the four office blocks from every locale, and
// the bubbles printed raw keys such as `office.gossip.3`. English is the
// fallback for every locale, so a key missing from en.json is shown raw in
// every language. These tests read the sources and hold every such key to
// en.json.

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const read = (p) => fs.readFileSync(path.join(root, p), 'utf8');
const en = JSON.parse(read('src/renderer/src/i18n/locales/en.json'));

/** The string at a dotted key, walking arrays by index, as i18next does. */
function lookup(key) {
  let v = en;
  for (const part of key.split('.')) {
    if (v === null || typeof v !== 'object') return undefined;
    v = v[part];
  }
  return v;
}

const missing = (keys) => keys.filter((k) => typeof lookup(k) !== 'string' || lookup(k) === '');

test('every office.* key OfficeFloor.tsx names resolves to a string in en.json', () => {
  const src = read('src/renderer/src/scene/office/OfficeFloor.tsx');
  const keys = [...new Set([...src.matchAll(/['"`](office\.[A-Za-z0-9_.]+)['"`]/g)].map((m) => m[1]))];
  // The four bubble arrays alone hold 43 keys; a parse that finds far fewer is broken.
  assert.ok(keys.length >= 43, `found only ${keys.length} office.* keys in OfficeFloor.tsx`);
  for (const k of ['office.errand.water.0', 'office.suckUp.0', 'office.gossip.0', 'office.cheer.0']) {
    assert.ok(keys.includes(k), `${k} is no longer named in OfficeFloor.tsx; update this test`);
  }
  assert.deepEqual(missing(keys), [], 'keys OfficeFloor.tsx uses but en.json lacks');
});

test('every floor action word resolves under office.activity in en.json', () => {
  const src = read('src/shared/floorActionWord.ts');
  const block = /Object\.entries\(\{([\s\S]*?)\}\)/.exec(src);
  assert.ok(block, 'could not find the WORDS map in floorActionWord.ts');
  const words = [...block[1].matchAll(/:\s*'([^']+)'/g)].map((m) => m[1]);
  assert.ok(words.length > 10, `found only ${words.length} action words`);
  const keys = words.map((w) => `office.activity.${w}`);
  for (const m of src.matchAll(/'(office\.activity\.[A-Za-z0-9_.]+)'/g)) keys.push(m[1]);
  assert.deepEqual(missing(keys), [], 'floor action keys en.json lacks');
});
