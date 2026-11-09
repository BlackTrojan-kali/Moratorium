import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { useTranslation } from '../../i18n/I18nContext';
import { AuthLayout, PasswordField } from './AuthLayout';

/**
 * Only same-origin, in-app destinations are accepted, so a crafted
 * `?next=` value cannot redirect a signed-in user off the application.
 */
export function safeNext(value: string | null) {
  if (!value || !value.startsWith('/') || value.startsWith('//')) {
    return '/';
  }

  return value;
}

export function LoginPage() {
  const { user, login, error: connectionError } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const next = safeNext(params.get('next'));
  const resetDone = params.get('reset') === '1';
  const changed = params.get('changed') === '1';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  // Returning users are sent straight to the page they asked for.
  if (user) return <Navigate to={next} replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      await login(email, password);
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to sign in.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={t('login.title')}
      lead={t('login.lead')}
      eyebrow={t('login.asideEyebrow')}
      asideTitle={t('login.asideTitle')}
      asideLead={t('login.asideLead')}
    >
      {resetDone && (
        <p className="page-note" role="status" style={{ marginTop: 24 }}>
          {t('login.resetDone')}
        </p>
      )}

      {changed && (
        <p className="page-note" role="status" style={{ marginTop: 24 }}>
          {t('login.changed')}
        </p>
      )}

      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-field">
          <div className="auth-field-label">
            <label htmlFor="login-email">{t('account.email')}</label>
          </div>

          <input
            id="login-email"
            name="email"
            type="email"
            autoComplete="username"
            inputMode="email"
            required
            autoFocus
            value={email}
            onChange={event => setEmail(event.target.value)}
          />
        </div>

        <PasswordField
          id="login-password"
          label={t('account.password')}
          value={password}
          autoComplete="current-password"
          onChange={setPassword}
          action={
            <Link className="auth-link" to="/forgot-password">
              {t('login.forgot')}
            </Link>
          }
        />

        {(error || connectionError) && (
          <p className="page-alert" role="alert">
            {error || connectionError}
          </p>
        )}

        <button className="auth-submit" disabled={busy}>
          {busy ? t('login.busy') : t('login.submit')}
        </button>
      </form>

      <p className="auth-footnote">
        {t('login.footer')}{' '}
        <Link className="auth-link" to="/sign-up">
          {t('login.footerLink')}
        </Link>
        . {t('login.footerNote')}
      </p>
    </AuthLayout>
  );
}
