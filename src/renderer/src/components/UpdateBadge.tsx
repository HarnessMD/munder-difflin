/**
 * Toolbar version + update control, top-left, right next to the logo.
 *
 * Always shows the running version. When main's updater has found a newer
 * release it grows a chip that IS the button: "v0.6.1 available" (click: open
 * that release's page, since releases ship as source and nothing downloads
 * here). With nothing pending, clicking the version itself runs a manual check;
 * the old build only ever checked 30s after boot and then every 6h, so there
 * was no way to ask.
 *
 * All of the "what does this state say and do" logic lives in
 * src/shared/updateState.ts so it can be unit-tested without Electron; the
 * subscription, the click and the "you are current" flash live in
 * updateBadgeState.ts; this file is the pixels.
 */
import { useUpdateBadge } from './updateBadgeState';

declare const __APP_VERSION__: string;

export function UpdateBadge() {
  const { view, busy, checkedOk, click: onClick, interactive } = useUpdateBadge();

  // The chip only earns colour when it wants something: ready = mint (act on
  // me), warn = amber (something went wrong), busy/idle stay in the titlebar's
  // own greys so a quiet app looks exactly like it did before.
  const chipBg =
    view.tone === 'ready' ? 'var(--cth-mint-light, #d0f0e0)'
      : view.tone === 'warn' ? 'var(--cth-amber-light, #f6e2b3)'
        : 'transparent';

  const INK = 'var(--cth-ink-900)';

  return (
    <span style={{ position: 'relative', display: 'inline-flex' }}>
    <button
      className="cth-titlebar-nodrag"
      onClick={() => { void onClick(); }}
      disabled={!interactive}
      title={view.title}
      aria-label={view.label ? `${view.title}` : `Version ${__APP_VERSION__} — check for updates`}
      aria-busy={view.busy || busy}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: view.label && view.tone !== 'idle' ? '2px 8px' : '2px 4px',
        margin: 0,
        background: chipBg,
        border: 'none',
        borderRadius: 'var(--cth-radius-sm, 2px)',
        // 'latest' is a quiet word after the version, not a chip asking for a click.
        boxShadow: view.label && view.tone !== 'idle' ? 'inset 0 0 0 1px var(--cth-ink-300)' : 'none',
        fontFamily: 'var(--cth-font-ui)',
        fontSize: 13,
        lineHeight: '18px',
        color: view.tone === 'idle' ? 'var(--cth-ink-500)' : 'var(--cth-ink-900)',
        cursor: interactive ? 'pointer' : 'default'
      }}
    >
      <span>v{__APP_VERSION__}</span>
      {view.label && (
        <>
          <span aria-hidden style={{ color: 'var(--cth-ink-500)' }}>·</span>
          <span style={{ fontWeight: view.tone === 'idle' ? 400 : 600 }}>{view.label}</span>
        </>
      )}
    </button>

    {/* A successful "you are already current" check must be visible, or it is
        indistinguishable from a dead click. Shows only for the manual-check
        no-update result, and auto-dismisses. */}
    {checkedOk && (
      <div
        role="status"
        aria-live="polite"
        className="cth-titlebar-nodrag"
        style={{
          position: 'absolute', top: 'calc(100% + 6px)', left: 0, zIndex: 400,
          width: 300, padding: '10px 12px',
          background: 'var(--cth-paper-100)', color: INK,
          border: `2px solid ${INK}`, boxShadow: `4px 4px 0 ${INK}`,
          fontFamily: 'var(--cth-font-ui)', fontSize: 12.5, lineHeight: 1.5, textAlign: 'left'
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontFamily: 'var(--cth-font-mono, monospace)', fontWeight: 700, fontSize: 13 }}>
          <span aria-hidden style={{
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            width: 18, height: 18, borderRadius: 'var(--cth-radius-pill, 999px)',
            background: 'var(--cth-mint-light, #d0f0e0)', color: 'var(--cth-ink-900)', fontSize: 12
          }}>&#10003;</span>
          You are on the latest version.
        </div>
        <div style={{ marginTop: 4, color: 'var(--cth-ink-700)' }}>
          v{__APP_VERSION__} is the newest release. Checked just now.
        </div>
      </div>
    )}
    </span>
  );
}
