import {
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  Link,
  useParams,
  useSearchParams,
} from 'react-router-dom';

import {
  depositApi,
  downloadDocument,
} from './api';

import {
  dateTime,
  DocumentsTable,
  errorText,
  LoadState,
  money,
  Pager,
  Panel,
  useLoad,
} from './shared';

import type {
  Deposit,
  DepositDocument,
  DepositSummary,
} from './types';

import { useNewRequestModal } from './NewRequestModalContext';
import { useTranslation } from '../../i18n/I18nContext';

import '../../styles/deposit.css';

/**
 * Work the employer can pick up again: an untouched draft or one that was
 * returned for correction. Everything else is read-only from here.
 */
function rowAction(item: DepositSummary) {
  const path = `/requests/${encodeURIComponent(item.id)}`;

  if (item.status.code === 'Draft') {
    return {
      label: 'Continue draft',
      to: `${path}/edit`,
      primary: true,
    };
  }

  if (item.status.code === 'Action required') {
    return {
      label: 'Edit request',
      to: `${path}/edit`,
      primary: true,
    };
  }

  return { label: 'Open', to: path, primary: false };
}

function useFilters() {
  const [params, setParams] = useSearchParams();

  const q = params.get('q') ?? '';
  const status = params.get('status') ?? '';
  const rawPage = Number(params.get('page') ?? 1);

  const page =
    Number.isSafeInteger(rawPage) && rawPage > 0
      ? rawPage
      : 1;

  const query = new URLSearchParams({
    q,
    status,
    page: String(page),
  }).toString();

  return {
    q,
    status,
    query,

    apply: (search: string, filter: string) =>
      setParams({
        q: search.trim(),
        status: filter,
        page: '1',
      }),

    onPage: (next: number) =>
      setParams({
        q,
        status,
        page: String(next),
      }),
  };
}

function useDownload() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const lock = useRef(false);

  async function start(document: DepositDocument) {
    if (lock.current) return;

    lock.current = true;
    setBusy(true);
    setError('');

    try {
      await downloadDocument(document);
    } catch (caught) {
      setError(errorText(caught));
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }

  return {
    busy,
    error,
    download: (document: DepositDocument) =>
      void start(document),
  };
}

export function DepositList() {
  const filters = useFilters();
  const { openNewRequestModal } = useNewRequestModal();
  const { t } = useTranslation();

  const [search, setSearch] = useState(filters.q);
  const [status, setStatus] = useState(filters.status);

  useEffect(() => {
    setSearch(filters.q);
    setStatus(filters.status);
  }, [filters.q, filters.status]);

  const options = useLoad(
    'deposit-options',
    signal => depositApi.options(signal),
  );

  const state = useLoad(
    `deposits:${filters.query}`,
    signal => depositApi.list(filters.query, signal),
  );

  return (
    <div className="deposit-module">
      <header className="deposit-heading">
        <div>
          <p className="deposit-eyebrow">
            Employer portal
          </p>

          <h1>My requests</h1>

          <p>
            Saved drafts, submitted requests and
            requests returned for correction.
          </p>
        </div>

        <button
          type="button"
          className="deposit-primary"
          onClick={openNewRequestModal}
        >
          {t('nav.newRequest')}
        </button>
      </header>

      <form
        className="deposit-filters"
        onSubmit={event => {
          event.preventDefault();
          filters.apply(search, status);
        }}
      >
        <label>
          Search by reference

          <input
            type="search"
            value={search}
            onChange={event =>
              setSearch(event.target.value)
            }
          />
        </label>

        <label>
          Status

          <select
            value={status}
            disabled={!options.data}
            onChange={event =>
              setStatus(event.target.value)
            }
          >
            <option value="">All statuses</option>

            {options.data?.statuses.map(item => (
              <option
                key={item.code}
                value={item.code}
              >
                {item.label}
              </option>
            ))}
          </select>
        </label>

        <button
          type="submit"
          disabled={state.loading}
        >
          Search
        </button>

        <button
          type="button"
          onClick={() => {
            setSearch('');
            setStatus('');
            filters.apply('', '');
          }}
        >
          Clear
        </button>
      </form>

      {options.error ? (
        <LoadState
          loading={false}
          error={options.error}
          retry={options.reload}
        />
      ) : null}

      <LoadState
        loading={state.loading}
        error={state.error}
        retry={state.reload}
      />

      {state.data && (
        <Panel title="Requests">
          {!state.data.items.length ? (
            <p className="deposit-state">
              No requests match this view.
            </p>
          ) : (
            <div className="deposit-table-scroll">
              <table>
                <caption className="deposit-sr">
                  Your requests
                </caption>

                <thead>
                  <tr>
                    <th>Reference</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th>Updated</th>
                    <th>Submitted</th>
                    <th>Action</th>
                  </tr>
                </thead>

                <tbody>
                  {state.data.items.map(item => {
                    const action = rowAction(item);

                    return (
                      <tr key={item.id}>
                        <td>
                          <Link
                            to={`/requests/${encodeURIComponent(item.id)}`}
                          >
                            {item.reference}
                          </Link>
                        </td>

                        <td>{item.typeLabel}</td>

                        <td>
                          <span className="deposit-status">
                            {item.status.label}
                          </span>
                        </td>

                        <td>{dateTime(item.updatedAt)}</td>

                        <td>
                          {item.submittedAt
                            ? dateTime(item.submittedAt)
                            : 'Not submitted'}
                        </td>

                        <td>
                          <Link
                            className={
                              action.primary
                                ? 'deposit-primary'
                                : undefined
                            }
                            to={action.to}
                          >
                            {action.label}
                          </Link>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          <Pager
            result={state.data}
            onPage={filters.onPage}
          />
        </Panel>
      )}
    </div>
  );
}

function Overview({ record }: { record: Deposit }) {
  return (
    <dl className="deposit-facts">
      <div>
        <dt>Reference</dt>
        <dd>{record.reference}</dd>
      </div>

      <div>
        <dt>Employer</dt>
        <dd>{record.employer.name}</dd>
      </div>

      <div>
        <dt>CNPS number</dt>
        <dd>{record.employer.cnpsNumber}</dd>
      </div>

      <div>
        <dt>Request type</dt>
        <dd>{record.typeLabel}</dd>
      </div>

      <div>
        <dt>Status</dt>
        <dd>{record.status.label}</dd>
      </div>

      <div>
        <dt>Submitted</dt>
        <dd>
          {record.submittedAt
            ? dateTime(record.submittedAt)
            : 'Not submitted'}
        </dd>
      </div>

      <div>
        <dt>Requested months</dt>
        <dd>
          {record.fields.months ?? 'Not applicable'}
        </dd>
      </div>

      <div>
        <dt>Declared advance amount</dt>
        <dd>
          {record.fields.advanceAmount === null
            ? 'Not supplied'
            : money(
                record.fields.advanceAmount,
                record.currency,
              )}
        </dd>
      </div>

    </dl>
  );
}

export function DepositDetails() {
  const { requestId } =
    useParams<{ requestId: string }>();

  const state = useLoad(
    `detail:${requestId}`,
    signal => {
      if (!requestId) {
        return Promise.reject(
          new Error('No request selected.'),
        );
      }

      return depositApi.get(requestId, signal);
    },
  );

  const downloads = useDownload();
  const record = state.data;
  const options = useLoad('options', signal => depositApi.options(signal));
  const [documentBusy, setDocumentBusy] = useState(false);
  const [documentError, setDocumentError] = useState('');

  async function removeDocument(document: DepositDocument) {
    if (!record || !options.data) return;

    if (
      !window.confirm(`Remove ${document.fileName} from this request?`)
    ) return;

    setDocumentBusy(true);
    setDocumentError('');

    try {
      await depositApi.remove(record, document.id, options.data.csrfToken);
      state.reload();
    } catch (caught) {
      setDocumentError(errorText(caught));
    } finally {
      setDocumentBusy(false);
    }
  }

  return (
    <div className="deposit-module">
      <header className="deposit-heading">
        <div>
          <p className="deposit-eyebrow">
            Request tracking
          </p>

          <h1>
            {record?.reference ?? 'Request details'}
          </h1>
        </div>

        <Link to="/requests">
          Back to my requests
        </Link>
      </header>

      <LoadState
        loading={state.loading}
        error={state.error}
        retry={state.reload}
      />

      {record && (
        <>
          <div className="deposit-actions deposit-toolbar">
            {record.permissions.edit && (
              <Link
                className="deposit-primary"
                to={`/requests/${encodeURIComponent(record.id)}/edit`}
              >
                Edit or complete request
              </Link>
            )}

            {record.receipt && (
              <Link
                to={`/requests/${encodeURIComponent(record.id)}/receipt`}
              >
                Submission receipt
              </Link>
            )}

            {['Approved', 'Active', 'Completed', 'Overdue'].includes(record.status.code) && (
              <Link
                className="deposit-primary"
                to={`/payments/${encodeURIComponent(record.id)}`}
              >
                📅 Voir l'échéancier de paiement
              </Link>
            )}

            <button
              type="button"
              onClick={state.reload}
            >
              Refresh
            </button>
          </div>

          {record.corrections.length > 0 && (
            <Panel title="Corrections requested">
              <ul>
                {record.corrections.map((item, index) => (
                  <li key={index}>{item}</li>
                ))}
              </ul>
            </Panel>
          )}

          {['Approved','Active','Completed','Overdue','Rejected'].includes(record.status.code)&&<Link to={`/requests/${record.id}/correspondence/${record.status.code==='Rejected'?'rejection':'approval'}`}>Review decision correspondence</Link>}
          {['Approved','Active','Completed','Overdue'].includes(record.status.code) && (
            <div style={{ background: '#e8f3ee', border: '1px solid #9ec5b2', borderRadius: 10, padding: '14px 18px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, margin: '14px 0' }}>
              <div>
                <strong style={{ color: '#14583d', fontSize: 14 }}>Accord de moratoire en vigueur</strong>
                <p style={{ margin: '4px 0 0', color: '#355342', fontSize: 13 }}>
                  Votre plan d'apurement et vos mensualités sont disponibles dans votre échéancier officiel.
                </p>
              </div>
              <Link className="deposit-primary" to={`/payments/${encodeURIComponent(record.id)}`}>
                Consulter l'échéancier
              </Link>
            </div>
          )}
          <Panel title="Request overview">
            <p>Declared total debt: {money(record.fields.debtAmount || null, record.currency)}</p>
            <p>Contact: {record.fields.contactName} · {record.fields.contactEmail} · {record.fields.address}</p>
            {record.fields.remissionReason && <p>Remission grounds: {record.fields.remissionReason}</p>}
            <Overview record={record} />
          </Panel>

          <Panel title="Debt information">
            {record.debt ? (
              <dl className="deposit-facts">
                <div>
                  <dt>Principal</dt>
                  <dd>
                    {money(
                      record.debt.principal,
                      record.debt.currency,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Penalties</dt>
                  <dd>
                    {money(
                      record.debt.penalties,
                      record.debt.currency,
                    )}
                  </dd>
                </div>

                <div>
                  <dt>Retrieved</dt>
                  <dd>
                    {dateTime(record.debt.observedAt)}
                  </dd>
                </div>
              </dl>
            ) : (
              <p>Debt information unavailable.</p>
            )}
          </Panel>

          <Panel title="Supporting documents">
            {downloads.error && (
              <p role="alert">{downloads.error}</p>
            )}

            {documentError && (
              <p role="alert">{documentError}</p>
            )}

            <DocumentsTable
              documents={record.documents}
              busy={downloads.busy || documentBusy}
              onDownload={downloads.download}
              onRemove={
                record.permissions.edit ? removeDocument : undefined
              }
            />
          </Panel>

          <Panel title="History">
            {record.history.length ? (
              <ol className="deposit-timeline">
                {record.history.map(event => (
                  <li key={event.id}>
                    <strong>{event.label}</strong>

                    <p>
                      {event.actorName}
                      {' · '}
                      {dateTime(event.occurredAt)}
                    </p>

                    {event.note && (
                      <p className="deposit-wrap">
                        {event.note}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            ) : (
              <p>No recorded events.</p>
            )}
          </Panel>
        </>
      )}
    </div>
  );
}

export function DepositReceipt() {
  const { requestId } =
    useParams<{ requestId: string }>();

  const state = useLoad(
    `receipt:${requestId}`,
    signal => {
      if (!requestId) {
        return Promise.reject(
          new Error('No request selected.'),
        );
      }

      return depositApi.get(requestId, signal);
    },
  );

  const record = state.data;
  const receipt = record?.receipt;

  return (
    <div className="deposit-module">
      <div className="deposit-actions deposit-toolbar">
        <Link to="/requests">My requests</Link>

        {record && (
          <Link
            to={`/requests/${encodeURIComponent(record.id)}`}
          >
            Request details
          </Link>
        )}

        <button
          type="button"
          disabled={!receipt}
          onClick={() => window.print()}
        >
          Print receipt
        </button>
      </div>

      <LoadState
        loading={state.loading}
        error={state.error}
        retry={state.reload}
      />

      {record && (
        receipt ? (
          <section className="deposit-panel deposit-receipt">
            <p className="deposit-eyebrow">
              MoraPay · Request submission
            </p>

            <h1>Submission receipt</h1>

            <p>
              Your request was received. This receipt
              confirms submission, not approval.
            </p>

            <dl className="deposit-facts">
              <div>
                <dt>Receipt reference</dt>
                <dd>{receipt.reference}</dd>
              </div>

              <div>
                <dt>Received on</dt>
                <dd>{dateTime(receipt.submittedAt)}</dd>
              </div>
            </dl>

            <dl className="deposit-facts">
              <div>
                <dt>Employer</dt>
                <dd>{receipt.employerName}</dd>
              </div>

              <div>
                <dt>CNPS number</dt>
                <dd>{receipt.cnpsNumber}</dd>
              </div>

              <div>
                <dt>Request type</dt>
                <dd>{receipt.typeLabel}</dd>
              </div>

              <div>
                <dt>Requested months</dt>
                <dd>
                  {receipt.fields.months ?? 'Not applicable'}
                </dd>
              </div>

              <div>
                <dt>Advance amount</dt>
                <dd>
                  {receipt.fields.advanceAmount === null
                    ? 'Not supplied'
                    : money(
                        receipt.fields.advanceAmount,
                        receipt.currency,
                      )}
                </dd>
              </div>

            </dl>

            <p>Declared total debt: {money(receipt.fields.debtAmount || null, receipt.currency)}</p>
            {receipt.fields.remissionReason && <p>Remission grounds: {receipt.fields.remissionReason}</p>}
            <h2>Attached documents</h2>

            {receipt.documents.length ? (
              <ul>
                {receipt.documents.map(document => (
                  <li key={document.id}>
                    {document.categoryLabel}: {document.fileName}
                  </li>
                ))}
              </ul>
            ) : (
              <p>No attached documents.</p>
            )}
          </section>
        ) : (
          <Panel title="Receipt unavailable">
            <p>
              No submission receipt has been issued
              for this request.
            </p>
          </Panel>
        )
      )}
    </div>
  );
}

export function DepositDocuments() {
  const filters = useFilters();
  const [search, setSearch] = useState(filters.q);

  useEffect(() => {
    setSearch(filters.q);
  }, [filters.q]);

  const state = useLoad(
    `documents:${filters.query}`,
    signal =>
      depositApi.documents(filters.query, signal),
  );

  const downloads = useDownload();

  return (
    <div className="deposit-module">
      <header className="deposit-heading">
        <div>
          <p className="deposit-eyebrow">
            Employer portal
          </p>

          <h1>Documents</h1>

          <p>
            Files attached to your requests. Add or
            replace files from an editable request.
          </p>
        </div>

        <Link to="/requests">My requests</Link>
      </header>

      <form
        className="deposit-filters"
        onSubmit={event => {
          event.preventDefault();
          filters.apply(search, '');
        }}
      >
        <label>
          Filename or request reference

          <input
            type="search"
            value={search}
            onChange={event =>
              setSearch(event.target.value)
            }
          />
        </label>

        <button
          type="submit"
          disabled={state.loading}
        >
          Search
        </button>

        <button
          type="button"
          onClick={() => {
            setSearch('');
            filters.apply('', '');
          }}
        >
          Clear
        </button>
      </form>

      <LoadState
        loading={state.loading}
        error={state.error}
        retry={state.reload}
      />

      {downloads.error && (
        <p role="alert">{downloads.error}</p>
      )}

      {state.data && (
        <Panel title="Your documents">
          <DocumentsTable
            documents={state.data.items}
            busy={downloads.busy}
            onDownload={downloads.download}
          />

          {state.data.items.length > 0 && (
            <ul className="deposit-document-links">
              {state.data.items.map(document => (
                <li key={document.id}>
                  <Link
                    to={`/requests/${encodeURIComponent(document.depositId)}`}
                  >
                    {document.requestReference}
                    {' · '}
                    {document.fileName}
                  </Link>
                </li>
              ))}
            </ul>
          )}

          <Pager
            result={state.data}
            onPage={filters.onPage}
          />
        </Panel>
      )}
    </div>
  );
}