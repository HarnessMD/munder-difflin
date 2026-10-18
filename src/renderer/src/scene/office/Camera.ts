import { Container } from 'pixi.js';

// Simplified port of shahar061/the-office (office/engine/camera.ts).
// Phase targeting is dropped (we have no project phases); kept: fit-to-screen,
// map-edge clamping, smooth lerp, a manual focus(), and nudgeToward() used to
// pan toward the selected agent.

const LERP_SPEED = 0.08;

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
  private fitX = 0;
  private fitY = 0;
  private fitWidth = 640;
  private fitHeight = 480;
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
    this.fitX = 0; this.fitY = 0; this.fitWidth = width; this.fitHeight = height;
  }

  /** Optional authored action rectangle. The map remains rendered whole; only
   *  automatic fitting/clamping uses this tile-space-derived world rect. */
  setFitBounds(x: number, y: number, width: number, height: number): void {
    this.fitX = x; this.fitY = y; this.fitWidth = width; this.fitHeight = height;
  }

  setViewSize(width: number, height: number): void {
    this.viewWidth = width;
    this.viewHeight = height;
    if (!this.manualOverride) this.fitToScreen();
  }

  private getMinZoom(): number {
    if (this.viewWidth === 0 || this.viewHeight === 0) return 1;
    return Math.min(this.viewWidth / this.fitWidth, this.viewHeight / this.fitHeight);
  }

  /** Fit the whole map to the viewport, centered. */
  fitToScreen(): void {
    this.manualOverride = false;
    this.targetX = this.fitX + this.fitWidth / 2;
    this.targetY = this.fitY + this.fitHeight / 2;
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

  update(dt: number): void {
    this.currentX += (this.targetX - this.currentX) * LERP_SPEED;
    this.currentY += (this.targetY - this.currentY) * LERP_SPEED;
    this.currentZoom += (this.targetZoom - this.currentZoom) * LERP_SPEED;

    if (this.nudgeDuration > 0) {
      this.nudgeElapsed += dt;
      const t = Math.min(this.nudgeElapsed / this.nudgeDuration, 1);
      const ease = 1 - t;
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

    const scaledW = this.fitWidth * this.currentZoom;
    const scaledH = this.fitHeight * this.currentZoom;
    if (scaledW <= this.viewWidth) {
      this.container.x = (this.viewWidth - scaledW) / 2 - this.fitX * this.currentZoom;
    } else {
      this.container.x = Math.min(-this.fitX * this.currentZoom, Math.max(this.viewWidth - (this.fitX + this.fitWidth) * this.currentZoom, this.container.x));
    }
    if (scaledH <= this.viewHeight) {
      this.container.y = (this.viewHeight - scaledH) / 2 - this.fitY * this.currentZoom;
    } else {
      this.container.y = Math.min(-this.fitY * this.currentZoom, Math.max(this.viewHeight - (this.fitY + this.fitHeight) * this.currentZoom, this.container.y));
    }
  }
}
