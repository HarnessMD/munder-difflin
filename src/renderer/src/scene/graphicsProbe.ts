// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * The renderer's half of the Graphics setting.
 *
 * - `floorPowerPreference()`: what the Pixi floors pass to `app.init` (StationFloor, OfficeFloor),
 *   from the mode this run STARTED with (main reads it before ready; a saved change waits for a restart).
 * - `recordFloorRenderer(app)`: after a floor's init, the WebGL UNMASKED_RENDERER it really got, for the
 *   Settings indicator ("Rendering: NVIDIA GeForce RTX 4080 SUPER (GPU)" / "Rendering: software (CPU)").
 * - `probeWebglRenderer()`: the same string from a throwaway canvas, for when no floor has drawn yet.
 */
import { powerPreferenceFor, type GraphicsStatus } from '@shared/graphicsMode';

let statusOnce: Promise<GraphicsStatus | null> | null = null;
/** main's graphics status, asked once per renderer (the applied mode cannot change without a restart). */
export function graphicsStatusOnce(): Promise<GraphicsStatus | null> {
  if (!statusOnce) {
    const api = (window as { cth?: { graphicsStatus?: () => Promise<GraphicsStatus> } }).cth;
    statusOnce = api?.graphicsStatus ? api.graphicsStatus().catch(() => null) : Promise.resolve(null);
  }
  return statusOnce;
}

/** The `powerPreference` init option for a floor: present ('high-performance') only under GPU. */
export async function floorPowerPreference(): Promise<{ powerPreference?: 'high-performance' }> {
  const s = await graphicsStatusOnce();
  const pp = powerPreferenceFor(s?.applied ?? 'auto');
  return pp ? { powerPreference: pp } : {};
}

/** The UNMASKED_RENDERER of a WebGL context, or null (no context, no debug extension, or a WebGPU renderer). */
export function webglRendererName(gl: WebGLRenderingContext | WebGL2RenderingContext | null | undefined): string | null {
  if (!gl || typeof gl.getExtension !== 'function') return null;
  try {
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    const name = ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER);
    return typeof name === 'string' && name ? name : null;
  } catch {
    return null;
  }
}

let lastRenderer: string | null = null;
/** Record the WebGL renderer a Pixi app got (best-effort: never throws into a floor's init). */
export function recordFloorRenderer(app: unknown): void {
  try {
    const name = webglRendererName((app as { renderer?: { gl?: WebGLRenderingContext } })?.renderer?.gl);
    if (name) lastRenderer = name;
  } catch { /* indicator only */ }
}

/** The renderer the floors got, else a throwaway canvas's (same GPU process, same flags), else null. */
export function currentRendererName(): string | null {
  return lastRenderer ?? probeWebglRenderer();
}

/** A WebGL context on a throwaway canvas, its renderer read and the context released. */
export function probeWebglRenderer(): string | null {
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl2') ?? canvas.getContext('webgl')) as WebGLRenderingContext | null;
    const name = webglRendererName(gl);
    try { gl?.getExtension('WEBGL_lose_context')?.loseContext(); } catch { /* released with the canvas */ }
    return name;
  } catch {
    return null;
  }
}
