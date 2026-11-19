/**
 * THE ACTIVITY FOLD: the last events of one integration, newest
 * first, as main reads them from the hive's log (`integrations:activity`,
 * shared/integrationActivity.ts). Each line is the locale sentence
 * `integrationActivity.<event>` filled from its params; an event this build
 * has no sentence for still says which way it went, never a code.
 *
 * Any failure to read (main not answering yet, a key it does not know) shows
 * "Nothing yet": the tab is a look back, and an error here helps nobody.
 * No item carries a key, a token or a message body, so nothing here can show one.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { isIntegrationActivityKey, type IntegrationActivityItem, type IntegrationActivityKind } from '@shared/integrationActivity';
import { fmtWhen } from '../fmtWhen';
import { Icon, type IconName } from '../Icon';

const ICON: Record<IntegrationActivityKind, IconName> = { in: 'bell', out: 'arrow-right', error: 'info', info: 'check' };

/** `activityKey` null: the item is not saved yet, so it has no past. */
export function IntegrationActivity({ activityKey }: { activityKey: string | null }) {
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState<IntegrationActivityItem[] | null>(null);

  useEffect(() => {
    let alive = true;
    setItems(null);
    if (!activityKey || !isIntegrationActivityKey(activityKey) || typeof window.cth?.integrationsActivity !== 'function') { setItems([]); return undefined; }
    window.cth.integrationsActivity(activityKey)
      .then((list) => { if (alive) setItems(Array.isArray(list) ? [...list].sort((a, b) => b.at - a.at) : []); })
      .catch(() => { if (alive) setItems([]); });
    return () => { alive = false; };
  }, [activityKey]);

  const sentence = (it: IntegrationActivityItem): string => {
    const key = `integrationActivity.${it.event}`;
    if (it.event && i18n.exists(key)) return t(key, { ...(it.params ?? {}) });
    return t(`integrations.screen.activity.fallback.${it.kind in ICON ? it.kind : 'info'}`);
  };

  if (items === null) return <p style={QUIET} data-activity="loading">{t('integrations.screen.activity.reading')}</p>;
  if (items.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 0' }} data-activity="empty">
        <b style={{ fontSize: 13, color: 'var(--cth-ink-900)' }}>{t('integrations.screen.activity.empty')}</b>
        <p style={QUIET}>{activityKey ? t('integrations.screen.activity.emptyLine') : t('integrations.screen.activity.unsaved')}</p>
      </div>
    );
  }
  return (
    <ul style={{ listStyle: 'none', margin: 0, padding: 0, boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', background: 'var(--cth-cream-100)', overflow: 'hidden' }} data-activity="list">
      {items.map((it, i) => (
        <li key={`${it.at}-${i}`} data-activity-kind={it.kind} style={{
          display: 'flex', alignItems: 'center', gap: 12, padding: '8px 12px',
          boxShadow: i > 0 ? 'inset 0 1px 0 var(--cth-ink-100)' : undefined
        }}>
          <span aria-hidden style={{
            width: 28, height: 28, flex: 'none', display: 'inline-grid', placeItems: 'center',
            boxShadow: `inset 0 0 0 1px ${it.kind === 'error' ? 'var(--cth-status-blocked)' : 'var(--cth-ink-300)'}`,
            background: it.kind === 'error' ? 'var(--cth-cream-100)' : 'var(--cth-cream-200)'
          }}><Icon name={ICON[it.kind] ?? 'check'} size={1} /></span>
          <span style={{ flex: 1, minWidth: 0, fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-700)' }}>{sentence(it)}</span>
          <time dateTime={Number.isFinite(it.at) ? new Date(it.at).toISOString() : undefined} style={{ flex: 'none', fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>{fmtWhen(it.at, i18n.language)}</time>
        </li>
      ))}
    </ul>
  );
}

const QUIET = { margin: 0, fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-500)' } as const;
