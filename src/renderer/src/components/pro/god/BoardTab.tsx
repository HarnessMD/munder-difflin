/**
 * Board: board.md, the shared plan, read only. The orchestrator is its sole
 * scribe (src/main/hive.ts seeds the file saying so), so the only write this
 * tab offers is a proposal sent to him: the same `hive:send` door the Inbox
 * uses, addressed to the god from 'human', with the act 'propose' the hive
 * README names for exactly this. The text is read through `hive:board`,
 * refreshed on every routed message and every few seconds besides, since a
 * board edit is a file write with no event of its own.
 */
import { useCallback, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { Agent } from '@/store/store';
import type { HarnessConfig } from '@/store/config';
import { MarkdownPreview } from '@/markdown/MarkdownPreview';
import { Btn, Chip, proToast } from '../ui';
import { ProIcon } from '../icons';
import { useTechnical } from '../depth';
import { CardH, CopyBtn, GodCard, GodGrid, Muted, monoText } from './pieces';

export function BoardTab({ agent, config }: { agent: Agent; config: HarnessConfig | null }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const [board, setBoard] = useState<string | null>(null);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [note, setNote] = useState<string | null>(null);

  const load = useCallback(() => {
    window.cth.hiveBoard().then((text) => setBoard(text)).catch(() => { /* keep the last text */ });
  }, []);
  useEffect(() => {
    load();
    const id = window.setInterval(load, 5_000);
    const off = window.cth.onHiveMessage?.(() => load());
    return () => { window.clearInterval(id); off?.(); };
  }, [load]);

  const propose = async () => {
    const body = draft.trim();
    if (!body || sending) return;
    setSending(true);
    setNote(null);
    const first = body.split('\n')[0].slice(0, 80);
    const res = await window.cth.hiveSend({ to: 'god', act: 'propose', subject: `Board proposal: ${first}`, body }, 'human')
      .catch((e) => ({ ok: false, error: String(e) }));
    if (res.ok) { setDraft(''); proToast(t('pro.god.board.sent', { name: agent.name }), { tone: 'ok' }); }
    else setNote(res.error ?? t('pro.sheet.failed'));
    setSending(false);
  };

  const path = config?.harnessHome ? `${config.harnessHome}/board.md` : null;

  return (
    <GodGrid columns={1}>
      <GodCard>
        <CardH right={<Chip tone="outline">{t('pro.god.board.scribe', { name: agent.name })}</Chip>}>{t('pro.god.board.title')}</CardH>
        {technical && path && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ ...monoText, fontSize: 11, color: 'var(--cth-ink-500)' }}>{path}</span>
            <CopyBtn value={path} title={t('pro.god.board.copyPath')} size={22} />
          </div>
        )}
        {board === null && <Muted>{t('pro.god.loading')}</Muted>}
        {board !== null && board.trim() === '' && <Muted>{t('pro.god.board.empty', { name: agent.name })}</Muted>}
        {board !== null && board.trim() !== '' && (
          <div style={{ fontSize: 13, lineHeight: 1.55, color: 'var(--cth-ink-900)', maxWidth: 820 }}>
            <MarkdownPreview source={board} variant="card" />
          </div>
        )}
      </GodCard>
      <GodCard>
        <CardH>{t('pro.god.board.propose')}</CardH>
        <Muted>{t('pro.god.board.proposeHint', { name: agent.name })}</Muted>
        <textarea
          value={draft} onChange={(e) => setDraft(e.target.value)} rows={3} disabled={sending}
          placeholder={t('pro.god.board.proposePlaceholder')}
          aria-label={t('pro.god.board.propose')}
          onKeyDown={(e) => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && !e.nativeEvent.isComposing) { e.preventDefault(); void propose(); } }}
          style={{ width: '100%', boxSizing: 'border-box', resize: 'vertical', font: 'inherit', fontSize: 13, padding: '8px 10px', borderRadius: 10, border: '1px solid var(--cth-ink-300)', background: 'var(--cth-cream-100)', color: 'var(--cth-ink-900)', outline: 'none', minHeight: 64 }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Btn kind="primary" size="sm" disabled={sending || !draft.trim()} onClick={() => { void propose(); }}>
            <ProIcon name="send" size={13} />{t('pro.god.board.send')}
          </Btn>
          {note && <span style={{ fontSize: 12, color: 'var(--cth-status-blocked)' }}>{note}</span>}
        </div>
      </GodCard>
    </GodGrid>
  );
}
