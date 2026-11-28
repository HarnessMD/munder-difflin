/**
 * THE SYSTEM LANGUAGE, FOR ONBOARDING'S PICKER (founder, 6 Nov 2026). A fresh install's first onboarding screen starts
 * in the computer's language when the app has it, else English. Only there: the app itself never reads the system
 * language (i18n/index.ts), so nobody who already uses the app is moved.
 *
 * `wanted` is navigator.languages in order of preference. An exact code wins (pt-BR), then the language part (pt picks
 * pt-BR, de-AT picks de). Chinese is matched as Simplified only: zh, zh-CN, zh-SG, zh-Hans; a Traditional Chinese
 * system (zh-TW, zh-HK, zh-MO, zh-Hant) is not moved to Simplified and goes on to its next language.
 */
export function systemLanguageOf(wanted: readonly string[] | null | undefined, offered: readonly string[]): string {
  const lower = new Map(offered.map((c) => [c.toLowerCase(), c]));
  for (const raw of wanted ?? []) {
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const tag = raw.trim().replace(/_/g, '-').toLowerCase();
    const base = tag.split('-')[0];
    if (base === 'zh') {
      if (/^zh(-(cn|sg|hans)(-.*)?)?$/.test(tag) && lower.has('zh-cn')) return lower.get('zh-cn')!;
      continue;
    }
    const exact = lower.get(tag);
    if (exact) return exact;
    const byBase = lower.get(base) ?? offered.find((c) => c.toLowerCase().split('-')[0] === base);
    if (byBase) return byBase;
  }
  return offered.includes('en') ? 'en' : offered[0];
}
