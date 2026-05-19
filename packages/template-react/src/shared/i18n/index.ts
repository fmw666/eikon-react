// @eikon:feature(i18n) file
import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import { initReactI18next } from 'react-i18next';

const SUPPORTED_LANGS = ['en', 'zh'] as const;
type SupportedLang = (typeof SUPPORTED_LANGS)[number];

const FALLBACK_LANG: SupportedLang = 'en';

/**
 * Lazy-load a locale's translation bundle.
 *
 * Locale files are intentionally NOT static imports — keeping them as
 * dynamic imports means each language ships in its own chunk and the
 * initial JS payload only includes the active language (plus the i18next
 * runtime itself). Adding a new language requires:
 *   1. Drop the JSON into `./locales/<lang>.json`.
 *   2. Add the code to `SUPPORTED_LANGS` above.
 *   3. Add a case here.
 */
async function loadLocale(
  lng: SupportedLang
): Promise<Record<string, unknown>> {
  switch (lng) {
    case 'en':
      return (await import('./locales/en.json')).default;
    case 'zh':
      return (await import('./locales/zh.json')).default;
  }
}

function isSupported(lng: string): lng is SupportedLang {
  return (SUPPORTED_LANGS as readonly string[]).includes(lng);
}

/**
 * Initialise i18next once with the user's active language pre-loaded,
 * and register a `languageChanged` handler that lazily fetches the
 * resource bundle for any subsequently-activated language.
 *
 * Returns the configured i18next instance once `init()` has resolved AND
 * the initial locale's bundle has been registered, so callers can safely
 * `await initI18n()` before rendering — no flash of fallback keys.
 *
 * Safe to call multiple times; the second call returns the same promise.
 */
let initPromise: Promise<typeof i18n> | null = null;
export function initI18n(): Promise<typeof i18n> {
  if (initPromise) return initPromise;

  initPromise = (async () => {
    await i18n
      .use(LanguageDetector)
      .use(initReactI18next)
      .init({
        // Start with no resources — we hydrate the active language right
        // after init resolves (i18next then knows which one to pick).
        resources: {},
        fallbackLng: FALLBACK_LANG,
        supportedLngs: SUPPORTED_LANGS as unknown as string[],
        interpolation: { escapeValue: false },
        detection: {
          order: ['localStorage', 'navigator'],
          caches: ['localStorage'],
        },
      });

    // Hydrate the active language before returning so first paint has
    // its translations. `i18n.language` is set by the detector inside
    // init(); fall back to the supported fallback if detection produced
    // something unsupported.
    const active = isSupported(i18n.language)
      ? i18n.language
      : FALLBACK_LANG;
    const bundle = await loadLocale(active);
    i18n.addResourceBundle(active, 'translation', bundle);

    i18n.on('languageChanged', (lng) => {
      if (!isSupported(lng)) return;
      if (i18n.hasResourceBundle(lng, 'translation')) return;
      void loadLocale(lng).then((next) => {
        i18n.addResourceBundle(lng, 'translation', next);
      });
    });

    return i18n;
  })();

  return initPromise;
}

export default i18n;
