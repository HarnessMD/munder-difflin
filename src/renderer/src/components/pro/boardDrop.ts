/**
 * A Tasks board column as a drop target (0.5.3, founder on rc.4: moving a card
 * "only works when you drag it to the top of the new column"). Import free so
 * test/v053-tasks-drop-anywhere.test.cjs runs these handlers on real events.
 *
 * The handlers were always right; the column was too short. The board grid
 * aligned its columns to the start, so each column was only as tall as its
 * cards and below the last one the pointer was over the grid, where nothing
 * listened. The column now stretches to the board's full height (TasksScreen
 * Board), and these handlers sit on the whole of it: a release over a card, a
 * gap or empty space moves the card the same way.
 */

export interface DropEventLike {
  preventDefault(): void;
  currentTarget: { contains(node: unknown): boolean } | null;
  relatedTarget?: unknown;
  dataTransfer: { getData(type: string): string; dropEffect?: string } | null;
}

export interface ColumnDropDeps<S, T> {
  /** The card a drag carries, by the id the drag set as text/plain. */
  find: (id: string) => T | undefined;
  move: (task: T, to: S) => void;
  /** Which column is lit: the column's status, or null. */
  setOver: (next: (current: S | null) => S | null) => void;
}

/** The three handlers one column takes. */
export function columnDrop<S, T>(status: S, deps: ColumnDropDeps<S, T>) {
  return {
    /** Entering or moving over ANY part of the column lights all of it. */
    onDragOver(e: DropEventLike): void {
      e.preventDefault();
      if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
      deps.setOver(() => status);
    },
    /** Only leaving the column itself turns it off, not moving from its
     *  header onto a card inside it. */
    onDragLeave(e: DropEventLike): void {
      if (e.currentTarget?.contains(e.relatedTarget)) return;
      deps.setOver((c) => (c === status ? null : c));
    },
    onDrop(e: DropEventLike): void {
      e.preventDefault();
      deps.setOver(() => null);
      const task = deps.find(e.dataTransfer?.getData('text/plain') ?? '');
      if (task) deps.move(task, status);
    }
  };
}
