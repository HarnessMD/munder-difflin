/**
 * THE PRO COMPOSER (v0.4.9 phase 2, decision D10's Inbox): one box under the
 * agent room, two ways to reach the agent, both real doors the app already
 * has:
 *   Send   → store.enqueueMessage: parks in the agent's queue and is typed
 *            into its terminal the moment the session is idle (useHive's
 *            drain loop); the queue list above shows what is waiting, each
 *            row with Send now (releaseQueuedMessage) and Remove.
 *   Steer  → window.cth.controlSteer: lands on the agent's NEXT turn without
 *            waiting for idle (the control registry in main).
 * Attachments use the same "Attached files:" convention as the Classic
 * composer and the Slack inbound path, so agents Read the files directly.
 * The draft lives in the store keyed by agent, as before, so switching agents
 * never eats typed text.
 *
 * PHASE 7 (founder, 3 Sep 2026: "the queue area is a little bigger and the
 * input area is reworked"):
 *
 *   the queue    was a wrapping strip of 11.5px chips, each message on one
 *                short line, the whole thing growing sideways until it pushed
 *                the input off the bottom of a tall queue. It is now a listed
 *                panel: one row per message, each with room to read it, and a
 *                bounded scroll (QUEUE_MAX_H) so a queue of twenty costs the
 *                same height as a queue of four.
 *   the input    three lines instead of two, and it GROWS with what is typed
 *                up to INPUT_MAX_H, because the box was two lines tall for a
 *                message that is routinely a paragraph. The control row is
 *                split, doors on the left and the send decision on the right,
 *                and the key rule (Enter sends, Shift and Enter for a line)
 *                is now written on screen instead of being folklore.
 *   voice        see VoiceButton below.
 *
 * WHAT MUST NOT MOVE while any of that is reworked: noteHumanSend and
 * settleHumanSend. A steer never touches the queue, and a queued message
 * leaves the queue the moment it is delivered, so the durable `sentLog` is the
 * ONLY record that the person sent anything at all. Without these two calls a
 * delivered message disappears out of the thread, which is the exact bug the
 * previous commit fixed.
 */
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useTranslation } from 'react-i18next';
import { useStore, type Agent, type QueuedMessage } from '@/store/store';
import { collectDroppedAttachments } from '@shared/dropAttachments';
import { DropZone } from './dropZone';
import { attachmentsFromPaste } from '../pasteAttachments';
import { freeflowRecorder, useFreeflow } from '@/freeflow/recorder';
import { ProIcon } from './icons';
import { Btn, Chip, IconBtn, Seg, fmtWhen, monoInputStyle, proToast } from './ui';
import { isComposingKey } from '@shared/imeGuard';
import { saveGroqKey } from '@/voice/keyEntry';
import { attachWants, type AttachWant } from '@shared/attachDialog';
import { inferAgentProvider } from '@shared/agentProvider';
import { takesInputMidTurn } from '@/hooks/queueDelivery';

const ATTACH_TITLE = { any: 'pro.agents.attachAny', files: 'pro.agents.attach', folders: 'pro.agents.attachFolder' } as const;

const EMPTY_QUEUE: QueuedMessage[] = [];
type Mode = 'send' | 'steer';

/** The queue panel scrolls past this. Four rows are visible at once, which is
 *  the point where a longer queue stops being a list and becomes a backlog. */
const QUEUE_MAX_H = 136;
/** The input grows with the text to here, then scrolls. */
const INPUT_MIN_H = 62;
const INPUT_MAX_H = 168;

/** `holdKey` and `setupPanel` come from the agent screen (batch 2), which
 *  reads the CLI setup state from the terminal pool; the composer itself stays
 *  free of the pool so it loads without a terminal. */
export function Composer({ agent, autoFocus, holdKey = null, setupPanel }: { agent: Agent; autoFocus?: boolean; holdKey?: string | null; setupPanel?: ReactNode }) {
  const { t, i18n } = useTranslation();
  const queue = useStore((s) => s.messageQueues[agent.id]) ?? EMPTY_QUEUE;
  const enqueueMessage = useStore((s) => s.enqueueMessage);
  const removeQueuedMessage = useStore((s) => s.removeQueuedMessage);
  const releaseQueuedMessage = useStore((s) => s.releaseQueuedMessage);
  const noteHumanSend = useStore((s) => s.noteHumanSend);
  const settleHumanSend = useStore((s) => s.settleHumanSend);
  const text = useStore((s) => s.drafts[agent.id] ?? '');
  const setDraft = useStore((s) => s.setDraft);
  const ff = useFreeflow();
  const recording = ff.targetAgentId === agent.id && ff.status === 'recording';
  const transcribing = ff.targetAgentId === agent.id && ff.status === 'transcribing';
  const updateQueuedMessage = useStore((s) => s.updateQueuedMessage);
  const setQueuedMessageEditing = useStore((s) => s.setQueuedMessageEditing);
  const [mode, setMode] = useState<Mode>('send');
  const [files, setFiles] = useState<{ path: string; name: string }[]>([]);
  const [editId, setEditId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const ref = useRef<HTMLTextAreaElement | null>(null);

  // Grow to fit what is typed. Reset to auto first or the box can only ever get
  // taller, never shorter again after a paste is deleted.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, INPUT_MIN_H), INPUT_MAX_H)}px`;
  }, [text, files.length]);

  // Batch 2 (founder, 24 Sep 2026: "until installed the queue send button
  // should be disabled"): while the CLI is missing, installing or signing in,
  // the terminal is not the agent's, so nothing is sent or queued into it.
  const canSend = (!!text.trim() || files.length > 0) && !holdKey;
  const body = () => (files.length
    ? (text.trim() ? `${text}\n\nAttached files:\n` : 'Attached files:\n') + files.map((f) => `- ${f.path} (${f.name})`).join('\n')
    : text);

  const submit = async () => {
    if (!canSend) return;
    if (mode === 'steer') {
      // A steer is recorded the same way a queued send is, and settled the
      // moment the control registry answers. It never touches the queue, so
      // without this row the thread would show every message the person sent
      // EXCEPT the ones they sent to an agent that was mid turn.
      const id = `steer-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
      const text = body();
      noteHumanSend(agent.id, { id, text, ts: Date.now(), status: 'queued' });
      const snap = await window.cth.controlSteer(agent.id, text).catch(() => null);
      settleHumanSend(agent.id, id, snap ? 'sent' : 'failed');
      if (!snap) { proToast(t('pro.room.steerFailed'), { tone: 'bad' }); return; }
      proToast(t('pro.room.steered', { name: agent.name }));
    } else {
      enqueueMessage(agent.id, body(), { fromHuman: true });
      void window.cth.trackMessageSent?.('composer');
    }
    setDraft(agent.id, '');
    setFiles([]);
  };
  // ONE door onto the files list for both the paperclip and a drop, so a
  // dropped screenshot is deduped and bodied exactly like a picked file.
  const addFiles = (incoming: { path: string; name: string }[]) =>
    setFiles((prev) => {
      const fresh = collectDroppedAttachments(incoming, prev.map((p) => p.path));
      return fresh.length ? [...prev, ...fresh] : prev;
    });
  const attach = async (want: AttachWant) => {
    const res = await window.cth.attachFiles(want);
    if (res.ok) addFiles(res.files);
  };

  const beginEdit = (m: QueuedMessage) => {
    // One editor at a time: switching rows releases the previous hold first.
    if (editId && editId !== m.id) setQueuedMessageEditing(agent.id, editId, false);
    setEditId(m.id);
    setEditText(m.text);
    setQueuedMessageEditing(agent.id, m.id, true);
  };
  const endEdit = (save: boolean) => {
    if (!editId) return;
    if (save && editText.trim()) updateQueuedMessage(agent.id, editId, editText);
    else setQueuedMessageEditing(agent.id, editId, false);
    setEditId(null);
  };
  // The hold must not outlive the editor: release it when this composer
  // unmounts mid-edit (agent switch), and drop the editor when the row was
  // removed underneath it (its × button, or a "send now" release elsewhere).
  const editRef = useRef<{ agentId: string; id: string } | null>(null);
  editRef.current = editId ? { agentId: agent.id, id: editId } : null;
  useEffect(() => () => {
    const held = editRef.current;
    if (held) useStore.getState().setQueuedMessageEditing(held.agentId, held.id, false);
  }, []);
  useEffect(() => {
    if (editId && !queue.some((m) => m.id === editId)) setEditId(null);
  }, [queue, editId]);
  // "Send now" on a queued row (0.5.2, founder 8 Sep 2026: "the send now
  // button does not work on queue message"). The release moves the row to the
  // front and lifts the delivery pause; the drain types it the moment the agent
  // is idle and never mid-turn (useHive effect #4: the idle gate is a safety
  // check that a manual release does not bypass). His orchestrator was mid-turn
  // for half an hour while he clicked, so nothing visible happened for as long
  // as the turn lasted, and the row said nothing. Now the click answers: the
  // toast says when the row goes, the row says it is next, and the title says
  // that a running turn is the Steer door's job.
  //
  // 25 Sep 2026 (founder): where the CLI takes input mid-turn (Claude Code),
  // Send now types it into the CLI at once and the CLI's own queue holds it;
  // it jumps the app's queue and leaves it once the CLI has it (useHive
  // dispatch, queueDelivery.canSendNowMidTurn). Other engines keep the above.
  const intoCli = takesInputMidTurn(inferAgentProvider(agent.command, agent.provider));
  const sendNow = (m: QueuedMessage) => {
    releaseQueuedMessage(agent.id, m.id, true);
    proToast(agent.status === 'idle'
      ? t('pro.room.sendNowIdle', { name: agent.name })
      : intoCli ? t('pro.room.sendNowCli', { name: agent.name }) : t('pro.room.sendNowBusy', { name: agent.name }));
  };
  const onKey = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key !== 'Enter' || e.shiftKey || e.nativeEvent.isComposing) return;
    e.preventDefault();
    void submit();
  };

  const hint = holdKey ? t(holdKey) : mode === 'steer' ? t('pro.room.hintSteer') : queue.length ? t('pro.room.hintQueued', { n: queue.length }) : t('pro.room.hintIdle');

  return (
    <div style={{ position: 'relative', borderTop: '1px solid var(--cth-ink-300)', padding: '10px 14px 12px', background: 'var(--cth-cream-50)', flexShrink: 0 }}>
      {/* One drop lane for every PRO composer, window-detected so the target
          covers queue panel AND input the moment a file drag is over the app.
          The chain and its limits live in dropZone.tsx. */}
      <DropZone onFiles={addFiles} />
      {setupPanel}
      {queue.length > 0 && (
        <div style={{ marginBottom: 8, border: '1px solid var(--cth-ink-300)', borderRadius: 10, background: 'var(--cth-cream-100)', overflow: 'hidden' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderBottom: '1px solid var(--cth-ink-300)', minWidth: 0 }}>
            <span style={{ fontSize: 10.5, letterSpacing: '0.06em', fontWeight: 600, textTransform: 'uppercase', color: 'var(--cth-ink-500)' }}>{t('pro.room.queued')}</span>
            <span style={{ fontFamily: 'var(--cth-font-figures)', fontSize: 11, color: 'var(--cth-ink-500)' }}>{queue.length}</span>
            <span style={{ flex: 1 }} />
            <span style={{ fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{t('pro.room.queueNote', { name: agent.name })}</span>
          </div>
          <div style={{ maxHeight: QUEUE_MAX_H, overflowY: 'auto' }}>
            {queue.map((m, i) => (
              <div key={m.id} style={{ display: 'flex', alignItems: m.id === editId ? 'flex-start' : 'center', gap: 8, padding: '6px 10px', fontSize: 12, color: 'var(--cth-ink-900)', borderTop: i === 0 ? undefined : '1px solid var(--cth-ink-300)', minWidth: 0 }}>
                <b style={{ fontFamily: 'var(--cth-font-figures)', fontSize: 11, fontWeight: 500, color: 'var(--cth-ink-500)', flexShrink: 0 }}>{i + 1}</b>
                {m.id === editId ? (
                  <>
                    {/* Inline editor (founder, 5 Sep 2026). While it is open the
                        drain holds this message (QueuedMessage.editing), so the
                        agent going idle mid-edit cannot send the old text.
                        Enter saves, Escape cancels, same key rule as the input. */}
                    <textarea
                      autoFocus
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); endEdit(true); }
                        if (e.key === 'Escape') { e.preventDefault(); endEdit(false); }
                      }}
                      rows={2}
                      aria-label={t('pro.room.editAria')}
                      style={{ flex: 1, minWidth: 0, boxSizing: 'border-box', font: 'inherit', fontSize: 12, lineHeight: 1.45, color: 'var(--cth-ink-900)', background: 'var(--cth-cream-50)', border: '1px solid var(--cth-accent-line)', borderRadius: 6, padding: '4px 6px', outline: 'none', resize: 'vertical' }}
                    />
                    <button type="button" onClick={() => endEdit(true)} disabled={!editText.trim()} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cth-accent-text)', font: 'inherit', fontSize: 11, fontWeight: 600, padding: 0, flexShrink: 0 }}>{t('pro.room.editSave')}</button>
                    <button type="button" onClick={() => endEdit(false)} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cth-ink-500)', font: 'inherit', fontSize: 11, padding: 0, flexShrink: 0 }}>{t('pro.room.editCancel')}</button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={m.text}>{m.text}</span>
                    <time style={{ fontFamily: 'var(--cth-font-figures)', color: 'var(--cth-ink-500)', fontSize: 10.5, flexShrink: 0 }}>{fmtWhen(m.ts, i18n.language)}</time>
                    <button type="button" onClick={() => beginEdit(m)} title={t('pro.room.edit')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cth-ink-500)', font: 'inherit', fontSize: 11, fontWeight: 600, padding: 0, flexShrink: 0 }}>{t('pro.room.edit')}</button>
                    {m.manual ? (
                      <span data-send-now-pending={m.id} title={intoCli ? t('pro.room.sendNowCliTitle', { name: agent.name }) : t('pro.room.sendNowTitle', { name: agent.name })} style={{ color: 'var(--cth-ink-500)', fontSize: 11, flexShrink: 0 }}>{m.now && intoCli ? t('pro.room.sendNowSending') : t('pro.room.sendNowNext')}</span>
                    ) : (
                      <button type="button" data-send-now={m.id} onClick={() => sendNow(m)} title={intoCli ? t('pro.room.sendNowCliTitle', { name: agent.name }) : t('pro.room.sendNowTitle', { name: agent.name })} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cth-accent-text)', font: 'inherit', fontSize: 11, fontWeight: 600, padding: 0, flexShrink: 0 }}>{t('pro.room.sendNow')}</button>
                    )}
                    <button type="button" onClick={() => { settleHumanSend(agent.id, m.id, 'dropped'); removeQueuedMessage(agent.id, m.id); }} aria-label={t('pro.room.remove')} title={t('pro.room.remove')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cth-ink-500)', font: 'inherit', padding: 0, flexShrink: 0 }}>×</button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
      <div style={{ border: '1px solid var(--cth-ink-300)', borderRadius: 10, background: 'var(--cth-cream-100)', padding: '8px 8px 6px 12px' }}>
        {/* Attachment badges sit on top of the input. The name is clipped to a
            few characters (founder, 5 Sep 2026) — the full path is the title. */}
        {files.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 6 }}>
            {files.map((f) => (
              <Chip key={f.path} title={f.path}>
                <ProIcon name="clip" size={11} />
                <span style={{ maxWidth: 110, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis' }}>{f.name}</span>
                <button type="button" onClick={() => setFiles((p) => p.filter((x) => x.path !== f.path))} aria-label={t('queueComposer.removeAttachment')} style={{ border: 'none', background: 'none', cursor: 'pointer', color: 'var(--cth-ink-500)', padding: 0, font: 'inherit' }}>×</button>
              </Chip>
            ))}
          </div>
        )}
        <textarea
          ref={ref}
          data-freeflow-target
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setDraft(agent.id, e.target.value)}
          onKeyDown={onKey}
          // 0.5.3, bug 8: a pasted screenshot or copied file becomes an
          // attachment through the same door a drop and the paperclip use.
          onPaste={(e) => { void attachmentsFromPaste(e).then((a) => { if (a.length) addFiles(a); }); }}
          rows={3}
          placeholder={recording ? t('queueComposer.recording') : transcribing ? t('queueComposer.transcribing') : mode === 'steer' ? t('pro.room.steerPlaceholder', { name: agent.name }) : t('pro.room.placeholder', { name: agent.name })}
          aria-label={t('pro.room.placeholder', { name: agent.name })}
          style={{ width: '100%', boxSizing: 'border-box', border: 'none', background: 'transparent', outline: 'none', resize: 'none', font: 'inherit', fontSize: 13, lineHeight: 1.45, color: 'var(--cth-ink-900)', minHeight: INPUT_MIN_H, maxHeight: INPUT_MAX_H, overflowY: 'auto' }}
        />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
          {/* Files and folders (0.5.3, I8): one button on the Mac, one per kind
              where the picker cannot take both. */}
          {attachWants(window.cth.platform).map((w) => (
            <IconBtn key={w} name={w === 'folders' ? 'folder' : 'clip'} title={t(ATTACH_TITLE[w])} onClick={() => { void attach(w); }} />
          ))}
          <VoiceButton agentId={agent.id} />
          <span style={{ fontSize: 10.5, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{t('pro.room.keyHint')}</span>
          <span style={{ flex: 1 }} />
          <span style={{ fontSize: 11, color: 'var(--cth-ink-500)', whiteSpace: 'nowrap' }}>{hint}</span>
          <Seg value={mode} onChange={setMode} ariaLabel={t('pro.room.modeLabel')} options={[{ value: 'send', label: t('pro.room.send') }, { value: 'steer', label: t('pro.room.steer') }]} />
          <Btn kind="primary" size="sm" onClick={() => { void submit(); }} disabled={!canSend} title={holdKey ? t(holdKey) : undefined} dataAttrs={{ 'data-composer-send': holdKey ? 'held' : 'ready' }} style={{ height: 28 }}>
            <ProIcon name="send" size={13} />{mode === 'steer' ? t('pro.room.steer') : t('pro.room.send')}
          </Btn>
        </div>
      </div>
    </div>
  );
}

/* ---- voice ---------------------------------------------------------------
 * v0.4.9 phase 7.2. The mic used to be a plain enabled button whenever Free
 * Flow was switched on, whether or not a Groq key existed. Clicking it with no
 * key OPENED THE MICROPHONE, recorded a clip, uploaded it, and only then
 * failed, so the person paid a permission prompt for an error message. Both
 * PRO composers had that button; both now share this one.
 *
 * No key is a SETUP state, not a failure: the control is disabled, and beside
 * it sits the way out. The panel says the three things that decide whether
 * someone bothers, and none of them were written down anywhere in PRO: that
 * the key is free, where to get it, and that there is a hold to talk key so
 * dictation is not a round trip to a button. The Settings button lands on the
 * Voice tab, which is where the key field is, rather than at the top of
 * Settings with the person hunting.
 *
 * A portal, and not an absolutely positioned child, because the orchestrator's
 * card clips its overflow: an in flow panel would be cut off there.
 */
const HINT_W = 272;
const HINT_GAP = 8;
/** Estimated panel height, used only to decide above or below. */
const HINT_H = 268;
const GROQ_KEYS_URL = 'https://console.groq.com/keys';

export function VoiceButton({ agentId }: { agentId: string }) {
  const { t } = useTranslation();
  // Presence only. The key itself never enters the renderer store.
  const hasGroqKey = useStore((s) => s.hasGroqKey);
  const canDictate = useStore((s) => s.canDictate);
  const ff = useFreeflow();
  const mine = ff.targetAgentId === agentId;
  const recording = mine && ff.status === 'recording';
  const transcribing = mine && ff.status === 'transcribing';
  // One recorder for the app, so another agent's clip blocks this button too.
  const busyElsewhere = ff.status !== 'idle' && !mine;
  // 0.5.3, F16: a local engine opens the mic without any key.
  const noKey = !hasGroqKey && !canDictate;
  // The anchor is the mic's own wrapper: the mic is the door to the card.
  const anchorRef = useRef<HTMLSpanElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const [at, setAt] = useState<{ left: number; top: number } | null>(null);
  // 0.4.11: the key box sits in the card itself (founder, 6 Sep 2026: "just
  // show the groq api key input box"). The draft is local and short lived; the
  // save hands it to main and the card closes once presence flips.
  const [keyDraft, setKeyDraft] = useState('');
  const [keyNote, setKeyNote] = useState('');
  const [saving, setSaving] = useState(false);
  const saveKey = async (): Promise<void> => {
    if (!keyDraft.trim() || saving) return;
    setSaving(true);
    setKeyNote('');
    const r = await saveGroqKey(keyDraft);
    setSaving(false);
    if (r.ok) { setKeyDraft(''); setAt(null); proToast(t('pro.voice.keySaved')); return; }
    setKeyNote(t('pro.voice.keyFailed'));
  };

  useEffect(() => {
    if (!at) return;
    const away = (e: globalThis.MouseEvent) => {
      const node = e.target as Node;
      if (anchorRef.current?.contains(node) || panelRef.current?.contains(node)) return;
      setAt(null);
    };
    const esc = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setAt(null); };
    const reflow = () => setAt(null);
    document.addEventListener('mousedown', away);
    document.addEventListener('keydown', esc);
    window.addEventListener('resize', reflow);
    window.addEventListener('scroll', reflow, true);
    return () => {
      document.removeEventListener('mousedown', away);
      document.removeEventListener('keydown', esc);
      window.removeEventListener('resize', reflow);
      window.removeEventListener('scroll', reflow, true);
    };
  }, [at]);

  const title = noKey ? t('pro.voice.noKey')
    : recording ? t('pro.voice.stop')
    : transcribing ? t('pro.voice.transcribing')
    : busyElsewhere ? t('pro.voice.busy')
    : t('pro.voice.title');

  const toggleHint = () => {
    if (at) { setAt(null); return; }
    const r = anchorRef.current?.getBoundingClientRect();
    if (!r) return;
    // Prefer above: both composers sit low on their screen.
    const above = r.top - HINT_GAP - HINT_H;
    const top = above >= 8 ? above : Math.min(r.bottom + HINT_GAP, window.innerHeight - HINT_H - 8);
    setAt({ left: Math.max(8, Math.min(r.left, window.innerWidth - HINT_W - 8)), top: Math.max(8, top) });
  };

  const openVoiceSettings = () => {
    setAt(null);
    window.dispatchEvent(new CustomEvent('cth:open-settings', { detail: { section: 'Voice' } }));
  };

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 2, flexShrink: 0 }}>
      {/* Chromium suppresses the tooltip on a disabled button, so the title
          lives on a wrapper that is never disabled. Without it the one control
          that most needs to explain itself is the one that stays silent. */}
      <span ref={anchorRef} title={title} style={{ display: 'inline-flex' }}>
        {/* Without a key the mic is NOT disabled (0.4.11, founder 6 Sep 2026:
            "the drop down modal that opens when user clicks on microphone"):
            a disabled button swallows the click that should open the card.
            It reads muted, and the handler never reaches the recorder while
            the key is missing. The question mark that used to sit beside it
            is gone; the mic is the door. */}
        <IconBtn
          name="mic"
          title={title}
          active={recording}
          disabled={!noKey && (transcribing || busyElsewhere)}
          style={noKey ? { opacity: 0.6 } : undefined}
          onClick={() => { if (noKey) { toggleHint(); return; } freeflowRecorder.toggle(agentId); }}
        />
      </span>
      {noKey && (
        <>
          {at && createPortal(
            <div
              ref={panelRef}
              role="dialog"
              aria-label={t('pro.voice.setupTitle')}
              onClick={(e) => e.stopPropagation()}
              style={{
                position: 'fixed', left: at.left, top: at.top, zIndex: 460, width: HINT_W, boxSizing: 'border-box',
                padding: '11px 13px', display: 'flex', flexDirection: 'column', gap: 7,
                background: 'var(--cth-cream-50)', border: '1px solid var(--cth-ink-300)', borderRadius: 10,
                boxShadow: 'var(--cth-shadow-hard)', fontFamily: 'var(--cth-font-ui)', fontSize: 11.5, lineHeight: 1.45,
                color: 'var(--cth-ink-900)', textAlign: 'start'
              }}
            >
              <span style={{ fontSize: 10.5, letterSpacing: '0.06em', textTransform: 'uppercase', fontWeight: 600, color: 'var(--cth-ink-500)' }}>{t('pro.voice.setupTitle')}</span>
              {/* The cost goes first. "Add an API key" reads as "this will bill
                  me", and that assumption is what stops people here. */}
              <span>{t('pro.voice.lead')}</span>
              <ol style={{ margin: 0, paddingInlineStart: 16, display: 'flex', flexDirection: 'column', gap: 3 }}>
                <li>
                  {t('pro.voice.s1')}{' '}
                  <a
                    href={GROQ_KEYS_URL}
                    onClick={(e) => { e.preventDefault(); void window.cth.openExternal(GROQ_KEYS_URL); }}
                    style={{ color: 'var(--cth-accent-text)' }}
                  >console.groq.com/keys</a>
                </li>
                <li>{t('pro.voice.s2')}</li>
                <li>{t('pro.voice.s3')}</li>
              </ol>
              {/* The key box, right where the steps point. Saving closes the
                  card: presence flips in the store and the mic lights up. */}
              <div data-groq-key-entry style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                <input
                  type="password"
                  value={keyDraft}
                  onChange={(e) => setKeyDraft(e.target.value)}
                  onKeyDown={(e) => { if (isComposingKey(e)) return; if (e.key === 'Enter') void saveKey(); }}
                  placeholder="gsk_…"
                  aria-label={t('settings.voice.groqKey')}
                  autoFocus
                  style={{ ...monoInputStyle, height: 28, flex: 1, minWidth: 0 }}
                />
                <Btn size="sm" kind="primary" onClick={() => { void saveKey(); }} disabled={!keyDraft.trim() || saving}>{t('settings.voice.save')}</Btn>
              </div>
              {keyNote && <span style={{ color: 'var(--cth-coral)' }}>{keyNote}</span>}
              <span style={{ color: 'var(--cth-ink-500)' }}>{t('pro.voice.shortcut')}</span>
              <Btn size="sm" onClick={openVoiceSettings} style={{ alignSelf: 'flex-start' }}>{t('pro.voice.openSettings')}</Btn>
            </div>,
            document.body
          )}
        </>
      )}
    </span>
  );
}
