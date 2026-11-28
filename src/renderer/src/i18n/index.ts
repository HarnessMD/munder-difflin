/**
 * i18n bootstrap — react-i18next with inline JSON resources.
 *
 * English is the default language (and the fallback for any missing key).
 * The user's choice is persisted in localStorage (`cth.language`). With nothing
 * saved the app starts in English, ALWAYS — it deliberately does not read
 * navigator.language. Auto-detect would change the UI out from under every
 * existing user on a non-English machine, who never asked for a translation and
 * may not want a partial one. Nothing moves until someone picks a language in
 * Settings.
 *
 * Adding a language: drop a `locales/<code>.json` with the exact same key
 * tree as `en.json`, register it in `resources` and `supportedLngs`, and add
 * an entry to `LANGUAGES` (Settings → General exposes the picker from that
 * list). Give it `dir: 'rtl'` if it is a right-to-left script. No other code
 * needs to change.
 *
 * A locale file may also be the empty object `{}`: the language is offered in
 * the picker and reads English everywhere until its translation lands, which
 * replaces that one file and nothing else (0.5.8: de, fr, it, ja, ko and tr
 * arrive this way, each from its own stream). test/i18n-locales.test.cjs holds
 * every file to one of the two shapes: empty, or the whole key tree.
 */
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import { DEFAULT_GOD_NAME } from '@shared/godIdentity';
import en from './locales/en.json';
import zhCN from './locales/zh-CN.json';
import ar from './locales/ar.json';
import es from './locales/es.json';
import ptBR from './locales/pt-BR.json';
import de from './locales/de.json';
import fr from './locales/fr.json';
import it from './locales/it.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import tr from './locales/tr.json';

/**
 * The languages the Settings picker offers, in display order.
 *
 * `dir` is the language's WRITING DIRECTION, and it is the ONLY thing the app
 * keys right-to-left layout off. Not the OS locale, not the content of a
 * document, not a system font — the language the user picked here, and nothing
 * else. That is what makes RTL inert for everybody who has not picked an RTL
 * language: `dir` is 'ltr' for every one of them, so every `isRtl` branch in
 * the renderer takes the same path it took before Arabic existed.
 */
export const LANGUAGES = [
  { code: 'en', label: 'English', dir: 'ltr' },
  { code: 'de', label: 'Deutsch', dir: 'ltr' },
  { code: 'es', label: 'Español', dir: 'ltr' },
  { code: 'fr', label: 'Français', dir: 'ltr' },
  { code: 'it', label: 'Italiano', dir: 'ltr' },
  { code: 'pt-BR', label: 'Português (Brasil)', dir: 'ltr' },
  { code: 'tr', label: 'Türkçe', dir: 'ltr' },
  { code: 'ar', label: 'العربية', dir: 'rtl' },
  { code: 'ja', label: '日本語', dir: 'ltr' },
  { code: 'ko', label: '한국어', dir: 'ltr' },
  { code: 'zh-CN', label: '简体中文', dir: 'ltr' }
] as const;

export type LanguageCode = (typeof LANGUAGES)[number]['code'];

/** Language codes that read right-to-left, derived from LANGUAGES itself so a
 *  new locale cannot be registered with a direction and then forgotten here. */
const RTL_CODES: ReadonlySet<string> = new Set(
  LANGUAGES.filter((l) => l.dir === 'rtl').map((l) => l.code)
);

/**
 * Does this language code read right-to-left?
 *
 * Deliberately EXACT-MATCH on a registered code rather than a prefix or a
 * script guess. An unknown code is left-to-right, which is the direction every
 * user had before this shipped — an unrecognised value must never be able to
 * mirror somebody's UI.
 */
export function isRtlLanguage(lng: string | undefined | null): boolean {
  return !!lng && RTL_CODES.has(lng);
}

/** `'rtl'` or `'ltr'` for a language code, for a `dir` attribute. */
export function directionFor(lng: string | undefined | null): 'rtl' | 'ltr' {
  return isRtlLanguage(lng) ? 'rtl' : 'ltr';
}

const STORAGE_KEY = 'cth.language';

/** Every locale file, by code. */
const RESOURCES: Record<LanguageCode, object> = { en, 'zh-CN': zhCN, ar, es, 'pt-BR': ptBR, de, fr, it, ja, ko, tr };

/**
 * The languages the picker OFFERS: those whose file holds strings. A file that is
 * still `{}` (its stream has not landed) would read English everywhere, so it is
 * not offered, and a saved pick of it starts in English until the file lands.
 */
export const OFFERED_LANGUAGES = LANGUAGES.filter((l) => Object.keys(RESOURCES[l.code]).length > 0);

const SUPPORTED: readonly string[] = OFFERED_LANGUAGES.map((l) => l.code);

/**
 * The orchestrator's display name, for every string that talks about it.
 *
 * The user can rename the god, and roughly forty strings mention it. Baking
 * "Michael" into the locale files would silently undo that rename everywhere at
 * once — a bug this codebase has already fixed three times in the spawn path.
 * So the locales say `{{godName}}` and the live name is supplied here as an
 * i18next DEFAULT VARIABLE, which means no call site has to pass it. A call site
 * that needs a variant (an upper-cased title, say) still overrides it by passing
 * `godName` explicitly.
 */
export function setGodName(name: string | undefined | null): void {
  const next = name?.trim() || DEFAULT_GOD_NAME;
  const interpolation = i18n.options.interpolation ?? (i18n.options.interpolation = {});
  const vars = interpolation.defaultVariables ?? (interpolation.defaultVariables = {});
  if (vars.godName === next) return;
  vars.godName = next;
  // react-i18next re-renders on this event. Without it a rename would only
  // reach strings that happened to re-render for some other reason.
  i18n.emit('languageChanged', i18n.language);
}

/** The saved choice, or English. Never the OS locale — see the note above. */
function detectLanguage(): string {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved && SUPPORTED.includes(saved as LanguageCode)) return saved;
  } catch { /* localStorage unavailable — English it is */ }
  return 'en';
}

/** Whether a language was ever picked on this machine (Settings, or onboarding's picker). */
export function hasSavedLanguage(): boolean {
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    return !!saved && SUPPORTED.includes(saved as LanguageCode);
  } catch { return false; }
}

/** Switch language now and persist the choice for next launch. */
export function setLanguage(lng: string): void {
  void i18n.changeLanguage(lng);
  try { window.localStorage.setItem(STORAGE_KEY, lng); } catch { /* best-effort */ }
}

void i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      'zh-CN': { translation: zhCN },
      ar: { translation: ar },
      es: { translation: es },
      'pt-BR': { translation: ptBR },
      de: { translation: de },
      fr: { translation: fr },
      it: { translation: it },
      ja: { translation: ja },
      ko: { translation: ko },
      tr: { translation: tr }
    },
    lng: detectLanguage(),
    fallbackLng: 'en',
    supportedLngs: ['en', 'zh-CN', 'ar', 'es', 'pt-BR', 'de', 'fr', 'it', 'ja', 'ko', 'tr'],
    // Resources are bundled inline, so nothing ever suspends — the string is
    // there at init time. Keeping this false lets every component call
    // useTranslation() without wrapping the tree in <Suspense>.
    react: { useSuspense: false },
    // `defaultVariables` is what lets every {{godName}} string resolve without
    // its call site knowing god's name. setGodName() keeps it current.
    interpolation: { escapeValue: false, defaultVariables: { godName: DEFAULT_GOD_NAME } },
    returnNull: false
  });

export default i18n;
