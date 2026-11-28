/**
 * THE ACTIVITY TAB OF THE INTEGRATIONS SCREEN, main's half (0.5.6, founder 16
 * Oct 2026, design option 3). `integrations:activity` hands one key here and
 * gets the last events of that one integration, newest first.
 *
 * The events are the hive's log.jsonl lines (shared/integrationActivity.ts
 * says which line is which item). The log only grows, so only its tail is
 * read, asynchronously: ACTIVITY_TAIL_BYTES at most, never the whole file. A
 * missing or unreadable log is an empty list, never an error.
 *
 * Also the gate for the one log line a refused webhook call writes: a caller
 * hammering a webhook with a wrong secret must not grow the log by a line per
 * request.
 *
 * Electron free, so test/v056-integration-activity.test.cjs drives it on a
 * temp directory.
 */
import { open, type FileHandle } from 'node:fs/promises';
import {
  ACTIVITY_LIMIT,
  activityItemFor,
  isIntegrationActivityKey,
  type ActivityNameOf,
  type IntegrationActivityItem,
  type IntegrationActivityKey
} from '../shared/integrationActivity';

/** How much of the end of log.jsonl one request reads. */
export const ACTIVITY_TAIL_BYTES = 4 * 1024 * 1024;

/** The last `maxBytes` of a file as text, starting at a whole line. Empty when
 *  the file is missing, empty or unreadable. */
export async function readLogTail(path: string, maxBytes: number = ACTIVITY_TAIL_BYTES): Promise<string> {
  let fh: FileHandle | undefined;
  try {
    fh = await open(path, 'r');
    const { size } = await fh.stat();
    const len = Math.min(size, Math.max(0, Math.floor(maxBytes)));
    if (len <= 0) return '';
    const buf = Buffer.allocUnsafe(len);
    let got = 0;
    while (got < len) {
      const { bytesRead } = await fh.read(buf, got, len - got, size - len + got);
      if (bytesRead <= 0) break;
      got += bytesRead;
    }
    let text = buf.toString('utf8', 0, got);
    // Started inside a line: that line is cut, so it goes.
    if (size > len) {
      const nl = text.indexOf('\n');
      text = nl < 0 ? '' : text.slice(nl + 1);
    }
    return text;
  } catch {
    return '';
  } finally {
    if (fh) await fh.close().catch(() => undefined);
  }
}

/** A string every line for `key` holds, so most lines are skipped before any
 *  JSON is parsed. Only a first sieve: activityItemFor decides. */
function needleFor(key: IntegrationActivityKey): string {
  if (key === 'slack') return '"slack';
  return `"${key.slice(key.indexOf(':') + 1)}"`;
}

export interface ActivityReadOptions {
  /** An agent id to the name the screen shows. */
  nameOf?: ActivityNameOf;
  /** Defaults to ACTIVITY_TAIL_BYTES. */
  tailBytes?: number;
}

/** The last ACTIVITY_LIMIT events of one integration, newest first. Any key
 *  that is not one of the four shapes is an empty list. */
export async function integrationActivity(logPath: string | null | undefined, key: unknown, opts: ActivityReadOptions = {}): Promise<IntegrationActivityItem[]> {
  if (!logPath || !isIntegrationActivityKey(key)) return [];
  const text = await readLogTail(logPath, opts.tailBytes ?? ACTIVITY_TAIL_BYTES);
  if (!text) return [];
  const needle = needleFor(key);
  const out: IntegrationActivityItem[] = [];
  // From the end back, so the newest lines are read first and the walk stops
  // once the list is full.
  let end = text.length;
  while (end > 0 && out.length < ACTIVITY_LIMIT) {
    const start = text.lastIndexOf('\n', end - 1);
    const line = text.slice(start + 1, end);
    end = start < 0 ? 0 : start;
    if (!line.includes(needle)) continue;
    let raw: unknown;
    try { raw = JSON.parse(line); } catch { continue; }
    const item = activityItemFor(raw, key, opts.nameOf);
    if (item) out.push(item);
  }
  // Lines are in append order; a clock that stepped back is put right here.
  return out.sort((a, b) => b.at - a.at);
}

/**
 * At most one refused line per webhook and status in `windowMs`. True: write
 * the line. The map forgets old entries, so ids that stop coming cost nothing.
 */
export function refusalGate(windowMs = 10_000, max = 256): (webhookId: string, status: number, now?: number) => boolean {
  const last = new Map<string, number>();
  return (webhookId, status, now = Date.now()) => {
    const k = `${webhookId}\n${status}`;
    const prev = last.get(k);
    if (prev !== undefined && now - prev < windowMs) return false;
    last.delete(k);
    last.set(k, now);
    while (last.size > max) {
      const oldest = last.keys().next().value;
      if (oldest === undefined) break;
      last.delete(oldest);
    }
    return true;
  };
}
