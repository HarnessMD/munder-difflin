/**
 * The Teams network layer, renderer side.
 *
 * NOTHING HERE TALKS TO A NETWORK. This slice is the UI for D7 through D15 of
 * UI-PLAN-teams.md, backed by fixtures in `mockTeam.ts`. The relay, the
 * keypairs and the invite redemption are a later slice and deliberately not
 * mixed in, because mixing them makes either half unreviewable.
 *
 * 0.4.10: the permission model moved to `@shared/teamPolicy`. What is left
 * here is the ROW as the relay reports it, plus the deprecated one word type
 * the wire still carries. See the note on `NetworkLevel`.
 */

/**
 * @deprecated 0.4.10 replaced this with `TeamPolicy` in `@shared/teamPolicy`:
 * three axes rather than one word, because one axis cannot say "read me but do
 * not write to me".
 *
 * IT IS STILL EXPORTED, because three things still speak it and none of them is
 * this app's decision to make:
 *   - THE WIRE. `RelayMember.theyAllow` and `org.defaultPermission`
 *     (src/main/relay.ts:247,259) are these three words, and the relay is not
 *     ours to change in this release. Every read of one goes through
 *     `normalizePolicy`, which takes them via `presetFromLegacy`.
 *   - THE PIN FILE of an install upgrading from 0.4.9, migrated on first read
 *     (src/main/teamPins.ts) and kept in step so a downgrade still works.
 *   - THE CLASSIC SEAM, `TeamTab.tsx` and the onboarding cards, which still
 *     draw the three `LevelCard`s. PRO draws `StatusControl` and the policy
 *     editor instead.
 * Nothing ENFORCES it any more: `teamsBridge` reads policies.
 */
export type NetworkLevel = 'strict' | 'communication-only' | 'allow-all';

export const NETWORK_LEVELS: NetworkLevel[] = ['strict', 'communication-only', 'allow-all'];

/** i18n key stems for each legacy level. Labels live in the locale files. */
export const LEVEL_KEY: Record<NetworkLevel, string> = {
  'strict': 'blocked',
  'communication-only': 'agentsOnly',
  'allow-all': 'open'
};

export type Presence = 'online' | 'offline';

export interface Teammate {
  id: string;
  name: string;
  machine: string;
  presence: Presence;
  /** What THEY allow YOU to do, as the relay reports it. Read only: only they
   *  can change it, from their own machine. ALWAYS read through
   *  `normalizePolicy` (`useRoster().theirPolicy`), never compared to a string:
   *  the three wire words map exactly onto three of the four presets, and the
   *  screens speak presets. */
  theyAllow: NetworkLevel;
  /**
   * @deprecated What YOU allow THEM, in the old vocabulary. Main's roster join
   * still computes it (src/main/relay.ts:516) from the legacy projection in
   * the pin store, and the Classic seam still reads it. PRO does not: it reads
   * `useRoster().policyFor(id)` and `effectiveFor(id)`, which come from the
   * policy store `teamsBridge` actually enforces. `listen` has no old word, so
   * this field cannot express one and understates rather than overstates.
   */
  youAllow: NetworkLevel;
  /** @deprecated Set when `youAllow` differs from your global default. PRO
   *  asks `useRoster().hasOverride(id)`, which knows the difference between
   *  "set to the same value as the default" and "following the default". */
  overridden?: boolean;
  /** 0.4.9: what this person's orchestrator is called, chosen by them and
   *  unique in the org. Null on a seat that has not chosen one, and absent
   *  from a relay too old to carry it; either way no chip is drawn. */
  bossName?: string | null;
  /** 0.5.2: the relay holds no display name for this person, so `name` is
   *  their MACHINE (main's fallback). The self row asks for a name on it; a
   *  teammate row can say there is none. */
  unnamed?: boolean;
  /** 0.5.2: what this person's agents have called themselves in messages
   *  that reached this machine, most recent first. Local memory, never the
   *  relay's; absent until something has arrived. */
  agents?: string[];
  /** 0.5.2: would their machine take a message from THIS one right now, as
   *  the door they published says. False closes their side of the lane on
   *  screen (`useRoster().theirPolicy`); absent on an older relay. */
  receiving?: boolean;
  fingerprint: string;
  verified: boolean;
  /** A fingerprint that changed since it was last verified, pending D13. */
  previousFingerprint?: string;
  isSelf?: boolean;
  /** The relay's id for the machine this row shows. Trust pins are keyed by
   *  it, so D13's accept and the detail's Verify need it to reach the pin
   *  store. Absent only in fixtures. */
  deviceId?: string;
}

/** Six states, defined once in `@shared/teams` because main produces them and
 *  the renderer only renders them. Re-exported here so the screens keep one
 *  import path for their types. */
// Relative, not `@shared`: main's relay client imports `Teammate` from this
// file and the node tsconfig has no alias.
export type { ConnectionState } from '../../../../shared/teams';

export interface Org {
  name: string;
  seatsUsed: number;
  seats: number;
  /** The org default every new member starts on. */
  defaultLevel: NetworkLevel;
}

/** A request from another node's orchestrator, waiting on approval. */
export interface IncomingRequest {
  id: string;
  fromName: string;
  fromMachine: string;
  /** One line preview. Never the message body: that is not ours to show. */
  preview: string;
  detail: string;
  at: string;
  expired?: boolean;
}

export type DeliveryState = 'delivered' | 'sending' | 'queued' | 'failed';

export interface ThreadMessage {
  id: string;
  /** 'you' or the teammate's id. */
  from: 'you' | string;
  body: string;
  at: string;
  delivery: DeliveryState;
  /**
   * Which of YOUR agents picked the message up. Only ever set on messages that
   * caused local work, and only ever your own agents: what their agents did
   * with a message is not visible from here and never will be.
   */
  pickedUpBy?: { name: string; status: 'working' | 'thinking' | 'idle' | 'success' }[];
}
