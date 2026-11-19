/**
 * Update toast (v0.3.4), the visual half of the update notice.
 *
 * Main's updater (src/main/updater.ts) polls GitHub's releases/latest and
 * pushes 'available' over `update:status` when a newer release is out. The
 * toast says so and offers that release's page. Releases ship as source, so
 * there is nothing to download or install from here: the person builds the new
 * version the way they built this one.
 *
 * Mirrors CompletionToast: self-contained + self-subscribing, mounted once in
 * App.tsx, renders nothing when idle. "later" just hides the toast until the
 * next app start (or the 6h re-check).
 *
 * ─── v0.4.4: "What's new" ───────────────────────────────────────────────────
 * The status carries `notes` (the GitHub release body), and the toast renders a
 * digest of it. summarizeReleaseNotes() in src/shared/releaseNotes.ts does the
 * parsing, and lives there rather than here so it can be unit-tested without a
 * renderer.
 *
 * Three rules this block obeys:
 *   1. No notes, no block. A release body that is missing, empty, or pure
 *      structure yields an empty digest and the toast renders EXACTLY as it did
 *      before — no orphan heading, no shifted buttons. Most bodies are like
 *      that, so this is the common path, not the edge case.
 *   2. Bounded height. The digest is capped in releaseNotes.ts AND clamped with
 *      a scroll here, because a toast that grows with the release notes is a
 *      dialog that covers the app.
 *   3. The star ask is shown AT MOST ONCE EVER, not once per release. A repeated
 *      ask is the kind of nagging that gets a notification muted, which would
 *      cost the updater its only channel. See STAR_ASK_KEY below.
 *
 * No new IPC and no new network call: "read more" reuses `updateOpenRelease`
 * (the same bridge the button uses) and the star link goes through the existing
 * `openExternal` opener.
 */
import { useEffect, useMemo, useState } from 'react';
import { Icon } from '@/components/Icon';
import { summarizeReleaseNotes } from '@shared/releaseNotes';
import { extractDropHtml } from '@shared/releaseDrop';
import { ReleaseDrop } from '@/components/ReleaseDrop';
import { dropSeen, offerUnlessSeen, releaseDropKey } from '@/components/releaseDropSeen';
import { useBootSettled } from '@/store/bootGate';
import { REPO, type UpdateStatus } from '@shared/updateState';

/** The toast is the LOUD half: it only interrupts for a newer release and for
 *  the release page of the version just updated to. Everything else (checking,
 *  errors) lives quietly in the toolbar badge next to the logo. */
type ToastStatus = Extract<UpdateStatus, { state: 'available' | 'just-updated' }>;

function toastable(s: UpdateStatus): ToastStatus | null {
  return s.state === 'available' || s.state === 'just-updated' ? s : null;
}

/** The project's repository, where the star link points. */
const GITHUB_REPO_URL = `https://github.com/${REPO}`;

/** One-time flag for the star ask. `cth.`-prefixed localStorage is this app's
 *  convention for renderer-only UI memory (see App.tsx's skipHivePickerOnce and
 *  design/theme.ts) — and SettingsModal's "reset & start over" clears every
 *  `cth.` key, which is right: a wiped install is a new user who has not been
 *  asked yet. It is deliberately NOT a HarnessConfig key; that file is the
 *  agent runtime's contract, hand-mirrored across main/preload/renderer, and a
 *  cosmetic nudge does not belong in it. */
const STAR_ASK_KEY = 'cth.updateStarAsked';

function starAskPending(): boolean {
  try {
    return window.localStorage.getItem(STAR_ASK_KEY) !== '1';
  } catch {
    // Storage unavailable means we cannot honour "at most once, ever" — so ask
    // zero times rather than risk asking on every single update.
    return false;
  }
}

function markStarAsked(): void {
  try { window.localStorage.setItem(STAR_ASK_KEY, '1'); } catch { /* nothing to do */ }
}

export function UpdateToast() {
  const [status, setStatus] = useState<ToastStatus | null>(null);
  // Read once per window, so persisting the flag below cannot make the link
  // vanish from under the cursor of the person currently looking at it.
  const [starAsk] = useState(starAskPending);
  /** The version the ask was spent on. A version rather than a boolean because
   *  flipping a boolean the moment we persist would yank the link out from
   *  under the cursor of the person looking at it — this keeps it on the toast
   *  that is showing it, and withholds it from any later one. */
  const [starSpentOn, setStarSpentOn] = useState<string | null>(null);
  const bootSettled = useBootSettled();

  useEffect(() => window.cth.onUpdateStatus?.((next) => {
    // A drop the user already closed is not offered again on a re-push
    // (releaseDropSeen.ts); the corner toast keeps its own rule.
    const t = offerUnlessSeen(toastable(next));
    // A non-toastable state (a re-check, say) must not erase a toast the user
    // hasn't answered yet — only a new actionable state replaces it.
    if (t) setStatus(t);
  }), []);

  // Main may have emitted before this window existed (a check or a release
  // page fetch that finished first, or the dev-only MD_DROP_PREVIEW boot hook),
  // and a push nobody was listening to is gone. Pull the last status once on mount so
  // that state is not lost. Main holds that status for the life of the process
  // and this surface remounts with the shell, so the pull skips a drop the
  // user already closed, or closing it would last until the next remount.
  useEffect(() => {
    let alive = true;
    void window.cth.updateCurrent?.().then((cur) => {
      const t = offerUnlessSeen(toastable(cur));
      if (alive && t) setStatus((prev) => prev ?? t);
    }).catch(() => { /* nothing to show */ });
    return () => { alive = false; };
  }, []);

  const notes = useMemo(() => summarizeReleaseNotes(status?.notes), [status?.notes]);
  /** An authored <!-- drop --> block in the release body upgrades this whole
   *  moment from a corner toast to a centered release page. Absent (every
   *  release published so far), everything below behaves exactly as before —
   *  the digest path stays the default, not a fallback nobody exercises. */
  const dropHtml = useMemo(() => extractDropHtml(status?.notes), [status?.notes]);
  const version = status?.version ?? null;
  // Shown = spent. Not "clicked" — an ask the user read and ignored is an
  // answer too, and asking again next release is exactly what rule 3 forbids.
  // `notes.length > 0` was standing in for "this toast has something to show".
  // A drop-only release body digests to zero bullets while being the richest
  // release page we ship, so it has to count too — otherwise the star ask
  // silently disappears on exactly the releases most worth starring.
  // A drop no longer counts. The star ask is a BUTTON, the drop has none, and
  // spending a once-ever ask on a surface that cannot show it burns it for
  // nothing — a drop release that wants a star authors the link in its own HTML.
  const showStar = starAsk && notes.length > 0
    && (starSpentOn === null || starSpentOn === version);
  useEffect(() => {
    if (showStar && version && starSpentOn === null) {
      setStarSpentOn(version);
      markStarAsked();
    }
  }, [showStar, version, starSpentOn]);

  // 0.5.2, card v052-startup-restore-loading: nothing here, the drop above
  // all, is offered while the restore is still running. The status is kept;
  // it renders the moment the boot gate settles (store/bootGate.ts).
  if (!bootSettled) return null;
  if (!status) return null;

  // An authored release: hand the whole moment to the centered drop instead of
  // the corner toast. Nothing is passed in but the content — the drop carries no
  // app buttons, and its own links go out through the OS browser.
  //
  // The newer release is not lost with the corner card: the title-bar
  // UpdateBadge and Settings -> Updates still name it and open its page.
  if (dropHtml && version) {
    return (
      <ReleaseDrop
        version={version}
        html={dropHtml}
        // Closing is remembered by state and version, so this page stays closed
        // across remounts and re-pushes.
        onDismiss={() => { dropSeen.markSeen(releaseDropKey(status)); setStatus(null); }}
      />
    );
  }
  // Freshly updated with nothing authored for this release: nothing to say.
  if (status.state === 'just-updated') return null;

  /** Main opens only this project's release pages, and the page the last check
   *  named. */
  const openRelease = () => { void window.cth.updateOpenRelease(status.url); };

  const buttonStyle: React.CSSProperties = {
    padding: '3px 10px 1px',
    background: 'var(--cth-mint-light, #d0f0e0)',
    boxShadow: 'inset 0 0 0 1px var(--cth-ink-300)',
    fontFamily: 'var(--cth-font-ui)', fontSize: 12,
    color: 'var(--cth-ink-900)', cursor: 'pointer', border: 'none'
  };

  const linkStyle: React.CSSProperties = {
    fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-900)',
    textDecoration: 'underline', cursor: 'pointer'
  };

  return (
    <div style={{
      // Position is NOT set here — AppOverlaySlot owns the transient corner,
      // so this and the approval toast stack instead of covering each other.
      maxWidth: 340,
      background: 'var(--cth-cream-50)',
      boxShadow: '0 0 0 2px var(--cth-ink-900), 4px 5px 0 0 rgba(26,19,32,0.25)',
      padding: '10px 12px',
      display: 'flex', flexDirection: 'column', gap: 8,
      fontFamily: 'var(--cth-font-ui)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
        <Icon name="sparkle" />
        <span style={{ fontSize: 13, color: 'var(--cth-ink-900)', fontWeight: 600 }}>
          v{status.version} is available
        </span>
      </div>
      <span style={{ fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-700)' }}>
        Releases ship as source. Build it the way you built this one; the release page has the notes.
      </span>

      {notes.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{
            fontFamily: 'var(--cth-font-display)', fontSize: 8, lineHeight: '12px',
            color: 'var(--cth-ink-500)', textTransform: 'uppercase'
          }}>
            What’s new
          </div>
          {/* The digest is already capped at ~280 chars; the clamp is the second
              belt, for the day a release body defeats the parser. */}
          <ul style={{
            listStyle: 'none', margin: 0, padding: '0 0 0 2px',
            maxHeight: 96, overflowY: 'auto',
            display: 'flex', flexDirection: 'column', gap: 4
          }}>
            {notes.map((line, i) => (
              <li key={i} style={{
                display: 'flex', gap: 6,
                fontSize: 12, lineHeight: '16px', color: 'var(--cth-ink-700)'
              }}>
                <span aria-hidden style={{ color: 'var(--cth-ink-300)' }}>•</span>
                <span>{line}</span>
              </li>
            ))}
          </ul>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            <a
              href={status.url}
              onClick={(e) => { e.preventDefault(); openRelease(); }}
              style={linkStyle}
            >Read more</a>
            {showStar && (
              <a
                href={GITHUB_REPO_URL}
                onClick={(e) => { e.preventDefault(); void window.cth.openExternal(GITHUB_REPO_URL); }}
                style={linkStyle}
              >⭐ Star us on GitHub</a>
            )}
          </div>
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button
          onClick={() => setStatus(null)}
          style={{ ...buttonStyle, background: 'var(--cth-cream-100)' }}
        >
          later
        </button>
        <button onClick={openRelease} style={buttonStyle}>
          open release page
        </button>
      </div>
    </div>
  );
}
