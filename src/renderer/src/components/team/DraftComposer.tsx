/**
 * THE COMPOSER FOR A MESSAGE TO ANOTHER PERSON'S MACHINE.
 *
 * What it replaces was one bare text input: a string, sent on Enter, with the
 * ask buried wherever the writer happened to put it and no cost attached to
 * sending another one. `@shared/teamMessage` says what a cross user message is
 * allowed to be, and this is that contract drawn on a screen: a subject, a
 * Markdown body, what the message is FOR, and whether an answer is genuinely
 * needed. Nothing here decides any of those rules; it only shows them.
 *
 * THE REASON IS ALWAYS VISIBLE. Send is disabled exactly while
 * `validateMessage` returns something, and the sentence under the fields is
 * `explainViolations` of exactly those violations. A disabled button with no
 * reason is the thing this replaces, so the two can never come apart: the same
 * array drives both.
 *
 * A FILE IS A LINK, NEVER A PATH. A local path pasted into a message is
 * unreadable on the other machine, and the other machine is the only kind this
 * composer talks to. `ShareFileButton` publishes the file on a link that dies
 * in an hour, and the link lands in the body as Markdown, named after the file.
 * This composer never publishes anything itself: the button owns the confirm
 * and the only call to `fileShareCreate`, and it is watched through the same
 * `fileShareList` door any surface may read.
 *
 * THE TURN BUDGET IS SHOWN BEFORE IT BITES. `turnsLeft` counts both sides;
 * the caller counts entries through `turnsUsed`, so a failed send of your own
 * never spends a turn. At zero the composer closes and says
 * `CHANGE_IT_YOURSELF`, verbatim and untranslated like every rule string: the
 * person at the keyboard IS the human, and the agents' `ASK_THE_HUMAN` here
 * told them to go and ask themselves. Beside the sentence is the door it
 * names: Start a new thread rotates the pair's thread file in main (archived,
 * never deleted) and the budget is whole again, draft intact. The door is the
 * person's alone; an agent in the same dead end still gets `ASK_THE_HUMAN`
 * and no way to rotate.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  CHANGE_IT_YOURSELF, MESSAGE_ACTS, MESSAGE_LIMITS,
  explainViolations, turnsLeft, validateMessage,
  type DraftMessage
} from '@shared/teamMessage';
import type { FileShareView } from '@shared/fileShare';
import { Btn, Chip, FilterChip, Switch, inputStyle, textareaStyle } from '../pro/ui';
import { ShareFileButton } from './ShareFileButton';

/** `inform` preselected (0.4.11): the common message states something and
 *  wants nothing back, so the default asks nothing of anyone. Flipping the
 *  reply toggle turns an `inform` into the `ask` it really is. */
const EMPTY_DRAFT: DraftMessage = { subject: '', body: '', act: 'inform', expectsReply: false };

export interface DraftComposerProps {
  /** Whose thread this is, for the placeholder. First name is enough. */
  mateName: string;
  /** Their orchestrator's name, for the placeholder. Item 10: this used to
   *  interpolate the GLOBAL `godName`, which is yours, so the box invited you
   *  to message your own agent on their behalf. Falls back to the generic
   *  word when the relay does not report one. */
  mateGodName: string;
  /** Entries already in this thread, both sides counted, straight from the
   *  thread store. The budget is on the conversation, not on either party. */
  threadEntries: number;
  /** True while a send is in flight. */
  sending?: boolean;
  /** No send door at all: the preview boards and the test harness. The
   *  composer says so rather than dropping the message on the floor. */
  canSend?: boolean;
  /** Resolves true when the message left, and only then is the draft cleared. */
  onSend: (draft: DraftMessage) => Promise<boolean>;
  /** The person's way out of a spent thread: main archives the pair's thread
   *  file and the budget is whole again. Resolves true when it rotated.
   *  Absent where there is no bridge (the boards, the preview harness), and
   *  the button is simply not drawn. */
  onStartNewThread?: () => Promise<boolean>;
}

/**
 * A published share as the one thing that may travel: a Markdown link.
 *
 * The brackets are stripped from the label rather than escaped, because a file
 * name with a bracket in it is rare and a half escaped link that renders as
 * literal punctuation is worse than a name missing one character.
 */
export function shareLinkMarkdown(share: { name: string; url: string }): string {
  const label = String(share.name ?? '').replace(/[[\]]/g, ' ').replace(/\s+/g, ' ').trim() || 'file';
  return `[${label}](${share.url})`;
}

/** Append the links to whatever is already written, on their own line. */
export function withShareLinks(body: string, shares: readonly { name: string; url: string }[]): string {
  const links = shares.map(shareLinkMarkdown).join('\n');
  const head = String(body ?? '').replace(/\s+$/, '');
  return head === '' ? links : `${head}\n${links}`;
}

export function DraftComposer({ mateName, mateGodName, threadEntries, sending, canSend = true, onSend, onStartNewThread }: DraftComposerProps) {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<DraftMessage>(EMPTY_DRAFT);
  const [attaching, setAttaching] = useState(false);
  const [rotating, setRotating] = useState(false);
  const subjectRef = useRef<HTMLInputElement | null>(null);

  const left = turnsLeft(threadEntries);
  const spent = left === 0;
  const violations = useMemo(() => validateMessage(draft), [draft]);

  /* One array drives the disabled state and the sentence, in that order of
     precedence: a spent budget is not something a rewrite can fix, so it is
     said on its own rather than mixed into the rewrite instructions. The
     spent sentence is the PERSON'S (CHANGE_IT_YOURSELF), never the agents'
     ASK_THE_HUMAN: at this composer the human is the sender. */
  const reason = spent
    ? CHANGE_IT_YOURSELF
    : !canSend
      ? t('team.thread.noRelay', { name: mateName })
      : explainViolations(violations);
  const blocked = spent || !canSend || violations.length > 0;

  /* After a rotation main empties the thread and pushes; `threadEntries` then
     falls to zero and the fields reopen on their own, DRAFT INTACT, subject
     included. The focus waits for that moment, because focusing an input
     that is still disabled does nothing. */
  useEffect(() => {
    if (rotating && !spent) {
      setRotating(false);
      subjectRef.current?.focus();
    }
  }, [rotating, spent]);

  const startNew = (): void => {
    if (!onStartNewThread || rotating) return;
    setRotating(true);
    void onStartNewThread().then((ok) => { if (!ok) setRotating(false); });
  };

  const addShare = (share: FileShareView): void => {
    if (!share.url) return; // the tunnel could not publish it; never write an empty link
    setDraft((d) => ({ ...d, body: withShareLinks(d.body, [share]) }));
  };

  const send = (): void => {
    if (blocked || sending) return;
    void onSend(draft).then((sent) => { if (sent) { setDraft(EMPTY_DRAFT); setAttaching(false); } });
  };
  /* Enter writes a newline, because the body is Markdown and a list is the
     shape most of these messages want. The modifier sends. */
  const onKey = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); send(); }
  };

  return (
    <footer style={{
      padding: 12, boxShadow: 'inset 0 1px 0 var(--cth-ink-300)',
      display: 'flex', flexDirection: 'column', gap: 8, flexShrink: 0
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <input
          ref={subjectRef}
          aria-label={t('team.thread.subject')}
          value={draft.subject}
          disabled={spent || !canSend}
          onChange={(e) => setDraft({ ...draft, subject: e.target.value })}
          onKeyDown={onKey}
          placeholder={t('team.thread.subjectPlaceholder')}
          style={{ ...inputStyle, flex: 1, minWidth: 0 }} />
        <Counter n={draft.subject.trim().length} max={MESSAGE_LIMITS.subject} />
      </div>

      <textarea
        aria-label={t('team.thread.body')}
        value={draft.body}
        disabled={spent || !canSend}
        onChange={(e) => setDraft({ ...draft, body: e.target.value })}
        onKeyDown={onKey}
        placeholder={t('team.thread.composerPlaceholder', { name: mateName, theirGodName: mateGodName })}
        style={{ ...textareaStyle, minHeight: 76 }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
        {/* The four kinds as plain chips, from the contract, so a fifth can
            never be typed here. */}
        <div role="group" aria-label={t('team.thread.act')} style={{ display: 'inline-flex', gap: 4 }}>
          {MESSAGE_ACTS.map((a) => (
            <FilterChip key={a} on={draft.act === a} onClick={() => setDraft({ ...draft, act: a })}>
              {t(`team.thread.acts.${a}`)}
            </FilterChip>
          ))}
        </div>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--cth-ink-700)' }}>
          {/* Wanting a reply IS asking: turning the toggle on while the kind
              is still the default `inform` makes it an `ask`, so nobody has
              to know the taxonomy to send an honest message. An explicit kind
              (answer, handoff) is left alone. */}
          <Switch
            on={draft.expectsReply}
            onChange={(expectsReply) => setDraft((d) => ({ ...d, expectsReply, act: expectsReply && d.act === 'inform' ? 'ask' : d.act }))}
            label={t('team.thread.expectsReply')} />
          {t('team.thread.expectsReply')}
        </span>
        <span style={{ flex: 1 }} />
        <Counter n={draft.body.trim().length} max={MESSAGE_LIMITS.body} />
      </div>

      {reason && (
        <p role="status" style={{
          margin: 0, fontSize: 12, lineHeight: 1.45,
          color: spent ? 'var(--cth-status-blocked)' : 'var(--cth-ink-500)'
        }}>
          {reason}
        </p>
      )}

      {/* The door the spent sentence names, right under it. Kit button, so the
          chrome rules hold; the label is the one string here a person reads in
          their own language, while the sentence above stays a rule string. */}
      {spent && onStartNewThread && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Btn size="sm" onClick={startNew} disabled={rotating}>
            {t('team.thread.startNew')}
          </Btn>
        </div>
      )}

      {attaching && (
        <>
          <ShareFileButton onShared={addShare} />
          <span style={{ fontSize: 11.5, lineHeight: 1.45, color: 'var(--cth-ink-500)' }}>
            {t('team.thread.attachHint')}
          </span>
        </>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Btn size="sm" onClick={() => setAttaching((v) => !v)} disabled={spent || !canSend}>
          {attaching ? t('team.thread.attachHide') : t('team.thread.attach')}
        </Btn>
        <span style={{ flex: 1 }} />
        <Btn kind="primary" disabled={blocked || !!sending} onClick={send} title={t('team.thread.sendHint')}>
          {t('team.thread.send')}
        </Btn>
      </div>
    </footer>
  );
}

/** Characters used against the cap, in the mono face so the two numbers line
 *  up as they climb. Over the cap it turns, which is the same moment
 *  `validateMessage` starts refusing the draft. */
function Counter({ n, max }: { n: number; max: number }) {
  return (
    <Chip tone={n > max ? 'bad' : 'muted'} style={{ fontFamily: 'var(--cth-font-mono)' }}>
      {n}/{max}
    </Chip>
  );
}

/* The composer used to WATCH the share store on a one second interval while
   the attach panel was open, diffing each list against a baseline to work out
   which row was new. That was the honest thing to build at the time, because
   `ShareFileButton` had no way to say what it had just made and this component
   was not allowed to change it. It was also racy: two shares published in the
   same second, or one made in another window, are indistinguishable in a list.

   The button now takes `onShared` and hands back the exact share it created, so
   the poll is gone. Kept as a note because "why is there no watcher here" is a
   reasonable question to ask of a file that reads a store it does not own. */
