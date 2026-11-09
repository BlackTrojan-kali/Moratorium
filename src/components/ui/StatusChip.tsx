import type { RequestStatus } from '../../types/domain';

export function StatusChip({ status }: { status: RequestStatus }) {
  const key = status.toLowerCase().replaceAll(' ', '-');
  return <span className={`status-chip ${key}`}>{status}</span>;
}
