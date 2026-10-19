// Ported from Prozzta/guppyos 02d0d50b (MIT).
// PANEL-BLINK-188: the chair panels' lights on a stations floor (panels.ts decides, this draws).
// One small sprite per panel and owner, outside the static cache, sorted just in front of what
// draws its pixels (so a person in front covers the lights, as they cover the console). Each sprite
// swaps among at most 7 textures rastered once (5 working phases, idle, empty): no per-frame raster,
// and a texture changes only when its panel's 240 ms step or state does.

import { Sprite, type Container, type Texture } from 'pixi.js';
import type { ScenePlan } from './compositor';
import type { Pixels } from './raster';
import { findPanels, groupPixels, panelFrame, panelStates, type Panel, type PanelFrame, type PanelGroup, type PanelState } from './panels';

interface Light { panel: number; group: PanelGroup; sprite: Sprite; tex: Map<PanelFrame, Texture>; shown: PanelFrame | null; }

export class PanelLayer {
  readonly panels: Panel[];
  /** The overlays drawn by the sorted statics, for the floor's depth sort: just in front of their owner. */
  readonly sorted: Array<{ foot: number; rank: number; sprite: Sprite }> = [];
  private readonly lights: Light[] = [];
  private readonly states: PanelState[] = [];

  /** `own` makes a texture the floor destroys on unmount. Overlays of the layers under everyone go to the bottom
   *  of `sortLayer`; those over everyone into `aboveLayer` (drawn after the map's above sprite). */
  constructor(plan: ScenePlan, SM: Parameters<typeof findPanels>[0], stationsLayer: string,
    private readonly own: (px: Pixels) => Texture, sortLayer: Container, aboveLayer: Container) {
    this.panels = findPanels(SM, stationsLayer, plan);
    this.panels.forEach((pn, panel) => {
      for (const group of pn.groups) {
        const sprite = new Sprite();
        sprite.position.set(group.x, group.y);
        sprite.eventMode = 'none';
        if (group.owner === 'below') { sprite.zIndex = -1; sortLayer.addChild(sprite); }
        else if (group.owner === 'above') aboveLayer.addChild(sprite);
        else {
          const it = plan.sorted[group.owner];
          sortLayer.addChild(sprite);
          this.sorted.push({ foot: it.foot, rank: it.rank + 0.25, sprite });
        }
        this.lights.push({ panel, group, sprite, tex: new Map(), shown: null });
      }
    });
  }

  /** Per tick: each panel's state from the crew, and the frame its lights show at `clock` (floor ms). */
  update(clock: number, walkers: Parameters<typeof panelStates>[1]): void {
    if (!this.lights.length) return;
    panelStates(this.panels, walkers, this.states);
    for (const L of this.lights) {
      const f = panelFrame(this.states[L.panel], clock);
      if (f === L.shown) continue;
      let t = L.tex.get(f);
      if (!t) { t = this.own(groupPixels(L.group, f)); L.tex.set(f, t); } // each texture is made once, on first use
      L.sprite.texture = t;
      L.shown = f;
    }
  }
}
