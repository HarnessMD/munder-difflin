// Ported from Prozzta/guppyos 02d0d50b (MIT).
// The stations floor's thought cloud: the fork's rebuilt office/ThoughtBubble.ts, here as its
// own file so the office keeps its own cloud (office/ThoughtBubble.ts) exactly as it is.
import { Container, Graphics, Text } from 'pixi.js';
import { colors } from '@/design/tokens';
import { toolIcon } from '../office/ToolBubble';

// A comic "thought cloud" pinned above an avatar's head showing what it's doing
// RIGHT NOW (the agent's live `action`, e.g. "edit App.tsx" / "bash npm test").
// Distinct from the darker ToolBubble speech bubble: a light cream cloud with a
// trailing-puff tail — the visual shorthand for "thinking". Built to DESIGN.md:
// integer pixels, hard 1px ink outline, limited palette, no soft shadows.
//
// Shares ToolBubble's fade state machine and word-wrapping so behaviour reads
// consistently; the differences are the look (cloud + tail, light fill) and that
// it stays put until the action changes (no auto-linger while the agent works).

// TES-BUBBLE-TAIL-SHARP-189: the cloud is drawn in SCREEN px, in an unscaled layer the floor puts on
// the stage over its world, and placed through the world's transform (setView). Its text is then one
// texel per device px at any world scale (1.1.88 drew it in the world at half scale: sharp only when
// the world scale was exactly 2, resampled at every other zoom and on the TES smooth fit). Where it
// hangs (OFFSET_Y, the lift, the bounds, the layout the floors part clouds with) stays in world px.
const PADDING_X = 6;
const PADDING_Y = 3;
const CORNER_RADIUS = 5;
const MAX_WIDTH = 300;                  // screen px: the widest cloud (1.1.88's at a world scale of 2)
const FILL_COLOR = colors.cream[50];   // light cloud
const OUTLINE_COLOR = colors.ink[900];
const TEXT_COLOR = '#3d2e4a';           // ink-700
const FONT_SIZE = 12;
const OFFSET_Y = -38;                   // world px: a touch higher than the tool bubble
const TAIL_EDGE = 8;                    // the tail leaves the cloud at least this far inside it (screen px)
// The two puffs under the cloud, in world px so they fit the gap down to the head at any scale
// (1.1.88's at a world scale of 2: 4 and 9 px down, radius 3 and 2).
const TAIL_ROOT_DY = 2, TAIL_ROOT_R = 1.5, TAIL_TIP_DY = 4.5, TAIL_TIP_R = 1;
const FADE_IN_DURATION = 0.15;
const FADE_OUT_DURATION = 0.3;
const LINGER_DURATION = 1.2;            // only used when hide() is requested
const DOTS_CYCLE_SPEED = 0.45;
// breakWords splits unbroken tokens (long paths/hashes) that would otherwise still spill past the cloud.
const WRAP_WIDTH = MAX_WIDTH - PADDING_X * 2;

/** The world's transform on the stage (its x, y and scale) and the renderer's resolution. */
export interface BubbleView { scale: number; x: number; y: number; resolution: number }
// Hard cap on raw characters so a pathological action string wraps to a few
// lines instead of a runaway-tall cloud (~4 lines at this width).
const MAX_CHARS = 160;

type BubbleState = 'hidden' | 'fading-in' | 'visible' | 'lingering' | 'fading-out';

export class ThoughtBubble {
  readonly container: Container;
  private inner: Container;
  private bg: Graphics;
  /** The tail's two puffs: `tail` hangs from the cloud, `tip` is over the head. */
  private tail: Graphics;
  private tip: Graphics;
  private tailKey = '';
  private label: Text;
  private state: BubbleState = 'hidden';
  private fadeElapsed = 0;
  private lingerElapsed = 0;
  private bgW = 0;
  private bgH = 0;
  private isThinking = false;
  private dotsElapsed = 0;
  private dotsPhase = 0;
  // Extra upward shift (px) applied on top of OFFSET_Y so two nearby bubbles can
  // stack instead of overlapping. Set each frame by the scene's overlap pass.
  private extraLift = 0;
  // The world's transform: the cloud's world rect is drawn at view.x + x * view.scale, on whole
  // device px. Until a floor sets it, world and screen are the same.
  private view: BubbleView = { scale: 1, x: 0, y: 0, resolution: 1 };
  // World bounds (map size in px). An avatar near the map edge — Michael's CEO
  // room sits in the top-left corner — would otherwise push its cloud out of
  // the visible world. setPosition clamps the rect back inside, tooltip-style.
  private boundsW = 0;
  private boundsH = 0;

  constructor() {
    this.container = new Container();
    this.container.zIndex = 100000;
    this.container.eventMode = 'none';
    this.container.alpha = 0;
    this.container.visible = false;

    this.inner = new Container();
    this.container.addChild(this.inner);

    this.tail = new Graphics();
    this.tip = new Graphics();
    this.bg = new Graphics();
    this.label = new Text({
      text: '',
      // Drawn texel for device px (the layer is unscaled and the origin whole): never blended.
      textureStyle: { scaleMode: 'nearest' },
      style: {
        fontSize: FONT_SIZE,
        fontWeight: 'bold',
        fill: TEXT_COLOR,
        fontFamily: 'monospace',
        align: 'left',
        wordWrap: true,
        wordWrapWidth: WRAP_WIDTH,
        breakWords: true
      }
    });
    this.label.x = PADDING_X;
    this.label.y = PADDING_Y;

    // tail first so it sits behind the body
    this.inner.addChild(this.tail, this.tip, this.bg, this.label);
  }

  /** Show the current activity. Empty text → an animated "…" (model thinking).
   *  `tool` (an agent's `carrying`) prefixes a small glyph when present. */
  show(text: string, tool?: string): void {
    this.isThinking = !text.trim();
    if (this.isThinking) {
      this.dotsElapsed = 0;
      this.dotsPhase = 0;
      this.label.text = '.';
    } else {
      const display = tool ? `${toolIcon(tool)} ${text}` : text;
      // Word-wrap (style.wordWrap) handles the horizontal fit, so the card can no
      // longer overflow; we only cap the raw length so a very long action wraps to
      // a few lines rather than a wall of text.
      this.label.text = display.length > MAX_CHARS
        ? display.slice(0, MAX_CHARS - 1).trimEnd() + '…'
        : display;
    }
    this.redraw();
    this.reveal();
  }

  private reveal(): void {
    if (this.state === 'hidden' || this.state === 'fading-out') {
      this.state = 'fading-in';
      this.fadeElapsed = 0;
      this.container.visible = true;
    } else {
      // already up — swap text in place without re-fading
      this.state = 'visible';
      this.container.alpha = 1;
    }
    this.lingerElapsed = 0;
  }

  /** Begin fading out (after a short linger) — call when the agent goes quiet. */
  startLinger(): void {
    if (this.state === 'hidden') return;
    this.state = 'lingering';
    this.lingerElapsed = 0;
  }

  /** The world's transform on the stage, each frame before setPosition (the camera moves it). */
  setView(view: BubbleView): void {
    if (!(view.scale > 0) || !(view.resolution > 0)) return;
    this.view = view;
  }

  /** The cloud's size in world px: it is bgW x bgH screen px at any world scale. */
  private worldSize(): { w: number; h: number } {
    return { w: this.bgW / this.view.scale, h: this.bgH / this.view.scale };
  }

  /** A screen px value on the nearest whole device px. */
  private snap(v: number): number {
    const r = this.view.resolution;
    return Math.round(v * r) / r;
  }

  /** The world rect the bubble must stay inside (the map size, in px). */
  setBounds(w: number, h: number): void {
    this.boundsW = w;
    this.boundsH = h;
  }

  /** Hang the cloud over the head at world (`px`, `py`). `slide` moves it aside by that many world
   *  px (a scene's overlap pass); the tail still points down at the head under `px`. */
  setPosition(px: number, py: number, slide = 0): void {
    const { w, h } = this.worldSize();
    let x = px + slide - w / 2;
    let y = py + OFFSET_Y - h - this.extraLift;
    if (this.boundsW > 0) {
      // Clamp into the world, tooltip-style: slide horizontally, and a cloud
      // that would poke above the top edge slides down instead (it may then
      // cover the avatar's hat — better than being unreadable off-world).
      x = Math.min(Math.max(x, 1), Math.max(1, this.boundsW - w - 1));
      y = Math.min(Math.max(y, 1), Math.max(1, this.boundsH - h - 1));
    }
    const v = this.view;
    this.container.x = this.snap(v.x + x * v.scale);
    this.container.y = this.snap(v.y + y * v.scale);
    this.label.x = this.snap(PADDING_X);
    this.label.y = this.snap(PADDING_Y);
    this.aimTail(v.x + px * v.scale - this.container.x);
  }

  /** Point the tail at the head, `headX` screen px from the cloud's left edge: it leaves from under
   *  the cloud as near the head as the cloud's edge allows, and its tip is over the head. (1.1.88 drew
   *  it at 0.32 of the width and stepped it left, under a cloud centred on the head: always left of it.) */
  private aimTail(headX: number): void {
    const s = this.view.scale;
    const root = this.snap(Math.min(Math.max(headX, TAIL_EDGE), Math.max(TAIL_EDGE, this.bgW - TAIL_EDGE)));
    // The tip is always over the head, even when the floor slid a narrow cloud past it.
    const tip = this.snap(headX);
    const key = `${root}|${tip}|${s}|${this.bgW}|${this.bgH}`;
    if (key === this.tailKey) return;
    this.tailKey = key;
    this.tail.clear();
    this.tail.circle(root, this.snap(this.bgH + TAIL_ROOT_DY * s), TAIL_ROOT_R * s).fill({ color: FILL_COLOR }).stroke({ color: OUTLINE_COLOR, width: 1 });
    this.tip.clear();
    this.tip.circle(tip, this.snap(this.bgH + TAIL_TIP_DY * s), TAIL_TIP_R * s).fill({ color: FILL_COLOR }).stroke({ color: OUTLINE_COLOR, width: 1 });
  }

  /** Extra upward shift (px), set by the scene's bubble-overlap pass. */
  setLift(px: number): void {
    this.extraLift = px;
  }

  /** The bubble's base screen rect (ignoring any lift) for a given anchor, or
   *  null when hidden. Used by the scene to detect and resolve overlaps. */
  getLayout(px: number, py: number): { x: number; y: number; w: number; h: number } | null {
    if (this.state === 'hidden') return null;
    const { w, h } = this.worldSize();
    let x = px - w / 2;
    let y = py + OFFSET_Y - h;
    if (this.boundsW > 0) {
      // Report the CLAMPED base rect so the overlap resolver stacks bubbles
      // where they actually render, not where they ideally would.
      x = Math.min(Math.max(x, 1), Math.max(1, this.boundsW - w - 1));
      y = Math.min(Math.max(y, 1), Math.max(1, this.boundsH - h - 1));
    }
    return { x, y, w, h };
  }

  hide(): void {
    this.state = 'hidden';
    this.isThinking = false;
    this.container.alpha = 0;
    this.container.visible = false;
  }

  isHidden(): boolean {
    return this.state === 'hidden';
  }

  update(dt: number): void {
    if (this.isThinking && (this.state === 'visible' || this.state === 'fading-in')) {
      this.dotsElapsed += dt;
      const newPhase = Math.floor(this.dotsElapsed / DOTS_CYCLE_SPEED) % 3;
      if (newPhase !== this.dotsPhase) {
        this.dotsPhase = newPhase;
        this.label.text = ['.', '..', '...'][this.dotsPhase];
        this.redraw();
      }
    }

    switch (this.state) {
      case 'fading-in': {
        this.fadeElapsed += dt;
        const t = Math.min(this.fadeElapsed / FADE_IN_DURATION, 1);
        this.container.alpha = t;
        if (t >= 1) this.state = 'visible';
        break;
      }
      case 'lingering': {
        this.lingerElapsed += dt;
        if (this.lingerElapsed >= LINGER_DURATION) {
          this.state = 'fading-out';
          this.fadeElapsed = 0;
        }
        break;
      }
      case 'fading-out': {
        this.fadeElapsed += dt;
        const t = Math.min(this.fadeElapsed / FADE_OUT_DURATION, 1);
        this.container.alpha = 1 - t;
        if (t >= 1) this.hide();
        break;
      }
    }
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }

  private redraw(): void {
    // The cloud always wraps the MEASURED text. Clamping the bg to MAX_WIDTH
    // while the label keeps its real width let text paint past the bubble edge
    // whenever the measurement overshot wordWrapWidth a touch (emoji glyphs,
    // fallback-font metrics) — on the dark map that read as "horizontally cut".
    // wordWrap already bounds the label, so the bg needs no clamp of its own.
    this.bgW = this.label.width + PADDING_X * 2;
    this.bgH = this.label.height + PADDING_Y * 2;

    this.bg.clear();
    this.bg.roundRect(0, 0, this.bgW, this.bgH, CORNER_RADIUS);
    this.bg.fill({ color: FILL_COLOR });
    this.bg.stroke({ color: OUTLINE_COLOR, width: 1 });

    // Thought-cloud tail: two shrinking puffs from the cloud down to the head — the cue that says
    // "thinking", not "speech". Drawn by setPosition, which knows where the head is.
    this.tailKey = '';
  }
}
