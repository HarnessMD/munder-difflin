/**
 * PRO Automations: one list of everything that fires on its own, and a
 * drawer that edits the selected one in place. Replaces the Classic
 * TriggersTab's five stacked cards in PRO (phase 3, plan 3.x / 4.3).
 *
 * THREE RECORDS, ONE LIST. Scheduled missions (`missions:*`), the two context
 * rules (`triggers:*Context`) and webhook endpoints (`webhooks:*`) keep their
 * own doors and their own storage (the organisation trigger went in batch 3:
 * organisation keys do not exist); autoData.ts projects them into rows and this screen writes each
 * back through the door it came from. Nothing is stored twice.
 *
 * THE DRAWER IS THE EDITOR. There is no separate edit mode: text commits on
 * blur, switches and selects commit at once, exactly like the Classic
 * sections. Webhooks also show their recent ledger rows
 * with approve / reject, because "what did this endpoint last do" is the
 * question the row's `last` column raises.
 *
 * The Classic section's store mirror (`webhookTriggers`) is
 * shared: Settings → Connections and this screen edit the same list.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore } from '@/store/store';
import { DEFAULT_WEBHOOK_GUARDRAILS, TRIGGER_MODES, WEBHOOK_AUTHS, type ContextRule, type ContextTriggerConfig, type TriggerHistoryEntry, type TriggerMode, type WebhookTrigger } from '@shared/triggers';
import { WEEKDAY_INITIALS, formatWeekly } from '@shared/weeklySchedule';
import { usePaneNav } from '../professional/paneNav';
import { deleteWebhook, generateWebhookSecret, getContextTrigger, listWebhooks, newWebhook, saveWebhooks, setContextTrigger, webhooksStatus, type WebhooksStatus } from '../triggers/api';
import { INTERVAL_OPTS, fmtInterval } from '../triggers/ui';
import { JsonEditor } from '../triggers/JsonEditor';
import { AgentPicker } from '../settings/primitives';
import { authHeaderExample } from '@shared/inboundWebhook';
import { Bar, Btn, Chip, CodeBox, Draft, Field, FilterChip, Kv, Portrait, SectionH, Seg, SelectBox, SetupEmpty, Switch, fmtWhen, inputStyle, useAgentById, useNameFor } from './ui';
import { ProIcon, type ProIconName } from './icons';
import { AUTO_KINDS, filterRows, historyFor, newMission, projectRows, type AutoFilter, type AutoKind, type AutoRow, type ContextRuleId, type Mission } from './autoData';

const KIND_ICON: Record<AutoKind, ProIconName> = { schedule: 'clock', context: 'gauge', webhook: 'hook' };
const DAY = 86_400_000;
const WEEK = 604_800_000;

/* ───────────────────────────── data hooks ─────────────────────────────── */

function useMissions(): { missions: Mission[]; save: (next: Mission[]) => void } {
  const [missions, setMissions] = useState<Mission[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => { window.cth.listMissions().then((m) => { if (alive) setMissions(m as Mission[]); }).catch(() => undefined); };
    load();
    const off = window.cth.onMissionsUpdated(load);
    return () => { alive = false; off(); };
  }, []);
  const save = useCallback((next: Mission[]) => {
    setMissions(next);
    window.cth.saveMissions(next as unknown as Parameters<typeof window.cth.saveMissions>[0]).catch(() => undefined);
  }, []);
  return { missions, save };
}

function useContextRules(): { ctx: ContextTriggerConfig | null; save: (next: ContextTriggerConfig) => void } {
  const [ctx, setCtx] = useState<ContextTriggerConfig | null>(null);
  useEffect(() => { let alive = true; getContextTrigger().then((c) => { if (alive) setCtx(c); }); return () => { alive = false; }; }, []);
  const save = useCallback((next: ContextTriggerConfig) => { setCtx(next); setContextTrigger(next); }, []);
  return { ctx, save };
}

function useWebhooks(): { hooks: WebhookTrigger[]; status: WebhooksStatus; apply: (next: WebhookTrigger[]) => void; remove: (id: string) => void } {
  const hooks = useStore((s) => s.webhookTriggers);
  const setHooks = useStore((s) => s.setWebhookTriggers);
  const [status, setStatus] = useState<WebhooksStatus>({ running: false, endpoints: [] });
  useEffect(() => {
    let alive = true;
    if (hooks.length === 0) listWebhooks().then((list) => { if (alive && list) setHooks(list); });
    // An agent's connection request changed the list (0.5.3 batch 3 #6).
    const offChanged = window.cth.onWebhooksChanged?.(() => { listWebhooks().then((list) => { if (alive && list) setHooks(list); }); });
    const poll = () => webhooksStatus().then((s) => { if (alive) setStatus(s); });
    poll();
    const id = setInterval(poll, 5000);
    return () => { alive = false; clearInterval(id); offChanged?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  const apply = useCallback((next: WebhookTrigger[]) => {
    setHooks(next);
    saveWebhooks(next).then((canonical) => { if (canonical) setHooks(canonical); });
  }, [setHooks]);
  const remove = useCallback((id: string) => {
    setHooks(hooks.filter((h) => h.id !== id));
    deleteWebhook(id).then((canonical) => { if (canonical) setHooks(canonical); });
  }, [hooks, setHooks]);
  return { hooks, status, apply, remove };
}

function useTriggerHistory(): TriggerHistoryEntry[] {
  const [rows, setRows] = useState<TriggerHistoryEntry[]>([]);
  useEffect(() => {
    let alive = true;
    const load = () => window.cth.listTriggerHistory().then((r) => { if (alive) setRows(r); }).catch(() => undefined);
    load();
    const off = window.cth.onTriggerHistoryUpdated(load);
    return () => { alive = false; off(); };
  }, []);
  return rows;
}

/* ───────────────────────────── the screen ─────────────────────────────── */

export function AutomationsScreen() {
  const { t, i18n } = useTranslation();
  const nav = usePaneNav();
  const agents = useStore((s) => s.agents);
  const nameFor = useNameFor();
  const { missions, save: saveMissions } = useMissions();
  const { ctx, save: saveCtx } = useContextRules();
  const { hooks, status, apply: applyHooks, remove: removeHook } = useWebhooks();
  const history = useTriggerHistory();

  const [filter, setFilter] = useState<AutoFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);

  const rows = useMemo(() => projectRows({ missions, context: ctx, webhooks: hooks, history }), [missions, ctx, hooks, history]);
  const shown = useMemo(() => filterRows(rows, filter), [rows, filter]);
  const selected = rows.find((r) => r.id === selectedId) ?? shown[0] ?? null;
  const onCount = rows.filter((r) => r.enabled).length;

  const modeLabel = (m: TriggerMode) => t(`pro.autos.modes.${m}`);
  const endpointUrl = (id: string) => status.endpoints.find((e) => e.id === id)?.url;

  const detailFor = (row: AutoRow): string => {
    switch (row.kind) {
      case 'schedule': {
        const m = row.mission;
        const when = m.weekly ? formatWeekly(m.weekly) : t('pro.autos.every', { interval: fmtInterval(m.intervalMs) });
        const target = m.to === 'broadcast' ? t('pro.autos.everyone') : (nameFor(m.to) ?? m.to);
        return `${when} · ${target}`;
      }
      case 'context':
        return t('pro.autos.contextDetail', { interval: fmtInterval(row.rule.everyMs), pct: row.rule.minContextPct, large: row.rule.minContextPctLargeWindow });
      case 'webhook':
        return `${endpointUrl(row.id) ? `POST ${endpointUrl(row.id)}` : t('pro.autos.serverOff')} · ${modeLabel(row.hook.mode)}`;
    }
  };

  const labelFor = (row: AutoRow): string => {
    switch (row.kind) {
      case 'schedule': return row.mission.label || t('pro.autos.untitled');
      case 'context': return t(`pro.autos.rule.${row.ruleId}`);
      case 'webhook': return row.hook.name || t('pro.autos.untitled');
    }
  };

  const setEnabled = (row: AutoRow, on: boolean) => {
    switch (row.kind) {
      case 'schedule': return saveMissions(missions.map((m) => (m.id === row.id ? { ...m, enabled: on } : m)));
      case 'context': return ctx && saveCtx({ ...ctx, [row.ruleId]: { ...ctx[row.ruleId], enabled: on } });
      case 'webhook': return applyHooks(hooks.map((h) => (h.id === row.id ? { ...h, enabled: on } : h)));
    }
  };

  const godId = agents.find((a) => a.isGod)?.id ?? 'god';
  const addSchedule = () => {
    const m = newMission(Date.now(), godId);
    saveMissions([...missions, m]);
    setFilter('all'); setSelectedId(m.id); setMenuOpen(false);
  };
  const addWebhook = async () => {
    const secret = await generateWebhookSecret();
    const h = newWebhook(secret, hooks.length);
    applyHooks([...hooks, h]);
    setFilter('all'); setSelectedId(h.id); setMenuOpen(false);
  };

  const filterOptions = [{ value: 'all' as AutoFilter, label: t('pro.autos.filter.all') }, ...AUTO_KINDS.map((k) => ({ value: k as AutoFilter, label: t(`pro.autos.filter.${k}`) }))];

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column' }}>
      <Bar title={t('pro.autos.title')} sub={t('pro.autos.sub', { count: onCount })}>
        <Seg value={filter} options={filterOptions} onChange={setFilter} ariaLabel={t('pro.autos.filterLabel')} />
        <Btn onClick={() => nav.go('inbox')} title={t('pro.autos.historyHint')}>{t('pro.autos.history')}</Btn>
        <div style={{ position: 'relative' }}>
          <Btn kind="primary" onClick={() => setMenuOpen((v) => !v)}>{t('pro.autos.new')}</Btn>
          {menuOpen && (
            <div role="menu" style={{ position: 'absolute', right: 0, top: 36, zIndex: 20, minWidth: 200, padding: 4, borderRadius: 10, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)', boxShadow: '0 8px 24px rgba(0,0,0,0.12)' }}>
              <MenuItem icon="clock" label={t('pro.autos.newSchedule')} onClick={addSchedule} />
              <MenuItem icon="hook" label={t('pro.autos.newWebhook')} onClick={() => { void addWebhook(); }} />
            </div>
          )}
        </div>
      </Bar>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) 360px' }} onClick={() => menuOpen && setMenuOpen(false)}>
        <div style={{ overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {/* An empty list is either "you have not made one yet", which has
              steps, or "your filter matches nothing", which does not. Telling a
              person how to create a webhook when they have three and are
              looking at the schedules filter would be noise. */}
          {shown.length === 0 && (filter === 'webhook' || (filter === 'all' && rows.length === 0)) ? (
            <SetupEmpty
              icon="hook" title={t('pro.autos.hookSetup.title')} lead={t('pro.autos.hookSetup.lead')}
              steps={[t('pro.autos.hookSetup.s1'), t('pro.autos.hookSetup.s2'), t('pro.autos.hookSetup.s3')]}
              action={{ label: t('pro.autos.newWebhook'), run: () => { void addWebhook(); } }}
            />
          ) : shown.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--cth-ink-500)', fontSize: 13 }}>{t('pro.autos.none')}</div>
          ) : null}
          {shown.map((row) => {
            const on = selected?.id === row.id;
            return (
              <div key={row.id} role="button" tabIndex={0} onClick={() => setSelectedId(row.id)} aria-pressed={on}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelectedId(row.id); } }} style={{
                // a div, not a <button>: the row carries a Switch, and a button may not contain a button
                display: 'grid', gridTemplateColumns: '34px minmax(0, 1fr) auto', gap: 12, alignItems: 'center', padding: '12px 14px', boxSizing: 'border-box',
                borderRadius: 10, cursor: 'pointer',
                border: '1px solid ' + (on ? 'var(--cth-accent-line)' : 'var(--cth-ink-300)'), background: 'var(--cth-cream-100)',
                boxShadow: on ? '0 0 0 2px var(--cth-accent-soft)' : 'none'
              }}>
                <span style={{ width: 34, height: 34, borderRadius: 8, display: 'grid', placeItems: 'center', background: 'var(--cth-cream-200)', color: 'var(--cth-ink-700)' }}>
                  <ProIcon name={KIND_ICON[row.kind]} size={16} />
                </span>
                <span style={{ minWidth: 0 }}>
                  <span style={{ display: 'block', fontWeight: 600, fontSize: 13, color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{labelFor(row)}</span>
                  <span style={{ display: 'block', fontSize: 12, color: 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t(`pro.autos.kind.${row.kind}`)} · {detailFor(row)}</span>
                </span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>
                  {row.kind === 'webhook' && row.pending > 0 && <Chip tone="warn">{t('pro.autos.pending', { count: row.pending })}</Chip>}
                  <span>{row.kind === 'context' ? '' : row.last ? t('pro.autos.last', { when: fmtWhen(row.last, i18n.language) }) : t('pro.autos.never')}</span>
                  <Switch on={row.enabled} onChange={(v) => setEnabled(row, v)} label={row.enabled ? t('common.on') : t('common.off')} />
                </span>
              </div>
            );
          })}
        </div>
        <aside style={{ borderLeft: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-50)', overflowY: 'auto', padding: 18, display: 'flex', flexDirection: 'column', gap: 12, minWidth: 0 }}>
          {!selected ? (
            <div style={{ color: 'var(--cth-ink-500)', fontSize: 13 }}>{t('pro.autos.pickOne')}</div>
          ) : (
            <Drawer
              row={selected} label={labelFor(selected)} detail={detailFor(selected)} history={history} endpointUrl={endpointUrl}
              onEnabled={(v) => setEnabled(selected, v)}
              patchMission={(fields) => saveMissions(missions.map((m) => (m.id === selected.id ? { ...m, ...fields } : m)))}
              deleteMission={() => { saveMissions(missions.filter((m) => m.id !== selected.id)); setSelectedId(null); }}
              patchRule={(ruleId, fields) => ctx && saveCtx({ ...ctx, [ruleId]: { ...ctx[ruleId], ...fields } })}
              patchHook={(fields) => applyHooks(hooks.map((h) => (h.id === selected.id ? { ...h, ...fields } : h)))}
              deleteHook={() => { removeHook(selected.id); setSelectedId(null); }}
            />
          )}
        </aside>
      </div>
    </div>
  );
}

function MenuItem({ icon, label, onClick }: { icon: ProIconName; label: string; onClick: () => void }) {
  return (
    <button type="button" role="menuitem" onClick={onClick} style={{ width: '100%', display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: 7, border: 'none', background: 'transparent', font: 'inherit', fontSize: 12.5, color: 'var(--cth-ink-900)', cursor: 'pointer', textAlign: 'start' }}>
      <ProIcon name={icon} size={14} /> {label}
    </button>
  );
}

/* ───────────────────────────── the drawer ─────────────────────────────── */

interface DrawerProps {
  row: AutoRow; label: string; detail: string; history: TriggerHistoryEntry[]; endpointUrl: (id: string) => string | undefined;
  onEnabled: (on: boolean) => void;
  patchMission: (fields: Partial<Mission>) => void; deleteMission: () => void;
  patchRule: (ruleId: ContextRuleId, fields: Partial<ContextRule>) => void;
  patchHook: (fields: Partial<WebhookTrigger>) => void; deleteHook: () => void;
}

function Drawer(p: DrawerProps) {
  const { t, i18n } = useTranslation();
  const { row } = p;
  const [armed, setArmed] = useState(false);
  useEffect(() => { setArmed(false); }, [row.id]);
  const last = row.kind === 'context' ? t('pro.autos.lastUnknown') : row.last ? fmtWhen(row.last, i18n.language) : t('pro.autos.never');
  const canDelete = row.kind === 'schedule' || row.kind === 'webhook';
  const onDelete = () => {
    if (!armed) { setArmed(true); return; }
    if (row.kind === 'schedule') p.deleteMission(); else if (row.kind === 'webhook') p.deleteHook();
  };
  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
        <Chip tone="muted">{t(`pro.autos.kind.${row.kind}`)}</Chip>
        <Chip tone={row.enabled ? 'ok' : 'outline'}>{row.enabled ? t('common.on') : t('common.off')}</Chip>
        <span style={{ flex: 1 }} />
        <Switch on={row.enabled} onChange={p.onEnabled} label={row.enabled ? t('common.on') : t('common.off')} />
      </div>
      <div>
        <h2 style={{ margin: 0, fontSize: 15, fontWeight: 600, color: 'var(--cth-ink-900)', overflowWrap: 'anywhere' }}>{p.label}</h2>
        <p style={{ margin: '4px 0 0', fontSize: 12.5, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{p.detail}</p>
      </div>
      <Kv rows={[{ k: t('pro.autos.lastFired'), v: last }]} />
      {row.kind === 'schedule' && <MissionEditor mission={row.mission} onPatch={p.patchMission} />}
      {row.kind === 'context' && <RuleEditor ruleId={row.ruleId} rule={row.rule} onPatch={(f) => p.patchRule(row.ruleId, f)} />}
      {row.kind === 'webhook' && <WebhookEditor hook={row.hook} url={p.endpointUrl(row.id)} onPatch={p.patchHook} />}
      {row.kind === 'webhook' && <RecentHistory rows={historyFor(p.history, row)} />}
      {canDelete && (
        <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
          <Btn kind="danger" onClick={onDelete}>{armed ? t('pro.autos.deleteArmed') : t('common.delete')}</Btn>
          {armed && <Btn kind="ghost" onClick={() => setArmed(false)}>{t('common.cancel')}</Btn>}
        </div>
      )}
    </>
  );
}

/* ───────────────────────────── per kind editors ───────────────────────── */

const QUIET_OPTS = [5, 15, 30, 45, 60].map((m) => ({ value: String(m * 60_000), label: `${m}m` }));

function MissionEditor({ mission: m, onPatch }: { mission: Mission; onPatch: (fields: Partial<Mission>) => void }) {
  const { t } = useTranslation();
  const agents = useStore((s) => s.agents);
  const kind = m.kind ?? 'dispatch';
  // `god` is the orchestrator's address on the wire whatever its roster id is;
  // the option carries its name so the select never shows a bare "god".
  const god = agents.find((a) => a.isGod);
  const targets = [
    { value: 'broadcast', label: t('pro.autos.everyone') },
    { value: 'god', label: god?.name ?? 'god' },
    ...agents.filter((a) => !a.isGod).map((a) => ({ value: a.id, label: a.name }))
  ];
  if (!targets.some((x) => x.value === m.to)) targets.push({ value: m.to, label: m.to });
  return (
    <>
      <Chip tone="outline" style={{ alignSelf: 'flex-start' }}>{t(`pro.autos.missionKind.${kind}`)}</Chip>
      <Field label={t('pro.autos.label')}>
        <Draft value={m.label} onCommit={(label) => onPatch({ label })} placeholder={t('pro.autos.labelPlaceholder')} ariaLabel={t('pro.autos.label')} />
      </Field>
      {kind === 'heartbeat' ? (
        <>
          <Field label={t('pro.autos.everyLabel')}>
            <IntervalSelect value={m.intervalMs} onChange={(intervalMs) => onPatch({ intervalMs })} />
          </Field>
          <Field label={t('pro.autos.quiet')} hint={t('pro.autos.quietHint')}>
            <SelectBox value={String(m.quietThresholdMs ?? 300_000)} options={QUIET_OPTS} onChange={(v) => onPatch({ quietThresholdMs: Number(v) })} ariaLabel={t('pro.autos.quiet')} />
          </Field>
        </>
      ) : (
        <ScheduleEditor intervalMs={m.intervalMs} weekly={m.weekly} onPatch={onPatch} />
      )}
      {kind !== 'heartbeat' && (
        <Field label={t('pro.autos.sendsTo')}>
          <SelectBox value={m.to} options={targets} onChange={(to) => onPatch({ to })} ariaLabel={t('pro.autos.sendsTo')} />
        </Field>
      )}
      {kind === 'dispatch' && (
        <>
          <Field label={t('pro.autos.message')}>
            <Draft multiline value={m.body} onCommit={(body) => onPatch({ body })} placeholder={t('pro.autos.messagePlaceholder')} ariaLabel={t('pro.autos.message')} />
          </Field>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12.5, color: 'var(--cth-ink-700)' }}>
            <Switch on={m.autoCompact === true} onChange={(autoCompact) => onPatch({ autoCompact })} label={t('pro.autos.autoCompact')} />
            <span>{t('pro.autos.autoCompact')}</span>
          </div>
        </>
      )}
    </>
  );
}

function IntervalSelect({ value, onChange, maxMs = Infinity }: { value: number; onChange: (ms: number) => void; maxMs?: number }) {
  const { t } = useTranslation();
  const opts = INTERVAL_OPTS.filter((o) => o.ms !== WEEK && o.ms <= maxMs).map((o) => ({ value: String(o.ms), label: o.label }));
  if (!opts.some((o) => o.value === String(value))) opts.push({ value: String(value), label: fmtInterval(value) });
  return <SelectBox value={String(value)} options={opts} onChange={(v) => onChange(Number(v))} ariaLabel={t('pro.autos.everyLabel')} />;
}

function ScheduleEditor({ intervalMs, weekly, onPatch }: { intervalMs: number; weekly?: Mission['weekly']; onPatch: (fields: Partial<Mission>) => void }) {
  const { t } = useTranslation();
  const mode: 'interval' | 'weekly' = weekly ? 'weekly' : 'interval';
  const w = weekly ?? { days: [1, 2, 3, 4, 5], minute: 540 };
  const hh = String(Math.floor(w.minute / 60)).padStart(2, '0');
  const mm = String(w.minute % 60).padStart(2, '0');
  return (
    <Field label={t('pro.autos.when')}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <Seg value={mode} ariaLabel={t('pro.autos.when')} options={[{ value: 'interval', label: t('pro.autos.interval') }, { value: 'weekly', label: t('pro.autos.weekly') }]}
          onChange={(v) => onPatch(v === 'weekly' ? { weekly: w } : { weekly: undefined })} />
        {mode === 'interval' ? (
          <IntervalSelect value={intervalMs} onChange={(ms) => onPatch({ intervalMs: ms })} />
        ) : (
          <>
            <div style={{ display: 'flex', gap: 4 }}>
              {WEEKDAY_INITIALS.map((d, i) => (
                <FilterChip key={i} on={w.days.includes(i)} onClick={() => {
                  const days = w.days.includes(i) ? w.days.filter((x) => x !== i) : [...w.days, i].sort((a, b) => a - b);
                  if (days.length) onPatch({ weekly: { ...w, days } });
                }}>{d}</FilterChip>
              ))}
            </div>
            <input type="time" aria-label={t('pro.autos.at')} value={`${hh}:${mm}`} style={{ ...inputStyle, width: 120 }}
              onChange={(e) => { const [h, mi] = e.target.value.split(':').map(Number); if (Number.isFinite(h) && Number.isFinite(mi)) onPatch({ weekly: { ...w, minute: h * 60 + mi } }); }} />
          </>
        )}
      </div>
    </Field>
  );
}

function PctInput({ value, onChange, label }: { value: number; onChange: (n: number) => void; label: string }) {
  const [draft, setDraft] = useState(String(value));
  useEffect(() => { setDraft(String(value)); }, [value]);
  return (
    <input type="number" min={1} max={100} aria-label={label} value={draft} onChange={(e) => setDraft(e.target.value)}
      onBlur={() => { const n = Math.round(Number(draft)); if (Number.isFinite(n) && n >= 1 && n <= 100 && n !== value) onChange(n); else setDraft(String(value)); }}
      style={{ ...inputStyle, width: 90 }} />
  );
}

function RuleEditor({ ruleId, rule, onPatch }: { ruleId: ContextRuleId; rule: ContextRule; onPatch: (fields: Partial<ContextRule>) => void }) {
  const { t } = useTranslation();
  return (
    <>
      <p style={{ margin: 0, fontSize: 12.5, color: 'var(--cth-ink-700)', lineHeight: 1.45 }}>{t(`contextSection.${ruleId}Blurb`)}</p>
      <Field label={t('pro.autos.checks')}>
        <IntervalSelect value={rule.everyMs} onChange={(everyMs) => onPatch({ everyMs })} maxMs={DAY} />
      </Field>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
        <Field label={t('pro.autos.fromPct')}>
          <PctInput value={rule.minContextPct} onChange={(minContextPct) => onPatch({ minContextPct })} label={t('pro.autos.fromPct')} />
        </Field>
        <Field label={t('pro.autos.largePct')} hint={t('pro.autos.largeHint')}>
          <PctInput value={rule.minContextPctLargeWindow} onChange={(minContextPctLargeWindow) => onPatch({ minContextPctLargeWindow })} label={t('pro.autos.largePct')} />
        </Field>
      </div>
      <Field label={t('pro.autos.message')} hint={t(`pro.autos.ruleMessageHint.${ruleId}`)}>
        <Draft multiline value={rule.message} onCommit={(message) => onPatch({ message })} ariaLabel={t('pro.autos.message')} />
      </Field>
    </>
  );
}

function ModeSelect({ value, onChange }: { value: TriggerMode; onChange: (m: TriggerMode) => void }) {
  const { t } = useTranslation();
  return (
    <Field label={t('pro.autos.gate')} hint={t(`pro.autos.modeBlurb.${value}`)}>
      <SelectBox value={value} options={TRIGGER_MODES.map((m) => ({ value: m.value, label: t(`pro.autos.modes.${m.value}`) }))} onChange={onChange} ariaLabel={t('pro.autos.gate')} />
    </Field>
  );
}

function SecretRow({ value, onRegenerate, onChange }: { value: string; onRegenerate?: () => void; onChange?: (v: string) => void }) {
  const { t } = useTranslation();
  const [shown, setShown] = useState(false);
  const [copied, setCopied] = useState(false);
  useEffect(() => { setShown(false); }, [value]);
  const copy = () => { window.cth.copyToClipboard(value).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1200); }).catch(() => undefined); };
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {shown && onChange ? (
        <Draft mono value={value} onCommit={onChange} ariaLabel={t('pro.autos.secret')} />
      ) : (
        <div style={{ ...inputStyle, display: 'flex', alignItems: 'center', fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: value ? 'var(--cth-ink-900)' : 'var(--cth-ink-500)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {value ? (shown ? value : '•'.repeat(Math.min(24, value.length))) : t('pro.autos.noKey')}
        </div>
      )}
      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        <Btn size="sm" onClick={() => setShown((v) => !v)}>{shown ? t('common.hide') : t('common.show')}</Btn>
        {value && <Btn size="sm" onClick={copy}>{copied ? t('pro.autos.copied') : t('common.copy')}</Btn>}
        {onRegenerate && <Btn size="sm" onClick={onRegenerate}>{t('pro.autos.regenerate')}</Btn>}
      </div>
    </div>
  );
}

function WebhookEditor({ hook, url, onPatch }: { hook: WebhookTrigger; url?: string; onPatch: (fields: Partial<WebhookTrigger>) => void }) {
  const { t } = useTranslation();
  const [schema, setSchema] = useState(hook.schema);
  const [schemaErr, setSchemaErr] = useState<string | null>(null);
  useEffect(() => { setSchema(hook.schema); setSchemaErr(null); }, [hook.id, hook.schema]);
  const saveSchema = () => {
    try { JSON.parse(schema); } catch (e) { setSchemaErr(t('webhooksSection.notValidJson', { error: (e as Error).message })); return; }
    setSchemaErr(null); onPatch({ schema });
  };
  const regenerate = () => { generateWebhookSecret().then((secret) => onPatch({ secret })); };
  const godName = useStore((s) => s.agents.find((a) => a.isGod)?.name) ?? 'the orchestrator';
  return (
    <>
      <Field label={t('pro.autos.name')}>
        <Draft value={hook.name} onCommit={(name) => onPatch({ name })} ariaLabel={t('pro.autos.name')} />
      </Field>
      <Field label={t('pro.autos.endpoint')} hint={url ? undefined : t('pro.autos.serverOffHint')}>
        {url ? <CodeBox style={{ maxHeight: 80 }}>{`POST ${url}`}</CodeBox> : <Chip tone="outline" style={{ alignSelf: 'flex-start' }}>{t('pro.autos.serverOff')}</Chip>}
      </Field>
      <Field label={t('pro.autos.secret')} hint={t('pro.autos.secretHint')}>
        <SecretRow value={hook.secret} onRegenerate={regenerate} onChange={(secret) => onPatch({ secret })} />
      </Field>
      {/* 0.5.3 batch 3: how a blank caller proves itself, the same choice
          Connections > Inbound integrations offers. The services sign their
          own way, so they have none. */}
      {(hook.source ?? 'custom') === 'custom' && (
        <Field label={t('settings.conn.inbound.form.auth')} hint={authHeaderExample(hook.auth ?? 'header')}>
          <SelectBox value={hook.auth ?? 'header'} options={WEBHOOK_AUTHS.map((a) => ({ value: a, label: t(`settings.conn.inbound.form.authChoice.${a}`) }))} onChange={(auth) => onPatch({ auth })} ariaLabel={t('settings.conn.inbound.form.auth')} />
        </Field>
      )}
      <ModeSelect value={hook.mode} onChange={(mode) => onPatch({ mode })} />
      {/* 0.4.9 phase 4, founder 3 Sep 2026. The caller sends a message; this
          says what to do with messages from THIS caller, and rides with every
          request the endpoint accepts. */}
      <Field label={t('pro.autos.hookPrompt')} hint={t('pro.autos.hookPromptHint')}>
        <Draft multiline value={hook.prompt ?? ''} onCommit={(prompt) => onPatch({ prompt })} placeholder={t('pro.autos.hookPromptPlaceholder')} ariaLabel={t('pro.autos.hookPrompt')} />
      </Field>
      {/* 0.5.3: the same per endpoint agent Settings > Connections sets, so
          either screen can point this caller at an agent. '' is the webhook
          default and must be sent as '' (an absent `to` keeps the stored
          one); main resolves it (resolveWebhookRecipient). */}
      <Field label={t('settings.conn.answeredBy')} hint={t('pro.autos.hookAnsweredByHint', { godName })}>
        <AgentPicker value={hook.to ?? ''} onChange={(to) => onPatch({ to })} label={t('settings.conn.answeredBy')} godName={godName} />
      </Field>
      {/* The guardrails text is SHIPPED, not typed: the tooltip shows the exact
          words that get sent, so ticking the box is never a promise the app
          has not written down. */}
      <div title={DEFAULT_WEBHOOK_GUARDRAILS} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <Switch on={hook.guardrails === true} onChange={(guardrails) => onPatch({ guardrails })} label={t('pro.autos.guardrails')} />
        <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{t('pro.autos.guardrailsHint')}</span>
      </div>
      <Field label={t('pro.autos.schema')} hint={t('pro.autos.schemaHint')}>
        <div style={{ borderRadius: 8, border: '1px solid var(--cth-ink-300)', overflow: 'hidden' }}>
          <JsonEditor value={schema} onChange={setSchema} />
        </div>
      </Field>
      {schemaErr && <div style={{ fontSize: 12, color: 'var(--cth-coral)' }}>{schemaErr}</div>}
      {schema !== hook.schema && <Btn size="sm" kind="primary" onClick={saveSchema} style={{ alignSelf: 'flex-start' }}>{t('pro.autos.saveSchema')}</Btn>}
    </>
  );
}

/* ───────────────────────────── recent ledger rows ─────────────────────── */

function RecentHistory({ rows }: { rows: TriggerHistoryEntry[] }) {
  const { t, i18n } = useTranslation();
  const agentById = useAgentById();
  const [busy, setBusy] = useState<string | null>(null);
  const [failed, setFailed] = useState<string | null>(null);
  const decide = (id: string, decision: 'approved' | 'rejected') => {
    setBusy(id); setFailed(null);
    window.cth.decideTriggerHistory({ id, decision }).then((res) => { if (!res) setFailed(id); }).catch(() => setFailed(id)).finally(() => setBusy(null));
  };
  const toneOf = (d?: TriggerHistoryEntry['decision']) => (d === 'pending' ? 'warn' : d === 'rejected' ? 'bad' : d === 'approved' ? 'ok' : 'muted');
  const decisionKey = (d?: TriggerHistoryEntry['decision']) => (d === 'pending' ? 'decisionPending' : d === 'approved' ? 'decisionApproved' : d === 'rejected' ? 'decisionRejected' : 'decisionAuto');
  return (
    <>
      <SectionH>{t('pro.autos.recent')}</SectionH>
      {rows.length === 0 && <div style={{ fontSize: 12.5, color: 'var(--cth-ink-500)' }}>{t('pro.autos.recentNone')}</div>}
      {rows.map((h) => {
        const peer = agentById(h.peer);
        const text = (h.title ? `${h.title} — ` : '') + h.body;
        return (
          <div key={h.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 10, borderRadius: 8, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11.5, color: 'var(--cth-ink-500)' }}>
              {peer && <Portrait agent={peer} size={18} />}
              <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{h.direction === 'inbound' ? '←' : '→'} {peer?.name ?? h.peer}</span>
              <span style={{ fontFamily: 'var(--cth-font-mono)' }}>{fmtWhen(h.at, i18n.language)}</span>
            </div>
            <div style={{ fontSize: 12.5, color: 'var(--cth-ink-900)', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden', overflowWrap: 'anywhere' }}>{text}</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <Chip tone={toneOf(h.decision)}>{t(`triggerHistory.${decisionKey(h.decision)}`)}</Chip>
              <span style={{ flex: 1 }} />
              {h.decision === 'pending' && (
                <>
                  <Btn size="sm" kind="primary" disabled={busy === h.id} onClick={() => decide(h.id, 'approved')}>{t('triggerHistory.approve')}</Btn>
                  <Btn size="sm" kind="danger" disabled={busy === h.id} onClick={() => decide(h.id, 'rejected')}>{t('triggerHistory.reject')}</Btn>
                </>
              )}
            </div>
            {failed === h.id && <div style={{ fontSize: 12, color: 'var(--cth-coral)' }}>{t('triggerHistory.decideFailed')}</div>}
          </div>
        );
      })}
    </>
  );
}
