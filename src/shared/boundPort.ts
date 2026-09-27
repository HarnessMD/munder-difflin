/**
 * The port a local server is REALLY on (0.5.3, the rest of bug 11).
 *
 * Since bug 11 a taken port is not fatal: the Slack event server, and now the
 * webhook server, move to a free one and the tunnel follows. Callers through
 * the tunnel never notice. A local tool pointed at http://localhost:3849 does,
 * and until now nothing on screen said the port had moved: Settings showed the
 * number from config. This is what main reports and how Settings words it.
 *
 * The configured number is never rewritten. A port taken for one session (an
 * older copy of the app still running) must not become the setting for good.
 */
export interface BoundPort {
  /** The port the server is bound to. Absent when it is not running. */
  port?: number;
  /** The configured port, present ONLY when it was taken and the server moved. */
  movedFrom?: number;
}

/** One sentence Settings shows: a key under `settings.connections`, with its numbers. */
export interface BoundPortLine { key: 'boundPort' | 'boundPortMoved'; port: number; from?: number; warn: boolean }

export function boundPortLines(b: BoundPort | null | undefined): BoundPortLine[] {
  if (!b || typeof b.port !== 'number' || !(b.port > 0)) return [];
  if (typeof b.movedFrom === 'number' && b.movedFrom !== b.port) {
    return [{ key: 'boundPortMoved', port: b.port, from: b.movedFrom, warn: true }];
  }
  return [{ key: 'boundPort', port: b.port, warn: false }];
}
