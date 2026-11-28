/**
 * The principles in guardrail.json, as the text each agent is given.
 *
 * A rule's principle is a sentence an agent should hold for the whole session. A prompt
 * or a memory file is not enough for that: after a compaction, a resume or a long
 * session, an agent can lose it or treat it as old context. So the hook server puts the
 * agent's principles into its context at the start of a session, again on the first
 * hook after a compaction or resume, and again when a reload changes them (HookServer).
 *
 * The principles come from the policy engine's copy of guardrail.json, read at start
 * with its backstops, never from the file on each prompt: with no file at start the
 * policy folder is not protected, so whatever an agent writes there later must not reach
 * the others as the operator's words. With no guardrail.json nothing is delivered.
 */

/** One agent's principles at one revision of the file. */
export interface AgentPrinciples {
  rev: number;
  texts: string[];
}

/** The principles that apply to this agent: every rule for `all`, and every rule that
 *  names it. A backstop is not needed: a principle can stand alone. */
export function principlesFor(rules: Array<{ principle: string; agents: 'all' | string[] }>, agentId: string): string[] {
  return rules
    .filter((r) => r.agents === 'all' || r.agents.includes(agentId))
    .map((r) => r.principle.trim())
    .filter(Boolean);
}

/** The block an agent reads. Empty principles revoke what was delivered before. */
export function renderPrinciples(p: AgentPrinciples): string {
  if (!p.texts.length) {
    return `<rules rev="${p.rev}">\n[The operator removed your standing rules. Stop following the ones given earlier.]\n</rules>`;
  }
  return `<rules rev="${p.rev}">\nStanding rules from the operator. They hold for this whole session, including after a compaction:\n`
    + p.texts.map((t) => `- ${t}`).join('\n')
    + '\n</rules>';
}
