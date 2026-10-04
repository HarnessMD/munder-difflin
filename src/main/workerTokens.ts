/** Tokens that count against an ephemeral worker's cap.
 *
 *  Prompt-cache re-reads do not. They repeat the standing prompt on every tool
 *  turn, so a worker still searching crosses a 3M cap after ~30 calls.
 */
export function tokensAgainstWorkerCap(s: {
  input: number;
  output: number;
  cacheCreation: number;
}): number {
  return s.input + s.output + s.cacheCreation;
}
