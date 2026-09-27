/**
 * THE JOIN, AS DATA. D2 through D4 of the first run, with no pixels in it.
 *
 * Two surfaces draw this flow: the Classic screens in FirstRunFlow.tsx and
 * the PRO onboarding card (components/pro/onboarding/JoinStep.tsx, v0.4.9
 * phase 1). They must not drift on WHAT the join does, so the bridge, the
 * stages, the one-enrol-per-grant rule and the five minute wait all live
 * here, and each surface only decides how a stage looks.
 *
 * THE JOIN IS REAL (plan 2.2 and 4.1). Continue on D2 opens the browser for
 * the Clerk sign-in; the grant comes back by deep link or by paste; main then
 * generates the key, registers it, verifies the fingerprint and writes the
 * membership, pushing each row of D3 as it starts. Every refusal is a value
 * rendered on the screen it belongs to, and after any refusal there is no key
 * and no membership on this machine.
 *
 * THE HARNESS BRIDGE. The preview mounts the Classic flow with no
 * `window.cth`, and that is what makes every D2 state reviewable without the
 * app. So when the bridge is absent a fixture stands in: the sign-in is
 * skipped and the failure codes (`MD-0000-0000` invalid, 1111 used, 2222
 * expired, 3333 offline, 4444 refused with a sentence) are reachable by
 * typing. It cannot run in the shipped app, where the bridge always exists.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import { MOCK_ORG } from '../mockTeam';
import type { CodeError, EnrolProgress, EnrolResult } from '@shared/teams';

export type JoinStage = 'choose' | 'code' | 'signin' | 'identity' | 'joined';

export interface EnrolError {
  code: CodeError;
  detail: string | null;
  reason?: 'keyring_unavailable' | 'keyring_not_encrypting' | 'fingerprint_mismatch';
}

/* ---- the bridge, real or fixture ------------------------------------------ */

type SignInBegun =
  | { ok: true; url: string | null; skipped: boolean; expiresAt: string }
  | { ok: false; error: 'refused'; detail: string; reason: EnrolError['reason'] };

interface JoinBridge {
  signInBegin: () => Promise<SignInBegun>;
  signInPaste: (pasted: string) => Promise<{ ok: true } | { ok: false; error: 'signin'; detail: string }>;
  signInCancel: () => Promise<unknown>;
  onGrant: (cb: () => void) => () => void;
  enrol: (input: { code: string }) => Promise<EnrolResult>;
  onProgress: (cb: (step: EnrolProgress) => void) => () => void;
}

function realBridge(): JoinBridge | null {
  const api = typeof window === 'undefined' ? undefined : window.cth;
  if (!api?.teamsEnrol) return null;
  return {
    signInBegin: () => api.teamsSignInBegin(),
    signInPaste: (p) => api.teamsSignInPaste(p),
    signInCancel: () => api.teamsSignInCancel(),
    onGrant: (cb) => api.onTeamsGrant(cb),
    enrol: (i) => api.teamsEnrol(i),
    onProgress: (cb) => api.onTeamsEnrolProgress(cb),
  };
}

/** Harness only. See the header. */
function fixtureBridge(): JoinBridge {
  const progress = new Set<(s: EnrolProgress) => void>();
  const wait = (ms: number) => new Promise<void>((r) => window.setTimeout(r, ms));
  const refuse = (error: CodeError, detail: string | null): EnrolResult => ({ ok: false, error, detail });
  return {
    signInBegin: async () => ({ ok: true, url: null, skipped: true, expiresAt: new Date(Date.now() + 300_000).toISOString() }),
    signInPaste: async () => ({ ok: true }),
    signInCancel: async () => undefined,
    onGrant: () => () => {},
    onProgress: (cb) => { progress.add(cb); return () => { progress.delete(cb); }; },
    enrol: async ({ code }) => {
      const body = code.replace(/^MD-/, '');
      progress.forEach((cb) => cb('keys'));
      await wait(700);
      if (body === '0000-0000') return refuse('invalid', null);
      if (body === '1111-1111') return refuse('used', null);
      if (body === '2222-2222') return refuse('expired', null);
      if (body === '3333-3333') return refuse('offline', null);
      progress.forEach((cb) => cb('registering'));
      await wait(700);
      if (body === '4444-4444') return refuse('refused', '10 of 10 seats are in use.');
      progress.forEach((cb) => cb('checking'));
      await wait(500);
      return {
        ok: true, org: { orgId: 'org_fixture', name: MOCK_ORG.name },
        memberId: 'mem_fixture', deviceId: 'dev_fixture', fingerprint: '4A7F 2C19 88BE 03D5 F16A 9C42',
      };
    },
  };
}

/* ---- the flow -------------------------------------------------------------- */

export interface JoinFlow {
  stage: JoinStage;
  /** The code as entered on D2; the enrol runs with it once the grant lands. */
  code: string;
  error: EnrolError | null;
  /** Something is in flight: the browser being opened, a paste being checked. */
  busy: boolean;
  /** Which D3 row is running, or `done` once all three have. */
  step: EnrolProgress | 'done';
  /** From the relay's enrol answer. Null until it answers. */
  orgName: string | null;
  /** D1 to D2 and back. Clears any error, so a refusal does not follow. */
  goTo: (stage: 'choose' | 'code') => void;
  /** D2's Continue: keep the code, open the browser (or enrol at once under the dev switch). */
  submitCode: (entered: string) => void;
  /** Plan 4.8: a seat already exists and this is a new laptop; the sign-in alone names it. */
  secondMachine: () => void;
  /** The paste fallback beside the "waiting for your browser" state. */
  pasteGrant: (pasted: string) => void;
  /** Open the browser again with a fresh state, same code. */
  openAgain: () => void;
  /** Cancel the sign-in and go back to the code. */
  backToCode: () => void;
  /** After a refusal on D3: the grant is spent and the code may be wrong, both live on D2. */
  retry: () => void;
  /** D3's third tick has been seen; move on to D4. */
  finishIdentity: () => void;
}

export function useJoinFlow(start: 'choose' | 'code' = 'choose'): JoinFlow {
  const bridgeRef = useRef<JoinBridge | null>(null);
  if (!bridgeRef.current) bridgeRef.current = realBridge() ?? fixtureBridge();
  const bridge = bridgeRef.current;

  const [stage, setStage] = useState<JoinStage>(start);
  const [code, setCode] = useState('');
  const [error, setError] = useState<EnrolError | null>(null);
  const [busy, setBusy] = useState(false);
  const [step, setStep] = useState<EnrolProgress | 'done'>('keys');
  const [orgName, setOrgName] = useState<string | null>(null);
  /* One enrol per grant. The grant can announce itself twice (the paste reply
     and the push both say it arrived) and both must not each start an enrol. */
  const enrolling = useRef(false);

  const runEnrol = useCallback(async (theCode: string) => {
    if (enrolling.current) return;
    enrolling.current = true;
    setError(null);
    setStep('keys');
    setStage('identity');
    const r = await bridge.enrol({ code: theCode });
    enrolling.current = false;
    if (r.ok) {
      setOrgName(r.org.name);
      setStep('done');
    } else {
      setError({ code: r.error, detail: r.detail, reason: r.reason });
    }
  }, [bridge]);

  useEffect(() => bridge.onProgress(setStep), [bridge]);
  useEffect(() => bridge.onGrant(() => { void runEnrol(code); }), [bridge, runEnrol, code]);

  /* The console's grant lives five minutes; so does our wait for it. */
  useEffect(() => {
    if (stage !== 'signin' || error) return;
    const id = window.setTimeout(() => {
      setError({ code: 'signin', detail: null });
    }, 5 * 60_000);
    return () => window.clearTimeout(id);
  }, [stage, error]);

  const beginSignIn = useCallback(async (theCode: string) => {
    setError(null);
    setBusy(true);
    const r = await bridge.signInBegin();
    setBusy(false);
    if (!r.ok) { setError({ code: r.error, detail: r.detail, reason: r.reason }); return; }
    if (r.skipped) { void runEnrol(theCode); return; }
    setStage('signin');
  }, [bridge, runEnrol]);

  const submitCode = useCallback((entered: string) => {
    setCode(entered);
    void beginSignIn(entered);
  }, [beginSignIn]);

  const secondMachine = useCallback(() => {
    setError(null);
    setCode('');
    void beginSignIn('');
  }, [beginSignIn]);

  const pasteGrant = useCallback(async (pasted: string) => {
    setBusy(true);
    const r = await bridge.signInPaste(pasted);
    setBusy(false);
    if (!r.ok) { setError({ code: r.error, detail: r.detail }); return; }
    setError(null);
    void runEnrol(code);
  }, [bridge, runEnrol, code]);

  const openAgain = useCallback(() => { void beginSignIn(code); }, [beginSignIn, code]);

  const backToCode = useCallback(() => {
    void bridge.signInCancel();
    setStage('code');
  }, [bridge]);

  const goTo = useCallback((next: 'choose' | 'code') => {
    setError(null);
    setStage(next);
  }, []);

  const retry = useCallback(() => { setError(null); setStage('code'); }, []);
  const finishIdentity = useCallback(() => setStage('joined'), []);

  return {
    stage, code, error, busy, step, orgName,
    goTo, submitCode, secondMachine, pasteGrant: (p) => { void pasteGrant(p); },
    openAgain, backToCode, retry, finishIdentity
  };
}
