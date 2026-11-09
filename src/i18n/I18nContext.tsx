import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';

import { usePreferences } from '../app/PreferencesContext';
import { languages, messages, type Language, type MessageKey } from './messages';

interface I18nValue {
  language: Language;
  /** Translates a key, replacing {name} markers with the supplied values. */
  t: (key: MessageKey, values?: Record<string, string | number>) => string;
  /** Applies immediately across the entire site and remembers the choice. */
  setLanguage: (language: Language) => Promise<void>;
}

const I18nContext = createContext<I18nValue | null>(null);

// The browser copy lets a visitor pick a language before signing in.
const STORAGE_KEY = 'morapay.language';

function isLanguage(value: unknown): value is Language {
  return typeof value === 'string' && languages.some(item => item.value === value);
}

function storedLanguage(): Language | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return isLanguage(value) ? value : null;
  } catch {
    return null;
  }
}

/**
 * The interface language is fully reactive: changing language takes effect
 * instantly across all pages and components, synchronizes with localStorage,
 * and persists to user preferences when available.
 */
export function I18nProvider({ children }: { children: ReactNode }) {
  const { data, save } = usePreferences();

  // Active language in local state: priority to localStorage, default to 'fr'
  const [activeLanguage, setActiveLanguage] = useState<Language>(() => {
    const stored = storedLanguage();
    if (stored) return stored;
    return 'fr';
  });

  // Sync if saved preferences from server arrive and no manual browser choice was made
  useEffect(() => {
    const saved = data?.preferences?.language;
    if (isLanguage(saved) && !storedLanguage()) {
      setActiveLanguage(saved);
    }
  }, [data?.preferences?.language]);

  const language = activeLanguage;

  useEffect(() => {
    document.documentElement.lang = language;
  }, [language]);

  const t = useCallback(
    (key: MessageKey, values?: Record<string, string | number>) => {
      const template =
        messages[language]?.[key] ??
        messages.fr?.[key] ??
        messages.en?.[key] ??
        String(key);

      if (!values) return template;

      return Object.entries(values).reduce(
        (text, [name, value]) =>
          text.replaceAll(`{${name}}`, String(value)),
        template,
      );
    },
    [language],
  );

  const setLanguage = useCallback(
    async (next: Language) => {
      // 1. Immediate UI reactivity
      setActiveLanguage(next);

      // 2. Immediate local storage persistence
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Not fatal
      }

      document.documentElement.lang = next;

      // 3. Optional remote preference sync
      if (!data) return;

      try {
        await save({
          section: 'preferences',
          values: { ...data.preferences, language: next },
        });
      } catch {
        // Preference saving to remote profile should not break immediate UI translation
      }
    },
    [data, save],
  );

  const value = useMemo(
    () => ({ language, t, setLanguage }),
    [language, t, setLanguage],
  );

  return (
    <I18nContext.Provider value={value}>{children}</I18nContext.Provider>
  );
}

export function useTranslation() {
  const value = useContext(I18nContext);

  if (!value) {
    throw new Error('I18nProvider is required');
  }

  return value;
}
