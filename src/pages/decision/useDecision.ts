import { useCallback, useRef, useState } from 'react';
import { api, ApiError } from '../../app/api';

export interface DecisionState {
  /** Records a stage action. Returns the new request, or null when it failed. */
  submit: (requestId: string, action: string, body: Record<string, unknown>) => Promise<unknown | null>;
  busy: boolean;
  error: string;
  /** The request changed under us (HTTP 409) — the actor must reload. */
  conflict: boolean;
  /** The action is not available at this stage (HTTP 403). */
  forbidden: boolean;
  reset: () => void;
}

/**
 * Single write path for every stage action.
 *
 * Unlike the role dashboards it replaces, this surfaces 403 and 409 as visible
 * state instead of treating a failed response as a success, and it never issues
 * two overlapping writes for the same request.
 */
export function useDecision(onRecorded: () => void): DecisionState {
  const lock = useRef(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [conflict, setConflict] = useState(false);
  const [forbidden, setForbidden] = useState(false);

  const reset = useCallback(() => {
    setError('');
    setConflict(false);
    setForbidden(false);
  }, []);

  const submit = useCallback(
    async (requestId: string, action: string, body: Record<string, unknown>) => {
      if (lock.current) return null;
      lock.current = true;
      setBusy(true);
      reset();
      try {
        const data = await api<{ request: unknown }>(`/requests/${requestId}/${action}`, body);
        onRecorded();
        return data.request;
      } catch (caught) {
        const status = caught instanceof ApiError ? caught.status : 0;
        if (status === 409) setConflict(true);
        if (status === 403) setForbidden(true);
        setError(caught instanceof Error ? caught.message : 'Unable to record the decision.');
        return null;
      } finally {
        setBusy(false);
        lock.current = false;
      }
    },
    [onRecorded, reset],
  );

  return { submit, busy, error, conflict, forbidden, reset };
}
