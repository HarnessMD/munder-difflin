// splitHeadline, togglePick and the option list are ported from Prozzta/guppyos 02d0d50b (MIT).
import type { CSSProperties, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { PixelButton } from './PixelButton';
import { MarkdownPreview } from '@/markdown/MarkdownPreview';
import { isComposingKey } from '@shared/imeGuard';
import { composeAnswer, type HumanQAFields } from '@shared/humanQuestion';

const HEADLINE_MAX = 140;
const LIST_LINE = /^\s*(?:[-*+•]|\d+[.)])\s+/;

/** A question's short headline (shown bold) and the body below it: the first line
 *  when it is short and not a list item, else that line's first sentence when that
 *  is short. Heading marks are dropped. No split: the whole text is the body. */
export function splitHeadline(q: string): { headline: string | null; body: string } {
  const text = q.replace(/\r\n?/g, '\n').replace(/^\s*\n/, '');
  const nl = text.indexOf('\n');
  const first = (nl < 0 ? text : text.slice(0, nl)).trim();
  const rest = nl < 0 ? '' : text.slice(nl + 1);
  if (!first || LIST_LINE.test(first)) return { headline: null, body: text.trim() };
  const clean = first.replace(/^#{1,6}\s+/, '');
  if (clean.length <= HEADLINE_MAX) return { headline: clean, body: rest.trim() };
  const m = /^(.{10,}?[.?!:])\s+(.*)$/s.exec(clean);
  if (m && m[1].length <= HEADLINE_MAX) {
    return { headline: m[1], body: [m[2], rest].filter((s) => s.trim()).join('\n').trim() };
  }
  return { headline: null, body: text.trim() };
}

/** The picks after clicking option `i`: several toggle; one selects it, and a
 *  second click on it clears it. Sorted, no repeats. */
export function togglePick(multi: boolean | undefined, cur: number[], i: number): number[] {
  if (multi) return (cur.includes(i) ? cur.filter((x) => x !== i) : [...cur, i]).sort((a, b) => a - b);
  return cur.length === 1 && cur[0] === i ? [] : [i];
}

/** When it was asked, in the window's language, or null for no stamp. */
function askedWhen(iso: string | undefined, lang: string): string | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  try {
    return d.toLocaleString(lang, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return d.toLocaleString();
  }
}

/** The button's words for the picks: their labels, cut at 40 characters. */
function choiceText(entry: HumanQAFields, picks: number[]): string {
  const s = (entry.options ?? []).filter((_, i) => picks.includes(i)).map((o) => o.label).join(', ');
  return s.length > 40 ? s.slice(0, 39) + '…' : s;
}

function Tag({ children, bg }: { children: ReactNode; bg: string }) {
  return (
    <span style={{
      fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '14px', padding: '0 5px',
      background: bg, color: 'var(--cth-ink-900)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)', whiteSpace: 'nowrap',
    }}>{children}</span>
  );
}

const small: CSSProperties = { fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-500)' };

export interface AskMeQuestionProps {
  entry: HumanQAFields;
  draft: string;
  onDraft: (text: string) => void;
  /** Picked options, as indexes of entry.options. */
  picks: number[];
  onPicks: (picks: number[]) => void;
  onSend: () => void;
  sending: boolean;
  /** Not sent: the question changed or closed first ('gone'), or anything else ('failed'). */
  notSent?: 'gone' | 'failed';
  /** What the person wrote for a question that changed or closed, to copy. */
  kept?: string;
  /** Closed elsewhere: read only, no box and no answer button, until dismissed. */
  closed?: boolean;
}

/** One ASK ME question (Pam's P4): a kind tag and when it was asked, a bold
 *  headline, the options when the god gave some, and the note or answer box. A
 *  click on an option only picks; the button names the answer and sends it. */
export function AskMeQuestion({ entry, draft, onDraft, picks, onPicks, onSend, sending, notSent, kept, closed }: AskMeQuestionProps) {
  const { t, i18n } = useTranslation();
  const options = entry.options ?? [];
  const hasOptions = options.length > 0;
  const { headline, body } = splitHeadline(entry.q);
  const when = askedWhen(entry.askedAt, i18n.language);
  const answer = composeAnswer(entry.options, picks, draft);
  const interactive = !closed && !sending;

  const notSentRow = (line: string) => (
    <div role="status" style={{ display: 'flex', gap: 8, alignItems: 'baseline', flexWrap: 'wrap', fontSize: 13, lineHeight: '18px', color: 'var(--cth-ink-900)' }}>
      <Tag bg="var(--cth-lemon-light)">{t('askMe.notSent')}</Tag>
      <span>{line}</span>
    </div>
  );
  const keptBox = kept ? (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 3, fontSize: 13 }}>
      <span style={{ color: 'var(--cth-ink-700)' }}>{t('askMe.goneKept')}</span>
      <div dir="auto" style={{
        padding: '6px 8px', background: 'var(--cth-paper-200)', boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
        whiteSpace: 'pre-wrap', userSelect: 'text', color: 'var(--cth-ink-900)',
      }}>{kept}</div>
    </div>
  ) : null;

  const label = sending
    ? t('askMe.sending')
    : picks.length
    ? t('askMe.answerWith', { choice: choiceText(entry, picks) })
    : hasOptions && !draft.trim()
    ? t('askMe.pickFirst')
    : t('askMe.respond');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, minWidth: 0 }}>
      {/* A closed card kept only for what was written has no question to tag. */}
      {!(closed && !entry.q) && <div style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
        <Tag bg={hasOptions ? 'var(--cth-lilac-light)' : 'var(--cth-sky-light)'}>
          {t(hasOptions ? 'askMe.kind.choose' : 'askMe.kind.question')}
        </Tag>
        {hasOptions && entry.multi && <Tag bg="var(--cth-lilac-light)">{t('askMe.pickAny')}</Tag>}
        {when && <span style={small}>{t('askMe.asked', { when })}</span>}
      </div>}

      {headline && (
        <div dir="auto" style={{ fontSize: 15, lineHeight: '19px', fontWeight: 700, color: 'var(--cth-ink-900)' }}>
          <MarkdownPreview source={headline} variant="card" />
        </div>
      )}
      {body && (
        <div dir="auto" style={{ fontSize: 15, lineHeight: '19px', color: 'var(--cth-ink-900)' }}>
          <MarkdownPreview source={body} variant="card" />
        </div>
      )}

      {hasOptions && (
        <div role={entry.multi ? 'group' : 'radiogroup'} style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {options.map((o, i) => {
            const on = picks.includes(i);
            return (
              <button
                key={i}
                type="button"
                role={entry.multi ? 'checkbox' : 'radio'}
                aria-checked={on}
                disabled={!interactive}
                onClick={() => onPicks(togglePick(entry.multi, picks, i))}
                style={{
                  display: 'flex', gap: 8, alignItems: 'flex-start', width: '100%', textAlign: 'start',
                  padding: '7px 9px', border: 'none', font: 'inherit', color: 'var(--cth-ink-900)',
                  cursor: interactive ? 'pointer' : 'default',
                  background: on ? 'var(--cth-mint-light)' : 'var(--cth-paper-100)',
                  boxShadow: on ? 'inset 0 0 0 1.5px var(--cth-ink-500)' : 'inset 0 0 0 1px var(--cth-ink-300)',
                  opacity: closed ? 0.6 : 1,
                }}
              >
                <span aria-hidden style={{
                  width: 14, height: 14, marginTop: 2, flexShrink: 0, borderRadius: entry.multi ? 0 : 7,
                  boxShadow: 'inset 0 0 0 2px var(--cth-ink-500)',
                  background: on ? 'var(--cth-mint)' : 'var(--cth-paper-100)',
                }} />
                <span dir="auto" style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                  <span style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap' }}>
                    <b style={{ fontSize: 15, lineHeight: '18px' }}>{o.label}</b>
                    {entry.recommended === i && <Tag bg="var(--cth-lemon-light)">{t('askMe.recommended')}</Tag>}
                  </span>
                  {o.detail && <span style={{ fontSize: 13, lineHeight: '17px', color: 'var(--cth-ink-700)' }}>{o.detail}</span>}
                </span>
              </button>
            );
          })}
        </div>
      )}

      {closed ? (
        <>
          {notSentRow(t('askMe.gone'))}
          {keptBox}
        </>
      ) : (
        <>
          <textarea
            dir="auto"
            value={draft}
            onChange={(e) => onDraft(e.target.value)}
            onKeyDown={(e) => { if (isComposingKey(e)) return; if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && answer && !sending) onSend(); }}
            rows={hasOptions ? 2 : 3}
            placeholder={t(hasOptions ? 'askMe.notePlaceholder' : 'askMe.answerPlaceholder')}
            style={{
              width: '100%', boxSizing: 'border-box', padding: '6px 8px', resize: 'vertical',
              background: 'var(--cth-paper-100)', border: 'none',
              boxShadow: 'inset 0 0 0 1px var(--cth-ink-100)',
              fontFamily: 'var(--cth-font-mono)', fontSize: 15, lineHeight: '18px',
              color: 'var(--cth-ink-900)', outline: 'none',
            }}
          />
          {notSent && notSentRow(t(notSent === 'gone' ? 'askMe.gone' : 'askMe.failed'))}
          {notSent === 'gone' && keptBox}
          <div style={{ display: 'flex', gap: 8 }}>
            <PixelButton variant="primary" size="sm" disabled={!answer || sending} onClick={onSend}>
              {label}
            </PixelButton>
          </div>
        </>
      )}
    </div>
  );
}
