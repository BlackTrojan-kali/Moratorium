import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Menu, UserRound, X } from 'lucide-react';

import { rolePhotoByRole } from '../config/roles';
import type { AuthUser, UserRole } from '../types/domain';
import { useNotifications } from '../app/NotificationsContext';
import { useTranslation } from '../i18n/I18nContext';
import { LanguageSwitch } from '../i18n/LanguageSwitch';

interface HeaderProps {
  user: AuthUser | null;
  previewRole: UserRole;
  navigationOpen: boolean;
  onToggleNavigation: () => void;
}

export function Header({
  user,
  previewRole,
  navigationOpen,
  onToggleNavigation,
}: HeaderProps) {
  const role = user?.role ?? previewRole;
  const photoUrl = rolePhotoByRole[role];
  const { unreadCount } = useNotifications();
  const { t } = useTranslation();

  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);

  return (
    <header className="workspace-header">
      <button
        type="button"
        className="workspace-icon-button navigation-toggle"
        onClick={onToggleNavigation}
        aria-controls="workspace-navigation"
        aria-expanded={navigationOpen}
        aria-label={
          navigationOpen ? t('shell.closeNavigation') : t('shell.openNavigation')
        }
      >
        {navigationOpen ? <X size={21} /> : <Menu size={21} />}
      </button>

      <span className="workspace-caption">{t('account.brandSubtitle')}</span>

      <div className="workspace-header-actions">
        <LanguageSwitch />

        {/* One notification control: it opens the notifications page. */}
        <Link
          to="/notifications"
          className="workspace-icon-button"
          aria-label={
            unreadCount > 0
              ? t('shell.unreadNotifications', { count: unreadCount })
              : t('shell.notifications')
          }
        >
          <Bell size={20} aria-hidden="true" />

          {unreadCount > 0 && (
            <span className="workspace-badge" aria-hidden="true">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </Link>

        <Link
          to="/profile"
          className="workspace-account"
          title="View profile"
        >
          <div className="workspace-avatar" aria-hidden="true">
            {failedPhoto !== photoUrl ? (
              <img
                src={photoUrl}
                alt=""
                onError={() => setFailedPhoto(photoUrl)}
              />
            ) : (
              <UserRound size={22} />
            )}
          </div>

          <div className="workspace-account-text">
            <strong>{user?.displayName ?? 'Not signed in'}</strong>
          </div>
        </Link>
      </div>
    </header>
  );
}