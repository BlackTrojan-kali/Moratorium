import { Link } from 'react-router-dom';

import {
  ArrowLeft,
  CircleHelp,
  ShieldAlert,
} from 'lucide-react';

import { useTranslation } from '../../i18n/I18nContext';

export function Unauthorized() {
  const { t } = useTranslation();

  return (
    <main className="page status-page">
      <section
        className="page-card status-card"
        aria-labelledby="access-denied-title"
      >
        <div className="status-illustration" aria-hidden="true">
          <ShieldAlert size={100} strokeWidth={1.3} />
        </div>

        <div className="status-content">
          <p className="page-heading-eyebrow">{t('status.deniedEyebrow')}</p>

          <h1 id="access-denied-title">{t('status.deniedTitle')}</h1>

          <p>{t('status.deniedText')}</p>

          <div className="page-actions">
            <Link to="/" className="page-button page-button-primary">
              <ArrowLeft size={17} aria-hidden="true" />
              {t('status.backToDashboard')}
            </Link>

            <Link to="/help" className="page-button">
              <CircleHelp size={17} aria-hidden="true" />
              {t('nav.help')}
            </Link>
          </div>
        </div>
      </section>
    </main>
  );
}