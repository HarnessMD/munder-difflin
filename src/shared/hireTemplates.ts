/**
 * The two "start faster" helpers the Add Agent surfaces share: five briefing
 * templates (a role and a goal, ready to run) and the copy and paste prompt
 * that asks any AI for a hire manifest. Classic's AddAgentModal and PRO's
 * AgentSheet read the same copy from here, so the two never drift.
 *
 * The texts stay English on purpose: they become agent prompts. Only the
 * picker labels are translated, by each surface under its own keys.
 */

export type BriefingTemplateId =
  | 'repoJanitor'
  | 'docsWriter'
  | 'bugTriager'
  | 'researchAssistant'
  | 'releaseManager';

export interface BriefingTemplate {
  id: BriefingTemplateId;
  description: string;
  goal: string;
}

export const BRIEFING_TEMPLATES: BriefingTemplate[] = [
  {
    id: 'repoJanitor',
    description: 'keeps the codebase tidy and healthy',
    goal: 'Continuously hunt for dead code, lint errors, flaky tests, and small safe refactors. Fix the safe ones and leave a note for anything risky. Never change behavior without flagging it.'
  },
  {
    id: 'docsWriter',
    description: 'keeps docs in sync with the code',
    goal: 'Watch for code changes that outdate the README and docs, then update them. Write for newcomers and prefer concrete examples over prose.'
  },
  {
    id: 'bugTriager',
    description: 'investigates and root-causes bugs',
    goal: 'For each reported issue: reproduce it, find the root cause, then propose a minimal fix with evidence. No fixes without a confirmed root cause.'
  },
  {
    id: 'researchAssistant',
    description: 'gathers and summarizes information',
    goal: 'Research the questions you are given across multiple sources, verify the key claims, and return a concise, cited summary.'
  },
  {
    id: 'releaseManager',
    description: 'prepares and ships releases',
    goal: 'Track what has shipped since the last release, update the changelog and version, and draft clear release notes.'
  }
];

/** Copy and paste prompt the user hands to any AI to generate a hire manifest.
 *  It pins the exact JSON shape the importer accepts and ends with a fill-in
 *  section for the user's own details. Kept in sync with the HireManifest
 *  schema (src/shared/hire.ts): the provider allowlist is
 *  claude | codex | antigravity | cursor. */
export const HIRE_PROMPT = `You are designing a "hire" — a ready-to-spawn AI agent for Munder Difflin, an app that runs a team of CLI coding agents. Output ONE JSON object (a hire manifest) and nothing else.

Make the agent genuinely useful: give it a sharp role, a concrete standing goal, and a description that makes it behave like an expert operator of its CLI engine (Claude Code, Codex, or Antigravity/Gemini). It should know how to use the terminal, read and edit files, run and inspect commands, lean on available skills and MCP tools, keep notes in memory, and work autonomously toward its goal without hand-holding.

Return EXACTLY this shape (omit optional fields you don't need; keep the spec string verbatim):

{
  "spec": "munder-difflin/hire@1",
  "name": "Jim",
  "description": "one-line role — what this agent is for",
  "goal": "standing directive injected on every prompt — specific and outcome-oriented",
  "provider": "claude",
  "model": "claude-opus-5-5",
  "capabilities": ["code-review", "docs"],
  "isolate": false,
  "tokenCap": 2000000,
  "author": "your name"
}

Rules:
- "provider" MUST be one of: cursor | claude | codex | antigravity. "model" must be a real model id for that provider (e.g. gpt-5.6-luna-high, claude-opus-5-5, gpt-5-codex, "Gemini 3.1 Pro (High)").
- Do NOT include shell commands or any flags beyond these fields.
- Make "description" + "goal" concrete enough that the agent knows exactly what to do on its first turn.

--- ADD YOUR DETAILS BELOW (the AI should use these) ---
Role / what I want this agent to do:
Preferred engine (claude / codex / antigravity), if any:
Repos, tools, style, or constraints to respect:
`;
