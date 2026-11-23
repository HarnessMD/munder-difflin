/**
 * The shell's half of the start loader (bootSplash.ts). Mounted once in App's shell, beside BootClock. It
 * claims the loader for the shell (a layout effect, so App's after-commit check sees it in the same commit and does
 * not take the shell for a door), then notes the facts it can see from here:
 *   orchestrator  godStatus has left 'booting'
 *   board         the first read of the task ledger landed or failed (the read is shared, never a second one)
 *   screen        at once: the shell is its own screen
 * The roster fact is noted by store/bootGate.ts markReconciled. Whatever is missing at 10 s, the ceiling lets the
 * app show as it is.
 */
import { useEffect, useLayoutEffect } from 'react';
import { useStore } from '@/store/store';
import { refreshTaskLedger } from '@/store/taskLedger';
import { claimForShell, noteSplashFact } from './bootSplash';

export function BootSplashGate() {
  useLayoutEffect(claimForShell, []);
  const godStatus = useStore((s) => s.godStatus);
  useEffect(() => {
    if (godStatus !== 'booting') noteSplashFact('orchestrator');
  }, [godStatus]);
  useEffect(() => {
    void refreshTaskLedger().finally(() => noteSplashFact('board'));
    noteSplashFact('screen');
  }, []);
  return null;
}
