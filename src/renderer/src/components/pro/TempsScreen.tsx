/**
 * TEMPS (phase 4). The ephemeral workers the orchestrator hires: what is
 * running now, what has run (the ledger main writes at every teardown,
 * workers:history), and the worktrees kept back because they hold work
 * nobody has merged yet.
 *
 * Replaces WorkersTab in PRO. The live rows are the same `workers:list`
 * poll; the history is new (plan 4.8) and is the reason this screen exists:
 * before it, a temp that finished left nothing behind but a Slack reply.
 *
 * WHAT IS NOT HERE: a "re-run" button. A worker is hired by the orchestrator
 * from a spawn request; re-running one from here would be a spend the person
 * did not route through Michael, and the founder's rule is that the desktop
 * never spends on its own. The row's job text can be copied and pasted into
 * the prompt bar instead.
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { WorkerHistoryEntry } from '@shared/workerHistory';
import { useStore } from '@/store/store';
import { Bar, Btn, Chip, CloseX, CodeBox, Kv, Meter, SearchBox, SectionH, Seg, useEscapeToClose } from './ui';
import { ProIcon } from './icons';
import { TEMPS_FILTERS, filterHistory, fmtSpan, fmtTokens, jobLine, resultTone, type TempsFilter } from './tempsData';

type WorkersData = Awaited<ReturnType<typeof window.cth.listWorkers>>;
type WorkerSnapshot = WorkersData['live'][number];

const POLL_MS = 2000;

function useWorkers(): { data: WorkersData | null; refresh: () => void } {
  const [data, setData] = useState<WorkersData | null>(null);
  const refresh = useCallback(() => {
    window.cth?.listWorkers?.().then(setData).catch(() => { /* main is restarting; keep the last answer */ });
  }, []);
  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, POLL_MS);
    return () => window.clearInterval(id);
  }, [refresh]);
  return { data, refresh };
}

function useWorkerHistory(): WorkerHistoryEntry[] {
  const [rows, setRows] = useState<WorkerHistoryEntry[]>([]);
  useEffect(() => {
    const api = window.cth;
    if (!api?.workersHistory) return;
    let alive = true;
    const read = () => { api.workersHistory().then((r) => { if (alive) setRows(r); }).catch(() => { /* keep */ }); };
    read();
    const off = api.onWorkersHistoryUpdated?.(read) ?? (() => {});
    return () => { alive = false; off(); };
  }, []);
  return rows;
}

export function TempsScreen() {
  const { t, i18n } = useTranslation();
  const godName = useStore((s) => s.agents.find((a) => a.isGod)?.name) ?? 'Michael';
  const { data, refresh } = useWorkers();
  const history = useWorkerHistory();
  const [filter, setFilter] = useState<TempsFilter>('all');
  const [q, setQ] = useState('');
  const [selId, setSelId] = useState<string | null>(null);
  const closeDrawer = useCallback(() => setSelId(null), []);
  const [stopping, setStopping] = useState<Record<string, boolean>>({});

  const live = data?.live ?? [];
  const preserved = data?.preserved ?? [];
  const max = data?.maxWorkers ?? 4;
  const rows = useMemo(() => filterHistory(history, filter, q), [history, filter, q]);
  const sel = selId ? history.find((r) => r.id === selId) ?? null : null;

  const stop = (workerId: string) => {
    setStopping((s) => ({ ...s, [workerId]: true }));
    window.cth.stopWorker(workerId).catch(() => { /* the row vanishing, or not, is the answer */ }).finally(refresh);
  };

  return (
    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)' }}>
      <Bar title={t('pro.nav.temps')} sub={t('pro.temps.sub', { n: live.length, max })}>
        <SearchBox value={q} onChange={setQ} placeholder={t('pro.temps.search')} />
        <Seg value={filter} onChange={setFilter} ariaLabel={t('pro.temps.filterLabel')} options={TEMPS_FILTERS.map((f) => ({ value: f, label: t(`pro.temps.filter.${f}`) }))} />
      </Bar>
      <div style={{ flex: 1, minHeight: 0, display: 'grid', gridTemplateColumns: sel ? 'minmax(0,1fr) 380px' : 'minmax(0,1fr)' }}>
        <div style={{ overflowY: 'auto', padding: '14px 18px 24px', display: 'flex', flexDirection: 'column', gap: 18 }}>
          {/* Running */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionH>{t('pro.temps.running')}</SectionH>
            <p style={{ margin: 0, fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.temps.runningBlurb', { godName })}</p>
            {live.length === 0 ? (
              <div style={{ padding: '14px 16px', border: '1px solid var(--cth-ink-300)', borderRadius: 10, fontSize: 12.5, color: 'var(--cth-ink-500)', background: 'var(--cth-cream-100)' }}>{t('pro.temps.noneRunning')}</div>
            ) : live.map((w) => <LiveRow key={w.workerId} w={w} stopping={!!stopping[w.workerId]} onStop={() => stop(w.workerId)} />)}
          </section>

          {/* History */}
          <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <SectionH right={<span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('pro.temps.count', { n: rows.length })}</span>}>{t('pro.temps.history')}</SectionH>
            {rows.length === 0 ? (
              <div style={{ padding: '14px 16px', border: '1px solid var(--cth-ink-300)', borderRadius: 10, fontSize: 12.5, color: 'var(--cth-ink-500)', background: 'var(--cth-cream-100)' }}>
                {history.length === 0 ? t('pro.temps.noHistory') : t('pro.temps.noMatch')}
              </div>
            ) : (
              <div style={{ border: '1px solid var(--cth-ink-300)', borderRadius: 10, overflow: 'hidden', background: 'var(--cth-cream-100)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5, tableLayout: 'fixed' }}>
                  <colgroup><col style={{ width: 84 }} /><col style={{ width: 140 }} /><col /><col style={{ width: 70 }} /><col style={{ width: 116 }} /><col style={{ width: 96 }} /><col style={{ width: 86 }} /></colgroup>
                  <thead>
                    <tr style={{ fontSize: 11, color: 'var(--cth-ink-500)', textAlign: 'left' }}>
                      {(['when', 'name', 'job', 'ran', 'tokens', 'result', 'worktree'] as const).map((h) => (
                        <th key={h} style={{ fontWeight: 600, padding: '8px 10px', borderBottom: '1px solid var(--cth-ink-300)', letterSpacing: 0.2, textTransform: 'uppercase' }}>{t(`pro.temps.col.${h}`)}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {rows.map((r) => (
                      <tr
                        key={r.id}
                        role="button" tabIndex={0}
                        aria-selected={sel?.id === r.id}
                        onClick={() => setSelId(sel?.id === r.id ? null : r.id)}
                        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setSelId(sel?.id === r.id ? null : r.id); } }}
                        style={{ cursor: 'pointer', background: sel?.id === r.id ? 'var(--cth-surface-active)' : 'transparent' }}
                      >
                        <td style={cell}>{fmtWhenShort(r.endedAt, i18n.language)}</td>
                        <td style={{ ...cell, fontWeight: 500 }}>{r.name}</td>
                        <td style={{ ...cell, color: 'var(--cth-ink-700)' }}>{jobLine(r.job) || <span style={{ color: 'var(--cth-ink-500)' }}>—</span>}</td>
                        <td style={{ ...cell, fontFamily: 'var(--cth-font-mono)', fontSize: 11.5 }}>{fmtSpan(r.endedAt - r.spawnedAt)}</td>
                        <td style={{ ...cell, fontFamily: 'var(--cth-font-mono)', fontSize: 11.5 }}>{fmtTokens(r.tokensUsed)}{r.tokenCap ? ` / ${fmtTokens(r.tokenCap)}` : ''}</td>
                        <td style={cell}><Chip tone={resultTone(r.result)}>{t(`pro.temps.result.${r.result}`)}</Chip></td>
                        <td style={cell}>{r.worktree ? <Chip tone={r.worktree === 'preserved' ? 'warn' : 'muted'}>{t(`pro.temps.worktree.${r.worktree}`)}</Chip> : <span style={{ color: 'var(--cth-ink-500)' }}>—</span>}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          {/* Preserved worktrees */}
          {preserved.length > 0 && (
            <section style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              <SectionH>{t('pro.temps.preserved', { n: preserved.length })}</SectionH>
              <p style={{ margin: 0, fontSize: 12, color: 'var(--cth-ink-500)' }}>{t('pro.temps.preservedBlurb', { godName })}</p>
              {preserved.map((p) => (
                <div key={p.wtPath} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', border: '1px solid var(--cth-ink-300)', borderRadius: 10, background: 'var(--cth-cream-100)' }}>
                  <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 3 }}>
                    <span style={{ fontWeight: 500, fontSize: 12.5 }}>{p.workerId}</span>
                    <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11.5, color: 'var(--cth-ink-700)', overflowWrap: 'anywhere' }}>{p.wtPath}</span>
                    <span style={{ fontSize: 11.5, color: 'var(--cth-ink-500)' }}>{t('pro.temps.base', { branch: p.baseBranch })} · {t('pro.temps.keptAgo', { age: fmtSpan(Math.max(0, Date.now() - p.preservedAt)) })}</span>
                  </div>
                  <Btn size="sm" onClick={() => { void window.cth.copyToClipboard(p.wtPath); }}><ProIcon name="copy" size={13} />{t('pro.temps.copyPath')}</Btn>
                </div>
              ))}
            </section>
          )}
        </div>

        {sel && <HistoryDrawer row={sel} onClose={closeDrawer} />}
      </div>
    </div>
  );
}

const cell = { padding: '9px 10px', borderBottom: '1px solid var(--cth-ink-100)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', verticalAlign: 'middle' } as const;

function fmtWhenShort(at: number, locale: string): string {
  const d = new Date(at);
  const now = new Date();
  if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString(locale, { hour: '2-digit', minute: '2-digit' });
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' });
}

function LiveRow({ w, stopping, onStop }: { w: WorkerSnapshot; stopping: boolean; onStop: () => void }) {
  const { t } = useTranslation();
  const releasing = w.releasing || stopping;
  const pct = w.tokenCap ? Math.min(100, Math.round((w.tokensUsed / w.tokenCap) * 100)) : null;
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '10px 14px', border: '1px solid var(--cth-ink-300)', borderRadius: 10, background: 'var(--cth-cream-100)' }}>
      <div style={{ minWidth: 0, flex: 1, display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <span style={{ fontWeight: 600, fontSize: 13, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{w.name}</span>
          <Chip tone={releasing ? 'muted' : 'ok'}>{releasing ? t('pro.temps.stopping') : t('pro.temps.working')}</Chip>
          {w.hasSlack && <Chip tone="outline">Slack</Chip>}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2px 14px', fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-700)' }}>
          <span>{w.workerId}</span>
          <span>{t('pro.temps.base', { branch: w.baseBranch })}</span>
          <span>{t('pro.temps.up', { age: fmtSpan(w.ageMs) })}</span>
          <span>{w.idleMs === null ? t('pro.temps.ptyGone') : t('pro.temps.idle', { age: fmtSpan(w.idleMs) })}</span>
          <span>{fmtTokens(w.tokensUsed)}{w.tokenCap ? ` / ${fmtTokens(w.tokenCap)}` : ` · ${t('pro.temps.uncapped')}`}</span>
        </div>
        {pct !== null && <div style={{ maxWidth: 260 }}><Meter pct={pct} /></div>}
      </div>
      <Btn size="sm" kind="danger" onClick={onStop} disabled={releasing}>{releasing ? t('pro.temps.stopping') : t('pro.temps.stop')}</Btn>
    </div>
  );
}

function HistoryDrawer({ row, onClose }: { row: WorkerHistoryEntry; onClose: () => void }) {
  const { t, i18n } = useTranslation();
  const when = (at: number) => new Date(at).toLocaleString(i18n.language, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  const ref = useRef<HTMLElement>(null);
  useEscapeToClose(onClose, ref);
  return (
    <aside ref={ref} style={{ borderLeft: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 12, padding: 16, minWidth: 0 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <span style={{ fontWeight: 600, fontSize: 14, flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.name}</span>
        {row.hasSlack && <Chip tone="outline">Slack</Chip>}
        <Chip tone={resultTone(row.result)}>{t(`pro.temps.result.${row.result}`)}</Chip>
        <CloseX onClick={onClose} title={t('common.close')} />
      </div>
      <p style={{ margin: 0, fontSize: 12, color: 'var(--cth-ink-500)', lineHeight: 1.45 }}>{t(`pro.temps.resultBlurb.${row.result}`)}</p>
      <Kv rows={[
        { k: t('pro.temps.col.worker'), v: row.workerId, mono: true },
        { k: t('pro.temps.col.request'), v: row.reqId, mono: true },
        { k: t('pro.temps.col.base'), v: row.baseBranch, mono: true },
        { k: t('pro.temps.col.started'), v: when(row.spawnedAt) },
        { k: t('pro.temps.col.ended'), v: when(row.endedAt) },
        { k: t('pro.temps.col.ran'), v: fmtSpan(row.endedAt - row.spawnedAt) },
        { k: t('pro.temps.col.tokens'), v: `${fmtTokens(row.tokensUsed)}${row.tokenCap ? ` / ${fmtTokens(row.tokenCap)}` : ` · ${t('pro.temps.uncapped')}`}`, mono: true },
        { k: t('pro.temps.col.worktree'), v: row.worktree ? t(`pro.temps.worktree.${row.worktree}`) : t('pro.temps.worktree.none') }
      ]} />
      <SectionH right={<Btn size="sm" kind="ghost" onClick={() => { void window.cth.copyToClipboard(row.job); }}><ProIcon name="copy" size={13} />{t('pro.temps.copyJob')}</Btn>}>{t('pro.temps.col.job')}</SectionH>
      <CodeBox style={{ maxHeight: 'none' }}>{row.job || '—'}</CodeBox>
    </aside>
  );
}
