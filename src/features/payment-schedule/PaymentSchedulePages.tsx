import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useData, Load } from '../actors/common';
import { useNewRequestModal } from '../deposit/NewRequestModalContext';
import '../../styles/payment-schedule.css';

interface Instalment {
  id: string;
  position: number;
  due_date: string;
  amount_xaf: string;
  amountDue: string;
  amountPaid: string;
  outstanding: string;
  status: string;
}

interface Payment {
  id: string;
  reference: string;
  amount_xaf: string;
  paid_on: string;
  evidence: string;
  reversed_at: string | null;
  reversal_reason: string | null;
  recordedBy?: string;
}

interface RecoveryNote {
  id: string;
  actorName: string;
  note: string;
  deadline: string | null;
}

export interface PlanDetailData {
  id: string;
  reference: string;
  version: number;
  state: string;
  principal_xaf: string;
  balance: string;
  totalPaid: string;
  terms_reference: string;
  checked_through: string | null;
  debtAmount?: string | null;
  depositAmount?: string | null;
  depositReference?: string | null;
  employerName?: string | null;
  cnpsNumber?: string | null;
  proposedMonths?: number | null;
  instalments: Instalment[];
  payments: Payment[];
  defaults: { instalment_id: string }[];
  notes: RecoveryNote[];
  permissions: {
    edit: boolean;
    activate: boolean;
    record: boolean;
    reverse: boolean;
    followUp: boolean;
  };
}

interface PlanSummary {
  id: string;
  reference: string;
  employerName: string;
  state: string;
  principal_xaf: string;
  totalPaid: string;
  balance?: string;
  debtAmount?: string;
  depositAmount?: string;
}

function formatMoney(amount: string | number | null | undefined): string {
  if (amount == null || amount === '') return '0 XAF';
  const num = Number(amount);
  if (Number.isNaN(num)) return `${amount} XAF`;
  return `${num.toLocaleString('fr-FR')} XAF`;
}

function formatDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (Number.isNaN(d.getTime())) return dateStr;
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}

function statusBadgeClass(status: string): string {
  switch (status.toLowerCase()) {
    case 'paid':
    case 'payé':
    case 'completed':
    case 'soldé':
      return 'paid';
    case 'partially paid':
    case 'partiellement payé':
      return 'partially-paid';
    case 'overdue':
    case 'en retard':
    case 'defaulted':
      return 'overdue';
    default:
      return 'scheduled';
  }
}

function translateStatus(status: string): string {
  switch (status.toLowerCase()) {
    case 'paid':
      return 'Payé';
    case 'partially paid':
      return 'Partiellement payé';
    case 'overdue':
      return 'En retard';
    case 'scheduled':
      return 'À venir';
    case 'active':
      return 'Actif';
    case 'draft':
      return 'Brouillon';
    case 'completed':
      return 'Soldé';
    case 'defaulted':
      return 'Défaut de paiement';
    default:
      return status;
  }
}

export function PaymentSchedulePage() {
  const { requestId } = useParams<{ requestId?: string }>();
  const plansState = useData<{ items: PlanSummary[]; total: number }>('/payment-plans');
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const { openNewRequestModal } = useNewRequestModal();

  const activeId = requestId || selectedPlanId || (plansState.data?.items?.[0]?.id ?? null);

  return (
    <div className="schedule-module">
      <Load state={plansState} />

      {plansState.data && (
        <>
          {plansState.data.items.length === 0 ? (
            <div className="schedule-empty">
              <span style={{ fontSize: '48px' }}>📅</span>
              <h3>Aucun échéancier de paiement disponible</h3>
              <p>
                Votre échéancier de paiement sera automatiquement généré dès que votre demande de
                moratoire aura été validée et approuvée par la CNPS.
              </p>
              <div className="schedule-actions" style={{ justifyContent: 'center' }}>
                <Link className="primary-button" to="/requests">
                  Consulter mes demandes
                </Link>
                <button
                  type="button"
                  className="secondary-button"
                  onClick={openNewRequestModal}
                >
                  Nouvelle demande de moratoire
                </button>
              </div>
            </div>
          ) : (
            <>
              {plansState.data.items.length > 1 && !requestId && (
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontWeight: 600, marginRight: 10, fontSize: 14 }}>
                    Sélectionner un moratoire :
                  </label>
                  <select
                    value={activeId || ''}
                    onChange={e => setSelectedPlanId(e.target.value)}
                    style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #c2d5ca', font: 'inherit' }}
                  >
                    {plansState.data.items.map(p => (
                      <option key={p.id} value={p.id}>
                        {p.reference} ({p.state}) — Reste : {formatMoney(p.balance || p.principal_xaf)}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeId && <PaymentScheduleDetails planId={activeId} />}
            </>
          )}
        </>
      )}
    </div>
  );
}

export function PaymentScheduleDetails({ planId }: { planId: string }) {
  const planState = useData<PlanDetailData>(`/payment-plans/${planId}`);
  const plan = planState.data;

  if (planState.loading) {
    return <p role="status">Chargement de votre échéancier…</p>;
  }

  if (planState.error || !plan) {
    return (
      <div className="schedule-empty">
        <p role="alert">Impossible de charger cet échéancier de paiement.</p>
        <Link className="secondary-button" to="/payments">
          Retour aux échéanciers
        </Link>
      </div>
    );
  }

  const principal = BigInt(plan.principal_xaf || '0');
  const paid = BigInt(plan.totalPaid || '0');
  const balance = BigInt(plan.balance || (principal - paid).toString());
  const percent = principal > 0n ? Math.min(100, Number((paid * 100n) / principal)) : 0;

  // Next pending instalment
  const nextInstalment = plan.instalments.find(i => i.status !== 'Paid');
  const isOverdue = nextInstalment
    ? new Date(nextInstalment.due_date + 'T00:00:00Z') < new Date()
    : false;

  return (
    <div>
      {/* Official CNPS Print Header (visible only on print) */}
      <div className="schedule-print-header">
        <p style={{ fontWeight: 'bold', margin: '0 0 4px', fontSize: '13px' }}>
          RÉPUBLIQUE DU CAMEROUN · PAIX – TRAVAIL – PATRIE
        </p>
        <p style={{ fontWeight: 'bold', margin: '0 0 10px', fontSize: '14px', color: '#14583d' }}>
          CAISSE NATIONALE DE PRÉVOYANCE SOCIALE (CNPS)
        </p>
        <h2 style={{ margin: '8px 0', fontSize: '18px' }}>
          ÉCHÉANCIER DE PAIEMENT DU MORATOIRE
        </h2>
        <p style={{ margin: 0, fontSize: '12px' }}>
          Réf. Demande : <strong>{plan.reference}</strong> · Réf. Décision : {plan.terms_reference || 'N/A'}
        </p>
        {plan.employerName && (
          <p style={{ margin: '4px 0 0', fontSize: '12px' }}>
            Employeur : <strong>{plan.employerName}</strong> {plan.cnpsNumber ? `(N° CNPS: ${plan.cnpsNumber})` : ''}
          </p>
        )}
      </div>

      {/* Screen Heading */}
      <header className="schedule-heading">
        <div>
          <p className="schedule-eyebrow">MoraPay · Échéancier de paiement</p>
          <h1>Échéancier — {plan.reference}</h1>
          <p>
            Suivi des échéances et des versements constatés pour votre accord de moratoire.
          </p>
        </div>

        <div className="schedule-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => window.print()}
          >
            🖨️ Imprimer l'échéancier officiel
          </button>
          <Link
            className="secondary-button"
            to={`/requests/${plan.id}`}
          >
            📄 Voir la demande
          </Link>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="schedule-kpi-grid">
        <div className="schedule-kpi-card accent-blue">
          <p className="schedule-kpi-label">Dette sous moratoire</p>
          <p className="schedule-kpi-value">{formatMoney(plan.debtAmount || plan.principal_xaf)}</p>
          <p className="schedule-kpi-hint">
            {plan.depositAmount ? `Acompte réglé : ${formatMoney(plan.depositAmount)}` : 'Montant total accordé'}
          </p>
        </div>

        <div className="schedule-kpi-card accent-green">
          <p className="schedule-kpi-label">Total réglé</p>
          <p className="schedule-kpi-value">{formatMoney(plan.totalPaid)}</p>
          <p className="schedule-kpi-hint">{percent}% amorti à ce jour</p>
        </div>

        <div className="schedule-kpi-card accent-amber">
          <p className="schedule-kpi-label">Solde restant à devoir</p>
          <p className="schedule-kpi-value">{formatMoney(balance.toString())}</p>
          <p className="schedule-kpi-hint">
            {plan.instalments.filter(i => i.status !== 'Paid').length} mensualités restantes
          </p>
        </div>

        <div className={`schedule-kpi-card ${isOverdue ? 'accent-red' : 'accent-green'}`}>
          <p className="schedule-kpi-label">Prochaine échéance</p>
          <p className="schedule-kpi-value">
            {nextInstalment ? formatMoney(nextInstalment.amountDue) : 'Soldé'}
          </p>
          <p className="schedule-kpi-hint">
            {nextInstalment ? `Date limite : ${formatDate(nextInstalment.due_date)}` : 'Toutes les échéances sont réglées'}
          </p>
        </div>
      </div>

      {/* Progress Bar */}
      <section className="schedule-progress-panel">
        <div className="schedule-progress-header">
          <h3 className="schedule-progress-title">Progression de l'amortissement du moratoire</h3>
          <span className="schedule-progress-percent">{percent}% réglé</span>
        </div>
        <div className="schedule-progress-track">
          <div
            className="schedule-progress-fill"
            style={{ width: `${percent}%` }}
            role="progressbar"
            aria-valuenow={percent}
            aria-valuemin={0}
            aria-valuemax={100}
          />
        </div>
        <div className="schedule-progress-footer">
          <span>Payé : <strong>{formatMoney(plan.totalPaid)}</strong></span>
          <span>Reste à payer : <strong>{formatMoney(balance.toString())}</strong></span>
        </div>
      </section>

      {/* Next Due Alert */}
      {nextInstalment && (
        <div className={`schedule-next-due-callout ${isOverdue ? 'is-overdue' : ''}`}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <span className="schedule-callout-icon">{isOverdue ? '⚠️' : '🗓️'}</span>
            <div className="schedule-callout-content">
              <h4>
                Mensualité N° {nextInstalment.position} : {formatMoney(nextInstalment.amountDue)}
              </h4>
              <p>
                Date d'exigibilité légale : <strong>{formatDate(nextInstalment.due_date)}</strong>
                {isOverdue && ' — Cette mensualité est en retard de paiement.'}
              </p>
            </div>
          </div>
          <span className={`schedule-callout-badge ${isOverdue ? 'red' : 'green'}`}>
            {isOverdue ? 'Échéance dépassée' : 'Prochaine exigibilité'}
          </span>
        </div>
      )}

      {/* Table: Instalments */}
      <section className="schedule-panel">
        <div className="schedule-panel-header">
          <h2>Tableau officiel des échéances</h2>
          <p>
            Échéances mensuelles convenues avec la CNPS. Réf. décision : {plan.terms_reference || 'N/A'}.
          </p>
        </div>

        <div className="schedule-table-wrap">
          <table className="schedule-table">
            <thead>
              <tr>
                <th className="center-col">N°</th>
                <th>Date d'exigibilité</th>
                <th className="num-col">Montant exigible</th>
                <th className="num-col">Montant réglé</th>
                <th className="num-col">Reste à payer</th>
                <th className="center-col">Statut</th>
              </tr>
            </thead>
            <tbody>
              {plan.instalments.map(i => (
                <tr key={i.id}>
                  <td className="center-col">
                    <strong>{i.position}</strong>
                  </td>
                  <td>{formatDate(i.due_date)}</td>
                  <td className="num-col">{formatMoney(i.amountDue)}</td>
                  <td className="num-col">{formatMoney(i.amountPaid)}</td>
                  <td className="num-col">{formatMoney(i.outstanding)}</td>
                  <td className="center-col">
                    <span className={`schedule-status-chip ${statusBadgeClass(i.status)}`}>
                      {translateStatus(i.status)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Table: Observed Payments */}
      <section className="schedule-panel">
        <div className="schedule-panel-header">
          <h2>Règlements constatés & quittances CNPS</h2>
          <p>
            Versements vérifiés et imputés sur votre compte cotisant par le Centre de Prévoyance Sociale.
          </p>
        </div>

        {plan.payments.length > 0 ? (
          <div className="schedule-table-wrap">
            <table className="schedule-table">
              <thead>
                <tr>
                  <th>Référence transaction</th>
                  <th>Date de paiement</th>
                  <th className="num-col">Montant imputé</th>
                  <th>Justificatif / Bordereau</th>
                  <th>Statut</th>
                </tr>
              </thead>
              <tbody>
                {plan.payments.map(p => (
                  <tr key={p.id}>
                    <td>
                      <code>{p.reference}</code>
                    </td>
                    <td>{formatDate(p.paid_on)}</td>
                    <td className="num-col">{formatMoney(p.amount_xaf)}</td>
                    <td>{p.evidence || '—'}</td>
                    <td>
                      {p.reversed_at ? (
                        <span className="schedule-status-chip overdue">
                          Annulé ({p.reversal_reason || 'Correction'})
                        </span>
                      ) : (
                        <span className="schedule-status-chip paid">Validé CNPS</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p style={{ color: '#617769', fontSize: 13, margin: '10px 0' }}>
            Aucun versement d'échéance n'a encore été enregistré pour ce moratoire.
          </p>
        )}
      </section>

      {/* Follow-up notes if any */}
      {plan.notes.length > 0 && (
        <section className="schedule-panel">
          <div className="schedule-panel-header">
            <h2>Notifications de recouvrement & rappels</h2>
          </div>
          <ul style={{ margin: 0, paddingLeft: 20 }}>
            {plan.notes.map(n => (
              <li key={n.id} style={{ marginBottom: 10, fontSize: 13 }}>
                <strong>{n.actorName}</strong> : {n.note}
                {n.deadline && (
                  <span style={{ color: '#b91c1c', fontWeight: 600 }}>
                    {' '}· Date limite de régularisation : {formatDate(n.deadline)}
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Instructions & payment info */}
      <section className="schedule-instructions">
        <h4>Modalités et consignes de paiement à la CNPS</h4>
        <ul>
          <li>
            <strong>Référence obligatoire :</strong> Mentionnez impérativement la référence{' '}
            <code>{plan.reference}</code> sur chaque ordre de virement ou bordereau de versement bancaire.
          </li>
          <li>
            <strong>Transmission du justificatif :</strong> Transmettez copie du reçu ou bordereau de
            paiement à votre Centre de Prévoyance Sociale gestionnaire dès exécution.
          </li>
          <li>
            <strong>Défaut de paiement :</strong> Tout retard de plus de 3 mensualités consécutives après le
            délai de grâce entraîne la caducité automatique du moratoire et le transfert du dossier au
            contentieux pour recouvrement forcé.
          </li>
        </ul>
      </section>
    </div>
  );
}

export function PaymentSchedulePrint() {
  const { requestId } = useParams<{ requestId: string }>();
  return (
    <div className="schedule-module">
      {requestId ? (
        <PaymentScheduleDetails planId={requestId} />
      ) : (
        <p>Veuillez spécifier une référence de moratoire.</p>
      )}
    </div>
  );
}
