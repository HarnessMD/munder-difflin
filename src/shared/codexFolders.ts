/**
 * What the card over a held Codex agent's terminal shows, and what Settings lists for a start nobody had a card for.
 *
 * One entry per `.codex` folder Codex loads settings from, with the files it
 * loads there, relative to that folder: config.toml, hooks.json, then at most
 * 20 files across rules/, agents/ and hooks/ together ("rules/" or "rules"
 * when the folder cannot be read or is not a folder). `more` is how many files
 * of the three are not listed, 0 when none. In a linked worktree one OK covers
 * two entries: the worktree's own folder (config.toml, rules/, agents/) and
 * the main checkout's (config.toml for its hooks, hooks.json, hooks/). `files` may
 * be empty when a folder counts only to be safe (nothing could be read).
 * Main sends the card on `pty:codex-folders:<ptyId>` and answers
 * `codex:heldFolders`.
 */
export interface CodexFolderEntry { folder: string; files: string[]; more: number }

export interface CodexHeldState {
  folders: CodexFolderEntry[];
}

/** A folder waiting for the person's OK from a start with no card (a temp, a
 *  voice hire): `folder` is the OK key (spelled as in the main checkout), which
 *  `codex:allowWaitingFolder` takes; `loads` is what the card would show. */
export interface CodexWaitingFolder {
  folder: string;
  loads: CodexFolderEntry[];
}
