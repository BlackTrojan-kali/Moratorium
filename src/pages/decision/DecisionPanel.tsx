import { useTranslation } from '../../i18n/I18nContext';
import { useData } from '../../features/actors/common';
import type { RequestFile } from '../../features/requests/requestTypes';
import type { StageConfig } from './stages';
import { DecisionDetail } from './DecisionDetail';
import { DecisionForm } from './DecisionForm';
import { DepositForm } from './DepositForm';
import { ReviewForm } from './ReviewForm';
import '../../styles/decision.css';

/**
 * Loads one request and renders the stage action form that belongs to the
 * signed-in role, followed by the read-only context. The queue page owns
 * selection; this component owns the fetch so nothing is requested until an
 * actor actually opens a file.
 */
export function DecisionPanel({ requestId, stage, onChange, onClose }: {
  requestId: string;
  stage: StageConfig;
  onChange: () => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  const detail = useData<{ request: RequestFile }>(`/requests/${requestId}`);

  function reload() {
    detail.reload();
    onChange();
  }

  if (detail.loading) {
    return <p role="status" className="decision-state">{t('decision.loading')}</p>;
  }

  if (!detail.data) {
    return (
      <p role="alert" className="page-alert decision-state">
        {detail.error || t('decision.unavailable')}{' '}
        <button type="button" className="page-button" onClick={reload}>{t('decision.reload')}</button>
      </p>
    );
  }

  const { request } = detail.data;

  return (
    <div className="decision-workspace">
      <div className="decision-toolbar">
        <div className="page-row-copy">
          <strong>{request.reference}</strong>
          <span>{request.employer.name}</span>
        </div>
        <div className="page-actions">
          <button type="button" className="page-button" onClick={reload}>{t('decision.reload')}</button>
          <button type="button" className="page-button" onClick={onClose}>{t('decision.close')}</button>
        </div>
      </div>

      {stage.role === 'agent_dt'
        ? <ReviewForm request={request} onReload={reload} />
        : stage.role === 'cps'
          ? <DepositForm request={request} onReload={reload} />
          : <DecisionForm request={request} stage={stage} onReload={reload} />}

      <DecisionDetail request={request} />
    </div>
  );
}
