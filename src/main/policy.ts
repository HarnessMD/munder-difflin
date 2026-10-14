/**
 * PolicyEngine — opt-in, deterministic PreToolUse policy.
 *
 * Evaluates a small set of hand-written rules against a hook payload and returns
 * `allow | deny | ask` plus a reason string the model reads. It exists because
 * standing process rules ("an agent may only write inside its own folder") live as
 * prose in prompts and memory files, so they depend on salience: under task
 * pressure an agent optimises for the immediate goal over a rule it is not
 * actively holding. This moves those rules from remembered to enforced: a rule in
 * `live` mode denies or asks, one in `dry_run` (a `log` backstop) only records.
 *
 * WHAT THIS IS NOT. The hook transport is fail-open by construction — the shim
 * exits 0 (no stdout = allow) when HIVE_SOCK is unset, on socket error, and on its
 * own timeout. So this governs agents running under a live harness; it is a
 * salience aid for a cooperative agent, NOT a security boundary against a hostile
 * one. No policy setting can change that, so it is documented rather than papered
 * over.
 *
 * DESIGN CONSTRAINTS, all deliberate:
 *   - No model call, ever. A model in the enforcement path adds latency to every
 *     tool call and makes the decision nondeterministic.
 *   - No network, no new service, no dependency. The matcher vocabulary is tiny
 *     on purpose (see MATCHERS below); the moment it needs an expression language
 *     the correct move is to adopt OPA/Rego rather than grow one here.
 *   - Unconfigured is inert. With no policy file the engine loads nothing,
 *     evaluates nothing and denies nothing, so an existing install sees
 *     byte-identical behaviour.
 *
 * BASH IS PARSED, NOT PATTERN-MATCHED. A Bash payload is handed to shell.ts,
 * which returns the commands it actually runs and the paths it actually writes;
 * `command_matches` is tested against each of those as well as against the raw
 * string, and `path_glob` sees bash write targets the way it sees a Write's
 * file_path. Without that, `sudo mempalace sync` and `cat x > <other agent>/f`
 * are simply different strings from the ones the rules describe.
 * The parser is a normaliser, not a sandbox: see its own header for what it does
 * not claim to catch. What it CANNOT see, it says so about: a Bash call whose target
 * or program the parser could not pin down gets an `event: "unresolved"` row in the
 * ledger, carrying a stable reason code. That row changes no decision — it exists so
 * the size and shape of the blind spot is a number an operator can read rather than a
 * paragraph in a report.
 *
 * Runs in the Electron main process, called from HookServer.handle(). In this
 * version the hook server records each verdict and never applies it: every backstop
 * logs only.
 */
import { existsSync, appendFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import {
  effectiveCommands, realAbsolute, inlineScript, scriptLiterals, scriptWrites, operandsOf, verbOf,
  STRUCTURAL_UNRESOLVED, type EffectiveCommand, type Unresolved,
} from './shell';
import { GUARDRAIL_FILE, MATCHERS, readGuardrail, toEngineRules } from './guardrail';

/** Where a rule's path matcher reads its subject from, per tool. */
const PATH_FIELDS = ['file_path', 'notebook_path', 'path'] as const;

/**
 * The entire matcher vocabulary. Adding a key here is a spec change, not an
 * implementation detail: every present key must match (AND), rules are evaluated
 * in file order, and first match wins. If you need OR, write two rules.
 */

/** Verbs whose written targets are removed wholesale, as opposed to written into. */
const DESTROY_VERBS = new Set(['rm', 'rmdir', 'unlink', 'shred', 'find', 'mv']);

/** The engine's rules file, under `<hive>/policy/`. */
export const ENGINE_POLICY_FILE = GUARDRAIL_FILE;

/** What `status` reports. The UI, fleet.json and the startup log all read this one
 *  shape, so "how many rules are actually loaded" has a single answer. */
export interface PolicyStatus {
  configured: boolean;
  /** The file the rules came from, or the file that failed. Null when unconfigured. */
  file: string | null;
  rulesLoaded: number;
  ruleIds: string[];
  /** Why no rules are loaded when a policy is configured. Null when all is well. */
  error: string | null;
  loadedAt: string | null;
  /** A guardrail.json that was NOT loaded because the guardrail is not turned on in
   *  the app config, or null. Anyone could have written it. */
  ignored: string | null;
}

/**
 * Write indicators for the Bash half of policy self-protection: a redirection, a
 * `tee`, an in-place `sed`, or one of the verbs that only ever mutates. Reads
 * (`cat`, `grep`, `sed -n`) are absent on purpose — an agent should be able to
 * read the rule it just tripped.
 *
 * SCOPED TO ONE PARSED COMMAND, not to the whole Bash string. Applied to the whole
 * string it would deny `cp a b && wc -l <policy>/guardrail.jsonl` — two unrelated
 * segments, one of which merely READS the ledger — because the verb and the path
 * are both somewhere in the text. That false positive falls on anyone working on the
 * policy files, which is exactly the person who needs to read them. The verb and the
 * path must appear in the same segment.
 *
 * The whole-string form survives as a fallback for a command the parser admits it
 * could not read (`unresolved` in shell.ts): if the segmentation is not trustworthy
 * we should not lean on it, and for the one invariant that makes every other rule
 * meaningful the unreadable case errs toward deny.
 */
const POLICY_WRITE_SHAPE =
  /(>>?\s*\S*policy)|(\btee\b)|(\bsed\b[^|;&]*\s-[a-zA-Z]*i)|(\b(rm|mv|cp|mkdir|touch|chmod|chown|truncate|shred|unlink|ln|install|rsync|dd)\b)/;

/** How long between `policy-stats` rollups. Flushed lazily, so no timer. */
const STATS_INTERVAL_MS = 60 * 60 * 1000;

/** At most this many blind spots per row. A pathological command cannot flood a file. */
const MAX_UNRESOLVED_PER_ROW = 20;

/** At most this many blind-spot rows per stats interval. Beyond it they are only
 *  counted (`policy-stats.unresolved_unlogged`): a `$(…)` in every other command must
 *  not become a steady stream into the shared log. */
const MAX_UNRESOLVED_ROWS_PER_INTERVAL = 50;

/** The ledger beside guardrail.json: every match and every blind-spot row. */
export const LEDGER_FILE = 'guardrail.jsonl';

/**
 * THE ONE PLACE TO EDIT. Verbs allowed to name a path inside the policy directory.
 *
 * For the policy directory only, the default is inverted: a Bash command that names a
 * path under it is DENIED unless its verb is listed here. Everywhere else on the disk
 * the engine works the other way round: a write is matched, everything else passes.
 *
 * WHY THE INVERSION IS WORTH IT HERE AND NOWHERE ELSE. A deny-known-writers list is a
 * list of verbs, and there is always another verb: `perl -i`, `ed -s`, `ex -sc '%d|x'`,
 * `vim -es`, `python3 -m json.tool src dest`, tomorrow's editor. Each one closed by hand
 * only invites the next. With an allow-known-readers list, a verb nobody has listed
 * fails closed. The price is the opposite error (an unusual READ verb is denied until
 * someone adds it), a one-line fix by the operator.
 *
 * WHAT BELONGS HERE: a verb with NO mode that writes a file. Many readers have one
 * (`sort -o`, `sed 'w f'`, `awk -i inplace`, `yq -i`, `xxd -r`, `xmllint --output`,
 * `zip -m`, `tar --remove-files`, `uniq in out`, `rg --pre`), so they are left out:
 * reading the rules needs no more than the verbs below. `cp` is here because a write
 * among its operands is caught before this list is consulted, which is what keeps
 * `cp <policy>/guardrail.json /tmp/mine.json` (copying the rules OUT) working.
 *
 * NOT HERE, on purpose: `node`, `python3`, `perl`, `ruby` and `sh -c`. An interpreter
 * can do anything, so it is judged by its SCRIPT: a script that writes and names the
 * policy directory, a path in it, or the hive root as a literal is a write to it.
 * A path assembled from pieces none of which is one of those is not caught (stated
 * under Limits).
 */
/**
 * Verbs on the list above that stop being readers when given a particular flag.
 * `find <dir> -name '*.json'` is a read and `find <dir> -delete` empties the directory.
 */
const POLICY_READ_VERB_UNLESS: Record<string, RegExp> = {
  find: /^(?:-delete|-exec|-execdir|-ok|-okdir|-fprint|-fprint0|-fprintf|-fls)$/,
  // `cp -l` makes a hard link, not a copy: another name for the rules file, outside
  // the folder, that writes straight through to it.
  cp: /^(?:--link|-[A-Za-z]*l[A-Za-z]*)$/,
};
/** Verbs that copy or link the files named on their stdin (`cpio -pl`, `pax -rwl`), so
 *  the policy path is not among their own arguments. Named with the policy folder
 *  anywhere in the command, they count as touching it. */
const POLICY_STDIN_COPIERS = new Set(['cpio', 'pax']);
/** A script call that makes another name for a file: a hard link writes straight
 *  through to the original, so for the policy files it counts as a write. */
const SCRIPT_LINK_CALL = /\b(?:os\.link|os\.symlink|link|symlink|hardlink_to|link_to)\s*\(/;
const scriptMutates = (script: string): boolean => scriptWrites(script) || SCRIPT_LINK_CALL.test(script);

export const POLICY_READ_VERBS = new Set([
  // read a file
  'cat', 'head', 'tail', 'nl', 'od', 'strings', 'fold',
  // search it
  'grep', 'egrep', 'fgrep',
  // parse it
  'jq', 'gojq',
  // compare it
  'diff', 'cmp', 'comm',
  // count, slice, reshape
  'wc', 'cut', 'paste', 'join', 'tr', 'column',
  // ask about it
  'ls', 'find', 'stat', 'du', 'df', 'realpath', 'readlink', 'basename', 'dirname',
  // checksum it
  'md5', 'md5sum', 'shasum', 'sha1sum', 'sha256sum', 'cksum',
  // copy it ELSEWHERE: a write among the operands is caught before this list
  'cp',
  // say its name
  'echo', 'printf', 'true', 'false', ':', 'test', '[',
  // move around
  'cd', 'pwd', 'pushd', 'popd',
]);

/**
 * Git subcommands that change the work tree without naming a path. In the repository
 * that holds the policy directory (the hive is one), `git checkout HEAD~1 -- policy/`,
 * `git stash -u` or `git reset --hard` rewrite the rules as surely as an editor.
 */
const GIT_WORKTREE_WRITERS = new Set([
  'checkout', 'restore', 'reset', 'stash', 'clean', 'rm', 'mv', 'apply', 'am', 'merge', 'pull',
  'rebase', 'switch', 'cherry-pick', 'revert', 'read-tree', 'checkout-index', 'filter-branch',
]);
/** Git's global flags that take a value, before the subcommand. */
const GIT_VALUE_FLAGS = new Set(['-C', '-c', '--git-dir', '--work-tree', '--namespace', '--exec-path', '--super-prefix', '--config-env']);
/**
 * Git settings that change what a later git command runs or where it writes: an alias
 * can be `reset --hard`, a hooks path runs a script on commit, and core.worktree moves
 * the work tree. Set with `-c` or `git config` in the hive's repository, each turns a
 * harmless-looking git command into a rewrite of the rules.
 */
const GIT_REDIRECTING_KEY = /^(?:alias\.|core\.(?:worktree|hookspath|fsmonitor|sshcommand)$|include\.|includeif\.)/i;

export type PolicyDecision = 'allow' | 'deny' | 'ask';
export type PolicyMode = 'dry_run' | 'live';

export interface PolicyRule {
  id: string;
  description?: string;
  /** What a match does in live mode. Absent means deny. */
  decision?: Exclude<PolicyDecision, 'allow'>;
  /** live: the decision applies. dry_run: the match is only recorded. Absent means
   *  the file's default, which is dry_run. */
  mode?: PolicyMode;
  /** If the rule cannot be evaluated: abstain (allow) or count it as a match (deny). */
  on_error?: 'allow' | 'deny';
  reason: string;
  /** Only these agents (guardrail.json `agents`); absent means every agent. */
  agents?: string[];
  match: {
    tool?: string | string[];
    path_glob?: string;
    path_not_glob?: string;
    command_matches?: string;
    command_not_matches?: string;
  };
}

export interface PolicyFile {
  version?: number;
  defaults?: { mode?: PolicyMode; on_error?: 'allow' | 'deny' };
  rules?: PolicyRule[];
}

/** Per-evaluation scratch, so one payload is parsed once however many rules read it. */
interface EvalContext {
  commands: EffectiveCommand[] | null;
  /** False for an unauthenticated hook: the verdict still applies, but no row is
   *  written under the agent it claims to be; the hook server logs it instead. */
  record: boolean;
}

export interface PolicyPayload {
  hook_event_name?: string;
  agent_id?: string | null;
  tool_name?: string;
  tool_input?: unknown;
  /**
   * The directory the AGENT's shell is in, from the hook payload.
   *
   * Load-bearing, not a nicety. Without it a relative path resolves against
   * `process.cwd()` — the Electron main process — so `echo x > ../kelly/memory.md`,
   * which is how an agent sitting in its own folder writes to a sibling, resolved to
   * a path under the app's working directory and matched nothing. Only an explicit
   * absolute `cd` in the same command rescued it. It can also misfire the other way,
   * if the app's own cwd ever sits inside some agent's folder.
   *
   * SECURITY-RELEVANT AND AGENT-CONTROLLED. This value is read straight from the hook
   * payload, so an agent that wants to can send a `cwd` that is not where it is — `/`,
   * `/tmp`, `""` — and turn a relative cross-agent write back into an allow. That sits
   * inside the declared threat model at the top of this file (the transport is fail-open
   * by construction; this is a salience aid against disguise and forgetfulness, not a
   * sandbox against a hostile agent), but it is a NEW field in that category and worth
   * naming rather than leaving to be discovered. A cwd that is merely MISSING is
   * different: that is recorded as an `missing_cwd` blind spot in the ledger.
   */
  cwd?: string;
}

/** What `evaluate` decided. `{ decision: 'allow' }` alone when no rule matches. */
export interface PolicyVerdict {
  decision: PolicyDecision;
  /** The first rule this call matches, if any. */
  ruleId?: string;
  reason?: string;
  mode?: PolicyMode;
  /** Which matcher key decided it, so a reviewer can see whether a glob or a regex
   *  produced a questionable match. */
  matchedOn?: string;
  /** True when a dry_run rule matched: what live mode would have done is recorded,
   *  and the call proceeds. */
  wouldDeny?: boolean;
}

/**
 * Glob → RegExp for the path matchers.
 *
 * `**` crosses separators, `*` does not, `?` is one non-separator character.
 * Hand-rolled rather than taken from a dependency: this is two dozen lines, it
 * runs in front of every tool call, and an upstream PR that adds a runtime
 * dependency to evaluate three rules is a harder sell than one that adds none.
 */
export function globToRegExp(glob: string): RegExp {
  let out = '';
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i];
    if (c === '*') {
      if (glob[i + 1] === '*') {
        // `**/` should also match zero directories, so `**/a` matches `/a`.
        if (glob[i + 2] === '/') { out += '(?:.*/)?'; i += 2; }
        else if (i === glob.length - 2 && out.endsWith('/')) {
          // A trailing `/**` also matches the directory ITSELF: the rule
          // "nothing under agents/<x>/" has to include `rm -rf agents/<x>`, which removes
          // everything under it and names no path inside it.
          out = out.slice(0, -1) + '(?:/.*)?';
          i += 1;
        } else { out += '.*'; i += 1; }
      } else {
        out += '[^/]*';
      }
    } else if (c === '?') {
      out += '[^/]';
    } else if ('\\^$.|+()[]{}'.includes(c)) {
      out += '\\' + c;
    } else {
      out += c;
    }
  }
  return new RegExp('^' + out + '$');
}

/**
 * Normalise a payload path to an absolute, forward-slash, symlink-resolved form.
 *
 * Symlinks are resolved because a glob compares strings: without it,
 * `/tmp/shortcut/memory.md` and the agent folder it points into are different
 * subjects, and the shorter one is not covered by any rule. Resolution walks back
 * to the longest existing prefix, so a file that does not exist yet — the normal
 * case for a write — still normalises through a symlinked parent.
 */
export function normalisePath(p: string, cwd?: string): string {
  return realAbsolute(p, cwd ?? process.cwd());
}

/**
 * Substitute the one supported interpolation, `${AGENT_ID}`.
 *
 * Returns null when the glob needs an agent id and the payload has none. That
 * null is load-bearing: an unresolved `${AGENT_ID}` must make the rule FAIL TO
 * MATCH, never match everything. A payload with no agent id is a harness we
 * cannot attribute, and silently applying an ownership rule to it would match
 * every write on the floor.
 */
export function interpolate(pattern: string, agentId: string | null | undefined): string | null {
  if (!pattern.includes('${AGENT_ID}')) return pattern;
  if (!agentId) return null;
  return pattern.split('${AGENT_ID}').join(agentId);
}

export class PolicyEngine {
  private rules: PolicyRule[] = [];
  private policyPath: string;
  private policyDir: string;
  private loadError: string | null = null;
  /** True once a policy file has been found on disk. An install with no policy file
   *  behaves byte-identically: nothing evaluated, nothing logged. */
  private configured = false;
  private defaults: { mode: PolicyMode; on_error: 'allow' | 'deny' } = { mode: 'dry_run', on_error: 'allow' };
  private loadedAt: string | null = null;
  private ignoredFile: string | null = null;

  /** Denominator for the false-positive rate. Counted in memory, never logged
   *  per action: calls that match nothing are the overwhelming majority and
   *  appendLog is a synchronous append, so logging them would put a disk write in
   *  front of every tool call of every agent. */
  private stats = { evaluated: 0, matched: 0, denied: 0, asked: 0, unresolved: 0, unresolved_unlogged: 0 };
  private lastStatsFlush = Date.now();
  /** Blind-spot rows written in the current stats interval. */
  private unresolvedLogged = 0;

  constructor(
    hiveRoot: string | null,
    private log: (row: Record<string, unknown>) => void,
    /** Providers whose bridge cannot receive a decision (a fixed list from the
     *  caller), named in the load row instead of left to be discovered. */
    private unenforceableProviders: () => string[] = () => [],
    /** Has the operator turned the guardrail on? Read from the app config, which
     *  agents cannot write, because the policy folder is theirs to write until a
     *  policy is loaded. Off: guardrail.json is not loaded. */
    private turnedOn: () => boolean = () => false
  ) {
    this.policyDir = hiveRoot ? join(hiveRoot, 'policy') : '';
    this.policyPath = this.policyDir ? join(this.policyDir, ENGINE_POLICY_FILE) : '';
  }

  /**
   * Load the policy once, when the app starts.
   *
   * Reload only on an explicit operator action — deliberately NO filesystem
   * watcher. A watcher turns "edit the file" into "disarm the guardrail" with no
   * human in the loop, which is the opposite of what this is for.
   */
  load(): void {
    this.rules = [];
    this.loadError = null;
    this.configured = false;
    this.loadedAt = null;
    this.ignoredFile = null;
    // A reload starts from the built-in defaults, so a removed on_error does not
    // stick until the next start.
    this.defaults = { mode: 'dry_run', on_error: 'allow' };
    if (!this.policyDir) return;
    this.policyPath = join(this.policyDir, GUARDRAIL_FILE);
    if (!existsSync(this.policyPath)) return; // unconfigured → inert
    if (!this.turnedOn()) {
      // Not loaded, and so not protected either: still inert. Said once, so an operator
      // who meant to turn it on finds out, and one who did not learns a file is there.
      this.ignoredFile = this.policyPath;
      this.log({ kind: 'policy-ignored', path: this.policyPath, reason: 'the guardrail is not turned on in the app config' });
      return;
    }
    this.configured = true;
    const g = readGuardrail(this.policyPath);
    if (!g.ok) {
      // Refuse a half-read policy. Partial enforcement is worse than none, because it
      // is believed.
      this.fail(g.error);
      return;
    }
    this.loadRules({
      version: 1,
      ...(g.file.defaults?.on_error ? { defaults: { on_error: g.file.defaults.on_error } } : {}),
      rules: toEngineRules(g.file),
    }, this.policyPath);
  }

  /**
   * Load rules already in the engine's own shape: what `load` does once it has read
   * guardrail.json, and the seam for building rules in memory (the tests use it to
   * drive the engine without a file). Replaces whatever was loaded.
   */
  loadRules(parsed: PolicyFile, source = '(in memory)'): void {
    this.rules = [];
    this.loadError = null;
    this.loadedAt = null;
    this.defaults = { mode: 'dry_run', on_error: 'allow' };
    this.configured = true;
    this.policyPath = source;
    try {
      // A validated guardrail.json with no backstops on, or no rules at all, enforces
      // nothing ON PURPOSE: deleting every rule must not read as a broken file.
      this.loadParsed(parsed);
    } catch (e) {
      // A file that parses but has the wrong shape must not leave `configured: true,
      // error: null` behind, which reads as healthy. Nothing that happens past the
      // parse may leave the engine silently enforcing nothing.
      this.rules = [];
      this.loadedAt = null;
      this.fail(`policy file could not be read as rules: ${e instanceof Error ? e.message : String(e)}`);
    }
  }

  /** Everything after the JSON parse. Split out so `load` can guarantee that a throw
   *  becomes a logged failure instead of a quiet zero. */
  private loadParsed(parsed: PolicyFile): void {
    if (parsed === null || typeof parsed !== 'object' || Array.isArray(parsed)) {
      this.fail(`policy file must be a JSON object with a "rules" array, got ${parsed === null ? 'null' : Array.isArray(parsed) ? 'an array' : typeof parsed}`);
      return;
    }
    if (parsed.rules !== undefined && !Array.isArray(parsed.rules)) {
      this.fail(`"rules" must be an array, got ${parsed.rules === null ? 'null' : typeof parsed.rules}`);
      return;
    }
    const invalid: Array<{ id: string; why: string }> = [];
    const rules: PolicyRule[] = [];
    for (const rule of parsed.rules ?? []) {
      const why = this.validate(rule);
      if (why) { invalid.push({ id: rule?.id ?? '(no id)', why }); continue; }
      rules.push(rule);
    }
    if (invalid.length) {
      this.fail(invalid.map((i) => `${i.id}: ${i.why}`).join('; '), invalid);
      return; // all-or-nothing: a policy you cannot fully trust is not loaded
    }
    if (parsed.defaults?.mode) this.defaults.mode = parsed.defaults.mode;
    if (parsed.defaults?.on_error) this.defaults.on_error = parsed.defaults.on_error;
    this.rules = rules;
    this.loadedAt = new Date().toISOString();

    const gaps = this.unenforceableProviders();
    this.log({
      kind: 'policy-loaded',
      path: this.policyPath,
      rules_loaded: rules.length,
      rules: rules.map((r) => ({ id: r.id, decision: r.decision ?? 'deny', mode: r.mode ?? this.defaults.mode })),
      // Named, not a static warning. A generic "some providers may not be
      // governed" gets skimmed; a list of the agents running right now does not.
      unenforceable_providers: gaps,
    });
  }

  /** A configured policy that loaded no rules. One place, so every failure is logged
   *  the same way and `status` reports the same string the log carries. */
  private fail(error: string, invalid?: Array<{ id: string; why: string }>): void {
    this.loadError = error;
    this.log({ kind: 'policy-load-failed', path: this.policyPath, rules_loaded: 0, error, ...(invalid ? { invalid } : {}) });
  }

  /** The single answer to "is the guardrail enforcing anything?". */
  get status(): PolicyStatus {
    return {
      configured: this.configured,
      file: this.configured ? this.policyPath : null,
      rulesLoaded: this.rules.length,
      ruleIds: this.rules.map((r) => r.id),
      error: this.loadError,
      loadedAt: this.loadedAt,
      ignored: this.ignoredFile,
    };
  }

  /** Reason a rule is unusable, or null. Rejected at load, never at evaluation. */
  private validate(rule: PolicyRule): string | null {
    if (!rule || typeof rule !== 'object') return 'not an object';
    if (!rule.id) return 'missing id';
    if (rule.decision !== undefined && rule.decision !== 'deny' && rule.decision !== 'ask') return `decision must be deny or ask, got ${String(rule.decision)}`;
    if (rule.mode !== undefined && rule.mode !== 'dry_run' && rule.mode !== 'live') return `mode must be dry_run or live, got ${String(rule.mode)}`;
    if (!rule.reason) return 'missing reason: a refusal with no sanctioned alternative makes an agent retry or route around it';
    if (!rule.match || typeof rule.match !== 'object') return 'missing match';
    const keys = Object.keys(rule.match);
    if (!keys.length) return 'match is empty: it would fire on every tool call';
    for (const k of keys) {
      if (!(MATCHERS as readonly string[]).includes(k)) return `unknown matcher "${k}"`;
    }
    for (const k of ['path_glob', 'path_not_glob'] as const) {
      const g = rule.match[k];
      // An unanchored glob such as "agents/*/**" would match relative to nothing.
      if (g && !g.startsWith('/') && !g.startsWith('**')) return `${k} must be absolute or start with ** (got "${g}")`;
    }
    for (const k of ['command_matches', 'command_not_matches'] as const) {
      const r = rule.match[k];
      if (r) { try { new RegExp(r); } catch (e) { return `${k} is not a valid regex: ${String(e)}`; } }
    }
    if (rule.on_error && rule.on_error !== 'allow' && rule.on_error !== 'deny') return `on_error must be allow or deny, got ${String(rule.on_error)}`;
    return null;
  }

  /**
   * True when this payload WRITES to the policy file or its directory.
   *
   * Write/Edit/NotebookEdit are exact — the path is a field. Bash is matched by
   * looking for the policy directory in the command together with a write
   * indicator, so that reading the policy (to explain a deny, say) stays allowed
   * while rewriting it does not. That is deliberately under-inclusive on the long
   * tail: a script given the path indirectly is not caught, and no regex would.
   * The tools that do the overwhelming majority of writes are matched exactly.
   */
  private targetsPolicy(p: PolicyPayload, ctx: EvalContext): boolean {
    if (!this.policyDir) return false;
    const dir = normalisePath(this.policyDir);
    const under = (path: string) => {
      const abs = normalisePath(path, p.cwd);
      return abs === dir || abs.startsWith(dir + '/');
    };
    const tool = p.tool_name;
    if (tool === 'Write' || tool === 'Edit' || tool === 'NotebookEdit') {
      return this.paths(p, ctx).some(under);
    }
    if (tool === 'Bash') {
      const input = (p.tool_input ?? {}) as Record<string, unknown>;
      const cmd = typeof input.command === 'string' ? input.command : '';
      if (!cmd) return false;
      const commands = this.commands(p, ctx);
      // 1. A resolved path the command mutates: written INTO, or taken away. `mv
      //    <policy>/guardrail.json /tmp/` disables every rule on the floor in one
      //    command, so a source a verb removes counts as a mutation of where it was.
      for (const c of commands) if (c.writes.some(under) || c.removes.some(under)) return true;
      // 1b. Taking away a folder that CONTAINS the policy directory: `rm -rf <hive>`,
      //     `mv <hive> /tmp/h`. Neither names a path inside it.
      for (const x of this.destroyPaths(p, ctx)) if (x === '/' || dir.startsWith(x + '/')) return true;
      // 1c. Rolling the rules back through git, which names no path in the folder:
      //     `git -C <hive> checkout HEAD~1 -- policy/`, or `git stash -u` run from an
      //     agent's own folder, which is inside the hive's repository.
      if (this.gitRewritesPolicy(commands, dir, cmd, p.cwd)) return true;
      // 1d. A script that writes and names the hive root itself as a literal, with the
      //     rest of the path built at run time: `open(os.path.join('<hive>', 'policy',
      //     ...), 'w')`. Naming the policy directory or a path in it is caught below.
      const hive = dir.slice(0, dir.lastIndexOf('/')) || '/';
      for (const c of commands) {
        const script = inlineScript(c.argv);
        if (script === null || !scriptMutates(script)) continue;
        if (scriptLiterals(script).some((l) => (normalisePath(l, p.cwd).replace(/\/+$/, '') || '/') === hive)) return true;
      }
      // 1e. A copier fed file names on stdin: `cpio -pl <own> <<< <policy>/guardrail.json`.
      if (cmd.includes(this.policyDir) || cmd.includes(dir)) {
        for (const c of commands) if (POLICY_STDIN_COPIERS.has(verbOf(c.argv))) return true;
      }
      // 2. THE INVERTED DEFAULT. A segment that names a path inside the policy
      //    directory is denied unless its verb is a known reader. This is what closes
      //    the class the previous string heuristic could only chase one verb at a time.
      for (const c of commands) {
        if (!this.segmentTouchesPolicy(c, dir, p.cwd)) continue;
        // Could not read the command AND it names the directory. Only a STRUCTURAL blind
        // spot counts: a path whose value is a guess does not mean the parse is wrong,
        // and `cp <policy>/guardrail.json mine.json` is still a read.
        if (c.unresolved.some((u) => STRUCTURAL_UNRESOLVED.has(u.code))) return true;
        const verb = verbOf(c.argv);
        const script = inlineScript(c.argv);
        // An interpreter is judged by its script, not its name: a script that names the
        // directory, or a path in it, and writes is a write.
        if (script !== null) { if (scriptMutates(script)) return true; continue; }
        if (!POLICY_READ_VERBS.has(verb)) return true;
        const unless = POLICY_READ_VERB_UNLESS[verb];
        if (unless && c.argv.slice(1).some((a) => unless.test(a))) return true;
      }
      // 3. The old string heuristic, per segment, still there for a segment that does
      //    not resolve a policy path but looks like it mutates one anyway.
      for (const c of commands) {
        if (c.verbWrites.length) continue;
        if (c.text.includes(this.policyDir) && POLICY_WRITE_SHAPE.test(c.text)) return true;
      }
      // 4. Only when the parser says it could not read this command do we fall back to
      //    the whole string, because then the segmentation above cannot be trusted.
      if (commands.some((c) => c.unresolved.some((u) => STRUCTURAL_UNRESOLVED.has(u.code)))) {
        return cmd.includes(this.policyDir) && POLICY_WRITE_SHAPE.test(cmd);
      }
      return false;
    }
    return false;
  }

  /**
   * True when a git command in this call can rewrite the policy directory: a work tree
   * writer, or a setting that redirects a later one, run in the hive's repository.
   *
   * Git finds its repository by walking UP from where it runs, so anywhere inside the
   * hive (an agent's own folder included) is the hive's repository. Where it runs is
   * the payload cwd, moved by each `cd` or `pushd`, then by `-C`, `--work-tree`,
   * `--git-dir` or `-c core.worktree`, and by GIT_DIR or GIT_WORK_TREE in the command.
   * An unknown global flag is stepped over as a switch; the subcommand that follows is
   * still checked.
   */
  private gitRewritesPolicy(commands: EffectiveCommand[], dir: string, cmd: string, cwd?: string): boolean {
    const hive = dir.slice(0, dir.lastIndexOf('/')) || '/';
    const strip = (x: string) => x.replace(/\/+$/, '') || '/';
    // The policy directory, a folder that contains it, or anywhere in the hive. That
    // includes a separate repository nested in the hive (an agent's clone): telling it
    // apart means reading the disk, and the same command can remove its `.git` before
    // git runs, so git that changes files is denied there too (a stated limit).
    const covers = (path: string) => {
      const r = strip(path);
      return dir.startsWith(r === '/' ? '/' : r + '/') || r === dir || r === hive || r.startsWith(hive + '/');
    };
    // GIT_DIR and GIT_WORK_TREE move the repository without a flag: as a prefix, through
    // `env`, or exported earlier in the command. The parser binds assignments and keeps
    // them out of argv, so they are read from the command text. A value that cannot be
    // read (a variable, a substitution, no `=` at all) counts as the hive.
    const envRepos: Array<string | null> = [];
    for (const m of cmd.matchAll(/\bGIT_(DIR|WORK_TREE)\b(?:=("[^"]*"|'[^']*'|[^\s;&|()]*))?/g)) {
      const v = m[2]?.replace(/^(["'])(.*)\1$/, '$2');
      envRepos.push(!v || /[$`]/.test(v) ? null : m[1] === 'DIR' ? `${v}/..` : v);
    }
    let here = cwd;
    for (const c of commands) {
      const base = (c.argv[0] ?? '').split('/').pop() ?? '';
      if ((base === 'cd' || base === 'pushd') && c.argv[1] && !c.argv[1].startsWith('-')) { here = normalisePath(c.argv[1], here); continue; }
      if (base !== 'git') continue;
      // Where git starts (cwd, then each -C), and any work tree or repository named on
      // top of that.
      let repo = normalisePath(here ?? '.', here);
      const where: string[] = [];
      let redirects = false;
      let i = 1;
      while (i < c.argv.length && c.argv[i].startsWith('-')) {
        const a = c.argv[i];
        const eq = a.indexOf('=');
        const name = eq > 0 ? a.slice(0, eq) : a;
        if (!GIT_VALUE_FLAGS.has(name)) { i += 1; continue; }
        const value = eq > 0 ? a.slice(eq + 1) : (c.argv[i + 1] ?? '');
        if (name === '-C') repo = normalisePath(value, repo);
        else if (name === '--work-tree') where.push(normalisePath(value, repo));
        else if (name === '--git-dir') { const g = normalisePath(value, repo); where.push(g.slice(0, g.lastIndexOf('/')) || '/'); }
        else if (name === '-c' && GIT_REDIRECTING_KEY.test(value.split('=')[0])) {
          redirects = true;
          if (/^core\.worktree=/i.test(value)) where.push(normalisePath(value.slice(value.indexOf('=') + 1), repo));
        }
        i += eq > 0 ? 1 : 2;
      }
      const sub = c.argv[i] ?? '';
      const args = c.argv.slice(i + 1);
      // `git config core.worktree <hive>` or an alias set in the hive's repository.
      const key = sub === 'config' ? args.find((a) => !a.startsWith('-')) ?? '' : '';
      const configures = GIT_REDIRECTING_KEY.test(key) && args.indexOf(key) < args.length - 1;
      if (configures && /^core\.worktree$/i.test(key)) where.push(normalisePath(args[args.indexOf(key) + 1], repo));
      if (!GIT_WORKTREE_WRITERS.has(sub) && !redirects && !configures) continue;
      where.push(repo);
      for (const v of envRepos) { if (v === null) return true; where.push(normalisePath(v, repo)); }
      if (where.some(covers)) return true;
      // An operand that holds the policy directory: `git checkout HEAD~1 -- <hive>`.
      if (args.some((a) => { if (a.startsWith('-')) return false; const x = strip(normalisePath(a, repo)); return x === dir || dir.startsWith(x === '/' ? '/' : x + '/'); })) return true;
    }
    return false;
  }

  /**
   * Every path this payload would write, across tools and bash redirection.
   *
   * For a tool with a path FIELD the answer is that field — exact, and unchanged.
   * For Bash it is what shell.ts says the command writes, which is the half that
   * used to be missing entirely: a rule saying "not outside your own folder"
   * described `Write` and said nothing about `cat x > …`, `cp … other/`,
   * `sed -i … other/f` or `node -e "writeFileSync(…)"`, which is how a bash-first
   * agent writes files.
   */
  private paths(p: PolicyPayload, ctx: EvalContext): string[] {
    const input = (p.tool_input ?? {}) as Record<string, unknown>;
    const out: string[] = [];
    for (const f of PATH_FIELDS) {
      const v = input[f];
      if (typeof v === 'string' && v) out.push(v);
    }
    if (p.tool_name === 'Bash') {
      for (const c of this.commands(p, ctx)) {
        out.push(...c.writes);
        // …and the paths a verb takes AWAY. `mv <other agent>/memory.md /tmp/` destroys
        // their file as surely as writing over it, and an ownership rule that only looks
        // at where a write LANDS calls that a read.
        out.push(...c.removes);
      }
    }
    return out;
  }

  /**
   * The paths this payload REMOVES wholesale, normalised with no trailing slash: the
   * targets of a deleting verb (rm, rmdir, unlink, shred, a deleting find, xargs rm)
   * and the sources a verb takes away (mv). Only these can "contain" the paths a glob
   * protects — `cp report.md <hive>/` writes INTO a directory and leaves its contents
   * alone, so it must not count as destroying everything under it.
   */
  private destroyPaths(p: PolicyPayload, ctx: EvalContext): string[] {
    if (p.tool_name !== 'Bash') return [];
    const out: string[] = [];
    for (const c of this.commands(p, ctx)) {
      const verb = (c.argv[0] ?? '').split('/').pop() ?? '';
      const targets = [...c.removes, ...(DESTROY_VERBS.has(verb) ? c.verbWrites : [])];
      for (const t of targets) out.push(normalisePath(t, p.cwd).replace(/\/+$/, '') || '/');
    }
    return out;
  }

  /** shell.ts output for this payload, parsed once per evaluation and reused by
   *  every rule — parsing is the only non-trivial cost in front of a tool call. */
  private commands(p: PolicyPayload, ctx: EvalContext): EffectiveCommand[] {
    if (ctx.commands) return ctx.commands;
    const input = (p.tool_input ?? {}) as Record<string, unknown>;
    const cmd = typeof input.command === 'string' ? input.command : '';
    ctx.commands = cmd ? effectiveCommands(cmd, p.cwd) : [];
    return ctx.commands;
  }

  /**
   * Evaluate one payload.
   *
   * Only PreToolUse is considered; every other event returns allow untouched.
   */
  evaluate(p: PolicyPayload, opts: { record?: boolean } = {}): PolicyVerdict {
    if (p.hook_event_name !== 'PreToolUse') return { decision: 'allow' };
    if (!this.configured) return { decision: 'allow' }; // unconfigured → byte-identical

    const ctx: EvalContext = { commands: null, record: opts.record !== false };
    const verdict = this.decide(p, ctx);
    // AFTER the verdict, and it cannot change it — the row carries the decision that
    // was actually returned, so a reader can tell a blind spot that was allowed from
    // one a rule caught anyway.
    if (ctx.record) this.recordUnresolved(p, ctx, verdict);
    return verdict;
  }

  /** The rules, in order. Split out so every return path is one `evaluate` call. */
  private decide(p: PolicyPayload, ctx: EvalContext): PolicyVerdict {
    if (ctx.record) this.stats.evaluated++;
    this.maybeFlushStats();

    // Invariant, ahead of user rules and not overridable by config: an agent that
    // can edit the policy file makes every rule advisory. This holds even with no
    // policy loaded, which is why it is part of the mechanism and not a rule.
    if (this.configured && this.targetsPolicy(p, ctx)) {
      const verdict: PolicyVerdict = {
        decision: 'deny',
        ruleId: 'policy-self-protection',
        mode: 'live',
        matchedOn: 'policy_path',
        reason:
          'The policy file governs every agent, so no agent may edit it. If a rule is wrong, '
          + 'say which rule and why in your reply: the operator changes it.',
      };
      this.record(p, verdict, ctx);
      return verdict;
    }

    for (const rule of this.rules) {
      // A backstop for named agents is not this agent's: it neither fires nor errors.
      if (rule.agents && !(p.agent_id && rule.agents.includes(p.agent_id))) continue;
      let hit: string | null;
      try {
        hit = this.matches(rule, p, ctx);
      } catch (e) {
        // Per-rule failure posture. An evaluator exception is something the app can
        // see, unlike a call the app never received — see the transport
        // note at the top of this file.
        const posture = rule.on_error ?? this.defaults.on_error;
        this.log({
          kind: 'policy-rule-error', rule_id: rule.id, on_error: posture,
          error: e instanceof Error ? e.message : String(e),
        });
        if (posture === 'deny') {
          // Fail closed means "count it as a match", so a dry_run rule still only logs.
          const mode = rule.mode ?? this.defaults.mode;
          const reason = `${rule.reason} (this rule could not be evaluated and is configured to fail closed)`;
          const verdict: PolicyVerdict = mode === 'dry_run'
            ? { decision: 'allow', ruleId: rule.id, mode, matchedOn: 'error', reason, wouldDeny: true }
            : { decision: rule.decision ?? 'deny', ruleId: rule.id, mode, matchedOn: 'error', reason };
          this.record(p, verdict, ctx);
          return verdict;
        }
        continue; // fail open: this rule abstains, later rules still run
      }
      if (!hit) continue;

      const mode = rule.mode ?? this.defaults.mode;
      // dry_run: record the match and let the call run. A false positive can only be
      // measured while nothing is stopped: a deny would already have cut off the work a
      // reviewer needs to judge it.
      const verdict: PolicyVerdict = mode === 'dry_run'
        ? { decision: 'allow', ruleId: rule.id, reason: rule.reason, mode, matchedOn: hit, wouldDeny: true }
        : { decision: rule.decision ?? 'deny', ruleId: rule.id, reason: rule.reason, mode, matchedOn: hit };
      this.record(p, verdict, ctx);
      return verdict;
    }
    return { decision: 'allow' };
  }

  /** Which matcher key fired, or null if the rule does not match. */
  private matches(rule: PolicyRule, p: PolicyPayload, ctx: EvalContext): string | null {
    const m = rule.match;
    let matchedOn: string | null = null;

    if (m.tool !== undefined) {
      const want = Array.isArray(m.tool) ? m.tool : [m.tool];
      if (!p.tool_name || !want.includes(p.tool_name)) return null;
      matchedOn = 'tool';
    }

    if (m.command_matches !== undefined || m.command_not_matches !== undefined) {
      const input = (p.tool_input ?? {}) as Record<string, unknown>;
      const cmd = typeof input.command === 'string' ? input.command : '';
      // The raw string AND every command the parser says this call runs. Raw is
      // kept so a pack written against the old behaviour keeps working; the
      // parsed forms are what let a rule be anchored at ^ and still catch
      // `sudo`, `eval`, `$VAR`, an absolute path or a `bash -c` wrapper.
      const subjects = cmd ? [cmd, ...this.commands(p, ctx).map((c) => c.text)] : [];
      if (m.command_matches !== undefined) {
        const re = new RegExp(m.command_matches);
        if (!subjects.some((s) => re.test(s))) return null;
        matchedOn = 'command_matches';
      }
      if (m.command_not_matches !== undefined) {
        const re = new RegExp(m.command_not_matches);
        if (subjects.some((s) => re.test(s))) return null;
      }
    }

    if (m.path_glob !== undefined || m.path_not_glob !== undefined) {
      const paths = this.paths(p, ctx).map((x) => normalisePath(x, p.cwd));
      if (!paths.length) return null;

      // Judged PER PATH, not per payload. With one path field the two are the
      // same thing, which is why this never mattered before; a Bash command can
      // write several places at once, and `tee mine/a theirs/b` must not exempt
      // itself with the half that is allowed.
      let negative: RegExp | null = null;
      if (m.path_not_glob !== undefined) {
        const pattern = interpolate(m.path_not_glob, p.agent_id);
        // A negative glob that cannot be resolved cannot exempt anything, so the
        // rule must not fire at all rather than fire on every agent's own files.
        if (pattern === null) return null;
        negative = globToRegExp(pattern);
      }
      const eligible = negative ? paths.filter((x) => !negative!.test(x)) : paths;
      if (!eligible.length) return null;

      if (m.path_glob !== undefined) {
        const pattern = interpolate(m.path_glob, p.agent_id);
        if (pattern === null) return null; // unresolved ${AGENT_ID} must not match
        const re = globToRegExp(pattern);
        // A removal of a directory that CONTAINS matching paths counts too: `rm -rf
        // hive/agents` names no path inside any agent folder and empties all of them.
        const destroyed = new Set(this.destroyPaths(p, ctx));
        const hit = eligible.some((x) => re.test(x)
          || (destroyed.has(x) && globContains(x, pattern, negative)));
        if (!hit) return null;
        matchedOn = 'path_glob';
      }
    }

    return matchedOn;
  }

  /**
   * One row per match, in log.jsonl and in the ledger. Never for a call that matches
   * nothing, and never the raw tool_input — tool inputs carry file contents and
   * secrets, so the row keeps a digest plus which matcher fired.
   */
  private record(p: PolicyPayload, v: PolicyVerdict, ctx: EvalContext): void {
    // An unauthenticated call is answered but not counted: forged traffic must not
    // move the rates an operator reads.
    if (!ctx.record) return;
    this.stats.matched++;
    if (v.decision === 'deny') this.stats.denied++;
    else if (v.decision === 'ask') this.stats.asked++;
    const row = {
      kind: 'policy-match',
      agent_id: p.agent_id ?? null,
      rule_id: v.ruleId,
      tool: p.tool_name,
      decision: v.decision,
      mode: v.mode,
      would_deny: v.wouldDeny ?? false,
      matched_on: v.matchedOn,
      input_digest: digest(p.tool_input),
    };
    this.log(row);
    this.appendLedger(row);
  }

  /**
   * One `unresolved` row per Bash payload the parser could not fully read.
   *
   * NO DECISION IS TAKEN FROM THIS. Failing closed on an unreadable command is a
   * separate call with a real cost — every `curl | sh` in ordinary build work would
   * start asking — so this deliberately only counts. `event: "unresolved"` and the
   * `codes` array are the query surface: `jq 'select(.event=="unresolved") | .codes'`
   * over the ledger answers "what are we blind to, and how often" without reading
   * prose.
   *
   * What is NOT in the row: the command. Rows go to a file an operator reads, and an
   * argument carries file contents and secrets — the same reason `record()` logs a
   * digest instead of the tool input. Each blind spot contributes a reason code and a
   * structural token (a placeholder, a program or variable NAME, a path), and the
   * digest ties the row back to the call if someone needs the rest.
   */
  private recordUnresolved(p: PolicyPayload, ctx: EvalContext, v: PolicyVerdict): void {
    if (p.tool_name !== 'Bash') return;
    const commands = ctx.commands;
    if (!commands?.length) return; // nothing was parsed, so nothing was hidden

    const seen = new Set<string>();
    const blind: Unresolved[] = [];
    for (const c of commands) {
      for (const u of c.unresolved) {
        const key = `${u.code}\u0000${u.detail}`;
        if (seen.has(key)) continue;
        seen.add(key);
        if (blind.length < MAX_UNRESOLVED_PER_ROW) blind.push(u);
      }
    }
    if (!blind.length) return;
    this.stats.unresolved++;
    if (this.unresolvedLogged >= MAX_UNRESOLVED_ROWS_PER_INTERVAL) { this.stats.unresolved_unlogged++; return; }
    this.unresolvedLogged++;

    const row = {
      kind: 'policy-unresolved',
      event: 'unresolved',
      agent_id: p.agent_id ?? null,
      tool: p.tool_name,
      decision: v.decision,
      rule_id: v.ruleId ?? null,
      codes: [...new Set(blind.map((u) => u.code))].sort(),
      unresolved: blind,
      input_digest: digest(p.tool_input),
    };
    this.log(row);
    this.appendLedger(row);
  }

  /**
   * Does this one command name a path inside the policy directory?
   *
   * Operands, redirection targets, and — for an inline script — the string literals in
   * it. Resolved, so a relative path or a symlink counts. A MENTION does not: the
   * operand of `echo "never edit <policy>/guardrail.json"` is a whole sentence, which
   * resolves under the cwd rather than under the policy directory, so prose about the
   * rules is not an attempt on them.
   */
  private segmentTouchesPolicy(c: EffectiveCommand, dir: string, cwd?: string): boolean {
    const under = (path: string) => {
      const abs = normalisePath(path, cwd);
      return abs === dir || abs.startsWith(dir + '/');
    };
    if (c.writes.some(under) || c.removes.some(under)) return true;
    const script = inlineScript(c.argv);
    if (script !== null && scriptLiterals(script).some(under)) return true;
    if (operandsOf(c.argv).some(under)) return true;
    // A path inside one word: `--output=<policy>/x`, or a sed script's `w <policy>/x`.
    // A word with spaces in it is prose (`git commit -m "see <policy>/x"`), except for
    // sed, whose script is where its write commands live. A known reader still passes.
    const sed = verbOf(c.argv) === 'sed';
    return c.argv.slice(1).some((a) => (a.includes(dir + '/') || a.includes(this.policyDir + '/')) && (sed || !/\s/.test(a)));
  }

  /**
   * Mirror a row into `<hive>/policy/guardrail.jsonl`, the ledger an operator reads:
   * every match and every logged blind spot, beside the rules file they came from.
   *
   * Best effort by construction: a ledger that cannot be written must never fail a
   * tool call, so every error is swallowed. The file is the audit trail, not the
   * mechanism.
   */
  private appendLedger(row: Record<string, unknown>): void {
    if (!this.policyDir) return;
    try {
      appendFileSync(
        join(this.policyDir, LEDGER_FILE),
        JSON.stringify({ id: ledgerId(), ts: new Date().toISOString(), ...row }) + '\n'
      );
    } catch { /* the ledger is evidence, never a dependency */ }
  }

  private maybeFlushStats(): void {
    if (Date.now() - this.lastStatsFlush < STATS_INTERVAL_MS) return;
    this.flushStats();
  }

  /**
   * Emit the denominator. Called hourly (lazily, on the next evaluation). The
   * headline metric is the false-positive RATE from reviewed match rows; this
   * supplies matches-per-N-evaluated, and the blind spots that were only counted.
   * It also opens a new window for blind-spot rows.
   */
  flushStats(): void {
    this.unresolvedLogged = 0;
    this.lastStatsFlush = Date.now();
    if (!this.stats.evaluated) return;
    this.log({ kind: 'policy-stats', ...this.stats });
    this.stats = { evaluated: 0, matched: 0, denied: 0, asked: 0, unresolved: 0, unresolved_unlogged: 0 };
  }

  /** Whether a policy file was found. False means fully inert: HookServer skips
   *  the engine entirely, so an unconfigured install evaluates nothing. */
  get active(): boolean { return this.configured; }
  get ruleCount(): number { return this.rules.length; }
  get error(): string | null { return this.loadError; }
  get path(): string { return this.policyPath; }
}

/**
 * Does the existing directory `dir` contain a path that `glob` matches and `negative`
 * does not? Grounded in the disk, not in the pattern: `rm -rf /tmp/build` must not
 * fire because a `hive/agents/x/y` COULD be created under it, only because one IS there.
 *
 * The glob is split at each segment boundary; where the head of the pattern matches
 * `dir` itself, the tail is walked into the real directory (a literal segment must
 * exist, a wildcard segment reads the entries, `**` stands for anything below). Bounded
 * by entry count and depth, and any fs error just means "not shown to contain".
 */
export function globContains(dir: string, glob: string, negative: RegExp | null): boolean {
  const full = globToRegExp(glob);
  const segs = glob.split('/');
  const probe = (d: string) => {
    const leaf = d.replace(/\/+$/, '') + '/\u0001';
    return full.test(leaf) && !(negative && negative.test(leaf));
  };
  const isDir = (d: string) => { try { return statSync(d).isDirectory(); } catch { return false; } };
  const walk = (d: string, rest: string[], depth: number): boolean => {
    if (depth > 8 || !isDir(d)) return false;
    if (!rest.length || rest[0] === '**') return probe(d);
    const [seg, ...tail] = rest;
    if (!/[*?]/.test(seg)) return walk(join(d, seg), tail, depth + 1);
    const re = globToRegExp(seg);
    let names: string[] = [];
    try { names = readdirSync(d).slice(0, 500); } catch { return false; }
    return names.some((n) => re.test(n) && walk(join(d, n), tail, depth + 1));
  };
  for (let k = segs.length - 2; k >= 0; k--) {
    const head = segs.slice(0, k + 1).join('/');
    if (!head || head === '**') continue;
    if (!globToRegExp(head).test(dir)) continue;
    if (walk(dir, segs.slice(k + 1), 0)) return true;
  }
  return false;
}

/** A short, sortable id for a ledger row. */
function ledgerId(): string {
  return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 8);
}

/** sha256 of the tool input, so a row is correlatable without storing content. */
export function digest(input: unknown): string {
  let s: string;
  try { s = JSON.stringify(input ?? null) ?? 'null'; } catch { s = '[unserialisable]'; }
  return 'sha256:' + createHash('sha256').update(s).digest('hex').slice(0, 16);
}
