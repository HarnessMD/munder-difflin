/**
 * The Graphics setting: Auto, GPU or CPU only.
 *
 * The app must run on the CPU for anyone without a usable GPU, and use the GPU
 * when one is there and the person wants it. Chromium already picks the GPU
 * when it can and falls back to software otherwise ("auto"); this gives the
 * person the choice and shows what is really in use.
 *
 * - 'auto' (the default): Chromium's own choice; the floors ask WebGL for its
 *   default power preference.
 * - 'gpu': prefer the hardware GPU; the floors ask for 'high-performance' (the
 *   discrete GPU on a two GPU laptop). Chromium's GPU blocklist is NOT
 *   overridden: a missing or blocklisted GPU still falls back to software, and
 *   the indicator says so.
 * - 'cpu': `app.disableHardwareAcceleration()` before app ready, so it needs a
 *   restart.
 *
 * The mode in force is read once, at startup, from config.json. A change is
 * saved at once and takes effect after a restart. A missing, damaged or
 * unknown value is 'auto'.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT): src/shared/graphicsMode.ts.
 */

export type GraphicsMode = 'auto' | 'gpu' | 'cpu';
export const GRAPHICS_MODES: readonly GraphicsMode[] = ['auto', 'gpu', 'cpu'];
export const DEFAULT_GRAPHICS_MODE: GraphicsMode = 'auto';

/** The mode from a stored or chosen value, or null when it is not one. Exact. */
export function parseGraphicsMode(v: unknown): GraphicsMode | null {
  return typeof v === 'string' && (GRAPHICS_MODES as readonly string[]).includes(v) ? (v as GraphicsMode) : null;
}

/** The mode a config asks for: its stored value when valid, else the default. */
export function graphicsModeOf(config: { graphicsMode?: unknown } | null | undefined): GraphicsMode {
  return parseGraphicsMode(config?.graphicsMode) ?? DEFAULT_GRAPHICS_MODE;
}

/**
 * The mode in config.json's TEXT. It is read before app ready, so not through
 * readConfig (which keeps a damaged file and migrates). Anything unreadable is
 * the default: a damaged file never blocks startup and never forces a mode.
 */
export function graphicsModeFromConfigText(text: string | null | undefined): GraphicsMode {
  if (typeof text !== 'string') return DEFAULT_GRAPHICS_MODE;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? graphicsModeOf(parsed as { graphicsMode?: unknown }) : DEFAULT_GRAPHICS_MODE;
  } catch {
    return DEFAULT_GRAPHICS_MODE;
  }
}

/** The WebGL power preference a floor asks for under a mode: 'high-performance'
 *  for GPU, and none (WebGL's own default) for Auto and CPU only. */
export function powerPreferenceFor(mode: GraphicsMode): 'high-performance' | undefined {
  return mode === 'gpu' ? 'high-performance' : undefined;
}

/** A WebGL UNMASKED_RENDERER string that names a software rasterizer. */
export function isSoftwareRenderer(name: string | null | undefined): boolean {
  return typeof name === 'string' && /swiftshader|llvmpipe|softpipe|software|basic render driver|microsoft basic|warp/i.test(name);
}

/** A readable GPU name from an ANGLE renderer string; any other string, trimmed.
 *  The Metal form names the GPU after "ANGLE Metal Renderer: "
 *  ("ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)"),
 *  so that prefix is cut rather than read as a backend (the fork read "ANGLE"). */
export function gpuNameOf(renderer: string): string {
  const s = renderer.trim();
  const m = /^ANGLE \((?:[^,]*), (.*?)(?: \(0x[0-9a-f]+\))?(?: Direct3D.*| OpenGL.*| Vulkan.*)?, [^,]*\)$/i.exec(s);
  return (m ? m[1].replace(/^ANGLE Metal Renderer: /i, '') : s).trim();
}

/** Chromium's gpu_compositing feature status: hardware when it starts with "enabled". */
export function hardwareCompositing(status: Record<string, string> | null | undefined): boolean | null {
  const v = status?.gpu_compositing;
  return typeof v === 'string' ? v.startsWith('enabled') : null;
}

export interface GraphicsStatus {
  /** The mode this run started with (what is in force). */
  applied: GraphicsMode;
  /** The mode saved in config.json (differs from `applied` until a restart). */
  stored: GraphicsMode;
  /** True when this run turned hardware acceleration off (applied === 'cpu'). */
  hardwareDisabled: boolean;
  /** Chromium's view in main: hardware compositing (true), software (false), or unknown (null). */
  hardwareCompositing: boolean | null;
}

/** What main sends the Settings page: the status, and how many agent terminals a restart would stop. */
export interface GraphicsStatusView extends GraphicsStatus {
  runningAgents: number;
}

/**
 * The indicator line, from what is ACTUALLY in use: the WebGL renderer a floor
 * got (null before any floor has drawn) and main's status. Software when
 * hardware acceleration is off, the renderer is a software rasterizer, or
 * Chromium composites in software. A GPU mode that fell back says so.
 */
export function renderingLabel(webglRenderer: string | null, status: Pick<GraphicsStatus, 'applied' | 'hardwareDisabled' | 'hardwareCompositing'>): string {
  const software = status.hardwareDisabled || isSoftwareRenderer(webglRenderer) || status.hardwareCompositing === false;
  if (software) {
    const why = status.applied === 'cpu' ? '' : status.applied === 'gpu' ? ': no usable GPU, fell back to the CPU' : ': no usable GPU';
    return `Rendering: software (CPU)${why}`;
  }
  if (webglRenderer) return `Rendering: ${gpuNameOf(webglRenderer)} (GPU)`;
  return status.hardwareCompositing ? 'Rendering: GPU' : 'Rendering: unknown';
}

/** What is drawing, for a keyed line ("Drawing with: {{what}}"). */
export type RenderingState =
  | { kind: 'gpu'; name: string | null }
  | { kind: 'cpu' }
  | { kind: 'fallback' }
  | { kind: 'unknown' };

/**
 * renderingLabel's rules as data, so a screen maps each kind to its own words.
 * 'cpu' when CPU only is the mode in force; 'fallback' when software drawing
 * comes from any other mode. A GPU's name is null while Chromium composites in
 * hardware but no floor has reported its renderer yet.
 */
export function renderingState(webglRenderer: string | null, status: Pick<GraphicsStatus, 'applied' | 'hardwareDisabled' | 'hardwareCompositing'>): RenderingState {
  const software = status.hardwareDisabled || isSoftwareRenderer(webglRenderer) || status.hardwareCompositing === false;
  if (software) return status.applied === 'cpu' ? { kind: 'cpu' } : { kind: 'fallback' };
  if (webglRenderer) return { kind: 'gpu', name: gpuNameOf(webglRenderer) };
  return status.hardwareCompositing ? { kind: 'gpu', name: null } : { kind: 'unknown' };
}
