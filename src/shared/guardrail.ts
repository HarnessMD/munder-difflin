/**
 * The shape of hive/policy/guardrail.json, shared by main and the Rules screen.
 * Logic lives in src/main/guardrail.ts and src/main/guardrailEditor.ts.
 */

/** What a backstop does when it fires. `block` denies the call, `ask` puts the call to
 *  the operator (Claude Code's permission prompt), `log` records what it would have done
 *  and lets the call run. */
export type BackstopDoes = 'block' | 'ask' | 'log';

/** What a backstop fires on. Every present key must match (AND). */
export interface BackstopMatch {
  tool?: string | string[];
  path_glob?: string;
  path_not_glob?: string;
  command_matches?: string;
  command_not_matches?: string;
}

export interface Backstop {
  on: boolean;
  does: BackstopDoes;
  match: BackstopMatch;
  /** What the agent is told when the backstop stops it. Defaults to the principle. */
  message?: string;
  /** If the backstop cannot be evaluated: let the call run (allow) or count it as a
   *  match (deny). */
  on_error?: 'allow' | 'deny';
}

export interface GuardrailRule {
  id: string;
  /** The sentence the rule stands for. */
  principle: string;
  /** 'all', or the agent ids the rule (and its backstop) apply to. */
  agents: 'all' | string[];
  why?: string;
  backstop?: Backstop;
}

export interface GuardrailFile {
  version: 1;
  /** Bumped on every save. */
  rev: number;
  defaults?: { on_error?: 'allow' | 'deny' };
  rules: GuardrailRule[];
}

/** What the Rules screen shows: the switch, the file, and what the engine loaded. */
export interface GuardrailView {
  /** The operator's switch in the app config. */
  on: boolean;
  exists: boolean;
  /** The file, or null when there is none or it does not validate. */
  file: GuardrailFile | null;
  /** The file's exact text, shown in full before the operator turns it on or accepts
   *  it: the rule list does not show every field. Null when there is no file. */
  text: string | null;
  /** Why the file cannot be used, when it exists but does not validate. */
  error: string | null;
  /** The fingerprint of the bytes shown. A save, turn-on or accept sends it back, so a
   *  file changed in between is never overwritten or approved unseen. */
  stamp: string | null;
  /** Is this file the one the operator last saved or accepted? */
  approved: boolean;
  /** What the engine has loaded right now. */
  engine: { loaded: boolean; rulesLoaded: number; error: string | null };
}

export type GuardrailResult = { ok: true; view: GuardrailView } | { ok: false; errors: string[] };
