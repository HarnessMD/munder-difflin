/**
 * Classic's notice for an agent that started degraded (plan F, gate of #190 W2):
 * its hooks cannot run on this machine, or its proxy bridge never bound. Main
 * pushes `hive:degraded` once per launch per problem; the native toast it also
 * raises is off with default settings, so without this the person never hears
 * of it. Each notice names a fix the person has to make, so it waits to be
 * dismissed.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { degradedText } from '@/components/degradedText';
import { followDegraded } from '@/components/degradedFeed';
import { Icon } from '@/components/Icon';

interface Notice { key: string; name: string; message: string }

/** Cap on notices on screen at once (oldest drop off). */
const MAX_VISIBLE = 3;

export function DegradedToast(): JSX.Element | null {
  const [notices, setNotices] = useState<Notice[]>([]);
  const { t } = useTranslation();

  useEffect(() => {
    // What waited for the floor shows on mount, once; later ones as they come (degradedFeed.ts).
    return followDegraded((evt) => {
      const key = `${evt.agentId}:${evt.reason}:${evt.message}`;
      setNotices((prev) => (prev.some((n) => n.key === key) ? prev : [...prev, { key, name: evt.name, message: degradedText(t, evt.reason, evt.message) }].slice(-MAX_VISIBLE)));
    });
  }, [t]);

  if (notices.length === 0) return null;
  const dismiss = (key: string): void => setNotices((prev) => prev.filter((n) => n.key !== key));

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, maxWidth: 360, pointerEvents: 'none' }}>
      {notices.map((n) => (
        <div
          key={n.key}
          role="alert"
          style={{
            pointerEvents: 'auto',
            background: 'var(--cth-paper-100)',
            boxShadow: 'inset 0 0 0 1.5px var(--cth-ink-500), 4px 4px 0 0 var(--cth-ink-900)',
            padding: 12,
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}
        >
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              fontFamily: 'var(--cth-font-display)',
              fontSize: 8,
              lineHeight: '12px',
              color: 'var(--cth-ink-900)',
              textTransform: 'uppercase'
            }}
          >
            <Icon name="bell" /> {n.name} · needs a fix
            <button
              type="button"
              onClick={() => dismiss(n.key)}
              aria-label="Dismiss"
              style={{
                marginLeft: 'auto',
                border: 'none',
                background: 'transparent',
                cursor: 'pointer',
                fontFamily: 'var(--cth-font-display)',
                fontSize: 10,
                lineHeight: '10px',
                color: 'var(--cth-ink-700)',
                padding: 0
              }}
            >
              ✕
            </button>
          </div>
          <div style={{ fontFamily: 'var(--cth-font-ui)', fontSize: 14, lineHeight: '19px', color: 'var(--cth-ink-900)' }}>
            {n.message}
          </div>
        </div>
      ))}
    </div>
  );
}
