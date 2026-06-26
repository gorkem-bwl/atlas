import fs from 'fs';
import path from 'path';
import { logger } from './logger';

// ─── Constants ─────────────────────────────────────────────────────

/**
 * Sentinel prefix identifying a translation key stored in the database.
 * Any string beginning with this prefix is treated as an i18n lookup key;
 * the remainder of the string is the dot-path into the locale JSON.
 *
 * Example: `__i18n:crm.workflows.seeds.names.qualifiedScheduleDemo`
 */
export const I18N_KEY_PREFIX = '__i18n:';

export const SUPPORTED_LANGUAGES = ['en', 'tr', 'de', 'fr', 'it', 'ru'] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

const DEFAULT_LANGUAGE: SupportedLanguage = 'en';

// ─── Locale loading ────────────────────────────────────────────────

// Server runs from either src/utils (ts-node) or dist/utils (compiled).
// The relative depth to the repo root is the same in both cases.
const LOCALES_DIR = path.resolve(__dirname, '../../../../client/src/i18n/locales');

const localeCache: Partial<Record<SupportedLanguage, Record<string, unknown>>> = {};

function loadLocale(lang: SupportedLanguage): Record<string, unknown> {
  if (localeCache[lang]) return localeCache[lang]!;

  try {
    const filePath = path.join(LOCALES_DIR, `${lang}.json`);
    const raw = fs.readFileSync(filePath, 'utf8');
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    localeCache[lang] = parsed;
    return parsed;
  } catch (error) {
    logger.warn({ error, lang, localesDir: LOCALES_DIR }, 'Failed to load locale file; falling back to empty dict');
    localeCache[lang] = {};
    return {};
  }
}

function lookup(dict: Record<string, unknown>, dotPath: string): string | undefined {
  const parts = dotPath.split('.');
  let current: unknown = dict;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in (current as Record<string, unknown>)) {
      current = (current as Record<string, unknown>)[part];
    } else {
      return undefined;
    }
  }
  return typeof current === 'string' ? current : undefined;
}

function normalizeLang(lang: string | null | undefined): SupportedLanguage {
  if (!lang) return DEFAULT_LANGUAGE;
  const short = lang.toLowerCase().split('-')[0] as SupportedLanguage;
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(short) ? short : DEFAULT_LANGUAGE;
}

// ─── Public API ────────────────────────────────────────────────────

/**
 * Translate a dot-path key into the given language.
 * Falls back to English, then to the key itself (so missing keys are visible).
 */
export function translate(key: string, lang: string | null | undefined, fallback?: string): string {
  const normalized = normalizeLang(lang);
  const primary = lookup(loadLocale(normalized), key);
  if (primary !== undefined) return primary;

  if (normalized !== DEFAULT_LANGUAGE) {
    const fallbackValue = lookup(loadLocale(DEFAULT_LANGUAGE), key);
    if (fallbackValue !== undefined) return fallbackValue;
  }

  return fallback ?? key;
}

/**
 * If the string is a translation key (starts with `__i18n:`), translate it.
 * Otherwise return the string unchanged. Null/undefined becomes empty string.
 */
export function resolveMaybeKey(str: string | null | undefined, lang: string | null | undefined): string {
  if (str === null || str === undefined) return '';
  if (typeof str !== 'string') return String(str);
  if (!str.startsWith(I18N_KEY_PREFIX)) return str;
  const key = str.slice(I18N_KEY_PREFIX.length);
  return translate(key, lang, str);
}

/**
 * Build a fully-prefixed i18n key from a dot-path.
 */
export function i18nKey(dotPath: string): string {
  return `${I18N_KEY_PREFIX}${dotPath}`;
}
