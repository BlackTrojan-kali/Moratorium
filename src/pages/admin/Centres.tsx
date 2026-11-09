import {
  useEffect,
  useRef,
  useState,
} from 'react';

import { Building2, Plus, Search } from 'lucide-react';

import { api } from '../../app/api';

import '../../styles/centres.css';

interface Choice {
  code: string;
  label: string;
}

interface CentreOptions {
  regions: Choice[];
  statuses: Choice[];
  canCreate: boolean;
  csrfToken: string;
}

interface CentreSummary {
  id: string;
  code: string;
  name: string;
  regionLabel: string;
  status: Choice;
}

interface CentreRecord extends CentreSummary {
  version: string;
  regionCode: string;
  address: string | null;
  canEdit: boolean;

  staff: {
    id: string;
    displayName: string;
    roleLabel: string;
  }[];
}

interface CentrePage {
  items: CentreSummary[];
  total: number;
  page: number;
  pageSize: number;
}

interface CentreForm {
  code: string;
  name: string;
  regionCode: string;
  statusCode: string;
  address: string;
}

type Selection =
  | { kind: 'create' }
  | { kind: 'details'; id: string };

function errorMessage(error: unknown) {
  return error instanceof Error
    ? error.message
    : 'Unable to complete this action.';
}

function formFrom(record?: CentreRecord): CentreForm {
  return {
    code: record?.code ?? '',
    name: record?.name ?? '',
    regionCode: record?.regionCode ?? '',
    statusCode: record?.status.code ?? '',
    address: record?.address ?? '',
  };
}

function useGet<T>(path: string) {
  const [revision, setRevision] = useState(0);

  const [state, setState] = useState<{
    path: string;
    data?: T;
    loading: boolean;
    error: string;
  }>({
    path,
    loading: true,
    error: '',
  });

  useEffect(() => {
    let active = true;

    setState({
      path,
      loading: true,
      error: '',
    });

    api<T>(path)
      .then(data => {
        if (active) {
          setState({
            path,
            data,
            loading: false,
            error: '',
          });
        }
      })
      .catch(caught => {
        if (active) {
          setState({
            path,
            loading: false,
            error: errorMessage(caught),
          });
        }
      });

    return () => {
      active = false;
    };
  }, [path, revision]);

  const current =
    state.path === path
      ? state
      : {
          path,
          data: undefined,
          loading: true,
          error: '',
        };

  return {
    ...current,
    reload: () => setRevision(value => value + 1),
  };
}

export function Centres() {
  const options = useGet<CentreOptions>(
    '/admin/centres/options',
  );

  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');

  const [filters, setFilters] = useState({
    search: '',
    status: '',
    page: 1,
  });

  const [selection, setSelection] =
    useState<Selection | null>(null);

  const query = new URLSearchParams({
    q: filters.search,
    status: filters.status,
    page: String(filters.page),
  });

  const list = useGet<CentrePage>(
    `/admin/centres?${query.toString()}`,
  );

  const panelOpen = selection !== null;

  return (
    <div className="centres-page">
      <header className="centres-heading">
        <div>
          <p>Administration</p>
          <h1>Centres &amp; offices</h1>
          <span>
            Manage centres and review their assigned staff.
          </span>
        </div>

        <button
          type="button"
          className="centres-primary"
          disabled={!options.data?.canCreate || panelOpen}
          onClick={() =>
            setSelection({ kind: 'create' })
          }
        >
          <Plus size={17} aria-hidden="true" />
          Add centre
        </button>
      </header>

      {options.loading && (
        <p role="status">Loading available options…</p>
      )}

      {options.error && (
        <div className="centres-feedback" role="alert">
          <p>{options.error}</p>

          <button type="button" onClick={options.reload}>
            Retry options
          </button>
        </div>
      )}

      <form
        className="centres-filters"
        onSubmit={event => {
          event.preventDefault();

          setFilters({
            search: search.trim(),
            status,
            page: 1,
          });
        }}
      >
        <label className="centres-search">
          <Search size={18} aria-hidden="true" />

          <span className="centres-sr-only">
            Search centres
          </span>

          <input
            type="search"
            placeholder="Search by centre name or code"
            value={search}
            disabled={panelOpen}
            onChange={event =>
              setSearch(event.target.value)
            }
          />
        </label>

        <label>
          <span className="centres-sr-only">
            Filter by status
          </span>

          <select
            value={status}
            disabled={!options.data || panelOpen}
            onChange={event =>
              setStatus(event.target.value)
            }
          >
            <option value="">All statuses</option>

            {options.data?.statuses.map(item => (
              <option key={item.code} value={item.code}>
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={panelOpen || list.loading}
        >
          Search
        </button>

        <button
          type="button"
          disabled={panelOpen}
          onClick={() => {
            setSearch('');
            setStatus('');
            setFilters({
              search: '',
              status: '',
              page: 1,
            });
          }}
        >
          Clear
        </button>
      </form>

      <section
        className="centres-card"
        aria-busy={list.loading}
      >
        {list.loading ? (
          <p className="centres-empty" role="status">
            Loading centres…
          </p>
        ) : list.error ? (
          <div className="centres-feedback" role="alert">
            <p>{list.error}</p>

            <button type="button" onClick={list.reload}>
              Try again
            </button>
          </div>
        ) : list.data ? (
          <>
            {list.data.items.length === 0 ? (
              <div className="centres-empty">
                <Building2 size={42} aria-hidden="true" />

                <h2>No centres to display</h2>

                <p>
                  No centres match the current search.
                </p>
              </div>
            ) : (
              <div className="centres-table-scroll">
                <table>
                  <caption className="centres-sr-only">
                    Centres and offices
                  </caption>

                  <thead>
                    <tr>
                      <th scope="col">Code</th>
                      <th scope="col">Centre name</th>
                      <th scope="col">Region</th>
                      <th scope="col">Status</th>
                      <th scope="col">Actions</th>
                    </tr>
                  </thead>

                  <tbody>
                    {list.data.items.map(centre => (
                      <tr key={centre.id}>
                        <td>{centre.code}</td>
                        <td>{centre.name}</td>
                        <td>{centre.regionLabel}</td>

                        <td>
                          <span className="centres-status">
                            {centre.status.label}
                          </span>
                        </td>

                        <td>
                          <button
                            type="button"
                            disabled={panelOpen || !options.data}
                            aria-label={`View ${centre.name}`}
                            onClick={() =>
                              setSelection({
                                kind: 'details',
                                id: centre.id,
                              })
                            }
                          >
                            View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <nav
              className="centres-pagination"
              aria-label="Centre result pages"
            >
              <span>
                {list.data.total} centres
                {' · '}
                Page {list.data.page}
              </span>

              <div>
                <button
                  type="button"
                  disabled={
                    panelOpen || list.data.page <= 1
                  }
                  onClick={() =>
                    setFilters(current => ({
                      ...current,
                      page: list.data!.page - 1,
                    }))
                  }
                >
                  Previous
                </button>

                <button
                  type="button"
                  disabled={
                    panelOpen ||
                    list.data.page * list.data.pageSize >=
                      list.data.total
                  }
                  onClick={() =>
                    setFilters(current => ({
                      ...current,
                      page: list.data!.page + 1,
                    }))
                  }
                >
                  Next
                </button>
              </div>
            </nav>
          </>
        ) : null}
      </section>

      {selection && options.data && (
        selection.kind === 'create' ? (
          <CentreEditor
            key="new-centre"
            options={options.data}
            initialRecord={null}
            onClose={() => setSelection(null)}
            onSaved={list.reload}
          />
        ) : (
          <CentreDetails
            key={selection.id}
            id={selection.id}
            options={options.data}
            onClose={() => setSelection(null)}
            onSaved={list.reload}
          />
        )
      )}
    </div>
  );
}

function CentreDetails({
  id,
  options,
  onClose,
  onSaved,
}: {
  id: string;
  options: CentreOptions;
  onClose: () => void;
  onSaved: () => void;
}) {
  const state = useGet<CentreRecord>(
    `/admin/centres/${encodeURIComponent(id)}`,
  );

  if (state.loading) {
    return (
      <section className="centres-card centres-editor">
        <p role="status">Loading centre details…</p>
        <button type="button" onClick={onClose}>Close</button>
      </section>
    );
  }

  if (state.error || !state.data || state.data.id !== id) {
    return (
      <section className="centres-card centres-editor">
        <p role="alert">
          {state.error || 'Centre details could not be verified.'}
        </p>

        <div className="centres-actions">
          <button type="button" onClick={state.reload}>
            Try again
          </button>

          <button type="button" onClick={onClose}>
            Close
          </button>
        </div>
      </section>
    );
  }

  return (
    <CentreEditor
      key={`${state.data.id}:${state.data.version}`}
      options={options}
      initialRecord={state.data}
      onClose={onClose}
      onSaved={onSaved}
      reload={state.reload}
    />
  );
}

function CentreEditor({
  options,
  initialRecord,
  onClose,
  onSaved,
  reload,
}: {
  options: CentreOptions;
  initialRecord: CentreRecord | null;
  onClose: () => void;
  onSaved: () => void;
  reload?: () => void;
}) {
  const [record, setRecord] = useState(initialRecord);
  const [form, setForm] = useState(() =>
    formFrom(initialRecord ?? undefined),
  );

  const [editing, setEditing] = useState(!initialRecord);
  const [saving, setSaving] = useState(false);
  const [mustReload, setMustReload] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const lock = useRef(false);
  const createKey = useRef(crypto.randomUUID());
  const panel = useRef<HTMLElement>(null);

  const dirty =
    JSON.stringify(form) !==
    JSON.stringify(formFrom(record ?? undefined));

  const canSave = record
    ? record.canEdit
    : options.canCreate;

  useEffect(() => {
    panel.current?.focus();
  }, []);

  useEffect(() => {
    function warnBeforeClose(event: BeforeUnloadEvent) {
      if (dirty || lock.current) {
        event.preventDefault();
        event.returnValue = '';
      }
    }

    function warnBeforeLink(event: MouseEvent) {
      if (!dirty && !lock.current) return;

      if (
        event.button !== 0 ||
        event.ctrlKey ||
        event.metaKey ||
        event.shiftKey ||
        event.altKey
      ) return;

      const link =
        event.target instanceof Element
          ? event.target.closest('a')
          : null;

      if (
        !link ||
        link.target === '_blank' ||
        link.hasAttribute('download')
      ) return;

      if (
        lock.current ||
        !window.confirm('Discard your unsaved centre changes?')
      ) {
        event.preventDefault();
        event.stopPropagation();
      }
    }

    window.addEventListener('beforeunload', warnBeforeClose);
    document.addEventListener('click', warnBeforeLink, true);

    return () => {
      window.removeEventListener('beforeunload', warnBeforeClose);
      document.removeEventListener('click', warnBeforeLink, true);
    };
  }, [dirty]);

  function close() {
    if (lock.current) return;

    if (
      dirty &&
      !window.confirm('Discard your unsaved centre changes?')
    ) return;

    onClose();
  }

  function change(field: keyof CentreForm, value: string) {
    setForm(current => ({
      ...current,
      [field]: value,
    }));

    setMessage('');
  }

  async function save() {
    if (
      lock.current ||
      !editing ||
      !canSave ||
      mustReload
    ) return;

    if (
      !form.code.trim() ||
      !form.name.trim() ||
      !options.regions.some(
        item => item.code === form.regionCode,
      ) ||
      !options.statuses.some(
        item => item.code === form.statusCode,
      )
    ) {
      setError('Complete the required centre information.');
      return;
    }

    lock.current = true;
    setSaving(true);
    setError('');
    setMessage('');

    try {
      const path = record
        ? `/admin/centres/${encodeURIComponent(record.id)}`
        : '/admin/centres';

      const result = await api<CentreRecord>(path, {
        values: {
          code: form.code.trim(),
          name: form.name.trim(),
          regionCode: form.regionCode,
          statusCode: form.statusCode,
          address: form.address.trim() || null,
        },
        csrfToken: options.csrfToken,
        version: record?.version,
        idempotencyKey: record ? undefined : createKey.current,
      });

      if (!result.id || (record && result.id !== record.id)) {
        throw new Error(
          'The saved centre could not be verified. Check the list before retrying.',
        );
      }

      setRecord(result);
      setForm(formFrom(result));
      setEditing(false);
      setMessage('Centre saved.');
      onSaved();
    } catch (caught) {
      setError(errorMessage(caught));
      setMustReload(true);
    } finally {
      lock.current = false;
      setSaving(false);
    }
  }

  return (
    <section
      ref={panel}
      tabIndex={-1}
      className="centres-card centres-editor"
      aria-labelledby="centre-editor-title"
      aria-busy={saving}
    >
      <header className="centres-editor-heading">
        <div>
          <h2 id="centre-editor-title">
            {record ? record.name : 'Add centre'}
          </h2>

          <p>
            {editing
              ? 'Complete the centre information below.'
              : 'Centre details and assigned staff.'}
          </p>
        </div>

        <button
          type="button"
          disabled={saving}
          onClick={close}
        >
          Close
        </button>
      </header>

      {error && (
        <div className="centres-feedback" role="alert">
          <p>{error}</p>

          {mustReload && (
            <>
              <p>
                Check the saved information before attempting another change.
              </p>

              {record && reload ? (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (
                      !dirty ||
                      window.confirm(
                        'Reload the centre and discard unsaved changes?',
                      )
                    ) reload();
                  }}
                >
                  Reload centre
                </button>
              ) : (
                <button
                  type="button"
                  disabled={saving}
                  onClick={close}
                >
                  Return to centre list
                </button>
              )}
            </>
          )}
        </div>
      )}

      {message && (
        <p className="centres-feedback" role="status">
          {message}
        </p>
      )}

      <form
        onSubmit={event => {
          event.preventDefault();
          void save();
        }}
      >
        <fieldset
          className="centres-fields"
          disabled={!editing || saving || mustReload || !canSave}
        >
          <label>
            Centre code
            <input
              required
              value={form.code}
              onChange={event =>
                change('code', event.target.value)
              }
            />
          </label>

          <label>
            Centre name
            <input
              required
              value={form.name}
              onChange={event =>
                change('name', event.target.value)
              }
            />
          </label>

          <label>
            Region
            <select
              required
              value={form.regionCode}
              onChange={event =>
                change('regionCode', event.target.value)
              }
            >
              <option value="">Select region</option>

              {record &&
                !options.regions.some(
                  item => item.code === record.regionCode,
                ) && (
                  <option value={record.regionCode} disabled>
                    {record.regionLabel}
                  </option>
                )}

              {options.regions.map(item => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            Status
            <select
              required
              value={form.statusCode}
              onChange={event =>
                change('statusCode', event.target.value)
              }
            >
              <option value="">Select status</option>

              {record &&
                !options.statuses.some(
                  item => item.code === record.status.code,
                ) && (
                  <option value={record.status.code} disabled>
                    {record.status.label}
                  </option>
                )}

              {options.statuses.map(item => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>
          </label>

          <label className="centres-wide">
            Address
            <textarea
              rows={3}
              value={form.address}
              onChange={event =>
                change('address', event.target.value)
              }
            />
          </label>
        </fieldset>

        <footer className="centres-form-footer">
          <span role="status">
            {saving
              ? 'Saving…'
              : dirty
                ? 'Unsaved changes'
                : 'No unsaved changes'}
          </span>

          <div className="centres-actions">
            {editing ? (
              <>
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => {
                    if (!record) {
                      close();
                      return;
                    }

                    setForm(formFrom(record));
                    setEditing(false);

                    if (!mustReload) setError('');
                  }}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="centres-primary"
                  disabled={
                    !dirty ||
                    !canSave ||
                    saving ||
                    mustReload
                  }
                >
                  Save centre
                </button>
              </>
            ) : (
              record?.canEdit && (
                <button
                  type="button"
                  className="centres-primary"
                  disabled={mustReload}
                  onClick={() => setEditing(true)}
                >
                  Edit centre
                </button>
              )
            )}
          </div>
        </footer>
      </form>

      {record && (
        <section className="centres-staff">
          <h3>Assigned staff</h3>

          {record.staff.length === 0 ? (
            <p>No staff are assigned to this centre.</p>
          ) : (
            <div className="centres-table-scroll">
              <table>
                <caption className="centres-sr-only">
                  Staff assigned to {record.name}
                </caption>

                <thead>
                  <tr>
                    <th scope="col">Name</th>
                    <th scope="col">Role</th>
                  </tr>
                </thead>

                <tbody>
                  {record.staff.map(person => (
                    <tr key={person.id}>
                      <td>{person.displayName}</td>
                      <td>{person.roleLabel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}
    </section>
  );
}