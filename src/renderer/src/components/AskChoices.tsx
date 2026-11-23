/**
 * The parts of an ask card that every surface draws the same way: the tag row, the bold headline, the options, and the
 * answered box. The ASK ME tab keeps its own frame, answer box and buttons.
 * The logic is humanQuestion.ts; an ask without options keeps today's answer box.
 */
import type { CSSProperties } from 'react';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { useStore } from '@/store/store';
import { MarkdownPreview } from '@/markdown/MarkdownPreview';
import { useRtl } from '@/i18n/useDirection';
import { openQuestion } from '@shared/humanAsk';
import type { HiveTask, HumanQA } from './TasksKanban';
import { compareByNewestAsk } from './askMeOrder';
import { composeAnswer, normalizeHumanQA, picksKey, splitHeadline, togglePick } from './humanQuestion';
import { fmtWhen } from './fmtWhen';

function tagStyle(background: string): CSSProperties {
  const face: CSSProperties = { fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px', padding: '0 5px' };
  return { ...face, display: 'inline-block', whiteSpace: 'nowrap', color: 'var(--cth-ink-900)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', background };
}

/** The kind (CHOOSE, QUESTION or ANSWERED), PICK ANY while several may be picked, and when it was asked. */
export function AskTags({ entry, answered }: { entry: HumanQA; answered?: boolean }) {
  const { t, i18n } = useTranslation();
  const choice = !!entry.options?.length;
  const kind = answered
    ? { text: t('askMe.answered'), bg: 'var(--cth-mint-light)' }
    : choice ? { text: t('askMe.kind.choose'), bg: 'var(--cth-lilac-light)' } : { text: t('askMe.kind.question'), bg: 'var(--cth-sky-light)' };
  const when = fmtWhen(entry.askedAt, i18n.language);
  return (
    <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
      <span style={tagStyle(kind.bg)}>{kind.text}</span>
      {choice && entry.multi && !answered && <span style={tagStyle('var(--cth-lilac-light)')}>{t('askMe.pickAny')}</span>}
      {when && <span style={{ fontSize: 11, color: 'var(--cth-ink-500)', fontFamily: 'var(--cth-font-ui)' }}>{t('askMe.asked', { when })}</span>}
    </div>
  );
}

/** The question: its first line as a bold headline, then the rest as markdown, as today. */
export function AskText({ q, size }: { q: string; size: number }) {
  const rtl = useRtl();
  const { headline, body } = splitHeadline(q);
  return (
    <div dir={rtl ? 'auto' : undefined} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: size, color: 'var(--cth-ink-900)' }}>
      {headline && <div style={{ fontWeight: 700 }}><MarkdownPreview source={headline} variant="card" /></div>}
      {body && <MarkdownPreview source={body} variant="card" />}
    </div>
  );
}

/** The options. A click only picks; the answer button sends. Answered: the picks keep a
 *  tick and the rest fade. Closed (under an unsent answer): all fade, the picks still shown. */
export function AskOptions({ entry, picked, onToggle, answered, closed, disabled }: {
  entry: HumanQA;
  picked: number[];
  onToggle?: (i: number) => void;
  answered?: boolean;
  closed?: boolean;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  const rtl = useRtl();
  const options = entry.options ?? [];
  if (!options.length) return null;
  return (
    <div role={entry.multi ? 'group' : 'radiogroup'} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      {options.map((o, i) => {
        const on = picked.includes(i);
        return (
          <button
            key={i}
            type="button"
            role={entry.multi ? 'checkbox' : 'radio'}
            aria-checked={on}
            disabled={disabled || answered || !onToggle}
            onClick={() => onToggle?.(i)}
            style={{
              display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%', textAlign: 'start',
              padding: '7px 9px', border: 'none', font: 'inherit', fontFamily: 'var(--cth-font-ui)', color: 'var(--cth-ink-900)',
              background: on ? 'var(--cth-mint-light)' : 'var(--cth-paper-100)',
              boxShadow: on ? 'inset 0 0 0 1.5px var(--cth-ink-500)' : 'inset 0 0 0 1px var(--cth-ink-300)',
              opacity: closed || (answered && !on) ? 0.6 : 1,
              cursor: disabled || answered || !onToggle ? 'default' : 'pointer',
            }}
          >
            <span style={{
              width: 14, height: 14, marginTop: 2, flexShrink: 0, borderRadius: entry.multi ? 0 : 7,
              boxShadow: 'inset 0 0 0 2px var(--cth-ink-500)', background: on ? 'var(--cth-mint)' : 'var(--cth-paper-100)',
            }} />
            <span dir={rtl ? 'auto' : undefined} style={{ minWidth: 0 }}>
              <b style={{ fontSize: 13, lineHeight: '18px' }}>{answered && on ? '✓ ' : ''}{o.label}</b>
              {entry.recommended === i && (
                <span style={{ ...tagStyle('var(--cth-lemon-light)'), marginInlineStart: 6, verticalAlign: 1 }}>{t('askMe.recommended')}</span>
              )}
              {o.detail && <small style={{ display: 'block', fontSize: 12, lineHeight: '17px', color: 'var(--cth-ink-700)' }}>{o.detail}</small>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** An answered ask: when, then the answer (the picks and any note) in a mint box. */
export function AskAnswered({ entry }: { entry: HumanQA }) {
  const { t, i18n } = useTranslation();
  const rtl = useRtl();
  const when = fmtWhen(entry.answeredAt, i18n.language);
  return (
    <div style={{
      padding: '7px 9px', background: 'var(--cth-mint-light)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
      display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13,
    }}>
      {when && <span style={{ fontSize: 11, color: 'var(--cth-ink-500)' }}>{t('askMe.answeredAt', { when })}</span>}
      <div dir={rtl ? 'auto' : undefined}><MarkdownPreview source={entry.a ?? ''} variant="card" /></div>
    </div>
  );
}

/** A card as it stood when its answer was pressed: the open question and the
 *  picks (shown positions). */
export type AskWas = { task: HiveTask; open: HumanQA; picked: number[] };

/** Why an answer was not sent (State: not sent). `gone`: main found
 *  no such open question (changed or closed while the person wrote); `kept` is
 *  what they had written, picks and note as composeAnswer put them, and `was`
 *  the card as it stood, kept while no question is open on it (State: not
 *  sent, question closed). `failed`: any other failure; their answer is still
 *  in the box of the question it was pressed on (`on`, askId). */
export type AskNotSent = { why: 'gone'; kept: string; was?: AskWas } | { why: 'failed'; on?: string };

/** One open question's identity: its words, its option labels and when it was asked. */
export function askId(open: HumanQA): string {
  return `${picksKey(open)}\u0001${open.askedAt ?? ''}`;
}

/** The note for an answer to `open` that failed for any reason but 'gone'. */
export function failedOn(open: HumanQA | undefined): AskNotSent {
  return open ? { why: 'failed', on: askId(open) } : { why: 'failed' };
}

/** A not sent note against the question open on its card now (undefined: none,
 *  or the card is not in the list). The pressed question still open: as is.
 *  Another one open: the question changed, so the note stays on the new one and
 *  no closed card is kept for later; a failed note goes, as that question's box
 *  is empty. None open: only a closed card stays, until the person dismisses
 *  it; any other note goes with the card. */
export function settleNotSent(state: AskNotSent | undefined, open: HumanQA | undefined): AskNotSent | undefined {
  if (!state) return undefined;
  if (!open) return state.why === 'gone' && state.was ? state : undefined;
  if (state.why === 'gone' && state.was && askId(state.was.open) !== askId(open)) return { why: 'gone', kept: state.kept };
  if (state.why === 'failed' && state.on !== undefined && state.on !== askId(open)) return undefined;
  return state;
}

/** settleNotSent for every note of a surface, against `tasks` (null: not read
 *  yet, nothing changes), then a 'gone' note for each card in `stranded`
 *  (takeStrandedAnswers) and each closed card in `closed` (takeClosedUnsents);
 *  the same object when nothing changed. */
export function settleNotSents(notes: Readonly<Record<string, AskNotSent>>, tasks: readonly HiveTask[] | null, stranded: Readonly<Record<string, string>> = {}, closed: Readonly<Record<string, AskNotSent>> = {}): Readonly<Record<string, AskNotSent>> {
  if (!tasks) return notes;
  const byId = new Map(tasks.map((x) => [x.id, x]));
  const next: Record<string, AskNotSent> = {};
  let changed = false;
  for (const [id, v] of Object.entries(notes)) {
    const x = byId.get(id);
    const s = settleNotSent(v, x ? openQuestion<HumanQA>(x) : undefined);
    if (s !== v) changed = true;
    if (s) next[id] = s;
  }
  for (const [id, kept] of Object.entries(stranded)) { next[id] = { why: 'gone', kept }; changed = true; }
  for (const [id, note] of Object.entries(closed)) { next[id] = note; changed = true; }
  return changed ? next : notes;
}

/** The option labels part of a picksKey. */
const labelsOf = (key: string) => key.slice(key.lastIndexOf('\u0000'));

/** Text left unsent in a card's box on a question that is no longer the open
 *  one (a failed answer, or plain typing), as the answer would have read
 *  (picks plus note), taken out of the store so it shows once, to copy (Pam's
 *  P4: a question that changes keeps unsent text). '' when there is none, or
 *  when the person dismissed that question. A side effect: call it outside a
 *  state updater. */
export function takeStrandedAnswer(task: HiveTask, open: HumanQA): string {
  const st = useStore.getState();
  const cur = picksKey(open);
  const draft = st.answerDrafts[task.id];
  const picks = st.answerPicks[task.id];
  const key = draft && draft.key !== cur && draft.text.trim() ? draft.key
    : picks && picks.q !== cur && picks.picked.length ? picks.q : null;
  if (key === null) return '';
  const note = draft?.key === key ? draft.text : '';
  const picked = picks?.q === key ? picks.picked : [];
  if (draft?.key === key) st.setAnswerDraft(task.id, key, '');
  if (picks?.q === key) st.setAnswerPicks(task.id, key, []);
  // The question it was written on, if the card still holds it; else, when
  // only the words changed, the open one names the same options.
  const was = [...(task.humanQA ?? [])].reverse().find((e) => picksKey(e) === key);
  if (was?.dismissedAt) return '';
  const base = was ?? (labelsOf(key) === labelsOf(cur) ? open : undefined);
  return (base ? askAnswerState(base, note, { q: picksKey(base), picked }).text : note).trim();
}

/** A card whose question closed elsewhere while its box held text or picks the
 *  person had not sent (closed while typing): the closed card, as the
 *  card stood (`was`, the task as this surface last showed it), with that text
 *  to copy. Taken out of the store so it shows once. null when the box held
 *  nothing (spaces alone are nothing): the card leaves the list as before. A
 *  side effect: call it outside a state updater. */
export function takeClosedUnsent(was: HiveTask): AskNotSent | null {
  const open = openQuestion<HumanQA>(was);
  if (!open) return null;
  const st = useStore.getState();
  const key = picksKey(open);
  const draft = st.answerDrafts[was.id];
  const picks = st.answerPicks[was.id];
  const note = draft?.key === key ? draft.text : '';
  const picked = picks?.q === key ? picks.picked : [];
  if (!note.trim() && !picked.length) return null;
  if (draft?.key === key) st.setAnswerDraft(was.id, key, '');
  if (picks?.q === key) st.setAnswerPicks(was.id, key, []);
  const state = askAnswerState(open, note, { q: key, picked });
  return { why: 'gone', kept: state.text.trim(), was: { task: was, open, picked: state.picked } };
}

/** takeClosedUnsent for each card a surface last showed waiting (`shown`, by
 *  id) that has no open question in `tasks` now, by card. */
export function takeClosedUnsents(shown: ReadonlyMap<string, HiveTask>, tasks: readonly HiveTask[]): Record<string, AskNotSent> {
  const now = new Map(tasks.map((x) => [x.id, x]));
  const out: Record<string, AskNotSent> = {};
  for (const [id, was] of shown) {
    const cur = now.get(id);
    if (cur && openQuestion<HumanQA>(cur)) continue;
    const note = takeClosedUnsent(was);
    if (note) out[id] = note;
  }
  return out;
}

/** The cards of `tasks` waiting now, by id: what takeClosedUnsents compares against next time. */
export function waitingById(tasks: readonly HiveTask[]): Map<string, HiveTask> {
  return new Map(tasks.filter((x) => openQuestion<HumanQA>(x)).map((x) => [x.id, x]));
}

/** takeStrandedAnswer for every card of `tasks` with an open question, by card. */
export function takeStrandedAnswers(tasks: readonly HiveTask[]): Record<string, string> {
  const out: Record<string, string> = {};
  for (const x of tasks) {
    const open = openQuestion<HumanQA>(x);
    const kept = open ? takeStrandedAnswer(x, open) : '';
    if (kept) out[x.id] = kept;
  }
  return out;
}

/** What settleNotSents depends on: each open question in `tasks`, by card. */
export function openAsksKey(tasks: readonly HiveTask[] | null): string | null {
  return tasks && tasks.flatMap((x) => { const o = openQuestion<HumanQA>(x); return o ? [`${x.id}\u0002${askId(o)}`] : []; }).join('\u0000');
}

/** A surface's cards: those `waiting`, plus each kept after its question closed
 *  under an answer, in the place it held (newest ask first). */
export function withClosedAsks(waiting: HiveTask[], notes: Readonly<Record<string, AskNotSent>>): HiveTask[] {
  const live = new Set(waiting.map((x) => x.id));
  const kept = Object.entries(notes).flatMap(([id, v]) => (v.why === 'gone' && v.was && !live.has(id) ? [v.was.task] : []));
  return kept.length ? [...waiting, ...kept].sort((a, b) => compareByNewestAsk(openQuestion<HumanQA>(a), openQuestion<HumanQA>(b))) : waiting;
}

/** A card kept after its question closed under an answer (State: not
 *  sent, question closed): the question and options as they were, faded and
 *  not clickable with the picks still shown, no box, no answer button, then the
 *  not sent row. The surface adds its own dismiss, which only drops the card
 *  from its list: the entry is already closed, so nothing is written. */
export function AskClosed({ state, size }: { state: AskNotSent | undefined; size: number }) {
  const was = state?.why === 'gone' ? state.was : undefined;
  if (!was) return null;
  const shown = normalizeHumanQA(was.open);
  return (
    <>
      {shown && <AskTags entry={shown} />}
      <div style={{ lineHeight: '19px' }}><AskText q={was.open.q} size={size} /></div>
      {shown && <AskOptions entry={shown} picked={was.picked} closed />}
      <AskNotSentRow state={state} />
    </>
  );
}

/** The not sent row, under the answer box and above the buttons: the chip and
 *  what happened, and after a `gone` what they wrote, read only, to copy. No
 *  red: the chip carries the state. */
export function AskNotSentRow({ state }: { state: AskNotSent | undefined }) {
  const { t } = useTranslation();
  const rtl = useRtl();
  if (!state) return null;
  return (
    <>
      <div role="status" style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 12.5, lineHeight: '18px', color: 'var(--cth-ink-900)' }}>
        <span style={tagStyle('var(--cth-lemon-light)')}>{t('askMe.notSent')}</span>
        <span>{t(state.why === 'gone' ? 'askMe.gone' : 'askMe.failed')}</span>
      </div>
      {state.why === 'gone' && state.kept && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 12.5 }}>
          <span style={{ color: 'var(--cth-ink-700)' }}>{t('askMe.goneKept')}</span>
          <div dir={rtl ? 'auto' : undefined} style={{ padding: '6px 8px', background: 'var(--cth-paper-200)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)', whiteSpace: 'pre-wrap', userSelect: 'text', color: 'var(--cth-ink-900)' }}>{state.kept}</div>
        </div>
      )}
    </>
  );
}

/** Unsent picks as the store keeps them (store.answerPicks). `q` holds picksKey(open):
 *  the question plus a hash of its option labels. */
export type StoredPicks = { q: string; picked: number[] } | undefined;

/** An unsent note as the store keeps it (store.answerDrafts): `key` is picksKey(open). */
export type StoredDraft = { key: string; text: string } | undefined;

/** The note written on this question, or '' when the one kept was written on
 *  another: after a 'gone', the god's rewritten question starts with no note. */
export function draftFor(stored: StoredDraft, open: HumanQA | undefined): string {
  return stored && open && stored.key === picksKey(open) ? stored.text : '';
}

/** The open ask's answer as one thing: the card's picks (kept in the store beside the
 *  draft, tied to this question and its options) plus the note. `open` is the STORED entry. */
export function askAnswerState(open: HumanQA | undefined, note: string, stored: StoredPicks) {
  const shown = open ? normalizeHumanQA(open) : null;
  const count = shown?.options?.length ?? 0;
  const picked = stored && open && stored.q === picksKey(open) ? stored.picked.filter((i) => i < count) : [];
  return {
    shown,
    picked,
    hasOptions: count > 0,
    /** The text written to `a`: the picks' labels plus the note, or the note alone. */
    text: composeAnswer(shown?.options, picked, note) ?? '',
  };
}

/** What the answer button says on an ask with options ("answer: Ship B now", or "pick an
 *  option or write a note" until either is done); null keeps the surface's own label. */
export function askButtonLabel(t: TFunction, state: ReturnType<typeof askAnswerState>, note: string): string | null {
  if (!state.hasOptions) return null;
  if (state.picked.length) {
    let choice = (state.shown?.options ?? []).filter((_, i) => state.picked.includes(i)).map((o) => o.label).join(', ');
    if (choice.length > 40) choice = choice.slice(0, 39) + '…';
    return t('askMe.answerWith', { choice });
  }
  return note.trim() ? null : t('askMe.pickFirst');
}

/** The next picks after clicking option `i`, for store.setAnswerPicks. */
export function nextPicks(state: ReturnType<typeof askAnswerState>, i: number): number[] {
  return togglePick(state.shown?.multi, state.picked, i);
}

/** askAnswerState for one card, read from the store. */
export function useAskAnswer(taskId: string, open: HumanQA | undefined) {
  const draft = useStore((s) => s.answerDrafts[taskId]);
  const setAnswerDraft = useStore((s) => s.setAnswerDraft);
  const stored = useStore((s) => s.answerPicks[taskId]);
  const setAnswerPicks = useStore((s) => s.setAnswerPicks);
  const note = draftFor(draft, open);
  const state = askAnswerState(open, note, stored);
  return {
    ...state,
    note,
    /** Keep the note, on this question. */
    setNote: (text: string) => { if (open) setAnswerDraft(taskId, picksKey(open), text); },
    toggle: (i: number) => { if (open) setAnswerPicks(taskId, picksKey(open), nextPicks(state, i)); },
    /** Drop the picks and the note (after an answer lands). */
    clear: () => { if (open) { setAnswerPicks(taskId, picksKey(open), []); setAnswerDraft(taskId, picksKey(open), ''); } },
  };
}
