/**
 * THE PUCK, main side: the window that floats over everything, the capture
 * overlay, and the folder of screenshots and meetings.
 *
 * WHY IT STAYS ON TOP, since that is the requirement everything else hangs
 * off. An ordinary always-on-top window drops behind a full screen app on
 * macOS the moment that app takes its own Space. So the puck is a PANEL
 * (`type: 'panel'`, an NSPanel), raised to the screen saver level, and marked
 * visible on every Space including full screen ones. A panel also never
 * activates the app when clicked, so a click on the puck does not yank focus
 * away from the meeting the person is in. On Windows the same call maps to
 * TOPMOST and a tool window; on Linux to the highest level the compositor
 * gives. The level is re-asserted on blur and on every config change, so a
 * window manager that quietly lowers it gets it back.
 *
 * WHY THE WINDOW IS BIGGER THAN THE DISC. The ring of actions needs room to
 * open, so the window is a square that holds the disc AND the open ring
 * (shared/puck ringFootprint). The transparent part is click through:
 * `setIgnoreMouseEvents(true, { forward: true })` lets clicks fall to the app
 * underneath while mouse moves still reach the page, and the page turns
 * ignore off the moment the cursor is over the disc and on again when it
 * leaves with nothing open; main never flips it on its own. The window is
 * never in
 * `allWindows`: the app's own broadcasts (config, hooks, enqueue) are not
 * for it, and liveWebContents must never pick it as "a live window".
 *
 * WHAT LEAVES THE MACHINE. Nothing, except the audio bytes of a recording
 * to the transcriber the person already keyed (Groq, the Free Flow key), and
 * only when a key is on file. A screenshot is a PNG in the person's own
 * harness home; sending it to the orchestrator sends its PATH in a hive
 * message, the same door the Inbox uses, and the orchestrator reads the file
 * from disk. No image ever crosses a network from this file.
 *
 * INVISIBLE TO A MEETING is `setContentProtection(true)`: the OS leaves the
 * window out of every screen capture and share. On by hand from the ring,
 * and automatically while recording when the config says so.
 */
import { app, BrowserWindow, desktopCapturer, ipcMain, nativeImage, screen, shell, systemPreferences } from 'electron';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync, appendFileSync } from 'node:fs';
import { basename, join, resolve, sep } from 'node:path';
import type { HarnessConfig } from './config';
import type { HiveMessage } from './hive';
import type { TranscribeOptions, TranscribeResult } from './freeflow';
import { resolveResponder } from '../shared/responder';
import {
  clampRegion, clockOf, cornerPosition, DEFAULT_PUCK_STATE, initialRegion, meetingEditable, meetingIdFor, meetingMessage,
  normalizePuckConfig, PUCK_AUDIO_TTL_MS, PUCK_DIR, PUCK_MAX_SHOTS, PUCK_MEETING_DESCRIPTION_MAX, PUCK_MEETING_SEND_MAX, PUCK_MEETING_TEXT_MAX, PUCK_MESSAGE_MAX_SECONDS, PUCK_MEETINGS_DIR, PUCK_SCREENSHOTS_DIR, PUCK_SHOT_TTL_MS, PUCK_SWEEP_EVERY_MS,
  isZoomKey, puckRecipients, resolvePuckPlacement, centreOf, clampCentre, segmentTranscribed, sendToFor, settleMeetingStatus, snapToEdge, windowFor,
  type MeetingLine, type MeetingMeta, type MeetingSegment, type MeetingTrackFile, type PuckConfig, type PuckDisplay, type PuckPoint, type PuckRect, type PuckState, type SystemAudioSource
} from '../shared/puck';
import { transcriptBlock, wholeClip } from '../shared/meetingMerge';
import { removeEcho } from '../shared/meetingEcho';
import { encodeWav } from '../shared/wav';
import { withTranscribeDefaults } from '../shared/transcribeConfig';
import { messageOverdue, TAKE_WATCHDOG_MS } from '../shared/puckTake';

export interface PuckDeps {
  readConfig(): HarnessConfig;
  writeConfig(patch: Partial<HarnessConfig>): HarnessConfig;
  onConfigWritten(listener: (cfg: HarnessConfig) => void): () => void;
  hiveEnabled(): boolean;
  hiveSend(partial: Partial<HiveMessage>, from: string): HiveMessage;
  /** 0.5.3, F16: `mode` tells the router which job this is; a voice message
   *  is dictation (Apple in its dictation mode on macOS 26), a meeting segment
   *  is a meeting (whisper with its rolling context). */
  transcribe(opts: TranscribeOptions & { mode?: 'dictation' | 'meeting' }): Promise<TranscribeResult>;
  /** 0.5.3, F16: whether anything can transcribe right now (a local engine or
   *  a Groq key). Absent means the old rule, a Groq key. */
  canTranscribe?(): boolean;
  /** The other side of the call (0.5.3, F16): where it comes from on this
   *  machine right now (a helper into main, a stream the renderer opens, or
   *  nothing), asked at every meeting start so a grant given since counts;
   *  and, for a helper source, the capture to begin and end with the
   *  meeting. Absent: the microphone alone, as before two tracks existed. */
  systemAudioSource?(): SystemAudioSource;
  startSystemAudio?(startedAt: number): Promise<void>;
  stopSystemAudio?(): Promise<void>;
  /** Push to the app's own windows (the settings screen listens). */
  broadcast(channel: string, payload: unknown): void;
  /** Bring the app's window forward, on a Settings section when one is
   *  named: the puck floats beside every other app, and the fix for a
   *  missing or refused key is in the app. */
  openSettings(section?: string): void;
  /** The agents a capture could actually reach: registered, not archived, with
   *  a terminal alive. Read at send time, never cached, because the floor
   *  changes while the puck sits there. */
  agentIds(): string[];
  /** What a person calls that agent. The orchestrator's is its live name, not
   *  the stock one. An id nobody has named comes back as the id. */
  agentName(id: string): string;
  preload: string;
  /** The dev server origin, or null when packaged. */
  rendererUrl: string | null;
  rendererDir: string;
}

let deps: PuckDeps | null = null;
let win: BrowserWindow | null = null;
let overlay: BrowserWindow | null = null;
let overlayDisplay: Electron.Display | null = null;
/** The renderer told us a Pro shell is on screen. Without it no window. */
let admitted = false;
/** The disc centre in screen coordinates, the thing a drag moves. */
let centre: PuckPoint | null = null;
/** True from dragStart to dragEnd. While it is true the disc follows the
 *  pointer; otherwise it goes where the CONFIG says (shared/puck
 *  resolvePuckPlacement), which is the only place the chosen screen is kept. */
let dragging = false;
/**
 * THE DRAG (rebuilt for rc.6, founder 26 Sep 2026: "it starts moving away from
 * the cursor ... this needs to be resolved from the scratch").
 *
 * MAIN MOVES THE WINDOW, AND MAIN READS THE POINTER. The page says only where
 * on the disc it was grabbed (dragStart), and that the hand let go (dragEnd).
 * While the drag runs a timer here reads the system pointer and puts the disc
 * under it at the same grab point, so the disc cannot drift from the pointer:
 * each frame is computed from where the pointer IS, never from a sum of moves.
 *
 * What it replaced: the page sent pointer deltas taken from `screenX`, and a
 * guard for platforms that cannot read the pointer switched to those deltas
 * whenever two reads of the pointer came back equal while the page reported a
 * move. On a Mac trackpad a slow move is a fraction of a pixel: the page saw
 * 0.4px, the system pointer (whole pixels) had not changed, and the guard
 * fired. From then on the disc followed `screenX` deltas, and `screenX` in a
 * window that is itself moving is measured from where the page last THOUGHT
 * the window was. Every move of the window came back as a move of the pointer,
 * and the disc walked away from the hand.
 *
 * The deltas are still the fallback, for a platform where the pointer cannot
 * be read at all (Wayland), and only there: they switch on only when the
 * pointer has not moved ONE PIXEL since the drag began while the page has
 * seen it travel DELTA_FALLBACK_PX. They are `movementX/Y`, the mouse's own
 * motion, which does not depend on where the window is.
 */
interface Drag {
  /** The pointer minus the disc centre, from the page, px. */
  grab: PuckPoint;
  /** 'cursor' reads the system pointer; 'deltas' adds the page's movement. */
  mode: 'cursor' | 'deltas';
  /** The pointer when the drag began, and the last one acted on. */
  first: PuckPoint | null;
  last: PuckPoint | null;
  /** The disc centre when the drag began, and the page's total movement. */
  from: PuckPoint;
  moved: PuckPoint;
  travel: number;
  /** When the pointer first moved with no word from the page since, ms. */
  unheard: number | null;
  timer: NodeJS.Timeout | null;
}
let drag: Drag | null = null;
export const DRAG_TICK_MS = 8;
export const DELTA_FALLBACK_PX = 24;
/** How far from the disc the pointer may read as a drag begins: the dead
 *  zone, a fast flick and a frame of lag, with room to spare. */
export const POINTER_TRUST_PX = 200;
/** The pointer moved and the page, which holds the pointer for the whole
 *  press, heard nothing for this long: the button is up. End the drag rather
 *  than let the disc follow a hand that is no longer holding it. */
export const DRAG_SILENT_MS = 700;
/** capture() hides the window on purpose for a quarter second. */
let hiddenForCapture = false;
let settleTimers: NodeJS.Timeout[] = [];
let manualInvisible = false;
let micLive = false;
let state: PuckState = { ...DEFAULT_PUCK_STATE };
/** Per meeting, so transcript lines append in segment order. */
const transcribeQueues = new Map<string, Promise<void>>();

/* ---- the other side of the call (0.5.3, F16, You and Them) ----------------
 * Where system audio comes from on this machine is declared by the platform
 * code (the Mac's tap helper, the Windows loopback, a Linux monitor source)
 * through `setSystemAudioSource`; nothing here knows how it is captured.
 * A HELPER source hands main 16 kHz mono int16 chunks while a meeting
 * records; they sit in the ring below and are cut to each microphone
 * segment's start and length as that segment lands, so the two files of a
 * segment cover the same seconds. A RENDERER source records a second
 * MediaRecorder beside the microphone and delivers it through
 * puck:meetingSegment with `track: 'them'`. */
let systemSource: SystemAudioSource = null;
export function setSystemAudioSource(kind: SystemAudioSource): void { systemSource = kind; }
export function systemAudioSource(): SystemAudioSource { return systemSource; }

const RING_RATE = 16_000;
interface Ring { startedAt: number; chunks: { at: number; pcm: Int16Array }[]; samples: number }
let ring: Ring | null = null;

/** The helper's door: begin at the meeting's start, push every chunk (with
 *  the helper's own stamp when it gives one), end with the meeting. */
export const meetingSystemAudio = {
  begin(startedAt = Date.now()): void { ring = { startedAt, chunks: [], samples: 0 }; },
  active(): boolean { return ring !== null; },
  push(pcm16: Buffer | Uint8Array | Int16Array, ts?: number): void {
    if (!ring) return;
    const pcm = pcm16 instanceof Int16Array ? pcm16 : new Int16Array(pcm16.buffer, pcm16.byteOffset, Math.floor(pcm16.byteLength / 2));
    if (pcm.length === 0) return;
    const at = typeof ts === 'number' && Number.isFinite(ts) ? ts : ring.startedAt + (ring.samples / RING_RATE) * 1000;
    ring.chunks.push({ at, pcm: pcm.slice() });
    ring.samples += pcm.length;
  },
  /** The samples between two moments on the wall clock, silence where the
   *  helper gave nothing (a gap is a gap, never a time shift). */
  cut(fromAt: number, toAt: number): Int16Array {
    const n = Math.max(0, Math.round(((toAt - fromAt) / 1000) * RING_RATE));
    const out = new Int16Array(n);
    if (!ring || n === 0) return out;
    for (const c of ring.chunks) {
      const offset = Math.round(((c.at - fromAt) / 1000) * RING_RATE);
      if (offset >= n || offset + c.pcm.length <= 0) continue;
      const src0 = Math.max(0, -offset);
      const dst0 = Math.max(0, offset);
      const len = Math.min(c.pcm.length - src0, n - dst0);
      if (len > 0) out.set(c.pcm.subarray(src0, src0 + len), dst0);
    }
    return out;
  },
  /** Drop what a delivered segment no longer needs, so a long call does not
   *  hold every chunk of itself. */
  trim(beforeAt: number): void {
    if (!ring) return;
    ring.chunks = ring.chunks.filter((c) => c.at + (c.pcm.length / RING_RATE) * 1000 > beforeAt);
  },
  end(): void { ring = null; }
};

/** A renderer's `them` clip that arrived before its microphone clip. */
const pendingThem = new Map<string, Map<number, { bytes: Uint8Array; ext: string }>>();

/** The mic gate reads this: true only while the puck is actually recording. */
export function puckMicLive(): boolean {
  return micLive;
}

/** Whether a renderer is the puck's own page (it shares the app's session,
 *  so the mic gate tells it apart from the main window by this). */
export function isPuckContents(wc: Electron.WebContents | null | undefined): boolean {
  return !!wc && !!win && !win.isDestroyed() && win.webContents === wc;
}

const cfgOf = (): PuckConfig => normalizePuckConfig(deps?.readConfig().puck);

/** The app's theme, as the title bar toggle last wrote it. It is stored under
 *  `terminalTheme` because terminals were the first thing to follow it; it is
 *  the whole app's theme. A config write runs sync(), so a flip lands live. */
const themeOf = (): 'light' | 'dark' => (deps?.readConfig().terminalTheme === 'dark' ? 'dark' : 'light');

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

/* ---- state ------------------------------------------------------------------ */

/** `quiet` keeps a change to the puck window alone: a drag repositions at
 *  animation rate, and the settings screen does not need sixty offsets a
 *  second, only the facts it draws (shown, recording, invisible, key). */
function setState(patch: Partial<PuckState>, quiet = false): void {
  state = { ...state, ...patch };
  try { if (win && !win.isDestroyed()) win.webContents.send('puck:state', state); } catch { /* window gone */ }
  if (quiet) return;
  try { deps?.broadcast('puck:state', state); } catch { /* no windows */ }
}

function pushConfig(cfg: PuckConfig): void {
  try { if (win && !win.isDestroyed()) win.webContents.send('puck:config', cfg); } catch { /* window gone */ }
}

function screenAccess(): PuckState['screenAccess'] {
  if (process.platform !== 'darwin') return 'granted';
  try { return systemPreferences.getMediaAccessStatus('screen'); } catch { return 'unknown'; }
}

function canTranscribe(): boolean {
  if (deps?.canTranscribe) return deps.canTranscribe();
  const key = deps?.readConfig().groqApiKey;
  return typeof key === 'string' && key.trim().length > 0;
}

/* ---- the window --------------------------------------------------------------- */

function loadPage(w: BrowserWindow, page: 'puck' | 'capture'): void {
  if (!deps) return;
  if (deps.rendererUrl) void w.loadURL(`${deps.rendererUrl.replace(/\/$/, '')}/${page}.html`);
  else void w.loadFile(join(deps.rendererDir, `${page}.html`));
}

/** Keep a Stapler page at 100%. Main places the disc in window pixels and
 *  the page draws it in CSS pixels, so any zoom moves the disc off the point
 *  main put it (and off the cursor during a drag). Chromium SAVES a page's
 *  zoom, so a level set once comes back on every launch: it is undone on
 *  every load and every change, and the keys and the pinch that set it are
 *  refused. */
function lockZoom(w: BrowserWindow): void {
  const wc = w.webContents;
  const reset = () => { try { if (!wc.isDestroyed() && wc.getZoomLevel() !== 0) wc.setZoomLevel(0); } catch { /* mid teardown */ } };
  wc.on('did-finish-load', () => {
    reset();
    try { void wc.setVisualZoomLevelLimits(1, 1); } catch { /* noop */ }
  });
  wc.on('zoom-changed', reset);
  wc.on('before-input-event', (e, input) => {
    if (isZoomKey(input, process.platform === 'darwin')) { e.preventDefault(); reset(); }
  });
}

function platformWindowType(): { type?: string } {
  if (process.platform === 'darwin') return { type: 'panel' };
  if (process.platform === 'win32') return { type: 'toolbar' };
  return {};
}

function raise(w: BrowserWindow, onTop: boolean): void {
  // While the selector is up the Capture and Cancel buttons are on the puck
  // (0.5.2), so the puck must sit ABOVE the overlay (level 2) whatever the
  // always-on-top setting says; otherwise the overlay's dim covers it and the
  // buttons cannot be reached. Back to its own level when the capture ends.
  const capturing = state.capturing;
  try {
    w.setAlwaysOnTop(onTop || capturing, 'screen-saver', capturing ? 3 : 1);
    w.setVisibleOnAllWorkspaces(onTop || capturing, { visibleOnFullScreen: true, skipTransformProcessType: true });
  } catch { /* not every platform accepts every level */ }
}

/** The disc centre: the live one while the window is up, else the saved
 *  one, else the configured corner of the primary display. `place` clamps
 *  it to whichever display is nearest, so a position saved on a monitor
 *  that is gone lands on the nearest edge of one that is here. */
const asDisplay = (d: Electron.Display): PuckDisplay => ({ id: d.id, bounds: d.bounds, workArea: d.workArea });

/** Where the disc goes and on WHICH screen. Mid drag that is wherever the
 *  pointer has taken it. Otherwise it is what the config says, asked fresh every
 *  time, so there is no copy in here to go stale. */
function target(cfg: PuckConfig): { centre: PuckPoint; area: PuckRect } {
  if (dragging && centre) return { centre, area: screen.getDisplayNearestPoint(centre).workArea };
  let all: Electron.Display[] = [];
  let primaryId: number | null = null;
  try { all = screen.getAllDisplays(); primaryId = screen.getPrimaryDisplay().id; } catch { /* not ready */ }
  const t = resolvePuckPlacement({ home: cfg.home, position: cfg.position, corner: cfg.corner, size: cfg.size, displays: all.map(asDisplay), primaryId });
  if (t) return { centre: t.centre, area: t.display.workArea };
  const area = screen.getPrimaryDisplay().workArea;
  return { centre: cornerPosition(cfg.corner, area, cfg.size), area };
}

/** The disc centre as last placed, for a drag to start from. */
function currentCentre(cfg: PuckConfig): PuckPoint {
  return centre ?? target(cfg).centre;
}

function readPointer(): PuckPoint | null {
  try { return screen.getCursorScreenPoint(); } catch { return null; /* wayland */ }
}

function stopDrag(): void {
  if (drag?.timer) clearInterval(drag.timer);
  drag = null;
  dragging = false;
}

/** One frame of a drag: the disc under the pointer, at the point it was
 *  grabbed. Only when the pointer moved, so a still hand costs nothing. */
function dragTick(): void {
  const g = drag;
  if (!g || g.mode !== 'cursor' || !win || win.isDestroyed()) return;
  const p = readPointer();
  if (!p) return;
  const now = Date.now();
  if (g.last && p.x === g.last.x && p.y === g.last.y) {
    if (g.unheard !== null && now - g.unheard > DRAG_SILENT_MS) endDrag();
    return;
  }
  if (g.last && g.unheard === null) g.unheard = now;
  if (g.unheard !== null && now - g.unheard > DRAG_SILENT_MS) { endDrag(); return; }
  g.last = p;
  centre = { x: p.x - g.grab.x, y: p.y - g.grab.y };
  place(cfgOf());
}

/** The hand let go: snap if configured, keep the whole disc on the screen it
 *  was dropped on, save the choice. */
function endDrag(): void {
  const g = drag;
  if (!g || !deps) { stopDrag(); return; }
  if (g.timer) { clearInterval(g.timer); g.timer = null; }
  const cfg = cfgOf();
  if (g.mode === 'cursor') {
    const p = readPointer();
    if (p) centre = { x: p.x - g.grab.x, y: p.y - g.grab.y };
  }
  const c = currentCentre(cfg);
  const on = screen.getDisplayNearestPoint(c);
  // Snap or not, the whole disc ends on the work area of the screen it was
  // dropped on (snapToEdge clamps; a plain drop is clamped here). Placed once
  // more WHILE still dragging, so it is this screen's clamp that applies.
  centre = cfg.snapToEdges ? snapToEdge(c, on.workArea, cfg.size) : clampCentre(c, on.workArea, cfg.size);
  place(cfg);
  const parked = centre;
  stopDrag();
  // The CHOICE: which screen, and where on it. This is what survives the
  // origin moving, the screen sleeping, and the window being made again. The
  // point is kept beside it for a config an older build may read.
  deps.writeConfig({ puck: { ...cfg, position: parked, home: { displayId: on.id, dx: parked.x - on.bounds.x, dy: parked.y - on.bounds.y } } });
}

/** Put the window where the target asks, clamped to THE TARGET'S OWN SCREEN,
 *  and tell the page where the disc sits inside the window. Not "the screen
 *  nearest that point": when the Stapler's screen shrank past it, that handed
 *  it to the neighbour (finding 10). */
function place(cfg: PuckConfig): void {
  if (!win || win.isDestroyed()) return;
  const t = target(cfg);
  const { window: bounds, offset, screen: onIt } = windowFor(t.centre, t.area, cfg.size);
  let disc = { x: bounds.x + offset.x, y: bounds.y + offset.y };
  let real = bounds;
  try {
    win.setBounds(bounds);
    // The system may move a window it thinks is too big or too far out (macOS
    // keeps windows under the menu bar). Believe where it actually went, and
    // keep the disc on the work area inside it, so the page never draws the
    // disc somewhere the window is not (founder, rc.4: off screen for good).
    const got = win.getBounds();
    if (got.x !== bounds.x || got.y !== bounds.y || got.width !== bounds.width || got.height !== bounds.height) {
      real = got;
      const inWin = { x: Math.max(t.area.x, got.x), y: Math.max(t.area.y, got.y), width: 0, height: 0 };
      inWin.width = Math.min(t.area.x + t.area.width, got.x + got.width) - inWin.x;
      inWin.height = Math.min(t.area.y + t.area.height, got.y + got.height) - inWin.y;
      if (inWin.width > 0 && inWin.height > 0) disc = clampCentre(disc, inWin, cfg.size);
    }
  } catch { /* mid teardown */ }
  centre = disc;
  const at = { x: disc.x - real.x, y: disc.y - real.y };
  const screenIn = real === bounds ? onIt : { x0: t.area.x - real.x, y0: t.area.y - real.y, x1: t.area.x + t.area.width - real.x, y1: t.area.y + t.area.height - real.y };
  setState({ offset: at, screen: screenIn }, true);
}

/** The displays changed. Ask the config again and place. NOTHING IS FORGOTTEN
 *  HERE: a screen going away is not the person changing their mind, and the
 *  choice is what brings the Stapler back when the screen does. */
function rehome(): void {
  if (!win || win.isDestroyed()) return;
  if (!dragging) centre = null;
  place(cfgOf());
  // macOS can leave a panel hidden or on the wrong Space after a rearrangement.
  // Re-assert the level and the visibility, except while capture() is holding
  // the window out of the picture on purpose.
  if (state.shown && !hiddenForCapture) {
    raise(win, cfgOf().alwaysOnTop);
    try { if (!win.isVisible()) win.showInactive(); } catch { /* mid teardown */ }
  }
}

/** One look is not enough. The event arrives while the system is still
 *  rearranging, and a single stale read used to be final because nothing ever
 *  looked again. Look now, and twice more once it has had time to settle. */
function displaysChanged(): void {
  for (const t of settleTimers) clearTimeout(t);
  rehome();
  settleTimers = [400, 2000].map((ms) => {
    const t = setTimeout(() => { rehome(); }, ms);
    t.unref?.();
    return t;
  });
}

/** THE OTHER SIDE OF THE CALL ON WINDOWS (0.5.3, F16, PR 3). The puck's
 *  recorder asks getDisplayMedia for the screen with audio; this answers
 *  it, for the puck window's session only, with the primary screen and
 *  Electron's loopback capture of everything the machine plays (Electron 31
 *  and later; Chromium's picker never opens). The renderer keeps the audio
 *  track and drops the video (puck/systemAudio.ts). Elsewhere nothing is
 *  installed: the Mac has a helper, and Linux opens a monitor source as a
 *  plain input. */
function installLoopback(w: BrowserWindow): void {
  if (process.platform !== 'win32') return;
  try {
    w.webContents.session.setDisplayMediaRequestHandler((_request, callback) => {
      desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } })
        .then((sources) => {
          const source = sources[0];
          if (!source) { callback({}); return; }
          callback({ video: source, audio: 'loopback' });
        })
        .catch(() => callback({}));
    });
  } catch (e) {
    console.log(`[puck] loopback handler not installed: ${errMsg(e)}`);
  }
}

/** THE MEETING CHORD (0.5.3, F16): main heard the press. The puck's renderer
 *  owns the recorder, so the toggle goes to it as `puck:meetingToggle` and
 *  runs the very code a click on the meeting recorder runs (start, or stop
 *  when a meeting is on). A hidden puck comes up first; a Stapler switched
 *  off in Settings is left off and the press is refused with a reason. A
 *  message being spoken is not interrupted. */
/** The capture chord (I6, founder 23 Sep 2026): the first press opens the
 *  capture box with the puck shown, a press while the box is up takes the
 *  picture, and the picture joins the card like a click on Capture. The
 *  same refusals as the meeting chord, bar a message being recorded (a
 *  spoken message takes pictures). */
export async function captureByKey(): Promise<{ ok: true; step: 'open' | 'capture' } | { ok: false; error: string }> {
  if (!deps) return { ok: false, error: 'not-registered' };
  if (overlay && !overlay.isDestroyed()) {
    const r = requestCapture();
    return r.ok ? { ok: true, step: 'capture' } : r;
  }
  if (!win || win.isDestroyed()) {
    if (!admitted) return { ok: false, error: 'not-admitted' };
    const cfg = cfgOf();
    if (!cfg.enabled) return { ok: false, error: 'puck-off' };
    createWindow(cfg);
  }
  const w = win;
  if (!w || w.isDestroyed()) return { ok: false, error: 'no-window' };
  try { if (!w.isVisible()) w.showInactive(); raise(w, cfgOf().alwaysOnTop); } catch { /* mid teardown */ }
  if (w.webContents.isLoading()) await new Promise<void>((res) => w.webContents.once('did-finish-load', () => res()));
  const r = await openOverlay();
  return r.ok ? { ok: true, step: 'open' } : r;
}

/** DICTATION FROM ANYWHERE, SHOWN ON THE STAPLER (0.5.3, founder 24 Sep):
 *  main's any app events, forwarded as `puck:dictation` with whether to play
 *  the start and stop sounds. Only to a Stapler that is already up: a take
 *  never creates or reveals the window, and a hidden Stapler stays hidden. */
export function puckDictationEvent(e: { type: string } & Record<string, unknown>, sounds: boolean): void {
  const w = win;
  if (!w || w.isDestroyed() || w.webContents.isLoading()) return;
  try { w.webContents.send('puck:dictation', { ...e, sounds }); } catch { /* mid teardown */ }
}

export function toggleMeetingByKey(): { ok: true } | { ok: false; error: string } {
  if (!deps) return { ok: false, error: 'not-registered' };
  if (state.recording?.kind === 'message') return { ok: false, error: 'message-recording' };
  if (!win || win.isDestroyed()) {
    if (!admitted) return { ok: false, error: 'not-admitted' };
    const cfg = cfgOf();
    if (!cfg.enabled) return { ok: false, error: 'puck-off' };
    createWindow(cfg);
  }
  const w = win;
  if (!w || w.isDestroyed()) return { ok: false, error: 'no-window' };
  try { if (!w.isVisible()) w.showInactive(); raise(w, cfgOf().alwaysOnTop); } catch { /* mid teardown */ }
  const send = (): void => { if (!w.isDestroyed()) w.webContents.send('puck:meetingToggle', { at: Date.now() }); };
  if (w.webContents.isLoading()) w.webContents.once('did-finish-load', send); else send();
  return { ok: true };
}

function createWindow(cfg: PuckConfig): void {
  if (!deps || win) return;
  const first = target(cfg);
  const { window: bounds } = windowFor(first.centre, first.area, cfg.size);
  win = new BrowserWindow({
    ...bounds,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: cfg.alwaysOnTop,
    show: false,
    // A panel window must not carry a title bar of any kind; on macOS
    // 'hidden' still draws the traffic lights over transparent content.
    titleBarStyle: 'default',
    backgroundColor: '#00000000',
    acceptFirstMouse: true,
    // The square grows with the size slider past a laptop's height. Without
    // this macOS may cut the window to the screen, and the disc, placed for
    // the full square, lands in the part that was cut.
    enableLargerThanScreen: true,
    ...platformWindowType(),
    webPreferences: {
      preload: deps.preload,
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // The puck runs a recorder; a throttled timer would stretch segments.
      backgroundThrottling: false,
      // The dictation start and stop sounds play with no click in this window
      // (the press was in another app), so autoplay may not wait for one.
      autoplayPolicy: 'no-user-gesture-required'
    }
  } as Electron.BrowserWindowConstructorOptions);
  const w = win;
  installLoopback(w);
  lockZoom(w);
  try { w.setMenuBarVisibility(false); } catch { /* macOS has no per window menu */ }
  raise(w, cfg.alwaysOnTop);
  try { w.setIgnoreMouseEvents(true, { forward: true }); } catch { /* linux: no forward */ }
  w.on('blur', () => { if (!w.isDestroyed()) raise(w, cfgOf().alwaysOnTop); });
  w.once('ready-to-show', () => { if (!w.isDestroyed()) w.showInactive(); });
  w.webContents.on('did-finish-load', () => {
    // A page that reloads in the middle of a drag never sends dragEnd (finding 23).
    stopDrag();
    pushConfig(cfgOf());
    setState({ shown: true, canTranscribe: canTranscribe(), screenAccess: screenAccess(), theme: themeOf(), ...who() });
    place(cfgOf());
  });
  w.on('closed', () => {
    if (win === w) win = null;
    setState({ shown: false, menuOpen: false });
  });
  loadPage(w, 'puck');
  applyProtection(cfg);
}

function destroyWindow(): void {
  closeOverlay();
  if (win && !win.isDestroyed()) { try { win.destroy(); } catch { /* already gone */ } }
  win = null;
  // The next window starts from the saved position, not from wherever a
  // window that no longer exists was last clamped to.
  stopDrag();
  centre = null;
  setState({ shown: false, menuOpen: false, capturing: false });
}

/** The one place that decides whether the window should exist, and applies
 *  the parts of the config the WINDOW owns (level, size, protection). */
function sync(): void {
  const cfg = cfgOf();
  // BEFORE any early return. These two are read by the Settings screen as well
  // as by the Stapler window, and with the Stapler switched off there is no
  // window, so the old place for this line (the bottom) was never reached and
  // changing "Send captures to" left the Settings buttons on the old name
  // (Creed's review, finding 19).
  const facts = { theme: themeOf(), ...who() };
  if (facts.theme !== state.theme || !sameWho(facts)) setState(facts);
  const want = admitted && cfg.enabled;
  if (want && !win) createWindow(cfg);
  if (!want && win) { destroyWindow(); return; }
  if (!win || win.isDestroyed()) return;
  raise(win, cfg.alwaysOnTop);
  applyProtection(cfg);
  pushConfig(cfg);
  place(cfg);
  setState({ canTranscribe: canTranscribe(), theme: themeOf(), ...who() });
}

function applyProtection(cfg: PuckConfig): void {
  const on = manualInvisible || (state.recording !== null && cfg.invisibleWhileRecording);
  for (const w of [win, overlay]) {
    if (w && !w.isDestroyed()) { try { w.setContentProtection(on); } catch { /* unsupported */ } }
  }
  if (state.invisible !== on) setState({ invisible: on });
}

/* ---- folders ----------------------------------------------------------------- */

function puckRoot(): string | null {
  const home = deps?.readConfig().harnessHome;
  return home ? join(home, PUCK_DIR) : null;
}

function ensureDir(p: string): string {
  mkdirSync(p, { recursive: true });
  return p;
}

/** A path handed back by a renderer must be one WE minted under the puck
 *  folder; anything else is refused before it reaches the shell. */
function underPuck(p: unknown): string | null {
  const root = puckRoot();
  if (!root || typeof p !== 'string' || !p) return null;
  const abs = resolve(p);
  return abs === root || abs.startsWith(root + sep) ? abs : null;
}

function readJson<T>(p: string): T | null {
  try { return JSON.parse(readFileSync(p, 'utf8')) as T; } catch { return null; }
}

/* ---- screenshots ------------------------------------------------------------- */

interface ScreenshotSidecar {
  takenAt: string;
  region: PuckRect;
  displayId: string;
  width: number;
  height: number;
  note: string | null;
  sentAt: string | null;
  /** Set by the sweep when the image is removed and the sidecar is kept as a
   *  tombstone (a capture that was SENT). Absent on a live capture. */
  deletedAt?: string | null;
}

/** macOS reports screen access as `denied` until the first capture attempt:
 *  the status call only asks whether access is granted right now, and nothing
 *  in its answer means "never asked". So a fresh app that refused on `denied`
 *  never asked, never appeared under Screen Recording in System Settings, and
 *  the founder saw the "off in System Settings" note with nothing there to
 *  turn on (7 Sep 2026, dev build; a signed build behaves the same). One
 *  capture attempt is what makes macOS ask and list the app, so make it
 *  before refusing. The answer is still read off the status afterwards: macOS
 *  grants only after the app is reopened, so the note says so. */
async function ensureScreenAccess(): Promise<PuckState['screenAccess']> {
  const access = screenAccess();
  if (access !== 'denied' && access !== 'restricted') return access;
  try { await desktopCapturer.getSources({ types: ['screen'], thumbnailSize: { width: 1, height: 1 } }); } catch { /* the status below is the answer */ }
  return screenAccess();
}

async function openOverlay(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!deps || !win || win.isDestroyed()) return { ok: false, error: 'puck not shown' };
  if (overlay) return { ok: true };
  const access = await ensureScreenAccess();
  setState({ screenAccess: access });
  if (access === 'denied' || access === 'restricted') return { ok: false, error: 'screen-denied' };
  const cfg = cfgOf();
  const display = screen.getDisplayNearestPoint(currentCentre(cfg));
  overlayDisplay = display;
  const b = display.bounds;
  overlay = new BrowserWindow({
    x: b.x, y: b.y, width: b.width, height: b.height,
    frame: false,
    transparent: true,
    hasShadow: false,
    resizable: false,
    movable: false,
    minimizable: false,
    maximizable: false,
    fullscreenable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    enableLargerThanScreen: true,
    show: false,
    backgroundColor: '#00000000',
    ...platformWindowType(),
    webPreferences: { preload: deps.preload, sandbox: true, contextIsolation: true, nodeIntegration: false }
  } as Electron.BrowserWindowConstructorOptions);
  const o = overlay;
  lockZoom(o);
  try { o.setMenuBarVisibility(false); } catch { /* noop */ }
  try {
    o.setAlwaysOnTop(true, 'screen-saver', 2);
    o.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true, skipTransformProcessType: true });
  } catch { /* noop */ }
  o.webContents.on('did-finish-load', () => {
    if (o.isDestroyed()) return;
    const region = initialRegion(cfg.captureRegion, { id: String(display.id), width: b.width, height: b.height });
    o.webContents.send('puck:captureInit', { region, width: b.width, height: b.height });
    // Bounds again after load: a panel created larger than the screen is
    // sometimes handed back smaller than it asked for.
    try { o.setBounds({ x: b.x, y: b.y, width: b.width, height: b.height }); } catch { /* noop */ }
    o.show();
    o.focus();
  });
  o.on('closed', () => { if (overlay === o) { overlay = null; overlayDisplay = null; } setState({ capturing: false }); });
  loadPage(o, 'capture');
  applyProtection(cfg);
  setState({ capturing: true, menuOpen: false });
  raise(win, cfg.alwaysOnTop);
  return { ok: true };
}

/** The Stapler's Capture button. The overlay owns the box, so the request
 *  goes to it and it confirms with what it holds (0.5.2). */
function requestCapture(): { ok: true } | { ok: false; error: string } {
  if (!overlay || overlay.isDestroyed()) return { ok: false, error: 'no capture in progress' };
  try { overlay.webContents.send('puck:captureRequest'); } catch { return { ok: false, error: 'no capture in progress' }; }
  return { ok: true };
}

function closeOverlay(): void {
  if (overlay && !overlay.isDestroyed()) { try { overlay.destroy(); } catch { /* noop */ } }
  overlay = null;
  overlayDisplay = null;
  if (state.capturing) setState({ capturing: false });
  if (win && !win.isDestroyed()) raise(win, cfgOf().alwaysOnTop);
}

/** An empty first picture is asked for again this many times, this far apart. */
export const CAPTURE_RETRIES = 3;
export const CAPTURE_RETRY_MS = 300;

async function capture(rectIn: unknown): Promise<{ ok: true; path: string; preview: string; width: number; height: number } | { ok: false; error: string }> {
  if (!deps) return { ok: false, error: 'not registered' };
  const display = overlayDisplay;
  const root = puckRoot();
  if (!display) return { ok: false, error: 'no capture in progress' };
  if (!root) return { ok: false, error: 'no harness home' };
  const r = (rectIn ?? {}) as PuckRect;
  if (![r.x, r.y, r.width, r.height].every(Number.isFinite)) return { ok: false, error: 'bad region' };
  const rect = clampRegion(r, display.bounds.width, display.bounds.height);
  // Remember the box first, so even a failed capture opens where the person
  // left it next time.
  const cfg = cfgOf();
  deps.writeConfig({ puck: { ...cfg, captureRegion: { ...rect, displayId: String(display.id) } } });
  // The puck and the overlay must not be in the picture. Hide, then give the
  // compositor a beat; a capture in the same tick still shows them.
  try { overlay?.hide(); } catch { /* noop */ }
  hiddenForCapture = true;
  try { win?.hide(); } catch { /* noop */ }
  await sleep(240);
  try {
    const scale = display.scaleFactor || 1;
    const grab = async () => {
      const sources = await desktopCapturer.getSources({
        types: ['screen'],
        thumbnailSize: { width: Math.round(display.bounds.width * scale), height: Math.round(display.bounds.height * scale) }
      });
      return sources.find((s) => s.display_id === String(display.id)) ?? sources[0];
    };
    // The first grab after the app starts can come back as an empty picture
    // (seen 25 Sep 2026 on the founder's report and in a test instance: the
    // same capture a moment later works). Ask again, briefly, before saying so.
    let src = await grab();
    for (let i = 0; i < CAPTURE_RETRIES && src && src.thumbnail.isEmpty(); i++) {
      await sleep(CAPTURE_RETRY_MS);
      src = await grab();
      console.warn(`[puck] capture: empty picture, asked again (${i + 1})${src && !src.thumbnail.isEmpty() ? ', got it' : ''}`);
    }
    if (!src) return { ok: false, error: 'no screen source' };
    const full = src.thumbnail;
    const size = full.getSize();
    // macOS can say screen access is granted and still hand back an empty
    // picture, even after the retries above. That needs a different fix from
    // a grant that is off, so it gets its own reason.
    if (size.width === 0 || size.height === 0) return { ok: false, error: screenAccess() === 'granted' ? 'screen-empty' : 'screen-denied' };
    const sx = size.width / display.bounds.width;
    const sy = size.height / display.bounds.height;
    const crop = full.crop({
      x: Math.round(rect.x * sx), y: Math.round(rect.y * sy),
      width: Math.max(1, Math.round(rect.width * sx)), height: Math.max(1, Math.round(rect.height * sy))
    });
    const dir = ensureDir(join(root, PUCK_SCREENSHOTS_DIR));
    const stamp = meetingIdFor(new Date());
    const path = join(dir, `${stamp}.png`);
    writeFileSync(path, crop.toPNG());
    const side: ScreenshotSidecar = {
      takenAt: new Date().toISOString(), region: rect, displayId: String(display.id),
      width: crop.getSize().width, height: crop.getSize().height, note: null, sentAt: null
    };
    writeFileSync(join(dir, `${stamp}.json`), JSON.stringify(side, null, 2));
    const preview = crop.resize({ width: Math.min(360, crop.getSize().width) }).toDataURL();
    const result = { ok: true as const, path, preview, width: side.width, height: side.height };
    // The overlay asked; the PUCK is where the note gets written. Tell it.
    try { if (win && !win.isDestroyed()) win.webContents.send('puck:captured', result); } catch { /* noop */ }
    return result;
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  } finally {
    closeOverlay();
    hiddenForCapture = false;
    try { if (win && !win.isDestroyed()) win.showInactive(); } catch { /* noop */ }
    setState({ screenAccess: screenAccess() });
  }
}

/** DELETE WHAT IS OLDER THAN A DAY (founder, 9 Sep 2026). Runs at start-up and
 *  hourly, and again whenever the screen asks for the list, so what a person
 *  sees is never a row for a file the rule should already have removed.
 *
 *  A capture that was NEVER SENT is removed whole, image and sidecar: nothing
 *  refers to it. A capture that WAS SENT loses its image and keeps its sidecar
 *  as a tombstone, because the hive message we wrote names the file by path
 *  and our own protocol tells agents to re-read their inbox. An agent opening
 *  a week-old message and finding nothing would be a hole we manufactured, so
 *  the record stays and the screen can say the image was deleted.
 *
 *  The sweep UNLINKS rather than moving to the Trash: the complaint being
 *  answered is that captures pile up, and the Trash is still the disk. A
 *  person's own delete button still trashes, because that one is recoverable
 *  by design. */
function sweepScreenshots(now = Date.now()): { removed: number; tombstoned: number } {
  const root = puckRoot();
  const out = { removed: 0, tombstoned: 0 };
  if (!root) return out;
  const dir = join(root, PUCK_SCREENSHOTS_DIR);
  if (!existsSync(dir)) return out;
  for (const f of readdirSync(dir)) {
    if (!f.endsWith('.png')) continue;
    const png = join(dir, f);
    const sidePath = join(dir, f.replace(/\.png$/, '.json'));
    const side = readJson<ScreenshotSidecar>(sidePath);
    let takenAt = side?.takenAt ? Date.parse(side.takenAt) : NaN;
    if (!Number.isFinite(takenAt)) { try { takenAt = statSync(png).mtimeMs; } catch { continue; } }
    if (now - takenAt < PUCK_SHOT_TTL_MS) continue;
    try { rmSync(png, { force: true }); } catch { continue; }
    out.removed += 1;
    if (side?.sentAt) {
      try { writeFileSync(sidePath, JSON.stringify({ ...side, deletedAt: new Date(now).toISOString() }, null, 2)); out.tombstoned += 1; } catch { /* best effort */ }
    } else {
      try { rmSync(sidePath, { force: true }); } catch { /* best effort */ }
    }
  }
  return out;
}

/** DELETE A MEETING'S AUDIO A DAY AFTER IT IS TRANSCRIBED (founder, 9 Sep
 *  2026: "we should not save the audio, we should only save transcription with
 *  metadata", then "take the 24 hour version"). Same sweep and same day as the
 *  screenshots; only the clock differs, and god ruled that clock on 9 Sep.
 *
 *  IT COUNTS FROM THE TRANSCRIPTION, NOT FROM THE RECORDING. A meeting whose
 *  segments are still pending keeps every byte: `meetingTranscribePending`
 *  promises that an older recording transcribes the moment a key arrives, and
 *  audio that expired while it waited would turn that promise into a lie. A
 *  segment that never transcribes is therefore never swept, which is safe now
 *  that a keyless meeting cannot be started at all; the only pending audio on
 *  any disk is from a build before 0.5.2.
 *
 *  A segment transcribed by such an older build has no `transcribedAt`. Rather
 *  than give week-old audio a fresh day, the fallback is the audio file's own
 *  mtime, which is the moment it was recorded and within seconds of when it
 *  was transcribed on that path. New segments always carry the real stamp, so
 *  the fallback only ever reaches the old ones.
 *
 *  THE TRANSCRIPT AND THE META ARE NEVER DELETED. The segment's row stays and
 *  gains `audioDeletedAt`, so the screen can say the audio went rather than
 *  quietly showing a meeting that no longer has any. */
function sweepMeetingAudio(now = Date.now()): { removed: number } {
  const root = puckRoot();
  const out = { removed: 0 };
  if (!root) return out;
  const base = join(root, PUCK_MEETINGS_DIR);
  if (!existsSync(base)) return out;
  for (const id of readdirSync(base)) {
    const dir = meetingDir(id);
    const meta = dir ? readMeta(id) : null;
    if (!dir || !meta) continue;
    let changed = false;
    for (const seg of meta.segments) {
      // Both tracks of a segment are on the same clock: the microphone's
      // file and the other side's, each from its own transcription stamp.
      for (const part of [seg, seg.them].filter((x): x is MeetingSegment | MeetingTrackFile => !!x)) {
        if (!part.transcribed || part.audioDeletedAt) continue;
        const file = join(dir, part.file);
        if (!existsSync(file)) continue;
        let at = part.transcribedAt ? Date.parse(part.transcribedAt) : NaN;
        if (!Number.isFinite(at)) { try { at = statSync(file).mtimeMs; } catch { continue; } }
        if (now - at < PUCK_AUDIO_TTL_MS) continue;
        try { rmSync(file, { force: true }); } catch { continue; }
        part.audioDeletedAt = new Date(now).toISOString();
        changed = true;
        out.removed += 1;
      }
    }
    if (changed) { writeMeta(meta); deps?.broadcast('puck:meetingsChanged', { id }); }
  }
  return out;
}

/** Both rules, one call. Everything that swept screenshots sweeps the audio
 *  too: start-up, the hourly timer, and each list the screen asks for. */
function sweepPuck(now = Date.now()): void {
  sweepScreenshots(now);
  sweepMeetingAudio(now);
}

/** Newest first, the most recent 60. Rows come from the SIDECARS as well as
 *  the images, so a tombstone (a sent capture whose image the sweep removed)
 *  is still listed rather than silently vanishing from the screen. */
function listScreenshots(): Array<{ path: string; takenAt: string; note: string | null; sentAt: string | null; width: number; height: number; thumb: string; deletedAt: string | null }> {
  const root = puckRoot();
  if (!root) return [];
  const dir = join(root, PUCK_SCREENSHOTS_DIR);
  if (!existsSync(dir)) return [];
  const out: ReturnType<typeof listScreenshots> = [];
  const names = new Set<string>();
  for (const f of readdirSync(dir)) {
    if (f.endsWith('.png')) names.add(f.slice(0, -4));
    else if (f.endsWith('.json')) names.add(f.slice(0, -5));
  }
  for (const stamp of [...names].sort().reverse().slice(0, 60)) {
    const path = join(dir, `${stamp}.png`);
    const side = readJson<ScreenshotSidecar>(join(dir, `${stamp}.json`));
    const alive = existsSync(path);
    if (!alive && !side) continue;
    let thumb = '';
    if (alive) {
      try { thumb = nativeImage.createFromPath(path).resize({ width: 240 }).toDataURL(); } catch { thumb = ''; }
    }
    out.push({
      path,
      takenAt: side?.takenAt ?? (alive ? new Date(statSync(path).mtimeMs).toISOString() : new Date(0).toISOString()),
      note: side?.note ?? null,
      sentAt: side?.sentAt ?? null,
      width: side?.width ?? 0,
      height: side?.height ?? 0,
      thumb,
      deletedAt: alive ? null : (side?.deletedAt ?? null)
    });
  }
  return out;
}

/* ---- sending to the orchestrator ------------------------------------------------- */

/** Where a capture goes. `sendTo` is a stored id and the floor moves under it:
 *  the agent may have been archived, killed, or never spawned since the config
 *  was written. `resolveResponder` is the rule we already ship for exactly that
 *  question on Slack and teammate messages, so a capture aimed at an agent that
 *  is not running lands on the orchestrator rather than in nobody's inbox. */
function captureTarget(): string {
  const ids = deps?.agentIds() ?? [];
  return resolveResponder(cfgOf().sendTo, ids, 'god');
}

/** The same answer, as a name. The rule above is not restated here: whoever
 *  it picks is who gets named, so the words cannot drift from the routing. */
function recipientName(id?: string): string {
  // A label must never be able to take the window down with it, so the whole
  // lookup is guarded, the routing rule included: it reads the live floor.
  try {
    const to = id ?? captureTarget();
    return deps?.agentName(to) || to;
  } catch { return id ?? ''; }
}

/** Everything the send card's picker needs (0.5.3, I5): the name, the id it
 *  stands for, and every agent a capture can reach right now. Read fresh at
 *  the moments somebody is about to look, like the name always was. */
function who(): Pick<PuckState, 'recipient' | 'recipientId' | 'recipients'> {
  try {
    const id = captureTarget();
    return { recipient: recipientName(id), recipientId: id, recipients: puckRecipients(deps?.agentIds() ?? [], (x) => recipientName(x)) };
  } catch { return { recipient: state.recipient, recipientId: state.recipientId, recipients: state.recipients }; }
}
const sameWho = (a: ReturnType<typeof who>): boolean =>
  a.recipient === state.recipient && a.recipientId === state.recipientId && JSON.stringify(a.recipients) === JSON.stringify(state.recipients);

function sendCapture(arg: unknown): { ok: true; id: string; to: string } | { ok: false; error: string } {
  if (!deps) return { ok: false, error: 'not registered' };
  if (!deps.hiveEnabled()) return { ok: false, error: 'hive disabled (no harnessHome)' };
  const a = (arg ?? {}) as { note?: unknown; screenshot?: unknown; screenshots?: unknown; transcript?: unknown };
  const note = typeof a.note === 'string' ? a.note.trim() : '';
  // Several pictures per send (founder, 23 Sep 2026, I6). `screenshot` is the
  // one picture form every caller before 0.5.3 used; both are read, each path
  // must be a capture under the puck folder, and a repeat counts once.
  const asked = [...(Array.isArray(a.screenshots) ? a.screenshots : []), a.screenshot];
  const shots = [...new Set(asked.map(underPuck).filter((x): x is string => !!x))].slice(0, PUCK_MAX_SHOTS);
  const transcript = underPuck(a.transcript);
  if (!note && shots.length === 0 && !transcript) return { ok: false, error: 'nothing to send' };
  const lines: string[] = [];
  if (note) lines.push(note);
  if (shots.length > 0) {
    // THE MESSAGE OUTLIVES THE FILE. The image is deleted a day after it was
    // taken (sweepScreenshots) and this message is persisted in the recipient's
    // inbox, which our own protocol tells agents to re-read. So the expiry is
    // written into the message at the moment it is sent: an agent opening it
    // late reads why the file is not there instead of reporting a broken path.
    // With several, the first to go sets the time.
    const taken = shots.map((s) => readJson<ScreenshotSidecar>(s.replace(/\.png$/, '.json'))?.takenAt).map((x) => (x ? Date.parse(x) : Date.now()));
    const goesAt = new Date(Math.min(...taken) + PUCK_SHOT_TTL_MS);
    if (shots.length === 1) {
      lines.push(
        '',
        `Screenshot: ${shots[0]}`,
        'Read the image at that path; it is a region of my screen I captured with the puck.',
        `The image is deleted automatically 24 hours after it was taken (about ${goesAt.toISOString()}). Read it now, or ask me for it again.`
      );
    } else {
      lines.push(
        '',
        ...shots.map((s, i) => `Screenshot ${i + 1} of ${shots.length}: ${s}`),
        `Read the images at those paths, in that order; each is a region of my screen I captured with the puck.`,
        `The images are deleted automatically 24 hours after they were taken (the first about ${goesAt.toISOString()}). Read them now, or ask me for them again.`
      );
    }
  }
  if (transcript) lines.push('', `Meeting transcript: ${transcript}`, 'Read the transcript at that path; it was recorded with the puck.');
  const first = (note.split('\n')[0] || (shots.length > 1 ? `${shots.length} screenshots from the puck` : shots.length === 1 ? 'Screenshot from the puck' : 'Meeting transcript from the puck')).slice(0, 120);
  try {
    // Resolved ONCE, so the agent that is told and the agent that is named
    // are the same one even if the floor moves during the send.
    const to = captureTarget();
    const msg = deps.hiveSend({ to, act: 'request', subject: first, body: lines.join('\n') }, 'human');
    for (const shot of shots) {
      const side = shot.replace(/\.png$/, '.json');
      const cur = readJson<ScreenshotSidecar>(side);
      if (cur) writeFileSync(side, JSON.stringify({ ...cur, note: note || null, sentAt: new Date().toISOString() }, null, 2));
    }
    return { ok: true, id: msg.id, to: recipientName(to) };
  } catch (e) {
    return { ok: false, error: errMsg(e) };
  }
}

/* ---- meetings ---------------------------------------------------------------------- */

function meetingDir(id: string): string | null {
  const root = puckRoot();
  if (!root || !/^[0-9_\-]+$/.test(id)) return null;
  return join(root, PUCK_MEETINGS_DIR, id);
}

function readMeta(id: string): MeetingMeta | null {
  const dir = meetingDir(id);
  return dir ? readJson<MeetingMeta>(join(dir, 'meta.json')) : null;
}

function writeMeta(meta: MeetingMeta): void {
  const dir = meetingDir(meta.id);
  if (dir) writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
}

function refreshRecordingState(meta: MeetingMeta): void {
  if (state.recording?.kind === 'meeting' && state.recording.meetingId === meta.id) {
    setState({ recording: { ...state.recording, segments: meta.segments.length, transcribed: meta.segments.filter(segmentTranscribed).length, tracks: meta.twoTrack ? 2 : 1 } });
  }
}

function trackFile(seq: number, ext: string, track: 'you' | 'them'): string {
  return `seg-${String(seq + 1).padStart(3, '0')}${track === 'them' ? '-them' : ''}.${ext}`;
}

function mimeOfFile(file: string): string {
  return file.endsWith('.wav') ? 'audio/wav' : file.endsWith('.ogg') ? 'audio/ogg' : 'audio/webm';
}

function attachThem(dir: string, seg: MeetingSegment, bytes: Uint8Array, ext: string): void {
  const file = trackFile(seg.seq, ext, 'them');
  writeFileSync(join(dir, file), bytes);
  seg.them = { file, transcribed: false, error: null, transcribedAt: null, audioDeletedAt: null };
}

/** The two track transcript, whole, from the segments' lines: every segment
 *  whose tracks have all landed (or failed), in order, as You: and Them:
 *  runs. Written over transcript.md each time a track lands, so the order
 *  never depends on which track finished first. */
function rebuildTranscript(dir: string, meta: MeetingMeta): void {
  const head = `# ${meta.title}\n\nStarted ${meta.startedAt}\n\n`;
  const blocks: string[] = [];
  for (const seg of [...meta.segments].sort((a, b) => a.seq - b.seq)) {
    if (!seg.transcribed || !seg.lines) continue;
    if (seg.them && !seg.them.transcribed && !seg.them.error) continue;
    // Batch 2 #9: with loud speakers the microphone hears the other side too,
    // and their words came back on You. The guard cuts what You says at the
    // same moment Them says it (shared/meetingEcho.ts). Only this rendering:
    // seg.lines on disk keep every word.
    const them = seg.them?.lines ?? [];
    const you = them.length > 0 ? removeEcho(seg.lines, them).lines : seg.lines;
    blocks.push(transcriptBlock(you, them, seg.startMs, { label: true }));
  }
  writeFileSync(join(dir, transcriptFileFor(meta)), head + blocks.join(''));
}

/** Where machine words go. transcript.md until the person saves an edit to
 *  it; from then on it is theirs, and a track that lands later (a retry of a
 *  failed segment) goes to transcript.auto.md, so nothing they wrote is
 *  overwritten and nothing the engine heard is lost. */
function transcriptFileFor(meta: MeetingMeta): string {
  return meta.editedAt ? 'transcript.auto.md' : 'transcript.md';
}

function meetingStart(): { ok: true; meetingId: string; segmentMinutes: number; systemAudio: SystemAudioSource } | { ok: false; error: string } {
  if (!deps) return { ok: false, error: 'not registered' };
  const root = puckRoot();
  if (!root) return { ok: false, error: 'no harness home' };
  if (state.recording) return { ok: false, error: 'already recording' };
  // NO KEY, NO MEETING (founder, 9 Sep 2026). Until 0.5.2 a keyless meeting
  // started, recorded, and wrote every segment to disk; the transcriber was
  // queued, found no key, and returned, so the meeting sat pending forever
  // with audio on the person's disk and nothing to show for it. That is not a
  // missing feature, it is recording somebody did not ask for and gets nothing
  // from. The refusal reuses the error string the renderer already maps to
  // `noKey` (shared/puck.ts problemFor), so the puck answers with the flash
  // that offers the door to Voice settings rather than a dead button.
  if (!canTranscribe()) return { ok: false, error: 'no transcription engine' };
  const cfg = cfgOf();
  const now = new Date();
  const id = meetingIdFor(now);
  const dir = ensureDir(join(root, PUCK_MEETINGS_DIR, id));
  // The other side of the call: recorded when the switch is on and this
  // machine has a source for it. Neither: the meeting is the microphone
  // alone, exactly as before two tracks existed.
  const wantsThem = withTranscribeDefaults(deps.readConfig().transcribe).meetingSystemAudio;
  const systemAudio: SystemAudioSource = wantsThem ? (deps.systemAudioSource ? deps.systemAudioSource() : systemSource) : null;
  const meta: MeetingMeta = { id, title: `Meeting ${now.toLocaleString()}`, startedAt: now.toISOString(), endedAt: null, status: 'recording', segments: [], ...(systemAudio ? { twoTrack: true } : {}) };
  writeFileSync(join(dir, 'meta.json'), JSON.stringify(meta, null, 2));
  writeFileSync(join(dir, 'transcript.md'), `# ${meta.title}\n\nStarted ${now.toISOString()}\n\n`);
  if (systemAudio === 'helper') {
    meetingSystemAudio.begin(now.getTime());
    // The capture runs beside the meeting; a failure to start it is a
    // meeting with the microphone alone, said in the log, never a refusal.
    void deps.startSystemAudio?.(now.getTime()).catch((e: unknown) => { console.log(`[puck] system audio did not start: ${errMsg(e)}`); });
  }
  micLive = true;
  setState({ recording: { kind: 'meeting', meetingId: id, startedAt: now.getTime(), segments: 0, transcribed: 0, tracks: systemAudio ? 2 : 1 }, menuOpen: false });
  applyProtection(cfg);
  return { ok: true, meetingId: id, segmentMinutes: cfg.segmentMinutes, systemAudio };
}

async function meetingSegment(arg: unknown): Promise<{ ok: boolean; error?: string }> {
  const a = (arg ?? {}) as { meetingId?: unknown; seq?: unknown; audio?: unknown; mimeType?: unknown; startMs?: unknown; durationMs?: unknown; track?: unknown };
  const id = typeof a.meetingId === 'string' ? a.meetingId : '';
  const dir = meetingDir(id);
  const meta = readMeta(id);
  if (!dir || !meta) return { ok: false, error: 'unknown meeting' };
  if (!(a.audio instanceof ArrayBuffer) && !(a.audio instanceof Uint8Array)) return { ok: false, error: 'no audio' };
  const bytes = a.audio instanceof Uint8Array ? a.audio : new Uint8Array(a.audio);
  if (bytes.byteLength === 0) return { ok: false, error: 'empty audio' };
  const seq = typeof a.seq === 'number' && Number.isInteger(a.seq) && a.seq >= 0 ? a.seq : meta.segments.length;
  const mime = typeof a.mimeType === 'string' ? a.mimeType : 'audio/webm';
  const ext = mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : 'webm';
  const track: 'you' | 'them' = a.track === 'them' ? 'them' : 'you';

  if (track === 'them') {
    // The renderer's second stream. A two track meeting only; on any other
    // it is not a file anybody would read.
    if (!meta.twoTrack) return { ok: false, error: 'not a two track meeting' };
    const seg = meta.segments.find((s) => s.seq === seq);
    if (!seg) {
      // Before its microphone clip: kept until that one lands.
      let m = pendingThem.get(id);
      if (!m) { m = new Map(); pendingThem.set(id, m); }
      m.set(seq, { bytes, ext });
      return { ok: true };
    }
    attachThem(dir, seg, bytes, ext);
    writeMeta(meta);
    refreshRecordingState(meta);
    queueTranscribe(id, seq, mime, 'them');
    return { ok: true };
  }

  const file = trackFile(seq, ext, 'you');
  writeFileSync(join(dir, file), bytes);
  const seg: MeetingSegment = {
    seq, file,
    startMs: typeof a.startMs === 'number' ? a.startMs : 0,
    durationMs: typeof a.durationMs === 'number' ? a.durationMs : 0,
    transcribed: false, error: null,
    transcribedAt: null, audioDeletedAt: null
  };
  // The other side for the same seconds: from the helper's ring, cut to this
  // segment's start and length, or the renderer's clip that came first.
  if (meta.twoTrack) {
    const startedAt = Date.parse(meta.startedAt);
    const waiting = pendingThem.get(id)?.get(seq);
    if (waiting) {
      pendingThem.get(id)?.delete(seq);
      attachThem(dir, seg, waiting.bytes, waiting.ext);
    } else if (meetingSystemAudio.active() && Number.isFinite(startedAt) && seg.durationMs > 0) {
      const from = startedAt + seg.startMs;
      const pcm = meetingSystemAudio.cut(from, from + seg.durationMs);
      attachThem(dir, seg, new Uint8Array(encodeWav(pcm, RING_RATE)), 'wav');
      meetingSystemAudio.trim(from + seg.durationMs);
    }
  }
  meta.segments = meta.segments.filter((s) => s.seq !== seq).concat(seg).sort((x, y) => x.seq - y.seq);
  writeMeta(meta);
  refreshRecordingState(meta);
  queueTranscribe(id, seq, mime, 'you');
  if (seg.them) queueTranscribe(id, seq, mimeOfFile(seg.them.file), 'them');
  return { ok: true };
}

/** Serialise per meeting so `[clock]` lines land in order even when a short
 *  segment finishes before a long one ahead of it. A two track segment is
 *  two entries in the queue, its microphone then the other side. */
function queueTranscribe(id: string, seq: number, mime: string, track: 'you' | 'them' = 'you'): void {
  const prev = transcribeQueues.get(id) ?? Promise.resolve();
  const next = prev.then(() => transcribeOne(id, seq, mime, track)).catch(() => undefined);
  transcribeQueues.set(id, next);
}

async function transcribeOne(id: string, seq: number, mime: string, track: 'you' | 'them' = 'you'): Promise<void> {
  if (!deps) return;
  const dir = meetingDir(id);
  const meta = readMeta(id);
  if (!dir || !meta) return;
  const seg = meta.segments.find((s) => s.seq === seq);
  if (!seg) return;
  // One track of the segment: the microphone's file, or the other side's.
  const part: MeetingSegment | MeetingTrackFile | undefined = track === 'them' ? seg.them : seg;
  if (!part || part.transcribed) return;
  if (!canTranscribe()) return; // stays pending; the screen offers "Transcribe" once an engine exists
  const key = deps.readConfig().groqApiKey ?? '';
  const cfg = cfgOf();
  // The audio sweep makes "the file is not there" an ordinary state on disk
  // rather than an impossible one, so it is answered rather than thrown. It
  // can only be reached by a segment that is NOT transcribed, since the sweep
  // takes nothing else; that means a person deleted the file by hand.
  const audioPath = join(dir, part.file);
  if (!existsSync(audioPath)) {
    const gone = readMeta(id) ?? meta;
    const g = gone.segments.find((x) => x.seq === seq);
    const gp = track === 'them' ? g?.them : g;
    if (gp) { gp.error = 'audio is no longer on disk'; writeMeta(gone); deps.broadcast('puck:meetingsChanged', { id }); }
    return;
  }
  const audio = readFileSync(audioPath);
  // A two track meeting asks for the lines with their times, which is what
  // the You and Them merge orders by.
  const res = await deps.transcribe({ apiKey: key, audio, mimeType: mime, filename: part.file, language: cfg.language || undefined, mode: 'meeting', timestamps: !!meta.twoTrack });
  const fresh = readMeta(id) ?? meta;
  const s = fresh.segments.find((x) => x.seq === seq);
  if (!s) return;
  const p: MeetingSegment | MeetingTrackFile | undefined = track === 'them' ? s.them : s;
  if (!p) return;
  if (res.ok) {
    // Silence is not a failure: the track is done and said nothing.
    p.transcribed = true;
    p.error = null;
    p.transcribedAt = new Date().toISOString();
    if (fresh.twoTrack) {
      // The lines with their times, kept on the meta; the transcript is
      // rebuilt from them in time order whenever either track lands.
      const lines: MeetingLine[] = res.segments?.length ? res.segments : wholeClip(res.text ?? '', s.durationMs);
      p.lines = lines;
      rebuildTranscript(dir, fresh);
    } else if (res.text) {
      // One track: appended as it always was.
      const file = join(dir, transcriptFileFor(fresh));
      if (!existsSync(file)) writeFileSync(file, `# ${fresh.title}\n\nStarted ${fresh.startedAt}\n\n`);
      appendFileSync(file, `[${clockOf(s.startMs)}] ${res.text.trim()}\n\n`);
    }
  } else {
    p.error = res.error ?? 'transcription failed';
    // The microphone's words still read when the other side failed.
    if (fresh.twoTrack && track === 'them') rebuildTranscript(dir, fresh);
  }
  if (fresh.endedAt) fresh.status = settleMeetingStatus(fresh);
  writeMeta(fresh);
  refreshRecordingState(fresh);
  deps.broadcast('puck:meetingsChanged', { id });
}

function meetingStop(arg: unknown): { ok: boolean; error?: string } {
  const a = (arg ?? {}) as { meetingId?: unknown };
  const id = typeof a.meetingId === 'string' ? a.meetingId : '';
  const meta = readMeta(id);
  micLive = false;
  if (meetingSystemAudio.active()) void deps?.stopSystemAudio?.().catch(() => { /* it is gone */ });
  meetingSystemAudio.end();
  pendingThem.delete(id);
  const wasThis = state.recording?.kind === 'meeting' && state.recording.meetingId === id;
  if (wasThis || state.recording?.kind === 'meeting') setState({ recording: null });
  applyProtection(cfgOf());
  if (!meta) return { ok: false, error: 'unknown meeting' };
  meta.endedAt = new Date().toISOString();
  meta.status = meta.segments.every(segmentTranscribed) ? 'done' : (canTranscribe() ? 'transcribing' : 'pending');
  writeMeta(meta);
  // Settle once the queue drains, so a meeting is never left "transcribing".
  void (transcribeQueues.get(id) ?? Promise.resolve()).then(() => {
    const m = readMeta(id);
    if (m) { m.status = settleMeetingStatus(m); writeMeta(m); deps?.broadcast('puck:meetingsChanged', { id }); }
  });
  deps?.broadcast('puck:meetingsChanged', { id });
  return { ok: true };
}

/** The local calendar day of an ISO timestamp, `YYYY-MM-DD`.
 *  Local, not UTC: a person filtering "the 9th" means their own 9th, and a
 *  meeting recorded at 00:40 local is a UTC 19:10 the day before. */
function localDay(iso: string): string {
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-CA');
}

/** The first transcript line that carries `needle`, without its `[clock]`
 *  prefix, so a hit can be shown rather than merely counted. */
function transcriptHit(path: string, needle: string): string | null {
  if (!existsSync(path)) return null;
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    if (!line.trim() || line.startsWith('#')) continue;
    if (line.toLowerCase().includes(needle)) return line.replace(/^\[[^\]]+\]\s*/, '').trim().slice(0, 240);
  }
  return null;
}

/** The meetings, newest first, optionally filtered (founder, 9 Sep 2026:
 *  "searchable and filterable by name and date range").
 *
 *  `q` matches the TITLE or the transcript's words, because a person looking
 *  for a meeting remembers one or the other and should not have to know which
 *  we index. The transcript is read only when there is something to look for;
 *  with no query this costs exactly what it always did. `from` and `to` are
 *  local calendar days, inclusive at both ends. */
function listMeetings(filter?: { q?: unknown; from?: unknown; to?: unknown }): Array<MeetingMeta & { dir: string; transcriptPath: string; durationMs: number; hit: string | null }> {
  const root = puckRoot();
  if (!root) return [];
  const base = join(root, PUCK_MEETINGS_DIR);
  if (!existsSync(base)) return [];
  const q = typeof filter?.q === 'string' ? filter.q.trim().toLowerCase() : '';
  const from = typeof filter?.from === 'string' && filter.from ? filter.from : null;
  const to = typeof filter?.to === 'string' && filter.to ? filter.to : null;
  const out: ReturnType<typeof listMeetings> = [];
  for (const id of readdirSync(base).sort().reverse()) {
    const meta = readMeta(id);
    if (!meta) continue;
    const day = localDay(meta.startedAt);
    if (from && day < from) continue;
    if (to && day > to) continue;
    const dir = join(base, id);
    const transcriptPath = join(dir, 'transcript.md');
    let hit: string | null = null;
    if (q) {
      const inTitle = meta.title.toLowerCase().includes(q);
      hit = transcriptHit(transcriptPath, q);
      if (!inTitle && !hit) continue;
    }
    const durationMs = meta.segments.reduce((n, s) => Math.max(n, s.startMs + s.durationMs), 0);
    out.push({ ...meta, status: statusOf(meta), dir, transcriptPath, durationMs, hit });
  }
  return out;
}

/** Rename a meeting. The title is what "filterable by name" filters on, and
 *  until a person can change it every meeting is called `Meeting <date>`,
 *  which makes the name filter a second, worse date filter. The transcript's
 *  own first heading is rewritten with it so the file a person opens, or an
 *  agent reads, does not keep the old name. */
function meetingRename(arg: unknown): { ok: boolean; error?: string } {
  const a = (arg ?? {}) as { id?: unknown; title?: unknown };
  const id = typeof a.id === 'string' ? a.id : '';
  const title = typeof a.title === 'string' ? a.title.trim().slice(0, 120) : '';
  if (!title) return { ok: false, error: 'a meeting needs a name' };
  const dir = meetingDir(id);
  const meta = readMeta(id);
  if (!dir || !meta) return { ok: false, error: 'unknown meeting' };
  meta.title = title;
  writeMeta(meta);
  const tp = join(dir, 'transcript.md');
  if (existsSync(tp)) {
    const body = readFileSync(tp, 'utf8');
    writeFileSync(tp, body.replace(/^# .*$/m, `# ${title}`));
  }
  deps?.broadcast('puck:meetingsChanged', { id });
  return { ok: true };
}

/** The meeting's live status, the one listMeetings shows. */
function statusOf(meta: MeetingMeta): MeetingMeta['status'] {
  return meta.endedAt ? (meta.status === 'transcribing' ? 'transcribing' : settleMeetingStatus(meta)) : 'recording';
}

/**
 * SAVE A MEETING'S EDITS (0.5.3, founder batch 2 #8: "meeting notes ... should
 * be editable"). The Stapler screen's one Save sends whichever of the name,
 * the description and the transcript text the person changed. The text goes
 * to transcript.md; the audio segments and their lines in meta.json are never
 * touched, so the recording is still the recording. Refused while words are
 * still landing in the same file.
 */
function meetingSave(arg: unknown): { ok: boolean; error?: string } {
  const a = (arg ?? {}) as { id?: unknown; title?: unknown; description?: unknown; text?: unknown };
  const id = typeof a.id === 'string' ? a.id : '';
  const dir = meetingDir(id);
  const meta = readMeta(id);
  if (!dir || !meta) return { ok: false, error: 'unknown meeting' };
  if (typeof a.title === 'string') {
    const r = meetingRename({ id, title: a.title });
    if (!r.ok) return r;
    Object.assign(meta, readMeta(id) ?? {});
  }
  if (typeof a.text === 'string') {
    if (!meetingEditable(statusOf(meta))) return { ok: false, error: 'the transcript is still being written' };
    if (a.text.length > PUCK_MEETING_TEXT_MAX) return { ok: false, error: 'the transcript is too long' };
    writeFileSync(join(dir, 'transcript.md'), a.text);
    meta.editedAt = new Date().toISOString();
  }
  if (typeof a.description === 'string') meta.description = a.description.trim().slice(0, PUCK_MEETING_DESCRIPTION_MAX);
  writeMeta(meta);
  deps?.broadcast('puck:meetingsChanged', { id });
  return { ok: true };
}

/**
 * SEND A MEETING TO AGENTS (0.5.3, founder batch 2 #8: "select available agents
 * to send the meeting transcriptions to"). One message per chosen agent,
 * through the normal hive path, from what is SAVED on disk (an unsaved edit is
 * not sent; the screen asks for Save first). Each id must be an agent a
 * capture could reach right now, or the orchestrator.
 */
function meetingSendTo(arg: unknown): { ok: boolean; sent: string[]; failed: Array<{ id: string; error: string }>; inline?: boolean; error?: string } {
  if (!deps) return { ok: false, sent: [], failed: [], error: 'not registered' };
  if (!deps.hiveEnabled()) return { ok: false, sent: [], failed: [], error: 'hive disabled (no harnessHome)' };
  const a = (arg ?? {}) as { id?: unknown; to?: unknown };
  const id = typeof a.id === 'string' ? a.id : '';
  const dir = meetingDir(id);
  const meta = readMeta(id);
  if (!dir || !meta) return { ok: false, sent: [], failed: [], error: 'unknown meeting' };
  if (statusOf(meta) === 'recording') return { ok: false, sent: [], failed: [], error: 'still recording' };
  const reachable = new Set(['god', ...deps.agentIds()]);
  const asked = [...new Set((Array.isArray(a.to) ? a.to : []).filter((x): x is string => typeof x === 'string'))].slice(0, PUCK_MEETING_SEND_MAX);
  if (asked.length === 0) return { ok: false, sent: [], failed: [], error: 'pick at least one agent' };
  const transcriptPath = join(dir, 'transcript.md');
  let text = '';
  try { text = readFileSync(transcriptPath, 'utf8'); } catch { text = ''; }
  const msg = meetingMessage({ id, title: meta.title, startedAt: meta.startedAt, description: meta.description, text, transcriptPath });
  const sent: string[] = [];
  const failed: Array<{ id: string; error: string }> = [];
  for (const to of asked) {
    if (!reachable.has(to)) { failed.push({ id: to, error: 'not running' }); continue; }
    try {
      deps.hiveSend({ to, act: 'request', subject: msg.subject, body: msg.body }, 'human');
      sent.push(recipientName(to));
    } catch (e) {
      failed.push({ id: to, error: errMsg(e) });
    }
  }
  return { ok: failed.length === 0, sent, failed, inline: msg.inline };
}

function meetingTranscript(arg: unknown): { ok: true; text: string; meta: MeetingMeta } | { ok: false; error: string } {
  const a = (arg ?? {}) as { id?: unknown };
  const id = typeof a.id === 'string' ? a.id : '';
  const dir = meetingDir(id);
  const meta = readMeta(id);
  if (!dir || !meta) return { ok: false, error: 'unknown meeting' };
  let text = '';
  try { text = readFileSync(join(dir, 'transcript.md'), 'utf8'); } catch { text = ''; }
  return { ok: true, text, meta };
}

function meetingTranscribePending(arg: unknown): { ok: boolean; queued: number; error?: string } {
  const a = (arg ?? {}) as { id?: unknown };
  const id = typeof a.id === 'string' ? a.id : '';
  const meta = readMeta(id);
  if (!meta) return { ok: false, queued: 0, error: 'unknown meeting' };
  if (!canTranscribe()) return { ok: false, queued: 0, error: 'no transcription engine' };
  let queued = 0;
  for (const s of meta.segments) {
    if (!s.transcribed) {
      s.error = null;
      queueTranscribe(id, s.seq, mimeOfFile(s.file), 'you');
      queued++;
    }
    if (s.them && !s.them.transcribed) {
      s.them.error = null;
      queueTranscribe(id, s.seq, mimeOfFile(s.them.file), 'them');
      queued++;
    }
  }
  meta.status = queued > 0 ? 'transcribing' : settleMeetingStatus(meta);
  writeMeta(meta);
  void (transcribeQueues.get(id) ?? Promise.resolve()).then(() => {
    const m = readMeta(id);
    if (m) { m.status = settleMeetingStatus(m); writeMeta(m); deps?.broadcast('puck:meetingsChanged', { id }); }
  });
  return { ok: true, queued };
}

/* ---- the spoken message ---------------------------------------------------------------- */

/** Main's safety net for a spoken message (founder, 25 Sep 2026: the Stapler
 *  stuck in listening): whatever the Stapler window does (crash, reload, a
 *  lost stop), a message still marked recording past the take's own cap plus
 *  a watchdog's length is cleared, and the mic gate closes. */
let messageWatch: ReturnType<typeof setTimeout> | null = null;

function messageStart(): { ok: boolean; error?: string } {
  if (state.recording) return { ok: false, error: 'already recording' };
  if (!canTranscribe()) return { ok: false, error: 'no transcription engine' };
  micLive = true;
  const startedAt = Date.now();
  setState({ recording: { kind: 'message', startedAt }, menuOpen: false });
  applyProtection(cfgOf());
  if (messageWatch) clearTimeout(messageWatch);
  messageWatch = setTimeout(() => {
    messageWatch = null;
    if (state.recording?.kind === 'message' && state.recording.startedAt === startedAt && messageOverdue(startedAt, Date.now(), PUCK_MESSAGE_MAX_SECONDS)) {
      micLive = false;
      setState({ recording: null });
      applyProtection(cfgOf());
    }
  }, PUCK_MESSAGE_MAX_SECONDS * 1000 + TAKE_WATCHDOG_MS);
  return { ok: true };
}

/** One clip of a spoken message to text. */
async function transcribeClip(arg: unknown): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (!deps) return { ok: false, error: 'not registered' };
  const a = (arg ?? {}) as { audio?: unknown; mimeType?: unknown };
  if (!(a.audio instanceof ArrayBuffer) && !(a.audio instanceof Uint8Array)) return { ok: false, error: 'no audio' };
  if (a.audio.byteLength === 0) return { ok: false, error: 'no audio' };
  if (!canTranscribe()) return { ok: false, error: 'no transcription engine' };
  const key = deps.readConfig().groqApiKey ?? '';
  const mime = typeof a.mimeType === 'string' ? a.mimeType : 'audio/webm';
  const res = await deps.transcribe({
    apiKey: key, audio: a.audio, mimeType: mime, filename: `message.${mime.includes('wav') ? 'wav' : mime.includes('ogg') ? 'ogg' : 'webm'}`,
    language: cfgOf().language || undefined, mode: 'dictation'
  });
  if (!res.ok || !res.text) return { ok: false, error: res.error ?? 'transcription failed' };
  return { ok: true, text: res.text };
}

/** A part of a message that is still being spoken (founder, 7 Sep 2026: the
 *  words appear while talking): to text, and the recording goes on. */
function messageSegment(arg: unknown): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (state.recording?.kind !== 'message') return Promise.resolve({ ok: false, error: 'not recording a message' });
  return transcribeClip(arg);
}

/** The last part: the recording ends first, then the words. */
async function messageStop(arg: unknown): Promise<{ ok: true; text: string } | { ok: false; error: string }> {
  if (messageWatch) { clearTimeout(messageWatch); messageWatch = null; }
  micLive = false;
  if (state.recording?.kind === 'message') setState({ recording: null });
  applyProtection(cfgOf());
  return transcribeClip(arg);
}

/* ---- registration ------------------------------------------------------------------------- */

export function registerPuck(d: PuckDeps): void {
  deps = d;
  d.onConfigWritten(() => sync());
  // registerPuck runs at module load, and Electron refuses `screen` before
  // `ready` ("The 'screen' module can't be used before the app 'ready' event",
  // seen on the first dev launch, 7 Sep 2026). Every other `screen` read in
  // this file sits behind an IPC call or a config write, both of which come
  // from a renderer that exists only after ready. These two listeners do not.
  void app.whenReady().then(() => {
    // All three, and all three the same way. `display-added` was missing until
    // 0.5.3: a monitor arriving moves the origin just as one leaving does.
    screen.on('display-added', displaysChanged);
    screen.on('display-removed', displaysChanged);
    screen.on('display-metrics-changed', displaysChanged);
  });
  app.on('before-quit', () => { destroyWindow(); });
  // The retention rule runs whether or not anybody opens the Stapler screen:
  // once at start-up, which is what catches a machine that was asleep, then
  // hourly. `unref` so a sweep timer never holds the app open.
  void app.whenReady().then(() => {
    sweepPuck();
    setInterval(() => { sweepPuck(); }, PUCK_SWEEP_EVERY_MS).unref?.();
  });

  ipcMain.handle('puck:admit', (_e, on: unknown) => { admitted = on === true; sync(); return state; });
  // The floor moves without a config write: an agent's terminal dies and the
  // recipient is the orchestrator again. So the name is re-read at the two
  // moments somebody is about to look at it, here and when the ring opens.
  ipcMain.handle('puck:state', () => { const w = who(); if (!sameWho(w)) setState(w); return state; });
  ipcMain.handle('puck:config', () => cfgOf());

  // The page grabbed the disc and moved past the dead zone. `at` is where on
  // the disc, px from its centre. See THE DRAG above.
  ipcMain.handle('puck:dragStart', (_e, at: unknown) => {
    const cfg = cfgOf();
    stopDrag();
    const from = currentCentre(cfg);
    const a = (at ?? {}) as { x?: unknown; y?: unknown };
    const near = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? Math.max(-cfg.size, Math.min(cfg.size, v)) : 0);
    const grab = { x: near(a.x), y: near(a.y) };
    // The pointer is on the disc as the drag begins. A reading nowhere near it
    // is a platform answering with a point it cannot really see (finding 22):
    // following it would throw the disc across the screen on the first frame.
    const read = readPointer();
    const first = read && Math.hypot(read.x - grab.x - from.x, read.y - grab.y - from.y) <= POINTER_TRUST_PX ? read : null;
    drag = { grab, mode: first ? 'cursor' : 'deltas', first, last: null, from, moved: { x: 0, y: 0 }, travel: 0, unheard: null, timer: null };
    dragging = true;
    if (drag.mode === 'cursor') {
      drag.timer = setInterval(dragTick, DRAG_TICK_MS);
      drag.timer.unref?.();
      dragTick();
    }
    return state;
  });
  // The page saw the pointer move: its own motion (movementX/Y), px. With the
  // pointer readable this is only a sign of life and one more frame; the
  // motion itself drives the disc only where the pointer cannot be read.
  ipcMain.handle('puck:drag', (_e, delta: unknown) => {
    const g = drag;
    if (!g) return state;
    const dl = (delta ?? {}) as { dx?: unknown; dy?: unknown };
    const dx = typeof dl.dx === 'number' && Number.isFinite(dl.dx) ? dl.dx : 0;
    const dy = typeof dl.dy === 'number' && Number.isFinite(dl.dy) ? dl.dy : 0;
    g.unheard = null;
    g.moved = { x: g.moved.x + dx, y: g.moved.y + dy };
    g.travel += Math.abs(dx) + Math.abs(dy);
    if (g.mode === 'cursor') {
      const p = readPointer();
      const still = !p || (g.first !== null && p.x === g.first.x && p.y === g.first.y);
      if (!still || g.travel < DELTA_FALLBACK_PX) { dragTick(); return state; }
      // The page has seen the pointer travel and the system says it has not
      // moved one pixel: this platform cannot read it. From here the page's
      // motion drives the disc, counted from the start of the drag.
      if (g.timer) { clearInterval(g.timer); g.timer = null; }
      g.mode = 'deltas';
    }
    centre = { x: g.from.x + g.moved.x, y: g.from.y + g.moved.y };
    place(cfgOf());
    return state;
  });
  ipcMain.handle('puck:dragEnd', () => {
    endDrag();
    return state;
  });
  // Reset (founder, rc.4): the middle of the main screen's work area, saved as
  // the choice, so it is there now and after a restart.
  ipcMain.handle('puck:resetPosition', () => {
    stopDrag();
    const cfg = cfgOf();
    const main = screen.getPrimaryDisplay();
    const mid = centreOf(main.workArea);
    centre = null;
    d.writeConfig({ puck: { ...cfg, position: mid, home: { displayId: main.id, dx: mid.x - main.bounds.x, dy: mid.y - main.bounds.y } } });
    place(cfgOf());
    return state;
  });

  // The page alone decides whether the mouse is ours (puck:ignoreMouse): it
  // knows the cursor is over the creature, and main does not. The first build
  // also made the window click through here whenever the ring closed, so a
  // click on the creature that closed the ring left the cursor over a window
  // that ignored it, and the next click fell through to the app underneath
  // until the cursor had left and come back (founder, 7 Sep 2026: "the third
  // click does not work").
  ipcMain.handle('puck:menu', (_e, open: unknown) => {
    setState({ menuOpen: open === true, ...who() });
    if (open === true && win && !win.isDestroyed()) { try { win.focus(); } catch { /* noop */ } }
    return state;
  });
  ipcMain.handle('puck:ignoreMouse', (_e, ignore: unknown) => {
    if (win && !win.isDestroyed()) { try { win.setIgnoreMouseEvents(ignore === true, { forward: true }); } catch { /* noop */ } }
    return true;
  });
  ipcMain.handle('puck:invisible', (_e, on: unknown) => {
    manualInvisible = on === true;
    applyProtection(cfgOf());
    return state;
  });

  ipcMain.handle('puck:captureStart', () => openOverlay());
  ipcMain.handle('puck:captureConfirm', async (_e, rect: unknown) => {
    const r = await capture(rect);
    // The overlay asked, but it is closed by now: a failure told only to it
    // was told to nobody, and the card just stayed as it was (founder, 25 Sep
    // 2026: "when we click screenshot it is not getting shown as attached").
    // The Stapler says what went wrong.
    if (!r.ok) { try { if (win && !win.isDestroyed()) win.webContents.send('puck:captureFailed', { error: r.error }); } catch { /* noop */ } }
    return r;
  });
  ipcMain.handle('puck:captureCancel', () => { closeOverlay(); return state; });
  ipcMain.handle('puck:captureRequest', () => requestCapture());
  ipcMain.handle('puck:openScreenAccess', () => {
    if (process.platform === 'darwin') {
      void shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');
    }
    return true;
  });
  ipcMain.handle('puck:openMicAccess', () => {
    if (process.platform === 'darwin') {
      void shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone');
    }
    return true;
  });
  ipcMain.handle('puck:openSettings', (_e, section: unknown) => {
    d.openSettings(typeof section === 'string' && section ? section : undefined);
    return true;
  });

  ipcMain.handle('puck:send', (_e, arg: unknown) => sendCapture(arg));
  // The send card's picker (0.5.3, I5). The pick is the config's `sendTo`, the
  // same field the Settings box writes, so it outlives the card, the window
  // and the app, and every capture from anywhere goes where it says. Only a
  // choice the picker offered is taken.
  ipcMain.handle('puck:sendTo', (_e, id: unknown) => {
    if (typeof id !== 'string') return state;
    const offered = puckRecipients(deps?.agentIds() ?? [], (x) => recipientName(x)).some((r) => r.id === id);
    if (!offered) return state;
    const d = deps;
    if (!d) return state;
    d.writeConfig({ puck: { ...cfgOf(), sendTo: sendToFor(id) } });
    setState(who());
    return state;
  });

  ipcMain.handle('puck:meetingStart', () => meetingStart());
  ipcMain.handle('puck:meetingSegment', (_e, arg: unknown) => meetingSegment(arg));
  ipcMain.handle('puck:meetingStop', (_e, arg: unknown) => meetingStop(arg));
  // Sweeps first, like the screenshots list: what a person sees is never a
  // meeting still holding audio the rule should already have removed.
  ipcMain.handle('puck:meetings', (_e, filter: unknown) => { sweepPuck(); return listMeetings((filter ?? {}) as { q?: unknown; from?: unknown; to?: unknown }); });
  ipcMain.handle('puck:meetingRename', (_e, arg: unknown) => meetingRename(arg));
  ipcMain.handle('puck:meetingTranscript', (_e, arg: unknown) => meetingTranscript(arg));
  ipcMain.handle('puck:meetingSave', (_e, arg: unknown) => meetingSave(arg));
  ipcMain.handle('puck:meetingSendTo', (_e, arg: unknown) => meetingSendTo(arg));
  ipcMain.handle('puck:meetingTranscribe', (_e, arg: unknown) => meetingTranscribePending(arg));
  ipcMain.handle('puck:meetingDelete', async (_e, arg: unknown) => {
    const a = (arg ?? {}) as { id?: unknown };
    const dir = meetingDir(typeof a.id === 'string' ? a.id : '');
    if (!dir || !existsSync(dir)) return { ok: false, error: 'unknown meeting' };
    if (state.recording?.kind === 'meeting' && state.recording.meetingId === a.id) return { ok: false, error: 'still recording' };
    try { await shell.trashItem(dir); return { ok: true }; } catch (e) { return { ok: false, error: errMsg(e) }; }
  });

  ipcMain.handle('puck:messageStart', () => messageStart());
  ipcMain.handle('puck:messageSegment', (_e, arg: unknown) => messageSegment(arg));
  ipcMain.handle('puck:messageStop', (_e, arg: unknown) => messageStop(arg));

  ipcMain.handle('puck:screenshots', () => { sweepPuck(); return listScreenshots(); });
  ipcMain.handle('puck:screenshotDelete', async (_e, p: unknown) => {
    const abs = underPuck(p);
    if (!abs || !abs.endsWith('.png')) return { ok: false, error: 'not a puck screenshot' };
    const side = abs.replace(/\.png$/, '.json');
    // A tombstone has no image left; the row is still on screen and its
    // dismiss has to remove the record rather than refuse.
    if (!existsSync(abs) && !existsSync(side)) return { ok: false, error: 'not a puck screenshot' };
    try {
      if (existsSync(abs)) await shell.trashItem(abs);
      if (existsSync(side)) await shell.trashItem(side);
      return { ok: true };
    } catch (e) { return { ok: false, error: errMsg(e) }; }
  });
  ipcMain.handle('puck:reveal', (_e, p: unknown) => {
    const abs = underPuck(p);
    if (!abs || !existsSync(abs)) return { ok: false, error: 'not a puck file' };
    shell.showItemInFolder(abs);
    return { ok: true, name: basename(abs) };
  });
}
