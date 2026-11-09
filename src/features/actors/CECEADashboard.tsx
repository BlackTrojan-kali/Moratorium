import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { DashboardLayout } from '../dashboard/DashboardLayout';
import { Load, useData, useWrite } from './common';
import type { Metric } from '../../types/domain';

type OpinionMetrics = {
  awaitingDecision: number;
  returned: number;
  approvedThisMonth: number;
  averageDecisionTime: string;
  pendingCPSInput: number;
};

type OpinionRequest = {
  id: string;
  reference: string;
  employerName: string;
  status: string;
  agentNotes: string;
  agentRecommendation: string;
  cpsOpinion: string | null;
  currentPosition: number;
  totalPositions: number;
  submittedAt: string;
  priority: 'high' | 'medium' | 'low';
  version: number;
};

export function CECEADashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const metrics = useData<OpinionMetrics>('/dashboard?role=ce_cea');
  const queue = useData<{ requests: OpinionRequest[]; total: number }>('/requests?view=decisions');

  const unavailableMetrics: Metric[] = [
    { label: 'Awaiting decision', value: null, hint: 'Data unavailable' },
    { label: 'Returned', value: null, hint: 'Data unavailable' },
    { label: 'Approved this month', value: null, hint: 'Data unavailable' },
    { label: 'Average decision time', value: null, hint: 'Data unavailable' },
  ];

  const dashboardMetrics: Metric[] = metrics.data ? [
    { label: 'Awaiting decision', value: metrics.data.awaitingDecision.toString(), hint: 'Requests requiring your opinion' },
    { label: 'Returned', value: metrics.data.returned.toString(), hint: 'Requests returned for review', tone: 'amber' as const },
    { label: 'Approved this month', value: metrics.data.approvedThisMonth.toString(), hint: 'Your approvals this month', tone: 'green' as const },
    { label: 'Average decision time', value: metrics.data.averageDecisionTime, hint: 'Your average processing time' },
  ] : unavailableMetrics;

  return (
    <DashboardLayout
      eyebrow="CE / CEA"
      title="Opinion review dashboard"
      description="Analyse AGENT (DT) notes and provide your opinion for the approval chain."
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
            <h2>Awaiting opinion</h2>
            <div className="panel-actions">
              <button onClick={queue.reload}>Refresh</button>
            </div>
          </div>

          <Load state={queue} />
          {queue.data && (
            <>
              <div className="queue-summary">
                <p>Total requests: <strong>{queue.data.total}</strong></p>
                {metrics.data && metrics.data.pendingCPSInput > 0 && (
                  <p className="actor-note">Waiting for CPS input: {metrics.data.pendingCPSInput}</p>
                )}
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Employer</th>
                    <th>Status</th>
                    <th>Agent recommendation</th>
                    <th>CPS opinion</th>
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
                      <td className="agent-notes">{request.agentRecommendation}</td>
                      <td>
                        {request.cpsOpinion ? (
                          <span className="cps-opinion-present">Provided</span>
                        ) : (
                          <span className="cps-opinion-pending">Pending</span>
                        )}
                      </td>
                      <td>
                        <div className="chain-position">
                          <span>Step {request.currentPosition} of {request.totalPositions}</span>
                          <div className="chain-progress">
                            <div 
                              className="chain-bar" 
                              style={{ width: `${(request.currentPosition / request.totalPositions) * 100}%` }}
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
                          Review
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!queue.data.requests.length && (
                <p className="empty-state">No requests awaiting your opinion.</p>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Performance summary</h2>
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
                <h3>Returned</h3>
                <p className="stat-value">{metrics.data.returned}</p>
                <p className="stat-label">Requests returned</p>
              </div>
            </div>
          )}
        </section>
      </div>

    </DashboardLayout>
  );
}
