/**
 * THE APP'S OFFICE HOST.
 *
 * What the office core (src/core/) gets from the Electron main process:
 * exactly what main handed the hive and the spawn before the move, through
 * the one interface in src/core/host.ts.
 */
import { app } from 'electron';
import type { OfficeHost } from '../core/host';
import { readConfig } from './config';

export function createElectronHost(wiring: {
  /** The window to push floor events to, or null when none is open. */
  liveWebContents: () => Electron.WebContents | null;
  /** A native toast, gated on the notifications setting (main's breakerToast). */
  notify: (title: string, body: string) => void;
}): OfficeHost {
  return {
    version: app.getVersion(),
    packaged: app.isPackaged,
    harnessHome: () => readConfig().harnessHome,
    readConfig,
    emit: (channel, payload) => {
      const wc = wiring.liveWebContents();
      if (!wc) return false;
      try { wc.send(channel, payload); return true; } catch { return false; }
    },
    notify: (title, body) => wiring.notify(title, body)
  };
}
