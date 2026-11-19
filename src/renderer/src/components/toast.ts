/**
 * The app's one transient line: a module store, so any handler can raise a
 * toast (`showToast('Copied')`) without a context. App mounts the one host
 * (ToastHost.tsx) in the overlay slot.
 */
/** `wrap`: the text is shown whole over several lines instead of cut to one.
 *  For a notice whose end matters (a fix to make); the rest stay one line. */
export interface Toast { id: number; text: string; tone: 'neutral' | 'ok' | 'bad'; action?: { label: string; run: () => void }; wrap?: boolean }

let toastList: Toast[] = [];
const toastSubs = new Set<() => void>();
let toastSeq = 0;
function emitToasts(next: Toast[]): void {
  toastList = next;
  toastSubs.forEach((f) => f());
}
/** `ms: 0` means the toast waits until it is answered or dismissed. */
export function showToast(text: string, opts: { tone?: Toast['tone']; action?: Toast['action']; ms?: number; wrap?: boolean } = {}): number {
  const id = ++toastSeq;
  emitToasts([...toastList, { id, text, tone: opts.tone ?? 'neutral', action: opts.action, ...(opts.wrap ? { wrap: true } : {}) }]);
  const ms = opts.ms ?? 4000;
  if (ms > 0) window.setTimeout(() => dismissToast(id), ms);
  return id;
}
export function toastShowing(id: number): boolean { return toastList.some((x) => x.id === id); }
export function dismissToast(id: number): void {
  if (!toastList.some((x) => x.id === id)) return;
  emitToasts(toastList.filter((x) => x.id !== id));
}
export function readToasts(): Toast[] { return toastList; }
export function subscribeToasts(cb: () => void): () => void {
  toastSubs.add(cb);
  return () => { toastSubs.delete(cb); };
}
