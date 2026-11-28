/**
 * The rules "Turn on guardrail" writes when there is no guardrail.json yet: the same
 * three as examples/policy/guardrail.example.json (a test keeps them equal). Every
 * backstop starts as `log`, so turning the guardrail on stops nothing until the
 * operator makes a rule `block` or `ask` in the Rules screen.
 */
import type { GuardrailFile } from '../shared/guardrail';

export const STARTER: GuardrailFile = {
  version: 1,
  rev: 0,
  rules: [
    {
      id: 'cross-agent-write',
      principle: 'An agent may only write inside its own agent folder.',
      agents: 'all',
      backstop: {
        on: true,
        does: 'log',
        match: {
          tool: ['Write', 'Edit', 'NotebookEdit', 'Bash'],
          path_glob: '**/hive/agents/*/**',
          path_not_glob: '**/hive/agents/${AGENT_ID}/**',
        },
        message: "Agent folders are owned by their agent. Write your message to your own outbox/ instead - the harness delivers it. Reading another agent's files is fine.",
        on_error: 'allow',
      },
    },
    {
      id: 'destructive-shared-state',
      principle: 'mempalace sync/repair rewrites shared memory and can drop every per-agent wing.',
      agents: 'all',
      backstop: {
        on: true,
        does: 'log',
        match: { tool: 'Bash', command_matches: '^mempalace +(sync|repair)( +-\\S+.*)?$' },
        message: 'mempalace sync deletes every per-agent wing and cannot be undone. To record something, append to your own memory.md - it is mined automatically. If a palace really needs repairing, ask the operator.',
        on_error: 'deny',
      },
    },
    {
      id: 'remote-push',
      principle: "Pushing to a remote is the operator's call.",
      agents: 'all',
      backstop: {
        on: true,
        does: 'log',
        match: { tool: 'Bash', command_matches: '^(git\\s+push|gh\\s+(pr|release)\\s+create|(npm|yarn|pnpm)\\s+publish)\\b' },
        message: "Publishing work outside this machine - a push, a pull request, a release, a package publish - is the operator's decision. Commit to a branch, report the branch name, and ask first.",
        on_error: 'allow',
      },
    },
  ],
};
