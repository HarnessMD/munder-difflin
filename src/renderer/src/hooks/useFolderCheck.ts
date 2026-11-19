import { useEffect, useState } from 'react';

/** What a workspace folder picked in onboarding already is: a workspace (a
 *  notice: going on opens it as it is), a file (an error: no workspace can be
 *  made there), or nothing to say. */
export type FolderFinding = 'workspace' | 'file' | null;

/** The folder step says what it knows about the
 *  folder as soon as it is picked or typed. It used to be found only at the
 *  last step's Open workspace, which sent the person back to the folder step
 *  in red for something that is not an error. */
export function useFolderCheck(path: string): FolderFinding {
  const [found, setFound] = useState<{ path: string; finding: FolderFinding } | null>(null);
  useEffect(() => {
    const home = path.trim().replace(/[/\\]+$/, '');
    if (!home) { setFound(null); return; }
    let live = true;
    // A typed path is checked once the typing pauses, not on every key.
    const timer = setTimeout(() => {
      void (async () => {
        const self = await window.cth.statAbs(home).catch(() => null);
        let finding: FolderFinding = null;
        if (self?.exists && self.isFile) finding = 'file';
        else if (self?.exists && (await window.cth.statAbs(`${home}/hive/agents`).catch(() => null))?.exists === true) finding = 'workspace';
        if (live) setFound({ path, finding });
      })();
    }, 200);
    return () => { live = false; clearTimeout(timer); };
  }, [path]);
  // A finding about the last folder is never shown under a new one.
  return found && found.path === path ? found.finding : null;
}
