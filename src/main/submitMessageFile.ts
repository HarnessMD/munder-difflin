/** Long raw input makes Antigravity redraw once per character. Keep the terminal
 * instruction short, and preserve the exact message in the agent's own folder. */
import { createHash } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { AgentProvider } from '../shared/agentProvider';
import { isSlashCommand } from '../shared/providerAutomation';

export const RAW_MESSAGE_LIMIT = 1024;

export function fileBackedMessage(root: string | null, agentId: string | undefined, provider: AgentProvider, text: string): string {
  if (provider !== 'antigravity' || isSlashCommand(text) || (text.length <= RAW_MESSAGE_LIMIT && !/[\r\n]/.test(text))) return text;
  // Non-hive terminals have no agent folder or its filesystem grants.
  if (!root || !agentId) return text;
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/.test(agentId)) throw new Error('Invalid message agent id');
  const dir = join(root, 'agents', agentId, 'queued-messages');
  mkdirSync(dir, { recursive: true, mode: 0o700 });
  const digest = createHash('sha256').update(text, 'utf8').digest('hex');
  const file = join(dir, `${digest}.txt`);
  try { writeFileSync(file, text, { encoding: 'utf8', mode: 0o600, flag: 'wx' }); }
  catch (error) {
    // Stable across press-only retries and restarts, never overwrite a message.
    if ((error as NodeJS.ErrnoException).code !== 'EEXIST' || readFileSync(file, 'utf8') !== text) throw error;
  }
  return `Read the entire UTF-8 file and respond to the complete message it contains: ${JSON.stringify(file)}`;
}
