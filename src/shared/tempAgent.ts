/**
 * A temp (a short lived agent god hires for one job) has the id
 * `worker-<request id>`, built from the prefix below by processSpawnRequest in
 * src/main/index.ts. The renderer reads it back, because a temp's floor card
 * carries nothing else that says what it was: when its terminal ends, main
 * archives the card like any other agent's, so it lands on the archived list.
 */
export const TEMP_ID_PREFIX = 'worker-';

export function isTempAgentId(id: string): boolean {
  return id.startsWith(TEMP_ID_PREFIX);
}

/**
 * The id of an agent a person adds: its name as a slug, then a stamp. A name
 * that would give a temp's id ("Worker", "Worker bee") gets `agent-` in front,
 * so an id that starts with the temp prefix is always a temp and never a
 * person's agent. That matters where temps are treated apart: a temp is given
 * no connection (main/config.ts `setAgentConnection`).
 */
export function namedAgentId(name: string, stamp: string): string {
  const id = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${stamp}`;
  return isTempAgentId(id) ? `agent-${id}` : id;
}

