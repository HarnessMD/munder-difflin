import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  MCP_CATALOG, MCP_TIERS, isPlainObject, mcpCatalogEntry, mcpConsentRecord, resolveMcpEnablement, type McpTier
} from '@shared/mcpCatalog';

/** A load failure means the state is unknown and clears once a read succeeds; a save
 *  failure stays until the user acts, so a background refresh cannot hide it. */
type McpPanelError = { kind: 'load' | 'save'; message: string };

/** 'user': initial load, Refresh, post-save readback — shows loading and resets
 *  feedback. 'broadcast': another config write happened — revalidate quietly. */
type RefreshOrigin = 'user' | 'broadcast';
const TIER_LABEL_KEY: Record<McpTier, string> = {
  'safe-readonly': 'mcpDefaults.tiers.safeReadonly',
  'write': 'mcpDefaults.tiers.write',
  'secret': 'mcpDefaults.tiers.secret'
};
const TIER_NOTE_KEY: Record<McpTier, string> = {
  'safe-readonly': 'mcpDefaults.tiers.safeReadonlyNote',
  'write': 'mcpDefaults.tiers.writeNote',
  'secret': 'mcpDefaults.tiers.secretNote'
};

const labelStyle: React.CSSProperties = {
  fontFamily: 'var(--cth-font-display)',
  fontSize: 8,
  lineHeight: '12px',
  color: 'var(--cth-ink-500)',
  textTransform: 'uppercase'
};

export function McpDefaultsSettings() {
  const { t } = useTranslation();
  const [note, setNote] = useState('');
  const [error, setError] = useState<McpPanelError | null>(null);
  const [records, setRecords] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState<string | null>(null);
  const saving = useRef(false);
  const mounted = useRef(false);
  const readVersion = useRef(0);

  const refresh = useCallback(async (origin: RefreshOrigin = 'user') => {
    const version = ++readVersion.current;
    // Every config write broadcasts (missions, token caps, theme…). Keep the last
    // confirmed records and feedback on screen while revalidating in the background.
    if (origin === 'user') {
      setLoading(true);
      setRecords(null);
      setNote('');
      setError(null);
    }
    try {
      const state = await window.cth.getMcpConsentState();
      if (!mounted.current || version !== readVersion.current) return null;
      if (!state || state.ok !== true || !isPlainObject(state.records)) throw new Error('MCP consent unavailable');
      setRecords(state.records);
      if (origin === 'broadcast') setError((current) => (current?.kind === 'load' ? null : current));
      return state.records;
    } catch {
      if (mounted.current && version === readVersion.current) {
        setRecords(null);
        setError({ kind: 'load', message: t('mcpDefaults.couldNotLoad') });
      }
      return null;
    } finally {
      // Also settles a user read that a newer broadcast read superseded.
      if (mounted.current && version === readVersion.current) setLoading(false);
    }
  }, [t]);

  useEffect(() => {
    mounted.current = true;
    let off: (() => void) | undefined;
    try {
      off = window.cth.onConfigChanged(() => { void refresh('broadcast'); });
      void refresh();
    } catch {
      setRecords(null);
      setLoading(false);
      setError({ kind: 'load', message: t('mcpDefaults.couldNotLoad') });
    }
    return () => {
      mounted.current = false;
      ++readVersion.current;
      off?.();
    };
  }, [refresh, t]);

  const toggle = async (id: string) => {
    if (saving.current || loading || records === null) return;
    const entry = mcpCatalogEntry(id);
    if (!entry) return;
    const next = !resolveMcpEnablement(entry, mcpConsentRecord(records, id));
    saving.current = true;
    setPending(id);
    setNote('');
    setError(null);
    ++readVersion.current;
    try {
      const updated = await window.cth.setMcpServerEnabled(id, next);
      const savedRecord = mcpConsentRecord(updated?.mcpDefaults, id);
      if (!isPlainObject(savedRecord) || !Object.hasOwn(savedRecord, 'enabled') || savedRecord.enabled !== next
        || resolveMcpEnablement(entry, savedRecord) !== next) {
        throw new Error('MCP consent update was not confirmed');
      }
      if (!mounted.current) return;
      // Read after the save, rather than showing a response snapshot that another
      // window may already have superseded. A failed read leaves state unknown.
      const latest = await refresh();
      if (mounted.current && latest) {
        const on = resolveMcpEnablement(entry, mcpConsentRecord(latest, id));
        setNote(t('mcpDefaults.toggleNote', { id, state: on ? t('common.on') : t('common.off') }));
      }
    } catch {
      if (!mounted.current) return;
      await refresh();
      if (mounted.current) setError({ kind: 'save', message: t('mcpDefaults.couldNotSave') });
    } finally {
      saving.current = false;
      if (mounted.current) setPending(null);
    }
  };

  const byTier = (tier: McpTier) => MCP_CATALOG.filter((e) => e.tier === tier);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div>
        <div style={{ ...labelStyle, marginBottom: 6 }}>{t('mcpDefaults.title')}</div>
        <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' }}>
          {t('mcpDefaults.desc')}
        </span>
      </div>

      {MCP_TIERS.map((tier) => {
        const entries = byTier(tier);
        if (entries.length === 0) return null;
        const isConsent = tier !== 'safe-readonly';
        return (
          <div key={tier} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
              <span style={{
                fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
                color: isConsent ? '#6E1423' : 'var(--cth-ink-500)',
                textTransform: 'uppercase'
              }}>
                {t(TIER_LABEL_KEY[tier])}
              </span>
              <span style={{ fontSize: 11, lineHeight: '15px', color: 'var(--cth-ink-400, var(--cth-ink-500))' }}>
                {t(TIER_NOTE_KEY[tier])}
              </span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              {entries.map((entry) => {
                const on = resolveMcpEnablement(entry, mcpConsentRecord(records, entry.id));
                return (
                  <div
                    key={entry.id}
                    style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      gap: 12, padding: '7px 10px',
                      background: 'var(--cth-paper-100)',
                      boxShadow: `inset 0 0 0 1px ${isConsent && on ? '#6E1423' : 'var(--cth-ink-300)'}`
                    }}
                  >
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 1, flex: 1, minWidth: 0 }}>
                      <span style={{ fontSize: 12, lineHeight: '18px', color: 'var(--cth-ink-900)', fontWeight: 600 }}>
                        {entry.label}
                        <code style={{
                          marginLeft: 6,
                          fontFamily: 'var(--cth-font-mono)',
                          fontSize: 11,
                          color: 'var(--cth-ink-500)',
                          fontWeight: 400
                        }}>{entry.id}</code>
                      </span>
                      <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)', wordBreak: 'break-word' }}>
                        {entry.description}
                      </span>
                    </div>
                    <button
                      type="button"
                      disabled={loading || pending !== null || records === null}
                      aria-busy={pending === entry.id}
                      onClick={() => { void toggle(entry.id); }}
                      style={{
                        flexShrink: 0,
                        padding: '3px 10px 1px',
                        background: on
                          ? (isConsent ? 'var(--cth-coral-light, #f6d3c4)' : 'var(--cth-lemon)')
                          : 'var(--cth-cream-200)',
                        boxShadow: `inset 0 0 0 1px ${on ? 'var(--cth-ink-900)' : 'var(--cth-ink-700)'}`,
                        border: 'none',
                        fontFamily: 'var(--cth-font-display)',
                        fontSize: 8,
                        lineHeight: '14px',
                        color: 'var(--cth-ink-900)',
                        cursor: 'pointer',
                        textTransform: 'uppercase'
                      }}
                    >
                      {pending === entry.id ? t('common.saving') : loading ? t('mcpDefaults.loading')
                        : records === null ? t('mcpDefaults.unavailable') : on ? t('common.on') : t('common.off')}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}

      <button type="button" disabled={loading || pending !== null} onClick={() => { void refresh(); }}>
        {t('mcpDefaults.refresh')}
      </button>
      {error && <span role="alert" style={{ fontSize: 12, color: '#6E1423' }}>{error.message}</span>}
      {note && <span role="status" style={{ fontSize: 12, color: 'var(--cth-mint)' }}>{note}</span>}
    </div>
  );
}
