/**
 * The tool lookup behind Settings, Prerequisites (`tools:status`), moved out of main/index.ts. No Electron.
 */
import { existsSync } from 'node:fs';
import { resolveCommands as resolveCliCommands } from './shellEnv';
import { MEMPALACE_PIN, MEMPALACE_SWITCH, toolCatalog, type ToolStatus } from '../shared/toolCatalog';
import { mempalaceVersion } from './mempalaceVersion';
import type { MemoryManager } from './memory';

/**
 * Probe every catalog row against THIS machine.
 *
 * Presence is a PATH resolution, not a spawn: running each candidate to read a
 * --version would be a dozen process launches on every panel open, and several of
 * these CLIs boot a TUI when invoked bare. Every name is resolved in one async
 * login shell (`resolveCommands`), and "resolved to a real, existing path that
 * is not just the bare name" is the found test.
 *
 * mempalace has no `bin` in the catalog: its row is the memory subsystem's
 * status (palace initialised, the uv/pip folders PATH may not carry for a
 * Finder-launched app), built from the same batch result so no synchronous
 * login shell runs here.
 */
export async function readToolsStatus(memory: Pick<MemoryManager, 'statusWithBin' | 'fallbackBin'>): Promise<ToolStatus[]> {
  const win = process.platform === 'win32';
  const specs = toolCatalog();
  // Issue #446: every CLI lookup in ONE async login shell. The handler used a
  // synchronous resolver once per binary, and once more for mempalace, which
  // froze the main process for seconds on every panel open. mempalace rides
  // the same batch (its row has no `bin`, presence comes from MemoryStatus),
  // then the memory subsystem's own uv/pip folders, checked without a process.
  let resolvedCommands = new Map<string, string | null>();
  try {
    resolvedCommands = await resolveCliCommands([...specs.flatMap((spec) => spec.bin ? [spec.bin] : []), 'mempalace']);
  } catch { /* a probe must never take the panel down: rows read not found */ }
  const mem = (() => {
    try { return memory.statusWithBin(resolvedCommands.get('mempalace') ?? memory.fallbackBin()); } catch { return null; }
  })();
  // The installed MemPalace release, from its dist-info folder (no process), or
  // an async `--version` for other layouts (once per binary per launch).
  // Compared with the pin for a notice row. Nothing is installed or changed.
  const memVersion = mem?.bin ? await mempalaceVersion(mem.bin) : null;
  return specs.map((spec): ToolStatus => {
    const installCommand = win ? spec.install.win32 : spec.install.posix;
    if (spec.id === 'mempalace') {
      return {
        ...spec,
        installCommand,
        found: !!mem?.available,
        path: mem?.bin ?? null,
        ...(memVersion ? { version: memVersion } : {}),
        pinnedVersion: MEMPALACE_PIN.version,
        switchCommand: MEMPALACE_SWITCH,
        detail: mem?.available
          ? [memVersion, mem.initialized ? 'palace initialised' : 'installed — palace not built yet'].filter(Boolean).join(' · ')
          : undefined
      };
    }
    if (!spec.bin) return { ...spec, installCommand, found: false, path: null };
    const resolved = resolvedCommands.get(spec.bin) ?? null;
    const path = resolved && resolved !== spec.bin && existsSync(resolved) ? resolved : null;
    return { ...spec, installCommand, found: !!path, path };
  });
}
