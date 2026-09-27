/**
 * THE FREE ACCOUNT, RENDERER SIDE.
 *
 * Main owns `<userData>/teams/free.json` (main/freeAccount.ts); this store
 * reads it once and subscribes to changes, the same shape and the same
 * reasoning as pro/onboarding/soloLicense.ts: no localStorage, because a
 * cached copy here would be a second source of truth for the one record the
 * gate reads.
 *
 * `known` matters here exactly as it does for the licence: the first read is
 * a round trip, and until it answers, the honest state is "not yet", so
 * App.tsx can hold the frame rather than flashing the free door at a person
 * who is already registered.
 *
 * Every bridge door is read defensively: a build whose main half has not
 * landed (the preview harness, a hot reload across an old preload) answers
 * "no free account" instead of throwing.
 */
import { useSyncExternalStore } from 'react';
import type { FreeAccountView, FreeRegisterResult } from '@shared/freeTier';

type Snapshot = { free: FreeAccountView | null; known: boolean };

let current: Snapshot = { free: null, known: false };
let started = false;
const subscribers = new Set<() => void>();

function set(next: Snapshot): void {
  if (next.free === current.free && next.known === current.known) return;
  current = next;
  subscribers.forEach((fn) => fn());
}

interface FreeBridge {
  freeAccount?: () => Promise<FreeAccountView | null>;
  onFreeAccount?: (cb: (v: FreeAccountView | null) => void) => () => void;
  freeSignInBegin?: () => Promise<{ ok: true; url: string; expiresAt: string }>;
  freeSignInPaste?: (pasted: string) => Promise<{ ok: true } | { ok: false; error: 'signin'; detail: string }>;
  freeSignInCancel?: () => Promise<{ ok: true }>;
  onFreeGrant?: (cb: () => void) => () => void;
  freeRegister?: () => Promise<FreeRegisterResult>;
  freeSignOut?: () => Promise<{ ok: true }>;
}

function bridge(): FreeBridge | undefined {
  if (typeof window === 'undefined') return undefined;
  return window.cth as unknown as FreeBridge | undefined;
}

function start(): void {
  if (started) return;
  started = true;
  const api = bridge();
  if (!api?.freeAccount) { set({ free: null, known: true }); return; }
  void api.freeAccount().then(
    (v) => set({ free: v ?? null, known: true }),
    () => set({ free: null, known: true })
  );
  api.onFreeAccount?.((v) => set({ free: v ?? null, known: true }));
}

function subscribe(onChange: () => void): () => void {
  subscribers.add(onChange);
  return () => { subscribers.delete(onChange); };
}

/** The free account this machine registered, and whether main has answered. */
export function useFreeAccount(): Snapshot {
  start();
  return useSyncExternalStore(subscribe, () => current);
}

/** The sign-in doors, each answering a refusal rather than throwing. */
export const freeDoor = {
  begin: async (): Promise<{ ok: true; expiresAt: string } | { ok: false; detail: string }> => {
    const api = bridge();
    if (!api?.freeSignInBegin) return { ok: false, detail: 'This build cannot start the sign-in. Restart the app.' };
    try {
      const r = await api.freeSignInBegin();
      return { ok: true, expiresAt: r.expiresAt };
    } catch (e) {
      return { ok: false, detail: e instanceof Error ? e.message : 'The sign-in could not start.' };
    }
  },
  paste: async (pasted: string): Promise<{ ok: true } | { ok: false; detail: string }> => {
    const api = bridge();
    if (!api?.freeSignInPaste) return { ok: false, detail: 'This build cannot accept the code. Restart the app.' };
    const r = await api.freeSignInPaste(pasted);
    return r.ok ? { ok: true } : { ok: false, detail: r.detail };
  },
  cancel: (): void => { void bridge()?.freeSignInCancel?.(); },
  onGrant: (cb: () => void): (() => void) => bridge()?.onFreeGrant?.(cb) ?? (() => {}),
  /** Sign out of this machine: main forgets the account and any licence, and
   *  the gate hears both records go. Nothing to answer; the records are the
   *  truth and the store is already subscribed to them. */
  signOut: async (): Promise<void> => {
    try { await bridge()?.freeSignOut?.(); } catch { /* the records did not change; the gate stays */ }
  },
  register: async (): Promise<FreeRegisterResult> => {
    const api = bridge();
    if (!api?.freeRegister) return { ok: false, error: 'refused', detail: 'This build cannot finish the registration. Restart the app.' };
    try {
      const res = await api.freeRegister();
      if (res.ok) {
        // Mirror immediately: main pushes too, but the door that registered
        // must not wait on a push to move on.
        void api.freeAccount?.().then((v) => set({ free: v ?? null, known: true }));
      }
      return res;
    } catch (e) {
      return { ok: false, error: 'refused', detail: e instanceof Error ? e.message : null };
    }
  }
};
