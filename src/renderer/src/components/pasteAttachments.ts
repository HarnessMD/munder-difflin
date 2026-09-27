/**
 * One paste handler for every message box (0.5.3, bug 8). It answers with the
 * attachments the paste carried, having already stopped the browser's own
 * paste when it took something, so a composer's handler is one line:
 *
 *   onPaste={(e) => { void attachmentsFromPaste(e).then(addFiles); }}
 */
import type { ClipboardEvent } from 'react';
import { pasteKind } from '@shared/pasteAttachments';

export interface PastedAttachment { path: string; name: string }

export async function attachmentsFromPaste(e: ClipboardEvent<HTMLElement>): Promise<PastedAttachment[]> {
  const data = e.clipboardData;
  const files = Array.from(data?.files ?? []);
  const kind = pasteKind(Array.from(data?.items ?? []).map((it) => ({ kind: it.kind, type: it.type })), files.length);
  if (kind === 'text') return [];
  if (kind === 'image') {
    // preventDefault has to happen before the first await, or the browser has
    // already pasted by the time this decides it should not.
    e.preventDefault();
    const res = await window.cth.saveClipboardImage();
    return res.ok ? [res.file] : [];
  }
  const atts = files.map((f) => ({ path: window.cth.pathForFile(f), name: f.name })).filter((a) => a.path);
  if (atts.length) e.preventDefault();
  return atts;
}
