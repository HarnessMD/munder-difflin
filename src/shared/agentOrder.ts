
/** The longest list stored; a floor is never near it, a corrupt file might be. */
export const AGENT_ORDER_MAX = 1000;

/** What `config.agentOrder` may hold: unique non empty ids, in order. */
export function normalizeAgentOrder(input: unknown): string[] {
  if (!Array.isArray(input)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const v of input) {
    if (typeof v !== 'string') continue;
    const id = v.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(id);
    if (out.length >= AGENT_ORDER_MAX) break;
  }
  return out;
}

