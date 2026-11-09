import { ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { DashboardLayout } from '../dashboard/DashboardLayout';
import { Load, useData } from './common';
import type { Metric } from '../../types/domain';

type ValidationMetrics = {
  awaitingValidation: number;
  lettersToSign: number;
  remissionDrafts: number;
  validatedThisMonth: number;
  averageValidationTime: string;
};

type ValidationRequest = {
  id: string;
  reference: string;
  employerName: string;
  status: string;
  sdctEndorsement: string;
  validationStatus: string;
  draftLetter: string | null;
  requiresSignature: boolean;
  isRemissionRequest: boolean;
  currentPosition: number;
  totalPositions: number;
  submittedAt: string;
  priority: 'high' | 'medium' | 'low';
  version: number;
  technicalValidity: 'valid' | 'questionable' | 'invalid';
};

export function DTDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const metrics = useData<ValidationMetrics>('/dashboard?role=dt');
  const queue = useData<{ requests: ValidationRequest[]; total: number }>('/requests?view=decisions&stage=dt');

  const unavailableMetrics: Metric[] = [
    { label: 'Awaiting validation', value: null, hint: 'Data unavailable' },
    { label: 'Letters to sign', value: null, hint: 'Data unavailable' },
    { label: 'Remission drafts', value: null, hint: 'Data unavailable' },
    { label: 'Validated this month', value: null, hint: 'Data unavailable' },
  ];

  const dashboardMetrics: Metric[] = metrics.data ? [
    { label: 'Awaiting validation', value: metrics.data.awaitingValidation.toString(), hint: 'Requests requiring your validation' },
    { label: 'Letters to sign', value: metrics.data.lettersToSign.toString(), hint: 'Pending signatures', tone: (metrics.data.lettersToSign > 3 ? 'amber' : 'green') as 'amber' | 'green' },
    { label: 'Remission drafts', value: metrics.data.remissionDrafts.toString(), hint: 'Remise gracieuse requests' },
    { label: 'Validated this month', value: metrics.data.validatedThisMonth.toString(), hint: 'Your validations this month', tone: 'green' as const },
  ] : unavailableMetrics;

  return (
    <DashboardLayout
      eyebrow="DT — Directeur Technique"
      title="Technical validation dashboard"
      description="Validate notes and manage letters requiring DT action and signature."
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
            <h2>Awaiting validation</h2>
            <div className="panel-actions">
              <button onClick={queue.reload}>Refresh</button>
            </div>
          </div>

          <Load state={queue} />
          {queue.data && (
            <>
              <div className="queue-summary">
                <p>Total requests: <strong>{queue.data.total}</strong></p>
                {metrics.data && metrics.data.lettersToSign > 0 && (
                  <p className="actor-note">Letters requiring signature: {metrics.data.lettersToSign}</p>
                )}
                {metrics.data && metrics.data.remissionDrafts > 0 && (
                  <p className="actor-note">Remission drafts to review: {metrics.data.remissionDrafts}</p>
                )}
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Employer</th>
                    <th>Status</th>
                    <th>S-DCT endorsement</th>
                    <th>Letter status</th>
                    <th>Request type</th>
                    <th>Technical validity</th>
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
                      <td className="endorsement-summary">{request.sdctEndorsement}</td>
                      <td>
                        {request.requiresSignature ? (
                          <span className="signature-required">Signature required</span>
                        ) : (
                          <span className="signature-not-required">No signature needed</span>
                        )}
                      </td>
                      <td>
                        {request.isRemissionRequest ? (
                          <span className="remission-badge">Remission</span>
                        ) : (
                          <span className="standard-badge">Standard</span>
                        )}
                      </td>
                      <td>
                        <span className={`validity-badge ${request.technicalValidity}`}>
                          {request.technicalValidity}
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
                          Validate
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!queue.data.requests.length && (
                <p className="empty-state">No requests awaiting your validation.</p>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Validation workload</h2>
          </div>

          <Load state={metrics} />
          {metrics.data && (
            <div className="workload-stats">
              <div className="stat-card">
                <h3>Awaiting validation</h3>
                <p className="stat-value">{metrics.data.awaitingValidation}</p>
                <p className="stat-label">Requests in queue</p>
              </div>

              <div className="stat-card">
                <h3>Letters to sign</h3>
                <p className="stat-value">{metrics.data.lettersToSign}</p>
                <p className="stat-label">Pending signatures</p>
              </div>

              <div className="stat-card">
                <h3>Remission drafts</h3>
                <p className="stat-value">{metrics.data.remissionDrafts}</p>
                <p className="stat-label">Special reviews needed</p>
              </div>

              <div className="stat-card">
                <h3>Validated this month</h3>
                <p className="stat-value">{metrics.data.validatedThisMonth}</p>
                <p className="stat-label">Your validations</p>
              </div>
            </div>
          )}
        </section>
      </div>

    </DashboardLayout>
  );
}
