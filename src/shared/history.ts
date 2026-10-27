/**
 * The per-agent History tab's wire types. Ported from Prozzta/guppyos 02d0d50b (MIT).
 *
 * The terminal's scrollback is not a record of the conversation (resize repaints and
 * transcript replays land in it as stale frames), so the
 * History tab reads the provider's OWN transcript file instead and shows it as a small,
 * normalised list of items. Main resolves the file from the agent id alone; the renderer
 * never names a path.
 *
 * CURSORS ARE BYTE OFFSETS of line starts in that file. The files are append-only, so an
 * offset stays valid while the file grows, and paging older and following newer are both
 * a single seek. The one exception is a resync cursor INSIDE a line too long to skip in one
 * request (historyTail RESYNC): it is passed back unchanged and the reader carries on from it.
 */

export type HistoryProvider = 'claude' | 'codex' | 'antigravity';

export type HistoryItemKind = 'user' | 'assistant' | 'tool' | 'system';

export interface HistoryItem {
  /** `<line offset>.<n>`: stable for the life of the file. */
  id: string;
  kind: HistoryItemKind;
  /** The record's own timestamp (ms since epoch), or null when it has none. */
  at: number | null;
  /** Plain text, already capped (HISTORY_TEXT_MAX / HISTORY_TOOL_MAX). */
  text: string;
  /** True when `text` was cut to the cap. */
  truncated?: boolean;
  /** Byte offset of the line this item came from. */
  offset: number;
}

export interface HistoryRequest {
  agentId: string;
  /** Page OLDER than this byte offset (a line start). */
  before?: number;
  /** Follow: lines starting at or after this byte offset (a line start). */
  after?: number;
  /** Items wanted for a tail / older page (default HISTORY_PAGE_DEFAULT, max HISTORY_PAGE_MAX). */
  limit?: number;
}

export type HistoryUnavailableReason =
  | 'no-agent'
  | 'unsupported-provider'
  | 'no-transcript'
  | 'unreadable';

export type HistoryPage =
  | {
      ok: true;
      provider: HistoryProvider;
      /** Identifies the file (a short hash of its path). A change means a new session. */
      fileId: string;
      /** Just the file's name, for the tab's footer. Never the full path. */
      fileName: string;
      /** Oldest first, newest last. */
      items: HistoryItem[];
      /** Byte range covered: [start, end). Line boundaries, or a resync cursor inside an oversized line. */
      start: number;
      end: number;
      /** True when `start` is 0: there is nothing older. */
      atStart: boolean;
      /** The file's size when read. */
      size: number;
      /** `after` was past the end of the file: it was truncated or replaced. Reload the tail. */
      reset?: boolean;
    }
  | { ok: false; reason: HistoryUnavailableReason };

export const HISTORY_PAGE_DEFAULT = 150;
export const HISTORY_PAGE_MAX = 400;
/** A message's text is cut here. */
export const HISTORY_TEXT_MAX = 4000;
/** A tool call is one line, cut here. */
export const HISTORY_TOOL_MAX = 240;
/** The renderer never holds more than this many items. */
export const HISTORY_RETAIN_MAX = 600;
