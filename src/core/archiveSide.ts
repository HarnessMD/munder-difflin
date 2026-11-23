/**
 * Which side this is, for the memory archive's names (src/shared/memoryShape.ts).
 * A hive with an old `sync.git` keeps its `-laptop` archives, or an agent would
 * start a second archive beside its first. One that never synced keeps the older
 * names. `sync.git` itself is left alone.
 */
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import { setArchiveSide, type ArchiveSide } from '../shared/memoryShape';

/** At start, before the condenser's first pass. */
export function adoptArchiveSide(side: ArchiveSide, gitDir: string): void {
  if (existsSync(join(gitDir, 'HEAD'))) setArchiveSide(side);
}
