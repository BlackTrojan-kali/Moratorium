import {
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';

import { DepositError } from './api';
import type { DepositDocument, Page } from './types';

export const errorText = (error: unknown) =>
  error instanceof Error
    ? error.message
    : 'The operation could not be completed.';

export function useLoad<T>(
  key: string,
  load: (signal: AbortSignal) => Promise<T>,
) {
  const loader = useRef(load);
  loader.current = load;

  const [revision, setRevision] = useState(0);

  const [state, setState] = useState<{
    key: string;
    data?: T;
    loading: boolean;
    error: unknown;
  }>({
    key,
    loading: true,
    error: null,
  });

  useEffect(() => {
    const controller = new AbortController();

    setState({
      key,
      loading: true,
      error: null,
    });

    loader.current(controller.signal)
      .then(data => {
        if (!controller.signal.aborted) {
          setState({
            key,
            data,
            loading: false,
            error: null,
          });
        }
      })
      .catch(error => {
        if (!controller.signal.aborted) {
          setState({
            key,
            loading: false,
            error,
          });
        }
      });

    return () => controller.abort();
  }, [key, revision]);

  const current =
    state.key === key
      ? state
      : {
          key,
          loading: true,
          error: null,
          data: undefined,
        };

  return {
    ...current,
    reload: () =>
      setRevision(value => value + 1),
  };
}

export function LoadState({
  loading,
  error,
  retry,
}: {
  loading: boolean;
  error: unknown;
  retry: () => void;
}) {
  if (loading) {
    return (
      <p className="deposit-state" role="status">
        Loading…
      </p>
    );
  }

  if (!error) return null;

  const message =
    error instanceof DepositError &&
    error.status === 404
      ? 'The requested information was not found.'
      : errorText(error);

  return (
    <div className="deposit-state" role="alert">
      <p>{message}</p>

      <button type="button" onClick={retry}>
        Try again
      </button>
    </div>
  );
}

export function Panel({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <section className="deposit-panel">
      <h2>{title}</h2>
      {children}
    </section>
  );
}

export function dateTime(value: string | null) {
  if (!value) return 'Unavailable';

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return 'Unavailable';
  }

  return new Intl.DateTimeFormat('en-GB', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date);
}

export function money(
  value: string | null,
  currency: string,
) {
  if (
    value === null ||
    !/^\d+(\.\d+)?$/.test(value)
  ) {
    return 'Unavailable';
  }

  const [integer, fraction] = value.split('.');

  const grouped = integer.replace(
    /\B(?=(\d{3})+(?!\d))/g,
    ',',
  );

  return `${grouped}${fraction ? `.${fraction}` : ''} ${currency}`;
}

export function bytes(value: number) {
  return (
    new Intl.NumberFormat('en-GB').format(value) +
    ' bytes'
  );
}

export function Pager<T>({
  result,
  onPage,
}: {
  result: Page<T>;
  onPage: (page: number) => void;
}) {
  return (
    <nav
      className="deposit-pager"
      aria-label="Results pages"
    >
      <button
        type="button"
        disabled={result.page <= 1}
        onClick={() => onPage(result.page - 1)}
      >
        Previous
      </button>

      <span>
        {result.total} records · Page {result.page}
      </span>

      <button
        type="button"
        disabled={
          result.page * result.pageSize >=
          result.total
        }
        onClick={() => onPage(result.page + 1)}
      >
        Next
      </button>
    </nav>
  );
}

export function DocumentsTable({
  documents,
  busy,
  onDownload,
  onRemove,
}: {
  documents: DepositDocument[];
  busy: boolean;
  onDownload: (document: DepositDocument) => void;
  onRemove?: (document: DepositDocument) => void;
}) {
  if (!documents.length) {
    return (
      <p className="deposit-state">
        No documents found.
      </p>
    );
  }

  return (
    <div className="deposit-table-scroll">
      <table>
        <caption className="deposit-sr">
          Supporting documents
        </caption>

        <thead>
          <tr>
            <th>File</th>
            <th>Category</th>
            <th>Uploaded</th>
            <th>Check</th>
            <th>Actions</th>
          </tr>
        </thead>

        <tbody>
          {documents.map(document => (
            <tr key={document.id}>
              <td>
                {document.fileName}
                <small>
                  {bytes(document.sizeBytes)}
                </small>
              </td>

              <td>{document.categoryLabel}</td>

              <td>
                {dateTime(document.uploadedAt)}
              </td>

              <td>
                {document.scanState}
                <small>{document.scanMessage}</small>
              </td>

              <td>
                <div className="deposit-actions">
                  <button
                    type="button"
                    disabled={
                      busy || !document.canDownload
                    }
                    onClick={() =>
                      onDownload(document)
                    }
                    aria-label={`Download ${document.fileName}`}
                  >
                    Download
                  </button>

                  {onRemove && (
                    <button
                      type="button"
                      disabled={
                        busy || !document.canRemove
                      }
                      title={
                        document.canRemove
                          ? undefined
                          : 'Documents can only be removed while the request is a draft or has been returned.'
                      }
                      onClick={() =>
                        onRemove(document)
                      }
                      aria-label={`Remove ${document.fileName}`}
                    >
                      Remove
                    </button>
                  )}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}