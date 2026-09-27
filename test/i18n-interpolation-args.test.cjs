'use strict';

/**
 * A string that interpolates must be CALLED with something to interpolate.
 *
 * Found the hard way. `firstRun.identity.failed` is "Could not reach {{org}}."
 * in all three locales, and D3 called it with no variables, so the failure
 * screen rendered the literal text `{{org}}` to the user in English, Arabic and
 * Chinese alike. It survived because that frame sat below the preview harness's
 * clip and nobody had ever seen it render.
 *
 * The existing i18n tests cannot catch this: they compare locales against each
 * other, and every locale was equally correct. The defect was at the CALL SITE.
 *
 * The one legitimate exception is a default variable. `godName` is registered
 * via `setGodName` as an i18next `defaultVariables` entry, so those strings
 * resolve without the caller passing anything. Anything else must be passed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '..');
const RENDERER = path.join(ROOT, 'src/renderer/src');

/** Supplied by i18n/index.ts `setGodName` as an i18next default variable. */
const DEFAULT_VARIABLES = new Set(['godName']);
/** ...but only where something keeps it live. `setGodName` has one caller,
 *  useGodNameSync, mounted once, in App.tsx. The Stapler and the capture
 *  overlay are separate windows that never mount App, so there the "default"
 *  is the stock name for ever. This exemption used to be global, which made the
 *  one case it waived the exact case that shipped (0.5.3, "Sent to Michael"). */
const NO_DEFAULTS_IN = [`${path.sep}puck${path.sep}`, `${path.sep}capture${path.sep}`].map((d) => path.join(RENDERER, d));
const defaultsFor = (file) => (NO_DEFAULTS_IN.some((d) => file.startsWith(d)) ? new Set() : DEFAULT_VARIABLES);

function flatten(obj, prefix = '') {
  const out = {};
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object') Object.assign(out, flatten(v, key));
    else out[key] = v;
  }
  return out;
}

function walk(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(p, acc);
    else if (/\.tsx?$/.test(entry.name)) acc.push(p);
  }
  return acc;
}

const en = flatten(JSON.parse(
  fs.readFileSync(path.join(RENDERER, 'i18n/locales/en.json'), 'utf8')
));

/** Keys whose English value contains at least one {{variable}}. */
const interpolating = new Map();
for (const [key, value] of Object.entries(en)) {
  if (typeof value !== 'string') continue;
  const vars = value.match(/{{\s*(\w+)[^}]*}}/g);
  if (vars) interpolating.set(key, vars.map((v) => v.replace(/[{}\s]/g, '')));
}

test('the locale file does interpolate somewhere, so this test can fail', () => {
  // Guard against the whole suite silently going vacuous if the extraction
  // regex or the locale layout ever changes shape.
  assert.ok(interpolating.size > 50, `only ${interpolating.size} interpolating keys found`);
});

test('every t() call for an interpolating key passes its variables', () => {
  const offenders = [];

  for (const file of walk(RENDERER)) {
    const src = fs.readFileSync(file, 'utf8');
    // `t('some.key')` with a closing paren straight after = no variables given.
    const re = /\bt\(\s*'([^']+)'\s*([,)])/g;
    let m;
    while ((m = re.exec(src)) !== null) {
      const [, key, next] = m;
      if (next !== ')') continue;
      const needed = interpolating.get(key);
      if (!needed) continue;
      const unmet = needed.filter((v) => !defaultsFor(file).has(v));
      if (unmet.length === 0) continue;
      offenders.push(
        `${path.relative(ROOT, file)} -> t('${key}') renders literal ` +
        unmet.map((v) => `{{${v}}}`).join(' ')
      );
    }
  }

  assert.deepEqual(offenders, [], `\n${offenders.join('\n')}\n`);
});
