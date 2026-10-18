#!/usr/bin/env node
'use strict';
/**
 * Scaffold a new theme pack by copying the built-in `plain` pack.
 *
 *   npm run theme:new -- my-theme
 *   npm run theme:new -- my-theme path/to/themes-folder
 *
 * The pack lands in <folder>/<id> (default ./my-themes/<id>). Point the app at the
 * folder with MD_THEMES_DIR or Settings → Theme → Extra themes folder, edit the
 * files, and check them with `npm run theme:validate -- <pack>`.
 */
const fs = require('node:fs');
const path = require('node:path');

const id = process.argv[2];
const destRoot = path.resolve(process.argv[3] || 'my-themes');
if (!id || !/^[a-z0-9][a-z0-9-]{1,39}$/.test(id) || ['office', 'default', 'none'].includes(id)) {
  console.error('usage: npm run theme:new -- <id> [folder]   (id: lowercase letters, digits, dashes)');
  process.exit(2);
}
const src = path.resolve(__dirname, '..', '..', 'resources', 'themes', 'plain');
const dest = path.join(destRoot, id);
if (fs.existsSync(dest)) {
  console.error(`${dest} already exists`);
  process.exit(1);
}
fs.cpSync(src, dest, { recursive: true });

const file = path.join(dest, 'theme.json');
const manifest = JSON.parse(fs.readFileSync(file, 'utf8'));
manifest.id = id;
manifest.name = id.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
manifest.version = '0.1.0';
manifest.author = 'you';
manifest.license = 'MIT';
manifest.blurb = 'My theme';
fs.writeFileSync(file, JSON.stringify(manifest, null, 2) + '\n');

console.log(`Created ${dest}`);
console.log(`Next: edit theme.json / map.tmj, then  npm run theme:validate -- "${dest}"`);
console.log(`Load it:  MD_THEMES_DIR="${destRoot}" npm run dev   (or set the folder in Settings)`);
