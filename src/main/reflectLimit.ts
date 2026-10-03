/** Recognize provider limit banners, not arbitrary summary content. Call only
 *  after structured summary parsing failed (or on a CLI error). */
export function limitResponse(text: string): string | null {
  const plain = text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  const line = plain.split(/\r?\n/).find(s =>
    /\b(?:rate[ -]?limit(?:ed|ing)?|quota (?:exceeded|exhausted)|insufficient_quota|too many requests|429|hit your (?:(?:weekly|daily|monthly|usage) )?limit)\b/i.test(s)
  );
  return line?.trim().slice(0, 2000) || null;
}

export function limitRetryAt(detail: string, now: number, fallbackMs: number): number {
  const relative = /retry (?:after|in)\s+(\d+(?:\.\d+)?)\s*(seconds?|minutes?|hours?|s|m|h)\b/i.exec(detail);
  if (relative) {
    const unit = relative[2][0].toLowerCase();
    const delay = Number(relative[1]) * (unit === 'h' ? 3_600_000 : unit === 'm' ? 60_000 : 1000);
    if (Number.isFinite(delay) && delay > 0) return now + delay;
  }
  // Claude's subscription banner includes an explicit UTC reset. Do not guess
  // at an unspecified timezone; retain the banner in the log + use backoff.
  const reset = /resets\s+([A-Za-z]{3})\s+(\d{1,2}),?\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*\(UTC\)/i.exec(detail);
  if (reset) {
    const month = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'].indexOf(reset[1].toLowerCase());
    const day = Number(reset[2]), hour = Number(reset[3]), minute = Number(reset[4] ?? 0);
    if (month >= 0 && day >= 1 && day <= 31 && hour >= 1 && hour <= 12 && minute < 60) {
      const h = hour % 12 + (reset[5].toLowerCase() === 'pm' ? 12 : 0);
      const candidate = Date.UTC(new Date(now).getUTCFullYear(), month, day, h, minute);
      // Stale banners are not a license to postpone a whole year or retry now.
      const date = new Date(candidate);
      if (date.getUTCMonth() === month && date.getUTCDate() === day && candidate > now && candidate - now <= 8 * 86_400_000) return candidate;
    }
  }
  return now + fallbackMs;
}
