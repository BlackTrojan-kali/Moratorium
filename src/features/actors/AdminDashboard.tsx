import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PageHeader } from '../../components/ui/PageHeader';
import { useData } from './common';
import '../../styles/admin-dashboard.css';

interface PendingAccount {
  id: string;
  displayName: string;
  roleLabel: string;
  requestedAt: string | null;
}

interface PendingAccountsResponse {
  items: PendingAccount[];
}

function formatDate(value: string | null) {
  if (!value) return '—';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '—';

  return date.toLocaleDateString(undefined, {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export function AdminDashboard() {
  const state = useData<PendingAccountsResponse>(
    '/admin/activation-requests',
  );

  const accounts = Array.isArray(state.data?.items)
    ? state.data.items
    : null;

  const error =
    state.error ||
    (!state.loading && accounts === null
      ? 'Unable to read the pending accounts response.'
      : '');

  return (
    <div className="admin-dashboard">
      <PageHeader
        eyebrow="Administrator workspace"
        title="Dashboard"
        description="Review accounts awaiting activation."
      />

      <section
        className="admin-dashboard__panel"
        aria-labelledby="pending-accounts-title"
        aria-busy={state.loading}
      >
        <header className="admin-dashboard__panel-header">
          <h2 id="pending-accounts-title">
            Accounts awaiting activation
          </h2>

          <Link
            className="page-icon-button"
            to="/admin/users"
            aria-label="View accounts"
            title="View accounts"
          >
            <ArrowRight size={18} aria-hidden="true" />
          </Link>
        </header>

        <div className="admin-dashboard__table-wrapper">
          <table aria-labelledby="pending-accounts-title">
            <thead>
              <tr>
                <th scope="col">Name</th>
                <th scope="col">Role</th>
                <th scope="col">Requested</th>
                <th scope="col">Action</th>
              </tr>
            </thead>

            <tbody>
              {state.loading ? (
                <tr>
                  <td colSpan={4}>
                    <div
                      className="admin-dashboard__state"
                      role="status"
                    >
                      Loading accounts…
                    </div>
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={4}>
                    <div
                      className="admin-dashboard__state"
                      role="alert"
                    >
                      <p>{error}</p>

                      <button
                        type="button"
                        onClick={state.reload}
                      >
                        Retry
                      </button>
                    </div>
                  </td>
                </tr>
              ) : accounts?.length === 0 ? (
                <tr>
                  <td colSpan={4}>
                    <div className="admin-dashboard__state">
                      <span
                        className="admin-dashboard__empty-icon"
                        aria-hidden="true"
                      >
                        <svg
                          width="42"
                          height="42"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <circle cx="12" cy="7" r="4" />
                          <path d="M4 21v-2a8 8 0 0 1 16 0v2Z" />
                        </svg>
                      </span>

                      <p>No accounts awaiting activation.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                accounts?.map((account) => (
                  <tr key={account.id}>
                    <td>{account.displayName}</td>
                    <td>{account.roleLabel}</td>
                    <td>{formatDate(account.requestedAt)}</td>
                    <td>
                      <Link to="/admin/users">
                        Manage accounts
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}