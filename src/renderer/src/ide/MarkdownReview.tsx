/**
 * MARKDOWN AS A READING AND REVIEWING MODE (0.4.9 phase 8).
 *
 * The panel could already RENDER markdown, and rendering is only the first half.
 * Most markdown in this app is a report an agent wrote for a person to review,
 * and reviewing a twelve screen document that has no outline means scrolling and
 * hoping. Three things turn the preview into a place you can work:
 *
 *   the outline    every heading, indented by level, that jumps. Clicking one
 *                  scrolls the rendered document AND puts the editor caret on
 *                  that heading's source line, so the same click works in code,
 *                  split and preview.
 *   where you are  the outline marks the section currently at the top of the
 *                  view, updated as you scroll. Without it an outline tells you
 *                  what the document contains and not where you got to.
 *   how long       words, reading estimate, and the state of any checklist in
 *                  it. A reviewer decides whether to start now or later, and
 *                  that decision needs a number.
 *
 * The structure comes from `@shared/markdownOutline`, parsed from the SOURCE, so
 * every entry carries a line number. The scroll target comes from the rendered
 * DOM, because that is the only thing that knows where a heading landed. Those
 * two lists are matched by position, with a text fallback if they ever disagree
 * about how many headings there are.
 */
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { MarkdownPreview } from '@/markdown/MarkdownPreview';
import { markdownReview, type OutlineEntry } from '@shared/markdownOutline';

/** A request to scroll to one heading. The nonce is what makes clicking the
 *  same entry twice scroll back to it. */
export interface OutlineJump { index: number; nonce: number }

/* ────────────────────────────── the outline rail ────────────────────────── */

export function OutlinePane({ entries, source, activeIndex, onJump }: {
  entries: readonly OutlineEntry[];
  source: string;
  activeIndex: number;
  onJump: (entry: OutlineEntry) => void;
}) {
  const { t } = useTranslation();
  const review = useMemo(() => markdownReview(source), [source]);
  return (
    <div style={{
      width: 208, flexShrink: 0, minHeight: 0, display: 'flex', flexDirection: 'column',
      background: 'var(--cth-cream-50)', borderInlineEnd: '1px solid var(--cth-ink-100)'
    }}>
      <div style={{
        display: 'flex', alignItems: 'center', gap: 6, padding: '6px 10px 4px', flexShrink: 0,
        fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px', textTransform: 'uppercase',
        color: 'var(--cth-ink-700)', borderBottom: '1px solid var(--cth-ink-100)'
      }}>
        <span style={{ flex: 1 }}>{t('ide.md.outline')}</span>
      </div>

      <div style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '4px 0' }}>
        {entries.length === 0 ? (
          // An empty outline is a real answer about the document, so it says
          // which document fact produced it rather than showing a blank rail.
          <div style={{ padding: '6px 10px', fontFamily: 'var(--cth-font-ui)', fontSize: 11.5, lineHeight: 1.45, color: 'var(--cth-ink-500)' }}>
            {t('ide.md.noHeadings')}
          </div>
        ) : entries.map((e) => {
          const active = e.index === activeIndex;
          return (
            <button
              key={e.id}
              type="button"
              onClick={() => onJump(e)}
              title={e.text}
              aria-current={active ? 'true' : undefined}
              style={{
                display: 'block', width: '100%', border: 'none', cursor: 'pointer', textAlign: 'start',
                padding: '2px 8px', paddingInlineStart: 8 + (e.level - 1) * 10,
                font: 'inherit', fontFamily: 'var(--cth-font-ui)',
                fontSize: e.level <= 2 ? 12 : 11.5,
                fontWeight: e.level === 1 ? 600 : 400,
                color: 'var(--cth-ink-900)',
                background: active ? 'var(--cth-lemon-light)' : 'transparent',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'
              }}>
              {e.text || t('ide.md.untitledHeading')}
            </button>
          );
        })}
      </div>

      {/* What a reviewer wants before they start. Every number is counted from
          the buffer on screen, and the estimate says it is one. */}
      <div style={{
        flexShrink: 0, padding: '6px 10px', borderTop: '1px solid var(--cth-ink-100)',
        display: 'flex', flexDirection: 'column', gap: 2,
        fontFamily: 'var(--cth-font-ui)', fontSize: 11, color: 'var(--cth-ink-500)'
      }}>
        <span>{t('ide.md.words', { n: review.words })}</span>
        {/* An estimate of zero minutes is not an estimate, so an empty document
            gets the word count and nothing else. */}
        {review.readingMinutes > 0 && (
          <span>{t('ide.md.readingTime', { n: review.readingMinutes })}</span>
        )}
        {review.tasksTotal > 0 && (
          <span>{t('ide.md.tasks', { done: review.tasksDone, total: review.tasksTotal })}</span>
        )}
      </div>
    </div>
  );
}

/* ───────────────────────────── the rendered body ────────────────────────── */

/**
 * The rendered document, plus the two pieces of wiring the outline needs: a way
 * to be told to scroll to heading N, and a way to report which heading is at
 * the top of the view.
 *
 * The source is deferred so fast typing in split view never blocks the editor.
 * That means the DOM can be a beat behind the outline; a jump therefore reads
 * the DOM at the moment it fires rather than caching element positions.
 */
export function MarkdownBody({ rel, root, source, split, outline, jump, onActive, onOpenMarkdownLink }: {
  rel: string;
  root: string;
  source: string;
  split: boolean;
  outline: readonly OutlineEntry[];
  jump: OutlineJump | null;
  onActive: (index: number) => void;
  onOpenMarkdownLink: (rel: string) => void;
}) {
  const deferred = useDeferredValue(source);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const outlineRef = useRef(outline);
  outlineRef.current = outline;

  const headings = useCallback((): HTMLElement[] => {
    const box = scrollRef.current;
    if (!box) return [];
    return Array.from(box.querySelectorAll('h1,h2,h3,h4,h5,h6')) as HTMLElement[];
  }, []);

  useEffect(() => {
    if (!jump) return;
    const els = headings();
    const list = outlineRef.current;
    // Positional match, because both lists are the same document in the same
    // order. The text fallback covers the case where the two parsers disagree
    // about what counts as a heading, which would otherwise scroll to the
    // wrong section silently.
    let el: HTMLElement | null = els.length === list.length ? els[jump.index] ?? null : null;
    if (!el) {
      const want = list[jump.index]?.text ?? '';
      el = els.find((e) => (e.textContent ?? '').trim() === want) ?? els[jump.index] ?? null;
    }
    const box = scrollRef.current;
    if (!el || !box) return;
    box.scrollTop += el.getBoundingClientRect().top - box.getBoundingClientRect().top - 6;
  }, [jump, headings]);

  // Which section is at the top of the view. Sampled on scroll through a frame
  // so a fast scroll does not run this once per pixel.
  const frame = useRef(0);
  useEffect(() => {
    const box = scrollRef.current;
    if (!box) return;
    const sample = (): void => {
      frame.current = 0;
      const top = box.getBoundingClientRect().top + 8;
      const els = headings();
      let at = -1;
      for (let i = 0; i < els.length; i++) {
        if (els[i].getBoundingClientRect().top <= top) at = i;
        else break;
      }
      onActive(at);
    };
    const onScroll = (): void => {
      if (frame.current) return;
      frame.current = window.requestAnimationFrame(sample);
    };
    box.addEventListener('scroll', onScroll, { passive: true });
    sample();
    return () => {
      box.removeEventListener('scroll', onScroll);
      if (frame.current) window.cancelAnimationFrame(frame.current);
    };
  }, [headings, onActive, deferred]);

  return (
    <div
      ref={scrollRef}
      style={{
        flex: 1, minWidth: 0, minHeight: 0, overflow: 'auto',
        background: 'var(--cth-paper-100)',
        borderInlineStart: split ? '1px solid var(--cth-ink-100)' : 'none'
      }}>
      {/* `root` is what lets a report's screenshots render inline instead of
          collapsing to placeholder chips. */}
      <MarkdownPreview source={deferred} baseRel={rel} root={root} onOpenMarkdownLink={onOpenMarkdownLink} />
    </div>
  );
}

/** Track the active heading for a document, resetting when the file changes. */
export function useActiveHeading(rel: string): [number, (i: number) => void] {
  const [active, setActive] = useState(-1);
  useEffect(() => { setActive(-1); }, [rel]);
  return [active, setActive];
}
