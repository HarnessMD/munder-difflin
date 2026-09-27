/**
 * The one card every onboarding step sits in (v0.4.9 phase 1, the approved
 * `viewOnboard()` in the prototype): a plain ground, a step bar, a title, a
 * lead sentence, the step's own controls, and a footer with the way forward
 * pushed to the right. Kit tokens only.
 */
import type { ReactNode } from 'react';
import { useTranslation } from 'react-i18next';

/** Join, workspace, orchestrator, team. The orchestrator got its own step on
 *  3 Sep 2026 (founder): it is the one agent that runs the others, not a pair
 *  of controls at the bottom of the workspace screen. */
export const ONBOARD_STEPS = 4;

export function OnboardFrame({ step, title, lead, children, footer, wide }: {
  /** Zero based. Absent draws no step bar: the join alone, for an install
   *  that finished onboarding and has no membership. */
  step?: number;
  title: string;
  lead: ReactNode;
  children?: ReactNode;
  footer?: ReactNode;
  /** 1120 instead of 520: the paywall lays its feature grid and roadmap side
   *  by side so the whole wall fits a laptop window without scrolling (founder,
   *  5 Sep 2026); every onboarding step stays at the narrow width. */
  wide?: boolean;
}) {
  const { t } = useTranslation();
  return (
    /* `margin: auto` on the card, not `place-items: center` on the ground: a
       centred flex child that overflows is clipped at the top and cannot be
       scrolled to, while auto margins centre while it fits and collapse to a
       normal scroll once it does not. */
    <div style={{
      position: 'fixed', inset: 0, zIndex: 200, display: 'flex', overflowY: 'auto', padding: 24,
      background: 'var(--cth-cream-50)', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)'
    }}>
      <div style={{
        width: wide ? 'min(1120px, 100%)' : 'min(520px, 100%)', margin: 'auto', boxSizing: 'border-box', padding: 28,
        background: 'var(--cth-cream-100)', border: '1px solid var(--cth-ink-300)', borderRadius: 14,
        boxShadow: 'var(--cth-shadow-hard)'
      }}>
        {step !== undefined && (
          <div
            role="progressbar" aria-valuemin={1} aria-valuemax={ONBOARD_STEPS} aria-valuenow={step + 1}
            aria-label={t('pro.onboarding.step', { n: step + 1, total: ONBOARD_STEPS })}
            style={{ display: 'flex', gap: 6, marginBottom: 22 }}
          >
            {Array.from({ length: ONBOARD_STEPS }, (_, i) => (
              <i key={i} style={{ height: 3, borderRadius: 2, flex: 1, background: i <= step ? 'var(--cth-accent)' : 'var(--cth-cream-200)' }} />
            ))}
          </div>
        )}
        <h2 style={{ margin: '0 0 6px', fontSize: 18, fontWeight: 600, lineHeight: 1.3 }}>{title}</h2>
        <div style={{ margin: '0 0 18px', fontSize: 13, lineHeight: 1.5, color: 'var(--cth-ink-500)' }}>{lead}</div>
        {children}
        {footer}
      </div>
    </div>
  );
}

/** Back on the left, the way forward on the right. */
export function OnboardFooter({ back, primary }: { back?: ReactNode; primary?: ReactNode }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 22, alignItems: 'center' }}>
      {back}
      <span style={{ flex: 1 }} />
      {primary}
    </div>
  );
}

/** A refusal or a failure, in the blocked colour, where it happened. */
export function ErrorLine({ children }: { children: ReactNode }) {
  return <div role="alert" style={{ fontSize: 12.5, lineHeight: 1.45, color: 'var(--cth-status-blocked)', overflowWrap: 'anywhere' }}>{children}</div>;
}

/** The muted sentence under a control. */
export function Note({ children }: { children: ReactNode }) {
  return <div style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--cth-ink-500)' }}>{children}</div>;
}
