import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { DashboardLayout } from '../dashboard/DashboardLayout';
import { Load, useData } from './common';
import type { Metric } from '../../types/domain';

type EndorsementMetrics = {
  awaitingEndorsement: number;
  returned: number;
  endorsedThisMonth: number;
  averageReviewTime: string;
  pendingLetters: number;
};

type EndorsementRequest = {
  id: string;
  reference: string;
  employerName: string;
  status: string;
  ceceaOpinion: string;
  endorsementStatus: string;
  draftLetter: string | null;
  currentPosition: number;
  totalPositions: number;
  submittedAt: string;
  priority: 'high' | 'medium' | 'low';
  version: number;
  technicalComplexity: 'low' | 'medium' | 'high';
};

export function SDCTDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const metrics = useData<EndorsementMetrics>('/dashboard?role=s_dct');
  const queue = useData<{ requests: EndorsementRequest[]; total: number }>('/requests?view=decisions&stage=s_dct');

  const unavailableMetrics: Metric[] = [
    { label: 'Awaiting endorsement', value: null, hint: 'Data unavailable' },
    { label: 'Returned', value: null, hint: 'Data unavailable' },
    { label: 'Endorsed this month', value: null, hint: 'Data unavailable' },
    { label: 'Average review time', value: null, hint: 'Data unavailable' },
  ];

  const dashboardMetrics: Metric[] = metrics.data ? [
    { label: 'Awaiting endorsement', value: metrics.data.awaitingEndorsement.toString(), hint: 'Requests requiring your endorsement' },
    { label: 'Returned', value: metrics.data.returned.toString(), hint: 'Requests returned for review', tone: 'amber' as const },
    { label: 'Endorsed this month', value: metrics.data.endorsedThisMonth.toString(), hint: 'Your endorsements this month', tone: 'green' as const },
    { label: 'Average review time', value: metrics.data.averageReviewTime, hint: 'Your average processing time' },
  ] : unavailableMetrics;

  return (
    <DashboardLayout
      eyebrow="S-DCT"
      title="Endorsement dashboard"
      description="Assess and endorse notes and draft letters from the approval chain."
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
            <h2>Awaiting endorsement</h2>
            <div className="panel-actions">
              <button onClick={queue.reload}>Refresh</button>
            </div>
          </div>

          <Load state={queue} />
          {queue.data && (
            <>
              <div className="queue-summary">
                <p>Total requests: <strong>{queue.data.total}</strong></p>
                {metrics.data && metrics.data.pendingLetters > 0 && (
                  <p className="actor-note">Draft letters pending review: {metrics.data.pendingLetters}</p>
                )}
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Employer</th>
                    <th>Status</th>
                    <th>CE/CEA opinion</th>
                    <th>Draft letter</th>
                    <th>Technical complexity</th>
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
                      <td className="opinion-summary">{request.ceceaOpinion}</td>
                      <td>
                        {request.draftLetter ? (
                          <span className="letter-present">Ready for review</span>
                        ) : (
                          <span className="letter-pending">Pending</span>
                        )}
                      </td>
                      <td>
                        <span className={`complexity-badge ${request.technicalComplexity}`}>
                          {request.technicalComplexity}
                        </span>
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
                          Endorse
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!queue.data.requests.length && (
                <p className="empty-state">No requests awaiting your endorsement.</p>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Endorsement performance</h2>
          </div>

          <Load state={metrics} />
          {metrics.data && (
            <div className="workload-stats">
              <div className="stat-card">
                <h3>Awaiting endorsement</h3>
                <p className="stat-value">{metrics.data.awaitingEndorsement}</p>
                <p className="stat-label">Requests in queue</p>
              </div>

              <div className="stat-card">
                <h3>Endorsed this month</h3>
                <p className="stat-value">{metrics.data.endorsedThisMonth}</p>
                <p className="stat-label">Your endorsements</p>
              </div>

              <div className="stat-card">
                <h3>Average review time</h3>
                <p className="stat-value">{metrics.data.averageReviewTime}</p>
                <p className="stat-label">Processing efficiency</p>
              </div>

              <div className="stat-card">
                <h3>Pending letters</h3>
                <p className="stat-value">{metrics.data.pendingLetters}</p>
                <p className="stat-label">Drafts to review</p>
              </div>
            </div>
          )}
        </section>
      </div>

    </DashboardLayout>
  );
}
