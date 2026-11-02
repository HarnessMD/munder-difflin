/**
 * Rendered markdown view (v0.3.4) — the shared preview used by the IDE's
 * split/preview modes, the fullscreen file overlay, and (via those) the
 * terminal ⌘-click flow. The `card` variant renders agent-written markdown
 * inside another surface: the ASK ME question and the task detail's Q&A trail.
 *
 * SECURITY: agent-generated markdown is untrusted. react-markdown WITHOUT
 * rehype-raw renders to React elements only — no HTML sink exists, raw HTML in
 * the source is shown as text, and the default urlTransform already drops
 * javascript: URIs. Keep it that way: never add rehype-raw here.
 *
 * Links never navigate the window: http(s)/mailto go through the main-process
 * opener; relative *.md links surface through onOpenMarkdownLink so the host
 * (IDE tab / overlay) opens them in context; everything else is inert.
 */
import { memo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useWorkspaceImage } from '@/hooks/useWorkspaceImage';
import { isExternal, resolveLocalImageSource, resolveMdLinkRel, type LocalImageRejectReason } from './mdLinks';
import { remarkSoftBreaks } from './remarkSoftBreaks';
import { rehypeAutoDir } from './rehypeAutoDir';
import { useRtl } from '@/i18n/useDirection';

/** How the rendered markdown sits in its host.
 *  - `document` (default): a page — its own type scale, 72ch measure, page padding.
 *  - `card`: markdown INSIDE another surface (an ASK ME question, a Q&A entry).
 *    Inherits the host's font and size, drops the page chrome, and keeps a single
 *    newline as a line break the way the plain-text block it replaced did. */
export type MarkdownVariant = 'document' | 'card';

// Hoisted: a fresh array on every render would make react-markdown re-run the
// whole pipeline even when nothing about the source changed.
const DOC_PLUGINS = [remarkGfm];
const CARD_PLUGINS = [remarkGfm, remarkSoftBreaks];

/** Per-block `dir="auto"`, for an RTL app language only — see the note at the
 *  `useRtl()` call site below. Frozen module constants so the prop identity is
 *  stable and react-markdown does not re-run the pipeline on every render. */
const AUTO_DIR_PLUGINS = [rehypeAutoDir];
const NO_PLUGINS: never[] = [];

/** Chip note (i18n key) for each reason a local image was not loaded. `null`
 *  keeps the chip as quiet as it always was: a remote URL is not a mistake the
 *  author made, it is a policy. A Record, so a new reason fails the typecheck
 *  here until someone decides what the user should see for it. */
const IMAGE_REJECT_NOTE_KEY: Readonly<Record<LocalImageRejectReason, string | null>> = {
  empty: null,
  remote: null,
  'not-image': 'markdownImage.notImage',
  'malformed-encoding': 'markdownImage.malformedEncoding',
  'unsafe-segment': 'markdownImage.unsafeSegment'
};

export interface MarkdownPreviewProps {
  source: string;
  /** Repo-relative path of the file being previewed (for resolving relative links). */
  baseRel?: string;
  /** Absolute workspace root. Supplying it turns LOCAL images from placeholder
   *  chips into actual pictures (read through the root-confined fs IPC); without
   *  it every image stays a chip, because there is nothing to resolve against. */
  root?: string;
  /** Open a sibling markdown file (repo-relative path) in the host's context. */
  onOpenMarkdownLink?: (rel: string) => void;
  /** Page vs in-card rendering. Defaults to `document`. */
  variant?: MarkdownVariant;
}

export const MarkdownPreview = memo(function MarkdownPreview({
  source, baseRel, root, onOpenMarkdownLink, variant = 'document'
}: MarkdownPreviewProps) {
  const card = variant === 'card';
  // Per-block direction, gated on the APP LANGUAGE rather than on the text.
  //
  // The plugin stamps `dir="auto"`, which resolves from each block's first
  // strong character — so ungated it fires for an English user the moment an
  // agent quotes a line of Arabic, and mirrors a block of their UI over
  // something they never turned on. Keying it to the chosen language instead
  // means an English user's markdown renders through exactly the pipeline it
  // rendered through before this existed, whatever the agent writes into it.
  const rtl = useRtl();
  const { t } = useTranslation();
  return (
    <div className={card ? 'cth-md-preview cth-md-card' : 'cth-md-preview'}>
      <ReactMarkdown
        remarkPlugins={card ? CARD_PLUGINS : DOC_PLUGINS}
        rehypePlugins={rtl ? AUTO_DIR_PLUGINS : NO_PLUGINS}
        components={{
          a: ({ href, children }) => {
            const h = href ?? '';
            // Decoded like an image src, so `[x](<my notes.md>)` opens
            // `my notes.md`; a malformed escape resolves to null and stays inert.
            const mdRel = onOpenMarkdownLink ? resolveMdLinkRel(baseRel, h) : null;
            const onClick = (e: React.MouseEvent) => {
              e.preventDefault();
              if (isExternal(h)) { void window.cth.openExternal?.(h); return; }
              if (mdRel && onOpenMarkdownLink) onOpenMarkdownLink(mdRel);
              // anything else (file:, anchors into self, unknown schemes): inert
            };
            const clickable = isExternal(h) || mdRel !== null;
            return (
              <a
                href={h || undefined}
                onClick={onClick}
                title={h}
                style={clickable ? undefined : { cursor: 'default', textDecoration: 'underline dotted' }}
              >
                {children}
              </a>
            );
          },
          // Images. LOCAL ones render for real (bytes via the root-confined fs
          // IPC → blob URL); remote ones stay a placeholder chip. Until now
          // every image was a chip, which meant an agent's report saying "see
          // the screenshot below" showed a pill reading "🖼 screenshot" and the
          // evidence was unviewable anywhere in the app.
          img: ({ alt, src }) => {
            const s = typeof src === 'string' ? src : undefined;
            if (!root) return <ImageChip alt={alt} src={s} />;
            const source = resolveLocalImageSource(baseRel, s);
            if (!source.ok) {
              const noteKey = IMAGE_REJECT_NOTE_KEY[source.reason];
              return <ImageChip alt={alt} src={s} note={noteKey ? t(noteKey) : undefined} />;
            }
            return <MdImage root={root} rel={source.rel} alt={alt} src={s} />;
          }
        }}
      >
        {source}
      </ReactMarkdown>
    </div>
  );
});

/** Fallback for anything we won't (or can't) load: remote URLs, non-images,
 *  and local files that turned out to be missing or undecodable. */
function ImageChip({ alt, src, note }: { alt?: string; src?: string; note?: string }) {
  const { t } = useTranslation();
  return (
    <span className="cth-md-img" title={src}>
      🖼 {alt || t('markdownImage.untitled')}{note ? ` — ${note}` : ''}
    </span>
  );
}

/** A local image inside rendered markdown. Falls back to the chip on any
 *  failure so a stale path in a report degrades to the old behaviour instead of
 *  a broken-image glyph. Blob lifetime (create AND revoke) belongs to the hook. */
function MdImage({ root, rel, alt, src }: { root: string; rel: string; alt?: string; src?: string }) {
  const { t } = useTranslation();
  const img = useWorkspaceImage(root, rel);
  const [decodeFailed, setDecodeFailed] = useState(false);
  if (img.status === 'loading') return <ImageChip alt={alt} src={src} note={t('markdownImage.loading')} />;
  if (img.status === 'error') return <ImageChip alt={alt} src={src} note={img.error} />;
  if (decodeFailed) return <ImageChip alt={alt} src={src} note={t('markdownImage.decodeFailed')} />;
  return (
    <img
      className="cth-md-image"
      src={img.url}
      alt={alt || rel}
      title={src}
      onError={() => setDecodeFailed(true)}
    />
  );
}
