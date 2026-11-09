import { useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Eye, EyeOff } from 'lucide-react';

import { useTranslation } from '../../i18n/I18nContext';
import { LanguageSwitch } from '../../i18n/LanguageSwitch';

import '../../styles/auth-flows.css';

interface AuthLayoutProps {
  title: string;
  lead: ReactNode;
  eyebrow: string;
  asideTitle: string;
  asideLead: string;
  children: ReactNode;
}

/**
 * Shared shell for the public account screens (sign in, recovery, reset).
 * Mirrors the layout real web applications use: the form on the left, a
 * brand panel that explains the product on the right, hidden on small screens.
 */
export function AuthLayout({
  title,
  lead,
  eyebrow,
  asideTitle,
  asideLead,
  children,
}: AuthLayoutProps) {
  const { t } = useTranslation();

  return (
    <div className="auth-shell">
      <main className="auth-main">
        <header className="auth-topbar">
          <Link className="auth-brand" to="/" aria-label="MoraPay home">
            <span className="auth-brand-mark" aria-hidden="true">M</span>
            <span>
              <strong>MoraPay</strong>
              <small>{t('account.brandSubtitle')}</small>
            </span>
          </Link>

          <span className="auth-topbar-actions">
            <LanguageSwitch />

            <Link className="auth-back" to="/">
              {t('account.backHome')}
            </Link>
          </span>
        </header>

        <div className="auth-content">
          <h1 className="auth-title">{title}</h1>
          <p className="auth-lead">{lead}</p>
          {children}
        </div>
      </main>

      <aside className="auth-aside" aria-hidden="true">
        <div className="auth-aside-inner">
          <p className="auth-aside-eyebrow">{eyebrow}</p>
          <h2 className="auth-aside-title">{asideTitle}</h2>
          <p className="auth-aside-lead">{asideLead}</p>

          <p className="auth-aside-foot">{t('account.asideFoot')}</p>
        </div>
      </aside>
    </div>
  );
}

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  autoComplete: string;
  onChange: (value: string) => void;
  hint?: string;
  action?: ReactNode;
  autoFocus?: boolean;
  minLength?: number;
  maxLength?: number;
  required?: boolean;
}

/** Password input with a reveal toggle, matching the sign-in card style. */
export function PasswordField({
  id,
  label,
  value,
  autoComplete,
  onChange,
  hint,
  action,
  autoFocus,
  minLength,
  maxLength = 128,
  required = true,
}: PasswordFieldProps) {
  const { t } = useTranslation();
  const [revealed, setRevealed] = useState(false);

  return (
    <div className="auth-field">
      <div className="auth-field-label">
        <label htmlFor={id}>{label}</label>
        {action}
      </div>

      <div className="auth-password">
        <input
          id={id}
          type={revealed ? 'text' : 'password'}
          autoComplete={autoComplete}
          required={required}
          minLength={minLength}
          maxLength={maxLength}
          autoFocus={autoFocus}
          value={value}
          onChange={event => onChange(event.target.value)}
        />

        <button
          type="button"
          className="auth-reveal"
          onClick={() => setRevealed(current => !current)}
          aria-label={
            revealed ? t('account.hidePassword') : t('account.showPassword')
          }
          aria-pressed={revealed}
        >
          {revealed ? <EyeOff size={18} /> : <Eye size={18} />}
        </button>
      </div>

      {hint && <span className="auth-field-hint">{hint}</span>}
    </div>
  );
}
