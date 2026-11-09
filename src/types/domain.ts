import type { MessageKey } from '../i18n/messages';

export type UserRole =
  | 'employer'
  | 'agent_dt'
  | 'ce_cea'
  | 's_dct'
  | 'dt'
  | 'dg'
  | 'cps'
  | 'administrator';

export type RequestStatus =
  | 'Draft'
  | 'Under review'
  | 'Action required'
  | 'Recommended'
  | 'Approved'
  | 'Rejected'
  | 'Active'
  | 'Completed'
  | 'Overdue';

export interface NavigationItem {
  /** Translation key for the visible label. */
  labelKey: MessageKey;
  path: string;
  icon: string;
}

export interface Metric {
  label: string;
  value: string | null;
  hint: string;
  tone?: 'blue' | 'green' | 'amber' | 'red';
}
// The backend will provide this information after authentication.
export interface AuthUser {
  id: string;
  displayName: string;
  role: UserRole;
  email?: string;
  employerId?: string | null;
}

// Each sidebar section contains navigation links.
export interface NavigationGroup {
  label: 'MENU' | 'GENERAL';
  items: NavigationItem[];
}

// Frontend representation of a request returned by the backend.
export interface RequestListItem {
  id: string;
  reference: string;
  submittedAt: string | null;
  status: RequestStatus;
}

// Frontend representation of an instalment supplied by the backend.
export interface PaymentScheduleItem {
  id: string;
  planReference: string;
  dueDate: string | null;
  amountDue: number | null;
  amountPaid: number | null;
  currency: string;
  status: string;
}

export interface DocumentListItem {
  id: string;
  fileName: string;
  requestReference: string | null;
  uploadedAt: string | null;
  sizeBytes: number | null;
}
