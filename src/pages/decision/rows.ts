import type { RequestStatus } from '../../types/domain';

/** A row of the request list as returned by `GET /requests`. */
export interface DecisionRow {
  id: string;
  reference: string;
  status: RequestStatus;
  employerName: string;
  debtAmount: string | null;
  route: string | null;
  submittedAt: string | null;
  version: number;
  currentPosition: number;
  totalPositions: number;
  daysInQueue: number;
  priority: 'high' | 'medium' | 'low';
  processorId: string | null;
  assignedTo: string | null;
  documentCompleteness: number;
}

/** A row of the CPS deposit feed as returned by `GET /dashboard?view=deposits`. */
export interface DepositRow {
  id: string;
  reference: string;
  employerName: string;
  depositAmount: string;
  submittedAt: string;
}
