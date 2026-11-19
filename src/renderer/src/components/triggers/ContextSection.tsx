import { useEffect, useRef, useState, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { CONTEXT_MESSAGE_MAX, type ContextRule, type ContextTriggerConfig } from '@shared/triggers';
import { ruleBarTokens } from '@shared/contextBar';
import { SWITCH_CLEAR_MAX_MS, SWITCH_CLEAR_MIN_MS, type SwitchClearRule } from '@shared/switchClear';
import { getContextTrigger, setContextTrigger } from './api';
import {
  Callout, Field, Hint, IntervalPicker, Muted, PctField, SubCard, SubHeader, Toggle,
  fmtInterval, textareaStyle
} from './ui';
import { useRtl } from '@/i18n/useDirection';

/**
 * CONTEXT — the trigger that fires on an agent's own terminal filling up rather
 * than on the clock alone. Two rules, and they are not the same operation:
 * compaction SUMMARISES the context, clearing THROWS IT AWAY.
 */

const WRITE_DEBOUNCE_MS = 400;

export function ContextSection({ onSummary }: { onSummary?: (s: string) => void }) {
  const { t } = useTranslation();
  const [cfg, setCfg] = useState<ContextTriggerConfig | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const alive = useRef(true);

  const read = () => {
    setCfg(null);
    getContextTrigger().then((c) => { if (alive.current) setCfg(c); }).catch(() => { /* defaults */ });
  };
  useEffect(() => {
    alive.current = true;
    read();
    return () => {
      alive.current = false;
      if (timer.current) clearTimeout(timer.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!cfg) return;
    const on = [
      cfg.compact.enabled ? t('contextSection.compact') : null,
      cfg.clear.enabled ? t('contextSection.clear') : null,
      cfg.switchClear.enabled ? t('contextSection.switchClear') : null
    ].filter(Boolean);
    const rules = on.join(' + ');
    onSummary?.(!on.length ? t('contextSection.bothOff') : rules);
  }, [cfg, onSummary, t]);

  // Optimistic + debounced: the controls answer instantly, and a burst of typing
  // in the message box collapses into one write instead of one per keystroke.
  const commit = (next: ContextTriggerConfig) => {
    setCfg(next);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => { void setContextTrigger(next); }, WRITE_DEBOUNCE_MS);
  };
  const patch = (key: 'compact' | 'clear', fields: Partial<ContextRule>) => {
    if (!cfg) return;
    commit({ ...cfg, [key]: { ...cfg[key], ...fields } });
  };

  if (!cfg) return <Muted>{t('contextSection.loading')}</Muted>;

  return (
    <>
      <Muted>
        {t('contextSection.intro')}
      </Muted>
      <div style={{ height: 8 }} />

      <RuleCard
        title={t('contextSection.compact')}
        blurb={t('contextSection.compactBlurb')}
        rule={cfg.compact}
        turnEnd
        messageLabel={t('contextSection.extraFocus')}
        messageHint={t('contextSection.extraFocusHint')}
        messagePlaceholder={t('contextSection.extraFocusPlaceholder')}
        onPatch={(fields) => patch('compact', fields)}
      />

      <RuleCard
        title={t('contextSection.clear')}
        blurb={t('contextSection.clearBlurb')}
        rule={cfg.clear}
        messageLabel={t('contextSection.command')}
        messageHint={t('contextSection.commandHint')}
        messagePlaceholder="/clear"
        caution={t('contextSection.clearCaution')}
        onPatch={(fields) => patch('clear', fields)}
      />

      <SwitchClearCard
        rule={cfg.switchClear}
        onPatch={(fields) => commit({ ...cfg, switchClear: { ...cfg.switchClear, ...fields } })}
      />
    </>
  );
}

/** The clear on a switch of work (shared/switchClear.ts): its own small
 *  rule, a switch and a session age. It ships on. */
function SwitchClearCard({ rule, onPatch }: { rule: SwitchClearRule; onPatch: (fields: Partial<SwitchClearRule>) => void }) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  return (
    <SubCard>
      <SubHeader
        open={open}
        onToggle={() => setOpen((o) => !o)}
        title={t('contextSection.switchClear')}
        sub={t('contextSection.switchClearBlurb')}
        right={<Toggle on={rule.enabled} onClick={() => onPatch({ enabled: !rule.enabled })} />}
      />
      {!open && (
        <Hint>
          {rule.enabled ? t('contextSection.switchClearHint', { interval: fmtInterval(rule.minSessionMs) }) : t('contextSection.off')}
        </Hint>
      )}
      {open && (
        <div style={{ marginTop: 4 }}>
          <Field label={t('contextSection.switchClearAfter')}>
            <IntervalPicker
              value={rule.minSessionMs}
              onChange={(minSessionMs) => onPatch({ minSessionMs })}
              minMs={SWITCH_CLEAR_MIN_MS}
              maxMs={SWITCH_CLEAR_MAX_MS}
            />
            <Hint>{t('contextSection.switchClearHeld')}</Hint>
          </Field>
        </div>
      )}
    </SubCard>
  );
}

function RuleCard({ title, blurb, rule, turnEnd, messageLabel, messageHint, messagePlaceholder, caution, onPatch }: {
  title: string;
  blurb: string;
  rule: ContextRule;
  /** The compact rule: it runs when a turn ends at the bar, in tokens,
   *  and its interval is the fallback for an engine with no token count. */
  turnEnd?: boolean;
  messageLabel: string;
  messageHint: string;
  messagePlaceholder: string;
  caution?: ReactNode;
  onPatch: (fields: Partial<ContextRule>) => void;
}) {
  const { t } = useTranslation();
  const rtl = useRtl();
  const [open, setOpen] = useState(false);
  // What each percent means in tokens, printed beside it.
  const bars = ruleBarTokens(rule);
  const tokens = bars.small.toLocaleString();
  const largeTokens = bars.large.toLocaleString();
  // A compact bar of 0% has no token bar: the timer alone runs it.
  const atTurnEnd = !!turnEnd && rule.minContextPct > 0;
  return (
    <SubCard>
      <SubHeader
        open={open}
        onToggle={() => setOpen((o) => !o)}
        title={title}
        sub={blurb}
        right={<Toggle on={rule.enabled} onClick={() => onPatch({ enabled: !rule.enabled })} />}
      />
      {/* The caution is always on screen — it is why this ships off — but it only
          goes coral once the destructive rule is actually armed. A red box over a
          switched-off setting is crying wolf. */}
      {caution && <Callout tone={rule.enabled ? 'warn' : 'note'}>{caution}</Callout>}
      {!open && (
        <Hint>
          {!rule.enabled
            ? t('contextSection.off')
            : atTurnEnd
              ? t('contextSection.hintCompact', { pct: rule.minContextPct, tokens, large: rule.minContextPctLargeWindow, largeTokens })
              : t('contextSection.hintEvery', { interval: fmtInterval(rule.everyMs), pct: rule.minContextPct })}
        </Hint>
      )}
      {open && (
        <div style={{ marginTop: 4 }}>
          <Field label={turnEnd ? t('contextSection.fallbackEvery') : t('contextSection.noSoonerThan')}>
            {/* Main clamps a context cadence to 1 minute … 24 hours, so the
                picker offers exactly that range and never labels a value it
                cannot actually store. */}
            <IntervalPicker
              value={rule.everyMs}
              onChange={(everyMs) => onPatch({ everyMs })}
              minMs={60_000}
              maxMs={86_400_000}
            />
            {turnEnd && <Hint>{t('contextSection.fallbackEveryHint')}</Hint>}
          </Field>
          <Field label={t('contextSection.contextBar')}>
            <PctField value={rule.minContextPct} onChange={(minContextPct) => onPatch({ minContextPct })} />
            <Hint>
              {t('contextSection.tokensSmall', { tokens })}{' '}
              {turnEnd ? `${t('contextSection.compactBarHint')} ${t('contextSection.zeroBarHint')}` : t('contextSection.contextBarHint')}
            </Hint>
          </Field>
          <Field label={t('contextSection.bigWindows')}>
            <PctField
              value={rule.minContextPctLargeWindow}
              onChange={(minContextPctLargeWindow) => onPatch({ minContextPctLargeWindow })}
            />
            <Hint>{t('contextSection.tokensLarge', { tokens: largeTokens })} {t('contextSection.bigWindowsHint')}</Hint>
          </Field>
          <Field label={messageLabel}>
            <textarea
              dir={rtl ? 'auto' : undefined}
              value={rule.message}
              onChange={(e) => onPatch({ message: e.target.value })}
              rows={3}
              maxLength={CONTEXT_MESSAGE_MAX}
              placeholder={messagePlaceholder}
              style={textareaStyle}
            />
            <Hint>{messageHint}</Hint>
          </Field>
        </div>
      )}
    </SubCard>
  );
}
