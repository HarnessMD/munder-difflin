import { Container, Graphics } from 'pixi.js';
import type { ChristmasPlan, PlanGift, PlanStrand, PlanTree } from './seasonPlan';

// The Christmas dressing of the Classic floor, the twin of SeasonDecor.ts
// (Halloween): a tree with twinkling lights in a common area or two, gifts
// under them and on desks, strings of lights along the walls, a mug of cocoa
// on the cafe counter and a soft winter evening over the map. Every piece is
// drawn here in code and added on top of the scene, so nothing is painted
// into a map and turning the season off leaves exactly the floor there was.
// The values are the season's palette, the one design/season.css and
// christmasCostumes.ts use, so the floor matches the rest.
//
// The snow itself falls over the whole window (ChristmasLayer.tsx), not
// here, so it is one layer for both skins. With prefers-reduced-motion the
// lights hold still at a steady glow.

const PINE = 0x2f7d45;
const PINE_HI = 0x4e9f63;
const PINE_SH = 0x1e5730;
const TRUNK = 0x6b4426;
const RED = 0xc8322e;
const RED_HI = 0xe5544e;
const GOLD = 0xe8b84a;
const GOLD_HI = 0xffe08a;
const WHITE = 0xf6f6f2;
const BLUE = 0x6fa8dc;
const WIRE = 0x1b2a20;
const EVENING = 0x1d2b45;
const COCOA = 0x6b3f22;
/** The bulbs, in the order a strand repeats them. */
const BULBS = [RED_HI, GOLD_HI, PINE_HI, BLUE] as const;
/** Paper and ribbon of each wrapping (PlanGift.wrap). */
const WRAPS: ReadonlyArray<readonly [number, number]> = [[RED, GOLD], [PINE, RED], [GOLD, RED], [WHITE, PINE]];

const GLOW_RINGS = 8;
/** How deep the winter evening is: lighter than Halloween's dusk, enough
 *  for the lights to glow while every room stays bright. */
export const EVENING_ALPHA = 0.18;
/** Pixels between two bulbs on a strand. */
export const BULB_GAP = 5;

interface Twinkle { g: Graphics; phase: number; }

export interface ChristmasDecorOptions {
  plan: ChristmasPlan;
  mapWidth: number;
  mapHeight: number;
  charLayer: Container;
  root: Container;
  /** Steady lights for people who asked for less motion. */
  reducedMotion: boolean;
}

export class ChristmasDecor {
  private readonly tint = new Graphics();
  private readonly glows = new Container();
  private readonly twinkles: Twinkle[] = [];
  private readonly parts: Container[] = [];
  private on = false;
  private t = 0;

  constructor(private readonly opts: ChristmasDecorOptions) {
    const { plan, charLayer, root, mapWidth, mapHeight } = opts;

    // The evening goes UNDER the characters and over the map, like the dusk.
    this.tint.rect(0, 0, mapWidth, mapHeight).fill({ color: EVENING, alpha: 1 });
    this.tint.alpha = EVENING_ALPHA;
    this.tint.eventMode = 'none';
    root.addChildAt(this.tint, root.getChildIndex(charLayer));
    this.glows.eventMode = 'none';

    for (const s of plan.strands) this.addStrand(s);
    for (const tr of plan.trees) this.addTree(tr);
    for (const g of plan.gifts) this.addGift(g);

    const mug = new Graphics();
    mug.eventMode = 'none';
    paintCocoa(mug);
    mug.position.set(plan.cocoa.x, plan.cocoa.y);
    mug.zIndex = plan.cocoa.z;
    charLayer.addChild(mug);
    this.parts.push(mug);

    // The lights' glow sits over everything, characters included.
    root.addChild(this.glows);
    this.parts.push(this.tint, this.glows);
    this.twinkle(0);
    this.setOn(false);
  }

  /** Dress the floor, or put it back exactly as it was. */
  setOn(on: boolean): void {
    this.on = on;
    for (const p of this.parts) p.visible = on;
  }

  isOn(): boolean { return this.on; }

  update(dt: number): void {
    if (!this.on || this.opts.reducedMotion) return;
    this.t += dt;
    this.twinkle(this.t);
  }

  destroy(): void {
    for (const p of this.parts) {
      p.parent?.removeChild(p);
      p.destroy({ children: true });
    }
    this.parts.length = 0;
    this.twinkles.length = 0;
  }

  private addStrand(s: PlanStrand): void {
    const g = new Graphics();
    g.eventMode = 'none';
    // The wire sags a little between hooks every four bulbs.
    const sag = (x: number) => 1.5 * Math.sin(((x - s.x0) / (BULB_GAP * 4)) * Math.PI) ** 2;
    g.moveTo(s.x0, s.y);
    for (let x = s.x0; x <= s.x1; x++) g.lineTo(x, s.y + sag(x));
    g.stroke({ color: WIRE, width: 1, alpha: 0.7, pixelLine: true });
    g.zIndex = s.z;
    this.parts.push(g);
    this.opts.charLayer.addChild(g);
    let i = 0;
    for (let x = s.x0 + 2; x <= s.x1 - 1; x += BULB_GAP, i++) {
      const color = BULBS[i % BULBS.length];
      const y = Math.round(s.y + sag(x)) + 1;
      g.rect(x, y, 1, 2).fill(color);
      this.addGlow(x + 0.5, y + 1, 4, color, s.phase + i * 0.37);
    }
  }

  private addTree(tr: PlanTree): void {
    const g = new Graphics();
    g.eventMode = 'none';
    paintTree(g);
    g.position.set(tr.x, tr.y);
    g.zIndex = tr.z;
    this.opts.charLayer.addChild(g);
    this.parts.push(g);
    // The tree's own lights: small bulbs over the branches, each twinkling.
    TREE_LIGHTS.forEach(([dx, dy], i) => {
      const color = BULBS[i % BULBS.length];
      g.rect(dx, dy, 1, 1).fill(color);
      this.addGlow(tr.x + dx + 0.5, tr.y + dy + 0.5, 3, color, tr.phase + i * 0.29);
    });
    // The star on top glows gold.
    this.addGlow(tr.x, tr.y - 25, 7, GOLD_HI, tr.phase);
    // Gifts under the tree.
    for (const [dx, wrap, w, h] of [[-9, 0, 6, 5], [4, 1, 5, 4], [-3, 2, 4, 3]] as const) {
      const box = new Graphics();
      box.eventMode = 'none';
      paintGift(box, wrap, w, h);
      box.position.set(tr.x + dx, tr.y + 1);
      box.zIndex = tr.z + 1;
      this.opts.charLayer.addChild(box);
      this.parts.push(box);
    }
  }

  private addGift(gp: PlanGift): void {
    const g = new Graphics();
    g.eventMode = 'none';
    paintGift(g, gp.wrap, 7, 6);
    g.position.set(gp.x, gp.y);
    g.zIndex = gp.z;
    this.opts.charLayer.addChild(g);
    this.parts.push(g);
  }

  private addGlow(x: number, y: number, r: number, color: number, phase: number): void {
    const glow = new Graphics();
    glow.eventMode = 'none';
    glow.blendMode = 'add';
    // Many faint rings, each a little smaller, read as one soft pool of light.
    for (let i = 0; i < GLOW_RINGS; i++) glow.circle(0, 0, r * (1 - i / GLOW_RINGS)).fill({ color, alpha: 0.05 });
    glow.position.set(x, y);
    this.glows.addChild(glow);
    this.twinkles.push({ g: glow, phase: phase % 1 });
  }

  /** The lights twinkle through opacity alone, each on its own beat. */
  private twinkle(t: number): void {
    for (const tw of this.twinkles) tw.g.alpha = twinkle(t, tw.phase);
  }
}

/** A slow breath with a quick sparkle on top, never fully dark. */
export function twinkle(t: number, phase: number): number {
  const ph = phase * Math.PI * 2;
  return 0.7 + 0.2 * Math.sin(t * 1.6 + ph) + 0.1 * Math.sin(t * 4.7 + ph * 2.3);
}

/** Bulbs on the tree, relative to its base centre. */
const TREE_LIGHTS: ReadonlyArray<readonly [number, number]> = [
  [-1, -19], [2, -16], [-3, -14], [1, -12], [-5, -9], [4, -9], [-1, -7], [6, -4], [-6, -4], [2, -4],
];

/** A pine tree drawn up from its base: (0, 0) is the middle of its foot. */
function paintTree(g: Graphics): void {
  g.ellipse(0, 0, 9, 1.5).fill({ color: WIRE, alpha: 0.3 });     // shadow
  g.rect(-2, -3, 4, 3).fill(TRUNK);
  // three tiers, widest at the bottom
  g.poly([-9, -3, 9, -3, 0, -13]).fill(PINE_SH);
  g.poly([-8, -4, 8, -4, 0, -13]).fill(PINE);
  g.poly([-7, -9, 7, -9, 0, -18]).fill(PINE_SH);
  g.poly([-6, -10, 6, -10, 0, -18]).fill(PINE);
  g.poly([-5, -15, 5, -15, 0, -23]).fill(PINE_SH);
  g.poly([-4, -16, 4, -16, 0, -23]).fill(PINE);
  g.poly([-3, -12, 0, -16, 0, -14]).fill(PINE_HI);                // a lit edge
  g.poly([-5, -6, 0, -11, 0, -9]).fill(PINE_HI);
  // tinsel and two ornaments
  g.moveTo(-6, -8).lineTo(5, -11).stroke({ color: GOLD, width: 1, alpha: 0.8, pixelLine: true });
  g.circle(-3, -5, 1).fill(RED);
  g.circle(3, -14, 1).fill(GOLD);
  // the star
  g.poly([0, -27, 1, -25, 3, -25, 1.5, -24, 2, -22, 0, -23, -2, -22, -1.5, -24, -3, -25, -1, -25]).fill(GOLD_HI);
}

/** A wrapped box drawn up from its base line: (0, 0) is its bottom-left. */
function paintGift(g: Graphics, wrap: number, w: number, h: number): void {
  const [paper, ribbon] = WRAPS[wrap % WRAPS.length];
  g.rect(0, -h, w, h).fill(paper);
  g.rect(0, -h, w, 1).fill({ color: WHITE, alpha: 0.25 });        // lid's light edge
  const mid = Math.floor(w / 2);
  g.rect(mid, -h, 1, h).fill(ribbon);
  g.rect(0, -Math.ceil(h / 2), w, 1).fill(ribbon);
  g.rect(mid - 1, -h - 1, 1, 1).fill(ribbon);                      // the bow
  g.rect(mid + 1, -h - 1, 1, 1).fill(ribbon);
}

function paintCocoa(g: Graphics): void {
  // A white mug of cocoa with a candy cane, and a cookie beside it.
  g.rect(0, -5, 5, 5).fill(WHITE);
  g.rect(5, -4, 1, 3).fill(WHITE);
  g.rect(1, -5, 3, 1).fill(COCOA);
  g.rect(2, -8, 1, 3).fill(RED);
  g.rect(3, -8, 1, 1).fill(RED);
  g.rect(2, -7, 1, 1).fill(WHITE);
  g.circle(8.5, -1, 1.5).fill(0xb87036);
}
