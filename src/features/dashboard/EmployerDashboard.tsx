import { Link } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { useData } from '../actors/common';
import { DashboardLayout } from './DashboardLayout';
import { useNewRequestModal } from '../deposit/NewRequestModalContext';
import type { Metric } from '../../types/domain';

interface ActivePlanSummary {
  id: string;
  state: string;
  scheduled: string;
  reference: string;
  paid: string;
}

interface NextInstalment {
  amount: string;
  dueDate: string;
  position: number;
  planId: string;
  reference: string;
}

interface NotificationItem {
  id: string;
  message: string;
  created_at: string;
  read_at: string | null;
}

interface EmployerDashboardData {
  totalRequests: number;
  underReview: number;
  actionRequired: number;
  nextAmountDue: string | null;
  nextInstalment?: NextInstalment | null;
  activePlan?: ActivePlanSummary | null;
  notifications?: NotificationItem[];
}

interface RecentRequest {
  id: string;
  reference: string;
  status: string;
  submittedAt: string;
  debtAmount: string;
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

export function EmployerDashboard() {
  const { openNewRequestModal } = useNewRequestModal();
  const dashboard = useData<EmployerDashboardData>('/dashboard?role=employer');
  const requests = useData<{ items: RecentRequest[] }>('/requests?status=Action required,Under review');

  const d = dashboard.data;

  const dashboardMetrics: Metric[] = d ? [
    {
      label: 'Demandes totales',
      value: (d.totalRequests ?? 0).toString(),
      hint: 'Toutes vos demandes de moratoire',
    },
    {
      label: 'En cours d\'instruction',
      value: (d.underReview ?? 0).toString(),
      hint: 'Dossiers en cours de traitement',
      tone: 'blue' as const,
    },
    {
      label: 'Action requise',
      value: (d.actionRequired ?? 0).toString(),
      hint: 'Dossiers à corriger ou compléter',
      tone: (d.actionRequired ?? 0) > 0 ? 'red' : 'green' as const,
    },
    {
      label: 'Prochaine échéance',
      value: d.nextInstalment ? formatMoney(d.nextInstalment.amount) : '—',
      hint: d.nextInstalment ? `Date limite : ${formatDate(d.nextInstalment.dueDate)}` : 'Aucun impayé immédiat',
      tone: d.nextInstalment && new Date(d.nextInstalment.dueDate) < new Date() ? 'red' : undefined,
    },
  ] : [
    { label: 'Demandes totales', value: '0', hint: 'Toutes vos demandes de moratoire' },
    { label: 'En cours d\'instruction', value: '0', hint: 'Dossiers en cours de traitement', tone: 'blue' as const },
    { label: 'Action requise', value: '0', hint: 'Dossiers à corriger ou compléter', tone: 'green' as const },
    { label: 'Prochaine échéance', value: '—', hint: 'Aucun impayé immédiat' },
  ];

  const plan = d?.activePlan;
  const planScheduled = BigInt(plan?.scheduled || '0');
  const planPaid = BigInt(plan?.paid || '0');
  const percent = planScheduled > 0n ? Math.min(100, Number((planPaid * 100n) / planScheduled)) : 0;

  return (
    <DashboardLayout
      eyebrow="Portail Employeur"
      title="Tableau de bord"
      description="Suivez l'avancement de vos demandes de moratoire, vos actions requises et vos échéances de paiement."
      action={
        <button
          className="primary-button"
          type="button"
          onClick={openNewRequestModal}
        >
          + Nouvelle demande
        </button>
      }
      metrics={dashboardMetrics}
    >
      <div>
        <section className="panel">
          <div className="panel-header">
            <h2>Mes demandes récentes</h2>
            <Link
              className="page-icon-button"
              to="/requests"
              aria-label="Voir toutes les demandes"
              title="Voir toutes les demandes"
            >
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          {requests.data && requests.data.items.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Référence</th>
                  <th>Statut</th>
                  <th>Dette déclarée</th>
                  <th>Date soumission</th>
                </tr>
              </thead>
              <tbody>
                {requests.data.items.slice(0, 5).map((request) => (
                  <tr key={request.id}>
                    <td>
                      <Link to={`/requests/${request.id}`}>{request.reference}</Link>
                    </td>
                    <td>{request.status}</td>
                    <td>{formatMoney(request.debtAmount)}</td>
                    <td>{new Date(request.submittedAt).toLocaleDateString('fr-FR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">Aucune demande en cours d'action</p>
          )}
        </section>
      </div>

      <div className="employer-bottom-grid">
        {/* Payment progress card */}
        <section className="panel">
          <div className="panel-header">
            <h2>Avancement du moratoire</h2>
            <Link
              className="page-icon-button"
              to="/payments"
              aria-label="Consulter l'échéancier"
              title="Consulter l'échéancier"
            >
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          {plan ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: '#355342' }}>
                  Moratoire <strong>{plan.reference}</strong> ({plan.state})
                </span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#14583d' }}>
                  {percent}% réglé
                </span>
              </div>

              <div style={{ width: '100%', height: 10, background: '#e6ede9', borderRadius: 999, overflow: 'hidden' }}>
                <div
                  style={{
                    width: `${percent}%`,
                    height: '100%',
                    background: '#14583d',
                    borderRadius: 999,
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#617769' }}>
                <span>Payé : <strong>{formatMoney(plan.paid)}</strong></span>
                <span>Total : <strong>{formatMoney(plan.scheduled)}</strong></span>
              </div>

              {d?.nextInstalment && (
                <div style={{ background: '#f0f7f3', border: '1px solid #b7d7c6', borderRadius: 8, padding: '10px 12px', fontSize: 12 }}>
                  <strong>Prochaine mensualité : </strong>
                  {formatMoney(d.nextInstalment.amount)} avant le <strong>{formatDate(d.nextInstalment.dueDate)}</strong>
                </div>
              )}

              <Link
                className="secondary-button"
                to={`/payments/${plan.id}`}
                style={{ alignSelf: 'flex-start', marginTop: 4 }}
              >
                Ouvrir mon échéancier complet →
              </Link>
            </div>
          ) : (
            <div style={{ padding: '12px 0' }}>
              <p className="empty-state" style={{ marginBottom: 12 }}>
                Aucun plan d'apurement actif.
              </p>
              <p style={{ fontSize: 12, color: '#617769', margin: 0 }}>
                Dès qu'une demande de moratoire est approuvée par la CNPS, votre échéancier mensuel s'affichera ici.
              </p>
            </div>
          )}
        </section>

        {/* Recent activity / notifications card */}
        <section className="panel">
          <div className="panel-header">
            <h2>Activité récente</h2>
            <Link
              className="page-icon-button"
              to="/notifications"
              aria-label="Voir toutes les notifications"
              title="Voir toutes les notifications"
            >
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          {d?.notifications && d.notifications.length > 0 ? (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {d.notifications.map((n) => (
                <li
                  key={n.id}
                  style={{
                    padding: '8px 12px',
                    borderRadius: 8,
                    background: n.read_at ? '#f9fcf9' : '#eef7f2',
                    border: '1px solid #e1ebe5',
                    fontSize: 12,
                  }}
                >
                  <div style={{ fontWeight: n.read_at ? 500 : 700, color: '#1a2e22', marginBottom: 2 }}>
                    {n.message}
                  </div>
                  <div style={{ fontSize: 11, color: '#7a8e81' }}>
                    {formatDate(n.created_at)}
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="empty-state">Aucune notification récente</p>
          )}
        </section>
      </div>
    </DashboardLayout>
  );
}