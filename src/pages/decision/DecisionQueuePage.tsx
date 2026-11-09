import { useState } from 'react';
import { useAuth } from '../../app/AuthContext';
import { useTranslation } from '../../i18n/I18nContext';
import { PageHeader } from '../../components/ui/PageHeader';
import { StatusChip } from '../../components/ui/StatusChip';
import { money, Pager, useData } from '../../features/actors/common';
import { DecisionPanel } from './DecisionPanel';
import type { DecisionRow } from './rows';
import { stageFor } from './stages';
import '../../styles/decision.css';

/**
 * The stage queue. One component serves every non-employer workflow path —
 * `/decisions`, `/work-queue`, `/assignments` and `/returned` — because the
 * backend already scopes each view to the signed-in actor's stage.
 */
export function DecisionQueuePage({ view }: { view: string }) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const queue = useData<{ requests: DecisionRow[]; total: number }>(
    `/requests?view=${encodeURIComponent(view)}&page=${page}`,
  );
  const stage = user ? stageFor(user.role) : null;

  if (!stage) {
    return <p role="alert" className="page-alert">{t('decision.notYourStage')}</p>;
  }

  const rows = queue.data?.requests ?? [];
  const total = queue.data?.total ?? 0;

  return (
    <div className="page decision-page">
      <PageHeader
        eyebrow={t(stage.eyebrowKey)}
        title={t(stage.titleKey)}
        description={t(stage.leadKey)}
        action={<button type="button" className="page-button" onClick={queue.reload}>{t('decision.refresh')}</button>}
      />

      {queue.error && <p role="alert" className="page-alert">{queue.error}</p>}
      <p role="status" className="page-form-hint">
        {queue.loading ? t('decision.loading') : t('decision.count', { count: total })}
      </p>

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
        {!queue.loading && rows.length === 0
          ? <p className="page-note">{t('decision.empty')}</p>
          : (
            <div className="decision-table">
              <table>
                <thead>
                  <tr>
                    <th scope="col">{t('decision.reference')}</th>
                    <th scope="col">{t('decision.employer')}</th>
                    <th scope="col">{t('decision.status')}</th>
                    <th scope="col">{t('decision.debt')}</th>
                    <th scope="col">{t('decision.stage')}</th>
                    <th scope="col">{t('decision.daysInQueue')}</th>
                    <th scope="col">{t('decision.action')}</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map(row => (
                    <tr key={row.id} className={row.priority === 'high' ? 'decision-priority' : undefined}>
                      <td>{row.reference}</td>
                      <td>{row.employerName}</td>
                      <td><StatusChip status={row.status} /></td>
                      <td>{money(row.debtAmount)}</td>
                      <td>
                        {row.totalPositions > 1
                          ? t('decision.stageNumber', { position: row.currentPosition, total: row.totalPositions })
                          : '—'}
                      </td>
                      <td>{row.daysInQueue}</td>
                      <td>
                        <button
                          type="button"
                          className="page-button page-button-primary"
                          onClick={() => setSelected(row.id)}
                        >
                          {t('decision.open')}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        <Pager page={page} total={total} onPage={setPage} />
      </section>
    </div>
  );
}
