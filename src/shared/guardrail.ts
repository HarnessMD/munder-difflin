/**
 * The shape of hive/policy/guardrail.json, shared by main and (later) the renderer.
 * Logic lives in src/main/guardrail.ts.
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
