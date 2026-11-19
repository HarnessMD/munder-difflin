/**
 * 0.5.3, bug 9. The installer in main refuses in English. When a refusal is one
 * of the measured limits it also sends a code and the numbers, and this turns
 * those into a sentence in the person's language. Anything without a code (a
 * network error, a GitHub status) is shown as main sent it.
 */
import type { TFunction } from 'i18next';

export const SKILL_REFUSAL_CODES = ['too-many-files', 'too-large', 'file-too-large', 'too-deep'] as const;

export function skillInstallError(
  t: TFunction,
  res: { error?: string; code?: string; detail?: Record<string, string | number> },
  fallback: string
): string {
  if (res.code && (SKILL_REFUSAL_CODES as readonly string[]).includes(res.code)) {
    return t(`skillInstall.refused.${res.code}`, res.detail ?? {});
  }
  return res.error || fallback;
}
