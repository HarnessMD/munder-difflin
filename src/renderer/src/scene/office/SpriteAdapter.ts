import { Texture, Rectangle } from 'pixi.js';

export interface SpriteSheetConfig {
  frameWidth: number;          // pixel width of one frame (e.g. 16)
  frameHeight: number;         // pixel height of one frame (e.g. 32)
  walkRow: number;             // which 32px row holds the walk frames (e.g. 1)
  framesPerDirection: number;  // walk frames per direction in that row (e.g. 6)
}

/**
 * Maps a character walk sheet to the 3-row frame grid CharacterSprite
 * expects. Ported from shahar061/the-office (office/characters/SpriteAdapter.ts).
 *
 * A walk row packs 4 directions, each with `framesPerDirection` frames,
 * in the order: right, up, left, down.
 *
 * Output: 3 rows (down, up, right) each with 7 frames:
 *   [walk1, walk2, walk3, type1, type2, read1, read2]
 * Left is rendered by horizontally flipping the "right" row at draw time.
 * Type/read frames reuse the idle (first walk) frame — walk sheets have no desk anims.
 */
export class SpriteAdapter {
  private static readonly DIRECTION_GROUP = { down: 3, left: 2, up: 1, right: 0 };
  private static readonly OUTPUT_DIRECTIONS: Array<'down' | 'up' | 'right'> = ['down', 'up', 'right'];

  static extractFrames(sheetTexture: Texture, config: SpriteSheetConfig): Texture[][] {
    const { frameWidth, frameHeight, walkRow, framesPerDirection } = config;
    const output: Texture[][] = [];

    for (const dir of this.OUTPUT_DIRECTIONS) {
      const frames: Texture[] = [];
      const groupStart = this.DIRECTION_GROUP[dir] * framesPerDirection;

      // 3 walk frames sampled every other frame from the cycle
      for (let i = 0; i < framesPerDirection; i += 2) {
        const frame = new Rectangle(
          (groupStart + i) * frameWidth,
          walkRow * frameHeight,
          frameWidth,
          frameHeight,
        );
        frames.push(new Texture({ source: sheetTexture.source, frame }));
      }

      while (frames.length < 3) frames.push(frames[0]);

      const idleFrame = frames[0];
      frames.push(idleFrame, idleFrame, idleFrame, idleFrame);

      output.push(frames);
    }

    return output;
  }
}
