export interface Choice {
  code: string;
  label: string;
}

export interface Debt {
  principal: string | null;
  penalties: string | null;
  currency: string;
  observedAt: string | null;
}

export interface Employer {
  id: string;
  name: string;
  cnpsNumber: string;
  email: string | null;
  address: string | null;
  active: boolean | null;
}

export interface DocumentRule {
  code: string;
  label: string;
  required: boolean;
  employerCanUpload: boolean;
  maxFiles: number;
  maxBytes: number;
  accept: string[];
}

export interface RequestType extends Choice {
  requiresMonths: boolean;
  minMonths: number | null;
  maxMonths: number | null;
  requiresAdvance: boolean;
  documentRules: DocumentRule[];
}

export interface Options {
  employer: Employer;
  debt: Debt | null;
  currency: string;
  moneyDecimals: number;
  requestTypes: RequestType[];
  statuses: Choice[];
  csrfToken: string;
}

export interface DraftInput {
  contactName: string;
  contactEmail: string;
  address: string;
  debtAmount: string;
  remissionReason: string;
  typeCode: string;
  reason: string;
  months: number | null;
  advanceAmount: string | null;
}

export interface DepositSummary {
  id: string;
  reference: string;
  typeLabel: string;
  status: Choice;
  updatedAt: string;
  submittedAt: string | null;
}

export interface DepositDocument {
  id: string;
  depositId: string;
  requestReference: string;
  category: string;
  categoryLabel: string;
  fileName: string;
  sizeBytes: number;
  uploadedAt: string;
  scanState: 'processing' | 'ready' | 'rejected';
  scanMessage: string | null;
  canDownload: boolean;
  canRemove: boolean;
}

export interface HistoryEvent {
  id: string;
  label: string;
  actorName: string;
  occurredAt: string;
  note: string | null;
}

export interface Receipt {
  reference: string;
  submittedAt: string;
  employerName: string;
  cnpsNumber: string;
  typeLabel: string;
  currency: string;
  fields: DraftInput;
  documents: {
    id: string;
    categoryLabel: string;
    fileName: string;
  }[];
}

export interface Deposit extends DepositSummary {
  version: number;
  employer: Employer;
  debt: Debt | null;
  currency: string;
  fields: DraftInput;
  documents: DepositDocument[];
  corrections: string[];
  history: HistoryEvent[];
  receipt: Receipt | null;
  permissions: {
    edit: boolean;
    upload: boolean;
    submit: boolean;
    discard: boolean;
  };
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Issue {
  field: string;
  message: string;
}

export interface ValidationResult {
  valid: boolean;
  issues: Issue[];
}

export interface Submission {
  deposit: Deposit;
  receipt: Receipt;
}