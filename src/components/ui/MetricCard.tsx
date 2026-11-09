import type { Metric } from '../../types/domain';

interface MetricCardProps {
  metric: Metric;
  featured?: boolean;
}

export function MetricCard({
  metric,
  featured = false,
}: MetricCardProps) {
  return (
    <article
      className={[
        'dashboard-metric',
        `dashboard-metric--${metric.tone ?? 'blue'}`,
        featured ? 'dashboard-metric--featured' : '',
      ].join(' ')}
    >
      <span className="dashboard-metric-label">
        {metric.label}
      </span>

      <strong className="dashboard-metric-value">
        {metric.value ?? '—'}
      </strong>

      <small className="dashboard-metric-hint">
        {metric.hint}
      </small>
    </article>
  );
}