import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { DashboardLayout } from '../dashboard/DashboardLayout';
import { Load, useData } from './common';
import type { Metric } from '../../types/domain';

type CPSMetrics = {
  activePlans: number;
  dueThisMonth: number;
  overdue: number;
  recoveredYTD: string;
};

type DepositConfirmation = {
  id: string;
  reference: string;
  employerName: string;
  depositAmount: string;
  submittedAt: string;
};

export function CPSDashboard() {
  const metrics = useData<CPSMetrics>('/dashboard?role=cps');
  const deposits = useData<{ items: DepositConfirmation[] }>('/dashboard?view=deposits');

  const dashboardMetrics: Metric[] = metrics.data ? [
    { label: 'Active plans', value: metrics.data.activePlans.toString(), hint: 'Active payment plans' },
    { label: 'Due this month', value: metrics.data.dueThisMonth.toString(), hint: 'Instalments due this month', tone: metrics.data.dueThisMonth > 10 ? 'amber' : 'green' as const },
    { label: 'Overdue', value: metrics.data.overdue.toString(), hint: 'Overdue instalments', tone: metrics.data.overdue > 0 ? 'red' : 'green' as const },
    { label: 'Recovered YTD', value: `${metrics.data.recoveredYTD} XAF`, hint: 'Total recovered this year' },
  ] : [
    { label: 'Active plans', value: '0', hint: 'Active payment plans' },
    { label: 'Due this month', value: '0', hint: 'Instalments due this month', tone: 'green' as const },
    { label: 'Overdue', value: '0', hint: 'Overdue instalments', tone: 'green' as const },
    { label: 'Recovered YTD', value: '0 XAF', hint: 'Total recovered this year' },
  ];

  return (
    <DashboardLayout
      eyebrow="CPS workspace"
      title="Dashboard"
      description="Issue reasoned opinions and monitor moratorium execution."
      action={
        <Link
          className="page-icon-button"
          to="/deposits"
          aria-label="Open the deposit queue"
          title="Open the deposit queue"
        >
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      }
      metrics={dashboardMetrics}
    >
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Deposit confirmations</h2>
            <Link
              className="page-icon-button"
              to="/deposits"
              aria-label="View all deposit confirmations"
              title="View all deposit confirmations"
            >
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          <Load state={deposits} />
          {deposits.data && deposits.data.items.length > 0 ? (
            <table className="data-table">
              <thead>
                <tr>
                  <th>Reference</th>
                  <th>Employer</th>
                  <th>Deposit amount</th>
                  <th>Submitted</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {deposits.data.items.slice(0, 5).map((deposit) => (
                  <tr key={deposit.id}>
                    <td>
                      <Link to={`/requests/${deposit.id}`}>{deposit.reference}</Link>
                    </td>
                    <td>{deposit.employerName}</td>
                    <td>{deposit.depositAmount} XAF</td>
                    <td>{new Date(deposit.submittedAt).toLocaleDateString()}</td>
                    <td>
                      <Link to="/deposits">Confirm</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="empty-state">No deposits pending confirmation</p>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Payment monitoring</h2>
            <Link
              className="page-icon-button"
              to="/payment-plans"
              aria-label="View payment plans"
              title="View payment plans"
            >
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
          </div>

          <div className="workload-stats">
            <div className="stat-card">
              <h3>Active plans</h3>
              <p className="stat-value">{metrics.data?.activePlans || 0}</p>
              <p className="stat-label">Payment plans</p>
            </div>

            <div className="stat-card">
              <h3>Due this month</h3>
              <p className="stat-value">{metrics.data?.dueThisMonth || 0}</p>
              <p className="stat-label">Instalments</p>
            </div>

            <div className="stat-card">
              <h3>Overdue</h3>
              <p className="stat-value">{metrics.data?.overdue || 0}</p>
              <p className="stat-label">Require attention</p>
            </div>

            <div className="stat-card">
              <h3>Recovered YTD</h3>
              <p className="stat-value">{metrics.data?.recoveredYTD || '0'} XAF</p>
              <p className="stat-label">Total recovered</p>
            </div>
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}