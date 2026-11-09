import type { ReactNode } from 'react';

export interface TableColumn<T> {
  id: string;
  label: string;
  render: (row: T) => ReactNode;
}

interface DataTableProps<T extends { id: string }> {
  title?: string;
  rows?: T[];
  columns?: TableColumn<T>[];
  loading?: boolean;
  error?: string | null;
  emptyMessage?: string;
}

export function DataTable<T extends { id: string }>({
  title = 'Recent records',
  rows,
  columns = [],
  loading = false,
  error = null,
  emptyMessage = 'No records found.',
}: DataTableProps<T>) {
  let message: string | null = null;

  if (loading) {
    message = 'Loading…';
  } else if (error) {
    message = 'Unable to load records.';
  } else if (rows === undefined) {
    message = 'Data unavailable.';
  } else if (rows.length === 0) {
    message = emptyMessage;
  }

  return (
    <section className="panel table-panel" aria-busy={loading}>
      <div className="panel-header">
        <h2>{title}</h2>
      </div>

      {message ? (
        <div className="employer-empty-panel">
          <p role={error ? 'alert' : 'status'}>{message}</p>
        </div>
      ) : (
        <div className="table-scroll">
          <table aria-label={title}>
            <thead>
              <tr>
                {columns.map((column) => (
                  <th key={column.id} scope="col">
                    {column.label}
                  </th>
                ))}
              </tr>
            </thead>

            <tbody>
              {rows?.map((row) => (
                <tr key={row.id}>
                  {columns.map((column) => (
                    <td key={column.id}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}