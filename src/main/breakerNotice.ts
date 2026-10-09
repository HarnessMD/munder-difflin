import type { HiveManager, HiveMessage } from './hive';

export const BREAKER_SENDER = 'breaker';

export type BreakerNoticeAction = 'steer' | 'constrain';

type BreakerNoticeTemplate = {
  subject: string;
  body: (reason: string) => string;
};

const NO_REPLY_GUIDANCE =
  'This is a one-way guardrail notice. Do not reply to breaker; contact god directly for direction or sign-off.';

const BREAKER_NOTICE_TEMPLATES = {
  steer: {
    subject: 'Circuit breaker: steer',
    body: (reason: string) =>
      `Automated guardrail: ${reason}. Re-check your approach — if you're looping or stuck, STOP repeating, summarize what you've tried, and ask god for direction. ${NO_REPLY_GUIDANCE}`
  },
  constrain: {
    subject: 'Circuit breaker: constrain',
    body: (reason: string) =>
      `Automated guardrail escalated: ${reason}. Stop active work now: switch to read-only/plan, write a short plan of your next step, and send it to god for sign-off BEFORE running more tools. ${NO_REPLY_GUIDANCE}`
  }
} satisfies Record<BreakerNoticeAction, BreakerNoticeTemplate>;

function describeBreakerReason(reason: unknown): string {
  return typeof reason === 'string' && reason.trim() ? reason.trim() : 'reason unavailable';
}

export function sendBreakerNotice(
  hive: Pick<HiveManager, 'send'>,
  action: BreakerNoticeAction,
  agentId: string,
  reason: unknown
): HiveMessage {
  const template = BREAKER_NOTICE_TEMPLATES[action];
  return hive.send({
    to: agentId,
    act: 'request',
    subject: template.subject,
    body: template.body(describeBreakerReason(reason)),
    requires_reply: false
  }, BREAKER_SENDER);
}
