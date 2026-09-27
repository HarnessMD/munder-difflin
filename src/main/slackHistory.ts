/**
 * The Slack ledger on disk: every message a Slack thread pushed at us, and
 * every post we made back (a worker's direct reply through the loopback
 * endpoint, the done-summary poller, the app's own `slack:reply`). PRO's Inbox
 * reads it as the "Slack" thread; before it existed the app could post to
 * Slack and had no record that it had.
 *
 * Same shape and the same reasons as triggerHistory.ts: its own file in
 * userData (append-heavy, disposable, never able to cost the user a setting),
 * newest first on disk, capped, every disk touch wrapped so recording an event
 * can never fail the event. The row shape and the cap live in
 * shared/slackHistory.ts, where the test can reach them without electron.
 *
 * SECURITY: rows are built field by field; the bot token never reaches this
 * module. Text is the Slack message body as posted or received.
 */
import { app } from 'electron';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { randomBytes } from 'node:crypto';
import { parseSlackHistory, withSlackHistoryEntry, type SlackHistoryEntry, type SlackHistoryInput } from '../shared/slackHistory';

function historyPath(): string {
  return join(app.getPath('userData'), 'slack-history.json');
}

function readAll(): SlackHistoryEntry[] {
  const p = historyPath();
  if (!existsSync(p)) return [];
  try { return parseSlackHistory(JSON.parse(readFileSync(p, 'utf8'))); } catch { return []; }
}

function writeAll(entries: SlackHistoryEntry[]): void {
  try {
    const p = historyPath();
    mkdirSync(dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(entries, null, 2), 'utf8');
  } catch { /* best-effort; a ledger write must never fail the post it records */ }
}

/** Newest first. */
export function listSlackHistory(): SlackHistoryEntry[] {
  return readAll();
}

export function appendSlackHistory(input: SlackHistoryInput): SlackHistoryEntry {
  const { entry, next } = withSlackHistoryEntry(readAll(), input, randomBytes(8).toString('hex'), Date.now());
  writeAll(next);
  return entry;
}

export function clearSlackHistory(): void {
  writeAll([]);
}
