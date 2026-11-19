/**
 * Dismiss all, the bulk step only (0.5.3). Import free so a test runs it
 * directly; askMeActions hands it the single Dismiss's own patch and the bulk
 * door (window.cth.hivePatchTasks).
 *
 * FOUNDER ON rc.4: "The dismiss all is not working as expected. It is doing it
 * one by one and then stopping midway. Instead, it should be doing it all at
 * once." The first version awaited the single Dismiss per card, in series, and
 * each one was a full rewrite of tasks.json plus a git commit in main. Now every
 * patch is built first and sent in ONE call, which main applies in one write.
 */

export interface BulkPatch<P> { id: string; patch: P }
export interface BulkReply { ok: boolean; applied?: readonly string[] }
export interface DismissAllResult {
  /** Questions dismissed. */
  dismissed: number;
  /** Questions that were meant to go and did not: still waiting. */
  failed: number;
}

/** Build a patch for every card with something to dismiss, send them all at
 *  once, and count from what main says it applied. A card with nothing open
 *  is not counted either way. A refused or thrown send fails them all, and
 *  never throws itself. */
export async function dismissAllAtOnce<T extends { id: string }, P>(
  tasks: readonly T[],
  patchFor: (task: T) => P | null,
  send: (patches: BulkPatch<P>[]) => Promise<BulkReply>
): Promise<DismissAllResult> {
  const patches: BulkPatch<P>[] = [];
  for (const task of tasks) {
    const patch = patchFor(task);
    if (patch) patches.push({ id: task.id, patch });
  }
  if (patches.length === 0) return { dismissed: 0, failed: 0 };
  let reply: BulkReply;
  try { reply = await send(patches); } catch { return { dismissed: 0, failed: patches.length }; }
  const applied = new Set(reply?.ok ? reply.applied ?? [] : []);
  const dismissed = patches.filter((p) => applied.has(p.id)).length;
  return { dismissed, failed: patches.length - dismissed };
}
