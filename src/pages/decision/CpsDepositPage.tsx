import { useState } from 'react';
import { useAuth } from '../../app/AuthContext';
import { useTranslation } from '../../i18n/I18nContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { money, useData } from '../../features/actors/common';
import { DecisionPanel } from './DecisionPanel';
import type { DepositRow } from './rows';
import { stageFor } from './stages';
import '../../styles/decision.css';

/**
 * The CPS deposit-verification stage. Backed by `GET /dashboard?view=deposits`,
 * which lists submitted requests whose deposit the office has not verified yet,
 * and by `POST /requests/:id/confirm-deposit`.
 */
export function CpsDepositPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [selected, setSelected] = useState<string | null>(null);
  const queue = useData<{ items: DepositRow[] }>('/dashboard?view=deposits');
  const stage = user ? stageFor(user.role) : null;

  if (!stage || stage.role !== 'cps') {
    return <p role="alert" className="page-alert">{t('decision.notYourStage')}</p>;
  }

  const rows = queue.data?.items ?? [];

  return (
    <div className="page decision-page">
      <PageHeader
        eyebrow={t(stage.eyebrowKey)}
        title={t(stage.titleKey)}
        description={t(stage.leadKey)}
        action={<button type="button" className="page-button" onClick={queue.reload}>{t('decision.refresh')}</button>}
      />

      {queue.error && <p role="alert" className="page-alert">{queue.error}</p>}

      {selected && (
        <DecisionPanel
          requestId={selected}
          stage={stage}
          onChange={queue.reload}
          onClose={() => setSelected(null)}
        />
      )}

      <section className="page-card">
        <h2>{t('decision.queue')}</h2>
        <p className="page-form-hint">{t('decision.depositRule')}</p>
        {queue.loading && <p role="status" className="page-form-hint">{t('decision.loading')}</p>}
        {!queue.loading && rows.length === 0
          ? <p className="page-note">{t('decision.empty')}</p>
          : (
            <div className="decision-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t('decision.reference')}</th>
                    <th scope="col">{t('decision.employer')}</th>
                    <th scope="col">{t('decision.declaredAdvance')}</th>
                    <th scope="col">{t('decision.submitted')}</th>
                    <th scope="col">{t('decision.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td>{row.reference}</td>
                      <td>{row.employerName}</td>
                      <td>{money(row.depositAmount)}</td>
                      <td>{new Date(row.submittedAt).toLocaleDateString()}</td>
                      <td>
                        <button
                          type="button"
                          className="page-button page-button-primary"
                          onClick={() => setSelected(row.id)}
                        >
                          {t('decision.verify')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </section>
    </div>
  );
}
