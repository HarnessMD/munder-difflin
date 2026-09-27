/**
 * Drop-to-attach, the window half. ONE implementation for every PRO composer
 * (5 Sep 2026: the room composer had it, the god terminal's composer and the
 * Agents grid's prompt bar had nothing, so dragging onto Michael's screen did
 * nothing at all and the founder read that as the feature being broken).
 *
 * Detection is window-level, not element hit-testing: the moment an external
 * drag that could carry files crosses the window, every mounted DropZone
 * lights as a full-size target over its composer, and window dragover is
 * preventDefault'ed so the WHOLE window is a legal drop target. Internal
 * HTML5 drags (task cards, agent chips) set neither 'Files' nor
 * 'text/uri-list' and never light it. dragenter/dragleave are depth-counted
 * because both fire for every child the drag crosses.
 *
 * THE DROP LANDS WHEREVER THE MOUSE IS, not where the zone glows — the lesson
 * of 5 Sep 2026, and why Classic "worked" while PRO seemed dead: Classic's
 * composer highlights exactly the box under the cursor, while PRO's zone
 * lights at the bottom of the screen and the person releases over the
 * terminal or the thread. So a mounted DropZone also takes any drop nobody
 * else claimed, via a BUBBLE-phase window listener: `defaultPrevented` is the
 * claim (the terminal's path-typing handler sets it, and so does this
 * overlay), and an unclaimed drop is resolved into this composer instead of
 * navigating the window to a file:// URL. Dropping anywhere attaches.
 *
 * The state clear on drop runs in a MICROTASK (capture listener): clearing
 * synchronously could unmount the overlay while the event is still
 * dispatching, and then its own onDrop never fires.
 *
 * The resolution chain, per file so one failure cannot cost the rest:
 *   1. webUtils path (try-wrapped: it can THROW for a promise-backed File);
 *   2. bytes persisted by main (drop:saveFile) when no path resolves;
 *   3. the drop's file:// uri-list when it carried no File objects at all;
 *   4. a refusal toast, on screen, when nothing was attachable.
 *
 * On the macOS screenshot bubble (Cmd Shift 5): it drags a FILE PROMISE, and
 * whether Chromium delivers the promised file is upstream weather we do not
 * control (crbug.com/978484 is the open question; electron#19624 was closed
 * pointing at it). Whatever Chromium hands over — a path, a pathless File
 * with bytes, a uri-list, or nothing — the chain above attaches it if it is
 * there at all, and the toast names the always-working paths if it is not.
 */
import { useEffect, useRef, useState, type DragEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { isAttachableDrag, pathsFromUriList, type DroppedAttachment } from '@shared/dropAttachments';
import { proToast } from './ui';

type Translate = (key: string) => string;

/**
 * Resolve one drop into attachments and hand them over, or say on screen that
 * nothing was attachable. dataTransfer is only readable during the event, so
 * every synchronous read happens before the async persist work starts.
 */
function resolveDrop(
  dt: globalThis.DataTransfer | null,
  onFiles: (files: DroppedAttachment[]) => void,
  t: Translate
): void {
  const fileList = Array.from(dt?.files ?? []);
  // Some sources populate items but not files: same event, second door.
  if (!fileList.length) {
    for (const it of Array.from(dt?.items ?? [])) {
      if (it.kind !== 'file') continue;
      const f = it.getAsFile();
      if (f) fileList.push(f);
    }
  }
  const uriFallback = pathsFromUriList(dt?.getData('text/uri-list'));
  void (async () => {
    const atts: DroppedAttachment[] = [];
    for (const f of fileList) {
      let path = '';
      try { path = window.cth.pathForFile(f); } catch { /* no path — persist bytes below */ }
      if (path) { atts.push({ path, name: f.name }); continue; }
      try {
        const bytes = new Uint8Array(await f.arrayBuffer());
        // Defensive read, same rule as SoloProBridge: a renderer that hot
        // reloaded past an old preload finds a hole, not a crash.
        const saved = typeof window.cth.saveDroppedFile === 'function'
          ? await window.cth.saveDroppedFile(f.name, bytes)
          : { ok: false as const, error: 'saveDroppedFile door missing: restart the dev app' };
        if (saved.ok) atts.push(saved.file);
        else console.warn('[composer] dropped file not persisted:', f.name, saved.error);
      } catch (err) { console.warn('[composer] dropped file unreadable:', f.name, err); }
    }
    const final = atts.length ? atts : uriFallback;
    if (final.length) onFiles(final);
    else {
      // The person aimed at a zone that said "drop to attach": a refusal is
      // said ON SCREEN, and it names the paths that always work.
      console.warn('[composer] drop carried nothing attachable');
      proToast(t('pro.room.dropNone'), { tone: 'bad' });
    }
  })();
}

/** True while an external drag that could carry files is over the window. */
export function useWindowFileDrag(): boolean {
  const [active, setActive] = useState(false);
  useEffect(() => {
    let depth = 0;
    const enter = (e: globalThis.DragEvent) => {
      if (!isAttachableDrag(e.dataTransfer?.types)) {
        // Diagnosable, never silent: when a source that should attach is
        // refused, the advertised types ARE the whole story.
        if (e.dataTransfer?.types?.length) {
          console.debug('[composer] drag refused, types:', Array.from(e.dataTransfer.types));
        }
        return;
      }
      depth += 1;
      setActive(true);
    };
    const over = (e: globalThis.DragEvent) => {
      if (!isAttachableDrag(e.dataTransfer?.types)) return;
      e.preventDefault();
    };
    const leave = () => {
      depth = Math.max(0, depth - 1);
      if (depth === 0) setActive(false);
    };
    // Capture, so a claimant that stops propagation still ends the drag state;
    // microtask, so the overlay is never unmounted mid-dispatch (its own
    // onDrop still has to fire). Never preventDefault here: defaultPrevented
    // is the claim signal the bubble-phase catch-all reads.
    const drop = () => {
      queueMicrotask(() => { depth = 0; setActive(false); });
    };
    window.addEventListener('dragenter', enter);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop, true);
    return () => {
      window.removeEventListener('dragenter', enter);
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop, true);
    };
  }, []);
  return active;
}

/**
 * The visible target. Render it INSIDE a `position: relative` composer root;
 * it overlays the whole composer while a file drag is over the window, and it
 * catches drops released ANYWHERE nobody else claimed. Every resolved
 * attachment goes to `onFiles` (the caller dedupes into its own state,
 * exactly as its paperclip does).
 */
export function DropZone({ onFiles }: { onFiles: (files: DroppedAttachment[]) => void }) {
  const { t } = useTranslation();
  const active = useWindowFileDrag();
  // Refs, so the window listener registered once always calls the live props.
  const onFilesRef = useRef(onFiles);
  onFilesRef.current = onFiles;
  const tRef = useRef(t);
  tRef.current = t;

  // The catch-all: see the header. Bubble phase, so it runs AFTER every
  // claimant; defaultPrevented is the claim.
  useEffect(() => {
    const catchAll = (e: globalThis.DragEvent) => {
      if (e.defaultPrevented) return;
      e.preventDefault();
      resolveDrop(e.dataTransfer, onFilesRef.current, tRef.current);
    };
    window.addEventListener('drop', catchAll);
    return () => window.removeEventListener('drop', catchAll);
  }, []);

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    resolveDrop(e.dataTransfer, onFiles, t);
  };

  if (!active) return null;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = 'copy'; }}
      onDrop={onDrop}
      style={{
        position: 'absolute', inset: 6, zIndex: 5,
        display: 'grid', placeItems: 'center',
        background: 'var(--cth-cream-50)', opacity: 0.97,
        border: '2px dashed var(--cth-accent-line)', borderRadius: 10,
        color: 'var(--cth-accent-text)', fontSize: 12, fontWeight: 600,
        letterSpacing: '0.06em', textTransform: 'uppercase'
      }}
    >
      {t('queueComposer.dropToAttach')}
    </div>
  );
}
