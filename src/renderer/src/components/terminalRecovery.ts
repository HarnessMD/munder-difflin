export interface TerminalRecoveryState {
  initialRedrawRequested: boolean;
  webglRecoveryPending: boolean;
}

export function createTerminalRecoveryState(): TerminalRecoveryState {
  return { initialRedrawRequested: false, webglRecoveryPending: false };
}

/** React key for one disposable xterm instance attached to a stable PTY id. */
export function terminalInstanceKey(ptyId: string, generation = 0): string {
  return `${ptyId}:${generation}`;
}

/** Accept output from the current string protocol and the short-lived replay
 * protocol so a renderer hot reload stays usable until the app next exits. */
export function normalizePtyChunk(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value && typeof value === 'object' && 'data' in value) {
    const data = (value as { data?: unknown }).data;
    if (typeof data === 'string') return data;
  }
  return '';
}

/** Request exactly one redraw after the renderer has subscribed to PTY output.
 *
 *  The latch is only set once the redraw has actually SUCCEEDED. It used to be
 *  set up front, before the fire-and-forget IPC resolved — so a redraw that
 *  failed or raced left a terminal that had already consumed its one chance,
 *  with no output to repaint it and no retry path. That is a blank pane with a
 *  perfectly healthy pty behind it. A refused or rejected redraw leaves the latch clear
 *  so the next attach tries again. */
export function requestInitialPtyRedraw(
  state: TerminalRecoveryState,
  requestRedraw: () => void | Promise<unknown>
): boolean {
  if (state.initialRedrawRequested) return false;
  // Set before awaiting so two attaches in the same tick can't both fire; a
  // failure clears it again below.
  state.initialRedrawRequested = true;
  try {
    const result = requestRedraw();
    if (result && typeof (result as Promise<unknown>).then === 'function') {
      void (result as Promise<unknown>).then((answer) => {
        // IPC reports a missing/replaced process as a resolved refusal, not a
        // rejected promise. A later attach must still be able to retry it.
        if (answer && typeof answer === 'object' && 'ok' in answer && answer.ok === false) {
          state.initialRedrawRequested = false;
        }
      }).catch(() => {
        state.initialRedrawRequested = false;
      });
    }
  } catch {
    state.initialRedrawRequested = false;
  }
  return true;
}

/** Wait two paint frames after WebGL disposal so the DOM renderer can repaint.
 *
 *  `recover` reports whether it actually repainted. When it could not (the host
 *  is detached or still unsized), the pending flag is cleared AND the caller
 *  keeps its needs-repaint marker, so a later attach can schedule another
 *  attempt. Clearing the flag unconditionally before the repaint was confirmed
 *  is what made the blank terminal recover "sometimes" — whether a later resize
 *  happened to rebuild the renderer was pure luck. */
export function scheduleWebglRecovery(
  state: TerminalRecoveryState,
  requestFrame: (cb: () => void) => void,
  recover: () => void
): boolean {
  if (state.webglRecoveryPending) return false;
  state.webglRecoveryPending = true;
  requestFrame(() => requestFrame(() => {
    state.webglRecoveryPending = false;
    recover();
  }));
  return true;
}
