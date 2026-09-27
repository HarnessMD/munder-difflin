/**
 * The revision of Pam's Professional kit that this build was pasted from.
 *
 * WHY THIS CONSTANT EXISTS. tokens.css carries the Professional block as a COPY
 * of hive/shared/design/professional-kit/tokens.css, and that file is live: it
 * changed under this fork once already, five minutes after it was taken, which
 * nearly produced a good-faith bug report against a doc that was actually right.
 * Pam added `--cth-kit-version` so a consumer can assert which revision it holds
 * rather than infer it; this is the assertion side of that contract.
 *
 * WHEN YOU RE-PASTE THE KIT, BUMP THIS. test/professional-kit-sync.test.cjs
 * fails if the stamp in tokens.css and this constant disagree, and also if the
 * shared kit is reachable and has moved ahead of both.
 */
export const EXPECTED_KIT_VERSION = '2026-09-02.1';

/** The revision actually stamped on <html> at runtime. Empty when the token is
 *  absent (an older paste, or no DOM). */
export function liveKitVersion(): string {
  try {
    return getComputedStyle(document.documentElement)
      .getPropertyValue('--cth-kit-version').trim().replace(/^"|"$/g, '');
  } catch {
    return '';
  }
}
