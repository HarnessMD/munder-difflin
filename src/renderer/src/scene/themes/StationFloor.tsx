// Ported from Prozzta/guppyos 02d0d50b (MIT).
// The floor for a 'stations' theme pack: the pack's map, drawn as Tiled
// stacks it, with agents walking to their stations and sitting there, sorted
// in depth with rails, consoles and chairs. Everything it decides (paths,
// seats, depth) comes from the pure modules beside it; this file only draws.

import { useEffect, useRef, useState } from 'react';
import { Application, Container, Matrix, Rectangle, RenderTexture, Sprite, Texture } from 'pixi.js';
import 'pixi.js/unsafe-eval';
import { useStore, type Agent } from '@/store/store';
import { activityStatus, heavyActivity, type HeavyLockView } from '@shared/activityView';
import type { LivenessV1 } from '@shared/livenessV1';
import { Camera, watchDevicePixelRatio } from '../office/Camera';
import { installContextLossRecovery } from '../office/glRecovery';
import { applyFloorFrameBudget } from '../office/floorFrameBudget';
import { buildScenePlan, byDepth, chairOf, ownChairKey, personKey, seatPose, sideFit, type SortedItem } from './compositor';
import { Crew, sitDraw, WALK_SPEED, type CrewAgent, type Walker } from './crew';
import { seatRulesFrom } from './seatAllocator';
import type { LoadedPack } from './packs';
import { type Pixels } from './raster';
import { presetIdOf, readLook, resolveLook } from './looks';
import { lookColumn } from './lookArt';
import { teardownFloor } from './teardown';
import { exactPicker, frontPicker, hasVisiblePixel, sceneBounds, sceneScale, staticOrder, staticsCacheable, type Box } from './staticCache';
import { DamageTracker, deviceRect, type Drawn } from './damage';
import type { ThemeLooks } from './themeCatalog';
import { floorFrame } from './framing';
import { BubbleLayer } from './BubbleLayer';
import { PanelLayer } from './PanelLayer';
import { cloudAnchor, drawnSprite } from './cloudAnchor';
import { BridgeTalk, EXCHANGE_HOLD_MS, exchangeSays, seatRole, stationRoles, type Speaker } from './exchanges';
import { activityThought, createSayCursor, type BubbleSay } from './bubbleModel';
import { linePicker, type LinePicker } from './packLines';
import type { MessageAct } from '../office/MessageEnvelope';
import { coffeeProps, cupInHand, endedSays, freshSays, mugDepth, mugDx, mugPixels, pruneSaid, MUG_H, MUG_W, type CupPose } from './coffeeProps';

/** One walk step at the longest tick (onTick clamps dt to 80 ms): ownChairKey's reach toward an own approach spot. */
const OWN_SPOT_STEP = WALK_SPEED * 80;

function texture(px: Pixels): Texture {
  const cv = document.createElement('canvas');
  cv.width = px.width; cv.height = px.height;
  const g = cv.getContext('2d')!;
  g.putImageData(new ImageData(new Uint8ClampedArray(px.data), px.width, px.height), 0, 0);
  const t = Texture.from(cv);
  t.source.scaleMode = 'nearest';
  return t;
}

/** IDLE-MEANS-IDLE (1.1.87): as on the office floor, an idle agent with a heavy job in the background
 *  works at its station, and one queued for (or holding a reservation on) the heavy slot waits there:
 *  both are at their desks to the Crew, so neither starts a coffee run. */
function crewAgents(pack: LoadedPack, agents: Agent[], liveness: Readonly<Record<string, LivenessV1 | undefined>>, heavyLock?: HeavyLockView | null): CrewAgent[] {
  const b = pack.manifest.builder, id = pack.manifest.id;
  return agents.map((a) => ({ id: a.id, status: activityStatus(a.status, liveness[a.id], heavyActivity(a.id, heavyLock)), orchestrator: !!a.isGod, presetId: presetIdOf(b, a, id) }));
}

function crewSays(events: ReadonlyArray<{ kind: string; id: string; with?: string; at: number }>, line?: LinePicker,
  talk?: (id: string, other: string, key: string) => BubbleSay[] | null): BubbleSay[] {
  // Coffee lines (brew, sip) come from coffeeProps, once per coffee state, in the viewer's words.
  // TES-BUBBLES-188: with the pack's own lines, a chat is the viewer's gossip or cheer (said by the
  // one who started it) and an errand stop its errand or idle thought; these are the fallback.
  const lines: Record<string, string> = { chat: 'quick sync', errand: 'stepping away', gaveUp: 'back to work' };
  return events.flatMap((event) => {
    const key = `${event.kind}:${event.id}:${event.at}`;
    // TES-BUBBLES-188 b2: a chat plays one of the pack's exchanges, the two taking turns.
    const played = event.kind === 'chat' && event.with ? talk?.(event.id, event.with, key) : null;
    if (played) return played;
    // The viewer's errand thoughts, its idle thought one time in four (2 of 8), its gossip or cheer.
    const kinds = event.kind === 'chat' ? ['gossip', 'cheer']
      : event.kind === 'errand' ? ['water', 'window', 'dispenser', 'fridge', 'shelf', 'bin', 'idle', 'idle'] : null;
    const packed = kinds && line?.(kinds, key);
    if (packed) return [{ key, id: event.id, text: packed, ttl: 2600 }];
    const text = lines[event.kind];
    if (!text) return [];
    const own: BubbleSay = { key, id: event.id, text, ttl: event.kind === 'sip' ? 3000 : 2600 };
    if (event.kind !== 'chat' || !event.with) return [own];
    return [own, { ...own, key: `${key}:${event.with}`, id: event.with }];
  });
}

/** The Crew keeps a bounded, append-only event list. Do not re-project its old entries per frame. */
export function newerCrewEvents<T extends { at: number }>(events: readonly T[], lastAt: number): readonly T[] {
  const first = events.findIndex((event) => event.at > lastAt);
  return first < 0 ? [] : events.slice(first);
}

/** Remove a rendered person and its bubble together. Kept separate so departure is testable. */
export function removeDepartedSprites(
  sprites: Map<string, { sprite: { destroy(): void } }>,
  ids: ReadonlySet<string>,
  bubbles: Pick<BubbleLayer, 'remove'>
): void {
  for (const [id, s] of sprites) if (!ids.has(id)) { s.sprite.destroy(); sprites.delete(id); bubbles.remove(id); }
}

/** A thought can exist before (or without) a sprite, so it still needs its own departure path. */
export function removeUnrenderedBubbles(
  bubbleIds: Set<string>,
  sprites: ReadonlyMap<string, unknown>,
  ids: ReadonlySet<string>,
  bubbles: Pick<BubbleLayer, 'remove'>
): void {
  for (const id of bubbleIds) if (!ids.has(id) && !sprites.has(id)) { bubbles.remove(id); bubbleIds.delete(id); }
}

/** Wire the preload bridge once and return the matching unmount cleanup. */
export function bindHiveBubbles(app: unknown, bubbles: Pick<BubbleLayer, 'handoff' | 'destroy'>): () => void {
  const offMessage = window.cth.onHiveMessage
        ? window.cth.onHiveMessage((event) => {
        for (const target of event.targets) {
          bubbles.handoff(event.from, target === 'human' ? '__human__' : target, event.act as MessageAct, event.needsHuman);
        }
      })
    : () => { /* A stale preload bridge simply disables handoff animation. */ };
  (app as any).__offMessage = offMessage;
  (app as any).__bubbleLayer = bubbles;
  return () => {
    const a = app;
    try { (a as any).__offMessage?.(); } catch { /* noop */ }
    try { (a as any).__bubbleLayer?.destroy?.(); } catch { /* noop */ }
  };
}

/** No liveness feed or heavy lock reaches the window yet: each agent shows its own status. */
const NO_LIVENESS: Readonly<Record<string, LivenessV1 | undefined>> = {};

/** StationFloor's liveness-aware input for its shared thought-cloud layer. */
function bubbleThoughts(agents: Agent[], liveness: Readonly<Record<string, LivenessV1 | undefined>>, heavyLock?: HeavyLockView | null) {
  return agents.map((agent) => ({ id: agent.id, thought: activityThought(agent, liveness[agent.id], heavyActivity(agent.id, heavyLock)) }));
}

export function StationFloor({ pack }: { pack: LoadedPack }) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const appRef = useRef<Application | null>(null);
  const mountIdRef = useRef(0);
  const [glGeneration, setGlGeneration] = useState(0);
  const fullscreenAgentId = useStore((s) => s.fullscreenAgentId);
  const ideOpen = useStore((s) => s.ideOpen);
  const [docHidden, setDocHidden] = useState(() => document.hidden);
  useEffect(() => {
    const onVis = () => setDocHidden(document.hidden);
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);
  const paused = !!fullscreenAgentId || ideOpen || docHidden;
  const pausedRef = useRef(paused);
  useEffect(() => {
    pausedRef.current = paused;
    const ticker = appRef.current?.ticker;
    if (!ticker) return;
    if (paused) ticker.stop(); else ticker.start();
  }, [paused]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    while (host.firstChild) host.removeChild(host.firstChild);
    const mountId = ++mountIdRef.current;
    const app = new Application();
    appRef.current = app;
    const SM = pack.scene, R = pack.manifest.spriteRenderer, fw = R.frameWidth, fh = R.frameHeight;

    const init = async () => {
      await app.init({
        background: pack.manifest.palette.background,
        antialias: false,
        // PERF-FLOOR-FILL-188: the canvas keeps the last frame, so a frame redraws only what changed.
        preserveDrawingBuffer: true,
        roundPixels: true,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
        width: host.clientWidth || 800,
        height: host.clientHeight || 600,
      });
      if (mountIdRef.current !== mountId) { safeDestroy(app); return; }
      while (host.firstChild) host.removeChild(host.firstChild);
      host.appendChild(app.canvas);
      (app as any).__glRecovery = installContextLossRecovery(app.canvas, {
        onRebuild: () => { if (mountIdRef.current === mountId) setGlGeneration((n) => n + 1); },
        onGiveUp: () => { if (mountIdRef.current === mountId) host.appendChild(floorNote(GPU_LOST)); },
      });

      const world = new Container();
      const plan = buildScenePlan({ ...SM, store: pack.store });
      // Every texture made here is destroyed on unmount.
      const owned: Texture[] = [];
      const own = (px: Pixels) => { const t = texture(px); owned.push(t); return t; };
      const staticTex = plan.sorted.map((it) => (it.px ? own(it.px) : null));
      const staticSprite = (i: number) => {
        const it = plan.sorted[i], s = new Sprite(staticTex[i]!);
        s.position.set(it.x, it.y);
        s.alpha = it.opacity;
        return s;
      };
      const below = new Sprite(own(plan.below));
      const sortLayer = new Container();
      sortLayer.sortableChildren = true;
      const statics = plan.sorted.map((it, i) => {
        if (!it.px) return null;
        const s = staticSprite(i);
        sortLayer.addChild(s);
        return s;
      });

      // TES-FLOOR-WHOLE-188: the world has one cached static floor rather than composing a scene
      // texture every tick. TES's semantic fit displays that whole-pixel source through one linear
      // downscale; live people and only their possible front statics stay in depth order above it.
      // - the floor texture: 'below' and every static, at an integer scale k, rebuilt only when k
      //   changes; a semantic fit linearly downsamples it once at display size;
      // - over it, in depth order, the people, their cups, the parked mugs, and the statics that
      //   can cover one of them, drawn again exactly where the floor texture has them (exactPicker
      //   limits that redraw to statics that can overlap a person);
      // - 'above', then the bubbles.
      const bounds = sceneBounds(plan);
      const cached = bounds !== null && staticsCacheable(plan);
      const order = staticOrder(plan.sorted);
      const frame0 = floorFrame(pack.manifest.id, SM.PW, SM.PH);
      const pickFront = cached ? (frame0.fit ? exactPicker : frontPicker)(plan.sorted, order, plan.below.width, plan.below.height) : null;
      // As in the stage, the floor's transform is a child's, so its vertices are made the same way.
      const floorRoot = new Container();
      const floorWorld = floorRoot.addChild(new Container());
      const floorView = new Sprite();
      let floorRT: RenderTexture | null = null, floorK = 0;
      if (cached) {
        floorWorld.addChild(below);
        for (const i of order) if (staticTex[i]) floorWorld.addChild(staticSprite(i));
        world.addChild(floorView);
      } else world.addChild(new Sprite(below.texture));
      world.addChild(sortLayer);
      if (hasVisiblePixel(plan.above)) world.addChild(new Sprite(own(plan.above)));
      // PANEL-BLINK-188: the chair panels' lights, live over the cached map, each just in front of what draws it.
      const panelLayer = new PanelLayer(plan, SM, pack.manifest.stations.layer, own, sortLayer, world.addChild(new Container()));
      // Envelopes fly live above the people, in the world; the clouds hang over the world in an
      // unscaled layer on the stage, so their text is sharp at any fit (TES-BUBBLE-TAIL-SHARP-189).
      const bubbles = new BubbleLayer({ width: SM.PW, height: SM.PH });
      world.addChild(bubbles.container);
      (app as any).__bubbleLayer = bubbles;
      app.stage.addChild(world);
      app.stage.addChild(bubbles.screen);
      // TES-HULL M2: in a semantic fit, a static drawn again over a person is the floor texture's own
      // sampling of it, so it looks the same whether or not someone walks behind it (a nearest sprite
      // at the fractional scale was sharp over its own soft copy):
      // - its texels: drawn at the same integer k into a linear texture, with one transparent texel of
      //   margin, so its edge blends as in the floor;
      // - its texel grid: roundPixels moves every quad corner to a whole device px, the floor's too, so
      //   a quad of its own would sit up to half a device px off the floor's grid. Its quad is instead
      //   placed on whole device px, and its frame is read off the floor's rounded quad: each device px
      //   then samples the same point as the floor (outside the texture, clamped to the clear margin).
      let frontRTs: Array<RenderTexture | null> = [];
      let frontTex: Array<Texture | null> = [];
      let frontAt = '';
      const placeFront = (root: boolean) => {
        const b = bounds!, k = floorK, r = app.renderer.resolution, n = world.scale.x * r;
        const ox = world.x * r, oy = world.y * r;
        frontAt = `${ox},${oy},${n},${k},${root}`;
        // As the vertex shader rounds: x to the nearest px; y in the target's own direction (the
        // canvas is flipped), which differs only at an exact half.
        const rx = (x: number) => Math.floor(x + 0.5);
        const ry = (y: number) => (root ? Math.ceil(y - 0.5) : Math.floor(y + 0.5));
        const L = rx(ox + b.x * n), R = rx(ox + (b.x + b.w) * n), T = ry(oy + b.y * n), B = ry(oy + (b.y + b.h) * n);
        const ux = (R - L) / (b.w * k), uy = (B - T) / (b.h * k); // device px per floor texel
        for (const t of frontTex) t?.destroy(false);
        frontTex = statics.map((s, i) => {
          const rt = frontRTs[i];
          if (!s || !rt) return null;
          const it = plan.sorted[i], tx = (it.x - b.x) * k - 1, ty = (it.y - b.y) * k - 1;
          const X0 = Math.floor(L + tx * ux), X1 = Math.ceil(L + (tx + rt.width) * ux);
          const Y0 = Math.floor(T + ty * uy), Y1 = Math.ceil(T + (ty + rt.height) * uy);
          const fx = (X0 - L) / ux - tx, fy = (Y0 - T) / uy - ty;
          const t = new Texture({ source: rt.source, frame: new Rectangle(fx, fy, (X1 - X0) / ux, (Y1 - Y0) / uy) });
          s.texture = t;
          s.scale.set(ux / n, uy / n);
          s.position.set((X0 - ox) / n, (Y0 - oy) / n);
          return t;
        });
      };
      const buildFrontStatics = (k: number) => {
        for (const t of frontTex) t?.destroy(false);
        frontTex = [];
        for (const t of frontRTs) t?.destroy(true);
        frontRTs = statics.map((s, i) => {
          if (!s) return null;
          const tex = staticTex[i]!;
          const rt = RenderTexture.create({ width: tex.width * k + 2, height: tex.height * k + 2, resolution: 1, scaleMode: 'linear' });
          const root = new Container(), one = root.addChild(new Sprite(tex));
          one.scale.set(k); one.position.set(1, 1);
          app.renderer.render({ container: root, target: rt, clear: true });
          root.destroy({ children: true });
          return rt;
        });
        frontAt = '';
      };
      const buildFloor = (k: number) => {
        const b = bounds!;
        floorView.texture = Texture.EMPTY;
        floorRT?.destroy(true);
        floorRT = RenderTexture.create({ width: b.w * k, height: b.h * k, resolution: 1, scaleMode: frame0.fit ? 'linear' : 'nearest' });
        floorWorld.scale.set(k);
        floorWorld.position.set(-b.x * k, -b.y * k);
        app.renderer.render({ container: floorRoot, target: floorRT, clear: true });
        floorView.texture = floorRT;
        floorView.position.set(b.x, b.y);
        floorView.scale.set(1 / k);
        floorK = k;
        if (frame0.fit) buildFrontStatics(k);
        (app as any).__tesStaticCacheBuilds = ((app as any).__tesStaticCacheBuilds ?? 0) + 1;
      };
      // Per tick, after onTick: the floor texture's scale, and which statics are drawn again.
      const compose = () => {
        if (!cached) return;
        const k = sceneScale(world.scale.x * app.renderer.resolution, bounds!);
        if (k !== floorK) buildFloor(k);
        if (frame0.fit) {
          const r = app.renderer.resolution;
          if (frontAt !== `${world.x * r},${world.y * r},${world.scale.x * r},${floorK},true`) placeFront(true);
        }
        const near: Box[] = [];
        for (const s of sprites.values()) near.push({ x: s.sprite.x, y: s.sprite.y, w: fw, h: fh });
        for (const c of cups.values()) near.push({ x: c.sprite.x, y: c.sprite.y, w: MUG_W, h: MUG_H });
        for (const m of mugs.values()) near.push({ x: m.sprite.x, y: m.sprite.y, w: MUG_W, h: MUG_H });
        const front = pickFront!(near);
        statics.forEach((s, i) => { if (s) s.visible = front[i]; });
      };
      // PERF-FLOOR-FILL-188 (damage.ts): each frame draws again only the rects that the people, cups,
      // mugs, statics drawn again and bubbles left or entered; a change of view draws it all.
      const damage = new DamageTracker();
      let painted = 0, lastPaint: ReturnType<DamageTracker['frame']> = 'full';
      // The stage's own render (Pixi's tick, or anyone's app.render()) goes through paint; a render
      // to a texture or of another container is passed straight on.
      const realRender = app.renderer.render.bind(app.renderer) as (o: any) => void;
      const paint = () => {
        const r = app.renderer.resolution, W = app.canvas.width, H = app.canvas.height;
        painted += 1;
        const now = new Map<unknown, Drawn>();
        const rectOf = (c: Container) => (c.visible && c.renderable ? deviceRect(c.getBounds(), r, W, H) : null);
        // Everything drawn, generically: a sprite is signed by its texture and frame, world transform,
        // alpha, tint, blend and depth (and its ancestors' look and renderable); whatever else draws (a bubble's text and graphics) is
        // drawn again every frame. A hidden subtree drops out, so its old rects are drawn again.
        const at = new Matrix();
        const visit = (c: Container, look: string) => {
          if (!c.visible) return;
          if (c === bubbles.container || c === bubbles.screen) {
            for (const k of c.children) if (k.visible) now.set(k, { rect: rectOf(k), sig: String(painted) });
            return;
          }
          if (c instanceof Sprite) {
            const t = c.texture, fr = t.frame, m = c.getGlobalTransform(at);
            now.set(c, { rect: rectOf(c), sig: `${t.uid}|${fr.x},${fr.y},${fr.width},${fr.height}|${m.a},${m.b},${m.c},${m.d},${m.tx},${m.ty}|${look}|${c.alpha},${c.tint},${c.blendMode}|${c.zIndex}|${c.renderable}` });
          } else if (!c.children.length) now.set(c, { rect: rectOf(c), sig: String(painted) });
          for (const k of c.children) visit(k, `${look}|${c.alpha},${c.tint},${c.blendMode},${c.renderable}`);
        };
        visit(app.stage, '');
        const view = `${W}x${H}@${r}|${world.x},${world.y},${world.scale.x},${world.scale.y}|${floorK}`;
        const todo = cached ? damage.frame(view, now, [], W, H) : 'full';
        lastPaint = todo;
        if (todo === 'full') { realRender({ container: app.stage }); return; }
        if (!todo.length) return; // nothing changed: the canvas still holds the frame
        const gl = (app.renderer as any).gl as WebGL2RenderingContext;
        gl.enable(gl.SCISSOR_TEST);
        try {
          for (const p of todo) {
            gl.scissor(p.x, H - p.y - p.h, p.w, p.h);
            realRender({ container: app.stage, clear: true });
          }
        } finally { gl.disable(gl.SCISSOR_TEST); }
      };
      (app.renderer as any).render = (o: any) => ((o === app.stage || (o?.container === app.stage && !o.target)) ? paint() : realRender(o));
      // For the rendered tests (tes-floor-whole-188): the floor and what it is made of.
      if (cached) (app as any).__tesScene = { damage, get lastPaint() { return lastPaint; }, bounds, get k() { return floorK; }, get floor() { return floorRT; }, below: below.texture, floorRoot, floorView, sortLayer, statics, world, frame: frame0, mapW: SM.PW, mapH: SM.PH,
        get people() { return [...sprites.values(), ...cups.values(), ...mugs.values()].map((e) => e.sprite); },
        // TES-HULL M2: the statics' own textures and places; placeFront(root) places the front statics
        // for the canvas (true, as compose does) or for a render texture (false).
        staticTex, sortedAt: plan.sorted.map((it) => ({ x: it.x, y: it.y })), placeFront };
      // Freed on unmount before the app is destroyed, each step on its own (teardown.ts).
      (app as any).__free = [
        () => floorRT?.destroy(true),
        () => { for (const t of frontTex) t?.destroy(false); for (const t of frontRTs) t?.destroy(true); },
        () => floorRoot.destroy({ children: true }),
        () => { for (const t of owned) t.destroy(true); }, // read at unmount: textures made later are in it
      ];

      const sheetPx = pack.store.get(pack.sheet)!;
      const cols = Math.max(1, Math.floor(sheetPx.width / fw));
      const looks: ThemeLooks = { themeId: pack.manifest.id, label: pack.manifest.label, builder: pack.manifest.builder, sprite: R, columns: cols, sheet: sheetPx };
      // One texture per look (the body's column in the agent's colours), one frame texture per look and row.
      const lookTex = new Map<string, Texture>();
      const frames = new Map<string, Texture>();
      const lookOf = (a: Agent) => {
        const r = resolveLook(looks.builder, cols, readLook(a.appearanceByTheme?.[looks.themeId]), a.id);
        const key = [r.body.id, r.colors.skin, r.colors.shirt, r.colors.hair].join('|');
        if (!lookTex.has(key)) {
          const t = Texture.from(lookColumn(looks, r.body, r.colors));
          t.source.scaleMode = 'nearest';
          lookTex.set(key, t);
        }
        return { key, col: r.body.column };
      };
      const frame = (look: string, row: number) => {
        const k = `${look}:${row}`;
        let f = frames.get(k);
        if (!f) { f = new Texture({ source: lookTex.get(look)!.source, frame: new Rectangle(0, row * fh, fw, fh) }); frames.set(k, f); }
        return f;
      };
      const stand = { down: R.rows.down, up: R.rows.up, left: R.rows.left, right: R.rows.right };
      // COFFEE-NEVER-186: the viewer's mug, in the hand (anchored to the frame's hand pixels, read
      // off the pack's sheet) and parked at a station, sorted with what it stands on.
      const mugTex = { right: own(mugPixels(false)), left: own(mugPixels(true)) };
      const hands = new Map<string, CupPose | null>();
      const handOf = (col: number, dir: Walker['dir']) => {
        const k = `${col}|${dir}`;
        if (!hands.has(k)) hands.set(k, cupInHand(sheetPx, col * fw, stand[dir] * fh, fw, fh, dir));
        return hands.get(k)!;
      };
      const cups = new Map<string, { sprite: Sprite; back: boolean }>();
      const mugs = new Map<string, { sprite: Sprite; foot: number; rank: number }>();
      const said = new Map<string, string>();
      const sit = { down: R.rows.sitDown, up: R.rows.sitUp, left: R.rows.sitLeft, right: R.rows.sitRight };

      // TES-GUPPY-SETTLE: eased by time and landed exactly, so a slow frame rate cannot keep the
      // picture moving (and the cache off) for long.
      const camera = new Camera(world, { resolution: () => app.renderer.resolution });
      camera.setMapSize(SM.PW, SM.PH);
      // TES-GUPPY-FRAMING: fit the pack's art (centred, its dead bottom band clippable), not the whole map.
      camera.setFrame(frame0);
      camera.setViewSize(app.screen.width, app.screen.height);
      camera.fitToScreen();

      const cd = pack.manifest.coffee?.cooldown;
      const exchanges = pack.exchanges ?? [];
      const crew = new Crew(SM, seatRulesFrom(pack.manifest, SM.seatOrder.map((s) => s.name)), Math.random, {
        ...(cd ? { coffeeGap: [cd[0] * 1000, cd[1] * 1000] as [number, number] } : {}), ...(exchanges.length ? { chatHold: EXCHANGE_HOLD_MS } : {})
      });
      const sprites = new Map<string, { sprite: Sprite; col: number; look: string }>();
      const fits = new Map<string, number | null>();
      const chairs = new Map<string, SortedItem | null>(); // seat name -> its chair in the plan
      const chairFor = (seat: { name: string; x: number; y: number }): SortedItem | null => {
        if (!chairs.has(seat.name)) chairs.set(seat.name, chairOf(seat, plan.sorted));
        return chairs.get(seat.name)!;
      };
      const sayCursor = createSayCursor();
      const packLines = linePicker(pack.lines);
      // TES-BUBBLES-188 b2: the crew's exchanges, by station (the role of the seat they hold or last held).
      const held = stationRoles(pack.manifest.stations);
      const speaker = (p: Walker): Speaker => ({ id: p.id, role: seatRole(pack.manifest.stations, (p.seat ?? p.lastSeat)?.name) });
      const speakerOf = (id: string): Speaker => { const p = crew.walkers().find((w) => w.id === id); return p ? speaker(p) : { id, role: null }; };
      const talk = exchanges.length ? (id: string, other: string, key: string) => exchangeSays(exchanges, speakerOf(id), speakerOf(other), held, key) : undefined;
      const bridgeTalk = new BridgeTalk(exchanges, held, Math.random);
      const bridgeSpeakers = () => crew.walkers().filter((p) => !p.coffee).map(speaker);
      const bubbleIds = new Set<string>();
      const sync = () => {
        const { agents } = useStore.getState();
        crew.sync(crewAgents(pack, agents, NO_LIVENESS, null));
        const ids = new Set(agents.map((a) => a.id));
        const thoughts = new Map(bubbleThoughts(agents, NO_LIVENESS, null).map((item) => [item.id, item.thought]));
        removeUnrenderedBubbles(bubbleIds, sprites, ids, bubbles);
        removeDepartedSprites(sprites, ids, bubbles);
        for (const a of agents) {
          const thought = thoughts.get(a.id) ?? null;
          bubbles.setThought(a.id, thought ? { text: thought.text, tool: thought.tool, status: thought.status } : null);
          bubbleIds.add(a.id);
          const l = lookOf(a), have = sprites.get(a.id);
          if (have) { have.col = l.col; have.look = l.key; continue; } // a look edited in Add/Edit shows at once
          const sp = new Sprite(frame(l.key, R.rows.down));
          sp.eventMode = 'static';
          sp.cursor = 'pointer';
          sp.on('pointertap', (ev) => { ev.stopPropagation(); useStore.getState().select(a.id); });
          sortLayer.addChild(sp);
          sprites.set(a.id, { sprite: sp, col: l.col, look: l.key });
        }
      };
      sync();

      let clock = 0;
      // The camera's clock: the time between this floor's own ticks (the ticker's deltaMS is capped
      // at 100 ms, and under the frame budget it spans one display frame, not one floor tick).
      let lastTickAt = performance.now();
      let lastDepth: string | null = null;
      let lastCrewEventAt = -1;
      const place = (p: Walker, s: { sprite: Sprite; col: number; look: string }): { foot: number; rank: number; anchor: { x: number; y: number } } => {
        // seated or on the seat step (the only time feet are in a chair): posed and depth-sorted with that chair
        const sd = sitDraw(p), seat = sd ? sd.seat : null, dir = seat && !p.seated ? seat.facing : p.dir;
        const ch: SortedItem | null = seat ? chairFor(seat) : null;
        let pose = null;
        if (ch && seat) {
          let fit: number | null = null;
          if (dir === 'left' || dir === 'right') {
            const key = `${ch.chair!.o.gid}|${ch.chair!.B.w}x${ch.chair!.B.h}|${s.col}|${dir}`;
            if (!fits.has(key)) fits.set(key, sideFit(pack.store, ch.chair!.B, { sheet: sheetPx, sx: s.col * fw, sy: sit[dir] * fh, fw, fh }, dir));
            fit = fits.get(key)!;
          }
          pose = seatPose(ch, dir, fw, fh, fit);
        }
        s.sprite.texture = frame(s.look, (seat ? sit : stand)[dir]);
        // in a chair the step slides from standing on the approach spot to the seated pose; else as 1.1.88 bubbles draws it
        const slide = (st: NonNullable<typeof seat>, k: number): { x: number; y: number } => {
          const a = crew.SM.approach.get(st) ?? [st.x, st.y];
          const [sx, sy] = pose ? [pose.x - fw / 2, pose.y] : [st.x - fw / 2, st.y - fh], [ax, ay] = [a[0] - fw / 2, a[1] - fh];
          return { x: Math.round(ax + (sx - ax) * k), y: Math.round(ay + (sy - ay) * k) };
        };
        const drawn = seat && sd ? slide(seat, sd.k) : drawnSprite(p, pose, fw, fh, clock);
        s.sprite.position.set(drawn.x, drawn.y);
        // TES-BUBBLES-188: the cloud hangs from the sprite as drawn (the seat pose, or mid seat step), not the walker's point.
        // on (or a step from, arriving at) its own side seat's approach spot in the chair's art: in front of it, as the step draws it
        const spot = !seat && p.seat ? crew.SM.approach.get(p.seat) : undefined;
        const key = (spot ? ownChairKey(p, p.seat!.facing, chairFor(p.seat!), spot, OWN_SPOT_STEP) : null) ?? personKey(p.y, ch, pose);
        return { ...key, anchor: cloudAnchor(drawn, fw, fh) };
      };

      const onTick = (tk: { deltaMS: number }) => {
        const dt = Math.min(80, tk.deltaMS);
        clock += dt;
        crew.tick(dt);
        panelLayer.update(clock, crew.walkers());
        // The camera eases by all the time that passed, however long the frame took: a stalled
        // frame (the GPU busy for seconds) must not leave the camera behind.
        const now = performance.now();
        camera.update(Math.max(0, now - lastTickAt) / 1000);
        lastTickAt = now;
        const people: Array<{ foot: number; rank: number; sprite: Sprite; id: string }> = [];
        const anchors: Array<{ id: string; x: number; y: number }> = [];
        for (const p of crew.walkers()) {
          const s = sprites.get(p.id);
          if (s) {
            const { foot, rank, anchor } = place(p, s);
            people.push({ foot, rank, sprite: s.sprite, id: p.id });
            anchors.push({ id: p.id, ...anchor });
          }
        }
        if (SM.entrance) anchors.push({ id: '__human__', x: SM.entrance[0], y: SM.entrance[1] });
        const freshEvents = newerCrewEvents(crew.events, lastCrewEventAt);
        if (freshEvents.length) {
          bubbles.consumeSays(crewSays(freshEvents, packLines, talk), sayCursor);
          lastCrewEventAt = freshEvents[freshEvents.length - 1].at;
        }
        const bridgeSays = bridgeTalk.tick(dt, bridgeSpeakers); // the speakers are built only when a talk is due
        if (bridgeSays.length) bubbles.consumeSays(bridgeSays, sayCursor);
        const holding = new Set<string>(), parked = new Set<string>();
        const coffee = coffeeProps(crew, packLines);
        pruneSaid(said, crew.walkers().map((p) => p.id));
        for (const item of freshSays(coffee, said)) bubbles.say(item.id, item.text, { ttl: item.ttl, key: item.key });
        for (const [id, key] of endedSays(coffee, said)) bubbles.unsay(id, key);
        for (const item of coffee) {
          if (item.kind === 'say') continue;
          if (item.kind === 'cup') {
            const s = sprites.get(item.id), pose = s ? handOf(s.col, item.dir) : null;
            if (!s || !pose) continue;
            let c = cups.get(item.id);
            if (!c) { c = { sprite: sortLayer.addChild(new Sprite(mugTex.right)), back: false }; cups.set(item.id, c); }
            c.sprite.texture = pose.left ? mugTex.left : mugTex.right;
            c.sprite.position.set(s.sprite.x + pose.x + mugDx(pose.left), s.sprite.y + pose.y - MUG_H);
            c.back = pose.back;
            holding.add(item.id);
          } else {
            let m = mugs.get(item.owner);
            if (!m) { m = { sprite: sortLayer.addChild(new Sprite(mugTex.right)), foot: 0, rank: 0 }; mugs.set(item.owner, m); }
            if (m.sprite.x !== item.x + mugDx(false) || m.sprite.y !== item.y - MUG_H) {
              m.sprite.position.set(item.x + mugDx(false), item.y - MUG_H);
              Object.assign(m, mugDepth(item.x, item.y, plan.sorted));
            }
            parked.add(item.owner);
          }
        }
        for (const [id, c] of cups) if (!holding.has(id)) { c.sprite.destroy(); cups.delete(id); }
        for (const [id, m] of mugs) if (!parked.has(id)) { m.sprite.destroy(); mugs.delete(id); }
        // Keep these live even when the people/station depth is unchanged and the map is cached.
        bubbles.update(dt, anchors, { scale: world.scale.x, x: world.x, y: world.y, resolution: app.renderer.resolution });
        // The statics never move: the depth order changes only when a person's key (or the crew) does.
        const depth = people.map((q) => `${q.id}:${q.foot}:${q.rank}:${cups.get(q.id)?.back ?? '-'}`).join('|') + '#' + [...mugs].map(([id, m]) => `${id}:${m.foot}:${m.rank}`).join('|');
        if (depth === lastDepth) return;
        lastDepth = depth;
        const items: Array<{ foot: number; rank: number; sprite: Sprite | null; id?: string }> = plan.sorted.map((it, i) => ({ foot: it.foot, rank: it.rank, sprite: statics[i] }));
        for (const q of people) items.push(q);
        for (const m of mugs.values()) items.push(m);
        for (const q of panelLayer.sorted) items.push(q);
        items.sort(byDepth);
        items.forEach((it, i) => {
          if (!it.sprite) return;
          it.sprite.zIndex = i;
          // A mug in the hand: just in front of its person, or just behind when they face away.
          const c = it.id !== undefined ? cups.get(it.id) : undefined;
          if (c) c.sprite.zIndex = i + (c.back ? -0.5 : 0.5);
        });
      };
      app.ticker.add(onTick);
      // LAG-150, as OfficeFloor: rAF runs at the display rate (165 fps measured); the floor needs 30.
      applyFloorFrameBudget(app.ticker);
      // After onTick, so the scene is composed with this tick's people and depth order.
      app.ticker.add(compose);
      if (pausedRef.current) app.ticker.stop();

      let lastSelected: string | null = useStore.getState().selectedId;
      (app as any).__unsub = useStore.subscribe((s, prev) => {
        if (s.agents !== prev.agents) sync();
        if (s.selectedId !== lastSelected) {
          lastSelected = s.selectedId;
          const p = s.selectedId ? crew.get(s.selectedId) : undefined;
          if (p) camera.nudgeToward(p.x, p.y);
        }
      });
      (app as any).__disposeHiveBubbles = bindHiveBubbles(app, bubbles);
      const resize = new ResizeObserver((entries) => {
        for (const e of entries) {
          const { width, height } = e.contentRect;
          if (width === 0 || height === 0) continue;
          app.renderer?.resize(width, height);
          camera.setViewSize(width, height);
        }
      });
      resize.observe(host);
      (app as any).__resize = resize;
      // TES-WALL-RESIZE-LINES-187: the camera snaps to the renderer's device-pixel grid, so the
      // renderer follows a DPR change after mount (UI zoom, a monitor move), then the camera.
      (app as any).__dpr = watchDevicePixelRatio(window, (dpr) => {
        if (!app.renderer) return;
        app.renderer.resolution = dpr;
        const width = host.clientWidth, height = host.clientHeight;
        if (width === 0 || height === 0) return;
        app.renderer.resize(width, height);
        camera.setViewSize(width, height);
      });
    };

    // Guppy's floors do not retry a failed init (OfficeFloor does the same).
    init().catch((err) => {
      if (mountIdRef.current !== mountId) return;
      console.error('[StationFloor] init failed:', err);
      host.appendChild(floorNote('The floor failed to start:\n' + (err?.message || String(err))));
    });

    return () => {
      mountIdRef.current++;
      const a = appRef.current;
      if (a) {
        (a as any).__glRecovery?.();
        (a as any).__resize?.disconnect?.();
        try { (a as any).__dpr?.(); } catch { /* noop */ }
        try { (a as any).__unsub?.(); } catch { /* noop */ }
        try { (a as any).__disposeHiveBubbles?.(); } catch { /* noop */ }
        teardownFloor(a, (a as any).__free ?? []);
      }
      appRef.current = null;
      while (host.firstChild) host.removeChild(host.firstChild);
    };
  }, [pack, glGeneration]);

  return (
    <div
      ref={hostRef}
      style={{ width: '100%', height: '100%', boxShadow: 'var(--cth-panel-border)', overflow: 'hidden', imageRendering: 'pixelated', background: pack.manifest.palette.background }}
    />
  );
}

/** OfficeFloor's own words for a lost GPU context. */
const GPU_LOST =
  'The office floor lost its GPU context.\n\n' +
  'Too many terminals are using the GPU at once.\n' +
  'Close a few agent terminals, or restart the app, to bring it back.';

function floorNote(text: string): HTMLDivElement {
  const note = document.createElement('div');
  note.style.cssText =
    'position:absolute;inset:0;display:flex;align-items:center;justify-content:center;' +
    'padding:24px;color:#ffd0b5;font-family:monospace;font-size:13px;text-align:center;white-space:pre-wrap;';
  note.textContent = text;
  return note;
}
function safeDestroy(app: Application) {
  try { app.ticker?.stop(); } catch { /* noop */ }
  try { app.destroy(true, { children: true }); } catch { /* noop */ }
}
