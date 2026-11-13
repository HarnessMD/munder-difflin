#!/usr/bin/env node
/* T1b fragment merge: fold fragments/g*-{en,zh,zh-TW}.json into locales/{en,zh-CN,zh-TW}.json.
 * Fails loudly on key collisions with differing values, then verifies parity. */
const fs = require('fs');
const path = require('path');

const FRAG = path.join(__dirname, '..', 'src', 'renderer', 'src', 'i18n', 'locales', 'fragments');
const LOC = path.join(__dirname, '..', 'src', 'renderer', 'src', 'i18n', 'locales');

function deepMerge(base, add, where) {
  for (const [k, v] of Object.entries(add)) {
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      if (!base[k] || typeof base[k] !== 'object' || Array.isArray(base[k])) base[k] = {};
      deepMerge(base[k], v, `${where}.${k}`);
    } else {
      if (k in base && base[k] !== undefined) {
        if (JSON.stringify(base[k]) !== JSON.stringify(v)) {
          throw new Error(`KEY COLLISION at ${where}.${k}: "${base[k]}" vs "${v}"`);
        }
        continue; // identical duplicate — fine
      }
      base[k] = v;
    }
  }
}

function keys(o, p = '') {
  return Object.entries(o).flatMap(([k, v]) => (v && typeof v === 'object' && !Array.isArray(v) ? keys(v, p + k + '.') : [p + k]));
}
function arrays(o, p = '') {
  const out = [];
  for (const [k, v] of Object.entries(o)) {
    const q = p + k;
    if (Array.isArray(v)) out.push([q, v.length]);
    else if (v && typeof v === 'object') out.push(...arrays(v, q + '.'));
  }
  return out;
}

const en = JSON.parse(fs.readFileSync(path.join(LOC, 'en.json'), 'utf8'));
const zh = JSON.parse(fs.readFileSync(path.join(LOC, 'zh-CN.json'), 'utf8'));
const TW_FILE = path.join(LOC, 'zh-TW.json');
const tw = fs.existsSync(TW_FILE) ? JSON.parse(fs.readFileSync(TW_FILE, 'utf8')) : null;

// fragment suffix -> target locale. `-zh.json` is Simplified (zh-CN) for
// historical reasons; `-zh-TW.json` is Traditional and does not match it.
const TARGETS = [['-en.json', en], ['-zh.json', zh], ['-zh-TW.json', tw]];
let merged = 0, twMerged = 0;
for (const f of fs.readdirSync(FRAG).sort()) {
  const hit = TARGETS.find(([suffix]) => f.endsWith(suffix));
  if (!hit) continue;
  const target = hit[1];
  if (!target) throw new Error(`${f} is a zh-TW fragment but locales/zh-TW.json does not exist`);
  const frag = JSON.parse(fs.readFileSync(path.join(FRAG, f), 'utf8'));
  for (const [ns, body] of Object.entries(frag)) {
    if (!target[ns]) target[ns] = {};
    deepMerge(target[ns], body, ns);
  }
  merged++;
  if (target === tw) twMerged++;
}
fs.writeFileSync(path.join(LOC, 'en.json'), JSON.stringify(en, null, 2) + '\n');
fs.writeFileSync(path.join(LOC, 'zh-CN.json'), JSON.stringify(zh, null, 2) + '\n');
if (tw && twMerged) fs.writeFileSync(TW_FILE, JSON.stringify(tw, null, 2) + '\n');

// parity check
const ek = new Set(keys(en)), zk = new Set(keys(zh));
const onlyEn = [...ek].filter((k) => !zk.has(k));
const onlyZh = [...zk].filter((k) => !ek.has(k));
if (onlyEn.length || onlyZh.length) {
  console.error('PARITY FAIL — onlyEn:', onlyEn, 'onlyZh:', onlyZh);
  process.exit(1);
}
const ea = arrays(en), za = arrays(zh);
for (const [p, n] of ea) {
  const m = za.find((x) => x[0] === p);
  if (!m || m[1] !== n) { console.error('ARRAY MISMATCH', p, n, m && m[1]); process.exit(1); }
}

// zh-TW parity. Keys zh-TW has and en lacks are always an error (dead strings).
// Keys it is missing are an error only when this run merged zh-TW fragments:
// a batch of en/zh fragments with no zh-TW one goes through with a warning
// (those strings fall back to English until zh-TW catches up, and the
// locale-parity tests still flag them).
if (tw) {
  const tk = new Set(keys(tw));
  const onlyEnTw = [...ek].filter((k) => !tk.has(k));
  const onlyTw = [...tk].filter((k) => !ek.has(k));
  if (onlyTw.length || (onlyEnTw.length && twMerged)) {
    console.error('zh-TW PARITY FAIL — missing:', onlyEnTw, 'extra:', onlyTw);
    process.exit(1);
  }
  if (onlyEnTw.length) {
    console.warn(`WARNING: no zh-TW fragments merged; zh-TW is missing ${onlyEnTw.length} keys:`, onlyEnTw);
  }
  const ta = arrays(tw);
  for (const [p, n] of ea) {
    const m = ta.find((x) => x[0] === p);
    if (m && m[1] !== n) { console.error('zh-TW ARRAY MISMATCH', p, n, m[1]); process.exit(1); }
  }
}
console.log(`merged ${merged} fragment files (${twMerged} zh-TW); en/zh now ${ek.size} keys each, parity OK`);
