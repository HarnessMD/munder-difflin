/**
 * Drop-to-attach, the decision half. The PRO composer (pro/Composer.tsx) and
 * any future drop target share these two answers:
 *
 *   isFileDrag              — is this drag carrying OS files at all? Internal
 *                             HTML5 drags (an agent chip being reordered, a
 *                             task card moving between columns) also fire
 *                             dragover on whatever they cross, and a composer
 *                             that lights up "drop to attach" for a task card
 *                             is lying. Only a drag whose types include
 *                             'Files' may be accepted.
 *   collectDroppedAttachments — which of the dropped files become NEW
 *                             attachment chips? A file with no resolvable
 *                             path is useless to the agent (the message body
 *                             carries paths the agent Reads), and a path that
 *                             is already attached must not become a second
 *                             chip — same rule the paperclip picker applies.
 *
 * React-free on purpose: the DOM event handling stays in the component, the
 * filtering lives here where node:test can reach it.
 */

export interface DroppedAttachment {
  /** Absolute path on disk (webUtils.getPathForFile). '' when unresolvable. */
  path: string;
  name: string;
}

/** True when the drag carries OS files (dataTransfer.types includes 'Files'). */
export function isFileDrag(types: readonly string[] | null | undefined): boolean {
  return !!types && Array.prototype.includes.call(types, 'Files');
}

/**
 * True when the drag could yield attachments at all. Wider than isFileDrag:
 * some drag sources (a browser image, a file dragged out of another app that
 * only promises a URL) advertise 'text/uri-list' and not 'Files' during
 * dragover, and the founder's screenshot drag was dead because the gate only
 * accepted 'Files' (5 Sep 2026). Internal HTML5 drags (task cards, agent
 * chips) set neither, so they still never light the drop state.
 */
export function isAttachableDrag(types: readonly string[] | null | undefined): boolean {
  return isFileDrag(types) || (!!types && Array.prototype.includes.call(types, 'text/uri-list'));
}

/**
 * The fallback when a drop carried no File objects: file:// entries from its
 * 'text/uri-list', resolved to plain absolute paths. Non-file URLs (an http
 * image dragged from a browser) are skipped — the message body carries paths
 * the agent Reads, and a remote URL is not one.
 */
export function pathsFromUriList(uriList: string | null | undefined): DroppedAttachment[] {
  if (!uriList) return [];
  const out: DroppedAttachment[] = [];
  for (const line of uriList.split(/\r?\n/)) {
    const uri = line.trim();
    if (!uri || uri.startsWith('#') || !uri.startsWith('file://')) continue;
    try {
      const path = decodeURIComponent(new URL(uri).pathname);
      const name = path.split('/').filter(Boolean).pop() ?? path;
      if (path) out.push({ path, name });
    } catch { /* malformed line — skip it, keep the rest */ }
  }
  return out;
}

/**
 * The dropped files that should become new attachments: path resolved, not
 * already attached, and each path at most once even when the same file is
 * dropped twice in one gesture.
 */
export function collectDroppedAttachments(
  dropped: readonly DroppedAttachment[],
  existingPaths: readonly string[]
): DroppedAttachment[] {
  const seen = new Set(existingPaths);
  const fresh: DroppedAttachment[] = [];
  for (const f of dropped) {
    if (!f.path || seen.has(f.path)) continue;
    seen.add(f.path);
    fresh.push({ path: f.path, name: f.name });
  }
  return fresh;
}
