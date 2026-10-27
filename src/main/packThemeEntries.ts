/**
 * The theme packs main registers, by the window's own rule: each manifest must
 * pass validateManifest (the renderer's validator, pure and DOM free), folders
 * are taken in name order, and the first pack of an id wins. The orchestrator
 * seed is the validated manifest's. Pure; main/packThemes.ts feeds it the
 * bundled manifests.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT).
 */
import { validateManifest } from '../renderer/src/scene/themes/manifest';
import type { PackThemeEntry } from '../shared/projectTheme';

/** The pack entries among parsed theme.json manifests keyed by path (".../themes/<dir>/theme.json"). */
export function validatedPackThemeEntries(manifests: Record<string, unknown>): PackThemeEntry[] {
  const out: PackThemeEntry[] = [];
  const byDir = Object.entries(manifests).map(([file, raw]) => ({ dir: file.replace(/\\/g, '/').split('/').slice(-2, -1)[0] ?? '', raw }));
  for (const { dir, raw } of byDir.sort((a, b) => a.dir.localeCompare(b.dir))) {
    const m = validateManifest(raw, dir).manifest;
    if (!m || out.some((e) => e.id === m.id)) continue;
    out.push({ id: m.id, label: m.label, orchestrator: m.projectDefaults?.orchestrator });
  }
  return out;
}
