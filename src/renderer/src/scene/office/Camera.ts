import { Container } from 'pixi.js';
import { timeScaledLerp } from './easing';

// Simplified port of shahar061/the-office (office/engine/camera.ts).
// Phase targeting is dropped (we have no project phases); kept: fit-to-screen,
// map-edge clamping, smooth lerp, a manual focus(), and nudgeToward() used to
// pan toward the selected agent.

// Authored as a fraction of the remaining distance per frame, at REF_HZ.
const LERP_SPEED = 0.08;
// The rate that fraction was tuned against. Applied raw, a per-frame constant
// makes the camera's easing depend on the display: it converges twice as fast on
// a 120 Hz ProMotion panel as on a 60 Hz one, and would crawl the moment anything
// capped the frame rate. Converting it to the equivalent per-second decay (below)
// gives the same wall-clock easing at any rate.
const REF_HZ = 60;

export class Camera {
  private container: Container;
  private currentX = 0;
  private currentY = 0;
  private currentZoom = 1;
  private targetX = 0;
  private targetY = 0;
  private targetZoom = 1;
  private viewWidth = 960;
  private viewHeight = 800;
  private mapWidth = 640;
  private mapHeight = 480;
  // The part of the map that holds art; fitted and centred. The whole map unless setArt says less.
  private artX = 0;
  private artY = 0;
  private artW = 640;
  private artH = 480;
  private manualOverride = false;

  private nudgeOffsetX = 0;
  private nudgeOffsetY = 0;
  private nudgeElapsed = 0;
  private nudgeDuration = 0;
  private readonly nudgeStrength = 0.4;

  constructor(container: Container) {
    this.container = container;
  }

  setMapSize(width: number, height: number): void {
    this.mapWidth = width;
    this.mapHeight = height;
    this.artX = 0;
    this.artY = 0;
    this.artW = width;
    this.artH = height;
  }

  /** The art's box in map px (after setMapSize); clamped to the map. */
  setArt(x: number, y: number, w: number, h: number): void {
    this.artX = Math.max(0, x);
    this.artY = Math.max(0, y);
    this.artW = Math.min(w, this.mapWidth - this.artX);
    this.artH = Math.min(h, this.mapHeight - this.artY);
  }

  setViewSize(width: number, height: number): void {
    this.viewWidth = width;
    this.viewHeight = height;
    if (!this.manualOverride) this.fitToScreen();
  }

  private getMinZoom(): number {
    if (this.viewWidth === 0 || this.viewHeight === 0) return 1;
    return Math.min(this.viewWidth / this.artW, this.viewHeight / this.artH);
  }

  /** Fit the whole art to the viewport, centered. */
  fitToScreen(): void {
    this.manualOverride = false;
    this.targetX = this.artX + this.artW / 2;
    this.targetY = this.artY + this.artH / 2;
    this.targetZoom = this.getMinZoom();
  }

  /** Pan/zoom toward a world point (used when an agent is selected). */
  focusOn(worldX: number, worldY: number, zoom?: number): void {
    this.manualOverride = true;
    this.targetX = worldX;
    this.targetY = worldY;
    this.targetZoom = Math.max(this.getMinZoom(), Math.min(4, zoom ?? this.currentZoom));
  }

  /** A gentle, decaying pan toward a world point without taking manual control. */
  nudgeToward(worldX: number, worldY: number, duration = 1200): void {
    if (this.manualOverride) return;
    this.nudgeOffsetX = (worldX - this.targetX) * this.nudgeStrength;
    this.nudgeOffsetY = (worldY - this.targetY) * this.nudgeStrength;
    this.nudgeElapsed = 0;
    this.nudgeDuration = duration / 1000;
  }

  /** Be where the camera is going, at once: a paused floor draws one frame, and the 1.6 s ease of a new fit
   *  would leave that frame half way, zoomed out on a dark field (Kevin, b6j). */
  snapToTarget(): void {
    this.currentX = this.targetX;
    this.currentY = this.targetY;
    this.currentZoom = this.targetZoom;
    this.nudgeDuration = 0;
    this.nudgeOffsetX = 0;
    this.nudgeOffsetY = 0;
  }

  update(dt: number): void {
    // Same easing curve, expressed against elapsed time rather than frame count.
    // dt is clamped upstream by Pixi's minFPS, so a floor that was paused for an
    // hour resumes with k near 1 (the camera snaps to its target) rather than
    // jumping past it.
    const k = timeScaledLerp(LERP_SPEED, dt, REF_HZ);
    this.currentX += (this.targetX - this.currentX) * k;
    this.currentY += (this.targetY - this.currentY) * k;
    this.currentZoom += (this.targetZoom - this.currentZoom) * k;

    if (this.nudgeDuration > 0) {
      this.nudgeElapsed += dt;
      const t = Math.min(this.nudgeElapsed / this.nudgeDuration, 1);
      // The nudge adds a slice of its offset per frame, so it is scaled by the
      // frames dt stands for at REF_HZ, giving about the same push at any rate
      // (dt is clamped upstream by Pixi's minFPS).
      const ease = (1 - t) * dt * REF_HZ;
      this.currentX += this.nudgeOffsetX * ease;
      this.currentY += this.nudgeOffsetY * ease;
      if (t >= 1) {
        this.nudgeDuration = 0;
        this.nudgeOffsetX = 0;
        this.nudgeOffsetY = 0;
      }
    }

    this.container.scale.set(this.currentZoom);
    this.container.x = this.viewWidth / 2 - this.currentX * this.currentZoom;
    this.container.y = this.viewHeight / 2 - this.currentY * this.currentZoom;

    const z = this.currentZoom;
    const scaledW = this.artW * z;
    const scaledH = this.artH * z;
    if (scaledW <= this.viewWidth) {
      this.container.x = (this.viewWidth - scaledW) / 2 - this.artX * z;
    } else {
      this.container.x = Math.min(-this.artX * z, Math.max(this.viewWidth - (this.artX + this.artW) * z, this.container.x));
    }
    if (scaledH <= this.viewHeight) {
      this.container.y = (this.viewHeight - scaledH) / 2 - this.artY * z;
    } else {
      this.container.y = Math.min(-this.artY * z, Math.max(this.viewHeight - (this.artY + this.artH) * z, this.container.y));
    }
  }
}
