/**
 * NAMING A NEW FILE (0.4.9 phase 8).
 *
 * The IDE could open and edit and save, and the only way to MAKE a file was a
 * right click in the tree that handed whatever you typed straight to the
 * filesystem and printed whatever errno came back. `EEXIST: file already
 * exists, open '/Users/.../src/a.ts'` is not a sentence, and it is the one a
 * person sees at the exact moment they are least sure the app is doing what
 * they asked.
 *
 * So naming is decided HERE, before any IPC, and the four awkward cases each
 * get their own answer:
 *
 *   a name that already exists   the create IPC refuses (`wx`), and its refusal
 *                                is mapped back to a plain sentence. The panel
 *                                also warns BEFORE the click, from the folder
 *                                listing it already has, because a warning
 *                                after the fact is a failure with extra steps.
 *   a name with a slash          is a path, and that is useful. It is accepted,
 *                                the folder it lands in is shown, and a folder
 *                                that does not exist is named as the reason,
 *                                because `fs:createFile` never makes parents.
 *   a name with no extension     is fine. Dockerfile, Makefile, LICENSE and
 *                                every dotfile have none. It is a note, not an
 *                                error: the file will open as plain text.
 *   a folder you cannot write    is EACCES, and there is nothing the app can do
 *                                about it except say which folder and why.
 *
 * Everything in this file is pure so the test can assert on it. Nothing here
 * touches the filesystem: it decides what to ASK for, and `src/main/fs.ts`
 * remains the only thing that decides what is allowed.
 */

/** A reason the typed name cannot become a create request at all. */
export type NewNameProblem =
  | 'empty'
  | 'absolute'
  | 'traversal'
  | 'folderNotFile'
  | 'nullByte'
  | 'tooLong'
  | 'spacePadded';

/** Something true about an acceptable name that the person should still see. */
export type NewNameNote = 'noExtension' | 'nested' | 'hidden';

export interface NewNameOk {
  ok: true;
  /** Path relative to the WORKSPACE ROOT, ready for `fs:createFile`. */
  rel: string;
  /** Folder the file lands in, relative to the root. `''` is the root itself. */
  parentRel: string;
  /** Final path segment: the file's own name. */
  name: string;
  /** Folder segments typed into the name field, root-relative, outermost first.
   *  Empty unless the person typed a slash. */
  newDirs: string[];
  notes: NewNameNote[];
}

export type NewNameResult = NewNameOk | { ok: false; problem: NewNameProblem };

/** One path segment may not be longer than this on any filesystem we ship to. */
const MAX_SEGMENT = 255;
const MAX_REL = 1024;

/** Join a folder and a relative path the way every fs door here expects: no
 *  leading slash, no doubled separators, `''` meaning the root. */
export function joinRel(parentRel: string, rel: string): string {
  const a = parentRel.replace(/^\/+|\/+$/g, '');
  const b = rel.replace(/^\/+/, '');
  return a ? `${a}/${b}` : b;
}

/** The folder part of a root-relative path (`''` for something at the root). */
export function parentOfRel(rel: string): string {
  const i = rel.lastIndexOf('/');
  return i === -1 ? '' : rel.slice(0, i);
}

/** The last segment of a root-relative path. */
export function baseNameOfRel(rel: string): string {
  const i = rel.lastIndexOf('/');
  return i === -1 ? rel : rel.slice(i + 1);
}

/**
 * Decide what `input`, typed into the new file field while `parentRel` is the
 * selected folder, is asking for.
 *
 * Outer whitespace is trimmed (it is always a typo, and the fs layer refuses
 * it); whitespace INSIDE a segment is left alone, because `my notes.md` is a
 * real filename people type on purpose.
 */
export function checkNewFileName(parentRel: string, input: string): NewNameResult {
  const raw = typeof input === 'string' ? input.trim() : '';
  if (!raw) return { ok: false, problem: 'empty' };
  if (raw.includes('\0')) return { ok: false, problem: 'nullByte' };
  // A leading separator or a drive letter means the person is thinking in
  // absolute paths. The IDE only ever writes inside one workspace, so this is
  // refused by name rather than silently reinterpreted as relative.
  if (/^[/\\]/.test(raw) || /^[A-Za-z]:[/\\]/.test(raw)) return { ok: false, problem: 'absolute' };
  if (/[/\\]\s*$/.test(raw)) return { ok: false, problem: 'folderNotFile' };

  const parts = raw.split(/[/\\]/);
  if (parts.some((p) => p === '')) return { ok: false, problem: 'folderNotFile' };
  for (const p of parts) {
    if (p === '.' || p === '..') return { ok: false, problem: 'traversal' };
    if (p.trim() !== p) return { ok: false, problem: 'spacePadded' };
    if (p.length > MAX_SEGMENT) return { ok: false, problem: 'tooLong' };
  }

  const name = parts[parts.length - 1];
  const typedDirs = parts.slice(0, -1);
  const rel = joinRel(parentRel, parts.join('/'));
  if (rel.length > MAX_REL) return { ok: false, problem: 'tooLong' };

  // Each folder the slash implied, root relative, outermost first. The panel
  // creates them in this order before the file, because `fs:createFile` never
  // makes a parent for you.
  const newDirs: string[] = [];
  for (let i = 0; i < typedDirs.length; i++) {
    newDirs.push(joinRel(parentRel, typedDirs.slice(0, i + 1).join('/')));
  }

  const notes: NewNameNote[] = [];
  if (typedDirs.length) notes.push('nested');
  if (name.startsWith('.')) notes.push('hidden');
  // A LEADING dot is not an extension (`.env` has none, `.env.local` does), and
  // neither is a trailing one (`notes.` is a file called `notes.`).
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) notes.push('noExtension');

  return { ok: true, rel, parentRel: parentOfRel(rel), name, newDirs, notes };
}

/**
 * What went wrong on the other side of the IPC.
 *
 * `fs:createFile` and `fs:mkdir` answer with either their own short string
 * ('already exists', 'the folder above it does not exist', 'path escapes root')
 * or a raw errno message from Node. Both shapes land here and come out as one
 * of a fixed set of codes, so the panel can say a sentence a person wrote
 * instead of one the C library did.
 */
export type CreateErrorCode =
  | 'exists'
  | 'noParent'
  | 'permission'
  | 'readOnly'
  | 'outsideRoot'
  | 'nameRefused'
  | 'noSpace'
  | 'unknown';

export function explainCreateError(raw: string): CreateErrorCode {
  const s = typeof raw === 'string' ? raw : '';
  // Permission first: EACCES on a missing-looking path must not be reported as
  // "the folder is not there" when the folder is there and shut.
  if (/EACCES|EPERM|permission denied|operation not permitted/i.test(s)) return 'permission';
  if (/EROFS|read-only file system/i.test(s)) return 'readOnly';
  if (/ENOSPC|no space left/i.test(s)) return 'noSpace';
  if (/already exists|EEXIST/i.test(s)) return 'exists';
  if (/the folder above it does not exist|ENOENT|ENOTDIR/i.test(s)) return 'noParent';
  if (/path escapes root/i.test(s)) return 'outsideRoot';
  if (/^name /i.test(s) || /ENAMETOOLONG/i.test(s)) return 'nameRefused';
  return 'unknown';
}

/** i18n key per code. `unknown` has none on purpose: there is nothing honest to
 *  say about a message we did not recognise except the message itself. */
export const CREATE_ERROR_KEYS: Readonly<Record<Exclude<CreateErrorCode, 'unknown'>, string>> = {
  exists: 'ide.create.errExists',
  noParent: 'ide.create.errNoParent',
  permission: 'ide.create.errPermission',
  readOnly: 'ide.create.errReadOnly',
  outsideRoot: 'ide.create.errOutsideRoot',
  nameRefused: 'ide.create.errNameRefused',
  noSpace: 'ide.create.errNoSpace'
};

/** i18n key per refused name. */
export const NAME_PROBLEM_KEYS: Readonly<Record<NewNameProblem, string>> = {
  empty: 'ide.create.badEmpty',
  absolute: 'ide.create.badAbsolute',
  traversal: 'ide.create.badTraversal',
  folderNotFile: 'ide.create.badFolderNotFile',
  nullByte: 'ide.create.badNullByte',
  tooLong: 'ide.create.badTooLong',
  spacePadded: 'ide.create.badSpacePadded'
};

/** i18n key per note. */
export const NAME_NOTE_KEYS: Readonly<Record<NewNameNote, string>> = {
  noExtension: 'ide.create.noteNoExtension',
  nested: 'ide.create.noteNested',
  hidden: 'ide.create.noteHidden'
};
