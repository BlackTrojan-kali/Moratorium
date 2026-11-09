import { useState } from 'react';
import { useAuth } from '../../app/AuthContext';
import { useTranslation } from '../../i18n/I18nContext';
import type { RequestFile } from '../../features/requests/requestTypes';
import type { StageConfig } from './stages';
import { useDecision } from './useDecision';
import '../../styles/decision.css';

const LOCKED = ['Approved', 'Rejected', 'Active', 'Completed', 'Overdue'];

/**
 * Approve, reject or return the file at the current approval stage.
 *
 * Mirrors `POST /requests/:id/approve|reject|return`. Approval carries the
 * legal/delegation reference and, for the General Directorate, an optional
 * remission decision; the version travels with every write so a competing
 * edit comes back as HTTP 409 instead of overwriting someone else.
 */
export function DecisionForm({ request, stage, onReload }: { request: RequestFile; stage: StageConfig; onReload: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const [legalReference, setLegalReference] = useState('');
  const [assessment, setAssessment] = useState('');
  const [remission, setRemission] = useState(false);
  const [remissionRationale, setRemissionRationale] = useState('');
  const { submit, busy, error, conflict, forbidden, reset } = useDecision(onReload);

  const pending = request.approvals.filter(approval => !approval.approved_at);
  const activeStep = pending[0];
  const finalStage = pending.length <= 1;
  const locked = LOCKED.includes(request.status);
  const ready = request.status === 'Recommended' && !!user && activeStep?.user_id === user.id;

  if (!ready) {
    return (
      <section className="page-card">
        <h2>{t('decision.formTitle')}</h2>
        <p className={locked ? 'page-note' : 'page-alert'}>
          {locked ? t('decision.locked') : t('decision.notYourStage')}
        </p>
      </section>
    );
  }

  const blocked = busy || conflict || forbidden
    || !note.trim()
    || (stage.needsLegalReference && !legalReference.trim())
    || (remission && !remissionRationale.trim());

  return (
    <section className="page-card decision-form">
      <h2>{t('decision.formTitle')}</h2>
      <p className="page-card-text">
        {t('decision.atStage', {
          stage: activeStep?.label ?? '',
          position: request.currentPosition,
          total: request.totalPositions,
        })}
      </p>

      {error && <p role="alert" className="page-alert">{error}</p>}
      {conflict && (
        <div className="decision-conflict">
          <p role="alert">{t('decision.conflict')}</p>
          <button
            type="button"
            className="page-button"
            onClick={() => { reset(); onReload(); }}
          >
            {t('decision.reload')}
          </button>
        </div>
      )}
      {forbidden && !conflict && <p className="page-note">{t('decision.forbidden')}</p>}

      <label className="decision-field">
        <span>{t('decision.grounds')}</span>
        <textarea
          value={note}
          onChange={event => setNote(event.target.value)}
          maxLength={4000}
          rows={4}
          placeholder={t('decision.groundsPlaceholder')}
        />
      </label>

      <label className="decision-field">
        <span>{t('decision.legalReference')}</span>
        <input
          value={legalReference}
          onChange={event => setLegalReference(event.target.value)}
          maxLength={400}
        />
        <small>{t('decision.legalReferenceHint')}</small>
      </label>

      <label className="decision-field">
        <span>{t('decision.assessment')}</span>
        <textarea
          value={assessment}
          onChange={event => setAssessment(event.target.value)}
          maxLength={4000}
          rows={3}
          placeholder={t('decision.assessmentPlaceholder')}
        />
      </label>

      {stage.canRecordRemission && (
        <div className="decision-remission">
          <label className="decision-check">
            <input
              type="checkbox"
              checked={remission}
              onChange={event => setRemission(event.target.checked)}
            />
            <span>{t('decision.remission')}</span>
          </label>
          <p className="page-form-hint">{t('decision.remissionHint')}</p>
          {remission && (
            <label className="decision-field">
              <span>{t('decision.remissionRationale')}</span>
              <textarea
                value={remissionRationale}
                onChange={event => setRemissionRationale(event.target.value)}
                maxLength={4000}
                rows={3}
              />
            </label>
          )}
        </div>
      )}

      <div className="page-actions">
        {stage.canReturn && (
          <button
            type="button"
            className="page-button"
            disabled={blocked}
            onClick={() => void submit(request.id, 'return', { version: request.version, note })}
          >
            {t('decision.return')}
          </button>
        )}
        {stage.canReject && (
          <button
            type="button"
            className="page-button page-button-danger"
            disabled={blocked}
            onClick={() => void submit(request.id, 'reject', { version: request.version, note, legalReference, assessment })}
          >
            {t('decision.reject')}
          </button>
        )}
        <button
          type="button"
          className="page-button page-button-primary"
          disabled={blocked}
          onClick={() => void submit(request.id, 'approve', {
            version: request.version,
            note,
            legalReference,
            assessment,
            remission,
            remissionRationale: remission ? remissionRationale : '',
          })}
        >
          {busy
            ? t('decision.working')
            : finalStage
              ? t('decision.approveFinal')
              : t(stage.approveKey ?? 'decision.approve')}
        </button>
      </div>
    </section>
  );
}
