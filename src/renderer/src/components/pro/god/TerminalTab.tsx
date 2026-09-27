/**
 * Terminal: the orchestrator's real session. PtyTerminalView is the terminal
 * itself (xterm, the pool, the parser, recovery) and is not forked; it is
 * mounted with `chrome="pro"`, which leaves its own toolbar undrawn, and the
 * toolbar here is the kit's: a status dot, the session behind a copy
 * control in the technical rendering, and the text size controls (the
 * ⌘+ / ⌘- / ⌘0 keys still work, PtyTerminalView listens for them).
 *
 * Under the terminal sits the composer: THE ONE the agent room mounts
 * (pro/Composer), on the same draft and the same queue the Agents grid's
 * prompt bar writes (store.drafts, store.enqueueMessage), so a message typed
 * here and one typed there are one channel.
 *
 * 0.5.2 (founder, 8 Sep 2026: "the Queue message area UI for God Orchestrator
 * input area is different than other agents. Other agents have the one that
 * we want on God Orchestrator as well."): this tab carried its own fork of the
 * composer since phase 3 (6b5fdbd1), and the fork never received phase 7. Two
 * lines that did not grow, a wrapping strip of chips for the queue, no Send
 * now, no inline edit, no Steer, the key rule unwritten, and a send that never
 * reached the sent log, so the orchestrator's own thread in the Inbox missed
 * everything typed here. The fork is gone. Any change to the composer lands on
 * the orchestrator and the agents alike, because there is one component.
 */
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent } from '@/store/store';
import { usePtyParser } from '@/hooks/usePtyParser';
import { Composer } from '../Composer';
import { PtyTerminalView } from '../../PtyTerminalView';
import { terminalInstanceKey } from '../../terminalRecovery';
import {
  MAX_TERMINAL_FONT_SIZE, MIN_TERMINAL_FONT_SIZE, DEFAULT_TERMINAL_FONT_SIZE,
  getTerminalFontSize, setTerminalFontSize, useTerminalFontSize
} from '../../terminalFontSize';
import { Btn, IconBtn, StatusDot } from '../ui';
import { useTechnical } from '../depth';
import { CopyBtn, EmptyNote, monoText } from './pieces';

export function TerminalTab({ agent }: { agent: Agent }) {
  const { t } = useTranslation();
  const technical = useTechnical();
  const updateAgent = useStore((s) => s.updateAgent);
  const fullscreenAgentId = useStore((s) => s.fullscreenAgentId);
  const setFullscreen = useStore((s) => s.setFullscreen);
  const onPtyStream = usePtyParser(agent.id);
  const fontSize = useTerminalFontSize();
  // The real session id (the registry's), for a bug report. Read only in the
  // technical rendering; the simple one shows the dot and the word.
  const [sessionId, setSessionId] = useState<string | null>(null);
  useEffect(() => {
    if (!technical) return;
    let alive = true;
    window.cth.hiveRegistry()
      .then((r) => { if (alive) setSessionId(r.agents[agent.id]?.sessionId ?? null); })
      .catch(() => { /* no registry yet */ });
    return () => { alive = false; };
  }, [agent.id, agent.ptyId, technical]);

  if (fullscreenAgentId === agent.id) {
    // The Classic focus overlay holds the pty; two xterms on one pty fight
    // over its size. Offer the way back rather than a second terminal.
    return (
      <EmptyNote>
        <span>{t('pro.god.terminalElsewhere', { name: agent.name })}</span>
        <Btn size="sm" onClick={() => setFullscreen(null)}>{t('pro.god.bringBack')}</Btn>
      </EmptyNote>
    );
  }
  if (!agent.ptyId) return <EmptyNote>{t('pro.god.noSession', { name: agent.name })}</EmptyNote>;

  const ptyId = agent.ptyId;
  const id = sessionId ?? ptyId;
  const zoom = (delta: number) => setTerminalFontSize(getTerminalFontSize() + delta);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '5px 18px', fontSize: 11.5, color: 'var(--cth-ink-500)', flexShrink: 0 }}>
        <StatusDot status={agent.status} />
        <span>{t('pro.god.session')}</span>
        {technical && (
          <>
            <span style={{ ...monoText, fontSize: 11, color: 'var(--cth-ink-700)' }} title={id}>{id.slice(0, 12)}</span>
            <CopyBtn value={id} title={t('pro.god.copySession')} size={22} />
          </>
        )}
        <span style={{ flex: 1 }} />
        <IconBtn name="minus" size={24} title={t('pro.god.textSmaller')} disabled={fontSize <= MIN_TERMINAL_FONT_SIZE} onClick={() => zoom(-1)} />
        <button
          type="button" onClick={() => setTerminalFontSize(DEFAULT_TERMINAL_FONT_SIZE)} title={t('pro.god.textReset')}
          style={{ height: 24, padding: '0 6px', borderRadius: 7, border: 'none', background: 'transparent', color: 'var(--cth-ink-500)', font: 'inherit', fontSize: 11, fontFamily: 'var(--cth-font-mono)', cursor: 'pointer' }}
        >{fontSize}px</button>
        <IconBtn name="plus" size={24} title={t('pro.god.textLarger')} disabled={fontSize >= MAX_TERMINAL_FONT_SIZE} onClick={() => zoom(1)} />
      </div>
      <div style={{ flex: 1, minHeight: 0, display: 'flex' }}>
        <PtyTerminalView
          key={terminalInstanceKey(ptyId, agent.terminalGeneration)}
          ptyId={ptyId}
          provider={agent.provider}
          chrome="pro"
          embedded
          onStreamData={onPtyStream}
          onUserPrompt={(text) => {
            updateAgent(agent.id, { lastPrompt: text });
            if (text.trim().toLowerCase() === '/clear') {
              updateAgent(agent.id, { contextTokens: 0, contextLimit: undefined, progress: 0 });
            }
            void window.cth.historyAdd({ agentId: agent.id, cwd: agent.cwd, text });
          }}
        />
      </div>
      {/* No autoFocus: the terminal above owns the focus on this tab, and the
          agent room only focuses its composer on the Inbox tab for the same
          reason. */}
      <Composer agent={agent} />
    </>
  );
}
