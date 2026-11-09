import { Link, useParams } from 'react-router-dom';

import { PageHeader } from '../../components/ui/PageHeader';
import { StatusChip } from '../../components/ui/StatusChip';
import type { RequestListItem } from '../../types/domain';

interface RequestDetailsProps {
  request?: RequestListItem | null;
  loading?: boolean;
  error?: string | null;
}

function formatDate(value: string | null): string {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return 'Unavailable';

  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function RequestDetails({
  request,
  loading = false,
  error = null,
}: RequestDetailsProps) {
  const { requestId } = useParams<{ requestId: string }>();

  // Never display a previously loaded request for a different URL.
  const matchingRequest =
    request && request.id === requestId ? request : undefined;

  const message = loading
    ? 'Loading request…'
    : error
      ? 'Unable to load this request.'
      : request === null
        ? 'This request could not be found.'
        : !matchingRequest
          ? 'Request information unavailable.'
          : null;

  return (
    <div className="dashboard-view">
      <PageHeader
        eyebrow="Employer portal"
        title="Request details"
        description="Review the information and status of your request."
        action={
          <Link className="secondary-button" to="/requests">
            ← Back to my requests
          </Link>
        }
      />

      <section className="panel" aria-busy={loading}>
        <div className="panel-header">
          <h2>Request overview</h2>
        </div>

        {message ? (
          <div className="employer-empty-panel">
            <p role={error ? 'alert' : 'status'}>{message}</p>
          </div>
        ) : matchingRequest ? (
          <dl className="profile-details">
            <div>
              <dt>Reference</dt>
              <dd>{matchingRequest.reference}</dd>
            </div>

            <div>
              <dt>Status</dt>
              <dd>
                <StatusChip status={matchingRequest.status} />
              </dd>
            </div>

            <div>
              <dt>Submitted on</dt>
              <dd>{formatDate(matchingRequest.submittedAt)}</dd>
            </div>
          </dl>
        ) : null}
      </section>
    </div>
  );
}
