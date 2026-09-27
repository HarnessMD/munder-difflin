/**
 * WHAT A TEAMMATE'S AGENTS ARE CALLED, as this machine has heard it (0.5.2,
 * card v052-agent-names-across-machines, Option D).
 *
 * A message that crosses the bridge is sealed with the SENDING AGENT's id and
 * display name beside it (`teamsBridge.send`, the `sender` field of the
 * sealed payload). The relay never sees either: the whole point of putting
 * the name inside the ciphertext rather than on a roster row is that it is
 * one more thing the relay does not hold. So the only way this machine can
 * know what "Kevin" on Michael B's floor is called is to remember it when a
 * message from Kevin arrives, and that memory is this file.
 *
 * Keyed by the SENDER'S member id, then by their agent's id, because two
 * teammates may both have a Kevin and they are two different Kevins. A name
 * is overwritten by the latest sighting, so a renamed agent reads under its
 * new name on the next message. `agentNamesFor` answers the distinct names,
 * most recently seen first, and caps the list, since a roster line or a row
 * caption that listed forty agents would say nothing useful.
 *
 * Stored beside trust.json at 0600 for the same reason that file is: it is
 * not secret, but it is what this machine believes about another person's
 * floor, and a local process rewriting it unnoticed would put words in a
 * teammate's mouth.
 */
import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';

interface AgentSeen {
  name: string;
  seenAt: string;
}

interface NamesFile {
  [memberId: string]: { agents: { [agentId: string]: AgentSeen } };
}

const SAFE_ID = /^[A-Za-z0-9_-]{1,80}$/;
/** The most names one teammate's row or roster line will list. */
const MAX_NAMES = 12;
/** The most agent ids kept per teammate, so a floor that hires and fires
 *  ephemeral workers by the hundred cannot grow the file without bound. The
 *  oldest sightings go first. */
const MAX_AGENTS_PER_MEMBER = 40;

function filePath(): string {
  return join(app.getPath('userData'), 'teams', 'names.json');
}

function read(): NamesFile {
  const p = filePath();
  if (!existsSync(p)) return {};
  try {
    const parsed = JSON.parse(readFileSync(p, 'utf8')) as unknown;
    if (!parsed || typeof parsed !== 'object') return {};
    const out: NamesFile = {};
    for (const [memberId, entry] of Object.entries(parsed as Record<string, unknown>)) {
      if (!SAFE_ID.test(memberId) || !entry || typeof entry !== 'object') continue;
      const agents = (entry as { agents?: unknown }).agents;
      if (!agents || typeof agents !== 'object') continue;
      const kept: Record<string, AgentSeen> = {};
      for (const [agentId, seen] of Object.entries(agents as Record<string, unknown>)) {
        if (!SAFE_ID.test(agentId) || !seen || typeof seen !== 'object') continue;
        const { name, seenAt } = seen as Partial<AgentSeen>;
        if (typeof name !== 'string' || !name.trim() || typeof seenAt !== 'string') continue;
        kept[agentId] = { name: name.trim().slice(0, 80), seenAt };
      }
      out[memberId] = { agents: kept };
    }
    return out;
  } catch {
    // A corrupt file forgets every name, which costs a caption and nothing
    // else: the next message from each agent writes it down again.
    return {};
  }
}

function write(data: NamesFile): void {
  const p = filePath();
  mkdirSync(dirname(p), { recursive: true, mode: 0o700 });
  writeFileSync(p, JSON.stringify(data, null, 2), { encoding: 'utf8', mode: 0o600 });
}

/** Record that `memberId`'s agent `agentId` called itself `name` just now.
 *  Ids that do not match the bridge's SAFE_ID and empty names are ignored:
 *  the payload is decrypted from a verified sender, but it is still input. */
export function pinAgentName(memberId: string, agentId: string, name: string, now: Date = new Date()): void {
  const clean = name.trim().slice(0, 80);
  if (!SAFE_ID.test(memberId) || !SAFE_ID.test(agentId) || !clean) return;
  const data = read();
  const agents = { ...(data[memberId]?.agents ?? {}) };
  agents[agentId] = { name: clean, seenAt: now.toISOString() };
  const ids = Object.keys(agents).sort((a, b) => Date.parse(agents[b].seenAt) - Date.parse(agents[a].seenAt));
  for (const id of ids.slice(MAX_AGENTS_PER_MEMBER)) delete agents[id];
  data[memberId] = { agents };
  write(data);
}

/** The distinct names this teammate's agents have gone by, most recently
 *  seen first, at most {@link MAX_NAMES}. Empty when nothing has arrived. */
export function agentNamesFor(memberId: string): string[] {
  const agents = read()[memberId]?.agents;
  if (!agents) return [];
  const seen = Object.values(agents).sort((a, b) => Date.parse(b.seenAt) - Date.parse(a.seenAt));
  const out: string[] = [];
  for (const { name } of seen) {
    if (!out.includes(name)) out.push(name);
    if (out.length >= MAX_NAMES) break;
  }
  return out;
}
