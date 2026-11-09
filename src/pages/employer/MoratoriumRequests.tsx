import{ useState} from 'react';
import {Link}from 'react-router-dom';

import{PageHeader} from '../../components/ui/PageHeader';
import{
    DataTable,
    type TableColumn,
} from '../../components/ui/DataTable';
import { StatusChip} from '../../components/ui/StatusChip';
import type { RequestListItem } from '../../types/domain';
import { useNewRequestModal } from '../../features/deposit/NewRequestModalContext';

interface   MoratoriumRequestsProps {
    requests?:RequestListItem[];
    loading?:boolean;
    error?:string | null;
    searchQuery?:string;
    statusFilter?:string;
    onSearchChange?:(value:string)=>void;
    onStatusChange?:(value:string)=>void;
}

function formatDate(value:string | null): 
string {
    if (!value) return '—';

    const date = new Date(value);


    if (Number.isNaN(date.getTime())) return 'unavailable';
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
    }).format(date);
}

const columns: TableColumn<RequestListItem>[] = [
    {
        id: 'reference',
        label: 'Reference',
        render: (request) => (
        <Link
            className="request-reference-link"
            to={`/requests/${encodeURIComponent(request.id)}`}
            aria-label={`View request ${request.reference}`}
        >
            {request.reference}
        </Link>
  ),
},
    {
        id: 'submittedAt',
        label: 'Submitted on',
        render: (request) => formatDate(request.submittedAt),
    },
    {
        id: 'status',
        label: 'status',
        render: (request) => <StatusChip status={request.status}  />,
    },
];

export function MoratoriumRequests({
    requests,
    loading = false,
    error = null,
    searchQuery, statusFilter, onSearchChange, onStatusChange,
}:MoratoriumRequestsProps) {
   const { openNewRequestModal } = useNewRequestModal();
   const [localSearch, setLocalSearch] = useState('');
   const search=searchQuery??localSearch;const setSearch=onSearchChange??setLocalSearch;
   const [localStatus, setLocalStatus] = useState('');
   const status=statusFilter??localStatus;const setStatus=onStatusChange??setLocalStatus;

   const statuses = Array.from(
     new Set(['Draft','Under review','Action required','Recommended','Approved','Rejected','Active','Completed','Overdue']),
     ).sort();

     const query = search.trim().toLowerCase();

     const filteredRequests = onSearchChange ? requests : requests?.filter((request) => {
        const matchesSearch = request.reference 
        .toLowerCase()
        .includes(query);

        const matchesStatus = !status || request.status === status;

        return matchesSearch && matchesStatus;
     });


    
    return(
        <div className="dashboard-view">
            <PageHeader
              eyebrow="Employer portal"
              title= "My requests"
              description= "Review and track your moratorium requests."
              action={
                <button
                    type="button"
                    className="primary-button"
                    onClick={openNewRequestModal}
                >
                    + New request
                </button>
            }
        />

        <section
           className="request-filters"
           aria-label="Filter requests"
           >
            <label>
                <span>Search by reference</span>
                <input
                   type="search"
                   value={search}
                   onChange={(event) => setSearch(event.target.value)}
                   placeholder="Search requests"
                   disabled={false}
                />
            </label>

            <label>
                <span>Status</span>
                <select value={status} onChange={(event) => setStatus(event.target.value)} disabled={false}>
                        <option value="">All statuses</option>
                        {statuses.map((item) => (
                        <option key={item} value={item}>
                            {item}
                        </option>
                    ))}
                </select>
            </label>

            <button
               type="button"
               className="secondary-button"
               disabled={!search && !status}
               onClick={() => {
                 setSearch('');
                 setStatus('');
               }}>
                Clear filters
            </button>
        </section>

           <DataTable
           title="Requests"
           rows={filteredRequests}
           columns={columns}
           loading={loading}
           error={error}
           emptyMessage={
            query || status
              ? 'No requests match your filters.'
              : 'You have no moratorium requests.'
            }
            />
            </div>
   );

}

