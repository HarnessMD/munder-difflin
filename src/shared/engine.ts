/**
 * THE ENGINE an agent runs on, said the way a person says it.
 *
 * Founder, 5 Sep 2026: "make the agents show the provider (logo) and the model
 * name in the sidebar ... similarly find a design that fits for the agent
 * cards in the grid, including the orchestrator." Two facts already sit on
 * every Agent row (`provider`, `model`); what was missing was ONE place that
 * turns them into words, so the sidebar and the grid cannot say different
 * things about the same agent.
 *
 *   ENGINE_NAME      the provider as a tooltip names it: short, without the
 *                    picker's hints ("Qwen (local available)" is a picker line,
 *                    not a name). A Record over the closed union, so a new
 *                    provider fails to compile until it has a name here.
 *   ENGINE_MONOGRAM  two letters for the badge of a provider that has no brand
 *                    mark to draw, so six providers do not share one glyph.
 *   modelLabel       the catalog's label when the id is in it ("Sonnet 4.6 ·
 *                    1M"); a hand typed slug the catalog does not know, tidied
 *                    (the vendor prefix the OpenCode and Crush pickers put in
 *                    front, `anthropic/`, dropped) so it still reads as what
 *                    it is; and for an agent that names NO model, the label of
 *                    the provider's own default entry, which is the exact line
 *                    the person chose in the picker ("CLI default"). `null`
 *                    only when the catalog has no such entry either, and then
 *                    the surface says "CLI default" in its own words rather
 *                    than this file guessing which model that is today.
 */
import type { AgentProvider } from './agentProvider';
import modelCatalog from './modelCatalog.json';

export const ENGINE_NAME: Record<AgentProvider, string> = {
  claude: 'Claude Code',
  codex: 'Codex',
  grok: 'Grok',
  kimi: 'Kimi Code',
  gemini: 'Gemini CLI',
  antigravity: 'Antigravity',
  qwen: 'Qwen',
  opencode: 'OpenCode',
  crush: 'Crush',
  pi: 'Pi',
  copilot: 'Copilot',
  cursor: 'Cursor',
  custom: 'Custom'
};

export const ENGINE_MONOGRAM: Record<AgentProvider, string> = {
  claude: 'Cl',
  codex: 'Cx',
  grok: 'Gr',
  kimi: 'Ki',
  gemini: 'Ge',
  antigravity: 'Ag',
  qwen: 'Qw',
  opencode: 'Oc',
  crush: 'Cr',
  pi: 'Pi',
  copilot: 'Cp',
  cursor: 'Cu',
  custom: '>_'
};

interface CatalogEntry {
  id?: string;
  label: string;
}

const CATALOG: { providers: Record<string, CatalogEntry[]> } = modelCatalog;

/** `anthropic/claude-sonnet-4-5` reads as `claude-sonnet-4-5`. A bracketed
 *  suffix stays: `[1m]` is meaning, not noise. */
export function tidyModelId(id: string): string {
  const parts = id.split('/');
  return parts[parts.length - 1] || id;
}

export function modelLabel(
  provider: AgentProvider | undefined,
  model: string | undefined,
  providers: Record<string, CatalogEntry[]> = CATALOG.providers
): string | null {
  // An unset provider is Claude Code, the same reading the store's Agent type
  // documents and modelsForProviderAtVersion makes.
  const list = providers[provider ?? 'claude'] ?? providers.claude ?? [];
  const id = (model ?? '').trim();
  if (!id) return list.find((m) => m.id === undefined)?.label ?? null;
  return list.find((m) => m.id === id)?.label ?? tidyModelId(id);
}
