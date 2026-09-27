/**
 * THE DATA BEHIND THE PRO RAIL'S ROW (0.5.3, F25, Pam's HANDOFF.md items 1
 * to 4 and the performance notes). Everything a row shows beyond its agent
 * record lives here at module level, read through useSyncExternalStore with
 * a per row selector, so a change for one agent re-renders that agent's row
 * and nothing else:
 *
 *   mail       hive:humanMailSince, polled while any row is on screen and
 *              re-read on a routed push flagged for the person; the count
 *              and three short texts per agent, never a thread
 *   seen       the per agent last-opened stamp and the done cards known at
 *              that open (@shared/railSeen, localStorage); opening an agent
 *              is the only thing that clears a badge or a Finished strip
 *   activity   the stamp of each agent's last digest entry, for the age at
 *              the end of the live line
 *   the clock  one 30 s tick that only the age text subscribes to
 *   hold       the 1:1 push from main, copied into the store's agent record
 *
 * Nothing here reads transcripts, pty chunks or message bodies.
 */
import { useEffect, useSyncExternalStore } from 'react';
import type { ActivityPush } from '@shared/activity';
import { finishedSince, markOpened, readRailSeen, writeRailSeen, type RailSeen } from '@shared/railSeen';
import { useStore } from '@/store/store';
import { readTaskLedger, refreshTaskLedger, useTaskLedger } from '@/store/taskLedger';
import type { HiveTask } from '../TasksKanban';

export type HumanMail = Awaited<ReturnType<NonNullable<typeof window.cth.hiveHumanMailSince>>>[string];

function api() { return typeof window === 'undefined' ? undefined : window.cth; }

/* ---- seen marks ---------------------------------------------------------- */
let seen: RailSeen | null = null;
let seenVersion = 0;
const seenSubs = new Set<() => void>();
function marks(): RailSeen { if (!seen) seen = readRailSeen(); return seen; }
function subscribeSeen(cb: () => void): () => void { seenSubs.add(cb); return () => { seenSubs.delete(cb); }; }
const readSeen = (): RailSeen => marks();

export function useRailSeen(): RailSeen {
  useSyncExternalStore(subscribeSeen, () => seenVersion, () => seenVersion);
  return marks();
}

/** The person opened this agent's screen: stamp it, note its done cards,
 *  drop its unread mail now (the door confirms on the next read). */
export function markAgentOpened(agentId: string, agentName?: string): void {
  seen = markOpened(marks(), agentId, agentName, readTaskLedger() ?? []);
  writeRailSeen(seen);
  seenVersion++;
  seenSubs.forEach((f) => f());
  if (mail[agentId]) { mail = { ...mail }; delete mail[agentId]; mailVersion++; mailSubs.forEach((f) => f()); }
  void refreshMail();
}

/* ---- mail to the person ---------------------------------------------------- */
let mail: Record<string, HumanMail> = {};
let mailVersion = 0;
const mailSubs = new Set<() => void>();
const mailWants = new Set<object>();
let mailTimer: number | null = null;
let mailInflight: Promise<void> | null = null;
let mailPushOff: (() => void) | null = null;
let mailPushDebounce: number | null = null;
const MAIL_POLL_MS = 15_000;
const NO_MAIL: HumanMail = { count: 0, latest: '', texts: [] };

export function refreshMail(): Promise<void> {
  if (mailInflight) return mailInflight;
  const a = api();
  if (!a?.hiveHumanMailSince) return Promise.resolve();
  mailInflight = a.hiveHumanMailSince(marks().opened).then((got) => {
    const next = got && typeof got === 'object' ? got : {};
    if (JSON.stringify(next) === JSON.stringify(mail)) return;
    mail = next;
    mailVersion++;
    mailSubs.forEach((f) => f());
  }).catch(() => { /* keep what we had */ }).finally(() => { mailInflight = null; });
  return mailInflight;
}

function mailRetime(): void {
  const a = api();
  if (mailWants.size === 0) {
    if (mailTimer !== null) { window.clearInterval(mailTimer); mailTimer = null; }
    mailPushOff?.(); mailPushOff = null;
    return;
  }
  if (mailTimer === null) {
    void refreshMail();
    mailTimer = window.setInterval(() => { void refreshMail(); }, MAIL_POLL_MS);
  }
  if (!mailPushOff && a?.onHiveMessage) {
    mailPushOff = a.onHiveMessage((e) => {
      if (!e.needsHuman && e.to !== 'human') return;
      if (mailPushDebounce !== null) window.clearTimeout(mailPushDebounce);
      mailPushDebounce = window.setTimeout(() => { mailPushDebounce = null; void refreshMail(); }, 300);
    });
  }
}
function subscribeMail(cb: () => void): () => void { mailSubs.add(cb); return () => { mailSubs.delete(cb); }; }

/** This agent's unread mail to the person. The same object until it changes. */
export function useHumanMailFor(agentId: string): HumanMail {
  useEffect(() => {
    const token = {};
    mailWants.add(token);
    mailRetime();
    return () => { mailWants.delete(token); mailRetime(); };
  }, []);
  return useSyncExternalStore(subscribeMail, () => mail[agentId] ?? NO_MAIL, () => NO_MAIL);
}

/* ---- finished since last looked ------------------------------------------ */
const NONE: HiveTask[] = [];
let finishedCache: { tasks: HiveTask[] | null; seen: RailSeen; by: Map<string, HiveTask[]> } | null = null;

/** Cards this agent finished since the person last opened it. Same array
 *  until the ledger or the marks change. */
export function useFinishedSince(agentId: string, agentName?: string): HiveTask[] {
  const { tasks } = useTaskLedger(10_000);
  const s = useRailSeen();
  if (!tasks) return NONE;
  if (!finishedCache || finishedCache.tasks !== tasks || finishedCache.seen !== s) finishedCache = { tasks, seen: s, by: new Map() };
  const key = `${agentId}\n${agentName ?? ''}`;
  let hit = finishedCache.by.get(key);
  if (!hit) {
    const list = finishedSince(tasks, agentId, agentName, s);
    hit = list.length ? list : NONE;
    finishedCache.by.set(key, hit);
  }
  return hit;
}

/* ---- the last activity stamp per agent ----------------------------------- */
const lastTs = new Map<string, number>();
const tsSubs = new Set<() => void>();
let tsFollowOff: (() => void) | null = null;
const tsAsked = new Set<string>();

function followActivity(): void {
  const a = api();
  if (tsFollowOff || !a?.onAgentActivity) return;
  tsFollowOff = a.onAgentActivity((e: ActivityPush) => {
    const prev = lastTs.get(e.agentId) ?? 0;
    if (e.entry.ts <= prev) return;
    lastTs.set(e.agentId, e.entry.ts);
    tsSubs.forEach((f) => f());
  });
}
function askActivity(agentId: string): void {
  const a = api();
  if (tsAsked.has(agentId) || !a?.agentActivity) return;
  tsAsked.add(agentId);
  a.agentActivity(agentId, 1).then((rows) => {
    if (!Array.isArray(rows) || rows.length === 0) return;
    const last = rows[rows.length - 1];
    if ((lastTs.get(agentId) ?? 0) >= last.ts) return;
    lastTs.set(agentId, last.ts);
    tsSubs.forEach((f) => f());
  }).catch(() => { /* stay unknown */ });
}
function subscribeTs(cb: () => void): () => void { tsSubs.add(cb); return () => { tsSubs.delete(cb); }; }

/** When this agent last did something, epoch ms, or 0 when nothing is known. */
export function useLastActivityTs(agentId: string): number {
  useEffect(() => { followActivity(); askActivity(agentId); }, [agentId]);
  return useSyncExternalStore(subscribeTs, () => lastTs.get(agentId) ?? 0, () => 0);
}

/* ---- the clock the age text reads ----------------------------------------- */
let tick = Date.now();
const tickSubs = new Set<() => void>();
let tickTimer: number | null = null;
const TICK_MS = 30_000;
function subscribeTick(cb: () => void): () => void {
  tickSubs.add(cb);
  if (tickTimer === null) tickTimer = window.setInterval(() => { tick = Date.now(); tickSubs.forEach((f) => f()); }, TICK_MS);
  return () => {
    tickSubs.delete(cb);
    if (tickSubs.size === 0 && tickTimer !== null) { window.clearInterval(tickTimer); tickTimer = null; }
  };
}
/** "Now", to the half minute. Only the age text should read it. */
export function useAgoNow(): number {
  return useSyncExternalStore(subscribeTick, () => tick, () => tick);
}

/* ---- the 1:1 hold, pushed from main --------------------------------------- */
let holdOff: (() => void) | null = null;
/** Copy every hold change main announces into the store, once per renderer. */
export function followAgentHold(): void {
  const a = api();
  if (holdOff || !a?.onAgentHold) return;
  holdOff = a.onAgentHold((e) => { useStore.getState().updateAgent(e.agentId, { onHold: e.onHold }); });
}

/** Test seam: forget everything, as a fresh renderer would. */
export function resetRailDataForTests(): void {
  seen = null; seenVersion = 0;
  mail = {}; mailVersion = 0; mailWants.clear();
  if (mailTimer !== null) { window.clearInterval(mailTimer); mailTimer = null; }
  mailPushOff?.(); mailPushOff = null; mailInflight = null;
  finishedCache = null; lastTs.clear(); tsAsked.clear(); tsFollowOff?.(); tsFollowOff = null;
  holdOff?.(); holdOff = null;
}
