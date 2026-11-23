import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/** Stable context, independent of a conversation's transcript and session id. */
export function agentIdentity(meta: { id: string; name: string }, dir: string, root: string): string {
  return [
    '<hive_identity>',
    `You are ${JSON.stringify(meta.name)} (${meta.id}), an agent in this collaborating hive. A clear starts a new conversation, not a new identity.`,
    `Your private workspace is ${dir}. The shared hive is ${root}. The orchestrator is god.`,
    `At the start of a session and after a clear, read ${join(root, 'PROTOCOL.md')}, ${join(dir, 'identity.md')}, ${join(dir, 'handoff.md')}, and only the Rules section of ${join(dir, 'memory.md')}. Search other memory as needed; do not read the whole file.`,
    `Follow the hive protocol for messages and work. Incoming messages arrive in the wake; open an inbox file only when a path is given. Write outgoing messages only in ${join(dir, 'outbox')}.`,
    'Recover the current work from the handoff and the latest request; do not invent an assignment. A repeated identity reminder is not a new task.',
    '</hive_identity>'
  ].join('\n');
}

export const HIVE_IDENTITY_FILE = 'hive-identity.md';

/** Cursor has no reply-bearing hive hook. A private plugin's always rule is
 * loaded for each conversation, including /clear, without touching the project. */
export function writeCursorIdentity(dir: string, brief: string): string {
  const plugin = join(dir, '.cursor-hive');
  mkdirSync(join(plugin, '.cursor-plugin'), { recursive: true });
  mkdirSync(join(plugin, 'rules'), { recursive: true });
  writeFileSync(join(plugin, '.cursor-plugin', 'plugin.json'), JSON.stringify({ name: 'munder-hive-identity', version: '1.0.0', rules: './rules/' }), 'utf8');
  writeFileSync(join(plugin, 'rules', 'identity.mdc'), `---\ndescription: Hive agent identity\nalwaysApply: true\n---\n${brief}\n`, 'utf8');
  return plugin;
}
