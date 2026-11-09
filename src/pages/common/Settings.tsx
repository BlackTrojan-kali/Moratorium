import {
  useEffect,
  useRef,
  useState,
} from 'react';
import { useSearchParams } from 'react-router-dom';

import { useAuth } from '../../app/AuthContext';
import { usePreferences } from '../../app/PreferencesContext';

import {
  roleLabelKeys,
  rolePhotoByRole,
} from '../../config/roles';

import {
  changeAccountPassword,
} from '../../features/settings/api';

import { UserAccounts } from '../../features/admin/UserAccounts';

import { useTranslation } from '../../i18n/I18nContext';

import type { AuthUser } from '../../types/domain';

import type { MessageKey } from '../../i18n/messages';

import type {
  AccountSettings,
  SettingsUpdate,
  ThemeMode,
} from '../../features/settings/api';

// Identity (name, email, phone, organisation) lives on the Profile page, so
// Settings only covers behaviour: security, notifications and appearance.
type Tab = 'security' | 'notifications' | 'preferences' | 'users';

const baseTabs: { id: Tab; labelKey: MessageKey }[] = [
  { id: 'security', labelKey: 'settings.tab.security' },
  { id: 'notifications', labelKey: 'settings.tab.notifications' },
  { id: 'preferences', labelKey: 'settings.tab.preferences' },
];

// Only the administrator assigns roles, so only they see the users section.
const administratorTabs: { id: Tab; labelKey: MessageKey }[] = [
  ...baseTabs,
  { id: 'users', labelKey: 'settings.tab.users' },
];

const themes: {
  value: ThemeMode;
  label: string;
  description: string;
}[] = [
  {
    value: 'light',
    label: 'Light',
    description: 'A bright appearance.',
  },
  {
    value: 'dark',
    label: 'Dark',
    description: 'A darker appearance.',
  },
  {
    value: 'system',
    label: 'System default',
    description: 'Follow your device settings.',
  },
];

function messageFor(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to complete this action.';
}

export interface SettingItem {
  id: string;
  label: string;
  value: string | null;
}

interface SettingsProps {
  scope?: 'account' | 'system';
  initialTab?: Tab;
  items?: SettingItem[];
  loading?: boolean;
  error?: string | null;
}

export function Settings({
  scope = 'account',
  initialTab,
  items,
  loading = false,
  error = null,
}: SettingsProps) {
  // Preserve the separate administrator system page.
  if (scope === 'system') {
    return (
      <div className="page">
        <header className="page-heading">
          <p className="page-heading-eyebrow">Administration</p>
          <h1>System settings</h1>
          <p>Review system configuration.</p>
        </header>

        <section className="page-card">
          {loading ? (
            <p role="status">Loading system settings…</p>
          ) : error ? (
            <p role="alert">{error}</p>
          ) : !items ? (
            <p>System settings are unavailable.</p>
          ) : items.length === 0 ? (
            <p>No system settings available.</p>
          ) : (
            <dl className="settings-details">
              {items.map(item => (
                <div key={item.id}>
                  <dt>{item.label}</dt>
                  <dd>{item.value ?? 'Unavailable'}</dd>
                </div>
              ))}
            </dl>
          )}
        </section>
      </div>
    );
  }

  return <PersonalSettings initialTab={initialTab} />;
}

function PersonalSettings({ initialTab }: { initialTab?: Tab }) {
  const { data, loading, error, reload } = usePreferences();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();

  const tabs =
    user?.role === 'administrator' ? administratorTabs : baseTabs;

  const validTabs = tabs.map(item => item.id);
  const requested = (initialTab ?? searchParams.get('tab')) as Tab;

  const [tab, setTabState] = useState<Tab>(
    validTabs.includes(requested) ? requested : 'security'
  );

  useEffect(() => {
    const next = searchParams.get('tab') as Tab;
    if (next && validTabs.includes(next) && next !== tab) {
      setTabState(next);
    }
  }, [searchParams]);

  function handleTabChange(nextTab: Tab) {
    setTabState(nextTab);
    setSearchParams({ tab: nextTab }, { replace: true });
  }

  return (
    <div className="page">
      <header className="page-heading">
        <p className="page-heading-eyebrow">{t('settings.eyebrow')}</p>
        <h1>{t('settings.title')}</h1>
        <p>{t('settings.lead')}</p>
      </header>

      {loading ? (
        <div className="page-card" role="status">
          {t('settings.loading')}
        </div>
      ) : error ? (
        <div className="page-card" role="alert">
          <div className="page-empty">
            <p className="page-alert">{error}</p>

            <button type="button" className="page-button" onClick={reload}>
              {t('settings.retry')}
            </button>
          </div>
        </div>
      ) : data ? (
        <SettingsEditor
          key={data.version}
          data={data}
          tab={tab}
          tabs={tabs}
          onTab={handleTabChange}
        />
      ) : (
        <div className="page-card">
          {t('settings.unavailable')}
        </div>
      )}
    </div>
  );
}

function SettingsNav({
  user,
  displayName,
  tabs,
  tab,
  busy,
  onSelect,
}: {
  user: AuthUser;
  displayName: string;
  tabs: { id: Tab; labelKey: MessageKey }[];
  tab: Tab;
  busy: boolean;
  onSelect: (tab: Tab) => void;
}) {
  const { t } = useTranslation();

  return (
    <aside className="page-card settings-navigation">
      <div className="settings-person">
        <img src={rolePhotoByRole[user.role]} alt="" />
        <strong>{displayName}</strong>
        <span>{t(roleLabelKeys[user.role])}</span>
      </div>

      <nav aria-label="Settings categories">
        {tabs.map(item => (
          <button
            key={item.id}
            type="button"
            disabled={busy}
            aria-current={tab === item.id ? 'page' : undefined}
            onClick={() => onSelect(item.id)}
          >
            {t(item.labelKey)}
            <span aria-hidden="true">›</span>
          </button>
        ))}
      </nav>
    </aside>
  );
}

function SettingsEditor({
  data,
  tab,
  tabs,
  onTab,
}: {
  data: AccountSettings;
  tab: Tab;
  tabs: { id: Tab; labelKey: MessageKey }[];
  onTab: (tab: Tab) => void;
}) {
  const { user } = useAuth();
  const { t, setLanguage } = useTranslation();
  const { save, reload, saving } = usePreferences();

  const [notifications, setNotifications] =
    useState(data.notifications);
  const [preferences, setPreferences] =
    useState(data.preferences);

  const [currentPassword, setCurrentPassword] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [mustReload, setMustReload] = useState(false);

  const lock = useRef(false);

  const dirty =
    JSON.stringify(notifications) !== JSON.stringify(data.notifications) ||
    JSON.stringify(preferences) !== JSON.stringify(data.preferences) ||
    Boolean(currentPassword || password || confirmation);

  const disabled = busy || saving || mustReload;

  useEffect(() => {
    function warnBeforeClose(event: BeforeUnloadEvent) {
      if (dirty || lock.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    }

    function warnBeforeLink(event: MouseEvent) {
      if (!dirty && !lock.current) return;

      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const link =
        event.target instanceof Element
          ? event.target.closest('a')
          : null;

      if (
        !link ||
        link.target === '_blank' ||
        link.hasAttribute('download')
      ) return;

      if (
        lock.current ||
        !window.confirm('Discard your unsaved changes?')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener('beforeunload', warnBeforeClose);
    document.addEventListener('click', warnBeforeLink, true);

    return () => {
      window.removeEventListener('beforeunload', warnBeforeClose);
      document.removeEventListener('click', warnBeforeLink, true);
    };
  }, [dirty]);

  function reset() {
    setNotifications(data.notifications);
    setPreferences(data.preferences);
    setCurrentPassword('');
    setPassword('');
    setConfirmation('');

    if (!mustReload) setError('');
  }

  function selectTab(next: Tab) {
    if (lock.current || saving || next === tab) return;

    if (
      dirty &&
      !window.confirm('Discard changes and open another category?')
    ) return;

    reset();
    onTab(next);
  }

  async function submit() {
    if (lock.current || disabled) return;

    setError('');

    if (tab === 'security' && password !== confirmation) {
      setError('The new passwords do not match.');
      return;
    }

    lock.current = true;
    setBusy(true);

    try {
      if (tab === 'security') {
        await changeAccountPassword(
          currentPassword,
          password,
          data.csrfToken,
        );

        // Match the existing password-change flow:
        // require sign-in again after a successful change.
        window.dispatchEvent(new Event('auth-expired'));
        window.location.assign('/login?changed=1');
        return;
      }

      let update: SettingsUpdate;

      if (tab === 'notifications') {
        update = {
          section: 'notifications',
          values: notifications.map(item => ({
            id: item.id,
            channels: item.channels
              .filter(channel => channel.editable && !channel.required)
              .map(channel => ({
                id: channel.id,
                enabled: channel.enabled,
              })),
          })),
        };
      } else {
        update = {
          section: 'preferences',
          values: preferences,
        };
      }

      await save(update);
    } catch (caught) {
      setError(messageFor(caught));

      // Do not blindly repeat a write after an uncertain result.
      if (tab !== 'security') setMustReload(true);
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  if (!user) return null;

  // Account administration is a list of records, not a settings form, so it is
  // rendered outside the form element.
  if (tab === 'users') {
    return (
      <div className="settings-layout">
        <SettingsNav
          user={user}
          displayName={data.account.displayName}
          tabs={tabs}
          tab={tab}
          busy={busy || saving}
          onSelect={selectTab}
        />

        <section className="page-card settings-form">
          <header className="page-card-heading settings-section-heading">
            <div>
              <h2>{t('settings.usersTitle')}</h2>
              <p>{t('settings.usersLead')}</p>
            </div>
          </header>

          <UserAccounts />
        </section>
      </div>
    );
  }

  return (
    <div className="settings-layout">
      <SettingsNav
        user={user}
        displayName={data.account.displayName}
        tabs={tabs}
        tab={tab}
        busy={busy || saving}
        onSelect={selectTab}
      />

      <form
        className="page-card settings-form"
        aria-busy={busy || saving}
        onSubmit={event => {
          event.preventDefault();
          void submit();
        }}
      >
        <header className="page-card-heading settings-section-heading">
          <div>
            <h2>
              {t(
                tabs.find(item => item.id === tab)?.labelKey ??
                  'settings.tab.security',
              )}
            </h2>

            <p>
              {tab === 'security' && t('settings.lead.security')}
              {tab === 'notifications' && t('settings.lead.notifications')}
              {tab === 'preferences' && t('settings.lead.preferences')}
            </p>
          </div>
        </header>

        {error && (
          <div className="page-alert" role="alert">
            <span>{error}</span>

            {mustReload && (
              <>
                <span>
                  Reload saved settings before making another change.
                </span>

                <button
                  type="button"
                  className="page-button"
                  onClick={() => {
                    if (
                      !dirty ||
                      window.confirm('Reload and discard unsaved changes?')
                    ) reload();
                  }}
                >
                  Reload settings
                </button>
              </>
            )}
          </div>
        )}

        <fieldset disabled={disabled}>
          {tab === 'security' && (
            data.security.canChangePassword ? (
              <div className="settings-passwords">
                <h3>Change password</h3>

                <label>
                  Current password
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    autoComplete="current-password"
                    required
                    value={currentPassword}
                    onChange={event =>
                      setCurrentPassword(event.target.value)
                    }
                  />
                </label>

                <label>
                  New password
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    minLength={data.security.minimumLength}
                    maxLength={data.security.maximumLength}
                    value={password}
                    onChange={event => setPassword(event.target.value)}
                  />
                </label>

                <label>
                  Confirm new password
                  <input
                    type={showPasswords ? 'text' : 'password'}
                    autoComplete="new-password"
                    required
                    value={confirmation}
                    onChange={event =>
                      setConfirmation(event.target.value)
                    }
                  />
                </label>

                <label className="settings-checkbox">
                  <input
                    type="checkbox"
                    checked={showPasswords}
                    onChange={event =>
                      setShowPasswords(event.target.checked)
                    }
                  />
                  Show passwords
                </label>

                <ul className="settings-note">
                  {data.security.requirements.map((rule, index) => (
                    <li key={index}>{rule}</li>
                  ))}
                </ul>

                <p className="settings-note">
                  After changing your password, sign in again.
                </p>
              </div>
            ) : (
              <p className="settings-note">
                Password changes are managed by your organisation.
              </p>
            )
          )}

          {tab === 'notifications' && (
            <>
              {notifications.length === 0 ? (
                <p>No notification preferences are available.</p>
              ) : (
                notifications.map(item => (
                  <section className="settings-notification" key={item.id}>
                    <div>
                      <h3>{item.label}</h3>
                      {item.description && <p>{item.description}</p>}
                    </div>

                    <div className="settings-channels">
                      {item.channels.map(channel => (
                        <label
                          className="settings-checkbox"
                          key={channel.id}
                        >
                          <input
                            type="checkbox"
                            checked={channel.enabled}
                            disabled={!channel.editable || channel.required}
                            onChange={event => {
                              const enabled = event.target.checked;

                              setNotifications(current =>
                                current.map(row =>
                                  row.id !== item.id
                                    ? row
                                    : {
                                        ...row,
                                        channels: row.channels.map(value =>
                                          value.id !== channel.id
                                            ? value
                                            : { ...value, enabled },
                                        ),
                                      },
                                ),
                              );
                            }}
                          />

                          {channel.label}
                          {channel.required && <small>Required</small>}
                        </label>
                      ))}
                    </div>
                  </section>
                ))
              )}

              <p className="settings-note">
                Required service notices cannot be switched off.
              </p>
            </>
          )}

          {tab === 'preferences' && (
            <>
              <div className="settings-row">
                <div>
                  <label htmlFor="settings-language">
                    {t('settings.language')}
                  </label>
                  <p>{t('settings.languageHint')}</p>
                </div>

                <select
                  id="settings-language"
                  required
                  value={preferences.language}
                  onChange={event => {
                    const language = event.target.value;

                    setPreferences(current => ({ ...current, language }));
                    // Apply at once so the page switches without saving.
                    void setLanguage(language as 'en' | 'fr');
                  }}
                >
                  <option value="" disabled>{t('settings.languageChoose')}</option>

                  {data.options.languages.map(item => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>

              <section className="settings-appearance">
                <h3>Appearance</h3>
                <p>Choose how MoraPay looks.</p>

                <div className="settings-theme-grid">
                  {themes.map(theme => (
                    <label
                      className={`settings-theme ${
                        preferences.theme === theme.value ? 'is-selected' : ''
                      }`}
                      key={theme.value}
                    >
                      <span className="settings-theme-name">
                        <input
                          type="radio"
                          name="appearance"
                          value={theme.value}
                          checked={preferences.theme === theme.value}
                          onChange={() =>
                            setPreferences(current => ({
                              ...current,
                              theme: theme.value,
                            }))
                          }
                        />
                        {theme.label}
                      </span>

                      <span
                        className={`settings-preview preview-${theme.value}`}
                        aria-hidden="true"
                      >
                        <span />
                        <span />
                        <span />
                      </span>

                      <small>{theme.description}</small>
                    </label>
                  ))}
                </div>
              </section>

              <div className="settings-row">
                <div>
                  <label htmlFor="settings-date">Date display</label>
                  <p>Choose your preferred date format.</p>
                </div>

                <select
                  id="settings-date"
                  required
                  value={preferences.dateFormat}
                  onChange={event =>
                    setPreferences(current => ({
                      ...current,
                      dateFormat: event.target.value,
                    }))
                  }
                >
                  <option value="" disabled>Select format</option>

                  {data.options.dateFormats.map(item => (
                    <option key={item.value} value={item.value}>
                      {item.label}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}
        </fieldset>

        <footer className="settings-footer">
          <span role="status">
            {busy || saving
              ? 'Saving…'
              : dirty
                ? 'Unsaved changes'
                : 'No unsaved changes'}
          </span>

          <div>
            <button
              type="button"
              className="page-button"
              disabled={busy || saving}
              onClick={reset}
            >
              Cancel
            </button>

            <button
              type="submit"
              className="settings-primary"
              disabled={
                disabled ||
                !dirty ||
                (tab === 'security' && !data.security.canChangePassword)
              }
            >
              {tab === 'security' ? 'Update password' : 'Save changes'}
            </button>
          </div>
        </footer>
      </form>
    </div>
  );
}