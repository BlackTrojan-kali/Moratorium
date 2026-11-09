import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

import { api } from '../../app/api';
import { useTranslation } from '../../i18n/I18nContext';
import { AuthLayout } from './AuthLayout';

interface ResetRequestResponse {
  message: string;
  resetPath?: string;
  expiresInMinutes?: number;
}

export function ForgotPasswordPage() {
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<ResetRequestResponse | null>(null);
  const [copied, setCopied] = useState(false);

  const resetUrl = result?.resetPath
    ? new URL(result.resetPath, window.location.origin).toString()
    : null;

  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    setBusy(true);

    try {
      const data = await api<ResetRequestResponse>(
        '/auth/forgot-password',
        { email },
      );

      setResult(data);
      setEmail('');
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : 'Unable to start the recovery procedure.',
      );
    } finally {
      setBusy(false);
    }
  }

  async function copy() {
    if (!resetUrl) return;

    try {
      await navigator.clipboard.writeText(resetUrl);
      setCopied(true);
    } catch {
      setError(t('forgot.copyFailed'));
    }
  }

  return (
    <AuthLayout
      title={result ? t('forgot.titleDone') : t('forgot.title')}
      lead={result ? t('forgot.leadDone') : t('forgot.lead')}
      eyebrow={t('forgot.asideEyebrow')}
      asideTitle={t('forgot.asideTitle')}
      asideLead={t('forgot.asideLead')}
    >
      {result ? (
        <>
          <p className="page-note" role="status" style={{ marginTop: 24 }}>
            {result.message}
          </p>

          {resetUrl && (
            <div className="auth-token">
              <p className="auth-token-label">
                {t('forgot.tokenLabel')}
              </p>

              <p className="auth-token-value">{resetUrl}</p>

              <p className="auth-field-hint">{t('forgot.tokenNote')}</p>

              <div className="page-actions">
                <Link className="page-button page-button-primary" to={result.resetPath!}>
                  {t('forgot.openLink')}
                </Link>

                <button
                  type="button"
                  className="page-button"
                  onClick={copy}
                >
                  {copied ? t('forgot.copied') : t('forgot.copy')}
                </button>
              </div>
            </div>
          )}

          <p className="auth-footnote">
            <button
              type="button"
              className="auth-link"
              style={{ border: 0, background: 'transparent', padding: 0, cursor: 'pointer' }}
              onClick={() => {
                setResult(null);
                setCopied(false);
                setError('');
              }}
            >
              {t('forgot.otherEmail')}
            </button>
            {' · '}
            <Link className="auth-link" to="/login">
              {t('forgot.backToSignIn')}
            </Link>
          </p>
        </>
      ) : (
        <>
          <ol className="auth-steps">
            <li>{t('forgot.step1')}</li>
            <li>{t('forgot.step2')}</li>
            <li>{t('forgot.step3')}</li>
          </ol>

          <form className="auth-form" onSubmit={submit} noValidate>
            <div className="auth-field">
              <div className="auth-field-label">
                <label htmlFor="recovery-email">{t('account.email')}</label>
              </div>

              <input
                id="recovery-email"
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

            {error && (
              <p className="page-alert" role="alert">
                {error}
              </p>
            )}

            <button className="auth-submit" disabled={busy}>
              {busy ? t('forgot.busy') : t('forgot.submit')}
            </button>
          </form>

          <p className="auth-footnote">
            {t('forgot.remembered')}{' '}
            <Link className="auth-link" to="/login">
              {t('forgot.backToSignIn')}
            </Link>
          </p>
        </>
      )}
    </AuthLayout>
  );
}
