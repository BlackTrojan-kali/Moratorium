import { Link } from 'react-router-dom';

import {
  ArrowLeft,
  CircleHelp,
  FileQuestion,
} from 'lucide-react';

import { useTranslation } from '../../i18n/I18nContext';

export function NotFound() {
  const { t } = useTranslation();

  return (
    <div className="page status-page">
      <section
        className="page-card status-card"
        aria-labelledby="page-not-found-title"
      >
        <div className="status-illustration" aria-hidden="true">
          <FileQuestion size={92} strokeWidth={1.3} />
          <span className="status-number">404</span>
        </div>

        <div className="status-content">
          <p className="page-heading-eyebrow">{t('status.notFoundEyebrow')}</p>

          <h1 id="page-not-found-title">{t('status.notFoundTitle')}</h1>

          <p>{t('status.notFoundText')}</p>

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
    </div>
  );
}