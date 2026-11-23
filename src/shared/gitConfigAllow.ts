/**
 * WHAT OF A REPOSITORY'S OWN CONFIG THE APP'S GIT MAY SEE.
 *
 * The app runs git on a private copy of a repository's config
 * (src/core/gitSafe.ts). The copy is an ALLOW LIST: only the keys below go
 * in, each with the reason git needs it for the commands the app runs, and
 * each with the values it may hold. Everything else is left out, programs
 * and paths and switches alike, `extensions.*` included unless named here.
 * A deny list was tried first and let a key through on every review.
 *
 * Written in plain old JavaScript on purpose: parseConfigList and
 * privateConfigText are also printed into `hive-compact.cjs`
 * (src/shared/hiveCompact.ts), so those two use nothing but their arguments.
 */

export interface GitConfigAllowRule {
  /** Matches the whole key. Section and variable arrive in lower case from
   *  `git config --list`; a subsection keeps its case. A regexp source. */
  key: string;
  /** Matches the whole value. A regexp source. */
  value: string;
  why: string;
}

const BOOL = '(?:true|false|yes|no|on|off|0|1)';
/** A branch or remote name, or a ref: no spaces, no control characters, not
 *  an option. */
const NAME = '[A-Za-z0-9_][A-Za-z0-9_./@+-]*';

/** The name of a remote: it reaches git as an argument when git fetches from
 *  it, so it never starts with a dash and holds no space or control
 *  character. */
const REMOTE = '[^\\x00-\\x20-][^\\x00-\\x20]*';

export const GIT_CONFIG_ALLOW: GitConfigAllowRule[] = [
  { key: 'core\\.repositoryformatversion', value: '[01]', why: 'git must know the layout of the repository to read it at all' },
  { key: 'extensions\\.objectformat', value: 'sha1|sha256', why: 'a sha256 repository cannot be read without it' },
  { key: 'extensions\\.refstorage', value: 'files|reftable', why: 'a reftable repository has no readable refs without it' },
  { key: 'core\\.filemode', value: BOOL, why: 'on a disk with no executable bit every file would read as changed' },
  { key: 'core\\.precomposeunicode', value: BOOL, why: 'macOS file names in status; set by git init from the disk' },
  { key: 'core\\.ignorecase', value: BOOL, why: 'set by git init on a Mac or Windows disk; without it a file renamed only by case reads as untracked' },
  { key: 'core\\.symlinks', value: BOOL, why: 'set by git init where links cannot be made (Windows); without it every tracked link reads as a type change' },
  { key: 'core\\.autocrlf', value: BOOL + '|input', why: 'line endings; without it every CRLF file reads as modified' },
  { key: 'core\\.eol', value: 'lf|crlf|native', why: 'line endings, with core.autocrlf' },
  { key: 'core\\.safecrlf', value: BOOL + '|warn', why: 'line endings, with core.autocrlf; it only refuses or warns' },
  { key: 'core\\.sparsecheckout', value: BOOL, why: 'a sparse work tree set the older way; without it a switch would fill the whole tree in' },
  { key: 'core\\.sparsecheckoutcone', value: BOOL, why: 'how the sparse patterns are read, with core.sparsecheckout' },
  { key: 'core\\.logallrefupdates', value: BOOL + '|always', why: 'keeps the reflog as the repository had it' },
  { key: 'core\\.untrackedcache', value: BOOL + '|keep', why: 'the hive turns it on for its own repository; it only speeds status up' },
  { key: 'pack\\.windowmemory', value: '[0-9]+[kmg]?', why: 'the hive bounds what a repack may use' },
  { key: 'pack\\.packsizelimit', value: '[0-9]+[kmg]?', why: 'the hive bounds what a repack may use' },
  { key: 'pack\\.threads', value: '[0-9]+', why: 'the hive bounds what a repack may use' },
  { key: 'branch\\.[^\\x00-\\x1f]+\\.remote', value: '\\.|' + NAME, why: 'the upstream of a branch, for ahead and behind' },
  { key: 'branch\\.[^\\x00-\\x1f]+\\.merge', value: 'refs/' + NAME, why: 'the upstream of a branch, for ahead and behind' },
  // gh trusts this value: only an https or ssh address, never one that reads
  // as an option or names a helper (`ext::`, `file://`, a local path).
  { key: 'remote\\.' + REMOTE + '\\.url', value: '(?:https://|ssh://)[A-Za-z0-9_.@:\\[\\]-]+/[^\\x00-\\x1f]*|[A-Za-z0-9_][A-Za-z0-9_.-]*@[A-Za-z0-9][A-Za-z0-9.-]*:[^\\x00-\\x1f]+', why: 'gh reads it to find the repository on GitHub; no git transport runs' },
  { key: 'remote\\.' + REMOTE + '\\.fetch', value: '\\+?refs/[A-Za-z0-9_./*@+-]+:refs/[A-Za-z0-9_./*@+-]+', why: 'maps a branch to its remote tracking ref, for ahead and behind' },
  // A partial clone: said to git so it knows which objects are missing on
  // purpose. The app's git never fetches them (`GIT_NO_LAZY_FETCH`, no
  // transport): see PARTIAL_CLONE in src/core/gitSafe.ts.
  { key: 'extensions\\.partialclone', value: NAME, why: 'a partial clone names the remote its missing objects come from' },
  { key: 'remote\\.' + REMOTE + '\\.promisor', value: BOOL, why: 'marks the remote a partial clone would fetch its missing objects from' },
  { key: 'remote\\.' + REMOTE + '\\.partialclonefilter', value: 'blob:none|blob:limit=[0-9]+[kmg]?|tree:[0-9]+', why: 'the filter of a partial clone, kept so the clone reads as what it is; the app never fetches' },
  { key: 'remote\\.' + REMOTE + '\\.gh-resolved', value: NAME, why: 'the note gh keeps of which remote is the base' },
  // The repository's own identity, for the one commit the app makes itself (a
  // temp's work left at teardown, gitSafe's temp road). Words, never a program.
  { key: 'user\\.name', value: '[^\\x00-\\x1f\\x7f]{1,256}', why: 'the name a temp\'s teardown commit is made under, as the repository sets it' },
  { key: 'user\\.email', value: '[^\\x00-\\x1f\\x7f]{1,256}', why: 'the address a temp\'s teardown commit is made under, as the repository sets it' },
  { key: 'user\\.useconfigonly', value: BOOL, why: 'the repository forbids git to guess an identity from the machine' }
];

export interface RepoConfigEntry { scope: string; key: string; value: string | null }

/** Parse `git config --file <the repository's config> -z --list`: key,
 *  newline, value, NUL. A key with no value (`[a] b`) has no newline. Every
 *  entry is the repository's own (scope `local`): the file is read by name,
 *  includes are not followed, and no other config is in it. */
export function parseConfigList(text: string): RepoConfigEntry[] {
  var parts = text.split('\0');
  var out: RepoConfigEntry[] = [];
  for (var i = 0; i < parts.length; i++) {
    if (!parts[i]) continue;
    var at = parts[i].indexOf('\n');
    out.push({ scope: 'local', key: at < 0 ? parts[i] : parts[i].slice(0, at), value: at < 0 ? null : parts[i].slice(at + 1) });
  }
  return out;
}

/** A rule as two patterns, each made once: a call per config entry made them
 *  anew and held the process for over a second on a large config. Neither has
 *  the g flag, so a pattern keeps nothing from one use to the next. */
var RULE_PATTERNS = new WeakMap<GitConfigAllowRule, { key: RegExp; value: RegExp }>();
function rulePatterns(rule: GitConfigAllowRule): { key: RegExp; value: RegExp } {
  var made = RULE_PATTERNS.get(rule);
  if (!made) {
    made = { key: new RegExp('^(?:' + rule.key + ')$'), value: new RegExp('^(?:' + rule.value + ')$', 'i') };
    RULE_PATTERNS.set(rule, made);
  }
  return made;
}

/** Is this key one of the rules' keys, whatever its value? */
export function gitConfigKeyKnown(key: string, allow: GitConfigAllowRule[]): boolean {
  for (var i = 0; i < allow.length; i++) {
    if (rulePatterns(allow[i]).key.test(key)) return true;
  }
  return false;
}

/** Is this key, with this value, one the copy may hold? A key with no value
 *  reads as `true`, as git reads it. */
export function gitConfigAllowed(key: string, value: string | null, allow: GitConfigAllowRule[]): boolean {
  var v = value === null ? 'true' : value;
  for (var i = 0; i < allow.length; i++) {
    var rule = rulePatterns(allow[i]);
    if (rule.key.test(key) && rule.value.test(v)) return true;
  }
  return false;
}

/**
 * The private copy: the allowed keys of the repository's own config (scope
 * `local` only; includes are already expanded by git, and a work tree's own
 * config file is not used) as one config file.
 */
export function privateConfigText(entries: RepoConfigEntry[], allow: GitConfigAllowRule[]): string {
  var quote = function (s: string): string { return '"' + s.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n').replace(/\t/g, '\\t') + '"'; };
  var out = '';
  // The allow list as patterns, made ONCE for the whole walk and inside this
  // function (its text is also placed in a script by itself, hiveCompact.ts).
  // Made anew for every entry, a large config held the process for seconds.
  var keyIs: RegExp[] = [];
  var valueIs: RegExp[] = [];
  for (var k = 0; k < allow.length; k++) {
    keyIs.push(new RegExp('^(?:' + allow[k].key + ')$'));
    valueIs.push(new RegExp('^(?:' + allow[k].value + ')$', 'i'));
  }
  // The answer for each key and value, remembered for this walk and inside this
  // function for the same reason. A key repeated a million times is asked once.
  // Past a number no real config reaches nothing more is kept, so a config of
  // all different keys pays for one look up each and holds no second copy.
  var answers = new Map<string, Map<string, boolean>>();
  var kept = 0;
  for (var i = 0; i < entries.length; i++) {
    var e = entries[i];
    if (e.scope !== 'local') continue;
    var v = e.value === null ? 'true' : e.value;
    var forKey = answers.get(e.key);
    var allowed = forKey ? forKey.get(v) : undefined;
    if (allowed === undefined) {
      allowed = false;
      for (var j = 0; j < allow.length; j++) {
        if (keyIs[j].test(e.key) && valueIs[j].test(v)) { allowed = true; break; }
      }
      if (kept < 4096) {
        if (!forKey) { forKey = new Map<string, boolean>(); answers.set(e.key, forKey); }
        forKey.set(v, allowed);
        kept++;
      }
    }
    if (!allowed) continue;
    var first = e.key.indexOf('.');
    var last = e.key.lastIndexOf('.');
    if (first <= 0 || last === e.key.length - 1) continue;
    var section = e.key.slice(0, first);
    var sub = last > first ? e.key.slice(first + 1, last) : null;
    var name = e.key.slice(last + 1);
    out += sub === null ? '[' + section + ']\n' : '[' + section + ' "' + sub.replace(/\\/g, '\\\\').replace(/"/g, '\\"') + '"]\n';
    out += '\t' + name + ' = ' + quote(v) + '\n';
  }
  return out;
}
