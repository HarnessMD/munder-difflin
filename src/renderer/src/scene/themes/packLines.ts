// Ported from Prozzta/guppyos 02d0d50b (MIT).
// A pack's own bubble lines (TES-BUBBLES-188). The manifest names a lines file under
// "text": {"lines": "lines.json"}: {"lines": {category: [line, ...]}}, the categories of the
// bridge viewer's LINES (tos-lines.js): gossip and cheer for a chat, an errand or idle thought at
// a wander stop, the coffee beats. 1.1.87 shipped the TES file but nothing read it, so the bridge
// only ever said the generic lines. Pure: the loader reads it, the floor picks from it.

import { normPath, resolveAsset, type Diagnostic, type PackFiles } from './tiled';
import type { ThemeManifest } from './manifest';
import { readExchanges, type Exchange } from './exchanges';

/** Category -> lines. Only plain strings; a line with a {placeholder} needs counts the floor has not got. */
export type PackLines = Readonly<Record<string, readonly string[]>>;

/** Picks one line of one of `kinds` for `key`, the same line for the same key; null when the pack has none. */
export type LinePicker = (kinds: readonly string[], key: string) => string | null;

/** The pack's lines file, if its manifest names one. A missing or malformed file is a warning, never an error. */
export function readPackLines(files: PackFiles, manifest: Pick<ThemeManifest, 'text'>): { lines: PackLines | null; exchanges: Exchange[]; diagnostics: Diagnostic[] } {
  const name = manifest.text?.lines;
  if (!name) return { lines: null, exchanges: [], diagnostics: [] };
  const warn = (message: string) => ({ lines: null, exchanges: [], diagnostics: [{ level: 'warn' as const, message }] });
  const path = resolveAsset(files, '', name);
  const src = path && normPath(path) === normPath(name) ? files.text(path) : null;
  if (src == null) return warn(`The lines file "${name}" is not in the pack; the generic lines are used.`);
  let raw: unknown;
  try { raw = JSON.parse(src); } catch { return warn(`The lines file "${name}" is not valid JSON; the generic lines are used.`); }
  const cats = raw && typeof raw === 'object' ? (raw as { lines?: unknown }).lines : undefined;
  if (!cats || typeof cats !== 'object' || Array.isArray(cats)) return warn(`The lines file "${name}" has no "lines" object; the generic lines are used.`);
  const lines: Record<string, string[]> = {};
  for (const [k, v] of Object.entries(cats)) {
    if (!Array.isArray(v)) continue;
    const plain = v.filter((s): s is string => typeof s === 'string' && s.trim() !== '' && !s.includes('{'));
    if (plain.length) lines[k] = plain;
  }
  return { lines, exchanges: readExchanges((cats as { exchanges?: unknown }).exchanges), diagnostics: [] };
}

function hash(key: string): number {
  let h = 0;
  for (let i = 0; i < key.length; i++) h = (h * 31 + key.charCodeAt(i)) | 0;
  return h >>> 0;
}

/** A picker over the pack's lines, or undefined when it has none (the caller keeps its generic line). */
export function linePicker(lines: PackLines | null | undefined): LinePicker | undefined {
  if (!lines || !Object.keys(lines).length) return undefined;
  return (kinds, key) => {
    const pools = kinds.filter((k) => lines[k]?.length);
    if (!pools.length) return null;
    const h = hash(key), pool = lines[pools[h % pools.length]];
    return pool[Math.floor(h / pools.length) % pool.length];
  };
}
