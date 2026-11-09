import { AuthProvider } from './AuthContext';
import { PreferencesProvider } from './PreferencesContext';
import { NotificationsProvider } from './NotificationsContext';
import { I18nProvider } from '../i18n/I18nContext';
import { AppRoutes } from '../routes/AppRoutes';

export function App() {
  return (
    <AuthProvider>
      <PreferencesProvider>
        <I18nProvider>
          <NotificationsProvider>
            <AppRoutes />
          </NotificationsProvider>
        </I18nProvider>
      </PreferencesProvider>
    </AuthProvider>
  );
}