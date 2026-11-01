import { useStore, type Agent } from '@/store/store';
import { inferAgentProvider } from '@/store/config';
import { clearCommandForProvider } from '../../../shared/providerAutomation';
import { canDeliverToAgent } from './queueDelivery';

/** How long one stretch of work must last before a switch is allowed to clear. */
const WORK_SWITCH_CLEAR_MS = 60 * 60 * 1000;
/** A switch below this fill is not worth discarding the terminal. */
const CLEAR_FILL_PCT = 15;

export interface WorkStretch {
  since: number;
  taskKey: string;
}

interface BoardTask {
  id?: string;
  title?: string;
  status?: string;
  assignee?: string;
}

function parseTasks(raw: unknown): BoardTask[] {
  const list = (raw && typeof raw === 'object' && Array.isArray((raw as { tasks?: unknown }).tasks))
    ? (raw as { tasks: BoardTask[] }).tasks
    : [];
  return list.filter((t) => !!t && typeof t === 'object');
}

function doingTasks(agentId: string, tasks: BoardTask[]): BoardTask[] {
  return tasks.filter((t) =>
    t.status === 'doing' && t.assignee === agentId && typeof t.id === 'string' && t.id.length > 0
  );
}

function taskKey(tasks: BoardTask[]): string {
  return tasks.map((t) => t.id as string).sort().join(',');
}

/** Same window guess the compact gate uses when the CLI never reported a limit. */
function fillPct(agent: Agent): number | null {
  if (agent.contextTokens === undefined || !Number.isFinite(agent.contextTokens)) return null;
  const limit = agent.contextLimit && agent.contextLimit > 0
    ? agent.contextLimit
    : (/1m/i.test(agent.model ?? '') ? 1_000_000 : 200_000);
  return (agent.contextTokens / limit) * 100;
}

function handoffMarkdown(agent: Agent, leaving: BoardTask[], starting: BoardTask[], minutes: number): string {
  const lines = (rows: BoardTask[]): string =>
    rows.length
      ? rows.map((t) => `- \`${t.id}\` ${t.title || ''}`.trimEnd()).join('\n')
      : '- (none)';
  const used = agent.contextTokens ?? 0;
  return [
    '# Handoff',
    '',
    `Written ${new Date().toISOString()} because work switched after ${minutes} minutes.`,
    '',
    `Agent: ${agent.name} (\`${agent.id}\`)`,
    `Folder: ${agent.cwd}`,
    `Context: ${used} tokens`,
    '',
    '## Leaving',
    lines(leaving),
    '',
    '## Starting',
    lines(starting),
    ''
  ].join('\n');
}

/**
 * After a lasting agent has been on one set of in-progress tasks for about an
 * hour, a different set of in-progress tasks is a switch of work. Write
 * handoff.md into that agent's hive folder, then queue the provider's clear.
 * A blind timer never clears. A saved context-trigger rule is not involved.
 */
export async function runWorkSwitchClear(opts: {
  quietMs: (ptyId: string, now: number) => number | null;
  quiesceMs: number;
  stretches: Record<string, WorkStretch>;
}): Promise<void> {
  let tasks: BoardTask[];
  try {
    tasks = parseTasks(await window.cth.hiveTasks());
  } catch {
    return;
  }
  const now = Date.now();
  const { agents, messageQueues, enqueueMessage } = useStore.getState();
  for (const agent of agents) {
    // Michael's board moves all day; clearing him because a card changed would
    // drop the floor's memory. Temps are short-lived and already tear down.
    if (!agent.ptyId || agent.isGod || agent.isAssistant || agent.id.startsWith('worker-')) continue;
    const current = doingTasks(agent.id, tasks);
    const key = taskKey(current);
    const prev = opts.stretches[agent.id];
    if (!prev) {
      opts.stretches[agent.id] = { since: now, taskKey: key };
      continue;
    }
    if (key === prev.taskKey) continue;

    const switched = prev.taskKey !== '' && key !== '';
    const longEnough = now - prev.since >= WORK_SWITCH_CLEAR_MS;
    const pct = fillPct(agent);
    const fullEnough = pct !== null && pct >= CLEAR_FILL_PCT;
    if (!switched || !longEnough || !fullEnough) {
      opts.stretches[agent.id] = { since: now, taskKey: key };
      continue;
    }
    if (!canDeliverToAgent(agent.status, opts.quietMs(agent.ptyId, now), opts.quiesceMs)) continue;

    const leaving = prev.taskKey.split(',').filter(Boolean).map((id) => {
      const found = tasks.find((t) => t.id === id);
      return found ?? { id, title: id };
    });
    const minutes = Math.max(1, Math.round((now - prev.since) / 60_000));
    const wrote = await window.cth.writeHandoff(agent.id, handoffMarkdown(agent, leaving, current, minutes));
    if (!wrote.ok) continue;

    const provider = inferAgentProvider(agent.command, agent.provider);
    const command = clearCommandForProvider(provider);
    if (command) {
      const verb = command.trimStart().split(/\s+/)[0];
      const queued = messageQueues[agent.id] ?? [];
      if (!queued.some((m) => m.text.trimStart().startsWith(verb))) {
        enqueueMessage(agent.id, command);
      }
    }
    opts.stretches[agent.id] = { since: now, taskKey: key };
  }
}
