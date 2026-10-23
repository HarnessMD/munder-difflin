// Ported from Prozzta/guppyos 02d0d50b (MIT).
import { Container } from 'pixi.js';
import { MessageEnvelope, type MessageAct } from '../office/MessageEnvelope';
import { ThoughtBubble, type BubbleView } from './stationBubble';
import { cloudShows, consumeSays as consumeSayEvents, createCloudGate, type BubbleSay, type BubbleSayCursor, type CloudGate } from './bubbleModel';

export type BubbleAnchor = { id: string; x: number; y: number };
export type BubbleSayOptions = { ttl?: number; key?: string; delay?: number };

/** A status cloud: with its status the layer shows it only now and then; without one, always. */
export type BubbleThoughtIn = { text: string; tool?: string; status?: string };

type ActiveThought = {
  bubble: ThoughtBubble;
  thought: BubbleThoughtIn | null;
  /** When its status cloud shows (TES-BUBBLES-188 d). */
  gate: CloudGate;
  /** The status cloud is showing now. */
  up: boolean;
  say: { text: string; until: number; key?: string } | null;
  shown: string | null;
};

const DEFAULT_SAY_MS = 2600;
const MAX_ENVELOPES = 20;
/** The clear gap kept between two clouds, px. */
const CLOUD_GAP = 4;
/** How far of its own half width a cloud keeps over its head when it slides aside, px. */
const SLIDE_KEEP = 6;
/** Rounds of sideways pushing before the leftover overlap is lifted. */
const SLIDE_ROUNDS = 8;

/** Shared bubble overlay for station themes: the envelopes fly in the world (`container`); the clouds
 *  hang in `screen`, an unscaled layer the floor puts on the stage over the world, so their text is one
 *  texel per device px at any fit (TES-BUBBLE-TAIL-SHARP-189). */
export class BubbleLayer {
  readonly container = new Container();
  readonly screen = new Container();
  private readonly thoughts = new Map<string, ActiveThought>();
  private readonly anchors = new Map<string, { x: number; y: number }>();
  private readonly envelopes: MessageEnvelope[] = [];
  /** Lines due later (an exchange's next beats), in the order given. */
  private readonly due: Array<{ id: string; text: string; at: number; options: BubbleSayOptions }> = [];
  private now = 0;

  constructor(private readonly bounds: { width: number; height: number }, private readonly rand: () => number = Math.random) {
    this.container.sortableChildren = true;
    this.container.eventMode = 'none';
    this.screen.eventMode = 'none';
  }

  setThought(id: string, thought: BubbleThoughtIn | null): void {
    const active = this.get(id);
    active.thought = thought;
    this.gateOf(active);
    this.render(active);
  }

  /** Public prop API: show one temporary speech line, then restore the thought. */
  say(id: string, text: string, options: BubbleSayOptions = {}): void {
    if ((options.delay ?? 0) > 0) { this.due.push({ id, text, at: this.now + options.delay!, options: { ...options, delay: 0 } }); return; }
    const active = this.get(id);
    active.say = { text, until: this.now + Math.max(0, options.ttl ?? DEFAULT_SAY_MS), key: options.key };
    this.render(active);
  }

  /** Take a keyed speech line off early (its prop ended); any other line is left alone. */
  unsay(id: string, key: string): void {
    const active = this.thoughts.get(id);
    if (!active || !active.say || active.say.key !== key) return;
    active.say = null;
    this.render(active);
  }

  /** Public event-feed API for Crew-like bounded arrays. */
  consumeSays(events: readonly BubbleSay[], cursor: BubbleSayCursor): void {
    consumeSayEvents(events, cursor, (id, text, options) => this.say(id, text, options));
  }

  remove(id: string): void {
    const active = this.thoughts.get(id);
    for (let i = this.due.length - 1; i >= 0; i--) if (this.due[i].id === id) this.due.splice(i, 1);
    if (!active) return;
    active.bubble.destroy();
    this.thoughts.delete(id);
    this.anchors.delete(id);
  }

  /** Spawn an envelope using the latest feet anchors; unknown endpoints are ignored. */
  handoff(fromId: string, toId: string, act: MessageAct, needsHuman = false): void {
    if (this.envelopes.length >= MAX_ENVELOPES || fromId === toId) return;
    const from = this.anchors.get(fromId), to = this.anchors.get(toId);
    if (!from || !to) return;
    const envelope = new MessageEnvelope(from, to, act, needsHuman);
    this.container.addChild(envelope.container);
    this.envelopes.push(envelope);
  }

  /** Update positions and lifetimes. Must run even when station depth did not change. `view` is the
   *  world's transform on the stage this frame; anchors and the overlap pass stay in world px. */
  update(dt: number, anchors: readonly BubbleAnchor[], view: BubbleView): void {
    this.now += dt;
    for (let i = 0; i < this.due.length;) {
      const line = this.due[i];
      if (line.at > this.now) { i++; continue; }
      this.due.splice(i, 1);
      this.say(line.id, line.text, line.options);
    }
    this.anchors.clear();
    for (const anchor of anchors) this.anchors.set(anchor.id, anchor);

    const layouts: Array<{ active: ActiveThought; x: number; y: number; w: number; h: number; dx: number; anchor: { x: number; y: number } }> = [];
    for (const [id, active] of this.thoughts) {
      if (active.say && active.say.until <= this.now) { active.say = null; this.render(active); }
      if (this.gateOf(active)) this.render(active);
      const anchor = this.anchors.get(id);
      if (!anchor) { active.bubble.hide(); continue; }
      active.bubble.setBounds(this.bounds.width, this.bounds.height);
      active.bubble.setView(view);
      active.bubble.setLift(0);
      active.bubble.setPosition(anchor.x, anchor.y);
      const layout = active.bubble.getLayout(anchor.x, anchor.y);
      if (layout) layouts.push({ active, anchor, ...layout, dx: 0 });
    }

    // TES-BUBBLES-188: neighbours first push apart sideways, each only so far that it still hangs
    // over its own head; only what that cannot part is lifted. 1.1.87 lifted at once, so the clouds
    // of adjacent seats (Speck1/Speck2) towered over each other.
    for (let round = 0, moved = true; moved && round < SLIDE_ROUNDS; round++) {
      moved = false;
      for (let i = 0; i < layouts.length; i++) {
        for (let j = i + 1; j < layouts.length; j++) {
          const a = layouts[i], b = layouts[j];
          if (!(a.y < b.y + b.h + CLOUD_GAP && a.y + a.h + CLOUD_GAP > b.y)) continue;
          const [l, r] = a.x + a.dx + a.w / 2 <= b.x + b.dx + b.w / 2 ? [a, b] : [b, a];
          const need = l.x + l.dx + l.w + CLOUD_GAP - (r.x + r.dx);
          if (need <= 0) continue;
          const roomL = Math.max(0, l.w / 2 - SLIDE_KEEP + l.dx), roomR = Math.max(0, r.w / 2 - SLIDE_KEEP - r.dx);
          let toR = Math.min(need / 2, roomR);
          const toL = Math.min(need - toR, roomL);
          toR = Math.min(need - toL, roomR);
          if (toL > 0 || toR > 0) { l.dx -= toL; r.dx += toR; moved = true; }
        }
      }
    }

    layouts.sort((a, b) => (b.y + b.h) - (a.y + a.h) || a.x - b.x);
    const placed: Array<{ x: number; y: number; w: number; h: number }> = [];
    for (const item of layouts) {
      let y = item.y;
      for (let moved = true, guard = 0; moved && guard++ < 12;) {
        moved = false;
        for (const prior of placed) {
          const overlapX = item.x + item.dx < prior.x + prior.w + CLOUD_GAP && item.x + item.dx + item.w + CLOUD_GAP > prior.x;
          const overlapY = y < prior.y + prior.h + CLOUD_GAP && y + item.h + CLOUD_GAP > prior.y;
          if (overlapX && overlapY) { y = prior.y - item.h - CLOUD_GAP; moved = true; }
        }
      }
      item.active.bubble.setLift(item.y - y);
      item.active.bubble.setPosition(item.anchor.x, item.anchor.y, item.dx);
      placed.push({ x: item.x + item.dx, y, w: item.w, h: item.h });
    }

    for (const active of this.thoughts.values()) active.bubble.update(dt / 1000);
    for (let i = this.envelopes.length - 1; i >= 0; i--) {
      if (this.envelopes[i].update(dt / 1000)) {
        this.envelopes[i].destroy();
        this.envelopes.splice(i, 1);
      }
    }
  }

  destroy(): void {
    for (const active of this.thoughts.values()) active.bubble.destroy();
    for (const envelope of this.envelopes) envelope.destroy();
    this.thoughts.clear();
    this.envelopes.length = 0;
    this.container.destroy({ children: true });
    this.screen.destroy({ children: true });
  }

  private get(id: string): ActiveThought {
    let active = this.thoughts.get(id);
    if (active) return active;
    const bubble = new ThoughtBubble();
    this.screen.addChild(bubble.container);
    active = { bubble, thought: null, say: null, shown: null, gate: createCloudGate(), up: false };
    this.thoughts.set(id, active);
    return active;
  }

  /** Advance the cloud's gate; true when it opened or closed. */
  private gateOf(active: ActiveThought): boolean {
    const t = active.thought;
    // The thought itself is the gate's input (it has a status here): nothing is allocated per frame.
    const up = !t ? false : t.status === undefined ? true : cloudShows(active.gate, this.now, t as { status: string; text: string }, this.rand);
    if (up === active.up) return false;
    active.up = up;
    return true;
  }

  private render(active: ActiveThought): void {
    const next = active.say ? active.say.text : active.up ? active.thought?.text ?? null : null;
    if (next === active.shown) return;
    active.shown = next;
    if (next === null) active.bubble.startLinger(); // it fades, as on the office floor
    else active.bubble.show(next, active.say ? undefined : active.thought?.tool);
  }
}
