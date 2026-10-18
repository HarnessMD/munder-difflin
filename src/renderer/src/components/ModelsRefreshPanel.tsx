/**
 * REFRESH-MODELS (1.1.73): Settings -> Agents & Models -> "Refresh models". The ONLY thing that
 * asks the providers which models they offer. Main runs every provider's lookup (async, hidden,
 * time-boxed), rewrites userData/models.json and pushes it to every picker; this panel shows one
 * row per provider: how many models, what was added or removed, or why there is no list.
 */
import { useState } from 'react';
import type { ModelsRefreshRow } from '@shared/modelCatalog';
import { currentModelCatalog, useModelCatalogVersion } from '@/store/config';

type Api = { refreshModels?: () => Promise<{ rows: ModelsRefreshRow[] }> };

const STATUS_TEXT: Record<ModelsRefreshRow['status'], string> = {
  ok: 'listed',
  'not-installed': 'not installed',
  unsupported: 'no list',
  failed: 'failed'
};

function describe(r: ModelsRefreshRow): string {
  if (r.status === 'ok') {
    const parts = [`${r.count} model${r.count === 1 ? '' : 's'}`];
    if (r.added.length) parts.push(`+${r.added.length} new`);
    if (r.removed.length) parts.push(`−${r.removed.length} removed: ${r.removed.slice(0, 3).join(', ')}${r.removed.length > 3 ? '…' : ''}`);
    return parts.join(' · ');
  }
  if (r.status === 'failed') return `${r.reason ?? 'failed'}${r.keptLast ? ` · kept the last list (${r.count})` : ' · built-in list used'}`;
  return r.reason ?? STATUS_TEXT[r.status];
}

export function ModelsRefreshPanel(): JSX.Element {
  useModelCatalogVersion();
  const [busy, setBusy] = useState(false);
  const [rows, setRows] = useState<ModelsRefreshRow[] | null>(null);
  const [error, setError] = useState('');
  const refreshedAt = currentModelCatalog()?.refreshedAt;
  const refresh = async (): Promise<void> => {
    const api = (window as unknown as { cth?: Api }).cth;
    if (!api?.refreshModels || busy) return;
    setBusy(true); setError('');
    try { setRows((await api.refreshModels()).rows); } catch (e) { setError(e instanceof Error ? e.message : String(e)); } finally { setBusy(false); }
  };
  return (
    <div>
      <div style={{ fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px', color: 'var(--cth-ink-500)', textTransform: 'uppercase', marginBottom: 10 }}>
        Available models
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
          The model pickers use each CLI&apos;s own list after a refresh, and the built-in lists until then.
          Nothing is looked up unless you press the button.
          {refreshedAt ? ` Last refreshed ${new Date(refreshedAt).toLocaleString()}.` : ' Not refreshed yet.'}
        </span>
        <div>
          <button
            type="button"
            onClick={() => { void refresh(); }}
            disabled={busy}
            style={{
              padding: '3px 10px 1px', border: 'none', cursor: busy ? 'default' : 'pointer', fontFamily: 'var(--cth-font-ui)', fontSize: 12,
              color: 'var(--cth-ink-900)', background: 'var(--cth-cream-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', opacity: busy ? 0.6 : 1
            }}
          >
            {busy ? 'Refreshing…' : 'Refresh models'}
          </button>
        </div>
        {error && <span style={{ fontSize: 12, color: 'var(--cth-coral-dark, #b33)' }}>{error}</span>}
        {rows && (
          <table data-testid="models-refresh-rows" style={{ fontSize: 12, lineHeight: '16px', borderCollapse: 'collapse' }}>
            <tbody>
              {rows.map((r) => (
                <tr key={r.provider}>
                  <td style={{ padding: '2px 8px 2px 0', color: 'var(--cth-ink-900)' }}>{r.provider}</td>
                  <td style={{ padding: '2px 8px 2px 0', color: r.status === 'failed' ? 'var(--cth-coral-dark, #b33)' : 'var(--cth-ink-500)' }}>{STATUS_TEXT[r.status]}</td>
                  <td style={{ padding: '2px 0', color: 'var(--cth-ink-500)' }}>{describe(r)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
