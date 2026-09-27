import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelPanel } from './PixelPanel';
import { PixelBadge, labelKeyByStatus, StatusKind } from './PixelBadge';
import { useHasTerminalDraft } from './terminalPool';
import { SpritePortrait } from './SpritePortrait';
import { RealtimeMichaelToggle } from './RealtimeMichaelToggle';
import { CostHud } from '@/realtime/CostHud';
import { AccentColorName } from '@/design/tokens';
import { OfficeCharacterName } from '@/scene/office/castRoster';
import { AgentNameEditor } from './AgentNameEditor';
import { EngineBadge } from './pro/Engine';
import { ENGINE_NAME } from '@shared/engine';
import { modelWord } from '@/store/config';
import type { AgentProvider } from '@shared/agentProvider';
import type { AgentExit } from '@shared/agentExit';
import { Ago } from './agentRow/Ago';
import { ContextGauge, contextPercent, percentColor, segmentsOf } from './agentRow/ContextGauge';

export interface AgentCardProps {
  name: string;
  character: OfficeCharacterName;
  /** The hire one-liner. Office ignores it; Professional infers the agent's
   *  role glyph from it (DESIGN-PROFESSIONAL.md section 9). */
  description?: string;
  accent: AccentColorName;
  status: StatusKind;
  /** This agent's pty, if it has one. Only used to notice that the USER has
   *  unsent text on its prompt — which holds the agent's queue, and otherwise
   *  looks identical to an idle agent with nothing to do. */
  ptyId?: string;
  project: string;
  action?: string;
  /** Context gauge: 0..8 segments filled (session context ÷ context limit). */
  progress?: number;
  /** Live context size (tokens) — shown in the gauge tooltip. */
  contextTokens?: number;
  /** Context-window limit (tokens) assumed for the agent's model. */
  contextLimit?: number;
  selected?: boolean;
  /** Your clone — gets a persistent accent frame + BOSS tag so it stands out.
   *  (`isGod` / the `god` agent id stay as-is internally; this is display only.) */
  isGod?: boolean;
  onClick?: () => void;
  /** Persists an inline display-name edit; identity and hive paths stay unchanged. */
  onRename?: (name: string) => Promise<{ ok: boolean; error?: string }>;
  /** Number of ledger tasks this agent is actively DOING. Since 0.5.3 the card
   *  names the ticket on its live line instead of a sticky; the count is the
   *  ticket line's tooltip. Clicking the ticket id opens the first one. */
  doingCount?: number;
  onTaskNoteClick?: () => void;
  draggable?: boolean; // must sit on the <button> itself — Chromium won't start a drag on an ancestor from inside a form control
  /** Private note, kept on the record; the card no longer draws it (0.5.3,
   *  Pam's Classic cards: the strip card is 236 × 92, one size for every
   *  agent). The roster row and the editor still show it. */
  note?: string;
  /** Opens the note editor (the strip owns the editing overlay). */
  onEditNote?: () => void;
  /* ---- 0.5.3, F25: what the new card says that the old one did not ------ */
  provider?: AgentProvider;
  model?: string;
  /** The ticket the agent is on (store/taskLedger ticketOf): id on the live line. */
  ticketId?: string;
  ticketTitle?: string;
  /** When the agent last did anything (the activity digest), for the age. */
  lastTs?: number;
  /** Set when the process ended on its own (feature 18): the live line says so. */
  exit?: AgentExit;
  onHold?: boolean;
  /** Right click: the surface's agent menu. */
  onContextMenu?: (e: React.MouseEvent) => void;
  /** A counter; each new value opens the name editor (the menu's Rename). */
  editRequest?: number;
}

export const CARD_W = 236;
export const CARD_H = 92;

/**
 * THE STRIP CARD, 0.5.3 (Pam's Classic cards, hive/shared/design/sidebar-free/
 * final, card 2). One size for every agent: 236 × 92. A portrait tile on the
 * accent ground; the name in the display face with the BOSS tag and the
 * status chip beside it; the engine tile, the model and the context percent;
 * then the ticket id and the live action on one line with its age; and the
 * eight segment gauge along the bottom edge. The orchestrator's card is
 * lemon-light with a lemon border and stands proud of the row, as before.
 */
export function AgentCard({
  name, character, description, accent, status, ptyId, project, action, progress = 0,
  contextTokens, contextLimit, selected, isGod, onClick, onRename,
  doingCount = 0, onTaskNoteClick, draggable,
  provider, model, ticketId, ticketTitle, lastTs, exit, onHold, onContextMenu, editRequest
}: AgentCardProps) {
  const { t } = useTranslation();
  const [hover, setHover] = useState(false);
  const typing = useHasTerminalDraft(ptyId);

  // IDENTITY and SELECTION are two different things: god is marked by its
  // SURFACE, everyone shares the same 1px panel border, and selection is one
  // accent-independent ring, identical on every card, god included.
  const selectionRing = selected ? '0 0 0 2px var(--cth-ink-900)' : '';
  const lift = (isGod ? -2 : 0) - (hover ? 1 : 0) - (selected ? 1 : 0);
  const godSurface: React.CSSProperties = isGod
    ? { background: `var(--cth-${accent}-light)`, boxShadow: `inset 0 0 0 1px var(--cth-${accent})` }
    : {};
  const dropShadow = isGod
    ? `2px 3px 0 0 rgba(26,19,32,${hover ? 0.2 : 0.14})`
    : (hover ? '1px 2px 0 0 rgba(26,19,32,0.12)' : 'none');
  const outerShadow = [selectionRing, dropShadow === 'none' ? '' : dropShadow].filter(Boolean).join(', ') || 'none';

  // The gauge is the classic 0..8 `progress`; the percent is the session's own
  // arithmetic, the same two fields Pro's row prints. Null means no session.
  const pct = contextPercent(contextTokens, contextLimit);
  const segments = pct !== null ? segmentsOf(pct) : Math.min(8, Math.max(0, progress));
  const gaugeTitle = pct !== null ? t('agentRow.contextTitle', { pct }) : t('agentCard.contextGaugeTitle');
  const engine = ENGINE_NAME[provider ?? 'claude'];
  const word = modelWord(provider, model) ?? t('fullscreenTerminal.cliDefault');
  const crashed = exit?.verdict === 'crashed';
  // The live line: the ticket id, then what the agent is doing now, or the
  // ticket's title while it says nothing, or its status word (a waiting agent
  // with nothing to say is waiting, not idle). A dead agent says so.
  const liveText = exit
    ? `${crashed ? t('agentRow.crashed') : exit.verdict === 'finished' ? t('agentRow.finished') : t('agentRow.stopped')} · ${exit.exitCode !== undefined ? `exit ${exit.exitCode}` : exit.signal !== undefined ? `signal ${exit.signal}` : ''}`.replace(/ · $/, '')
    : (status !== 'idle' && action) ? action : (ticketTitle || action || t(labelKeyByStatus[status]));
  const ticketTip = doingCount > 1 ? t('agentCard.doingTasksPlural', { count: doingCount }) : doingCount === 1 ? t('agentCard.doingTasks', { count: doingCount }) : ticketTitle;

  return (
    <div
      role="button"
      tabIndex={0}
      data-agent-strip-card={name}
      onClick={onClick}
      onContextMenu={onContextMenu}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return;
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault();
          onClick?.();
        }
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      draggable={draggable}
      aria-current={selected ? 'true' : undefined}
      className="cth-titlebar-nodrag"
      style={{
        width: CARD_W, minWidth: CARD_W, height: CARD_H,
        padding: 0, border: 'none', background: 'transparent', cursor: 'pointer', textAlign: 'left',
        position: 'relative',
        transform: lift ? `translateY(${lift}px)` : 'none',
        boxShadow: outerShadow,
        transition: 'transform 90ms steps(2, end), box-shadow 90ms steps(2, end)'
      }}
    >
      <PixelPanel
        variant="default"
        style={{ height: '100%', padding: '6px 8px 8px', ...godSurface }}
        noPadding
      >
        <div style={{ display: 'flex', gap: 8, height: '100%' }}>
          {/* Portrait tile — vertically centred so the card reads calm and even. */}
          <div style={{
            width: 36, height: 56, alignSelf: 'center',
            background: isGod ? 'var(--cth-paper-100)' : `var(--cth-${accent}-light)`,
            boxShadow: `inset 0 0 0 1px var(--cth-ink-${isGod ? '300' : '100'})`,
            display: 'flex', alignItems: 'flex-start', justifyContent: 'center', overflow: 'hidden',
            flexShrink: 0
          }}>
            <SpritePortrait character={character} scale={2} description={description} isGod={isGod} status={status} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
            {/* Line 1: name, BOSS, 1:1, the status chip. */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, height: 14 }}>
              {onRename ? (
                <AgentNameEditor name={name} onCommit={onRename} uppercase fontSize={8} editRequest={editRequest} pencil={false} />
              ) : (
                <span style={{
                  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '13px',
                  color: 'var(--cth-ink-900)', flex: 1, minWidth: 0,
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis'
                }}>{name.toUpperCase()}</span>
              )}
              {isGod && (
                <span data-boss style={{
                  fontFamily: 'var(--cth-font-display)', fontSize: 7, lineHeight: '11px',
                  background: `var(--cth-${accent})`, color: 'var(--cth-ink-900)',
                  padding: '1px 4px 0', flexShrink: 0
                }}>{t('agentCard.boss')}</span>
              )}
              {onHold && (
                <span data-hold title={t('agentRow.oneOnOne')} style={{
                  fontSize: 9, lineHeight: '12px', padding: '0 3px', flexShrink: 0,
                  background: 'var(--cth-cream-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)', color: 'var(--cth-ink-500)'
                }}>1:1</span>
              )}
              {/* flexShrink:0: the chip is a fixed 2-to-5 character thing; when
                  it was allowed to shrink, the browser resolved the overflow by
                  eating the NAME instead. */}
              {/* The chip at card scale: the orchestrator's row holds NAME, BOSS
                  and the chip in 176px, and the chip's default padding took
                  the name down to "MICHA…". Same chip, tighter box. */}
              <PixelBadge status={typing ? 'typing' : status} style={{ flexShrink: 0, marginLeft: 'auto', padding: '1px 5px 0', gap: 4, fontSize: 10.5, lineHeight: '14px' }} />
            </div>
            {/* Line 2: engine tile, model, context percent. */}
            <div data-engine-line style={{ display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, height: 14, fontSize: 10.5, color: 'var(--cth-ink-500)' }}>
              <EngineBadge provider={provider} size={13} title={`${engine} · ${word}`} />
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{word}</span>
              {pct !== null && (
                <span data-context-pct title={gaugeTitle} style={{ flexShrink: 0, fontVariantNumeric: 'tabular-nums', fontWeight: 500, color: percentColor(pct) }}>{pct}%</span>
              )}
            </div>
            {/* Line 3: the ticket id and the live action, its age at the end.
                A crash takes the whole line in coral. */}
            <div
              data-live-line
              title={exit ? liveText : `${project}${action ? `: ${action}` : ''}`}
              style={{
                display: 'flex', alignItems: 'center', gap: 5, minWidth: 0, height: 14,
                fontSize: 11, lineHeight: '14px',
                color: exit ? 'var(--cth-coral)' : 'var(--cth-ink-500)'
              }}
            >
              {!exit && ticketId && (
                <span
                  data-ticket={ticketId} title={ticketTip}
                  onClick={(e) => { if (onTaskNoteClick) { e.stopPropagation(); onTaskNoteClick(); } }}
                  style={{ flexShrink: 0, fontFamily: 'var(--cth-font-mono, ui-monospace, Menlo, monospace)', fontSize: 10, color: 'var(--cth-ink-500)', cursor: onTaskNoteClick ? 'pointer' : undefined }}
                >{ticketId}</span>
              )}
              <span style={{ flex: 1, minWidth: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{liveText}</span>
              {!exit && <Ago ts={lastTs} style={{ fontSize: 10 }} />}
            </div>
            {/* God: voice on its own compact row, above the gauge as before. */}
            {isGod && (
              <div
                style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0, overflow: 'hidden', height: 14 }}
                onClick={(e) => e.stopPropagation()}
              >
                <RealtimeMichaelToggle />
                <CostHud compact />
              </div>
            )}
            {/* The gauge, pinned to the card's bottom edge. */}
            <div style={{ marginTop: 'auto', display: 'flex' }} title={gaugeTitle}>
              <ContextGauge segments={segments} accent={accent} height={4} />
            </div>
          </div>
        </div>
      </PixelPanel>
    </div>
  );
}
