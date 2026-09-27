/**
 * THE PUCK: a small round window that floats above every other app.
 *
 * A Pro person keeps it on screen while they work in other programs. One
 * click opens a ring of actions around it: capture a part of the screen and
 * send it to the orchestrator with a note, record a meeting into a folder of
 * transcripts, speak a message to the orchestrator, hide the puck from screen
 * sharing. Everything the puck IS (its face, size, colour, where it sits,
 * which actions it offers, the screen region it remembers) is this config,
 * and everything about where things go on a screen is the geometry below.
 *
 * Pure and import free on purpose, like ./licenseKey: main reads the config
 * through `normalizePuckConfig`, the puck window and the settings screen draw
 * from the same constants, and test/puck.test.cjs exercises every rule here
 * with no Electron and no React. The window itself lives in src/main/puck.ts;
 * this file never touches a window.
 */

/* ---- 1. what a puck is ---------------------------------------------------- */

/** THE FACE IS A BLOBATAR (founder's call, 7 Sep 2026, blobatar.dev, MIT):
 *  a small deterministic creature drawn from a word. The word is `seed`; the
 *  same word always draws the same face. The renderer does the drawing
 *  (components/pro/puck/PuckFace.tsx); this file only names the choices. */

/** The silhouettes, in the picker's order. `auto` lets the word decide. The
 *  ten names are blobatar's own `shape` trait, frozen per major version. */
export const PUCK_SHAPES = ['auto', 'round', 'organic', 'boxy', 'nub', 'cloud', 'sun', 'capsule', 'triangle', 'hexagon', 'droplet'] as const;
export type PuckShape = (typeof PUCK_SHAPES)[number];

/** Blobatar picks the silhouette by where its `shape` trait, a number from 0
 *  to 1, falls between fixed thresholds (round below 0.22, organic below
 *  0.48, boxy 0.6, capsule 0.7, nub 0.79, cloud 0.86, droplet 0.915, hexagon
 *  0.95, sun 0.98, triangle to 1). Each value here is the middle of its band,
 *  so pinning a name means handing blobatar this number. The bands are part
 *  of blobatar's frozen per major contract, and test/puck.test.cjs asks the
 *  real library what it draws for each. */
export const PUCK_SHAPE_TRAIT: Readonly<Record<Exclude<PuckShape, 'auto'>, number>> = {
  round: 0.11, organic: 0.35, boxy: 0.54, capsule: 0.65, nub: 0.745,
  cloud: 0.825, droplet: 0.8875, hexagon: 0.9325, sun: 0.965, triangle: 0.99
};

/** The poses, in the picker's order. `idle` is no pose: the face breathes and
 *  blinks on its own; every other one is held on top of that. */
export const PUCK_EXPRESSIONS = ['idle', 'happy', 'sad', 'mad', 'surprised', 'wink', 'sleepy', 'smug', 'unsure', 'scared', 'love', 'shy', 'sick', 'thinking'] as const;
export type PuckExpression = (typeof PUCK_EXPRESSIONS)[number];

/** The five faces the first build drew by hand, mapped onto the poses that
 *  replaced them, so a config saved before the swap keeps its mood. */
export const LEGACY_FACE_EXPRESSION: Readonly<Record<string, PuckExpression>> = {
  calm: 'idle', happy: 'happy', wink: 'wink', cool: 'smug', curious: 'thinking'
};

export const PUCK_SEED_MAX = 64;
/** A word for a face nobody has named yet. */
export const PUCK_DEFAULT_SEED = 'puck';

/** The creature's body colour is a hex string, `#RRGGBB` upper case
 *  (founder, 7 Sep 2026: a row of pastels, a row of stronger ones, and any
 *  hex a person types or picks). The creature IS the puck, so the colour is
 *  painted onto it exactly, as a blobatar palette override. Yellow is the
 *  app's own accent (`--cth-accent` in design/tokens.css, the website's
 *  amber) and the default. */
export const PUCK_DEFAULT_COLOR = '#FFC94F';

export type PuckSwatchGroup = 'pastel' | 'vibrant';
export interface PuckSwatch { id: string; hex: string; group: PuckSwatchGroup }

/** The swatches, in the picker's order. The pastels sit level with the accent
 *  in lightness so the row reads as one set; off white is the page cream and
 *  grey the brand's violet whisper. The vibrant six are the app's own project
 *  hues (design/tokens.css), so the creature can wear the office's colours. */
export const PUCK_SWATCHES: readonly PuckSwatch[] = [
  { id: 'cream', hex: '#FFF8E7', group: 'pastel' },
  { id: 'grey', hex: '#D9D3DE', group: 'pastel' },
  { id: 'red', hex: '#F5B3AB', group: 'pastel' },
  { id: 'blue', hex: '#B3D4F0', group: 'pastel' },
  { id: 'green', hex: '#B4DEC3', group: 'pastel' },
  { id: 'yellow', hex: PUCK_DEFAULT_COLOR, group: 'pastel' },
  { id: 'coral', hex: '#D96A62', group: 'vibrant' },
  { id: 'peach', hex: '#D99168', group: 'vibrant' },
  { id: 'lemon', hex: '#DCAB3C', group: 'vibrant' },
  { id: 'mint', hex: '#5CA97A', group: 'vibrant' },
  { id: 'sky', hex: '#4F9FAF', group: 'vibrant' },
  { id: 'lilac', hex: '#9482D3', group: 'vibrant' }
];

/** `#RRGGBB` upper case from anything a person types or an old config holds:
 *  `#abc`, `abc`, `#AABBCC`, `aabbcc`, with spaces around. Null otherwise. */
export function normalizeHex(v: unknown): string | null {
  if (typeof v !== 'string') return null;
  const s = v.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(s)) return `#${s.toUpperCase()}`;
  if (/^[0-9a-fA-F]{3}$/.test(s)) return `#${s.split('').map((c) => c + c).join('').toUpperCase()}`;
  return null;
}

/** The names the builds before this one saved, onto a hex, so a saved colour
 *  survives: the swatch ids, then the hue build's ids on the nearest swatch.
 *  Anything else is the default. */
export const LEGACY_COLOR: Readonly<Record<string, string>> = {
  ...Object.fromEntries(PUCK_SWATCHES.map((s) => [s.id, s.hex])),
  auto: PUCK_DEFAULT_COLOR, amber: PUCK_DEFAULT_COLOR, lime: '#B4DEC3', violet: '#D9D3DE', rose: '#F5B3AB'
};

/* ---- colour maths, for the eyes ------------------------------------------------- */

const linear = (c: number): number => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };

function rgbOf(hex: string): [number, number, number] {
  const h = normalizeHex(hex) ?? PUCK_DEFAULT_COLOR;
  return [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];
}

/** Relative luminance the way WCAG counts it, 0 black to 1 white. */
export function luminance(hex: string): number {
  const [r, g, b] = rgbOf(hex).map(linear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** The contrast ratio between two colours, the way WCAG counts it. */
export function contrastRatio(a: string, b: string): number {
  const [x, y] = [luminance(a), luminance(b)];
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
}

/** The OKLCh hue of a colour in degrees, 0 to 360: the unit blobatar reads
 *  as `hue`, so a body's eyes are tinted the body's own way. A grey has no
 *  hue to speak of; whatever comes out is fine, the eyes are near black or
 *  near white. */
export function oklchHue(hex: string): number {
  const [r, g, b] = rgbOf(hex).map(linear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  const A = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s;
  return ((Math.atan2(B, A) * 180) / Math.PI + 360) % 360;
}

/** The luminance where blobatar's dark eye and its light eye read equally
 *  well on a body; above it the body is light and takes dark eyes. */
export const EYE_FLIP = 0.18;

/** What blobatar is told for a painted body: its hue, and the tone that
 *  gives dark eyes on a light body and light eyes on a dark one. Blobatar
 *  keeps its eyes readable against its OWN ramp only; a body painted from
 *  outside needs this, or a dark custom colour gets dark eyes on it. */
export function bodyLook(hex: string): { hue: number; tone: number } {
  return { hue: Math.round(oklchHue(hex)), tone: luminance(hex) > EYE_FLIP ? 0 : 0.999 };
}

/** Where the puck appears the first time, and after "Reset position". */
export const PUCK_CORNERS = ['bottom-right', 'bottom-left', 'top-right', 'top-left'] as const;
export type PuckCorner = (typeof PUCK_CORNERS)[number];

/** The actions the ring can offer, in ring order. `computerUse` is drawn
 *  disabled: the button exists so the person can see what is coming, and it
 *  cannot be turned on from anywhere. */
export const PUCK_ACTIONS = ['screenshot', 'message', 'meeting', 'invisible', 'computerUse'] as const;
export type PuckAction = (typeof PUCK_ACTIONS)[number];

export const PUCK_SIZE = { min: 48, max: 160, default: 80 } as const;
export const PUCK_OPACITY = { min: 40, max: 100, default: 90 } as const;
/** How long one meeting segment runs before the recorder rolls to a new file.
 *  Segments are what keep a long meeting under the transcription upload cap
 *  (25 MB on Groq) and what let the transcript arrive WHILE the meeting is
 *  still running rather than as one upload at the end. */
export const PUCK_SEGMENT_MINUTES = { min: 2, max: 20, default: 10 } as const;
/** A spoken message is short by definition; the recorder stops itself here. */
export const PUCK_MESSAGE_MAX_SECONDS = 300;
/** A spoken message is written down WHILE it is spoken (founder, 7 Sep 2026):
 *  the recorder rolls to a new part at a pause in the voice, never before
 *  `minMs` of a part and never later than `maxMs`, and each part is
 *  transcribed as it lands. A pause is `pauseMs` of quiet below `quiet`
 *  (root mean square of the signal, 0 to 1). */
export const PUCK_MESSAGE_SEGMENT = { minMs: 6000, maxMs: 30000, pauseMs: 700, quiet: 0.02 } as const;

export interface PuckPoint { x: number; y: number }
export interface PuckRect { x: number; y: number; width: number; height: number }
export interface PuckHome { displayId: number; dx: number; dy: number }
export interface PuckDisplay { id: number; bounds: PuckRect; workArea: PuckRect }

/** A remembered screen region, relative to the display it was drawn on, in
 *  CSS pixels. `displayId` is the display's Electron id as a string, so a
 *  region drawn on an external monitor is not replayed onto the laptop screen
 *  when the monitor is unplugged; the overlay falls back to a centred box. */
export interface PuckRegion extends PuckRect { displayId: string | null }

export interface PuckConfig {
  /** Off by default: the window exists only for a person who turned it on. */
  enabled: boolean;
  /** The word the face is drawn from. Trimmed, at most PUCK_SEED_MAX chars. */
  seed: string;
  shape: PuckShape;
  expression: PuckExpression;
  size: number;
  /** The body colour, `#RRGGBB` upper case: a swatch or any hex. */
  color: string;
  /** Percent, of the idle disc. The open ring is always fully opaque. */
  opacity: number;
  /** Float above every window, full screen apps included. On by default and
   *  the whole point of the thing; the toggle exists for a person who wants
   *  the puck to behave like an ordinary window for a while. */
  alwaysOnTop: boolean;
  /** After a drag, settle against the nearest screen edge. On by default
   *  since 24 Sep 2026 (founder: "always on top and snap to edges should be
   *  a default"); a stored false, a choice already made, is kept. */
  snapToEdges: boolean;
  corner: PuckCorner;
  /** The disc's centre in screen coordinates after the last drag, or null
   *  for "put it in `corner`". Main clamps it to a real display on read. */
  position: PuckPoint | null;
  /** WHICH screen the person parked it on, and where on that screen, measured
   *  from the screen's own corner (0.5.3). `position` is a point in the
   *  coordinates of the day it was saved, and those move: a monitor that becomes
   *  the main display shifts the origin under every saved point. A screen id and
   *  an offset inside it survive that. This is the person's CHOICE, so a screen
   *  going away never clears it; it is what brings the Stapler back when the
   *  screen does. Null until the first drag. */
  home: PuckHome | null;
  /** Which actions the ring draws. `computerUse` here means "draw the
   *  disabled button", never "enable it". */
  actions: Record<PuckAction, boolean>;
  /** The screen region the last capture used. Null until the first one. */
  captureRegion: PuckRegion | null;
  /** Hide the puck from screen sharing and recordings automatically while a
   *  meeting or a message is being recorded. The ring's Leave invisible
   *  button toggles the same protection by hand. */
  invisibleWhileRecording: boolean;
  segmentMinutes: number;
  /** ISO 639-1 hint for the transcriber, or '' to let it detect. */
  language: string;
  /** Who a capture is sent to: an agent id, or '' for the orchestrator
   *  (founder, 9 Sep 2026: "configured to reach any particular agent … inside
   *  of the stapler section directly"). Resolved at send time against the
   *  agents actually running, by the same rule the Slack responder uses, so a
   *  chosen agent that has since been archived or killed does not swallow the
   *  capture: it lands on the orchestrator instead. */
  sendTo: string;
}

export const DEFAULT_PUCK_CONFIG: PuckConfig = {
  enabled: false,
  seed: PUCK_DEFAULT_SEED,
  shape: 'auto',
  expression: 'idle',
  size: PUCK_SIZE.default,
  color: PUCK_DEFAULT_COLOR,
  opacity: PUCK_OPACITY.default,
  alwaysOnTop: true,
  snapToEdges: true,
  corner: 'bottom-right',
  position: null,
  home: null,
  actions: { screenshot: true, message: true, meeting: true, invisible: true, computerUse: true },
  captureRegion: null,
  invisibleWhileRecording: true,
  segmentMinutes: PUCK_SEGMENT_MINUTES.default,
  language: '',
  sendTo: ''
};

function clampInt(v: unknown, min: number, max: number, fallback: number): number {
  const n = typeof v === 'number' ? v : Number(v);
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, Math.round(n)));
}

function isPoint(v: unknown): v is PuckPoint {
  return !!v && typeof v === 'object'
    && Number.isFinite((v as PuckPoint).x) && Number.isFinite((v as PuckPoint).y);
}

function isHome(v: unknown): v is PuckHome {
  const h = v as PuckHome | null;
  return !!h && typeof h === 'object'
    && Number.isFinite(h.displayId) && Number.isFinite(h.dx) && Number.isFinite(h.dy);
}

function isRegion(v: unknown): v is PuckRegion {
  if (!v || typeof v !== 'object') return false;
  const r = v as PuckRegion;
  return Number.isFinite(r.x) && Number.isFinite(r.y)
    && Number.isFinite(r.width) && Number.isFinite(r.height) && r.width >= 8 && r.height >= 8;
}

/**
 * Hand back a config every reader can trust. Unknown faces, colours and
 * corners fall to the default; numbers are clamped into their published
 * range; a malformed position or region becomes null, which reads as "not
 * set" everywhere rather than as a window at NaN,NaN. Only ever additive: a
 * field this build does not know is dropped, never kept.
 */
export function normalizePuckConfig(input: unknown): PuckConfig {
  const d = DEFAULT_PUCK_CONFIG;
  const raw = (input && typeof input === 'object' ? input : {}) as Partial<PuckConfig>;
  const actions = (raw.actions && typeof raw.actions === 'object' ? raw.actions : {}) as Partial<Record<PuckAction, unknown>>;
  const region = isRegion(raw.captureRegion)
    ? {
      x: Math.round(raw.captureRegion.x), y: Math.round(raw.captureRegion.y),
      width: Math.round(raw.captureRegion.width), height: Math.round(raw.captureRegion.height),
      displayId: typeof raw.captureRegion.displayId === 'string' ? raw.captureRegion.displayId : null
    }
    : null;
  // A config from before the blobatar swap carries `face`; its mood survives.
  const legacyFace = (raw as { face?: unknown }).face;
  const legacy = typeof legacyFace === 'string' ? LEGACY_FACE_EXPRESSION[legacyFace] : undefined;
  const seed = typeof raw.seed === 'string' ? raw.seed.trim().slice(0, PUCK_SEED_MAX) : '';
  return {
    enabled: raw.enabled === true,
    seed: seed || d.seed,
    shape: (PUCK_SHAPES as readonly string[]).includes(raw.shape as string) ? (raw.shape as PuckShape) : d.shape,
    expression: (PUCK_EXPRESSIONS as readonly string[]).includes(raw.expression as string) ? (raw.expression as PuckExpression) : (legacy ?? d.expression),
    size: clampInt(raw.size, PUCK_SIZE.min, PUCK_SIZE.max, d.size),
    color: normalizeHex(raw.color) ?? ((typeof raw.color === 'string' && LEGACY_COLOR[raw.color]) || d.color),
    opacity: clampInt(raw.opacity, PUCK_OPACITY.min, PUCK_OPACITY.max, d.opacity),
    alwaysOnTop: raw.alwaysOnTop !== false,
    snapToEdges: raw.snapToEdges !== false,
    corner: (PUCK_CORNERS as readonly string[]).includes(raw.corner as string) ? (raw.corner as PuckCorner) : d.corner,
    position: isPoint(raw.position) ? { x: Math.round(raw.position.x), y: Math.round(raw.position.y) } : null,
    home: isHome(raw.home) ? { displayId: raw.home.displayId, dx: Math.round(raw.home.dx), dy: Math.round(raw.home.dy) } : null,
    actions: Object.fromEntries(PUCK_ACTIONS.map((a) => [a, actions[a] !== false])) as Record<PuckAction, boolean>,
    captureRegion: region,
    invisibleWhileRecording: raw.invisibleWhileRecording !== false,
    segmentMinutes: clampInt(raw.segmentMinutes, PUCK_SEGMENT_MINUTES.min, PUCK_SEGMENT_MINUTES.max, d.segmentMinutes),
    language: typeof raw.language === 'string' ? raw.language.trim().slice(0, 8) : '',
    sendTo: typeof raw.sendTo === 'string' ? raw.sendTo.trim().slice(0, 120) : ''
  };
}

/* ---- 2. the ring ---------------------------------------------------------- */

/** The ring is a circle around the disc. Radii are in units of the disc's
 *  size so the ring scales with the size slider and stays the same shape. */
export const RING = {
  /** Distance from the disc centre to each button centre, in the open. The
   *  founder asked for the buttons close to the puck (7 Sep 2026): 1.1 leaves
   *  a gap of about a third of the disc between its edge and a button's. */
  radius: 1.1,
  /** A fan (see ringLayout) may widen up to here when its buttons would
   *  otherwise touch. Never in the open. */
  maxRadius: 1.8,
  /** A ring button's diameter. */
  button: 0.62,
  /** Air between two neighbouring buttons, at least, in disc units. */
  gap: 0.06,
  /** Air between a button and the screen edge, px. */
  pad: 4,
  /** A fan never spreads its buttons further apart than this, degrees. */
  maxSpacing: 48,
  /** The close control sits nearer than the buttons, straight below. */
  closeRadius: 1.0,
  closeButton: 0.42,
  /** Room for a label beside a button, and above or below one; the window
   *  footprint pays for it. */
  label: 96,
  labelHeight: 30
} as const;

/** Each action's place on the ring, in degrees, 0 straight up, clockwise.
 *  Screenshot on top because it is the one used most; the two recorders at
 *  the shoulders; the two rarer ones low, out of the way of a hand reaching
 *  up. The close control takes 180 and is not an action. */
export const RING_ANGLE: Record<PuckAction, number> = {
  screenshot: 0,
  meeting: 60,
  invisible: 130,
  computerUse: 230,
  message: 300
};

export type LabelSide = 'left' | 'right' | 'up' | 'down';
export type LabelAlign = 'left' | 'right' | 'centre';

/** Where a button's label is drawn. On the circle a label sits BESIDE its
 *  button (or above it, for the one straight up). On a fan the buttons are
 *  closer together and all on one side, so each label sits RADIALLY past
 *  its own button, along the button's angle, and extends toward the open
 *  side; that keeps every label clear of every neighbour by construction. */
export type LabelPlace =
  | { mode: 'beside'; side: LabelSide }
  | { mode: 'radial'; align: LabelAlign };

export interface RingSlot { action: PuckAction; angle: number; x: number; y: number; label: LabelPlace }

function slotAt(action: PuckAction, angle: number, r: number, label: LabelPlace = circleLabel(angle)): RingSlot {
  const rad = (angle * Math.PI) / 180;
  return { action, angle: ((angle % 360) + 360) % 360, x: Math.round(Math.sin(rad) * r), y: Math.round(-Math.cos(rad) * r), label };
}

/** Where each enabled action sits on the full circle, relative to the disc
 *  centre, y down. The order is ring order, so animation delays follow the
 *  circle. */
export function ringSlots(actions: Record<PuckAction, boolean>, size: number): RingSlot[] {
  const r = size * RING.radius;
  return PUCK_ACTIONS
    .filter((a) => actions[a])
    .map((a) => ({ action: a, angle: RING_ANGLE[a] }))
    .sort((a, b) => a.angle - b.angle)
    .map(({ action, angle }) => slotAt(action, angle, r));
}

/** The square window that holds an idle disc AND its widest open fan. The
 *  disc sits inside this footprint; the rest is transparent and click
 *  through. */
export function ringFootprint(size: number): number {
  return Math.ceil(size + 2 * (size * RING.maxRadius + (size * RING.button) / 2 + RING.label));
}

/* ---- the fan: the ring when the disc is near a screen edge ------------------ */

/** How far the disc centre is from each edge of the space it may draw in,
 *  px. The page reads it off the disc's offset inside the window, because
 *  the window is clamped to the display (windowFor): in the open every side
 *  has half a footprint, at an edge the near side has only what is left. */
export interface RingRoom { left: number; right: number; top: number; bottom: number }

/**
 * THE TWO CAPTURE BUTTONS (0.5.2, card v052-stapler-capture-buttons-placement).
 * While the screenshot selector is up, Capture and Cancel sit on the Stapler
 * itself, side by side straight below the disc at the ring's radius, so the
 * capture fires from the place the person opened it (founder, 9 Sep 2026:
 * "that will be a better UI"). Near the bottom of the screen, where a label
 * under them would not fit, the pair goes straight above instead. Offsets are
 * from the disc centre, y down, the same frame as a ring slot.
 */
export interface CapturePair { below: boolean; y: number; capture: { x: number }; cancel: { x: number }; button: number }
export function capturePair(size: number, room: RingRoom): CapturePair {
  const button = Math.round(size * RING.button);
  const half = button / 2;
  const dx = Math.round(half + Math.max(8, size * 0.12));
  const r = Math.round(size * RING.radius);
  const below = r + half + RING.labelHeight + RING.pad <= room.bottom;
  return { below, y: below ? r : -r, capture: { x: -dx }, cancel: { x: dx }, button };
}

/**
 * WHERE THE TWO BUTTONS GO WITH THE CARD OPEN (founder, 25 Sep 2026: "The
 * done and cancel button should be at top above the send message screen").
 * Capture and Cancel during a screenshot, Done and Cancel during a take: with
 * the compose card up they sat below the disc, over the card's corner, and
 * past the screen edge ("Cance"). So, in window coordinates:
 *
 *   no card   the disc rule (capturePair), slid sideways to stay on screen
 *   a card    above it; else below it; else beside it on the side with room;
 *             never over the card or the disc, always inside `space`
 *
 * `room` is the disc's room on screen (roomIn), as capturePair takes it.
 * The pair's centre is (x, y); the buttons sit at x - dx and x + dx; each
 * label is centred at `labelTop`, under its button or, for the disc rule
 * near the bottom of the screen, over it. `PAIR_LABEL_HALF` is room for half
 * the longest label ("Capturing…").
 */
export const PAIR_LABEL_HALF = 44;
const PAIR_GAP = 12;
export interface PairPlace { x: number; y: number; dx: number; button: number; labelTop: number; at: 'disc' | 'above' | 'below' | 'left' | 'right' }
export function placePair(size: number, disc: { cx: number; cy: number }, room: RingRoom, space: Box, card: Box | null): PairPlace {
  const base = capturePair(size, room);
  const half = base.button / 2;
  const dx = base.cancel.x;
  const wing = dx + Math.max(half, PAIR_LABEL_HALF);
  const LABEL_DROP = 14;
  const LABEL_H = 10;
  const clampX = (x: number) => Math.round(Math.max(space.x0 + wing, Math.min(space.x1 - wing, x)));
  // The pair's box with its labels under the buttons.
  const boxAt = (x: number, y: number): Box => ({ x0: x - wing, x1: x + wing, y0: y - half, y1: y + half + LABEL_DROP + LABEL_H });
  const discBox: Box = { x0: disc.cx - size / 2, x1: disc.cx + size / 2, y0: disc.cy - size / 2, y1: disc.cy + size / 2 };
  const meets = (a: Box, b: Box) => a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
  const fits = (b: Box) => b.x0 >= space.x0 && b.x1 <= space.x1 && b.y0 >= space.y0 && b.y1 <= space.y1;
  if (card) {
    const mid = clampX((card.x0 + card.x1) / 2);
    const tries: Array<[PairPlace['at'], number, number]> = [
      ['above', mid, card.y0 - PAIR_GAP - LABEL_H - LABEL_DROP - half],
      ['below', mid, card.y1 + PAIR_GAP + half],
      ...(disc.cx >= (card.x0 + card.x1) / 2
        ? [['left', card.x0 - PAIR_GAP - wing, card.y0 + half], ['right', card.x1 + PAIR_GAP + wing, card.y0 + half]] as Array<[PairPlace['at'], number, number]>
        : [['right', card.x1 + PAIR_GAP + wing, card.y0 + half], ['left', card.x0 - PAIR_GAP - wing, card.y0 + half]] as Array<[PairPlace['at'], number, number]>)
    ];
    for (const [at, x, y] of tries) {
      const b = boxAt(x, y);
      if (fits(b) && !meets(b, card) && !meets(b, discBox)) return { x: Math.round(x), y: Math.round(y), dx, button: base.button, labelTop: Math.round(y + half + LABEL_DROP), at };
    }
  }
  const y = disc.cy + base.y;
  return { x: clampX(disc.cx), y, dx, button: base.button, labelTop: base.below ? y + half + LABEL_DROP : y - half - LABEL_DROP, at: 'disc' };
}

/** Where a label goes beside a button on the circle: beside it when the
 *  button is off to a side, above or below it when the button is near
 *  straight up or down. */
export function labelSide(angle: number): LabelSide {
  const rad = (angle * Math.PI) / 180;
  const s = Math.sin(rad);
  if (s >= 0.35) return 'right';
  if (s <= -0.35) return 'left';
  return Math.cos(rad) >= 0 ? 'up' : 'down';
}

export function circleLabel(angle: number): LabelPlace {
  return { mode: 'beside', side: labelSide(angle) };
}

/** A fan's label: past the button along the button's own angle, extending
 *  away from the disc's vertical, and centred for a button near straight up
 *  or down. Centred is what keeps two labels near the top of a sideways fan
 *  from stacking on each other; a centred label that would cross the screen
 *  edge fails ringFits, so the fan simply does not reach that far. */
export function fanLabel(angle: number): LabelPlace {
  const s = Math.sin((angle * Math.PI) / 180);
  return { mode: 'radial', align: s < -0.15 ? 'left' : s > 0.15 ? 'right' : 'centre' };
}

/** How far past a button's edge a radial label's anchor sits. */
export const LABEL_GAP = 8;

export interface Box { x0: number; x1: number; y0: number; y1: number }

/** The box a button and its label occupy together, relative to the disc
 *  centre, y down, and the label's own box inside it. */
export function ringBox(angle: number, r: number, size: number, place: LabelPlace): Box & { label: Box } {
  const half = (size * RING.button) / 2 + RING.pad;
  const rad = (angle * Math.PI) / 180;
  const sx = Math.sin(rad);
  const cy = -Math.cos(rad);
  const x = sx * r;
  const y = cy * r;
  const L = RING.label;
  const H = RING.labelHeight;
  let lx0 = x; let lx1 = x; let ly0 = y; let ly1 = y;
  if (place.mode === 'beside') {
    switch (place.side) {
      case 'left': lx0 = x - half - L; lx1 = x - half; break;
      case 'right': lx0 = x + half; lx1 = x + half + L; break;
      case 'up': lx0 = x - L / 2; lx1 = x + L / 2; ly0 = y - half - H; ly1 = y - half; break;
      case 'down': lx0 = x - L / 2; lx1 = x + L / 2; ly0 = y + half; ly1 = y + half + H; break;
    }
  } else {
    const d = r + half + LABEL_GAP;
    const ax = sx * d;
    const ay = cy * d;
    ly0 = ay - H / 2; ly1 = ay + H / 2;
    if (place.align === 'left') { lx0 = ax - L; lx1 = ax; }
    else if (place.align === 'right') { lx0 = ax; lx1 = ax + L; }
    else { lx0 = ax - L / 2; lx1 = ax + L / 2; }
  }
  return {
    x0: Math.min(x - half, lx0), x1: Math.max(x + half, lx1),
    y0: Math.min(y - half, ly0), y1: Math.max(y + half, ly1),
    label: { x0: lx0, x1: lx1, y0: ly0, y1: ly1 }
  };
}

/** Does a button at this angle and radius, with its label, stay inside the
 *  room? The label counts: a button whose label would be cut off by the
 *  screen edge is a button the person cannot read. */
export function ringFits(angle: number, r: number, size: number, room: RingRoom, place: LabelPlace = circleLabel(angle)): boolean {
  const b = ringBox(angle, r, size, place);
  return b.x0 >= -room.left && b.x1 <= room.right && b.y0 >= -room.top && b.y1 <= room.bottom;
}

const ARC_STEP = 5;

/** The longest run of angles, sampled every ARC_STEP degrees, where a button
 *  fits at radius `r`. `to` may exceed 360 when the run crosses straight up.
 *  The whole circle when everything fits, null when nothing does. */
function freeArc(r: number, size: number, room: RingRoom, placeAt: (angle: number) => LabelPlace = circleLabel): { from: number; to: number } | null {
  const n = 360 / ARC_STEP;
  const free = Array.from({ length: n }, (_, i) => ringFits(i * ARC_STEP, r, size, room, placeAt(i * ARC_STEP)));
  if (free.every(Boolean)) return { from: 0, to: 360 };
  const blocked = free.findIndex((f) => !f);
  let best: { start: number; len: number } | null = null;
  let runStart = -1;
  // Walk once around from just after a blocked angle back to it, so a run
  // that crosses straight up is one run and not two halves.
  for (let k = 1; k <= n; k++) {
    if (free[(blocked + k) % n]) { if (runStart < 0) runStart = k; continue; }
    if (runStart >= 0) {
      const len = k - runStart;
      if (!best || len > best.len) best = { start: runStart, len };
      runStart = -1;
    }
  }
  if (!best) return null;
  const from = (blocked + best.start) * ARC_STEP;
  return { from, to: from + (best.len - 1) * ARC_STEP };
}

/** Clockwise order of a fan's buttons. Screenshot in the middle, where the
 *  fan points away from the edge; the recorders beside it; Computer use,
 *  which is drawn disabled, at an end. */
const FAN_ORDER: readonly PuckAction[] = ['computerUse', 'message', 'screenshot', 'meeting', 'invisible'];

/** Angular distance, 0..180. */
function turn(a: number, b: number): number {
  return Math.abs(((((a - b) % 360) + 540) % 360) - 180);
}

export interface RingLayout {
  /** Button centre distance from the disc centre, px. */
  radius: number;
  slots: RingSlot[];
  /** The close control's place, or null on a fan: there the disc itself and
   *  the empty space close the ring, and the room a close control would take
   *  is room a button needs more. */
  close: PuckPoint | null;
  /** null for the full circle; a fan's span in degrees, clockwise from up. */
  fan: { from: number; to: number } | null;
}

/**
 * The ring for a disc with this much room around it (7 Sep 2026, the
 * founder's second ask): in the open, the full circle at RING.radius. Near
 * an edge, a FAN on the side away from it, every button and label inside
 * the room, evenly spread and never further apart than RING.maxSpacing. The
 * fan sits at the same radius as the circle and widens, step by step up to
 * RING.maxRadius, only when the free arc is too narrow for its buttons to
 * keep RING.gap between them, which happens in a corner. Computer use, the
 * disabled button, takes the lowest end of a fan that faces left or right,
 * and the left end of one that faces up or down, so the two sides keep the
 * places the circle gives them.
 */
export function ringLayout(actions: Record<PuckAction, boolean>, size: number, room: RingRoom): RingLayout {
  const r0 = size * RING.radius;
  const circle = ringSlots(actions, size);
  const close = { x: 0, y: Math.round(size * RING.closeRadius) };
  const closeFits = close.y + (size * RING.closeButton) / 2 + RING.pad <= room.bottom;
  const asCircle: RingLayout = { radius: r0, slots: circle, close, fan: null };
  if (circle.length === 0) return asCircle;
  if (closeFits && circle.every((s) => ringFits(s.angle, r0, size, room))) return asCircle;

  const order = FAN_ORDER.filter((a) => actions[a]);
  const n = order.length;
  // Which way the fan faces, from where the room is at the plain radius:
  // it decides which end Computer use takes.
  const probe = freeArc(r0, size, room, fanLabel);
  const centre0 = probe ? (probe.from + probe.to) / 2 : 270;
  const facesSide = Math.abs(Math.sin((centre0 * Math.PI) / 180)) >= 0.5;
  const placeAt = fanLabel;
  let widest: RingLayout | null = null;
  for (let r = r0; r <= size * RING.maxRadius + 0.01; r += size * 0.1) {
    const arc = freeArc(r, size, room, placeAt);
    if (!arc) continue;
    const spacing = n === 1 ? 0 : Math.min(RING.maxSpacing, (arc.to - arc.from) / (n - 1));
    const centre = (arc.from + arc.to) / 2;
    const from = centre - (spacing * (n - 1)) / 2;
    const to = from + spacing * (n - 1);
    // Which end Computer use takes: the lower one when the fan faces a side,
    // the left one when it faces up or down.
    const target = facesSide ? 180 : 270;
    const along = turn(to, target) < turn(from, target) ? [...order].reverse() : order;
    const slots = along.map((a, i) => slotAt(a, from + spacing * i, r, placeAt(from + spacing * i)));
    const layout: RingLayout = { radius: r, slots, close: null, fan: { from, to } };
    widest = layout;
    const chord = 2 * r * Math.sin((spacing * Math.PI) / 360);
    if (n === 1 || chord >= size * (RING.button + RING.gap)) return layout;
  }
  return widest ?? asCircle;
}

/* ---- 3. where it sits on a screen ------------------------------------------ */

/** Gap between the disc and the screen edge for the corner placement. */
export const CORNER_MARGIN = 24;
/** Within this many pixels of an edge, a snap is a snap. Beyond it the puck
 *  stays where the hand left it, edge or not. */
export const SNAP_DISTANCE = 96;
export const SNAP_MARGIN = 12;

/** The disc centre for a corner of a display's work area. */
export function cornerPosition(corner: PuckCorner, area: PuckRect, size: number): PuckPoint {
  const half = size / 2;
  const left = area.x + CORNER_MARGIN + half;
  const right = area.x + area.width - CORNER_MARGIN - half;
  const top = area.y + CORNER_MARGIN + half;
  const bottom = area.y + area.height - CORNER_MARGIN - half;
  switch (corner) {
    case 'top-left': return { x: left, y: top };
    case 'top-right': return { x: right, y: top };
    case 'bottom-left': return { x: left, y: bottom };
    case 'bottom-right': return { x: right, y: bottom };
  }
}

/** Keep the WHOLE disc on the display; the ring may hang off, the disc may not. */
export function clampCentre(p: PuckPoint, area: PuckRect, size: number): PuckPoint {
  const half = size / 2;
  return {
    x: Math.round(Math.min(area.x + area.width - half, Math.max(area.x + half, p.x))),
    y: Math.round(Math.min(area.y + area.height - half, Math.max(area.y + half, p.y)))
  };
}

/** A key press that would zoom the page: Cmd (Mac) or Ctrl with +, =, -, _
 *  or 0, on the main row or the keypad. The Stapler windows ignore these
 *  (founder, 26 Sep 2026: Cmd+= while the note card had focus left the page
 *  at 131%, and the disc then drew 31% further from the window corner than
 *  main placed it, so a drag held it about 100pt off the cursor, for good,
 *  because Chromium saves zoom per page). */
export function isZoomKey(input: { type?: string; key?: string; code?: string; meta?: boolean; control?: boolean }, mac: boolean): boolean {
  if (input.type !== 'keyDown') return false;
  if (!(mac ? input.meta : input.control)) return false;
  const k = input.key ?? '';
  const c = input.code ?? '';
  return k === '+' || k === '=' || k === '-' || k === '_' || k === '0'
    || c === 'Equal' || c === 'Minus' || c === 'Digit0'
    || c === 'NumpadAdd' || c === 'NumpadSubtract' || c === 'Numpad0';
}

/** Snap the disc centre to the nearest edge of the area when it is close
 *  enough, on ONE axis: the one it is nearest to. A disc in a corner snaps
 *  to whichever edge is nearer and keeps its distance from the other. */
export function snapToEdge(p: PuckPoint, area: PuckRect, size: number): PuckPoint {
  const half = size / 2;
  const edges = [
    { axis: 'x' as const, at: area.x + SNAP_MARGIN + half, d: Math.abs(p.x - half - area.x) },
    { axis: 'x' as const, at: area.x + area.width - SNAP_MARGIN - half, d: Math.abs(area.x + area.width - (p.x + half)) },
    { axis: 'y' as const, at: area.y + SNAP_MARGIN + half, d: Math.abs(p.y - half - area.y) },
    { axis: 'y' as const, at: area.y + area.height - SNAP_MARGIN - half, d: Math.abs(area.y + area.height - (p.y + half)) }
  ].sort((a, b) => a.d - b.d);
  const nearest = edges[0];
  // Whatever the snap does on one axis, the whole disc stays on the work area
  // on both (founder, rc.4: snapped, it ended up off screen and never came back).
  if (nearest.d > SNAP_DISTANCE) return clampCentre(p, area, size);
  return clampCentre(nearest.axis === 'x' ? { x: Math.round(nearest.at), y: p.y } : { x: p.x, y: Math.round(nearest.at) }, area, size);
}

/** The middle of a work area: where Reset puts the Stapler, and where a saved
 *  point that lies on no current screen falls back to. */
export function centreOf(area: PuckRect): PuckPoint {
  return { x: Math.round(area.x + area.width / 2), y: Math.round(area.y + area.height / 2) };
}

/**
 * Given a wanted disc centre, the window that holds it: the footprint is
 * clamped to the display so the ring's buttons have somewhere to be, and the
 * disc's offset inside the window carries whatever the clamp took away. So a
 * disc can reach the very edge of the screen, and when it does the ring
 * fans out on the far side (ringLayout) rather than draws off screen.
 */
export function windowFor(centre: PuckPoint, area: PuckRect, size: number): { window: PuckRect; offset: PuckPoint; screen: Box } {
  const side = ringFootprint(size);
  const c = clampCentre(centre, area, size);
  const wanted = { x: c.x - side / 2, y: c.y - side / 2 };
  const maxX = area.x + Math.max(0, area.width - side);
  const maxY = area.y + Math.max(0, area.height - side);
  const x = Math.round(Math.min(maxX, Math.max(area.x, wanted.x)));
  const y = Math.round(Math.min(maxY, Math.max(area.y, wanted.y)));
  return {
    window: { x, y, width: side, height: side },
    offset: { x: c.x - x, y: c.y - y },
    screen: { x0: area.x - x, y0: area.y - y, x1: area.x + area.width - x, y1: area.y + area.height - y }
  };
}

/**
 * WHERE THE SCREEN'S EDGES ARE (0.5.3, founder batch 2, I3: "Stapler modals
 * get cut off when the Stapler sits near a screen edge; open them fully
 * visible, away from edges"). The window is a square footprint, and the clamp
 * in windowFor keeps it on its screen only while the screen's work area is
 * bigger than it: a large Stapler (the footprint grows with the size slider,
 * 1028px at the largest) on a laptop, above the Dock and under the menu bar,
 * hangs off the bottom. So windowFor also says where the work area lies in
 * the window's own coordinates (`screen`, which may reach past the window),
 * and the page draws only inside the part of the window on it.
 *
 * Two edges, two distances. A side of the window that is a screen edge keeps
 * the card and the notice EDGE away from it, off the Dock and the corner; a
 * side that is only the window's edge, out in the open, keeps the old 8px, or
 * a card could no longer clear an open ring at the default size.
 */
export const EDGE = 16;
const WINDOW_MARGIN = 8;

/** The part of the window on its screen, window coordinates. No screen yet
 *  (the preview, a main that has not placed it): the whole square. */
export function onScreen(side: number, screen: Box | null): Box {
  if (!screen) return { x0: 0, y0: 0, x1: side, y1: side };
  return { x0: Math.max(0, screen.x0), y0: Math.max(0, screen.y0), x1: Math.min(side, screen.x1), y1: Math.min(side, screen.y1) };
}

/** Where a card or a notice may be drawn: the part on screen, EDGE in from a
 *  screen edge and 8px in from a bare window edge. */
export function cardSpace(side: number, screen: Box | null): Box {
  const v = onScreen(side, screen);
  const at = (edge: number | undefined, win: number) => screen !== null && edge !== undefined && (win === 0 ? edge >= 0 : edge <= win);
  return {
    x0: v.x0 + (at(screen?.x0, 0) ? EDGE : WINDOW_MARGIN),
    y0: v.y0 + (at(screen?.y0, 0) ? EDGE : WINDOW_MARGIN),
    x1: v.x1 - (at(screen?.x1, side) ? EDGE : WINDOW_MARGIN),
    y1: v.y1 - (at(screen?.y1, side) ? EDGE : WINDOW_MARGIN)
  };
}

/** A bare number is a whole square window of that side, `margin` in from
 *  each edge, as before 0.5.3; a box is a cardSpace, already inset. */
export type PuckSpace = number | Box;
function spaceBox(space: PuckSpace, margin: number): Box {
  return typeof space === 'number' ? { x0: margin, y0: margin, x1: space - margin, y1: space - margin } : space;
}

/** The room around the disc on each side, inside the part of the window on
 *  screen: what ringLayout fans by and capturePair flips by. The ring keeps
 *  its own RING.pad from it. */
export function roomIn(visible: Box, cx: number, cy: number): RingRoom {
  return { left: cx - visible.x0, right: visible.x1 - cx, top: cy - visible.y0, bottom: visible.y1 - cy };
}

const inside = (p: PuckPoint, r: PuckRect): boolean =>
  p.x >= r.x && p.x < r.x + r.width && p.y >= r.y && p.y < r.y + r.height;

/**
 * WHERE THE STAPLER GOES, and ON WHICH SCREEN, with nobody dragging it.
 *
 * The answer names its screen. The first 0.5.3 fix rebuilt a point and then
 * asked the system which screen that point lay on, so when the Stapler's own
 * screen shrank past it the point fell on the neighbour and the Stapler hopped
 * across. Whoever places the window clamps to the screen named HERE.
 *
 *   1. the screen the person parked it on, if that screen is here: same spot.
 *   2. else, only if no screen was ever chosen, the last saved point, and only
 *      if it lies on a screen that is here. A point on no screen puts it in the
 *      middle of the main screen (rc.4).
 *      With a chosen screen that is AWAY the saved point is skipped: it belongs
 *      to that arrangement and must not pick a screen in this one.
 *   3. else the configured corner of the main screen. This is also where it
 *      waits while its own screen is asleep or unplugged: visible, and ready to
 *      go back, because nothing here ever clears `home`.
 */
export function resolvePuckPlacement(input: {
  home: PuckHome | null; position: PuckPoint | null; corner: PuckCorner; size: number;
  displays: readonly PuckDisplay[]; primaryId: number | null;
}): { display: PuckDisplay; centre: PuckPoint; source: 'home' | 'position' | 'centre' | 'corner' } | null {
  const { displays, home, position } = input;
  if (displays.length === 0) return null;
  const parked = home ? displays.find((d) => d.id === home.displayId) : undefined;
  if (parked && home) {
    return { display: parked, centre: clampCentre({ x: parked.bounds.x + home.dx, y: parked.bounds.y + home.dy }, parked.workArea, input.size), source: 'home' };
  }
  const main = displays.find((d) => d.id === input.primaryId) ?? displays[0];
  if (!home && position) {
    const on = displays.find((d) => inside(position, d.bounds));
    if (on) return { display: on, centre: clampCentre(position, on.workArea, input.size), source: 'position' };
    // A point on no screen that is here: the middle of the main screen, where
    // it is easy to find, not a corner (founder, rc.4).
    return { display: main, centre: centreOf(main.workArea), source: 'centre' };
  }
  return { display: main, centre: cornerPosition(input.corner, main.workArea, input.size), source: 'corner' };
}

/* ---- 4. the remembered capture region -------------------------------------- */

export const REGION_MIN = 24;

/** The box the overlay opens with: the remembered region when it was drawn
 *  on THIS display and still fits, otherwise a centred box a third the size
 *  of the display. Never off screen, never smaller than REGION_MIN. */
export function initialRegion(saved: PuckRegion | null, display: { id: string; width: number; height: number }): PuckRect {
  if (saved && (saved.displayId === null || saved.displayId === display.id)) {
    const r = clampRegion(saved, display.width, display.height);
    if (r.width >= REGION_MIN && r.height >= REGION_MIN) return r;
  }
  const width = Math.max(REGION_MIN, Math.round(display.width / 3));
  const height = Math.max(REGION_MIN, Math.round(display.height / 3));
  return { x: Math.round((display.width - width) / 2), y: Math.round((display.height - height) / 2), width, height };
}

/** Keep a region inside a width by height canvas, shrinking before moving. */
export function clampRegion(r: PuckRect, width: number, height: number): PuckRect {
  const w = Math.max(REGION_MIN, Math.min(width, Math.round(r.width)));
  const h = Math.max(REGION_MIN, Math.min(height, Math.round(r.height)));
  const x = Math.max(0, Math.min(width - w, Math.round(r.x)));
  const y = Math.max(0, Math.min(height - h, Math.round(r.y)));
  return { x, y, width: w, height: h };
}

/* ---- 5. meetings ------------------------------------------------------------ */

export type MeetingStatus = 'recording' | 'transcribing' | 'done' | 'pending' | 'failed';

/** One clip's lines with their times inside the clip, seconds, as the
 *  engine gave them; kept on the meta so a two track transcript can be
 *  rebuilt in time order whenever either track lands (0.5.3, F16). */
export interface MeetingLine { t0: number; t1: number; text: string }

/** The other side of the call for one segment (0.5.3, F16, the founder's
 *  "you and them" view): the system audio's clip, transcribed on its own.
 *  Absent on a meeting recorded with the microphone alone. */
export interface MeetingTrackFile {
  file: string;
  transcribed: boolean;
  error: string | null;
  transcribedAt: string | null;
  audioDeletedAt: string | null;
  lines?: MeetingLine[];
}

export interface MeetingSegment {
  seq: number;
  file: string;
  /** The microphone's lines, kept only on a two track meeting. */
  lines?: MeetingLine[];
  /** The other side of the call, when the meeting recorded it. */
  them?: MeetingTrackFile;
  /** Offset from the meeting start, ms, so the transcript can carry a clock. */
  startMs: number;
  durationMs: number;
  transcribed: boolean;
  error: string | null;
  /** When the words came back, which is when this segment's audio stopped
   *  being the only copy. The audio sweep counts from here and not from the
   *  recording, so a segment waiting for a key keeps its audio for as long as
   *  it waits. A segment written by a build before 0.5.2 has no stamp; the
   *  sweep falls back to the audio file's own mtime for those. */
  transcribedAt: string | null;
  /** When the sweep removed the audio file, or null while it is still on
   *  disk. The segment's row in the meta stays either way: what was recorded,
   *  how long it ran and whether it transcribed is the record of the meeting,
   *  and only the audio is on a clock. */
  audioDeletedAt: string | null;
}

export interface MeetingMeta {
  id: string;
  title: string;
  startedAt: string;
  endedAt: string | null;
  status: MeetingStatus;
  segments: MeetingSegment[];
  /** True when the meeting started with a system audio source: the
   *  transcript is then rebuilt from the segments' lines as You: and Them:
   *  runs. Absent or false: the one track transcript, appended as before. */
  twoTrack?: boolean;
  /** The person's description of the meeting, or a prompt to keep with it
   *  (0.5.3, founder batch 2 #8). Empty or absent: none written yet. */
  description?: string;
  /** When the person last saved an edit to transcript.md. From then on the
   *  file is theirs: a track that lands later is rebuilt into
   *  transcript.auto.md instead, so a retry never overwrites their words. */
  editedAt?: string | null;
}

/* ---- 5b. a meeting edited and sent (0.5.3, founder batch 2 #8) --------------- */

/** The longest description or prompt kept with a meeting. */
export const PUCK_MEETING_DESCRIPTION_MAX = 4000;
/** The longest transcript text accepted from the editor (about 2 MB, far
 *  past a day of talk; a bigger paste is a mistake, not a meeting). */
export const PUCK_MEETING_TEXT_MAX = 2_000_000;
/** A transcript up to this many characters (about 3,000 tokens) goes into the
 *  message itself, so the agent reads it without a file read. Past it the
 *  message carries the path: an inbox message is re-read whole on every
 *  turn, and a long meeting pasted there costs every one of those turns. */
export const PUCK_MEETING_INLINE_MAX = 12_000;
/** The most agents one Send reaches. */
export const PUCK_MEETING_SEND_MAX = 20;

/** Whether the transcript can be edited: not while words are still landing,
 *  since a segment that lands appends to or rebuilds the same file. */
export function meetingEditable(status: MeetingStatus): boolean {
  return status !== 'recording' && status !== 'transcribing';
}

/** The message one Send puts in each chosen agent's inbox: the person's
 *  description or prompt first, then the transcript, inline when it is short
 *  and as its path when it is not. Pure, so the size rule is tested as is. */
export function meetingMessage(m: { id: string; title: string; startedAt: string; description?: string; text: string; transcriptPath: string }): { subject: string; body: string; inline: boolean } {
  const description = (m.description ?? '').trim();
  const text = m.text.trim();
  const inline = text.length > 0 && text.length <= PUCK_MEETING_INLINE_MAX;
  const lines: string[] = [`Meeting "${m.title}" (id ${m.id}), recorded ${m.startedAt} with the Stapler.`];
  if (description) lines.push('', 'Description or prompt from the person:', description);
  if (inline) {
    lines.push('', `Transcript (also at ${m.transcriptPath}):`, '', text);
  } else if (text) {
    lines.push('', `Transcript: ${m.transcriptPath}`, `It is ${text.length} characters, too long to paste here. Read it at that path.`);
  } else {
    lines.push('', `The transcript is empty so far (${m.transcriptPath}).`);
  }
  return { subject: `Meeting: ${m.title}`.slice(0, 120), body: lines.join('\n'), inline };
}

/** Where the other side's audio comes from on this machine, if anywhere:
 *  a helper's chunks into main (the Mac's tap) or a stream the renderer
 *  opens beside the microphone (Windows loopback, a Linux monitor source). */
export type SystemAudioSource = 'helper' | 'renderer' | null;

/** A segment is done when every track of it is transcribed; it failed when
 *  either track did. */
export function segmentTranscribed(s: Pick<MeetingSegment, 'transcribed' | 'them'>): boolean {
  return s.transcribed && (!s.them || s.them.transcribed);
}
export function segmentError(s: Pick<MeetingSegment, 'error' | 'them'>): string | null {
  return s.error ?? s.them?.error ?? null;
}

/** The meeting's status from its parts. `recording` and `transcribing` are
 *  live states main sets while work is in flight; this settles the rest. */
export function settleMeetingStatus(meta: Pick<MeetingMeta, 'endedAt' | 'segments'>): MeetingStatus {
  if (!meta.endedAt) return 'recording';
  if (meta.segments.length === 0) return 'failed';
  if (meta.segments.every(segmentTranscribed)) return 'done';
  if (meta.segments.some((s) => segmentError(s))) return 'failed';
  return 'pending';
}

/** `[hh:mm:ss]` for a transcript line. */
export function clockOf(ms: number): string {
  const s = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const two = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${two(h)}:${two(m)}:${two(sec)}` : `${two(m)}:${two(sec)}`;
}

/** A meeting id that sorts by time and is safe as a folder name. */
export function meetingIdFor(date: Date): string {
  return date.toISOString().replace(/[:.]/g, '-').replace('T', '_').slice(0, 19);
}

/* ---- 6. what the puck window is told ---------------------------------------- */

export type PuckRecording =
  | null
  | { kind: 'meeting'; meetingId: string; startedAt: number; segments: number; transcribed: number; /** 2 while the other side of the call is recorded too; absent or 1 is the microphone alone. */ tracks?: 1 | 2 }
  | { kind: 'message'; startedAt: number };

/** Main's view of the puck, pushed to the puck window and the settings screen
 *  on every change. The renderer keeps no state of its own that main also
 *  keeps: a window that closed and reopened reads the truth from here. */
export interface PuckState {
  /** The window exists (config on AND a Pro shell admitted it). */
  shown: boolean;
  menuOpen: boolean;
  /** Content protection is on: screen sharing does not show the puck. */
  invisible: boolean;
  recording: PuckRecording;
  /** A transcription key is on file. Without one the recorders still record;
   *  the message recorder is disabled because a message with no text has
   *  nowhere to go. */
  canTranscribe: boolean;
  /** macOS screen recording permission, or 'granted' elsewhere. */
  screenAccess: 'granted' | 'denied' | 'not-determined' | 'restricted' | 'unknown';
  /** The disc centre inside the window, from windowFor. The page reads the
   *  room around the disc off it (ringLayout). */
  offset: PuckPoint;
  /** The screen's work area in the window's coordinates, from windowFor; it
   *  may reach past the window. The page draws inside the part on screen
   *  (onScreen, cardSpace). Null until main has placed the window. */
  screen: Box | null;
  /** A capture overlay is up. */
  capturing: boolean;
  /** The app's light or dark theme. The Stapler is its own window with its
   *  own document, so the app's theme switch never reaches it unless main
   *  carries it across. Until 0.5.3 nothing did. */
  theme: 'light' | 'dark';
  /** The NAME of the agent a capture sent right now would reach. Main is the
   *  only one that can say: the rule falls back to the orchestrator when the
   *  chosen agent has no live terminal, and only main knows which agents do.
   *  The Stapler window has no store, so before 0.5.3 its strings printed the
   *  i18n default, "Michael", on every floor in the world. */
  recipient: string;
  /** The id behind `recipient`, what the send card's picker shows as chosen
   *  (0.5.3, I5). 'god' when captures fall to the orchestrator. */
  recipientId: string;
  /** Who a capture can be sent to right now, for that picker: the
   *  orchestrator first, then every agent with a live terminal (puckRecipients). */
  recipients: PuckRecipient[];
}

/** One choice in the send card's picker. */
export interface PuckRecipient { id: string; name: string }

/** THE STAPLER'S PICKER (0.5.3, founder batch 2, I5: "a dropdown of all
 *  active agents to pick the recipient for screenshots, messages, audio; the
 *  last picked recipient persists across Stapler close and open"). The
 *  orchestrator first, because a capture falls to it whenever the pick is not
 *  running; then the running agents in the floor's order. Two agents may share
 *  a name (three Jims on a real floor), so a shared name carries its id. */
export function puckRecipients(activeIds: readonly string[], nameOf: (id: string) => string, godId = 'god'): PuckRecipient[] {
  const ids = [godId, ...activeIds.filter((id) => id !== godId)];
  const named = ids.map((id) => ({ id, name: (nameOf(id) || id).trim() || id }));
  const count = new Map<string, number>();
  for (const r of named) count.set(r.name, (count.get(r.name) ?? 0) + 1);
  return named.map((r) => ((count.get(r.name) ?? 0) > 1 && r.id !== godId ? { id: r.id, name: `${r.name} (${r.id})` } : r));
}

/** What a pick stores in `sendTo`. The orchestrator is stored as the empty
 *  default, the same value the Settings box writes for it, so the two places
 *  that choose agree on what "the orchestrator" looks like on disk. */
export function sendToFor(pick: string, godId = 'god'): string {
  const id = pick.trim();
  return id === godId ? '' : id;
}

export const DEFAULT_PUCK_STATE: PuckState = {
  shown: false,
  menuOpen: false,
  invisible: false,
  recording: null,
  canTranscribe: false,
  screenAccess: 'unknown',
  offset: { x: 0, y: 0 },
  screen: null,
  capturing: false,
  theme: 'light',
  recipient: '',
  recipientId: 'god',
  recipients: []
};

/** One meeting as the Puck screen lists it: the meta plus where it lives. */
export interface PuckMeeting extends MeetingMeta {
  dir: string;
  transcriptPath: string;
  durationMs: number;
  /** The first transcript line that carried the search words, so a hit can be
   *  shown under the row. Null when nothing was searched for, or when the
   *  match was on the meeting's name. */
  hit: string | null;
}

/** What the Meetings tab asks main for: the words to look for, and the local
 *  calendar days to stay between, both ends inclusive. Every field optional;
 *  no filter means every meeting, which is what the screen opens with. */
export interface PuckMeetingFilter {
  q?: string;
  /** `YYYY-MM-DD`, local. */
  from?: string;
  to?: string;
}

/** One screenshot as the Puck screen lists it. `thumb` is a small data URL
 *  main made from the file; the file itself never crosses IPC. */
export interface PuckScreenshot {
  path: string;
  takenAt: string;
  note: string | null;
  sentAt: string | null;
  width: number;
  height: number;
  thumb: string;
  /** When the sweep removed the image, or null while it is still on disk.
   *  A row with this set is a TOMBSTONE: the picture is gone and only the
   *  record that it existed, and was sent, remains. Kept because the hive
   *  message that named the file outlives the file (main/puck sendCapture),
   *  so "where did that screenshot go" must have an answer on the screen. */
  deletedAt: string | null;
}

/** How long a screenshot stays on disk (founder, 9 Sep 2026: captures pile up
 *  and only recent ones are wanted). Counted from when it was taken, not from
 *  when it was sent or last looked at. */
export const PUCK_SHOT_TTL_MS = 24 * 60 * 60 * 1000;

/** How many pictures one Stapler send carries (founder, 23 Sep 2026, I6:
 *  several screenshots per send, not one). A capture past this is refused on
 *  the card with a line saying so, never dropped quietly. */
export const PUCK_MAX_SHOTS = 8;
/** How long a meeting's AUDIO stays on disk (founder, 9 Sep 2026: "we should
 *  not save the audio, we should only save transcription with metadata", then
 *  "take the 24 hour version"). Deliberately the same day as a screenshot, and
 *  deliberately counted from SUCCESSFUL TRANSCRIPTION rather than from the
 *  recording: a meeting recorded with no key on file still transcribes the
 *  moment a key arrives, and audio that expired while it waited would break
 *  that promise. The transcript and the meta are never on this clock. */
export const PUCK_AUDIO_TTL_MS = 24 * 60 * 60 * 1000;
/** How often the sweep runs while the app is open. It also runs at start-up,
 *  which is what catches a machine that was asleep for a week. */
export const PUCK_SWEEP_EVERY_MS = 60 * 60 * 1000;

/** The folder, under the harness home, where the puck keeps what it made.
 *  Beside the hive rather than inside it: the hive is a git repository that
 *  commits on every message, and screenshots and audio do not belong in
 *  that history. Agents read these by absolute path. */
export const PUCK_DIR = 'puck';
export const PUCK_SCREENSHOTS_DIR = 'screenshots';
export const PUCK_MEETINGS_DIR = 'meetings';

/* ---- the note card beside the ring --------------------------------------------- */

/** The box the open ring occupies, relative to the disc centre, y down:
 *  every button with its label, and the close control. Null when nothing
 *  is drawn. */
export function ringExtent(layout: RingLayout, size: number): Box | null {
  const boxes: Box[] = layout.slots.map((s) => ringBox(s.angle, layout.radius, size, s.label));
  if (layout.close) {
    const h = (size * RING.closeButton) / 2 + RING.pad;
    boxes.push({ x0: layout.close.x - h, x1: layout.close.x + h, y0: layout.close.y - h, y1: layout.close.y + h });
  }
  if (!boxes.length) return null;
  return {
    x0: Math.min(...boxes.map((b) => b.x0)), x1: Math.max(...boxes.map((b) => b.x1)),
    y0: Math.min(...boxes.map((b) => b.y0)), y1: Math.max(...boxes.map((b) => b.y1))
  };
}

export interface CardPlace { left: number; top: number }

/** Where the note card goes inside the window. With nothing else open it
 *  sits beside the disc on whichever side has room, else in the middle of
 *  the window (the disc is under it then, which is fine: while a note is
 *  written the disc has no job). While a recording runs the ring can open
 *  over the card (founder, 7 Sep 2026: Stop and Hide on the ring, the words
 *  arriving in the card, both at once), so with `avoid` set the card takes
 *  the first place clear of the ring that fits: away from the ring's mass
 *  first, then above or below it. Always inside the part of the window on
 *  screen (onScreen), EDGE clear of it: a card that hangs off the edge is
 *  cut exactly where Send is. */
export function placeCard(card: { w: number; h: number }, space: PuckSpace, disc: { cx: number; cy: number; size: number }, avoid: Box | null, margin = WINDOW_MARGIN): CardPlace {
  const { w, h } = card;
  const { cx, cy, size } = disc;
  const { x0, y0, x1, y1 } = spaceBox(space, margin);
  const gap = 14;
  // Taller or wider than the space: the top left stays on screen, the title
  // and the field first.
  const clampX = (x: number) => Math.round(Math.max(x0, Math.min(x1 - w, x)));
  const clampY = (y: number) => Math.round(Math.max(y0, Math.min(y1 - h, y)));
  if (avoid) {
    const bx0 = cx + avoid.x0; const bx1 = cx + avoid.x1; const by0 = cy + avoid.y0; const by1 = cy + avoid.y1;
    const leftOf: CardPlace = { left: bx0 - gap - w, top: clampY(cy - h / 2) };
    const rightOf: CardPlace = { left: bx1 + gap, top: clampY(cy - h / 2) };
    const above: CardPlace = { left: clampX(cx - w / 2), top: by0 - gap - h };
    const below: CardPlace = { left: clampX(cx - w / 2), top: by1 + gap };
    const mx = (avoid.x0 + avoid.x1) / 2;
    const my = (avoid.y0 + avoid.y1) / 2;
    const order = Math.abs(mx) > size / 4
      ? (mx > 0 ? [leftOf, above, below, rightOf] : [rightOf, above, below, leftOf])
      : (my > 0 ? [above, leftOf, rightOf, below] : [below, leftOf, rightOf, above]);
    for (const p of order) {
      if (p.left >= x0 && p.top >= y0 && p.left + w <= x1 && p.top + h <= y1) return p;
    }
  }
  const roomRight = x1 - (cx + size / 2) - gap;
  const roomLeft = cx - size / 2 - gap - x0;
  const beside = roomRight >= w || roomLeft >= w;
  const x = roomRight >= w ? cx + size / 2 + gap : roomLeft >= w ? cx - size / 2 - gap - w : (x0 + x1 - w) / 2;
  const y = beside ? cy - 120 : (y0 + y1 - h) / 2;
  return { left: clampX(x), top: clampY(y) };
}

/* ---- the notice under the disc ------------------------------------------------------ */

/** The flash: one fixed width, so its buttons never shrink to the letters
 *  (0.5.2, card v052-stapler-mic-permission-prompt). */
export const FLASH = { w: 236, gap: 12, margin: 8 } as const;

export interface FlashPlace { left: number; top: number; width: number }

/**
 * Where the notice goes inside the window (0.5.2, card
 * v052-stapler-mic-permission-prompt, founder, 8 Sep 2026: the first-run
 * microphone prompt "sits at the edge of the screen, effectively hidden",
 * and its button broke on the text).
 *
 * WHAT WENT WRONG. The notice was centred under the disc by `left: cx` and
 * a -50% transform, with no width of its own. In a corner the disc's centre
 * is a few px from the window's edge, so half the notice fell outside the
 * window and was cut; and an absolutely positioned box with no width takes
 * only the room between `left` and the window's edge, so near the right
 * edge the box was a few px wide and every button wrapped letter by letter.
 *
 * So: a fixed width, a left edge slid inside the window, and below the disc
 * unless there is no room, in which case above it. `gapBelow` is wider
 * while a recording runs, because the clock sits under the disc then.
 */
export function placeFlash(space: PuckSpace, disc: { cx: number; cy: number; size: number }, h: number, gapBelow: number = FLASH.gap): FlashPlace {
  const { x0, y0, x1, y1 } = spaceBox(space, FLASH.margin);
  const width = Math.max(120, Math.min(FLASH.w, x1 - x0));
  const left = Math.round(Math.max(x0, Math.min(x1 - width, disc.cx - width / 2)));
  const below = disc.cy + disc.size / 2 + gapBelow;
  const top = below + h <= y1
    ? below
    : Math.max(y0, disc.cy - disc.size / 2 - FLASH.gap - h);
  return { left, top: Math.round(top), width };
}

/* ---- the picture in the card ------------------------------------------------------- */

/** The note card's measures, shared with the window that draws it: its
 *  width, its padding, the gap between its rows, and the height of a card
 *  with no picture in it (title, field, status line, buttons). 220 since the
 *  title row carries the recipient picker (0.5.3, I5), a few px taller. */
export const CARD = { w: 292, pad: 12, gap: 8, baseH: 220 } as const;

/** The picture's box in the card. Founder, 7 Sep 2026, screenshot: a
 *  2872 by 1792 capture came out far taller than wide, "it looks stretched;
 *  it should be visible in its proportion, just smaller to fit the message
 *  box width". So: the capture's own proportion, scaled down to the card's
 *  inner width, and further if the card would then not fit the window
 *  (Send must stay inside it); never scaled up, never a zero or NaN side. */
export function shotBox(shot: { width: number; height: number }, space: PuckSpace, margin = WINDOW_MARGIN): { width: number; height: number } {
  const w = Math.max(1, Number(shot.width) || 1);
  const h = Math.max(1, Number(shot.height) || 1);
  const { y0, y1 } = spaceBox(space, margin);
  const maxW = CARD.w - 2 * CARD.pad;
  const maxH = Math.max(1, y1 - y0 - CARD.baseH - CARD.gap);
  const k = Math.min(1, maxW / w, maxH / h);
  return { width: Math.max(1, Math.round(w * k)), height: Math.max(1, Math.round(h * k)) };
}

/** The card's height with a picture of that box in it, or with none. */
export function cardHeight(shot: { height: number } | null): number {
  return shot ? CARD.baseH + CARD.gap + shot.height : CARD.baseH;
}

/** Several pictures on the card (I6): one keeps shotBox, its own proportion
 *  at the card's width. Two or more sit as thumbnails in rows, each THUMB_H
 *  tall at its own proportion and never wider than half the row, so two
 *  always share one; rows wrap, and the whole grid shrinks together if the
 *  card would not fit the part of the window on screen (I3's space).
 *  `height` feeds cardHeight. */
export const THUMB = { h: 72, gap: 6 } as const;

export function shotsLayout(shots: Array<{ width: number; height: number }>, space: PuckSpace, margin = WINDOW_MARGIN): { height: number; boxes: Array<{ width: number; height: number }> } {
  if (shots.length === 0) return { height: 0, boxes: [] };
  if (shots.length === 1) { const b = shotBox(shots[0], space, margin); return { height: b.height, boxes: [b] }; }
  const rowW = CARD.w - 2 * CARD.pad;
  const maxW = Math.floor((rowW - THUMB.gap) / 2);
  const raw = shots.map((s) => {
    const w = Math.max(1, Number(s.width) || 1);
    const h = Math.max(1, Number(s.height) || 1);
    return Math.max(1, Math.min(maxW, Math.round((w / h) * THUMB.h)));
  });
  let rows = 1;
  let used = 0;
  for (const w of raw) {
    if (used > 0 && used + THUMB.gap + w > rowW) { rows += 1; used = w; } else used += (used > 0 ? THUMB.gap : 0) + w;
  }
  const full = rows * THUMB.h + (rows - 1) * THUMB.gap;
  const { y0, y1 } = spaceBox(space, margin);
  const maxH = Math.max(1, y1 - y0 - CARD.baseH - CARD.gap);
  // The gaps keep their size; only the thumbnails shrink to fit.
  const h = full <= maxH ? THUMB.h : Math.max(1, Math.floor((maxH - (rows - 1) * THUMB.gap) / rows));
  const k = h / THUMB.h;
  return {
    height: rows * h + (rows - 1) * THUMB.gap,
    boxes: raw.map((w) => ({ width: Math.max(1, Math.floor(w * k)), height: h }))
  };
}

/* ---- what a failure means --------------------------------------------------------- */

export type PuckProblem = 'noKey' | 'noEngine' | 'badKey' | 'busy' | 'network' | 'noHive' | 'micDenied' | 'micFailed' | 'other';

/** The kind of trouble behind an error string from main or the recorder,
 *  so the puck can say what to do about it rather than quote it (founder,
 *  7 Sep 2026: proper error states for the flows that need setting up).
 *  The strings come from main/freeflow (`Groq 401: ...`, `missing Groq API
 *  key`), main/puck (`no transcription key`, `hive disabled`), the recorder
 *  (`mic-denied`, `mic-failed`) and node's fetch (`fetch failed`, ENOTFOUND). */
export function puckProblem(error: string | undefined | null): PuckProblem {
  const e = (error ?? '').toLowerCase();
  if (e === 'mic-denied') return 'micDenied';
  if (e === 'mic-failed' || e === 'no microphone api' || e === 'recording not supported') return 'micFailed';
  // 0.5.3, F16: main refuses with `no transcription engine` when neither a
  // local engine nor a Groq key can transcribe; the door is Dictation & Meetings.
  if (e.includes('no transcription engine')) return 'noEngine';
  if (e.includes('no transcription key') || e.includes('missing groq api key')) return 'noKey';
  if (/groq 40[13]|invalid api key|invalid_api_key|unauthori[sz]ed/.test(e)) return 'badKey';
  if (/groq 429|rate limit/.test(e)) return 'busy';
  if (/groq 5\d\d|fetch failed|enotfound|econn|etimedout|network|socket hang up|dns/.test(e)) return 'network';
  if (e.includes('hive disabled') || e === 'not registered') return 'noHive';
  return 'other';
}
