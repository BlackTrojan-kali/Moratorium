import { useState } from 'react';
import { useAuth } from '../../app/AuthContext';
import { useTranslation } from '../../i18n/I18nContext';
import { StatusChip } from '../../components/ui/StatusChip';
import type { RequestFile } from '../../features/requests/requestTypes';
import { useDecision } from './useDecision';
import '../../styles/decision.css';

/**
 * The AGENT (DT) stage: claim an unassigned file, release it again, forward it
 * with a recommendation, or return it to the employer for correction.
 *
 * Mirrors `POST /requests/:id/claim|release|recommend|return`.
 */
export function ReviewForm({ request, onReload }: { request: RequestFile; onReload: () => void }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [note, setNote] = useState('');
  const { submit, busy, error, conflict, forbidden, reset } = useDecision(onReload);

  const underReview = request.status === 'Under review';
  const mine = !!user && request.processorId === user.id;
  const unassigned = underReview && !request.processorId;
  const canReview = mine && underReview;
  const blocked = busy || conflict || forbidden;

  return (
    <section className="page-card decision-form">
      <h2>{t('decision.formTitleReview')}</h2>

      {error && <p role="alert" className="page-alert">{error}</p>}
      {conflict && (
        <div className="decision-conflict">
          <p role="alert">{t('decision.conflict')}</p>
          <button type="button" className="page-button" onClick={() => { reset(); onReload(); }}>
            {t('decision.reload')}
          </button>
        </div>
      )}
      {forbidden && !conflict && <p className="page-note">{t('decision.forbidden')}</p>}

      <p className="page-card-text">
        {t('decision.assignee')}: <strong>{request.assignedTo || t('decision.unassigned')}</strong>{' '}
        <StatusChip status={request.status} />
      </p>

      {unassigned && (
        <div className="page-actions">
          <button
            type="button"
            className="page-button page-button-primary"
            disabled={blocked}
            onClick={() => void submit(request.id, 'claim', { version: request.version })}
          >
            {t('decision.claim')}
          </button>
        </div>
      )}

      {canReview && (
        <>
          <label className="decision-field">
            <span>{t('decision.groundsReview')}</span>
            <textarea
              value={note}
              onChange={event => setNote(event.target.value)}
              maxLength={4000}
              rows={4}
              placeholder={t('decision.groundsReviewPlaceholder')}
            />
          </label>

          <div className="page-actions">
            <button
              type="button"
              className="page-button"
              disabled={blocked || !note.trim()}
              onClick={() => void submit(request.id, 'return', { version: request.version, note })}
            >
              {t('decision.returnToEmployer')}
            </button>
            <button
              type="button"
              className="page-button page-button-primary"
              disabled={blocked || !note.trim()}
              onClick={() => void submit(request.id, 'recommend', { version: request.version, note })}
            >
              {busy ? t('decision.working') : t('decision.recommend')}
            </button>
            <button
              type="button"
              className="page-button"
              disabled={blocked}
              onClick={() => void submit(request.id, 'release', { version: request.version })}
            >
              {t('decision.release')}
            </button>
          </div>
        </>
      )}

      {!canReview && !unassigned && (
        <p className="page-note">
          {underReview ? t('decision.assignedElsewhere') : t('decision.notReviewable')}
        </p>
      )}
    </section>
  );
}
