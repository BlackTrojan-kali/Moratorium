import {
  createContext,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { useAuth } from './AuthContext';

import {
  getAccountSettings,
  updateAccountSettings,
} from '../features/settings/api';

import type {
  AccountSettings,
  SettingsUpdate,
} from '../features/settings/api';

import '../styles/settings.css';

interface PreferencesContextValue {
  data: AccountSettings | null;
  loading: boolean;
  saving: boolean;
  error: string;
  reload: () => void;
  save: (update: SettingsUpdate) => Promise<void>;
}

const PreferencesContext =
  createContext<PreferencesContextValue | null>(null);

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to load your settings.';
}

export function PreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  return (
    <PreferencesSession key={user?.id ?? 'signed-out'}>
      {children}
    </PreferencesSession>
  );
}

function PreferencesSession({
  children,
}: {
  children: ReactNode;
}) {
  const { user } = useAuth();

  const [data, setData] =
    useState<AccountSettings | null>(null);

  const [loading, setLoading] = useState(Boolean(user));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [revision, setRevision] = useState(0);

  const lock = useRef(false);

  useEffect(() => {
    if (!user) return;

    let active = true;

    setLoading(true);
    setError('');

    getAccountSettings()
      .then(result => {
        if (active) setData(result);
      })
      .catch(caught => {
        if (active) setError(errorMessage(caught));
      })
      .finally(() => {
        if (active) setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [user?.id, revision]);

  const mode = data?.preferences.theme;
  const language = data?.preferences.language;

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia(
      '(prefers-color-scheme: dark)',
    );

    const previousTheme = root.getAttribute('data-theme');
    const previousLanguage = root.lang;

    function applyTheme() {
      const dark =
        mode === 'dark' ||
        (mode === 'system' && media.matches);

      if (mode) {
        root.dataset.theme = dark ? 'dark' : 'light';
      }
    }

    applyTheme();

    if (language) {
      root.lang = language;
    }

    media.addEventListener('change', applyTheme);

    return () => {
      media.removeEventListener('change', applyTheme);

      if (previousTheme === null) {
        root.removeAttribute('data-theme');
      } else {
        root.setAttribute('data-theme', previousTheme);
      }

      root.lang = previousLanguage;
    };
  }, [mode, language]);

  async function save(update: SettingsUpdate) {
    if (!data) {
      throw new Error('Load your settings before saving.');
    }

    if (lock.current) {
      throw new Error('A settings change is already being saved.');
    }

    lock.current = true;
    setSaving(true);

    try {
      const result = await updateAccountSettings(
        update,
        data.version,
        data.csrfToken,
      );

      setData(result);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return (
    <PreferencesContext.Provider
      value={{
        data,
        loading,
        saving,
        error,
        reload: () => {
          if (!lock.current) {
            setRevision(value => value + 1);
          }
        },
        save,
      }}
    >
      {children}
    </PreferencesContext.Provider>
  );
}

export function usePreferences() {
  const context = useContext(PreferencesContext);

  if (!context) {
    throw new Error('PreferencesProvider is required.');
  }

  return context;
}