export type HookClass = 'needsHuman' | 'idle' | null;

const CLAUDE_BLOCKING_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  'permission_prompt',
  'elicitation_dialog',
  'elicitation_url_dialog',
  'agent_needs_input'
]);

const CLAUDE_IDLE_NOTIFICATION_TYPES: ReadonlySet<string> = new Set([
  'idle_prompt'
]);

const HITL_MESSAGE_MARKERS: readonly string[] = [
  'permission',
  'approve',
  'confirm',
  'needs your'
];

function normalizeString(value: unknown): string {
  return typeof value === 'string' ? value.trim().toLowerCase() : '';
}

/** Classify Notification hooks consistently across main and renderer.
 *  Known Claude notification types are authoritative. Legacy and unknown
 *  types fall back to message markers, where a HITL signal wins over generic
 *  idle wording. Untrusted runtime field shapes safely normalize to empty. */
export function classifyHook(
  event: unknown,
  message?: unknown,
  notificationType?: unknown
): HookClass {
  if (event !== 'Notification') return null;

  const type = normalizeString(notificationType);
  if (CLAUDE_BLOCKING_NOTIFICATION_TYPES.has(type)) return 'needsHuman';
  if (CLAUDE_IDLE_NOTIFICATION_TYPES.has(type)) return 'idle';

  const msg = normalizeString(message);
  return HITL_MESSAGE_MARKERS.some((marker) => msg.includes(marker))
    ? 'needsHuman'
    : 'idle';
}
