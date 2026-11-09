import { useState } from 'react';
import { useTranslation } from '../../i18n/I18nContext';
import { money } from '../../features/actors/common';
import { filePayload, type RequestFile } from '../../features/requests/requestTypes';
import { useDecision } from './useDecision';
import '../../styles/decision.css';

/**
 * The CPS stage: record the manually verified deposit and attach the reasoned
 * opinion. Confirming a deposit is what unlocks approval at every later stage,
 * because approval requires at least 30% of the stated debt to be confirmed.
 *
 * Mirrors `POST /requests/:id/confirm-deposit` and the `cps_opinion` upload.
 */
export function DepositForm({ request, onReload }: { request: RequestFile; onReload: () => void }) {
  const { t } = useTranslation();
  const [amount, setAmount] = useState(request.deposit.amount ?? request.form.advanceAmount ?? '');
  const [reference, setReference] = useState(request.deposit.reference ?? '');
  const [file, setFile] = useState<File | null>(null);
  const [fileError, setFileError] = useState('');
  const { submit, busy, error, conflict, forbidden, reset } = useDecision(onReload);

  const open = ['Under review', 'Recommended'].includes(request.status);
  const blocked = busy || conflict || forbidden;
  const opinion = request.documents.some(document => document.kind === 'cps_opinion');

  async function upload() {
    if (!file) return;
    setFileError('');
    try {
      const data = await filePayload(file);
      const recorded = await submit(request.id, 'documents', {
        version: request.version,
        kind: 'cps_opinion',
        fileName: file.name,
        data,
      });
      if (recorded) setFile(null);
    } catch (caught) {
      setFileError(caught instanceof Error ? caught.message : t('decision.failed'));
    }
  }

  if (!open) {
    return (
      <section className="page-card">
        <h2>{t('decision.formTitleDeposit')}</h2>
        <p className="page-note">{t('decision.depositClosed')}</p>
      </section>
    );
  }

  return (
    <section className="page-card decision-form">
      <h2>{t('decision.formTitleDeposit')}</h2>
      <p className="page-card-text">{t('decision.depositLead')}</p>

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

      <p className="page-form-hint">
        {t('decision.declaredAdvance')}: {money(request.form.advanceAmount ?? null)} ·{' '}
        {request.deposit.confirmedAt
          ? `${t('decision.depositVerified')}: ${money(request.deposit.amount)}`
          : t('decision.depositPending')}
      </p>

      <label className="decision-field">
        <span>{t('decision.amount')}</span>
        <input
          inputMode="numeric"
          value={amount}
          onChange={event => setAmount(event.target.value)}
        />
      </label>

      <label className="decision-field">
        <span>{t('decision.paymentReference')}</span>
        <input
          value={reference}
          onChange={event => setReference(event.target.value)}
          maxLength={200}
        />
      </label>

      <div className="page-actions">
        <button
          type="button"
          className="page-button page-button-primary"
          disabled={blocked || !amount.trim() || !reference.trim()}
          onClick={() => void submit(request.id, 'confirm-deposit', {
            version: request.version,
            amount,
            reference,
          })}
        >
          {busy ? t('decision.working') : t('decision.confirmDeposit')}
        </button>
      </div>

      <h3>{t('decision.opinion')}</h3>
      {opinion ? <p className="page-note">{t('decision.opinionAttached')}</p> : (
        <div className="page-actions">
          <input
            aria-label={t('decision.opinion')}
            type="file"
            accept=".pdf,.png,.jpg,.jpeg"
            onChange={event => setFile(event.target.files?.[0] ?? null)}
          />
          <button
            type="button"
            className="page-button"
            disabled={blocked || !file}
            onClick={() => void upload()}
          >
            {t('decision.upload')}
          </button>
        </div>
      )}
      <p className="page-form-hint">{t('decision.chooseFile')}</p>
      {fileError && <p role="alert" className="page-alert">{fileError}</p>}
    </section>
  );
}
