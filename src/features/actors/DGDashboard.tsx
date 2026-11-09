import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { DashboardLayout } from '../dashboard/DashboardLayout';
import { Load, useData } from './common';
import type { Metric } from '../../types/domain';

type DecisionMetrics = {
  awaitingDecision: number;
  returned: number;
  approvedThisMonth: number;
  averageDecisionTime: string;
  remissionRequests: number;
};

type DecisionRequest = {
  id: string;
  reference: string;
  employerName: string;
  status: string;
  dtValidation: string;
  decisionStatus: string;
  finalLetter: string | null;
  isRemissionRequest: boolean;
  currentPosition: number;
  totalPositions: number;
  submittedAt: string;
  priority: 'high' | 'medium' | 'low';
  version: number;
  approvalChain: Array<{
    position: number;
    role: string;
    actorName: string;
    opinion: string;
    status: 'approved' | 'pending' | 'rejected';
  }>;
};

export function DGDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const metrics = useData<DecisionMetrics>('/dashboard?role=dg');
  const queue = useData<{ requests: DecisionRequest[]; total: number }>('/requests?view=decisions&stage=dg');

  const unavailableMetrics: Metric[] = [
    { label: 'Awaiting decision', value: null, hint: 'Data unavailable' },
    { label: 'Returned', value: null, hint: 'Data unavailable' },
    { label: 'Approved this month', value: null, hint: 'Data unavailable' },
    { label: 'Average decision time', value: null, hint: 'Data unavailable' },
  ];

  const dashboardMetrics: Metric[] = metrics.data ? [
    { label: 'Awaiting decision', value: metrics.data.awaitingDecision.toString(), hint: 'Requests requiring your final decision' },
    { label: 'Returned', value: metrics.data.returned.toString(), hint: 'Requests returned for review', tone: 'amber' as const },
    { label: 'Approved this month', value: metrics.data.approvedThisMonth.toString(), hint: 'Your approvals this month', tone: 'green' as const },
    { label: 'Average decision time', value: metrics.data.averageDecisionTime, hint: 'Your average processing time' },
  ] : unavailableMetrics;

  return (
    <DashboardLayout
      eyebrow="DG — Directeur Général"
      title="Final decision dashboard"
      description="Make final decisions and sign remise gracieuse decisions for the moratorium requests."
      action={
        <Link
          className="page-icon-button"
          to="/decisions"
          aria-label="Open the decision workspace"
          title="Open the decision workspace"
        >
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      }
      metrics={dashboardMetrics}
    >
      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Awaiting final decision</h2>
            <div className="panel-actions">
              <button onClick={queue.reload}>Refresh</button>
            </div>
          </div>

          <Load state={queue} />
          {queue.data && (
            <>
              <div className="queue-summary">
                <p>Total requests: <strong>{queue.data.total}</strong></p>
                {metrics.data && metrics.data.remissionRequests > 0 && (
                  <p className="actor-note">Remission requests pending: {metrics.data.remissionRequests}</p>
                )}
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Employer</th>
                    <th>Status</th>
                    <th>DT validation</th>
                    <th>Request type</th>
                    <th>Approval chain</th>
                    <th>Position in chain</th>
                    <th>Priority</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {queue.data.requests.map((request) => (
                    <tr key={request.id} className={request.priority === 'high' ? 'high-priority' : ''}>
                      <td>
                        <Link to={`/requests/${request.id}`}>{request.reference}</Link>
                      </td>
                      <td>{request.employerName}</td>
                      <td>{request.status}</td>
                      <td className="validation-summary">{request.dtValidation}</td>
                      <td>
                        {request.isRemissionRequest ? (
                          <span className="remission-badge">Remission</span>
                        ) : (
                          <span className="standard-badge">Standard</span>
                        )}
                      </td>
                      <td>
                        <div className="chain-summary">
                          {request.approvalChain.length} positions
                          <div className="chain-progress-mini">
                            {request.approvalChain.map((step, index) => (
                              <div 
                                key={index}
                                className={`chain-step ${step.status}`}
                                title={`${step.role}: ${step.actorName}`}
                              />
                            ))}
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="chain-position">
                          <span>Final step</span>
                          <div className="chain-progress">
                            <div 
                              className="chain-bar final" 
                              style={{ width: '90%' }}
                            />
                          </div>
                        </div>
                      </td>
                      <td>
                        <span className={`priority-badge ${request.priority}`}>
                          {request.priority}
                        </span>
                      </td>
                      <td>
                        <button 
                          onClick={() => navigate('/decisions')}
                          className="primary-button"
                        >
                          Decide
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!queue.data.requests.length && (
                <p className="empty-state">No requests awaiting your final decision.</p>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Decision performance</h2>
          </div>

          <Load state={metrics} />
          {metrics.data && (
            <div className="workload-stats">
              <div className="stat-card">
                <h3>Awaiting decision</h3>
                <p className="stat-value">{metrics.data.awaitingDecision}</p>
                <p className="stat-label">Requests in queue</p>
              </div>

              <div className="stat-card">
                <h3>Approved this month</h3>
                <p className="stat-value">{metrics.data.approvedThisMonth}</p>
                <p className="stat-label">Your approvals</p>
              </div>

              <div className="stat-card">
                <h3>Average decision time</h3>
                <p className="stat-value">{metrics.data.averageDecisionTime}</p>
                <p className="stat-label">Processing efficiency</p>
              </div>

              <div className="stat-card">
                <h3>Remission requests</h3>
                <p className="stat-value">{metrics.data.remissionRequests}</p>
                <p className="stat-label">Special decisions</p>
              </div>
            </div>
          )}
        </section>
      </div>

    </DashboardLayout>
  );
}
