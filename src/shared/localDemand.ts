
/** The registry keeps historical identities. Only the current floor may wake
 * automatically; an old folder or unread inbox is not a hire or a reopen. */
export function localDemandAllowed(
  id: string,
  agent: { archived?: boolean; stopped?: boolean; restoreHold?: string; onHold?: boolean; role?: string; isGod?: boolean; isAssistant?: boolean } | undefined,
  roster: { agents: unknown[]; restorable: unknown[] } | null,
  godId: string | null
): boolean {
  if (!agent || agent.archived || agent.stopped || agent.restoreHold || agent.onHold || agent.role === 'temp') return false;
  if (id === godId || agent.isGod || agent.isAssistant) return true;
  return [...(roster?.agents ?? []), ...(roster?.restorable ?? [])].some((row) => {
    if (!row || typeof row !== 'object') return false;
    const card = row as { id?: unknown; archived?: boolean; neverStarted?: boolean; retiredOn?: string };
    return card.id === id && !card.archived && !card.neverStarted && !card.retiredOn;
  });
}
