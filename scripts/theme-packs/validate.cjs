#!/usr/bin/env node
'use strict';
/**
 * Validate a theme pack folder exactly the way the app does.
 *
 *   npm run theme:validate -- resources/themes/plain
 *   npm run theme:validate -- path/to/my-pack path/to/another-pack
 *
 * Prints every error and warning with its code and field, and exits 1 if any pack
 * has an error. Warnings alone exit 0 (the app loads a pack with warnings; the
 * affected field is dropped).
 */
const fs = require('node:fs');
const path = require('node:path');
const loadTs = require('../../test/load-ts.cjs');

const { validatePack } = loadTs('src/shared/themePack.ts');

function readTree(dir, base = dir, out = {}) {
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) readTree(full, base, out);
    else out[path.relative(base, full).split(path.sep).join('/')] = new Uint8Array(fs.readFileSync(full));
  }
  return out;
}

const dirs = process.argv.slice(2).filter((a) => !a.startsWith('-'));
if (dirs.length === 0) {
  console.error('usage: npm run theme:validate -- <pack folder> [<pack folder> ...]');
  process.exit(2);
}

let failed = false;
for (const dir of dirs) {
  const abs = path.resolve(dir);
  if (!fs.existsSync(path.join(abs, 'theme.json'))) {
    console.error(`${dir}: no theme.json (is this a pack folder?)`);
    failed = true;
    continue;
  }
  const result = validatePack({ dirName: path.basename(abs), files: readTree(abs) });
  const errors = result.issues.filter((i) => i.level === 'error');
  const warns = result.issues.filter((i) => i.level === 'warn');
  console.log(`${dir}: ${errors.length} error(s), ${warns.length} warning(s)${result.pack ? '' : '  — pack REJECTED'}`);
  for (const i of result.issues) console.log(`  ${i.level === 'error' ? 'ERROR' : 'warn '} [${i.code}] ${i.path ?? ''} ${i.message}`);
  if (errors.length > 0 || !result.pack) failed = true;
}
process.exit(failed ? 1 : 0);
