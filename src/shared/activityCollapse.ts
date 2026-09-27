/**
 * COLLAPSING TOOL RUNS (pilot feedback item 7, 4 Sep 2026). An agent that
 * spends an afternoon in the shell writes "Bash" into its activity digest
 * dozens of times in a row, and the agent thread drew every one of them:
 * "Fri  Bash", "Fri  Bash", "Fri  Bash"... until the conversation drowned.
 *
 * This is the one rule, React free so it can be tested as arithmetic:
 * consecutive rows that are the SAME tool fold into one run. A run breaks on
 * anything that is not that tool: a message, a different tool, an idle line.
 * Nothing else is touched; a non-tool row passes through exactly as it came.
 *
 * A run carries the timestamp of its LAST row, always. The feed is drawn
 * oldest first, so the moment the run finished is the moment the next row
 * picks up from, and the line reads as "by this time, Bash had run 10 times".
 *
 * The caller says which rows are tool rows via `toolOf`: a tool name means
 * collapsible, undefined (or an empty name) means pass through untouched.
 * Single tool rows come back as a run of count 1, so the renderer has one
 * branch for tool copy ("Bash was used" / "Bash used 10 times") and never
 * re-derives what this function already decided.
 */

/** A row that is not a tool run: passed through in place, untouched. */
export interface PassedRow<T> {
  kind: 'row';
  row: T;
}

/** A maximal run of consecutive rows for one tool. `count` >= 1. */
export interface ToolRun<T> {
  kind: 'run';
  tool: string;
  count: number;
  /** The timestamp of the LAST row of the run. */
  ts: number;
  /** The rows folded in, oldest first, so a count of 1 keeps its detail. */
  rows: T[];
}

export type CollapsedItem<T> = PassedRow<T> | ToolRun<T>;

/**
 * Fold consecutive same-tool rows into runs. Pure: `rows` is read, never
 * written. Order is preserved; a run sits where its rows sat.
 */
export function collapseToolRuns<T extends { ts: number }>(
  rows: readonly T[],
  toolOf: (row: T) => string | undefined
): CollapsedItem<T>[] {
  const out: CollapsedItem<T>[] = [];
  for (const row of rows) {
    const tool = toolOf(row);
    if (!tool) {
      out.push({ kind: 'row', row });
      continue;
    }
    const last = out[out.length - 1];
    if (last && last.kind === 'run' && last.tool === tool) {
      last.rows.push(row);
      last.count += 1;
      last.ts = row.ts;
    } else {
      out.push({ kind: 'run', tool, count: 1, ts: row.ts, rows: [row] });
    }
  }
  return out;
}
