/**
 * THE LIST OF RECENT HARNESS CONFIGS, KEPT HONEST (0.5.3, bug 12; Cryt, 10 Sep
 * 2026, Windows). He deleted a config's folder and it was still offered at
 * launch. Nothing ever compared the remembered list with the disk, on any
 * platform, and clicking the dead row quietly made the folder again.
 *
 * Pure: the caller says what the disk says about each path, this decides what
 * stays. So a test needs no disk and no Windows.
 */

/** What the disk says about a remembered config folder. */
export type HiveProbe =
  /** The folder is there. */
  | 'present'
  /** The folder is gone and the folder that held it is still there: a person
   *  deleted it. This is the only answer that drops a row. */
  | 'deleted'
  /** The folder that held it is gone too: an unplugged drive, a network share
   *  that is down, a volume not mounted yet. Not evidence of anything, so the
   *  row stays and comes back to life when the drive does. */
  | 'unreachable';

/**
 * The recent list with deleted folders taken out. The current home is never
 * dropped here, whatever the disk says: the app is about to open it, and
 * opening is what creates a first run's folder.
 */
export function pruneDeletedHives(
  recent: readonly string[],
  current: string | undefined,
  probe: (path: string) => HiveProbe
): string[] {
  return recent.filter((h) => h === current || probe(h) !== 'deleted');
}

/**
 * The last folder of a path, for a row's title. Both separators, because a
 * Windows path has backslashes and splitting on "/" alone handed the whole
 * path back as the "name", so every row showed its path twice.
 */
export function hiveFolderName(path: string): string {
  return path.split(/[\\/]+/).filter(Boolean).pop() ?? path;
}
