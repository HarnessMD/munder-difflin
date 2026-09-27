/**
 * MOVING A CARD ON THE BOARD, as arithmetic (v0.4.9, founder 3 Sep 2026).
 *
 * The board stages moves and never writes the ledger: the orchestrator owns
 * hive/tasks.json, and two writers on one file is how a ledger gets
 * corrupted. So the whole of "what did the human change" is this module, and
 * the screen is only the drawing of it.
 *
 * Nothing here imports React, or the renderer, or a task type with thirty
 * fields on it. A move needs three facts about a card and no more.
 */

export type BoardStatus = 'todo' | 'doing' | 'blocked' | 'done';

export const BOARD_STATUSES: BoardStatus[] = ['todo', 'doing', 'blocked', 'done'];

/** The three facts a move needs. Anything with these is movable. */
export interface MovableCard {
  id: string;
  title: string;
  status: BoardStatus;
}

/** One card the human moved and has not sent yet. `from` is the LEDGER's
 *  status, never the previous staged one, so the message says where the card
 *  actually started. */
export interface StagedMove {
  id: string;
  title: string;
  from: BoardStatus;
  to: BoardStatus;
}

export type Staged = Record<string, StagedMove>;

/**
 * Fold a move into what is already staged.
 *
 * Moving a card back to where the ledger has it is not a change, so it leaves
 * NOTHING behind: the entry is dropped and the bar shrinks. Otherwise the
 * entry is replaced, keeping the original `from`, so dragging a card through
 * three columns still reports one move from where it began.
 */
export function stageMove(staged: Staged, card: MovableCard, to: BoardStatus): Staged {
  const from = staged[card.id]?.from ?? card.status;
  const next = { ...staged };
  if (from === to) delete next[card.id];
  else next[card.id] = { id: card.id, title: card.title, from, to };
  return next;
}

/** Where a card sits on screen right now: its staged column if it has one,
 *  the ledger's otherwise. */
export function stagedStatus(card: MovableCard, staged: Staged): BoardStatus {
  return staged[card.id]?.to ?? card.status;
}

/** The column one step left or right, or null at either end. */
export function neighbourStatus(from: BoardStatus, dir: -1 | 1): BoardStatus | null {
  return BOARD_STATUSES[BOARD_STATUSES.indexOf(from) + dir] ?? null;
}

/**
 * What the orchestrator is told. One message for the whole batch, one line
 * per card, ids first so he can act without guessing which card was meant.
 * Written for an agent to read, so it says what to do with it.
 */
export function movesMessage(moves: StagedMove[]): string {
  return [
    'I moved these cards on the board. Please apply them to the task ledger and confirm when they are in.',
    '',
    ...moves.map((m) => `${m.id}: ${m.from} to ${m.to}  (${m.title})`)
  ].join('\n');
}
