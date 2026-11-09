import { Link } from 'react-router-dom';
import { useTranslation } from '../../i18n/I18nContext';
import { LanguageSwitch } from '../../i18n/LanguageSwitch';
import '../../styles/auth.css';

export function LandingPage() {
  const { t } = useTranslation();

  return (
    <main className="landing-page">
      <nav className="landing-nav" aria-label="Navigation publique">
        <Link className="landing-brand" to="/" aria-label="MoraPay accueil">
          <span className="landing-brand-mark" aria-hidden="true">M</span>
          <span><strong>MoraPay</strong><small>{t('account.brandSubtitle')}</small></span>
        </Link>
        <span className="landing-nav-actions">
          <Link className="landing-badge-link" to="/project-evolution" title="Consulter l'audit d'avancement du projet">
            <span className="landing-badge-dot"></span>
            <span>Bilan du projet</span>
            <span className="landing-badge-pill">78%</span>
          </Link>
          <LanguageSwitch />
          <Link className="secondary-button" to="/login">{t('landing.signIn')}</Link>
        </span>
      </nav>

      <section className="landing-hero">
        <div className="landing-copy">
          <p className="landing-eyebrow">
            <span>CNPS CAMEROUN</span> • <span>DIRECTION TECHNIQUE</span>
          </p>
          <h1 className="landing-title">
            <span className="landing-title-accent">{t('landing.title')}</span>
          </h1>
          <p className="landing-introduction">{t('landing.intro')}</p>
          <div className="landing-actions">
            <Link className="primary-button" to="/sign-up">{t('landing.createAccount')}</Link>
            <Link className="landing-pill-btn" to="/project-evolution">
              <span>📊 Bilan d'évolution</span>
              <span className="landing-pill-stat">78%</span>
            </Link>
            <Link className="landing-text-link" to="/login">{t('landing.signIn')}</Link>
          </div>
          <p className="landing-access-note">{t('landing.accessNote')}</p>
        </div>

        <aside className="landing-summary" aria-label="Circuit de traitement">
          <p className="landing-summary-label">
            <span>{t('landing.summaryLabel')}</span>
            <span style={{ fontSize: '10px', color: '#14583d', fontWeight: '800' }}>CNPS 2026</span>
          </p>
          <ol>
            <li><span>01</span><strong>{t('landing.step1')}</strong></li>
            <li><span>02</span><strong>{t('landing.step2')}</strong></li>
            <li><span>03</span><strong>{t('landing.step3')}</strong></li>
          </ol>
        </aside>
      </section>

      <section className="landing-features" id="how-it-works" aria-label="Fonctionnalités clés">
        <article>
          <span>PILIER 01</span>
          <h2>{t('landing.feature1Title')}</h2>
          <p>{t('landing.feature1Text')}</p>
        </article>
        <article>
          <span>PILIER 02</span>
          <h2>{t('landing.feature2Title')}</h2>
          <p>{t('landing.feature2Text')}</p>
        </article>
        <article>
          <span>PILIER 03</span>
          <h2>{t('landing.feature3Title')}</h2>
          <p>{t('landing.feature3Text')}</p>
        </article>
      </section>
    </main>
  );
}
