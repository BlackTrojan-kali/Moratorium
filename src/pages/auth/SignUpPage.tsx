import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router-dom';

import { useAuth } from '../../app/AuthContext';
import { useTranslation } from '../../i18n/I18nContext';
import { AuthLayout } from './AuthLayout';
import { NewPasswordFields, passwordChecks } from './NewPasswordFields';

export function SignUpPage() {
  const { user, signUp } = useAuth();
  const { t } = useTranslation();

  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const complete = passwordChecks(password, confirmation, t).every(
    check => check.met,
  );

  if (user) return <Navigate to="/" replace />;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!complete) {
      setError(t('profile.invalidPassword'));
      return;
    }

    setBusy(true);

    try {
      await signUp({
        displayName,
        email,
        password,
      });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to create your account.',
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <AuthLayout
      title={t('signup.title')}
      lead={t('signup.lead')}
      eyebrow={t('signup.asideEyebrow')}
      asideTitle={t('signup.asideTitle')}
      asideLead={t('signup.asideLead')}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <div className="auth-field">
          <div className="auth-field-label">
            <label htmlFor="signup-name">{t('account.fullName')}</label>
          </div>

          <input
            id="signup-name"
            name="name"
            type="text"
            autoComplete="name"
            required
            maxLength={120}
            autoFocus
            value={displayName}
            onChange={event => setDisplayName(event.target.value)}
          />
        </div>

        <div className="auth-field">
          <div className="auth-field-label">
            <label htmlFor="signup-email">{t('account.email')}</label>
          </div>

          <input
            id="signup-email"
            name="email"
            type="email"
            autoComplete="email"
            inputMode="email"
            required
            maxLength={254}
            value={email}
            onChange={event => setEmail(event.target.value)}
          />

          <span className="auth-field-hint">{t('signup.emailHint')}</span>
        </div>

        <NewPasswordFields
          idPrefix="signup"
          password={password}
          confirmation={confirmation}
          onPassword={setPassword}
          onConfirmation={setConfirmation}
        />

        {error && (
          <p className="page-alert" role="alert">
            {error}
          </p>
        )}

        <button className="auth-submit" disabled={busy || !complete}>
          {busy ? t('signup.busy') : t('signup.submit')}
        </button>
      </form>

      <p className="auth-footnote">
        {t('signup.footer')}{' '}
        <Link className="auth-link" to="/login">
          {t('signup.footerLink')}
        </Link>
      </p>
    </AuthLayout>
  );
}
