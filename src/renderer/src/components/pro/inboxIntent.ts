/**
 * "Open Inbox on THIS chat." The Team screen's Message button and a teammate's
 * row both land in Inbox on that person's DM (founder: clicking a Team member
 * opens their DM in Inbox). Inbox keeps its selected chat in local state, so
 * the intent is handed over here: the caller sets it, navigates, and Inbox
 * takes it on mount. Taken once, so a later plain visit to Inbox opens on the
 * floor as usual.
 */
let pending: string | null = null;

export function requestInboxChat(chatId: string): void {
  pending = chatId;
}

export function takeInboxChat(): string | null {
  const v = pending;
  pending = null;
  return v;
}
