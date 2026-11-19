/**
 * Main's half of the Graphics setting (src/shared/graphicsMode.ts has the rules).
 *
 * The mode is read from config.json ONCE, at startup, before app ready:
 * `disableHardwareAcceleration` only works before ready, and a floor's WebGL
 * power preference is chosen when it first draws. The read is a plain read of
 * one key, not readConfig: anything unreadable is 'auto', so a damaged
 * config.json never blocks the app and never forces software drawing.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT): src/main/graphics.ts.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  graphicsModeFromConfigText, graphicsModeOf, hardwareCompositing,
  type GraphicsMode, type GraphicsStatus
} from '../shared/graphicsMode';

/** The parts of Electron's `app` this needs. */
export interface GraphicsApp {
  isReady(): boolean;
  getPath(name: 'userData'): string;
  disableHardwareAcceleration(): void;
}

let applied: GraphicsMode = 'auto';
let hardwareDisabled = false;
let appliedOnce = false;

/** The mode saved in `<userData>/config.json`; 'auto' when the file is missing, unreadable or damaged. */
export function readStartupGraphicsMode(userData: string, read: (p: string) => string = (p) => readFileSync(p, 'utf8')): GraphicsMode {
  let text: string | null = null;
  try { text = read(join(userData, 'config.json')); } catch { /* missing or unreadable: the default */ }
  return graphicsModeFromConfigText(text);
}

/**
 * Apply the saved mode. MUST run at module load of main, before app ready,
 * right after the user data folder is final. 'cpu' turns hardware
 * acceleration off; 'auto' and 'gpu' leave Chromium's choice and blocklist
 * alone. Too late (after ready) it applies nothing and says so.
 */
export function applyGraphicsModeAtStartup(app: GraphicsApp, read?: (p: string) => string): { mode: GraphicsMode; applied: boolean } {
  if (appliedOnce) return { mode: applied, applied: true };
  const mode = readStartupGraphicsMode(app.getPath('userData'), read);
  if (app.isReady()) {
    console.error(`[graphics] the graphics mode "${mode}" was read after app ready: not applied this run`);
    return { mode, applied: false };
  }
  if (mode === 'cpu') { app.disableHardwareAcceleration(); hardwareDisabled = true; }
  applied = mode;
  appliedOnce = true;
  return { mode, applied: true };
}

/** The mode this run started with. */
export function appliedGraphicsMode(): GraphicsMode { return applied; }

/** What the Settings indicator needs: the mode in force, the saved one, Chromium's view. */
export function graphicsStatus(storedConfig: { graphicsMode?: unknown } | null | undefined, featureStatus: Record<string, string> | null | undefined): GraphicsStatus {
  return {
    applied,
    stored: graphicsModeOf(storedConfig),
    hardwareDisabled,
    hardwareCompositing: hardwareDisabled ? false : hardwareCompositing(featureStatus)
  };
}

/**
 * The startup 'graphics' row in log.jsonl, written once Chromium KNOWS. Until
 * the GPU process has sent its first report (`gpu-info-update`, a few hundred
 * ms after ready), getGPUFeatureStatus() reads software in every mode. CPU
 * only is known at once; a GPU process that never reports is null (unknown).
 */
export interface GraphicsRowApp {
  getGPUFeatureStatus(): unknown;
  on(event: 'gpu-info-update', fn: () => void): unknown;
  once(event: 'gpu-info-update', fn: () => void): unknown;
  removeListener(event: 'gpu-info-update', fn: () => void): unknown;
}
export type GraphicsRow = {
  kind: 'graphics';
  mode: GraphicsMode;
  applied: boolean;
  hardwareCompositing: boolean | null;
  /** Chromium's raw gpu_compositing string, so a fallback is told apart from a missing status. */
  gpuCompositing: string | null;
};
export const GRAPHICS_ROW_TIMEOUT_MS = 10_000;

let gpuReported = false;

/** Note the GPU process's first report. MUST run at module load of main, before app ready. */
export function watchGpuReports(app: Pick<GraphicsRowApp, 'on'>): void {
  app.on('gpu-info-update', () => { gpuReported = true; });
}

function featureStatusOf(app: GraphicsRowApp): Record<string, string> | null {
  try { return app.getGPUFeatureStatus() as Record<string, string>; } catch { return null; }
}

/** Write the row once: now if Chromium already knows, else at its first report, else null at the timeout. */
export function logGraphicsWhenKnown(
  app: GraphicsRowApp,
  startup: { mode: GraphicsMode; applied: boolean },
  append: (row: GraphicsRow) => void
): void {
  const write = (known: boolean): void => {
    const status = featureStatusOf(app);
    const raw = typeof status?.gpu_compositing === 'string' ? status.gpu_compositing : null;
    const hw = hardwareDisabled ? false : known ? hardwareCompositing(status) : null;
    try { append({ kind: 'graphics', mode: startup.mode, applied: startup.applied, hardwareCompositing: hw, gpuCompositing: raw }); } catch { /* the log is best effort */ }
  };
  if (hardwareDisabled || gpuReported) { write(true); return; }
  const onReport = (): void => { clearTimeout(timer); write(true); };
  app.once('gpu-info-update', onReport);
  const timer = setTimeout(() => { app.removeListener('gpu-info-update', onReport); write(false); }, GRAPHICS_ROW_TIMEOUT_MS);
  timer.unref?.();
}
