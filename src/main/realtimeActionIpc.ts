/**
 * The voice actions' IPC. Its own file so the spine (realtimeActions.ts)
 * imports no Electron at all, while every registration here stays a literal
 * ipcMain.handle('name', ...) that the channel lists can see.
 */
import { ipcMain } from 'electron';
import { voiceAction, voiceCancel, voiceConfirm, type RealtimeActionDeps } from './realtimeActions';

/**
 * Wire the voice-action IPC. Called once from index.ts with the existing main fns.
 * Channels:
 *   realtime:action          {verb, ...args}  → ActionResult (soft runs now;
 *                                                destructive stages a pending)
 *   realtime:action:confirm  {phrase}         → ActionResult (commits the pending
 *                                                iff the distinct token matches)
 *   realtime:action:cancel   {}               → ActionResult (drops the pending)
 */
export function registerRealtimeActionIpc(deps: RealtimeActionDeps): void {
  ipcMain.handle('realtime:action', async (_evt, payload: unknown) => voiceAction(deps, payload));
  ipcMain.handle('realtime:action:confirm', async (_evt, payload: unknown) => voiceConfirm(deps, payload));
  ipcMain.handle('realtime:action:cancel', async () => voiceCancel());
}
