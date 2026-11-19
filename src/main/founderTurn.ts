/**
 * FOUNDER TURNS (founder, 26 Oct 2026): a note an agent sends in a turn that
 * began with a person's words is delivered as an inform, as a temp's already
 * is (HiveManager.setFounderTurn, on the outbox's route).
 *
 * A turn begins with its UserPromptSubmit. Every text the app types goes
 * through the submit door (ptySubmit.ts) and is noted here first, with whether
 * it carries a person's words:
 *  - a queued message the person sent: the composer, a Slack message
 *    (QueuedMessage.person);
 *  - a wake that carries mail from a person: an ASK ME answer, an Inbox or
 *    Command Center send ('human'), a Slack follow up ('slack').
 * Anything else the door types (a wake of agents' mail, a /compact, a seed,
 * the /remote-control command at god's boot) is the app's. A prompt the door
 * never typed was typed into the terminal by the person, or reached the CLI
 * through Claude's own remote control.
 *
 * Kept in memory only, and of each text only its promptTail, the same 48
 * characters the hook proof keeps. No electron import: unit-testable.
 */
import { wakeIds } from '../shared/hiveNudge';
import { promptTail, tailMatches } from '../shared/providerAutomation';

/** Senders whose mail is a person's words. */
export const PERSON_SENDERS: ReadonlySet<string> = new Set(['human', 'slack']);

/** Is `text` a wake that carries mail from a person, of the agent's `inbox`? */
export function wakeCarriesPersonMail(text: string, inbox: ReadonlyArray<{ id?: string; from?: string }>): boolean {
  const { filed, yours } = wakeIds(text);
  const ids = new Set([...filed, ...yours]);
  return ids.size > 0 && inbox.some((m) => !!m.id && ids.has(m.id) && !!m.from && PERSON_SENDERS.has(m.from));
}

/** Typed texts kept per agent, newest last. */
const TYPED_KEPT = 8;

interface Typed { at: number; tail: string; person: boolean }

export class FounderTurns {
  private typed = new Map<string, Typed[]>();

  /** The door is about to type `text` into this agent. `at` is taken before
   *  the submit, which waits for the very UserPromptSubmit it is matched to. */
  noteTyped(agentId: string | undefined, text: string, person: boolean, at: number): void {
    if (!agentId) return;
    const tail = promptTail(text);
    if (!tail) return;
    const list = this.typed.get(agentId) ?? [];
    list.push({ at, tail, person });
    if (list.length > TYPED_KEPT) list.shift();
    this.typed.set(agentId, list);
  }

  /** Did the turn that `prompt` began start with a person's words? No prompt
   *  seen (an engine with no UserPromptSubmit): no. */
  isFounderTurn(agentId: string, prompt: { at: number; tail: string } | null): boolean {
    if (!prompt?.tail) return false;
    const mine = (this.typed.get(agentId) ?? []).filter((t) => t.at <= prompt.at && tailMatches(prompt.tail, t.tail));
    if (mine.length === 0) return true;
    return mine[mine.length - 1].person;
  }
}
