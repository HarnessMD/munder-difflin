/**
 * The work order typed into the terminal of an agent whose engine cannot
 * drain a hive inbox (every engine but Claude Code). The window queues it for
 * the agent's terminal in the app (useHive.ts). Pure.
 */
export interface TerminalWorkOrder {
  id: string;
  from: string;
  act: string;
  subject: string;
  body: string;
  requiresReply: boolean;
  createdAt: string;
}

export function terminalWorkOrderPrompt(msg: TerminalWorkOrder): string {
  return [
    'WORK ORDER FROM HIVE',
    `Message: ${msg.id}`,
    `From: ${msg.from}`,
    `Subject: ${msg.subject}`,
    `Act: ${msg.act}${msg.requiresReply ? ' (reply expected)' : ''}`,
    `Issued: ${msg.createdAt}`,
    '',
    msg.body,
    '',
    'Notes:',
    '- This arrived through your terminal because this provider does not support hive inbox.',
    '- Work in your current cwd.',
    '- When done, report changes, validation, blockers, and next step in this terminal.'
  ].join('\n');
}
