/**
 * The port a local server is really on, as one read only line in Settings
 * (0.5.3, the rest of bug 11). Quiet when the port is the configured one, a
 * warning when it was taken and the server moved, because a local caller pointed
 * at the configured port is then posting to something else. The port input
 * beside it keeps the configured number: see shared/boundPort.ts for why.
 */
import { useTranslation } from 'react-i18next';
import { boundPortLines, type BoundPort } from '@shared/boundPort';

export function BoundPortNote({ bound }: { bound: BoundPort | null | undefined }) {
  const { t } = useTranslation();
  const lines = boundPortLines(bound);
  if (lines.length === 0) return null;
  return (
    <>
      {lines.map((l) => (
        <span
          key={l.key} data-bound-port={l.warn ? 'moved' : 'same'}
          style={{ fontSize: 12, lineHeight: '16px', color: l.warn ? 'var(--cth-status-blocked)' : 'var(--cth-ink-500)' }}
        >
          {t(`settings.connections.${l.key}`, { port: l.port, from: l.from })}
        </span>
      ))}
    </>
  );
}
