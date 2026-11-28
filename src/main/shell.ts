/**
 * shell.ts — turn one Bash `command` string into the set of commands it actually
 * runs and the set of paths it actually writes.
 *
 * WHY THIS EXISTS. A rule about Bash that reads the raw command string (a regex
 * anchored at `^` or after `;&|`, and nothing at all for paths) misses the disguised
 * forms of what it is meant to catch: `^mempalace (sync|repair)` matches none of
 * the five below. The rule is not wrong; the subject it matches is the wrong string.
 * `sudo mempalace sync`, `eval "mempalace repair"`, `M=mempalace; $M sync`,
 * `/usr/local/bin/mempalace repair` and `bash -c 'mempalace sync'` are all the
 * guarded command; `echo 'never run mempalace sync'` is not. No amount of regex on
 * the raw string separates those, because the distinction is syntactic. So the
 * command is parsed once and the rules match the RESULT.
 *
 * THE LEDGER, in comments below, is the record a rules engine keeps of what it saw:
 * what the parser could not read ends up there, so nothing here may carry an
 * argument value.
 *
 * WHAT THIS IS NOT. Not a shell. It does not implement globbing, arithmetic,
 * arrays, process substitution, functions, or `case`; it expands only the variables
 * it can see assigned in the same command. It is a normaliser whose job is to make
 * the common disguises collapse onto the plain form, and to be HONEST about the
 * ones it cannot: an unresolvable target is reported as unresolved rather than
 * silently dropped, so a caller that wants to fail closed can. Every function here
 * is total — it never throws, because the one rule that fails closed would turn a
 * parser bug into a floor-wide deny.
 *
 * WHAT IT DELIBERATELY UNDER-CLAIMS. `curl … | sh`, a command read from a file, a
 * path assembled at run time from something we cannot see: these parse to
 * something harmless and are not caught. That is the same posture as the rest of
 * the guardrail it serves — a salience aid against
 * disguise and forgetfulness, not a sandbox against a hostile agent.
 */
import { homedir } from 'node:os';
import { realpathSync } from 'node:fs';
import { isAbsolute, resolve, dirname, basename, sep } from 'node:path';

/**
 * Something in this command the parser could not pin down.
 *
 * `code` is a STABLE identifier, meant to be grepped and counted in the ledger — it
 * is part of this module's contract, so renaming one is a schema change.
 *
 * `detail` is a STRUCTURAL token only: a placeholder, a program or variable NAME, or
 * a path. Never an argument value. That line exists because these rows are written to
 * a file an operator reads, and a command's arguments carry file contents, tokens and
 * secrets — the same reason a log of tool calls should keep a digest of the input
 * rather than the input. A program name tells a reader what happened; its arguments do not need to.
 */
export type UnresolvedCode =
  /** An operand arrives on stdin we cannot read — `cat plan | xargs mempalace`. */
  | 'stdin_operand'
  /** A word is the OUTPUT of another command — `$(cat which) sync`. */
  | 'substitution_output'
  /** The program itself arrives on a pipe — `curl -s … | sh`. */
  | 'piped_program'
  /** The program is a file we do not read — `bash ./deploy.sh`, `source env.sh`. */
  | 'program_from_file'
  /** The command defines a name whose expansion we will never see — `alias gp=…`. */
  | 'alias_definition'
  /** A path still holds a variable we never saw assigned — `$AGENT_DIR/memory.md`. */
  | 'unexpanded_variable'
  /**
   * A RELATIVE target, and nobody told us which directory to resolve it against, so it
   * was resolved against this process's — which is not where the agent is standing. The
   * hook payload carries `cwd`; a caller that omits it silently gets the behaviour that
   * existed before it was threaded through, and this is what makes that visible instead.
   */
  | 'missing_cwd'
  /**
   * The verb destroys a checkout at a path it never names — `git clean -fdx`,
   * `git reset --hard`, `git checkout -- .`, `git restore`, `git worktree remove`.
   *
   * These are a known gap: what they delete is the repository the command is
   * standing in, which is an operand of no rule and a word in no argv, so no ownership
   * rule can reach them. That gap is accepted policy — but until this code existed the
   * parser reported them as fully read with zero writes, so the gap could not be sized
   * from the ledger either. This makes it countable without deciding anything about it.
   *
   * SCOPE: the five shapes in `destructiveGitVerb`'s table, and only those. A count of
   * these rows sizes THAT list, not destructive git in general — an operand we cannot
   * tell from a branch name (`git checkout somefile`) is still silent by design, so read
   * the number as a floor rather than a census.
   */
  | 'destructive_verb';

/**
 * Codes that mean the command's STRUCTURE may be wrong — we could not see which program
 * runs or which operands it gets — as opposed to codes that mean one PATH's value is a
 * guess (`unexpanded_variable`, `missing_cwd`), where the parse itself is sound.
 *
 * The difference decides whether a caller may fall back to reasoning about the whole
 * command string. It is load-bearing: when `missing_cwd` was first added, every ordinary
 * `cp a b` with no cwd looked structurally unreadable, which re-armed a whole-string
 * heuristic and reintroduced a false positive that had already been fixed once.
 */
export const STRUCTURAL_UNRESOLVED: ReadonlySet<UnresolvedCode> = new Set<UnresolvedCode>([
  'stdin_operand', 'substitution_output', 'piped_program', 'program_from_file', 'alias_definition',
]);

export interface Unresolved {
  code: UnresolvedCode;
  /** A placeholder, program name, variable name or path — never an argument value. */
  detail: string;
}

/** One command the Bash call would actually run. */
export interface EffectiveCommand {
  /** argv after prefix stripping, basename-ing of argv[0] and variable expansion. */
  argv: string[];
  /** argv rejoined, words containing whitespace re-quoted. What `command_matches` sees. */
  text: string;
  /** Absolute paths this command writes. Directory targets keep a trailing `/`. */
  writes: string[];
  /**
   * The subset of `writes` attributable to the command's own VERB, as opposed to a
   * redirection. A caller falling back to a string heuristic needs this: a bare
   * `> /dev/null` means the parser resolved a path, not that it understood the verb,
   * and treating the two the same turned "append a harmless redirect" into a way past
   * the self-protection heuristic.
   */
  verbWrites: string[];
  /**
   * Absolute paths this command MUTATES BY TAKING THEM AWAY — `mv`'s sources, and the
   * file a hard link is made to. Not in `writes`, because for an ownership rule the
   * interesting question is where a write LANDS; but `mv <dir>/f /tmp/` empties `<dir>`
   * just as surely as writing into it: move a rules file aside and every rule in it
   * stops applying.
   */
  removes: string[];
  /** What this command hides from us. Meant to be logged and counted, not enforced on. */
  unresolved: Unresolved[];
}

/** Guards against a pathological command turning one hook call into a hang. */
const MAX_DEPTH = 6;
const MAX_COMMANDS = 200;

/**
 * Prefixes that wrap another command without changing which command it is, and the
 * flags of each that swallow the next word.
 *
 * The value table is the whole point: skipping flags but not their arguments buries
 * the real command one word deeper, so `sudo -u alice mempalace sync` parses as
 * `alice mempalace sync` — a command name no rule describes, with no write
 * targets. `sudo -u` is the ordinary spelling of sudo, so that is not an edge case:
 * it defeated all three rules at once, and `cp` buried that way contributed nothing
 * for path_glob to judge.
 *
 * `firstOperandIsFile` is for `script`, whose typescript file sits between the flags
 * and the command it records.
 */
const TRANSPARENT: Record<string, { values: Set<string>; firstOperandIsFile?: boolean }> = {
  sudo: { values: new Set(['-u', '-g', '-U', '-p', '-C', '-h', '-r', '-t', '-T', '--user', '--group', '--prompt', '--close-from', '--host', '--role', '--type']) },
  doas: { values: new Set(['-a', '-C', '-u']) },
  nohup: { values: new Set() },
  command: { values: new Set() },
  exec: { values: new Set(['-a']) },
  time: { values: new Set(['-o', '-f', '--output', '--format']) },
  nice: { values: new Set(['-n', '--adjustment']) },
  ionice: { values: new Set(['-c', '-n', '-p', '-P', '--class', '--classdata', '--pid']) },
  stdbuf: { values: new Set(['-i', '-o', '-e', '--input', '--output', '--error']) },
  setsid: { values: new Set() },
  caffeinate: { values: new Set(['-t', '-w']) },
  script: { values: new Set(['-F', '-t', '-T', '--command', '--logfile']), firstOperandIsFile: true },
};

/** Shell keywords that may lead a segment once `;`/newline splitting is done. */
const KEYWORDS = new Set(['do', 'done', 'then', 'else', 'elif', 'fi', 'esac', 'in', '!', '{', '}']);

/**
 * Homebrew's GNU coreutils on macOS install as `gsed`, `gcp`, … — the same verbs under
 * a different basename, so a table keyed on the name misses every one of them.
 */
const BASENAME_ALIAS: Record<string, string> = {
  gsed: 'sed', gcp: 'cp', gmv: 'mv', grm: 'rm', gln: 'ln', ginstall: 'install',
  gtar: 'tar', gtouch: 'touch', gmkdir: 'mkdir', gchmod: 'chmod', gchown: 'chown',
  gtruncate: 'truncate', gdd: 'dd', gtee: 'tee', grmdir: 'rmdir', gshred: 'shred',
};

/**
 * Verbs whose SOURCE operands are mutated, not merely read.
 *
 * `mv` removes what it moves; a HARD link (`ln` with no `-s`) makes a second name for
 * the same inode, and a write through that name is invisible to a rule looking at the
 * original path. `cp`, `tar` and `zip` are absent on purpose — reading a file to copy it
 * elsewhere IS a read, which is why copying the rules out stays allowed.
 *
 * A SYMLINK is absent too, and that is a correction: `ln -s <other agent>/memory.md
 * <mine>/their-notes` was denied, and it is the ordinary way to keep a handle on
 * something you are READING. The write-through worry it was covering is already handled
 * at the right moment — `realAbsolute` resolves symlinks, so a later `echo x >
 * <mine>/their-notes` normalises onto the real path and is denied at WRITE time.
 * Covering it again at link time bought nothing and cost a read.
 */
const SOURCE_MUTATED = new Set(['mv', 'ln']);

/** In-place editors: a `-i` flag turns the operands into targets, exactly like sed. */
const IN_PLACE_EDITORS = new Set(['sed', 'perl', 'ruby']);

/** `cp a b` — the LAST operand is the destination, every earlier one is a source. */
const LAST_ARG_DEST = new Set(['cp', 'mv', 'rsync', 'ln', 'install', 'scp', 'rclone', 'ditto']);

/** Unpackers whose destination is a `-C`/`-d` directory rather than an operand. */
const DEST_FLAG: Record<string, { flags: string[]; needsExtract: boolean }> = {
  tar: { flags: ['-C', '--directory'], needsExtract: true },
  bsdtar: { flags: ['-C', '--directory'], needsExtract: true },
  unzip: { flags: ['-d'], needsExtract: false },
};

/** Every operand is a target: these verbs only ever mutate what they are given. */
const ALL_ARGS_TARGET = new Set([
  'rm', 'rmdir', 'unlink', 'touch', 'mkdir', 'truncate', 'shred',
  'chmod', 'chown', 'chgrp', 'tee', 'gzip', 'gunzip',
]);

/** Archivers whose FIRST operand is the archive and the rest are sources being read.
 *  `zip` sat in ALL_ARGS_TARGET, so `zip -r /tmp/backup.zip <other>/results` counted
 *  a read-only archive of someone else's folder as a write to it. */
const ARCHIVE_FIRST_ARG = new Set(['zip', 'jar']);

/**
 * `-t DIR` / `--target-directory=DIR` inverts the coreutils copiers: the destination
 * comes first, as a flag value, and EVERY operand is a source. Both readings were
 * wrong — `cp -t <other>/results mine.md` was allowed, and `cp -t mine/ <other>/a.md
 * <other>/b.md` was DENIED because the last source was read as the destination.
 *
 * Only the coreutils verbs: rsync's `-t` means "preserve times", so reading it as a
 * destination would invent a target out of a source.
 */
const TARGET_DIR_VERBS = new Set(['cp', 'mv', 'ln', 'install']);
const TARGET_DIR_FLAGS = ['-t', '--target-directory'];

/** Interpreters that take a program on the command line instead of a file. */
const SHELL_DASH_C = new Set(['sh', 'bash', 'zsh', 'dash', 'ksh', 'fish']);
const INLINE_SCRIPT: Record<string, string[]> = {
  node: ['-e', '--eval', '-p', '--print'],
  python: ['-c'], python2: ['-c'], python3: ['-c'],
  perl: ['-e', '-E'], ruby: ['-e'], php: ['-r'], deno: ['eval'], bun: ['-e'],
};

/**
 * Ways an inline script hands a string back to a shell, so the string is parsed as a
 * command. Every name here is unambiguous ON PURPOSE. A bare `exec` also names
 * `RegExp.prototype.exec`, so `/a/.exec('mempalace sync')` was read as an invocation
 * and denied; a bare `spawn` or `system` has the same problem. The cost of naming
 * only the unmistakable ones is a miss, which is the direction to err.
 */
const EXEC_API = /(?:os\.system|os\.popen|subprocess\.(?:run|call|check_call|check_output|Popen)|child_process\.(?:exec|execFile|spawn)|execSync|execFileSync|spawnSync)\s*\(\s*(?:\[\s*)?(['"])((?:(?!\1).)*)\1/g;

/**
 * Write calls in an inline script, and WHICH argument each one targets.
 *
 * Harvesting every path literal in a script that wrote anywhere was wrong in both
 * directions: `writeFileSync(mine, readFileSync(theirs))` counted the file being READ
 * as a write, and `stdout.write(readFileSync(theirs))` counted a print as a write at
 * all — a read of another agent's folder denied by a rule whose own reason says
 * reading it is fine. So the target is taken from the call that names it: argument 1
 * for a call that writes its first argument, argument 2 for a copy or a rename.
 */
const INLINE_WRITE_CALLS: Array<{ re: RegExp; arg: 1 | 2; needsWriteMode?: boolean }> = [
  { re: /^(?:.*\.)?(?:writeFileSync|writeFile|appendFileSync|appendFile|createWriteStream|truncateSync|truncate|unlinkSync|unlink|rmSync|rmdirSync|mkdirSync|mkdir|makedirs|remove)$/, arg: 1 },
  { re: /^(?:.*\.)?(?:copyFileSync|copyFile|copyfile|renameSync|rename|replace|cpSync|linkSync|symlinkSync|copy|copy2|move)$/, arg: 2 },
  // `open(path, 'w')` writes; `open(path)` and `open(path, 'r')` read.
  { re: /^(?:.*\.)?open$/, arg: 1, needsWriteMode: true },
];

/**
 * `$(echo WORD)` and `` `echo WORD` `` resolved textually, before tokenising.
 *
 * The output of a substitution is normally unknowable without running it, and this
 * parser never runs anything — which is why `$(cat which_agent)` is on the residual
 * list and stays there. `echo` with literal arguments is the one exception: its
 * output is provably its arguments, so `$(echo mempalace) sync` IS `mempalace sync`.
 * Narrow on purpose: no flags (`echo -n` changes the output), and nothing containing
 * `$`, a backtick or a paren, so nothing is resolved that we cannot see all of.
 * Other substitutions are untouched and still recursed into as commands.
 */
function resolveEcho(src: string): string {
  let out = src;
  for (let pass = 0; pass < 3; pass++) {
    const next = out
      .replace(/\$\(\s*echo\s+([^()$`]*?)\s*\)/g, (m, args) => (args.startsWith('-') ? m : args))
      .replace(/`\s*echo\s+([^`$()]*?)\s*`/g, (m, args) => (args.startsWith('-') ? m : args));
    if (next === out) break;
    out = next;
  }
  return out;
}

/** Tokenise, with the one substitution we can resolve without running it. */
function prepare(src: string): Tok[] {
  return tokenise(resolveEcho(src));
}

type Tok = { t: 'word'; v: string; q: boolean; subs: string[] } | { t: 'op'; v: string };

/**
 * Tokenise, tracking quoting so that a MENTION of a command inside a string stays
 * one word. Heredoc BODIES are consumed and discarded: they are data, and the
 * single largest source of false positives on the raw string was a guarded phrase
 * sitting in a heredoc or an echo.
 */
function tokenise(src: string): Tok[] {
  const out: Tok[] = [];
  let word = '';
  let quoted = false;
  let started = false;
  const subs: string[] = [];
  const pendingHeredocs: Array<{ delim: string; strip: boolean }> = [];

  const flush = () => {
    if (started) out.push({ t: 'word', v: word, q: quoted, subs: subs.slice() });
    word = ''; quoted = false; started = false; subs.length = 0;
  };
  const op = (v: string) => { flush(); out.push({ t: 'op', v }); };

  let i = 0;
  while (i < src.length) {
    const c = src[i];

    if (c === '\n' && pendingHeredocs.length) {
      // Swallow every queued heredoc body before resuming.
      op('\n');
      i++;
      while (pendingHeredocs.length) {
        const { delim, strip } = pendingHeredocs.shift()!;
        for (;;) {
          const nl = src.indexOf('\n', i);
          const line = src.slice(i, nl === -1 ? src.length : nl);
          i = nl === -1 ? src.length : nl + 1;
          if ((strip ? line.trim() : line) === delim || nl === -1) break;
        }
      }
      continue;
    }

    if (c === '\\' && i + 1 < src.length) {
      // A backslash-newline is a line continuation, not a character.
      if (src[i + 1] === '\n') { i += 2; continue; }
      started = true; word += src[i + 1]; i += 2; continue;
    }
    if (c === "'") {
      started = true; quoted = true;
      const end = src.indexOf("'", i + 1);
      word += src.slice(i + 1, end === -1 ? src.length : end);
      i = end === -1 ? src.length : end + 1;
      continue;
    }
    if (c === '"') {
      started = true; quoted = true;
      i++;
      while (i < src.length && src[i] !== '"') {
        if (src[i] === '\\' && i + 1 < src.length) { word += src[i + 1]; i += 2; continue; }
        if (src[i] === '$' && src[i + 1] === '(') { const [body, next] = readBalanced(src, i + 2, '(', ')'); subs.push(body); i = next; continue; }
        if (src[i] === '`') { const end = src.indexOf('`', i + 1); subs.push(src.slice(i + 1, end === -1 ? src.length : end)); i = end === -1 ? src.length : end + 1; continue; }
        word += src[i]; i++;
      }
      i++;
      continue;
    }
    if (c === '$' && src[i + 1] === '(') { started = true; const [body, next] = readBalanced(src, i + 2, '(', ')'); subs.push(body); i = next; continue; }
    if (c === '`') { started = true; const end = src.indexOf('`', i + 1); subs.push(src.slice(i + 1, end === -1 ? src.length : end)); i = end === -1 ? src.length : end + 1; continue; }

    // A comment at word start runs to the end of the line. Left in, its words land in
    // the preceding command's argv, which is both wrong and a way to feed tokens into
    // whatever string a rule matches.
    if (c === '#' && !started) {
      const nl = src.indexOf('\n', i);
      i = nl === -1 ? src.length : nl; // stop AT the newline: it is still a separator
      continue;
    }
    if (c === ' ' || c === '\t' || c === '\r') { flush(); i++; continue; }
    if (c === '\n') { op('\n'); i++; continue; }
    if (c === ';') { op(src[i + 1] === ';' ? ';;' : ';'); i += src[i + 1] === ';' ? 2 : 1; continue; }
    if (c === '&') {
      if (src[i + 1] === '&') { op('&&'); i += 2; continue; }
      if (src[i + 1] === '>') { const two = src[i + 2] === '>'; op('>'); i += two ? 3 : 2; continue; }
      op('&'); i++; continue;
    }
    if (c === '|') { op(src[i + 1] === '|' ? '||' : '|'); i += src[i + 1] === '|' ? 2 : 1; continue; }
    if (c === '(' || c === ')') { op(c); i++; continue; }
    if (c === '{' || c === '}') {
      // Only a standalone brace is a group; `{}` inside a word (xargs) is a word.
      const alone = !started && (i + 1 >= src.length || /[\s;&|]/.test(src[i + 1] ?? ' '));
      if (alone) { op(c); i++; continue; }
      started = true; word += c; i++; continue;
    }
    if (c === '<') {
      if (src.startsWith('<<<', i)) { op('<<<'); i += 3; continue; }
      if (src.startsWith('<<', i)) {
        const strip = src[i + 2] === '-';
        i += strip ? 3 : 2;
        while (src[i] === ' ' || src[i] === '\t') i++;
        let delim = '';
        while (i < src.length && !/[\s;&|<>]/.test(src[i])) { if (src[i] !== '"' && src[i] !== "'") delim += src[i]; i++; }
        pendingHeredocs.push({ delim, strip });
        continue;
      }
      op('<'); i++; continue;
    }
    if (c === '>') {
      // A leading fd number belongs to the redirection, not to the next word.
      if (/^\d+$/.test(word) && started) { word = ''; started = false; }
      if (src[i + 1] === '>') { op('>>'); i += 2; continue; }
      op(src[i + 1] === '|' ? '>' : '>'); i += src[i + 1] === '|' ? 2 : 1; continue;
    }
    started = true; word += c; i++;
  }
  flush();
  while (pendingHeredocs.length) pendingHeredocs.pop();
  return out;
}

/**
 * Skip a wrapper's flags, consuming the value of any flag that takes one.
 *
 * Shared by every wrapper branch on purpose. The bug this replaces was in four places
 * at once: one branch got a value table and its siblings kept `while (startsWith('-'))
 * i++`, so `env -u HOME`, `timeout -s KILL` and `xargs -L 1` each buried the real
 * command one word deeper. Order matters too — a long `--flag=value` must not stop the
 * scan, which is what let `sudo --preserve-env=PATH -u root mempalace sync` through.
 */
function skipFlags(argv: string[], from: number, values: Set<string>): number {
  let i = from;
  while (i < argv.length) {
    const a = argv[i];
    if (a === '--') return i + 1; // explicit end of options
    if (!a.startsWith('-') || a === '-') break;
    if (!a.includes('=') && values.has(a)) i++; // `-u root` — the user is not the command
    i++;
  }
  return i;
}

/** Read to the matching close, honouring nesting. Returns [body, indexAfterClose]. */
function readBalanced(src: string, from: number, open: string, close: string): [string, number] {
  let depth = 1;
  let i = from;
  for (; i < src.length; i++) {
    if (src[i] === open) depth++;
    else if (src[i] === close) { depth--; if (!depth) break; }
  }
  return [src.slice(from, i), i + 1];
}

interface Ctx {
  env: Map<string, string>;
  cwd: string;
  /** False when the caller gave us no cwd, so a relative path is a guess. */
  cwdKnown: boolean;
  depth: number;
  out: EffectiveCommand[];
  /** The command on the LEFT of a `|` feeding this one, when it was recorded. Lets
   *  `find <dir> | xargs rm` know what xargs is being handed. Never inherited. */
  pipeIn?: EffectiveCommand | null;
}

/**
 * Names taken from this process's environment when a command does not assign them.
 *
 * Deliberately a fixed list of machine-wide ones. The app's own environment is NOT
 * the agent shell's: expanding an arbitrary `$AGENT_DIR` or `$HIVE_ROOT` from here
 * would substitute a value the command never had and judge a path nobody wrote.
 * These six are the same for every process of this user, so using them is reading
 * the same variable the shell would.
 */
const AMBIENT = ['HOME', 'TMPDIR', 'TMP', 'TEMP', 'USER', 'LOGNAME'];

/** Flags that swallow the next word, so its value is not mistaken for an operand. */
const VALUE_FLAGS: Record<string, Set<string>> = {
  sed: new Set(['-e', '-f', '-l', '--expression', '--file']),
  install: new Set(['-m', '-o', '-g', '--mode', '--owner', '--group']),
  rsync: new Set(['--exclude', '--include', '--files-from', '-e']),
  tee: new Set(['--output-error']),
};

/** `env`'s own flags that swallow a value (`-u NAME` unsets it, `-C DIR` chdirs). */
const ENV_VALUE_FLAGS = new Set(['-u', '--unset', '-C', '--chdir', '-S', '--split-string']);

/** `timeout`'s flags that swallow a value, ahead of the DURATION operand. */
const TIMEOUT_VALUE_FLAGS = new Set(['-s', '--signal', '-k', '--kill-after']);

/** `xargs` flags that swallow a value. `-a FILE` means the operands come from a file
 *  we do not read, which leaves them as unresolved as a pipe does. */
const XARGS_VALUE_FLAGS = new Set([
  '-n', '-P', '-d', '-s', '-L', '-E', '-a', '-e',
  '--max-args', '--max-procs', '--delimiter', '--max-chars', '--max-lines', '--eof', '--arg-file',
]);

/** Operands that are not paths: chmod's mode, chown's owner. */
const SKIP_FIRST_OPERAND = new Set(['chmod', 'chown', 'chgrp']);

/** Expand `~`, `$NAME` and `${NAME}` from what we have seen assigned. Unknown names
 *  are left as written: an unset variable silently becoming '' would turn
 *  `rm -rf "$DIR"/x` into a different path than the one the rule should judge. */
function expand(word: string, env: Map<string, string>): string {
  let out = word.replace(/\$\{(\w+)\}|\$(\w+)/g, (m, a, b) => {
    const name = a ?? b;
    const v = env.get(name) ?? (AMBIENT.includes(name) ? process.env[name] : undefined);
    return v === undefined ? m : v;
  });
  if (out === '~') out = homedir();
  else if (out.startsWith('~/')) out = homedir() + out.slice(1);
  return out;
}

/** Single-quote a word that contains whitespace, so rejoining argv cannot invent a
 *  command boundary that was not there — `grep -n 'mempalace sync' f` must not read
 *  as a `mempalace sync` invocation. */
function requote(w: string): string {
  return /[\s]/.test(w) || w === '' ? `'${w.split("'").join("'\\''")}'` : w;
}

/** Absolute, symlink-resolved form, keeping a trailing `/` to mean "inside here".
 *  Resolves the longest existing prefix so a path that does not exist yet (the
 *  usual case for a write) still normalises through any symlinked parent. */
export function realAbsolute(p: string, cwd: string): string {
  const trailing = /[/\\]$/.test(p);
  let abs = isAbsolute(p) ? resolve(p) : resolve(cwd, p);
  const parts: string[] = [];
  let probe = abs;
  for (let i = 0; i < 64; i++) {
    try { probe = realpathSync(probe); break; } catch { /* does not exist yet */ }
    const parent = dirname(probe);
    if (parent === probe) break;
    parts.unshift(basename(probe));
    probe = parent;
  }
  abs = parts.length ? resolve(probe, ...parts) : probe;
  const fwd = sep === '\\' ? abs.replace(/\\/g, '/') : abs;
  return trailing && !fwd.endsWith('/') ? fwd + '/' : fwd;
}

/**
 * Parse one Bash command string into the commands it runs.
 *
 * Returns at most MAX_COMMANDS entries. When parsing yields nothing at all the raw
 * string is handed back as a single command, so a caller's regex still has a
 * subject — degrading to the old behaviour rather than to "no command at all".
 */
export function effectiveCommands(command: string, cwd?: string): EffectiveCommand[] {
  const ctx: Ctx = { env: new Map(), cwd: cwd || process.cwd(), cwdKnown: !!cwd, depth: 0, out: [] };
  try {
    walk(prepare(command), ctx);
  } catch {
    // Total by contract: a parser bug must not reach a rule with on_error: deny.
  }
  if (!ctx.out.length) {
    const argv = command.trim().split(/\s+/).filter(Boolean);
    return [{ argv, text: command.trim(), writes: [], verbWrites: [], removes: [], unresolved: [] as Unresolved[] }];
  }
  return ctx.out;
}

/** Split a token stream on control operators and dispatch each simple command. */
function walk(toks: Tok[], ctx: Ctx): void {
  if (ctx.depth > MAX_DEPTH) return;
  let seg: Tok[] = [];
  let piped = false;
  let last: EffectiveCommand | null = null;
  const flush = () => {
    if (seg.length) {
      const before = ctx.out.length;
      ctx.pipeIn = piped ? last : null;
      simple(seg, ctx);
      ctx.pipeIn = null;
      last = ctx.out.length > before ? ctx.out[ctx.out.length - 1] : null;
    }
    seg = [];
  };
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === 'op' && (t.v === '(' || t.v === '{')) {
      const close = t.v === '(' ? ')' : '}';
      let depth = 1, j = i + 1;
      for (; j < toks.length; j++) {
        const u = toks[j];
        if (u.t === 'op' && u.v === t.v) depth++;
        else if (u.t === 'op' && u.v === close) { depth--; if (!depth) break; }
      }
      flush();
      walk(toks.slice(i + 1, j), { ...ctx, depth: ctx.depth + 1 });
      i = j;
      continue;
    }
    if (t.t === 'op' && [';', ';;', '&&', '||', '|', '&', '\n', ')', '}'].includes(t.v)) {
      flush();
      piped = t.v === '|';
      continue;
    }
    seg.push(t);
  }
  flush();
}

/** One simple command: assignments, redirections, wrapper unwrapping, then record. */
function simple(toks: Tok[], ctx: Ctx): void {
  if (ctx.out.length >= MAX_COMMANDS) return;
  const argv: string[] = [];
  const redirects: string[] = [];
  let herestring: string | null = null;
  const subs: string[] = [];
  let leading = true;

  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t.t === 'op') {
      const target = toks[i + 1];
      if ((t.v === '>' || t.v === '>>') && target?.t === 'word') { redirects.push(expand(target.v, ctx.env)); i++; continue; }
      if (t.v === '<<<' && target?.t === 'word') { herestring = expand(target.v, ctx.env); i++; continue; }
      if (t.v === '<' && target?.t === 'word') { i++; continue; } // a read
      continue;
    }
    for (const s of t.subs) subs.push(s);
    if (leading && !t.q && /^\w+=/.test(t.v)) {
      const eq = t.v.indexOf('=');
      // `D=$(cat who)` — the value is a command's output. Binding the rest of the word
      // ('' here) would make `$D/memory.md` resolve to `/memory.md`: a real absolute
      // path that nobody wrote. Leave the name unset so `$D` stays visible instead.
      if (!t.subs.length) ctx.env.set(t.v.slice(0, eq), expand(t.v.slice(eq + 1), ctx.env));
      continue;
    }
    const w = expand(t.v, ctx.env);
    if (leading && !argv.length && KEYWORDS.has(w)) continue; // `do mempalace sync` → `mempalace sync`
    leading = false;
    argv.push(w);
  }

  // `$(…)` and backticks run their own commands, whatever the outer one does.
  for (const s of subs) walk(prepare(s), { ...ctx, depth: ctx.depth + 1 });
  // …and the OUTER word is that command's output, which we do not have. resolveEcho
  // has already handled the one case we can compute, so anything left here is a real
  // blind spot: `$(cat which) sync` is a command whose name we never learn.
  const hidden: Unresolved[] = subs.map((x) => ({ code: 'substitution_output', detail: programOf(x) }));

  if (!argv.length) {
    if (redirects.length) record(ctx, [], redirects, hidden);
    return;
  }
  dispatch(argv, redirects, herestring, ctx, hidden);
}

/** Resolve wrappers down to the command that actually runs, then record it. */
function dispatch(argv: string[], redirects: string[], herestring: string | null, ctx: Ctx, hidden: Unresolved[] = []): void {
  if (ctx.depth > MAX_DEPTH || ctx.out.length >= MAX_COMMANDS) return;
  const deeper = { ...ctx, depth: ctx.depth + 1 };

  // `for c in sync; do …` arrives as the segment `for c in sync`: bind the loop
  // variable so the body's `$c` expands. One binding per value, first wins.
  if (argv[0] === 'for' && argv[1] && argv[2] === 'in' && argv[3]) { ctx.env.set(argv[1], argv[3]); return; }
  if (argv[0] === 'while' || argv[0] === 'until' || argv[0] === 'if' || argv[0] === 'case') {
    return dispatch(argv.slice(1), redirects, herestring, ctx, hidden);
  }

  let head = argv[0];

  // env VAR=v cmd … — the assignments are this command's, not the shell's.
  if (basename(head) === 'env') {
    let i = 1;
    while (i < argv.length && /^\w+=/.test(argv[i])) { const eq = argv[i].indexOf('='); ctx.env.set(argv[i].slice(0, eq), argv[i].slice(eq + 1)); i++; }
    // `-S "cmd args"` hands env a whole command line to split itself.
    const split = flagValue(argv, ['-S', '--split-string']);
    if (split !== null) { walk(prepare(split), deeper); return; }
    i = skipFlags(argv, i, ENV_VALUE_FLAGS);
    while (i < argv.length && /^\w+=/.test(argv[i])) { const eq = argv[i].indexOf('='); ctx.env.set(argv[i].slice(0, eq), argv[i].slice(eq + 1)); i++; }
    if (i < argv.length) return dispatch(argv.slice(i), redirects, herestring, ctx, hidden);
    return;
  }
  const wrapper = TRANSPARENT[basename(head)];
  if (wrapper) {
    let i = skipFlags(argv, 1, wrapper.values);
    // `script /dev/null cmd …` records into that file; only what follows is a command.
    if (wrapper.firstOperandIsFile && i + 1 < argv.length) i++;
    if (i < argv.length) return dispatch(argv.slice(i), redirects, herestring, ctx, hidden);
    return;
  }
  if (basename(head) === 'timeout') {
    // Flags (with values), then the DURATION, then the command.
    let i = skipFlags(argv, 1, TIMEOUT_VALUE_FLAGS);
    if (i < argv.length && /^[\d.]+[smhd]?$/.test(argv[i])) i++;
    if (i < argv.length) return dispatch(argv.slice(i), redirects, herestring, ctx, hidden);
    return;
  }
  if (basename(head) === 'eval') {
    walk(prepare(argv.slice(1).join(' ')), deeper);
    return;
  }
  if (basename(head) === 'xargs') {
    // The inner command is the first non-flag operand; `-I TOKEN` names a
    // placeholder that stdin fills. A herestring is the one stdin we can read.
    let i = 1, token: string | null = null;
    while (i < argv.length) {
      const a = argv[i];
      if (a === '--') { i++; break; }
      if (!a.startsWith('-') || a === '-') break;
      const m = /^-(?:I|-replace=?)(.*)$/.exec(a);
      if (m) token = m[1] || argv[++i] || null;
      else if (!a.includes('=') && XARGS_VALUE_FLAGS.has(a)) i++;
      i++;
    }
    const inner = argv.slice(i);
    if (!inner.length) return;
    const words = herestring === null ? null : herestring.split(/\s+/).filter(Boolean);
    if (token && words) return dispatch(inner.flatMap((a) => (a === token ? words : [a])), redirects, null, ctx, hidden);
    if (!token && words) return dispatch([...inner, ...words], redirects, null, ctx, hidden);
    // `find <dir> … | xargs rm`: the operands are unread, but they all come from under
    // find's search roots, so deleting them empties those roots as surely as
    // `find <dir> -delete` does. Recorded as written, and still flagged as unresolved.
    const src = ctx.pipeIn;
    if (src && src.argv[0] === 'find' && isDeleter(inner)) {
      const roots = findSearchRoots(src.argv).map((r) => (/[/\\]$/.test(r) ? r : r + '/'));
      record(ctx, inner, [...redirects, ...roots], [{ code: 'stdin_operand', detail: token ?? '(appended)' }], roots);
      return;
    }
    // stdin we cannot see: record it as it stands and say the operand is unknown.
    record(ctx, inner, redirects, [{ code: 'stdin_operand', detail: token ?? '(appended)' }]);
    return;
  }

  const raw = basename(head);
  const base = BASENAME_ALIAS[raw] ?? raw;
  if (SHELL_DASH_C.has(base)) {
    const ci = argv.findIndex((a, k) => k > 0 && (a === '-c' || a === '-lc' || a === '-cl'));
    if (ci !== -1 && argv[ci + 1] !== undefined) { walk(prepare(argv[ci + 1]), deeper); return; }
    // No -c: the program is a script FILE we do not open, or it is stdin — which is
    // what `curl … | sh` is. Either way every command it runs is invisible here.
    //
    // `-s` means "read the program from stdin and pass the operands to IT", so an
    // operand there is an ARGUMENT, not a path — and `curl … | sh -s SECRET` is exactly
    // the shape that put a planted secret in the ledger. Only call it a file when it
    // looks like one and nothing says otherwise.
    const readsStdin = argv.some((a, k) => k > 0 && /^-[a-zA-Z]*s/.test(a));
    const operand = argv.slice(1).find((a) => !a.startsWith('-'));
    const looksLikePath = !!operand && (operand.includes('/') || /\.[a-z]{1,4}$/i.test(operand));
    hidden = [...hidden, !readsStdin && operand && looksLikePath
      ? { code: 'program_from_file', detail: operand.slice(0, 200) }
      : { code: 'piped_program', detail: base }];
  }
  if (base === 'source' || base === '.') {
    const file = argv[1];
    if (file) hidden = [...hidden, { code: 'program_from_file', detail: file.slice(0, 200) }];
  }
  // `alias gp='git push'` / `gp() { git push; }` — the name is ours to see, its later
  // use is not, because a parser only ever gets one command at a time.
  if (base === 'alias' && argv[1]) {
    hidden = [...hidden, { code: 'alias_definition', detail: argv[1].split('=')[0].slice(0, 60) }];
  }
  if (base === 'function' && argv[1]) {
    hidden = [...hidden, { code: 'alias_definition', detail: argv[1].slice(0, 60) }];
  }
  if ((base === 'python' || base === 'python3' || base === 'python2') && argv[1] === '-m' && argv[2]) {
    // `python3 -m mempalace sync` IS `mempalace sync`.
    return dispatch([argv[2], ...argv.slice(3)], redirects, herestring, ctx, hidden);
  }
  // `perl -i -e 's/a/b/' f` edits f in place; the inline-script branch below would read
  // the script for write CALLS and find none, so in-place editing is settled first.
  const editsInPlace = IN_PLACE_EDITORS.has(base)
    && argv.slice(1).some((a) => /^-[a-zA-Z]*i/.test(a) || a === '--in-place' || a.startsWith('--in-place='));
  const inlineFlags = editsInPlace ? undefined : INLINE_SCRIPT[base];
  if (inlineFlags) {
    const fi = argv.findIndex((a, k) => k > 0 && inlineFlags.includes(a));
    if (fi !== -1 && argv[fi + 1] !== undefined) {
      const script = argv[fi + 1];
      const scriptWrites = inlineTargets(script);
      record(ctx, [base, ...argv.slice(1)], [...redirects, ...scriptWrites], hidden, scriptWrites);
      // A string the script hands to a shell is a command, so parse it as one.
      for (const m of script.matchAll(EXEC_API)) walk(prepare(m[2]), deeper);
      return;
    }
  }
  if (base === 'cd' && argv[1]) { ctx.cwd = realAbsolute(argv[1], ctx.cwd); record(ctx, [base, ...argv.slice(1)], redirects, hidden); return; }

  // `git -C dir …` runs in dir; it writes no path we track, but a later command in
  // the same line does not inherit that, so only argv is normalised here.
  const verbWrites = verbTargets(base, argv);
  // …and when that git command destroys the checkout it is standing in, the path it
  // destroys is in no operand, so say so rather than report a clean read of zero writes.
  const destructive = destructiveGitVerb(base, argv);
  if (destructive) hidden = [...hidden, destructive];
  record(ctx, [base, ...argv.slice(1)], [...redirects, ...verbWrites], hidden, verbWrites, sourceTargets(base, argv));
}

/** Paths a known mutating verb writes, given its argv. */
function verbTargets(base: string, argv: string[]): string[] {
  if (base === 'find') return findDeleteRoots(argv);
  const takesValue = VALUE_FLAGS[base] ?? new Set<string>();
  const operands: string[] = [];
  const flags: string[] = [];
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('-') && a !== '-') {
      flags.push(a);
      // `sed -e s/a/b/ f` — the script is the flag's value, not a file to rewrite.
      // perl and ruby cluster it (`-pe`, `-ne`, `-i -pe`), so match the cluster too.
      if (takesValue.has(a) || (IN_PLACE_EDITORS.has(base) && /^-[a-zA-Z]*[ef]$/.test(a))) i++;
      continue;
    }
    operands.push(a);
  }
  if (TARGET_DIR_VERBS.has(base)) {
    const dir = flagValue(argv, TARGET_DIR_FLAGS);
    if (dir !== null) return [/[/\\]$/.test(dir) ? dir : dir + '/'];
    // `install -d a b` creates directories; there is no source among the operands.
    if (base === 'install' && flags.some((f) => /^-[a-zA-Z]*d$/.test(f) || f === '--directory')) return operands;
  }
  if (IN_PLACE_EDITORS.has(base)) {
    if (!flags.some((f) => /^-[a-zA-Z]*i/.test(f) || f === '--in-place' || f.startsWith('--in-place='))) return [];
    // BSD `sed -i '' script file` leaves an empty operand; the script is the first
    // real operand unless -e/-f already supplied it.
    const real = operands.filter((o) => o !== '');
    // `-e`/`-f` supply the script, so every operand is a file; otherwise the first
    // operand IS the script. perl's `-pe`/`-ne` clusters count as supplying it.
    const suppliedScript = flags.some((f) => f === '-e' || f === '-f' || f === '--expression' || f === '--file'
      || f.startsWith('--expression=') || f.startsWith('--file=') || /^-[a-zA-Z]*e$/.test(f));
    return suppliedScript ? real : real.slice(1);
  }
  if (base === 'dd') return argv.filter((a) => a.startsWith('of=')).map((a) => a.slice(3));
  const dest = DEST_FLAG[base];
  if (dest) {
    if (dest.needsExtract && !argv.some((a) => /^-[^-]*x/.test(a) || a === '--extract')) return [];
    // `tar -xzf a.tgz -C dir` writes into dir; the same flag on a `-c` writes the
    // archive instead, so tar has to say it is extracting. unzip only extracts.
    for (let i = 1; i < argv.length; i++) {
      if (!dest.flags.includes(argv[i])) continue;
      const dir = argv[i + 1];
      if (dir) return [/[/\\]$/.test(dir) ? dir : dir + '/'];
    }
    return [];
  }
  if (ARCHIVE_FIRST_ARG.has(base)) return operands.slice(0, 1);
  if (ALL_ARGS_TARGET.has(base)) return SKIP_FIRST_OPERAND.has(base) ? operands.slice(1) : operands;
  if (LAST_ARG_DEST.has(base)) return operands.length >= 2 ? [operands[operands.length - 1]] : [];
  return [];
}

/** Verbs that delete, or move away, what find or xargs hands them. `mv` counts: its
 *  source is gone afterwards, which is what an ownership rule cares about. */
const FIND_EXEC_DELETERS = new Set(['rm', 'rmdir', 'unlink', 'shred', 'mv']);

/** Prefixes that run the next word as the command: `-exec sudo rm {} +`. */
const EXEC_WRAPPERS = new Set(['sudo', 'doas', 'env', 'nice', 'nohup', 'command', 'time', 'ionice', 'chrt']);

/**
 * Does this argv delete what it is handed? The verb itself, through a wrapper
 * (`sudo rm`), or inside `sh -c '…'` when the script runs a deleter.
 */
function isDeleter(argv: string[], depth = 0): boolean {
  if (!argv.length || depth > 3) return false;
  const raw = basename(argv[0]);
  const base = BASENAME_ALIAS[raw] ?? raw;
  if (FIND_EXEC_DELETERS.has(base)) return true;
  if (EXEC_WRAPPERS.has(base)) {
    let i = 1;
    while (i < argv.length && (argv[i].startsWith('-') || /^\w+=/.test(argv[i]))) i++;
    return isDeleter(argv.slice(i), depth + 1);
  }
  if (SHELL_DASH_C.has(base)) {
    const ci = argv.findIndex((a, k) => k > 0 && /^-[a-z]*c[a-z]*$/.test(a));
    const script = ci !== -1 ? argv[ci + 1] : undefined;
    if (script === undefined) return false;
    return effectiveCommands(script, '/').some((c) => isDeleter(c.argv, depth + 1));
  }
  return false;
}

/** `find`'s search roots: the operands before the first expression token. None means `.`.
 *  Leading options come first and are skipped, including `-D debugopts` and `-O level`. */
function findSearchRoots(argv: string[]): string[] {
  const roots: string[] = [];
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (/^-(?:H|L|P)$/.test(a)) continue;
    if (a === '-D') { i++; continue; }
    if (/^-O\d*$/.test(a)) { if (a === '-O') i++; continue; }
    if (a.startsWith('-') || a === '(' || a === '!' || a === ',') break;
    roots.push(a);
  }
  if (!roots.length) roots.push('.');
  return roots;
}

/**
 * The directories a `find` empties, or none.
 *
 * `find <dir> -delete`, `find <dir> -exec rm {} +`, `-exec sudo rm`, `-exec mv {} /tmp`
 * and `-exec sh -c 'rm "$@"'` remove files under every search root, so each root counts
 * as written to, exactly as `rm -rf <dir>` would. Without this the command had no target
 * at all, so no ownership rule could see it. A `find` with no deleting action
 * stays a reader.
 */
function findDeleteRoots(argv: string[]): string[] {
  let deletes = argv.includes('-delete');
  for (let i = 1; i < argv.length && !deletes; i++) {
    if (!['-exec', '-execdir', '-ok', '-okdir'].includes(argv[i])) continue;
    let end = i + 1;
    while (end < argv.length && argv[end] !== ';' && argv[end] !== '+') end++;
    if (isDeleter(argv.slice(i + 1, end))) deletes = true;
  }
  if (!deletes) return [];
  return findSearchRoots(argv).map((r) => (/[/\\]$/.test(r) ? r : r + '/'));
}

/**
 * Git's own global flags — the ones that come BEFORE the subcommand. The value table is
 * load-bearing for the same reason `TRANSPARENT`'s is: `git -C <dir> clean -fdx` is the
 * dominant spelling on this floor, and reading the subcommand off index 1 finds `-C`.
 */
const GIT_GLOBAL_VALUE_FLAGS = new Set([
  '-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--super-prefix', '--config-env',
]);
const GIT_GLOBAL_BOOLEAN_FLAGS = new Set([
  '-p', '--paginate', '-P', '--no-pager', '--bare', '--no-replace-objects', '--no-optional-locks',
  '--literal-pathspecs', '--glob-pathspecs', '--noglob-pathspecs', '--icase-pathspecs',
]);

/**
 * Where git's subcommand sits, or null when we cannot say.
 *
 * Null on an UNRECOGNISED flag, deliberately. Stepping over an unknown flag assumes it
 * takes no value; when it does, the search lands on the flag's VALUE and reads it as the
 * verb — which both misses the verb and makes an argument decide what gets written to the
 * ledger. Git's global flags are a closed, documented set, unlike a whole CLI ecosystem's,
 * so "unknown" here means a spelling we have not seen, and giving up under-counts a shape
 * nobody writes rather than mis-reading one.
 */
function gitSubcommandIndex(argv: string[]): number | null {
  let i = 1;
  while (i < argv.length) {
    const a = argv[i];
    if (!a.startsWith('-')) return i;
    const name = a.includes('=') ? a.slice(0, a.indexOf('=')) : a;
    if (GIT_GLOBAL_VALUE_FLAGS.has(name)) { i += a.includes('=') ? 1 : 2; continue; }
    if (GIT_GLOBAL_BOOLEAN_FLAGS.has(name)) { i += 1; continue; }
    return null;
  }
  return null;
}

/**
 * A git verb that destroys a checkout, named by a CONSTANT this file owns.
 *
 * The detail is a literal from the table below rather than a slice of argv, and that is
 * the point: an `unresolved` row goes to a file an operator reads, so a construction that
 * cannot carry an argument is worth more than one that is careful with them. See the
 * `destructive_verb` code for why these shapes need a row at all.
 *
 * Nothing here changes a verdict. The command's `writes`, `verbWrites`, `removes` and
 * `text` are untouched — we still cannot attribute the destruction to a path, which is
 * exactly what the row says.
 */
function destructiveGitVerb(base: string, argv: string[]): Unresolved | null {
  if (base !== 'git') return null;
  const at = gitSubcommandIndex(argv);
  if (at === null) return null;
  const verb = argv[at];
  const rest = argv.slice(at + 1);
  const forced = rest.some((a) => a === '--force' || /^-[a-zA-Z]*f/.test(a));
  const name = (detail: string): Unresolved => ({ code: 'destructive_verb', detail });
  switch (verb) {
    // `git worktree remove` takes the worktree's path, but what it deletes is that whole
    // checkout, and `list`/`add`/`prune` in the same subcommand destroy nothing.
    case 'worktree':
      return rest[0] === 'remove' ? name('git worktree remove') : null;
    // Without `-f` clean refuses to run at all, and `-n` makes it a dry run.
    case 'clean':
      return forced && !rest.some((a) => a === '--dry-run' || /^-[a-zA-Z]*n/.test(a)) ? name('git clean -f') : null;
    // `--soft` and a bare `reset` move a ref; `--hard` overwrites the working tree.
    case 'reset':
      return rest.includes('--hard') ? name('git reset --hard') : null;
    // A pathspec (`checkout -- .`) or `-f` discards the working tree; a branch name
    // checkout is the ordinary, non-destructive spelling.
    case 'checkout':
      // `git checkout .` and `git checkout ./src` discard the working tree with no `--`
      // and no `-f`, and are the commonest spelling of it. A bare operand cannot be told
      // from a branch name in general (`feature/x` has a slash), so only the `.`-rooted
      // pathspec — which is never a branch — is added here.
      return rest.includes('--') || forced
        || rest.some((a) => a === '.' || a.startsWith('./')) ? name('git checkout --') : null;
    // restore's whole job is to overwrite from another source.
    case 'restore':
      return name('git restore');
    default:
      return null;
  }
}

/** Operands a source-mutating verb takes away: everything but its destination. */
function sourceTargets(base: string, argv: string[]): string[] {
  if (!SOURCE_MUTATED.has(base) && !(base === 'rsync' && argv.includes('--remove-source-files'))) return [];
  // `ln -s` makes a symlink, which does not touch what it points at.
  if (base === 'ln' && argv.some((a, i) => i > 0 && (/^-[a-zA-Z]*s/.test(a) || a === '--symbolic'))) return [];
  const operands: string[] = [];
  const takesValue = VALUE_FLAGS[base] ?? new Set<string>();
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('-') && a !== '-') { if (takesValue.has(a) || TARGET_DIR_FLAGS.includes(a)) i++; continue; }
    operands.push(a);
  }
  // With `-t DIR` the destination is the flag's value, so every operand is a source.
  if (flagValue(argv, TARGET_DIR_FLAGS) !== null) return operands;
  return operands.slice(0, -1);
}

/** A flag's value, whether written `-t DIR`, `--target-directory DIR` or `=DIR`. */
function flagValue(argv: string[], names: string[]): string | null {
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    for (const n of names) {
      if (a === n) return argv[i + 1] ?? null;
      if (a.startsWith(n + '=')) return a.slice(n.length + 1);
    }
  }
  return null;
}

/**
 * The inline program a command carries, if it carries one — `node -e <src>`,
 * `python3 -c <src>`, `sh -c <src>`.
 *
 * Exported so a CALLER can ask about the script itself rather than about the paths the
 * parser managed to pull out of it. That distinction matters for a protected directory:
 * a script that names the directory and contains a write call is a write to it even
 * when the path is assembled at run time and cannot be resolved here.
 */
export function inlineScript(argv: string[]): string | null {
  const base = BASENAME_ALIAS[basename(argv[0] ?? '')] ?? basename(argv[0] ?? '');
  const flags = INLINE_SCRIPT[base] ?? (SHELL_DASH_C.has(base) ? ['-c'] : null);
  if (!flags) return null;
  const i = argv.findIndex((a, k) => k > 0 && flags.includes(a));
  return i === -1 ? null : (argv[i + 1] ?? null);
}

/** Every quoted string literal in an inline script that could be part of a path. */
export function scriptLiterals(script: string): string[] {
  const out: string[] = [];
  for (const m of script.matchAll(/['"]([^'"\n]*)['"]/g)) if (m[1]) out.push(m[1]);
  return out;
}

/**
 * True when an inline script calls anything that WRITES, whatever it writes to.
 *
 * Deliberately looser than `inlineTargets`, which needs to know WHICH argument is the
 * target and therefore only sees literal ones. This only needs to know that a write
 * happens: `open(p,'w')` builds its path in a variable, so no target can be extracted,
 * and it is still unmistakably a write. `process.stdout.write(...)` is not — the names
 * below are the ones that touch a file, and printing is absent from them.
 */
const SCRIPT_WRITE_CALL = new RegExp(
  '(?:'
  + '\\b(?:writeFileSync|writeFile|appendFileSync|appendFile|createWriteStream'
  + '|truncateSync|truncate|unlinkSync|unlink|rmSync|rmdirSync|mkdirSync|makedirs'
  + '|copyFileSync|copyFile|copyfile|renameSync|rename|cpSync|linkSync|symlinkSync)\\s*\\('
  + '|(?:os|shutil)\\.(?:remove|unlink|mkdir|makedirs|rmdir|truncate|rename|replace|copy|copy2|copyfile|move)\\s*\\('
  // `open(path, 'w')` — the mode is what makes it a write, wherever the path came from,
  // including a path built by a call: `open(os.path.join(a, b), 'w')`.
  + '|\\bopen\\s*\\((?:[^()]|\\([^()]*\\))*[\'"][wax]'
  + ')'
);

/** True when an inline script calls anything that WRITES, whatever it writes to. */
export function scriptWrites(script: string): boolean {
  return SCRIPT_WRITE_CALL.test(script);
}

/** The operands of a command — its non-flag words, which is where paths appear. */
export function operandsOf(argv: string[]): string[] {
  const out: string[] = [];
  for (let i = 1; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('-') && a !== '-') continue;
    out.push(a);
  }
  return out;
}

/** The verb a command runs, with homebrew's `g`-prefixed coreutils folded in. */
export function verbOf(argv: string[]): string {
  const raw = basename(argv[0] ?? '');
  return BASENAME_ALIAS[raw] ?? raw;
}

/** The path each write call in an inline script targets — not every path in it. */
function inlineTargets(script: string): string[] {
  const out: string[] = [];
  // NAME ( 'first' , 'second'  — enough to tell a target from a source without
  // parsing the host language. A call whose argument is not a literal is skipped,
  // which is a miss (see the residual list), not a guess.
  const call = /([\w.$]+)\s*\(\s*(?:(['"])((?:(?!\2).)*)\2)?\s*(?:,\s*(['"])((?:(?!\4).)*)\4)?/g;
  for (const m of script.matchAll(call)) {
    const [, name, , first, , second] = m;
    for (const spec of INLINE_WRITE_CALLS) {
      if (!spec.re.test(name)) continue;
      if (spec.needsWriteMode && !/^[wax]/.test(second ?? '')) continue;
      const target = spec.arg === 1 ? first : second;
      if (target) out.push(target);
      break;
    }
  }
  return out;
}

/**
 * The program a command string runs — a name, safe to put in a ledger.
 *
 * Leading `VAR=value` words are skipped rather than reported: for
 * `$(AWS_SECRET_ACCESS_KEY=… aws s3 ls)` the first word IS the secret, and the ledger's
 * contract is a structural token, never an argument value. With nothing but
 * assignments there is no name to give, so it says so.
 */
function programOf(src: string): string {
  for (const w of src.trim().split(/\s+/)) {
    if (!w) continue;
    if (/^\w+=/.test(w)) continue;
    return w.slice(0, 60);
  }
  return src.trim() ? '(assignment)' : '(empty)';
}

/** Variable names still unexpanded in these words, if any. */
function unexpandedVars(words: string[]): Unresolved[] {
  const out: Unresolved[] = [];
  for (const w of words) {
    for (const m of w.matchAll(/\$\{?(\w+)\}?/g)) out.push({ code: 'unexpanded_variable', detail: m[1] });
  }
  return out;
}

function record(
  ctx: Ctx, argv: string[], writes: string[], unresolved: Unresolved[],
  verbWrites: string[] = [], removes: string[] = []
): void {
  if (ctx.out.length >= MAX_COMMANDS) return;
  const abs = (w: string) => realAbsolute(w, ctx.cwd);
  // A relative target is only as good as the directory we resolved it against. With no
  // cwd from the caller that directory is this process's, which is not the agent's.
  const guessed = ctx.cwdKnown
    ? []
    : [...writes, ...removes]
        .filter((w) => !isAbsolute(w) && !w.startsWith('~') && !w.includes('$'))
        .map((w): Unresolved => ({ code: 'missing_cwd', detail: w.slice(0, 200) }));
  ctx.out.push({
    argv,
    text: argv.map(requote).join(' '),
    writes: writes.map(abs),
    verbWrites: verbWrites.map(abs),
    removes: removes.map(abs),
    // A target holding `$SOMETHING` was resolved against a name we never saw, so the
    // absolute path above is a guess at best. Say so rather than only recording it.
    unresolved: [...unresolved, ...unexpandedVars(writes), ...guessed],
  });
}
