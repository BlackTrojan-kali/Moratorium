import { filePayload } from '../requests/requestTypes';
import type {
  Deposit,
  DepositDocument,
  DepositSummary,
  DraftInput,
  Options,
  Page,
  Submission,
  ValidationResult,
  Issue,
} from './types';

export class DepositError extends Error {
  constructor(
    message: string,
    public status = 0,
    public issues: Issue[] = [],
  ) {
    super(message);
  }
}

const base = (
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000/api/v1'
).replace(/\/$/, '');

const segment = (value: string) => encodeURIComponent(value);

async function responseFor(
  path: string,
  init: RequestInit = {},
) {
  const response = await fetch(`${base}${path}`, {
    ...init,
    credentials: 'include',
    cache: 'no-store',
  });

  if (!response.ok) {
    if (response.status === 401) {
      window.dispatchEvent(new Event('auth-expired'));
    }

    const data = await response.json().catch(() => null);

    throw new DepositError(
      data?.error?.message ||
        `Request failed (${response.status}).`,
      response.status,
      Array.isArray(data?.error?.issues)
        ? data.error.issues
        : [],
    );
  }

  return response;
}

async function json<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const response = await responseFor(path, init);

  if (
    !response.headers
      .get('content-type')
      ?.includes('application/json')
  ) {
    throw new DepositError(
      'The request service returned an invalid response.',
    );
  }

  return response.json() as Promise<T>;
}

function mutation(
  method: string,
  token: string,
  body?: unknown,
  version?: number,
  key?: string,
): RequestInit {
  if (!token) {
    throw new DepositError(
      'Your session could not authorize this action. Reload the page.',
    );
  }

  const headers = new Headers({
    'X-CSRF-Token': token,
  });

  if (version !== undefined) {
    headers.set('If-Match', `"${version}"`);
  }

  if (key) {
    headers.set('Idempotency-Key', key);
  }

  const multipart = body instanceof FormData;

  if (body !== undefined && !multipart) {
    headers.set('Content-Type', 'application/json');
  }

  return {
    method,
    headers,
    body:
      body === undefined
        ? undefined
        : multipart
          ? body
          : JSON.stringify(body),
  };
}

export const depositApi = {
  options: (signal?: AbortSignal) =>
    json<Options>('/deposits/options', { signal }),

  list: (query: string, signal?: AbortSignal) =>
    json<Page<DepositSummary>>(
      `/deposits?${query}`,
      { signal },
    ),

  get: (id: string, signal?: AbortSignal) =>
    json<Deposit>(
      `/deposits/${segment(id)}`,
      { signal },
    ),

  create: (
    input: DraftInput,
    token: string,
    key: string,
  ) =>
    json<Deposit>(
      '/deposits',
      mutation('POST', token, input, undefined, key),
    ),

  save: (
    record: Deposit,
    input: DraftInput,
    token: string,
  ) =>
    json<Deposit>(
      `/deposits/${segment(record.id)}`,
      mutation('PUT', token, input, record.version),
    ),

  discard: (
    record: Deposit,
    token: string,
  ) =>
    json<{ deleted: string }>(
      `/deposits/${segment(record.id)}`,
      mutation(
        'DELETE',
        token,
        undefined,
        record.version,
      ),
    ),

  upload: async (
    record: Deposit,
    category: string,
    file: File,
    token: string,
    // Files are named after the nature of the document so the list stays readable.
    fileName = file.name,
  ) => {
    const body = {kind:category,fileName,data:await filePayload(file)};

    return json<Deposit>(
      `/deposits/${segment(record.id)}/documents`,
      mutation('POST', token, body, record.version),
    );
  },

  remove: (
    record: Deposit,
    documentId: string,
    token: string,
  ) =>
    json<Deposit>(
      `/deposits/${segment(record.id)}/documents/${segment(documentId)}`,
      mutation(
        'DELETE',
        token,
        undefined,
        record.version,
      ),
    ),

  validate: (record: Deposit, token: string) =>
    json<ValidationResult>(
      `/deposits/${segment(record.id)}/validate`,
      mutation('POST', token, {}, record.version),
    ),

  submit: (
    record: Deposit,
    token: string,
    key: string,
  ) =>
    json<Submission>(
      `/deposits/${segment(record.id)}/submit`,
      mutation(
        'POST',
        token,
        {declaration:true},
        record.version,
        key,
      ),
    ),

  documents: (
    query: string,
    signal?: AbortSignal,
  ) =>
    json<Page<DepositDocument>>(
      `/deposits/documents?${query}`,
      { signal },
    ),
};

export async function downloadDocument(
  document: DepositDocument,
) {
  if (!document.canDownload) {
    throw new DepositError(
      'This document cannot be downloaded.',
    );
  }

  const response = await responseFor(
    `/deposits/${segment(document.depositId)}/documents/${segment(document.id)}/content`,
  );

  const url = URL.createObjectURL(
    await response.blob(),
  );

  const link = window.document.createElement('a');

  link.href = url;
  link.download = document.fileName.replace(
    /[\\/\u0000-\u001f]/g,
    '_',
  );

  window.document.body.append(link);
  link.click();
  link.remove();

  window.setTimeout(
    () => URL.revokeObjectURL(url),
    1000,
  );
}
