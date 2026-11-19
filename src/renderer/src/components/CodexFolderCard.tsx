// Ported from Prozzta/guppyos 02d0d50b (MIT).
/**
 * A hive Codex agent whose folder has its own Codex settings waits for the
 * person's OK before it starts. The card sits over the agent's terminal where CliMissingCard
 * sits, in both looks, and is built the same way. Main holds the start and
 * names, per folder, the settings files it found (shared/codexFolders.ts); the
 * app never reads what is inside them. "allow this folder and start" records
 * the OK and starts the agent; "not now" closes the card and leaves the agent
 * stopped (reopening its terminal asks again). Folder and file names are shown
 * as found and never translated.
 *
 * A start held from Add Agent or the agent sheet has no terminal yet (no agent
 * is added), so the same card sits in the dialog in place of the error line
 * (`placement="dialog"`): Allow hands the start's answer back
 * (`onStarted`) and the dialog adds the agent; not now leaves the dialog as typed.
 */
import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { CodexFolderEntry, CodexHeldState } from '@shared/codexFolders';
import { PixelButton } from './PixelButton';

const overlay: CSSProperties = {
  position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
  padding: 16, background: 'var(--cth-paper-100)', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-700)',
  // As CliMissingCard: pointer events said out loud, and above every xterm layer.
  pointerEvents: 'auto', cursor: 'default', zIndex: 20, overflowY: 'auto',
};
const box: CSSProperties = {
  maxWidth: 560, width: '100%', display: 'flex', flexDirection: 'column', gap: 10, padding: 16,
  boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', background: 'var(--cth-cream-50)',
};
const code: CSSProperties = { fontFamily: 'var(--cth-font-mono)', fontSize: 12, color: 'var(--cth-ink-900)', overflowWrap: 'anywhere' };
// The pixel tag, as the dialog's own boxes.
const classicTag: CSSProperties = {
  fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px', padding: '0 5px', fontWeight: 400,
  color: 'var(--cth-ink-900)', background: 'var(--cth-peach-light)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', whiteSpace: 'nowrap',
};

/** The held start of this terminal, or null: asked once, then pushed by main. */
export function useCodexHeld(ptyId: string | undefined): CodexHeldState | null {
  const [state, setState] = useState<CodexHeldState | null>(null);
  useEffect(() => {
    if (!ptyId) { setState(null); return; }
    let live = true;
    void window.cth.codexHeldFolders(ptyId).then((s) => { if (live) setState(s); }, () => { /* no hold known */ });
    const off = window.cth.onCodexHeld(ptyId, (s) => { if (live) setState(s); });
    return () => { live = false; off(); };
  }, [ptyId]);
  return state;
}

/** What a card draws for a terminal: main's live hold, else the hold it showed when Allow was
 *  pressed. Main ends the hold (pushes null) before the start answers, so the kept one carries the
 *  card, its buttons off, until the answer, and after a refusal with its refused line. A start,
 *  not now or a new hold drops it. keep goes on onAllow; drop on onStarted and onNotNow. */
export function useCodexCard(ptyId: string | undefined): { state: CodexHeldState | null; keep: () => void; drop: () => void } {
  const live = useCodexHeld(ptyId);
  const [kept, setKept] = useState<{ ptyId: string; state: CodexHeldState } | null>(null);
  useEffect(() => { if (live) setKept(null); }, [live]);
  const state = live ?? (kept && kept.ptyId === ptyId ? kept.state : null);
  return {
    state,
    keep: () => { if (ptyId && state) setKept({ ptyId, state }); },
    drop: () => setKept(null),
  };
}

/** The words for config.toml and hooks.json, and for the files of rules/, agents/ and hooks/. */
const KIND: Record<string, string> = {
  'config.toml': 'codexLayer.kind.config', 'hooks.json': 'codexLayer.kind.hooks',
  rules: 'codexLayer.kind.rules', agents: 'codexLayer.kind.agents', hooks: 'codexLayer.kind.hookFiles',
};
const GROUPS = ['rules', 'agents', 'hooks'] as const;

/** The folder a listed file shares a row with: "rules/x", "rules/" (there but not listable) and a
 *  file named "rules" all go in the rules row; config.toml and hooks.json have none. */
function groupOf(file: string): string | null {
  const i = file.indexOf('/');
  const head = i > 0 ? file.slice(0, i) : file;
  return (GROUPS as readonly string[]).includes(head) ? head : null;
}

/** One .codex folder's rows: config.toml and hooks.json a row
 *  each with their words; the files of rules/, agents/ and hooks/ one row per folder, its words
 *  once; "and N more files" a row of its own at the end, as more counts the three together. */
function EntryRows({ entry }: { entry: CodexFolderEntry }) {
  const { t } = useTranslation();
  const words: CSSProperties = { color: 'var(--cth-ink-500)', fontSize: 12 };
  const li: CSSProperties = { display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap' };
  if (!entry.files.length) return <li style={li}><span style={{ ...words, color: 'var(--cth-ink-700)' }}>{t('codexLayer.unreadable')}</span></li>;
  const single = entry.files.filter((f) => !groupOf(f));
  return (
    <>
      {single.map((f) => (
        <li key={f} style={li}><code dir="ltr" style={code}>{f}</code>{KIND[f] && <span style={words}>{t(KIND[f])}</span>}</li>
      ))}
      {GROUPS.map((k) => {
        const files = entry.files.filter((f) => groupOf(f) === k);
        if (!files.length) return null;
        return (
          <li key={k} style={li}>
            <span style={{ display: 'inline-flex', gap: '4px 8px', flexWrap: 'wrap', alignItems: 'baseline' }}>
              {files.map((f) => <code key={f} dir="ltr" style={code}>{f}</code>)}
            </span>
            <span style={words}>{t(KIND[k])}</span>
          </li>
        );
      })}
      {entry.more > 0 && <li style={li}><span style={{ ...words, color: 'var(--cth-ink-700)' }}>{t('codexLayer.more', { count: entry.more })}</span></li>}
    </>
  );
}

/** What a start answers, direct or through Allow (the same spawn). */
export type CodexStartAnswer = Awaited<ReturnType<typeof window.cth.codexAllowFolder>>;

export function CodexFolderCard({ ptyId, agentName, state, placement = 'pane', onAllow, onStarted, onRefused, onNotNow }: {
  ptyId: string;
  agentName: string;
  state: CodexHeldState;
  /** 'pane' over the agent's terminal (default); 'dialog' the same box in the flow of a dialog,
   *  the dialog's full width, its file list capped so the buttons always show. */
  placement?: 'pane' | 'dialog';
  /** Allow was pressed; the start has not answered yet. */
  onAllow?: () => void;
  /** Allow started the agent: its answer, for a dialog to add the agent. */
  onStarted?: (res: CodexStartAnswer) => void;
  /** Allow answered with no start: refused (its line stays on the card), or held again. */
  onRefused?: () => void;
  /** not now was pressed. */
  onNotNow?: () => void;
}) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);
  const [closed, setClosed] = useState(false);
  const [refused, setRefused] = useState<string | null>(null);
  const buttonsRef = useRef<HTMLDivElement>(null);
  const dialog = placement === 'dialog';
  // In a dialog that scrolls (Classic Add Agent), allow and not now come into view as the card shows.
  useEffect(() => { if (dialog) buttonsRef.current?.scrollIntoView?.({ block: 'nearest' }); }, [dialog]);
  if (closed || !state.folders.length) return null;

  const allow = async () => {
    if (busy) return;
    setBusy(true); setRefused(null); onAllow?.();
    try {
      const r = await window.cth.codexAllowFolder(ptyId);
      if (r.ok) { onStarted?.(r); return; }
      // Held again (a worktree's own .codex): main pushes the new hold, which redraws the card.
      if (!r.codexFolders?.length) setRefused(r.error ?? 'refused');
      onRefused?.();
    } catch (e) {
      setRefused(e instanceof Error ? e.message : String(e));
      onRefused?.();
    } finally { setBusy(false); }
  };

  const card = (
      <div
        style={{ ...box, ...(dialog ? { maxWidth: 'none', boxSizing: 'border-box' } : {}) }}
        role="status"
        {...(dialog ? { 'data-codex-held': ptyId } : {})}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <span style={classicTag}>
            {t('codexLayer.tag')}
          </span>
          <span style={{ fontSize: 14, fontWeight: 600, color: 'var(--cth-ink-900)' }}>{t('codexLayer.title', { agent: agentName })}</span>
        </div>
        <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{t('codexLayer.body', { agent: agentName })}</span>
        {/* In a dialog only the file list scrolls when it is long; the words and buttons always show. */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, ...(dialog ? { maxHeight: 'min(240px, 32vh)', overflowY: 'auto' } : {}) }}>
          {state.folders.map((g) => (
            // One box per .codex folder Codex loads from: in a linked worktree, the worktree's and the main checkout's.
            <div key={g.folder} style={{ display: 'flex', flexDirection: 'column', gap: 4, padding: '8px 10px', background: 'var(--cth-paper-100)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)' }}>
              <span dir="ltr" style={{ ...code, fontSize: 11.5 }}>{g.folder}</span>
              <ul style={{ margin: 0, padding: 0, listStyle: 'none', display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12.5, lineHeight: 1.5, color: 'var(--cth-ink-900)' }}>
                <EntryRows entry={g} />
              </ul>
            </div>
          ))}
        </div>
        <span style={{ fontSize: 12.5, lineHeight: 1.45 }}>{t('codexLayer.trust')}</span>
        {refused && <span style={{ fontSize: 12 }}>{refused}</span>}
        <div ref={buttonsRef} style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <PixelButton variant="primary" size="sm" disabled={busy} onClick={() => void allow()} dataAttrs={{ 'data-codex-allow': 'true' }}>{t(state.folders.length > 1 ? 'codexLayer.allowAll' : 'codexLayer.allow')}</PixelButton>
          <PixelButton variant="ghost" size="sm" disabled={busy} onClick={() => { setClosed(true); onNotNow?.(); }}>{t('codexLayer.notNow')}</PixelButton>
        </div>
      </div>
  );
  if (dialog) return card;
  return (
    <div style={overlay} data-codex-held={ptyId}>
      {card}
    </div>
  );
}
