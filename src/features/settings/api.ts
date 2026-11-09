import { api } from '../../app/api';

export type ThemeMode = 'light' | 'dark' | 'system';

export interface PreferenceValues {
  language: string;
  theme: ThemeMode;
  dateFormat: string;
}

export interface SettingsAccount {
  displayName: string;
  email: string | null;
  phone: string | null;
  organisation: string | null;
  officialIdentifier: string | null;
  editable: Array<
    'displayName' | 'email' | 'phone' | 'organisation' | 'officialIdentifier'
  >;
}

export interface NotificationPreference {
  id: string;
  label: string;
  description: string | null;
  channels: {
    id: string;
    label: string;
    enabled: boolean;
    editable: boolean;
    required: boolean;
  }[];
}

export interface AccountSettings {
  version: string;
  csrfToken: string;

  account: SettingsAccount;

  security: {
    canChangePassword: boolean;
    minimumLength: number;
    maximumLength: number;
    requirements: string[];
  };

  notifications: NotificationPreference[];

  preferences: PreferenceValues;

  options: {
    languages: {
      value: string;
      label: string;
    }[];

    dateFormats: {
      value: string;
      label: string;
    }[];
  };
}

export type SettingsUpdate =
  | {
      section: 'account';
      values: Partial<
        Pick<
          SettingsAccount,
          'displayName' | 'email' | 'phone' | 'organisation' | 'officialIdentifier'
        >
      >;
    }
  | {
      section: 'notifications';
      values: {
        id: string;
        channels: {
          id: string;
          enabled: boolean;
        }[];
      }[];
    }
  | {
      section: 'preferences';
      values: PreferenceValues;
    };

export function getAccountSettings() {
  return api<AccountSettings>('/settings/account');
}

export function updateAccountSettings(
  update: SettingsUpdate,
  version: string,
  csrfToken: string,
) {
  return api<AccountSettings>(
    '/settings/account',
    {
      ...update,
      version,
      csrfToken,
    },
  );
}

export function changeAccountPassword(
  currentPassword: string,
  password: string,
  csrfToken: string,
) {
  return api('/auth/change-password', {
    currentPassword,
    password,
    csrfToken,
  });
}