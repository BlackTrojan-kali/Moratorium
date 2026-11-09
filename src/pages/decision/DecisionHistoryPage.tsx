import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../app/AuthContext';
import { useTranslation } from '../../i18n/I18nContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusChip } from '../../components/ui/StatusChip';
import { money, Pager, useData } from '../../features/actors/common';
import type { DecisionRow } from './rows';
import { stageFor } from './stages';
import '../../styles/decision.css';

/** Requests that already reached a final decision or moved into execution. */
export function DecisionHistoryPage() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const history = useData<{ requests: DecisionRow[]; total: number }>(
    `/requests?view=decision-history&page=${page}`,
  );
  const stage = user ? stageFor(user.role) : null;

  const rows = history.data?.requests ?? [];
  const total = history.data?.total ?? 0;

  return (
    <div className="page decision-page">
      <PageHeader
        eyebrow={t('decision.eyebrow')}
        title={t('decision.historyTitle')}
        description={t('decision.historyLead')}
        action={<button type="button" className="page-button" onClick={history.reload}>{t('decision.refresh')}</button>}
      />

      {history.error && <p role="alert" className="page-alert">{history.error}</p>}

      <section className="page-card">
        <h2>{t('decision.historyTitle')}</h2>
        {history.loading && <p role="status" className="page-form-hint">{t('decision.loading')}</p>}
        {!history.loading && rows.length === 0
          ? <p className="page-note">{t('decision.historyEmpty')}</p>
          : (
            <div className="decision-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t('decision.reference')}</th>
                    <th scope="col">{t('decision.employer')}</th>
                    <th scope="col">{t('decision.status')}</th>
                    <th scope="col">{t('decision.debt')}</th>
                    <th scope="col">{t('decision.route')}</th>
                    <th scope="col">{t('decision.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id}>
                      <td>{row.reference}</td>
                      <td>{row.employerName}</td>
                      <td><StatusChip status={row.status} /></td>
                      <td>{money(row.debtAmount)}</td>
                      <td>{row.route || t('decision.unassigned')}</td>
                      <td>
                        <Link className="page-button" to={`/requests/${row.id}`}>
                          {t('decision.viewRecord')}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <Pager page={page} total={total} onPage={setPage} />
      </section>

      {stage && <p className="page-form-hint">{t(stage.leadKey)}</p>}
    </div>
  );
}
