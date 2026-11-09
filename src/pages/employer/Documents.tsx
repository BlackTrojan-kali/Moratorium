import { downloadUrl } from '../../features/requests/requestTypes';
import { useState } from 'react';

import { PageHeader } from '../../components/ui/PageHeader';
import {
  DataTable,
  type TableColumn,
} from '../../components/ui/DataTable';
import type { DocumentListItem } from '../../types/domain';

interface DocumentsProps {
  documents?: DocumentListItem[];
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

function formatSize(bytes: number | null): string {
  if (bytes === null || !Number.isFinite(bytes) || bytes < 0) {
    return '—';
  }

  if (bytes < 1024) return `${bytes} B`;

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KiB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

const columns: TableColumn<DocumentListItem>[] = [
  {
    id: 'fileName',
    label: 'Document',
    render: (document) => <a href={downloadUrl(document.id)}>{document.fileName}</a>,
  },
  {
    id: 'requestReference',
    label: 'Request reference',
    render: (document) => document.requestReference ?? '—',
  },
  {
    id: 'uploadedAt',
    label: 'Uploaded on',
    render: (document) => formatDate(document.uploadedAt),
  },
  {
    id: 'sizeBytes',
    label: 'File size',
    render: (document) => formatSize(document.sizeBytes),
  },
];

export function Documents({
  documents,
  loading = false,
  error = null,
}: DocumentsProps) {
  const [search, setSearch] = useState('');
  const query = search.trim().toLowerCase();

  const filteredDocuments = documents?.filter((document) => {
    return (
      document.fileName.toLowerCase().includes(query) ||
      (document.requestReference ?? '').toLowerCase().includes(query)
    );
  });

  const dataAvailable =
    documents !== undefined && !loading && !error;

  return (
    <div className="dashboard-view">
      <PageHeader
        eyebrow="Employer portal"
        title="Documents"
        description="Find documents associated with your moratorium requests."
      />

      <section
        className="request-filters"
        aria-label="Filter documents"
      >
        <label>
          <span>Search by filename or request reference</span>

          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            placeholder="Search documents"
            disabled={!dataAvailable}
          />
        </label>

        <button
          type="button"
          className="secondary-button"
          onClick={() => setSearch('')}
          disabled={!search}
        >
          Clear search
        </button>
      </section>

      <DataTable
        title="Your documents"
        rows={filteredDocuments}
        columns={columns}
        loading={loading}
        error={error}
        emptyMessage={
          query
            ? 'No documents match your search.'
            : 'No documents found.'
        }
      />
    </div>
  );
}
