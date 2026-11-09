import { useState, type FormEvent } from 'react';
import { Link, Navigate, useLocation, useNavigate } from 'react-router-dom';

import { api } from '../../app/api';
import { useAuth } from '../../app/AuthContext';
import { useTranslation } from '../../i18n/I18nContext';
import { AuthLayout } from './AuthLayout';
import { NewPasswordFields, passwordChecks } from './NewPasswordFields';

/** Accepts the token from the fragment (`#token=…`) or the query string. */
function readToken(search: string, hash: string) {
  const fromHash = new URLSearchParams(hash.replace(/^#/, '')).get('token');
  const fromQuery = new URLSearchParams(search).get('token');

  return (fromHash ?? fromQuery ?? '').trim();
}

export function ResetPasswordPage() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const token = readToken(location.search, location.hash);

  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const complete = passwordChecks(password, confirmation, t).every(
    check => check.met,
  );

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');

    if (!complete) {
      setError(t('profile.invalidPassword'));
      return;
    }

    setBusy(true);

    try {
      await api('/auth/reset-password', { token, password });

      // The API revokes every session, including this browser's.
      if (user) window.dispatchEvent(new Event('auth-expired'));

      navigate('/login?reset=1', { replace: true });
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to reset your password.',
      );
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <AuthLayout
        title={t('reset.incompleteTitle')}
        lead={t('reset.incompleteLead')}
        eyebrow={t('forgot.asideEyebrow')}
        asideTitle={t('forgot.asideTitle')}
        asideLead={t('forgot.asideLead')}
      >
        <p className="page-alert" role="alert" style={{ marginTop: 24 }}>
          {t('reset.incompleteNote')}
        </p>

        <div className="page-actions" style={{ marginTop: 22 }}>
          <Link className="page-button page-button-primary" to="/forgot-password">
            {t('reset.requestNew')}
          </Link>

          <Link className="page-button" to="/login">
            {t('forgot.backToSignIn')}
          </Link>
        </div>
      </AuthLayout>
    );
  }

  if (user) {
    // A signed-in visitor should not silently replace another password.
    return <Navigate to="/settings?tab=security" replace />;
  }

  return (
    <AuthLayout
      title={t('reset.title')}
      lead={t('reset.lead')}
      eyebrow={t('forgot.asideEyebrow')}
      asideTitle={t('reset.asideTitle')}
      asideLead={t('reset.asideLead')}
    >
      <form className="auth-form" onSubmit={submit} noValidate>
        <NewPasswordFields
          idPrefix="reset"
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
          {busy ? t('reset.busy') : t('reset.save')}
        </button>
      </form>

      <p className="auth-footnote">
        {t('reset.expired')}{' '}
        <Link className="auth-link" to="/forgot-password">
          {t('reset.expiredLink')}
        </Link>
      </p>
    </AuthLayout>
  );
}
