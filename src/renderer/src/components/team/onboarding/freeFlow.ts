/**
 * THE FREE DOOR, AS DATA (5 Sep 2026, shared/freeTier.ts).
 *
 * joinFlow.ts's little sibling: the same browser round trip drawn by the same
 * D2b screen, with a lighter ending. Begin opens the console sign-in with the
 * free intent; the grant comes back by deep link or paste; main spends it at
 * the register endpoint and writes free.json; and the moment that record
 * exists every gate that reads it admits this machine. There is no enrolment,
 * no keypair and no org, which is why this hook has three stages where the
 * join has five.
 *
 * `registering` keeps the wait screen up with `busy` while the grant is being
 * spent. A refusal lands back on the wait screen with the server's sentence,
 * and the retry is a fresh sign-in, because the grant was single use either
 * way (the same rule the join follows).
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import i18n from 'i18next';
import { freeDoor } from '../../../store/freeAccount';

export type FreeStage = 'idle' | 'signin' | 'registering';

export interface FreeFlow {
  stage: FreeStage;
  error: string | null;
  busy: boolean;
  /** Open the browser and show the wait screen. Also the "open again" action. */
  begin: () => void;
  /** The person pasted the code (or the whole link) from the browser. */
  paste: (pasted: string) => void;
  /** Leave the door; cancels the pending sign-in in main. */
  back: () => void;
}

export function useFreeFlow(onRegistered?: () => void): FreeFlow {
  const [stage, setStage] = useState<FreeStage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const onRegisteredRef = useRef(onRegistered);
  onRegisteredRef.current = onRegistered;

  const finish = useCallback(async () => {
    setStage('registering');
    setBusy(true);
    const r = await freeDoor.register();
    setBusy(false);
    if (r.ok) {
      setStage('idle');
      setError(null);
      onRegisteredRef.current?.();
      return;
    }
    // The offline sentence is the ruled one (v050-forced-signup R6, copy
    // signed off 6 Sep 2026) and is localized: this hook serves the wall and
    // both onboardings, and the same failure must read the same everywhere.
    setError(r.detail ?? (r.error === 'offline'
      ? i18n.t('pro.onboarding.entry.wallOffline')
      : 'That sign-in could not be finished. Sign in again.'));
    setStage('signin');
  }, []);

  // The grant arrives from main (deep link or accepted paste): move on. Only
  // subscribed while the door is open, so a stray grant event cannot yank a
  // person who already left the flow.
  useEffect(() => {
    if (stage !== 'signin') return;
    return freeDoor.onGrant(() => { void finish(); });
  }, [stage, finish]);

  const begin = useCallback(() => {
    setError(null);
    setStage('signin');
    void freeDoor.begin().then((r) => {
      if (!r.ok) setError(r.detail);
    });
  }, []);

  const paste = useCallback((pasted: string) => {
    setBusy(true);
    void freeDoor.paste(pasted).then((r) => {
      setBusy(false);
      if (!r.ok) setError(r.detail);
      // On ok the grant event fires and `finish` runs; nothing more here.
    });
  }, []);

  const back = useCallback(() => {
    freeDoor.cancel();
    setStage('idle');
    setError(null);
    setBusy(false);
  }, []);

  return { stage, error, busy, begin, paste, back };
}
