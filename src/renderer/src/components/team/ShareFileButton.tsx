/**
 * Share a file with a teammate on another machine.
 *
 * Until this shipped there was no cross machine path for a file at all: the
 * composer pasted a LOCAL PATH, which only works when the agent happens to be
 * on the same filesystem as the person who typed it. This publishes the file
 * on a tunnel link instead, and the link dies one hour later.
 *
 * THE CONFIRM IS NOT OPTIONAL AND IT IS NOT DECORATIVE. Pressing this button
 * puts a file on your own disk onto the public internet behind a link with no
 * password on it. The dialog says exactly that, in those words, before
 * anything is published, and it is the only route to `fileShareCreate`.
 *
 * The picker is a real `<input type="file">` rather than the main process
 * picker, for one reason: it hands back a `File`, so the confirm can state the
 * NAME and the SIZE of what is about to be published. `pathForFile` turns it
 * into the absolute path main needs. Main re-validates that path from scratch;
 * nothing here is trusted on the other side of the bridge.
 */
import { useCallback, useEffect, useRef, useState, type ChangeEvent } from 'react';
import { useTranslation } from 'react-i18next';
import { Btn, Chip, ConfirmDialog, Panel, proToast } from '../pro/ui';
import { ProIcon } from '../pro/icons';
import {
  MAX_SHARE_BYTES, describeBytes, shareCountdown,
  type FileShareView, type ShareRefusal
} from '@shared/fileShare';

/** What the person picked, before they have agreed to publish it. */
interface PendingShare {
  path: string;
  name: string;
  size: number;
}

export interface ShareFileButtonProps {
  style?: React.CSSProperties;
  /**
   * Called once, with the share, the moment one is published.
   *
   * Without it an embedder that wants the link has to poll `fileShareList()`
   * and work out which row is new, which is racy: two shares published in the
   * same second, or a share made in another window, both land in the same list
   * with nothing to tell them apart. The button already knows exactly which
   * share it just made, so it says so.
   */
  onShared?: (share: FileShareView) => void;
}

export function ShareFileButton({ style, onShared }: ShareFileButtonProps = {}) {
  const { t } = useTranslation();
  const inputRef = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<PendingShare | null>(null);
  const [shares, setShares] = useState<FileShareView[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ShareRefusal | null>(null);

  const api = typeof window === 'undefined' ? undefined : window.cth;

  const refresh = useCallback(() => {
    if (!api?.fileShareList) return;
    void api.fileShareList().then(setShares).catch(() => setShares([]));
  }, [api]);

  useEffect(() => { refresh(); }, [refresh]);

  /* The countdown is the honest part of this screen, so it moves. One interval
     for the whole list, and it also drops a share the moment its hour is up,
     so the list can never show a link that has already stopped working. */
  useEffect(() => {
    if (shares.length === 0) return undefined;
    const id = window.setInterval(() => {
      const now = Date.now();
      setShares((list) => (
        list.some((s) => s.expiresAt <= now) ? list.filter((s) => s.expiresAt > now) : [...list]
      ));
    }, 1000);
    return () => window.clearInterval(id);
  }, [shares.length]);

  const onPick = (e: ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0];
    /* Cleared so picking the SAME file twice still fires a change event, and
       so the element is not left holding a handle to the person's file. */
    e.target.value = '';
    if (!file) return;
    setError(null);
    const path = api?.pathForFile ? api.pathForFile(file) : '';
    if (!path) { setError('notAbsolute'); return; }
    /* Refused here as well as in main, so the person is told before the
       confirm rather than after they have agreed to publish it. */
    if (file.size > MAX_SHARE_BYTES) { setError('tooBig'); return; }
    setPending({ path, name: file.name, size: file.size });
  };

  const publish = (): void => {
    const req = pending;
    setPending(null);
    if (!req || !api?.fileShareCreate) return;
    setBusy(true);
    void api.fileShareCreate(req.path)
      .then((res) => {
        setBusy(false);
        if (!res.ok) { setError(res.error); return; }
        setError(null);
        setShares((list) => [res.share, ...list]);
        onShared?.(res.share);
      })
      .catch(() => { setBusy(false); setError('noServer'); });
  };

  const revoke = (id: string): void => {
    if (!api?.fileShareRevoke) return;
    void api.fileShareRevoke(id).then(() => {
      setShares((list) => list.filter((s) => s.id !== id));
      proToast(t('team.fileShare.revoked'));
    });
  };

  const copy = (url: string): void => {
    void navigator.clipboard.writeText(url);
    proToast(t('team.fileShare.copied'));
  };

  return (
    <Panel
      title={t('team.fileShare.active')}
      style={style}
      right={
        <Btn size="sm" onClick={() => inputRef.current?.click()} disabled={busy}>
          <ProIcon name="clip" size={14} />
          {busy ? t('team.fileShare.publishing') : t('team.fileShare.choose')}
        </Btn>
      }>
      <input ref={inputRef} type="file" onChange={onPick} style={{ display: 'none' }} />

      {error && (
        <div role="alert" style={{
          padding: '8px 10px', borderRadius: 8,
          border: '1px solid var(--cth-status-blocked)',
          background: 'var(--cth-status-blocked-tint)',
          color: 'var(--cth-status-blocked)',
          fontSize: 12, lineHeight: 1.45, marginBottom: 10
        }}>
          {t(`team.fileShare.error.${error}`)}
        </div>
      )}

      {shares.length === 0 ? (
        <p style={{ margin: 0, fontSize: 12.5, color: 'var(--cth-ink-500)' }}>
          {t('team.fileShare.empty')}
        </p>
      ) : (
        <>
          <p style={{ margin: '0 0 10px', fontSize: 12, color: 'var(--cth-ink-500)' }}>
            {t('team.fileShare.warning')}
          </p>
          <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 8 }}>
            {shares.map((share) => (
              <ShareRow key={share.id} share={share} onCopy={copy} onRevoke={revoke} />
            ))}
          </ul>
        </>
      )}

      {pending && (
        <ConfirmDialog
          danger
          title={t('team.fileShare.confirmTitle')}
          body={t('team.fileShare.confirmBody', {
            name: pending.name,
            size: describeBytes(pending.size)
          })}
          confirmLabel={t('team.fileShare.confirmAction')}
          onConfirm={publish}
          onClose={() => setPending(null)}
        />
      )}
    </Panel>
  );
}

function ShareRow(
  { share, onCopy, onRevoke }:
  { share: FileShareView; onCopy: (url: string) => void; onRevoke: (id: string) => void }
) {
  const { t } = useTranslation();
  return (
    <li style={{
      display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0,
      padding: 10, borderRadius: 10, border: '1px solid var(--cth-ink-300)',
      background: 'var(--cth-cream-100)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          flex: 1, minWidth: 0, fontSize: 12.5, fontWeight: 500,
          color: 'var(--cth-ink-900)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
        }}>{share.name}</span>
        <span style={{ fontFamily: 'var(--cth-font-mono)', fontSize: 11, color: 'var(--cth-ink-500)' }}>
          {describeBytes(share.size)}
        </span>
        <Countdown share={share} />
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
        <span style={{
          flex: 1, minWidth: 0, fontFamily: 'var(--cth-font-mono)', fontSize: 11,
          color: 'var(--cth-ink-700)', overflowWrap: 'anywhere'
        }}>{share.url}</span>
        <Btn size="sm" onClick={() => onCopy(share.url)}>
          <ProIcon name="copy" size={13} />
          {t('team.fileShare.copy')}
        </Btn>
        <Btn size="sm" kind="danger" onClick={() => onRevoke(share.id)}>
          {t('team.fileShare.revoke')}
        </Btn>
      </div>
    </li>
  );
}

/** The hour, counting down. Rounded DOWN by `shareCountdown`, so it never
 *  promises time the server will not serve. */
function Countdown({ share }: { share: FileShareView }) {
  const { t } = useTranslation();
  const { unit, count } = shareCountdown(share, Date.now());
  const key = unit === 'expired' ? 'expired' : count === 1 ? unit.slice(0, -1) : unit;
  return (
    <Chip tone={unit === 'hours' ? 'muted' : 'warn'}>
      <ProIcon name="clock" size={12} />
      {t(`team.fileShare.left.${key}`, { count })}
    </Chip>
  );
}
