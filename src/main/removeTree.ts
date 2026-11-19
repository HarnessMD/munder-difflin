/**
 * Remove a folder and confirm it is gone (0.5.5, the reset path).
 *
 * `rmSync(dir, { recursive: true, force: true })` fails with ENOTEMPTY when a
 * process is still writing into the tree, and the reset only logged that. For
 * the hive the leftover is the worst kind: a partial `.git`, which the next
 * launch takes for a working repo (ensureHive skips `git init` when `.git`
 * exists), so every later commit fails. So: remove, check, try again a few
 * times, and when the folder still will not go, move it aside under a new name
 * so the path is free and the next launch starts a clean hive. Nothing is
 * deleted that the plain removal would not have deleted.
 */
import { existsSync, renameSync, rmSync } from 'node:fs';

export const REMOVE_TRIES = 5;
const REMOVE_WAIT_MS = 200;

export type RemoveResult = { gone: true; movedAside?: string } | { gone: false; error: string };

export async function removeTreeFully(
  dir: string,
  opts: { tries?: number; waitMs?: number; now?: () => number } = {}
): Promise<RemoveResult> {
  const tries = opts.tries ?? REMOVE_TRIES;
  const waitMs = opts.waitMs ?? REMOVE_WAIT_MS;
  let lastError = '';
  for (let i = 0; i < tries; i++) {
    try { rmSync(dir, { recursive: true, force: true, maxRetries: 2, retryDelay: 50 }); }
    catch (e) { lastError = e instanceof Error ? e.message : String(e); }
    if (!existsSync(dir)) return { gone: true };
    await new Promise((r) => setTimeout(r, waitMs));
  }
  const aside = `${dir}.removed-${(opts.now ?? Date.now)()}`;
  try {
    renameSync(dir, aside);
    try { rmSync(aside, { recursive: true, force: true }); } catch { /* it is out of the way; a person can delete it */ }
    return { gone: true, movedAside: aside };
  } catch (e) {
    return { gone: false, error: `${lastError}; move aside failed: ${e instanceof Error ? e.message : String(e)}` };
  }
}
