/**
 * Budget & breaker: the orchestrator's leash. Spend against the cap, the
 * circuit breaker's state and its thresholds, auto mode, and the per agent
 * token caps. Every number is the one the breaker itself reads:
 *
 *   spend        the fleet's usage samples (useFleetTelemetry, the OTel
 *                collector), summed the way src/main/breaker.ts sums them
 *                against `costCapUsd`
 *   velocity     the same samples, diffed per agent into tokens per minute
 *   the state    control:breakerState, one per agent per beat
 *   thresholds   config.circuitBreaker, with main's defaults when unset
 *
 * Every control writes through the config door (window.cth.updateConfig,
 * window.cth.setAgentTokenCap) on blur or on the switch, never per keystroke;
 * the config prop refreshes from main on `config:changed`, so a Draft shows
 * what was saved. Settings → Autonomy & budgets edits the same fields.
 */
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import type { CircuitBreakerConfig, HarnessConfig } from '@/store/config';
import { useFleetTelemetry } from '@/hooks/useTelemetry';
import { Chip, Draft, Field, Kv, Meter, Portrait, Switch, fmtK, fmtWhen, proToast, useNameFor, usd as fmtUsd, type ChipTone } from '../ui';
import { useTechnical } from '../depth';
import { BREAKER_DEFAULTS, countText, lastBreakerAction, parseCount, parseUsd, pctOf, sumOver, worstBreaker, type BreakerLevel } from './godData';
import { CardH, GodCard, GodGrid, Muted, Stat } from './pieces';

/** The meter's fallback denominator when neither a per agent cap nor the
 *  default token cap is set (the Classic meter's DEFAULT_TOKEN_CAP). */
const FALLBACK_TOKEN_CAP = 1_000_000;

const LEVEL_TONE: Record<BreakerLevel, ChipTone> = { healthy: 'ok', steering: 'warn', constrained: 'warn', stopped: 'bad' };

export function BudgetTab({ agent, config }: { agent: Agent; config: HarnessConfig | null }) {
  const { t, i18n } = useTranslation();
  const technical = useTechnical();
  const agents = useStore((s) => s.agents);
  const nameFor = useNameFor();
  const { samples, rate, breakers } = useFleetTelemetry();
  const ids = agents.map((a) => a.id);

  const usdByAgent: Record<string, number> = {};
  for (const [id, s] of Object.entries(samples)) usdByAgent[id] = s.usd;
  const spend = sumOver(usdByAgent, ids);
  const cap = config?.costCapUsd;
  const pct = pctOf(spend, cap);
  const velocity = Math.round(sumOver(rate, ids));

  const cb = config?.circuitBreaker ?? {};
  const enabled = cb.enabled ?? BREAKER_DEFAULTS.enabled;
  const hardStop = cb.hardStop ?? BREAKER_DEFAULTS.hardStop;
  const repeated = cb.repeatedToolLimit ?? BREAKER_DEFAULTS.repeatedToolLimit;
  const errors = cb.errorStormLimit ?? BREAKER_DEFAULTS.errorStormLimit;
  const velocityLimit = cb.tokenVelocityPerMin ?? BREAKER_DEFAULTS.tokenVelocityPerMin;
  const worst = worstBreaker(breakers, ids);
  const level: BreakerLevel = enabled ? (worst?.level ?? 'healthy') : 'healthy';
  const last = lastBreakerAction(breakers);
  const autoMode = config?.autoMode !== false;

  const save = (patch: Partial<HarnessConfig>) =>
    window.cth.updateConfig(patch)
      .then(() => proToast(t('pro.god.saved'), { tone: 'ok' }))
      .catch(() => proToast(t('pro.god.saveFailed'), { tone: 'bad' }));
  const saveBreaker = (patch: Partial<CircuitBreakerConfig>) => save({ circuitBreaker: { ...(config?.circuitBreaker ?? {}), ...patch } });
  const saveAgentCap = (id: string, text: string) =>
    window.cth.setAgentTokenCap(id, parseCount(text))
      .then(() => proToast(t('pro.god.saved'), { tone: 'ok' }))
      .catch(() => proToast(t('pro.god.saveFailed'), { tone: 'bad' }));

  const headline = !enabled
    ? t('pro.god.breaker.off')
    : level === 'healthy'
      ? t('pro.god.breaker.lineHealthy')
      : t('pro.god.breaker.lineTripped', { level: t(`pro.god.breaker.level.${level}`), name: nameFor(worst?.agentId) ?? worst?.agentId ?? '' });

  return (
    <GodGrid>
      <GodCard>
        <CardH>{t('pro.god.budget.title')}</CardH>
        <Stat
          label={t('pro.god.budget.spent')}
          value={fmtUsd(spend)}
          small={cap ? t('pro.god.budget.of', { cap: fmtUsd(cap) }) : t('pro.god.budget.noCap')}
        />
        {pct !== null && <Meter pct={pct} />}
        <Muted>{t('pro.god.budget.spentHint')}</Muted>
        <Field label={t('pro.god.budget.capUsd')} hint={t('pro.god.budget.capUsdHint')}>
          <Draft mono ariaLabel={t('pro.god.budget.capUsd')} value={cap ? String(cap) : ''} placeholder={t('pro.god.budget.none')} onCommit={(v) => void save({ costCapUsd: parseUsd(v) })} style={{ maxWidth: 160 }} />
        </Field>
        <Field label={t('pro.god.budget.defaultTokens')} hint={t('pro.god.budget.defaultTokensHint')}>
          <Draft mono ariaLabel={t('pro.god.budget.defaultTokens')} value={countText(config?.costCapTokens)} placeholder={t('pro.god.budget.none')} onCommit={(v) => void save({ costCapTokens: parseCount(v) })} style={{ maxWidth: 160 }} />
        </Field>
        <Field label={t('pro.god.budget.maxTemps')} hint={t('pro.god.budget.maxTempsHint')}>
          <Draft mono ariaLabel={t('pro.god.budget.maxTemps')} value={countText(config?.maxConcurrentWorkers)} placeholder="4" onCommit={(v) => void save({ maxConcurrentWorkers: parseCount(v) })} style={{ maxWidth: 160 }} />
        </Field>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--cth-ink-900)', fontWeight: 500 }}>{t('pro.god.budget.autoMode')}</div>
            <Muted>{autoMode ? t('pro.god.budget.autoOn') : t('pro.god.budget.autoOff')} {t('pro.god.budget.autoHint')}</Muted>
          </div>
          <Switch on={autoMode} label={t('pro.god.budget.autoMode')} onChange={(next) => void save({ autoMode: next })} />
        </div>
      </GodCard>

      <GodCard>
        <CardH right={<Chip tone={enabled ? LEVEL_TONE[level] : 'muted'} title={technical && worst?.reason ? worst.reason : undefined}>{enabled ? t(`pro.god.breaker.level.${level}`) : t('pro.god.breaker.disabled')}</Chip>}>
          {t('pro.god.breaker.title')}
        </CardH>
        <div style={{ fontSize: 13, color: 'var(--cth-ink-900)' }}>{headline}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--cth-ink-900)', fontWeight: 500 }}>{t('pro.god.breaker.enabled')}</div>
            <Muted>{t('pro.god.breaker.enabledHint')}</Muted>
          </div>
          <Switch on={enabled} label={t('pro.god.breaker.enabled')} onChange={(next) => void saveBreaker({ enabled: next })} />
        </div>
        <Kv rows={[
          { k: t('pro.god.breaker.velocity'), v: t('pro.god.breaker.velocityNow', { now: fmtK(velocity), limit: fmtK(velocityLimit) }), mono: true },
          { k: t('pro.god.breaker.lastAction'), v: last ? `${t(`pro.god.breaker.level.${last.level}`)} → ${nameFor(last.agentId) ?? last.agentId}, ${fmtWhen(last.ts, i18n.language)}` : t('pro.god.breaker.none') }
        ]} />
        {technical && last?.reason && <Muted style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11 }}>{last.reason}</Muted>}
        <Field label={t('pro.god.breaker.velocityLimit')} hint={t('pro.god.breaker.velocityLimitHint')}>
          <Draft mono ariaLabel={t('pro.god.breaker.velocityLimit')} value={countText(cb.tokenVelocityPerMin)} placeholder={String(BREAKER_DEFAULTS.tokenVelocityPerMin)} onCommit={(v) => void saveBreaker({ tokenVelocityPerMin: parseCount(v) })} style={{ maxWidth: 160 }} />
        </Field>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12 }}>
          <Field label={t('pro.god.breaker.repeated')} hint={t('pro.god.breaker.repeatedHint')}>
            <Draft mono ariaLabel={t('pro.god.breaker.repeated')} value={countText(cb.repeatedToolLimit)} placeholder={String(repeated)} onCommit={(v) => void saveBreaker({ repeatedToolLimit: parseCount(v) })} />
          </Field>
          <Field label={t('pro.god.breaker.errors')} hint={t('pro.god.breaker.errorsHint')}>
            <Draft mono ariaLabel={t('pro.god.breaker.errors')} value={countText(cb.errorStormLimit)} placeholder={String(errors)} onCommit={(v) => void saveBreaker({ errorStormLimit: parseCount(v) })} />
          </Field>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, color: 'var(--cth-ink-900)', fontWeight: 500 }}>{t('pro.god.breaker.hardStop')}</div>
            <Muted>{t('pro.god.breaker.hardStopHint')}</Muted>
          </div>
          <Switch on={hardStop} label={t('pro.god.breaker.hardStop')} onChange={(next) => void saveBreaker({ hardStop: next })} />
        </div>
        <Muted>{t('pro.god.breaker.ladder')}</Muted>
      </GodCard>

      <GodCard style={{ gridColumn: '1 / -1' }}>
        <CardH>{t('pro.god.budget.perAgent')}</CardH>
        <Muted>{t('pro.god.budget.perAgentHint')}</Muted>
        {agents.length === 0 && <Muted>{t('pro.god.budget.noAgents')}</Muted>}
        {agents.map((a) => {
          const s = samples[a.id];
          const tokens = s ? s.input + s.output + s.cacheRead + s.cacheCreation : 0;
          const own = config?.agentTokenCaps?.[a.id];
          const denom = own && own > 0 ? own : (config?.costCapTokens && config.costCapTokens > 0 ? config.costCapTokens : FALLBACK_TOKEN_CAP);
          const pctTokens = pctOf(tokens, denom) ?? 0;
          return (
            <div key={a.id} style={{ display: 'grid', gridTemplateColumns: '24px minmax(80px, 160px) minmax(0, 1fr) 150px', gap: 10, alignItems: 'center', padding: '4px 0' }}>
              <Portrait agent={a} size={24} />
              <span style={{ fontSize: 12.5, fontWeight: 500, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {a.name}{a.id === agent.id ? ` · ${t('pro.god.orchestrator')}` : ''}
              </span>
              <span style={{ minWidth: 0 }}>
                {tokens > 0 ? (
                  <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }} title={technical && s ? `${s.model} · ${fmtUsd(s.usd)}` : undefined}>
                      {t('pro.god.budget.usage', { used: fmtK(tokens), cap: fmtK(denom) })}
                    </span>
                    <span style={{ flex: 1, minWidth: 40 }}><Meter pct={pctTokens} /></span>
                  </span>
                ) : (
                  <Muted>{t('pro.god.budget.noUsage')}</Muted>
                )}
              </span>
              <Draft mono ariaLabel={t('pro.god.budget.capFor', { name: a.name })} value={countText(own)} placeholder={t('pro.god.budget.default')} onCommit={(v) => void saveAgentCap(a.id, v)} />
            </div>
          );
        })}
      </GodCard>
    </GodGrid>
  );
}
