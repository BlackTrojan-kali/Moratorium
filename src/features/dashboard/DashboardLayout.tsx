import type { ReactNode } from 'react';
import { MetricCard } from '../../components/ui/MetricCard';
import { PageHeader } from '../../components/ui/PageHeader';
import type { Metric } from '../../types/domain';

interface DashboardLayoutProps {
  eyebrow: string;
  title: string;
  description: string;
  metrics: Metric[];
  action?: ReactNode;
  children: ReactNode;
}

export function DashboardLayout({
  eyebrow,
  title,
  description,
  metrics,
  action,
  children,
}: DashboardLayoutProps) {
  return (
    <div className="dashboard-view">
      <PageHeader
        eyebrow={eyebrow}
        title={title}
        description={description}
        action={action}
      />

      <section
        className="dashboard-metrics"
        aria-label="Summary"
      >
        {metrics.map((metric, index) => (
          <MetricCard
            key={metric.label}
            metric={metric}
            featured={index === 0}
          />
        ))}
      </section>

      {children}
    </div>
  );
}