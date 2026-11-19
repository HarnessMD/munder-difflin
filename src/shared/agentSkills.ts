/**
 * ONE SKILL, TURNED OFF FOR ONE AGENT (0.5.6, founder 15 Oct 2026: "allow
 * users to unselect particular agent for particular skill").
 *
 * A skill is a folder in ~/.claude/skills, so every Claude Code agent on the
 * machine reads it. Nothing here touches that folder. `config.agentSkillsOff`
 * keeps, per agent id, the skill folder names a person unticked, beside
 * `agentMcp`; the launch path turns them into two keys of that agent's own
 * `--settings` file (hive.ts hookSettings), so only that agent loses the skill,
 * on its next start:
 *
 *   permissions.deny   `Skill(<name>)` and `Skill(<name> *)`. Claude Code
 *                      blocks a denied tool use in every permission mode,
 *                      bypassPermissions included, and permission lists from
 *                      every settings source are combined, so this adds to the
 *                      person's own rules and removes none.
 *                      https://code.claude.com/docs/en/skills (Restrict
 *                      Claude's skill access), .../permission-modes,
 *                      .../settings (Lists merge instead of overriding)
 *   skillOverrides     `"<name>": "off"`: the skill is not listed to Claude
 *                      and `/name` is hidden, so the agent does not reach for
 *                      a skill it would only be refused.
 *                      https://code.claude.com/docs/en/settings-reference
 *                      (skillOverrides: any settings file, `--settings` named)
 *
 * A skill answers to its folder name AND to the `name` its SKILL.md gives it,
 * so the launch path denies both (`skillOffNames`).
 *
 * CLAUDE CODE ONLY. The other engines this app runs either do not read
 * ~/.claude/skills (Codex reads ~/.agents/skills) or read it with no per
 * session setting this app writes today (OpenCode), so for an agent on any
 * other engine the setting says it does nothing rather than pretending.
 */
import type { AgentProvider } from './agentProvider';

/** agent id → skill folder names turned off for that agent. */
export type AgentSkillsOffMap = Record<string, string[]>;

/** The most skills one agent can have turned off; bounds the settings file. */
export const SKILLS_OFF_MAX_PER_AGENT = 200;

/** A skill name a permission rule can carry: the folder names the installer
 *  makes (main/skills.ts safeSkillDirName). No space, bracket or star, so a
 *  rule built from it cannot match more than the one skill. */
const SKILL_NAME_RE = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
const AGENT_KEY_RE = /^[A-Za-z0-9_-][A-Za-z0-9._-]{0,79}$/;

export function isSkillName(v: unknown): v is string {
  return typeof v === 'string' && SKILL_NAME_RE.test(v) && !v.includes('..');
}

function isAgentKey(v: unknown): v is string {
  return typeof v === 'string' && AGENT_KEY_RE.test(v) && v !== '__proto__';
}

/** Whether this engine can have one skill turned off for one agent. */
export function skillsOffSupported(provider: AgentProvider | undefined): boolean {
  return (provider ?? 'claude') === 'claude';
}

/** Structural guard for the persisted map: well formed rows stay, the rest
 *  go, names are deduplicated, and an agent with none left is dropped. */
export function sanitizeAgentSkillsOff(raw: unknown): AgentSkillsOffMap | undefined {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return undefined;
  const out: AgentSkillsOffMap = {};
  for (const [agentId, names] of Object.entries(raw as Record<string, unknown>)) {
    if (!isAgentKey(agentId) || !Array.isArray(names)) continue;
    const clean = [...new Set(names.filter(isSkillName))].slice(0, SKILLS_OFF_MAX_PER_AGENT);
    if (clean.length) out[agentId] = clean;
  }
  return Object.keys(out).length ? out : undefined;
}

/** The skill folders turned off for one agent. */
export function skillsOffFor(map: unknown, agentId: string): string[] {
  return sanitizeAgentSkillsOff(map)?.[agentId] ?? [];
}

/** The map with one skill turned off (`off`) or back on for one agent. Pure;
 *  main persists the result. Throws on an id or a name the file must not hold. */
export function withAgentSkillOff(map: unknown, agentId: string, skill: string, off: boolean): AgentSkillsOffMap {
  if (!isAgentKey(agentId)) throw new Error('invalid agent id');
  if (!isSkillName(skill)) throw new Error('invalid skill name');
  const next: AgentSkillsOffMap = { ...(sanitizeAgentSkillsOff(map) ?? {}) };
  const row = (next[agentId] ?? []).filter((n) => n !== skill);
  if (off) {
    if (row.length >= SKILLS_OFF_MAX_PER_AGENT) throw new Error(`an agent can have at most ${SKILLS_OFF_MAX_PER_AGENT} skills turned off`);
    row.push(skill);
  }
  if (row.length) next[agentId] = row;
  else delete next[agentId];
  return next;
}

/** Every name the turned off skills answer to: each folder, then the name its
 *  SKILL.md gives when that differs. `nameOf` reads that name (main reads the
 *  disk); a name no rule can carry is left out, the folder rule still holds. */
export function skillOffNames(folders: readonly string[], nameOf?: (folder: string) => string | undefined): string[] {
  const out: string[] = [];
  for (const folder of folders) {
    if (!isSkillName(folder)) continue;
    if (!out.includes(folder)) out.push(folder);
    let own: string | undefined;
    try { own = nameOf?.(folder)?.trim(); } catch { own = undefined; }
    if (own && isSkillName(own) && !out.includes(own)) out.push(own);
  }
  return out;
}

/** What one agent's `--settings` file gains for its turned off skills: the
 *  deny rules and the overrides. Empty when nothing is off, so a settings file
 *  with no skill off is byte for byte what it was before. */
export function skillsOffSettings(names: readonly string[]): { deny: string[]; skillOverrides: Record<string, 'off'> } {
  const deny: string[] = [];
  const skillOverrides: Record<string, 'off'> = {};
  // A Set, not `in`: a skill called `constructor` is not already listed.
  const seen = new Set<string>();
  for (const name of names) {
    if (!isSkillName(name) || seen.has(name)) continue;
    seen.add(name);
    deny.push(`Skill(${name})`, `Skill(${name} *)`);
    skillOverrides[name] = 'off';
  }
  return { deny, skillOverrides };
}

