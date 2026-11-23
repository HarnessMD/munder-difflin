/**
 * WHERE THE OFFICE KEEPS ITS FILES.
 *
 * config.json and about twenty stores live in Electron's `userData` folder,
 * found with `app.getPath('userData')`. The app registers Electron's answer
 * once at start (src/main/electronPaths.ts, the first import of main).
 *
 * A module that needs the folder asks `officePaths()`; it never imports
 * electron for it. Asking before a host registered is a wiring fault and
 * says so, rather than guessing a folder and writing a second config there.
 */
export interface OfficePaths {
  /** The per user data folder: config.json, the stores, the logs. Read on
   *  every use, so a host may move it (a floor's own data dir). */
  userData(): string;
  /** A file or folder the program ships beside its code: `kg.cjs`,
   *  `kg-core.cjs`, `skills`, `md-slack-reply.cjs` (the Slack reply helper an
   *  agent runs). The app answers from its resources folder when packaged and
   *  from the repo in a dev run. */
  bundled(name: BundledName): string;
}

export type BundledName = 'kg.cjs' | 'kg-core.cjs' | 'skills' | 'models' | 'md-slack-reply.cjs';

let registered: OfficePaths | null = null;

/** Called once by the host at start, before anything reads the config. */
export function setOfficePaths(paths: OfficePaths | null): void {
  registered = paths;
}

export function officePaths(): OfficePaths {
  if (!registered) throw new Error('office paths are not set: the host must call setOfficePaths() before the config or a store is read');
  return registered;
}

