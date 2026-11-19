import { Container, Graphics } from 'pixi.js';
import type { HalloweenPlan, PlanLamp, PlanPumpkin } from './seasonPlan';

// The Halloween dressing of the Classic floor (0.5.5, founder 28 Sep 2026):
// jack o lanterns with a flickering glow, cobwebs in room corners, a candy
// bowl on the cafe counter, a few bats that cross now and then, and a dusky
// evening tint over the map. Every piece is drawn here in code and added on
// top of the scene, so nothing is painted into a map and turning the season
// off leaves exactly the floor there was before. House colors: orange,
// purple, green and black. The values are the season's palette, the one
// design/season.css and costumes.ts use, so the floor matches the rest.
//
// The dark interior (0.5.5 rc2, R4-4, founder 30 Sep: "Add red lights and
// make the office lights inside dimmer ... the office should look spooky";
// then R5-2: "the dark interior should be there for both halloween modes(dark
// and light)"): a deep dusk and a few red wall lamps whenever the season is
// on, whatever the app theme. The decor never reads light or dark. With the
// season off nothing here is shown, so General keeps the light office in
// dark mode too.

const ORANGE = 0xf59a3c;
const ORANGE_DARK = 0xe57f22;
const ORANGE_LIGHT = 0xffc27a;
const STEM = 0x7fa640;
const FLAME = 0xffe08a;
const PURPLE = 0x7b4fb0;
const NIGHT = 0x2b2238;
const WEB = 0x6f6285;
const DUSK = 0x2b2238;
const CANDY = [PURPLE, ORANGE, STEM, 0xf4f0fa] as const;
// The founder's word overrides the season's no red rule for these two only:
// a light on the floor, never a status colour and never on the app's chrome.
const LAMP_RED = 0xc8322e;
const LAMP_RIM = 0xff6a5a;

const GLOW_RINGS = 10;

/** How dark the evening is: the alpha of the tint over the map. The rooms
 *  read dimmer, the people stay readable. */
export const DUSK_ALPHA = 0.4;

const LAMP_RADIUS = 22;

interface Lantern { plan: PlanPumpkin; glow: Graphics; face: Graphics; }
interface Lamp { plan: PlanLamp; glow: Graphics; }

interface Bat {
  g: Graphics;
  /** Seconds until it next takes off; while flying, seconds in the air. */
  wait: number;
  t: number;
  flying: boolean;
  fromX: number; toX: number; baseY: number; swing: number; duration: number;
}

export interface SeasonDecorOptions {
  plan: HalloweenPlan;
  /** Map size in map pixels. */
  mapWidth: number;
  mapHeight: number;
  /** The sorted layer the characters live in: props sort among them. */
  charLayer: Container;
  /** The map's root: [tile layers..., charLayer]. */
  root: Container;
  /** No bats and a steady glow for people who asked for less motion. */
  reducedMotion: boolean;
}

export class SeasonDecor {
  private readonly tint = new Graphics();
  private readonly props = new Container();
  private readonly glows = new Container();
  private readonly sky = new Container();
  private readonly lanterns: Lantern[] = [];
  private readonly lamps: Lamp[] = [];
  /** The red lamps' bulbs sit in the sorted layer; their glows in `reds`. */
  private readonly bulbs: Graphics[] = [];
  private readonly reds = new Container();
  private readonly bats: Bat[] = [];
  private readonly parts: Container[] = [];
  private on = false;
  private t = 0;

  constructor(private readonly opts: SeasonDecorOptions) {
    const { plan, charLayer, root, mapWidth, mapHeight } = opts;

    // Dusk goes UNDER the characters and over the map, so the room darkens and
    // the people, their bubbles and the props stay as readable as ever. Drawn
    // once.
    this.tint.rect(0, 0, mapWidth, mapHeight).fill({ color: DUSK, alpha: 1 });
    this.tint.alpha = DUSK_ALPHA;
    this.tint.eventMode = 'none';
    root.addChildAt(this.tint, root.getChildIndex(charLayer));

    for (const web of plan.cobwebs) {
      const g = new Graphics();
      g.eventMode = 'none';
      paintCobweb(g);
      g.position.set(web.x, web.y);
      if (web.flip) g.scale.x = -1;
      g.zIndex = web.y + 1;
      charLayer.addChild(g);
      this.parts.push(g);
    }

    for (const p of plan.pumpkins) {
      const body = new Graphics();
      body.eventMode = 'none';
      const face = new Graphics();
      face.eventMode = 'none';
      paintPumpkin(body, p.size);
      const holder = new Container();
      holder.eventMode = 'none';
      holder.addChild(body, face);
      holder.position.set(p.x, p.y);
      holder.zIndex = p.z;
      charLayer.addChild(holder);
      this.parts.push(holder);

      const glow = new Graphics();
      glow.eventMode = 'none';
      glow.blendMode = 'add';
      const w = p.size === 'floor' ? 12 : 8;
      glow.position.set(p.x + w / 2, p.y - (p.size === 'floor' ? 5 : 3));
      this.glows.addChild(glow);
      this.lanterns.push({ plan: p, glow, face });
    }

    // The red lamps: a bulb on the wall, sorted with the people, and a pool of
    // red light drawn once. The candle flicker only moves its opacity.
    this.reds.eventMode = 'none';
    for (const l of plan.lamps) {
      const bulb = new Graphics();
      bulb.eventMode = 'none';
      paintLamp(bulb);
      bulb.position.set(l.x, l.y);
      bulb.zIndex = l.z;
      charLayer.addChild(bulb);
      this.parts.push(bulb);
      this.bulbs.push(bulb);

      const glow = new Graphics();
      glow.eventMode = 'none';
      glow.blendMode = 'add';
      for (let i = 0; i < GLOW_RINGS; i++) {
        const k = 1 - i / GLOW_RINGS;
        glow.circle(0, 0, LAMP_RADIUS * k).fill({ color: i < GLOW_RINGS / 2 ? LAMP_RIM : LAMP_RED, alpha: 0.04 });
      }
      glow.position.set(l.x, l.y);
      this.reds.addChild(glow);
      this.lamps.push({ plan: l, glow });
    }
    this.glows.addChild(this.reds);

    const bowl = new Graphics();
    bowl.eventMode = 'none';
    paintCandyBowl(bowl);
    bowl.position.set(plan.candy.x, plan.candy.y);
    bowl.zIndex = plan.candy.z;
    charLayer.addChild(bowl);
    this.parts.push(bowl);

    // The glows and the bats fly over everything, characters included.
    this.glows.eventMode = 'none';
    this.sky.eventMode = 'none';
    root.addChild(this.glows, this.sky);

    if (!opts.reducedMotion) {
      for (let i = 0; i < plan.bats; i++) {
        const g = new Graphics();
        g.eventMode = 'none';
        g.visible = false;
        this.sky.addChild(g);
        // Staggered first flights: the first bat leaves within a few seconds.
        this.bats.push({ g, wait: 2 + i * 7, t: 0, flying: false, fromX: 0, toX: 0, baseY: 0, swing: 0, duration: 1 });
      }
    }

    this.parts.push(this.tint, this.glows, this.sky);
    this.paintLanterns(0);
    this.setOn(false);
  }

  /** Dress the floor, or put it back exactly as it was. */
  setOn(on: boolean): void {
    this.on = on;
    for (const p of this.parts) p.visible = on;
    this.showLamps();
  }

  /** The red lamps are lit whenever the decor is on. */
  private showLamps(): void {
    const lit = this.on;
    this.reds.visible = lit;
    for (const b of this.bulbs) b.visible = lit;
    if (lit) this.flickerLamps(this.opts.reducedMotion ? 0 : this.t);
  }

  isOn(): boolean { return this.on; }

  update(dt: number): void {
    if (!this.on) return;
    this.t += dt;
    if (!this.opts.reducedMotion) this.paintLanterns(this.t);
    if (!this.opts.reducedMotion) this.flickerLamps(this.t);
    for (let i = 0; i < this.bats.length; i++) this.updateBat(this.bats[i], i, dt);
  }

  destroy(): void {
    for (const p of this.parts) {
      p.parent?.removeChild(p);
      p.destroy({ children: true });
    }
    this.parts.length = 0;
    this.lanterns.length = 0;
    this.lamps.length = 0;
    this.bulbs.length = 0;
    this.bats.length = 0;
  }

  private paintLanterns(t: number): void {
    for (const l of this.lanterns) {
      const flicker = candle(t, l.plan.phase);
      const floor = l.plan.size === 'floor';
      const r = floor ? 15 : 10;
      l.glow.clear();
      // Many faint rings, each a little smaller, read as one soft pool of light.
      for (let i = 0; i < GLOW_RINGS; i++) {
        const k = 1 - i / GLOW_RINGS;
        l.glow.circle(0, 0, r * k).fill({ color: i < GLOW_RINGS / 2 ? ORANGE : FLAME, alpha: 0.022 * flicker });
      }
      l.face.clear();
      paintFace(l.face, l.plan.size, 0.75 + 0.25 * flicker);
    }
  }

  /** The red lamps flicker like the lanterns, through opacity alone. */
  private flickerLamps(t: number): void {
    for (const l of this.lamps) l.glow.alpha = candle(t, l.plan.phase);
  }

  private updateBat(b: Bat, index: number, dt: number): void {
    if (!b.flying) {
      b.wait -= dt;
      if (b.wait > 0) return;
      const { mapWidth, mapHeight } = this.opts;
      const leftToRight = (Math.floor(this.t * 7) + index) % 2 === 0;
      b.fromX = leftToRight ? -12 : mapWidth + 12;
      b.toX = leftToRight ? mapWidth + 12 : -12;
      b.baseY = mapHeight * (0.12 + 0.55 * (((this.t * 0.37 + index * 0.31) % 1)));
      b.swing = 10 + 8 * ((index + 1) % 3);
      b.duration = 6.5 + index * 1.2;
      b.t = 0;
      b.flying = true;
      b.g.visible = true;
      b.g.scale.x = leftToRight ? 1 : -1;
    }
    b.t += dt;
    const k = b.t / b.duration;
    if (k >= 1) {
      b.flying = false;
      b.g.visible = false;
      // "Now and then": a good while on the ground between crossings.
      b.wait = 14 + index * 6 + ((this.t * 3) % 9);
      return;
    }
    b.g.position.set(
      b.fromX + (b.toX - b.fromX) * k,
      b.baseY + Math.sin(k * Math.PI * 3 + index) * b.swing
    );
    paintBat(b.g, Math.floor(b.t * 9) % 2 === 0);
  }
}

/** A candle, not a bulb: two slow waves and a quick one, never fully dark. */
function candle(t: number, phase: number): number {
  const ph = phase * Math.PI * 2;
  return 0.72
    + 0.14 * Math.sin(t * 2.1 + ph)
    + 0.09 * Math.sin(t * 5.3 + ph * 1.7)
    + 0.05 * Math.sin(t * 13 + ph * 0.6);
}

/** A wall lamp, centred on its bulb: a dark bracket and a red shade. */
function paintLamp(g: Graphics): void {
  g.rect(-2, -4, 5, 1).fill(NIGHT);                  // bracket
  g.rect(0, -3, 1, 1).fill(NIGHT);
  g.roundRect(-2, -2, 5, 4, 1).fill(LAMP_RED);       // shade
  g.rect(-1, -1, 2, 1).fill(LAMP_RIM);               // the hot spot
}

/** A quarter web in a top-left corner: spokes from the corner, threads across. */
function paintCobweb(g: Graphics): void {
  const spokes: Array<[number, number]> = [[15, 0], [13, 6], [9, 10], [5, 13], [0, 15]];
  for (const [x, y] of spokes) {
    g.moveTo(0, 0).lineTo(x, y).stroke({ color: WEB, width: 1, alpha: 0.8, pixelLine: true });
  }
  for (const k of [0.4, 0.7, 1]) {
    g.moveTo(spokes[0][0] * k, spokes[0][1] * k);
    for (let i = 1; i < spokes.length; i++) {
      const [ax, ay] = spokes[i - 1];
      const [bx, by] = spokes[i];
      // Each thread sags toward the corner between two spokes.
      g.quadraticCurveTo((ax + bx) * k * 0.44, (ay + by) * k * 0.44, bx * k, by * k);
    }
    g.stroke({ color: WEB, width: 1, alpha: 0.6, pixelLine: true });
  }
}

/** Drawn up from its base line: (0, 0) is the bottom-left corner. */
function paintPumpkin(g: Graphics, size: 'desk' | 'floor'): void {
  if (size === 'floor') {
    g.ellipse(6, 0, 6, 1.5).fill({ color: NIGHT, alpha: 0.35 });     // shadow
    g.roundRect(0, -9, 12, 9, 3).fill(ORANGE);
    g.roundRect(0, -9, 3, 9, 2).fill(ORANGE_DARK);                   // ribs
    g.roundRect(9, -9, 3, 9, 2).fill(ORANGE_DARK);
    g.rect(4, -9, 1, 9).fill({ color: ORANGE_DARK, alpha: 0.55 });
    g.rect(7, -9, 1, 9).fill({ color: ORANGE_DARK, alpha: 0.55 });
    g.rect(2, -8, 3, 1).fill(ORANGE_LIGHT);                          // shine
    g.rect(5, -12, 2, 3).fill(STEM);
    g.rect(7, -12, 2, 1).fill(STEM);
    return;
  }
  g.ellipse(4, 0, 4, 1).fill({ color: NIGHT, alpha: 0.3 });
  g.roundRect(0, -6, 8, 6, 2).fill(ORANGE);
  g.roundRect(0, -6, 2, 6, 1).fill(ORANGE_DARK);
  g.roundRect(6, -6, 2, 6, 1).fill(ORANGE_DARK);
  g.rect(2, -5, 2, 1).fill(ORANGE_LIGHT);
  g.rect(3, -8, 2, 2).fill(STEM);
}

/** The carved face, lit from inside. Redrawn each frame as the candle moves. */
function paintFace(g: Graphics, size: 'desk' | 'floor', light: number): void {
  const fill = { color: FLAME, alpha: light };
  if (size === 'floor') {
    g.rect(2, -7, 2, 2).fill(fill);      // eyes
    g.rect(8, -7, 2, 2).fill(fill);
    g.rect(5, -5, 2, 1).fill(fill);      // nose
    g.rect(2, -3, 8, 1).fill(fill);      // grin
    g.rect(3, -2, 2, 1).fill(fill);
    g.rect(7, -2, 2, 1).fill(fill);
    return;
  }
  g.rect(1, -5, 2, 1).fill(fill);
  g.rect(5, -5, 2, 1).fill(fill);
  g.rect(2, -3, 4, 1).fill(fill);
}

function paintCandyBowl(g: Graphics): void {
  // Wrapped sweets heaped over the rim, then the bowl in front of them.
  const sweets: Array<[number, number]> = [[0, -6], [3, -7], [6, -6], [2, -5], [4, -5]];
  sweets.forEach(([x, y], i) => g.rect(x, y, 2, 2).fill(CANDY[i % CANDY.length]));
  g.roundRect(0, -4, 8, 4, 2).fill(NIGHT);
  g.rect(1, -4, 6, 1).fill(PURPLE);
  g.rect(2, -2, 1, 1).fill(ORANGE);
  g.rect(5, -2, 1, 1).fill(ORANGE);
}

function paintBat(g: Graphics, wingsUp: boolean): void {
  g.clear();
  g.rect(-1, -1, 3, 3).fill(NIGHT);                 // body
  g.rect(-1, -2, 1, 1).fill(NIGHT);                 // ears
  g.rect(1, -2, 1, 1).fill(NIGHT);
  const y = wingsUp ? -3 : 0;
  const tip = wingsUp ? -1 : 2;
  g.poly([-1, 0, -4, y, -7, tip, -4, 1]).fill(NIGHT);
  g.poly([2, 0, 5, y, 8, tip, 5, 1]).fill(NIGHT);
}
