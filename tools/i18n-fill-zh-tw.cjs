#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');

const DEFAULT_LOCALES = path.join(__dirname, '..', 'src', 'renderer', 'src', 'i18n', 'locales');

const TOKEN_RE = /\{\{[^{}]*\}\}|<\/?[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>/g;
const PLACEHOLDER_RE = /\{\{[^{}]*\}\}/g;
const TAG_RE = /<\/?[A-Za-z][\w-]*(?:\s[^<>]*)?\/?>/g;

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isLeaf = (v) => typeof v === 'string' || Array.isArray(v);

/** Map of dotted key -> leaf value, in tree order. */
function flattenLeaves(tree, prefix = '', out = new Map()) {
  for (const [k, v] of Object.entries(tree || {})) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (isPlainObject(v)) flattenLeaves(v, key, out);
    else out.set(key, v);
  }
  return out;
}

/** Sorted list of the matches of `re` in a leaf (array leaves joined). */
function tokensOf(leaf, re) {
  const s = Array.isArray(leaf) ? leaf.map(String).join('\n') : String(leaf);
  return (s.match(re) || []).sort();
}
const placeholdersOf = (leaf) => tokensOf(leaf, PLACEHOLDER_RE);
const tagsOf = (leaf) => tokensOf(leaf, TAG_RE);

/** Convert only the prose between {{placeholders}} and <tags>. */
function convertProtected(str, convert) {
  let out = '';
  let last = 0;
  for (const m of str.matchAll(TOKEN_RE)) {
    out += convert(str.slice(last, m.index)) + m[0];
    last = m.index + m[0].length;
  }
  return out + convert(str.slice(last));
}

/**
 * Convert one leaf: `convert` on the prose between tokens, then `post` (the
 * Taiwan glossary) on the whole string, then check tokens survived both.
 */
function convertLeaf(key, leaf, convert, post = (s) => s) {
  const one = (s) => (typeof s === 'string' ? post(convertProtected(s, convert), key) : s);
  const result = Array.isArray(leaf) ? leaf.map(one) : one(leaf);
  const same = (a, b) => a.length === b.length && a.every((x, i) => x === b[i]);
  if (!same(placeholdersOf(leaf), placeholdersOf(result))) {
    throw new Error(`${key}: conversion changed {{placeholders}}: ${JSON.stringify(leaf)} -> ${JSON.stringify(result)}`);
  }
  if (!same(tagsOf(leaf), tagsOf(result))) {
    throw new Error(`${key}: conversion changed <tags>: ${JSON.stringify(leaf)} -> ${JSON.stringify(result)}`);
  }
  return result;
}

/** Insert a leaf at a dotted key, creating parents. */
function setPath(tree, key, value) {
  const parts = key.split('.');
  let node = tree;
  for (const p of parts.slice(0, -1)) {
    if (!isPlainObject(node[p])) node[p] = {};
    node = node[p];
  }
  node[parts[parts.length - 1]] = value;
}

/** Copy of `tree` with object keys in `ref`'s order; keys ref lacks follow in their own order. */
function orderLike(ref, tree) {
  if (!isPlainObject(tree)) return tree;
  const r = isPlainObject(ref) ? ref : {};
  const keys = [...Object.keys(r).filter((k) => k in tree), ...Object.keys(tree).filter((k) => !(k in r))];
  return Object.fromEntries(keys.map((k) => [k, orderLike(r[k], tree[k])]));
}

/**
 * Pure core. Returns the new zh-TW tree and pending map plus what changed.
 * `convert` is only called for keys that need filling.
 */
function fillZhTw({ en = {}, zhCN, zhTW = {}, pending = {}, convert, post }) {
  const cn = flattenLeaves(zhCN);
  const tw = flattenLeaves(zhTW);

  const added = [];
  const removed = [];
  const out = {};
  for (const [key, src] of cn) {
    const have = tw.get(key);
    // A zh-TW value of the wrong shape (array vs string) counts as missing.
    if (isLeaf(have) && Array.isArray(have) === Array.isArray(src)) {
      setPath(out, key, have);
    } else {
      setPath(out, key, convertLeaf(key, src, convert, post));
      added.push(key);
    }
  }
  for (const key of tw.keys()) {
    const src = cn.get(key);
    const have = tw.get(key);
    if (src === undefined || !isLeaf(have) || Array.isArray(have) !== Array.isArray(src)) removed.push(key);
  }

  const result = orderLike(en, orderLike(zhCN, out));

  // A pending entry keeps the zh-CN source it was filled from. An existing entry
  // is never overwritten, and a key removed from pending by review is not re-added.
  const nextPending = {};
  const addedSet = new Set(added);
  for (const key of flattenLeaves(result).keys()) {
    if (Object.prototype.hasOwnProperty.call(pending, key)) nextPending[key] = pending[key];
    else if (addedSet.has(key)) nextPending[key] = cn.get(key);
  }

  return { result, pending: nextPending, added, removed };
}

const serialize = (obj) => JSON.stringify(obj, null, 2) + '\n';

function readJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function loadConverter() {
  let OpenCC;
  try {
    OpenCC = require('opencc-js');
  } catch {
    throw new Error("opencc-js is not installed; run `npm install` (it is a devDependency).");
  }
  return OpenCC.Converter({ from: 'cn', to: 'twp' });
}

function main(argv) {
  const check = argv.includes('--check');
  const li = argv.indexOf('--locales');
  const dir = li >= 0 ? path.resolve(argv[li + 1]) : DEFAULT_LOCALES;
  const twFile = path.join(dir, 'zh-TW.json');
  const pendingFile = path.join(dir, 'zh-TW.pending.json');

  if (check && !fs.existsSync(twFile)) {
    console.log('i18n:fill-zh-tw --check: zh-TW.json not present, nothing to check.');
    return 0;
  }

  const en = readJson(path.join(dir, 'en.json'), {});
  const zhCN = readJson(path.join(dir, 'zh-CN.json'), null);
  if (!zhCN) throw new Error(`zh-CN.json not found in ${dir}`);
  const zhTW = readJson(twFile, {});
  const pending = readJson(pendingFile, {});

  // --check needs no conversion, so it runs without opencc-js.
  const convert = check ? (s) => s : loadConverter();
  const post = check ? undefined : require('./i18n-zh-tw-glossary.cjs').applyGlossary;
  const { result, pending: nextPending, added, removed } = fillZhTw({ en, zhCN, zhTW, pending, convert, post });

  if (check) {
    if (added.length === 0 && removed.length === 0) {
      console.log('i18n:fill-zh-tw --check: zh-TW.json is in step with zh-CN.json.');
      return 0;
    }
    if (added.length) console.error(`zh-TW.json is missing ${added.length} key(s):\n  ${added.join('\n  ')}`);
    if (removed.length) console.error(`zh-TW.json has ${removed.length} key(s) zh-CN.json no longer has:\n  ${removed.join('\n  ')}`);
    console.error('Run `npm run i18n:fill-zh-tw` and commit zh-TW.json + zh-TW.pending.json.');
    return 1;
  }

  fs.writeFileSync(twFile, serialize(result));
  fs.writeFileSync(pendingFile, serialize(nextPending));
  console.log(`zh-TW.json: filled ${added.length}, removed ${removed.length}. ` +
    `${Object.keys(nextPending).length} key(s) await review in zh-TW.pending.json.`);
  for (const k of added) console.log(`  + ${k}`);
  for (const k of removed) console.log(`  - ${k}`);
  return 0;
}

module.exports = { fillZhTw, flattenLeaves, placeholdersOf, tagsOf, convertProtected, convertLeaf, orderLike, serialize };

if (require.main === module) {
  try {
    process.exitCode = main(process.argv.slice(2));
  } catch (err) {
    console.error(`i18n:fill-zh-tw: ${err.message}`);
    process.exitCode = 1;
  }
}
