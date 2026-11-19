/**
 * WHAT AN AGENT KNEW BEFORE THE APP CLEARED IT, written to its
 * last-session.md (0.5.6, shared/lastSession.ts). Main and the office both
 * write it here: the transcript is read a line at a time, only a line that can
 * hold a summary is parsed, and the file is replaced whole.
 *
 * An office writes it under a stricter rule (`strict`): the transcript must be
 * a plain file inside the engines' home and be read to its end, and the file
 * is written only inside the agent's own folder, never through a link.
 * Anything less writes nothing. The clear it follows never waits for it.
 */
import { createReadStream, lstatSync, realpathSync } from 'node:fs';
import { open, readFile, rename, unlink, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { createInterface as readLines } from 'node:readline';
import { HANDOFF_FILE } from '../shared/handoff';
import { LAST_SESSION_FILE, SummaryScan, earlierTranscripts, lastSessionText, type PendingSave } from '../shared/lastSession';

/** The agent's handoff.md, beside its inbox. Bare when the hive gives no inbox. */
export function handoffPathOf(inboxPath: string | null | undefined): string {
  return inboxPath ? path.join(path.dirname(inboxPath), HANDOFF_FILE) : HANDOFF_FILE;
}

/** The agent's last-session.md, beside its inbox. Bare when the hive gives no inbox. */
export function lastSessionPathOf(inboxPath: string | null | undefined): string {
  return inboxPath ? path.join(path.dirname(inboxPath), LAST_SESSION_FILE) : LAST_SESSION_FILE;
}

/** What one save wrote, for the hive's log. */
export interface LastSessionSaved { reason: PendingSave['reason']; summary: 'text' | 'unreadable' | 'none' }

/** The office's rule (see the head). */
export interface LastSessionStrict {
  /** The engines' home: the transcript must resolve inside it. */
  transcriptRoot: string;
}

const inside = (child: string, parent: string): boolean => {
  const rel = path.relative(parent, child);
  return rel !== '' && !rel.startsWith('..') && !path.isAbsolute(rel);
};

/** The real path of a plain file inside `root`, or null. */
function transcriptIn(file: string | undefined, root: string): string | null {
  if (!file || !path.isAbsolute(file)) return null;
  try {
    const real = realpathSync(file);
    return inside(real, realpathSync(root)) && lstatSync(real).isFile() ? real : null;
  } catch {
    return null;
  }
}

/**
 * Write last-session.md at `target`, an absolute path. Answers what was
 * written, or null when the rule wrote nothing; throws only when the write
 * itself fails.
 */
export async function saveLastSessionAt(target: string, save: PendingSave, strict?: LastSessionStrict): Promise<LastSessionSaved | null> {
  if (!path.isAbsolute(target)) return null;
  let transcript = save.transcriptPath;
  let file = target;
  if (strict) {
    const real = transcriptIn(transcript, strict.transcriptRoot);
    if (!real) return null;
    transcript = real;
    try {
      // The agent's folder itself is not a link, and what is at the name is a plain file or nothing.
      if (!lstatSync(path.dirname(target)).isDirectory()) return null;
      file = path.join(realpathSync(path.dirname(target)), path.basename(target));
      const st = lstatSync(file, { throwIfNoEntry: false });
      if (st && !st.isFile()) return null;
    } catch {
      return null;
    }
  }
  const clearedAt = new Date().toISOString();
  const scan = new SummaryScan();
  if (transcript) {
    try {
      const lines = readLines({ input: createReadStream(transcript, { encoding: 'utf8' }), crlfDelay: Number.POSITIVE_INFINITY });
      for await (const l of lines) scan.line(l);
    } catch {
      // A transcript that cannot be read still leaves its path; in an office, nothing is written.
      if (strict) return null;
    }
  }
  let earlier: string[] = [];
  try { earlier = earlierTranscripts(await readFile(file, 'utf8')); } catch { /* the first clear */ }
  const tmp = `${file}.${process.pid}.tmp`;
  const text = lastSessionText({ clearedAt, reason: save.reason, work: save.work, transcriptPath: transcript, summary: scan.latest, earlier });
  if (strict) {
    // Made new: a file or link left at this name is removed, never written through.
    await unlink(tmp).catch(() => undefined);
    const h = await open(tmp, 'wx', 0o600);
    try { await h.writeFile(text, 'utf8'); } finally { await h.close(); }
  } else {
    await writeFile(tmp, text, 'utf8');
  }
  await rename(tmp, file);
  return { reason: save.reason, summary: scan.latest ? (scan.latest.text.trim() ? 'text' : 'unreadable') : 'none' };
}
