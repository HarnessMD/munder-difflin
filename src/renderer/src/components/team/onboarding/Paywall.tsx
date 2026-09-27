/**
 * THE PAYWALL (founder ruling, 5 Sep 2026, second pass): an individual
 * onboards FIRST and meets this screen after, where the choice is buy or
 * skip. Skipping is a real path, not a dark pattern: it lands in free Classic
 * with everything local intact (App flips the skin; the account already
 * exists, the sign-in captured it during onboarding).
 *
 * REDRAWN IN PRO CHROME the same evening, after the founder saw the first
 * cut. It is the same OnboardFrame every onboarding step sits in, wide, with
 * three parts: the plan line (PRO, the price, one machine); what PRO gives
 * one person, screen by screen, in the kit's cards; and the next three months
 * as a rail. Every feature tile names a screen that exists in this build and
 * says what that screen does, in the screen's own terms, never a promise.
 * The roadmap order is the founder's: Sandboxes in a few weeks, then the
 * office's Brain (Team Brain for teams), then the dedicated mobile app, then
 * new features as we grow. Copy in paywall.*, tokens only, no literal colour.
 *
 * The key path REUSES the PRO onboarding's LicenseStep rather than growing a
 * second key field: one field, one format check, one redemption path in the
 * whole app, which is the same no-drift rule the join follows. A redeemed key
 * flips the skin to professional, because the person just bought PRO and the
 * next thing they see should be it.
 *
 * App.tsx mounts this for BOTH arrivals: the fresh individual whose wizard
 * just completed, and the machine that onboarded under an older build and
 * has no paid answer (the 0.4.6 upgrader), for whom skip is the one-minute
 * way back into their own data. FirstRunFlow, a harness fixture now, mounts
 * it the same way.
 */
import { useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { setAppSkin } from '@/design/skin';
import { useFunnelPing, type PaywallTrigger } from '@/analytics/funnel';
import { soloConsoleUrl } from '@shared/soloPro';
import { LicenseStep } from '../../pro/onboarding/LicenseStep';
import { OnboardFooter, OnboardFrame } from '../../pro/onboarding/OnboardFrame';
import { ProIcon, type ProIconName } from '../../pro/icons';
import { Btn, Card, Chip } from '../../pro/ui';

export interface PaywallProps {
  /** The person chose to skip: continue on the free plan. */
  onFree: () => void;
  /** Why this screen was drawn, for `paywall_shown` (0.5.0 funnel). The
   *  mounting branch knows; this component cannot work it out for itself.
   *  Defaults to `manual` for the harness fixture, which mounts it on purpose
   *  rather than because a gate sent someone here. */
  trigger?: PaywallTrigger;
}

/** The PRO screens a solo person gets, in the sidebar's order, led by the
 *  orchestrator. The id is the paywall.features key; the icon is the same
 *  glyph the sidebar draws for that screen.
 *
 *  TEN, not eight (founder, 9 Sep 2026, on Pam's audited list). Agent rooms
 *  and the Stapler are screens of their own that were never on the wall. The
 *  test for what may be here is not which folder a file sits in, it is what a
 *  free install is REFUSED: the licence gates the professional skin, so every
 *  Classic screen is free, and the Stapler is the one feature with a gate of
 *  its own (main/puck.ts will not make the window unless a PRO shell called
 *  `puck:admit`). Nothing about a teammate, a seat or a shared brain belongs
 *  here: a solo licence has no teammates at all (soloPro.ts `companyRows: []`). */
const FEATURES: readonly { id: string; icon: ProIconName }[] = [
  { id: 'orchestrator', icon: 'sparkle' },
  { id: 'agents', icon: 'agents' },
  { id: 'rooms', icon: 'panel' },
  { id: 'tasks', icon: 'tasks' },
  { id: 'inbox', icon: 'inbox' },
  { id: 'automations', icon: 'automations' },
  { id: 'memory', icon: 'memory' },
  { id: 'capabilities', icon: 'capabilities' },
  { id: 'stapler', icon: 'puck' },
  { id: 'temps', icon: 'temps' }
];

/** The next three months in the founder's order. The tone is the stop's
 *  status: accent for what is being built now, outline for what is planned,
 *  muted for what never stops. */
const ROADMAP: readonly { id: string; tone: 'accent' | 'outline' | 'muted' }[] = [
  { id: 'sandboxes', tone: 'accent' },
  { id: 'brain', tone: 'outline' },
  { id: 'mobile', tone: 'outline' },
  { id: 'growth', tone: 'muted' }
];

export function Paywall({ onFree, trigger = 'manual' }: PaywallProps) {
  const { t } = useTranslation();
  const [entering, setEntering] = useState(false);
  /* `paywall_shown` (0.5.0 funnel): the moment the money funnel begins, and
     the denominator every rate after it is measured against. Fired on MOUNT,
     which is before the key-entry branch below can replace the screen, so
     going to look for the key field still counts as having met the paywall. */
  useFunnelPing({ event: 'paywall_shown', plan: 'pro', trigger });

  if (entering) {
    return (
      <LicenseStep
        onBack={() => setEntering(false)}
        onDone={() => setAppSkin('professional')}
      />
    );
  }

  return (
    <OnboardFrame
      wide
      title={t('paywall.title')}
      lead={t('paywall.body')}
      footer={<OnboardFooter
        back={<Btn kind="ghost" onClick={onFree}>{t('paywall.skip')}</Btn>}
        primary={<>
          <Btn onClick={() => setEntering(true)}>{t('paywall.haveKey')}</Btn>
          {/* ITEM 2, THE HAND-OFF (founder 6 Sep 2026; route agreed with Kevin
              7 Sep 2026). It used to open the console's front door with no
              state, so the browser had no idea which machine was asking and
              there was nothing for a return trip to match against.
              `proCheckoutBegin` mints the state in main and opens
              /pro/checkout?state=<hex>. NOT /checkout: that path is the team
              admin door and would have dropped a solo person into
              organisation creation. Nobody signs in twice, because the browser
              already holds the session from step one; the app sends no
              identity of its own, since personId in a URL is not
              authentication and must not drive billing.
              The console falls back to soloConsoleUrl only if the bridge is
              missing, which is the harness and the boards, never a real app. */}
          <Btn
            kind="primary"
            onClick={() => {
              if (window.cth.proCheckoutBegin) void window.cth.proCheckoutBegin();
              else void window.cth.openExternal?.(soloConsoleUrl());
            }}
          >
            {t('paywall.buy')} <ProIcon name="external" size={11} />
          </Btn>
        </>}
      />}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
        {/* The plan line. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <Chip tone="accent">PRO</Chip>
          <Chip tone="muted">{t('paywall.price')}</Chip>
          <Chip tone="outline">{t('paywall.oneMachine')}</Chip>
        </div>

        {/* Side by side when the window allows (two 400px columns), stacked
            when it does not: the whole wall fits a laptop window without a
            scroll, which is the reason the frame is wide at all. */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 28, alignItems: 'start' }}>
          {/* What you get: one tile per PRO screen. */}
          <Section title={t('paywall.features.title')}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 8 }}>
              {FEATURES.map((f) => (
                <Card key={f.id} style={{ padding: '10px 12px', gap: 4, borderRadius: 10 }}>
                  <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 12.5, fontWeight: 600 }}>
                    <ProIcon name={f.icon} size={14} style={{ color: 'var(--cth-ink-500)' }} />
                    {t(`paywall.features.${f.id}.name`)}
                  </span>
                  <span style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--cth-ink-700)' }}>
                    {t(`paywall.features.${f.id}.desc`)}
                  </span>
                </Card>
              ))}
            </div>
          </Section>

          {/* The next three months, as a rail. */}
          <Section title={t('paywall.roadmap.title')} sub={t('paywall.roadmap.lead')}>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {ROADMAP.map((r, i) => (
                <RoadmapStop
                  key={r.id} tone={r.tone} last={i === ROADMAP.length - 1}
                  when={t(`paywall.roadmap.${r.id}.when`)}
                  status={t(`paywall.roadmap.${r.id}.status`)}
                  title={t(`paywall.roadmap.${r.id}.title`)}
                  desc={t(`paywall.roadmap.${r.id}.desc`)}
                />
              ))}
            </div>
          </Section>
        </div>
      </div>
    </OnboardFrame>
  );
}

/** A titled block of the wall, with an optional muted sentence under the title. */
function Section({ title, sub, children }: { title: string; sub?: string; children: ReactNode }) {
  return (
    <section style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontSize: 13, fontWeight: 600, lineHeight: '18px' }}>{title}</span>
        {sub && <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--cth-ink-500)' }}>{sub}</span>}
      </div>
      {children}
    </section>
  );
}

/** One stop on the rail: a dot and a line down to the next stop, then when,
 *  what, its status chip, and one sentence. */
function RoadmapStop({ when, status, title, desc, tone, last }: {
  when: string; status: string; title: string; desc: string;
  tone: 'accent' | 'outline' | 'muted'; last: boolean;
}) {
  const now = tone === 'accent';
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '12px 1fr', gap: 12 }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <i aria-hidden style={{
          width: 10, height: 10, borderRadius: 5, marginTop: 4, flexShrink: 0,
          background: now ? 'var(--cth-accent)' : 'var(--cth-cream-200)',
          border: `1px solid ${now ? 'var(--cth-accent)' : 'var(--cth-ink-300)'}`
        }} />
        {!last && <i aria-hidden style={{ width: 1, flex: 1, marginTop: 4, background: 'var(--cth-ink-300)' }} />}
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, paddingBottom: last ? 0 : 14 }}>
        <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)' }}>{when}</span>
        <span style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', fontSize: 12.5, fontWeight: 600 }}>
          {title}
          <Chip tone={tone}>{status}</Chip>
        </span>
        <span style={{ fontSize: 12, lineHeight: 1.45, color: 'var(--cth-ink-700)' }}>{desc}</span>
      </div>
    </div>
  );
}
