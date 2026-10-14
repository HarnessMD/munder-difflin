/**
 * The Rules screen's pure parts: the status line, the one-line summary of a backstop,
 * and the edit form's draft <-> rule conversion. Kept out of RulesPanel.tsx so they are
 * tested without a renderer.
 */
import type { Backstop, BackstopDoes, GuardrailRule, GuardrailView } from '../../../shared/guardrail';

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

export const DOES: Array<{ v: BackstopDoes; label: string }> = [
  { v: 'block', label: 'Block' },
  { v: 'ask', label: 'Ask me' },
  { v: 'log', label: 'Log only' },
];

const doesLabel = (d: BackstopDoes): string => DOES.find((x) => x.v === d)?.label ?? d;

/** One line a person can read: what this rule's backstop does, or that it has none.
 *  Every matcher is named, the exceptions too: an exception that matches everything
 *  turns a Block into nothing, and must not read as protection. */
export function describeBackstop(r: GuardrailRule): string {
  const b = r.backstop;
  if (!b) return 'Principle only: agents are told, nothing is checked';
  const m = b.match;
  const parts = [`Backstop: ${doesLabel(b.does)}`];
  if (m.tool !== undefined) parts.push(`tool ${[m.tool].flat().join(', ')}`);
  if (m.command_matches) parts.push(`command ${m.command_matches}`);
  if (m.command_not_matches) parts.push(`except command ${m.command_not_matches}`);
  if (m.path_glob) parts.push(`path ${m.path_glob}`);
  if (m.path_not_glob) parts.push(`except path ${m.path_not_glob}`);
  if (b.on_error === 'deny') parts.push('if it cannot be checked: counts as a match');
  if (!b.on) parts.push('off');
  return parts.join(' · ');
}

/** Draft state of the edit form, kept flat so every field is a plain input. */
export interface Draft {
  id: string; isNew: boolean; principle: string;
  allAgents: boolean; picked: string[];
  hasBackstop: boolean; on: boolean; does: BackstopDoes;
  tool: string; commandMatches: string; pathGlob: string; message: string;
}

export const emptyDraft = (): Draft => ({
  id: '', isNew: true, principle: '', allAgents: true, picked: [],
  hasBackstop: false, on: true, does: 'log',
  tool: 'Bash', commandMatches: '', pathGlob: '', message: '',
});

export function toDraft(r: GuardrailRule): Draft {
  const b = r.backstop;
  return {
    id: r.id, isNew: false, principle: r.principle,
    allAgents: r.agents === 'all', picked: r.agents === 'all' ? [] : [...r.agents],
    hasBackstop: !!b, on: b?.on ?? true, does: b?.does ?? 'log',
    tool: b ? [b.match.tool ?? ''].flat().join(',') : 'Bash',
    commandMatches: b?.match.command_matches ?? '', pathGlob: b?.match.path_glob ?? '',
    message: b?.message ?? '',
  };
}

/** The draft as a rule. `prev` keeps what the form does not show: `why`, `on_error`
 *  and the matchers it has no field for (path_not_glob, command_not_matches). */
export function fromDraft(d: Draft, prev?: GuardrailRule): GuardrailRule {
  const out: GuardrailRule = {
    id: d.id || slug(d.principle) || 'rule',
    principle: d.principle.trim(),
    agents: d.allAgents ? 'all' : [...d.picked],
    ...(prev?.why ? { why: prev.why } : {}),
  };
  if (!d.hasBackstop) return out;
  const tools = d.tool.split(',').map((t) => t.trim()).filter(Boolean);
  const match: Backstop['match'] = { ...(prev?.backstop?.match ?? {}) };
  for (const k of ['tool', 'command_matches', 'path_glob'] as const) delete match[k];
  if (tools.length) match.tool = tools.length === 1 ? tools[0] : tools;
  if (d.commandMatches.trim()) match.command_matches = d.commandMatches.trim();
  if (d.pathGlob.trim()) match.path_glob = d.pathGlob.trim();
  out.backstop = {
    on: d.on, does: d.does, match,
    ...(d.message.trim() ? { message: d.message.trim() } : {}),
    ...(prev?.backstop?.on_error ? { on_error: prev.backstop.on_error } : {}),
  };
  return out;
}

/** The status line: what the guardrail is doing now, or, marked bad, why it is not. */
export function statusLine(v: GuardrailView | null): { text: string; bad: boolean } {
  if (!v) return { text: 'Loading rules...', bad: false };
  if (!v.on) return { text: 'Guardrail off: nothing is checked and agents are given no rules.', bad: false };
  if (!v.exists) return { text: 'Guardrail on, but there is no rules file: nothing is checked.', bad: true };
  if (v.error) return { text: `The rules file is broken, so nothing is checked: ${v.error}`, bad: true };
  if (!v.approved) return { text: 'The rules file was changed outside this screen, so it is not loaded. Read it below, then accept it.', bad: true };
  if (v.engine.error) return { text: `The rules did not load, so nothing is checked: ${v.engine.error}`, bad: true };
  const rules = v.file?.rules ?? [];
  const live = rules.filter((r) => r.backstop?.on && r.backstop.does !== 'log').length;
  const n = v.engine.rulesLoaded;
  return {
    text: `Guardrail on: ${rules.length} rule${rules.length === 1 ? '' : 's'} given to agents, `
      + `${n} backstop${n === 1 ? '' : 's'} checked (${live} block or ask).`,
    bad: false,
  };
}
