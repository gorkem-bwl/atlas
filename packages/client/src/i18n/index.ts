import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

// Only English is bundled upfront so initial render has strings
// immediately. The other 4 locales load on demand when the user
// switches languages — saves ~3.2 MB of upfront bundle on English-
// default loads (the common case).
import en from './locales/en.json';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', label: 'English' },
  { code: 'de', label: 'Deutsch' },
  { code: 'fr', label: 'Français' },
  { code: 'it', label: 'Italiano' },
  { code: 'tr', label: 'Türkçe' },
] as const;

export type LanguageCode = (typeof SUPPORTED_LANGUAGES)[number]['code'];

const LOCALE_LOADERS: Record<Exclude<LanguageCode, 'en'>, () => Promise<{ default: Record<string, unknown> }>> = {
  de: () => import('./locales/de.json'),
  fr: () => import('./locales/fr.json'),
  it: () => import('./locales/it.json'),
  tr: () => import('./locales/tr.json'),
};

// Dedupe simultaneous load requests — the `languageChanged` handler can
// fire twice in quick succession on init (detector resolves, app toggles
// soon after) and both would start their own dynamic import otherwise.
const inFlight = new Map<string, Promise<void>>();

async function loadLanguage(code: string): Promise<void> {
  if (code === 'en' || i18n.hasResourceBundle(code, 'translation')) return;
  const existing = inFlight.get(code);
  if (existing) return existing;
  const loader = LOCALE_LOADERS[code as Exclude<LanguageCode, 'en'>];
  if (!loader) return;
  const promise = loader()
    .then((mod) => { i18n.addResourceBundle(code, 'translation', mod.default); })
    .catch((err) => { console.error(`Failed to load locale ${code}`, err); })
    .finally(() => { inFlight.delete(code); });
  inFlight.set(code, promise);
  return promise;
}

// Register the loader BEFORE .init(). .init() triggers changeLanguage()
// internally once the detector resolves, which fires `languageChanged`;
// if we registered the handler after .init(), we'd miss that first event
// for the common case (user's stored language is not English).
i18n.on('languageChanged', (lng) => {
  void loadLanguage(lng);
});

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      // de, fr, it, tr added on demand via loadLanguage()
    },
    fallbackLng: 'en',
    supportedLngs: ['en', 'de', 'fr', 'it', 'tr'],
    interpolation: {
      escapeValue: false,
    },
    detection: {
      order: ['localStorage', 'navigator'],
      lookupLocalStorage: 'atlasmail-language',
      caches: ['localStorage'],
    },
  });

export default i18n;
