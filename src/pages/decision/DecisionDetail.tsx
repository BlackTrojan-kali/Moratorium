import { useTranslation } from '../../i18n/I18nContext';
import { StatusChip } from '../../components/ui/StatusChip';
import { money } from '../../features/actors/common';
import { downloadUrl, kinds, type RequestFile } from '../../features/requests/requestTypes';
import '../../styles/decision.css';

const STATE_LABEL = {
  endorsed: 'decision.endorsed',
  nextStage: 'decision.nextStage',
  waiting: 'decision.waiting',
} as const;

const STATE_CLASS = {
  endorsed: 'endorsed',
  nextStage: 'next',
  waiting: 'waiting',
} as const;

/**
 * Read-only context for the file an actor is deciding on: the request itself,
 * the deposit position, the approval chain with the grounds recorded so far,
 * the supporting documents and the recent history.
 */
export function DecisionDetail({ request }: { request: RequestFile }) {
  const { t } = useTranslation();
  const pending = request.approvals.filter(approval => !approval.approved_at);
  const activeStep = pending[0];
  const history = [...request.history].reverse().slice(0, 8);

  return (
    <div className="decision-detail">
      <section className="page-card">
        <h2>{t('decision.context')}</h2>
        <dl className="page-fields">
          <div className="page-field">
            <dt>{t('decision.employer')}</dt>
            <dd>{request.employer.name} · {request.employer.cnps_number || t('decision.none')}</dd>
          </div>
          <div className="page-field">
            <dt>{t('decision.contact')}</dt>
            <dd>{request.form.contactName} · {request.form.contactEmail}</dd>
          </div>
          <div className="page-field">
            <dt>{t('decision.debtAndMonths')}</dt>
            <dd>{money(request.debtAmount)} / {request.months ?? '—'}</dd>
          </div>
          <div className="page-field">
            <dt>{t('decision.route')}</dt>
            <dd>{request.route || t('decision.unassigned')}</dd>
          </div>
          <div className="page-field">
            <dt>{t('decision.basis')}</dt>
            <dd>{request.routingBasis || t('decision.none')}</dd>
          </div>
          <div className="page-field">
            <dt>{t('decision.status')}</dt>
            <dd><StatusChip status={request.status} /></dd>
          </div>
        </dl>
        {request.form.remissionRequested && (
          <>
            <h3>{t('decision.remissionRequested')}</h3>
            <p className="decision-prose">{request.form.remissionReason || t('decision.none')}</p>
          </>
        )}
        <p className="page-form-hint">{t('decision.reviewNote')}: {request.reviewNote || t('decision.none')}</p>
      </section>

      <section className="page-card">
        <h2>{t('decision.depositVerified')}</h2>
        {request.deposit.confirmedAt
          ? <p>{money(request.deposit.amount)} · {request.deposit.reference}</p>
          : <p className="page-note">{t('decision.depositPending')}</p>}
        <p className="page-form-hint">{t('decision.depositRule')}</p>
      </section>

      <section className="page-card">
        <h2>{t('decision.progress')}</h2>
        {request.approvals.length === 0
          ? <p className="page-note">{t('decision.noChain')}</p>
          : (
            <ol className="decision-chain">
              {request.approvals.map(approval => {
                const state = approval.approved_at
                  ? 'endorsed'
                  : approval === activeStep
                    ? 'nextStage'
                    : 'waiting';

                return (
                  <li key={approval.position} className={`decision-step decision-step-${STATE_CLASS[state]}`}>
                    <span className="decision-step-marker">{approval.position}</span>
                    <div className="decision-step-copy">
                      <strong>{approval.label}</strong>
                      <span>{approval.displayName} · {t(STATE_LABEL[state])}</span>
                      {approval.decided_action === 'reject' && (
                        <span className="decision-rejected">{t('decision.rejectedHere')}</span>
                      )}
                      {approval.note && <p>{approval.note}</p>}
                      {approval.legal_reference && (
                        <p>{t('decision.legalReference')}: {approval.legal_reference}</p>
                      )}
                      {approval.assessment && (
                        <p>{t('decision.assessment')}: {approval.assessment}</p>
                      )}
                      {approval.remission && (
                        <p>{t('decision.remission')}: {approval.remission_rationale}</p>
                      )}
                    </div>
                  </li>
                );
              })}
            </ol>
          )}
      </section>

      <section className="page-card">
        <h2>{t('decision.documents')}</h2>
        {request.documents.length === 0
          ? <p className="page-note">{t('decision.noDocuments')}</p>
          : (
            <ul className="page-list">
              {request.documents.map(document => (
                <li key={document.id}>
                  <div className="page-row">
                    <div className="page-row-copy">
                      <strong>{document.fileName}</strong>
                      <span>{kinds[document.kind] ?? document.kind} · {Math.ceil(document.sizeBytes / 1024)} KiB</span>
                    </div>
                    <div className="page-row-meta">
                      <a className="page-button" href={downloadUrl(document.id)}>{t('decision.download')}</a>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
      </section>

      <section className="page-card">
        <h2>{t('decision.history')}</h2>
        <ol className="decision-history">
          {history.map(entry => (
            <li key={entry.id}>
              <strong>{entry.action.replaceAll('_', ' ').replaceAll('-', ' ')}</strong>
              <span>{entry.actorName} · {new Date(entry.created_at).toLocaleString()}</span>
              <span>{entry.from_status} → {entry.to_status}</span>
              {entry.note && <p className="decision-prose">{entry.note}</p>}
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
