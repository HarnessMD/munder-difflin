/**
 * The agent's name after a character is picked in Add agent.
 *
 * The picker suggests the character's own name. That suggestion is used only
 * while the person has not chosen a name themselves (typed it, imported it
 * with a hire, or got it handed over), or when they cleared the field. A name
 * they chose stays.
 */
export function nameAfterPick(current: string, chosen: boolean, suggested?: string): string {
  if (!suggested) return current;
  if (chosen && current.trim() !== '') return current;
  return suggested;
}
