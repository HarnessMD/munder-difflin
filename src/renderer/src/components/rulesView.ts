/**
 * The Rules screen's pure parts: the status line, the one-line summary of a backstop,
 * and the edit form's draft <-> rule conversion. Kept out of RulesPanel.tsx so they are
 * tested without a renderer.
 */
import type { Backstop, BackstopDoes, GuardrailRule, GuardrailView } from '../../../shared/guardrail';

const slug = (s: string): string =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 48);

/** A translator: react-i18next's `t` in the screen, English here by default. Keys are
 *  under `rulesPanel.` in the locale files. */
export type Tr = (key: string, vars?: Record<string, string | number>) => string;

/** The English text of the keys this file uses, the same as en.json's `rulesPanel`
 *  (a test keeps the two equal), so the pure parts read the same without a renderer. */
const EN: Record<string, string> = {
  'does.block': 'Block', 'does.ask': 'Ask me', 'does.log': 'Log only',
  'backstop.principleOnly': 'Principle only: agents are told, nothing is checked',
  'backstop.label': 'Backstop: {{does}}', 'backstop.tool': 'tool {{v}}', 'backstop.command': 'command {{v}}',
  'backstop.exceptCommand': 'except command {{v}}', 'backstop.path': 'path {{v}}', 'backstop.exceptPath': 'except path {{v}}',
  'backstop.onErrorDeny': 'if it cannot be checked: counts as a match', 'backstop.off': 'off',
  'status.loading': 'Loading rules...',
  'status.off': 'Guardrail off: nothing is checked and agents are given no rules.',
  'status.offButLoaded': 'The switch reads as off, but the rules loaded earlier are still in force: {{backstops}} backstops checked. This happens when config.json is damaged or was edited by hand. Turn it off here, or repair the settings first.',
  'status.noFile': 'Guardrail on, but there is no rules file: nothing is checked.',
  'status.broken': 'The rules file is broken, so nothing is checked: {{error}}',
  'status.unapproved': 'The rules file was changed outside this screen, so it is not loaded. Read it below, then accept it.',
  'status.notLoaded': 'The rules did not load, so nothing is checked: {{error}}',
  'status.on': 'Guardrail on. Rules given to agents: {{rules}}. Backstops checked: {{backstops}} ({{live}} block or ask).',
};
export const RULES_VIEW_EN = EN;

export const en: Tr = (key, vars = {}) =>
  (EN[key.replace(/^rulesPanel\./, '')] ?? key).replace(/\{\{(\w+)\}\}/g, (_, k: string) => String(vars[k] ?? ''));

export const DOES: Array<{ v: BackstopDoes; label: string }> = [
  { v: 'block', label: EN['does.block'] },
  { v: 'ask', label: EN['does.ask'] },
  { v: 'log', label: EN['does.log'] },
];

export const doesLabel = (d: BackstopDoes, t: Tr = en): string =>
  (DOES.some((x) => x.v === d) ? t(`rulesPanel.does.${d}`) : d);

/** One line a person can read: what this rule's backstop does, or that it has none.
 *  Every matcher is named, the exceptions too: an exception that matches everything
 *  turns a Block into nothing, and must not read as protection. */
export function describeBackstop(r: GuardrailRule, t: Tr = en): string {
  const b = r.backstop;
  if (!b) return t('rulesPanel.backstop.principleOnly');
  const m = b.match;
  const parts = [t('rulesPanel.backstop.label', { does: doesLabel(b.does, t) })];
  if (m.tool !== undefined) parts.push(t('rulesPanel.backstop.tool', { v: [m.tool].flat().join(', ') }));
  if (m.command_matches) parts.push(t('rulesPanel.backstop.command', { v: m.command_matches }));
  if (m.command_not_matches) parts.push(t('rulesPanel.backstop.exceptCommand', { v: m.command_not_matches }));
  if (m.path_glob) parts.push(t('rulesPanel.backstop.path', { v: m.path_glob }));
  if (m.path_not_glob) parts.push(t('rulesPanel.backstop.exceptPath', { v: m.path_not_glob }));
  if (b.on_error === 'deny') parts.push(t('rulesPanel.backstop.onErrorDeny'));
  if (!b.on) parts.push(t('rulesPanel.backstop.off'));
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
export function statusLine(v: GuardrailView | null, t: Tr = en): { text: string; bad: boolean } {
  if (!v) return { text: t('rulesPanel.status.loading'), bad: false };
  // The engine reloads only on an operator action, so a switch that reads as off (a
  // damaged config.json reads as the defaults, or a hand edit) can sit over rules
  // that are still enforced. Say so, never "nothing is checked".
  if (!v.on && v.engine.rulesLoaded > 0) return { text: t('rulesPanel.status.offButLoaded', { backstops: v.engine.rulesLoaded }), bad: true };
  if (!v.on) return { text: t('rulesPanel.status.off'), bad: false };
  if (!v.exists) return { text: t('rulesPanel.status.noFile'), bad: true };
  if (v.error) return { text: t('rulesPanel.status.broken', { error: v.error }), bad: true };
  if (!v.approved) return { text: t('rulesPanel.status.unapproved'), bad: true };
  if (v.engine.error) return { text: t('rulesPanel.status.notLoaded', { error: v.engine.error }), bad: true };
  const rules = v.file?.rules ?? [];
  const live = rules.filter((r) => r.backstop?.on && r.backstop.does !== 'log').length;
  // No plurals: "Rules given to agents: 3" reads right in every language without plural forms.
  return { text: t('rulesPanel.status.on', { rules: rules.length, backstops: v.engine.rulesLoaded, live }), bad: false };
}
