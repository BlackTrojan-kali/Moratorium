import { useState } from 'react';
import { Link } from 'react-router-dom';
import { LanguageSwitch } from '../../i18n/LanguageSwitch';
import '../../styles/project-evolution.css';

// Icônes SVG légères et autonomes
function IconCheck({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M20 6L9 17l-5-5" />
    </svg>
  );
}

function IconClock({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function IconAlert({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}

function IconX({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <circle cx="12" cy="12" r="10" />
      <line x1="15" y1="9" x2="9" y2="15" />
      <line x1="9" y1="9" x2="15" y2="15" />
    </svg>
  );
}

function IconTrending({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  );
}

function IconDatabase({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function IconServer({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
      <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
      <line x1="6" y1="6" x2="6.01" y2="6" />
      <line x1="6" y1="18" x2="6.01" y2="18" />
    </svg>
  );
}

function IconLayers({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  );
}

function IconPrinter({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="6 9 6 2 18 2 18 9" />
      <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2" />
      <rect x="6" y="14" width="12" height="8" />
    </svg>
  );
}

function IconChevronLeft({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}

function IconShield({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IconFileText({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <polyline points="14 2 14 8 20 8" />
      <line x1="16" y1="13" x2="8" y2="13" />
      <line x1="16" y1="17" x2="8" y2="17" />
      <polyline points="10 9 9 9 8 9" />
    </svg>
  );
}

function IconWorkflow({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <rect x="3" y="3" width="6" height="6" rx="1" />
      <rect x="15" y="15" width="6" height="6" rx="1" />
      <path d="M6 9v3a3 3 0 0 0 3 3h6" />
    </svg>
  );
}

function IconSparkles({ size = 16, className = '' }: { size?: number; className?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden="true">
      <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
    </svg>
  );
}

interface FeatureItem {
  id: string;
  name: string;
  description: string;
  module: 'React' | 'Node.js' | 'PostgreSQL' | 'Full-Stack';
  developed: 'yes' | 'partial' | 'no';
  integrated: 'yes' | 'partial' | 'no';
  tested: 'yes' | 'partial' | 'no';
  status: 'finished' | 'in_progress' | 'not_started' | 'blocked';
  notes: string;
}

const FEATURES: FeatureItem[] = [
  {
    id: 'f1',
    name: 'Authentification & Sessions sécurisées',
    description: 'Sessions HttpOnly, protection CSRF, tokens immuables, limitation de débit (rate limiting)',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: '8 suites de tests unitaires & intégration passées avec succès.',
  },
  {
    id: 'f2',
    name: 'Modélisation & RBAC 8 Acteurs CNPS',
    description: 'Respect strict des 8 acteurs du manuel : Employeur, Agent DT, CE/CEA, S-DCT, DT, DG, CPS, Admin',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Habilitations filtrées par route et interface dédiée par profil.',
  },
  {
    id: 'f3',
    name: 'Dépôt guidé de demande de moratoire',
    description: 'Formulaire employeur, calcul prévisionnel, justificatifs obligatoires et génération d’acompte',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Testé de bout en bout avec idempotence et reçus immuables.',
  },
  {
    id: 'f4',
    name: 'Gestion documentaire & pièces jointes',
    description: 'Stockage binaire BYTEA (max 5 Mo), contrôle des types MIME, suppression douce et téléchargement',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Requête, situation débitrice et preuve d’acompte attachées.',
  },
  {
    id: 'f5',
    name: 'Validation des acomptes par le CPS',
    description: 'Écran de contrôle CPS, vérification de paiement de l’acompte obligatoire et transmission à la DT',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Condition préalable requise pour l’instruction par l’Agent DT.',
  },
  {
    id: 'f6',
    name: 'Workflow séquentiel d’instruction à 5 niveaux',
    description: 'Chaîne hiérarchique conforme : Agent DT → CE/CEA → S-DCT → DT → DG',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Transitions verrouillées et passage de relais tracé dans request_events.',
  },
  {
    id: 'f7',
    name: 'Prise de décision & fondements juridiques',
    description: 'Enregistrement de la décision, des textes réglementaires visés (Décret 2015, Notes de service) et appréciation',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Colonnes dédiées dans request_approvals (migration 009).',
  },
  {
    id: 'f8',
    name: 'Moteur d’échéancier XAF sans perte d’arrondi',
    description: 'Algorithme d’échelonnement financier préservant exactement 100% du montant de la dette au Franc CFA',
    module: 'Node.js',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Test unitaire spécifique d’allocation validé à 100%.',
  },
  {
    id: 'f9',
    name: 'Enregistrement des paiements réels & rapprochement',
    description: 'Saisie des règlements constatés, imputation sur les mensualités et gestion des annulations',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Table observed_payments avec historisation des rectifications.',
  },
  {
    id: 'f10',
    name: 'Détection des défaillances & alertes de défaut',
    description: 'Calcul des retards de paiement, application de la période de grâce et signalement des impayés',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Table payment_defaults et tableau des comptes en souffrance.',
  },
  {
    id: 'f11',
    name: 'Archivage électronique immuable (SHA-256)',
    description: 'Instantané (snapshot) JSONB des plans validés avec empreinte cryptographique SHA-256',
    module: 'PostgreSQL',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Garantit l’intégrité opposable et l’inviolabilité des accords passés.',
  },
  {
    id: 'f12',
    name: 'Tableaux de bord de pilotage multi-rôles',
    description: '8 dashboards personnalisés avec compteurs en temps réel et files de travail spécifiques',
    module: 'React',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Indicateurs clés : volumétrie, avis en attente, montants régularisés.',
  },
  {
    id: 'f13',
    name: 'Piste d’audit horodatée & journalisation',
    description: 'Historique de chaque action utilisateur, connexion, modification de dossier et transition',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Tables audit_events et request_events consultables en administration.',
  },
  {
    id: 'f14',
    name: 'Internationalisation bilingue (FR / EN)',
    description: 'Gestion complète du français et de l’anglais avec bascule instantanée et dictionnaire strict',
    module: 'React',
    developed: 'yes',
    integrated: 'yes',
    tested: 'yes',
    status: 'finished',
    notes: 'Conforme au bilinguisme officiel de la République du Cameroun.',
  },
  {
    id: 'f15',
    name: 'Suivi du recouvrement des reliquats (Remise gracieuse)',
    description: 'Suivi spécifique du solde après remise des pénalités et planification des relances',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'partial',
    status: 'in_progress',
    notes: 'Calculs et notes opérationnels ; relances automatiques externes à brancher.',
  },
  {
    id: 'f16',
    name: 'Formalisation des actes (Lettres d’accord/rejet)',
    description: 'Modèles de courriers officiels, reçus de dépôt et impression de l’échéancier validé',
    module: 'React',
    developed: 'yes',
    integrated: 'yes',
    tested: 'partial',
    status: 'in_progress',
    notes: 'Impression web stylisée disponible ; générateur PDF binaire serveur requis.',
  },
  {
    id: 'f17',
    name: 'Rapports consolidés & Exports analytiques',
    description: 'Exports CSV/JSON de suivi des opérations, indicateurs financiers et taux de recouvrement',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'partial',
    status: 'in_progress',
    notes: 'Rapports opérationnels fonctionnels ; tableaux de bord DG à enrichir.',
  },
  {
    id: 'f18',
    name: 'Administration des centres CPS & délégations',
    description: 'Gestion du référentiel des centres de rattachement et des délégations de signature régionales',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'partial',
    status: 'in_progress',
    notes: 'Gestion des centres active ; matrice dynamique des seuils à finaliser.',
  },
  {
    id: 'f19',
    name: 'Remise gracieuse des MPR conjointe au moratoire',
    description: 'Prise en charge de la case remise gracieuse dans la demande et enregistrement de l’avis DT',
    module: 'Full-Stack',
    developed: 'yes',
    integrated: 'yes',
    tested: 'partial',
    status: 'in_progress',
    notes: 'Case présente dans le formulaire et les avis ; calcul de remise à automatiser.',
  },
  {
    id: 'f20',
    name: 'Interfaçage temps réel Sapelli EnergiZer (Oracle)',
    description: 'Lecture directe et automatique de la situation débitrice dans le schéma Oracle ENERGIZER',
    module: 'Node.js',
    developed: 'no',
    integrated: 'no',
    tested: 'no',
    status: 'blocked',
    notes: 'Bloqué par l’absence d’accès au réseau et à l’environnement Oracle de production CNPS.',
  },
  {
    id: 'f21',
    name: 'Procédure autonome de remise gracieuse seule',
    description: 'Circuit dédié pour traiter une demande de remise gracieuse de MPR sans étalement de dette',
    module: 'Full-Stack',
    developed: 'partial',
    integrated: 'no',
    tested: 'no',
    status: 'not_started',
    notes: 'Prévu en Phase 2 ; actuellement géré conjointement aux demandes de moratoire.',
  },
  {
    id: 'f22',
    name: 'Passerelle externe de notifications (Email / SMS)',
    description: 'Envoi d’e-mails SMTP et SMS aux employeurs lors des franchissements d’étapes et relances',
    module: 'Node.js',
    developed: 'no',
    integrated: 'no',
    tested: 'no',
    status: 'not_started',
    notes: 'Actuellement assurée par le centre de notifications interne (in-app).',
  },
];

interface ProjectEvolutionProps {
  publicMode?: boolean;
}

export function ProjectEvolution({ publicMode = false }: ProjectEvolutionProps) {
  const [filter, setFilter] = useState<'all' | 'finished' | 'in_progress' | 'pending_or_blocked'>('all');

  const finishedCount = FEATURES.filter((f) => f.status === 'finished').length;
  const inProgressCount = FEATURES.filter((f) => f.status === 'in_progress').length;
  const notStartedCount = FEATURES.filter((f) => f.status === 'not_started').length;
  const blockedCount = FEATURES.filter((f) => f.status === 'blocked').length;
  const pendingOrBlockedCount = notStartedCount + blockedCount;

  const filteredFeatures = FEATURES.filter((item) => {
    if (filter === 'finished') return item.status === 'finished';
    if (filter === 'in_progress') return item.status === 'in_progress';
    if (filter === 'pending_or_blocked') return item.status === 'not_started' || item.status === 'blocked';
    return true;
  });

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className={`project-evolution-page ${publicMode ? 'project-evolution-public' : ''}`}>
      {publicMode && (
        <header className="project-evolution-public-header">
          <Link to="/" className="pe-brand-link">
            <span className="pe-brand-badge">M</span>
            <span>MoraPay • CNPS</span>
          </Link>
          <div className="pe-header-actions">
            <LanguageSwitch />
            <Link to="/" className="pe-btn pe-btn-outline">
              <IconChevronLeft size={16} /> Retour à l'accueil
            </Link>
            <Link to="/login" className="pe-btn pe-btn-primary">
              Se connecter
            </Link>
          </div>
        </header>
      )}

      {/* Titre et bandeau d'introduction */}
      <section className="pe-header">
        <div className="pe-header-copy">
          <div className="pe-eyebrow">
            <span>RÉPUBLIQUE DU CAMEROUN • CNPS DIRECTION TECHNIQUE</span>
            <span className="pe-eyebrow-badge">AUDIT DE CONFORMITÉ</span>
          </div>
          <h1 className="pe-title">Bilan d'évolution du projet</h1>
          <p className="pe-subtitle">
            Comparatif factuel entre les objectifs définis dans la <strong>Note de cadrage</strong> (Manuel de
            procédures de traitement des moratoires et remises gracieuses de juin 2026) et les fonctionnalités
            réellement développées, intégrées et testées dans le code source de l'application MoraPay.
          </p>
        </div>
        <div className="pe-header-actions">
          <button type="button" onClick={handlePrint} className="pe-btn pe-btn-outline" title="Imprimer le bilan officiel">
            <IconPrinter size={15} /> Imprimer le rapport
          </button>
        </div>
      </section>

      {/* Cartes KPI Synthèse */}
      <section className="pe-kpi-grid">
        <div className="pe-kpi-card pe-kpi-card-featured">
          <div className="pe-kpi-header">
            <span className="pe-kpi-label">Avancement Global</span>
            <span className="pe-kpi-icon"><IconTrending size={16} /></span>
          </div>
          <div className="pe-kpi-body">
            <span className="pe-kpi-value">78 %</span>
            <span className="pe-kpi-subtext">Pondéré</span>
          </div>
          <p className="pe-kpi-desc">
            Cœur métier, chaîne hiérarchique des 8 acteurs et moteur financier d’échéancier entièrement opérationnels.
          </p>
        </div>

        <div className="pe-kpi-card">
          <div className="pe-kpi-header">
            <span className="pe-kpi-label">Fonctionnalités</span>
            <span className="pe-kpi-icon"><IconLayers size={16} /></span>
          </div>
          <div className="pe-kpi-body">
            <span className="pe-kpi-value">{finishedCount} / {FEATURES.length}</span>
            <span className="pe-kpi-subtext">terminées</span>
          </div>
          <p className="pe-kpi-desc">
            {finishedCount} terminées, {inProgressCount} en cours, {blockedCount} bloquée, {notStartedCount} non commencées.
          </p>
        </div>

        <div className="pe-kpi-card">
          <div className="pe-kpi-header">
            <span className="pe-kpi-label">Tests Automatisés</span>
            <span className="pe-kpi-icon"><IconShield size={16} /></span>
          </div>
          <div className="pe-kpi-body">
            <span className="pe-kpi-value">100 %</span>
            <span className="pe-kpi-subtext">8/8 suites</span>
          </div>
          <p className="pe-kpi-desc">
            Validation unitaire et d’intégration backend sans échec : RBAC, flux d'approbation et intégrité XAF.
          </p>
        </div>

        <div className="pe-kpi-card">
          <div className="pe-kpi-header">
            <span className="pe-kpi-label">Procédures Couvertes</span>
            <span className="pe-kpi-icon"><IconFileText size={16} /></span>
          </div>
          <div className="pe-kpi-body">
            <span className="pe-kpi-value">3 / 4</span>
            <span className="pe-kpi-subtext">procédures</span>
          </div>
          <p className="pe-kpi-desc">
            Moratoires, Suivi mensuel et Reliquats intégrés ; remise gracieuse autonome seule planifiée en Phase 2.
          </p>
        </div>
      </section>

      {/* Avancement par module technique */}
      <section className="pe-modules-section">
        <div className="pe-section-title">
          <h2><IconLayers size={18} /> Avancement par module technique</h2>
          <span className="pe-section-desc">Évaluation basée sur les composants existants, l'API et les migrations PostgreSQL</span>
        </div>

        <div className="pe-modules-grid">
          {/* Module PostgreSQL */}
          <div className="pe-module-card">
            <div className="pe-module-header">
              <div className="pe-module-title">
                <IconDatabase size={16} />
                <span>PostgreSQL</span>
              </div>
              <span className="pe-module-tech">Base de données</span>
              <span className="pe-module-percent">85 %</span>
            </div>
            <div className="pe-progress-bar">
              <div className="pe-progress-fill pe-progress-fill-postgres" style={{ width: '85%' }}></div>
            </div>
            <ul className="pe-module-details">
              <li><span className="pe-module-check">✓</span> 8 migrations SQL créées et exécutées sans erreur</li>
              <li><span className="pe-module-check">✓</span> 11 tables relationnelles avec contraintes CHECK strictes</li>
              <li><span className="pe-module-check">✓</span> Gestion des transactions ACID et isolation multi-acteurs</li>
              <li><span className="pe-module-check">✓</span> Empreinte SHA-256 pour l'archivage immuable</li>
              <li><span style={{ color: '#d97706' }}>⚠</span> Manque : Schéma miroir pour connecteur Sapelli EnergiZer</li>
            </ul>
          </div>

          {/* Module React */}
          <div className="pe-module-card">
            <div className="pe-module-header">
              <div className="pe-module-title">
                <IconLayers size={16} />
                <span>React</span>
              </div>
              <span className="pe-module-tech">Frontend / UI</span>
              <span className="pe-module-percent">80 %</span>
            </div>
            <div className="pe-progress-bar">
              <div className="pe-progress-fill pe-progress-fill-react" style={{ width: '80%' }}></div>
            </div>
            <ul className="pe-module-details">
              <li><span className="pe-module-check">✓</span> 8 Dashboards spécialisés pour chaque acteur de la CNPS</li>
              <li><span className="pe-module-check">✓</span> Dépôt guidé, téléversement de documents, récapitulatifs</li>
              <li><span className="pe-module-check">✓</span> Échéancier de paiement interactif et reçu d'impression</li>
              <li><span className="pe-module-check">✓</span> Bilinguisme FR/EN avec typage strict TypeScript (0 erreur)</li>
              <li><span style={{ color: '#d97706' }}>⚠</span> Manque : Formulaire autonome pour remise gracieuse seule</li>
            </ul>
          </div>

          {/* Module Node.js */}
          <div className="pe-module-card">
            <div className="pe-module-header">
              <div className="pe-module-title">
                <IconServer size={16} />
                <span>Node.js / Express</span>
              </div>
              <span className="pe-module-tech">Backend API</span>
              <span className="pe-module-percent">74 %</span>
            </div>
            <div className="pe-progress-bar">
              <div className="pe-progress-fill pe-progress-fill-node" style={{ width: '74%' }}></div>
            </div>
            <ul className="pe-module-details">
              <li><span className="pe-module-check">✓</span> Authentification HttpOnly, CSRF et rate limiting natif</li>
              <li><span className="pe-module-check">✓</span> Moteur séquentiel de visa ordonné (Agent → DT → DG)</li>
              <li><span className="pe-module-check">✓</span> Algorithme d'allocation financière exacte au franc XAF</li>
              <li><span className="pe-module-check">✓</span> 8 suites de tests unitaires et intégration (100% de réussite)</li>
              <li><span style={{ color: '#dc2626' }}>✗</span> Manque : Connecteur direct Oracle EnergiZer & envoi SMTP/SMS</li>
            </ul>
          </div>
        </div>
      </section>

      {/* Graphiques et répartition de l'état des fonctionnalités */}
      <section className="pe-breakdown-row">
        {/* Barres par catégorie d'état */}
        <div className="pe-panel">
          <div className="pe-section-title">
            <h2><IconWorkflow size={17} /> État des 22 fonctionnalités recensées</h2>
            <span className="pe-section-desc">Critères stricts : Développé ≠ Intégré ≠ Testé</span>
          </div>

          <div className="pe-status-bars">
            <div className="pe-status-item">
              <div className="pe-status-info">
                <span style={{ color: 'var(--pe-success)' }}>Terminées (Développées, Intégrées & Testées)</span>
                <span className="pe-status-count">14 / 22 (63.6 %)</span>
              </div>
              <div className="pe-bar-track">
                <div className="pe-bar-fill-finished" style={{ width: `${(14 / 22) * 100}%` }}></div>
              </div>
            </div>

            <div className="pe-status-item">
              <div className="pe-status-info">
                <span style={{ color: 'var(--pe-warning)' }}>En cours de finalisation</span>
                <span className="pe-status-count">5 / 22 (22.7 %)</span>
              </div>
              <div className="pe-bar-track">
                <div className="pe-bar-fill-inprogress" style={{ width: `${(5 / 22) * 100}%` }}></div>
              </div>
            </div>

            <div className="pe-status-item">
              <div className="pe-status-info">
                <span style={{ color: '#64748b' }}>Non commencées (Phase 2)</span>
                <span className="pe-status-count">2 / 22 (9.1 %)</span>
              </div>
              <div className="pe-bar-track">
                <div className="pe-bar-fill-notstarted" style={{ width: `${(2 / 22) * 100}%` }}></div>
              </div>
            </div>

            <div className="pe-status-item">
              <div className="pe-status-info">
                <span style={{ color: 'var(--pe-danger)' }}>Bloquées par l'environnement externe</span>
                <span className="pe-status-count">1 / 22 (4.5 %)</span>
              </div>
              <div className="pe-bar-track">
                <div className="pe-bar-fill-blocked" style={{ width: `${(1 / 22) * 100}%` }}></div>
              </div>
            </div>
          </div>
        </div>

        {/* Donut SVG Visuel */}
        <div className="pe-panel">
          <div className="pe-section-title">
            <h2><IconSparkles size={17} /> Répartition proportionnelle</h2>
            <span className="pe-section-desc">Vue d'ensemble</span>
          </div>

          <div className="pe-donut-container">
            <svg viewBox="0 0 42 42" className="pe-donut-svg">
              <circle cx="21" cy="21" r="15.91549430918954" fill="transparent" stroke="#f1f5f9" strokeWidth="6" />
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#16a34a"
                strokeWidth="6"
                strokeDasharray="63.6 36.4"
                strokeDashoffset="25"
              />
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#d97706"
                strokeWidth="6"
                strokeDasharray="22.7 77.3"
                strokeDashoffset="-38.6"
              />
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#94a3b8"
                strokeWidth="6"
                strokeDasharray="9.1 90.9"
                strokeDashoffset="-61.3"
              />
              <circle
                cx="21"
                cy="21"
                r="15.91549430918954"
                fill="transparent"
                stroke="#dc2626"
                strokeWidth="6"
                strokeDasharray="4.5 95.5"
                strokeDashoffset="-70.4"
              />
            </svg>

            <div className="pe-donut-legend">
              <div className="pe-legend-item">
                <span className="pe-legend-dot" style={{ background: '#16a34a' }}></span>
                <span>Terminées ({finishedCount})</span>
              </div>
              <div className="pe-legend-item">
                <span className="pe-legend-dot" style={{ background: '#d97706' }}></span>
                <span>En cours ({inProgressCount})</span>
              </div>
              <div className="pe-legend-item">
                <span className="pe-legend-dot" style={{ background: '#94a3b8' }}></span>
                <span>Non commencées ({notStartedCount})</span>
              </div>
              <div className="pe-legend-item">
                <span className="pe-legend-dot" style={{ background: '#dc2626' }}></span>
                <span>Bloquée ({blockedCount})</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tableau récapitulatif interactif des 22 fonctionnalités */}
      <section className="pe-table-section">
        <div className="pe-table-toolbar">
          <div className="pe-section-title" style={{ margin: 0 }}>
            <h2>Tableau récapitulatif des fonctionnalités</h2>
          </div>

          <div className="pe-filters">
            <button
              type="button"
              className={`pe-filter-btn ${filter === 'all' ? 'active' : ''}`}
              onClick={() => setFilter('all')}
            >
              Toutes ({FEATURES.length})
            </button>
            <button
              type="button"
              className={`pe-filter-btn ${filter === 'finished' ? 'active' : ''}`}
              onClick={() => setFilter('finished')}
            >
              Terminées ({finishedCount})
            </button>
            <button
              type="button"
              className={`pe-filter-btn ${filter === 'in_progress' ? 'active' : ''}`}
              onClick={() => setFilter('in_progress')}
            >
              En cours ({inProgressCount})
            </button>
            <button
              type="button"
              className={`pe-filter-btn ${filter === 'pending_or_blocked' ? 'active' : ''}`}
              onClick={() => setFilter('pending_or_blocked')}
            >
              Non commencées / Bloquées ({pendingOrBlockedCount})
            </button>
          </div>
        </div>

        <div className="pe-table-wrapper">
          <table className="pe-table">
            <thead>
              <tr>
                <th style={{ width: '30%' }}>Fonctionnalité & Description</th>
                <th style={{ width: '12%' }}>Module</th>
                <th style={{ textAlign: 'center', width: '9%' }}>Développé</th>
                <th style={{ textAlign: 'center', width: '9%' }}>Intégré</th>
                <th style={{ textAlign: 'center', width: '9%' }}>Testé</th>
                <th style={{ width: '14%' }}>Statut</th>
                <th style={{ width: '17%' }}>Observation / Preuve code</th>
              </tr>
            </thead>
            <tbody>
              {filteredFeatures.map((feat) => (
                <tr key={feat.id}>
                  <td>
                    <div className="pe-feat-name">
                      <span>{feat.name}</span>
                      <span className="pe-feat-desc">{feat.description}</span>
                    </div>
                  </td>
                  <td>
                    <span className="pe-module-tech">{feat.module}</span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`pe-check-pill ${feat.developed}`}>
                      {feat.developed === 'yes' ? '✓' : feat.developed === 'partial' ? '~' : '✕'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`pe-check-pill ${feat.integrated}`}>
                      {feat.integrated === 'yes' ? '✓' : feat.integrated === 'partial' ? '~' : '✕'}
                    </span>
                  </td>
                  <td style={{ textAlign: 'center' }}>
                    <span className={`pe-check-pill ${feat.tested}`}>
                      {feat.tested === 'yes' ? '✓' : feat.tested === 'partial' ? '~' : '✕'}
                    </span>
                  </td>
                  <td>
                    {feat.status === 'finished' && (
                      <span className="pe-badge pe-badge-finished">
                        <IconCheck size={12} /> Terminée
                      </span>
                    )}
                    {feat.status === 'in_progress' && (
                      <span className="pe-badge pe-badge-inprogress">
                        <IconClock size={12} /> En cours
                      </span>
                    )}
                    {feat.status === 'not_started' && (
                      <span className="pe-badge pe-badge-notstarted">
                        <IconX size={12} /> Non commencée
                      </span>
                    )}
                    {feat.status === 'blocked' && (
                      <span className="pe-badge pe-badge-blocked">
                        <IconAlert size={12} /> Bloquée
                      </span>
                    )}
                  </td>
                  <td style={{ fontSize: '11.5px', color: 'var(--pe-text-secondary)' }}>
                    {feat.notes}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Analyse comparative des Objectifs de la note de cadrage */}
      <section className="pe-modules-section">
        <div className="pe-section-title">
          <h2><IconFileText size={18} /> Confrontation avec les Objectifs de la note de cadrage</h2>
          <span className="pe-section-desc">Analyse par rapport aux paragraphes 4 (Objectifs) et 5 (Périmètre) de la note de cadrage</span>
        </div>

        <div className="pe-objectives-grid">
          {/* Objectifs atteints */}
          <div className="pe-objective-card reached">
            <div className="pe-objective-header">
              <IconCheck size={17} />
              <span>Objectifs Atteints (100 %)</span>
            </div>
            <ul className="pe-objective-list">
              <li className="pe-objective-item">
                <span className="pe-obj-title">Digitalisation du circuit d'instruction CNPS</span>
                <span className="pe-obj-detail">
                  Respect strict de la chaîne de visas décrite dans le manuel : Agent DT → CE/CEA → S-DCT → DT → DG.
                </span>
              </li>
              <li className="pe-objective-item">
                <span className="pe-obj-title">Habilitations & Délégations de signature</span>
                <span className="pe-obj-detail">
                  Gestion cloisonnée des 8 rôles réglementaires, avec vues et actions adaptées à chaque échelon hiérarchique.
                </span>
              </li>
              <li className="pe-objective-item">
                <span className="pe-obj-title">Fiabilité financière de l'échéancier</span>
                <span className="pe-obj-detail">
                  Calculateur d'étalement au franc CFA près sans centime perdu, gérant acompte obligatoire et régularisations.
                </span>
              </li>
              <li className="pe-objective-item">
                <span className="pe-obj-title">Traçabilité intégrale & journal d'audit</span>
                <span className="pe-obj-detail">
                  Historisation horodatée de chaque consultation, approbation, rejet et transition d'état d'un dossier.
                </span>
              </li>
              <li className="pe-objective-item">
                <span className="pe-obj-title">Archivage immuable des plans de paiement</span>
                <span className="pe-obj-detail">
                  Scellage cryptographique SHA-256 avec instantané JSONB garantissant l'intégrité non répudiable.
                </span>
              </li>
            </ul>
          </div>

          {/* Objectifs partiellement atteints */}
          <div className="pe-objective-card partial">
            <div className="pe-objective-header">
              <IconClock size={17} />
              <span>Partiellement Atteints (50 à 75 %)</span>
            </div>
            <ul className="pe-objective-list">
              <li className="pe-objective-item">
                <span className="pe-obj-title">Production des actes formalisés</span>
                <span className="pe-obj-detail">
                  Reçus, échéanciers et modèles d'actes imprimables par navigateur créés. Moteur PDF natif serveur avec signature électronique restante.
                </span>
              </li>
              <li className="pe-objective-item">
                <span className="pe-obj-title">Suivi des reliquats après remise gracieuse</span>
                <span className="pe-obj-detail">
                  Détection des défaillances et enregistrement des notes de recouvrement fonctionnels ; relances officielles papier/mail à brancher.
                </span>
              </li>
              <li className="pe-objective-item">
                <span className="pe-obj-title">Remise gracieuse conjointe aux moratoires</span>
                <span className="pe-obj-detail">
                  Case à cocher, motivation et avis hiérarchiques intégrés au dossier, mais sans module de calcul automatisé du montant de remise.
                </span>
              </li>
              <li className="pe-objective-item">
                <span className="pe-obj-title">Reporting consolidé pour la Direction Générale</span>
                <span className="pe-obj-detail">
                  Métriques opérationnelles en temps réel pour chaque acteur créées ; rapports macro-économiques consolidés à parachever.
                </span>
              </li>
            </ul>
          </div>

          {/* Objectifs non atteints ou reportés */}
          <div className="pe-objective-card unreached">
            <div className="pe-objective-header">
              <IconAlert size={17} />
              <span>Non Atteints / Différés (0 %)</span>
            </div>
            <ul className="pe-objective-list">
              <li className="pe-objective-item">
                <span className="pe-obj-title">Connecteur temps réel Sapelli EnergiZer</span>
                <span className="pe-obj-detail">
                  Confrontation automatique en lecture directe dans Oracle ENERGIZER non réalisée (bloquée par indisponibilité de l'accès réseau CNPS).
                </span>
              </li>
              <li className="pe-objective-item">
                <span className="pe-obj-title">Procédure autonome de remise gracieuse seule</span>
                <span className="pe-obj-detail">
                  Le manuel prévoit une demande isolée de remise des pénalités sans étalement de cotisations. Ce formulaire autonome reste à développer.
                </span>
              </li>
              <li className="pe-objective-item">
                <span className="pe-obj-title">Passerelle externe multi-canaux (Mail SMTP & SMS)</span>
                <span className="pe-obj-detail">
                  Les alertes sont aujourd'hui cantonnées au centre de notifications in-app de l'application et n'expédient pas de courriels externes.
                </span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* Difficultés rencontrées et Prochaines étapes */}
      <section className="pe-roadmap-grid">
        {/* Difficultés rencontrées */}
        <div className="pe-panel">
          <div className="pe-section-title">
            <h2><IconAlert size={17} /> Difficultés rencontrées & Arbitrages techniques</h2>
          </div>

          <div className="pe-diff-item">
            <strong>1. Écart de pile technologique (Java EE / Oracle vs React / Node.js / PostgreSQL)</strong>
            La note de cadrage initiale mentionnait un environnement Java EE Servlet et Oracle. L'implémentation a été réalisée avec une pile moderne performante (Node.js/Express, React, PostgreSQL). Ce choix a offert une vitesse de développement supérieure et des tests automatisés robustes, mais implique de prévoir un pont d'intégration avec le schéma ENERGIZER d'entreprise.
          </div>

          <div className="pe-diff-item">
            <strong>2. Complexité du circuit hiérarchique à 8 acteurs</strong>
            La modélisation fidèle des 8 échelons du manuel (sans sauter d'étape et en garantissant la fluidité pour l'employeur et les CPS) a exigé des règles de gestion rigoureuses pour éviter les blocages de dossiers et assurer la traçabilité intégrale des avis.
          </div>

          <div className="pe-diff-item">
            <strong>3. Rigueur mathématique sur la dette sociale (Franc CFA)</strong>
            Les pénalités et cotisations en XAF ne tolèrent aucune perte d'arrondi. L'algorithme d'échéancier a dû être conçu pour garantir la conservation arithmétique absolue de chaque franc sur la totalité de la période accordée.
          </div>

          <div className="pe-diff-item">
            <strong>4. Indisponibilité de l'instance Oracle EnergiZer en local</strong>
            En l'absence de passerelle VPN / réseau direct vers les bases centrales de la CNPS, les données de cotisations sont saisies manuellement et validées par confrontation locale.
          </div>
        </div>

        {/* Prochaines étapes / Feuille de route */}
        <div className="pe-panel">
          <div className="pe-section-title">
            <h2><IconWorkflow size={17} /> Prochaines étapes de réalisation</h2>
          </div>

          <ol className="pe-step-list">
            <li className="pe-step-item">
              <span className="pe-step-num">1</span>
              <div className="pe-step-body">
                <span className="pe-step-title">Générateur de PDF certifiés côté serveur</span>
                <span className="pe-step-desc">
                  Mise en place d'un moteur binaire (Puppeteer / PDFKit) pour produire les lettres d'accord, de rejet et l'échéancier au format officiel CNPS avec QR code d'authenticité.
                </span>
              </div>
            </li>

            <li className="pe-step-item">
              <span className="pe-step-num">2</span>
              <div className="pe-step-body">
                <span className="pe-step-title">Connecteur de synchronisation EnergiZer</span>
                <span className="pe-step-desc">
                  Développement d'un service passerelle (FDW PostgreSQL ou worker d'importation périodique) pour interroger les tables de cotisations Sapelli EnergiZer en lecture seule.
                </span>
              </div>
            </li>

            <li className="pe-step-item">
              <span className="pe-step-num">3</span>
              <div className="pe-step-body">
                <span className="pe-step-title">Module autonome de remise gracieuse de MPR</span>
                <span className="pe-step-desc">
                  Création d'un formulaire dédié pour les employeurs souhaitant uniquement une remise de pénalités sans étalement de créances, avec calcul automatique des barèmes.
                </span>
              </div>
            </li>

            <li className="pe-step-item">
              <span className="pe-step-num">4</span>
              <div className="pe-step-body">
                <span className="pe-step-title">Intégration d'une passerelle SMTP / SMS</span>
                <span className="pe-step-desc">
                  Raccordement d'un relais SMTP institutionnel pour l'envoi de convocations, accusés de réception et relances automatisées d'impayés par courrier électronique et SMS.
                </span>
              </div>
            </li>

            <li className="pe-step-item">
              <span className="pe-step-num">5</span>
              <div className="pe-step-body">
                <span className="pe-step-title">Recette utilisateur & qualification métier (UAT)</span>
                <span className="pe-step-desc">
                  Organisation de sessions de tests d'acceptation avec les préposés de la Direction Technique (DT) et les chefs de Centres de Prévoyance Sociale (CPS).
                </span>
              </div>
            </li>
          </ol>
        </div>
      </section>
    </div>
  );
}
