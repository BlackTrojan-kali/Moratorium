import { useEffect, useMemo, useState } from 'react';
import { RefreshCw, Search, ShieldCheck, UserRound } from 'lucide-react';

import { api } from '../../app/api';
import { roleLabelKeys } from '../../config/roles';
import { useTranslation } from '../../i18n/I18nContext';
import type { UserRole } from '../../types/domain';

interface Account {
  id: string;
  displayName: string;
  email: string | null;
  role: UserRole;
  active: boolean;
  employerId: string | null;
}

interface Employer {
  id: string;
  name: string;
  cnps_number: string | null;
}

interface Draft {
  role: UserRole;
  employerId: string;
}

// Roles that decide or endorse a file, plus administration, grant real power.
const privileged: UserRole[] = ['ce_cea', 's_dct', 'dt', 'dg', 'administrator'];

/**
 * Administrator view of every account. Accounts are created by their owners
 * through the public sign-up page, so this screen only assigns the role that
 * decides what an account may do.
 */
export function UserAccounts() {
  const { t } = useTranslation();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [employers, setEmployers] = useState<Employer[]>([]);
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);

  async function load() {
    const [users, organisations] = await Promise.all([
      api<{ users: Account[] }>('/admin/users'),
      api<{ employers: Employer[] }>('/admin/employers'),
    ]);

    setAccounts(users.users);
    setEmployers(organisations.employers);
    setDrafts(
      Object.fromEntries(
        users.users.map(account => [
          account.id,
          { role: account.role, employerId: account.employerId ?? '' },
        ]),
      ),
    );
  }

  useEffect(() => {
    load()
      .catch(caught =>
        setError(
          caught instanceof Error
            ? caught.message
            : 'Unable to load the accounts.',
        ),
      )
      .finally(() => setLoading(false));
  }, []);

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) return accounts;

    return accounts.filter(
      account =>
        account.displayName.toLowerCase().includes(query) ||
        account.email?.toLowerCase().includes(query) ||
        t(roleLabelKeys[account.role]).toLowerCase().includes(query),
    );
  }, [accounts, search]);

  async function run(work: () => Promise<void>, note: string) {
    setBusy(true);
    setError('');
    setMessage('');
    setResetLink('');

    try {
      await work();
      await load();
      setMessage(note);
    } catch (caught) {
      setError(
        caught instanceof Error ? caught.message : 'The change was refused.',
      );
    } finally {
      setBusy(false);
    }
  }

  function changeRole(account: Account) {
    const draft = drafts[account.id];

    if (!draft || draft.role === account.role) return;

    if (
      privileged.includes(draft.role) &&
      !window.confirm(
        `${account.displayName} will be able to act as ${t(roleLabelKeys[draft.role])}. Continue?`,
      )
    ) {
      setDrafts(current => ({
        ...current,
        [account.id]: { role: account.role, employerId: account.employerId ?? '' },
      }));
      return;
    }

    void run(
      async () => {
        await api(`/admin/users/${account.id}/role`, {
          role: draft.role,
          employerId: draft.employerId || undefined,
        });
      },
      `${account.displayName} is now ${t(roleLabelKeys[draft.role])}.`,
    );
  }

  function issueResetLink(account: Account) {
    void run(async () => {
      const result = await api<{ token: string }>(
        `/admin/users/${account.id}/reset-link`,
        {},
      );

      setResetLink(
        `${window.location.origin}/reset-password#token=${result.token}`,
      );
    }, 'Reset link created.');
  }

  function toggleActive(account: Account) {
    void run(
      async () => {
        await api(`/admin/users/${account.id}/active`, {
          active: !account.active,
        });
      },
      account.active
        ? `${account.displayName} is disabled and signed out.`
        : `${account.displayName} can sign in again.`,
    );
  }

  return (
    <div className="user-accounts">
      <p className="page-card-text">
        Accounts register themselves through the public sign-up page. Assign
        the role that matches what each person does; the change applies the
        moment their browser makes its next request.
      </p>

      <div className="page-toolbar">
        <Search size={20} aria-hidden="true" />

        <label className="page-sr-only" htmlFor="account-search">
          Search accounts
        </label>

        <input
          id="account-search"
          type="search"
          placeholder="Search by name, email or role"
          value={search}
          onChange={event => setSearch(event.target.value)}
        />

        <button
          type="button"
          className="page-button"
          onClick={() => void run(async () => {}, 'List refreshed.')}
          disabled={busy || loading}
        >
          <RefreshCw size={15} aria-hidden="true" />
          <span style={{ marginLeft: 6 }}>Refresh</span>
        </button>
      </div>

      {loading && (
        <p className="page-state" role="status">
          Loading accounts…
        </p>
      )}

      {error && (
        <p className="page-alert" role="alert">
          {error}
        </p>
      )}

      {message && (
        <p className="page-note" role="status">
          {message}
        </p>
      )}

      {resetLink && (
        <div className="page-note">
          <span>
            Share this link privately with the verified owner. It expires in 30
            minutes.
          </span>
          <a href={resetLink}>{resetLink}</a>
        </div>
      )}

      {!loading && visible.length === 0 && (
        <p className="page-state" role="status">
          No account matches this search. {accounts.length} account
          {accounts.length === 1 ? '' : 's'} in total.
        </p>
      )}

      {visible.length > 0 && (
        <ul className="page-list">
          {visible.map(account => {
            const draft = drafts[account.id] ?? {
              role: account.role,
              employerId: account.employerId ?? '',
            };

            const needsEmployer =
              draft.role === 'employer' && !draft.employerId;

            return (
              <li className="page-row" key={account.id}>
                <span className="page-row-icon">
                  {account.role === 'administrator' ? (
                    <ShieldCheck size={19} aria-hidden="true" />
                  ) : (
                    <UserRound size={19} aria-hidden="true" />
                  )}
                </span>

                <div className="page-row-copy">
                  <strong>
                    {account.displayName}
                    {!account.active && (
                      <span className="page-badge page-badge-muted">
                        Disabled
                      </span>
                    )}
                  </strong>

                  <span>{account.email ?? 'No email address'}</span>
                  <span>{t(roleLabelKeys[account.role])}</span>
                </div>

                <div className="page-actions">
                  <label className="account-field">
                    Role
                    <select
                      value={draft.role}
                      disabled={busy}
                      onChange={event =>
                        setDrafts(current => ({
                          ...current,
                          [account.id]: {
                            ...draft,
                            role: event.target.value as UserRole,
                          },
                        }))
                      }
                    >
                      {Object.entries(roleLabelKeys).map(([value, key]) => (
                        <option key={value} value={value}>
                          {t(key)}
                        </option>
                      ))}
                    </select>
                  </label>

                  {needsEmployer && (
                    <label className="account-field">
                      Employer
                      <select
                        value={draft.employerId}
                        disabled={busy}
                        onChange={event =>
                          setDrafts(current => ({
                            ...current,
                            [account.id]: {
                              ...draft,
                              employerId: event.target.value,
                            },
                          }))
                        }
                      >
                        <option value="">Select an employer</option>
                        {employers.map(employer => (
                          <option key={employer.id} value={employer.id}>
                            {employer.cnps_number
                              ? `${employer.name} (${employer.cnps_number})`
                              : employer.name}
                          </option>
                        ))}
                      </select>
                    </label>
                  )}

                  <button
                    type="button"
                    className="page-button page-button-primary"
                    disabled={
                      busy ||
                      draft.role === account.role ||
                      (needsEmployer && !draft.employerId)
                    }
                    onClick={() => changeRole(account)}
                  >
                    Apply role
                  </button>

                  <button
                    type="button"
                    className="page-button"
                    disabled={busy}
                    onClick={() => toggleActive(account)}
                  >
                    {account.active ? 'Disable' : 'Enable'}
                  </button>

                  <button
                    type="button"
                    className="page-button"
                    disabled={busy || !account.active}
                    onClick={() => issueResetLink(account)}
                  >
                    Reset link
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
