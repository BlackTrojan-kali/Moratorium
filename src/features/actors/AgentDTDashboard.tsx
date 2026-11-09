import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { DashboardLayout } from '../dashboard/DashboardLayout';
import { Load, useData, useWrite } from './common';
import type { Metric } from '../../types/domain';
import { api } from '../../app/api';

type ProcessingMetrics = {
  assignedToMe: number;
  unassigned: number;
  awaitingEmployer: number;
  over7Days: number;
  averageProcessingTime: string;
};

type ProcessingRequest = {
  id: string;
  reference: string;
  employerName: string;
  status: string;
  submittedAt: string;
  assignedTo: string | null;
  documentCompleteness: number;
  priority: 'high' | 'medium' | 'low';
  daysInQueue: number;
  version: number;
};

export function AgentDTDashboard() {
  const { user } = useAuth();
  const metrics = useData<ProcessingMetrics>('/dashboard?role=agent_dt');
  const queue = useData<{ requests: ProcessingRequest[]; total: number }>('/requests?view=work-queue');
  const [selectedRequest, setSelectedRequest] = useState<ProcessingRequest | null>(null);
  const [claimError, setClaimError] = useState('');

  const unavailableMetrics: Metric[] = [
    { label: 'Assigned to me', value: null, hint: 'Data unavailable' },
    { label: 'Unassigned', value: null, hint: 'Data unavailable' },
    { label: 'Awaiting employer', value: null, hint: 'Data unavailable' },
    { label: 'Over 7 days', value: null, hint: 'Data unavailable' },
  ];

  const dashboardMetrics: Metric[] = metrics.data ? [
    { label: 'Assigned to me', value: metrics.data.assignedToMe.toString(), hint: 'Requests requiring your review' },
    { label: 'Unassigned', value: metrics.data.unassigned.toString(), hint: 'Requests not yet assigned' },
    { label: 'Awaiting employer', value: metrics.data.awaitingEmployer.toString(), hint: 'Waiting for employer response' },
    { label: 'Over 7 days', value: metrics.data.over7Days.toString(), hint: 'Requests needing attention', tone: (metrics.data.over7Days > 5 ? 'red' : 'amber') as 'red' | 'amber' },
  ] : unavailableMetrics;

  const handleClaimRequest = async (requestId: string) => {
    try {
      const request = queue.data?.requests.find(item => item.id === requestId);
      if (!request) return;
      await api(`/requests/${requestId}/claim`, { version: request.version });
      queue.reload();
      setClaimError('');
    } catch (error) {
      setClaimError('Failed to claim request. Please try again.');
    }
  };

  const handleReleaseRequest = async (requestId: string) => {
    try {
      const request = queue.data?.requests.find(item => item.id === requestId);
      if (!request) return;
      await api(`/requests/${requestId}/release`, { version: request.version });
      queue.reload();
      setClaimError('');
    } catch (error) {
      setClaimError('Failed to release request. Please try again.');
    }
  };

  return (
    <DashboardLayout
      eyebrow="AGENT (DT)"
      title="Processing work queue"
      description="Review assigned moratorium files, check completeness, and prepare recommendations."
      action={
        <Link
          className="page-icon-button"
          to="/assignments"
          aria-label="View all assignments"
          title="View all assignments"
        >
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      }
      metrics={dashboardMetrics}
    >
      {claimError && <p role="alert" className="actor-note">{claimError}</p>}

      <div className="dashboard-grid">
        <section className="panel">
          <div className="panel-header">
            <h2>Processing queue</h2>
            <div className="panel-actions">
              <button onClick={queue.reload}>Refresh</button>
            </div>
          </div>

          <Load state={queue} />
          {queue.data && (
            <>
              <div className="queue-summary">
                <p>Total requests: <strong>{queue.data.total}</strong></p>
              </div>

              <table className="data-table">
                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Employer</th>
                    <th>Status</th>
                    <th>Assigned to</th>
                    <th>Documents</th>
                    <th>Priority</th>
                    <th>Days in queue</th>
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
                      <td>{request.assignedTo || 'Unassigned'}</td>
                      <td>
                        <div className="completeness-indicator">
                          <div 
                            className="completeness-bar" 
                            style={{ width: `${request.documentCompleteness}%` }}
                          />
                          <span>{request.documentCompleteness}%</span>
                        </div>
                      </td>
                      <td>
                        <span className={`priority-badge ${request.priority}`}>
                          {request.priority}
                        </span>
                      </td>
                      <td className={request.daysInQueue > 7 ? 'overdue' : ''}>
                        {request.daysInQueue} days
                      </td>
                      <td>
                        {request.assignedTo === user?.id ? (
                          <button 
                            onClick={() => handleReleaseRequest(request.id)}
                            className="secondary-button"
                          >
                            Release
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleClaimRequest(request.id)}
                            className="primary-button"
                          >
                            Claim
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              {!queue.data.requests.length && (
                <p className="empty-state">No requests in the processing queue.</p>
              )}
            </>
          )}
        </section>

        <section className="panel">
          <div className="panel-header">
            <h2>Workload summary</h2>
          </div>

          <Load state={metrics} />
          {metrics.data && (
            <div className="workload-stats">
              <div className="stat-card">
                <h3>My assignments</h3>
                <p className="stat-value">{metrics.data.assignedToMe}</p>
                <p className="stat-label">Active requests</p>
              </div>

              <div className="stat-card">
                <h3>Average processing time</h3>
                <p className="stat-value">{metrics.data.averageProcessingTime}</p>
                <p className="stat-label">Per request</p>
              </div>

              <div className="stat-card">
                <h3>Needs attention</h3>
                <p className="stat-value">{metrics.data.over7Days}</p>
                <p className="stat-label">Over 7 days</p>
              </div>

              <div className="stat-card">
                <h3>Unassigned</h3>
                <p className="stat-value">{metrics.data.unassigned}</p>
                <p className="stat-label">Available to claim</p>
              </div>
            </div>
          )}
        </section>
      </div>

      {selectedRequest && (
        <section className="panel">
          <div className="panel-header">
            <h2>Request details: {selectedRequest.reference}</h2>
            <button onClick={() => setSelectedRequest(null)}>Close</button>
          </div>
          <div className="request-preview">
            <p><strong>Employer:</strong> {selectedRequest.employerName}</p>
            <p><strong>Status:</strong> {selectedRequest.status}</p>
            <p><strong>Document completeness:</strong> {selectedRequest.documentCompleteness}%</p>
            <p><strong>Days in queue:</strong> {selectedRequest.daysInQueue}</p>
            <Link to={`/requests/${selectedRequest.id}`} className="primary-button">
              Open full request
            </Link>
          </div>
        </section>
      )}
    </DashboardLayout>
  );
}
