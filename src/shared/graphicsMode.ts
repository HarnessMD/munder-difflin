/**
 * Settings, Graphics: Auto / GPU / CPU only. The app must run on the CPU for
 * anyone without a usable GPU, and use the GPU when one is there and the
 * person wants it. Chromium already picks the GPU when it can and falls back
 * to software otherwise ("auto"); this gives the choice and shows what is
 * really in use.
 *
 * - 'auto' (the default): Chromium's own choice; the floors ask WebGL for the
 *   default power preference.
 * - 'gpu': prefer the hardware GPU; the floors ask for 'high-performance' (the
 *   discrete GPU on a two GPU laptop). Chromium's GPU blocklist is NOT
 *   overridden: a missing or blocklisted GPU still falls back to software, and
 *   the indicator says so (never a black screen).
 * - 'cpu': `app.disableHardwareAcceleration()` before app ready, so it needs a
 *   restart.
 *
 * The mode in force is read once at startup (before ready) from config.json; a
 * change is saved at once and takes effect after a restart. A missing, damaged
 * or unknown value is 'auto'.
 *
 * Ported from Prozzta/guppyos 02d0d50b (MIT).
 */

export type GraphicsMode = 'auto' | 'gpu' | 'cpu';
export const GRAPHICS_MODES: readonly GraphicsMode[] = ['auto', 'gpu', 'cpu'];
export const DEFAULT_GRAPHICS_MODE: GraphicsMode = 'auto';

/** The mode from a stored or chosen value, or null when it is not one. Exact: no case folding, no trimming. */
export function parseGraphicsMode(v: unknown): GraphicsMode | null {
  return typeof v === 'string' && (GRAPHICS_MODES as readonly string[]).includes(v) ? (v as GraphicsMode) : null;
}

/** The mode a config asks for: its stored value when valid, else the default. */
export function graphicsModeOf(config: { graphicsMode?: unknown } | null | undefined): GraphicsMode {
  return parseGraphicsMode(config?.graphicsMode) ?? DEFAULT_GRAPHICS_MODE;
}

/** The mode in config.json's TEXT (read before app ready, so not through
 *  readConfig). Anything unreadable is the default: a damaged file never blocks
 *  startup and never forces a mode. */
export function graphicsModeFromConfigText(text: string | null | undefined): GraphicsMode {
  if (typeof text !== 'string') return DEFAULT_GRAPHICS_MODE;
  try {
    const parsed: unknown = JSON.parse(text);
    return parsed && typeof parsed === 'object' && !Array.isArray(parsed) ? graphicsModeOf(parsed as { graphicsMode?: unknown }) : DEFAULT_GRAPHICS_MODE;
  } catch {
    return DEFAULT_GRAPHICS_MODE;
  }
}

/** The WebGL power preference the floors ask for under a mode: 'high-performance'
 *  for GPU, and none (WebGL's own default) for Auto and CPU only. */
export function powerPreferenceFor(mode: GraphicsMode): 'high-performance' | undefined {
  return mode === 'gpu' ? 'high-performance' : undefined;
}

/** A WebGL UNMASKED_RENDERER string that names a software rasterizer (SwiftShader, WARP, llvmpipe ...). */
export function isSoftwareRenderer(name: string | null | undefined): boolean {
  return typeof name === 'string' && /swiftshader|llvmpipe|softpipe|software|basic render driver|microsoft basic|warp/i.test(name);
}

/**
 * A readable GPU name from a WebGL renderer string:
 * - Windows: "ANGLE (NVIDIA, NVIDIA GeForce RTX 4080 SUPER (0x00002702) Direct3D11 vs_5_0 ps_5_0, D3D11)"
 *   gives "NVIDIA GeForce RTX 4080 SUPER";
 * - macOS: "ANGLE (Apple, ANGLE Metal Renderer: Apple M2 Pro, Unspecified Version)" gives
 *   "Apple M2 Pro" (the general form below would read it as "ANGLE").
 * A string that is not ANGLE's is returned trimmed.
 */
export function gpuNameOf(renderer: string): string {
  const s = renderer.trim();
  const metal = /^ANGLE \([^,]*, ANGLE Metal Renderer: (.+?), [^,]*\)$/i.exec(s);
  if (metal) return metal[1].trim();
  const m = /^ANGLE \((?:[^,]*), (.*?)(?: \(0x[0-9a-f]+\))?(?: Direct3D.*| OpenGL.*| Vulkan.*| Metal.*)?, [^,]*\)$/i.exec(s);
  return (m ? m[1] : s).trim();
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
  /** True when this run disabled hardware acceleration (applied === 'cpu'). */
  hardwareDisabled: boolean;
  /** Chromium's view in main: gpu_compositing enabled (true), software (false), or unknown (null). */
  hardwareCompositing: boolean | null;
}

/** What main sends the Settings page: the status, and how many agent terminals a restart would stop. */
export interface GraphicsStatusView extends GraphicsStatus {
  runningAgents: number;
}

/** What the indicator says, as a kind for keyed words (never English here):
 *  the GPU in use (with its name once a floor has drawn), the CPU because the
 *  person chose CPU only, a fallback to the CPU under Auto or GPU, or unknown. */
export type RenderingState =
  | { kind: 'gpu'; name: string | null }
  | { kind: 'cpu' }
  | { kind: 'fallback'; mode: 'auto' | 'gpu' }
  | { kind: 'unknown' };

/**
 * The indicator's state, from what is ACTUALLY in use: the WebGL renderer a
 * floor got (null before any floor has drawn) and main's status. Software when
 * hardware acceleration is off, the renderer is a software rasterizer, or
 * Chromium composites in software; that last one is read fresh from main and
 * wins over a renderer a floor recorded earlier, so a GPU process fallback mid
 * run shows. It errs safe.
 */
export function renderingState(webglRenderer: string | null, status: Pick<GraphicsStatus, 'applied' | 'hardwareDisabled' | 'hardwareCompositing'>): RenderingState {
  const software = status.hardwareDisabled || isSoftwareRenderer(webglRenderer) || status.hardwareCompositing === false;
  if (software) return status.applied === 'cpu' ? { kind: 'cpu' } : { kind: 'fallback', mode: status.applied };
  if (webglRenderer) return { kind: 'gpu', name: gpuNameOf(webglRenderer) || null };
  return status.hardwareCompositing ? { kind: 'gpu', name: null } : { kind: 'unknown' };
}
