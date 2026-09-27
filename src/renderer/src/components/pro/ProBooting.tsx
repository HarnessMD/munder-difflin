/**
 * THE BOOT STATE (founder, 6 Sep 2026, item 7: "there is no loading state
 * when the app boots"; and 8 Sep 2026, card v052-startup-restore-loading:
 * the release drop landed on top of a restore that had no loading state).
 *
 * WHAT THE PERSON WAS SEEING. The roster loads synchronously from the shared
 * file (store.ts `loadPersistedAgents`), so the sidebar fills instantly, but
 * every restored agent comes back marked `action: 'reconnecting…'` with no
 * live session behind it yet: main has still to reattach each PTY. Workers
 * whose terminal died with the last session go a second way: App's reconcile
 * moves them to the restorable list and the automatic restore
 * (useRestoreTeam) respawns them a couple of seconds later. Until 0.5.2 only
 * the first way held a boot state, PRO only; the second had none anywhere,
 * so after an update the app opened over agents still spinning up, nothing
 * answered a click, and the release drop was drawn over that.
 *
 * WHAT COUNTS AS RECOVERED is `@shared/bootGate`: every reattach done, the
 * automatic restore over, and the PTY reconcile answered first. The overlay
 * is the whole window, blurred, with the count in the middle, and it is
 * mounted by BOTH skins (ProShell for PRO, App for Classic) so neither
 * meets a dead app again.
 *
 * WHY THERE IS STILL A CAP, AND A SKIP. One agent whose session cannot be
 * reattached, or a spawn that never answers, would otherwise hold the
 * overlay forever, and an app you cannot get into is a worse failure than a
 * roster that is briefly wrong. At the cap the overlay lifts on its own;
 * after a few seconds it offers "continue without waiting" as well.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { skipBootWait, useBootGate } from '@/store/bootGate';
import { BOOT_WAIT_CAP_MS } from '@shared/bootGate';
import brandLogo from '@brand/logo.png?url';
import { SteppedDots } from '../team/primitives';
import { Btn } from './ui';

/** The marker `loadPersistedAgents` stamps on every restored agent. Exported
 *  so the store's wording and this gate cannot drift apart silently. */
export const RECONNECTING = 'reconnecting…';

/** Never hold the app longer than this, however many sessions are stuck.
 *  One number, owned by the shared gate. */
export const BOOT_RECOVERY_CAP_MS = BOOT_WAIT_CAP_MS;

export interface BootRecovery {
  /** True while the overlay should be up. */
  recovering: boolean;
  /** Agents still on their way back, for the line in the middle. */
  remaining: number;
  /** The way out is offered. */
  skippable: boolean;
  skip: () => void;
}

/**
 * True while restored agents are still being reattached or respawned, false
 * the moment they are all back, the cap expires, or the person skips. A
 * machine with no persisted agents is never recovering, so a fresh install
 * goes straight in; so does one that has not finished onboarding.
 *
 * `onboardingComplete` is undefined while the config has not loaded, and the
 * gate holds its answer until it has. No default: a default of true turned
 * "not loaded" into "onboarded" and a default of false into "fresh install",
 * and the second is how the blur never drew (store/bootGate.ts).
 */
export function useBootRecovery(onboardingComplete: boolean | undefined): BootRecovery {
  const reconnecting = useStore((s) => s.agents.filter((a) => a.action === RECONNECTING).length);
  const gate = useBootGate({ reconnecting, onboardingComplete });
  return { recovering: !gate.settled, remaining: gate.remaining, skippable: gate.skippable, skip: skipBootWait };
}

/** The words the card carries, so a Classic card built elsewhere says
 *  exactly what the kit's says. */
export function useBootWords(remaining: number): { line: string; note: string; skip: string } {
  const { t } = useTranslation();
  return { line: t('pro.boot.restoring', { count: remaining }), note: t('pro.boot.note'), skip: t('pro.boot.skip') };
}

/**
 * The overlay itself: the whole window, blurred, the count in the middle.
 * Fixed rather than absolute so it covers the title bar too (the founder
 * asked for the full screen), and mounted over the shell rather than in
 * place of it, so nothing below unmounts when recovery finishes. The card
 * in the middle is the kit's; Classic passes its own pixel card in as
 * `card` (App.tsx), because nothing under pro/ may import the pixel
 * components (test/pro-fence.test.cjs).
 */
export function ProBooting({ remaining, skippable, onSkip, card }: {
  remaining: number; skippable?: boolean; onSkip?: () => void; card?: ReactNode;
}) {
  const words = useBootWords(remaining);
  return (
    <div
      role="status"
      aria-live="polite"
      data-boot-overlay={card ? 'classic' : 'pro'}
      style={{
        position: 'fixed', inset: 0, zIndex: 500,
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 14,
        background: 'color-mix(in srgb, var(--cth-cream-50) 62%, transparent)',
        backdropFilter: 'blur(9px)', WebkitBackdropFilter: 'blur(9px)'
      }}
    >
      {card ?? (
        <div style={{
          display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 14, padding: '22px 28px',
          borderRadius: 14, background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-300)', boxShadow: 'var(--cth-shadow-hard)'
        }}>
          <img src={brandLogo} alt="" style={{ width: 44, height: 44, borderRadius: 11, display: 'block' }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--cth-ink-900)' }}>
            <SteppedDots color="var(--cth-ink-500)" />
            {words.line}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{words.note}</div>
          {skippable && onSkip && (
            <Btn kind="ghost" onClick={onSkip}>{words.skip}</Btn>
          )}
        </div>
      )}
    </div>
  );
}
