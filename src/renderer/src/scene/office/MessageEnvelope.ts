import { Container, Graphics } from 'pixi.js';
import { colors } from '@/design/tokens';

/** Hive speech-acts (mirrors HiveMessage['act'] in the main process). */
export type MessageAct = 'request' | 'inform' | 'propose' | 'query' | 'agree' | 'refuse' | 'done' | 'note';

// A little pixel-art envelope that flies from a sender's desk to a recipient's
// desk when the hive routes a message, then pops a small arrival burst. Lives in
// world space on the character layer so the camera transforms it like everything
// else. Fully self-contained: spawn it, tick it, and drop it when done() is true.
//
// Aesthetic per DESIGN.md — hard edges, integer pixels, no border-radius, ink
// outline, status colour by speech-act so a glance reads "who's asking whom".

/** Speech-act → envelope tint. Mirrors the floor's status palette intent:
 *  asks are cool, answers are warm/positive, refusals are red. */
const ACT_COLOR: Record<MessageAct, number> = {
  request: colors.accent.sky,
  query:   colors.accent.lilac,
  propose: colors.accent.lemon,
  inform:  colors.cream[200],
  note:    colors.cream[200],
  agree:   colors.accent.mint,
  done:    colors.accent.mint,
  refuse:  colors.accent.coral
};

const OUTLINE = colors.ink[900];
const HUMAN_COLOR = colors.accent.coral; // escalations to the human

const FLY_HEIGHT = 22;       // px above the feet anchor the envelope rides at
const ARC_LIFT = 38;         // peak of the travel arc (negative y)
const SPEED = 230;           // px/sec — duration derives from travel distance
const MIN_DURATION = 0.8;
const MAX_DURATION = 2.0;
const FADE_IN = 0.14;
const FADE_OUT = 0.22;
const BURST_DURATION = 0.34; // arrival sparkle ring

function easeInOut(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
}

export class MessageEnvelope {
  readonly container: Container;
  private body: Graphics;
  private burst: Graphics;

  private sx: number; private sy: number;
  private ex: number; private ey: number;
  private duration: number;
  private elapsed = 0;
  private bursting = false;
  private burstElapsed = 0;
  private finished = false;

  /** start/end are world-pixel feet anchors of sender & recipient. */
  constructor(
    start: { x: number; y: number },
    end: { x: number; y: number },
    act: MessageAct,
    needsHuman: boolean
  ) {
    this.sx = start.x; this.sy = start.y - FLY_HEIGHT;
    this.ex = end.x;   this.ey = end.y - FLY_HEIGHT;
    const dist = Math.hypot(this.ex - this.sx, this.ey - this.sy);
    this.duration = Math.min(MAX_DURATION, Math.max(MIN_DURATION, dist / SPEED));

    const fill = needsHuman ? HUMAN_COLOR : (ACT_COLOR[act] ?? colors.cream[200]);

    this.container = new Container();
    this.container.zIndex = 1_000_000; // always above the cast
    this.container.eventMode = 'none';
    this.container.alpha = 0;

    // Envelope: a 14×10 rect with an ink outline and a "flap" chevron. Drawn
    // centered so rotation/scale pivot at the middle.
    this.body = new Graphics();
    const w = 14, h = 10;
    this.body.rect(-w / 2, -h / 2, w, h).fill({ color: fill }).stroke({ color: OUTLINE, width: 1 });
    // flap — two lines from the top corners meeting at the centre
    this.body.moveTo(-w / 2, -h / 2).lineTo(0, h / 2 - 3).lineTo(w / 2, -h / 2)
      .stroke({ color: OUTLINE, width: 1 });
    this.container.addChild(this.body);

    this.burst = new Graphics();
    this.burst.visible = false;
    this.container.addChild(this.burst);

    this.setPos(this.sx, this.sy);
  }

  private setPos(x: number, y: number): void {
    this.container.x = Math.round(x);
    this.container.y = Math.round(y);
  }

  /** Advance the animation. Returns true once it has fully played out. */
  update(dt: number): boolean {
    if (this.finished) return true;

    if (!this.bursting) {
      this.elapsed += dt;
      const t = Math.min(this.elapsed / this.duration, 1);
      const e = easeInOut(t);
      // quadratic arc: lerp the endpoints, lift the midpoint
      const x = this.sx + (this.ex - this.sx) * e;
      const lift = -ARC_LIFT * Math.sin(Math.PI * e);
      const y = this.sy + (this.ey - this.sy) * e + lift;
      this.setPos(x, y);

      // fade in at the start, out near the end; gentle bob rotation
      const fadeIn = Math.min(this.elapsed / FADE_IN, 1);
      const fadeOut = t > 1 - FADE_OUT / this.duration
        ? Math.max(0, (1 - t) / (FADE_OUT / this.duration))
        : 1;
      this.container.alpha = Math.min(fadeIn, fadeOut);
      this.body.rotation = Math.sin(this.elapsed * 6) * 0.12;

      if (t >= 1) {
        this.bursting = true;
        this.body.visible = false;
        this.burst.visible = true;
        this.container.alpha = 1;
        this.setPos(this.ex, this.ey);
      }
      return false;
    }

    // arrival burst — an expanding ink ring that fades out
    this.burstElapsed += dt;
    const bt = Math.min(this.burstElapsed / BURST_DURATION, 1);
    const r = 3 + bt * 12;
    this.burst.clear();
    this.burst.circle(0, 0, r).stroke({ color: colors.accent.lemon, width: 2, alpha: 1 - bt });
    this.container.alpha = 1 - bt;
    if (bt >= 1) {
      this.finished = true;
      return true;
    }
    return false;
  }

  destroy(): void {
    this.container.destroy({ children: true });
  }
}
